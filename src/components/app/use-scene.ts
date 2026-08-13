/**
 * The `useSweep` seam — « v1 build spec » § 2 (*Execution model: synchronous and pure forever*:
 * « the app's only access to it is one hook ») and § 7 (« the real performance mechanism is the
 * memo on the solve inputs behind the `useSweep` seam, not subscription granularity »).
 *
 * **One sweep per parameter change, shared by both consumers.** A8 kept this memo inside the Chart
 * Block because the chart was its only reader; A10's output half reads the same traverse — `T max`,
 * the garde, the coverage and the verdict all come off it — and a second `useMemo` in the Rail
 * would run the sweep and the §11 reducer **twice** on every keystroke, doubling the one measured
 * cost in the app (p95 1,30 ms at 240 steps). So the memo is lifted to the app root and the value
 * is passed down.
 *
 * **The frame is a memo of its own, above the sweep.** § 8 suppresses the solved half and the input
 * half for different reasons and by different amounts, so the two cannot share one `null`: a blank
 * textile `MBL` is « Aucun résultat », where terrain, both anchors and the span markers still draw,
 * while an invalid `L` is the *exception géométrique* that collapses both plots.
 *
 * **`x_D` is deliberately not a dependency.** {@link sceneInputs} omits it, which is what makes a
 * drag cheap: `placeRider` is the only half a `pointermove` re-runs, and it stays in the Chart
 * Block where the rider lives. Keying this on the whole Scenario would undo that — a scrub
 * dispatches a new Scenario on every frame.
 *
 * `status` never reports `"computing"` in v1 and there is no worker: measured, not felt (p95
 * 1,30 ms against an 8 ms criterion). The seam survives anyway because stale-while-recomputing is
 * needed regardless — a pretension drag must keep drawing the last good profile.
 */

import { useMemo } from "react";

import type { SceneBase, SceneFrame } from "@/lib/chart/scene.ts";

import { buildSceneBase, buildSceneFrame } from "@/lib/chart/scene.ts";

import { useAppState } from "./store.tsx";

/** The two tiers § 8 suppresses separately. Either may be `null`, and they mean different things. */
export type Scene = {
  /**
   * The input half — terrain, both anchors, the span markers, the 5 % margin. `null` **only** for
   * § 8's *exception géométrique*: an invalid `L` / `h` / station, where there is no shared x
   * domain at all and both plots collapse to an empty frame with an inert scrub track.
   */
  readonly frame: SceneFrame | null;
  /**
   * The solved half. `null` is § 8's « Aucun résultat » — a textile draft with blanks, an
   * unreachable tightness target, a refused solve — and it removes the cable, the unloaded line,
   * the clearance curve, the danger bands and the rider **while the frame keeps drawing**.
   */
  readonly solved: SceneBase | null;
};

/**
 * The scene, in its two tiers: the placement, then the material chain, `L₀`, the unloaded solve,
 * the sweep and §11 over it.
 *
 * The frame is memoised on its own inputs, which are a strict subset of the solve's: a blank `MBL`
 * or an unreachable pretension re-runs the solve and leaves the drawn terrain, the towers and the
 * shared domain untouched — which is what makes § 8's « les entrées se dessinent toujours »
 * structural rather than a branch in the view.
 *
 * **Which** failure produced a `null` is the error surfaces' business (A11); every consumer here
 * only needs to know how much picture it has.
 */
export function useScene(): Scene {
  const { scenario, trace } = useAppState();
  const { anchors, geometry, material, rider, tightness } = scenario;

  // Every dependency survives a scrub untouched: `scénario/modifié` merges its patch shallowly, so
  // a rider patch leaves `geometry`, `anchors`, `material` and `tightness` identical.
  const frame = useMemo(
    () => buildSceneFrame({ anchors, geometry, trace }),
    [anchors, geometry, trace],
  );

  const solved = useMemo(
    () =>
      buildSceneBase(
        {
          anchors,
          geometry,
          hRider: rider.hRider,
          material,
          mp: rider.mp,
          tightness,
          trace,
        },
        frame,
      ),
    [anchors, geometry, material, tightness, rider.mp, rider.hRider, trace, frame],
  );

  return { frame, solved };
}
