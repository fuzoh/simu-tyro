/**
 * The two **Zones d'ancrage** as the charts draw them (#106): full-height bands from `0` to `z` and
 * from `L − z` to `L`, where the garde au sol is read and judged by nothing. Signal 3's shape — a
 * tint and a dashed edge — in a neutral tint, and shared by the coupe and the strip so the two grey
 * the same metres the same way. `pointer-events-none`: a band is never a hole in the scrub surface.
 */

import type { Band } from "@/lib/chart/scene.ts";
import type { SharedX } from "@/lib/layout/contract.ts";

/** The bands over one plot, between `top` and `bottom`, SVG user units. */
export function AnchorZoneBands({
  bands,
  top,
  bottom,
  x,
}: {
  bands: readonly Band[];
  top: number;
  bottom: number;
  x: SharedX;
}) {
  return (
    <g className="pointer-events-none">
      {bands.map((band, index) => {
        // The edge a zone shares with the judged span: A's closes at `z`, B's opens at `L − z`.
        const edge = index === 0 ? band.to : band.from;
        return (
          <g key={`${band.from}-${band.to}`}>
            <rect
              className="fill-muted-foreground/15"
              height={bottom - top}
              width={Math.max(1, x.x(band.to) - x.x(band.from))}
              x={x.x(band.from)}
              y={top}
            />
            <line
              className="stroke-muted-foreground/60"
              strokeDasharray="3 3"
              x1={x.x(edge)}
              x2={x.x(edge)}
              y1={top}
              y2={bottom}
            />
          </g>
        );
      })}
    </g>
  );
}
