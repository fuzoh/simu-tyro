/**
 * **The rider's Sweep over the unloaded line** — the design load, the traverse at that load and
 * §11's clearance over it. One recipe, read by the chart scene and by the `Résultats` tests that
 * stand in for it, so the two cannot drift apart. Beside it, the Scenario as every Traverse-scope
 * reader takes it: the gates and the `Résultats`.
 *
 * `x_D` is not an input: a Sweep covers every rider position, and the slider only selects a step.
 */

import type { ClearanceResult, SweepResult } from "@/lib/sim";

import { G } from "@/lib/format/quantity.ts";
import { evaluateClearance, sweep } from "@/lib/sim";

import type { Rider, ScenarioDraft } from "./types.ts";
import type { UnloadedLine } from "./unloaded.ts";

/**
 * The Scenario as every Traverse-scope number reads it: all of it but `x_D`, which selects a Sweep
 * Step and judges nothing.
 */
export type TraverseScenario = Omit<ScenarioDraft, "rider"> & {
  readonly rider: Omit<Rider, "xD">;
};

/**
 * A {@link TraverseScenario}'s fields, flat — and therefore a memo's dependency list. Flat because a
 * memo compares its keys one level deep, and `rider` is a fresh object on every scrub.
 */
export type TraverseInputs = Readonly<Omit<ScenarioDraft, "rider"> & Omit<Rider, "xD">>;

/**
 * A Scenario's Traverse-scope fields. Each is the Scenario's own reference or a number, so a patch
 * that does not touch one — a scrub of `x_D` — leaves it identical and a memo keyed on them holds.
 */
export function traverseInputs(scenario: ScenarioDraft): TraverseInputs {
  const { unit, usage, regime, geometry, anchors, tightness, material, terminations } = scenario;
  const { mp, hRider, hClearMin, DAF } = scenario.rider;
  return {
    unit,
    usage,
    regime,
    geometry,
    anchors,
    tightness,
    material,
    terminations,
    mp,
    hRider,
    hClearMin,
    DAF,
  };
}

/** The {@link TraverseScenario} a memo keyed on {@link traverseInputs} rebuilds. */
export function traverseScenario({
  mp,
  hRider,
  hClearMin,
  DAF,
  ...rest
}: TraverseInputs): TraverseScenario {
  return { ...rest, rider: { mp, hRider, hClearMin, DAF } };
}

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
