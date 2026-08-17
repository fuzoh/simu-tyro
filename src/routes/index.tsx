/**
 * The one route — « v1 build spec » § 7 (*The app shell*) and `docs/conventions/routing.md`,
 * amended and binding, as [amendment E](../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md)
 * leaves the refusal.
 *
 * **Exactly one route, and that is a drift decision.** The router validates search params *per
 * route*, so a second route re-declares the same ~30-key `validateSearch` — and a link that types
 * cleanly on one route and refuses on the other is precisely the failure the typing-boundary rule
 * exists to make impossible. Every state change is a search-param change, so there is no navigation
 * to model; « Ouvrir l'application sans ce lien » is a `<Link to="/" search={{}} replace>` onto this
 * same route, and SVG export is a client-side `XMLSerializer` on the SVG already in the page.
 */

import { createFileRoute } from "@tanstack/react-router";

import { App } from "@/components/app/app.tsx";
import { LinkRefusalSurface } from "@/components/app/refusal.tsx";
import { Skeleton } from "@/components/app/skeleton.tsx";
import { keepRefusalOutOfTheAddressBar, validateSearch } from "@/lib/url/schema.ts";

export const Route = createFileRoute("/")({
  /**
   * `ssr: false` on **this route only** — `__root.tsx`'s `shellComponent` stays server-rendered.
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
  validateSearch,
  /**
   * **Not optional**, and measured as probe 6. `applySearchMiddleware` wraps the validator in a
   * middleware returning `{ ...incoming, ...validated }`, `buildLocation` stringifies that merge —
   * every key of it — and `loadServerRoute` rebuilds the canonical location on every document
   * request and 307s when the href differs. `refused` is the one key `validateSearch` synthesises,
   * so without this it lands in the address bar as JSON and « Copier le lien » ships it.
   * `matchRoutes` runs no search middleware, so `Route.useSearch().refused` still carries the
   * marker.
   */
  search: { middlewares: [keepRefusalOutOfTheAddressBar] },
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
  component: IndexRoute,
});

function IndexRoute() {
  // The one thing app code reads off the router. `Route.useSearch()` is **raw ∪ validated** at
  // runtime while typed validated-only, so nothing else here touches it: the store rebuilds the
  // validated bag from the raw query string, which is also the only transport the dropped-keys
  // report has. `refused` is safe to read because it is synthesised, never received.
  const refused = Route.useSearch({ select: (search) => search.refused });

  // A refusal suppresses the screen rather than merging with it — and it renders in the frame the
  // Skeleton occupied, at **200**, so the transition reads as the page *resolving* rather than as
  // an error interrupting a load.
  if (refused !== undefined) return <LinkRefusalSurface refusal={refused} />;

  return <App />;
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
