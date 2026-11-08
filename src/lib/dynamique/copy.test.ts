import { describe, expect, test } from "vitest";

import { exactTermsIn, proscribedIn } from "@/lib/vocabulary/labels.ts";

import { ridesUnder } from "./__fixtures__/rides.ts";
import { dynamiqueLabelTable, ESTIMATE } from "./copy.ts";

/**
 * The Page Dynamique's label table against #61's two lists (#92): no word the interface never says,
 * and no term only Avancé names. Unlike Statique's, this table says « estimation ».
 */
const printed = [
  ...dynamiqueLabelTable(),
  // The sentences built from the rides: the provenance of each family and the quasi-static warning.
  ...ridesUnder(50, 180).outputs.warnings,
  ridesUnder(0, 0).outputs.constants,
];

describe("the Page Dynamique's label table", () => {
  test.each(printed.map((copy) => [copy] as const))("« %s » uses no proscribed word", (copy) => {
    expect(proscribedIn(copy)).toEqual([]);
  });

  test.each(printed.map((copy) => [copy] as const))(
    "« %s » uses no exact-register term",
    (copy) => {
      expect(exactTermsIn(copy)).toEqual([]);
    },
  );

  test("names the word that qualifies every value", () => {
    expect(ESTIMATE).toBe("estimation");
  });
});
