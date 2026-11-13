/**
 * Avancé's tension graph (#119): the internal tension along the line at the passager's current
 * position — the ligne à vide dashed, the ligne chargée solid, as on the coupe — against the
 * distance from A, at the foot of the Page. Hand-rolled SVG over `@/lib/chart/tension.ts`, which has
 * decided every number: this file places them.
 *
 * - **The coupe's own x scale.** `createSharedX` over the same width, span and extent, so from B2 —
 *   where the graph stands in the Chart Block's box, under the read-out cells — a column of the graph
 *   is the same column of the coupe above it.
 * - **Nothing drawn from a state that is not there.** No width yet: the box alone. No span: § 8's
 *   own line. No solved half: the cause sentence, never a curve. A loaded line that does not solve at
 *   this position: the unloaded curve alone, and the legend says the loaded one is unavailable.
 *   « Saisie en cours » freezes the graph with the rest of the output half and says what it
 *   corresponds to, in the very sentence the banner prints.
 * - **It scales, it does not reflow.** Below B2 it closes the Rail's run, whose scroller may be a
 *   classic scrollbar narrower than the Chart Block it is measured from; the SVG's `viewBox` takes
 *   that up and the pointer's inverse divides it back out.
 */

import type { PointerEvent as ReactPointerEvent } from "react";

import { line } from "d3-shape";
import { useMemo } from "react";

import type { SceneBase, SceneFrame } from "@/lib/chart/scene.ts";
import type { PxPoint, TensionProfile } from "@/lib/chart/tension.ts";
import type { ForceUnit } from "@/lib/scenario/types.ts";

import { useAppState } from "@/components/app/store.tsx";
import { HoverRule, HoverTip } from "@/components/chart/hover.tsx";
import { xTicks } from "@/components/chart/profile.tsx";
import { useHover } from "@/components/chart/use-hover.ts";
import { NO_SPAN_LINE, TENSION_COPY } from "@/lib/chart/copy.ts";
import { RIDER_REACH_PX } from "@/lib/chart/hover.ts";
import { tensionLines, tensionProfile, tensionScene } from "@/lib/chart/tension.ts";
import { formatAtX, formatQuantity, unitLabel } from "@/lib/format/quantity.ts";
import {
  axisLabel,
  CELL_WRAP_PX,
  createSharedX,
  innerWidth,
  TENSION_CHART,
  tensionChartHeight,
} from "@/lib/layout/contract.ts";
import { label } from "@/lib/vocabulary/labels.ts";

const stroke = line<PxPoint>()
  .x((point) => point[0])
  .y((point) => point[1]);

function pathOf(points: readonly PxPoint[]): string | undefined {
  return stroke([...points]) ?? undefined;
}

/**
 * @param frame the input half — `null` for § 8's *exception géométrique*.
 * @param solved the solved half **as the gates leave it** — `null` for « Aucun résultat ».
 * @param cause the cause sentence the read-out row echoes when `solved` is `null`.
 * @param saisie « Saisie en cours »'s sentence, or `null`.
 * @param width the Chart Block's inline size — the app's single `ResizeObserver`'s.
 */
export function TensionChart({
  cause,
  frame,
  saisie,
  solved,
  width,
}: {
  cause: string | null;
  frame: SceneFrame | null;
  saisie: string | null;
  solved: SceneBase | null;
  width: number | null;
}) {
  const { scenario } = useAppState();
  const xD = scenario.rider.xD;
  const unit = scenario.unit;
  // The passager's exact solve and two `sampleTension`s, keyed on `x_D` like the coupe's rider.
  const profile = useMemo(
    () => (solved === null ? null : tensionProfile(solved, xD)),
    [solved, xD],
  );

  return (
    <section
      aria-label={TENSION_COPY.title}
      className="border-border flex flex-col gap-2 border-t py-3"
    >
      <h2 className="font-heading text-muted-foreground flex flex-wrap items-baseline gap-x-2 px-3 text-xs font-semibold tracking-wide uppercase">
        {TENSION_COPY.title}
        <span className="text-muted-foreground/70 text-xs normal-case">{TENSION_COPY.scope}</span>
      </h2>
      {width === null ? (
        // Not measured yet: the box keeps its floor, and nothing about the line is said.
        <div style={{ height: TENSION_CHART.min }} />
      ) : frame === null || profile === null ? (
        <Empty
          height={tensionChartHeight(innerWidth(width))}
          text={frame === null ? NO_SPAN_LINE : (cause ?? `${label("aucun-resultat", "exact")}.`)}
        />
      ) : (
        <>
          <Legend profile={profile} />
          {profile.perLine && (
            <p className="text-muted-foreground px-3 text-xs">{TENSION_COPY.perLineNote}</p>
          )}
          {saisie !== null && <p className="text-muted-foreground px-3 text-xs">{saisie}</p>}
          <Plot frame={frame} profile={profile} unit={unit} width={width} />
        </>
      )}
    </section>
  );
}

