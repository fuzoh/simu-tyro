/**
 * What the curve reads out at the point under the pointer (#92): the speed and the acceleration. The
 * coupe reads through `@/lib/chart/hover.ts`, as every coupe does — `coupeAt` hands it the loaded
 * line at rest and the Zones d'ancrage. Pure, so a `node` test reaches it;
 * the charts only place the lines.
 *
 * Both charts share one x scale, so one hovered abscissa drives both: the pointer on either chart is
 * a rule on both, and each reads its own quantities there.
 */

import type { CoupeReading, HoverLine } from "@/lib/chart/hover.ts";
import type { SceneFrame } from "@/lib/chart/scene.ts";
import type { DynamicsReading } from "@/lib/scenario/dynamics.ts";
import type { Ride, RideSample } from "@/lib/sim";

import { coupeReading } from "@/lib/chart/hover.ts";
import { formatQuantity } from "@/lib/format/quantity.ts";
import { DYNAMICS } from "@/lib/sim";

import type { DynamiqueOutputs, RideId } from "./outputs.ts";
import type { CoupeScene } from "./scene.ts";

import { ESTIMATE, HOVER_LABEL, RIDE_SHORT } from "./copy.ts";
import { firstPass, RIDE_IDS } from "./outputs.ts";

/**
 * The coupe's reading at an abscissa: the loaded line at rest and the passager hanging on it, read
 * as every coupe reads — the Zones d'ancrage included, so a passager resting within `z` of an anchor
 * says its garde is not judged, as on Statique (#106). `null` outside the span.
 *
 * @param reach how far from the passager's abscissa the pointer still counts as on it, m.
 * @param clearance `false` under a Clearance Gate breach: every gap is withheld.
 */
export function coupeAt({
  frame,
  coupe,
  metres,
  reach,
  clearance,
}: {
  frame: SceneFrame;
  coupe: Pick<CoupeScene, "rest" | "anchorZone">;
  metres: number;
  reach: number;
  clearance: boolean;
}): CoupeReading | null {
  return coupeReading({
    frame,
    cable: coupe.rest?.cable ?? null,
    rider: coupe.rest,
    metres,
    reach,
    clearance,
    anchorZone: coupe.anchorZone,
  });
}

/**
 * The ride's sample nearest an abscissa, or `null` when the ride never gets there: samples are at
 * most one integration step apart, so a nearest one farther than that is past the ride's Point
 * d'arrêt, not an estimate of it. A swing that passes the same abscissa again is read at its closest
 * sample, the first one in time on a tie.
 */
export function sampleNear(ride: Ride, metres: number): RideSample | null {
  let best = ride.samples[0];
  for (const sample of ride.samples) {
    if (Math.abs(sample.x - metres) < Math.abs(best.x - metres)) best = sample;
  }
  return Math.abs(best.x - metres) <= DYNAMICS.step ? best : null;
}

/**
 * The curve's hover: the abscissa, then the speed and the acceleration of the ride — of both rides
 * when the Vent entered makes them differ, a ride that never reaches the abscissa left out — and
 * « estimation », which every one of them is.
 */
export function curveHover(
  rides: Pick<DynamicsReading, "calm" | "windy">,
  { coincide }: Pick<DynamiqueOutputs, "coincide">,
  metres: number,
): readonly HoverLine[] {
  const lines: HoverLine[] = [
    { label: HOVER_LABEL.distance, value: formatQuantity("extremumX", metres) },
  ];
  // Without a wind both rides are one, and the rows need no ride's name.
  const read = (coincide ? (["windy"] as const) : RIDE_IDS).flatMap((id) => {
    // The curve draws the first pass only: the hover reads what is drawn.
    const sample = sampleNear({ ...rides[id], samples: firstPass(rides[id]) }, metres);
    return sample === null ? [] : [{ id, ...sample }];
  });
  const named = (quantity: string, id: RideId) =>
    coincide ? quantity : `${quantity} ${RIDE_SHORT[id]}`;
  for (const { id, v } of read) {
    lines.push({ label: named(HOVER_LABEL.speed, id), value: formatQuantity("speed", v) });
  }
  for (const { id, a } of read) {
    lines.push({
      label: named(HOVER_LABEL.acceleration, id),
      value: formatQuantity("acceleration", a),
    });
  }
  if (read.length > 0) lines.push({ label: ESTIMATE, value: "" });
  return lines;
}
