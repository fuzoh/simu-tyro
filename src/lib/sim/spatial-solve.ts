/**
 * §19's spatial solve — `docs/simulation-theory.md` §19.8 (shooting on `F_A`, damped Newton with a
 * finite-difference Jacobian and Broyden updates, the line search, the seeds; the plane case is the
 * closed form), §19.9 (tolerances), §19.11 (the state and the two classes of failure) and §19.16
 * (no wind is §4–§7 bit for bit).
 *
 * Rules this module exists to keep:
 *
 * - **No wind is the closed form, not a fallback.** With no wind applied `q₀ = (0, 0, −w)` and the
 *   rider's force is vertical, so §19.3 reduces to §4.1/§6.1, whose closed form _is_ the answer:
 *   `solveSpan` is evaluated and wrapped with `y ≡ 0`. A windy solve that fails is a failure, never
 *   answered by the plane model (Q24).
 * - **Failure is a value.** `invalid-input` and `outside-model` say the configuration is outside
 *   the model; `no-convergence` and `slack-limit` say the calculation did not converge here — never
 *   that the line cannot exist (§19.11).
 * - **The numbers are §19.8's and §5's.** 100 iterations, 20 halvings and 5 attempts are
 *   `SOLVER`'s; the tolerance is `residualTolerance` in three dimensions. {@link SPATIAL} holds the
 *   integrator's own three, none physical.
 */

import type {
  SolveError,
  SpanInput,
  SpatialSolveResult,
  SpatialSpanInput,
  SpatialState,
  SpatialWarm,
  Vec3,
} from "./types.ts";

import { riderEllipsoid } from "./aero.ts";
import { xAt, zAt } from "./catenary.ts";
import { loadNode } from "./loads.ts";
import { REFUSAL, Shooter, type ShotInput } from "./shoot.ts";
import { chordBoundFloor, residualTolerance, seedIterates, SOLVER, solveSpan } from "./solve.ts";
import { isAeroNil } from "./spatial-load.ts";
import { WindLine } from "./wind-profile.ts";

/** §19.8–§19.9's numerical constants. None is a physical value. */
export const SPATIAL = {
  /** §19.9's resolution `N`: RK4 steps along the line, split evenly around the trolley. */
  steps: 240,
  /** The central finite difference's relative step, `δ = 10⁻⁶·max(|F_A|, 1 N)` (§19.8). */
  fdRelStep: 1e-6,
  /**
   * §19.9: a solve is polished to `10⁻³·tol(L)` while Newton still decreases `‖R‖`, and accepted
   * at `tol(L)` — a closure at `tol(L)` would leave `≈ EA·tol/L₀` of noise on a tension.
   */
  polishFactor: 1e-3,
} as const;

/** The points §19.8's seed (3) reads the lateral load at, along the straight chord. */
const CHORD_POINTS = 16;

/** `M·v = b` for a 3×3 row-major `M`, partial pivoting; `false` when singular. Writes `v` into `out`. */
function solve3(M: Float64Array, b0: number, b1: number, b2: number, out: Float64Array): boolean {
  const a = [
    [M[0], M[1], M[2], b0],
    [M[3], M[4], M[5], b1],
    [M[6], M[7], M[8], b2],
  ];
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    const p = a[pivot][col];
    if (!(Math.abs(p) > 0) || !Number.isFinite(p)) return false;
    if (pivot !== col) [a[col], a[pivot]] = [a[pivot], a[col]];
    for (let row = col + 1; row < 3; row++) {
      const factor = a[row][col] / a[col][col];
      for (let k = col; k < 4; k++) a[row][k] -= factor * a[col][k];
    }
  }
  for (let row = 2; row >= 0; row--) {
    let sum = a[row][3];
    for (let k = row + 1; k < 3; k++) sum -= a[row][k] * out[k];
    out[row] = sum / a[row][row];
  }
  return Number.isFinite(out[0]) && Number.isFinite(out[1]) && Number.isFinite(out[2]);
}

