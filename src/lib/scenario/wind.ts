/**
 * The Vent's **profile, as the Scenario holds it** (#120) — the two percents of `Wind` read into
 * `docs/simulation-theory.md` §8.4's parameters, the field a spatial reader is given, and **the
 * boundary of the profile's activation**.
 *
 * Rules this module exists to keep:
 *
 * - **The profile is read at the whole percent it prints as** ({@link windProfileOf}). A link may
 *   carry `ww=50.4`, kept as given (ADR-0001); what the Wind Gate judges and what a reader
 *   evaluates is the 50 % every field shows — one reading for both, so a profile the gate passes
 *   is always one the engine can evaluate.
 * - **Uniform is the attenuation at zero, whatever the width.** The width is kept through it and
 *   has no effect; « Vent uniforme » ({@link uniformWind}) writes the attenuation alone.
 * - **A non-uniform profile is not computed under a uniform wind.** The spatial statics and the
 *   ride on their locus read the field (§19), but the Banane and the rose's reading take one speed
 *   for the whole line. While
 *   {@link WIND_PROFILE_ACTIVE} is off, the gates refuse a profile that is not uniform and its
 *   controls are not offered, so no reader of one speed ever stands in for the field.
 */

import type { WindField, WindProfile } from "@/lib/sim";
import type { Trace } from "@/lib/terrain/trace.ts";

import { roundToDisplay } from "@/lib/format/quantity.ts";
import { airDensity, DYNAMICS, kmhToMs, WIND_PROFILE } from "@/lib/sim";
import { meanAltitude } from "@/lib/terrain/trace.ts";

import type { Wind } from "./types.ts";

/**
 * **Is the Vent's profile consumed by the physics?** Off until the spatial statics (#127) read
 * `windAt` at each point of the line and of the ride, and the views (#118) draw what they read —
 * the coordinated activation of #120 / #127 / #118.
 *
 * While it is off: the profile's fields, its handle on the rose, its preview and « Vent uniforme »
 * are not offered, and a link or a Session that carries a non-uniform profile is kept as given and
 * refused by the Wind Gate, with a Fix Action back to the uniform wind. Turning it on is that
 * activation and nothing less: every reader of the Vent must take the local field first, and the
 * profile's pad must fit the maps it stands on — it does not yet on the narrow ones
 * (`WindProfilePad`, `src/components/map/wind-rose.tsx`, holds the measurements).
 *
 * Typed `boolean` so that both states stay compiled and tested: every function that reads it takes
 * it as a defaulted parameter — the gates' `evaluateGates` and `isWindProfileFieldShown`
 * (`@/lib/rail/gates.ts`) and the vue de dessus's `windControls` (`@/lib/map/wind-rose.ts`), which
 * the live map and its fallback frame both ask. No component reads the constant itself.
 */
export const WIND_PROFILE_ACTIVE: boolean = false;

/**
 * §8.4's two parameters as they are read: **the whole percents the fields print**, the grain of
 * the profile's one-point step.
 */
export function windProfileOf({
  widthPct,
  attenuationPct,
}: Pick<Wind, "widthPct" | "attenuationPct">): WindProfile {
  return {
    width: roundToDisplay("windWidth", widthPct),
    attenuation: roundToDisplay("windAttenuation", attenuationPct),
  };
}

/** Is the wind the same along the whole line — no attenuation at the anchors, as it is read? */
export function isWindUniform(wind: Pick<Wind, "widthPct" | "attenuationPct">): boolean {
  return windProfileOf(wind).attenuation === 0;
}

/**
 * « Vent uniforme »: the attenuation back to zero and **nothing else** — the speed, the direction
 * and the width stay as they are. Not « no wind », which is the speed at zero.
 */
export function uniformWind(wind: Wind): Wind {
  return { ...wind, attenuationPct: 0 };
}

/**
 * The Vent as the field a spatial reader takes (`windAt`): the speed at mid-span in m/s — the one
 * place the entered km/h becomes SI for it — the direction, and the profile as it is read.
 *
 * Only for a Vent the Wind Gate passes: a profile outside its domain is refused there, and the
 * engine raises on it rather than read a uniform wind.
 */
export function windFieldOf(wind: Wind): WindField {
  return {
    speed: kmhToMs(wind.speedKmh),
    from: wind.directionDeg,
    profile: windProfileOf(wind),
  };
}

/**
 * Can the physics read this Vent as {@link windFieldOf} gives it — a finite speed `≥ 0`, a finite
 * direction, and a profile inside §8.4's domains as it is read? The Wind Gate refuses every other
 * one; the statics (#127) ask before they evaluate the field, because `windAt` raises on a profile
 * out of its domain rather than read another wind.
 */
export function isWindReadable(wind: Wind): boolean {
  const { width, attenuation } = windProfileOf(wind);
  return (
    Number.isFinite(wind.speedKmh) &&
    wind.speedKmh >= 0 &&
    Number.isFinite(wind.directionDeg) &&
    width >= WIND_PROFILE.width.min &&
    width <= WIND_PROFILE.width.max &&
    attenuation >= WIND_PROFILE.attenuation.min &&
    attenuation <= WIND_PROFILE.attenuation.max
  );
}

/**
 * Is the Vent **applied** to the line — §19.8's « wind applied »: a speed above zero and a bearing
 * to project it on (both Positions)? Without, the statics are §4–§7's closed form, the rides run in
 * still air and nothing reads the textile diameter (§19.16, #127 Q37).
 *
 * @param bearing the line's bearing A → B (`lineBearing`), or `null` without Positions.
 */
export function isWindApplied(wind: Pick<Wind, "speedKmh">, bearing: number | null): boolean {
  return bearing !== null && wind.speedKmh !== 0;
}

/** Where the `ρ` of the rides comes from — the « lu » half of « lu et éditable ». */
export type AirDensitySource =
  /** Typed: `rho` is in the link. */
  | "typed"
  /** §12.2's ISA density at the imported profil's mean altitude. */
  | "profile"
  /** §12.2's sea-level 1,225 — a manual line has no altitude to read. */
  | "sea-level";

/** The air density the rides — and, under an applied Vent, the statics (§19.4) — read. */
export type AirDensity = { readonly value: number; readonly source: AirDensitySource };

/** The `ρ` a ride uses: the typed one, else §12.2's ISA at the profil's mean altitude, else 1,225. */
export function airDensityOf(typed: number | null, profile: Trace | null): AirDensity {
  if (typed !== null) return { value: typed, source: "typed" };
  if (profile !== null) return { value: airDensity(meanAltitude(profile)), source: "profile" };
  return { value: DYNAMICS.rhoSeaLevel, source: "sea-level" };
}
