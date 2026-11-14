import { describe, expect, it } from "vitest";

import type { AeroCoefficients, Vec3 } from "./aero.ts";

import { lineAeroLoad, NO_AERO } from "./aero.ts";

/** §12.2's sea-level density and a 12 mm line: `½·ρ·d = 0,5 × 1,225 × 0,012 = 0,00735 kg/m²`. */
const RHO = 1.225;
const D = 0.012;

const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const only = (part: Partial<AeroCoefficients>): AeroCoefficients => ({ ...NO_AERO, ...part });

const LEVEL: Vec3 = [1, 0, 0];
/** A wind of 10 m/s from the right of the travel: the air goes toward `+y`. */
const FROM_RIGHT: Vec3 = [0, 10, 0];

describe("lineAeroLoad — §18.3, by hand on a level line", () => {
  it("normal drag in a pure crossflow is ½·ρ·C_D⊥·d·U², along the wind", () => {
    // 0,00735 × 1,2 × 10² = 0,882 N/m.
    const { normal } = lineAeroLoad(LEVEL, FROM_RIGHT, RHO, D, only({ normal: 1.2 }));
    expect(normal[0]).toBe(0);
    expect(normal[1]).toBeCloseTo(0.882, 12);
    expect(normal[2]).toBe(0);
  });

  it("a positive C_L lifts a level line in a wind from the right, a negative one presses it down", () => {
    // 0,00735 × 0,5 × 10² = 0,3675 N/m, along t × u_n = (0, 0, U).
    const up = lineAeroLoad(LEVEL, FROM_RIGHT, RHO, D, only({ lift: 0.5 })).lift;
    expect(up[0]).toBeCloseTo(0, 15);
    expect(up[1]).toBeCloseTo(0, 15);
    expect(up[2]).toBeCloseTo(0.3675, 12);
    const down = lineAeroLoad(LEVEL, FROM_RIGHT, RHO, D, only({ lift: -0.5 })).lift;
    expect(down[2]).toBeCloseTo(-0.3675, 12);
  });

  it("the binormal lift reverses with the side the wind comes from", () => {
    const fromLeft = lineAeroLoad(LEVEL, [0, -10, 0], RHO, D, only({ lift: 0.5 })).lift;
    expect(fromLeft[2]).toBeCloseTo(-0.3675, 12);
  });

  it("the axial drag follows the air: toward B in a tail wind, toward A in a head wind", () => {
    // 0,00735 × 0,1 × 10² = 0,0735 N/m.
    const tail = lineAeroLoad(LEVEL, [10, 0, 0], RHO, D, only({ axial: 0.1 })).axial;
    expect(tail[0]).toBeCloseTo(0.0735, 12);
    expect(tail[1]).toBe(0);
    expect(tail[2]).toBe(0);
    const head = lineAeroLoad(LEVEL, [-10, 0, 0], RHO, D, only({ axial: 0.1 })).axial;
    expect(head[0]).toBeCloseTo(-0.0735, 12);
  });

  it("a pure crossflow has no axial drag and a parallel wind no normal drag and no lift", () => {
    const all: AeroCoefficients = { normal: 1.2, lift: 0.5, liftLaw: "binormal", axial: 0.1 };
    expect(norm(lineAeroLoad(LEVEL, FROM_RIGHT, RHO, D, all).axial)).toBe(0);
    const parallel = lineAeroLoad(LEVEL, [10, 0, 0], RHO, D, all);
    expect(norm(parallel.normal)).toBe(0);
    expect(norm(parallel.lift)).toBe(0);
  });

  it("no wind is no force, and never a NaN", () => {
    const all: AeroCoefficients = { normal: 1.2, lift: 0.5, liftLaw: "yaw-odd", axial: 0.1 };
    const still = lineAeroLoad(LEVEL, [0, 0, 0], RHO, D, all);
    for (const force of [still.normal, still.lift, still.axial]) {
      expect(force.every((component) => component === 0)).toBe(true);
    }
  });
});

