/**
 * The Vue 3D's renderer (#95): swisstopo's relief and imagery, both anchors on their Fils à plomb,
 * and the engine's Ligne à vide and loaded line, drawn by CesiumJS. **This module is CesiumJS's
 * only importer**, and it is reached through `./load-vue-3d.ts` alone, so the engine ships in a
 * chunk of its own that `/` never downloads. Every decision is `@/lib/map/vue-3d.ts`'s; this file
 * draws what it is handed, and the Page's map (`./top-map.tsx`) hosts it.
 *
 * Rules this file exists to keep:
 *
 * - **No relief, no Vue 3D.** The terrain's `layer.json` is read before anything is drawn; when it
 *   does not arrive — no network — or the browser cannot draw (no WebGL, a render error), the
 *   caller hears it once and goes back to the vue de dessus. Nothing here throws at the Page.
 * - **swisstopo alone**: its terrain, its WMTS tiles, no Cesium ion — `baseLayer: false`, so the
 *   engine's default world imagery is never asked for, and no star box to download. The credits
 *   Cesium would print go to a detached element; the swisstopo attribution is the Page's own HTML.
 * - **Two Brins porteurs keep the coupe's pixel gap.** Both members are one solve; each is shifted
 *   by as many metres as the coupe's pixels span at the line, re-read before every frame, so the
 *   two stay apart without touching at every zoom.
 */

import "cesium/Source/Widgets/CesiumWidget/CesiumWidget.css";
import {
  ArcType,
  BoundingSphere,
  CallbackProperty,
  Cartesian2,
  Cartesian3,
  Cartographic,
  CesiumTerrainProvider,
  CesiumWidget,
  Color,
  Ellipsoid,
  EllipsoidGeodesic,
  HeadingPitchRange,
  HorizontalOrigin,
  ImageryLayer,
  LabelStyle,
  Math as CesiumMath,
  Matrix4,
  PolylineDashMaterialProperty,
  PolylineOutlineMaterialProperty,
  Rectangle,
  UrlTemplateImageryProvider,
  VerticalOrigin,
  WebMercatorTilingScheme,
} from "cesium";

import type { MapDisplay } from "@/lib/map/display.ts";
import type { WmtsLayer } from "@/lib/map/style.ts";
import type { EarthPoint, Ends, Vue3dScene } from "@/lib/map/vue-3d.ts";

import {
  LINE_CASING,
  LINE_INK,
  PENTES_LAYER,
  PENTES_OPACITY,
  PLAIN,
  SWISSTOPO_COVERAGE,
  wmtsTiles,
} from "@/lib/map/style.ts";
import { CAMERA_REACH, DRAPED, TERRAIN_URL } from "@/lib/map/vue-3d.ts";

