/**
 * The vue de dessus's door, built (#128): the app's client is built here, in memory, and its chunks
 * are read — MapLibre in a chunk of its own behind `loadTopMap`, none of it in what a Page that
 * shows the map downloads before its first usable screen, and no font inside the stylesheet that
 * screen waits on.
 *
 * « What a Page downloads » is the client entry, the chunks of the routes its path matches (the
 * root, the layout, the Page and the router's split components) and everything they import
 * statically — `./client-build.ts`'s `closure`, the set `load-vue-3d.test.ts` reads for `/`. Dynamic
 * imports are not followed: the route's loader asks for the map beside the Page, and the Page renders
 * without waiting for it.
 *
 * The font check rides on this build on purpose: it is `vite.config.ts`'s and `inline-asset.ts`'s
 * contract, not this door's, but a stylesheet is only observable in a built client, and this is the
 * build of the Pages that wait on it (`docs/conventions/testing.md`).
 */

import type { Rolldown } from "vite";

import { beforeAll, describe, expect, test } from "vitest";

import { BUILD_TIMEOUT_MS, buildClient, closure } from "./client-build.ts";

/** MapLibre, the module the door is for. */
const MAPLIBRE = /\/node_modules\/maplibre-gl\//;

/** The three Pages that show the vue de dessus, by their route file. */
const MAP_PAGES = ["_app.index", "_app.avance", "_app.terrain"] as const;

let chunks: readonly Rolldown.OutputChunk[];
let styles: readonly Rolldown.OutputAsset[];

beforeAll(async () => {
  ({ chunks, styles } = await buildClient());
}, BUILD_TIMEOUT_MS);

function holdsMapLibre(chunk: Rolldown.OutputChunk): boolean {
  return chunk.moduleIds.some((id) => MAPLIBRE.test(id));
}

describe("the vue de dessus ships apart from the Pages", () => {
  test("MapLibre is behind loadTopMap, in a chunk of the map's own", () => {
    const door = chunks.find((chunk) =>
      chunk.facadeModuleId?.endsWith("/src/components/map/top-map.tsx"),
    );
    expect(door?.isDynamicEntry).toBe(true);
    expect(door?.isEntry).toBe(false);
    expect(closure(chunks, door === undefined ? [] : [door]).some(holdsMapLibre)).toBe(true);
  });

  test.each(MAP_PAGES)("what %s downloads before it renders holds no MapLibre", (page) => {
    const routes = new RegExp(
      `/src/routes/(?:__root|_app|${page.replace(".", "\\.")})\\.tsx(?:\\?tsr-split=component)?$`,
    );
    const roots = chunks.filter(
      (chunk) =>
        chunk.isEntry || (chunk.facadeModuleId !== null && routes.test(chunk.facadeModuleId)),
    );
    // The entry and the Page's own component at least, or the set measures nothing.
    expect(
      roots.some((chunk) => chunk.facadeModuleId?.endsWith(`${page}.tsx?tsr-split=component`)),
    ).toBe(true);
    expect(
      closure(chunks, roots)
        .filter(holdsMapLibre)
        .map((chunk) => chunk.fileName),
    ).toStrictEqual([]);
  });

  test("no stylesheet carries a font inside it", () => {
    // The fonts are files, fetched by `unicode-range` when a glyph needs them (`inline-asset.ts`).
    expect(styles.length).toBeGreaterThan(0);
    const inlined = styles.filter((style) => /url\(\s*["']?data:font\//.test(String(style.source)));
    expect(inlined.map((style) => style.fileName)).toStrictEqual([]);
  });
});
