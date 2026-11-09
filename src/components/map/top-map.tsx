/**
 * The vue de dessus as a map (#93): swisstopo's Fonds de carte under the ligne A–B, its two anchors
 * as markers, and the gestures that place and move them. MapLibre GL draws it; every decision is a
 * pure module's — the style (`@/lib/map/style.ts`), the gestures (`@/lib/map/gesture.ts`), the words
 * (`@/lib/map/copy.ts`) — and this file is the wiring.
 *
 * Rules this file exists to keep:
 *
 * - **The map is a connected function on top of an app that computes offline.** Nothing here can
 *   stop the Page: a Fond that does not arrive is « fond de carte indisponible » over a plain
 *   background, a profil that does not arrive is an ambient line and leaves the line as it was, and
 *   a browser that cannot draw a map at all gets the plain drawing (`plainDrawing`).
 * - **During a drag the map moves its marker and this file only redraws the line and the
 *   coordinates.** The store hears of the gesture at the release, through the gesture machine, so
 *   the engine and the Verdict are recomputed once per release and never per pointer move.
 * - **The anchors are markers, not style layers**, so changing Fond — a new style — leaves them
 *   exactly where they are; the line is inside every style for the same reason.
 * - **Every network call goes through one `fetch`**, the platform's own, passed to the two pure
 *   loaders — the profil geo.admin and the carte claire's style.
 * - **The Banane is drawn, not computed** (#96): the wind's cross component alone sets how far the
 *   line bows (`@/lib/map/banane.ts`). It has its own source in every style, redrawn with the wind
 *   and with the anchors during a drag, and the note under the map says it is a shape, not a distance.
 * - **The Vue 3D is behind one door** (#95): the « 3D » switch stands it in the map's place, and its
 *   renderer is fetched through `./load-vue-3d.ts` the first time it is chosen — never imported
 *   here. Whatever stops it (no network, no WebGL) brings the vue de dessus back with « Vue 3D
 *   indisponible »; without the two Positions or a profil between them the switch is off and says
 *   why.
 * - **The Mesure is the map's own state** (#98): `./use-measure.ts` holds its points, which never
 *   reach the store, the Session or the link. While it is on, a click on the map is a point of the
 *   ruler and places no anchor; the Vue 3D has no Mesure.
 * - **The aperçu and the Repères are drawn, never held by the store** (#107): the pixel a hovering
 *   pointer stands on is a ref of the map's, read as a click there would be read and drawn in the
 *   Mesure's source of every style — so a changed Fond keeps it, and the click sets the point where
 *   the cross showed. A finger draws none. The Repères d'ancrage cross A and B where they are
 *   drawn, a dragged one under the pointer. « Repères » is a display choice, beside the Fond.
 * - **One gesture machine for both views** (#97): an anchor dragged in the Vue 3D is sent to the
 *   same `send` as a marker, so its release is the same new line, recomputed by the same rule.
 * - **On the Page Terrain the map writes nothing** (#101): no click places an anchor, no anchor is
 *   taken in either view, the rose has no handle and no Fond or Couche pentes is offered — the Fond
 *   is the one the Session holds. The Mesure stays, being the map's own, as #98 drew it — no aperçu,
 *   no Repère d'ancrage, no « Repères » (#107); the coupe stands under the map, and the switch flips
 *   the two together between « 2D » and « 3D ».
 */

import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource } from "maplibre-gl";
import type { ReactNode, RefObject } from "react";

