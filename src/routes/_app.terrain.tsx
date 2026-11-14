/**
 * `/terrain` — the Page Terrain (#101), in the terrain register: what a rigger reads on a phone
 * during the installation, on the Scenario every Page shares. **Read-only**: the line is set on
 * Statique. The schema is the layout's, read here as on every app Page, never declared twice.
 *
 * `ssr: false` and its own Skeleton, for Avancé's reasons (`_app.avance.tsx`): a server-painted
 * Scenario would be somebody else's numbers for one frame. The Skeleton is also prerendered, so a
 * direct `/terrain?…` on GitHub Pages lands on this Page's frame with a 200 (`vite.config.ts`).
 */

import { createFileRoute } from "@tanstack/react-router";

import { LoadFailure } from "@/components/app/load-failure.tsx";
import { LinkRefusalSurface } from "@/components/app/refusal.tsx";
import { prefetchTopMap } from "@/components/map/load-top-map.ts";
import { TerrainSkeleton } from "@/components/terrain-page/frame.tsx";
import { Terrain } from "@/components/terrain-page/terrain.tsx";

export const Route = createFileRoute("/_app/terrain")({
  ssr: false,
  pendingComponent: TerrainSkeleton,
  /** The vue de dessus's module, on the wire beside the Page's chunk — `_app.index.tsx`, #128. */
  loader: () => {
    prefetchTopMap();
  },
  errorComponent: LoadFailure,
  component: TerrainRoute,
});

function TerrainRoute() {
  // The one thing app code reads off the router, as on every Page: the synthesised refusal marker.
  const refused = Route.useSearch({ select: (search) => search.refused });
  if (refused !== undefined) return <LinkRefusalSurface refusal={refused} register="terrain" />;
  return <Terrain page={Route.fullPath} />;
}
