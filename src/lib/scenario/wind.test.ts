import { describe, expect, test } from "vitest";

import { kmhToMs, windAt, windComponents } from "@/lib/sim";

import type { Wind } from "./types.ts";

import {
  isWindUniform,
  uniformWind,
  WIND_PROFILE_ACTIVE,
  windFieldOf,
  windProfileOf,
} from "./wind.ts";

/**
 * The Vent's profile as the Scenario holds it (#120): the reading of its two percents, the uniform
 * wind, the field a spatial reader takes, and the activation's boundary.
 *
 * The expected values are §8.4's by hand — a speed at the anchors is `V·(1 − a/100)`, a speed at
 * mid-span is `V` — or the uniform reader's own (`windComponents`), which this module does not
 * touch: nothing here is read back from `wind.ts`.
 */

/** 36 km/h is 10 m/s: a speed whose SI value is a whole number. */
const WIND: Wind = { speedKmh: 36, directionDeg: 264, widthPct: 30, attenuationPct: 40 };

describe("the activation's boundary", () => {
  test("the profile is not consumed by the physics yet: its activation is off", () => {
    // Turning it on is the coordinated activation of #120 / #127 / #118, and nothing less: every
    // reader of the Vent must take `windAt` first. This lock is the reminder.
    expect(WIND_PROFILE_ACTIVE).toBe(false);
  });
});

describe("windProfileOf — the profile is read at the whole percent it prints as", () => {
  test.each([
    { held: { widthPct: 50, attenuationPct: 0 }, read: { width: 50, attenuation: 0 } },
    { held: { widthPct: 50.4, attenuationPct: 39.6 }, read: { width: 50, attenuation: 40 } },
    // Half a percent rounds away from zero, as every field of the app does.
    { held: { widthPct: 50.5, attenuationPct: 0.5 }, read: { width: 51, attenuation: 1 } },
    { held: { widthPct: 9.5, attenuationPct: 100.4 }, read: { width: 10, attenuation: 100 } },
  ])("$held is read $read", ({ held, read }) => {
    expect(windProfileOf(held)).toEqual(read);
  });

  test("a percent outside its domain is read as it is, never brought back into it", () => {
    expect(windProfileOf({ widthPct: 95, attenuationPct: 110 })).toEqual({
      width: 95,
      attenuation: 110,
    });
    expect(windProfileOf({ widthPct: 9.4, attenuationPct: -3.2 })).toEqual({
      width: 9,
      attenuation: -3,
    });
  });

  test("what the Scenario holds is left as given", () => {
    const held = { widthPct: 50.4, attenuationPct: 39.6 };
    windProfileOf(held);
    expect(held).toEqual({ widthPct: 50.4, attenuationPct: 39.6 });
  });
});

describe("isWindUniform — no attenuation, whatever the width", () => {
  test.each([
    { widthPct: 50, attenuationPct: 0 },
    { widthPct: 25, attenuationPct: 0 },
    { widthPct: 90, attenuationPct: 0 },
    // Below half a percent the attenuation prints « 0 % », and that is what is read.
    { widthPct: 50, attenuationPct: 0.4 },
    // A width outside its domain is refused by the Wind Gate; it does not make the wind vary.
    { widthPct: 95, attenuationPct: 0 },
  ])("$widthPct % wide, $attenuationPct % attenuated: uniform", (profile) => {
    expect(isWindUniform(profile)).toBe(true);
  });

  test.each([
    { widthPct: 50, attenuationPct: 0.5 },
    { widthPct: 50, attenuationPct: 1 },
    { widthPct: 30, attenuationPct: 40 },
    { widthPct: 50, attenuationPct: 100 },
    { widthPct: 50, attenuationPct: 110 },
    { widthPct: 50, attenuationPct: -3 },
  ])("$widthPct % wide, $attenuationPct % attenuated: not uniform", (profile) => {
    expect(isWindUniform(profile)).toBe(false);
  });
});

describe("uniformWind — « Vent uniforme » writes the attenuation alone", () => {
  test("the speed, the direction and the width are kept", () => {
    expect(uniformWind(WIND)).toEqual({
      speedKmh: 36,
      directionDeg: 264,
      widthPct: 30,
      attenuationPct: 0,
    });
  });

  test("it is not « no wind »: the speed is not the field it writes", () => {
    expect(uniformWind(WIND).speedKmh).toBe(36);
  });

  test("the Vent it is given is not written to", () => {
    uniformWind(WIND);
    expect(WIND.attenuationPct).toBe(40);
  });

  test("an already uniform wind comes back equal, a width out of its domain included", () => {
    const wind: Wind = { speedKmh: 0, directionDeg: 0, widthPct: 95, attenuationPct: 0 };
    expect(uniformWind(wind)).toEqual(wind);
  });
});

describe("windFieldOf — the Vent as the field a spatial reader takes", () => {
  test("the speed at mid-span in m/s, the direction, and the profile as it is read", () => {
    const field = windFieldOf({ ...WIND, widthPct: 29.6, attenuationPct: 40.4 });
    expect(field.speed).toBeCloseTo(10, 12);
    expect(field.from).toBe(264);
    expect(field.profile).toEqual({ width: 30, attenuation: 40 });
  });

  test("the entered speed is left on its own grain: only the profile is rounded", () => {
    expect(windFieldOf({ ...WIND, speedKmh: 12.6 }).speed).toBeCloseTo(3.5, 12);
  });

  test.each([0, 37.5, 75, 112.5, 150])(
    "a uniform Vent reads, at x = %s m, exactly what the one-speed reader reads",
    (x) => {
      const field = windFieldOf({ ...WIND, attenuationPct: 0 });
      // Bit for bit, not within a tolerance: uniform is today's wind and no approximation of it.
      expect(windAt(field, x, 150, 310)).toEqual(windComponents(kmhToMs(36), 264, 310));
    },
  );

  test("a uniform Vent reads the same whatever width it keeps", () => {
    const narrow = windFieldOf({ ...WIND, widthPct: 10, attenuationPct: 0 });
    const wide = windFieldOf({ ...WIND, widthPct: 90, attenuationPct: 0 });
    expect(windAt(narrow, 20, 150, 310)).toEqual(windAt(wide, 20, 150, 310));
  });

  test("an attenuated Vent is read locally: full at mid-span, attenuated at both anchors", () => {
    // A wind from 264° on a line that bears 264° blows from B's side straight down the line: it
    // has no component across, and its component along is the local speed, against the travel.
    const field = windFieldOf(WIND);
    const at = (x: number) => windAt(field, x, 150, 264);
    expect(at(75).along).toBeCloseTo(-10, 12);
    // 40 % below 10 m/s.
    expect(at(0).along).toBeCloseTo(-6, 12);
    expect(at(150).along).toBeCloseTo(-6, 12);
    // Halfway between the two, at the ends of the 30 % width: 75 m ± 22,5 m.
    expect(at(52.5).along).toBeCloseTo(-8, 9);
    expect(at(97.5).along).toBeCloseTo(-8, 9);
    for (const x of [0, 52.5, 75, 97.5, 150]) expect(at(x).across).toBe(0);
  });

  test("neither a mean speed nor one speed for the span: three points, three readings", () => {
    const field = windFieldOf(WIND);
    const along = [10, 60, 75].map((x) => windAt(field, x, 150, 264).along);
    expect(new Set(along).size).toBe(3);
    // Monotone toward mid-span: against the travel, so more negative as the wind strengthens.
    expect(along[0]).toBeGreaterThan(along[1] ?? Number.NaN);
    expect(along[1]).toBeGreaterThan(along[2] ?? Number.NaN);
  });
});
