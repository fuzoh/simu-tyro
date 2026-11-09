/**
 * The **Mesure** (#98): the one-line ruler on the vue de dessus, as pure functions — what a click
 * does to the two points, the three distances, and where the altitudes come from.
 *
 * Rules this module exists to keep:
 *
 * - **A Mesure is never saved.** Its points and its distances are component state of the map and
 *   nothing else: not the Scenario, not the Session, not the link.
 * - **Three distances, three sources.** The horizontal one is geodesy on the two Positions and
 *   needs no network. The direct one is `√(horizontale² + Δz²)`. The distance au sol is the
 *   developed length of the profil geo.admin between the two points — the sum of its segments, each
 *   taken along the slope — which only a profil asked for between them can give.
 * - **Offline, the ground distance is not shown and the direct one comes from the profil in memory
 *   or from nowhere.** The profil geo.admin of the Scenario answers for a point that stands on it;
 *   a point off it has no altitude, and the direct distance says so rather than print a number it
 *   cannot back. It never reads « — », which means *Indéterminé* in this app.
 * - **The profil is the service's, the call is #103's.** The same loader, the same 200 points. A
 *   profil that does not come reads « indisponible hors réseau » whatever stopped it — the
 *   loader's one `indisponible` also covers an HTTP error and a line too short for its sampling.
 */

import type { Position } from "@/lib/scenario/types.ts";
import type { Fetch, GeoadminFailure } from "@/lib/terrain/geoadmin.ts";
import type { Trace } from "@/lib/terrain/trace.ts";

import { loadGeoadminProfile } from "@/lib/terrain/geoadmin.ts";
import { samePosition } from "@/lib/terrain/trace.ts";

/** The points of a Mesure: none yet, the first, or both. */
export type MeasurePoints = readonly Position[];

/** The ellipsoid WGS84's defining constants: semi-major axis, m, and flattening. */
const WGS84_A = 6378137;
const WGS84_F = 1 / 298.257223563;

/**
 * How far from the profil a click may land and still be on it, m. A `[CONVENTION]`: a pick
 * tolerance, a few pixels of the map at the zoom the line is shown at, not a physical quantity.
 */
export const ON_PROFILE_TOLERANCE_M = 5;

/** Far past the widest view the map offers (a country), so the lines leave it on every side. */
const CROSS_REACH_DEG = 20;
/** Web Mercator's own limit. */
const MAX_LATITUDE = 85;

/**
 * A click on the map. The first and second click set the two points; a third starts over with
 * itself as the first.
 */
export function clickMeasure(points: MeasurePoints, at: Position): MeasurePoints {
  return points.length === 1 ? [points[0], at] : [at];
}

/** A pointer over the map's box, as the aperçu of the Mesure (#107) reads it. */
export type MeasurePointer = {
  /** The event's `pointerType`: `"mouse"`, `"pen"`, `"touch"`, or what a browser adds. */
  readonly kind: string;
  /**
   * Whether it is over the map's canvas — where a click places a point — and not over a control
   * the map holds above it, such as the zoom buttons, where a click places nothing.
   */
  readonly onCanvas: boolean;
  /** Where, in the canvas's own pixels. */
  readonly at: readonly [number, number];
};

/**
 * The pixel the aperçu is drawn at, or `null` for none: a finger never hovers, and a pointer off
 * the canvas is where no click would land.
 */
export function measureAim({
  kind,
  onCanvas,
  at,
}: MeasurePointer): readonly [number, number] | null {
  return kind !== "touch" && onCanvas ? at : null;
}

/**
 * The offset of `to` from `from` in metres, east and north — the ellipsoid's local radii of
 * curvature at the mid-latitude. For the few kilometres a zip line spans this is exact to well
 * under a millimetre per kilometre; it is not a geodesic for a continent.
 */
function offsetMetres(from: Position, to: Position): { east: number; north: number } {
  const rad = Math.PI / 180;
  const e2 = WGS84_F * (2 - WGS84_F);
  const phi = ((from.lat + to.lat) / 2) * rad;
  const w = Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
  const meridian = (WGS84_A * (1 - e2)) / w ** 3;
  const primeVertical = WGS84_A / w;
  return {
    east: (to.lon - from.lon) * rad * primeVertical * Math.cos(phi),
    north: (to.lat - from.lat) * rad * meridian,
  };
}

/** The horizontal distance between two Positions, m, on the WGS84 ellipsoid. */
export function horizontalDistance(a: Position, b: Position): number {
  const { east, north } = offsetMetres(a, b);
  return Math.hypot(east, north);
}

/** The straight distance between two points: the hypotenuse of the horizontal one and `dz`. */
export function directDistance(horizontalM: number, dz: number): number {
  return Math.hypot(horizontalM, dz);
}

/** The ground distance along a profil, m: the sum of its segments, each along the slope. */
export function groundDistance({ d, z }: Pick<Trace, "d" | "z">): number {
  let sum = 0;
  for (let i = 1; i < d.length; i++) sum += Math.hypot(d[i] - d[i - 1], z[i] - z[i - 1]);
  return sum;
}

