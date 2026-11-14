/**
 * The Page Terrain's words (#101) — its **label table**, in the terrain register (#61): what the
 * Page prints itself, and the chrome it shares with Statique — the coupe's and the map's — so
 * `./copy.test.ts` reads one table for « no exact term, no proscribed word » rather than the screen.
 *
 * Like Dynamique and unlike Statique, it says « estimation », on the vitesse d'arrivée alone.
 */

import { CHOOSE_REGIME_BY_REGISTER, JUMP_LABEL } from "@/lib/app/banner.ts";
import { DISMISS_LABEL } from "@/lib/app/link-strip.ts";
import { refusalLabelTable } from "@/lib/app/refusal-copy.ts";
import { DIAGNOSTIC_ACTION } from "@/lib/app/refusals.ts";
import { COUPE_HOVER, LAYER_LABEL, NO_SPAN_LINE, PEEK_LABEL } from "@/lib/chart/copy.ts";
import {
  ESTIMATE,
  INCOMPLETE,
  NEVER_SETTLES,
  NO_ARRIVAL,
  OUTPUT_LABEL as RIDE_OUTPUT_LABEL,
  RIDE_LABEL,
} from "@/lib/dynamique/copy.ts";
import { peekBadgeLabel, veBadgeLabel } from "@/lib/layout/contract.ts";
import { embarkedLabelTable, mapLabelTable } from "@/lib/map/copy.ts";
import { cellLabel, cellsOf, READ_OUT_SCOPE } from "@/lib/rail/cells.ts";
import { lowerFirst } from "@/lib/rail/fields.ts";
import { GATE_CONSEQUENCE } from "@/lib/rail/gates.ts";
import {
  CLEARANCE_PER_LINE_SCOPE,
  CLEARANCE_SCOPE,
  NO_REGIME_BANNER_BY_REGISTER,
  TRAVERSE_SCOPE,
} from "@/lib/rail/results.ts";
import { OUTPUT_LABEL, pretensionWhere } from "@/lib/statique/copy.ts";
import { label } from "@/lib/vocabulary/labels.ts";

import type { TerrainTileId } from "./view.ts";

/** The five tiles, named as Statique and Dynamique name the same values. */
export const TILE_LABEL = {
  pretension: OUTPUT_LABEL.pretension,
  sag: OUTPUT_LABEL.sag,
  clearance: OUTPUT_LABEL.clearance,
  arrival: RIDE_OUTPUT_LABEL.arrival,
  verdict: OUTPUT_LABEL.verdict,
} as const satisfies Record<TerrainTileId, string>;

/** What the vitesse d'arrivée is read with: the Vent entered, in Dynamique's words. */
export const ARRIVAL_SCOPE = lowerFirst(RIDE_LABEL.windy);

/** The Page's two regions. */
export const SECTION = {
  visualisation: "Visualisation",
  tiles: "Résultats",
} as const;

/** The fixed strings the Page prints, for `./copy.test.ts`. */
export function terrainLabelTable(): readonly string[] {
  return [
    ...Object.values(TILE_LABEL),
    TRAVERSE_SCOPE,
    CLEARANCE_SCOPE,
    CLEARANCE_PER_LINE_SCOPE,
    ARRIVAL_SCOPE,
    NO_ARRIVAL,
    label("stopPoint", "terrain"),
    NEVER_SETTLES,
    ESTIMATE,
    INCOMPLETE,
    pretensionWhere("A"),
    pretensionWhere("B"),
    ...Object.values(GATE_CONSEQUENCE),
    NO_REGIME_BANNER_BY_REGISTER.terrain,
    ...Object.values(SECTION),
    ...mapLabelTable(),
    ...embarkedLabelTable(),
    ...cellsOf("terrain").map((id) => cellLabel(id, "terrain")),
    READ_OUT_SCOPE,
    ...Object.values(LAYER_LABEL).flatMap(({ full, short }) => [full, short]),
    ...Object.values(PEEK_LABEL).flatMap(({ full, short }) => [full, short]),
    ...Object.values(COUPE_HOVER.ground),
    ...Object.values(COUPE_HOVER.line),
    COUPE_HOVER.lineGap,
    COUPE_HOVER.fromFoot,
    COUPE_HOVER.anchorZone,
    label("distance", "terrain"),
    label("groundClearance", "terrain"),
    veBadgeLabel({ state: "auto", ve: 4.7 }),
    veBadgeLabel({ state: "true-scale", ve: 1 }),
    veBadgeLabel({ state: "true-scale-clipped", ve: 1 }),
    peekBadgeLabel({ peek: "true-scale", autofit: 0.6 }),
    peekBadgeLabel({ peek: "fit", autofit: 2.4 }),
    NO_SPAN_LINE,
    DISMISS_LABEL,
    JUMP_LABEL,
    CHOOSE_REGIME_BY_REGISTER.terrain,
    DIAGNOSTIC_ACTION,
    ...refusalLabelTable("terrain"),
  ];
}
