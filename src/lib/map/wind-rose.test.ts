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
import { uniformWind } from "@/lib/scenario/wind.ts";
import { TRIAL_ENDS } from "@/lib/terrain/__fixtures__/geoadmin-2026-11-08.ts";
import { scenarioToSearch } from "@/lib/url/scenario.ts";

import {
  azimuthOf,
  handleOffset,
  NORTH_UP,
  PROFILE_PAD_PX,
  PROFILE_PREVIEW_STEPS,
  profileHandleOffset,
  profilePreview,
  ROSE_MAX_KMH,
  ROSE_RADIUS_PX,
  roseReference,
  screenBearing,
  windControls,
  windFromOffset,
  windFromProfileOffset,
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

describe("each handle writes its own fields (#120)", () => {
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

  test("a profile drag keeps the speed and the direction as they were", () => {
    const reshaped = windFromProfileOffset({ x: 90, y: 60 }, shaped);
    expect(reshaped).toMatchObject({ speedKmh: 20, directionDeg: 264 });
    expect(reshaped.widthPct).not.toBe(shaped.widthPct);
    expect(reshaped.attenuationPct).not.toBe(shaped.attenuationPct);
  });

  test("neither handle writes into the Vent it was given", () => {
    const before = { ...shaped };
    windFromOffset({ x: 31, y: -17 }, NORTH_UP, shaped);
    windFromProfileOffset({ x: 90, y: 60 }, shaped);
    expect(shaped).toEqual(before);
  });
});

describe("the profile's handle (#120)", () => {
  const { width: W, height: H } = PROFILE_PAD_PX;

  test("its pad gives every percent a pixel of its own: at least 100 by 100", () => {
    expect(W).toBeGreaterThanOrEqual(100);
    expect(H).toBeGreaterThanOrEqual(100);
  });

  test("stands at the bottom of the pad without attenuation, at the width kept", () => {
    // 50 % is halfway between 10 and 90: the middle of the bottom edge.
    expect(profileHandleOffset(CALM)).toEqual({ x: W / 2, y: H });
    expect(profileHandleOffset({ widthPct: 10, attenuationPct: 0 })).toEqual({ x: 0, y: H });
    expect(profileHandleOffset({ widthPct: 90, attenuationPct: 100 })).toEqual({ x: W, y: 0 });
  });

  test("right is wider and up is more attenuated", () => {
    const narrow = profileHandleOffset({ widthPct: 30, attenuationPct: 40 });
    const wide = profileHandleOffset({ widthPct: 60, attenuationPct: 40 });
    const sheltered = profileHandleOffset({ widthPct: 30, attenuationPct: 80 });
    expect(wide.x).toBeGreaterThan(narrow.x);
    expect(wide.y).toBe(narrow.y);
    // `y` runs downward on a screen: up is a smaller `y`.
    expect(sheltered.y).toBeLessThan(narrow.y);
    expect(sheltered.x).toBe(narrow.x);
  });

  test("a diagonal sets both", () => {
    const from = profileHandleOffset({ widthPct: 30, attenuationPct: 40 });
    const moved = windFromProfileOffset({ x: from.x + 30, y: from.y - 30 }, CALM);
    // 30 px to the right is 30/120 of the 80 points of width; 30 px up is 30 of the 100.
    expect(moved).toMatchObject({ widthPct: 50, attenuationPct: 70 });
  });

  test("its axes are the screen's: the wind's direction and the drawing's turn leave it where it is", () => {
    const profile = { widthPct: 30, attenuationPct: 75 };
    const west = { ...profile, speedKmh: 30, directionDeg: 264 };
    const north = { ...profile, speedKmh: 12, directionDeg: 0 };
    // 30 % is a quarter of the way across; 75 % is three quarters of the way up.
    expect(profileHandleOffset(west)).toEqual({ x: W / 4, y: H / 4 });
    expect(profileHandleOffset(north)).toEqual(profileHandleOffset(west));
    // The direction handle, under the same two drawings, does turn.
    expect(handleOffset(west, NORTH_UP)).not.toEqual(handleOffset(west, LEVEL_TRIAL));
  });

  test("every whole profile put down on the pad is read back as written", () => {
    for (let widthPct = 10; widthPct <= 90; widthPct++) {
      for (let attenuationPct = 0; attenuationPct <= 100; attenuationPct++) {
        const written = windFromProfileOffset(
          profileHandleOffset({ widthPct, attenuationPct }),
          CALM,
        );
        expect(written).toEqual({ ...CALM, widthPct, attenuationPct });
      }
    }
  });

  test("dragged anywhere, writes whole percents inside their domains", () => {
    for (const offset of [
      { x: 31.4, y: 17.8 },
      { x: -50, y: 500 },
      { x: 9999, y: -9999 },
      { x: W / 3, y: H / 7 },
    ]) {
      const { widthPct, attenuationPct } = windFromProfileOffset(offset, CALM);
      expect(Number.isInteger(widthPct)).toBe(true);
      expect(Number.isInteger(attenuationPct)).toBe(true);
      expect(widthPct).toBeGreaterThanOrEqual(10);
      expect(widthPct).toBeLessThanOrEqual(90);
      expect(attenuationPct).toBeGreaterThanOrEqual(0);
      expect(attenuationPct).toBeLessThanOrEqual(100);
    }
    // Past the pad's corners, the corners' own values.
    expect(windFromProfileOffset({ x: -50, y: 500 }, CALM)).toMatchObject({
      widthPct: 10,
      attenuationPct: 0,
    });
    expect(windFromProfileOffset({ x: 9999, y: -9999 }, CALM)).toMatchObject({
      widthPct: 90,
      attenuationPct: 100,
    });
  });

  test("a value out of its domain parks the handle on the nearest edge, and is not rewritten", () => {
    const carried = { widthPct: 95, attenuationPct: -1 };
    expect(profileHandleOffset(carried)).toEqual({ x: W, y: H });
    expect(profileHandleOffset({ widthPct: 9, attenuationPct: 110 })).toEqual({ x: 0, y: 0 });
    expect(carried).toEqual({ widthPct: 95, attenuationPct: -1 });
  });

  test("a value between two steps stands where its field shows it", () => {
    expect(profileHandleOffset({ widthPct: 50.4, attenuationPct: 74.6 })).toEqual(
      profileHandleOffset({ widthPct: 50, attenuationPct: 75 }),
    );
  });

  test("« Vent uniforme » drops the handle to the bottom, and leaves it at its width", () => {
    const shaped: Wind = { speedKmh: 20, directionDeg: 264, widthPct: 30, attenuationPct: 75 };
    const before = profileHandleOffset(shaped);
    const after = profileHandleOffset(uniformWind(shaped));
    expect(after).toEqual({ x: before.x, y: H });
  });
});

describe("the profile's preview (#120)", () => {
  const shaped: Wind = { speedKmh: 40, directionDeg: 264, widthPct: 50, attenuationPct: 75 };

  test("reads the speed at mid-span, the speed at the anchors, and the width", () => {
    // 40 km/h entered, the anchors 75 % under it; half of a 150 m span is 75 m.
    expect(profilePreview(shaped, 150)).toMatchObject({
      midKmh: 40,
      anchorKmh: 10,
      uniform: false,
      width: 50,
      widthMetres: 75,
      marks: [0.25, 0.75],
    });
  });

  test("leaves the metres out without a span: the percent stands alone", () => {
    expect(profilePreview(shaped, null)?.widthMetres).toBeNull();
    expect(profilePreview(shaped, 0)?.widthMetres).toBeNull();
    expect(profilePreview(shaped, null)?.width).toBe(50);
  });

  test("draws the line from A on the left to B on the right, highest at mid-span", () => {
    const curve = profilePreview(shaped, 150)?.curve ?? [];
    expect(curve).toHaveLength(PROFILE_PREVIEW_STEPS + 1);
    expect(curve[0]).toEqual({ xi: 0, share: 0.25 });
    expect(curve.at(-1)).toEqual({ xi: 1, share: 0.25 });
    expect(curve[PROFILE_PREVIEW_STEPS / 2]).toEqual({ xi: 0.5, share: 1 });
    // Symmetric about mid-span — to rounding: a 48th is no exact float — and rising from A to it.
    for (let step = 0; step < PROFILE_PREVIEW_STEPS / 2; step++) {
      expect(curve[PROFILE_PREVIEW_STEPS - step].share).toBeCloseTo(curve[step].share, 12);
      expect(curve[step + 1].share).toBeGreaterThanOrEqual(curve[step].share);
    }
  });

  test("a uniform wind is a level line, and the width kept is still marked", () => {
    const uniform = profilePreview({ ...shaped, widthPct: 30, attenuationPct: 0 }, 200);
    expect(uniform).toMatchObject({ midKmh: 40, anchorKmh: 40, uniform: true, width: 30 });
    expect(uniform?.marks).toEqual([0.35, 0.65]);
    expect(uniform?.widthMetres).toBeCloseTo(60, 12);
    expect(uniform?.curve.every((point) => point.share === 1)).toBe(true);
  });

  test("a Vent without speed still shows the shape its two percents describe", () => {
    const still = profilePreview({ ...shaped, speedKmh: 0 }, 150);
    expect(still).toMatchObject({ midKmh: 0, anchorKmh: 0, uniform: false });
    expect(still?.curve[0].share).toBe(0.25);
  });

  test("a profile the gates refuse has no preview: it is not drawn as though legal", () => {
    expect(profilePreview({ ...shaped, widthPct: 95 }, 150)).toBeNull();
    expect(profilePreview({ ...shaped, widthPct: 9 }, 150)).toBeNull();
    expect(profilePreview({ ...shaped, attenuationPct: -1 }, 150)).toBeNull();
    expect(profilePreview({ ...shaped, attenuationPct: 101 }, 150)).toBeNull();
    expect(profilePreview({ ...shaped, speedKmh: -5 }, 150)).toBeNull();
  });
});

/**
 * Which of the Vent's controls a vue de dessus offers. Each expectation is the brief's or the
 * map's own rule, read off no implementation: no mutation command in a read-only view, no profile
 * shown before the physics reads it, none drawn as legal while it is refused — and a handle that
 * waits at the centre only where a drag from the centre can repair what parked it there.
 */
describe("which of the Vent's controls a vue de dessus offers (#120)", () => {
  /** The live map of a Page that writes: A and B placed, the Vent read, no Mesure. */
  const MAP = { culprits: [], placed: true, locked: false, measuring: false } as const;
  const BOTH = [false, true] as const;

  test("as it ships: the rose's handle, and nothing of the profile", () => {
    expect(windControls(MAP)).toEqual({ handle: true, pad: false, preview: false });
  });

  describe("the direction handle", () => {
    test.each(BOTH)("stands on a placed line of a map that writes (profile read: %s)", (active) => {
      expect(windControls(MAP, active).handle).toBe(true);
      // The Mesure takes the map's clicks, not the rose's handle.
      expect(windControls({ ...MAP, measuring: true }, active).handle).toBe(true);
    });

    test.each(BOTH)(
      "not on the Page Terrain, nor without a bearing (profile read: %s)",
      (active) => {
        expect(windControls({ ...MAP, locked: true }, active).handle).toBe(false);
        expect(windControls({ ...MAP, placed: false }, active).handle).toBe(false);
      },
    );

    test.each([[["windSpeed"]], [["windDirection"]], [["windSpeed", "windDirection"]]] as const)(
      "waits at the centre over a refused %j: a drag writes both",
      (culprits) => {
        for (const active of BOTH) {
          expect(windControls({ ...MAP, culprits }, active).handle).toBe(true);
        }
      },
    );

    test.each([
      [["windAttenuation"]],
      [["windWidth"]],
      [["windWidth", "windAttenuation"]],
      // The drag would mend the speed and leave the Vent withheld, the handle back at the centre.
      [["windSpeed", "windAttenuation"]],
    ] as const)("is not offered over a refused %j: a drag writes neither percent", (culprits) => {
      for (const active of BOTH) {
        expect(windControls({ ...MAP, culprits }, active).handle).toBe(false);
      }
    });
  });

  describe("the profile's pad", () => {
    test("is mounted nowhere before the physics reads the profile", () => {
      for (const locked of BOTH) {
        for (const placed of BOTH) {
          for (const measuring of BOTH) {
            expect(windControls({ culprits: [], placed, locked, measuring }, false).pad).toBe(
              false,
            );
          }
        }
      }
    });

    test("once it does, stands on a placed line of a map that writes", () => {
      expect(windControls(MAP, true).pad).toBe(true);
      expect(windControls({ ...MAP, placed: false }, true).pad).toBe(false);
    });

    test("never on the Page Terrain: a read-only view has no mutation command", () => {
      expect(windControls({ ...MAP, locked: true }, true).pad).toBe(false);
      // Whatever else holds — a refused percent a drag of it would bring back included.
      expect(windControls({ ...MAP, locked: true, culprits: ["windWidth"] }, true).pad).toBe(false);
    });

    test("gives way to the Mesure", () => {
      expect(windControls({ ...MAP, measuring: true }, true).pad).toBe(false);
    });

    test("stays over a withheld Vent: its handle stands on the percents the Scenario holds", () => {
      for (const culprits of [["windWidth"], ["windAttenuation"], ["windSpeed"]] as const) {
        expect(windControls({ ...MAP, culprits }, true).pad).toBe(true);
      }
    });
  });

  describe("the profile's readings", () => {
    test("are not shown before the physics reads the profile, on any map", () => {
      for (const locked of BOTH) {
        for (const measuring of BOTH) {
          expect(windControls({ ...MAP, locked, measuring }, false).preview).toBe(false);
        }
      }
    });

    test("once it does, are read out on every map of a placed line — the read-only ones too", () => {
      expect(windControls(MAP, true).preview).toBe(true);
      expect(windControls({ ...MAP, locked: true }, true).preview).toBe(true);
      expect(windControls({ ...MAP, measuring: true }, true).preview).toBe(true);
      expect(windControls({ ...MAP, placed: false }, true).preview).toBe(false);
    });

    test.each([[["windWidth"]], [["windAttenuation"]], [["windSpeed"]]] as const)(
      "a Vent withheld for %j is not read out as though applied",
      (culprits) => {
        expect(windControls({ ...MAP, culprits }, true).preview).toBe(false);
        expect(windControls({ ...MAP, culprits, locked: true }, true).preview).toBe(false);
      },
    );
  });
});

describe("the profile's handle and its two fields write one profile (#120)", () => {
  const start = appReducer(initialAppState({ query: "", session: null }), {
    type: "scénario/modifié",
    patch: { positions: TRIAL_ENDS, wind: { ...CALM, speedKmh: 30, directionDeg: 264 } },
  });

  test("a handle dropped a quarter across and three quarters up is 30 % and 75 % in the fields and the link", () => {
    const wind = windFromProfileOffset(
      { x: PROFILE_PAD_PX.width / 4, y: PROFILE_PAD_PX.height / 4 },
      start.scenario.wind,
    );
    const { scenario } = appReducer(start, { type: "scénario/modifié", patch: { wind } });
    expect(railValues(scenario)).toMatchObject({
      windSpeed: "30",
      windDirection: "264",
      windWidth: "30",
      windAttenuation: "75",
    });
    expect(scenarioToSearch({ ...FIRST_RUN_SCENARIO, wind: scenario.wind })).toMatchObject({
      ws: 30,
      wd: 264,
      ww: 30,
      wa: 75,
    });
  });

  test("a percent typed in its field moves the handle along its own axis alone", () => {
    const before = profileHandleOffset(start.scenario.wind);
    const wider = applyField(start.scenario, "windWidth", 70, null);
    expect(profileHandleOffset(wider.wind)).toEqual({
      x: (PROFILE_PAD_PX.width * 3) / 4,
      y: before.y,
    });
    const sheltered = applyField(start.scenario, "windAttenuation", 50, null);
    expect(profileHandleOffset(sheltered.wind)).toEqual({
      x: before.x,
      y: PROFILE_PAD_PX.height / 2,
    });
    // And the typed percent leaves the rest of the Vent.
    expect(wider.wind).toEqual({ ...start.scenario.wind, widthPct: 70 });
    expect(sheltered.wind).toEqual({ ...start.scenario.wind, attenuationPct: 50 });
  });
});
