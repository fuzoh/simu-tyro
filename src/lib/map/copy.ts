/**
 * The vue de dessus's words (#93), in the terrain register: the Fonds de carte, the Couche pentes,
 * the two placing controls, the switch to the Vue 3D (#95), the Repères (#107) and the lines under
 * the map. One table,
 * read by the map and by the label tables of the Pages that show it.
 */

import type { Positions, Wind } from "@/lib/scenario/types.ts";
import type { RideEnd } from "@/lib/sim";

import { RIDE_LABEL } from "@/lib/dynamique/copy.ts";
import { formatAtX, formatQuantity, formatValue } from "@/lib/format/quantity.ts";
import { WIND_UNPLACED } from "@/lib/rail/gates.ts";
import { msToKmh } from "@/lib/sim";
import { formatLv95, inLv95Domain, lv95FromWgs84 } from "@/lib/terrain/lv95.ts";
import { label } from "@/lib/vocabulary/labels.ts";

import type { Fond } from "./display.ts";
import type { Anchor } from "./gesture.ts";
import type { MeasurePoints, MeasureReading } from "./measure.ts";
import type { EmbarkBlock, EmbarkedReading } from "./vue-3d-embarquee.ts";
import type { Vue3dBlock } from "./vue-3d.ts";

import { FONDS } from "./display.ts";
import { fondAttribution } from "./style.ts";
import { drapedAttribution } from "./vue-3d.ts";

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
  /** The button that hides or shows every dotted cross of the vue de dessus (#107). */
  reperes: "Repères",
  /** What it hides, on hover: the crosses alone, never what they help to place. */
  reperesHelp:
    "Afficher ou masquer les croix pointillées : par A et B, par les points de la Mesure et sous le pointeur.",
  /** Why it is off in the Vue 3D, on hover: the crosses are drawn on the vue de dessus alone. */
  reperes3d: "Repères : la Vue 3D n'en trace pas — revenez en 2D.",
} as const;

/** The Gimbal's words (#111): each button's name, and the key that does the same. */
export const GIMBAL_COPY = {
  /** The Gimbal's accessible name. */
  title: "Caméra de la Vue 3D",
  north: "Nord en haut",
  orbitLeft: "Tourner autour de la ligne vers la gauche",
  orbitRight: "Tourner autour de la ligne vers la droite",
  tiltUp: "Incliner vers le haut",
  tiltDown: "Incliner vers le bas",
  zoomIn: "Zoom avant",
  zoomOut: "Zoom arrière",
  vueDuDepart: "Vue du départ",
  vueLaterale: "Vue latérale",
  /** The Vue embarquée (#126): not a Vue prédéfinie — it rides, and has its own controls. */
  vueEmbarquee: "Vue embarquée",
  /** The hover help's heading: the keys act once the Vue 3D has been clicked or tabbed to. */
  keys: "Clavier, après un clic dans la Vue 3D",
} as const;

/** The keys of the Vue 3D, as the hover help lists them: the key, then what it does. */
export const VUE_3D_KEYS = [
  ["← / →", "tourner autour de la ligne"],
  ["↑ / ↓", "avancer / reculer"],
  ["Maj + ↑ / ↓", "incliner"],
  ["+ / −", "zoom"],
  ["1", GIMBAL_COPY.vueDuDepart],
  ["2", GIMBAL_COPY.vueLaterale],
  ["3", GIMBAL_COPY.vueEmbarquee],
  ["N", GIMBAL_COPY.north.toLocaleLowerCase("fr")],
] as const;

/**
 * The hover help over the Gimbal: one line per key.
 *
 * @param embarks the Page plays rides: without, key 3 enters no Vue embarquée and is not listed.
 */
export function vue3dKeysHelp(embarks = true): string {
  const keys = VUE_3D_KEYS.filter(([key]) => embarks || key !== "3");
  return [`${GIMBAL_COPY.keys} :`, ...keys.map(([key, does]) => `${key} : ${does}`)].join("\n");
}

