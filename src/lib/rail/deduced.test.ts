import { describe, expect, test, vi } from "vitest";

import type { ForceUnit, ScenarioDraft } from "@/lib/scenario/types.ts";
import type { Trace } from "@/lib/terrain/trace.ts";

import { initialAppState } from "@/lib/app/state.ts";
import { formatQuantity, roundToDisplay } from "@/lib/format/quantity.ts";
import { firstRunDefaults } from "@/lib/scenario/first-run.ts";
import { steelFormula } from "@/lib/sim";

import { deducedRows, deduceValues } from "./deduced.ts";

/**
 * `Valeurs déduites` — « v1 build spec » § 3's read-out table and § 9's opening screen, region by
 * region. **Eleven of the twelve rows are frozen as formatted strings**, for the reason § 11 gives
 * the first-run lock: `1e-3` relative on `L₀` is ±0,15 m, and 0,15 m of `L₀` moves garde by
 * ≈0,15 m — the opening screen could drift by 6 % of its safety margin and stay green.
 *
 * This is *not* a second copy of `first-run.test.ts`. That lock reproduces § 9's measurement
 * through a chain written **in the test**, deliberately, because § 9 declares `first-run.ts`'s
 * surface as two names. This asserts that the **app's own** deduced-values module lands on the
 * same screen — which is the thing a user reads.
 */

const TRACE: Trace = {
  d: Float64Array.from([0, 112, 224]),
  z: Float64Array.from([540, 520, 500]),
  dev: 0,
  fileName: "profil-2.csv",
};

function scenario(patch: (draft: ScenarioDraft) => void = () => {}): ScenarioDraft {
  const draft = firstRunDefaults() as ScenarioDraft;
  patch(draft);
  return draft;
}

describe("§ 9's opening `VALEURS DÉDUITES`, from the shipped defaults", () => {
  const deduced = deduceValues(scenario(), null);
  const { material, span, solve } = deduced;

  test("the material chain: 9074 daN · 6,90 MN · 0,5465 kg/m · 0,536 daN/m", () => {
    expect(formatQuantity("MBF", material.strength ?? NaN)).toBe("9074 daN");
    expect(formatQuantity("EA", material.EA ?? NaN)).toBe("6,90 MN");
    expect(formatQuantity("mu", material.mu ?? NaN)).toBe("0,5465 kg/m");
    expect(formatQuantity("w", material.w ?? NaN)).toBe("0,536 daN/m");
  });

  test("« Corde 151,08 m » — the row §5.4's bound compares `L₀` against", () => {
    expect(formatQuantity("chord", span?.chord ?? NaN)).toBe("151,08 m");
  });

  test("the solved rows: 151,64 m · 253,5 daN · 6,00 m (à x 74,8 m) · 4,00 % · 2,90 %", () => {
    expect(solve).not.toBeNull();
    expect(formatQuantity("L0", solve?.L0 ?? NaN)).toBe("151,64 m");
    expect(formatQuantity("H_target", solve?.H ?? NaN)).toBe("253,5 daN");
    expect(formatQuantity("sag", solve?.sag ?? NaN)).toBe("6,00 m");
    expect(formatQuantity("extremumX", solve?.sagAtX ?? NaN)).toBe("74,8 m");
    expect(formatQuantity("sagRatio", solve?.sagRatio ?? NaN)).toBe("4,00 %");
    expect(formatQuantity("standingTension", solve?.standingTension ?? NaN)).toBe("2,90 %");
  });

  test("`flèche à vide` is exact at display precision — why `Flèche` ships as the segment", () => {
    // A direct-`L₀` default would ship a rounded 151,64 m and cost 0,21 m of flèche and 0,20 m of
    // garde: 8 % of the shipped margin. 6,0 m costs nothing.
    const draft = scenario();
    if (draft.tightness.mode !== "sag") throw new Error("expected the flèche segment");
    // At display precision, which is the grain a mode switch prefills at — not at float equality,
    // which would be an assertion about §5.3's solver tolerance and not about the shipped screen.
    expect(roundToDisplay("D_target", solve?.sag ?? NaN)).toBe(draft.tightness.D_target);
  });

  test("nothing is overridden on first run, so nothing is stale", () => {
    // An override here would ship the one `[STD-ATTESTED]` derived value pre-downgraded into the
    // provenance aggregate.
    expect(material.overridden).toEqual({ MBF: false, EA: false, mu: false });
    expect(material.stale).toEqual({ MBF: false, EA: false, mu: false });
    expect(deduced.failure).toBeNull();
  });
});