/** How one attempt ended. */
type Attempt = {
  ok: boolean;
  F: [number, number, number];
  J: Float64Array;
  norm: number;
  iterations: number;
  /** The refusal that ended a failed attempt, `none` when it merely stalled. */
  refusal: number;
  /** The shot's fields still hold the line at `F`: no other shot ran since it was accepted. */
  current: boolean;
};

/** Newton on one seed — §19.8's iteration, Broyden between finite-difference Jacobians. */
function attempt(
  shot: Shooter,
  L: number,
  h: number,
  seed: readonly [number, number, number],
  warmJ: readonly number[] | null,
  tol: number,
  polishFactor: number,
): Attempt {
  const target = tol * polishFactor;
  const F: [number, number, number] = [seed[0], seed[1], seed[2]];
  const J = new Float64Array(9);
  const step = new Float64Array(3);
  const fail = (iterations: number, norm: number): Attempt => ({
    ok: false,
    F,
    J,
    norm,
    iterations,
    refusal: shot.refusal,
    current: false,
  });

  if (!shot.run(F[0], F[1], F[2], null)) return fail(0, Number.POSITIVE_INFINITY);
  let current = true;
  let R0 = shot.x - L;
  let R1 = shot.y;
  let R2 = shot.z - h;
  let norm = Math.hypot(R0, R1, R2);

  /** A full central-difference `J` at `F`; `false` when a perturbed shot is refused. */
  const differentiate = (): boolean => {
    current = false;
    const delta = SPATIAL.fdRelStep * Math.max(Math.hypot(F[0], F[1], F[2]), 1);
    for (let j = 0; j < 3; j++) {
      const base = F[j];
      F[j] = base + delta;
      const okPlus = shot.run(F[0], F[1], F[2], null);
      const px = shot.x;
      const py = shot.y;
      const pz = shot.z;
      F[j] = base - delta;
      const okMinus = okPlus && shot.run(F[0], F[1], F[2], null);
      F[j] = base;
      if (!okMinus) return false;
      J[j] = (px - shot.x) / (2 * delta);
      J[3 + j] = (py - shot.y) / (2 * delta);
      J[6 + j] = (pz - shot.z) / (2 * delta);
    }
    return true;
  };

  let fresh: boolean;
  if (warmJ !== null && warmJ.length === 9 && warmJ.every(Number.isFinite)) {
    J.set(warmJ);
    fresh = false;
  } else {
    if (!differentiate()) return fail(0, norm);
    fresh = true;
  }

  let iterations = 0;
  let lastRefusal: number = REFUSAL.none;
  const done = (): Attempt => ({
    ok: norm <= tol,
    F,
    J,
    norm,
    iterations,
    refusal: norm <= tol ? REFUSAL.none : lastRefusal,
    current,
  });
  while (norm > target && iterations < SOLVER.maxIterations) {
    iterations++;
    if (!solve3(J, -R0, -R1, -R2, step)) {
      if (fresh) break;
      if (!differentiate()) return fail(iterations, norm);
      fresh = true;
      continue;
    }

    // §5.1's line search: halve until `‖R‖` decreases; a refused shot is no decrease.
    let alpha = 1;
    let accepted = false;
    let refusedAll = true;
    let T0 = 0;
    let T1 = 0;
    let T2 = 0;
    let next = norm;
    // Once accepted at `tol(L)`, polishing takes the full step or stops: a step that no longer
    // decreases `‖R‖` has reached the integration's own rounding, and halving it buys nothing.
    const halvings = norm <= tol ? 0 : SOLVER.maxHalvings;
    for (let halving = 0; halving <= halvings; halving++) {
      T0 = F[0] + alpha * step[0];
      T1 = F[1] + alpha * step[1];
      T2 = F[2] + alpha * step[2];
      current = false;
      if (shot.run(T0, T1, T2, null)) {
        refusedAll = false;
        next = Math.hypot(shot.x - L, shot.y, shot.z - h);
        if (next < norm) {
          accepted = true;
          current = true;
          break;
        }
      } else {
        lastRefusal = shot.refusal;
      }
      alpha /= 2;
    }

    if (!accepted) {
      // A Broyden direction that fails gets a fresh finite-difference `J` first (§19.8).
      if (!fresh) {
        if (!differentiate()) return norm <= tol ? done() : fail(iterations, norm);
        fresh = true;
        continue;
      }
      // Already accepted at `tol(L)`: polishing has reached the integration's own rounding.
      if (norm <= tol) break;
      return {
        ok: false,
        F,
        J,
        norm,
        iterations,
        refusal: refusedAll ? lastRefusal : REFUSAL.none,
        current,
      };
    }

    // Broyden's rank-one update: `J += (ΔR − J·Δ)·Δᵀ / (Δᵀ·Δ)`.
    const N0 = shot.x - L;
    const N1 = shot.y;
    const N2 = shot.z - h;
    const s0 = T0 - F[0];
    const s1 = T1 - F[1];
    const s2 = T2 - F[2];
    const ss = s0 * s0 + s1 * s1 + s2 * s2;
    if (ss > 0) {
      const y0 = N0 - R0 - (J[0] * s0 + J[1] * s1 + J[2] * s2);
      const y1 = N1 - R1 - (J[3] * s0 + J[4] * s1 + J[5] * s2);
      const y2 = N2 - R2 - (J[6] * s0 + J[7] * s1 + J[8] * s2);
      J[0] += (y0 * s0) / ss;
      J[1] += (y0 * s1) / ss;
      J[2] += (y0 * s2) / ss;
      J[3] += (y1 * s0) / ss;
      J[4] += (y1 * s1) / ss;
      J[5] += (y1 * s2) / ss;
      J[6] += (y2 * s0) / ss;
      J[7] += (y2 * s1) / ss;
      J[8] += (y2 * s2) / ss;
    }
    fresh = false;
    F[0] = T0;
    F[1] = T1;
    F[2] = T2;
    R0 = N0;
    R1 = N1;
    R2 = N2;
    norm = next;
  }

  return done();
}

