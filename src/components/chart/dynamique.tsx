/**
 * The Page Dynamique's two frames (#92): the coupe — profil, loaded line, the passager's loaded
 * trajectory and the two Points d'arrêt — and, under it, the speed / acceleration curve. Hand-rolled
 * SVG over `@/lib/dynamique/scene.ts`, which has decided every pixel: this file places what the
 * scene hands it.
 *
 * **Both frames are drawn on one `SharedX`**, so one abscissa is one column in each, and the pointer
 * on either is a rule on both: the hovered abscissa is one piece of state, read by the two.
 *
 * No handle, no scrub and no animation: the passager is a path here, not a thing that moves.
 */

import type { ReactNode } from "react";

import { area, line } from "d3-shape";

import type { SceneFrame } from "@/lib/chart/scene.ts";
import type {
  CoupeScene,
  CurveScene,
  DynamiqueSolved,
  PxPath,
  Rides,
  StopMarker,
} from "@/lib/dynamique/scene.ts";
import type { SharedX } from "@/lib/layout/contract.ts";

import { BannerSlot, ProfileBand, StripBand } from "@/components/app/shell.tsx";
import { HoverRule, HoverTip } from "@/components/chart/hover.tsx";
import { xTicks } from "@/components/chart/profile.tsx";
import { type HoverHandlers, metresOn, useHover } from "@/components/chart/use-hover.ts";
import { NO_SPAN_LINE } from "@/lib/chart/copy.ts";
import { type CoupeReading, coupeLines, coupeReading, RIDER_REACH_PX } from "@/lib/chart/hover.ts";
import { CHART_TITLE, CURVE_CAPTION } from "@/lib/dynamique/copy.ts";
import { curveHover } from "@/lib/dynamique/hover.ts";
import { dynamiqueScene } from "@/lib/dynamique/scene.ts";
import { axisLabel, CELL_WRAP_PX } from "@/lib/layout/contract.ts";
import { cn } from "@/lib/utils.ts";

/** A path through pixel points, `null` for none. */
const stroke = line<readonly [number, number]>()
  .x((point) => point[0])
  .y((point) => point[1]);

function pathOf(points: PxPath): string | undefined {
  return stroke([...points]) ?? undefined;
}

/**
 * The Page's chart region: the banner slot, the coupe and the curve. `width` is `null` until the
 * observer has measured, and then the bands hold their heights with nothing in them — the
 * Skeleton's own content.
 *
 * @param frame the input half, or `null` for « l'exception géométrique »: no shared x domain.
 * @param solved the solved line and its rides, `null` for « Aucun résultat »; the rides alone are
 *   `null` for an incomplete traverse, which still draws the line and the trajectory.
 * @param clearance `false` under a Clearance Gate breach: the coupe's hover withholds every gap.
 * @param cause what is said in the curve's frame where the curve would be: « Aucun résultat — … »,
 *   or the incomplete traverse.
 */
export function DynamiqueCharts({
  banner,
  cause,
  clearance,
  frame,
  solved,
  width,
}: {
  banner?: ReactNode;
  cause: string | null;
  /** May the gaps to the ground be shown? False on a Clearance Gate breach, as on Statique. */
  clearance: boolean;
  frame: SceneFrame | null;
  solved: DynamiqueSolved | null;
  width: number | null;
}) {
  const { at: hover, bind } = useHover<number>();

  if (width === null) {
    return (
      <>
        <BannerSlot>{banner}</BannerSlot>
        <ProfileBand />
        <StripBand />
      </>
    );
  }
  if (frame === null) {
    const empty = <Line text={NO_SPAN_LINE} />;
    return (
      <>
        <BannerSlot>{banner}</BannerSlot>
        <ProfileBand plot={empty} />
        <StripBand>
          <div className="border-border mx-[var(--gutter)] h-full border">{empty}</div>
        </StripBand>
      </>
    );
  }

  const scene = dynamiqueScene({ width, frame, solved });
  const wide = width >= CELL_WRAP_PX;
  const pointer = bind(metresOn(scene.x));
  // One authority for « on the span »: the coupe's reading is `null` past A or B, and so is the curve's.
  const reading =
    hover === null
      ? null
      : coupeReading({
          frame,
          cable: scene.coupe.rest?.cable ?? null,
          rider: scene.coupe.rest,
          metres: hover,
          reach: RIDER_REACH_PX / scene.x.pxPerM,
          clearance,
        });
  const at = reading?.distance ?? null;

  return (
    <>
      <BannerSlot>{banner}</BannerSlot>
      <ProfileBand>
        <Coupe
          frame={frame}
          reading={reading}
          pointer={pointer}
          scene={scene.coupe}
          wide={wide}
          x={scene.x}
        />
      </ProfileBand>
      <StripBand>
        {scene.curve !== null && solved?.rides != null ? (
          <Curve
            hover={at}
            pointer={pointer}
            rides={solved.rides}
            scene={scene.curve}
            wide={wide}
            x={scene.x}
          />
        ) : (
          <div className="border-border mx-[var(--gutter)] h-full border">
            {cause !== null && <Line text={cause} />}
          </div>
        )}
      </StripBand>
      {solved?.rides != null &&
        solved.rides.outputs.swingLines.map((text) => (
          <p
            className="text-muted-foreground pinned:hidden px-[var(--gutter)] pt-1 text-xs"
            key={text}
          >
            {text}
          </p>
        ))}
    </>
  );
}

