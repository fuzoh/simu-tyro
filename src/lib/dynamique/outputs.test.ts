import { describe, expect, test } from "vitest";

import type { Ride, RideSample } from "@/lib/sim";

import { formatAtX, formatQuantity } from "@/lib/format/quantity.ts";
import { WIND_UNPLACED } from "@/lib/rail/gates.ts";
import { msToKmh } from "@/lib/sim";

import { ridesUnder, SHIPPED } from "./__fixtures__/rides.ts";
import {
  ARRIVES_AT_END,
  COINCIDE_NOTE,
  CONSTANTS_NOTE,
  NEVER_SETTLES,
  NO_ARRIVAL,
  OUTPUT_LABEL,
  RIDE_LABEL,
  SWING_THEN,
  SWING_UNSETTLED,
} from "./copy.ts";
import { dynamiqueOutputs, firstPass } from "./outputs.ts";
import { dynamiqueScene } from "./scene.ts";

/**
 * The Page's view model against the engine's rides (#92): the Points d'arrêt it prints are the
 * `end.x` the engine returned, and a ride the engine lets reach B says « arrive au bout ».
 */
describe("the two Points d'arrêt are the engine's", () => {
  test("a head wind stops the ride with the wind, at the abscissa the engine returned", () => {
    const { reading, outputs } = ridesUnder(50, 0);
    const [calm, windy] = outputs.rides;
    expect(reading.windy.end.kind).toBe("stop");
    if (reading.windy.end.kind !== "stop") return;
    expect(windy.stopX).toBe(reading.windy.end.x);
    expect(windy.stop).toBe(formatAtX(reading.windy.end.x));
    expect(windy.stop).toMatch(/^à x \d/);
    expect(windy.arrival).toBeNull();
    expect(windy.noArrival).toBe(NO_ARRIVAL);
    // The calm ride crosses whole on this line: no Point d'arrêt, and it says so.
    expect(calm.stopX).toBeNull();
    expect(calm.stop).toBe(ARRIVES_AT_END);
  });

  test("a ride that arrives prints its vitesse d'arrivée in km/h and m/s, and its duration", () => {
    const { reading, outputs } = ridesUnder(0, 0);
    const [calm] = outputs.rides;
    if (reading.calm.end.kind !== "arrival") throw new Error("the shipped line arrives");
    const v = reading.calm.end.v;
    expect(calm.arrival?.ms).toBe(formatQuantity("speed", v));
    expect(calm.arrival?.kmh).toBe(formatQuantity("speedKmh", msToKmh(v)));
    expect(calm.duration).toBe(formatQuantity("duration", reading.calm.end.t));
    expect(calm.noArrival).toBeNull();
  });

  test("without a wind entered, the two rides coincide and so do their Points d'arrêt", () => {
    const { outputs } = ridesUnder(0, 0);
    const [calm, windy] = outputs.rides;
    expect(outputs.coincide).toBe(true);
    expect(windy).toEqual({ ...calm, id: "windy", label: windy.label });
  });

  test("a crosswind pushes nothing along the line: the rides coincide though a wind is entered", () => {
    expect(ridesUnder(30, 90).outputs.coincide).toBe(true);
  });

  test("with a wind entered the two Points d'arrêt differ", () => {
    const { outputs } = ridesUnder(50, 0);
    expect(outputs.coincide).toBe(false);
    expect(outputs.coincideNote).toBeNull();
    expect(outputs.rides[0].stopX).not.toBe(outputs.rides[1].stopX);
  });

  test("coinciding rides say why under them; a Vent that is not applied says it on its own ride", () => {
    const { reading } = ridesUnder(0, 0);
    expect(dynamiqueOutputs(reading, "steel").coincideNote).toBe(COINCIDE_NOTE);
    expect(dynamiqueOutputs(reading, "steel").rides.map((ride) => ride.notice)).toEqual([
      null,
      null,
    ]);
    // A Vent with no Positions: the rides are one, and « no wind pushes » is not the reason.
    const unplaced = dynamiqueOutputs(reading, "steel", WIND_UNPLACED.notice);
    expect(unplaced.coincide).toBe(true);
    expect(unplaced.coincideNote).toBeNull();
    expect(unplaced.rides.map((ride) => ride.notice)).toEqual([null, WIND_UNPLACED.notice]);
  });

  test("the same Vent on the same line, with no Positions, rides as no wind at all", () => {
    const placed = ridesUnder(50, 0);
    const unplaced = ridesUnder(50, 0, undefined, null, { A: null, B: null });
    expect(placed.outputs.coincide).toBe(false);
    expect(unplaced.reading.windy).toBe(unplaced.reading.calm);
    expect(unplaced.reading.calm).toEqual(placed.reading.calm);
  });
});

