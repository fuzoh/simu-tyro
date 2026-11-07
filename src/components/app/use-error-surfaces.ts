/**
 * The app's error surfaces, assembled once — « v1 build spec » § 7 (*Les trois grilles de
 * validation*, *Le bandeau : un occupant, quatre rangs*, *« Saisie en cours »*, *« Aucun
 * résultat »*, *Les trois refus*), with rank 2 as
 * [amendment E](../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md) leaves it.
 *
 * **Nothing is decided here.** The precedence is `@/lib/app/banner.ts`'s reducer, the three refusal
 * surfaces are `@/lib/app/refusals.ts`'s mapping, « Saisie en cours »'s firing rule is
 * `@/lib/rail/gates.ts`'s and « ce que l'échec supprime » is `@/lib/app/suppression.ts`'s table.
 * This hook is the one place they are *composed*, and it exists because four consumers have to
 * agree on the answer: the banner, the read-out cells, the Rail's two halves and the write side.
 * Two copies of the composition is how « the slot has exactly one occupant » stops being true.
 *
 * **It also applies the suppression**, which is what makes the typed path and the arrived path one
 * state. A committed-invalid « −5 » lives in the *form*; the scene and the results are derived from
 * the *store*, which cannot hold it — so without one place gating both, the banner announced
 * « aucun résultat » while the whole output half kept printing the last valid Sweep. Everything
 * downstream therefore receives what survives the gates, never the raw derivation.
 */

import { useMemo } from "react";

import type { BannerOccupant } from "@/lib/app/banner.ts";
import type { EngineRefusal } from "@/lib/app/refusals.ts";
import type { SceneBase, SceneFrame } from "@/lib/chart/scene.ts";
import type { Deduced } from "@/lib/rail/deduced.ts";
import type { FieldId } from "@/lib/rail/fields.ts";
import type { GateReport, SaisieEnCours } from "@/lib/rail/gates.ts";
import type { Results } from "@/lib/rail/results.ts";
import type { TraverseScenario } from "@/lib/scenario/traverse.ts";

import { banner, noResultCause, standingReport } from "@/lib/app/banner.ts";
import { engineRefusal } from "@/lib/app/refusals.ts";
import { suppression } from "@/lib/app/suppression.ts";
import { committedValue, saisieEnCours } from "@/lib/rail/gates.ts";

import { useAppState } from "./store.tsx";
import { useResults } from "./use-results.ts";

export type ErrorSurfaces = {
  /** The banner slot's single occupant, or `null` when the band is reserved and unpainted. */
  readonly occupant: BannerOccupant | null;
  /** « Aucun résultat — portée invalide. », or `null` when nothing is suppressed. */
  readonly cause: string | null;
  /** The engine's refusal for this Scenario, mapped onto one of the three surfaces. */
  readonly refusal: EngineRefusal | null;
  /**
   * « Saisie en cours ». Non-`null` **freezes** the output half on the last valid Sweep, makes the
   * scrub track inert and suspends both writes — one flag, because a stale Sweep that can still
   * *generate* numbers is the one thing the split exists to prevent.
   */
  readonly saisie: SaisieEnCours | null;
  /**
   * The input half of the picture, or `null` for *l'exception géométrique* — the one state where
   * there is no shared x domain and both plots collapse.
   */
  readonly frame: SceneFrame | null;
  /** The solved half **as the gates leave it**: `null` under a Solve breach or a refusal. */
  readonly solved: SceneBase | null;
  /** The Rail's output half, over the same report. `null` is « Aucun résultat ». */
  readonly results: Results | null;
  /** May the garde au sol and its curve be shown? False on a Clearance Gate breach. */
  readonly clearance: boolean;
};

export function useErrorSurfaces({
  deduced,
  focused,
  frame,
  report,
  solved,
  traverse,
}: {
  readonly deduced: Deduced;
  readonly focused: FieldId | null;
  /** The raw input half, from `useScene` — gated here, never by the chart. */
  readonly frame: SceneFrame | null;
  readonly report: GateReport;
  /** The raw solved half, from the app's one `useSweep` seam. */
  readonly solved: SceneBase | null;
  /** The Scenario without `x_D`, from `useTraverse` — what the results key on. */
  readonly traverse: TraverseScenario;
}): ErrorSurfaces {
  const { scenario } = useAppState();
  const { failure } = deduced;
  const { tightness, unit } = scenario;

  const refusal = useMemo(
    () => (failure === null ? null : engineRefusal(failure, { tightness, unit })),
    [failure, tightness, unit],
  );

  const committed = focused === null ? null : committedValue(scenario, focused);
  const saisie = useMemo(
    () => saisieEnCours(report, focused, committed),
    [report, focused, committed],
  );

  // **One report, read by everything.** Mid-edit is filtered exactly once: the field the caret is
  // in is not on the blocking list, and the output half freezes rather than being suppressed.
  const standing = useMemo(() => standingReport(report, saisie), [report, saisie]);
  const removed = useMemo(() => suppression({ report: standing, refusal }), [standing, refusal]);

  const shownFrame = removed.geometry ? null : frame;
  const shownSolved = removed.solve ? null : solved;
  const results = useResults(traverse, shownSolved, standing);

  return {
    occupant: banner({ report, refusal, saisie, verdict: results?.banner ?? null }),
    cause: noResultCause({ report, refusal, saisie }),
    refusal,
    saisie,
    frame: shownFrame,
    solved: shownSolved,
    results,
    clearance: !removed.clearance,
  };
}
