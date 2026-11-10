# Contrat de suivi — profil du vent (#120)

> **Contrat publié :** [brief #120](https://github.com/fuzoh/simu-tyro/issues/120#issuecomment-6775389352).
> Q34 tranche l’activation coordonnée. Ordre de développement #120 → #127 → #118,
> sans profil présenté comme appliqué avant consommation physique effective. Voir
> [décisions consolidées](triage-decisions-consolidated.md). Les réserves historiques
> d’activation de cette note ne sont plus une question ouverte pour le mainteneur.

Note du 2026-11-10. **Contrat d'implémentation proposé, pas une prévision de vallée, pas une
charge, pas un coefficient, pas un facteur de sécurité.** Elle fixe la courbe que Q29 laissait
ouverte, et le branchement URL / Session / Rose des vents. Elle ne remplace pas
`docs/simulation-theory.md`. Aucun fichier de code n'a été modifié. Pas d'écriture GitHub, pas
de commit.

Les contrôles numériques cités plus bas viennent d'un script jetable, `/tmp/wind-profile-check.mjs`,
hors dépôt. Ils vérifient les dérivations. Ils ne sont pas des mesures de tyrolienne, et ils ne
sont pas des fixtures à recopier.

## Ce qui prime

1. Commentaires de [#120](https://github.com/fuzoh/simu-tyro/issues/120), derniers en date :
   Q25 (2026-11-10T16:51:33Z), Q27 et Q28 (16:53:38Z), Q29 (16:55:46Z). Ils priment sur le corps
   de l'issue, sur le commentaire du 2026-11-10T07:40:14Z là où ils le précisent, et sur les
   notes de préparation.
2. Commentaire de [#127](https://github.com/fuzoh/simu-tyro/issues/127) du 2026-11-10T07:40:13Z
   pour le champ : un seul Vent, direction horizontale commune, profil ancré à l'abscisse
   horizontale A–B, identique à toute hauteur et tout écart latéral, même champ pour la ligne
   et le passager, non advecté par la déformation. Les paramètres modifient la vitesse, pas la
   force. Cette commande n'alimente pas la statique actuelle.
3. Cette note, pour la formule et le codec, là où les notes de préparation contredisent Q25–Q29.
4. Le code au commit `f0da795` pour le comportement actuel. L'arbre de travail contient d'autres
   fichiers non commités (`docs/simulation-theory.md`, des suivis voisins, `experiments/`) :
   ils n'ont pas été édités ici et ne sont pas une source de cette courbe.

## 1. Déjà tranché — ne pas rouvrir

| Point | Décision | Conséquence |
| --- | --- | --- |
| Nature | Scénario utilisateur prescrit. Pas un vent de vallée, pas une enveloppe conservative, pas une reconstruction depuis deux ancrages. | Aucune phrase d'interface ne dit « vallée », « rafale », « souffle », « prévision ». |
| Forme | Q29 : cloche symétrique, lisse, sans plateau central parfaitement uniforme. Maximum au milieu, vitesse résiduelle exacte aux ancrages, tangente horizontale au milieu et aux deux ancrages, sur toute la plage 10–90 %. | Le plateau de Q1 / Q6 dans `agent-readiness-decisions.md` est périmé. |
| Largeur | Q25 : pourcentage de portée, entre les deux points où la vitesse vaut `U_ancrages + (U_centre − U_ancrages) / 2`. Exemple mainteneur : centre 40 km/h, ancrages 10 km/h, largeur lue à 25 km/h. | Ce n'est pas une longueur de plateau, pas un écart-type, pas un Q, pas des mètres stockés. |
| Bornes et défauts | Q28 : largeur 10–90 % de portée, pas 1 point de pourcentage, défaut 50 %. Atténuation 0–100 %, défaut 0. Vent uniforme par défaut. | `0 %` de largeur n'est pas dans le domaine. `100 %` de largeur non plus. |
| Atténuation | Q27 : 0 % = vent uniforme ; 100 % = vitesse nulle aux ancrages, hypothèse saisie. Le milieu reste à la vitesse saisie. L'atténuation ne multiplie pas une force. | Vitesse aux ancrages = vitesse centrale × (1 − atténuation). |
| Axes | Q27 : poignée à droite = zone exposée plus large ; poignée en haut = atténuation plus forte. Axes d'écran fixes, indépendants de la direction du vent. Diagonale = les deux. | Pas de rotation avec la rose. Pas de contrainte radiale. |
| Largeur sans effet | Atténuation nulle : la largeur n'a aucun effet physique, et elle est conservée. « Vent uniforme » remet l'atténuation à zéro, pas la largeur, pas la vitesse, pas la direction. | Distinct de « Pas de vent » (vitesse 0, direction 0). |
| Champ | Abscisse horizontale A–B. Identique à toute hauteur et tout écart latéral. Ligne et passager lisent le même champ local. La déformation ne déplace pas la zone. | Pas l'abscisse matérielle `s`, pas l'arc `σ`, pas la corde `√(L²+h²)`. |
| Consommation | La commande alimente le futur moteur #127. La statique actuelle ne reçoit pas le vent. | Tant que #127 ne consomme pas `U`, Banane, descente et verdict lisent le scalaire déjà codé. |
| Affichage | Nom visible « profil du vent ». Aperçu A–milieu–B : vitesse centrale, vitesse aux ancrages, largeur. Champs numériques. Pas de bandeau supplémentaire. Le facteur Q n'est qu'une analogie de manipulation. | L'aide du champ porte la limite. |

Q29 redéfinit le mot : « zone exposée » est la largeur à mi-atténuation, pas une zone aux
frontières nettes.

## 2. Notes périmées sur la courbe

Ne pas implémenter ces passages. Ils sont antérieurs à Q29, ou ils recommandent une courbe que
Q29 refuse.

| Passage | Ce qu'il dit encore | Ce qui prime |
| --- | --- | --- |
| [agent-readiness-decisions.md](agent-readiness-decisions.md) Q1, Q6 | Plateau central ; largeur = longueur du plateau ; épaulements en cosinus relevé | Q29, Q25, Q28 |
| [agent-readiness-wind-profile.md](agent-readiness-wind-profile.md), courbe préférée | Même plateau, `λ ∈ [0 ; 0,90]`, `ww` / `wa` en fractions | Cette note. Les clés `ww` / `wa` restent ; l'unité dans l'URL change (pourcent entier affiché, pas fraction). |
| Même note, alternative 2 | `cos²((π/2) \|2ξ−1\|^p)` | Écartée ici : tangente centrale non horizontale sur 10–25 %. Démonstration au §4. |
| Même note, questions 1–4 | Sens vertical, unité, borne 0,90, défaut 50 % encore ouverts | Q27 et Q28 ont répondu. La borne basse est 10 %, pas 0 %. |
| [GLOSSARY.md](../../../GLOSSARY.md) « Zone centrale exposée » | Plateau où la vitesse reste au maximum | Contredit Q29. Texte de remplacement au §7. Ne pas l'imprimer. |
| [descent-views-contract-followup.md](descent-views-contract-followup.md) §7 point 4 | « Aucune formule n'est dans le dépôt » | Cette note est cette formule. Le fichier voisin n'a pas été édité : il est hors du seul fichier autorisé ici. |

Le reste de la note de préparation (non-branchement avant #127, absence qui a un sens, Session
additive, poignée qui n'écrit que ses champs, pas de `v` incrémenté) est repris ci-dessous, corrigé
où Q28 change les bornes.

## 3. Formule retenue

La plus simple famille explicite qui tient toutes les contraintes acceptées sur toute la plage
10–90 %. Une famille plus plate, de classe C², est au §5 : ce n'est pas le contrat, et elle ne
se substitue pas en silence.

### 3.1 Coordonnée

`docs/simulation-theory.md` §2 : ancrage A en `(0, 0)`, ancrage B en `(L, h)`, `x` horizontal
vers B, `z` vers le haut. `L` est la portée horizontale, la même que `x_D` et que l'abscisse du
profil de terrain. `s` est l'abscisse matérielle non étirée, `σ` la longueur d'arc étirée. Ne
pas les réutiliser.

Pour un point de l'espace, tant que `L > 0` :

```text
ξ = x / L
χ = |2ξ − 1|
```

`ξ = 0` en A, `ξ = 1` en B, `ξ = 1/2` au milieu. `χ = 0` au milieu, `χ = 1` aux ancrages.
La hauteur `z` et l'écart latéral `y` n'entrent pas. Un point de la ligne déformée et le
passager qui a le même `x` lisent la même vitesse.

`x` hors de `[0 ; L]` : ramener à l'extrémité la plus proche avant évaluation (`ξ = 0` si
`x ≤ 0`, `ξ = 1` si `x ≥ L`). Même idée que `zGroundAt`, qui tient les bouts
(`src/lib/sim/terrain.ts`). Extension définie pour une requête numérique, pas un vent au-delà
des ancrages. La nommer dans le commentaire de la fonction. Q25–Q29 ne la redisent pas ; le
suivi descente la traite déjà comme l'extension écrite, pas comme une question bloquante.

`L ≤ 0`, ou A/B sans gisement : le profil n'est pas évalué et n'est pas appliqué. Les valeurs
saisies restent, comme le Vent actuel (`GLOSSARY.md`, Vent ; `windBearing` dans
`src/lib/rail/gates.ts`). Ne pas diviser par `L`.

### 3.2 Paramètres

Nombres que le champ affiche, pas des fractions cachées. Le grain d'affichage est le pas de
1 point de pourcentage, comme la rose écrit ce qu'un champ peut tenir
(`src/lib/map/wind-rose.ts`).

| Grandeur | Symbole ci-dessous | État et URL | Défaut | Domaine légal |
| --- | --- | --- | --- | --- |
| Vitesse centrale | `V` | `speedKmh`, km/h, déjà | `0` | `≥ 0`, déjà |
| Largeur de la zone exposée | `w` | `exposedWidthPercent` | `50` | `[10 ; 90]` |
| Atténuation aux ancrages | `a` | `anchorAttenuationPercent` | `0` | `[0 ; 100]` |

Fractions utilisées seulement dans l'évaluateur :

```text
λ = w / 100
α = a / 100
p = ln(2) / ln(1/λ)
```

`p` est l'unique exposant qui place le demi-écart en `χ = λ`. Inverse : `λ = 2^(−1/p)`.
Cas exacts utiles : `w = 50` donne `p = 1` ; `w = 25` donne `p = 1/2`.

Le pas de 1 point est le grain de la poignée et du champ (`decimals: 0`, `roundToDisplay`).
Ce n'est pas un trou du domaine. Un lien qui porte `ww=50.5`, fini et dans `[10 ; 90]`, est
légal : la formule s'évalue, l'état garde `50.5` jusqu'à une saisie, le champ affiche l'entier
arrondi. Même discipline que `ws=25.4` aujourd'hui (`scenarioToSearch` ne réarrondit pas ;
ADR-0001). Hors intervalle : conservé, porte refusée, formule non appelée. Pas de clamp.

### 3.3 Forme

```text
h(t) = sin²(π t / 2) = (1 − cos(π t)) / 2
φ(ξ) = cos²( (π/2) · h(χ^p) )
U(ξ) = V · ( (1 − α) + α · φ(ξ) )
```

`U` est en km/h, horizontale, dans la direction déjà portée par `directionDeg`. La conversion
m/s est `kmhToMs` (`src/lib/sim/wind.ts`), appliquée à `U(ξ)` par le consommateur, pas une
seconde loi dans `φ`. Ne pas multiplier une force par `φ` ni par `φ²`. Ne pas remplacer `U`
par sa moyenne sur la portée.

`h` est strictement croissante sur `[0 ; 1]`, `h(0) = 0`, `h(1) = 1`, `h(1/2) = 1/2`,
`h'(0) = h'(1) = 0`. Donc `h(χ^p)` vaut `1/2` exactement quand `χ^p = 1/2`, c'est-à-dire
`χ = λ`. Et `cos²(π/4) = 1/2`. La largeur affichée est la largeur mesurée, pas une
approximation.

Noms de code : `exposedWidthPercent`, `anchorAttenuationPercent`. Pas `q`, pas `s`, pas
`sigma`, pas `lambda` dans l'état. `φ` et `p` restent locaux à l'évaluateur.

Fonction pure proposée, `src/lib/sim/wind-profile.ts`, sans DOM, sans lecture du Scénario :

```text
prescribedWindKmh({ x, span, speedKmh, exposedWidthPercent, anchorAttenuationPercent }) → km/h
```

Domaine : `span > 0`, largeur dans `[10 ; 90]`, atténuation dans `[0 ; 100]`, vitesse finie.
Hors domaine : erreur de programme, pas un vent uniforme de repli. La porte est le refus
utilisateur. Les tests n'appellent pas la fonction hors domaine.

## 4. Vérification analytique

Tout ce paragraphe se démontre sans exécuter la fonction. `χ ∈ [0 ; 1]`, `p > 0`,
`λ ∈ (0 ; 1)`.

**Valeurs.** `φ(1/2) = cos²(0) = 1`. `φ(0) = φ(1) = cos²(π/2) = 0` en arithmétique réelle.
`φ` ne dépend que de `χ`, donc `φ(ξ) = φ(1 − ξ)`. `φ(χ) = 1` seulement en `χ = 0` : `h(t) = 0`
sur `[0 ; 1]` seulement en `t = 0`, et `χ^p = 0` seulement en `χ = 0`. Le maximum n'est pas
un plateau.

**Demi-écart.** `χ = λ` ⇒ `χ^p = 1/2` ⇒ `h = 1/2` ⇒ `φ = 1/2`. Comme `φ` décroît strictement
de 1 à 0 (ci-dessous), ce `χ` est le seul. Les deux points sont `ξ = (1 ± λ) / 2`. Leur écart
est `λ`, soit `w` % de la portée. Avec le seuil du mainteneur :

```text
U_seuil = V (1 − α) + (V − V (1 − α)) / 2 = V (1 − α/2)
U(χ = λ) = V ((1 − α) + α/2) = V (1 − α/2)
```

Centre 40 km/h et ancrages 10 km/h : `1 − α = 1/4`, `α = 3/4`, seuil `40 × 5/8 = 25`. C'est
l'exemple de Q25, pas une calibration.

**Décroissance.** Sur `(0 ; 1)`, `χ^p` est strictement croissante (`p > 0`), `h` aussi
(`h'(t) = (π/2) sin(π t) > 0`), et `cos²(π t / 2)` est strictement décroissante sur `[0 ; 1]`.
Donc `φ` est strictement décroissante en `χ`. Pas de palier, pas d'oscillation.

**Tangente aux ancrages.** `dφ/dχ = −sin(π g) · (π/2) · g'`, avec `g = h(χ^p)`. En `χ = 1`,
`g = 1`, `sin(π) = 0`, et `g'(1) = h'(1) · p = 0`. La dérivée est nulle, et `χ^p` est C∞ au
voisinage de 1 pour tout `p > 0`. La tangente horizontale aux ancrages ne dépend pas de la
largeur.

**Tangente au milieu, sur toute la plage.** Près de `χ = 0`, `|sin u| ≤ |u|` donne
`h(u) ≤ (π u / 2)²`, puis `1 − φ ≤ (π/2)^6 χ^{4p}`. La dérivée se comporte en `χ^{4p − 1}`.
Elle tend vers 0 dès que `4p − 1 > 0`, soit `p > 1/4`, soit `λ > 2^{−4} = 1/16`.

La plage légale est au-dessus : `λ ≥ 1/10 > 1/16`, donc `ln(1/λ) ≤ ln 10 < ln 16 = 4 ln 2`,
donc `p = ln 2 / ln(1/λ) > 1/4`. L'inégalité est stricte, y compris à 10 %. La tangente au
milieu est horizontale sur toute la plage acceptée.

**Ce que « lisse » ne donne pas.** `1 − φ ∼ χ^{4p}` au milieu. La dérivée seconde tend vers 0
si `4p − 2 > 0`, soit `p > 1/2`, soit `λ > 1/4`. Donc :

- largeurs 10 à 24 % : `φ'` continue et nulle au milieu, `φ''` non bornée au milieu ;
- largeur 25 % : `p = 1/2` exactement, `φ''` tend vers une limite finie ;
- largeurs 26 à 90 % : `φ'' → 0` au milieu.

Q29 demande la tangente horizontale, pas une dérivée seconde bornée. Le solveur de #127 ne
doit pas supposer `φ''` bornée sur tout le domaine légal. Le remplacement préparé est au §5 ;
il ne fait pas partie de ce contrat.

**Effet de chaque axe.** `∂U/∂α = V (φ − 1) ≤ 0`, nul seulement au milieu. Monter
l'atténuation baisse la vitesse partout sauf au milieu, qui reste `V`. Élargir augmente `p`
(`ln(1/λ)` diminue), donc diminue `χ^p` pour `χ ∈ (0 ; 1)`, donc augmente `φ`. La courbe
monte point par point entre les ancrages, strictement sur `(0 ; 1)`. Droite = plus large, et
la forme suit.

**Dégénérescences, toutes définies.**

1. `α = 0` : `U ≡ V`, quel que soit `w`. En flottant, `0 · φ = 0` : égalité exacte, pas une
   tolérance. `w` reste éditable, stocké, visible comme marque mémorisée. La courbe dessinée
   est plate. Pas un creux.
2. `V = 0` : `U ≡ 0`. Direction et profil restent saisis.
3. `α = 1` : vitesse nulle aux ancrages, `V` au milieu, `V/2` aux points de demi-écart. Le
   vecteur local aux ancrages est le vecteur nul. `directionDeg` reste la direction partout où
   `U ≠ 0`. Pas une inversion, pas une recirculation, pas un abri prédit.
4. `w = 10` et `w = 90` : dans le domaine. Pente bornée (φ' continue sur un compact). Pas de
   singularité de pente.
5. `w` ou `a` hors intervalle, ou non fini : pas dans le domaine. Le lien les transporte
   (ADR-0001). La porte les refuse. Ne pas les réparer. Ne pas traiter `w = 100` comme un vent
   uniforme : cela effacerait l'atténuation.
6. `V`, `a` et `w` sont indépendants. Changer `V` met le profil à l'échelle. Changer la
   direction ne tourne ni `φ` ni la poignée de profil.

Borne de contrôle, dérivée, pas ajustée sur une sortie. Au milieu, pas `h` en `ξ` :

```text
|φ(1/2 + h) − 1| / |h| ≤ (π/2)^6 · 2^{4p} · |h|^{4p − 1}
```

À `λ = 1/10`, `p = ln 2 / ln 10`, le membre de droite vaut environ 5,28 pour `|h| = 10^{−4}`
et environ 3,30 pour `|h| = 10^{−5}`. Le test compare le quotient à cette expression, pas à un
résidu mesuré. Aux ancrages, par valeur moyenne, pour `δ = 1 − χ ≤ 1/2` :

```text
φ ≤ (π/2)^6 (1 − χ^p)^4 ,   1 − χ^p ≤ p δ
```

À 90 %, pas `10^{−3}` en `ξ` (`δ = 2 × 10^{−3}`), cela majore le quotient en `ξ` par
`(π/2)^6 · 16 · p^4 · 10^{−9} ≈ 4,5 × 10^{−4}`. Un plafond de test `10^{−3}` est au-dessus de
cette majoration, pas calé sur une exécution.

## 5. Familles écartées

### 5.1 Plateau et cosinus relevé

La courbe préférée de `agent-readiness-wind-profile.md`. Elle a un intervalle où `φ = 1`.
Q29 l'interdit (« sans plateau central parfaitement uniforme »). Ne pas la coder, même avec
les mêmes clés.

### 5.2 Puissance de cosinus seule

```text
φ(χ) = cos²( (π/2) · χ^p ) ,   p = ln 2 / ln(1/λ)
```

Même inverse de largeur, mêmes ancrages, tangente nulle aux ancrages pour tout `p > 0`. Au
milieu, la dérivée se comporte en `χ^{2p − 1}`. Elle tend vers 0 seulement si `p > 1/2`, soit
`λ > 1/4`. Sur 10–25 %, la tangente centrale n'est pas horizontale. À 10 %, `p ≈ 0,301 < 1/2` :
le quotient au milieu grandit quand le pas diminue (observation du script : environ −57, −146,
−365, −914 pour des pas `10^{−3}` à `10^{−6}` en `ξ`). Q29 exige la tangente sur toute la
plage. Écartée.

C'est le cas `p = 1` de cette famille, et seulement à 50 %, qui coïncide avec un cosinus
simple. À 50 % les deux formules diffèrent dès qu'on quitte le milieu, le demi-écart et les
ancrages. Distingueur, `w = 50`, `χ = 1/4` (`ξ = 3/8` ou `5/8`) :

```text
retenue :  cos²( π (2 − √2) / 8 )
écartée :  cos²(π/8) = (2 + √2) / 4
```

`h(1/4) = sin²(π/8) = (2 − √2)/4`, puis `(π/2) · h(1/4) = π(2 − √2)/8`. Les deux expressions
ne sont pas égales. Un test qui accepterait les deux ne teste pas la formule.

### 5.3 `(1 − χ²)^n`

`n = −ln 2 / ln(1 − λ²)` place le demi-écart. Tangente centrale nulle. Tangente aux ancrages
nulle seulement si `n > 1`, soit `λ < √(1/2) ≈ 0,707`. À 90 %, `n ≈ 0,417 < 1` : la dérivée
à l'approche de l'ancrage n'est pas bornée (observation : quotient en `χ` environ 286 à
`10^{−4}` de l'ancrage, environ 4 × 10³ à `10^{−6}`). Justement le cas « large zone
exposée » que la poignée doit pouvoir décrire. Écartée, comme la note de préparation l'avait
déjà vu pour une autre définition de largeur.

### 5.4 Deux nids, ou quintique — préparé, non retenu

```text
φ = cos²( (π/2) · h(h(χ^p)) )
```

Même `p`, mêmes valeurs en `0`, `λ`, `1`, tangentes horizontales, et `1 − φ ∼ χ^{8p}`. Comme
`8 · (ln 2 / ln 10) − 2 > 0`, `φ'' → 0` au milieu y compris à 10 %. Classe C² sur toute la
plage légale. Ce n'est pas la formule retenue : Q29 ne demande pas cette régularité, et
l'épaule change. Écart maximal observé entre les deux `φ`, à largeur fixée, environ 0,105
(environ 4 km/h sur un écart centre/ancrages de 40 km/h). Le nid double est plus plat, plus
proche d'un plateau numérique, sans en être un.

Le quintique `10t³ − 15t⁴ + 6t⁵` composé comme `h` ne suffit pas non plus à borner `φ''` à
10 % (`m = 3`, exposant `6p − 2 < 0`). Le septique `35t⁴ − 84t⁵ + 70t⁶ − 20t⁷` puis un
`cos²` est de la même classe que le nid double, avec un écart observé d'environ 0,028 contre
la formule à deux nids. Ni l'un ni l'autre n'est le contrat.

Si le solveur de #127 exige une dérivée seconde bornée, le remplacement est le nid double,
mêmes clés, même `p`, mêmes tests en `0`, `λ` et `1`. Le distingueur du §5.2 change : il
faudrait alors `cos²( (π/2) · sin²( π(2−√2)/8 ) )`. Ce remplacement change la courbe visible.
Ne pas le faire dans le brief de #120, et ne pas le faire plus tard sans le montrer. Ce n'est
pas une question à poser tant que le solveur ne l'exige pas.

Gaussienne, amplitude signée, Q d'égaliseur, interpolation entre les deux ancrages : déjà
écartés par le commentaire du 2026-11-10T07:40:14Z ou par Q29. Inchangé.

## 6. Contrôles numériques

Script jetable, pas un test du dépôt. Observations, distinctes des preuves du §4.

- Sur `w = 10, 11, …, 90`, formule retenue : `φ(0) = 1` exactement ;
  `|φ(λ) − 1/2| ≤ 2,3 × 10^{−16}` ; `|φ(1)| ≈ 3,7 × 10^{−33}` (`cos(π/2)` n'est pas un zéro
  binaire). Tolérance de test `10^{−12}`, pas l'égalité binaire, sur tout `cos` évalué.
- `α = 0`, `V = 40`, largeurs 10, 50 et 90 % : `U − 40 = 0` exactement aux abscisses
  essayées.
- Grille de 4 000 pas en `χ`, toutes les largeurs entières, formule retenue : aucune
  croissance au-dessus de `10^{−15}`. Des égalités flottantes, là où l'excès sous-passe le
  double. Ce n'est pas un plateau dans la formule. Ne pas tester
  `φ(χ) < φ(χ_précédent)` strict sur une grille fine.
- Quotients au milieu, formule retenue, `w = 10 %` : environ −8,10, −5,23, −3,29 pour des
  pas `10^{−3}`, `10^{−4}`, `10^{−5}` en `ξ`. Ils restent sous la majoration du §4 et
  diminuent. La puissance de cosinus seule, elle, augmente.
- Pente observée finie (différences centrées, 20 000 pas, formule retenue) : maximum
  d'environ 12 par unité de `ξ` à 10 %, 4,9 à 50 %, 19 à 90 %. Ce ne sont pas des plafonds
  contractuels. La preuve de bornitude est la continuité de `φ'` sur `[0 ; 1]`.
- Un changement de signe de courbure par épaule, aux quatre largeurs 10, 25, 50 et 90 %.
  Observation. Q29 ne demande pas une seule inflexion ; la formule l'a.

## 7. Intégration

Ne pas incrémenter `v`. `v` autre que `1` refuse le lien entier (`src/lib/url/schema.ts`).
`ws` et `wd` ont été ajoutés sans changer `v` : l'absence est le défaut. Même règle. Ne pas
changer `SESSION_KEY` (`scoutech:session:v1`) : une clé de plus dans le blob, optionnelle avec
défaut, n'est pas une migration. Le module Session dit qu'une forme non reconnue est écartée,
jamais migrée en silence (`src/lib/session/session.ts`). Le motif déjà utilisé pour #87, #89,
#90 et #106 est `v.optional(..., défaut)`, pas un nouveau nom de clé.

### 7.1 URL

Clés libres dans `CANONICAL_KEYS` au commit `f0da795`. Les insérer après `wd` et avant `cda`.

| Clé | Sens | Unité dans l'URL | Absente | Omise à l'écriture quand |
| --- | --- | --- | --- | --- |
| `ww` | `exposedWidthPercent` | pourcent, le nombre du champ | `50` | valeur `50` |
| `wa` | `anchorAttenuationPercent` | pourcent, le nombre du champ | `0` | valeur `0` |

`wa=50` est 50 % d'atténuation, pas `α = 0,50` écrit `0.5` par une autre convention. `ww=25`
est 25 % de portée. Un lien ancien, sans ces clés, reste un vent uniforme à largeur 50 %
mémorisée, et sa forme canonique ne gagne pas ces clés. Les liens de
`src/lib/url/__fixtures__/canonical-links.ts` restent byte à byte identiques.

Schéma : `FINITE`, comme `ws`. Pas de `minValue` / `maxValue`, pas de `transform` qui
réécrirait le lien. `ww=95`, `ww=9`, `wa=110`, `wa=-1` arrivent, et le formulaire refuse,
comme `ws=-5` (`src/lib/url/scenario.test.ts`).

`NEVER_COMPLETED` (`src/lib/url/scenario.ts`) gagne `ww` et `wa`. Les compléter réécrirait
chaque lien ancien et le nommerait dans la bande. Le commentaire « Absence carries exactly
eleven meanings and never a twelfth » (`schema.ts`) doit être amendé : `ww` absente = 50 %,
`wa` absente = 0 %, sont des sens nouveaux. Le numéral n'est pas une contrainte à préserver.
La contrainte est : l'absence a un sens, et la complétion ne réécrit pas les liens plus vieux
que la clé. « exempts the first ten » est déjà en retard sur `NEVER_COMPLETED` ; lister les
clés, ne pas compter.

`scenarioToSearch` écrit `ww` seulement si la largeur n'est pas `50`, `wa` seulement si
l'atténuation n'est pas `0`. `searchToScenario` lit `ww ?? 50`, `wa ?? 0`. Ne pas les faire
porter par `ws` ou `wd`.

Bande de lien (`src/lib/app/link-strip.ts`) : une ligne par clé, genre féminin, libellé emprunté
au champ, comme `ws` / `wd`.

### 7.2 Session

Valibot `1.5.0`, installé (`node_modules/valibot/package.json`). `object()` traite une clé
absente comme présente pour le défaut quand le schéma de la clé est `optional` et que ce
défaut n'est pas `undefined` (`dist/index.mjs`, `object`, branche `key in input || … default`).
`optional(wrapped, default)` remplit `undefined` puis valide l'enveloppe. Context7 n'était pas
dans les outils de cette session ; la source installée a été lue, pas le site.

Dans l'objet `wind`, pas à côté :

```text
exposedWidthPercent: optional(FINITE, 50)
anchorAttenuationPercent: optional(FINITE, 0)
```

Une Session `{ speedKmh, directionDeg }` est restaurée, vitesse et direction intactes, largeur
50, atténuation 0. Elle n'est pas jetée. Rendre les clés obligatoires jetterait les sessions
déjà écrites. Le défaut extérieur de `wind` entier reste `FIRST_RUN_SCENARIO.wind`, qui porte
les deux nouveaux champs.

`src/lib/scenario/first-run.ts` : le Vent d'ouverture gagne les deux défauts. Le test qui
fige `{ speedKmh: 0, directionDeg: 0 }` (`first-run.test.ts`) doit nommer les deux champs.
Les sorties mesurées du premier lancement ne bougent pas : le profil n'est pas consommé.

### 7.3 Porte

`src/lib/rail/fields.ts` ne sait pas refuser un intervalle fermé. Les règles bloquantes sont
`positive`, `non-negative` et `finite`. `above` est un avertissement, non bloquant
(`warningFor`). Un avertissement laisserait évaluer, ou dessiner, une largeur hors contrat.
Étendre l'union d'une règle bloquante, par exemple `{ kind: "closed-interval", min, max, sentence }`,
utilisée seulement par ces deux champs. Pas un avertissement. Pas un second exemplaire de la
règle dans le JSX : `FIELDS` reste la table unique, et `gateOf` attribue les deux champs à
`"wind"`.

Phrases, propriété du monde, valeur répétée à la précision du champ, comme les autres règles.
Pas « vous avez saisi ».

- Largeur : « la largeur de la zone exposée est entre 10 % et 90 % de la portée ».
- Atténuation : « l'atténuation aux ancrages est entre 0 % et 100 % ».

Champ vide : « valeur requise », comme les autres champs numériques. Pas optionnels.

Une valeur hors intervalle est une erreur bloquante de la porte Vent. Conséquence déjà écrite :
« vent indisponible » — la Banane et la descente ne lisent pas ce Vent, la statique et le
Verdict ne tombent pas (`fields.ts`, commentaire de la porte Vent ; `banner.ts`, `windCause`).
L'état reste celui du lien. Pas de Fix Action qui remettrait 50 % ou 0 % en silence : ce serait
une normalisation, ADR-0001 l'interdit. L'utilisateur corrige le champ.

`fieldUnavailable` (`gates.ts`) ne connaît aujourd'hui que `windSpeed` et `windDirection`. Y
ajouter les deux champs. Sans Positions, même phrase `WIND_UNPLACED`, valeurs conservées.

### 7.4 Champs, pages, aide

Les champs du Vent sont saisis sur Statique (`STATIQUE_FIELDS`, `components/statique/fields.tsx`),
Dynamique (`DYNAMIQUE_FIELDS`, `components/dynamique/fields.tsx`) et Avancé
(`components/rail/inputs.tsx`). Les deux nouveaux champs y vivent, mêmes widgets
(`<input type="text" inputMode="decimal">`, `src/components/rail/controls.tsx`). Indication
« % ». Pas sur Terrain : Terrain ne saisit pas le Vent (#101).

Libellés visibles, mots du mainteneur :

- « Largeur de la zone exposée »
- « Atténuation aux ancrages » — Q27, tel quel
- action « Vent uniforme »

`labels.ts` : les deux identifiants, même mot dans les deux registres, comme `windSpeed`.
Pas `hiddenOnTerrain` : Terrain ne les imprime pas comme champs, mais le mot n'est pas réservé
à Avancé. L'aide longue dans `src/lib/rail/help.ts`. La limite, dans `FIELD_NOTE`, sur chaque
Page qui saisit le champ — pas un bandeau :

- Largeur : « Part de la portée entre les deux points où la vitesse est à mi-chemin entre le milieu et les ancrages. Ce n'est pas une prévision de vallée. »
- Atténuation : « 0 % : vent uniforme. 100 % : vitesse nulle aux ancrages, hypothèse saisie, pas un abri mesuré. Le milieu reste à la vitesse saisie. »

Quantités dans `src/lib/format/quantity.ts` : unité « % », `decimals: 0`. `commitField` écrit
l'entier affiché. La poignée appelle le même `roundToDisplay`.

`windSpeed` et `windDirection` dans `help.ts` disent encore que la vitesse ne change ni la
statique, ni la garde, ni le verdict, et que seule la dynamique longitudinale et la Banane
lisent le Vent. C'est le code actuel. Ne pas réécrire ces phrases comme si #127 était branché.
Le profil, tant qu'il n'est pas consommé, ne change pas ces phrases. Quand #127 consommera
`U`, ces phrases deviennent fausses : les amender dans ce changement-là, pas dans le brief
d'interface du profil.

### 7.5 Rose, lecture seule, poignée

Code lu :

- `WindRose` ne dessine une poignée que si `onWind` est défini et `reference` n'est pas `null`
  (`src/components/map/wind-rose.tsx`).
- Page Terrain : `TopMap` reçoit `readOnly`, `locked` est vrai, `onWind` n'est pas passé
  (`src/components/map/top-map.tsx`). #101 : Terrain montre le Vent et n'en règle aucun.
- Sans gisement, `roseReference` est `null`, pas de poignée, `WIND_UNPLACED`.
- Porte Vent en échec : la rose dessine une vitesse 0, la poignée de direction reste offerte
  en édition pour qu'un geste réécrive un Vent que la porte accepte. Elle n'écrit pas au
  rendu.
- `windFromOffset` renvoie aujourd'hui `{ speedKmh, directionDeg }` seulement. Un geste de
  direction qui remplacerait l'objet Vent entier effacerait le profil.

Contrat :

- La poignée de profil est offerte exactement quand la poignée de direction l'est : `onWind`
  défini, gisement présent. Pas sur Terrain. Pas sans A et B. Axes d'écran fixes : le même
  `(w, a)` donne le même offset pour `NORTH_UP` et pour une référence de niveau. Elle n'appelle
  pas `roseReference`, `screenBearing` ni `north`.
- Rectangle, pas un disque. `u ∈ [0 ; 1]` vers la droite, `v ∈ [0 ; 1]` vers le haut de
  l'écran :

```text
w = arrondi_affichage(10 + 80 · u)
a = arrondi_affichage(100 · v)
```

Inverse, pour dessiner depuis l'état légal : `u = (w − 10) / 80`, `v = a / 100`. En
coordonnées d'écran `y` vers le bas, comme `RoseOffset` : `y` relatif au haut du rectangle
`= (1 − v) · hauteur`. Aller-retour vérifié sur chaque entier légal (10…90 et 0…100) avec
l'arrondi half-away-from-zero : aucun écart. Le test de non-régression est cet aller-retour,
pas le script.

- Grain : 81 largeurs, 101 atténuations. Un voyage d'au moins 80 px et 100 px peut atteindre
  chaque entier. Le rectangle fait au moins 100 px sur 100 px. `160` px reste un confort, pas
  une constante de scénario. Cible tactile : `HANDLE_PX` = 44, déjà la constante de la rose.
  Pas une nouvelle taille.
- Geste copié sur la rose, pas une bibliothèque : `setPointerCapture`, `touch-action: none`,
  écriture pendant le mouvement. La rose n'a pas de `onKeyDown`. Le clavier du profil est le
  champ, sur les Pages qui saisissent déjà le Vent. Ne pas inventer de touches fléchées.
- Chaque geste n'écrit que ses champs. `windFromOffset` doit recopier largeur et atténuation
  depuis `previous` (`{ ...previous, speedKmh, directionDeg }`), y compris quand la vitesse
  tombe à 0 et que la direction précédente est gardée. Le geste de profil ne change ni
  `speedKmh` ni `directionDeg`.
- Valeur hors bornes : la poignée ne réécrit pas au rendu. Elle se dessine au bord clampé.
  Un glisser écrit la valeur légale que le geste désigne — geste utilisateur, pas une réparation
  au chargement. Même idée que la vitesse au-delà de `ROSE_MAX_KMH`, qui parque la poignée sur
  l'anneau sans réécrire tant qu'on ne glisse pas.
- « Vent uniforme » met `anchorAttenuationPercent` à `0` et ne touche ni la largeur, ni `V`,
  ni `directionDeg`. La poignée descend en bas, `u` inchangé. Ce n'est pas
  `{ speedKmh: 0, directionDeg: 0 }`.

Aperçu, nommé « profil du vent » :

- Là où la poignée de profil existe : courbe de `U(ξ)`, A à gauche, B à droite, toujours. Ce
  n'est pas l'axe horizontal de la poignée. Ne pas les superposer.
- Trois lectures, évaluées en `ξ = 0`, `1/2`, `1`, pas lues sur un échantillon : vitesse au
  milieu (`V`), vitesse aux ancrages (`V · (1 − α)`, grain km/h déjà utilisé), largeur (`w` %,
  et `λ · L` en mètres si `L > 0` est connu). Les mètres sont une lecture, jamais une seconde
  saisie, jamais une clé d'URL. Changer la portée conserve le pourcentage.
- `α = 0` : ligne plate à `V`. La largeur mémorisée est marquée aux `ξ = (1 ± λ) / 2`, dite
  mémorisée, sans creux.
- Terrain, et toute rose sans `onWind` : pas de poignée, pas de zone de réglage. Les trois
  lectures s'ajoutent à la lecture déjà sous la carte quand l'atténuation n'est pas nulle.
  Atténuation nulle : la lecture actuelle reste seule — une largeur sans effet physique ne se
  raconte pas comme un vent qui change. Pas une nouvelle phrase d'indisponibilité :
  `WIND_UNPLACED` suffit quand le gisement manque.
- Porte en échec : ne pas dessiner la courbe comme si la valeur illégale était légale. Le
  champ porte l'erreur.

### 7.6 Cohérence de livraison avec #127

La fonction et les commandes peuvent être développées sur fixtures avant #127, mais un profil
non uniforme ne doit pas être présenté comme le vent effectivement appliqué tant que les
calculs continuent à utiliser une vitesse uniforme. La revue indépendante rejette l'ancien
contrat de non-branchement visible : afficher une vitesse nulle aux ancrages tout en calculant
une descente sous vent uniforme serait trompeur. Activation utilisateur à coordonner avec les
consommateurs physiques ; aucune livraison partielle silencieuse n'est autorisée par cette note.

Quand #127 consomme le champ : `windComponents(kmhToMs(U(x)), directionDeg, bearing)`, `U`
évalué à l'`x` courant, dans la dérivée, pas figé en début de segment, pas remplacé par la
vitesse de la rose si l'atténuation est non nulle. Atténuation nulle ⇒ `U` constant ⇒ l'entrée
actuelle est retrouvée. Le suivi descente le dit déjà ; il attendait la formule. Changer `w`
ou `a` est changer le Vent : avec la tension de pose comme pilote, #127 recalcule la longueur
non tendue. Pas avant. Pas une seconde atmosphère, pas une moyenne de `U²`.

## 8. Glossaire — texte de remplacement, pas encore appliqué

`GLOSSARY.md` n'a pas été édité. À amender dans le changement qui imprime les mots, pour que
`labels.test.ts` ne fige pas la définition plateau.

**Zone exposée** — remplacer « Zone centrale exposée » :

The width of the prescribed wind profile, as a percentage of the horizontal span, measured
between the two points where the wind speed is halfway between the speed at mid-span and the
speed at the anchors. Not a plateau at constant maximum speed, not a stored length in metres,
and not a valley forecast. French, on the field: **largeur de la zone exposée**.
_Avoid_: plateau, facteur Q, gaussienne, écart-type

**Atténuation aux ancrages** — entrée nouvelle :

How far the prescribed wind speed at both anchors sits below the speed at mid-span, in percent
of that central speed. 0 % is uniform wind. 100 % is zero wind at the anchors, a typed
assumption, not an observed shelter. It scales speed, not force. The mid-span speed is
unchanged. French: **atténuation aux ancrages**.
_Avoid_: abri, rafale, réduction de force

**Profil du vent** — entrée nouvelle :

The user-prescribed horizontal wind speed along A–B: one symmetric bell, maximum at mid-span,
residual speed at the anchors, the same at every height and every lateral offset. Line and
rider read that local speed. Not a forecast. French: **profil du vent**.

**Rose des vents** — une phrase à ajouter, sans retirer le reste :

A second handle sets the wind profile. Its screen axes do not turn with the wind: right
widens the exposed zone, up increases anchor attenuation. On Terrain it is read-only, like
the direction handle.

## 9. Tests d'acceptation

Doctrine : `docs/conventions/testing.md`. Vitest est `node`, sans DOM. Valeurs attendues
calculées au §4, pas relues sur la sortie du code, pas copiées du script de `/tmp`, pas prises
dans `docs/references/` comme fixture physique. Tolérance : égalité exacte quand `α = 0` ou
quand l'expression ne passe pas par `cos` ; écart absolu `< 1×10⁻¹²` sur un `cos` machine.
La pente nulle se vérifie par différence finie contre `0`, sous la majoration du §4, pas
contre une dérivée recalculée par le code sous test.

Profil, fonction pure :

1. `w = 50` : `φ(0) = φ(1) = 0` à `10^{−12}`, `φ(1/2) = 1`, `φ(1/4) = φ(3/4) = 1/2` à
   `10^{−12}`. `ξ = 1/4` est le demi-écart quand `λ = 1/2`.
2. `w = 50`, `ξ = 3/8` : `φ = cos²(π (2 − √2) / 8)`, à `10^{−12}`. Ce n'est pas
   `(2 + √2) / 4`. Le test écrit l'expression, il ne copie pas un flottant du script.
3. `V = 40`, `a = 75`, `w = 50` : `U(1/2) = 40`, `U(0) = U(1) = 10` à `10^{−12}`,
   `U(1/4) = U(3/4) = 25` à `10^{−12}`.
4. `a = 0`, `V = 40`, `w ∈ {10, 50, 90}` : `U(0) = U(1/4) = U(1/2) = 40` exactement.
5. Symétrie sur des dyadiques exacts (`0`, `1/4`, `1/2`, `3/8`, `1`), `w ∈ {10, 50, 90}` :
   `φ(ξ) = φ(1 − ξ)`. Pas un balayage dont l'espérance serait le code.
6. Pente au milieu, `w = 10` : le quotient `|(φ(1/2 + 10^{−4}) − 1) / 10^{−4}|` est inférieur
   ou égal à `(π/2)^6 · 2^{4p} · (10^{−4})^{4p − 1}` avec `p = ln 2 / ln 10`. Le quotient au
   pas `10^{−5}` est inférieur **en valeur absolue** à celui au pas `10^{−3}`.
7. Pente aux ancrages, `w ∈ {10, 50, 90}` : `|(φ(1) − φ(1 − 10^{−3})) / 10^{−3}| < 10^{−3}`.
   La majoration du §4 à 90 % vaut environ `4,5 × 10^{−4}` ; le plafond `10^{−3}` est
   au-dessus d'elle.
8. `V = 0`, `a = 100`, `w = 90` : `U = 0` à `10^{−12}` sur les abscisses du point 5. `a` et
   `w` lus ensuite sont inchangés.
9. Hors domaine : `w ∈ {9, 91, −1}`, `a ∈ {−1, 101}` ne sont pas évalués comme un vent
   uniforme. Le lien les conserve. La porte les refuse, erreur bloquante, pas un
   avertissement, pas un clamp dans `schema.ts`.
10. Indépendance : changer `w` ne change pas `a` ni `V`. « Vent uniforme » met `a` à `0` et
    laisse `w`, `V` et `directionDeg`. Il ne produit pas `{ speedKmh: 0, directionDeg: 0 }`.

Sérialisation, sur le codec, pas sur un navigateur :

11. Lien sans `ww` ni `wa` : `a = 0`, `w = 50`, et le lien canonique ne gagne pas ces clés.
    Les liens canoniques existants restent byte à byte identiques.
12. `wa=50` sans `ww` : atténuation 50 %, largeur 50. `ww=25` sans `wa` : largeur 25 %,
    atténuation 0, clé `wa` absente à la réécriture. L'ordre émis suit `CANONICAL_KEYS` :
    `ww` puis `wa`, entre `wd` et `cda`.
13. `wa=110`, `ww=-1` : valeurs conservées, formulaire en erreur, pas de clamp.
14. Session ancienne `{ speedKmh, directionDeg }` : restaurée, vitesse et direction intactes,
    `a = 0`, `w = 50`. Pas de session jetée. `SESSION_KEY` inchangé.
15. Un geste de direction qui réécrit le Vent ne remet pas `w` ni `a` à zéro, y compris quand
    il écrit une vitesse 0 et garde la direction précédente. L'inverse : un geste de profil ne
    change ni `speedKmh` ni `directionDeg`.
16. Le même `(w, a)` légal donne le même offset d'écran de la poignée de profil pour
    `NORTH_UP` et pour une référence de niveau. La poignée de direction, elle, tourne.
17. Aller-retour poignée → état → poignée sur chaque entier `w` de 10 à 90 et chaque entier
    `a` de 0 à 100.
18. Un profil présenté comme appliqué avec `a = 100`, `w = 10` alimente les consommateurs
    physiques par le même `U(x)` local. Aucun chemin ne conserve silencieusement le vent
    uniforme. Avant cette intégration, ne pas présenter les lectures du profil comme le vent
    appliqué ; vérifier la frontière d'activation plutôt qu'imposer des résultats inchangés.
19. Sans Positions, les quatre champs du Vent sont indisponibles avec `WIND_UNPLACED`, valeurs
    conservées. Terrain ne passe pas `onWind` : pas de poignée de profil, comme il n'a pas de
    poignée de direction.

## 10. Décisions encore ouvertes

Les choix de forme et de commande ci-dessous sont acquis. La formule du §3 est une proposition
technique vérifiée par revue indépendante, pas un arbitrage supplémentaire du mainteneur ni
une preuve qu'elle est la famille la plus simple possible. La frontière d'activation avec #127
reste à consolider avant publication du brief ; ne pas rouvrir les choix déjà acquis.

| Sujet | Pourquoi ce n'est pas ouvert |
| --- | --- |
| Plateau ou cloche | Q29. |
| Largeur 0–90 % ou 10–90 %, défaut, pas | Q28. |
| Sens des axes, nom du champ d'atténuation | Q27. |
| Mètres stockés ou pourcentage | Q25. Les mètres sont une lecture `λ · L`. |
| Gaussienne, Q, amplitude signée | Commentaire du 2026-11-10T07:40:14Z et Q29. |
| Formule parmi les cloches qui tiennent les contraintes | Proposition technique du §3, contraintes vérifiées indépendamment. Ne pas confondre avec une décision du mainteneur ; ne pas remplacer silencieusement par le nid double (§5.4). |
| Libellé « Largeur de la zone exposée » | Composé des mots déjà utilisés (largeur, zone exposée, Q29). Pas un second arbitrage. |
| Phrase de bandeau | Refusée. L'aide du champ suffit. |
| Incrémenter `v` ou la clé de Session | Le motif de `ws` / `wd` et de #106 est l'absence-défaut. Une migration silencieuse est interdite par le module Session. |

Ce qui reste du travail, et n'est pas une question :

- Amender le glossaire avec le §8 dans le changement qui imprime les mots. Tant que le glossaire
  dit « plateau », il contredit Q29.
- Ne pas réécrire `agent-readiness-decisions.md` ni la note de préparation dans ce brief, sauf
  si le brief touche ces fichiers pour les marquer périmés. Les commentaires d'issue priment.
- #127 garde les coefficients, la méthode numérique, et la question de savoir si `φ''` non
  bornée sur 10–24 % gêne cette méthode. Le brief du profil ne la tranche pas et n'attend pas
  qu'elle le soit.
- Le suivi descente, point 4 du §7, peut citer cette note. Il n'a pas été modifié ici.

## 11. Sources lues

| Source | Ce qui a été lu | Usage |
| --- | --- | --- |
| #120, corps et 8 commentaires ; #127, corps et 9 commentaires | `gh issue view`, 2026-11-10. Derniers commentaires profil : Q25, Q27, Q28, Q29 | Verrou. Le plus récent prévaut. |
| `agent-readiness-decisions.md`, `agent-readiness-wind-profile.md`, `descent-views-contract-followup.md`, `GLOSSARY.md` (Vent, Zone centrale exposée, Rose des vents) | Dépôt, arbre de travail | Contradictions à ne pas implémenter. |
| `docs/simulation-theory.md` §2 ; `docs/adr/0001-invalid-state-arrives-faithfully-and-is-gated.md` ; `docs/conventions/testing.md` | Dépôt | Repère, ADR-0001, doctrine de test. |
| `src/lib/url/schema.ts`, `src/lib/url/scenario.ts`, `src/lib/session/session.ts`, `src/lib/scenario/types.ts`, `src/lib/scenario/first-run.ts` | Commit `f0da795` | Clés, absence, Session additive. |
| `src/lib/rail/fields.ts`, `gates.ts`, `src/lib/format/quantity.ts`, `src/lib/rail/help.ts`, `src/lib/app/link-strip.ts` | Idem | Porte, grain, aide, bande. |
| `src/lib/map/wind-rose.ts`, `src/components/map/wind-rose.tsx`, `src/components/map/top-map.tsx`, `src/lib/sim/wind.ts`, `src/lib/sim/terrain.ts` (`zGroundAt`) | Idem | Poignée, lecture seule, conversion, clamp des bouts. |
| `src/lib/scenario/dynamics.ts`, `src/lib/map/banane.ts` | Idem | Consommateurs actuels du scalaire. |
| Valibot `1.5.0` | `node_modules/valibot/dist/index.mjs`, `optional` et `object` | Clé absente remplie seulement si `optional` a un défaut. |
| Script `/tmp/wind-profile-check.mjs` | Exécuté une fois, hors dépôt | Observations du §6. Pas une fixture. |

Context7 n'était pas disponible dans cette session. La doc en ligne de Valibot n'a pas été
relue ; la source installée, à la version déclarée par `package.json`, l'a été.
