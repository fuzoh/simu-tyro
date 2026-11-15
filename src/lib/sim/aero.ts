/**
 * The wind's forces in §19's spatial statics — `docs/simulation-theory.md` §19.4 (normal drag on
 * the line) and §19.5 (the static rider's ellipsoid, its projected area and its force), as #127's
 * consolidated brief (Q35–Q43) adopted them.
 *
 * Rules this module exists to keep:
 *
 * - **Three adopted conventions, not measurements.** `C_D⊥ = 1,2` (steel, and a **separate**
 *   textile parameter of the same value), `C_D = 1,0` for the static rider and the ellipsoid's
 *   proportions are the maintainer's reproducible reference values (#127 Q36, Q38, Q39, Q43): not
 *   product measurements, not conservative bounds, not validated, and not user-editable. They carry
 *   no §0.2 tag; §19's preamble records why.
 * - **Normal drag alone on the line** (#127 Q35): `f_n = ½·ρ·C_D⊥·d·|u_n|·u_n` with
 *   `u_n = u − (u·t)·t`, per **stretched** metre, its vertical component kept. No lift, no axial
 *   drag — omitted by decision, not because they are negligible (§19.1).
 * - **No direction is normalised.** A nil wind gives a nil force through the forms themselves —
 *   `|u_n|·u_n` and `√(b²u_x² + a²u_y²)·u` divide by no speed — never through a branch.
 * - **SI.** N, m, m/s, kg/m³.
 */

import type { Ellipsoid, Vec3 } from "./types.ts";

/** §19.4–§19.5's adopted conventions (#127 Q36, Q38, Q39, Q40, Q43). */
export const AERO = {
  /**
   * `C_D⊥`, the line's normal-drag coefficient — #127 Q36/Q38: a reproducible cylinder reference,
   * not a measured 6×19 or IWRC value, not conservative. Two parameters of one value, so steel and
   * textile can evolve apart.
   */
  lineNormalDrag: { steel: 1.2, textile: 1.2 },
  /** `C_D` of the static rider on its projected area — #127 Q43, distinct from §12.2's `C_dA`. */
  riderDrag: 1.0,
  /**
   * The rider's ellipsoid as fractions of `h_rider` (#127 Q39, Q40): **full** dimensions — height
   * `0,80`, transverse width `0,25`, depth along A–B `0,15` — its centre `0,60` and its bottom `1,00`
   * below the trolley, on its vertical. A silhouette convention, not anthropometry.
   */
  riderEllipsoid: { height: 0.8, width: 0.25, depth: 0.15, centreBelow: 0.6, bottomBelow: 1.0 },
} as const;

/**
 * §19.5's semi-axes for a gabarit `h_rider`: `a = 0,075·h` along `x`, `b = 0,125·h` along `y`,
 * `c = 0,40·h` along `z` — half of {@link AERO.riderEllipsoid}'s full dimensions.
 */
export function riderEllipsoid(hRider: number): Ellipsoid {
  const { height, width, depth } = AERO.riderEllipsoid;
  return { a: (depth * hRider) / 2, b: (width * hRider) / 2, c: (height * hRider) / 2 };
}

/**
 * §19.5's projected area, m²: the shadow of the ellipsoid on a plane of unit normal `n`,
 * `A(n) = π·√(b²c²·n_x² + a²c²·n_y² + a²b²·n_z²)`.
 */
export function riderProjectedArea(e: Ellipsoid, nx: number, ny: number, nz: number): number {
  const { a, b, c } = e;
  return (
    Math.PI * Math.sqrt(b * b * c * c * nx * nx + a * a * c * c * ny * ny + a * a * b * b * nz * nz)
  );
}

/**
 * §19.5's static force on the rider for a horizontal wind `u = (u_x, u_y, 0)`, N:
 * `F = ½·ρ·C_D·π·c·√(b²·u_x² + a²·u_y²)·u` — `½·ρ·C_D·A(u/|u|)·|u|²` along `u`, written without
 * dividing by `|u|`, so a nil wind gives a nil force. Horizontal: no lift, no couple (#127 Q42).
 */
export function riderWindForce(
  e: Ellipsoid,
  ux: number,
  uy: number,
  rho: number,
  CD: number = AERO.riderDrag,
): Vec3 {
  const k = 0.5 * rho * CD * Math.PI * e.c * Math.sqrt(e.b * e.b * ux * ux + e.a * e.a * uy * uy);
  return { x: k * ux, y: k * uy, z: 0 };
}

/**
 * §19.4's normal drag per **stretched** metre, written into `out[0..2]`, N/m:
 * `f_n = q·|u_n|·u_n`, `u_n = u − (u·t)·t`, `q = ½·ρ·C_D⊥·d`. `t` is the unit tangent; the wind is
 * horizontal. Allocation-free. §19.8's seed reads it on the chord; the integrator inlines the same
 * arithmetic at every stage.
 */
export function normalDragInto(
  out: Float64Array,
  ux: number,
  uy: number,
  tx: number,
  ty: number,
  tz: number,
  q: number,
): void {
  const ut = ux * tx + uy * ty;
  const nx = ux - ut * tx;
  const ny = uy - ut * ty;
  const nz = -ut * tz;
  const k = q * Math.sqrt(nx * nx + ny * ny + nz * nz);
  out[0] = k * nx;
  out[1] = k * ny;
  out[2] = k * nz;
}
