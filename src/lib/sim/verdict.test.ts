import { describe, expect, test } from "vitest";

import type { SpanInput, SweepStep } from "./types.ts";
import type { RegimeId, VerdictInput } from "./verdict.ts";

import {
  FIRST_RUN_VERDICT,
  TAUT_LINE_WARNINGS,
  TEXTILE_VERDICT_PAIR,
  TOLERANCE,
  UPSIZING_MARGIN,
} from "./__fixtures__/theory-15.ts";
import { deriveSteel } from "./materials/steel.ts";
import { deriveTextile } from "./materials/textile.ts";
import { resolveL0, unloadedSag } from "./parameterise.ts";
import { solveSpan } from "./solve.ts";
import { sweep } from "./sweep.ts";
import {
  REGIMES,
  TERMINATIONS,
  VERDICT,
  allowableTension,
  amplifiedTension,
  evaluateVerdict,
  isFamilyAllowed,
  isRegimeAvailable,
  regimeUnavailableReason,
  scanTensionEnvelope,
} from "./verdict.ts";

/**
 * §10's verdict. **No §15 fixture covers this module** — §15 is statics, and §10 is a regulatory
 * framework no MoorPy run can cross-validate — so every number below is a `[MEASURED]` row from a
 * resolved ticket or from the spec's own measured tables, asserted at the loosest tier. Everything
 * else is an identity, which is where the synthetic traverses earn their place.
 *
 * Six things this file exists to pin down:
 *
 * - **A régime is a rule set, not a `k`.** One unchanged line reads « dans les limites » at
 *   `k = 3` and « hors limites » at `k = 10`, and WorkSafe QLD scores **two** criteria on two
 *   different bases. There is no free `k` in any input.
 * - **The verdict judges the DAF-amplified envelope**, per step and per end, and `T_vide` is one
 *   unloaded solve. The static envelope is a *detail row*, never the headline `FS effectif`
 *   divides by — the reconciliation failure § 6 corrects.
 * - **The suspended-load criterion is one cell**, `min(η_A, η_B)·MBF` over
 *   `DAF·(T_chargé − T_vide)`. The wrong readings are asserted too: bare `MBF/P` scores 77 and
 *   can never bind, which would silently delete the two-criterion régime.
 * - **A refusal survives an ample margin.** §10.2's grips prohibition and §10.4's use-class gate
 *   are not limits failures and not warnings above a pass.
 * - **`coverage < 1` suppresses the verdict**, it never qualifies it — the cells that converged
 *   stay populated while the state is `Indéterminé` and no cell is named.
 * - **A taut line raises two warnings at once and neither is a duplicate.** Assert both, so a
 *   later tidy-up cannot delete one.
 *
 * `[MEASURED]` rows assert at `TOLERANCE.measured` **floored at the half-ulp of the recorded
 * value's own last digit**. Ticket 14 recorded every force in **daN at 0 decimals**, so a force
 * asserted in newtons carries `decimals = −1` — a 5 N floor, which only ever binds on the réserve,
 * a difference of two four-figure numbers that has none of their digits.
 */

/** How far a value sits from its `[MEASURED]` row, **counted in bars**: `≤ 1` passes. */
function measuredOffBy(actual: number, expected: number, decimals: number): number {
  const bar = Math.max(TOLERANCE.measured * Math.abs(expected), 0.5 * 10 ** -decimals);
  return Math.abs(actual - expected) / bar;
}

/** A force recorded in daN at 0 decimals, asserted in newtons: `d = −1`, a 5 N floor. */
const DAN_0DP = -1;
/** A dimensionless `FS`, recorded at 2 decimals. */
const FS_2DP = 2;

/** The traverse plus the one unloaded solve `T_DAF` needs beside it. */
function traverseOf(input: SpanInput, P: number, steps: number) {
  const vide = solveSpan(input);
  if (!vide.ok) throw new Error(`expected a solve, got ${JSON.stringify(vide.error)}`);
  const swept = sweep(input, P, steps);
  return {
    steps: swept.steps,
    coverage: swept.coverage,
    grid: swept.grid,
    Tvide: { TA: vide.state.TA, TB: vide.state.TB },
    sagRatio: unloadedSag(vide.state, input) / input.L,
  };
}

/** The shipped line: 12 mm 1770 âme métallique, `L₀` 151,644 m, 120 kg rider, `DAF` 1,2. */
const F = FIRST_RUN_VERDICT.in;
const FIRST_RUN_SPAN: SpanInput = {
  L: F.L,
  h: F.h,
  L0: F.L0,
  w: F.w,
  EA: F.EA,
  loads: [],
  strength: F.MBF,
};
const firstRun = traverseOf(FIRST_RUN_SPAN, F.P, F.sweepSteps);

/** The shipped hardware: cosse à sertir at both ends, steel, permanent public use. */
function firstRunInput(regime: RegimeId, patch: Partial<VerdictInput> = {}): VerdictInput {
  return {
    steps: firstRun.steps,
    coverage: firstRun.coverage,
    Tvide: firstRun.Tvide,
    DAF: F.DAF,
    regime,
    eta: { A: F.etaA, B: F.etaB },
    strength: F.MBF,
    usage: "PERMANENTE",
    family: "steel",
    terminations: { A: "cosse-oeil-flamand", B: "cosse-oeil-flamand" },
    sagRatio: firstRun.sagRatio,
    ...patch,
  };
}

