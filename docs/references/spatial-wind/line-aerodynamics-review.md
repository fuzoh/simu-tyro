# Vérification indépendante — aérodynamique de câble et de corde

**Date :** 9 novembre 2026. **Objet audité :** `docs/references/equilibre spatial vent.md`, commit `6bada50eb7ac5bf8d060984fad454a233bf66673`, particulièrement §3 ; conventions lues dans `docs/conventions/simulation.md`.

**Périmètre :** force normale, principe d’indépendance, Reynolds et construction, diamètre sous tension, interaction entre deux brins. Pas de validation du passager, du vent de vallée, des normes de dimensionnement ou des instabilités dynamiques. Aucun dépôt modifié, aucun modèle tiers lancé, aucune délégation, aucune publication GitHub. Recherches et fichiers écrits uniquement sous `/tmp`.

## 1. Résumé décisionnel

1. **Conserver la fermeture vectorielle normale de la note comme modèle candidat, pas comme loi générale.** Projection normale exacte géométriquement ; relation force–vitesse et indépendance vis-à-vis de l’écoulement axial restent des hypothèses physiques. Une composante verticale obtenue par projection n’est pas une portance indépendante.
2. **Ne valider aucun défaut `Cd` pour câble toronné ou corde textile.** Les plages `1,0–1,1` acier et `1,1–1,3` textile du rapport brut ne disposent pas de preuve transférable. Aucun seuil universel d’incidence de 30° n’est établi.
3. **Toronnage : effet mesuré, pas seulement une rugosité scalaire.** Nebres et al. observent une portance stationnaire sur câbles toronnés inclinés, pour `Re = 5 000–50 000` [R3, résumé primaire]. Le texte intégral n’a pas été obtenu : aucune valeur de `Cd`, `Cl` ou de couple n’en est extraite.
4. **Diamètre : acquérir des données propres au produit et à son historique.** Des mesures primaires montrent une contraction des câbles métalliques [R6] et d’une tresse HMPE [R7]. Elles ne fournissent aucune loi universelle acier/textile. Pour la tresse étudiée, le premier cycle change fortement le diamètre, les suivants beaucoup moins.
5. **Deux brins : indépendance aérodynamique non acquise, même sous symétrie mécanique.** Des essais de cylindres montrent abri en tandem, force amont sur le cylindre arrière et interférence latérale de signe variable [R5]. Ni `2d`, ni réduction forfaitaire de traînée, ni partage 50/50 ne sont validés.
6. **Deux erreurs certaines du rapport brut :** §§2.3–2.4 confondent travers géographique et incidence locale ; le DOI attribué à Macdonald concerne un autre article. Rejeter les coefficients appuyés sur cette attribution.

**Décision concrète :** §3 de la note actuelle est scientifiquement prudent et doit le rester. Il peut être enrichi par les preuves et contre-exemples ci-dessous. Le volet n’est plus « non relu », mais **les paramètres aérodynamiques d’un produit réel restent non acquis**. Un calcul exploratoire peut accepter une loi explicitement fournie par l’utilisateur avec son domaine ; aucune certification ou garde conservatrice n’en découle.

## 2. Méthode et niveaux de preuve

- **[P] Preuve primaire consultée :** observations ou définitions présentes dans les pages, figures ou résumés originaux identifiés en §8.
- **[D] Dérivation :** conséquence algébrique ou mécanique des définitions, sans nouveau coefficient empirique.
- **[H] Hypothèse/extrapolation :** choix possible de modèle, non validé pour les lignes de simu-tyro.

Corpus borné : **sept sources scientifiques retenues**, dont deux consultées au niveau du résumé original seulement ; deux autres articles ouverts puis écartés comme preuves de `d(T)` ; un contrôle bibliographique du DOI litigieux. Pas de coefficient repris d’un souvenir, d’un extrait de moteur de recherche ou du rapport IA. Les notices Crossref/OpenAlex ont servi à découvrir les documents, non à lire à leur place des courbes inaccessibles.

Le rapport brut `/tmp/simu-aerodynamique-raw.md` est traité comme objet à auditer. Son absence de source vérifiable ne prouve pas qu’une affirmation est fausse ; elle interdit de l’adopter. Les assertions réfutées sont distinguées des assertions simplement non établies.

## 3. Force locale : conventions et équations SI

### 3.1 Géométrie, vitesse et densité de charge

[D] `S` : longueur matérielle non étirée, en m ; `s` : longueur courante, en m ; `ds = λ dS`, `λ = |∂r/∂S| > 0` ; `t = ∂r/∂s` unitaire. Pour un élément matériel mobile :

