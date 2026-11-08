/**
 * The vue de dessus's words (#93): what the next click does, and where each anchor is drawn — in
 * the terrain register, as every line the map prints. The fixed strings are also in the Page
 * Statique's label table (`@/lib/statique/copy.test.ts`); these are the sentences built from
 * Positions.
 */

import { describe, expect, test } from "vitest";

import { TRIAL_ENDS } from "@/lib/terrain/__fixtures__/geoadmin-2026-11-08.ts";
import { exactTermsIn, proscribedIn } from "@/lib/vocabulary/labels.ts";

import {
  anchorReading,
  BANANE_HELP,
  clickHint,
  describeRelative,
  MAP_COPY,
  mapLabelTable,
  measureHint,
  measureLines,
  windReading,
} from "./copy.ts";
import { horizontalDistance } from "./measure.ts";
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

describe("the Banane's words", () => {
  test("say a shape, not a distance, with no figure and no length attached", () => {
    expect(MAP_COPY.bananeNote).toBe("Banane : allure, pas une distance.");
    for (const text of [MAP_COPY.bananeNote, BANANE_HELP]) {
      expect(text).not.toMatch(/\d/);
      expect(text).not.toMatch(/\bm\b|mètre/);
    }
  });

  test("the help names the proportionality factor a [CONVENTION], not an engine output", () => {
    expect(BANANE_HELP).toContain("[CONVENTION]");
    expect(BANANE_HELP).toContain("jamais une sortie du moteur");
  });
});

const HORIZONTAL_M = horizontalDistance(TRIAL_ENDS.A, TRIAL_ENDS.B);
const READINGS = {
  loading: measureLines({ status: "loading", horizontalM: HORIZONTAL_M }),
  online: measureLines({
    status: "online",
    horizontalM: HORIZONTAL_M,
    dz: -15,
    directM: Math.hypot(HORIZONTAL_M, 15),
    groundM: 440.1,
  }),
  offline: measureLines({
    status: "offline",
    horizontalM: HORIZONTAL_M,
    failure: "indisponible",
    dz: null,
    directM: null,
  }),
  outOfCoverage: measureLines({
    status: "offline",
    horizontalM: HORIZONTAL_M,
    failure: "hors-couverture",
    dz: null,
    directM: null,
  }),
  offlineOnProfile: measureLines({
    status: "offline",
    horizontalM: HORIZONTAL_M,
    failure: "indisponible",
    dz: 15,
    directM: 435.4,
  }),
};

describe("the Mesure's readout", () => {
  test("online: the horizontal, the direct with its Δz, and the distance au sol", () => {
    expect(READINGS.online).toEqual([
      "Distance horizontale : 435,2 m",
      "Distance directe : 435,4 m (Δz −15,0 m)",
      "Distance au sol : 440,1 m",
    ]);
  });

  test("offline: no distance au sol, and « indisponible hors réseau » — never « — »", () => {
    expect(READINGS.offline).toEqual([
      "Distance horizontale : 435,2 m",
      "Distance directe : indisponible hors réseau",
    ]);
    expect(Object.values(READINGS).flat().join("\n")).not.toContain("—");
  });

  test("offline with both points on the profil in memory: the direct distance, no distance au sol", () => {
    expect(READINGS.offlineOnProfile).toEqual([
      "Distance horizontale : 435,2 m",
      "Distance directe : 435,4 m (Δz +15,0 m)",
    ]);
  });

  test("outside swisstopo's coverage the reason is the coverage, not the network", () => {
    expect(READINGS.outOfCoverage[1]).toBe(
      "Distance directe : indisponible hors couverture swisstopo",
    );
  });

  test("the hint says what the next click does", () => {
    expect(measureHint([])).toBe("Mesure : cliquez sur le premier point.");
    expect(measureHint([TRIAL_ENDS.A])).toBe("Mesure : cliquez sur le second point.");
    expect(measureHint([TRIAL_ENDS.A, TRIAL_ENDS.B])).toBe("Mesure : un nouveau clic recommence.");
  });
});

describe("every line the map prints stays in the terrain register", () => {
  const lines = [
    ...mapLabelTable(),
    ...Object.values(READINGS).flat(),
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
