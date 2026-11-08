/**
 * The vue de dessus's words (#93), in the terrain register: the Fonds de carte, the Couche pentes,
 * the two placing controls and the lines under the map. One table, read by the map and by the
 * label tables of the Pages that show it.
 */

import type { Positions } from "@/lib/scenario/types.ts";

import { formatValue } from "@/lib/format/quantity.ts";
import { formatLv95, inLv95Domain, lv95FromWgs84 } from "@/lib/terrain/lv95.ts";
import { label } from "@/lib/vocabulary/labels.ts";

import type { Fond } from "./display.ts";
import type { Anchor } from "./gesture.ts";

import { FONDS } from "./display.ts";
import { fondAttribution } from "./style.ts";

export const FOND_LABEL = {
  "carte-claire": "Carte claire",
  orthophoto: "Orthophoto swissimage",
  "carte-nationale": "Carte nationale",
} as const satisfies Record<Fond, string>;

export const MAP_COPY = {
  fond: "Fond de carte",
  pentes: "Pentes supérieures à 30°",
  placeA: "Placer A",
  placeB: "Placer B",
  unavailable: "fond de carte indisponible",
  loading: "Chargement du profil geo.admin…",
  /** The map's accessible name. */
  title: `Carte de la ${label("anchorLine", "terrain")}`,
} as const;

/** What the next click does, said under the map — `null` when a click does nothing. */
export function clickHint(target: Anchor | null, positions: Positions): string | null {
  if (target === null) return null;
  const verb = positions[target] === null ? "placer" : "déplacer";
  return `Cliquez sur la carte pour ${verb} ${target}.`;
}

/**
 * Where an anchor is drawn, as a line under the map — LV95 by swisstopo's approximate formulas in
 * Switzerland, the WGS84 degrees elsewhere. It follows the pointer during a drag.
 */
export function anchorReading(anchor: Anchor, positions: Positions): string | null {
  const position = positions[anchor];
  if (position === null) return null;
  if (inLv95Domain(position)) {
    return `${anchor} : ${formatLv95(lv95FromWgs84(position))} (${label("lv95", "terrain")} ${label("approximate", "terrain")})`;
  }
  return `${anchor} : ${label("latitude", "terrain")} ${formatValue("coordinate", position.lat)}° · ${label("longitude", "terrain")} ${formatValue("coordinate", position.lon)}°`;
}

/** The fixed strings the vue de dessus prints, for the label tables of the Pages that show it. */
export function mapLabelTable(): readonly string[] {
  return [
    ...Object.values(FOND_LABEL),
    ...Object.values(MAP_COPY),
    ...new Set(FONDS.map(fondAttribution)),
    ...(["A", "B"] as const).flatMap((anchor) => [
      clickHint(anchor, { A: null, B: null }) ?? "",
      clickHint(anchor, { A: { lat: 0, lon: 0 }, B: { lat: 0, lon: 0 } }) ?? "",
    ]),
  ];
}
