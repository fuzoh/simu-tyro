/**
 * The Scenario **without `x_D`**, at the app root, for the two Traverse-scope readers: the gate
 * report (`useRailForm`) and the `Résultats` (`useResults`). Both key their memo on this object.
 *
 * A scrub dispatches a fresh Scenario, and a fresh `rider`, on every frame. Keyed on either, the
 * report and the results re-ran `evaluateVerdict` over the whole Sweep per frame while nothing
 * they print had moved. The dependency list **is** {@link traverseInputs}'s fields, so a scrub
 * leaves every one identical and this object holds.
 */

import { useMemo } from "react";

import type { TraverseScenario } from "@/lib/scenario/traverse.ts";

import { traverseInputs, traverseScenario } from "@/lib/scenario/traverse.ts";

import { useAppState } from "./store.tsx";

export function useTraverse(): TraverseScenario {
  const {
    unit,
    usage,
    regime,
    geometry,
    anchors,
    tightness,
    material,
    terminations,
    mp,
    hRider,
    hClearMin,
    DAF,
  } = traverseInputs(useAppState().scenario);
  return useMemo(
    () =>
      traverseScenario({
        unit,
        usage,
        regime,
        geometry,
        anchors,
        tightness,
        material,
        terminations,
        mp,
        hRider,
        hClearMin,
        DAF,
      }),
    [
      unit,
      usage,
      regime,
      geometry,
      anchors,
      tightness,
      material,
      terminations,
      mp,
      hRider,
      hClearMin,
      DAF,
    ],
  );
}
