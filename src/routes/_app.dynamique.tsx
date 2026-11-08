/**
 * `/dynamique` — the Page Dynamique (#92), in the terrain register: what the passager lives, on the
 * Scenario every Page shares. The schema is the layout's, read here as on every app Page, never
 * declared twice.
 *
 * `ssr: false` and its own Skeleton, for Avancé's reasons (`_app.avance.tsx`): a server-painted
 * Scenario would be somebody else's numbers for one frame. The Skeleton is also prerendered, so a
 * direct `/dynamique?…` on GitHub Pages lands on this Page's frame with a 200 (`vite.config.ts`).
 */

import { createFileRoute } from "@tanstack/react-router";

import { LoadFailure } from "@/components/app/load-failure.tsx";
import { LinkRefusalSurface } from "@/components/app/refusal.tsx";
import { Dynamique } from "@/components/dynamique/dynamique.tsx";
import { DynamiqueSkeleton } from "@/components/dynamique/frame.tsx";

export const Route = createFileRoute("/_app/dynamique")({
  ssr: false,
  pendingComponent: DynamiqueSkeleton,
  errorComponent: LoadFailure,
  component: DynamiqueRoute,
});

function DynamiqueRoute() {
  // The one thing app code reads off the router, as on every Page: the synthesised refusal marker.
  const refused = Route.useSearch({ select: (search) => search.refused });
  if (refused !== undefined) return <LinkRefusalSurface refusal={refused} />;
  return <Dynamique page={Route.fullPath} />;
}
