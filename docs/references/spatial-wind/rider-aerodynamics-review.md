# Vérification indépendante — cube/ellipsoïde comme substituts aérodynamiques du passager

**Date : 9 novembre 2026. Périmètre : recherche scientifique bornée, pas dimensionnement.**

Documents locaux audités au commit **`6bada50eb7ac5bf8d060984fad454a233bf66673`** : `docs/conventions/simulation.md`, `docs/references/equilibre spatial vent.md` ; recoupement du modèle longitudinal dans `src/lib/sim/dynamics.ts`, `src/lib/sim/wind.ts` et `docs/simulation-theory.md` §12.2, au même commit. Le rapport `/tmp/simu-aerodynamique-raw.md` est uniquement l’objet d’un audit, jamais une preuve. Aucun fichier dépôt modifié ; aucune délégation, aucun autre modèle, aucune publication ni opération de commit/push.

## 1. Verdict opérationnel

1. **Aucun `Cd` par défaut cube ou ellipsoïde n’est validé pour représenter un passager de tyrolienne.** Les formes fournissent une géométrie et une enveloppe, pas une calibration humaine ni une borne conservative.
2. **Des mesures primaires existent**, notamment chute de cubes à orientation stabilisée [C] et chute de sphéroïdes prolates 2:1 [E]. Elles ont des domaines de Reynolds, d’orientation et de normalisation précis, non ceux d’un passager générique. Elles ne fournissent pas une polaire complète traînée/portance utilisable pour le passager.
3. **Erreur certaine du rapport brut :** son ellipsoïde de dimensions totales `0,4 × 0,4 × 1,0 m` n’a pas une aire projetée de `0,40 m²`. Aires principales : `0,12566 m²` dans l’axe long ; `0,31416 m²` transversalement. Associer une faible traînée d’ellipsoïde axial à une aire latérale est incohérent.
4. **Autre erreur certaine :** la pente verticale d’une ligne plane A–B ne transforme pas, à elle seule, un vent exactement transverse horizontal en force verticale dans la fermeture de traînée normale du rapport brut.
5. **Couplage :** calculer une seule force aérodynamique spatiale avec le vent relatif réel. L’EDO reçoit sa projection sur la trajectoire ; la ligne reçoit la réaction opposée du système passager/chariot, pas automatiquement la somme complète poids + aérodynamique. L’inertie du passager intervient dans cette différence.
6. **`CdA = 0,45 m²` reste le calage longitudinal décrit localement**, non revérifié ici sur la campagne SSF, et ne devient ni un `Cd` sans dimension ni une aire de traînée latérale cube/ellipsoïde. La proposition `0,50 m²` du rapport brut n’acquiert aucun statut expérimental ou conservatif dans cette passe.

## 2. Sources effectivement consultées — huit dossiers, accès et limites

Budget fermé : **huit travaux scientifiques examinés**, dont trois seulement par notices/résumés faute de texte intégral. Les deux notices Dress correspondent au même travail, conférence puis article. Les recherches bibliographiques Crossref/OpenAlex, catalogues et pages d’index ont servi à trouver les documents ; leurs résultats de recherche ne sont pas traités comme mesures. Aucun ouvrage, norme ou article simplement cité dans ces travaux n’a été réputé lu.

### [C] Wang et al. — cubes, mesures primaires exploitables dans leur domaine

Juanjuan Wang, Yue Zhang, Huabing Miao, Jiajia Niu, Daishu Cheng, Mingzhu Chen, **“Experimental Investigation in Drag Coefficient of Cubes”**, *Applied Sciences* 15, 7025 (2025).

