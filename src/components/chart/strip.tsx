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
 * **What the curve is** — ticket 41, reversed on the user's decision of 2026-09-23. `y` is « garde
 * sous le passager », `z_D − z_ground(x_D) − h_rider`, the metres between the passenger's feet and
 * the ground **at the passenger's own position**; `x` is that position. This is the quantity the
 * reader computes by eye off the profile, and it is the same arithmetic as
 * {@link SceneRider.underRider}, evaluated at every solved step instead of at the current one.
 * Negative means the passenger is *in* the ground, which is impossible, so **only the negative parts
 * are drawn red** — stroke and fill — and the curve is `foreground` everywhere else.
 *
 * **What it is not, and what still shows.** §11's criterion is the inner minimum **over the whole
 * line**, `min over x of h_clear(x; x_P)`, and `underRider ≥ worst.hClear` by construction. So the
 * cable can touch a ridge away from the passenger while this curve stays positive. That case is not
 * hidden: the envelope's **negative** parts alone are still filled in a fainter red beneath the
 * curve — its positive parts are not drawn, because ticket 41 measured that sharing one linear axis
 * with the envelope flattens the crossing to 0,2 px on an imported profile. The read-out cell and
 * §10's verdict keep judging the envelope, as before.
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

import { axisLabel, clearanceDomain, clearanceTickLabel } from "@/lib/layout/contract.ts";
import { zGroundAt } from "@/lib/sim";
import { heading } from "@/lib/vocabulary/labels.ts";

/**
 * One point of the curve: a rider position, the garde **under the rider** there (`y`), and the
 * line's envelope minimum at that same step (`envelope`) — or a hole where a step failed.
 */
type Sample = { x: number; y: number | null; envelope: number | null };

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
function samples(frame: SceneFrame, scene: ChartScene): Sample[] {
  const { grid, steps } = scene.traverse;
  const solved: { s: number; x: number }[] = [];
  const out: { s: number; x: number | null; y: number | null; envelope: number | null }[] = [];
  let next = 0;
  for (let i = 0; i < grid.length; i++) {
    const step = steps[next];
    if (step !== undefined && step.sD === grid[i]) {
      out.push({
        s: grid[i],
        x: step.xD,
        // `scene.ts`'s `underRider`, at every step: `z_D` is exact (the trolley sits on the kink), so
        // this curve carries no scan error at all.
        y: step.zD - zGroundAt(frame.terrain, step.xD) - scene.hRider,
        envelope: scene.clearance.perStep[next],
      });
      solved.push({ s: grid[i], x: step.xD });
      next++;
    } else {
      out.push({ s: grid[i], x: null, y: null, envelope: null });
    }
  }

  // One forward walk: `at` is the first solved neighbour at or after the hole, `before` the last one
  // at or before it. Both present ⇒ interpolate; one missing ⇒ the grid runs off an end.
  let at = 0;
  return out.map((point) => {
    if (point.x !== null) return { x: point.x, y: point.y, envelope: point.envelope };
    while (at < solved.length && solved[at].s < point.s) at++;
    const after = solved[at];
    const before = at > 0 ? solved[at - 1] : undefined;
    if (before !== undefined && after !== undefined) {
      const t = (point.s - before.s) / (after.s - before.s);
      return { x: before.x + t * (after.x - before.x), y: null, envelope: null };
    }
    return { x: (point.s / scene.span.L0) * scene.L, y: null, envelope: null };
  });
}

/**
 * The curve with a point inserted at every zero crossing of `y`, so the red and the `foreground`
 * strokes meet exactly on the zero line instead of stopping one sample short of it. A hole on
 * either side is not a crossing.
 */
