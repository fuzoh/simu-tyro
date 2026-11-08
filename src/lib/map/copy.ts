/**
 * The vue de dessus's words (#93), in the terrain register: the Fonds de carte, the Couche pentes,
 * the two placing controls, the switch to the Vue 3D (#95) and the lines under the map. One table,
 * read by the map and by the label tables of the Pages that show it.
 */

import type { Positions, Wind } from "@/lib/scenario/types.ts";

import { formatQuantity, formatValue } from "@/lib/format/quantity.ts";
import { formatLv95, inLv95Domain, lv95FromWgs84 } from "@/lib/terrain/lv95.ts";
import { label } from "@/lib/vocabulary/labels.ts";

import type { Fond } from "./display.ts";
import type { Anchor } from "./gesture.ts";
import type { Vue3dBlock } from "./vue-3d.ts";
import type { RoseReference } from "./wind-rose.ts";

import { FONDS } from "./display.ts";
import { fondAttribution } from "./style.ts";
import { drapedAttribution } from "./vue-3d.ts";
import { windAzimuth } from "./wind-rose.ts";

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
  rose: "Rose des vents",
  /** The rose's handle, which has no label of its own: a hover says what it does. */
  roseHandle: "Glissez pour régler la direction et la force du vent",
  roseCalm: "Pas de vent. Glissez la poignée de la rose pour en régler la direction et la force.",
  /** Where the line is drawn level the reading says why it gives no azimuth. */
  roseNorthUnknown: "nord inconnu",
  /** The ambient note under a drawn Banane (#96): a shape, never a distance. */
  bananeNote: "Banane : allure, pas une distance.",
  /** The switch that puts the Vue 3D in the vue de dessus's place (#95). */
  view3d: "3D",
  /** The Vue 3D's accessible name. */
  vue3dTitle: `Vue 3D de la ${label("anchorLine", "terrain")}`,
  vue3dLoading: "Chargement de la Vue 3D…",
  /** No network, no WebGL: the vue de dessus is back, and this says why. */
  vue3dUnavailable: "Vue 3D indisponible",
} as const;

/**
 * What the Banane is, on hover: drawn rather than computed, its amplitude a `[CONVENTION]` — a
 * drawing choice proportional to the wind's cross component — and no distance behind it.
 */
export const BANANE_HELP =
  `La ${label("banana", "terrain")} est dessinée, pas calculée : la ligne à vide s'incurve du côté sous le vent, d'autant plus que le vent souffle en travers. ` +
  "Le facteur de proportionnalité est un choix de dessin [CONVENTION], jamais une sortie du moteur. " +
  "Elle donne une allure, pas une distance : ni déport latéral ni garde au sol sous vent avec passager n'en sont lus.";

/** Why the switch to the Vue 3D is off, said under the map. */
export const VUE_3D_BLOCKED = {
  positions: "Vue 3D : placez A et B sur la carte.",
  profil:
    "Vue 3D : il faut le profil entre A et B — replacez A ou B sur la carte, ou importez un profil.",
} as const satisfies Record<Vue3dBlock, string>;

/** The eight points of the compass, with the preposition they take. */
const COMPASS = [
  "de nord",
  "de nord-est",
  "d'est",
  "de sud-est",
  "de sud",
  "de sud-ouest",
  "d'ouest",
  "de nord-ouest",
] as const;

/**
 * Where a relative direction comes from, from the rider's seat: the four sides on the axes, the
 * four quarters between them. 108° is « par la droite à l'arrière ».
 */
export function describeRelative(relativeDeg: number): string {
  const d = ((relativeDeg % 360) + 360) % 360;
  if (d === 0) return "de face";
  if (d === 90) return "par la droite";
  if (d === 180) return "dans le dos";
  if (d === 270) return "par la gauche";
  const side = d < 180 ? "droite" : "gauche";
  const end = d < 90 || d > 270 ? "avant" : "arrière";
  return `par la ${side} à l'${end}`;
}

/**
 * The line under the map that says what the rose says: the true azimuth when the Positions give
 * one, and in every case the direction relative to the line — the number the field holds.
 */
export function windReading(wind: Wind, reference: RoseReference): string {
  if (wind.speedKmh === 0) return MAP_COPY.roseCalm;
  const relative = Math.round(((wind.directionDeg % 360) + 360) % 360) % 360;
  const speed = formatQuantity("windSpeed", wind.speedKmh);
  const side = `${describeRelative(relative)}, ${relative}° par rapport à la ligne A → B`;
  if (!reference.oriented) return `Vent à ${speed} : ${side} (${MAP_COPY.roseNorthUnknown}).`;
  const azimuth = Math.round(windAzimuth(relative, reference)) % 360;
  const point = COMPASS[Math.round(azimuth / 45) % 8];
  return `Vent ${point} (${azimuth}°), ${speed} : ${side}.`;
}

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
    ...Object.values(VUE_3D_BLOCKED),
    BANANE_HELP,
    ...[0, 90, 180, 270, 45, 108].map(describeRelative),
    ...new Set([...FONDS.map(fondAttribution), ...FONDS.map(drapedAttribution)]),
    ...(["A", "B"] as const).flatMap((anchor) => [
      clickHint(anchor, { A: null, B: null }) ?? "",
      clickHint(anchor, { A: { lat: 0, lon: 0 }, B: { lat: 0, lon: 0 } }) ?? "",
    ]),
  ];
}
