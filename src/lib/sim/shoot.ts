/**
 * §19.8's integrator — `docs/simulation-theory.md` §19.3 (material equilibrium `dF/dS = −q₀`,
 * `dr/dS = (1 + T/EA)·F/T`, the trolley's jump), §19.4 (the line's load `q₀`, read at the `x` of
 * every stage), §19.5–§19.6 (the rider's force at the node) and §19.8 (fixed-step RK4 in `S`, the
 * pieces, the refused trials). One shot integrates from A with a trial `F_A` and reports where the
 * line ends; `spatial-solve.ts` drives `F_A` until it ends on B.
 *
 * **Internal.** Not re-exported from `index.ts`: the shot is the solver's and the sampler's, and
 * the state (`SpatialState`) is what crosses the engine's boundary.
 *
 * Rules this module exists to keep:
 *
 * - **Deterministic.** The same input, `N` and `F_A` give the same nodes bit for bit: sampling a
 *   state re-runs its shot rather than storing a polyline (§19.8, types.ts § 2).
 * - **Refused, never clamped.** A stage whose tension falls under `0,01·|w|` (§4.3's number,
 *   `SOLVER.slackStiffnessFactor`) or a value that is not finite ends the shot with its reason; the
 *   line search then shortens the step. No tension is floored.
 * - **No result reads the wind outside `[0, L]`.** A trial line is not a line of the model: one
 *   that ends past B reads the field at B so that Newton can cross it, and records where it went.
 *   The **accepted** line is checked — one that needs the wind outside the span is `outside-model`
 *   (§19.8, §19.11), never an answer.
 * - **Allocation-free in the loop.** Scalars and preallocated typed arrays: a windy sweep shoots
 *   about a thousand times per parameter change (`docs/performance/spatial-sweep.md`).
 */

import type { Ellipsoid, SpatialSpanInput, Vec3 } from "./types.ts";

import { AERO, riderEllipsoid } from "./aero.ts";
import { residualTolerance, SOLVER } from "./solve.ts";
import { isAeroNil } from "./spatial-load.ts";
import { WindLine } from "./wind-profile.ts";

/** Why a shot ended early. `0` is a shot that reached `L₀`. */
export const REFUSAL = {
  none: 0,
  /** A stage's tension under §19.8's floor `0,01·|w|`. */
  slack: 1,
  /** A value that is not finite. */
  nonFinite: 2,
} as const;

export type Refusal = (typeof REFUSAL)[keyof typeof REFUSAL];

/**
 * The integrator's own numbers — none is physical.
 *
 * `domainMargin`: the field is defined on `[0, L]` and the converged line ends on B, at
 * `x(L₀) = L ± tol(L)`; the last RK4 stage of the last step is a predictor of that end, within
 * `O(h³)` of it. A stage abscissa beyond an anchor by at most `domainMargin·tol(L)` is that
 * rounding of the anchor itself and reads the field **at** the anchor; an accepted line that went
 * further is outside the model (§19.8, §19.11).
 */
export const SHOT = { domainMargin: 10 } as const;

/**
 * §19.8's pieces: the line is cut at the trolley's node, and a piece of unstretched length `ℓ_i`
 * gets `max(2, 2·round(N·ℓ_i/(2·L₀)))` equal steps — even, so Simpson's rule applies to the
 * controls.
 */
export function pieceSteps(steps: number, L0: number, sP: number | null): number[] {
  const even = (length: number) => Math.max(2, 2 * Math.round((steps * length) / (2 * L0)));
  return sP === null ? [even(L0)] : [even(sP), even(L0 - sP)];
}

/** The nodes one recorded shot fills, in ascending `S` — the trolley's node twice (`S_P⁻`, `S_P⁺`). */
export class ShotNodes {
  readonly S: Float64Array;
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly z: Float64Array;
  readonly Fx: Float64Array;
  readonly Fy: Float64Array;
  readonly Fz: Float64Array;

  constructor(readonly count: number) {
    this.S = new Float64Array(count);
    this.x = new Float64Array(count);
    this.y = new Float64Array(count);
    this.z = new Float64Array(count);
    this.Fx = new Float64Array(count);
    this.Fy = new Float64Array(count);
    this.Fz = new Float64Array(count);
  }

