/**
 * The Rail's **help copy** — what every field asks for and how every displayed value is computed,
 * in French, one paragraph per item (decision of 2026-09-23). Rendered by `InfoTip` in
 * `src/components/rail/controls.tsx` as a tooltip beside the label.
 *
 * Rules this module exists to keep:
 *
 * - **Copy lives here, never in a component.** The strings are data the `node` suite can reach, and
 *   a component that inlines its own explanation is a second place the formula can drift.
 * - **Every entry says two things: what the value is, and where it comes from.** An input names its
 *   role in the computation; a read-out names the formula or the reduction that produced it. A
 *   sentence that only restates the label is not help.
 * - **Formulas are quoted as the engine computes them**, with the § of `docs/simulation-theory.md`
 *   they trace back to — **that file and no other**: `@/components/docs/help-text.tsx` renders every
 *   `§n.m` as a link to `/docs/modele#s-n-m`, and `@/lib/docs/refs.test.ts` fails on a § that names
 *   no heading there. Nothing here invents a coefficient: where a value is a `[CONVENTION]`, the
 *   copy says so.
 * - **Total over the ids it keys.** `FIELD_HELP` is a `Record<FieldId, string>`, so a new field
 *   without help is a type error, not a silent hole.
 */

import type { CellId } from "./cells.ts";
import type { DeducedRowId } from "./deduced.ts";
import type { FieldId } from "./fields.ts";
import type { ResultGridRow, ResultRowId } from "./results.ts";