/** A Gimbal button's hover: its name and the key that does the same. */
export function gimbalHint(name: string, key: string): string {
  return `${name} (${key})`;
}

/**
 * The Vue embarquée's words (#126): the Gimbal's button that enters it, its own controls, and the
 * read-out of the ride it plays — an estimation, as every dynamic value.
 */
export const EMBARQUEE_COPY = {
  /** The Gimbal's button, and the view's name. */
  enter: GIMBAL_COPY.vueEmbarquee,
  /** The controls' accessible name. */
  title: "Lecture de la Vue embarquée",
  play: "Lecture",
  pause: "Pause",
  restart: "Recommencer",
  exit: "Quitter la vue embarquée",
  lookLeft: "Tourner la tête vers la gauche",
  lookRight: "Tourner la tête vers la droite",
  lookUp: "Lever les yeux",
  lookDown: "Baisser les yeux",
  /** Which of Dynamique's two rides is played: the one the Vent entered pushes. */
  ride: `Mouvement calculé ${RIDE_LABEL.windy.toLocaleLowerCase("fr")}`,
  estimate: label("estimate", "terrain"),
  /** The hover help's heading. */
  keys: "Clavier, dans la Vue embarquée",
} as const;

/** The keys of the Vue embarquée, as its hover help lists them. */
export const VUE_EMBARQUEE_KEYS = [
  ["← / →", "tourner la tête"],
  ["↑ / ↓", "lever / baisser les yeux"],
  [
    "Espace",
    `${EMBARQUEE_COPY.play.toLocaleLowerCase("fr")} / ${EMBARQUEE_COPY.pause.toLocaleLowerCase("fr")}`,
  ],
  ["R", EMBARQUEE_COPY.restart.toLocaleLowerCase("fr")],
  ["Échap", EMBARQUEE_COPY.exit.toLocaleLowerCase("fr")],
] as const;

/** The hover help over the Vue embarquée's controls: one line per key, and the drag. */
export function embarkedKeysHelp(): string {
  return [
    `${EMBARQUEE_COPY.keys} :`,
    ...VUE_EMBARQUEE_KEYS.map(([key, does]) => `${key} : ${does}`),
    "Glisser dans la vue : tourner la tête",
  ].join("\n");
}

/**
 * What the Vue embarquée is, behind its `ⓘ`: whose clock moves the eye, where the eye stands, and
 * what the view hides while it plays.
 */
export const EMBARQUEE_HELP =
  `La caméra suit les temps et les positions du mouvement calculé ${RIDE_LABEL.windy.toLocaleLowerCase("fr")}, ` +
  "retours en arrière compris, jusqu'au dernier instant calculé : une seconde à l'écran est une seconde du mouvement. " +
  `C'est une ${label("estimate", "terrain")} — le passager est un point matériel sur la ${label("trajectory", "terrain")} figée, pas une mesure. ` +
  `L'œil est sous la poulie, à 1,6 m au-dessus du bas du ${label("riderEnvelope", "terrain")}, jamais au-dessus de la poulie [CONVENTION]. ` +
  "La tête tourne librement, en lecture comme en pause. " +
  `Pendant la vue embarquée la ${label("loadedLine", "terrain")}, celle du passager à sa position saisie, est masquée et la ${label("trajectory", "terrain")} montrée.`;

/** Why the Vue embarquée is off, on the hover of its button. */
export const EMBARK_BLOCKED = {
  "no-ride": "Vue embarquée : aucun mouvement calculé pour ce Scénario.",
  "no-motion": "Vue embarquée : le mouvement calculé ne quitte pas le départ.",
  gesture: "Vue embarquée : en attente du nouveau calcul de la ligne.",
} as const satisfies Record<EmbarkBlock, string>;

