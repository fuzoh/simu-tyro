# Équilibre spatial sous gravité et vent — préparation scientifique

Recherche du 2026-11-09 pour #127, #120, #118 et #124. **Note préparatoire, pas une spécification validée ni un dimensionnement de sécurité.** Aucun coefficient aérodynamique, facteur de sécurité ou profil de vallée n'est adopté ici. Les rapports de recherche automatiques servent à découvrir des sources, jamais de preuves.

## 1. Audit du moteur actuel

- `src/lib/sim/catenary.ts` : chaînette extensible plane, longueur matérielle non étirée `S`, altitude `z` positive vers le haut. `V(S)=V₀+wS`, `T=√(H²+V²)`, `dx/dS=H/T+H/EA`, `dz/dS=V/T+V/EA`. `H` constant est une conséquence des charges exclusivement verticales, pas une propriété générale d'un câble.
- `src/lib/sim/loads.ts`, `solve.ts`, `sweep.ts` : deux segments sous charge ponctuelle ; balayage des positions matérielles du passager. Distinguer forme instantanée de la ligne et lieu des positions successives du chariot.
- `src/lib/sim/materials/` : chaînes de paramètres acier et textile distinctes. Le solveur utilise un `EA` constant ; pour le textile, raideur sécante issue des paramètres du matériau, pas intégration d'une loi non linéaire de corde.
- `src/lib/sim/wind.ts`, `dynamics.ts` : vent géographique « venant de », projeté selon A→B ; effet longitudinal sur le passager, sans charge répartie de vent dans la statique.
- `src/lib/map/banane.ts` : déformation graphique qualitative à vide, pas une sortie mécanique en mètres. La ligne chargée n'en reçoit pas l'équivalent physique.
- `src/lib/sim/terrain.ts` : profil `zGroundAt(terrain,x)` le long de A–B, pas une surface `z(x,y)`.

Les objectifs des quatre issues ne sont donc pas déjà implémentés. La recherche #9 est une synthèse antérieure utile, non une validation du futur moteur : [rapport au commit 5760420](https://github.com/fuzoh/simu-tyro/blob/5760420/.scratch/field-2026-11-01/research/08-deplacement-lateral.md).

## 2. Équations et conventions à préserver

### Équilibre local — dérivation mécanique

`r(S)` position en m ; `F(S)` effort intérieur exercé par le côté `S⁺` sur le côté `S⁻`, en N ; `q₀` force extérieure par mètre **non étiré**, en N/m ; `λ=|dr/dS|=1+ε` allongement. Brin souple, tendu, sans rigidité de flexion :

```text
dF/dS = −q₀
T = |F| ; t = F/T
dr/dS = λ(T) t
```

Au passager, force extérieure ponctuelle `P_ext` en N :

```text
r(SP⁺) = r(SP⁻)
F(SP⁺) − F(SP⁻) = −P_ext
```

Avec `q₀=(0,0,−w)`, on retrouve `dV/dS=w` ; avec `P_ext=(0,0,−P)`, saut vertical `+P`. Ces signes reproduisent le code actuel. Une force horizontale ponctuelle entraîne aussi un saut horizontal : ne pas imposer systématiquement continuité de `H` ou égalité des tensions de part et d'autre du chariot. Mungan & Lipscombe [M] établissent le cas vertical statique, pas son extension sous vent.

**Matériau.** `λ=1+T/EA` correspond seulement à la loi extensible à `EA` constant actuellement codée. Une corde à loi non linéaire exige une relation mesurée `ε(T)` et une intégration adaptée. Fluage, hystérésis, historique et température ne deviennent pas une élasticité réversible par changement de coefficient.

**Densités de charge.** Poids par longueur matérielle et traînée par longueur exposée ne sont pas interchangeables. Si `f` est une force en N par mètre étiré : `q₀=λ f`. Masse linéique courante `μ=μ₀/λ` par conservation de masse. Toute approximation qui néglige cet allongement doit être explicite.

### Charge vectorielle uniforme : réduction plane

Si `q₀` est un vecteur constant, `F(S)=F_A−q₀S`. La tangente reste dans le plan engendré par `F_A` et `q₀` : à vide, la courbe est plane. La chaînette extensible actuelle peut alors être résolue dans ce plan après transformation des ancrages, puis projetée. Hypothèses : câble souple tendu, loi isotrope axiale à `EA` constant, charge prescrite uniforme par longueur matérielle, aucune charge ponctuelle hors du plan.

