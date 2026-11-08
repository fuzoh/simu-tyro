import { describe, expect, test } from "vitest";

import type { Ride } from "@/lib/sim";

import { formatAtX, formatQuantity } from "@/lib/format/quantity.ts";
import { msToKmh } from "@/lib/sim";

import { ridesUnder } from "./__fixtures__/rides.ts";
import { ARRIVES_AT_END, CONSTANTS_NOTE, NEVER_SETTLES, NO_ARRIVAL } from "./copy.ts";
import { dynamiqueOutputs } from "./outputs.ts";
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
    expect(outputs.rides[0].stopX).not.toBe(outputs.rides[1].stopX);
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
