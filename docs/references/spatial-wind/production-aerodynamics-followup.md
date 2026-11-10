# Suites aérodynamiques de production — #127

> **Mise à jour après recherche :** les questions de décision ouvertes dans ce rapport ont
> été tranchées par le mainteneur en Q35–Q43. Voir
> [décisions consolidées](triage-decisions-consolidated.md) et
> [brief #127](https://github.com/fuzoh/simu-tyro/issues/127#issuecomment-6775389911).
> Ligne normale seule C_D⊥=1,2 ; silhouette et placement conventionnels, C_D passager=1,0 ;
> diamètre textile requis pour le calcul sous vent, accessoires omis. Les constats de données
> manquantes restent vrais : adoption d’une convention ne transforme pas celle-ci en mesure.
> Les sections « décisions ouvertes » ci-dessous sont l’état historique de la recherche,
> pas des blocages actuels ni une autorisation de rouvrir ces choix.

**Date d'accès :** 10 novembre 2026. **Objet :** les deux décisions de production encore ouvertes après #134 : déduire un ellipsoïde fixe du gabarit vertical existant, et traiter les charges de ligne normale, de portance et axiale. **Recherche seulement.** Aucun coefficient n'est adopté. Aucune implémentation n'est autorisée par cette note.

Cette note ne reprend pas les revues du 9 novembre ni la note de significativité du 10 novembre, sauf pour dire ce qu'une source nouvellement lue confirme ou ne confirme pas. Le commentaire consolidé de [#127](https://github.com/fuzoh/simu-tyro/issues/127) (Q1–Q23, puis Q24 et Q30–Q32 ; Q33 retirée) prévaut sur toute recommandation antérieure. #134 est une sensibilité isolée, pas une campagne produit.

Niveaux : **[P]** page ou figure lue dans cette passe ; **[D]** algèbre ou lecture du code, sans coefficient nouveau ; **[A]** déjà consigné, non relu mot à mot ici ; **[H]** option non validée ; **[N]** non obtenu. Un chiffre cité est celui du dispositif lu, pas un défaut du moteur.

Context7 a été interrogé le 10 novembre 2026 (`ctx7 search` sur un coefficient de traînée de câble ou d'ellipsoïde). Aucune bibliothèque de documentation ne correspond. Ce n'est pas une source de coefficients physiques.

## 1. Réponse

**Aucun coefficient de production n'est justifiable à partir des sources ouvertes lues.** Deux rapports primaires, inaccessibles aux passes précédentes, sont maintenant lus. Ils mesurent des câbles toronnés, pas un `6×19` de tyrolienne et pas une corde textile sèche.

- **Portance.** Elle est mesurée, en air et en eau, sur des constructions voisines, dans le domaine de Reynolds de l'application. Son signe dépend du commettage, que le Scénario ne porte pas. L'omettre comme si `C_L = 0` était mesuré reste faux. L'adopter depuis ces tables serait un transfert.
- **Traînée normale.** Les mêmes rapports donnent des coefficients d'ordre 1 au travers, avec des écarts de plusieurs dixièmes selon la construction, le Reynolds et le fluide. Ce n'est pas un `C_D⊥` de `6×19` ni de corde sèche.
- **Traînée axiale.** Toujours non mesurée de façon exploitable. Horton et al. ont tenté la mesure et l'ont rejetée : la caténaire du modèle contaminait la tension. Batill et Nebres intègrent des pressions et excluent le cisaillement. Aucun `C_t` n'en sort.
- **Ellipsoïde.** Le gabarit est une longueur verticale unique. Il inclut poulie et longe. Il ne fixe ni trois axes, ni une aire, ni un `C_e`. Aucune norme ouverte lue ne publie une aire de vent du passager qui inclurait chariot et longe. Déduire le solide sans constantes internes nommées inventerait l'anatomie que Q23 interdit.

#134 ne change pas ce constat. Ses sondes montrent qu'un terme paramétré peut bouger une forme. Elles ne calibrent pas un produit. Une omission de production, si elle est choisie plus tard, doit être nommée comme un manque de donnée, pas comme une petitesse démontrée.

## 2. Décisions déjà fermées — ne pas les rouvrir

Relevé sur les commentaires de #127 du 10 novembre 2026 et sur [agent-readiness-decisions.md](agent-readiness-decisions.md). Cette passe ne les rejoue pas.

- Équilibres spatiaux statiques, passager immobile et maintenu au chariot, force aérodynamique statique intégralement transmise, sans dépendance à la vitesse de descente.
- **Q12.** La descente garde le `C_dA` existant. L'ellipsoïde, s'il existe, ne sert que le vent statique. Les deux fermetures restent distinctes.
- **Q11.** Chemin expérimental accepté. #134 est livrée. Les défauts de production et toute omission définitive restent ouverts. Les sondes ne sont pas des propriétés produit.
- Vent horizontal seulement. Diamètre aérodynamique constant dans chaque calcul. Pas de loi `d(T)`.
- Deux brins : moitié du poids et de la force du passager, poids propre et vent réparti non divisés, pas de sillage. Partage supposé, pas présenté comme conservatif.
- Ellipsoïde d'orientation fixe si un solide est calculé : hauteur verticale, profondeur selon A–B, largeur transversale. Ni rotation, ni balancement, ni déport latéral du passager par rapport au chariot.
- **Q23.** Déduire l'ellipsoïde du gabarit vertical existant, sans nouveau champ. La règle, les proportions et les défauts n'étaient pas fixés. Cette note dit pourquoi le gabarit ne suffit pas.
- Garde verticale avec le gabarit existant. Terrain extrudé : pas une garde hors axe.
- Q24, Q30, Q31, Q32 : indisponibilité, flèche verticale, `H`, rapport V. Hors de cette note. Q33 retirée : ne pas présenter une inversion multiple comme un problème établi.

## 3. Gabarit — ce que le code tient, et ce qu'il ne tient pas

### 3.1 Fait local

**[P] code.** `hRider` est un scalaire en mètres, strictement positif, porte Clearance et pas Solve (`src/lib/rail/fields.ts`, champ `hRider`). Défaut du premier lancement : `2.1` (`src/lib/scenario/first-run.ts`). Il est soustrait en entier :

```text
h_clear = z_câble − z_sol − h_rider
```

(`src/lib/sim/clearance.ts`, soustraction à la ligne 265). Changer `hRider` ne change aujourd'hui que la garde.

Trois formulations coexistent. Elles ne sont pas un modèle anatomique unique, et cette note ne les fusionne pas :

| Source | Ce qu'elle dit | Ce qu'elle ne stocke pas |
| --- | --- | --- |
| Aide, `src/lib/rail/help.ts` (`hRider`) | hauteur occupée sous le câble par le passager, son harnais et sa poulie ; `2,1 m` est une `[CONVENTION]` | pas de partage poulie / longe / corps |
| Glossaire, **Rider Envelope** | espace vertical sous le câble : poulie, longe et corps, soustrait en entier | pas trois axes |
| Théorie §6.3 | défaut expliqué par `1,5 + 0,6 = 2,1 m`, longe plus corps sous le harnais, `[CONVENTION]` ; une autre recherche suggérait `1,2 m` de suspension | le partage n'est pas un champ, pas une clé d'URL |

**[D].** L'empattement de chariot `0,10–0,25 m` de §6.3 est dit négligeable pour la charge ponctuelle sur une portée ≥ 50 m. Ce n'est pas une dimension aérodynamique, et ce n'est pas dans `hRider`.

**[N].** EN 15567, garde normative, couloir de vent et masse de calcul restent `[PAYWALLED]` dans `docs/simulation-theory.md` §§8.3–8.4 et §11. Le texte de clause n'a pas été acheté ni lu ici. Aucune aire de vent « passager + chariot + longe » n'en a été extraite. ACCT n'a pas été ouvert.

### 3.2 Ce qui est déterminé, et ce qui reste libre

**[D].** Un seul nombre `h > 0` détermine la soustraction de garde. Il ne détermine pas :

- la part poulie + longe, la part corps, ni le vide entre les deux ;
- la hauteur du solide aérodynamique : le torse peut être au-dessus de l'attache et encore sous le câble ;
- la largeur et la profondeur : la masse `mp` ne donne pas un volume sans une masse volumique inventée, et un volume ne fixe pas trois axes ;
- la posture : #127 fixe l'orientation du solide, pas la forme du corps ;
- `C_e` : une aire, même connue, n'est pas un coefficient ;
- un diamètre de longe, s'il fallait un second cylindre.

**[H], non adopté.** La seule famille compatible avec « pas de nouveau champ » et « tout `h > 0` reste défini » est une convention interne en fractions de `h`, du type déjà écrit dans [agent-readiness-aerodynamics.md](agent-readiness-aerodynamics.md) §6.3 : `2c = (1−σ) h`, `2b = κ_y · 2c`, `2a = κ_x · 2c`, avec `0 < σ < 1`. `σ`, `κ_x` et `κ_y` ne sont pas déduits. Les poser serait une décision du mainteneur, étiquetée `[CONVENTION]`, jamais une anthropométrie.

Deux lectures sont des pièges, pas des déductions :

- hauteur de solide `0,6 m` au défaut, via `1,5/2,1` : cela identifie le solide au segment sous le harnais et oublie le torse ; le partage n'est pas une loi d'échelle ;
- solide de hauteur `h` : cela avale poulie, longe et vide. Q23 dit que le gabarit n'est pas la hauteur du corps. Cette option n'est acceptable que si le mainteneur la nomme comme enveloppe brute, pas comme corps.

**[D].** L'aire projetée d'un ellipsoïde, une fois les demi-axes connus, reste celle déjà dérivée : `A_proj = π a b c √(n_x²/a² + n_y²/b² + n_z²/c²)`. C'est une aire, pas un `C_d`. Le `C_dA = 0,45 m²` de §12.2 est le calage longitudinal SSF. Q12 interdit d'en faire la traînée statique latérale, et de le diviser par une aire pour fabriquer `C_e`.

**[A]/[N].** Les polaires déjà écartées ne sont pas rouvertes : chutes libres de sphéroïdes (Stringham et al. 1969), pressions de Clarke et al. 2007 dont les `C_d` sont calculés, Zahm 1927 pour la sphère, Neuhart 2007 dont le `0,0026` n'est pas rattaché à une aire. Un ellipsoïde tenu fixe n'a pas le coefficient d'un solide en chute libre. Cette passe n'a pas obtenu de polaire de soufflerie d'ellipsoïde triaxial fixe, à l'azimut du vent, avec une aire de référence identifiée, qui représenterait un gabarit incluant chariot et longe.

Contrôle d'accès, pas une relecture : la notice NTRS `19890038141` (Dress, sphéroïde modifié, incidence nulle) répond `downloadsAvailable: false` le 10 novembre 2026. Le PDF n'a pas été lu.

## 4. Ligne — sources primaires lues, et ce qu'elles ne sont pas

### 4.1 Fermeture déjà écrite, et le piège de normalisation

**[D].** La fermeture de l'expérience, `docs/simulation-theory.md` §18.3, n'est pas remplacée :

```text
f_n = ½ ρ C_D⊥ d |u_n| u_n          par mètre étiré
f_L = ½ ρ C_L  d |u_n|²             direction σ b, σ ∈ {−1, 0, +1}
f_a = ½ ρ C_t  d (u·t)²             selon −sign(u·t) t
```

`θ = 90°` est le travers, `θ = 0°` le vent parallèle à l'axe. Alors `|f_n| / (½ ρ U² d) = C_D⊥ sin²θ`. Un coefficient publié sur la dynamique amont `½ ρ U²`, sans le `sin²θ` sorti, n'est pas `C_D⊥`. Un coefficient de portance publié sur `½ ρ U²` n'est pas le `C_L` de §18. Coller `0,2` de l'un dans l'autre est une erreur d'unité, pas une calibration.

`C_D⊥ = 1,2` de §18.4 reste l'illustration de cylindre lisse non transférable déjà nommée. Les `C_L ∈ {0 ; 0,05 ; 0,2 ; 0,5}` et `C_t ∈ {0 ; 0,02 ; 0,1}` restent des sondes. #134 le dit dans son rapport : ne pas omettre au motif de la négligeabilité, et ne pas adopter ces coefficients.

### 4.2 Batill et Nebres 1992 — air, pression, pas un 6×19

**[P].** S. M. Batill et J. V. Nebres, *Detailed Near Surface Flow about Yawed, Stranded Cables*, Naval Surface Warfare Center, Coastal Systems Station, contractor report CSS CR 1210-92-1, AD-A257 382, octobre 1992. Distribution publique. PDF lu : [archive.org/download/DTIC_ADA257382](https://archive.org/download/DTIC_ADA257382/DTIC_ADA257382.pdf), notice [archive.org/details/DTIC_ADA257382](https://archive.org/details/DTIC_ADA257382). Consulté le 10 novembre 2026 sur l'extraction texte du PDF public : page de titre, résumé, nomenclature, §§1–2, §4.1.2, conclusions, références, et les tables 29–30. Les en-têtes OCR sont abîmés ; la grille citée concorde avec la prose des auteurs. Ce n'est pas une redigitalisation de la planche. `apps.dtic.mil` a répondu HTTP 403 le même jour ; la copie Archive.org est le texte lu.

Ce rapport est la phase détaillée dont l'article Nebres, Batill et Nelson 1993 (*Experiments in Fluids*) est le descendant. Unpaywall, 10 novembre 2026, confirme encore `is_oa = false` pour le DOI `10.1007/bf00196987`. Le corps de 1993 n'a pas été lu. Les chiffres ci-dessous viennent du rapport 1992, pas de l'article.

**Dispositif, pas un produit.**

- Soufflerie basse vitesse, modèles **rigides** : cylindre, `7×7`, `4×7` dentelé, `7×1`, `4×1`. Aucun `6×19`.
- Diamètres : répliques coulées de `0,625 in` (conversion : `15,9 mm`) à partir de câbles acier réels ; modèles plus grands en tubes, annoncés d'environ `1,85 in`, le `4×7` dentelé de cette série ayant un diamètre nominal écrit de `1,68 in`. Pas la bande 6–26 mm comme loi, même si `15,9 mm` tombe dedans.
- Reynolds annoncé `5×10³–5×10⁴`. Les tables de force intégrée sont à `10×10³`, `30×10³`, `43×10³`–`46×10³`.
- Coefficients obtenus par **intégration des pressions moyennes**. Le cisaillement de peau n'est pas inclus. Donc pas une traînée axiale, et pas la traînée totale d'une balance.
- `q` est la dynamique amont. `D` est le diamètre du câble. L'angle de câble `90°` est le cas non lacet, perpendiculaire à l'écoulement ; `20°` est le plus proche du vent axial. Même sens que `θ` de §18.
- Le texte dit que la longueur unitaire retenue est « spanwise » quel que soit le lacet, pour comparer à Horton et al. 1987. L'équation de panneau est illisible dans l'extraction. L'inférence du paragraphe suivant ne reconstruit pas cette équation.

**[P], tables 29 et 30.** Traînée intégrée, puis portance intégrée. Lecture de l'extraction texte, recoupée avec la prose, pas une numérisation de courbe.

Traînée, extraits au travers (`90°`) et à `60°` :

| Modèle | `90°` | `60°` |
| --- | --- | --- |
| Cylindre, Re `10/30/46×10³` | `1,08` / `1,17` / `1,10` | `0,82` / `0,89` / `0,87` |
| `7×1`, Re `30/46×10³` | `1,20` / `1,18` | `0,82` / `0,93` |
| `4×1`, Re `30/46×10³` | `1,00` / `1,00` | `0,80` / `0,83` |
| `7×7`, Re `10/30/45×10³` | `1,22` / `0,83` / `0,80` | `0,87` / `0,64` / `0,62` |
| `4×7` dentelé, Re `10/30/43×10³` | `1,08` / `0,71` / `0,71` | `0,90` / `0,66` / `0,67` |

Portance, mêmes colonnes. Le signe suit le commettage dans leur convention : `7×7` toronné à gauche, portance négative vers le côté lisse.

| Modèle | `90°` | `60°` | `40°` | `20°` |
| --- | --- | --- | --- | --- |
| `7×1`, Re `30×10³` | `−0,06` | `−0,21` | `−0,17` | `−0,10` |
| `4×1`, Re `30×10³` | `−0,17` | `0,20` | `0,19` | `0,10` |
| `7×7`, Re `10×10³` | `0,07` | `−0,12` | `−0,16` | `−0,06` |
| `4×7` dentelé, Re `10×10³` | `−0,02` | `0,21` | `0,13` | `0,03` |
| `4×7` dentelé, Re `30×10³` et `43×10³` | `0,01` / `0,00` | `0,04` / `0,03` | `−0,05` / `−0,07` | `−0,05` / `−0,04` |

Le texte dit que le maximum de portance est à `60°`, d'environ `0,2`, plus faible à `40°` et à `20°`, et que la portance du `4×7` dentelé reste souvent dans `±0,05` une fois le régime qu'ils jugent critique. Les `7×7` et `4×7` voient leur traînée à `90°` chuter entre `10×10³` et `30×10³`. Les auteurs rapprochent cela d'un Reynolds critique de câble pouvant descendre vers `30×10³`–`35×10³`, en citant Counihan 1963, **non lu ici**.

**[D], inférence, pas une formule du rapport.** La colonne cylindre (`1,10–1,17` à `90°`, `0,82–0,89` à `60°`, `0,45–0,53` à `40°`, `0,15` à `20°`) suit à peu près `1,1 sin²θ`. C'est ce qu'on attend si leur `C_d` est déjà la force normale divisée par `½ ρ U² D`, et non `C_D⊥`. Leur `0,2` à `60°` n'est donc pas le `C_L` de §18. Le diviser par `sin²60° = 0,75` donnerait environ `0,27` dans cette normalisation, et le rapport grandit encore vers `20°`. Un `C_L` constant de §18 ne reproduit pas la table. **Ne pas copier `0,2` dans la sonde #134 et l'appeler Batill.**

**Transfert refusé.** Pas un `6×19`. Pas un câble tendu de tyrolienne. Pas de cisaillement. Le sens de portance dépend d'un commettage que `src/lib/sim/materials/steel.ts` ne code pas : `6×19` ou âme métallique choisit `K`, pas le sens de toronnage. Le mécanisme et l'ordre de grandeur sont acquis pour **ces** modèles. Le nombre produit ne l'est pas.

### 4.3 Horton, Ferrer, Watson et Charvoz 1987 — eau, force, pas un 6×19

**[P].** K. J. Horton, C. M. Ferrer, K. P. Watson et D. Charvoz, *Measurements of the Hydrodynamic Force and Strum Characteristics of Stranded Cables*, Naval Coastal Systems Center, NCSC TM 471-87, AD-A191 535, décembre 1987. PDF lu : [archive.org/download/DTIC_ADA191535](https://archive.org/download/DTIC_ADA191535/DTIC_ADA191535.pdf). Consulté le 10 novembre 2026 sur l'extraction texte du PDF public : résumé, glossaire, paramètres d'essai et table 1, formule de `C_d`, tables 4 et 7, section de traînée tangentielle, conclusions. La figure 21 n'a pas été numérisée : seul le `1,46` écrit dans le texte est retenu. La formule `C_dn` est partiellement illisible ; le texte dit qu'elle utilise la vitesse normale.

**Dispositif.** Bassin de remorquage à grande vitesse, David Taylor. Cinq câbles réels, tendus sur `14 ft` entre deux étrésillons, `2` à `10` nœuds, angles `20°` à `90°`. Ce n'est pas de l'air. Les modèles vibrent (strum). Ce n'est pas une ligne statique de tyrolienne.

Constructions, table 1, diamètres réels voisins de `0,625 in` sauf le `4×7` :

| Construction | Diamètre nominal / réel | Commettage |
| --- | --- | --- |
| `1×19` | `0,625` / `0,632 in` | gauche |
| `7×7` | `0,625` / `0,640 in` | gauche |
| `3×19` | `0,625` / `0,615 in` | droite |
| `4×7` dentelé | `0,797` / `0,700 in` | droite |
| `6×25` lang lay | `0,625` / `0,625 in` | droite, fils dans le sens des torons |

**Pas de `6×19` dans leurs éprouvettes.** Le `6×25` lang lay est le plus proche par le nombre de torons extérieurs, et il n'est pas un `6×19` regular lay à âme textile ou métallique. Il n'a été essayé qu'à deux vitesses, deux tensions et trois angles (`30°`, `60°`, `90°`), et seulement pour la traînée.

**Normalisation lue sur la page 39.** `C_d = R / (½ ρ V² D)`, `R` force normale par unité de longueur, `V` vitesse amont, `β = 90°` perpendiculaire. Le texte dit que la moyenne combinée de ces données à `90°`, tous modèles y compris le `6×25`, les deux tensions, vaut **`1,46`**. La dispersion est la plus grande au plus bas Reynolds cité, `Re = 1,8×10⁴`. Ailleurs, `2` à `10` nœuds sont associés à `1,6×10⁴ < Re < 8,0×10⁴` pour le nombre de Strouhal à `90°`. La phrase de conclusion sur la borne de Reynolds est tronquée dans l'extraction : elle n'est pas citée.

**Table 4, page imprimée 41, « average normal drag coefficients » :** `1×19` `1,43` ; `7×7` `1,44` ; `3×19` `1,44` ; `4×7` dentelé `1,58` ; `6×25` lang lay `1,30`. Le paragraphe qui introduit la table parle des balayages en angle de la figure 22, et le paragraphe suivant dit que les coefficients de cette figure sont fondés sur la vitesse amont totale. La légende ne dit pas que la moyenne est seulement à `90°`, ni que c'est `C_dn`. **Ne pas lire `1,30` comme un `C_D⊥` de `6×25`, encore moins de `6×19`.**

Ils définissent ensuite `C_dn = C_d / sin²β` et écrivent que, sur **leurs** essais, ce coefficient reste à peu près groupé autour de `1,46` pour `50° ≤ β ≤ 90°`, et que le principe d'indépendance cède aux angles plus faibles. C'est un résultat de bassin, câbles vibrants, pas une loi du moteur. Cela rejoint, sans le remplacer, le constat déjà acquis sur cylindre lisse : l'indépendance est une approximation à domaine, pas une identité (**[A]**, Bursnall et Loftin).

**Portance, table 7, page imprimée 68.** Moyennes `C_ℓ` pour les quatre modèles complets, pas le `6×25` : `1×19` `0,139` (écart-type `0,0812`) ; `7×7` `0,116` (`0,0572`) ; `3×19` `0,222` (`0,1000`) ; `4×7` `0,139` (`0,0610`). Le texte dit que l'indépendance **ne** réduit **pas** la portance comme elle réduit la traînée normale, et que le Reynolds et la géométrie dispersent les valeurs. Les écarts-types sont du même ordre que les moyennes. Ce n'est pas une borne `±0,2` à coder.

**Traînée tangentielle, lue.** Les auteurs ont mesuré la tension d'extrémité et l'ont jugée inutilisable pour une fonction de charge axiale : la caténaire due à la traînée normale fait croître la tension avec le carré de la vitesse, y compris à `90°`, où une traînée axiale devrait être nulle si le brin est partout normal à l'écoulement. Conclusion : une autre méthode est nécessaire pour une traînée tangentielle exacte. **Aucun `C_t` n'est publié.** L'échec de mesure n'est pas une preuve que le terme est petit.

**Citation non lue.** Horton et al. écrivent que des essais en soufflerie ont porté sur des modèles `6×19` et `4×7` (Schultz 1962) et sur un `1×19` (rapport anonyme 1949). Références :

- David W. Taylor Model Basin Report 1645, M. P. Schultz, *Wind-Tunnel Determination of the Aerodynamic Characteristics of Several Twisted Wire Ropes*, Aero Report 1028, juin 1962.
- David W. Taylor Model Basin Report R-312, *Wind-Tunnel Tests of Mine Sweeper Cables*, Aero Report 705, décembre 1949.
- J. Counihan, *Lift and Drag Measurements on Stranded Cables*, Imperial College Report 117, 1963.

Recherche Archive.org du 10 novembre 2026 : zéro notice pour ces trois titres. **Aucun coefficient de Schultz n'est repris.** Savoir qu'un `6×19` a été cité comme ayant été essayé en soufflerie n'est pas avoir lu son `C_d`.

Hoerner, *Fluid-Dynamic Drag* (1965), est cité par Horton en note 11. Une copie OCR d'Internet Archive [`FluidDynamicDragHoerner1965`](https://archive.org/details/FluidDynamicDragHoerner1965) a été lue (HTTP 200 le 10 novembre 2026), pas une planche nette. La page 4-5 de cette copie écrit un coefficient de base d'environ `1,17` pour des câbles et cordes toronnés, semblable au cylindre subcritique, et la figure 10 se lit approximativement `1,19`, `1,14`, `1,04`, `1,03` et `1,06` sans que l'éprouvette de chaque chiffre soit récupérée. Le second Reynolds d'une baisse vers `1,0` est illisible (`6T0^`) et n'est pas retenu. Aucun `C_f` n'est dans le passage de principe de travers lu. Ce n'est pas un `6×19`, ni une corde sèche. Le `1,17` n'est pas adopté. ESDU n'a pas été ouvert.

### 4.4 Textile sec — toujours non obtenu

**[P], requête, pas une preuve d'absence mondiale.** OpenAlex, 10 novembre 2026, recherche `kernmantel rope aerodynamic drag` : `count = 0`. Europe PMC, `kernmantel rope drag` : `hitCount = 0`. D'autres requêtes OpenAlex ont été interrompues par HTTP 429. Cela borne ces requêtes, pas la littérature.

**[P], résumé éditeur, PDF non retenu.** Jana Siegmund et al., *Air drag coefficient of textile-covered elastic cylinders – preliminary aerodynamic studies*, Communications in Development and Assembling of Textile Products 2(2), 187–195, 2021. DOI [10.25367/cdatp.2021.2.p187-195](https://doi.org/10.25367/cdatp.2021.2.p187-195). La page éditeur lue le 10 novembre 2026 dit : cylindre rigide et cylindre mou (gélatine), cinq surfaces textiles, soufflerie, coefficient pour plusieurs Reynolds ; l'influence du corps mou dépend du tissu et n'est pas quantifiée par les auteurs dans ce résumé. Le téléchargement tenté n'a pas donné un PDF exploitable (HTML, puis 404 sur un chemin d'article). Aucun diamètre, aucune aire et aucun coefficient ne sont donc cités. Ce n'est de toute façon pas une corde kernmantel isolée. Aucun chiffre n'est retenu.

**[A].** Tang et al. 2019, filets en eau, reste non transférable. Rien dans cette passe ne le réhabilite.

**[P] code.** Le diamètre textile est optionnel et informationnel : aucune formule de solveur ne le lit (`src/lib/sim/types.ts`, `d?`). Le préréglage Courant Bandit a un diamètre de fiche, pas une loi aérodynamique. Inventer un diamètre, ou un `C_D⊥` de corde sèche, reste interdit. Sans diamètre saisi, une force de ligne textile ne se calcule pas. C'est un refus, pas un coefficient égal à celui de l'acier.

### 4.5 Ce que #134 ajoute, et ce qu'elle n'ajoute pas

**[P] dépôt, expérience isolée.** `experiments/spatial-aero-134/REPORT.md` et le commentaire de [#134](https://github.com/fuzoh/simu-tyro/issues/134) du 10 novembre 2026. Matrice à `L₀` fixe : 2048 lignes, 0 échec de convergence. La plus grande forme qui survit au raffinement est une sonde textile, `C_L = 0,5`, pas une mesure. Acier `12 mm`, même sonde : mouvement de flèche d'environ `+0,013 m`, déport `−0,056 m`, tension maximale `+6,5 %`. `C_t = 0,1` près du parallèle bouge la tension textile molle d'environ `2,6 %` et l'acier d'environ `0,3 %`, sans devenir un `C_t` produit. Une ligne de tension de pose n'a pas convergé : échec numérique, pas une différence physique.

Ces écarts disent qu'une sonde grande peut être visible, surtout sur une corde légère. Ils ne disent pas de combien un `6×19` ou une corde sèche se trompe si le terme est omis. Le rapport d'expérience le formule déjà : l'omission de production serait un choix de donnée manquante.

## 5. Indisponible, approximation justifiée, transfert refusé

| Question | Statut | Pourquoi |
| --- | --- | --- |
| Décomposition `f_n`, `f_L`, `f_a` | Approximation géométrique déjà écrite | Identités de repère. Pas des coefficients. |
| `C_D⊥` constant, indépendance en `sin²θ` | Approximation nommable, non validée pour le produit | Horton la voit tenir sur **ses** traînées normales entre `50°` et `90°`, en eau, et céder en dessous et pour la portance. Bursnall la voit céder près du critique. Batill voit un `C_d` de `7×7` chuter dans la bande de Reynolds utile. |
| `C_D⊥` d'un `6×19`, 6–26 mm, air, sec, tendu, statique | **Indisponible** | Aucune éprouvette lue n'est cette construction. Schultz 1962 est cité, non ouvert. |
| `C_L` et son signe pour un `6×19` | **Indisponible** | Portance mesurée sur d'autres toronnages. Le signe suit le commettage, absent du Scénario. |
| `C_t` de `6×19` ou de corde sèche | **Indisponible** | Horton a échoué à l'extraire. Batill exclut le cisaillement. L'algèbre de la note de significativité reste : près du vent axial, l'erreur relative de l'omission n'a pas de borne. L'erreur absolue suit un coefficient non mesuré. |
| `C_D⊥` de corde textile sèche en air | **Indisponible** | Aucune campagne de corde isolée lue. Siegmund et al. sont des cylindres habillés. |
| Diamètre textile absent | Refus justifié, pas un `C_d` | Le champ n'est pas toujours rempli, et le solveur ne le lit pas. Inventer `d` inventerait la force. |
| Diamètre aérodynamique constant | Décision déjà prise | Pas une mesure que `d` ne change pas. La sensibilité `0,95d` / `1,05d` reste une sonde, pas une clause relue. |
| Ellipsoïde à trois axes depuis `hRider` | **Non déductible** | Une longueur de garde. Poulie et longe incluses. Toute proportion est une convention à nommer. |
| `C_e` du passager statique | **Indisponible** | Pas de polaire du gabarit. `0,45 m²` ne se convertit pas. |
| #134 comme barre d'erreur produit | Transfert refusé | Sondes. Le plus grand mouvement textile est à `C_L = 0,5`, non mesuré. |
| Eau → air à Reynolds égal | Non suffisant ici | Pour un câble non poreux, le Reynolds est une condition nécessaire, pas le reste : vibrations, mouillage, tension, construction, définition de `C_d`. Horton n'est pas une soufflerie. |
| Omettre `f_L` ou `f_a` parce que « petit » | Non justifié | Les deux rapports montrent une portance d'ordre `0,1–0,2` dans **leur** normalisation, dispersée, et aucun `C_t`. #134 montre que de grandes sondes bougent une corde légère. |
| Omettre en le disant | Choix de version encore ouvert | Possible seulement comme manque de donnée, après décision du mainteneur. Pas le résultat de cette passe. |

L'intervalle exploratoire `[0,8 ; 1,3]` de [agent-readiness-aerodynamics.md](agent-readiness-aerodynamics.md) §3.4 n'est pas réhabilité. Les tables lues ici couvrent, selon la normalisation et le fluide, environ `0,71–1,22` à `90°` en pression d'air sur des modèles qui ne sont pas un `6×19`, et une moyenne de force en eau de `1,46` à `90°`. Ce n'est pas un intervalle de confiance du produit, ni une borne conservative du Verdict.

## 6. Ce qu'un agent peut faire, une fois le mainteneur a tranché

Sans nouveau jugement physique :

- Coder la fermeture de §18.3 avec des coefficients **écrits par le mainteneur**, y compris zéro s'il nomme l'omission. Les tests d'algèbre déjà listés dans la note de préparation (normalité, `u_n = 0` sans division, vent latéral pur sur ligne plane, `q₀ = λ f`, aires `πbc`, `πac`, `πab`, partage de la force passager et non du vent de brin) n'attendent pas une soufflerie.
- Si `σ`, `κ_x`, `κ_y` et `C_e` sont nommés : coder la règle fractionnaire, bas du solide au bas du gabarit si c'est le placement confirmé, et le test « `hRider` doublé, fractions fixes, aires ×4 ». Ne pas coder tant que les constantes sont absentes.
- Séparer acier et textile même si un nombre conventionnel est partagé. Ne pas lire un diamètre textile absent comme un diamètre d'acier.
- Si un PDF licite de Schultz 1962, du rapport R-312, de Counihan 1963, ou de Nebres 1993 devient lisible : en extraire construction, fluide, Reynolds, aire, angle, `C_d`, `C_L`, `C_t`, et les renvoyer. Ne pas les adopter en attendant.
- Calculer un Reynolds d'illustration avec un `ν` déclaré. Ne pas ajouter `C_D⊥(Re)` : aucune courbe de `6×19` ou de corde sèche n'a été lue.

Un agent ne peut pas : choisir `σ` ou les `κ`, choisir un centre `1,0` / `1,2` / `1,46`, encoder un sens de toronnage, convertir le `C_dA` SSF, présenter une sonde #134 comme une erreur garantie, ni commenter l'issue.

## 7. Décisions qui restent au mainteneur

Priorité décroissante. Chacune bloque un brief de production. La recherche ne la tranche pas.

1. **Portance et traînée axiale en production.** Trois issues, toutes encore ouvertes après #134 : omission nommée comme manque de donnée ; coefficients internes étiquetés non produit, avec le signe de portance traité comme hypothèse et non comme commettage ; ou pas de force spatiale de ligne tant qu'un coefficient de la construction retenue n'est pas lu. Recommandation de recherche : ne pas adopter les tables de cette note, et ne pas présenter l'omission comme une négligeabilité. Le choix entre omission nommée et attente d'une mesure est le sien.
2. **Traînée normale, si une force de ligne est exigée avant toute mesure.** Convention interne séparée acier / textile, ou coefficient saisi, ou pas de force. Aucun centre n'est proposé. Confirmer : diamètre nominal acier saisi = diamètre aérodynamique déclaré ; diamètre textile absent = pas de traînée de ligne, sans diamètre inventé.
3. **Ellipsoïde.** Nommer `σ`, `κ_x`, `κ_y` et `C_e`, ou différer la force statique du passager. Différer révise l'attente que Q12 et Q23 définissent déjà un solide calculable. Cela n'ajoute pas un champ si les constantes sont internes. Ne pas inférer une anatomie du gabarit. Si la règle fractionnaire est retenue : confirmer le bas du solide au bas du gabarit, le centre sur le chariot, poulie et longe hors force, et accepter que changer le gabarit change la force statique. Rejeter le solide de hauteur `h` et le `0,6 m` du défaut, sauf mention explicite du piège.
4. **Signe de portance.** Le Scénario ne porte pas le commettage. Toute portance non nulle doit dire que le signe est une hypothèse, ou rester une sonde hors production. Ne pas coder un sens par défaut.
5. **Affichage.** La session du 10 novembre a refusé un bandeau spécifique. Cela ne transforme pas une convention en mesure. Si une valeur interne est expédiée, son étiquette `[CONVENTION]` doit rester dans le dispositif de provenance existant, sans nouveau facteur de sécurité et sans modification du Verdict.

Hors de cette liste, déjà tranchés ou confiés ailleurs : profil de vent (#120), solveur et pilotes (Q24, Q30–Q32), vues (#118), dynamique couplée (#124), sillage de deux brins, loi `d(T)`, loi `EA`.

## 8. Accès, inspections, et ce qui reste non lu

Inspecté le 10 novembre 2026 :

- Dépôt : `AGENTS.md`, glossaire (gabarit), `docs/conventions/simulation.md`, `docs/simulation-theory.md` §§6.3, 8.3–8.4, 18, code `hRider` / acier / textile, notes `spatial-wind` déjà archivées, rapport #134.
- Issues : corps et commentaires de #127 (9 commentaires, dernier Q33 retiré à `2026-11-10T17:02:32Z`) et de #134 (1 commentaire, expérience livrée). Aucun commentaire n'a été posté.
- Batill et Nebres 1992, PDF public Archive.org, tables 29–30 lues sur l'extraction texte ; les cellules citées concordent avec la prose des auteurs.
- Horton et al. 1987, PDF public Archive.org, formule de `C_d` et tables 4 et 7 lues sur l'extraction texte.
- Siegmund et al. 2021, résumé de la page éditeur seulement. PDF non obtenu.
- Unpaywall : Nebres 1993 (`10.1007/BF00196987`) et le chapitre 1989 (`10.1007/978-3-642-84010-4_32`), tous deux `is_oa = false`.
- Notice NTRS Dress `19890038141` : pas de téléchargement.

Non obtenu, et non suppléé de mémoire : Schultz 1962, rapport R-312, Counihan 1963, corps de Nebres 1993, planche nette de Hoerner 1965 (l'OCR a été lu, pas adopté), ESDU, texte d'EN 15567, figure 21 de Horton numérisée, toute polaire d'ellipsoïde triaxial fixe applicable au gabarit. Semantic Scholar a répondu HTTP 429. OpenAlex a répondu HTTP 429 sur une partie des requêtes textile et ellipsoïde. L'absence dans les requêtes abouties n'est pas une preuve d'absence mondiale.

Les PDF tiers ne sont pas versés dans le dépôt. Les retrouver par les URL ci-dessus.
