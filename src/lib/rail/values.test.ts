import { describe, expect, expectTypeOf, test } from "vitest";

import type { ScenarioDraft } from "@/lib/scenario/types.ts";
import type { Trace } from "@/lib/terrain/trace.ts";

import { firstRunDefaults } from "@/lib/scenario/first-run.ts";
import { traverseInputs } from "@/lib/scenario/traverse.ts";

import { deduceValues } from "./deduced.ts";
import { commitField } from "./fields.ts";
import {
  applyField,
  applyPosition,
  commitPosition,
  applyRopeClass,
  applyShippedTerminations,
  clearOverride,
  drivingField,
  FIELD_ACCESS,
  NUMERIC_FIELDS,
  isPositionField,
  isPositionTwin,
  positionPairNote,
  railValues,
  sameGatedText,
  switchTightness,
  withOverride,
} from "./values.ts";

/**
 * Form text ⇄ canonical state — « v1 build spec » § 3 (*Units, the force selector*, *Tightness
 * Spec*, *Display precision per quantity*).
 *
 * The two invariants this file exists to hold are both stated as identities, because both are
 * violated by the obvious implementation: **a unit switch never writes state**, and **a prefill
 * writes the displayed value into state, never the underlying float**.
 */

/** A 200 m profil, falling 20 m from A to B. */
const TRACE: Trace = {
  d: Float64Array.from([0, 200]),
  z: Float64Array.from([100, 80]),
  dev: null,
  origin: { kind: "csv", fileName: "t.csv" },
};

function scenario(patch: (draft: ScenarioDraft) => void = () => {}): ScenarioDraft {
  const draft = firstRunDefaults() as ScenarioDraft;
  patch(draft);
  return draft;
}

describe("railValues — the read direction of the force selector", () => {
  test("§ 9's opening screen, field by field", () => {
    const values = railValues(scenario());
    expect(values).toMatchObject({
      L: "150,0",
      h: "-18,0",
      zA: "12,0",
      zB: "12,0",
      D_target: "6,00",
      d: "12,0",
      etaA: "0,90",
      etaB: "0,90",
      mp: "120",
      hRider: "2,1",
      DAF: "1,2",
      xD: "75,0",
    });
  });

  test("a field the current mode, family or driver does not render is blank", () => {
    const values = railValues(scenario());
    // Steel has no rope class; `Flèche` is the driver.
    expect(values.MBL).toBe("");
    expect(values.L0).toBe("");
    expect(values.H_target).toBe("");
  });

  test("the three steel derived rows are editable fields showing the formula value", () => {
    // No override ships on first run — absence **is** « non surchargée » — but the row is still an
    // input, because typing into it is what creates the override.
    const first = scenario();
    expect(first.material).not.toHaveProperty("overrides");
    const values = railValues(first, deduceValues(first, null));
    expect(values.mbfOverride).toBe("9074");
    expect(values.eaOverride).toBe("6,90");
    expect(values.muOverride).toBe("0,5465");
  });

  test("« blank and required » is a blank field, never a zero", () => {
    const rope = scenario((draft) => {
      draft.usage = "TEMPORAIRE";
      draft.material = { family: "textile", ropeClass: "hmpe", MBL: null, mu: null, k: 22 };
    });
    const values = railValues(rope);
    expect(values.MBL).toBe("");
    expect(values.muTextile).toBe("");
    expect(values.k).toBe("22,00");
  });

  test("imported mode leaves `L` and `h` to the read-outs of the whole profil", () => {
    const imported = scenario((draft) => {
      draft.geometry = { source: "trace", trace: "p1.x" };
    });
    const values = railValues(imported, deduceValues(imported, TRACE));
    expect(values.L).toBe("");
    expect(values.h).toBe("");
  });
});

describe("sameGatedText — the text tier one reads, through a scrub", () => {
  const shown = railValues(scenario());

  test("a bag that moved only `x_D` holds the same gated text", () => {
    expect(sameGatedText(shown, { ...shown, xD: "12,5" })).toBe(true);
  });

  test("a bag that moved a gated field does not", () => {
    expect(sameGatedText(shown, { ...shown, hClearMin: "3,00" })).toBe(false);
    expect(sameGatedText(shown, { ...shown, L: "" })).toBe(false);
  });
});

