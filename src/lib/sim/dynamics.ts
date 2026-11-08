/**
 * The passager's ride — `docs/simulation-theory.md` §12.2 (a point mass along the frozen loaded
 * trajectory, its equation of motion and its constants) and §12.1 (the quasi-static validity
 * criterion), as the research « Modèles de vitesse du passager » (#8) settled them and ticket #89
 * contracted them. Underlying reference report: `docs/references/algo simulation tyrolienne.md`
 * §10 (« point matériel sur trajectoire figée ») — the one value taken from it is the steel
 * fallback `μ`, which §12.2 tags `[CONVENTION]`.
 *
 * Rules this module exists to keep:
 *
 * - **The trajectory is frozen.** The Sweep already solved where the trolley hangs at every
 *   position; the ride runs along that polyline `z_D(x_D)` and never re-solves a span. No dynamic
 *   tension, no lateral drift, no braking, no centrifugal term: §12.2 calls the last one optional
 *   and #89 asks for nothing else.
 * - **One equation for both families, two trolley laws.** `m·dv/dt = m·g·sinθ − F_friction −
 *   F_drag` holds on a câble as on a corde (Jojić 2025, éq. 18), but the friction does not travel:
 *   the SSF fit `F₀ + k_v·v` is a corde measurement and a câble gets §12.2's constant-`μ` fallback,
 *   an Unconfirmed Default. {@link TrolleyFriction} is the union that keeps them apart.
 * - **Wind enters as its projection on the tangent.** `v_rel` is the component of
 *   `v_passager − v_vent` along the trajectory, so only the along-line wind, times `cos θ`, ever
 *   reaches the drag; a cross wind changes nothing here.
 * - **The engine is dependency-free and SI** — m, s, kg, N, rad; positions and velocities are
 *   signed along A → B, `z` positive up, as §2 fixes.
 */

import type { SweepStep } from "./types.ts";

/**
 * The trolley's resistance, one law per family (§12.2, research #8). Never a pulley efficiency:
 * a Petzl 95 % is an EN 12278 hauling rating, not a force opposed to a trolley at 20 m/s.
 */
export type TrolleyFriction =
  /** Corde: the SSF fit `F = F₀ + k_v·v` `[FIELD:SSF]`, independent of the passager's weight. */
  | { readonly law: "ssf"; readonly F0: number; readonly kv: number }
  /** Câble: `F = μ·N`, `N = m·g·cos θ` — §12.2's fallback `[CONVENTION]`, unconfirmed. */
  | { readonly law: "coulomb"; readonly mu: number };

/**
 * §12.2's constants and the integrator's own two parameters. Every physical value is a shipped
 * **default** the Scenario may override, never a silent constant.
 */
export const DYNAMICS = {
  /** m/s² — § 2's fixed, unexposed `g`, declared here as each engine module with physics does. */
  g: 9.81,
  /**
   * `C_dA`, m² — the SSF back-fit on its instrumented line `[FIELD:SSF]` (§12.2): a harnessed
   * caver on a corde, one campaign. Shared by both families as an editable default.
   */
  CdA: 0.45,
  /** The editable field's bounds, m² — `[CONVENTION]`: they are not on the SSF page. */
  CdABand: { min: 0.3, max: 0.6 },
  /** Corde: `F₀` 15 N and `k_v` 1,5 kg/s, the SSF fit `[FIELD:SSF]` (§12.2). */
  textile: { law: "ssf", F0: 15, kv: 1.5 },
  /**
   * Câble: `μ` 0,015, §12.2's constant-`μ` fallback from [ALGO §10.3]'s 0,015–0,02, taken at its
   * low end — `[CONVENTION]`, an Unconfirmed Default. No open source separates steel from textile.
   */
  steel: { law: "coulomb", mu: 0.015 },
  /** kg/m³ — §12.2's sea-level density, the value without a profil to read an altitude from. */
  rhoSeaLevel: 1.225,
  /** §12.1: quasi-static holds for `v/c ≲ 0,2` — the conservative of [R1 B7] and [R2 B7]. */
  quasiStaticLimit: 0.2,
  /**
   * The longest stretch, m, one integration step covers. Not physics: against a tenth of it, the
   * Point d'arrêt of the tests' lines moved by under 5 mm, the vitesse d'arrivée by 10⁻¹¹ m/s and
   * the duration by 0,05 s in 100 s.
   */
  step: 1,
  /**
   * How many times the passager may come to rest and start again before the ride is called
   * unsettled. Not physics either: with `F₀ > 0` or `μ > 0` the swing dies in a few turns, and only
   * a trolley that holds nothing at rest swings on — which is then reported, not guessed. It is
   * also what bounds the integration: between two rests the passager runs one way to an end.
   */
  maxRestarts: 1000,
} as const;

