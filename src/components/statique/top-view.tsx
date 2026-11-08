/**
 * The vue de dessus's frame (#91, #93), shared by the live map and the Skeleton, and the plain
 * drawing the map falls back to when it cannot start at all.
 *
 * The map itself is `@/components/map/top-map.tsx`. The plain drawing — the ligne A–B from above,
 * its two anchors, a north arrow when the Positions say where north is (`@/lib/statique/top-view.ts`)
 * — stands in for it only where the browser cannot draw a map (no WebGL), so that case, too, keeps
 * the line and its anchors on a plain background rather than an error.
 *
 * **The letters are HTML over the drawing, not SVG `<text>`**: the `viewBox` scales whatever is
 * inside it with the column, so a 12-unit letter would render at a fourth size on a desktop column.
 * Placed by percentage of the box, they sit on the scaled points and stay `text-xs`.
 */

import type { CSSProperties, ReactNode } from "react";

import type { Positions } from "@/lib/scenario/types.ts";
import type { TopViewPoint } from "@/lib/statique/top-view.ts";

import { TOP_VIEW, UNORIENTED } from "@/lib/statique/copy.ts";
import { topView } from "@/lib/statique/top-view.ts";

/** The drawing's own units, at the frame's 3 : 2; the SVG scales them to the column. */
export const TOP_VIEW_BOX = { width: 330, height: 220, pad: 28 } as const;

/** Where the north arrow stands, in the drawing's units: the top-right corner. */
const NORTH = { x: TOP_VIEW_BOX.width - 14, y: 14 } as const;

/** The plain drawing, and why it cannot say where north is — `null` when it can. */
export function plainDrawing(positions: Positions): {
  figure: ReactNode;
  unoriented: string | null;
} {
  const { A, B, unoriented } = topView(positions, TOP_VIEW_BOX);
  const { width, height } = TOP_VIEW_BOX;
  const anchors = [
    ["A", A],
    ["B", B],
  ] as const;
  return {
    unoriented: unoriented === null ? null : UNORIENTED[unoriented],
    figure: (
      <>
        <svg
          className="text-foreground absolute inset-0 h-full w-full"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          <title>{TOP_VIEW.title}</title>
          <line stroke="currentColor" strokeWidth={2} x1={A.x} x2={B.x} y1={A.y} y2={B.y} />
          {anchors.map(([name, point]) => (
            <circle
              className="fill-background"
              cx={point.x}
              cy={point.y}
              key={name}
              r={5}
              stroke="currentColor"
              strokeWidth={2}
            />
          ))}
          {unoriented === null && (
            <path
              className="text-muted-foreground"
              d="M0 14 L0 -2 M-4 3 L0 -4 L4 3"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              transform={`translate(${NORTH.x} ${NORTH.y})`}
            />
          )}
        </svg>
        {/* The `<svg>`'s title names the figure; the letters repeat what it draws. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 text-xs">
          {anchors.map(([name, point]) => (
            // Above the mark, clear of its radius at the widest column.
            <span
              className="absolute -translate-x-1/2 -translate-y-full pb-3"
              key={name}
              style={at(point)}
            >
              {name}
            </span>
          ))}
          {unoriented === null && (
            // Under the arrow, whose shaft ends 14 units below its anchor.
            <span
              className="text-muted-foreground absolute -translate-x-1/2"
              style={at({ x: NORTH.x, y: NORTH.y + 14 })}
            >
              {TOP_VIEW.north}
            </span>
          )}
        </div>
      </>
    ),
  };
}

/** A point of the drawing as a position in the box, which scales with the drawing. */
function at({ x, y }: TopViewPoint): CSSProperties {
  return {
    left: `${(x / TOP_VIEW_BOX.width) * 100}%`,
    top: `${(y / TOP_VIEW_BOX.height) * 100}%`,
  };
}

/**
 * The figure's box, shared with the Skeleton: one control row, the map at 3 : 2 — capped so a
 * desktop column does not spend its whole height on it — then three caption lines, reserved so the
 * live lines land in the Skeleton's space. The Skeleton passes no occupant, only the heights.
 */
export function TopViewFrame({
  controls,
  figure,
  caption,
}: {
  controls?: ReactNode;
  figure?: ReactNode;
  caption?: ReactNode;
}) {
  return (
    <div className="flex max-w-2xl flex-col gap-2">
      <div className="flex h-7 items-center gap-2">{controls}</div>
      <div className="border-border relative aspect-[3/2] w-full overflow-hidden border">
        {figure}
      </div>
      <div className="text-muted-foreground flex min-h-12 flex-col text-xs">{caption}</div>
    </div>
  );
}
