/**
 * The anchors' gestures on the vue de dessus (#93), as a **pure state machine**: a click, « Placer
 * A » / « Placer B », a drag — and what each one asks of the store and of the network.
 *
 * Rules this module exists to keep:
 *
 * - **During a drag only the drawing follows the pointer.** A move changes the gesture and nothing
 *   else: no action reaches the store, no profil is asked for, so the engine and the Verdict hold
 *   until the release.
 * - **A release, or the click that completes A–B, is a new line between two points** (decision of
 *   #12): a profil geo.admin is asked for between them, and the line changes **when it arrives,
 *   whole** — profil, Positions on its two ends, the anchor heights kept (`tracé/importé`). A
 *   profil that cannot be had changes nothing but the notice: the line, its terrain and its
 *   Verdict stay as they were.
 * - **A click places the first missing anchor, A before B; with both known it does nothing.** « Placer
 *   A » / « Placer B » arm the next click for one anchor, which is how a known one moves by click.
 * - **One anchor alone is just a Position.** It is set at once; there is no line yet to load a
 *   profil for.
 */

import type { AppAction } from "@/lib/app/state.ts";
import type { Position, Positions } from "@/lib/scenario/types.ts";
import type { GeoadminFailure, GeoadminOutcome } from "@/lib/terrain/geoadmin.ts";
import type { TraceEnds } from "@/lib/terrain/trace.ts";

import { roundToDisplay } from "@/lib/format/quantity.ts";
import { encodeP1 } from "@/lib/url/p1.ts";

export type Anchor = "A" | "B";

export type MapGesture =
  /**
   * Waiting for a gesture. `armed` is the anchor « Placer A / B » gives the next click; `notice`
   * is why the last profil asked for did not come.
   */
  | {
      readonly kind: "idle";
      readonly armed: Anchor | null;
      readonly notice: GeoadminFailure | null;
    }
  /** An anchor under the pointer, drawn at `at`. */
  | { readonly kind: "dragging"; readonly anchor: Anchor; readonly at: Position }
  /** A new line between `ends`, drawn there while its profil is on its way. */
  | { readonly kind: "loading"; readonly ends: TraceEnds };

export type MapEvent =
  | { readonly type: "click"; readonly at: Position }
  /** « Placer A » / « Placer B » — pressed again, it disarms. */
  | { readonly type: "arm"; readonly anchor: Anchor }
  | { readonly type: "drag-start"; readonly anchor: Anchor; readonly at: Position }
  | { readonly type: "drag-move"; readonly at: Position }
  | { readonly type: "drag-end"; readonly at: Position }
  /** What `loadGeoadminProfile` answered for the `load` a step asked for. */
  | { readonly type: "profile"; readonly outcome: GeoadminOutcome };

/** One step: the next gesture, what the store takes now, and the profil to fetch, if any. */
export type GestureStep = {
  readonly gesture: MapGesture;
  readonly actions: readonly AppAction[];
  /** Fetch the profil between these ends, then send its outcome back as a `profile` event. */
  readonly load: TraceEnds | null;
};

export const IDLE: MapGesture = { kind: "idle", armed: null, notice: null };

/**
 * @param positions the Scenario's Positions now — the gesture never holds a copy of them.
 */
export function stepGesture(
  gesture: MapGesture,
  positions: Positions,
  event: MapEvent,
): GestureStep {
  switch (event.type) {
    case "click": {
      const anchor = clickTarget(gesture, positions);
      return anchor === null ? still(gesture) : place(positions, anchor, event.at);
    }
    case "arm":
      if (gesture.kind !== "idle") return still(gesture);
      // A new intent: the last failure's notice gives way to what the next click does.
      return still({
        kind: "idle",
        armed: gesture.armed === event.anchor ? null : event.anchor,
        notice: null,
      });
    case "drag-start":
      if (gesture.kind !== "idle") return still(gesture);
      return still({ kind: "dragging", anchor: event.anchor, at: event.at });
    case "drag-move":
      if (gesture.kind !== "dragging") return still(gesture);
      return still({ ...gesture, at: event.at });
    case "drag-end":
      if (gesture.kind !== "dragging") return still(gesture);
      return place(positions, gesture.anchor, event.at);
    case "profile": {
      if (gesture.kind !== "loading") return still(gesture);
      const { outcome } = event;
      if (!outcome.ok) return still({ kind: "idle", armed: null, notice: outcome.failure });
      const { trace } = outcome;
      return {
        gesture: IDLE,
        actions: [{ type: "tracé/importé", trace, tr: encodeP1(trace) }],
        load: null,
      };
    }
  }
}

/**
 * Where the anchors are drawn now: the Scenario's Positions, but the dragged anchor under the
 * pointer and a loading line at the ends it is loading between.
 */
export function drawnPositions(gesture: MapGesture, positions: Positions): Positions {
  switch (gesture.kind) {
    case "idle":
      return positions;
    case "dragging":
      return { ...positions, [gesture.anchor]: gesture.at };
    case "loading":
      return gesture.ends;
  }
}

/**
 * What the next click on the map does: place or move this anchor, or nothing — both known, or a
 * gesture under way.
 */
export function clickTarget(gesture: MapGesture, positions: Positions): Anchor | null {
  if (gesture.kind !== "idle") return null;
  if (gesture.armed !== null) return gesture.armed;
  return positions.A === null ? "A" : positions.B === null ? "B" : null;
}

function still(gesture: MapGesture): GestureStep {
  return { gesture, actions: [], load: null };
}

/** `anchor` put down at `at`: a new line if the other end is known, a lone Position otherwise. */
function place(positions: Positions, anchor: Anchor, at: Position): GestureStep {
  const next: Positions = { ...positions, [anchor]: grained(at) };
  const { A, B } = next;
  if (A !== null && B !== null) {
    return { gesture: { kind: "loading", ends: { A, B } }, actions: [], load: { A, B } };
  }
  return {
    gesture: IDLE,
    actions: [{ type: "scénario/modifié", patch: { positions: next } }],
    load: null,
  };
}

/** A pointer's Position at the grain a typed one has: six decimals, about 0,1 m. */
function grained({ lat, lon }: Position): Position {
  return { lat: roundToDisplay("coordinate", lat), lon: roundToDisplay("coordinate", lon) };
}
