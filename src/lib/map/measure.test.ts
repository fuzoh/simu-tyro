/**
 * The Mesure (#98), with no network in the room. The trial line is the ticket's reference: its
 * A–B is ≈ 435 m, and its recorded profil geo.admin (`replayTrial`) drops 15 m over 200 points.
 */

import { describe, expect, test } from "vitest";

import type { Fetch } from "@/lib/terrain/geoadmin.ts";
import type { Trace } from "@/lib/terrain/trace.ts";

import {
  replayTrial,
  TRIAL_ENDS,
  TRIAL_EXCHANGES,
} from "@/lib/terrain/__fixtures__/geoadmin-2026-11-08.ts";
import { loadGeoadminProfile } from "@/lib/terrain/geoadmin.ts";

import {
  altitudeOnProfile,
  clickMeasure,
  crossLines,
  directDistance,
  groundDistance,
  horizontalDistance,
  loadMeasureProfile,
  measureAim,
  ON_PROFILE_TOLERANCE_M,
  profileFor,
  readMeasure,
} from "./measure.ts";

const { A, B } = TRIAL_ENDS;

const offline: Fetch = async () => {
  throw new TypeError("Failed to fetch");
};

/** The trial line's profil, as the Scenario holds it in memory. */
async function trialTrace(): Promise<Trace> {
  const outcome = await loadGeoadminProfile(TRIAL_ENDS, replayTrial());
  if (!outcome.ok) throw new Error("the trial line must load");
  return outcome.trace;
}

describe("the clicks", () => {
  test("the first two set the points, a third starts over with itself", () => {
    const first = clickMeasure([], A);
    expect(first).toEqual([A]);
    const second = clickMeasure(first, B);
    expect(second).toEqual([A, B]);
    expect(clickMeasure(second, { lat: 46.85, lon: 6.5 })).toEqual([{ lat: 46.85, lon: 6.5 }]);
  });
});

describe("the pixel of the aperçu (#107)", () => {
  const at = [120, 80] as const;

  test("a mouse or a pen over the canvas draws it at its pixel", () => {
    expect(measureAim({ kind: "mouse", onCanvas: true, at })).toEqual([120, 80]);
    expect(measureAim({ kind: "pen", onCanvas: true, at })).toEqual([120, 80]);
  });

  test("over the zoom buttons, where a click places no point, there is none", () => {
    expect(measureAim({ kind: "mouse", onCanvas: false, at })).toBeNull();
    expect(measureAim({ kind: "pen", onCanvas: false, at })).toBeNull();
  });

  test("a finger never has one, even over the canvas", () => {
    expect(measureAim({ kind: "touch", onCanvas: true, at })).toBeNull();
  });
});

describe("the horizontal distance, by geodesy", () => {
  test("A–B of the verified line is 435 m within a metre", () => {
    expect(Math.abs(horizontalDistance(A, B) - 435)).toBeLessThanOrEqual(1);
  });

  test("is symmetric, and nil between a point and itself", () => {
    expect(horizontalDistance(A, B)).toBeCloseTo(horizontalDistance(B, A), 6);
    expect(horizontalDistance(A, A)).toBe(0);
  });

  test("one degree of latitude is about 111 km", () => {
    const km = horizontalDistance({ lat: 46, lon: 7 }, { lat: 47, lon: 7 }) / 1000;
    expect(km).toBeGreaterThan(110.9);
    expect(km).toBeLessThan(111.4);
  });
});

describe("the direct distance", () => {
  test("is the hypotenuse of the horizontal distance and the altitude difference", () => {
    expect(directDistance(300, -400)).toBe(500);
    expect(directDistance(435, 0)).toBe(435);
  });
});

describe("the ground distance", () => {
  test("is the sum of the profil's segments, each along the slope", () => {
    const profile = { d: Float64Array.of(0, 3, 6), z: Float64Array.of(0, 4, 4) };
    expect(groundDistance(profile)).toBe(5 + 3);
  });

  test("of the recorded trial profil is at least its horizontal extent and at most 15 m more", async () => {
    const body: { dist: number; alts: { COMB: number } }[] = JSON.parse(TRIAL_EXCHANGES[2].body);
    let expected = 0;
    for (let i = 1; i < body.length; i++) {
      expected += Math.hypot(
        body[i].dist - body[i - 1].dist,
        body[i].alts.COMB - body[i - 1].alts.COMB,
      );
    }
    const profile = await loadMeasureProfile(A, B, replayTrial());
    if (!profile.ok) throw new Error("the trial profil must load");
    expect(profile.groundM).toBeCloseTo(expected, 6);
    expect(profile.groundM).toBeGreaterThanOrEqual(435.2);
    expect(profile.dz).toBeCloseTo(1438.7 - 1453.7, 6);
  });
});

describe("a Mesure between the trial's two points, online", () => {
  test("reports the three distances from the recorded profil", async () => {
    const profile = await loadMeasureProfile(A, B, replayTrial());
    const reading = readMeasure(A, B, profile, null);
    if (reading.status !== "online") throw new Error("the profil came: it must read online");
    expect(Math.abs(reading.horizontalM - 435)).toBeLessThanOrEqual(1);
    expect(reading.dz).toBeCloseTo(-15, 6);
    expect(reading.directM).toBeCloseTo(Math.hypot(reading.horizontalM, 15), 6);
    expect(reading.groundM).toBeGreaterThan(reading.horizontalM);
  });

  test("is horizontal only while the profil is on its way", () => {
    expect(readMeasure(A, B, null, null)).toEqual({
      status: "loading",
      horizontalM: horizontalDistance(A, B),
    });
  });
});

