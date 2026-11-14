/**
 * The vue de dessus's door (#128): MapLibre and the map's wiring, `./top-map.tsx`, behind a dynamic
 * `import()` — the largest module of the first load, ≈ 310 kB gzipped of the ≈ 610 kB of script `/`
 * fetched before its first usable screen (`docs/performance/first-load.md`). Behind this door the
 * Page's fields, tiles and Verdict no longer wait for it: the map arrives in its frame when it is
 * here.
 *
 * **Asked for by the route, not by the frame.** The Pages that show the map call `prefetchTopMap()`
 * in their route's `loader`, which the router runs as it starts fetching the Page's own chunk — so
 * the map's chunk is on the wire in the same round as the Page's, never one round later, and no
 * press waits for it. `./deferred-top-map.tsx` reads the same promise.
 *
 * Nothing else may import `./top-map.tsx` but for its types: one static import pulls MapLibre back
 * into the Page's chunk. `./load-top-map.test.ts` builds the client and checks that none does.
 */

type TopMapModule = typeof import("./top-map.tsx");

let pending: Promise<TopMapModule> | null = null;
let loaded: TopMapModule | null = null;

/**
 * The map's module, fetched once. A fetch that fails — offline before it arrived — is forgotten, so
 * the next Page that shows the map asks again.
 */
export function loadTopMap(): Promise<TopMapModule> {
  pending ??= import("./top-map.tsx").then(
    (module) => (loaded = module),
    (error: unknown) => {
      pending = null;
      throw error;
    },
  );
  return pending;
}

/**
 * The route's call: the module on the wire, and nothing awaited. Its failure is the frame's to show
 * (`./deferred-top-map.tsx`), so here it is caught rather than left an unhandled rejection.
 */
export function prefetchTopMap(): void {
  loadTopMap().catch(() => {});
}

/** The module, once it has arrived — so a Page mounted after it draws the map in its first frame. */
export function loadedTopMap(): TopMapModule | null {
  return loaded;
}
