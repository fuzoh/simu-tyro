/**
 * The Page Statique's words (#91) — its **label table**: what the Page itself prints, in the
 * terrain register (#61). The rows it renders through shared components name their fields with
 * `fieldLabel(id, "terrain")`, and those names are listed here too, so `./copy.test.ts` reads one
 * table for « no exact term, no proscribed word » rather than the screen.
 */

import type { ScenarioDraft } from "@/lib/scenario/types.ts";

import { ASSUMED_NOTE, AVANCE_NOTICE, avanceNoticeText } from "@/lib/app/avance-copy.ts";
import { CHOOSE_REGIME_BY_REGISTER, JUMP_LABEL } from "@/lib/app/banner.ts";
import { DISMISS_LABEL } from "@/lib/app/link-strip.ts";
import { refusalLabelTable } from "@/lib/app/refusal-copy.ts";
import { DIAGNOSTIC_ACTION } from "@/lib/app/refusals.ts";
import { COUPE_HOVER, LAYER_LABEL, NO_SPAN_LINE, PEEK_LABEL } from "@/lib/chart/copy.ts";
import { peekBadgeLabel, veBadgeLabel } from "@/lib/layout/contract.ts";
import { mapLabelTable } from "@/lib/map/copy.ts";
import { cellLabel, cellsOf, READ_OUT_SCOPE } from "@/lib/rail/cells.ts";
import {
  AVANCE_SETTING,
  CARRYING_LINES_OPTIONS,
  FAMILY_LABEL,
  fieldLabel,
  OVERRIDE_COPY,
  PICKER_COPY,
  TENSIONING_DEVICE_OPTIONS,
  TENSIONING_SIDE_OPTIONS,
  usageOptions,
} from "@/lib/rail/fields.ts";
import { GATE_CONSEQUENCE, TEXTILE_UNAVAILABLE_REASON, WIND_UNPLACED } from "@/lib/rail/gates.ts";
import { FIELD_NOTE } from "@/lib/rail/help.ts";
import { MATERIAL_PRESETS, PRESET_LABEL, SHEET_CHIP, VALUE_CHIP } from "@/lib/rail/presets.ts";
import {
  CLEARANCE_PER_LINE_SCOPE,
  CLEARANCE_SCOPE,
  NO_REGIME_BANNER_BY_REGISTER,
  TRAVERSE_SCOPE,
} from "@/lib/rail/results.ts";
import { MAESTRO_ROPE_ONLY, PASS_TO_PULLEY } from "@/lib/rail/tensioning.ts";
import { REGIMES } from "@/lib/sim";
import {
  PROFILE_IMPORT_COPY,
  SWISSTOPO_ATTRIBUTION,
  terrainDisclosure,
  traceName,
} from "@/lib/terrain/provenance.ts";
import { heading, label } from "@/lib/vocabulary/labels.ts";

import type { Unoriented } from "./top-view.ts";

import { STATIQUE_FIELDS, STATIQUE_GATES } from "./fields.ts";

/** The fields' groups, in the order the Page lists them. */
export const STATIQUE_GROUPS = {
  profile: heading("profile", "terrain"),
  anchors: heading("anchors", "terrain"),
  line: heading("line", "terrain"),
  tensioning: heading("tensioningDevice", "terrain"),
  passenger: heading("passenger", "terrain"),
  regime: heading("regime", "terrain"),
  wind: heading("wind", "terrain"),
  installation: heading("installation", "terrain"),
} as const;

/** The Mise en tension's device, under the group that already names it. */
export const DEVICE_LABEL = "Dispositif";

/** The four outputs and the Verdict, in the order the Page prints them. */
export const OUTPUT_LABEL = {
  pretension: heading("pretension", "terrain"),
  sag: heading("sag", "terrain"),
  loadedSag: `${heading("loadedSag", "terrain")} maximale`,
  clearance: `${heading("groundClearance", "terrain")} minimale`,
  verdict: heading("verdict", "terrain"),
} as const;

/** Where the tension de pose is read: per member, at the anchor carrying the Mise en tension. */
export function pretensionWhere(side: ScenarioDraft["tensioningSide"]): string {
  return `par ${label("line", "terrain")}, ${label("anchor", "terrain")} ${side}`;
}

/** The Page's regions. */
export const SECTION = {
  fields: "Réglages",
  outputs: "Résultats",
  section: "Coupe",
  topView: "Vue de dessus",
} as const;

/**
 * The plain drawing's own words (#91) — what the vue de dessus shows where no map can start. The
 * map's are `@/lib/map/copy.ts`'s.
 */
