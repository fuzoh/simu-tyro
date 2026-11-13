/**
 * The rose des vents over the vue de dessus (#94): a handle whose angle is the wind's direction and
 * whose distance from the centre is its force, writing the same Vent the two fields write.
 *
 * Rules this file exists to keep:
 *
 * - **The rose is a sibling of the map, not a layer or a marker inside it.** A gesture that starts
 *   on the handle therefore never reaches MapLibre's pan handlers, and a click on it is not a click
 *   on the map. The handle also captures its pointer and takes `touch-action: none`, so a drag that
 *   leaves it, or a finger on a page that scrolls, still belongs to the rose.
 * - **The Scenario is written as the handle moves**, not at the release: the fields beside it follow
 *   the gesture, and the address bar's own debounce writes the link once it stops.
 * - **The host is a point.** Its parent places it — at the line's midpoint on the map, at the middle
 *   of the box without one — and everything the rose draws is relative to it.
 * - **Without `onWind` there is no handle** (#101): the Page Terrain shows the Vent and sets none.
 * - **Without a reference there is no wind and no handle either**: A or B is not on the map, so the
 *   line has no bearing and the Vent can be neither drawn nor set (`windBearing`). The rose draws
 *   the level line, A on the left, and the reading under the map says why.
 * - **The profile has a handle of its own** (#120): {@link WindProfilePad}, a pad beside the rose
 *   whose axes are the screen's — right is wider, up is more attenuated — with the preview of the
 *   speed from A to B and « Vent uniforme ». The same gesture as the rose's, and no key of its own:
 *   the profile's keyboard is its two fields. Its holder mounts it only where the direction handle
 *   stands and only once the physics reads the profile (`WIND_PROFILE_ACTIVE`).
 */

import type { PointerEvent, RefObject } from "react";

import { useRef, useState } from "react";

import type { ProfilePreview, RoseOffset, RoseReference } from "@/lib/map/wind-rose.ts";
import type { Wind } from "@/lib/scenario/types.ts";

import { Button } from "@/components/ui/button.tsx";
import { MAP_COPY, profileReading } from "@/lib/map/copy.ts";
import {
  handleOffset,
  PROFILE_PAD_PX,
  profileHandleOffset,
  ROSE_MAX_KMH,
  ROSE_RADIUS_PX,
  ROSE_RINGS,
  windFromOffset,
  windFromProfileOffset,
} from "@/lib/map/wind-rose.ts";
import { isWindUniform, uniformWind } from "@/lib/scenario/wind.ts";
import { cn } from "@/lib/utils.ts";

/** The handle's touch target, px: Apple's and Material's minimum. */
const HANDLE_PX = 44;

