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
 */

import type { QuasiStatic, Ride, TrolleyFriction } from "@/lib/sim";
import type { Trace } from "@/lib/terrain/trace.ts";

import { G } from "@/lib/format/quantity.ts";
import {
  airDensity,
  DYNAMICS,
  kmhToMs,
  quasiStaticRatio,
  ride,
  ridePath,
  windComponents,
} from "@/lib/sim";
import { meanAltitude } from "@/lib/terrain/trace.ts";

import type { RiderSweep } from "./traverse.ts";
import type { ScenarioDraft } from "./types.ts";
import type { UnloadedLine } from "./unloaded.ts";

/** Where the `ρ` of the rides comes from — the « lu » half of « lu et éditable ». */
export type AirDensitySource =
  /** Typed: `rho` is in the link. */
  | "typed"
  /** §12.2's ISA density at the imported profil's mean altitude. */
  | "profile"
  /** §12.2's sea-level 1,225 — a manual line has no altitude to read. */
  | "sea-level";

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
  /** Without wind — the first of the two Points d'arrêt. */
  readonly calm: Ride;
  /** With the Vent entered, through its component along the line; `calm` itself without one. */
  readonly windy: Ride;
  /** The air density both rides used, kg/m³. */
  readonly rho: { readonly value: number; readonly source: AirDensitySource };
  /** §12.1 over both rides, and whether it passes the warning threshold. */
  readonly quasiStatic: QuasiStatic & { readonly exceeded: boolean };
  readonly warnings: readonly DynamicsWarningId[];
};

/**
 * The two rides of a solved traverse.
 *
 * @param profile the **active** imported profil, `null` on a manual line — a Trace cached while
 *   manual geometry drives is no altitude of this line.
 * @returns `null` when the traverse is incomplete: a ride across a hole would run on a slope
 *   nobody solved, so like the Verdict it is suppressed rather than qualified.
 */
export function readDynamics(
  {
    material,
    rider,
    wind,
    dynamics,
  }: Pick<ScenarioDraft, "material" | "rider" | "wind" | "dynamics">,
  unloaded: UnloadedLine,
  { traverse }: RiderSweep,
  profile: Trace | null,
): DynamicsReading | null {
  if (traverse.coverage < 1) return null;

  const path = ridePath(traverse.steps, unloaded.span);
  const rho = airDensityOf(dynamics.rho, profile);
  const trolley = trolleyOf(material.family, dynamics);
  const posed = { path, m: rider.mp, CdA: dynamics.CdA, rho: rho.value, trolley };
  const calm = ride({ ...posed, windAlong: 0 });
  const { along } = windComponents(kmhToMs(wind.speedKmh), wind.directionDeg);
  const windy = along === 0 ? calm : ride({ ...posed, windAlong: along });

  // The member's own `μ`, kg/m: its weight per metre over the `g` that made it.
  const linearMass = unloaded.material.w / G;
  const both = [calm, windy].map((one) => quasiStaticRatio(one.samples, path, linearMass));
  const worst = both[1].ratio > both[0].ratio ? both[1] : both[0];
  const exceeded = worst.ratio > DYNAMICS.quasiStaticLimit;

  const warnings: DynamicsWarningId[] = [];
  if (exceeded) warnings.push("quasi-static");
  if (trolley.law === "coulomb") warnings.push("steel-trolley-unconfirmed");

  return {
    estimate: true,
    calm,
    windy,
    rho,
    quasiStatic: { ...worst, exceeded },
    warnings,
  };
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

/** The `ρ` a ride uses: the typed one, else §12.2's ISA at the profil's mean altitude, else 1,225. */
function airDensityOf(typed: number | null, profile: Trace | null): DynamicsReading["rho"] {
  if (typed !== null) return { value: typed, source: "typed" };
  if (profile !== null) return { value: airDensity(meanAltitude(profile)), source: "profile" };
  return { value: DYNAMICS.rhoSeaLevel, source: "sea-level" };
}
