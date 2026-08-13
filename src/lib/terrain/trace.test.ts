import { describe, expect, test } from "vitest";

import { zGroundAt } from "@/lib/sim";

import type { Trace } from "./trace.ts";

import { altitudeAt, deriveSpan, deriveTerrain, maxSpacing, traceExtent } from "./trace.ts";

/**
 * The Trace and its one seam — « v1 build spec » § 4 (*La Trace est immuable ; le `Terrain` est
 * dérivé à un seul joint*, *Placement des ancrages*).
 *
 * The cases that matter are the post-conditions, not the arithmetic: `xs[0] === 0` and
 * `xs[last] === L` **exactly**, because without the synthesised endpoints `zGroundAt` would
 * extrapolate at the span's ends — which is where the anchors are and where the clearance
 * read-outs get the most scrutiny — and `trace` unmutated, because re-anchoring has to stay
 * possible for ever.
 */

function trace(d: readonly number[], z: readonly number[]): Trace {
  return { d: Float64Array.from(d), z: Float64Array.from(z), dev: null, fileName: "t.csv" };
}

/** A profile whose altitude is exactly `600 − d/5`, so every interpolation has a closed form. */
const RAMP = trace([0, 50, 100, 150, 200, 250, 300], [600, 590, 580, 570, 560, 550, 540]);

describe("altitudeAt", () => {
  test("reads a sample exactly and interpolates linearly between two", () => {
    expect(altitudeAt(RAMP, 100)).toBeCloseTo(580, 12);
    expect(altitudeAt(RAMP, 62)).toBeCloseTo(587.6, 12);
    expect(altitudeAt(RAMP, 245)).toBeCloseTo(551, 12);
  });

  test("holds the ends rather than extrapolating — a station off the trace is a blocked placement", () => {
    expect(altitudeAt(RAMP, -40)).toBe(600);
    expect(altitudeAt(RAMP, 999)).toBe(540);
  });
});

describe("traceExtent and maxSpacing", () => {
  test("report the file's own grain, not a nominal pitch", () => {
    const uneven = trace([0, 0.9, 1.8, 2.8, 10.3], [10, 10, 9, 9, 8]);
    expect(traceExtent(uneven)).toBeCloseTo(10.3, 12);
    expect(maxSpacing(uneven)).toBeCloseTo(7.5, 12);
  });

  test("a one-point trace has no spacing to report", () => {
    expect(maxSpacing(trace([12], [500]))).toBe(0);
  });
});

describe("deriveSpan", () => {
  /**
   * § 4's worked placement: stations 62,0 / 245,0 with anchor heights 4,0 / 2,5. Its sketch prints
   * `h −38,6`, which is the difference of the two **base** altitudes; the section's own formula
   * `h = (z(d_B) + hauteur_B) − (z(d_A) + hauteur_A)` is what `solveSpan` needs (anchor top to
   * anchor top) and it governs — the two anchor heights differ by 1,5 m, hence −40,1.
   */
  test("L is d_B − d_A, and h is measured anchor top to anchor top", () => {
    const profile = trace([0, 62, 245, 300], [560, 540.4, 501.8, 495]);
    const span = deriveSpan(profile, { station: 62, height: 4 }, { station: 245, height: 2.5 });
    expect(span.L).toBeCloseTo(183, 12);
    expect(span.h).toBeCloseTo(-40.1, 12);
    expect(span.zBaseA).toBeCloseTo(540.4, 12);
    expect(span.zBaseB).toBeCloseTo(501.8, 12);
  });
});

describe("deriveTerrain", () => {
  const A = { station: 62, height: 4 };
  const B = { station: 245, height: 2.5 };

  test("subtracts d_A, slices to [0, L] and inserts interpolated endpoints", () => {
    const terrain = deriveTerrain(RAMP, A, B);
    if (terrain.kind !== "profile") throw new Error("expected a profile terrain");

    // 62 and 245 both land between samples, so the interior is 100 / 150 / 200 only.
    expect(Array.from(terrain.xs)).toEqual([0, 38, 88, 138, 183]);
    expect(terrain.xs[0]).toBe(0);
    expect(terrain.xs[terrain.xs.length - 1]).toBe(183);
  });

  test("z is the anchor-A-top frame the cable is compared in", () => {
    const terrain = deriveTerrain(RAMP, A, B);
    if (terrain.kind !== "profile") throw new Error("expected a profile terrain");

    const { L, h } = deriveSpan(RAMP, A, B);
    // Anchor A's base sits exactly `hauteur_A` below the origin, B's exactly `hauteur_B` below h.
    expect(terrain.zs[0]).toBe(-A.height);
    expect(terrain.zs[terrain.zs.length - 1]).toBeCloseTo(h - B.height, 12);
    // An interior sample keeps its own altitude, shifted by the same datum.
    expect(terrain.zs[1]).toBeCloseTo(580 - (587.6 + A.height), 12);
    expect(L).toBeCloseTo(183, 12);
  });

  test("zGroundAt never extrapolates inside the span", () => {
    const terrain = deriveTerrain(RAMP, A, B);
    if (terrain.kind !== "profile") throw new Error("expected a profile terrain");

    // The ends are the synthesised endpoints, not a held clamp of the nearest file sample.
    expect(zGroundAt(terrain, 0)).toBe(terrain.zs[0]);
    expect(zGroundAt(terrain, 183)).toBe(terrain.zs[terrain.zs.length - 1]);
    // The ramp descends 0,2 m per metre in the file frame, and the datum shift is a constant.
    expect(zGroundAt(terrain, 91.5) - zGroundAt(terrain, 0)).toBeCloseTo(-18.3, 10);
  });

  test("xs stay strictly increasing when an anchor lands exactly on a sample", () => {
    const terrain = deriveTerrain(RAMP, { station: 50, height: 3 }, { station: 250, height: 3 });
    if (terrain.kind !== "profile") throw new Error("expected a profile terrain");

    expect(Array.from(terrain.xs)).toEqual([0, 50, 100, 150, 200]);
    for (let i = 1; i < terrain.xs.length; i++) {
      expect(terrain.xs[i]).toBeGreaterThan(terrain.xs[i - 1]);
    }
  });

  test("a span between two samples still yields the two-point case", () => {
    const terrain = deriveTerrain(RAMP, { station: 60, height: 0 }, { station: 70, height: 0 });
    if (terrain.kind !== "profile") throw new Error("expected a profile terrain");

    expect(Array.from(terrain.xs)).toEqual([0, 10]);
    expect(terrain.zs[0]).toBeCloseTo(0, 12);
    expect(terrain.zs[1]).toBeCloseTo(-2, 12);
  });

  test("moving an anchor is a different derivation, never a mutation of the Trace", () => {
    const before = { d: Array.from(RAMP.d), z: Array.from(RAMP.z) };
    deriveTerrain(RAMP, A, B);
    deriveTerrain(RAMP, { station: 10, height: 1 }, { station: 290, height: 1 });
    expect(Array.from(RAMP.d)).toEqual(before.d);
    expect(Array.from(RAMP.z)).toEqual(before.z);
  });

  test("the degenerate placement station B ≤ station A is a caller bug, not a terrain", () => {
    expect(() => deriveTerrain(RAMP, B, A)).toThrow(RangeError);
    expect(() => deriveTerrain(RAMP, A, { station: 62, height: 1 })).toThrow(RangeError);
  });
});