describe("the Vent fields (#87)", () => {
  test("typing a speed and a direction writes the wind, and nothing else", () => {
    const before = scenario();
    const typed = applyField(applyField(before, "windSpeed", 50, null), "windDirection", 45, null);
    expect(typed.wind).toEqual({ speedKmh: 50, directionDeg: 45 });
    expect({ ...typed, wind: before.wind }).toEqual(before);
  });

  test("the fields show the wind in whole km/h and whole degrees", () => {
    const windy = scenario((draft) => {
      draft.wind = { speedKmh: 50, directionDeg: 45 };
    });
    expect(railValues(windy)).toMatchObject({ windSpeed: "50", windDirection: "45" });
    expect(railValues(scenario())).toMatchObject({ windSpeed: "0", windDirection: "0" });
  });

  test("a wind field is in no gate, so a scrub-free edit never reaches tier one", () => {
    const shown = railValues(scenario());
    expect(sameGatedText(shown, { ...shown, windSpeed: "-5", windDirection: "x" })).toBe(true);
  });
});

describe("the unit invariant — daN → X → daN is the identity", () => {
  test("a selector change writes nothing into state", () => {
    const daN = scenario((draft) => {
      draft.tightness = { mode: "tension", H_target: 2535 };
    });
    const kN: ScenarioDraft = { ...daN, unit: "kN" };
    const back: ScenarioDraft = { ...kN, unit: "daN" };
    // Only the *rendering* moved. State stayed canonical newtons throughout, which is what makes
    // the claim that a display control is provably physics-neutral hold.
    expect(railValues(daN).H_target).toBe("253,5");
    expect(railValues(kN).H_target).toBe("2,535");
    expect(railValues(back).H_target).toBe("253,5");
    expect(back.tightness).toEqual(daN.tightness);
  });

  test("re-typing the shown value under daN or kN lands on the same newtons", () => {
    // The *typed* path, which is the one path that does write. `kN` = daN decimals + 2, so the
    // resolution never coarsens on a switch and the round trip is exact.
    for (const unit of ["daN", "kN"] as const) {
      const draft: ScenarioDraft = {
        ...scenario(),
        unit,
        tightness: { mode: "tension", H_target: 2535 },
      };
      expect(commitField("H_target", railValues(draft).H_target, { unit })).toBe(2535);
    }
  });

  test("`kgf` re-types at its own grain, and the 0,03 % is disclosed rather than papered over", () => {
    // `KGF = 9,80665` against `G = 9,81`: two constants, each correct in its role. 253,5 daN reads
    // 258,5 kgf, and **re-typing** that lands on 2535,02 N — which is what the kgf note says.
    const draft: ScenarioDraft = {
      ...scenario(),
      unit: "kgf",
      tightness: { mode: "tension", H_target: 2535 },
    };
    expect(railValues(draft).H_target).toBe("258,5");
    expect(commitField("H_target", "258,5", { unit: "kgf" })).toBeCloseTo(2535, 1);
  });
});