```text
u = u_air(r,t_physique) − v_élément(S,t_physique)        [m/s]
u_n = u − (u·t)t                                      [m/s]
U_n = |u_n|                                          [m/s]
Re_n = ρ U_n d / η                                   [sans dimension]
```

`ρ` : masse volumique de l’air, kg/m³ ; `η` : viscosité dynamique, Pa·s ; `d` : diamètre extérieur exposé dans l’état courant, m. La direction aérodynamique utilise le vecteur vitesse de l’air **vers lequel l’air se déplace**, et non directement l’azimut météo « venant de ». La conversion géographique existante doit rester distincte.

[H] Fermeture de traînée normale avec principe d’indépendance :

```text
f_n = (1/2) ρ C_D⊥(Re_n, construction, état, ...) d U_n u_n    [N/m courant]
q_0,aéro = λ f_n                                               [N/m matériel]
```

`C_D⊥` désigne ici le coefficient de traînée en écoulement perpendiculaire à un brin isolé, rapporté à l’aire `d ds`. Utiliser ce coefficient au vent oblique est précisément l’hypothèse à vérifier. Si les essais imposent une dépendance à l’incidence ou une force hors de `u_n`, ils ne sont plus décrits par cette seule fermeture.

[D] Au point `U_n = 0`, cette expression se prolonge par `f_n = 0` si son coefficient reste borné ; implémenter la forme `U_n u_n` évite la division par zéro. **Cela ne prouve pas que la force aérodynamique totale s’annule lorsque le vent est axial.** Une loi utilisée hors de son domaine de Reynolds, notamment près de zéro, n’est pas régularisée physiquement par ce seul choix de code.

[D] Contrôles algébriques : `f_n·t = 0`, invariance si `t` est remplacé par `−t`, force dans le sens de `u_n` si `C_D⊥ ≥ 0`. Dans la convention de la note, l’équilibre reste `dF/dS = −q_0`. Ne pas ajouter une force par mètre courant directement à un poids par mètre matériel. Conservation de masse : `μ = μ_0/λ`, pas modification arbitraire de `μ_0` lorsque le diamètre varie.

### 3.2 Angle et aire de référence : éviter une puissance de sinus erronée

[D] Pour un brin rectiligne, choisir `θ` comme angle aigu entre axe et vent : `θ = 90°` au travers du brin ; `U_n = U sin θ`. Dans cette fermeture :

```text
F_n / ds = (1/2) ρ d C_D⊥(Re_n) U² sin²θ
C_N,U = (F_n/ds) / [(1/2)ρU²d] = C_D⊥(Re_n) sin²θ
```

`C_N,U` est un **coefficient de force normale normalisé par la vitesse totale**, pas un coefficient de traînée selon l’axe du vent. La projection de cette seule force dans la direction du vent ajoute un sinus :

```text
F_D,vent / ds = (1/2) ρ d C_D⊥(Re_n) U² sin³θ
```

Si une force axiale existe, sa projection doit être ajoutée. De même, un coefficient défini sur une aire projetée autre que `d ds` change d’expression. Enfin `Re_n` change avec `θ` : même sous principe d’indépendance, ne pas figer tacitement `Cd` quand la courbe en Reynolds varie.

**Convention de [R1] :** angle de lacet `β = 0°` au cylindre perpendiculaire au vent ; donc `θ = 90° − β`. Comparer des seuils angulaires sans cette conversion peut inverser le domaine annoncé.

### 3.3 Contre-exemple au rapport brut : travers et pente verticale

[D] Soit une ligne dans le plan vertical A–B, `t = (t_x, 0, t_z)`, et un vent uniforme strictement latéral `u = (0,U,0)`. Alors :

```text
u·t = 0 ; u_n = (0,U,0)
f_n,z = 0
```

La pente verticale, même forte, **ne diminue pas l’incidence** de ce vent latéral. Avec `Cd`, `d` et l’air constants, la force normale par mètre courant est uniforme malgré la flèche verticale. Par mètre matériel, elle ne l’est que si `λ` est aussi constant.

Après déport spatial, `t_y` peut être non nul ; pour le même vent :

```text
u_n,z = −U t_y t_z
f_n,z = −(1/2)ρ Cd d |u_n| U t_y t_z
```

Une composante verticale devient alors possible. Elle est la projection de la traînée normale, non une preuve de `Cl` non nul. Un vent comportant une composante selon A–B peut également produire cette projection sur une ligne dans le plan vertical.

