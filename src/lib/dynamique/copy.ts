/**
 * The Page Dynamique's words (#92) — its **label table**, in the terrain register (#61): what the
 * Page prints itself. The rows it renders through shared components name their fields with
 * `fieldLabel(id, "terrain")`, and those names are listed too, so `./copy.test.ts` reads one table
 * for « no exact term, no proscribed word » rather than the screen.
 *
 * Unlike Statique, this Page **does** say « estimation »: every value it prints is one (§12.2).
 */

import type { GateId } from "@/lib/rail/fields.ts";
import type { DynamicsWarningId } from "@/lib/scenario/dynamics.ts";
import type { ScenarioDraft } from "@/lib/scenario/types.ts";

import { ASSUMED_NOTE, AVANCE_NOTICE, avanceNoticeText } from "@/lib/app/avance-copy.ts";
import { refusalLabelTable } from "@/lib/app/refusal-copy.ts";
import { COUPE_HOVER, NO_SPAN_LINE } from "@/lib/chart/copy.ts";
import { fieldLabel } from "@/lib/rail/fields.ts";
import { GATE_CONSEQUENCE, WIND_UNPLACED } from "@/lib/rail/gates.ts";
import { FIELD_NOTE } from "@/lib/rail/help.ts";
import { heading, label } from "@/lib/vocabulary/labels.ts";

/** The fields' groups, in the order the Page lists them. */
export const DYNAMIQUE_GROUPS = {
  passenger: heading("passenger", "terrain"),
  wind: heading("wind", "terrain"),
} as const;

/** The fields the Page edits, in screen order — each through the Rail's own row and gates. */
export const DYNAMIQUE_FIELDS = ["mp", "windSpeed", "windDirection"] as const;

/**
 * The gates whose outputs the Page prints: the line its rides run on, and the rides — which read
 * the Vent. No Verdict and no garde here, so their breaches stand on nothing this Page shows.
 */
export const DYNAMIQUE_GATES = ["solve", "wind", "ride"] as const satisfies readonly GateId[];

/** The Page's regions. */
export const SECTION = {
  outputs: "Résultats",
  section: "Coupe, vitesse et accélération",
} as const;

/** The two rides, as the tiles, the markers and the hover name them. */
export const RIDE_LABEL = {
  calm: "Sans vent",
  windy: "Avec le vent saisi",
} as const;

/** The two rides' markers on the charts: short enough to sit beside a vertical rule. */
export const MARKER_LABEL = {
  calm: `${label("stopPoint", "terrain")} sans vent`,
  windy: `${label("stopPoint", "terrain")} avec vent`,
} as const;

/** The two rides in the hover, where the line has room for two words and no more. */
export const RIDE_SHORT = {
  calm: "sans vent",
  windy: "avec vent",
} as const;

/** What each ride's tile prints, in order. */
export const OUTPUT_LABEL = {
  stop: heading("stopPoint", "terrain"),
  arrival: heading("arrivalSpeed", "terrain"),
  duration: "Durée de la traversée",
} as const;

/** « estimation » — beside every dynamic value, since the Page's numbers are all one (#6). */
export const ESTIMATE = label("estimate", "terrain");

/** The Point d'arrêt's absence: the engine reports none, the passager reaches B. */
export const ARRIVES_AT_END = "arrive au bout";

/** A ride that reaches B, named on the coupe where its Point d'arrêt would stand. */
export const ARRIVAL_LABEL = {
  calm: `${MARKER_LABEL.calm} : ${ARRIVES_AT_END}`,
  windy: `${MARKER_LABEL.windy} : ${ARRIVES_AT_END}`,
} as const;

/** No Point d'arrêt either, and no arrival: the engine's swing never settles. */
export const NEVER_SETTLES = "oscille sans s'arrêter";

/** The arrival's absence on a ride that stops before B. */
export const NO_ARRIVAL = "pas d'arrivée";

/** Why there is no ride to read when the traverse solved only in part. */
export const INCOMPLETE = "Traversée incomplète : ni point d'arrêt ni vitesse d'arrivée calculés.";

