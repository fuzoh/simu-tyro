/**
 * The vue de dessus's share of §19.11's traces (#118): the Ligne à vide, the loaded line at the
 * passager and the Trajectoire, in the very `(x, y, z)` the coupe and the Vue 3D project, seen from
 * above — `(x, y)`. The ligne A–B is the map's own line between the two Positions, which no
 * calculation moves; it is not here.
 *
 * Rules this module exists to keep:
 *
 * - **No shape of the view's own.** Every vertex is the scene's (`SceneBase.unloadedCable`,
 *   `SceneRider.cable`, `SceneBase.trajectory`), in the engine's node order, placed by the Vue 3D's
 *   projector ({@link planFrame}). Without wind every `y` is nil and the traces lie on A–B; nothing
 *   reads the wind here, so no qualitative bow can come back.
 * - **Each trace is available on its own** (§19.11): the loaded line goes where the chosen
 *   position has none, the Trajectoire is one line per run between holes, and the Ligne à vide
 *   stands whenever the line solved.
 * - **The View Strip's layers decide, as on the coupe and in the Vue 3D** (`Vue3dLayers`): the
 *   Ligne à vide and the Trajectoire show or hide by their toggles, the loaded line always shows.
 */

import type { SceneBase, SceneRider, SpaceLine } from "@/lib/chart/scene.ts";
import type { Position } from "@/lib/scenario/types.ts";
import type { TraceEnds } from "@/lib/terrain/trace.ts";

import { noLoadedLine } from "@/lib/chart/copy.ts";
import { loadedLineHole } from "@/lib/chart/scene.ts";

import type { Vue3dLayers } from "./vue-3d.ts";

import { planFrame, type vue3dPlacement } from "./vue-3d.ts";

/** The traces a vue de dessus draws, in §19.2's frame, each `null` or empty when unavailable. */
export type SpanTraces = {
  /** Portée, m: `x` runs from 0 at A to `L` at B. */
  readonly L: number;
  readonly unloaded: SpaceLine | null;
  readonly loaded: SpaceLine | null;
  readonly trajectory: readonly SpaceLine[];
};

/**
 * What the vue de dessus draws of the solved line.
 *
 * @param solved the solved half, or `null` under « Aucun résultat » — then nothing.
 * @param rider the passager placed at the Scenario's `x_D`, or `null` where the chosen position has
 *   no loaded line.
 * @param layers the View Strip's toggles, as the Vue 3D reads them.
 */
export function spanTraces({
  solved,
  rider,
  layers,
}: {
  solved: SceneBase | null;
  rider: SceneRider | null;
  layers: Pick<Vue3dLayers, "unloaded" | "trajectory">;
}): SpanTraces | null {
  if (solved === null) return null;
  return {
    L: solved.L,
    unloaded: layers.unloaded ? solved.unloadedCable : null,
    loaded: rider?.cable ?? null,
    trajectory: layers.trajectory ? solved.trajectory : [],
  };
}

/** {@link SpanTraces} on the map: WGS84 degrees, one list of Positions per line. */
export type PlanTraces = {
  readonly unloaded: readonly Position[] | null;
  readonly loaded: readonly Position[] | null;
  readonly trajectory: readonly (readonly Position[])[];
};

/** The traces placed on the two Positions the line was solved between (`planFrame`). */
export function planTraces(traces: SpanTraces, ends: TraceEnds): PlanTraces {
  const onPlan = planFrame({ ends, L: traces.L });
  const along = (line: SpaceLine) => Array.from(line.xs, (x, i) => onPlan(x, line.ys[i] ?? 0));
  return {
    unloaded: traces.unloaded === null ? null : along(traces.unloaded),
    loaded: traces.loaded === null ? null : along(traces.loaded),
    trajectory: traces.trajectory.map(along),
  };
}

/**
 * The traces a vue de dessus draws over these Positions, in metres for the plain drawing and on the
 * map: none unless the line stands on them — both Positions and the profil between them, the Vue
 * 3D's own rule (`vue3dPlacement`) — since on any other two points `x` and `y` would not be the
 * line's.
 */
export function topTraces({
  placement,
  ...scene
}: {
  placement: ReturnType<typeof vue3dPlacement>;
} & Parameters<typeof spanTraces>[0]): {
  readonly span: SpanTraces;
  readonly plan: PlanTraces;
} | null {
  if (!placement.ok) return null;
  const span = spanTraces(scene);
  return span === null ? null : { span, plan: planTraces(span, placement.placement.ends) };
}

/**
 * The caption's line where the passager's position has no loaded line, which neither the vue de
 * dessus nor the Vue 3D then draws: said in words, as the coupe says it — on the Page Terrain the
 * coupe hides while the 3D is shown, and nothing else would (#118 « ligne chargée indisponible
 * explicitement »). `null` when there is a loaded line, or no solved line at all.
 *
 * @param xD the Scenario's passager position, m — the one `rider` was placed at.
 */
export function loadedLineCaption(
  solved: SceneBase | null,
  rider: SceneRider | null,
  xD: number,
): string | null {
  if (solved === null || rider !== null) return null;
  return noLoadedLine(loadedLineHole(solved, xD));
}