describe("applyField — one committed field, written back", () => {
  test("it never mutates the draft it was handed", () => {
    const before = scenario();
    const after = applyField(before, "mp", 100, null);
    expect(before.rider.mp).toBe(120);
    expect(after.rider.mp).toBe(100);
    expect(after).not.toBe(before);
  });

  test("shortening the span moves the viewpoint rather than refusing the span", () => {
    // `x_D` clamps on **every** path, this one included: a geometry change under a stale viewpoint.
    const short = applyField(scenario(), "L", 50, null);
    expect(short.rider.xD).toBe(50);
    if (short.geometry.source !== "manual") throw new Error("expected manual geometry");
    expect(short.geometry.L).toBe(50);
  });

  test("a typed `x_D` outside the span clamps too, and blocks nothing", () => {
    expect(applyField(scenario(), "xD", 400, null).rider.xD).toBe(150);
    expect(applyField(scenario(), "xD", -20, null).rider.xD).toBe(0);
  });

  test("the clamp runs in imported mode as well, against the whole profil", () => {
    // A viewpoint past the profil's last sample is exactly as stale as one past `Portée` in manual
    // mode. Left unclamped, state publishes an `x_D` the span does not contain while the scene
    // silently draws the rider somewhere else.
    const imported = scenario((draft) => {
      draft.geometry = { source: "trace", trace: "p1.x" };
    });
    expect(applyField(imported, "xD", 500, TRACE).rider.xD).toBe(200);
    expect(applyField(imported, "xD", -3, TRACE).rider.xD).toBe(0);
  });

  test("an imported geometry with no profil loaded clamps against nothing", () => {
    const unloaded = scenario((draft) => {
      draft.geometry = { source: "trace", trace: "p1.x" };
      draft.rider.xD = 75;
    });
    expect(applyField(unloaded, "xD", 400, null).rider.xD).toBe(400);
    expect(applyField(unloaded, "zB", 3, null).rider.xD).toBe(75);
    // Below 0 too: `clampX`'s rule, the one the reducer's terrain path applies to the same `x_D`.
    expect(applyField(unloaded, "xD", -5, null).rider.xD).toBe(-5);
    expect(applyField(unloaded, "xD", Number.NaN, null).rider.xD).toBe(0);
  });

  test("writing the driving tightness field keeps the driver it belongs to", () => {
    const tighter = applyField(scenario(), "D_target", 4, null);
    expect(tighter.tightness).toEqual({ mode: "sag", D_target: 4 });
  });

  test("every numeric field has a write path", () => {
    // A field the form renders and `applyField` silently drops would be a control that does
    // nothing — the failure mode a `default:` branch hides.
    const complete = scenario((draft) => {
      draft.usage = "TEMPORAIRE";
      draft.geometry = { source: "trace", trace: "p1.x" };
      draft.material = { family: "textile", ropeClass: "hmpe", MBL: 1e5, mu: 0.1, k: 22 };
    });
    const steel = scenario((draft) => {
      draft.material = {
        family: "steel",
        d: 12,
        R0: 1770,
        construction: "iwrc",
        overrides: { MBF: 90740, EA: 6.9e6, mu: 0.5465 },
      };
    });
    // The four coordinates are written as pairs, by `applyPosition`, which is tested below.
    for (const id of NUMERIC_FIELDS.filter((field) => !isPositionField(field))) {
      const base = id === "L" || id === "h" ? steel : complete;
      const host = id.endsWith("Override") || id === "d" ? steel : base;
      const after = applyField(host, id, 7, null);
      const before = railValues(host, deduceValues(host, null))[id];
      expect(railValues(after, deduceValues(after, null))[id]).not.toBe(before);
    }
  });
});

describe("FIELD_ACCESS — one lens per numeric field", () => {
  test("the numeric fields are the rows of `FIELDS` with a precision row, in rail order", () => {
    expect(NUMERIC_FIELDS).toEqual([
      "L",
      "h",
      "zA",
      "zB",
      "d",
      "mbfOverride",
      "eaOverride",
      "muOverride",
      "MBL",
      "muTextile",
      "dTextile",
      "k",
      "etaA",
      "etaB",
      "D_target",
      "T_target",
      "H_target",
      "L0",
      "vRatio",
      "mp",
      "hRider",
      "hClearMin",
      "DAF",
      "xD",
      "windSpeed",
      "windDirection",
      "latA",
      "lonA",
      "latB",
      "lonB",
    ]);
  });

  test("`null` clears a field whose blank is state, and a required field has no blank", () => {
    const overridden = withOverride(scenario(), "MBF", 80000);
    const cleared = FIELD_ACCESS.mbfOverride.write(overridden, null);
    if (cleared.material.family !== "steel") throw new Error("expected steel");
    expect(cleared.material.overrides).toBeUndefined();

    const rope = scenario((draft) => {
      draft.usage = "TEMPORAIRE";
      draft.material = { family: "textile", ropeClass: "hmpe", MBL: 1e5, mu: 0.1, k: 22 };
    });
    expect(FIELD_ACCESS.MBL.read(FIELD_ACCESS.MBL.write(rope, null))).toBeNull();

    expectTypeOf(FIELD_ACCESS.MBL.write).parameter(1).toEqualTypeOf<number | null>();
    expectTypeOf(FIELD_ACCESS.L.write).parameter(1).toEqualTypeOf<number>();
    expectTypeOf(FIELD_ACCESS.vRatio.write).parameter(1).toEqualTypeOf<number>();
  });

  describe("the optional textile diameter", () => {
    const rope = scenario((draft) => {
      draft.usage = "TEMPORAIRE";
      draft.material = { family: "textile", ropeClass: "hmpe", MBL: 1e5, mu: 0.1, k: 22 };
    });

    test("reads null while absent, and undefined on a steel spec", () => {
      expect(FIELD_ACCESS.dTextile.read(rope)).toBeNull();
      expect(FIELD_ACCESS.dTextile.read(scenario())).toBeUndefined();
    });

    test("writing a number sets `d`, and writing null drops the key", () => {
      const withD = FIELD_ACCESS.dTextile.write(rope, 11);
      expect(FIELD_ACCESS.dTextile.read(withD)).toBe(11);
      const cleared = FIELD_ACCESS.dTextile.write(withD, null);
      expect("d" in cleared.material).toBe(false);
      expect(FIELD_ACCESS.dTextile.read(cleared)).toBeNull();
    });

    test("a write on a steel spec changes nothing", () => {
      const steel = scenario();
      expect(FIELD_ACCESS.dTextile.write(steel, 11)).toBe(steel);
    });
  });
});