function Line({ text }: { text: string }) {
  return (
    <p className="text-muted-foreground flex h-full items-center justify-center px-3 text-center text-xs">
      {text}
    </p>
  );
}

function Coupe({
  frame,
  reading,
  pointer,
  scene,
  wide,
  x,
}: {
  frame: SceneFrame;
  reading: CoupeReading | null;
  pointer: HoverHandlers;
  scene: CoupeScene;
  wide: boolean;
  x: SharedX;
}) {
  const { plot } = scene;
  const plotBottom = plot.top + plot.height;
  const terrain = area<readonly [number, number]>()
    .x((point) => point[0])
    .y0(plotBottom)
    .y1((point) => point[1])([...scene.ground]);

  return (
    <svg
      aria-label={CHART_TITLE.section}
      className="block h-full w-full touch-pan-y select-none"
      height={scene.height}
      role="img"
      width={x.width}
    >
      <defs>
        <clipPath id="dynamique-plot">
          <rect height={plot.height} width={x.width} x={0} y={plot.top} />
        </clipPath>
      </defs>

      <text className="fill-muted-foreground font-mono text-[11px]" x={x.gutter} y={19}>
        {scene.badge}
      </text>
      {scene.estimate !== null && (
        <text
          className="fill-muted-foreground text-[10px]"
          textAnchor="end"
          x={x.width - x.gutter}
          y={19}
        >
          {scene.estimate}
        </text>
      )}

      <g clipPath="url(#dynamique-plot)">
        {terrain !== null && <path className="fill-muted stroke-border" d={terrain} />}

        {/* The trajectory is the locus of the trolley over the whole traverse — dotted, so it is
            never read as a cable; the loaded line touches it at one point, where the passager rests. */}
        {scene.trajectory.map((run) => (
          <path
            className="stroke-foreground/70 fill-none"
            d={pathOf(run)}
            key={run[0][0]}
            strokeDasharray="0 5"
            strokeLinecap="round"
            strokeWidth={2.5}
          />
        ))}

        {scene.members?.map((member) => (
          <path
            className="stroke-foreground fill-none stroke-2"
            d={pathOf(member.path)}
            key={member.offsetPx}
            transform={`translate(0 ${member.offsetPx})`}
          />
        ))}

        {scene.markers.map((marker) => (
          <MarkerRule bottom={plotBottom} key={marker.id} marker={marker} top={plot.top} />
        ))}

        {reading !== null && (
          <HoverRule at={x.x(reading.distance)} bottom={plotBottom} top={plot.top} />
        )}
      </g>

      {scene.anchors.map((anchor) => (
        <line
          className="stroke-foreground/70 stroke-2"
          key={anchor.x}
          x1={anchor.x}
          x2={anchor.x}
          y1={anchor.top}
          y2={anchor.bottom}
        />
      ))}

      {[...scene.markers, ...scene.arrivals].map((marker) => (
        <MarkerLabel key={marker.id} marker={marker} top={plot.top} width={x.width} />
      ))}

      <g className="fill-muted-foreground pointer-events-none text-[10px]">
        {xTicks(frame.L, wide).map((tick, index, all) => (
          <text
            key={tick}
            textAnchor={index === 0 ? "start" : index === all.length - 1 ? "end" : "middle"}
            x={x.x(tick)}
            y={scene.height - 8}
          >
            {`${Math.round(tick)}${index === all.length - 1 ? " m" : ""}`}
          </text>
        ))}
      </g>

      {reading !== null && (
        <HoverTip
          at={x.x(reading.distance)}
          bottom={plotBottom}
          lines={coupeLines(reading, "terrain")}
          top={plot.top}
          width={x.width}
        />
      )}

      {/* The plot is the pointer surface; `touch-pan-y` keeps a vertical drag scrolling the Page. */}
      <rect
        className="fill-transparent"
        {...pointer}
        height={plot.height}
        width={x.width}
        x={0}
        y={plot.top}
      />
    </svg>
  );
}

