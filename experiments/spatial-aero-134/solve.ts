/**
 * The experimental spatial statics of one line (#134) — `docs/simulation-theory.md` §18.2 (the
 * material equilibrium `dF/dS = −q₀`, `dr/dS = λ·t`, the jump at the rider) and §18.5 (shooting
 * from A, fixed-step RK4, damped Newton on the anchor closure).
 * Underlying notes: `docs/references/equilibre spatial vent.md` §2 and
 * `docs/references/spatial-wind/agent-readiness-solver.md` §4.2 (the « tir » this file is) — no
 * coefficient and no tolerance is taken from them beyond the ones §18.6 quotes.
 *
 * Rules this module exists to keep:
 *
 * - **A prototype for one experiment, not the production engine.** Nothing under `src/` imports
 *   it, and it replaces no solver: #127 owns the spatial engine. It exists because a load that
 *   depends on the tangent has no closed form, so the plane `solveSpan` cannot pose it.
 * - **The existing bricks are reused where they fit**: §5.3's tolerance, and the plane solution of
 *   `solveSpan` as the seed every wind case starts from — which is why a case without wind returns
 *   the plane engine's own line.
 * - **Failure is a value, never a throw**, as in the engine: a case that does not converge is
 *   reported with the closure it reached, never replaced by a neighbour or by the plane line.
 * - **`q₀` is per unstretched metre, the aerodynamic forces per stretched metre.** The factor
 *   `λ = 1 + T/EA` between them is written where the load is assembled, once.
 * - **The rider's force is prescribed.** A vector, identical whatever the aerodynamic model; this
 *   file gives the rider no wind area of its own.
 * - **SI, §18.2's frame**: `x` horizontal A → B, `y` horizontal to the left of A → B, `z` up; A at
 *   the origin, B at `(L, 0, h)`; `S` the unstretched material coordinate from A.
 */

import type { WindComponents } from "@/lib/sim";

import { SOLVER, solveSpan } from "@/lib/sim";

import type { AeroCoefficients, Vec3 } from "./aero.ts";

import { aeroLoadInto } from "./aero.ts";

/** The static rider, held at the trolley: where it sits and the force it puts on the line. */
export type StaticRider = {
  /** The trolley's unstretched material coordinate, m — strictly inside `(0, L₀)`. */
  readonly s: number;
  /** The external force the rider puts on the line, N. A weight alone is `(0, 0, −m·g)`. */
  readonly force: Vec3;
};

/** One line posed to the experimental solver. */
export type SpatialInput = {
  /** Horizontal span between the anchors, m. */
  readonly L: number;
  /** B's height relative to A, m; negative = descending. */
  readonly h: number;
  /** Unstretched length, m. */
  readonly L0: number;
  /** Weight per unstretched metre, N/m. `0` is accepted: the weightless closed forms need it. */
  readonly w: number;
  /** Axial stiffness, N. */
  readonly EA: number;
  /** The declared aerodynamic diameter, m — constant during a calculation. */
  readonly d: number;
  /** Air density, kg/m³. */
  readonly rho: number;
  /** The uniform horizontal wind, m/s, as the velocity the air has in the line's frame. */
  readonly wind: WindComponents;
  /** The aerodynamic model's coefficients. */
  readonly aero: AeroCoefficients;
  /** The static rider, or `null` for the unloaded line. */
  readonly rider: StaticRider | null;
  /**
   * **Verification only**: a uniform load prescribed per unstretched metre, N/m, on top of the
   * weight. It lets a constant vector load be checked against the rotated plane catenary; no
   * case of the matrix sets it.
   */
  readonly prescribed?: Vec3;
};

/** A solved line: the nodes of the integration, in ascending `S`. */
export type SpatialSolution = {
  readonly input: SpatialInput;
  /**
   * The nodes. With a rider its node appears **twice**, `S_P⁻` then `S_P⁺`: same position, two
   * forces — §18.2's jump is read off them.
   */
  readonly S: Float64Array;
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly z: Float64Array;
  /** The internal force the `S⁺` side exerts on the `S⁻` side, N. */
  readonly Fx: Float64Array;
  readonly Fy: Float64Array;
  readonly Fz: Float64Array;
  /**
   * The smooth pieces, as inclusive node index ranges — one without a rider, two with one. Inside
   * a piece the nodes are evenly spaced in `S`, by an even number of steps.
   */
  readonly pieces: readonly { readonly from: number; readonly to: number }[];
  /** `‖r(L₀) − r_B‖`, m — §18.6's anchor closure. */
  readonly closure: number;
  /** Newton iterations spent, every attempt included. */
  readonly iterations: number;
};

