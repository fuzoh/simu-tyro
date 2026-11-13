# 3. Sécurité : juger la ligne

Le [chapitre 2](2-statique.md) a donné les tensions de la ligne sur toute la traversée. Ce
chapitre explique comment le simulateur les compare à ce que la ligne peut supporter : la charge de
rupture du matériau, réduite par les terminaisons, majorée pour le départ du passager, divisée par
la marge qu'exige un régime de sécurité. Il finit par le Verdict.

Ces règles ne sont **pas des réglages** : les rendements de terminaison, les charges de rupture et
les facteurs exigés viennent de normes, de règlements ou de pratiques documentés, et le simulateur
dit pour chacun d'où il vient ([5.3](5-limites.md#s-5-3)).

## 3.1 La charge de rupture

La **charge de rupture minimale** est la force de traction que la ligne neuve supporte au moins
avant de rompre, garantie par le fabricant ou par une norme. Elle s'écrit **MBF** pour un câble
(« minimum breaking force », vocabulaire de la norme EN 12385) et **MBL** pour une corde
(« minimum breaking load »), en newtons.

**Pour un câble**, la norme EN 12385-4 la relie au diamètre par une formule :

$$
\text{MBF [kN]} = \frac{K \cdot d^2 \cdot R_0}{1000}
$$

| Symbole | Nom | Unité | Valeurs |
| --- | --- | --- | --- |
| $d$ | diamètre nominal | mm | 6 à 26 mm usuellement |
| $R_0$ | grade (résistance des fils) | N/mm² | 1770 ou 1960 |
| $K$ | facteur de construction | sans dimension | 0,330 pour 6×19, 0,356 pour 6×19 métallique |

**Exemple — la ligne d'ouverture.** Câble de 12 mm, grade 1770, construction 6×19 métallique :
$\text{MBF} = 0{,}356 \cdot 12^2 \cdot 1770 / 1000 = 0{,}356 \cdot 144 \cdot 1770 / 1000 \approx 90{,}74$ kN,
soit **9074 daN**. Une fiche fabricant peut remplacer cette valeur (« valeur saisie »).

La référence signale qu'un triplet de valeurs pour un câble de 6 mm, recopié d'une source, ne se
retrouve pas avec ces facteurs ; c'est la formule, vérifiée par ailleurs, qui est utilisée.

**Pour une corde**, il n'existe pas de formule : la MBL se lit sur la fiche du fabricant. Le
simulateur n'en propose **aucune par défaut**, parce qu'une valeur inventée déciderait à elle
seule du Verdict.

