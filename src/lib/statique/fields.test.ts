import { describe, expect, test } from "vitest";

import type { FieldId } from "@/lib/rail/fields.ts";
import type { Geometry, ScenarioDraft } from "@/lib/scenario/types.ts";

import { FIELD_ORDER } from "@/lib/rail/fields.ts";
import { FIRST_RUN_RETAINED_TEXTILE, firstRunDefaults } from "@/lib/scenario/first-run.ts";

import { shownOnStatique } from "./fields.ts";

/**
 * What the Page Statique shows, per Scenario (#91): the ticket's fields — the profil's portée and
 * dénivelé in manual geometry, the line's diamètre and charge de rupture in its own family — and
 * nothing Avancé alone sets: no majoration au départ, no rendement, no terminaison, no rapport V.
 */
const MANUAL: Geometry = { source: "manual", L: 150, h: -18 };
const IMPORTED: Geometry = { source: "trace", trace: "p1" };
const STEEL: ScenarioDraft["material"] = firstRunDefaults().material;
const TEXTILE: ScenarioDraft["material"] = FIRST_RUN_RETAINED_TEXTILE.spec;

/** The fields shown whatever the Scenario. */
const ALWAYS: readonly FieldId[] = [
  "zA",
  "zB",
  "family",
  "carryingLines",
  "tensioningDevice",
  "tensioningSide",
  "T_target",
  "mp",
  "regime",
  "windSpeed",
  "windDirection",
  "usage",
  "hClearMin",
  "hRider",
];

describe("the fields the Page Statique shows", () => {
  test.each([
    ["a câble in manual geometry", MANUAL, STEEL, ["L", "h", "d", "mbfOverride"]],
    ["a câble on an imported profil", IMPORTED, STEEL, ["d", "mbfOverride"]],
    ["a corde in manual geometry", MANUAL, TEXTILE, ["L", "h", "dTextile", "MBL"]],
    ["a corde on an imported profil", IMPORTED, TEXTILE, ["dTextile", "MBL"]],
  ] as const)("%s: the ticket's fields, and only them", (_name, geometry, material, own) => {
    const shown = FIELD_ORDER.filter((id) => shownOnStatique(id, { geometry, material }));
    expect(new Set(shown)).toEqual(new Set([...ALWAYS, ...own]));
  });
});
