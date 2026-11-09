/**
 * What the coupe and the vue de dessus read out at the point under the pointer (#99): the distance
 * from A, the ground's altitude, and — on the coupe, where there is a line — the loaded line's
 * altitude, its gap to the ground and the passager's garde au sol. Pure, so a `node` test reaches it;
 * the charts and the map only place the lines.
 *
 * The ground is read through the engine's own `zGroundAt`, so the number under the pointer is the
 * one the clearance scan used. The vue de dessus reads the same function at a distance it has
 * measured along the line: the Banane adds no measure of its own.
 */

import type { Polyline, SceneFrame, SceneRider } from "@/lib/chart/scene.ts";
import type { Register } from "@/lib/vocabulary/labels.ts";

import { polylineAt } from "@/lib/chart/scene.ts";
import { formatQuantity } from "@/lib/format/quantity.ts";
import { zGroundAt } from "@/lib/sim";
import { label } from "@/lib/vocabulary/labels.ts";

import { COUPE_HOVER } from "./copy.ts";

/** One line of a hover: what it is, and its value — `""` for a qualifier standing alone. */
export type HoverLine = { readonly label: string; readonly value: string };

/**
 * How far the pointer may be from the passager and still be « at its abscissa », in pixels: its grab
 * target's radius, 11 px plus half of the transparent stroke around it — 18 px on a fine pointer
 * (36 across), 22 px on a coarse one (44 across). The larger, so a held finger on the outer ring
 * still reads the garde. A `[CONVENTION]` — a pick tolerance, not a physical quantity.
 */
export const RIDER_REACH_PX = 22;

/**
 * The ground's height at an abscissa: an altitude on an imported profil, from A's foot otherwise.
 * `fromTop` is the same ground counted from anchor A's top, the frame the engine's polylines (the
 * loaded line's among them) are in: a line's height above the ground is `lineZ - fromTop`.
 */
export function groundAt(
  frame: SceneFrame,
  metres: number,
): { readonly altitude: number; readonly absolute: boolean; readonly fromTop: number } {
  const fromTop = zGroundAt(frame.terrain, metres);
  const fromFoot = fromTop + frame.anchors.zA;
  return frame.bases === null
    ? { altitude: fromFoot, absolute: false, fromTop }
    : { altitude: frame.bases.zBaseA + fromFoot, absolute: true, fromTop };
}

/** What is read at one abscissa. Heights are altitudes when `absolute`, from A's foot otherwise. */
export type CoupeReading = {
  /** Metres from anchor A. */
  readonly distance: number;
  readonly absolute: boolean;
  readonly ground: number;
  /** The loaded line's height, or `null` where there is no solved line to read. */
  readonly line: number | null;
  /** The loaded line above the ground, m. `null` with the line, or while the garde is withheld. */
  readonly lineGap: number | null;
  /** The passager's garde au sol, `null` unless the passager stands at this abscissa. */
  readonly garde: number | null;
};

/**
 * The reading at an abscissa, or `null` outside the span: past A or B the ground is a held end, not
 * a measurement.
 *
 * @param cable the loaded line to read, `null` where nothing solved.
 * @param rider the placed passager, `null` where there is none: the garde is read only on it.
 * @param reach how far from the passager's abscissa the pointer still counts as on it, m.
 * @param clearance `false` under a Clearance Gate breach: every gap computed from the anchor height
 *   the gate refused is withheld, the altitudes stay.
 */
export function coupeReading({
  frame,
  cable,
  rider,
  metres,
  reach,
  clearance,
}: {
  frame: SceneFrame;
  cable: Polyline | null;
  rider: Pick<SceneRider, "step" | "underRider"> | null;
  metres: number;
  reach: number;
  clearance: boolean;
}): CoupeReading | null {
  if (!(metres >= 0 && metres <= frame.L)) return null;
  const { altitude, absolute, fromTop } = groundAt(frame, metres);
  const gap = cable === null ? null : polylineAt(cable, metres) - fromTop;
  return {
    distance: metres,
    absolute,
    ground: altitude,
    line: gap === null ? null : altitude + gap,
    lineGap: gap === null || !clearance ? null : gap,
    garde:
      rider !== null && clearance && Math.abs(rider.step.xD - metres) <= reach
        ? rider.underRider
        : null,
  };
}

/** A reading as the hover prints it, in the Page's register. */
export function coupeLines(reading: CoupeReading, register: Register): readonly HoverLine[] {
  const key = reading.absolute ? "absolute" : "fromFoot";
  const height = (quantity: number) => formatQuantity("zBase", quantity);
  const gap = (quantity: number) => formatQuantity("clearance", quantity);
  const lines: HoverLine[] = [
    {
      label: label("distance", register),
      value: formatQuantity("extremumX", reading.distance),
    },
    { label: COUPE_HOVER.ground[key], value: height(reading.ground) },
  ];
  if (reading.line !== null) {
    lines.push({ label: COUPE_HOVER.line[key], value: height(reading.line) });
  }
  if (reading.lineGap !== null) {
    lines.push({ label: COUPE_HOVER.lineGap, value: gap(reading.lineGap) });
  }
  if (reading.garde !== null) {
    lines.push({ label: label("groundClearance", register), value: gap(reading.garde) });
  }
  if (!reading.absolute) lines.push({ label: COUPE_HOVER.fromFoot, value: "" });
  return lines;
}
