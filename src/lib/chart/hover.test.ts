import { describe, expect, test } from "vitest";

import { ON_PROFIL, PROFIL, ridesUnder } from "@/lib/dynamique/__fixtures__/rides.ts";
import { dynamiqueScene } from "@/lib/dynamique/scene.ts";
import { formatQuantity } from "@/lib/format/quantity.ts";
import { zGroundAt } from "@/lib/sim";

import { COUPE_HOVER } from "./copy.ts";
import { coupeLines, coupeReading, groundAt } from "./hover.ts";
import { placeRider, polylineAt } from "./scene.ts";

const MANUAL = ridesUnder(0, 0);
const IMPORTED = ridesUnder(0, 0, ON_PROFIL, PROFIL);

function riderAt(under: typeof MANUAL, xD: number) {
  const rider = placeRider(under.base, xD);
  if (rider === null) throw new Error("the shipped line places its rider");
  return rider;
}

const REACH = 1;

function read(args: Parameters<typeof coupeReading>[0]) {
  const reading = coupeReading(args);
  if (reading === null) throw new Error("the abscissa is inside the span");
  return reading;
}

describe("the reading at an abscissa", () => {
  test("reads the ground as the engine does, whatever the profil's samples", () => {
    const { frame } = IMPORTED;
    // 62 m falls between the profil's 50 m and 100 m samples: only the interpolation can answer.
    const reading = coupeReading({
      frame,
      cable: null,
      rider: null,
      metres: 62,
      reach: REACH,
      clearance: true,
    });
    expect(reading?.ground).toBeCloseTo(
      frame.bases!.zBaseA + frame.anchors.zA + zGroundAt(frame.terrain, 62),
      9,
    );
    expect(reading?.ground).toBeCloseTo(PROFIL.z[1] + (12 / 50) * (PROFIL.z[2] - PROFIL.z[1]), 9);
    expect(reading?.absolute).toBe(true);
  });

  test("reads the drawn ground and the engine's ground alike inside the span", () => {
    const { frame } = MANUAL;
    for (const metres of [0, 31.7, 75, frame.L]) {
      expect(groundAt(frame, metres).altitude).toBeCloseTo(
        polylineAt(frame.ground, metres) + frame.anchors.zA,
        9,
      );
    }
  });

  test("reads the loaded line and its gap to the ground at the pointer, not at the passager", () => {
    const rider = riderAt(MANUAL, 75);
    const reading = coupeReading({
      frame: MANUAL.frame,
      cable: rider.cable,
      rider,
      metres: 30,
      reach: REACH,
      clearance: true,
    });
    const lineZ = polylineAt(rider.cable, 30);
    const groundZ = zGroundAt(MANUAL.frame.terrain, 30);
    expect(reading?.lineGap).toBeCloseTo(lineZ - groundZ, 9);
    expect(reading?.line).toBeCloseTo(reading!.ground + reading!.lineGap!, 9);
    expect(reading?.distance).toBe(30);
  });

  test("reads the passager's garde only where the passager stands", () => {
    const rider = riderAt(MANUAL, 75);
    const read = (metres: number) =>
      coupeReading({
        frame: MANUAL.frame,
        cable: rider.cable,
        rider,
        metres,
        reach: REACH,
        clearance: true,
      });
    const { xD } = rider.step;
    expect(read(xD + REACH)?.garde).toBe(rider.underRider);
    expect(read(xD - REACH)?.garde).toBe(rider.underRider);
    expect(read(xD + REACH + 0.01)?.garde).toBeNull();
    expect(read(20)?.garde).toBeNull();
  });

  test("reads nothing outside the span, where the ground is a held end", () => {
    const { frame } = MANUAL;
    const read = (metres: number) =>
      coupeReading({ frame, cable: null, rider: null, metres, reach: REACH, clearance: true });
    expect(read(-0.01)).toBeNull();
    expect(read(frame.L + 0.01)).toBeNull();
    expect(read(Number.NaN)).toBeNull();
    expect(read(0)).not.toBeNull();
    expect(read(frame.L)).not.toBeNull();
  });

  test("with no solved line there is the distance and the ground, and nothing else", () => {
    const reading = coupeReading({
      frame: MANUAL.frame,
      cable: null,
      rider: null,
      metres: 40,
      reach: REACH,
      clearance: true,
    });
    expect(reading).toMatchObject({ line: null, lineGap: null, garde: null });
  });

  test("a Clearance Gate breach withholds every gap and keeps the altitudes", () => {
    const rider = riderAt(MANUAL, 75);
    const reading = coupeReading({
      frame: MANUAL.frame,
      cable: rider.cable,
      rider,
      metres: 75,
      reach: REACH,
      clearance: false,
    });
    expect(reading?.lineGap).toBeNull();
    expect(reading?.garde).toBeNull();
    expect(reading?.line).not.toBeNull();
  });
});