function Empty({ height, text }: { height: number; text: string }) {
  return (
    <div className="border-border mx-3 border" style={{ height }}>
      <p className="text-muted-foreground flex h-full items-center justify-center px-3 text-center text-xs">
        {text}
      </p>
    </div>
  );
}

/** The two curves' strokes and the passager's mark, named as the coupe names them. */
function Legend({ profile }: { profile: TensionProfile }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 text-xs">
      <li className="flex items-center gap-1">
        <Swatch dashed />
        {TENSION_COPY.unloaded}
      </li>
      <li className="flex items-center gap-1">
        {profile.loaded === null ? (
          <span className="text-muted-foreground">{TENSION_COPY.loadedUnavailable}</span>
        ) : (
          <>
            <Swatch />
            {TENSION_COPY.loaded}
          </>
        )}
      </li>
      {profile.rider !== null && (
        <li className="flex items-center gap-1">
          <svg aria-hidden className="shrink-0" height={8} width={8}>
            <circle className="fill-foreground" cx={4} cy={4} r={3} />
          </svg>
          {TENSION_COPY.passenger} <span className="font-mono">{formatAtX(profile.rider.xD)}</span>
        </li>
      )}
    </ul>
  );
}

function Swatch({ dashed = false }: { dashed?: boolean }) {
  return (
    <svg aria-hidden className="shrink-0" height={8} width={20}>
      <line
        className={dashed ? "stroke-foreground/70" : "stroke-foreground"}
        strokeDasharray={dashed ? "5 3" : undefined}
        strokeWidth={dashed ? 1.5 : 2}
        x1={0}
        x2={20}
        y1={4}
        y2={4}
      />
    </svg>
  );
}

/** What a screen reader is told in place of the drawing: both curves' ends, per line or not. */
function summary(profile: TensionProfile, unit: ForceUnit): string {
  const force = (T: number) => formatQuantity("Tstatic", T, unit);
  const ends = (Ts: Float64Array) => `A ${force(Ts[0])}, B ${force(Ts.at(-1) ?? Ts[0])}`;
  const parts = [`${TENSION_COPY.unloaded} : ${ends(profile.unloaded.Ts)}`];
  parts.push(
    profile.loaded === null
      ? TENSION_COPY.loadedUnavailable
      : `${TENSION_COPY.loaded} : ${ends(profile.loaded.Ts)}`,
  );
  const scope = profile.perLine
    ? `${TENSION_COPY.scope}, ${TENSION_COPY.perLineShort}`
    : TENSION_COPY.scope;
  return `${TENSION_COPY.title} (${scope}) — ${parts.join(" ; ")}`;
}