- DOI : <https://doi.org/10.3390/app15137025>.
- PDF effectivement ouvert : <https://mdpi-res.com/d_attachment/applsci/applsci-15-07025/article_deploy/applsci-15-07025.pdf>. URL éditeur principale refusée HTTP 403 ; cette copie éditeur est accessible.
- Lecture : §§2–5, pp. 3–14 ; particulièrement p. 6, éq. (2)–(6), pp. 8–10, fig. 5–8, pp. 11–12, éq. (8)/tableau 4.
- **Méthode :** vitesses terminales de cubes dans mélanges eau–glycérine ; traînée déduite de poids moins poussée d’Archimède, pas mesure de force par balance en soufflerie. Cubes homogènes et cubes composés de deux matériaux pour stabiliser l’orientation par décentrage de masse. Arêtes lisses d’environ 10, 16 et 20 mm.
- **Normalisation impérative :** `dn = (6 Vp/π)^(1/3)`, `Re = ρf vt dn/μ` ; l’éq. (5), `FD = (π/8) dn² CD ρf vt²`, impose **`Aref = π dn²/4`**, aire de la sphère de même volume. Ce n’est ni l’aire d’une face ni l’aire projetée courante du cube.
- Cubes homogènes : `0,475 ≤ Re ≤ 5799,8` (§4.1). Cubes composés : environ `0,45 ≤ Re ≤ 4516` (§4.2). Corrélation ajustée : domaine annoncé `0,4 < Re < 4516` (§4.3), en trois plages. Ne pas confondre domaine de mesure et découpage de l’ajustement.
- Angle `α` : angle d’une arête inférieure avec l’horizontale sur l’image, dans la famille de rotations étudiée, entre 0° et 45°. Ce n’est pas une paramétrisation complète d’orientation 3D. Les positions proches de 0° et 45° sont stabilisées ; le troisième assemblage ne conserve pas un angle constant de 20° : angle moyen 16,52°, écart-type 6,076°, variation importante avec Re (§4.2).
- Dans `10 < Re < 1000`, les auteurs observent une augmentation de leur coefficient avec cet angle, les deux cas extrêmes encadrant leurs mesures. À plus grand Re dans **leur** domaine, les courbes se rapprochent. Ce n’est pas la preuve d’un coefficient indépendant de toute orientation à Re humain.
- **Portance : aucune polaire de force transverse mesurée.** Le texte évoque une force latérale sur l’assemblage intermédiaire ; elle n’est pas quantifiée par un `CL(α,Re)` exploitable. La relation poids/poussée/traînée ne suffit pas à reconstruire ce `CL`, surtout si la chute n’est pas strictement verticale.

### [E] Stringham, Simons & Guy — sphéroïdes en chute, mesures primaires

G. E. Stringham, D. B. Simons, H. P. Guy, **“The Behavior of Large Particles Falling in Quiescent Liquids”**, USGS Professional Paper 562-C (1969).

- Notice : <https://pubs.usgs.gov/publication/pp562C> ; PDF lu : <https://pubs.usgs.gov/pp/0562c/report.pdf>. Pas de DOI confirmé dans cette passe.
- Lecture : symboles, pp. C10–C13, C22 tableau 6, C31–C35, fig. 26–27. Tableau 6 également contrôlé sur image du PDF, page PDF 29, pour éviter les erreurs OCR.
- **Géométrie :** sphéroïdes prolates de rapport longueur/diamètre voisin de 2 ; plomb et aluminium ; dimensions principales nominales 1,91, 2,54 et 3,81 cm, tableau 1. Ils ne sont ni ellipsoïdes triaxiaux arbitraires ni mannequins humains.
- **Deux normalisations publiées séparément :** `dm` est le diamètre du cercle ayant la même aire que la **projection maximale** ; `dn` celui de la sphère de même volume. `A_m = π dm²/4`, `A_n = π dn²/4`. Re et Cd changent ensemble selon le diamètre choisi. L’aire maximale reste la référence même lorsque le solide oscille ; ce n’est pas une aire instantanée recalculée à chaque image (p. C10).
- **Résultats concrets, non recommandations de coefficient :** tableau 6, essai `363-7-15`, coefficient publié `Cd,m = 0,50` à `Re_m = 1800`, et `Cd,n = 0,59` à `Re_n = 1640`, état S (« stable orientation and path »). Essai `372-7-16` : `Cd,m = 0,43`, `Re_m = 3480`, état S. Le changement de coefficient entre normalisations n’est pas un changement de physique.
- Les valeurs de Re du tableau sont sous l’en-tête **`R × 10⁻²`** : il faut multiplier les nombres imprimés par 100. Le tableau comporte aussi des chutes instables à Re plus élevé ; ne pas fusionner leurs valeurs avec celles d’un corps tenu à incidence fixe.
- §“Prolate spheroids”, p. C31 : orientations/trajectoires stables entre Re 10 et 8000 dans leurs essais ; oscillations et rotations apparaissent dans d’autres cas. Aucune exploration contrôlée de toutes les incidences. Pour les chutes stables transversales, l’axe long est perpendiculaire à la chute ; les cas oscillants ne possèdent pas une incidence unique.
- **Portance :** pas de polaire `CL(α,Re)` mesurée pour ces prolates. Des équations et discussions de portance concernent notamment les disques ; elles ne deviennent pas des données de sphéroïde.
- Transfert eau → air : la similitude d’un corps rigide tenu nécessite au moins même géométrie, orientation, Re et conditions de surface/écoulement ; pour un solide libre, rapports de densité et inerties influencent en plus les oscillations. Une chute libre dans un liquide n’est donc pas automatiquement un essai de passager suspendu dans l’air.

### [T] Clarke, Brandner & Walker — incidence et transition mesurées, Cd calculé

