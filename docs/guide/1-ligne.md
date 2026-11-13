# 1. Comprendre la ligne

Avant toute équation, ce chapitre fixe ce dont on parle : ce que le simulateur calcule, où sont
placés les points, quelles forces agissent et dans quelles unités, ce qu'est une tension, pourquoi
une ligne s'allonge et ce que mesure la flèche. Le [chapitre 2](2-statique.md) s'appuie sur
chacune de ces notions.

## 1.1 Ce que calcule le simulateur

Une **tyrolienne** est une ligne tendue entre deux points fixes, sur laquelle un **passager**
suspendu à une poulie (le **chariot**) descend par gravité. Le simulateur traite **une seule
portée** : une ligne d'un **ancrage A** (le départ) à un **ancrage B** (l'arrivée), sans appui
intermédiaire, pour des portées de plus de 50 m.

Pour une ligne et un passager donnés, il calcule :

- **la forme de la ligne**, sans passager (la **ligne à vide**) et avec le passager à chaque
  position (la **ligne chargée**) — [chapitre 2](2-statique.md) ;
- **les tensions** dans la ligne et aux deux ancrages — chapitre 2 ;
- **la garde au sol** : la distance entre le passager et le sol, sur toute la traversée —
  [2.10](2-statique.md#s-2-10) ;
- **le Verdict** : la ligne tient-elle, avec quelle marge, selon un régime de sécurité choisi —
  [chapitre 3](3-securite.md) ;
- **une estimation du mouvement** du passager : vitesse, point d'arrêt, vitesse d'arrivée —
  [chapitre 4](4-dynamique.md).

Il ne calcule ni le freinage, ni la déformation latérale sous le vent en mètres, ni la conformité à
une norme ; le [chapitre 5](5-limites.md) en fait la liste.

Référence : en-tête et [§3](../simulation-theory.md#s-3) de la référence technique.

## 1.2 Le repère : où sont A et B

Pour écrire des formules, il faut des coordonnées. Le simulateur utilise un **repère plan
vertical** qui contient les deux ancrages :

- l'ancrage **A** est à l'origine, $A = (0, 0)$ ;
- l'axe $x$ est **horizontal**, orienté de A vers B, en mètres ;
- l'axe $z$ est **vertical**, orienté vers le haut, en mètres ;
- l'ancrage **B** est au point $B = (L, h)$.

Deux grandeurs décrivent donc toute la géométrie des ancrages :

| Symbole | Nom | Unité | Signification |
| --- | --- | --- | --- |
| $L$ | portée | m | distance **horizontale** entre A et B, toujours positive |
| $h$ | dénivelé | m | hauteur de B moins hauteur de A ; **négatif** quand B est plus bas que A |

Le segment droit tiré de A à B s'appelle la **ligne A–B**. Sa longueur vient du théorème de
Pythagore :

$$
\text{longueur de la ligne A–B} = \sqrt{L^2 + h^2}
$$

La ligne réelle ne suit jamais ce segment : elle pend en dessous, sous son propre poids.

**Exemple — la ligne d'ouverture.** $L = 150$ m et $h = -18$ m (B est 18 m plus bas que A). La
ligne A–B mesure $\sqrt{150^2 + 18^2} = \sqrt{22\,824} \approx 151{,}08$ m. La pente moyenne vaut
$18 / 150 = 12$ %.

Le sol n'entre pas dans ce repère comme une donnée de la statique : il ne sert qu'à mesurer la
garde au sol (2.10). Les **hauteurs d'ancrage** (la hauteur de chaque ancrage au-dessus du sol à
son pied) servent uniquement à placer le sol sous la ligne.

Référence : [§2](../simulation-theory.md#s-2).

## 1.3 Forces, poids et unités

Une **force** se mesure en **newtons** (N). Un newton est la force qui donne à une masse de 1 kg
une accélération de 1 m/s². Le simulateur affiche aussi le **décanewton** (1 daN = 10 N), pratique
parce qu'il est proche du « kilo-force » des dynamomètres, et le **kilonewton** (1 kN = 1000 N).

Le **poids** d'un objet est la force avec laquelle la Terre l'attire, vers le bas :

$$
P = m \cdot g
$$

où $m$ est la masse (kg) et $g = 9{,}81$ m/s² l'accélération de la pesanteur, une valeur fixe dans
le simulateur.

**Exemple.** Un passager de $m_p = 120$ kg pèse $P = 120 \cdot 9{,}81 = 1177{,}2$ N, soit
117,7 daN. C'est la **charge ponctuelle** que le passager applique à la ligne.

Le simulateur calcule toujours en unités du Système international (m, kg, s, N) ; le choix des
unités affichées (N, daN, kN) ne change aucun résultat.

## 1.4 Câble ou corde : la famille de ligne

La ligne est faite de l'un de deux matériaux, que le simulateur traite comme **deux modèles
physiques distincts** :

- **le câble** (famille A) : câble métallique toronné, pour les installations permanentes. Il
  s'allonge peu et ses terminaisons sont normalisées ;
- **la corde** (famille B) : corde en fibres synthétiques (HMPE, polyamide, polyester), pour les
  installations temporaires (scoutisme, secours). Elle s'allonge beaucoup plus, s'allonge encore
  avec le temps sous charge (le **fluage**) et ses extrémités sont moins efficaces.

Pour la statique, une ligne est décrite par deux grandeurs :

| Symbole | Nom | Unité | Signification |
| --- | --- | --- | --- |
| $\mu$ | masse linéique | kg/m | masse d'un mètre de ligne non tendue |
| $w$ | poids linéique | N/m | poids d'un mètre de ligne non tendue : $w = \mu \cdot g$ |

et, pour l'allongement, par sa raideur axiale $EA$ (1.6). La sécurité utilise en plus sa
**charge de rupture** ([3.1](3-securite.md#s-3-1)).

**Exemple — la ligne d'ouverture.** Un câble de 12 mm a une masse linéique de 0,5465 kg/m (la
formule est en [3.2](3-securite.md#s-3-2)). Son poids linéique vaut
$w = 0{,}5465 \cdot 9{,}81 \approx 5{,}361$ N/m, soit 0,536 daN par mètre. Les 151,6 m de câble
pèsent donc environ 813 N, un peu moins que les 1177 N du passager.

Référence : [§1](../simulation-theory.md#s-1) (vocabulaire), [§13](../simulation-theory.md#s-13)
(données matériaux), [§10.4](../simulation-theory.md#s-10-4) (quelle famille pour quelle
installation).

## 1.5 La tension et ses deux composantes

**Une ligne ne peut que tirer.** En chaque point, la partie de ligne d'un côté tire sur la partie
de l'autre côté avec une force dirigée **le long de la ligne** : c'est la **tension** $T$, en
newtons. Une ligne ne pousse pas et ne résiste pas à la flexion ; c'est pour cela que sa forme
s'adapte exactement aux charges.

Comme la ligne est penchée, on décompose cette force en deux parties :

| Symbole | Nom | Unité | Signification |
| --- | --- | --- | --- |
| $H$ | tension horizontale | N | composante horizontale de la tension |
| $V$ | composante verticale | N | composante verticale de la tension |
| $T$ | tension | N | intensité de la force, $T = \sqrt{H^2 + V^2}$ |
| $\theta$ | angle de la ligne | rad ou ° | angle de la ligne avec l'horizontale : $\tan\theta = V / H$ |

**Pourquoi $H$ est la même partout.** Isolons par la pensée un morceau de ligne. Il est immobile,
donc les forces qui s'exercent sur lui s'équilibrent. Son poids est vertical ; les seules forces
horizontales sont les composantes $H$ tirées par ses deux voisins, qui doivent donc être égales et
opposées. Tant que toutes les charges sont verticales (poids de la ligne, poids du passager), la
tension horizontale $H$ est **la même en tout point de la ligne**. C'est la grandeur centrale de
toute la statique.

**Pourquoi $V$ change d'un point à l'autre.** Le même raisonnement, appliqué à la verticale, dit
que $V$ augmente du poids de la ligne qu'on parcourt : en avançant de A vers B, $V$ gagne $w$
newtons par mètre de ligne, et saute de $P$ au passage du passager. La tension $T$ est donc la plus
grande là où la ligne est la plus raide, c'est-à-dire **à l'ancrage le plus haut**.

**Exemple — la ligne d'ouverture, à vide.** Le moteur trouve $H = 2535{,}6$ N. À l'ancrage A, la
composante verticale vaut $V_0 = -713{,}3$ N (le signe moins dit que la ligne descend en partant de
A). La tension en A est donc

$$
T_A = \sqrt{2535{,}6^2 + 713{,}3^2} \approx 2634{,}0 \text{ N}
$$

C'est exactement la **tension de pose** demandée, 263,4 daN, lue à l'ancrage A où se trouve la
Mise en tension. En B, $V_B = +99{,}7$ N et $T_B \approx 2537{,}5$ N : plus faible, puisque B est
plus bas. On peut vérifier le bilan vertical : $V_B - V_0 = 99{,}7 + 713{,}3 = 813{,}0$ N, le poids
total du câble trouvé en 1.4.

Référence : [§2](../simulation-theory.md#s-2) (conventions de signe), [§4.1](../simulation-theory.md#s-4-1).

## 1.6 L'allongement élastique et la longueur non tendue

Une ligne tendue s'allonge un peu, comme un ressort très raide, et reprend sa longueur quand on la
relâche : c'est l'**allongement élastique**. On le décrit avec une seule grandeur :

| Symbole | Nom | Unité | Signification |
| --- | --- | --- | --- |
| $EA$ | raideur axiale | N | force qui doublerait la longueur si la loi restait linéaire ; $E$ est le module du matériau (Pa), $A$ la section (m²) |
| $\varepsilon$ | allongement relatif | sans dimension | allongement divisé par la longueur de départ |

La loi est proportionnelle : $\varepsilon = T / EA$. Un morceau de ligne de longueur $\mathrm{d}s$
au repos mesure $(1 + T/EA)\cdot\mathrm{d}s$ sous la tension $T$.

C'est pourquoi le simulateur décrit la ligne par sa **longueur non tendue** $L_0$ (« longueur à
vide » sur les pages simplifiées) : la longueur qu'elle aurait si on la posait au sol, sans
tension. C'est la seule grandeur qui ne change pas quand on charge la ligne ; la longueur réelle,
étirée, en découle. Pour repérer un point le long de la ligne, on utilise de même l'**abscisse
matérielle** $s$, la distance mesurée depuis A **sur la ligne non tendue**, de $0$ à $L_0$ : un
point du câble garde la même abscisse $s$ quelle que soit la charge.

**Exemple — la ligne d'ouverture.** Le câble de 12 mm a une raideur axiale
$EA \approx 6{,}90$ MN, soit 6 897 240 N. Sous environ 2600 N, l'allongement relatif vaut
$2600 / 6\,897\,240 \approx 0{,}038$ %, soit environ 5,7 cm sur les 151,6 m de câble. C'est peu
pour un câble ; une corde en polyamide s'allongerait de plusieurs pour cent (3.2).

Référence : [§1](../simulation-theory.md#s-1), [§2](../simulation-theory.md#s-2),
[§7](../simulation-theory.md#s-7) (pourquoi $L_0$ est la variable d'état).

## 1.7 La flèche

La **flèche** $D$ est le plus grand écart **vertical** entre la ligne et la ligne A–B. Elle se lit
en mètres, et souvent en part de la portée : **flèche / portée**, $D/L$, en %. On distingue :

- la **flèche à vide**, sans passager (« flèche » tout court sur les pages simplifiées) ;
- la **flèche chargée**, avec le passager sur la ligne ; elle se trouve sous le passager.

Plus la ligne est longue par rapport à la ligne A–B, plus la flèche est grande et plus la tension
est faible : flèche et tension sont les deux faces d'un même réglage (2.6).

**Exemple — la ligne d'ouverture.** La ligne non tendue mesure $L_0 = 151{,}64$ m, soit 0,57 m de
plus que la ligne A–B (151,08 m). Ces 57 cm suffisent à donner une flèche à vide de 6,00 m, soit
une flèche / portée de $6{,}00 / 150 = 4{,}00$ %. Avec le passager, la flèche chargée atteint
7,48 m.

Référence : [§1](../simulation-theory.md#s-1), [§7](../simulation-theory.md#s-7).

## 1.8 Récapitulatif des notations

Les symboles du guide sont ceux de la référence technique et du simulateur.

| Symbole | Nom dans l'interface | Unité | Défini en |
| --- | --- | --- | --- |
| $L$ | portée | m | 1.2 |
| $h$ | dénivelé | m | 1.2 |
| $x$, $z$ | position horizontale, hauteur | m | 1.2 |
| $g$ | — (pesanteur, 9,81) | m/s² | 1.3 |
| $m_p$ | masse du passager | kg | 1.3 |
| $P$ | poids du passager, $m_p \cdot g$ | N | 1.3 |
| $\mu$ | masse linéique | kg/m | 1.4 |
| $w$ | poids linéique | N/m | 1.4 |
| $H$ | tension horizontale | N | 1.5 |
| $V$, $V_0$, $V_B$ | composante verticale (en A : $V_0$, en B : $V_B$) | N | 1.5 |
| $T$, $T_A$, $T_B$ | tension, tension à l'ancrage A ou B | N | 1.5 |
| $\theta$ | angle de la ligne | rad | 1.5 |
| $EA$ | raideur axiale | N | 1.6 |
| $L_0$ | longueur non tendue (longueur à vide) | m | 1.6 |
| $s$ | abscisse matérielle | m | 1.6 |
| $D$ | flèche | m | 1.7 |
| $D/L$ | flèche / portée | sans dimension (%) | 1.7 |

La table complète français ↔ anglais, qui fixe aussi les noms utilisés dans le code, est au
[§1 de la référence](../simulation-theory.md#s-1).
