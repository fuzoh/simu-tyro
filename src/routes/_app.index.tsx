/**
 * `/` — the Page Statique (#91), the simplified Page in the terrain register. Every link shared
 * before the Pages existed points here, and it opens on the same Scenario Avancé would: the schema
 * is the layout's, read here as on every app Page, never declared twice.
 *
 * `ssr: false` and its own Skeleton, for Avancé's reasons (`_app.avance.tsx`): a server-painted
 * Scenario would be somebody else's numbers for one frame. Its Skeleton is also the shell's — the
 * layout's `pendingComponent` — because the build's shell prerender is this Page's `index.html`.
 */

import { createFileRoute } from "@tanstack/react-router";

import { LoadFailure } from "@/components/app/load-failure.tsx";
import { LinkRefusalSurface } from "@/components/app/refusal.tsx";
import { prefetchTopMap } from "@/components/map/load-top-map.ts";
import { StatiqueSkeleton } from "@/components/statique/frame.tsx";
import { Statique } from "@/components/statique/statique.tsx";

export const Route = createFileRoute("/_app/")({
  ssr: false,
  pendingComponent: StatiqueSkeleton,
  /**
   * Starts the vue de dessus's module on the wire beside the Page's own chunk (#128) — the Page
   * renders without it and the map lands in its frame when it is here (`load-top-map.ts`). A
   * loader, because the router runs it as it starts fetching the component, and it stays in the
   * critical chunk: one `import()` and nothing else, so it costs that chunk a line.
   */
  loader: () => {
    prefetchTopMap();
  },
  errorComponent: LoadFailure,
  component: StatiqueRoute,
});

function StatiqueRoute() {
  // The one thing app code reads off the router, as on Avancé: the synthesised refusal marker.
  const refused = Route.useSearch({ select: (search) => search.refused });
  if (refused !== undefined) return <LinkRefusalSurface refusal={refused} register="terrain" />;
  return <Statique page={Route.fullPath} />;
}
