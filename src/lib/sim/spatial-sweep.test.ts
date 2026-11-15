/**
 * §19.12's sweep. Oracles: `sweep()` without wind (bit for bit, §19.16), §6.2's grid count, the
 * alignment of slots and holes — a hole is injected on the solve (`vi.mock`) at an index the test
 * chose — and §19.6's share as a statement about each member's load.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LineAero, SpatialSpanInput } from "./types.ts";

import { Z5 } from "./__fixtures__/theory-15.ts";
import { solveSpatial } from "./spatial-solve.ts";
import { planeSweep, slotState, sweepSpatial, trajectoryRuns } from "./spatial-sweep.ts";
import { sweep, sweepGrid } from "./sweep.ts";

/** Which grid position the injected solve fails at, and whether a retry lifts it. */
const inject = vi.hoisted(() => ({ failAt: Number.NaN, once: false, calls: 0 }));

vi.mock("./spatial-solve.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("./spatial-solve.ts")>();
  return {
    ...real,
    solveSpatialWith: (...args: Parameters<typeof real.solveSpatialWith>) => {
      const sP = args[0].rider?.sP;
      if (sP !== undefined && sP === inject.failAt) {
        inject.calls++;
        if (!inject.once || inject.calls === 1) {
          return {
            ok: false,
            error: { kind: "no-convergence", attempts: 5, residual: 1, reason: "attempts" },
          };
        }
      }
      return real.solveSpatialWith(...args);
    },
  };
});

beforeEach(() => {
  inject.failAt = Number.NaN;
  inject.once = false;
  inject.calls = 0;
});

const WIND: LineAero = {
  field: { speed: 15, from: 90, profile: { width: 50, attenuation: 40 } },
  bearing: 0,
  rho: 1.225,
  d: 0.012,
  CDn: 1.2,
};
const LINE: SpatialSpanInput = {
  L: 150,
  h: -18,
  L0: 151.644,
  w: 0.5465 * 9.81,
  EA: 6.9e6,
  aero: WIND,
  rider: null,
};
const RIDER = { weight: 90 * 9.81, share: 1, hRider: 2.1 } as const;

describe("sweepSpatial without wind — §6.2's sweep, lifted (§19.16)", () => {
  it("is sweep() bit for bit, one slot per grid position", () => {
    const { L, h, L0, w, EA, P } = Z5.in;
    const swept = sweepSpatial(
      { L, h, L0, w, EA, aero: null, rider: null },
      { weight: P, share: 1, hRider: 2.1 },
    );
    const plane = sweep({ L, h, L0, w, EA, loads: [] }, P);
    expect(swept.grid).toEqual(plane.grid);
    expect(swept.slots.length).toBe(260);
    expect(swept.coverage).toBe(plane.coverage);
    swept.slots.forEach((slot, i) => {
      const step = plane.steps[i];
      expect(slot?.sD).toBe(step.sD);
      expect(slot?.rD).toEqual({ x: step.xD, y: 0, z: step.zD });
      expect(slot?.FA).toEqual({ x: step.H, y: 0, z: step.V0 });
      expect([slot?.TA, slot?.TB, slot?.HA, slot?.HB]).toEqual([step.TA, step.TB, step.H, step.H]);
    });
  });

  it("shares the rider's weight by n_c as sweep() does with P/2", () => {
    const swept = sweepSpatial({ ...LINE, aero: null }, { ...RIDER, share: 0.5 });
    const plane = sweep(
      { L: 150, h: -18, L0: 151.644, w: LINE.w, EA: LINE.EA, loads: [] },
      RIDER.weight / 2,
    );
    expect(swept.slots.map((s) => s?.TA)).toEqual(plane.steps.map((s) => s.TA));
  });
});

describe("sweepSpatial under wind — §19.12", () => {
  const swept = sweepSpatial(LINE, RIDER);

  it("keeps one slot per grid position and solves them all", () => {
    expect(swept.grid).toEqual(sweepGrid(LINE.L0));
    expect(swept.slots.length).toBe(260);
    expect(swept.coverage).toBe(1);
    expect(swept.failures).toEqual([]);
    swept.slots.forEach((slot, i) => expect(slot?.sD).toBe(swept.grid[i]));
  });

  it("puts every trolley on the side the wind pushes it, inside the span", () => {
    for (const slot of swept.slots) {
      expect(slot?.rD.y).toBeGreaterThan(0);
      expect(slot?.rD.x).toBeGreaterThan(0);
      expect(slot?.rD.x).toBeLessThan(LINE.L);
    }
  });

  it("is each position's own equilibrium: a slot is the solve at its S_D", () => {
    const i = 130;
    const single = solveSpatial({ ...LINE, rider: { ...RIDER, sP: swept.grid[i] } });
    if (!single.ok) throw new Error("must solve");
    const slot = swept.slots[i];
    // Two solves from different seeds agree to the closure's noise, `EA·ε/L₀` with ε ≤ 10⁻⁶ m.
    expect(slot?.TA).toBeCloseTo(single.state.TA, 1);
    expect(slot?.rD.y).toBeCloseTo(single.state.node?.rD.y ?? 0, 6);
  });

  it("rebuilds a slot's state for sampling without solving", () => {
    const state = slotState(swept, 42);
    expect(state?.FA).toEqual(swept.slots[42]?.FA);
    expect(state?.input.rider?.sP).toBe(swept.grid[42]);
    expect(state?.method).toBe("shooting");
  });

  it("draws one trajectory run when nothing is missing", () => {
    const runs = trajectoryRuns(swept);
    expect(runs.length).toBe(1);
    expect(runs[0].length).toBe(260);
  });
});

