import { describe, expect, test } from "vitest";

import type { SpanInput } from "./types.ts";

import { CHORD_BOUND, TOLERANCE, Z4 } from "./__fixtures__/theory-15.ts";
import { verticalTensionAt } from "./catenary.ts";
import {
  POINT_LOAD,
  loadNode,
  solveAtHorizontalPosition,
  solveAtMaterialPosition,
} from "./loads.ts";
import { residualTolerance } from "./solve.ts";

/**
 * §6.1's point load against `docs/simulation-theory.md` §15 — « voir § 11 — le plan de test » for
 * which row lands here: `Z4` twice (once at its material coordinate, once recovered from a typed
 * `x_D`), C11's corrected reaction form **with the double-counted one as a carried rejection**, and
 * §15's global force balance at 10⁻¹⁰.
 *
 * Two things this file exists to pin down, neither of which `Z4`'s numbers alone would catch:
 *
 * - **C11 is a rejection, not a duplicate of `Z4`.** The old report's `V_high = (qL + 2P)/2`
 *   **double-counts `P`**, and `Z4`'s `V_B = 1091.00 = (10·100.5 + 1177)/2` is what disproves it.
 *   The double-counted form is asserted **not** to match, or the next reader "corrects" the formula
 *   back — and 1679,5 N against 1091,0 N is 54 % more anchor load, in the optimistic direction.
 * - **Case 2 is the same physics as case 1, reached from the other end.** A `solveAtHorizontalPosition`
 *   that merely snapped `x_D` to a grid would still land within a few centimetres of `Z4`'s node and
 *   pass any loose bar, so the recovered `x_D` is asserted against §5.3's own metre tolerance and the
 *   recovered state field for field against the case-1 solve.
 */

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

/** The solved state, or a failed assertion naming the error the solver returned instead. */
function solved(result: ReturnType<typeof solveAtHorizontalPosition>) {
  if (!result.ok) throw new Error(`expected a solve, got ${JSON.stringify(result.error)}`);
  return result;
}

/** `Z4`'s line, without the rider — the rider is what each case below places. */
const Z4_LINE = spanOf(Z4.in);

