# Préparation au grill — aérodynamique de ligne et ellipsoïde du passager (#127)

**Date :** 10 novembre 2026. **Objet :** les seuls points aérodynamiques encore ouverts après le commentaire consolidé de #127 : formule et plages défendables pour la traînée de ligne acier/textile, ellipsoïde à axes fixes, déduction des axes depuis le gabarit vertical existant. **Pas** un coefficient produit, **pas** une validation expérimentale, **pas** un brief d'implémentation.

Le commentaire « Décisions avec le mainteneur — cadrage consolidé » de [#127](https://github.com/fuzoh/simu-tyro/issues/127) prévaut sur les recommandations antérieures pour tout ce qu'il tranche. Cette note ne rouvre pas le solveur, le profil de vent (#120), les contrats de vues (#118) ni la dynamique couplée (#124). Elle ne modifie aucun autre fichier : le [README du dossier](README.md) n'est donc pas mis à jour.

Niveaux : **[P]** page lue dans cette passe ; **[A]** déjà consigné dans le dossier, non relu mot à mot ici ; **[D]** algèbre, sans coefficient nouveau ; **[H]** option de modèle, non validée ; **[N]** non lu. Un intervalle cité plus bas est une enveloppe de sensibilité assemblée à partir de spécimens non transférables, jamais une plage mesurée sur un câble 6×19 ou une corde de tyrolienne.

## 1. Décisions déjà tranchées — ne pas les reposer

Relevé sur le commentaire consolidé de #127, pas sur les revues d'avant session :

- Équilibre spatial à vide et chargé. Le passager statique est immobile et maintenu au chariot ; son poids et sa force aérodynamique sont intégralement transmis. Cette force statique ne dépend pas de la vitesse de descente.
- La page Dynamique reste une estimation à sens unique sur le lieu statique. Aucun retour de vitesse ou d'inertie vers les formes et les tensions.
- Vent horizontal seulement. Même champ pour la ligne et le passager.
- Ellipsoïde d'orientation fixe : hauteur verticale, profondeur selon A–B, largeur transversale. Ni rotation ni balancement. Pas de déplacement latéral du passager par rapport au chariot.
- **Q23 :** déduire l'ellipsoïde du gabarit vertical existant, sans nouveau paramètre à saisir. Le gabarit inclut poulie et longe ; il n'est pas la hauteur du corps et ne fixe pas trois axes. La règle, les proportions et les défauts restaient à documenter — c'est l'objet du §6.
- Diamètre aérodynamique constant dans chaque calcul. Pas de loi de contraction. L'effet omis doit être nommé, et une sensibilité examinée.
- Lois actuelles à `EA` constant, paramètres acier et textile distincts. `#133` ne bloque pas.
- Deux brins : chacun reçoit la moitié du poids **et** de la force aérodynamique du passager, mais son propre poids et son propre vent réparti. Pas de sillage. Partage supposé, pas présenté comme conservatif.
- Aucune valeur numérique nouvelle n'a été adoptée en session. Pas de facteur de sécurité nouveau, pas de modification du Verdict, pas de bandeau spécifique pour ces approximations.
- Le mainteneur ne prévoit pas de mesures propres avant longtemps. Chercher les données publiées les plus proches, documenter transfert et incertitude, avec sensibilité.

Conséquence pour cette note : proposer des **options bornées et étiquetées**, pas un défaut silencieux. Un agent peut coder une option une fois le mainteneur l'a désignée. Il ne peut pas combler un coefficient manquant par un nombre « raisonnable ».

## 2. Ce qui a été lu, et ce qui ne l'a pas été

Accès du 10 novembre 2026. Les PDF ont été passés à `pdftotext` ; la page de formule de Liu a en plus été rendue en image, parce que l'équation est un blanc dans le fichier.

| Source | Accès | Usage ici |
| --- | --- | --- |
| Yuan, Li, Yang, Wang, Ma, Zhao & Yang, *Buildings* 2025, 15, 4390. DOI [10.3390/buildings15234390](https://doi.org/10.3390/buildings15234390). PDF MDPI lu. | **[P]** | Cylindre lisse, `D = 180 mm`. Ancre de `Cd` sectionnel et limite du principe d'indépendance. Pas une corde. |
| Liu, Wang, Zhu & Zhou, ICADME 2017, *Advances in Engineering Research* 136, pp. 440–445. PDF [Atlantis 25878324](https://download.atlantis-press.com/article/25878324.pdf). | **[P]** | Conducteurs ACSR ≈ 33,75 mm en soufflerie. Analogie toronnée, pas un 6×19. Formule (1) absente de la page (image vide). |
| A. F. Zahm, *Flow and Drag Formulas for Simple Quadrics*, NACA Report 253. PDF [NTRS 19800006784](https://ntrs.nasa.gov/api/citations/19800006784/downloads/19800006784.pdf). | **[P]** | Sphère et formules de pression de quadriques. Pas une polaire visqueuse d'ellipsoïde incliné. |
| J. D. Neuhart, *Drag Measurements on an Ellipsoidal Body*, Virginia Tech, 2007. PDF [VTechWorks](https://vtechworks.lib.vt.edu/bitstreams/18cf1f80-c5ab-449e-ac73-32259513dc39/download). | **[P]** résumé et nomenclature | Ellipsoïde **oblate**, plusieurs normalisations. Le `0,0026` du résumé n'est pas réutilisé : l'aire de ce chiffre n'est pas identifiée. |
| Zou et al., BEMSIC 2025, PDF Madison Proceedings. | **[P]** puis rejeté | Tableaux incohérents avec le résumé (éprouvettes de 1 m et 34–40 mm d'un côté ; longueurs 1 690 m et coefficients ~10⁻⁴ de l'autre). Aucun chiffre repris. |
| Nebres, Batill & Nelson 1993, DOI [10.1007/BF00196987](https://doi.org/10.1007/BF00196987). | **[N]** texte intégral | Unpaywall, 10 novembre 2026 : `is_oa = false`, pas de PDF. Le résumé déjà lu est dans la [revue ligne, §4.3](line-aerodynamics-review.md). Aucun `Cd`/`Cl` nouveau. |
| Hoerner, *Fluid-Dynamic Drag* ; ESDU ; IEC ; CIGRE ; EN 15567 ; NASA-STD-3000 ; Knacke, *Parachute Recovery Systems* (DTIC `ADA247666`, HTTP 403). | **[N]** | Aucun tableau recopié de mémoire. Un brief automatique a cité des pages Hoerner et un NTRS « Allen & Perkins » : l'URL NTRS `19930092147` résout le rapport Ostrach 1111 (convection libre), pas NACA 1048. Ce brief n'est pas une preuve. |
| Recherche OpenAlex « kernmantel rope aerodynamic drag », 10 novembre 2026. | **[P]** requête vide | Absence dans cette requête, pas une preuve d'absence mondiale. La [revue ligne, §4.4](line-aerodynamics-review.md) avait déjà refusé de transférer les filets en eau de Tang et al. |

Reynolds d'illustration, **pas** une atmosphère prescrite : `ν = 1,5×10⁻⁵ m²/s`, comme l'exemple déjà écrit dans la [revue passager, §3.3](rider-aerodynamics-review.md). Pour le câble expédié, 12 mm à 10 m/s : `Re = 8×10³`. À 30 m/s : `2,4×10⁴`. Le cylindre de Yuan (`D = 180 mm`, crise vers `Re ≈ 1,6×10⁵`) et les ACSR de Liu (étiquette 33,75 mm, 20 m/s → `Re ≈ 4,5×10⁴` avec ce `ν`) ne couvrent pas ce domaine. Une crise avancée par la rugosité d'un toron de 12 mm n'est ni démontrée ni exclue : Achenbach 1971 reste non relu intégralement **[A]**.

## 3. Ligne — formule candidate et ce que les essais lus permettent

### 3.1 Fermeture à conserver, déjà dans la note

**[D]/[H].** La note [Équilibre spatial sous gravité et vent](../equilibre%20spatial%20vent.md) §3 et la [revue ligne](line-aerodynamics-review.md) §3 donnent la seule fermeture traçable que cette passe n'a pas de raison de remplacer :

```text
u_n = u − (u·t) t
f_n = ½ ρ C_D⊥ d |u_n| u_n     N par mètre étiré
q_0,aéro = λ f_n               N par mètre non étiré
```

`u` est la vitesse de l'air relative à l'élément, dirigée vers où l'air va, pas l'azimut « d'où vient ». À `U_n = 0`, prolonger par `f_n = 0`. La projection `u_n` est une identité. L'indépendance vis-à-vis de la vitesse axiale, `C_D⊥` constant, et l'absence de portance ou d'effort axial sont des hypothèses.

**[D].** Si `θ` est l'angle aigu entre l'axe et le vent, `U_n = U sin θ`, alors la force normale rapportée à `½ρ U² d` vaut `C_D⊥ sin²θ`. La projection de cette seule force sur l'axe du vent ajoute un sinus (`sin³θ`). Ne pas appeler `sin²θ` un coefficient « selon le vent ». Ne pas figer `C_D⊥` si la courbe en Reynolds varie : `Re_n` change avec `θ`.

**[D].** Cas de contrôle déjà écrit, à ne pas casser : ligne dans le plan vertical A–B, vent strictement transversal, `C_D⊥` et `d` constants → `u·t = 0`, force normale uniforme par mètre étiré, composante verticale nulle. La pente verticale ne réduit pas cette incidence. Après déport, une composante verticale peut apparaître : c'est la projection de `f_n`, pas une portance ajoutée.

Le repère horizontal existe déjà : `windComponents` (`src/lib/sim/wind.ts`) donne `along` positif vers B et `across` positif vers la gauche du trajet (vent venant de la droite). La formule a besoin du vecteur 3D horizontal dans ce repère, `u = (along, across, 0)` si `z` est vers le haut. Cette note ne spécifie pas le profil le long de A–B.

### 3.2 Ce que Yuan établit — cylindre lisse, pas une corde

**[P].** Yuan et al. 2025, soufflerie, cylindre circulaire lisse, `D = 180 mm`, lacet `β` mesuré depuis la perpendiculaire au vent (`β = 0` : cylindre droit). Le coefficient de pression est normé par la dynamique **normale** :

```text
C_pn = (P − P_0) / [½ ρ (U cos β)²]
C_Dn = Σ π C_pn,i cos θ_i / 44
```

Donc leur `C_Dn` est un coefficient de traînée sectionnelle fondé sur la vitesse normale, proche de `C_D⊥`, pas un coefficient fondé sur `U²` totale. Résultats écrits dans le texte, pas lus sur une courbe :

- `β = 0`, `Re < 1,6×10⁵` : `C_Dn` moyen ≈ **1,3**, peu variable. Les auteurs disent que cela tombe dans la plage ESDU. **ESDU non relu** : retenir 1,3 comme leur mesure, pas comme clause ESDU.
- `Re = 2,2×10⁵`, `β = 0` : `C_Dn` ≈ **1,15**, crise commencée.
- `β = 30°` : avant la chute critique, `C_Dn` ≈ **1,1–1,2**. Ils rapprochent ce chiffre d'un 1,15 numérique de Vakil & Green, **non relu**.
- Au-delà de `β ≈ 17,4°`, ils décrivent une rupture du principe d'indépendance sur **ce** cylindre fini, et une portance moyenne de section pouvant atteindre environ **−1,5** (anneau B, `β = 30°`, `1,2×10⁵ < Re < 2,2×10⁵`). C'est une asymétrie de crise, à un Reynolds très au-dessus d'un câble de 12 mm. Ce n'est pas un seuil universel de 17,4° à coder, et pas un `Cl` de toron.

**[H].** Cela confirme, sur un autre dispositif que Bursnall & Loftin **[A]**, que l'indépendance est une approximation et qu'elle cède près du critique. Cela ne fournit pas le `C_D⊥` d'un 6×19.

### 3.3 Ce que Liu établit — ACSR, formule manquante

**[P].** Liu et al. 2017, soufflerie NUAA, veine 3 m × 2,5 m × 6 m, vitesses d'essai 20 à 70 m/s, balance six composantes, support soustrait. Six conducteurs étiquetés 33,75, photographiés figure 3 : des JLX1 à angle d'ouverture de surface 30°, 45°, 60°, 90°, un JLX1/G1A-630/45, et le JL/G1A-630/45 ordinaire (photo numérotée 6). Ce sont des âmes acier / torons aluminium de ligne aérienne, pas les constructions `6×19` et `6×19 métallique` du moteur (`src/lib/sim/materials/steel.ts`).

La formule (1) est un **blanc dans le PDF**. Le texte dit `F` en kg, `ρ` en kg/m³, `V` en m/s, `D` et `L` en m, et appelle `Cd` un coefficient par unité de longueur. Sans l'équation, on ne sait pas si le tableau est `C_D⊥`, un coefficient sur `U²`, ou une grandeur encore en kgf. Les cellules sont pourtant des nombres sans dimension de l'ordre de 1, donc compatibles avec un `Cd` usuel **si** une conversion est cachée dans l'image absente. Elles ne sont pas converties ici.

Table 1, angle conducteur–écoulement 90° (la figure 5 du papier l'appelle perpendiculaire) :

| V (m/s) | min des 6 | max des 6 |
| --- | --- | --- |
| 20 | 0,98 | 1,12 |
| 40 | 0,80 | 0,94 |
| 70 | 0,82 | 0,99 |

Table 2, angle 60° entre le conducteur et l'écoulement : 0,53 à 0,67 sur toutes les vitesses et colonnes lues. Si le 90° valait environ 1,0 et si le coefficient était `C_D⊥ sin²θ` avec `θ = 60°` depuis l'axe, on attendrait environ 0,75, pas 0,6. L'équation manquante interdit d'en faire un ajustement en `sin^n`. La colonne 6, si c'est bien le JL/G1A ordinaire de la photo 6, est la plus haute à partir de 40 m/s (0,94 à 0,99), ce qui colle à la phrase des auteurs « au-dessus de 35 m/s, l'ACSR ordinaire a le plus grand coefficient ». Ce n'est pas une clé de table imprimée.

**Ne pas transférer** 0,98–1,12 à un câble de tyrolienne de 12 mm. Diamètre, construction, Reynolds et définition de `Cd` diffèrent. Le chiffre sert seulement à montrer qu'un conducteur toronné nu, en air, en travers, a été publié dans un voisinage de 1, et que le même papier descend vers 0,8 quand la vitesse et la surface changent.

### 3.4 Acier et textile — plages que cette passe refuse d'adopter

**[H], refus explicite.** Les plages `1,0–1,1` acier et `1,1–1,3` textile du rapport brut avaient déjà été rejetées **[A]**. Rien dans cette passe ne les réhabilite. Hoerner n'a pas été lu. Aucun `Cd` de corde kernmantel sèche en air n'a été trouvé dans la requête OpenAlex ci-dessus, ni dans le corpus déjà archivé. Écrire un `Cd` textile distinct, ou égal à l'acier, est un choix, pas une mesure.

**[P]/[A].** Nebres et al., résumé seulement : portance stationnaire et séparation asymétrique sur modèles toronnés à `Re = 5×10³–5×10⁴`, diamètre = cercle circonscrit, pas la section métallique. Mécanisme acquis, coefficient non extrait. L'omettre en v1 est donc une omission nommée, pas une démonstration que `Cl = 0`.

**[H].** Enveloppe de sensibilité, pour un calcul exploratoire seulement, une fois le mainteneur l'a acceptée comme telle :

```text
C_D⊥ exploré dans [0,8 ; 1,3]
```

- 0,8 est le plancher de la table 1 de Liu à 40 m/s, ACSR, formule non lue.
- 1,3 est le `C_Dn` subcritique de Yuan, cylindre lisse, autre Reynolds, autre diamètre.

Cet intervalle **n'est pas** un intervalle de confiance, **n'est pas** conservatif au sens du Verdict, et **ne doit pas** être affiché comme la plage du produit. Il sert à voir si la forme spatiale bouge quand on pousse le seul coefficient libre entre les ancres lues. Le 0,18 supercritique de Bursnall reste hors de cette enveloppe : mauvais régime, mauvais spécimen.

Ordre de grandeur **[D]**, hypothèses affichées, pas un résultat du moteur. `ρ = 1,225 kg/m³`, `C_D⊥ = 1`, `d = 12 mm`, vent travers `U = 10 m/s`, ligne droite : `f_n = 0,735 N/m`, soit environ 110 N sur 150 m. Le même `C_D⊥` à 20 m/s quadruple la force. Sur le câble du premier lancement, `MBF` dérivé est 90 740 N (`src/lib/scenario/first-run.ts`) : la traînée de ligne est petite devant la rupture, et pas forcément petite devant la forme. D'où la sensibilité, et l'interdiction d'en faire un facteur de sécurité.

## 4. Diamètre constant et `EA` — déjà choisis

**Tranché.** Pas de `d(T)`. Pas de `d = d_0(1 − ν ε)`, pas de `d = d_0/√λ`. Griffith & Bragg 1919 et Sry et al. 2018 restent les preuves qualitatives qu'une contraction existe sur **leurs** éprouvettes **[A]**. Elles ne calibrent pas le moteur.

**[D].** À `C_D⊥` et `U_n` figés, `|f_n|` est linéaire en `d`. Un diamètre majoré n'est une majoration de force que si `C_D⊥` ne change pas de régime. Le facteur `λ` relie encore la force par mètre étiré à la charge matérielle. `EA` constant n'entre pas dans `f_n` : la raideur change la forme, donc `t` et `λ`, pas le coefficient.

Ancres de code, diamètre **nominal**, pas un diamètre circonscrit mesuré :

- Acier : `d` en mm, requis, lu par `steelFormula` pour `MBF`, `EA` et `μ` seulement (`src/lib/sim/materials/steel.ts`, `src/lib/sim/types.ts`). Le premier lancement est 12 mm, 1770, `iwrc`.
- Textile : `d?` optionnel. Le commentaire de `types.ts` le dit informationnel ; aucune formule de solveur ne le lit. Il sert la limite de tension Maestro (`src/lib/rail/tensioning.ts`). La spec textile retenue au premier lancement n'a pas de diamètre (`src/lib/scenario/first-run.ts`).
- Le rapport `docs/references/tyrolienne sur cable.md` §6 écrit un rebut à une réduction ≥ 5 % du diamètre nominal, attribué à ISO 4309 et NF EN 12927-6. **Ces normes n'ont pas été relues ici.** Le 5 % est une sonde de sensibilité possible, pas une loi `d(T)` et pas une confirmation de clause.

**[H].** Sonde, si le mainteneur la retient : recalculer `f_n` à `d`, `0,95 d` et `1,05 d`, `C_D⊥` figé, et dire que l'écart est linéaire par construction. Cela ne valide pas l'omission de la contraction ; cela en chiffre l'effet **sous l'hypothèse** `C_D⊥` constant.

## 5. Ellipsoïde à axes fixes — géométrie acquise, polaire non acquise

### 5.1 Orientation imposée

**[H] alignée sur #127, pas sur une mesure.** Repère du solide, fixe par rapport à la ligne, pas au vent relatif :

- `x` selon A → B (profondeur, demi-axe `a`) ;
- `y` transversal, même sens que `across` de `wind.ts` (largeur, demi-axe `b`) ;
- `z` vertical vers le haut (hauteur, demi-axe `c`).

Le vent statique est horizontal. L'incidence n'est donc pas un angle libre : elle est l'azimut du vent par rapport à A–B. Pas de rotation, pas de balancement, pas de moment transmis. Le centre latéral reste sur le chariot : #127 interdit un déplacement latéral du passager relativement au chariot dans cette version.

### 5.2 Aire projetée — dérivation déjà écrite

**[D].** [Revue passager, §3.2](rider-aerodynamics-review.md), relue : pour `n_b` unitaire dans le solide,

```text
A_proj = π a b c √(n_bx²/a² + n_by²/b² + n_bz²/c²)
```

Valeurs principales : `πbc`, `πac`, `πab`. Ce n'est pas l'aire de la section centrale normale à `n`, qui a une autre formule. Ce n'est pas l'aire du rectangle englobant. Un `Cd` défini sur un rectangle, une aire mouillée ou une sphère de même volume ne se pose pas sur `A_proj` sans conversion. Les essais de cubes Wang et les chutes de sphéroïdes Stringham ne sont pas une polaire de passager **[A]**.

Zahm 1927 **[P]** donne des pressions théoriques de quadriques en fluide parfait et, pour la **sphère**, `CD = 1,2` entre `R = 1,5×10⁴` et `2×10⁵` d'après Wieselsberger, aire frontale. Ce n'est pas le `Cd` d'un ellipsoïde incliné. Le mémoire Virginia Tech **[P]** mesure un ellipsoïde oblate à `Re_L` de 1,6 et 4,3 millions, 0° et 10°, et annonce des coefficients vers 0,0026 et 0,0035 tout en définissant des `Cd` frontal, sur longueur² et sur aire mouillée. Le chiffre du résumé n'est pas rattaché ici à l'une de ces aires : inutilisable.

### 5.3 Force statique candidate

**[H].** Pour l'équilibre statique, passager immobile, vent du Scénario seulement :

```text
F_aéro = ½ ρ C_e A_proj(n) |u| u
```

`u` horizontal, `n = u/|u|` si `u ≠ 0`, et `F_aéro = 0` si `u = 0`. `C_e` est un scalaire **sans dimension**, inséparable de `A_proj`. Force colinéaire au vent : portance et moments omis. La revue passager dit déjà que ce n'est pas la conséquence d'une polaire d'ellipsoïde incliné. C'est la fermeture la plus petite compatible avec un axe fixe et un seul coefficient. La transmettre intégralement au chariot est la décision #127, pas un bilan d'inertie.

**Ne pas** prendre un `Cd` de sphéroïde en incidence nulle (écoulement axial, corps lisse, mauvais cas pour un vent de travers sur un harnais). **Ne pas** diviser le `C_dA = 0,45 m²` de §12.2 par une aire pour fabriquer `C_e`. Ce 0,45 est un calage longitudinal SSF, une campagne, un spéléologue sur corde (`docs/simulation-theory.md` §12.2, `src/lib/sim/dynamics.ts`, `DYNAMICS.CdA`). La revue passager interdit déjà d'en faire une traînée latérale.

**[D].** Illustration, pas une recommandation de `C_e` ni d'axes. Si `A_proj = 0,5 m²`, `C_e = 1`, `ρ = 1,225`, `U = 10 m/s` : `F = 30,6 N`, soit environ 2,6 % du poids d'un passager de 120 kg (`P = 1 177 N`). À 20 m/s, environ 10 % de ce poids. La force est du même ordre que la traînée de ligne de l'exemple du §3.4, et elle change de signe avec le vent. Elle peut déplacer le point d'arrêt ou la garde hors axe sans approcher la rupture. « Plus de traînée » n'est pas uniformément conservatif : la revue passager le dit déjà pour la vitesse d'arrivée et l'arrêt en portée.

### 5.4 Ne pas remplacer le `C_dA` de la descente sans décision

Aujourd'hui `ride` n'applique que la composante de vent le long de la tangente (`src/lib/sim/dynamics.ts`). #127 garde cette page, avec vent relatif du passager **mobile**, sans retour vers la statique. Deux fermetures coexistent alors par construction : ellipsoïde statique sur le vent du Scénario, et `C_dA` scalaire sur la vitesse de descente. Elles ne sont pas deux mesures du même objet. Les identifier changerait l'estimation SSF. Les laisser distinctes est incohérent physiquement et fidèle au découpage déjà décidé. C'est le point 1 du §9.

## 6. Déduire trois axes du gabarit — ce qui ne se déduit pas

### 6.1 Ce que le code appelle gabarit

**[P] code.** `hRider` est un scalaire, défaut 2,1 m, strictement positif, porte Clearance, pas Solve (`src/lib/rail/fields.ts`). Il est soustrait tel quel :

```text
h_clear = z_câble − z_sol − h_rider
```

(`src/lib/sim/clearance.ts`, vers la ligne 265). L'aide dit : hauteur occupée sous le câble par le passager, son harnais et sa poulie (`src/lib/rail/help.ts`). La théorie §6.3 décompose le **défaut** en `1,5 + 0,6 = 2,1 m`, longe plus corps sous le harnais, `[CONVENTION]`, et note qu'une autre recherche suggérait 1,2 m de suspension. Cette décomposition **n'est pas un champ**, pas une clé d'URL, pas une proportion stockée. Changer `hRider` aujourd'hui ne change que la garde.

Le chariot est un point : l'empattement 0,10–0,25 m de §6.3 est dit négligeable pour la charge, pas une dimension aérodynamique.

### 6.2 Inférences refusées

Un seul nombre positif `h` ne détermine pas :

| Quantité | Pourquoi `h` ne suffit pas |
| --- | --- |
| Part poulie + longe / part corps | `1,5` et `0,6` expliquent le défaut 2,1 ; ils ne sont pas une loi d'échelle. Un utilisateur peut saisir 1,2 m. |
| Hauteur du corps | « Corps sous le harnais » est la distance du point d'attache au point le plus bas. Le torse et la tête sont au-dessus de l'attache, et encore sous le câble si la longe est longue. Les mettre dans les 0,6 m, ou les exclure, sont deux modèles. |
| Largeur et profondeur | Aucune similitude humaine n'est dans le Scénario. La masse `mp` ne donne pas un volume sans une masse volumique inventée, et un volume ne fixe pas trois axes. |
| Posture | Assis, allongé, genoux groupés : même point bas possible, aires différentes. #127 fixe l'orientation du solide, pas la forme du corps. |
| `C_e` | L'aire, même connue, ne donne pas le coefficient. |
| Diamètre de longe | Si l'on voulait un cylindre de longe en plus de l'ellipsoïde, son diamètre n'est pas dans `h`. |

**[D].** Piège à ne pas coder : `σ = 1,5/2,1` et hauteur d'ellipsoïde `0,6 m` au défaut. Cela identifie le solide aérodynamique au seul segment sous le harnais, et oublie le torse. Ce n'est pas une lecture obligatoire de §6.3 ; c'est la lecture fausse la plus tentante.

**[D].** Autre piège : ellipsoïde de hauteur `h`, qui avale poulie, longe et vide. #127 dit que le gabarit n'est pas la hauteur du corps. Cette option grossit le volume et peut grossir ou réduire la force selon `C_e`. Elle ne respecte l'intention de Q23 que si le mainteneur l'accepte explicitement comme enveloppe bruta, pas comme corps.

**[D].** Un résidu de longe **fixe** en mètres (par exemple 1,5 m) rend la hauteur de corps `h − 1,5` négative dès que l'utilisateur descend sous 1,5 m. Le champ l'autorise : la seule borne est `h > 0`. Toute règle à résidu fixe doit définir cet échec. Une règle en **fractions de `h`** reste définie pour tout `h > 0`, et c'est la seule famille compatible avec « pas de nouveau champ » et « le gabarit saisi pilote la taille ».

### 6.3 Famille de règles qu'un agent peut coder, une fois les constantes choisies

**[H].** Pas de nouvelle saisie. Constantes internes, étiquetées `[CONVENTION]`, jamais présentées comme anthropométrie :

```text
2c = (1 − σ) h_rider          hauteur du solide, 0 < σ < 1
2b = κ_y · 2c                 largeur
2a = κ_x · 2c                 profondeur selon A–B
```

Placement proposé, à confirmer : bas de l'ellipsoïde à `z_câble − h_rider`, donc le gabarit de garde actuel reste le point bas ; centre en `y` sur le chariot ; centre en `x` sur le chariot (symétrie avant/arrière — le corps réel ne l'est pas). L'intervalle `σ h_rider` au-dessus du solide est le résidu poulie + longe, **sans traînée** dans cette option. Poulie et longe ne sont pas un second cylindre, faute de diamètre.

`σ`, `κ_x`, `κ_y` ne sont pas déduits. Cette passe n'a pas obtenu de table anthropométrique primaire : `standards.nasa.gov` a répondu 404 sur NASA-STD-3000, le hôte MSIS n'a pas répondu, DTIC a renvoyé 403 sur Knacke. Aucun percentile n'est donc proposé. Un agent peut, **après** que le mainteneur a nommé une table ouverte, en extraire des rapports largeur/hauteur et profondeur/hauteur pour une population et une posture dites, et les soumettre. Il ne peut pas décider que cette population est le passager.

Illustration arithmétique d'une convention **non choisie**, pour voir que les rapports dominent l'aire. `h = 2,1 m`, `σ = 1/3`, `κ_y = 1/2`, `κ_x = 1/3` :

```text
2c = 1,40 m ;  2b = 0,70 m ;  2a ≈ 0,467 m
vent de travers (n selon y) : A_proj = π a c ≈ 0,513 m²
vent selon A–B (n selon x) : A_proj = π b c ≈ 0,770 m²
```

Le rapport des deux aires est `b/a = κ_y/κ_x`, ici 1,5. Changer `κ` change la force autant qu'un changement de `C_e` du même facteur. D'où la question 5 : sans `σ`, `κ_x`, `κ_y`, il n'y a pas d'ellipsoïde à calculer.

Effet de bord à accepter ou refuser : si les axes sont des fractions de `hRider`, modifier le gabarit de garde modifiera aussi la force statique. Aujourd'hui ce champ ne touche pas le solveur. C'est le prix de Q23. L'alternative — axes fixes en mètres, gabarit décorrélé — contredit « déduire du gabarit ».

## 7. Options bornées — recommandation de recherche, pas adoption

Aucune de ces options n'est validée. La recommandation dit seulement laquelle est la plus petite hypothèse compatible avec #127 et avec les sources lues.

| Id | Option | Statut recommandé |
| --- | --- | --- |
| L0 | Fermeture `f_n` du §3.1, `C_D⊥` unique par calcul, portance et effort axial **omis et nommés**. | À retenir pour une v1, si le point 2 du §9 est oui. |
| L1 | `C_D⊥` interne acier, `[CONVENTION]`, plus la sonde `[0,8 ; 1,3]` du §3.4. Le nombre central n'est **pas** proposé ici : 1,0, 1,2 ou 1,3 seraient tous des conventions. | Le mainteneur choisit le centre, ou refuse L1. |
| L2 | Textile : même `C_D⊥` que l'acier, étiqueté « non-distinction, pas une mesure ». | Seulement si une force de corde est exigée avant toute donnée. Préférence de recherche : ne pas prétendre une égalité. |
| L3 | Textile sans `d` saisi : pas de traînée de ligne, pas de diamètre inventé. Acier : `d` nominal saisi = `d` aérodynamique déclaré, pas un diamètre circonscrit prouvé. | À retenir, sauf veto. |
| L4 | Sonde `d`, `0,95d`, `1,05d` à `C_D⊥` figé. | Utile, non normative. Le 5 % n'est pas une clause relue. |
| E0 | Force statique du §5.3, `C_e` `[CONVENTION]`, colinéaire au vent, `A_proj` du §5.2. `C_dA` de §12.2 inchangé. | À retenir si le point 1 du §9 est « statique seule ». |
| E1 | Règle fractionnaire du §6.3, bas du solide au bas du gabarit, longe hors du solide et hors de la force. | À retenir **dès que** `σ`, `κ_x`, `κ_y` sont choisis. Pas avant. |
| E2 | Solide de hauteur `h_rider`, ou hauteur 0,6 m au défaut par le partage 1,5/0,6. | À écarter, sauf acceptation explicite du piège correspondant. |
| E3 | Remplacer `C_dA = 0,45 m²` par la projection de la force ellipsoïde dans l'EDO. | Hors recommandation : cela détruit le seul calage de descente sans le valider spatialement. |

Pas de `Cd` « produit » dans ce tableau. Pas de claim que `[0,8 ; 1,3]` encadre l'erreur réelle.

## 8. Tests de référence et de sensibilité

Ces tests contrôlent le code et les conventions choisies. Ils ne valident pas un coefficient. Les valeurs attendues viennent de l'algèbre ou d'un cas fermé, jamais de la fonction sous test (règle de `CONTRIBUTING.md`).

**Référence, sans coefficient libre :**

1. `f_n · t = 0` ; `f_n` inchangé si `t → −t` ; `f_n` dans le sens de `u_n` si `C_D⊥ ≥ 0` ; `f_n = 0` si `u_n = 0`, sans division.
2. Vent latéral pur, ligne dans le plan vertical : composante verticale de `f_n` nulle. Le contrôle numérique déjà écrit dans la revue ligne §3.3 (`u = (0,10,0)`, deux tangentes) reste un test d'algèbre.
3. `q_0 = λ f_n`. Ne pas ajouter des N/m étiré à des N/m matériel.
4. `A_proj` sur les trois axes : `πbc`, `πac`, `πab`. L'exemple 0,4 × 0,4 × 1,0 m de la revue passager (aires 0,12566 m² et 0,31416 m², pas 0,40 m²) reste le contrôle anti-rectangle.
5. Vent nul : force passager nulle, forme identique aux fixtures planes. Cela ne teste pas l'aérodynamique.
6. Deux brins, une fois le partage codé : la force passager est divisée par deux, le poids propre et `f_n` de chaque brin ne le sont pas. Pas de facteur de sillage.

**Sensibilité, après choix des constantes :**

7. `f_n` linéaire en `d` et en `C_D⊥` quand l'autre est figé. Sonde 0,95 et 1,05 sur `d`. Sonde aux bornes 0,8 et 1,3 de l'enveloppe, plus le centre choisi, sur un même scénario. Publier l'écart de forme et de tension, pas un « Cd validé ».
8. `F_aéro` nulle à `U = 0` ; colinéaire à `u` ; `A_proj` au vent de travers et au vent A–B dans le rapport `b/a` si les formules du §5.2 sont celles codées.
9. `h_rider` doublé, fractions fixes : les aires ×4, la force ×4 à vent et `C_e` figés. Si un jour le résidu était une longueur fixe, ce test doit échouer — c'est le détecteur de la règle.
10. `h_rider` trop petit pour une règle à résidu fixe, si cette règle était quand même choisie : pas d'axe négatif, pas de silencieux. La garde continue d'utiliser `h_rider` entier.
11. La descente sans vent et le `C_dA` expédié ne bougent pas si E0 est retenu. S'ils bougent, E3 a été codé sans décision.

Le Verdict, les facteurs de sécurité et la garde réglementaire ne sont pas des oracles de ces tests.

## 9. Agents et mainteneur

### Les agents peuvent régler, sans nouveau jugement

- Coder L0, L3, L4, E0, E1 **une fois** les constantes du §9.2 sont écrites. Les tests 1–6 et 8–11 n'attendent pas un essai en soufflerie.
- Calculer `Re` d'illustration avec un `ν` déclaré. Ne pas ajouter une loi `C_D⊥(Re)` : aucune courbe de 6×19 ou de corde n'a été lue dans le domaine `10³–10⁴`.
- Si un PDF licite de Nebres 1993 devient lisible : en extraire `Cd`, `Cl`, l'angle et le diamètre, et proposer une révision de l'enveloppe. Pas un défaut en attendant.
- Si le mainteneur nomme une table anthropométrique ouverte : en extraire des rapports pour la posture qu'il aura dite, et les lui renvoyer. Ne pas les coder avant confirmation.
- Relire l'image vide de la formule (1) de Liu si une autre copie du PDF la contient. Jusque-là, les tables Liu restent non converties.
- Tenir acier et textile sur des chemins distincts même si L2 leur donne le même nombre : le nombre partagé est une étiquette, pas une fusion de modèles. `EA` reste celui du §13.1 ou du §13.2.

### Questions au mainteneur — seules celles qui bloquent

Priorité décroissante. Chaque question est un choix ; la recherche ne la tranche pas.

1. **Statique seule, ou aussi la descente ?** Recommandation : E0, laisser `C_dA = 0,45 m²` dans l'EDO. Confirmer, ou assumer E3 et la perte du calage SSF.
2. **Omettre portance et frottement axial de ligne en v1 ?** Recommandation : oui, L0, omission nommée. Nebres montre que la portance de toron existe ; aucun coefficient n'est lisible. L'alternative est de ne pas calculer de forme spatiale sous vent tant qu'un `Cl` de construction n'est pas lu.
3. **D'où vient le nombre ?** Convention interne étiquetée, sans nouveau champ (L1, et L2 seulement si la corde doit porter une force avant toute mesure), ou pas de force tant que l'utilisateur ne saisit pas un coefficient (nouveau champ — hors gabarit, donc pas interdit par Q23, mais contraire à « pas de valeur adoptée » si on en expédie une). Si convention : quel centre pour l'acier, et le textile le partage-t-il ?
4. **Quel diamètre ?** Confirmer L3 : nominal acier saisi = diamètre aérodynamique déclaré ; diamètre textile absent = pas de traînée de ligne. Ou exiger un diamètre textile (le champ existe déjà, il n'est pas toujours rempli).
5. **Quels `σ`, `κ_x`, `κ_y` ?** Sans eux, E1 n'a pas d'axes. Confirmer aussi : bas du solide au bas du gabarit, centre sur le chariot, poulie et longe hors force, et accepter que changer le gabarit change la force statique. Rejeter E2 sauf mention contraire. Si `h_rider` ne permet pas un solide positif, omettre la force passager sans nouveau bandeau — à confirmer, parce que #127 laisse ouvert le comportement d'un calcul indisponible et refuse un affichage particulier.

Hors de cette liste : profil de vent, solveur, vues, `#124`, facteurs de sécurité, sillage de deux brins, loi `d(T)`, loi `EA` non linéaire. Déjà tranchés, ou confiés à d'autres notes.

## 10. Ancres de code

| Fait | Où |
| --- | --- |
| Gabarit soustrait à la garde, défaut 2,1 m `[CONVENTION]` | `src/lib/sim/clearance.ts` (docstring `hRider`, soustraction vers la ligne 265) ; `src/lib/scenario/first-run.ts` (`hRider: 2.1`) ; `docs/simulation-theory.md` §6.3 et §11 |
| Aide : passager, harnais et poulie sous le câble | `src/lib/rail/help.ts`, entrée `hRider` |
| Champ strictement positif, porte Clearance, pas le solveur | `src/lib/rail/fields.ts`, `hRider` |
| `C_dA = 0,45 m²` `[FIELD:SSF]`, borne de saisie 0,30–0,60 `[CONVENTION]`, vent projeté sur la tangente seulement | `src/lib/sim/dynamics.ts` ; `docs/simulation-theory.md` §12.2 |
| Vent géographique → `along` / `across` | `src/lib/sim/wind.ts` |
| Diamètre acier nominal, mm, pour `MBF`/`EA`/`μ` | `src/lib/sim/materials/steel.ts`, `steelFormula` |
| Diamètre textile optionnel, pas lu par le solveur | `src/lib/sim/types.ts` (`d?`) ; `src/lib/rail/tensioning.ts` |
| `EA` acier constant dérivé ; `EA` textile `k·MBL` | `steel.ts`, `src/lib/sim/materials/textile.ts` |

## 11. Contrôles documentaires

`CONTRIBUTING.md` § Checks : `format:check`, `typecheck`, `lint-type-aware`, `test:ci`. Cette note est un Markdown sous `docs/references/`. `.oxfmtrc.json` ignore `**/*.md`, donc oxfmt ne la relit pas. Elle n'est pas importée par `src/lib/docs/pages.ts` (seuls les quatre rapports servis le sont) et `src/lib/docs/refs.test.ts` ne vérifie que les `§` de l'aide vers `simulation-theory.md`. Typecheck, lint et tests ne la voient pas. Aucun de ces contrôles ne peut échouer sur son contenu, ni en garantir les liens. Limite assumée : pas d'édition du README ni d'un test pour l'enregistrer.

Vérification faite le 10 novembre 2026 : `bunx oxfmt --check docs/references/spatial-wind/agent-readiness-aerodynamics.md` sort avec « All matched files may have been excluded by ignore rules » (code 2). Le fichier n'est pas formaté, et ce n'est pas un échec de contenu. `typecheck`, `lint-type-aware` et `test:ci` n'ont pas été lancés : ils ne lisent pas cette note.
