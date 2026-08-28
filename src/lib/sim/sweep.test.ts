import { beforeEach, describe, expect, test, vi } from "vitest";

import type { SpanInput } from "./types.ts";

import { CHORD_BOUND, TOLERANCE, Z4, Z5 } from "./__fixtures__/theory-15.ts";
import { solveAtMaterialPosition } from "./loads.ts";
import { SWEEP, stretchedArcPosition, sweep, sweepGrid, sweepStep } from "./sweep.ts";

/**
 * §6.2's rolling sweep against `docs/simulation-theory.md` §15 — « voir § 11 — le plan de test »
 * for which row lands here: `Z5`, the one case that makes `σ_D ≠ s_D ≠ x_D` concrete, plus the two
 * grid invariants § 11 states exactly (`sweepGrid(L₀, 240).length === 260`, and the grid a **pure
 * function of `(L₀, n)`**).
 *
 * Three things this file exists to pin down:
 *
 * - **260 is the coverage denominator, not 240.** `SWEEP_STEPS = 240` names the *uniform* steps
 *   only; `sweepGrid` appends 10 geometric tail steps per end. Ticket 08's « 240 / 240 » copy was
 *   wrong, and a fully solved sweep printed against 240 would read « 260 / 240 ».
 * - **`σ_D` is new work, not a port** — the prototype's `check.ts` never asserted it. 60,20 against
 *   `s_D` 60,15 against `x_D` 59,96 is why `s_D` never appears in the UI: three coordinates of the
 *   same trolley, differing by ≈0,3 %.
 * - **The warm start is an accelerator, never an answer.** §6.2 marches with the previous step's
 *   `(H, V₀)`, so a marched step is asserted against the same step solved cold: if the two ever
 *   disagreed, the traverse would depend on the direction it was walked.
 *
 * `coverage < 1` is **injected, never hunted** — all 3 792 measured sweeps returned coverage 1,000
 * — so the partial-sweep case mocks `solveSpan` at one step index rather than looking for an input
 * that fails.
 */

/** Flips `solveSpan` into a refusal on one call, for the partial-sweep case. Hoisted with the mock. */
const injected = vi.hoisted(() => ({ failAtCall: -1, calls: 0 }));

vi.mock("./solve.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./solve.ts")>();
  return {
    ...actual,
    solveSpan: (...args: Parameters<typeof actual.solveSpan>) => {
      const call = injected.calls++;
      if (call === injected.failAtCall) {
        return {
          ok: false as const,
          error: { kind: "no-convergence" as const, attempts: 5, residual: 0.5 },
        };
      }
      return actual.solveSpan(...args);
    },
  };
});

beforeEach(() => {
  injected.failAtCall = -1;
  injected.calls = 0;
});

/** Relative disagreement, read against the tier the row's provenance fixes. */
function relativeError(actual: number, expected: number): number {
  return Math.abs(actual - expected) / Math.abs(expected);
}

/** A `SpanInput` from a §15 row's stated inputs — the fixtures stay engine-type-free. */
function spanOf(p: {
  L: number;
  h: number;
  L0: number;
  w: number;
  EA: number;
  strength?: number;
}): SpanInput {
  return { L: p.L, h: p.h, L0: p.L0, w: p.w, EA: p.EA, loads: [], strength: p.strength };
}

/** `Z5`'s line is `Z4`'s, without the rider — the trolley is what each case below places. */
const Z5_LINE = spanOf(Z5.in);