describe("the shipped line — the DAF envelope, per end", () => {
  const out = FIRST_RUN_VERDICT.out;
  const v = evaluateVerdict(firstRunInput("en15567"));

  test("`T_vide` is one unloaded solve, per end", () => {
    expect(measuredOffBy(v.ends.A.Tvide, out.TvideA, DAN_0DP)).toBeLessThanOrEqual(1);
    expect(measuredOffBy(v.ends.B.Tvide, out.TvideB, DAN_0DP)).toBeLessThanOrEqual(1);
  });

  test("the static traverse maxima are the detail rows, not the headline", () => {
    expect(measuredOffBy(v.ends.A.Tstatic, out.TstaticA, DAN_0DP)).toBeLessThanOrEqual(1);
    expect(measuredOffBy(v.ends.B.Tstatic, out.TstaticB, DAN_0DP)).toBeLessThanOrEqual(1);
  });

  test("`T_DAF = T_vide + DAF·(T_chargé − T_vide)`, per step and per end", () => {
    expect(measuredOffBy(v.ends.A.Tdaf, out.TdafA, DAN_0DP)).toBeLessThanOrEqual(1);
    expect(measuredOffBy(v.ends.B.Tdaf, out.TdafB, DAN_0DP)).toBeLessThanOrEqual(1);
    // The identity itself, not only its value: the envelope is the step maximum amplified.
    expect(v.ends.A.Tdaf).toBeCloseTo(amplifiedTension(v.ends.A.Tvide, v.ends.A.Tstatic, F.DAF), 9);
    expect(v.ends.B.Tdaf).toBeCloseTo(amplifiedTension(v.ends.B.Tvide, v.ends.B.Tstatic, F.DAF), 9);
  });

  test("« ↳ majoration dynamique » is the gap the amplification opens", () => {
    expect(measuredOffBy(v.ends.A.amplification, out.amplificationA, DAN_0DP)).toBeLessThanOrEqual(
      1,
    );
    expect(v.ends.A.amplification).toBeCloseTo(v.ends.A.Tdaf - v.ends.A.Tstatic, 9);
  });

  test("`DAF = 1` collapses the envelope onto the static maximum — the amplification is the only difference", () => {
    const plain = evaluateVerdict(firstRunInput("en15567", { DAF: 1 }));
    expect(plain.ends.A.Tdaf).toBeCloseTo(plain.ends.A.Tstatic, 9);
    expect(plain.ends.A.amplification).toBeCloseTo(0, 9);
    // And it moves the verdict's own number, which is why the headline may not be the static one.
    expect(plain.ends.A.FS).toBeGreaterThan(v.ends.A.FS);
  });

  test("the headline « T max » names the amplified envelope and the anchor it sits at", () => {
    expect(v.headline.end).toBe("A");
    expect(v.headline.Tdaf).toBe(v.ends.A.Tdaf);
    // « passager à x 74 m » — the step the envelope is reached at, not the shipped rider position.
    expect(firstRun.steps[v.headline.atStepIndex].xD).toBeGreaterThan(73.5);
    expect(firstRun.steps[v.headline.atStepIndex].xD).toBeLessThan(75);
  });

  test("`FS effectif` is per end and régime-independent — 8,80 (A) / 9,06 (B)", () => {
    expect(measuredOffBy(v.ends.A.FS, out.FSA, FS_2DP)).toBeLessThanOrEqual(1);
    expect(measuredOffBy(v.ends.B.FS, out.FSB, FS_2DP)).toBeLessThanOrEqual(1);
    for (const regime of Object.keys(REGIMES) as RegimeId[]) {
      if (regime === "secours10") continue;
      expect(evaluateVerdict(firstRunInput(regime)).ends.A.FS).toBe(v.ends.A.FS);
    }
  });

  test("the traverse solved whole, over 260 grid points", () => {
    expect(v.coverage).toBe(out.coverage);
    expect(v.stepsSolved).toBe(firstRun.grid.length);
    expect(firstRun.grid.length).toBe(260);
  });
});

