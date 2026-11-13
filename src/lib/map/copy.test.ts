/**
 * The vue de dessus's words (#93): what the next click does, and where each anchor is drawn — in
 * the terrain register, as every line the map prints. The fixed strings are also in the Page
 * Statique's label table (`@/lib/statique/copy.test.ts`); these are the sentences built from
 * Positions.
 */

import { describe, expect, test } from "vitest";

import { WIND_UNPLACED } from "@/lib/rail/gates.ts";
import { lineBearing } from "@/lib/scenario/geometry.ts";
import { TRIAL_ENDS } from "@/lib/terrain/__fixtures__/geoadmin-2026-11-08.ts";
import { exactTermsIn, proscribedIn } from "@/lib/vocabulary/labels.ts";

import type { EmbarkedReading } from "./vue-3d-embarquee.ts";

import {
  anchorReading,
  BANANE_HELP,
  clickHint,
  describeRelative,
  EMBARK_BLOCKED,
  embarkedEndLine,
  embarkedLabelTable,
  embarkedKeysHelp,
  embarkedReadingLine,
  EMBARQUEE_COPY,
  EMBARQUEE_HELP,
  GIMBAL_COPY,
  gimbalHint,
  MAP_COPY,
  mapLabelTable,
  measureHint,
  measureLines,
  vue3dKeysHelp,
  windReading,
} from "./copy.ts";
import { horizontalDistance } from "./measure.ts";

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
  // The trial's line runs at ≈ 311,9°, north-west (`wind-rose.test.ts` checks it by hand).
  const trial = lineBearing(TRIAL_ENDS);
  /** B moved 0,000262° — about 20 m — east: the line turns to ≈ 313,7°. */
  const moved = lineBearing({ A: TRIAL_ENDS.A, B: { lat: 46.846166, lon: 6.521045 } });

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

  test("gives the azimuth and the direction relative to the trial's line", () => {
    // 60° − 311,9° = −251,9°, so 108° clockwise of head-on.
    expect(windReading({ speedKmh: 25, directionDeg: 60 }, trial)).toBe(
      "Vent de nord-est (60°), 25 km/h : par la droite à l'arrière, 108° par rapport à la ligne A → B.",
    );
    // The browser trial's west wind: 264° − 311,9° = −47,9°, so 312°, from the left ahead.
    expect(windReading({ speedKmh: 30, directionDeg: 264 }, trial)).toBe(
      "Vent d'ouest (264°), 30 km/h : par la gauche à l'avant, 312° par rapport à la ligne A → B.",
    );
  });

  test("moving an anchor keeps the azimuth and turns only the reading relative to the line", () => {
    // 264° − 313,7° = −49,7°, so 310°.
    expect(windReading({ speedKmh: 30, directionDeg: 264 }, moved)).toBe(
      "Vent d'ouest (264°), 30 km/h : par la gauche à l'avant, 310° par rapport à la ligne A → B.",
    );
  });

  test("without A and B on the map, says the Vent is not applied, and why", () => {
    expect(windReading({ speedKmh: 30, directionDeg: 264 }, null)).toBe(
      `Vent d'ouest (264°), 30 km/h. ${WIND_UNPLACED.notice}`,
    );
    // No Vent to apply: the rose has no handle, and the reading says what would give it one.
    expect(windReading({ speedKmh: 0, directionDeg: 264 }, null)).toBe(WIND_UNPLACED.reason);
    expect(windReading({ speedKmh: 0, directionDeg: 264 }, null, false)).toBe("Pas de vent.");
  });

  test("says there is no wind, and what to do about it", () => {
    expect(windReading({ speedKmh: 0, directionDeg: 0 }, trial)).toMatch(/^Pas de vent\./);
  });

  test("on a rose with no handle, says there is no wind and asks for no gesture (#101)", () => {
    expect(windReading({ speedKmh: 0, directionDeg: 0 }, trial, false)).toBe("Pas de vent.");
    expect(windReading({ speedKmh: 25, directionDeg: 60 }, trial, false)).toBe(
      windReading({ speedKmh: 25, directionDeg: 60 }, trial),
    );
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

describe("the Gimbal's hover help (#111)", () => {
  test("lists the issue's keys, one per line, in its order", () => {
    expect(vue3dKeysHelp().split("\n")).toEqual([
      "Clavier, après un clic dans la Vue 3D :",
      "← / → : tourner autour de la ligne",
      "↑ / ↓ : avancer / reculer",
      "Maj + ↑ / ↓ : incliner",
      "+ / − : zoom",
      "1 : Vue du départ",
      "2 : Vue latérale",
      "3 : Vue embarquée",
      "N : nord en haut",
    ]);
  });

  test("leaves out key 3 where the Page plays no ride", () => {
    expect(vue3dKeysHelp(false).split("\n")).not.toContain("3 : Vue embarquée");
    expect(vue3dKeysHelp(false).split("\n")).toHaveLength(vue3dKeysHelp().split("\n").length - 1);
  });

  test("a button's hover names the key that does the same", () => {
    expect(gimbalHint(GIMBAL_COPY.vueDuDepart, "1")).toBe("Vue du départ (1)");
  });
});

describe("the Vue embarquée's words (#126)", () => {
  const reading = (patch: Partial<EmbarkedReading> = {}): EmbarkedReading => ({
    t: 12.34,
    duration: 45.67,
    x: 123.45,
    v: 10,
    playing: true,
    ended: false,
    end: { kind: "arrival", v: 12.5, t: 45.67 },
    ...patch,
  });

  test("the read-out is the ride's time against its last instant, the abscissa and the speed", () => {
    expect(embarkedReadingLine(reading())).toBe("t 12,3 / 45,7 s · x 123,5 m · 36 km/h");
  });

  test("a swing back reads a negative speed, the engine's sign", () => {
    expect(embarkedReadingLine(reading({ v: -2.5 }))).toBe("t 12,3 / 45,7 s · x 123,5 m · -9 km/h");
  });

  test("says from the start how the motion computed ends: arrival, Point d'arrêt or no rest", () => {
    expect(embarkedEndLine({ kind: "arrival", v: 12.5, t: 45.67 })).toBe(
      "Fin : arrivée en B à 45 km/h, 45,7 s.",
    );
    expect(embarkedEndLine({ kind: "stop", x: 229.31, t: 85.1 })).toBe(
      "Fin : arrêt à x 229,3 m, 85,1 s.",
    );
    expect(embarkedEndLine({ kind: "unsettled", t: 300 })).toBe(
      "Fin : mouvement non stabilisé — la lecture s'arrête au dernier instant calculé, 300,0 s.",
    );
  });

  test("is an estimation of the ride with the Vent entered, and its help says so", () => {
    expect(EMBARQUEE_COPY.estimate).toBe("estimation");
    expect(EMBARQUEE_COPY.ride).toBe("Mouvement calculé avec le vent saisi");
    expect(EMBARQUEE_HELP).toContain("estimation");
    expect(EMBARQUEE_HELP).toContain("gabarit du passager");
    expect(EMBARQUEE_HELP).toContain("retours en arrière compris");
  });

  test("its hover help lists its keys and the drag", () => {
    expect(embarkedKeysHelp().split("\n")).toEqual([
      "Clavier, dans la Vue embarquée :",
      "← / → : tourner la tête",
      "↑ / ↓ : lever / baisser les yeux",
      "Espace : lecture / pause",
      "R : recommencer",
      "Échap : quitter la vue embarquée",
      "Glisser dans la vue : tourner la tête",
    ]);
  });

  test("stays out of the table the Page Statique reads, which never says « estimation »", () => {
    const shared = mapLabelTable().join("\n").toLocaleLowerCase("fr");
    expect(shared).not.toContain("estimation");
    // Statique's map shows no « Vue embarquée » button: its name is the embarked table's alone.
    expect(shared).not.toContain("vue embarquée");
    expect(embarkedLabelTable()).toContain(EMBARQUEE_HELP);
    expect(embarkedLabelTable()).toContain(EMBARQUEE_COPY.enter);
  });

  test("says why it is off", () => {
    expect(EMBARK_BLOCKED["no-ride"]).toBe(
      "Vue embarquée : aucun mouvement calculé pour ce Scénario.",
    );
    expect(Object.keys(EMBARK_BLOCKED).sort()).toEqual(["gesture", "no-motion", "no-ride"]);
  });
});

describe("every line the map prints stays in the terrain register", () => {
  const lines = [
    ...mapLabelTable(),
    ...embarkedLabelTable(),
    embarkedReadingLine({
      t: 1,
      duration: 2,
      x: 3,
      v: 4,
      playing: false,
      ended: false,
      end: { kind: "stop", x: 3, t: 2 },
    }),
    embarkedEndLine({ kind: "arrival", v: 12.5, t: 45.67 }),
    embarkedEndLine({ kind: "stop", x: 229.31, t: 85.1 }),
    embarkedEndLine({ kind: "unsettled", t: 300 }),
    ...Object.values(READINGS).flat(),
    windReading({ speedKmh: 25, directionDeg: 60 }, lineBearing(TRIAL_ENDS)),
    windReading({ speedKmh: 25, directionDeg: 60 }, null),
    windReading({ speedKmh: 0, directionDeg: 0 }, null),
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
