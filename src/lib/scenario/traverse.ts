/**
 * **The rider's Sweep over the unloaded line** — the load one member carries, the traverse at that
 * load and §11's clearance over it. One recipe, read by the chart scene and by the `Résultats`
 * tests that stand in for it, so the two cannot drift apart. Beside it, the Scenario as every
 * Traverse-scope reader takes it: the gates and the `Résultats`.
 *
 * `x_D` is not an input: a Sweep covers every rider position, and the slider only selects a step.
 *
 * **The Sweep is §19.12's** (`sweepSpatial`) on the unloaded line's own wind: one slot per grid
 * position, holes kept, and §19.13's clearance on the extruded terrain. The plane readers — the
 * Verdict's scan, the coupe, the strip — take its coupe projection (`planeSweep`,
 * `solvedClearance`), which without wind is §6.2's and §11's own result, bit for bit (§19.16).
 */

import type { ClearanceResult, RiderLoad, SpatialSweepResult, SweepResult } from "@/lib/sim";

import { G } from "@/lib/format/quantity.ts";
import { evaluateSpatialClearance, planeSweep, solvedClearance, sweepSpatial } from "@/lib/sim";

import type { CarryingLines, Rider, ScenarioDraft } from "./types.ts";
import type { UnloadedLine } from "./unloaded.ts";

/**
 * The Scenario as every Traverse-scope reader takes it — the gates and the `Résultats`: all of it
 * but `x_D`, which selects a Sweep Step and judges nothing, and the Mise en tension device, which is
 * descriptive (#86). The Vent, the ride's constants and the Positions stay in: under an applied Vent
 * the statics read it, its `ρ` and the bearing the Positions give (§19.4, `windBearing`), and the
 * Wind and Ride Gates judge them, so the report and the rides must move when they do.
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
    wind,
    dynamics,
    positions,
  } = scenario;
  const { mp, hRider, hClearMin, anchorZone, DAF } = scenario.rider;
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
    wind,
    dynamics,
    positions,
    mp,
    hRider,
    hClearMin,
    anchorZone,
    DAF,
  };
}

/** The {@link TraverseScenario} a memo keyed on {@link traverseInputs} rebuilds. */
export function traverseScenario({
  mp,
  hRider,
  hClearMin,
  anchorZone,
  DAF,
  ...rest
}: TraverseInputs): TraverseScenario {
  return { ...rest, rider: { mp, hRider, hClearMin, anchorZone, DAF } };
}

/**
 * What the Sweep reads beside the unloaded line — the rider's load, §11's envelope and the Zones
 * d'ancrage §11 leaves out of what it judges.
 */
export type SweepRider = Pick<Rider, "mp" | "hRider" | "anchorZone"> &
  Pick<ScenarioDraft, "carryingLines">;

/** A Scenario's {@link SweepRider}. */
export function sweepRiderOf({ rider, carryingLines }: ScenarioDraft): SweepRider {
  return { mp: rider.mp, hRider: rider.hRider, anchorZone: rider.anchorZone, carryingLines };
}

/** A Sweep that solved at least one step, with §11 reduced over it. */
export type RiderSweep = {
  /** The vertical load **one member** carries, N — {@link memberLoad}. */
  readonly P: number;
  /**
   * §19.12's sweep of one member: one slot per grid position, holes kept. Under wind the member
   * takes `P_rider/n_c` — the weight **and** the static wind force — and its whole own `q₀` (§19.6).
   */
  readonly spatial: SpatialSweepResult;
  /**
   * Its coupe projection (`planeSweep`): the solved positions as §6.2's steps, with `failures` and
   * `coverage`. `coverage < 1` is `Indéterminé`.
   */
  readonly traverse: SweepResult;
  /**
   * §11 over the traverse (§19.13 on the extruded terrain under wind), outside the Zones
   * d'ancrage: the aggregate `h_min`, its `x`, the per-step arrays aligned on `traverse.steps`,
   * and the same minimum with the zones included (`whole`).
   */
  readonly clearance: ClearanceResult;
  /**
   * « Cas défavorable : une seule ligne porte tout » — one member under the whole rider vector,
   * for its tensions alone: #69 measured the lower line carrying more than half, so 50/50 is not
   * validated (§19.6). Judges nothing. `null` with one member, whose `traverse` already is that
   * case.
   */
  readonly soleCarrier: SweepResult | null;
};

/**
 * The passager's weight on one member, N: `m_p·g`, shared 50/50 when two identical Brins porteurs
 * carry the trolley (#4). Under wind the same share applies to the static wind force (§19.6): the
 * engine takes the whole rider and the share, {@link riderLoad}.
 */
export function memberLoad(mp: number, carryingLines: CarryingLines): number {
  return (mp * G) / carryingLines;
}

/**
 * §19.6's rider as the engine takes it: the whole `m_p·g`, the share `1/n_c` of the whole rider
 * vector one member carries, and the gabarit the ellipsoid is deduced from (§19.5).
 */
export function riderLoad(mp: number, hRider: number, carryingLines: CarryingLines): RiderLoad {
  return { weight: mp * G, share: 1 / carryingLines, hRider };
}

/**
 * @returns `null` when the traverse lost every step: it has no picture and no `h_min`, and
 *   `atStepIndex` would be −1 — the flag § 2 says to check rather than reading a garde off a
 *   traverse that never happened.
 */
export function sweepRider(
  unloaded: UnloadedLine,
  { mp, hRider, anchorZone, carryingLines }: SweepRider,
): RiderSweep | null {
  const { span, spatial: line } = unloaded;
  const P = memberLoad(mp, carryingLines);
  const rider = riderLoad(mp, hRider, carryingLines);
  const spatial = sweepSpatial(line.input, rider);
  const traverse = planeSweep(spatial);
  if (traverse.steps.length === 0) return null;
  const clearance = solvedClearance(
    evaluateSpatialClearance(spatial, span.terrain, hRider, anchorZone),
    spatial,
  );
  const soleCarrier =
    carryingLines === 1 ? null : planeSweep(sweepSpatial(line.input, riderLoad(mp, hRider, 1)));
  return { P, spatial, traverse, clearance, soleCarrier };
}
