/**
 * The fields the Page Statique edits (#91), and which of them it shows for one Scenario.
 *
 * Statique shows the fields a rigger sets on site and assumes the rest: the majoration au départ is
 * not entered, the terminaisons, their rendement and the rapport V are hidden. Those values stay
 * in the Scenario as the link or Avancé left them, and a field this Page does not show — for the
 * Scenario on screen — is reached on Avancé. The Page's fields, its « blocked elsewhere » notice
 * and its banner jump all read {@link shownOnStatique}, so the three cannot disagree on where a
 * field is.
 */

import type { FieldId, GateId } from "@/lib/rail/fields.ts";
import type { ScenarioDraft } from "@/lib/scenario/types.ts";

/** In screen order — each through the same row, the same commit and the same gates as on Avancé. */
export const STATIQUE_FIELDS = [
  "L",
  "h",
  "zA",
  "zB",
  "family",
  "d",
  "mbfOverride",
  "dTextile",
  "MBL",
  "carryingLines",
  "tensioningDevice",
  "tensioningSide",
  "T_target",
  "mp",
  "regime",
  "windSpeed",
  "windDirection",
  "usage",
  "hClearMin",
  "hRider",
] as const satisfies readonly FieldId[];

/**
 * The gates whose outputs Statique prints — the statics, the garde, the Verdict, and the Vent its
 * vue de dessus draws. It prints no ride, so a Ride Gate breach stands on nothing here: its banner,
 * its notice and its jump leave it to the Pages that read one.
 */
export const STATIQUE_GATES = [
  "solve",
  "clearance",
  "verdict",
  "wind",
] as const satisfies readonly GateId[];

/**
 * Does Statique show this field for this Scenario? Of the alternatives, `L` and `h` show in manual
 * geometry only — an imported profil is taken whole and its portée is read off it — `d` and
 * `mbfOverride` on a câble, `dTextile` and `MBL` on a corde.
 */
export function shownOnStatique(
  id: FieldId,
  { geometry, material }: Pick<ScenarioDraft, "geometry" | "material">,
): boolean {
  switch (id) {
    case "L":
    case "h":
      return geometry.source === "manual";
    case "d":
    case "mbfOverride":
      return material.family === "steel";
    case "dTextile":
    case "MBL":
      return material.family === "textile";
    default:
      return (STATIQUE_FIELDS as readonly FieldId[]).includes(id);
  }
}
