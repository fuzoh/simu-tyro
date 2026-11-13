/**
 * The Vue embarquée (#126): where the eye stands in the gabarit, how the playback reads the engine's
 * ride at each instant, what each command and key does to the clock and the look, and when no motion
 * is proposed.
 *
 * The hand-made ride is a closed form: a straight descent to x 100 m in 10 s, a slowing to the turn at
 * x 150 m at 20 s — two samples at that instant, as the integrator records a turn — then a swing back
 * to its Point d'arrêt at x 120 m at 30 s. The line it rides is the Dynamique fixture's 150 m on its
 * profil, stood due north, so the eye's latitude is `x / L` of the way from A to B and its altitude
 * anchor A's plus `z` less the eye's drop, by hand.
 */

import { describe, expect, test } from "vitest";

import type { Ride } from "@/lib/sim";

import {
  DUE_NORTH,
  ON_PROFIL,
  PROFIL,
  ridesUnder,
  SHIPPED,
} from "@/lib/dynamique/__fixtures__/rides.ts";

import type { Key } from "./vue-3d-camera.ts";
import type { Embarked, Vue3dRide } from "./vue-3d-embarquee.ts";
import type { Vue3dPlacement } from "./vue-3d.ts";

import { PITCH_RANGE } from "./vue-3d-camera.ts";
import {
  clockTime,
  EMBARK_KEY,
  openEmbarked,
  embarkBlock,
  embarkedKeyCommand,
  embarkedPose,
  embarkedReading,
  embarkedStep,
  eyeBelowPulley,
  isEmbarkKey,
  lookDragged,
  playing,
  rideFrame,
  VUE_EMBARQUEE,
  vue3dRide,
} from "./vue-3d-embarquee.ts";

const { frame } = ridesUnder(0, 0, ON_PROFIL, PROFIL);
const bases = frame.bases;
if (bases === null) throw new Error("a line on its profil has the altitude under its anchors");
const { A, B } = DUE_NORTH;
if (A === null || B === null) throw new Error("the fixture places both anchors");
const PLACEMENT: Vue3dPlacement = { ends: { A, B }, frame, bases };
const TOP_A = bases.zBaseA + frame.anchors.zA;

const sample = (t: number, x: number, z: number, v: number) => ({ t, x, z, v, a: 0 });

const SWING: Ride = {
  samples: [
    sample(0, 0, 0, 0),
    sample(10, 100, -10, 10),
    sample(20, 150, -12, 0),
    sample(20, 150, -12, 0),
    sample(30, 120, -11, 0),
  ],
  end: { kind: "stop", x: 120, t: 30 },
};

function placed(ride: Ride = SWING, hRider = 2.1): Vue3dRide {
  const at = vue3dRide({ placement: PLACEMENT, ride, hRider });
  if (at === null) throw new Error("the ride moves");
  return at;
}

function key(name: string, mods: Partial<Key> = {}): Key {
  return { key: name, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, ...mods };
}

describe("the eye in the gabarit du passager", () => {
  test("stands 1,6 m above the gabarit's foot: 0,5 m under the pulley for the shipped 2,1 m", () => {
    expect(VUE_EMBARQUEE.eyeAboveFootM).toBe(1.6);
    expect(eyeBelowPulley(2.1)).toBeCloseTo(0.5, 12);
    expect(eyeBelowPulley(3)).toBeCloseTo(1.4, 12);
  });

  test("never above the pulley, never below the gabarit", () => {
    expect(eyeBelowPulley(1.2)).toBe(0);
    expect(eyeBelowPulley(0)).toBe(0);
    expect(eyeBelowPulley(Number.NaN)).toBe(0);
    for (const hRider of [0.5, 1.6, 2.1, 4]) {
      const drop = eyeBelowPulley(hRider);
      expect(drop).toBeGreaterThanOrEqual(0);
      expect(drop).toBeLessThanOrEqual(hRider);
    }
  });
});

