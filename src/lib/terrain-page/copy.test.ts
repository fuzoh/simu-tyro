import { describe, expect, test } from "vitest";

import type { StateId } from "@/lib/vocabulary/labels.ts";

import { exactTermsIn, label, proscribedIn } from "@/lib/vocabulary/labels.ts";

import { terrainLabelTable } from "./copy.ts";

/**
 * The Page Terrain's label table against #61's two lists (#101): no word the interface never says,
 * and no term only Avancé names.
 */
const STATES: readonly StateId[] = [
  "dans-les-limites",
  "marge-faible",
  "hors-limites",
  "refuse-usage-interdit",
  "indetermine",
  "aucun-resultat",
];

const table = [...terrainLabelTable(), ...STATES.map((id) => label(id, "terrain"))];

describe("the Page Terrain's label table", () => {
  test.each(table.map((copy) => [copy] as const))("« %s » uses no proscribed word", (copy) => {
    expect(proscribedIn(copy)).toEqual([]);
  });

  test.each(table.map((copy) => [copy] as const))("« %s » uses no exact-register term", (copy) => {
    expect(exactTermsIn(copy)).toEqual([]);
  });
});