describe("`T adm = η_t·MBF/k` and the réserve", () => {
  const out = FIRST_RUN_VERDICT.out;

  test("`T adm` is per end because `η_t` is — 2722 daN at both ends of the shipped line", () => {
    const cells = evaluateVerdict(firstRunInput("en15567")).cells;
    for (const cell of cells) {
      expect(cell.Tadm).not.toBeNull();
      expect(measuredOffBy(cell.Tadm ?? Number.NaN, out.TadmK3, DAN_0DP)).toBeLessThanOrEqual(1);
    }
    expect(allowableTension(F.etaA, F.MBF, 3)).toBeCloseTo(cells[0].Tadm ?? Number.NaN, 9);
  });

  test("mixed terminations split `T adm` per end — this is what per-end buys", () => {
    const mixed = evaluateVerdict(firstRunInput("en15567", { eta: { A: 0.9, B: 0.8 } }));
    const [A, B] = mixed.cells;
    expect(A.end).toBe("A");
    expect(B.end).toBe("B");
    expect(A.Tadm).toBeCloseTo(allowableTension(0.9, F.MBF, 3), 9);
    expect(B.Tadm).toBeCloseTo(allowableTension(0.8, F.MBF, 3), 9);
    expect(A.FS).toBeGreaterThan(B.FS);
  });

  test("the réserve is `T adm − T max` majoré at the least favourable end: +1794 daN at k 3", () => {
    const v = evaluateVerdict(firstRunInput("en15567"));
    expect(v.reserve?.end).toBe("A");
    expect(
      measuredOffBy(v.reserve?.value ?? Number.NaN, out.reserveK3, DAN_0DP),
    ).toBeLessThanOrEqual(1);
  });

  test("at k 10 the réserve goes negative — −111 daN — while `FS effectif` has not moved", () => {
    const v = evaluateVerdict(firstRunInput("acct10"));
    expect(
      measuredOffBy(v.reserve?.value ?? Number.NaN, out.reserveK10, DAN_0DP),
    ).toBeLessThanOrEqual(1);
    expect(v.reserve?.value).toBeLessThan(0);
    expect(measuredOffBy(v.ends.A.FS, out.FSA, FS_2DP)).toBeLessThanOrEqual(1);
    const cells = v.cells;
    expect(measuredOffBy(cells[0].Tadm ?? Number.NaN, out.TadmK10, DAN_0DP)).toBeLessThanOrEqual(1);
  });

  test("`T adm` at k 5 is 1633 daN — the ANSI/ACCT half of the ledger's contradiction", () => {
    const cells = evaluateVerdict(firstRunInput("ansi5")).cells;
    expect(measuredOffBy(cells[0].Tadm ?? Number.NaN, out.TadmK5, DAN_0DP)).toBeLessThanOrEqual(1);
  });
});

describe("a régime is a rule set, never a `k`", () => {
  test("§10.1's five entries, with their criteria and their tags", () => {
    expect(REGIMES.en15567.criteria).toEqual([
      { basis: "tension-totale", k: 3, tag: "[STD-ATTESTED]" },
    ]);
    expect(REGIMES.wsqld.criteria.map((c) => [c.basis, c.k])).toEqual([
      ["tension-totale", 3],
      ["charge-suspendue", 5],
    ]);
    expect(REGIMES.acct10.criteria[0].k).toBe(10);
    expect(REGIMES.ansi5.criteria[0].k).toBe(5);
    expect(REGIMES.secours10.criteria[0].k).toBe(10);
  });

  test("the ACCT conflict ships as two adjacent entries, never one with a toggle", () => {
    expect(REGIMES.acct10.tag).toBe("[CONVENTION]");
    expect(REGIMES.ansi5.tag).toBe("[UNVERIFIED:R1]");
    expect(REGIMES.acct10.id).not.toBe(REGIMES.ansi5.id);
  });

  test("the 2× proof test is carried as an uncomputable obligation, not dropped", () => {
    expect(evaluateVerdict(firstRunInput("wsqld")).obligations).toEqual(["essai-de-charge-2x"]);
    expect(evaluateVerdict(firstRunInput("en15567")).obligations).toEqual([]);
  });

  test("the spread is the teaching: one unchanged line, four régimes, two answers", () => {
    const states = FIRST_RUN_VERDICT.states;
    expect(evaluateVerdict(firstRunInput("en15567")).state).toBe(states.en15567);
    expect(evaluateVerdict(firstRunInput("wsqld")).state).toBe(states.worksafeQld);
    expect(evaluateVerdict(firstRunInput("ansi5")).state).toBe(states.ansiAcct5);
    expect(evaluateVerdict(firstRunInput("acct10")).state).toBe(states.acct10);
  });
});

