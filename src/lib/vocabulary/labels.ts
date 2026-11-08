/**
 * The interface's **two vocabularies**, as one table — the resolution of ticket #61
 * (« Revue du vocabulaire français de l'interface »), line by line.
 *
 * Terrain, Statique and Dynamique speak as people do on site (the `terrain` register); Avancé and
 * the code keep the exact term (the `exact` register). The words that are never renamed — Page,
 * Brins porteurs, Mise en tension, Verdict, portée — are one string in both; « flèche » is always
 * the word, Avancé alone adding « à vide ». The line itself is `line` (« ligne »), not Brins porteurs,
 * which counts its members.
 *
 * - **A quantity is named by one id, never by its wording.** Callers ask `label(id, register)`;
 *   they do not spell « prétension » or « tension de pose » themselves, so a rename is one edit.
 * - **Total by construction.** {@link LABELS} is a `Record<LabelId, Wording>`: an id without both
 *   registers does not compile. States are keyed by the ids the engine already uses — « interdit »
 *   keeps its internal id `refuse-usage-interdit`; only what is printed changes.
 * - **A quantity a simplified Page does not show still has a terrain string.** `hiddenOnTerrain`
 *   says so (« masqué » in #61's table, « supposé, non saisi » for the start multiplier); the
 *   string is then the exact one and a Page must not render it.
 * - **Never on screen**: montage, usage, conforme, hors norme, tension cible, tension permanente,
 *   station, tracé, coeff, pourcentage, charge du passager, personne — `labels.test.ts` walks both
 *   registers and refuses them.
 */

import type { VerdictState } from "@/lib/sim";

export type Register = "terrain" | "exact";

/** One entry: what each register prints. The terrain string of a hidden entry is never shown. */
export type Wording = {
  readonly terrain: string;
  readonly exact: string;
  readonly hiddenOnTerrain?: true;
};

/** Failure states that have a name of their own on screen. `refusals.ts` and `gates.ts` print them. */
export type ErrorStateId =
  | "tension-impossible"
  | "cible-inatteignable"
  | "calcul-impossible"
  | "saisie-en-cours"
  | "aucun-resultat";

/** The five Verdict States and the error states: every « état » the interface names. */
export type StateId = VerdictState | ErrorStateId;

/** Every quantity, device and object #61's table names. */
export type TermId =
  // The line and how it is specified.
  | "line"
  | "carryingLines"
  | "upperLine"
  | "lowerLine"
  | "rope"
  | "cable"
  | "lineFamily"
  | "anchorLine"
  | "pretension"
  | "horizontalTension"
  | "standingTension"
  | "unstretchedLength"
  | "sag"
  | "sagRatio"
  | "loadedSag"
  | "span"
  | "elevationDifference"
  // The ground.
  | "profile"
  | "distance"
  | "groundClearance"
  | "requiredClearance"
  | "lineClearance"
  | "traverseClearance"
  | "riderEnvelope"
  | "anchor"
  | "anchorHeight"
  // The safety judgement.
  | "regime"
  | "safetyFactor"
  | "startMultiplier"
  | "vRatio"
  | "installation"
  | "permanentInstallation"
  | "temporaryInstallation"
  | "verdict"
  // The ends and the material.
  | "termination"
  | "efficiency"
  | "diameter"
  | "breakingLoad"
  | "ropeClass"
  | "grade"
  | "axialStiffness"
  | "relativeStiffness"
  | "linearMass"
  | "linearWeight"
  | "construction"
  | "constructionFibreCore"
  | "constructionIwrc"
  // The passager and the rest of the held vocabulary.
  | "passenger"
  | "passengerMass"
  | "riderPosition"
  | "tensioningDevice"
  | "tensioningSide"
  | "maestro"
  | "pulleySystem"
  | "tensionLimit"
  | "arrivalSpeed"
  | "stopPoint"
  | "banana"
  | "wind"
  | "windSpeed"
  | "windDirection"
  | "dragArea"
  | "trolleyConstantFriction"
  | "trolleySpeedFriction"
  | "trolleyFrictionRatio"
  | "airDensity"
  | "estimate"
  | "traverse"
  | "unloadedLine"
  | "trajectory"
  | "seeWholeLine"
  | "page";

export type LabelId = TermId | StateId;

/** Same word in both registers. */
function same(word: string): Wording {
  return { terrain: word, exact: word };
}

/** A quantity only Avancé names: the terrain string is the exact one and is not to be shown. */
function exactOnly(word: string): Wording {
  return { terrain: word, exact: word, hiddenOnTerrain: true };
}

/**
 * What the interface never says, in either register — #61's « jamais » list. Matched as lowercase
 * word starts. « conforme » and « hors norme » are the two Verdict words the five states replace;
 * « charge du passager » and « personne » are the passager. « prétension cible » is « tension cible »
 * with a prefix a word-start match cannot see through.
 */
export const PROSCRIBED_WORDS = [
  "montage",
  "usage",
  "conforme",
  "hors norme",
  "tension cible",
  "prétension cible",
  "tension permanente",
  "station",
  "tracé",
  "coeff",
  "pourcentage",
  "charge du passager",
  "charge passager",
  "personne",
] as const;

/**
 * The proscribed words a piece of copy contains, for a test to name them in its failure. A word
 * counts from its first letter, so « stations » and « coefficient » are caught while « attestation »
 * is not.
 */