/** The plane line of §4–§6 under the weight and the rider's vertical force (§19.8 seed 2). */
function planeInput(input: SpatialSpanInput): SpanInput {
  const { L, h, L0, w, EA, rider } = input;
  return {
    L,
    h,
    L0,
    w,
    EA,
    loads: rider === null ? [] : [{ P: rider.share * rider.weight, s: rider.sP }],
  };
}

/**
 * §19.8's seeds, in order: the caller's warm start, the plane solution, the plane solution with the
 * symmetric share of the lateral load estimated on the straight chord, then §5.2's two seeds lifted
 * as `(H, 0, V₀)`. Duplicates and non-finite seeds are dropped; at most `SOLVER.maxAttempts`.
 */
export function spatialSeeds(input: ShotInput, warm?: SpatialWarm): [number, number, number][] {
  const seeds: [number, number, number][] = [];
  const push = (x: number, y: number, z: number) => {
    if (!(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z))) return;
    if (seeds.some((s) => s[0] === x && s[1] === y && s[2] === z)) return;
    seeds.push([x, y, z]);
  };
  if (warm) push(warm.FA.x, warm.FA.y, warm.FA.z);

  const plane = planeInput(input);
  const solved = input.w > 0 ? solveSpan(plane) : null;
  if (solved?.ok) {
    const { H, V0 } = solved.state;
    push(H, 0, V0);
    const lateral = lateralLoadOnChord(input);
    if (lateral !== 0) push(H, lateral / 2, V0);
  }
  if (input.w > 0) {
    for (const seed of seedIterates(plane).slice(0, 2)) push(seed.H, 0, seed.V0);
  }
  return seeds.slice(0, SOLVER.maxAttempts);
}