describe("the Page Dynamique's coupe reads the loaded line it draws", () => {
  const { coupe } = dynamiqueScene({ width: 640, frame: MANUAL.frame, solved: MANUAL.solved });

  test("with the same words as the Statique's, the gap to the ground included", () => {
    const reading = read({
      frame: MANUAL.frame,
      cable: coupe.rest?.cable ?? null,
      rider: null,
      metres: 40,
      reach: 0,
      clearance: true,
    });
    expect(reading.lineGap).toBeCloseTo((reading.line ?? Number.NaN) - reading.ground, 9);
    expect(coupeLines(reading, "terrain").map((line) => line.label)).toEqual([
      "distance",
      COUPE_HOVER.ground.fromFoot,
      COUPE_HOVER.line.fromFoot,
      COUPE_HOVER.lineGap,
      COUPE_HOVER.fromFoot,
    ]);
  });

  test("under a Clearance Gate breach it prints the altitude of the line and no gap", () => {
    const reading = read({
      frame: MANUAL.frame,
      cable: coupe.rest?.cable ?? null,
      rider: coupe.rest,
      metres: coupe.rest?.step.xD ?? 0,
      reach: 1,
      clearance: false,
    });
    expect(coupeLines(reading, "terrain").map((line) => line.label)).toEqual([
      "distance",
      COUPE_HOVER.ground.fromFoot,
      COUPE_HOVER.line.fromFoot,
      COUPE_HOVER.fromFoot,
    ]);
  });

  test("reads the garde au sol where the passager hangs at rest, and only there", () => {
    const rest = coupe.rest;
    if (rest === null) throw new Error("the shipped line has a loaded line at rest");
    const at = (metres: number) =>
      read({
        frame: MANUAL.frame,
        cable: rest.cable,
        rider: rest,
        metres,
        reach: 1,
        clearance: true,
      });
    expect(at(rest.step.xD).garde).toBe(rest.underRider);
    expect(at(rest.step.xD + 5).garde).toBeNull();
  });
});

describe("the lines it prints", () => {
  const rider = riderAt(IMPORTED, 75);
  const reading = read({
    frame: IMPORTED.frame,
    cable: rider.cable,
    rider,
    metres: 75,
    reach: REACH,
    clearance: true,
  });

  test("on an imported profil, altitudes and gaps, in that order, in the Page's words", () => {
    const lines = coupeLines(reading, "terrain");
    expect(lines.map((line) => line.label)).toEqual([
      "distance",
      COUPE_HOVER.ground.absolute,
      COUPE_HOVER.line.absolute,
      COUPE_HOVER.lineGap,
      "garde au sol",
    ]);
    expect(lines[0].value).toBe(formatQuantity("extremumX", 75));
    expect(lines[1].value).toBe(formatQuantity("zBase", reading.ground));
    expect(lines[4].value).toBe(formatQuantity("clearance", rider.underRider));
  });

  test("the two registers read the same numbers", () => {
    expect(coupeLines(reading, "exact").map((line) => line.value)).toEqual(
      coupeLines(reading, "terrain").map((line) => line.value),
    );
  });

  test("on a manual line the heights say where they are counted from", () => {
    const manual = read({
      frame: MANUAL.frame,
      cable: null,
      rider: null,
      metres: 40,
      reach: REACH,
      clearance: true,
    });
    const lines = coupeLines(manual, "terrain");
    expect(lines.map((line) => line.label)).toEqual([
      "distance",
      COUPE_HOVER.ground.fromFoot,
      COUPE_HOVER.fromFoot,
    ]);
    expect(lines.at(-1)?.value).toBe("");
  });
});