describe("the stale Override badge — derived on every load, at display precision", () => {
  /** A freshly created override holds the **displayed** value, which is what a prefill writes. */
  const fresh = scenario((draft) => {
    draft.material = {
      family: "steel",
      d: 12,
      R0: 1770,
      construction: "iwrc",
      overrides: { MBF: 90740 },
    };
  });

  test("a fresh override is **not** stale, although the float differs", () => {
    // 9074 daN against a formula value of 9073,98: float equality would badge every override on
    // every load, and a badge that always fires is a badge nobody reads.
    expect(steelFormula(12, 1770, "iwrc").MBF).not.toBe(90740);
    const { material } = deduceValues(fresh, null);
    expect(material.overridden.MBF).toBe(true);
    expect(material.stale.MBF).toBe(false);
  });

  test("moving `d` to 16 mm badges it, and the badge carries the new formula value", () => {
    // The worst thing to hide: a 12 mm breaking force reported on a 16 mm rope, since `MBF` drives
    // the Verdict. The override **survives** — clearing it would discard datasheet numbers.
    const stale = scenario((draft) => {
      draft.material = {
        family: "steel",
        d: 16,
        R0: 1770,
        construction: "iwrc",
        overrides: { MBF: 90740 },
      };
    });
    const { material } = deduceValues(stale, null);
    expect(material.stale.MBF).toBe(true);
    expect(material.strength).toBe(90740);
    // §13.1's own chain: `0,356 × 16² × 1770` is 161 310,72 N. § 3's sketch prints « 16 129 daN »,
    // which is that formula rounded a step early; the module's number governs, as the frozen
    // strings do everywhere else.
    expect(formatQuantity("MBF", material.formula?.MBF ?? NaN)).toBe("16131 daN");
  });

  test("overrides are independent: `MBF` typed leaves `EA` and `μ` on the formula", () => {
    const { material } = deduceValues(fresh, null);
    expect(material.overridden).toEqual({ MBF: true, EA: false, mu: false });
    expect(formatQuantity("EA", material.EA ?? NaN)).toBe("6,90 MN");
  });

  test("`EA` and `μ` are badged by `d` alone — Grade and Construction cannot move them", () => {
    const grade = scenario((draft) => {
      draft.material = {
        family: "steel",
        d: 12,
        R0: 1960,
        construction: "iwrc",
        overrides: { EA: 6.9e6, mu: 0.5465, MBF: 90740 },
      };
    });
    const { material } = deduceValues(grade, null);
    expect(material.stale.EA).toBe(false);
    expect(material.stale.mu).toBe(false);
    // …while `MBF = K·d²·R₀/1000` depends on all three, so the grade change does badge it.
    expect(material.stale.MBF).toBe(true);
  });
});

describe("the rider and unit fields the read-outs depend on — `mp` and `unit`", () => {
  test("Rapport V resolves `L₀` against the passenger mass: mp 80 and 120 kg differ", () => {
    const at = (mp: number) =>
      deduceValues(
        scenario((draft) => {
          draft.tightness = { mode: "ratio", ratio: 0.2 };
          draft.rider.mp = mp;
        }),
        null,
      ).solve;
    const light = at(80);
    const heavy = at(120);
    expect(light).not.toBeNull();
    expect(heavy).not.toBeNull();
    // [MEASURED] issue #30: H is 3924 N at 80 kg and 5886 N at 120 kg (proportional to mp).
    expect(light?.H).toBeCloseTo(3924, 0);
    expect(heavy?.H).toBeCloseTo(5886, 0);
    expect(light?.L0).toBeCloseTo(151.25, 2);
    expect(heavy?.L0).toBeCloseTo(151.06, 2);
  });

  test("the stale flag compares at the unit's precision: 90736 N is fresh in daN, stale in kgf", () => {
    // Formula 90737,28 N reads 9074 daN and 9253 kgf; the override reads 9074 daN and 9252 kgf.
    const at = (unit: ForceUnit) =>
      deduceValues(
        scenario((draft) => {
          draft.unit = unit;
          draft.material = {
            family: "steel",
            d: 12,
            R0: 1770,
            construction: "iwrc",
            overrides: { MBF: 90736 },
          };
        }),
        null,
      ).material.stale.MBF;
    expect(at("daN")).toBe(false);
    expect(at("kgf")).toBe(true);
  });
});

