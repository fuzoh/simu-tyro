import { describe, expect, test } from "vitest";

import type { SpanInput, Terrain, VerdictInput } from "@/lib/sim";

import { formatQuantity, roundToDisplay } from "@/lib/format/quantity.ts";
import {
  deriveSteel,
  evaluateClearance,
  evaluateVerdict,
  resolveL0,
  solveSpan,
  STEEL,
  sweep,
  unloadedSag,
} from "@/lib/sim";

import type { Scenario } from "./types.ts";

import { FIRST_RUN_RETAINED_TEXTILE, FIRST_RUN_SCENARIO, firstRunDefaults } from "./first-run.ts";
import { engineTightness } from "./tightness.ts";

/**
 * The first-run lock — « v1 build spec » § 9 (*The opening screen is frozen as a Vitest fixture*)
 * and § 11 (*The first-run lock asserts formatted strings, not floats*). A **regression lock, not
 * a physics fixture**: §15's `F1`/`Z1`–`Z6` keep that job in `src/lib/sim/__fixtures__`, with
 * their own tiers. What this file freezes is **the opening screen** — a defaults change, a
 * precision-table change or a solver regression must not be able to move it silently.
 *
 * It is also the engine's only **end-to-end** test: § 9's figures are reproduced *from the
 * shipped constant*, through the same chain a parameter change runs — derive the material,
 * resolve `L₀` from the tension de pose, solve the unloaded line, sweep the traverse, reduce §11
 * over it, score §10.
 *
 * **Why the assertion is what the user reads.** `1e-3` relative on `L₀` is ±0,15 m, and 0,15 m of
 * `L₀` moves garde by ≈0,15 m — a tolerance that would let the opening screen drift by **6 % of
 * its safety margin** and stay green.
 *
 * **The lock closed in two stages, and both have landed.** § 10's P2 puts A2 (the
 * display-precision table) *before* A1's test, because every one of the eleven frozen strings
 * runs through that table and display precision is load-bearing **state**, not formatting. With
 * `src/lib/format/quantity.ts` in place the eleven are **string equalities**, at no tolerance at
 * all:
 *
 * ```
 * « 151,64 m » · « 253,6 daN » · « 6,00 m » · « 4,00 % » · « 2,90 % » · « 817,2 daN »
 * · « 928,0 daN » · « 7,48 m » · « 2,42 m » · « 8,80 » · « 9,06 »
 * ```
 *
 * and with them the **French decimal comma** and every row of the precision table. One collision
 * that lands with them, settled rather than hidden: « 817,2 daN » is frozen at **1 decimal**
 * while the rail's `T max statique` detail row and the strip's `T_A` cell sketch « 817 daN » at
 * 0 — **the frozen strings govern**. And the Rail's *headline* `T max` is the DAF-amplified
 * **928 daN**, never 817, because `FS effectif` divides by it.
 *
 * The three structural assertions no string can carry — `contact === "none"`, `coverage === 1`
 * over `grid.length === 260`, and **zero** steps in violation — are asserted here in full today.
 */

/**
 * § 9's fixed run parameters — « Sweep `sweep(input, P, 240)` ⇒ **260 pas** », « Clearance
 * `evaluateClearance(…, 60)` ». Every figure below was measured at these; changing either moves
 * them, which is the point of writing them down beside the constant they were taken with.
 */
const RUN = { sweepSteps: 240, samplesPerStep: 60 } as const;

/**
 * The whole chain a parameter change runs, from a Scenario. It lives in the test rather than in
 * `first-run.ts` because § 9 declares that module's surface as exactly `FIRST_RUN_SCENARIO` and
 * `firstRunDefaults()` — the app's own derivation is the store's (A7–A9), and this is the lock
 * reproducing § 9's measurement, not a second implementation the app will import.
 */
