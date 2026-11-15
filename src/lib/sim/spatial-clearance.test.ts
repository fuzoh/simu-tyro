/**
 * §19.13's clearance on the extruded terrain. Oracles: §11's `evaluateClearance` without wind (bit
 * for bit) and its `[MEASURED]` first-run figure; the definition `z − z_profil(x) − h_rider` read
 * at the trolley's own node; a terrain vertex placed between two nodes; and a hand-built line whose
 * `x(S)` turns back across a zone edge, whose garde at every crossing is worked out by hand
 * (`vi.mock` on the sampler, the one way to hold `x(S)` to a shape the test chose).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LineAero, SpatialSpanInput, SpatialSweepResult, Terrain } from "./types.ts";

import { FIRST_RUN_CLEARANCE, GROUND_CONTACT_CABLE, TOLERANCE } from "./__fixtures__/theory-15.ts";
import { evaluateClearance } from "./clearance.ts";
import { evaluateSpatialClearance } from "./spatial-clearance.ts";
import { sampleSpatial, type SpatialSamples } from "./spatial-sample.ts";
import { slotState, sweepSpatial } from "./spatial-sweep.ts";
import { sweep } from "./sweep.ts";

/** Samples the sampler returns instead of re-shooting, when a test sets them. */
const inject = vi.hoisted(() => ({ samples: null as SpatialSamples | null }));

vi.mock("./spatial-sample.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("./spatial-sample.ts")>();
  return {
    ...real,
    sampleSpatial: (...args: Parameters<typeof real.sampleSpatial>) =>
      inject.samples ?? real.sampleSpatial(...args),
  };
});

beforeEach(() => {
  inject.samples = null;
});

const WIND: LineAero = {
  field: { speed: 20, from: 90, profile: { width: 50, attenuation: 40 } },
  bearing: 0,
  rho: 1.225,
  d: 0.012,
  CDn: 1.2,
};
const RIDER = { weight: FIRST_RUN_CLEARANCE.in.P, share: 1, hRider: 2.1 } as const;
const LINE: SpatialSpanInput = {
  L: 150,
  h: -18,
  L0: 151.644,
  w: FIRST_RUN_CLEARANCE.in.w,
  EA: FIRST_RUN_CLEARANCE.in.EA,
  aero: WIND,
  rider: null,
};

function measuredOffBy(actual: number, expected: number, decimals: number): number {
  const bar = Math.max(TOLERANCE.measured * Math.abs(expected), 0.5 * 10 ** -decimals);
  return Math.abs(actual - expected) / bar;
}

describe("without wind — §11's evaluateClearance, bit for bit (§19.16)", () => {
  const { in: given, out: measured } = FIRST_RUN_CLEARANCE;
  const terrain: Terrain = {
    kind: "profile",
    xs: Float64Array.from([0, given.L]),
    zs: Float64Array.from([-given.anchorHeight, given.h - given.anchorHeight]),
  };
  const input = { L: given.L, h: given.h, L0: given.L0, w: given.w, EA: given.EA };
  const rider = { weight: given.P, share: 1, hRider: given.hRider };

  for (const zone of [0, 10]) {
    it(`reproduces the plane reduction${zone > 0 ? ` with ${zone} m Zones d'ancrage` : ""}`, () => {
      const swept = sweepSpatial({ ...input, aero: null, rider: null }, rider);
      const spatial = evaluateSpatialClearance(swept, terrain, given.hRider, zone);
      const plane = sweep({ ...input, loads: [] }, given.P);
      const reference = evaluateClearance(
        { ...input, loads: [] },
        given.P,
        plane.steps,
        terrain,
        given.hRider,
        given.samplesPerStep,
        zone,
      );
      expect(spatial).toEqual(reference);
    });
  }

  it("keeps the first run's [MEASURED] garde, 2,42 m at x 74,4", () => {
    const swept = sweepSpatial({ ...input, aero: null, rider: null }, rider);
    const clearance = evaluateSpatialClearance(swept, terrain, given.hRider);
    expect(measuredOffBy(clearance.hMin, measured.hMin, 2)).toBeLessThanOrEqual(1);
    expect(measuredOffBy(clearance.atX, measured.atX, 1)).toBeLessThanOrEqual(1);
    expect(clearance.contact).toBe("none");
  });

  it("keeps the deep-slack cable contact of [MEASURED] « le mou profond converge »", () => {
    const g = GROUND_CONTACT_CABLE.in;
    const terrain: Terrain = {
      kind: "profile",
      xs: Float64Array.from([0, g.L]),
      zs: Float64Array.from([g.zBaseA, g.h + g.zBaseB]),
    };
    const swept = sweepSpatial(
      { L: g.L, h: g.h, L0: g.L0, w: g.w, EA: g.EA, aero: null, rider: null },
      { weight: g.P, share: 1, hRider: g.hRider },
    );
    const clearance = evaluateSpatialClearance(swept, terrain, g.hRider);
    expect(clearance.contact).toBe("cable");
    expect(measuredOffBy(clearance.hMin, GROUND_CONTACT_CABLE.out.hMin, 2)).toBeLessThanOrEqual(1);
  });
});

