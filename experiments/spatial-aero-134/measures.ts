/**
 * What the experiment reads off a solved line (#134) — `docs/simulation-theory.md` §18.5 (the
 * outputs: reactions, tensions, flèche, déport latéral, écart maximal à A–B, garde, distributed
 * loads) and §18.6 (the residuals every case is checked on: global force and moment balance, the
 * jump at the rider). The definitions are the maintainer's: flèche and écart maximal à A–B are
 * Q9/Q10 of `docs/references/spatial-wind/agent-readiness-decisions.md`, the extruded terrain is
 * Q16. « Déport latéral » is the brief's name for the lateral offset in metres — not the Banane,
 * which the glossary keeps qualitative (§18.5, « Two names »).
 *
 * Rules this module exists to keep:
 *
 * - **The écart maximal à A–B is combined point by point, then maximised** — never the norm of
 *   a flèche and a déport latéral taken at two different places.
 * - **The garde is vertical, over the profile extruded sideways, less the whole gabarit.** It is
 *   not a clearance above the real ground off the A–B axis, and it claims none.
 * - **An extremum is read between the nodes, not at one.** Inside a smooth piece three
 *   consecutive nodes give a parabola's vertex; at the rider's node — a corner — the node itself
 *   is the candidate. That is what lets a refinement converge on a flèche.
 * - **The balances re-integrate the loads with another rule.** The shot integrates `dF/dS = −q₀`
 *   by RK4; the balance sums `q₀` over the nodes by Simpson. They agree only if the nodes are an
 *   equilibrium.
 * - **Engine-pure reading of the ground**: `zGroundAt` is the engine's, read at each node's `x`.
 */

import type { Terrain } from "@/lib/sim";

import { zGroundAt } from "@/lib/sim";

import type { Vec3 } from "./aero.ts";
import type { SpatialSolution } from "./solve.ts";

import { aeroLoadInto } from "./aero.ts";

/** The line's shape against the straight line A–B, and its clearance. Lengths in m. */
export type ShapeMeasures = {
  /** Flèche: the greatest vertical drop below A–B, never negative — `0` on a line lifted above it. */
  readonly sag: number;
  /** The greatest vertical rise above A–B, never negative. Not a flèche: reported beside it. */
  readonly rise: number;
  /** Déport latéral: the lateral offset of greatest magnitude, **signed** (`+` = left of A → B). */
  readonly sway: number;
  /** Écart maximal à A–B: `max over the line of √(vertical offset² + lateral offset²)`. */
  readonly combined: number;
  /** Garde verticale: `min over the line of z − z_ground(x) − h_gabarit`. */
  readonly clearance: number;
};

/** The forces at the ends and along the line, N. */
export type ForceMeasures = {
  /** The force the line exerts on anchor A: `F(0)`. */
  readonly reactionA: Vec3;
  /** The force the line exerts on anchor B: `−F(L₀)`. */
  readonly reactionB: Vec3;
  /** `|F(0)|` — the total tension at A, what a dynamometer at the tensioning anchor reads. */
  readonly TA: number;
  /** `|F(L₀)|`. */
  readonly TB: number;
  /** The greatest tension over the nodes, both sides of the rider's node included. */
  readonly Tmax: number;
  /** `F_x(0)`: the component along the horizontal axis A → B at A — #127's `H`. */
  readonly HA: number;
};

/** One distributed load along the line, N per stretched metre. */
export type LoadLevel = {
  /** The mean of its magnitude over the stretched line. */
  readonly mean: number;
  /** Its greatest magnitude over the nodes. */
  readonly max: number;
};

/** §18.3's three forces as the solved line carries them. */
export type LoadMeasures = {
  readonly normal: LoadLevel;
  readonly lift: LoadLevel;
  readonly axial: LoadLevel;
  /**
   * The mean stretch: the stretched length over the unstretched one, `Σ/L₀`. A mean per
   * stretched metre times this is the load per **unstretched** metre — the metre `w` is given
   * on, and what §18.2's `q₀ = (0, 0, −w) + λ·f` sets against it (§18.5).
   */
  readonly stretch: number;
};

/** §18.6's residuals of one solved line. */
export type Residuals = {
  /** `‖r(L₀) − r_B‖`, m. */
  readonly closure: number;
  /** `‖F(L₀) − F(0) + ∫q₀·dS + P_ext‖`, N. */
  readonly force: number;
  /** `‖r_B × F(L₀) + ∫r × q₀·dS + r_P × P_ext‖` about A, N·m. */
  readonly moment: number;
  /** `‖F(S_P⁺) − F(S_P⁻) + P_ext‖`, N; `0` without a rider. */
  readonly jump: number;
  /** `‖r(S_P⁺) − r(S_P⁻)‖`, m; `0` without a rider. */
  readonly continuity: number;
};