export const TOP_VIEW = {
  north: "N",
  /** The `<svg>`'s accessible name. */
  title: `Vue de dessus de la ${label("anchorLine", "terrain")}`,
} as const;

/** Why the line is drawn level with no north — one sentence per {@link Unoriented} cause. */
export const UNORIENTED = {
  absent: "orientation inconnue : positions des ancrages absentes",
  outside: "orientation inconnue : positions des ancrages hors du domaine suisse",
  coincident: "orientation inconnue : positions des ancrages confondues",
} as const satisfies Record<Unoriented, string>;

/**
 * The fixed strings the Page prints: the strings above; the shared rows' — the field names and
 * options, the preset's chips on the two rows that carry them, the profil's controls, the names it
 * gives a profil and its terrain disclosure; the banner's actions and the gates' consequences; the
 * « clé ignorée » strip's dismiss control; the Chart Block's chrome — the read-out cells and
 * their scope, the View Strip's labels in both lengths, the vertical scale's badge in each of its
 * states and the empty plots' line; and the vue de dessus's map — its Fonds, the Couche pentes, the
 * placing controls, its attributions and its hints. That is what `./copy.test.ts` holds to the
 * terrain register.
 *
 * Not in it: sentences built from a Scenario (a gate's message, the Verdict's reason, a profil's
 * disclosure, the « clé ignorée » strip's sentences), which tests hold in the terrain register on
 * their own; a CSV's file name, which is the user's; the shell's `<noscript>` line; and the two SVG
 * drawings' own annotations and accessible names (`profile.tsx`, `strip.tsx`), which the Chart
 * Block draws alike on every Page.
 */
export function statiqueLabelTable(): readonly string[] {
  return [
    ...Object.values(STATIQUE_GROUPS),
    ...STATIQUE_FIELDS.map((id) => fieldLabel(id, "terrain")),
    heading("span", "terrain"),
    heading("elevationDifference", "terrain"),
    DEVICE_LABEL,
    ...Object.values(FAMILY_LABEL),
    ...usageOptions("terrain").map((option) => option.label),
    ...Object.values(PICKER_COPY),
    ...Object.values(OVERRIDE_COPY),
    AVANCE_SETTING,
    ...CARRYING_LINES_OPTIONS.map((option) => option.label),
    ...TENSIONING_DEVICE_OPTIONS.map((option) => option.label),
    ...TENSIONING_SIDE_OPTIONS.map((option) => option.label),
    PRESET_LABEL,
    ...MATERIAL_PRESETS.map((preset) => preset.label),
    SHEET_CHIP,
    ...MATERIAL_PRESETS.flatMap(({ provenance }) => [
      provenance.MBL.detail,
      provenance.dTextile.detail,
    ]),
    VALUE_CHIP.label,
    VALUE_CHIP.detail,
    TEXTILE_UNAVAILABLE_REASON,
    MAESTRO_ROPE_ONLY,
    ...STATIQUE_FIELDS.flatMap((id) => FIELD_NOTE[id] ?? []),
    WIND_UNPLACED.reason,
    ...Object.values(REGIMES).map((regime) => regime.label),
    ...Object.values(OUTPUT_LABEL),
    TRAVERSE_SCOPE,
    CLEARANCE_SCOPE,
    CLEARANCE_PER_LINE_SCOPE,
    ...STATIQUE_GATES.map((gate) => GATE_CONSEQUENCE[gate]),
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
    ...Object.values(PROFILE_IMPORT_COPY),
    traceName({ kind: "geoadmin" }),
    traceName({ kind: "lien" }),
    ...terrainDisclosure({ kind: "manual" }).flatMap(({ text, detail }) =>
      detail === undefined ? [text] : [text, detail],
    ),
    SWISSTOPO_ATTRIBUTION,
    pretensionWhere("A"),
    pretensionWhere("B"),
    ...Object.values(SECTION),
    ...Object.values(TOP_VIEW),
    ...Object.values(UNORIENTED),
    ...mapLabelTable(),
    AVANCE_NOTICE.action,
    ...STATIQUE_GATES.map(avanceNoticeText),
    ASSUMED_NOTE,
    NO_REGIME_BANNER_BY_REGISTER.terrain,
    CHOOSE_REGIME_BY_REGISTER.terrain,
    JUMP_LABEL,
    DIAGNOSTIC_ACTION,
    PASS_TO_PULLEY,
    ...refusalLabelTable("terrain"),
  ];
}
