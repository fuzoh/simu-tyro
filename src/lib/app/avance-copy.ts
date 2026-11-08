/**
 * What a simplified Page says about the values it does not show — one wording for Statique and
 * Dynamique, because the other Page they point to is the same one.
 */

/**
 * What the Page says when a value it does not show stops the computation — one Avancé still
 * holds, from a link or an earlier edit. The field is not named: its name is Avancé's.
 */
export const AVANCE_NOTICE = {
  text: "Une valeur réglée sur la Page Avancé bloque le calcul.",
  action: "Ouvrir la Page Avancé",
} as const;

/** The line under the fields: what the Page does not ask for is kept, not reset. */
export const ASSUMED_NOTE =
  "Les autres valeurs restent celles de la Page Avancé, qui les affiche toutes.";