const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/**
 * The vertex of the parabola through three evenly spaced samples, when it is a maximum lying
 * between the first and the last of them; `null` otherwise.
 */
function vertexOf(first: number, middle: number, last: number): number | null {
  const curvature = first - 2 * middle + last;
  // A flat or rounding-level triple has no vertex to read.
  if (!(curvature < 0)) return null;
  // In steps from the middle sample: `−1` is the first, `+1` the last.
  const offset = (first - last) / (2 * curvature);
  if (!(offset >= -1 && offset <= 1)) return null;
  return middle - (first - last) ** 2 / (8 * curvature);
}

/**
 * The greatest value of a sampled function over the line, read between the nodes.
 *
 * Per smooth piece — the nodes are evenly spaced in `S` there — every three consecutive nodes
 * give a parabola, and where it has a maximum inside their span its vertex is a candidate beside
 * the nodes themselves. **Every** triple is read, not only the one around the greatest sample:
 * two humps of nearly the same height must not be decided by which node happens to sit higher.
 * A corner — the rider's node — ends a piece, so no parabola spans it: a smooth maximum less
 * than a step from the corner is still read by the piece's last triple, and where the function
 * is still rising into the corner the vertex falls outside the triple and the node's own value
 * stands.
 */
export function maximumOver(solution: SpatialSolution, valueAt: (node: number) => number): number {
  let best = -Infinity;
  for (const { from, to } of solution.pieces) {
    let before = valueAt(from);
    if (before > best) best = before;
    if (to === from) continue;
    let middle = valueAt(from + 1);
    if (middle > best) best = middle;
    for (let i = from + 2; i <= to; i++) {
      const after = valueAt(i);
      if (after > best) best = after;
      const vertex = vertexOf(before, middle, after);
      if (vertex !== null && vertex > best) best = vertex;
      before = middle;
      middle = after;
    }
  }
  return best;
}

/**
 * §18.5's shape outputs against A–B, and the vertical clearance over the extruded profile.
 *
 * @param terrain the ground along A–B, in the engine's own type; read at each node's `x`, whatever
 *   its `y` — `z_terrain(x, y) = z_profile(x)`.
 * @param gabarit the rider's whole vertical envelope, m, subtracted in full.
 */
export function shapeMeasures(
  solution: SpatialSolution,
  terrain: Terrain,
  gabarit: number,
): ShapeMeasures {
  const { x, y, z, input } = solution;
  // The vertical offset below A–B at the node's own abscissa: positive under the straight line.
  const drop = (i: number): number => (input.h * x[i]) / input.L - z[i];
  const left = maximumOver(solution, (i) => y[i]);
  const right = maximumOver(solution, (i) => -y[i]);
  return {
    sag: Math.max(0, maximumOver(solution, drop)),
    rise: Math.max(
      0,
      maximumOver(solution, (i) => -drop(i)),
    ),
    sway: left >= right ? left : -right,
    combined: maximumOver(solution, (i) => Math.hypot(drop(i), y[i])),
    clearance: -maximumOver(solution, (i) => zGroundAt(terrain, x[i]) + gabarit - z[i]),
  };
}

/** The reactions and the tensions of a solved line. */
export function forceMeasures(solution: SpatialSolution): ForceMeasures {
  const { Fx, Fy, Fz } = solution;
  const last = Fx.length - 1;
  let Tmax = 0;
  for (let i = 0; i <= last; i++) Tmax = Math.max(Tmax, Math.hypot(Fx[i], Fy[i], Fz[i]));
  return {
    reactionA: [Fx[0], Fy[0], Fz[0]],
    reactionB: [-Fx[last], -Fy[last], -Fz[last]],
    TA: Math.hypot(Fx[0], Fy[0], Fz[0]),
    TB: Math.hypot(Fx[last], Fy[last], Fz[last]),
    Tmax,
    HA: Fx[0],
  };
}

/** What one node carries: the stretch, and §18.3's forces per stretched metre. */
function nodeLoads(solution: SpatialSolution, i: number, out: Float64Array): number {
  const { input, Fx, Fy, Fz } = solution;
  const T = Math.hypot(Fx[i], Fy[i], Fz[i]);
  aeroLoadInto(
    out,
    Fx[i] / T,
    Fy[i] / T,
    Fz[i] / T,
    input.wind.along,
    input.wind.across,
    0,
    0.5 * input.rho * input.d,
    input.aero,
  );
  return 1 + T / input.EA;
}