function Curve({
  hover,
  pointer,
  rides,
  scene,
  wide,
  x,
}: {
  hover: number | null;
  pointer: HoverHandlers;
  rides: Rides;
  scene: CurveScene;
  wide: boolean;
  x: SharedX;
}) {
  const { plot } = scene;
  const separate = !rides.outputs.coincide;

  return (
    <svg
      aria-label={CHART_TITLE.curve}
      className="block h-full w-full touch-pan-y select-none"
      height={scene.height}
      role="img"
      width={x.width}
    >
      <text className="fill-muted-foreground text-[10px]" x={x.gutter} y={12}>
        {wide ? CURVE_CAPTION.full : CURVE_CAPTION.short}
        {separate && ` · ${CURVE_CAPTION.calm}`}
      </text>

      <line
        className="stroke-foreground"
        x1={x.x(x.domain[0])}
        x2={x.x(x.domain[1])}
        y1={scene.zero}
        y2={scene.zero}
      />
      {/* Speed reads on the left, acceleration on the right, both **inside** the plot (#115): the
          12 px gutter is the containers' margin and holds no label. On a halo of the background,
          because they sit over the curves' first and last metres. */}
      {(
        [
          ["left", scene.speedTicks],
          ["right", scene.accelerationTicks],
        ] as const
      ).map(([side, ticks]) => {
        const axis = axisLabel(x, side);
        return (
          <g
            className="fill-muted-foreground stroke-background pointer-events-none text-[9px]"
            key={side}
            paintOrder="stroke"
            strokeLinejoin="round"
            strokeWidth={3}
            textAnchor={axis.anchor}
          >
            {ticks.map((tick) => (
              <text key={tick.text + tick.y} x={axis.x} y={tick.y + 3}>
                {tick.text}
              </text>
            ))}
          </g>
        );
      })}

      {/* The ride without wind only when the Vent entered makes it differ: then it is the lighter. */}
      {separate && (
        <path
          className="stroke-muted-foreground fill-none"
          d={pathOf(scene.speed.calm)}
          strokeWidth={1.5}
        />
      )}
      <path className="stroke-foreground fill-none stroke-2" d={pathOf(scene.speed.windy)} />
      <path
        className="stroke-foreground/70 fill-none"
        d={pathOf(scene.acceleration)}
        strokeDasharray="4 3"
      />

      {scene.markers.map((marker) => (
        <MarkerRule bottom={plot.bottom} key={marker.id} marker={marker} top={plot.top} />
      ))}

      {scene.farthest.map((turn) => (
        <circle
          className={turn.id === "calm" ? "fill-muted-foreground" : "fill-foreground"}
          cx={turn.x}
          cy={turn.y}
          key={turn.id}
          r={3.5}
        />
      ))}

      {hover !== null && <HoverRule at={x.x(hover)} bottom={plot.bottom} top={plot.top} />}

      {hover !== null && (
        <HoverTip
          at={x.x(hover)}
          bottom={plot.bottom}
          lines={curveHover(rides.reading, rides.outputs, hover)}
          top={plot.top}
          width={x.width}
        />
      )}

      <rect
        className="fill-transparent"
        {...pointer}
        height={plot.bottom - plot.top}
        width={x.width}
        x={0}
        y={plot.top}
      />
    </svg>
  );
}

/**
 * A Point d'arrêt's vertical rule, and — on the coupe, where it has a height — the passager at rest
 * on it. The ride without wind is the lighter, dashed one; the ride with the Vent entered is solid.
 */
function MarkerRule({
  marker,
  top,
  bottom,
}: {
  marker: Pick<StopMarker, "id" | "x"> & { y?: number };
  top: number;
  bottom: number;
}) {
  const calm = marker.id === "calm";
  return (
    <>
      <line
        className={calm ? "stroke-muted-foreground" : "stroke-foreground"}
        strokeDasharray={calm ? "4 3" : undefined}
        x1={marker.x}
        x2={marker.x}
        y1={top}
        y2={bottom}
      />
      {marker.y !== undefined && (
        <circle
          className={calm ? "fill-muted-foreground" : "fill-foreground"}
          cx={marker.x}
          cy={marker.y}
          r={4}
        />
      )}
    </>
  );
}

/** A marker's name at 10 px, rounded up, SVG user units — which side of its rule it goes. */
const LABEL_WIDTH = 130;

/** A marker's name beside its rule, on its own row, flipped left near the right edge. */
function MarkerLabel({
  marker,
  top,
  width,
}: {
  marker: Pick<StopMarker, "id" | "x" | "label" | "row">;
  top: number;
  width: number;
}) {
  const left = marker.x + LABEL_WIDTH > width;
  return (
    <text
      className={cn(
        "stroke-background pointer-events-none text-[10px]",
        marker.id === "calm" ? "fill-muted-foreground" : "fill-foreground",
      )}
      paintOrder="stroke"
      strokeLinejoin="round"
      strokeWidth={3}
      textAnchor={left ? "end" : "start"}
      x={left ? marker.x - 4 : marker.x + 4}
      y={top + 11 + 12 * marker.row}
    >
      {marker.label}
    </text>
  );
}
