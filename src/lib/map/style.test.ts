/**
 * The vue de dessus's map style (#93): the three Fonds de carte and the Couche pentes switch under
 * a ligne A–B that every style keeps, and a Fond that cannot arrive leaves that line on a plain
 * background. The expected URLs and zoom ranges are swisstopo's WMTS capabilities for EPSG:3857,
 * read on 2026-11-08; the Couche pentes' opacity is geo.admin's `layersConfig`.
 */

import { describe, expect, test } from "vitest";

import type { Positions } from "@/lib/scenario/types.ts";
import type { Fetch } from "@/lib/terrain/geoadmin.ts";

import { TRIAL_ENDS } from "@/lib/terrain/__fixtures__/geoadmin-2026-11-08.ts";

import type { MapDisplay } from "./display.ts";
import type { CrossThrough, MapStyle, MeasureCollection, MeasureDrawing } from "./style.ts";

import { DEFAULT_MAP_DISPLAY, FONDS } from "./display.ts";
import {
  fondAttribution,
  fondUnavailable,
  freshHealth,
  BANANE_SOURCE,
  bananeData,
  isFondSource,
  LINE_SOURCE,
  MEASURE_SOURCE,
  measureData,
  measureDrawing,
  lineData,
  loadVectorStyle,
  mapStyle,
  PENTES_SOURCE,
  VECTOR_STYLE_URL,
} from "./style.ts";

/** Enough of swisstopo's light base map to stand for it: its background, a source, two layers. */
const VECTOR: MapStyle = {
  version: 8,
  glyphs: "https://vectortiles.geo.admin.ch/fonts/{fontstack}/{range}.pbf",
  sprite:
    "https://vectortiles.geo.admin.ch/styles/ch.swisstopo.lightbasemap.vt/v1.26.0/sprite/sprite",
  center: [8.2, 46.8],
  zoom: 7,
  sources: {
    "base_v1.0.0": {
      type: "vector",
      url: "https://vectortiles.geo.admin.ch/tiles/ch.swisstopo.base.vt/v1.0.0/tiles.json",
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "rgba(252, 252, 252, 1)" },
    },
    { id: "landcover", type: "fill", source: "base_v1.0.0", "source-layer": "landcover" },
  ],
};

const DISPLAYS: readonly MapDisplay[] = FONDS.flatMap((fond) =>
  [false, true].map((pentes) => ({ fond, pentes, view: "2d" as const, reperes: true })),
);

/** No Mesure and no anchor to cross: the style with nothing of #98 or #107 in its source. */
const NO_MEASURE: MeasureDrawing = {
  points: [],
  preview: null,
  anchors: { A: null, B: null },
  reperes: true,
};

function rasterTiles(style: MapStyle, source: string): readonly string[] {
  const spec = style.sources[source];
  if (spec?.type !== "raster" || spec.tiles === undefined)
    throw new Error(`${source} is no raster`);
  return spec.tiles;
}

describe("every Fond and the Couche pentes keep the ligne A–B, the Banane and the Mesure", () => {
  test.each(
    DISPLAYS.flatMap(
      (display) =>
        [
          [display, VECTOR],
          [display, null],
        ] as const,
    ),
  )("%o, vector style %#", (display, vector) => {
    const style = mapStyle({
      display,
      vector,
      positions: TRIAL_ENDS,
      across: 0,
      measure: NO_MEASURE,
    });
    const ids = style.layers.map((layer) => layer.id);

    // Plain background first — what shows wherever no tile does.
    expect(style.layers[0]).toEqual(expect.objectContaining({ type: "background" }));
    // The line, the Banane, then the Mesure last, each from the one source that holds it.
    expect(style.layers.slice(-7).map((layer) => "source" in layer && layer.source)).toEqual([
      LINE_SOURCE,
      LINE_SOURCE,
      BANANE_SOURCE,
      BANANE_SOURCE,
      MEASURE_SOURCE,
      MEASURE_SOURCE,
      MEASURE_SOURCE,
    ]);
    expect(style.sources[LINE_SOURCE]).toEqual({
      type: "geojson",
      data: lineData(TRIAL_ENDS),
    });
    // The Couche pentes right under them when asked for, absent otherwise.
    expect(ids.indexOf(PENTES_SOURCE)).toBe(display.pentes ? ids.length - 8 : -1);
  });
});