/** Why a line has no solution here. A non-convergence is not a physical impossibility. */
export type SpatialFailure =
  | { readonly kind: "invalid-input"; readonly field: string; readonly value: number }
  | {
      readonly kind: "no-convergence";
      /** The smallest anchor closure any attempt reached, m. */
      readonly closure: number;
      readonly iterations: number;
    };

export type SpatialResult =
  | { readonly ok: true; readonly solution: SpatialSolution }
  | { readonly ok: false; readonly failure: SpatialFailure };

/** §18.5's numerical constants. None is a physical coefficient. */
export const SPATIAL = {
  /** RK4 steps along the line. Even, and split evenly-stepped between the rider's two sides. */
  steps: 240,
  /**
   * Where Newton stops polishing, m. Four orders under §5.3's acceptance bar, so that the closure
   * a converged case reports is the integration's and not the iteration's.
   */
  polish: 1e-10,
  /** Newton iterations per attempt. */
  maxIterations: 60,
  /** Halvings §5.1's line search may take before the step is refused. */
  maxHalvings: 30,
  /** The finite-difference step of the Jacobian, relative to `|F_A|`. */
  jacobianStep: 1e-6,
} as const;

/**
 * §5.3's acceptance bar on the anchor closure, in its 3-D norm: `1×10⁻⁶ m` up to 1000 m of span,
 * `1×10⁻⁶·L` beyond — the plane engine's own, quoted from its constants.
 */
export function closureTolerance(L: number): number {
  return L <= SOLVER.toleranceScaleSpan ? SOLVER.tolerance : SOLVER.tolerance * L;
}

/**
 * The RK4 steps each side of the rider gets: both even (Simpson reads the pieces in
 * `measures.ts`), at least two, in proportion to the two unstretched lengths.
 */
export function pieceSteps(steps: number, L0: number, rider: StaticRider | null): number[] {
  if (rider === null) return [steps];
  const first = Math.min(steps - 2, Math.max(2, 2 * Math.round((steps * rider.s) / L0 / 2)));
  return [first, steps - first];
}

/**
 * One shot from A: §18.2's equations integrated by RK4 from a trial `F_A`, the rider's jump taken
 * on the way. Holds its scratch state so that the Newton loop allocates nothing.
 */
class Shot {
  /** End position and end force of the last {@link run}. */
  x = 0;
  y = 0;
  z = 0;
  Fx = 0;
  Fy = 0;
  Fz = 0;

  private readonly aero = new Float64Array(9);
  private dFx = 0;
  private dFy = 0;
  private dFz = 0;
  private drx = 0;
  private dry = 0;
  private drz = 0;
  private readonly q: number;
  /** The RK4 steps of each smooth piece — {@link pieceSteps}. */
  readonly pieces: readonly number[];

  constructor(
    private readonly input: SpatialInput,
    steps: number,
  ) {
    this.q = 0.5 * input.rho * input.d;
    this.pieces = pieceSteps(steps, input.L0, input.rider);
  }

  /**
   * §18.2's right-hand side at one force: `dF/dS = −q₀`, `dr/dS = λ·t`, with
   * `q₀ = (0, 0, −w) + p + λ·(f_n + f_L + f_a)`.
   *
   * @returns `false` where the line carries no tension: no tangent, no equation.
   */
  private rhs(Fx: number, Fy: number, Fz: number): boolean {
    const T = Math.sqrt(Fx * Fx + Fy * Fy + Fz * Fz);
    if (!(T > 0) || !Number.isFinite(T)) return false;
    const tx = Fx / T;
    const ty = Fy / T;
    const tz = Fz / T;
    const lambda = 1 + T / this.input.EA;
    const { wind, prescribed } = this.input;
    const a = this.aero;
    aeroLoadInto(a, tx, ty, tz, wind.along, wind.across, 0, this.q, this.input.aero);
    // The aerodynamic forces are per stretched metre: `λ` turns them into `q₀`'s unstretched one.
    const qx = (prescribed?.[0] ?? 0) + lambda * (a[0] + a[3] + a[6]);
    const qy = (prescribed?.[1] ?? 0) + lambda * (a[1] + a[4] + a[7]);
    const qz = -this.input.w + (prescribed?.[2] ?? 0) + lambda * (a[2] + a[5] + a[8]);
    this.dFx = -qx;
    this.dFy = -qy;
    this.dFz = -qz;
    this.drx = lambda * tx;
    this.dry = lambda * ty;
    this.drz = lambda * tz;
    return true;
  }

