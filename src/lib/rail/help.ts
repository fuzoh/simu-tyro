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

import type { FieldId } from "./fields.ts";
import type { ResultGridRow, ResultRowId } from "./results.ts";

/** Help for every input of `Paramètres` and every editable derived row, by field id. */
export const FIELD_HELP: Record<FieldId, string> = {
  usage:
    "Classe d'usage de la ligne (§10.4). « Permanente (public) » désigne une attraction fixe ouverte au public : seul le câble acier y est admis, car la corde textile flue, s'abîme aux UV et à l'abrasion et peut fondre par friction (HMPE ≈ 144–152 °C). « Temporaire — secours & expédition » ouvre la corde textile et le régime « Secours textile 10:1 ». Ce choix ne change aucun calcul mécanique : il fixe quelles familles et quels régimes sont disponibles.",
  regime:
    "Le référentiel de sécurité contre lequel le verdict est rendu. Chaque régime fixe un coefficient k : la tension admissible vaut T adm = η · MBF / k et le facteur de sécurité effectif FS = η · MBF / T max majoré doit atteindre k. Certains régimes ajoutent un second critère (charge suspendue) ou une obligation non évaluée (essai de charge 2×). « — choisir — » est un état légitime : sans régime, l'outil calcule tout sauf le verdict et la grille critères × extrémités.",
  L: "Portée horizontale L entre les deux ancrages, en mètres. C'est la longueur de référence de toute la statique : la chaînette y est résolue, la flèche s'exprime en fraction de L, et le passager se déplace sur x ∈ [0, L]. Le domaine de validité des références est 50 – 2000 m ; hors de cette bande, un avertissement s'affiche mais le calcul reste effectué.",
  h: "Dénivelé h = z(B) − z(A) entre les deux ancrages, en mètres. Négatif quand B est plus bas que A (ligne descendante). Il fixe la corde A–B et la pente moyenne. Sur un sol plan (mode manuel, sol = droite entre les bases), le dénivelé n'apporte aucune garde au sol supplémentaire : celle-ci dépend surtout des hauteurs d'ancrage et de la flèche chargée.",
  zA: "Hauteur de l'ancrage A au-dessus de sa base au sol, en mètres. En mode manuel, la base A est l'origine du sol et cette hauteur fixe directement la garde disponible sous la ligne côté A. En mode tracé importé, elle s'ajoute à l'altitude du terrain à la station A pour donner l'altitude de l'ancrage, et entre donc dans le dénivelé résolu.",
  zB: "Hauteur de l'ancrage B au-dessus de sa base au sol, en mètres. Même rôle que la hauteur A : en mode manuel elle fixe la garde côté B ; en mode tracé importé elle s'ajoute à l'altitude du terrain à la station B et entre dans le dénivelé résolu.",
  sa: "Position de l'ancrage A le long du profil importé, en mètres dans le repère du fichier (colonne Distance). La portée devient L = station B − station A et le dénivelé se lit sur le terrain à ces deux stations. La station doit rester dans l'étendue du tracé.",
  sb: "Position de l'ancrage B le long du profil importé, en mètres dans le repère du fichier. Avec la station A, elle définit la portée L = sB − sA et le dénivelé h = (z(sB) + hauteur B) − (z(sA) + hauteur A). Elle doit être supérieure à la station A et rester dans le tracé.",
  family:
    "Famille de ligne : câble acier (famille A) ou corde textile (famille B). Les deux modèles physiques sont distincts : l'acier est quasi élastique et ses terminaisons sont normalisées (EN 13411) ; la corde textile flue, sa raideur est exprimée en EA = k · MBL, et §10.4 la réserve aux usages temporaires. La spécification de l'autre famille est conservée en mémoire et restaurée si vous revenez dessus.",
  d: "Diamètre nominal du câble acier, en millimètres. Il entre au carré dans les trois valeurs déduites : MBF = K · d² · R₀, EA = E_app · C · d² et μ = W · d² / 100 (§13.1, EN 12385-4). La bande usuelle des tyroliennes est 6 – 26 mm [CONVENTION] ; au-delà, un avertissement s'affiche.",
  R0: "Grade du fil d'acier R₀, en N/mm² : résistance à la traction nominale des fils (1770 ou 1960). Il multiplie la charge de rupture : MBF = K · d² · R₀ / 1000 (kN). Les facteurs K sont attestés pour ces deux grades exactement, d'où l'absence de grade libre.",
  cst: "Construction du câble 6×19 : âme textile ou âme métallique (IWRC). Elle choisit le facteur K de la charge de rupture (0,330 âme textile, 0,356 âme métallique — EN 12385-4) et pèse dans la raideur axiale et la masse linéique. Pour une autre construction (6×36…), saisissez directement MBF et μ dans « Valeurs déduites ».",
  mbfOverride:
    "Charge de rupture minimale MBF du câble, en force. Valeur déduite MBF = K · d² · R₀ / 1000 (kN) depuis §13.1 ; saisir une valeur (fiche fabricant) remplace la formule et marque la ligne « valeur saisie ». C'est le numérateur de tous les critères du verdict : T adm = η · MBF / k et FS = η · MBF / T max majoré. « Recalculer » revient à la formule.",
  eaOverride:
    "Raideur axiale EA du câble, en MN : produit du module apparent et de la section métallique. Déduite par EA = E_app · C · d² avec E_app 115 GPa et C 0,4165, milieux des plages §13.1 [CONVENTION]. Elle règle l'allongement élastique : plus EA est grand, moins la ligne s'allonge sous le passager et moins la flèche chargée augmente. Une valeur saisie remplace la formule.",
  muOverride:
    "Masse linéique μ du câble, en kg/m. Déduite par μ = W · d² / 100 avec W 0,3795, milieu de la plage §13.1. Le poids linéique w = μ · g est la charge répartie qui donne la chaînette à vide : il fixe la flèche à vide pour une prétension donnée et entre dans les tensions aux ancrages. Une valeur saisie remplace la formule.",
  cls: "Classe de corde textile : HMPE 12 torons, polyamide EN 1891 type A ou polyester semi-statique. Elle fixe la raideur relative k par défaut (22 pour HMPE, 1,5 pour PA, aucune valeur publiée pour le polyester) et la liste des terminaisons admises : sur HMPE les nœuds glissent et sont désactivés (§10.3).",
  MBL: "Charge de rupture minimale MBL de la corde, en force, à lire sur la fiche fabricant — aucune corde n'est fournie par défaut, car une MBL inventée déciderait seule du verdict. C'est le numérateur de T adm = η · MBL / k et de FS = η · MBL / T max majoré, et le dénominateur de la tension permanente en % MBL.",
  muTextile:
    "Masse linéique μ de la corde, en kg/m, à lire sur la fiche fabricant. Le poids linéique w = μ · g est la charge répartie qui forme la chaînette à vide et entre dans les tensions aux ancrages.",
  k: "Raideur relative k = EA / MBL de la corde (sans unité). La raideur axiale déduite vaut EA = k · MBL. §13.2 publie k pour une charge de travail de 10 – 30 % MBL, alors qu'une tyrolienne travaille bien en dessous (≈ 0,6 % au repos, ≈ 6,3 % chargée) : la valeur est donc « non confirmée » par nature.",
  ta: "Type de terminaison à l'ancrage A. Chaque terminaison porte un rendement η par défaut (§10.2 acier, §10.3 textile), pris à l'extrémité conservatrice de sa plage, que le champ « Rendement η » ci-dessous reprend et laisse modifier. « Serre-câbles étrier » reste sélectionnable mais est refusé par le verdict sur une ligne portant des personnes ; « Attelage sans tension » (η = 1) désigne une extrémité attelée sans mise en tension de l'attache, qui n'affaiblit pas la ligne.",
  tb: "Type de terminaison à l'ancrage B. Même règle qu'en A : le rendement η par défaut est celui de §10.2/§10.3 à son extrémité conservatrice, repris dans le champ « Rendement η » et modifiable. Les deux extrémités sont jugées séparément dans la grille critères × extrémités.",
  etaA: "Rendement de la terminaison A, η_A ∈ ]0, 1] : fraction de la charge de rupture que la ligne conserve à cette extrémité. Il multiplie directement la tension admissible T adm,A = η_A · MBF / k et le facteur de sécurité FS_A = η_A · MBF / T max,A majoré. Prérempli depuis le type choisi ; une valeur modifiée passe en « valeur utilisateur » dans la provenance.",
  etaB: "Rendement de la terminaison B, η_B ∈ ]0, 1] : fraction de la charge de rupture conservée à cette extrémité. T adm,B = η_B · MBF / k et FS_B = η_B · MBF / T max,B majoré. Le critère « charge suspendue » utilise min(η_A, η_B), car une ligne cède à sa terminaison la plus faible.",
  D_target:
    "Flèche à vide cible, en mètres : creux maximal de la ligne sans passager sous la corde A–B. Le solveur cherche la longueur non tendue L₀ (et donc la prétension H) qui donne exactement cette flèche à la chaînette élastique (§4, §5). C'est le pilote de tension par défaut, car sa valeur est exacte à la précision affichée.",
  H_target:
    "Prétension cible, composante horizontale H de la tension à vide, constante sur toute la ligne. Le solveur cherche la longueur non tendue L₀ qui, sous le poids propre w = μ · g, donne cette H. Une H trop faible pour la corde A–B est refusée par le moteur (« Tension impossible », §5.4).",
  L0: "Longueur non tendue L₀ de la ligne, en mètres : longueur du câble hors charge, avant allongement élastique. C'est la vraie grandeur d'état du modèle — les deux autres pilotes s'y ramènent. La ligne installée s'allonge de T · L₀ / EA ; L₀ doit dépasser la corde A–B moins cet allongement.",
  vRatio:
    "Rapport V = P / H : poids du passager P = m_p · g sur la prétension horizontale H. C'est un paramétrage du mode « Tension » : H cible = m_p · g / rapport. Plus le rapport est grand, plus H est faible et plus la ligne forme un V profond sous le passager.",
  mp: "Masse du passager m_p, en kg. La charge ponctuelle appliquée à la ligne vaut P = m_p · g ; elle crée le point anguleux de la chaînette chargée, augmente les tensions aux ancrages et la flèche chargée. Les 120 kg par défaut sont attribués à EN 15567-1 mais non vérifiés dans le texte primaire.",
  hRider:
    "Enveloppe passager h_rider, en mètres : hauteur occupée sous le câble par le passager, son harnais et sa poulie. Elle est soustraite directement de la hauteur du câble pour obtenir la garde au sol : h_clear(x) = z_câble(x) − z_sol(x) − h_rider (§11). 2,1 m est une [CONVENTION] : aucune valeur normative n'est publiée.",
  hClearMin:
    "Garde au sol minimale admise, en mètres : le seuil en dessous duquel la garde calculée est jugée insuffisante. L'outil compare la garde minimale (traversée) — le minimum de h_clear sur toutes les positions du passager — à cette valeur ; sous le seuil, la ligne « Garde min (traversée) » et la cellule « Garde min. ligne » passent en rouge. 1,0 m est une [CONVENTION] ; 0 désactive la vérification. Ce seuil ne modifie aucun calcul.",
  DAF: "Coefficient d'amplification dynamique DAF (§8.2). Il majore l'écart de tension dû au passager : T max majoré = T à vide + DAF · (T chargé − T à vide). C'est ce T majoré que divise le facteur de sécurité. 1,2 est le plafond mesuré pour un départ contrôlé sur ligne tendue [FIELD:SSF] ; sous 3 % de flèche / portée, la ligne sort du régime où il a été mesuré. Il ne touche pas la garde au sol.",
  xD: "Position du passager x_D le long de la portée, en mètres depuis l'ancrage A. Elle sélectionne une vue : les cinq cellules de lecture (garde, tensions, pente, flèche) sont calculées pour le passager à cette position, et le profil la dessine. Elle est ramenée dans [0, L] à chaque changement de portée et n'entre dans aucun agrégat « traversée ».",
};

