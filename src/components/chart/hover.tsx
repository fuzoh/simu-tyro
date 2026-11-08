/**
 * What the hover draws on a chart, shared by every coupe and curve (#92, #99): the vertical rule
 * under the pointer and the lines read beside it. Both are `pointer-events-none`, so neither is ever
 * a hole in the surface that reads.
 */

import type { HoverLine } from "@/lib/chart/hover.ts";

/** The rule at an abscissa, over the plot's height. */
export function HoverRule({ at, top, bottom }: { at: number; top: number; bottom: number }) {
  return (
    <line
      className="stroke-foreground/40 pointer-events-none"
      x1={at}
      x2={at}
      y1={top}
      y2={bottom}
    />
  );
}

/** The tip's rough width, SVG user units — enough to decide which side of the rule it goes. */
const TIP_WIDTH = 240;

/**
 * The hover's lines, beside the rule and above the plot's bottom edge, flipped left near the right
 * edge.
 */
export function HoverTip({
  at,
  bottom,
  lines,
  top,
  width,
}: {
  at: number;
  bottom: number;
  lines: readonly HoverLine[];
  top: number;
  width: number;
}) {
  const left = at + 8 + TIP_WIDTH > width;
  const tx = left ? at - 8 : at + 8;
  // Anchored to the bottom edge, but never above the plot: a long tip runs down past it instead.
  const first = Math.max(top + 10, bottom - 6 - 13 * (lines.length - 1));
  return (
    <text
      className="fill-foreground stroke-background pointer-events-none text-[11px]"
      paintOrder="stroke"
      strokeLinejoin="round"
      strokeWidth={5}
      textAnchor={left ? "end" : "start"}
    >
      {lines.map((one, index) => (
        <tspan key={one.label} x={tx} y={first + 13 * index}>
          <tspan className="fill-muted-foreground">{one.label}</tspan>
          {one.value !== "" && <tspan className="font-mono"> {one.value}</tspan>}
        </tspan>
      ))}
    </text>
  );
}
