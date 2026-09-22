import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,

    /**
     * Where the app is *mounted*, not where it routes. Vite's `base` — `/` in dev, `/scoutech/` on
     * a GitHub Pages project site, see `vite.config.ts` — is handed to client code as
     * `import.meta.env.BASE_URL`, and reading it here is what keeps the two in step: the router
     * strips the prefix before matching and re-adds it when it builds an href, so route code stays
     * written against `/` and a `<Link to="/">` still lands on the right URL under a subpath.
     *
     * Hardcoding `/scoutech/` here instead would be the second place to forget the day the app
     * moves to a custom domain, and the failure is silent: every route 404s.
     */
    basepath: import.meta.env.BASE_URL,

    scrollRestoration: true,
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
