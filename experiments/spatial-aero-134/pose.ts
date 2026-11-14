/**
 * The inverse of the separate comparison (#134) — `docs/simulation-theory.md` §18.7: the
 * unstretched length at which the **unloaded line under the scenario wind** reads a given total
 * tension at the tensioning anchor A. That is #127's tension de pose: a wind, or an aerodynamic
 * model, that changes describes another installation, and its `L₀` is solved anew.
 *
 * Rules this module exists to keep:
 *
 * - **The length is recomputed in the open.** It is this module's whole output, reported for each
 *   model beside the results it leads to — never a hidden correction inside the main comparison,
 *   which holds `L₀` fixed.
 * - **The taut branch only.** `T_A(L₀)` falls as the line lengthens and, on a very slack line,
 *   rises again (§7). The search walks from a starting length in the direction that closes the
 *   gap and stops if the tension stops moving that way: a target it cannot bracket is a failure
 *   reported as such, not a length.
 * - **A local root is not a proof of uniqueness.** The bracket is found from the starting length
 *   outward; nothing here claims no other length reads the same tension.
 * - **Failure is a value**: an equilibrium that does not converge on the way is the answer.
 */

import type { Vec3 } from "./aero.ts";
import type { SpatialFailure, SpatialInput, SpatialSolution } from "./solve.ts";

import { solveSpatial } from "./solve.ts";

/** §18.7's search constants. None is physical. */
export const POSE = {
  /** The first step away from the starting length, as a share of the chord. */
  firstStep: 1e-4,
  /** How many times the step may double before the target is called out of reach. */
  maxExpansions: 40,
  /** Root iterations once bracketed. */
  maxIterations: 100,
  /** The target is met when the tension is within this share of it. */
  tolerance: 1e-10,
} as const;

/** Why no length was found. `L0` is where the search stopped, m; `tension` what A read there, N. */
export type PoseFailure =
  /** The unloaded line has no equilibrium at a length the search tried. */
  | { readonly kind: "equilibrium"; readonly L0: number; readonly failure: SpatialFailure }
  /** The tension stopped moving toward the target before reaching it. */
  | { readonly kind: "unreachable"; readonly L0: number; readonly tension: number }
  /** The bracket did not close on the target within `POSE.maxIterations`. */
  | { readonly kind: "no-convergence"; readonly L0: number; readonly tension: number };

export type PoseResult =
  | {
      readonly ok: true;
      /** The unstretched length that reads the target, m. */
      readonly L0: number;
      /** The unloaded line at that length. */
      readonly solution: SpatialSolution;
      /** `|F(0)|` there, N. */
      readonly tension: number;
    }
  | { readonly ok: false; readonly failure: PoseFailure };

/**
 * The `L₀` at which the unloaded line reads `target` at anchor A, searched from `start`.
 *
 * Bracket first — steps doubling away from `start`, toward a longer line when it reads too tight
 * and a shorter one when too slack — then the Illinois variant of the false position inside the
 * bracket, each equilibrium seeded with the one before it.
 *
 * @param line the line without its length; any rider is ignored — the pose is unloaded.
 * @param target the tension de pose, N: the total tension at A.
 * @param start a length to search from, m — the no-wind length of the same pose is the natural one.
 */
export function resolvePoseLength(
  line: Omit<SpatialInput, "L0" | "rider">,
  target: number,
  start: number,
  options: { readonly steps?: number } = {},
): PoseResult {
  let seed: Vec3 | undefined;
  type Reading = { L0: number; gap: number; solution: SpatialSolution };

  const read = (L0: number): Reading | PoseFailure => {
    const result = solveSpatial({ ...line, L0, rider: null }, { steps: options.steps, seed });
    if (!result.ok) return { kind: "equilibrium", L0, failure: result.failure };
    const { Fx, Fy, Fz } = result.solution;
    seed = [Fx[0], Fy[0], Fz[0]];
    return { L0, gap: Math.hypot(Fx[0], Fy[0], Fz[0]) - target, solution: result.solution };
  };
  const done = (reading: Reading): PoseResult => ({
    ok: true,
    L0: reading.L0,
    solution: reading.solution,
    tension: reading.gap + target,
  });
  const met = (reading: Reading): boolean => Math.abs(reading.gap) <= POSE.tolerance * target;

  const first = read(start);
  if ("kind" in first) return { ok: false, failure: first };
  if (met(first)) return done(first);

  // Too tight ⇒ lengthen; too slack ⇒ shorten. `tight` and `slack` end up bracketing the root.
  const direction = first.gap > 0 ? 1 : -1;
  let step = POSE.firstStep * Math.hypot(line.L, line.h);
  let inner = first;
  let outer: Reading | null = null;
  for (let i = 0; i < POSE.maxExpansions; i++) {
    const next = read(inner.L0 + direction * step);
    if ("kind" in next) return { ok: false, failure: next };
    if (met(next)) return done(next);
    if (Math.sign(next.gap) !== Math.sign(inner.gap)) {
      outer = next;
      break;
    }
    // Still on the starting side: the gap must be closing, or this is no longer the taut branch.
    if (Math.abs(next.gap) >= Math.abs(inner.gap)) {
      return {
        ok: false,
        failure: { kind: "unreachable", L0: next.L0, tension: next.gap + target },
      };
    }
    inner = next;
    step *= 2;
  }
  if (outer === null) {
    return {
      ok: false,
      failure: { kind: "unreachable", L0: inner.L0, tension: inner.gap + target },
    };
  }

  let a = inner;
  let b = outer;
  let ga = a.gap;
  let gb = b.gap;
  let last = 0;
  for (let i = 0; i < POSE.maxIterations; i++) {
    const L0 = (a.L0 * gb - b.L0 * ga) / (gb - ga);
    const mid = read(L0);
    if ("kind" in mid) return { ok: false, failure: mid };
    if (met(mid)) return done(mid);
    if (Math.sign(mid.gap) === Math.sign(a.gap)) {
      a = mid;
      ga = mid.gap;
      // Illinois: the end that did not move twice running has its weight halved.
      if (last === -1) gb /= 2;
      last = -1;
    } else {
      b = mid;
      gb = mid.gap;
      if (last === 1) ga /= 2;
      last = 1;
    }
  }
  const closest = Math.abs(a.gap) < Math.abs(b.gap) ? a : b;
  return {
    ok: false,
    failure: { kind: "no-convergence", L0: closest.L0, tension: closest.gap + target },
  };
}