  write(i: number, S: number, x: number, y: number, z: number, Fx: number, Fy: number, Fz: number) {
    this.S[i] = S;
    this.x[i] = x;
    this.y[i] = y;
    this.z[i] = z;
    this.Fx[i] = Fx;
    this.Fy[i] = Fy;
    this.Fz[i] = Fz;
  }
}

/**
 * What a shot integrates. `prescribed` is a **test-only** constant load per unstretched metre added
 * to `q₀` — §19.17's control 3 needs a uniform load vector no wind produces; no caller of the
 * engine sets it, and `solveSpatial` cannot pass it.
 */
export type ShotInput = SpatialSpanInput & { readonly prescribed?: Vec3 | null };

/**
 * One line's shot, reusable across trials: everything that does not depend on `F_A` is hoisted
 * into the constructor. After {@link run}, the fields hold the end of the line and the node.
 */
export class Shooter {
  /** `r(L₀)` and `F(L₀)` of the last accepted shot. */
  x = 0;
  y = 0;
  z = 0;
  Fx = 0;
  Fy = 0;
  Fz = 0;
  /** The trolley's node and the tensions either side of it. */
  xD = 0;
  yD = 0;
  zD = 0;
  Tminus = 0;
  Tplus = 0;
  /** `F(S_P⁻)`, N. */
  FmX = 0;
  FmY = 0;
  FmZ = 0;
  /** `P_ext` at the node, N. */
  Px = 0;
  Py = 0;
  Pz = 0;
  /** The greatest `|F|` over the nodes. */
  Tmax = 0;
  /** Why the last shot ended early. */
  refusal: Refusal = REFUSAL.none;
  /**
   * The farthest abscissa outside the field's domain the last shot needed the wind at, or `NaN`.
   * The shot read the field at the nearest anchor there; a line that ends with one is outside the
   * model (§19.8, §19.11).
   */
  outsideAt = Number.NaN;

  /** RK4 steps per piece. */
  readonly pieces: readonly number[];
  /** Nodes a recorded shot writes. */
  readonly nodeCount: number;
  /** The ellipsoid of the rider, or `null`. */
  readonly ellipsoid: Ellipsoid | null;

  // Stage derivative, written by `rhs`.
  private dFx = 0;
  private dFy = 0;
  private dFz = 0;
  private drx = 0;
  private dry = 0;
  private drz = 0;
  private T = 0;

  private readonly L: number;
  private readonly L0: number;
  private readonly w: number;
  private readonly EA: number;
  private readonly tFloor: number;
  private readonly windy: boolean;
  private readonly wind: WindLine | null;
  private readonly uniform: boolean;
  private readonly xLow: number;
  private readonly xHigh: number;
  /** `½·ρ·C_D⊥·d`, N·s²/m³. */
  private readonly q: number;
  private readonly px: number;
  private readonly py: number;
  private readonly pz: number;
  private readonly sP: number;
  private readonly riderWeight: number;
  private readonly share: number;
  /** `½·ρ·C_D·π·c`, and `b²`, `a²` — §19.5's force without its square root. */
  private readonly riderK: number;
  private readonly b2: number;
  private readonly a2: number;
  private ux = 0;
  private uy = 0;

