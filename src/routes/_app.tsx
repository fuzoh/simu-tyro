/**
 * The app Pages' layout — [ADR-0002](../../docs/adr/0002-one-page-per-route-one-scenario-in-the-url.md)
 * and `docs/conventions/routing.md`. Pathless: it adds no URL segment, only what every app Page
 * shares, declared **once** — the Scenario's `validateSearch`, the middleware that keeps amendment
 * E's refusal marker out of the address bar, and the navigation bar.
 *
 * It stays server-rendered, so a prerendered Page ships the bar above its own Skeleton; each Page
 * below it sets `ssr: false` itself.
 */

import { createFileRoute, Outlet, useHydrated } from "@tanstack/react-router";

import { PageFrame } from "@/components/app/navigation-bar.tsx";
import { StatiqueSkeleton } from "@/components/statique/frame.tsx";
import { keepRefusalOutOfTheAddressBar, validateSearch } from "@/lib/url/schema.ts";

export const Route = createFileRoute("/_app")({
  validateSearch,
  /**
   * **Not optional**, and measured as probe 6. `applySearchMiddleware` wraps the validator in a
   * middleware returning `{ ...incoming, ...validated }`, `buildLocation` stringifies that merge —
   * every key of it — and `loadServerRoute` rebuilds the canonical location on every document
   * request and 307s when the href differs. `refused` is the one key `validateSearch` synthesises,
   * so without this it lands in the address bar as JSON and « Copier le lien » ships it.
   * `matchRoutes` runs no search middleware, so `Route.useSearch().refused` still carries the
   * marker on every Page below.
   */
  search: { middlewares: [keepRefusalOutOfTheAddressBar] },
  /**
   * **The SPA shell, and only that.** The shell prerender server-renders the root alone, so this
   * route — the root's first child — paints its `pendingComponent` into `index.html`, which
   * `build:pages` copies to `404.html`. `/` is Statique (#91), so the shell is Statique's Skeleton,
   * and the Page's own `pendingComponent` is the same one.
   */
  pendingComponent: ShellSkeleton,
  component: AppLayout,
});

/**
 * The bar is text until hydration, links after: `useHydrated` is false on the server and on the
 * first client render, so the two agree and nothing reflows.
 */
function AppLayout() {
  const live = useHydrated();
  return (
    <PageFrame live={live}>
      <Outlet />
    </PageFrame>
  );
}

function ShellSkeleton() {
  return (
    <PageFrame live={false}>
      <StatiqueSkeleton />
    </PageFrame>
  );
}
