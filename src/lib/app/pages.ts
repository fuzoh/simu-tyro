/**
 * The app Pages — the routed screens that share one Scenario in the URL (ADR-0002). One table,
 * three readers: the navigation bar lists it, `vite.config.ts` prerenders each path with that
 * Page's own Skeleton, and `./pages.test.ts` holds every entry to the shared search schema.
 *
 * `/` is Statique (#91): its Skeleton is the shell's, so the build's shell prerender is its file and
 * `vite.config.ts` prerenders every other path.
 *
 * It imports nothing, because `vite.config.ts` reads it before any alias exists.
 */

export const APP_PAGES = [
  { path: "/terrain", label: "Terrain" },
  { path: "/", label: "Statique" },
  { path: "/dynamique", label: "Dynamique" },
  { path: "/avance", label: "Avancé" },
] as const;

/** An app Page's router path — written against `/`, never against the base path. */
export type AppPagePath = (typeof APP_PAGES)[number]["path"];

/**
 * The navigation bar's entries, in order: the app Pages, then the documentation. `/docs` is listed
 * but is not an app Page — it declares no search schema and reads no Scenario.
 */
export const NAVIGATION = [...APP_PAGES, { path: "/docs", label: "Documentation" }] as const;

/**
 * Any entry of the bar. A link that hands over the location's raw search is typed against this
 * union, as the bar's own are: the raw search is a plain object written verbatim, and only the
 * validated bag carries the refusal marker the app Pages' schema types as required.
 */
export type NavigationPath = (typeof NAVIGATION)[number]["path"];
