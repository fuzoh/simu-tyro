# Modèle mathématique et équations pour un logiciel de simulation statique de tyrolienne (zip-line)

## TL;DR
- Le cœur du logiciel doit être la **chaînette élastique d'Irvine** (elastic catenary), résolue par **Newton-Raphson** sur 2 inconnues (les composantes de tension à une extrémité, H₀ et V₀) : c'est le modèle exact qui gère à la fois le poids propre, le dénivelé, l'allongement élastique EA et une charge ponctuelle (par découpage en 2 segments de chaînette). L'approximation parabolique convient uniquement au prototype et reste valable tant que flèche/portée < ~1/8 (12,5 %).
- Paramétrez le logiciel par la **longueur non tendue L₀** (variable d'état fondamentale) : la prétension et la flèche s'en déduisent. Utilisez un module *apparent* pour le câble acier (≈ 60 % de celui du fil, soit ~100–140 GPa selon la construction, bien inférieur à l'acier massif ~200 GPa), et EA plus faible et souvent non-linéaire pour les cordes textiles (polyamide ~2 GPa en fibre mais bien moins en cordage, polyester ~10–20 GPa, Dyneema/HMPE SK75/SK78 ~109–132 GPa en fibre, moins en cordage tressé).
- Structurez le code autour d'un solveur d'équilibre nodal réutilisable (nœuds + éléments de câble avec loi EA) : c'est ce qui permet de passer du **statique** au **dynamique** (déplacement du passager, freinage, oscillations) en ajoutant simplement les termes d'inertie (masses-ressorts / relaxation dynamique) et l'équation du mouvement du chariot le long de la pente locale avec traînée aérodynamique et frottement de poulie.

## Key Findings

1. **Deux familles de modèles.** La chaînette (`y = C·cosh(x/C)`, C = H/q) décrit le câble sous son poids propre ; la parabole décrit un câble sous charge uniformément répartie *horizontalement*. Pour une tyrolienne réelle (câble + passager), le modèle correct est la chaînette élastique par segments.

2. **La charge ponctuelle scinde le câble en deux chaînettes** (ou, si très tendu, deux segments quasi-rectilignes) reliées par des conditions d'équilibre au point de charge. C'est le modèle standard (Irvine 1981).

3. **L'élasticité (EA) est essentielle** dès qu'on paramètre par la longueur de câble ou qu'on compare acier et textile : la longueur tendue s = s₀·(1 + T/EA). Les câbles acier ont un module *apparent* (≈ 60 % de celui du fil constitutif, soit ~100–140 GPa) nettement inférieur à l'acier massif ; les cordes textiles ont des lois souvent non linéaires et sujettes au fluage.

4. **Numériquement**, tout se ramène à résoudre un petit système non linéaire (2 équations transcendantes pour un segment, un peu plus avec charge ponctuelle) par Newton-Raphson — rapide et adapté à l'interactivité. La relaxation dynamique et les masses-ressorts sont les extensions naturelles vers la dynamique.

5. **Sécurité** : la pratique zip-line impose des coefficients de sécurité élevés sur le câble. La pratique documentée (WorkSafe Queensland) demande **un facteur ≥ 5 sur la charge suspendue ET ≥ 3 sur la tension totale du câble, plus un essai de preuve à 2×**, encadrée par EN 15567 (Europe), ANSI/ACCT 03-2019 et ASTM F2959 (USA).

## Details

### 1. Repères, notations et hypothèses

Notations utilisées dans tout le rapport :

| Symbole | Signification | Unité |
|---|---|---|
| L (ou ℓ) | portée horizontale entre ancrages | m |
| h (ou Δz) | dénivelé (hauteur ancrage B – ancrage A) | m |
| L₀, s₀ | longueur **non tendue** (unstretched) du câble | m |
| s, S | longueur **tendue** (arc réel sous charge) | m |
| q, w | poids propre par unité de longueur (= m_lin·g) | N/m |
| m_lin | masse linéique | kg/m |
| H | composante **horizontale** de la tension (constante le long d'un segment sans charge horizontale) | N |
| V, V_A, V_B | composantes verticales de tension aux extrémités | N |
| T(s) | tension totale au point d'abscisse curviligne s | N |
| C = H/q | paramètre de chaînette | m |
| EA | rigidité axiale (E = module d'Young, A = section) | N |
| E | module d'élasticité | Pa |
| A | aire de section | m² |
| f, D | flèche (sag) | m |
| P, Q | charge ponctuelle (poids du passager + chariot) | N |
| x_D | position horizontale de la charge | m |

Hypothèses du modèle statique : câble parfaitement flexible (pas de rigidité en flexion — justifié car la rigidité de flexion d'une corde/câble est faible), matériau élastique linéaire (loi de Hooke), charge dans un plan vertical, ancrages fixes.

### 2. Chaînette classique (câble inextensible sous poids propre)

Équilibre d'un élément de câble → équation différentielle dont la solution est la chaînette :

- **Forme** : `y(x) = C·cosh(x/C)`, avec `C = H/q`.
- **Tension** : la tension totale à une hauteur y vaut `T = q·y` (mesurée depuis la directrice), et croît de façon monotone du point bas vers les ancrages ; elle est **maximale aux ancrages**, minimale (= H) au point bas.
- **Longueur d'arc** (portée symétrique) : `S = 2C·sinh(L/2C)`.
- **Différence de tension entre deux points** : ΔT = q·Δy (la tension augmente linéairement avec la hauteur).

**Cas des ancrages à hauteurs différentes (inclined span).** On ne peut plus supposer le point bas au centre. En notant Δz le dénivelé, l'algorithme (formulation de M. Pewsey / Winkelman, standard des lignes électriques) est :

- Distance horizontale support arrière → point bas :
  `L_b = L/2 − C·asinh( Δz / (2C·sinh(L/2C)) )`
- Longueur d'arc tendue :
  `S = √( (2C·sinh(L/2C))² + Δz² )`
- Flèche à mi-portée (mesurée par rapport à la corde entre ancrages) :
  `D = Δz/2 − C·( cosh((L/2 − L_b)/C) − cosh(L_b/C) )`
- Tension maximale (à l'ancrage le plus haut) :
  `T_max = q·C·cosh( max(L−L_b, L_b)/C )`

Ces quatre équations, avec l'inconnue C (donc H), se résolvent par itération : on impose soit H, soit D, soit T_max, soit L₀, et on itère sur C.

### 3. Approximation parabolique (prototype)

Si la charge est supposée uniformément répartie **par unité de portée horizontale** (bonne approximation quand la flèche est faible), la forme est une parabole :

- **Flèche à mi-portée (ancrages de même hauteur)** : `D = q·L² / (8·H)` ⟺ `H = q·L² / (8·D)`.
- **Ancrages dénivelés** : `y(x) = (q·x²)/(2H) + (h/2)·(2x/L − (x/L)²)` (forme combinant parabole + terme linéaire de dénivelé).
- **Tension max** : `T_max = √(H² + (qL/2)²)`.

**Domaine de validité.** L'écart parabole/chaînette est < 0,5 % pour flèche/portée < ~5 %, et < 1 % jusqu'à ~1/8 (12,5 %). Au-delà, la chaînette exacte s'impose. La parabole **sous-estime** légèrement la flèche réelle. Recommandation : utiliser la parabole pour le dimensionnement initial et l'estimation de départ (initial guess) du solveur, puis basculer sur la chaînette élastique pour le calcul définitif.

### 4. Chaînette élastique (elastic catenary) — le modèle recommandé

C'est la formulation d'Irvine (*Cable Structures*, MIT Press, 1981, p. 16-20), qui incorpore l'allongement de Hooke. On paramètre par la coordonnée curviligne **non tendue** s ∈ [0, L₀]. Les coordonnées d'un point, en fonction des composantes de tension H₀ et V₀ à l'extrémité A, sont :

```
x(s) = (H₀/w)·[ asinh((V₀ + w·s)/H₀) − asinh(V₀/H₀) ] + H₀·s/(EA)

z(s) = (H₀/w)·[ √(1+((V₀+w·s)/H₀)²) − √(1+(V₀/H₀)²) ] + (w·s/EA)·(V₀/w − s/2)
```

avec `H(s) = H₀` (constant) et `V(s) = V₀ + w·s`. La tension locale est `T(s) = √(H₀² + V(s)²)`.

- Le **premier terme** de chaque équation est la chaînette classique (partie géométrique) ; le **second terme** (·/EA) est l'**allongement élastique** de Hooke. Poser EA → ∞ redonne la chaînette inextensible.
- **Conditions aux limites** : on évalue x(L₀) = L et z(L₀) = h (les coordonnées de l'ancrage B). Cela donne **2 équations non linéaires à 2 inconnues (H₀, V₀)** que l'on résout par Newton-Raphson. Une fois (H₀, V₀) connus, on a toute la forme, toutes les tensions, la flèche et les réactions d'ancrage.
- La flèche est obtenue en cherchant le point où V(s) = 0 (tangente horizontale, point bas) : s_bas = −V₀/w, puis on compare z(s_bas) à la corde.

Cette formulation est exactement celle des solveurs de lignes d'amarrage (mooring lines) offshore, dont on peut s'inspirer (voir §9).

### 5. Charge ponctuelle (le passager)

Le passager (poids P) au point d'abscisse horizontale x_D scinde le câble en **deux segments de chaînette** (élastique) : A→charge et charge→B. Chaque segment obéit aux équations du §4 avec sa propre longueur non tendue (L₀₁ et L₀₂, avec L₀₁ + L₀₂ = L₀) et ses propres tensions d'extrémité.

**Conditions à imposer :**
1. **Continuité géométrique** : les deux segments se rejoignent au point de charge (même position (x_D, z_D)).
2. **Équilibre au nœud de charge** : la résultante des tensions des deux segments équilibre la charge P.
   - Horizontal : H₀ est **le même** dans les deux segments (pas de force horizontale extérieure) : H_gauche = H_droite = H.
   - Vertical : `V_droite(au nœud) − V_gauche(au nœud) = P` (saut de la composante verticale égal au poids).
3. **Ancrages fixes** : extrémités A et B aux coordonnées imposées.

**Modèle « câble tendu » simplifié (deux segments rectilignes)** — utile pour prototype quand le poids du câble est négligeable devant P. Le câble forme deux droites (triangle). En notant L₁, L₂ les portées horizontales de part et d'autre (L₁+L₂ = L) et f la flèche sous la charge :
- Réactions verticales : `R₁ = P·L₂/L`, `R₂ = P·L₁/L` (répartition par bras de levier).
- Tension horizontale : `H = P·L₁·L₂ / (L·f)` (au midspan avec L₁=L₂=L/2 : `H = P·L/(4f)`).
- Pour inclure le poids du câble W : ajouter W/2 à P.
- Tensions dans les brins : `T₁ = √(H² + R₁²)`, `T₂ = √(H² + R₂²)`.
- La flèche f et la position sont couplées à l'allongement élastique par : `Eᵢ = Tᵢ·L₀ᵢ/EA = √((L₀ᵢ+ΔLᵢ)² + f²) − L₀ᵢ`, système résolu par Newton-Raphson (formulation « taut cable » : sommer forces horizontales et verticales = 0, plus deux équations d'élongation de Hooke).

**Position verticale du passager en fonction de sa position horizontale** : pour une simulation de trajet, on balaie x_D de 0 à L ; à chaque position, on résout l'équilibre et on lit z_D. La courbe z_D(x_D) est la **trajectoire statique** du passager — exactement ce qu'il faut visualiser (et, plus tard, dériver pour la dynamique). À noter : le point le plus bas de la trajectoire du passager se situe typiquement près de l'ancrage bas, pas au centre.

### 6. Relation longueur non tendue ↔ prétension ↔ flèche : comment paramétrer

C'est le point de conception le plus important pour l'ergonomie du logiciel. Les trois « façons de poser » un câble sont mathématiquement équivalentes mais correspondent à des données d'entrée différentes :

- **Par longueur non tendue L₀** (recommandé comme variable d'état interne). On donne L₀, on résout (H₀,V₀). Physiquement : « j'ai coupé X mètres de câble ». Comme s = s₀(1+T/EA), plus L₀ est proche de la corde √(L²+h²), plus la prétension (et donc la tension) est élevée et la flèche faible.
- **Par tension de pose (prétension) H ou T** : on impose la tension horizontale (ou la tension à un ancrage) et on résout pour L₀ et la flèche. Correspond à « je tends jusqu'à lire N kN au dynamomètre / tendeur ».
- **Par flèche initiale D** (à vide) : on impose D, on déduit H puis L₀. Correspond à « je règle la flèche à vide à tant de cm ».

Le logiciel devrait accepter les trois et **convertir en interne vers L₀**. Le calcul d'installation typique (breveté/Irvine) est : « étant donnés A, B, EA, q, trouver L₀ tel que la tension à l'ancrage vaille T_cible ». Attention : pour un câble textile, EA dépend de l'historique de charge (fluage, mise en place), donc la relation L₀↔tension dérive dans le temps.

**Effet de la prétension.** Un câble tendu « fort » (faible flèche) subit des tensions bien plus élevées sous charge : les triangles de force sont « plats », donc l'amplification vectorielle est forte. Un praticien expérimenté résume ce compromis sur le forum Eng-Tips (« Zipline Design Forces ») : *« I used an initial drape of ~5% (about 10m sag over 180m span). If you string them up really tight … the tension loads are worse because the vector triangles are flatter »* — c'est-à-dire une flèche de départ (drape) de l'ordre de **5 %** de la portée. Règle de terrain zip-line complémentaire : garder une flèche ≥ 2 % de la longueur sous charge maximale.

### 7. Méthodes numériques recommandées

| Méthode | Usage | Recommandation |
|---|---|---|
| **Newton-Raphson** sur (H₀,V₀) | résolution des 2 (ou 4) équations transcendantes de la chaînette élastique | **Choix principal** : rapide, quadratique, idéal pour interactivité temps réel. Fournir la jacobienne analytique (dérivées des équations d'Irvine) pour la robustesse. |
| **Bissection / point fixe** | résolution 1D (C ou H) pour la chaînette simple / parabole | Robuste pour le prototype et pour générer l'estimation initiale de Newton. |
| **Méthode de tir (shooting)** | intègre les ODE du câble depuis A en ajustant (H₀,V₀) pour atteindre B | Alternative élégante au multi-segments ; bien documentée pour les lignes d'amarrage. |
| **Éléments finis de câble (catenary/parabolic elements)** | réseaux, multi-charges, multi-travées | Pour extension : chaque élément a une relation force-déplacement analytique issue de la chaînette élastique. |
| **Relaxation dynamique / masses-ressorts** | form-finding et transition vers la dynamique | Discrétise le câble en masses reliées par ressorts (raideur EA/segment) ; on amortit un pseudo-mouvement jusqu'à l'équilibre. **Pont naturel vers la simulation dynamique.** |

**Estimation initiale** : partir de la solution parabolique `C ≈ √(L³/(24(S−L)))` ou `H ≈ qL²/(8D)`. **Critère de convergence** : |résidu| sur les positions d'ancrage < 1e-3 m. **Pièges** : câble quasi-vertical (H→0) — prévoir un seuil pour basculer sur un modèle vertical ; câble mou (slack) — gérer le contact éventuel avec le sol.

### 8. Valeurs typiques des matériaux

**Câble acier (torons wire rope, ex. 6×19 ou 7×19 IWRC) :**
- Module d'Young de l'acier massif (fil constitutif) : ~200–210 GPa. **Mais** le câble n'a **pas** de module d'Young bien défini : on utilise un **module apparent/effectif**, plus faible (les brins hélicoïdaux se tassent). Costello & Phillips (rapport U.S. Bureau of Mines, « Stress Analysis of Wire Hoist Rope ») établissent que *« the effective modulus for the rope is about 60 percent of the modulus of the wire material »*, soit ~120 GPa apparent pour un fil à ~200 GPa. Les valeurs mesurées/publiées vont de **~104 GPa** (Bridon, 6×19-IWRC) à **~127 GPa** (Costello, mesure expérimentale sur 6×19 Seale IWRC), soit ~50–70 % de l'acier massif. Certains modèles numériques (ProteusDS) retiennent même 70 GPa pour un 6×19 à âme fibre.
- Masse volumique effective ~7850 kg/m³ appliquée à la section métallique réelle (≈ 55–60 % de la section circonscrite).
- Résistance : contrainte de rupture des fils 1570–1960 MPa. Masse linéique : un câble 1" (25,4 mm) 6×19 à âme fibre pèse ≈ 2,5 kg/m (ProteusDS) ; pour les diamètres zip-line courants (12–16 mm), q ≈ 5–11 N/m.
- L'allongement se calcule par ΔL = W·L/(E·A) (loi de Hooke), avec en plus une phase initiale de « constructional stretch » non élastique lors des premières mises en charge.

**Cordes textiles :**
- **Dyneema/HMPE (SK75/SK78)** : d'après la fiche technique Pelican Rope (« Dyneema high-strength high-modulus polyethylene fiber »), module de **fibre** ~**109–132 GPa**, ténacité 3,4–4,0 N/tex (SK78/SK75), allongement à rupture **3–4 %** ; les grades inférieurs (SK60) tombent à ~2,2 N/tex et ~52 GPa. Densité **0,97** (donc *flotte*) — Avient/English Braids précisent *« a tensile strength of 3.6 GPa and specific gravity of 0.97, which makes it lighter than water and 8 times stronger than steel at equivalent weight »*. Très faible fluage (SK78 < SK75). En cordage tressé, le module effectif est inférieur au module fibre. Faible masse linéique — avantage majeur pour réduire q.
- **Polyester (PET)** : module de fibre ~10–20 GPa, rupture 500–800 MPa, densité ~1380 kg/m³, faible fluage — bon compromis stabilité dimensionnelle.
- **Polyamide (nylon)** : module de **fibre** ~2 GPa, mais module **effectif de la corde** encore plus bas (le tressage/toronnage réduit le module d'un facteur important — une corde nylon a un module effectif < 0,6 GPa), rupture ~600 MPa, densité ~1140 kg/m³. Très élastique → grande flèche, absorbe l'énergie (bon pour chocs, mauvais pour tyrolienne rapide).
- Point clé pour le logiciel : pour les textiles, EA n'est **pas** une constante — prévoir soit une courbe contrainte-déformation (polynomiale), soit un module sécant à un % de charge de rupture donné. Distinguer module de fibre et module de cordage.

**Coefficients de sécurité (facteurs de conception) :**
- Pratique documentée (WorkSafe Queensland, alerte « Zip line terminations », basée sur AS 1666.1 / AS 2316.2.1) : *« a safety factor of at least 5 with respect to the maximum permissible suspended load … a safety factor of at least 3 with respect to the maximum rope tension … A minimum proof-test load of twice the rated capacity of a zip line is recommended »*. Autrement dit **≥ 5 sur la charge suspendue** (personnes + matériel), **≥ 3 sur la tension totale du câble** (prétension + charge), avec **essai de preuve (proof test) à 2×**.
- AS 2316.2.1:2016 (parcours acrobatiques, = EN 15567-1:2007 MOD) : *« AS 2316.2.1:2016 specifies a safety factor of 3 but this should be applied to the total combined loading on the zip line cable and not just to the suspended load »*.
- ANSI/ACCT 03-2019 : exige que le système fonctionne dans la limite de charge admissible et impose un **essai de preuve non destructif à 2× la charge attendue** (clause A.3.2.1). Le facteur numérique exact figure dans le texte payant de la norme.
- Le « 10:1 » largement cité provient de sources commerciales secondaires (revendeurs) et n'est **pas** vérifiable dans le texte primaire des normes — à confirmer sur la norme achetée avant citation.
- Charges dynamiques : un rebond du passager peut générer 2 à 4 g, à ajouter au dimensionnement.

**Normes de référence :**
- **EN 15567-1:2015+A1:2020** (Europe) — « Structures de sports et d'activités récréatives – Parcours acrobatiques en hauteur – Partie 1 : exigences de construction et de sécurité » ; renvoie à EN 13411 pour les terminaisons de câble. Partie 2 : exploitation.
- **ANSI/ACCT 03-2019** (USA) — conception, ingénierie, exploitation, inspection.
- **ASTM F2959** (USA) — Aerial Adventure Courses ; renvoie à F2291 (design amusement) ; traite des facteurs de sécurité des câbles structuraux et exige que le freinage soit dimensionné pour le poids/vitesse de conception.
- **ANSI B77.1** (ropeways, contexte voisin) : facteur ≥ 6 sur les câbles en tension, ≥ 4,5 sur les câbles tracteurs.

### 9. Implémentations open source à étudier

- **pycatenary** (Python, PyPI/GitHub) : résout la chaînette avec élasticité (paramètres L, w, EA, ancre, fairlead), gère contact sol et multi-segments. Base directe pour un prototype 2D.
- **MoorPy** (NREL, Python) : modèle quasi-statique de lignes d'amarrage, résout position et tension par équations de chaînette, jacobiennes semi-analytiques, matrices de raideur linéarisées — excellente référence d'architecture pour un solveur d'équilibre.
- **MoorDyn / FAST catenary subroutine** (J. Jonkman) : sous-programme `catenary` de référence, résolution Newton-Raphson.
- **lumped_mass_spring_cable_model** (MATLAB/Simulink, GitHub) : modèle masses-ressorts dynamique, utile pour l'extension dynamique (Runge-Kutta ordre 4).
- Littérature : Irvine, *Cable Structures* (1981) ; Impollonia et al. (2011) pour la chaînette élastique 3D avec charges ponctuelles ; He et al. (2019) pour l'ajustement de longueur non tendue par théorie parabolique ; travaux sur la relaxation dynamique pour le form-finding. Le cas d'école zip-line complet (chaînette + parabole + résistances + freinage) est traité par Nepal Cableways (« Zipline Design Calculation »).

### 10. Feuille de route statique → dynamique

**Architecture logicielle à adopter dès le statique** pour faciliter la dynamique :
- Représenter le câble par des **nœuds** et des **éléments** (même si, en statique exact, un segment = une chaînette analytique). Stocker pour chaque nœud : position, vitesse (=0 en statique), masse. Pour chaque élément : L₀, EA, loi de comportement.
- Isoler un **module « solveur d'équilibre »** (résidu de forces nodales) réutilisable : en statique on cherche résidu=0 ; en dynamique on intègre M·a = F_résidu.
- Traiter le passager comme un **nœud mobile** contraint sur le câble, avec masse et position curviligne σ(t).

**Équations à ajouter pour la dynamique :**
1. **Mouvement du chariot le long du câble** : le long de la tangente locale (pente θ(x) donnée par la trajectoire statique), 
   `m·dv/dt = m·g·sinθ − F_frott − F_traînée`
   avec sinθ = pente locale de la trajectoire du passager.
2. **Traînée aérodynamique** : `F_traînée = ½·ρ·Cw·A·(v ± v_vent)ⁿ` (n=2 aux vitesses usuelles), ρ ≈ 1,225 kg/m³. Cw ≈ 0,6 assis, 0,4 semi-assis, 0,2 allongé ; A ≈ 0,25–0,5 m² selon corpulence/position. C'est le principal facteur limitant la vitesse.
3. **Frottement de poulie/chariot** : `F_frott = µ·ΣG` avec `µ = µ₀·d/D + 2·f/D` (µ₀ ≈ 0,01 friction roulement, d = diam. roulement, D = diam. poulie, f ≈ 0,7 mm bras de levier de roulement). µ résultant ≈ 0,015–0,02.
4. **Force centrifuge** : F_c = m·v²/R où R est le rayon de courbure local ; négligeable (< 2 %) pour les tyroliennes à faible pente mais à inclure pour les lignes très courbes.
5. **Freinage** : force de décélération dimensionnée par G-force cible. `l_freinage = v²/(2·G·g)`. Limite empirique zip-line ≈ 2,5 g (la norme ASTM F2291 autorise jusqu'à 6 g en +X assis, mais le balancement du passager impose plus prudent).
6. **Dynamique du câble lui-même** (oscillations, ballant) : passer au modèle **masses-ressorts** (lumped mass) ou aux **éléments finis de câble dynamiques** : chaque nœud i obéit à 
   `mᵢ·d²rᵢ/dt² = T_élém(rᵢ₊₁−rᵢ) − T_élém(rᵢ−rᵢ₋₁) + mᵢ·g − c·vᵢ`
   avec amortissement c, intégré par Runge-Kutta 4 (pas de temps ≤ 1e-4 s pour la stabilité) ou schéma explicite de relaxation dynamique. Le passager devient un pendule attaché à un nœud mobile.

**Étapes recommandées :**
1. Prototype parabolique 1D (flèche à vide, ancrages même hauteur).
2. Chaînette classique inclined-span (dénivelé).
3. Chaînette élastique d'Irvine (EA) — moteur définitif, paramétrable par L₀/tension/flèche.
4. Charge ponctuelle mobile (2 segments) → trajectoire statique z_D(x_D).
5. Dynamique du chariot (point matériel sur trajectoire figée) : vitesse, traînée, frottement, freinage.
6. Couplage complet : câble masses-ressorts + passager mobile → oscillations, ballant, effets dynamiques transitoires.

## Recommendations

1. **Prototype (semaines 1-2)** : implémentez d'abord la parabole (`D = qL²/8H`) et la chaînette inclined-span (formules §2) avec un solveur 1D (bissection). Validez contre pycatenary et un calcul manuel. Seuil de bascule : si flèche/portée > 8 %, passez à la chaînette.
2. **Moteur définitif (semaines 3-6)** : codez la chaînette élastique d'Irvine (§4) avec Newton-Raphson 2D et jacobienne analytique. Paramétrez en interne par L₀. Ajoutez la charge ponctuelle par 2 segments (§5). Validez le cas EA→∞ contre la chaînette inextensible.
3. **Matériaux** : implémentez une base de données matériaux (acier module apparent ~105 GPa, Dyneema ~109–132 GPa fibre, polyester ~10–20 GPa, polyamide ~2 GPa fibre / <0,6 GPa cordage) avec, pour les textiles, une courbe contrainte-déformation plutôt qu'un EA constant. Exposez les 3 modes de paramétrage (L₀ / tension / flèche).
4. **Sécurité** : affichez systématiquement la tension max aux ancrages et le ratio T_max/T_rupture ; alertez si le facteur tombe sous 5:1 (charge suspendue) / 3:1 (tension totale). Achetez EN 15567-1 et ANSI/ACCT 03-2019 pour figer les seuils normatifs exacts avant tout usage réel.
5. **Architecture** : dès le statique, séparez « géométrie/solveur d'équilibre » de « rendu ». Représentez passager = nœud mobile. Cela conditionne la faisabilité de l'extension dynamique.
6. **Dynamique (phase 2)** : commencez par le point matériel sur trajectoire statique (rapide, suffisant pour vitesse d'arrivée et freinage), puis seulement ensuite le câble masses-ressorts pour les oscillations.

**Seuils qui changent la recommandation :** si vous ne visez que des tyroliennes courtes très tendues (flèche < 2 %) avec charge dominant le poids du câble, le modèle « 2 segments rectilignes élastiques » suffit et évite la chaînette. Inversement, dès qu'un textile à faible module ou une longue portée molle est visé, la chaînette élastique est **obligatoire** (la parabole diverge).

## Caveats

- **Constantes de matériaux** : les valeurs de module (surtout câbles acier et cordages textiles) sont des ordres de grandeur ; le module d'un câble réel dépend de la construction, du toronnage, de l'historique de charge et du fluage. Comme le rappelle Certex, *« to steel wire ropes the E-module is more of a construction constant than a material constant »* — un essai sur échantillon est recommandé pour un calcul de sécurité réel.
- **Facteurs de sécurité** : le « 10:1 » circulant sur les sites commerciaux n'a pas pu être vérifié dans le texte primaire des normes ; la pratique documentée (WorkSafe QLD) donne 5:1 (charge suspendue) + 3:1 (tension totale) + essai 2×. Les textes ANSI/ACCT, ASTM F2959 et EN 15567 sont payants : à consulter directement avant toute application réelle.
- **Textiles non linéaires** : la loi de Hooke linéaire (EA constant) est une simplification pour Dyneema/polyester/nylon, qui présentent non-linéarité, hystérésis et fluage. Pour ces matériaux, le modèle statique donne une tendance, pas une valeur de sécurité.
- **Ce rapport couvre le plan vertical 2D** ; le vent latéral, le ballant 3D du passager et la torsion ne sont abordés qu'en extension dynamique.
- Plusieurs sources numériques proviennent de forums d'ingénierie (Eng-Tips, Physics Forums) ou de blogs de fournisseurs ; elles sont cohérentes entre elles et avec la littérature académique (Irvine, Impollonia, Costello), mais les valeurs précises doivent être recoupées pour un usage critique.