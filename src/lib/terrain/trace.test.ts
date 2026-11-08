import { describe, expect, test } from "vitest";

import { zGroundAt } from "@/lib/sim";

import type { Trace } from "./trace.ts";

import { deriveSpan, deriveTerrain, maxSpacing, traceExtent } from "./trace.ts";

/**
 * The Trace and its one seam — « v1 build spec » § 4 (*La Trace est immuable ; le `Terrain` est
 * dérivé à un seul joint*), with #88's rule that the profil runs from anchor A to anchor B.
 *
 * The cases that matter are the post-conditions, not the arithmetic: `xs[0] === 0` and
 * `xs[last] === L` **exactly**, because the anchors stand on the two end samples and `zGroundAt`
 * must not extrapolate where the clearance read-outs get the most scrutiny — and `trace`
 * unmutated, because changing an anchor height has to stay a fresh derivation.
 */

function trace(d: readonly number[], z: readonly number[]): Trace {
  return { d: Float64Array.from(d), z: Float64Array.from(z), dev: null, fileName: "t.csv" };
}

/** A profile whose altitude is exactly `600 − d/5`, so every read-out has a closed form. */
const RAMP = trace([0, 50, 100, 150, 200, 250, 300], [600, 590, 580, 570, 560, 550, 540]);

describe("traceExtent and maxSpacing", () => {
  test("report the file's own grain, not a nominal pitch", () => {
    const uneven = trace([0, 0.9, 1.8, 2.8, 10.3], [10, 10, 9, 9, 8]);
    expect(traceExtent(uneven)).toBeCloseTo(10.3, 12);
    expect(maxSpacing(uneven)).toBeCloseTo(7.5, 12);
  });

  test("measure the extent from the first sample, not from 0", () => {
    expect(traceExtent(trace([12.5, 40, 183.4], [500, 498, 470]))).toBeCloseTo(170.9, 12);
  });

  test("a one-point trace has no spacing to report", () => {
    expect(maxSpacing(trace([12], [500]))).toBe(0);
  });
});

describe("deriveSpan — the whole profil, A over its first sample and B over its last", () => {
  test("L is the profil's extent, and h is measured anchor top to anchor top", () => {
    const span = deriveSpan(RAMP, { zA: 4, zB: 2.5 });
    expect(span.L).toBe(300);
    // (540 + 2,5) − (600 + 4): the two heights differ by 1,5 m on top of the 60 m of ground.
    expect(span.h).toBeCloseTo(-61.5, 12);
    expect(span.zBaseA).toBe(600);
    expect(span.zBaseB).toBe(540);
  });

  test("a profil that does not start at 0 still spans first sample to last", () => {
    const span = deriveSpan(trace([12.5, 40, 183.4], [500, 498, 470]), { zA: 1, zB: 1 });
    expect(span.L).toBeCloseTo(170.9, 12);
    expect(span.h).toBeCloseTo(-30, 12);
    expect(span.zBaseA).toBe(500);
    expect(span.zBaseB).toBe(470);
  });
});

describe("deriveTerrain", () => {
  test("shifts the file's distances so xs run from exactly 0 to exactly L, keeping every sample", () => {
    const offset = trace([12.4, 13.9, 15.4, 112.4], [500, 501, 502, 480]);
    const terrain = deriveTerrain(offset, 1);

    expect(terrain.xs).toHaveLength(4);
    expect(terrain.xs[0]).toBe(0);
    expect(terrain.xs[terrain.xs.length - 1]).toBe(deriveSpan(offset, { zA: 1, zB: 1 }).L);
    for (let i = 1; i < terrain.xs.length; i++) {
      expect(terrain.xs[i]).toBeGreaterThan(terrain.xs[i - 1]);
    }
  });

  test("z is the anchor-A-top frame the cable is compared in", () => {
    const anchors = { zA: 4, zB: 2.5 };
    const terrain = deriveTerrain(RAMP, anchors.zA);
    const { h } = deriveSpan(RAMP, anchors);

    // Anchor A's base sits exactly `hauteur_A` below the origin, B's exactly `hauteur_B` below h.
    expect(terrain.zs[0]).toBe(-anchors.zA);
    expect(terrain.zs[terrain.zs.length - 1]).toBeCloseTo(h - anchors.zB, 12);
    // An interior sample keeps its own altitude, shifted by the same datum.
    expect(terrain.zs[2]).toBeCloseTo(580 - (600 + anchors.zA), 12);
  });

  test("zGroundAt reads the file's own end samples at 0 and L", () => {
    const terrain = deriveTerrain(RAMP, 4);

    expect(zGroundAt(terrain, 0)).toBe(terrain.zs[0]);
    expect(zGroundAt(terrain, 300)).toBe(terrain.zs[terrain.zs.length - 1]);
    // The ramp descends 0,2 m per metre in the file frame, and the datum shift is a constant.
    expect(zGroundAt(terrain, 91.5) - zGroundAt(terrain, 0)).toBeCloseTo(-18.3, 10);
  });

  test("a new anchor height is a different derivation, never a mutation of the Trace", () => {
    const before = { d: Array.from(RAMP.d), z: Array.from(RAMP.z) };
    deriveTerrain(RAMP, 4);
    deriveTerrain(RAMP, 1);
    expect(Array.from(RAMP.d)).toEqual(before.d);
    expect(Array.from(RAMP.z)).toEqual(before.z);
  });
});
