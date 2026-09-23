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
 * - **Two clearance dimensions, and the second one self-hides too.** The governing dimension is
 *   drawn at §11's minimum wherever it sits; the passenger's own garde is drawn at `x_D`, and **only
 *   while `relabel` says the two are further apart than `max(1 m, 1 % de la portée)`** (ticket 41).
 *   This plot is where that second quantity belongs: it has a z scale, the ground and the passenger,
 *   and the strip's y axis measurably cannot hold both — voir `scene.ts`.
 * - **Four toggles**, all from the Session: « ligne à vide » (off) and « corde A–B » (on) are § 5's;
 *   « trajectoire » (off) — the load's path over the whole traverse, dotted — and « distances » (on)
 *   — the passenger's garde and the gap to the unloaded line, printed beside the handle and moving
 *   with it — were added on 2026-09-23.
 * - **The rider envelope stays metric** — never drawn at a minimum pixel size. At 1500 m it is
 *   ~5 px tall, and a non-metric glyph would misrepresent the one measurement the tool exists to
 *   produce. Legibility is the printed read-out's job.
 * - **Cable-red is signal 4 only** — « the rider is in the zone right now » — so « this design
 *   fails » and « you are standing in the failing zone » stay separable states.
 */

import type { PointerEvent as ReactPointerEvent } from "react";

import { area, line } from "d3-shape";

import type { ChartScene, Polyline, SceneFrame, SceneRider } from "@/lib/chart/scene.ts";
import type { SharedX, ZScale } from "@/lib/layout/contract.ts";
import type { LayerToggles } from "@/lib/session/session.ts";