Référence : [§13.1](../simulation-theory.md#s-13-1) (câble), [§13.2](../simulation-theory.md#s-13-2)
(corde).

## 3.2 Raideur et masse : les autres valeurs du matériau

**Câble.** La raideur axiale et la masse linéique (1.4, 1.6) se déduisent aussi du diamètre :

$$
EA = E_{\text{app}} \cdot C \cdot d^2 \qquad \mu = \frac{W \cdot d^2}{100}
$$

| Symbole | Nom | Unité | Plage de la référence | Valeur utilisée |
| --- | --- | --- | --- | --- |
| $E_{\text{app}}$ | module apparent du câble | GPa | 100 à 130 | 115 (milieu) |
| $C$ | part métallique de la section | sans dimension | 0,384 à 0,449 | 0,4165 (milieu) |
| $W$ | facteur de masse nominale | sans dimension ($\mu$ en kg/m avec $d$ en mm) | 0,359 à 0,400 | 0,3795 (milieu) |

Le module apparent d'un câble toronné est environ 60 % de celui du métal plein de ses fils : les
torons se resserrent en s'allongeant. Avec $d$ en mm, $d^2$ est en mm², d'où un facteur $10^{-6}$
pour obtenir $EA$ en newtons.

**Exemple — la ligne d'ouverture.**
$EA = 115 \times 10^9 \cdot 0{,}4165 \cdot 144 \times 10^{-6} \approx 6{,}90$ MN et
$\mu = 0{,}3795 \cdot 144 / 100 \approx 0{,}5465$ kg/m.

**Corde.** La raideur s'exprime par rapport à la charge de rupture : $EA = k \cdot \text{MBL}$, où
$k$, la **raideur relative EA/MBL**, est sans dimension.

| Classe de corde | $k$ | Conditions | Statut |
| --- | --- | --- | --- |
| HMPE 12 torons | ≈ 22 à 10 % MBL, ≈ 31 à 30 % MBL | épissée, après mise en place | fiche fabricant |
| Polyamide EN 1891 type A | ≈ 1,5 | 50 à 150 kg statique | données CE |
| Polyester semi-statique | aucune valeur publiée | — | — |

Exemple : une corde HMPE de MBL 100 kN avec $k = 22$ a $EA = 22 \cdot 100 = 2200$ kN, soit
2,2 MN, trois fois plus souple que le câble de 12 mm.

**Une réserve sur le HMPE.** La valeur 22 est mesurée à 10 % de la charge de rupture. Une
tyrolienne travaille bien plus bas (environ 0,6 % au repos et 6 % chargée sur un exemple de la
référence), où la corde est plus souple : $k = 22$ rend probablement le modèle **trop raide**. Le
simulateur affiche cette valeur comme non confirmée.

Référence : [§13.1](../simulation-theory.md#s-13-1), [§13.2](../simulation-theory.md#s-13-2),
point 6b du [§16](../simulation-theory.md#s-16).

## 3.3 Les terminaisons et leur rendement

Une ligne est rarement plus faible en son milieu qu'à ses extrémités. La **terminaison** est
l'extrémité fabriquée du câble ou de la corde (manchon, cosse sertie, épissure, nœud) ; elle
n'est pas l'**ancrage**, qui est le point où l'on attache. Chaque terminaison garde une part de la
charge de rupture, son **rendement** $\eta$, sans dimension, entre 0 et 1.

| Terminaison | $\eta$ par défaut | Statut |
| --- | --- | --- |
| Manchon métal/résine (EN 13411-4) | 1,00 | attesté par la norme |
| Cosse à sertir / œil flamand (EN 13411-3) | 0,90 | attesté par la norme |
| Épissure (EN 13411-2) | 0,80 | attesté par la norme |
| Manchon à coin (EN 13411-6) | 0,80 | convention |
| Serre-câbles étrier (EN 13411-5) | 0,80 | convention ; **interdit** sur une ligne qui porte des passagers |
| Œil cousu / épissuré (corde) | 0,90 | convention |
| Épissure longue HMPE | 0,90 | fiche fabricant / convention |
| Nœud de huit (polyamide) | 0,60 | convention ; **exclu sur HMPE** |
| Nœud de chaise (polyamide) | 0,55 | convention ; **exclu sur HMPE** |
| Attelage sans tension | 1,00 | convention |

Quand la source donne une plage, le simulateur prend l'**extrémité prudente** (0,90 et non 0,95 ;
0,60 et non 0,80). Sur HMPE, un nœud glisse : il n'y a pas de rendement à appliquer, d'où
l'exclusion. Les serre-câbles restent sélectionnables, pour décrire une ligne existante, mais le
Verdict passe alors à « Interdit ».

Chaque valeur reste modifiable ; une valeur modifiée est marquée « valeur utilisateur ».

Référence : [§10.2](../simulation-theory.md#s-10-2), [§10.3](../simulation-theory.md#s-10-3).

## 3.4 La majoration au départ

Le chapitre 2 est statique : le passager y est immobile. Or au moment du départ, le passager est
mis en mouvement et la ligne subit un surcroît de tension. La **majoration au départ**
(notée DAF dans la référence) multiplie **la part de tension due au passager** :

$$
T_{\text{maj}} = T_{\text{vide}} + \text{majoration} \cdot (T_{\text{chargée}} - T_{\text{vide}})
$$

| Symbole | Signification | Unité |
| --- | --- | --- |
| $T_{\text{vide}}$ | tension à l'ancrage, ligne à vide | N |
| $T_{\text{chargée}}$ | plus grande tension à l'ancrage sur la traversée, passager compris (2.8) | N |
| majoration | multiplicateur de la part due au passager | sans dimension |
| $T_{\text{maj}}$ | tension majorée, celle que le Verdict juge | N |

**D'où vient 1,2.** La valeur par défaut, 1,2, est le plafond **mesuré** par le Spéléo Secours
Français sur une ligne de 1109 m instrumentée : « surtension de 120 % maximum de la valeur de la
charge appliquée », pour un départ contrôlé sur une ligne tendue. Elle ne vaut que dans ces
conditions : une chute sur la ligne, une ligne très lâche ou un départ brutal peuvent dépasser
**5 fois** la charge statique. Les valeurs intermédiaires citées par un rapport d'origine ne sont
pas confirmées. Les pages simplifiées supposent 1,2 sans la demander ; la Page Avancé permet de la
changer.

**Exemple — la ligne d'ouverture, en A.**
$T_{\text{maj}} = 2634{,}0 + 1{,}2 \cdot (8172{,}1 - 2634{,}0) = 2634{,}0 + 1{,}2 \cdot 5538{,}1 \approx 9279{,}8$ N,
soit **928,0 daN**. C'est la « T max » que le simulateur affiche en tête des résultats.

Référence : [§8.1](../simulation-theory.md#s-8-1), [§8.2](../simulation-theory.md#s-8-2).

## 3.5 Régime de sécurité, tension admissible et facteur de sécurité

**Le principe.** On ne fait pas travailler une ligne près de sa rupture : on exige qu'elle puisse
supporter $k$ fois la tension qu'elle subit. Ce nombre $k$, sans dimension, est la **marge
exigée** ; il dépend du **régime de sécurité** choisi (« marge exigée » sur les pages simplifiées).

**La tension admissible** à une extrémité est

$$
T_{\text{adm}} = \frac{\eta \cdot \text{MBF}}{k}
$$

(MBL pour une corde) : le rendement de la terminaison réduit la charge de rupture **avant** la
division par $k$.

**Le facteur de sécurité** est la marge que la ligne a réellement :

$$
\text{FS} = \frac{\eta \cdot \text{MBF}}{T_{\text{maj}}}
$$

Il ne dépend pas du régime. La ligne est dans les limites à une extrémité quand $\text{FS} \ge k$,
c'est-à-dire quand $T_{\text{maj}} \le T_{\text{adm}}$. La **réserve de tension** est la différence
$T_{\text{adm}} - T_{\text{maj}}$, à l'extrémité la moins favorable : positive, c'est la place qui reste ;
négative, c'est l'excès à retirer.

**Les régimes proposés.** Ils ne sont jamais mélangés, et aucun n'est choisi par défaut : à
l'ouverture, le simulateur calcule tout sauf le Verdict.

| Régime | Règle | Statut de la source |
| --- | --- | --- |
| EN 15567-1 | $k = 3$ sur la tension totale | attesté par des sources secondaires ; texte de la norme payant |
| WorkSafe QLD 2019 | $k = 3$ sur la tension totale **et** $k = 5$ sur la charge suspendue, **plus** un essai de charge à 2 fois | guide d'un régulateur, cité mot pour mot |
| ACCT / parcours acrobatique — 10:1 | $k = 10$ | convention, sans texte primaire trouvé |
| ANSI/ACCT 03-2019 — 5:1 | $k = 5$ | affirmé par un seul rapport, non confirmé ; en conflit avec le 10:1 |
| Secours sur corde — 10:1 | $k = 10$ | convention ; réservé à une corde en installation temporaire |

Le critère de **charge suspendue** de WorkSafe QLD ne regarde que la part due au passager :
$\min(\eta_A, \eta_B) \cdot \text{MBF}$ divisé par la plus grande valeur de
$\text{majoration} \cdot (T_{\text{chargée}} - T_{\text{vide}})$, puisque la ligne cède à sa terminaison la plus
faible. L'essai de charge n'est pas évalué par le simulateur.

**Exemple — la ligne d'ouverture.** Terminaisons cosse à sertir ($\eta = 0{,}90$), MBF 90 737 N.

- Facteur de sécurité en A : $0{,}90 \cdot 90\,737 / 9279{,}8 \approx 8{,}80$ ; en B, 9,06. A
  gouverne, parce que c'est l'ancrage le plus haut (1.5).
- Sous EN 15567-1 ($k = 3$) : $T_{\text{adm}} = 0{,}90 \cdot 90\,737 / 3 \approx 27\,221$ N. La réserve
  vaut $27\,221 - 9280 \approx 17\,941$ N : **Dans les limites**.
- Sous ACCT 10:1 ($k = 10$) : $T_{\text{adm}} \approx 8166$ N, plus faible que 9280 N ; le facteur de
  sécurité 8,80 est sous 10 : **Hors limites**. La même ligne, jugée contre une autre marge
  exigée, change d'état.

Référence : [§10.1](../simulation-theory.md#s-10-1), [§8.3](../simulation-theory.md#s-8-3).

## 3.6 Le Verdict

Le **Verdict** est la réponse du simulateur à « cette ligne tient-elle ? ». Il juge la tension la
plus forte **sur toute la traversée**, jamais à la position actuelle du passager, contre le régime
choisi. Il prend l'un de cinq états, chacun appelant une action différente :

| État | Condition | Ce qu'il invite à faire |
| --- | --- | --- |
| Dans les limites | $\text{FS} \ge 1{,}1 \cdot k$ partout | rien |
| Marge faible | $k \le \text{FS} < 1{,}1 \cdot k$ quelque part | augmenter la marge |
| Hors limites | $\text{FS} < k$ quelque part | changer la conception |
| Interdit | une règle interdit la ligne, quelle que soit la marge | changer le matériel |
| Indéterminé | la traversée n'est pas entièrement calculée | aucun chiffre n'est disponible |

**Pourquoi « Marge faible » à 10 % près.** Une ligne à 3,05 pour $k = 3$ n'a plus de place pour
les valeurs que l'outil reconnaît ne pas connaître précisément : elle n'est pas présentée comme
saine avec une note.

**Les causes d'« Interdit ».** Des serre-câbles sur une ligne qui porte des passagers (3.3) ; une
corde en installation permanente (3.7) ; le régime « Secours sur corde » sur une ligne qui n'est
pas une corde en installation temporaire.

**La garde au sol** n'entre pas dans le calcul du facteur de sécurité : la garde min (traversée)
est comparée à la garde exigée et signalée sur sa propre ligne de résultats (2.10).

Le Verdict n'est jamais une attestation de conformité à une norme
([5.2](5-limites.md#s-5-2)).

Référence : [§10](../simulation-theory.md#s-10), [§10.1](../simulation-theory.md#s-10-1),
[§11](../simulation-theory.md#s-11).

## 3.7 Installation permanente ou temporaire

L'affirmation « la corde est interdite au-delà de 50 m » des rapports d'origine n'est pas une
impossibilité physique, mais une **frontière entre deux types d'installation** :

- **installation permanente** (attraction fixe ouverte au public) : **câble seulement**. La corde
  y est exclue parce qu'elle flue, vieillit aux UV et à l'abrasion, et que le HMPE fond vers
  144–152 °C, une température que le frottement d'une poulie peut atteindre ;
- **installation temporaire** (secours, expédition, sous supervision et pour une durée limitée) :
  la corde est admise, quelle que soit la portée documentée (le Spéléo Secours Français a
  instrumenté une ligne de 1109 m en 2008), avec les avertissements propres aux cordes.

Ce choix ne change aucun calcul mécanique : il fixe quelles familles de ligne et quels régimes
sont disponibles.

Référence : [§10.4](../simulation-theory.md#s-10-4).

## 3.8 Les avertissements sur la ligne à vide

Deux propriétés de la ligne à vide déclenchent un avertissement, quel que soit le régime, et même
sans régime choisi :

- **flèche / portée sous 3 %** : la ligne est très tendue. Elle se raidit, et la majoration au
  départ de 1,2 a été mesurée sur des lignes moins tendues : sa valeur n'est plus garantie. La
  parabole et la chaînette diffèrent alors de moins de 0,15 % (2.2) ;
- **tension à vide d'une corde au-dessus de 30 % de sa MBL** : le fluage devient important. C'est
  une limite de **durée de vie**, pas de résistance.

La **tension à vide** est la plus grande des deux tensions d'ancrage de la ligne à vide, en part de
la charge de rupture.

**Exemple — la ligne d'ouverture.** Flèche / portée 4,00 % : pas d'avertissement. Tension à vide
$2634{,}0 / 90\,737 \approx 2{,}90$ % (la règle des 30 % ne concerne de toute façon que les
cordes).

Référence : [§8.2](../simulation-theory.md#s-8-2), [§9.2](../simulation-theory.md#s-9-2).

## 3.9 Ce qui n'est pas combiné : charges normatives et vent

**La combinaison normative.** La norme EN 15567 prescrit comment combiner prétension, charge
statique, effets dynamiques et vent, avec des facteurs partiels. Son texte est payant, et la
forme proposée par un rapport d'origine n'a pas été retrouvée dans une source primaire. Le
simulateur **n'applique pas** de combinaison normative : il juge l'enveloppe physique (la pire
tension sur la traversée, majorée au départ) contre la marge exigée, et montre la formule non
confirmée à titre d'information seulement.

**Le vent** sur la ligne et sur le passager ne s'ajoute pas aux tensions jugées : le modèle de la
ligne est plan (vertical), et la vitesse de vent de dimensionnement de la norme est payante. Le
vent saisi n'intervient que dans l'estimation du mouvement du passager
([4.2](4-dynamique.md#s-4-2)) et dans le dessin qualitatif de la Banane.

Référence : [§8.3](../simulation-theory.md#s-8-3), [§8.4](../simulation-theory.md#s-8-4).
