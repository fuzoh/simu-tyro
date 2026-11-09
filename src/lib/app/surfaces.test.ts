import { describe, expect, test } from "vitest";

import type { FieldId, FieldIssue } from "@/lib/rail/fields.ts";
import type { Scenario, ScenarioDraft } from "@/lib/scenario/types.ts";
import type { Ride } from "@/lib/sim";
import type { Register } from "@/lib/vocabulary/labels.ts";

import { buildSceneBase, buildSceneFrame } from "@/lib/chart/scene.ts";
import { deducedFrom } from "@/lib/rail/deduced.ts";
import { quasiStaticRow } from "@/lib/rail/dynamics.ts";
import { committedValue, evaluateGates, WIND_UNPLACED } from "@/lib/rail/gates.ts";
import { firstRunDefaults } from "@/lib/scenario/first-run.ts";
import { sweepRiderOf, traverseInputs, traverseScenario } from "@/lib/scenario/traverse.ts";
import { deriveUnloaded, unloadedInputs } from "@/lib/scenario/unloaded.ts";
import { completeFromDefaults, scenarioToSearch, searchToScenario } from "@/lib/url/scenario.ts";
import { parseLinkSearch, validateSearch } from "@/lib/url/schema.ts";

import { errorSurfaces, gatedRides } from "./surfaces.ts";

/**
 * The error surfaces as one composition (« v1 build spec » § 7): what each standing state leaves
 * on screen, read off the surfaces every consumer shares — the banner's occupant, the cause
 * sentence, the two halves of the picture and the `Résultats`.
 */
function surfacesOf(
  patch: (draft: ScenarioDraft) => void,
  form: { focused?: FieldId | null; issues?: readonly FieldIssue[] } = {},
) {
  const scenario = firstRunDefaults() as ScenarioDraft;
  scenario.regime = "en15567";
  patch(scenario);
  const { focused = null, issues = [] } = form;
  const unloaded = deriveUnloaded(unloadedInputs(scenario, null));
  const frame = buildSceneFrame(unloaded.span);
  const solved = buildSceneBase(frame, unloaded, sweepRiderOf(scenario));
  const deduced = deducedFrom(scenario, unloaded);
  const traverse = traverseScenario(traverseInputs(scenario));
  const surfaces = errorSurfaces({
    failure: deduced.failure,
    focused,
    committed: focused === null ? null : committedValue(scenario, focused, deduced),
    frame,
    register: "exact",
    report: evaluateGates({ scenario: traverse, issues }),
    solved,
    traverse,
  });
  return { frame, solved, surfaces };
}

describe("what each standing state leaves on screen", () => {
  test("a sound line keeps both halves, its results, and the verdict in the slot", () => {
    const { frame, solved, surfaces } = surfacesOf(() => {});
    expect(surfaces.frame).toBe(frame);
    expect(surfaces.solved).toBe(solved);
    expect(surfaces.results).not.toBeNull();
    expect(surfaces.cause).toBeNull();
    expect(surfaces.occupant).toMatchObject({ rank: 4, kind: "verdict" });
  });

  test("an invalid portée collapses both plots and every result, with one cause", () => {
    const { surfaces } = surfacesOf((draft) => {
      draft.geometry = { source: "manual", L: -5, h: -18 };
    });
    expect(surfaces).toMatchObject({ frame: null, solved: null, results: null });
    expect(surfaces.cause).toMatch(/^Aucun résultat — /);
    expect(surfaces.occupant).toMatchObject({ rank: 1, target: "L" });
  });

  test("a Clearance breach removes the garde alone: the cable and the results stand", () => {
    const { solved, surfaces } = surfacesOf((draft) => {
      draft.anchors.zA = -2;
    });
    expect(surfaces.clearance).toBe(false);
    expect(surfaces.solved).toBe(solved);
    expect(surfaces.results).not.toBeNull();
  });

  describe("a required field emptied in the form", () => {
    const emptied: FieldIssue = { field: "D_target", kind: "empty", message: "valeur requise" };

    test("under the caret it freezes the picture — « Saisie en cours », nothing suppressed", () => {
      const { solved, surfaces } = surfacesOf(() => {}, {
        focused: "D_target",
        issues: [emptied],
      });
      expect(surfaces.saisie?.field).toBe("D_target");
      expect(surfaces.solved).toBe(solved);
      expect(surfaces.results).not.toBeNull();
      expect(surfaces.cause).toBeNull();
      expect(surfaces.occupant).toMatchObject({ rank: 3, kind: "saisie" });
    });

    test("left blank it blocks, as the same blank arriving in a link would", () => {
      const { surfaces } = surfacesOf(() => {}, { issues: [emptied] });
      expect(surfaces).toMatchObject({ saisie: null, solved: null, results: null });
      expect(surfaces.cause).toMatch(/^Aucun résultat — /);
    });
  });
});

