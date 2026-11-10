# Agent readiness — solveur spatial et descente à sens unique (#127)

Note de préparation du 2026-11-10. **Pas une spécification adoptée, pas un facteur de
sécurité, pas une validation expérimentale.** Elle borne ce qu’un agent peut implémenter
sans réinterroger le mainteneur, et les deux questions qui restent bloquantes pour
certains pilotes. Les arbitrages consolidés des derniers commentaires de
[#127](https://github.com/fuzoh/simu-tyro/issues/127) et
[#124](https://github.com/fuzoh/simu-tyro/issues/124) prévalent sur cette note et sur
les recommandations antérieures de
[Équilibre spatial sous gravité et vent](../equilibre%20spatial%20vent.md).

Autres agents : aérodynamique (coefficients, ellipsoïde, diamètre), interface du profil
de vent (#120), contrats de vues (#118). Cette note ne les tranche pas. Elle fixe
l’interface que le solveur consomme.

Contrôles applicables à **ce fichier seul** : rien dans
[CONTRIBUTING.md § Checks](../../../CONTRIBUTING.md#checks). `**/*.md` est ignoré par
oxfmt ; `typecheck`, `lint-type-aware` et `test:ci` ne lisent pas ce chemin. Aucun test
n’a été exécuté pour la rédiger. Une implémentation sous `src/lib/sim/` devra, elle,
mettre à jour `docs/simulation-theory.md` **avant** le code
([docs/conventions/simulation.md](../../conventions/simulation.md)) et passer le
`bun run test` complet, pas seulement `test:ci`.

## 1. Déjà tranché — ne pas rouvrir

| Point | Décision | Conséquence pour le solveur |
| --- | --- | --- |
| Statique | Passager immobile, maintenu au chariot. Poids et force aérodynamique statique intégralement transmis. Le maintien fait partie de l’idéalisation. | `s_D` est imposé. Pas d’équilibre de roulement libre qui déplacerait `s_D`. |
| Retour d’inertie | Aucun. Pas d’inertie de ligne, vibration, oscillation, rotation, balancement. | La vitesse de descente ne recharge pas la forme ni les tensions. |
| Architecture | Équilibres statiques → lieu du chariot → descente. | Le lieu n’est pas la forme d’une ligne chargée. Le défilement n’est pas un temps de ligne. |
| Énergie | Limite documentée. Pas de correction silencieuse. #124 différée. | Interdit d’ajouter `−dV_ligne/ds` à l’EDO. |
| Vent | Un seul vent de Scénario pour la pose, les équilibres et la descente. Horizontal. Champ indexé le long de A–B, identique à toute hauteur et tout déport, non advecté par la déformation. | Pas de second vent. Pas de champ en `y` ou `z`. |
| Pose | Tension de pose = tension à l’ancrage de la Mise en tension, ligne à vide, sous ce vent. Le dispositif est ensuite bloqué. Résoudre `L₀`, puis le figer. Changer le vent avec ce pilote recalcule `L₀`. Ne pas imposer `L₀` et la tension à la fois. | `lo` reste l’entrée fixe. `tp` est une inversion sous le vent affiché. |
| Matériau | `EA` constant. Acier et textile restent des chaînes distinctes. #133 ne bloque pas. | `λ = 1 + T/EA`. Pas de loi non linéaire. |
| Deux brins | Mêmes propriétés, même `L₀`, même géométrie, même exposition. Chaque brin reçoit la moitié du poids **et** de la force aérodynamique du passager, son propre poids et son propre vent réparti. Pas de sillage. Partage supposé, ni garanti ni présenté comme conservatif. Conserver « une seule ligne porte tout ». | Étendre le partage scalaire déjà codé, ne pas l’étendre au vent réparti. |
| Garde | Gabarit vertical actuel. Pas de déport du passager hors du chariot. | Le solveur ne déplace pas le passager en `y` relativement au nœud. |

## 2. Repère — décidable sans question

Le moteur ne prend pas de Positions ([docs/conventions/simulation.md](../../conventions/simulation.md)).
Le gisement A→B reste dehors. Le repère du solveur prolonge le repère déjà fixé par
`windComponents` (`src/lib/sim/wind.ts`) :

- origine à l’ancrage A ;
- `x` horizontal le long de A→B, B en `(L, 0, h)`, `z` vers le haut comme aujourd’hui ;
- `y` horizontal, **positif vers la gauche du trajet**, même signe que `WindComponents.across`
  (un vent venant de la droite, `from − bearing = 90°`, a `across > 0` et pousse vers +y).

`S` reste l’abscisse matérielle non étirée depuis A, variable de balayage
(`docs/simulation-theory.md` §6.2, `sweepGrid`). L’arc étiré `σ` est une lecture, pas
l’inconnue. Ancres : `r(0) = (0,0,0)`, `r(L₀) = (L, 0, h)`.

Le champ de vent fourni par #120 est une fonction de l’abscisse horizontale `x ∈ [0, L]`,
pas de `y`, pas de `z`, pas de `S`. L’évaluer en `x(S)` courant est la lecture géométrique
d’un champ fixe sur l’axe de portée. Cela couple légèrement la charge à la forme : un
profil non constant interdit une chaînette unique par segment (voir §4). Ne pas échantillonner
le profil à la position latérale du câble.

## 3. Pilotes de tension

Cinq quantités aujourd’hui (`GLOSSARY.md`, `TightnessSpec`, `engineTightness`) : `lo`,
`tp`, `te` (`H`), `fl` (flèche à vide), `vr` (rapport V = `P/H`, hors moteur). Les
définitions spatiales de la flèche, de `H` et du rapport V ont été explicitement laissées
ouvertes : ne pas les inventer dans le code.

### 3.1 Décidable maintenant

**`lo`.** `L₀` est l’entrée. Le vent change les réactions, pas `L₀`.

**`tp`.** La tension de pose est le module `|F|` à l’ancrage de la Mise en tension sur la
ligne à vide sous le vent du Scénario. C’est la lecture dynamomètre déjà définie, pas une
généralisation. Inverser `L₀` pour que ce module égale la cible, puis figer `L₀` pour tout
le balayage. Réutiliser la structure actuelle : plancher §5.4, croissance du mou,
bissection, et recherche du minimum sur la branche tendue si la quantité remonte
(`parameterise.ts`, mode `anchor`, qui n’est déjà pas monotone). Une cible sous le minimum
est `no-convergence` (« Cible inatteignable »), pas une seconde racine. Une cible au-delà
du module lu au plancher est `invalid-input` dans `T_target`, borne = ce module. La
monotonie 3D n’est pas prouvée ; le code ne doit pas l’affirmer.

Le plancher `L₀ > corde / (1 + charge de rupture / EA)` reste géométrique. Il ne dépend
pas du vent. La borne réémise, elle, est lue sur la résolution spatiale à ce plancher :
elle changera avec le vent. Ne pas réutiliser le « 9 074 daN » du cas sans vent comme
borne spatiale.

**`vr`.** Reste `P / H` hors du moteur (`src/lib/scenario/tightness.ts`). Pas de
définition spatiale propre. Il suit le sort de `H`.

**Lecture de flèche, pas le pilote.** La flèche affichée reste la plus grande chute
verticale de la ligne à vide sous la corde A–B, `y` ignoré — formule actuelle de
`unloadedSag`. Đokić et al. 2026 séparent `f_max` (flèche, éq. 7 et 9, p. A91) et `b_u`
(déport latéral, p. A92). On ne reprend ni leur formule de balancement ni leurs nombres
(§8). Le déport latéral maximal est une lecture distincte, en mètres, pas une flèche.

### 3.2 Question bloquante — `H` et rapport V

`H` est aujourd’hui la composante horizontale constante le long de A–B, conséquence des
charges verticales (`docs/simulation-theory.md` §4.1 et §6.1). Sous charge horizontale
répartie elle n’est plus constante. Trois options, une seule à adopter :

| Id | Définition | Effet |
| --- | --- | --- |
| **H-gate** (recommandé tant que Q1 n’est pas acceptée) | Si la charge à vide n’est pas verticale, `te` et `vr` ne sont pas résolus. L’état du lien est conservé (ADR-0001) et gaté. `lo` et `tp` fonctionnent. | N’invente pas de généralisation. Bloque deux pilotes, pas le moteur. |
| **H-x** (recommandé si le mainteneur veut garder les liens `te`/`vr`) | Cible = composante de `F` selon `e_x` à l’ancrage de la Mise en tension, ligne à vide, sous le vent affiché. Même station que la tension de pose. Les autres stations sont des lectures. | Prolonge le nom « tension horizontale » sans mélanger le travers. Monotonie non prouvée : même branche tendue que `tp`. |
| **H-horiz** (écartée) | Module de la projection horizontale de `F` à cet ancrage, `√(F_x²+F_y²)`. | Un travers pur augmente la « tension horizontale » sans que l’utilisateur ait tendu la portée. |

Ne pas coder H-x ni H-horiz avant acceptation. H-gate est le défaut implémentable.
Action de réparation recommandée, libellé à figer côté Rail et non ici : passer au pilote
tension de pose, ou à la longueur à vide, via le préremplissage déjà fait par
`switchTightness`. Pas de substitution silencieuse.

### 3.3 Question de confirmation — pilote flèche

| Id | Définition du pilote sous vent | Effet |
| --- | --- | --- |
| **F1** (recommandé) | La cible reste la chute verticale sous la corde, `y` ignoré. Le déport est un résultat. | Identité de `unloadedSag` et du glossaire. La graine parabolique `w L²/(8D)` n’est qu’une graine. |
| F2 | Distance perpendiculaire maximale à la corde 3D. | Change ce que « flèche / portée » demande, et couple le pilote au déport. |
| F3 | Flèche dans le plan de la charge résultante. | C’est `f_plan` de la note préparatoire, explicitement distincte de la flèche verticale. Ne pas l’afficher comme flèche. |

F1 peut être codé comme défaut. Si le mainteneur refuse F1, appliquer le même gate que
H-gate au pilote `fl` seulement. Ne pas coder F2 ou F3.

## 4. Solveur — options bornées

Équilibre local déjà écrit dans la note préparatoire, et c’est la physique à coder, pas
une nouvelle loi :

```text
dF/dS = −q₀
T = |F|
dr/dS = (1 + T/EA) F/T
```

`F(S⁺) − F(S⁻) = −P_ext` au chariot, position continue. Signe aligné sur le code actuel
(`verticalTensionAt` : un poids vers le bas augmente `V` pour `s > s_P`). Mungan et
Lipscombe 2011, éq. 1 et note sous l’éq. 3, ont l’axe vertical vers le bas et ne traitent
qu’un poids : `T cos θ` est continu parce que le poids n’a pas de composante horizontale.
Un `P_ext` horizontal saute la composante correspondante. Ne pas recopier leur signe.
Ne pas imposer `T₁ = T₂` (théorie §6.1 : le chariot n’est pas une poulie).

`q₀` est en N par mètre **non étiré**. Si l’aérodynamique fournit une force par mètre
étiré `f`, alors `q₀ = λ f`. Le facteur doit être explicite. Poids propre : `q₀` contient
`(0, 0, −w)` avec `w` par mètre non étiré, non divisé entre les brins.

### 4.1 S-U — charge prescrite constante par segment (recommandé en premier)

Si `q₀` est un vecteur constant sur un segment, `F(S) = F_A − q₀ S` reste dans le plan
de `F_A` et `q₀`. La courbe du segment est plane. On peut appeler la chaînette élastique
actuelle **après** transformation des ancrages, pas avec les `(L, h)` géographiques dès
que la charge n’est pas verticale.

Transformation, re-dérivée le 2026-11-10 et identique à la note préparatoire §2 (la revue
énergétique l’avait déjà recalculée) : `e_∥ = −q₀/|q₀|`, `h_∥ = Δr · e_∥`,
`L_⊥ = |Δr − h_∥ e_∥|`. Pour `Δr = (L, 0, h)` et `q₀ = (0, q_h, −w)` :

```text
h_∥ = h w / √(w² + q_h²)
L_⊥ = √(L² + h² q_h² / (w² + q_h²))
```

`L_⊥ = 0` (ancrages alignés avec la charge) est un cas distinct : ne pas appeler la
fermeture plane. Inconnues : les trois composantes de la réaction en A, fermeture
`r(L₀) = r_B`. Newton amorti, comme `solve.ts`. Continuation : pas précédent du balayage,
puis solution à vent nul, puis les graines §5.2. Une graine qui échoue coûte une tentative,
elle ne devient pas une réponse.

La Jacobienne plane tournée ne suffit pas quand le repère du segment dépend de la
réaction inconnue (note préparatoire §2). Pour une charge constante connue, le plan de
`q₀` est connu, mais le plan de la courbe dépend encore de `F_A`. Exiger un contrôle aux
différences finies avant de faire confiance à une Jacobienne 3D analytique. Une première
implémentation peut n’utiliser que les différences finies ; le test d’invariant reste
obligatoire (§7).

Cette réduction est fausse dès que `q₀` dépend de la tangente, ou varie continûment avec
`x` le long du segment. Un profil #120 non constant se traite par sous-segments à `q₀`
gelé, ou par S-T. Le résidu mécanique se juge après mise à jour de la charge, pas sur
l’itération de charge seule.

### 4.2 S-T — charge dépendant de la tangente (seulement si l’aéro le demande)

Ne pas déguiser cette charge en S-U. Options, par ordre :

1. **Tir** depuis A, inconnue `F_A`, intégration de l’EDO locale, fermeture sur `r_B`.
   Jacobienne par différences finies. Pas de pas d’intégration universel : raffiner
   jusqu’à ce que le résidu d’ancrage et le bilan de force passent les barres du §6.
2. **Charges gelées** comme accélérateur du tir, accepté seulement si le résidu
   mécanique de la charge mise à jour passe les mêmes barres.
3. **Éléments de câble ou collocation.** Plus général, perd la forme close que les
   fixtures verrouillent. Pas le premier moteur.

Pas de dépendance nouvelle. Le moteur est sans dépendance et s’exécute dans le
navigateur (`src/lib/sim/types.ts`). Context7, consulté le 2026-11-10, résout SciPy
(`/scipy/scipy`, versions indexées dont v1.16.1 et v1.18.1) et ne résout pas de
bibliothèque TypeScript de chaînette : la recherche « typescript elastic catenary »
renvoie la doc du langage, pas un paquet. La requête `ctx7 docs` sur SciPy n’a pas
renvoyé un passage citable. SciPy n’est de toute façon pas embarquable ici. MoorPy 1.3.0
(`Catenary.py` au tag `v1.3.0`, lu le 2026-11-10) est un solveur **plan** `(XF, ZF)`,
tolérance absolue par défaut `1e-6` m, `slack_kx = 0.01·|W|`, `a_max = 1.2`. C’est le
précédent déjà adopté pour le plan, pas un solveur de vent 3D.

### 4.3 Plancher de mou

`horizontalTensionFloor(w) = 0.01·|w|` ne se relit pas sur le `H` géographique si la
charge n’est pas verticale. Dans le plan de charge, même facteur numérique déjà adopté,
appliqué à `|q₀|` : composante perpendiculaire à `q₀` plancher à `0.01·|q₀|`. Une
recherche de pas qui ne peut pas quitter ce plancher est `slack-limit`, comme aujourd’hui.
Ce n’est pas un coefficient physique nouveau ; c’est le plancher MoorPy déjà cité en
§4.3 de la théorie, écrit dans le plan de la charge. Ne pas l’étendre à un frottement de
sol : le contact terrain reste hors du solveur.

### 4.4 Deux brins

`memberLoad` (`src/lib/scenario/traverse.ts`) divise aujourd’hui le poids. L’étendre au
vecteur `P_ext` du passager, aérodynamique statique comprise, et à rien d’autre.
`soleCarrier` reste le cas « une seule ligne porte tout », tensions seules, sans verdict,
comme le commentaire #69 le demande. Deux calculs identiques doivent reproduire le calcul
partagé ; un cas dissymétrique n’est pas déguisé en 50/50.

## 5. Contrat de résultats et indisponibilité

Échec = valeur, jamais une exception au milieu d’un balayage (`SolveResult`). Trois
espèces, pas une quatrième « spatiale ». Les phrases existent déjà
(`src/lib/app/refusals.ts`, `src/lib/app/banner.ts`) :

| Situation | Espèce | Phrase existante |
| --- | --- | --- |
| Géométrie ou cible non finie, `L₀` sous le plancher, cible au-delà du plancher | `invalid-input`, borne dans la quantité pilotée | « Aucun résultat — tension impossible. » |
| Inversion sans racine sur la branche tendue | `no-convergence` | « Aucun résultat — cible inatteignable. » |
| Newton épuisé, `L_⊥ = 0` non traité, résidu de force hors barre | `no-convergence` | « Aucun résultat — calcul impossible. » |
| Plancher de mou atteint | `slack-limit` | même phrase « calcul impossible » |

« Calcul impossible » dit que le solveur n’a pas convergé et que le cas n’est pas
censé se produire. Ne pas l’utiliser pour un pilote que l’on a **refusé d’interpréter**.
H-gate, et le gate de flèche si F1 est refusée, ne lance pas le solveur, ni le solveur
plan à la place. C’est une grille du Rail : l’état arrive tel quel (ADR-0001), la
sortie est supprimée sous « Aucun résultat ». L’action de réparation recommandée est
le changement de pilote déjà prérempli par `switchTightness`. Le libellé de cette
grille s’écrit avec les autres chaînes du Rail ; ce n’est pas une quatrième espèce
d’erreur moteur.

`SolveNote` ne va toujours pas à l’interface. Pas de nouveau bandeau pour distinguer
les approximations du reste du moteur : le mainteneur l’a refusé. L’indisponibilité
n’est pas une approximation ; elle réutilise les phrases ci-dessus.

Trois états déjà séparés dans `banner.ts` : rien n’a été tenté, ou la pose est refusée
→ « Aucun résultat » ; un balayage a été tenté et des pas manquent → `Indéterminé`
(le « — » du verdict) ; un pas a convergé → le nombre reste.

`coverage < 1` supprime le verdict (`Indéterminé`) et ne le qualifie pas
(`verdict.ts`). Les pas convergents restent affichables. `readDynamics` retourne déjà
`null` si `coverage < 1` (`src/lib/scenario/dynamics.ts`) : une descente à travers un
trou serait une pente non résolue. Conserver cette règle. Ne pas intégrer le sous-ensemble
résolu. Ne pas remplacer une forme manquante par la Banane qualitative ni par le solveur
plan présenté comme résultat spatial. Ne pas extrapoler un terrain hors axe : le solveur
n’émet pas `z_terrain`. Q16 (extrusion latérale du profil) est tranchée ailleurs ; ce
module ne la réalise pas.

Une pose qui échoue ne produit pas de `L₀`, donc pas de balayage et pas de descente.
Même règle qu’aujourd’hui pour `resolveL0`.

Le contrat de forme, pour les vues qui projetteront ensuite : pour chaque équilibre,
`r(S)` en mètres dans le repère du §2, les deux réactions d’ancrage, `T_max`, et le nœud
du chariot `(s_D, r_D)`. Le lieu est la suite des `r_D`, pas un échantillon de la ligne
chargée. Scalaires seulement, pas de polyligne stockée dans l’état — `sample` reste une
fonction, comme `sampleCable`. Les vues ne sont pas spécifiées ici.

## 6. Descente à sens unique

### 6.1 Chemin

L’EDO suit la polyligne du lieu, ancrages compris, pas `step.theta`. Jojić, Vladić et
Đokić 2025, éq. 8–12 et le paragraphe qui les précède (PDF p. 194) : `γ` est la pente du
lieu, continue ; `α` est la pente de corde, discontinue au chariot ; l’éq. 10 pose
`γ = (α_l + α_r)/2`, qui n’est la tangente d’aucun des deux brins ; l’éq. 18 utilise
`sin γ`. Leur figure 2 avertit de ne pas confondre lieu et forme. Mungan, légende de la
figure 2, dit la même chose. La revue énergétique a contrôlé que le moteur actuel intègre
déjà `(x_D, z_D)` et n’utilise `step.theta` que pour `T = H/cos θ` dans `v/c`.

En spatial : tangente unitaire `t` du segment de lieu. Gravité le long du trajet :
`−g t_z` (`z` vers le haut). À déport nul, `t` est dans le plan vertical et l’équation
retombe sur `dynamics.ts`. Remplacer `t` par `step.theta` serait une régression, déjà
écartée dans le plan.

### 6.2 Frottement — ne pas recalibrer

Reprendre les deux lois telles quelles (`docs/simulation-theory.md` §12.2) :

- corde, `[FIELD:SSF]` : `F₀ + k_v |v|`, indépendant du poids, un seul `F₀` quel que soit
  le nombre de brins (deux gorges qui additionneraient `F₀` : non établi) ;
- câble, `[CONVENTION]` non confirmé : `μ N` avec `μ = 0,015`. En spatial,
  `N = m g √(t_x² + t_y²)`, identité de `μ m g cos θ` pour l’inclinaison du **lieu** sur
  l’horizontale. Pas de dévers, pas de terme centrifuge.

Le terme centrifuge de Jojić (éq. 13–15, dans `N`) et celui, optionnel, de la théorie
§12.2 sont hors de cette livraison. #89 ne le demande pas. L’ajouter serait une
modification de physique, pas une projection.

### 6.3 Traînée — projection, pas une nouvelle loi

Jusqu’à décision aérodynamique explicite dans la théorie :

```text
v_rel,t = v − u_air · t
F_drag,t = ½ ρ C_dA v_rel,t |v_rel,t|
```

`u_air` est le vent horizontal du Scénario dans le repère du §2, le même champ que la
ligne, évalué à l’`x` du chariot. `v` est la vitesse du passager le long du lieu. Cette
projection est l’identité 3D de « le vent entre par sa projection sur la tangente ». Sur
un lieu plan (`t_y = 0`) elle redonne l’équation actuelle : un travers pur ne change
rien. C’est le test de non-régression.

La loi quadratique spatiale `|u_rel|` puis projection tangentielle change la traînée
longitudinale même sur un lieu plan sous travers. La théorie §12.2 dit qu’elle n’est pas
validée, ni l’usage isotrope du `C_dA` SSF. **Ne pas l’introduire ici.** Si l’agent
aérodynamique l’adopte, ce sera une modification nommée de §12.2, pas un effet de bord
du solveur spatial.

La force statique sur la ligne, elle, ne voit pas `v`. Pas de double comptage : la
descente ne renvoie rien à `P_ext`.

### 6.4 Énergie — diagnostic seulement

Sur un lieu figé, sans frottement ni traînée, l’intégrateur conserve `½mv² + mgz`. Le
test planaire existe (`dynamics.test.ts`). L’étendre au lieu 3D, même quantité, même
interdiction.

Ne pas ajouter `−dV_ligne/ds`. La revue énergétique donne la réduction lagrangienne et
dit pourquoi elle est fausse dès que la forme n’est plus l’équilibre du balayage. Le
mainteneur a interdit la correction silencieuse. Un test peut **rapporter**
`|ΔV_ligne| / (m g |Δz|)` sur un balayage, avec

```text
V_ligne = ∫ w z dS + ∫ T²/(2 EA) dS
```

intégrales en `S` non étiré, loi `EA` constant (revue énergétique, relue sur le code).
Ce rapport n’a pas de seuil. Il ne fait pas échouer le test, n’entre pas dans l’EDO, ne
s’affiche pas. Aucun nombre n’a été calculé sur un balayage du dépôt dans cette note.

### 6.5 `v/c`

Mungan, note 1, PDF USNA lu le 2026-11-10 : « slowly » = accélération négligeable **et**
`υ ≪ √(T_min L / m)`, `T_min` là où l’angle avec l’horizontale est minimal. Aucun 0,2.
Le `0,2` de `DYNAMICS.quasiStaticLimit` reste une convention interne. Ne pas le
« corriger » vers `T_min`, ni vers `√(T λ / μ₀)`, dans cette livraison : ce serait
changer un avertissement sans borne d’erreur validée.

En spatial, la tension locale du diagnostic est `|F|` au nœud, côté amont comme
`verticalTensionAt` aujourd’hui — pas `H/cos θ`, qui suppose un tangente dans le plan
vertical et un `H` porteur de toute la tension horizontale. À vent nul et déport nul,
`|F|` doit retrouver `H/cos θ`. Le rapport affiché reste plus petit que celui de Mungan
si on ne prend pas `T_min` ; le dire dans le commentaire, ne pas le masquer.

## 7. Convergence, couverture, tolérances

Ne pas inventer de barre physique.

| Barre | Valeur | Statut |
| --- | --- | --- |
| Résidu d’ancrage | `‖r(L₀) − r_B‖ ≤ 1×10⁻⁶` m si `L ≤ 1000` m, sinon `1×10⁻⁶·L` | Extension de §5.3 au norme 3D. MoorPy 1.3.0 documente la même tolérance absolue de déplacement en 2D (`Tol=0.000001`). |
| Bilan global, élément analytique | `1×10⁻¹⁰` N sur les fixtures, comme le bilan de charge ponctuelle déjà exigé | Tripwire de signe. Un écart qui n’est pas un arrondi est un bug, pas un mode plus lâche. |
| Bilan, intégration S-T | `\|ΔF\| ≤ EA · residualTolerance(L) / L₀` | Conséquence déjà écrite en §5.3 : une erreur de longueur `ε` se relit en tension `≈ EA·ε/L₀`. Pas un coefficient nouveau. Refuser (`no-convergence`) si la position passe et la force non. |
| Couverture | `solved / grid.length`, grille matérielle inchangée, 260 au défaut | `coverage < 1` ⇒ verdict `Indéterminé`, descente absente. |
| Inversion | `bracketTolerance` `1×10⁻¹³` relatif sur `L₀`, 80 bissections, 64 doublements | Déjà dans `PARAMETERISE`. Les réutiliser. La limite reste le solveur, pas la boucle. |
| Jacobienne analytique, si elle existe | écart aux différences finies `< 2×10⁻⁹` comme F1 | Cible de test, pas une preuve qu’elle sera tenue au premier jet. |
| Notes et espèces rares | injectées, pas chassées | `docs/conventions/testing.md`. Ne pas élargir `solveSpan` pour les atteindre. |

Pas de cap d’itérations nouveau. `maxAttempts = 5`, `maxIterations = 100`,
`stepGrowthCap = 1.2` restent ceux du plan, jusqu’à mesure. Ne pas les « améliorer »
dans la spécification.

## 8. Essais numériques de référence

Validation numérique ≠ validation expérimentale. Aucun de ces cas ne valide un `C_d`,
un partage de brins, une garde hors axe, ni la descente comme mesure.

Règle de [docs/conventions/testing.md](../../conventions/testing.md) : la valeur
attendue ne sort pas du code sous test, ni d’une réimplémentation de sa formule dans le
test. Les oracles permis sont les fixtures §15, un invariant, ou une forme close
**différente** (chaînette inextensible).

| Id | Oracle | Ce que l’échec veut dire | Ne valide pas |
| --- | --- | --- | --- |
| N0 | Vent nul, `q_h = 0`, `P_y = 0` : nombres publiés Z1–Z6, Z4, Z5 (`src/lib/sim/__fixtures__/theory-15.ts`), barres actuelles (`4×10⁻⁶` relatif sur les scalaires résolus) | Régression du spatial sur le plan déjà recoupé MoorPy | L’aérodynamique |
| N1 | Géométrie seule, avant tout solve : `h_∥` et `L_⊥` de §4.1 sur un cas chiffré à la main dans le test | La transformation d’ancrages | La chaînette |
| N2 | Charge vectorielle constante, à vide, portée de niveau : planéité, fermeture d’ancrages à la barre §7, bilan `F_B − F_A + q₀ L₀ = 0`, symétrie miroir si `q_h → −q_h` | Le cadre et le signe | Un produit `C_d` |
| N3 | `EA → 10¹⁴` contre la chaînette inextensible `y = C cosh(x/C)` dans le plan de charge, 7 chiffres comme §15 | La limite raide | Le textile réel |
| N4 | Faible flèche : `b ≈ q_h L² / (8H)` **dans ses hypothèses** (charge transverse uniforme par abscisse, petit rapport). Écart relatif borné par l’hypothèse, pas une égalité | L’asymptote | Les grandes flèches, et Đokić |
| N5 | Charge ponctuelle : continuité de `r`, saut `F⁺ − F⁻ = −P_ext`, bilan global. Z4 à vent nul | Le nœud | L’inertie |
| N6 | Deux méthodes sur un même cas S-U (segments analytiques contre tir) : positions à la barre §7 | L’indépendance du schéma | Le produit |
| N7 | Lieu 3D sans frottement ni traînée : `½mv² + mgz` conservé. À `y = 0`, la descente et Z8 retrouvent le plan, y compris « un travers pur ne change rien » | La projection | L’énergie de ligne |
| N8 | Diagnostic `|ΔV_ligne|/(m g \|Δz\|)` affiché dans le rapport de test, sans seuil et sans assertion d’égalité | Que le terme oublié est visible | Un critère d’acceptation |
| N9 | Đokić p. A92 **n’est pas un oracle** | — | — |

N9, contrôlé le 2026-11-10 sur le PDF
`https://www.et.kg.ac.rs/wp-content/uploads/2026/09/et2026-a11.pdf` : la page A92 imprime
`52,7 sin 27,8° = 26,7` m. Le produit vaut `24,5786…` m. `85,9 sin 41,1° = 56,4685…` m,
cohérent avec le `56,5` m imprimé. Les angles 27,8° et 41,1° viennent du cas EN 12929
réduit (p. A90–A91, `arctg(0,53)` et `arctg(0,87)`), pas des 55,5° et 32,2° du §4.1.3.
Les `c_f = 1,2` et les clauses EN 12929 / EN 12930 citées n’ont pas été relues. Ne pas
en tirer un coefficient ni une flèche de référence.

Mungan n’est pas un oracle élastique : câble inextensible, axe vertical vers le bas.
Jojić 2025 : la comparaison ADAMS porte sur une trajectoire **imposée** (« predetermined
trajectory », expression (1) importée, p. 195) et la conclusion limite l’abandon du
balancement aux **faibles inclinaisons**. Ce n’est pas une validation du câble déformable,
ni de cette descente.

## 9. Ordre d’implémentation

Chaque ligne qui touche `src/lib/sim/` commence par `docs/simulation-theory.md`, avec
sa source. Cette note ne remplace pas cette mise à jour.

1. Repère §2 et fournisseur de charge : `q₀(x)` et `P_ext` en newtons, sans coefficient
   dedans. L’aérodynamique branche ensuite.
2. S-U à vide, N0–N3. Zéro vent d’abord.
3. Inversion `tp` et `lo` sous `q₀` constant. H-gate pour `te`/`vr` tant que Q1 est
   ouverte. F1 pour la lecture de flèche ; pilote flèche seulement si F1 est acceptée,
   sinon gate.
4. Charge ponctuelle, balayage `s_D`, lieu. N5. Partage vectoriel des deux brins et
   `soleCarrier`.
5. Descente §6 sur le lieu, N7. Pas de terme d’énergie. N8 en diagnostic de test.
6. S-T seulement si le fournisseur de charge dépend de la tangente ou si le profil #120
   n’est pas constant par segment. N6 sur un cas qui reste dans S-U, pour comparer.
7. Ne pas ouvrir #124, #133, le terme centrifuge, ni une loi `|u_rel|`.

Dépendances bloquantes externes à cette note :

- forme exacte de `q₀` (agent aérodynamique) — S-U se construit sans elle, contre un
  fournisseur ; S-T attend la dépendance à la tangente ;
- courbe et largeur du profil (#120) — le solveur n’en choisit pas ;
- projection des vues et extrusion de terrain (#118, Q16) — le solveur émet `r`, pas une
  garde hors axe.

## 10. Sans question / à trancher

### Un agent peut décider

Repère §2 ; `S` et grille inchangés ; `tp` = `|F|` à l’ancrage de mise en tension ;
`lo` figé ; lecture de flèche verticale ; `vr` esclave de `H` ; H-gate par défaut ;
S-U d’abord, S-T seulement si la charge l’exige ; pas de bibliothèque numérique ;
plancher de mou `0,01·|q₀|` dans le plan de charge ; trois espèces d’erreur inchangées ;
`coverage < 1` supprime verdict et descente ; pas de Banane de repli ; lieu ≠ corde ;
frottements §12.2 sans terme centrifuge ; projection `u · t` qui redonne le plan ;
pas de `−dV_ligne/ds` ; `v/c` à `|F|` local, seuil 0,2 non promu ; barres du §7 ;
partage 50/50 du seul `P_ext`, vent réparti non divisé, `soleCarrier` conservé.

### Questions mainteneur, par priorité

1. **Bloquant pour `te` et `vr` seulement.** Accepter **H-x** (composante `F · e_x` à
   l’ancrage de mise en tension), ou confirmer **H-gate** (ces deux pilotes refusés dès
   que la charge à vide n’est pas verticale) ? Recommandation : H-gate pour livrer, H-x
   si les liens `te`/`vr` doivent survivre au vent. Pas H-horiz.
2. **Confirmation, non bloquante pour `lo`/`tp`.** Le pilote flèche sous vent reste-t-il
   la chute verticale sous la corde (**F1**) ? Recommandation : oui. Sinon, gate du seul
   pilote `fl`, pas F2 ni F3.

Pas d’autre question. L’absence de mesure propre, le refus d’un bandeau nouveau, et le
refus d’une correction d’énergie sont déjà tranchés.

## 11. Sources lues, et ce qui ne l’a pas été

Lues pour cette note, le 2026-11-10 :

- Dépôt au commit de travail `c216fea` (main, propre au début de la recherche) : moteur
  `src/lib/sim/` (`solve.ts`, `parameterise.ts`, `catenary.ts`, `dynamics.ts`,
  `sweep.ts`, `wind.ts`, `types.ts`, `verdict.ts`), `src/lib/scenario/tightness.ts`,
  `traverse.ts`, `dynamics.ts`, fixtures `theory-15.ts`, `GLOSSARY.md`,
  `docs/simulation-theory.md` §§4–7 et §12, `docs/conventions/testing.md`,
  ADR-0001, note préparatoire et revue énergétique.
- Mungan et Lipscombe, *Traveling along a zipline*, Lat. Am. J. Phys. Educ. 5 (2011),
  PDF USNA, note 1, éq. 1–3, légende figure 2.
  <https://www.usna.edu/Users/physics/mungan/_files/documents/Publications/LAJPE6.pdf>
- Đokić, Vladić et Jojić, Engineering TODAY (2026), PDF éditeur, pp. A90–A92, éq. 5–10.
  <https://doi.org/10.46793/ET26.A11DJ>
- Jojić, Vladić et Đokić, *Forming of zipline mathematical model* (2025), PDF, éq. 8–18
  et §3 ADAMS, pp. 194–196. <https://doi.org/10.46793/til2025.193j>
- MoorPy `v1.3.0`, `moorpy/Catenary.py`, docstring de `catenary` (tolérance, `slack_kx`).
  Tag GitHub, pas un SHA résolu.

Non ouverts, donc non cités comme preuve : Irvine 1981, Peyrot et Goulois 1979,
Impollonia et al. 2011 (ScienceDirect 403), clauses EN 12929 / EN 12930 / EN 15567,
Jojić et al. 2023 *Archive of Applied Mechanics*. Aucune équation de ces textes n’est
revendiquée ici au-delà de ce que `docs/simulation-theory.md` attribue déjà et marque
comme re-dérivé ou non relu.

Deux lectures parallèles ont rendu des résumés, pas des passages cités. Elles
confirment le pipeline déjà lu ici. L’une recommande H-x d’emblée ; cette note ne
le code pas tant que Q1 n’est pas acceptée. L’autre mentionne un rejet d’OpenSees
`CatenaryCable` sans URL ni extrait : ce rejet n’est pas une source de cette note,
et OpenSees n’a pas été ouvert ici. Les affirmations ci-dessus viennent des lectures
de ce fil.

## 12. Ce que cette note ne fait pas

Elle n’adopte aucun coefficient aérodynamique, aucun facteur de sécurité, aucun seuil
énergétique, aucune prétention que le quasi-statique vaut une mesure. Un accord N0–N8
est une validation numérique du schéma contre des formes closes et des fixtures déjà
recoupées. Il ne remplace pas une campagne sur une tyrolienne.
