/**
 * The **rider-free** half of the chain, computed once at the app root — « v1 build spec » § 6
 * (*Valeurs déduites* against *Résultats*, split on « le passager est-il impliqué ? ») and § 7 (« the
 * real performance mechanism is the memo on the solve inputs »).
 *
 * Same argument as {@link useSceneBase}, one rung down: the Rail's **input half** prints these
 * values and its **output half** prints them beside every provenance entry, so a `useMemo` inside
 * each ran `deduceValues` — an unloaded solve plus a 2400-sample sag scan — **twice** per parameter
 * change. It is lifted here and handed to both.
 *
 * **`rider` is deliberately not a dependency.** {@link deduceValues} reads `material`, `geometry`,
 * `anchors`, `tightness` and the trace, and nothing else — the whole point of § 6's split is that
 * these are the consequences of the Tightness Spec *without* a rider. Keying on the whole Scenario
 * would re-solve on every `pointermove` of a scrub, which dispatches a fresh Scenario per frame.
 */

import { useMemo } from "react";

import type { Deduced } from "@/lib/rail/deduced.ts";

import { deduceValues } from "@/lib/rail/deduced.ts";

import { useAppState } from "./store.tsx";

export function useDeduced(): Deduced {
  const { scenario, trace } = useAppState();
  const { anchors, geometry, material, tightness } = scenario;

  return useMemo(
    () => deduceValues(scenario, trace),
    // The Scenario itself is **not** a dependency: a rider patch merges shallowly, so these five
    // survive a scrub untouched while `scenario` does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [anchors, geometry, material, tightness, trace],
  );
}
