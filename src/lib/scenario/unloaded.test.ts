import { describe, expect, test, vi } from "vitest";

import { formatQuantity } from "@/lib/format/quantity.ts";

import type { ScenarioDraft } from "./types.ts";
import type { UnloadedInputs } from "./unloaded.ts";

import { FIRST_RUN_RETAINED_TEXTILE, firstRunDefaults } from "./first-run.ts";
import { placeSpan } from "./geometry.ts";
import { deriveUnloaded, unloadedInputs, unloadedOn } from "./unloaded.ts";

/**
 * The one unloaded derivation — issue #31. Its memo key, its four stages, and the count that
 * proves one call runs the chain once. The read-outs it feeds are pinned where they are printed:
 * `rail/deduced.test.ts` for the `Valeurs déduites`, `chart/scene.test.ts` for the picture.
 */

function scenario(patch: (draft: ScenarioDraft) => void = () => {}): ScenarioDraft {
  const draft = firstRunDefaults() as ScenarioDraft;
  patch(draft);
  return draft;
}

const KEYS: readonly (keyof UnloadedInputs)[] = [
  "geometry",
  "anchors",
  "material",
  "tightness",
  "tensioningSide",
  "mp",
  "trace",
  // The Vent, the Positions that give it a bearing and the typed `ρ`: under wind the line is posed
  // under them (§19.7), so they key the unloaded memo too.
  "wind",
  "positions",
  "rho",
];

describe("`unloadedInputs` — the fields a memo keys on", () => {
  const before = scenario();
  const inputs = unloadedInputs(before, null);

  test("exactly the ten inputs: no `x_D`, no `unit`", () => {
    expect(Object.keys(inputs).sort()).toEqual([...KEYS].sort());
  });

  test("a scrub of `x_D` leaves every field reference-identical", () => {
    // The store merges a rider patch shallowly, which is what this reproduces.
    const scrubbed = unloadedInputs({ ...before, rider: { ...before.rider, xD: 12.5 } }, null);
    for (const key of KEYS) expect(scrubbed[key]).toBe(inputs[key]);
  });

  test("a mass edit changes `mp`, and nothing else", () => {
    const heavier = unloadedInputs(
      { ...before, rider: { ...before.rider, mp: before.rider.mp + 10 } },
      null,
    );
    expect(heavier.mp).not.toBe(inputs.mp);
    for (const key of KEYS.filter((key) => key !== "mp")) expect(heavier[key]).toBe(inputs[key]);
  });
});

describe("the four stages — where the chain stopped", () => {
  test("an invalid span stops at `geometry`, with no span and no error", () => {
    const negative = scenario((draft) => {
      draft.geometry = { source: "manual", L: -5, h: -18 };
    });
    expect(deriveUnloaded(unloadedInputs(negative, null))).toEqual({
      ok: false,
      stage: "geometry",
      error: null,
      span: null,
    });
  });

  test("a rope with blanks stops at `material` and still carries its span", () => {
    const blank = scenario((draft) => {
      draft.material = FIRST_RUN_RETAINED_TEXTILE.spec;
    });
    const unloaded = deriveUnloaded(unloadedInputs(blank, null));
    expect(unloaded).toMatchObject({ ok: false, stage: "material", error: null });
    expect(unloaded.span).toMatchObject({ L: 150, h: -18 });
  });

  test("a sub-floor `L₀` stops at `L0` with the engine's own refusal", () => {
    const tooShort = scenario((draft) => {
      draft.geometry = { source: "manual", L: 200, h: 0 };
      draft.tightness = { mode: "length", L0: 190 };
    });
    expect(deriveUnloaded(unloadedInputs(tooShort, null))).toMatchObject({
      ok: false,
      stage: "L0",
      error: { kind: "invalid-input", field: "L0", boundKind: "min" },
    });
  });

  test("a solved line poses the solver a span with no loads, at the resolved `L₀`", () => {
    const unloaded = deriveUnloaded(unloadedInputs(scenario(), null));
    if (!unloaded.ok) throw new Error("expected the shipped line to solve");
    expect(unloaded.input.loads).toEqual([]);
    // The first-run lock's own strings: « 151,64 m » and « 9074 daN ».
    expect(formatQuantity("L0", unloaded.input.L0)).toBe("151,64 m");
    expect(formatQuantity("MBF", unloaded.input.strength ?? NaN)).toBe("9074 daN");
  });
});

describe("`unloadedOn` — the placement passes through, so a frame keyed on it holds", () => {
  test("a solved line and a blank rope over one placed span both carry that span", () => {
    const inputs = unloadedInputs(scenario(), null);
    const placed = placeSpan(inputs, null);
    const solved = unloadedOn(placed, inputs);
    const blank = unloadedOn(placed, { ...inputs, material: FIRST_RUN_RETAINED_TEXTILE.spec });
    expect(solved.ok).toBe(true);
    expect(blank).toMatchObject({ ok: false, stage: "material" });
    expect(solved.span).toBe(placed);
    expect(blank.span).toBe(placed);
  });
});

