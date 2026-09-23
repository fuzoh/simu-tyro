/**
 * The documentation's bytes — the repository's own markdown, imported **raw at build time**.
 * Nothing is copied: the page and the file `docs/conventions/simulation.md` tells an engineer to
 * `rg` are the same bytes. Kept apart from `./pages.ts` so the simulator's bundle carries the
 * registry and not the prose; only `src/routes/docs.$slug.tsx` imports this module.
 */

import type { DocSlug } from "./pages.ts";

import algo from "../../../docs/references/algo simulation tyrolienne.md?raw";
import simulation from "../../../docs/references/simulation tyrolienne.md?raw";
import cable from "../../../docs/references/tyrolienne sur cable.md?raw";
import corde from "../../../docs/references/tyrolienne sur corde.md?raw";
import theory from "../../../docs/simulation-theory.md?raw";

const SOURCES: Record<DocSlug, string> = {
  modele: theory,
  algorithme: algo,
  simulation,
  cable,
  corde,
};

/** The markdown of a page, verbatim. */
export function docSource(slug: DocSlug): string {
  return SOURCES[slug];
}
