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
import type { MeasurePoints, MeasureReading } from "./measure.ts";
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
  /** The same calm on a rose that has no handle (#101). */
  calm: "Pas de vent.",
  /** Where the line is drawn level the reading says why it gives no azimuth. */
  roseNorthUnknown: "nord inconnu",
  /** The ambient note under a drawn Banane (#96): a shape, never a distance. */
  bananeNote: "Banane : allure, pas une distance.",
  /** The switch that puts the Vue 3D in the vue de dessus's place (#95). */
  view3d: "3D",
  /** Its other half on the Page Terrain (#101), where it flips the map and the coupe together. */
  view2d: "2D",
  /** That pair's accessible name. */
  views: "Visualisation",
  /** The Vue 3D's accessible name. */
  vue3dTitle: `Vue 3D de la ${label("anchorLine", "terrain")}`,
  vue3dLoading: "Chargement de la Vue 3D…",
  /** No network, no WebGL: the vue de dessus is back, and this says why. */
  vue3dUnavailable: "Vue 3D indisponible",
} as const;

/** The Mesure's words (#98). */
export const MEASURE_COPY = {
  /** The button that enters the tool. */
  enter: "Mesure",
  /** The same button, once the tool is on: it quits. */
  quit: "Quitter la mesure",
  /** The readout's accessible name. */
  title: "Mesure",
  horizontal: "Distance horizontale",
  direct: "Distance directe",
  ground: "Distance au sol",
  loading: "calcul du profil…",
  /** Offline, and the profil in memory does not hold both points. */
  offline: "indisponible hors réseau",
  /** The service has no terrain there, so no network would help. */
  outOfCoverage: "indisponible hors couverture swisstopo",
  /** What the next click does, by how many points are down. */
  hintFirst: "Mesure : cliquez sur le premier point.",
  hintSecond: "Mesure : cliquez sur le second point.",
  hintAgain: "Mesure : un nouveau clic recommence.",
} as const;

/** What the next click does while the Mesure is on, said under the map. */
export function measureHint(points: MeasurePoints): string {
  switch (points.length) {
    case 0:
      return MEASURE_COPY.hintFirst;
    case 1:
      return MEASURE_COPY.hintSecond;
    default:
      return MEASURE_COPY.hintAgain;
  }
}

/**
 * The Mesure's readout, one line per distance. The direct one carries the difference of altitude
 * it is made of; the distance au sol is absent offline, and the direct distance then says why it
 * has no value rather than print « — », which is *Indéterminé*'s.
 */
export function measureLines(reading: MeasureReading): readonly string[] {
  const horizontal = `${MEASURE_COPY.horizontal} : ${formatQuantity("L", reading.horizontalM)}`;
  switch (reading.status) {
    case "loading":
      return [
        horizontal,
        `${MEASURE_COPY.direct} : ${MEASURE_COPY.loading}`,
        `${MEASURE_COPY.ground} : ${MEASURE_COPY.loading}`,
      ];
    case "online":
      return [
        horizontal,
        `${MEASURE_COPY.direct} : ${directReading(reading.directM, reading.dz)}`,
        `${MEASURE_COPY.ground} : ${formatQuantity("L", reading.groundM)}`,
      ];
    case "offline": {
      const missing =
        reading.failure === "hors-couverture" ? MEASURE_COPY.outOfCoverage : MEASURE_COPY.offline;
      return [
        horizontal,
        `${MEASURE_COPY.direct} : ${
          reading.directM === null || reading.dz === null
            ? missing
            : directReading(reading.directM, reading.dz)
        }`,
      ];
    }
  }
}

function directReading(directM: number, dz: number): string {
  const sign = dz < 0 ? "−" : "+";
  return `${formatQuantity("L", directM)} (Δz ${sign}${formatQuantity("h", Math.abs(dz))})`;
}

/**
 * What the Banane is, on hover: drawn rather than computed, its amplitude a `[CONVENTION]` — a
 * drawing choice proportional to the wind's cross component — and no distance behind it.
 */
export const BANANE_HELP =
  `La ${label("banana", "terrain")} est dessinée, pas calculée : la ligne à vide s'incurve du côté sous le vent, d'autant plus que le vent souffle en travers. ` +
  "Le facteur de proportionnalité est un choix de dessin [CONVENTION], jamais une sortie du moteur. " +
  "Elle donne une allure, pas une distance : aucune valeur chiffrée, ni garde au sol sous vent avec passager, n'en est lue.";

/** Why the switch to the Vue 3D is off, said under the map. */
export const VUE_3D_BLOCKED = {
  positions: "Vue 3D : placez A et B sur la carte.",
  profil:
    "Vue 3D : il faut le profil entre A et B — replacez A ou B sur la carte, ou importez un profil.",
} as const satisfies Record<Vue3dBlock, string>;

/** The same, under a map that places nothing (#101): it says where the line is set instead. */
export const VUE_3D_BLOCKED_READ_ONLY = {
  positions: "Vue 3D : A et B se placent sur la carte de la Page Statique.",
  profil: "Vue 3D : il faut le profil entre A et B — il se charge sur la Page Statique.",
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
 *
 * @param handle the rose has a handle to set the wind with — not on the Page Terrain (#101).
 */
export function windReading(wind: Wind, reference: RoseReference, handle = true): string {
  if (wind.speedKmh === 0) return handle ? MAP_COPY.roseCalm : MAP_COPY.calm;
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
    ...Object.values(VUE_3D_BLOCKED_READ_ONLY),
    ...Object.values(MEASURE_COPY),
    BANANE_HELP,
    ...[0, 90, 180, 270, 45, 108].map(describeRelative),
    ...new Set([...FONDS.map(fondAttribution), ...FONDS.map(drapedAttribution)]),
    ...(["A", "B"] as const).flatMap((anchor) => [
      clickHint(anchor, { A: null, B: null }) ?? "",
      clickHint(anchor, { A: { lat: 0, lon: 0 }, B: { lat: 0, lon: 0 } }) ?? "",
    ]),
  ];
}