describe("one call, one chain — `vi.mock` on the engine barrel", () => {
  test("`deriveUnloaded` runs `resolveL0` once and `solveSpan` once", async () => {
    vi.resetModules();
    const spies: { resolveL0?: ReturnType<typeof vi.fn>; solveSpan?: ReturnType<typeof vi.fn> } =
      {};
    vi.doMock("@/lib/sim", async () => {
      const sim = await vi.importActual<typeof import("@/lib/sim")>("@/lib/sim");
      spies.resolveL0 = vi.fn<typeof sim.resolveL0>(sim.resolveL0);
      spies.solveSpan = vi.fn<typeof sim.solveSpan>(sim.solveSpan);
      return { ...sim, resolveL0: spies.resolveL0, solveSpan: spies.solveSpan };
    });
    const mocked = await import("./unloaded.ts");

    const unloaded = mocked.deriveUnloaded(mocked.unloadedInputs(scenario(), null));
    expect(unloaded.ok).toBe(true);
    expect(spies.resolveL0).toHaveBeenCalledTimes(1);
    expect(spies.solveSpan).toHaveBeenCalledTimes(1);
    vi.doUnmock("@/lib/sim");
    vi.resetModules();
  });
});

describe("the line under the Vent (§19.7) — posed once, under the wind it carries", () => {
  /** A rope the gates pass, its diameter typed or not. */
  const rope = (d?: number): ScenarioDraft["material"] => ({
    family: "textile",
    ropeClass: "hmpe",
    MBL: 90_000,
    mu: 0.0855,
    k: 22,
    ...(d === undefined ? {} : { d }),
  });
  /** A to B toward the north, so a wind from the east blows across the line. */
  const north: ScenarioDraft["positions"] = {
    A: { lat: 46.8, lon: 7.4 },
    B: { lat: 46.801, lon: 7.4 },
  };
  const under = (patch: (draft: ScenarioDraft) => void) =>
    deriveUnloaded(unloadedInputs(scenario(patch), null));

  test("a corde without its diameter stops at `material` under an applied Vent (Q37)", () => {
    const windy = under((draft) => {
      draft.material = rope();
      draft.positions = north;
      draft.wind = { ...draft.wind, speedKmh: 10, directionDeg: 90 };
    });
    expect(windy).toMatchObject({ ok: false, stage: "material", error: null });
    // The same rope in still air needs no diameter: no formula reads it there.
    const calm = under((draft) => {
      draft.material = rope();
      draft.positions = north;
      draft.wind = { ...draft.wind, speedKmh: 0, directionDeg: 90 };
    });
    expect(calm.ok).toBe(true);
  });

  test("a Vent without Positions has no bearing: the line is the still-air one", () => {
    const unplaced = under((draft) => {
      draft.wind = { ...draft.wind, speedKmh: 40, directionDeg: 90 };
    });
    const still = under(() => {});
    if (!unplaced.ok || !still.ok) throw new Error("expected both lines to solve");
    expect(unplaced.aero).toBeNull();
    expect(unplaced.L0).toBe(still.L0);
    expect(unplaced.spatial).toEqual(still.spatial);
  });

  test("a crosswind lifts the line out of the plane: no plane state, a lateral offset", () => {
    const windy = under((draft) => {
      draft.material = rope(11);
      draft.positions = north;
      draft.wind = { ...draft.wind, speedKmh: 40, directionDeg: 90 };
    });
    if (!windy.ok) throw new Error("expected the windy rope to solve");
    expect(windy.aero).not.toBeNull();
    expect(windy.state).toBeNull();
    // From the east onto a line toward the north: pushed west, to the left of A → B (+y, §19.2).
    expect(windy.readings.lateral.value).toBeGreaterThan(0);
    expect(windy.readings.ecart.value).toBeGreaterThan(windy.readings.sag.value);
  });

  test.each(["A", "B"] as const)(
    "the prétension holds at the tensioning anchor %s under wind (§19.7)",
    (side) => {
      const T_target = 3000;
      const windy = under((draft) => {
        draft.material = rope(11);
        draft.positions = north;
        draft.wind = { ...draft.wind, speedKmh: 40, directionDeg: 90 };
        draft.tightness = { mode: "anchor", T_target };
        draft.tensioningSide = side;
      });
      if (!windy.ok) throw new Error("expected the windy rope to solve");
      expect(Math.abs(windy.pose.T / T_target - 1)).toBeLessThan(1e-6);
    },
  );

  test("an unreadable Vent stops at `wind`", () => {
    const negative = under((draft) => {
      draft.material = rope(11);
      draft.positions = north;
      draft.wind = { ...draft.wind, speedKmh: 40, directionDeg: 90, attenuationPct: 140 };
    });
    expect(negative).toMatchObject({ ok: false, stage: "wind", error: null });
  });
});