**Ancrages inclinés :** il faut aussi transformer les conditions limites, pas seulement remplacer `w` par la charge résultante. Avec `Δr=rB−rA`, choisir `e∥=−q₀/|q₀|`, puis `h∥=Δr·e∥` et `L⊥=|Δr−h∥e∥|`. Appeler la fermeture plane avec `(L⊥,h∥,|q₀|,L₀,EA)`, puis revenir au repère géographique. Pour `Δr=(L,0,h)` et `q₀=(0,q_h,−w)`, cela donne `h∥=hw/√(w²+q_h²)` et `L⊥=√(L²+h²q_h²/(w²+q_h²))`. Garder les anciens `(L,h)` est faux hors portée de niveau. Le cas dégénéré `L⊥=0` nécessite un traitement distinct.

Pour une portée de niveau et un travers prescrit `q_h` : `tan α=q_h/w`, `b=f_plan sin α`. `f_plan` est la flèche **recalculée dans le plan résultant**, jamais la flèche verticale du cas sans vent. Avec ancrages fixes, conserver la longueur au repos `L₀` et résoudre les réactions sous la nouvelle charge ; ne pas conserver aussi la tension sans vent.

La parabole donne `b_milieu≈q_h L²/(8H)` pour faible flèche, charge transverse approximativement uniforme par abscisse et `H` composante selon la portée. Ce contrôle asymptotique n'est pas un oracle de chaînette exacte ni une clause normative.

Avec vent latéral réparti et poids vertical ponctuel, les deux segments sont **généralement dans des plans différents**. Une rotation unique de la forme à vide ne résout pas la ligne chargée. Une traînée dépendant de la tangente ne constitue pas non plus la charge vectorielle constante de cette réduction.

### Méthodes candidates pour #127

1. Charge prescrite uniforme par morceaux, loi actuelle : chaînettes analytiques par segment, rotation locale, trois réactions inconnues à A ; imposer `r(L₀)=rB`. Newton amorti, continuation depuis vent nul et contrôle du résidu global. Si position imposée en abscisse, résoudre aussi la position matérielle correspondante.
2. Charge dépendant de la forme : problème aux limites couplé. Comparer tir avec intégration des équations locales, collocation ou éléments de câble ; une itération de charges figées reste candidate seulement si convergence et résidu mécanique final sont contrôlés.
3. Loi non linéaire : conserver l'équilibre local, remplacer la fermeture constitutive et l'intégration. Aucun choix de méthode n'est définitivement arrêté avant benchmarks de robustesse.

Sous charge ponctuelle, les repères des segments dépendent des réactions inconnues : une Jacobienne 3D analytique doit dériver aussi ces repères. Une simple rotation de la Jacobienne plane n'est pas suffisante ; comparer à des différences finies. Avec travers réparti pur et poids ponctuel vertical, `F_x` reste constant : la perte du plan unique ne signifie pas que toutes les composantes de tension varient.

## 3. Aérodynamique : équations utilisables, paramètres non acquis

NASA Glenn [N] donne `D=½ρ Cd A_ref U²` et insiste sur les dépendances à la forme, l'incidence et les conditions d'écoulement. **Le coefficient et son aire de référence sont inséparables.** Un coefficient frontal n'est pas automatiquement un coefficient latéral.

Une fermeture candidate pour la traînée normale d'un élément de câble circulaire est :

```text
u_rel = u_air − v_élément
u_n = u_rel − (u_rel·t)t
f_n = ½ρ Cd d |u_n| u_n
Re_n = ρ |u_n| d / η
```

`ρ` en kg/m³, `η` viscosité dynamique en Pa·s, `d` en m, `f_n` en N/m étiré. C'est une **hypothèse de traînée normale**, pas une loi validée pour toute corde tressée ou câble toronné : dépendances à Reynolds, rugosité, incidence, traînée tangentielle et éventuelle portance restent à caractériser. Le vent uniforme dans l'espace ne rend pas `f_n` uniforme le long d'une ligne courbe.

- **Acier / textile :** aucune valeur universelle de `Cd` n'est retenue. Le `c_f=1,2` de Đokić [D] cite des normes non relues ; pas un défaut validé par cette recherche.
- **Diamètre sous tension :** aucune loi universelle de Poisson pour assemblage toronné ou tressé. Rechercher une mesure `d(T)` propre à la construction ; à défaut, diamètre fixé comme hypothèse et analyse de sensibilité, sans prétendre l'effet nul.
- **Passager cube ou ellipsoïde :** géométrie, dimensions, orientation et aire doivent être explicites. Le choix géométrique ne fournit pas `Cd`. Le `CdA=0,45 m²` longitudinal déjà documenté dans la théorie §12.2 est un calage SSF, pas une mesure de traînée latérale de ces solides. Aucun défaut cube/ellipsoïde validé n'est proposé.
- **Vent relatif du passager :** utiliser sa vitesse spatiale dans `u_rel`. Si cette force charge la ligne, elle couple l'équilibre à la dynamique longitudinale : préciser si elle utilise une vitesse prescrite ou une itération cohérente, et éviter double comptage entre force transmise au brin et force tangentielle dans l'EDO.
- **Deux brins :** calcul partagé seulement sous symétrie explicite de géométrie, `L₀`, matériau, poids propre, vent et forces ponctuelles partagées. Le partage vertical 50/50 ne prouve pas un partage latéral identique. Sillage, espacement et contrainte du chariot restent des inconnues ; ni diamètre doublé ni tension automatiquement divisée par deux.

