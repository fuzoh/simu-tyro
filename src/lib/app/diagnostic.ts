/**
 * `[ Copier le diagnostic ]`'s payload, **assembled from what the app already holds** — « v1 build
 * spec » § 7 (*« Calcul impossible » — aucun résidu à l'écran, aucun `SolveNote`, aucun panneau
 * dev*).
 *
 * `./refusals.ts` writes the payload's *format*; this module is the one place that says **where
 * each field comes from**, and it is separate for two reasons that are not tidiness:
 *
 * - `./refusals.ts` may not import `@/lib/rail/deduced.ts`, which imports it. A type-only cycle is
 *   still a cycle to the linter and to anyone reading the graph.
 * - It keeps the assembly a **pure function with no clock and no clipboard**, so the `node` suite
 *   can assert the payload for a scenario whose refusal was injected. The instant, the build and
 *   the origin arrive as parameters for exactly that reason.
 *
 * The payload is **evidence, not UI copy** — English keys, full float precision, a decimal point —
 * and it carries **no terrain**: `solveSpan` is terrain-free and clearance is a reducer above it,
 * so a solve failure is fully reproducible without the 200-row trace.
 */

import type { Deduced } from "@/lib/rail/deduced.ts";
import type { ScenarioDraft } from "@/lib/scenario/types.ts";
import type { Trace } from "@/lib/terrain/trace.ts";

import { copyLink } from "./persist.ts";
import { diagnosticPayload } from "./refusals.ts";

export type DiagnosticContext = {
  readonly scenario: ScenarioDraft;
  /** The cached profile — read only by `copyLink`, to count its points in a refusal sentence. */
  readonly trace: Trace | null;
  /** The rider-free chain, refusal included. `failure === null` means there is nothing to copy. */
  readonly deduced: Deduced;
  /** The instant, ISO-8601. **A parameter**: the payload stays a pure function with no clock. */
  readonly at: string;
  /** The build identifier the header carries. */
  readonly build: string;
  /** The page's own origin — the link budget is on the **whole** URL. */
  readonly origin: string;
};

/**
 * @returns the clipboard text, or `null` when this Scenario has no engine failure to report — the
 *   surface that offers the action only exists where one does, so `null` is a caller bug rather
 *   than a state.
 */
export function buildDiagnostic({
  scenario,
  trace,
  deduced,
  at,
  build,
  origin,
}: DiagnosticContext): string | null {
  const { failure, material, span, solve } = deduced;
  if (failure === null) return null;

  const link = copyLink({ scenario, trace, origin });
  const { strength, EA, w } = material;

  return diagnosticPayload({
    failure,
    at,
    build,
    scenario,
    // `L₀` is `null` when the **inversion** is what refused: there was never a span to post.
    span: span === null ? null : { L: span.L, h: span.h, L0: solve?.L0 ?? null },
    // The three the solver consumes, or `null` while the Material Spec is still incomplete — which
    // is a state a diagnostic has to be able to report rather than fabricate a zero for.
    derived: strength === null || EA === null || w === null ? null : { w, EA, strength },
    // The **unloaded** solve carries no rider, so the loads line is empty and printed anyway: a
    // reader has to be able to tell « none » from « not recorded ».
    loads: [],
    // `null` prints « (non partageable — tracé hors budget) », so the payload never silently omits
    // a field. A refusal here is the link's, not the solver's.
    address: link.ok ? link.href : null,
  });
}
