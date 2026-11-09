/**
 * The app's error surfaces, composed — « v1 build spec » § 7 (*Les trois grilles de validation*,
 * *Le bandeau : un occupant, quatre rangs*, *« Saisie en cours »*, *« Aucun résultat »*, *Les
 * trois refus*), with rank 2 as
 * [amendment E](../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md) leaves it.
 *
 * **Nothing is decided here.** The precedence is `./banner.ts`'s reducer, the three refusal
 * surfaces are `./refusals.ts`'s mapping, « Saisie en cours »'s firing rule is
 * `@/lib/rail/gates.ts`'s and « ce que l'échec supprime » is `./suppression.ts`'s table. This is
 * the one place they are *composed*, because four consumers have to agree on the answer: the
 * banner, the read-out cells, the output half and the write side. Two copies of the composition is
 * how « the slot has exactly one occupant » stops being true — and a test that rebuilt it would
 * check a copy, so the Pages' parity test calls this too.
 *
 * **It also applies the suppression**, which is what makes the typed path and the arrived path one
 * state. A committed-invalid « −5 » lives in the *form*; the scene and the results are derived from
 * the *store*, which cannot hold it — so without one place gating both, the banner announced
 * « aucun résultat » while the whole output half kept printing the last valid Sweep. Everything
 * downstream therefore receives what survives the gates, never the raw derivation.
 */

import type { SceneBase, SceneFrame } from "@/lib/chart/scene.ts";
import type { Deduced } from "@/lib/rail/deduced.ts";
import type { FieldId } from "@/lib/rail/fields.ts";
import type { GateReport, SaisieEnCours } from "@/lib/rail/gates.ts";
import type { Results } from "@/lib/rail/results.ts";
import type { DynamicsReading } from "@/lib/scenario/dynamics.ts";
import type { TraverseScenario } from "@/lib/scenario/traverse.ts";
import type { Trace } from "@/lib/terrain/trace.ts";
import type { Register } from "@/lib/vocabulary/labels.ts";

import { saisieEnCours } from "@/lib/rail/gates.ts";
import { deriveResults } from "@/lib/rail/results.ts";
import { readDynamics } from "@/lib/scenario/dynamics.ts";

import type { BannerOccupant } from "./banner.ts";
import type { EngineRefusal } from "./refusals.ts";

import { banner, noResultCause, rideCause, standingReport, windCause } from "./banner.ts";
import { engineRefusal } from "./refusals.ts";
import { suppression } from "./suppression.ts";

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
  /** The output half, over the same report. `null` is « Aucun résultat ». */
  readonly results: Results | null;
  /** May the garde au sol and its curve be shown? False on a Clearance Gate breach. */
  readonly clearance: boolean;
  /**
   * Why the passager's ride is withheld from a line that stands — « Aucune estimation — … » — or
   * `null` when it may be read. {@link gatedRides} reads none while it stands.
   */
  readonly rideCause: string | null;
  /**
   * Why the Vent is withheld — « Vent indisponible — … » — or `null`. While it stands the vue de
   * dessus draws no Banane and no wind on the rose, and says this where the rose's reading goes.
   */
  readonly windCause: string | null;
};

/**
 * Everything the surfaces read. A scrub moves none of it — `x_D` is in none of these — so a memo
 * keyed on these fields holds through one, and `evaluateVerdict` does not re-run per frame.
 */
export type SurfaceInput = {
  /** The rider-free chain's failure, which the refusal is mapped from. */
  readonly failure: Deduced["failure"];
  /** The field holding the caret, or `null` — « Saisie en cours »'s question. */
  readonly focused: FieldId | null;
  /** That field's last committed value as the Rail shows it (`committedValue`), or `null`. */
  readonly committed: string | null;
  /** The raw input half, from `useScene` — gated here, never by the chart. */
  readonly frame: SceneFrame | null;
  /** The Page's vocabulary, which words every sentence the surfaces carry. */
  readonly register: Register;
  /** The three gates over the Scenario and the form's text. */
  readonly report: GateReport;
  /** The raw solved half, from the app's one `useSweep` seam. */
  readonly solved: SceneBase | null;
  /** The Scenario without `x_D`, which the refusal and the results read. */
  readonly traverse: TraverseScenario;
};

export function errorSurfaces({
  failure,
  focused,
  committed,
  frame,
  register,
  report,
  solved,
  traverse,
}: SurfaceInput): ErrorSurfaces {
  const { tightness, unit } = traverse;
  const refusal = failure === null ? null : engineRefusal(failure, { tightness, unit, register });
  const saisie = saisieEnCours(report, focused, committed, register);

  // **One report, read by everything.** Mid-edit is filtered exactly once: the field the caret is
  // in is not on the blocking list, and the output half freezes rather than being suppressed.
  const standing = standingReport(report, saisie);
  const removed = suppression({ report: standing, refusal });

  const shownSolved = removed.solve ? null : solved;
  const results = deriveResults({
    scenario: traverse,
    base: shownSolved,
    report: standing,
    register,
  });

  return {
    occupant: banner({ report, refusal, saisie, verdict: results?.banner ?? null, register }),
    cause: noResultCause({ report, refusal, saisie, register }),
    refusal,
    saisie,
    frame: removed.geometry ? null : frame,
    solved: shownSolved,
    results,
    clearance: !removed.clearance,
    rideCause: rideCause({ report, refusal, saisie, register }),
    windCause: windCause({ report, saisie, register }),
  };
}

/**
 * The passager's two rides **as the gates leave them** — the one way every Page that prints a ride
 * reads it: off the gated solved half, and none while {@link ErrorSurfaces.rideCause} withholds
 * them. Reading `readDynamics` beside it would integrate a ride the gates refuse.
 *
 * @param traverse the Scenario without `x_D`, which no ride reads: a scrub re-runs no ride.
 * @param trace the cached Trace; it sets `ρ` only while it is the line's ground.
 */
export function gatedRides(
  { solved, rideCause: withheld }: Pick<ErrorSurfaces, "solved" | "rideCause">,
  traverse: Pick<TraverseScenario, "material" | "rider" | "wind" | "dynamics" | "geometry">,
  trace: Trace | null,
): DynamicsReading | null {
  if (solved === null || withheld !== null) return null;
  const profile = traverse.geometry.source === "trace" ? trace : null;
  return readDynamics(traverse, solved, solved, profile);
}
