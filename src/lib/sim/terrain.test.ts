import { describe, expect, test } from "vitest";

import type { Terrain } from "./types.ts";

import { zGroundAt } from "./terrain.ts";

/**
 * `zGroundAt` — the engine's only terrain seam. There is no §15 fixture here and there is nothing
 * to measure: the function is linear interpolation with held ends, so every case below is a
 * **geometric identity** rather than a value.
 *
 * Three properties this file exists to pin down:
 *
 * - **Manual ground is the two-point case of `profile`, not a fourth kind.** A `flat` terrain and
 *   a two-point `profile` with equal `zs` must agree **exactly**, everywhere — that identity is
 *   what lets §11 clearance be live from first launch with no import and no branch.
 * - **The ends are held, never extrapolated.** The shared x domain runs to `portée + 5 %`, so
 *   `zGroundAt` is asked for ground beyond the profile on every render.
 * - **The binary search finds the same segment a linear scan would.** It is asserted against an
 *   independent walk over a deliberately non-uniform profile, because an off-by-one in the
 *   bracket is invisible on a uniform grid.
 */

/** A profile from plain arrays — the shape § 4's derivation seam hands the engine. */
function profile(xs: number[], zs: number[]): Terrain {
  return { kind: "profile", xs: Float64Array.from(xs), zs: Float64Array.from(zs) };
}

/** § 4's manual ground: the straight line between the two anchor bases, in the anchor-A frame. */
function manualGround(L: number, zBaseA: number, zBaseB: number): Terrain {
  return profile([0, L], [zBaseA, zBaseB]);
}

/** An independent bracket-and-lerp, deliberately written as the linear scan the module is not. */
function interpolateByScan(xs: number[], zs: number[], x: number): number {
  if (x <= xs[0]) return zs[0];
  if (x >= xs[xs.length - 1]) return zs[zs.length - 1];
  for (let i = 1; i < xs.length; i++) {
    if (x < xs[i]) {
      return zs[i - 1] + ((x - xs[i - 1]) / (xs[i] - xs[i - 1])) * (zs[i] - zs[i - 1]);
    }
  }
  return zs[zs.length - 1];
}

describe("flat — one height, everywhere, including outside any span", () => {
  const flat: Terrain = { kind: "flat", z: -8 };

  test("answers its own `z` at every x", () => {
    for (const x of [-1e6, -0.001, 0, 37.4, 150, 1e6]) {
      expect(zGroundAt(flat, x)).toBe(-8);
    }
  });
});

describe("manual ground is the two-point case of `profile`", () => {
  const L = 150;
  const level = manualGround(L, -12, -12);
  const tilted = manualGround(L, -12, -30);

  test("a level two-point profile equals `flat`, to the bit", () => {
    const flat: Terrain = { kind: "flat", z: -12 };
    for (const x of [-10, 0, 1, 74.117, 150, 200]) {
      expect(zGroundAt(level, x)).toBe(zGroundAt(flat, x));
    }
  });

  test("the tilted plane is exact at both anchors and linear between them", () => {
    expect(zGroundAt(tilted, 0)).toBe(-12);
    expect(zGroundAt(tilted, L)).toBe(-30);
    expect(zGroundAt(tilted, L / 2)).toBeCloseTo(-21, 12);
    // Linearity, read as equal slopes over two disjoint intervals.
    const slope = (a: number, b: number) => (zGroundAt(tilted, b) - zGroundAt(tilted, a)) / (b - a);
    expect(slope(10, 20)).toBeCloseTo(slope(100, 140), 12);
    expect(slope(10, 20)).toBeCloseTo(-18 / L, 12);
  });
});

describe("the ends are held, never extrapolated", () => {
  // A trace whose extent is narrower than the shared x domain, which runs to portée + 5 %.
  const trace = profile([0, 50, 120], [-4, -9, -6]);

  test("before the first sample and after the last, the end value is repeated", () => {
    expect(zGroundAt(trace, -0.001)).toBe(-4);
    expect(zGroundAt(trace, -1000)).toBe(-4);
    expect(zGroundAt(trace, 120.001)).toBe(-6);
    expect(zGroundAt(trace, 1000)).toBe(-6);
  });

  test("the endpoints themselves are the file's own values, not an interpolation of them", () => {
    expect(zGroundAt(trace, 0)).toBe(-4);
    expect(zGroundAt(trace, 120)).toBe(-6);
  });

  test("an interior vertex is hit exactly", () => {
    expect(zGroundAt(trace, 50)).toBe(-9);
  });
});

describe("interpolation on an irregular profile", () => {
  // Non-uniform spacing on purpose: a uniform grid hides an off-by-one in the bracket.
  const xs = [0, 0.5, 3, 3.25, 40, 41, 180, 224];
  const zs = [-4, -4.2, -11, -10.5, -33, -33.1, -12, -6];
  const trace = profile(xs, zs);

  test("agrees with an independent linear scan across the whole domain", () => {
    for (let x = -5; x <= 230; x += 0.13) {
      expect(zGroundAt(trace, x)).toBeCloseTo(interpolateByScan(xs, zs, x), 12);
    }
  });

  test("agrees with the scan at every vertex, and just either side of it", () => {
    for (const v of xs) {
      for (const x of [v - 1e-9, v, v + 1e-9]) {
        expect(zGroundAt(trace, x)).toBeCloseTo(interpolateByScan(xs, zs, x), 12);
      }
    }
  });

  test("stays inside the bracketing pair's own z range", () => {
    for (let x = 0; x <= 224; x += 0.37) {
      const z = zGroundAt(trace, x);
      expect(z).toBeGreaterThanOrEqual(Math.min(...zs));
      expect(z).toBeLessThanOrEqual(Math.max(...zs));
    }
  });
});

describe("degenerate profiles answer rather than divide", () => {
  test("a single sample is that sample, everywhere", () => {
    const one = profile([42], [-7]);
    expect(zGroundAt(one, -1)).toBe(-7);
    expect(zGroundAt(one, 42)).toBe(-7);
    expect(zGroundAt(one, 1000)).toBe(-7);
  });

  test("a duplicated x — upstream's `distance-dupliquée` — never divides by zero", () => {
    const duplicated = profile([0, 10, 10, 20], [-1, -5, -6, -2]);
    // The bracket lands on the segment *after* the repeat, so the later z is the one read.
    expect(zGroundAt(duplicated, 10)).toBe(-6);
    for (let x = -5; x <= 25; x += 0.25)
      expect(Number.isFinite(zGroundAt(duplicated, x))).toBe(true);
    expect(zGroundAt(duplicated, 15)).toBeCloseTo(-4, 12);
  });
});
