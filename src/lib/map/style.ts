/**
 * The vue de dessus's map style (#93): the three Fonds de carte, the Couche pentes and the ligne
 * A–B, as one MapLibre style **built here** rather than handed to MapLibre as a URL. Prototype #63
 * found that the vector styles `*.vt/style.json` load as they are and that swisstopo's WMTS layers
 * serve as XYZ in EPSG:3857; the layer ids, formats, zoom ranges and coverage below are swisstopo's
 * WMTS GetCapabilities for EPSG:3857, read on 2026-11-08.
 *
 * Rules this module exists to keep:
 *
 * - **The ligne A–B and the Banane (#96) are in every style, drawn last.** Changing Fond is a new style, so a line added
 *   to the map beside its style would leave with the old one; built into each style, a switch cannot
 *   lose it. The anchors are markers, which no style owns.
 * - **The plain background is every style's first layer.** A Fond that does not arrive — no
 *   network, outside swisstopo's coverage — then leaves the line on « fond uni », never on nothing.
 * - **The vector Fond's `style.json` is fetched with the injected `fetch`, not given to MapLibre
 *   as a URL.** A style URL that fails leaves MapLibre with no style at all, so no line either;
 *   fetched here, its failure is one more case of plain background, and a `node` test replays it.
 */

import type { Map as MapLibreMap } from "maplibre-gl";

import * as v from "valibot";

import type { Position, Positions } from "@/lib/scenario/types.ts";
import type { Fetch } from "@/lib/terrain/geoadmin.ts";

import type { Fond, MapDisplay } from "./display.ts";

import { bananePath } from "./banane.ts";

/** A MapLibre style, as `Map.setStyle` takes it. */
export type MapStyle = Exclude<Parameters<MapLibreMap["setStyle"]>[0], string | null>;

type StyleLayer = MapStyle["layers"][number];
type StyleSource = MapStyle["sources"][string];
type LineData = Extract<StyleSource, { type: "geojson" }>["data"];

/** The carte claire's style, swisstopo's light base map in vector tiles. */
export const VECTOR_STYLE_URL =
  "https://vectortiles.geo.admin.ch/styles/ch.swisstopo.lightbasemap.vt/style.json";

/**
 * Where the three raster layers are served, `[west, south, east, north]` in degrees — their
 * capabilities' `WGS84BoundingBox`. Outside it the services answer 400, so no tile is asked for.
 */
export const SWISSTOPO_COVERAGE = [5.140242, 45.398181, 11.47757, 48.230651] as const;

/** The source the ligne A–B is drawn from. */
export const LINE_SOURCE = "ligne-ab";

/** The source the Banane (#96) is drawn from: the Ligne à vide bowed by the wind. */
export const BANANE_SOURCE = "banane";

/** The Couche pentes' source: an overlay, so its tiles never decide whether the Fond arrived. */
export const PENTES_SOURCE = "pentes";

/** One swisstopo WMTS layer as XYZ tiles: the URL template docs.geo.admin.ch documents. */
export type WmtsLayer = {
  readonly id: string;
  readonly format: "jpeg" | "png";
  /** The last zoom of the layer's tile matrix set (`3857_19` → 19); MapLibre overzooms past it. */
  readonly maxzoom: number;
  /** The layer's attribution, as geo.admin's `layersConfig` gives it. */
  readonly attribution: string;
};

export const RASTER_FONDS = {
  orthophoto: {
    id: "ch.swisstopo.swissimage",
    format: "jpeg",
    maxzoom: 20,
    attribution: "© CNES, Spot Image, swisstopo, NPOC",
  },
  "carte-nationale": {
    id: "ch.swisstopo.pixelkarte-farbe",
    format: "jpeg",
    maxzoom: 19,
    attribution: "© swisstopo",
  },
} as const satisfies Record<Exclude<Fond, "carte-claire">, WmtsLayer>;

export const PENTES_LAYER = {
  id: "ch.swisstopo.hangneigung-ueber_30",
  format: "png",
  maxzoom: 17,
  attribution: "© swisstopo",
} as const satisfies WmtsLayer;