describe("the criteria × ends grid", () => {
  const out = FIRST_RUN_VERDICT.out;
  const v = evaluateVerdict(firstRunInput("wsqld"));

  test("WorkSafe QLD lays down three cells: two ends on total tension, one on suspended load", () => {
    expect(v.cells.map((c) => [c.criterion, c.end])).toEqual([
      ["tension-totale", "A"],
      ["tension-totale", "B"],
      ["charge-suspendue", null],
    ]);
  });

  test("the suspended-load cell is one cell and has no per-end allowable", () => {
    const cell = v.cells[2];
    expect(cell.end).toBeNull();
    expect(cell.Tadm).toBeNull();
    expect(v.cells.filter((c) => c.criterion === "charge-suspendue")).toHaveLength(1);
  });

  test("its numerator is `min(η_A, η_B)·MBF` — never bare `MBF`, never a per-end pair", () => {
    const mixed = evaluateVerdict(firstRunInput("wsqld", { eta: { A: 0.9, B: 0.8 } }));
    expect(mixed.suspendedLoad?.numerator).toBeCloseTo(0.8 * F.MBF, 9);
    // Bare `MBF` would be the only place in the app crediting an unterminated rope.
    expect(mixed.suspendedLoad?.numerator).not.toBeCloseTo(F.MBF, 9);
    expect(mixed.cells.filter((c) => c.criterion === "charge-suspendue")).toHaveLength(1);
  });

  test("its denominator is `DAF·(T_chargé − T_vide)`, over the steps and both ends", () => {
    const worst = Math.max(
      ...firstRun.steps.map((s: SweepStep) =>
        Math.max(F.DAF * (s.TA - firstRun.Tvide.TA), F.DAF * (s.TB - firstRun.Tvide.TB)),
      ),
    );
    expect(v.suspendedLoad?.denominator).toBeCloseTo(worst, 9);
    expect(v.suspendedLoad?.atEnd).toBe("A");
  });

  test("it scores 12,29 on the shipped line, and total tension governs at 8,80", () => {
    expect(measuredOffBy(v.cells[2].FS, out.FSSuspendedLoad, FS_2DP)).toBeLessThanOrEqual(1);
    expect(v.governing?.criterion).toBe("tension-totale");
    expect(v.governing?.end).toBe("A");
    expect(measuredOffBy(v.governing?.FS ?? Number.NaN, out.FSA, FS_2DP)).toBeLessThanOrEqual(1);
    expect(v.state).toBe("dans-les-limites");
  });

  test("the wrong reading, asserted too: bare `MBF/P` scores 77 and can never bind", () => {
    const bare = F.MBF / F.P;
    expect(
      measuredOffBy(bare, FIRST_RUN_VERDICT.rejected.bareStrengthOverRiderLoad, 0),
    ).toBeLessThanOrEqual(1);
    expect(v.cells[2].FS).toBeLessThan(bare / 6);
    // 77 clears every divisor §10.1 states, so read that way the criterion is decorative.
    for (const regime of Object.values(REGIMES)) {
      for (const criterion of regime.criteria) {
        expect(bare).toBeGreaterThan(VERDICT.lowMarginFactor * criterion.k);
      }
    }
  });

  test("the banner names the failing cell even when another cell reads a lower `FS`", () => {
    // A slack-line shape, synthetic: the suspended load fails while total tension is comfortable.
    const steps: SweepStep[] = [{ sD: 0, xD: 0, zD: 0, H: 0, V0: 0, TA: 4000, TB: 4000, theta: 0 }];
    const v2 = evaluateVerdict({
      steps,
      coverage: 1,
      Tvide: { TA: 500, TB: 500 },
      DAF: 1.2,
      regime: "wsqld",
      eta: { A: 1, B: 1 },
      strength: 20000,
      usage: "TEMPORAIRE",
      family: "steel",
      terminations: { A: "manchon-metal-resine", B: "manchon-metal-resine" },
    });
    // Total tension: 20000/4700 = 4,26 against k 3 — a pass, and the lowest `FS` on the grid.
    // Suspended load: 20000/4200 = 4,76 against k 5 — a failure, and it is what the banner names.
    expect(v2.cells[0].state).toBe("dans-les-limites");
    expect(v2.cells[2].state).toBe("hors-limites");
    expect(v2.cells[2].FS).toBeGreaterThan(v2.cells[0].FS);
    expect(v2.governing?.criterion).toBe("charge-suspendue");
    expect(v2.state).toBe("hors-limites");
  });
});

describe("« Marge faible » — a pass with nothing left over", () => {
  const U = UPSIZING_MARGIN;

  /** The same shipped geometry and tightness target, at another diameter. */
  function steelLineAt(d: number) {
    const spec = { family: "steel", d, R0: 1770, construction: "iwrc" } as const;
    const material = deriveSteel(spec);
    const geometry = { L: U.in.L, h: U.in.h, ...material };
    const resolved = resolveL0({ mode: "sag", D_target: U.in.Dtarget }, geometry);
    if (!resolved.ok) throw new Error(`expected an L₀, got ${JSON.stringify(resolved.error)}`);
    const span: SpanInput = {
      L: U.in.L,
      h: U.in.h,
      L0: resolved.value,
      w: material.w,
      EA: material.EA,
      loads: [],
      strength: material.strength,
    };
    const t = traverseOf(span, U.in.P, U.in.sweepSteps);
    return evaluateVerdict({
      steps: t.steps,
      coverage: t.coverage,
      Tvide: t.Tvide,
      DAF: U.in.DAF,
      regime: "acct10",
      eta: { A: U.in.eta, B: U.in.eta },
      strength: material.strength,
      usage: "PERMANENTE",
      family: "steel",
      terminations: { A: "cosse-oeil-flamand", B: "cosse-oeil-flamand" },
      sagRatio: t.sagRatio,
    });
  }

  test("up-sizing one step does not buy a green: 14 mm reads 10,79 and is « Marge faible »", () => {
    const v = steelLineAt(U.in.d14);
    expect(measuredOffBy(v.ends.A.FS, U.out.FS14, FS_2DP)).toBeLessThanOrEqual(1);
    expect(v.ends.A.FS).toBeGreaterThan(U.in.k10);
    expect(v.ends.A.FS).toBeLessThan(VERDICT.lowMarginFactor * U.in.k10);
    expect(v.state).toBe(U.states.d14);
  });

  test("green everywhere needs 16 mm — 12,71 clears the 1,1·k band", () => {
    const v = steelLineAt(U.in.d16);
    expect(measuredOffBy(v.ends.A.FS, U.out.FS16, FS_2DP)).toBeLessThanOrEqual(1);
    expect(v.state).toBe(U.states.d16);
  });

  test("« Marge faible » is not green with a note — the threshold is `FS_eff < 1,1·k`", () => {
    expect(VERDICT.lowMarginFactor).toBe(1.1);
  });
});

