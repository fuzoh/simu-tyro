/**
 * The `p1.` codec bench — `bun run bench` (`vitest bench`), « v1 build spec » § 8 (*The codec is
 * hand-rolled and synchronous*) and § 11 (*Benches*).
 *
 * **This is where the 2,3–2,5 µs decode lives, and it asserts nothing.** § 11 rules a microsecond
 * assertion in CI a flake generator; the same number in a bench is a tripwire a human reads. What
 * it guards is the argument that made the embed decision affordable: `validateP1` runs **3× per
 * document request**, on the server, inside `buildLocation`, and the spec accepted that structural
 * work as « wasted » only because it costs microseconds. If `validate` here starts reading in tens
 * of microseconds, that acceptance has to be re-made rather than re-quoted.
 *
 * Read the three cells against each other: `validate` walks the varints without allocating,
 * `decode` **runs that same walk first** — one structural implementation, so nothing can decode
 * what `validateSearch` would have refused — and then walks again to fill two `Float64Array`s, and
 * `encode` is the write side, which runs once per « Copier le lien » and never inside the router.
 * So `decode − validate` is the allocation half's own cost, and paying `validate` twice is the
 * price of the two never disagreeing, on a path that is memoised and client-only.
 *
 * Node, not Chromium — compare cells with cells, never with a browser figure.
 */

import { readFileSync } from "node:fs";
import { bench, describe } from "vitest";

import type { Trace } from "@/lib/terrain/trace.ts";

import { parseProfileCsv } from "@/lib/terrain/csv.ts";

import { decodeP1, encodeP1, validateP1 } from "./p1.ts";

/** The three real geoportal exports — 183,4 / 224,0 / 188,4 m, 200 rows each. */
const TRACES: readonly { readonly label: string; readonly trace: Trace }[] = [1, 2, 3].map((n) => {
  const name = `example-profile-trace${n}.csv`;
  const text = readFileSync(new URL(`../../../docs/references/${name}`, import.meta.url), "utf8");
  const result = parseProfileCsv(text, name);
  if (!result.ok) throw new Error(`${name}: ${result.failure.kind}`);
  return { label: name, trace: result.trace };
});

for (const { label, trace } of TRACES) {
  const payload = encodeP1(trace);
  describe(`${label} · ${payload.length} characters`, () => {
    bench("validateP1 — the structural walk `validateSearch` pays 3× per request", () => {
      validateP1(payload);
    });
    bench("decodeP1 — the memoised client-side derivation", () => {
      decodeP1(payload);
    });
    bench("encodeP1 — the write side, once per « Copier le lien »", () => {
      encodeP1(trace);
    });
  });
}
