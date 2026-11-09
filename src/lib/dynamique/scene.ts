/**
 * The Page Dynamique's drawable scene (#92): the coupe and the speed / acceleration curve, **over one
 * `SharedX`**. It is one pure function from the solved line and the passager's two rides to every
 * pixel the two SVGs draw, for the reason `@/lib/chart/scene.ts` is one: a `node` test reaches it.
 *
 * Rules this module keeps:
 *
 * - **One x scale, built once, spent by both.** The coupe's ground and trajectory, the curve's two
 *   lines and both Points d'arrêt all go through `x.x`, so one abscissa is one pixel column in the
 *   two frames — the layout contract's `GUTTER` and `SharedX`, never a second scale.
 * - **The coupe is the Chart Block's coupe** — the same band heights, the same vertical exaggeration
 *   and z scale as every Page — with the loaded line and the trajectory instead of a rider handle.
 *   The loaded line is drawn where the passager would hang at rest: at the Point d'arrêt without
 *   wind, else at the trajectory's low point, which is where it would settle without friction.
 * - **The Points d'arrêt are the engine's.** A marker is drawn at the `end.x` the outputs carry and
 *   at no other abscissa, and a ride with no Point d'arrêt draws none: one that reaches B is said so
 *   at B, in words, so the coupe accounts for both rides.
 * - **One zero for both y axes.** Speed and acceleration are in other units, so each has its own
 *   scale — but their zero is one line, and the side that needs less room is padded to match.
 */

import type { ChartScene, Polyline, SceneBase, SceneFrame } from "@/lib/chart/scene.ts";
import type { SharedX, ZScale } from "@/lib/layout/contract.ts";
import type { DynamicsReading } from "@/lib/scenario/dynamics.ts";
import type { RideSample } from "@/lib/sim";

import { placeRider } from "@/lib/chart/scene.ts";
import { formatValue } from "@/lib/format/quantity.ts";
import {
  createSharedX,
  createZScale,
  exaggeration,
  innerWidth,
  plotAspect,
  PROFILE_CHROME,
  profileOuterHeight,
  profilePlotHeight,
  stripOuterHeight,
  veBadgeLabel,
} from "@/lib/layout/contract.ts";

import type { DynamiqueOutputs, RideId } from "./outputs.ts";

import { ARRIVAL_LABEL, ESTIMATE, MARKER_LABEL } from "./copy.ts";
import { firstPass, RIDE_IDS } from "./outputs.ts";

/** A point in an SVG's user units. */
export type PxPoint = readonly [x: number, y: number];

/** A polyline in an SVG's user units. */
export type PxPath = readonly PxPoint[];

/** A Point d'arrêt as the charts mark it. */
export type StopMarker = {
  readonly id: RideId;
  /** The engine's abscissa, m from A. */
  readonly metres: number;
  /** Where it sits in the shared x scale — the same column in the coupe and in the curve. */
  readonly x: number;
  /** The passager at rest, on the coupe's z scale. */
  readonly y: number;
  readonly label: string;
  /** Which line of labels it stands on, so two markers at one abscissa do not overprint. */
  readonly row: 0 | 1;
};

/** One tick of a y axis. */
export type Tick = { readonly y: number; readonly text: string };

export type CoupeScene = {
  /** The whole band: badge + plot + handle lane + x labels. */
  readonly height: number;
  readonly plot: { readonly top: number; readonly height: number };
  readonly z: ZScale;
  /** « Éch. verticale ×4,7 » — what is drawn, as on every Page. */
  readonly badge: string;
  /** The ground over the whole shared domain. */
  readonly ground: PxPath;
  /** One loaded line per Brin porteur, a few pixels apart — `null` without a solved line. */
  readonly members: readonly { readonly offsetPx: number; readonly path: PxPath }[] | null;
  /**
   * The loaded line in metres with the passager hanging on it at rest, for the hover to read —
   * `null` where `members` is.
   */
  readonly rest: ChartScene["rider"] | null;
  /** The loaded trajectory of the passager, one path per run of solved steps. */
  readonly trajectory: readonly PxPath[];
  /** Each anchor's tower, clipped to the plot. */
  readonly anchors: readonly {
    readonly x: number;
    readonly top: number;
    readonly bottom: number;
  }[];
  readonly markers: readonly StopMarker[];
  /** A ride that reaches B has no Point d'arrêt: it is named at B instead, « arrive au bout ». */
  readonly arrivals: readonly Pick<StopMarker, "id" | "x" | "label" | "row">[];
  /** « estimation » over the coupe's dynamic marks, `null` when it draws none. */
  readonly estimate: string | null;
};