/** Help for the pilot control of `Tension de la ligne` — a segmented control, not a field. */
export const TIGHTNESS_HELP =
  "Pilote de tension : exactement une des quatre grandeurs est saisie, les autres sont déduites. « Flèche » fixe la flèche à vide, « Tension » la prétension horizontale H, « Longueur » la longueur non tendue L₀, « Rapport V » le rapport P / H. Changer de pilote préremplit le nouveau champ avec la valeur déduite courante, à sa précision d'affichage, de sorte que la ligne ne bouge pas.";

/** The rows of `Valeurs déduites`, by an id of this module's own. */
export type DeducedHelpId =
  | "L"
  | "h"
  | "zBaseA"
  | "zBaseB"
  | "MBL"
  | "EAtextile"
  | "w"
  | "chord"
  | "L0"
  | "H"
  | "sag"
  | "sagRatio"
  | "standingTension";

/** Help for the read-only rows of `Valeurs déduites`. The three steel derived rows use {@link FIELD_HELP}. */
export const DEDUCED_HELP: Record<DeducedHelpId, string> = {
  L: "Portée déduite du profil importé : L = station B − station A, en mètres. En mode tracé la portée n'est pas saisie mais dérivée des deux stations.",
  h: "Dénivelé déduit du profil importé : h = (z(sB) + hauteur B) − (z(sA) + hauteur A), en mètres. Négatif quand l'ancrage B est plus bas que A.",
  zBaseA:
    "Altitude du sol à la station A, lue sur le profil importé (colonne Altitude, interpolée). L'ancrage A se trouve à cette altitude plus la hauteur d'ancrage A.",
  zBaseB:
    "Altitude du sol à la station B, lue sur le profil importé. L'ancrage B se trouve à cette altitude plus la hauteur d'ancrage B.",
  MBL: "Charge de rupture minimale MBL de la corde, telle que saisie, affichée dans l'unité de force choisie. Numérateur de T adm = η · MBL / k et de FS = η · MBL / T max majoré.",
  EAtextile:
    "Raideur axiale de la corde EA = k · MBL, en MN (§13.2). Elle règle l'allongement élastique sous charge : plus EA est grand, moins la flèche chargée augmente.",
  w: "Poids linéique de la ligne w = μ · g, en force par mètre. C'est la charge répartie qui donne la forme de chaînette à vide : constante C = H / w, y(x) = C · cosh((x − x₀) / C) + y₀ (§3, §4).",
  chord:
    "Longueur de la corde A–B, ligne droite entre les deux ancrages : √(L² + h²), en mètres. Toute longueur non tendue L₀ doit dépasser cette corde diminuée de l'allongement élastique ; la borne §5.4 refuse une tension qui ne la respecte pas.",
  L0: "Longueur non tendue L₀ résolue par le solveur pour le pilote choisi (flèche, prétension ou rapport V), en mètres. C'est la longueur de câble à mesurer hors charge lors du montage. Elle est préremplie dans le champ si vous passez au pilote « Longueur ».",
  H: "Prétension horizontale H de la ligne à vide, résolue par le solveur pour le pilote choisi. Constante sur toute la ligne ; la tension totale en un point vaut T = H / cos θ, et T aux ancrages est la plus grande là où la pente est la plus forte. Préremplie dans le champ si vous passez au pilote « Tension ».",
  sag: "Flèche à vide : creux maximal de la ligne sans passager sous la corde A–B, en mètres, et la position x où il se produit. Résolue depuis la chaînette élastique pour la L₀ courante (§4). Préremplie dans le champ si vous passez au pilote « Flèche ».",
  sagRatio:
    "Rapport flèche à vide / portée, en %. C'est un indicateur de validité du modèle : sous 3 % (§8.2) la ligne se raidit, la réponse dynamique est mal décrite et le DAF 1,2 sort de son régime de mesure — un avertissement s'affiche alors ici et sur le coefficient dynamique.",
  standingTension:
    "Tension permanente : max(T_A, T_B) à vide rapportée à la charge de rupture, en % MBF (acier) ou % MBL (textile). Sur corde textile, §9.2 recommande de rester sous 30 % MBL pour limiter le fluage — c'est un critère de durée de vie, pas de résistance ; la résistance est jugée par le verdict.",
};