/**
 * The sentence under the two rides when they are one: no wind entered, or one that does not push
 * along the line — a crosswind — so it names neither case.
 */
export const COINCIDE_NOTE =
  "Aucun vent ne pousse le long de la ligne : les deux points d'arrêt coïncident.";

/** The curve's caption: what each line is, in the units it is read in. */
export const CURVE_CAPTION = {
  full: `Vitesse (m/s, trait plein) et accélération (m/s², pointillé) · ${ESTIMATE}`,
  short: `Vitesse · accélération · ${ESTIMATE}`,
  /** Appended while the two rides differ: the lighter speed line is the one without wind. */
  calm: "gris : sans vent",
} as const;

/** The two SVGs' accessible names. */
export const CHART_TITLE = {
  section: `Coupe : profil, ${label("line", "terrain")} chargée et ${label("trajectory", "terrain")} du ${label("passenger", "terrain")}`,
  curve: `Vitesse et accélération du ${label("passenger", "terrain")} le long de la ${label("line", "terrain")}`,
} as const;

/** The curve's hover words; the coupe's are `COUPE_HOVER`'s, shared with every coupe. */
export const HOVER_LABEL = {
  distance: label("distance", "terrain"),
  speed: "vitesse",
  acceleration: "accélération",
} as const;

/** One line under the tiles: where the constants are set, and what stands behind them. */
export const CONSTANTS_NOTE = {
  textile: "Les constantes (traînée, frottement, air) se règlent sur Avancé : constantes SSF.",
  steel:
    "Les constantes (traînée, frottement, air) se règlent sur Avancé : loi à μ constant, non confirmée.",
} as const satisfies Record<ScenarioDraft["material"]["family"], string>;

/**
 * The engine's warnings that this Page words. The câble's unconfirmed friction is not a warning
 * here: it is the provenance line {@link CONSTANTS_NOTE} already carries.
 */
export const WARNING_COPY = {
  "quasi-static": `Vitesse élevée devant celle des ondes dans la ${label("line", "terrain")} : la ${label("trajectory", "terrain")} figée décrit mal la ${label("traverse", "terrain")}.`,
  "steel-trolley-unconfirmed": null,
} as const satisfies Record<DynamicsWarningId, string | null>;

/** The fixed strings the Page prints, for `./copy.test.ts`. */
export function dynamiqueLabelTable(): readonly string[] {
  return [
    ...Object.values(DYNAMIQUE_GROUPS),
    ...DYNAMIQUE_FIELDS.map((id) => fieldLabel(id, "terrain")),
    ...DYNAMIQUE_FIELDS.flatMap((id) => FIELD_NOTE[id] ?? []),
    WIND_UNPLACED.reason,
    WIND_UNPLACED.notice,
    ...Object.values(SECTION),
    ...Object.values(RIDE_LABEL),
    ...Object.values(MARKER_LABEL),
    ...Object.values(RIDE_SHORT),
    ...Object.values(OUTPUT_LABEL),
    ESTIMATE,
    ARRIVES_AT_END,
    ...Object.values(ARRIVAL_LABEL),
    NEVER_SETTLES,
    NO_ARRIVAL,
    COINCIDE_NOTE,
    INCOMPLETE,
    ...Object.values(CURVE_CAPTION),
    ...Object.values(CHART_TITLE),
    ...Object.values(HOVER_LABEL),
    ...Object.values(COUPE_HOVER.ground),
    ...Object.values(COUPE_HOVER.line),
    COUPE_HOVER.lineGap,
    COUPE_HOVER.fromFoot,
    ...Object.values(CONSTANTS_NOTE),
    ...Object.values(WARNING_COPY).filter((text) => text !== null),
    NO_SPAN_LINE,
    ...DYNAMIQUE_GATES.map((gate) => GATE_CONSEQUENCE[gate]),
    AVANCE_NOTICE.action,
    ...DYNAMIQUE_GATES.map(avanceNoticeText),
    ASSUMED_NOTE,
    ...refusalLabelTable("terrain"),
  ];
}
