import { describe, expect, test } from "vitest";

import type { ScenarioDraft } from "@/lib/scenario/types.ts";

import { buildScene } from "@/lib/chart/scene.ts";
import { firstRunDefaults } from "@/lib/scenario/first-run.ts";

import { readOutCells } from "./cells.ts";

function riderOf(patch: (draft: ScenarioDraft) => void = () => {}) {
  const draft = firstRunDefaults() as ScenarioDraft;
  patch(draft);
  const scene = buildScene({ scenario: draft, trace: null });
  if (scene === null) throw new Error("expected a drawable scene");
  return scene.rider;
}

describe("`readOutCells` — every cell by id, as the chart block printed it", () => {
  test("the opening screen's seven cells", () => {
    // Read off the running app at `/` with an empty Session, before the move.
    expect(readOutCells(riderOf(), { clearance: true, hClearMin: 1, unit: "daN" })).toEqual({
      clearance: { label: "Garde min. ligne", value: "2,42 m", note: false, breach: false },
      TA: { label: "T anc. A", value: "817,1 daN", note: false, breach: false },
      TB: { label: "T anc. B", value: "793,5 daN", note: false, breach: false },
      slope: { label: "Pente", value: "-19,4 %", note: false, breach: false },
      sag: { label: "Flèche", value: "7,48 m", note: false, breach: false },
      underRider: { label: "Garde passager", value: "2,42 m", note: false, breach: false },
      belowUnloaded: { label: "Écart à vide", value: "1,48 m", note: false, breach: false },
    });
  });

  test("at x 10 m the garde is not under the passenger, so its label says where it is", () => {
    // Read off the running app at `?…&x=10` on the shipped line, before the move.
    const cells = readOutCells(
      riderOf((draft) => {
        draft.rider.xD = 10;
      }),
      { clearance: true, hClearMin: 1, unit: "daN" },
    );
    expect(cells.clearance.label).toBe("Garde min. ligne (à x 59,2 m)");
    expect(cells.clearance.value).toBe("5,19 m");
    expect(cells.underRider.value).toBe("6,68 m");
  });

  test("a garde under « Garde min. admise » is the one breach, and only on that cell", () => {
    // 2,42 m against a 3 m threshold.
    const cells = readOutCells(riderOf(), { clearance: true, hClearMin: 3, unit: "daN" });
    expect(Object.entries(cells).filter(([, cell]) => cell.breach)).toEqual([
      ["clearance", expect.objectContaining({ value: "2,42 m" })],
    ]);
  });

  test("a Clearance Gate breach replaces both garde cells with the clause, and no other", () => {
    const cells = readOutCells(riderOf(), { clearance: false, hClearMin: 3, unit: "daN" });
    const refused = { value: "garde au sol indisponible", note: true, breach: false };
    expect(cells.clearance).toEqual({ label: "Garde min. ligne", ...refused });
    expect(cells.underRider).toEqual({ label: "Garde passager", ...refused });
    expect(cells.TA.value).toBe("817,1 daN");
    expect(cells.belowUnloaded.value).toBe("1,48 m");
  });

  test("the tension cells follow the force selector", () => {
    // 817,1 daN = 8,171 kN.
    const cells = readOutCells(riderOf(), { clearance: true, hClearMin: 1, unit: "kN" });
    expect(cells.TA.value).toBe("8,171 kN");
  });
});