D. B. Clarke, P. A. Brandner, G. J. Walker, **“Computational and Experimental Investigation of Flow Around a 3-1 Prolate Spheroid”**, 16th AFMC (2007), pp. 1381–1387.

- PDF intégral lu : <https://afms.org.au/proceedings/16/Clarke_et_al_2007.pdf>. Pas de DOI confirmé.
- Lecture : pp. 1381–1387 ; définition modèle/Re p. 1381 ; pressions fig. 15–18 et tableau 1 pp. 1385–1387.
- Sphéroïde prolate 3:1, longueur nominale 330 mm, arrière tronqué de 4 mm pour support ; tunnel à eau, turbulence libre annoncée ≈0,5 %. Re fondé sur **longueur nominale** : `0,6 × 10⁶` à `4 × 10⁶`. Incidence nulle = axe long parallèle au courant ; résultats présentés à environ 10°.
- **Mesuré :** pressions, intermittence de couche limite, visualisations. Les variations de pression avec Re sont observées à incidence fixée ; les états laminaire/turbulent ne se déduisent pas du seul mot « ellipsoïde ».
- **Attention décisive :** p. 1386, les auteurs écrivent “Although no drag measurements are available for comparison”. Le tableau 1 porte le titre **“Calculated Drag Coefficients”**. Ses valeurs ne sont pas des mesures de traînée. Aucune valeur n’en est adoptée.
- Aire annoncée pour ces coefficients calculés : “maximum cross-section perpendicular to the X axis”. Ne pas la remplacer tacitement par une aire mouillée ou par une projection variable avec incidence. L’ambiguïté opérationnelle d’un changement de repère demanderait un contrôle du repère/maillage avant réutilisation numérique ; aucun besoin de la résoudre pour le verdict présent : ces Cd ne sont pas expérimentaux.
- Cette source apporte une preuve expérimentale de dépendance à Re/transition des pressions sur un sphéroïde incliné, **pas une polaire expérimentale intégrale Cd/CL**.

### [H] Holmes, English & Letchford — cube/plaques, texte inaccessible

**“Aerodynamics forces and moments on cubes and flat plates, with applications to windborne debris”**, 5th Bluff Body Aerodynamics and Applications, Ottawa (2004).

- Notice consultée : <https://figshare.utas.edu.au/articles/conference_contribution/Aerodynamics_forces_and_moments_on_cubes_and_flat_plates_with_applications_to_windborne_debris/23084939> ; API : <https://api.figshare.com/v2/articles/23084939>.
- La notice confirme auteurs, titre et conférence, mais sa liste de fichiers est vide. **Texte intégral inaccessible dans cette passe.** DOI, pages de données, incidences, Reynolds, aires et valeurs de force : **inconnus**. Aucune valeur attribuée à ce travail.

### [P] Molland & Utama — ellipsoïdes voisins, résumé seulement

A. F. Molland & I. K. A. P. Utama, **“Experimental and numerical investigations into the drag characteristics of a pair of ellipsoids in close proximity”** (2002).

- DOI : <https://doi.org/10.1243/147509002762224324>.
- Notice/résumé consultés : <https://eprints.soton.ac.uk/id/eprint/22219/>. La notice dit explicitement qu’aucun fichier n’est disponible au téléchargement.
- Le résumé annonce des essais en soufflerie sur un ellipsoïde 6:1 et deux ellipsoïdes voisins, jusqu’à `Re = 3,2 × 10⁶`, avec plusieurs espacements. **Ces éléments ne remplacent pas les pages de méthodes.** Convention précise de Re, aire, incidences, coefficients, corrections de support : inconnus faute de texte intégral lu. Aucune valeur retenue ; aucune transposition à un humain ou à deux passagers.

### [D] Dress — sphéroïde modifié, résumé NASA seulement

David A. Dress, **“Drag measurements on a modified prolate spheroid using a magnetic suspension and balance system”**, version conférence (1989), reprise *Journal of Aircraft* 27 (1990).

- Notices : <https://ntrs.nasa.gov/citations/19890038141> et <https://ntrs.nasa.gov/citations/19900053629>.
- Résumé NASA lu pour 1989 : mesure sans support à **incidence nulle**, comparaison avec faux dard de support ; le résumé signale une traînée mesurée plus faible avec ce dard. Cela motive la vérification des interférences de montage, pas une correction universelle.
- Pas de PDF dans les notices consultées. **Rapport d’axes exact, Re, aire, polaire et valeurs numériques inconnus.** Le travail ne peut fournir ici une portance à incidence quelconque ni un Cd transférable.

### [N1] Higgins — dirigeables NPL, piste écartée pour les ellipsoïdes

George J. Higgins, **“Tests of the N.P.L. airship models in the variable density wind tunnel”**, NACA TN 264 (1927).