describe("the textile pair — one invented `MBL` decides the verdict", () => {
  const T = TEXTILE_VERDICT_PAIR.in;

  function textileLineAt(MBL: number) {
    const spec = { family: "textile", ropeClass: "hmpe", MBL, mu: T.mu, k: T.k } as const;
    const material = deriveTextile(spec);
    const geometry = { L: T.L, h: T.h, ...material };
    const resolved = resolveL0({ mode: "tension", H_target: T.Htarget }, geometry);
    if (!resolved.ok) throw new Error(`expected an L₀, got ${JSON.stringify(resolved.error)}`);
    const span: SpanInput = {
      L: T.L,
      h: T.h,
      L0: resolved.value,
      w: material.w,
      EA: material.EA,
      loads: [],
      strength: MBL,
    };
    const t = traverseOf(span, T.P, 240);
    return evaluateVerdict({
      steps: t.steps,
      coverage: t.coverage,
      Tvide: t.Tvide,
      DAF: T.DAF,
      regime: "secours10",
      eta: { A: T.eta, B: T.eta },
      strength: MBL,
      usage: "TEMPORAIRE",
      family: "textile",
      terminations: { A: "epissure-longue-hmpe", B: "epissure-longue-hmpe" },
      sagRatio: t.sagRatio,
    });
  }

  test("`MBL` 100 kN reads 11,94 « dans les limites »", () => {
    const v = textileLineAt(T.MBLHigh);
    expect(measuredOffBy(v.ends.A.FS, TEXTILE_VERDICT_PAIR.out.FSHigh, FS_2DP)).toBeLessThanOrEqual(
      1,
    );
    expect(v.state).toBe(TEXTILE_VERDICT_PAIR.states.mblHigh);
  });

  test("`MBL` 60 kN reads 7,63 « hors limites » — same line, only the datasheet moved", () => {
    const v = textileLineAt(T.MBLLow);
    expect(measuredOffBy(v.ends.A.FS, TEXTILE_VERDICT_PAIR.out.FSLow, FS_2DP)).toBeLessThanOrEqual(
      1,
    );
    expect(v.state).toBe(TEXTILE_VERDICT_PAIR.states.mblLow);
    expect(v.governing?.k).toBe(TEXTILE_VERDICT_PAIR.out.k10);
  });
});

describe("the refusals — a prohibition survives an ample margin", () => {
  test("§10.2: serre-câbles étrier on a line that supports persons is refused", () => {
    const v = evaluateVerdict(
      firstRunInput("en15567", {
        eta: { A: 0.8, B: 0.9 },
        terminations: { A: "serre-cables-etrier", B: "cosse-oeil-flamand" },
      }),
    );
    expect(v.state).toBe("refuse-usage-interdit");
    expect(v.refusal).toBe("serre-cables-sur-ligne-portant-des-personnes");
    // Neither a limits failure nor a warning above a pass: every cell is comfortably inside.
    expect(v.cells.every((c) => c.state === "dans-les-limites")).toBe(true);
    expect(v.ends.A.FS).toBeGreaterThan(2 * VERDICT.lowMarginFactor * 3);
    expect(v.governing).toBeNull();
  });

  test("either end refuses it — a line fails at its weakest termination", () => {
    const atB = evaluateVerdict(
      firstRunInput("en15567", {
        terminations: { A: "cosse-oeil-flamand", B: "serre-cables-etrier" },
      }),
    );
    expect(atB.state).toBe("refuse-usage-interdit");
    expect(TERMINATIONS["serre-cables-etrier"].personProhibited).toBe(true);
    expect(TERMINATIONS["cosse-oeil-flamand"].personProhibited).toBe(false);
  });

  test("§10.4: textile in a permanent public installation is refused", () => {
    const v = evaluateVerdict(
      firstRunInput("en15567", {
        family: "textile",
        usage: "PERMANENTE",
        terminations: { A: "oeil-cousu-epissure", B: "oeil-cousu-epissure" },
      }),
    );
    expect(v.state).toBe("refuse-usage-interdit");
    expect(v.refusal).toBe("textile-en-installation-permanente");
    expect(isFamilyAllowed("textile", "PERMANENTE")).toBe(false);
    expect(isFamilyAllowed("textile", "TEMPORAIRE")).toBe(true);
    expect(isFamilyAllowed("steel", "PERMANENTE")).toBe(true);
  });

  test("the margins survive the refusal — § 6 keeps the grid on screen", () => {
    const v = evaluateVerdict(
      firstRunInput("en15567", {
        terminations: { A: "serre-cables-etrier", B: "serre-cables-etrier" },
      }),
    );
    expect(v.cells).toHaveLength(2);
    expect(v.reserve).not.toBeNull();
    expect(Number.isFinite(v.ends.A.Tdaf)).toBe(true);
  });

  test("« Secours textile 10:1 » presupposes family B under a temporary use class", () => {
    expect(isRegimeAvailable("secours10", "steel", "TEMPORAIRE")).toBe(false);
    expect(isRegimeAvailable("secours10", "textile", "PERMANENTE")).toBe(false);
    expect(isRegimeAvailable("secours10", "textile", "TEMPORAIRE")).toBe(true);
    // Everything else stays selectable: conservative is not invalid.
    for (const regime of Object.keys(REGIMES) as RegimeId[]) {
      if (regime === "secours10") continue;
      expect(isRegimeAvailable(regime, "steel", "PERMANENTE")).toBe(true);
      expect(isRegimeAvailable(regime, "textile", "TEMPORAIRE")).toBe(true);
    }
    const v = evaluateVerdict(firstRunInput("secours10"));
    expect(v.state).toBe("refuse-usage-interdit");
    expect(v.refusal).toBe("regime-indisponible-pour-cette-ligne");
  });
});

