/**
 * The documentation the app serves, as markdown rendered at `/docs/<slug>`, in three groups: the
 * step-by-step **guide** (`docs/guide/`, French) that explains the engine in reading order; the
 * **reference** the engine is built against (`docs/simulation-theory.md`, English); and the
 * **original reports** it was consolidated from, served verbatim (decision of #125).
 *
 * **Metadata only.** This registry is what the « ⋯ » menu, the `/docs` index and
 * `vite.config.ts`'s prerender list read, so it ships with the simulator; the markdown itself is
 * `./sources.ts`, imported by the `$slug` route alone and code-split with it. A page is a slug, a
 * French title for the navigation, one line of what it covers, the language the body is written
 * in, its group, and its repository path.
 *
 * `modele` is load-bearing: every `§` in `@/lib/rail/help.ts` is a section of it
 * (`@/lib/docs/refs.ts`). **A slug never changes once served** — links and bookmarks carry it —
 * and `links.test.ts` freezes the slugs and section anchors that existed before #125.
 */

export type DocSlug =
  | "guide"
  | "ligne"
  | "statique"
  | "securite"
  | "dynamique"
  | "limites"
  | "modele"
  | "algorithme"
  | "simulation"
  | "cable"
  | "corde"
  | "recherche"
  | "vent-spatial";

/** The three kinds of page, in navigation order. */
export type DocGroup = "guide" | "reference" | "rapport";

export interface DocPage {
  slug: DocSlug;
  /** The navigation label, in French. */
  title: string;
  /** One line: what the reader finds there. */
  summary: string;
  /** The body's language — set on the article's `lang` so hyphenation and screen readers agree. */
  lang: "fr" | "en";
  /** Which group the navigation files it under. */
  group: DocGroup;
  /**
   * The repository path, shown on the page so the reader can find the file — and the key a
   * repository-relative link in another page resolves against (`./links.ts`).
   */
  path: string;
}

/** The slug every tooltip `§` reference links into. */
export const THEORY_SLUG: DocSlug = "modele";

/** Where a reader without a `§` in hand starts. */
export const GUIDE_SLUG: DocSlug = "guide";

/** The group headings, in navigation order, with one line each for the `/docs` index. */
export const DOC_GROUPS: readonly { id: DocGroup; title: string; summary: string }[] = [
  {
    id: "guide",
    title: "Guide pas à pas",
    summary:
      "Comprendre le simulateur dans l'ordre : la ligne, la statique, la sécurité, la dynamique, les limites. Chaque notion est définie avant d'être utilisée et chaque étape a son exemple chiffré.",
  },
  {
    id: "reference",
    title: "Référence technique",
    summary:
      "Le contrat exact du moteur, en anglais, numéroté par paragraphes : c'est là que renvoient les « § » des infobulles du simulateur.",
  },
  {
    id: "rapport",
    title: "Rapports d'origine",
    summary:
      "Les rapports dont la référence a été consolidée, servis tels qu'ils figurent dans le dépôt. Ce sont des sources : ils se contredisent parfois, et la référence dit lequel elle suit.",
  },
];

