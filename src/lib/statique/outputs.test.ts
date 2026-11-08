import { describe, expect, test } from "vitest";

import type { ScenarioDraft } from "@/lib/scenario/types.ts";
import type { Trace } from "@/lib/terrain/trace.ts";
import type { Register } from "@/lib/vocabulary/labels.ts";

import { errorSurfaces } from "@/lib/app/surfaces.ts";
import { buildSceneBase, buildSceneFrame } from "@/lib/chart/scene.ts";
import { KGF } from "@/lib/format/quantity.ts";
import { deducedFrom, deducedRows } from "@/lib/rail/deduced.ts";
import { evaluateGates } from "@/lib/rail/gates.ts";
import { applyMaterialPreset } from "@/lib/rail/presets.ts";
import { drivingField, railValues } from "@/lib/rail/values.ts";
import { FIRST_RUN_RETAINED_TEXTILE, firstRunDefaults } from "@/lib/scenario/first-run.ts";
import { sweepRiderOf, traverseInputs, traverseScenario } from "@/lib/scenario/traverse.ts";
import { deriveUnloaded, unloadedInputs } from "@/lib/scenario/unloaded.ts";
import { CANONICAL_LINKS } from "@/lib/url/__fixtures__/canonical-links.ts";
import { decodeP1 } from "@/lib/url/p1.ts";

import type { StatiqueOutput, StatiqueOutputId } from "./outputs.ts";

import { pretensionField, STATIQUE_OUTPUT_IDS, statiqueOutputs } from "./outputs.ts";