Contrôle numérique sans coefficient aérodynamique : pour `u=(0,10,0) m/s` et `t=(cos 0,6, 0, sin 0,6)`, `u_n=(0,10,0) m/s` ; pour `t=(0,8,0,3,√0,27)`, `u_n≈(−2,4,9,1,−1,55885) m/s`. Trace : `/tmp/simu-aero-verif/controles-algebriques.json`. Ce sont des tests d’algèbre, pas une validation expérimentale.

## 4. Ce que les essais établissent sur l’indépendance et les coefficients

### 4.1 Cylindre lisse incliné : l’indépendance n’est pas une identité physique

[P] Bursnall & Loftin [R1], pp. 1, 3–8, ont mesuré les pressions sur un tube circulaire en laiton poli de diamètre `0,0508 m`, aux lacets `β=0°,15°,30°,45°,60°`, autour de la transition critique et jusqu’à environ `Re_n = 5×10⁵`. Mach normal inférieur à `0,2`, soufflerie de très faible turbulence. Les forces de pression sont obtenues par intégration des distributions.

Résultats explicitement donnés pp. 7–8 :

- Reynolds critique voisin de `3,65×10⁵` à `β=0°`, contre `1,00×10⁵` à `β=60°` ;
- coefficient de traînée normal fondé sur la vitesse normale, en régime supercritique, d’environ `0,18` à `β=0°`, contre `0,74` à `β=60°` ;
- conclusion des auteurs : près et au-dessus du critique, écoulement et forces ne se déterminent pas par la seule composante normale.

**Domaine de ces chiffres : ce tube et ces essais, pas une corde de tyrolienne.** Ils servent de contre-exemple à une loi universelle, pas de paramètres moteur. Les pp. 6–7 signalent aussi des écarts sous-critiques ; le rapport ne fournit pas une certification de tout le domaine `θ>30°`.

[H] Utiliser l’indépendance comme première approximation moyenne d’un brin isolé peut rester un choix de simulation. Mais aucun des documents lus ne fournit un seuil unique de 30°, une erreur maximale universelle ou une correction constante pour faible incidence.

### 4.2 Rugosité : dépendance établie, plateau universel non établi

[P, accès limité] Achenbach [R2], **résumé original seulement**, décrit des mesures de pression et frottement sur cylindres rugueux jusqu’à `Re=3×10⁶`, et l’évaluation de la traînée en fonction de Reynolds et du paramètre de rugosité. Le texte intégral et ses courbes n’ont pas été obtenus. Il serait abusif de lui attribuer ici un seuil de crise, un minimum `Cd` ou une plage de rugosité précise.

La source confirme la nécessité d’un domaine documenté. Elle ne valide pas la phrase du brut selon laquelle toronnage et textile effacent toute crise et stabilisent universellement `Cd` entre `0,9` et `1,3`. Pas davantage de preuve pour `Re≈5×10⁴`, `Cd,min≥0,8` ou un plateau acier `1,0–1,1`.

### 4.3 Câble toronné : données originales pertinentes mais insuffisantes pour un défaut

[P, accès limité] Nebres, Batill & Nelson [R3], **résumé original et nomenclature en ligne**, rapportent essais en soufflerie lente sur modèles rigides de câbles toronnés et de cylindres, quatre angles et `Re=5 000–50 000`. Mesures de pression, fil chaud et visualisations montrent :

- portance stationnaire liée à la séparation asymétrique ; direction vers le côté où les torons principaux s’alignent davantage avec l’écoulement ;
- effet apparent des irrégularités des fils sur portance et traînée ;
- sillage et structures de cisaillement différents de ceux du cylindre.

La nomenclature définit `D` par le cercle circonscrit au câble. **Ne pas remplacer ce diamètre par le diamètre d’acier équivalent calculé à partir de la section métallique.**

Limite : géométrie complète des éprouvettes, angles exacts, courbes, normalisation intégrale et incertitudes non accessibles. Donc **aucune extraction numérique de `Cd`, `Cl`, `Cm`**. Cette source établit un mécanisme mesuré ; elle n’autorise ni un défaut commun aux constructions `6×19` et `6×36`, ni une borne `Cl=±0,2`.

### 4.4 Textile : analogies disponibles, transfert non validé

[P] Tang et al. [R4], texte intégral, comparent en canal des **panneaux de filets** PA, PE et PES ; diamètres de fils environ `0,00196–0,00447 m`, domaine de petits angles du panneau `0° à 20°`, vitesses d’essai `0,3–1,2 m/s` par pas de `0,1 m/s`. Le montage est aussi essayé jusqu’à environ `31,7°` ; les auteurs signalent des fluctuations au-delà de `20°`, particulièrement aux fortes vitesses. Les coefficients dépendent de Reynolds, de la solidité, des nœuds, du matériau et de la construction. Les tableaux et figures portent sur l’ensemble du panneau, avec interactions entre fils.