import { Map as MapLibreMap, Marker, NavigationControl, setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { Px } from "@/lib/chart/hover-gesture.ts";
import type { HoverLine } from "@/lib/chart/hover.ts";
import type { SceneBase, SceneFrame } from "@/lib/chart/scene.ts";
import type { Fond, MapDisplay } from "@/lib/map/display.ts";
import type { Anchor, MapEvent, MapGesture } from "@/lib/map/gesture.ts";
import type { MeasurePoints, MeasureReading } from "@/lib/map/measure.ts";
import type { FondHealth, MapStyle, MeasureDrawing } from "@/lib/map/style.ts";
import type { Vue3dBlock, Vue3dScene } from "@/lib/map/vue-3d.ts";
import type { Position, Positions } from "@/lib/scenario/types.ts";
import type { Fetch } from "@/lib/terrain/geoadmin.ts";
import type { Trace } from "@/lib/terrain/trace.ts";

import { useAppDispatch, useAppState } from "@/components/app/store.tsx";
import { useHover } from "@/components/chart/use-hover.ts";
import {
  MapOverCoupe,
  plainDrawing,
  TOP_VIEW_BOX,
  TopViewFrame,
} from "@/components/statique/top-view.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Label } from "@/components/ui/label.tsx";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import { Toggle } from "@/components/ui/toggle.tsx";
import { coupeLines, coupeReading } from "@/lib/chart/hover.ts";
import { placeRider } from "@/lib/chart/scene.ts";
import { bananeAcross } from "@/lib/map/banane.ts";
import {
  anchorReading,
  BANANE_HELP,
  clickHint,
  FOND_LABEL,
  MAP_COPY,
  MEASURE_COPY,
  measureHint,
  measureLines,
  VUE_3D_BLOCKED,
  VUE_3D_BLOCKED_READ_ONLY,
  windReading,
} from "@/lib/map/copy.ts";
import { FONDS } from "@/lib/map/display.ts";
import { clickTarget, drawnPositions, IDLE, stepGesture } from "@/lib/map/gesture.ts";
import { type LineEnds, type LinePick, pointerOnLine } from "@/lib/map/hover.ts";
import { measureAim } from "@/lib/map/measure.ts";
import {
  BANANE_SOURCE,
  bananeData,
  fondAttribution,
  fondUnavailable,
  freshHealth,
  isFondSource,
  LINE_SOURCE,
  lineData,
  loadVectorStyle,
  mapStyle,
  MEASURE_SOURCE,
  measureData,
  measureDrawing,
  SWISSTOPO_COVERAGE,
} from "@/lib/map/style.ts";
import { drapedAttribution, vue3dPlacement, vue3dScene } from "@/lib/map/vue-3d.ts";
import { roseReference } from "@/lib/map/wind-rose.ts";
import { windBearing } from "@/lib/rail/gates.ts";
import { geoadminNotice, loadGeoadminProfile } from "@/lib/terrain/geoadmin.ts";
import { profilRunsBetween } from "@/lib/terrain/trace.ts";
import { cn } from "@/lib/utils.ts";

import type { Vue3d } from "./vue-3d-renderer.ts";

import { loadVue3d } from "./load-vue-3d.ts";
import { useMeasure } from "./use-measure.ts";
import { WindRose } from "./wind-rose.tsx";

// MapLibre cannot find its worker inside a bundle; Vite hands over the file's URL.
setWorkerUrl(workerUrl);

/** The platform's `fetch`, as the pure loaders take it. */
const browserFetch: Fetch = (url) => fetch(url);

/** Wide enough to see both anchors and what lies around them, never closer than a street. */
const FIT = { padding: 48, maxZoom: 16 } as const;

/**
 * @param frame the coupe's input half and `solved` its solved half, as the Page's gates leave them:
 *   the Vue 3D draws the same line the coupe does, or none.
 * @param windCause why the Wind Gate withholds the Vent, or `null`: while it stands no Banane bows
 *   and the rose draws no wind, and the line under the map says it in place of the rose's reading.
 * @param readOnly the Page Terrain's visualisation (#101), whose `coupe` stands under the map in 2D.
 */
export function TopMap({
  frame,
  solved,
  windCause,
  readOnly,
}: {
  frame: SceneFrame | null;
  solved: SceneBase | null;
  windCause: string | null;
  readOnly?: { readonly coupe: ReactNode };
}) {
  const { scenario, map: display, trace } = useAppState();
  const dispatch = useAppDispatch();
  const { positions } = scenario;
  // `trace` stays cached behind manual geometry, where it is no ground of the line's.
  const profil = scenario.geometry.source === "trace" ? trace : null;
  const locked = readOnly !== undefined;
  const { gesture, send } = useMapGesture(positions);
  const drawn = drawnPositions(gesture, positions);
  const target = locked ? null : clickTarget(gesture, positions);
  const [failed, setFailed] = useState(false);
  const [health, setHealth] = useState<FondHealth>(() => freshHealth(display.fond));

  const placement = vue3dPlacement(positions, frame, profil);
  // The Vue 3D fell over this visit: the vue de dessus is back until the switch is pressed again.
  const [lost3d, setLost3d] = useState(false);
  const shows3d = display.view === "3d" && placement.ok && !lost3d;
  const lose3d = useCallback(() => setLost3d(true), [setLost3d]);
  const renderer = useVue3dRenderer(shows3d, lose3d);
  // A withheld Vent is drawn as none, and the rose's handle waits at the centre, where a drag sets a
  // Vent the gates accept.
  const wind = windCause === null ? scenario.wind : { ...scenario.wind, speedKmh: 0 };
  // The Vent is geographic: the line it is projected on is the one drawn, a dragged anchor included.
  // Without A and B there is none, and no Vent bows it — the gates' one check, `windBearing`.
  const bearing = windBearing({ positions: drawn });
  const across = bananeAcross(wind, bearing);
  const scene3d = useVue3dScene(shows3d, frame, profil, solved, across);

  const plain = failed ? plainDrawing(drawn, across) : null;
  const measure = useMeasure(browserFetch, profil);
  const measuring = measure.active && !shows3d && plain === null;
  const { click: measureClick } = measure;
  const clicked = useCallback(
    (at: Position) => {
      if (measuring) measureClick(at);
      else if (!locked) send({ type: "click", at });
    },
    [measuring, measureClick, send, locked],
  );
  // The plain drawing orients itself by the LV95 domain: outside it the line is drawn level, and the
  // rose turns by the line's bearing to stand where the wind comes from on that drawing.
  const reference = roseReference(bearing, plain !== null && plain.unoriented !== null);
  const rose = useRef<HTMLDivElement>(null);
  const [project, setProject] = useState<Project | null>(null);
  // The line is read under the pointer only while nothing else is using the pointer on the map.
  // The line the map draws is the portée's own only where the coupe's profil runs between its ends.
  const reads =
    !shows3d &&
    !measuring &&
    gesture.kind === "idle" &&
    frame !== null &&
    profilRunsBetween(drawn, profil);
  const { at: hovered, bind, clear: clearHover } = useHover<LinePick>();
  const hover = bind((event) => {
    // A control over the line — a toggle, the rose and its handle — is not the line's to read. Not
    // `hasPointerCapture`: a finger is captured by whatever it lands on, the map's canvas included.
    const holder = event.target instanceof Element ? event.target : null;
    if (!reads || holder?.closest("button, [data-rose]")) return null;
    const ends: LineEnds | null =
      plain !== null
        ? { kind: "drawing", A: plain.ends.A, B: plain.ends.B, view: TOP_VIEW_BOX }
        : project === null || drawn.A === null || drawn.B === null
          ? null
          : { kind: "projected", A: project(drawn.A), B: project(drawn.B) };
    const box = event.currentTarget.getBoundingClientRect();
    return pointerOnLine(ends, box, { x: event.clientX - box.left, y: event.clientY - box.top });
  });
  const read =
    reads && hovered !== null
      ? {
          at: hovered.at,
          reading: coupeReading({
            frame,
            cable: null,
            rider: null,
            metres: hovered.t * frame.L,
            reach: 0,
            clearance: true,
          }),
        }
      : null;
  const unavailable = failed || fondUnavailable(health, drawn);
  // The Banane is on screen when there is a cross wind and a line for it to bow: the map's, or the
  // Ligne à vide the Vue 3D drew — which it does not while an anchor follows the pointer.
  const bananeShown =
    across !== 0 &&
    (shows3d
      ? scene3d?.unloaded != null && gesture.kind === "idle"
      : drawn.A !== null && drawn.B !== null);
  // A release loads its profil the same way in both views, and says so under either.
  const gestureLine = measuring
    ? measureHint(measure.points)
    : gesture.kind === "loading"
      ? MAP_COPY.loading
      : gesture.kind === "idle" && gesture.notice !== null
        ? geoadminNotice(gesture.notice)
        : shows3d
          ? null
          : clickHint(target, positions);

  const blockedWhy = locked ? VUE_3D_BLOCKED_READ_ONLY : VUE_3D_BLOCKED;

  const view = (
    <TopViewFrame
      caption={
        <>
          {(["A", "B"] as const).map((anchor) => (
            <span className="font-mono" key={anchor}>
              {anchorReading(anchor, drawn)}
            </span>
          ))}
          {!shows3d && <span>{windCause ?? windReading(wind, bearing, !locked)}</span>}
          <span>{gestureLine}</span>
          {!shows3d && unavailable && (
            <span>{[MAP_COPY.unavailable, plain?.unoriented].filter(Boolean).join(" · ")}</span>
          )}
          {bananeShown && <span title={BANANE_HELP}>{MAP_COPY.bananeNote}</span>}
          {placement.ok ? (
            lost3d && <span>{MAP_COPY.vue3dUnavailable}</span>
          ) : (
            <span>{blockedWhy[placement.block]}</span>
          )}
        </>
      }
      controls={
        <MapControls
          blocked={placement.ok ? null : placement.block}
          display={display}
          locked={locked}
          onDisplay={(next) => dispatch({ type: "carte/affichée", map: next })}
          // Pressing the switch again tries the Vue 3D again, whatever stopped it last time.
          onView={(view) => {
            setLost3d(false);
            dispatch({ type: "carte/affichée", map: { ...display, view } });
          }}
          shows3d={shows3d}
        />
      }
      figure={
        shows3d ? (
          <>
            {renderer === null || scene3d === null ? (
              <Vue3dLoading />
            ) : (
              <Vue3dHost
                display={display}
                // A view that never idles takes no anchor: the Page Terrain only looks at the line.
                idle={!locked && gesture.kind === "idle"}
                onGesture={send}
                onUnavailable={lose3d}
                renderer={renderer}
                scene={scene3d}
              />
            )}
            <Attribution text={drapedAttribution(display.fond)} />
          </>
        ) : (
          <div className="absolute inset-0" {...hover}>
            {plain === null ? (
              <>
                <MapCanvas
                  display={display}
                  drawn={drawn}
                  gesture={gesture}
                  locked={locked}
                  onClick={clicked}
                  onFailed={() => setFailed(true)}
                  onHealth={setHealth}
                  across={across}
                  measure={measure.points}
                  measuring={measuring}
                  reperes={display.reperes}
                  // A function is a state updater to `setState`, so the projection goes in wrapped.
                  onProject={(next) => setProject(() => next)}
                  // The line moved under a still pointer: what was read is stale.
                  onMove={clearHover}
                  rose={rose}
                  send={send}
                  target={target}
                />
                {/* `right-12` keeps the row clear of MapLibre's zoom stack (29 px, 10 px in from
                    the top-right corner) and `flex-wrap` folds it under itself instead: Statique's
                    first row leaves the map 287 px at 1024 px of viewport (#109). */}
                <div className="pointer-events-none absolute top-2 right-12 left-2 flex flex-wrap gap-1">
                  {!locked &&
                    (["A", "B"] as const).map((anchor) => (
                      <Toggle
                        className="bg-background pointer-events-auto"
                        disabled={gesture.kind !== "idle" || measuring}
                        key={anchor}
                        onPressedChange={() => send({ type: "arm", anchor })}
                        pressed={gesture.kind === "idle" && gesture.armed === anchor}
                        size="sm"
                        variant="outline"
                      >
                        {anchor === "A" ? MAP_COPY.placeA : MAP_COPY.placeB}
                      </Toggle>
                    ))}
                  <Toggle
                    className="bg-background touch-44 pointer-events-auto"
                    disabled={!measuring && gesture.kind !== "idle"}
                    onPressedChange={() => {
                      // An armed « Placer » would silently resume once the Mesure is quit.
                      if (!measuring && gesture.kind === "idle" && gesture.armed !== null) {
                        send({ type: "arm", anchor: gesture.armed });
                      }
                      measure.toggle();
                    }}
                    pressed={measuring}
                    size="sm"
                    variant="outline"
                  >
                    {measuring ? MEASURE_COPY.quit : MEASURE_COPY.enter}
                  </Toggle>
                </div>
                {measuring && measure.reading !== null && (
                  <MeasureReadout reading={measure.reading} />
                )}
              </>
            ) : (
              plain.figure
            )}
            <WindRose
              hostRef={rose}
              onWind={
                locked
                  ? undefined
                  : (next) => dispatch({ type: "scénario/modifié", patch: { wind: next } })
              }
              reference={reference}
              wind={wind}
            />
            <Attribution text={fondAttribution(display.fond)} />
            {read !== null && read.reading !== null && (
              <HoverReadout at={read.at} lines={coupeLines(read.reading, "terrain")} />
            )}
          </div>
        )
      }
    />
  );
  return readOnly === undefined ? (
    view
  ) : (
    <MapOverCoupe coupe={shows3d ? null : readOnly.coupe} map={view} />
  );
}

/** The Mesure's distances, over the map's bottom-left corner so the caption's height never moves. */
function MeasureReadout({ reading }: { reading: MeasureReading }) {
  return (
    <div
      aria-label={MEASURE_COPY.title}
      aria-live="polite"
      className="bg-background/90 text-foreground pointer-events-none absolute bottom-6 left-2 flex flex-col px-1 text-xs"
      role="status"
    >
      {measureLines(reading).map((line) => (
        <span key={line}>{line}</span>
      ))}
    </div>
  );
}

/** Where the map draws a Position in its own box, px. */
type Project = (position: Position) => Px;

/**
 * What the line says under the pointer, over the map's bottom-left corner so the caption's height
 * never moves, and a dot on the line where it was read.
 */
function HoverReadout({ at, lines }: { at: Px; lines: readonly HoverLine[] }) {
  return (
    <>
      <span
        className="bg-foreground pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ left: at.x, top: at.y }}
      />
      <div
        aria-hidden
        className="bg-background/90 text-foreground pointer-events-none absolute bottom-6 left-2 flex flex-col px-1 text-xs"
      >
        {lines.map((line) => (
          <span key={line.label}>
            <span className="text-muted-foreground">{line.label}</span>
            {line.value !== "" && <span className="font-mono"> {line.value}</span>}
          </span>
        ))}
      </div>
    </>
  );
}

/** swisstopo's attribution, always on the map — a condition of its terms, network or not. */
function Attribution({ text }: { text: string }) {
  return (
    <span className="bg-background/80 text-foreground pointer-events-none absolute right-0 bottom-0 px-1 text-xs">
      {text}
    </span>
  );
}

type Vue3dRenderer = Awaited<ReturnType<typeof loadVue3d>>;

/**
 * The Vue 3D's renderer, fetched the first time it is wanted and kept. A fetch that fails — the
 * chunk cannot arrive offline — is one more way the Vue 3D falls over.
 */
function useVue3dRenderer(wanted: boolean, onFailed: () => void): Vue3dRenderer | null {
  const [loaded, setLoaded] = useState<Vue3dRenderer | null>(null);
  useEffect(() => {
    if (!wanted || loaded !== null) return;
    let current = true;
    loadVue3d().then(
      (renderer) => {
        if (current) setLoaded(renderer);
      },
      () => {
        if (current) onFailed();
      },
    );
    return () => {
      current = false;
    };
  }, [wanted, loaded, onFailed]);
  return loaded;
}

function Vue3dLoading() {
  return (
    <span className="text-muted-foreground absolute inset-0 grid place-items-center text-xs">
      {MAP_COPY.vue3dLoading}
    </span>
  );
}

/**
 * The Vue 3D in the frame: opened once the renderer is here, handed every new scene and display,
 * closed when the vue de dessus comes back.
 *
 * @param idle the gesture machine waits for a gesture, so an anchor may be taken.
 */
function Vue3dHost({
  renderer,
  scene,
  display,
  idle,
  onGesture,
  onUnavailable,
}: {
  renderer: Vue3dRenderer;
  scene: Vue3dScene;
  display: MapDisplay;
  idle: boolean;
  onGesture: (event: MapEvent) => void;
  onUnavailable: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<Vue3d | null>(null);
  const fallen = useRef(onUnavailable);
  const gestured = useRef(onGesture);
  useLayoutEffect(() => {
    fallen.current = onUnavailable;
    gestured.current = onGesture;
  }, [onUnavailable, onGesture]);

  useEffect(() => {
    const node = container.current;
    if (node === null) return;
    let live = true;
    let opened: Vue3d | null = null;
    const fail = () => {
      if (!live) return;
      live = false;
      fallen.current();
    };
    const options = {
      onGesture: (event: MapEvent) => gestured.current(event),
      onUnavailable: fail,
    };
    renderer.openVue3d(node, options).then((open) => {
      if (live) {
        opened = open;
        setView(open);
      } else open.destroy();
    }, fail);
    return () => {
      live = false;
      opened?.destroy();
      setView(null);
    };
  }, [renderer]);

  useEffect(() => {
    view?.show(scene, display, idle);
  }, [view, scene, display, idle]);

  return (
    <div className="absolute inset-0">
      <div
        aria-label={MAP_COPY.vue3dTitle}
        className="h-full w-full"
        ref={container}
        role="region"
      />
      {view === null && <Vue3dLoading />}
    </div>
  );
}

/**
 * What the Vue 3D draws, while it is shown: the coupe's line placed on the two Positions, the
 * passager where the Scenario puts it.
 */
function useVue3dScene(
  shown: boolean,
  frame: SceneFrame | null,
  profil: Trace | null,
  solved: SceneBase | null,
  across: number,
) {
  const { positions, rider } = useAppState().scenario;
  const { xD } = rider;
  return useMemo(() => {
    if (!shown) return null;
    const at = vue3dPlacement(positions, frame, profil);
    if (!at.ok) return null;
    const placed = solved === null ? null : placeRider(solved, xD);
    return vue3dScene({ placement: at.placement, solved, rider: placed, across });
  }, [shown, positions, frame, profil, solved, xD, across]);
}

function MapControls({
  display,
  blocked,
  locked,
  shows3d,
  onDisplay,
  onView,
}: {
  display: MapDisplay;
  /** Why the Vue 3D cannot stand, `null` when it can. */
  blocked: Vue3dBlock | null;
  /** The Page Terrain: the « 2D » / « 3D » pair alone, every target 44 px. */
  locked: boolean;
  shows3d: boolean;
  onDisplay: (display: MapDisplay) => void;
  onView: (view: MapDisplay["view"]) => void;
}) {
  if (locked) {
    return (
      // A disabled item takes no hover, so the reason's title is on the pair.
      <span title={blocked === null ? undefined : VUE_3D_BLOCKED_READ_ONLY[blocked]}>
        <ToggleGroup
          aria-label={MAP_COPY.views}
          className="gap-1"
          // Pressing the view already shown would leave none pressed: it stays.
          onValueChange={([view]) => {
            if (view === "2d" || view === "3d") onView(view);
          }}
          size="sm"
          value={[shows3d ? "3d" : "2d"]}
          variant="outline"
        >
          <ToggleGroupItem className="touch-44" value="2d">
            {MAP_COPY.view2d}
          </ToggleGroupItem>
          <ToggleGroupItem className="touch-44" disabled={blocked !== null} value="3d">
            {MAP_COPY.view3d}
          </ToggleGroupItem>
        </ToggleGroup>
      </span>
    );
  }
  return (
    <>
      <NativeSelect
        aria-label={MAP_COPY.fond}
        // The one control that gives way at 390 px: a Fond name cut short still reads.
        className="max-w-48 min-w-0"
        onChange={(event) => onDisplay({ ...display, fond: event.target.value as Fond })}
        size="sm"
        title={MAP_COPY.fond}
        value={display.fond}
      >
        {FONDS.map((fond) => (
          <NativeSelectOption key={fond} value={fond}>
            {FOND_LABEL[fond]}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <Label className="shrink-0 gap-1 whitespace-nowrap">
        <Checkbox
          checked={display.pentes}
          onCheckedChange={(pentes) => onDisplay({ ...display, pentes })}
        />
        {MAP_COPY.pentes}
      </Label>
      {/* A display choice like the Fond: it hides the crosses, never a point or a reading. The Vue
          3D draws none, so it is off there — and a disabled button takes no hover, hence the wrapper. */}
      <span className="shrink-0" title={shows3d ? MAP_COPY.reperes3d : MAP_COPY.reperesHelp}>
        <Toggle
          disabled={shows3d}
          onPressedChange={(reperes) => onDisplay({ ...display, reperes })}
          pressed={display.reperes}
          size="sm"
          variant="outline"
        >
          {MAP_COPY.reperes}
        </Toggle>
      </span>
      {/* A disabled button takes no hover, so the reason's title is on its wrapper. */}
      <span className="shrink-0" title={blocked === null ? undefined : VUE_3D_BLOCKED[blocked]}>
        <Toggle
          aria-label={MAP_COPY.vue3dTitle}
          disabled={blocked !== null}
          onPressedChange={(pressed) => onView(pressed ? "3d" : "2d")}
          pressed={shows3d}
          size="sm"
          variant="outline"
        >
          {MAP_COPY.view3d}
        </Toggle>
      </span>
    </>
  );
}

/**
 * The gesture machine, wired: each event steps it against the Scenario's Positions **now**, hands
 * its actions to the store and fetches the profil it asks for. `send` is stable, so the map's
 * listeners can hold it from their creation on.
 */
function useMapGesture(positions: Positions) {
  const dispatch = useAppDispatch();
  const [gesture, setGesture] = useState<MapGesture>(IDLE);
  const current = useRef<{ gesture: MapGesture; positions: Positions }>({
    gesture: IDLE,
    positions,
  });
  useLayoutEffect(() => {
    current.current.positions = positions;
  }, [positions]);

  const send = useCallback(
    (event: MapEvent) => {
      function step(next: MapEvent) {
        const taken = stepGesture(current.current.gesture, current.current.positions, next);
        current.current.gesture = taken.gesture;
        setGesture(taken.gesture);
        for (const action of taken.actions) dispatch(action);
        if (taken.load !== null) {
          void loadGeoadminProfile(taken.load, browserFetch).then((outcome) =>
            step({ type: "profile", outcome }),
          );
        }
      }
      step(event);
    },
    [dispatch],
  );

  return { gesture, send };
}

function MapCanvas({
  display,
  drawn,
  gesture,
  locked,
  target,
  across,
  measure,
  measuring,
  reperes,
  onProject,
  onMove,
  rose,
  send,
  onClick,
  onHealth,
  onFailed,
}: {
  display: MapDisplay;
  drawn: Positions;
  gesture: MapGesture;
  /**
   * The Page Terrain: no anchor is taken, and no zoom button under the 44 px floor is drawn — and
   * the Mesure draws no aperçu, no Repère d'ancrage, and the crosses of its points always (#107).
   */
  locked: boolean;
  target: Anchor | null;
  /** The Mesure's points, drawn above the line. */
  measure: MeasurePoints;
  /** The Mesure is on: a click sets one of its points, and a hovering pointer draws its aperçu. */
  measuring: boolean;
  /** The Repères are shown: every dotted cross, through A and B, the points and the aperçu. */
  reperes: boolean;
  /** What a click on the map does: place an anchor, or set a point of the Mesure. */
  onClick: (at: Position) => void;
  /** The wind's cross component, m/s: the Banane's only input. */
  across: number;
  /** Hands over the map's projection while the map lives: where a Position stands in its box. */
  onProject: (project: Project | null) => void;
  /** The view moved, by the user or by the line. */
  onMove: () => void;
  /** The rose's host: the map keeps it on the line's midpoint as the view moves. */
  rose: RefObject<HTMLDivElement | null>;
  send: (event: MapEvent) => void;
  onHealth: (update: (health: FondHealth) => FondHealth) => void;
  onFailed: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef<Record<Anchor, Marker | null>>({ A: null, B: null });
  const vector = useRef<MapStyle | null>(null);
  // The style the map holds, by what it was built from: the same style set again before the first
  // has loaded is rebuilt from scratch, not diffed.
  const applied = useRef<string | null>(null);
  // What a style built later must draw: the line where it is **now**, not where it was at mount.
  const line = useRef(drawn);
  const bow = useRef(across);
  const ruler = useRef(measure);
  const shownReperes = useRef(reperes);
  // The aperçu (#107): the pixel the pointer hovers in the map's box — re-read on every move of the
  // view, so a pan under a still pointer keeps the cross under it — and whether it is drawn at all:
  // only while the Mesure is on.
  const aim = useRef<readonly [number, number] | null>(null);
  const measures = useRef(measuring);
  // A finger never hovers: the compatibility mouse events a tap fires after it draw no aperçu.
  const hovers = useRef(true);
  const clicked = useRef(onClick);
  const moved = useRef(onMove);
  useLayoutEffect(() => {
    clicked.current = onClick;
    moved.current = onMove;
  }, [onClick, onMove]);

  // What the Mesure's source draws now, the aperçu at the pixel the pointer hovers — read as a click
  // there reads it, so the point lands where the cross shows.
  const drawing = useCallback((): MeasureDrawing => {
    const live = map.current;
    const at = aim.current;
    const pointer = live === null || at === null ? null : live.unproject([at[0], at[1]]);
    return measureDrawing({
      points: ruler.current,
      pointer: pointer === null ? null : { lat: pointer.lat, lon: pointer.lng },
      anchors: line.current,
      reperes: shownReperes.current,
      measuring: measures.current,
      readOnly: locked,
    });
  }, [locked]);
  const redrawMeasure = useCallback(() => {
    void map.current?.getSource<GeoJSONSource>(MEASURE_SOURCE)?.setData(measureData(drawing()));
  }, [drawing]);

  // The rose follows the line's midpoint through every pan and zoom: it runs on every frame, so it
  // moves the host's style rather than render.
  const placeRose = useCallback(() => {
    if (map.current !== null && rose.current !== null) {
      placeRoseHost(map.current, rose.current, line.current);
    }
  }, [rose]);

  useEffect(() => {
    const node = container.current;
    if (node === null) return;
    let created: MapLibreMap;
    try {
      created = new MapLibreMap({
        container: node,
        style: mapStyle({
          display,
          vector: vector.current,
          positions: line.current,
          across: bow.current,
          measure: drawing(),
        }),
        attributionControl: false,
        // A vue de dessus: north stays up, so the drawing reads like the plan it is.
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        maxPitch: 0,
        // A click places an anchor; a double click would place both.
        doubleClickZoom: false,
        ...camera(line.current),
      });
    } catch {
      // No WebGL: the plain drawing takes over, and the Page goes on.
      onFailed();
      return;
    }
    // `dragRotate: false` leaves two other ways to turn the map: a pinch, and Shift + ← / →.
    created.touchZoomRotate.disableRotation();
    created.keyboard.disableRotation();
    // MapLibre's buttons are 29 px; on the Page Terrain, read on a phone, a pinch does their work.
    if (!locked) created.addControl(new NavigationControl({ showCompass: false }), "top-right");
    created.on("move", placeRose);
    created.on("move", () => moved.current());
    created.on("resize", placeRose);
    created.on("click", (event) =>
      clicked.current({ lat: event.lngLat.lat, lon: event.lngLat.lng }),
    );
    // The aperçu follows a pointer that hovers — a mouse, a pen — and leaves with it. Pointer events
    // come before the mouse events they cause, so a tap is known for one before MapLibre hears it.
    // The pixel is read here too, from the DOM and against the canvas as MapLibre reads a click's:
    // its own `mousemove` is held back while a drag pans the map, and the cross would stay where
    // the pan began, away from where the next click lands.
    // The box also holds the zoom buttons, off the canvas MapLibre listens on: a pointer there, or
    // a finger anywhere — a pan sends no mouse event to clear a cross a mouse left — has none.
    const sense = (event: PointerEvent) => {
      hovers.current = event.pointerType !== "touch";
      const box = created.getCanvas().getBoundingClientRect();
      const was = aim.current;
      aim.current = measureAim({
        kind: event.pointerType,
        onCanvas:
          event.target instanceof Node && created.getCanvasContainer().contains(event.target),
        at: [event.clientX - box.left, event.clientY - box.top],
      });
      if (was !== null && aim.current === null && measures.current) redrawMeasure();
    };
    node.addEventListener("pointerdown", sense, true);
    node.addEventListener("pointermove", sense, true);
    created.on("mousemove", (event) => {
      aim.current = hovers.current ? [event.point.x, event.point.y] : null;
      if (measures.current) redrawMeasure();
    });
    created.on("mouseout", () => {
      aim.current = null;
      if (measures.current) redrawMeasure();
    });
    // A pan or a zoom, under a still pointer or one that drags: the cross stays under it.
    created.on("move", () => {
      if (measures.current && aim.current !== null) redrawMeasure();
    });
    created.on("error", (event) => {
      const source: unknown = (event as { sourceId?: unknown }).sourceId;
      if (typeof source === "string" && isFondSource(source)) {
        onHealth((health) => ({ ...health, tilesFailed: true }));
      }
    });
    created.on("sourcedata", (event) => {
      if (event.tile !== undefined && isFondSource(event.sourceId)) {
        onHealth((health) => (health.tilesLoaded ? health : { ...health, tilesLoaded: true }));
      }
    });
    map.current = created;
    onProject(({ lat, lon }) => created.project([lon, lat]));
    placeRose();
    applied.current = styleKey(display, vector.current);
    return () => {
      node.removeEventListener("pointerdown", sense, true);
      node.removeEventListener("pointermove", sense, true);
      created.remove();
      map.current = null;
      aim.current = null;
      onProject(null);
      markers.current = { A: null, B: null };
    };
    // Mounted once: the effects below follow the display and the drawing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A Fond or the Couche pentes changed: a new style, the line built in. The carte claire's style
  // is fetched once and kept; until it is here, or if it never comes, the plain background shows.
  useEffect(() => {
    const live = map.current;
    if (live === null) return;
    const apply = () => {
      const key = styleKey(display, vector.current);
      if (applied.current === key) return;
      applied.current = key;
      live.setStyle(
        mapStyle({
          display,
          vector: vector.current,
          positions: line.current,
          across: bow.current,
          // The aperçu included: a Fond changed under the pointer leaves the cross where it was.
          measure: drawing(),
        }),
        { diff: true },
      );
    };
    apply();
    const fresh = freshHealth(display.fond);
    const known = display.fond !== "carte-claire" || vector.current !== null;
    onHealth(() => (known ? { ...fresh, style: "ok" } : fresh));
    if (known) return;
    let current = true;
    void loadVectorStyle(browserFetch).then((style) => {
      if (!current) return;
      vector.current = style;
      onHealth((health) => ({ ...health, style: style === null ? "failed" : "ok" }));
      if (style !== null) apply();
    });
    return () => {
      current = false;
    };
    // `display` is read whole by `apply`; these two fields are all of it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [display.fond, display.pentes]);

  // The drawing follows the gesture: the line source and the two markers, nothing in the store.
  const idle = gesture.kind === "idle";
  const draggable = idle && !measuring && !locked;
  useEffect(() => {
    line.current = drawn;
    const live = map.current;
    if (live === null) return;
    void live.getSource<GeoJSONSource>(LINE_SOURCE)?.setData(lineData(drawn));
    for (const anchor of ["A", "B"] as const) {
      const position = drawn[anchor];
      const marker = markers.current[anchor];
      if (position === null) {
        marker?.remove();
        markers.current[anchor] = null;
        continue;
      }
      if (marker === null) {
        markers.current[anchor] = anchorMarker(anchor, position, send, !locked).addTo(live);
      } else {
        marker.setLngLat([position.lon, position.lat]);
      }
    }
    placeRose();
    // A line placed elsewhere — an imported CSV, a typed Position — may stand outside the view;
    // one placed on the map never does, so the camera stays where the reader put it.
    const shown = live.getBounds();
    const outside = [drawn.A, drawn.B].some(
      (position) => position !== null && !shown.contains([position.lon, position.lat]),
    );
    if (idle && outside) {
      const view = camera(drawn);
      if (view.bounds !== undefined) live.fitBounds(view.bounds, FIT);
      else live.jumpTo(view);
    }
  }, [drawn, idle, send, placeRose, locked]);

  // The Mesure takes the click that lands on an anchor, so A–B can be measured from A to B, and an
  // anchor stays where it is while it is on. After the effect above, which creates the markers.
  useEffect(() => {
    for (const anchor of ["A", "B"] as const) {
      const marker = markers.current[anchor];
      if (marker === null) continue;
      marker.setDraggable(draggable);
      marker.getElement().style.pointerEvents = measuring ? "none" : "";
    }
  }, [drawn, draggable, measuring]);

  // The Banane follows the wind and the line: a source of its own, so a drag or a typed wind never
  // touches the camera.
  useEffect(() => {
    bow.current = across;
    void map.current?.getSource<GeoJSONSource>(BANANE_SOURCE)?.setData(bananeData(drawn, across));
  }, [drawn, across]);

  // The Mesure follows its clicks, the Repères d'ancrage the anchors as drawn — a dragged one under
  // the pointer — and the Repères' button hides or shows every cross: a source of its own, in every
  // style. After the effect above, which keeps `line` on the drawing.
  useEffect(() => {
    ruler.current = measure;
    shownReperes.current = reperes;
    measures.current = measuring;
    redrawMeasure();
  }, [measure, drawn, reperes, measuring, redrawMeasure]);

  // A crosshair while a click would place an anchor or a point; MapLibre's own hand otherwise.
  useEffect(() => {
    const live = map.current;
    if (live !== null) {
      live.getCanvas().style.cursor = target === null && !measuring ? "" : "crosshair";
    }
  }, [target, measuring]);

  // MapLibre makes its container `position: relative`, so the box that fills the frame is a wrapper.
  return (
    <div className="absolute inset-0">
      <div aria-label={MAP_COPY.title} className="h-full w-full" ref={container} role="region" />
    </div>
  );
}

/**
 * Puts the rose's host on the line's midpoint in the map's box. With no line it goes back to the
 * middle of the box, where its own CSS stands it.
 */
function placeRoseHost(live: MapLibreMap, host: HTMLElement, { A, B }: Positions) {
  const at =
    A === null || B === null ? null : live.project([(A.lon + B.lon) / 2, (A.lat + B.lat) / 2]);
  host.style.left = at === null ? "" : `${at.x}px`;
  host.style.top = at === null ? "" : `${at.y}px`;
}

/**
 * One anchor's marker: a lettered disc the map moves under the pointer while it is dragged.
 *
 * @param movable it may be dragged at all — never on the Page Terrain, so it offers no grab there.
 */
function anchorMarker(
  anchor: Anchor,
  position: Position,
  send: (event: MapEvent) => void,
  movable: boolean,
): Marker {
  const element = document.createElement("div");
  element.className = cn(
    "bg-background text-foreground border-foreground grid size-7 place-items-center rounded-full border-2 text-xs font-bold shadow",
    movable && "cursor-grab",
  );
  element.textContent = anchor;
  // A press on a marker is not a click on the map: an armed « Placer » must not land on it.
  element.addEventListener("click", (event) => event.stopPropagation());
  const marker = new Marker({ element, draggable: movable }).setLngLat([
    position.lon,
    position.lat,
  ]);
  const at = (): Position => {
    const { lat, lng } = marker.getLngLat();
    return { lat, lon: lng };
  };
  marker.on("dragstart", () => send({ type: "drag-start", anchor, at: at() }));
  marker.on("drag", () => send({ type: "drag-move", at: at() }));
  marker.on("dragend", () => send({ type: "drag-end", at: at() }));
  return marker;
}

/** Where the map opens: on the line, on the one anchor known, or on swisstopo's coverage. */
function styleKey({ fond, pentes }: MapDisplay, vector: MapStyle | null): string {
  return `${fond} ${pentes} ${vector !== null}`;
}

function camera({ A, B }: Positions) {
  if (A !== null && B !== null) {
    return {
      bounds: [
        [Math.min(A.lon, B.lon), Math.min(A.lat, B.lat)],
        [Math.max(A.lon, B.lon), Math.max(A.lat, B.lat)],
      ] as [[number, number], [number, number]],
      fitBoundsOptions: FIT,
    };
  }
  const one = A ?? B;
  if (one !== null)
    return { center: [one.lon, one.lat] as [number, number], zoom: FIT.maxZoom - 1 };
  const [west, south, east, north] = SWISSTOPO_COVERAGE;
  return {
    bounds: [
      [west, south],
      [east, north],
    ] as [[number, number], [number, number]],
  };
}
