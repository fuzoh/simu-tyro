import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Ride } from "@/lib/sim";
import type { Trace } from "@/lib/terrain/trace.ts";

import { kmhToMs, ride, ridePath, windComponents } from "@/lib/sim";

import type { RiderSweep } from "./traverse.ts";
import type { ScenarioDraft } from "./types.ts";
import type { UnloadedLine } from "./unloaded.ts";

import { readDynamics, rideWindOf } from "./dynamics.ts";
import { FIRST_RUN_RETAINED_TEXTILE, firstRunDefaults } from "./first-run.ts";
import { sweepRider, sweepRiderOf } from "./traverse.ts";
import { deriveUnloaded, unloadedInputs } from "./unloaded.ts";

/**
 * The passager's two rides over the shipped line (#89): the calm one, the windy one, and what
 * qualifies both. The ride's own physics — Z8, energy, the band of the Point d'arrêt, the wind's
 * signs — is `src/lib/sim/dynamics.test.ts`'s; this file holds what the Scenario adds.
 */

/** Whether the chain at zero wind — the ride « sans vent »'s re-pose — is made to fail. */
const inject = vi.hoisted(() => ({ calmFails: false }));

vi.mock("./unloaded.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("./unloaded.ts")>();
  return {
    ...real,
    // `readDynamics` re-poses the line in still air through `unloadedOn`, and only there.
    unloadedOn: (...args: Parameters<typeof real.unloadedOn>) =>
      inject.calmFails && args[1].wind.speedKmh === 0
        ? ({ ok: false, stage: "L0", error: null, span: args[0] } as const)
        : real.unloadedOn(...args),
  };
});

beforeEach(() => {
  inject.calmFails = false;
});

const SHIPPED = firstRunDefaults() as ScenarioDraft;

/** The shipped line on an HMPE corde, the parameter-test rope of `rail/values.test.ts`. */
const CORDE: ScenarioDraft = {
  ...SHIPPED,
  material: { family: "textile", ropeClass: "hmpe", MBL: 1e5, mu: 0.1, k: 22 },
  terminations: FIRST_RUN_RETAINED_TEXTILE.terminations,
};

function solved(scenario: ScenarioDraft): { unloaded: UnloadedLine; rider: RiderSweep } {
  const unloaded = deriveUnloaded(unloadedInputs(scenario, null));
  if (!unloaded.ok) throw new Error(`the line does not solve: ${unloaded.stage}`);
  const rider = sweepRider(unloaded, sweepRiderOf(scenario));
  if (rider === null) throw new Error("the traverse does not solve");
  return { unloaded, rider };
}

/** The four bearings a test turns the line to, as the Positions that give them exactly. */
type Bearing = 0 | 90 | 180 | 270;

/**
 * The anchors' Positions for a line running at `bearing` — due north unless a test says otherwise,
 * so the Vent's azimuth is its angle from head-on: 0 a head wind, 90 from the right, 180 a tail
 * wind. The Positions give the Vent its bearing (`lineBearing`) and change nothing else: the span
 * is the manual geometry's. `null` is no Positions, hence no bearing.
 */
function positionsFor(bearing: Bearing | null): ScenarioDraft["positions"] {
  if (bearing === null) return { A: null, B: null };
  const A = { lat: 46.8, lon: 7.4 };
  const step = { 0: [0.01, 0], 90: [0, 0.01], 180: [-0.01, 0], 270: [0, -0.01] }[bearing];
  return { A, B: { lat: A.lat + step[0], lon: A.lon + step[1] } };
}

function reading(scenario: ScenarioDraft, profile: Trace | null = null) {
  const { unloaded, rider } = solved(scenario);
  const read = readDynamics(scenario, unloaded, rider, profile);
  if (read === null) throw new Error("a complete traverse has a ride");
  const { calm } = read;
  if (calm === null) throw new Error("the line has a ride at zero wind");
  return { ...read, calm };
}

function windy(directionDeg: number, bearing: Bearing | null = 0) {
  return reading({
    ...SHIPPED,
    positions: positionsFor(bearing),
    wind: { ...SHIPPED.wind, speedKmh: 50, directionDeg },
  });
}

function lowest(one: Ride): number {
  return Math.min(...one.samples.map(({ z }) => z));
}

