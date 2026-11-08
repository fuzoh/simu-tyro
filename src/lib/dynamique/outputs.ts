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
import type { Ride } from "@/lib/sim";

import { formatAtX, formatQuantity } from "@/lib/format/quantity.ts";
import { msToKmh } from "@/lib/sim";

import {
  ARRIVES_AT_END,
  CONSTANTS_NOTE,
  ESTIMATE,
  NEVER_SETTLES,
  NO_ARRIVAL,
  RIDE_LABEL,
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
  /** « estimation » — what each of the three values above is read with (#6). */
  readonly estimate: string;
};

export type DynamiqueOutputs = {
  readonly rides: readonly [RideOutput, RideOutput];
  /** No Vent pushes along the line: both rides are one, and so are the markers. */
  readonly coincide: boolean;
  /** The sentences of the engine's warnings this Page words, quasi-staticity first. */
  readonly warnings: readonly string[];
  /** The constants' provenance, in one line. */
  readonly constants: string;
};

/**
 * @param reading the two rides and what qualifies them.
 * @param family the line's material: the provenance line names the trolley law it rides on.
 */
export function dynamiqueOutputs(
  reading: DynamicsReading,
  family: ScenarioDraft["material"]["family"],
): DynamiqueOutputs {
  return {
    rides: [rideOutput("calm", reading.calm), rideOutput("windy", reading.windy)],
    coincide: reading.windless,
    warnings: reading.warnings.flatMap((id) => WARNING_COPY[id] ?? []),
    constants: CONSTANTS_NOTE[family],
  };
}

function rideOutput(id: RideId, { end }: Ride): RideOutput {
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
    estimate: ESTIMATE,
  };
}
