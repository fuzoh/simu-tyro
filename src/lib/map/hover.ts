/**
 * The hover on the vue de dessus (#99): where along the ligne A–B the pointer is, as a share of the
 * line. Pure — the map's projection hands it the two ends and the pointer in the same pixels, and
 * the distance and the ground come from `@/lib/chart/hover.ts`, read at that share of the portée.
 *
 * The Banane is not picked: it is a shape drawn beside the line, and it carries no measure.
 */

import type { Px } from "@/lib/chart/hover-gesture.ts";
import type { Position, Positions } from "@/lib/scenario/types.ts";
import type { Trace } from "@/lib/terrain/trace.ts";

/**
 * How far from the line the pointer may be and still be on it, px. A `[CONVENTION]`: a mouse pick
 * tolerance, a little wider than the line's own width.
 */
export const LINE_PICK_PX = 10;

/** The pointer on the line: the share `t` of the way from A, and the point of the line there. */
export type LinePick = { readonly t: number; readonly at: Px };

/**
 * Where the pointer stands on the line from `a` to `b` — or `null` past the pick tolerance, and for
 * a line of no length.
 */
export function alongLine(a: Px, b: Px, pointer: Px, tolerance = LINE_PICK_PX): LinePick | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const squared = dx * dx + dy * dy;
  if (squared === 0) return null;
  const t = Math.min(1, Math.max(0, ((pointer.x - a.x) * dx + (pointer.y - a.y) * dy) / squared));
  const at = { x: a.x + t * dx, y: a.y + t * dy };
  return Math.hypot(pointer.x - at.x, pointer.y - at.y) <= tolerance ? { t, at } : null;
}

/** A box's size, px — or a drawing's own units. */
type Size = { readonly width: number; readonly height: number };

/**
 * The line's two ends, in one of the two frames the vue de dessus draws it in: the plain drawing's
 * own units, scaled to the box it fills, or the map's projection, already in the box's pixels.
 */
export type LineEnds =
  | { readonly kind: "drawing"; readonly A: Px; readonly B: Px; readonly view: Size }
  | { readonly kind: "projected"; readonly A: Px; readonly B: Px };

/**
 * Where a pointer stands on the drawn line, whichever frame it is drawn in — `null` off it, and
 * while the ends are not known (no map yet, or no anchor placed).
 *
 * @param pointer the pointer in the box's own pixels, its top-left corner the origin.
 * @param box the box the line is drawn in, px.
 */
export function pointerOnLine(ends: LineEnds | null, box: Size, pointer: Px): LinePick | null {
  if (ends === null) return null;
  if (ends.kind === "projected") return alongLine(ends.A, ends.B, pointer);
  const scale = ({ x, y }: Px): Px => ({
    x: (x / ends.view.width) * box.width,
    y: (y / ends.view.height) * box.height,
  });
  return alongLine(scale(ends.A), scale(ends.B), pointer);
}

/**
 * Does the drawn line run along the profil the coupe is solved on? The reading takes the ground and
 * the distance from that profil at a share of the portée, so it holds only where the line between
 * the two Positions *is* the profil's own: an imported profil's ends are its Positions. Typed
 * Positions beside a manual span, or moved since the import, draw a line the span knows nothing of.
 *
 * Positions that are not both known draw no real line — the plain schematic is the portée itself,
 * and reads it.
 *
 * @param trace the profil standing in as the line's ground, `null` for a manual span.
 */
export function profilRunsBetween(positions: Positions, trace: Trace | null): boolean {
  const { A, B } = positions;
  if (A === null || B === null) return true;
  const ends = trace?.ends;
  const same = (one: Position, other: Position) => one.lat === other.lat && one.lon === other.lon;
  return ends !== undefined && same(A, ends.A) && same(B, ends.B);
}
