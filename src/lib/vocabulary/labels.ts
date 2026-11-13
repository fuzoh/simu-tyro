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
 * - **Never on screen**: {@link PROSCRIBED_WORDS} — `labels.test.ts` walks both registers, then every
 *   string the app's source prints, and refuses them.
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
  | "anchorZone"
  | "anchorZones"
  | "riderEnvelope"
  | "anchor"
  | "anchors"
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
  | "position"
  | "latitude"
  | "longitude"
  | "lv95"
  | "approximate"
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
  | "loadedLine"
  | "internalTension"
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
 * with a prefix a word-start match cannot see through. « validé » is never said of the engine: the
 * essai makes it « cohérent », and what it does not show is « pas confirmé ». The rest are
 * GLOSSARY's _Avoid_ words for a corde or a câble (textile, acier, âme, gaine), an ancrage
 * (amarrage), the Banane (déport), the flèche, the longueur à vide, the marge exigée and the garde.
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
  "validé",
  "textile",
  "acier",
  "âme",
  "gaine",
  "amarrage",
  "déport",
  "flèche cible",
  "longueur de corde",
  "marge de sécurité",
  "câble à vide",
  "corde à vide",
  "garde minimale",
  "garde passager",
  "garde sous le passager",
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
  // Where the garde is not judged (#106). Named on every Page; its length is set on Avancé alone.
  anchorZone: same("zone d'ancrage"),
  anchorZones: same("zones d'ancrage"),
  riderEnvelope: same("gabarit du passager"),
  anchor: same("ancrage"),
  // The pair, as a group heading names them: a plural is a wording of its own, not a suffix.
  anchors: same("ancrages"),
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
  position: same("position"),
  latitude: same("latitude"),
  longitude: same("longitude"),
  lv95: same("LV95"),
  approximate: same("approchée"),
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
  loadedLine: same("ligne chargée"),
  // The tension the line carries at one point of it, at the passager's position (#119). Avancé's.
  internalTension: exactOnly("tension interne"),
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

/**
 * The symbols of the physics that name an exact-register quantity: `η` is the rendement and `DAF`
 * the majoration au départ, and neither has a wording of its own in {@link LABELS} to be caught by.
 */
const EXACT_SYMBOLS = ["η", "DAF"] as const;

/**
 * The wordings a terrain Page must not print: every entry Avancé alone names (`hiddenOnTerrain`)
 * and every exact wording that differs from its terrain one — « prétension », « flèche à vide »,
 * « régime de sécurité », « FS »…
 */
const EXACT_ONLY_WORDINGS: readonly string[] = [
  ...new Set([
    ...(Object.keys(LABELS) as LabelId[])
      .map((id): Wording => LABELS[id])
      .filter((wording) => wording.hiddenOnTerrain === true || wording.exact !== wording.terrain)
      .map((wording) => wording.exact),
    ...EXACT_SYMBOLS,
  ]),
];

/**
 * The exact-register wordings a piece of copy contains, for a test to name them in its failure.
 * A wording counts as a whole word, plural included — « terminaisons » is caught, « dégradé » is not
 * « grade » and « flèche » is not « flèche à vide ».
 */
export function exactTermsIn(copy: string): readonly string[] {
  const lower = copy.toLocaleLowerCase("fr");
  return EXACT_ONLY_WORDINGS.filter((wording) => {
    const escaped = wording.toLocaleLowerCase("fr").replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
    return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}s?(?![\\p{L}\\p{N}])`, "u").test(lower);
  });
}

/** Does a simplified Page leave this quantity unnamed — « masqué » or « supposé, non saisi » (#61)? */
export function isHiddenTerm(id: LabelId): boolean {
  const wording: Wording = LABELS[id];
  return wording.hiddenOnTerrain === true;
}

/** The wording as the table spells it: lowercase for a quantity, capitalised for a state. */
export function label(id: LabelId, register: Register): string {
  return LABELS[id][register];
}

/** The wording opening a label or a sentence. `FS`, `6×19` and `Maestro` are left as they are. */
export function heading(id: LabelId, register: Register): string {
  const word = label(id, register);
  return word.charAt(0).toLocaleUpperCase("fr") + word.slice(1);
}
