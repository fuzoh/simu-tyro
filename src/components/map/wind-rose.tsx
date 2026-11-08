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
 */

import type { PointerEvent, RefObject } from "react";

import { useRef, useState } from "react";

import type { RoseOffset, RoseReference } from "@/lib/map/wind-rose.ts";
import type { Wind } from "@/lib/scenario/types.ts";

import { MAP_COPY } from "@/lib/map/copy.ts";
import {
  handleOffset,
  ROSE_MAX_KMH,
  ROSE_RADIUS_PX,
  ROSE_RINGS,
  windFromOffset,
} from "@/lib/map/wind-rose.ts";
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
  reference: RoseReference;
  onWind: (wind: Wind) => void;
}) {
  // Where the pointer took the handle, so it does not jump to the pointer's centre.
  const grab = useRef<RoseOffset | null>(null);
  const [dragging, setDragging] = useState(false);
  const handle = handleOffset(wind, reference);

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
    if (grab.current === null) return;
    const origin = centre();
    const next = windFromOffset(
      {
        x: event.clientX - origin.x - grab.current.x,
        y: event.clientY - origin.y - grab.current.y,
      },
      reference,
      wind,
    );
    if (next.speedKmh !== wind.speedKmh || next.directionDeg !== wind.directionDeg) onWind(next);
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
        {/* No line is drawn where the Positions are unknown: the rose draws the level one. */}
        {!reference.oriented && (
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
      {reference.oriented ? (
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
    </div>
  );
}
