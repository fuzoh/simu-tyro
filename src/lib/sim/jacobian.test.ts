import { describe, expect, test } from "vitest";

import type { CableShape } from "./catenary.ts";

import { F1, TOLERANCE, Z3, Z4 } from "./__fixtures__/theory-15.ts";
import { xAt, zAt } from "./catenary.ts";
import { jacobianAt } from "./jacobian.ts";

/**
 * §4.2's analytic partials, checked against `docs/simulation-theory.md` §15 — « voir § 11 — le
 * plan de test »: `F1`'s three partials land here, and so do §15's two stated invariants for
 * this module, `∂z/∂H = ∂x/∂V₀` and the finite-difference agreement.
 *
 * **All four of these assertions are new work, not a port.** The prototype exposes no Jacobian,
 * so a green `check.ts` is not coverage for any of them — testing.md's « fixture rules » says so
 * explicitly, and it is why the module exists before the solver that consumes it.
 *
 * **No solver runs in this file.** `F1` publishes `(H, V₀)` directly; the two loaded / inclined
 * rows below feed their own solved pairs into the closed form. What is asserted is the
 * *derivative* of §4.1, never the statics that produced the pair.
 */

/** Relative disagreement, read against the `solvedScalar` tier's bar. */
function relativeError(actual: number, expected: number): number {
  return Math.abs(actual - expected) / Math.abs(expected);
}

/**
 * A central difference of `f` in one of the two unknowns. Central rather than forward because
 * §15's bar is **absolute at 2×10⁻⁹** on partials of order 10⁻³–10⁻², which a first-order
 * difference cannot reach without a step so small that cancellation dominates.
 *
 * The step is relative to the value being perturbed (10⁻⁶ of it, floored): at `F1` that is
 * 5×10⁻³ N on `H`, which sits in the flat bottom of the truncation-versus-cancellation curve —
 * both ends of the curve were measured at 10⁻¹⁰ or better, so nothing here is tuned to the bar.
 */
function centralDifference(f: (shape: CableShape) => number, shape: CableShape, key: "H" | "V0") {
  const step = Math.max(Math.abs(shape[key]) * 1e-6, 1e-6);
  return (
    (f({ ...shape, [key]: shape[key] + step }) - f({ ...shape, [key]: shape[key] - step })) /
    (2 * step)
  );
}

/**
 * The worst of the four analytic partials against finite differences of §4.1 — §15's own
 * invariant, read against `TOLERANCE.jacobianVsFiniteDifference` (**absolute**, 2×10⁻⁹).
 */
function finiteDifferenceGap(shape: CableShape, s: number): number {
  const J = jacobianAt(shape, s);
  return Math.max(
    Math.abs(J.dxdH - centralDifference((c) => xAt(c, s), shape, "H")),
    Math.abs(J.dxdV0 - centralDifference((c) => xAt(c, s), shape, "V0")),
    Math.abs(J.dzdH - centralDifference((c) => zAt(c, s), shape, "H")),
    Math.abs(J.dzdV0 - centralDifference((c) => zAt(c, s), shape, "V0")),
  );
}

const f1: CableShape = { H: F1.in.H, V0: F1.in.V0, w: F1.in.w, EA: F1.in.EA };

