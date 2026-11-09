/**
 * What a simplified Page says about the values it does not show — one wording for Statique and
 * Dynamique, because the other Page they point to is the same one.
 */

import type { FieldId, GateId } from "@/lib/rail/fields.ts";
import type { GateReport } from "@/lib/rail/gates.ts";

import { pageReport } from "@/lib/app/banner.ts";
import { GATE_IDS } from "@/lib/rail/fields.ts";
import { GATE_CONSEQUENCE } from "@/lib/rail/gates.ts";

/**
 * What the Page says when a value it does not show is refused — one Avancé still holds, from a link
 * or an earlier edit. The field is not named: its name is Avancé's.
 */
export const AVANCE_NOTICE = {
  text: "Une valeur réglée sur la Page Avancé bloque le calcul.",
  action: "Ouvrir la Page Avancé",
} as const;

/**
 * The notice's sentence for a breach of this gate. Only a Solve, Wind or Ride breach stops a
 * computation; a Clearance or Verdict breach removes its own output alone — the line still solves —
 * so it says what is gone and does not claim the calculation is blocked.
 */
export function avanceNoticeText(gate: GateId): string {
  if (gate === "clearance" || gate === "verdict") {
    return `Une valeur réglée sur la Page Avancé est invalide : ${GATE_CONSEQUENCE[gate]}.`;
  }
  return AVANCE_NOTICE.text;
}

/**
 * The worst gate breached by a value a simplified Page does not show, among the gates it prints —
 * `null` while every refused value is one it shows. One rule for every such Page: its notice, and
 * the banner's jump that lands on the notice's link, read this and nothing else.
 *
 * @param gates the gates whose outputs the Page prints.
 * @param shown whether the Page shows the field, by its own predicate.
 */
export function breachedElsewhere(
  report: GateReport,
  gates: readonly GateId[],
  shown: (field: FieldId) => boolean,
): GateId | null {
  const breached = pageReport(report, gates)
    .errors.filter((error) => !shown(error.field))
    .map((error) => error.gate);
  return GATE_IDS.find((gate) => breached.includes(gate)) ?? null;
}

/** The line under the fields: what the Page does not ask for is kept, not reset. */
export const ASSUMED_NOTE =
  "Les autres valeurs restent celles de la Page Avancé, qui les affiche toutes.";
