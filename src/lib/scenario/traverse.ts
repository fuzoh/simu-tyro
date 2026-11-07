/**
 * **The rider's Sweep over the unloaded line** — the design load, the traverse at that load and
 * §11's clearance over it. One recipe, read by the chart scene and by the `Résultats` tests that
 * stand in for it, so the two cannot drift apart.
 *
 * `x_D` is not an input: a Sweep covers every rider position, and the slider only selects a step.
 */

import type { ClearanceResult, SweepResult } from "@/lib/sim";

import { G } from "@/lib/format/quantity.ts";
import { evaluateClearance, sweep } from "@/lib/sim";

import type { Rider } from "./types.ts";
import type { UnloadedLine } from "./unloaded.ts";

/** The rider fields the Sweep reads — its load and §11's envelope. */
export type SweepRider = Pick<Rider, "mp" | "hRider">;

/** A Sweep that solved at least one step, with §11 reduced over it. */
export type RiderSweep = {
  /** The rider's design load, N. */
  readonly P: number;
  /** The precomputed traverse. `coverage < 1` is `Indéterminé`. */
  readonly traverse: SweepResult;
  /** §11 over the traverse: the aggregate `h_min`, its `x`, and the per-step arrays. */
  readonly clearance: ClearanceResult;
};

/**
 * @returns `null` when the traverse lost every step: it has no picture and no `h_min`, and
 *   `atStepIndex` would be −1 — the flag § 2 says to check rather than reading a garde off a
 *   traverse that never happened.
 */
export function sweepRider(unloaded: UnloadedLine, { mp, hRider }: SweepRider): RiderSweep | null {
  const { input, span } = unloaded;
  const P = mp * G;
  const traverse = sweep(input, P);
  if (traverse.steps.length === 0) return null;
  const clearance = evaluateClearance(input, P, traverse.steps, span.terrain, hRider);
  return { P, traverse, clearance };
}
