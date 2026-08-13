import { describe, expect, test } from "vitest";

import type { Fixture } from "./theory-15.ts";

import * as fixtures from "./theory-15.ts";
import { F1, TOLERANCE, Z1, Z2, Z3, Z4, Z5, Z6, scannedPositionTolerance } from "./theory-15.ts";

/**
 * These cases check the **transcription**, not the engine — no module under `src/lib/sim/` is
 * imported and none exists yet. A mistyped digit here would poison every downstream stage
 * silently, and §15's rows carry enough internal structure (§4.1's level-span symmetry, C11's
 * reaction form, `T = √(H² + V²)`) to catch one. The physics assertions these identities look
 * like belong to `solve.test.ts` and `loads.test.ts`, against the solver's output.
 */

const CASES: [string, Fixture][] = [
  ["F1", F1],
  ["Z1", Z1],
  ["Z2", Z2],
  ["Z3", Z3],
  ["Z4", Z4],
  ["Z5", Z5],
  ["Z6", Z6],
];

/** Relative disagreement, to be read against the `solvedScalar` tier's bar. */
function relativeError(actual: number, expected: number): number {
  return Math.abs(actual - expected) / Math.abs(expected);
}

describe("provenance", () => {
  test.each(CASES)("%s names its own §15 row", (key, fixture) => {
    expect(fixture.source).toBe(`simulation-theory.md §15 ${key}`);
  });

  test("Z7 (thermal, §9) and Z8 (dynamics, §12) are absent on purpose", () => {
    expect(Object.keys(fixtures)).not.toContain("Z7");
    expect(Object.keys(fixtures)).not.toContain("Z8");
  });

  test("the two provenance classes stay distinguishable by prefix", () => {
    const measured = "[MEASURED] ticket 14 §2";
    expect(measured.startsWith("simulation-theory.md §15 ")).toBe(false);
    for (const [, fixture] of CASES) {
      expect(fixture.source.startsWith("simulation-theory.md §15 ")).toBe(true);
    }
  });

  test("CHORD_BOUND is a measured row, not a §15 one — it asserts at the loosest tier", () => {
    // §5.4's floor is this app's own envelope measurement, not MoorPy-cross-validated physics.
    expect(fixtures.CHORD_BOUND.source.startsWith("[MEASURED] ")).toBe(true);
    expect(CASES.map(([key]) => key)).not.toContain("CHORD_BOUND");
  });
});

describe("tolerance tiers", () => {
  test("a scanned position's bar is twice the sample spacing", () => {
    expect(scannedPositionTolerance(Z1.in.L, 2000)).toBeCloseTo(0.1, 12);
    expect(scannedPositionTolerance(Z3.in.L, 4000)).toBeCloseTo(0.06, 12);
  });
});

describe("F1 — the §2.1 sign trap", () => {
  test("the mixed-convention and R1 values are distinct from the correct z(L₀)", () => {
    expect(F1.rejected.zAtL0MixedConvention).not.toBe(F1.out.zAtL0);
    expect(F1.rejected.zAtL0R1).not.toBe(F1.out.zAtL0);
    // Plausible-looking: the mixed convention is 5 mm out over 24 m, well inside any loose bar.
    expect(Math.abs(F1.rejected.zAtL0MixedConvention - F1.out.zAtL0)).toBeLessThan(0.01);
  });

  test("∂x/∂V₀ and ∂z/∂H are one number, not two transcriptions", () => {
    expect(F1.out.dzdH).toBe(F1.out.dxdV0);
  });
});

describe("level-span symmetry — §4.1's V₀ = −w·L₀/2 is exact", () => {
  test("Z1", () => {
    expect(Z1.out.V0).toBe((-Z1.in.w * Z1.in.L0) / 2);
    expect(Z1.out.VB).toBe(-Z1.out.V0);
  });

  test("Z2", () => {
    expect(Z2.out.V0).toBe((-Z2.in.w * Z2.in.L0) / 2);
  });

  test("Z1 puts the low point at mid-span", () => {
    expect(Z1.out.xAtZMin).toBe(Z1.in.L / 2);
  });
});