**Ce n’est pas une mesure d’une corde kernmantel isolée dans l’air.** Les angles du panneau ne sont pas l’incidence d’un brin unique ; l’aire de référence et l’effet d’abri ne sont pas ceux d’un cylindre isolé. Aucun coefficient de cette étude n’est transféré.

[H] Le transfert eau–air ne devient défendable qu’après examen de la similitude : Reynolds, géométrie relative, rugosité, porosité, rigidité et déformation, état sec/mouillé. Égaler Reynolds seul ne remplace pas ces contrôles.

**Lacune bornée :** aucune campagne directement applicable à une corde textile de tyrolienne isolée, sèche, sous tension, n’a été vérifiée dans ce corpus. Cela ne prouve pas l’absence mondiale de publication. Rejeter à la fois l’affirmation du brut « aucune publication » et sa conséquence injustifiée « proxy accepté `Cd=1,1–1,3` ». Une tresse équilibrée ne suffit pas à démontrer `Cl=Cm=0` à toute incidence et dans tout état.

## 5. Diamètre sous tension : preuves propres à deux constructions

### 5.1 Métallique

[P] Griffith & Bragg [R6], p. 41 imprimée, décrivent les mesures de réduction du diamètre sous charges croissantes pour environ la moitié des éprouvettes de leur campagne de câbles. Micromètre, mesure simultanée de l’allongement et constat de rotation des éprouvettes sous charge. Les auteurs soulignent la variabilité des allongements, même à taille et construction identiques. Les données détaillées sont annoncées dans les tableaux 14–17 ; **leurs cellules, mal extraites par OCR, ne sont pas exploitées numériquement ici**.

Cette preuve ancienne suffit à rejeter « diamètre extérieur nécessairement invariant parce que l’acier est raide ». Elle ne calibre pas un câble moderne, son âme, ses contacts ou ses extrémités. La contraction du câble assemblé ne se calcule pas avec le seul coefficient de Poisson du fil d’acier.

### 5.2 Textile

[P] Sry et al. [R7], pp. 2–4 et 7–9, étudient une tresse **HMPE, huit torons, sans matrice**, fibres IZANAS DB-60, diamètre nominal `0,002 m`, charge minimale de rupture annoncée `1 900 N`. Trois éprouvettes ; cinq cycles jusqu’à `20 %` de cette charge, soit `380 N` ; vitesse de traverse `0,001 m/min`. Diamètre et angle de tresse mesurés par images.

Les auteurs donnent, premier cycle, une diminution de diamètre d’environ **`0,00023 m`** et une variation d’angle d’environ `7°`. Aux cycles 2–5, ces grandeurs varient beaucoup moins. Tableau 4 : évolution de la section enveloppe et de la masse linéique ; analyse distinguant déformation et variation des vides. Ces observations relèvent du rodage de **cette** construction ; pas d’une loi réversible commune au textile. Les résultats détaillés présentés utilisent la première éprouvette, après discussion de la dispersion entre éprouvettes.

**Ne pas convertir `0,00023 m` en correction proportionnelle pour une corde de 10 ou 12 mm, ni pour du PA/PES kernmantel.** Le diamètre nominal n’est pas nécessairement le diamètre initial effectivement mesuré.

### 5.3 Contrat de modèle proposé

[H] Préférer une mesure `d(T, historique, conditionnement)` du produit. Enregistrer protocole, cycles antérieurs, humidité, température, liberté de rotation et méthode optique/mécanique de diamètre. Si le produit s’ovalise, documenter la largeur exposée et l’orientation, plutôt que forcer un unique cercle.

À défaut : diamètre fixé **déclaré**, plage de sensibilité et statut non validé. Ni `d=d_0(1−ν ε)` avec un `ν` choisi, ni `d=d_0/√λ` par « conservation du volume » ne sont établis pour un assemblage poreux.

[D] À vitesse et coefficient figés, `|f_n|` varie linéairement avec `d`, mais le changement de diamètre modifie aussi `Re_n`, donc potentiellement `Cd`. Pour la charge matérielle, intervient en outre le facteur `λ`. Ne pas annoncer « une baisse de diamètre entraîne la même baisse de charge totale » sans préciser ce qui est tenu constant. Un diamètre majoré n’est pas automatiquement une borne de traînée si `Cd` change de régime.

## 6. Deux brins et sillage