## 4. Vent en vallée — résultats et limites

Aucun profil prédictif local ni paramètre analogue au facteur Q n'est adopté. Le vent uniforme demeure un **scénario de repli déclaré**, pas une garantie conservative. Une représentation variable doit distinguer vecteur vitesse, localisation, hauteur, période de moyenne et rafales ; le relief seul ne fournit pas ces données.

Identité statistique, pour une composante scalaire `U` : `⟨U²⟩=⟨U⟩²+Var(U)`. Elle explique pourquoi calculer la charge avec la vitesse moyenne peut différer de la charge moyenne. Une force vectorielle utilise `|u|u` : ne pas transformer cette identité scalaire en règle de direction. Aucun facteur de rafale n'est déduit ici.

Les campagnes Perdigão [P, R] montrent des recirculations, une dépendance à la stabilité et des différences entre transects d'un même site. Menke et al. [R], résumé et §§3–4, observent du vent inversé dans 52 % des scans sélectionnés avec vent perpendiculaire aux crêtes, selon leur critère de détection ; ce chiffre n'est ni une probabilité applicable aux tyroliennes ni un facteur de charge. La revue Rotach et al. [A] explique pourquoi relief, stratification et circulation doivent être considérés ensemble. Ces sources ne fournissent pas une courbe universelle centre/versants.

Comparer trois niveaux : vent uniforme déclaré ; champ de mesures locales avec interpolation vectorielle explicitée et incertitude ; étude de site micro-météorologique/CFD validée. Une interpolation entre deux seuls ancrages peut masquer une recirculation centrale : ce n'est pas une reconstruction validée.

Une poignée paramétrique peut décrire un scénario utilisateur, pas acquérir un pouvoir prédictif faute de mesures. Amplitude signée et largeur seraient des paramètres de scénario, non des propriétés déduites du MNT. Aucune forme de cloche ni interface n'est imposée ici ; le scénario uniforme correspond à une modulation nulle. Le modèle doit évaluer les forces localement, pas élever au carré une moyenne spatiale.

Pour une composante normale de signe constant, avec `ρ`, `Cd` et `d` constants, la moyenne de la charge scalaire est `½ρ Cd d (Ū²+σ²)`. Si le vent s'inverse, conserver la moyenne vectorielle `⟨|u_n|u_n⟩` ; la moyenne signée peut s'annuler malgré des charges locales opposées. Aucun pourcentage universel de majoration n'est établi. Les angles et majorations proposés sans preuve dans le rapport automatique ont été écartés.

## 5. Dynamique du passager et limites du quasi-statique

Mungan [M], note 1, définit le déplacement lent par accélération négligeable et vitesse très inférieure à la plus lente onde transversale : `v≪√(T_min/μ)`. **Aucun seuil 0,2 ni 0,3 n'y est donné.** Le seuil `0,2` du moteur reste une convention d'avertissement interne, pas une borne d'erreur scientifiquement validée. Examiner aussi périodes propres, temps de variation du vent, pose de charge et freinage ; un petit `v/c` ne suffit pas à exclure les transitoires.

Jojić et al. [J] calculent un lieu statique puis une dynamique du passager sur ce lieu. Leur comparaison ADAMS porte sur un chemin imposé et un cas de faible pente, pas une validation du câble déformable complet. Le lieu du passager n'est pas la tangente d'un segment instantané de corde.

Contrôle énergétique dérivé, rail fixe sans dissipation, `z` vers le haut : `½mv²+mgz=constante`. Pour une ligne qui change de forme avec la position du passager, examiner séparément l'énergie gravitationnelle `∫μ₀gz dS` et l'énergie élastique `∫T²/(2EA)dS` de la loi actuelle. Leur variation n'est pas automatiquement capturée par l'EDO sur un lieu figé. Quantifier cette limite avant de réutiliser la dynamique actuelle comme modèle couplé ; ne pas ajouter une correction silencieuse sans formulation mécanique cohérente.

