/**
 * **The rider's Sweep over the unloaded line** — the load one member carries, the traverse at that
 * load and §11's clearance over it. One recipe, read by the chart scene and by the `Résultats`
 * tests that stand in for it, so the two cannot drift apart. Beside it, the Scenario as every
 * Traverse-scope reader takes it: the gates and the `Résultats`.
 *
 * `x_D` is not an input: a Sweep covers every rider position, and the slider only selects a step.
 */

import type { ClearanceResult, SweepResult } from "@/lib/sim";

import { G } from "@/lib/format/quantity.ts";
import { evaluateClearance, sweep } from "@/lib/sim";

import type { CarryingLines, Rider, ScenarioDraft } from "./types.ts";
import type { UnloadedLine } from "./unloaded.ts";

/**
 * The Scenario as every Traverse-scope number reads it: all of it but `x_D`, which selects a Sweep
 * Step and judges nothing, and the Mise en tension device, which is descriptive (#86) — so a change
 * of device cannot re-run the Sweep.
 */
export type TraverseScenario = Omit<ScenarioDraft, "rider" | "tensioningDevice"> & {
  readonly rider: Omit<Rider, "xD">;
};

/**
 * A {@link TraverseScenario}'s fields, flat — and therefore a memo's dependency list. Flat because a
 * memo compares its keys one level deep, and `rider` is a fresh object on every scrub.
 */
export type TraverseInputs = Readonly<
  Omit<ScenarioDraft, "rider" | "tensioningDevice"> & Omit<Rider, "xD">
>;

/**
 * A Scenario's Traverse-scope fields. Each is the Scenario's own reference or a number, so a patch
 * that does not touch one — a scrub of `x_D` — leaves it identical and a memo keyed on them holds.
 */
export function traverseInputs(scenario: ScenarioDraft): TraverseInputs {
  const {
    unit,
    usage,
    regime,
    geometry,
    anchors,
    carryingLines,
    tensioningSide,
    tightness,
    material,
    terminations,
  } = scenario;
  const { mp, hRider, hClearMin, DAF } = scenario.rider;
  return {
    unit,
    usage,
    regime,
    geometry,
    anchors,
    carryingLines,
    tensioningSide,
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

/** What the Sweep reads beside the unloaded line — the rider's load and §11's envelope. */
export type SweepRider = Pick<Rider, "mp" | "hRider"> & Pick<ScenarioDraft, "carryingLines">;

/** A Scenario's {@link SweepRider}. */
export function sweepRiderOf({ rider, carryingLines }: ScenarioDraft): SweepRider {
  return { mp: rider.mp, hRider: rider.hRider, carryingLines };
}

/** A Sweep that solved at least one step, with §11 reduced over it. */
export type RiderSweep = {
  /** The load **one member** carries, N — {@link memberLoad}. */
  readonly P: number;
  /** One member's traverse under `P`. Both are the same line. `coverage < 1` is `Indéterminé`. */
  readonly traverse: SweepResult;
  /** §11 over the traverse: the aggregate `h_min`, its `x`, and the per-step arrays. */
  readonly clearance: ClearanceResult;
  /**
   * « Cas défavorable : une seule ligne porte tout » — one member under the whole `m_p·g`, for
   * its tensions alone: #69 measured the lower line carrying more than half, so 50/50 is not
   * validated. Judges nothing. `null` with one member, whose `traverse` already is that case.
   */
  readonly soleCarrier: SweepResult | null;
};

/**
 * The passager's weight on one member, N: `m_p·g`, shared 50/50 when two identical Brins porteurs
 * carry the trolley (#4). The one place that split is made.
 */
export function memberLoad(mp: number, carryingLines: CarryingLines): number {
  return (mp * G) / carryingLines;
}

/**
 * @returns `null` when the traverse lost every step: it has no picture and no `h_min`, and
 *   `atStepIndex` would be −1 — the flag § 2 says to check rather than reading a garde off a
 *   traverse that never happened.
 */
export function sweepRider(
  unloaded: UnloadedLine,
  { mp, hRider, carryingLines }: SweepRider,
): RiderSweep | null {
  const { input, span } = unloaded;
  const P = memberLoad(mp, carryingLines);
  const traverse = sweep(input, P);
  if (traverse.steps.length === 0) return null;
  const clearance = evaluateClearance(input, P, traverse.steps, span.terrain, hRider);
  const soleCarrier = carryingLines === 1 ? null : sweep(input, memberLoad(mp, 1));
  return { P, traverse, clearance, soleCarrier };
}
