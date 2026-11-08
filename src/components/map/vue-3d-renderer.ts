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
 * - **An anchor drags as on the carte** (#97), through the same gesture machine: a press takes an
 *   anchor only when the pointer is on one, and the camera is frozen from that press to the release;
 *   anywhere else the press is the camera's. While the anchor moves, its Fil à plomb and the Ligne
 *   A–B follow by `CallbackProperty`, never by re-adding entities. At the release the relief is
 *   sampled at its finest under the anchor, then the gesture ends and the profil is asked for.
 */

import "cesium/Source/Widgets/CesiumWidget/CesiumWidget.css";
import type { Scene, TerrainProvider } from "cesium";

import {
  ArcType,
  BoundingSphere,
  CallbackPositionProperty,
  CallbackProperty,
  Cartesian2,
  Cartesian3,
  Cartographic,
  CesiumTerrainProvider,
  CesiumWidget,
  Color,
  Ellipsoid,
  EllipsoidGeodesic,
  Entity,
  HeadingPitchRange,
  HorizontalOrigin,
  ImageryLayer,
  LabelStyle,
  Math as CesiumMath,
  Matrix4,
  PolylineDashMaterialProperty,
  PolylineOutlineMaterialProperty,
  Rectangle,
  sampleTerrainMostDetailed,
  SceneTransforms,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  UrlTemplateImageryProvider,
  VerticalOrigin,
  WebMercatorTilingScheme,
} from "cesium";

import type { MapDisplay } from "@/lib/map/display.ts";
import type { Anchor, MapEvent } from "@/lib/map/gesture.ts";
import type { WmtsLayer } from "@/lib/map/style.ts";
import type { EarthPoint, Ends, Vue3dFollowing, Vue3dScene } from "@/lib/map/vue-3d.ts";

import {
  LINE_CASING,
  LINE_INK,
  PENTES_LAYER,
  PENTES_OPACITY,
  PLAIN,
  SWISSTOPO_COVERAGE,
  wmtsTiles,
} from "@/lib/map/style.ts";
import { CAMERA_REACH, DRAPED, TERRAIN_URL, vue3dFollowing } from "@/lib/map/vue-3d.ts";

// Cesium's workers and assets are copied beside the app (`vite.config.ts`); this says where.
(globalThis as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = `${import.meta.env.BASE_URL}cesium/`;

const INK = Color.fromCssColorString(LINE_INK);
const CASING = Color.fromCssColorString(LINE_CASING);
const COVERAGE = Rectangle.fromDegrees(...SWISSTOPO_COVERAGE);

/** The camera looks down on the line a little, from its side — A on the left, as on the coupe. */
const PITCH = CesiumMath.toRadians(-25);

/** An open Vue 3D. */
export type Vue3d = {
  /**
   * Draws this scene over this display; called again whenever any of the three changes.
   *
   * @param idle the gesture machine waits for a gesture: only then may an anchor be taken, and only
   *   then does a dragged anchor give way to the scene's — the line its release loaded, or the one
   *   it could not replace.
   */
  show(scene: Vue3dScene, display: MapDisplay, idle: boolean): void;
  destroy(): void;
};

/**
 * Opens the Vue 3D in `container` once swisstopo's relief has answered.
 *
 * @param onGesture hears a drag as the vue de dessus's markers tell it: start, moves, release.
 * @param onUnavailable called once if the Vue 3D falls over after it opened — a render error.
 * @returns the open view; rejects when it cannot open — no relief, no WebGL.
 */
export async function openVue3d(
  container: HTMLElement,
  { onGesture, onUnavailable }: { onGesture: (event: MapEvent) => void; onUnavailable: () => void },
): Promise<Vue3d> {
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

  let shown: { scene: Vue3dScene; display: MapDisplay; idle: boolean } | null = null;
  let drawn: Drawn | null = null;
  // The anchor under a press; `moved` once it has left its Position, which is when the gesture
  // starts — a press and release on an anchor is no new line.
  let grip: { anchor: Anchor; moved: boolean } | null = null;
  // Where the dragged anchor stands, from its first move until the machine is idle again.
  let pose: { anchor: Anchor; foot: EarthPoint } | null = null;
  let following: Vue3dFollowing | null = null;

  /** Draws the dragged anchor where `pose` has it, or the scene's own anchors and lines. */
  function follow() {
    following =
      shown === null || pose === null ? null : vue3dFollowing(shown.scene, pose.anchor, pose.foot);
    if (drawn === null) return;
    for (const entity of drawn.lines) entity.show = following === null;
    drawn.ligneAB.show = following !== null;
  }

  function anchorAt(at: Cartesian2): Anchor | null {
    // The Fil à plomb, the mark at its foot and the lines' ends all cross the anchor's dot, and any
    // of them may be on top: drill through them to the anchor.
    for (const picked of cesium.drillPick(at)) {
      const entity: unknown = (picked as { id?: unknown }).id;
      const anchor = entity instanceof Entity ? drawn?.anchors.get(entity) : undefined;
      if (anchor !== undefined) return anchor;
    }
    return null;
  }

  const pointer = new ScreenSpaceEventHandler(cesium.canvas);
  pointer.setInputAction(({ position }: ScreenSpaceEventHandler.PositionedEvent) => {
    if (shown?.idle !== true) return;
    const anchor = anchorAt(position);
    if (anchor === null) return;
    grip = { anchor, moved: false };
    cesium.screenSpaceCameraController.enableInputs = false;
    cesium.canvas.style.cursor = "grabbing";
  }, ScreenSpaceEventType.LEFT_DOWN);

  pointer.setInputAction(({ endPosition }: ScreenSpaceEventHandler.MotionEvent) => {
    if (grip === null) {
      cesium.canvas.style.cursor =
        shown?.idle === true && anchorAt(endPosition) !== null ? "grab" : "";
      return;
    }
    const foot = groundUnder(cesium, endPosition);
    if (foot === null) return;
    pose = { anchor: grip.anchor, foot };
    follow();
    const at = { lat: foot.lat, lon: foot.lon };
    if (grip.moved) onGesture({ type: "drag-move", at });
    else {
      grip.moved = true;
      onGesture({ type: "drag-start", anchor: grip.anchor, at });
    }
  }, ScreenSpaceEventType.MOUSE_MOVE);

  pointer.setInputAction(() => {
    if (grip === null) return;
    const { moved } = grip;
    grip = null;
    cesium.screenSpaceCameraController.enableInputs = true;
    cesium.canvas.style.cursor = "";
    const released = pose;
    if (!moved || released === null) return;
    void finestFoot(terrainProvider, released.foot).then((foot) => {
      if (pose === released && !widget.isDestroyed()) {
        pose = { anchor: released.anchor, foot };
        follow();
      }
      onGesture({ type: "drag-end", at: { lat: foot.lat, lon: foot.lon } });
    });
  }, ScreenSpaceEventType.LEFT_UP);

  return {
    show(scene, display, idle) {
      const before = shown;
      shown = { scene, display, idle };
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
        drawn = draw(widget, scene, metresPerPixel, () => following);
      }
      if (idle && grip === null) pose = null;
      follow();
      // The camera stands back from the line when it opens, and when the Positions move to where
      // the reader cannot see them — a typed Position, an imported CSV. A line dragged in the view
      // is already in it, so the camera stays where the reader put it.
      if (before === null || (!sameEnds(before.scene.ends, scene.ends) && !inView(cesium, scene))) {
        frameLine(widget, scene);
      }
    },
    destroy() {
      pointer.destroy();
      // Closed under a moving anchor, the view hears no release: the gesture ends where the anchor
      // was drawn, or the machine would wait for it — and keep the vue de dessus's markers — forever.
      if (grip?.moved === true && pose !== null) {
        onGesture({ type: "drag-end", at: { lat: pose.foot.lat, lon: pose.foot.lon } });
      }
      grip = null;
      if (!widget.isDestroyed()) widget.destroy();
    },
  };
}

/** The entities of one scene: what a press may take, and the lines a drag hides or shows. */
type Drawn = {
  readonly anchors: ReadonlyMap<Entity, Anchor>;
  /** The engine's lines, the last release's: hidden while an anchor follows the pointer. */
  readonly lines: readonly Entity[];
  /** The Ligne A–B, shown while an anchor follows the pointer. */
  readonly ligneAB: Entity;
};

/** @param following what a drag moves, read on every frame — `null` when nothing follows the pointer. */
function draw(
  widget: CesiumWidget,
  scene: Vue3dScene,
  metresPerPixel: { current: number },
  following: () => Vue3dFollowing | null,
): Drawn {
  const { entities } = widget;
  entities.removeAll();
  const fils = () => following()?.fils ?? scene.fils;
  const anchors = new Map<Entity, Anchor>();
  for (const name of ["A", "B"] as const) {
    // Read on every frame, so a dragged anchor moves without a new entity.
    const at = (point: "foot" | "anchor" | "top") =>
      new CallbackPositionProperty(() => cartesian(fils()[name][point]), false);
    // The ground mark and the anchor are drawn over the relief, never behind it.
    entities.add({
      position: at("foot"),
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
        positions: new CallbackProperty(
          () => [cartesian(fils()[name].foot), cartesian(fils()[name].top)],
          false,
        ),
        arcType: ArcType.NONE,
        width: 2,
        material: new PolylineDashMaterialProperty({ color: INK, dashLength: 12 }),
      },
    });
    const anchor = entities.add({
      position: at("anchor"),
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
    anchors.set(anchor, name);
  }
  const lines: Entity[] = [];
  for (const offsetPx of scene.membersPx) {
    if (scene.unloaded !== null) {
      lines.push(
        entities.add({
          polyline: {
            positions: member(scene.unloaded, offsetPx, metresPerPixel),
            arcType: ArcType.NONE,
            width: 2,
            material: new PolylineDashMaterialProperty({ color: INK, dashLength: 10 }),
          },
        }),
      );
    }
    if (scene.loaded !== null) {
      lines.push(
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
        }),
      );
    }
  }
  const ligneAB = entities.add({
    show: false,
    polyline: {
      positions: new CallbackProperty(
        () => (following()?.ligneAB ?? [scene.fils.A.anchor, scene.fils.B.anchor]).map(cartesian),
        false,
      ),
      arcType: ArcType.NONE,
      width: 3,
      material: new PolylineOutlineMaterialProperty({
        color: INK,
        outlineColor: CASING,
        outlineWidth: 0.5,
      }),
      depthFailMaterial: Color.fromAlpha(INK, 0.5),
    },
  });
  return { anchors, lines, ligneAB };
}