/**
 * `∫ p_y dS + P_ext,y` on the straight chord (§19.8 seed 3): the lateral normal drag with the
 * chord's tangent, `λ = 1`, read at the chord's abscissae by a midpoint rule, plus the rider's
 * lateral force at its chord abscissa. A seed's estimate — the answer is the shot's.
 */
function lateralLoadOnChord(input: ShotInput): number {
  const { L, h, L0, aero, rider } = input;
  let total = (input.prescribed?.y ?? 0) * L0;
  if (isAeroNil(aero)) return total;
  const wind = new WindLine(aero.field, L, aero.bearing);
  const chord = Math.hypot(L, h);
  const tx = L / chord;
  const tz = h / chord;
  const q = 0.5 * aero.rho * aero.CDn * aero.d;
  for (let i = 0; i < CHORD_POINTS; i++) {
    wind.at((L * (i + 0.5)) / CHORD_POINTS);
    const ut = wind.along * tx;
    const nx = wind.along - ut * tx;
    const ny = wind.across;
    const nz = -ut * tz;
    total += (q * Math.sqrt(nx * nx + ny * ny + nz * nz) * ny * L0) / CHORD_POINTS;
  }
  if (rider !== null) {
    const e = riderEllipsoid(rider.hRider);
    wind.at((L * rider.sP) / L0);
    const k =
      0.5 *
      aero.rho *
      Math.PI *
      e.c *
      Math.sqrt(e.b * e.b * wind.along * wind.along + e.a * e.a * wind.across * wind.across);
    total += rider.share * k * wind.across;
  }
  return total;
}

/** Tier one on a spatial input, in `solveSpan`'s payload shape, then §5.4's chord bound. */
function refuse(input: SpatialSpanInput): SolveError | null {
  const invalid = (field: string, value: number, bound = 0): SolveError => ({
    kind: "invalid-input",
    field,
    value,
    bound,
    boundKind: "min",
  });
  const positives: [string, number][] = [
    ["L", input.L],
    ["L0", input.L0],
    ["w", input.w],
    ["EA", input.EA],
  ];
  for (const [field, value] of positives) {
    if (!Number.isFinite(value) || value <= 0) return invalid(field, value);
  }
  if (!Number.isFinite(input.h)) return invalid("h", input.h);
  const { aero, rider } = input;
  if (aero !== null) {
    if (!(Number.isFinite(aero.field.speed) && aero.field.speed >= 0)) {
      return invalid("windSpeed", aero.field.speed);
    }
    if (!isAeroNil(aero)) {
      if (!(Number.isFinite(aero.d) && aero.d > 0)) return invalid("d", aero.d);
      // ρ = 0 is a typed value the field accepts: nil drag, and the shot converges onto the plane.
      if (!(Number.isFinite(aero.rho) && aero.rho >= 0)) return invalid("rho", aero.rho);
      if (!(Number.isFinite(aero.CDn) && aero.CDn >= 0)) return invalid("CDn", aero.CDn);
      if (!Number.isFinite(aero.bearing)) return invalid("bearing", aero.bearing);
      if (!Number.isFinite(aero.field.from)) return invalid("windFrom", aero.field.from);
    }
  }
  if (rider !== null) {
    if (!(rider.sP > 0 && rider.sP < input.L0)) return invalid("sP", rider.sP);
    if (!(Number.isFinite(rider.weight) && rider.weight >= 0)) return invalid("P", rider.weight);
    if (!(rider.share > 0 && rider.share <= 1)) return invalid("share", rider.share);
    if (!(Number.isFinite(rider.hRider) && rider.hRider > 0))
      return invalid("hRider", rider.hRider);
  }
  const strength = input.strength;
  if (strength !== undefined && Number.isFinite(strength) && strength > 0) {
    const floor = chordBoundFloor(input, strength);
    if (input.L0 < floor) return invalid("L0", input.L0, floor);
  }
  return null;
}