describe("the ride placed on the earth", () => {
  test("puts the eye under each sample, on the line the Vue 3D draws, its drop below the pulley", () => {
    const ride = placed();
    expect(ride.eyeBelowM).toBeCloseTo(0.5, 12);
    expect(ride.duration).toBe(30);
    expect(ride.end).toEqual(SWING.end);
    SWING.samples.forEach(({ t, x, z, v }, i) => {
      const at = ride.samples[i];
      expect(at?.t).toBe(t);
      expect(at?.x).toBe(x);
      expect(at?.v).toBe(v);
      expect(at?.eye.lon).toBeCloseTo(A.lon, 12);
      expect(at?.eye.lat).toBeCloseTo(A.lat + (x / frame.L) * (B.lat - A.lat), 12);
      expect(at?.eye.altitude).toBeCloseTo(TOP_A + z - 0.5, 9);
    });
  });

  test("looks along A → B to start with: due north on a line that runs north", () => {
    expect(placed().lineHeadingDeg).toBeCloseTo(0, 9);
    expect(openEmbarked(placed()).look).toEqual({
      headingDeg: placed().lineHeadingDeg,
      pitchDeg: -5,
    });
  });

  test("is no ride where the passager never leaves the departure", () => {
    const still: Ride = { samples: [sample(0, 0, 0, 0)], end: { kind: "stop", x: 0, t: 0 } };
    expect(vue3dRide({ placement: PLACEMENT, ride: still, hRider: 2.1 })).toBeNull();
    const noTime: Ride = {
      samples: [sample(0, 0, 0, 0), sample(0, 0, 0, 0)],
      end: { kind: "stop", x: 0, t: 0 },
    };
    expect(vue3dRide({ placement: PLACEMENT, ride: noTime, hRider: 2.1 })).toBeNull();
  });
});

describe("the ride at an instant", () => {
  const ride = placed();

  test("is the engine's sample at a sample's time", () => {
    for (const [i, at] of ride.samples.entries()) {
      if (i === 2) continue; // the turn's first record: the later one is read at that instant
      expect(rideFrame(ride, at.t)).toEqual(at);
    }
  });

  test("is read linearly between the two samples that bracket it — no speed of its own", () => {
    const at = rideFrame(ride, 5);
    expect(at.t).toBe(5);
    expect(at.x).toBeCloseTo(50, 12);
    expect(at.v).toBeCloseTo(5, 12);
    expect(at.eye.altitude).toBeCloseTo(TOP_A - 5 - 0.5, 9);
    expect(rideFrame(ride, 15).x).toBeCloseTo(125, 12);
  });

  test("follows the swing back after the turn, to the Point d'arrêt", () => {
    expect(rideFrame(ride, 20).x).toBe(150);
    expect(rideFrame(ride, 25).x).toBeCloseTo(135, 12);
    expect(rideFrame(ride, 30).x).toBe(120);
  });

  test("holds the departure before it and the last instant past it", () => {
    expect(rideFrame(ride, -3)).toEqual({ ...ride.samples[0], t: 0 });
    expect(rideFrame(ride, 99).x).toBe(120);
    expect(rideFrame(ride, 99).t).toBe(30);
    expect(rideFrame(ride, Number.NaN).t).toBe(0);
  });

  test("on a real line that swings back, reaches the engine's farthest point and its Point d'arrêt", () => {
    // 150 m, B 3 m below A, a head wind: both rides swing back before they settle.
    const gentle = { ...SHIPPED, geometry: { source: "manual", L: 150, h: -3 } } as typeof SHIPPED;
    const { reading } = ridesUnder(40, 0, gentle);
    const real = placed(reading.windy);
    const farthest = Math.max(...reading.windy.samples.map((one) => one.x));
    let reached = 0;
    for (let t = 0; t <= real.duration; t += real.duration / 2000) {
      reached = Math.max(reached, rideFrame(real, t).x);
    }
    expect(reached).toBeCloseTo(farthest, 0);
    const { end } = reading.windy;
    if (end.kind !== "stop") throw new Error("the gentle line stops the passager");
    expect(real.duration).toBe(end.t);
    expect(rideFrame(real, real.duration).x).toBe(end.x);
    expect(end.x).toBeLessThan(farthest);
  });
});