describe("Override — steel only, per value, and « Recalculer » drops the key", () => {
  test("typing into a derived field flips it to « valeur saisie »", () => {
    const overridden = withOverride(scenario(), "MBF", 80000);
    if (overridden.material.family !== "steel") throw new Error("expected steel");
    expect(overridden.material.overrides).toEqual({ MBF: 80000 });
    expect(deduceValues(overridden, null).material.overridden.MBF).toBe(true);
  });

  test("overrides are independent: setting `EA` leaves `MBF` on the formula", () => {
    const both = withOverride(withOverride(scenario(), "MBF", 80000), "EA", 5e6);
    if (both.material.family !== "steel") throw new Error("expected steel");
    expect(both.material.overrides).toEqual({ MBF: 80000, EA: 5e6 });
  });

  test("« Recalculer » restores « non surchargée », not « equal to the formula value »", () => {
    // The two states differ: the first tracks `d` from here on, the second is an override that
    // happens to agree today — and would carry the pastille and the aggregate entry with it.
    const cleared = clearOverride(withOverride(scenario(), "MBF", 80000), "MBF");
    if (cleared.material.family !== "steel") throw new Error("expected steel");
    expect(cleared.material.overrides).toBeUndefined();
    expect(deduceValues(cleared, null).material.overridden.MBF).toBe(false);
  });

  test("textile has no override affordance at all", () => {
    const rope = scenario((draft) => {
      draft.usage = "TEMPORAIRE";
      draft.material = { family: "textile", ropeClass: "hmpe", MBL: 1e5, mu: 0.1, k: 22 };
    });
    expect(withOverride(rope, "MBF", 1)).toBe(rope);
    expect(clearOverride(rope, "MBF")).toBe(rope);
  });
});

