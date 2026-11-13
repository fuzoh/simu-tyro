/**
 * The app's client, built in memory, for the suites that read its chunk graph (#95, #128):
 * `load-vue-3d.test.ts` and `load-top-map.test.ts`. One definition of the build and of « what a
 * Page downloads », because two copies could drift apart and the two suites would stop measuring
 * the same set — the move `src/lib/sim/bench-harness.ts` makes for the bench and its gate. Each
 * suite still builds once of its own: Vitest runs them in separate workers.
 *
 * Test machinery: nothing in the app imports it.
 */

import type { Rolldown } from "vite";

import { createBuilder } from "vite";

/** What a build test reads: the script chunks, and the stylesheets. */
export type ClientBuild = {
  readonly chunks: readonly Rolldown.OutputChunk[];
  readonly styles: readonly Rolldown.OutputAsset[];
};

/** Long enough for a cold production build on a slow runner. */
export const BUILD_TIMEOUT_MS = 120_000;

/** The production client build, as `vite build` makes it, held in memory (`build.write: false`). */
export async function buildClient(): Promise<ClientBuild> {
  // Vitest runs in `test` mode, which would build React's development runtime and measure
  // something nobody ships.
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
  return {
    chunks: items.filter((item): item is Rolldown.OutputChunk => item.type === "chunk"),
    styles: items.filter(
      (item): item is Rolldown.OutputAsset =>
        item.type === "asset" && item.fileName.endsWith(".css"),
    ),
  };
}

/**
 * The chunks `roots` pull in, themselves included, following static imports only — dynamic imports
 * are fetched when called, never before a Page renders.
 */
export function closure(
  chunks: readonly Rolldown.OutputChunk[],
  roots: readonly Rolldown.OutputChunk[],
): Rolldown.OutputChunk[] {
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