/**
 * §12.2's ISA air density at an altitude, kg/m³: `ρ = p/(R_s·T)`,
 * `p = 101325·(1 − 2,25577×10⁻⁵·h)^5,2559` Pa, `T = 288,15 − 0,0065·h` K, `R_s = 287,05 J/(kg·K)`
 * ([R2 §3]; [R1 §3] agrees).
 *
 * @param altitude metres above sea level.
 */
export function airDensity(altitude: number): number {
  const p = 101325 * (1 - 2.25577e-5 * altitude) ** 5.2559;
  const T = 288.15 - 0.0065 * altitude;
  return p / (287.05 * T);
}

/**
 * The frozen loaded trajectory as the ride reads it: the trolley's node at every Sweep Step, plus
 * the two anchors, where the trolley sits on the line's own end.
 */
export type RidePath = {
  /** Horizontal position, m, strictly increasing from `0` (A) to `L` (B). */
  readonly x: Float64Array;
  /** Height relative to A, m. */
  readonly z: Float64Array;
  /** Tension in the member at the trolley, N — what §12.1's wave speed reads. */
  readonly T: Float64Array;
};

/**
 * The polyline the passager rides: A, every solved Sweep Step's node in order, B. A step that would
 * not advance `x` is skipped, so every segment has a direction.
 *
 * @param steps one member's Sweep Steps — with two Brins porteurs, a member loaded at `P/2`.
 * @param span the anchors' frame: B at `(L, h)`.
 * @throws RangeError when `steps` is empty — a traverse that never happened has no trajectory.
 */
export function ridePath(
  steps: readonly SweepStep[],
  { L, h }: { readonly L: number; readonly h: number },
): RidePath {
  if (steps.length === 0) throw new RangeError("ridePath: a traverse with no solved step");
  const x = [0];
  const z = [0];
  // The tension at the trolley is `H / cos θ`, with `θ` the cable's slope at the node (§4.1).
  const tension = (step: SweepStep) => step.H / Math.cos(step.theta);
  const T = [tension(steps[0])];
  for (const step of steps) {
    if (!(step.xD > x[x.length - 1] && step.xD < L)) continue;
    x.push(step.xD);
    z.push(step.zD);
    T.push(tension(step));
  }
  x.push(L);
  z.push(h);
  T.push(tension(steps[steps.length - 1]));
  return { x: Float64Array.from(x), z: Float64Array.from(z), T: Float64Array.from(T) };
}

/** One ride posed to the integrator. */
export type RideInput = {
  readonly path: RidePath;
  /** The passager's mass, kg — whole, whatever the number of Brins porteurs. */
  readonly m: number;
  /** `C_dA`, m². */
  readonly CdA: number;
  /** `ρ`, kg/m³. */
  readonly rho: number;
  readonly trolley: TrolleyFriction;
  /** The wind's horizontal component along A → B, m/s — positive blows toward B (dans le dos). */
  readonly windAlong: number;
};

/** The passager at one instant. */
export type RideSample = {
  /** Time since the departure, s. */
  readonly t: number;
  /** Horizontal position, m. */
  readonly x: number;
  /** Height relative to A, m. */
  readonly z: number;
  /** Speed along the trajectory, m/s — signed, positive toward B. */
  readonly v: number;
  /** Acceleration along the trajectory from this instant on, m/s² — signed, positive toward B. */
  readonly a: number;
};

/** How a ride ends. */
export type RideEnd =
  /** B reached — `v` is the vitesse d'arrivée, without braking. */
  | { readonly kind: "arrival"; readonly v: number; readonly t: number }
  /**
   * The Point d'arrêt: speed back to zero where the slope cannot start the passager again, or the
   * passager carried back onto the departure (`x` 0).
   */
  | { readonly kind: "stop"; readonly x: number; readonly t: number }
  /** Still swinging after {@link DYNAMICS.maxRestarts} turns: nothing holds the passager at rest. */
  | { readonly kind: "unsettled"; readonly t: number };

/** A whole ride: the samples in time order, and how it ended. */
export type Ride = { readonly samples: readonly RideSample[]; readonly end: RideEnd };

