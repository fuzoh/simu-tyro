import { describe, expect, test } from "vitest";

import { placeRider } from "@/lib/chart/scene.ts";
import { GUTTER } from "@/lib/layout/contract.ts";

import type { DynamiqueScene } from "./scene.ts";

import { ridesUnder, SHIPPED } from "./__fixtures__/rides.ts";
import { ARRIVAL_LABEL, ESTIMATE } from "./copy.ts";
import { dynamiqueScene } from "./scene.ts";

const WIDTH = 1000;

/** A head wind stops the windy ride: two distinct Points d'arrêt on the same line. */
const HEAD = ridesUnder(50, 0);
const scene = dynamiqueScene({ width: WIDTH, frame: HEAD.frame, solved: HEAD.solved });

/** A gentle line the passager stops on, without a wind. */
const GENTLE = { ...SHIPPED, geometry: { source: "manual", L: 150, h: -5 } } as typeof SHIPPED;

/** The loaded line the coupe should have drawn when the passager rests at `xD`, in pixels. */
function lineRestingAt(
  drawn: DynamiqueScene,
  rides: ReturnType<typeof ridesUnder>,
  xD: number,
): readonly (readonly [number, number])[] {
  const rider = placeRider(rides.base, xD);
  if (rider === null) throw new Error("the exact solve holds at the rest position");
  return Array.from(rider.cable.xs, (metres, i) => [
    drawn.x.x(metres),
    drawn.coupe.z.y(rider.cable.zs[i]),
  ]);
}

describe("the coupe and the curve share one x scale", () => {
  test("one abscissa is one pixel column in both frames", () => {
    const curve = scene.curve;
    if (curve === null) throw new Error("a solved line has a curve");
    const stops = HEAD.outputs.rides.flatMap(({ id, stopX }) =>
      stopX === null ? [] : [{ id, stopX }],
    );
    expect(stops.length).toBeGreaterThan(0);
    for (const { id, stopX } of stops) {
      const onCoupe = scene.coupe.markers.find((marker) => marker.id === id);
      const onCurve = curve.markers.find((marker) => marker.id === id);
      expect(onCoupe?.x).toBe(scene.x.x(stopX));
      expect(onCurve?.x).toBe(onCoupe?.x);
    }
  });

  test("every point of the curve stands at the column the coupe gives its abscissa", () => {
    const curve = scene.curve;
    if (curve === null) throw new Error("a solved line has a curve");
    HEAD.reading.windy.samples.forEach((sample, i) => {
      expect(curve.speed.windy[i][0]).toBe(scene.x.x(sample.x));
      expect(curve.acceleration[i][0]).toBe(scene.x.x(sample.x));
    });
    // The coupe's own ground starts and ends on the same scale: the domain's edges.
    expect(scene.coupe.ground[0][0]).toBe(scene.x.x(scene.x.domain[0]));
  });

  test("the gutter is the contract's, so A sits the same distance from the edge in both", () => {
    expect(scene.x.gutter).toBe(GUTTER);
    expect(scene.x.x(scene.x.domain[0])).toBe(GUTTER);
    expect(scene.x.x(scene.x.domain[1])).toBe(WIDTH - GUTTER);
  });

  test("a narrower column rescales both frames from the one scale", () => {
    const narrow = dynamiqueScene({ width: 390, frame: HEAD.frame, solved: HEAD.solved });
    const stop = HEAD.outputs.rides[1].stopX;
    if (stop === null) throw new Error("a head wind stops the ride");
    expect(narrow.curve?.markers[0].x).toBe(narrow.coupe.markers[0].x);
    expect(narrow.coupe.markers[0].x).toBe(narrow.x.x(stop));
    expect(narrow.x.pxPerM).toBeLessThan(scene.x.pxPerM);
  });
});

