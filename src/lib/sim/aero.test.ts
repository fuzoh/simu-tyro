/**
 * §19.4–§19.5's forces — every expected value is a hand calculation from §19.5's table or a stated
 * invariant (§19.17 control 8), never a figure the module printed.
 */

import { describe, expect, it } from "vitest";

import {
  AERO,
  normalDragInto,
  riderEllipsoid,
  riderProjectedArea,
  riderWindForce,
} from "./aero.ts";

/** `h_rider = 2,10 m`: §19.5's semi-axes by hand — 0,15·2,10/2, 0,25·2,10/2, 0,80·2,10/2. */
const A = 0.1575;
const B = 0.2625;
const C = 0.84;

describe("AERO — #127's adopted conventions, locked", () => {
  it("keeps steel and textile C_D⊥ as two parameters of 1,2 (Q36, Q38)", () => {
    expect(AERO.lineNormalDrag).toEqual({ steel: 1.2, textile: 1.2 });
  });

  it("keeps the static rider's C_D at 1,0, distinct from the line's (Q43)", () => {
    expect(AERO.riderDrag).toBe(1.0);
  });

  it("keeps the ellipsoid's full dimensions and placement (Q39, Q40)", () => {
    expect(AERO.riderEllipsoid).toEqual({
      height: 0.8,
      width: 0.25,
      depth: 0.15,
      centreBelow: 0.6,
      bottomBelow: 1.0,
    });
  });
});

describe("riderEllipsoid — §19.5's semi-axes", () => {
  it("halves the full dimensions: 1,68 × 0,525 × 0,315 m for h = 2,10 m", () => {
    const e = riderEllipsoid(2.1);
    expect(e.a).toBeCloseTo(A, 14);
    expect(e.b).toBeCloseTo(B, 14);
    expect(e.c).toBeCloseTo(C, 14);
  });
});

describe("riderProjectedArea — §19.5's shadow of the ellipsoid", () => {
  const e = riderEllipsoid(2.1);

  it("face on (n = e_x) is π·b·c = 0,6927 m²", () => {
    expect(riderProjectedArea(e, 1, 0, 0)).toBeCloseTo(Math.PI * B * C, 12);
    expect(riderProjectedArea(e, 1, 0, 0)).toBeCloseTo(0.6927, 4);
  });

  it("side on (n = e_y) is π·a·c = 0,4156 m²", () => {
    expect(riderProjectedArea(e, 0, 1, 0)).toBeCloseTo(Math.PI * A * C, 12);
    expect(riderProjectedArea(e, 0, 1, 0)).toBeCloseTo(0.4156, 4);
  });

  it("at 45° is π·c·√((b² + a²)/2)", () => {
    const n = Math.SQRT1_2;
    expect(riderProjectedArea(e, n, n, 0)).toBeCloseTo(
      Math.PI * C * Math.sqrt((B * B + A * A) / 2),
      12,
    );
  });

  it("from above (n = e_z) is π·a·b", () => {
    expect(riderProjectedArea(e, 0, 0, 1)).toBeCloseTo(Math.PI * A * B, 12);
  });

  it("is multiplied by 4 when the gabarit doubles (Q39)", () => {
    const big = riderEllipsoid(4.2);
    const normals: [number, number, number][] = [
      [1, 0, 0],
      [0, 1, 0],
      [0.6, 0.8, 0],
    ];
    for (const n of normals) {
      expect(riderProjectedArea(big, ...n)).toBeCloseTo(4 * riderProjectedArea(e, ...n), 12);
    }
  });
});

