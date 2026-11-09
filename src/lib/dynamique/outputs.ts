/**
 * The Page Dynamique's outputs (#92): what the passager's two rides come to, **read off the engine's
 * `Ride`s** and worded in the terrain register — never re-derived. The abscissae of the two Points
 * d'arrêt are the engine's own `end.x`, and the scene's markers read them from here, so the tiles and
 * the charts cannot disagree about where the passager stops.
 *
 * Data shape — one {@link DynamiqueOutputs}: two {@link RideOutput}s (sans vent, avec le vent
 * saisi), each a Point d'arrêt that is an abscissa or an absence, an arrival or an absence, and a
 * duration; beside them the words every dynamic value is qualified with. No Verdict: judging the line
 * is Statique's, Avancé's and Terrain's.
 */

import type { DynamicsReading } from "@/lib/scenario/dynamics.ts";
import type { ScenarioDraft } from "@/lib/scenario/types.ts";
import type { Ride, RideSample } from "@/lib/sim";

import { formatAtX, formatQuantity } from "@/lib/format/quantity.ts";
import { msToKmh } from "@/lib/sim";

import {
  ARRIVES_AT_END,
  COINCIDE_NOTE,
  CONSTANTS_NOTE,
  ESTIMATE,
  NEVER_SETTLES,
  NO_ARRIVAL,
  OUTPUT_LABEL,
  RIDE_LABEL,
  SWING_THEN,
  SWING_UNSETTLED,
  WARNING_COPY,
} from "./copy.ts";

/** The two rides, in the order the Page prints them: the Point d'arrêt without wind comes first. */
export type RideId = "calm" | "windy";

export const RIDE_IDS = ["calm", "windy"] as const satisfies readonly RideId[];

/** One ride, as the tiles print it. */
export type RideOutput = {
  readonly id: RideId;
  readonly label: string;
  /** The engine's Point d'arrêt, m from A — `null` when the ride reaches B or never settles. */
  readonly stopX: number | null;
  /** « à x 74,4 m », or why there is none: « arrive au bout », « oscille sans s'arrêter ». */
  readonly stop: string;
  /** The vitesse d'arrivée in both units, or `null` when the ride does not arrive. */
  readonly arrival: { readonly kmh: string; readonly ms: string } | null;
  /** « pas d'arrivée » — why {@link arrival} is `null`, `null` when it is not. */
  readonly noArrival: string | null;
  readonly duration: string;
  /** « Durée de la traversée » when the ride arrives, « Durée jusqu'à l'arrêt » when it does not. */
  readonly durationLabel: string;
  /**
   * What follows the first pass when the ride swings back: « puis oscille jusqu'à l'arrêt à x 229,3 m,
   * 85,1 s » — `null` when the first pass is the whole ride.
   */
  readonly swing: string | null;
  /** « estimation » — what each of the three values above is read with (#6). */
  readonly estimate: string;
  /**
   * « Vent saisi non appliqué : … » on the ride with the Vent, when the Vent the Scenario carries has
   * no line to be projected on; `null` otherwise, and always on the ride without wind.
   */
  readonly notice: string | null;
};

export type DynamiqueOutputs = {
  readonly rides: readonly [RideOutput, RideOutput];
  /** No Vent pushes along the line: both rides are one, and so are the markers. */
  readonly coincide: boolean;
  /**
   * The sentence under the rides when they coincide — {@link COINCIDE_NOTE} — or `null`: while the
   * Vent is not applied, the ride with the Vent says why instead, and « no wind pushes along the
   * line » would say the wrong thing.
   */
  readonly coincideNote: string | null;
  /** One line per ride that swings back, « Sans vent : puis … » — unnamed when the rides are one. */
  readonly swingLines: readonly string[];
  /** The sentences of the engine's warnings this Page words, quasi-staticity first. */
  readonly warnings: readonly string[];
  /** The constants' provenance, in one line. */
  readonly constants: string;
};

/**
 * @param reading the two rides and what qualifies them.
 * @param family the line's material: the provenance line names the trolley law it rides on.
 * @param windNotice why the Vent entered is not applied (`ErrorSurfaces.windNotice`), or `null`.
 */
export function dynamiqueOutputs(
  reading: DynamicsReading,
  family: ScenarioDraft["material"]["family"],
  windNotice: string | null = null,
): DynamiqueOutputs {
  const rides = [
    rideOutput("calm", reading.calm, null),
    rideOutput("windy", reading.windy, windNotice),
  ] as const;
  return {
    rides,
    coincide: reading.windless,
    coincideNote: reading.windless && windNotice === null ? COINCIDE_NOTE : null,
    swingLines: (reading.windless ? [rides[0]] : rides).flatMap(({ label, swing }) =>
      swing === null ? [] : [reading.windless ? swing : `${label} : ${swing}`],
    ),
    warnings: reading.warnings.flatMap((id) => WARNING_COPY[id] ?? []),
    constants: CONSTANTS_NOTE[family],
  };
}

function rideOutput(id: RideId, { end, samples }: Ride, notice: string | null): RideOutput {
  const arrives = end.kind === "arrival";
  return {
    id,
    label: RIDE_LABEL[id],
    stopX: end.kind === "stop" ? end.x : null,
    stop:
      end.kind === "stop"
        ? formatAtX(end.x)
        : end.kind === "arrival"
          ? ARRIVES_AT_END
          : NEVER_SETTLES,
    arrival: arrives
      ? {
          kmh: formatQuantity("speedKmh", msToKmh(end.v)),
          ms: formatQuantity("speed", end.v),
        }
      : null,
    noArrival: arrives ? null : NO_ARRIVAL,
    duration: formatQuantity("duration", end.t),
    durationLabel: arrives ? OUTPUT_LABEL.duration : OUTPUT_LABEL.durationToStop,
    swing: swingAfter(samples, end),
    estimate: ESTIMATE,
    notice,
  };
}

/**
 * The ride's **first pass**: from the start to the first time the speed is back to zero — the
 * farthest point reached — or to B. A ride that swings back would otherwise loop over itself on a
 * chart plotted against x. A ride that arrives is kept whole: it never turns before B.
 */
export function firstPass({ samples, end }: Ride): readonly RideSample[] {
  if (end.kind === "arrival") return samples;
  const turn = samples.findIndex((sample, i) => i > 0 && sample.v <= 0);
  return turn === -1 ? samples : samples.slice(0, turn + 1);
}

/** What the chart leaves out after the first pass, in words; `null` when it leaves nothing out. */
function swingAfter(samples: readonly RideSample[], end: Ride["end"]): string | null {
  if (end.kind === "arrival") return null;
  const left = samples.length - firstPass({ samples, end }).length;
  if (left === 0) return null;
  return end.kind === "stop"
    ? `${SWING_THEN} ${formatAtX(end.x)}, ${formatQuantity("duration", end.t)}`
    : SWING_UNSETTLED;
}