/** Help for the rows of `Résultats`, by their id. */
export const RESULT_HELP: Record<ResultRowId, string> = {
  verdict:
    "Verdict rendu contre le régime choisi, sur toute la traversée. Cinq états : « Dans les limites » (FS effectif ≥ 1,1 · k), « Marge faible » (k ≤ FS < 1,1 · k), « Hors limites » (FS < k sur le critère nommé), « Refusé » (règle réglementaire qui survit à toute marge : serre-câbles sur ligne portant des personnes, textile en installation permanente, régime indisponible), « Indéterminé » (pas de la traversée non résolus). Le bandeau nomme la cellule gouvernante.",
  FS: "Facteur de sécurité effectif de l'extrémité la plus chargée : FS = η · MBF / T max majoré, où T max majoré = T à vide + DAF · (T chargé − T à vide) pris au pire pas de la traversée. Affiché contre le k exigé par le régime pour le critère tension totale. Ce n'est pas un pourcentage d'utilisation : c'est le rapport que vous pouvez recalculer vous-même.",
  Tmax: "Tension maximale majorée sur toute la traversée : T à vide + DAF · (T chargé − T à vide), à l'ancrage et pour la position du passager qui la produisent. C'est la grandeur que divise le FS effectif. Elle diffère de « T anc. » des cellules de lecture, qui est la tension statique pour la seule position affichée.",
  clearance:
    "Garde au sol minimale sur toute la traversée : minimum, pour toutes les positions du passager x_P ∈ [0, L], de h_clear(x, x_P) = z_câble(x, x_P) − z_sol(x) − h_rider (§11). La position du passager qui la produit est nommée. Elle est comparée à « Garde min. admise » et passe en rouge sous ce seuil. Elle diffère de la cellule « Garde min. ligne », qui vaut pour la seule position affichée.",
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
    "Tension maximale statique (sans majoration dynamique) à l'ancrage le plus chargé, sur toute la traversée : le plus grand T chargé résolu par le balayage du passager. La ligne suivante montre la majoration que le DAF y ajoute.",
  amplification:
    "Majoration dynamique ajoutée à la tension statique : DAF · (T chargé − T à vide) − (T chargé − T à vide) = (DAF − 1) · (T chargé − T à vide), à l'ancrage de la ligne au-dessus. La somme des deux lignes est T max majoré.",
  loadedSag:
    "Flèche chargée maximale : le plus grand écart vertical entre la corde A–B et le nœud du passager sur toute la traversée, en mètres. Le point anguleux de la chaînette chargée est son point bas ; c'est cette flèche qui consomme la garde au sol.",
  coverage:
    "Couverture du balayage : nombre de positions du passager résolues sur le nombre de positions tentées (grille uniforme plus pas géométriques resserrés près des ancrages). Sous 100 %, le verdict est « Indéterminé » : un pas non résolu peut cacher le pire cas.",
};