describe("riderWindForce — §19.5's static force", () => {
  const e = riderEllipsoid(2.1);
  const rho = 1.225;
  const U = 15;

  it("is exactly nil, not NaN, without wind — no direction is normalised", () => {
    expect(riderWindForce(e, 0, 0, rho)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("face on is ½·ρ·C_D·π·b·c·U² along the wind", () => {
    const F = riderWindForce(e, U, 0, rho);
    expect(F.x).toBeCloseTo(0.5 * rho * 1.0 * Math.PI * B * C * U * U, 10);
    expect(F.y).toBe(0);
    expect(F.z).toBe(0);
  });

  it("side on is ½·ρ·C_D·π·a·c·U² along the wind", () => {
    const F = riderWindForce(e, 0, -U, rho);
    expect(F.y).toBeCloseTo(-0.5 * rho * Math.PI * A * C * U * U, 10);
    expect(F.x).toBe(0);
  });

  it("follows the wind and the area seen from it on an oblique wind", () => {
    const ux = U * Math.cos(0.3);
    const uy = U * Math.sin(0.3);
    const F = riderWindForce(e, ux, uy, rho);
    // Parallel to `u`: the cross product vanishes.
    expect(F.x * uy - F.y * ux).toBeCloseTo(0, 10);
    // Magnitude: ½·ρ·A(u/|u|)·|u|².
    const area = riderProjectedArea(e, Math.cos(0.3), Math.sin(0.3), 0);
    expect(Math.hypot(F.x, F.y)).toBeCloseTo(0.5 * rho * area * U * U, 10);
  });

  it("tends to the face-on force along x as the wind turns along the line", () => {
    const face = 0.5 * rho * Math.PI * B * C * U * U;
    const eps = 1e-4;
    const F = riderWindForce(e, U * Math.cos(eps), U * Math.sin(eps), rho);
    expect(Math.abs(F.y / F.x)).toBeLessThan(2 * eps);
    expect(F.x / face).toBeCloseTo(1, 7);
  });

  it("mirrors with u_y (§19.17 control 6)", () => {
    const F = riderWindForce(e, 4, 9, rho);
    const G = riderWindForce(e, 4, -9, rho);
    expect(G.x).toBe(F.x);
    expect(G.y).toBe(-F.y);
  });
});

describe("normalDragInto — §19.4's f_n = q·|u_n|·u_n", () => {
  const q = 0.5 * 1.225 * 1.2 * 0.012;
  const U = 20;
  const out = new Float64Array(3);

  it("is nil when the tangent is along the wind", () => {
    normalDragInto(out, U, 0, 1, 0, 0, q);
    // A drag has no sign of zero to keep: `−0` reads as nil.
    expect([...out].map(Math.abs)).toEqual([0, 0, 0]);
  });

  it("is q·U² along the wind when the tangent is normal to it", () => {
    normalDragInto(out, U, 0, 0, 0, 1, q);
    expect(out[0]).toBeCloseTo(q * U * U, 12);
    expect(Math.abs(out[1])).toBe(0);
    expect(Math.abs(out[2])).toBe(0);
  });

  it("keeps the vertical part on an inclined line: t at 30°, u along x", () => {
    // `u_n = U·(sin²30°, 0, −sin30°·cos30°)`, `|u_n| = U·sin30°`, so
    // `f_n = q·U²·sin30°·(sin²30°, 0, −sin30°·cos30°) = q·U²·(0,125, 0, −0,2165064)`.
    const t = (30 * Math.PI) / 180;
    normalDragInto(out, U, 0, Math.cos(t), 0, Math.sin(t), q);
    expect(out[0] / (q * U * U)).toBeCloseTo(0.125, 12);
    expect(out[1]).toBe(0);
    expect(out[2] / (q * U * U)).toBeCloseTo(-0.25 * Math.sqrt(3) * 0.5, 12);
  });

  it("is normal to the tangent whatever the wind", () => {
    const n = Math.hypot(0.6, 0.3, -0.2);
    const [tx, ty, tz] = [0.6 / n, 0.3 / n, -0.2 / n];
    normalDragInto(out, 7, -11, tx, ty, tz, q);
    expect(out[0] * tx + out[1] * ty + out[2] * tz).toBeCloseTo(0, 12);
  });
});