describe("the Tightness Spec — one editable field, prefilled from its own read-out", () => {
  const first = scenario();
  const deduced = deduceValues(first, null);

  test("« Flèche » → « Longueur » lands on the length just achieved, at 2 decimals", () => {
    const length = switchTightness(first, "length", deduced);
    expect(length.tightness).toEqual({ mode: "length", L0: 151.64 });
    expect(drivingField(length)).toBe("L0");
  });

  test("« Flèche » → « H » lands on the tension horizontale just achieved", () => {
    const tension = switchTightness(first, "tension", deduced);
    expect(tension.tightness).toEqual({ mode: "tension", H_target: 2535 });
    expect(railValues(tension).H_target).toBe("253,5");
  });

  test("« Flèche » → « Prétension » lands on the tension just achieved at A, where it is read", () => {
    const pretension = switchTightness(first, "anchor", deduced);
    expect(pretension.tightness).toEqual({ mode: "anchor", T_target: 2634 });
    expect(pretension.tensioningSide).toBe("A");
    expect(drivingField(pretension)).toBe("T_target");
    expect(railValues(pretension).T_target).toBe("263,4");
    // And it is the same line: the prefill is at 0,1 daN, so `L₀` moves by far less than its grain.
    const solve = deduceValues(pretension, null).solve;
    if (solve === null) throw new Error("expected a solve");
    expect(Math.abs(solve.L0 - 151.64)).toBeLessThan(0.005);
  });

  test("« Flèche » → « Rapport V » lands on `m_p·g / H` at 2 decimals, and solves to the same line", () => {
    // 120 kg × 9,81 / 2535 N = 0,4644 → 0,46. The ratio is the app's; the engine only ever sees
    // the `H_target` it resolves to, so the deduced `L₀` must land within the field's own grain.
    const ratio = switchTightness(first, "ratio", deduced);
    expect(ratio.tightness).toEqual({ mode: "ratio", ratio: 0.46 });
    expect(drivingField(ratio)).toBe("vRatio");
    expect(railValues(ratio).vRatio).toBe("0,46");
    const solve = deduceValues(ratio, null).solve;
    if (solve === null) throw new Error("expected a solve");
    expect(solve.H).toBeCloseTo((120 * 9.81) / 0.46, 0);
    expect(Math.abs(solve.L0 - 151.64)).toBeLessThan(0.05);
  });

  test("the prefill writes the **displayed** value, never the float behind it", () => {
    // 151,64 enters state; 151,6440231 never does. That is what makes the URL exact and short by
    // construction — and it is 8 % of the shipped clearance margin if the row were 1 decimal.
    const length = switchTightness(first, "length", deduced);
    if (length.tightness.mode !== "length") throw new Error("expected the length driver");
    expect(length.tightness.L0).toBe(151.64);
    expect(deduced.solve?.L0).not.toBe(151.64);
  });

  test("a round trip through a mode costs at most the new field's own grain", () => {
    const there = switchTightness(first, "length", deduced);
    const back = switchTightness(there, "sag", deduceValues(there, null));
    if (back.tightness.mode !== "sag") throw new Error("expected the sag driver");
    // 151,64 m of `L₀` is 5,99 m of flèche, not 6,00 — the 2-decimal row keeps that under 1 cm,
    // where a 1-decimal `L₀` would cost 0,21 m.
    expect(Math.abs(back.tightness.D_target - 6)).toBeLessThan(0.02);
  });

  test("under « Tension impossible » the switch still switches, from the last good read-out", () => {
    // The state a user most needs another driver in: a flèche the cable cannot reach is fixed by
    // typing a tension, so the selector must not go dead there.
    const impossible = scenario((draft) => {
      draft.tightness = { mode: "sag", D_target: 0.01 };
    });
    const refused = deduceValues(impossible, null);
    expect(refused.solve).toBeNull();
    const tension = switchTightness(impossible, "tension", refused, deduced.solve);
    expect(tension.tightness).toEqual({ mode: "tension", H_target: 2535 });
  });

  test("with no read-out ever seen, the prefill is the first-run line's", () => {
    const blank = scenario((draft) => {
      draft.usage = "TEMPORAIRE";
      draft.material = { family: "textile", ropeClass: "hmpe", MBL: null, mu: null, k: 22 };
    });
    const length = switchTightness(blank, "length", deduceValues(blank, null));
    expect(length.tightness).toEqual({ mode: "length", L0: 151.64 });
  });

  test("switching to the mode already active is a no-op", () => {
    expect(switchTightness(first, "sag", deduced)).toBe(first);
  });
});

describe("#85 — the prétension's lens and the tensioning side", () => {
  test("the lens reads the prétension's target, and only under its own driver", () => {
    const driven = scenario((draft) => {
      draft.tightness = { mode: "anchor", T_target: 2600 };
    });
    expect(FIELD_ACCESS.T_target.read(driven)).toBe(2600);
    expect(FIELD_ACCESS.H_target.read(driven)).toBeUndefined();
    expect(FIELD_ACCESS.T_target.read(scenario())).toBeUndefined();
  });

  test("writing the prétension makes it the driver and leaves the side where it stands", () => {
    const atB = scenario((draft) => {
      draft.tensioningSide = "B";
    });
    const written = applyField(atB, "T_target", 2500, null);
    expect(written.tightness).toEqual({ mode: "anchor", T_target: 2500 });
    expect(written.tensioningSide).toBe("B");
  });

  test("A ↔ B changes the prétension the switch prefills on the inclined first-run span", () => {
    // `h = −18`: one line, two readings — the higher anchor A reads more, as §2 says it must.
    const atA = scenario();
    const atB = scenario((draft) => {
      draft.tensioningSide = "B";
    });
    const fromA = switchTightness(atA, "anchor", deduceValues(atA, null));
    const fromB = switchTightness(atB, "anchor", deduceValues(atB, null));
    expect(fromA.tightness).toEqual({ mode: "anchor", T_target: 2634 });
    expect(fromB.tightness).toEqual({ mode: "anchor", T_target: 2537 });
  });

  test("the prefill under « Aucun résultat » reads the last good line at the current side", () => {
    const atB = scenario((draft) => {
      draft.tensioningSide = "B";
      draft.tightness = { mode: "sag", D_target: 0.01 };
    });
    const lastGood = deduceValues(scenario(), null).solve;
    const switched = switchTightness(atB, "anchor", deduceValues(atB, null), lastGood);
    expect(switched.tightness).toEqual({ mode: "anchor", T_target: 2537 });
  });
});

