/**
 * The profile — « v1 build spec » § 5 (*The spine*, *Layers*, *Clearance failure*, *The Handle
 * Lane*, *Touch, pointer and keyboard*). **One SVG**, spanning the band: 28 px of badge lane,
 * `0,42 × W_inner` of plot, 24 px of handle lane, 24 px of x-axis labels.
 *
 * Hand-rolled SVG with `d3-shape` for the paths and the two hand-written affine scales from
 * `@/lib/layout/contract.ts`. No charting library: independent, **deliberately mismatched** x and z
 * scales are the whole point, and every packaged option has a documented SSR wrinkle.
 *
 * Layer rules this file keeps:
 *
 * - **Always on**: terrain, the loaded cable, both anchors, the rider with its `h_rider` envelope,
 *   the clearance dimension line, the VE badge, and the danger bands *whenever a violation exists*.
 *   The bands **self-hide**, so they are never chrome.
 * - **Exactly two toggles**: « ligne à vide » (off) and « corde A–B » (on), both from the Session.
 * - **The rider envelope stays metric** — never drawn at a minimum pixel size. At 1500 m it is
 *   ~5 px tall, and a non-metric glyph would misrepresent the one measurement the tool exists to
 *   produce. Legibility is the printed read-out's job.
 * - **Cable-red is signal 4 only** — « the rider is in the zone right now » — so « this design
 *   fails » and « you are standing in the failing zone » stay separable states.
 */

import type { PointerEvent as ReactPointerEvent } from "react";

import { area, line } from "d3-shape";

import type { ChartScene, Polyline, SceneFrame } from "@/lib/chart/scene.ts";
import type { SharedX, ZScale } from "@/lib/layout/contract.ts";
import type { LayerToggles } from "@/lib/session/session.ts";

import { cn } from "@/lib/utils.ts";

/** A path through a `(xs, zs)` polyline, in SVG user units. `null` for an empty polyline. */
function pathOf(points: Polyline, x: SharedX, z: ZScale): string | null {
  const generator = line<number>()
    .x((_, i) => x.x(points.xs[i]))
    .y((_, i) => z.y(points.zs[i]));
  return generator([...points.xs]);
}

/** Five ticks at most, and three below B1 — the labels have 24 px and no room to collide. */
function xTicks(L: number, wide: boolean): number[] {
  return wide ? [0, 0.25, 0.5, 0.75, 1].map((t) => t * L) : [0, 0.5, 1].map((t) => t * L);
}