describe("the playback's clock", () => {
  const ride = placed();
  const D = ride.duration;
  const start = openEmbarked(ride);

  test("opens paused at the departure", () => {
    expect(start.clock).toEqual({ at: 0, sinceMs: null });
    expect(clockTime(start.clock, 123_456, D)).toBe(0);
    expect(playing(start, 123_456, D)).toBe(false);
  });

  test("plays one second of the ride per second of the screen, and the eye with it", () => {
    const on = embarkedStep(start, { kind: "play" }, 1000, D);
    expect(playing(on, 1000, D)).toBe(true);
    expect(clockTime(on.clock, 6000, D)).toBe(5);
    expect(embarkedPose(ride, on, 6000).destination).toEqual(rideFrame(ride, 5).eye);
    expect(embarkedReading(ride, on, 26_000)).toMatchObject({
      t: 25,
      x: rideFrame(ride, 25).x,
      playing: true,
      ended: false,
    });
  });

  test("pause holds the instant shown, and play goes on from it", () => {
    const on = embarkedStep(start, { kind: "play" }, 0, D);
    const held = embarkedStep(on, { kind: "pause" }, 4000, D);
    expect(clockTime(held.clock, 60_000, D)).toBe(4);
    expect(playing(held, 60_000, D)).toBe(false);
    const again = embarkedStep(held, { kind: "play" }, 60_000, D);
    expect(clockTime(again.clock, 61_000, D)).toBe(5);
  });

  test("stops at the last computed instant, and says it ended", () => {
    const on = embarkedStep(start, { kind: "play" }, 0, D);
    expect(clockTime(on.clock, 45_000, D)).toBe(30);
    expect(playing(on, 45_000, D)).toBe(false);
    expect(embarkedReading(ride, on, 45_000)).toMatchObject({ t: 30, x: 120, ended: true });
  });

  test("restart puts the camera back at the departure, playing, wherever the clock stood", () => {
    const on = embarkedStep(start, { kind: "play" }, 0, D);
    for (const nowMs of [12_000, 45_000]) {
      const over = embarkedStep(on, { kind: "restart" }, nowMs, D);
      expect(clockTime(over.clock, nowMs, D)).toBe(0);
      expect(embarkedPose(ride, over, nowMs).destination).toEqual(ride.samples[0]?.eye);
      expect(playing(over, nowMs, D)).toBe(true);
    }
  });

  test("play at the end starts over; the space bar plays and pauses", () => {
    const on = embarkedStep(start, { kind: "play" }, 0, D);
    const fromEnd = embarkedStep(on, { kind: "play" }, 45_000, D);
    expect(clockTime(fromEnd.clock, 46_000, D)).toBe(1);
    const toggled = embarkedStep(start, { kind: "toggle" }, 0, D);
    expect(playing(toggled, 0, D)).toBe(true);
    expect(playing(embarkedStep(toggled, { kind: "toggle" }, 2000, D), 9000, D)).toBe(false);
  });

  test("play while playing keeps the clock as it is", () => {
    const on = embarkedStep(start, { kind: "play" }, 0, D);
    expect(embarkedStep(on, { kind: "play" }, 5000, D)).toBe(on);
  });
});