function Plot({
  frame,
  profile,
  unit,
  width,
}: {
  frame: SceneFrame;
  profile: TensionProfile;
  unit: ForceUnit;
  width: number;
}) {
  const { at: hover, bind } = useHover<number>();
  const x = createSharedX({ width, L: frame.L, extent: frame.extent });
  const height = tensionChartHeight(innerWidth(width));
  const scene = tensionScene(profile, x, height, unit);
  const { plot } = scene;
  const wide = width >= CELL_WRAP_PX;
  const axis = axisLabel(x, "left");

  // The scale's own inverse, after dividing out the `viewBox`'s scale: below B2 the box may be a
  // scrollbar narrower than the width the scale was built for.
  const pointer = bind((event: ReactPointerEvent<Element>) => {
    const svg =
      event.currentTarget instanceof SVGElement ? event.currentTarget.ownerSVGElement : null;
    const rect = svg?.getBoundingClientRect();
    if (rect === undefined || rect.width === 0) return null;
    return x.toMetres(rect.left + (event.clientX - rect.left) * (width / rect.width), rect.left);
  });
  // Off the span there is no line to read, so no rule either.
  const lines =
    hover === null ? null : tensionLines(profile, hover, unit, RIDER_REACH_PX / x.pxPerM);
  const at = hover === null ? null : x.x(hover);

  return (
    <svg
      aria-label={summary(profile, unit)}
      className="block h-auto w-full touch-pan-y select-none"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      <text className="fill-muted-foreground text-[10px]" x={x.gutter} y={13}>
        {TENSION_COPY.yAxis(unitLabel("Tstatic", unit), profile.perLine)}
      </text>

      {/* The grid at every tick but zero, which the axis line carries. */}
      <g className="stroke-border">
        {scene.ticks.slice(1).map((tick) => (
          <line key={tick.text} x1={x.gutter} x2={width - x.gutter} y1={tick.y} y2={tick.y} />
        ))}
      </g>
      {scene.anchors.map((column) => (
        <line
          className="stroke-muted-foreground/50"
          key={column}
          x1={column}
          x2={column}
          y1={plot.top}
          y2={plot.bottom}
        />
      ))}
      <line
        className="stroke-foreground/70"
        x1={x.gutter}
        x2={width - x.gutter}
        y1={plot.bottom}
        y2={plot.bottom}
      />

      <path
        className="stroke-foreground/70 fill-none"
        d={pathOf(scene.unloaded)}
        strokeDasharray="6 4"
        strokeWidth={1.5}
      />
      {scene.loaded !== null && (
        <path className="stroke-foreground fill-none stroke-2" d={pathOf(scene.loaded)} />
      )}

      {scene.rider !== null && (
        <>
          <line
            className="stroke-foreground/50"
            strokeDasharray="2 3"
            x1={scene.rider.x}
            x2={scene.rider.x}
            y1={plot.top}
            y2={plot.bottom}
          />
          <circle className="fill-foreground" cx={scene.rider.x} cy={scene.rider.sideA} r={3} />
          <circle className="fill-foreground" cx={scene.rider.x} cy={scene.rider.sideB} r={3} />
        </>
      )}

      {/* The y labels stand inside the plot on a halo, after the curves they may cover (#115). */}
      <g
        className="fill-muted-foreground stroke-background pointer-events-none text-[9px]"
        paintOrder="stroke"
        strokeLinejoin="round"
        strokeWidth={3}
        textAnchor={axis.anchor}
      >
        {scene.ticks.map((tick) => (
          <text key={tick.text} x={axis.x} y={tick.baseline}>
            {tick.text}
          </text>
        ))}
      </g>

      <g className="fill-muted-foreground pointer-events-none text-[10px]">
        {xTicks(frame.L, wide).map((tick, index, all) => (
          <text
            key={tick}
            textAnchor={index === 0 ? "start" : index === all.length - 1 ? "end" : "middle"}
            x={x.x(tick)}
            y={height - 22}
          >
            {`${Math.round(tick)}${index === all.length - 1 ? " m" : ""}`}
          </text>
        ))}
        <text textAnchor="middle" x={width / 2} y={height - 6}>
          {TENSION_COPY.xAxis}
        </text>
      </g>

      {at !== null && lines !== null && (
        <>
          <HoverRule at={at} bottom={plot.bottom} top={plot.top} />
          <HoverTip at={at} bottom={plot.bottom} lines={lines} top={plot.top} width={width} />
        </>
      )}

      {/* The plot is the pointer surface; `touch-pan-y` keeps a vertical drag scrolling the Page. */}
      <rect
        className="fill-transparent"
        {...pointer}
        height={plot.bottom - plot.top}
        width={width}
        x={0}
        y={plot.top}
      />
    </svg>
  );
}