function openingState(scenario: Scenario) {
  const { geometry, material, anchors, rider } = scenario;
  if (geometry.source !== "manual") throw new Error("the first-run scenario is manual geometry");
  if (material.family !== "steel") throw new Error("the first-run scenario is family Acier");

  const { L, h } = geometry;
  // §13.1's chain from geometry alone: MBF 9074 daN, EA 6,90 MN, μ 0,5465 kg/m.
  const derived = deriveSteel(material);
  // `g` is § 2's fixed, unexposed constant; A2 owns the app-side copy the Rail will read.
  const P = rider.mp * STEEL.g;

  const L0 = resolveL0(engineTightness(scenario.tightness, rider.mp, scenario.tensioningSide), {
    L,
    h,
    ...derived,
  });
  if (!L0.ok) throw new Error(`expected an L₀, got ${JSON.stringify(L0.error)}`);

  const span: SpanInput = {
    L,
    h,
    L0: L0.value,
    w: derived.w,
    EA: derived.EA,
    loads: [],
    strength: derived.strength,
  };

  const vide = solveSpan(span);
  if (!vide.ok) throw new Error(`expected a solve, got ${JSON.stringify(vide.error)}`);
  const sag = unloadedSag(vide.state, { L, h }).D;

  const traverse = sweep(span, P, RUN.sweepSteps);

  // § 4's manual ground: the straight line between the two anchor bases, anchor-A-top frame.
  const terrain: Terrain = {
    kind: "profile",
    xs: Float64Array.from([0, L]),
    zs: Float64Array.from([-anchors.zA, h - anchors.zB]),
  };
  const clearance = evaluateClearance(
    span,
    P,
    traverse.steps,
    terrain,
    rider.hRider,
    RUN.samplesPerStep,
  );

  // « Flèche chargée max » — the deepest the loaded line hangs below the A–B chord over the
  // traverse, which is the rider's own node: the kink is the low point of a loaded catenary.
  let loadedSag = 0;
  for (const step of traverse.steps) {
    const drop = (h * step.xD) / L - step.zD;
    if (drop > loadedSag) loadedSag = drop;
  }

  // The régime is § 9's own worked entry. `FS effectif` is régime-**independent** — `η·MBF/T_DAF`
  // — so it is the same 8,80 / 9,06 under all five; the shipped screen simply does not show it,
  // because `Régime de sécurité` opens at « — choisir — ».
  const verdictInput: VerdictInput = {
    steps: traverse.steps,
    coverage: traverse.coverage,
    Tvide: { TA: vide.state.TA, TB: vide.state.TB },
    DAF: rider.DAF,
    regime: "acct10",
    eta: { A: scenario.terminations.A.eta, B: scenario.terminations.B.eta },
    strength: derived.strength,
    usage: scenario.usage,
    terminations: { A: scenario.terminations.A.id, B: scenario.terminations.B.id },
    family: material.family,
  };
  const verdict = evaluateVerdict(verdictInput);

  let stepsInViolation = 0;
  for (const worst of clearance.perStep) if (worst < 0) stepsInViolation++;

  return {
    L,
    derived,
    L0: L0.value,
    vide: vide.state,
    sag,
    traverse,
    clearance,
    loadedSag,
    verdict,
    stepsInViolation,
  };
}

const opening = openingState(FIRST_RUN_SCENARIO);

