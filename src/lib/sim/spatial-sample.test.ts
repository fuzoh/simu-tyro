/**
 * §19.8's sampling and §19.7's readings. Oracles: determinism (the re-shot is the solve's), the
 * closed-form flèche `unloadedSag` and §15's Z3, and hand-built lines whose extrema are worked out
 * by hand — so that « combine at each point, then maximise » is checked against an answer the
 * reader did not produce.
 */

import { describe, expect, it } from "vitest";

import type { LineAero } from "./types.ts";

import { TOLERANCE, Z3 } from "./__fixtures__/theory-15.ts";
import { unloadedSag } from "./parameterise.ts";
import {
  hermiteAt,
  planeStateOf,
  readExtrema,
  sampleSpatial,
  unloadedReadings,
  type SpatialSamples,
} from "./spatial-sample.ts";
import { solveSpatial } from "./spatial-solve.ts";

const rel = (value: number, expected: number) => Math.abs(value / expected - 1);

const WIND: LineAero = {
  field: { speed: 18, from: 60, profile: { width: 50, attenuation: 40 } },
  bearing: 0,
  rho: 1.225,
  d: 0.012,
  CDn: 1.2,
};
const LINE = { L: 150, h: -18, L0: 151.644, w: 0.5465 * 9.81, EA: 6.9e6 } as const;

function solved(input: Parameters<typeof solveSpatial>[0]) {
  const result = solveSpatial(input);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result;
}

/**
 * A hand-built line `x = S`, `drop(x) = A·sin(πx/L)` below A–B, `y(x) = B·sin(lobes·πx/L)`, B at
 * height `h`, sampled on `n` steps. `dr/dS = λ·F/T` is honoured with `EA = 1`: `T = |dr/dS| − 1`,
 * `F = T·(dr/dS)/|dr/dS|` — which needs `dr/dS` off the axis everywhere, so `T > 0`.
 */
function handBuilt(A: number, B: number, lobes = 2, h = 0, n = 400, L = 10): SpatialSamples {
  const count = n + 1;
  const arrays = Array.from({ length: 8 }, () => new Float64Array(count));
  const [S, x, y, z, Fx, Fy, Fz, T] = arrays;
  for (let i = 0; i < count; i++) {
    const X = (L * i) / n;
    const k = Math.PI / L;
    const d = [1, lobes * k * B * Math.cos(lobes * k * X), h / L - k * A * Math.cos(k * X)];
    const lambda = Math.hypot(...d);
    S[i] = X;
    x[i] = X;
    y[i] = B * Math.sin(lobes * k * X);
    z[i] = (h * X) / L - A * Math.sin(k * X);
    T[i] = lambda - 1;
    Fx[i] = (T[i] * d[0]) / lambda;
    Fy[i] = (T[i] * d[1]) / lambda;
    Fz[i] = (T[i] * d[2]) / lambda;
  }
  return { S, x, y, z, Fx, Fy, Fz, T, EA: 1, node: -1 };
}

describe("sampleSpatial — §19.8's re-shot", () => {
  it("re-runs the solve's own shot: its end is the state's F(L₀), bit for bit", () => {
    const { state } = solved({
      ...LINE,
      aero: WIND,
      rider: { sP: 60, weight: 883, share: 1, hRider: 2.1 },
    });
    const s = sampleSpatial(state);
    const last = s.S.length - 1;
    expect([s.Fx[last], s.Fy[last], s.Fz[last]]).toEqual([state.FB.x, state.FB.y, state.FB.z]);
    expect([s.Fx[0], s.Fy[0], s.Fz[0]]).toEqual([state.FA.x, state.FA.y, state.FA.z]);
    expect([s.x[s.node], s.y[s.node], s.z[s.node]]).toEqual([
      state.node?.rD.x,
      state.node?.rD.y,
      state.node?.rD.z,
    ]);
    expect(sampleSpatial(state)).toEqual(s);
  });

  it("lists the trolley's node twice, at S_P⁻ then S_P⁺", () => {
    const { state } = solved({
      ...LINE,
      aero: WIND,
      rider: { sP: 60, weight: 883, share: 1, hRider: 2.1 },
    });
    const s = sampleSpatial(state);
    expect(s.S[s.node]).toBe(60);
    expect(s.S[s.node + 1]).toBe(60);
    expect(s.T[s.node]).toBe(state.node?.Tminus);
    expect(s.T[s.node + 1]).toBe(state.node?.Tplus);
  });

  it("samples the closed form on §4.1 with y ≡ 0", () => {
    const { state } = solved({ ...Z3.in, aero: null, rider: null });
    const s = sampleSpatial(state);
    expect(state.method).toBe("closed-form");
    expect(s.y.every((v) => v === 0)).toBe(true);
    expect(Math.abs(s.x[s.S.length - 1] - Z3.in.L)).toBeLessThan(1e-6);
    expect(Math.abs(s.z[s.S.length - 1] - Z3.in.h)).toBeLessThan(1e-6);
  });

  it("interpolates through the nodes: t = 0 and t = 1 are the nodes themselves", () => {
    const { state } = solved({ ...LINE, aero: WIND, rider: null });
    const s = sampleSpatial(state);
    const a = hermiteAt(s, 40, 0);
    const b = hermiteAt(s, 40, 1);
    expect([a.x, a.y, a.z]).toEqual([s.x[40], s.y[40], s.z[40]]);
    expect(b.x).toBeCloseTo(s.x[41], 12);
    expect(b.z).toBeCloseTo(s.z[41], 12);
  });
});