describe("holes — kept in place, never filled by a neighbour (§19.12, Q24)", () => {
  it("leaves a null slot where the solve failed, with its failure and a coverage under 1", () => {
    const k = 97;
    inject.failAt = sweepGrid(LINE.L0)[k];
    const swept = sweepSpatial(LINE, RIDER);
    expect(swept.slots[k]).toBeNull();
    expect(swept.slots.filter((s) => s === null).length).toBe(1);
    expect(swept.failures).toEqual([
      { index: k, sD: inject.failAt, error: expect.objectContaining({ kind: "no-convergence" }) },
    ]);
    expect(swept.coverage).toBe(259 / 260);
    expect(slotState(swept, k)).toBeNull();
    // The trajectory stops at the hole and starts again after it: no segment bridges it.
    const runs = trajectoryRuns(swept);
    expect(runs.map((r) => [r[0], r[r.length - 1]])).toEqual([
      [0, k - 1],
      [k + 1, 259],
    ]);
    // Forward once, then the one reverse retry: two attempts at the hole, no more.
    expect(inject.calls).toBe(2);
  });

  it("fills a hole the reverse retry solves — a full solve, from the next position", () => {
    const k = 150;
    inject.failAt = sweepGrid(LINE.L0)[k];
    inject.once = true;
    const swept = sweepSpatial(LINE, RIDER);
    expect(swept.coverage).toBe(1);
    expect(swept.failures).toEqual([]);
    expect(swept.slots[k]?.sD).toBe(inject.failAt);
  });
});

describe("§19.6 — two members and the sole carrier", () => {
  it("halves the rider's force on each member, weight and wind alike", () => {
    const one = sweepSpatial(LINE, RIDER);
    const two = sweepSpatial(LINE, { ...RIDER, share: 0.5 });
    const i = 130;
    expect(two.slots[i]?.Pext.z).toBe(-RIDER.weight / 2);
    // Both at their own x_D: the profile's speed there differs by the share's own displacement.
    expect((two.slots[i]?.Pext.y ?? 0) / (one.slots[i]?.Pext.y ?? 1)).toBeCloseTo(0.5, 2);
    expect(two.slots[i]?.Tmax).toBeLessThan(one.slots[i]?.Tmax ?? 0);
  });

  it("refuses a loaded input: the sweep places the rider", () => {
    expect(() => sweepSpatial({ ...LINE, rider: { ...RIDER, sP: 1 } }, RIDER)).toThrow(RangeError);
  });
});

describe("planeSweep — the coupe's projection of a sweep (§19.11)", () => {
  it("returns sweep()'s own result without wind, bit for bit (§19.16)", () => {
    const { L, h, L0, w, EA, P } = Z5.in;
    const swept = sweepSpatial(
      { L, h, L0, w, EA, aero: null, rider: null },
      { weight: P, share: 1, hRider: 2.1 },
    );
    expect(planeSweep(swept)).toEqual(sweep({ L, h, L0, w, EA, loads: [] }, P));
  });

  it("keeps one step per solved slot, in grid order, and the holes in failures", () => {
    const k = 97;
    inject.failAt = sweepGrid(LINE.L0)[k];
    const swept = sweepSpatial(LINE, RIDER);
    const plane = planeSweep(swept);
    expect(plane.steps.length).toBe(259);
    expect(plane.steps.map((step) => step.sD)).toEqual(
      swept.slots.filter((slot) => slot !== null).map((slot) => slot.sD),
    );
    expect(plane.failures).toEqual(swept.failures);
    expect(plane.coverage).toBe(259 / 260);
  });

  it("reads x, z and the anchors' tensions of the node; H and θ on the A side of the trolley", () => {
    const swept = sweepSpatial(LINE, RIDER);
    const slot = swept.slots[130];
    const step = planeSweep(swept).steps[130];
    expect([step.xD, step.zD, step.TA, step.TB, step.V0]).toEqual([
      slot?.rD.x,
      slot?.rD.z,
      slot?.TA,
      slot?.TB,
      slot?.FA.z,
    ]);
    // Under a crosswind the A-side force has a y component: H is its horizontal part along A–B
    // only, so it sits below the plane's |F_h| — the y of the force is not folded into the coupe.
    const Fm = slot?.Fminus ?? { x: 0, y: 0, z: 0 };
    expect(Math.abs(Fm.y)).toBeGreaterThan(0);
    expect(step.H).toBe(Fm.x);
    expect(Math.tan(step.theta)).toBeCloseTo(Fm.z / Fm.x, 12);
  });
});
