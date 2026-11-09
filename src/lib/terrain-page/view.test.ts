import { describe, expect, test } from "vitest";

import type { Tone } from "@/lib/app/tone.ts";
import type { ScenarioDraft } from "@/lib/scenario/types.ts";
import type { Ride, VerdictState } from "@/lib/sim";
import type { Trace } from "@/lib/terrain/trace.ts";
import type { Register } from "@/lib/vocabulary/labels.ts";

import { errorSurfaces, gatedRides } from "@/lib/app/surfaces.ts";
import { buildSceneBase, buildSceneFrame } from "@/lib/chart/scene.ts";
import { ridesUnder } from "@/lib/dynamique/__fixtures__/rides.ts";
import { INCOMPLETE } from "@/lib/dynamique/copy.ts";
import { dynamiqueOutputs } from "@/lib/dynamique/outputs.ts";
import { formatAtX, KGF } from "@/lib/format/quantity.ts";
import { deducedFrom, deducedRows } from "@/lib/rail/deduced.ts";
import { evaluateGates } from "@/lib/rail/gates.ts";
import { applyMaterialPreset } from "@/lib/rail/presets.ts";
import { drivingField, railValues } from "@/lib/rail/values.ts";
import { FIRST_RUN_RETAINED_TEXTILE, firstRunDefaults } from "@/lib/scenario/first-run.ts";
import { sweepRiderOf, traverseInputs, traverseScenario } from "@/lib/scenario/traverse.ts";
import { deriveUnloaded, unloadedInputs } from "@/lib/scenario/unloaded.ts";
import { CANONICAL_LINKS } from "@/lib/url/__fixtures__/canonical-links.ts";
import { decodeP1 } from "@/lib/url/p1.ts";
import { completeFromDefaults, searchToScenario } from "@/lib/url/scenario.ts";
import { parseLinkSearch, validateSearch } from "@/lib/url/schema.ts";

import type { TerrainTile, TerrainTileId, TerrainView } from "./view.ts";

import { TERRAIN_TILE_IDS, terrainView } from "./view.ts";

/**
 * The Page Terrain against the Pages it reads from, on the same link (#101). Each Page is built as
 * its hooks build it — the lib calls `usePage` makes, once per link, the error surfaces in that
 * Page's vocabulary — and Terrain's as its own hook does: no form, so the gates judge the Scenario
 * alone, and the rides off the gated traverse as on Dynamique. Avancé's side is spelled from what
 * it renders: the driving field's text and its unit hint, `Valeurs déduites`, `Résultats` and the
 * verdict banner; Dynamique's from its « avec le vent saisi » tiles.
 */
function pagesOn(scenario: ScenarioDraft) {
  const trace: Trace | null =
    scenario.geometry.source === "trace"
      ? { ...decodeP1(scenario.geometry.trace), origin: { kind: "lien" } }
      : null;
  const unloaded = deriveUnloaded(unloadedInputs(scenario, trace));
  const frame = buildSceneFrame(unloaded.span);
  const solved = buildSceneBase(frame, unloaded, sweepRiderOf(scenario));
  const deduced = deducedFrom(scenario, unloaded);
  const traverse = traverseScenario(traverseInputs(scenario));
  const surfacesIn = (register: Register) =>
    errorSurfaces({
      failure: deduced.failure,
      focused: null,
      committed: null,
      frame,
      register,
      report: evaluateGates({ scenario: traverse, register }),
      solved,
      traverse,
    });

  const avance = surfacesIn("exact");
  const surfaces = surfacesIn("terrain");
  const { results, cause, rideCause } = surfaces;
  const reading = gatedRides(surfaces, traverse, trace);
  const terrain = terrainView({ scenario, deduced, results, cause, rideCause, reading });
  return { deduced, avance, cause, reading, surfaces, terrain };
}

/** A link as the app holds it once it has arrived: parsed, validated, completed. */
function arrived(query: string): ScenarioDraft {
  const search = validateSearch(parseLinkSearch(query));
  if (search.refused !== undefined) throw new Error(`${query} refused`);
  return searchToScenario(completeFromDefaults(search).search);
}

