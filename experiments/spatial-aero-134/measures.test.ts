import { describe, expect, it } from "vitest";

import { Z4 } from "@/lib/sim/__fixtures__/theory-15.ts";

import type { SpatialInput, SpatialSolution } from "./solve.ts";

import { NO_AERO } from "./aero.ts";
import { forceMeasures, loadMeasures, maximumOver, residuals, shapeMeasures } from "./measures.ts";
import { solveSpatial } from "./solve.ts";

const INPUT: SpatialInput = {
  L: 100,
  h: 0,
  L0: 100,
  w: 5,
  EA: 1e7,
  d: 0.012,
  rho: 1.225,
  wind: { along: 0, across: 0 },
  aero: NO_AERO,
  rider: null,
};

/** A line given node by node — one smooth piece, evenly spaced — to read measures off by hand. */
function drawn(
  nodes: readonly (readonly [x: number, y: number, z: number])[],
  input: SpatialInput = INPUT,
): SpatialSolution {
  const count = nodes.length;
  return {
    input,
    S: Float64Array.from(nodes, (_, i) => (input.L0 * i) / (count - 1)),
    x: Float64Array.from(nodes, ([x]) => x),
    y: Float64Array.from(nodes, ([, y]) => y),
    z: Float64Array.from(nodes, ([, , z]) => z),
    Fx: new Float64Array(count).fill(1000),
    Fy: new Float64Array(count),
    Fz: new Float64Array(count),
    pieces: [{ from: 0, to: count - 1 }],
    closure: 0,
    iterations: 0,
  };
}

const FLAT_GROUND = {
  kind: "profile",
  xs: Float64Array.of(0, 100),
  zs: Float64Array.of(-10, -10),
} as const;

describe("shapeMeasures — §18.5, on a line drawn by hand", () => {
  // The greatest drop is at x = 25, the greatest lateral offset at x = 75: two different places.
  const line = drawn([
    [0, 0, 0],
    [25, 0, -3],
    [50, 1, -1],
    [75, 4, 0],
    [100, 0, 0],
  ]);
  const shape = shapeMeasures(line, FLAT_GROUND, 2.1);

  it("reads the flèche between the nodes: the vertex of the parabola through 0, 3, 1", () => {
    // Curvature 0 − 6 + 1 = −5; vertex = 3 − (0 − 1)²/(8 × −5) = 3,025.
    expect(shape.sag).toBeCloseTo(3.025, 12);
  });

  it("signs the déport: positive to the left of A → B", () => {
    // Samples 1, 4, 0: curvature −7; vertex = 4 − (1 − 0)²/(8 × −7) = 4 + 1/56.
    expect(shape.sway).toBeCloseTo(4 + 1 / 56, 12);
    const mirrored = drawn([
      [0, 0, 0],
      [25, 0, -3],
      [50, -1, -1],
      [75, -4, 0],
      [100, 0, 0],
    ]);
    expect(shapeMeasures(mirrored, FLAT_GROUND, 2.1).sway).toBeCloseTo(-(4 + 1 / 56), 12);
  });

  it("combines the two offsets at each abscissa, then maximises — never two maxima from two places", () => {
    // √(drop² + y²) at the nodes: 0, 3, √2, 4, 0. Around the greatest: √2, 4, 0, curvature
    // √2 − 8; vertex = 4 − (√2)²/(8·(√2 − 8)) = 4 + 2/(8·(8 − √2)).
    expect(shape.combined).toBeCloseTo(4 + 2 / (8 * (8 - Math.SQRT2)), 12);
    // The norm of the two separate maxima would be 5,02: not this.
    expect(shape.combined).toBeLessThan(Math.hypot(shape.sag, shape.sway) - 0.9);
  });

  it("takes the garde vertically over the profile, less the whole gabarit", () => {
    // Lowest point −3,025; ground −10; gabarit 2,1: −3,025 + 10 − 2,1 = 4,875.
    expect(shape.clearance).toBeCloseTo(4.875, 12);
    // The ground is read at each node's x, whatever its y: an extruded profile rising to −6 at B.
    const sloped = {
      kind: "profile",
      xs: Float64Array.of(0, 100),
      zs: Float64Array.of(-10, -6),
    } as const;
    // z − ground − 2,1 at the nodes: 7,9 · 3,9 · 4,9 · 4,9 · 3,9. Around the smallest, at x = 25:
    // curvature of the negated samples −7,9 + 7,8 − 4,9 = −5, vertex 3,9 − (−7,9 + 4,9)²/40 = 3,675.
    expect(shapeMeasures(line, sloped, 2.1).clearance).toBeCloseTo(3.675, 12);
  });

  it("reports a line lifted above A–B as a rise, with no flèche", () => {
    const lifted = drawn([
      [0, 0, 0],
      [25, 0, 1],
      [50, 0, 2],
      [75, 0, 1],
      [100, 0, 0],
    ]);
    const measured = shapeMeasures(lifted, FLAT_GROUND, 2.1);
    expect(measured.sag).toBe(0);
    expect(measured.rise).toBeCloseTo(2, 12);
  });

  it("measures against the inclined A–B, vertically", () => {
    // B 20 m lower: A–B is z = −0,2·x. A line 1 m under it at mid-span, on it elsewhere.
    const inclined = drawn(
      [
        [0, 0, 0],
        [25, 0, -5],
        [50, 0, -11],
        [75, 0, -15],
        [100, 0, -20],
      ],
      { ...INPUT, h: -20 },
    );
    expect(shapeMeasures(inclined, FLAT_GROUND, 0).sag).toBeCloseTo(1, 12);
  });
});