export type CurveScene = {
  readonly height: number;
  /** The plot's top and bottom edges. */
  readonly plot: { readonly top: number; readonly bottom: number };
  /** The speed along the line, per ride. `windy` is the ride with the Vent entered. */
  readonly speed: Readonly<Record<RideId, PxPath>>;
  /** The acceleration of the ride with the Vent entered. */
  readonly acceleration: PxPath;
  /** The one zero line, for both axes. */
  readonly zero: number;
  readonly speedTicks: readonly Tick[];
  readonly accelerationTicks: readonly Tick[];
  readonly markers: readonly Pick<StopMarker, "id" | "metres" | "x" | "label" | "row">[];
  /**
   * Where each ride that swings back turns — the farthest point reached, where its first pass ends
   * and its speed is zero. Absent for a ride that arrives or stops without turning back.
   */
  readonly farthest: readonly { readonly id: RideId; readonly x: number; readonly y: number }[];
};

/** The two rides and what they come to. */
export type Rides = {
  readonly reading: DynamicsReading;
  readonly outputs: DynamiqueOutputs;
};

/**
 * The solved half of the Page: the line the traverse solved, and the rides over it — `null` when
 * the traverse is incomplete, which keeps the loaded line and the trajectory and loses the rest.
 */
export type DynamiqueSolved = {
  readonly base: SceneBase;
  readonly rides: Rides | null;
};

export type DynamiqueScene = {
  /** The one scale both frames are drawn on. */
  readonly x: SharedX;
  readonly coupe: CoupeScene;
  /** `null` without rides: the frame stays, the curve goes. */
  readonly curve: CurveScene | null;
};

/** The curve's caption row and its bottom margin, as the clearance strip's. */
const CURVE_TOP = 20;
const CURVE_BOTTOM = 10;

/** Which line of marker labels each ride stands on. */
const LABEL_ROW = { calm: 0, windy: 1 } as const satisfies Record<RideId, 0 | 1>;

/** A tick closer than this to the zero line is dropped rather than drawn over it. */
const TICK_CLEARANCE = 9;

/**
 * @param width the chart column's inline size — the single `ResizeObserver`'s.
 * @param frame the input half, always drawn.
 * @param solved the rides over the solved line, or `null` for « Aucun résultat »: the ground, the
 *   anchors and the badge stay.
 */
export function dynamiqueScene({
  width,
  frame,
  solved,
}: {
  width: number;
  frame: SceneFrame;
  solved: DynamiqueSolved | null;
}): DynamiqueScene {
  const wInner = innerWidth(width);
  const x = createSharedX({ width, L: frame.L, extent: frame.extent });
  const zExtent = solved?.base.zExtent ?? frame.zExtent;
  const ve = exaggeration({
    plotAspect: plotAspect(wInner),
    xSpan: x.domain[1] - x.domain[0],
    zDataSpan: zExtent.max - zExtent.min,
  });
  const plot = { top: PROFILE_CHROME.badge, height: profilePlotHeight(wInner) };
  const z = createZScale({
    plotTop: plot.top,
    plotHeight: plot.height,
    centre: (zExtent.min + zExtent.max) / 2,
    pxPerMx: x.pxPerM,
    ve: ve.ve,
  });

  const inPx = ({ xs, zs }: Polyline): PxPath =>
    Array.from(xs, (metres, i): PxPoint => [x.x(metres), z.y(zs[i])]);
  const bottom = plot.top + plot.height;
  const tower = (at: number, top: number, base: number) => ({
    x: x.x(at),
    top: Math.max(plot.top, z.y(top)),
    bottom: Math.min(bottom, z.y(base)),
  });

  const markers = solved?.rides == null ? [] : stopMarkers(solved.rides, x, z);
  const arrivals = solved?.rides == null ? [] : arrivalMarkers(solved.rides, x, frame.L);
  const rest = solved === null ? null : loadedLine(solved);

  return {
    x,
    coupe: {
      height: profileOuterHeight(wInner),
      plot,
      z,
      badge: veBadgeLabel(ve),
      ground: inPx(frame.ground),
      members:
        solved === null || rest === null
          ? null
          : solved.base.members.map(({ offsetPx }) => ({ offsetPx, path: inPx(rest.cable) })),
      rest,
      trajectory: solved === null ? [] : solved.base.trajectory.map(inPx),
      anchors: [
        tower(0, 0, -frame.anchors.zA),
        tower(frame.L, frame.h, frame.h - frame.anchors.zB),
      ],
      markers,
      arrivals,
      estimate: solved?.rides == null ? null : ESTIMATE,
    },
    curve:
      solved?.rides == null ? null : curveScene(solved.rides, x, stripOuterHeight(wInner), markers),
  };
}

/**
 * The loaded line where the passager hangs at rest — the Point d'arrêt without wind, else the
 * trajectory's low point. `null` when the exact solve refuses at that position.
 */
function loadedLine({ base, rides }: DynamiqueSolved): ChartScene["rider"] | null {
  if (base.traverse.steps.length === 0) return null;
  const end = rides?.reading.calm.end;
  const low = base.traverse.steps.reduce((lowest, step) => (step.zD < lowest.zD ? step : lowest));
  return placeRider(base, end?.kind === "stop" ? end.x : low.xD);
}