/**
 * The altitude of a point standing on the profil in memory — within {@link ON_PROFILE_TOLERANCE_M}
 * of the chord between its two ends, which is where the profil runs — or `null`. A profil that
 * carries no coordinates stands nowhere on the map.
 */
export function altitudeOnProfile(trace: Trace, point: Position): number | null {
  const { ends, d, z } = trace;
  if (ends === undefined) return null;
  const chord = offsetMetres(ends.A, ends.B);
  const length = Math.hypot(chord.east, chord.north);
  if (length === 0) return null;
  const at = offsetMetres(ends.A, point);
  const along = (at.east * chord.east + at.north * chord.north) / length;
  const lateral = Math.abs(at.east * chord.north - at.north * chord.east) / length;
  const tol = ON_PROFILE_TOLERANCE_M;
  if (lateral > tol || along < -tol || along > length + tol) return null;

  const station = d[0] + (Math.min(Math.max(along, 0), length) / length) * (d.at(-1)! - d[0]);
  let i = 1;
  while (i < d.length - 1 && d[i] < station) i++;
  const share = (station - d[i - 1]) / (d[i] - d[i - 1]);
  return z[i - 1] + share * (z[i] - z[i - 1]);
}

/** What the profil geo.admin between the two points gave: its altitudes and its developed length. */
export type MeasureProfile =
  | { readonly ok: true; readonly dz: number; readonly groundM: number }
  | { readonly ok: false; readonly failure: GeoadminFailure };

/**
 * The profil between two points, asked of geo.admin. Never rejects.
 *
 * @param fetch the platform's `fetch`, or a replay.
 */
export async function loadMeasureProfile(
  a: Position,
  b: Position,
  fetch: Fetch,
): Promise<MeasureProfile> {
  const outcome = await loadGeoadminProfile({ A: a, B: b }, fetch);
  if (!outcome.ok) return outcome;
  const { trace } = outcome;
  return { ok: true, dz: trace.z.at(-1)! - trace.z[0], groundM: groundDistance(trace) };
}

/**
 * A profil kept with the two points it was loaded between.
 */
export type LoadedProfile = {
  readonly points: MeasurePoints;
  readonly profile: MeasureProfile;
};

/**
 * The profil that answers for `points`, or `null` while it is on its way: one loaded between two
 * other points — a third click started over — answers for nothing.
 */
export function profileFor(
  points: MeasurePoints,
  loaded: LoadedProfile | null,
): MeasureProfile | null {
  if (loaded === null || points.length !== 2) return null;
  const same =
    loaded.points.length === 2 && points.every((p, i) => samePosition(p, loaded.points[i]));
  return same ? loaded.profile : null;
}

/** The numbers a Mesure reports, by how far its profil has come. */
export type MeasureReading =
  | { readonly status: "loading"; readonly horizontalM: number }
  | {
      readonly status: "online";
      readonly horizontalM: number;
      readonly dz: number;
      readonly directM: number;
      readonly groundM: number;
    }
  | {
      readonly status: "offline";
      readonly horizontalM: number;
      readonly failure: GeoadminFailure;
      /** From the profil in memory when both points stand on it, `null` otherwise. */
      readonly dz: number | null;
      readonly directM: number | null;
    };

/**
 * @param profile what {@link loadMeasureProfile} answered, `null` while it is on its way.
 * @param memory the Scenario's own profil, the offline answer for a point that stands on it.
 */
export function readMeasure(
  a: Position,
  b: Position,
  profile: MeasureProfile | null,
  memory: Trace | null,
): MeasureReading {
  const horizontalM = horizontalDistance(a, b);
  if (profile === null) return { status: "loading", horizontalM };
  if (profile.ok) {
    const { dz, groundM } = profile;
    return { status: "online", horizontalM, dz, directM: directDistance(horizontalM, dz), groundM };
  }
  const zA = memory === null ? null : altitudeOnProfile(memory, a);
  const zB = memory === null ? null : altitudeOnProfile(memory, b);
  const dz = zA === null || zB === null ? null : zB - zA;
  return {
    status: "offline",
    horizontalM,
    failure: profile.failure,
    dz,
    directM: dz === null ? null : directDistance(horizontalM, dz),
  };
}

/**
 * The two dotted lines through a point, north-south and east-west, as coordinate pairs that cross
 * the map: a screen is north-up, so each is one straight segment. Longer than any view the map
 * allows, clamped where the projection ends.
 */
export function crossLines({
  lat,
  lon,
}: Position): readonly [
  readonly (readonly [number, number])[],
  readonly (readonly [number, number])[],
] {
  const reach = CROSS_REACH_DEG;
  const south = Math.max(lat - reach, -MAX_LATITUDE);
  const north = Math.min(lat + reach, MAX_LATITUDE);
  return [
    [
      [lon, south],
      [lon, north],
    ],
    [
      [lon - reach, lat],
      [lon + reach, lat],
    ],
  ];
}
