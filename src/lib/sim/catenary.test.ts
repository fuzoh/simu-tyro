import { describe, expect, test } from "vitest";

import type { PointLoad, SpanState } from "./types.ts";

import {
  F1,
  TOLERANCE,
  Z1,
  Z2,
  Z3,
  Z4,
  scannedPositionTolerance,
} from "./__fixtures__/theory-15.ts";
import {
  levelSpanShortcut,
  sampleCable,
  tensionAt,
  verticalTensionAt,
  xAt,
  zAt,
} from "./catenary.ts";

/**
 * §4.1's forward evaluation, checked against `docs/simulation-theory.md` §15 — « voir § 11 — le
 * plan de test » for which row lands here: `F1`'s `x(L₀)` / `z(L₀)`, `Z1`'s low point, `Z3`'s sag
 * below the chord, and the `EA → 10¹⁴` inextensible limit.
 *
 * **No solver runs in this file.** The §15 rows publish `(H, V₀)`, so every case here feeds the
 * fixture's own solved pair into the closed form and reads a geometric quantity back out.
 * `solve.test.ts` owns the statics that produced those pairs, and `loads.test.ts` owns `Z4`'s —
 * what `Z4` checks below is only that a *loaded* state samples through its kink.
 *
 * Two consequences of that, both deliberate:
 *
 * - The fixture's 6 s.f. `H` is itself an input error of up to ~3,5×10⁻⁶ relative, so a derived
 *   length inherits it. Every assertion below is still at the `solvedScalar` tier; where the
 *   inherited error would dominate a *difference* of two numbers, the assertion is framed on the
 *   quantity §15 actually measured (see `Z3`'s `z_min`).
 * - Positions of scanned extrema assert **absolute, at twice the sample spacing**
 *   (`scannedPositionTolerance`): an argmax over a sampled polyline is limited by the spacing.
 */

/** Relative disagreement, read against the `solvedScalar` tier's bar. */
function relativeError(actual: number, expected: number): number {
  return Math.abs(actual - expected) / Math.abs(expected);
}

/**
 * A `SpanState` around a §15 row's solved pair. The tension fields are filled for **shape only** —
 * `sampleCable` reads `H`, `V0`, `L0`, `w`, `EA` and `loads`, and nothing else.
 */
function stateOf(p: {
  H: number;
  V0: number;
  w: number;
  EA: number;
  L0: number;
  loads?: PointLoad[];
}): SpanState {
  const loads = p.loads ?? [];
  const VB = p.V0 + p.w * p.L0 + loads.reduce((sum, load) => sum + load.P, 0);
  const TA = Math.hypot(p.H, p.V0);
  const TB = Math.hypot(p.H, VB);
  return {
    H: p.H,
    V0: p.V0,
    VB,
    TA,
    TB,
    Tmax: Math.max(TA, TB),
    L0: p.L0,
    w: p.w,
    EA: p.EA,
    loads,
    iterations: 0,
  };
}

/** The lowest sampled point of an interleaved `x, z` polyline. */
function scanLowPoint(samples: Float64Array): { x: number; z: number } {
  let best = { x: samples[0], z: samples[1] };
  for (let i = 2; i < samples.length; i += 2) {
    if (samples[i + 1] < best.z) best = { x: samples[i], z: samples[i + 1] };
  }
  return best;
}

/** The greatest sampled drop below the straight chord `A → B` — §3's « flèche ». */
function scanSagBelowChord(samples: Float64Array, L: number, h: number): { x: number; D: number } {
  let best = { x: 0, D: -Infinity };
  for (let i = 0; i < samples.length; i += 2) {
    const x = samples[i];
    const D = (h * x) / L - samples[i + 1];
    if (D > best.D) best = { x, D };
  }
  return best;
}