[P] Biermann & Herrnstein [R5], pp. 3–7 et figures 6 et 8 : mesures séparées sur cylindres rigides, diamètres `0,0254`, `0,04445`, `0,0635 m`, longueur active `2,4384 m` avec prolongements, vitesse principale `35,7632 m/s`. La figure 4 couvre approximativement `Re=2×10⁴–1,4×10⁵`. La distance est **entre axes**, rapportée au diamètre, et non le jeu entre surfaces.

- Côte à côte : pp. 6–7, interférence de traînée pouvant changer de signe aux faibles espacements ; la source rapporte même des changements d’état à espacement fixé.
- Tandem : p. 7, traînée arrière réduite ; réaction arrière vers l’amont pour un espacement inférieur à environ trois diamètres dans ces essais ; traînée totale inférieure à celle d’un cylindre seul pour des espacements inférieurs à environ `3,5d`.

**Ces distances décrivent les essais, pas une règle universelle d’abri.** Le rapport ne valide ni câbles toronnés souples, ni tresses, ni vents obliques avec espacement changeant sur la portée. Les unités anciennes ont été converties en SI ; aucune valeur de coefficient n’est reprise pour le moteur.

[D] Pour deux brins localement parallèles, comparer leurs positions dans la section normale à leur tangente : si `Δr` relie les axes, `a = Δr−(Δr·t)t`. Décomposer `a` suivant `u_n/|u_n|` et perpendiculairement à cette direction dans la section normale. Ces deux composantes déterminent localement tandem, côte à côte ou décalage ; elles changent avec le vent et la forme. Ce repérage est une dérivation géométrique, pas une loi d’interférence.

[H] Mode exploratoire possible : deux calculs de brins isolés, explicitement marqués **sans interaction aérodynamique**. Ne pas présenter ce choix comme une majoration garantie : les essais côte à côte montrent que l’interférence n’est pas toujours favorable. Une force latérale réelle et un sillage dissymétrique peuvent aussi rompre le partage mécanique supposé.

## 7. Audit du rapport brut et corrections à la note

### 7.1 Erreurs et assertions non établies

| Passage du brut | Verdict de cette revue |
| --- | --- |
| Résumé, §§1.2–1.3 : torons/textile effacent la crise et fixent un plateau universel | Non démontré ; retirer les plages par défaut. [R2] n’a pas été lu intégralement ; [R3] montre une dépendance à la construction. |
| §1.1 : cylindre circulaire toujours `Cl=Cm=0` | Confusion entre symétrie idéale/valeurs moyennes et forces fluctuantes ; ne garantit aucune absence d’excitation. [R3] rappelle un sillage avec détachement tourbillonnaire ; aucune validation dynamique ici. |
| §1.1 : tableau universel de régimes et coefficients | Non validé comme tableau universel. [R1] donne des résultats dépendant du lacet et du dispositif, dont `0,18` pour la traînée de pression supercritique à lacet nul. |
| §1.2 : Macdonald 2010, DOI `10.1016/j.jweia.2010.03.002` | **Attribution bibliographique fausse.** DOI de Shi, Liu & Sung, cylindre carré près d’une paroi [B1]. Les bornes `Cl=±0,2` et `Cm≈0,01` perdent ce support. |
| §1.3 : textile toujours turbulent, `Cl≈Cm≈0`, aucune publication existante | Non établi. Une absence dans une recherche bornée n’est pas une preuve d’absence. Les filets [R4] ne calibrent pas une corde isolée. |
| §1.4 : seul vent normal produit une force ; frottement `Ct≈0,01` négligeable | Hypothèse, pas théorème universel. Valeur et aire de référence de `Ct` non vérifiées. Près du vent axial, la composante normale s’efface : un petit coefficient axial ne suffit pas à prouver une petite erreur relative. |
| §1.4 : `sin²θ` appelé coefficient ajusté selon l’axe du vent | Ambiguïté vectorielle : `sin²θ` pour force normale normalisée par `U²`; projection selon le vent ajoute `sinθ`. |
| §1.4 : validité universelle pour `θ>30°`, sous-estimation systématique en dessous | Aucun domaine ni borne d’erreur primaire vérifié. [R1] réfute une indépendance générale autour du critique. |
| §2.3 : vent strictement transversal crée nécessairement une force verticale sur une ligne à flèche verticale | **Faux pour `t_y=0`.** Contre-exemple exact en §3.3. |
| §2.4 : travers pur moins normal aux ancrages pentus, maximal au milieu | **Faux pour une ligne dans le plan vertical A–B.** De plus, point bas et milieu de portée ne coïncident pas généralement. |
| §2.5 : maille `0,5–1 m` « excellente » | Pas de preuve d’erreur/convergence. Dimensionner le maillage par étude de raffinement, non par ce défaut. |
| §§3–4 : défauts passager, facteurs vêtements/posture, glace et prescription réglementaire | Hors validation de cette mission ; aucune approbation implicite de ces nombres ou prescriptions. |

