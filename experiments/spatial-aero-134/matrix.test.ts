import { describe, expect, it } from "vitest";

import { baseCases } from "./cases.ts";
import { SHAPES, shapesCsv } from "./matrix.ts";
import { runFixedLength } from "./run.ts";

describe("shapesCsv — the coordinates of a selection of lines", () => {
  const cases = baseCases().filter(
    (base) =>
      base.id === "acier-12|niveau|passager|travers-20" || base.id === "acier-12|niveau|vide|calme",
  );
  const lines = shapesCsv(runFixedLength(cases)).trimEnd().split("\n");
  const rows = lines.slice(1).map((line) => line.split(","));

  it("holds the stronger wind under the reference and the largest probes, and no other line", () => {
    expect(lines[0]).toBe("cas,variante,S_m,x_m,y_m,z_m,T_N");
    expect(SHAPES.variants).toEqual([
      "N",
      "NL-b+0.5",
      "NL-b-0.5",
      "NL-y+0.5",
      "NL-y-0.5",
      "NA-0.1",
    ]);
    expect(new Set(rows.map(([id]) => id))).toEqual(
      new Set(["acier-12|niveau|passager|travers-20"]),
    );
    expect(new Set(rows.map(([, variant]) => variant))).toEqual(new Set(SHAPES.variants));
  });

  it("runs each line from anchor A to anchor B, the rider's node on both of its sides", () => {
    const reference = rows.filter(([, variant]) => variant === "N");
    const first = reference[0].map(Number);
    const last = reference.at(-1)!.map(Number);
    expect(first.slice(2, 6)).toEqual([0, 0, 0, 0]);
    expect(last[3]).toBeCloseTo(150, 5);
    expect(last[4]).toBeCloseTo(0, 5);
    expect(last[5]).toBeCloseTo(0, 5);
    // 480 steps in two pieces of 240, one node in 40: 7 nodes a side.
    expect(reference).toHaveLength(14);
    expect(reference[6][2]).toBe(reference[7][2]);
    expect(reference[6][3]).toBe(reference[7][3]);
    // A crosswind from the right pushes the line to the left: y > 0 at the rider.
    expect(Number(reference[6][4])).toBeGreaterThan(0.5);
  });
});
