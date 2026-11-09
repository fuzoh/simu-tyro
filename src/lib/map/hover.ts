/**
 * The hover on the vue de dessus (#99): where along the ligne A–B the pointer is, as a share of the
 * line. Pure — the map's projection hands it the two ends and the pointer in the same pixels, and
 * the distance and the ground come from `@/lib/chart/hover.ts`, read at that share of the portée.
 *
 * The Banane is not picked: it is a shape drawn beside the line, and it carries no measure.
 */

import type { Px } from "@/lib/chart/hover-gesture.ts";

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
 * **The plain drawing keeps its own proportions** — SVG's default `xMidYMid meet`: one scale, the
 * smaller of the two ratios, and the drawing centred in what is left over. The box is the drawing's
 * 3 : 2 up to its height cap and wider past it (#115, the vue de dessus spans its region), so the
 * spare width is a margin each side of the drawing, never a stretch of it.
 *
 * @param pointer the pointer in the box's own pixels, its top-left corner the origin.
 * @param box the box the line is drawn in, px.
 */
export function pointerOnLine(ends: LineEnds | null, box: Size, pointer: Px): LinePick | null {
  if (ends === null) return null;
  if (ends.kind === "projected") return alongLine(ends.A, ends.B, pointer);
  const { view } = ends;
  const scale = Math.min(box.width / view.width, box.height / view.height);
  const left = (box.width - view.width * scale) / 2;
  const top = (box.height - view.height * scale) / 2;
  const place = ({ x, y }: Px): Px => ({ x: left + x * scale, y: top + y * scale });
  return alongLine(place(ends.A), place(ends.B), pointer);
}