describe("under wind — the extruded terrain (§19.13)", () => {
  const swept = sweepSpatial(LINE, RIDER);

  it("reads each position's garde at its own displaced trolley, with the whole gabarit", () => {
    // A sloping ground z = −30 − 0,1·x, extruded sideways: under the trolley it is the profile at
    // x_D whatever y_D is.
    const ground: Terrain = {
      kind: "profile",
      xs: Float64Array.from([0, 150]),
      zs: Float64Array.from([-30, -45]),
    };
    const clearance = evaluateSpatialClearance(swept, ground, RIDER.hRider);
    swept.slots.forEach((slot, i) => {
      if (slot === null) throw new Error("full coverage");
      const atTrolley = slot.rD.z - (-30 - 0.1 * slot.rD.x) - RIDER.hRider;
      expect(slot.rD.y).toBeGreaterThan(0);
      expect(clearance.perStep[i]).toBeLessThanOrEqual(atTrolley + 1e-12);
    });
    // Away from the anchors the loaded line's lowest point over that ground is its corner.
    const i = 130;
    const slot = swept.slots[i];
    expect(clearance.perStep[i]).toBeCloseTo(
      (slot?.rD.z ?? 0) + 30 + 0.1 * (slot?.rD.x ?? 0) - RIDER.hRider,
      12,
    );
    expect(clearance.contact).toBe("none");
    expect(clearance.perStepJudged.every((j) => j === 1)).toBe(true);
  });

  it("catches a terrain vertex that falls between two nodes", () => {
    const i = 130;
    const state = slotState(swept, i);
    if (state === null) throw new Error("solved");
    const s = sampleSpatial(state);
    // A spike half a metre above the line, between nodes 50 and 51: no node sees it.
    const xs = (s.x[50] + s.x[51]) / 2;
    const zLine = (s.z[50] + s.z[51]) / 2;
    const terrain: Terrain = {
      kind: "profile",
      xs: Float64Array.from([0, xs - 1e-3, xs, xs + 1e-3, 150]),
      zs: Float64Array.from([-40, -40, zLine + 0.5, -40, -40]),
    };
    const clearance = evaluateSpatialClearance(swept, terrain, RIDER.hRider);
    expect(clearance.perStepCable[i]).toBe(1);
    expect(clearance.contact).toBe("cable");
    // The chord of the two nodes is the line within its own sag over 0,6 m — under a millimetre.
    expect(clearance.perStep[i]).toBeCloseTo(-0.5 - RIDER.hRider, 3);
    expect(clearance.perStepX[i]).toBe(xs);
  });

  it("skips a hole: nothing read, nothing judged, the rest unchanged", () => {
    const ground: Terrain = { kind: "flat", z: -40 };
    const full = evaluateSpatialClearance(swept, ground, RIDER.hRider);
    const slots = [...swept.slots];
    slots[70] = null;
    const holed: SpatialSweepResult = { ...swept, slots, coverage: 259 / 260 };
    const clearance = evaluateSpatialClearance(holed, ground, RIDER.hRider);
    expect(clearance.perStep[70]).toBeNaN();
    expect(clearance.perStepX[70]).toBeNaN();
    expect(clearance.perStepJudged[70]).toBe(0);
    expect(clearance.perStep.length).toBe(260);
    expect(clearance.perStep[69]).toBe(full.perStep[69]);
    expect(clearance.perStep[71]).toBe(full.perStep[71]);
  });
});

/**
 * Piecewise straight line through `points`, each corner listed twice so the Hermite interpolant is
 * exact on every segment: `dr/dS` is the segment's own unit direction, `S` its arc length, `T = 1`
 * and `EA = ∞`, so `λ = 1`.
 */
function polyline(points: readonly [number, number][]): SpatialSamples {
  const rows: number[][] = [];
  let S = 0;
  for (let k = 0; k + 1 < points.length; k++) {
    const [x0, z0] = points[k];
    const [x1, z1] = points[k + 1];
    const length = Math.hypot(x1 - x0, z1 - z0);
    const [dx, dz] = [(x1 - x0) / length, (z1 - z0) / length];
    rows.push([S, x0, z0, dx, dz]);
    S += length;
    rows.push([S, x1, z1, dx, dz]);
  }
  const column = (c: number) => Float64Array.from(rows, (r) => r[c]);
  return {
    S: column(0),
    x: column(1),
    y: new Float64Array(rows.length),
    z: column(2),
    Fx: column(3),
    Fy: new Float64Array(rows.length),
    Fz: column(4),
    T: new Float64Array(rows.length).fill(1),
    EA: Number.POSITIVE_INFINITY,
    node: -1,
  };
}

describe("zone edges where x(S) turns back — every crossing, not the first (§19.13)", () => {
  it("reads the edge at its third crossing, where the line is lowest", () => {
    // x goes 0 → 60 → 40 → 150, so it crosses the edge x = 50 three times: at z −8,33 (A → P₁),
    // −17,5 (P₁ → P₂) and −25 + 7·10/110 (P₂ → B). Ground flat at −30, gabarit 2,1, zones 50 m.
    inject.samples = polyline([
      [0, 0],
      [60, -10],
      [40, -25],
      [150, -18],
    ]);
    const swept = sweepSpatial(LINE, RIDER, 1);
    const one: SpatialSweepResult = {
      ...swept,
      grid: swept.grid.slice(0, 1),
      slots: [
        {
          ...(swept.slots[0] as NonNullable<(typeof swept.slots)[number]>),
          rD: { x: 60, y: 0, z: -10 },
        },
      ],
      coverage: 1,
    };
    const clearance = evaluateSpatialClearance(one, { kind: "flat", z: -30 }, 2.1, 50);
    const third = -25 + (7 * 10) / 110 + 30 - 2.1;
    // The other judged readings, by hand: P₁ at 17,9; the edge x = 100 on P₂ → B at
    // −25 + 7·60/110 + 30 − 2,1; the two first crossings at 19,57 and 10,4.
    expect(third).toBeLessThan(-25 + (7 * 60) / 110 + 30 - 2.1);
    expect(clearance.perStep[0]).toBeCloseTo(third, 12);
    expect(clearance.perStepX[0]).toBe(50);
    expect(clearance.perStepJudged[0]).toBe(1);
    expect(clearance.hMin).toBeCloseTo(third, 12);
  });
});
