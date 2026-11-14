import { describe, expect, test } from "vitest";

import { proscribedIn } from "@/lib/vocabulary/labels.ts";

import { FIELDS } from "./fields.ts";
import {
  CELL_HELP,
  DEDUCED_HELP,
  FIELD_HELP,
  GEOADMIN_HELP,
  GRID_HELP,
  LV95_HELP,
  QUASI_STATIC_HELP,
  RESULT_HELP,
  TENSION_LIMIT_HELP,
  TIGHTNESS_HELP,
} from "./help.ts";
import { NOT_COMPUTED_LINES, PROVENANCE_COPY } from "./provenance.ts";

/** Every string of the Rail's static copy, keyed by where it lives, so a failure names it. */
function copyByKey(): Record<string, string> {
  const tables = { FIELD_HELP, DEDUCED_HELP, RESULT_HELP, GRID_HELP, CELL_HELP, PROVENANCE_COPY };
  const entries: [string, string][] = Object.entries(tables).flatMap(([table, rows]) =>
    Object.entries(rows).map(([key, text]): [string, string] => [`${table}.${key}`, String(text)]),
  );
  entries.push(["TIGHTNESS_HELP", TIGHTNESS_HELP]);
  entries.push(["LV95_HELP", LV95_HELP]);
  entries.push(["GEOADMIN_HELP", GEOADMIN_HELP]);
  entries.push(["TENSION_LIMIT_HELP", TENSION_LIMIT_HELP]);
  entries.push(["QUASI_STATIC_HELP", QUASI_STATIC_HELP]);
  NOT_COMPUTED_LINES.forEach((line, index) => entries.push([`NOT_COMPUTED_LINES[${index}]`, line]));
  for (const field of Object.values(FIELDS)) {
    entries.push([`FIELDS.${field.id}.label`, field.label]);
    entries.push([`FIELDS.${field.id}.errorLabel`, field.errorLabel]);
    if (field.warning !== null) entries.push([`FIELDS.${field.id}.warning`, field.warning.copy]);
    if (field.rule !== null && "sentence" in field.rule) {
      entries.push([`FIELDS.${field.id}.rule`, field.rule.sentence]);
    }
  }
  return Object.fromEntries(entries);
}

describe("the Rail speaks the exact register", () => {
  test("none of its static copy says a word the interface never says", () => {
    const offences = Object.entries(copyByKey()).flatMap(([key, text]) =>
      proscribedIn(text).map((word) => `${key}: ${word}`),
    );
    expect(offences).toEqual([]);
  });

  test("the profil geo.admin is named as such, with swisstopo's attribution (#103)", () => {
    expect(GEOADMIN_HELP).toContain("profil geo.admin");
    expect(GEOADMIN_HELP).toContain("© swisstopo");
    expect(LV95_HELP).toContain("profil geo.admin");
  });

  test("the installation field is called Installation, never a usage", () => {
    expect(FIELDS.usage.label).toBe("Installation");
    expect(FIELD_HELP.usage).toMatch(/installation permanente/);
  });

  // GLOSSARY.md, Tension interne — avoided: « tension totale », which names the régime's criterion.
  test("the tension at a point is the tension interne, as the graph under it titles it (#119)", () => {
    expect(DEDUCED_HELP.H).toContain("la tension interne en un point vaut T = H / cos θ");
    expect(DEDUCED_HELP.H).not.toContain("tension totale");
  });

  // The row's one `ⓘ` is this help: no ride, garde or Verdict on Avancé reads the field.
  test("the target of the farthest point says which Page reads it (#121)", () => {
    expect(FIELD_HELP.reachTarget).toContain(
      "La Page Dynamique en déduit une proposition — monter ou descendre B de tant, A restant fixe",
    );
  });
});
