/**
 * The vue de dessus's door, built (#128): the app's client is built here, in memory, and its chunks
 * are read — MapLibre in a chunk of its own behind `loadTopMap`, none of it in what a Page that
 * shows the map downloads before its first usable screen, and no font inside the stylesheet that
 * screen waits on.
 *
 * « What a Page downloads » is the client entry, the chunks of the routes its path matches (the
 * root, the layout, the Page and the router's split components) and everything they import
 * statically — the set `load-vue-3d.test.ts` reads for `/`. Dynamic imports are not followed: the
 * route's loader asks for the map beside the Page, and the Page renders without waiting for it.
 */

import type { Rolldown } from "vite";

import { createBuilder } from "vite";
import { beforeAll, describe, expect, test } from "vitest";

/** MapLibre, the module the door is for. */
const MAPLIBRE = /\/node_modules\/maplibre-gl\//;

/** The three Pages that show the vue de dessus, by their route file. */
const MAP_PAGES = ["_app.index", "_app.avance", "_app.terrain"] as const;

let chunks: readonly Rolldown.OutputChunk[];
let styles: readonly Rolldown.OutputAsset[];

beforeAll(async () => {
  // The production build, as `vite build` makes it — see `load-vue-3d.test.ts`.
  process.env.NODE_ENV = "production";
  const builder = await createBuilder({
    mode: "production",
    logLevel: "silent",
    build: { write: false },
  });
  const client = builder.environments.client;
  if (client === undefined) throw new Error("the app has no client environment");
  const output = (await builder.build(client)) as
    | Rolldown.RolldownOutput
    | Rolldown.RolldownOutput[];
  const items = (Array.isArray(output) ? output : [output]).flatMap(({ output: all }) => all);
  chunks = items.filter((item): item is Rolldown.OutputChunk => item.type === "chunk");
  styles = items.filter(
    (item): item is Rolldown.OutputAsset => item.type === "asset" && item.fileName.endsWith(".css"),
  );
}, 120_000);

/** The chunks `roots` pull in, themselves included, following static imports only. */
function closure(roots: readonly Rolldown.OutputChunk[]): Rolldown.OutputChunk[] {
  const byFile = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));
  const seen = new Map<string, Rolldown.OutputChunk>();
  const pending = [...roots];
  for (let chunk = pending.pop(); chunk !== undefined; chunk = pending.pop()) {
    if (seen.has(chunk.fileName)) continue;
    seen.set(chunk.fileName, chunk);
    for (const file of chunk.imports) {
      const imported = byFile.get(file);
      if (imported !== undefined) pending.push(imported);
    }
  }
  return [...seen.values()];
}

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
    expect(closure(door === undefined ? [] : [door]).some(holdsMapLibre)).toBe(true);
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
      closure(roots)
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