import { polylineAt } from "@/lib/chart/scene.ts";
import { formatQuantity } from "@/lib/format/quantity.ts";
import { anchorTarget } from "@/lib/layout/contract.ts";
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
  onStation,
}: {
  /**
   * May the clearance layers be drawn? A Clearance Gate breach removes **the garde and its curve
   * alone** (§ 7), which here is **both** dimension lines, the danger bands and signal 4's cable-red
   * — every one of them computed from the anchor height or the envelope the gate has refused. The
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
  /**
   * § 4's **two draggable Station handles**, in the Handle Lane. `undefined` is manual mode, where
   * the same bracket is the non-interactive span marker — that is the one thing that makes these two
   * targets inert, and it is why the callback rather than a `mode` flag is the switch.
   *
   * The position is in the **span frame**, like `onScrub`'s: the caller holds `s_A` and is the one
   * that can turn it into a station, snap it to a terrain sample and clamp it to the trace.
   */
  onStation?: (anchor: "A" | "B", metres: number) => void;
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

  /**
   * One clearance dimension's endpoints — « **from the drawn ground at `atX`, up by the value** ».
   *
   * Both dimension lines go through it, so the convention cannot drift between them — which is
   * ticket 41's own theme one level down: a garde is a length, and the drawn length has to *be* the
   * number rather than be re-derived from the cable's pixels. A negative garde therefore draws
   * **below** the ground, never clamped, in both of them.
   *
   * The drawn ground and the engine's `Terrain` are the same data inside `[0, L]` (`scene.ts` holds
   * the ends exactly as `zGroundAt` does), so reading `polylineAt` here does not make the drawn length
   * disagree with the number `scene.ts` computed.
   *
   * **The length is exact; the `x` it stands at is not.** `worst.atX` is a scanned extremum's
   * position, so the sibling line above stands on a scan vertex rather than on the true argmin: ≤
   * 1,26 m off on the shipped line, and the garde at that x is within 1,5 mm of the true minimum
   * (ticket 39 item 5, measured against a ten-times-finer scan; voir `SceneRider.worst`). The
   * dimension is therefore truthful where it stands — that x really does carry that garde — and only
   * its placement carries the scan's resolution. What a scrub *sees* is larger and is not this: the
   * line can jump 2,53 m of `x` between consecutive steps, with 0,1 m of garde between them, because
   * the governing point steps from the rider's own kink to a fixed feature of the line. The
   * passenger's own dimension at `x_D` carries none of it: `x_D` is exact.
   */
  function dimension(atX: number, hClear: number) {
    const base = polylineAt(ground, atX);
    const at = x.x(atX);
    return { x1: at, x2: at, y1: z.y(base), y2: z.y(base + hClear) };
  }

  /**
   * One Station handle's drag. **The press only takes the pointer** — unlike the rider's, which
   * moves on `pointerdown`: a 44 px target is up to 22 px wide of the anchor it holds, which is 26 m
   * at a 1500 m span, so a tap that jumped the station there would move an anchor nobody dragged.
   */
  function dragStation(anchor: "A" | "B") {
    function move(event: ReactPointerEvent<SVGElement>) {
      // The SVG's own box, for the same reason `scrub` reads it: the inverse is defined against the
      // chart's left edge, and a 44 px target's box is not the chart.
      const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
      if (rect === undefined) return;
      onStation?.(anchor, x.toMetres(event.clientX, rect.left));
    }
    return {
      onPointerDown(event: ReactPointerEvent<SVGElement>) {
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove(event: ReactPointerEvent<SVGElement>) {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) move(event);
      },
    };
  }

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

            {/* « Trajectoire » — the load's own path over the whole traverse, **dotted** so it can
                never be read as a cable: the loaded line touches it at exactly one point, the
                rider's node. Under the cable, which is the subject. One path per run, because an
                `Indéterminé` gap is a position nobody computed. */}
            {layers.trajectory &&
              scene.trajectory.map((run) => (
                <path
                  className="stroke-foreground/60 fill-none"
                  d={pathOf(run, x, z) ?? undefined}
                  key={run.xs[0]}
                  strokeDasharray="0 4"
                  strokeLinecap="round"
                  strokeWidth={1.5}
                />
              ))}

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
                {...dimension(rider.worst.atX, rider.worst.hClear)}
              />
            )}

            {/* **The passenger's own garde** — ticket 41. The reported symptom was that the strip's
                curve *rises* while the passenger visibly descends toward the ground; it is right —
                the curve is §11's minimum over the whole line, and a rider near an anchor lifts
                mid-span — but the app drew that second quantity nowhere, so the reader was computing
                it by eye off this plot and reading the answer off a curve that does not carry it.
                `SceneRider`'s `underRider` carries it now, dimensioned the same way its sibling above
                is: from the drawn ground up by the value, so the drawn length **is** the number and
                neither line re-derives a garde from pixels.

                Gated on `relabel`, the bit that already relabels the cell « Garde min. ligne (à x
                49 m) »: inside `max(1 m, 1 % de la portée)` the two dimensions coincide and a second
                stroke 0,3 m away reads as a drawing fault, so the drawing and the label fire
                together.

                **Never red on its own account**, and § 5's four coordinated signals gain no fifth
                member here: `underRider` is one candidate in `worst.hClear`'s own minimum, so a
                negative garde under the rider means a negative `worst.hClear`, and signal 4 has
                already turned the cable and the rider red. That used to hold *in exact arithmetic
                only* — the shipped scan could report `worst.hClear` up to 99 mm above `underRider`,
                the kink its grid never landed on, leaving a sub-decimetre window where this line
                dipped below the ground while the cable was still black. Ticket 37 closed it: the
                excess is **exactly 0** over all 260 steps of six scenarios (ticket 39 item 5), so the
                window is gone and the rule is the arithmetic again. Colouring this line would still
                mint a signal § 5 did not.

                **No leader between the two, and that is measured rather than a taste** (browser
                evidence, this ticket): both dimensions' tops sit on *one* curve — the cable offset
                down by `h_rider` — because `worst.hClear` is `z_cable(atX) − z_ground − h_rider` and
                `underRider` is the same three terms at `x_D`. Any straight connector between them is
                therefore a **chord of the cable**, and it measured **7,63 px** from the `stroke-2`
                cable at the reference column with the rider at an anchor — ≈2,4 px once the plot
                scales to 390 px, which is a dotted line shadowing the subject. The two dimensions
                standing at two `x`s, plus the cell's own « (à x 74,3 m) », are the two channels that
                say the number is not under the passenger. */}
            {clearance && rider.relabel && (
              <line
                className="stroke-muted-foreground/60"
                strokeDasharray="1 3"
                {...dimension(rider.step.xD, rider.underRider)}
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

      {/* « distances » — outside the clip, so a rider near the frame's top keeps its numbers. */}
      {layers.riderTip && rider !== null && (
        <RiderTip
          clearance={clearance}
          plot={plot}
          rider={rider}
          wide={wide}
          width={x.width}
          x={x.x(rider.step.xD)}
          y={z.y(rider.step.zD)}
        />
      )}

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

      {/* § 5's anchor targets — **44 × 48, spanning the lane plus the label band, entirely below the
          plot area**. The collision they retire is structural rather than a sizing accident: the
          anchors are pinned at the domain edges, so at 390 px a 44 px target covers the first and
          last 12 % of the span and the rider glyph overlaps one whenever `x_D` comes within ~46 m of
          an anchor at `L = 1000`. You cannot size your way out of two targets that are always at
          `x = 0` and `x = L` — putting them in a lane of their own makes confusing one with the
          rider *geometrically* impossible.

          They are `pointer-events-none` **in manual mode only**, because there § 5's bracket is the
          non-interactive span marker. In imported mode they are § 4's « deux poignées », which the
          section states in the same breath as the four fields and which it explicitly rejects doing
          without: pointer input snaps to a terrain sample, a typed station stays exact. */}
      {[0, L].map((at) => {
        const anchor = at === 0 ? "A" : "B";
        return (
          <rect
            className={cn(
              "fill-transparent",
              onStation === undefined ? "pointer-events-none" : "cursor-grab",
            )}
            data-anchor={anchor}
            key={at}
            {...(onStation === undefined ? {} : dragStation(anchor))}
            {...anchorTarget(x.x(at), laneTop)}
          />
        );
      })}

      {/* The tick labels are furniture, and two of them sit **inside** the anchor targets' 48 px —
          the lane's 24 px plus this band's. Left hit-testable they would punch a hole in a target
          § 5 sized on purpose. */}
      <g className="fill-muted-foreground pointer-events-none text-[10px]">
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

/** The tip's rough width, SVG user units — enough to decide which side of the handle it goes. */
const TIP_WIDTH = { wide: 150, narrow: 96 } as const;

/**
 * « distances » — the two numbers **beside the handle**, moving with it: the passenger's garde (the
 * « Garde passager » cell) and the load's gap to the unloaded line (« Écart à vide »). Labels in the
 * app's sans and values in mono, the call-site rule the read-out cells keep.
 *
 * Right of the handle and above it, flipped left near the right edge and below near the frame's
 * top, so the tip never covers the handle it annotates. The garde line goes with the Clearance
 * Gate, exactly as the cell does: it is computed from the anchor heights and envelope the gate
 * refused. `pointer-events-none`, so the tip is never a hole in the scrub surface.
 */
function RiderTip({
  rider,
  clearance,
  x,
  y,
  width,
  plot,
  wide,
}: {
  rider: SceneRider;
  clearance: boolean;
  /** The handle's centre, SVG user units. */
  x: number;
  y: number;
  /** The SVG's width. */
  width: number;
  plot: { top: number; height: number };
  wide: boolean;
}) {
  const left = x + 14 + (wide ? TIP_WIDTH.wide : TIP_WIDTH.narrow) > width;
  const below = y - 30 < plot.top;
  const tx = left ? x - 14 : x + 14;
  const lines = [
    ...(clearance
      ? [
          {
            label: wide ? "garde passager" : "garde",
            value: formatQuantity("clearance", rider.underRider),
          },
        ]
      : []),
    {
      label: wide ? "écart à vide" : "à vide",
      value: formatQuantity("unloadedGap", rider.belowUnloaded),
    },
  ];
  const first = below ? y + 20 : y - 8 - 13 * (lines.length - 1);
  return (
    <text
      className="fill-foreground stroke-background pointer-events-none text-[11px]"
      paintOrder="stroke"
      strokeLinejoin="round"
      strokeWidth={3}
      textAnchor={left ? "end" : "start"}
    >
      {lines.map((line, index) => (
        <tspan key={line.label} x={tx} y={first + 13 * index}>
          <tspan className="fill-muted-foreground">{line.label} </tspan>
          <tspan className="font-mono">{line.value}</tspan>
        </tspan>
      ))}
    </text>
  );
}
