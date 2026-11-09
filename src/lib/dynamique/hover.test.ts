import { describe, expect, test } from "vitest";

import { COUPE_HOVER } from "@/lib/chart/copy.ts";
import { coupeLines, groundAt } from "@/lib/chart/hover.ts";
import { formatQuantity } from "@/lib/format/quantity.ts";

import { ON_PROFIL, PROFIL, ridesUnder, SHIPPED } from "./__fixtures__/rides.ts";
import { coupeAt, curveHover, sampleNear } from "./hover.ts";
import { dynamiqueScene } from "./scene.ts";

const HEAD = ridesUnder(50, 0);
const CALM = ridesUnder(0, 0);
const IMPORTED = ridesUnder(0, 0, ON_PROFIL, PROFIL);

describe("the ground under the coupe's hover", () => {
  test("on a manual line the height is counted from A's foot, and is the anchor's height at A", () => {
    const at = groundAt(CALM.frame, 0);
    expect(at.absolute).toBe(false);
    expect(at.altitude).toBeCloseTo(0, 9);
  });

  test("the ground along the straight line between the bases falls with the dénivelé", () => {
    // Bases are anchor-A's foot (0) and B's foot (h − zB + zA below A's top, from A's foot: h).
    const { h, L } = CALM.frame;
    expect(groundAt(CALM.frame, L).altitude).toBeCloseTo(h, 9);
    expect(groundAt(CALM.frame, L / 2).altitude).toBeCloseTo(h / 2, 9);
  });

  test("on an imported profil, reads the file's own samples at the abscissae it has them", () => {
    const { L } = IMPORTED.frame;
    const lastZ = PROFIL.z[PROFIL.z.length - 1];
    expect(groundAt(IMPORTED.frame, 0).altitude).toBeCloseTo(PROFIL.z[0], 9);
    expect(groundAt(IMPORTED.frame, 50).altitude).toBeCloseTo(PROFIL.z[1], 9);
    expect(groundAt(IMPORTED.frame, L).altitude).toBeCloseTo(lastZ, 9);
    expect(groundAt(IMPORTED.frame, 0).absolute).toBe(true);
  });
});

describe("the curve's hover — the speed and the acceleration at the point", () => {
  test("reads the engine's sample nearest the abscissa, and says « estimation »", () => {
    const lines = curveHover(CALM.reading, CALM.outputs, 75);
    const sample = sampleNear(CALM.reading.windy, 75);
    if (sample === null) throw new Error("the ride is read at its own abscissa");
    expect(lines.map((line) => line.label)).toEqual([
      "distance",
      "vitesse",
      "accélération",
      "estimation",
    ]);
    expect(lines[1].value).toBe(formatQuantity("speed", sample.v));
    expect(lines[2].value).toBe(formatQuantity("acceleration", sample.a));
  });

  test("with a wind entered it reads both rides, each at its own sample", () => {
    const lines = curveHover(HEAD.reading, HEAD.outputs, 40);
    // Every row keeps the name of its quantity beside the name of its ride.
    expect(lines.map((line) => line.label)).toEqual([
      "distance",
      "vitesse sans vent",
      "vitesse avec vent",
      "accélération sans vent",
      "accélération avec vent",
      "estimation",
    ]);
    const calm = sampleNear(HEAD.reading.calm, 40);
    const windy = sampleNear(HEAD.reading.windy, 40);
    if (calm === null || windy === null) throw new Error("both rides reach x 40");
    expect(lines[1].value).toBe(formatQuantity("speed", calm.v));
    expect(lines[2].value).toBe(formatQuantity("speed", windy.v));
    expect(lines[3].value).toBe(formatQuantity("acceleration", calm.a));
    expect(lines[4].value).toBe(formatQuantity("acceleration", windy.a));
  });

  test("a ride that never reaches the abscissa is left out, not read at its farthest sample", () => {
    // The head wind turns the passager back well before B: the ride has no sample near B.
    const past = HEAD.frame.L - 1;
    const reach = Math.max(...HEAD.reading.windy.samples.map((sample) => sample.x));
    expect(reach).toBeLessThan(past - 1);
    expect(sampleNear(HEAD.reading.windy, past)).toBeNull();
    const lines = curveHover(HEAD.reading, HEAD.outputs, past);
    expect(lines.map((line) => line.label)).toEqual([
      "distance",
      "vitesse sans vent",
      "accélération sans vent",
      "estimation",
    ]);
  });

  test("the departure is at rest on A", () => {
    const first = sampleNear(CALM.reading.calm, 0);
    expect(first?.x).toBe(0);
    expect(first?.v).toBe(0);
  });

  test("the nearest sample is within one integration step of the abscissa", () => {
    for (const metres of [10, 55.5, 120]) {
      const near = sampleNear(CALM.reading.calm, metres);
      if (near === null) throw new Error("the ride crosses the whole line");
      expect(Math.abs(near.x - metres)).toBeLessThanOrEqual(1);
    }
  });
});

describe("the coupe's hover over a passager at rest in a Zone d'ancrage (#106)", () => {
  /**
   * The shipped line's passager rests about 20 m short of B — inside a 25 m zone, outside the shipped
   * 10 m one. Both zones leave the span's middle open, so the Clearance Gate stands for both.
   */
  const restingIn = (anchorZone: number) => {
    const under = ridesUnder(0, 0, { ...SHIPPED, rider: { ...SHIPPED.rider, anchorZone } });
    const { coupe } = dynamiqueScene({ width: 640, frame: under.frame, solved: under.solved });
    const rest = coupe.rest;
    if (rest === null) throw new Error("the shipped line has a loaded line at rest");
    const reading = coupeAt({
      frame: under.frame,
      coupe,
      metres: rest.step.xD,
      reach: 1,
      clearance: true,
    });
    if (reading === null) throw new Error("the passager rests on the span");
    return { rest, reading, L: under.frame.L };
  };

  test("the garde is read and said to be not judged, as on Statique", () => {
    const { rest, reading, L } = restingIn(25);
    expect(rest.step.xD).toBeGreaterThan(L - 25);
    expect(reading.garde).toBe(rest.underRider);
    expect(reading.inAnchorZone).toBe(true);
    expect(coupeLines(reading, "terrain").map((line) => line.label)).toContain(
      COUPE_HOVER.anchorZone,
    );
  });

  test("a passager resting past the zone is judged, and the hover says nothing of a zone", () => {
    const { rest, reading, L } = restingIn(10);
    expect(rest.step.xD).toBeLessThan(L - 10);
    expect(reading.inAnchorZone).toBe(false);
    expect(coupeLines(reading, "terrain").map((line) => line.label)).not.toContain(
      COUPE_HOVER.anchorZone,
    );
  });
});
