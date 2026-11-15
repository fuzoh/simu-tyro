/**
 * **The passager's ride, read off the Sweep** (#89) — `docs/simulation-theory.md` §12.2's point mass
 * along one member's frozen trajectory, run twice: without wind, which is the Point d'arrêt the
 * field trial is read against (#69, décision 4), then with the Vent entered. Beside the two rides,
 * what every Page showing them must carry: the « estimation » flag, §12.1's quasi-static check, the
 * `ρ` they used and where it came from, and the warnings.
 *
 * It is a composition above the engine, like `./traverse.ts`: the trajectory is the Sweep's, so
 * with two Brins porteurs it is a member's under `P/2`, while the mass that rides it is the whole
 * passager. Nothing here feeds the statics or the Verdict.
 *
 * **Under wind the ride is §19.15's**: on the trolley's locus — A, every solved `r_D`, B — with the
 * wind read at the passager's own `x` (`windVectorAt`), its crosswind entering wherever the locus
 * leaves the vertical plane. **The ride « sans vent » is the same Scenario with its Vent at zero**:
 * the line re-posed in still air, swept and ridden — not the windy locus ridden in still air. Both
 * need a complete Sweep: no descent across a hole (Q24).
 */

import type { QuasiStatic, Ride, RideInput, RidePath, RideWind, TrolleyFriction } from "@/lib/sim";
import type { Trace } from "@/lib/terrain/trace.ts";

import { G } from "@/lib/format/quantity.ts";
import { DYNAMICS, locusPath, quasiStaticRatio, ride, windVectorAt } from "@/lib/sim";

import type { RiderSweep, SweepRider } from "./traverse.ts";
import type { ScenarioDraft } from "./types.ts";
import type { UnloadedInputs, UnloadedLine } from "./unloaded.ts";

import { sweepRider } from "./traverse.ts";
import { unloadedOn } from "./unloaded.ts";
import { airDensityOf, type AirDensity } from "./wind.ts";

// The air the rides and the statics share (§19.4) lives with the Vent; it is re-exported where the
// rides' readers have always found it.
export { airDensityOf, type AirDensity, type AirDensitySource } from "./wind.ts";

/** The dynamic outputs' warnings, as identifiers: the app owns every sentence. */
export type DynamicsWarningId =
  /** §12.1: `v/c` above 0,2 somewhere on a ride — the frozen trajectory no longer describes it. */
  | "quasi-static"
  /** A câble rides on §12.2's constant-`μ` fallback, an Unconfirmed Default (research #8). */
  | "steel-trolley-unconfirmed";

/** Both rides and what qualifies them. */
export type DynamicsReading = {
  /** Every dynamic output is an estimation (#6), and is labelled so wherever it is shown. */
  readonly estimate: true;
  /** Without wind — the first of the two Points d'arrêt: the Scenario with its Vent at zero. */
  readonly calm: Ride;
  /** With the Vent entered, on the locus it poses (§19.15); `calm` itself without one. */
  readonly windy: Ride;
  /**
   * No Vent is applied — no speed, or no bearing to project it on: `windy` is `calm`. A crosswind
   * is applied: under §19 it moves the line and enters the ride, so it is not windless.
   */
  readonly windless: boolean;
  /** The air density both rides used, kg/m³. */
  readonly rho: AirDensity;
  /** §12.1 over both rides, and whether it passes the warning threshold. */
  readonly quasiStatic: QuasiStatic & { readonly exceeded: boolean };
  readonly warnings: readonly DynamicsWarningId[];
};

/**
 * What the rides read of the Scenario beside its line: the passager, the trolley, the air — and,
 * for the ride « sans vent » under an applied Vent, what re-poses the line in still air.
 */
export type RiddenScenario = Pick<
  ScenarioDraft,
  "material" | "wind" | "dynamics" | "tightness" | "tensioningSide" | "carryingLines" | "geometry"
> & {
  readonly rider: Pick<ScenarioDraft["rider"], "mp" | "hRider" | "anchorZone">;
};

/**
 * The two rides of a solved traverse.
 *
 * @param unloaded the line the traverse was swept over, posed under the Scenario's Vent.
 * @param swept its Sweep: the slots the locus is read off.
 * @param profile the **active** imported profil, `null` on a manual line — a Trace cached while
 *   manual geometry drives is no altitude of this line.
 * @returns `null` when the traverse is incomplete — a ride across a hole would run on a slope nobody
 *   solved, so like the Verdict it is suppressed rather than qualified (Q24) — or when the
 *   Scenario at zero wind does not solve or sweep completely, so the ride « sans vent » it is read
 *   against does not exist.
 */