/** Help for every input of `Paramètres` and every editable derived row, by field id. */
export const FIELD_HELP: Record<FieldId, string> = {
  usage:
    "Installation de la ligne (§10.4). Une installation permanente est une attraction fixe ouverte au public : seul le câble acier y est admis, car la corde textile flue, s'abîme aux UV et à l'abrasion et peut fondre par friction (HMPE ≈ 144–152 °C). Une installation temporaire (secours, expédition) ouvre la corde textile et le régime « Secours textile 10:1 ». Ce choix ne change aucun calcul mécanique : il fixe quelles familles et quels régimes sont disponibles.",
  regime:
    "Le référentiel de sécurité contre lequel le verdict est rendu. Chaque régime fixe un diviseur k : la tension admissible vaut T adm = η · MBF / k et le facteur de sécurité effectif FS = η · MBF / T max majoré doit atteindre k. Certains régimes ajoutent un second critère (charge suspendue) ou une obligation non évaluée (essai de charge 2×). « — choisir — » est un état légitime : sans régime, l'outil calcule tout sauf le verdict et la grille critères × extrémités.",
  L: "Portée horizontale L entre les deux ancrages, en mètres. C'est la longueur de référence de toute la statique : la chaînette y est résolue, la flèche s'exprime en fraction de L, et le passager se déplace sur x ∈ [0, L]. Le domaine de validité des références est 50 – 2000 m ; hors de cette bande, un avertissement s'affiche mais le calcul reste effectué.",
  h: "Dénivelé h = z(B) − z(A) entre les deux ancrages, en mètres. Négatif quand B est plus bas que A (ligne descendante). Il fixe la ligne A–B et la pente moyenne. Sur un sol plan (mode manuel, sol = droite entre les bases), le dénivelé n'apporte aucune garde au sol supplémentaire : celle-ci dépend surtout des hauteurs d'ancrage et de la flèche chargée.",
  zA: "Hauteur de l'ancrage A au-dessus de sa base au sol, en mètres. En mode manuel, la base A est l'origine du sol et cette hauteur fixe directement la garde disponible sous la ligne côté A. Avec un profil importé, elle s'ajoute à l'altitude du premier point du profil, sous l'ancrage A, pour donner l'altitude de l'ancrage, et entre donc dans le dénivelé résolu.",
  zB: "Hauteur de l'ancrage B au-dessus de sa base au sol, en mètres. Même rôle que la hauteur A : en mode manuel elle fixe la garde côté B ; avec un profil importé elle s'ajoute à l'altitude du dernier point du profil, sous l'ancrage B, et entre dans le dénivelé résolu.",
  family:
    "Famille de ligne : câble acier (famille A) ou corde textile (famille B). Les deux modèles physiques sont distincts : l'acier est quasi élastique et ses terminaisons sont normalisées (EN 13411) ; la corde textile flue, sa raideur est exprimée en EA = k · MBL, et §10.4 la réserve aux installations temporaires. La spécification de l'autre famille est conservée en mémoire et restaurée si vous revenez dessus.",
  carryingLines:
    "Nombre de lignes porteuses de la portée : une ligne, ou deux lignes identiques — ligne du haut et ligne du bas — à la même tension de pose. Avec deux lignes, le chariot partage le passager à 50/50 : chaque ligne porte la charge ponctuelle P / 2 = m_p · g / 2 (§6.1) en plus de son propre poids, et les tensions, la garde au sol et le verdict sont ceux d'une ligne, jugés avec les mêmes règles. L'écart entre les deux lignes est constant et n'entre dans aucun calcul. Lors de l'essai du 1er novembre 2026, la ligne du bas a porté plus de la moitié : le partage 50/50 n'est pas validé, d'où la ligne « Cas défavorable » dans les résultats.",
  d: "Diamètre nominal du câble acier, en millimètres. Il entre au carré dans les trois valeurs déduites : MBF = K · d² · R₀, EA = E_app · C · d² et μ = W · d² / 100 (§13.1, EN 12385-4). La bande usuelle des tyroliennes est 6 – 26 mm [CONVENTION] ; au-delà, un avertissement s'affiche.",
  R0: "Grade du fil d'acier R₀, en N/mm² : résistance à la traction nominale des fils (1770 ou 1960). Il multiplie la charge de rupture : MBF = K · d² · R₀ / 1000 (kN). Les facteurs K sont attestés pour ces deux grades exactement, d'où l'absence de grade libre.",
  cst: "Construction du câble : 6×19 ou 6×19 métallique (IWRC). Elle choisit le facteur K de la charge de rupture (0,330 pour 6×19, 0,356 pour 6×19 métallique — EN 12385-4) et pèse dans la raideur axiale et la masse linéique. Pour une autre construction (6×36…), saisissez directement MBF et μ dans « Valeurs déduites ».",
  mbfOverride:
    "Charge de rupture minimale MBF du câble, en force. Valeur déduite MBF = K · d² · R₀ / 1000 (kN) depuis §13.1 ; saisir une valeur (fiche fabricant) remplace la formule et marque la ligne « valeur saisie ». C'est le numérateur de tous les critères du verdict : T adm = η · MBF / k et FS = η · MBF / T max majoré. « Recalculer » revient à la formule.",
  eaOverride:
    "Raideur axiale EA du câble, en MN : produit du module apparent et de la section métallique. Déduite par EA = E_app · C · d² avec E_app 115 GPa et C 0,4165, milieux des plages §13.1 [CONVENTION]. Elle règle l'allongement élastique : plus EA est grand, moins la ligne s'allonge sous le passager et moins la flèche chargée augmente. Une valeur saisie remplace la formule.",
  muOverride:
    "Masse linéique μ du câble, en kg/m. Déduite par μ = W · d² / 100 avec W 0,3795, milieu de la plage §13.1. Le poids linéique w = μ · g est la charge répartie qui donne la chaînette à vide : il fixe la flèche à vide pour une prétension donnée et entre dans les tensions aux ancrages. Une valeur saisie remplace la formule.",
  cls: "Classe de corde textile : HMPE 12 torons, polyamide EN 1891 type A ou polyester semi-statique. Elle fixe la raideur relative k par défaut (22 pour HMPE, 1,5 pour PA, aucune valeur publiée pour le polyester) et la liste des terminaisons admises : sur HMPE les nœuds glissent et sont désactivés (§10.3).",
  MBL: "Charge de rupture minimale MBL de la corde, en force, à lire sur la fiche fabricant — aucune corde n'est fournie par défaut, car une MBL inventée déciderait seule du verdict. C'est le numérateur de T adm = η · MBL / k et de FS = η · MBL / T max majoré, et le dénominateur de la tension à vide en % MBL.",
  muTextile:
    "Masse linéique μ de la corde, en kg/m, à lire sur la fiche fabricant. Le poids linéique w = μ · g est la charge répartie qui forme la chaînette à vide et entre dans les tensions aux ancrages.",
  dTextile:
    "Diamètre nominal de la corde, en millimètres, à lire sur la fiche fabricant. Facultatif : aucune formule du modèle ne le lit, il est porté par le lien pour la mise en tension.",
  k: "Raideur relative k = EA / MBL de la corde (sans unité). La raideur axiale déduite vaut EA = k · MBL. §13.2 publie k pour une charge de travail de 10 – 30 % MBL, alors qu'une tyrolienne travaille bien en dessous (≈ 0,6 % au repos, ≈ 6,3 % chargée) : la valeur est donc « non confirmée » par nature.",
  ta: "Type de terminaison à l'ancrage A. Chaque terminaison porte un rendement η par défaut (§10.2 acier, §10.3 textile), pris à l'extrémité conservatrice de sa plage, que le champ « Rendement η » ci-dessous reprend et laisse modifier. « Serre-câbles étrier » reste sélectionnable mais est interdit par le verdict sur une ligne portant des passagers ; « Attelage sans tension » (η = 1) désigne une extrémité attelée sans mise en tension de l'attache, qui n'affaiblit pas la ligne.",
  tb: "Type de terminaison à l'ancrage B. Même règle qu'en A : le rendement η par défaut est celui de §10.2/§10.3 à son extrémité conservatrice, repris dans le champ « Rendement η » et modifiable. Les deux extrémités sont jugées séparément dans la grille critères × extrémités.",
  etaA: "Rendement de la terminaison A, η_A ∈ ]0, 1] : fraction de la charge de rupture que la ligne conserve à cette extrémité. Il multiplie directement la tension admissible T adm,A = η_A · MBF / k et le facteur de sécurité FS_A = η_A · MBF / T max,A majoré. Prérempli depuis le type choisi ; une valeur modifiée passe en « valeur utilisateur » dans la provenance.",
  etaB: "Rendement de la terminaison B, η_B ∈ ]0, 1] : fraction de la charge de rupture conservée à cette extrémité. T adm,B = η_B · MBF / k et FS_B = η_B · MBF / T max,B majoré. Le critère « charge suspendue » utilise min(η_A, η_B), car une ligne cède à sa terminaison la plus faible.",
  tensioningDevice:
    "Dispositif qui tend la ligne et la retient : mouflage, Maestro S ou Maestro L. Les deux Maestro ne se posent que sur une corde. Information descriptive : il ne change ni la statique, ni le balayage, ni le verdict. Sa seule conséquence est un avertissement quand la prétension demandée, par ligne, dépasse la charge d'utilisation publiée par Petzl pour le diamètre de corde saisi (Maestro S : 150 kg à 10 mm, 250 kg de 10,5 à 11,5 mm ; Maestro L : 280 kg de 12,5 à 13 mm). C'est la charge d'utilisation, pas le seuil de glissement : le glissement n'est pas un fusible et ne se calibre pas.",
  tensioningSide:
    "Ancrage où se trouve la Mise en tension : A ou B. C'est là que se lit la prétension, par ligne — ce que montre un dynamomètre posé entre cet ancrage et le Maestro. La tension à vide est la plus grande à l'ancrage le plus haut (§2) : sur une portée inclinée, changer de côté change la prétension lue et, quand la prétension est le pilote, la longueur non tendue L₀ qui la donne.",
  D_target:
    "Flèche à vide voulue, en mètres : creux maximal de la ligne sans passager sous la ligne A–B. Le solveur cherche la longueur non tendue L₀ (et donc la tension horizontale H) qui donne exactement cette flèche à la chaînette élastique (§4, §5). C'est le pilote de tension par défaut, car sa valeur est exacte à la précision affichée.",
  T_target:
    "Prétension voulue, par ligne : la tension de la ligne à vide à l'ancrage de la Mise en tension, celle que lit un dynamomètre entre cet ancrage et le Maestro. Le solveur cherche la longueur non tendue L₀ qui donne cette tension à cet ancrage (§7). La tension à l'ancrage passe par un minimum sur une ligne très lâche : seule la branche tendue est retenue, et une prétension sous ce minimum est « Cible inatteignable ». Une prétension que la ligne ne peut porter sans rompre est refusée (« Tension impossible », §5.4). Avec deux Brins porteurs, chaque ligne reçoit cette prétension.",
  H_target:
    "Tension horizontale voulue H : composante horizontale de la tension, constante sur toute la ligne à vide. Ce n'est pas la prétension : à l'ancrage, T = √(H² + V²) est plus grande. Le solveur cherche la longueur non tendue L₀ qui, sous le poids propre w = μ · g, donne cette H (§7). Une H que la ligne ne peut porter sans rompre est refusée par le moteur (« Tension impossible », §5.4).",
  L0: "Longueur non tendue L₀ de la ligne, en mètres : longueur du câble hors charge, avant allongement élastique. C'est la vraie grandeur d'état du modèle — les autres pilotes s'y ramènent. La ligne installée s'allonge de T · L₀ / EA ; L₀ doit dépasser la ligne A–B moins cet allongement.",
  vRatio:
    "Rapport V = P / H : poids du passager P = m_p · g sur la tension horizontale H. C'est un paramétrage du pilote « H » : H voulue = m_p · g / rapport. Plus le rapport est grand, plus H est faible et plus la ligne forme un V profond sous le passager.",
  mp: "Masse du passager m_p, en kg. La charge ponctuelle appliquée à la ligne vaut P = m_p · g ; elle crée le point anguleux de la chaînette chargée, augmente les tensions aux ancrages et la flèche chargée. Les 120 kg par défaut sont attribués à EN 15567-1 mais non vérifiés dans le texte primaire.",
  hRider:
    "Gabarit du passager h_rider, en mètres : hauteur occupée sous le câble par le passager, son harnais et sa poulie. Elle est soustraite directement de la hauteur du câble pour obtenir la garde au sol : h_clear(x) = z_câble(x) − z_sol(x) − h_rider (§11). 2,1 m est une [CONVENTION] : aucune valeur normative n'est publiée.",
  hClearMin:
    "Garde exigée, en mètres : le seuil en dessous duquel la garde au sol calculée est jugée insuffisante. L'outil compare la garde minimale (traversée) — le minimum de h_clear sur toutes les positions du passager — à cette valeur ; sous le seuil, la ligne « Garde min (traversée) » et la cellule « Garde min. ligne » passent en rouge. 1,0 m est une [CONVENTION] ; 0 désactive la vérification. Ce seuil ne modifie aucun calcul.",
  DAF: "Majoration au départ, notée DAF dans les formules (§8.2). Elle majore l'écart de tension dû au passager : T max majoré = T à vide + DAF · (T chargé − T à vide). C'est ce T majoré que divise le facteur de sécurité. 1,2 est le plafond mesuré pour un départ contrôlé sur ligne tendue [FIELD:SSF] ; sous 3 % de flèche / portée, la ligne sort du régime où il a été mesuré. Elle ne touche pas la garde au sol.",
  xD: "Position du passager x_D le long de la portée, en mètres depuis l'ancrage A. Elle sélectionne une vue : les cinq cellules de lecture (garde, tensions, pente, flèche) sont calculées pour le passager à cette position, et le profil la dessine. Elle est ramenée dans [0, L] à chaque changement de portée et n'entre dans aucun agrégat « traversée ».",
  windSpeed:
    "Vitesse du vent, en km/h (0 ou plus). 0 est l'absence de vent, et c'est ce que lit un lien qui n'en porte pas. Information descriptive pour l'instant : elle ne change ni la statique, ni la garde au sol, ni le verdict. Elle servira à la dynamique du passager, qui en projette la composante le long de la ligne.",
  windDirection:
    "Direction du vent : d'où il vient, relativement au sens de parcours A → B, en degrés dans le sens horaire vu de dessus. 0° est un vent de face, 90° un vent de la droite, 180° un vent dans le dos, 270° un vent de la gauche. Elle est relative à la ligne, pas au nord : le scénario reste le même sans carte. Sans effet tant que la vitesse est nulle.",
  latA: positionHelp("la latitude", "A"),
  lonA: positionHelp("la longitude", "A"),
  latB: positionHelp("la latitude", "B"),
  lonB: positionHelp("la longitude", "B"),
};