export function Profile({
  clearance = true,
  frame,
  scene,
  x,
  z,
  plot,
  bandHeight,
  badge,
  layers,
  wide,
  onScrub,
}: {
  /**
   * May the clearance layers be drawn? A Clearance Gate breach removes **the garde and its curve
   * alone** (§ 7), which here is the dimension line, the danger bands and signal 4's cable-red —
   * every one of them computed from the anchor height or the envelope the gate has refused. The
   * cable, both anchors and the terrain carry on: that is the whole reason the gates are three.
   */
  clearance?: boolean;
  /** The input half, always drawn: terrain, both anchors, the bracket, the 5 % margin. */
  frame: SceneFrame;
  /**
   * The solved half, or `null` for § 8's « Aucun résultat » — where « les entrées se dessinent
   * toujours » and the cable, the unloaded line, the danger bands, the dimension line and the
   * rider are **absent**. The plot stays a pointer surface: only the geometric exception takes
   * that away, and it never reaches this component.
   */
  scene: ChartScene | null;
  x: SharedX;
  z: ZScale;
  /** The plot area's top edge and height, SVG user units. */
  plot: { top: number; height: number };
  /** The whole band: badge + plot + handle lane + x labels. */
  bandHeight: number;
  /** What the VE badge says about **what is drawn** — the peek included. */
  badge: { label: string; emphasised: boolean };
  layers: LayerToggles;
  /** Chart-column width ≥ B1 — the same threshold the read-out row wraps at, no new breakpoint. */
  wide: boolean;
  /** A pointer landed at this many metres; the caller snaps it to a sweep step. */
  onScrub: (metres: number) => void;
}) {
  const { ground, L, h } = frame;
  const rider = scene?.rider ?? null;
  /** Signal 4 — « the rider is in the zone **right now** ». A refused garde cannot make that claim. */
  const inViolation = clearance && (rider?.inViolation ?? false);
  const plotBottom = plot.top + plot.height;
  const laneTop = plotBottom;

  const terrain = area<number>()
    .x((_, i) => x.x(ground.xs[i]))
    .y0(plotBottom)
    .y1((_, i) => z.y(ground.zs[i]))([...ground.xs]);

  // The inverse is **a method on the scale**, never a formula retyped per call site: two pointer
  // paths retyping `(clientX − rect.left − pad) / pxPerM` is how the `domain[0] === 0` assumption
  // survived, and it is wrong by 0,05 L — 75 m at a 1500 m span.
  function scrub(event: ReactPointerEvent<SVGElement>) {
    // The SVG's own box, not the target's: the scale's inverse is defined against the chart's left
    // edge, and a grab circle's bounding box is not the chart.
    const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (rect === undefined) return;
    onScrub(x.toMetres(event.clientX, rect.left));
  }

  const drag = {
    onPointerDown(event: ReactPointerEvent<SVGElement>) {
      event.currentTarget.setPointerCapture(event.pointerId);
      scrub(event);
    },
    onPointerMove(event: ReactPointerEvent<SVGElement>) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) scrub(event);
    },
  };

  return (
    <svg
      aria-label="Profil du terrain et du câble"
      className="block h-full w-full touch-pan-y select-none"
      height={bandHeight}
      role="img"
      width={x.width}
    >
      <defs>
        {/* Everything drawn in metres is clipped to the plot area — the ×1 clamp's « câble hors
            cadre » is a *visible* cut, and the badge is what names it. */}
        <clipPath id="scoutech-plot">
          <rect height={plot.height} width={x.width} x={0} y={plot.top} />
        </clipPath>
      </defs>

      {/* The badge is chart furniture, not a footnote, and is recomputed on every render. */}
      <text
        className={cn(
          "fill-muted-foreground font-mono text-[11px]",
          badge.emphasised && "fill-foreground",
        )}
        x={x.gutter}
        y={19}
      >
        {badge.label}
      </text>

      <g clipPath="url(#scoutech-plot)">
        {terrain !== null && <path className="fill-muted stroke-border" d={terrain} />}

        {/* Signal 3 — a tint plus an edge over the **rider positions that violate**, never a
            texture over the subject: the hatched full-height band floods the chart exactly when
            legibility matters most. Above the terrain, because on a deep-slack line the ground
            fills most of the plot and a tint underneath it would answer nobody's question. */}
        {(clearance ? (scene?.violating ?? []) : []).map((band) => (
          <g key={`${band.from}-${band.to}`}>
            <rect
              className="fill-destructive/10"
              height={plot.height}
              width={Math.max(1, x.x(band.to) - x.x(band.from))}
              x={x.x(band.from)}
              y={plot.top}
            />
            <line
              className="stroke-destructive/50"
              strokeDasharray="3 3"
              x1={x.x(band.from)}
              x2={x.x(band.from)}
              y1={plot.top}
              y2={plotBottom}
            />
            <line
              className="stroke-destructive/50"
              strokeDasharray="3 3"
              x1={x.x(band.to)}
              x2={x.x(band.to)}
              y1={plot.top}
              y2={plotBottom}
            />
          </g>
        ))}

        {layers.chordAB && (
          <line
            className="stroke-muted-foreground/60"
            strokeDasharray="4 4"
            x1={x.x(0)}
            x2={x.x(L)}
            y1={z.y(0)}
            y2={z.y(h)}
          />
        )}

        {/* Everything below is the **solved** half. Under « Aucun résultat » it is absent — not
            dashed, not ghosted — while the terrain, the anchors and the bracket carry on: § 8 lists
            the five layers that go, and they are exactly these. */}
        {scene !== null && rider !== null && (
          <>
            {layers.unloadedLine && (
              <path
                className="stroke-muted-foreground/70 fill-none"
                d={pathOf(scene.unloadedCable, x, z) ?? undefined}
                strokeDasharray="5 3"
              />
            )}

            <path
              className={cn(
                "fill-none stroke-2",
                inViolation ? "stroke-destructive" : "stroke-foreground",
              )}
              d={pathOf(rider.cable, x, z) ?? undefined}
            />

            {/* The dimension line is drawn **wherever the minimum actually sits**, so it visibly
                steps sideways onto a bump the rider has already passed. A negative garde draws
                **below** the ground rather than collapsing to nothing: it is the always-on layer
                that states the magnitude of the violation, and clamping it to zero would delete it
                exactly when the other three signals fire. It is absent — never zeroed — when the
                Clearance Gate has refused the number it measures. */}
            {clearance && (
              <line
                className={cn(
                  rider.worst.hClear < 0 ? "stroke-destructive" : "stroke-muted-foreground",
                )}
                strokeDasharray="2 2"
                x1={x.x(rider.worst.atX)}
                x2={x.x(rider.worst.atX)}
                y1={z.y(groundAt(ground, rider.worst.atX))}
                y2={z.y(groundAt(ground, rider.worst.atX) + rider.worst.hClear)}
              />
            )}

            {/* The rider, and its envelope **in metres** — ~5 px tall at 1500 m, and that is
                correct. */}
            <rect
              className={cn(inViolation ? "fill-destructive/30" : "fill-foreground/15")}
              height={rider.envelope * z.pxPerM}
              width={6}
              x={x.x(rider.step.xD) - 3}
              y={z.y(rider.step.zD)}
            />
            <circle
              className={cn(inViolation ? "fill-destructive" : "fill-foreground")}
              cx={x.x(rider.step.xD)}
              cy={z.y(rider.step.zD)}
              r={4}
            />
          </>
        )}
      </g>

      {/* Both anchors: the tower from its base to its top, at the domain edges of the span. */}
      {[
        { at: 0, top: 0, base: -frame.anchors.zA },
        { at: L, top: h, base: h - frame.anchors.zB },
      ].map((anchor) => (
        <line
          className="stroke-foreground/70 stroke-2"
          key={anchor.at}
          x1={x.x(anchor.at)}
          x2={x.x(anchor.at)}
          y1={Math.max(plot.top, z.y(anchor.top))}
          y2={Math.min(plotBottom, z.y(anchor.base))}
        />
      ))}

      {/* The Handle Lane — 24 px reserved in **both** modes, so the profile's height never changes
          on import. In manual mode it draws the span bracket, non-interactive, with ticks at 0 and
          L; on import the same bracket's ends become the draggable Station handles. */}
      <g className="stroke-muted-foreground fill-muted-foreground">
        <line x1={x.x(0)} x2={x.x(L)} y1={laneTop + 12} y2={laneTop + 12} />
        {[0, L].map((at) => (
          <line key={at} x1={x.x(at)} x2={x.x(at)} y1={laneTop + 5} y2={laneTop + 19} />
        ))}
        <text className="text-[10px]" x={x.x(0) + 4} y={laneTop + 9}>
          A
        </text>
        <text className="text-[10px]" textAnchor="end" x={x.x(L) - 4} y={laneTop + 9}>
          B
        </text>
      </g>

      <g className="fill-muted-foreground text-[10px]">
        {xTicks(L, wide).map((tick, index, all) => (
          <text
            key={tick}
            textAnchor={index === 0 ? "start" : index === all.length - 1 ? "end" : "middle"}
            x={x.x(tick)}
            y={bandHeight - 8}
          >
            {`${Math.round(tick)}${index === all.length - 1 ? " m" : ""}`}
          </text>
        ))}
      </g>

      {/* The plot area is the pointer surface — a drag in x moves the rider, and a drag in y
          scrolls the page (`pan-y`) rather than doing nothing. The **handle lane is excluded**,
          because its two anchor targets are the Stations', not the rider's. */}
      <rect
        className="fill-transparent"
        {...drag}
        height={plot.height}
        width={x.width}
        x={0}
        y={plot.top}
      />

      {/* The rider's own grab target, on top: `r = 11` with a transparent **stroke**, 36 px on a
          fine pointer and 44 px under `@media (pointer: coarse)`. Stroke width rather than the
          SVG2 geometry property `r`, whose CSS support is uneven — one media query, no JS branch. */}
      {rider !== null && (
        <circle
          className="chart-grab cursor-grab"
          {...drag}
          cx={x.x(rider.step.xD)}
          cy={z.y(rider.step.zD)}
          r={11}
        />
      )}
    </svg>
  );
}

/** The drawn ground's altitude at `x`, by the same linear interpolation `zGroundAt` uses. */
function groundAt(ground: Polyline, at: number): number {
  const { xs, zs } = ground;
  if (at <= xs[0]) return zs[0];
  const last = xs.length - 1;
  if (at >= xs[last]) return zs[last];
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= at) lo = mid;
    else hi = mid;
  }
  return zs[lo] + ((at - xs[lo]) / (xs[hi] - xs[lo])) * (zs[hi] - zs[lo]);
}
