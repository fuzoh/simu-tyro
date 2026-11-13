/**
 * The Vue embarquée (#126), as pure functions: the Vue 3D's camera hung under the pulley, carried
 * along the ride the engine already computed while the reader turns the head freely. The renderer
 * (`@/components/map/vue-3d-renderer.ts`) asks these where the eye stands at each frame; nothing here
 * imports CesiumJS, so a `node` test reaches all of it.
 *
 * Rules this module exists to keep:
 *
 * - **The eye moves on the engine's clock, never on one of its own.** A frame's position is the
 *   ride's (`RideSample`: `t`, `x`, `z`, `v`), read between the two samples that bracket the
 *   frame's time, linearly — the integrator already records every turning point exactly, so no
 *   speed is invented and no physics is run during the playback. One second on the screen is one
 *   second of the ride.
 * - **The whole motion, swings back included,** to its last computed instant: the arrival at B, the
 *   Point d'arrêt, or — for a ride that never settles — the last turn the engine computed, said as
 *   such. Not the first pass the Dynamique charts plot.
 * - **The eye stands inside the gabarit du passager**, {@link VUE_EMBARQUEE}'s 1,6 m above its foot
 *   — an upright body hanging to the bottom of the envelope — and never above the pulley: a gabarit
 *   shorter than that puts the eye at the pulley. A `[CONVENTION]`, a drawing choice; the ride's
 *   point is the pulley's, on the Trajectoire as the Vue 3D draws it, straight (the Banane is the
 *   Ligne à vide's).
 * - **The look is the reader's, not the ride's.** The heading turns a full circle and the pitch
 *   within the Vue 3D's own range, by keys, buttons or a drag; neither follows the direction of
 *   travel, so a swing back carries the eye backward with the look held where it was.
 * - **No ride, no Vue embarquée.** A Scenario whose rides are withheld, a ride that never leaves the
 *   departure, and a line being dragged — whose rides are the last release's — propose no motion
 *   (`embarkBlock`).
 */

import type { Ride, RideEnd } from "@/lib/sim";

import type { CameraPose, Key } from "./vue-3d-camera.ts";
import type { EarthPoint, Vue3dPlacement } from "./vue-3d.ts";

import { localPlane } from "./measure.ts";
import { CAMERA_STEP, PITCH_RANGE } from "./vue-3d-camera.ts";
import { earthFrame } from "./vue-3d.ts";

/** The Vue embarquée's `[CONVENTION]`s: where the eye stands in the gabarit, and how far a press turns it. */
export const VUE_EMBARQUEE = {
  /**
   * The eye's height above the foot of the gabarit du passager, m: an upright body of about 1,75 m
   * whose feet reach the bottom of the envelope.
   */
  eyeAboveFootM: 1.6,
  /** Degrees one press of « tourner la tête » turns the heading. */
  lookStepDeg: 15,
  /** Degrees one press of « lever / baisser les yeux » turns the pitch: the Gimbal's tilt step. */
  tiltStepDeg: CAMERA_STEP.tiltDeg,
  /** Degrees a drag turns the look per CSS pixel. */
  dragDegPerPx: 0.25,
  /** The pitch the look starts at, degrees: a little under the horizon, the line ahead in view. */
  pitchDeg: -5,
} as const;

/** The key that enters the Vue embarquée from the Vue 3D, after the Vues prédéfinies' 1 and 2. */
export const EMBARK_KEY = "3";

/**
 * How far below the pulley the eye stands, m: {@link VUE_EMBARQUEE}'s eye height counted up from the
 * gabarit's foot, never above the pulley and never below the gabarit.
 *
 * @param hRider the gabarit du passager, m.
 */
export function eyeBelowPulley(hRider: number): number {
  if (!(hRider > 0)) return 0;
  return Math.min(hRider, Math.max(0, hRider - VUE_EMBARQUEE.eyeAboveFootM));
}

/** One instant of the ride, placed: the engine's time, abscissa and speed, and where the eye stands. */
export type EmbarkedSample = {
  /** Time since the departure, s. */
  readonly t: number;
  /** The pulley's horizontal position, m from A. */
  readonly x: number;
  /** Speed along the trajectory, m/s — signed, positive toward B. */
  readonly v: number;
  readonly eye: EarthPoint;
};

/** A ride, placed on the earth for the Vue embarquée. */
export type Vue3dRide = {
  /** The ride's samples in time order, the eye placed under each — at least two. */
  readonly samples: readonly EmbarkedSample[];
  /** How the ride ends: the playback stops there, and says so. */
  readonly end: RideEnd;
  /** The last computed instant, s: where the playback stops. */
  readonly duration: number;
  /** The heading of A → B, degrees clockwise from north: where the look starts. */
  readonly lineHeadingDeg: number;
  /** How far below the pulley the eye stands, m. */
  readonly eyeBelowM: number;
};

/** Why the Vue embarquée is off: no ride read, a ride with no motion, or a line being dragged. */
export type EmbarkBlock = "no-ride" | "no-motion" | "gesture";

