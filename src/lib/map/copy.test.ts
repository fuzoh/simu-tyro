/**
 * The vue de dessus's words (#93): what the next click does, and where each anchor is drawn — in
 * the terrain register, as every line the map prints. The fixed strings are also in the Page
 * Statique's label table (`@/lib/statique/copy.test.ts`); these are the sentences built from
 * Positions.
 */

import { describe, expect, test } from "vitest";

import { TRIAL_ENDS } from "@/lib/terrain/__fixtures__/geoadmin-2026-11-08.ts";
import { exactTermsIn, proscribedIn } from "@/lib/vocabulary/labels.ts";

import { anchorReading, clickHint, mapLabelTable } from "./copy.ts";

const PARIS = { lat: 48.85, lon: 2.35 };

describe("the hint under the map", () => {
  test("asks to place an anchor not yet known, to move one that is", () => {
    expect(clickHint("A", { A: null, B: null })).toBe("Cliquez sur la carte pour placer A.");
    expect(clickHint("B", TRIAL_ENDS)).toBe("Cliquez sur la carte pour déplacer B.");
  });

  test("is silent when a click does nothing", () => {
    expect(clickHint(null, TRIAL_ENDS)).toBeNull();
  });
});

describe("an anchor's reading", () => {
  test("is LV95 by the approximate formulas in Switzerland", () => {
    // REFRAME put anchor A at E 2 530 313,64 · N 1 188 453,12 (#103); the formulas are ≈ 1 m off.
    expect(anchorReading("A", TRIAL_ENDS)).toMatch(
      /^A : E 2 530 31[34] · N 1 188 45[234] \(LV95 approchée\)$/,
    );
  });

  test("is WGS84 degrees outside it, and nothing for an anchor not placed", () => {
    expect(anchorReading("B", { A: null, B: PARIS })).toBe(
      "B : latitude 48,850000° · longitude 2,350000°",
    );
    expect(anchorReading("A", { A: null, B: PARIS })).toBeNull();
  });
});

describe("every line the map prints stays in the terrain register", () => {
  const lines = [
    ...mapLabelTable(),
    ...(["A", "B"] as const).flatMap((anchor) => [
      anchorReading(anchor, TRIAL_ENDS) ?? "",
      anchorReading(anchor, { A: PARIS, B: PARIS }) ?? "",
    ]),
  ];

  test.each(lines.map((line) => [line] as const))("« %s »", (line) => {
    expect(proscribedIn(line)).toEqual([]);
    expect(exactTermsIn(line)).toEqual([]);
  });
});