describe("F1 — §4.1 forward evaluation, and the §2.1 sign trap", () => {
  const f1 = { H: F1.in.H, V0: F1.in.V0, w: F1.in.w, EA: F1.in.EA };

  test("x(L₀) = 97.0329 m", () => {
    expect(relativeError(xAt(f1, F1.in.L0), F1.out.xAtL0)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("z(L₀) = 24.2392 m", () => {
    expect(relativeError(zAt(f1, F1.in.L0), F1.out.zAtL0)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("neither the mixed convention (24.2342) nor R1's 24.84 is returned", () => {
    // Both are plausible-looking and both are wrong — 24.2342 by 5 mm, which is what makes the
    // sign trap survive a loose bar. Asserting the rejections is the point of the case.
    const z = zAt(f1, F1.in.L0);
    expect(relativeError(z, F1.rejected.zAtL0MixedConvention)).toBeGreaterThan(
      TOLERANCE.solvedScalar,
    );
    expect(relativeError(z, F1.rejected.zAtL0R1)).toBeGreaterThan(TOLERANCE.solvedScalar);
  });

  test("x(0) = z(0) = 0 — the near anchor is the origin (§2)", () => {
    expect(xAt(f1, 0)).toBe(0);
    expect(zAt(f1, 0)).toBe(0);
  });

  test("V(s) = V₀ + w·s and T(s) = √(H² + V(s)²)", () => {
    expect(verticalTensionAt(f1, F1.in.L0)).toBeCloseTo(F1.in.V0 + F1.in.w * F1.in.L0, 12);
    expect(tensionAt(f1, 0)).toBe(Math.hypot(F1.in.H, F1.in.V0));
  });
});

describe("Z1 — unloaded level span, the low point scanned", () => {
  const state = stateOf({ H: Z1.out.H, V0: Z1.out.V0, w: Z1.in.w, EA: Z1.in.EA, L0: Z1.in.L0 });
  const SAMPLES = 2000;
  const low = scanLowPoint(sampleCable(state, SAMPLES));

  test("z_min = −4.39987 m", () => {
    expect(relativeError(low.z, Z1.out.zMin)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("the low point sits at x = 50.0 m", () => {
    expect(Math.abs(low.x - Z1.out.xAtZMin)).toBeLessThan(
      scannedPositionTolerance(Z1.in.L, SAMPLES),
    );
  });

  test("the scanned minimum agrees with the analytic one at s* = −V₀/w", () => {
    // §2: V(s*) = 0 is where the tangent is horizontal. The scan may not land on s* exactly, so
    // it can only ever be the higher of the two.
    const analytic = zAt(state, -Z1.out.V0 / Z1.in.w);
    expect(low.z).toBeGreaterThanOrEqual(analytic - 1e-12);
    expect(relativeError(analytic, Z1.out.zMin)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("the far anchor closes on (L, h) = (100, 0)", () => {
    expect(Math.abs(xAt(state, Z1.in.L0) - Z1.in.L)).toBeLessThan(1e-4);
    expect(Math.abs(zAt(state, Z1.in.L0) - Z1.in.h)).toBeLessThan(1e-4);
  });
});

describe("Z3 — unloaded inclined span, sag below the chord", () => {
  const state = stateOf({ H: Z3.out.H, V0: Z3.out.V0, w: Z3.in.w, EA: Z3.in.EA, L0: Z3.in.L0 });
  const SAMPLES = 4000;
  const samples = sampleCable(state, SAMPLES);
  const sag = scanSagBelowChord(samples, Z3.in.L, Z3.in.h);

  test("sag below the chord D = 7.0811 m", () => {
    expect(relativeError(sag.D, Z3.out.D)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("the sag maximum sits at x ≈ 59.7 m", () => {
    expect(Math.abs(sag.x - Z3.out.xAtD)).toBeLessThan(scannedPositionTolerance(Z3.in.L, SAMPLES));
  });

  test("the low point sits below B: z_min − h = −1.5476 m", () => {
    // §15 publishes the *difference*; the measured quantity is `z_min`, so the relative bar goes
    // on `z_min` itself. On a 1,55 m difference of two ~16 m numbers, 4×10⁻⁶ relative would be
    // 6 µm — below §15's own printed resolution for this row (5×10⁻⁵ m), not a physics bar.
    const zMin = scanLowPoint(samples).z;
    expect(relativeError(zMin, Z3.in.h + Z3.out.zMinMinusH)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(zMin).toBeLessThan(Z3.in.h);
  });

  test("the ends carry Z3's tensions, with T_A the greater (§2)", () => {
    expect(relativeError(tensionAt(state, 0), Z3.out.TA)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(tensionAt(state, Z3.in.L0), Z3.out.TB)).toBeLessThan(
      TOLERANCE.solvedScalar,
    );
    expect(tensionAt(state, 0)).toBeGreaterThan(tensionAt(state, Z3.in.L0));
  });
});

describe("the EA → 10¹⁴ limit is the closed-form inextensible catenary (7 s.f.)", () => {
  /** §15's own bar for this invariant: agreement to 7 significant figures. */
  const SEVEN_SF = 5e-8;

  test("z(x) = C·[cosh((x + x₀)/C) − cosh(x₀/C)], C = H/w — F1's rising geometry", () => {
    const rigid = { H: F1.in.H, V0: F1.in.V0, w: F1.in.w, EA: 1e14 };
    const C = rigid.H / rigid.w;
    const x0 = C * Math.asinh(rigid.V0 / rigid.H);
    for (let i = 1; i <= 200; i++) {
      const s = (F1.in.L0 * i) / 200;
      const closedForm = C * (Math.cosh((xAt(rigid, s) + x0) / C) - Math.cosh(x0 / C));
      expect(relativeError(zAt(rigid, s), closedForm)).toBeLessThan(SEVEN_SF);
    }
  });

  test("level span: L₀ = 2C·sinh(L/2C) and D = C·[cosh(L/2C) − 1] (§3, tier 2)", () => {
    // Z1's geometry, stiffened. `z(x)` crosses zero twice on a level span, so the pointwise
    // relative form above is degenerate here — §3's two closed forms are not.
    const w = Z1.in.w;
    const L0 = Z1.in.L0;
    const rigid = { H: Z1.out.H, V0: (-w * L0) / 2, w, EA: 1e14 };
    const C = rigid.H / w;
    const L = xAt(rigid, L0);
    expect(relativeError(2 * C * Math.sinh(L / (2 * C)), L0)).toBeLessThan(SEVEN_SF);
    expect(
      relativeError(-zAt(rigid, -rigid.V0 / w), C * (Math.cosh(L / (2 * C)) - 1)),
    ).toBeLessThan(SEVEN_SF);
  });
});

describe("levelSpanShortcut — §4.1's exact V₀ for h = 0", () => {
  test("Z1 returns −w·L₀/2 exactly", () => {
    const V0 = levelSpanShortcut({
      L: Z1.in.L,
      h: Z1.in.h,
      L0: Z1.in.L0,
      w: Z1.in.w,
      EA: Z1.in.EA,
      loads: [],
    });
    expect(V0).toBe((-Z1.in.w * Z1.in.L0) / 2);
    expect(V0).toBe(Z1.out.V0);
  });

  test("Z2 returns −w·L₀/2 exactly", () => {
    const V0 = levelSpanShortcut({
      L: Z2.in.L,
      h: Z2.in.h,
      L0: Z2.in.L0,
      w: Z2.in.w,
      EA: Z2.in.EA,
      loads: [],
    });
    expect(V0).toBe((-Z2.in.w * Z2.in.L0) / 2);
    expect(V0).toBe(Z2.out.V0);
  });

  test("an inclined span is not eligible", () => {
    expect(
      levelSpanShortcut({
        L: Z3.in.L,
        h: Z3.in.h,
        L0: Z3.in.L0,
        w: Z3.in.w,
        EA: Z3.in.EA,
        loads: [],
      }),
    ).toBeNull();
  });

  test("a loaded level span is not eligible — the symmetry argument needs loads: []", () => {
    expect(
      levelSpanShortcut({
        L: Z4.in.L,
        h: Z4.in.h,
        L0: Z4.in.L0,
        w: Z4.in.w,
        EA: Z4.in.EA,
        loads: [{ P: Z4.in.P, s: Z4.out.sP }],
      }),
    ).toBeNull();
  });
});

describe("sampleCable", () => {
  const state = stateOf({ H: Z1.out.H, V0: Z1.out.V0, w: Z1.in.w, EA: Z1.in.EA, L0: Z1.in.L0 });

  test("returns 2·(n+1) interleaved x, z", () => {
    expect(sampleCable(state, 1).length).toBe(4);
    expect(sampleCable(state, 240).length).toBe(2 * 241);
  });

  test("the ends are the anchors: s = 0 exactly, s = L₀ exactly", () => {
    const samples = sampleCable(state, 37);
    expect(samples[0]).toBe(0);
    expect(samples[1]).toBe(0);
    expect(samples[2 * 37]).toBe(xAt(state, state.L0));
    expect(samples[2 * 37 + 1]).toBe(zAt(state, state.L0));
  });

  test("every sample is x(s), z(s) at uniform s — analytic, never interpolated", () => {
    const n = 16;
    const samples = sampleCable(state, n);
    for (let i = 0; i <= n; i++) {
      const s = (state.L0 * i) / n;
      expect(samples[2 * i]).toBeCloseTo(xAt(state, s), 9);
      expect(samples[2 * i + 1]).toBeCloseTo(zAt(state, s), 9);
    }
  });

  test("it is pure: same state in, same numbers out, state untouched", () => {
    const before = structuredClone(state);
    const a = sampleCable(state, 64);
    const b = sampleCable(state, 64);
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(state).toEqual(before);
  });

  test("n must be a positive integer — a bad n is a caller bug, not a physics failure", () => {
    expect(() => sampleCable(state, 0)).toThrow(RangeError);
    expect(() => sampleCable(state, -3)).toThrow(RangeError);
    expect(() => sampleCable(state, 2.5)).toThrow(RangeError);
  });
});

describe("a loaded state samples through its kink — §6.1's piecewise V(s)", () => {
  // Z4's statics belong to `loads.test.ts`; what is asserted here is that feeding its solved pair
  // and its node back through §4.1 reproduces the node and closes on the far anchor. Without the
  // piecewise restart, neither does.
  const state = stateOf({
    H: Z4.out.H,
    V0: Z4.out.V0,
    w: Z4.in.w,
    EA: Z4.in.EA,
    L0: Z4.in.L0,
    loads: [{ P: Z4.in.P, s: Z4.out.sP }],
  });

  test("V(s) jumps by P across the node and is continuous elsewhere", () => {
    const sP = Z4.out.sP;
    expect(verticalTensionAt(state, sP + 1e-9) - verticalTensionAt(state, sP - 1e-9)).toBeCloseTo(
      Z4.in.P,
      6,
    );
    expect(verticalTensionAt(state, 0)).toBe(Z4.out.V0);
  });

  test("the node is at (x_D, z_D) = (50, −5.31434)", () => {
    expect(Math.abs(xAt(state, Z4.out.sP) - Z4.in.xD)).toBeLessThan(1e-4);
    expect(relativeError(zAt(state, Z4.out.sP), Z4.out.zD)).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("the far anchor closes on (L, h) = (100, 0)", () => {
    expect(Math.abs(xAt(state, Z4.in.L0) - Z4.in.L)).toBeLessThan(1e-4);
    expect(Math.abs(zAt(state, Z4.in.L0) - Z4.in.h)).toBeLessThan(1e-4);
  });

  test("x and z stay continuous at the node — only the slope breaks", () => {
    const sP = Z4.out.sP;
    expect(xAt(state, sP + 1e-9) - xAt(state, sP - 1e-9)).toBeLessThan(1e-8);
    expect(Math.abs(zAt(state, sP + 1e-9) - zAt(state, sP - 1e-9))).toBeLessThan(1e-8);
    const slopeBefore = (zAt(state, sP) - zAt(state, sP - 1e-3)) / 1e-3;
    const slopeAfter = (zAt(state, sP + 1e-3) - zAt(state, sP)) / 1e-3;
    expect(slopeAfter - slopeBefore).toBeGreaterThan(0.1);
  });

  test("the loads are read in s order whatever order they arrive in", () => {
    const shuffled = stateOf({
      H: Z4.out.H,
      V0: Z4.out.V0,
      w: Z4.in.w,
      EA: Z4.in.EA,
      L0: Z4.in.L0,
      loads: [
        { P: Z4.in.P / 2, s: 70 },
        { P: Z4.in.P / 2, s: 20 },
      ],
    });
    const ordered = stateOf({
      H: Z4.out.H,
      V0: Z4.out.V0,
      w: Z4.in.w,
      EA: Z4.in.EA,
      L0: Z4.in.L0,
      loads: [
        { P: Z4.in.P / 2, s: 20 },
        { P: Z4.in.P / 2, s: 70 },
      ],
    });
    expect(xAt(shuffled, Z4.in.L0)).toBe(xAt(ordered, Z4.in.L0));
    expect(zAt(shuffled, Z4.in.L0)).toBe(zAt(ordered, Z4.in.L0));
    expect(shuffled.loads.map((load) => load.s)).toEqual([70, 20]);
  });
});