/**
 * Both coordinates of a Position say the same thing, so one sentence builds all four. The LV95
 * reading beside them is swisstopo's approximate formula, which is why it is said to be one.
 */
function positionHelp(coordinate: string, anchor: "A" | "B"): string {
  return (
    `Position de l'ancrage ${anchor} : ${coordinate} en WGS84, en degrés décimaux (six décimales, soit environ 0,1 m). ` +
    "Latitude et longitude vont ensemble : une Position n'existe qu'avec les deux, et laissées vides elles sont inconnues. " +
    "La lecture LV95 à côté est une conversion approchée de swisstopo, précise à environ 1 m en Suisse. " +
    "Informatif pour l'instant : une Position ne change ni la statique, ni la garde au sol, ni le verdict. " +
    "Un fichier CSV geo.admin avec ses colonnes Longitude et Latitude la remplit."
  );
}

/** Help for the LV95 reading beside an anchor's Position. */
export const LV95_HELP =
  "Lecture de la Position dans le système suisse LV95 (est, nord), en mètres. C'est la conversion approchée de swisstopo depuis WGS84, précise à environ 1 m en Suisse ; la conversion exacte (REFRAME) viendra avec le profil geo.admin. Elle ne sert qu'à la lecture et ne change aucun calcul.";

/** Help for the pilot control of `Tension de la ligne` — a segmented control, not a field. */
export const TIGHTNESS_HELP =
  "Pilote de tension : exactement une des cinq grandeurs est saisie, les quatre autres sont déduites. « Flèche » fixe la flèche à vide, « Prétension » la tension à l'ancrage de la Mise en tension, « H » la tension horizontale, « Longueur » la longueur non tendue L₀, « Rapport V » le rapport P / H. Changer de pilote préremplit le nouveau champ avec la valeur déduite courante, à sa précision d'affichage, de sorte que la ligne ne bouge pas.";