describe("`Tvide` — the unloaded anchor tensions the creep cap is read against", () => {
  const tvide = (patch: (draft: ScenarioDraft) => void) => {
    const solve = deduceValues(scenario(patch), null).solve;
    if (solve === null) throw new Error("the shipped line solves");
    return { ...solve.Tvide, H: solve.H };
  };

  test("a level span hangs symmetrically: TA equals TB", () => {
    const { TA, TB } = tvide((draft) => {
      draft.geometry = { source: "manual", L: 150, h: 0 };
    });
    expect(TA).toBeCloseTo(TB, 6);
  });

  test("the higher anchor carries more: A is 18 m above B on the shipped line, so TA > TB > H", () => {
    const { TA, TB, H } = tvide(() => {});
    expect(TA).toBeGreaterThan(TB);
    expect(TB).toBeGreaterThan(H);
  });
});

describe("textile — four inputs, exactly one derived value, and no override affordance", () => {
  const rope = (patch: Partial<{ MBL: number | null; mu: number | null; k: number | null }>) =>
    scenario((draft) => {
      draft.usage = "TEMPORAIRE";
      draft.material = {
        family: "textile",
        ropeClass: "hmpe",
        MBL: null,
        mu: null,
        k: 22,
        ...patch,
      };
    });

  test("`EA = k·MBL`, and `μ` is a **field** here, never a deduced row", () => {
    const { material } = deduceValues(rope({ MBL: 1e5, mu: 0.1 }), null);
    expect(material.EA).toBe(22e5);
    expect(material.mu).toBeNull();
    expect(material.formula).toBeNull();
    expect(material.overridden).toEqual({ MBF: false, EA: false, mu: false });
  });

  test("`w = μ·g` survives the two blanks — it needs neither `MBL` nor `k`", () => {
    // `corde` and `w` are the only two rows independent of a solve, which is why they survive
    // « Aucun résultat » while every other row is replaced by the cause line.
    const { material, span, solve } = deduceValues(rope({ mu: 0.1 }), null);
    expect(formatQuantity("w", material.w ?? NaN)).toBe("0,098 daN/m");
    expect(span?.chord).toBeCloseTo(Math.hypot(150, 18), 9);
    expect(material.strength).toBeNull();
    expect(solve).toBeNull();
  });

  test("a spec with blanks reaches no solve and reports no engine error", () => {
    // The engine is never handed an incomplete spec: that is what the Solve Gate is for, and an
    // absent solve here is a gate's business, not a refusal to surface — stage `material`, no
    // error.
    const { solve, failure } = deduceValues(rope({}), null);
    expect(solve).toBeNull();
    expect(failure).toEqual({ stage: "material", error: null });
  });
});

describe("an invalid span — stage `geometry`, and the material still reads", () => {
  test("`L` −5 stops at `geometry` while every material row stays populated", () => {
    const negative = scenario((draft) => {
      draft.geometry = { source: "manual", L: -5, h: -18 };
    });
    const { material, span, solve, failure } = deduceValues(negative, null);
    expect(failure).toEqual({ stage: "geometry", error: null });
    expect(span).toBeNull();
    expect(solve).toBeNull();
    expect(formatQuantity("MBF", material.strength ?? NaN)).toBe("9074 daN");
    expect(formatQuantity("EA", material.EA ?? NaN)).toBe("6,90 MN");
    expect(formatQuantity("mu", material.mu ?? NaN)).toBe("0,5465 kg/m");
    expect(formatQuantity("w", material.w ?? NaN)).toBe("0,536 daN/m");
  });
});

describe("a formatter, not a second chain — `vi.mock` on the engine barrel", () => {
  test("`deducedFrom` adds no solve and no sample scan to the one derivation", async () => {
    vi.resetModules();
    const spies: {
      resolveL0?: ReturnType<typeof vi.fn>;
      solveSpan?: ReturnType<typeof vi.fn>;
      sampleCable?: ReturnType<typeof vi.fn>;
    } = {};
    vi.doMock("@/lib/sim", async () => {
      const sim = await vi.importActual<typeof import("@/lib/sim")>("@/lib/sim");
      spies.resolveL0 = vi.fn<typeof sim.resolveL0>(sim.resolveL0);
      spies.solveSpan = vi.fn<typeof sim.solveSpan>(sim.solveSpan);
      spies.sampleCable = vi.fn<typeof sim.sampleCable>(sim.sampleCable);
      return {
        ...sim,
        resolveL0: spies.resolveL0,
        solveSpan: spies.solveSpan,
        sampleCable: spies.sampleCable,
      };
    });
    const { deriveUnloaded, unloadedInputs } = await import("@/lib/scenario/unloaded.ts");
    const { deducedFrom } = await import("./deduced.ts");

    const draft = scenario();
    const unloaded = deriveUnloaded(unloadedInputs(draft, null));
    const { solve } = deducedFrom(draft, unloaded);
    expect(formatQuantity("extremumX", solve?.sagAtX ?? NaN)).toBe("74,8 m");
    expect(spies.resolveL0).toHaveBeenCalledTimes(1);
    expect(spies.solveSpan).toHaveBeenCalledTimes(1);
    expect(spies.sampleCable).not.toHaveBeenCalled();
    vi.doUnmock("@/lib/sim");
    vi.resetModules();
  });
});