/**
 * A link as a Page reads it once it has arrived — parsed, validated, completed — through the hooks'
 * lib calls in that Page's register, and the rides as every Page reads them: `gatedRides`.
 */
function arrivedOn(query: string, register: Register) {
  const search = validateSearch(parseLinkSearch(query));
  if (search.refused !== undefined) throw new Error(`${query} refused`);
  return readOn(searchToScenario(completeFromDefaults(search).search), register);
}

/** A Scenario as a Page reads it, however it came — a link, a Session or a click. */
function readOn(scenario: ScenarioDraft, register: Register) {
  const unloaded = deriveUnloaded(unloadedInputs(scenario, null));
  const frame = buildSceneFrame(unloaded.span);
  const solved = buildSceneBase(frame, unloaded, sweepRiderOf(scenario));
  const deduced = deducedFrom(scenario, unloaded);
  const traverse = traverseScenario(traverseInputs(scenario));
  const surfaces = errorSurfaces({
    failure: deduced.failure,
    focused: null,
    committed: null,
    frame,
    register,
    report: evaluateGates({ scenario: traverse, register }),
    solved,
    traverse,
  });
  return { scenario, surfaces, reading: gatedRides(surfaces, traverse, null) };
}

/**
 * ADR-0001: a ride value the app refuses arrives as given **and is gated**. The rides are not
 * integrated from it — a negative wind speed is no tail wind, a negative `C_dA` or `ρ` no push —
 * and every place a ride would be read says why instead, in the Page's register.
 */
describe("a ride value the app refuses withholds the rides, and says why", () => {
  const LINE = "?L=200&h=-20&fl=6";

  test("the line itself is ridden on every Page", () => {
    for (const register of ["exact", "terrain"] as const) {
      const { surfaces, reading } = arrivedOn(LINE, register);
      expect(surfaces).toMatchObject({ rideCause: null, windCause: null });
      expect(reading).not.toBeNull();
    }
  });

  test("a negative wind speed: no ride, no Vent, and the statics stand", () => {
    const sound = arrivedOn(LINE, "terrain");
    const { scenario, surfaces, reading } = arrivedOn(`${LINE}&ws=-60&wd=0`, "terrain");
    expect(scenario.wind.speedKmh).toBe(-60);
    expect(reading).toBeNull();
    expect(surfaces.rideCause).toBe("Aucune estimation — vitesse du vent invalide.");
    expect(surfaces.windCause).toBe("Vent indisponible — vitesse du vent invalide.");
    expect(surfaces.cause).toBeNull();
    expect(surfaces.results?.rows).toEqual(sound.surfaces.results?.rows);
  });

  test.each([
    ["C_dA", "cda=-0.45", "surface de traînée C_dA"],
    ["ρ", "rho=-1.2", "masse volumique de l'air ρ"],
  ] as const)("a negative %s: no ride, the Vent still drawn", (_name, key, exact) => {
    const dynamique = arrivedOn(`${LINE}&${key}`, "terrain");
    expect(dynamique.reading).toBeNull();
    expect(dynamique.surfaces.windCause).toBeNull();
    // A simplified Page names no value only Avancé shows: its notice links there instead.
    expect(dynamique.surfaces.rideCause).toBe(
      "Aucune estimation — réglage de la Page Avancé invalide.",
    );

    // Avancé's §12.1 row, which reads the same rides, says it with the field's own name.
    const avance = arrivedOn(`${LINE}&${key}`, "exact");
    expect(quasiStaticRow(avance.reading, avance.surfaces.rideCause)).toEqual({
      value: null,
      warning: null,
      cause: `Aucune estimation — ${exact} invalide.`,
    });
  });

  test("under « Aucun résultat » the line's own cause speaks for the rides", () => {
    const { surfaces, reading } = arrivedOn("?L=-5&cda=-0.45", "exact");
    expect(reading).toBeNull();
    expect(surfaces.cause).toMatch(/^Aucun résultat — /);
    expect(surfaces.rideCause).toBeNull();
  });
});