describe("readExtrema — §19.7's readings on the Hermite interpolant", () => {
  it("reads Z3's flèche as the closed form does, between nodes, within 10⁻⁹ m", () => {
    const { state } = solved({ ...Z3.in, aero: null, rider: null });
    const read = readExtrema(sampleSpatial(state), Z3.in);
    const exact = unloadedSag(planeStateOf(state), Z3.in);
    expect(Math.abs(read.sag.value - exact.D)).toBeLessThan(1e-9);
    expect(rel(read.sag.value, Z3.out.D)).toBeLessThan(TOLERANCE.solvedScalar * 2);
    expect(Math.abs(read.sag.atX - exact.atX)).toBeLessThan(1e-6);
    // A sagging plane line never rises over A–B; what the interpolant reads near A is rounding,
    // four orders under §19.9's length bar.
    expect(read.rise.value).toBeLessThan(1e-9);
    expect(read.lateral.value).toBe(0);
    expect(read.lateral.atX).toBeNaN();
  });

  it("combines drop and y at each point before maximising (#127 Q10, Q30)", () => {
    // drop = sin(πξ), y = sin(2πξ): each peaks at 1, at ξ = ½ and ξ = ¼. The combined
    // E² = s² + 4s²(1 − s²), s = sin πξ, peaks at s² = 5/8 with E² = 25/16: E = 1,25 — not √2,
    // the two maxima combined, and not 1.
    const read = readExtrema(handBuilt(1, 1), { L: 10, h: 0 });
    expect(read.sag.value).toBeCloseTo(1, 9);
    expect(read.sag.atX).toBeCloseTo(5, 6);
    expect(read.lateral.value).toBeCloseTo(1, 9);
    expect(read.lateral.atX).toBeCloseTo(2.5, 6);
    expect(read.ecart.value).toBeCloseTo(1.25, 9);
    // ξ with sin²(πξ) = 5/8, on the first half.
    expect(read.ecart.atX).toBeCloseTo((10 / Math.PI) * Math.asin(Math.sqrt(5 / 8)), 5);
  });

  it("signs the lateral offset: the greatest |y| to the right is negative", () => {
    // y = −0,7·sin(πξ), one lobe to the right, on a line rising 2 m so its slope is never on the axis.
    const read = readExtrema(handBuilt(0.2, -0.7, 1, 2), { L: 10, h: 2 });
    expect(read.lateral.value).toBeCloseTo(-0.7, 9);
    expect(read.lateral.atX).toBeCloseTo(5, 6);
  });

  it("reads a lifted line as D = 0 and reports its rise beside it (§19.7)", () => {
    // drop = −0,4·sin(πξ): above A–B everywhere; a small two-lobed y keeps the slope off the axis.
    const read = readExtrema(handBuilt(-0.4, 0.05), { L: 10, h: 0 });
    expect(read.sag.value).toBe(0);
    expect(read.sag.atX).toBeNaN();
    expect(read.rise.value).toBeCloseTo(0.4, 9);
    expect(read.rise.atX).toBeCloseTo(5, 6);
  });
});

describe("unloadedReadings — the unloaded line under the Scenario's wind", () => {
  it("is unloadedSag, bit for bit, without wind (§19.16)", () => {
    const { state } = solved({ ...LINE, aero: null, rider: null });
    const exact = unloadedSag(planeStateOf(state), LINE);
    const read = unloadedReadings(state);
    expect(read.sag).toEqual({ value: exact.D, atX: exact.atX });
    expect(read.lateral.value).toBe(0);
  });

  it("gives the écart at least the flèche and the lateral offset, under wind", () => {
    const { state } = solved({ ...LINE, aero: WIND, rider: null });
    const read = unloadedReadings(state);
    expect(read.lateral.value).toBeGreaterThan(0);
    expect(read.ecart.value).toBeGreaterThanOrEqual(read.sag.value);
    expect(read.ecart.value).toBeGreaterThanOrEqual(Math.abs(read.lateral.value));
    expect(read.ecart.value).toBeLessThanOrEqual(Math.hypot(read.sag.value, read.lateral.value));
  });
});