- PDF consulté : <https://ntrs.nasa.gov/api/citations/19930087637/downloads/19930087637.pdf>.
- Pages initiales du TN seulement, notamment p. 4 : `D = Cs q Vol^(2/3)` ; Re fondé sur `Vol^(1/3)`, plage annoncée 110 000 à 5 000 000. Essais à incidence nulle.
- Ce sont des modèles de dirigeables, **pas une justification de Cd d’ellipsoïde humain à incidence variable**. Normalisation volumique, pas aire frontale. Piste conservée seulement comme contrôle de non-transférabilité. Le PDF contient ensuite d’autres documents, non exploités.

### [N2] Abbott — autres dirigeables, piste écartée pour les ellipsoïdes

Ira H. Abbott, **“Airship Model Tests in the Variable Density Wind Tunnel”**, NACA Report 394 (1932).

- PDF consulté : <https://ntrs.nasa.gov/api/citations/19930091467/downloads/19930091467.pdf>.
- Lecture ciblée : résumé, description des formes/supports, p. 9 et sections de résultats. Coefficients basés sur **`Vol^(2/3)`** mais Reynolds basé sur **longueur du modèle**, explicitement p. 9 : déjà une différence avec [N1].
- Modèles Goodyear-Zeppelin/ZRS, avec configurations de coque, empennages et nacelles. **Ni ellipsoïdes purs ni passagers.** Aucune de leurs valeurs de traînée/portance adoptée. Cette piste ne comble pas l’absence de polaire expérimentale pertinente.

## 3. Géométrie exacte — dérivations, distinctes des mesures

Les résultats suivants sont des **dérivations géométriques**, sans coefficient aérodynamique. Toutes les dimensions sont explicites ; aucune dimension « humaine standard » n’est prescrite.

Soit `R` la rotation des axes du solide vers le repère spatial ; `n` un vecteur unitaire dans la direction du vent relatif. Ses composantes dans le solide sont `nb = Rᵀ n`.

### 3.1 Cube d’arête ℓ

Sommer les projections des faces visibles donne :

```text
Aproj(nb) = ℓ² (|nbx| + |nby| + |nbz|).
```

Donc `ℓ² ≤ Aproj ≤ √3 ℓ²` :

- face normale au vent : `ℓ²` ;
- direction diagonale d’une face, normale à une arête : `√2 ℓ²` ;
- direction d’une diagonale du cube : `√3 ℓ²`.

Avec ℓ = 0,5 m, **exemple géométrique uniquement** : 0,2500 ; 0,35355 ; 0,43301 m². Pour une rotation dans un seul plan, `Aproj = ℓ²(|cos α| + |sin α|)` ; maximum à 45°. Le maximum 45° de [C] concerne cette famille, pas toutes les orientations 3D.

Pour réutiliser les coefficients de [C] :

```text
dn = (6/π)^(1/3) ℓ ≈ 1,240701 ℓ
An = π dn²/4 ≈ 1,208994 ℓ²
Cd,proj = Cd,n An/Aproj
Re_n = 1,240701 Re_ℓ.
```

Changer l’aire sans convertir `Cd` compterait une seconde fois une variation d’aire déjà contenue dans le coefficient mesuré sur aire fixe. Inversement, garder `Cd` constant tout en changeant l’aire n’est pas la conséquence des essais : c’est une hypothèse supplémentaire.

### 3.2 Ellipsoïde de demi-axes a, b, c

Image orthographique d’une sphère unité par la transformation `diag(a,b,c)` : l’aire projetée résulte du facteur de surface `abc |diag(a,b,c)⁻¹ nb|` :

```text
Aproj(nb) = π abc √(nbx²/a² + nby²/b² + nbz²/c²).
```

Cela donne `πbc`, `πac`, `πab` selon les trois axes principaux. **Ne pas confondre avec l’aire de la section centrale normale à n**, qui vaut `πabc / √(a²nbx² + b²nby² + c²nbz²)` ; ces expressions diffèrent hors axes principaux.

Pour un prolate `(a,b,b)`, `a ≥ b`, et l’incidence α entre l’axe long et le courant :

```text
Aproj(α) = π b √(b² cos² α + a² sin² α)
Aproj(0) = πb² ; Aproj(90°) = πab.
```

L’ellipsoïde du rapport brut a des dimensions **totales** 0,4 × 0,4 × 1,0 m : demi-axes 0,2 ; 0,2 ; 0,5 m. Aire axiale 0,12566 m² ; aire latérale 0,31416 m². `0,4 × 1,0 = 0,40 m²` est l’aire du **rectangle englobant**, non celle de sa silhouette elliptique. Un coefficient tiré d’une source utilisant le rectangle pourrait être défini, mais devrait être converti ; le rapport brut n’établit pas cette convention.