/** Where the passager stands still, about to move: a segment, the distance along it, a direction. */
type Rest = { i: number; sigma: number; d: 1 | -1 };

/**
 * The ride from a controlled departure: at rest on A, then §12.2's equation of motion along the
 * trajectory until B is reached, the passager stops for good, or the swing never settles.
 *
 * Integrated per segment of the polyline, where the slope is constant, in the distance travelled
 * `σ` rather than in time: `d(v²/2)/dσ` is the acceleration along the direction of travel, so a
 * frictionless ride conserves `½v² − g·Δz` exactly, and a turning point is a zero of `v²/2` inside
 * one step rather than a sign change between two. Time follows from `dt = 2·dσ/(v₀ + v₁)`.
 *
 * At rest on a segment the passager starts again only if the net drive — gravity along the
 * trajectory plus the wind's drag at zero speed — beats the trolley's hold, `F₀` or `μ·N`.
 */
export function ride({ path, m, CdA, rho, trolley, windAlong: u }: RideInput): Ride {
  const { g } = DYNAMICS;
  const n = path.x.length - 1;
  const length = new Float64Array(n);
  const sin = new Float64Array(n);
  const cos = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const dx = path.x[i + 1] - path.x[i];
    const dz = path.z[i + 1] - path.z[i];
    length[i] = Math.hypot(dx, dz);
    sin[i] = dz / length[i];
    cos[i] = dx / length[i];
  }
  /** `½·ρ·C_dA`, kg/m. */
  const drag = 0.5 * rho * CdA;

  /** The trolley's resistance on segment `i` at a speed, N — magnitude, opposed to the travel. */
  const resistance: (i: number, speed: number) => number =
    trolley.law === "ssf"
      ? (_i: number, speed: number) => trolley.F0 + trolley.kv * speed
      : (i: number) => trolley.mu * m * g * cos[i];

  /** §12.2's acceleration along A → B on segment `i`, at velocity `v`, travelling in `d`. */
  const accel = (i: number, v: number, d: 1 | -1) => {
    // `v_rel`: `v_passager − v_vent` projected on the tangent (research #8, #89).
    const rel = v - u * cos[i];
    return -g * sin[i] - (d * resistance(i, Math.abs(v)) + drag * rel * Math.abs(rel)) / m;
  };

  /** `d(v²/2)/dσ` travelling in `d`, which is the acceleration counted along the travel. */
  const slope = (i: number, e: number, d: 1 | -1) =>
    d * accel(i, d * Math.sqrt(2 * Math.max(e, 0)), d);

  /** One classical Runge–Kutta step of `v²/2` over `h` metres of segment `i`. */
  const step = (i: number, e: number, d: 1 | -1, h: number) => {
    const k1 = slope(i, e, d);
    const k2 = slope(i, e + 0.5 * h * k1, d);
    const k3 = slope(i, e + 0.5 * h * k2, d);
    const k4 = slope(i, e + h * k3, d);
    return e + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
  };

  /** The distance in `(0, h]` at which `v²/2` reaches zero, by bisection on the step's length. */
  const turningDistance = (i: number, e: number, d: 1 | -1, h: number) => {
    let lo = 0;
    let hi = h;
    for (let k = 0; k < 60; k++) {
      const mid = 0.5 * (lo + hi);
      if (step(i, e, d, mid) >= 0) lo = mid;
      else hi = mid;
    }
    return lo;
  };

  /** Along A → B, the force at rest on segment `i`: gravity, and the wind's drag at `v = 0`. */
  const drive = (i: number) => {
    const rel = -u * cos[i];
    return -m * g * sin[i] - drag * rel * Math.abs(rel);
  };

  /**
   * Does the passager, at rest at `sigma` on segment `i`, start again — and where to? A rest on a
   * vertex reads the segment the drive points into, so a V between two segments that both push
   * toward it holds. `"A"` and `"B"` are the line's ends.
   */
  const depart = (i: number, sigma: number): Rest | "A" | "B" | null => {
    const F = drive(i);
    if (Math.abs(F) <= resistance(i, 0)) return null;
    const d = F > 0 ? 1 : -1;
    if (d > 0 && sigma >= length[i]) {
      if (i === n - 1) return "B";
      return drive(i + 1) > resistance(i + 1, 0) ? { i: i + 1, sigma: 0, d } : null;
    }
    if (d < 0 && sigma <= 0) {
      if (i === 0) return "A";
      return drive(i - 1) < -resistance(i - 1, 0) ? { i: i - 1, sigma: length[i - 1], d } : null;
    }
    return { i, sigma, d };
  };

  const samples: RideSample[] = [];
  let t = 0;
  const record = (i: number, sigma: number, v: number, a: number) =>
    samples.push({ t, x: path.x[i] + sigma * cos[i], z: path.z[i] + sigma * sin[i], v, a });

  const start = depart(0, 0);
  if (start === null || start === "A" || start === "B") {
    record(0, 0, 0, 0);
    return { samples, end: { kind: "stop", x: 0, t } };
  }
  let { i, sigma, d } = start;
  let e = 0;
  let restarts = 0;
  record(i, sigma, 0, accel(i, 0, d));

  for (;;) {
    const remaining = d > 0 ? length[i] - sigma : sigma;
    const h = Math.min(DYNAMICS.step, remaining);
    const before = Math.sqrt(2 * e);
    let after = step(i, e, d, h);
    const turned = after <= 0;
    const travelled = after < 0 ? turningDistance(i, e, d, h) : h;
    if (turned) after = 0;
    const v = Math.sqrt(2 * after);
    if (before + v > 0) t += (2 * travelled) / (before + v);
    e = after;
    sigma = travelled === remaining ? (d > 0 ? length[i] : 0) : sigma + d * travelled;

    if (!turned) {
      if (sigma === (d > 0 ? length[i] : 0)) {
        if (d > 0 && i === n - 1) {
          record(i, sigma, v, accel(i, v, d));
          return { samples, end: { kind: "arrival", v, t } };
        }
        if (d < 0 && i === 0) {
          record(i, sigma, -v, accel(i, -v, d));
          return { samples, end: { kind: "stop", x: 0, t } };
        }
        record(i, sigma, d * v, accel(i, d * v, d));
        i += d;
        sigma = d > 0 ? 0 : length[i];
        continue;
      }
      record(i, sigma, d * v, accel(i, d * v, d));
      continue;
    }

    // A turning point: `v` is zero here. The passager holds, or starts again.
    const next = depart(i, sigma);
    if (next === null || next === "A") {
      record(i, sigma, 0, 0);
      return { samples, end: { kind: "stop", x: samples[samples.length - 1].x, t } };
    }
    if (next === "B") {
      record(i, sigma, 0, 0);
      return { samples, end: { kind: "arrival", v: 0, t } };
    }
    restarts += 1;
    if (restarts > DYNAMICS.maxRestarts) {
      record(i, sigma, 0, 0);
      return { samples, end: { kind: "unsettled", t } };
    }
    ({ i, sigma, d } = next);
    record(i, sigma, 0, accel(i, 0, d));
  }
}