describe("lineAeroLoad — the two lift laws", () => {
  // A head wind at 45° from the right: u = (−a, a, 0) with a = 10/√2, so u_t = −a and |u_n| = a.
  const a = 10 / Math.SQRT2;
  const OBLIQUE: Vec3 = [-a, a, 0];

  it("the yaw-odd law is nil in a pure crossflow", () => {
    const lift = lineAeroLoad(
      LEVEL,
      FROM_RIGHT,
      RHO,
      D,
      only({ lift: 0.5, liftLaw: "yaw-odd" }),
    ).lift;
    expect(norm(lift)).toBe(0);
  });

  it("at 45° both laws have the magnitude ½·ρ·|C_L|·d·U²/2", () => {
    // 0,00735 × 0,5 × 50 = 0,18375 N/m.
    const binormal = lineAeroLoad(LEVEL, OBLIQUE, RHO, D, only({ lift: 0.5 })).lift;
    const yawOdd = lineAeroLoad(
      LEVEL,
      OBLIQUE,
      RHO,
      D,
      only({ lift: 0.5, liftLaw: "yaw-odd" }),
    ).lift;
    expect(binormal[2]).toBeCloseTo(0.18375, 12);
    // u_t < 0 in a head wind: the yaw-odd law points the other way.
    expect(yawOdd[2]).toBeCloseTo(-0.18375, 12);
  });

  it("the yaw-odd law reverses with the axial component, the binormal law does not", () => {
    const tailOblique: Vec3 = [a, a, 0];
    const binormal = lineAeroLoad(LEVEL, tailOblique, RHO, D, only({ lift: 0.5 })).lift;
    const yawOdd = lineAeroLoad(
      LEVEL,
      tailOblique,
      RHO,
      D,
      only({ lift: 0.5, liftLaw: "yaw-odd" }),
    ).lift;
    expect(binormal[2]).toBeCloseTo(0.18375, 12);
    expect(yawOdd[2]).toBeCloseTo(0.18375, 12);
  });
});

describe("lineAeroLoad — three forces, three directions", () => {
  // A line descending toward B, 3-4-5, and a wind that is neither along it nor square to it.
  const t: Vec3 = [0.8, 0, -0.6];
  const u: Vec3 = [-7, 9, 0];
  const all: AeroCoefficients = { normal: 1.2, lift: 0.5, liftLaw: "binormal", axial: 0.1 };
  const load = lineAeroLoad(t, u, RHO, D, all);
  const ut = dot(u, t);
  const un: Vec3 = [u[0] - ut * t[0], u[1] - ut * t[1], u[2] - ut * t[2]];

  it("the normal drag is orthogonal to the line and along u_n", () => {
    expect(dot(load.normal, t)).toBeCloseTo(0, 12);
    expect(dot(load.normal, un)).toBeCloseTo(norm(load.normal) * norm(un), 12);
    // ½·ρ·C_D⊥·d·|u_n|², with |u_n|² = |u|² − u_t² = 130 − 5,6² = 98,64.
    expect(norm(load.normal)).toBeCloseTo(0.00735 * 1.2 * 98.64, 10);
  });

  it("the lift is orthogonal to the line and to the normal drag", () => {
    expect(dot(load.lift, t)).toBeCloseTo(0, 12);
    expect(dot(load.lift, load.normal)).toBeCloseTo(0, 12);
    expect(norm(load.lift)).toBeCloseTo(0.00735 * 0.5 * 98.64, 10);
  });

  it("the axial drag is along the line, on the side the air goes", () => {
    // u_t = −5,6: the air goes toward A.
    expect(load.axial[0]).toBeCloseTo(-0.00735 * 0.1 * 5.6 * 5.6 * 0.8, 12);
    expect(load.axial[1]).toBeCloseTo(0, 15);
    expect(load.axial[2]).toBeCloseTo(0.00735 * 0.1 * 5.6 * 5.6 * 0.6, 12);
  });

  it("a slope alone makes no vertical normal drag in a strictly lateral wind, but the lift has one", () => {
    // `line-lift-axial-drag-significance.md` §3: u·t = 0, so f_n is horizontal; t × u = U·(−t_z, 0, t_x).
    const lateral = lineAeroLoad(t, [0, 10, 0], RHO, D, all);
    expect(lateral.normal[2]).toBe(0);
    expect(lateral.lift[0]).toBeCloseTo(0.3675 * 0.6, 12);
    expect(lateral.lift[2]).toBeCloseTo(0.3675 * 0.8, 12);
  });
});