/** A profil standing level at `altitude`, m — the shape is irrelevant to `ρ`, only its height. */
function levelProfile(altitude: number): Trace {
  return {
    d: Float64Array.from([0, 75, 150]),
    z: Float64Array.from([altitude, altitude, altitude]),
    dev: null,
    origin: { kind: "lien" },
  };
}

describe("`readDynamics` — what every dynamic output carries", () => {
  const shipped = reading(SHIPPED);

  test("is flagged as an estimation", () => {
    expect(shipped.estimate).toBe(true);
  });

  test("the shipped câble rides on the Unconfirmed steel `μ`, and says so", () => {
    expect(shipped.warnings).toContain("steel-trolley-unconfirmed");
  });

  test("an applied Vent is not windless, a crosswind included; no speed or no bearing is (§19.15)", () => {
    expect(shipped.windless).toBe(true);
    expect(windy(0).windless).toBe(false);
    // Under §19 a crosswind moves the line sideways and enters the ride on the locus: the old
    // « no along-line wind hence calm » shortcut is gone.
    expect(windy(90).windless).toBe(false);
    expect(windy(0, null).windless).toBe(true);
  });

  test("a corde rides on the SSF trolley, which carries no such warning", () => {
    expect(reading(CORDE).warnings).not.toContain("steel-trolley-unconfirmed");
  });

  test("each family rides on its own trolley constants and ignores the other's", () => {
    const tweak = (scenario: ScenarioDraft, patch: Partial<ScenarioDraft["dynamics"]>) =>
      reading({ ...scenario, dynamics: { ...scenario.dynamics, ...patch } }).calm;
    expect(tweak(SHIPPED, { mu: 0.03 })).not.toEqual(reading(SHIPPED).calm);
    expect(tweak(SHIPPED, { F0: 30, kv: 3 })).toEqual(reading(SHIPPED).calm);
    expect(tweak(CORDE, { F0: 30 })).not.toEqual(reading(CORDE).calm);
    expect(tweak(CORDE, { kv: 3 })).not.toEqual(reading(CORDE).calm);
    expect(tweak(CORDE, { mu: 0.03 })).toEqual(reading(CORDE).calm);
  });

  test("an incomplete traverse has no ride: a slope nobody solved is not ridden (Q24)", () => {
    const { unloaded, rider } = solved(SHIPPED);
    const slots = rider.spatial.slots.map((slot, i) => (i === 100 ? null : slot));
    const holed = { spatial: { ...rider.spatial, slots, coverage: 259 / 260 } };
    expect(readDynamics(SHIPPED, unloaded, holed, null)).toBeNull();
  });
});

describe("the windy ride — on the locus the Vent poses (§19.15)", () => {
  const calm = reading(SHIPPED);

  test("without wind, the windy ride is the calm one", () => {
    expect(calm.windy).toBe(calm.calm);
  });

  test("a pure crosswind moves the ride sideways, and from the other side it is its mirror", () => {
    const right = windy(90);
    const left = windy(270);
    expect(right.windy).not.toEqual(calm.calm);
    // §19.17 control 6: `u_y → −u_y` mirrors the line, so the locus and the ride: `y → −y`, the
    // same `x`, `z` and speed — `v_rel,t` reads `u_y·t_y`, whose sign the mirror leaves alone.
    const [a, b] = [right.windy.samples, left.windy.samples];
    expect(a.length).toBe(b.length);
    const lateral = Math.max(...a.map(({ y }) => Math.abs(y ?? 0)));
    expect(lateral).toBeGreaterThan(0.1);
    for (let i = 0; i < a.length; i += 17) {
      expect(a[i].x).toBeCloseTo(b[i].x, 6);
      expect(a[i].z).toBeCloseTo(b[i].z, 6);
      expect(a[i].v).toBeCloseTo(b[i].v, 6);
      expect(a[i].y ?? 0).toBeCloseTo(-(b[i].y ?? 0), 6);
    }
  });

  test("a head wind stops the passager on the line the calm ride crosses whole", () => {
    expect(calm.calm.end.kind).toBe("arrival");
    expect(windy(0).windy.end.kind).toBe("stop");
  });

  test("a tail wind brings the passager in faster", () => {
    const { calm: still, windy: pushed } = windy(180);
    if (still.end.kind !== "arrival" || pushed.end.kind !== "arrival") {
      throw new Error("both rides reach B");
    }
    expect(pushed.end.v).toBeGreaterThan(still.end.v);
  });

  test("when the Scenario at zero wind has no ride, the ride under the Vent stands (Q24)", () => {
    const scenario = {
      ...SHIPPED,
      positions: positionsFor(0),
      wind: { ...SHIPPED.wind, speedKmh: 50, directionDeg: 90 },
    };
    const { unloaded, rider } = solved(scenario);
    const whole = readDynamics(scenario, unloaded, rider, null);
    inject.calmFails = true;
    const partial = readDynamics(scenario, unloaded, rider, null);
    if (whole === null || partial === null) throw new Error("the windy traverse is complete");
    expect(partial.calm).toBeNull();
    expect(partial.windless).toBe(false);
    // The ride under the Vent owes the comparison nothing.
    expect(partial.windy).toEqual(whole.windy);
  });

  test("the ride « sans vent » is the Scenario at zero wind, whatever the Vent (§19.15)", () => {
    // The whole chain re-run in still air — pose, sweep, ride — not the windy locus ridden calm.
    expect(windy(0).calm).toEqual(calm.calm);
    expect(windy(90).calm).toEqual(calm.calm);
  });
});