/** Help for the read-only rows of `Valeurs déduites`. The three steel derived rows use {@link FIELD_HELP}. */
export const DEDUCED_HELP: Record<DeducedRowId, string> = {
  L: "Portée déduite du profil importé, pris entier d'un ancrage à l'autre : son premier point est sous l'ancrage A, son dernier sous l'ancrage B. L = distance du dernier point − distance du premier, en mètres. Avec un profil la portée n'est pas saisie.",
  h: "Dénivelé déduit du profil importé : h = (altitude du dernier point + hauteur B) − (altitude du premier point + hauteur A), en mètres. Négatif quand l'ancrage B est plus bas que A.",
  zBaseA:
    "Altitude du sol sous l'ancrage A : celle du premier point du profil importé (colonne Altitude). L'ancrage A se trouve à cette altitude plus la hauteur d'ancrage A.",
  zBaseB:
    "Altitude du sol sous l'ancrage B : celle du dernier point du profil importé. L'ancrage B se trouve à cette altitude plus la hauteur d'ancrage B.",
  MBL: "Charge de rupture minimale MBL de la corde, telle que saisie, affichée dans l'unité de force choisie. Numérateur de T adm = η · MBL / k et de FS = η · MBL / T max majoré.",
  EAtextile:
    "Raideur axiale de la corde EA = k · MBL, en MN (§13.2). Elle règle l'allongement élastique sous charge : plus EA est grand, moins la flèche chargée augmente.",
  w: "Poids linéique de la ligne w = μ · g, en force par mètre. C'est la charge répartie qui donne la forme de chaînette à vide : constante C = H / w, y(x) = C · cosh((x − x₀) / C) + y₀ (§3, §4).",
  chord:
    "Longueur de la ligne A–B, droite entre les deux ancrages : √(L² + h²), en mètres. Toute longueur non tendue L₀ doit dépasser cette longueur diminuée de l'allongement élastique ; la borne §5.4 refuse une tension qui ne la respecte pas.",
  L0: "Longueur non tendue L₀ résolue par le solveur pour le pilote choisi (flèche, prétension, tension horizontale ou rapport V), en mètres. C'est la longueur de câble à mesurer hors charge avant de monter la ligne. Elle est préremplie dans le champ si vous passez au pilote « Longueur ».",
  pretension:
    "Prétension de la ligne à vide, par ligne : sa tension à l'ancrage de la Mise en tension, T = √(H² + V²) à cet ancrage (§2) — ce que lit un dynamomètre entre cet ancrage et le Maestro. Préremplie dans le champ si vous passez au pilote « Prétension ».",
  H: "Tension horizontale H de la ligne à vide, résolue par le solveur pour le pilote choisi. Constante sur toute la ligne ; la tension totale en un point vaut T = H / cos θ, si bien que la prétension, lue à un ancrage, est plus grande. Préremplie dans le champ si vous passez au pilote « H ».",
  sag: "Flèche à vide : creux maximal de la ligne sans passager sous la ligne A–B, en mètres, et la position x où il se produit. Résolue depuis la chaînette élastique pour la L₀ courante (§4). Préremplie dans le champ si vous passez au pilote « Flèche ».",
  vRatio:
    "Rapport V = P / H de la ligne à vide : poids du passager m_p · g sur la tension horizontale H. Prérempli dans le champ si vous passez au pilote « Rapport V ».",
  sagRatio:
    "Rapport flèche à vide / portée, en %. C'est un indicateur de validité du modèle : sous 3 % (§8.2) la ligne se raidit, la réponse dynamique est mal décrite et la majoration au départ 1,2 sort de son régime de mesure — un avertissement s'affiche alors ici et sur la majoration au départ.",
  standingTension:
    "Tension à vide : max(T_A, T_B) à vide rapportée à la charge de rupture, en % MBF (acier) ou % MBL (textile). Sur corde textile, §9.2 recommande de rester sous 30 % MBL pour limiter le fluage — c'est un critère de durée de vie, pas de résistance ; la résistance est jugée par le verdict.",
};

