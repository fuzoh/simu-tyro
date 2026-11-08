import { describe, expect, test } from "vitest";

import type { ScenarioDraft, TensioningDevice, TextileDraft } from "@/lib/scenario/types.ts";

import { KGF } from "@/lib/format/quantity.ts";
import { firstRunDefaults } from "@/lib/scenario/first-run.ts";
import { sweepRider, sweepRiderOf } from "@/lib/scenario/traverse.ts";
import { traverseInputs, traverseScenario } from "@/lib/scenario/traverse.ts";
import { deriveUnloaded, unloadedInputs } from "@/lib/scenario/unloaded.ts";

import { MAESTRO_ROWS } from "./__fixtures__/maestro.ts";
import { deducedRows, deduceValues } from "./deduced.ts";
import { evaluateGates } from "./gates.ts";
import { warningLadder } from "./provenance.ts";
import { deriveResults } from "./results.ts";
import {
  demandedPretension,
  deviceOnCableWarning,
  limitReading,
  overLimitWarning,
  PASS_TO_PULLEY,
  tensionLimit,
} from "./tensioning.ts";

const SENTENCE = "la tension demandée dépasse la charge d'utilisation du dispositif";

describe("tensionLimit — Petzl's working loads by device and rope diameter", () => {
  for (const row of MAESTRO_ROWS) {
    test(`${row.device} on ${row.diameter} mm: ${row.kg === null ? "empty" : `${row.kg} kg`}`, () => {
      const limit = tensionLimit(row.device, row.diameter);
      expect(limit?.kg ?? null).toBe(row.kg);
    });
  }

  for (const row of MAESTRO_ROWS.filter((candidate) => candidate.kg !== null)) {
    test(`${row.device} on ${row.diameter} mm carries its provenance`, () => {
      const source = tensionLimit(row.device, row.diameter)?.source ?? "";
      expect(source).toContain("Petzl");
      expect(source).toContain("#64");
    });
  }

  test("the mouflage has no limit, whatever the diameter", () => {
    expect(tensionLimit("pulley", 10)).toBeNull();
    expect(tensionLimit("pulley", 11)).toBeNull();
  });

  test("a blank diameter has no limit", () => {
    expect(tensionLimit("maestro-s", null)).toBeNull();
    expect(tensionLimit("maestro-s", undefined)).toBeNull();
    expect(tensionLimit("maestro-l", undefined)).toBeNull();
  });
});

const ROPE: Omit<TextileDraft, "d"> = {
  family: "textile",
  ropeClass: "hmpe",
  MBL: 300_000,
  mu: 0.16,
  k: 22,
};

/** A textile line, a régime chosen, the prétension driving — the shape the warning is about. */
function rope(
  device: TensioningDevice,
  diameter: number | undefined,
  T_target: number,
  patch: Partial<ScenarioDraft> = {},
): ScenarioDraft {
  return {
    ...firstRunDefaults(),
    usage: "TEMPORAIRE",
    regime: "secours10",
    material: diameter === undefined ? ROPE : { ...ROPE, d: diameter },
    terminations: {
      A: { id: "oeil-cousu-epissure", eta: 0.9 },
      B: { id: "epissure-longue-hmpe", eta: 0.85 },
    },
    tensioningDevice: device,
    tightness: { mode: "anchor", T_target },
    ...patch,
  };
}

const MAESTRO_S_250_KG = 250 * KGF;

describe("the limite de tension as Avancé reads it (#104)", () => {
  test("the force Petzl's kilograms are read as, in the selected unit", () => {
    // 250 kg · 9,80665 = 2451,66 N is 245,2 daN; 150 kg is 1471,00 N, 1,471 kN at its precision.
    expect(limitReading(rope("maestro-s", 11, 1000), "daN")?.value).toBe("245,2 daN");
    expect(limitReading(rope("maestro-s", 10, 1000), "kN")?.value).toBe("1,471 kN");
    expect(limitReading(rope("maestro-l", 13, 1000), "daN")?.value).toBe("274,6 daN");
  });

  test("its provenance is the figure as published, the diameters it holds for, and the source", () => {
    expect(limitReading(rope("maestro-s", 11, 1000), "daN")?.provenance).toBe(
      "Charge d'utilisation publiée : 250 kg pour une corde de 10,5 à 11,5 mm — notice Petzl, rapport #64.",
    );
  });

  test("nothing where no figure is published: a mouflage, a blank or unlisted diameter, a câble", () => {
    for (const scenario of [
      rope("pulley", 11, 1000),
      rope("maestro-s", undefined, 1000),
      rope("maestro-s", 12, 1000),
      { ...firstRunDefaults(), tensioningDevice: "maestro-s" } as ScenarioDraft,
    ]) {
      expect(limitReading(scenario, "daN")).toBeNull();
    }
  });
});

