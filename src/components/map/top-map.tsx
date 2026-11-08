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
 */

import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource } from "maplibre-gl";
import type { RefObject } from "react";

import { Map as MapLibreMap, Marker, NavigationControl, setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import type { Fond, MapDisplay } from "@/lib/map/display.ts";
import type { Anchor, MapEvent, MapGesture } from "@/lib/map/gesture.ts";
import type { FondHealth, MapStyle } from "@/lib/map/style.ts";
import type { Position, Positions } from "@/lib/scenario/types.ts";
import type { Fetch } from "@/lib/terrain/geoadmin.ts";

import { useAppDispatch, useAppState } from "@/components/app/store.tsx";
import { plainDrawing, TopViewFrame } from "@/components/statique/top-view.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Label } from "@/components/ui/label.tsx";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select.tsx";
import { Toggle } from "@/components/ui/toggle.tsx";
import { anchorReading, clickHint, FOND_LABEL, MAP_COPY, windReading } from "@/lib/map/copy.ts";
import { FONDS } from "@/lib/map/display.ts";
import { clickTarget, drawnPositions, IDLE, stepGesture } from "@/lib/map/gesture.ts";
import {
  fondAttribution,
  fondUnavailable,
  freshHealth,
  isFondSource,
  LINE_SOURCE,
  lineData,
  loadVectorStyle,
  mapStyle,
  SWISSTOPO_COVERAGE,
} from "@/lib/map/style.ts";
import { LEVEL_REFERENCE, roseReference } from "@/lib/map/wind-rose.ts";
import { geoadminNotice, loadGeoadminProfile } from "@/lib/terrain/geoadmin.ts";

import { WindRose } from "./wind-rose.tsx";

// MapLibre cannot find its worker inside a bundle; Vite hands over the file's URL.
setWorkerUrl(workerUrl);

/** The platform's `fetch`, as the pure loaders take it. */
const browserFetch: Fetch = (url) => fetch(url);

/** Wide enough to see both anchors and what lies around them, never closer than a street. */
const FIT = { padding: 48, maxZoom: 16 } as const;

export function TopMap() {
  const { scenario, map: display } = useAppState();
  const dispatch = useAppDispatch();
  const { positions } = scenario;
  const { gesture, send } = useMapGesture(positions);
  const drawn = drawnPositions(gesture, positions);
  const target = clickTarget(gesture, positions);
  const [failed, setFailed] = useState(false);
  const [health, setHealth] = useState<FondHealth>(() => freshHealth(display.fond));

  const plain = failed ? plainDrawing(drawn) : null;
  // The plain drawing orients itself by the LV95 domain, so the rose reads the line as it is drawn.
  const reference =
    plain !== null && plain.unoriented !== null ? LEVEL_REFERENCE : roseReference(drawn);
  const rose = useRef<HTMLDivElement>(null);
  const unavailable = failed || fondUnavailable(health, drawn);

  return (
    <TopViewFrame
      caption={
        <>
          {(["A", "B"] as const).map((anchor) => (
            <span className="font-mono" key={anchor}>
              {anchorReading(anchor, drawn)}
            </span>
          ))}
          <span>{windReading(scenario.wind, reference)}</span>
          <span>
            {gesture.kind === "loading"
              ? MAP_COPY.loading
              : gesture.kind === "idle" && gesture.notice !== null
                ? geoadminNotice(gesture.notice)
                : clickHint(target, positions)}
          </span>
          {unavailable && (
            <span>{[MAP_COPY.unavailable, plain?.unoriented].filter(Boolean).join(" · ")}</span>
          )}
        </>
      }
      controls={
        <MapControls
          display={display}
          onDisplay={(next) => dispatch({ type: "carte/affichée", map: next })}
        />
      }
      figure={
        <>
          {plain === null ? (
            <>
              <MapCanvas
                display={display}
                drawn={drawn}
                gesture={gesture}
                onFailed={() => setFailed(true)}
                onHealth={setHealth}
                rose={rose}
                send={send}
                target={target}
              />
              <div className="pointer-events-none absolute top-2 left-2 flex gap-1">
                {(["A", "B"] as const).map((anchor) => (
                  <Toggle
                    className="bg-background pointer-events-auto"
                    disabled={gesture.kind !== "idle"}
                    key={anchor}
                    onPressedChange={() => send({ type: "arm", anchor })}
                    pressed={gesture.kind === "idle" && gesture.armed === anchor}
                    size="sm"
                    variant="outline"
                  >
                    {anchor === "A" ? MAP_COPY.placeA : MAP_COPY.placeB}
                  </Toggle>
                ))}
              </div>
            </>
          ) : (
            plain.figure
          )}
          <WindRose
            hostRef={rose}
            onWind={(next) => dispatch({ type: "scénario/modifié", patch: { wind: next } })}
            reference={reference}
            wind={scenario.wind}
          />
          <Attribution fond={display.fond} />
        </>
      }
    />
  );
}

/** swisstopo's attribution, always on the map — a condition of its terms, network or not. */
function Attribution({ fond }: { fond: Fond }) {
  return (
    <span className="bg-background/80 text-foreground pointer-events-none absolute right-0 bottom-0 px-1 text-xs">
      {fondAttribution(fond)}
    </span>
  );
}

function MapControls({
  display,
  onDisplay,
}: {
  display: MapDisplay;
  onDisplay: (display: MapDisplay) => void;
}) {
  return (
    <>
      <NativeSelect
        aria-label={MAP_COPY.fond}
        className="max-w-48"
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
      <Label className="gap-1">
        <Checkbox
          checked={display.pentes}
          onCheckedChange={(pentes) => onDisplay({ ...display, pentes })}
        />
        {MAP_COPY.pentes}
      </Label>
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
  target,
  rose,
  send,
  onHealth,
  onFailed,
}: {
  display: MapDisplay;
  drawn: Positions;
  gesture: MapGesture;
  target: Anchor | null;
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
        style: mapStyle({ display, vector: vector.current, positions: line.current }),
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
    created.touchZoomRotate.disableRotation();
    created.addControl(new NavigationControl({ showCompass: false }), "top-right");
    created.on("move", placeRose);
    created.on("resize", placeRose);
    created.on("click", (event) =>
      send({ type: "click", at: { lat: event.lngLat.lat, lon: event.lngLat.lng } }),
    );
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
    placeRose();
    applied.current = styleKey(display, vector.current);
    return () => {
      created.remove();
      map.current = null;
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
      live.setStyle(mapStyle({ display, vector: vector.current, positions: line.current }), {
        diff: true,
      });
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
  const draggable = gesture.kind === "idle";
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
        markers.current[anchor] = anchorMarker(anchor, position, send).addTo(live);
      } else {
        marker.setLngLat([position.lon, position.lat]);
      }
      markers.current[anchor]?.setDraggable(draggable);
    }
    placeRose();
    // A line placed elsewhere — an imported CSV, a typed Position — may stand outside the view;
    // one placed on the map never does, so the camera stays where the reader put it.
    const shown = live.getBounds();
    const outside = [drawn.A, drawn.B].some(
      (position) => position !== null && !shown.contains([position.lon, position.lat]),
    );
    if (draggable && outside) {
      const view = camera(drawn);
      if (view.bounds !== undefined) live.fitBounds(view.bounds, FIT);
      else live.jumpTo(view);
    }
  }, [drawn, draggable, send, placeRose]);

  // A crosshair while a click would place an anchor; MapLibre's own hand otherwise.
  useEffect(() => {
    const live = map.current;
    if (live !== null) live.getCanvas().style.cursor = target === null ? "" : "crosshair";
  }, [target]);

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

/** One anchor's marker: a lettered disc the map moves under the pointer while it is dragged. */
function anchorMarker(anchor: Anchor, position: Position, send: (event: MapEvent) => void): Marker {
  const element = document.createElement("div");
  element.className =
    "bg-background text-foreground border-foreground grid size-7 cursor-grab place-items-center rounded-full border-2 text-xs font-bold shadow";
  element.textContent = anchor;
  // A press on a marker is not a click on the map: an armed « Placer » must not land on it.
  element.addEventListener("click", (event) => event.stopPropagation());
  const marker = new Marker({ element, draggable: true }).setLngLat([position.lon, position.lat]);
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
