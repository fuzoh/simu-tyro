/**
 * The vue de dessus (#91): the ligne A–B from above on a plain background, its two anchors, and a
 * north arrow when the Positions say where north is — `@/lib/statique/top-view.ts` decides all of
 * it. The box is a fixed `viewBox` scaled to the column's width, so the Skeleton reserves the same
 * height before anything is measured.
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

/** The drawing's own units; the SVG scales them to the column. */
export const TOP_VIEW_BOX = { width: 320, height: 160, pad: 28 } as const;

/** Where the north arrow stands, in the drawing's units: the top-right corner. */
const NORTH = { x: TOP_VIEW_BOX.width - 14, y: 14 } as const;

export function TopViewFigure({ positions }: { positions: Positions }) {
  const { A, B, unoriented } = topView(positions, TOP_VIEW_BOX);
  const { width, height } = TOP_VIEW_BOX;
  const anchors = [
    ["A", A],
    ["B", B],
  ] as const;
  return (
    <TopViewFrame
      caption={
        unoriented === null
          ? TOP_VIEW.unavailable
          : `${TOP_VIEW.unavailable} · ${UNORIENTED[unoriented]}`
      }
      figure={
        <>
          {/* Out of flow, so the box is as tall as its aspect alone makes it — the Skeleton's empty
              box's height. In flow, the drawing's own 2 : 1 inside the border grew it a pixel. */}
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
      }
    />
  );
}

/** A point of the drawing as a position in the box, which scales with the drawing. */
function at({ x, y }: TopViewPoint): CSSProperties {
  return {
    left: `${(x / TOP_VIEW_BOX.width) * 100}%`,
    top: `${(y / TOP_VIEW_BOX.height) * 100}%`,
  };
}

/**
 * The figure's box, shared with the Skeleton: the drawing's 2 : 1 aspect, capped so a desktop
 * column does not spend its height on two dots, then the caption — two lines reserved, which the
 * longest one takes at 390 px, so the live caption lands in the Skeleton's.
 */
export function TopViewFrame({ figure, caption }: { figure?: ReactNode; caption?: string }) {
  return (
    <div className="flex max-w-xl flex-col gap-1">
      <div className="border-border relative aspect-[2/1] w-full border">{figure}</div>
      <p className="text-muted-foreground min-h-8 text-xs">{caption}</p>
    </div>
  );
}
