/**
 * What the curve reads out at the point under the pointer (#92): the speed and the acceleration. The
 * coupe reads through `@/lib/chart/hover.ts`, as every coupe does. Pure, so a `node` test reaches it;
 * the charts only place the lines.
 *
 * Both charts share one x scale, so one hovered abscissa drives both: the pointer on either chart is
 * a rule on both, and each reads its own quantities there.
 */

import type { HoverLine } from "@/lib/chart/hover.ts";
import type { DynamicsReading } from "@/lib/scenario/dynamics.ts";
import type { Ride, RideSample } from "@/lib/sim";

import { formatQuantity } from "@/lib/format/quantity.ts";
import { DYNAMICS } from "@/lib/sim";

import type { DynamiqueOutputs, RideId } from "./outputs.ts";

import { ESTIMATE, HOVER_LABEL, RIDE_SHORT } from "./copy.ts";
import { RIDE_IDS } from "./outputs.ts";

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
    const sample = sampleNear(rides[id], metres);
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