/** Help for the rows of the criteria × ends grid. */
export const GRID_HELP: Record<ResultGridRow["id"], string> = {
  "tension-totale":
    "Critère de tension totale : à chaque extrémité, T adm = η · MBF / k et FS = η · MBF / T max majoré. Une cellule est « hors limites » si FS < k, « marge faible » si k ≤ FS < 1,1 · k. La cellule gouvernante est celle du FS le plus bas ; c'est elle que le bandeau nomme.",
  "charge-suspendue":
    "Critère de charge suspendue (WorkSafe QLD) : FS = min(η_A, η_B) · MBF / max[DAF · (T chargé − T à vide)] doit atteindre 5. Le dénominateur est le supplément de tension dû au passager seul, pas la tension totale — lu comme MBF / P ce critère vaudrait 77 et ne mordrait jamais. Une seule cellule : la ligne cède à sa terminaison la plus faible.",
  "essai-de-charge-2x":
    "Obligation d'essai de charge à deux fois la charge de service, exigée par le régime mais non évaluable par un calcul : elle se constate sur site. Elle est affichée « non évalué » pour rappeler qu'un verdict favorable ne vaut pas conformité.",
};

/** Help for the five read-out cells under the charts, by their record key. */
export const CELL_HELP: Record<string, string> = {
  "Garde min. ligne":
    "Garde au sol minimale sur toute la ligne pour la position affichée du passager : min sur x de z_câble(x, x_D) − z_sol(x) − h_rider (§11). Quand ce minimum n'est pas sous le passager, la cellule indique à quel x il se trouve. Passe en rouge sous « Garde min. admise ». Diffère de « Garde min (traversée) » de la barre latérale, qui prend aussi le minimum sur toutes les positions du passager.",
  "T anc. A":
    "Tension statique à l'ancrage A pour la position affichée du passager, sans majoration dynamique : résolue par l'équilibre de la chaînette chargée (§6.1). Le T max majoré de la barre latérale en est le pire cas sur la traversée, multiplié par le DAF.",
  "T anc. B":
    "Tension statique à l'ancrage B pour la position affichée du passager, sans majoration dynamique : résolue par l'équilibre de la chaînette chargée (§6.1).",
  Pente:
    "Pente locale de la ligne au niveau du passager, en % : tan θ · 100, où θ est l'angle du câble au nœud du passager. Elle commande la composante motrice du poids et donc l'accélération du passager à cette position.",
  Flèche:
    "Flèche chargée à la position affichée : écart vertical entre la corde A–B et le nœud du passager, en mètres. C'est la flèche qui consomme la garde au sol à cet endroit ; son maximum sur la traversée est « Flèche chargée max » dans la barre latérale.",
  "Garde passager":
    "Garde au sol sous les pieds du passager, à sa position : z_D − z_sol(x_D) − h_rider, en mètres. Informative : le critère reste « Garde min. ligne », le minimum sur toute la ligne, qui peut se trouver ailleurs qu'à l'aplomb du passager.",
  "Écart à vide":
    "Distance verticale entre la charge et la ligne à vide, à la position du passager : z_à vide(x_D) − z_D, en mètres. C'est de combien le poids du passager tire le câble vers le bas à cet endroit ; nul aux deux ancrages.",
};