describe("the Points d'arrêt are marked where the engine put them", () => {
  test("a ride that arrives draws no marker", () => {
    const calm = ridesUnder(0, 0);
    const drawn = dynamiqueScene({ width: WIDTH, frame: calm.frame, solved: calm.solved });
    expect(drawn.coupe.markers).toEqual([]);
    expect(drawn.curve?.markers).toEqual([]);
  });

  test("the passager at rest is on the coupe's z scale, at the engine's last sample", () => {
    const rest = HEAD.reading.windy.samples.at(-1);
    const marker = scene.coupe.markers.find(({ id }) => id === "windy");
    if (rest === undefined || marker === undefined) throw new Error("a head wind stops the ride");
    expect(marker.y).toBe(scene.coupe.z.y(rest.z));
  });

  test("a ride that stops on a gentle line is marked where the engine stopped it", () => {
    const gentle = ridesUnder(0, 0, GENTLE);
    const drawn = dynamiqueScene({ width: WIDTH, frame: gentle.frame, solved: gentle.solved });
    const end = gentle.reading.calm.end;
    if (end.kind !== "stop") throw new Error("the gentle line stops the passager");
    expect(drawn.coupe.markers.map((marker) => marker.metres)).toEqual([end.x, end.x]);
  });

  test("two markers at one abscissa stand on two label rows", () => {
    const gentle = ridesUnder(50, 90, GENTLE);
    expect(gentle.outputs.coincide).toBe(true);
    const drawn = dynamiqueScene({ width: WIDTH, frame: gentle.frame, solved: gentle.solved });
    expect(drawn.coupe.markers.map((marker) => marker.row)).toEqual([0, 1]);
    expect(drawn.coupe.markers[0].x).toBe(drawn.coupe.markers[1].x);
  });
});

describe("a ride that reaches B says so at B", () => {
  const calm = ridesUnder(0, 0);
  const drawn = dynamiqueScene({ width: WIDTH, frame: calm.frame, solved: calm.solved });

  test("both rides are named at B, each on its own row, in the engine's words", () => {
    expect(drawn.coupe.arrivals).toEqual([
      { id: "calm", x: drawn.x.x(calm.frame.L), label: ARRIVAL_LABEL.calm, row: 0 },
      { id: "windy", x: drawn.x.x(calm.frame.L), label: ARRIVAL_LABEL.windy, row: 1 },
    ]);
    expect(ARRIVAL_LABEL.calm).toContain("arrive au bout");
  });

  test("only the ride that arrives is named: the other has its marker", () => {
    // A head wind stops the windy ride short of B; the calm one still arrives.
    expect(scene.coupe.arrivals.map(({ id }) => id)).toEqual(["calm"]);
    expect(scene.coupe.markers.map(({ id }) => id)).toEqual(["windy"]);
  });

  test("a ride that stops is not named at B", () => {
    const gentle = ridesUnder(0, 0, GENTLE);
    const stopped = dynamiqueScene({ width: WIDTH, frame: gentle.frame, solved: gentle.solved });
    expect(stopped.coupe.arrivals).toEqual([]);
  });
});

describe("the coupe's dynamic marks are an « estimation »", () => {
  test("it says so whenever the rides are drawn", () => {
    expect(scene.coupe.estimate).toBe(ESTIMATE);
    const calm = ridesUnder(0, 0);
    expect(
      dynamiqueScene({ width: WIDTH, frame: calm.frame, solved: calm.solved }).coupe.estimate,
    ).toBe(ESTIMATE);
  });

  test("and says nothing where there is no ride", () => {
    const incomplete = dynamiqueScene({
      width: WIDTH,
      frame: HEAD.frame,
      solved: { base: HEAD.base, rides: null },
    });
    expect(incomplete.coupe.estimate).toBeNull();
    expect(
      dynamiqueScene({ width: WIDTH, frame: HEAD.frame, solved: null }).coupe.estimate,
    ).toBeNull();
  });
});