describe("applyRopeClass — `Classe de corde` sets `k` and keeps the ends", () => {
  /** A PA rope tied with a figure-eight at A and a bowline at B, both §10.3 knots. */
  const knotted = scenario((draft) => {
    draft.usage = "TEMPORAIRE";
    draft.material = { family: "textile", ropeClass: "pa-en1891a", MBL: 3e5, mu: 0.08, k: 1.5 };
    draft.terminations = {
      A: { id: "noeud-de-huit", eta: 0.6 },
      B: { id: "noeud-de-chaise", eta: 0.55 },
    };
  });

  test("HMPE ships §13.2's `k` 22, and the knots stay as given for the gate to raise", () => {
    const next = applyRopeClass(knotted, "hmpe");
    expect(next.material).toEqual({
      family: "textile",
      ropeClass: "hmpe",
      MBL: 3e5,
      mu: 0.08,
      k: 22,
    });
    expect(next.terminations).toEqual({
      A: { id: "noeud-de-huit", eta: 0.6 },
      B: { id: "noeud-de-chaise", eta: 0.55 },
    });
  });

  test("polyester's `k` is blank, not a number nobody published", () => {
    expect(applyRopeClass(knotted, "polyester").material).toMatchObject({ k: null });
  });

  test("PA's `k` is §13.2's 1,5", () => {
    expect(applyRopeClass(applyRopeClass(knotted, "hmpe"), "pa-en1891a").material).toMatchObject({
      k: 1.5,
    });
  });

  test("a steel line has no rope class to change", () => {
    const steel = scenario();
    expect(applyRopeClass(steel, "hmpe")).toBe(steel);
  });
});

describe("applyShippedTerminations — the termination Fix Action's effect", () => {
  test("only the ends the error names take the family's shipped end", () => {
    const line = scenario((draft) => {
      draft.terminations = {
        A: { id: "noeud-de-huit", eta: 0.6 },
        B: { id: "manchon-a-coin", eta: 0.8 },
      };
    });
    expect(applyShippedTerminations(line, { field: "ta", alsoOutlined: [] }).terminations).toEqual({
      A: { id: "cosse-oeil-flamand", eta: 0.9 },
      B: { id: "manchon-a-coin", eta: 0.8 },
    });
  });

  test("on a rope both ends take « Œil cousu / épissuré » at η 0,90", () => {
    const rope = scenario((draft) => {
      draft.usage = "TEMPORAIRE";
      draft.material = { family: "textile", ropeClass: "hmpe", MBL: 3e5, mu: 0.08, k: 22 };
      draft.terminations = {
        A: { id: "noeud-de-huit", eta: 0.6 },
        B: { id: "noeud-de-chaise", eta: 0.55 },
      };
    });
    expect(
      applyShippedTerminations(rope, { field: "ta", alsoOutlined: ["tb"] }).terminations,
    ).toEqual({
      A: { id: "oeil-cousu-epissure", eta: 0.9 },
      B: { id: "oeil-cousu-epissure", eta: 0.9 },
    });
  });
});

