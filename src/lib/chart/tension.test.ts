/**
 * Avancé's tension graph (#119). `node`, no DOM. Every case runs through the app's own chain — the
 * unloaded line, the scene's solved half, the passager's exact solve — so what is asserted is that
 * the graph agrees with the numbers the rest of the screen prints: its two ends **are** the anchor
 * tensions the read-out cells show at that position, and its unloaded ends the unloaded line's.
 * Structural, not `[MEASURED]`: no recorded value is asserted, only agreements and orderings.
 */

import { describe, expect, it } from "vitest";

import type { ScenarioDraft } from "@/lib/scenario/types.ts";

import { formatQuantity } from "@/lib/format/quantity.ts";
import { createSharedX } from "@/lib/layout/contract.ts";
import { firstRunDefaults } from "@/lib/scenario/first-run.ts";
import { sweepRiderOf } from "@/lib/scenario/traverse.ts";
import { deriveUnloaded, unloadedInputs } from "@/lib/scenario/unloaded.ts";
import { label } from "@/lib/vocabulary/labels.ts";

import { TENSION_COPY } from "./copy.ts";
import { buildSceneBase, buildSceneFrame, placeRider } from "./scene.ts";
import {
  curveAt,
  TENSION_BOTTOM,
  TENSION_SAMPLES,
  TENSION_TOP,
  tensionAxis,
  tensionLines,
  tensionProfile,
  tensionScene,
} from "./tension.ts";

/** The scenario's half, composed as the app root composes it. */
function baseOf(scenario: ScenarioDraft) {
  const unloaded = deriveUnloaded(unloadedInputs(scenario, null));
  const base = buildSceneBase(buildSceneFrame(unloaded.span), unloaded, sweepRiderOf(scenario));
  if (base === null) throw new Error("expected a solved line");
  return base;
}

/** Relative disagreement. */
function relative(actual: number, expected: number): number {
  return Math.abs(actual - expected) / Math.abs(expected);
}

const shipped = firstRunDefaults();
const base = baseOf(shipped);

describe("the curves agree with the anchor tensions the screen prints", () => {
  it("the unloaded curve runs A to B and ends on the unloaded line's T_A and T_B", () => {
    const { unloaded } = tensionProfile(base, 75);
    expect(unloaded.xs).toHaveLength(TENSION_SAMPLES + 1);
    expect(unloaded.xs[0]).toBe(0);
    expect(Math.abs((unloaded.xs.at(-1) ?? 0) - base.L)).toBeLessThan(1e-3);
    expect(relative(unloaded.Ts[0], base.unloaded.TA)).toBeLessThan(1e-12);
    expect(relative(unloaded.Ts.at(-1) ?? 0, base.unloaded.TB)).toBeLessThan(1e-12);
  });

  it("the unloaded curve does not move with the passager", () => {
    const one = tensionProfile(base, 20).unloaded;
    const other = tensionProfile(base, 130).unloaded;
    expect(Array.from(one.Ts)).toEqual(Array.from(other.Ts));
  });

  // Both sides of the passager: near A, at mid-span and near B.
  it.each([20, 75, 130])("loaded, passager at x %d m: ends are the cells' T anc. A / B", (xD) => {
    const profile = tensionProfile(base, xD);
    const rider = placeRider(base, xD);
    if (profile.loaded === null || profile.rider === null || rider === null) {
      throw new Error("expected the loaded line to solve");
    }
    const { Ts } = profile.loaded;
    expect(relative(Ts[0], rider.step.TA)).toBeLessThan(1e-12);
    expect(relative(Ts.at(-1) ?? 0, rider.step.TB)).toBeLessThan(1e-12);
    // And therefore to the cells' own printed strings.
    expect(formatQuantity("Tstatic", Ts[0])).toBe(formatQuantity("Tstatic", rider.step.TA));
    expect(Math.abs(profile.rider.xD - rider.step.xD)).toBeLessThan(1e-6);
  });

  it("the passager adds tension on both sides of it: loaded ≥ unloaded everywhere", () => {
    for (const xD of [20, 75, 130]) {
      const profile = tensionProfile(base, xD);
      const loaded = profile.loaded;
      if (loaded === null) throw new Error("expected the loaded line to solve");
      for (let i = 0; i < loaded.xs.length; i++) {
        expect(loaded.Ts[i]).toBeGreaterThan(curveAt(profile.unloaded, loaded.xs[i]));
      }
    }
  });

  it("the node steps: the A side and the B side are read off either side of x_D", () => {
    const profile = tensionProfile(base, 75);
    const { loaded, rider } = profile;
    if (loaded === null || rider === null) throw new Error("expected the loaded line to solve");
    // The shipped line descends 18 m to B: the A side is the higher one and carries more.
    expect(rider.sideA).not.toBe(rider.sideB);
    expect(curveAt(loaded, rider.xD - 1e-6)).toBeCloseTo(rider.sideA, 3);
    expect(curveAt(loaded, rider.xD + 1e-6)).toBeCloseTo(rider.sideB, 3);
  });
});

