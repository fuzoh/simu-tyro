/**
 * The vue de dessus's plain drawing (#91): the ligne A–B seen from above, on a plain background.
 * Since #93 the vue de dessus is a map; this drawing is what it falls back to where no map can
 * start (no WebGL), so the Page still shows the line and says « fond de carte indisponible ».
 *
 * **North is drawn only when it is known**: both Positions set and inside the domain swisstopo's
 * approximate LV95 formulas hold for (`@/lib/terrain/lv95.ts`, which this module reads and never
 * re-derives). Otherwise the line is drawn level, A on the left, and no north arrow pretends to an
 * orientation nobody typed. The drawing is a picture of where the anchors stand, scaled to fit its
 * box; no length on it is read by anything.
 */

import type { Positions } from "@/lib/scenario/types.ts";

import { inLv95Domain, lv95FromWgs84 } from "@/lib/terrain/lv95.ts";

/** A point in the drawing's own units, `y` downwards as an SVG draws it. */
export type TopViewPoint = { readonly x: number; readonly y: number };

/**
 * Why north is not drawn: a Position is not set, one lies outside the approximate grid's domain,
 * or both name one point, which has no bearing.
 */
export type Unoriented = "absent" | "outside" | "coincident";

export type TopView = {
  readonly A: TopViewPoint;
  readonly B: TopViewPoint;
  /** `null` when up is north; otherwise the line is drawn level, and the Page says why. */
  readonly unoriented: Unoriented | null;
};

/** The drawing's box: its size and the margin the anchors' marks and letters need. */
export type TopViewBox = { readonly width: number; readonly height: number; readonly pad: number };

export function topView(positions: Positions, { width, height, pad }: TopViewBox): TopView {
  const centre = { x: width / 2, y: height / 2 };
  const level = (unoriented: Unoriented): TopView => ({
    A: { x: pad, y: centre.y },
    B: { x: width - pad, y: centre.y },
    unoriented,
  });
  const { A, B } = positions;
  if (A === null || B === null) return level("absent");
  if (!inLv95Domain(A) || !inLv95Domain(B)) return level("outside");

  const a = lv95FromWgs84(A);
  const b = lv95FromWgs84(B);
  const east = b.E - a.E;
  const north = b.N - a.N;
  if (east === 0 && north === 0) return level("coincident");

  // One scale on both axes, so the drawn bearing is the true one; the longer extent fills its side.
  const scale = Math.min(
    east === 0 ? Infinity : (width - 2 * pad) / Math.abs(east),
    north === 0 ? Infinity : (height - 2 * pad) / Math.abs(north),
  );
  const dx = (east * scale) / 2;
  const dy = (north * scale) / 2;
  return {
    A: { x: centre.x - dx, y: centre.y + dy },
    B: { x: centre.x + dx, y: centre.y - dy },
    unoriented: null,
  };
}
