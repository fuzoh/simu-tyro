/**
 * The app Pages — the routed screens that share one Scenario in the URL (ADR-0002). One table,
 * three readers: the navigation bar lists it, `vite.config.ts` prerenders each path with that
 * Page's own Skeleton, and `./pages.test.ts` holds every entry to the shared search schema.
 *
 * It imports nothing, because `vite.config.ts` reads it before any alias exists.
 */

export const APP_PAGES = [{ path: "/avance", label: "Avancé" }] as const;

/** An app Page's router path — written against `/`, never against the base path. */
export type AppPagePath = (typeof APP_PAGES)[number]["path"];

/**
 * The navigation bar's entries, in order: the app Pages, then the documentation. `/docs` is listed
 * but is not an app Page — it declares no search schema and reads no Scenario.
 */
export const NAVIGATION = [...APP_PAGES, { path: "/docs", label: "Documentation" }] as const;