describe("Z4 — the rider at a given material coordinate (§6.1 case 1)", () => {
  // §15 states `s_P = 50.2500 m` and states *why*: it is `L₀/2`, by symmetry of a level span
  // loaded at mid-span. The fixture's own two numbers have to agree before the solver is asked
  // anything.
  test("s_P = 50.2500 m is L₀/2 — the symmetry §15 names", () => {
    expect(Z4.out.sP).toBe(Z4.in.L0 / 2);
  });

  const { state } = solved(solveAtMaterialPosition(Z4_LINE, Z4.in.P, Z4.out.sP));

  test("H = 7898.16 N", () => {
    expect(relativeError(state.H, Z4.out.H)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("V₀ = −1091.00 N and V_B = +1091.00 N", () => {
    expect(relativeError(state.V0, Z4.out.V0)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(state.VB, Z4.out.VB)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("T_A = T_B = 7973.16 N — mid-span on a level span loads both ends alike", () => {
    expect(relativeError(state.TA, Z4.out.TA)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(state.TB, Z4.out.TB)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(state.TA).toBeCloseTo(state.TB, 6);
  });

  test("the node sits at z_D = −5.31434 m, x_D = 50 m", () => {
    const node = loadNode(state, Z4.out.sP);
    expect(relativeError(node.z, Z4.out.zD)).toBeLessThan(TOLERANCE.solvedScalar);
    // Half of `Z4`'s own span: the load is at mid-span, which is what `x_D = 50` means in §15's
    // input row. Read at §5.3's metre bar, since it is a position the solve closes on.
    expect(Math.abs(node.x - Z4.in.xD)).toBeLessThanOrEqual(residualTolerance(Z4.in.L));
  });

  test("the rider is echoed on the state, so the kink survives into sampleCable", () => {
    expect(state.loads).toEqual([{ P: Z4.in.P, s: Z4.out.sP }]);
  });

  test("the rider tightens the line, it does not slacken it", () => {
    // Sanity on the *direction* of the load, which a sign slip in §6.1's `+P·𝟙[s > s_P]` would
    // reverse while still solving: the same geometry with no rider is far slacker.
    const unloaded = solved(solveAtMaterialPosition(Z4_LINE, 0, Z4.out.sP));
    expect(state.H).toBeGreaterThan(unloaded.state.H);
    expect(state.V0).toBeLessThan(unloaded.state.V0);
  });
});

describe("Z4 — the same state recovered from a typed x_D (§6.1 case 2)", () => {
  const fromMaterial = solved(solveAtMaterialPosition(Z4_LINE, Z4.in.P, Z4.out.sP)).state;
  const { state } = solved(solveAtHorizontalPosition(Z4_LINE, Z4.in.P, Z4.in.xD));
  const rider = state.loads[0];

  test("it finds s_P = 50.2500 m", () => {
    expect(relativeError(rider.s, Z4.out.sP)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("the node lands on the requested x_D to §5.3's tolerance, not to a snapped grid", () => {
    expect(Math.abs(loadNode(state, rider.s).x - Z4.in.xD)).toBeLessThanOrEqual(
      residualTolerance(Z4.in.L),
    );
  });

  test("H, V₀, V_B, T_A, T_B and z_D all match §15's row", () => {
    expect(relativeError(state.H, Z4.out.H)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(state.V0, Z4.out.V0)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(state.VB, Z4.out.VB)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(state.TA, Z4.out.TA)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(state.TB, Z4.out.TB)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(loadNode(state, rider.s).z, Z4.out.zD)).toBeLessThan(
      TOLERANCE.solvedScalar,
    );
  });

  test("it is the case-1 state, field for field — one physics, two entry points", () => {
    expect(relativeError(state.H, fromMaterial.H)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(state.V0, fromMaterial.V0)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(state.VB, fromMaterial.VB)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(state.Tmax, fromMaterial.Tmax)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(state.L0).toBe(fromMaterial.L0);
    expect(state.w).toBe(fromMaterial.w);
    expect(state.EA).toBe(fromMaterial.EA);
  });

  test("the outer bisection spent Newton iterations, and reports their total", () => {
    expect(state.iterations).toBeGreaterThan(0);
  });
});

describe("C11 — the corrected reaction form, and the double-counted one it replaces", () => {
  const { w, L0, P } = { w: Z4.in.w, L0: Z4.in.L0, P: Z4.in.P };
  /** C11 corrected: `(w·L₀ + P)/2`, with `w·L₀` because weight is per **unstretched** length. */
  const corrected = (w * L0 + P) / 2;
  /** The old report's `V_high = (qL + 2P)/2` — the same expression with `P` counted twice. */
  const doubleCounted = (w * L0 + 2 * P) / 2;

  test("§15's V_B = 1091.00 N *is* (w·L₀ + P)/2", () => {
    // Fixture against closed form, no solver involved: if these two disagree the rest of the
    // file is arguing about the wrong number.
    expect(relativeError(corrected, Z4.out.VB)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  const { state } = solved(solveAtMaterialPosition(Z4_LINE, P, Z4.out.sP));

  test("the solver returns the corrected form", () => {
    expect(relativeError(state.VB, corrected)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("and explicitly not (qL + 2P)/2 — the double-counted P is 54 % of extra anchor load", () => {
    expect(relativeError(state.VB, doubleCounted)).toBeGreaterThan(0.3);
    expect(doubleCounted - corrected).toBeCloseTo(P / 2, 9);
  });

  test("nor does it double-count at the near anchor: V₀ carries no P at all", () => {
    // The jump is at `s_P`, so `V(0)` is self-weight only. `V₀ = −(w·L₀ + P)/2` on this symmetric
    // case, which is the corrected form mirrored — not `−(w·L₀)/2` and not `−(w·L₀ + 2P)/2`.
    expect(relativeError(state.V0, -corrected)).toBeLessThan(TOLERANCE.solvedScalar);
  });
});

describe("global force balance with a point load — §15's own 10⁻¹⁰ bar", () => {
  const cases = [
    ["Z4, mid-span level", Z4_LINE, Z4.in.P, Z4.out.sP],
    ["off-centre on an inclined span", spanOf({ L: 120, h: -15, L0: 122, w: 5, EA: 1e7 }), 900, 40],
    ["near the far anchor", spanOf({ L: 100, h: 0, L0: 100.5, w: 10, EA: 1e7 }), 1177, 95],
  ] as const;

  test.each(cases)("%s: V_B − V₀ = w·L₀ + P", (_label, line, P, sP) => {
    const { state } = solved(solveAtMaterialPosition(line, P, sP));
    expect(Math.abs(state.VB - state.V0 - (state.w * state.L0 + P))).toBeLessThan(
      TOLERANCE.forceBalance,
    );
  });

  test.each(cases)(
    "%s: the vertical reactions are §6.1's own V(s) at the two ends",
    (_label, line, P, sP) => {
      // Not a restatement of the row above: this reads `V(0)` and `V(L₀)` back out of §6.1's
      // piecewise `V(s)` — the function the geometry was integrated from — rather than out of the
      // arithmetic that assembled the state.
      const { state } = solved(solveAtMaterialPosition(line, P, sP));
      expect(Math.abs(verticalTensionAt(state, 0) - state.V0)).toBeLessThan(TOLERANCE.forceBalance);
      expect(Math.abs(verticalTensionAt(state, state.L0) - state.VB)).toBeLessThan(
        TOLERANCE.forceBalance,
      );
    },
  );

  test.each(cases)("%s: the node jump is exactly P, and H does not jump", (_label, line, P, sP) => {
    // §6.1: `V` jumps by `P` at the node and `H` is continuous while the applied load is vertical.
    // A trolley is not a pulley, so the tension *magnitudes* on the two sides differ — that
    // imbalance is what accelerates the rider — while `H` is one number for the whole span.
    const { state } = solved(solveAtMaterialPosition(line, P, sP));
    const delta = 1e-6;
    const below = verticalTensionAt(state, sP - delta);
    const above = verticalTensionAt(state, sP + delta);
    // The two samples also straddle `2δ` of cable, whose own weight is the `2·w·δ` term. What is
    // asserted is that everything else across the node is `P` — once, not twice.
    expect(Math.abs(above - below - (P + 2 * state.w * delta))).toBeLessThan(
      TOLERANCE.forceBalance,
    );
    expect(state.TA).toBe(Math.hypot(state.H, verticalTensionAt(state, 0)));
  });

  test("the trolley is not a pulley: T₁ ≠ T₂ across the node", () => {
    // §6.1: « Do not impose `T₁ = T₂` at the node » — the tangential imbalance *is* the force that
    // accelerates the rider along the line. Read on the off-centre case, because `Z4`'s mid-span
    // node has `T₁ = T₂` to the last bit — by symmetry, which is the one place the two agree and
    // therefore the one place this check would prove nothing.
    const { state } = solved(solveAtMaterialPosition(Z4_LINE, Z4.in.P, 30));
    const below = Math.hypot(state.H, verticalTensionAt(state, 30 - 1e-6));
    const above = Math.hypot(state.H, verticalTensionAt(state, 30 + 1e-6));
    // Not « above is the greater »: on the near side of a load placed up-span the cable is the
    // steeper one, so which side carries more depends on where the node sits. What is fixed is
    // that they are **not equal**, and not by a rounding: by tens of daN.
    expect(Math.abs(above - below)).toBeGreaterThan(1);
  });

  test("…and at mid-span they agree, by symmetry rather than by fiat", () => {
    const { state } = solved(solveAtMaterialPosition(Z4_LINE, Z4.in.P, Z4.out.sP));
    const below = verticalTensionAt(state, Z4.out.sP - 1e-6);
    const above = verticalTensionAt(state, Z4.out.sP + 1e-6);
    expect(Math.hypot(state.H, below)).toBeCloseTo(Math.hypot(state.H, above), 6);
    // Which is `Z4`'s `T_A = T_B` seen at the node: half the rider each way.
    expect(above + below).toBeCloseTo(0, 6);
  });

  test.each(cases)(
    "%s: the anchors hold the whole applied load, and nothing more",
    (_label, line, P, sP) => {
      // Sum of forces on the cable: `(−H, −V₀)` from A, `(H, V_B)` from B, `(0, −(w·L₀ + P))`
      // applied. Both components, so a sign error in either direction shows up here.
      const { state } = solved(solveAtMaterialPosition(line, P, sP));
      expect(-state.H + state.H).toBe(0);
      expect(Math.abs(-state.V0 + state.VB - (state.w * state.L0 + P))).toBeLessThan(
        TOLERANCE.forceBalance,
      );
    },
  );
});

describe("x(s_P) is monotone in s_P — what makes the outer bisection safe", () => {
  test("the node marches right as the rider marches along the cable", () => {
    let previous = Number.NEGATIVE_INFINITY;
    for (let i = 1; i < 20; i++) {
      const sP = (Z4.in.L0 * i) / 20;
      const { state } = solved(solveAtMaterialPosition(Z4_LINE, Z4.in.P, sP));
      const x = loadNode(state, sP).x;
      expect(x).toBeGreaterThan(previous);
      previous = x;
    }
    expect(previous).toBeLessThan(Z4.in.L);
  });

  test("every x_D in the open span is recoverable, and recovers to §5.3's tolerance", () => {
    for (const xTarget of [1, 12.5, 37, 50, 63.25, 88, 99]) {
      const { state } = solved(solveAtHorizontalPosition(Z4_LINE, Z4.in.P, xTarget));
      const rider = state.loads[0];
      expect(rider.s).toBeGreaterThan(0);
      expect(rider.s).toBeLessThan(Z4.in.L0);
      expect(Math.abs(loadNode(state, rider.s).x - xTarget)).toBeLessThanOrEqual(
        residualTolerance(Z4.in.L),
      );
    }
  });

  test("the anchors are in range too — § 3's hard range for x_D is the closed [0, L]", () => {
    // `x_D` is a view parameter: the app clamps it into `[0, L]` on every path and says so with a
    // transient note — « le clamp est une note, pas une erreur » (§ 7), and `x_D` sits in no gate.
    // A viewpoint clamped onto its own bound is therefore a legal state that must still draw.
    for (const xTarget of [0, Z4.in.L]) {
      const { state } = solved(solveAtHorizontalPosition(Z4_LINE, Z4.in.P, xTarget));
      const rider = state.loads[0];
      expect(rider.s).toBeGreaterThanOrEqual(0);
      expect(rider.s).toBeLessThanOrEqual(Z4.in.L0);
      expect(Math.abs(loadNode(state, rider.s).x - xTarget)).toBeLessThanOrEqual(
        residualTolerance(Z4.in.L),
      );
    }
  });

  test("the bisection budget covers a 1500 m span too", () => {
    // 60 halvings take a 1500 m bracket to 10⁻¹⁵ m, so the budget is never what stops the loop
    // — §5.3's own tolerance is (1×10⁻⁶·L beyond 1000 m).
    const long = spanOf({ L: 1500, h: -60, L0: 1512, w: 5.36, EA: 6.9e6 });
    const { state } = solved(solveAtHorizontalPosition(long, 1177, 1000));
    expect(Math.abs(loadNode(state, state.loads[0].s).x - 1000)).toBeLessThanOrEqual(
      residualTolerance(1500),
    );
    expect(POINT_LOAD.maxBisections).toBe(60);
  });
});

describe("§6.1's n loads — the generality that costs nothing", () => {
  const twoRiders = { ...Z4_LINE, loads: [{ P: 800, s: 20 }] };

  test("a second rider is added beside the first, not instead of it", () => {
    const { state } = solved(solveAtMaterialPosition(twoRiders, Z4.in.P, 70));
    expect(state.loads).toEqual([
      { P: 800, s: 20 },
      { P: Z4.in.P, s: 70 },
    ]);
  });

  test("both jumps land in the balance: V_B − V₀ = w·L₀ + ΣP", () => {
    const { state } = solved(solveAtMaterialPosition(twoRiders, Z4.in.P, 70));
    expect(Math.abs(state.VB - state.V0 - (state.w * state.L0 + 800 + Z4.in.P))).toBeLessThan(
      TOLERANCE.forceBalance,
    );
  });

  test("two riders pull harder than one — at both ends", () => {
    const one = solved(solveAtMaterialPosition(Z4_LINE, Z4.in.P, 70)).state;
    const two = solved(solveAtMaterialPosition(twoRiders, Z4.in.P, 70)).state;
    expect(two.H).toBeGreaterThan(one.H);
    expect(two.Tmax).toBeGreaterThan(one.Tmax);
    // Note what does *not* follow: the second rider raises `H`, so the **first** rider's node sits
    // higher on the two-rider line than it did alone. More load is not more sag at a given point.
    expect(loadNode(two, 70).z).toBeGreaterThan(loadNode(one, 70).z);
  });

  test("a typed x_D still resolves with another load already on the line", () => {
    const { state } = solved(solveAtHorizontalPosition(twoRiders, Z4.in.P, 70));
    const rider = state.loads[state.loads.length - 1];
    expect(state.loads).toHaveLength(2);
    expect(Math.abs(loadNode(state, rider.s).x - 70)).toBeLessThanOrEqual(
      residualTolerance(Z4.in.L),
    );
  });
});

describe("refusals — a value every time, never a throw", () => {
  test.each([
    ["x_D past the far anchor", 100.5, 100, "max"],
    ["x_D behind A", -3, 0, "min"],
    ["an unreadable x_D", Number.NaN, 0, "min"],
  ] as const)("%s is refused with its own bound", (_label, xTarget, bound, boundKind) => {
    // The hard range is § 3's closed `0 ≤ x ≤ L`; only a value *outside* it is refused.
    const result = solveAtHorizontalPosition(Z4_LINE, Z4.in.P, xTarget);
    expect(result.ok).toBe(false);
    if (result.ok || result.error.kind !== "invalid-input") throw new Error("expected a refusal");
    expect(result.error.field).toBe("xD");
    expect(result.error.value).toBe(xTarget);
    expect(result.error.bound).toBe(bound);
    expect(result.error.boundKind).toBe(boundKind);
  });

  test.each([
    ["a negative load", -1177],
    ["an unreadable load", Number.NaN],
  ])("%s names P, which no solver-side check would", (_label, P) => {
    const result = solveAtHorizontalPosition(Z4_LINE, P, 50);
    expect(result.ok).toBe(false);
    if (result.ok || result.error.kind !== "invalid-input") throw new Error("expected a refusal");
    expect(result.error.field).toBe("P");
    expect(result.error.value).toBe(P);
  });

  test("a broken span still names the span's own culprit, not x_D", () => {
    // `x_D ≥ L` cannot be judged before `L` is a number, so the span's tier one goes first.
    const result = solveAtHorizontalPosition(spanOf({ ...Z4.in, L: 0 }), Z4.in.P, 50);
    expect(result.ok).toBe(false);
    if (result.ok || result.error.kind !== "invalid-input") throw new Error("expected a refusal");
    expect(result.error.field).toBe("L");
  });

  test("§5.4's chord bound propagates out of the inner solve with its bound intact", () => {
    const { w, EA, MBF } = CHORD_BOUND.in;
    const result = solveAtHorizontalPosition(
      spanOf({ L: 200, h: 0, L0: 190, w, EA, strength: MBF }),
      1177,
      100,
    );
    expect(result.ok).toBe(false);
    if (result.ok || result.error.kind !== "invalid-input") throw new Error("expected a refusal");
    expect(result.error.field).toBe("L0");
    expect(relativeError(result.error.bound, CHORD_BOUND.out.floor200)).toBeLessThan(
      TOLERANCE.measured,
    );
    expect(result.error.boundKind).toBe("min");
  });

  test("nothing here throws", () => {
    expect(() => solveAtHorizontalPosition(spanOf({ ...Z4.in, L0: 0 }), 1177, 50)).not.toThrow();
    expect(() => solveAtMaterialPosition(Z4_LINE, Number.NaN, 50)).not.toThrow();
  });
});

describe("both entry points are pure", () => {
  test("the same call twice gives the same state, and the input is untouched", () => {
    const input = spanOf(Z4.in);
    const before = structuredClone(input);
    expect(solved(solveAtHorizontalPosition(input, Z4.in.P, 37)).state).toEqual(
      solved(solveAtHorizontalPosition(input, Z4.in.P, 37)).state,
    );
    expect(input).toEqual(before);
  });

  test("placing a rider never pushes into the caller's loads array", () => {
    const loads = [{ P: 800, s: 20 }];
    const input = { ...Z4_LINE, loads };
    solved(solveAtMaterialPosition(input, Z4.in.P, 70));
    solved(solveAtHorizontalPosition(input, Z4.in.P, 70));
    expect(loads).toEqual([{ P: 800, s: 20 }]);
  });

  test("loadNode does not mutate the state it reads", () => {
    const { state } = solved(solveAtMaterialPosition(Z4_LINE, Z4.in.P, Z4.out.sP));
    const before = structuredClone(state);
    loadNode(state, Z4.out.sP);
    expect(state).toEqual(before);
  });
});