/** Simpson's weights over one piece of `n` even steps, the step factored out. */
function simpsonWeight(i: number, from: number, to: number): number {
  if (i === from || i === to) return 1;
  return (i - from) % 2 === 1 ? 4 : 2;
}

/**
 * §18.3's three forces along the solved line: the mean of each magnitude over the **stretched**
 * length — the forces are per stretched metre — and its greatest value at a node; and the mean
 * stretch that carries a mean to the unstretched metre.
 */
export function loadMeasures(solution: SpatialSolution): LoadMeasures {
  const out = new Float64Array(9);
  const sums = [0, 0, 0];
  const maxima = [0, 0, 0];
  let stretched = 0;
  let unstretched = 0;
  for (const { from, to } of solution.pieces) {
    unstretched += solution.S[to] - solution.S[from];
    const third = (solution.S[to] - solution.S[from]) / (to - from) / 3;
    for (let i = from; i <= to; i++) {
      const lambda = nodeLoads(solution, i, out);
      const weight = third * simpsonWeight(i, from, to) * lambda;
      stretched += weight;
      for (let k = 0; k < 3; k++) {
        const magnitude = Math.hypot(out[3 * k], out[3 * k + 1], out[3 * k + 2]);
        sums[k] += weight * magnitude;
        maxima[k] = Math.max(maxima[k], magnitude);
      }
    }
  }
  const level = (k: number): LoadLevel => ({ mean: sums[k] / stretched, max: maxima[k] });
  return { normal: level(0), lift: level(1), axial: level(2), stretch: stretched / unstretched };
}

/**
 * §18.6's residuals. The distributed load `q₀ = (0, 0, −w) + p + λ·(f_n + f_L + f_a)` is summed
 * over the nodes by Simpson's rule, piece by piece, and set against the end forces and the
 * rider's prescribed force — a second quadrature of what the shot integrated by RK4.
 */
export function residuals(solution: SpatialSolution): Residuals {
  const { input, S, x, y, z, Fx, Fy, Fz, pieces } = solution;
  const out = new Float64Array(9);
  const prescribed = input.prescribed ?? [0, 0, 0];
  const load = [0, 0, 0];
  const moment = [0, 0, 0];
  for (const { from, to } of pieces) {
    const third = (S[to] - S[from]) / (to - from) / 3;
    for (let i = from; i <= to; i++) {
      const lambda = nodeLoads(solution, i, out);
      const q: Vec3 = [
        prescribed[0] + lambda * (out[0] + out[3] + out[6]),
        prescribed[1] + lambda * (out[1] + out[4] + out[7]),
        -input.w + prescribed[2] + lambda * (out[2] + out[5] + out[8]),
      ];
      const weight = third * simpsonWeight(i, from, to);
      const m = cross([x[i], y[i], z[i]], q);
      for (let k = 0; k < 3; k++) {
        load[k] += weight * q[k];
        moment[k] += weight * m[k];
      }
    }
  }

  const last = S.length - 1;
  const force = [
    Fx[last] - Fx[0] + load[0],
    Fy[last] - Fy[0] + load[1],
    Fz[last] - Fz[0] + load[2],
  ];
  const end = cross([x[last], y[last], z[last]], [Fx[last], Fy[last], Fz[last]]);
  const torque = [end[0] + moment[0], end[1] + moment[1], end[2] + moment[2]];

  let jump = 0;
  let continuity = 0;
  if (input.rider !== null) {
    const before = pieces[0].to;
    const after = pieces[1].from;
    const P = input.rider.force;
    const lever = cross([x[before], y[before], z[before]], P);
    for (let k = 0; k < 3; k++) {
      force[k] += P[k];
      torque[k] += lever[k];
    }
    jump = Math.hypot(
      Fx[after] - Fx[before] + P[0],
      Fy[after] - Fy[before] + P[1],
      Fz[after] - Fz[before] + P[2],
    );
    continuity = Math.hypot(x[after] - x[before], y[after] - y[before], z[after] - z[before]);
  }

  return {
    closure: solution.closure,
    force: Math.hypot(force[0], force[1], force[2]),
    moment: Math.hypot(torque[0], torque[1], torque[2]),
    jump,
    continuity,
  };
}
