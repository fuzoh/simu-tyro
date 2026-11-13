/**
 * The rose des vents's conversions (#94): the handle's place ↔ the Scenario's Vent, whose direction
 * is the azimuth the wind comes from. On the north-up map the handle stands at that azimuth; on the
 * trial's line drawn level (A → B at ≈ 311,9°) it is turned by the line's bearing. No map, no DOM:
 * the pointer gesture is the component's, and what it writes is these functions' and the reducer's.
 */

import { describe, expect, test } from "vitest";

import type { Wind } from "@/lib/scenario/types.ts";

import { appReducer, initialAppState } from "@/lib/app/state.ts";
import { applyField, railValues } from "@/lib/rail/values.ts";
import { FIRST_RUN_SCENARIO } from "@/lib/scenario/first-run.ts";
import { lineBearing } from "@/lib/scenario/geometry.ts";
import { TRIAL_ENDS } from "@/lib/terrain/__fixtures__/geoadmin-2026-11-08.ts";
import { scenarioToSearch } from "@/lib/url/scenario.ts";

import {
  azimuthOf,
  handleOffset,
  NORTH_UP,
  ROSE_MAX_KMH,
  ROSE_RADIUS_PX,
  roseReference,
  screenBearing,
  windFromOffset,
} from "./wind-rose.ts";

/** No wind, under the profile that ships: uniform, the 50 % width kept. */
const CALM: Wind = { speedKmh: 0, directionDeg: 0, widthPct: 50, attenuationPct: 0 };
const TRIAL_BEARING = lineBearing(TRIAL_ENDS);
/** The trial's line drawn level, A on the left — the plain drawing outside LV95. */
const LEVEL_TRIAL = roseReference(TRIAL_BEARING, true);
if (LEVEL_TRIAL === null) throw new Error("the trial's line has a bearing");

describe("the rose's reference", () => {
  test("no bearing — A or B not on the map — leaves the rose nothing to set", () => {
    expect(roseReference(null, false)).toBeNull();
    expect(roseReference(null, true)).toBeNull();
  });

  test("on the map the rose is north-up, whatever the line's bearing", () => {
    expect(roseReference(TRIAL_BEARING, false)).toEqual(NORTH_UP);
    expect(roseReference(90, false)).toEqual(NORTH_UP);
  });

  test("on a line drawn level, north stands 90° minus the bearing from the top", () => {
    expect(roseReference(312, true)).toEqual({ north: 138, oriented: false });
    expect(roseReference(90, true)).toEqual({ north: 0, oriented: false });
  });
});

describe("azimuth ↔ bearing on the drawing", () => {
  test("on the north-up map the handle stands at the azimuth itself", () => {
    expect(screenBearing(264, NORTH_UP)).toBe(264);
    expect(azimuthOf(60, NORTH_UP)).toBe(60);
  });

  test("on a level line, a wind from the line's own bearing stands where B is, to the right", () => {
    const level = { north: 138, oriented: false };
    expect(screenBearing(312, level)).toBe(90);
    // From 90° clockwise of the line — its right — the handle is below the level line.
    expect(screenBearing(42, level)).toBe(180);
    expect(azimuthOf(90, level)).toBe(312);
  });
});