describe("the Banane's source", () => {
  test("is the bowed line for a cross wind, and carries it into the style", () => {
    const data = bananeData(TRIAL_ENDS, 8);
    expect(data).toMatchObject({ features: [{ geometry: { type: "LineString" } }] });
    const style = mapStyle({
      display: DEFAULT_MAP_DISPLAY,
      vector: null,
      positions: TRIAL_ENDS,
      across: 8,
      measure: NO_MEASURE,
    });
    expect(style.sources[BANANE_SOURCE]).toEqual({ type: "geojson", data });
  });

  test("is empty without a cross wind and while a Position is missing", () => {
    expect(bananeData(TRIAL_ENDS, 0)).toEqual({ type: "FeatureCollection", features: [] });
    expect(bananeData({ A: TRIAL_ENDS.A, B: null }, 8)).toEqual({
      type: "FeatureCollection",
      features: [],
    });
  });
});

describe("the three Fonds de carte", () => {
  test("the carte claire is swisstopo's light vector map, under its own glyphs and sprite", () => {
    const style = mapStyle({
      display: DEFAULT_MAP_DISPLAY,
      vector: VECTOR,
      positions: TRIAL_ENDS,
      across: 0,
      measure: NO_MEASURE,
    });
    expect(DEFAULT_MAP_DISPLAY.fond).toBe("carte-claire");
    expect(style.sources["base_v1.0.0"]).toEqual(VECTOR.sources["base_v1.0.0"]);
    expect(style.layers.map((layer) => layer.id)).toContain("landcover");
    expect(style.glyphs).toBe(VECTOR.glyphs);
    expect(style.sprite).toBe(VECTOR.sprite);
    // Its own background would cover the plain one; its camera would move the map on a switch.
    expect(style.layers.filter((layer) => layer.type === "background")).toHaveLength(1);
    expect(style.center).toBeUndefined();
    expect(style.zoom).toBeUndefined();
  });

  test("the carte claire without its style is the plain background, the line and the Banane", () => {
    const style = mapStyle({
      display: DEFAULT_MAP_DISPLAY,
      vector: null,
      positions: TRIAL_ENDS,
      across: 0,
      measure: NO_MEASURE,
    });
    expect(Object.keys(style.sources)).toEqual([LINE_SOURCE, BANANE_SOURCE, MEASURE_SOURCE]);
    expect(style.layers.map((layer) => layer.type)).toEqual([
      "background",
      "line",
      "line",
      "line",
      "line",
      "line",
      "line",
      "circle",
    ]);
  });

  test.each([
    ["orthophoto", "ch.swisstopo.swissimage", "jpeg", 20],
    ["carte-nationale", "ch.swisstopo.pixelkarte-farbe", "jpeg", 19],
  ] as const)("%s is swisstopo's WMTS layer %s in EPSG:3857", (fond, layer, format, maxzoom) => {
    const style = mapStyle({
      display: { fond, pentes: false, view: "2d", reperes: true },
      vector: VECTOR,
      positions: TRIAL_ENDS,
      across: 0,
      measure: NO_MEASURE,
    });
    expect(rasterTiles(style, "fond")).toEqual([
      `https://wmts.geo.admin.ch/1.0.0/${layer}/default/current/3857/{z}/{x}/{y}.${format}`,
    ]);
    expect(style.sources.fond).toEqual(expect.objectContaining({ maxzoom, tileSize: 256 }));
    expect(style.layers.map((drawn) => drawn.id)).toEqual([
      "fond-uni",
      "fond",
      "ligne-ab-halo",
      "ligne-ab",
      "banane-halo",
      "banane",
      "mesure-croix",
      "mesure-ligne",
      "mesure-points",
    ]);
    // A raster Fond takes nothing from the vector style.
    expect(style.sources["base_v1.0.0"]).toBeUndefined();
  });

  test("the Couche pentes is « pentes supérieures à 30° », at geo.admin's 40 %", () => {
    const style = mapStyle({
      display: { fond: "orthophoto", pentes: true, view: "2d", reperes: true },
      vector: null,
      positions: TRIAL_ENDS,
      across: 0,
      measure: NO_MEASURE,
    });
    expect(rasterTiles(style, PENTES_SOURCE)).toEqual([
      "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.hangneigung-ueber_30/default/current/3857/{z}/{x}/{y}.png",
    ]);
    expect(style.layers.find((layer) => layer.id === PENTES_SOURCE)).toEqual(
      expect.objectContaining({ paint: { "raster-opacity": 0.4 } }),
    );
    // An overlay: its tiles never decide whether the Fond arrived.
    expect(isFondSource(PENTES_SOURCE)).toBe(false);
    expect(isFondSource(LINE_SOURCE)).toBe(false);
    expect(isFondSource(BANANE_SOURCE)).toBe(false);
    expect(isFondSource(MEASURE_SOURCE)).toBe(false);
    expect(isFondSource("fond")).toBe(true);
  });

  test("every Fond names swisstopo in its attribution", () => {
    for (const fond of FONDS) expect(fondAttribution(fond)).toMatch(/^© .*swisstopo/);
    expect(fondAttribution("orthophoto")).toBe("© CNES, Spot Image, swisstopo, NPOC");
  });
});

