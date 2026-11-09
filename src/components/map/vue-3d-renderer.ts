/**
 * The Vue 3D's renderer (#95): swisstopo's relief and imagery, both anchors on their Fils à plomb,
 * the engine's Ligne à vide, loaded line and Trajectoire and the Ligne A–B, drawn by CesiumJS.
 * **This module is CesiumJS's only importer**, and it is reached through `./load-vue-3d.ts` alone,
 * so the engine ships in a chunk of its own that `/` never downloads. Every decision is
 * `@/lib/map/vue-3d.ts`'s and `@/lib/map/vue-3d-camera.ts`'s; this file draws what it is handed and
 * moves the camera as it is told, and the Page's map (`./top-map.tsx`) hosts it.
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
 * - **The camera is always given back** (#111). Whatever ends the press on an anchor — a release on
 *   the canvas or off it, a `pointercancel`, the window losing the focus — ends the gesture and
 *   re-enables the camera's gestures, once. Off the canvas, only the pointer that took the anchor
 *   ends its press.
 * - **The coupe's layers decide what is shown, never what is drawn** (#111): every line of the
 *   scene is an entity, drawn when the scene is new; the layers come beside the scene, not in it,
 *   so the View Strip's toggles and a drag only flip their `show`.
 * - **The camera moves as `@/lib/map/vue-3d-camera.ts` says**: the Vues prédéfinies are its
 *   poses, flown to in under a second; the Gimbal's and the keys' steps are its amounts. The canvas
 *   takes the focus on a press, so the keys reach the view only once it has been chosen.
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
  Entity,
  HeadingPitchRange,
  HorizontalOrigin,
  ImageryLayer,
  LabelStyle,
  Math as CesiumMath,
  Matrix4,
  PerspectiveFrustum,
  PolylineDashMaterialProperty,
  PolylineOutlineMaterialProperty,
  Rectangle,
  sampleTerrainMostDetailed,
  SceneTransforms,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Transforms,
  UrlTemplateImageryProvider,
  VerticalOrigin,
  WebMercatorTilingScheme,
} from "cesium";

import type { MapDisplay } from "@/lib/map/display.ts";
import type { Anchor, MapEvent } from "@/lib/map/gesture.ts";
import type { WmtsLayer } from "@/lib/map/style.ts";
import type { CameraPose, Lens, Vue3dCommand } from "@/lib/map/vue-3d-camera.ts";
import type { EarthPoint, Vue3dFollowing, Vue3dLayers, Vue3dScene } from "@/lib/map/vue-3d.ts";

import {
  LINE_CASING,
  LINE_INK,
  PENTES_LAYER,
  PENTES_OPACITY,
  PLAIN,
  SWISSTOPO_COVERAGE,
  wmtsTiles,
} from "@/lib/map/style.ts";
import {
  CAMERA_STEP,
  stepDistance,
  tiltedPitch,
  vueDuDepart,
  vueLaterale,
  walkAmount,
  zoomAmount,
} from "@/lib/map/vue-3d-camera.ts";
import { CAMERA_REACH, DRAPED, TERRAIN_URL, vue3dFollowing } from "@/lib/map/vue-3d.ts";
import { sameEnds } from "@/lib/terrain/trace.ts";

// Cesium's workers and assets are copied beside the app (`vite.config.ts`); this says where.
(globalThis as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = `${import.meta.env.BASE_URL}cesium/`;

const INK = Color.fromCssColorString(LINE_INK);
const CASING = Color.fromCssColorString(LINE_CASING);
/** The coupe's fainter strokes — the Ligne A–B, the Trajectoire — are the ink at 60 %, as there. */
const FAINT_INK = Color.fromAlpha(INK, 0.6);
/** A line a ridge hides from the camera still shows through it, fainter. */
const HIDDEN_INK = Color.fromAlpha(INK, 0.3);
const COVERAGE = Rectangle.fromDegrees(...SWISSTOPO_COVERAGE);

/** Turning north up is a short flight too, s. */
const NORTH_FLIGHT_S = 0.5;

/** An open Vue 3D. */
export type Vue3d = {
  /**
   * Draws this scene over this display; called again whenever any of the four changes. Only a new
   * scene is drawn anew: new layers show or hide what is already drawn.
   *
   * @param idle the gesture machine waits for a gesture: only then may an anchor be taken, and only
   *   then does a dragged anchor give way to the scene's — the line its release loaded, or the one
   *   it could not replace.
   * @param layers which of the scene's lines the View Strip shows.
   */
  show(scene: Vue3dScene, display: MapDisplay, idle: boolean, layers: Vue3dLayers): void;
  /** Moves the camera as a Gimbal button or a key asks. */
  command(command: Vue3dCommand): void;
  destroy(): void;
};

