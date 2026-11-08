/**
 * The vue de dessus's words (#93): what the next click does, and where each anchor is drawn — in
 * the terrain register, as every line the map prints. The fixed strings are also in the Page
 * Statique's label table (`@/lib/statique/copy.test.ts`); these are the sentences built from
 * Positions.
 */

import { describe, expect, test } from "vitest";

import { TRIAL_ENDS } from "@/lib/terrain/__fixtures__/geoadmin-2026-11-08.ts";
import { exactTermsIn, proscribedIn } from "@/lib/vocabulary/labels.ts";

import { anchorReading, clickHint, describeRelative, mapLabelTable, windReading } from "./copy.ts";
import { roseReference } from "./wind-rose.ts";

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

describe("the wind's reading", () => {
  const trial = roseReference(TRIAL_ENDS);
  const level = roseReference({ A: null, B: null });

  test("says where a relative direction comes from, from the rider's seat", () => {
    expect(describeRelative(0)).toBe("de face");
    expect(describeRelative(90)).toBe("par la droite");
    expect(describeRelative(180)).toBe("dans le dos");
    expect(describeRelative(270)).toBe("par la gauche");
    expect(describeRelative(45)).toBe("par la droite à l'avant");
    expect(describeRelative(108)).toBe("par la droite à l'arrière");
    expect(describeRelative(225)).toBe("par la gauche à l'arrière");
    expect(describeRelative(300)).toBe("par la gauche à l'avant");
  });

  test("gives the azimuth and the relative direction on the trial's line", () => {
    expect(windReading({ speedKmh: 25, directionDeg: 108 }, trial)).toBe(
      "Vent de nord-est (60°), 25 km/h : par la droite à l'arrière, 108° par rapport à la ligne A → B.",
    );
  });

  test("gives the relative direction alone where north is unknown", () => {
    expect(windReading({ speedKmh: 25, directionDeg: 108 }, level)).toBe(
      "Vent à 25 km/h : par la droite à l'arrière, 108° par rapport à la ligne A → B (nord inconnu).",
    );
  });

  test("says there is no wind, and what to do about it", () => {
    expect(windReading({ speedKmh: 0, directionDeg: 0 }, trial)).toMatch(/^Pas de vent\./);
  });
});

describe("every line the map prints stays in the terrain register", () => {
  const lines = [
    ...mapLabelTable(),
    windReading({ speedKmh: 25, directionDeg: 108 }, roseReference(TRIAL_ENDS)),
    windReading({ speedKmh: 25, directionDeg: 108 }, roseReference({ A: null, B: null })),
    windReading({ speedKmh: 0, directionDeg: 0 }, roseReference({ A: null, B: null })),
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
