/**
 * The unloaded line, derived **once** per parameter change at the app root and handed to both of
 * its readers — the `Valeurs déduites` (`useDeduced`) and the scene (`useScene`). Two memos over
 * the same derivation ran the `L₀` bisection twice per edit.
 *
 * The dependency lists **are** {@link unloadedInputs}'s fields: a rider patch merges shallowly,
 * so a scrub leaves every one of them identical, and `unit` is not among them. They are split in
 * two memos, the placement on its three fields and the solve on the rest, so a material, tightness
 * or `mp` edit hands `useScene` the same `span` and the chart frame keyed on it holds.
 */

import { useMemo } from "react";

import type { Unloaded } from "@/lib/scenario/unloaded.ts";

import { placeSpan } from "@/lib/scenario/geometry.ts";
import { unloadedInputs, unloadedOn } from "@/lib/scenario/unloaded.ts";

import { useAppState } from "./store.tsx";

export function useUnloaded(): Unloaded {
  const state = useAppState();
  const { geometry, anchors, material, tightness, mp, trace } = unloadedInputs(
    state.scenario,
    state.trace,
  );
  const placed = useMemo(() => placeSpan({ geometry, anchors }, trace), [geometry, anchors, trace]);
  return useMemo(
    () => unloadedOn(placed, { material, tightness, mp }),
    [placed, material, tightness, mp],
  );
}
