/**
 * The Vue 3D's camera (#111): where the two Vues prédéfinies stand it, which key asks for what, and
 * how far one step moves it.
 *
 * The lines are hand-placed so every expectation is a closed form: B due north or due east of A, and
 * distances read back by the Mesure's own geodesy (`horizontalDistance`), not by this module's.
 */

import { describe, expect, test } from "vitest";

import type { Position } from "@/lib/scenario/types.ts";

import { lineBearing } from "@/lib/scenario/geometry.ts";
import { TRIAL_ENDS } from "@/lib/terrain/__fixtures__/geoadmin-2026-11-08.ts";

import type { Key } from "./vue-3d-camera.ts";
import type { EarthPoint, FilAPlomb } from "./vue-3d.ts";

import { bananePoint } from "./banane.ts";
import { horizontalDistance } from "./measure.ts";
import {
  CAMERA_STEP,
  MIN_WALK_M,
  PITCH_RANGE,
  tiltedPitch,
  vue3dKeyCommand,
  vueDuDepart,
  vueLaterale,
  walkAmount,
  zoomAmount,
} from "./vue-3d-camera.ts";
import { CAMERA_REACH } from "./vue-3d.ts";

const A = { lat: 46.84, lon: 6.52 };
/** About 445 m due north of A. */
const NORTH = { lat: 46.844, lon: 6.52 };
/** About 457 m due east of A. */
const EAST = { lat: 46.84, lon: 6.526 };

function fil(at: Position, foot: number, height: number): FilAPlomb {
  return {
    foot: { ...at, altitude: foot },
    anchor: { ...at, altitude: foot + height },
    top: { ...at, altitude: foot + 100_000 },
  };
}

/** A line from A to `B`, A's foot at `footA` under a 1,5 m anchor, B's anchor at `anchorB`. */
function line(B: Position, footA: number, anchorB: number) {
  return {
    ends: { A, B },
    fils: { A: fil(A, footA, 1.5), B: fil(B, anchorB - 10, 10) },
  };
}

const deg = (rad: number) => (rad * 180) / Math.PI;
const rad = (degrees: number) => (degrees * Math.PI) / 180;

/** Which side of A → B a point stands, by the sign of the cross product: `1` on the left. */
function side({ A: from, B: to }: { A: Position; B: Position }, at: Position): number {
  const cos = Math.cos(rad(from.lat));
  const east = (to.lon - from.lon) * cos;
  const north = to.lat - from.lat;
  return Math.sign(east * (at.lat - from.lat) - north * (at.lon - from.lon) * cos);
}

describe("the Vue du départ", () => {
  test("stands 4,5 m to the left of A, looking north along a line that runs north", () => {
    const { destination, headingDeg } = vueDuDepart(line(NORTH, 1400, 1450));
    // Left of a northward travel is west: same latitude, smaller longitude.
    expect(destination.lat).toBeCloseTo(A.lat, 12);
    expect(destination.lon).toBeLessThan(A.lon);
    expect(horizontalDistance(destination, A)).toBeCloseTo(4.5, 3);
    expect(headingDeg).toBeCloseTo(0, 9);
  });

  test("stands to the north of A on a line that runs east, looking east", () => {
    const { destination, headingDeg } = vueDuDepart(line(EAST, 1400, 1450));
    expect(destination.lon).toBeCloseTo(A.lon, 12);
    expect(destination.lat).toBeGreaterThan(A.lat);
    expect(horizontalDistance(destination, A)).toBeCloseTo(4.5, 3);
    expect(headingDeg).toBeCloseTo(90, 9);
  });

  test("the eye is 1,7 m above the ground at A's foot, not above the anchor", () => {
    // 1 400 + 1,7 m; the anchor, 1,5 m up the Fil à plomb, plays no part.
    expect(vueDuDepart(line(NORTH, 1400, 1450)).destination.altitude).toBeCloseTo(1401.7, 9);
  });

  test("pitches to aim at anchor B: up the rise over the portée", () => {
    const { pitchDeg } = vueDuDepart(line(NORTH, 1400, 1450));
    // B's anchor is 1 450 − 1 401,7 = 48,3 m above the eye, the portée ahead of it.
    expect(pitchDeg).toBeCloseTo(deg(Math.atan(48.3 / horizontalDistance(A, NORTH))), 3);
    // A line that falls is looked down.
    expect(vueDuDepart(line(NORTH, 1400, 1380)).pitchDeg).toBeLessThan(0);
  });

  test("on the trial line: heading A → B, standing on the left of the travel", () => {
    const trial = {
      ends: TRIAL_ENDS,
      fils: { A: fil(TRIAL_ENDS.A, 1453.7, 1.5), B: fil(TRIAL_ENDS.B, 1438.7, 1) },
    };
    const { destination, headingDeg } = vueDuDepart(trial);
    // The map's bearing is the sphere's Mercator, the camera's frame the ellipsoid's: at 46,84° the
    // meridian radius is M/N = 0,99686 of the prime vertical, which turns a bearing of 311,9° by
    // (1 − M/N)·sin β·cos β ≈ 0,0016 rad, 0,09°.
    expect(Math.abs(headingDeg - (lineBearing(TRIAL_ENDS) ?? 0))).toBeLessThan(0.1);
    expect(horizontalDistance(destination, TRIAL_ENDS.A)).toBeCloseTo(4.5, 3);
    // The Banane of a positive cross component bows to the left of the travel: the same side.
    expect(side(TRIAL_ENDS, destination)).toBe(1);
    expect(side(TRIAL_ENDS, bananePoint(TRIAL_ENDS, 0.5, 10))).toBe(1);
  });
});