describe("what qualifies the rides", () => {
  test("the shipped câble names its unconfirmed friction law in the provenance line", () => {
    expect(ridesUnder(0, 0).outputs.constants).toBe(CONSTANTS_NOTE.steel);
  });

  test("a tail wind past §12.1's limit carries the quasi-static warning, and a calm line none", () => {
    expect(ridesUnder(50, 180).outputs.warnings).toHaveLength(1);
    expect(ridesUnder(0, 0).outputs.warnings).toEqual([]);
  });
});

describe("a ride that never settles", () => {
  // The engine's own swing that dies in no turn: built by hand, as no shipped line produces it.
  const base = ridesUnder(0, 0);
  const swinging: Ride = { ...base.reading.calm, end: { kind: "unsettled", t: 120 } };
  const reading = { ...base.reading, calm: swinging, windy: swinging };
  const outputs = dynamiqueOutputs(reading, "steel");

  test("has no Point d'arrêt and no arrival, and says it keeps swinging", () => {
    const [calm] = outputs.rides;
    expect(calm.stopX).toBeNull();
    expect(calm.stop).toBe(NEVER_SETTLES);
    expect(calm.arrival).toBeNull();
    expect(calm.noArrival).toBe(NO_ARRIVAL);
    expect(calm.duration).toBe(formatQuantity("duration", 120));
  });

  test("draws no marker on either chart", () => {
    const drawn = dynamiqueScene({
      width: 1000,
      frame: base.frame,
      solved: { base: base.base, rides: { reading, outputs } },
    });
    expect(drawn.coupe.markers).toEqual([]);
    expect(drawn.curve?.markers).toEqual([]);
  });
});

describe("every dynamic output is an « estimation »", () => {
  test.each([
    [0, 0],
    [50, 0],
    [30, 90],
  ])("the rides under %d km/h from %d° say so", (speed, direction) => {
    expect(ridesUnder(speed, direction).outputs.rides.map((ride) => ride.estimate)).toEqual([
      "estimation",
      "estimation",
    ]);
  });
});

/** A sample by hand: only the fields the cut reads carry a meaning. */
const at = (t: number, x: number, v: number): RideSample => ({ t, x, z: 0, v, a: 0 });

describe("the first pass of a ride", () => {
  const arrival: Ride = {
    samples: [at(0, 0, 0), at(1, 10, 2), at(2, 20, 3)],
    end: { kind: "arrival", v: 3, t: 2 },
  };
  // Out to x 30 and back to 10 before settling at 20: the second leg has a negative speed.
  const swing: Ride = {
    samples: [at(0, 0, 0), at(1, 20, 4), at(2, 30, 0), at(2, 30, 0), at(3, 20, -3), at(4, 10, 0)],
    end: { kind: "stop", x: 10, t: 4 },
  };

  test("a ride that arrives is kept whole", () => {
    expect(firstPass(arrival)).toEqual(arrival.samples);
  });

  test("a swinging ride stops at the first zero speed, the farthest point reached", () => {
    const pass = firstPass(swing);
    expect(pass).toEqual(swing.samples.slice(0, 3));
    expect(pass.at(-1)?.x).toBe(30);
    expect(pass.every((sample) => sample.v >= 0)).toBe(true);
    expect(pass.map((sample) => sample.x)).toEqual([0, 20, 30]);
  });

  test("a ride that stops without turning back is kept whole", () => {
    const straight: Ride = {
      samples: [at(0, 0, 0), at(1, 20, 4), at(2, 30, 0)],
      end: { kind: "stop", x: 30, t: 2 },
    };
    expect(firstPass(straight)).toEqual(straight.samples);
  });

  test("on a real line the pass ends at the farthest x of the whole swing, with nothing after it", () => {
    // 150 m, B 3 m below A, a head wind: both rides swing back before they settle.
    const gentle = { ...SHIPPED, geometry: { source: "manual", L: 150, h: -3 } } as typeof SHIPPED;
    const { reading } = ridesUnder(40, 0, gentle);
    for (const ride of [reading.calm, reading.windy]) {
      const pass = firstPass(ride);
      expect(pass.length).toBeLessThan(ride.samples.length);
      expect(pass.at(-1)?.v).toBe(0);
      expect(pass.at(-1)?.x).toBe(Math.max(...ride.samples.map((sample) => sample.x)));
      expect(pass.slice(1, -1).every((sample) => sample.v > 0)).toBe(true);
    }
  });
});

