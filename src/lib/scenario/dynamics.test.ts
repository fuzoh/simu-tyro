import { describe, expect, test } from "vitest";

import type { Ride } from "@/lib/sim";
import type { Trace } from "@/lib/terrain/trace.ts";

import { ride, ridePath } from "@/lib/sim";

import type { RiderSweep } from "./traverse.ts";
import type { ScenarioDraft } from "./types.ts";
import type { UnloadedLine } from "./unloaded.ts";

import { readDynamics } from "./dynamics.ts";
import { FIRST_RUN_RETAINED_TEXTILE, firstRunDefaults } from "./first-run.ts";
import { sweepRider, sweepRiderOf } from "./traverse.ts";
import { deriveUnloaded, unloadedInputs } from "./unloaded.ts";

/**
 * The passager's two rides over the shipped line (#89): the calm one, the windy one, and what
 * qualifies both. The ride's own physics — Z8, energy, the band of the Point d'arrêt, the wind's
 * signs — is `src/lib/sim/dynamics.test.ts`'s; this file holds what the Scenario adds.
 */

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

function reading(scenario: ScenarioDraft, profile: Trace | null = null) {
  const { unloaded, rider } = solved(scenario);
  const read = readDynamics(scenario, unloaded, rider, profile);
  if (read === null) throw new Error("a complete traverse has a ride");
  return read;
}

function windy(directionDeg: number) {
  return reading({ ...SHIPPED, wind: { speedKmh: 50, directionDeg } });
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

  test("an incomplete traverse has no ride: a slope nobody solved is not ridden", () => {
    const { unloaded, rider } = solved(SHIPPED);
    const holed = { ...rider, traverse: { ...rider.traverse, coverage: 0.5 } };
    expect(readDynamics(SHIPPED, unloaded, holed, null)).toBeNull();
  });
});

describe("the windy ride — the Vent's component along the line", () => {
  const calm = reading(SHIPPED);

  test("without wind, the windy ride is the calm one", () => {
    expect(calm.windy).toBe(calm.calm);
  });

  test("a pure cross wind changes nothing, from either side", () => {
    expect(windy(90).windy).toEqual(calm.calm);
    expect(windy(270).windy).toEqual(calm.calm);
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

  test("the calm ride does not depend on the wind", () => {
    expect(windy(0).calm).toEqual(calm.calm);
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
      windAlong: 0,
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