/** Help for the rows of `Résultats`, by their id. */
export const RESULT_HELP: Record<ResultRowId, string> = {
  verdict:
    "Verdict rendu contre le régime choisi, sur toute la traversée. Cinq états : « Dans les limites » (FS effectif ≥ 1,1 · k), « Marge faible » (k ≤ FS < 1,1 · k), « Hors limites » (FS < k sur le critère nommé), « Interdit » (règle réglementaire qui survit à toute marge : serre-câbles sur ligne portant des passagers, textile en installation permanente, régime indisponible), « Indéterminé » (pas de la traversée non résolus). Le bandeau nomme la cellule gouvernante.",
  FS: "Facteur de sécurité effectif de l'extrémité la plus chargée : FS = η · MBF / T max majoré, où T max majoré = T à vide + DAF · (T chargé − T à vide) pris au pire pas de la traversée. Affiché contre le k exigé par le régime pour le critère tension totale. Ce n'est pas un taux d'utilisation : c'est le rapport que vous pouvez recalculer vous-même.",
  Tmax: "Tension maximale majorée sur toute la traversée : T à vide + DAF · (T chargé − T à vide), à l'ancrage et pour la position du passager qui la produisent. C'est la grandeur que divise le FS effectif. Elle diffère de « T anc. » des cellules de lecture, qui est la tension statique pour la seule position affichée.",
  clearance:
    "Garde au sol minimale sur toute la traversée : minimum, pour toutes les positions du passager x_P ∈ [0, L], de h_clear(x, x_P) = z_câble(x, x_P) − z_sol(x) − h_rider (§11). La position du passager qui la produit est nommée. Elle est comparée à la garde exigée et passe en rouge sous ce seuil. Elle diffère de la cellule « Garde min. ligne », qui vaut pour la seule position affichée.",
  reserve:
    "Réserve de tension avant T admissible à l'ancrage gouvernant : T adm − T max majoré, en force. Positive, c'est de combien la tension peut encore croître avant que FS ne tombe à k ; négative, c'est l'excès à retirer. C'est la forme qui répond à « combien puis-je encore tendre » sans arithmétique.",
  TadmA:
    "Tension admissible à l'ancrage A : T adm,A = η_A · MBF / k (ou MBL sur textile). C'est la tension majorée maximale que le régime tolère à cette extrémité, compte tenu du rendement de sa terminaison.",
  TadmB:
    "Tension admissible à l'ancrage B : T adm,B = η_B · MBF / k (ou MBL sur textile). Les deux extrémités peuvent différer par leur rendement η et par leur tension, d'où deux cellules dans la grille.",
  TmaxA:
    "Tension maximale majorée à l'ancrage A sur la traversée : T à vide,A + DAF · (T chargé,A − T à vide,A) au pire pas. L'ancrage le plus haut porte en général la tension la plus forte.",
  TmaxB:
    "Tension maximale majorée à l'ancrage B sur la traversée : T à vide,B + DAF · (T chargé,B − T à vide,B) au pire pas.",
  Tstatic:
    "Tension maximale statique (sans majoration au départ) à l'ancrage le plus chargé, sur toute la traversée : le plus grand T chargé résolu par le balayage du passager. La ligne suivante montre la majoration que le DAF y ajoute.",
  amplification:
    "Majoration au départ ajoutée à la tension statique : DAF · (T chargé − T à vide) − (T chargé − T à vide) = (DAF − 1) · (T chargé − T à vide), à l'ancrage de la ligne au-dessus. La somme des deux lignes est T max majoré.",
  loadedSag:
    "Flèche chargée maximale : le plus grand écart vertical entre la ligne A–B et le nœud du passager sur toute la traversée, en mètres. Le point anguleux de la chaînette chargée est son point bas ; c'est cette flèche qui consomme la garde au sol.",
  coverage:
    "Couverture du balayage : nombre de positions du passager résolues sur le nombre de positions tentées (grille uniforme plus pas géométriques resserrés près des ancrages). Sous 100 %, le verdict est « Indéterminé » : un pas non résolu peut cacher le pire cas.",
  memberLoad:
    "Charge ponctuelle que porte chacune des deux lignes : P / 2 = m_p · g / 2, le chariot partageant le passager à 50/50. Toutes les tensions, la garde au sol et le verdict de ce bloc sont calculés pour une ligne sous cette charge (§6.1).",
  pairTotal:
    "Somme des tensions des deux lignes à l'ancrage le plus chargé : 2 × T max (traversée), les deux lignes étant identiques. C'est ce que reprend l'ancrage qui les tient toutes deux ; le verdict, lui, juge chaque ligne.",
  soleCarrier:
    "Tension maximale majorée d'une ligne qui porterait seule tout le passager (P entier au lieu de P / 2), au pire pas de la traversée : T à vide + DAF · (T chargé − T à vide). Lors de l'essai du 1er novembre 2026, la ligne du bas a porté plus de la moitié : le partage 50/50 n'est pas validé et ce cas en est la borne haute. Ligne informative : elle ne change ni le verdict ni ses cellules.",
};

