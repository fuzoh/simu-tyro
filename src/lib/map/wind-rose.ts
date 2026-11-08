/**
 * The rose des vents on the vue de dessus (#94), as pure conversions: the handle's place on the
 * screen ↔ the Scenario's Vent.
 *
 * Rules this module exists to keep:
 *
 * - **The Scenario's direction stays relative to the line** (the Vent's convention, #87); the rose
 *   is only a way of reading and writing it. With the line's azimuth known the handle stands at the
 *   wind's true bearing, north up; without it the line is drawn level, A on the left, and the handle
 *   stands at the direction relative to that line. Both are one formula, a line azimuth — 90° for
 *   the level line, which runs toward the right.
 * - **The handle stands where the wind comes from**, as on a compass rose, and its distance from the
 *   centre is the speed on a scale that stops at {@link ROSE_MAX_KMH}. A typed speed beyond the scale
 *   parks the handle on the outer ring and stays what was typed.
 * - **What the handle writes is what a field can hold**: whole km/h and whole degrees, the display
 *   grain of the two fields, so a gesture and a typed value agree to the last digit.
 */

import type { Position, Positions, Wind } from "@/lib/scenario/types.ts";

import { roundToDisplay } from "@/lib/format/quantity.ts";

/** Where the rose's scale stops, km/h. The outer ring. */
export const ROSE_MAX_KMH = 60;

/** The graduated rings, km/h, from the centre out. */
export const ROSE_RINGS = [20, 40, 60] as const;

/** The outer ring's radius, px: the handle's whole travel. */
export const ROSE_RADIUS_PX = 88;

/**
 * The bearing the rose reads the line at: `oriented` when it is the line's true azimuth, otherwise
 * the level line's, which the rose then draws itself.
 */
export type RoseReference = {
  /** Degrees clockwise from the top of the drawing, toward which A → B runs. */
  readonly lineAzimuth: number;
  readonly oriented: boolean;
};

/** The line drawn level, A on the left: it runs toward the right of the drawing. */
export const LEVEL_REFERENCE: RoseReference = { lineAzimuth: 90, oriented: false };

/** A point of the rose, px from its centre, `y` downward. */
export type RoseOffset = { readonly x: number; readonly y: number };

const mod360 = (degrees: number) => ((degrees % 360) + 360) % 360;
const radians = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * The azimuth of A → B as the north-up map draws it, degrees in [0, 360), or `null` while a
 * Position is missing or both name one point. The map's projection is Mercator, so the angle on the
 * screen is the rhumb line's: the rose and the line it sits on agree by construction.
 */
export function lineAzimuth({ A, B }: Positions): number | null {
  if (A === null || B === null) return null;
  const east = longitudeDelta(A, B);
  const north = mercatorY(B.lat) - mercatorY(A.lat);
  if (east === 0 && north === 0) return null;
  return mod360((Math.atan2(east, north) * 180) / Math.PI);
}

export function roseReference(positions: Positions): RoseReference {
  const azimuth = lineAzimuth(positions);
  return azimuth === null ? LEVEL_REFERENCE : { lineAzimuth: azimuth, oriented: true };
}

/** The wind's bearing on the drawing — where it comes from, from the top — for a relative one. */
export function windAzimuth(relativeDeg: number, { lineAzimuth }: RoseReference): number {
  return mod360(relativeDeg + lineAzimuth);
}

/** The Scenario's direction, relative to the line, for a bearing on the drawing. */
export function relativeDirection(azimuthDeg: number, { lineAzimuth }: RoseReference): number {
  return mod360(azimuthDeg - lineAzimuth);
}

/** Where the handle stands for a wind: the centre without wind, the outer ring at the scale's end. */
export function handleOffset(wind: Wind, reference: RoseReference): RoseOffset {
  const radius =
    (Math.min(Math.max(wind.speedKmh, 0), ROSE_MAX_KMH) / ROSE_MAX_KMH) * ROSE_RADIUS_PX;
  const bearing = radians(windAzimuth(wind.directionDeg, reference));
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
  const azimuth = mod360((Math.atan2(offset.x, -offset.y) * 180) / Math.PI);
  return {
    speedKmh,
    directionDeg: mod360(roundToDisplay("windDirection", relativeDirection(azimuth, reference))),
  };
}

/** East-west separation of two Positions in radians of longitude, the short way round. */
function longitudeDelta(from: Position, to: Position): number {
  const delta = radians(to.lon - from.lon);
  return Math.abs(delta) > Math.PI ? delta - Math.sign(delta) * 2 * Math.PI : delta;
}

/** The Mercator ordinate of a latitude, which makes angles on the screen the true ones. */
function mercatorY(lat: number): number {
  return Math.log(Math.tan(Math.PI / 4 + radians(lat) / 2));
}