describe("the loaded line rests where the passager does", () => {
  test("at the Point d'arrêt without wind, when the passager stops", () => {
    const gentle = ridesUnder(0, 0, GENTLE);
    const drawn = dynamiqueScene({ width: WIDTH, frame: gentle.frame, solved: gentle.solved });
    const end = gentle.reading.calm.end;
    if (end.kind !== "stop") throw new Error("the gentle line stops the passager");
    expect(drawn.coupe.members?.[0].path).toEqual(lineRestingAt(drawn, gentle, end.x));
  });

  test("at the trajectory's low point, when the passager arrives", () => {
    const arrives = ridesUnder(0, 0);
    const drawn = dynamiqueScene({ width: WIDTH, frame: arrives.frame, solved: arrives.solved });
    const { steps } = arrives.base.traverse;
    const low = steps.reduce((lowest, step) => (step.zD < lowest.zD ? step : lowest));
    expect(arrives.reading.calm.end.kind).toBe("arrival");
    expect(drawn.coupe.members?.[0].path).toEqual(lineRestingAt(drawn, arrives, low.xD));
  });
});

describe("the curve", () => {
  test("keeps one zero line for speed and acceleration", () => {
    const curve = scene.curve;
    if (curve === null) throw new Error("a solved line has a curve");
    const zeroTick = curve.speedTicks.find((tick) => tick.text === "0");
    expect(zeroTick?.y).toBe(curve.zero);
    for (const [, y] of curve.speed.windy) {
      expect(y).toBeGreaterThanOrEqual(curve.plot.top - 1e-9);
      expect(y).toBeLessThanOrEqual(curve.plot.bottom + 1e-9);
    }
    for (const [, y] of curve.acceleration) {
      expect(y).toBeGreaterThanOrEqual(curve.plot.top - 1e-9);
      expect(y).toBeLessThanOrEqual(curve.plot.bottom + 1e-9);
    }
  });
});

describe("the axes' labels fit the gutter", () => {
  test("no tick runs past four characters, however steep the line", () => {
    const steep = ridesUnder(0, 0, { ...SHIPPED, geometry: { source: "manual", L: 150, h: -60 } });
    const drawn = dynamiqueScene({ width: 390, frame: steep.frame, solved: steep.solved });
    const ticks = [...(drawn.curve?.speedTicks ?? []), ...(drawn.curve?.accelerationTicks ?? [])];
    expect(Math.max(...ticks.map((tick) => tick.text.length))).toBeLessThanOrEqual(4);
    // A speed past 10 m/s loses its decimal; a smaller one keeps it.
    expect(ticks.some((tick) => /^\d\d$/.test(tick.text))).toBe(true);
  });
});

describe("« Aucun résultat » keeps the frame and drops the rest", () => {
  const empty = dynamiqueScene({ width: WIDTH, frame: HEAD.frame, solved: null });

  test("the ground, the anchors and the badge stay; the loaded line, trajectory and curve go", () => {
    expect(empty.coupe.ground.length).toBeGreaterThan(0);
    expect(empty.coupe.anchors).toHaveLength(2);
    expect(empty.coupe.badge).toMatch(/^Éch\. verticale/);
    expect(empty.coupe.members).toBeNull();
    expect(empty.coupe.trajectory).toEqual([]);
    expect(empty.coupe.markers).toEqual([]);
    expect(empty.curve).toBeNull();
  });
});

describe("an incomplete traverse keeps the loaded line and the trajectory, and loses the rides", () => {
  const incomplete = dynamiqueScene({
    width: WIDTH,
    frame: HEAD.frame,
    solved: { base: HEAD.base, rides: null },
  });

  test("the coupe still draws the solved trajectory and the loaded line; no marker, no curve", () => {
    expect(incomplete.coupe.trajectory.length).toBeGreaterThan(0);
    expect(incomplete.coupe.members).not.toBeNull();
    expect(incomplete.coupe.markers).toEqual([]);
    expect(incomplete.curve).toBeNull();
  });
});