  constructor(input: ShotInput, steps: number) {
    const { L, L0, w, EA, aero, rider } = input;
    this.L = L;
    this.L0 = L0;
    this.w = w;
    this.EA = EA;
    this.tFloor = SOLVER.slackStiffnessFactor * Math.abs(w);
    this.pieces = pieceSteps(steps, L0, rider === null ? null : rider.sP);
    this.nodeCount = this.pieces.reduce((count, n) => count + n + 1, 0);

    const applied = isAeroNil(aero) ? null : aero;
    this.windy = applied !== null;
    this.wind = applied === null ? null : new WindLine(applied.field, L, applied.bearing);
    this.uniform = this.wind === null || this.wind.uniform;
    if (this.wind !== null) {
      this.ux = this.wind.along;
      this.uy = this.wind.across;
    }
    const margin = SHOT.domainMargin * residualTolerance(L);
    this.xLow = -margin;
    this.xHigh = L + margin;
    this.q = applied === null ? 0 : 0.5 * applied.rho * applied.CDn * applied.d;

    const prescribed = input.prescribed ?? null;
    this.px = prescribed?.x ?? 0;
    this.py = prescribed?.y ?? 0;
    this.pz = prescribed?.z ?? 0;

    this.sP = rider?.sP ?? Number.NaN;
    this.riderWeight = rider?.weight ?? 0;
    this.share = rider?.share ?? 0;
    this.ellipsoid = rider === null ? null : riderEllipsoid(rider.hRider);
    const e = this.ellipsoid;
    this.riderK =
      e === null || applied === null ? 0 : 0.5 * applied.rho * AERO.riderDrag * Math.PI * e.c;
    this.b2 = e === null ? 0 : e.b * e.b;
    this.a2 = e === null ? 0 : e.a * e.a;
  }

  /**
   * Reads the wind at `x` into `ux`, `uy`. Outside the field's domain it notes the abscissa in
   * {@link outsideAt} and reads the nearest anchor — a continuation of the trial's residual, so that
   * Newton can cross `x = L`; the line accepted is checked, never the trial (§19.8).
   */
  private windAt(x: number): boolean {
    if (!Number.isFinite(x)) {
      this.refusal = REFUSAL.nonFinite;
      return false;
    }
    if (!(x >= this.xLow && x <= this.xHigh)) {
      const beyond = x < 0 ? -x : x - this.L;
      const noted = this.outsideAt < 0 ? -this.outsideAt : this.outsideAt - this.L;
      if (!(beyond <= noted)) this.outsideAt = x;
    }
    if (this.uniform) return true;
    const wind = this.wind as WindLine;
    wind.at(x < 0 ? 0 : x > this.L ? this.L : x);
    this.ux = wind.along;
    this.uy = wind.across;
    return true;
  }

  /** §19.3–§19.4's right-hand side at one stage; `false` refuses the shot. */
  private rhs(Fx: number, Fy: number, Fz: number, x: number): boolean {
    const T = Math.sqrt(Fx * Fx + Fy * Fy + Fz * Fz);
    if (!Number.isFinite(T)) {
      this.refusal = REFUSAL.nonFinite;
      return false;
    }
    if (!(T >= this.tFloor && T > 0)) {
      this.refusal = REFUSAL.slack;
      return false;
    }
    this.T = T;
    const tx = Fx / T;
    const ty = Fy / T;
    const tz = Fz / T;
    const lambda = 1 + T / this.EA;
    let qx = this.px;
    let qy = this.py;
    let qz = this.pz - this.w;
    if (this.windy) {
      if (!this.windAt(x)) return false;
      // §19.4: `u_n = u − (u·t)·t`, `f_n = q·|u_n|·u_n` per stretched metre, `λ·f_n` per unstretched.
      const ut = this.ux * tx + this.uy * ty;
      const nx = this.ux - ut * tx;
      const ny = this.uy - ut * ty;
      const nz = -ut * tz;
      const k = lambda * this.q * Math.sqrt(nx * nx + ny * ny + nz * nz);
      qx += k * nx;
      qy += k * ny;
      qz += k * nz;
    }
    this.dFx = -qx;
    this.dFy = -qy;
    this.dFz = -qz;
    this.drx = lambda * tx;
    this.dry = lambda * ty;
    this.drz = lambda * tz;
    return true;
  }