describe("FIRST_RUN_SCENARIO — § 9's shipped inputs", () => {
  test("the line: 150,0 m, −18,0 m, hauteurs 12,0 / 12,0 m, manual geometry", () => {
    // 12 / 12 is forced by arithmetic, not taste: the realistic 12 / 6 measures garde −1,04 m and
    // opens the app in « Câble au sol ».
    expect(FIRST_RUN_SCENARIO.geometry).toEqual({ source: "manual", L: 150, h: -18 });
    expect(FIRST_RUN_SCENARIO.anchors).toEqual({ zA: 12, zB: 12 });
    // One Brin porteur — `bp` absent, so § 9's link did not move when the key arrived (#84).
    expect(FIRST_RUN_SCENARIO.carryingLines).toBe(1);
    // The Mise en tension at A — `cp` absent, likewise (#85).
    expect(FIRST_RUN_SCENARIO.tensioningSide).toBe("A");
    // The mouflage — `mt` absent, likewise (#86).
    expect(FIRST_RUN_SCENARIO.tensioningDevice).toBe("pulley");
    // No wind — `ws` and `wd` absent, likewise (#87) — and its profile uniform at the shipped
    // width: `ww` and `wa` absent (#120).
    expect(FIRST_RUN_SCENARIO.wind).toEqual({
      speedKmh: 0,
      directionDeg: 0,
      widthPct: 50,
      attenuationPct: 0,
    });
  });

  test("Tension de pose is the active Tightness segment, at 263,4 daN (2634 N)", () => {
    // The segment the simplified Pages drive: a flèche driver would hold 6 m through a span change
    // and move the tension de pose unseen. 263,4 daN is exact at display precision — a direct-`L₀`
    // default would cost 0,21 m of flèche and 0,20 m of garde, 8 % of the shipped margin.
    expect(FIRST_RUN_SCENARIO.tightness).toEqual({ mode: "anchor", T_target: 2634 });
  });

  test("the material spec is complete and unoverridden — 12 mm, 1770, 6×19 âme métallique", () => {
    expect(FIRST_RUN_SCENARIO.material).toEqual({
      family: "steel",
      d: 12,
      R0: 1770,
      construction: "iwrc",
    });
    // Absence **is** « non surchargée »: an override here would ship the one `[STD-ATTESTED]`
    // derived value pre-downgraded into the provenance aggregate.
    expect("overrides" in FIRST_RUN_SCENARIO.material).toBe(false);
  });

  test("the derived steel chain is § 9's: MBF 9074 daN, EA 6,90 MN, w 0,536 daN/m", () => {
    // Frozen as strings too: `MBF` and `EA` are the stale-Override badge's two inputs, and the
    // badge compares at exactly this precision — « 9074 » against a formula value of 9073,98.
    expect(formatQuantity("MBF", opening.derived.strength)).toBe("9074 daN");
    expect(formatQuantity("EA", opening.derived.EA)).toBe("6,90 MN");
    expect(formatQuantity("w", opening.derived.w)).toBe("0,536 daN/m");
  });

  test("both terminations are cosse à sertir at η 0,90 — deliberately symmetric", () => {
    // `T_A > T_B`, so FS_A governs: the higher-anchor rule without asymmetric hardware.
    expect(FIRST_RUN_SCENARIO.terminations.A).toEqual({ id: "cosse-oeil-flamand", eta: 0.9 });
    expect(FIRST_RUN_SCENARIO.terminations.B).toEqual(FIRST_RUN_SCENARIO.terminations.A);
  });

  test("the passenger: 120 kg, 2,1 m, garde admise 1,0 m, zones d'ancrage 10 m, DAF 1,2, at x = L/2 = 75,0 m", () => {
    expect(FIRST_RUN_SCENARIO.rider).toEqual({
      mp: 120,
      hRider: 2.1,
      hClearMin: 1,
      // #106's `[CONVENTION]`: 10 m at each end.
      anchorZone: 10,
      DAF: 1.2,
      xD: 75,
    });
    expect(FIRST_RUN_SCENARIO.rider.xD).toBe(FIRST_RUN_SCENARIO.geometry.L / 2);
  });

  test("PERMANENTE, daN, and no régime — the first screen is verdict-less", () => {
    expect(FIRST_RUN_SCENARIO.usage).toBe("PERMANENTE");
    expect(FIRST_RUN_SCENARIO.unit).toBe("daN");
    // « — choisir — » is not an empty required field: `régime choisi` is struck from the solve
    // tier, and a default régime would pick the user's safety framework for them.
    expect(FIRST_RUN_SCENARIO.regime).toBeNull();
  });

  test("the retained textile spec ships blank: HMPE, k 22, MBL and μ required", () => {
    // No rope ships. One invented MBL decides the verdict: 100 kN ⇒ 11,94, 60 kN ⇒ 7,63.
    expect(FIRST_RUN_RETAINED_TEXTILE.spec).toEqual({
      family: "textile",
      ropeClass: "hmpe",
      MBL: null,
      mu: null,
      k: 22,
    });
  });

  test("the retained textile carries its own terminations — § 3 retains them with the spec", () => {
    // The whitelist is scoped by family: a steel `cosse` surviving the flip is a picker value the
    // rope's own option list does not contain, and it drops the `[CONVENTION]` chip.
    expect(FIRST_RUN_RETAINED_TEXTILE.terminations).toEqual({
      A: { id: "oeil-cousu-epissure", eta: 0.9 },
      B: { id: "oeil-cousu-epissure", eta: 0.9 },
    });
  });
});

