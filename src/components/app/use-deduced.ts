/**
 * The **rider-free** half of the chain, formatted once at the app root — « v1 build spec » § 6
 * (*Valeurs déduites* against *Résultats*, split on « le passager est-il impliqué ? ») and § 7 (« the
 * real performance mechanism is the memo on the solve inputs »).
 *
 * Same argument as {@link useScene}, one rung down: the Rail's **input half** prints these values
 * and its **output half** prints them beside every provenance entry, so the memo is lifted here and
 * handed to both.
 *
 * **No solve runs here.** The unloaded line arrives from `useUnloaded`, shared with the scene; this
 * memo only formats it, so it also keys on `material` (the override display) and `unit` (the Stale
 * Badge compares at display precision) — a unit switch re-formats and never re-solves.
 */

import { useMemo } from "react";

import type { Deduced } from "@/lib/rail/deduced.ts";
import type { Unloaded } from "@/lib/scenario/unloaded.ts";

import { deducedFrom } from "@/lib/rail/deduced.ts";

import { useAppState } from "./store.tsx";

export function useDeduced(unloaded: Unloaded): Deduced {
  const { material, unit } = useAppState().scenario;
  return useMemo(() => deducedFrom({ material, unit }, unloaded), [material, unit, unloaded]);
}
