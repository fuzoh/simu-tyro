/**
 * The app's error surfaces, assembled once at the Page root — `@/lib/app/surfaces.ts` composes
 * them; this hook only reads the caret's committed value and memoises the composition.
 *
 * **One memo, keyed on the composition's whole input.** A scrub moves none of it — `x_D` is not
 * among the keys, and `useTraverse`, the scene and the gate report hold through a scrub — so the
 * `Résultats` and the banner are not re-derived per frame: `evaluateVerdict` runs over 260 steps,
 * the one measured cost in the app after the sweep.
 */

import { useMemo } from "react";

import type { ErrorSurfaces, SurfaceInput } from "@/lib/app/surfaces.ts";
import type { Deduced } from "@/lib/rail/deduced.ts";

import { errorSurfaces } from "@/lib/app/surfaces.ts";
import { committedValue } from "@/lib/rail/gates.ts";

import { useAppState } from "./store.tsx";

export function useErrorSurfaces({
  deduced,
  focused,
  frame,
  register = "exact",
  report,
  solved,
  traverse,
}: Omit<SurfaceInput, "failure" | "committed" | "register"> & {
  readonly deduced: Deduced;
  readonly register?: SurfaceInput["register"];
}): ErrorSurfaces {
  const { scenario } = useAppState();
  const { failure } = deduced;
  const committed = focused === null ? null : committedValue(scenario, focused, deduced);
  return useMemo(
    () => errorSurfaces({ failure, focused, committed, frame, register, report, solved, traverse }),
    [failure, focused, committed, frame, register, report, solved, traverse],
  );
}
