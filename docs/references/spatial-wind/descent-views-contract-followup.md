# Contrat de suivi — descente à sens unique et projections (#127, #118)

> **Contrats publiés :** [moteur #127](https://github.com/fuzoh/simu-tyro/issues/127#issuecomment-6775389911)
> et [vues #118](https://github.com/fuzoh/simu-tyro/issues/118#issuecomment-6775390540).
> Voir [décisions consolidées](triage-decisions-consolidated.md) : coefficients et silhouette
> statiques désormais adoptés comme conventions Q35–Q43, activation coordonnée Q34.
> Les anciennes mentions de coefficient ou de silhouette non décidés sont historiques.
> Les contraintes de formulation des indisponibilités sont dans le brief ; la descente
> conserve sa loi, distincte de la force du passager statique.

Note du 2026-11-10. **Contrat d'implémentation proposé, pas une validation expérimentale, pas un
coefficient, pas un facteur de sécurité.** Elle fixe la projection 3D de la descente qui conserve
le modèle de traînée accepté (Q12) et le contrat d'indisponibilité des vues (Q24). Elle ne remplace
pas `docs/simulation-theory.md` : toute édition de `src/lib/sim/` commence par cette théorie, avant
le code (`docs/conventions/simulation.md`).

Ce fichier est le seul écrit. Pas de changement de moteur, pas d'écriture GitHub, pas de commit.
Les contrôles numériques du §8 sont de l'algèbre sur des identités déjà publiées ou sur un lieu
fabriqué à la main. Ils ne mesurent pas une tyrolienne.

## Ce qui prime

Décisions du mainteneur, dans cet ordre, sur les points qu'elles tranchent :

1. Commentaires de [#127](https://github.com/fuzoh/simu-tyro/issues/127) et
   [#118](https://github.com/fuzoh/simu-tyro/issues/118), derniers en date. Q12, Q16, Q23, Q24,
   Q30, Q31, Q32 priment sur les notes de préparation.
2. Q25, Q28, Q29 de [#120](https://github.com/fuzoh/simu-tyro/issues/120) pour la forme du champ
   de vent. Elles priment sur le plateau de
   [agent-readiness-decisions.md](agent-readiness-decisions.md) et sur la courbe préférée de
   [agent-readiness-wind-profile.md](agent-readiness-wind-profile.md).
3. Cette note, pour la projection de la descente et le paquet que les vues consomment, là où les
   notes de préparation sont encore ouvertes ou contredites plus bas.
4. Le code au commit `f0da795` pour le comportement actuel. `docs/simulation-theory.md` §18 n'est
   **pas** dans ce commit : c'est l'arbre de travail, non commité. Le corps de #134 sur GitHub
   suffit pour Q12.

## 1. Déjà tranché — ne pas rouvrir

| Point | Décision | Conséquence ici |
| --- | --- | --- |
| Statique | Passager immobile, maintenu au chariot. Poids et force aérodynamique statique intégralement transmis. Cette force ne dépend pas de la vitesse de descente. | `s_D` imposé. `P_ext` statique n'entre pas dans l'EDO. |
| Architecture | Équilibres à `L₀` figé → lieu du chariot → estimation de descente. | La Trajectoire n'est pas la forme d'une Ligne chargée. Le défilement n'est pas un temps de ligne. |
| Q12 | Conserver le modèle de traînée de la page Dynamique. L'ellipsoïde ne sert que le vent statique. | Pas de loi `|u_rel|`. Pas de remplacement de `C_dA` par `A_proj`. |
| Énergie | Pas de correction silencieuse. #124 différée. | Interdit d'ajouter `−dV_ligne/ds` à l'EDO. |
| Vent | Un seul Vent de Scénario, horizontal, même direction partout. Champ indexé le long de A–B, identique à toute hauteur et tout écart latéral, non advecté. | L'EDO évalue ce champ. Elle n'en invente pas un second. |
| Q16 | `z_terrain(x, y) = z_profil(x)`. Garde verticale, gabarit entier. | Pas une garde de versant. Pas une distance aux obstacles 3D. |
| Q24 | Position sans solution exploitable : pas de Ligne chargée calculée, pas d'interpolation, pas de position voisine, pas de repli sur l'ancien modèle. Traversée incomplète ⇒ Verdict `Indéterminé`. | Les positions réussies restent consultables. |
| Q30 / Q31 / Q32 | Flèche = chute verticale max sous A–B. `H` = composante de `F` selon l'axe horizontal A→B à l'ancrage de Mise en tension, ligne à vide, sous le Vent. Rapport V = `P/H`. | Les questions 1 et 2 de la note solveur sont closes. Pas H-gate. |
| Deux brins | Chaque brin : moitié du poids et de la force aérodynamique du passager, son propre poids, son propre vent réparti. Pas de sillage. `F₀` reste celui d'un seul chariot. | La masse qui descend est `m` entier. |
| Gabarit | Soustrait en entier. Pas de déplacement latéral du passager hors du chariot. Q23 : ellipsoïde déduit du gabarit, règle non écrite. | Les vues ne dessinent pas un corps. |
| Quatre tracés | Ligne à vide, Ligne chargée à la position choisie, Trajectoire, Ligne A–B. Pas de courbe « sans vent ». Banane qualitative retirée. | Les trois vues lisent les mêmes sommets. |

## 2. Notes périmées sur ces points

Ne pas implémenter les passages suivants. Ils sont antérieurs aux arbitrages cités.

| Passage | Ce qu'il dit encore | Ce qui prime |
| --- | --- | --- |
| [agent-readiness-solver.md](agent-readiness-solver.md) §3.2–3.3, questions 1–2 | H-gate par défaut ; flèche encore à confirmer | Q31 = H-x ; Q30 = chute verticale (F1) |
| [agent-readiness-decisions.md](agent-readiness-decisions.md) Q1, Q6 | Plateau et cosinus relevé, largeur 0–90 % = longueur du plateau | #120 Q29 : cloche lisse, sans plateau uniforme ; Q25/Q28 : largeur 10–90 % à mi-écart de vitesse |
| [agent-readiness-wind-profile.md](agent-readiness-wind-profile.md) « courbe préférée » | Même plateau | Q29. La formule de cloche n'est pas dans le dépôt. |
| [agent-readiness-views.md](agent-readiness-views.md) §3, question 2 | Garder l'effacement de tous les tracés mécaniques si `placeRider` renvoie `null` | Q24 : cacher la Ligne chargée de cette position, garder le consultable |
| [equilibre spatial vent.md](../equilibre%20spatial%20vent.md) §6, ligne « terrain hors axe » du §7 | Garde indisponible faute de `z(x, y)` | Q16, extrusion nommée |
| [agent-readiness-views.md](agent-readiness-views.md) question 1 | Demande de confirmer le signe de `y` | Déjà le signe de `WindComponents.across` (`src/lib/sim/wind.ts:14-22`). Pas une question ouverte. |

La projection `v_rel,t = v − u_air · t` du §6.3 de la note solveur est, elle, retenue. Le §4
ci-dessous la réécrit avec le signe du code, que la note laisse implicite.

## 3. Repère et paquet commun

Mètres, SI, origine au sommet de l'ancrage A. Prolonge §2 de la théorie et `windComponents` :

- `x` horizontal vers B, A en `0`, B en `L` ;
- `y` horizontal, **positif vers la gauche du trajet A → B** — le signe de `across` (vent venant
  de la droite, `from − bearing = 90°`, `across > 0`, pousse vers `+y`) ;
- `z` vers le haut. Ancrage B mécanique : `(L, 0, h)`.

`S` reste l'abscisse matérielle non étirée. Le lieu n'est pas paramétré par `x`.

### 3.1 Quatre tracés, une disponibilité chacun

Les trois vues et la descente lisent ces sommets. Elles ne rappellent pas le vent, ne
rééchantillonnent pas une forme, n'importent pas `banane.ts`.

| Tracé | Sommets | Absent quand |
| --- | --- | --- |
| Ligne à vide | équilibre à vide, ancrages inclus | la pose sous le Vent du Scénario n'a pas de `L₀` exploitable |
| Ligne chargée | équilibre à la position choisie, **nœud du chariot inclus** | ce solve exact refuse, comme `placeRider` aujourd'hui — **ce tracé seul** |
| Trajectoire | lieu des nœuds du chariot des pas résolus, une polyligne par plage d'au moins deux pas | aucune plage de deux pas. Une plage d'un point ne se dessine pas |
| Ligne A–B | `(0, 0, 0)` → `(L, 0, h)` | jamais, dès que la portée et le dénivelé existent. Pas une sortie du solveur |

À une position résolue, le point de Trajectoire est le nœud du chariot de la Ligne chargée à
cette position, pas un échantillon de milieu de brin.

L'écart de 6 px des deux Brins porteurs reste un décalage de dessin **après** projection
(`src/lib/chart/scene.ts`, `src/components/map/vue-3d-renderer.ts`). Il n'entre pas dans `y`.
Sinon la coupe et la Vue 3D divergent avec le zoom.

### 3.2 Ce que le code fait, et ce que Q24 change

Observé au commit `f0da795` :

- `placeRider` renvoie `null` si le solve exact refuse (`src/lib/chart/scene.ts:463-466`).
- Le Chart Block jette alors **toute** la scène, Ligne à vide et Trajectoire comprises
  (`src/components/chart/chart-block.tsx:171-173`).
- `vue3dScene` fait le même effacement, et pousse la Ligne à vide par la Banane
  (`src/lib/map/vue-3d.ts:232-248`).
- `trajectoryRuns` coupe aux pas en échec et ne ponte pas (`src/lib/chart/scene.ts:546-574`).
- `readDynamics` renvoie `null` si `coverage < 1` (`src/lib/scenario/dynamics.ts:103`).
- `evaluateVerdict` rend `Indéterminé` et ne qualifie pas (`src/lib/sim/verdict.ts:672`).
- « — » est le glyphe d'`Indéterminé` seul. Un tracé absent n'est pas pointillé.

Q24 confirme le refus de ponter, le Verdict indéterminé et l'absence de repli. Il **retire**
l'effacement global : à la position en échec, pas de Ligne chargée calculée ; terrain et Ligne
A–B restent ; les positions réussies restent consultables. Donc, si la pose a un `L₀` :

- la Ligne à vide reste ;
- les plages résolues de la Trajectoire restent, coupées, jamais pontées ;
- la Ligne chargée de cette position est absente ;
- une traversée incomplète ne produit ni Verdict qualifié, ni descente.

Une pose sans `L₀` ne produit ni balayage, ni descente, ni tracé mécanique. C'est déjà
`buildSceneBase` (`src/lib/chart/scene.ts:347-354`).

`ridePath` compacte les pas résolus et relie le dernier d'avant au premier d'après
(`src/lib/sim/dynamics.ts:112-137`). Aujourd'hui `coverage < 1` empêche l'appel. **Ne pas**
lever cette garde pour « intégrer ce qui a convergé » : la liste compactée ponte le trou. La
descente absente n'est pas un trou dessiné. Les vues, elles, marchent sur la grille, pas sur
cette liste.

### 3.3 Monotonie de `x`

`ridePath` saute un pas qui n'avance pas en `x` (`dynamics.ts:124`). C'est licite tant que le
lieu est plan et que `x` croît. Ce n'est plus une hypothèse : un `x_D` qui recule est un point
du lieu, pas un doublon. Le sauter raccourcirait le chemin en silence.

Contrôle algébrique, lieu fabriqué `(0,0,0) → (10,1,−1) → (8,4,−2) → (20,3,−6)` : longueur
d'arc 26,53 m ; le filtre `x` croissant en jette 3,74 m. **Interdit.**

Règle : paramétrer par l'ordre du lieu (grille, ancrages compris pour la descente). Sauter
seulement un segment de longueur nulle. Ne pas trier les sommets par `x`. Ne pas définir une
garde « à cet `x` » si `x` n'est pas strictement croissant : la garde reste celle du réducteur,
indexée par le pas, pas une relecture de la polyligne dessinée.

Le Point d'arrêt actuel est un `x` (`RideEnd`). Le résultat de descente porte le point
`(x, y, z)` et l'abscisse d'arc depuis A. Tant qu'aucun lieu résolu n'a montré un `x` non
monotone, la coupe continue de marquer cet `x`. Ne pas demander un arbitrage d'affichage avant
qu'un repli soit observé (même retenue que Q33). Ne pas le masquer en amont en jetant le point.

## 4. Descente — projection qui conserve Q12

### 4.1 Chemin

L'EDO suit la polyligne du lieu, ancrages compris : A `(0,0,0)`, nœuds résolus dans l'ordre de
la grille, B `(L, 0, h)`. Pas `step.theta`.

`step.theta` est la pente de **corde** au nœud, côté amont du saut
(`src/lib/sim/sweep.ts:175-179`, `verticalTensionAt` à `s = s_D`, saut exclu parce que
`s > s_P`, `src/lib/sim/catenary.ts:73-81`). Jojić, Vladić et Đokić 2025, éq. 18, intègre
`sin γ` sur le lieu, pas la pente de brin. La revue énergétique a contrôlé que le moteur plan
lit déjà `(x_D, z_D)`. Remplacer `t` par `step.theta` serait une régression.

Segment `i`, orienté dans l'ordre du lieu :

```text
Δr = r_{i+1} − r_i
L_i = |Δr| > 0
t = Δr / L_i
```

`v` est la vitesse signée le long de `t`, positive vers les indices croissants (vers B dans
cet ordre). `d ∈ {+1, −1}` est le sens du parcours. Gravité, accélération de `v` :

```text
a_B = −g t_z + …
```

`g = 9,81`. À `t_y = 0` et `t_x = dx / L_i > 0`, `t_z = dz / L_i` et l'équation retombe sur
`−g * sin[i]` de `dynamics.ts:216-220`.

### 4.2 Frottement — lois inchangées

- Corde, `[FIELD:SSF]` : `F₀ + k_v |v|`, indépendant du poids. Un seul `F₀`, quel que soit le
  nombre de brins. Défauts expédiés `F₀ = 15 N`, `k_v = 1,5 kg/s`.
- Câble, `[CONVENTION]` : `μ N`, `μ = 0,015`. En spatial,

```text
N = m g √(t_x² + t_y²)
```

C'est `μ m g cos θ` pour l'inclinaison du **lieu** sur l'horizontale, pas `μ m g t_x`.
`t_x` signé devient négatif si le lieu recule en `x` ; l'utiliser donnerait une normale
négative. Sur le segment unitaire `t = (0, 0,6, 0,8)`, `√(t_x²+t_y²) = 0,6`, donc
`N = 90 × 9,81 × 0,6 = 529,74 N`. Le produit `m g t_x` vaut 0. À `t_y = 0` et `t_x > 0`,
l'identité avec `cos[i] = dx / L_i` est exacte (contrôle : `t = (0,8, 0, −0,6)`, les deux
valent 0,8).

Le frottement s'oppose au parcours : le terme retranché de `a_B` est `d * F_friction`. Il ne
dépend pas du vent.

Pas de terme centrifuge. La théorie §12.2 le dit optionnel ; #89 ne le demande pas ; l'ajouter
changerait `N`, ce n'est pas une projection. #124 ne le fait pas entrer par la bande.

### 4.3 Traînée — la fermeture scalaire, en 3D

Loi retenue, identique à `dynamics.ts:216-220` et à la théorie §12.2 commitée (`f0da795`) :

```text
v_rel,t = v − u_air · t
F_drag,B = ½ ρ C_dA  v_rel,t |v_rel,t|
a_B = −g t_z − (d · F_friction(|v|) + F_drag,B) / m
```

`F_drag,B` est le terme **retranché** de `a_B`, pas une norme toujours opposée au mouvement.
La phrase de la théorie « friction and drag oppose the motion » ne décrit pas ce signe : un
vent arrière plus rapide que le passager propulse. Contrôle : `t = (1,0,0)`, `v = 10`,
`u_air = (25, 0, 0)`, `ρ = 1,225`, `C_dA = 0,45` ⇒ `v_rel,t = −15`, terme retranché
`−62,015625 N`. Le conserver. Le rendre toujours opposé à `v` casserait Z8 sous vent arrière
et le départ au repos sous vent.

`C_dA` défaut `0,45 m²` `[FIELD:SSF]`, bornes de saisie `0,30–0,60` `[CONVENTION]`. `ρ` est
celui que `airDensityOf` choisit déjà (saisi, ISA au profil, ou 1,225). Pas une seconde
atmosphère.

#### Vent relatif

`u_air` est la vitesse de l'air, horizontale, dirigée vers où l'air va, dans le repère du §3 :

```text
u_air(x) = (along, across, 0)
```

`along` et `across` sont ceux de `windComponents` appliqués à la vitesse locale `U(x)`, pas à
la vitesse de la rose si l'atténuation est non nulle. `windComponents` a déjà converti
l'azimut « d'où vient ». Ne pas inverser une seconde fois. Cardinaux, relus sur la même
formule que `src/lib/sim/wind.ts:52-66` : vent de face `along = −vitesse` ; vent arrière
`along = +vitesse` ; venant de la droite `across = +vitesse` ; venant de la gauche
`across = −vitesse`.

`U(x)` est le champ de #120, évalué à l'`x` courant du passager, à l'intérieur de la dérivée,
pas figé au début du segment ni remplacé par la vitesse de la rose. Atténuation nulle ⇒ `U`
constant ⇒ l'entrée actuelle `windAlong` est retrouvée. La formule de cloche de Q29 n'est pas
dans le dépôt : ne pas en écrire une ici. Tant qu'elle n'existe pas, les tests de projection
se font à vent uniforme.

`x` hors de `[0, L]` : la note de profil propose de ramener `ξ = x/L` à l'extrémité la plus
proche, comme `zGroundAt` tient les bouts (`src/lib/sim/terrain.ts:51-64`). Q25–Q29 ne le
redisent pas. C'est l'extension écrite, pas un vent au-delà des ancrages. La nommer dans le
commentaire. Ce n'est pas une question bloquante : le vent uniforme ne l'atteint pas.

#### Identité avec le code plan

Si `t_y = 0`, `t_x = dx / L_i` et `u_air = (u_∥, 0, 0)` :

```text
u_air · t = u_∥ t_x = u_∥ cos[i]
v_rel,t = v − u_∥ cos[i]
```

C'est `rel` de `dynamics.ts:218`. Écart max sur quatre couples `(v, u, dx, dz)` tirés à la
main : `1,8×10⁻¹⁵`. Un travers pur sur un lieu plan (`t_y = 0`) donne `u_air · t = 0` : la
vitesse ne change pas. C'est le test de non-régression de Q12, pas une loi physique générale.
La théorie §12.2 le dit déjà : l'omission directe du travers est une propriété de cette
fermeture, pas une preuve que le travers ne peut pas changer la vitesse.

Sur un lieu déporté, `t_y ≠ 0`, la même fermeture fait entrer `across` par `t_y` seulement.
Contrôle : `t = (3, 1, −1)/√11`, `u_air = (2, 8, 0)`, `v = 15` ⇒
`v_rel,t = 10,7788…`, et `v_rel,t − (v − along·t_x) = −across·t_y = −2,4121…`.
Mettre `across` à zéro avant le produit scalaire serait une omission nouvelle, pas Q12.
La loi isotrope ci-dessous est l'autre écart, et elle est refusée.

#### Loi refusée

Projection d'une traînée quadratique isotrope, revue passager §5.2 :

```text
u_rel = v t − u_air
F · t = −½ ρ C_dA |u_rel| (v − u_air · t)
```

Elle remplace `|v_rel,t|` par `|u_rel|`. Sur un lieu plan horizontal, `v = 19,8449 m/s`,
travers `10 m/s`, `ρ` et `C_dA` de Z8 : le terme scalaire retranché vaut `108,55 N` ; la
composante tangentielle isotrope vaut `−121,55 N`, soit `12,0 %` de plus en module. Ce
n'est pas une erreur produit. C'est la raison de ne pas « étendre » Q12 en changeant la
norme. Ni cette loi, ni l'usage isotrope du `0,45 m²` SSF, ne sont validés
(`docs/simulation-theory.md` §12.2 ; NASA Glenn, équation de traînée, aire de référence
inséparable du coefficient, page relue le 2026-11-10, `dateModified` 2025-07-01).

La force statique de l'ellipsoïde ne s'ajoute pas à `F_drag,B`. Deux fermetures coexistent
par décision : ellipsoïde à `v = 0` dans l'équilibre, `C_dA` sur la vitesse de descente dans
l'EDO. Les identifier (option E3 de la note aérodynamique) détruit le calage SSF. Q12 l'interdit.
L'incohérence mécanique est documentée ; ce n'est pas un défaut à corriger dans cette livraison.
Pas de double comptage au sens inverse : la descente ne renvoie rien à `P_ext`.

#### Départ, deux courses, estimation

Au repos, `v = 0`, `v_rel,t = −u_air · t`. La force vers B est

```text
drive_B = −m g t_z − F_drag,B
```

Le passager repart si `|drive_B|` dépasse la retenue au repos (`F₀` ou `μ N`), dans le sens
de `drive_B`. Même règle de sommet que `depart` (`dynamics.ts:246-268`) : un creux où les
deux segments poussent vers le sommet retient.

Deux courses, comme `readDynamics` : d'abord sans vent, puis avec le Vent que les grilles
appliquent. Sans gisement, le Vent n'a pas de composante : la course « avec vent » est la
course calme (`src/lib/scenario/dynamics.ts:109-112`). Un Vent retenu par la grille est une
vitesse nulle pour le calcul, pas un Vent effacé du Scénario (ADR-0001). Pas de second tracé.

**Correction de revue :** ne pas conserver le raccourci actuel `along === 0 ? calm` lorsque
la trajectoire a une pente latérale. Seul le cas sans gisement justifie ici l'absence de
projection. Avec `t = (3,1,−1)/√11`, `u_air = (0,8,0)` et `v = 15`, la vitesse relative
projetée vaut `15 − 8/√11`, pas 15. Ajouter le test indépendant
`v_rel,t − (v − along·t_x) = −across·t_y`, avec `t_y ≠ 0`, et vérifier que le diagnostic de
vent nul ne se fonde pas seulement sur `along`.

Départ contrôlé au repos en A. Point d'arrêt d'abord sans vent, puis avec le Vent. Vitesse
d'arrivée seulement si B est atteint, sans freinage. Tout est une Estimation. Rien de cela ne
juge le Verdict.

Intégrateur : garder le pas `DYNAMICS.step = 1 m`, `maxRestarts = 1000`, l'intégration de
`v²/2` le long de l'arc. Ce ne sont pas des constantes physiques. Ne pas les « améliorer »
dans ce contrat.

### 4.4 Énergie et `v/c`

Sans frottement ni traînée, `d(v²/2)/ds = −g t_z` le long de `t`. Donc `½mv² + mgz` est
conservée sur le lieu figé. Contrôle RK4, pas de 1 m, polyligne
`(0,0,0) → (40,5,−8) → (70,−3,−20) → (100,2,−15) → (130,0,−30)`, départ au repos : résidu
max `|v²/2 + g z| = 5,7×10⁻¹³`, arrivée `v²/2 = 294,3 = −g Δz`. Étendre le test plan à cette
quantité. Ne pas y ajouter `V_ligne`.

`V_ligne = ∫ w z dS + ∫ T²/(2 EA) dS`, intégrales en `S` non étiré, peut être **rapporté**
dans un test, sans seuil, sans assertion d'égalité, sans affichage. La revue énergétique dit
pourquoi `−dV_ligne/ds` est une force fausse dès que la forme n'est plus l'équilibre du
balayage.

`v/c` : `c = √(|F|/μ)`, `μ = w/g` du brin, `|F|` au nœud côté amont (saut exclu), pas
`H / cos θ`. À `F_y = 0` et `H ≠ 0`, `H / cos(atan2(V, H)) = |F|` exactement (contrôle
`H = 8000`, `V = −588,5`). Avec `F_y = 500` sur le même exemple, `|F|` et `H/cos θ_xz`
diffèrent de `0,19 %` : la formule plane n'est plus définie. Le seuil `0,2` reste une
convention interne. Ne pas le « corriger » vers `T_min` ni vers `√(T λ / μ₀)`. Le rapport
affiché peut être plus petit que celui de Mungan ; le dire dans le commentaire.

`quasiStaticRatio` cherche `T` par dichotomie sur `x` (`dynamics.ts:375-388`). Indexer par
l'arc, ou porter `|F|` sur les sommets. Une dichotomie sur un `x` non monotone lit la
mauvaise tension.

## 5. Vues — projection du même paquet

### 5.1 Trois images, aucun second calcul

1. **Coupe** : sommet `(x, y, z)` dessiné en `(x, z)`. `y` n'est pas écarté par un autre
   solve ; il est l'ordonnée de profondeur de cette projection. `d3.line()` sans `.curve()`
   est `curveLinear` : une polyligne par les sommets, sans point inséré (README `d3-shape`
   3.2.0, consulté le 2026-11-10 ; paquet installé `d3-shape@3.2.0`,
   `node_modules/d3-shape/src/line.js`). `pathOf` le fait déjà
   (`src/components/chart/profile.tsx:54-58`). Ne pas passer à une spline.
2. **Vue de dessus** : `(x, y)` dans le plan local, ou l'image géographique de ce plan. Plus
   d'arc `bananePath`.
3. **Vue 3D** : le même `(x, y, z)` par **un** projecteur mètres → WGS84 + altitude.
   `ArcType.NONE` est déjà imposé (`src/components/map/vue-3d-renderer.ts:488`). Le défaut
   documenté de `PolylineGraphics.arcType` est `ArcType.GEODESIC` (page Cesium 1.147, consultée
   le 2026-11-10 ; même phrase dans
   `node_modules/@cesium/engine/Source/DataSources/PolylineGraphics.js`). Ne pas retomber sur
   le défaut : un grand arc insérerait des points. Context7 n'était pas dans les outils de
   cette passe ; la page officielle et le paquet installé ont été lus.

Altitude = altitude du profil sous A + hauteur d'ancrage A + `z`. Le `y` mécanique ne change
pas ce datum. Le relief swisstopo dessiné n'est pas la donnée de garde.

### 5.2 Projecteur

`localPlane` (`src/lib/map/measure.ts:88-112`) est la géodésie de `src/lib/map/`. Soit
`(e_B, n_B)` les mètres est/nord de B depuis A, `L_h = √(e_B² + n_B²)` :

```text
ê_x = (e_B, n_B) / L_h          est, nord
ê_y = (−n_B, e_B) / L_h         gauche du trajet
est   = x ê_x,est + y ê_y,est
nord  = x ê_x,nord + y ê_y,nord
```

Puis `localPlane.position`. Altitude `topA + z`.

Contrôle, segment plein est, latitude 46°, `y = +10` : la gauche du trajet est le nord.
L'aller-retour sur le plan local rend le nord à `1×10⁻¹⁰ m`. Ce contrôle teste le signe, pas
une géodésique. La corde A–B de ce plan coïncide avec l'interpolation linéaire en degrés,
par construction de `localPlane`. L'erreur « millimètres sur quelques kilomètres » écrite
dans `earthFrame` n'a pas été remesurée ici. Ne pas la citer comme un chiffre de cette note.

`bananePoint` pousse d'une **fraction de longueur** (`src/lib/map/banane.ts:39-55`,
`BANANE_FACTOR = 0,01` dans `src/lib/layout/contract.ts`). Il ne peut pas porter un `y` en
mètres. `earthFrame` sans `y` peut rester un contrôle de non-régression à vent nul et `y = 0`.
Ce n'est plus le chemin de l'écart latéral.

Les trous sont des polylignes séparées avant le générateur. Ne pas compter sur l'accesseur
`defined` de d3, qui coupe aussi, pour inventer la politique : la politique est `trajectoryRuns`.

### 5.3 Terrain et gabarit

```text
z_terrain(x, y) = z_profil(x)
h_clear = z_ligne − z_profil(x) − h_rider
```

Fonction nommée, signature qui prend `y` et l'ignore, commentaire pointant Q16. Pas un oubli
de `zGroundAt`. Hors domaine, bouts tenus, jamais extrapolés. `h_rider` est le gabarit déjà
saisi, retranché en entier (`src/lib/sim/clearance.ts:265`). Défaut non confirmé 2,1 m. Ce
n'est pas une hauteur de corps, pas une distance aux obstacles 3D.

La garde jugée ne se recalcule pas sur la polyligne dessinée. Le réducteur a son pas
(`CLEARANCE.samplesPerStep`). Les vues affichent son nombre.

Pas de nouveau rang de bandeau. Le slot a un occupant (`src/lib/app/banner.ts`). L'extrusion
se documente dans le dispositif existant. La ligne qui contredit le modèle aujourd'hui est
`NOT_COMPUTED_LINES` (`src/lib/rail/provenance.ts:492-495`) : elle dit que la Banane n'est pas
une distance et que la garde sous vent est hors périmètre. La retirer ou la réécrire **dans
le même changement** que la disparition de la Banane. Le libellé est humain (§7).

`SolveNote` (`damped`, `reseeded`, `near-taut-fallback`) reste hors de l'interface
(`src/lib/sim/types.ts:176-183`). Le contact au sol n'est pas un échec de solveur.

## 6. Critères de test

Vitest `node`, sans DOM, sans Cesium (`docs/conventions/testing.md`). Valeur attendue : fixture
§15, invariant, ou forme close différente. Jamais la sortie de la fonction sous test. Les échecs
s'injectent. Ces tests ne valident pas un `C_d`, un partage de brins, une garde hors axe, ni
la descente comme mesure.

Barre des scalaires résolus déjà publiés : `TOLERANCE.solvedScalar = 4×10⁻⁶`
(`src/lib/sim/__fixtures__/theory-15.ts`). Un projecteur sur un segment cardinal est exact
contre son calcul manuel, pas à `4×10⁻⁶` du solveur.

### Descente

| Id | Oracle | Échec veut dire |
| --- | --- | --- |
| D0 | Pente droite 10°, `y = 0`, vent nul, constantes Z8. Drive `m g sin 10° = 153,313976…` N, à `1,6×10⁻⁷` relatif du `153,314` imprimé. Racine `19,8448978…` m/s contre `19,8449`. | La projection ne retrouve pas §15 |
| D1 | Lieu plan, `t_y = 0`, travers pur : course identique à la course sans vent. Invariant, pas un nouveau nombre | `across` a fui dans une norme |
| D2 | Même lieu, `u_air = (u_∥, 0, 0)` : `v_rel,t` égal à `v − u_∥ dx/L` à l'arrondi (`< 10⁻¹²`) | Le signe ou `cos` a bougé |
| D3 | Lieu 3D fabriqué, frottement et traînée nuls : `½v² + g z` conservé au résidu de l'intégrateur (`< 10⁻⁹` sur le cas du §4.4) | Gravité lue sur `step.theta` ou sur `t_x` |
| D4 | Segment `t = (0, 0,6, 0,8)`, `m = 90` : `N = 529,74 N`, pas `0` | `N` utilise `t_x` signé |
| D5 | Z4 ou le couple `(H, V) = (8000, −588,5)` : `|F| = H/cos θ` à l'égalité. Un `F_y ≠ 0` ne passe pas par `H/cos θ` | Diagnostic plan recopié |
| D6 | `coverage < 1` injecté : descente `null`. Aucune course sur la liste compactée | Un trou a été ponté |
| D7 | Point d'arrêt et vitesse d'arrivée portent l'étiquette Estimation. Ils ne changent pas un Verdict | La dynamique a jugé |
| D8 | `C_dA` et les lois `F₀ + k_v|v|` / `μ N` inchangés si l'ellipsoïde statique est branché sur la statique seule | E3 a été codé sans décision |

D0–D2 peuvent comparer la course 3D à `y = 0` avec `ride` actuel : c'est une non-régression
sur l'ancien code, pas un oracle copié de la nouvelle fonction. Z8 reste l'oracle publié.

### Vues, sur un paquet fabriqué

| Id | Oracle |
| --- | --- |
| V0 | Tous les `y` nuls : écart plan nul. Le projecteur n'importe pas `banane.ts`. Changer `BANANE_FACTOR` ne change pas ses sorties |
| V1 | Segment A→B plein est. `(L/2, +10, −5)` est 10 m au nord de l'axe, altitude `topA − 5`. Son miroir `(L/2, −10, −5)` est 10 m au sud. La coupe leur donne le même `(L/2, −5)` |
| V2 | Les trois sorties sont des fonctions pures du même tableau. Basculer une couche de visibilité ne modifie aucun sommet |
| V3 | Le point de Trajectoire à une position résolue est le nœud marqué de la Ligne chargée, pas un autre échantillon |
| V4 | Échec injecté au milieu de la grille : deux plages, aucune arête entre la dernière position résolue d'avant et la première d'après |
| V5 | Position choisie non résolue, pose résolue, autres pas résolus : Ligne chargée absente ; Ligne à vide et plages résolues présentes ; Ligne A–B présente. Pas de Banane, pas de chaînette plane de remplacement |
| V6 | Deux points de même `x` et de `y` différents lisent le même `z_profil(x)`. La garde affichée utilise ce nombre et `h_rider`, pas le maillage |
| V7 | Cause de grille Vent : le paquet dessiné a les `y` du vent non appliqué. Le Scénario garde le Vent saisi |
| V8 | Sans les deux Positions, ou sans profil entre elles, la Vue 3D ne s'ouvre pas |

Le miroir solveur (vent inversé ⇒ `y` changé de signe, `x` et `z` inchangés) est un test de
#127, pas des vues.

## 7. Décisions encore ouvertes

Physique de la projection : rien de bloquant. Les points suivants le sont, et seulement eux.

1. **Phrase d'une position non convergée.** Q24 distingue configuration incompatible et échec
   numérique, et interdit de conclure à une impossibilité physique. La surface actuelle
   `calcul-impossible` dit « ce cas n'est pas censé se produire »
   (`src/lib/app/refusals.ts:79-81`). La réutiliser telle quelle pour une position spatiale
   contredit Q24. Le comportement est fixé (tracé absent, pas de repli, diagnostic copiable).
   La phrase ne l'est pas. Ne pas en inventer une dans le code.
2. **`NOT_COMPUTED_LINES`.** La troisième ligne nie une Banane métrique et une garde sous vent.
   Après ce contrat elle est fausse. La remplacer dans le même changement, sans nouveau
   bandeau, sans lecture d'attestation de versant ni de validation expérimentale. Libellé humain.
3. **Mot du glossaire.** « Banane » est qualitative et interdit « déport » (`GLOSSARY.md`).
   Le commentaire #118 retire la Banane qualitative au profit de l'écart calculé. Garder le mot
   pour la forme en plan désormais mécanique, ou autoriser un autre mot, est humain. Ne pas
   imprimer des mètres sous la définition qualitative actuelle.
4. **Intégration de #120.** Une formule candidate respectant Q25–Q29 est maintenant décrite
   dans `wind-profile-contract-followup.md` et vérifiée indépendamment. La descente et la
   statique consomment la même fonction `prescribedWindKmh`, sans seconde cloche locale.
   La livraison présentant le profil comme appliqué doit brancher effectivement `U(x)` dans
   les consommateurs ; le vent uniforme seul ne couvre pas cette acceptation. La formule
   reste une proposition technique, pas une nouvelle décision du mainteneur.

Hors de cette liste, ne pas redemander : signe de `y`, effacement global (Q24 l'a tranché),
ellipsoïde dessiné (pas de règle Q23 ⇒ pas de corps), terme centrifuge, seuil 0,2, correction
d'énergie, loi `|u_rel|`, H-gate, flèche 3D combinée, #117 (lisibilité Cesium, indépendant ;
ne pas le mêler à la fin de la Banane).

L'unicité de l'inversion `L₀` reste le prérequis de Q33 : ne demander un arbitrage que si une
ambiguïté réelle est montrée. Pas un sujet de cette note.

## 8. Dépendances

| Sujet | État | Cette note |
| --- | --- | --- |
| Émission des sommets `r(S)`, `r_D`, réactions, `\|F\|` amont | #127. Le résultat moteur est encore scalaire (`src/lib/sim/types.ts:20-22`) | Consomme le paquet. Si la forme n'est plus rééchantillonnable, #127 émet les sommets. Les vues exigent seulement que les trois projections lisent les mêmes tableaux |
| `C_D⊥`, portance, traînée axiale, `C_e`, `σ`, `κ_x`, `κ_y` | Non adoptés. #134 est une sonde, pas une donnée produit. Q12 tient `C_dA` à l'écart | Pas de coefficient ici. Un lieu sous vent de production attend ces choix. Les tests D* et V* n'en ont pas besoin |
| `U(ξ)` non uniforme | Proposition revue dans `wind-profile-contract-followup.md` | Consommer la même fonction locale. Ne pas présenter un profil actif tout en conservant la vitesse uniforme de la rose |
| Extrusion | Q16 tranchée, `zGroundAt` ne prend pas `y` | Nommer la fonction. Le réducteur, pas la Vue 3D, juge la garde |
| #124 | Différée | Pas de retour d'inertie, pas de vibration, pas de `−dV_ligne/ds` |
| Copie et glossaire | Questions 1–3 du §7 | Bloquent l'atterrissage visible, pas l'EDO ni le projecteur |

Ordre possible sans question nouvelle : projecteur et tests V* sur paquet manuel ; EDO §4 et
tests D* sur lieu fabriqué et sur Z8 ; branchement au balayage spatial quand #127 émet `r_D` ;
`U(ξ)` non uniforme quand #120 a une formule. La Banane disparaît dans le changement qui
branche le projecteur, pas avant : sinon la vue de dessus n'a plus de tracé latéral et pas
encore de `y`.

## 9. Ce qui a été lu, et les trous

Lu dans le dépôt au commit `f0da795`, plus l'arbre de travail signalé : `AGENTS.md`,
`GLOSSARY.md` (Banane, Vent, Point d'arrêt, Trajectoire, gabarit), ADR-0001,
`docs/conventions/simulation.md`, `docs/conventions/testing.md`, `docs/simulation-theory.md`
§2, §12.2, §15 Z8 (commit) et §18 (arbre de travail seulement), les notes du dossier
spatial-wind, le code cité. Issues #127, #118, #134 et #120 avec leurs commentaires, via
`gh`, le 2026-11-10.

Pages lues le 2026-11-10, pas via Context7 (outil absent de cette passe) :

- Cesium `PolylineGraphics`, version de page 1.147, défaut `arcType = ArcType.GEODESIC`.
  Recoupé sur le paquet installé `cesium@1.147.0`.
- README `d3-shape` v3.2.0 : `line().curve` défaut `curveLinear`, polyligne par les sommets.
  Recoupé sur le paquet installé.
- NASA Glenn, Drag Equation, `https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/`,
  `dateModified` 2025-07-01. Équation et phrase sur l'aire de référence. Pas un essai de passager.

Non relus pour cette note, donc non cités comme preuve nouvelle : Mungan PDF, Jojić 2025 PDF,
Đokić PDF. Les identités qu'ils portent ici sont celles déjà contrôlées dans la revue
énergétique et la note solveur. Le `26,7 m` de Đokić reste une erreur d'impression ; ce n'est
pas un oracle.

Contrôles numériques : script de session `/tmp/descent-views-check.mjs`, **pas un fichier du
dépôt**. Chiffres du §4 et du §6 recopiés depuis sa sortie. `bun run test` n'a pas été lancé.
Aucun solveur spatial n'a été exécuté. Un accord D0–D8 ou V0–V8 ne sera pas une campagne.

## 10. Ancres

| Fait actuel | Où |
| --- | --- |
| Traînée `v − u cos θ`, travers ignoré par construction | `src/lib/sim/dynamics.ts:216-220` |
| `ridePath` saute un `x` qui n'avance pas ; tension `H/cos θ` | `src/lib/sim/dynamics.ts:112-137` |
| Descente absente si `coverage < 1` ; seul `along` est passé | `src/lib/scenario/dynamics.ts:103-112` |
| `across > 0` vers la gauche | `src/lib/sim/wind.ts:14-22` |
| `θ` de corde, côté amont | `src/lib/sim/sweep.ts:175-179`, `src/lib/sim/catenary.ts:73-81` |
| Trajectoire coupée, pas pontée | `src/lib/chart/scene.ts:546-574` |
| Échec de position ⇒ scène entière jetée | `src/components/chart/chart-block.tsx:171-173`, `src/lib/map/vue-3d.ts:242-248` |
| Banane qualitative, `BANANE_FACTOR = 0,01` | `src/lib/map/banane.ts:39-55`, `src/lib/layout/contract.ts` |
| Plan local | `src/lib/map/measure.ts:88-112` |
| `ArcType.NONE` déjà imposé | `src/components/map/vue-3d-renderer.ts:488` |
| Garde `z(x) − h_rider` | `src/lib/sim/clearance.ts:265`, `src/lib/sim/terrain.ts:51-64` |
| Phrase « pas censé se produire » | `src/lib/app/refusals.ts:79-81` |
| Ligne de provenance à réécrire avec la Banane | `src/lib/rail/provenance.ts:492-495` |
