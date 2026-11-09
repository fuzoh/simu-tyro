/**
 * The hover's wiring (#99): one pointer's events stepped through `@/lib/chart/hover-gesture.ts`, and
 * the place they were read at. One hook serves every surface that reads under a pointer — the coupe,
 * the curve, the vue de dessus — so a mouse and a held finger mean the same thing on all of them.
 *
 * `bind` turns a surface's own `locate` — pointer event to what that surface reads there, or `null`
 * where it reads nothing — into the pointer handlers to spread on it. A surface that is two
 * elements, or two charts sharing one reading, binds each with its own `locate`.
 */

import type { PointerEvent as ReactPointerEvent } from "react";

import { useCallback, useEffect, useRef, useState } from "react";

import type { HoverEvent, HoverPhase } from "@/lib/chart/hover-gesture.ts";
import type { SharedX } from "@/lib/layout/contract.ts";

import { HOLD_MS, IDLE, isReading, stepHover } from "@/lib/chart/hover-gesture.ts";

/** The pointer handlers `bind` hands a surface, to spread on it. */
export type HoverHandlers = {
  onPointerDown: (event: ReactPointerEvent<Element>) => void;
  onPointerMove: (event: ReactPointerEvent<Element>) => void;
  onPointerUp: (event: ReactPointerEvent<Element>) => void;
  onPointerCancel: () => void;
  onPointerLeave: () => void;
  onContextMenu: (event: { preventDefault: () => void }) => void;
};

type Locate<P> = (event: ReactPointerEvent<Element>) => P | null;

/**
 * Locates the pointer on a chart's x axis, in metres from A. The scale's own inverse, against the
 * SVG's box rather than the target's: the target is the plot's rectangle or the rider's grab circle,
 * and neither is the box the scale is defined on.
 */
export function metresOn(x: SharedX): Locate<number> {
  return (event) => {
    const target = event.currentTarget;
    const rect =
      target instanceof SVGElement ? target.ownerSVGElement?.getBoundingClientRect() : undefined;
    return rect === undefined ? null : x.toMetres(event.clientX, rect.left);
  };
}

export function useHover<P>() {
  const [phase, setPhase] = useState<HoverPhase>(IDLE);
  const [at, setAt] = useState<P | null>(null);
  const current = useRef<HoverPhase>(IDLE);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // The press that is a touch owns the long-press menu some platforms raise: it would cancel it.
  const touching = useRef(false);

  const send = useCallback(function send(event: HoverEvent) {
    const next = stepHover(current.current, event);
    current.current = next;
    setPhase(next);
    if (next.kind !== "pressing") clearTimeout(timer.current);
    else if (event.type === "down") {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => send({ type: "hold" }), HOLD_MS);
    }
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  /** Stops reading and forgets the place: what was read is no longer under the pointer. */
  const end = useCallback(() => {
    setAt(null);
    send({ type: "end" });
  }, [send]);

  const bind = useCallback(
    (locate: Locate<P>): HoverHandlers => {
      const read = (type: "down" | "move") => (event: ReactPointerEvent<Element>) => {
        const pointer = event.pointerType === "touch" ? "touch" : "mouse";
        touching.current = pointer === "touch";
        setAt(locate(event));
        send({ type, pointer, at: { x: event.clientX, y: event.clientY } });
      };
      return {
        onPointerDown: read("down"),
        onPointerMove: read("move"),
        // A mouse released on the surface is still over it, and still reads.
        onPointerUp(event) {
          if (event.pointerType === "touch") end();
        },
        onPointerCancel: end,
        onPointerLeave: end,
        onContextMenu(event: { preventDefault: () => void }) {
          if (touching.current) event.preventDefault();
        },
      };
    },
    [send, end],
  );

  return { at: isReading(phase) ? at : null, bind, clear: end };
}
