import { describe, expect, test } from "vitest";

import type { Trace } from "@/lib/terrain/trace.ts";

import { alongLine, LINE_PICK_PX, pointerOnLine, profilRunsBetween } from "./hover.ts";

const A = { x: 0, y: 0 };
const B = { x: 100, y: 0 };

describe("the pointer on the line", () => {
  test("is the share of the way from A to B at the point it stands over", () => {
    expect(alongLine(A, B, { x: 25, y: 0 })).toEqual({ t: 0.25, at: { x: 25, y: 0 } });
  });

  test("is projected onto the line, however the line leans", () => {
    const hit = alongLine({ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 52, y: 48 });
    expect(hit?.t).toBeCloseTo(0.5, 12);
    expect(hit?.at).toEqual({ x: 50, y: 50 });
  });

  test("reads the nearest end beyond it, within the tolerance of that end", () => {
    expect(alongLine(A, B, { x: -4, y: 3 })?.t).toBe(0);
    expect(alongLine(A, B, { x: 104, y: 0 })?.t).toBe(1);
    expect(alongLine(A, B, { x: -LINE_PICK_PX - 1, y: 0 })).toBeNull();
  });

  test("reads nothing off the line", () => {
    expect(alongLine(A, B, { x: 50, y: LINE_PICK_PX })).not.toBeNull();
    expect(alongLine(A, B, { x: 50, y: LINE_PICK_PX + 1 })).toBeNull();
  });

  test("reads nothing on a line of no length", () => {
    expect(alongLine(A, A, A)).toBeNull();
  });
});

describe("the pointer on the line drawn in either frame", () => {
  const box = { width: 600, height: 400 };

  test("on the plain drawing, the ends are its own units scaled to the box it fills", () => {
    const ends = {
      kind: "drawing",
      A: { x: 0, y: 0 },
      B: { x: 300, y: 100 },
      view: { width: 300, height: 200 },
    } as const;
    // The line runs from the box's corner to its middle-right: (0, 0) to (600, 200).
    const hit = pointerOnLine(ends, box, { x: 300, y: 100 });
    expect(hit?.t).toBeCloseTo(0.5, 12);
    expect(hit?.at).toEqual({ x: 300, y: 100 });
    expect(pointerOnLine(ends, box, { x: 300, y: 100 + LINE_PICK_PX * 2 })).toBeNull();
  });

  test("on the map, the projected ends are already the box's pixels", () => {
    const ends = { kind: "projected", A: { x: 100, y: 50 }, B: { x: 500, y: 50 } } as const;
    expect(pointerOnLine(ends, box, { x: 300, y: 52 })?.t).toBeCloseTo(0.5, 12);
    expect(pointerOnLine(ends, box, { x: 20, y: 50 })).toBeNull();
  });

  test("reads nothing while the ends are not known", () => {
    expect(pointerOnLine(null, box, { x: 300, y: 50 })).toBeNull();
  });
});

describe("the profil that runs between the drawn Positions", () => {
  const POS_A = { lat: 46.5, lon: 6.6 };
  const POS_B = { lat: 46.51, lon: 6.62 };
  const trace = (ends?: { A: typeof POS_A; B: typeof POS_B }): Trace => ({
    d: new Float64Array([0, 100]),
    z: new Float64Array([500, 480]),
    dev: null,
    origin: { kind: "lien" },
    ...(ends === undefined ? {} : { ends }),
  });

  test("is read where the imported profil's ends are the Positions", () => {
    expect(profilRunsBetween({ A: POS_A, B: POS_B }, trace({ A: POS_A, B: POS_B }))).toBe(true);
  });

  test("is not read on a manual span whose Positions were typed, whatever their distance", () => {
    expect(profilRunsBetween({ A: POS_A, B: POS_B }, null)).toBe(false);
  });

  test("is not read once a Position was moved off the profil's end, or the profil has none", () => {
    const moved = { A: POS_A, B: { ...POS_B, lon: POS_B.lon + 0.001 } };
    expect(profilRunsBetween(moved, trace({ A: POS_A, B: POS_B }))).toBe(false);
    expect(profilRunsBetween({ A: POS_A, B: POS_B }, trace())).toBe(false);
  });

  test("is read on the plain schematic, which draws the portée itself", () => {
    expect(profilRunsBetween({ A: null, B: null }, null)).toBe(true);
    expect(profilRunsBetween({ A: POS_A, B: null }, null)).toBe(true);
  });
});