describe("the ligne A–B as the map draws it", () => {
  test("is one segment from A to B, longitude first", () => {
    expect(lineData(TRIAL_ENDS)).toEqual({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [6.525035, 46.843556],
              [6.520783, 46.846166],
            ],
          },
        },
      ],
    });
  });

  test("is nothing until both ends are known", () => {
    const empty = { type: "FeatureCollection", features: [] };
    expect(lineData({ A: null, B: null })).toEqual(empty);
    expect(lineData({ A: TRIAL_ENDS.A, B: null })).toEqual(empty);
  });
});

/** A point between the trial's two anchors, where the pointer hovers in the tests below. */
const POINTER = { lat: 46.845, lon: 6.523 };

/** What each feature of the Mesure's source is: its `kind`, and for a cross what it goes through. */
function described(drawing: Partial<MeasureDrawing>): string[] {
  return measureData({ ...NO_MEASURE, ...drawing }).features.map(({ properties }) =>
    properties.kind === "croix" ? `croix ${properties.through}` : properties.kind,
  );
}

/** The crosses through `through`, as their two lines: north-south, then east-west. */
function crossesThrough(drawing: Partial<MeasureDrawing>, through: CrossThrough): number[][][] {
  return measureData({ ...NO_MEASURE, ...drawing }).features.flatMap(({ properties, geometry }) =>
    properties.kind === "croix" && properties.through === through && geometry.type === "LineString"
      ? [geometry.coordinates]
      : [],
  );
}

/** One cross, north-south then east-west, stands on `at`'s meridian and on its parallel. */
function expectCrossOn([northSouth, eastWest]: number[][][], at: { lat: number; lon: number }) {
  expect(northSouth.map(([lon]) => lon)).toEqual([at.lon, at.lon]);
  expect(northSouth[0][1]).toBeLessThan(at.lat);
  expect(northSouth[1][1]).toBeGreaterThan(at.lat);
  expect(eastWest.map(([, lat]) => lat)).toEqual([at.lat, at.lat]);
  expect(eastWest[0][0]).toBeLessThan(at.lon);
  expect(eastWest[1][0]).toBeGreaterThan(at.lon);
}