/**
 * Opens the Vue 3D in `container` once swisstopo's relief has answered.
 *
 * @param onGesture hears a drag as the vue de dessus's markers tell it: start, moves, release.
 * @param onUnavailable called once if the Vue 3D falls over after it opened — a render error.
 * @param onHeading hears the camera's heading, whole degrees clockwise from north, when it changes.
 * @param label the canvas's accessible name: it takes the focus, and the keys with it.
 * @returns the open view; rejects when it cannot open — no relief, no WebGL.
 */
export async function openVue3d(
  container: HTMLElement,
  {
    onGesture,
    onUnavailable,
    onHeading,
    label,
  }: {
    onGesture: (event: MapEvent) => void;
    onUnavailable: () => void;
    onHeading: (headingDeg: number) => void;
    label: string;
  },
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

  // The canvas takes the focus, and the keys with it, on a press of any button — CesiumJS cancels
  // the press's default, which would have focused it.
  const { canvas } = cesium;
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "application");
  canvas.setAttribute("aria-label", label);
  canvas.addEventListener("pointerdown", () => canvas.focus({ preventScroll: true }));
  // The pointer of the last press on the canvas, heard in the capture phase, before CesiumJS's own
  // listener turns it into the press that may take an anchor.
  let pressing: number | null = null;
  canvas.addEventListener(
    "pointerdown",
    (event) => {
      pressing = event.pointerId;
    },
    { capture: true },
  );

  // The heading the Gimbal's north shows, told only when its whole degree changes.
  let heading = Number.NaN;
  cesium.postRender.addEventListener(() => {
    const now = Math.round(CesiumMath.toDegrees(cesium.camera.heading)) % 360;
    if (now === heading) return;
    heading = now;
    onHeading(now);
  });

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

  let shown: {
    scene: Vue3dScene;
    display: MapDisplay;
    idle: boolean;
    layers: Vue3dLayers;
  } | null = null;
  let drawn: Drawn | null = null;
  // The anchor under a press; `moved` once it has left its Position, which is when the gesture
  // starts — a press and release on an anchor is no new line. `pointerId` is the pointer that took
  // it, `null` where the press came with none.
  let grip: { anchor: Anchor; moved: boolean; pointerId: number | null } | null = null;
  // Where the dragged anchor stands, from its first move until the machine is idle again.
  let pose: { anchor: Anchor; foot: EarthPoint } | null = null;
  let following: Vue3dFollowing | null = null;

  /**
   * Draws the dragged anchor where `pose` has it, or the scene's own anchors and lines — those the
   * View Strip's layers leave on.
   */
  function follow() {
    following =
      shown === null || pose === null ? null : vue3dFollowing(shown.scene, pose.anchor, pose.foot);
    if (drawn === null || shown === null) return;
    const still = following === null;
    const { layers } = shown;
    for (const entity of drawn.loaded) entity.show = still;
    for (const entity of drawn.unloaded) entity.show = still && layers.unloaded;
    for (const entity of drawn.trajectory) entity.show = still && layers.trajectory;
    drawn.chord.show = still && layers.ligneAB;
    drawn.ligneAB.show = !still;
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

  /**
   * Ends the press on an anchor, wherever it ended: the camera's gestures come back, and a drag
   * that moved the anchor ends on the relief under it. Heard from CesiumJS's own release and from
   * the window's ({@link ended}), so a pointer let go off the canvas, a cancelled one or a window
   * that lost the focus ends it too; the first to arrive does, the others find no grip.
   */
  function release() {
    if (grip === null) return;
    const { moved } = grip;
    grip = null;
    for (const type of ENDS_OF_A_PRESS) window.removeEventListener(type, ended);
    cesium.screenSpaceCameraController.enableInputs = true;
    canvas.style.cursor = "";
    const released = pose;
    if (!moved || released === null) return;
    void finestFoot(terrainProvider, released.foot).then((foot) => {
      if (pose === released && !widget.isDestroyed()) {
        pose = { anchor: released.anchor, foot };
        follow();
      }
      onGesture({ type: "drag-end", at: { lat: foot.lat, lon: foot.lon } });
    });
  }

  /**
   * The window's word that a press ended: the release or cancel of the pointer that took the
   * anchor — another finger or pen lifted elsewhere is not this press's end — or the window losing
   * the focus, which ends every press.
   */
  function ended(event: Event) {
    const other =
      event instanceof PointerEvent &&
      grip?.pointerId != null &&
      event.pointerId !== grip.pointerId;
    if (!other) release();
  }

  const pointer = new ScreenSpaceEventHandler(canvas);
  pointer.setInputAction(({ position }: ScreenSpaceEventHandler.PositionedEvent) => {
    if (shown?.idle !== true || grip !== null) return;
    const anchor = anchorAt(position);
    if (anchor === null) return;
    grip = { anchor, moved: false, pointerId: pressing };
    for (const type of ENDS_OF_A_PRESS) window.addEventListener(type, ended);
    cesium.screenSpaceCameraController.enableInputs = false;
    canvas.style.cursor = "grabbing";
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

  pointer.setInputAction(release, ScreenSpaceEventType.LEFT_UP);

  return {
    show(scene, display, idle, layers) {
      const before = shown;
      shown = { scene, display, idle, layers };
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
        cesium.camera.setView(cesiumPose(lateralPose(cesium, scene, layers)));
      }
    },
    command(command) {
      if (shown === null || widget.isDestroyed()) return;
      moveCamera(cesium, shown, line, command);
    },
    destroy() {
      pointer.destroy();
      for (const type of ENDS_OF_A_PRESS) window.removeEventListener(type, ended);
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

/**
 * What ends a press, heard on the window: a release, wherever the pointer is, a cancelled pointer,
 * and the window losing the focus — which no pointer event follows.
 */
const ENDS_OF_A_PRESS = ["pointerup", "pointercancel", "blur"] as const;

/** The entities of one scene: what a press may take, and the lines layers and drags show. */
type Drawn = {
  readonly anchors: ReadonlyMap<Entity, Anchor>;
  /** The engine's lines, the last release's: hidden while an anchor follows the pointer. */
  readonly loaded: readonly Entity[];
  /** The Ligne à vide, one per Brin porteur: its layer's, and the last release's. */
  readonly unloaded: readonly Entity[];
  /** The Trajectoire, one per run: its layer's, and the last release's. */
  readonly trajectory: readonly Entity[];
  /** The Ligne A–B as the coupe draws it, dashed: its layer's, and hidden while a drag draws it. */
  readonly chord: Entity;
  /** The Ligne A–B that follows a dragged anchor (#97), shown only while it does. */
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
  // The coupe's Ligne A–B: dashed and fainter than the Ligne à vide, so neither reads as the other.
  const chord = entities.add({
    show: false,
    polyline: {
      positions: scene.ligneAB.map(cartesian),
      arcType: ArcType.NONE,
      width: 2,
      material: new PolylineDashMaterialProperty({ color: FAINT_INK, dashLength: 8 }),
      depthFailMaterial: new PolylineDashMaterialProperty({ color: HIDDEN_INK, dashLength: 8 }),
    },
  });
  // The Trajectoire, dotted as on the coupe, so it never reads as a cable: one polyline per run.
  // `dashLength` is the whole pattern's cycle, px, and the pattern's sixteen bits share it: 5/16 of
  // a 6 px cycle is a dot, then a gap about twice as long.
  const dotted = (color: Color) =>
    new PolylineDashMaterialProperty({ color, dashLength: 6, dashPattern: 0b1111100000000000 });
  const trajectory = (scene.trajectory ?? []).map((run) =>
    entities.add({
      show: false,
      polyline: {
        positions: run.map(cartesian),
        arcType: ArcType.NONE,
        width: 3,
        material: dotted(FAINT_INK),
        // Behind a ridge it fades, as the lines it hangs from do, rather than vanishing.
        depthFailMaterial: dotted(HIDDEN_INK),
      },
    }),
  );
  const unloaded: Entity[] = [];
  const loaded: Entity[] = [];
  for (const offsetPx of scene.membersPx) {
    if (scene.unloaded !== null) {
      unloaded.push(
        entities.add({
          show: false,
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
      loaded.push(
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
        () => (following()?.ligneAB ?? scene.ligneAB).map(cartesian),
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
  return { anchors, loaded, unloaded, trajectory, chord, ligneAB };
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

/** The camera's lens now: its field of view, on the canvas's own proportions. */
function lensOf(cesium: Scene): Lens {
  const { frustum } = cesium.camera;
  const { clientWidth, clientHeight } = cesium.canvas;
  // CesiumJS's default lens spreads 60° across the wider side.
  const fov = frustum instanceof PerspectiveFrustum ? frustum.fov : undefined;
  return {
    fovDeg: CesiumMath.toDegrees(fov ?? CesiumMath.PI_OVER_THREE),
    aspectRatio: clientWidth / clientHeight,
  };
}

/**
 * The Vue latérale of `scene`: the view the Vue 3D opens on, and key 2. It frames every line that
 * may be drawn — the Trajectoire when its layer is on, whose low point, the passager at mid-span,
 * can lie well below a loaded line drawn for a passager near an anchor.
 */
function lateralPose(cesium: Scene, scene: Vue3dScene, layers: Vue3dLayers): CameraPose {
  const trajectory = layers.trajectory ? (scene.trajectory ?? []) : [];
  return vueLaterale(scene, lensOf(cesium), [scene.loaded, scene.unloaded, ...trajectory]);
}

/** CesiumJS's form of a pose: the destination in world coordinates, the angles in radians. */
function cesiumPose({ destination, headingDeg, pitchDeg }: CameraPose) {
  return {
    destination: cartesian(destination),
    orientation: {
      heading: CesiumMath.toRadians(headingDeg),
      pitch: CesiumMath.toRadians(pitchDeg),
      roll: 0,
    },
  };
}

/** What the middle of the view looks at on the relief — `undefined` when it looks at the sky. */
function middleOfView(cesium: Scene): Cartesian3 | undefined {
  const { clientWidth, clientHeight } = cesium.canvas;
  const ray = cesium.camera.getPickRay(new Cartesian2(clientWidth / 2, clientHeight / 2));
  return ray === undefined ? undefined : cesium.globe.pick(ray, cesium);
}

/** The camera's view direction laid level, along its heading. */
function levelAhead(cesium: Scene): Cartesian3 {
  const { camera } = cesium;
  const up = Ellipsoid.WGS84.geodeticSurfaceNormal(camera.positionWC, new Cartesian3());
  // Straight down, the view has no heading of its own: the top of the screen stands for it.
  const along =
    Math.abs(Cartesian3.dot(camera.directionWC, up)) > 0.999 ? camera.upWC : camera.directionWC;
  const vertical = Cartesian3.multiplyByScalar(up, Cartesian3.dot(along, up), new Cartesian3());
  return Cartesian3.normalize(Cartesian3.subtract(along, vertical, vertical), vertical);
}

/**
 * One step of the Gimbal or of a key.
 *
 * @param shown the scene on screen and the layers it shows, which the Vues prédéfinies frame.
 * @param line the sphere around the line: its centre is what the orbit turns around, and its far
 *   side the farthest a zoom or a walk step scales on.
 */
function moveCamera(
  cesium: Scene,
  { scene, layers }: { scene: Vue3dScene; layers: Vue3dLayers },
  line: BoundingSphere,
  command: Vue3dCommand,
) {
  const { camera } = cesium;
  const centre = line.center;
  camera.cancelFlight();
  const looked = middleOfView(cesium);
  const toCentre = Cartesian3.distance(camera.positionWC, centre);
  const toLooked =
    looked === undefined ? undefined : Cartesian3.distance(camera.positionWC, looked);
  // Zoom and walk scale on the line, never on a far slope the middle of the view happens to hit.
  const step = stepDistance(toLooked, toCentre, line.radius);
  switch (command.kind) {
    case "orbit":
      // Around the centre's own vertical: in its east-north-up frame that is the z axis. `rotate`
      // turns the camera clockwise seen from above for a positive angle — to its left.
      camera.lookAtTransform(Transforms.eastNorthUpToFixedFrame(centre));
      camera.rotate(Cartesian3.UNIT_Z, -command.step * CesiumMath.toRadians(CAMERA_STEP.orbitDeg));
      camera.lookAtTransform(Matrix4.IDENTITY);
      return;
    case "tilt":
      camera.setView({
        orientation: {
          heading: camera.heading,
          pitch: CesiumMath.toRadians(
            tiltedPitch(CesiumMath.toDegrees(camera.pitch), command.step),
          ),
          roll: 0,
        },
      });
      return;
    case "zoom": {
      const amount = zoomAmount(step, command.step, camera.positionCartographic.height);
      if (amount >= 0) camera.zoomIn(amount);
      else camera.zoomOut(-amount);
      return;
    }
    case "walk":
      camera.move(levelAhead(cesium), walkAmount(step, command.step));
      return;
    case "north":
      // Turned about what the middle of the view looks at, so the line stays where it was; in the
      // sky, about the camera itself.
      if (looked === undefined) {
        camera.flyTo({
          destination: Cartesian3.clone(camera.positionWC),
          orientation: { heading: 0, pitch: camera.pitch, roll: 0 },
          duration: NORTH_FLIGHT_S,
        });
      } else {
        camera.flyToBoundingSphere(new BoundingSphere(looked, 0), {
          offset: new HeadingPitchRange(0, camera.pitch, toLooked ?? toCentre),
          duration: NORTH_FLIGHT_S,
        });
      }
      return;
    case "view":
      camera.flyTo({
        ...cesiumPose(
          command.view === "depart"
            ? vueDuDepart(scene, ({ lon, lat }) =>
                cesium.globe.getHeight(Cartographic.fromDegrees(lon, lat)),
              )
            : lateralPose(cesium, scene, layers),
        ),
        duration: CAMERA_STEP.flightS,
      });
      return;
  }
}