describe("the over-limit warning", () => {
  test("fires above the limit, naming the figure and its provenance", () => {
    const scenario = rope("maestro-s", 11, MAESTRO_S_250_KG + 1);
    const text = overLimitWarning(scenario, demandedPretension(scenario, null));
    expect(text).toContain(SENTENCE);
    expect(text).toContain("250 kg");
    expect(text).toContain("10,5 à 11,5 mm");
    expect(text).toContain("rapport #64");
  });

  test("is absent at and under the limit", () => {
    for (const T_target of [MAESTRO_S_250_KG, MAESTRO_S_250_KG - 1, 100]) {
      const scenario = rope("maestro-s", 11, T_target);
      expect(overLimitWarning(scenario, demandedPretension(scenario, null))).toBeNull();
    }
  });

  test("is absent when the limit is empty, however tight the line", () => {
    const tight = 100_000;
    for (const scenario of [
      rope("pulley", 11, tight),
      rope("maestro-s", undefined, tight),
      rope("maestro-s", 12, tight),
      rope("maestro-l", 11, tight),
    ]) {
      expect(overLimitWarning(scenario, demandedPretension(scenario, null))).toBeNull();
    }
  });

  test("reads the limit at the typed diameter: 10 mm is 150 kg, 11 mm is 250 kg", () => {
    const demanded = 200 * KGF;
    expect(overLimitWarning(rope("maestro-s", 10, demanded), demanded)).toContain("150 kg");
    expect(overLimitWarning(rope("maestro-s", 11, demanded), demanded)).toBeNull();
  });

  test("a prétension that does not drive is judged on the solved line's read-out", () => {
    const scenario = rope("maestro-s", 10, 0, { tightness: { mode: "sag", D_target: 2 } });
    const deduced = deduceValues(scenario, null);
    expect(deduced.solve).not.toBeNull();
    const readOut = demandedPretension(scenario, deduced.solve);
    // The sag is tight enough to put the unloaded tension over 150 kg.
    expect(readOut).toBeGreaterThan(150 * KGF);
    const ladder = warningLadder(scenario, deduced);
    expect(ladder.find((rung) => rung.row === "pretension")?.text).toContain(SENTENCE);
    // …and it is the `Prétension` read-out row that carries it.
    const row = deducedRows(scenario, deduced, null).find((r) => r.id === "pretension");
    expect(row?.warning).toContain(SENTENCE);
  });

  test("a slack line shows no warning on the read-out row", () => {
    const scenario = rope("maestro-s", 10, 0, { tightness: { mode: "sag", D_target: 6 } });
    const row = deducedRows(scenario, deduceValues(scenario, null), null).find(
      (r) => r.id === "pretension",
    );
    expect(row).toBeDefined();
    expect(row?.warning).toBeNull();
  });

  test("the driving field carries the warning, even where the line does not solve", () => {
    const scenario = rope("maestro-s", 10, 1_000_000);
    const deduced = deduceValues(scenario, null);
    expect(deduced.solve).toBeNull();
    expect(
      warningLadder(scenario, deduced).find((rung) => rung.row === "pretension")?.text,
    ).toContain(SENTENCE);
  });
});

describe("a Maestro on a câble", () => {
  const onCable = (device: TensioningDevice): ScenarioDraft => ({
    ...firstRunDefaults(),
    tensioningDevice: device,
  });

  test("raises an avertissement, with the Fix Action that names its effect", () => {
    expect(deviceOnCableWarning(onCable("maestro-s"))).toContain("corde");
    expect(deviceOnCableWarning(onCable("maestro-l"))).toContain("corde");
    expect(PASS_TO_PULLEY).toBe("Passer au mouflage");
    const scenario = onCable("maestro-l");
    const rung = warningLadder(scenario, deduceValues(scenario, null)).find(
      (candidate) => candidate.row === "tensioningDevice",
    );
    expect(rung?.tier).toBe("avertissement");
  });

  test("the mouflage and a Maestro on a corde raise nothing", () => {
    expect(deviceOnCableWarning(onCable("pulley"))).toBeNull();
    expect(deviceOnCableWarning(rope("maestro-s", 11, 100))).toBeNull();
  });

  test("it is no Blocking Error: the gates pass and the results are those of the mouflage", () => {
    const withMaestro = onCable("maestro-s");
    const withPulley = onCable("pulley");
    const gates = (scenario: ScenarioDraft) =>
      evaluateGates({ scenario: traverseScenario(traverseInputs(scenario)) });
    expect(gates(withMaestro).errors).toEqual([]);
    expect(gates(withMaestro)).toEqual(gates(withPulley));
    expect(resultsOf(withMaestro)).toEqual(resultsOf(withPulley));
  });
});

/** The app's own chain from a Scenario to the Rail's results, as `results.test.ts` builds it. */
function resultsOf(scenario: ScenarioDraft) {
  const unloaded = deriveUnloaded(unloadedInputs(scenario, null));
  if (!unloaded.ok) throw new Error("the line solves");
  const swept = sweepRider(unloaded, sweepRiderOf(scenario));
  if (swept === null) throw new Error("the traverse solves");
  const { span, state, material } = unloaded;
  const { P, traverse, clearance, soleCarrier } = swept;
  const traverseScenarioOf = traverseScenario(traverseInputs(scenario));
  return deriveResults({
    scenario: traverseScenarioOf,
    base: { L: span.L, h: span.h, unloaded: state, material, P, traverse, clearance, soleCarrier },
    report: evaluateGates({ scenario: traverseScenarioOf }),
  });
}

describe("the device changes no result", () => {
  test("results and Verdict are identical with and without an exceeded limit", () => {
    const over = rope("maestro-s", 10, 2000);
    const under = rope("pulley", 10, 2000);
    expect(overLimitWarning(over, 2000)).not.toBeNull();
    expect(overLimitWarning(under, 2000)).toBeNull();

    const exceeded = resultsOf(over);
    expect(exceeded).not.toBeNull();
    expect(exceeded?.verdict).not.toBeNull();
    expect(exceeded).toEqual(resultsOf(under));
    expect(deduceValues(over, null).solve).toEqual(deduceValues(under, null).solve);
  });

  test("the device is not a Traverse input, so changing it cannot re-run the Sweep", () => {
    expect(traverseInputs(rope("maestro-s", 10, 2000))).toEqual(
      traverseInputs(rope("pulley", 10, 2000)),
    );
  });
});