describe("§ 10.1 — an unavailable entry shows its reason", () => {
  test("a choosable régime has no reason to give, in every combination", () => {
    for (const regime of Object.keys(REGIMES) as RegimeId[]) {
      for (const family of ["steel", "textile"] as const) {
        for (const usage of ["PERMANENTE", "TEMPORAIRE"] as const) {
          // The two are one predicate seen from both sides: a reason exists exactly where the
          // entry is disabled, so the note can never contradict the `<option>` beside it.
          expect({ regime, family, usage, reason: null }).toStrictEqual({
            regime,
            family,
            usage,
            reason: isRegimeAvailable(regime, family, usage)
              ? regimeUnavailableReason(regime, family, usage)
              : null,
          });
        }
      }
    }
  });

  test("the family clause names the requirement and what is active instead", () => {
    expect(regimeUnavailableReason("secours10", "steel", "TEMPORAIRE")).toBe(
      "Indisponible — ce régime suppose une corde textile ; la famille active est l'acier.",
    );
  });

  test("the usage clause names the use class that blocks it", () => {
    expect(regimeUnavailableReason("secours10", "textile", "PERMANENTE")).toBe(
      "Indisponible — ce régime ne couvre pas un usage permanent.",
    );
  });

  test("both clauses failing is **one** sentence, not two notes", () => {
    // § 10.1 asks for one reason per row. Steel under `PERMANENTE` fails the family *and* the
    // usage requirement, and the row still gets a single sentence.
    expect(regimeUnavailableReason("secours10", "steel", "PERMANENTE")).toBe(
      "Indisponible — ce régime suppose une corde textile et un usage temporaire.",
    );
  });
});

describe("`Indéterminé` suppresses the verdict rather than qualifying it", () => {
  const partial = firstRun.steps.slice(0, firstRun.steps.length - 1);
  const v = evaluateVerdict(
    firstRunInput("en15567", {
      steps: partial,
      coverage: partial.length / firstRun.grid.length,
    }),
  );

  test("a single lost step is enough — 259 of 260", () => {
    expect(v.stepsSolved).toBe(259);
    expect(v.coverage).toBeCloseTo(259 / 260, 12);
    expect(v.state).toBe("indetermine");
  });

  test("it is a suppression, not a degradation: every cell that converged still passes", () => {
    expect(v.cells).toHaveLength(2);
    expect(v.cells.every((c) => c.state === "dans-les-limites")).toBe(true);
    // The state does **not** follow the cells — a verdict on the solved fraction is biased
    // optimistic by construction, because the steps that failed are the ill-conditioned ones.
    expect(v.state).not.toBe("dans-les-limites");
    expect(v.governing).toBeNull();
  });

  test("a refusal outranks it — a prohibition does not become unknown on a partial sweep", () => {
    const refused = evaluateVerdict(
      firstRunInput("en15567", {
        steps: partial,
        coverage: partial.length / firstRun.grid.length,
        terminations: { A: "serre-cables-etrier", B: "cosse-oeil-flamand" },
      }),
    );
    expect(refused.state).toBe("refuse-usage-interdit");
  });

  test("a traverse that lost every step has no envelope — `NaN` and step index −1", () => {
    const none = evaluateVerdict(firstRunInput("en15567", { steps: [], coverage: 0 }));
    expect(none.state).toBe("indetermine");
    expect(none.cells).toEqual([]);
    expect(none.reserve).toBeNull();
    expect(Number.isNaN(none.ends.A.Tdaf)).toBe(true);
    expect(none.ends.A.atStepIndex).toBe(-1);
  });
});