describe("imported mode — `L` and `h` become read-outs of their own", () => {
  test("`L = d_B − d_A` and `h` measured anchor top to anchor top", () => {
    const imported = scenario((draft) => {
      draft.geometry = { source: "trace", trace: "p1.x", sa: 0, sb: 224 };
      draft.anchors = { zA: 4, zB: 2.5 };
    });
    const { span } = deduceValues(imported, TRACE);
    expect(span?.L).toBe(224);
    // 500 + 2,5 − (540 + 4) = −41,5 m.
    expect(span?.h).toBeCloseTo(-41.5, 9);
  });

  test("« Alt. base A / B » travel with them — the ground under each anchor, not the tower top", () => {
    // § 4's block prints them beside `Portée` and `Dénivelé`, and they are the profile's own
    // altitudes: the two `hauteur d'ancrage` fields are already accounted for in `h` and may not be
    // added again here.
    const imported = scenario((draft) => {
      draft.geometry = { source: "trace", trace: "p1.x", sa: 56, sb: 224 };
      draft.anchors = { zA: 4, zB: 2.5 };
    });
    // Station 56 sits between samples 0 and 112: 540 − 20·(56/112) = 530.
    expect(deduceValues(imported, TRACE).span?.bases).toEqual({ zBaseA: 530, zBaseB: 500 });
  });

  test("manual mode has no base altitudes — a straight ground line has no altitude to print", () => {
    expect(deduceValues(scenario(), null).span?.bases).toBeNull();
  });

  test("a degenerate placement has no span at all, and therefore no `corde`", () => {
    const degenerate = scenario((draft) => {
      draft.geometry = { source: "trace", trace: "p1.x", sa: 120, sb: 120 };
    });
    expect(deduceValues(degenerate, TRACE).span).toBeNull();
  });

  test("a trace-sourced geometry with no trace loaded has no span either", () => {
    const orphan = scenario((draft) => {
      draft.geometry = { source: "trace", trace: "p1.x", sa: 0, sb: 224 };
    });
    expect(deduceValues(orphan, null).span).toBeNull();
  });
});

describe("the engine keeps every physical rule, and its refusal travels verbatim", () => {
  test("a sub-floor `L₀` comes back as §5.4's `invalid-input`, bound included", () => {
    // The bound *is* the breaking load, so this is « Tension impossible » — an engine refusal the
    // UI surfaces, never a field error and never a gate.
    const tooShort = scenario((draft) => {
      draft.geometry = { source: "manual", L: 200, h: 0 };
      draft.tightness = { mode: "length", L0: 190 };
    });
    const { solve, failure } = deduceValues(tooShort, null);
    expect(solve).toBeNull();
    // The stage travels with the error: `resolveL0` refused, which is what tells « Tension
    // impossible » and « Cible inatteignable » apart from `solveSpan`'s own « Calcul impossible ».
    expect(failure?.stage).toBe("L0");
    const error = failure?.error;
    expect(error).toMatchObject({ kind: "invalid-input", field: "L0", boundKind: "min" });
    if (error?.kind !== "invalid-input") throw new Error("expected invalid-input");
    expect(formatQuantity("L0", error.bound)).toBe("197,40 m");
  });

  test("`resolveL0` re-emits the bound in the **driving** quantity", () => {
    const overTight = scenario((draft) => {
      draft.geometry = { source: "manual", L: 200, h: 0 };
      draft.tightness = { mode: "tension", H_target: 2e6 };
    });
    const { failure } = deduceValues(overTight, null);
    // The copy states a tension and never « soit L₀ ≥ 197,40 m »: a second equivalent invites the
    // user to type a length into a tension field.
    expect(failure?.error).toMatchObject({ kind: "invalid-input", field: "H_target" });
  });
});