describe("F1 — §4.2's three partials", () => {
  const J = jacobianAt(f1, F1.in.L0);

  test("∂x/∂H = 1.16024×10⁻³ m/N", () => {
    expect(relativeError(J.dxdH, F1.out.dxdH)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("∂x/∂V₀ = −4.55088×10⁻³ m/N", () => {
    expect(relativeError(J.dxdV0, F1.out.dxdV0)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("∂z/∂H = −4.55088×10⁻³ m/N", () => {
    expect(relativeError(J.dzdH, F1.out.dzdH)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("∂z/∂V₀ = 1.82564×10⁻² m/N", () => {
    expect(relativeError(J.dzdV0, F1.out.dzdV0)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("the signs are §2's: ∂x/∂H > 0, ∂z/∂V₀ > 0, the mixed partial < 0", () => {
    // A fixture value alone lets a sign error through — §2.1 is the standing proof of that, so
    // the qualitative reading is asserted too. Pulling harder horizontally lengthens the span;
    // lifting the near end raises the far one; and doing either trades against the other.
    expect(J.dxdH).toBeGreaterThan(0);
    expect(J.dzdV0).toBeGreaterThan(0);
    expect(J.dxdV0).toBeLessThan(0);
  });
});

describe("∂z/∂H = ∂x/∂V₀ — §4.2's symmetry", () => {
  // §4.2 makes these one expression, so the bar is equality. A tolerance here would pass for an
  // implementation that derived them twice and agreed to 10 digits — which is exactly the state
  // §15 refuses by publishing a single number for both.
  test("F1: the same number, not merely the same to a tolerance", () => {
    const J = jacobianAt(f1, F1.in.L0);
    expect(J.dzdH).toBe(J.dxdV0);
  });

  test("it holds at every s, on an inclined span and on a loaded one", () => {
    const shapes = [f1, inclinedZ3(), loadedZ4()];
    for (const shape of shapes) {
      for (let i = 0; i <= 20; i++) {
        const J = jacobianAt(shape, (100 * i) / 20);
        expect(J.dzdH).toBe(J.dxdV0);
      }
    }
  });
});

describe("analytic partials against finite differences — §15's < 2×10⁻⁹", () => {
  const BAR = TOLERANCE.jacobianVsFiniteDifference;

  test("F1, at the far end", () => {
    expect(finiteDifferenceGap(f1, F1.in.L0)).toBeLessThan(BAR);
  });

  test("F1, all along the span", () => {
    for (let i = 1; i <= 20; i++) {
      expect(finiteDifferenceGap(f1, (F1.in.L0 * i) / 20)).toBeLessThan(BAR);
    }
  });

  test("Z3's inclined, sagging span — V₀ < 0 and the line crosses its low point", () => {
    // F1 is a taut *rising* segment: V stays positive across it, so it cannot catch a term that
    // is only wrong where V changes sign. Z3's geometry does.
    expect(finiteDifferenceGap(inclinedZ3(), Z3.in.L0)).toBeLessThan(BAR);
  });

  test("Z4's loaded span, on both sides of the node — §6.1 per segment", () => {
    const shape = loadedZ4();
    expect(finiteDifferenceGap(shape, Z4.out.sP - 5)).toBeLessThan(BAR);
    expect(finiteDifferenceGap(shape, Z4.out.sP + 5)).toBeLessThan(BAR);
    expect(finiteDifferenceGap(shape, Z4.in.L0)).toBeLessThan(BAR);
  });

  test("two loads, given out of s order", () => {
    const shuffled: CableShape = {
      ...loadedZ4(),
      loads: [
        { P: Z4.in.P / 2, s: 70 },
        { P: Z4.in.P / 2, s: 20 },
      ],
    };
    expect(finiteDifferenceGap(shuffled, Z4.in.L0)).toBeLessThan(BAR);
  });
});

describe("the structure of the Jacobian, independent of any fixture value", () => {
  test("at s = 0 every partial is 0 — the near anchor is the origin whatever (H, V₀) is", () => {
    const J = jacobianAt(f1, 0);
    expect(J.dxdH).toBe(0);
    expect(J.dxdV0).toBe(0);
    expect(J.dzdH).toBe(0);
    expect(J.dzdV0).toBe(0);
  });

  test("∂x/∂H and ∂z/∂V₀ carry the elastic term s/EA, so they survive EA → ∞ only in part", () => {
    // The elastic stretch contributes exactly `s/EA` to both diagonal partials (§4.1's
    // `dx/ds = H/T + H/EA`, `dz/ds = V/T + V/EA`) and nothing to the mixed one. Stiffening the
    // cable must therefore move the diagonal down by that much and leave `∂x/∂V₀` alone.
    const RIGID_EA = 1e14;
    const soft = jacobianAt(f1, F1.in.L0);
    const rigid = jacobianAt({ ...f1, EA: RIGID_EA }, F1.in.L0);
    const elasticGap = F1.in.L0 / F1.in.EA - F1.in.L0 / RIGID_EA;
    expect(soft.dxdH - rigid.dxdH).toBeCloseTo(elasticGap, 15);
    expect(soft.dzdV0 - rigid.dzdV0).toBeCloseTo(elasticGap, 15);
    expect(rigid.dxdV0).toBe(soft.dxdV0);
  });

  test("a load beyond s is not felt: §6.1's jump is strictly at s > s_P", () => {
    const unloaded = jacobianAt({ ...f1, loads: [] }, 40);
    const behind = jacobianAt({ ...f1, loads: [{ P: 1177, s: 60 }] }, 40);
    expect(behind).toEqual(unloaded);
    // …and a load sitting exactly on the evaluation point is still behind it.
    expect(jacobianAt({ ...f1, loads: [{ P: 1177, s: 40 }] }, 40)).toEqual(unloaded);
  });

  test("load order does not change the answer, and the caller's array is untouched", () => {
    const ascending = [
      { P: 600, s: 20 },
      { P: 577, s: 70 },
    ];
    const descending = [
      { P: 577, s: 70 },
      { P: 600, s: 20 },
    ];
    const base = loadedZ4();
    expect(jacobianAt({ ...base, loads: descending }, Z4.in.L0)).toEqual(
      jacobianAt({ ...base, loads: ascending }, Z4.in.L0),
    );
    expect(descending.map((load) => load.s)).toEqual([70, 20]);
  });

  test("it is pure: same shape in, same numbers out", () => {
    const shape = loadedZ4();
    const before = structuredClone(shape);
    expect(jacobianAt(shape, Z4.in.L0)).toEqual(jacobianAt(shape, Z4.in.L0));
    expect(shape).toEqual(before);
  });
});

/** `Z3`'s solved pair as a shape — an inclined span whose line crosses its own low point. */
function inclinedZ3(): CableShape {
  return { H: Z3.out.H, V0: Z3.out.V0, w: Z3.in.w, EA: Z3.in.EA };
}

/** `Z4`'s solved pair as a shape — §6.1's single-node piecewise `V(s)`. */
function loadedZ4(): CableShape {
  return {
    H: Z4.out.H,
    V0: Z4.out.V0,
    w: Z4.in.w,
    EA: Z4.in.EA,
    loads: [{ P: Z4.in.P, s: Z4.out.sP }],
  };
}