describe("the Vue latérale", () => {
  /** A level line due north, both feet at 1 400 m, both anchors 10 m up. */
  const level = {
    ends: { A, B: NORTH },
    fils: { A: fil(A, 1400, 10), B: fil(NORTH, 1400, 10) },
  };
  const D = horizontalDistance(A, NORTH);
  const middle = { lat: (A.lat + NORTH.lat) / 2, lon: A.lon };
  /** Cesium's 60° spread across the wider side, on a view twice as wide as tall. */
  const WIDE = { fovDeg: 60, aspectRatio: 2 };

  test("looks square across the line from its right, so A is on the left of the screen", () => {
    const { destination, headingDeg, pitchDeg } = vueLaterale(level, WIDE);
    // A line running north is seen from the east, looking west: the screen's right is north, B.
    expect(headingDeg).toBeCloseTo(270, 9);
    expect(destination.lon).toBeGreaterThan(A.lon);
    expect(destination.lat).toBeCloseTo(middle.lat, 9);
    expect(pitchDeg).toBe(-10);
  });

  test("stands back just far enough for the portée to fill the view's width with the margin", () => {
    // The box is centred on the line's middle at 1 405 m. The anchors bind: ± D/2 across the view,
    // 5 m above the centre, so 5·sin 10° nearer than it along the view. With 20 % of margin on
    // tan 30°, the camera stands d = 1,2·(D/2)/tan 30° + 5·sin 10° from the centre, along a view
    // pitched −10°: d·cos 10° east of the middle, d·sin 10° above it.
    const d = (1.2 * (D / 2)) / Math.tan(rad(30)) + 5 * Math.sin(rad(10));
    const { destination } = vueLaterale(level, WIDE);
    expect(horizontalDistance(destination, middle)).toBeCloseTo(d * Math.cos(rad(10)), 2);
    expect(destination.altitude).toBeCloseTo(1405 + d * Math.sin(rad(10)), 6);
  });

  test("on a portrait view the 60° spread is the height's, and the width is narrower", () => {
    // Aspect ½: tan(half-width) = tan 30° / 2, so the same portée needs the camera twice as far.
    const d = (1.2 * (D / 2)) / (Math.tan(rad(30)) / 2) + 5 * Math.sin(rad(10));
    const { destination } = vueLaterale(level, { fovDeg: 60, aspectRatio: 0.5 });
    expect(horizontalDistance(destination, middle)).toBeCloseTo(d * Math.cos(rad(10)), 2);
  });

  test("a line sagging far below its feet is framed by its height, low point included", () => {
    // The loaded line dips to 1 000 m mid-span: the box runs 1 000 – 1 410 m, centred at 1 205 m.
    // The anchors, 205 m above the centre, bind on the height: tan(half-height) = tan 30° / 2, and
    // they stand 205·cos 10° up the view, 205·sin 10° nearer than the centre along it.
    const sag: EarthPoint[] = [
      level.fils.A.anchor,
      { ...middle, altitude: 1000 },
      level.fils.B.anchor,
    ];
    const d = (1.2 * 205 * Math.cos(rad(10))) / (Math.tan(rad(30)) / 2) + 205 * Math.sin(rad(10));
    const { destination } = vueLaterale(level, WIDE, [sag, null]);
    expect(horizontalDistance(destination, middle)).toBeCloseTo(d * Math.cos(rad(10)), 2);
    expect(destination.altitude).toBeCloseTo(1205 + d * Math.sin(rad(10)), 6);
  });

  test("never stands farther than the camera may reach", () => {
    // 0,5° of latitude: a 55 km line, which no 20 km camera frames.
    const far = { lat: A.lat + 0.5, lon: A.lon };
    const huge = { ends: { A, B: far }, fils: { A: fil(A, 1400, 10), B: fil(far, 1400, 10) } };
    const { destination } = vueLaterale(huge, WIDE);
    const centre = { lat: (A.lat + far.lat) / 2, lon: A.lon };
    expect(horizontalDistance(destination, centre)).toBeCloseTo(
      CAMERA_REACH * Math.cos(rad(10)),
      0,
    );
  });
});