export function readDynamics(
  scenario: RiddenScenario,
  unloaded: UnloadedLine,
  swept: Pick<RiderSweep, "spatial">,
  profile: Trace | null,
): DynamicsReading | null {
  const windyPath = locusPath(swept.spatial, unloaded.span);
  if (windyPath === null) return null;

  const { posed, rho } = poseRides(scenario, profile);
  const windy = ride({ ...posed, path: windyPath, wind: rideWindOf(unloaded) });
  const windless = unloaded.aero === null;

  let calm = windy;
  let calmPath = windyPath;
  if (!windless) {
    const still = stillAir(scenario, unloaded);
    if (still === null) return null;
    calmPath = still;
    calm = ride({ ...posed, path: calmPath, wind: null });
  }

  // The member's own `μ`, kg/m: its weight per metre over the `g` that made it.
  const linearMass = unloaded.material.w / G;
  const both = [
    quasiStaticRatio(calm.samples, calmPath, linearMass),
    quasiStaticRatio(windy.samples, windyPath, linearMass),
  ];
  const worst = both[1].ratio > both[0].ratio ? both[1] : both[0];
  const exceeded = worst.ratio > DYNAMICS.quasiStaticLimit;

  const warnings: DynamicsWarningId[] = [];
  if (exceeded) warnings.push("quasi-static");
  if (posed.trolley.law === "coulomb") warnings.push("steel-trolley-unconfirmed");

  return {
    estimate: true,
    calm,
    windy,
    windless,
    rho,
    quasiStatic: { ...worst, exceeded },
    warnings,
  };
}

/**
 * The locus of the Scenario with its Vent at zero (§19.15's comparison): the line re-posed in still
 * air by the same driver, swept, and its trajectory — or `null` when that chain does not complete.
 */
function stillAir(scenario: RiddenScenario, unloaded: UnloadedLine): RidePath | null {
  const inputs: Parameters<typeof unloadedOn>[1] = {
    material: scenario.material,
    tightness: scenario.tightness,
    tensioningSide: scenario.tensioningSide,
    mp: scenario.rider.mp,
    trace: null,
    geometry: scenario.geometry,
    wind: { ...scenario.wind, speedKmh: 0 },
    positions: { A: null, B: null },
    rho: null,
  } satisfies Pick<UnloadedInputs, keyof Parameters<typeof unloadedOn>[1]>;
  const line = unloadedOn(unloaded.span, inputs);
  if (!line.ok) return null;
  const rider: SweepRider = {
    mp: scenario.rider.mp,
    hRider: scenario.rider.hRider,
    anchorZone: scenario.rider.anchorZone,
    carryingLines: scenario.carryingLines,
  };
  const swept = sweepRider(line, rider);
  return swept === null ? null : locusPath(swept.spatial, line.span);
}

/**
 * The wind a ride on this line reads (§19.15): the Vent the line was posed under, at the
 * passager's own `x` — `null` when none is applied. `x` is held on `[0, L]`: a sample's position
 * is a sum along the locus that may round a few ulps past B, where the field has no value.
 */
export function rideWindOf(unloaded: Pick<UnloadedLine, "aero" | "span">): RideWind | null {
  const { aero } = unloaded;
  if (aero === null) return null;
  const { L } = unloaded.span;
  return (x) => windVectorAt(aero, Math.min(L, Math.max(0, x)), L);
}

/** What a Scenario's rides are posed with, whatever trajectory and wind they run on. */
export type RidePosing = {
  /** Everything of a ride but its trajectory and its wind. */
  readonly posed: Omit<RideInput, "path" | "wind">;
  readonly rho: AirDensity;
};

/**
 * The passager, the trolley and the air of a Scenario's rides — the one place they are read off it,
 * so a ride over another trajectory of the same Scenario (`./reach.ts`) is posed as these are.
 *
 * @param profile the **active** imported profil, `null` on a manual line.
 */
export function poseRides(
  {
    material,
    rider,
    dynamics,
  }: Pick<ScenarioDraft, "material" | "dynamics"> & {
    readonly rider: Pick<ScenarioDraft["rider"], "mp">;
  },
  profile: Trace | null,
): RidePosing {
  const rho = airDensityOf(dynamics.rho, profile);
  const trolley = trolleyOf(material.family, dynamics);
  return { posed: { m: rider.mp, CdA: dynamics.CdA, rho: rho.value, trolley }, rho };
}

/**
 * The family's trolley law: research #8 shares the SSF fit with no câble, so a câble rides on
 * §12.2's constant `μ`.
 */
function trolleyOf(
  family: ScenarioDraft["material"]["family"],
  { F0, kv, mu }: ScenarioDraft["dynamics"],
): TrolleyFriction {
  return family === "textile" ? { law: "ssf", F0, kv } : { law: "coulomb", mu };
}
