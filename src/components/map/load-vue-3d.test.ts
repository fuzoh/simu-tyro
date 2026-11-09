/**
 * The Vue 3D's door, built (#95): the app's client is built here, in memory, and its chunks are read
 * — CesiumJS in a chunk of its own behind `loadVue3d`, and none of it in what `/` downloads.
 *
 * « What `/` downloads » is the client entry, the chunks of the three routes `/` matches (`__root`,
 * `_app`, `_app.index`, the router's split components) and everything they import statically.
 * Dynamic imports are not followed: they are fetched when called, and `loadVue3d` is called on the
 * first press of « 3D ».
 */

import type { Rolldown } from "vite";

import { createBuilder } from "vite";
import { beforeAll, describe, expect, test } from "vitest";

/** The routes `/` matches, as the router splits them into chunks. */
const ROUTES_OF_SLASH =
  /\/src\/routes\/(?:__root|_app|_app\.index)\.tsx(?:\?tsr-split=component)?$/;

/** CesiumJS, whichever of its packages a module comes from. */
const CESIUM = /\/node_modules\/(?:cesium|@cesium\/[^/]+)\//;

/**
 * What `/` downloaded before the Vue 3D, measured on the same build at ae4e561 (2026-11-08) — the
 * whole initial set, and the `/` route's own chunk within it, the Page's main chunk. `[MEASURED]`:
 * the build's output at that commit, never re-derived by this file.
 */
const BEFORE = { initial: 1_923_366, main: 1_095_813 } as const;

/** « Not increased by more than 10 % » (#95). */
const GROWTH = 1.1;

let chunks: readonly Rolldown.OutputChunk[];

beforeAll(async () => {
  // The production build, as `vite build` makes it: Vitest runs in `test` mode, which would build
  // React's development runtime and measure something nobody ships.
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
  chunks = (Array.isArray(output) ? output : [output]).flatMap(({ output: items }) =>
    items.filter((item): item is Rolldown.OutputChunk => item.type === "chunk"),
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

function bytes(chunk: Rolldown.OutputChunk): number {
  return Buffer.byteLength(chunk.code);
}

function holdsCesium(chunk: Rolldown.OutputChunk): boolean {
  return chunk.moduleIds.some((id) => CESIUM.test(id));
}

describe("the Vue 3D ships apart from `/`", () => {
  test("CesiumJS is behind loadVue3d, in a chunk named after the Vue 3D", () => {
    const door = chunks.find((chunk) =>
      chunk.facadeModuleId?.endsWith("/src/components/map/vue-3d-renderer.ts"),
    );
    expect(door?.isDynamicEntry).toBe(true);
    expect(door?.isEntry).toBe(false);
    expect(door?.fileName).toMatch(/^assets\/vue-3d-renderer-[\w-]+\.js$/);
    expect(closure(door === undefined ? [] : [door]).some(holdsCesium)).toBe(true);
  });

  test("what `/` downloads holds no CesiumJS, and grew by 10 % at most", () => {
    const roots = chunks.filter(
      (chunk) =>
        chunk.isEntry ||
        (chunk.facadeModuleId !== null && ROUTES_OF_SLASH.test(chunk.facadeModuleId)),
    );
    const initial = closure(roots);
    // The entry and the two layout routes at least, or the set measures nothing.
    expect(roots.length).toBeGreaterThanOrEqual(3);
    expect(initial.filter(holdsCesium).map((chunk) => chunk.fileName)).toEqual([]);
    expect(initial.reduce((sum, chunk) => sum + bytes(chunk), 0)).toBeLessThanOrEqual(
      BEFORE.initial * GROWTH,
    );

    const main = chunks.find((chunk) =>
      chunk.facadeModuleId?.endsWith("/src/routes/_app.index.tsx?tsr-split=component"),
    );
    expect(main).toBeDefined();
    expect(main === undefined ? Infinity : bytes(main)).toBeLessThanOrEqual(BEFORE.main * GROWTH);
  });
});