describe("Positions (#90) — an anchor's two coordinates, committed as one", () => {
  const A = { lat: 46.843556, lon: 6.525035 };
  const blank = { latA: "", lonA: "", latB: "", lonB: "" };

  test("both texts readable make the Position, at six decimals", () => {
    const after = applyPosition(
      scenario(),
      "A",
      { ...blank, latA: "46,8435564", lonA: "6.525035" },
      {},
    );
    expect(after.positions).toEqual({ A, B: null });
  });

  test("a text refused by tier one leaves the Scenario as it was", () => {
    const before = scenario();
    expect(applyPosition(before, "A", { ...blank, latA: "46,84", lonA: "6,x" }, {})).toBe(before);
    const placed = { ...before, positions: { A, B: null } };
    expect(applyPosition(placed, "A", { ...blank, latA: "46,84", lonA: "6,x" }, {})).toBe(placed);
  });

  test("a blank half is « inconnue »: it unsets the Position it would have left half-shown", () => {
    const before = scenario();
    expect(applyPosition(before, "A", { ...blank, latA: "46,84" }, {})).toBe(before);
    const placed = { ...before, positions: { A, B: null } };
    expect(applyPosition(placed, "A", { ...blank, latA: "46,84" }, {}).positions.A).toBeNull();
    expect(applyPosition(placed, "A", { ...blank, lonA: "6,52" }, {}).positions.A).toBeNull();
  });

  test("a coordinate field commits what entered state, and nothing when the write did not land", () => {
    const placed = { ...scenario(), positions: { A, B: null } };
    const landed = commitPosition(placed, "latA", { ...blank, latA: "47,1", lonA: "6,52" }, {});
    expect(landed.value).toBe(47.1);
    expect(landed.scenario.positions.A).toEqual({ lat: 47.1, lon: 6.52 });
    // The pair's other half is blank: the Position is gone, and the field is not snapped to a value.
    const halfBlank = commitPosition(placed, "latA", { ...blank, latA: "47,1" }, {});
    expect(halfBlank.value).toBeNull();
    expect(halfBlank.scenario.positions.A).toBeNull();
    // The pair's other half is unreadable: state keeps the old Position, and says nothing is new.
    const refused = commitPosition(placed, "latA", { ...blank, latA: "47,1", lonA: "6,x" }, {});
    expect(refused.value).toBeNull();
    expect(refused.scenario).toBe(placed);
  });

  test("both blank unsets the Position, and the other anchor is untouched", () => {
    const placed = { ...scenario(), positions: { A, B: { lat: 46.846166, lon: 6.520783 } } };
    const after = applyPosition(placed, "A", blank, {});
    expect(after.positions).toEqual({ A: null, B: { lat: 46.846166, lon: 6.520783 } });
  });

  test("the fields read the Position back, blank where it is unknown", () => {
    const placed = { ...scenario(), positions: { A, B: null } };
    expect(railValues(placed)).toMatchObject({
      latA: "46,843556",
      lonA: "6,525035",
      latB: "",
      lonB: "",
    });
  });

  test("a Position changes nothing the Sweep reads, so it cannot re-run it", () => {
    const before = scenario();
    const placed = applyPosition(before, "A", { ...blank, latA: "46,84", lonA: "6,52" }, {});
    expect(placed.positions.A).not.toBeNull();
    const [kept, moved] = [traverseInputs(before), traverseInputs(placed)];
    expect(moved).toEqual(kept);
    // The memo keys are compared by identity, not by value.
    for (const key of Object.keys(kept) as (keyof typeof kept)[]) {
      expect(Object.is(moved[key], kept[key])).toBe(true);
    }
  });

  test("a coordinate emptied keeps its twin's text out of the sync's reach", () => {
    const placed = { ...scenario(), positions: { A, B: null } };
    const text = { ...blank, latA: "", lonA: "6,525035" };
    const committed = commitPosition(placed, "latA", text, {});
    expect(committed.scenario.positions.A).toBeNull();
    // The Position now reads blank in both fields; the focused one's twin must not take that.
    expect(railValues(committed.scenario)).toMatchObject({ latA: "", lonA: "" });
    expect(isPositionTwin("lonA", "latA")).toBe(true);
    expect(isPositionTwin("latA", "lonA")).toBe(true);
    expect(isPositionTwin("latA", "latA")).toBe(false);
    expect(isPositionTwin("lonB", "latA")).toBe(false);
    expect(isPositionTwin("lonA", null)).toBe(false);
    expect(isPositionTwin("lonA", "L")).toBe(false);
    expect(positionPairNote(text, "A")).not.toBeNull();
  });

  test("a lone coordinate is named, as a property of the pair", () => {
    expect(positionPairNote({ ...blank, latA: "46,84" }, "A")).toBe(
      "Position incomplète : latitude et longitude vont ensemble.",
    );
    expect(positionPairNote({ ...blank, latA: "46,84", lonA: "6,5" }, "A")).toBeNull();
    expect(positionPairNote(blank, "A")).toBeNull();
    // Another anchor's blanks say nothing about this one.
    expect(positionPairNote({ ...blank, latB: "46,84" }, "A")).toBeNull();
  });
});