describe("what follows the first pass, and what the duration is called", () => {
  const gentle = { ...SHIPPED, geometry: { source: "manual", L: 150, h: -3 } } as typeof SHIPPED;

  test("a ride that arrives keeps « Durée de la traversée » and has nothing to add", () => {
    const { outputs } = ridesUnder(0, 0);
    expect(outputs.rides.map((ride) => ride.durationLabel)).toEqual([
      "Durée de la traversée",
      "Durée de la traversée",
    ]);
    expect(OUTPUT_LABEL.duration).toBe("Durée de la traversée");
    expect(outputs.swingLines).toEqual([]);
  });

  test("a ride that swings back and stops is « Durée jusqu'à l'arrêt », with one line", () => {
    const { outputs, reading } = ridesUnder(0, 0, gentle);
    const [calm] = outputs.rides;
    if (reading.calm.end.kind !== "stop") throw new Error("the gentle line stops the passager");
    expect(calm.arrival).toBeNull();
    expect(calm.durationLabel).toBe("Durée jusqu'à l'arrêt");
    expect(calm.swing).toBe(`${SWING_THEN} ${formatAtX(reading.calm.end.x)}, ${calm.duration}`);
    expect(calm.swing).toMatch(/^puis oscille jusqu'à l'arrêt à x \d+,\d m, \d+,\d s$/);
    // No wind: the rides are one, so one unnamed line.
    expect(outputs.swingLines).toEqual([calm.swing]);
  });

  test("when the Vent makes the rides differ, each line names its ride", () => {
    const { outputs } = ridesUnder(40, 0, gentle);
    const [calm, windy] = outputs.rides;
    expect(outputs.coincide).toBe(false);
    expect(calm.swing).not.toBe(windy.swing);
    expect(outputs.swingLines).toEqual([
      `${RIDE_LABEL.calm} : ${calm.swing}`,
      `${RIDE_LABEL.windy} : ${windy.swing}`,
    ]);
  });

  test("only the ride that swings back is told: the other arrives", () => {
    // The shipped line arrives; a head wind stops the windy ride, which carries on without turning back.
    const { outputs } = ridesUnder(50, 0);
    expect(outputs.rides[0].durationLabel).toBe(OUTPUT_LABEL.duration);
    expect(outputs.rides[1].durationLabel).toBe(OUTPUT_LABEL.durationToStop);
    expect(outputs.swingLines.every((line) => line.includes(RIDE_LABEL.windy))).toBe(true);
  });

  test("a swing that never settles says so, without a time", () => {
    const base = ridesUnder(0, 0, gentle);
    const never: Ride = { ...base.reading.calm, end: { kind: "unsettled", t: 120 } };
    const { rides } = dynamiqueOutputs({ ...base.reading, calm: never, windy: never }, "steel");
    expect(rides[0].swing).toBe(SWING_UNSETTLED);
    expect(rides[0].durationLabel).toBe(OUTPUT_LABEL.durationToStop);
  });
});