// Cesium's workers and assets are copied beside the app (`vite.config.ts`); this says where.
(globalThis as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = `${import.meta.env.BASE_URL}cesium/`;

const INK = Color.fromCssColorString(LINE_INK);
const CASING = Color.fromCssColorString(LINE_CASING);
const COVERAGE = Rectangle.fromDegrees(...SWISSTOPO_COVERAGE);

/** The camera looks down on the line a little, from its side — A on the left, as on the coupe. */
const PITCH = CesiumMath.toRadians(-25);

/** An open Vue 3D. */
export type Vue3d = {
  /** Draws this scene over this display; called again whenever either changes. */
  show(scene: Vue3dScene, display: MapDisplay): void;
  destroy(): void;
};

/**
 * Opens the Vue 3D in `container` once swisstopo's relief has answered.
 *
 * @param onUnavailable called once if the Vue 3D falls over after it opened — a render error.
 * @returns the open view; rejects when it cannot open — no relief, no WebGL.
 */
export async function openVue3d(container: HTMLElement, onUnavailable: () => void): Promise<Vue3d> {
  const terrainProvider = await CesiumTerrainProvider.fromUrl(TERRAIN_URL);
  const widget = new CesiumWidget(container, {
    terrainProvider,
    baseLayer: false,
    skyBox: false,
    scene3DOnly: true,
    showRenderLoopErrors: false,
    creditContainer: document.createElement("div"),
  });
  const { scene: cesium } = widget;
  cesium.globe.depthTestAgainstTerrain = true;
  cesium.globe.baseColor = Color.fromCssColorString(PLAIN);
  cesium.screenSpaceCameraController.maximumZoomDistance = CAMERA_REACH;
  cesium.renderError.addEventListener(() => onUnavailable());

  // Metres per CSS pixel at the line, read before each frame: the members' gap follows it.
  const metresPerPixel = { current: 0 };
  let line = new BoundingSphere();
  cesium.preRender.addEventListener(() => {
    const { clientWidth } = cesium.canvas;
    const buffer = cesium.camera.getPixelSize(
      line,
      cesium.drawingBufferWidth,
      cesium.drawingBufferHeight,
    );
    metresPerPixel.current =
      clientWidth > 0 ? (buffer * cesium.drawingBufferWidth) / clientWidth : 0;
  });

  let shown: { scene: Vue3dScene; display: MapDisplay } | null = null;
  return {
    show(scene, display) {
      const before = shown;
      shown = { scene, display };
      if (
        before === null ||
        before.display.fond !== display.fond ||
        before.display.pentes !== display.pentes
      ) {
        widget.imageryLayers.removeAll();
        widget.imageryLayers.add(drape(DRAPED[display.fond]));
        if (display.pentes) widget.imageryLayers.add(drape(PENTES_LAYER, PENTES_OPACITY));
      }
      if (before?.scene !== scene) {
        line = BoundingSphere.fromPoints(
          [scene.fils.A.anchor, scene.fils.B.anchor, ...(scene.loaded ?? [])].map(cartesian),
        );
        draw(widget, scene, metresPerPixel);
      }
      // The camera stands back from the line when it opens and when the Positions move, not
      // otherwise: a new Scenario on the same two points leaves the view where the reader put it.
      if (before === null || !sameEnds(before.scene.ends, scene.ends)) frameLine(widget, scene);
    },
    destroy() {
      if (!widget.isDestroyed()) widget.destroy();
    },
  };
}

function draw(widget: CesiumWidget, scene: Vue3dScene, metresPerPixel: { current: number }) {
  const { entities } = widget;
  entities.removeAll();
  for (const name of ["A", "B"] as const) {
    const { foot, anchor, top } = scene.fils[name];
    // The ground mark and the anchor are drawn over the relief, never behind it.
    entities.add({
      position: cartesian(foot),
      point: {
        pixelSize: 9,
        color: CASING,
        outlineColor: INK,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    entities.add({
      polyline: {
        positions: [cartesian(foot), cartesian(top)],
        arcType: ArcType.NONE,
        width: 2,
        material: new PolylineDashMaterialProperty({ color: INK, dashLength: 12 }),
      },
    });
    entities.add({
      position: cartesian(anchor),
      point: {
        pixelSize: 12,
        color: CASING,
        outlineColor: INK,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: name,
        font: "bold 14px 'Iosevka Charon', sans-serif",
        fillColor: INK,
        outlineColor: CASING,
        outlineWidth: 3,
        style: LabelStyle.FILL_AND_OUTLINE,
        // Beside the Fil à plomb rather than on it.
        horizontalOrigin: HorizontalOrigin.LEFT,
        verticalOrigin: VerticalOrigin.BOTTOM,
        pixelOffset: new Cartesian2(8, -4),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
  }
  for (const offsetPx of scene.membersPx) {
    if (scene.unloaded !== null) {
      entities.add({
        polyline: {
          positions: member(scene.unloaded, offsetPx, metresPerPixel),
          arcType: ArcType.NONE,
          width: 2,
          material: new PolylineDashMaterialProperty({ color: INK, dashLength: 10 }),
        },
      });
    }
    if (scene.loaded !== null) {
      entities.add({
        polyline: {
          positions: member(scene.loaded, offsetPx, metresPerPixel),
          arcType: ArcType.NONE,
          // 2 px of ink in a thin casing: two members 6 px apart keep air between them, as on the coupe.
          width: 3,
          material: new PolylineOutlineMaterialProperty({
            color: INK,
            outlineColor: CASING,
            outlineWidth: 0.5,
          }),
          // A ridge between the camera and the line hides it from the relief, not from the reader.
          depthFailMaterial: Color.fromAlpha(INK, 0.5),
        },
      });
    }
  }
}

function cartesian({ lon, lat, altitude }: EarthPoint): Cartesian3 {
  return Cartesian3.fromDegrees(lon, lat, altitude);
}

/** A swisstopo WMTS layer on the relief, asked for only inside its coverage. */
function drape(layer: WmtsLayer, alpha = 1): ImageryLayer {
  const provider = new UrlTemplateImageryProvider({
    url: wmtsTiles(layer),
    tilingScheme: new WebMercatorTilingScheme(),
    maximumLevel: layer.maxzoom,
    rectangle: COVERAGE,
  });
  return new ImageryLayer(provider, { alpha });
}

/**
 * One member's vertices: the solved line itself, or — for two Brins porteurs — the line shifted by
 * the member's pixel offset, down positive as on the coupe, at the scale the camera shows it.
 */
function member(
  points: readonly EarthPoint[],
  offsetPx: number,
  metresPerPixel: { readonly current: number },
): Cartesian3[] | CallbackProperty {
  const at = points.map(cartesian);
  if (offsetPx === 0) return at;
  // « Down » is along each vertex's own vertical.
  const up = at.map((point) => Ellipsoid.WGS84.geodeticSurfaceNormal(point, new Cartesian3()));
  return new CallbackProperty(() => {
    const drop = offsetPx * metresPerPixel.current;
    return at.map((point, i) => {
      const shift = Cartesian3.multiplyByScalar(up[i] ?? Cartesian3.ZERO, drop, new Cartesian3());
      return Cartesian3.subtract(point, shift, shift);
    });
  }, false);
}

function sameEnds(a: Ends, b: Ends): boolean {
  return a.A.lat === b.A.lat && a.A.lon === b.A.lon && a.B.lat === b.B.lat && a.B.lon === b.B.lon;
}

/** The view the Vue 3D opens on: both anchors and their feet, from the side the coupe shows. */
function frameLine(widget: CesiumWidget, { ends: { A, B }, fils }: Vue3dScene) {
  const sphere = BoundingSphere.fromPoints(
    [fils.A, fils.B].flatMap(({ anchor, foot }) => [cartesian(anchor), cartesian(foot)]),
  );
  const start = Cartographic.fromDegrees(A.lon, A.lat);
  const end = Cartographic.fromDegrees(B.lon, B.lat);
  const along =
    start.longitude === end.longitude && start.latitude === end.latitude
      ? 0
      : new EllipsoidGeodesic(start, end).startHeading;
  const range = Math.min(Math.max(sphere.radius * 3, 300), CAMERA_REACH);
  widget.camera.viewBoundingSphere(
    sphere,
    new HeadingPitchRange(along - Math.PI / 2, PITCH, range),
  );
  // Free the camera from the sphere, so the reader orbits the relief rather than this one point.
  widget.camera.lookAtTransform(Matrix4.IDENTITY);
}
