import { describe, expect, test } from "vitest";

import type { HoverEvent, HoverPhase } from "./hover-gesture.ts";

import { HOLD_SLOP_PX, IDLE, isReading, stepHover } from "./hover-gesture.ts";

/** The phase after a run of events, from rest. */
function run(...events: HoverEvent[]): HoverPhase {
  return events.reduce(stepHover, IDLE);
}

const at = (x: number, y = 0) => ({ x, y });

describe("a mouse", () => {
  test("reads wherever it moves, with no press", () => {
    expect(isReading(run({ type: "move", pointer: "mouse", at: at(10) }))).toBe(true);
  });

  test("keeps reading through a press and stops on leaving", () => {
    const pressed = run(
      { type: "move", pointer: "mouse", at: at(10) },
      { type: "down", pointer: "mouse", at: at(10) },
    );
    expect(isReading(pressed)).toBe(true);
    expect(isReading(stepHover(pressed, { type: "end" }))).toBe(false);
  });
});

describe("a finger", () => {
  test("reads nothing at the touch, nor while it moves without having been held", () => {
    const down = run({ type: "down", pointer: "touch", at: at(10) });
    expect(isReading(down)).toBe(false);
    expect(isReading(stepHover(down, { type: "move", pointer: "touch", at: at(11) }))).toBe(false);
  });

  test("reads once held still, and follows the finger from then on", () => {
    const held = run(
      { type: "down", pointer: "touch", at: at(10) },
      { type: "move", pointer: "touch", at: at(10 + HOLD_SLOP_PX) },
      { type: "hold" },
    );
    expect(isReading(held)).toBe(true);
    expect(isReading(stepHover(held, { type: "move", pointer: "touch", at: at(200) }))).toBe(true);
  });

  test("a press that drifted past the slop was a drag: the hold reads nothing", () => {
    const dragged = run(
      { type: "down", pointer: "touch", at: at(10) },
      { type: "move", pointer: "touch", at: at(10 + HOLD_SLOP_PX + 1) },
      { type: "hold" },
    );
    expect(isReading(dragged)).toBe(false);
  });

  test("lifting, or the browser taking the touch for a scroll, ends the reading", () => {
    const held = run({ type: "down", pointer: "touch", at: at(10) }, { type: "hold" });
    expect(isReading(held)).toBe(true);
    expect(isReading(stepHover(held, { type: "end" }))).toBe(false);
  });

  test("a hold that arrives after the finger left reads nothing", () => {
    const late = run(
      { type: "down", pointer: "touch", at: at(10) },
      { type: "end" },
      { type: "hold" },
    );
    expect(isReading(late)).toBe(false);
  });
});