/**
 * The read-out at an instant: the ride's time against its last computed instant, the pulley's
 * abscissa and its speed — negative on a swing back, the sign the engine gives.
 */
export function embarkedReadingLine({ t, duration, x, v }: EmbarkedReading): string {
  return [
    `t ${formatValue("duration", t)} / ${formatQuantity("duration", duration)}`,
    `x ${formatQuantity("extremumX", x)}`,
    formatQuantity("speedKmh", msToKmh(v)),
  ].join(" · ");
}

/**
 * How the motion computed ends, said from the start: the arrival at B, the Point d'arrêt, or a
 * swing the engine stopped following — the playback stops at its last computed instant.
 */
export function embarkedEndLine(end: RideEnd): string {
  const at = formatQuantity("duration", end.t);
  switch (end.kind) {
    case "arrival":
      return `Fin : arrivée en B à ${formatQuantity("speedKmh", msToKmh(end.v))}, ${at}.`;
    case "stop":
      return `Fin : arrêt ${formatAtX(end.x)}, ${at}.`;
    case "unsettled":
      return `Fin : mouvement non stabilisé — la lecture s'arrête au dernier instant calculé, ${at}.`;
  }
}

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
 * The line under the map that says what the rose says: where the wind comes from — the azimuth, the
 * number the field holds — and where that puts it relative to the line A → B, which the line's
 * bearing gives. Moving an anchor turns the second half and leaves the first as it is.
 *
 * @param bearing the bearing of A → B (`windBearing`), or `null` without A and B on the map: the
 *   Vent is then not applied, and the reading says so — or, with no Vent, why the rose has no handle.
 * @param handle the rose has a handle to set the wind with — not on the Page Terrain (#101).
 */
export function windReading(wind: Wind, bearing: number | null, handle = true): string {
  if (wind.speedKmh === 0) {
    if (!handle) return MAP_COPY.calm;
    return bearing === null ? WIND_UNPLACED.reason : MAP_COPY.roseCalm;
  }
  const azimuth = Math.round(mod360(wind.directionDeg)) % 360;
  const point = COMPASS[Math.round(azimuth / 45) % 8];
  const opening = `Vent ${point} (${azimuth}°), ${formatQuantity("windSpeed", wind.speedKmh)}`;
  if (bearing === null) return `${opening}. ${WIND_UNPLACED.notice}`;
  const relative = Math.round(mod360(wind.directionDeg - bearing)) % 360;
  return `${opening} : ${describeRelative(relative)}, ${relative}° par rapport à la ligne A → B.`;
}

function mod360(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
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
    ...Object.values(GIMBAL_COPY),
    vue3dKeysHelp(false),
    ...Object.values(VUE_3D_BLOCKED),
    ...Object.values(VUE_3D_BLOCKED_READ_ONLY),
    ...Object.values(MEASURE_COPY),
    BANANE_HELP,
    WIND_UNPLACED.reason,
    WIND_UNPLACED.notice,
    ...[0, 90, 180, 270, 45, 108].map(describeRelative),
    ...new Set([...FONDS.map(fondAttribution), ...FONDS.map(drapedAttribution)]),
    ...(["A", "B"] as const).flatMap((anchor) => [
      clickHint(anchor, { A: null, B: null }) ?? "",
      clickHint(anchor, { A: { lat: 0, lon: 0 }, B: { lat: 0, lon: 0 } }) ?? "",
    ]),
  ];
}

/**
 * The Vue embarquée's fixed words (#126), apart from {@link mapLabelTable}: they say « estimation »,
 * which the Page Statique never does, so only the Pages whose map plays a ride — Avancé and Terrain —
 * consume them.
 */
export function embarkedLabelTable(): readonly string[] {
  return [
    vue3dKeysHelp(),
    ...Object.values(EMBARQUEE_COPY),
    embarkedKeysHelp(),
    EMBARQUEE_HELP,
    ...Object.values(EMBARK_BLOCKED),
  ];
}