  /**
   * Integrate from `F_A`. With `record`, every node is written into it.
   *
   * @returns `false` when the tension vanished on the way: the trial is refused, not clamped.
   */
  run(FAx: number, FAy: number, FAz: number, record: Nodes | null): boolean {
    const { L0, rider } = this.input;
    let Fx = FAx;
    let Fy = FAy;
    let Fz = FAz;
    let x = 0;
    let y = 0;
    let z = 0;
    let S = 0;
    let at = 0;
    for (let piece = 0; piece < this.pieces.length; piece++) {
      const n = this.pieces[piece];
      const end = rider !== null && piece === 0 ? rider.s : L0;
      const start = S;
      const hS = (end - start) / n;
      if (record) record.write(at++, S, x, y, z, Fx, Fy, Fz);
      for (let i = 1; i <= n; i++) {
        if (!this.rhs(Fx, Fy, Fz)) return false;
        const k1x = this.dFx;
        const k1y = this.dFy;
        const k1z = this.dFz;
        const g1x = this.drx;
        const g1y = this.dry;
        const g1z = this.drz;
        if (!this.rhs(Fx + 0.5 * hS * k1x, Fy + 0.5 * hS * k1y, Fz + 0.5 * hS * k1z)) return false;
        const k2x = this.dFx;
        const k2y = this.dFy;
        const k2z = this.dFz;
        const g2x = this.drx;
        const g2y = this.dry;
        const g2z = this.drz;
        if (!this.rhs(Fx + 0.5 * hS * k2x, Fy + 0.5 * hS * k2y, Fz + 0.5 * hS * k2z)) return false;
        const k3x = this.dFx;
        const k3y = this.dFy;
        const k3z = this.dFz;
        const g3x = this.drx;
        const g3y = this.dry;
        const g3z = this.drz;
        if (!this.rhs(Fx + hS * k3x, Fy + hS * k3y, Fz + hS * k3z)) return false;
        const sixth = hS / 6;
        Fx += sixth * (k1x + 2 * k2x + 2 * k3x + this.dFx);
        Fy += sixth * (k1y + 2 * k2y + 2 * k3y + this.dFy);
        Fz += sixth * (k1z + 2 * k2z + 2 * k3z + this.dFz);
        x += sixth * (g1x + 2 * g2x + 2 * g3x + this.drx);
        y += sixth * (g1y + 2 * g2y + 2 * g3y + this.dry);
        z += sixth * (g1z + 2 * g2z + 2 * g3z + this.drz);
        // The piece's last node is its end exactly, not a sum of steps.
        S = i === n ? end : start + i * hS;
        if (record) record.write(at++, S, x, y, z, Fx, Fy, Fz);
      }
      if (rider !== null && piece === 0) {
        // §18.2's jump: `F(S_P⁺) − F(S_P⁻) = −P_ext`.
        Fx -= rider.force[0];
        Fy -= rider.force[1];
        Fz -= rider.force[2];
      }
    }
    if (!Number.isFinite(x + y + z + Fx + Fy + Fz)) return false;
    this.x = x;
    this.y = y;
    this.z = z;
    this.Fx = Fx;
    this.Fy = Fy;
    this.Fz = Fz;
    return true;
  }
}

/** The node arrays one recorded shot fills. */
class Nodes {
  readonly S: Float64Array;
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly z: Float64Array;
  readonly Fx: Float64Array;
  readonly Fy: Float64Array;
  readonly Fz: Float64Array;

