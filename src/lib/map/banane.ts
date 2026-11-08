/**
 * The Banane (#96): the lateral bow of the Ligne à vide in a cross wind, **drawn, never computed**.
 * The research (#9) gives a shape — the projection of a sag, `b = f·sin α`, an arc with its belly
 * mid-span — and no coefficient the app may print, so the amplitude is a drawing choice: the
 * `[CONVENTION]` {@link BANANE_FACTOR}, in fractions of the drawn line per m/s of cross wind.
 *
 * Rules this module exists to keep:
 *
 * - **Amplitude is proportional to the cross component and to nothing else**: no wind, a pure head
 *   or tail wind and a wind along the line draw the line itself; twice the cross component draws
 *   twice the bow. Never metres, no lateral scale, no `Cd`.
 * - **The belly is on the lee side**: the wind's cross component (`windComponents().across`) is
 *   positive toward the left of the travel A → B, so a wind from the right bows the line to the left.
 * - **One bow for every drawing** — the map, the plain drawing and the Vue 3D read the same
 *   {@link bananeBow}, each adapting it to its own plane.
 */

import type { Position, Positions, Wind } from "@/lib/scenario/types.ts";

import { BANANE_FACTOR } from "@/lib/layout/contract.ts";
import { kmhToMs, windComponents } from "@/lib/sim";

/** The segments a drawn Banane is made of. */
export const BANANE_STEPS = 32;

/** The wind's cross component, m/s: positive toward the left of the travel A → B. */
export function bananeAcross(wind: Wind): number {
  return windComponents(kmhToMs(wind.speedKmh), wind.directionDeg).across;
}

/**
 * The bow at `t` of the way along the line, as a fraction of the line's length, positive to the left
 * of the travel: a parabola, nil at both anchors, its belly `BANANE_FACTOR · across` mid-span.
 */
export function bananeBow(t: number, across: number): number {
  return 4 * BANANE_FACTOR * across * t * (1 - t);
}

/**
 * The point of the line at `t` of the way from A to B, pushed sideways by the bow. Interpolated
 * linearly in degrees as the engine's frame is (`earthFrame`), the sideways step taken in a plane
 * whose east axis is scaled by the cosine of the mean latitude, so the bow is square to the line.
 */
export function bananePoint({ A, B }: { A: Position; B: Position }, t: number, across: number) {
  const lon = A.lon + t * (B.lon - A.lon);
  const lat = A.lat + t * (B.lat - A.lat);
  const bow = bananeBow(t, across);
  const cos = Math.cos((((A.lat + B.lat) / 2) * Math.PI) / 180);
  const east = (B.lon - A.lon) * cos;
  const north = B.lat - A.lat;
  if (bow === 0 || (east === 0 && north === 0)) return { lon, lat };
  // The left of the travel is (−north, east); the bow is a fraction of the line's own length.
  return { lon: lon - (bow * north) / cos, lat: lat + bow * east };
}

/** The Banane on the earth, or `null` while a Position is missing. */
export function bananePath(positions: Positions, across: number): Position[] | null {
  const { A, B } = positions;
  if (A === null || B === null) return null;
  return Array.from({ length: BANANE_STEPS + 1 }, (_, i) =>
    bananePoint({ A, B }, i / BANANE_STEPS, across),
  );
}

/** The Banane on a drawing whose `y` runs downward, the line from `A` to `B` in its own units. */
export function bananeOnDrawing(
  A: { readonly x: number; readonly y: number },
  B: { readonly x: number; readonly y: number },
  across: number,
): { x: number; y: number }[] {
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  return Array.from({ length: BANANE_STEPS + 1 }, (_, i) => {
    const t = i / BANANE_STEPS;
    const bow = bananeBow(t, across);
    // With `y` down, the left of the travel is (dy, −dx).
    return { x: A.x + t * dx + bow * dy, y: A.y + t * dy - bow * dx };
  });
}