function withZeroCrossings(points: Sample[]): Sample[] {
  const out: Sample[] = [];
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const previous = points[i - 1];
    if (
      previous !== undefined &&
      previous.y !== null &&
      point.y !== null &&
      previous.y < 0 !== point.y < 0 &&
      previous.y !== 0 &&
      point.y !== 0
    ) {
      const t = previous.y / (previous.y - point.y);
      out.push({ x: previous.x + t * (point.x - previous.x), y: 0, envelope: null });
    }
    out.push(point);
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
  /** Absent on the Page Terrain (#101): the strip is read, and its caption asks for no drag. */
  onScrub?: (metres: number) => void;
}) {
  const points = scene === null || !clearance ? [] : withZeroCrossings(samples(frame, scene));
  // The y domain is sized on the curve, plus the envelope's **negative** side only — that fill must
  // fit, and its positive side is exactly what ticket 41 measured must not share this axis.
  const values = points.flatMap((point) => [
    ...(point.y !== null ? [point.y] : []),
    ...(point.envelope !== null && point.envelope < 0 ? [point.envelope] : []),
  ]);

  const top = 20;
  const bottom = height - 10;
  const domain = clearanceDomain({ values, wide });
  const y = (metres: number) =>
    bottom - ((metres - domain.floor) / (domain.top - domain.floor)) * (bottom - top);
  const zero = y(0);
  const axis = axisLabel(x, "left");

  // Two strokes over one point set, split at zero: `foreground` where the passenger is above the
  // ground, `destructive` where they are in it. The inserted crossings belong to both, so the two
  // meet on the zero line.
  const above = line<Sample>()
    .defined((point) => point.y !== null && point.y >= 0)
    .x((point) => x.x(point.x))
    .y((point) => y(point.y ?? 0))(points);
  const below = line<Sample>()
    .defined((point) => point.y !== null && point.y <= 0)
    .x((point) => x.x(point.x))
    .y((point) => y(point.y ?? 0))(points);

  // Signal 2 — red fill below zero: « de combien, et où sur la traversée ? ».
  const deficit = area<Sample>()
    .defined((point) => point.y !== null && point.y <= 0)
    .x((point) => x.x(point.x))
    .y0(zero)
    .y1((point) => y(point.y ?? 0))(points);

  // The envelope's own negative parts — a cable-ground contact away from the passenger — in a
  // fainter red, so the verdict's failure never disappears from this chart. Voir the docblock.
  const envelopeDeficit = area<Sample>()
    .defined((point) => point.envelope !== null && point.envelope < 0)
    .x((point) => x.x(point.x))
    .y0(zero)
    .y1((point) => y(point.envelope ?? 0))(points);

  function scrub(event: ReactPointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    onScrub?.(x.toMetres(event.clientX, rect.left));
  }

  return (
    <svg
      aria-label="Garde au sol sous le passager selon sa position"
      className="block h-full w-full touch-pan-y select-none"
      height={height}
      onPointerDown={
        onScrub &&
        ((event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          scrub(event);
        })
      }
      onPointerMove={
        onScrub &&
        ((event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) scrub(event);
        })
      }
      role="img"
      width={x.width}
    >
      <text className="fill-muted-foreground text-[10px]" x={x.gutter} y={12}>
        {/* The caption names the quantity's scope at every width — « position du passager » wide,
            « passager » narrow — because the previous curve was the line's envelope and was read
            as this one (ticket 41). */}
        {heading("groundClearance", "terrain")}
        {wide ? " (m) selon la position du passager" : ", passager (m)"}
        {onScrub !== undefined && (wide ? " — glisser pour déplacer" : " — glisser")}
      </text>

      {/* Zero is the threshold this whole chart exists to show a crossing of, so it is drawn in
          `foreground` rather than in `border` — the token for gridlines that mean nothing — at a
          hairline, which keeps it visually under the `stroke-2` curve. */}
      <line className="stroke-foreground" x1={x.x(0)} x2={x.x(frame.L)} y1={zero} y2={zero} />
      {/* The y axis' labels stand **inside** the plot, from its left edge (#115): the 12 px gutter
          is the containers' margin and holds no label, and a label right-aligned in it would be cut
          by the SVG's edge. They sit over the curve's first metres, so each is drawn on a halo of
          the background, as the rider's tip is. A tick that would collide with the zero label is
          dropped rather than drawn twice. */}
      <g
        className="fill-muted-foreground stroke-background pointer-events-none text-[9px]"
        paintOrder="stroke"
        strokeLinejoin="round"
        strokeWidth={3}
        textAnchor={axis.anchor}
      >
        <text x={axis.x} y={zero - 2}>
          0
        </text>
        {domain.ticks
          .filter((tick) => Math.abs(y(tick) - zero) > 8)
          .map((tick, index) => (
            <text key={tick} x={axis.x} y={y(tick) + 3}>
              {clearanceTickLabel(tick, index === 0)}
            </text>
          ))}
      </g>

      {envelopeDeficit !== null && <path className="fill-destructive/10" d={envelopeDeficit} />}
      {deficit !== null && <path className="fill-destructive/25" d={deficit} />}
      {above !== null && <path className="stroke-foreground fill-none stroke-2" d={above} />}
      {below !== null && <path className="stroke-destructive fill-none stroke-2" d={below} />}

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
