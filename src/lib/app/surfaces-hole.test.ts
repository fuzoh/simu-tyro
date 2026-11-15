import { describe, expect, test, vi } from "vitest";

import type { ScenarioDraft } from "@/lib/scenario/types.ts";

import { buildSceneBase, buildSceneFrame } from "@/lib/chart/scene.ts";
import { deducedFrom } from "@/lib/rail/deduced.ts";
import { evaluateGates } from "@/lib/rail/gates.ts";
import { firstRunDefaults } from "@/lib/scenario/first-run.ts";
import { sweepRiderOf, traverseInputs, traverseScenario } from "@/lib/scenario/traverse.ts";
import { deriveUnloaded, unloadedInputs } from "@/lib/scenario/unloaded.ts";

import { errorSurfaces, gatedRides } from "./surfaces.ts";

/**
 * A hole in the Sweep under wind (#127 Q24), read through the whole composition: the position that
 * did not converge is not filled by a neighbour, so the Verdict is `Indéterminé` with the count of
 * the positions solved, and no ride descends across it. The hole is injected on the engine's sweep
 * (`vi.mock`) at a grid index the test chose — the one way to hold a windy sweep to a hole.
 */

const inject = vi.hoisted(() => ({ hole: -1 }));

vi.mock("@/lib/sim", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/sim")>();
  return {
    ...real,
    sweepSpatial: (...args: Parameters<typeof real.sweepSpatial>) => {
      const swept = real.sweepSpatial(...args);
      const k = inject.hole;
      if (k < 0 || swept.input.aero === null) return swept;
      const slots = swept.slots.map((slot, i) => (i === k ? null : slot));
      return {
        ...swept,
        slots,
        coverage: (slots.length - 1) / slots.length,
        failures: [
          {
            index: k,
            sD: swept.grid[k],
            error: { kind: "no-convergence", attempts: 5, residual: 1, reason: "attempts" },
          },
        ],
      };
    },
  };
});

function windyRope(): ScenarioDraft {
  const scenario = firstRunDefaults() as ScenarioDraft;
  scenario.regime = "secours10";
  scenario.usage = "TEMPORAIRE";
  scenario.material = {
    family: "textile",
    ropeClass: "hmpe",
    MBL: 90_000,
    mu: 0.0855,
    k: 22,
    d: 11,
  };
  scenario.terminations = {
    A: { id: "oeil-cousu-epissure", eta: 0.9 },
    B: { id: "oeil-cousu-epissure", eta: 0.9 },
  };
  scenario.positions = { A: { lat: 46.8, lon: 7.4 }, B: { lat: 46.801, lon: 7.4 } };
  scenario.wind = { ...scenario.wind, speedKmh: 40, directionDeg: 90 };
  return scenario;
}

function read(scenario: ScenarioDraft) {
  const unloaded = deriveUnloaded(unloadedInputs(scenario, null));
  const frame = buildSceneFrame(unloaded.span);
  const solved = buildSceneBase(frame, unloaded, sweepRiderOf(scenario));
  const traverse = traverseScenario(traverseInputs(scenario));
  const surfaces = errorSurfaces({
    failure: deducedFrom(scenario, unloaded).failure,
    focused: null,
    committed: null,
    frame,
    register: "exact",
    report: evaluateGates({ scenario: traverse }),
    solved,
    traverse,
  });
  return { surfaces, rides: gatedRides(surfaces, traverse, null) };
}

describe("a hole in the windy Sweep (Q24)", () => {
  test("without one the windy line is judged and ridden", () => {
    inject.hole = -1;
    const { surfaces, rides } = read(windyRope());
    expect(surfaces.results?.verdict?.state).not.toBe("indetermine");
    expect(rides).not.toBeNull();
  });

  test("with one the Verdict is Indéterminé, counted against 260, and no ride is read", () => {
    inject.hole = 120;
    const { surfaces, rides } = read(windyRope());
    expect(surfaces.results?.verdict).toMatchObject({ state: "indetermine", stepsSolved: 259 });
    expect(rides).toBeNull();
  });
});