/** §12.1's check over one ride: the largest `v/c`, and where it is reached. */
export type QuasiStatic = {
  /** `max |v| / c` over the ride, `c = √(T/μ)` the member's transverse wave speed. */
  readonly ratio: number;
  /** Horizontal position of that maximum, m. */
  readonly atX: number;
};

/**
 * §12.1's validity criterion along a ride: the transverse wave speed `c = √(T/μ)` of the member at
 * the trolley, against the passager's speed. Above {@link DYNAMICS.quasiStaticLimit} the frozen
 * trajectory stops describing the line — sag lag, travelling waves — and the dynamic outputs carry
 * a warning; how wrong they then are is not published (§16, item 10).
 *
 * @param samples the ride.
 * @param path the trajectory it ran on, whose `T` is the tension at the trolley.
 * @param linearMass the member's `μ`, kg/m.
 */
export function quasiStaticRatio(
  samples: readonly RideSample[],
  path: RidePath,
  linearMass: number,
): QuasiStatic {
  let ratio = 0;
  let atX = 0;
  for (const sample of samples) {
    const c = Math.sqrt(tensionAt(path, sample.x) / linearMass);
    const r = Math.abs(sample.v) / c;
    if (r > ratio) {
      ratio = r;
      atX = sample.x;
    }
  }
  return { ratio, atX };
}

/** The tension at `x` along the path, linear between two nodes, N. */
function tensionAt({ x, T }: RidePath, at: number): number {
  let lo = 0;
  let hi = x.length - 1;
  if (at <= x[lo]) return T[lo];
  if (at >= x[hi]) return T[hi];
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (x[mid] <= at) lo = mid;
    else hi = mid;
  }
  const f = (at - x[lo]) / (x[hi] - x[lo]);
  return T[lo] + f * (T[hi] - T[lo]);
}
