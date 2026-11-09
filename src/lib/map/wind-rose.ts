/**
 * The rose des vents on the vue de dessus (#94), as pure conversions: the handle's place on the
 * screen ↔ the Scenario's Vent.
 *
 * Rules this module exists to keep:
 *
 * - **The rose edits the azimuth directly.** The Scenario's direction is geographic — where the
 *   wind comes from, clockwise from north — so on the north-up map the handle stands at that very
 *   bearing. Where the drawing is not north-up — the plain drawing outside LV95, the line drawn
 *   level with A on the left — the drawing's {@link RoseReference.north} turns it by the line's
 *   bearing, and the handle still stands where the wind comes from relative to the drawn line.
 * - **No bearing, no rose to set.** Without A and B on the map the Vent has no line to be projected
 *   on (`windBearing`): the rose draws no wind and offers no handle — {@link roseReference} is
 *   `null` — and the fields beside it are disabled for the same reason.
 * - **The handle stands where the wind comes from**, as on a compass rose, and its distance from the
 *   centre is the speed on a scale that stops at {@link ROSE_MAX_KMH}. A typed speed beyond the scale
 *   parks the handle on the outer ring and stays what was typed.
 * - **What the handle writes is what a field can hold**: whole km/h and whole degrees, the display
 *   grain of the two fields, so a gesture and a typed value agree to the last digit.
 */

import type { Wind } from "@/lib/scenario/types.ts";

import { roundToDisplay } from "@/lib/format/quantity.ts";

/** Where the rose's scale stops, km/h. The outer ring. */
export const ROSE_MAX_KMH = 60;

/** The graduated rings, km/h, from the centre out. */
export const ROSE_RINGS = [20, 40, 60] as const;

/** The outer ring's radius, px: the handle's whole travel. */
export const ROSE_RADIUS_PX = 88;

/** How the drawing under the rose is turned. */
export type RoseReference = {
  /** Where north stands on the drawing, degrees clockwise from its top: 0 on the north-up map. */
  readonly north: number;
  /** The drawing is the north-up map; otherwise the line is drawn level, A on the left. */
  readonly oriented: boolean;
};

/** The north-up map. */
export const NORTH_UP: RoseReference = { north: 0, oriented: true };

/** A point of the rose, px from its centre, `y` downward. */
export type RoseOffset = { readonly x: number; readonly y: number };

const mod360 = (degrees: number) => ((degrees % 360) + 360) % 360;
const radians = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * The rose's reference for a line at `bearing` (`windBearing`), or `null` when the line has none.
 *
 * @param level the line is drawn level, A on the left, rather than on the north-up map: it then
 *   runs toward the right of the drawing, 90°, so north stands at `90° − bearing`.
 */
export function roseReference(bearing: number | null, level: boolean): RoseReference | null {
  if (bearing === null) return null;
  return level ? { north: mod360(90 - bearing), oriented: false } : NORTH_UP;
}

/** Where a wind from `azimuth` stands on the drawing, degrees clockwise from its top. */
export function screenBearing(azimuth: number, { north }: RoseReference): number {
  return mod360(azimuth + north);
}

/** The azimuth a bearing on the drawing stands for — what the Scenario holds. */
export function azimuthOf(screen: number, { north }: RoseReference): number {
  return mod360(screen - north);
}

/** Where the handle stands for a wind: the centre without wind, the outer ring at the scale's end. */
export function handleOffset(wind: Wind, reference: RoseReference): RoseOffset {
  const radius =
    (Math.min(Math.max(wind.speedKmh, 0), ROSE_MAX_KMH) / ROSE_MAX_KMH) * ROSE_RADIUS_PX;
  const bearing = radians(screenBearing(wind.directionDeg, reference));
  // `+ 0` turns the `-0` of a zero radius into `0`.
  return { x: radius * Math.sin(bearing) + 0, y: -radius * Math.cos(bearing) + 0 };
}

/**
 * The Vent a handle dropped at `offset` writes. Without a whole km/h of speed there is no direction
 * to read off a point at the centre, so the previous one stays.
 */
export function windFromOffset(offset: RoseOffset, reference: RoseReference, previous: Wind): Wind {
  const distance = Math.hypot(offset.x, offset.y);
  const speedKmh = roundToDisplay(
    "windSpeed",
    Math.min((distance / ROSE_RADIUS_PX) * ROSE_MAX_KMH, ROSE_MAX_KMH),
  );
  if (speedKmh === 0) return { speedKmh, directionDeg: previous.directionDeg };
  const screen = mod360((Math.atan2(offset.x, -offset.y) * 180) / Math.PI);
  return {
    speedKmh,
    directionDeg: mod360(roundToDisplay("windDirection", azimuthOf(screen, reference))),
  };
}
