/**
 * The rose des vents's conversions (#94): the handle's place ↔ the Scenario's Vent, on the trial's
 * verified line (A → B at 312°) and on one running due north. No map, no DOM: the pointer gesture
 * is the component's, and what it writes is these functions' and the reducer's.
 */

import { describe, expect, test } from "vitest";

import type { Wind } from "@/lib/scenario/types.ts";

import { appReducer, initialAppState } from "@/lib/app/state.ts";
import { applyField, railValues } from "@/lib/rail/values.ts";
import { FIRST_RUN_SCENARIO } from "@/lib/scenario/first-run.ts";
import { TRIAL_ENDS } from "@/lib/terrain/__fixtures__/geoadmin-2026-11-08.ts";
import { scenarioToSearch } from "@/lib/url/scenario.ts";

import {
  handleOffset,
  LEVEL_REFERENCE,
  lineAzimuth,
  relativeDirection,
  ROSE_MAX_KMH,
  ROSE_RADIUS_PX,
  roseReference,
  windAzimuth,
  windFromOffset,
} from "./wind-rose.ts";

const NORTH_LINE = { A: { lat: 46.8, lon: 7.4 }, B: { lat: 46.81, lon: 7.4 } };
const CALM: Wind = { speedKmh: 0, directionDeg: 0 };

describe("the line's azimuth", () => {
  test("the trial's line runs at about 312°, north-west", () => {
    expect(lineAzimuth(TRIAL_ENDS)).toBeCloseTo(312, 0);
  });

  test("a line due north is 0°, due east 90°, due south 180°", () => {
    expect(lineAzimuth(NORTH_LINE)).toBeCloseTo(0, 6);
    expect(lineAzimuth({ A: NORTH_LINE.A, B: { lat: 46.8, lon: 7.41 } })).toBeCloseTo(90, 6);
    expect(lineAzimuth({ A: NORTH_LINE.B, B: NORTH_LINE.A })).toBeCloseTo(180, 6);
  });

  test("is unknown while a Position is missing or both name one point", () => {
    expect(lineAzimuth({ A: NORTH_LINE.A, B: null })).toBeNull();
    expect(lineAzimuth({ A: null, B: null })).toBeNull();
    expect(lineAzimuth({ A: NORTH_LINE.A, B: NORTH_LINE.A })).toBeNull();
  });

  test("an unknown azimuth reads the line drawn level, A on the left", () => {
    expect(roseReference({ A: null, B: null })).toEqual(LEVEL_REFERENCE);
    expect(roseReference(TRIAL_ENDS)).toEqual({
      lineAzimuth: lineAzimuth(TRIAL_ENDS),
      oriented: true,
    });
  });
});

describe("azimuth ↔ relative direction", () => {
  const trial = roseReference(TRIAL_ENDS);

  test("a north-east wind of 60° is 108° relative to the trial's line: from the right, behind", () => {
    expect(Math.round(relativeDirection(60, trial))).toBe(108);
    expect(Math.round(windAzimuth(108, trial))).toBe(60);
  });

  test("a wind from the line's own bearing is a head wind, from the opposite one a tail wind", () => {
    expect(relativeDirection(312, { lineAzimuth: 312, oriented: true })).toBe(0);
    expect(relativeDirection(132, { lineAzimuth: 312, oriented: true })).toBe(180);
  });

  test("on a line due north the relative direction is the azimuth itself", () => {
    const north = roseReference(NORTH_LINE);
    expect(relativeDirection(0, north)).toBeCloseTo(0, 6);
    // Travelling north, the wind from the east comes from the right, from the west from the left.
    expect(relativeDirection(90, north)).toBeCloseTo(90, 6);
    expect(relativeDirection(270, north)).toBeCloseTo(270, 6);
  });

  test("with no azimuth the line runs to the right: a wind from below is from the right", () => {
    expect(windAzimuth(0, LEVEL_REFERENCE)).toBe(90);
    expect(windAzimuth(90, LEVEL_REFERENCE)).toBe(180);
    expect(relativeDirection(0, LEVEL_REFERENCE)).toBe(270);
  });
});