describe("Z5 — one rolling-sweep step at a material coordinate", () => {
  const result = sweepStep(Z5_LINE, Z5.in.P, Z5.in.sD);
  if (!result.ok) throw new Error(`expected a solve, got ${JSON.stringify(result.error)}`);
  const { step, state } = result;

  test("H = 7765.67 N and V₀ = −973.369 N", () => {
    expect(relativeError(step.H, Z5.out.H)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(step.V0, Z5.out.V0)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("the node sits at x_D = 59.9578 m, z_D = −5.19064 m", () => {
    expect(relativeError(step.xD, Z5.out.xD)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(step.zD, Z5.out.zD)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("σ_D = 60.1969 m — the stretched arc position check.ts never asserted", () => {
    expect(relativeError(stretchedArcPosition(state, Z5.in.sD), Z5.out.sigmaD)).toBeLessThan(
      TOLERANCE.solvedScalar,
    );
  });

  test("σ_D ≠ s_D ≠ x_D, which is why s_D never appears in the UI", () => {
    // The three coordinates of one trolley: 60,20 stretched arc, 60,15 material, 59,96 horizontal.
    // The spread is ≈0,3 % of span — small enough that a UI quoting the wrong one would look
    // right, large enough to be a different place on the cable.
    const sigmaD = stretchedArcPosition(state, Z5.in.sD);
    expect(sigmaD).toBeGreaterThan(Z5.in.sD);
    expect(step.xD).toBeLessThan(Z5.in.sD);
    expect(relativeError(step.xD, sigmaD)).toBeGreaterThan(2e-3);
  });

  test("the stretch is the cable's own elongation, not a fudge: σ_D − s_D = ∫T ds / EA", () => {
    // Bracketed by the two ends' tension: the exact integral cannot be outside `T_min·s/EA` and
    // `T_max·s/EA`, so a σ that drifted onto the wrong segment or lost the `1/EA` shows here.
    const stretch = stretchedArcPosition(state, Z5.in.sD) - Z5.in.sD;
    expect(stretch).toBeGreaterThan((state.H * Z5.in.sD) / state.EA);
    expect(stretch).toBeLessThan((state.Tmax * Z5.in.sD) / state.EA);
  });

  test("σ(0) = 0 and σ is strictly increasing — zero-slip rolling", () => {
    expect(stretchedArcPosition(state, 0)).toBe(0);
    let previous = 0;
    for (let i = 1; i <= 20; i++) {
      const sigma = stretchedArcPosition(state, (state.L0 * i) / 20);
      expect(sigma).toBeGreaterThan(previous);
      previous = sigma;
    }
    // Past the rider's node the cable below carries `P` too, so the whole line is longer than
    // `L₀` by more than the unloaded stretch — but never by a factor, only by millimetres.
    expect(previous).toBeGreaterThan(state.L0);
    expect(previous).toBeLessThan(state.L0 * 1.01);
  });

  test("θ is the below-side slope at the node, and it descends on the far half", () => {
    // `Z5`'s trolley sits past mid-span on a level span, so the cable it is rolling down is
    // rising — `V < 0` below the node until the low point, and `θ = atan(V/H)`.
    expect(step.theta).toBeCloseTo(Math.atan2(state.V0 + state.w * Z5.in.sD, state.H), 12);
    expect(step.theta).toBeLessThan(0);
  });
});

describe("the grid — § 11's two exact invariants", () => {
  test("sweepGrid(L₀, 240).length === 260", () => {
    expect(sweepGrid(Z5.in.L0, 240)).toHaveLength(260);
  });

  test("260 is also the default, because SWEEP_STEPS names the uniform steps only", () => {
    expect(SWEEP.steps).toBe(240);
    expect(SWEEP.tailSteps).toBe(10);
    expect(sweepGrid(Z5.in.L0)).toHaveLength(SWEEP.steps + 2 * SWEEP.tailSteps);
    expect(sweepGrid(Z5.in.L0)).toHaveLength(260);
  });

  test("the grid is a pure function of (L₀, n) — same arguments, identical Float64Array", () => {
    expect(sweepGrid(Z5.in.L0, 240)).toEqual(sweepGrid(Z5.in.L0, 240));
    expect(sweepGrid(151.64, 240)).toEqual(sweepGrid(151.64, 240));
    // Different `L₀`, and the grid scales with it: it is a shape in `s/L₀`, nothing else.
    const unit = sweepGrid(1, 240);
    const scaled = sweepGrid(151.64, 240);
    for (let i = 0; i < unit.length; i++) {
      expect(relativeError(scaled[i], unit[i] * 151.64)).toBeLessThan(1e-12);
    }
  });

  test("it depends on nothing else — not on the line, not on the results", () => {
    // A step array that depends on the solve is one you cannot fixture. `sweep` publishes the
    // same grid `sweepGrid` does, and a sweep with injected failures publishes it unchanged.
    const line = spanOf(Z5.in);
    const clean = sweep(line, Z5.in.P);
    injected.failAtCall = 137;
    injected.calls = 0;
    const partial = sweep(line, Z5.in.P);
    expect(clean.grid).toEqual(sweepGrid(line.L0, SWEEP.steps));
    expect(partial.grid).toEqual(clean.grid);
  });

  test("endpoints are excluded — the rider on the platform is not a slider stop", () => {
    const grid = sweepGrid(Z5.in.L0);
    for (const sD of grid) {
      expect(sD).toBeGreaterThan(0);
      expect(sD).toBeLessThan(Z5.in.L0);
    }
  });

  test("it is sorted and strictly increasing", () => {
    const grid = sweepGrid(Z5.in.L0);
    for (let i = 1; i < grid.length; i++) expect(grid[i]).toBeGreaterThan(grid[i - 1]);
  });

  test("240 uniform inner steps at i·L₀/241, and 10 geometric tail steps per end", () => {
    const L0 = Z5.in.L0;
    const grid = [...sweepGrid(L0)];
    // The inner steps: `i·L₀/(n+1)`, `i = 1…240`. Each one is present to the bit.
    for (let i = 1; i <= 240; i++) expect(grid).toContain((L0 * i) / 241);
    // The tails: `0,02·L₀·2^−(10−i)`, `i = 1…10`, densest at the anchor, mirrored at the far end.
    for (let i = 1; i <= 10; i++) {
      const offset = 0.02 * L0 * 2 ** -(10 - i);
      expect(grid).toContain(offset);
      expect(grid).toContain(L0 - offset);
    }
    // …and nothing else: 240 + 20 values, all accounted for.
    expect(grid).toHaveLength(260);
  });

  test("the tails live inside the outer 2 % and get denser towards the anchor", () => {
    const L0 = Z5.in.L0;
    const grid = sweepGrid(L0);
    const head = [...grid].filter((s) => s <= 0.02 * L0 + Number.EPSILON);
    // Ten tail steps plus whichever uniform steps also fall inside the first 2 % — the tails
    // refine that band, they do not replace it.
    expect(head.length).toBeGreaterThanOrEqual(10);
    const tail = Array.from({ length: 10 }, (_, i) => 0.02 * L0 * 2 ** -(9 - i));
    for (const step of tail) expect(grid).toContain(step);
    // Geometric: each gap is twice the one before it, so the steps crowd the anchor and thin out
    // towards the band's edge — which is where `θ` and `T_A` change fastest (§6.2's « refine near
    // ends »), and the reason the tails exist at all.
    const gaps = tail.slice(1).map((value, i) => value - tail[i]);
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i]).toBeCloseTo(2 * gaps[i - 1], 12);
      expect(gaps[i]).toBeGreaterThan(gaps[i - 1]);
    }
    expect(tail[tail.length - 1]).toBeCloseTo(0.02 * L0, 12);
  });

  test("n and tailSteps are a caller's contract, so a bad one throws rather than returning NaN", () => {
    // The same call-bug/physics-failure split `sampleCable` makes: a `SolveError` is a statement
    // about a line, and « n = 2,5 » is not one.
    expect(() => sweepGrid(100, 0)).toThrow(RangeError);
    expect(() => sweepGrid(100, 2.5)).toThrow(RangeError);
    expect(() => sweepGrid(100, -1)).toThrow(RangeError);
    expect(() => sweepGrid(100, Number.NaN)).toThrow(RangeError);
    expect(() => sweepGrid(100, 240, -1)).toThrow(RangeError);
    expect(() => sweepGrid(100, 240, 1.5)).toThrow(RangeError);
    // Zero tails is legal — it is the uniform grid, and it is what a bench cell at 100 steps uses.
    expect(sweepGrid(100, 100, 0)).toHaveLength(100);
  });
});

describe("the march — §6.2 step 2 and 3", () => {
  const line = spanOf(Z5.in);
  const result = sweep(line, Z5.in.P);

  test("coverage is 1,000 over 260 steps on a line the app admits", () => {
    expect(result.grid).toHaveLength(260);
    expect(result.steps).toHaveLength(260);
    expect(result.failures).toEqual([]);
    expect(result.coverage).toBe(1);
  });

  test("coverage divides by grid.length, never by the number of solved steps", () => {
    expect(result.coverage).toBe(result.steps.length / result.grid.length);
  });

  test("every step records §6.2's own seven quantities at its own s_D", () => {
    result.steps.forEach((step, i) => {
      expect(step.sD).toBe(result.grid[i]);
      for (const value of [step.xD, step.zD, step.H, step.V0, step.TA, step.TB, step.theta]) {
        expect(Number.isFinite(value)).toBe(true);
      }
      expect(step.H).toBeGreaterThan(0);
    });
  });

  test("the trolley marches right: x_D is strictly increasing along the grid", () => {
    for (let i = 1; i < result.steps.length; i++) {
      expect(result.steps[i].xD).toBeGreaterThan(result.steps[i - 1].xD);
    }
    expect(result.steps[0].xD).toBeGreaterThan(0);
    expect(result.steps[result.steps.length - 1].xD).toBeLessThan(line.L);
  });

  test("the warm start is an accelerator, not an answer — marched equals cold, everywhere", () => {
    // §6.2 marches with the previous step's `(H, V₀)` and Newton then converges in 1–3 iterations.
    // If a marched step ever differed from the same step solved from §5.2's seeds, the traverse
    // would depend on the direction it was walked, which is not a physical property of a cable.
    for (const i of [0, 9, 10, 65, 130, 200, 259]) {
      const step = result.steps[i];
      const cold = solveAtMaterialPosition(line, Z5.in.P, step.sD);
      if (!cold.ok) throw new Error("expected a solve");
      expect(relativeError(step.H, cold.state.H)).toBeLessThan(TOLERANCE.solvedScalar);
      expect(relativeError(step.V0, cold.state.V0)).toBeLessThan(TOLERANCE.solvedScalar);
      expect(relativeError(step.TA, cold.state.TA)).toBeLessThan(TOLERANCE.solvedScalar);
      expect(relativeError(step.TB, cold.state.TB)).toBeLessThan(TOLERANCE.solvedScalar);
    }
  });

  test("θ rises monotonically along the traverse — the slope profile §12 will read", () => {
    // §6.2 step 4 lists « slope profile for dynamics » among the sweep's outputs, and this is its
    // shape: `V(s_D⁻)` grows with `s_D` while `H` falls away from mid-span, so the below-side
    // slope at the trolley increases all the way down the line. Asserted rather than the naive
    // « always descending », which is **false**: past the loaded low point the cable ahead of the
    // trolley rises, and 16 of the 260 steps on this line have `θ > 0`.
    const inclined = sweep(spanOf({ L: 120, h: -15, L0: 122, w: 5, EA: 1e7 }), 1177);
    expect(inclined.coverage).toBe(1);
    for (let i = 1; i < inclined.steps.length; i++) {
      expect(inclined.steps[i].theta).toBeGreaterThan(inclined.steps[i - 1].theta);
    }
    expect(inclined.steps[0].theta).toBeLessThan(0);
    // A line dropping 15 m over 120 descends under the trolley for most of the traverse.
    const descending = inclined.steps.filter((step) => step.theta < 0);
    expect(descending.length).toBeGreaterThan(inclined.steps.length / 2);
  });

  test("the traverse is a traverse, not 260 copies of one solve", () => {
    // `H` peaks with the rider near mid-span — the longest lever on the sag — and bottoms with it
    // near an anchor. A sweep that ignored `s_D` would return one number 260 times.
    const Hs = result.steps.map((step) => step.H);
    expect(Math.max(...Hs) - Math.min(...Hs)).toBeGreaterThan(100);
    const peak = Hs.indexOf(Math.max(...Hs));
    expect(peak).toBeGreaterThan(0.4 * Hs.length);
    expect(peak).toBeLessThan(0.6 * Hs.length);
    const trough = Hs.indexOf(Math.min(...Hs));
    expect(Math.min(trough, Hs.length - 1 - trough)).toBeLessThan(0.05 * Hs.length);
  });

  test("it is pure: same input twice, same numbers, and the caller's input untouched", () => {
    const input = spanOf(Z5.in);
    const before = structuredClone(input);
    expect(sweep(input, Z5.in.P)).toEqual(sweep(input, Z5.in.P));
    expect(input).toEqual(before);
  });

  test("the rider is never pushed into the caller's loads array", () => {
    const loads: SpanInput["loads"] = [];
    sweep({ ...line, loads }, Z5.in.P);
    expect(loads).toEqual([]);
  });

  test("a sweep of an already-loaded span is a caller bug, and says so", () => {
    // `sweep(input, riderP)` places **the** rider; a span arriving with one already on it would
    // silently model two, and the coverage denominator would be measuring a different line.
    expect(() => sweep({ ...line, loads: [{ P: 800, s: 20 }] }, Z5.in.P)).toThrow(RangeError);
  });

  test("n is honoured, and the denominator moves with it", () => {
    const coarse = sweep(line, Z5.in.P, 100);
    expect(coarse.grid).toHaveLength(120);
    expect(coarse.steps).toHaveLength(120);
    expect(coarse.coverage).toBe(1);
  });
});

describe("a partial sweep — injected, because 3 792 measured sweeps all returned coverage 1,000", () => {
  const line = spanOf(Z5.in);

  test("one lost step leaves the other 259, and coverage says so", () => {
    injected.failAtCall = 137;
    injected.calls = 0;
    const result = sweep(line, Z5.in.P);
    expect(result.grid).toHaveLength(260);
    expect(result.steps).toHaveLength(259);
    expect(result.coverage).toBe(259 / 260);
    expect(result.coverage).toBeLessThan(1);
  });

  test("the failure names its grid index, its s_D and the error it got", () => {
    injected.failAtCall = 137;
    injected.calls = 0;
    const result = sweep(line, Z5.in.P);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].index).toBe(137);
    expect(result.failures[0].sD).toBe(result.grid[137]);
    expect(result.failures[0].error).toEqual({
      kind: "no-convergence",
      attempts: 5,
      residual: 0.5,
    });
  });

  test("the surviving steps stay in grid order, with the lost index simply absent", () => {
    injected.failAtCall = 137;
    injected.calls = 0;
    const result = sweep(line, Z5.in.P);
    const swept = result.steps.map((step) => step.sD);
    expect(swept).not.toContain(result.grid[137]);
    for (let i = 1; i < swept.length; i++) expect(swept[i]).toBeGreaterThan(swept[i - 1]);
    // The step after the hole is solved cold, so it is not the failed iterate carried forward.
    const after = result.steps.find((step) => step.sD === result.grid[138]);
    expect(after).toBeDefined();
  });

  test("failure is a value: a lost step never throws out of the march", () => {
    injected.failAtCall = 0;
    injected.calls = 0;
    expect(() => sweep(line, Z5.in.P)).not.toThrow();
  });
});

describe("a line the §5.4 pre-check refuses sweeps to coverage 0, it does not throw", () => {
  test("260 failures, all of them « Tension impossible », and no verdict can be built on them", () => {
    const { w, EA, MBF } = CHORD_BOUND.in;
    const result = sweep(spanOf({ L: 200, h: 0, L0: 190, w, EA, strength: MBF }), 1177);
    expect(result.grid).toHaveLength(260);
    expect(result.steps).toEqual([]);
    expect(result.failures).toHaveLength(260);
    expect(result.coverage).toBe(0);
    for (const failure of result.failures) {
      expect(failure.error.kind).toBe("invalid-input");
      if (failure.error.kind !== "invalid-input") throw new Error("expected a refusal");
      expect(failure.error.field).toBe("L0");
      expect(relativeError(failure.error.bound, CHORD_BOUND.out.floor200)).toBeLessThan(
        TOLERANCE.measured,
      );
    }
  });

  test("the breaking-load bound reaches the sweep, so `strength` is not dropped on the way in", () => {
    // Same geometry, `strength` omitted: the §5.4 pre-check does not run and the line solves.
    const { w, EA } = CHORD_BOUND.in;
    const result = sweep(spanOf({ L: 200, h: 0, L0: 190, w, EA }), 1177);
    expect(result.coverage).toBe(1);
  });
});

describe("the sweep and the point load agree — one physics, reached two ways", () => {
  test("a sweep step at Z4's material coordinate is Z4's solve", () => {
    const step = sweepStep(spanOf(Z4.in), Z4.in.P, Z4.out.sP);
    if (!step.ok) throw new Error("expected a solve");
    expect(relativeError(step.step.H, Z4.out.H)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(step.step.V0, Z4.out.V0)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(step.step.zD, Z4.out.zD)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(step.step.TA, Z4.out.TA)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("θ at a trolley is one-sided: at Z4's mid-span node the two sides are ±the same slope", () => {
    // The trap this pins down. Mid-span on a level span *looks* like the one position where the
    // slope is zero, and it is — of the **chord**, not of the cable at the node. A trolley sits on
    // a kink: below it `V = −588,5 N`, above it `+588,5 N`, the rider's whole 1177 N in between.
    // A `θ` averaged across the node would read 0 and quietly lose §6.2's own discontinuity.
    const step = sweepStep(spanOf(Z4.in), Z4.in.P, Z4.out.sP);
    if (!step.ok) throw new Error("expected a solve");
    const { state } = step;
    const above = Math.atan2(state.V0 + state.w * Z4.out.sP + Z4.in.P, state.H);
    expect(step.step.theta).toBeCloseTo(-above, 12);
    expect(step.step.theta).toBeLessThan(0);
  });

  test("a step's refusal is the inner solve's own, quoted unchanged", () => {
    const refused = sweepStep(spanOf({ ...Z5.in, L0: 0 }), Z5.in.P, 10);
    expect(refused.ok).toBe(false);
    if (refused.ok || refused.error.kind !== "invalid-input") throw new Error("expected a refusal");
    expect(refused.error.field).toBe("L0");
  });
});