### 7.2 Changements proposés, sans édition du dépôt

**À §3, conserver les équations et ajouter après la fermeture :**

> La projection normale est une identité géométrique ; la loi quadratique indépendante de la vitesse axiale est une fermeture empirique. Définir `Cd` sur `d ds`, avec diamètre extérieur courant, vitesse normale et domaine expérimental. Bursnall & Loftin, NACA TN 2463, pp. 7–8, montrent l’échec de l’indépendance près et au-dessus du Reynolds critique d’un cylindre lisse incliné. Aucun seuil universel d’incidence de 30° n’est retenu. Distinguer force normale et projection selon le vent ; une composante verticale issue de la projection n’est pas une portance supplémentaire.

**Préciser la phrase « vent uniforme » :**

> Un vent uniforme ne rend pas la force locale uniforme en général. Exception de contrôle : ligne dans le plan vertical A–B, vent strictement transversal, `Cd` et diamètre constants : la charge normale est uniforme par mètre courant et sans composante verticale. Ne pas attribuer à la seule pente verticale une réduction de cette incidence.

**Renforcer les puces acier/textile et diamètre :**

> Nebres et al. (1993), résumé original, observent portance et séparation asymétrique sur modèles toronnés à `Re=5 000–50 000`, sans fournir ici de coefficient exploitable. Les données de filets en eau ne valident pas les cordes isolées en air. La contraction du diamètre est mesurée pour des câbles métalliques (Griffith & Bragg, 1919, p. 41) et une tresse HMPE particulière (Sry et al., 2018, pp. 7–9) ; ni Poisson universel, ni correction proportionnelle transférable. Utiliser données produit et historique, sinon hypothèse de diamètre fixé avec sensibilité.

**Compléter « deux brins » :**

> L’hypothèse de brins aérodynamiquement indépendants doit être distincte de la symétrie de partage des charges. Des essais de cylindres montrent abri en tandem et interférence côte à côte de signe variable ; aucun facteur d’abri ou seuil d’écartement universel n’est adopté. Le calcul indépendant n’est pas garanti conservatif.

**À §7, ajouter aux contrôles :** travers pur sur ligne dans le plan vertical ; invariance à l’inversion de `t` ; normalité `f_n·t=0` ; passage courant/matériel `q_0=λf` ; cas de vent axial identifié comme non validé par la seule fermeture ; comparaison de deux brins indépendants et statut explicite « sillage absent du modèle ». Ces tests contrôlent le code, pas les coefficients.

**À §9, remplacer le constat d’absence de revue spécialisée :** revue indépendante maintenant effectuée ; sources primaires et contre-exemples acquis ; coefficients propres aux lignes et interactions réelles toujours à mesurer/documenter. Ne pas remplacer « lacune » par « aérodynamique validée ».

### 7.3 Données minimales avant adoption d’une loi

Pour chaque construction : produit et diamètre extérieur, constitution/âme/gaine, pas et sens du toronnage ou angle de tresse ; état sec/mouillé/usé ; tension et historique ; définition de l’aire ; Reynolds et angle avec convention ; turbulence et conditions de montage ; forces moyennes normale, axiale et transversale à l’écoulement normal, incertitudes et fluctuations ; espacement et disposition si deux brins.

Aucune valeur par défaut n’est validée par cette revue. Aucun coefficient réglementaire ou facteur de sécurité nouveau n’est proposé.

## 8. Références exactes et accès effectif

Les pages ci-dessous sont imprimées dans les documents, sauf mention « page PDF ». Tous les PDF exploités ont été passés à `pdftotext -layout`. Archives locales : `/tmp/simu-aero-verif/`.

### Sources retenues

**[R1] William J. Bursnall & Laurence K. Loftin Jr. (1951).** *Experimental Investigation of the Pressure Distribution About a Yawed Circular Cylinder in the Critical Reynolds Number Range*. NACA TN 2463.
- Notice : https://ntrs.nasa.gov/citations/19930081739
- PDF lu : https://ntrs.nasa.gov/api/citations/19930081739/downloads/19930081739.pdf
- Consulté : pp. 1–8, résumé, symboles, montage, résultats et conclusions ; renvois aux figures 9–10 dans le texte. Pas de numérisation de courbe. Coefficient de pression/traînée intégré, pas une mesure de frottement axial.
- Fichiers : `bursnall.pdf`, `bursnall.txt`. Pas de DOI revendiqué.

