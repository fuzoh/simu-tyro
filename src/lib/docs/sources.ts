/**
 * The documentation's bytes — the repository's own markdown, imported **raw at build time**.
 * Nothing is copied: the page and the file `docs/conventions/simulation.md` tells an engineer to
 * `rg` are the same bytes. Kept apart from `./pages.ts` so the simulator's bundle carries the
 * registry and not the prose; only `src/routes/docs.$slug.tsx` imports this module.
 */

import type { DocSlug } from "./pages.ts";

import guideLigne from "../../../docs/guide/1-ligne.md?raw";
import guideStatique from "../../../docs/guide/2-statique.md?raw";
import guideSecurite from "../../../docs/guide/3-securite.md?raw";
import guideDynamique from "../../../docs/guide/4-dynamique.md?raw";
import guideLimites from "../../../docs/guide/5-limites.md?raw";
import guide from "../../../docs/guide/README.md?raw";
import algo from "../../../docs/references/algo simulation tyrolienne.md?raw";
import vent from "../../../docs/references/equilibre spatial vent.md?raw";
import recherche from "../../../docs/references/research-two.md?raw";
import simulation from "../../../docs/references/simulation tyrolienne.md?raw";
import cable from "../../../docs/references/tyrolienne sur cable.md?raw";
import corde from "../../../docs/references/tyrolienne sur corde.md?raw";
import theory from "../../../docs/simulation-theory.md?raw";

const SOURCES: Record<DocSlug, string> = {
  guide,
  ligne: guideLigne,
  statique: guideStatique,
  securite: guideSecurite,
  dynamique: guideDynamique,
  limites: guideLimites,
  modele: theory,
  algorithme: algo,
  simulation,
  cable,
  corde,
  recherche,
  "vent-spatial": vent,
};

/** The markdown of a page, verbatim. */
export function docSource(slug: DocSlug): string {
  return SOURCES[slug];
}