export function WindRose({
  hostRef,
  wind,
  reference,
  onWind,
}: {
  /** The point the rose is drawn around — `TopMap`'s map places it as the map moves. */
  hostRef: RefObject<HTMLDivElement | null>;
  wind: Wind;
  /** `null` when the line has no bearing: no wind is drawn and no handle offered. */
  reference: RoseReference | null;
  onWind?: (wind: Wind) => void;
}) {
  // Where the pointer took the handle, so it does not jump to the pointer's centre.
  const grab = useRef<RoseOffset | null>(null);
  const [dragging, setDragging] = useState(false);
  const handle = reference === null ? { x: 0, y: 0 } : handleOffset(wind, reference);
  const oriented = reference?.oriented ?? false;

  function centre(): RoseOffset {
    const box = hostRef.current?.getBoundingClientRect();
    return { x: box?.left ?? 0, y: box?.top ?? 0 };
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const origin = centre();
    grab.current = {
      x: event.clientX - origin.x - handle.x,
      y: event.clientY - origin.y - handle.y,
    };
    setDragging(true);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (grab.current === null || reference === null) return;
    const origin = centre();
    const next = windFromOffset(
      {
        x: event.clientX - origin.x - grab.current.x,
        y: event.clientY - origin.y - grab.current.y,
      },
      reference,
      wind,
    );
    if (next.speedKmh !== wind.speedKmh || next.directionDeg !== wind.directionDeg) onWind?.(next);
  }

  function release() {
    grab.current = null;
    setDragging(false);
  }

  return (
    <div
      aria-label={MAP_COPY.rose}
      className="pointer-events-none absolute top-1/2 left-1/2 size-0 text-xs"
      data-rose
      ref={hostRef}
      role="group"
    >
      <svg className="text-foreground/40 absolute overflow-visible" height={1} width={1}>
        {ROSE_RINGS.map((ring) => (
          <circle
            cx={0}
            cy={0}
            fill="none"
            key={ring}
            r={(ring / ROSE_MAX_KMH) * ROSE_RADIUS_PX}
            stroke="currentColor"
            strokeDasharray={ring === ROSE_MAX_KMH ? undefined : "3 3"}
            strokeWidth={1.5}
          />
        ))}
        {handle.x !== 0 || handle.y !== 0 ? (
          <line stroke="currentColor" strokeWidth={2} x1={0} x2={handle.x} y1={0} y2={handle.y} />
        ) : null}
        {/* Where the drawing is not the north-up map, the rose draws the line level itself. */}
        {!oriented && (
          <line
            stroke="currentColor"
            strokeWidth={3}
            x1={-ROSE_RADIUS_PX / 3}
            x2={ROSE_RADIUS_PX / 3}
            y1={0}
            y2={0}
          />
        )}
      </svg>
      {/* The graduations: the rings' km/h, set on the rose's top and clear of the handle's path. */}
      {ROSE_RINGS.map((ring) => (
        <span
          className="bg-background/80 text-muted-foreground absolute -translate-x-1/2 -translate-y-1/2 px-0.5 whitespace-nowrap"
          key={ring}
          style={{ top: -(ring / ROSE_MAX_KMH) * ROSE_RADIUS_PX }}
        >
          {ring === ROSE_MAX_KMH ? `${ring} km/h` : ring}
        </span>
      ))}
      {oriented ? (
        <span
          className="text-muted-foreground absolute -translate-x-1/2 -translate-y-full"
          style={{ top: -ROSE_RADIUS_PX - 14 }}
        >
          N
        </span>
      ) : (
        <>
          {(["A", "B"] as const).map((anchor) => (
            <span
              className="text-foreground absolute -translate-x-1/2 translate-y-1 font-bold"
              key={anchor}
              style={{ left: ((anchor === "A" ? -1 : 1) * ROSE_RADIUS_PX) / 3 }}
            >
              {anchor}
            </span>
          ))}
        </>
      )}
      {onWind !== undefined && reference !== null && (
        <div
          className={cn(
            "pointer-events-auto absolute grid touch-none place-items-center",
            dragging ? "cursor-grabbing" : "cursor-grab",
          )}
          onLostPointerCapture={release}
          onPointerCancel={release}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={release}
          style={{
            width: HANDLE_PX,
            height: HANDLE_PX,
            left: handle.x - HANDLE_PX / 2,
            top: handle.y - HANDLE_PX / 2,
          }}
          title={MAP_COPY.roseHandle}
        >
          <span className="bg-background border-foreground size-7 rounded-full border-2 shadow" />
        </div>
      )}
    </div>
  );
}

/** The preview's drawing box, px: the pad's width, and room for the curve between two margins. */
const PREVIEW_PX = { width: PROFILE_PAD_PX.width, height: 36, margin: 3 } as const;

/** The column the preview and its readings stand in, px: the readings wrap in it. */
const READING_PX = 168;

/**
 * The profile's pad (#120): a handle on fixed screen axes — to the right the largeur à
 * mi-atténuation grows, upward the atténuation aux ancrages does — the preview of the speed from A
 * to B, and « Vent uniforme ».
 *
 * A sibling of the map like the rose, and `data-rose` like it, so the line under it is not read
 * through it. Each gesture writes the profile's two percents and keeps the speed and the direction.
 *
 * @param wind the Scenario's Vent as it is held — a percent out of its domain parks the handle on
 *   the pad's nearest edge and is rewritten only by a drag.
 * @param preview what the preview draws, or `null` while the gates refuse the Vent: a profile that
 *   is refused is not drawn as though it were legal, and its fields carry the message.
 */
