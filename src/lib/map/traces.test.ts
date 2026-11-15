/**
 * The vue de dessus's traces (#118): which of the scene's lines it draws, by the View Strip's
 * layers and by each line's own availability, and where their `(x, y)` stand on the map — the Vue
 * 3D's projector, checked here against a hand-set line on a north-bound segment.
 */

import { describe, expect, test } from "vitest";

import type { SceneBase, SceneRider, SpaceLine } from "@/lib/chart/scene.ts";

import { buildScene } from "@/lib/chart/scene.ts";
import { firstRunDefaults } from "@/lib/scenario/first-run.ts";

import { planTraces, spanTraces, topTraces } from "./traces.ts";
import { planFrame } from "./vue-3d.ts";

const line = (xs: number[], ys: number[]): SpaceLine => ({
  xs: Float64Array.from(xs),
  ys: Float64Array.from(ys),
  zs: Float64Array.from(xs, (x) => -x / 10),
});

const built = buildScene({ scenario: firstRunDefaults(), trace: null });
if (built === null) throw new Error("the shipped line solves");
const unloadedCable = line([0, 75, 150], [0, 2, 0]);
const trajectory = [line([10, 20], [1, 1.5]), line([40, 50], [2, 2.5])];
const solved: SceneBase = { ...built, unloadedCable, trajectory };
const rider: SceneRider = { ...built.rider, cable: line([0, 75, 75, 150], [0, 3, 3, 0]) };
const ALL = { unloaded: true, trajectory: true };

describe("spanTraces — what the vue de dessus draws of the solved line", () => {
  test("every line of the scene, as the scene holds it", () => {
    expect(spanTraces({ solved, rider, layers: ALL })).toEqual({
      L: 150,
      unloaded: unloadedCable,
      loaded: rider.cable,
      trajectory,
    });
  });

  test("the View Strip's toggles hide the Ligne à vide and the Trajectoire; the loaded line stays", () => {
    const none = spanTraces({ solved, rider, layers: { unloaded: false, trajectory: false } });
    expect(none?.unloaded).toBeNull();
    expect(none?.trajectory).toEqual([]);
    expect(none?.loaded).toBe(rider.cable);
  });

  test("no loaded line at the chosen position: it alone goes", () => {
    const partial = spanTraces({ solved, rider: null, layers: ALL });
    expect(partial?.loaded).toBeNull();
    expect(partial?.unloaded).toBe(unloadedCable);
    expect(partial?.trajectory).toBe(trajectory);
  });

  test("no solved line, nothing to draw", () => {
    expect(spanTraces({ solved: null, rider: null, layers: ALL })).toBeNull();
  });
});

describe("planTraces — the same lines on the map", () => {
  const ends = { A: { lat: 46.95, lon: 7.44 }, B: { lat: 46.9513, lon: 7.44 } };

  test("each vertex is the projector's (x, y), in the scene's order", () => {
    const traces = spanTraces({ solved, rider, layers: ALL });
    if (traces === null) throw new Error("the line solved");
    const plan = planTraces(traces, ends);
    const onPlan = planFrame({ ends, L: 150 });
    expect(plan.unloaded).toEqual([onPlan(0, 0), onPlan(75, 2), onPlan(150, 0)]);
    expect(plan.loaded).toEqual([onPlan(0, 0), onPlan(75, 3), onPlan(75, 3), onPlan(150, 0)]);
    expect(plan.trajectory).toEqual([
      [onPlan(10, 1), onPlan(20, 1.5)],
      [onPlan(40, 2), onPlan(50, 2.5)],
    ]);
    // On a line running north the left of the travel is west: a positive `y` is a smaller longitude.
    expect(plan.unloaded?.[1]?.lon).toBeLessThan(ends.A.lon);
  });

  test("the traces stand only where the line was solved between those Positions", () => {
    expect(
      topTraces({
        placement: { ok: false, block: "profil" },
        solved,
        rider,
        layers: ALL,
      }),
    ).toBeNull();
  });
});