function cartesian({ lon, lat, altitude }: EarthPoint): Cartesian3 {
  return Cartesian3.fromDegrees(lon, lat, altitude);
}

/** The relief under a window position, as the view draws it now — `null` off the globe. */
function groundUnder(cesium: Scene, at: Cartesian2): EarthPoint | null {
  const ray = cesium.camera.getPickRay(at);
  const hit = ray === undefined ? undefined : cesium.globe.pick(ray, cesium);
  if (hit === undefined) return null;
  const { longitude, latitude, height } = Cartographic.fromCartesian(hit);
  return {
    lon: CesiumMath.toDegrees(longitude),
    lat: CesiumMath.toDegrees(latitude),
    altitude: height,
  };
}

/**
 * The relief under `foot` at its finest tiles. Where they do not come, the altitude the view drew
 * stays: it only places the Fil à plomb until the profil arrives.
 */
async function finestFoot(terrain: TerrainProvider, foot: EarthPoint): Promise<EarthPoint> {
  try {
    const [sampled] = await sampleTerrainMostDetailed(terrain, [
      Cartographic.fromDegrees(foot.lon, foot.lat),
    ]);
    const altitude: number | undefined = sampled?.height;
    return altitude === undefined || !Number.isFinite(altitude) ? foot : { ...foot, altitude };
  } catch {
    return foot;
  }
}

/** Both anchors of `scene` inside the view's box, in front of the camera. */
function inView(cesium: Scene, { fils }: Vue3dScene): boolean {
  const { clientWidth, clientHeight } = cesium.canvas;
  return [fils.A.anchor, fils.B.anchor].every((point) => {
    const at = SceneTransforms.worldToWindowCoordinates(cesium, cartesian(point));
    return (
      at !== undefined && at.x >= 0 && at.x <= clientWidth && at.y >= 0 && at.y <= clientHeight
    );
  });
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