#124 reste différée : inertie de ligne, masse mobile, couplage des longes, freinage, vibrations, rafales et aéroélasticité ne sont pas résolus par les équilibres successifs. Aucune amplification dynamique ou garantie de garde minimale n'est déduite ici. Éléments finis, masses concentrées et formulations mixtes sont des candidats, pas une obligation d'ANCF ou d'un intégrateur unique. Le rapport automatique dynamique contenait de faux titres, une fausse campagne expérimentale et des signes d'énergie incohérents ; ces éléments ont été écartés après lecture des PDF [M, J, V].

## 6. Garde au sol et contrat des vues — #118

Garde verticale : `z_ligne(x,y)−z_terrain(x,y)`, en incluant séparément le gabarit du passager si demandé. Ce n'est ni une distance minimale 3D aux obstacles ni une attestation normative.

Le terrain actuel ne fournit que `z(x)` sur A–B. Sous déport latéral, **la garde hors axe est indisponible** sans échantillonnage terrain à la position réelle. Extruder silencieusement ce profil inventerait un terrain sans dévers. Un futur contrat doit porter valeur disponible/indisponible, emprise et précision du terrain.

Les vues 3D, dessus et côté doivent projeter les mêmes coordonnées calculées à vide et sous charge. A–B reste une référence indépendante. Absence de convergence, de charge documentée ou de terrain hors axe : ne pas remplacer la sortie manquante par une Banane qualitative présentée comme physique.

## 7. Validation avant développement puis mise en service

| Cas | Contrôle attendu | Ne valide pas |
| --- | --- | --- |
| Vent nul | Fixtures planes actuelles, `y=0`, mêmes tensions et positions | Aérodynamique |
| Charge vectorielle uniforme, à vide | Accord avec chaînette tournée, planéité ; ancrages satisfaits à `L₀` fixé | Traînée locale réelle |
| Faible flèche | Limite parabolique `q_h L²/(8H)` dans ses hypothèses | Grandes flèches |
| Charge ponctuelle | Continuité position, saut vectoriel correct, bilan global des réactions | Inertie du passager |
| Vent latéral + poids ponctuel | Solution généralement non plane ; symétrie miroir si vent inversé | Coefficients |
| Charge dépendant tangente | Résidus d'équilibre et convergence charge/forme ; raffinement spatial et solveur indépendant | Données de matériau |
| Limite raide | Convergence vers solution inextensible, sans perte de robustesse | Textile réel |
| EDO sans pertes | Conservation énergie sur chemin fixe ; convergence temporelle | Énergie du câble mobile |
| Terrain hors axe absent | Garde indisponible, aucune extrapolation silencieuse | Garde spatiale |
| Deux brins symétriques | Accord copie/deux calculs sous hypothèses identiques ; cas dissymétriques séparés | Sillage et partage réel |

Mesures nécessaires : construction et conditionnement ligne, `L₀` ou protocole de prétension, `EA`/courbe de traction, masse linéique, diamètre sous tension, ancrages 3D, formes à vide/chargée, vent mesuré synchronisé, tensions et positions/vitesses. Validation numérique et validation expérimentale sont deux étapes distinctes. Aucun seuil d'acceptation physique n'est inventé ici.

**Erreur détectée dans une source :** [D], p. A92, imprime `52,7 sin(27,8°)=26,7 m`. Le calcul donne environ `24,58 m`. Ne pas utiliser `26,7 m` comme oracle. Le résultat glacé `85,9 sin(41,1°)≈56,47 m` est arithmétiquement cohérent mais propre à son cas, pas un paramètre transférable.

## 8. Sources et traçabilité

Sources ouvertes durant cette recherche, 2026-11-09 ; sections effectivement exploitées :