### 3.3 Reynolds et portance : conséquences, pas nouvelle mesure

- `Re = ρ U Lref/η`. Lref doit rester celle de la source : diamètre équivalent, longueur d’axe ou autre longueur explicitement définie. Un nombre de Reynolds sans sa longueur est incomplet.
- Illustration de domaine, **pas condition atmosphérique prescrite** : si `U = 10 m/s` et `ν = 1,5 × 10⁻⁵ m²/s`, une arête de 0,5 m donne `Re_ℓ ≈ 3,33 × 10⁵`, donc `Re_n ≈ 4,14 × 10⁵`, très au-delà de la corrélation cube [C] plafonnée à 4516. Ce seul exemple interdit de présenter [C] comme validation directe d’un passager dans ce scénario.
- La silhouette ne détermine ni séparation, ni distribution de pression, ni `Cd`, ni portance. Déduire `CL = 0` de l’existence d’axes de symétrie est faux à incidence générique. À orientation et écoulement statistiquement symétriques, la symétrie contraint les composantes transverses moyennes ; elle n’annule pas les fluctuations instantanées et ne remplace pas une mesure.
- Pour un ellipsoïde incliné, la force n’est pas nécessairement colinéaire au vent relatif. « Portance » signifie composante normale à ce vent ; ce n’est pas nécessairement une force verticale géographique. Pour une orientation 3D générale, deux composantes transverses et des moments peuvent être nécessaires.

## 4. Passage solide → humain : ce qui reste inconnu

Un substitut géométrique peut servir à visualiser l’enveloppe, calculer l’aire ou organiser des scénarios d’incidence. Il ne reproduit pas automatiquement les ouvertures entre membres, vêtements, rugosité, casque, harnais, chariot, déformation, balancement, sillage ou moments de rotation d’un passager.

**Données manquantes pour un coefficient moteur :**

- géométrie/dimensions exactes ; orientation du corps relativement au vent, à la pesanteur et aux suspentes ;
- polaires de forces et moments, avec aire et longueur de référence ; domaine de Re ; transition, rugosité et turbulence ;
- posture/clothing/harnais et interactions avec chariot/ligne ; gamme d’incidence incluant vent de travers et courant oblique dû au déplacement ;
- variabilité entre personnes et répétabilité ; distinction moyenne/rafale/fluctuations ;
- règle d’orientation imposée ou mécanique de rotation/longe si le corps peut pivoter.

Aucun des huit dossiers ne valide une enveloppe d’erreur **humain ↔ cube** ou **humain ↔ ellipsoïde**. Les trois dossiers partiellement accessibles ne doivent pas être présentés comme comblant ces lacunes. Aucun `CL = 0`, `Cd = 1,05`, `Cd = 0,10` ou `CdA = 0,50 m²` par défaut n’est acquis.

« Plus de traînée » n’est d’ailleurs pas universellement « plus conservatif » : cela peut diminuer la vitesse d’arrivée mais augmenter certaines charges sous vent, ou favoriser un arrêt en portée. Il faut annoncer la grandeur à borner, pas invoquer un conservatisme global.

## 5. Vent relatif et charge de ligne — dérivation mécanique

Cette section est une **dérivation de bilan**, pas une validation expérimentale de modèle couplé.

### 5.1 Calculer la force une seule fois, dans l’espace

```text
u = u_air(rp,t) − vp
U = |u| ; n = u/U si U > 0
ub = Rᵀu
Fa = ½ρ U² Aref [Cd n + CL eL + CS eS]
```

`eL`, `eS` forment une base normale à `n` dont la convention doit être attachée aux données. Les coefficients dépendent de `ub`, Re, état de surface et autres conditions mesurées. Si la source utilise des axes liés au solide, reconstruire d’abord la force dans ces axes puis la tourner. À `U = 0`, la force aérodynamique est nulle sans normaliser un vecteur nul.

Un modèle ne gardant que la traînée colinéaire pose `CL = CS = 0` comme **hypothèse d’omission**, pas comme résultat démontré pour tous les solides. Un modèle d’orientation imposée omet aussi les effets des moments et des réactions correspondantes ; l’annoncer.

Le vent fourni par l’interface est « venant de ». Le convertir en **vitesse d’air allant vers** avant cette soustraction. `windComponents` effectue déjà la conversion dans le modèle local : ne pas inverser une seconde fois le signe.

### 5.2 Ce que fait réellement l’EDO actuelle