describe("firstRunDefaults() — one object, three consumers, no shared mutable state", () => {
  test("it returns the shipped scenario", () => {
    // « Réinitialiser le scénario » and a link that omits keys must land on exactly the values a
    // fresh visit does — one object, not three copies.
    expect(firstRunDefaults()).toEqual(FIRST_RUN_SCENARIO);
  });

  test("it copies every nested object, so an edit cannot rewrite the reset target", () => {
    const store = firstRunDefaults();
    expect(store).not.toBe(FIRST_RUN_SCENARIO);
    for (const key of ["geometry", "anchors", "tightness", "material", "rider"] as const) {
      expect(store[key]).not.toBe(FIRST_RUN_SCENARIO[key]);
    }
    expect(store.terminations.A).not.toBe(FIRST_RUN_SCENARIO.terminations.A);

    if (store.geometry.source !== "manual") throw new Error("expected manual geometry");
    store.geometry.L = 250;
    store.rider.xD = 125;
    store.regime = "en15567";

    expect(FIRST_RUN_SCENARIO.geometry.L).toBe(150);
    expect(FIRST_RUN_SCENARIO.rider.xD).toBe(75);
    expect(FIRST_RUN_SCENARIO.regime).toBeNull();
    expect(firstRunDefaults()).toEqual(FIRST_RUN_SCENARIO);
  });
});

/**
 * The eleven quantities § 11 freezes — computed from the shipped constant through the whole
 * engine chain and rendered through § 3's display-precision table, which is the only place any
 * of these decimals is decided. **String equality, no tolerance**: `1e-3` relative on `L₀` is
 * ±0,15 m, and 0,15 m of `L₀` moves garde by ≈0,15 m, so a numeric bar would let the opening
 * screen drift by 6 % of its safety margin and stay green.
 */
describe("the opening state — § 9's measured table, from FIRST_RUN_SCENARIO", () => {
  test("« 151,64 m » — L₀ from the 263,4 daN tension de pose", () => {
    expect(formatQuantity("L0", opening.L0)).toBe("151,64 m");
  });

  test("« 253,6 daN » — tension horizontale H à vide", () => {
    // Re-pinned from 253,5 when first run moved from the flèche to the tension de pose: 263,4 daN
    // is the displayed value of the 6 m line's tension, not its exact one.
    expect(formatQuantity("H_target", opening.vide.H)).toBe("253,6 daN");
  });

  test("« 6,00 m » — flèche à vide, now a read-out, still 6 m at display precision", () => {
    expect(formatQuantity("sag", opening.sag)).toBe("6,00 m");
    // The opening line is the one a 6 m flèche gave, to the displayed digit: the flèche is read, not
    // driven, and a prefill of its field would write 6 back.
    expect(roundToDisplay("D_target", opening.sag)).toBe(6);
  });

  test("« 4,00 % » — flèche / portée, clear of §8.2's 3 % threshold", () => {
    expect(formatQuantity("sagRatio", (opening.sag / opening.L) * 100)).toBe("4,00 %");
  });

  test("« 2,90 % » — tension permanente, far under §9.2's 30 % cap", () => {
    // The standing tension is the greater unloaded **anchor** tension, which is what §9.2's cap
    // is read against — not `H`, whose 2,79 % would flatter the line by a tenth of a point.
    const standing = Math.max(opening.vide.TA, opening.vide.TB) / opening.derived.strength;
    expect(formatQuantity("standingTension", standing * 100)).toBe("2,90 %");
  });

  test("« 817,2 daN » — T max statique at anchor A", () => {
    // 1 decimal governs: the rail's detail row and the strip's `T_A` cell sketch « 817 daN », and
    // anyone who prefers 0 decimals changes this line and § 3's row in the same commit.
    expect(formatQuantity("Tstatic", opening.verdict.ends.A.Tstatic)).toBe("817,2 daN");
  });

  test("« 928,0 daN » — the DAF envelope at anchor A, the headline T max", () => {
    expect(formatQuantity("Tdaf", opening.verdict.ends.A.Tdaf)).toBe("928,0 daN");
    // The headline is the amplified envelope, never the static one — `FS effectif` divides by it.
    expect(opening.verdict.headline.end).toBe("A");
    expect(opening.verdict.headline.Tdaf).toBe(opening.verdict.ends.A.Tdaf);
  });

  test("« 7,48 m » — flèche chargée max over the traverse", () => {
    expect(formatQuantity("loadedSag", opening.loadedSag)).toBe("7,48 m");
  });

  test("« 2,42 m » — garde min, at x 74,4 m with the rider at x 74,4 m", () => {
    // Re-recorded under ticket 37 defect 1: 2,442178 m at x 74,1170 m with the rider at x 73,8 m
    // before §11's scan evaluated the rider's own kink. The garde moved **23,06 mm down** — the
    // conservative direction —
    // and the worst point moved onto the rider's own position, which is where § 4's straight
    // two-point ground puts it once the kink is sampled.
    expect(formatQuantity("clearance", opening.clearance.hMin)).toBe("2,42 m");
    expect(formatQuantity("extremumX", opening.clearance.atX)).toBe("74,4 m");
    const riderX = opening.traverse.steps[opening.clearance.atStepIndex].xD;
    expect(formatQuantity("x_D", riderX)).toBe("74,4 m");
  });

  test("« 8,80 » / « 9,06 » — FS effectif, anchor A governing", () => {
    expect(formatQuantity("FS", opening.verdict.ends.A.FS)).toBe("8,80");
    expect(formatQuantity("FS", opening.verdict.ends.B.FS)).toBe("9,06");
    expect(opening.verdict.ends.A.FS).toBeLessThan(opening.verdict.ends.B.FS);
  });

  test("x_D 75,0 m sits inside max(1 m, 1 % de la portée) of the minimum — « Garde min. ligne », plainly", () => {
    // 0,57 m from 74,4: the clearance cell must not relabel itself to a position scope on first
    // paint. This is why the rider ships at `L/2`; since ticket 37 the two blocks read the same
    // 2,42 m there, and the window is what keeps the label stable rather than the digits.
    const window = Math.max(1, 0.01 * opening.L);
    expect(Math.abs(FIRST_RUN_SCENARIO.rider.xD - opening.clearance.atX)).toBeLessThan(window);
  });
});