describe("the keys of the Vue 3D", () => {
  const press = (key: string, held: Partial<Key> = {}) =>
    vue3dKeyCommand({
      key,
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      ...held,
    });

  test.each([
    ["ArrowLeft", {}, { kind: "orbit", step: -1 }],
    ["ArrowRight", {}, { kind: "orbit", step: 1 }],
    ["ArrowUp", {}, { kind: "walk", step: 1 }],
    ["ArrowDown", {}, { kind: "walk", step: -1 }],
    ["ArrowUp", { shiftKey: true }, { kind: "tilt", step: 1 }],
    ["ArrowDown", { shiftKey: true }, { kind: "tilt", step: -1 }],
    ["+", {}, { kind: "zoom", step: 1 }],
    // « + » is Shift and a key on most layouts, the numpad's alone.
    ["+", { shiftKey: true }, { kind: "zoom", step: 1 }],
    ["=", {}, { kind: "zoom", step: 1 }],
    ["-", {}, { kind: "zoom", step: -1 }],
    ["1", {}, { kind: "view", view: "depart" }],
    ["2", {}, { kind: "view", view: "laterale" }],
    ["n", {}, { kind: "north" }],
    ["N", { shiftKey: true }, { kind: "north" }],
  ] as const)("%s %o asks for %o", (key, held, command) => {
    expect(press(key, held)).toEqual(command);
  });

  test("a key the Vue 3D does not use is left to the page", () => {
    for (const key of ["a", "3", " ", "Enter", "Tab", "Escape", "PageDown"]) {
      expect(press(key)).toBeNull();
    }
  });

  test("with Ctrl, Alt or Meta held a key is the browser's: Ctrl + « + » zooms the page", () => {
    expect(press("+", { ctrlKey: true })).toBeNull();
    expect(press("1", { metaKey: true })).toBeNull();
    expect(press("ArrowLeft", { altKey: true })).toBeNull();
  });
});

describe("one step of the camera", () => {
  test("a tilt moves the pitch by its step and stops short of straight down and of the sky", () => {
    expect(tiltedPitch(-10, 1)).toBe(-10 + CAMERA_STEP.tiltDeg);
    expect(tiltedPitch(-10, -1)).toBe(-10 - CAMERA_STEP.tiltDeg);
    expect(tiltedPitch(PITCH_RANGE.min + 1, -1)).toBe(-89);
    expect(tiltedPitch(PITCH_RANGE.max - 1, 1)).toBe(30);
  });

  test("a zoom in closes a fifth of the distance, and a zoom out undoes it", () => {
    expect(zoomAmount(500, 1)).toBeCloseTo(100, 9);
    // 400 m from the target, out: 400 / 0,8 = 500 m again.
    expect(400 - zoomAmount(400, -1)).toBeCloseTo(500, 9);
  });

  test("a zoom out stops at the camera's reach", () => {
    expect(zoomAmount(CAMERA_REACH - 10, -1)).toBeCloseTo(-10, 9);
    expect(zoomAmount(CAMERA_REACH, -1)).toBeCloseTo(0, 9);
  });

  test("a step forward is a tenth of the distance, never under a metre", () => {
    expect(walkAmount(300, 1)).toBeCloseTo(30, 9);
    expect(walkAmount(300, -1)).toBeCloseTo(-30, 9);
    expect(walkAmount(2, 1)).toBe(MIN_WALK_M);
  });
});