  /**
   * One shot from A with `F(0) = F_A`. On `true` the fields hold `r(L₀)`, `F(L₀)`, the node and
   * `T_max`; on `false`, {@link refusal} says why. `record` receives every node when given.
   */
  run(FAx: number, FAy: number, FAz: number, record: ShotNodes | null): boolean {
    this.refusal = REFUSAL.none;
    this.outsideAt = Number.NaN;
    let Fx = FAx;
    let Fy = FAy;
    let Fz = FAz;
    let x = 0;
    let y = 0;
    let z = 0;
    let S = 0;
    let at = 0;
    let Tmax = 0;
    const pieces = this.pieces;
    const loaded = pieces.length === 2;
    for (let piece = 0; piece < pieces.length; piece++) {
      const n = pieces[piece];
      const end = loaded && piece === 0 ? this.sP : this.L0;
      const start = S;
      const hS = (end - start) / n;
      const half = 0.5 * hS;
      if (record !== null) record.write(at++, S, x, y, z, Fx, Fy, Fz);
      for (let i = 1; i <= n; i++) {
        if (!this.rhs(Fx, Fy, Fz, x)) return false;
        if (this.T > Tmax) Tmax = this.T;
        const k1x = this.dFx;
        const k1y = this.dFy;
        const k1z = this.dFz;
        const g1x = this.drx;
        const g1y = this.dry;
        const g1z = this.drz;
        if (!this.rhs(Fx + half * k1x, Fy + half * k1y, Fz + half * k1z, x + half * g1x)) {
          return false;
        }
        const k2x = this.dFx;
        const k2y = this.dFy;
        const k2z = this.dFz;
        const g2x = this.drx;
        const g2y = this.dry;
        const g2z = this.drz;
        if (!this.rhs(Fx + half * k2x, Fy + half * k2y, Fz + half * k2z, x + half * g2x)) {
          return false;
        }
        const k3x = this.dFx;
        const k3y = this.dFy;
        const k3z = this.dFz;
        const g3x = this.drx;
        const g3y = this.dry;
        const g3z = this.drz;
        if (!this.rhs(Fx + hS * k3x, Fy + hS * k3y, Fz + hS * k3z, x + hS * g3x)) return false;
        const sixth = hS / 6;
        Fx += sixth * (k1x + 2 * k2x + 2 * k3x + this.dFx);
        Fy += sixth * (k1y + 2 * k2y + 2 * k3y + this.dFy);
        Fz += sixth * (k1z + 2 * k2z + 2 * k3z + this.dFz);
        x += sixth * (g1x + 2 * g2x + 2 * g3x + this.drx);
        y += sixth * (g1y + 2 * g2y + 2 * g3y + this.dry);
        z += sixth * (g1z + 2 * g2z + 2 * g3z + this.drz);
        // The piece's last node is its end exactly, not a sum of steps.
        S = i === n ? end : start + i * hS;
        if (record !== null) record.write(at++, S, x, y, z, Fx, Fy, Fz);
      }
      const Tend = Math.sqrt(Fx * Fx + Fy * Fy + Fz * Fz);
      if (Tend > Tmax) Tmax = Tend;
      if (loaded && piece === 0) {
        // §19.5: the rider's wind is read at the node's own abscissa `x_D`.
        let Px = 0;
        let Py = 0;
        if (this.windy) {
          if (!this.windAt(x)) return false;
          const k =
            this.riderK * Math.sqrt(this.b2 * this.ux * this.ux + this.a2 * this.uy * this.uy);
          Px = this.share * k * this.ux;
          Py = this.share * k * this.uy;
        }
        const Pz = -this.share * this.riderWeight;
        this.xD = x;
        this.yD = y;
        this.zD = z;
        this.Tminus = Tend;
        this.FmX = Fx;
        this.FmY = Fy;
        this.FmZ = Fz;
        this.Px = Px;
        this.Py = Py;
        this.Pz = Pz;
        // §19.3's jump: `F(S_P⁺) − F(S_P⁻) = −P_ext`.
        Fx -= Px;
        Fy -= Py;
        Fz -= Pz;
        this.Tplus = Math.sqrt(Fx * Fx + Fy * Fy + Fz * Fz);
      }
    }
    if (!Number.isFinite(x + y + z + Fx + Fy + Fz)) {
      this.refusal = REFUSAL.nonFinite;
      return false;
    }
    this.x = x;
    this.y = y;
    this.z = z;
    this.Fx = Fx;
    this.Fy = Fy;
    this.Fz = Fz;
    this.Tmax = Tmax;
    return true;
  }
}