Au commit audité, `ride` calcule `rel = v − u_along cosθ`, puis une accélération de traînée `−½ρ CdA rel|rel|/m`. L’effet direct du travers est omis **par construction** ; pas de charge aérodynamique répartie de ligne ni de force latérale de passager dans cette fonction. Il n’y a donc pas aujourd’hui de double comptage d’une force aérodynamique spatiale qui n’y est pas implémentée.

Cette loi scalaire ne correspond pas, en vent oblique, à la projection d’une traînée spatiale quadratique isotrope. Pour démonstration seulement, si l’on suppose un produit `K = CdA` isotrope et un rail fixe de tangente unitaire τ avec `vp = vτ` :

```text
Fa·τ = ½ρ K |u_air − vτ| (u_air·τ − v).
```

La loi scalaire actuelle utilise à la place `|u_air·τ − v|`. Avec travers pur `Uy`, la norme spatiale contient `√(v² + Uy²)` : le travers change donc même la projection longitudinale de cette fermeture 3D. **On ne peut pas utiliser K = 0,45 m² dans cet exemple comme donnée isotrope validée.** Il s’agit d’une comparaison algébrique des modèles, pas d’une nouvelle prescription.

Correction documentaire : remplacer l’affirmation générale « le travers ne change pas la vitesse du passager » par **« le modèle longitudinal actuel omet l’effet direct du travers ; un modèle vectoriel futur doit le réévaluer »**. Cette correction concerne notamment `docs/simulation-theory.md` §12.2 et le commentaire de `dynamics.ts`, sans modifier leurs résultats à l’insu de l’utilisateur.

### 5.3 La ligne reçoit une réaction, non une seconde application de force extérieure

Définir un système ponctuel équivalent passager + équipement mobile, avec toutes ses masses/forces regroupées au même point dans cette idéalisation. Soit `Rc` la force de la ligne sur ce système, et `Fautres` les forces extérieures qui ne proviennent pas de cette ligne. Alors :

```text
m ap = m gvec + Fa + Fautres + Rc
P_ligne = −Rc = m gvec + Fa + Fautres − m ap.
```

En réel, la longe et le chariot introduisent positions distinctes, contraintes et éventuellement moments ; le regroupement ponctuel doit être déclaré et ne valide pas leurs efforts individuels.

Avec les conventions de la note actuelle :

```text
F(SP+) − F(SP−) = −P_ligne.
```

- Au repos strict sans accélération : charge statique complète `mgvec + Fa + Fautres` si la liaison équilibre effectivement toutes ces composantes.
- En mouvement : négliger l’inertie propre du câble dans un solveur quasi-statique **n’oblige pas à négliger l’accélération du passager**. Injecter sans discussion `mgvec + Fa` comme charge intégralement transmise et accélérer simultanément la même masse par ses composantes tangentielles dans l’EDO ne constitue pas un couplage mécanique fermé.
- La force tangentielle apparaît dans l’équation de mouvement de la masse ; sa partie transmise doit venir du bilan de réaction. Les réactions internes s’annulent dans le bilan global passager + câble. C’est ainsi que l’on évite le double comptage, et non en supprimant arbitrairement toute traînée de l’EDO.

**Exemple contrôlable : rail fixe lisse, sans autre force, masse ponctuelle.**

```text
ap = vdot τ + v² κ     (κ = dτ/ds)
m vdot = (mgvec + Fa)·τ
P_ligne = (I − ττᵀ)(mgvec + Fa) − m v²κ.
```

La liaison idéale ne transmet aucune composante tangentielle. Elle transmet les composantes normales, y compris la réaction centripète. Un frottement ou freinage lié à la ligne ajoute sa réaction tangentielle opposée ; un frein externe doit être attribué à son vrai support. Les différents systèmes ne doivent pas recevoir chacun la force complète par commodité.

**Limite de cet exemple :** dans la tyrolienne déformable, le lieu des positions du chariot n’est pas la tangente de l’un des segments instantanés au point anguleux. Pour une famille quasi-statique `rp(q,t)`, la vitesse est `∂rp/∂q qdot + ∂rp/∂t`, avec son accélération correspondante. Une ligne en mouvement, une longe qui pivote ou une forme dépendant de la vitesse rendent insuffisante l’EDO sur un lieu figé. Les termes d’énergie gravitationnelle/élastique de câble déjà signalés par la note restent à traiter.

### 5.4 Contrôles de non-double-comptage

