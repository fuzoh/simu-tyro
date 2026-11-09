import { describe, expect, test } from "vitest";

import { alongLine, LINE_PICK_PX, pointerOnLine } from "./hover.ts";

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

  test("on a box wider than the drawing, the drawing stays 3 : 2 and centred, as the SVG draws it", () => {
    // By hand: a 900 × 400 box holds a 300 × 200 drawing at `min(900 / 300, 400 / 200) = 2`, i.e.
    // 600 × 400, with `(900 − 600) / 2 = 150` px spare each side. The same line therefore runs from
    // (150, 0) to (750, 200), where a stretched full-width scale would run it from the box's corner
    // (0, 0) to (900, 200).
    const ends = {
      kind: "drawing",
      A: { x: 0, y: 0 },
      B: { x: 300, y: 100 },
      view: { width: 300, height: 200 },
    } as const;
    const wide = { width: 900, height: 400 };
    expect(pointerOnLine(ends, wide, { x: 150, y: 0 })).toEqual({ t: 0, at: { x: 150, y: 0 } });
    expect(pointerOnLine(ends, wide, { x: 750, y: 200 })).toEqual({ t: 1, at: { x: 750, y: 200 } });
    // A stretched scale would put A on the box's corner; the drawing has nothing there.
    expect(pointerOnLine(ends, wide, { x: 0, y: 0 })).toBeNull();
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