export function WindProfilePad({
  wind,
  preview,
  onWind,
}: {
  wind: Wind;
  preview: ProfilePreview | null;
  onWind: (wind: Wind) => void;
}) {
  const pad = useRef<HTMLDivElement>(null);
  // Where the pointer took the handle, so it does not jump to the pointer's centre.
  const grab = useRef<RoseOffset | null>(null);
  const [dragging, setDragging] = useState(false);
  const handle = profileHandleOffset(wind);

  function corner(): RoseOffset {
    const box = pad.current?.getBoundingClientRect();
    return { x: box?.left ?? 0, y: box?.top ?? 0 };
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const origin = corner();
    grab.current = {
      x: event.clientX - origin.x - handle.x,
      y: event.clientY - origin.y - handle.y,
    };
    setDragging(true);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (grab.current === null) return;
    const origin = corner();
    const next = windFromProfileOffset(
      {
        x: event.clientX - origin.x - grab.current.x,
        y: event.clientY - origin.y - grab.current.y,
      },
      wind,
    );
    if (next.widthPct !== wind.widthPct || next.attenuationPct !== wind.attenuationPct) {
      onWind(next);
    }
  }

  function release() {
    grab.current = null;
    setDragging(false);
  }

  const { width, height, margin } = PREVIEW_PX;
  // The curve's top is the speed at mid-span and its floor is no wind: shares of that speed.
  const drawn = (share: number) => height - margin - share * (height - 2 * margin);

  return (
    <div
      aria-label={MAP_COPY.profile}
      className="bg-background/90 text-foreground pointer-events-auto absolute top-12 left-2 flex flex-col gap-2 rounded-md border p-2 text-xs shadow sm:flex-row sm:gap-6"
      data-rose
      role="group"
    >
      {/* The pad, and its two axes written outside the handle's travel: it never stands on them. */}
      <div className="text-muted-foreground flex flex-col gap-1">
        <span>{MAP_COPY.profileSheltered}</span>
        <div
          className="border-foreground/40 relative border"
          ref={pad}
          style={{ width: PROFILE_PAD_PX.width, height: PROFILE_PAD_PX.height }}
        >
          <div
            className={cn(
              "absolute grid touch-none place-items-center",
              dragging ? "cursor-grabbing" : "cursor-grab",
            )}
            onLostPointerCapture={release}
            onPointerCancel={release}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={release}
            style={{
              width: HANDLE_PX,
              height: HANDLE_PX,
              left: handle.x - HANDLE_PX / 2,
              top: handle.y - HANDLE_PX / 2,
            }}
            title={MAP_COPY.profileHandle}
          >
            <span className="bg-background border-foreground size-5 rounded-full border-2 shadow" />
          </div>
        </div>
        <span className="mt-2 self-end">{MAP_COPY.profileWider}</span>
      </div>
      <div className="flex flex-col gap-1" style={{ width: READING_PX }}>
        <span className="font-medium">{MAP_COPY.profile}</span>
        {preview !== null && (
          <>
            <div style={{ width }}>
              <div className="text-muted-foreground flex justify-between font-bold">
                <span>A</span>
                <span>B</span>
              </div>
              <svg
                aria-hidden
                className="text-foreground overflow-visible"
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                width={width}
              >
                {/* The two points the width is read between — kept, and marked, under a uniform wind. */}
                {preview.marks.map((mark) => (
                  <line
                    key={mark}
                    stroke="currentColor"
                    strokeDasharray="2 3"
                    strokeOpacity={0.5}
                    x1={mark * width}
                    x2={mark * width}
                    y1={0}
                    y2={height}
                  />
                ))}
                <polyline
                  fill="none"
                  points={preview.curve
                    .map(({ xi, share }) => `${xi * width},${drawn(share)}`)
                    .join(" ")}
                  stroke="currentColor"
                  strokeWidth={2}
                />
              </svg>
            </div>
            <div className="flex flex-col">
              {profileReading(preview).map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
          </>
        )}
        <Button
          className="touch-44 mt-auto"
          disabled={isWindUniform(wind)}
          onClick={() => onWind(uniformWind(wind))}
          size="sm"
          variant="outline"
        >
          {MAP_COPY.uniformWind}
        </Button>
      </div>
    </div>
  );
}