/**
 * Can the Vue embarquée stand?
 *
 * @param ride the ride the gates leave, `null` when none is read.
 * @param placed that ride placed by {@link vue3dRide}, `null` when it never leaves the departure.
 * @param idle the gesture machine waits for a gesture: while an anchor moves or its profil loads,
 *   the rides on hand are the last release's, another line's.
 */
export function embarkBlock(
  ride: Ride | null,
  placed: Vue3dRide | null,
  idle: boolean,
): EmbarkBlock | null {
  if (!idle) return "gesture";
  if (ride === null) return "no-ride";
  if (placed === null) return "no-motion";
  return null;
}

/**
 * The ride with the eye placed under each sample, on the line the Vue 3D stands on the earth.
 *
 * @param placement where the Vue 3D stands the engine's frame: the ride's `x` and `z` are in it.
 * @param hRider the gabarit du passager, m.
 * @returns `null` for a ride that never leaves the departure — one sample, or no time elapsed.
 */
export function vue3dRide({
  placement: { ends, frame, bases },
  ride,
  hRider,
}: {
  placement: Vue3dPlacement;
  ride: Ride;
  hRider: number;
}): Vue3dRide | null {
  const last = ride.samples.at(-1);
  if (ride.samples.length < 2 || last === undefined || !(last.t > 0)) return null;
  const onEarth = earthFrame({ ends, L: frame.L, topA: bases.zBaseA + frame.anchors.zA });
  const eyeBelowM = eyeBelowPulley(hRider);
  const plane = localPlane(ends.A, ends.B);
  const b = plane.metres(ends.B);
  return {
    samples: ride.samples.map(({ t, x, z, v }) => ({ t, x, v, eye: onEarth(x, z - eyeBelowM) })),
    end: ride.end,
    duration: last.t,
    lineHeadingDeg:
      b.east === 0 && b.north === 0 ? 0 : normalise(degrees(Math.atan2(b.east, b.north))),
    eyeBelowM,
  };
}

/**
 * The ride at time `t`, read between the two samples that bracket it. Before the departure it is the
 * departure, past the last instant the last instant. At a turning point, where two samples share one
 * time, the later one is read.
 */
export function rideFrame(ride: Vue3dRide, t: number): EmbarkedSample {
  const { samples } = ride;
  const first = samples[0] as EmbarkedSample;
  const at = Math.min(ride.duration, Math.max(0, Number.isFinite(t) ? t : 0));
  // The last sample at or before `at`.
  let lo = 0;
  let hi = samples.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if ((samples[mid] as EmbarkedSample).t <= at) lo = mid;
    else hi = mid - 1;
  }
  const before = samples[lo] ?? first;
  const after = samples[lo + 1];
  if (after === undefined || after.t <= before.t) return { ...before, t: at };
  const f = (at - before.t) / (after.t - before.t);
  const mix = (a: number, b: number) => a + (b - a) * f;
  return {
    t: at,
    x: mix(before.x, after.x),
    v: mix(before.v, after.v),
    eye: {
      lon: mix(before.eye.lon, after.eye.lon),
      lat: mix(before.eye.lat, after.eye.lat),
      altitude: mix(before.eye.altitude, after.eye.altitude),
    },
  };
}

/**
 * The playback's clock, on the screen's milliseconds: the ride time it holds, and since when it
 * runs — `null` while paused.
 */
export type RideClock = {
  /** The ride time held, s: where a paused clock stands, and where a running one started from. */
  readonly at: number;
  /** The screen time it started running, ms — `null` while paused. */
  readonly sinceMs: number | null;
};

/** The ride time a clock shows at `nowMs`, s: one second of the ride per second, held at the end. */
export function clockTime({ at, sinceMs }: RideClock, nowMs: number, duration: number): number {
  const t = sinceMs === null ? at : at + Math.max(0, nowMs - sinceMs) / 1000;
  return Math.min(duration, Math.max(0, t));
}

/** Where the reader looks: heading clockwise from north and pitch up positive, degrees. */
export type Look = { readonly headingDeg: number; readonly pitchDeg: number };

/** The Vue embarquée's state: the playback's clock and the look. */
export type Embarked = { readonly clock: RideClock; readonly look: Look };

/** What a key or a button asks of the Vue embarquée. */
export type EmbarkedCommand =
  | { readonly kind: "play" }
  | { readonly kind: "pause" }
  /** Play when paused or at the end, pause when playing — the space bar. */
  | { readonly kind: "toggle" }
  /** Back to the departure, playing. */
  | { readonly kind: "restart" }
  /** The heading: `+1` to the right. */
  | { readonly kind: "look"; readonly step: 1 | -1 }
  /** The pitch: `+1` up. */
  | { readonly kind: "tilt"; readonly step: 1 | -1 }
  /** Out of the Vue embarquée: the host's to act on. */
  | { readonly kind: "exit" };