/**
 * The Vent's direction is geographic, so it is projected on the line through the bearing the
 * Positions give. Without A and B on the map it cannot be: it is kept as given and not applied, and
 * the rides read with it say so — never a cause, never an error.
 */
describe("the Vent needs Positions", () => {
  const LINE = "?L=200&h=-20&fl=6&ws=30&wd=264";
  /** The browser trial's anchors: A → B runs at ≈ 311,9°, so a wind from 264° is ahead, left. */
  const TRIAL = "&lata=46.843556&lona=6.525035&latb=46.846166&lonb=6.520783";

  test("on the trial's Positions the west wind is applied: a head wind from the left", () => {
    const { surfaces, reading } = arrivedOn(`${LINE}${TRIAL}`, "terrain");
    expect(surfaces.windNotice).toBeNull();
    expect(reading?.windless).toBe(false);
    // The head component drags the passager back: the fastest point of the ride is slower.
    const fastest = (ride: Ride | undefined) =>
      Math.max(...(ride?.samples ?? []).map((at) => at.v));
    expect(fastest(reading?.windy)).toBeLessThan(fastest(reading?.calm));
  });

  test("without Positions it is kept as given, not applied, and the rides say so", () => {
    for (const register of ["exact", "terrain"] as const) {
      const { scenario, surfaces, reading } = arrivedOn(LINE, register);
      // Kept: the Scenario and the link it writes back still carry it.
      expect(scenario.wind).toEqual({ speedKmh: 30, directionDeg: 264 });
      expect(scenarioToSearch(scenario as Scenario)).toMatchObject({ ws: 30, wd: 264 });
      // Not applied: both rides are the ride without wind, and nothing is withheld.
      expect(reading).not.toBeNull();
      expect(reading?.windy).toBe(reading?.calm);
      expect(surfaces).toMatchObject({ cause: null, rideCause: null, windCause: null });
      expect(surfaces.results).not.toBeNull();
      expect(surfaces.windNotice).toBe(WIND_UNPLACED.notice);
    }
  });

  test("without Positions and without wind there is nothing to say", () => {
    const { surfaces } = arrivedOn("?L=200&h=-20&fl=6&wd=264", "terrain");
    expect(surfaces.windNotice).toBeNull();
  });

  test("moving an anchor keeps the Vent and turns only its effect on the line", () => {
    const placed = arrivedOn(`${LINE}${TRIAL}`, "terrain");
    // B moved to the east of A: the line now runs east, and the west wind blows from behind.
    const moved = readOn(
      {
        ...placed.scenario,
        positions: { ...placed.scenario.positions, B: { lat: 46.843556, lon: 6.531 } },
      },
      "terrain",
    );
    expect(moved.scenario.wind).toEqual({ speedKmh: 30, directionDeg: 264 });
    expect(scenarioToSearch(moved.scenario as Scenario)).toMatchObject({ ws: 30, wd: 264 });
    expect(moved.surfaces.windNotice).toBeNull();
    const calm = moved.reading?.calm.end;
    const windy = moved.reading?.windy.end;
    if (calm?.kind !== "arrival" || windy?.kind !== "arrival") throw new Error("both reach B");
    expect(windy.v).toBeGreaterThan(calm.v);
  });
});
