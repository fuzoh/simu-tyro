/**
 * The Vue 3D's camera, as pure functions (#111): where the two Vues prédéfinies stand it, what each
 * key asks of it, and how far one step of the Gimbal moves it. The renderer
 * (`@/components/map/vue-3d-renderer.ts`) turns these into CesiumJS calls; nothing here imports
 * CesiumJS, so a `node` test reaches all of it.
 *
 * Rules this module exists to keep:
 *
 * - **The Vues prédéfinies are geometry on the anchors, never a fit the engine picks.** The Vue du
 *   départ stands {@link VUE_DU_DEPART}'s 4,5 m to the left of A, looking along A → B, at eye
 *   height above A's foot, and aims at anchor B. The Vue latérale looks square across the line,
 *   from the side that puts A on the left of the screen as on the coupe, a little from above, and
 *   stands back just far enough for the whole line, anchors and feet included, to fit with a
 *   margin.
 * - **One local plane per line.** East and north in metres around anchor A, on the ellipsoid's
 *   radii of curvature at the line's mid-latitude (the Mesure's, `./measure.ts`): over the few
 *   kilometres a zip line spans, exact to well under a millimetre per kilometre.
 * - **Keys act only where the Vue 3D has the focus**, which is the host's business; here a key is
 *   only read. A key held with Ctrl, Alt or Meta is the browser's, never the view's.
 */

import type { Position } from "@/lib/scenario/types.ts";

import type { EarthPoint, Vue3dScene } from "./vue-3d.ts";

import { WGS84_A, WGS84_F } from "./measure.ts";
import { CAMERA_REACH } from "./vue-3d.ts";

/** Where a camera stands and where it looks: heading clockwise from north, pitch up positive. */
export type CameraPose = {
  readonly destination: EarthPoint;
  /** Degrees clockwise from north, in `[0, 360)`. */
  readonly headingDeg: number;
  /** Degrees above the horizontal; negative looks down. */
  readonly pitchDeg: number;
};

/** The Vue du départ: on the platform at A, beside the line, looking where the passager goes. */
export const VUE_DU_DEPART = {
  /** How far to the left of A the eye stands, m, square to A → B. */
  offsetM: 4.5,
  /** Eye height above the ground at A's foot, m. */
  eyeM: 1.7,
} as const;

/** The Vue latérale: square across the line, a little from above, the whole line in the frame. */
export const VUE_LATERALE = {
  /** Degrees below the horizontal the camera looks. */
  pitchDeg: -10,
  /**
   * How much wider than the line the frame is: the line fills `1 / margin` of the view's
   * half-width or half-height, whichever binds. A `[CONVENTION]`, a drawing choice.
   */
  margin: 1.2,
} as const;

/** The camera's lens: CesiumJS's `PerspectiveFrustum` — `fov` spans the wider of the two sides. */
export type Lens = { readonly fovDeg: number; readonly aspectRatio: number };

/** The anchors and lines a Vue prédéfinie is placed from. */
type Placed = Pick<Vue3dScene, "ends" | "fils">;

/**
 * The Vue du départ: {@link VUE_DU_DEPART}'s offset to the left of A when one looks from A to B, at
 * eye height above A's foot, heading A → B and pitched to aim at anchor B.
 */
export function vueDuDepart({ ends, fils }: Placed, view = VUE_DU_DEPART): CameraPose {
  const plane = localPlane(ends.A, ends.B);
  const b = plane.metres(ends.B);
  const along = Math.hypot(b.east, b.north);
  // The unit vector A → B, and its left: (east, north) turned a quarter counter-clockwise.
  const forward =
    along === 0 ? { east: 0, north: 1 } : { east: b.east / along, north: b.north / along };
  const left = { east: -forward.north, north: forward.east };
  const eye = fils.A.foot.altitude + view.eyeM;
  return {
    destination: {
      ...plane.position(left.east * view.offsetM, left.north * view.offsetM),
      altitude: eye,
    },
    headingDeg: headingOf(forward.east, forward.north),
    // B lies `along` metres ahead of the eye — the offset is square to the line.
    pitchDeg: degrees(Math.atan2(fils.B.anchor.altitude - eye, along)),
  };
}