**[R2] Elmar Achenbach (1971).** *Influence of surface roughness on the cross-flow around a circular cylinder*. Journal of Fluid Mechanics 46(2), 321–335. DOI : https://doi.org/10.1017/S0022112071000569
- Page originale consultée : https://www.cambridge.org/core/services/aop-cambridge-core/content/view/S0022112071000569
- **Résumé seulement**, décrivant mesures et dépendances ; aucune équation/figure du corps consultée.
- Lien PDF tenté : https://www.cambridge.org/core/services/aop-cambridge-core/content/view/7C302B7AA32957EEF1AE2E01EDF35D45/S0022112071000569a.pdf/div-class-title-influence-of-surface-roughness-on-the-cross-flow-around-a-circular-cylinder-div.pdf
- Réponse : HTML de la page d’accès, pas un PDF. Le fichier local `achenbach.pdf` est donc **du HTML**, non une preuve d’accès intégral.

**[R3] J. Nebres, S. Batill & R. Nelson (1993).** *Flow about yawed, stranded cables*. Experiments in Fluids 14, 49–58. DOI : https://doi.org/10.1007/BF00196987
- Page originale lue : https://link.springer.com/article/10.1007/BF00196987
- **Résumé et nomenclature seulement.** Domaine Reynolds et mécanisme de portance présents dans le résumé ; `D` défini par le cercle circonscrit dans la nomenclature.
- PDF tenté : https://link.springer.com/content/pdf/10.1007/BF00196987.pdf ; renvoie une page HTML d’abonnement. Ni courbe ni valeur numérique de force du corps utilisées.
- Fichiers : `stranded-page.data`, `stranded-page-clean.txt`.

**[R4] Hao Tang, Fuxiang Hu, Liuxiong Xu, Shijian Dong, Cheng Zhou & Xun Wang (2019).** *Variations in hydrodynamic characteristics of netting panels with various twine materials, knot types, and weave patterns at small attack angles*. Scientific Reports 9, 1923. DOI : https://doi.org/10.1038/s41598-018-35907-1
- Texte intégral : https://pmc.ncbi.nlm.nih.gov/articles/PMC6374460/
- XML original récupéré et lu : https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6374460/fullTextXML
- Consulté : résumé ; Results, effets Reynolds et construction ; Discussion ; Methods, caractéristiques des panneaux, définition des coefficients et vitesses/angles ; tableau 2 et commentaires des figures 4–5, 9–10. Aucun ajustement empirique transposé.
- Fichiers : `tang.xml`, `tang.txt`. Une phrase de Results sur tressé/torsadé est incohérente avec sa conclusion et la Discussion : raison supplémentaire de ne pas en tirer une règle générale de coefficient.

**[R5] David Biermann & William H. Herrnstein Jr. (1933).** *The Interference Between Struts in Various Combinations*. NACA Report 468.
- Notice : https://ntrs.nasa.gov/citations/19930091542
- PDF lu : https://ntrs.nasa.gov/api/citations/19930091542/downloads/19930091542.pdf
- Consulté : pp. 3–7, montage et résultats ; définition de `Cd = D/(q d l)` p. 5 ; figures 4, 6 et 8 et commentaires ; conclusions pp. 10–11. Nombres d’espacement tirés du texte p. 7, pas d’une lecture approximative des courbes.
- Fichiers : `biermann.pdf`, `biermann.txt`. Pas de DOI revendiqué.

**[R6] J. H. Griffith & J. G. Bragg (1919).** *Strength and Other Properties of Wire Rope*. Technologic Papers of the Bureau of Standards, no 121, publié le 16 juillet 1919. DOI : https://doi.org/10.6028/nbst.4090
- PDF obtenu par ce DOI avec `curl -L` : `nist-wire.pdf`, 84 pages ; page de titre vérifiée.
- Consulté : p. 41 imprimée, § « Elongations and reductions in diameters discussed » (page PDF 43), protocole et variabilité ; identification des diamètres nominaux/extérieurs dans le texte antérieur. Tableaux 14–17 non exploités numériquement.
- Une seconde requête Python au même DOI a renvoyé HTTP 403 ; le premier PDF téléchargé et son texte étaient néanmoins accessibles et ont été lus. Ne pas confondre cet incident avec une lecture supposée des tableaux.