describe("the Mesure as the map draws it", () => {
  const kinds = (points: MeasureDrawing["points"]) =>
    measureData({ ...NO_MEASURE, points }).features.map((feature) => feature.properties.kind);

  test("is nothing before the first click", () => {
    expect(kinds([])).toEqual([]);
  });

  test("is a point and its two dotted crosses per click", () => {
    expect(kinds([TRIAL_ENDS.A])).toEqual(["point", "croix", "croix"]);
  });

  test("is the line between two points, and a cross at each", () => {
    expect(kinds([TRIAL_ENDS.A, TRIAL_ENDS.B]).sort()).toEqual(
      ["croix", "croix", "croix", "croix", "ligne", "point", "point"].sort(),
    );
  });

  test("a cross is a north-south line and an east-west line through the point", () => {
    const [, ...crosses] = measureData({ ...NO_MEASURE, points: [TRIAL_ENDS.A] }).features;
    const [northSouth, eastWest] = crosses.map(({ geometry }) => {
      if (geometry.type !== "LineString") throw new Error("a cross is made of lines");
      return geometry.coordinates;
    });
    expect(northSouth.map(([lon]) => lon)).toEqual([TRIAL_ENDS.A.lon, TRIAL_ENDS.A.lon]);
    expect(northSouth[0][1]).toBeLessThan(TRIAL_ENDS.A.lat);
    expect(northSouth[1][1]).toBeGreaterThan(TRIAL_ENDS.A.lat);
    expect(eastWest.map(([, lat]) => lat)).toEqual([TRIAL_ENDS.A.lat, TRIAL_ENDS.A.lat]);
    expect(eastWest[0][0]).toBeLessThan(TRIAL_ENDS.A.lon);
    expect(eastWest[1][0]).toBeGreaterThan(TRIAL_ENDS.A.lon);
  });
});

describe("the aperçu: the cross under the pointer before the click (#107)", () => {
  test("before the first click, it is the pointer's cross and nothing else — no point yet", () => {
    expect(described({ preview: POINTER })).toEqual(["croix aperçu", "croix aperçu"]);
    expectCrossOn(crossesThrough({ preview: POINTER }, "aperçu"), POINTER);
  });

  test("before the second click, it is drawn beside the first point, with no ligne yet", () => {
    const drawing = { points: [TRIAL_ENDS.A], preview: POINTER };
    expect(described(drawing)).toEqual([
      "point",
      "croix point",
      "croix point",
      "croix aperçu",
      "croix aperçu",
    ]);
    expectCrossOn(crossesThrough(drawing, "aperçu"), POINTER);
    expectCrossOn(crossesThrough(drawing, "point"), TRIAL_ENDS.A);
  });

  test("its cross is the very cross the point clicked there gets", () => {
    const before = crossesThrough({ preview: POINTER }, "aperçu");
    const after = crossesThrough({ points: [POINTER] }, "point");
    expect(before).toEqual(after);
  });

  test("is drawn only while the Mesure is on, and only where a pointer hovers", () => {
    const at = { points: [], anchors: TRIAL_ENDS, reperes: true, readOnly: false };
    expect(measureDrawing({ ...at, pointer: POINTER, measuring: true }).preview).toEqual(POINTER);
    expect(measureDrawing({ ...at, pointer: POINTER, measuring: false }).preview).toBeNull();
    // A finger, or a pointer gone off the map: nothing to follow.
    expect(measureDrawing({ ...at, pointer: null, measuring: true }).preview).toBeNull();
  });
});