describe("`deducedRows` — the rows the Rail prints, decided outside the component", () => {
  /** What a row shows: the label, the value and the ⚠ copy, without the ids the test would echo. */
  const shown = (rows: ReturnType<typeof deducedRows>) =>
    rows.map(({ label, value, warning }) => [label, value, warning]);

  test("the opening screen's six read-only rows, as the Rail printed them before the move", () => {
    // Read off the running app at `/` with an empty Session. `Flèche` drives, so its read-out is
    // the field and not a row; the three steel Override rows are fields of their own.
    const opening = scenario();
    const rows = deducedRows(opening, deduceValues(opening, null), null);
    expect(shown(rows)).toEqual([
      ["Poids linéique", "0,536 daN/m", null],
      ["Corde", "151,08 m", null],
      ["Longueur non tendue", "151,64 m", null],
      ["Prétension", "253,5 daN", null],
      ["Flèche / portée", "4,00 %", null],
      ["Tension permanente", "2,90 % MBF", null],
    ]);
    expect(rows.every((row) => row.group === "line")).toBe(true);
  });

  test("a textile line driven by tension: the flèche row, its x, the ⚠ and the MBL suffix", () => {
    // Read off the running app at this link before the move, rows and ⚠ copy alike.
    const query =
      "?v=1&u=daN&use=tempo&L=150&h=-18&za=12&zb=12&te=253.5&fam=tx&mu=0.07&cls=hmpe&mbl=2200" +
      "&k=1.5&ta=epissure&tb=epissure&na=0.9&nb=0.9&mp=120&hr=2.1&gm=1&daf=1.2&x=75";
    const { scenario: textile } = initialAppState({ query, session: null });
    expect(shown(deducedRows(textile, deduceValues(textile, null), null))).toEqual([
      ["Charge de rupture", "2200 daN", null],
      ["Raideur axiale", "0,03 MN", null],
      ["Poids linéique", "0,069 daN/m", null],
      ["Corde", "151,08 m", null],
      ["Longueur non tendue", "140,23 m", null],
      ["Flèche à vide", "0,71 m (à x 75,0 m)", null],
      [
        "Flèche / portée",
        "0,47 %",
        "flèche / portée sous 3 % — la ligne se raidit et le modèle rapporte mal la réponse dynamique (§8.2).",
      ],
      ["Tension permanente", "11,63 % MBL", null],
    ]);
  });

  test("a length-driven line hides « Longueur non tendue » and shows the other two drivers", () => {
    // Read off the running app at `?lo=151` before the move.
    const { scenario: byLength } = initialAppState({ query: "?lo=151", session: null });
    const rows = shown(deducedRows(byLength, deduceValues(byLength, null), null));
    expect(rows.map(([label]) => label)).not.toContain("Longueur non tendue");
    expect(rows).toContainEqual(["Prétension", "707,6 daN", null]);
    expect(rows).toContainEqual(["Flèche à vide", "2,14 m (à x 74,9 m)", null]);
  });

  test("under a cause the five solve rows go, and `w` and `corde` stay", () => {
    const opening = scenario();
    const rows = deducedRows(
      opening,
      deduceValues(opening, null),
      "Aucun résultat — portée invalide.",
    );
    expect(rows.map((row) => row.label)).toEqual(["Poids linéique", "Corde"]);
  });

  test("an imported profile puts `Portée`, `Dénivelé` and both base altitudes first", () => {
    const imported = scenario((draft) => {
      draft.geometry = { source: "trace", trace: "p1.x", sa: 56, sb: 224 };
      draft.anchors = { zA: 4, zB: 2.5 };
    });
    const rows = deducedRows(imported, deduceValues(imported, TRACE), null);
    // L = 224 − 56 = 168; z(56) = 530, so h = (500 + 2,5) − (530 + 4) = −31,5;
    // corde = √(168² + 31,5²) = √29 216,25 = 170,928.
    expect(shown(rows.filter((row) => row.group === "placement"))).toEqual([
      ["Portée", "168,0 m", null],
      ["Dénivelé", "-31,5 m", null],
      ["Alt. base A", "530,0 m", null],
      ["Alt. base B", "500,0 m", null],
    ]);
    expect(rows.slice(0, 4).every((row) => row.group === "placement")).toBe(true);
    expect(rows.find((row) => row.label === "Corde")?.value).toBe("170,93 m");
  });
});