  constructor(count: number) {
    this.S = new Float64Array(count);
    this.x = new Float64Array(count);
    this.y = new Float64Array(count);
    this.z = new Float64Array(count);
    this.Fx = new Float64Array(count);
    this.Fy = new Float64Array(count);
    this.Fz = new Float64Array(count);
  }

  write(
    i: number,
    S: number,
    x: number,
    y: number,
    z: number,
    Fx: number,
    Fy: number,
    Fz: number,
  ): void {
    this.S[i] = S;
    this.x[i] = x;
    this.y[i] = y;
    this.z[i] = z;
    this.Fx[i] = Fx;
    this.Fy[i] = Fy;
    this.Fz[i] = Fz;
  }
}

/** `M·v = b` for a 3×3 `M`, by elimination with partial pivoting; `null` when singular. */
function solve3(M: number[][], b: number[]): number[] | null {
  const a = M.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    if (!(Math.abs(a[pivot][col]) > 0) || !Number.isFinite(a[pivot][col])) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    for (let row = col + 1; row < 3; row++) {
      const factor = a[row][col] / a[col][col];
      for (let k = col; k < 4; k++) a[row][k] -= factor * a[col][k];
    }
  }
  const v = [0, 0, 0];
  for (let row = 2; row >= 0; row--) {
    let sum = a[row][3];
    for (let k = row + 1; k < 3; k++) sum -= a[row][k] * v[k];
    v[row] = sum / a[row][row];
  }
  return v.every(Number.isFinite) ? v : null;
}

type NewtonOutcome = { F: number[]; closure: number; iterations: number };

/**
 * §18.5's damped Newton on the anchor closure `R(F_A) = r(L₀) − r_B`. The Jacobian is by central
 * finite differences; the line search halves the step until the closure decreases, as §5.1's
 * does.
 *
 * @returns the best iterate and the closure it reached, or `null` when the seed itself has no
 *   tension somewhere along the line.
 */
function newton(shot: Shot, input: SpatialInput, seed: readonly number[]): NewtonOutcome | null {
  const closureOf = (): number => Math.hypot(shot.x - input.L, shot.y, shot.z - input.h);
  let F = [...seed];
  if (!shot.run(F[0], F[1], F[2], null)) return null;
  let R = [shot.x - input.L, shot.y, shot.z - input.h];
  let norm = closureOf();
  let iterations = 0;

  while (norm > SPATIAL.polish && iterations < SPATIAL.maxIterations) {
    iterations++;
    const delta = SPATIAL.jacobianStep * Math.max(Math.hypot(F[0], F[1], F[2]), 1);
    const J = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    let differentiable = true;
    for (let j = 0; j < 3; j++) {
      const plus = [...F];
      const minus = [...F];
      plus[j] += delta;
      minus[j] -= delta;
      if (!shot.run(plus[0], plus[1], plus[2], null)) {
        differentiable = false;
        break;
      }
      const px = shot.x;
      const py = shot.y;
      const pz = shot.z;
      if (!shot.run(minus[0], minus[1], minus[2], null)) {
        differentiable = false;
        break;
      }
      J[0][j] = (px - shot.x) / (2 * delta);
      J[1][j] = (py - shot.y) / (2 * delta);
      J[2][j] = (pz - shot.z) / (2 * delta);
    }
    if (!differentiable) break;
    const step = solve3(J, [-R[0], -R[1], -R[2]]);
    if (step === null) break;

    let alpha = 1;
    let accepted = false;
    for (let halvings = 0; halvings <= SPATIAL.maxHalvings; halvings++) {
      const trial = [F[0] + alpha * step[0], F[1] + alpha * step[1], F[2] + alpha * step[2]];
      if (shot.run(trial[0], trial[1], trial[2], null)) {
        const candidate = closureOf();
        if (candidate < norm) {
          F = trial;
          R = [shot.x - input.L, shot.y, shot.z - input.h];
          norm = candidate;
          accepted = true;
          break;
        }
      }
      alpha /= 2;
    }
    // No shorter step decreases the closure: the iterate sits on the integration's own rounding.
    if (!accepted) break;
  }
  return { F, closure: norm, iterations };
}

