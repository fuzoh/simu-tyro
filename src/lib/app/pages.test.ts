import type { AnyRoute } from "@tanstack/react-router";

import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { describe, expect, test } from "vitest";

import { keepRefusalOutOfTheAddressBar, validateSearch } from "@/lib/url/schema.ts";
import { routeTree } from "@/routeTree.gen.ts";

import { APP_PAGES, NAVIGATION } from "./pages.ts";

/**
 * The app Pages against the **real** route tree (ADR-0002). A router is built on a memory history
 * and asked to match and to build locations — what `loadServerRoute` compares to decide on a 307 —
 * so nothing renders and nothing needs a DOM.
 */
function routerAt(href: string, basepath = "/") {
  const router = createRouter({
    routeTree,
    basepath,
    history: createMemoryHistory({ initialEntries: [href] }),
  });
  router.updateLatestLocation();
  return router;
}

/** The incoming href, and the canonical rebuild a document request is compared against. */
function rebuild(href: string) {
  const router = routerAt(href);
  const canonical = router.buildLocation({
    to: router.latestLocation.pathname,
    search: true,
    params: true,
    hash: true,
    state: true,
    _includeValidateSearch: true,
  });
  return {
    incoming: router.latestLocation.publicHref,
    rebuilt: canonical.publicHref,
    search: router.matchRoutes(router.latestLocation).at(-1)?.search,
  };
}

function branch(route: AnyRoute): AnyRoute[] {
  const chain: AnyRoute[] = [];
  for (let at: AnyRoute | undefined = route; at !== undefined; at = at.parentRoute) chain.push(at);
  return chain;
}

const routes: AnyRoute[] = Object.values(routerAt("/").routesById);
const schemaRoutes = routes.filter((route) => route.options.validateSearch !== undefined);

/** Two Tightness Drivers: § 8's whole-link refusal. */
const REFUSED = "?fl=6&lo=151.64";

describe("one schema for every app Page", () => {
  test("is declared exactly once, with the middleware that keeps the marker out of the URL", () => {
    expect(schemaRoutes).toHaveLength(1);
    const [layout] = schemaRoutes;
    expect(layout.options.validateSearch).toBe(validateSearch);
    expect(layout.options.search?.middlewares).toContain(keepRefusalOutOfTheAddressBar);
  });

  test("the table names every route under it, so none ships without its own Skeleton", () => {
    const under = routes.filter((route) => branch(route).includes(schemaRoutes[0]));
    const leaves = under.filter((route) => route.children === undefined);
    const paths = new Set<string>(leaves.map((route) => route.fullPath));
    // Every route under the schema is in the table — `/` included, since it is Statique.
    expect(paths).toEqual(new Set(APP_PAGES.map((page) => page.path)));
    expect(leaves).toHaveLength(paths.size);
  });
});

describe.each(APP_PAGES.map((page) => [page.path, page] as const))("%s", (path) => {
  const route = routerAt("/").routesByPath[path] as AnyRoute | undefined;

  test("is a client-only route that reads the shared schema rather than a copy", () => {
    expect(route?.options.ssr).toBe(false);
    expect(route?.options.validateSearch).toBeUndefined();
    expect(branch(route as AnyRoute)).toContain(schemaRoutes[0]);
  });

  test("refuses two Tightness Drivers and writes the link back exactly as it arrived", () => {
    const { incoming, rebuilt, search } = rebuild(`${path}${REFUSED}`);
    expect(search?.refused?.kind).toBe("deux-directeurs");
    expect(rebuilt).toBe(incoming);
  });

  test("keeps an unknown key in the URL for the strip to name", () => {
    const { incoming, rebuilt, search } = rebuild(`${path}?L=250&junk=zz`);
    expect(rebuilt).toBe(incoming);
    expect(search?.L).toBe(250);
  });
});

describe("`/` is the Page Statique (#91)", () => {
  const index = routerAt("/").routesByPath["/"] as AnyRoute;

  test("a Page of the table, no longer a redirect to Avancé", () => {
    expect(APP_PAGES.map((page) => page.path)).toContain("/");
    expect(index.options.beforeLoad).toBeUndefined();
  });

  test("an Avancé link opened on `/` keeps its search, key order and unknown keys included", () => {
    const { incoming, rebuilt, search } = rebuild("/?h=-40&L=250&junk=zz");
    expect(rebuilt).toBe(incoming);
    expect(search?.L).toBe(250);
    expect(search?.h).toBe(-40);
  });

  test("under the GitHub Pages base path", () => {
    const router = routerAt("/simu-tyro/?L=250", "/simu-tyro/");
    expect(router.matchRoutes(router.latestLocation).at(-1)?.fullPath).toBe("/");
  });
});

describe("the navigation bar", () => {
  test("lists every app Page, then the documentation, each a route", () => {
    const paths = NAVIGATION.map((entry) => entry.path);
    expect(paths).toEqual([...APP_PAGES.map((page) => page.path), "/docs"]);
    const router = routerAt("/");
    for (const path of paths) expect(router.routesByPath[path]).toBeDefined();
  });

  test.each(NAVIGATION.map((entry) => [entry.path] as const))(
    "carries a refused link's search to %s untouched, with no marker",
    (to) => {
      // The bar hands each link the location's **raw** search. The validated bag would carry
      // `refused`, and `/docs` is off the branch whose middleware strips it.
      const router = routerAt(`/avance${REFUSED}`, "/simu-tyro/");
      const href = router.buildLocation({ to, search: router.latestLocation.search }).publicHref;
      expect(href).toBe(`/simu-tyro${to}${REFUSED}`);
    },
  );

  test("the validated bag would have leaked the marker into `/docs` — the control", () => {
    const router = routerAt(`/avance${REFUSED}`);
    expect(router.buildLocation({ to: "/docs", search: true }).publicHref).toContain("refused=");
  });
});
