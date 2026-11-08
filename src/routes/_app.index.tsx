/**
 * `/` — every link shared before the Pages existed points here, and it opens Avancé until the Page
 * Statique takes this path (ADR-0002).
 *
 * The redirect is the **client's**: `ssr: false` skips `beforeLoad` on the server, so the server —
 * the dev server, or the build's shell prerender — answers 200 with a Skeleton and never a 307 a
 * static host could not reproduce anyway.
 */

import { createFileRoute, redirect } from "@tanstack/react-router";

import { Skeleton } from "@/components/app/skeleton.tsx";

export const Route = createFileRoute("/_app/")({
  ssr: false,
  /**
   * `location.search` is the **raw** parse, so the redirect carries the link exactly as it came —
   * key order included — and never the validated merge. `replace`, so Back does not land on `/`
   * and bounce forward again.
   */
  beforeLoad: ({ location }) => {
    throw redirect({ replace: true, search: location.search, to: "/avance" });
  },
  pendingComponent: Skeleton,
});
