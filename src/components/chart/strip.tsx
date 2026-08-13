/**
 * The clearance strip — « v1 build spec » § 5 (*The spine*, *The rider moves three ways*,
 * *Clearance failure*, *The layout contract*). Garde au sol against **rider position**, and it
 * **is** the scrub track.
 *
 * That double duty is the deciding argument for the whole Chart Block's shape: **a zero crossing is
 * categorical**, while a tinted band on a vertically distorted profile is a judgement call. It is
 * also why **no `<input type="range">` exists anywhere in the app** — a rail slider maps to nothing
 * spatially, and this axis *already is* rider position.
 *
 * Two rules that outlive any redesign of it:
 *
 * - **It never stops being a pointer surface.** When the Clearance Gate fails the strip keeps its
 *   axes and stays a scrub track, `x` mapping to rider position whether or not clearance data
 *   exists.
 * - **Gaps are drawn as an explicit discontinuity.** Under `Indéterminé` the steps that failed are
 *   holes in the curve — `line.defined()` over the sweep **grid**, not over the solved steps — and
 *   pointer input cannot land in one because it snaps to a solved step.
 */

import type { PointerEvent as ReactPointerEvent } from "react";

import { area, line } from "d3-shape";

import type { ChartScene, SceneFrame } from "@/lib/chart/scene.ts";
import type { SharedX } from "@/lib/layout/contract.ts";

import { formatValue } from "@/lib/format/quantity.ts";

/** One point of the curve: a rider position and its worst clearance, or a hole where a step failed. */
type Sample = { x: number; y: number | null };

/**
 * The curve, over the **grid** rather than over the solved steps. `sweep` copies each grid value
 * into its step verbatim, so the two match exactly and a failed step is a `null` — the hole the
 * discontinuity draws.
 */
function samples(scene: ChartScene): Sample[] {
  const { grid, steps } = scene.traverse;
  const out: Sample[] = [];
  let next = 0;
  for (let i = 0; i < grid.length; i++) {
    const step = steps[next];
    if (step !== undefined && step.sD === grid[i]) {
      out.push({ x: step.xD, y: scene.clearance.perStep[next] });
      next++;
    } else {
      // `x_D` is unknown for a step that never solved, so the hole is placed by interpolation on
      // the span — it carries no value and is never read, only skipped.
      out.push({ x: (grid[i] / scene.span.L0) * scene.L, y: null });
    }
  }
  return out;
}

export function ClearanceStrip({
  clearance = true,
  frame,
  scene,
  x,
  height,
  wide,
  onScrub,
}: {
  /**
   * May the curve be drawn? A Clearance Gate breach removes **the garde and its curve** — and
   * nothing else here: « When the Clearance Gate fails the strip keeps its axes and stays a scrub
   * track », because `x` maps to rider position whether or not clearance data exists.
   */
  clearance?: boolean;
  /** The input half — the span the axis is drawn over, and the only thing the axes need. */
  frame: SceneFrame;
  /**
   * The solved half, or `null` under « Aucun résultat »: the curve, the deficit fill and the rider
   * marker go, **the axes and the pointer surface stay**. « It never stops being a pointer surface »
   * is this component's own rule, and the one exception — the geometric one — never reaches here.
   */
  scene: ChartScene | null;
  x: SharedX;
  /** `clamp(0,16 × W_inner, 96, 200)` — and the whole SVG is the hit surface. */
  height: number;
  /** Chart-column width ≥ B1: the caption shortens at the same threshold, so no new breakpoint. */
  wide: boolean;
  onScrub: (metres: number) => void;
}) {
  const points = scene === null || !clearance ? [] : samples(scene);
  const values = points.filter((point) => point.y !== null).map((point) => point.y as number);

  const top = 20;
  const bottom = height - 10;
  const hi = Math.max(0, ...values);
  const lo = Math.min(0, ...values);
  const span = hi - lo || 1;
  const y = (metres: number) => bottom - ((metres - lo) / span) * (bottom - top);
  const zero = y(0);

  const curve = line<Sample>()
    .defined((point) => point.y !== null)
    .x((point) => x.x(point.x))
    .y((point) => y(point.y ?? 0))(points);

  // Signal 2 — red fill below zero: « de combien, et où sur la traversée ? ».
  const deficit = area<Sample>()
    .defined((point) => point.y !== null && point.y < 0)
    .x((point) => x.x(point.x))
    .y0(zero)
    .y1((point) => y(point.y ?? 0))(points);

  function scrub(event: ReactPointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    onScrub(x.toMetres(event.clientX, rect.left));
  }

  return (
    <svg
      aria-label="Garde au sol selon la position du passager"
      className="block h-full w-full touch-pan-y select-none"
      height={height}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        scrub(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) scrub(event);
      }}
      role="img"
      width={x.width}
    >
      <text className="fill-muted-foreground text-[10px]" x={x.gutter} y={12}>
        {wide
          ? "Garde au sol (m) selon la position du passager — glisser pour déplacer"
          : "Garde au sol (m) — glisser"}
      </text>

      {/* Zero is the line that matters, so it is drawn like one and labelled 6 px inside the pad. */}
      <line className="stroke-border" x1={x.x(0)} x2={x.x(frame.L)} y1={zero} y2={zero} />
      <text className="fill-muted-foreground text-[9px]" x={x.gutter - 6} y={zero - 2}>
        0
      </text>
      {/* Two clearance ticks at narrow, three when there is room — at the **same** B1 threshold,
          so the strip needs no breakpoint of its own. A tick that would sit on the zero line is
          dropped rather than drawn twice. */}
      {(wide ? [hi, (hi + lo) / 2, lo] : [hi, lo])
        .filter((tick) => Math.abs(y(tick) - zero) > 8)
        .map((tick) => (
          <text
            className="fill-muted-foreground text-[9px]"
            key={tick}
            x={x.gutter - 6}
            y={y(tick) + 3}
          >
            {formatValue("clearance", tick)}
          </text>
        ))}

      {deficit !== null && <path className="fill-destructive/25" d={deficit} />}
      {curve !== null && <path className="stroke-foreground fill-none stroke-2" d={curve} />}

      {/* The rider's own position on its own axis — the one marker this chart needs. Absent with
          the rest of the solved half, while the track it sits on stays live. */}
      {scene !== null && (
        <line
          className={
            clearance && scene.rider.inViolation ? "stroke-destructive" : "stroke-foreground"
          }
          x1={x.x(scene.rider.step.xD)}
          x2={x.x(scene.rider.step.xD)}
          y1={top - 6}
          y2={bottom}
        />
      )}
    </svg>
  );
}