describe("the look, free of the motion", () => {
  const ride = placed();
  const D = ride.duration;
  const start = openEmbarked(ride);

  test("turns a full circle by steps, during the playback and paused alike", () => {
    let state: Embarked = embarkedStep(start, { kind: "play" }, 0, D);
    for (let i = 0; i < 360 / VUE_EMBARQUEE.lookStepDeg; i++) {
      state = embarkedStep(state, { kind: "look", step: 1 }, i * 100, D);
    }
    expect(state.look.headingDeg).toBeCloseTo(start.look.headingDeg, 9);
    // The clock ran on through the turns.
    expect(clockTime(state.clock, 5000, D)).toBe(5);
    const paused = embarkedStep(state, { kind: "pause" }, 5000, D);
    const left = embarkedStep(paused, { kind: "look", step: -1 }, 9000, D);
    expect(left.look.headingDeg).toBeCloseTo(360 - VUE_EMBARQUEE.lookStepDeg, 9);
    expect(left.clock).toBe(paused.clock);
  });

  test("the look is the camera's heading and pitch, whatever the direction of travel", () => {
    const on = embarkedStep(start, { kind: "play" }, 0, D);
    const turned = embarkedStep(on, { kind: "look", step: 1 }, 0, D);
    // Going toward B at 5 s, coming back at 25 s: the look does not follow the swing.
    for (const nowMs of [5000, 25_000]) {
      const pose = embarkedPose(ride, turned, nowMs);
      expect(pose.headingDeg).toBe(turned.look.headingDeg);
      expect(pose.pitchDeg).toBe(turned.look.pitchDeg);
    }
  });

  test("the pitch stays in the Vue 3D's range", () => {
    let state = start;
    for (let i = 0; i < 40; i++) state = embarkedStep(state, { kind: "tilt", step: 1 }, 0, D);
    expect(state.look.pitchDeg).toBe(PITCH_RANGE.max);
    for (let i = 0; i < 40; i++) state = embarkedStep(state, { kind: "tilt", step: -1 }, 0, D);
    expect(state.look.pitchDeg).toBe(PITCH_RANGE.min);
  });

  test("a drag grabs the view: right turns the head left, down raises the eyes", () => {
    const look = { headingDeg: 10, pitchDeg: 0 };
    const k = VUE_EMBARQUEE.dragDegPerPx;
    expect(lookDragged(look, 100, 0).headingDeg).toBeCloseTo(normalised(10 - 100 * k), 9);
    expect(lookDragged(look, 0, 40).pitchDeg).toBeCloseTo(40 * k, 9);
    expect(lookDragged(look, 0, 10_000).pitchDeg).toBe(PITCH_RANGE.max);
    // A whole circle of drag comes back where it started.
    expect(lookDragged(look, 360 / k, 0).headingDeg).toBeCloseTo(10, 9);
  });

  test("exit changes nothing here: leaving is the host's", () => {
    expect(embarkedStep(start, { kind: "exit" }, 0, D)).toBe(start);
  });
});

describe("the keys of the Vue embarquée", () => {
  test("the arrows turn the head, space plays and pauses, R starts over, Escape leaves", () => {
    expect(embarkedKeyCommand(key("ArrowLeft"))).toEqual({ kind: "look", step: -1 });
    expect(embarkedKeyCommand(key("ArrowRight"))).toEqual({ kind: "look", step: 1 });
    expect(embarkedKeyCommand(key("ArrowUp"))).toEqual({ kind: "tilt", step: 1 });
    expect(embarkedKeyCommand(key("ArrowDown", { shiftKey: true }))).toEqual({
      kind: "tilt",
      step: -1,
    });
    expect(embarkedKeyCommand(key(" "))).toEqual({ kind: "toggle" });
    expect(embarkedKeyCommand(key("r"))).toEqual({ kind: "restart" });
    expect(embarkedKeyCommand(key("R"))).toEqual({ kind: "restart" });
    expect(embarkedKeyCommand(key("Escape"))).toEqual({ kind: "exit" });
  });

  test("the camera's own keys and a key held with Ctrl, Alt or Meta are not its", () => {
    for (const name of ["+", "-", "1", "2", "n", "a"])
      expect(embarkedKeyCommand(key(name))).toBeNull();
    for (const mod of ["ctrlKey", "altKey", "metaKey"] as const) {
      expect(embarkedKeyCommand(key("ArrowLeft", { [mod]: true }))).toBeNull();
      expect(isEmbarkKey(key(EMBARK_KEY, { [mod]: true }))).toBe(false);
    }
  });

  test("3 enters it, after the Vues prédéfinies' 1 and 2", () => {
    expect(EMBARK_KEY).toBe("3");
    expect(isEmbarkKey(key("3"))).toBe(true);
    expect(isEmbarkKey(key("2"))).toBe(false);
  });
});

describe("when no motion is proposed", () => {
  test("no ride read, a ride that never moves, a line being dragged", () => {
    const ride = placed();
    expect(embarkBlock(SWING, ride, true)).toBeNull();
    expect(embarkBlock(null, null, true)).toBe("no-ride");
    expect(embarkBlock(SWING, null, true)).toBe("no-motion");
    // While an anchor moves, the rides on hand are the last release's.
    expect(embarkBlock(SWING, ride, false)).toBe("gesture");
  });
});

function normalised(deg: number): number {
  return ((deg % 360) + 360) % 360;
}