describe("a Mesure offline", () => {
  test("is the horizontal distance and no blocking error", async () => {
    const profile = await loadMeasureProfile(A, B, offline);
    expect(profile).toEqual({ ok: false, failure: "indisponible" });
    const reading = readMeasure(A, B, profile, null);
    expect(reading).toEqual({
      status: "offline",
      horizontalM: horizontalDistance(A, B),
      failure: "indisponible",
      dz: null,
      directM: null,
    });
    expect(reading).not.toHaveProperty("groundM");
  });

  test("takes the direct distance from the profil in memory when both points stand on it", async () => {
    const memory = await trialTrace();
    const reading = readMeasure(A, B, { ok: false, failure: "indisponible" }, memory);
    if (reading.status !== "offline") throw new Error("must read offline");
    expect(reading.dz).toBeCloseTo(-15, 6);
    expect(reading.directM).toBeCloseTo(Math.hypot(reading.horizontalM, 15), 6);
  });

  test("leaves the direct distance unavailable when one point is off the profil", async () => {
    const memory = await trialTrace();
    const aside = { lat: A.lat + 0.001, lon: A.lon };
    const reading = readMeasure(A, aside, { ok: false, failure: "indisponible" }, memory);
    if (reading.status !== "offline") throw new Error("must read offline");
    expect(reading.directM).toBeNull();
    expect(reading.dz).toBeNull();
  });

  test("a profil in memory without coordinates stands nowhere", async () => {
    const { ends: _ends, ...bare } = await trialTrace();
    expect(altitudeOnProfile(bare, A)).toBeNull();
  });
});

describe("the altitude on the profil in memory", () => {
  test("is the profil's own at its two ends and interpolated between", async () => {
    const memory = await trialTrace();
    expect(altitudeOnProfile(memory, A)).toBeCloseTo(1453.7, 6);
    expect(altitudeOnProfile(memory, B)).toBeCloseTo(1438.7, 6);
    const middle = { lat: (A.lat + B.lat) / 2, lon: (A.lon + B.lon) / 2 };
    // Halfway along, between the two samples that straddle the middle of the profil.
    const half = (memory.d[0] + memory.d.at(-1)!) / 2;
    const after = memory.d.findIndex((d) => d >= half);
    const [lo, hi] = [memory.z[after - 1], memory.z[after]].sort((x, y) => x - y);
    const z = altitudeOnProfile(memory, middle)!;
    expect(z).toBeGreaterThanOrEqual(lo - 1e-6);
    expect(z).toBeLessThanOrEqual(hi + 1e-6);
  });

  test("is null beyond the ends and off to the side", async () => {
    const memory = await trialTrace();
    const along = { lat: B.lat + (B.lat - A.lat) * 0.1, lon: B.lon + (B.lon - A.lon) * 0.1 };
    const side = { lat: A.lat + 0.0005, lon: A.lon };
    expect(altitudeOnProfile(memory, along)).toBeNull();
    expect(altitudeOnProfile(memory, side)).toBeNull();
  });
});

describe("the profil kept for the points it was loaded between", () => {
  const loaded = {
    points: [A, B],
    profile: { ok: true, dz: -15, groundM: 440 },
  } as const;

  test("answers for the same two points", () => {
    expect(profileFor([A, B], loaded)).toBe(loaded.profile);
    expect(profileFor([{ ...A }, { ...B }], loaded)).toBe(loaded.profile);
  });

  test("a third click starts over: the old profil answers for nothing", () => {
    const third = clickMeasure([A, B], { lat: 46.85, lon: 6.5 });
    expect(profileFor(third, loaded)).toBeNull();
    // Even once the new second point is in, the old pair's profil is not its own.
    expect(profileFor(clickMeasure(third, A), loaded)).toBeNull();
  });

  test("answers for nothing with fewer than two points or nothing loaded", () => {
    expect(profileFor([A], loaded)).toBeNull();
    expect(profileFor([], loaded)).toBeNull();
    expect(profileFor([A, B], null)).toBeNull();
  });
});

describe("the dotted crosses", () => {
  test("run north-south and east-west through the point", () => {
    const [northSouth, eastWest] = crossLines(A);
    expect(northSouth.map(([lon]) => lon)).toEqual([A.lon, A.lon]);
    expect(northSouth[0][1]).toBeLessThan(A.lat);
    expect(northSouth[1][1]).toBeGreaterThan(A.lat);
    expect(eastWest.map(([, lat]) => lat)).toEqual([A.lat, A.lat]);
  });

  test("stop where Web Mercator does, near the poles", () => {
    const [northSouth] = crossLines({ lat: 84, lon: 10 });
    expect(northSouth[1][1]).toBe(85);
    expect(crossLines({ lat: -84, lon: 10 })[0][0][1]).toBe(-85);
  });
});

describe("how far from the profil is still on it", () => {
  test("just inside the tolerance is on it, just outside is not", async () => {
    const memory = await trialTrace();
    const middle = { lat: (A.lat + B.lat) / 2, lon: (A.lon + B.lon) / 2 };
    // Metres per degree here, good to a fraction of a metre over the few metres it is used for.
    const northM = 111_200;
    const eastM = 111_200 * Math.cos((middle.lat * Math.PI) / 180);
    const chord = { east: (B.lon - A.lon) * eastM, north: (B.lat - A.lat) * northM };
    const length = Math.hypot(chord.east, chord.north);
    // A point `metres` from the chord's middle, square to it.
    const aside = (metres: number) => ({
      lat: middle.lat + ((chord.east / length) * metres) / northM,
      lon: middle.lon - ((chord.north / length) * metres) / eastM,
    });
    expect(altitudeOnProfile(memory, aside(ON_PROFILE_TOLERANCE_M - 1))).not.toBeNull();
    expect(altitudeOnProfile(memory, aside(ON_PROFILE_TOLERANCE_M + 1))).toBeNull();
  });
});