export function proscribedIn(copy: string): readonly string[] {
  const lower = copy.toLocaleLowerCase("fr");
  return PROSCRIBED_WORDS.filter((word) => new RegExp(`(?<!\\p{L})${word}`, "u").test(lower));
}

export const LABELS = {
  // ── The line and how it is specified ──────────────────────────────────────────────────────
  line: same("ligne"),
  carryingLines: same("Brins porteurs"),
  upperLine: same("ligne du haut"),
  lowerLine: same("ligne du bas"),
  rope: same("corde"),
  cable: same("câble"),
  lineFamily: same("famille de ligne"),
  anchorLine: same("ligne A–B"),
  // Read at the anchor carrying the Mise en tension, per member — never the horizontal `H`.
  pretension: { terrain: "tension de pose", exact: "prétension" },
  horizontalTension: exactOnly("tension horizontale"),
  standingTension: exactOnly("tension à vide"),
  unstretchedLength: { terrain: "longueur à vide", exact: "longueur non tendue" },
  sag: { terrain: "flèche", exact: "flèche à vide" },
  sagRatio: exactOnly("flèche / portée"),
  loadedSag: same("flèche chargée"),
  span: same("portée"),
  elevationDifference: same("dénivelé"),

  // ── The ground ────────────────────────────────────────────────────────────────────────────
  profile: same("profil"),
  distance: same("distance"),
  groundClearance: same("garde au sol"),
  requiredClearance: same("garde exigée"),
  lineClearance: exactOnly("garde min. ligne"),
  traverseClearance: exactOnly("garde min (traversée)"),
  riderEnvelope: same("gabarit du passager"),
  anchor: same("ancrage"),
  anchorHeight: same("hauteur d'ancrage"),

  // ── The safety judgement ──────────────────────────────────────────────────────────────────
  regime: { terrain: "marge exigée", exact: "régime de sécurité" },
  safetyFactor: { terrain: "facteur de sécurité", exact: "FS" },
  startMultiplier: exactOnly("majoration au départ"),
  vRatio: exactOnly("rapport V"),
  installation: same("installation"),
  permanentInstallation: same("installation permanente"),
  temporaryInstallation: same("installation temporaire"),
  verdict: same("Verdict"),

  // ── The ends and the material ─────────────────────────────────────────────────────────────
  termination: exactOnly("terminaison"),
  efficiency: exactOnly("rendement"),
  diameter: { terrain: "diamètre", exact: "diamètre nominal" },
  breakingLoad: same("charge de rupture"),
  ropeClass: exactOnly("classe de corde"),
  grade: exactOnly("grade"),
  axialStiffness: exactOnly("raideur axiale"),
  relativeStiffness: exactOnly("raideur relative EA/MBL"),
  linearMass: exactOnly("masse linéique"),
  linearWeight: exactOnly("poids linéique"),
  construction: exactOnly("construction"),
  constructionFibreCore: exactOnly("6×19"),
  constructionIwrc: exactOnly("6×19 métallique"),

  // ── The passager and the rest of the held vocabulary ──────────────────────────────────────
  passenger: same("passager"),
  passengerMass: same("masse du passager"),
  riderPosition: same("position du passager"),
  tensioningDevice: same("Mise en tension"),
  tensioningSide: same("côté de la Mise en tension"),
  maestro: same("Maestro"),
  pulleySystem: same("mouflage"),
  tensionLimit: same("limite de tension"),
  arrivalSpeed: same("vitesse d'arrivée"),
  stopPoint: same("point d'arrêt"),
  banana: same("banane"),
  wind: same("vent"),
  windSpeed: same("vitesse du vent"),
  windDirection: same("direction du vent"),
  // The ride's constants (#89) are set on Avancé only, in the SSF page's own words where it has some.
  dragArea: exactOnly("surface de traînée C_dA"),
  trolleyConstantFriction: exactOnly("frottement constant de la poulie F₀"),
  trolleySpeedFriction: exactOnly("frottement de la poulie proportionnel à la vitesse k_v"),
  trolleyFrictionRatio: exactOnly("frottement de la poulie μ"),
  airDensity: exactOnly("masse volumique de l'air ρ"),
  estimate: same("estimation"),
  traverse: same("traversée"),
  unloadedLine: same("ligne à vide"),
  trajectory: same("trajectoire"),
  seeWholeLine: same("voir toute la ligne"),
  page: same("Page"),

  // ── States: the five Verdict States, then the error states ────────────────────────────────
  "dans-les-limites": same("Dans les limites"),
  "marge-faible": same("Marge faible"),
  "hors-limites": same("Hors limites"),
  "refuse-usage-interdit": same("Interdit"),
  indetermine: same("Indéterminé"),
  "tension-impossible": same("Tension impossible"),
  "cible-inatteignable": same("Cible inatteignable"),
  "calcul-impossible": same("Calcul impossible"),
  "saisie-en-cours": same("Saisie en cours"),
  "aucun-resultat": same("Aucun résultat"),
} as const satisfies Record<LabelId, Wording>;

/** The wording as the table spells it: lowercase for a quantity, capitalised for a state. */
export function label(id: LabelId, register: Register): string {
  return LABELS[id][register];
}

/** The wording opening a label or a sentence. `FS`, `6×19` and `Maestro` are left as they are. */
export function heading(id: LabelId, register: Register): string {
  const word = label(id, register);
  return word.charAt(0).toLocaleUpperCase("fr") + word.slice(1);
}
