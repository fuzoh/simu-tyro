/**
 * The Page Avancé — « v1 build spec » § 7 (*The app shell*) and `docs/conventions/routing.md`,
 * amended and binding, as [amendment E](../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md)
 * leaves the refusal, and [ADR-0002](../../docs/adr/0002-one-page-per-route-one-scenario-in-the-url.md)
 * makes it one Page among several. It hosts the Rail as v1 built it.
 *
 * **It declares no `validateSearch`.** The Scenario's schema lives once on the pathless layout
 * `_app.tsx`, and this Page reads it from there — a second declaration is how a link would come to
 * type cleanly on one Page and refuse on another. Every state change is a search-param change onto
 * this same route; « Ouvrir l'application sans ce lien » is a `<Link to="." search={{}} replace>`,
 * and SVG export is a client-side `XMLSerializer` on the SVG already in the page.
 */

import { createFileRoute } from "@tanstack/react-router";

import { App } from "@/components/app/app.tsx";
import { LinkRefusalSurface } from "@/components/app/refusal.tsx";
import { Skeleton } from "@/components/app/skeleton.tsx";

export const Route = createFileRoute("/_app/avance")({
  /**
   * `ssr: false` on **every app Page**, this one included — `__root.tsx`'s `shellComponent` and the
   * layout's navigation bar stay server-rendered.
   *
   * Full SSR was rejected on **provenance, not cost**: for a bare `/` the server would paint the
   * shipped defaults (Portée 150,0 m, Flèche 6,0 m) and the Session read would replace them a tick
   * later. A flash of somebody else's numbers is the exact failure this app exists to refuse, and
   * it lands on the input half too — a rigger who glances at a painted 150,0 m and then sees
   * 250,0 m has been shown a number with no provenance. Two more, both measured: a *genuine* throw
   * under SSR renders at **500** where `ssr: false` returns 200, and both charts are sized from a
   * `ResizeObserver`, so any server-rendered chart geometry is wrong by construction.
   *
   * It goes here and never on the router: `defaultSsr` in `src/router.tsx` is a **silent no-op** —
   * `createStartHandler` spreads an `undefined` from a `src/start.ts` that does not exist, so
   * someone who "tidies" this option into the router loses the opt-out and **gets no error**.
   */
  ssr: false,
  /**
   * The Skeleton — **not optional either**. Measured: with no `pendingComponent` the server ships
   * an empty `<body>`, because the `ClientOnly` wrapper `ssr: false` installs defaults its fallback
   * to `null`. The choice was Skeleton or blank page.
   */
  pendingComponent: Skeleton,
  /**
   * For **genuine load failures only**. § 7 once named this the refusal's owner; amendment E struck
   * that sentence — `validateSearch` no longer throws for § 8's three refusal classes, so no
   * refusal reaches here. It stays declared because a route with no error component renders its
   * parent's, and on the root that would replace the shell and leave no way back into the app.
   */
  errorComponent: LoadFailure,
  component: AvanceRoute,
});

function AvanceRoute() {
  // The one thing app code reads off the router. `Route.useSearch()` is **raw ∪ validated** at
  // runtime while typed validated-only, so nothing else here touches it: the store rebuilds the
  // validated bag from the raw query string, which is also the only transport the dropped-keys
  // report has. `refused` is safe to read because it is synthesised, never received.
  const refused = Route.useSearch({ select: (search) => search.refused });

  // A refusal suppresses the screen rather than merging with it — and it renders in the frame the
  // Skeleton occupied, at **200**, so the transition reads as the page *resolving* rather than as
  // an error interrupting a load.
  if (refused !== undefined) return <LinkRefusalSurface refusal={refused} />;

  return <App page={Route.fullPath} />;
}

/**
 * A genuine load failure — the state that is now the only occupant of `errorComponent`. It says so
 * plainly, which is the one thing the refusal surface may **not** say: there, nothing failed and
 * the status line agrees; here, something did.
 */
function LoadFailure() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-start gap-3 p-6 pt-16" role="alert">
      {/* `text-lg` / `text-xs`: the three-size scale covers the error screens too. */}
      <h1 className="font-heading text-lg font-semibold tracking-tight">
        Le simulateur n'a pas pu démarrer.
      </h1>
      <p className="text-muted-foreground text-xs">Rechargez la page.</p>
    </main>
  );
}
