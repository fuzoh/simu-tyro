/**
 * **What a standing breach removes from the screen** — « v1 build spec » § 7 (*Les trois grilles de
 * validation*, *« Aucun résultat » — une cause, trois échos*, *L'exception géométrique*).
 *
 * § 7's gate table has a third column — « ce que l'échec supprime » — and until A11 nothing read
 * it: the scene and the results were derived from the **store**, which holds numbers, while the
 * breach lives in the **form**, which holds text. A committed-invalid « −5 » typed into `Portée`
 * therefore lit the banner while the whole output half kept printing the last valid Sweep — the
 * exact « no stale numbers, ever » failure invariant 3 exists to forbid, and a link carrying the
 * same value behaved differently from the keystroke that produced it.
 *
 * So the suppression is a **pure function of the standing gate report** and is applied once, at the
 * app root, to everything derived from the Scenario. Both paths — typed and arrived — go through
 * it, which is what makes them one state rather than two.
 *
 * | Breach | Ce qu'il supprime |
 * | --- | --- |
 * | **Solve Gate** | tout l'aval : ni `SpanState`, ni câble, ni read-out |
 * | **Clearance Gate** | la garde au sol et la courbe de garde **seules** — le câble se dessine |
 * | **Verdict Gate** | le bandeau et la grille critères × extrémités **seuls** |
 * | **L'exception géométrique** | les deux tracés, sans graduations et sans piste de pointeur |
 *
 * Rules this module exists to keep:
 *
 * - **The geometric exception is scoped to `L` / `h` / station failures** and written down *as* an
 *   exception: without the scope somebody applies « collapse both plots » to every failure alike
 *   and computes a scale over a NaN domain.
 * - **A refusal suppresses like a Solve breach.** « Tension impossible » leaves no `SpanState`, so
 *   there is nothing downstream to draw — and the frame keeps drawing, because « les entrées se
 *   dessinent toujours ».
 * - **Mid-edit suppresses nothing.** The caller hands in the report `standingReport` already
 *   filtered: under « Saisie en cours » the output half **freezes** on the last valid Sweep, which
 *   is the opposite of a suppression.
 */

import type { EngineRefusal } from "@/lib/app/refusals.ts";
import type { FieldId } from "@/lib/rail/fields.ts";
import type { GateReport } from "@/lib/rail/gates.ts";

/**
 * The four fields whose failure leaves **no shared x domain at all** — it is defined as span + 5 %,
 * so `x_D`, defined on `[0, L]`, has no interval to live in and the clamp has nothing to clamp
 * into. § 7 scopes the exception to exactly these and no others.
 */
const GEOMETRY_FIELDS: ReadonlySet<FieldId> = new Set<FieldId>(["L", "h", "sa", "sb"]);

/** How much picture survives. Each flag is « suppressed », so `false` everywhere is a clean line. */
export type Suppression = {
  /** *L'exception géométrique*: both plots collapse to an empty frame, and pointer input is inert. */
  readonly geometry: boolean;
  /** Tout l'aval: no `SpanState`, no cable, no read-out, no `Résultats`, no deduced solve rows. */
  readonly solve: boolean;
  /** The garde au sol and its curve **alone** — the cable, both tensions and the slope stand. */
  readonly clearance: boolean;
  /** The verdict and the criteria × ends grid **alone**. */
  readonly verdict: boolean;
};

/**
 * What this Scenario's standing breaches remove.
 *
 * @param report the **standing** report — `standingReport(report, saisie)`, so a field the caret is
 *   in has already been taken off the list. Passing the raw report would blank the output half on
 *   every keystroke that momentarily empties a field, which is the state « Saisie en cours » was
 *   split off to prevent.
 * @param refusal the engine's refusal for this Scenario, or `null`.
 */
export function suppression({
  report,
  refusal,
}: {
  readonly report: GateReport;
  readonly refusal: EngineRefusal | null;
}): Suppression {
  const geometry = report.errors.some((error) => GEOMETRY_FIELDS.has(error.field));
  // A geometry failure is a Solve breach in the report already; it is restated here because the
  // implication is what the type promises, not something a caller may re-derive from the flags.
  const solve = geometry || refusal !== null || !report.passed.solve;
  return {
    geometry,
    solve,
    clearance: solve || !report.passed.clearance,
    verdict: solve || !report.passed.verdict,
  };
}