const vec = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

/** §19.8's plane case: §4–§7's closed form, wrapped as a spatial state with `y ≡ 0`. */
function closedForm(input: SpatialSpanInput): SpatialSolveResult {
  const plane = planeInput(input);
  const solved = solveSpan({ ...plane, strength: input.strength });
  if (!solved.ok) return { ok: false, error: solved.error };
  const state = solved.state;
  const { H, V0, VB } = state;
  const FA = vec(H, 0, V0);
  const rider = input.rider;
  let node: SpatialState["node"] = null;
  if (rider !== null) {
    const P = plane.loads[0].P;
    const below = V0 + input.w * rider.sP;
    const at = loadNode(state, rider.sP);
    node = {
      sP: rider.sP,
      rD: vec(at.x, 0, at.z),
      Tminus: Math.hypot(H, below),
      Tplus: Math.hypot(H, below + P),
      Fminus: vec(H, 0, below),
      Pext: vec(0, 0, -P),
    };
  }
  const closure = Math.hypot(xAt(state, input.L0) - input.L, zAt(state, input.L0) - input.h);
  return {
    ok: true,
    state: {
      method: "closed-form",
      input,
      steps: SPATIAL.steps,
      FA,
      FB: vec(H, 0, VB),
      TA: state.TA,
      TB: state.TB,
      Tmax: state.Tmax,
      HA: H,
      HB: H,
      node,
      ellipsoid: rider === null ? null : riderEllipsoid(rider.hRider),
      closure,
      iterations: state.iterations,
    },
    warm: { FA, jacobian: null },
  };
}

/**
 * The integrator's resolution and the polish of its closure — §19.9's defaults. A test compares
 * `N` with `2N` (§19.9's refinement) and, past 1000 m where `tol(L)` grows with `L`, polishes
 * further so that the closure's own `EA·ε/L₀` stays under the force bar it compares at.
 */
export type ShootOptions = { readonly steps?: number; readonly polishFactor?: number };

/**
 * §19.8's shooting, whatever the wind — **internal**: `solveSpatial` takes it only when a wind is
 * applied. Named so that §19.16's check (shooting forced on a nil wind against §15), §19.9's
 * refinement (`N` against `2N`) and §19.17's control 3 (a prescribed load) can reach it; no app
 * code calls it. Its input is not refused here — {@link solveSpatial} does that.
 */
export function shootSpatial(
  input: ShotInput,
  given?: SpatialWarm,
  { steps = SPATIAL.steps, polishFactor = SPATIAL.polishFactor }: ShootOptions = {},
): SpatialSolveResult {
  const finite = given && Number.isFinite(given.FA.x + given.FA.y + given.FA.z);
  const warm = finite ? given : undefined;
  const shot = new Shooter(input, steps);
  const tol = residualTolerance(input.L);
  let iterations = 0;
  let best = Number.POSITIVE_INFINITY;
  let slack = 0;
  let outside = 0;
  let outsideAt = Number.NaN;

  // The warm start alone first: along a sweep it converges, and the cold seeds — a plane solve
  // among them — are built only when it does not.
  let seeds: [number, number, number][] = warm
    ? [[warm.FA.x, warm.FA.y, warm.FA.z]]
    : spatialSeeds(input);
  let expanded = !warm;
  for (let k = 0; k < seeds.length; k++) {
    const warmJ = k === 0 && warm ? warm.jacobian : null;
    const run = attempt(shot, input.L, input.h, seeds[k], warmJ, tol, polishFactor);
    iterations += run.iterations;
    best = Math.min(best, run.norm);
    // The line this attempt ended on: accepted only if it needed no wind outside `[0, L]`.
    const shotOk = run.current || shot.run(run.F[0], run.F[1], run.F[2], null);
    const beyond = shotOk && !Number.isNaN(shot.outsideAt);
    if (run.ok && shotOk && !beyond) {
      return { ok: true, state: stateOf(input, shot, run, iterations, steps), warm: warmOf(run) };
    }
    if (beyond) {
      outside++;
      outsideAt = shot.outsideAt;
    } else if (run.refusal === REFUSAL.slack) slack++;
    if (!expanded) {
      // `spatialSeeds` lists the warm start first, so the loop resumes on the cold seeds.
      seeds = spatialSeeds(input, warm);
      expanded = true;
    }
  }

  if (seeds.length > 0 && outside === seeds.length) {
    return { ok: false, error: { kind: "outside-model", reason: "wind-abscissa", x: outsideAt } };
  }
  if (seeds.length > 0 && slack === seeds.length) {
    return {
      ok: false,
      error: { kind: "slack-limit", hFloored: SOLVER.slackStiffnessFactor * Math.abs(input.w) },
    };
  }
  return {
    ok: false,
    error: { kind: "no-convergence", attempts: seeds.length, residual: best, reason: "attempts" },
  };
}

