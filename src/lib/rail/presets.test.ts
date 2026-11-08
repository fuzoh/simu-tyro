import { describe, expect, test } from "vitest";

import type { ScenarioDraft, TextileDraft } from "@/lib/scenario/types.ts";

import { completeScenario } from "@/lib/app/persist.ts";
import { FIRST_RUN_RETAINED_TEXTILE, FIRST_RUN_SCENARIO } from "@/lib/scenario/first-run.ts";
import { completeFromDefaults, scenarioToSearch, searchToScenario } from "@/lib/url/scenario.ts";
import { canonicalLink, parseLinkSearch, validateSearch } from "@/lib/url/schema.ts";

import { COURANT_BANDIT_11 as SHEET } from "./__fixtures__/courant-bandit.ts";
import { applyMaterialPreset, presetProvenance } from "./presets.ts";
import { provenanceAggregate } from "./provenance.ts";
import { applyField, applyRopeClass } from "./values.ts";

const G = 9.81;

const textileDraft: ScenarioDraft = {
  ...FIRST_RUN_SCENARIO,
  usage: "TEMPORAIRE",
  material: { ...FIRST_RUN_RETAINED_TEXTILE.spec },
};

function filled(): TextileDraft {
  const { material } = applyMaterialPreset(textileDraft, "courant-bandit-11");
  if (material.family !== "textile") throw new Error("expected a textile spec");
  return material;
}

describe("Courant Bandit 11 mm preset", () => {
  test("fills the spec with the datasheet figures", () => {
    const material = filled();
    expect(material.ropeClass).toBe(SHEET.ropeClass.value);
    expect(material.MBL).toBeCloseTo(SHEET.mblDaN.value * 10, 6);
    expect(material.mu).toBeCloseTo(SHEET.linearMassGramsPerMetre.value / 1000, 9);
    expect(material.d).toBe(SHEET.diameterMm.value);
  });

  test("derives EA ≈ 39 kN from the 2,5 % elongation, and k = EA / MBL ≈ 1,27", () => {
    const { MBL, k } = filled();
    if (MBL === null || k === null) throw new Error("the preset fills MBL and k");
    const EA = MBL * k;
    const fromSheet =
      ((SHEET.elongation.toKg - SHEET.elongation.fromKg) * G) / SHEET.elongation.fraction;
    expect(EA / 1000).toBeCloseTo(SHEET.eaKiloNewtons.value, 0);
    expect(Math.abs(EA - fromSheet) / fromSheet).toBeLessThan(0.01);
    expect(k).toBeCloseTo(SHEET.kRelative.value, 2);
  });

  test("keeps the terminations and ignores a steel spec", () => {
    expect(applyMaterialPreset(textileDraft, "courant-bandit-11").terminations).toEqual(
      textileDraft.terminations,
    );
    expect(applyMaterialPreset(FIRST_RUN_SCENARIO, "courant-bandit-11")).toBe(FIRST_RUN_SCENARIO);
  });

  test("every filled value cites the datasheet, and k is unconfirmed with the 3,5 % note", () => {
    const chips = presetProvenance(filled());
    for (const id of ["cls", "MBL", "muTextile", "dTextile"] as const) {
      expect(chips[id]?.detail).toContain("12/09/2022");
      expect(chips[id]?.label).toContain("Courant");
    }
    expect(chips.k?.label).toBe("non confirmé");
    expect(chips.k?.detail).toContain("3,5 %");
    expect(chips.k?.detail).toContain("12/09/2022");
  });

  test("an edited value reads « valeur utilisateur » and the others keep the datasheet", () => {
    const edited = applyField(
      applyMaterialPreset(textileDraft, "courant-bandit-11"),
      "MBL",
      30_000,
    );
    if (edited.material.family !== "textile") throw new Error("expected a textile spec");
    const chips = presetProvenance(edited.material);
    expect(chips.MBL?.label).toBe("valeur utilisateur");
    expect(chips.muTextile?.label).toContain("Courant");
  });

  test("two edited fields leave the others with their sheet chip and k still unconfirmed", () => {
    const edited = applyField(
      applyField(applyMaterialPreset(textileDraft, "courant-bandit-11"), "MBL", 30_000),
      "muTextile",
      0.07,
    );
    if (edited.material.family !== "textile") throw new Error("expected a textile spec");
    const chips = presetProvenance(edited.material);
    expect(chips.MBL?.label).toBe("valeur utilisateur");
    expect(chips.muTextile?.label).toBe("valeur utilisateur");
    expect(chips.dTextile?.label).toContain("Courant");
    expect(chips.cls?.label).toContain("Courant");
    expect(chips.k?.label).toBe("non confirmé");
  });

  test("k edited to the class's shipped default reads « valeur utilisateur »", () => {
    const edited = applyField(applyMaterialPreset(textileDraft, "courant-bandit-11"), "k", 1.5);
    if (edited.material.family !== "textile") throw new Error("expected a textile spec");
    expect(presetProvenance(edited.material).k?.label).toBe("valeur utilisateur");
  });

  test("an 11 mm diameter typed on the shipped rope carries no chip", () => {
    expect(presetProvenance({ ...FIRST_RUN_RETAINED_TEXTILE.spec, d: 11 })).toEqual({});
  });

  test("a lone MBL of 3100 daN carries no chip", () => {
    expect(presetProvenance({ ...FIRST_RUN_RETAINED_TEXTILE.spec, MBL: 31_000 })).toEqual({});
  });

  test("a class switch after a fill leaves the class's shipped k without a chip", () => {
    const switched = applyRopeClass(applyMaterialPreset(textileDraft, "courant-bandit-11"), "hmpe");
    if (switched.material.family !== "textile") throw new Error("expected a textile spec");
    const chips = presetProvenance(switched.material);
    expect(chips.k).toBeUndefined();
    expect(chips.cls?.label).toBe("valeur utilisateur");
    expect(chips.MBL?.label).toContain("Courant");
  });

  test("the Provenance section's k entry carries the preset's deduction note", () => {
    const aggregate = provenanceAggregate({ ...textileDraft, material: filled() });
    const k = aggregate.entries.find((entry) => entry.id === "k");
    expect(k?.detail).toContain("3,5 %");
    const textile = aggregate.entries.find((entry) => entry.id === "EAtextile");
    expect(textile?.detail).toContain("3,5 %");
  });

  test("a rope typed by hand carries no chip", () => {
    expect(presetProvenance({ ...FIRST_RUN_RETAINED_TEXTILE.spec, MBL: 20_000, mu: 0.05 })).toEqual(
      {},
    );
  });

  test("the link copied after filling decodes to the same values", () => {
    const scenario = completeScenario(applyMaterialPreset(textileDraft, "courant-bandit-11"));
    if (scenario === null) throw new Error("a filled preset is a complete scenario");
    const link = canonicalLink(scenarioToSearch(scenario), "/");
    const search = validateSearch(parseLinkSearch(link.slice(2)));
    if (search.refused !== undefined) throw new Error("refused");
    const { search: completed, completed: filledIn } = completeFromDefaults(search);
    expect(searchToScenario(completed).material).toEqual(scenario.material);
    expect(filledIn).toEqual([]);
  });
});
