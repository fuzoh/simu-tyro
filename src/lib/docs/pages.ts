/**
 * The documentation the app serves — the theory the engine is built against and the reports it
 * was consolidated from, as markdown rendered at `/docs/<slug>`.
 *
 * **Metadata only.** This registry is what the « ⋯ » menu and the `/docs` index read, so it ships
 * with the simulator; the markdown itself — some 150 kB of it — is `./sources.ts`, imported by the
 * `$slug` route alone and code-split with it. A page is a slug, a French title for the navigation,
 * one line of what it covers, and the language the body is written in — the theory file is in
 * English, the reports in French, and the page says which rather than pretending.
 *
 * `modele` is load-bearing: every `§` in `@/lib/rail/help.ts` is a section of it
 * (`@/lib/docs/refs.ts`).
 */

export type DocSlug = "modele" | "algorithme" | "simulation" | "cable" | "corde";

export interface DocPage {
  slug: DocSlug;
  /** The navigation label, in French. */
  title: string;
  /** One line: what the reader finds there. */
  summary: string;
  /** The body's language — set on the article's `lang` so hyphenation and screen readers agree. */
  lang: "fr" | "en";
  /** The repository path, shown on the page so the reader can find the file. */
  path: string;
}

/** The slug every tooltip `§` reference links into. */
export const THEORY_SLUG: DocSlug = "modele";

/** In navigation order: the contract first, then the reports it was consolidated from. */
export const DOC_PAGES: readonly DocPage[] = [
  {
    slug: "modele",
    title: "Modèle mathématique et algorithme",
    summary:
      "La référence consolidée du moteur : chaînette élastique, solveur, charge du passager, DAF, cadre normatif, garde au sol, données matériaux. C'est le document que les « § » des infobulles désignent.",
    lang: "en",
    path: "docs/simulation-theory.md",
  },
  {
    slug: "algorithme",
    title: "Modèle mathématique — rapport de recherche",
    summary:
      "Équations pour un simulateur statique de tyrolienne : chaînette classique, parabole, chaînette élastique, charge ponctuelle, paramétrages, méthodes numériques, valeurs matériaux.",
    lang: "fr",
    path: "docs/references/algo simulation tyrolienne.md",
  },
  {
    slug: "simulation",
    title: "Simulation d'une tyrolienne — rapport",
    summary:
      "Statique de la ligne à vide et chargée, comportement des matériaux, dynamique du passager, garde au sol, algorithmes numériques et rendu de la coupe.",
    lang: "fr",
    path: "docs/references/simulation tyrolienne.md",
  },
  {
    slug: "cable",
    title: "Tyrolienne sur câble acier — normes et dimensionnement",
    summary:
      "Portées > 50 m sur câble métallique : NF EN 15567, charge de rupture, facteurs de sécurité, terminaisons et ancrages.",
    lang: "fr",
    path: "docs/references/tyrolienne sur cable.md",
  },
  {
    slug: "corde",
    title: "Tyrolienne sur corde textile — normes et dimensionnement",
    summary:
      "Portées > 50 m sur corde : statique vectorielle, résistance des cordes, travail en hauteur et secours technique.",
    lang: "fr",
    path: "docs/references/tyrolienne sur corde.md",
  },
];

/** The page for a slug, or `null` for anything the address bar invented. */
export function docPage(slug: string): DocPage | null {
  return DOC_PAGES.find((page) => page.slug === slug) ?? null;
}