/** The Vue embarquée as it opens: paused at the departure, looking along A → B. */
export function openEmbarked(ride: Vue3dRide): Embarked {
  return {
    clock: { at: 0, sinceMs: null },
    look: { headingDeg: ride.lineHeadingDeg, pitchDeg: VUE_EMBARQUEE.pitchDeg },
  };
}

/** Is the playback running at `nowMs`? A clock past the end has stopped. */
export function playing(state: Embarked, nowMs: number, duration: number): boolean {
  return state.clock.sinceMs !== null && clockTime(state.clock, nowMs, duration) < duration;
}

/**
 * The state after a command at `nowMs`. Playing from the end starts over; pausing holds the time
 * shown; « exit » changes nothing here.
 */
export function embarkedStep(
  state: Embarked,
  command: EmbarkedCommand,
  nowMs: number,
  duration: number,
): Embarked {
  const { clock, look } = state;
  const t = clockTime(clock, nowMs, duration);
  switch (command.kind) {
    case "play":
      if (playing(state, nowMs, duration)) return state;
      return { look, clock: { at: t >= duration ? 0 : t, sinceMs: nowMs } };
    case "pause":
      return { look, clock: { at: t, sinceMs: null } };
    case "toggle":
      return embarkedStep(
        state,
        { kind: playing(state, nowMs, duration) ? "pause" : "play" },
        nowMs,
        duration,
      );
    case "restart":
      return { look, clock: { at: 0, sinceMs: nowMs } };
    case "look":
      return {
        clock,
        look: {
          ...look,
          headingDeg: normalise(look.headingDeg + command.step * VUE_EMBARQUEE.lookStepDeg),
        },
      };
    case "tilt":
      return {
        clock,
        look: {
          ...look,
          pitchDeg: pitchIn(look.pitchDeg + command.step * VUE_EMBARQUEE.tiltStepDeg),
        },
      };
    case "exit":
      return state;
  }
}

/**
 * The look after a drag of `dx`, `dy` CSS pixels: the view is grabbed, so a drag to the right turns
 * the head to the left and a drag down raises the eyes.
 */
export function lookDragged(look: Look, dx: number, dy: number): Look {
  const k = VUE_EMBARQUEE.dragDegPerPx;
  return {
    headingDeg: normalise(look.headingDeg - dx * k),
    pitchDeg: pitchIn(look.pitchDeg + dy * k),
  };
}

/** Where the camera stands at `nowMs`: the eye at the clock's time, looking where the reader does. */
export function embarkedPose(ride: Vue3dRide, state: Embarked, nowMs: number): CameraPose {
  const { eye } = rideFrame(ride, clockTime(state.clock, nowMs, ride.duration));
  return { destination: eye, headingDeg: state.look.headingDeg, pitchDeg: state.look.pitchDeg };
}

/** What the Vue embarquée's read-out prints at an instant. */
export type EmbarkedReading = {
  /** The ride time, s. */
  readonly t: number;
  readonly duration: number;
  /** The pulley's abscissa, m from A. */
  readonly x: number;
  /** The speed along the trajectory, m/s, signed: negative on a swing back. */
  readonly v: number;
  readonly playing: boolean;
  /** The last computed instant is reached. */
  readonly ended: boolean;
  readonly end: RideEnd;
};

export function embarkedReading(ride: Vue3dRide, state: Embarked, nowMs: number): EmbarkedReading {
  const frame = rideFrame(ride, clockTime(state.clock, nowMs, ride.duration));
  return {
    t: frame.t,
    duration: ride.duration,
    x: frame.x,
    v: frame.v,
    playing: playing(state, nowMs, ride.duration),
    ended: frame.t >= ride.duration,
    end: ride.end,
  };
}

/**
 * The command a key asks of the Vue embarquée, or `null` when the key is not its. The arrows turn
 * the head — there is no walking on a pulley — the space bar plays and pauses, R starts over and
 * Escape leaves.
 */
export function embarkedKeyCommand({ key, ctrlKey, altKey, metaKey }: Key): EmbarkedCommand | null {
  if (ctrlKey || altKey || metaKey) return null;
  switch (key) {
    case "ArrowLeft":
      return { kind: "look", step: -1 };
    case "ArrowRight":
      return { kind: "look", step: 1 };
    case "ArrowUp":
      return { kind: "tilt", step: 1 };
    case "ArrowDown":
      return { kind: "tilt", step: -1 };
    case " ":
      return { kind: "toggle" };
    case "r":
    case "R":
      return { kind: "restart" };
    case "Escape":
      return { kind: "exit" };
    default:
      return null;
  }
}

/** The key that enters the Vue embarquée, with no modifier: {@link EMBARK_KEY}. */
export function isEmbarkKey({ key, ctrlKey, altKey, metaKey }: Key): boolean {
  return key === EMBARK_KEY && !ctrlKey && !altKey && !metaKey;
}

function pitchIn(deg: number): number {
  return Math.min(PITCH_RANGE.max, Math.max(PITCH_RANGE.min, deg));
}

function normalise(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function degrees(rad: number): number {
  return (rad * 180) / Math.PI;
}