describe("the handle", () => {
  test("stands at the centre without wind", () => {
    expect(handleOffset(CALM, NORTH_UP)).toEqual({ x: 0, y: 0 });
    expect(handleOffset({ speedKmh: 0, directionDeg: 123 }, LEVEL_TRIAL)).toEqual({ x: 0, y: 0 });
  });

  test("a north wind stands above the centre on the map, at its speed's radius", () => {
    const { x, y } = handleOffset({ speedKmh: 30, directionDeg: 0 }, NORTH_UP);
    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(-ROSE_RADIUS_PX / 2, 6);
  });

  test("an east wind stands to the right of the centre on the map", () => {
    const { x, y } = handleOffset({ speedKmh: ROSE_MAX_KMH, directionDeg: 90 }, NORTH_UP);
    expect(x).toBeCloseTo(ROSE_RADIUS_PX, 6);
    expect(y).toBeCloseTo(0, 6);
  });

  test("a speed past the scale parks on the outer ring", () => {
    const { x, y } = handleOffset({ speedKmh: 120, directionDeg: 270 }, NORTH_UP);
    expect(Math.hypot(x, y)).toBeCloseTo(ROSE_RADIUS_PX, 6);
  });

  test("dragged anywhere, writes whole km/h and a whole direction in [0, 360)", () => {
    const wind = windFromOffset({ x: 31, y: -17 }, LEVEL_TRIAL, CALM);
    expect(Number.isInteger(wind.speedKmh)).toBe(true);
    expect(Number.isInteger(wind.directionDeg)).toBe(true);
    expect(wind.directionDeg).toBeGreaterThanOrEqual(0);
    expect(wind.directionDeg).toBeLessThan(360);
  });

  test("dragged past the scale to the top of the map, writes the scale's end from the north", () => {
    expect(windFromOffset({ x: 0, y: -500 }, NORTH_UP, CALM)).toEqual({
      ...CALM,
      speedKmh: ROSE_MAX_KMH,
      directionDeg: 0,
    });
  });

  test("dragged back to the centre, no wind — and the direction it had stays", () => {
    const before: Wind = { ...CALM, speedKmh: 20, directionDeg: 264 };
    expect(windFromOffset({ x: 0, y: 0 }, NORTH_UP, before)).toEqual({
      ...CALM,
      speedKmh: 0,
      directionDeg: 264,
    });
    expect(windFromOffset({ x: 0.3, y: 0.2 }, NORTH_UP, before).speedKmh).toBe(0);
  });

  test.each([
    ["the north-up map", NORTH_UP],
    ["the trial's line drawn level", LEVEL_TRIAL],
  ])("every whole wind put down on %s is read back as written", (_name, reference) => {
    for (let speedKmh = 1; speedKmh <= ROSE_MAX_KMH; speedKmh += 3) {
      for (let directionDeg = 0; directionDeg < 360; directionDeg += 7) {
        const wind = { ...CALM, speedKmh, directionDeg };
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

  test("a handle dragged to the north-east at 25 km/h is 60° and 25 in the fields and the link", () => {
    const offset = handleOffset({ speedKmh: 25, directionDeg: 60 }, NORTH_UP);
    const wind = windFromOffset(offset, NORTH_UP, CALM);
    const { scenario } = appReducer(start, { type: "scénario/modifié", patch: { wind } });

    expect(railValues(scenario)).toMatchObject({ windSpeed: "25", windDirection: "60" });
    // The link is the shipped line's, with the Vent the rose wrote.
    expect(scenarioToSearch({ ...FIRST_RUN_SCENARIO, wind: scenario.wind })).toMatchObject({
      ws: 25,
      wd: 60,
    });
  });

  test("a speed typed in its field moves the handle to that radius, in the same direction", () => {
    const before = { ...CALM, speedKmh: 10, directionDeg: 264 };
    const typed = applyField({ ...start.scenario, wind: before }, "windSpeed", 40, null);
    const { x, y } = handleOffset(typed.wind, NORTH_UP);
    expect(Math.hypot(x, y)).toBeCloseTo((40 / ROSE_MAX_KMH) * ROSE_RADIUS_PX, 6);
    expect(windFromOffset({ x, y }, NORTH_UP, CALM).directionDeg).toBe(264);
  });

  test("a direction typed in its field turns the handle to that azimuth", () => {
    const typed = applyField(
      { ...start.scenario, wind: { ...CALM, speedKmh: 30, directionDeg: 0 } },
      "windDirection",
      90,
      null,
    );
    const turned = handleOffset(typed.wind, NORTH_UP);
    // From the east, on the north-up map: right of the centre.
    expect(turned.x).toBeGreaterThan(0);
    expect(turned.y).toBeCloseTo(0, 6);
  });

  test("moving an anchor leaves the Vent, and so the handle on the map, where they were", () => {
    const windy = appReducer(start, {
      type: "scénario/modifié",
      patch: { wind: { ...CALM, speedKmh: 30, directionDeg: 264 } },
    });
    const moved = appReducer(windy, {
      type: "scénario/modifié",
      patch: { positions: { ...TRIAL_ENDS, B: { lat: 46.846166, lon: 6.521045 } } },
    });
    expect(lineBearing(moved.scenario.positions)).not.toBeCloseTo(TRIAL_BEARING ?? 0, 1);
    expect(moved.scenario.wind).toEqual({ ...CALM, speedKmh: 30, directionDeg: 264 });
    expect(railValues(moved.scenario)).toMatchObject({ windSpeed: "30", windDirection: "264" });
    expect(handleOffset(moved.scenario.wind, NORTH_UP)).toEqual(
      handleOffset(windy.scenario.wind, NORTH_UP),
    );
  });
});

describe("the handle keeps the rest of the Vent (#120)", () => {
  /** The trial's west wind, under a profile: 30 % of the span, the anchors 75 % under mid-span. */
  const shaped: Wind = { speedKmh: 20, directionDeg: 264, widthPct: 30, attenuationPct: 75 };

  test("a direction drag keeps the profile as it was", () => {
    const turned = windFromOffset({ x: 31, y: -17 }, NORTH_UP, shaped);
    expect(turned.speedKmh).not.toBe(shaped.speedKmh);
    expect(turned.directionDeg).not.toBe(shaped.directionDeg);
    expect(turned).toMatchObject({ widthPct: 30, attenuationPct: 75 });
  });

  test("a drag back to the centre keeps it too, with the direction it had", () => {
    expect(windFromOffset({ x: 0, y: 0 }, LEVEL_TRIAL, shaped)).toEqual({
      speedKmh: 0,
      directionDeg: 264,
      widthPct: 30,
      attenuationPct: 75,
    });
  });

  test("it does not write into the Vent it was given", () => {
    const before = { ...shaped };
    windFromOffset({ x: 31, y: -17 }, NORTH_UP, shaped);
    expect(shaped).toEqual(before);
  });
});