describe("end tensions are √(H² + V²)", () => {
  test("Z1's T_max is √(H² + V_B²)", () => {
    expect(relativeError(Math.hypot(Z1.out.H, Z1.out.VB), Z1.out.Tmax)).toBeLessThan(
      TOLERANCE.solvedScalar,
    );
  });

  test("Z2's two ends are equal", () => {
    expect(Z2.out.TA).toBe(Z2.out.TB);
    expect(relativeError(Math.hypot(Z2.out.H, Z2.out.V0), Z2.out.TA)).toBeLessThan(
      TOLERANCE.solvedScalar,
    );
  });

  test("Z3's upper anchor carries the maximum", () => {
    expect(relativeError(Math.hypot(Z3.out.H, Z3.out.V0), Z3.out.TA)).toBeLessThan(
      TOLERANCE.solvedScalar,
    );
    expect(relativeError(Math.hypot(Z3.out.H, Z3.out.VB), Z3.out.TB)).toBeLessThan(
      TOLERANCE.solvedScalar,
    );
    expect(Z3.out.TA).toBeGreaterThan(Z3.out.TB);
  });

  test("Z4's two ends are equal", () => {
    expect(Z4.out.TA).toBe(Z4.out.TB);
    expect(relativeError(Math.hypot(Z4.out.H, Z4.out.VB), Z4.out.TA)).toBeLessThan(
      TOLERANCE.solvedScalar,
    );
  });
});

describe("vertical equilibrium", () => {
  test("Z3 — unloaded: V_B = V₀ + w·L₀", () => {
    expect(relativeError(Z3.out.V0 + Z3.in.w * Z3.in.L0, Z3.out.VB)).toBeLessThan(
      TOLERANCE.solvedScalar,
    );
  });

  test("Z4 — C11's corrected reaction form, and the double-counted one it replaces", () => {
    expect(Z4.out.VB).toBe((Z4.in.w * Z4.in.L0 + Z4.in.P) / 2);
    // R1's `(qL + 2P)/2` double-counts P — 1679,5 N against 1091,0 N. Assert the rejection so
    // nobody "corrects" the formula back; §15's Z4 is what disproves it.
    expect(Z4.out.VB).not.toBe((Z4.in.w * Z4.in.L0 + 2 * Z4.in.P) / 2);
    expect(Z4.out.V0).toBe(-Z4.out.VB);
  });

  test("Z4 — the load sits at L₀/2 by symmetry", () => {
    expect(Z4.out.sP).toBe(Z4.in.L0 / 2);
  });
});

describe("Z5 rides Z4's line", () => {
  test("the span, the material and the rider are Z4's", () => {
    expect(Z5.in.L).toBe(Z4.in.L);
    expect(Z5.in.h).toBe(Z4.in.h);
    expect(Z5.in.L0).toBe(Z4.in.L0);
    expect(Z5.in.w).toBe(Z4.in.w);
    expect(Z5.in.EA).toBe(Z4.in.EA);
    expect(Z5.in.P).toBe(Z4.in.P);
  });

  test("σ_D > s_D > x_D — the reason s_D never appears in the UI", () => {
    expect(Z5.out.sigmaD).toBeGreaterThan(Z5.in.sD);
    expect(Z5.in.sD).toBeGreaterThan(Z5.out.xD);
    // ≈0,3 % between the material coordinate and the horizontal position.
    expect((Z5.in.sD - Z5.out.xD) / Z5.in.sD).toBeCloseTo(0.0032, 4);
  });

  test("moving the rider off mid-span sheds tension", () => {
    expect(Z5.out.H).toBeLessThan(Z4.out.H);
  });
});

describe("Z6 — the inverse problem", () => {
  test("the closed-form seed is close to L₀ without being it", () => {
    expect(Z6.out.closedFormSeed).not.toBe(Z6.out.L0);
    expect(Math.abs(Z6.out.closedFormSeed - Z6.out.L0) / Z6.out.L0).toBeLessThan(1e-4);
  });

  test("both L₀ and the seed lie above the chord, which is bisection's lower bound", () => {
    expect(Z6.out.L0).toBeGreaterThan(Z6.in.L);
    expect(Z6.out.closedFormSeed).toBeGreaterThan(Z6.in.L);
  });

  test("the forward re-solve returns the target", () => {
    expect(relativeError(Z6.out.H, Z6.in.HTarget)).toBeLessThan(TOLERANCE.solvedScalar);
  });
});