/** geo.admin draws the Couche pentes at this opacity (`layersConfig`, `opacity: 0.4`). */
export const PENTES_OPACITY = 0.4;

/** The carte claire's attribution — its TileJSON's own. */
const VECTOR_ATTRIBUTION = "© swisstopo";

/** The « fond uni » under everything, and the line's two strokes: drawing colours, not chrome. */
export const PLAIN = "#f1f3f4";
export const LINE_CASING = "#ffffff";
export const LINE_INK = "#16191b";

/** The attribution the map must show for the Fond on screen — a condition of swisstopo's terms. */
export function fondAttribution(fond: Fond): string {
  return fond === "carte-claire" ? VECTOR_ATTRIBUTION : RASTER_FONDS[fond].attribution;
}

/** Is this source the Fond's own — the one whose tiles decide « fond de carte indisponible »? */
export function isFondSource(id: string): boolean {
  return id !== LINE_SOURCE && id !== PENTES_SOURCE && id !== BANANE_SOURCE;
}

/** The ligne A–B as the line source holds it: one segment, or nothing until both ends are known. */
export function lineData({ A, B }: Positions): LineData {
  return {
    type: "FeatureCollection",
    features:
      A === null || B === null
        ? []
        : [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: [
                  [A.lon, A.lat],
                  [B.lon, B.lat],
                ],
              },
            },
          ],
  };
}

/**
 * The Banane as its source holds it: one bowed line, or nothing while a Position is missing and
 * without a cross wind, where it would only lie under the ligne A–B.
 */
export function bananeData(positions: Positions, across: number): LineData {
  const path = across === 0 ? null : bananePath(positions, across);
  return {
    type: "FeatureCollection",
    features:
      path === null
        ? []
        : [
            {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: path.map((p) => [p.lon, p.lat]) },
            },
          ],
  };
}

/**
 * The style for one display: plain background, the Fond, the Couche pentes if asked for, then the
 * ligne A–B and the Banane (dashed, as the Ligne à vide is) on top.
 *
 * @param vector the carte claire's fetched style, or `null` while it is absent — not yet loaded,
 *   or unavailable. The carte claire then draws as the plain background alone.
 * @param positions where the line is drawn now.
 * @param across the wind's cross component, m/s, the Banane's only input.
 */
export function mapStyle({
  display,
  vector,
  positions,
  across,
}: {
  display: MapDisplay;
  vector: MapStyle | null;
  positions: Positions;
  across: number;
}): MapStyle {
  const fond = fondStyle(display.fond, vector);
  const pentes: Record<string, StyleSource> = display.pentes
    ? { [PENTES_SOURCE]: rasterSource(PENTES_LAYER) }
    : {};
  return {
    version: 8,
    ...(fond.glyphs === undefined ? {} : { glyphs: fond.glyphs }),
    ...(fond.sprite === undefined ? {} : { sprite: fond.sprite }),
    sources: {
      ...fond.sources,
      ...pentes,
      [LINE_SOURCE]: { type: "geojson", data: lineData(positions) },
      [BANANE_SOURCE]: { type: "geojson", data: bananeData(positions, across) },
    },
    layers: [
      { id: "fond-uni", type: "background", paint: { "background-color": PLAIN } },
      ...fond.layers,
      ...(display.pentes
        ? [
            {
              id: PENTES_SOURCE,
              type: "raster",
              source: PENTES_SOURCE,
              paint: { "raster-opacity": PENTES_OPACITY },
            } satisfies StyleLayer,
          ]
        : []),
      {
        id: `${LINE_SOURCE}-halo`,
        type: "line",
        source: LINE_SOURCE,
        layout: { "line-cap": "round" },
        paint: { "line-color": LINE_CASING, "line-width": 6 },
      },
      {
        id: LINE_SOURCE,
        type: "line",
        source: LINE_SOURCE,
        layout: { "line-cap": "round" },
        paint: { "line-color": LINE_INK, "line-width": 3 },
      },
      {
        id: `${BANANE_SOURCE}-halo`,
        type: "line",
        source: BANANE_SOURCE,
        paint: { "line-color": LINE_CASING, "line-width": 6 },
      },
      {
        id: BANANE_SOURCE,
        type: "line",
        source: BANANE_SOURCE,
        paint: { "line-color": LINE_INK, "line-width": 3, "line-dasharray": [2, 2] },
      },
    ],
  };
}

