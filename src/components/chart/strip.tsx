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
 *   exists. Its axes are {@link clearanceDomain}'s reference domain there, not a collapsed `[0, 0]`.
 * - **Gaps are drawn as an explicit discontinuity.** Under `Indéterminé` the steps that failed are
 *   holes in the curve — `line.defined()` over the sweep **grid**, not over the solved steps — and
 *   pointer input cannot land in one because it snaps to a solved step.
 * - **The y domain is quantised and always reserves a negative band** — {@link clearanceDomain},
 *   ticket 39. Zero is nailed to a constant pixel per tick grid so a first violation cannot present
 *   a *scale* change as a *data* change, and the band below zero stays blank until something enters
 *   it. Do not "simplify" this back to `min`/`max` of the data.
 */

import type { PointerEvent as ReactPointerEvent } from "react";

import { area, line } from "d3-shape";

import type { ChartScene, SceneFrame } from "@/lib/chart/scene.ts";
import type { SharedX } from "@/lib/layout/contract.ts";

import { clearanceDomain, clearanceTickLabel } from "@/lib/layout/contract.ts";

/** One point of the curve: a rider position and its worst clearance, or a hole where a step failed. */
type Sample = { x: number; y: number | null };

/**
 * The curve, over the **grid** rather than over the solved steps. `sweep` copies each grid value
 * into its step verbatim, so the two match exactly and a failed step is a `null` — the hole the
 * discontinuity draws.
 *
 * A hole has no `x_D` of its own, and the two frames are **not** proportional: `s` is arc length
 * along the cable and `x` is horizontal, so `(s / L₀) × L` misplaces a mid-span hole by ≈1,1 m on the
 * first-run line (`L₀` 151,644 against `L` 150) and further on a slack one. So a hole's x is
 * **interpolated between its two nearest solved neighbours' `x_D`** — monotone by construction,
 * since `x_D` increases with `s` — and falls back to the arc fraction only at a run of holes that
 * reaches an end of the grid, where there is no neighbour on one side. Ticket 39, item 6.
 */
function samples(scene: ChartScene): Sample[] {
  const { grid, steps } = scene.traverse;
  const solved: { s: number; x: number }[] = [];
  const out: { s: number; x: number | null; y: number | null }[] = [];
  let next = 0;
  for (let i = 0; i < grid.length; i++) {
    const step = steps[next];
    if (step !== undefined && step.sD === grid[i]) {
      out.push({ s: grid[i], x: step.xD, y: scene.clearance.perStep[next] });
      solved.push({ s: grid[i], x: step.xD });
      next++;
    } else {
      out.push({ s: grid[i], x: null, y: null });
    }
  }

  // One forward walk: `at` is the first solved neighbour at or after the hole, `before` the last one
  // at or before it. Both present ⇒ interpolate; one missing ⇒ the grid runs off an end.
  let at = 0;
  return out.map((point) => {
    if (point.x !== null) return { x: point.x, y: point.y };
    while (at < solved.length && solved[at].s < point.s) at++;
    const after = solved[at];
    const before = at > 0 ? solved[at - 1] : undefined;
    if (before !== undefined && after !== undefined) {
      const t = (point.s - before.s) / (after.s - before.s);
      return { x: before.x + t * (after.x - before.x), y: null };
    }
    return { x: (point.s / scene.span.L0) * scene.L, y: null };
  });
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
  const domain = clearanceDomain({ values, wide });
  const y = (metres: number) =>
    bottom - ((metres - domain.floor) / (domain.top - domain.floor)) * (bottom - top);
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

      {/* Zero is the threshold this whole chart exists to show a crossing of, so it is drawn in
          `foreground` rather than in `border` — the token for gridlines that mean nothing — at a
          hairline, which keeps it visually under the `stroke-2` curve. */}
      <line className="stroke-foreground" x1={x.x(0)} x2={x.x(frame.L)} y1={zero} y2={zero} />
      <text
        className="fill-muted-foreground text-[9px]"
        textAnchor="end"
        x={x.gutter - 4}
        y={zero - 2}
      >
        0
      </text>
      {/* The grid's ticks, right-aligned **inside** the gutter — the previous labels ran on the
          implicit `start` anchor from x = 18 and overlaid the first metres of the curve. Round
          labels are ≤ 20 px at 9 px, so 24 px of gutter now holds them; `profile.tsx` sets its own
          anchor at every tick for the same reason. A tick that would collide with the zero label is
          dropped rather than drawn twice. */}
      {domain.ticks
        .filter((tick) => Math.abs(y(tick) - zero) > 8)
        .map((tick, index) => (
          <text
            className="fill-muted-foreground text-[9px]"
            key={tick}
            textAnchor="end"
            x={x.gutter - 4}
            y={y(tick) + 3}
          >
            {clearanceTickLabel(tick, index === 0)}
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