describe("the warning tier", () => {
  /** A taut line at §5.4's chord bound, where flèche/portée is at its attainable minimum. */
  function tautLine(L: number, L0: number) {
    const span: SpanInput = {
      L,
      h: 0,
      L0,
      w: TAUT_LINE_WARNINGS.in.w,
      EA: TAUT_LINE_WARNINGS.in.EA,
      loads: [],
      strength: TAUT_LINE_WARNINGS.in.MBF,
    };
    const t = traverseOf(span, TAUT_LINE_WARNINGS.in.P, 240);
    return {
      sagRatio: t.sagRatio,
      verdict: evaluateVerdict({
        steps: t.steps,
        coverage: t.coverage,
        Tvide: t.Tvide,
        DAF: TAUT_LINE_WARNINGS.in.DAF,
        regime: "en15567",
        eta: { A: 0.9, B: 0.9 },
        strength: TAUT_LINE_WARNINGS.in.MBF,
        usage: "PERMANENTE",
        family: "steel",
        terminations: { A: "cosse-oeil-flamand", B: "cosse-oeil-flamand" },
        sagRatio: t.sagRatio,
      }),
    };
  }

  test("at 200 m the minimum attainable flèche/portée is 0,15 %", () => {
    const { sagRatio } = tautLine(TAUT_LINE_WARNINGS.in.LShort, TAUT_LINE_WARNINGS.in.L0Short);
    expect(measuredOffBy(sagRatio, TAUT_LINE_WARNINGS.out.sagRatioShort, 4)).toBeLessThanOrEqual(1);
    expect(sagRatio).toBeLessThan(TAUT_LINE_WARNINGS.out.threshold);
  });

  test("at 1000 m it is 0,72 % — still under 3 %, so the whole feasible taut band warns", () => {
    const { sagRatio } = tautLine(TAUT_LINE_WARNINGS.in.LLong, TAUT_LINE_WARNINGS.in.L0Long);
    expect(measuredOffBy(sagRatio, TAUT_LINE_WARNINGS.out.sagRatioLong, 4)).toBeLessThanOrEqual(1);
    expect(sagRatio).toBeLessThan(TAUT_LINE_WARNINGS.out.threshold);
  });

  test("both warnings fire together, and neither is a duplicate of the other", () => {
    for (const [L, L0] of [
      [TAUT_LINE_WARNINGS.in.LShort, TAUT_LINE_WARNINGS.in.L0Short],
      [TAUT_LINE_WARNINGS.in.LLong, TAUT_LINE_WARNINGS.in.L0Long],
    ]) {
      const { verdict } = tautLine(L, L0);
      // One qualifies `flèche / portée`; the other qualifies the `DAF` figure, whose 1,2 ceiling
      // was measured on a controlled step-off on a taut line. Removing either loses a statement.
      expect(verdict.warnings).toContain("fleche-sur-portee-sous-3-pct");
      expect(verdict.warnings).toContain("daf-hors-de-son-regime-de-mesure");
      expect(verdict.warnings).toHaveLength(TAUT_LINE_WARNINGS.out.warningCount);
    }
  });

  test("the shipped line, at 4 % flèche, raises neither", () => {
    const v = evaluateVerdict(firstRunInput("en15567"));
    expect(firstRun.sagRatio).toBeGreaterThan(VERDICT.sagRatioWarning);
    expect(v.warnings).toEqual([]);
  });

  test("§9.2's creep cap is textile-only and is about service life, not strength", () => {
    const steps: SweepStep[] = [{ sD: 0, xD: 0, zD: 0, H: 0, V0: 0, TA: 4000, TB: 4000, theta: 0 }];
    const base: VerdictInput = {
      steps,
      coverage: 1,
      Tvide: { TA: 3100, TB: 3000 },
      DAF: 1.2,
      regime: "secours10",
      eta: { A: 0.9, B: 0.9 },
      strength: 10000,
      usage: "TEMPORAIRE",
      family: "textile",
      terminations: { A: "epissure-longue-hmpe", B: "epissure-longue-hmpe" },
    };
    expect(evaluateVerdict(base).warnings).toEqual(["tension-permanente-sur-30-pct-mbl"]);
    // Under the cap it is silent…
    expect(evaluateVerdict({ ...base, Tvide: { TA: 2900, TB: 2900 } }).warnings).toEqual([]);
    // …and on steel it never fires: §9.2's 30 % is a creep bound on family B.
    const steel = evaluateVerdict({
      ...base,
      family: "steel",
      regime: "en15567",
      terminations: { A: "cosse-oeil-flamand", B: "cosse-oeil-flamand" },
    });
    expect(steel.warnings).toEqual([]);
  });

  test("an omitted `sagRatio` fires no sag warning — the two are the same condition", () => {
    const v = evaluateVerdict(firstRunInput("en15567", { sagRatio: undefined }));
    expect(v.warnings).toEqual([]);
    expect(VERDICT.sagRatioWarning).toBe(0.03);
  });
});

describe("caller bugs are refused, never silently scored", () => {
  test.each([
    ["DAF", { DAF: 0 }],
    ["strength", { strength: -1 }],
    ["eta.A", { eta: { A: 0, B: 0.9 } }],
    ["coverage", { coverage: 1.5 }],
  ] as [string, Partial<VerdictInput>][])("%s outside its domain throws", (_name, patch) => {
    expect(() => evaluateVerdict(firstRunInput("en15567", patch))).toThrow(RangeError);
  });
});

describe("§10.2 and §10.3's termination table", () => {
  test("every range takes its conservative end, and knots on HMPE have no `η` to credit", () => {
    expect(TERMINATIONS["cosse-oeil-flamand"].eta).toBe(0.9);
    expect(TERMINATIONS["noeud-de-huit"].eta).toBe(0.6);
    expect(TERMINATIONS["noeud-de-chaise"].eta).toBe(0.55);
    expect(TERMINATIONS["noeud-de-huit"].knot).toBe(true);
    expect(TERMINATIONS["epissure-longue-hmpe"].knot).toBe(false);
  });

  test("§ 6's tags govern: only the wedge socket, the grips, textile and the attelage carry « non confirmé »", () => {
    const unconfirmed = new Set(["[CONVENTION]", "[UNVERIFIED:R1]", "[PAYWALLED]"]);
    for (const termination of Object.values(TERMINATIONS)) {
      const chip = unconfirmed.has(termination.tag) || termination.family === "textile";
      const expected =
        termination.family === "textile" ||
        termination.id === "manchon-a-coin" ||
        termination.id === "serre-cables-etrier" ||
        // Decision of 2026-09-23, not a §10.2/§10.3 value — hence `[CONVENTION]`.
        termination.id === "attelage-sans-tension";
      expect(chip).toBe(expected);
    }
  });

  test("« Attelage sans tension » — η 1, offered to both families, never refused (2026-09-23)", () => {
    const attelage = TERMINATIONS["attelage-sans-tension"];
    expect(attelage.eta).toBe(1);
    expect(attelage.family).toBe("both");
    expect(attelage.personProhibited).toBe(false);
    expect(attelage.knot).toBe(false);
  });
});