/** The Points d'arrêt, the engine's abscissae on both scales — absent for a ride that has none. */
function stopMarkers({ reading, outputs }: Rides, x: SharedX, z: ZScale): readonly StopMarker[] {
  return outputs.rides.flatMap(({ id, stopX }) => {
    if (stopX === null) return [];
    const rest = reading[id].samples.at(-1);
    return rest === undefined
      ? []
      : [
          {
            id,
            metres: stopX,
            x: x.x(stopX),
            y: z.y(rest.z),
            label: MARKER_LABEL[id],
            row: LABEL_ROW[id],
          },
        ];
  });
}

/** The rides that reach B, named at B — the engine's `arrival`, not a Point d'arrêt at the end. */
function arrivalMarkers({ reading }: Rides, x: SharedX, L: number): CoupeScene["arrivals"] {
  return RIDE_IDS.flatMap((id) =>
    reading[id].end.kind === "arrival"
      ? [{ id, x: x.x(L), label: ARRIVAL_LABEL[id], row: LABEL_ROW[id] }]
      : [],
  );
}

function curveScene(
  { reading }: Rides,
  x: SharedX,
  height: number,
  markers: readonly StopMarker[],
): CurveScene {
  const top = CURVE_TOP;
  const bottom = height - CURVE_BOTTOM;
  // Only the first pass is drawn: the swing back would loop the curves over themselves.
  const passes = { calm: firstPass(reading.calm), windy: firstPass(reading.windy) };
  const speeds = RIDE_IDS.flatMap((id) => passes[id].map((sample) => sample.v));
  const accelerations = passes.windy.map((sample) => sample.a);
  const [speed, acceleration] = alignedDomains(signedExtent(speeds), signedExtent(accelerations));

  const scale = (domain: Domain) => (value: number) =>
    bottom - ((value + domain.neg) / (domain.neg + domain.pos)) * (bottom - top);
  const ySpeed = scale(speed);
  const yAcceleration = scale(acceleration);
  const zero = ySpeed(0);

  const path = (
    samples: readonly RideSample[],
    read: (sample: RideSample) => number,
    y: (value: number) => number,
  ) => samples.map((sample): PxPoint => [x.x(sample.x), y(read(sample))]);

  // The gutter holds four characters at the axis' 9 px: from 10 on the decimal is dropped, so
  // « -12,3 » reads « -12 » rather than running past the SVG's edge.
  const tick = (
    value: number,
    y: (value: number) => number,
    quantity: "speed" | "acceleration",
  ) => {
    const text = formatValue(quantity, value);
    return { y: y(value), text: Math.abs(value) >= 10 ? text.replace(/,\d+$/, "") : text };
  };
  const apart = (ticks: readonly Tick[]) =>
    ticks.filter((one) => Math.abs(one.y - zero) > TICK_CLEARANCE);

  return {
    height,
    plot: { top, bottom },
    speed: {
      calm: path(passes.calm, (sample) => sample.v, ySpeed),
      windy: path(passes.windy, (sample) => sample.v, ySpeed),
    },
    acceleration: path(passes.windy, (sample) => sample.a, yAcceleration),
    zero,
    speedTicks: [
      { y: zero, text: "0" },
      ...apart([tick(speed.pos, ySpeed, "speed"), tick(-speed.neg, ySpeed, "speed")]),
    ],
    accelerationTicks: apart([
      tick(acceleration.pos, yAcceleration, "acceleration"),
      tick(-acceleration.neg, yAcceleration, "acceleration"),
    ]),
    farthest: RIDE_IDS.flatMap((id) => {
      const turn = passes[id].at(-1);
      return reading[id].end.kind === "arrival" ||
        turn === undefined ||
        passes[id].length === reading[id].samples.length
        ? []
        : [{ id, x: x.x(turn.x), y: ySpeed(turn.v) }];
    }),
    markers: markers.map(({ id, metres, label, row }) => ({
      id,
      metres,
      x: x.x(metres),
      label,
      row,
    })),
  };
}

/** The room a series needs on each side of zero, as magnitudes. */
type Domain = { readonly neg: number; readonly pos: number };

function signedExtent(values: readonly number[]): Domain {
  let neg = 0;
  let pos = 0;
  for (const value of values) {
    if (-value > neg) neg = -value;
    if (value > pos) pos = value;
  }
  return { neg, pos };
}

/**
 * Two domains with **one zero line**: the share of the axis below zero is the larger of the two,
 * and the series that needs less room below is given the difference — a negative side is padded,
 * never a positive one cut. A series that never moved still gets a unit of room, so the scale
 * stays finite.
 */
function alignedDomains(a: Domain, b: Domain): [Domain, Domain] {
  const given = (domain: Domain): Domain =>
    domain.neg + domain.pos === 0
      ? { neg: 0, pos: 1 }
      : { neg: domain.neg, pos: Math.max(domain.pos, 0.1 * domain.neg) };
  const [one, other] = [given(a), given(b)];
  const below = (domain: Domain) => domain.neg / (domain.neg + domain.pos);
  const share = Math.max(below(one), below(other));
  const match = (domain: Domain): Domain => ({
    neg: Math.max(domain.neg, (share / (1 - share)) * domain.pos),
    pos: domain.pos,
  });
  return [match(one), match(other)];
}
