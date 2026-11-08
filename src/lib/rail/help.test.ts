import { describe, expect, test } from "vitest";

import { proscribedIn } from "@/lib/vocabulary/labels.ts";

import { FIELDS } from "./fields.ts";
import {
  CELL_HELP,
  DEDUCED_HELP,
  FIELD_HELP,
  GRID_HELP,
  RESULT_HELP,
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

  test("the installation field is called Installation, never a usage", () => {
    expect(FIELDS.usage.label).toBe("Installation");
    expect(FIELD_HELP.usage).toMatch(/installation permanente/);
  });
});