function warmOf(run: Attempt): SpatialWarm {
  return { FA: vec(run.F[0], run.F[1], run.F[2]), jacobian: Array.from(run.J) };
}

function stateOf(
  input: ShotInput,
  shot: Shooter,
  run: Attempt,
  iterations: number,
  steps: number,
): SpatialState {
  const [Fx, Fy, Fz] = run.F;
  const rider = input.rider;
  return {
    method: "shooting",
    input,
    steps,
    FA: vec(Fx, Fy, Fz),
    FB: vec(shot.Fx, shot.Fy, shot.Fz),
    TA: Math.hypot(Fx, Fy, Fz),
    TB: Math.hypot(shot.Fx, shot.Fy, shot.Fz),
    Tmax: shot.Tmax,
    HA: Fx,
    HB: shot.Fx,
    node:
      rider === null
        ? null
        : {
            sP: rider.sP,
            rD: vec(shot.xD, shot.yD, shot.zD),
            Tminus: shot.Tminus,
            Tplus: shot.Tplus,
            Fminus: vec(shot.FmX, shot.FmY, shot.FmZ),
            Pext: vec(shot.Px, shot.Py, shot.Pz),
          },
    ellipsoid: shot.ellipsoid,
    closure: run.norm,
    iterations,
  };
}

/**
 * §19's one equilibrium: the spatial state of a span under its weight, the Scenario's wind and,
 * when loaded, the rider held at `S_P` — or why there is none.
 *
 * - **No wind applied** (`aero` `null` or a nil speed): §4–§7's closed form, bit for bit
 *   (`method: "closed-form"`, §19.16).
 * - **Under wind**: §19.8's shooting on `F_A`, seeded from `warm` first.
 *
 * @param warm the previous solution's `F_A` and Jacobian — a sweep's previous position, a pose
 *   inversion's nearest length (§19.8 seed 1).
 */
export function solveSpatial(input: SpatialSpanInput, warm?: SpatialWarm): SpatialSolveResult {
  return solveSpatialWith(input, warm, {});
}

/**
 * {@link solveSpatial} with the shot's options — **internal**: §19.12's sweep accepts each position
 * at `tol(L)` (`polishFactor: 1`), the plane sweep's own bar, because §19.9 polishes the pose's
 * inner solves only; a slot then carries the `≈ EA·tol/L₀` of tension noise the plane engine's
 * steps always have.
 */
export function solveSpatialWith(
  input: SpatialSpanInput,
  warm: SpatialWarm | undefined,
  options: ShootOptions,
): SpatialSolveResult {
  const refusal = refuse(input);
  if (refusal) return { ok: false, error: refusal };
  if (isAeroNil(input.aero)) return closedForm(input);
  return shootSpatial(input, warm, options);
}
