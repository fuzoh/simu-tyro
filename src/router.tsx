import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,

    /**
     * Where the app is *mounted*, not where it routes. Vite's `base` — `/` in dev, `/simu-tyro/` on
     * a GitHub Pages project site, see `vite.config.ts` — is handed to client code as
     * `import.meta.env.BASE_URL`, and reading it here is what keeps the two in step: the router
     * strips the prefix before matching and re-adds it when it builds an href, so route code stays
     * written against `/` and a `<Link to="/">` still lands on the right URL under a subpath.
     *
     * Hardcoding `/simu-tyro/` here instead would be the second place to forget the day the app
     * moves to a custom domain, and the failure is silent: every route 404s.
     */
    basepath: import.meta.env.BASE_URL,

    /**
     * **Off, on purpose.** The layout scrolls inside its own containers (the Rail, the columns), and
     * the router identifies one by its position in the DOM (`div:nth-child(2) > …`), which two Pages
     * share. On every navigation it copies the scroll offsets of the Page it leaves to the location
     * it opens, then applies them by that selector — so the next Page opened with its middle column
     * already scrolled, the top of the coupe hidden. Measured: 247 px carried from Dynamique to
     * Avancé. A Page switch opens at the top, Back and Forward included; the router still resets the
     * window itself.
     */
    scrollRestoration: false,
    /**
     * **No minimum time on the Skeleton (#128).** Every app Page is `ssr: false`, so the document
     * arrives with its Skeleton already painted, and the router treats that as a pending UI it must
     * keep for `pendingMinMs` — 500 ms by default, counted from hydration (`offerPending`,
     * `presentedPending ? Date.now() + min`). On a first load that was the floor under every Page:
     * measured, the live frame landed 500 ms after hydration however early its chunks had arrived.
     * The minimum exists to stop a spinner flashing; the Skeleton is the live frame's own layout
     * (`components/app/shell.tsx`), so there is nothing to flash, and a Page now lands when it is
     * ready. `pendingMs` keeps its default: a Page switch still shows no Skeleton under 1 s.
     */
    defaultPendingMinMs: 0,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
