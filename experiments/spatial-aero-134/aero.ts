/**
 * The experimental aerodynamic closure of the line (#134) — `docs/simulation-theory.md` §18.3:
 * normal drag, a parameterised lift and a parameterised axial drag, each a force **per metre of
 * stretched line**. Underlying notes: `docs/references/spatial-wind/line-aerodynamics-review.md`
 * §3 (the normal drag and its projection) and `line-lift-axial-drag-significance.md` §3 and §10
 * (the three forces not to confuse) — **no coefficient comes from either**: §18.4 names every
 * value this experiment runs as a probe or as a published figure that does not transfer.
 *
 * Rules this module exists to keep:
 *
 * - **Not the production model.** Nothing under `src/` imports this file. #127 adopted normal drag
 *   alone; the lift and the axial drag exist here to be compared with it, not to ship.
 * - **Three forces, three directions, never one counted twice.** The vertical component the normal
 *   drag gets on a deflected line is a projection of `f_n` and stays in `f_n`; the lift is along
 *   the binormal `t × u_n`, orthogonal to both `t` and `u_n`; the axial drag is along `t`.
 * - **A drag follows the air.** `u` is the velocity of the air relative to the line, pointing where
 *   the air goes, so `f_n` is along `+u_n` and `f_a` along `+(u·t)·t` — §18.3 says why the archived
 *   notes' opposite sign for `f_a` is not kept.
 * - **No division by a speed.** Every term is written so that `u_n = 0` or `u·t = 0` gives a zero
 *   force without a normalised null vector.
 * - **The lift's direction is a hypothesis, not a construction.** Its sign is the sign of the
 *   coefficient, and its dependence on the yaw is one of two declared laws ({@link LiftLaw}).
 * - **SI**: `ρ` in kg/m³, `d` in m, speeds in m/s, forces in N per stretched metre.
 */

/** A vector in §18.2's frame: `x` horizontal A → B, `y` horizontal to the left of A → B, `z` up. */
export type Vec3 = readonly [x: number, y: number, z: number];

/**
 * §18.3's two orientation hypotheses for the lift, both along the binormal `t × u_n`:
 *
 * - `binormal` — `f_L = ½·ρ·C_L·d·|u_n|·(t × u_n)`: the magnitude `½·ρ·|C_L|·d·|u_n|²`, on the side
 *   the sign of `C_L` picks, whatever the yaw. The closure the archived notes wrote.
 * - `yaw-odd` — `f_L = ½·ρ·C_L·d·(u·t)·(t × u_n)`: the magnitude `½·ρ·|C_L|·d·|u·t|·|u_n|`, and a
 *   side that flips with the axial component of the wind. Nil in a pure crossflow. What the
 *   symmetry of a helical strand leaves possible (§18.3), with no claim on its magnitude.
 */
export type LiftLaw = "binormal" | "yaw-odd";

/** The dimensionless coefficients of one model, all on the declared diameter `d`. */
export type AeroCoefficients = {
  /** `C_D⊥`, on the dynamic pressure of the normal component `|u_n|`. */
  readonly normal: number;
  /** `C_L`, signed: its sign is the orientation hypothesis `σ` of §18.3. `0` is no lift. */
  readonly lift: number;
  /** Which yaw dependence the lift takes. Without effect when `lift` is `0`. */
  readonly liftLaw: LiftLaw;
  /** `C_t`, on the dynamic pressure of the axial component `u·t`. `0` is no axial drag. */
  readonly axial: number;
};

/** The three forces on one element, N per stretched metre. */
export type AeroLoad = { readonly normal: Vec3; readonly lift: Vec3; readonly axial: Vec3 };

/** No aerodynamic force at all: the model every no-wind control runs. */
export const NO_AERO: AeroCoefficients = { normal: 0, lift: 0, liftLaw: "binormal", axial: 0 };

/**
 * §18.3, written into `out` as nine numbers — `f_n`, then `f_L`, then `f_a` — so the integrator
 * calls it without allocating. `t` must be a unit vector; `q = ½·ρ·d`, kg/m².
 *
 * ```
 * u_t = u·t                 u_n = u − u_t·t
 * f_n = q·C_D⊥·|u_n|·u_n
 * f_L = q·C_L·|u_n|·(t × u_n)        binormal law
 * f_L = q·C_L·u_t·(t × u_n)          yaw-odd law
 * f_a = q·C_t·|u_t|·u_t·t
 * ```
 *
 * `|t × u_n| = |u_n|` because `t` is a unit vector orthogonal to `u_n`, which is what makes the
 * binormal law's magnitude `q·|C_L|·|u_n|²` with no normalisation.
 */
export function aeroLoadInto(
  out: Float64Array,
  tx: number,
  ty: number,
  tz: number,
  ux: number,
  uy: number,
  uz: number,
  q: number,
  c: AeroCoefficients,
): void {
  const ut = ux * tx + uy * ty + uz * tz;
  const unx = ux - ut * tx;
  const uny = uy - ut * ty;
  const unz = uz - ut * tz;
  const un = Math.sqrt(unx * unx + uny * uny + unz * unz);

  const normal = q * c.normal * un;
  out[0] = normal * unx;
  out[1] = normal * uny;
  out[2] = normal * unz;

  // `t × u_n`, of norm `|u_n|`: zero with `u_n`, so neither law divides by a speed.
  const lift = q * c.lift * (c.liftLaw === "binormal" ? un : ut);
  out[3] = lift * (ty * unz - tz * uny);
  out[4] = lift * (tz * unx - tx * unz);
  out[5] = lift * (tx * uny - ty * unx);

  const axial = q * c.axial * Math.abs(ut) * ut;
  out[6] = axial * tx;
  out[7] = axial * ty;
  out[8] = axial * tz;
}

/**
 * §18.3 for one element, as three vectors: {@link aeroLoadInto} without its packed output. The
 * solver and the measures call the packed form; this one is what a hand calculation is checked
 * against (`aero.test.ts`).
 *
 * @param t the unit tangent of the stretched line, pointing from A to B.
 * @param u the velocity of the air relative to the element, m/s, pointing where the air goes.
 * @param rho air density, kg/m³.
 * @param d the declared diameter, m.
 */
export function lineAeroLoad(
  t: Vec3,
  u: Vec3,
  rho: number,
  d: number,
  c: AeroCoefficients,
): AeroLoad {
  const out = new Float64Array(9);
  aeroLoadInto(out, t[0], t[1], t[2], u[0], u[1], u[2], 0.5 * rho * d, c);
  return {
    normal: [out[0], out[1], out[2]],
    lift: [out[3], out[4], out[5]],
    axial: [out[6], out[7], out[8]],
  };
}