/** The part of a style one Fond contributes. */
type FondStyle = Pick<MapStyle, "sources" | "layers" | "glyphs" | "sprite">;

function fondStyle(fond: Fond, vector: MapStyle | null): FondStyle {
  if (fond !== "carte-claire") {
    return {
      sources: { fond: rasterSource(RASTER_FONDS[fond]) },
      layers: [{ id: "fond", type: "raster", source: "fond" }],
    };
  }
  if (vector === null) return { sources: {}, layers: [] };
  // The vector style's own background would paint over « fond uni » with a colour of its own; the
  // camera keys (`center`, `zoom`…) are not taken, so a switch never moves the map.
  return {
    sources: vector.sources,
    layers: vector.layers.filter((layer) => layer.type !== "background"),
    glyphs: vector.glyphs,
    sprite: vector.sprite,
  };
}

/** A WMTS layer's tile URL, `{z}/{x}/{y}` in EPSG:3857 — the same for MapLibre and the Vue 3D. */
export function wmtsTiles({ id, format }: WmtsLayer): string {
  return `https://wmts.geo.admin.ch/1.0.0/${id}/default/current/3857/{z}/{x}/{y}.${format}`;
}

function rasterSource(layer: WmtsLayer): StyleSource {
  const { maxzoom, attribution } = layer;
  return {
    type: "raster",
    tiles: [wmtsTiles(layer)],
    tileSize: 256,
    maxzoom,
    bounds: [...SWISSTOPO_COVERAGE],
    attribution,
  };
}

/** Enough of a style to hand to MapLibre, which validates the rest itself. */
const VECTOR_STYLE = v.looseObject({
  version: v.literal(8),
  sources: v.record(v.string(), v.looseObject({ type: v.string() })),
  layers: v.array(v.looseObject({ id: v.string(), type: v.string() })),
});

/**
 * The carte claire's style, fetched. Never rejects.
 *
 * @returns the style, or `null` when it cannot be read — the carte claire is then unavailable.
 */
export async function loadVectorStyle(fetch: Fetch): Promise<MapStyle | null> {
  try {
    const response = await fetch(VECTOR_STYLE_URL);
    if (!response.ok) return null;
    const parsed = v.safeParse(VECTOR_STYLE, await response.json());
    return parsed.success ? (parsed.output as MapStyle) : null;
  } catch {
    return null;
  }
}

/** Is this Position where swisstopo serves its Fonds? */
export function inCoverage({ lat, lon }: Position): boolean {
  const [west, south, east, north] = SWISSTOPO_COVERAGE;
  return lon >= west && lon <= east && lat >= south && lat <= north;
}

/**
 * How the Fond on screen is doing: its style (`ok` for the raster Fonds, which have none to fetch)
 * and whether any of its tiles arrived or failed since it was chosen.
 */
export type FondHealth = {
  readonly style: "pending" | "ok" | "failed";
  readonly tilesLoaded: boolean;
  readonly tilesFailed: boolean;
};

/** A Fond just chosen: nothing has arrived or failed yet. */
export function freshHealth(fond: Fond): FondHealth {
  return {
    style: fond === "carte-claire" ? "pending" : "ok",
    tilesLoaded: false,
    tilesFailed: false,
  };
}

/**
 * Does the vue de dessus say « fond de carte indisponible »? When the Fond cannot arrive: its style
 * could not be read, its tiles failed with none arriving — no network — or an anchor stands outside
 * swisstopo's coverage, where no tile is asked for at all.
 */
export function fondUnavailable(health: FondHealth, positions: Positions): boolean {
  if (health.style === "failed") return true;
  if (health.tilesFailed && !health.tilesLoaded) return true;
  return [positions.A, positions.B].some((position) => position !== null && !inCoverage(position));
}
