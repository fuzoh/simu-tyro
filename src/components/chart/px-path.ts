/**
 * The one rule by which a chart strokes a polyline it was handed **in pixels**: the Page Dynamique's
 * coupe and curve (`./dynamique.tsx`) and Avancé's tension graph (`./tension.tsx`), whose scenes
 * (`@/lib/dynamique/scene.ts`, `@/lib/chart/tension.ts`) have already placed every point. The coupe
 * (`./profile.tsx`) strokes engine polylines through its scales instead, with a rule of its own.
 */

import { line } from "d3-shape";

import type { PxPath, PxPoint } from "@/lib/chart/scene.ts";

const stroke = line<PxPoint>()
  .x((point) => point[0])
  .y((point) => point[1]);

/** The `d` of a path through pixel points; `undefined`, so no attribute, for none. */
export function pathOf(points: PxPath): string | undefined {
  return stroke([...points]) ?? undefined;
}