describe("maximumOver", () => {
  it("reads every hump, not only the one whose node sits highest", () => {
    const line = drawn([
      [0, 0, 0],
      [25, 0, 0],
      [50, 0, 0],
      [75, 0, 0],
      [100, 0, 0],
    ]);
    // The last node is the greatest sample, but the parabola through 0, 3,9, 3 peaks higher:
    // 3,9 − (0 − 3)²/(8·(0 − 7,8 + 3)) = 3,9 + 9/38,4.
    const humps = [0, 3.9, 3, 3, 4];
    expect(maximumOver(line, (i) => humps[i])).toBeCloseTo(3.9 + 9 / 38.4, 12);
  });

  it("keeps the node's own value where the function still rises into the end of a piece", () => {
    const line = drawn([
      [0, 0, 0],
      [25, 0, 0],
      [50, 0, 0],
      [75, 0, 0],
      [100, 0, 0],
    ]);
    const rising = [0, 1, 4, 9, 16];
    expect(maximumOver(line, (i) => rising[i])).toBe(16);
  });
});

describe("forceMeasures", () => {
  it("gives the reactions the line puts on each anchor: F(0) on A, −F(L₀) on B", () => {
    const line = drawn([
      [0, 0, 0],
      [50, 0, -1],
      [100, 0, 0],
    ]);
    line.Fz.set([-300, 0, 400]);
    const forces = forceMeasures(line);
    expect(forces.reactionA).toEqual([1000, 0, -300]);
    expect(forces.reactionB).toEqual([-1000, -0, -400]);
    expect(forces.HA).toBe(1000);
    // 1000-300 and 1000-400: √1 090 000 and √1 160 000.
    expect(forces.TA).toBeCloseTo(Math.sqrt(1_090_000), 9);
    expect(forces.TB).toBeCloseTo(Math.sqrt(1_160_000), 9);
    expect(forces.Tmax).toBe(forces.TB);
  });
});

describe("residuals — §18.6, on a solved line", () => {
  const input: SpatialInput = {
    ...INPUT,
    ...Z4.in,
    wind: { along: -6, across: 12 },
    aero: { normal: 1.2, lift: 0.3, liftLaw: "binormal", axial: 0.1 },
    rider: { s: 40, force: [0, 0, -Z4.in.P] },
  };
  const result = solveSpatial(input);
  if (!result.ok) throw new Error("the line of the residual tests did not solve");
  const { solution } = result;

  it("an equilibrium balances forces and moments under a second quadrature", () => {
    const found = residuals(solution);
    expect(found.force).toBeLessThan(1e-7);
    expect(found.moment).toBeLessThan(1e-5);
    expect(found.jump).toBeLessThan(1e-9);
    expect(found.continuity).toBe(0);
    expect(found.closure).toBeLessThan(1e-6);
  });

  it("a rider's force of the wrong sign shows as twice the force, in the jump and in the balance", () => {
    const reversed = {
      ...solution,
      input: { ...input, rider: { s: 40, force: [0, 0, Z4.in.P] as const } },
    };
    const found = residuals(reversed);
    expect(found.jump).toBeCloseTo(2 * Z4.in.P, 6);
    expect(found.force).toBeCloseTo(2 * Z4.in.P, 4);
  });

  it("a load left out of the balance shows: the weight alone does not close it", () => {
    const withoutWind = { ...solution, input: { ...input, wind: { along: 0, across: 0 } } };
    expect(residuals(withoutWind).force).toBeGreaterThan(10);
  });
});

describe("loadMeasures", () => {
  it("a straight line in a parallel wind carries the axial drag and nothing else", () => {
    const input: SpatialInput = {
      ...INPUT,
      L: 100.1,
      w: 0,
      wind: { along: 20, across: 0 },
      aero: { ...NO_AERO, normal: 1.2, lift: 0.5, axial: 0.1 },
    };
    const result = solveSpatial(input, { seed: [10000, 0, 0] });
    if (!result.ok) throw new Error("the straight line did not solve");
    const loads = loadMeasures(result.solution);
    // ½ × 1,225 × 0,1 × 0,012 × 20² = 0,294 N/m, the same at every node.
    expect(loads.axial.mean).toBeCloseTo(0.294, 12);
    expect(loads.axial.max).toBeCloseTo(0.294, 12);
    expect(loads.normal.max).toBe(0);
    expect(loads.lift.max).toBe(0);
  });
});