function tile(view: TerrainView, id: TerrainTileId): TerrainTile {
  const found = view.tiles.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no tile ${id}`);
  return found;
}

/** Every function reachable from a value — what a model that hands out setters would carry. */
function functionsIn(value: unknown, path = "model"): readonly string[] {
  if (typeof value === "function") return [path];
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, inner]) => functionsIn(inner, `${path}.${key}`));
}

/** The colour each Verdict State is drawn in on every Page, as `docs/conventions/ui.md` has it. */
const STATE_TONE: Record<VerdictState, Tone> = {
  "dans-les-limites": "plain",
  "marge-faible": "warning",
  "hors-limites": "destructive",
  "refuse-usage-interdit": "destructive",
  indetermine: "muted",
};

describe.each(CANONICAL_LINKS.map((fixture) => [fixture.name, fixture.scenario] as const))(
  "%s",
  (_name, linked) => {
    const scenario: ScenarioDraft = linked;
    const { deduced, avance, reading, terrain } = pagesOn(scenario);
    const fields = railValues(scenario, deduced);
    const rows = deducedRows(scenario, deduced, avance.cause);
    const row = (id: string) => rows.find((candidate) => candidate.id === id)?.value ?? null;
    const driver = drivingField(scenario);
    const shown = (id: TerrainTileId) => {
      const { value, kind } = tile(terrain, id);
      return kind === "absent" ? null : value;
    };

    test("prints its five tiles in the order the Skeleton reserves them", () => {
      expect(terrain.tiles.map(({ id }) => id)).toEqual(TERRAIN_TILE_IDS);
    });

    test("the tension de pose is the prétension Avancé shows", () => {
      const avanceShown =
        driver === "T_target" ? `${fields.T_target} ${scenario.unit}` : row("pretension");
      expect(shown("pretension")).toBe(avanceShown);
    });

    test("the flèche is the flèche à vide Avancé shows", () => {
      const { notes } = tile(terrain, "sag");
      const value = shown("sag");
      const avanceShown = driver === "D_target" ? `${fields.D_target} m` : row("sag");
      const terrainShown =
        driver === "D_target" || value === null ? value : `${value} (${notes.join("")})`;
      expect(terrainShown).toBe(avanceShown);
    });

    test("the garde au sol is Avancé's, drawn in the destructive tone exactly when hors limites", () => {
      const avanceRow = avance.results?.rows.find(({ id }) => id === "clearance") ?? null;
      expect(shown("clearance")).toBe(avanceRow?.value ?? null);
      expect(tile(terrain, "clearance").tone === "destructive").toBe(
        avanceRow?.state === "hors-limites",
      );
    });

    test("the vitesse d'arrivée is Dynamique's « avec le vent saisi », an estimation", () => {
      const arrival = tile(terrain, "arrival");
      const windy =
        reading === null ? null : dynamiqueOutputs(reading, scenario.material.family).rides[1];
      expect({
        scope: arrival.scope,
        value: shown("arrival"),
        estimation: arrival.notes.includes("estimation"),
      }).toEqual({
        scope: "avec le vent saisi",
        value: windy === null ? null : (windy.arrival?.kmh ?? "pas d'arrivée"),
        estimation: windy !== null,
      });
    });

    test("no other tile says « estimation »", () => {
      const others = terrain.tiles.filter(({ id }) => id !== "arrival");
      expect(others.flatMap(({ value, notes }) => [value, ...notes]).join(" ")).not.toMatch(
        /estimation/,
      );
    });

    test("the Verdict is the state Avancé's banner carries, in that state's colour", () => {
      const state = avance.results?.banner?.state ?? null;
      const sentence = avance.results?.rows.find(({ id }) => id === "verdict")?.value ?? "";
      const verdict = tile(terrain, "verdict");
      expect({ kind: verdict.kind, tone: verdict.tone }).toEqual(
        state === null
          ? { kind: "absent", tone: "muted" }
          : { kind: "word", tone: STATE_TONE[state] },
      );
      expect(state === null || sentence.startsWith(verdict.value)).toBe(true);
    });

    test("exposes no setter: the model is data, with no function anywhere in it", () => {
      expect(functionsIn(terrain)).toEqual([]);
    });
  },
);

describe("the tension de pose takes the warning colour exactly when the limite warns", () => {
  // A Courant Bandit 11 mm on a Maestro S: Petzl's 250 kg on that diameter, 250 × 9,80665 =
  // 2451,66 N per member.
  const onDevice = (device: ScenarioDraft["tensioningDevice"], T: number): ScenarioDraft => ({
    ...applyMaterialPreset(
      {
        ...(firstRunDefaults() as ScenarioDraft),
        usage: "TEMPORAIRE",
        material: { ...FIRST_RUN_RETAINED_TEXTILE.spec },
      },
      "courant-bandit-11",
    ),
    tensioningDevice: device,
    tightness: { mode: "anchor", T_target: T },
  });

  test.each([
    ["under the limit", "maestro-s", 2400, false],
    ["just over it", "maestro-s", 2452, true],
    ["well over it", "maestro-s", 300 * KGF, true],
    ["on a mouflage, which has no published limit", "pulley", 300 * KGF, false],
  ] as const)("%s", (_name, device, T, warned) => {
    const { cause, terrain } = pagesOn(onDevice(device, T));
    expect(cause).toBeNull();
    const pretension = tile(terrain, "pretension");
    expect(pretension.kind).toBe("quantity");
    expect(pretension.tone === "warning").toBe(warned);
    expect(pretension.warning?.startsWith("la tension demandée dépasse") ?? false).toBe(warned);
  });

  test("with no value to print, neither the warning nor its colour", () => {
    // A corde in a permanent installation: a Solve Gate breach unrelated to the tension.
    const { cause, terrain } = pagesOn({
      ...onDevice("maestro-s", 300 * KGF),
      usage: "PERMANENTE",
    });
    expect(cause).toMatch(/^Aucun résultat — /);
    expect(tile(terrain, "pretension")).toMatchObject({
      kind: "absent",
      value: cause,
      tone: "muted",
      warning: null,
    });
  });
});

describe("the vitesse d'arrivée", () => {
  const SHIPPED = firstRunDefaults() as ScenarioDraft;

  test("arrives on the shipped line without wind: km/h on the tile, m/s and « estimation » under", () => {
    const { reading } = ridesUnder(0, 0);
    const { terrain } = pagesOn({ ...SHIPPED, wind: { speedKmh: 0, directionDeg: 0 } });
    if (reading.windy.end.kind !== "arrival") throw new Error("the shipped line arrives");
    expect(tile(terrain, "arrival")).toMatchObject({
      kind: "quantity",
      tone: "plain",
      value: expect.stringMatching(/ km\/h$/),
      notes: [expect.stringMatching(/ m\/s$/), "estimation"],
    });
  });

  test("a head wind that stops the passager: « pas d'arrivée », and the Point d'arrêt", () => {
    const { reading } = ridesUnder(50, 0);
    if (reading.windy.end.kind !== "stop") throw new Error("a 50 km/h head wind stops the ride");
    const { terrain } = pagesOn({ ...SHIPPED, wind: { speedKmh: 50, directionDeg: 0 } });
    expect(tile(terrain, "arrival")).toMatchObject({
      kind: "word",
      value: "pas d'arrivée",
      notes: [`point d'arrêt ${formatAtX(reading.windy.end.x)}`, "estimation"],
    });
  });

  test("a ride that never settles: « pas d'arrivée », and that it keeps swinging", () => {
    const { reading } = ridesUnder(0, 0);
    const swinging: Ride = { ...reading.calm, end: { kind: "unsettled", t: 120 } };
    const view = terrainView({
      scenario: SHIPPED,
      deduced: pagesOn(SHIPPED).deduced,
      results: null,
      cause: null,
      rideCause: null,
      reading: { ...reading, calm: swinging, windy: swinging },
    });
    expect(tile(view, "arrival")).toMatchObject({
      kind: "word",
      value: "pas d'arrivée",
      notes: ["oscille sans s'arrêter", "estimation"],
    });
  });

  test("no ride under a cause, and none on an incomplete traverse — each says why", () => {
    const refused = pagesOn({ ...SHIPPED, tightness: { mode: "length", L0: 100 } });
    expect(tile(refused.terrain, "arrival")).toMatchObject({
      kind: "absent",
      value: refused.cause,
      notes: [],
    });
    const incomplete = terrainView({
      scenario: SHIPPED,
      deduced: refused.deduced,
      results: null,
      cause: null,
      rideCause: null,
      reading: null,
    });
    expect(tile(incomplete, "arrival")).toMatchObject({ kind: "absent", value: INCOMPLETE });
  });
});