/**
 * The Page Statique against the Page Avancé, on the same link (#91): the four outputs and the
 * Verdict read the same at display precision. Each Page is built as `usePage` builds it — the
 * hooks' lib calls, once per link, then the one composition of the error surfaces both Pages read,
 * in that Page's vocabulary — and Avancé's side is spelled from what it renders: the driving
 * field's text and its unit hint, the `Valeurs déduites` rows, the `Résultats` rows and the
 * verdict banner.
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
  // An arrival: the form holds the Scenario's own text, so no field is mid-edit or unreadable.
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
  const { results, cause } = surfacesIn("terrain");
  const statique = statiqueOutputs({ scenario, deduced, results, cause });
  return { deduced, cause, avance, statique, field: pretensionField({ scenario, deduced, cause }) };
}

function output(outputs: readonly StatiqueOutput[], id: StatiqueOutputId): StatiqueOutput {
  const found = outputs.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no output ${id}`);
  return found;
}

describe.each(CANONICAL_LINKS.map((fixture) => [fixture.name, fixture.scenario] as const))(
  "%s",
  (_name, linked) => {
    const scenario: ScenarioDraft = linked;
    const { deduced, avance, statique } = pagesOn(scenario);
    const fields = railValues(scenario, deduced);
    const rows = deducedRows(scenario, deduced, avance.cause);
    const row = (id: string) => rows.find((candidate) => candidate.id === id)?.value ?? null;
    const driver = drivingField(scenario);

    test("the tension de pose is the prétension Avancé shows", () => {
      const shown =
        driver === "T_target" ? `${fields.T_target} ${scenario.unit}` : row("pretension");
      expect(output(statique.outputs, "pretension").value).toBe(shown);
    });

    test("the flèche is the flèche à vide Avancé shows", () => {
      const { value, qualifier } = output(statique.outputs, "sag");
      // On the flèche driver Avancé shows the field and its unit hint; otherwise the row, which
      // carries where the flèche sits in parentheses.
      const avanceShown = driver === "D_target" ? `${fields.D_target} m` : row("sag");
      const statiqueShown =
        driver === "D_target" || value === null ? value : `${value} (${qualifier})`;
      expect(statiqueShown).toBe(avanceShown);
    });

    test("the flèche chargée and the garde au sol are Avancé's `Résultats` rows", () => {
      for (const id of ["loadedSag", "clearance"] as const) {
        const avanceRow = avance.results?.rows.find((candidate) => candidate.id === id) ?? null;
        const tile = output(statique.outputs, id);
        expect(tile.value).toBe(avanceRow?.value ?? null);
        expect(tile.breach).toBe(avanceRow?.state === "hors-limites");
      }
    });

    test("the Verdict is the state Avancé's banner carries", () => {
      const state = avance.results?.banner?.state ?? null;
      const sentence =
        avance.results?.rows.find((candidate) => candidate.id === "verdict")?.value ?? "";
      const { verdict } = statique;
      const shown =
        verdict.kind === "state"
          ? { state: verdict.state, opensAvanceSentence: sentence.startsWith(verdict.label) }
          : null;
      expect(shown).toEqual(state === null ? null : { state, opensAvanceSentence: true });
    });
  },
);

describe("what the Page prints in place of a value", () => {
  const SHIPPED = firstRunDefaults() as ScenarioDraft;

  test("the shipped line: four values, and a request for a marge exigée", () => {
    const { statique } = pagesOn(SHIPPED);
    expect(statique.outputs.map((tile) => tile.absent)).toEqual([null, null, null, null]);
    expect(statique.verdict).toEqual({
      kind: "no-regime",
      text: "Choisissez une marge exigée pour obtenir un verdict.",
    });
  });

  test("the traverse scope qualifies the two traverse aggregates, and only them", () => {
    const { statique } = pagesOn(SHIPPED);
    expect(Object.fromEntries(statique.outputs.map((tile) => [tile.id, tile.scope]))).toEqual({
      pretension: null,
      sag: null,
      loadedSag: "sur toute la traversée",
      clearance: "sur toute la traversée",
    });
  });

  test("the tension de pose is read per line, at the anchor carrying the Mise en tension", () => {
    const { statique } = pagesOn({ ...SHIPPED, tensioningSide: "B" });
    expect(output(statique.outputs, "pretension").qualifier).toBe("par ligne, ancrage B");
  });

  test("a refused solve leaves every tile on the cause sentence, never a dash", () => {
    // `L₀` shorter than the chord: §5.4's bound, « Tension impossible ».
    const { statique, cause } = pagesOn({ ...SHIPPED, tightness: { mode: "length", L0: 100 } });
    expect(cause).toMatch(/^Aucun résultat — /);
    for (const tile of statique.outputs) {
      expect(tile.value).toBeNull();
      expect(tile.absent).toBe(cause);
    }
    expect(statique.verdict).toEqual({ kind: "none", text: cause });
  });

  // The driver's own value is still in the Scenario under a cause — the last one the gates took.
  test.each([
    ["a tension de pose the line cannot reach", { mode: "anchor", T_target: 1 }],
    ["a flèche the line cannot reach", { mode: "sag", D_target: 0.01 }],
  ] as const)("%s prints no driver value as a result, nor its warning", (_name, tightness) => {
    const { statique, cause } = pagesOn({ ...SHIPPED, tightness });
    expect(cause).toMatch(/^Aucun résultat — /);
    for (const tile of statique.outputs) {
      expect(tile.value).toBeNull();
      expect(tile.absent).toBe(cause);
      expect(tile.warning).toBeNull();
    }
  });

  test("an « Interdit » carries its reason in the terrain register", () => {
    const { statique } = pagesOn({
      ...SHIPPED,
      regime: "en15567",
      terminations: { ...SHIPPED.terminations, A: { id: "serre-cables-etrier", eta: 0.8 } },
    });
    expect(statique.verdict).toEqual({
      kind: "state",
      state: "refuse-usage-interdit",
      label: "Interdit",
      reason: "serre-câbles sur une ligne portant des passagers",
    });
  });

  test("a chosen marge exigée over a sound line is judged, with no reason attached", () => {
    const { statique } = pagesOn({ ...SHIPPED, regime: "en15567" });
    expect(statique.verdict).toMatchObject({ kind: "state", reason: null });
  });
});

describe("the tension de pose field warns as Avancé does", () => {
  // A Courant Bandit 11 mm on a Maestro S, whose working load on that diameter is 250 kg.
  const onMaestro = (patch: Partial<ScenarioDraft>): ScenarioDraft => ({
    ...applyMaterialPreset(
      {
        ...(firstRunDefaults() as ScenarioDraft),
        usage: "TEMPORAIRE",
        material: { ...FIRST_RUN_RETAINED_TEXTILE.spec },
      },
      "courant-bandit-11",
    ),
    tensioningDevice: "maestro-s",
    ...patch,
  });
  const overLimit = { mode: "anchor", T_target: 300 * KGF } as const;
  // A rope in a permanent installation: a Solve Gate breach that has nothing to do with tension.
  const unrelatedCause = { usage: "PERMANENTE" } as const;

  test("a typed tension over the limit is warned on the field and on the tile", () => {
    const { field, statique, cause } = pagesOn(onMaestro({ tightness: overLimit }));
    expect(cause).toBeNull();
    expect(field.warning).toMatch(/^la tension demandée dépasse/);
    expect(output(statique.outputs, "pretension").warning).toBe(field.warning);
  });

  test("under an unrelated cause the field keeps it, where the tile has nothing to print", () => {
    const { field, statique, cause } = pagesOn(
      onMaestro({ tightness: overLimit, ...unrelatedCause }),
    );
    expect(cause).toMatch(/^Aucun résultat — /);
    expect(field.warning).toMatch(/^la tension demandée dépasse/);
    expect(output(statique.outputs, "pretension").warning).toBeNull();
  });

  test("another driver's read-out goes with the solve, and its warning with it", () => {
    const tight = { tightness: { mode: "sag", D_target: 0.5 } } as const;
    expect(pagesOn(onMaestro(tight)).field.warning).toMatch(/^la tension demandée dépasse/);
    const { field, cause } = pagesOn(onMaestro({ ...tight, ...unrelatedCause }));
    expect(cause).toMatch(/^Aucun résultat — /);
    expect(field).toEqual({ readOut: null, warning: null });
  });
});

test("the Page prints its four outputs in the order the Skeleton reserves them", () => {
  const { statique } = pagesOn(firstRunDefaults() as ScenarioDraft);
  expect(statique.outputs.map((tile) => tile.id)).toEqual(STATIQUE_OUTPUT_IDS);
});
