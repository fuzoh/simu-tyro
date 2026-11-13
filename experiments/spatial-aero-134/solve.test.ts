import { describe, expect, it } from "vitest";

import { TOLERANCE, Z1, Z3, Z4 } from "@/lib/sim/__fixtures__/theory-15.ts";

import type { SpatialInput } from "./solve.ts";

import { NO_AERO } from "./aero.ts";
import { closureTolerance, pieceSteps, solveSpatial } from "./solve.ts";

const relativeError = (actual: number, expected: number): number =>
  Math.abs(actual - expected) / Math.abs(expected);

/** A line with no wind and no aerodynamic term: §4's plane catenary, posed in three dimensions. */
const calm = (line: Pick<SpatialInput, "L" | "h" | "L0" | "w" | "EA">): SpatialInput => ({
  ...line,
  d: 0.012,
  rho: 1.225,
  wind: { along: 0, across: 0 },
  aero: NO_AERO,
  rider: null,
});

function solved(input: SpatialInput, options?: Parameters<typeof solveSpatial>[1]) {
  const result = solveSpatial(input, options);
  if (!result.ok) throw new Error(`no solution: ${JSON.stringify(result.failure)}`);
  return result.solution;
}

describe("solveSpatial — the no-wind return to §15", () => {
  it("Z1: H, T_max, and V₀ = −w·L₀/2 on a level span", () => {
    const line = solved(calm(Z1.in));
    const last = line.S.length - 1;
    expect(relativeError(line.Fx[0], Z1.out.H)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(line.Fz[0]).toBeCloseTo(Z1.out.V0, 9);
    expect(line.Fz[last]).toBeCloseTo(Z1.out.VB, 9);
    expect(relativeError(Math.hypot(line.Fx[0], line.Fz[0]), Z1.out.Tmax)).toBeLessThan(
      TOLERANCE.solvedScalar,
    );
    // The line stays in the vertical plane of the anchors.
    expect(Math.max(...line.y.map(Math.abs))).toBe(0);
    expect(line.closure).toBeLessThan(closureTolerance(Z1.in.L));
  });

  it("Z3: an inclined span, both reactions and both end tensions", () => {
    const line = solved(calm(Z3.in));
    const last = line.S.length - 1;
    expect(relativeError(line.Fx[0], Z3.out.H)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(line.Fz[0], Z3.out.V0)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(line.Fz[last], Z3.out.VB)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(relativeError(Math.hypot(line.Fx[0], line.Fz[0]), Z3.out.TA)).toBeLessThan(
      TOLERANCE.solvedScalar,
    );
    expect(relativeError(Math.hypot(line.Fx[last], line.Fz[last]), Z3.out.TB)).toBeLessThan(
      TOLERANCE.solvedScalar,
    );
    expect(line.x[last]).toBeCloseTo(Z3.in.L, 6);
    expect(line.z[last]).toBeCloseTo(Z3.in.h, 6);
  });

  it("Z4: a rider at mid-line — H, the node's height and C11's reaction (w·L₀ + P)/2", () => {
    const line = solved({
      ...calm(Z4.in),
      rider: { s: Z4.out.sP, force: [0, 0, -Z4.in.P] },
    });
    const last = line.S.length - 1;
    const node = line.pieces[0].to;
    expect(relativeError(line.Fx[0], Z4.out.H)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(line.Fz[last]).toBeCloseTo(Z4.out.VB, 8);
    expect(line.Fz[0]).toBeCloseTo(Z4.out.V0, 8);
    expect(relativeError(line.z[node], Z4.out.zD)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(line.x[node]).toBeCloseTo(Z4.in.xD, 8);
  });
});

describe("solveSpatial — the rider's node (§18.2)", () => {
  const P = 1177;
  const line = solved({ ...calm(Z4.in), rider: { s: 30, force: [0, 0, -P] } });
  const [before, after] = line.pieces;

  it("appears twice, at the same place, in two pieces of even steps", () => {
    expect(line.pieces).toHaveLength(2);
    expect(after.from).toBe(before.to + 1);
    expect(line.S[before.to]).toBe(30);
    expect(line.S[after.from]).toBe(30);
    expect((before.to - before.from) % 2).toBe(0);
    expect((after.to - after.from) % 2).toBe(0);
    expect(line.x[after.from]).toBe(line.x[before.to]);
    expect(line.z[after.from]).toBe(line.z[before.to]);
  });

  it("carries the jump F⁺ − F⁻ = −P_ext: a weight raises the vertical component by P", () => {
    expect(line.Fz[after.from] - line.Fz[before.to]).toBeCloseTo(P, 9);
    expect(line.Fx[after.from]).toBe(line.Fx[before.to]);
  });

  it("splits the steps in proportion to the two lengths, both even", () => {
    expect(pieceSteps(240, 100, null)).toEqual([240]);
    expect(pieceSteps(240, 100, { s: 50, force: [0, 0, -1] })).toEqual([120, 120]);
    expect(pieceSteps(240, 100, { s: 30, force: [0, 0, -1] })).toEqual([72, 168]);
    // A rider next to an anchor still gets two steps on its short side.
    expect(pieceSteps(240, 100, { s: 0.01, force: [0, 0, -1] })).toEqual([2, 238]);
    expect(pieceSteps(240, 100, { s: 99.99, force: [0, 0, -1] })).toEqual([238, 2]);
  });
});

describe("solveSpatial — what the equations assume", () => {
  it("a taut line without weight carries T = EA·(L/L₀ − 1), the stretch that closes the anchors", () => {
    const input: SpatialInput = { ...calm({ L: 100.1, h: 0, L0: 100, w: 0, EA: 1e7 }) };
    const line = solved(input, { seed: [9000, 0, 0] });
    // 10⁷ × 0,001 = 10 000 N.
    expect(line.Fx[0]).toBeCloseTo(10000, 4);
    expect(line.Fy[0]).toBe(0);
    expect(line.Fz[0]).toBe(0);
  });

  it("without wind the aerodynamic coefficients change nothing", () => {
    const bare = solved(calm(Z3.in));
    const loaded = solved({
      ...calm(Z3.in),
      aero: { normal: 1.2, lift: 0.5, liftLaw: "binormal", axial: 0.1 },
    });
    expect(loaded.Fx[0]).toBe(bare.Fx[0]);
    expect(loaded.Fz[0]).toBe(bare.Fz[0]);
  });

  it("a crosswind pushes the line downwind and raises the tension", () => {
    const still = solved(calm(Z1.in));
    const blown = solved({
      ...calm(Z1.in),
      wind: { along: 0, across: 20 },
      aero: { ...NO_AERO, normal: 1.2 },
    });
    const middle = (blown.S.length - 1) / 2;
    expect(blown.y[middle]).toBeGreaterThan(0.5);
    expect(blown.Fy[0]).toBeGreaterThan(0);
    expect(Math.hypot(blown.Fx[0], blown.Fy[0], blown.Fz[0])).toBeGreaterThan(
      Math.hypot(still.Fx[0], still.Fz[0]),
    );
  });
});

describe("solveSpatial — failure is a value", () => {
  it.each([
    ["L0", { L0: 0 }],
    ["EA", { EA: -1 }],
    ["w", { w: Number.NaN }],
    ["h", { h: Infinity }],
  ] as const)("refuses %s", (field, patch) => {
    const result = solveSpatial({ ...calm(Z1.in), ...patch });
    expect(result).toMatchObject({ ok: false, failure: { kind: "invalid-input", field } });
  });

  it("refuses a rider outside the line and an odd number of steps", () => {
    const outside = solveSpatial({ ...calm(Z1.in), rider: { s: 100.5, force: [0, 0, -1] } });
    expect(outside).toMatchObject({
      ok: false,
      failure: { kind: "invalid-input", field: "rider.s" },
    });
    const odd = solveSpatial(calm(Z1.in), { steps: 241 });
    expect(odd).toMatchObject({ ok: false, failure: { kind: "invalid-input", field: "steps" } });
  });

  it("reports a line it cannot start as a non-convergence, never as a neighbour's line", () => {
    // No weight: the engine has no plane line to offer, and no seed was given.
    const result = solveSpatial({ ...calm({ ...Z1.in, w: 0 }), wind: { along: 0, across: 20 } });
    expect(result).toMatchObject({ ok: false, failure: { kind: "no-convergence", iterations: 0 } });
  });

  it("reports the closure it reached when Newton does not close the anchors", () => {
    // A weightless line shot along the chord but 0,5 m too long: it cannot be straight, and
    // with no load it has no shape either — the anchors stay open.
    const result = solveSpatial(calm({ L: 100, h: 0, L0: 100.5, w: 0, EA: 1e7 }), {
      seed: [100, 0, 0],
    });
    expect(result.ok).toBe(false);
    if (result.ok || result.failure.kind !== "no-convergence") return;
    expect(result.failure.closure).toBeGreaterThan(closureTolerance(100));
  });
});

describe("closureTolerance — §5.3", () => {
  it("is 10⁻⁶ m up to 1000 m of span and 10⁻⁶·L beyond", () => {
    expect(closureTolerance(150)).toBe(1e-6);
    expect(closureTolerance(1000)).toBe(1e-6);
    expect(closureTolerance(2000)).toBeCloseTo(2e-3, 15);
  });
});