/**
 * The point of driving by the tension de pose, as the user meets it: change the span from the
 * first-run Scenario — what importing a profile does — and the tension de pose stays, because it
 * is what the simplified Pages show and edit, while the flèche, a read-out, moves. A flèche driver
 * did the opposite: it held 6 m and the tension de pose jumped (263,4 → 2119 daN on the 435 m
 * trial trace) with nothing on the Page to say why.
 */
describe("a span change from the first-run Scenario — the tension de pose holds, the flèche moves", () => {
  function onSpan(L: number, h: number) {
    const geometry = { source: "manual", L, h } as const;
    return openingState({ ...firstRunDefaults(), geometry });
  }

  test.each([
    ["a longer span", 300, -36],
    ["a shorter span", 100, -12],
  ])("%s keeps 263,4 daN at anchor A", (_name, L, h) => {
    // The first-run Scenario's own figure, read off the unloaded line at the anchor of the Mise en
    // tension (A, `cp` absent) — not recomputed from anything the engine returned.
    expect(formatQuantity("T_target", onSpan(L, h).vide.TA)).toBe("263,4 daN");
  });

  test("the flèche follows the span: deeper when longer, shallower when shorter", () => {
    // Same tension and the same cable, so the sag scales with the span (`w·L²/8H`, a parabola's
    // flèche): 2× the span is about 4× the flèche. Bounds, not a re-derivation of the solver.
    const longer = onSpan(300, -36).sag;
    const shorter = onSpan(100, -12).sag;
    expect(longer).toBeGreaterThan(12);
    expect(shorter).toBeLessThan(4);
    expect(formatQuantity("sag", longer)).not.toBe("6,00 m");
  });
});

/** The three assertions no formatted string can carry. These are final today, not interim. */
describe("the opening state — the three structural assertions", () => {
  test("contact is « none » — the first screen never opens on « Câble au sol »", () => {
    expect(opening.clearance.contact).toBe("none");
  });

  test("coverage is 1 over a 260-step grid", () => {
    expect(opening.traverse.grid.length).toBe(260);
    expect(opening.traverse.coverage).toBe(1);
    expect(opening.traverse.steps.length).toBe(260);
    expect(opening.traverse.failures).toEqual([]);
  });

  test("zero steps in violation", () => {
    expect(opening.stepsInViolation).toBe(0);
  });
});