- Une seule évaluation de `Fa` par état cohérent ; mêmes `u`, orientation et coefficients pour la trajectoire et la réaction de ligne.
- Vitesse prescrite pour le calcul statique : l’étiqueter comme scénario, sans annoncer un couplage autonome. Si vitesse et forme se déterminent mutuellement : résoudre leur cohérence et le résidu de réaction, pas seulement la convergence visuelle de la forme.
- Bilan global : réactions des ancrages + poids de ligne + forces extérieures du passager et de ligne = dérivée de quantité de mouvement de l’ensemble dans le modèle retenu.
- Rail fixe lisse : les équations ci-dessus doivent être retrouvées ; au repos, retour au bilan statique selon les contraintes.
- Vent relatif nul : aucune force aérodynamique ; vent arrière plus rapide que le passager : propulsion longitudinale possible.
- Pour une traînée colinéaire positive : `Fa·(vp − u_air) = −½ρ Cd Aref U³ ≤ 0`. Cette dissipation **relative à l’air** n’impose pas `Fa·vp ≤ 0` : l’air peut fournir de l’énergie au passager.
- Ligne sans vent distribué mais vent sur passager : un seul saut de réaction. Vent sur ligne et passager : deux contributions sur deux surfaces différentes, pas duplication de la même force.

## 6. Erreurs du rapport IA brut et statut de preuve

| Passage du brut | Diagnostic | Correction |
| --- | --- | --- |
| §3.3 : ellipsoïde 0,4 × 0,4 × 1,0 m, aire 0,40 m², Cd 0,10 | Aire = rectangle, pas ellipse ; orientation aérodynamique « streamlined » non conciliée avec aire latérale ; origine expérimentale du Cd non établie | Employer la formule de projection ; conserver Cd et son aire/incidence de source ensemble ; coefficient inconnu ici |
| §3.3 : cube Cd 1,05 appliqué à une face de 0,25 m² sans Re ni orientation | Valeur de compilation alléguée, pas mesure primaire vérifiée ; aucune polaire ni domaine | Aucun défaut validé ; ne pas lui substituer non plus le Cd sur aire équivalente de [C] sans conversion |
| §3.3 : cube/ellipsoïde « forcément » sous-estimants, cylindre « seul » substitut raisonnable | Comparaison dominée par dimensions choisies et coefficients incompatibles ; aucune validation contre passager | Aucune hiérarchie générale démontrée. Le Cd d’un cylindre long ne valide pas un cylindre court avec extrémités ni un humain |
| §3.1 et §3.5 : plages humaines, CdA 0,50 m² « highly conservative », facteurs posture 0,5/1,4 et vêtements 1,3 | Aucun essai humain pertinent lu dans cette passe ; une référence à des cyclistes ne suffit pas à établir ces postures de tyrolienne ; chiffres non traçables ici | Ne pas importer les valeurs. Conserver le 0,45 longitudinal local avec ses limites, sans prétendre le revalider |
| §3.2 : chariot automatiquement inclus dans CdA et parasitage 0,03–0,05 m² | Aucun essai d’ensemble ni séparation d’interactions identifié dans les documents consultés | Inclusion ou ajout seulement selon la calibration utilisée ; ne pas additionner deux fois un équipement déjà inclus |
| §3.4 : projeter d’abord le vent puis élever au carré « captures ... perfectly » | Bonne gestion du signe en 1D, mais fermeture scalaire, pas projection générale de force quadratique 3D ; ambiguïté entre vitesse d’abscisse et vitesse curviligne | Calcul spatial puis projection si modèle 3D ; convention explicite sur la vitesse et la trajectoire |
| §2.3 : vent pur Y produit nécessairement une force verticale sur câble avec pente Z | **Faux algébriquement pour ligne plane x–z** : `t_y = 0` donc `u·t = 0`, `u_n = (0,Uy,0)` et `f_z = 0` | Une composante normale verticale exige ici `t_y t_z ≠ 0` ou une autre composante de vent ; la pente verticale seule ne suffit pas |
| §2.4 : travers pur nécessairement moins normal près des ancrages pentus | Même erreur ; dans le plan x–z, le travers Y reste normal quelle que soit la pente | La charge peut varier via forme 3D, vent, Cd, diamètre ou allongement, mais pas via cette seule pente dans ce cas précis |
| §1.1 : symétrie ⇒ portance/moment nuls sans préciser moyenne | Confusion moyenne/instantané ; l’argument ne vaut pas à incidence quelconque ni avec écoulement asymétrique | Séparer composante moyenne, fluctuations et hypothèses de symétrie |
| §§1.2–1.5 : domaines universels corde/torons, portance nulle textile, seuil 30°, chiffres de traînée et galloping | Hors mission expérimentale passager ; non vérifiés ici, non validés par les solides consultés | Ne pas les promouvoir en données moteur. La formule normale de ligne reste une fermeture candidate, pas un théorème « exact » pour toute corde |

