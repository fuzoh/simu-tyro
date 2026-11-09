/**
 * When a pointer is *reading* a chart or the map (#99), as a machine over one pointer's events. A
 * mouse reads wherever it is. A finger has no hover, and a touch is also a scroll or a drag, so it
 * reads only once held still: the press that moves past the slop first was a drag, and reads nothing.
 *
 * Pure, so a `node` test reaches it; the timer that says « held » is the hook's.
 */

/** A point on the screen, px. */
export type Px = { readonly x: number; readonly y: number };

/** How long a finger holds before it reads, ms. A `[CONVENTION]`: the platforms' long-press. */
export const HOLD_MS = 400;

/** How far a held finger may drift and still be held, px. A `[CONVENTION]`: a finger's own tremor. */
export const HOLD_SLOP_PX = 8;

export type HoverPhase =
  | { readonly kind: "idle" }
  | { readonly kind: "hovering" }
  | { readonly kind: "pressing"; readonly from: Px }
  | { readonly kind: "reading" };

export type HoverEvent =
  | { readonly type: "down" | "move"; readonly pointer: "mouse" | "touch"; readonly at: Px }
  | { readonly type: "hold" | "end" };

export const IDLE: HoverPhase = { kind: "idle" };

export function stepHover(phase: HoverPhase, event: HoverEvent): HoverPhase {
  switch (event.type) {
    case "down":
      return event.pointer === "touch"
        ? { kind: "pressing", from: event.at }
        : { kind: "hovering" };
    case "move":
      if (event.pointer === "mouse") return { kind: "hovering" };
      return phase.kind === "pressing" &&
        Math.hypot(event.at.x - phase.from.x, event.at.y - phase.from.y) > HOLD_SLOP_PX
        ? IDLE
        : phase;
    case "hold":
      return phase.kind === "pressing" ? { kind: "reading" } : phase;
    case "end":
      return IDLE;
  }
}

/** Is the pointer reading right now? */
export function isReading(phase: HoverPhase): boolean {
  return phase.kind === "hovering" || phase.kind === "reading";
}
