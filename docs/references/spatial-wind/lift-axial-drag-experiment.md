# Portance et traînée axiale de la ligne — expérience numérique (#134)

> **Rapport généré** par `bun experiments/spatial-aero-134/matrix.ts`. Ne pas le modifier à la main : changer les entrées dans `experiments/spatial-aero-134/cases.ts` et relancer la commande.

## 1. Ce que ce rapport est

Une **expérience numérique isolée**, demandée par [#134](https://github.com/fuzoh/simu-tyro/issues/134), sous-issue de #127 : comparer, sur les mêmes cas statiques, la traînée normale seule à l'ajout d'une portance et d'une traînée axiale sur la ligne. Son contrat est `docs/simulation-theory.md` §18, écrit avant le code.

Ce n'est **pas** le moteur de production : rien sous `src/` ne lit le prototype, qui ne remplace aucun solveur. Les coefficients de portance et de traînée axiale sont des **sondes de sensibilité** : ni mesures de produit, ni intervalles réalistes, ni bornes prudentes. Aucun n'est adopté. Ce rapport n'établit ni l'omission définitive d'un effort, ni une validation expérimentale, ni une promesse de sécurité.

## 2. Rejouer

```bash
bun experiments/spatial-aero-134/matrix.ts
```

La commande résout les deux matrices, lance les contrôles, puis écrit ce rapport et, sous `experiments/spatial-aero-134/results/`, `fixed-l0.csv`, `pose-tension.csv`, `controls.csv`, `inputs.csv` et `shapes.csv`. `--check` compare ce qu'elle produirait aux fichiers présents, sans rien écrire. Le mode d'emploi est `experiments/spatial-aero-134/README.md`.

### Modèle, en bref

```
dF/dS = −q₀            dr/dS = λ·t            λ = 1 + T/EA
q₀  = (0, 0, −w) + λ·(f_n + f_L + f_a)
f_n = ½·ρ·C_D⊥·d·|u_n|·u_n                    traînée normale
f_L = ½·ρ·C_L ·d·|u_n|·(t × u_n)              portance, loi « binormale »
f_L = ½·ρ·C_L ·d· u_t ·(t × u_n)              portance, loi « impaire en lacet »
f_a = ½·ρ·C_t ·d·|u_t|·u_t·t                  traînée axiale
```

`u` est la vitesse de l'air par rapport à la ligne, `u_t = u·t`, `u_n = u − u_t·t`, `ρ = 1,225 kg/m³` ; les trois forces sont par mètre de ligne tendue, sur le diamètre déclaré `d`. Le passager est une force ponctuelle prescrite, son poids, identique dans tous les modèles. Directions, signes et méthode numérique : §18.2 à §18.5. Deux points de §18.3 à connaître avant de lire les tableaux :

- **Le signe de `C_L` est une hypothèse d'orientation**, pas une propriété connue : chaque amplitude est jouée avec les deux signes, sous deux lois de dépendance à l'angle de lacet.
- **La traînée axiale suit l'air** : un vent de dos tire la ligne vers B. Les notes archivées du dossier écrivaient le signe opposé ; §18.3 explique la correction, à confirmer par le mainteneur.

## 3. Entrées et provenance

Toutes les entrées sont dans `experiments/spatial-aero-134/cases.ts` ; en changer une et relancer la commande rejoue tout. Les classes de provenance sont celles du brief — mesurée, publiée non transférable, sonde de sensibilité — plus celles des entrées qui ne sont pas des coefficients. **Aucune entrée de cette matrice n'est classée « mesurée »** : une valeur empruntée à un essai fait sur une autre installation est un scénario, et une valeur calculée à partir d'une fiche n'est pas une donnée de la fiche.

### Câble acier 12 mm, 6×19 âme métallique, 1770

Identifiant `acier-12`. Ce que le solveur consomme : `w = 5,3610 N/m`, `EA = 6897,24 kN`, `d = 12 mm`.

| Grandeur | Valeur | Provenance | Source |
| --- | --- | --- | --- |
| diamètre nominal | 12 mm | scénario | ligne de premier lancement de l'application (`src/lib/scenario/first-run.ts`) |
| masse linéique | μ = W·d²/100 = 0,3795 × 144 / 100 = 0,54648 kg/m | dérivée de la référence | §13.1, facteur de masse nominale EN 12385-4 `[STD-ATTESTED]`, milieu de plage |
| raideur axiale | EA = E_app·C·d² = 115 GPa × 0,4165 × 144 mm² = 6,897 MN | dérivée de la référence | §13.1, module apparent et facteur de section, milieux de plage |
| tension de pose | 2 634 N à l'ancrage A, à vide | scénario | ligne de premier lancement (`tp=263.4` daN) |
| brins porteurs | 1 ; le câble porte tout le poids du passager | scénario | ligne de premier lancement |

### Corde Courant Bandit 11 mm, polyamide EN 1891 type A

Identifiant `corde-bandit-11`. Ce que le solveur consomme : `w = 0,7161 N/m`, `EA = 39,37 kN`, `d = 11 mm`.

| Grandeur | Valeur | Provenance | Source |
| --- | --- | --- | --- |
| diamètre | 11 mm | fiche produit | fiche technique Courant du 12/09/2022 (préréglage `src/lib/rail/presets.ts`, #78) |
| masse linéique | 73 g/m | fiche produit | fiche technique Courant du 12/09/2022, confirmée en 2020, 2022 et 2024 |
| charge de rupture | 3 100 daN | fiche produit | fiches datées ; la page produit affiche 3 000 daN |
| raideur axiale | EA = k·MBL = 1,27 × 31 000 N = 39,37 kN | dérivée de la fiche, non confirmée | arithmétique sur l'allongement de la fiche (2,5 % de 50 à 150 kg), pas une donnée Courant ; la page produit dit 3,5 % (§13.2) |
| tension de pose | 1 400 N à l'ancrage A, à vide | scénario | valeur empruntée à l'essai du 2026-11-01 sur cette corde, pose 1,52 → 1,40 kN (`docs/mesures dynamometre/README.md`) ; relevée sur 435 m et transposée ici à 150 m : pas une mesure de cette installation |
| brins porteurs | 2 ; la ligne calculée porte la moitié du poids du passager | convention | §8.1, partage 50/50 `[CONVENTION]`, non validé ; les deux lignes de l'essai du 2026-11-01 |

### Installation

| Grandeur | Valeur | Provenance | Source |
| --- | --- | --- | --- |
| portée | 150 m | scénario | ligne de premier lancement de l'application |
| dénivelé | 0 m ; −18 m | scénario | ancrages de niveau, puis dénivelé de la ligne de premier lancement |
| sol | droit entre les pieds des ancrages, 20 m sous chacun, extrudé latéralement | scénario | hauteur de scénario, choisie pour dégager le gabarit : le rapport dit, à l'état des matrices, si elle y parvient ; extrusion Q16, pas un relevé hors axe |
| gabarit | 2,1 m | convention | §6.3, gabarit vertical entier de l'application, retranché en entier |
| passager | 120 kg, immobile, tenu au chariot au milieu de la longueur non tendue | scénario | masse de premier lancement, non confirmée (§8.1) ; poids seul, aucune prise au vent |
| vent | uniforme et horizontal ; 0, 10 et 20 m/s ; de 90°, 45°, 5° et 175° | scénario | vitesses d'illustration des notes archivées, pas des vents de calcul |

### Coefficients aérodynamiques

| Grandeur | Valeur | Provenance | Source |
| --- | --- | --- | --- |
| C_D⊥ | 1,2 | publiée non transférable | ordre de grandeur du cylindre lisse sous-critique et d'autres câbles toronnés (`production-aerodynamics-followup.md` §4) ; convention adoptée par #127 (Q35), pas une mesure de 6×19 ni de corde sèche |
| C_L | 0 ; ±0,05 ; ±0,2 ; ±0,5 | sonde de sensibilité | choisie pour explorer la réponse ; aucune mesure transférable (§18.4) |
| C_t | 0 ; 0,02 ; 0,1 | sonde de sensibilité | choisie pour explorer la réponse ; aucune mesure exploitable (§18.4) |
| ρ | 1,225 kg/m³ | convention | §12.2, densité au niveau de la mer, celle du moteur sans profil d'altitude |

**Une sonde de sensibilité n'est ni un intervalle réaliste, ni une borne prudente, ni une valeur par défaut.** Un résultat obtenu avec une sonde dit comment l'équilibre répond *si* le coefficient avait cette valeur, et rien sur le fait qu'il l'ait.

### Matrice

| Axe | Valeurs |
| --- | --- |
| Lignes | `acier-12`, `corde-bandit-11` |
| Géométries | `niveau` (ancrages de niveau, 150 m), `incline` (ancrages inclinés, 150 m, B 18 m plus bas) |
| États de charge | `vide` (à vide), `passager` (passager statique de 120 kg au milieu) |
| Vents | `calme`, `travers-10`, `oblique-10`, `quasi-face-10`, `quasi-dos-10`, `travers-20`, `oblique-20`, `quasi-face-20`, `quasi-dos-20` |

Soit 72 cas de base, chacun sous 27 variantes de coefficients : 1944 lignes dans la comparaison principale, 1944 dans la comparaison séparée.

| Modèle | Variantes | Identifiants |
| --- | --- | --- |
| 1. traînée normale seule — la référence | 1 | `N` |
| 2. normale + portance, les deux signes de chaque sonde | 12 | loi binormale : `NL-b+0.05`, `NL-b-0.05`, `NL-b+0.2`, `NL-b-0.2`, `NL-b+0.5`, `NL-b-0.5` ; loi impaire en lacet : `NL-y+0.05`, `NL-y-0.05`, `NL-y+0.2`, `NL-y-0.2`, `NL-y+0.5`, `NL-y-0.5` |
| 3. normale + traînée axiale | 2 | `NA-0.02`, `NA-0.1` |
| 4. normale + portance + axiale, chaque sonde de portance croisée avec chaque sonde axiale | 12 | loi binormale : `NLA-b+0.05-0.02`, `NLA-b+0.05-0.1`, `NLA-b-0.05-0.02`, `NLA-b-0.05-0.1`, `NLA-b+0.2-0.02`, `NLA-b+0.2-0.1`, `NLA-b-0.2-0.02`, `NLA-b-0.2-0.1`, `NLA-b+0.5-0.02`, `NLA-b+0.5-0.1`, `NLA-b-0.5-0.02`, `NLA-b-0.5-0.1` |

La loi impaire en lacet n'est pas recroisée avec la traînée axiale : c'est une sonde d'orientation, et la matrice reste finie.

## 4. Contrôles — avant toute lecture d'un écart

Les tolérances sont celles de `docs/simulation-theory.md` §18.6, **fixées à partir des contrôles seuls, avant de calculer la moindre différence entre deux modèles aérodynamiques**. Chaque ligne des deux comparaisons est résolue deux fois, à 240 puis 480 pas ; la plus fine est rapportée.

| Vérification | Tolérance | Justification |
| --- | --- | --- |
| fermeture aux ancrages | 1,0×10⁻⁶ m | §5.3, celle du moteur |
| bilan global des forces | 1,0×10⁻⁶ N | charges ré-intégrées par Simpson, seconde quadrature de ce que RK4 a intégré ; trois ordres sous le plancher des forces |
| bilan global des moments en A | 1,0×10⁻⁶ N·m par mètre de ligne A–B | la tolérance de force fois son bras de levier |
| saut de force au passager | 1,0×10⁻⁶ N | comme le bilan des forces |
| continuité au passager | 1,0×10⁻⁹ m | le nœud est partagé |
| raffinement, de 240 à 480 pas | 1,0×10⁻⁵ m ; 1,0×10⁻⁴ N | RK4 est d'ordre 4 : l'écart vaut 15/16 de l'erreur du maillage grossier ; pris sur chaque longueur et chaque force rapportée, les deux réactions comme vecteurs |
| retour aux références sans vent | 4,0×10⁻⁶ relatif | palier « scalaires résolus » de `docs/conventions/testing.md` |
| formes closes sans poids | 1,0×10⁻⁸ relatif | elles sont exactes |
| plancher de lecture d'un écart | 1,0×10⁻⁴ m ; 1,0×10⁻³ N | dix fois la tolérance de raffinement |
| référence minimale pour un pourcentage | 0,1 m ; 10 N | en dessous, le pourcentage serait un rapport à presque rien |

### Contrôles du prototype

Chaque valeur attendue vient d'ailleurs que du prototype : fixtures publiées de §15, moteur plan, forme close, symétrie. Un contrôle auquel la matrice ne donne aucun cas, ou dont la ligne n'a pas d'équilibre, est en échec — jamais omis. Le détail, grandeur par grandeur, est dans `results/controls.csv`.

| Contrôle | Valeur attendue tirée de | Grandeurs | Passées | Plus grande part de la tolérance consommée | Passe |
| --- | --- | --- | --- | --- | --- |
| §15 sans vent | fixtures publiées Z1 à Z5 de §15 | 26 | 26 | 92,2 % | oui |
| moteur plan sans vent | `solveSpan`, moteur plan (§4–§6) | 32 | 32 | 11,0 % | oui |
| variantes sans vent | sans vent, toute force aérodynamique est nulle : les modèles coïncident | 16 | 16 | 0 % | oui |
| traînée normale seule | §18.6 contrôle 3 : T constant, L = (2T/p)·asinh(pΣ/2T) | 4 | 4 | 2,0×10⁻³ % | oui |
| portance seule | §18.6 contrôle 4 : arc de cercle R = T/p | 4 | 4 | 5,0×10⁻³ % | oui |
| traînée axiale seule | §18.6 contrôle 5 : T_A − T_B = ½·ρ·C_t·d·\|U\|·U·L | 4 | 4 | 3,4×10⁻³ % | oui |
| charge uniforme | simulation-theory.md §15 Z1, chaînette inclinée de atan(4/3) autour de A–B | 4 | 4 | 73,1 % | oui |
| miroir | §18.6 contrôle 7 : vent traversier et signe de C_L inversés | 4 | 4 | 4,5×10⁻⁵ % | oui |

### État des deux matrices

| Vérification | Obtenu | Tolérance | Passe |
| --- | --- | --- | --- |
| L₀ fixe — lignes | 1944 |  |  |
| L₀ fixe — en échec | 0 | 0 | oui |
| L₀ fixe — pire fermeture aux ancrages | 1,0×10⁻¹⁰ m | 1,0×10⁻⁶ m | oui |
| L₀ fixe — pire bilan des forces | 1,6×10⁻⁹ N | 1,0×10⁻⁶ N | oui |
| L₀ fixe — pire bilan des moments, par mètre de ligne A–B | 8,6×10⁻¹¹ N·m/m | 1,0×10⁻⁶ N·m/m | oui |
| L₀ fixe — pire saut au passager | 0 N | 1,0×10⁻⁶ N | oui |
| L₀ fixe — pire continuité au passager | 0 m | 1,0×10⁻⁹ m | oui |
| L₀ fixe — pire raffinement, longueurs | 4,2×10⁻⁸ m | 1,0×10⁻⁵ m | oui |
| L₀ fixe — pire raffinement, forces | 1,6×10⁻⁹ N | 1,0×10⁻⁴ N | oui |
| Tension de pose — lignes | 1944 |  |  |
| Tension de pose — en échec | 0 | 0 | oui |
| Tension de pose — pire fermeture aux ancrages | 8,9×10⁻¹¹ m | 1,0×10⁻⁶ m | oui |
| Tension de pose — pire bilan des forces | 1,9×10⁻⁹ N | 1,0×10⁻⁶ N | oui |
| Tension de pose — pire bilan des moments, par mètre de ligne A–B | 3,1×10⁻¹⁰ N·m/m | 1,0×10⁻⁶ N·m/m | oui |
| Tension de pose — pire saut au passager | 0 N | 1,0×10⁻⁶ N | oui |
| Tension de pose — pire continuité au passager | 0 m | 1,0×10⁻⁹ m | oui |
| Tension de pose — pire raffinement, longueurs | 4,5×10⁻⁸ m | 1,0×10⁻⁵ m | oui |
| Tension de pose — pire raffinement, forces | 1,9×10⁻⁹ N | 1,0×10⁻⁴ N | oui |

Plus petite garde de toute la matrice : 3,30 m — le gabarit reste au-dessus du sol prescrit dans tous les cas, donc aucune garde lue ici n'est un contact.

Aucun cas en échec : toutes les lignes des deux comparaisons ont un équilibre vérifié.

**Tous les contrôles passent.** Les écarts des sections suivantes sont lus entre deux lignes qui ont chacune passé leurs vérifications, et seulement au-dessus du plancher numérique.

## 5. Charges distribuées

Moyenne du module de chaque force sur la longueur tendue, en N/m, et entre parenthèses sa part du poids propre de la ligne. La part est prise à mètre égal : une force est par mètre de ligne tendue et `w` par mètre de ligne non tendue, donc c'est `λ·|f|` rapporté à `w`, tous deux par mètre non tendu (§18.5) — la moyenne imprimée, multipliée par l'étirement moyen de la ligne, puis divisée par `w`. Cas montré : ancrages inclinés, 150 m, B 18 m plus bas, à vide, à `L₀` fixe ; les maxima aux nœuds et les autres cas sont dans `results/fixed-l0.csv`. Chaque force est proportionnelle à son coefficient : une sonde cinq fois plus petite donne une charge cinq fois plus petite.

### Câble acier 12 mm, 6×19 âme métallique, 1770

Poids propre `w = 5,361 N/m`.

| Vent | \|f_n\|, C_D⊥ = 1,2 | \|f_L\| binormale, sonde C_L = 0,5 | \|f_L\| impaire en lacet, sonde C_L = 0,5 | \|f_a\|, sonde C_t = 0,1 |
| --- | --- | --- | --- | --- |
| 10 m/s de travers (90°) | 0,882 (16,5 %) | 0,367 (6,9 %) | 0,005 (0,1 %) | 0,000 (0,0 %) |
| 10 m/s oblique de face (45°) | 0,451 (8,4 %) | 0,188 (3,5 %) | 0,184 (3,4 %) | 0,036 (0,7 %) |
| 10 m/s presque de face (5°) | 0,026 (0,5 %) | 0,011 (0,2 %) | 0,058 (1,1 %) | 0,071 (1,3 %) |
| 10 m/s presque de dos (175°) | 0,026 (0,5 %) | 0,011 (0,2 %) | 0,058 (1,1 %) | 0,071 (1,3 %) |
| 20 m/s de travers (90°) | 3,519 (65,7 %) | 1,465 (27,3 %) | 0,064 (1,2 %) | 0,001 (0,0 %) |
| 20 m/s oblique de face (45°) | 1,801 (33,6 %) | 0,750 (14,0 %) | 0,733 (13,7 %) | 0,144 (2,7 %) |
| 20 m/s presque de face (5°) | 0,104 (1,9 %) | 0,044 (0,8 %) | 0,231 (4,3 %) | 0,285 (5,3 %) |
| 20 m/s presque de dos (175°) | 0,104 (1,9 %) | 0,043 (0,8 %) | 0,230 (4,3 %) | 0,285 (5,3 %) |

### Corde Courant Bandit 11 mm, polyamide EN 1891 type A

Poids propre `w = 0,716 N/m`.

| Vent | \|f_n\|, C_D⊥ = 1,2 | \|f_L\| binormale, sonde C_L = 0,5 | \|f_L\| impaire en lacet, sonde C_L = 0,5 | \|f_a\|, sonde C_t = 0,1 |
| --- | --- | --- | --- | --- |
| 10 m/s de travers (90°) | 0,808 (116,9 %) | 0,337 (48,7 %) | 0,007 (1,1 %) | 0,000 (0,0 %) |
| 10 m/s oblique de face (45°) | 0,410 (59,3 %) | 0,171 (24,7 %) | 0,168 (24,3 %) | 0,033 (4,8 %) |
| 10 m/s presque de face (5°) | 0,018 (2,6 %) | 0,007 (1,1 %) | 0,049 (7,1 %) | 0,066 (9,5 %) |
| 10 m/s presque de dos (175°) | 0,018 (2,6 %) | 0,007 (1,1 %) | 0,049 (7,1 %) | 0,066 (9,5 %) |
| 20 m/s de travers (90°) | 3,208 (465,6 %) | 1,337 (194,0 %) | 0,105 (15,2 %) | 0,002 (0,3 %) |
| 20 m/s oblique de face (45°) | 1,640 (237,5 %) | 0,683 (98,9 %) | 0,670 (97,1 %) | 0,133 (19,2 %) |
| 20 m/s presque de face (5°) | 0,072 (10,4 %) | 0,030 (4,3 %) | 0,198 (28,6 %) | 0,264 (38,1 %) |
| 20 m/s presque de dos (175°) | 0,071 (10,3 %) | 0,030 (4,3 %) | 0,196 (28,4 %) | 0,264 (38,1 %) |

La traînée normale est nulle quand le vent est parallèle à la ligne, et c'est là que la traînée axiale est la plus grande : près d'un vent parallèle, le rapport d'une force ajoutée à la traînée normale n'a pas de borne, alors que sa valeur absolue reste celle de la sonde.

## 6. Comparaison principale — longueur non tendue identique

**Même installation, mêmes ancrages, mêmes autres entrées : seule la force ajoutée change d'une colonne à l'autre.** Pour chaque ligne et chaque géométrie, `L₀` est résolue une fois, par le moteur, sans vent, depuis la tension de pose à l'ancrage A ; elle est ensuite la même pour tous les vents, tous les états de charge et toutes les variantes. Aucune longueur n'est recalculée.

| Ligne | Géométrie | Tension de pose sans vent (N) | L₀ (m) |
| --- | --- | --- | --- |
| acier-12 | niveau | 2634 | 150,539751 |
| acier-12 | incline | 2634 | 151,644243 |
| corde-bandit-11 | niveau | 1400 | 144,884615 |
| corde-bandit-11 | incline | 1400 | 145,946659 |

### Résultats de référence — traînée normale seule

| Ligne | Géométrie | Charge | Vent | L₀ (m) | T_A (N) | T_max (N) | Flèche (m) | Déport latéral (m) | Écart maximal à A–B (m) | Garde (m) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| acier-12 | niveau | vide | calme | 150,5398 | 2634,0 | 2634,0 | 5,802 | 0,000 | 5,802 | 12,098 |
| acier-12 | niveau | vide | travers-10 | 150,5398 | 2667,2 | 2667,2 | 5,728 | 0,943 | 5,805 | 12,172 |
| acier-12 | niveau | vide | oblique-10 | 150,5398 | 2642,4 | 2642,4 | 5,783 | 0,477 | 5,803 | 12,117 |
| acier-12 | niveau | vide | quasi-face-10 | 150,5398 | 2634,0 | 2634,0 | 5,802 | 0,009 | 5,802 | 12,098 |
| acier-12 | niveau | vide | quasi-dos-10 | 150,5398 | 2634,0 | 2634,0 | 5,802 | 0,009 | 5,802 | 12,098 |
| acier-12 | niveau | vide | travers-20 | 150,5398 | 3116,7 | 3116,7 | 4,889 | 3,217 | 5,853 | 13,011 |
| acier-12 | niveau | vide | oblique-20 | 150,5398 | 2765,4 | 2765,4 | 5,523 | 1,820 | 5,815 | 12,377 |
| acier-12 | niveau | vide | quasi-face-20 | 150,5398 | 2634,1 | 2634,1 | 5,802 | 0,035 | 5,802 | 12,098 |
| acier-12 | niveau | vide | quasi-dos-20 | 150,5398 | 2634,1 | 2634,1 | 5,802 | 0,035 | 5,802 | 12,098 |
| acier-12 | niveau | passager | calme | 150,5398 | 8210,3 | 8210,3 | 7,272 | 0,000 | 7,272 | 10,628 |
| acier-12 | niveau | passager | travers-10 | 150,5398 | 8218,6 | 8218,6 | 7,264 | 0,305 | 7,271 | 10,636 |
| acier-12 | niveau | passager | oblique-10 | 150,5398 | 8212,3 | 8212,5 | 7,270 | 0,153 | 7,271 | 10,630 |
| acier-12 | niveau | passager | quasi-face-10 | 150,5398 | 8210,2 | 8210,3 | 7,272 | 0,003 | 7,272 | 10,628 |
| acier-12 | niveau | passager | quasi-dos-10 | 150,5398 | 8210,3 | 8210,3 | 7,272 | 0,003 | 7,272 | 10,628 |
| acier-12 | niveau | passager | travers-20 | 150,5398 | 8341,6 | 8341,6 | 7,156 | 1,203 | 7,256 | 10,744 |
| acier-12 | niveau | passager | oblique-20 | 150,5398 | 8243,5 | 8244,3 | 7,242 | 0,611 | 7,267 | 10,658 |
| acier-12 | niveau | passager | quasi-face-20 | 150,5398 | 8210,2 | 8210,4 | 7,272 | 0,013 | 7,272 | 10,628 |
| acier-12 | niveau | passager | quasi-dos-20 | 150,5398 | 8210,4 | 8210,4 | 7,272 | 0,013 | 7,272 | 10,628 |
| acier-12 | incline | vide | calme | 151,6442 | 2634,0 | 2634,0 | 5,999 | 0,000 | 5,999 | 11,901 |
| acier-12 | incline | vide | travers-10 | 151,6442 | 2667,1 | 2667,1 | 5,922 | 0,975 | 6,001 | 11,978 |
| acier-12 | incline | vide | oblique-10 | 151,6442 | 2666,9 | 2666,9 | 5,982 | 0,492 | 6,002 | 11,918 |
| acier-12 | incline | vide | quasi-face-10 | 151,6442 | 2642,8 | 2642,8 | 5,999 | 0,013 | 5,999 | 11,901 |
| acier-12 | incline | vide | quasi-dos-10 | 151,6442 | 2625,2 | 2625,2 | 5,999 | 0,013 | 5,999 | 11,901 |
| acier-12 | incline | vide | travers-20 | 151,6442 | 3115,0 | 3115,0 | 5,043 | 3,318 | 6,037 | 12,857 |
| acier-12 | incline | vide | oblique-20 | 151,6442 | 2859,1 | 2859,1 | 5,733 | 1,829 | 6,018 | 12,167 |
| acier-12 | incline | vide | quasi-face-20 | 151,6442 | 2669,3 | 2669,3 | 6,000 | 0,053 | 6,000 | 11,900 |
| acier-12 | incline | vide | quasi-dos-20 | 151,6442 | 2598,8 | 2598,8 | 5,998 | 0,054 | 5,998 | 11,902 |
| acier-12 | incline | passager | calme | 151,6442 | 8172,2 | 8172,2 | 7,482 | 0,000 | 7,482 | 10,418 |
| acier-12 | incline | passager | travers-10 | 151,6442 | 8180,5 | 8180,5 | 7,474 | 0,316 | 7,481 | 10,426 |
| acier-12 | incline | passager | oblique-10 | 151,6442 | 8193,7 | 8193,7 | 7,481 | 0,159 | 7,483 | 10,419 |
| acier-12 | incline | passager | quasi-face-10 | 151,6442 | 8180,1 | 8180,1 | 7,483 | 0,004 | 7,483 | 10,417 |
| acier-12 | incline | passager | quasi-dos-10 | 151,6442 | 8164,2 | 8164,2 | 7,482 | 0,005 | 7,482 | 10,418 |
| acier-12 | incline | passager | travers-20 | 151,6442 | 8304,8 | 8304,8 | 7,359 | 1,244 | 7,464 | 10,541 |
| acier-12 | incline | passager | oblique-20 | 151,6442 | 8283,9 | 8283,9 | 7,455 | 0,630 | 7,481 | 10,445 |
| acier-12 | incline | passager | quasi-face-20 | 151,6442 | 8204,0 | 8204,0 | 7,484 | 0,018 | 7,484 | 10,416 |
| acier-12 | incline | passager | quasi-dos-20 | 151,6442 | 8140,3 | 8140,3 | 7,481 | 0,018 | 7,481 | 10,419 |
| corde-bandit-11 | niveau | vide | calme | 144,8846 | 1400,0 | 1400,0 | 1,390 | 0,000 | 1,390 | 16,510 |
| corde-bandit-11 | niveau | vide | travers-10 | 144,8846 | 1412,4 | 1412,4 | 1,378 | 1,612 | 2,120 | 16,522 |
| corde-bandit-11 | niveau | vide | oblique-10 | 144,8846 | 1403,1 | 1403,1 | 1,387 | 0,811 | 1,607 | 16,513 |
| corde-bandit-11 | niveau | vide | quasi-face-10 | 144,8846 | 1400,0 | 1400,0 | 1,390 | 0,013 | 1,390 | 16,510 |
| corde-bandit-11 | niveau | vide | quasi-dos-10 | 144,8846 | 1400,0 | 1400,0 | 1,390 | 0,013 | 1,390 | 16,510 |
| corde-bandit-11 | niveau | vide | travers-20 | 144,8846 | 1562,2 | 1562,2 | 1,246 | 5,838 | 5,969 | 16,654 |
| corde-bandit-11 | niveau | vide | oblique-20 | 144,8846 | 1447,2 | 1447,2 | 1,346 | 3,146 | 3,422 | 16,554 |
| corde-bandit-11 | niveau | vide | quasi-face-20 | 144,8846 | 1400,0 | 1400,0 | 1,390 | 0,050 | 1,391 | 16,510 |
| corde-bandit-11 | niveau | vide | quasi-dos-20 | 144,8846 | 1400,0 | 1400,0 | 1,390 | 0,050 | 1,391 | 16,510 |
| corde-bandit-11 | niveau | passager | calme | 144,8846 | 1955,8 | 1955,8 | 12,477 | 0,000 | 12,477 | 5,423 |
| corde-bandit-11 | niveau | passager | travers-10 | 144,8846 | 1960,0 | 1960,0 | 12,449 | 1,194 | 12,506 | 5,451 |
| corde-bandit-11 | niveau | passager | oblique-10 | 144,8846 | 1956,5 | 1957,3 | 12,470 | 0,606 | 12,485 | 5,430 |
| corde-bandit-11 | niveau | passager | quasi-face-10 | 144,8846 | 1955,6 | 1955,9 | 12,477 | 0,019 | 12,477 | 5,423 |
| corde-bandit-11 | niveau | passager | quasi-dos-10 | 144,8846 | 1955,9 | 1955,9 | 12,477 | 0,019 | 12,477 | 5,423 |
| corde-bandit-11 | niveau | passager | travers-20 | 144,8846 | 2021,0 | 2021,0 | 12,061 | 4,629 | 12,919 | 5,839 |
| corde-bandit-11 | niveau | passager | oblique-20 | 144,8846 | 1972,0 | 1975,0 | 12,365 | 2,401 | 12,596 | 5,535 |
| corde-bandit-11 | niveau | passager | quasi-face-20 | 144,8846 | 1955,2 | 1956,3 | 12,476 | 0,076 | 12,477 | 5,424 |
| corde-bandit-11 | niveau | passager | quasi-dos-20 | 144,8846 | 1956,3 | 1956,3 | 12,476 | 0,076 | 12,477 | 5,424 |
| corde-bandit-11 | incline | vide | calme | 145,9467 | 1400,0 | 1400,0 | 1,417 | 0,000 | 1,417 | 16,483 |
| corde-bandit-11 | incline | vide | travers-10 | 145,9467 | 1412,6 | 1412,6 | 1,404 | 1,642 | 2,160 | 16,496 |
| corde-bandit-11 | incline | vide | oblique-10 | 145,9467 | 1404,6 | 1404,6 | 1,512 | 0,831 | 1,726 | 16,388 |
| corde-bandit-11 | incline | vide | quasi-face-10 | 145,9467 | 1400,4 | 1400,4 | 1,446 | 0,021 | 1,446 | 16,454 |
| corde-bandit-11 | incline | vide | quasi-dos-10 | 145,9467 | 1399,6 | 1399,6 | 1,388 | 0,021 | 1,388 | 16,512 |
| corde-bandit-11 | incline | vide | travers-20 | 145,9467 | 1565,2 | 1565,2 | 1,267 | 5,934 | 6,068 | 16,633 |
| corde-bandit-11 | incline | vide | oblique-20 | 145,9467 | 1454,3 | 1454,3 | 1,751 | 3,212 | 3,658 | 16,149 |
| corde-bandit-11 | incline | vide | quasi-face-20 | 145,9467 | 1401,7 | 1401,7 | 1,533 | 0,085 | 1,536 | 16,367 |
| corde-bandit-11 | incline | vide | quasi-dos-20 | 145,9467 | 1398,5 | 1398,5 | 1,300 | 0,085 | 1,303 | 16,600 |
| corde-bandit-11 | incline | passager | calme | 145,9467 | 1988,7 | 1988,7 | 12,630 | 0,000 | 12,630 | 5,270 |
| corde-bandit-11 | incline | passager | travers-10 | 145,9467 | 1993,1 | 1993,1 | 12,601 | 1,217 | 12,659 | 5,299 |
| corde-bandit-11 | incline | passager | oblique-10 | 145,9467 | 1993,9 | 1993,9 | 12,670 | 0,620 | 12,685 | 5,230 |
| corde-bandit-11 | incline | passager | quasi-face-10 | 145,9467 | 1991,2 | 1991,2 | 12,659 | 0,021 | 12,659 | 5,241 |
| corde-bandit-11 | incline | passager | quasi-dos-10 | 145,9467 | 1986,2 | 1986,2 | 12,601 | 0,021 | 12,601 | 5,299 |
| corde-bandit-11 | incline | passager | travers-20 | 145,9467 | 2055,4 | 2055,4 | 12,199 | 4,713 | 13,077 | 5,701 |
| corde-bandit-11 | incline | passager | oblique-20 | 145,9467 | 2022,5 | 2022,5 | 12,703 | 2,440 | 12,935 | 5,197 |
| corde-bandit-11 | incline | passager | quasi-face-20 | 145,9467 | 1998,7 | 1998,7 | 12,745 | 0,085 | 12,746 | 5,155 |
| corde-bandit-11 | incline | passager | quasi-dos-20 | 145,9467 | 1978,9 | 1978,9 | 12,512 | 0,085 | 12,512 | 5,388 |

Le déport latéral est signé : positif vers la gauche du sens A → B, donc sous un vent venant de la droite. L'écart maximal à A–B combine, à chaque abscisse, le décalage vertical et le décalage latéral, puis prend le maximum. La garde est verticale, sur le profil extrudé latéralement, gabarit entier retranché : ce n'est pas une garde au sol réel hors de l'axe.

### Écarts par taille de sonde

Chaque cellule est l'écart au modèle de référence — traînée normale seule, même cas, même convention — **de plus grande valeur absolue** parmi les cas regroupés, avec son signe ; le pourcentage est celui de ce même cas, et n'est donné que si la référence est assez loin de zéro. « < plancher » : aucun écart du groupe ne dépasse le plancher numérique ; « — » : le groupe ne contient aucune ligne. Le déport latéral de référence est nul ou presque par vent presque parallèle : son écart est alors donné en mètres seuls. Les écarts de réaction sont la norme de la différence des vecteurs : une réaction qui tourne sans grandir s'y voit. « Remontée max. » n'est pas un écart : c'est la plus grande hauteur atteinte **au-dessus** de la ligne A–B dans le groupe — la flèche, elle, ne descend pas sous zéro, et une ligne soulevée au-dessus de A–B a une flèche nulle ; « aucune » : aucune ligne du groupe ne remonte au-dessus de la ligne A–B, au plancher numérique près. Dans toutes les lignes résolues ici, la garde vaut 17,9 m moins la flèche — le sol prescrit est parallèle à A–B : `Δgarde = −Δflèche`, et la colonne de la garde répète celle de la flèche au signe près. Son pourcentage n'est pas imprimé : il serait la part d'une garde que fixe la hauteur d'ancrage du scénario, et changerait avec elle ; il reste dans les fichiers CSV. Regroupés ici : toutes les géométries, toutes les directions de vent et les deux signes de portance.

#### Câble acier 12 mm, 6×19 âme métallique, 1770

| Sonde | Vent | Charge | ΔT_max (N) | Δflèche (m) | Δdéport latéral (m) | Δécart maximal à A–B (m) | Δgarde (m) | ‖ΔR_A‖ (N) | ‖ΔR_B‖ (N) | Remontée max. (m) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| portance binormale, C_L = ±0,05 | 10 m/s | vide | −16,9 (−0,6 %) | −0,003 (< 0,1 %) | +0,006 (+0,6 %) | −0,002 (< 0,1 %) | +0,003 | 16,9 (0,6 %) | 16,9 (0,6 %) | aucune |
| portance binormale, C_L = ±0,05 | 10 m/s | passager | −13,5 (−0,2 %) | −0,001 (< 0,1 %) | +0,001 (+0,6 %) | −0,001 (< 0,1 %) | +0,001 | 13,5 (0,2 %) | 13,5 (0,2 %) | aucune |
| portance binormale, C_L = ±0,05 | 20 m/s | vide | +56,6 (+1,8 %) | −0,048 (−1,0 %) | +0,061 (+1,8 %) | +0,006 (+0,1 %) | +0,048 | 56,9 (1,8 %) | 56,9 (1,8 %) | aucune |
| portance binormale, C_L = ±0,05 | 20 m/s | passager | +52,9 (+0,6 %) | −0,005 (−0,1 %) | +0,008 (+0,6 %) | −0,003 (< 0,1 %) | +0,005 | 53,2 (0,6 %) | 53,2 (0,6 %) | aucune |
| portance binormale, C_L = ±0,2 | 10 m/s | vide | −67,6 (−2,5 %) | −0,011 (−0,2 %) | +0,026 (+2,6 %) | −0,007 (−0,1 %) | +0,011 | 67,6 (2,5 %) | 67,6 (2,5 %) | aucune |
| portance binormale, C_L = ±0,2 | 10 m/s | passager | −54,0 (−0,7 %) | −0,003 (< 0,1 %) | +0,004 (+2,3 %) | −0,003 (< 0,1 %) | +0,003 | 54,2 (0,7 %) | 54,2 (0,7 %) | aucune |
| portance binormale, C_L = ±0,2 | 20 m/s | vide | +228,4 (+7,3 %) | −0,209 (−4,1 %) | +0,256 (+7,7 %) | +0,025 (+0,4 %) | +0,209 | 229,6 (7,4 %) | 229,6 (7,4 %) | aucune |
| portance binormale, C_L = ±0,2 | 20 m/s | passager | +211,8 (+2,5 %) | −0,019 (−0,3 %) | +0,033 (+2,6 %) | −0,013 (−0,2 %) | +0,019 | 212,7 (2,6 %) | 212,7 (2,6 %) | aucune |
| portance binormale, C_L = ±0,5 | 10 m/s | vide | −169,1 (−6,3 %) | −0,029 (−0,5 %) | +0,067 (+6,9 %) | −0,018 (−0,3 %) | +0,029 | 169,2 (6,3 %) | 169,2 (6,3 %) | aucune |
| portance binormale, C_L = ±0,5 | 10 m/s | passager | −135,0 (−1,6 %) | −0,007 (−0,1 %) | +0,009 (+5,9 %) | −0,007 (−0,1 %) | +0,007 | 135,5 (1,6 %) | 135,5 (1,6 %) | aucune |
| portance binormale, C_L = ±0,5 | 20 m/s | vide | +578,4 (+18,6 %) | −0,619 (−12,3 %) | +0,698 (+21,0 %) | +0,063 (+1,0 %) | +0,619 | 581,0 (18,6 %) | 581,0 (18,6 %) | aucune |
| portance binormale, C_L = ±0,5 | 20 m/s | passager | +529,5 (+6,3 %) | −0,049 (−0,7 %) | +0,086 (+6,9 %) | −0,034 (−0,5 %) | +0,049 | 531,7 (6,4 %) | 531,7 (6,4 %) | aucune |
| portance impaire en lacet, C_L = ±0,05 | 10 m/s | vide | −8,5 (−0,3 %) | −0,001 (< 0,1 %) | +0,005 | −0,001 (< 0,1 %) | +0,001 | 8,5 (0,3 %) | 8,5 (0,3 %) | aucune |
| portance impaire en lacet, C_L = ±0,05 | 10 m/s | passager | −6,7 (−0,1 %) | −3,6×10⁻⁴ (< 0,1 %) | +0,002 | −3,5×10⁻⁴ (< 0,1 %) | 3,6×10⁻⁴ | 6,8 (0,1 %) | 6,8 (0,1 %) | aucune |
| portance impaire en lacet, C_L = ±0,05 | 20 m/s | vide | +32,3 (+1,2 %) | −0,013 (−0,2 %) | +0,029 (+1,6 %) | −0,003 (−0,1 %) | +0,013 | 32,4 (1,2 %) | 32,4 (1,2 %) | aucune |
| portance impaire en lacet, C_L = ±0,05 | 20 m/s | passager | −26,8 (−0,3 %) | −0,002 (< 0,1 %) | +0,007 | −0,001 (< 0,1 %) | +0,002 | 26,9 (0,3 %) | 26,9 (0,3 %) | aucune |
| portance impaire en lacet, C_L = ±0,2 | 10 m/s | vide | −34,1 (−1,3 %) | −0,005 (−0,1 %) | −0,020 | −0,004 (−0,1 %) | +0,005 | 34,1 (1,3 %) | 34,1 (1,3 %) | aucune |
| portance impaire en lacet, C_L = ±0,2 | 10 m/s | passager | −26,9 (−0,3 %) | −0,001 (< 0,1 %) | −0,007 | −0,001 (< 0,1 %) | +0,001 | 27,0 (0,3 %) | 27,0 (0,3 %) | aucune |
| portance impaire en lacet, C_L = ±0,2 | 20 m/s | vide | +129,4 (+4,7 %) | −0,054 (−0,9 %) | +0,120 (+6,5 %) | −0,014 (−0,2 %) | +0,054 | 129,6 (4,7 %) | 129,5 (4,7 %) | aucune |
| portance impaire en lacet, C_L = ±0,2 | 20 m/s | passager | −107,1 (−1,3 %) | −0,007 (−0,1 %) | −0,027 | −0,006 (−0,1 %) | +0,007 | 107,6 (1,3 %) | 107,5 (1,3 %) | aucune |
| portance impaire en lacet, C_L = ±0,5 | 10 m/s | vide | −85,2 (−3,2 %) | −0,012 (−0,2 %) | −0,050 | −0,009 (−0,2 %) | +0,012 | 85,2 (3,2 %) | 85,2 (3,2 %) | aucune |
| portance impaire en lacet, C_L = ±0,5 | 10 m/s | passager | −67,3 (−0,8 %) | −0,004 (< 0,1 %) | −0,017 | −0,004 (< 0,1 %) | +0,004 | 67,5 (0,8 %) | 67,5 (0,8 %) | aucune |
| portance impaire en lacet, C_L = ±0,5 | 20 m/s | vide | +323,5 (+11,7 %) | −0,148 (−2,6 %) | +0,319 (+17,4 %) | −0,035 (−0,6 %) | +0,148 | 324,1 (11,7 %) | 323,8 (11,7 %) | aucune |
| portance impaire en lacet, C_L = ±0,5 | 20 m/s | passager | −267,8 (−3,2 %) | −0,019 (−0,3 %) | −0,067 | −0,015 (−0,2 %) | +0,019 | 268,9 (3,3 %) | 268,8 (3,3 %) | aucune |
| traînée axiale, C_t = 0,02 | 10 m/s | vide | +1,1 (< 0,1 %) | < plancher | < plancher | < plancher | < plancher | 1,1 (< 0,1 %) | 1,1 (< 0,1 %) | aucune |
| traînée axiale, C_t = 0,02 | 10 m/s | passager | +1,1 (< 0,1 %) | < plancher | < plancher | < plancher | < plancher | 1,1 (< 0,1 %) | 1,1 (< 0,1 %) | aucune |
| traînée axiale, C_t = 0,02 | 20 m/s | vide | +4,4 (+0,2 %) | < plancher | < plancher | < plancher | < plancher | 4,4 (0,2 %) | 4,4 (0,2 %) | aucune |
| traînée axiale, C_t = 0,02 | 20 m/s | passager | +4,4 (+0,1 %) | < plancher | < plancher | < plancher | < plancher | 4,4 (0,1 %) | 4,4 (0,1 %) | aucune |
| traînée axiale, C_t = 0,1 | 10 m/s | vide | +5,5 (+0,2 %) | < plancher | < plancher | < plancher | < plancher | 5,5 (0,2 %) | 5,5 (0,2 %) | aucune |
| traînée axiale, C_t = 0,1 | 10 m/s | passager | +5,4 (+0,1 %) | < plancher | < plancher | < plancher | < plancher | 5,4 (0,1 %) | 5,5 (0,1 %) | aucune |
| traînée axiale, C_t = 0,1 | 20 m/s | vide | +21,9 (+0,8 %) | −2,3×10⁻⁴ (< 0,1 %) | < plancher | −2,3×10⁻⁴ (< 0,1 %) | 2,3×10⁻⁴ | 21,9 (0,8 %) | 21,9 (0,8 %) | aucune |
| traînée axiale, C_t = 0,1 | 20 m/s | passager | +21,8 (+0,3 %) | < plancher | < plancher | < plancher | < plancher | 21,8 (0,3 %) | 22,1 (0,3 %) | aucune |
| portance binormale ±0,5 et axiale 0,1 | 10 m/s | vide | −169,1 (−6,3 %) | −0,029 (−0,5 %) | +0,067 (+6,9 %) | −0,018 (−0,3 %) | +0,029 | 169,2 (6,3 %) | 169,2 (6,3 %) | aucune |
| portance binormale ±0,5 et axiale 0,1 | 10 m/s | passager | −135,0 (−1,6 %) | −0,007 (−0,1 %) | +0,009 (+5,9 %) | −0,007 (−0,1 %) | +0,007 | 135,5 (1,6 %) | 135,5 (1,6 %) | aucune |
| portance binormale ±0,5 et axiale 0,1 | 20 m/s | vide | +578,4 (+18,6 %) | −0,619 (−12,3 %) | +0,698 (+21,0 %) | +0,063 (+1,0 %) | +0,619 | 581,0 (18,6 %) | 581,0 (18,6 %) | aucune |
| portance binormale ±0,5 et axiale 0,1 | 20 m/s | passager | +529,5 (+6,3 %) | −0,049 (−0,7 %) | +0,086 (+6,9 %) | −0,034 (−0,5 %) | +0,049 | 531,7 (6,4 %) | 531,7 (6,4 %) | aucune |

#### Corde Courant Bandit 11 mm, polyamide EN 1891 type A

| Sonde | Vent | Charge | ΔT_max (N) | Δflèche (m) | Δdéport latéral (m) | Δécart maximal à A–B (m) | Δgarde (m) | ‖ΔR_A‖ (N) | ‖ΔR_B‖ (N) | Remontée max. (m) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| portance binormale, C_L = ±0,05 | 10 m/s | vide | +0,9 (+0,1 %) | −0,068 (−4,8 %) | −0,004 (−0,5 %) | +0,044 (+2,0 %) | +0,068 | 2,7 (0,2 %) | 2,7 (0,2 %) | aucune |
| portance binormale, C_L = ±0,05 | 10 m/s | passager | +2,9 (+0,1 %) | −0,032 (−0,3 %) | +0,004 (+0,6 %) | −0,032 (−0,3 %) | +0,032 | 3,6 (0,2 %) | 3,6 (0,2 %) | aucune |
| portance binormale, C_L = ±0,05 | 20 m/s | vide | +2,8 (+0,2 %) | −0,247 (−19,5 %) | −0,019 (−0,6 %) | +0,050 (+1,5 %) | +0,247 | 10,4 (0,7 %) | 10,3 (0,7 %) | aucune |
| portance binormale, C_L = ±0,05 | 20 m/s | passager | +10,8 (+0,5 %) | −0,134 (−1,1 %) | +0,023 (+0,5 %) | −0,117 (−0,9 %) | +0,134 | 13,8 (0,7 %) | 13,7 (0,7 %) | aucune |
| portance binormale, C_L = ±0,2 | 10 m/s | vide | +4,0 (+0,3 %) | −0,273 (−19,4 %) | −0,018 (−2,1 %) | +0,182 (+8,4 %) | +0,273 | 10,8 (0,8 %) | 10,8 (0,8 %) | aucune |
| portance binormale, C_L = ±0,2 | 10 m/s | passager | +11,8 (+0,6 %) | −0,130 (−1,0 %) | +0,014 (+2,3 %) | −0,129 (−1,0 %) | +0,130 | 14,4 (0,7 %) | 14,3 (0,8 %) | aucune |
| portance binormale, C_L = ±0,2 | 20 m/s | vide | +13,8 (+0,9 %) | −0,993 (−78,4 %) | −0,079 (−2,5 %) | +0,232 (+3,8 %) | +0,993 | 42,1 (2,7 %) | 42,0 (2,7 %) | aucune |
| portance binormale, C_L = ±0,2 | 20 m/s | passager | +43,7 (+2,1 %) | −0,548 (−4,5 %) | +0,091 (+1,9 %) | −0,475 (−3,6 %) | +0,548 | 55,3 (2,7 %) | 54,9 (2,8 %) | aucune |
| portance binormale, C_L = ±0,5 | 10 m/s | vide | +11,1 (+0,8 %) | −0,685 (−48,8 %) | −0,044 (−5,3 %) | +0,480 (+22,2 %) | +0,685 | 27,3 (1,9 %) | 27,3 (1,9 %) | aucune |
| portance binormale, C_L = ±0,5 | 10 m/s | passager | +29,6 (+1,5 %) | −0,329 (−2,6 %) | +0,036 (+5,8 %) | −0,326 (−2,6 %) | +0,329 | 36,1 (1,8 %) | 35,8 (1,9 %) | aucune |
| portance binormale, C_L = ±0,5 | 20 m/s | vide | +47,1 (+3,0 %) | +2,383 (+188,2 %) | −0,203 (−6,3 %) | +0,766 (+12,6 %) | −2,383 | 108,9 (7,0 %) | 108,6 (7,0 %) | 1,219 |
| portance binormale, C_L = ±0,5 | 20 m/s | passager | +110,9 (+5,4 %) | −1,424 (−11,7 %) | +0,229 (+4,8 %) | −1,224 (−9,4 %) | +1,424 | 138,7 (6,7 %) | 137,7 (7,0 %) | aucune |
| portance impaire en lacet, C_L = ±0,05 | 10 m/s | vide | +0,5 (< 0,1 %) | −0,034 (−2,2 %) | +0,008 | +0,029 (+1,8 %) | +0,034 | 1,3 (0,1 %) | 1,3 (0,1 %) | aucune |
| portance impaire en lacet, C_L = ±0,05 | 10 m/s | passager | +1,4 (+0,1 %) | −0,016 (−0,1 %) | +0,007 | −0,016 (−0,1 %) | +0,016 | 1,8 (0,1 %) | 1,8 (0,1 %) | aucune |
| portance impaire en lacet, C_L = ±0,05 | 20 m/s | vide | +1,7 (+0,1 %) | −0,131 (−7,5 %) | −0,033 | +0,050 (+1,5 %) | +0,131 | 5,4 (0,4 %) | 5,2 (0,4 %) | aucune |
| portance impaire en lacet, C_L = ±0,05 | 20 m/s | passager | +5,7 (+0,3 %) | −0,064 (−0,5 %) | +0,027 | −0,061 (−0,5 %) | +0,064 | 7,0 (0,4 %) | 6,9 (0,4 %) | aucune |
| portance impaire en lacet, C_L = ±0,2 | 10 m/s | vide | +1,9 (+0,1 %) | −0,136 (−9,0 %) | −0,033 | +0,116 (+7,2 %) | +0,136 | 5,4 (0,4 %) | 5,3 (0,4 %) | aucune |
| portance impaire en lacet, C_L = ±0,2 | 10 m/s | passager | +5,8 (+0,3 %) | −0,063 (−0,5 %) | −0,028 | −0,063 (−0,5 %) | +0,063 | 7,1 (0,4 %) | 7,1 (0,4 %) | aucune |
| portance impaire en lacet, C_L = ±0,2 | 20 m/s | vide | +7,8 (+0,5 %) | −0,527 (−30,1 %) | −0,130 | +0,221 (+6,5 %) | +0,527 | 21,9 (1,5 %) | 20,9 (1,4 %) | aucune |
| portance impaire en lacet, C_L = ±0,2 | 20 m/s | passager | +22,7 (+1,2 %) | −0,258 (−2,0 %) | −0,113 | −0,245 (−1,9 %) | +0,258 | 28,1 (1,4 %) | 27,8 (1,4 %) | aucune |
| portance impaire en lacet, C_L = ±0,5 | 10 m/s | vide | +5,1 (+0,4 %) | −0,341 (−22,5 %) | −0,081 | +0,293 (+18,2 %) | +0,341 | 13,6 (1,0 %) | 13,4 (1,0 %) | aucune |
| portance impaire en lacet, C_L = ±0,5 | 10 m/s | passager | +14,5 (+0,7 %) | −0,159 (−1,3 %) | −0,068 | −0,158 (−1,2 %) | +0,159 | 17,8 (0,9 %) | 17,6 (0,9 %) | aucune |
| portance impaire en lacet, C_L = ±0,5 | 20 m/s | vide | +23,6 (+1,6 %) | −1,325 (−75,7 %) | −0,325 | +0,637 (+18,6 %) | +1,325 | 56,1 (3,9 %) | 53,5 (3,7 %) | aucune |
| portance impaire en lacet, C_L = ±0,5 | 20 m/s | passager | +57,2 (+2,9 %) | −0,658 (−5,2 %) | −0,275 | −0,624 (−5,0 %) | +0,658 | 70,3 (3,6 %) | 69,4 (3,5 %) | aucune |
| traînée axiale, C_t = 0,02 | 10 m/s | vide | +1,0 (+0,1 %) | < plancher | < plancher | < plancher | < plancher | 1,0 (0,1 %) | 1,0 (0,1 %) | aucune |
| traînée axiale, C_t = 0,02 | 10 m/s | passager | +1,0 (+0,1 %) | < plancher | < plancher | < plancher | < plancher | 1,0 (0,1 %) | 1,0 (0,1 %) | aucune |
| traînée axiale, C_t = 0,02 | 20 m/s | vide | +4,0 (+0,3 %) | < plancher | 1,5×10⁻⁴ (< 0,1 %) | 1,6×10⁻⁴ (< 0,1 %) | < plancher | 4,0 (0,3 %) | 4,0 (0,3 %) | aucune |
| traînée axiale, C_t = 0,02 | 20 m/s | passager | +4,0 (+0,2 %) | 3,8×10⁻⁴ (< 0,1 %) | < plancher | 3,8×10⁻⁴ (< 0,1 %) | −3,8×10⁻⁴ | 4,0 (0,2 %) | 4,0 (0,2 %) | aucune |
| traînée axiale, C_t = 0,1 | 10 m/s | vide | +5,0 (+0,4 %) | < plancher | < plancher | < plancher | < plancher | 5,0 (0,4 %) | 5,0 (0,4 %) | aucune |
| traînée axiale, C_t = 0,1 | 10 m/s | passager | +4,9 (+0,3 %) | 3,7×10⁻⁴ (< 0,1 %) | < plancher | 3,7×10⁻⁴ (< 0,1 %) | −3,7×10⁻⁴ | 4,9 (0,3 %) | 5,0 (0,3 %) | aucune |
| traînée axiale, C_t = 0,1 | 20 m/s | vide | +20,1 (+1,4 %) | 3,1×10⁻⁴ (< 0,1 %) | +0,001 (< 0,1 %) | +0,001 (< 0,1 %) | −3,1×10⁻⁴ | 20,1 (1,4 %) | 20,1 (1,4 %) | aucune |
| traînée axiale, C_t = 0,1 | 20 m/s | passager | +19,8 (+1,0 %) | +0,002 (< 0,1 %) | 2,3×10⁻⁴ (< 0,1 %) | +0,002 (< 0,1 %) | −0,002 | 19,8 (1,0 %) | 20,2 (1,1 %) | aucune |
| portance binormale ±0,5 et axiale 0,1 | 10 m/s | vide | +11,1 (+0,8 %) | −0,685 (−48,8 %) | −0,044 (−5,3 %) | +0,480 (+22,2 %) | +0,685 | 27,3 (1,9 %) | 27,3 (1,9 %) | aucune |
| portance binormale ±0,5 et axiale 0,1 | 10 m/s | passager | +29,6 (+1,5 %) | −0,329 (−2,6 %) | +0,036 (+5,8 %) | −0,326 (−2,6 %) | +0,329 | 36,1 (1,8 %) | 35,8 (1,9 %) | aucune |
| portance binormale ±0,5 et axiale 0,1 | 20 m/s | vide | +47,3 (+3,0 %) | +2,383 (+188,2 %) | −0,202 (−6,3 %) | +0,766 (+12,6 %) | −2,383 | 108,9 (7,0 %) | 108,7 (7,0 %) | 1,219 |
| portance binormale ±0,5 et axiale 0,1 | 20 m/s | passager | +111,0 (+5,4 %) | −1,424 (−11,7 %) | +0,229 (+4,8 %) | −1,224 (−9,4 %) | +1,424 | 138,7 (6,7 %) | 137,8 (7,0 %) | aucune |

### Écarts vent par vent, aux plus grandes sondes

Regroupés ici : toutes les géométries, tous les états de charge et les deux signes de portance.

#### Câble acier 12 mm, 6×19 âme métallique, 1770

| Vent | Sonde | ΔT_max (N) | Δflèche (m) | Δdéport latéral (m) | Δgarde (m) |
| --- | --- | --- | --- | --- | --- |
| 10 m/s de travers (90°) | portance binormale, C_L = ±0,5 | −169,1 (−6,3 %) | −0,029 (−0,5 %) | +0,067 (+6,9 %) | +0,029 |
| 10 m/s de travers (90°) | portance impaire en lacet, C_L = ±0,5 | 1,1×10⁻² (< 0,1 %) | < plancher | < plancher | < plancher |
| 10 m/s de travers (90°) | traînée axiale, C_t = 0,1 | 1,1×10⁻³ (< 0,1 %) | < plancher | < plancher | < plancher |
| 10 m/s oblique de face (45°) | portance binormale, C_L = ±0,5 | −85,6 (−3,2 %) | −0,012 (−0,2 %) | +0,042 (+8,5 %) | +0,012 |
| 10 m/s oblique de face (45°) | portance impaire en lacet, C_L = ±0,5 | −85,2 (−3,2 %) | −0,012 (−0,2 %) | +0,041 (+8,3 %) | +0,012 |
| 10 m/s oblique de face (45°) | traînée axiale, C_t = 0,1 | +2,8 (+0,1 %) | < plancher | < plancher | < plancher |
| 10 m/s presque de face (5°) | portance binormale, C_L = ±0,5 | +2,3 (+0,1 %) | −2,3×10⁻⁴ (< 0,1 %) | +0,009 | 2,3×10⁻⁴ |
| 10 m/s presque de face (5°) | portance impaire en lacet, C_L = ±0,5 | +14,9 (+0,6 %) | −0,002 (< 0,1 %) | +0,050 | +0,002 |
| 10 m/s presque de face (5°) | traînée axiale, C_t = 0,1 | +5,5 (+0,2 %) | < plancher | < plancher | < plancher |
| 10 m/s presque de dos (175°) | portance binormale, C_L = ±0,5 | +2,3 (+0,1 %) | −1,9×10⁻⁴ (< 0,1 %) | +0,009 | 1,9×10⁻⁴ |
| 10 m/s presque de dos (175°) | portance impaire en lacet, C_L = ±0,5 | +14,9 (+0,6 %) | −0,002 (< 0,1 %) | −0,050 | +0,002 |
| 10 m/s presque de dos (175°) | traînée axiale, C_t = 0,1 | +5,5 (+0,2 %) | < plancher | < plancher | < plancher |
| 20 m/s de travers (90°) | portance binormale, C_L = ±0,5 | +578,4 (+18,6 %) | −0,619 (−12,3 %) | +0,698 (+21,0 %) | +0,619 |
| 20 m/s de travers (90°) | portance impaire en lacet, C_L = ±0,5 | +0,1 (< 0,1 %) | 1,3×10⁻⁴ (< 0,1 %) | −1,5×10⁻⁴ (< 0,1 %) | −1,3×10⁻⁴ |
| 20 m/s de travers (90°) | traînée axiale, C_t = 0,1 | 4,9×10⁻² (< 0,1 %) | < plancher | < plancher | < plancher |
| 20 m/s oblique de face (45°) | portance binormale, C_L = ±0,5 | +324,9 (+11,7 %) | −0,151 (−2,6 %) | +0,328 (+17,9 %) | +0,151 |
| 20 m/s oblique de face (45°) | portance impaire en lacet, C_L = ±0,5 | +323,5 (+11,7 %) | −0,148 (−2,6 %) | +0,319 (+17,4 %) | +0,148 |
| 20 m/s oblique de face (45°) | traînée axiale, C_t = 0,1 | +11,5 (+0,4 %) | < plancher | < plancher | < plancher |
| 20 m/s presque de face (5°) | portance binormale, C_L = ±0,5 | +9,0 (+0,3 %) | −0,001 (< 0,1 %) | +0,037 | +0,001 |
| 20 m/s presque de face (5°) | portance impaire en lacet, C_L = ±0,5 | +59,7 (+2,3 %) | −0,011 (−0,2 %) | +0,202 | +0,011 |
| 20 m/s presque de face (5°) | traînée axiale, C_t = 0,1 | +21,9 (+0,8 %) | < plancher | < plancher | < plancher |
| 20 m/s presque de dos (175°) | portance binormale, C_L = ±0,5 | +9,3 (+0,4 %) | −0,001 (< 0,1 %) | +0,037 | +0,001 |
| 20 m/s presque de dos (175°) | portance impaire en lacet, C_L = ±0,5 | +60,8 (+2,3 %) | −0,008 (−0,1 %) | −0,207 | +0,008 |
| 20 m/s presque de dos (175°) | traînée axiale, C_t = 0,1 | +21,9 (+0,8 %) | −2,3×10⁻⁴ (< 0,1 %) | < plancher | 2,3×10⁻⁴ |

#### Corde Courant Bandit 11 mm, polyamide EN 1891 type A

| Vent | Sonde | ΔT_max (N) | Δflèche (m) | Δdéport latéral (m) | Δgarde (m) |
| --- | --- | --- | --- | --- | --- |
| 10 m/s de travers (90°) | portance binormale, C_L = ±0,5 | +29,6 (+1,5 %) | −0,685 (−48,8 %) | +0,017 (+1,4 %) | +0,685 |
| 10 m/s de travers (90°) | portance impaire en lacet, C_L = ±0,5 | 2,0×10⁻² (< 0,1 %) | < plancher | < plancher | < plancher |
| 10 m/s de travers (90°) | traînée axiale, C_t = 0,1 | 2,4×10⁻³ (< 0,1 %) | < plancher | < plancher | < plancher |
| 10 m/s oblique de face (45°) | portance binormale, C_L = ±0,5 | +15,0 (+0,8 %) | −0,346 (−22,9 %) | −0,044 (−5,3 %) | +0,346 |
| 10 m/s oblique de face (45°) | portance impaire en lacet, C_L = ±0,5 | +14,5 (+0,7 %) | −0,341 (−22,5 %) | −0,043 (−5,2 %) | +0,341 |
| 10 m/s oblique de face (45°) | traînée axiale, C_t = 0,1 | +2,6 (+0,2 %) | 2,5×10⁻⁴ (< 0,1 %) | < plancher | −2,5×10⁻⁴ |
| 10 m/s presque de face (5°) | portance binormale, C_L = ±0,5 | +0,5 (< 0,1 %) | −0,009 (−0,6 %) | +0,022 | +0,009 |
| 10 m/s presque de face (5°) | portance impaire en lacet, C_L = ±0,5 | +2,5 (+0,1 %) | −0,059 (−4,1 %) | +0,081 | +0,059 |
| 10 m/s presque de face (5°) | traînée axiale, C_t = 0,1 | +5,0 (+0,4 %) | 3,7×10⁻⁴ (< 0,1 %) | < plancher | −3,7×10⁻⁴ |
| 10 m/s presque de dos (175°) | portance binormale, C_L = ±0,5 | +0,5 (< 0,1 %) | −0,009 (−0,6 %) | +0,022 | +0,009 |
| 10 m/s presque de dos (175°) | portance impaire en lacet, C_L = ±0,5 | +2,6 (+0,1 %) | −0,059 (−4,3 %) | −0,081 | +0,059 |
| 10 m/s presque de dos (175°) | traînée axiale, C_t = 0,1 | +5,0 (+0,4 %) | −3,2×10⁻⁴ (< 0,1 %) | < plancher | 3,2×10⁻⁴ |
| 20 m/s de travers (90°) | portance binormale, C_L = ±0,5 | +110,9 (+5,4 %) | +2,383 (+188,2 %) | +0,229 (+4,8 %) | −2,383 |
| 20 m/s de travers (90°) | portance impaire en lacet, C_L = ±0,5 | +0,3 (< 0,1 %) | +0,003 (+0,3 %) | −1,4×10⁻⁴ (< 0,1 %) | −0,003 |
| 20 m/s de travers (90°) | traînée axiale, C_t = 0,1 | +0,1 (< 0,1 %) | 1,0×10⁻⁴ (< 0,1 %) | < plancher | −1,0×10⁻⁴ |
| 20 m/s oblique de face (45°) | portance binormale, C_L = ±0,5 | +58,9 (+3,0 %) | −1,341 (−76,6 %) | −0,203 (−6,3 %) | +1,341 |
| 20 m/s oblique de face (45°) | portance impaire en lacet, C_L = ±0,5 | +57,2 (+2,9 %) | −1,325 (−75,7 %) | −0,198 (−6,2 %) | +1,325 |
| 20 m/s oblique de face (45°) | traînée axiale, C_t = 0,1 | +10,7 (+0,7 %) | +0,002 (< 0,1 %) | +0,001 (< 0,1 %) | −0,002 |
| 20 m/s presque de face (5°) | portance binormale, C_L = ±0,5 | +1,9 (+0,1 %) | −0,035 (−2,3 %) | +0,087 | +0,035 |
| 20 m/s presque de face (5°) | portance impaire en lacet, C_L = ±0,5 | +10,4 (+0,5 %) | −0,237 (−15,4 %) | +0,325 | +0,237 |
| 20 m/s presque de face (5°) | traînée axiale, C_t = 0,1 | +20,1 (+1,4 %) | +0,002 (< 0,1 %) | 1,7×10⁻⁴ | −0,002 |
| 20 m/s presque de dos (175°) | portance binormale, C_L = ±0,5 | +2,0 (+0,1 %) | −0,035 (−2,7 %) | +0,087 | +0,035 |
| 20 m/s presque de dos (175°) | portance impaire en lacet, C_L = ±0,5 | +10,6 (+0,5 %) | −0,237 (−18,3 %) | −0,325 | +0,237 |
| 20 m/s presque de dos (175°) | traînée axiale, C_t = 0,1 | +20,1 (+1,4 %) | −0,001 (< 0,1 %) | −1,6×10⁻⁴ | +0,001 |

Le détail, ligne par ligne, avec chaque composante des réactions, est dans `results/fixed-l0.csv` ; les coordonnées d'une sélection de lignes dans `results/shapes.csv`.

## 7. Comparaison séparée — tension de pose identique

**Ce tableau n'est pas la comparaison principale et ne s'y mélange pas.** La tension de pose de #127 se lit sur la ligne à vide sous le vent du scénario. Ici, pour chaque ligne, géométrie, vent **et modèle**, l'expérience résout la longueur `L₀` à laquelle la ligne à vide lit la même tension totale à l'ancrage A sous ce vent et ce modèle, **rapporte cette longueur**, puis résout la ligne à vide et la ligne chargée à cette longueur. Un modèle qui change la pose décrit une autre installation.

La longueur est cherchée sur la branche tendue, à partir de la longueur sans vent ; une racine trouvée est locale, rien n'affirme qu'elle est unique.

### Longueur de chaque modèle

`L₀` sans vent, `L₀` du modèle de référence sous le vent, puis écart de `L₀` à cette référence pour la plus grande sonde de chaque force ajoutée, seule, en millimètres. « < plancher » : l'écart de longueur est sous le plancher numérique de 1,0×10⁻⁴ m ; « échec » : la ligne à vide du modèle, ou celle de la référence, n'a pas passé ses vérifications et ne donne aucun écart. Les 27 variantes sont dans `results/pose-tension.csv`.

| Ligne | Géométrie | Vent | L₀ sans vent (m) | L₀ référence (m) | ΔL₀ `NL-b+0.5` (mm) | ΔL₀ `NL-b-0.5` (mm) | ΔL₀ `NL-y+0.5` (mm) | ΔL₀ `NL-y-0.5` (mm) | ΔL₀ `NA-0.1` (mm) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| acier-12 | niveau | travers-10 | 150,5398 | 150,5560 | −80,4 | +86,4 | < plancher | < plancher | < plancher |
| acier-12 | niveau | oblique-10 | 150,5398 | 150,5439 | −41,0 | +42,6 | +42,3 | −40,8 | −1,3 |
| acier-12 | niveau | quasi-face-10 | 150,5398 | 150,5398 | −0,8 | +0,8 | +7,3 | −7,2 | −2,6 |
| acier-12 | niveau | quasi-dos-10 | 150,5398 | 150,5398 | −0,8 | +0,8 | −7,2 | +7,3 | +2,7 |
| acier-12 | niveau | travers-20 | 150,5398 | 150,8000 | −288,2 | +386,3 | < plancher | < plancher | < plancher |
| acier-12 | niveau | oblique-20 | 150,5398 | 150,6056 | −155,3 | +180,3 | +179,1 | −154,9 | −5,6 |
| acier-12 | niveau | quasi-face-20 | 150,5398 | 150,5398 | −3,2 | +3,2 | +29,5 | −28,3 | −10,4 |
| acier-12 | niveau | quasi-dos-20 | 150,5398 | 150,5398 | −3,2 | +3,2 | −28,3 | +29,5 | +10,8 |
| acier-12 | incline | travers-10 | 151,6442 | 151,6615 | −84,7 | +91,2 | < plancher | < plancher | < plancher |
| acier-12 | incline | oblique-10 | 151,6442 | 151,6614 | −43,5 | +45,3 | +44,4 | −42,8 | −1,4 |
| acier-12 | incline | quasi-face-10 | 151,6442 | 151,6488 | −1,2 | +1,2 | +7,7 | −7,5 | −2,8 |
| acier-12 | incline | quasi-dos-10 | 151,6442 | 151,6397 | −1,2 | +1,2 | −7,5 | +7,6 | +2,8 |
| acier-12 | incline | travers-20 | 151,6442 | 151,9206 | −303,7 | +408,2 | +0,1 | < plancher | < plancher |
| acier-12 | incline | oblique-20 | 151,6442 | 151,7670 | −165,0 | +192,4 | +188,4 | −162,6 | −6,3 |
| acier-12 | incline | quasi-face-20 | 151,6442 | 151,6628 | −4,7 | +4,8 | +31,7 | −29,2 | −11,3 |
| acier-12 | incline | quasi-dos-20 | 151,6442 | 151,6262 | −4,7 | +4,7 | −28,8 | +31,3 | +11,0 |
| corde-bandit-11 | niveau | travers-10 | 144,8846 | 144,9300 | −25,6 | +41,5 | < plancher | < plancher | < plancher |
| corde-bandit-11 | niveau | oblique-10 | 144,8846 | 144,8960 | −14,8 | +18,7 | +18,7 | −14,8 | −9,0 |
| corde-bandit-11 | niveau | quasi-face-10 | 144,8846 | 144,8846 | −0,3 | +0,3 | +3,0 | −2,8 | −18,1 |
| corde-bandit-11 | niveau | quasi-dos-10 | 144,8846 | 144,8846 | −0,3 | +0,3 | −2,8 | +3,0 | +18,1 |
| corde-bandit-11 | niveau | travers-20 | 144,8846 | 145,6117 | −9,4 | +267,1 | +0,3 | +0,3 | +0,7 |
| corde-bandit-11 | niveau | oblique-20 | 144,8846 | 145,0665 | −35,7 | +99,7 | +99,7 | −35,8 | −36,7 |
| corde-bandit-11 | niveau | quasi-face-20 | 144,8846 | 144,8847 | −1,0 | +1,0 | +12,6 | −10,6 | −72,2 |
| corde-bandit-11 | niveau | quasi-dos-20 | 144,8846 | 144,8847 | −1,0 | +1,0 | −10,6 | +12,6 | +72,4 |
| corde-bandit-11 | incline | travers-10 | 145,9467 | 145,9934 | −26,2 | +42,5 | < plancher | < plancher | < plancher |
| corde-bandit-11 | incline | oblique-10 | 145,9467 | 145,9636 | −15,2 | +19,4 | +19,1 | −15,0 | −9,0 |
| corde-bandit-11 | incline | quasi-face-10 | 145,9467 | 145,9481 | −0,4 | +0,4 | +3,1 | −2,8 | −18,0 |
| corde-bandit-11 | incline | quasi-dos-10 | 145,9467 | 145,9452 | −0,4 | +0,4 | −2,8 | +3,1 | +18,0 |
| corde-bandit-11 | incline | travers-20 | 145,9467 | 146,6963 | −8,8 | +274,6 | +0,3 | +0,3 | +0,8 |
| corde-bandit-11 | incline | oblique-20 | 145,9467 | 146,1594 | −35,9 | +103,9 | +101,9 | −36,0 | −37,0 |
| corde-bandit-11 | incline | quasi-face-20 | 145,9467 | 145,9529 | −1,7 | +1,8 | +14,7 | −9,1 | −72,2 |
| corde-bandit-11 | incline | quasi-dos-20 | 145,9467 | 145,9412 | −1,7 | +1,8 | −9,0 | +14,6 | +72,1 |

### Écarts par taille de sonde, à tension de pose identique

Chaque cellule est l'écart au modèle de référence — traînée normale seule, même cas, même convention — **de plus grande valeur absolue** parmi les cas regroupés, avec son signe ; le pourcentage est celui de ce même cas, et n'est donné que si la référence est assez loin de zéro. « < plancher » : aucun écart du groupe ne dépasse le plancher numérique ; « — » : le groupe ne contient aucune ligne. Le déport latéral de référence est nul ou presque par vent presque parallèle : son écart est alors donné en mètres seuls. Les écarts de réaction sont la norme de la différence des vecteurs : une réaction qui tourne sans grandir s'y voit. « Remontée max. » n'est pas un écart : c'est la plus grande hauteur atteinte **au-dessus** de la ligne A–B dans le groupe — la flèche, elle, ne descend pas sous zéro, et une ligne soulevée au-dessus de A–B a une flèche nulle ; « aucune » : aucune ligne du groupe ne remonte au-dessus de la ligne A–B, au plancher numérique près. Dans toutes les lignes résolues ici, la garde vaut 17,9 m moins la flèche — le sol prescrit est parallèle à A–B : `Δgarde = −Δflèche`, et la colonne de la garde répète celle de la flèche au signe près. Son pourcentage n'est pas imprimé : il serait la part d'une garde que fixe la hauteur d'ancrage du scénario, et changerait avec elle ; il reste dans les fichiers CSV. Regroupés ici : toutes les géométries, toutes les directions de vent et les deux signes de portance. À vide, `T_A` est la tension de pose elle-même, identique par construction ; `T_max` et les réactions peuvent différer.

#### Câble acier 12 mm, 6×19 âme métallique, 1770

| Sonde | Vent | Charge | ΔT_max (N) | Δflèche (m) | Δdéport latéral (m) | Δécart maximal à A–B (m) | Δgarde (m) | ‖ΔR_A‖ (N) | ‖ΔR_B‖ (N) | Remontée max. (m) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| portance binormale, C_L = ±0,05 | 10 m/s | vide | < plancher | +0,042 (+0,7 %) | +0,002 (+0,5 %) | +0,042 (+0,7 %) | −0,042 | 2,9 (0,1 %) | 2,8 (0,1 %) | aucune |
| portance binormale, C_L = ±0,05 | 10 m/s | passager | +27,5 (+0,3 %) | +0,040 (+0,5 %) | +0,001 (+0,4 %) | +0,040 (+0,5 %) | −0,040 | 28,3 (0,3 %) | 28,2 (0,4 %) | aucune |
| portance binormale, C_L = ±0,05 | 20 m/s | vide | < plancher | +0,169 (+2,8 %) | +0,009 (+0,5 %) | +0,143 (+2,0 %) | −0,169 | 11,4 (0,4 %) | 11,2 (0,4 %) | aucune |
| portance binormale, C_L = ±0,05 | 20 m/s | passager | +68,2 (+0,9 %) | +0,145 (+1,7 %) | +0,014 (+1,0 %) | +0,145 (+1,7 %) | −0,145 | 71,3 (1,0 %) | 71,3 (1,0 %) | aucune |
| portance binormale, C_L = ±0,2 | 10 m/s | vide | < plancher | +0,169 (+2,8 %) | +0,010 (+2,0 %) | +0,167 (+2,8 %) | −0,169 | 11,4 (0,4 %) | 11,3 (0,4 %) | aucune |
| portance binormale, C_L = ±0,2 | 10 m/s | passager | +111,3 (+1,4 %) | +0,161 (+2,1 %) | +0,005 (+1,4 %) | +0,161 (+2,1 %) | −0,161 | 114,1 (1,4 %) | 114,0 (1,5 %) | aucune |
| portance binormale, C_L = ±0,2 | 20 m/s | vide | < plancher | +0,679 (+11,3 %) | +0,037 (+1,8 %) | +0,582 (+8,1 %) | −0,679 | 45,5 (1,7 %) | 44,9 (1,8 %) | aucune |
| portance binormale, C_L = ±0,2 | 20 m/s | passager | +276,3 (+3,8 %) | +0,591 (+6,9 %) | +0,059 (+4,1 %) | +0,592 (+6,9 %) | −0,591 | 288,2 (4,0 %) | 288,2 (4,0 %) | aucune |
| portance binormale, C_L = ±0,5 | 10 m/s | vide | < plancher | +0,424 (+7,1 %) | +0,024 (+4,9 %) | +0,419 (+6,9 %) | −0,424 | 28,5 (1,1 %) | 28,2 (1,1 %) | aucune |
| portance binormale, C_L = ±0,5 | 10 m/s | passager | +283,4 (+3,5 %) | +0,406 (+5,4 %) | +0,011 (+3,6 %) | +0,406 (+5,4 %) | −0,406 | 290,3 (3,6 %) | 290,3 (3,7 %) | aucune |
| portance binormale, C_L = ±0,5 | 20 m/s | vide | < plancher | +1,706 (+28,4 %) | +0,092 (+4,6 %) | +1,489 (+20,7 %) | −1,706 | 114,0 (4,3 %) | 112,7 (4,4 %) | aucune |
| portance binormale, C_L = ±0,5 | 20 m/s | passager | +697,0 (+9,6 %) | +1,526 (+17,9 %) | +0,149 (+10,3 %) | +1,530 (+17,7 %) | −1,526 | 725,2 (10,0 %) | 725,2 (10,0 %) | aucune |
| portance impaire en lacet, C_L = ±0,05 | 10 m/s | vide | < plancher | +0,021 (+0,3 %) | +0,005 | +0,021 (+0,3 %) | −0,021 | 1,4 (0,1 %) | 1,4 (0,1 %) | aucune |
| portance impaire en lacet, C_L = ±0,05 | 10 m/s | passager | +14,0 (+0,2 %) | +0,020 (+0,3 %) | +0,002 | +0,020 (+0,3 %) | −0,020 | 14,4 (0,2 %) | 14,4 (0,2 %) | aucune |
| portance impaire en lacet, C_L = ±0,05 | 20 m/s | vide | < plancher | +0,084 (+1,3 %) | +0,020 | +0,077 (+1,2 %) | −0,084 | 5,8 (0,2 %) | 5,5 (0,2 %) | aucune |
| portance impaire en lacet, C_L = ±0,05 | 20 m/s | passager | +49,7 (+0,6 %) | +0,076 (+1,0 %) | +0,007 | +0,076 (+1,0 %) | −0,076 | 51,1 (0,6 %) | 51,1 (0,6 %) | aucune |
| portance impaire en lacet, C_L = ±0,2 | 10 m/s | vide | < plancher | +0,084 (+1,4 %) | −0,020 | +0,083 (+1,4 %) | −0,084 | 5,7 (0,2 %) | 5,6 (0,2 %) | aucune |
| portance impaire en lacet, C_L = ±0,2 | 10 m/s | passager | +56,4 (+0,7 %) | +0,080 (+1,1 %) | −0,007 | +0,080 (+1,1 %) | −0,080 | 57,8 (0,7 %) | 57,7 (0,7 %) | aucune |
| portance impaire en lacet, C_L = ±0,2 | 20 m/s | vide | < plancher | +0,336 (+5,4 %) | −0,081 | +0,311 (+4,7 %) | −0,336 | 23,1 (0,9 %) | 22,1 (0,9 %) | aucune |
| portance impaire en lacet, C_L = ±0,2 | 20 m/s | passager | +202,0 (+2,5 %) | +0,308 (+3,9 %) | −0,027 | +0,308 (+3,8 %) | −0,308 | 207,6 (2,6 %) | 207,4 (2,6 %) | aucune |
| portance impaire en lacet, C_L = ±0,5 | 10 m/s | vide | < plancher | +0,210 (+3,5 %) | −0,050 | +0,207 (+3,4 %) | −0,210 | 14,3 (0,5 %) | 14,0 (0,6 %) | aucune |
| portance impaire en lacet, C_L = ±0,5 | 10 m/s | passager | +142,4 (+1,7 %) | +0,200 (+2,6 %) | −0,017 | +0,200 (+2,6 %) | −0,200 | 145,7 (1,8 %) | 145,7 (1,8 %) | aucune |
| portance impaire en lacet, C_L = ±0,5 | 20 m/s | vide | < plancher | +0,843 (+13,5 %) | +0,200 | +0,784 (+12,0 %) | −0,843 | 57,7 (2,2 %) | 55,2 (2,2 %) | aucune |
| portance impaire en lacet, C_L = ±0,5 | 20 m/s | passager | +520,1 (+6,6 %) | +0,784 (+9,8 %) | −0,067 | +0,782 (+9,7 %) | −0,784 | 533,7 (6,7 %) | 533,1 (6,7 %) | aucune |
| traînée axiale, C_t = 0,02 | 10 m/s | vide | +2,2 (+0,1 %) | −0,003 (< 0,1 %) | −1,1×10⁻⁴ (< 0,1 %) | −0,003 (< 0,1 %) | +0,003 | 0,1 (< 0,1 %) | 2,2 (0,1 %) | aucune |
| traînée axiale, C_t = 0,02 | 10 m/s | passager | +3,7 (< 0,1 %) | −0,003 (< 0,1 %) | < plancher | −0,003 (< 0,1 %) | +0,003 | 1,6 (< 0,1 %) | 3,8 (< 0,1 %) | aucune |
| traînée axiale, C_t = 0,02 | 20 m/s | vide | +8,7 (+0,3 %) | −0,010 (−0,2 %) | −0,002 (−0,1 %) | −0,010 (−0,2 %) | +0,010 | 0,5 (< 0,1 %) | 8,8 (0,3 %) | aucune |
| traînée axiale, C_t = 0,02 | 20 m/s | passager | +15,0 (+0,2 %) | −0,010 (−0,1 %) | −4,7×10⁻⁴ (−0,1 %) | −0,010 (−0,1 %) | +0,010 | 6,5 (0,1 %) | 15,2 (0,2 %) | aucune |
| traînée axiale, C_t = 0,1 | 10 m/s | vide | +10,9 (+0,4 %) | −0,013 (−0,2 %) | −0,001 (−0,1 %) | −0,013 (−0,2 %) | +0,013 | 0,6 (< 0,1 %) | 11,0 (0,4 %) | aucune |
| traînée axiale, C_t = 0,1 | 10 m/s | passager | +18,7 (+0,2 %) | −0,013 (−0,2 %) | −1,4×10⁻⁴ (−0,1 %) | −0,013 (−0,2 %) | +0,013 | 8,2 (0,1 %) | 18,9 (0,2 %) | aucune |
| traînée axiale, C_t = 0,1 | 20 m/s | vide | +43,6 (+1,7 %) | −0,052 (−0,8 %) | −0,008 (−0,4 %) | −0,052 (−0,8 %) | +0,052 | 2,4 (0,1 %) | 43,8 (1,7 %) | aucune |
| traînée axiale, C_t = 0,1 | 20 m/s | passager | +74,6 (+0,9 %) | −0,051 (−0,7 %) | −0,002 (−0,3 %) | −0,051 (−0,7 %) | +0,051 | 33,0 (0,4 %) | 76,0 (1,0 %) | aucune |
| portance binormale ±0,5 et axiale 0,1 | 10 m/s | vide | +10,9 (+0,4 %) | +0,424 (+7,1 %) | −0,025 (−5,0 %) | +0,419 (+6,9 %) | −0,424 | 28,5 (1,1 %) | 28,2 (1,1 %) | aucune |
| portance binormale ±0,5 et axiale 0,1 | 10 m/s | passager | +283,4 (+3,5 %) | +0,406 (+5,4 %) | +0,011 (+3,6 %) | +0,406 (+5,4 %) | −0,406 | 290,3 (3,6 %) | 290,3 (3,7 %) | aucune |
| portance binormale ±0,5 et axiale 0,1 | 20 m/s | vide | +43,6 (+1,7 %) | +1,707 (+28,4 %) | −0,099 (−5,0 %) | +1,490 (+20,7 %) | −1,707 | 114,0 (4,3 %) | 112,7 (4,4 %) | aucune |
| portance binormale ±0,5 et axiale 0,1 | 20 m/s | passager | +696,9 (+9,6 %) | +1,526 (+17,9 %) | +0,149 (+10,3 %) | +1,531 (+17,7 %) | −1,526 | 725,0 (10,0 %) | 725,0 (10,0 %) | aucune |

#### Corde Courant Bandit 11 mm, polyamide EN 1891 type A

| Sonde | Vent | Charge | ΔT_max (N) | Δflèche (m) | Δdéport latéral (m) | Δécart maximal à A–B (m) | Δgarde (m) | ‖ΔR_A‖ (N) | ‖ΔR_B‖ (N) | Remontée max. (m) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| portance binormale, C_L = ±0,05 | 10 m/s | vide | < plancher | +0,070 (+4,9 %) | +0,004 (+0,5 %) | +0,046 (+2,1 %) | −0,070 | 2,5 (0,2 %) | 2,5 (0,2 %) | aucune |
| portance binormale, C_L = ±0,05 | 10 m/s | passager | −2,4 (−0,1 %) | +0,036 (+0,3 %) | +0,003 (+0,6 %) | +0,036 (+0,3 %) | −0,036 | 3,2 (0,2 %) | 3,2 (0,2 %) | aucune |
| portance binormale, C_L = ±0,05 | 20 m/s | vide | < plancher | +0,278 (+19,6 %) | +0,016 (+0,5 %) | +0,066 (+1,0 %) | −0,278 | 10,1 (0,7 %) | 10,0 (0,7 %) | aucune |
| portance binormale, C_L = ±0,05 | 20 m/s | passager | −9,3 (−0,5 %) | +0,151 (+1,2 %) | +0,021 (+0,4 %) | +0,134 (+1,0 %) | −0,151 | 12,8 (0,7 %) | 12,6 (0,7 %) | aucune |
| portance binormale, C_L = ±0,2 | 10 m/s | vide | < plancher | +0,278 (+19,6 %) | +0,016 (+2,0 %) | +0,191 (+8,8 %) | −0,278 | 10,2 (0,7 %) | 10,2 (0,7 %) | aucune |
| portance binormale, C_L = ±0,2 | 10 m/s | passager | −9,6 (−0,5 %) | +0,146 (+1,2 %) | +0,014 (+2,2 %) | +0,145 (+1,1 %) | −0,146 | 13,0 (0,7 %) | 12,9 (0,7 %) | aucune |
| portance binormale, C_L = ±0,2 | 20 m/s | vide | < plancher | +1,115 (+78,3 %) | +0,065 (+1,9 %) | +0,326 (+4,8 %) | −1,115 | 40,2 (2,9 %) | 40,1 (2,9 %) | aucune |
| portance binormale, C_L = ±0,2 | 20 m/s | passager | −39,2 (−2,0 %) | +0,612 (+4,7 %) | +0,093 (+1,9 %) | +0,547 (+3,9 %) | −0,612 | 52,4 (2,7 %) | 52,0 (2,8 %) | aucune |
| portance binormale, C_L = ±0,5 | 10 m/s | vide | < plancher | +0,696 (+49,1 %) | +0,041 (+4,9 %) | +0,506 (+23,2 %) | −0,696 | 25,5 (1,8 %) | 25,4 (1,8 %) | aucune |
| portance binormale, C_L = ±0,5 | 10 m/s | passager | −24,7 (−1,2 %) | +0,369 (+2,9 %) | +0,035 (+5,7 %) | +0,366 (+2,9 %) | −0,369 | 32,9 (1,7 %) | 32,6 (1,7 %) | aucune |
| portance binormale, C_L = ±0,5 | 20 m/s | vide | +0,9 (+0,1 %) | +2,796 (+196,3 %) | +0,163 (+4,9 %) | +1,100 (+16,2 %) | −2,796 | 100,8 (7,2 %) | 100,5 (7,2 %) | 1,355 |
| portance binormale, C_L = ±0,5 | 20 m/s | passager | −108,3 (−5,6 %) | +1,572 (+12,1 %) | +0,274 (+5,4 %) | +1,427 (+10,2 %) | −1,572 | 138,7 (7,2 %) | 137,6 (7,4 %) | aucune |
| portance impaire en lacet, C_L = ±0,05 | 10 m/s | vide | < plancher | +0,035 (+2,3 %) | +0,008 | +0,029 (+1,8 %) | −0,035 | 1,3 (0,1 %) | 1,3 (0,1 %) | aucune |
| portance impaire en lacet, C_L = ±0,05 | 10 m/s | passager | −1,2 (−0,1 %) | +0,018 (+0,1 %) | +0,007 | +0,018 (+0,1 %) | −0,018 | 1,6 (0,1 %) | 1,6 (0,1 %) | aucune |
| portance impaire en lacet, C_L = ±0,05 | 20 m/s | vide | < plancher | +0,138 (+7,6 %) | +0,032 | +0,056 (+1,6 %) | −0,138 | 5,2 (0,4 %) | 4,9 (0,4 %) | aucune |
| portance impaire en lacet, C_L = ±0,05 | 20 m/s | passager | −4,6 (−0,2 %) | +0,072 (+0,6 %) | +0,027 | +0,069 (+0,5 %) | −0,072 | 6,3 (0,3 %) | 6,2 (0,3 %) | aucune |
| portance impaire en lacet, C_L = ±0,2 | 10 m/s | vide | < plancher | +0,138 (+9,1 %) | −0,032 | +0,119 (+7,4 %) | −0,138 | 5,1 (0,4 %) | 5,0 (0,4 %) | aucune |
| portance impaire en lacet, C_L = ±0,2 | 10 m/s | passager | −4,6 (−0,2 %) | +0,072 (+0,6 %) | −0,028 | +0,071 (+0,6 %) | −0,072 | 6,4 (0,3 %) | 6,3 (0,3 %) | aucune |
| portance impaire en lacet, C_L = ±0,2 | 20 m/s | vide | < plancher | +0,553 (+30,4 %) | +0,130 | +0,249 (+7,0 %) | −0,553 | 20,9 (1,5 %) | 19,7 (1,4 %) | aucune |
| portance impaire en lacet, C_L = ±0,2 | 20 m/s | passager | −19,0 (−1,0 %) | +0,290 (+2,2 %) | −0,113 | +0,277 (+2,2 %) | −0,290 | 25,7 (1,3 %) | 25,3 (1,3 %) | aucune |
| portance impaire en lacet, C_L = ±0,5 | 10 m/s | vide | < plancher | +0,346 (+22,8 %) | +0,081 | +0,301 (+18,7 %) | −0,346 | 12,8 (0,9 %) | 12,6 (0,9 %) | aucune |
| portance impaire en lacet, C_L = ±0,5 | 10 m/s | passager | −11,8 (−0,6 %) | +0,180 (+1,4 %) | −0,068 | +0,178 (+1,4 %) | −0,180 | 16,0 (0,8 %) | 15,8 (0,8 %) | aucune |
| portance impaire en lacet, C_L = ±0,5 | 20 m/s | vide | < plancher | +1,384 (+76,0 %) | +0,326 | +0,728 (+20,6 %) | −1,384 | 52,2 (3,7 %) | 49,3 (3,6 %) | aucune |
| portance impaire en lacet, C_L = ±0,5 | 20 m/s | passager | −50,4 (−2,6 %) | +0,736 (+5,7 %) | −0,275 | +0,704 (+5,5 %) | −0,736 | 66,2 (3,4 %) | 65,2 (3,4 %) | aucune |
| traînée axiale, C_t = 0,02 | 10 m/s | vide | +2,0 (+0,1 %) | −0,001 (−0,1 %) | −2,9×10⁻⁴ (< 0,1 %) | −0,001 (−0,1 %) | +0,001 | 2,6×10⁻² (< 0,1 %) | 2,0 (0,1 %) | aucune |
| traînée axiale, C_t = 0,02 | 10 m/s | passager | +1,6 (+0,1 %) | +0,004 (< 0,1 %) | −1,1×10⁻⁴ (< 0,1 %) | +0,004 (< 0,1 %) | −0,004 | 0,4 (< 0,1 %) | 1,7 (0,1 %) | aucune |
| traînée axiale, C_t = 0,02 | 20 m/s | vide | +8,0 (+0,6 %) | −0,004 (−0,3 %) | −0,004 (−0,1 %) | −0,005 (−0,1 %) | +0,004 | 0,1 (< 0,1 %) | 8,0 (0,6 %) | aucune |
| traînée axiale, C_t = 0,02 | 20 m/s | passager | +6,5 (+0,3 %) | +0,017 (+0,1 %) | −0,002 (−0,1 %) | +0,017 (+0,1 %) | −0,017 | 1,4 (0,1 %) | 6,6 (0,3 %) | aucune |
| traînée axiale, C_t = 0,1 | 10 m/s | vide | +10,0 (+0,7 %) | −0,005 (−0,4 %) | −0,001 (−0,2 %) | −0,005 (−0,4 %) | +0,005 | 0,1 (< 0,1 %) | 10,0 (0,7 %) | aucune |
| traînée axiale, C_t = 0,1 | 10 m/s | passager | +8,2 (+0,4 %) | +0,021 (+0,2 %) | −0,001 (−0,1 %) | +0,021 (+0,2 %) | −0,021 | 1,8 (0,1 %) | 8,3 (0,4 %) | aucune |
| traînée axiale, C_t = 0,1 | 20 m/s | vide | +40,1 (+2,9 %) | −0,022 (−1,4 %) | −0,022 (−0,6 %) | −0,025 (−0,7 %) | +0,022 | 0,7 (< 0,1 %) | 40,1 (2,9 %) | aucune |
| traînée axiale, C_t = 0,1 | 20 m/s | passager | +32,8 (+1,7 %) | +0,086 (+0,7 %) | −0,008 (−0,3 %) | +0,086 (+0,7 %) | −0,086 | 7,2 (0,4 %) | 33,1 (1,7 %) | aucune |
| portance binormale ±0,5 et axiale 0,1 | 10 m/s | vide | +10,0 (+0,7 %) | +0,696 (+49,1 %) | −0,042 (−5,1 %) | +0,506 (+23,2 %) | −0,696 | 25,5 (1,8 %) | 25,4 (1,8 %) | aucune |
| portance binormale ±0,5 et axiale 0,1 | 10 m/s | passager | −24,7 (−1,2 %) | +0,369 (+2,9 %) | +0,035 (+5,6 %) | +0,366 (+2,9 %) | −0,369 | 32,9 (1,7 %) | 32,6 (1,7 %) | aucune |
| portance binormale ±0,5 et axiale 0,1 | 20 m/s | vide | +40,1 (+2,9 %) | +2,796 (+196,3 %) | −0,179 (−5,4 %) | +1,102 (+16,2 %) | −2,796 | 100,8 (7,2 %) | 100,5 (7,2 %) | 1,355 |
| portance binormale ±0,5 et axiale 0,1 | 20 m/s | passager | −108,3 (−5,6 %) | +1,573 (+12,1 %) | +0,274 (+5,4 %) | +1,428 (+10,2 %) | −1,573 | 138,7 (7,2 %) | 137,6 (7,4 %) | aucune |

## 8. Lecture

### Les plus grands écarts de la comparaison principale

Écart de plus grande valeur absolue sur toute la matrice à `L₀` fixe, avec le cas et la variante où il se produit : pour la portance seule, pour la traînée axiale seule, puis pour les deux ensemble. L'entrée « plus petites sondes » ne retient que la plus petite sonde de chaque force, seule.

| Ligne | Force ajoutée | ΔT_max (N) | Δflèche (m) | Δdéport latéral (m) | Δgarde (m) | Remontée max. (m) |
| --- | --- | --- | --- | --- | --- | --- |
| acier-12 | portance, toutes sondes | +578,4 (+18,6 %) — niveau, vide, travers-20, NL-b-0.5 | −0,619 (−12,3 %) — incline, vide, travers-20, NL-b+0.5 | +0,698 (+21,0 %) — incline, vide, travers-20, NL-b+0.5 | +0,619 — incline, vide, travers-20, NL-b+0.5 | aucune |
| acier-12 | traînée axiale, toutes sondes | +21,9 (+0,8 %) — niveau, vide, quasi-face-20, NA-0.1 | −2,3×10⁻⁴ (< 0,1 %) — incline, vide, quasi-dos-20, NA-0.1 | < plancher — incline, vide, oblique-20, NA-0.1 | 2,3×10⁻⁴ — incline, vide, quasi-dos-20, NA-0.1 | aucune |
| acier-12 | portance et traînée axiale ensemble, toutes sondes | +578,4 (+18,6 %) — niveau, vide, travers-20, NLA-b-0.5-0.1 | −0,619 (−12,3 %) — incline, vide, travers-20, NLA-b+0.5-0.02 | +0,698 (+21,0 %) — incline, vide, travers-20, NLA-b+0.5-0.1 | +0,619 — incline, vide, travers-20, NLA-b+0.5-0.02 | aucune |
| acier-12 | plus petites sondes (C_L = ±0,05, C_t = 0,02) | +56,6 (+1,8 %) — niveau, vide, travers-20, NL-b-0.05 | −0,048 (−1,0 %) — incline, vide, travers-20, NL-b+0.05 | +0,061 (+1,8 %) — incline, vide, travers-20, NL-b+0.05 | +0,048 — incline, vide, travers-20, NL-b+0.05 | aucune |
| corde-bandit-11 | portance, toutes sondes | +110,9 (+5,4 %) — incline, passager, travers-20, NL-b-0.5 | +2,383 (+188,2 %) — incline, vide, travers-20, NL-b-0.5 | −0,325 — incline, vide, quasi-dos-20, NL-y+0.5 | −2,383 — incline, vide, travers-20, NL-b-0.5 | 1,219 |
| corde-bandit-11 | traînée axiale, toutes sondes | +20,1 (+1,4 %) — niveau, vide, quasi-dos-20, NA-0.1 | +0,002 (< 0,1 %) — incline, passager, oblique-20, NA-0.1 | +0,001 (< 0,1 %) — niveau, vide, oblique-20, NA-0.1 | −0,002 — incline, passager, oblique-20, NA-0.1 | aucune |
| corde-bandit-11 | portance et traînée axiale ensemble, toutes sondes | +111,0 (+5,4 %) — incline, passager, travers-20, NLA-b-0.5-0.1 | +2,383 (+188,2 %) — incline, vide, travers-20, NLA-b-0.5-0.1 | +0,229 (+4,8 %) — incline, passager, travers-20, NLA-b+0.5-0.1 | −2,383 — incline, vide, travers-20, NLA-b-0.5-0.1 | 1,219 |
| corde-bandit-11 | plus petites sondes (C_L = ±0,05, C_t = 0,02) | +10,8 (+0,5 %) — incline, passager, travers-20, NL-b-0.05 | −0,247 (−19,5 %) — incline, vide, travers-20, NL-b+0.05 | −0,033 — incline, vide, quasi-dos-20, NL-y+0.05 | +0,247 — incline, vide, travers-20, NL-b+0.05 | aucune |

- **Câble acier 12 mm, 6×19 âme métallique, 1770.** Portance, plus grande sonde (`C_L = ±0,5`) : `T_max` +578,4 N (+18,6 %), flèche −0,619 m (−12,3 %), garde +0,619 m. Plus petite sonde (`±0,05`) : `T_max` +56,6 N (+1,8 %), flèche −0,048 m (−1,0 %), garde +0,048 m. Traînée axiale (`C_t` jusqu'à 0,1) : `T_max` +21,9 N (+0,8 %) ; aucune longueur ne bouge de plus de 2,3×10⁻⁴ m.
- **Corde Courant Bandit 11 mm, polyamide EN 1891 type A.** Portance, plus grande sonde (`C_L = ±0,5`) : `T_max` +110,9 N (+5,4 %), flèche +2,383 m (+188,2 %), garde −2,383 m. Plus petite sonde (`±0,05`) : `T_max` +10,8 N (+0,5 %), flèche −0,247 m (−19,5 %), garde +0,247 m. Traînée axiale (`C_t` jusqu'à 0,1) : `T_max` +20,1 N (+1,4 %) ; aucune longueur ne bouge de plus de 0,002 m.

Les tableaux vent par vent de la section 6 montrent où chaque loi agit, et c'est une propriété des formules : la loi binormale est maximale par vent de travers, la loi impaire en lacet par vent oblique, et près d'un vent parallèle elle dépasse la loi binormale. Inverser le signe de `C_L` inverse le sens de l'écart, pas exactement sa taille.

Ce sont des réponses à des **sondes**, dans des **scénarios hypothétiques** : elles disent quels effets *peuvent* déplacer sensiblement un résultat si un coefficient avait la taille de la sonde. Elles ne sont pas une erreur garantie, ni une erreur probable, sur un produit réel. L'expérience ne fixe aucun seuil d'importance : un écart qui se compte en pourcents de la tension ou en décimètres de flèche ou de garde se lit sur les chiffres.

### Trois choses à ne pas confondre

- **Sensibilité numérique.** Les contrôles de la section 4 bornent l'erreur de calcul : tout écart imprimé ci-dessus dépasse un plancher de 1,0×10⁻⁴ m et 1,0×10⁻³ N, dix fois la tolérance de raffinement, que le doublement du nombre de pas respecte largement. Un écart imprimé est donc un effet de l'hypothèse aérodynamique, pas du pas d'intégration. C'est une propriété du prototype : « résolu » ne veut pas dire « important pour une installation », et ne dit rien de la justesse du modèle.
- **Données manquantes.** Aucun `C_L` et aucun `C_t` mesuré n'est transférable à un câble 6×19 ou à une corde textile sèche ; `C_D⊥ = 1,2` est lui-même un ordre de grandeur publié pour d'autres corps. Le côté vers lequel la portance pousse et sa dépendance à l'angle de lacet sont des hypothèses : les deux lois testées répondent différemment selon la direction du vent, et aucune mesure ne permet ici de choisir entre elles. Chaque écart de ce rapport est donc conditionnel.
- **Décision de production encore ouverte.** L'expérience ne justifie ni d'omettre la portance ou la traînée axiale au motif qu'elles seraient négligeables, ni d'adopter l'une de ces sondes comme coefficient. Le choix actuel de #127 — traînée normale seule — reste une convention de modélisation. Omettre les deux autres forces en le nommant comme un manque de donnée, garder des coefficients internes étiquetés non produit, ou attendre une mesure de la construction retenue : c'est une décision du mainteneur.

### Ce que l'expérience ne couvre pas

- Aucune mesure en soufflerie ni sur site ; aucun coefficient propre à un produit.
- Un vent uniforme et horizontal : le profil de §8.4 n'est pas exercé.
- Le passager n'a que son poids : aucune prise au vent, aucun ellipsoïde, aucune inertie de descente.
- Statique seulement : ni vibration, ni détachement tourbillonnaire, ni galop, ni rafale (#124).
- Une garde verticale sur un profil extrudé, pas une garde au sol réel hors de l'axe.
- Les seules installations illustrées de la section 3 : les écarts ne s'extrapolent pas à une autre portée, une autre tension de pose ou un autre vent sans rejouer la matrice.
- Le moteur de production, la traînée de descente (Q12), le Verdict et les facteurs de sécurité ne sont pas modifiés.