describe("the handle", () => {
  const north = roseReference(NORTH_LINE);

  test("stands at the centre without wind", () => {
    expect(handleOffset(CALM, north)).toEqual({ x: 0, y: 0 });
    expect(handleOffset({ speedKmh: 0, directionDeg: 123 }, LEVEL_REFERENCE)).toEqual({
      x: 0,
      y: 0,
    });
  });

  test("a head wind on a line running north stands above the centre, at its speed's radius", () => {
    const { x, y } = handleOffset({ speedKmh: 30, directionDeg: 0 }, north);
    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(-ROSE_RADIUS_PX / 2, 6);
  });

  test("on a line drawn level, a wind from the right stands below the centre", () => {
    const { x, y } = handleOffset({ speedKmh: ROSE_MAX_KMH, directionDeg: 90 }, LEVEL_REFERENCE);
    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(ROSE_RADIUS_PX, 6);
  });

  test("a speed past the scale parks on the outer ring", () => {
    const { x, y } = handleOffset({ speedKmh: 120, directionDeg: 270 }, north);
    expect(Math.hypot(x, y)).toBeCloseTo(ROSE_RADIUS_PX, 6);
  });

  test("dragged anywhere, writes whole km/h and a whole direction in [0, 360)", () => {
    const wind = windFromOffset({ x: 31, y: -17 }, north, CALM);
    expect(Number.isInteger(wind.speedKmh)).toBe(true);
    expect(Number.isInteger(wind.directionDeg)).toBe(true);
    expect(wind.directionDeg).toBeGreaterThanOrEqual(0);
    expect(wind.directionDeg).toBeLessThan(360);
  });

  test("dragged past the scale, writes the scale's end", () => {
    expect(windFromOffset({ x: 0, y: -500 }, north, CALM)).toEqual({
      speedKmh: ROSE_MAX_KMH,
      directionDeg: 0,
    });
  });

  test("dragged back to the centre, no wind — and the direction it had stays", () => {
    const before: Wind = { speedKmh: 20, directionDeg: 108 };
    expect(windFromOffset({ x: 0, y: 0 }, north, before)).toEqual({
      speedKmh: 0,
      directionDeg: 108,
    });
    expect(windFromOffset({ x: 0.3, y: 0.2 }, north, before).speedKmh).toBe(0);
  });

  test.each([
    ["the trial's line", roseReference(TRIAL_ENDS)],
    ["a line due north", north],
    ["a line drawn level", LEVEL_REFERENCE],
  ])("every whole wind put down on %s is read back as written", (_name, reference) => {
    for (let speedKmh = 1; speedKmh <= ROSE_MAX_KMH; speedKmh += 3) {
      for (let directionDeg = 0; directionDeg < 360; directionDeg += 7) {
        const wind = { speedKmh, directionDeg };
        expect(windFromOffset(handleOffset(wind, reference), reference, CALM)).toEqual(wind);
      }
    }
  });
});

describe("the rose and the two fields write one Vent", () => {
  const start = appReducer(initialAppState({ query: "", session: null }), {
    type: "scénario/modifié",
    patch: { positions: TRIAL_ENDS },
  });
  const reference = roseReference(TRIAL_ENDS);

  test("a handle dragged to the north-east at 25 km/h is 108° and 25 in the fields and the link", () => {
    const offset = handleOffset({ speedKmh: 25, directionDeg: 108 }, reference);
    const wind = windFromOffset(offset, reference, CALM);
    const { scenario } = appReducer(start, { type: "scénario/modifié", patch: { wind } });

    expect(railValues(scenario)).toMatchObject({ windSpeed: "25", windDirection: "108" });
    // The link is the shipped line's, with the Vent the rose wrote.
    expect(scenarioToSearch({ ...FIRST_RUN_SCENARIO, wind: scenario.wind })).toMatchObject({
      ws: 25,
      wd: 108,
    });
  });

  test("a speed typed in its field moves the handle to that radius, in the same direction", () => {
    const before = { speedKmh: 10, directionDeg: 108 };
    const typed = applyField({ ...start.scenario, wind: before }, "windSpeed", 40, null);
    const { x, y } = handleOffset(typed.wind, reference);
    expect(Math.hypot(x, y)).toBeCloseTo((40 / ROSE_MAX_KMH) * ROSE_RADIUS_PX, 6);
    expect(windFromOffset({ x, y }, reference, CALM).directionDeg).toBe(108);
  });

  test("a direction typed in its field turns the handle to that bearing", () => {
    const typed = applyField(
      { ...start.scenario, wind: { speedKmh: 30, directionDeg: 0 } },
      "windDirection",
      90,
      null,
    );
    const turned = handleOffset(typed.wind, LEVEL_REFERENCE);
    // From the right of a line drawn level, the handle is below the centre.
    expect(turned.x).toBeCloseTo(0, 6);
    expect(turned.y).toBeGreaterThan(0);
  });
});