**[R7] Vannei Sry, Yoshihiro Mizutani, Gen Endo, Yoshiro Suzuki & Akira Todoroki (2018).** *Estimation of the Longitudinal Elasticity Modulus of Braided Synthetic Fiber Rope Utilizing Classical Laminate Theory with the Unit N/tex*. Applied Sciences 8, 1096. DOI : https://doi.org/10.3390/app8071096
- PDF lu : https://mdpi-res.com/d_attachment/applsci/applsci-08-01096/article_deploy/applsci-08-01096.pdf
- Consulté : pp. 1–10, surtout §2, tableaux 1–2, §4, figures 7–9, tableau 4 ; équations 1–2 pour la distinction enveloppe/vide et §5 pour les hypothèses du modèle. La loi CLT n’est pas adoptée.
- Valeur `0,23 mm` explicitement donnée p. 7 ; montage/cycles pp. 3–4 ; pas de recalage graphique inventé.
- Fichiers : `textile-mech.pdf`, `textile-mech.txt`.

### Deux sources ouvertes puis non retenues comme preuve de diamètre

**[R8] Gina Diana Musca (Anghelache), Carmen Debeleac & Sorin Vlase (2020).** *Experimental Assessments on the Evaluation of Wire Rope Characteristics as Helical Symmetrical Multi-body Ensembles*. Symmetry 12, 1231. DOI : https://doi.org/10.3390/sym12081231
- PDF : https://mdpi-res.com/d_attachment/symmetry/symmetry-12-01231/article_deploy/symmetry-12-01231.pdf
- Consulté : résumé, introduction pp. 1–2, passages concernant diamètre et montage. L’évocation de contraction transverse p. 2 rapporte un modèle d’Argatov cité, pas une mesure propre de diamètre. **Pas utilisée pour prétendre avoir relu Argatov ou pour calibrer `d(T)`.**

**[R9] Ji Zeng et al. (2025).** *Mechanical behavior of synthetic fiber ropes for mooring floating offshore wind turbines*. PLOS ONE. DOI : https://doi.org/10.1371/journal.pone.0318190
- Texte intégral ouvert : https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0318190
- Consulté : résumé, passages de méthode/§4 sur la tresse `1×12`, préchargement, installation et vieillissement, figures 16–23 et commentaires. Allongement/récupération axiale mesurés ; **pas une mesure de diamètre sous tension identifiée dans ces passages**. Pas utilisée comme loi de contraction radiale.

### Contrôle bibliographique du rapport brut

**[B1] Registre Crossref, dépôt du DOI litigieux :** https://api.crossref.org/works/10.1016/j.jweia.2010.03.002
- Notice effectivement récupérée : Liu Liu Shi, Ying Zheng Liu & Hyung Jin Sung (2010), *On the wake with and without vortex shedding suppression behind a two-dimensional square cylinder in proximity to a plane wall*, Journal of Wind Engineering and Industrial Aerodynamics 98(10–11), 492–503.
- Le titre, les auteurs et le DOI ne correspondent pas à « Macdonald, Aerodynamic forces on cables with helical surface features ». Contrôle d’identité bibliographique seulement ; contenu expérimental de Shi et al. non utilisé.

Autres accès infructueux : PDF du *U.S. Navy Wire-Rope Handbook*, volume 2, `https://apps.dtic.mil/sti/pdfs/ADA955309.pdf` : HTML au lieu de PDF ; tentative d’un lien Cordage Institute CI-1500 : pas de document récupéré. Aucune clause, formule ou valeur ne leur est attribuée. Les normes citées dans la note actuelle restent non relues.

## 9. Traçabilité locale et clôture

Documents d’entrée :

```text
Note 6bada50, SHA-256 :
e776e43a28cf296e5c36da2e09cebd8ff95add327c00bbd344e6e5d7cc861106
Rapport brut, SHA-256 :
df1add0860b5f3065f0e533fc7620fe9a4d965114bab630af46a1e2392d11243
```

Copies/extractions : `/tmp/simu-equilibre-spatial-6bada50.md` et `/tmp/simu-aero-verif/`. Les noms terminés `.pdf` ne garantissent pas le type du contenu : les deux faux PDF d’accès éditeur sont signalés ci-dessus. Sources réellement PDF vérifiées avec `file` puis `pdftotext`.

Contrôle du dépôt : HEAD correspond au commit demandé ; état propre constaté avant et après les recherches. Pas d’exécution des suites applicatives : aucune modification de code à valider et pas d’écriture d’artefacts dans le dépôt.

**Conclusion :** fermeture normale exploitable comme hypothèse traçable ; erreurs géométriques et bibliographiques du brut corrigées ; contraction et sillage étayés qualitativement par des essais primaires. **Aucun défaut aérodynamique ligne, aucune loi universelle `d(T)` et aucun facteur d’abri ne sont validés.**
