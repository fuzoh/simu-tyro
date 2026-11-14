# 4. Dynamique : le mouvement du passager

Les chapitres précédents traitent le passager comme immobile. Ce chapitre le fait rouler : à quelle
vitesse descend-il, où s'arrête-t-il, à quelle vitesse arrive-t-il en B ? Tout ce qu'il produit est
une **estimation** : un modèle simple, avec des valeurs ajustées sur une seule campagne de mesures,
qui n'intervient jamais dans le Verdict.

## 4.1 L'hypothèse quasi statique

**Le principe.** Le moteur procède en deux temps. D'abord la statique : le balayage
([2.8](2-statique.md#s-2-8)) donne la **trajectoire**, le chemin que suit le point d'attache du
passager. Puis la dynamique : le passager est une masse ponctuelle qui roule sur cette trajectoire,
**figée**. On suppose donc que la ligne prend instantanément sa forme d'équilibre à chaque
position.

**Quand c'est raisonnable.** Une ligne tendue transmet les déformations sous forme d'ondes, à la
vitesse

$$
c = \sqrt{\frac{T}{\mu}}
$$

| Symbole | Signification | Unité |
| --- | --- | --- |
| $c$ | vitesse des ondes transversales le long de la ligne | m/s |
| $T$ | tension de la ligne au niveau de la poulie | N |
| $\mu$ | masse linéique ([1.4](1-ligne.md#s-1-4)) | kg/m |

Tant que le passager va nettement moins vite que ces ondes, la ligne a le temps de « suivre ».
Les deux recherches d'origine placent la limite entre $v/c \approx 0{,}2$ et $0{,}3$ ; le simulateur
retient **0,2**, la plus prudente, et avertit au-delà. Plus vite, la ligne prend du retard sur le
passager, des ondes se propagent, et la trajectoire figée décrit mal la traversée ; l'erreur
commise au-delà du seuil n'est pas quantifiée dans les sources.

Le Spéléo Secours Français a observé des tensions en accord avec le calcul quasi statique jusqu'à
environ 33 m/s sur sa ligne instrumentée, où $c$ dépassait 100 m/s.

**Exemple — la ligne d'ouverture.** Avec le passager au milieu, $T \approx 8172$ N et
$\mu = 0{,}5465$ kg/m donnent $c \approx \sqrt{8172 / 0{,}5465} \approx 122$ m/s. Le plus grand
rapport $v/c$ de la descente vaut 0,19, juste avant B : sous le seuil, mais de peu.

Référence : [§12.1](../simulation-theory.md#s-12-1).

## 4.2 L'équation du mouvement

Le passager de masse $m$ (kg) avance le long de la trajectoire. Sa vitesse $v$ (m/s, positive vers
B) change sous l'effet de trois forces le long de la trajectoire :

$$
m \cdot \frac{\mathrm{d}v}{\mathrm{d}t} = m \cdot g \cdot \sin\theta - F_{\text{frottement}} - F_{\text{traînée}}
$$

| Terme | Signification | Unité |
| --- | --- | --- |
| $m \cdot g \cdot \sin\theta$ | part du poids le long de la trajectoire ; $\theta$ est la pente locale, comptée positive vers le bas | N |
| $F_{\text{frottement}}$ | résistance de la poulie au roulement, opposée au mouvement ([4.3](4-dynamique.md#s-4-3)) | N |
| $F_{\text{traînée}}$ | résistance de l'air, opposée au mouvement relatif à l'air | N |

**La traînée de l'air** croît comme le carré de la vitesse relative à l'air :

$$
F_{\text{traînée}} = \tfrac{1}{2} \cdot \rho \cdot C_dA \cdot v_{\text{rel}} \cdot \lvert v_{\text{rel}} \rvert \qquad v_{\text{rel}} = v - u_{\parallel} \cdot \cos\theta
$$

| Symbole | Signification | Unité |
| --- | --- | --- |
| $\rho$ | masse volumique de l'air | kg/m³ |
| $C_dA$ | surface de traînée du passager (forme × surface exposée) | m² |
| $u_{\parallel}$ | composante du vent horizontal le long de la direction A → B, positive quand il pousse vers B (vent dans le dos) | m/s |

Le produit $v_{\text{rel}} \cdot \lvert v_{\text{rel}} \rvert$ garde le signe de la vitesse relative : la traînée
s'oppose toujours au mouvement par rapport à l'air.

**Le vent.** Le Vent saisi est géographique (vitesse et direction d'où il vient) ; le simulateur
le projette sur la direction de la ligne, ce qui exige de connaître les Positions de A et B. Seule
sa composante **le long de la ligne** entre dans l'équation ; l'effet direct du vent de travers
sur la vitesse du passager n'est pas modélisé, ce qui n'est pas une affirmation qu'il n'existe
pas. Sans Positions, le mouvement est calculé sans vent.

**Ce qui est négligé.** La force centrifuge dans les creux de la trajectoire (en général moins de
2 %) ; le balancement du passager sous la poulie ; la tension dynamique de la ligne.

**Le départ.** Le passager part **arrêté en A** (départ contrôlé). Le moteur intègre l'équation
pas à pas le long de la trajectoire (un pas d'au plus 1 m). Quand la vitesse retombe à zéro, le
passager ne repart que si la pente, plus le vent, l'emporte sur la retenue de la poulie à l'arrêt.

Référence : [§12.2](../simulation-theory.md#s-12-2).

## 4.3 Les constantes et leur provenance

Toutes sont modifiables sur la Page Avancé, groupe « Dynamique du passager », et toutes portent
leur source.

**Surface de traînée $C_dA$ = 0,45 m².** Ajustée par le Spéléo Secours Français sur sa ligne
instrumentée de 1109 m : une seule campagne, un spéléologue harnaché, une corde, une poulie non
nommée. Ce n'est ni un passager assis de parc, ni un câble. La plage du champ, 0,30 à 0,60 m², est
une convention et non une mesure. Un rapport d'origine donne des valeurs beaucoup plus faibles
pour un passager couché ; elles contredisent la seule mesure de terrain et ne sont pas retenues.

**Frottement de la poulie sur une corde : $F = F_0 + k_v \cdot v$**, avec $F_0 = 15$ N (frottement
constant) et $k_v = 1{,}5$ kg/s (frottement proportionnel à la vitesse, $v$ en m/s). Ajustement
mesuré par le Spéléo Secours Français, indépendant du poids du passager. Avec deux Brins porteurs,
un seul $F_0$ est appliqué ; rien n'établit qu'une poulie à deux réas en ajoute deux.

**Frottement de la poulie sur un câble : $F = \mu \cdot m \cdot g \cdot \cos\theta$**, avec
$\mu = 0{,}015$ (sans dimension). Aucune source ouverte ne sépare le câble de la corde ; cette
valeur, bas d'une plage de 0,015 à 0,02 tirée d'une formule de manuel sans source primaire, est
une **convention non confirmée**, et le simulateur le signale.

**Masse volumique de l'air $\rho$.** Calculée par le modèle d'atmosphère standard à l'altitude
moyenne du profil importé :

$$
\rho = \frac{p}{R_s \cdot T_{\text{air}}} \qquad p = 101\,325 \cdot \left(1 - 2{,}25577 \times 10^{-5} \cdot h_{\text{alt}}\right)^{5{,}2559} \qquad T_{\text{air}} = 288{,}15 - 0{,}0065 \cdot h_{\text{alt}}
$$

avec $p$ la pression (Pa), $T_{\text{air}}$ la température (K), $h_{\text{alt}}$ l'altitude (m) et
$R_s = 287{,}05$ J/(kg·K). On obtient 1,225 kg/m³ au niveau de la mer, environ 1,06 à 1500 m et
0,96 à 2500 m. Sans profil importé, le simulateur prend 1,225.

Référence : [§12.2](../simulation-theory.md#s-12-2), et le
[rapport sur l'aérodynamique du passager](../references/spatial-wind/rider-aerodynamics-review.md)
pour le vent.

## 4.4 Deux exemples chiffrés

**Vitesse limite sur une pente constante (cas Z8 de la référence).** Pente de 10°, passager de
90 kg, corde ($F = 15 + 1{,}5 \cdot v$), $\rho = 1{,}225$, $C_dA = 0{,}45$. À vitesse limite,
l'accélération est nulle : le poids le long de la pente équilibre exactement les résistances.

- poids le long de la pente : $90 \cdot 9{,}81 \cdot \sin 10° \approx 153{,}314$ N ;
- traînée : $\tfrac{1}{2} \cdot 1{,}225 \cdot 0{,}45 \cdot v^2 = 0{,}275625 \cdot v^2$ ;
- équilibre : $0{,}275625 \cdot v^2 + 1{,}5 \cdot v + 15 = 153{,}314$.

Cette équation du second degré a pour racine positive $v \approx 19{,}845$ m/s, soit 71,4 km/h.

**La ligne d'ouverture.** Câble, 120 kg, pas de vent, valeurs par défaut. Le passager part arrêté
de A, atteint environ 16,0 m/s, et **arrive en B** à **12,9 m/s** (46,6 km/h) après 12,0 s, sans
freinage. C'est la vitesse d'arrivée qu'affiche le simulateur, une estimation.

Référence : cas Z8 au [§15](../simulation-theory.md#s-15).

## 4.5 Ce que la dynamique produit

À partir de la trajectoire et des constantes, le simulateur donne :

- la **vitesse et l'accélération** le long de la portée ;
- la **vitesse d'arrivée** en B, quand le passager l'atteint, sans freinage ;
- le **point d'arrêt** : là où la vitesse revient à zéro et où la pente, vent compris, ne suffit
  plus à vaincre la retenue de la poulie. Sans vent, c'est en gros le point bas de la ligne
  chargée, décalé par le frottement. Il est calculé deux fois : **sans vent**, puis **avec le vent
  saisi** ;
- le **point le plus loin** atteint vers B, balancements compris, et la **distance restante à B**
  depuis ce point. Ce n'est pas le point d'arrêt : un passager qui repart en arrière s'immobilise
  bien en deçà de l'endroit où il a fait demi-tour ;
- la **durée** de la descente.

Avec deux Brins porteurs, la trajectoire est celle d'une ligne sous $P/2$ ([2.9](2-statique.md#s-2-9)), et la masse qui
la parcourt est la masse entière du passager.

Ne sont **pas** produits : le déplacement latéral, la tension dynamique de la ligne, le freinage.

Référence : [§12.2](../simulation-theory.md#s-12-2).

## 4.6 La Proposition pour l'ancrage B

Le simulateur peut répondre à la question inverse : **de combien monter ou descendre B**, A restant
fixe, pour que le point le plus loin du passager, avec le vent saisi, tombe à une part voulue de
la portée, la **cible du point le plus loin** ?

**Comment.** Il n'y a pas de formule : chaque essai refait toute la chaîne de calcul avec B déplacé
de $\Delta$ (le pilote de tension résolu à nouveau, le balayage, puis le mouvement), le sol restant
où il est. Les hauteurs sont parcourues par pas de 0,1 m, et la proposition est **la plus basse
qui garde le point le plus loin sur la cible ou en deçà**. Elle est ensuite recalculée avec la garde
au sol et avec le mouvement sans vent, pour comparaison. Les bornes : B ne descend pas sous son
pied ($z_B + \Delta \ge 0$) et la pente de la ligne A–B ne dépasse pas 45° ($h + \Delta \le L$).

**La cible.** De 50 à 98 % de la portée, en pour cent entiers, 90 % par défaut : une convention.
B lui-même est exclu, puisque c'est l'arrivée que l'on cherche à éviter. Au-dessus de 93 %, la
proposition est donnée avec un avertissement : sur les lignes mesurées, une traînée plus faible
($C_dA$ = 0,30) ou un léger vent dans le dos (10 km/h) suffisaient à faire atteindre B.

**Les refus.** Pas de hauteur proposée, avec la raison, quand la cible sort de son domaine, quand
aucune hauteur dans les bornes ne l'atteint, quand la ligne cesse de se résoudre en chemin, quand
le point le plus loin saute par-dessus la cible entre deux hauteurs voisines, quand la garde n'est
pas jugée, ou quand la ligne proposée toucherait le profil hors des zones d'ancrage.

**Exemple — la ligne d'ouverture.** Pour une cible de 90 %, le simulateur propose de **monter B de
17,6 m**. Le point le plus loin est alors à 134,6 m (la cible est $0{,}90 \cdot 150 = 135$ m), et le
passager, après être reparti en arrière, s'arrête à 79,8 m. Une variation de ±20 kg de la masse du
passager déplace ce point le plus loin de 1 à 4 % de la portée.

**Ce que ce n'est pas.** Une estimation, construite sur le mouvement estimé. Elle n'applique rien,
ne refait ni le Verdict ni la comparaison à la garde exigée, et ne garantit pas que le passager
s'arrête avant B : le freinage reste nécessaire et hors calcul. Un B déplacé ailleurs se trouve sur
un autre sol, à vérifier et à recalculer.

Référence : [§12.2](../simulation-theory.md#s-12-2), partie « Inverse ».

## 4.7 Le freinage, hors calcul

Le simulateur **ne dimensionne pas** le freinage. La référence en rassemble les principes, utiles
pour comprendre ce qu'il resterait à vérifier :

- **frein à courants de Foucault** : la force croît avec la vitesse puis sature ; les courbes sont
  propres aux fabricants, qui publient des plages d'emploi (masse, vitesse maximale) ;
- **frein élastique** : l'énergie élastique $\tfrac{1}{2} \cdot k_r \cdot x^2$ du ressort
  ($k_r$ en N/m, course $x$ en m) doit absorber l'énergie du passager $\tfrac{1}{2} \cdot m \cdot v^2$,
  pour le passager le plus lourd et le plus rapide ;
- **remontée en fin de ligne** : il faut une remontée d'au moins $v^2 / (2 \cdot g)$, plus une
  marge pour le roulement et l'air ;
- **décélération** : la pratique (et non une norme, dont les valeurs sont payantes) est de rester
  sous 2,5 à 3 g soutenus, ce qui demande une distance d'arrêt $v^2 / (2 \cdot G \cdot g)$, $G$
  étant la décélération en multiples de $g$.

**Ordre de grandeur, à titre d'illustration.** Pour la vitesse d'arrivée estimée de la ligne
d'ouverture, 12,9 m/s, une remontée seule demanderait au moins
$12{,}9^2 / (2 \cdot 9{,}81) \approx 8{,}5$ m de dénivelé, et un arrêt à 2,5 g environ
$12{,}9^2 / (2 \cdot 2{,}5 \cdot 9{,}81) \approx 3{,}4$ m. Ces nombres ne sont pas affichés par le
simulateur et ne remplacent pas le dimensionnement d'un frein.

Référence : [§12.3](../simulation-theory.md#s-12-3).

---

Précédent : [3. Sécurité](3-securite.md) · Suivant : [5. Limites du modèle](5-limites.md)