describe("the worst-tension-per-end scan, as one owner (ticket 38)", () => {
  /** A traverse stated by its two end tensions alone — everything else the scan never reads. */
  function stepsOf(...ends: [number, number][]): SweepStep[] {
    return ends.map(([TA, TB]) => ({ sD: 0, xD: 0, zD: 0, H: 0, V0: 0, TA, TB, theta: 0 }));
  }

  test("the scan is the traverse's maximum, checked against a second way of taking it", () => {
    // Not `scan` against `evaluateVerdict` — since ticket 38 those are one function calling
    // another, and asserting that pair would assert the implementation back to itself. `Math.max`
    // over the array is an independent route to the same two numbers, and `indexOf` an independent
    // route to the step they sit at.
    const scan = scanTensionEnvelope(firstRun.steps, firstRun.Tvide, F.DAF);
    const TA = firstRun.steps.map((step) => step.TA);
    const TB = firstRun.steps.map((step) => step.TB);
    expect(scan.A.Tstatic).toBe(Math.max(...TA));
    expect(scan.B.Tstatic).toBe(Math.max(...TB));
    expect(scan.A.atStepIndex).toBe(TA.indexOf(scan.A.Tstatic));
    expect(scan.B.atStepIndex).toBe(TB.indexOf(scan.B.Tstatic));
    // And that the verdict reports it rather than re-deriving or post-processing it.
    const v = evaluateVerdict(firstRunInput("en15567"));
    expect(v.ends.A.Tstatic).toBe(scan.A.Tstatic);
    expect(v.ends.B.Tstatic).toBe(scan.B.Tstatic);
  });

  test("the suspended maximum runs over the steps **and** over the two ends", () => {
    // A's static envelope is at step 0, B's at step 2, and the greatest amplified *rise* over
    // `T_vide` is B's at step 2 — three different answers one pass has to keep apart.
    const scan = scanTensionEnvelope(
      stepsOf([5000, 4000], [4800, 4500], [4700, 5200]),
      { TA: 4600, TB: 4000 },
      1.2,
    );
    expect(scan.A).toEqual({ Tstatic: 5000, atStepIndex: 0 });
    expect(scan.B).toEqual({ Tstatic: 5200, atStepIndex: 2 });
    expect(scan.suspended).toEqual({ value: 1.2 * 1200, atStepIndex: 2, end: "B" });
  });

  test("`DAF` reaches the suspended denominator and nothing else", () => {
    const steps = stepsOf([5000, 4000], [4800, 4500]);
    const Tvide = { TA: 4600, TB: 4000 };
    const one = scanTensionEnvelope(steps, Tvide, 1);
    const amplified = scanTensionEnvelope(steps, Tvide, 1.2);
    expect(amplified.A).toEqual(one.A);
    expect(amplified.B).toEqual(one.B);
    expect(amplified.suspended.value).toBeCloseTo(1.2 * one.suspended.value, 9);
  });

  test("an empty traverse has no envelope — the reducer's identity, and −1", () => {
    // `evaluateVerdict` turns this into the `NaN` its printed rows carry; the Rail reads it as it
    // is. The scan itself refuses to invent a figure either way.
    const scan = scanTensionEnvelope([], { TA: 4600, TB: 4000 }, 1.2);
    expect(scan.A).toEqual({ Tstatic: Number.NEGATIVE_INFINITY, atStepIndex: -1 });
    expect(scan.B).toEqual({ Tstatic: Number.NEGATIVE_INFINITY, atStepIndex: -1 });
    expect(scan.suspended).toEqual({
      value: Number.NEGATIVE_INFINITY,
      atStepIndex: -1,
      end: "A",
    });
  });

  test("the **first** step reaching a tied maximum is the one named, ends included", () => {
    // Both comparisons are strict, at both ends and on the suspended denominator: a tie holds the
    // earlier step, and a tie between the two ends holds `A`. Which end a figure is attributed to
    // is printed beside it, so it may not depend on the order the loop happens to test in.
    const scan = scanTensionEnvelope(stepsOf([5000, 4000], [5000, 4000]), { TA: 0, TB: 1000 }, 1.2);
    expect(scan.A.atStepIndex).toBe(0);
    expect(scan.B.atStepIndex).toBe(0);
    expect(scan.suspended).toEqual({ value: 1.2 * 5000, atStepIndex: 0, end: "A" });
  });

  test("a refused `DAF ≤ 0` still gives the Rail its static envelope", () => {
    // `evaluateVerdict` refuses a non-positive `DAF` outright, so this path is the Rail's alone:
    // § 9 keeps « T max statique » and the garde on screen while the amplified rows go. The static
    // maxima owe `DAF` nothing and must not move with it.
    const steps = stepsOf([5000, 4000], [4800, 4500]);
    const refused = scanTensionEnvelope(steps, { TA: 4600, TB: 4000 }, -1);
    expect(refused.A).toEqual({ Tstatic: 5000, atStepIndex: 0 });
    expect(refused.B).toEqual({ Tstatic: 4500, atStepIndex: 1 });
    // The denominator inverts with the sign — it can never rise above zero, which is why § 9
    // drops it rather than printing a « charge suspendue » that reads better the worse the line is.
    expect(refused.suspended.value).toBeLessThanOrEqual(0);
    expect(() => evaluateVerdict(firstRunInput("en15567", { DAF: -1 }))).toThrow(RangeError);
  });
});