/** The plane line of the engine under the weight and the rider's vertical force: the seed. */
function planeSeed(input: SpatialInput): number[] | null {
  if (!(input.w > 0)) return null;
  const down = input.rider === null ? 0 : -input.rider.force[2];
  if (down < 0) return null;
  const plane = solveSpan({
    L: input.L,
    h: input.h,
    L0: input.L0,
    w: input.w,
    EA: input.EA,
    loads: input.rider === null ? [] : [{ P: down, s: input.rider.s }],
  });
  return plane.ok ? [plane.state.H, 0, plane.state.V0] : null;
}

/** The first input that is not a finite number of the sign the equations need, or `null`. */
function refuse(input: SpatialInput, steps: number): SpatialFailure | null {
  const invalid = (field: string, value: number): SpatialFailure => ({
    kind: "invalid-input",
    field,
    value,
  });
  const positive: [string, number][] = [
    ["L", input.L],
    ["L0", input.L0],
    ["EA", input.EA],
  ];
  for (const [field, value] of positive) {
    if (!(value > 0) || !Number.isFinite(value)) return invalid(field, value);
  }
  const nonNegative: [string, number][] = [
    ["w", input.w],
    ["d", input.d],
    ["rho", input.rho],
  ];
  for (const [field, value] of nonNegative) {
    if (!(value >= 0) || !Number.isFinite(value)) return invalid(field, value);
  }
  const finite: [string, number][] = [
    ["h", input.h],
    ["wind.along", input.wind.along],
    ["wind.across", input.wind.across],
    ["aero.normal", input.aero.normal],
    ["aero.lift", input.aero.lift],
    ["aero.axial", input.aero.axial],
  ];
  for (const [field, value] of finite) {
    if (!Number.isFinite(value)) return invalid(field, value);
  }
  if (input.rider !== null) {
    const { s, force } = input.rider;
    if (!(s > 0 && s < input.L0)) return invalid("rider.s", s);
    if (!force.every(Number.isFinite)) return invalid("rider.force", Number.NaN);
  }
  if (!Number.isInteger(steps) || steps < 4 || steps % 2 !== 0) return invalid("steps", steps);
  return null;
}

/**
 * §18.2's equilibrium of one line, solved by §18.5's shooting.
 *
 * Newton starts from the caller's `seed` when it gives one, then — if that did not close the
 * anchors — from the plane line of the engine, which is exact without wind: a calm case returns
 * the engine's own line. There is no further fallback: a case neither start closes is a
 * `no-convergence`, reported with the closure it reached.
 *
 * @param options.steps RK4 steps along the line — even, at least 4.
 * @param options.seed a trial `F_A`, N: a neighbouring case's, or the closed forms' own guess
 *   where the line has no weight and the engine therefore no plane line to offer.
 */
export function solveSpatial(
  input: SpatialInput,
  options: { readonly steps?: number; readonly seed?: Vec3 } = {},
): SpatialResult {
  const steps = options.steps ?? SPATIAL.steps;
  const refusal = refuse(input, steps);
  if (refusal) return { ok: false, failure: refusal };

  const shot = new Shot(input, steps);
  const tolerance = closureTolerance(input.L);
  let iterations = 0;
  let best = Infinity;

  const attempt = (seed: readonly number[] | null): number[] | null => {
    if (seed === null) return null;
    const outcome = newton(shot, input, seed);
    if (outcome === null) return null;
    iterations += outcome.iterations;
    best = Math.min(best, outcome.closure);
    return outcome.closure <= tolerance ? outcome.F : null;
  };

  const found = attempt(options.seed ?? null) ?? attempt(planeSeed(input));
  if (found === null) {
    return { ok: false, failure: { kind: "no-convergence", closure: best, iterations } };
  }

  const nodes = new Nodes(shot.pieces.reduce((count, n) => count + n + 1, 0));
  shot.run(found[0], found[1], found[2], nodes);
  const ranges: { from: number; to: number }[] = [];
  let from = 0;
  for (const n of shot.pieces) {
    ranges.push({ from, to: from + n });
    from += n + 1;
  }
  return {
    ok: true,
    solution: {
      input,
      S: nodes.S,
      x: nodes.x,
      y: nodes.y,
      z: nodes.z,
      Fx: nodes.Fx,
      Fy: nodes.Fy,
      Fz: nodes.Fz,
      pieces: ranges,
      closure: Math.hypot(shot.x - input.L, shot.y, shot.z - input.h),
      iterations,
    },
  };
}
