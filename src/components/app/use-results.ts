/**
 * The Rail's output half, computed once at the app root — « v1 build spec » § 6 (`Résultats`, the
 * criteria × ends grid) and § 7 (*Le bandeau*, rank 4).
 *
 * Same argument as {@link useScene} and {@link useDeduced}: A10 kept this memo inside
 * `RailOutputs` while the Rail was its only reader, and A11 gives it a second one — the **verdict
 * sentence is rank 4 of the banner**, and a banner that re-derived it would run `evaluateVerdict`
 * over 260 steps twice per parameter change *and* be able to disagree with the block 300 px below
 * it about which cell governs.
 *
 * **`rider.xD` is deliberately not a dependency**: everything reported here is a traverse
 * aggregate, so a scrub — which dispatches a fresh Scenario per frame — changes none of it. The
 * rest of the Scenario is listed field by field, which is what makes that safe.
 */

import { useMemo } from "react";

import type { SceneBase } from "@/lib/chart/scene.ts";
import type { GateReport } from "@/lib/rail/gates.ts";
import type { Results } from "@/lib/rail/results.ts";

import { deriveResults } from "@/lib/rail/results.ts";

import { useAppState } from "./store.tsx";

/**
 * @param report the **standing** gate report. It is threaded rather than re-derived because a
 *   committed-invalid value lives in the form and never reaches the Scenario: `deriveResults`
 *   evaluating its own gates would print a verdict under a banner announcing there is none.
 */
export function useResults(base: SceneBase | null, report: GateReport): Results | null {
  const { scenario, trace } = useAppState();

  return useMemo(
    () => deriveResults({ scenario, trace, base, report }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      report,
      scenario.unit,
      scenario.usage,
      scenario.regime,
      scenario.geometry,
      scenario.anchors,
      scenario.tightness,
      scenario.material,
      scenario.terminations,
      scenario.rider.mp,
      scenario.rider.hRider,
      scenario.rider.hClearMin,
      scenario.rider.DAF,
      trace,
      base,
    ],
  );
}
