# Préparation — contrat des vues (#118) et expérience de lisibilité (#117)

Note de recherche du 2026-11-10, commit `c216feadb7878d2a90af7d6e37540b3600e89e60`. Elle prépare le
contrat minimum entre un futur résultat spatial et les vues, et le cadre d'une expérience A/B pour
#117. Elle n'adopte aucun coefficient, aucune loi de vent, aucune méthode de solveur et aucun rendu.

**Décisions du mainteneur qui priment**, commentaires du 2026-11-10 sur
[#118](https://github.com/fuzoh/simu-tyro/issues/118#issuecomment-6761832024) et
[#127](https://github.com/fuzoh/simu-tyro/issues/127#issuecomment-6761831443) :

- quatre tracés seulement : ligne à vide, ligne chargée à la position choisie, trajectoire (lieu du
  chariot), ligne A–B droite ;
- les trois vues projettent les mêmes coordonnées mécaniques ;
- la Banane qualitative disparaît ;
- terrain `z(x, y) = z_profil(x)`, garde verticale, gabarit vertical existant ;
- pas de nouveau bandeau pour cette approximation.

La note [Équilibre spatial](../equilibre%20spatial%20vent.md) §6 et la ligne « Terrain hors axe
absent » de son tableau §7 demandent encore l'indisponibilité de la garde hors axe. **Ces deux
passages sont antérieurs à l'arbitrage du 2026-11-10 et ne priment pas.** Cette note ne les
réécrit pas.

Physique, aérodynamique et profil de vent : #127, #120 et les revues du dossier. Ici, seulement ce
que les vues doivent recevoir, projeter, taire ou refuser de dessiner.

## Ce qui a été lu, et ce qui ne l'a pas été

Inspecté dans le dépôt : `GLOSSARY.md` (Banane, Trajectoire, gabarit, Vue 3D, Vue latérale),
`docs/adr/0001-invalid-state-arrives-faithfully-and-is-gated.md`, `docs/conventions/simulation.md`,
`docs/conventions/testing.md`, `docs/simulation-theory.md` §2, les issues #118, #117 et #127 avec
tous leurs commentaires, et le code cité plus bas.

Docs Cesium officielles via Context7, consultées le 2026-11-10, sans épingle de version dans
l'index : [CesiumWidget](https://cesium.com/learn/cesiumjs/ref-doc/CesiumWidget.html),
[Scene](https://cesium.com/learn/cesiumjs/ref-doc/Scene.html),
[PolylineGraphics](https://cesium.com/learn/cesiumjs/ref-doc/PolylineGraphics.html),
[PolylineDashMaterialProperty](https://cesium.com/learn/cesiumjs/ref-doc/PolylineDashMaterialProperty.html),
[CHANGES.md](https://github.com/cesiumgs/cesium/blob/main/CHANGES.md) (1.61, 1.121). Recoupement
sur le paquet installé `cesium@1.147.0` / `@cesium/engine@26.5.0`, pas sur un navigateur.

**La pixelisation de #117 n'a pas été reproduite.** Aucun `agent-browser`, aucune capture, aucun
réglage runtime lu sur un canvas. Ne pas traiter les défauts documentés ci-dessous comme la cause
observée du rendu.

Checks de [CONTRIBUTING.md](../../../CONTRIBUTING.md) : non exécutés. Cette note est le seul fichier
écrit ; le markdown est dans `ignorePatterns` de `.oxfmtrc.json`. Pas de changement de code, pas de
commit, pas d'écriture d'issue.

## 1. Ce que les vues font aujourd'hui

Les trois vues ne partagent pas un jeu de coordonnées mécaniques.

| Tracé | Coupe | Vue de dessus | Vue 3D |
| --- | --- | --- | --- |
| Ligne à vide | `(x, z)` moteur, `CABLE_SAMPLES` 240 | absente ; la Banane est un arc du segment A–B | mêmes `(x, z)`, poussés par la Banane |
| Ligne chargée | `(x, z)` à `x_D`, nœud du chariot inséré | absente | mêmes `(x, z)`, plan droit |
| Trajectoire | `(x_D, z_D)` des pas résolus, coupée aux trous | absente | idem, plan droit |
| Ligne A–B | segment `(0, 0)`–`(L, h)` | segment géographique A–B | ancrages, droit |

Ancres de code, commit ci-dessus :

- Banane dessinée, jamais calculée, amplitude `BANANE_FACTOR = 0,01` fraction de longueur par m/s :
  `src/lib/map/banane.ts:1-42`, `src/lib/layout/contract.ts:1047-1053`. Ventre à gauche du trajet si
  `across > 0`, le même signe que `WindComponents.across` (`src/lib/sim/wind.ts:14-22`).
- La coupe ne connaît que `Polyline` `{ xs, zs }` (`src/lib/chart/scene.ts:87-96`). Elle ne dessine
  le demi-résolu que si le passager est placé (`src/components/chart/profile.tsx:281-301`).
- La Vue 3D applique la Banane à la seule ligne à vide (`src/lib/map/vue-3d.ts:216-245`,
  `291-305`). `earthFrame` interpole longitude/latitude linéairement et ajoute l'altitude
  `topA + z`. Le commentaire du module borne l'erreur d'interpolation à des millimètres sur quelques
  kilomètres ; ce n'est pas une mesure refaite ici.
- Le plan local en mètres existe déjà pour la Mesure et les Vues prédéfinies, pas pour les câbles :
  `src/lib/map/measure.ts:88-112` (`localPlane`).
- Repère moteur actuel, sans `y` : `docs/simulation-theory.md` §2, ancre A `(0, 0)`, B `(L, h)`,
  `z` vers le haut, origine au sommet de l'ancrage A.
- Deux brins porteurs : un seul calcul, écart de 6 px, pas des mètres (`src/lib/chart/scene.ts:105-111`).
  En 3D cet écart est reconverti en mètres à chaque image le long de la verticale du point
  (`src/components/map/vue-3d-renderer.ts`, `member`). Ce n'est pas un `y` mécanique.

Le moteur ne stocke pas de polyligne sur le résultat : `SpanState` plus `sampleCable`,
`src/lib/sim/types.ts:20-22` et `src/lib/sim/catenary.ts:162-178` (`x, z` entrelacés, uniforme en
`s`, extrémités exactes). La polyligne dessinée vit dans `SceneBase`, pas dans le solveur.

## 2. Contrat minimum proposé — solveur vers vues

Proposition, pas une signature adoptée. Le solveur reste libre de sa méthode. Les vues n'appellent
pas le vent, ne recalculent pas une forme et n'importent pas `banane.ts`.

Un point est en mètres, repère de portée, SI :

- `x` : horizontal vers B, 0 en A, `L` en B — le `x` de §2 ;
- `y` : horizontal, **positif vers la gauche du trajet A → B** — le signe déjà codé de `across` et
  de `bananeBow` ; 0 dans le plan vertical de A–B ;
- `z` : vers le haut, 0 au sommet de l'ancrage A — le `z` de §2. L'ancrage B mécanique est
  `(L, 0, h)`.

Étendre §2 par un axe. Ne pas introduire une seconde origine (sol, ellipsoïde, ancrage bas).

### Paquet que les trois vues consomment

Une liste de sommets par tracé, **la même** pour la coupe, la vue de dessus et la Vue 3D. Chaque
tracé est disponible ou absent. Absent n'est pas une liste vide déguisée en droite.

| Tracé | Sommets | Absent quand |
| --- | --- | --- |
| Ligne à vide | équilibre à vide, ancrages inclus | la pose sous le vent du Scénario n'a pas de longueur non tendue résolue |
| Ligne chargée | équilibre à la position choisie, **nœud du chariot inclus** | ce solve exact refuse, comme `placeRider` aujourd'hui |
| Trajectoire | lieu des nœuds du chariot des équilibres chargés résolus, une polyligne par plage continue | pas de plage d'au moins deux pas résolus |
| Ligne A–B | segment `(0, 0, 0)` → `(L, 0, h)` | jamais, dès que la portée et le dénivelé existent ; ce n'est pas une sortie du solveur |

La trajectoire n'est pas une troisième forme de corde. À une position résolue, son point est le
nœud du chariot de la ligne chargée à cette position, pas un échantillon de milieu de brin.

Règles de projection, testables sans Cesium :

1. **Fidélité aux sommets.** Relier les sommets dans l'ordre fourni. Ne pas rééchantillonner sur
   une grille uniforme en `x`, ne pas laisser Cesium insérer des points (`ArcType.NONE` est déjà
   imposé, `src/components/map/vue-3d-renderer.ts:488` ; le défaut documenté de `PolylineGraphics`
   est `ArcType.GEODESIC`).
2. **Coupe** : chaque sommet `(x, y, z)` est dessiné en `(x, z)`. `y` n'est pas écarté par un
   second calcul ; il est l'ordonnée de profondeur de cette projection.
3. **Vue de dessus** : `(x, y)` dans le plan local, ou l'image géographique de ce même plan. Plus
   un arc `bananePath` du segment A–B (`src/lib/map/style.ts`, source `banane`).
4. **Vue 3D** : le même `(x, y, z)` passé par **un** projecteur mètres → WGS84 + altitude. Altitude
   = altitude du profil sous A + hauteur d'ancrage A + `z`, comme `topA + z` aujourd'hui. Le `y`
   mécanique ne change pas ce datum.
5. **Projecteur unique recommandé** : `localPlane` (`src/lib/map/measure.ts:88-112`), déjà « the
   one geodesy of `src/lib/map/` ». `bananePoint` est une fraction de longueur en degrés ; il ne
   peut pas porter un `y` en mètres. `earthFrame` sans `y` peut rester pour un contrôle de
   non-régression à vent nul, mais ne doit plus être le chemin du déport.
6. L'écart en pixels des deux brins reste un décalage de dessin après projection, dépendant du
   zoom en 3D. Il n'entre pas dans le paquet partagé. Sinon la coupe et la Vue 3D divergent dès
   que l'échelle change.

`sampleCable` ne renvoie pas de `y`. Tant que le résultat moteur reste scalaire et échantillonnable,
l'échantillon partagé peut continuer à vivre dans la scène de dessin (`unloadedCable` aujourd'hui),
pas sur `SpanState`. Si le solveur spatial n'a pas de forme analytique rééchantillonnable, #127
doit émettre les sommets : c'est une entorse au « results are scalars only »
(`src/lib/sim/types.ts:20-22`), à trancher là-bas. Les vues exigent seulement que les trois
projections lisent les mêmes tableaux.

Les interpolateurs actuels (`polylineAt`, `zGroundAt`) supposent des `xs` strictement croissants.
Une projection fidèle aux sommets n'a pas besoin de cette hypothèse pour **dessiner**. Elle en a
besoin pour une lecture « hauteur à cet `x` ». Si #127 peut rendre `x(s)` non monotone, le paquet
doit le dire ; les vues ne trient pas et ne définissent pas la garde dans ce cas.

### Échantillonnage

- Les vues ne choisissent pas le pas du solveur. Elles refusent un second pas « pour faire joli ».
- Les extrémités des deux lignes sont les ancrages, aux résidus près du solveur — propriété que
  `sampleCable` garantit déjà aux bornes `s = 0` et `s = L₀`.
- Le nœud du chariot est un sommet de la ligne chargée. Aujourd'hui un échantillon uniforme en `s`
  le rate, et `throughNode` (`src/lib/map/vue-3d.ts`) l'insère après coup. Le paquet spatial le
  contient, pour que les trois vues l'aient sans correctif local.
- La trajectoire suit la grille du balayage, pas `CABLE_SAMPLES`. Un pas non résolu termine la
  plage (`trajectoryRuns`, `src/lib/chart/scene.ts:546-574`). Une plage d'un seul point ne se
  dessine pas.
- La garde jugée ne se recalcule pas sur la polyligne dessinée. Aujourd'hui la réduction §11 a son
  propre pas (`CLEARANCE.samplesPerStep` 60, plus le nœud, plus les sommets du profil). Cet écart
  reste un contrat du moteur. Les vues affichent le nombre qu'il rend.
- L'écart à vide dessiné peut interpoler la polyligne partagée, comme `belowUnloaded` interpole
  `unloadedCable`. Ce n'est pas la garde.

Densité, résidus et raffinement : #127. Ne pas figer 240 ici.

### Vent retenu par la grille

Aujourd'hui un Vent retenu est dessiné comme une vitesse nulle pour la Banane et la rose, sans
être effacé du Scénario (`src/components/map/top-map.tsx:183-187`). C'est licite pour une allure.
Ce ne l'est plus si un `y` mécanique est calculé avec le Vent invalide pendant que la dynamique dit
qu'il n'est pas appliqué (glossaire, « Vent »).

Recommandation : le paquet dessiné est celui du vent que les grilles appliquent — vitesse 0 quand
`windCause` est posé — et l'avis existant dit pourquoi. Le Vent porté par le lien ou la Session
reste tel quel ([ADR-0001](../../adr/0001-invalid-state-arrives-faithfully-and-is-gated.md)). Pas
de second tracé « avec le vent refusé ».

Le champ de vent, une fois adopté par #120, est attaché à l'abscisse le long de A–B, identique à
toute hauteur et tout déport (#127, arbitrage du 2026-11-10). Les vues ne le déplacent pas avec la
corde et ne l'échantillonnent pas.

## 3. Résultat partiel, non convergent, état invalide

Convention actuelle à conserver. L'extrusion du profil ne comble pas un solveur qui n'a pas répondu
(#118).

| Situation | Comportement actuel | Recommandation vues |
| --- | --- | --- |
| Lien, Session ou champ dépendant invalide | état gardé, erreur bloquante sur la grille, aucune substitution ([ADR-0001](../../adr/0001-invalid-state-arrives-faithfully-and-is-gated.md)) | ne pas remplacer un tracé retenu par une chaînette plane ni par une Banane |
| Grille Solve, ou refus moteur | pas de `SpanState`, le cadre se dessine encore (`src/lib/app/suppression.ts`) | ligne A–B et fils à plomb si le placement existe ; aucun tracé mécanique |
| Ligne à vide non résolue | `buildSceneBase` renvoie `null` (`src/lib/chart/scene.ts:347-351`) : « Aucun résultat » | pas de ligne à vide, donc pas de ligne chargée ni de trajectoire — elles partagent la longueur de pose |
| Position choisie non résolue | `placeRider` renvoie `null` (`src/lib/chart/scene.ts:463-466`) ; la coupe et la Vue 3D retirent alors **tout** le demi-résolu, y compris la ligne à vide et la trajectoire (`src/components/chart/chart-block.tsx:171-173`, `src/lib/map/vue-3d.ts:236-248`) | **garder ce couplage** pour la première version, afin que les trois vues restent alignées sur la coupe. L'alternative — montrer la ligne à vide et les plages résolues, cacher seulement la chargée — est un changement de comportement, question 2 |
| Balayage partiel | `coverage < 1` rend le verdict `Indéterminé` et ne le qualifie pas ; les cellules convergées restent (`src/lib/sim/types.ts:136`, `src/lib/sim/verdict.ts:672-673`). La trajectoire est coupée, jamais pontée | même règle pour le lieu. Pas de corde droite entre deux pas résolus |
| `SolveNote` (`damped`, `reseeded`, `near-taut-fallback`) | succès interne, jamais affiché (`src/lib/sim/types.ts:176-183`) | pas un état de vue, pas un bandeau |
| Contact au sol | pas un échec de solveur ; la ligne se dessine, la garde dit le contact | inchangé. L'extrusion ne transforme pas un contact en échec |
| Grille Garde | supprime la garde et sa courbe, pas le câble | les tracés restent ; le nombre de garde ne s'invente pas |
| Exception géométrique (`L` / `h`) | les deux tracés s'effondrent | hors placement : pas de Vue 3D, comme `vue3dPlacement` |

Échec = valeur (`SolveResult`), pas une exception (`src/lib/sim/types.ts:141-154`). Les vues ne
seuillent pas un résidu. Un tracé est disponible ou il ne l'est pas. Le seuil est au solveur.

« — » reste le glyphe d'`Indéterminé` seul. Un tracé absent n'est pas pointillé, pas fantôme
(`src/components/chart/profile.tsx:281-284`).

## 4. Terrain extrudé et gabarit

Décision verrouillée, qui **remplace** la proposition « garde indisponible » de la note §6 :

`z_terrain(x, y) = z_profil(x)`.

`zGroundAt` ne lit déjà que `x` (`src/lib/sim/terrain.ts:51-64`), hors domaine les extrémités sont
tenues, jamais extrapolées. L'extrusion doit être **nommée** — une fonction dont la signature prend
`y` et l'ignore, commentaire pointant l'arbitrage #118 — et non un oubli silencieux du futur
`z(x, y)`. Le profil n'est pas déplacé avec la corde.

Garde verticale : `z_ligne(x, y) − z_profil(x) − h_rider`. `h_rider` est le gabarit du passager déjà
saisi (`src/lib/scenario/first-run.ts:99-113`, défaut non confirmé 2,1 m ; `src/lib/sim/clearance.ts`
le retranche en entier). Ce n'est pas une distance aux obstacles 3D, pas une garde de versant, pas
une hauteur de corps.

Le relief swisstopo dessiné en 3D n'est pas la donnée mécanique. Les altitudes de ligne viennent du
profil (`src/lib/map/vue-3d.ts:14-17`). `sampleTerrainMostDetailed` ne sert qu'à poser le fil à
plomb pendant le geste, jusqu'à l'arrivée du profil. Ne pas brancher `globe.pick` sur la garde.

Pas de nouveau bandeau. Le slot a quatre rangs et un seul occupant (`src/lib/app/banner.ts:1-16`).
L'approximation se documente dans le dispositif existant. La ligne qui le contredit aujourd'hui est
`NOT_COMPUTED_LINES` (`src/lib/rail/provenance.ts:492-495`) : elle dit que la Banane n'est pas une
distance et que la garde sous vent est hors périmètre. La retirer ou la réécrire **dans le même
changement** que la disparition de la Banane, sinon l'écran dément le modèle. Ce n'est pas un
cinquième rang. Le libellé est une décision humaine (question 3) : ce bloc est un des mécanismes
qui empêchent l'application de se lire comme une attestation.

Le glossaire définit la Banane comme qualitative et interdit « déport »
(`GLOSSARY.md`, « Banane »). Le commentaire #118 dit que la Banane qualitative disparaît au profit
du déport calculé. Ne pas trancher le mot ici (question 4).

Hors de ce contrat : ellipsoïde du passager. #118 / #127 Q23 demandent de le déduire du gabarit,
règle non établie, et le gabarit inclut poulie et longe. Les vues dessinent le nœud du chariot et
continuent de retrancher le gabarit vertical. Elles n'inventent pas trois axes ni un maillage.

## 5. Assertions testables — vues seules

Vitest `node`, sans DOM et sans Cesium (`docs/conventions/testing.md`). Valeurs attendues par
calcul manuel sur un segment cardinal, ou par invariant, jamais par appel de la fonction sous
test. Les cas `no-convergence` s'injectent ; on ne les chasse pas.

Ces tests ne valident pas le solveur. Un paquet construit à la main suffit.

**Sans vent, côté vue.** Un paquet dont tous les `y` sont 0 produit un déport plan nul. La coupe
restitue les `(x, z)` du paquet. Le projecteur n'a pas d'argument `across` et n'importe pas
`banane.ts`. Changer `BANANE_FACTOR` ne change pas ses sorties — assertion de comportement : deux
paquets identiques sauf `y`, l'écart plan est l'écart des `y`, quel que soit un vent qu'on
n'aurait pas dû lui passer.

**Miroir, côté vue.** Sur un segment A → B plein est, la gauche du trajet est le nord. Le point
`(L/2, +10, −5)` et le point `(L/2, −10, −5)` sont symétriques par rapport au plan vertical A–B
dans le plan local, et la coupe leur donne le même `(L/2, −5)`. Cela teste le projecteur, pas
l'aérodynamique. Le miroir solveur (vent inversé ⇒ `y` changé de signe, `x` et `z` inchangés) est
une assertion de #127 ; les vues ne la rejouent pas.

**Accord des projections.** Les trois sorties sont des fonctions pures du même tableau. Pour le
point ci-dessus : coupe `(L/2, −5)` ; plan, 10 m à gauche de A–B ; altitude 3D = `topA − 5`. La
ligne A–B du même paquet est `(x, 0, (h/L) x)`, distincte de la ligne à vide même si celle-ci a
`y = 0`. Basculer une couche de visibilité ne modifie aucun sommet.

**Trajectoire ≠ corde.** Sur un paquet chargé dont un sommet est marqué nœud du chariot, le point
de trajectoire à cette position est ce sommet, pas un autre échantillon du brin.

**Trous.** Une liste de pas avec un échec injecté au milieu donne deux plages, et aucune arête ne
relie la dernière position résolue d'avant à la première d'après. Reprendre le critère de
`trajectoryRuns`, en emportant `y`.

**Extrusion.** Deux points de même `x` et de `y` différents lisent le même `z_profil(x)`. La garde
affichée utilise ce nombre et le `h_rider` du Scénario, pas une hauteur de maillage. Un `y` non
nul ne déplace pas les `xs` du profil.

**Vent retenu.** Avec une cause de grille Vent, le paquet dessiné a les `y` du vent non appliqué
(0 si le solveur à vent nul est plan). Le Scénario garde le Vent saisi.

**Non-régression du placement.** Sans les deux Positions, ou sans profil entre elles,
`vue3dPlacement` reste bloqué (`positions` / `profil`). La Vue 3D ne s'ouvre pas sur la géométrie
manuelle du premier écran (`src/lib/scenario/first-run.ts:130`).

Tolérances : un projecteur partagé est exact contre son propre calcul manuel sur un segment
cardinal (est/nord), pas à `4×10⁻⁶` du solveur. Ne pas réutiliser le palier « positions d'extrema
échantillonnés » pour un sommet qu'on a soi-même placé.

## 6. #117 — configuration de rendu observée

Issue [#117](https://github.com/fuzoh/simu-tyro/issues/117). Le mainteneur décrit une vue très
pixelisée et des pointillés difficiles à lire. **Ce constat n'a pas été reproduit dans cette
recherche.** Ne pas en déduire que l'anticrénelage est désactivé.

`openVue3d` construit le widget ainsi (`src/components/map/vue-3d-renderer.ts:155-166`) :

- passés : `terrainProvider`, `baseLayer: false`, `skyBox: false`, `scene3DOnly: true`,
  `showRenderLoopErrors: false`, `creditContainer` détaché ;
- puis `globe.depthTestAgainstTerrain = true`, couleur de base, `maximumZoomDistance`.

Non passés, donc aux défauts de la bibliothèque : `msaaSamples`, `contextOptions`,
`useBrowserRecommendedResolution`, `resolutionScale`, `requestRenderMode`, `targetFrameRate`,
`orderIndependentTranslucency`, `shadows`. Aucune écriture de
`scene.postProcessStages.fxaa`.

Défauts documentés, recoupés sur le source installé. Ce sont des défauts, pas une mesure du canvas :

| Réglage | Documentation officielle | Paquet installé `cesium@1.147.0` |
| --- | --- | --- |
| MSAA | `CesiumWidget` / `Scene` : `msaaSamples` défaut **4** ; 1 le coupe ; ne vaut que pour un contexte WebGL2 capable de cibles multi-échantillons. CHANGES 1.121 : MSAA activé par défaut à 4 | `Scene.js` : `options.msaaSamples ?? 4`. Le widget transmet `options.msaaSamples`, ici `undefined` |
| FXAA | CHANGES 1.61 : désactivé par défaut ; réactiver par `scene.postProcessStages.fxaa.enabled = true` | `PostProcessStageCollection.js` : `fxaa.enabled = false` |
| Résolution | `useBrowserRecommendedResolution` défaut **true** : rendre à la résolution recommandée du navigateur et **ignorer** `window.devicePixelRatio`. `resolutionScale` défaut 1 | `configurePixelRatio` : si le drapeau est vrai, `pixelRatio = 1`, puis `× resolutionScale` |

Conséquence documentée, **inférence, pas bug reproduit** : avec les options actuelles, le tampon
du canvas suit les pixels CSS, puis le navigateur le met à l'échelle de l'écran. Un MSAA à 4
échantillons de ce tampon plus petit ne compense pas cette mise à l'échelle. Un écran à densité 2
peut donc paraître pixelisé **même si** le MSAA par défaut est actif. Seule une lecture runtime de
`scene.msaaSamples`, `scene.postProcessStages.fxaa.enabled`, `canvas.width` / `clientWidth` et
`window.devicePixelRatio` peut dire ce que le navigateur a réellement fait.

Traits, en pixels d'écran (docs : `PolylineGraphics.width`, `dashLength` en pixels) :

| Tracé | `width` | motif | derrière le relief |
| --- | --- | --- | --- |
| Fil à plomb | 2 | tirets, `dashLength` 12 | pas de `depthFailMaterial` (`vue-3d-renderer.ts:422`) |
| Ligne A–B au repos | 2 | tirets 8, encre à 60 % | même motif, encre à 30 % (`:457-458`) |
| Trajectoire | 3 | `dashLength` 6, `dashPattern` `0b1111100000000000` | même motif atténué (`:465-475`) |
| Ligne à vide | 2 | tirets 10 | **pas** de `depthFailMaterial` (`:488-490`) |
| Ligne chargée | 3, contour 0,5 | trait plein | couleur à 50 %, pas le motif (`:509`) |

La doc de `depthFailMaterial` exige `EXT_frag_depth` ; sans l'extension, des artefacts sont
possibles. L'application ne teste pas l'extension. La distinction visible / masqué par le relief
est demandée par #117 et déjà partiellement codée : la ligne à vide masquée disparaît au lieu de
pâlir. Le conserver ou l'aligner sur les autres tracés est un choix de l'expérience, pas une
correction déjà justifiée par une capture.

Couleurs : encre `#16191b`, cerne `#ffffff` (`src/lib/map/style.ts:108-109`). Fonds drapés :
`pixelkarte-grau` pour la carte claire, orthophoto, carte nationale (`src/lib/map/vue-3d.ts`,
`DRAPED`).

## 7. Expérience A/B bornée — agent prépare, humain tranche

#117 est **indépendant** de #127. Ne pas mélanger un changement de forme (fin de la Banane) et un
changement de rendu dans la même comparaison : le mainteneur ne pourrait pas attribuer ce qu'il
voit.

Hors périmètre, déjà dans l'issue : remplacer Cesium, physique nouvelle, panneau permanent de
réglages. Le drapeau d'expérience ne va ni dans la Session, ni dans le schéma d'URL, ni dans le
bandeau. Un paramètre de lien serait un état fidèle au sens de l'ADR-0001, donc le mauvais outil.
Préparer les variantes sur une branche, preset nommé dans un module non importé par le chemin de
production, captures jointes au PR. Adopter un réglage, c'est l'écrire dans `openVue3d` après
accord explicite, puis retirer le preset.

### Scène et caméra

La Vue 3D ne s'ouvre pas sans deux Positions et un profil entre elles. Le premier écran ne
convient pas. Scène candidate, déjà enregistrée, pas une scène inventée : ancrages
`TRIAL_ENDS` (`src/lib/terrain/__fixtures__/geoadmin-2026-11-08.ts`), profil du
2026-11-08 entre ces extrémités. Le réseau est nécessaire pour le relief et l'imagerie ; le noter
si les tuiles n'ont pas fini de charger. Ne pas prendre la hauteur swisstopo comme garde.

Caméra figée, la même pour chaque variante :

- **Vue latérale** (`vueLaterale`, `src/lib/map/vue-3d-camera.ts`) : géométrie pure une fois la
  focale connue. Enregistrer `fov` et le rapport du canvas (`lensOf`), la pose
  (destination, cap, site), puis ne plus refaire le cadrage. Une variante qui épaissit un trait ne
  doit pas reculer la caméra.
- Vue du départ : elle lit `globe.getHeight` sous l'œil. Ne l'utiliser pour la comparaison
  chiffrée qu'après chargement du relief, et enregistrer la hauteur lue. Sinon elle n'est pas
  reproductible.

### Ce que l'agent enregistre avant tout jugement visuel

Navigateur (`userAgent`), taille CSS du viewport et du canvas (`clientWidth` / `clientHeight`),
`window.devicePixelRatio`, `canvas.width` / `canvas.height`, `scene.pixelRatio`,
`scene.drawingBufferWidth` / `Height`, `scene.msaaSamples` **relu**, `fxaa.enabled` **relu**, fond,
couche pentes, pose de caméra. Si `msaaSamples` relu n'est pas 4, le dire : le défaut ne s'est pas
appliqué. Ne pas « corriger » la valeur avant de l'avoir lue.

Temps de frame : deltas de `postRender` sur un nombre de frames fixé après un délai de
stabilisation des tuiles, rapporter un p95 de cette série. Contexte seulement : la doc de test
cite 16,7 ms comme vsync des parcours navigateur. Ce n'est pas un nouveau seuil d'acceptation.
Sur un écran de densité 2, passer au pixel appareil multiplie le nombre de pixels du tampon par
environ quatre ; le noter, ne pas le déclarer inacceptable à l'avance.

### Matrice bornée — quatre cellules, pas un factoriel

Même scène, même pose, même fond de départ (orthophoto : texture haute fréquence, cas difficile).

1. **Base** — constructeur actuel. Les valeurs relues font foi.
2. **Pixels appareil seuls** — `useBrowserRecommendedResolution = false`, qui, d'après la doc et
   `configurePixelRatio`, fait entrer `devicePixelRatio`. Ne pas mettre en plus
   `resolutionScale = devicePixelRatio` : les deux se multiplient. MSAA et FXAA inchangés.
3. **FXAA seul** — `postProcessStages.fxaa.enabled = true`, résolution inchangée.
4. **Pixels appareil + FXAA.**

Cinquième cellule **seulement si** la cellule 2 reste pixelisée et que le mainteneur la demande :
`msaaSamples` 1, 4 et 8 à résolution appareil, pour séparer l'anticrénelage de la mise à
l'échelle. Ne pas commencer par là : rien dans le code n'a désactivé le MSAA.

Ensuite, sur la combinaison retenue provisoirement, pas sur les quatre :

- trois fonds : gris (`pixelkarte-grau`), orthophoto, carte nationale ; couche pentes on et off
  une fois ;
- une pose où la ligne échoue au test de profondeur, pour lire les pointillés masqués et constater
  si la ligne à vide disparaît ;
- deux densités : `devicePixelRatio` ≈ 1 et ≥ 2. Si la machine de l'agent n'en a qu'une, le dire.
  L'émulation n'est pas l'écran d'approbation.

Liste d'interactions, binaire, pas un jugement d'image : prise et relâche d'un ancrage avec retour
de la caméra, orbite / inclinaison / zoom / marche / nord / deux vues prédéfinies, couches du
View Strip qui montrent ou cachent sans recalculer la géométrie, retour à la vue de dessus.

L'agent ne choisit pas la cellule gagnante. L'accord explicite du mainteneur est le seul critère
d'adoption (#117).

## 8. Critères d'acceptation proposés

### #118 — vues

- [ ] Quatre tracés, pas de courbe « sans vent » supplémentaire, pas de Banane. Visibilités
      existantes conservées : ligne à vide, corde A–B, trajectoire ; ligne chargée toujours
      dessinée quand elle est disponible, comme sur la coupe.
- [ ] Coupe, vue de dessus et Vue 3D consomment les mêmes tableaux `(x, y, z)`. Tests §5 verts.
- [ ] Sans vent dans le paquet, déport plan nul, sans `BANANE_FACTOR`.
- [ ] Miroir du projecteur sur un segment cardinal, par calcul manuel.
- [ ] Trajectoire = lieu des nœuds, coupée aux pas non résolus, jamais pontée.
- [ ] Position choisie non résolue : même effacement que `placeRider === null`, sauf arbitrage
      contraire (question 2).
- [ ] `z_terrain(x, y) = z_profil(x)` nommé ; garde verticale avec le gabarit existant ; le maillage
      3D n'entre pas dans la garde.
- [ ] Aucun nouveau rang de bandeau. La ligne `NOT_COMPUTED_LINES` qui nie la Banane métrique est
      mise à jour dans le même changement, libellé validé par le mainteneur.
- [ ] Écart de 6 px des deux brins non converti en `y` mécanique.
- [ ] Pas d'ellipsoïde dessiné tant que la règle de déduction depuis le gabarit n'existe pas.

### #117 — lisibilité

- [ ] Fiche de reproduction avant toute préférence : navigateur, dimensions CSS, densité, tampon,
      `msaaSamples` relu, `fxaa.enabled` relu, pose, fond. Absence de fiche = expérience non
      commencée.
- [ ] Quatre cellules sur la même scène et la même pose, réglages et compromis écrits.
- [ ] Pointillés lus sur les trois fonds et derrière le relief, y compris le cas sans
      `depthFailMaterial`.
- [ ] Densité 1 et ≥ 2 comparées, ou écart d'accès nommé. p95 de frame enregistré, pas érigé en
      seuil.
- [ ] Interactions de la liste sans régression.
- [ ] Aucun rendu adopté sans accord explicite. Pas de panneau permanent, pas de clé d'URL.

## 9. Découpage des dépendances

| Sujet | Propriétaire | Cette note |
| --- | --- | --- |
| Équations, résidus, longueur non tendue sous le vent, tensions, émission des sommets si plus de forme analytique | #127 | consomme le paquet ; ne choisit pas la méthode |
| Coefficients, ellipsoïde, déduction depuis le gabarit | #127, revues passager / ligne | ne sélectionne rien ; pas de corps dessiné |
| Profil de vent le long de A–B | #120 | les vues ne déplacent pas le champ et ne l'échantillonnent pas |
| Vibrations, transitoire | #124 | hors périmètre |
| Projections, fin de la Banane, extrusion affichée, tracé absent | #118 | ici |
| Pixelisation, A/B de rendu | #117 | indépendant ; ne pas le bloquer sur #127 ni le mêler à un changement de forme |
| Phrase de provenance et mot du glossaire | humain, au moment où #118 atterrit | questions 3 et 4 |
| Réécriture de la note §6 | documentation, après confirmation de l'arbitrage | non faite ici ; la contradiction est signalée |

#118 dépend fonctionnellement du paquet de #127. Le contrat de projection et les tests sur paquet
manuel peuvent être écrits avant le solveur. La garde extrudée dépend du réducteur, pas de la
Vue 3D : le relief visible ne la fournit pas.

## 10. Questions pour le mainteneur

1. Confirmer `y` positif vers la gauche de A → B, pour rester sur le signe déjà codé de `across` ?
2. Position choisie non résolue : garder l'effacement de tous les tracés mécaniques, comme
   aujourd'hui, ou montrer la ligne à vide et les plages résolues ?
3. Qui rédige la phrase de remplacement dans `NOT_COMPUTED_LINES` ? Pas un nouveau bandeau. Elle
   ne doit pas se lire comme une attestation de versant ni de validation expérimentale.
4. Glossaire : retirer la Banane qualitative et autoriser « déport » pour l'écart calculé, ou
   conserver le mot Banane pour la forme en plan désormais mécanique ?
5. #117 : la ligne d'essai `TRIAL_ENDS` (2026-11-08) est-elle la scène de référence, et sur quel
   navigateur / écran l'accord final sera-t-il donné ?
6. Confirmer que la première version des vues dessine le nœud du chariot et retranche le gabarit
   vertical, sans ellipsoïde tant que la règle de déduction n'est pas écrite ?

## Limites

- Pas de reproduction visuelle. Toute phrase sur la pixelisation est une lecture de configuration
  et de documentation, pas une observation d'écran.
- L'index Context7 des docs Cesium n'était pas épinglé à 1.147.0. Les défauts cités ont été
  revus dans `@cesium/engine@26.5.0`, dépendance de `cesium@1.147.0`. Un navigateur peut encore
  refuser le MSAA ; seule la valeur relue le dira.
- Les commentaires du code sur l'erreur millimétrique de l'interpolation en degrés et du plan
  local n'ont pas été remesurés.
- Aucun seuil physique, aucun `Cd`, aucune forme de profil de vent n'est proposé ici.