/**
 * The Vent's profile (#141): the ride reads the field at the passager's own `x`, never the mid-span
 * speed for the whole line. §8.4 by hand: `V(1 − a)` at either anchor, `V` at mid-span — projected
 * by the uniform reader `windComponents`, which knows nothing of the profile.
 */
describe("the windy ride reads the Vent's profile where the passager is (#141)", () => {
  const V = kmhToMs(50);
  const profiled = (attenuationPct: number): UnloadedLine => {
    const { unloaded } = solved({
      ...SHIPPED,
      positions: positionsFor(90),
      wind: { speedKmh: 50, directionDeg: 30, widthPct: 30, attenuationPct },
    });
    return unloaded;
  };

  test("at the anchors it is the attenuated speed, at mid-span the Vent's", () => {
    const line = profiled(40);
    const wind = rideWindOf(line);
    if (wind === null) throw new Error("the Vent is applied");
    const { L } = line.span;
    for (const [x, speed] of [
      [0, V * 0.6],
      [L, V * 0.6],
      [L / 2, V],
    ] as const) {
      const { along, across } = windComponents(speed, 30, 90);
      expect(wind(x).ux).toBeCloseTo(along, 12);
      expect(wind(x).uy).toBeCloseTo(across, 12);
    }
    // Between, softer than mid-span and harder than the anchors, on the same direction.
    const quarter = wind(L / 4);
    const norm = Math.hypot(quarter.ux, quarter.uy);
    expect(norm).toBeGreaterThan(V * 0.6);
    expect(norm).toBeLessThan(V);
    expect(quarter.uy / quarter.ux).toBeCloseTo(
      windComponents(1, 30, 90).across / windComponents(1, 30, 90).along,
      12,
    );
  });

  test("a sample a few ulps past B reads B's wind, not a wind from nowhere", () => {
    const line = profiled(40);
    const wind = rideWindOf(line);
    if (wind === null) throw new Error("the Vent is applied");
    const { L } = line.span;
    expect(wind(L * (1 + Number.EPSILON))).toEqual(wind(L));
    expect(wind(-Number.MIN_VALUE)).toEqual(wind(0));
  });

  test("an attenuation of 0 % reads the uniform wind everywhere", () => {
    const line = profiled(0);
    const wind = rideWindOf(line);
    if (wind === null) throw new Error("the Vent is applied");
    const { along, across } = windComponents(V, 30, 90);
    for (const x of [0, line.span.L / 3, line.span.L]) {
      expect(wind(x)).toEqual({ ux: along, uy: across });
    }
  });
});

/**
 * The Vent's direction is geographic: the line's bearing, read off the Positions, turns it into a
 * head, tail or cross wind. Moving an anchor turns the line under the same Vent.
 */