/** Help for the rows of the criteria × ends grid. */
export const GRID_HELP: Record<ResultGridRow["id"], string> = {
  "tension-totale":
    "Critère de tension totale : à chaque extrémité, T adm = η · MBF / k et FS = η · MBF / T max majoré. Une cellule est « hors limites » si FS < k, « marge faible » si k ≤ FS < 1,1 · k. La cellule gouvernante est celle du FS le plus bas ; c'est elle que le bandeau nomme.",
  "charge-suspendue":
    "Critère de charge suspendue (WorkSafe QLD) : FS = min(η_A, η_B) · MBF / max[DAF · (T chargé − T à vide)] doit atteindre 5. Le dénominateur est le supplément de tension dû au passager seul, pas la tension totale — lu comme MBF / P ce critère vaudrait 77 et ne mordrait jamais. Une seule cellule : la ligne cède à sa terminaison la plus faible.",
  "essai-de-charge-2x":
    "Obligation d'essai de charge à deux fois la charge de service, exigée par le régime mais non évaluable par un calcul : elle se constate sur site. Elle est affichée « non évalué » pour rappeler qu'un verdict favorable ne vaut pas attestation.",
};

/** Help for the read-out cells under the charts. */
export const CELL_HELP: Record<CellId, string> = {
  clearance:
    "Garde au sol minimale sur toute la ligne pour la position affichée du passager : min sur x de z_câble(x, x_D) − z_sol(x) − h_rider (§11). Quand ce minimum n'est pas sous le passager, la cellule indique à quel x il se trouve. Passe en rouge sous la garde exigée. Diffère de « Garde min (traversée) » de la barre latérale, qui prend aussi le minimum sur toutes les positions du passager.",
  TA: "Tension statique à l'ancrage A pour la position affichée du passager, sans majoration au départ : résolue par l'équilibre de la chaînette chargée (§6.1). Le T max majoré de la barre latérale en est le pire cas sur la traversée, multiplié par le DAF.",
  TB: "Tension statique à l'ancrage B pour la position affichée du passager, sans majoration au départ : résolue par l'équilibre de la chaînette chargée (§6.1).",
  slope:
    "Pente locale de la ligne au niveau du passager, en % : tan θ · 100, où θ est l'angle du câble au nœud du passager. Elle commande la composante motrice du poids et donc l'accélération du passager à cette position.",
  sag: "Flèche chargée à la position affichée : écart vertical entre la ligne A–B et le nœud du passager, en mètres. C'est la flèche qui consomme la garde au sol à cet endroit ; son maximum sur la traversée est « Flèche chargée max » dans la barre latérale.",
  underRider:
    "Garde au sol sous les pieds du passager, à sa position : z_D − z_sol(x_D) − h_rider, en mètres. Informative : le critère reste « Garde min. ligne », le minimum sur toute la ligne, qui peut se trouver ailleurs qu'à l'aplomb du passager.",
  belowUnloaded:
    "Distance verticale entre la charge et la ligne à vide, à la position du passager : z_à vide(x_D) − z_D, en mètres. C'est de combien le poids du passager tire le câble vers le bas à cet endroit ; nul aux deux ancrages.",
};

/** Help for the « Préréglage » row of the textile spec. */
export const PRESET_HELP =
  "Remplit la classe, la charge de rupture, la masse linéique, le diamètre et la raideur k de la corde avec les valeurs d'une fiche technique. Les champs restent modifiables : une valeur modifiée passe en « valeur utilisateur ». Le préréglage n'est pas enregistré, seules ses valeurs le sont.";