/**
 * A ride value the app refuses arrives as given and is gated (ADR-0001): the tile withholds the
 * ride rather than integrate it, and says why — this Page has no field to carry the ⛔.
 */
describe("the vitesse d'arrivée under a ride value the app refuses", () => {
  const LINE = "?L=200&h=-20&fl=6";

  test("the line itself arrives, and its vitesse d'arrivée is printed", () => {
    expect(tile(pagesOn(arrived(LINE)).terrain, "arrival")).toMatchObject({
      kind: "quantity",
      notes: [expect.stringMatching(/ m\/s$/), "estimation"],
    });
  });

  test("a negative wind speed is not read as a tail wind: no ride, and the field named", () => {
    const { reading, surfaces, terrain } = pagesOn(arrived(`${LINE}&ws=-60&wd=0`));
    expect(reading).toBeNull();
    expect(tile(terrain, "arrival")).toMatchObject({
      kind: "absent",
      tone: "muted",
      value: "Aucune estimation — vitesse du vent invalide.",
      notes: [],
    });
    // The rose and the Banane withhold the same Vent.
    expect(surfaces.windCause).toBe("Vent indisponible — vitesse du vent invalide.");
    expect(surfaces.occupant).toMatchObject({
      rank: 1,
      text: "⛔ 1 erreur bloquante — vent indisponible",
      target: "windSpeed",
    });
  });

  test.each([
    ["a negative C_dA", "cda=-0.45", "CdA"],
    ["a negative air density", "rho=-1.2", "rho"],
  ] as const)(
    "%s does not speed the passager up: no ride, and Avancé named",
    (_name, key, field) => {
      const { reading, surfaces, terrain } = pagesOn(arrived(`${LINE}&${key}`));
      expect(reading).toBeNull();
      expect(tile(terrain, "arrival")).toMatchObject({
        kind: "absent",
        value: "Aucune estimation — réglage de la Page Avancé invalide.",
      });
      expect(surfaces.windCause).toBeNull();
      expect(surfaces.occupant).toMatchObject({
        rank: 1,
        text: "⛔ 1 erreur bloquante — aucune estimation",
        target: field,
      });
      // The statics stand: the other tiles read as on the line without the bad value.
      const sound = pagesOn(arrived(LINE)).terrain;
      for (const id of ["pretension", "sag", "clearance"] as const) {
        expect(tile(terrain, id)).toEqual(tile(sound, id));
      }
    },
  );
});

describe("the Verdict tile", () => {
  const SHIPPED = firstRunDefaults() as ScenarioDraft;

  test("an « Interdit » in the destructive tone, with its reason under it", () => {
    const { terrain } = pagesOn({
      ...SHIPPED,
      regime: "en15567",
      terminations: { ...SHIPPED.terminations, A: { id: "serre-cables-etrier", eta: 0.8 } },
    });
    expect(tile(terrain, "verdict")).toMatchObject({
      kind: "word",
      value: "Interdit",
      tone: "destructive",
      notes: ["serre-câbles sur une ligne portant des passagers"],
    });
  });

  test("neutral without a marge exigée: nothing was judged", () => {
    expect(tile(pagesOn(SHIPPED).terrain, "verdict")).toMatchObject({
      kind: "absent",
      tone: "muted",
      value: "Choisissez une marge exigée pour obtenir un verdict.",
    });
  });

  test("neutral under a cause, which it names", () => {
    const { terrain, cause } = pagesOn({ ...SHIPPED, tightness: { mode: "length", L0: 100 } });
    expect(tile(terrain, "verdict")).toMatchObject({ kind: "absent", tone: "muted", value: cause });
  });
});
