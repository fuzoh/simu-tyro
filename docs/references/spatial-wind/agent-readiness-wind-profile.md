# Profil du vent — spécification prête à arbitrer (#120)

Date : 2026-11-10. Décision servie : issue #120, dernier commentaire mainteneur
(2026-11-10T07:40:14Z), qui prévaut sur le corps de l’issue, sur les commentaires du 2026-11-09 et
sur la suggestion d’amplitude signée de
[valley-wind-review.md](valley-wind-review.md). Cadrage moteur :
[#127, commentaire du 2026-11-10](https://github.com/fuzoh/simu-tyro/issues/127).

Ce document fixe la courbe, l’unité, les bornes, le sens des axes et le contrat de
sérialisation encore ouverts. Ce n’est pas une prédiction météorologique, pas un
facteur de sécurité, pas une charge, et pas un brief d’aérodynamique, de solveur
ou de vue. Aucun fichier de code n’a été modifié.

## Statut

**Verrouillé par le mainteneur (ne pas rouvrir) :**

- Scénario utilisateur prescrit. Pas un vent de vallée déduit du relief, pas une
  enveloppe conservative, pas une reconstruction à partir de deux ancrages.
- Un seul Vent dans l’application. Direction horizontale commune partout.
- Défaut : vent uniforme. Atténuation nulle = vitesse résiduelle 100 %.
- Maximum au milieu de A–B, vitesse résiduelle aux ancrages, symétrie autour du
  milieu. Deux grandeurs exposées : étendue de la zone centrale exposée, et
  atténuation aux extrémités.
- Le profil est ancré à la coordonnée A–B. Il ne dépend pas de la hauteur ni de la
  distance latérale. La déformation ne déplace pas la zone exposée. Ligne et
  passager lisent le même champ local.
- Les paramètres modifient la vitesse, pas la force. Les charges, plus tard, sont
  locales. Pas de moyenne spatiale de vitesse.
- La largeur n’a aucun effet physique tant que l’atténuation est nulle, mais elle
  est conservée.
- Seconde poignée, axes d’écran fixes, sans rotation avec le vent : horizontal =
  étendue, vertical = atténuation, diagonale = les deux à la fois. Champs
  numériques, aperçu A–milieu–B, action « Vent uniforme » qui remet l’atténuation
  à zéro. Nom visible « profil du vent ». Le facteur Q n’est qu’une analogie de
  manipulation.
- Cette commande alimente le futur moteur #127. Elle ne module pas une charge
  existante : la statique actuelle ne reçoit pas le vent.

**Tranché ici, sous réserve des quatre questions en fin de note :**

- Courbe préférée : plateau central à la vitesse saisie, puis épaulements en
  cosinus relevé jusqu’à la vitesse résiduelle aux ancrages.
- Largeur = fraction de la portée horizontale `L`, pas des mètres stockés, pas un
  écart-type, pas un Q.
- Bornes proposées : largeur `[0 ; 0,90]`, atténuation `[0 ; 1]`.
- Axe vertical proposé : vers le haut de l’écran, l’atténuation augmente.

L’amplitude signée « A » de la revue vallée (2026-11-09) est **écartée**. Elle
permettrait un centre plus calme que les ancrages ou un changement de signe. Le
commentaire du 2026-11-10 impose un maximum central et une atténuation vers les
extrémités seulement. #9 (déplacement latéral, fermée) décrit une banane sous
charge uniforme ; elle ne choisit pas de courbe le long de la portée.

## Proposition préférée

La vitesse de la rose est le maximum central. L’atténuation baisse la vitesse vers
les ancrages, sans toucher ce maximum. La largeur est la part de la portée qui
reste **exactement** à cette vitesse centrale. En dehors, un cosinus relevé rejoint
la vitesse résiduelle, avec pente nulle au raccord et aux ancrages.

Phrase d’interface, à mettre dans l’aide du champ, pas dans un bandeau nouveau :
« Part de la portée où la vitesse reste celle du milieu. Au-delà, elle rejoint la
vitesse résiduelle aux ancrages. Ce n’est pas une prévision de vallée. »

Pourquoi celle-ci, et pas une cloche : le mainteneur a nommé une « zone centrale
exposée », pas une largeur à mi-hauteur. Un plateau rend cette phrase littérale.
Les deux autres courbes restent disponibles si le plateau est refusé.

## Coordonnée et vitesse

Symboles du moteur à ne pas réutiliser : `s` est l’abscisse matérielle non étirée,
`σ` la longueur d’arc étirée, la corde est `√(L²+h²)`
(`docs/simulation-theory.md` §1). La portée `L` est l’écartement **horizontal**.

Pour un point de l’espace, soit `x` sa distance horizontale depuis A vers B, en
mètres, la même famille que `x_D` et que l’abscisse du profil de terrain. Tant que
`L > 0` :

```text
ξ = x / L
```

`ξ = 0` en A, `ξ = 1` en B, `ξ = 1/2` au milieu de la portée. La hauteur
géographique et le déport horizontal perpendiculaire à A–B n’entrent pas. Un point
dont la projection planimétrique sort de `[0 ; L]` est ramené à l’extrémité la
plus proche avant évaluation : c’est une extension définie pour une requête
numérique, pas un vent au-delà des ancrages.

Cette lecture est celle qui rend le verrou « identique à toute hauteur et distance
latérale » vrai pour une portée inclinée. L’abscisse le long de la corde 3D ne
l’est pas : sous un point du milieu de corde, le sol n’a pas la même fraction de
corde. L’abscisse matérielle est écartée parce que la déformation déplacerait la
zone.

`L ≤ 0`, ou A/B sans gisement : le profil n’est pas évalué. Les valeurs saisies
restent, comme le Vent actuel (`GLOSSARY.md`, Vent ; `windBearing`).

Soient :

- `V` la vitesse du Vent, km/h, celle de la rose (`speedKmh`). C’est le maximum
  central, pas une moyenne.
- `α` l’atténuation aux extrémités, sans dimension, dans `[0 ; 1]`.
- `λ` l’étendue de la zone exposée, fraction de `L`, dans `[0 ; 0,90]`.

```text
U(ξ) = V · ( (1 − α) + α · φ_λ(ξ) )
```

`U` est en km/h, horizontale, dans la direction déjà portée par `directionDeg`.
La conversion m/s reste `kmhToMs` (`src/lib/sim/wind.ts`), appliquée à `U(ξ)`, pas
une seconde loi. `φ` vaut 1 au milieu et 0 aux ancrages, donc :

- vitesse au milieu = `V`, pour tout `α` et tout `λ` ;
- vitesse aux ancrages = `V · (1 − α)` ;
- `α = 0` ⇒ `U ≡ V`, quel que soit `λ`.

Ne pas multiplier une force par `φ` ni par `φ²`. Ne pas remplacer `U` par sa
moyenne sur la portée. La revue vallée rappelle pourquoi, pour une charge
quadratique : la moyenne de `U²` n’est pas le carré de la moyenne. Ce rappel
contraint le futur consommateur #127 ; ce profil ne calcule pas de charge.

## Courbe préférée — plateau et cosinus relevé

`φ_λ` est la forme continue du plateau à bords en cosinus (fenêtre de Tukey /
cosinus relevé, au sens rappelé plus bas). Pour `λ ∈ [0 ; 0,90]` :

```text
h = λ / 2
δ = |ξ − 1/2|

si δ ≤ h :
  φ_λ(ξ) = 1
sinon :
  t = (δ − h) / (1/2 − h)
  φ_λ(ξ) = cos²(π t / 2) = (1 + cos(π t)) / 2
```

`1/2 − h = (1 − λ) / 2` est la largeur de chaque épaulement, au moins `0,05` de la
portée. Le dénominateur n’est donc jamais nul dans les bornes.

Identités utiles, toutes à la main :

- `φ_λ(1/2) = 1`, `φ_λ(0) = φ_λ(1) = 0`.
- `φ_λ(ξ) = φ_λ(1 − ξ)`.
- Sur un épaulement, `dφ/dt = −(π/2) sin(π t)`. Donc `dφ/dt = 0` en `t = 0` et en
  `t = 1`. La pente en `ξ` est nulle au raccord du plateau et aux deux ancrages.
- `dφ/dξ` maximale en valeur absolue = `π / (1 − λ)`, atteinte au milieu de chaque
  épaulement (`t = 1/2`). À `λ = 0,90`, cela vaut `10π ≈ 31,42` par unité de `ξ`,
  soit `10π / L` par mètre. À `L = 50 m`, environ `0,63 m⁻¹`. Pas de singularité.
- La demi-hauteur de l’excès (`φ = 1/2`) est à `t = 1/2`, donc à la distance
  `δ = (1 + λ) / 4` du milieu. La largeur à mi-excès vaut `(1 + λ) / 2` de la
  portée. Ce n’est pas la grandeur affichée. La grandeur affichée est `λ`.
- `λ = 0` : `φ_0(ξ) = cos²( π (ξ − 1/2) )`, de classe `C∞`. L’excès vaut `1/2` en
  `ξ = 1/4` et `ξ = 3/4`.
- `λ > 0` : `φ` est `C¹` sur `[0 ; 1]`, pas `C²` aux deux raccords et aux
  ancrages. La dérivée seconde de l’épaulement en `t = 0` vaut `−π²/2 ≠ 0`, alors
  que le plateau a une dérivée seconde nulle. Un saut de courbure n’empêche pas la
  pente d’être continue. La régularité demandée au solveur n’est pas tranchée ici.

Cas de contrôle, `λ = 1/2`, `h = 1/4`, épaulement de `1/4` :

| `ξ` | `t` | `φ` | lecture |
| --- | --- | --- | --- |
| `0` et `1` | `1` | `0` | ancrages |
| `1/8` et `7/8` | `1/2` | `1/2` | milieu d’épaulement, `cos²(π/4) = 1/2` |
| `1/4` et `3/4` | `0` | `1` | raccord, branche plateau (`δ = h`) |
| `1/2` | — | `1` | milieu |

Avec `V = 40` km/h et `α = 1/2` : `U(1/2) = 40`, `U(0) = 20`, `U(1/8) = 30`.
Avec `α = 0` : `U = 40` partout, même si `λ` change.

Le nom « Tukey » vient de Harris 1978, section 41 du PDF scanné cité plus bas :
fenêtre à cosinus relevé, lobe de cosinus convolué à un rectangle, pour rejoindre
zéro aux bords sans abaisser le palier central. Les glyphes d’équations de ce scan
ne sont pas fiables. La formule ci-dessus est dérivée dans cette note ; elle n’est
pas recopiée de Harris, et elle n’est pas un modèle de vent.

## Unité, bornes, défauts, dégénérescences

| Grandeur | Symbole | Stockée | Affichée | Défaut | Borne légale |
| --- | --- | --- | --- | --- | --- |
| Étendue de la zone exposée | `λ` | fraction de `L` | pourcent entier | `0,50` | `[0 ; 0,90]` |
| Atténuation aux extrémités | `α` | fraction de `V` | pourcent entier | `0` | `[0 ; 1]` |
| Vitesse centrale | `V` | km/h, déjà le Vent | km/h entier, déjà | `0` | `≥ 0`, déjà |

`0,50` est un défaut d’interface, pas une échelle de vallée. La première
atténuation non nulle laisse le milieu de la portée à la vitesse saisie. Le grain
d’affichage est `1 %`, pour que le geste et le champ tombent sur le même chiffre,
comme la rose (`wind-rose.ts` : ce que la poignée écrit est ce qu’un champ peut
tenir). Arrondi : le même `roundToDisplay` que la rose, pas une seconde politique.

Mètres : `λ · L` est une **lecture** de l’aperçu quand `L` est connu, jamais une
seconde entrée et jamais une clé d’URL. Changer la portée conserve la fraction ;
la lecture en mètres change. Stocker des mètres couplerait le lien à `L` et
demanderait une règle de clamp à chaque édition de portée.

Dégénérescences, toutes définies :

1. `α = 0` : `U ≡ V`. `λ` est sans effet physique, reste éditable, reste stocké,
   reste visible sur l’aperçu comme marque mémorisée, pas comme un creux de la
   courbe. La courbe est plate.
2. `V = 0` : `U ≡ 0` quel que soit `α` ou `λ`. Direction et profil restent saisis,
   comme aujourd’hui une direction sans vitesse.
3. `α = 1` : vitesse nulle aux ancrages, `V` au milieu. Le vecteur local y est le
   vecteur nul. La direction du scénario reste `directionDeg` partout où `U ≠ 0`.
   Ce n’est pas une inversion, pas une recirculation, pas un abri prédit.
4. `λ = 0` : pas de plateau. Seul le milieu est à `V` (si `α > 0`). Formule `C∞`
   ci-dessus. La largeur à mi-excès vaut la moitié de la portée : cette famille ne
   sait pas faire un pic plus étroit. C’est le prix du plateau. L’alternative 2 le
   sait.
5. `λ = 0,90` : épaulements de `5 %` de `L`. Pente bornée, formule ci-dessus.
6. `λ ≥ 1` ou `λ < 0`, `α` hors `[0 ; 1]`, valeur non finie : pas dans le domaine.
   Le lien les transporte telles quelles (frontière de typage, pas de validation) ;
   le formulaire les refuse. Ne pas les réparer en silence, ne pas traiter
   `λ = 1` comme un vent uniforme : cela effacerait l’atténuation.
7. `L ≤ 0` ou gisement absent : ne pas diviser par `L`. Profil non appliqué.
8. `V`, `α` et `λ` sont indépendants. Changer `V` met le profil à l’échelle, la
   fraction résiduelle ne bouge pas. Changer la direction ne tourne ni `φ` ni la
   seconde poignée.

`src/lib/rail/fields.ts` ne sait pas encore refuser un plafond : les règles
bloquantes sont `positive`, `non-negative` et `finite` ; `above` est un
avertissement. Une implémentation devra étendre cette union, ou refuser dans la
porte Vent. Ne pas se contenter d’un avertissement pour `λ ≥ 1` ou `α > 1` : la
formule n’a pas de sens, ou elle réintroduit une amplitude hors contrat.

## Poignée, axes, clavier, aperçu, remise à zéro

La poignée de direction reste celle de `src/components/map/wind-rose.tsx`. La
seconde ne partage pas son repère polaire et n’appelle pas `roseReference`,
`screenBearing` ni `north`. Un dessin nord en haut et un dessin de niveau (A à
gauche) placent la poignée de profil au même offset d’écran pour le même
`(λ, α)`.

Zone de réglage : rectangle d’écran, axes fixes, qui peut apparaître à la
sélection de la poignée (clic, tap ou focus). La poignée elle-même est offerte
dès que la poignée de direction l’est : gisement présent, et pas la page Terrain
en lecture seule (`onWind` absent, #101). Même raison de désactivation que les
champs du Vent (`WIND_UNPLACED`) : valeurs conservées, pas effacées.

Sens proposé, à confirmer (question 1) :

- Horizontal, gauche → droite : `λ` de `0` à `0,90`. Droite = zone exposée plus
  étendue.
- Vertical, bas → haut de l’écran : `α` de `0` à `1`. Haut = plus d’atténuation.
  Le bas est le repos « Vent uniforme ».
- Les axes sont indépendants. Une diagonale change les deux parce que chaque axe
  ne lit que sa coordonnée. Pas de contrainte radiale, pas de verrou d’axe.

Si `u ∈ [0 ; 1]` va vers la droite et `v ∈ [0 ; 1]` vers le haut de l’écran :

```text
λ = arrondi_affichage(0,90 · u)
α = arrondi_affichage(v)
```

Inverse, pour dessiner la poignée depuis l’état : `u = λ / 0,90`, `v = α`. En
coordonnées d’écran `y` vers le bas, comme `RoseOffset` : `y` relatif au haut du
rectangle = `(1 − v) · hauteur`. Une valeur dactylographiée hors bornes n’est pas
réécrite par la poignée : elle reste, et le champ la refuse. Ce n’est pas le cas
de la vitesse, dont l’anneau à 60 km/h n’est qu’une échelle de dessin
(`ROSE_MAX_KMH`) sans plafond de saisie.

Contrat de geste, repris de la rose, pas une bibliothèque de slider :

- `setPointerCapture` pendant le contact, `touch-action: none`, écriture pendant
  le mouvement et non au relâchement. Pointer Events niveau 3, Recommendation du
  30 juin 2026 : après `setPointerCapture`, les événements suivants visent
  l’élément capturant tant que la capture tient.
- Cible tactile : `44` px, la constante `HANDLE_PX` déjà commentée comme minimum
  Apple / Material. Pas une nouvelle taille.
- Grain : le déplacement utile doit faire au moins `1` px par pas de `1 %`, sinon
  le geste ne peut pas atteindre chaque valeur dactylographiée. L’atténuation a
  `101` valeurs, la largeur `91`. Un voyage d’au moins `101` px et `91` px suffit.
  `160` px est une recommandation de confort, pas une constante de scénario.
- Clic ou tap sur la zone, sans glisser, pose la poignée à cet endroit. C’est
  l’alternative à un doigt qui ne peut pas glisser. Les champs numériques restent
  obligatoires même avec ce clic : WCAG 2.2, compréhension du critère 2.5.7, dit
  qu’un champ texte est une alternative acceptable au glisser, et que le clavier
  (critère 2.1.1) est une exigence distincte. La rose actuelle n’a pas de
  `onKeyDown` ; le clavier du Vent est le champ. Ne pas inventer de touches
  fléchées sur la poignée.

Champs : deux champs numériques de plus, mêmes widgets que les autres
(`<input type="text" inputMode="decimal">`, pas `type="number"`,
`src/components/rail/controls.tsx`). Libellés visibles : « Étendue de la zone
exposée » et « Atténuation aux extrémités ». Indications : « % ». Ils écrivent le
même état que la poignée. Ils vivent avec les champs du Vent, donc au clavier,
sur les pages qui saisissent déjà la vitesse et la direction. La zone près de la
rose peut les montrer ; elle ne doit pas être le seul chemin clavier. Porte :
la porte Vent existante. Une valeur illégale ne doit pas être lue par l’aperçu
comme si elle était légale.

Aperçu, près de la rose, nommé « profil du vent » :

- A à gauche, B à droite, toujours. Ce n’est pas l’axe horizontal de la poignée.
  La poignée règle deux paramètres ; l’aperçu trace `U(ξ)`. Ne pas les superposer.
- Courbe de vitesse, pas de force. Trois lectures : vitesse au milieu (`V`),
  vitesse aux extrémités (`V · (1 − α)`), étendue (`λ`, et `λ · L` en mètres si
  `L` est connu).
- `α = 0` : ligne plate à `V`. La largeur mémorisée est marquée comme telle, sans
  dessiner un creux qui n’existe pas.
- Pas de bandeau supplémentaire. L’aide du champ porte la limite. Le mainteneur
  l’a demandé ainsi.

« Vent uniforme » met `α` à `0` et ne touche ni `λ`, ni `V`, ni `directionDeg`.
Ce n’est pas « Pas de vent ». Pas de vent reste `V = 0` et direction `0`. La
poignée descend au bas du rectangle, `u` inchangé.

`windFromOffset` renvoie aujourd’hui seulement `{ speedKmh, directionDeg }`
(`src/lib/map/wind-rose.ts`). Une poignée de direction qui remplacerait l’objet
Vent entier effacerait `λ` et `α`. L’invariant : chaque geste n’écrit que les
champs qu’il possède.

## Sérialisation

Ne pas incrémenter `v`. `v` autre que `1` refuse le lien entier
(`src/lib/url/schema.ts`). `ws` et `wd` ont été ajoutés sans changer `v` :
l’absence est le défaut. Même règle.

Clés proposées, libres dans `CANONICAL_KEYS` au 2026-11-10, à insérer après `wd`
et avant `cda` :

| Clé | Sens | Unité dans l’URL | Absente | Omise à l’écriture quand |
| --- | --- | --- | --- | --- |
| `ww` | `λ` | fraction, grain `0,01` | `0,50` | valeur `0,50` |
| `wa` | `α` | fraction, grain `0,01` | `0` | valeur `0` |

Exemples : `wa=0.5` est `α = 1/2` ; `ww=0.5` n’est pas écrit si c’est le défaut.
Un lien ancien, sans ces clés, reste un vent uniforme à largeur `0,50` mémorisée.
`ww` seul conserve une largeur sans effet physique. `wa` seul applique
l’atténuation sur la largeur par défaut. Les deux font l’aller-retour.

Le schéma d’URL ne porte pas de `minValue` / `maxValue`. `wa=1.5` ou `wa=-0.2`
arrive, et le formulaire refuse, comme `ws=-5`. Pas de `transform` qui réécrirait
le lien.

Conséquence sur le commentaire « Absence carries exactly eleven meanings and never
a twelfth » : il faudra l’amender. `wa` absente = atténuation nulle, `ww` absente
= largeur `0,50`, sont des sens nouveaux. Les exempter de la complétion, comme
`ws` / `wd` : sinon chaque lien ancien serait réécrit. Ne pas les faire porter par
`ws` ou `wd`.

Session (`src/lib/session/session.ts`) : l’objet `wind` actuel exige `speedKmh` et
`directionDeg`. Ajouter des clés obligatoires ferait rejeter les sessions déjà
écrites. Valibot `1.5.0`, `object()` : une clé absente n’est remplie que si
l’entrée est `optional` **avec** défaut ; sans défaut, la clé est omise ; si elle
est requise, c’est une erreur. Les docs valibot.dev disent la même chose
(`v.optional(wrapped, default)`). Donc, dans l’objet `wind` :

```text
exposedWidth: optional(finite, 0.50)
endpointAttenuation: optional(finite, 0)
```

Noms anglais de code proposés : `exposedWidth`, `endpointAttenuation`. Pas `q`,
pas `s`, pas `sigma`. Le glossaire n’a pas encore « profil du vent », « étendue de
la zone exposée » ni « atténuation aux extrémités ». À ajouter quand le terme est
retenu ; en attendant, utiliser les mots du mainteneur. Éviter : facteur Q comme
grandeur, gaussienne, rafale, souffle, enveloppe conservative.

Jusqu’à ce que #127 consomme `U(ξ)`, les consommateurs actuels (dynamique,
Banane, verdict) continuent de lire le scalaire `V`. Brancher le profil dans la
Banane ou la descente avant le moteur spatial contredirait le correctif du
2026-11-10. L’aperçu peut tracer `U` ; il ne doit pas être présenté comme déjà
appliqué à une charge.

## Alternatives

Aucune n’est une prévision. Toutes respectent le maximum central, la résiduelle
aux ancrages, la symétrie, `α = 0 ⇒ U ≡ V`, et une largeur monotone inversible
à la main. `x = 2ξ − 1 ∈ [−1 ; 1]`.

### 2 — Puissance de cosinus, si le plateau est refusé

Une seule expression, pic étroit possible, pente nulle aux ancrages pour tout
paramètre :

```text
φ(ξ) = cos²( (π/2) · |2ξ − 1|^p ) ,   p > 0
```

Largeur affichée `w` = fraction de la portée où l’excès sur la vitesse résiduelle
vaut au moins la moitié de l’excès central (largeur à mi-excès). Pas un plateau :
sauf au milieu, la vitesse n’est pas exactement `V`.

```text
w = 2^(−1/p)
p = ln(2) / ln(1/w)
```

`w = 1/2` donne `p = 1` et `φ(ξ) = cos²( π (ξ − 1/2) )`, identique au cas `λ = 0`
de la courbe préférée. Contrôle : `ξ = 1/4` ⇒ `φ = 1/2`.

| | Préférée | Celle-ci |
| --- | --- | --- |
| Phrase utilisateur | « le milieu de la portée, sur `λ`, est à la vitesse saisie » | « sur `w` de la portée, l’excès a encore au moins sa moitié » |
| Pic plus étroit que la moitié | non (`λ = 0` a déjà une mi-excès de `1/2`) | oui, `w` jusqu’à une borne basse |
| Plat exact | oui | non, seulement à la limite `w → 1` |
| Pente aux ancrages | nulle | nulle |
| Régularité au milieu | `C∞` si `λ = 0`, sinon `C¹` | `C∞` si `p` entier pair ou `p = 1` ; `C¹` au milieu si `p > 1/2` (`w > 1/4`) ; en dessous, la dérivée au milieu n’est pas bornée |

Bornes pratiques si cette courbe était retenue : `w ∈ [0,10 ; 0,95]`. En dessous,
le sommet n’est plus `C¹`. Au-dessus, la descente se tasse sur les ancrages ; la
pente reste nulle aux bords, mais raide juste avant. Défaut proposé : `w = 0,50`.
Même `α`, mêmes clés possibles, en changeant le sens de `ww` : il faudrait alors
le dire dans le schéma, parce que `0,50` ne désignerait plus un plateau.

### 3 — Mêmes plateau et largeur, épaulement `C²`

Si le saut de courbure de la courbe préférée est refusé, garder `λ` et remplacer
seulement l’épaulement par l’interpolant de Perlin 2002, lu dans le PDF cité :
`6t⁵ − 15t⁴ + 10t³`, dérivées première et seconde nulles en `0` et en `1`. Le code
de référence du même auteur, `fade(t) = t³ (t (6t − 15) + 10)`, est le même
polynôme.

```text
si δ ≤ h :  φ = 1
sinon :     t = (δ − h) / (1/2 − h)
            φ = 1 − (6t⁵ − 15t⁴ + 10t³)
```

`fade(1/2) = 1/2` exactement (`8/16`). La largeur à mi-excès reste `(1 + λ) / 2`.
Les cas de contrôle du plateau (`ξ = 1/4` et `1/2` à `λ = 1/2`) sont identiques.
Seul le milieu d’épaulement diffère : il vaut encore `1/2`, mais la forme entre
les raccords n’est pas le cosinus. Pente maximale de `fade` : `30 t² (1 − t)²`,
soit `1,875` en `t = 1/2`. Donc `|dφ/dξ|` max = `3,75 / (1 − λ)`, plus doux que
`π / (1 − λ)`.

Même borne `λ ≤ 0,90`, mêmes dégénérescences, même sérialisation. C’est un
changement d’épaulement, pas un autre sens du mot « étendue ».

### Écartées

- **Gaussienne**, renormalisée ou non. Le mainteneur n’en a pas adopté. Sans
  renormalisation elle ne vaut pas exactement la résiduelle aux ancrages. Avec
  renormalisation, l’inverse largeur → écart-type n’est pas fermé : les tests du
  dépôt exigent une valeur attendue calculée à la main, pas une inversion
  numérique de la fonction sous test. Ce n’est pas un jugement météorologique.
- **`(1 − x²)^n`.** Inverse fermé, `n = −ln 2 / ln(1 − w²)`, `w = √(1 − 2^(−1/n))`.
  Pente d’extrémité nulle seulement si `n > 1`, c’est-à-dire `w < √(1/2) ≈ 0,707`.
  Au-delà, la pente aux ancrages diverge. Justement le cas « large zone centrale,
  bords abrités » que la poignée doit pouvoir décrire. Vérifié : à `w = 0,90`,
  `n ≈ 0,42`, dérivée d’extrémité non bornée à l’approche du bord.
- **Amplitude signée, Q d’égaliseur, interpolation entre les deux ancrages.**
  Contredisent le commentaire du 2026-11-10 ou la revue vallée déjà archivée.

## Tests d’acceptation

Doctrine : `CONTRIBUTING.md` et `docs/conventions/testing.md`. Valeurs attendues
calculées à la main ci-dessus, pas relues sur la sortie du code, pas recopiées
d’un rapport de `docs/references/` comme fixture physique. Ce ne sont pas des
fixtures §15. Tolérance : égalité exacte sur les branches algébriques (`α = 0`,
intérieur du plateau) ; écart absolu `< 1×10⁻¹²` sur un `cos` évalué en machine
(`cos(π/2)` n’est pas un zéro binaire). La pente nulle se vérifie par différence
finie contre `0`, pas contre une dérivée recalculée par le code.

Profil préféré, fonction pure, sans DOM (Vitest est `node`, sans test de
composant) :

1. `λ = 1/2` : `φ(0) = φ(1) = 0`, `φ(1/8) = φ(7/8) = 1/2`, `φ(1/4) = φ(3/4) = 1`,
   `φ(1/2) = 1`.
2. `V = 40`, `α = 1/2`, `λ = 1/2` : `U(1/2) = 40`, `U(0) = 20`, `U(1/8) = 30`.
3. `α = 0`, `V = 40`, `λ ∈ {0 ; 0,50 ; 0,90}` : `U(0) = U(1/8) = U(1/2) = 40`.
4. Symétrie : `φ(ξ) = φ(1 − ξ)` pour `λ = 0`, `λ = 1/2`, `λ = 0,90`, sur les
   abscisses de la table. Pas un balayage dont l’espérance serait le code lui-même.
5. `λ = 0`, `ξ = 1/4` : `φ = 1/2`. C’est aussi le contrôle de l’alternative 2 à
   `p = 1`, si elle est codée.
6. Pente : à `λ = 1/2`, le quotient `(φ(10⁻⁴) − φ(0)) / 10⁻⁴` est inférieur à
   `0,01`. La dérivée analytique en `0` est `0` ; le quotient est d’ordre
   `4 π² · 10⁻⁴ ≈ 0,004` parce que la dérivée seconde d’épaulement vaut `π²/2` et
   `dt/dξ = −4`. La borne `0,01` vient de ce développement, pas d’un essai.
7. Hors domaine : `λ = 1`, `λ = −0,01`, `α = 1,01`, `α = −0,01` ne sont pas
   évalués comme un vent uniforme. Le lien les conserve ; la porte les refuse.
8. `V = 0`, `α = 1`, `λ = 0,90` : `U = 0` sur les abscisses de la table. `α` et
   `λ` lus ensuite sont inchangés.
9. Indépendance : changer `λ` ne change pas `α` ni `V`. « Vent uniforme » met `α`
   à `0` et laisse `λ`, `V` et `directionDeg`. Il ne produit pas le Vent nul
   `{ speedKmh: 0, directionDeg: 0 }`.

Sérialisation, sur le codec, pas sur un navigateur :

10. Lien sans `ww` ni `wa` : `α = 0`, `λ = 0,50`, et le lien canonique ne gagne
    pas ces clés. Les liens canoniques existants (`ws` / `wd` seuls, vent absent)
    restent byte à byte identiques.
11. `wa=0.5` sans `ww` : `α = 1/2`, `λ = 0,50`. `ww=0.25` sans `wa` : `λ = 1/4`,
    `α = 0`, clé `wa` absente à la réécriture.
12. `wa=1.5`, `ww=-0.2` : valeurs conservées, formulaire en erreur, pas de clamp
    dans `schema.ts`.
13. Session ancienne `{ speedKmh, directionDeg }` sans les nouvelles clés : restaurée,
    vitesse et direction intactes, `α = 0`, `λ = 0,50`. Pas de session jetée.
14. Un geste de direction qui réécrit le Vent ne remet pas `λ` ni `α` à zéro.
    L’inverse : un geste de profil ne change ni `speedKmh` ni `directionDeg`.
15. Le même `(λ, α)` donne le même offset d’écran de la poignée de profil pour
    `NORTH_UP` et pour une référence de niveau. La poignée de direction, elle,
    tourne : le test doit les distinguer.
16. Tant que #127 ne consomme pas `U(ξ)`, un scénario avec `α ≠ 0` ne change ni
    la Banane, ni la descente, ni le verdict par rapport au même `V` uniforme.
    C’est un test de non-branchement, pas un test de solveur.

Alternative 3, seulement si elle est codée : `fade(0) = 0`, `fade(1) = 1`,
`fade(1/2) = 1/2`, et les lignes 1–3 ci-dessus aux raccords. Le milieu
d’épaulement vaut aussi `1/2`, donc la ligne `U(1/8) = 30` ne distingue pas les
deux épaulements. Pour les distinguer : à `λ = 1/2`, l’épaulement gauche va de
`ξ = 0` (`t = 1`) à `ξ = 1/4` (`t = 0`), avec `t = 1 − 4ξ`. Donc `t = 1/4` est
`ξ = 3/16` (côté B : `13/16`). Cosinus : `φ = cos²(π/8) = (1 + cos(π/4)) / 2 = (2 + √2) / 4`.
Quintique : `φ = 1 − fade(1/4) = 1 − (6/1024 − 15/256 + 10/64) = 1 − (6 − 60 + 160) / 1024 = 1 − 106/1024 = 918/1024 = 459/512`.
Attendu cosinus `(2 + √2) / 4 ≈ 0,8536` ; attendu quintique `459/512 = 0,896484375`
exactement. Un test qui accepterait les deux ne teste pas l’épaulement.

## Questions mainteneur

Par priorité. Le reste de la note est applicable si les réponses sont « oui ».

1. **Sens vertical.** Confirmer : haut de l’écran = atténuation plus forte, bas =
   vent uniforme. L’autre sens (haut = vitesse résiduelle plus haute) alignerait
   le geste sur l’axe vertical de l’aperçu, mais contredirait « vertical =
   atténuation » lu comme « vers le haut, la grandeur nommée augmente ».
2. **Unité de largeur.** Confirmer la fraction de la portée, affichée en pourcent,
   mètres seulement en lecture `λ · L`. Des mètres stockés changeraient la
   sérialisation et le comportement quand `L` change.
3. **Borne `0,90`.** Confirmer, ou donner une autre borne dans `(0 ; 1)`. À
   `0,90`, chaque épaulement fait `5 %` de `L` et la pente max vaut `10π / L`.
   `1` est impossible pour un plateau avec résiduelle différente.
4. **Défaut de largeur `50 %`.** Confirmer, ou préférer `0 %` (cosinus pur jusqu’au
   premier élargissement). Sans effet tant que l’atténuation reste nulle.

Si le plateau est refusé : prendre l’alternative 2 et redéfinir `ww` comme largeur
à mi-excès. Si seule la courbure est refusée : alternative 3, mêmes clés, même
`ww`.

## Sources lues

| Source | Ce qui a été lu | Usage |
| --- | --- | --- |
| Issue #120, corps et 5 commentaires ; #127, corps et 4 commentaires | `gh issue view`, 2026-11-10. Dernier commentaire de chaque : 2026-11-10T07:40:14Z et 07:40:13Z | Verrou. Le plus récent prévaut. |
| Issue #9, corps et son unique commentaire (2026-11-06) | `gh issue view 9` | Pas de profil le long de la portée. Charge uniforme pour la banane. |
| Harris, F. J. (1978), *Proc. IEEE* 66(1), 51–83 | PDF scanné, 33 pages, https://web.mit.edu/xiphmont/Public/windows.pdf , OCR Acrobat peu lisible | Noms seulement : Hanning = cosinus carré / raised cosine ; section 41, fenêtre de Tukey « often called the cosine-tapered window », lobe de cosinus convolué à un rectangle pour rejoindre zéro aux bords sans abaisser le palier. Équations du scan non citées. |
| Perlin, K. (2002), *Improving Noise* | PDF intégral, 2 pages, https://mrl.cs.nyu.edu/~perlin/paper445.pdf ; implémentation https://cs.nyu.edu/~perlin/noise/ | Alternative 3. Phrase lue : « 3t²−2t³ is replaced by 6t⁵−15t⁴+10t³, which has zero first and second derivatives at both t=0 and t=1. » `fade` lu sur la page de référence. |
| W3C, Pointer Events Level 3, Recommendation, 30 juin 2026 | https://www.w3.org/TR/2026/REC-pointerevents3-20260630/ , paragraphe `setPointerCapture` | Capture du pointeur, déjà le geste de la rose. |
| W3C WAI, Understanding SC 2.5.7 Dragging Movements | https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html , lu le 2026-11-10 | Champ texte = alternative au glisser ; clavier = critère séparé (2.1.1). |
| Valibot `1.5.0` | Docs via Context7, https://valibot.dev/api/optional.md et https://valibot.dev/guides/optionals.md ; source installée `node_modules/valibot/dist/index.mjs`, `optional` et `object`. L’index Context7 du tag `v1.5.0` n’était pas prêt (deux tentatives). | Clé absente remplie seulement si `optional` a un défaut. |
| Dépôt, fichiers cités | `wind-rose.ts`, `wind-rose.tsx`, `src/lib/sim/wind.ts`, `src/lib/url/schema.ts`, `src/lib/url/scenario.ts`, `src/lib/session/session.ts`, `src/lib/scenario/types.ts`, `src/lib/rail/fields.ts`, `src/lib/format/quantity.ts`, `src/components/rail/controls.tsx`, `GLOSSARY.md`, `docs/simulation-theory.md` §1, `docs/conventions/testing.md`, `docs/conventions/ui.md`, revue vallée et note d’équilibre spatial | Contrats existants. Pas une relecture de la littérature de vallée. |

Contrôles numériques de cette note (script jetable, pas un test du dépôt) : table
du plateau, pente max `π/(1−λ)` retrouvée par différences finies à `λ = 0`,
`0,5`, `0,8`, `0,9`, `0,95` ; inverse de la puissance de cosinus et du polynôme
`(1−x²)^n` ; `fade(1/2) = 1/2`. Ils confirment les dérivations. Ils ne sont pas
des mesures de tyrolienne.

## Hors de cette note

Aérodynamique, diamètre, ellipsoïde, solveur spatial, contrat de vue au-delà du
comportement de poignée décrit ici, et tout affichage de sûreté : autres travaux.
Cette note ne rend pas #120 prête pour un agent d’implémentation tant que les
quatre questions n’ont pas de réponse. Elle rend la courbe et le codec
implémentables dès que ces réponses sont les recommandations ci-dessus.
