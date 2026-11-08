/**
 * The shipped line, ridden under a chosen wind (#92) — what the Page Dynamique's tests pose their
 * questions on. Built as the Page builds it: the frame, the solved half, then the two rides.
 */

import type { ScenarioDraft } from "@/lib/scenario/types.ts";
import type { Trace } from "@/lib/terrain/trace.ts";

import { buildSceneBase, buildSceneFrame } from "@/lib/chart/scene.ts";
import { readDynamics } from "@/lib/scenario/dynamics.ts";
import { firstRunDefaults } from "@/lib/scenario/first-run.ts";
import { sweepRiderOf } from "@/lib/scenario/traverse.ts";
import { deriveUnloaded, unloadedInputs } from "@/lib/scenario/unloaded.ts";

import { dynamiqueOutputs } from "../outputs.ts";

export const SHIPPED = firstRunDefaults() as ScenarioDraft;

/**
 * A profil that starts at 540 m and falls 10 m to B, 150 m on — the altitudes a hover reads off it
 * are known without running anything.
 */
export const PROFIL: Trace = {
  d: Float64Array.from([0, 50, 100, 150]),
  z: Float64Array.from([540, 536, 533, 530]),
  dev: null,
  origin: { kind: "lien" },
};

/** The shipped Scenario riding on {@link PROFIL}: the imported profil is the line's ground. */
export const ON_PROFIL: ScenarioDraft = {
  ...SHIPPED,
  geometry: { source: "trace", trace: "fixture" },
};

/**
 * @param directionDeg where the wind comes from: 0 is a head wind, 180 a tail wind.
 * @param profil the imported profil, for a Scenario whose geometry is `trace`.
 */
export function ridesUnder(
  speedKmh: number,
  directionDeg: number,
  scenario = SHIPPED,
  profil: Trace | null = null,
) {
  const withWind = { ...scenario, wind: { speedKmh, directionDeg } };
  const unloaded = deriveUnloaded(unloadedInputs(withWind, profil));
  const frame = buildSceneFrame(unloaded.span);
  const base = buildSceneBase(frame, unloaded, sweepRiderOf(withWind));
  if (frame === null || base === null) throw new Error("the shipped line solves");
  const reading = readDynamics(withWind, base, base, profil);
  if (reading === null) throw new Error("a complete traverse has a ride");
  const outputs = dynamiqueOutputs(reading, withWind.material.family);
  return { frame, base, reading, outputs, solved: { base, rides: { reading, outputs } } };
}
