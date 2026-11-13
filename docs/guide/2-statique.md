# 2. Statique : la forme et les tensions de la ligne

Ce chapitre construit, étape par étape, le calcul que le moteur fait à chaque changement d'un
paramètre : trouver la forme de la ligne et ses tensions, sans puis avec le passager, puis en
déduire la garde au sol. Il utilise les notions du [chapitre 1](1-ligne.md) : repère, poids
linéique $w$, tension horizontale $H$, raideur axiale $EA$, longueur non tendue $L_0$, flèche $D$.

## 2.1 Ce que veut dire « statique »

Un objet est en **équilibre statique** quand il est immobile et que les forces qui s'exercent sur
lui s'annulent : leur somme est nulle, horizontalement et verticalement. La **statique** est le
calcul de cet équilibre.

Le simulateur calcule la ligne **comme si le passager était arrêté** à chaque position : on pose le
passager en un point, on cherche la forme d'équilibre de la ligne, puis on recommence un peu plus
loin. Ce découpage s'appelle l'hypothèse **quasi statique** ; elle est raisonnable tant que le
passager va lentement par rapport aux ondes qui parcourent la ligne, et le
[chapitre 4.1](4-dynamique.md#s-4-1) dit comment le simulateur le vérifie.

Une **résolution** (« Solve ») est le calcul d'un seul état d'équilibre de la ligne ; un **état de
la portée** (« Span State ») est son résultat : les composantes de la tension qui satisfont les deux
ancrages, et tout ce qui en découle.

Le moteur dispose de trois modèles, du plus simple au plus juste (2.2 à 2.4) ; seul le dernier sert
aux résultats.

Référence : [§3](../simulation-theory.md#s-3), [§6.2](../simulation-theory.md#s-6-2).

## 2.2 Première approximation : la parabole

Si l'on suppose que le poids de la ligne est réparti uniformément **le long de l'horizontale** (et
non le long de la ligne), l'équilibre donne une **parabole**. Pour une portée de niveau, sa flèche
et sa tension maximale valent :

$$
D \approx \frac{w \cdot L^2}{8 \cdot H} \qquad T_{\text{max}} \approx \sqrt{H^2 + \left(\frac{w \cdot L}{2}\right)^2}
$$

La première formule se lit dans les deux sens : à poids et portée fixés, **doubler la tension
horizontale divise la flèche par deux**, et doubler la portée multiplie la flèche par quatre.

**À quel point la parabole se trompe.** La référence a comparé la parabole à la forme exacte
(la chaînette, 2.3) pour une portée de niveau, à même $H$ :

| flèche / portée | erreur sur la flèche | erreur sur la tension maximale |
| --- | --- | --- |
| 1,0 % | −0,013 % | −0,000 % |
| 3,0 % | −0,120 % | −0,003 % |
| 5,0 % | −0,330 % | −0,025 % |
| 10,0 % | −1,289 % | −0,356 % |

Le signe moins dit que la parabole **sous-estime** la flèche : la vraie ligne pend plus bas. Pour la
garde au sol, ce n'est pas du côté de la sécurité. C'est pourquoi le moteur n'utilise la parabole
que comme **point de départ** de ses calculs ([2.5](2-statique.md#s-2-5)), jamais comme résultat.

**Exemple — la ligne d'ouverture.** Avec $w = 5{,}361$ N/m, $L = 150$ m et $H = 2535{,}6$ N, la
parabole donne $D \approx 5{,}361 \cdot 150^2 / (8 \cdot 2535{,}6) \approx 5{,}95$ m, contre
6,00 m pour le calcul exact. Le tableau a été établi pour une portée de niveau ; sur cette portée
inclinée, l'écart est de 0,9 %.

Référence : [§3](../simulation-theory.md#s-3), [§3.1](../simulation-theory.md#s-3-1).

## 2.3 La chaînette

Si l'on tient compte du fait que le poids est réparti **le long de la ligne**, l'équilibre donne
une **chaînette** : la forme d'une chaîne suspendue par ses deux bouts. Pour une ligne qui ne
s'allonge pas, elle s'écrit

$$
z(x) = C \cdot \cosh\left(\frac{x}{C}\right) \qquad \text{avec } C = \frac{H}{w} \text{ (en m)}
$$

à une translation près. La fonction **cosinus hyperbolique**, $\cosh(u) = (e^u + e^{-u})/2$,
ressemble à une parabole près de son minimum et remonte plus vite ensuite. La longueur $C$ mesure
la « raideur » de la courbe : une grande tension (grand $C$) donne une ligne presque droite.

La chaînette rigide sert au moteur de cas limite : quand la raideur axiale devient infinie, le
modèle élastique ([2.4](2-statique.md#s-2-4)) doit retrouver exactement cette courbe, et les tests le vérifient.

Référence : [§3](../simulation-theory.md#s-3).

## 2.4 La chaînette élastique, modèle du moteur

Le modèle du moteur est la **chaînette élastique** (Irvine, 1981) : une chaînette dont chaque
morceau s'allonge selon la loi de 1.6. C'est le seul modèle utilisé pour les résultats, pour le
câble comme pour la corde.

**Les données.** La portée $L$ et le dénivelé $h$ ([1.2](1-ligne.md#s-1-2)), la longueur non tendue $L_0$, le poids
linéique $w$ et la raideur axiale $EA$.

**Les inconnues.** La tension horizontale $H$ et la composante verticale en A, $V_0$ (en N). Une
fois ces deux nombres connus, tout le reste en découle.

**Les équations.** On décrit chaque point de la ligne par son abscisse matérielle $s$ (de 0 en A à
$L_0$ en B, 1.6). La composante verticale y vaut

$$
V(s) = V_0 + w \cdot s
$$

(elle augmente du poids de la ligne parcourue, 1.5), et la position du point est

$$
x(s) = \frac{H \cdot s}{EA} + \frac{H}{w}\left[\operatorname{asinh}\frac{V(s)}{H} - \operatorname{asinh}\frac{V_0}{H}\right]
$$

$$
z(s) = \frac{s}{EA}\left(V_0 + \frac{w \cdot s}{2}\right) + \frac{H}{w}\left[\sqrt{1 + \left(\frac{V(s)}{H}\right)^2} - \sqrt{1 + \left(\frac{V_0}{H}\right)^2}\right]
$$

Comment les lire :

- le **second terme** de chaque formule est la chaînette rigide de 2.3, écrite avec $s$ au lieu de
  $x$ ; $\operatorname{asinh}$ est la fonction réciproque du sinus hyperbolique ;
- le **premier terme**, divisé par $EA$, est l'allongement élastique : il s'annule quand $EA$
  devient infini ;
- les deux termes viennent de l'intégration, le long de la ligne, des pentes
  $\mathrm{d}x/\mathrm{d}s = H/T + H/EA$ et $\mathrm{d}z/\mathrm{d}s = V/T + V/EA$.

**Les conditions aux ancrages.** La ligne doit finir en B :

$$
x(L_0) = L \qquad z(L_0) = h
$$

Deux équations, deux inconnues $(H, V_0)$ : le problème est bien posé. Ces équations ne se
résolvent pas à la main ; 2.5 explique comment le moteur s'y prend.

**Un cas simple qu'on peut vérifier.** Pour une portée **de niveau** ($h = 0$), la symétrie impose
que le point bas soit au milieu de la ligne, donc que chaque ancrage porte la moitié du poids :
$V_0 = -w \cdot L_0 / 2$. Exemple vérifié du moteur (cas Z1 de la référence) : $L = 100$ m,
$h = 0$, $L_0 = 100{,}5$ m, $w = 5$ N/m, $EA = 10^7$ N. Le moteur trouve $H = 1423{,}94$ N et
$V_0 = -251{,}25$ N, soit exactement $-5 \cdot 100{,}5 / 2$. La tension maximale vaut
$\sqrt{1423{,}94^2 + 251{,}25^2} \approx 1445{,}94$ N et le point bas est 4,40 m sous les
ancrages. La parabole de 2.2 aurait donné $5 \cdot 100^2 / (8 \cdot 1423{,}94) \approx 4{,}39$ m :
0,24 % de moins, comme le prévoit le tableau.

Référence : [§4](../simulation-theory.md#s-4), [§4.1](../simulation-theory.md#s-4-1), cas Z1 au
[§15](../simulation-theory.md#s-15). La référence signale aussi, au
[§2.1](../simulation-theory.md#s-2-1), une erreur de signe dans la forme publiée par les rapports
d'origine, corrigée dans la formule ci-dessus.

## 2.5 Résoudre les équations

**La méthode de Newton.** Le moteur part d'une estimation de $(H, V_0)$, calcule où la ligne finit
avec ces valeurs, et mesure l'écart à B : le **résidu**, en mètres,
$r = \big(x(L_0) - L,\; z(L_0) - h\big)$. Il corrige ensuite l'estimation en supposant que le
résidu varie à peu près linéairement avec $H$ et $V_0$. Les quatre taux de variation
$\partial x/\partial H$, $\partial x/\partial V_0$, $\partial z/\partial H$,
$\partial z/\partial V_0$ (le **jacobien**) sont connus par des formules exactes. Il recommence
jusqu'à ce que le résidu soit négligeable.

**Quand s'arrêter.** Le calcul est jugé convergé quand la ligne finit à moins de
$10^{-6}$ m (un micromètre) de B, pour les portées jusqu'à 1000 m ; au-delà, la tolérance
grandit avec la portée ($10^{-6} \cdot L$).

**Les précautions.** Un pas de Newton peut aller trop loin. Le moteur divise alors le pas par deux
jusqu'à ce que le résidu diminue, garde $H$ positif, et, faute de converger, repart d'une autre
estimation (cinq essais au plus). L'estimation de départ vient de la parabole ([2.2](2-statique.md#s-2-2)). Deux cas
limites ont un traitement à part : la ligne presque droite (très tendue, ou très légère), traitée
comme une barre élastique, et la ligne très lâche, où l'on évite que le calcul ne s'effondre.

**Quand il n'y a pas de solution.** Le simulateur le dit, avec un nom précis :

- **Tension impossible** : la tension demandée dépasserait la charge de rupture de la ligne ;
- **Cible inatteignable** : aucune longueur non tendue ne donne la valeur demandée ([2.6](2-statique.md#s-2-6)) ;
- **Calcul impossible** : le calcul n'a pas convergé sur un cas que les autres contrôles
  laissaient passer — un cas qui ne devrait pas arriver.

**Exemple — la ligne d'ouverture.** La ligne à vide converge en 3 itérations de Newton.

Référence : [§4.2](../simulation-theory.md#s-4-2) (jacobien), [§4.3](../simulation-theory.md#s-4-3)
(cas limites), [§5](../simulation-theory.md#s-5) à [§5.4](../simulation-theory.md#s-5-4).

## 2.6 Dire à quel point la ligne est tendue

Pour le moteur, la seule grandeur d'état est la **longueur non tendue** $L_0$ ([1.6](1-ligne.md#s-1-6)). Mais on ne coupe pas
une ligne au centimètre : sur le terrain, on règle une tension ou une flèche. Le
simulateur accepte donc cinq façons de dire à quel point la ligne est tendue — le **pilote de
tension** — et ramène chacune à une longueur $L_0$ avant tout calcul :

| Pilote | Ce qu'on donne | Comment le moteur trouve $L_0$ |
| --- | --- | --- |
| longueur non tendue | $L_0$ directement | rien à faire |
| tension de pose (prétension) | la tension à l'ancrage de la Mise en tension | recherche sur la branche tendue (voir ci-dessous) |
| tension horizontale | $H$ | recherche par dichotomie |
| flèche | la flèche à vide $D$ | recherche de $H$, puis de $L_0$ |
| rapport V | $P / H$ | revient à donner $H = m_p \cdot g / \text{rapport}$ |

**Pourquoi la recherche marche pour $H$.** Plus la ligne est longue, plus elle pend et moins elle
est tendue : $H$ **diminue toujours** quand $L_0$ augmente. On peut donc encadrer la solution
entre une ligne très courte (presque la ligne A–B, tension énorme) et une ligne assez longue
(tension trop faible), puis couper l'intervalle en deux jusqu'à la précision voulue : c'est la
**dichotomie**.

**Pourquoi la tension de pose demande plus de soin.** La tension à l'ancrage vaut
$T = \sqrt{H^2 + V^2}$ ([1.5](1-ligne.md#s-1-5)). Quand on allonge la ligne, $H$ diminue mais $V$ augmente, puisque
chaque mètre ajouté pèse. Sur une ligne très lâche, la tension à l'ancrage passe par un **minimum**
puis remonte. Le moteur ne retient que la **branche tendue** (avant ce minimum) ; une tension de
pose plus faible que ce minimum n'a pas de solution et s'affiche « Cible inatteignable ».

**Une formule d'estimation.** Pour une portée de niveau, la référence donne une estimation de
départ de $L_0$ à partir de $H$ :

$$
L_0 \approx \left(L + \frac{w^2 \cdot L^3}{24 \cdot H^2}\right)\cdot\left(1 - \frac{H}{EA}\right)
$$

Le premier facteur est la longueur de la parabole (la ligne pend, donc elle est plus longue que
$L$) ; le second retire l'allongement élastique. Exemple vérifié (cas Z6) : $L = 100$ m,
$w = 10$ N/m, $EA = 10^7$ N, $H = 2451$ N. La formule donne
$(100 + 0{,}6936) \cdot (1 - 0{,}000\,245) \approx 100{,}669$ m ; la résolution exacte donne
$L_0 = 100{,}670$ m, et une flèche de 5,12 m.

**Exemple — la ligne d'ouverture.** Le pilote est la tension de pose : 2634 N (263,4 daN) à
l'ancrage A. Le moteur en déduit $L_0 = 151{,}64$ m, puis $H = 2535{,}6$ N et une flèche à vide de
6,00 m.

Référence : [§7](../simulation-theory.md#s-7), cas Z6 au [§15](../simulation-theory.md#s-15).

## 2.7 Le passager, une charge ponctuelle

Le passager est modélisé comme une **charge ponctuelle** : son poids $P = m_p \cdot g$ s'applique
en un seul point de la ligne, à l'abscisse matérielle $s_P$ où se trouve la poulie. L'écartement
des deux roues de la poulie (10 à 25 cm) est négligeable devant une portée de plus de 50 m.

**Ce que la charge change.** La composante verticale saute de $P$ au passage du passager :

$$
V(s) = V_0 + w \cdot s + \begin{cases} 0 & \text{si } s < s_P \\ P & \text{si } s > s_P \end{cases}
$$

La ligne forme alors **deux morceaux de chaînette** qui se rejoignent sous le passager en un
**point anguleux** : c'est le « V » de la ligne chargée. Les formules de 2.4 s'appliquent à chaque
morceau ; les inconnues restent $(H, V_0)$ et les conditions aux ancrages restent les mêmes.

**La poulie roule, elle ne renvoie pas.** La ligne ne passe pas *sur* la poulie comme sur une
poulie de renvoi : c'est la poulie qui roule *sur* la ligne. Les tensions des deux côtés du
passager sont donc en général **différentes**, et c'est justement leur différence qui fait avancer
le passager le long de la ligne ([chapitre 4](4-dynamique.md)).

**Exemple simple (cas Z4).** Portée de niveau, $L = 100$ m, $L_0 = 100{,}5$ m, $w = 10$ N/m,
$EA = 10^7$ N, $P = 1177$ N au milieu. Par symétrie, chaque ancrage porte la moitié du poids de la
ligne et la moitié du passager :
$V_B = (w \cdot L_0 + P)/2 = (1005 + 1177)/2 = 1091{,}0$ N, ce que le moteur retrouve. La tension
horizontale monte à $H = 7898{,}16$ N et le passager est 5,31 m sous les ancrages. La référence
signale qu'un rapport d'origine comptait le passager deux fois dans cette formule.

**Exemple — la ligne d'ouverture.** Avec le passager à $x \approx 75$ m, la tension horizontale
passe de 2535,6 N à vide à environ 7936 N, et la tension en A de 2634,0 N à environ 8172 N :
**plus du triple**. Un passager de 120 kg sur une ligne qui en pèse 83 domine les tensions.

Référence : [§6](../simulation-theory.md#s-6), [§6.1](../simulation-theory.md#s-6-1),
[§6.3](../simulation-theory.md#s-6-3), cas Z4 et forme fermée C11 au
[§15](../simulation-theory.md#s-15).

## 2.8 Le balayage de la traversée

La position la plus dangereuse n'est pas connue d'avance : il faut calculer la ligne **pour toutes
les positions** du passager. C'est le **balayage** (« Sweep »).

**La variable de balayage.** Le moteur ne fait pas avancer le passager en $x$, mais en abscisse
matérielle $s_D$ : la poulie roule sans glisser, donc un point du câble reste le même point quand
la charge change. Pour chaque valeur de $s_D$, la ligne est coupée en deux morceaux de longueurs
non tendues $s_D$ et $L_0 - s_D$, et l'on résout le problème de 2.7.

**La grille.** 240 positions régulièrement espacées en $s_D$, plus 10 positions supplémentaires
dans les 2 % de ligne près de chaque ancrage, où la pente et la tension changent le plus vite :
**260 positions** au total. Chaque position repart de la solution de la précédente, ce qui fait
converger Newton en une à trois itérations.

**Ce qu'on en tire.**

- la **trajectoire** : le chemin du point d'attache du passager, $z_D(x_D)$, dessiné en pointillé
  sur la coupe ;
- l'**enveloppe des tensions** : la plus grande tension à chaque ancrage sur toute la traversée,
  que le Verdict juge ([3.5](3-securite.md#s-3-5)) ;
- la **garde au sol** à chaque position ([2.10](2-statique.md#s-2-10)) ;
- la pente de la trajectoire, que la dynamique utilise ([4.2](4-dynamique.md#s-4-2)).

**La couverture.** Si certaines positions ne se résolvent pas, tout ce qui se déduit du balayage
(tension maximale, garde min (traversée), Verdict) est incomplet ; le simulateur le dit et le Verdict
passe à « Indéterminé ».

**Portée d'un nombre.** Un résultat vaut soit **sur toute la traversée** (le pire cas sur les 260
positions), soit **à la position du passager** choisie dans l'interface. **Le Verdict ne juge que
la traversée.**

**Exemple — la ligne d'ouverture.** Sur les 260 positions, la plus grande tension en A est
8172,1 N (817,2 daN), atteinte avec le passager à $x \approx 74{,}4$ m, presque au milieu.

Référence : [§6.2](../simulation-theory.md#s-6-2).

## 2.9 Deux Brins porteurs

Une portée peut avoir **deux lignes porteuses** identiques, la **ligne du haut** et la **ligne du
bas**, à la même tension de pose ; c'est la configuration redondante usuelle sur corde. Le simulateur
suppose alors que la poulie **partage le passager à 50/50** : chaque ligne est calculée seule,
sous son propre poids et la moitié de la charge, $P/2$. L'écart vertical entre les deux lignes
n'entre dans aucun calcul.

Ce partage est une **convention, non confirmée** : lors de l'essai du 1er novembre 2026, la ligne
du bas instrumentée a porté plus de la moitié. Le simulateur affiche donc aussi le **Cas
défavorable** : une seule ligne porte tout le passager. Cette ligne de résultats donne des
tensions et ne juge rien ; le Verdict ne la lit pas.

Référence : [§8.1](../simulation-theory.md#s-8-1).

## 2.10 La garde au sol

La **garde au sol** est la distance verticale entre le bas du passager et le sol. Le passager
occupe sous la ligne une hauteur $h_{\text{rider}}$, le **gabarit du passager** (poulie, longe et corps) ;
on la retire entièrement :

$$
h_{\text{clear}}(x) = z_{\text{ligne}}(x) - z_{\text{sol}}(x) - h_{\text{rider}}
$$

où $z_{\text{ligne}}$ est la hauteur de la ligne chargée et $z_{\text{sol}}$ celle du sol, en mètres.

**Un double minimum.** Pour chaque position du passager, on cherche le point le plus bas de cette
garde **le long de toute la ligne**, car une bosse du terrain peut être ailleurs que sous le
passager. Puis on prend le plus petit de ces minima **sur toute la traversée**. C'est la **garde
min (traversée)**.

**Les zones d'ancrage.** Près de chaque ancrage, le passager est encore (ou déjà) sur la
plateforme, et la garde y vaut la hauteur d'ancrage moins le gabarit, par construction. Sur une
**zone d'ancrage** de longueur $z$ mesurée à l'horizontale depuis chaque ancrage, rien n'est
jugé : ni position du passager, ni point de ligne ou de sol. La garde est évaluée exactement au
bord des zones, pour ne pas manquer un minimum qui s'y trouve. La longueur par défaut, 10 m, est
une **convention** sans source normative ; $z = 0$ supprime les zones.

**Ce que le simulateur en fait.**

- la garde min (traversée) est comparée à la **garde exigée**, une valeur que l'utilisateur
  choisit (1,0 m par défaut, une convention) ;
- si elle devient négative, c'est un **contact du passager** avec le sol ; si la ligne elle-même
  touche le sol, c'est un **contact de la ligne**, un état d'erreur que le calcul ne cherche pas à
  prolonger.

Le gabarit de 2,1 m par défaut ($1{,}5$ m de longe et poulie $+ 0{,}6$ m de corps) est lui aussi
une **convention** : aucune valeur normative n'a été trouvée.

**Exemple — la ligne d'ouverture, refait à la main.** Le sol est droit, 12 m sous chaque ancrage.
Le pire point est à $x = 74{,}4$ m, sous le passager. Là :

- la ligne A–B est à $-18 \cdot 74{,}4 / 150 \approx -8{,}93$ m ;
- la ligne chargée est 7,48 m plus bas (la flèche chargée), à $\approx -16{,}41$ m ;
- le sol est 12 m sous la ligne A–B, à $\approx -20{,}93$ m ;
- garde $= -16{,}41 - (-20{,}93) - 2{,}1 \approx 2{,}42$ m.

C'est la garde min (traversée) qu'affiche le simulateur, au-dessus de la garde exigée de 1,0 m.

Référence : [§11](../simulation-theory.md#s-11), [§6.3](../simulation-theory.md#s-6-3).

## 2.11 Ce qui change avec le temps

La longueur non tendue $L_0$ n'est pas éternelle. Trois phénomènes la modifient ; le modèle les
traite tous de la même façon : on change $L_0$ de $\Delta L_0$, puis on refait la résolution.

**La température.** Un matériau se dilate de $\alpha$ par kelvin (K) d'échauffement :

$$
\Delta L_0 = L_0 \cdot \alpha \cdot \Delta T
$$

avec $\alpha \approx +1{,}2 \times 10^{-5}$ /K pour un câble galvanisé. Le HMPE fait exception : il
**se contracte** en chauffant ($\alpha < 0$), et une journée chaude le tend. Exemple vérifié
(cas Z7) : portée de niveau de 200 m, $w = 5$ N/m, $EA = 10^7$ N, $L_0 = 200{,}05$ m, $+30$ K. Le
câble passe à $L_0 = 200{,}122$ m, sa tension horizontale de 6717 N à 5890 N et sa flèche de 3,72
à 4,24 m. Un HMPE de même géométrie passe à $L_0 = 199{,}978$ m, et sa tension horizontale **monte**
à 7850 N.

**L'allongement de construction**, une fois pour toutes, aux premières mises en charge : de 0,25 à
1 % pour un câble, de 1 à 3 % pour une corde tressée (valeurs de manuels, conventions).

**Le fluage** : une corde, surtout en HMPE, s'allonge lentement sous charge permanente, d'autant
plus que la charge et la température sont élevées. La règle retenue est de garder la tension à
vide d'une corde sous 30 % de sa charge de rupture ([3.8](3-securite.md#s-3-8)).

**Ce que le simulateur en fait.** Il **ne calcule pas** ces évolutions : ni température, ni
fluage. Il avertit sur la tension à vide des cordes ([3.8](3-securite.md#s-3-8)) et, sur la Page Avancé, cite les
pertes de tension relevées lors de l'essai de terrain (« Pourquoi on retend ») sans en tirer de
loi. Ces paragraphes expliquent pourquoi une ligne se retend, pas un résultat affiché.

Référence : [§9](../simulation-theory.md#s-9), [§9.1](../simulation-theory.md#s-9-1),
[§9.2](../simulation-theory.md#s-9-2), cas Z7 au [§15](../simulation-theory.md#s-15).

---

Précédent : [1. Comprendre la ligne](1-ligne.md) · Suivant : [3. Sécurité](3-securite.md)