describe("two Brins porteurs: one line's tension, never the sum", () => {
  const pair = baseOf({ ...shipped, carryingLines: 2 });

  it("flags per line, and each curve is the half-loaded line the cells report", () => {
    const profile = tensionProfile(pair, 75);
    const rider = placeRider(pair, 75);
    if (profile.loaded === null || rider === null) throw new Error("expected a solve");
    expect(profile.perLine).toBe(true);
    expect(relative(profile.loaded.Ts[0], rider.step.TA)).toBeLessThan(1e-12);
    // Half the passager on each line: more than the line at rest, less than one line carrying it
    // all — and so nowhere near the two lines' sum, which would be twice this.
    const single = tensionProfile(base, 75).loaded;
    if (single === null) throw new Error("expected a solve");
    expect(profile.loaded.Ts[0]).toBeGreaterThan(pair.unloaded.TA);
    expect(profile.loaded.Ts[0]).toBeLessThan(single.Ts[0]);
  });

  it("the hover and the axis say per line", () => {
    const profile = tensionProfile(pair, 75);
    const lines = tensionLines(profile, 40, "daN", 1) ?? [];
    expect(lines.map((line) => line.label)).toContain(TENSION_COPY.perLineShort);
    expect(TENSION_COPY.yAxis("daN", true)).toBe(
      `${label("internalTension", "exact")} par ligne (daN)`,
    );
    expect(TENSION_COPY.yAxis("daN", false)).toBe(`${label("internalTension", "exact")} (daN)`);
    expect(TENSION_COPY.perLineNote.startsWith(`Deux ${label("carryingLines", "exact")} :`)).toBe(
      true,
    );
    expect(tensionProfile(base, 75).perLine).toBe(false);
  });
});

describe("the hover reads the distance and both tensions", () => {
  const profile = tensionProfile(base, 75);

  it("off the passager: distance, ligne à vide, ligne chargée", () => {
    const lines = tensionLines(profile, 40, "daN", 1) ?? [];
    expect(lines.map((line) => line.label)).toEqual([
      "distance",
      TENSION_COPY.unloaded,
      TENSION_COPY.loaded,
    ]);
    expect(lines[0].value).toBe("40,0 m");
    expect(lines[1].value).toBe(formatQuantity("Tstatic", curveAt(profile.unloaded, 40)));
    expect(lines[2].value).toMatch(/ daN$/);
  });

  it("on the passager: both sides of the node", () => {
    const lines = tensionLines(profile, 75.3, "daN", 1) ?? [];
    expect(lines.map((line) => line.label)).toEqual([
      "distance",
      TENSION_COPY.unloaded,
      TENSION_COPY.sideA,
      TENSION_COPY.sideB,
    ]);
  });

  it("in the chosen unit", () => {
    const lines = tensionLines(profile, 40, "kN", 1) ?? [];
    expect(lines[1].value).toMatch(/ kN$/);
  });

  it("nothing off the span", () => {
    expect(tensionLines(profile, -1, "daN", 1)).toBeNull();
    expect(tensionLines(profile, base.L + 1, "daN", 1)).toBeNull();
  });
});

describe("the axis starts at zero and steps on a round ladder in the display unit", () => {
  it("daN: 0 to a round top that holds the maximum", () => {
    const axis = tensionAxis(8173, "daN");
    // 817,3 daN → steps of 200 daN, top 1000 daN.
    expect(axis.ticks.map((tick) => tick.text)).toEqual(["0", "200", "400", "600", "800", "1000"]);
    expect(axis.top).toBeCloseTo(10_000, 9);
  });

  it("kN: decimals where the step needs them", () => {
    const axis = tensionAxis(8173, "kN");
    expect(axis.ticks.map((tick) => tick.text)).toEqual(["0", "2", "4", "6", "8", "10"]);
    const small = tensionAxis(1300, "kN");
    expect(small.ticks.map((tick) => tick.text)).toEqual(["0,0", "0,5", "1,0", "1,5"]);
  });

  it("the scene draws zero at the plot's bottom and every curve inside the plot", () => {
    const x = createSharedX({ width: 900, L: base.L, extent: null });
    const scene = tensionScene(tensionProfile(base, 75), x, 200, "daN");
    expect(scene.plot).toEqual({ top: TENSION_TOP, bottom: 200 - TENSION_BOTTOM });
    expect(scene.ticks[0]).toMatchObject({ y: scene.plot.bottom, text: "0" });
    expect(scene.ticks.at(-1)?.text).toBe("1000");
    for (const [, y] of [...scene.unloaded, ...(scene.loaded ?? [])]) {
      expect(y).toBeGreaterThanOrEqual(scene.plot.top);
      expect(y).toBeLessThanOrEqual(scene.plot.bottom);
    }
    // The curves stand under the coupe's columns: the anchors are the shared scale's.
    expect(scene.anchors).toEqual([x.x(0), x.x(base.L)]);
    expect(scene.rider?.x).toBeCloseTo(x.x(75), 3);
  });
});
