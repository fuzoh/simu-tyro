import { afterEach, describe, expect, test } from "vitest";

import { probeMark, probeMeasure, probeSpan, probeTag, probeTagOf, probing } from "./probe.ts";

const flag = globalThis as { __scoutechProbe?: unknown };

function entries(name: string) {
  return [
    ...performance.getEntriesByName(name, "mark"),
    ...performance.getEntriesByName(name, "measure"),
  ] as (PerformanceMark | PerformanceMeasure)[];
}

afterEach(() => {
  delete flag.__scoutechProbe;
  performance.clearMarks();
  performance.clearMeasures();
});

describe("off, as in a reader's tab", () => {
  test("records nothing and leaves the work it wraps untouched", () => {
    expect(probing()).toBe(false);
    probeMark("rider:asked", 12.5);
    probeMeasure("vue3d:render", 0);
    expect(probeSpan("vue3d:scene", 12.5, () => 42)).toBe(42);
    const scene = {};
    expect(probeTag(scene, 12.5)).toBe(scene);
    expect(probeTagOf(scene)).toBeUndefined();
    expect(entries("rider:asked")).toHaveLength(0);
    expect(entries("vue3d:render")).toHaveLength(0);
    expect(entries("vue3d:scene")).toHaveLength(0);
  });

  test("only `true` switches it on — a harness's flag, not any truthy value", () => {
    flag.__scoutechProbe = "yes";
    probeMark("rider:asked", 1);
    expect(entries("rider:asked")).toHaveLength(0);
  });
});

describe("on, as the rider-drag harness opens the page", () => {
  test("a mark carries the position it was given", () => {
    flag.__scoutechProbe = true;
    probeMark("rider:asked", 12.5);
    const [mark] = entries("rider:asked");
    expect(mark?.detail).toBe(12.5);
  });

  test("a span covers the work it wraps and returns what the work returned", () => {
    flag.__scoutechProbe = true;
    const before = performance.now();
    const value = probeSpan("vue3d:scene", 30, () => {
      // Work that takes a measurable time, so the span cannot be an empty one placed anywhere.
      const until = performance.now() + 2;
      while (performance.now() < until);
      return "scene";
    });
    const after = performance.now();
    expect(value).toBe("scene");
    const [span] = entries("vue3d:scene");
    expect(span?.detail).toBe(30);
    expect(span!.startTime).toBeGreaterThanOrEqual(before);
    expect(span!.duration).toBeGreaterThanOrEqual(2);
    expect(span!.startTime + span!.duration).toBeLessThanOrEqual(after);
  });

  test("a measure runs from the start it was given to now", () => {
    flag.__scoutechProbe = true;
    const start = performance.now();
    const until = start + 2;
    while (performance.now() < until);
    probeMeasure("vue3d:render", start);
    const [span] = entries("vue3d:render");
    expect(span!.startTime).toBe(start);
    expect(span!.duration).toBeGreaterThanOrEqual(2);
  });

  test("a tag follows the object it was put on, and no other", () => {
    flag.__scoutechProbe = true;
    const tagged = probeTag({}, 75);
    expect(probeTagOf(tagged)).toBe(75);
    expect(probeTagOf({})).toBeUndefined();
  });
});