describe("the Repères d'ancrage: a cross through A and through B, in every mode (#107)", () => {
  test("A and B placed, out of the Mesure: their two crosses and nothing else", () => {
    expect(described({ anchors: TRIAL_ENDS })).toEqual([
      "croix A",
      "croix A",
      "croix B",
      "croix B",
    ]);
    expectCrossOn(crossesThrough({ anchors: TRIAL_ENDS }, "A"), TRIAL_ENDS.A);
    expectCrossOn(crossesThrough({ anchors: TRIAL_ENDS }, "B"), TRIAL_ENDS.B);
  });

  test("one anchor placed: its cross alone", () => {
    expect(described({ anchors: { A: null, B: TRIAL_ENDS.B } })).toEqual(["croix B", "croix B"]);
  });

  test("in the Mesure, beside its points and its aperçu", () => {
    const drawing = { anchors: TRIAL_ENDS, points: [TRIAL_ENDS.A, POINTER], preview: TRIAL_ENDS.B };
    expect(described(drawing)).toEqual([
      // The Repères d'ancrage first, under the Mesure's own…
      "croix A",
      "croix A",
      "croix B",
      "croix B",
      // …each point with its cross…
      "point",
      "croix point",
      "croix point",
      "point",
      "croix point",
      "croix point",
      // …the aperçu, here on B to set the next point in line with it, then the ligne.
      "croix aperçu",
      "croix aperçu",
      "ligne",
    ]);
  });

  test("a dragged anchor's cross is where the anchor is drawn, not where it stood", () => {
    // B 20 m east, as the marker shows it under the pointer while the drag lasts.
    const dragged = {
      A: TRIAL_ENDS.A,
      B: { lat: TRIAL_ENDS.B.lat, lon: TRIAL_ENDS.B.lon + 0.00026 },
    };
    const anchors = measureDrawing({
      points: [],
      pointer: null,
      anchors: dragged,
      reperes: true,
      measuring: false,
      readOnly: false,
    }).anchors;
    expectCrossOn(crossesThrough({ anchors }, "B"), dragged.B);
    expect(crossesThrough({ anchors }, "B")[0][0][0]).not.toBe(TRIAL_ENDS.B.lon);
  });

  test("are dotted like the Mesure's crosses: one layer draws every cross alike", () => {
    const style = mapStyle({
      display: DEFAULT_MAP_DISPLAY,
      vector: null,
      positions: TRIAL_ENDS,
      across: 0,
      measure: { ...NO_MEASURE, anchors: TRIAL_ENDS },
    });
    const crosses = style.layers.filter(
      (layer) => "source" in layer && layer.source === MEASURE_SOURCE && layer.type === "line",
    );
    expect(crosses.map((layer) => layer.id)).toEqual(["mesure-croix", "mesure-ligne"]);
    expect(crosses[0]).toMatchObject({
      filter: ["==", ["get", "kind"], "croix"],
      paint: { "line-dasharray": [1, 2] },
    });
  });
});

describe("the Repères' button hides every cross and nothing else (#107)", () => {
  const everything = {
    anchors: TRIAL_ENDS,
    points: [TRIAL_ENDS.A, POINTER],
    preview: TRIAL_ENDS.B,
  };

  test("hidden: no cross through A, B, the points or the aperçu — the points and the ligne stay", () => {
    expect(described({ ...everything, reperes: false })).toEqual(["point", "point", "ligne"]);
    const ligne = measureData({ ...NO_MEASURE, ...everything, reperes: false }).features.at(-1);
    expect(ligne?.geometry.coordinates).toEqual([
      [TRIAL_ENDS.A.lon, TRIAL_ENDS.A.lat],
      [POINTER.lon, POINTER.lat],
    ]);
  });

  test("shown again: every cross is back", () => {
    expect(
      described({ ...everything, reperes: true }).filter((d) => d.startsWith("croix")),
    ).toEqual(
      ["croix A", "croix A", "croix B", "croix B"]
        .concat(["croix point", "croix point", "croix point", "croix point"])
        .concat(["croix aperçu", "croix aperçu"]),
    );
  });
});

