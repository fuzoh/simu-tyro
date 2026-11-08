import { describe, expect, test } from "vitest";

import type { ScenarioDraft } from "@/lib/scenario/types.ts";

import { firstRunDefaults } from "@/lib/scenario/first-run.ts";
import { clampX } from "@/lib/scenario/geometry.ts";
import { sweepRider, sweepRiderOf } from "@/lib/scenario/traverse.ts";
import { deriveUnloaded, unloadedInputs } from "@/lib/scenario/unloaded.ts";
import {
  evaluateClearance,
  sampleCable,
  solveAtHorizontalPosition,
  sweepStep,
  zGroundAt,
} from "@/lib/sim";

import type { PlacedRider } from "./cells.ts";

import { readOutCells } from "./cells.ts";

/** The chart's drawn-cable resolution — `CABLE_SAMPLES`, which `belowUnloaded` is read off. */
const CABLE_SAMPLES = 240;

/** An interleaved `x, z` polyline's height at `at`, held at the ends — the chart's `polylineAt`. */
function interleavedAt(xz: Float64Array, at: number): number {
  const last = xz.length / 2 - 1;
  if (at <= xz[0]) return xz[1];
  if (at >= xz[2 * last]) return xz[2 * last + 1];
  let i = 0;
  while (xz[2 * (i + 1)] <= at) i++;
  const [x0, z0, x1, z1] = [xz[2 * i], xz[2 * i + 1], xz[2 * i + 2], xz[2 * i + 3]];
  return z0 + ((at - x0) / (x1 - x0)) * (z1 - z0);
}

/**
 * The rider the chart places, built from the same `lib/scenario` and `lib/sim` calls `buildScene`
 * and `placeRider` make — `lib/rail` may not import `lib/chart`.
 */
function riderOf(patch: (draft: ScenarioDraft) => void = () => {}): PlacedRider {
  const draft = firstRunDefaults() as ScenarioDraft;
  patch(draft);
  const unloaded = deriveUnloaded(unloadedInputs(draft, null));
  if (!unloaded.ok) throw new Error("expected the line to solve");
  const swept = sweepRider(unloaded, sweepRiderOf(draft));
  if (swept === null) throw new Error("expected the traverse to solve");
  const { input, state, span } = unloaded;
  const { L, h, terrain } = span;
  const { P } = swept;
  const { hRider } = draft.rider;

  const exact = solveAtHorizontalPosition(input, P, clampX(draft.rider.xD, L));
  const sP = exact.ok ? exact.state.loads[0]?.s : undefined;
  if (!exact.ok || sP === undefined) throw new Error("expected the rider to solve");
  const resolved = sweepStep(input, P, sP, { H: exact.state.H, V0: exact.state.V0 });
  if (!resolved.ok) throw new Error("expected the rider's step to solve");
  const { step } = resolved;
  const at = evaluateClearance(input, P, [step], terrain, hRider);
  const worst = { hClear: at.perStep[0], atX: at.perStepX[0] };
  return {
    step,
    worst,
    relabel: Math.abs(worst.atX - step.xD) > Math.max(1, 0.01 * L),
    underRider: step.zD - zGroundAt(terrain, step.xD) - hRider,
    belowUnloaded: interleavedAt(sampleCable(state, CABLE_SAMPLES), step.xD) - step.zD,
    sagAtRider: (h * step.xD) / L - step.zD,
  };
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

  test("a garde under « Garde exigée » is the one breach, and only on that cell", () => {
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