Les références alléguées à Hoerner, Schlichting, Blevins, Defraeye, Macdonald ou aux normes ne sont **pas déclarées fausses sur la seule base de leur présence dans un rapport IA**. Leur contenu précis et, le cas échéant, la correspondance titre–DOI restent non vérifiés dans ce budget. L’erreur démontrée est leur emploi sans chaîne de preuve applicable, en plus des erreurs géométriques et vectorielles ci-dessus.

## 7. Corrections recommandées de la note actuelle — sans modification du dépôt

### 7.1 Conserver

- Le statut préparatoire, l’interdiction d’inventer des coefficients et la séparation acier/textile.
- L’inséparabilité `Cd–Aref`, l’usage du vent relatif spatial et les réserves sur le couplage.
- L’absence de coefficient cube/ellipsoïde par défaut et la non-transférabilité de `CdA = 0,45 m²` longitudinal.
- Les réserves sur quasi-statique, énergie de ligne mobile et distinction entre lieu du passager et tangentes instantanées.

### 7.2 Compléter §3 par un encadré concret

> **Cube/ellipsoïde : géométrie calculable, aérodynamique non acquise pour le passager.** Cube : `Aproj = ℓ² Σ|nb,i|`. Ellipsoïde de demi-axes `(a,b,c)` : `Aproj = πabc √Σ(nb,i/ai)²`. Ces identités ne donnent aucun Cd. Les essais de cubes Wang et al. (2025), pp. 6–12, utilisent l’aire d’une sphère de même volume et une plage de Re limitée ; les chutes de sphéroïdes 2:1 Stringham et al. (1969), pp. C10–C13/C22/C31, ne donnent pas de polaire contrôlée de portance/incidence. Le tableau de Cd de Clarke et al. (2007), p. 1386, est numérique, explicitement sans mesure de traînée pour comparaison. Aucun de ces travaux ne valide une calibration humaine latérale.

### 7.3 Rendre le couplage explicite

Ajouter à l’avertissement actuel :

> La charge ponctuelle de ligne est la réaction opposée de la liaison : pour un système mobile ponctuel cohérent, `P_ligne = mgvec + Fa + Fautres − m ap`. Employer `mgvec + Fa` suppose une accélération négligée et des contraintes capables de transmettre les composantes correspondantes. La seule projection de `Fa` dans l’EDO n’autorise ni son retrait arbitraire de toute charge de ligne, ni sa transmission intégrale sans bilan de réaction. Le solveur de forme peut négliger l’inertie de ligne tout en conservant celle du passager.

### 7.4 Corriger la portée de la théorie longitudinale

Dans la note §1 et la théorie §12.2, qualifier la loi actuelle de **fermeture longitudinale scalaire à vent projeté**, et non de projection exacte d’une loi spatiale générale. Ne pas remplacer silencieusement sa calibration SSF par un produit isotrope ou une moyenne des trois axes.

### 7.5 Mettre à jour §9 sans prétendre la lacune fermée

Remplacer « revue interrompue, aucun résultat spécialisé » par une synthèse proportionnée : géométrie et erreurs du brut contrôlées ; sources primaires de cubes et sphéroïdes relues ; conventions d’aire/Re explicitées ; **polaire intégrale dans le domaine de passager et validation humaine toujours manquantes**. Les issues ne deviennent pas prêtes pour implémentation de coefficients par cette seule revue.

## 8. Recommandation de décision

**Autoriser :** géométrie explicite de silhouettes ; scénarios expérimentaux à coefficients fournis par l’utilisateur avec provenance, domaine et statut « non validé humain » ; tests analytiques de projections, signes et bilans de réaction.

**Ne pas autoriser comme résultat physique validé :** coefficient par défaut cube/ellipsoïde, force latérale humaine déduite de 0,45 m², portance supposée nulle à toute incidence, mise à jour de tensions avec charge complète passager sans bilan d’inertie, ou garantie conservative de garde/vitesse/sécurité.

**Acquisition prioritaire :** essais sur mannequin/passager avec équipement, orientation et suspension documentées ; forces/moments multi-axes sous courant oblique, Re et turbulence représentatifs ; séparation des données utilisées pour calibrer et pour valider. Faute de ces données, afficher explicitement l’inconnue plutôt qu’un coefficient plausible.

---

### Reproductibilité locale

PDF, extractions `pdftotext -layout`, notices JSON et instantanés locaux du commit sont conservés sous `/tmp/simu-aero-verif/`. Principaux fichiers : `cube2025.pdf/.txt`, `usgs562c.pdf/.txt`, `usgs-table6.png`, `sph3.pdf/.txt`, `19930087637.pdf/.txt`, `19930091467.pdf/.txt`, `dynamics-6bada50.ts`, `wind-6bada50.ts`, `theory-6bada50.md`. Les tentatives d’accès échouées ne sont pas des PDF exploitables même lorsqu’elles portent une extension `.pdf`.