describe("the windy ride — the Vent on the line's bearing", () => {
  const calm = reading(SHIPPED);

  test("the same north wind is a head wind on a line running north, a tail wind on one running south", () => {
    expect(windy(0, 0).windy.end.kind).toBe("stop");
    const south = windy(0, 180);
    if (south.windy.end.kind !== "arrival" || calm.calm.end.kind !== "arrival") {
      throw new Error("both rides reach B");
    }
    expect(south.windy.end.v).toBeGreaterThan(calm.calm.end.v);
  });

  test("turning the line and the wind by the same angle rides the same", () => {
    // A west wind on a line running west is the north wind on a line running north: head-on.
    const turned = windy(270, 270).windy;
    const north = windy(0, 0).windy;
    expect(turned.end.kind).toBe(north.end.kind);
    expect(turned.samples.length).toBe(north.samples.length);
    const last = turned.samples.length - 1;
    expect(turned.samples[last].x).toBeCloseTo(north.samples[last].x, 6);
  });

  test("without a bearing — no Positions — the Vent is not applied: the windy ride is the calm one", () => {
    const unplaced = windy(0, null);
    expect(unplaced.windy).toBe(unplaced.calm);
    expect(unplaced.windless).toBe(true);
    expect(unplaced.calm).toEqual(calm.calm);
  });
});

describe("two Brins porteurs — one member's trajectory under P/2, the whole passager on it", () => {
  const one = solved(SHIPPED);
  const twoLines = { ...SHIPPED, carryingLines: 2 } as const;
  const two = solved(twoLines);
  const read = reading(twoLines);

  test("the ride follows the member under P/2, which hangs higher than one line under P", () => {
    const memberLow = Math.min(...two.rider.traverse.steps.map(({ zD }) => zD));
    expect(lowest(read.calm)).toBe(memberLow);
    expect(lowest(read.calm)).toBeGreaterThan(lowest(reading(SHIPPED).calm));
    expect(one.rider.P).toBe(2 * two.rider.P);
  });

  test("the mass that rides it is the whole passager", () => {
    const whole = ride({
      path: ridePath(two.rider.traverse.steps, two.unloaded.span),
      m: SHIPPED.rider.mp,
      CdA: SHIPPED.dynamics.CdA,
      rho: read.rho.value,
      trolley: { law: "coulomb", mu: SHIPPED.dynamics.mu },
      wind: null,
    });
    expect(read.calm).toEqual(whole);
  });
});

describe("`ρ` — read and editable", () => {
  test("a manual line has no altitude: §12.2's sea-level 1,225", () => {
    expect(reading(SHIPPED).rho).toEqual({ value: 1.225, source: "sea-level" });
  });

  test("an imported profil gives the ISA density at its mean altitude — 1,06 at 1 500 m", () => {
    const { rho } = reading(SHIPPED, levelProfile(1500));
    expect(rho.source).toBe("profile");
    expect(rho.value).toBeCloseTo(1.06, 2);
  });

  test("a typed `ρ` wins over the profil", () => {
    const typed = { ...SHIPPED, dynamics: { ...SHIPPED.dynamics, rho: 1.1 } };
    expect(reading(typed, levelProfile(1500)).rho).toEqual({ value: 1.1, source: "typed" });
  });

  test("thinner air drags less, so the passager arrives faster", () => {
    const low = reading(SHIPPED).calm.end;
    const high = reading(SHIPPED, levelProfile(1500)).calm.end;
    if (low.kind !== "arrival" || high.kind !== "arrival") throw new Error("both rides reach B");
    expect(high.v).toBeGreaterThan(low.v);
  });
});

/**
 * §12.1: the frozen trajectory holds while `v/c ≤ 0,2`, `c = √(T/μ)`. The shipped câble arrives at
 * ≈ 0,19 — under; a 50 km/h tail wind carries it past.
 */
describe("the quasi-static check — over both rides", () => {
  test("the shipped line stays under 0,2, with no warning", () => {
    const { quasiStatic, warnings } = reading(SHIPPED);
    expect(quasiStatic.ratio).toBeLessThanOrEqual(0.2);
    expect(quasiStatic.exceeded).toBe(false);
    expect(warnings).not.toContain("quasi-static");
  });

  test("a tail wind pushes the windy ride past 0,2, and the check reads it there", () => {
    const { quasiStatic, warnings } = windy(180);
    expect(quasiStatic.ratio).toBeGreaterThan(0.2);
    expect(quasiStatic.exceeded).toBe(true);
    expect(warnings).toContain("quasi-static");
  });
});
