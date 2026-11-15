/**
 * The unloaded line, derived **once** per parameter change at the app root and handed to both of
 * its readers — the `Valeurs déduites` (`useDeduced`) and the scene (`useScene`). Two memos over
 * the same derivation ran the `L₀` bisection twice per edit.
 *
 * The dependency lists **are** {@link unloadedInputs}'s fields: a rider patch merges shallowly,
 * so a scrub leaves every one of them identical, and `unit` is not among them. They are split in
 * two memos, the placement on its three fields and the solve on the rest, so a material, tightness
 * or `mp` edit hands `useScene` the same `span` and the chart frame keyed on it holds. The Vent,
 * the Positions it is projected on and the typed `ρ` are among the rest: under wind the line is
 * posed under them (`docs/simulation-theory.md` §19.7), so an edit of either re-poses it.
 *
 * **Those three are read deferred** (`useDeferredValue`). The rose des vents and its profile pad
 * write the Vent at every `pointermove` (#94), and under wind each Vent re-poses the line and
 * re-sweeps it — a windy pose and §19.12's 260 positions, tens of milliseconds
 * (`docs/performance/spatial-sweep.md` § 5). Read at once, every move of a drag ran that on the
 * main thread before the handle could follow. Deferred, the handle and the fields follow the
 * pointer in an urgent render where this memo holds, and the line catches up in a background
 * render React drops as soon as the next move arrives.
 */

import { useDeferredValue, useMemo } from "react";

import type { Unloaded } from "@/lib/scenario/unloaded.ts";

import { placeSpan } from "@/lib/scenario/geometry.ts";
import { unloadedInputs, unloadedOn } from "@/lib/scenario/unloaded.ts";

import { useAppState } from "./store.tsx";

export function useUnloaded(): Unloaded {
  const state = useAppState();
  const {
    geometry,
    anchors,
    material,
    tightness,
    tensioningSide,
    mp,
    trace,
    wind: typedWind,
    positions: typedPositions,
    rho: typedRho,
  } = unloadedInputs(state.scenario, state.trace);
  // Each from the store, so each keeps its identity between renders, as `useDeferredValue` asks.
  const wind = useDeferredValue(typedWind);
  const positions = useDeferredValue(typedPositions);
  const rho = useDeferredValue(typedRho);
  const placed = useMemo(() => placeSpan({ geometry, anchors }, trace), [geometry, anchors, trace]);
  return useMemo(
    () =>
      unloadedOn(placed, {
        material,
        tightness,
        tensioningSide,
        mp,
        trace,
        geometry,
        wind,
        positions,
        rho,
      }),
    [placed, material, tightness, tensioningSide, mp, trace, geometry, wind, positions, rho],
  );
}