describe("the aperçu survives a change of Fond (#107)", () => {
  test.each(FONDS)("a style built for %s carries the cross under the pointer", (fond) => {
    const style = mapStyle({
      display: { ...DEFAULT_MAP_DISPLAY, fond },
      vector: VECTOR,
      positions: TRIAL_ENDS,
      across: 0,
      measure: { ...NO_MEASURE, points: [TRIAL_ENDS.A], preview: POINTER },
    });
    const source = style.sources[MEASURE_SOURCE];
    if (source?.type !== "geojson") throw new Error("the Mesure's source is GeoJSON");
    const data = source.data as MeasureCollection;
    const aperçu = data.features.filter(
      ({ properties }) => properties.kind === "croix" && properties.through === "aperçu",
    );
    expect(aperçu).toHaveLength(2);
    expectCrossOn(
      aperçu.map(({ geometry }) => geometry.coordinates as number[][]),
      POINTER,
    );
  });
});

describe("the Page Terrain keeps the Mesure as #98 drew it", () => {
  const terrain = (reperes: boolean) =>
    measureDrawing({
      points: [TRIAL_ENDS.A],
      pointer: POINTER,
      anchors: TRIAL_ENDS,
      reperes,
      measuring: true,
      readOnly: true,
    });

  test("no aperçu, no Repère d'ancrage — the crosses of its points, whatever the Repères say", () => {
    for (const reperes of [true, false]) {
      expect(described(terrain(reperes))).toEqual(["point", "croix point", "croix point"]);
    }
  });
});

describe("the carte claire's style, fetched", () => {
  const answering =
    (body: string, status = 200): Fetch =>
    async () =>
      new Response(body, { status });

  test("is asked for at swisstopo's URL and handed over as it came", async () => {
    const asked: string[] = [];
    const style = await loadVectorStyle(async (url) => {
      asked.push(url);
      return new Response(JSON.stringify(VECTOR));
    });
    expect(asked).toEqual([
      "https://vectortiles.geo.admin.ch/styles/ch.swisstopo.lightbasemap.vt/style.json",
    ]);
    expect(VECTOR_STYLE_URL).toBe(asked[0]);
    expect(style).toEqual(VECTOR);
  });

  test.each([
    [
      "no network",
      (async () => {
        throw new TypeError("Failed to fetch");
      }) as Fetch,
    ],
    ["an HTTP error", answering("Service Unavailable", 503)],
    ["a body that is not JSON", answering("<html>maintenance</html>")],
    ["JSON that is not a style", answering('{"version": 7, "layers": []}')],
  ])("%s: no style, never a throw", async (_name, fetch) => {
    await expect(loadVectorStyle(fetch)).resolves.toBeNull();
  });
});

describe("« fond de carte indisponible »", () => {
  const SWISS: Positions = TRIAL_ENDS;

  test("not while the Fond is just chosen, nor once its tiles arrive", () => {
    for (const fond of FONDS) expect(fondUnavailable(freshHealth(fond), SWISS)).toBe(false);
    const arrived = { ...freshHealth("orthophoto"), tilesLoaded: true, tilesFailed: true };
    expect(fondUnavailable(arrived, SWISS)).toBe(false);
  });

  test("when the carte claire's style could not be read", () => {
    expect(fondUnavailable({ ...freshHealth("carte-claire"), style: "failed" }, SWISS)).toBe(true);
  });

  test("when its tiles fail and none arrives — no network", () => {
    const offline = { ...freshHealth("carte-nationale"), tilesFailed: true };
    expect(fondUnavailable(offline, SWISS)).toBe(true);
  });

  test("when an anchor stands outside swisstopo's coverage, where no tile is asked for", () => {
    const paris = { lat: 48.85, lon: 2.35 };
    expect(fondUnavailable(freshHealth("orthophoto"), { A: paris, B: null })).toBe(true);
    expect(fondUnavailable(freshHealth("orthophoto"), { A: TRIAL_ENDS.A, B: paris })).toBe(true);
  });
});
