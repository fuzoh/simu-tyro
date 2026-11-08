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
import { StatiqueSkeleton } from "@/components/statique/frame.tsx";
import { Statique } from "@/components/statique/statique.tsx";

export const Route = createFileRoute("/_app/")({
  ssr: false,
  pendingComponent: StatiqueSkeleton,
  errorComponent: LoadFailure,
  component: StatiqueRoute,
});

function StatiqueRoute() {
  // The one thing app code reads off the router, as on Avancé: the synthesised refusal marker.
  const refused = Route.useSearch({ select: (search) => search.refused });
  if (refused !== undefined) return <LinkRefusalSurface refusal={refused} />;
  return <Statique page={Route.fullPath} />;
}