- **[M]** Mungan & Lipscombe, *Traveling along a zipline*, Lat. Am. J. Phys. Educ. 5, 5–8 (2011), équilibres et note 1 : [PDF USNA](https://www.usna.edu/Users/physics/mungan/_files/documents/Publications/LAJPE6.pdf). Contrôle indépendant du PDF et de la note sur la lenteur.
- **[D]** Đokić, Vladić & Jojić, *Analysis of zipline systems with large spans and low inclination angles*, Engineering TODAY (2026), éq. 1–10, p. A85–A93 : [DOI](https://doi.org/10.46793/ET26.A11DJ), [PDF](https://www.et.kg.ac.rs/wp-content/uploads/2026/09/et2026-a11.pdf). Source primaire d'un modèle, secondaire pour ses citations normatives. Arithmétique du déport nu infirmée ci-dessus.
- **[J]** Jojić, Vladić & Đokić, *Forming of zipline mathematical model* (2025), trajectoire, équations 10 et 18, comparaison ADAMS : [DOI](https://doi.org/10.46793/til2025.193j), [PDF](https://til.masfak.ni.ac.rs/images/10/4.3.pdf). Ne pas confondre validation du chemin imposé et validation du couplage de ligne.
- **[V]** Vladić, Jojić & Đokić, IMK-14 26(4), SR89–94 (2020), résumé et §4.2 : [DOI](https://doi.org/10.5937/imk2004089v), [PDF](https://scindeks-clanci.ceon.rs/data/pdf/0354-6829/2020/0354-68292004089V.pdf). Étude d'arrêtoirs ; aucune campagne de pics de tension « Adrenalin Park » établie par ces pages.
- **[N]** NASA Glenn, [Drag Equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/), sections Drag Coefficient / Reference Area : équation, rôle des essais et cohérence aire/coefficient. Référence institutionnelle pédagogique, pas essai d'une corde ou d'un passager.
- **[P]** Fernando et al., *The Perdigão: Peering into Microscale Details of Mountain Winds*, BAMS (2019) : [DOI](https://doi.org/10.1175/BAMS-D-17-0227.1), [PDF ouvert](https://backend.orbit.dtu.dk/ws/portalfiles/portal/183625409/bams_d_17_0227.1.pdf). Campagne sur relief à deux crêtes ; recirculation figure 7, pas figure 11. Source lue par la recherche vallée.
- **[R]** Menke et al., *Characterization of flow recirculation zones at the Perdigão site using multi-lidar measurements*, ACP 19, 2713–2723 (2019) : [article](https://doi.org/10.5194/acp-19-2713-2019), [PDF](https://acp.copernicus.org/articles/19/2713/2019/acp-19-2713-2019.pdf). Mesures, sélection des écoulements et limites de représentativité ; PDF recoupé indépendamment.
- **[A]** Rotach et al., *On the Vertical Exchange of Heat, Mass, and Momentum Over Complex, Mountainous Terrain*, Frontiers in Earth Science (2015) : [DOI et texte](https://doi.org/10.3389/feart.2015.00076). Revue, pas campagne de validation d'une portée ; limites des modèles idéalisés. Lue par la recherche vallée.
- Théorie et code locaux, notamment `docs/simulation-theory.md` §§4, 6, 8, 12, 15. Ce sont des objets audités, pas des preuves indépendantes de leurs propres coefficients.

Normes EN 15567, EN 1991-1-4, EN 12929/12930 : clauses non relues. Irvine (1981) et Impollonia et al. (2011) : pas de texte intégral lu dans cette passe. Aucune valeur réglementaire ou équation nouvelle n'en est revendiquée.

## 9. État des recherches

Quatre axes distincts ont été lancés : équilibre spatial, aérodynamique, vent en vallée, dynamique/validation. Les rapports automatiques d'équilibre et de dynamique ont montré des erreurs ; seuls résultats recoupés, dérivations identifiées et sources ouvertes sont utilisés ici. Une revue scientifique indépendante a recoupé l'équilibre, corrigé la transformation des ancrages inclinés et confirmé l'erreur arithmétique de [D]. La recherche vallée a vérifié les sources [P, R, A] ; [R] et [N] ont été relus séparément. La recherche aérodynamique a produit un rapport brut mais sa revue spécialisée a été interrompue par indisponibilité du fournisseur : aucun de ses coefficients ou affirmations spécifiques n'a été adopté. Ce volet demeure une lacune scientifique, pas une validation acquise.

Identifiants des recherches externes pour retrouver les rapports bruts : équilibre `ChBhYWIwMTAxMTRmNTAzZDcwEAgaAjQyKgRtYWlu` ; aérodynamique `ChA2YTM2M2ZhODMzZmU3ZWRhEAgaAmNkKgRtYWlu` ; vallée `ChA0MjE4OWQ0ZDM4MjUzYzY0EAgaAjJjKgRtYWlu` ; dynamique `ChAyNjc2NWQ1NjQ3ZjUzNDNmEAgaAjJkKgRtYWlu`. Ces identifiants ne remplacent pas les références scientifiques. Une recherche aérodynamique supplémentaire a aussi été lancée (`ChAzZjdmNjViOTU5ODVhZjRhEAgaAjBiKgRtYWlu`), sans résultat utilisé ici.

**Avant implémentation :** arbitrer modèle de charge et loi matériau, acquérir données aérodynamiques ligne/passager, définir terrain hors axe et protocole de validation. Les quatre issues conservent leurs critères ouverts et leur état `ready-for-human`.
