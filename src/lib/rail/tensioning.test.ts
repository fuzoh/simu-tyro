import { describe, expect, test } from "vitest";

import type { ScenarioDraft, TensioningDevice, TextileDraft } from "@/lib/scenario/types.ts";

import { formatQuantity, KGF } from "@/lib/format/quantity.ts";
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
  tmaxAtTensioningAnchor,
} from "./tensioning.ts";

const SENTENCE = "dépasse la charge d'utilisation du dispositif";

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
  const onSide = (side: "A" | "B") => rope("maestro-s", 11, 1000, { tensioningSide: side });

  test("fires above the limit, naming the compared figure, the anchor and the provenance", () => {
    const text = overLimitWarning(onSide("A"), MAESTRO_S_250_KG + 1);
    expect(text).toContain(SENTENCE);
    expect(text).toContain("ancrage A, par ligne");
    expect(text).toContain("250 kg");
    expect(text).toContain("10,5 à 11,5 mm");
    expect(text).toContain("rapport #64");
    expect(text).toContain("n'est pas un fusible");
    expect(overLimitWarning(onSide("B"), MAESTRO_S_250_KG + 1)).toContain("ancrage B, par ligne");
  });

  test("is absent at and under the limit", () => {
    for (const Tmax of [MAESTRO_S_250_KG, MAESTRO_S_250_KG - 1, 100]) {
      expect(overLimitWarning(onSide("A"), Tmax)).toBeNull();
    }
  });

  test("is absent when there is no T max to read — no result, or a refused DAF", () => {
    expect(overLimitWarning(onSide("A"), null)).toBeNull();
    expect(tmaxAtTensioningAnchor(onSide("A"), null)).toBeNull();
    expect(tmaxAtTensioningAnchor(onSide("A"), { anchorTmax: null })).toBeNull();
  });

  test("is absent when the limit is empty, however tight the line", () => {
    const tight = 100_000;
    for (const scenario of [
      rope("pulley", 11, tight),
      rope("maestro-s", undefined, tight),
      rope("maestro-s", 12, tight),
      rope("maestro-l", 11, tight),
    ]) {
      expect(overLimitWarning(scenario, tight)).toBeNull();
    }
  });

  test("reads the limit at the typed diameter: 10 mm is 150 kg, 11 mm is 250 kg", () => {
    const Tmax = 200 * KGF;
    expect(overLimitWarning(rope("maestro-s", 10, 1000), Tmax)).toContain("150 kg");
    expect(overLimitWarning(rope("maestro-s", 11, 1000), Tmax)).toBeNull();
  });
});

describe("the T max the limit is read against", () => {
  const solved = (scenario: ScenarioDraft) => {
    const results = resultsOf(scenario);
    if (results.anchorTmax === null) throw new Error("the DAF is accepted");
    return { results, ...results.anchorTmax };
  };

  test("is the « T max ancrage A/B » row Avancé prints, majoration au départ included", () => {
    const scenario = rope("maestro-s", 11, 1000);
    const { results, A, B } = solved(scenario);
    for (const [end, Tmax] of [
      ["A", A],
      ["B", B],
    ] as const) {
      const printed = results.rows.find((row) => row.id === `Tmax${end}`)?.value;
      expect(printed).toBe(formatQuantity("Tdaf", Tmax, scenario.unit));
    }
    // The headline « T max (traversée) » is the greater of the two.
    const headline = results.rows.find((row) => row.id === "Tmax")?.value;
    expect(headline).toBe(formatQuantity("Tdaf", Math.max(A, B), scenario.unit));
  });

  test("is read at the anchor carrying the device, and at A when the side is the default", () => {
    const scenario = rope("maestro-s", 11, 1000);
    const { results, A, B } = solved(scenario);
    expect(A).not.toBe(B);
    expect(tmaxAtTensioningAnchor({ tensioningSide: "A" }, results)).toBe(A);
    expect(tmaxAtTensioningAnchor({ tensioningSide: "B" }, results)).toBe(B);
    expect(scenario.tensioningSide).toBe("A");
  });

  test("the loaded line trips the warning where the tension de pose alone would not", () => {
    // A tension de pose well under 250 kg, a loaded line well over it: the #86 follow-up.
    const scenario = rope("maestro-s", 11, 200 * KGF);
    const { results, A } = solved(scenario);
    expect(A).toBeGreaterThan(MAESTRO_S_250_KG);
    expect(overLimitWarning(scenario, demandedPretension(scenario, null))).toBeNull();
    const ladder = warningLadder(scenario, deduceValues(scenario, null), results);
    expect(ladder.find((rung) => rung.row === "pretension")?.text).toContain(SENTENCE);
    // …on the `Prétension` read-out row too, and on neither without a result.
    const rows = (given: typeof results | null) => {
      // The read-out row is the one another driver's line carries.
      const sag = { ...scenario, tightness: { mode: "sag", D_target: 2 } } as const;
      return deducedRows(sag, deduceValues(sag, null), null, given);
    };
    expect(rows(results).find((r) => r.id === "pretension")?.warning).toContain(SENTENCE);
    expect(rows(null).find((r) => r.id === "pretension")?.warning).toBeNull();
    expect(
      warningLadder(scenario, deduceValues(scenario, null)).some(
        (rung) => rung.row === "pretension",
      ),
    ).toBe(false);
  });

  test("a loaded line under the limit stays silent, the tension de pose notwithstanding", () => {
    // A light rider keeps the loaded line under 250 kg, a tension de pose far above it or not.
    const scenario = rope("maestro-s", 11, 100 * KGF, {
      rider: { ...firstRunDefaults().rider, mp: 10 },
    });
    const { results, A } = solved(scenario);
    expect(A).toBeLessThan(MAESTRO_S_250_KG);
    expect(
      warningLadder(scenario, deduceValues(scenario, null), results).some(
        (rung) => rung.row === "pretension",
      ),
    ).toBe(false);
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
  const results = deriveResults({
    scenario: traverseScenarioOf,
    base: { L: span.L, h: span.h, unloaded: state, material, P, traverse, clearance, soleCarrier },
    report: evaluateGates({ scenario: traverseScenarioOf }),
  });
  if (results === null) throw new Error("the line gives results");
  return results;
}

describe("the device changes no result", () => {
  test("results and Verdict are identical with and without an exceeded limit", () => {
    const over = rope("maestro-s", 10, 2000);
    const under = rope("pulley", 10, 2000);
    const exceeded = resultsOf(over);
    // The loaded line is over the Maestro's 150 kg at 10 mm; the mouflage has no limit to exceed.
    const Tmax = tmaxAtTensioningAnchor(over, exceeded);
    expect(Tmax).toBeGreaterThan(150 * KGF);
    expect(overLimitWarning(over, Tmax)).not.toBeNull();
    expect(overLimitWarning(under, Tmax)).toBeNull();

    expect(exceeded.verdict).not.toBeNull();
    expect(exceeded).toEqual(resultsOf(under));
    expect(deduceValues(over, null).solve).toEqual(deduceValues(under, null).solve);
  });

  test("the device is not a Traverse input, so changing it cannot re-run the Sweep", () => {
    expect(traverseInputs(rope("maestro-s", 10, 2000))).toEqual(
      traverseInputs(rope("pulley", 10, 2000)),
    );
  });
});