/** In navigation order: the guide, then the reference, then the reports it was consolidated from. */
export const DOC_PAGES: readonly DocPage[] = [
  {
    slug: "guide",
    title: "Comprendre le simulateur",
    summary:
      "Le sommaire du guide : pour qui il est écrit, comment le lire, et l'exemple suivi d'un chapitre à l'autre.",
    lang: "fr",
    group: "guide",
    path: "docs/guide/README.md",
  },
  {
    slug: "ligne",
    title: "1. Comprendre la ligne",
    summary:
      "Le repère, les forces et les unités, la tension et ses composantes, l'allongement élastique, la flèche.",
    lang: "fr",
    group: "guide",
    path: "docs/guide/1-ligne.md",
  },
  {
    slug: "statique",
    title: "2. Statique",
    summary:
      "De la parabole à la chaînette élastique, la résolution, le pilote de tension, le passager, le balayage, la garde au sol.",
    lang: "fr",
    group: "guide",
    path: "docs/guide/2-statique.md",
  },
  {
    slug: "securite",
    title: "3. Sécurité",
    summary:
      "Charge de rupture, terminaisons, majoration au départ, régimes de sécurité, facteur de sécurité et Verdict.",
    lang: "fr",
    group: "guide",
    path: "docs/guide/3-securite.md",
  },
  {
    slug: "dynamique",
    title: "4. Dynamique",
    summary:
      "L'hypothèse quasi statique, l'équation du mouvement et ses constantes, point d'arrêt, vitesse d'arrivée, Proposition pour l'ancrage B.",
    lang: "fr",
    group: "guide",
    path: "docs/guide/4-dynamique.md",
  },
  {
    slug: "limites",
    title: "5. Limites et sources",
    summary:
      "Les hypothèses du modèle, ce qui n'est pas calculé, le statut des sources, les questions ouvertes et les documents d'origine.",
    lang: "fr",
    group: "guide",
    path: "docs/guide/5-limites.md",
  },
  {
    slug: "modele",
    title: "Modèle mathématique et algorithme",
    summary:
      "La référence consolidée du moteur : chaînette élastique, solveur, passager, majoration au départ, cadre normatif, garde au sol, données matériaux, cas de test vérifiés. C'est le document que les « § » des infobulles désignent.",
    lang: "en",
    group: "reference",
    path: "docs/simulation-theory.md",
  },
  {
    slug: "algorithme",
    title: "Modèle mathématique — rapport de recherche",
    summary:
      "Équations pour un simulateur statique de tyrolienne : chaînette classique, parabole, chaînette élastique, charge ponctuelle, paramétrages, méthodes numériques, valeurs matériaux.",
    lang: "fr",
    group: "rapport",
    path: "docs/references/algo simulation tyrolienne.md",
  },
  {
    slug: "simulation",
    title: "Simulation d'une tyrolienne — rapport",
    summary:
      "Statique de la ligne à vide et chargée, comportement des matériaux, dynamique du passager, garde au sol, algorithmes numériques et rendu de la coupe.",
    lang: "fr",
    group: "rapport",
    path: "docs/references/simulation tyrolienne.md",
  },
  {
    slug: "cable",
    title: "Tyrolienne sur câble — normes et dimensionnement",
    summary:
      "Portées > 50 m sur câble métallique : NF EN 15567, charge de rupture, facteurs de sécurité, terminaisons et ancrages.",
    lang: "fr",
    group: "rapport",
    path: "docs/references/tyrolienne sur cable.md",
  },
  {
    slug: "corde",
    title: "Tyrolienne sur corde — normes et dimensionnement",
    summary:
      "Portées > 50 m sur corde : statique vectorielle, résistance des cordes, travail en hauteur et secours technique.",
    lang: "fr",
    group: "rapport",
    path: "docs/references/tyrolienne sur corde.md",
  },
  {
    slug: "recherche",
    title: "Recherche R2 — arbitrages et données",
    summary:
      "La seconde recherche approfondie, citée « [R2] » par la référence : arbitrage des contradictions, dérivations manquantes, données de validation, valeurs à confirmer.",
    lang: "en",
    group: "rapport",
    path: "docs/references/research-two.md",
  },
  {
    slug: "vent-spatial",
    title: "Équilibre spatial sous vent — note préparatoire",
    summary:
      "Préparation scientifique du vent sur la ligne et le passager et de la forme spatiale de la ligne. Aucune valeur aérodynamique n'y est adoptée.",
    lang: "fr",
    group: "rapport",
    path: "docs/references/equilibre spatial vent.md",
  },
];

/** The page for a slug, or `null` for anything the address bar invented. */
export function docPage(slug: string): DocPage | null {
  return DOC_PAGES.find((page) => page.slug === slug) ?? null;
}

/**
 * What the Rail Header's « ⋯ » menu lists: the guide's sommaire, then every page that is not a
 * guide chapter — so each page the menu offered before #125 is still one click away.
 */
export const MENU_DOC_PAGES: readonly DocPage[] = DOC_PAGES.filter(
  (page) => page.group !== "guide" || page.slug === GUIDE_SLUG,
);

/** The pages of one group, in navigation order. */
export function docPagesIn(group: DocGroup): DocPage[] {
  return DOC_PAGES.filter((page) => page.group === group);
}