/**
 * The Vue latérale: looking square across A → B, from its right, so that A stands on the left of
 * the screen as on the coupe; {@link VUE_LATERALE}'s pitch; at the distance where every point of
 * `lines`, both anchors and both feet fit the lens with the margin. The right of A → B is chosen:
 * #111's « du côté gauche » would put A on the right of the screen, and A on the left — the coupe's
 * reading — is what the view is for (GLOSSARY.md, « Vue latérale »).
 *
 * @param lines the polylines drawn, so a line sagging below both feet stays in the frame.
 */
export function vueLaterale(
  { ends, fils }: Placed,
  lens: Lens,
  lines: readonly (readonly EarthPoint[] | null)[] = [],
  view = VUE_LATERALE,
): CameraPose {
  const plane = localPlane(ends.A, ends.B);
  const b = plane.metres(ends.B);
  // A → B's own heading; the camera looks a quarter turn to its left, from the line's right.
  const along = headingOf(b.east, b.north);
  const heading = radians(along - 90);
  const pitch = radians(view.pitchDeg);
  // The camera's three axes in (east, north, up).
  const forward = [
    Math.sin(heading) * Math.cos(pitch),
    Math.cos(heading) * Math.cos(pitch),
    Math.sin(pitch),
  ];
  const right = [Math.cos(heading), -Math.sin(heading), 0];
  const up = [
    -Math.sin(pitch) * Math.sin(heading),
    -Math.sin(pitch) * Math.cos(heading),
    Math.cos(pitch),
  ];

  const points = [
    fils.A.anchor,
    fils.A.foot,
    fils.B.anchor,
    fils.B.foot,
    ...lines.flatMap((line) => line ?? []),
  ].map((point) => {
    const { east, north } = plane.metres(point);
    return [east, north, point.altitude];
  });
  // The box's centre is what the camera looks at.
  const target = [0, 1, 2].map((axis) => {
    const values = points.map((point) => point[axis] ?? 0);
    return (Math.min(...values) + Math.max(...values)) / 2;
  });
  const { tanHalfWidth, tanHalfHeight } = halfAngles(lens);
  // A point at (r, u) across the view and f along it, from a camera `d` behind the target, is in
  // frame when |r| ≤ (d + f)·tan(half-width) / margin, and the same for u: `d` is the largest of
  // those bounds over every point.
  let distance = 0;
  for (const point of points) {
    const offset = point.map((value, axis) => value - (target[axis] ?? 0));
    const r = Math.abs(dot(offset, right));
    const u = Math.abs(dot(offset, up));
    const f = dot(offset, forward);
    distance = Math.max(distance, view.margin * Math.max(r / tanHalfWidth, u / tanHalfHeight) - f);
  }
  distance = Math.min(distance, CAMERA_REACH);
  const [east = 0, north = 0, altitude = 0] = target.map(
    (value, axis) => value - distance * (forward[axis] ?? 0),
  );
  return {
    destination: { ...plane.position(east, north), altitude },
    headingDeg: normalise(along - 90),
    pitchDeg: view.pitchDeg,
  };
}

/** What a key, a Gimbal button, asks of the camera. */
export type Vue3dCommand =
  /** Around the line's centre: `+1` to the right, `-1` to the left. */
  | { readonly kind: "orbit"; readonly step: 1 | -1 }
  /** Along the heading, level: `+1` forward. */
  | { readonly kind: "walk"; readonly step: 1 | -1 }
  /** The camera's pitch: `+1` up. */
  | { readonly kind: "tilt"; readonly step: 1 | -1 }
  /** Along the view: `+1` closer. */
  | { readonly kind: "zoom"; readonly step: 1 | -1 }
  /** Heading north, the point in the middle of the view kept. */
  | { readonly kind: "north" }
  | { readonly kind: "view"; readonly view: "depart" | "laterale" };

/** A keyboard event, as much of it as this module reads. */
export type Key = {
  readonly key: string;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
};

