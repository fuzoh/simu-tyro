/**
 * What the two charts read out at the point under the pointer (#92): the abscissa and the altitude on
 * the coupe, the speed and the acceleration on the curve. Pure, so a `node` test reaches it; the
 * charts only place the lines.
 *
 * Both charts share one x scale, so one hovered abscissa drives both: the pointer on either chart is
 * a rule on both, and each reads its own quantities there.
 */

import type { SceneFrame } from "@/lib/chart/scene.ts";
import type { DynamicsReading } from "@/lib/scenario/dynamics.ts";
import type { Ride, RideSample } from "@/lib/sim";

import { polylineAt } from "@/lib/chart/scene.ts";
import { formatQuantity } from "@/lib/format/quantity.ts";
import { DYNAMICS } from "@/lib/sim";

import type { DynamiqueOutputs, RideId } from "./outputs.ts";

import { ESTIMATE, HOVER_LABEL, RIDE_SHORT } from "./copy.ts";
import { RIDE_IDS } from "./outputs.ts";

/** One line of a hover: what it is, and its value — `""` for a qualifier standing alone. */
export type HoverLine = { readonly label: string; readonly value: string };

/** The ground's altitude at an abscissa: absolute on an imported profil, from A's foot otherwise. */
export function groundAt(
  frame: SceneFrame,
  metres: number,
): { readonly altitude: number; readonly absolute: boolean } {
  // The frame's ground is counted from anchor A's top, which stands `zA` above A's foot.
  const fromFoot = polylineAt(frame.ground, metres) + frame.anchors.zA;
  return frame.bases === null
    ? { altitude: fromFoot, absolute: false }
    : { altitude: frame.bases.zBaseA + fromFoot, absolute: true };
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

/** The coupe's hover: the abscissa, and the ground's altitude under it. */
export function coupeHover(frame: SceneFrame, metres: number): readonly HoverLine[] {
  const { altitude, absolute } = groundAt(frame, metres);
  return [
    { label: HOVER_LABEL.distance, value: formatQuantity("extremumX", metres) },
    {
      label: absolute ? HOVER_LABEL.altitude : HOVER_LABEL.heightAboveA,
      value: formatQuantity("zBase", altitude),
    },
  ];
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