/** The command a key asks for, or `null` when the key is not the Vue 3D's. */
export function vue3dKeyCommand({
  key,
  shiftKey,
  ctrlKey,
  altKey,
  metaKey,
}: Key): Vue3dCommand | null {
  if (ctrlKey || altKey || metaKey) return null;
  switch (key) {
    case "ArrowLeft":
      return { kind: "orbit", step: -1 };
    case "ArrowRight":
      return { kind: "orbit", step: 1 };
    case "ArrowUp":
      return { kind: shiftKey ? "tilt" : "walk", step: 1 };
    case "ArrowDown":
      return { kind: shiftKey ? "tilt" : "walk", step: -1 };
    // « = » is « + » unshifted on a US keyboard; « + » is the numpad's and the Swiss layouts'.
    case "+":
    case "=":
      return { kind: "zoom", step: 1 };
    case "-":
    case "_":
      return { kind: "zoom", step: -1 };
    case "1":
      return { kind: "view", view: "depart" };
    case "2":
      return { kind: "view", view: "laterale" };
    case "n":
    case "N":
      return { kind: "north" };
    default:
      return null;
  }
}

/** One step of the Gimbal or of a key. `[CONVENTION]`s: how far a press moves, not a measurement. */
export const CAMERA_STEP = {
  /** Degrees of orbit around the line's centre. */
  orbitDeg: 5,
  /** Degrees of pitch. */
  tiltDeg: 5,
  /** The share of the distance to what the view looks at that a zoom in closes. */
  zoom: 0.2,
  /** The share of that distance a step forward covers, never under {@link MIN_WALK_M}. */
  walk: 0.1,
  /** How long a flight to a Vue prédéfinie lasts, s. */
  flightS: 0.8,
} as const;

/** The shortest step forward, m: a walk that would not leave the spot. */
export const MIN_WALK_M = 1;

/** The pitch the camera may take, degrees: straight down excluded, and never far above level. */
export const PITCH_RANGE = { min: -89, max: 30 } as const;

/** The pitch one tilt step leaves, in {@link PITCH_RANGE}. */
export function tiltedPitch(pitchDeg: number, step: 1 | -1): number {
  return Math.min(
    PITCH_RANGE.max,
    Math.max(PITCH_RANGE.min, pitchDeg + step * CAMERA_STEP.tiltDeg),
  );
}

/**
 * How far one zoom step moves the camera along its view, m, positive closer. Out is the inverse of
 * in — a step in then a step out comes back — and stops at {@link CAMERA_REACH}.
 *
 * @param distance how far the camera stands from what it looks at, m.
 */
export function zoomAmount(distance: number, step: 1 | -1): number {
  if (step === 1) return distance * CAMERA_STEP.zoom;
  const back = (distance * CAMERA_STEP.zoom) / (1 - CAMERA_STEP.zoom);
  return -Math.max(0, Math.min(back, CAMERA_REACH - distance));
}

/** How far one walk step moves the camera, m, positive forward. */
export function walkAmount(distance: number, step: 1 | -1): number {
  return step * Math.max(MIN_WALK_M, distance * CAMERA_STEP.walk);
}

/** The local plane around `origin`: east and north in metres, at the radii of the mid-latitude. */
function localPlane(origin: Position, other: Position) {
  const rad = Math.PI / 180;
  const e2 = WGS84_F * (2 - WGS84_F);
  const phi = ((origin.lat + other.lat) / 2) * rad;
  const w = Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
  const perLat = ((WGS84_A * (1 - e2)) / w ** 3) * rad;
  const perLon = (WGS84_A / w) * Math.cos(phi) * rad;
  return {
    metres: ({ lat, lon }: Position) => ({
      east: (lon - origin.lon) * perLon,
      north: (lat - origin.lat) * perLat,
    }),
    position: (east: number, north: number): Position => ({
      lon: origin.lon + east / perLon,
      lat: origin.lat + north / perLat,
    }),
  };
}

/** The tangents of the lens's half-angles across and up the view. */
function halfAngles({ fovDeg, aspectRatio }: Lens) {
  const tan = Math.tan(radians(fovDeg) / 2);
  // A view with no size yet is framed as a square.
  const aspect = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  return aspect >= 1
    ? { tanHalfWidth: tan, tanHalfHeight: tan / aspect }
    : { tanHalfWidth: tan * aspect, tanHalfHeight: tan };
}

function headingOf(east: number, north: number): number {
  return east === 0 && north === 0 ? 0 : normalise(degrees(Math.atan2(east, north)));
}

function dot(a: readonly number[], b: readonly number[]): number {
  return a.reduce((sum, value, i) => sum + value * (b[i] ?? 0), 0);
}

function normalise(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function radians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function degrees(rad: number): number {
  return (rad * 180) / Math.PI;
}
