# Portance stationnaire et traînée axiale de ligne — peut-on les omettre ? (#127, Q11)

**Date :** 10 novembre 2026. **Question :** avant d'omettre, dans le solveur spatial, la portance aérodynamique stationnaire de la ligne et sa traînée axiale, faut-il les étudier, et leur effet peut-il être significatif ? **Décision préparée, pas adoptée.** Q11 reste ouverte. Cette note ne rouvre aucune décision déjà tranchée.

Niveaux : **[P]** page ou figure ouverte dans cette passe ; **[A]** déjà consigné dans le dossier, non relu mot à mot ici ; **[D]** algèbre ou lecture du code, sans coefficient nouveau ; **[H]** sensibilité paramétrée, pas une mesure ; **[N]** non obtenu. Un intervalle cité plus bas n'est pas une plage produit.

## 1. Réponse

**Non : l'omission n'est pas justifiée comme négligeable.** Les deux termes peuvent être significatifs, et les sources ouvertes ne bornent pas leur taille sur les constructions de l'application.

- **Portance de toron, acier.** Nebres, Batill et Nelson (1993) mesurent une portance stationnaire sur câbles toronnés inclinés à `Re = 5×10³–5×10⁴`, le domaine des diamètres et vents usuels du moteur. Le texte qui contient `C_l` et `C_dn` n'a pas été obtenu. On sait que la force existe ; on ne sait pas de combien.
- **Traînée axiale.** Aucune mesure ouverte de coefficient axial, pour un 6×19 ou une corde sèche, n'a été lue. L'algèbre suffit pourtant à séparer deux questions : près du vent parallèle, la traînée normale tend vers zéro et la traînée axiale non ; l'erreur relative de l'omission n'est alors pas bornée. L'erreur absolue devant le poids propre peut rester petite, mais seulement pour un coefficient que personne n'a mesuré ici.
- **Textile sec.** Aucune campagne en air sur une corde kernmantel ou tresse isolée, sèche, n'a été ouverte. Les essais en eau ne se transfèrent pas. La corde est en outre beaucoup plus légère que le câble : le même coefficient inconnu pèse davantage devant son poids.

Omettre les deux termes peut rester un choix de version, **nommé et non présenté comme une erreur petite**. Ce n'est pas la conclusion « l'effet est négligeable ». La recommandation L0 de [agent-readiness-aerodynamics.md](agent-readiness-aerodynamics.md) §9, point 2, proposait cette omission ; Q11 ne l'a pas approuvée. La présente note ne la réhabilite pas comme argument de petitesse.

Aucun pourcentage d'erreur sur la tension, la flèche ou la garde n'est donné. Le résoudre exigerait le solveur spatial et un coefficient, et ni l'un ni l'autre n'est validé ici.

## 2. Décisions laissées fermées

Relevé sur [agent-readiness-decisions.md](agent-readiness-decisions.md) et le commentaire consolidé de [#127](https://github.com/fuzoh/simu-tyro/issues/127) du 10 novembre 2026, pas sur les revues d'avant session.

- **Q11 — non tranchée.** Pas d'omission approuvée. Cette note répond à la demande de recherche ; elle ne la clôt pas.
- **Q12 — acceptée.** Le modèle de traînée de descente reste celui de la page Dynamique. L'ellipsoïde ne sert que le vent statique. Une traînée axiale de ligne, si on l'ajoutait, serait une troisième fermeture, pas un remplacement du `C_dA` de descente.
- Vent horizontal seulement. Équilibres statiques à vide et chargé. Pas de retour de la vitesse de descente vers la forme. `#124` reste différée : vibrations, gallop, dénivelé dynamique. Une portance **moyenne** stationnaire n'est pas ce gallop ; la différer ne met pas cette moyenne à zéro.
- Diamètre aérodynamique constant dans chaque calcul. Deux brins : chacun son poids et son vent réparti. Pas de sillage. Pas de facteur de sécurité nouveau, pas de modification du Verdict.

## 3. Trois forces à ne pas confondre

**[D].** Soit `t` la tangente unitaire du brin étiré, `u` la vitesse de l'air relative à l'élément, dirigée vers où l'air va. `θ` est l'angle aigu entre `t` et `u` : `θ = 90°` au travers, `θ = 0°` quand le vent est parallèle à l'axe. `U = |u|`, `U_n = U sin θ`, `U_a = U cos θ`.

```text
u_n = u − (u·t) t                         normale au brin, dans le plan (t, u)
b   = t × u_n / |t × u_n|                 binormale, si u_n ≠ 0
```

| Terme | Direction | Ce que ce n'est pas |
| --- | --- | --- |
| Traînée normale `f_n` | colinéaire à `u_n` | pas la traînée « selon le vent » : la projection sur `u` ajoute un sinus |
| Portance de géométrie `f_L` | colinéaire à `b`, donc orthogonale à `t` et à `u_n` | pas la composante verticale de `f_n` |
| Traînée axiale `f_a` | colinéaire à `t`, opposée à la composante axiale de `u` | pas le frottement de poulie, pas le `C_dA` de descente |

**[D].** La fermeture déjà écrite dans la note [Équilibre spatial sous gravité et vent](../equilibre%20spatial%20vent.md) §3 et la [revue ligne](line-aerodynamics-review.md) §3 est seulement :

```text
f_n = ½ ρ C_D⊥ d |u_n| u_n          N par mètre étiré
```

À `u_n = 0`, elle se prolonge par `f_n = 0`. Cela annule la traînée normale, pas la force aérodynamique totale. `C_D⊥` constant et l'absence de `f_L` et de `f_a` sont des hypothèses.

**[D].** Composante verticale de la traînée normale, déjà dans cette fermeture. Ligne dans le plan vertical A–B, `t = (t_x, 0, t_z)`, vent strictement latéral `u = (0, U, 0)` : `u·t = 0`, donc `f_n` est horizontal. La pente ne crée pas de portance. Après déport, `t_y ≠ 0` peut donner une composante verticale à `f_n`. C'est la projection de la traînée normale, revue ligne §3.3. L'ajouter une seconde fois sous le nom de portance compterait deux fois la même force.

**[D].** La portance de toron n'est pas cette projection. Dans le même cas de contrôle, `t × u = U (−t_z, 0, t_x)`. Une force selon cette binormale a une composante verticale `-U t_z` et une composante selon la portée `U t_x`. Le test `f_n,z = 0` ne la voit pas. Sur une ligne presque horizontale, cette portance est presque verticale : elle change la flèche sans être une traînée de travers. Sur une ligne pentue, elle a aussi une composante le long de la portée. Le sens dépend du commettage, que le Scénario ne porte pas : `6×19` ou âme métallique choisit `K`, pas le sens de toronnage (`src/lib/sim/materials/steel.ts`).

**[D].** Gallop et vibrations. Une portance moyenne qui dépend de l'incidence peut, dans un autre modèle, nourrir un amortissement aérodynamique négatif. C'est `#124`, non traité ici. Les critères de Scruton, FHWA ou Den Hartog ne sont pas des charges statiques. Inversement, refuser le gallop ne justifie pas `C_L = 0` dans l'équilibre.

## 4. Diamètres, vents et Reynolds de l'application

**[P] code.** Bandes et défauts lus dans le moteur, pas des limites aérodynamiques.

| Entrée | Ce que le code tient | Source |
| --- | --- | --- |
| Acier, diamètre nominal | requis, mm ; bande d'avertissement 6–26 mm `[CONVENTION]`, pas un refus | `src/lib/rail/fields.ts` (`d`) ; aide `src/lib/rail/help.ts` |
| Premier lancement | 12 mm, 1770, `6×19` âme métallique, portée 150 m, dénivelé −18 m, vent nul | `src/lib/scenario/first-run.ts` |
| Masse linéique acier | `μ = W d² / 100`, `W = 0,3795`, `d` en mm ; `w = μ g`, `g = 9,81` | `src/lib/sim/materials/steel.ts` |
| Premier lancement, poids | affiché `0,536 daN/m` | `src/lib/scenario/first-run.test.ts` |
| Textile, diamètre | optionnel, non lu par le solveur | `src/lib/sim/types.ts` ; commentaire de `src/lib/sim/materials/textile.ts` |
| Préréglage textile | Courant Bandit 11 mm, `μ = 0,073 kg/m`, fiche `[DATASHEET]` | `src/lib/rail/presets.ts` |
| Vent | vitesse ≥ 0 km/h, sans plafond ni bande d'avertissement | `src/lib/rail/fields.ts` (`windSpeed`) |

**[D].** Poids propre déduit de la formule, pas une pesée. `d` en mm :

```text
6 mm  : μ = 0,13662 kg/m,  w = 1,340 N/m
12 mm : μ = 0,54648 kg/m,  w = 5,361 N/m     (l'affichage arrondit à 0,536 daN/m)
26 mm : μ = 2,56542 kg/m,  w = 25,167 N/m
Bandit 11 mm : w = 0,073 × 9,81 = 0,716 N/m
```

Le 28,3 m/s attribué à EN 15567 dans `docs/simulation-theory.md` est `[PAYWALLED]` / `[UNVERIFIED]`. Il n'est pas une borne du champ Vent. Les 33 m/s cités pour la ligne SSF sont une vitesse de passager, pas un vent de scénario. Les illustrations plus bas prennent 10 m/s et 20 m/s parce que la revue aérodynamique les utilisait déjà, pas parce que le moteur les impose.

**[D].** Reynolds d'illustration, même viscosité que la [revue aérodynamique](agent-readiness-aerodynamics.md) §2 : `ν = 1,5×10⁻⁵ m²/s`, **pas** une atmosphère prescrite. `Re = U d / ν`, `d` en m, `U` vitesse du vent, pas la composante normale.

| d | 5 m/s | 10 m/s | 20 m/s | 30 m/s |
| --- | --- | --- | --- | --- |
| 6 mm | 2,0×10³ | 4,0×10³ | 8,0×10³ | 1,2×10⁴ |
| 11–12 mm | 3,7–4,0×10³ | 7,3–8,0×10³ | 1,5–1,6×10⁴ | 2,2–2,4×10⁴ |
| 26 mm | 8,7×10³ | 1,7×10⁴ | 3,5×10⁴ | 5,2×10⁴ |

Le domaine utile de l'application, pour ces vitesses, est donc surtout `2×10³–5×10⁴`. Le cylindre lisse de 180 mm de Yuan et al. (2025) et la crise vers `Re ≈ 1,6×10⁵` **[A]** sont au-dessus. Pour un câble de 12 mm, `Re = 10⁵` demanderait environ 125 m/s avec ce `ν`. Cela n'exclut pas une crise avancée par la rugosité : Achenbach 1971 reste non relu intégralement **[A]**. Aucun seuil de crise d'un 6×19 de 12 mm n'est donc posé.

## 5. Acier toronné — ce qui est mesuré, et ce qui ne l'est pas

### 5.1 Nebres 1993 — mécanisme dans le Reynolds de l'application, coefficients non lus

**[P], résumé seulement.** J. Nebres, S. Batill et R. Nelson, *Flow about yawed, stranded cables*, Experiments in Fluids 14, 49–58 (1993). DOI [10.1007/BF00196987](https://doi.org/10.1007/BF00196987). Page Springer relue le 10 novembre 2026 : aperçu d'abonnement, bouton d'achat, pas le PDF. La nomenclature en ligne définit `D` par le cercle circonscrit, `C_dn` comme coefficient de traînée normale, `C_l` comme coefficient de portance. Le résumé dit :

- portance stationnaire sur câble toronné incliné, caractère que le cylindre circulaire n'a pas ;
- comparaisons de coefficients de portance et de traînée normale, à partir de pressions, fil chaud et visualisations ;
- modèles rigides, quatre angles de lacet, `Re = 5 000–50 000` ;
- portance dirigée vers le côté où les torons principaux s'alignent davantage avec l'écoulement, produite par une séparation asymétrique ;
- irrégularités des fils dans les torons, effet apparent sur portance et traînée ;
- sillage et détachement différents du cylindre. Le nombre de Strouhal, dans ce régime, ne dépend ni de Reynolds ni de la position le long du câble. Ce dernier point est du détachement tourbillonnaire, renvoyé à `#124`, pas une charge moyenne.

**Aucun chiffre de `C_l` ou `C_dn` n'est dans le résumé.** Le corps, les angles exacts, la construction des éprouvettes et la formule de normalisation n'ont pas été lus. On ne convertit pas ces symboles vers `C_D⊥` de la note. On ne retient pas une borne `C_L = ±0,2` : elle venait d'une attribution bibliographique déjà rejetée **[A]**, revue ligne §7.1.

**[P], résumé d'un autre texte du même groupe.** Nebres, Batill et Nelson, *Wake Studies on Yawed, Stranded Cables*, dans *Low Reynolds Number Aerodynamics*, Lecture Notes in Engineering, DOI [10.1007/978-3-642-84010-4_32](https://doi.org/10.1007/978-3-642-84010-4_32). Page Springer du 10 novembre 2026, aperçu sans PDF. Cinq modèles rigides et un cylindre, soufflerie lente, `Re = 6 000` sur le diamètre. Le résumé dit que le toronnage change le détachement et le proche sillage. Pas de coefficient de force dans ce résumé.

**[N].** La bibliographie de la page 1993 cite, sans que ces documents aient été obtenus :

- J. Nebres, *Flow around yawed stranded cables*, M.S. thesis, University of Notre Dame, 1989 ;
- Batill, Nelson et Nebres, 1988, Naval Coastal Systems Center Contract Report 2201-89-1 ;
- J. Counihan, *Lift and drag measurements on stranded cables*, Imperial College Aeronautics Department Report 117, 1963 ;
- M. P. Schultz, *Wind-tunnel determination of the aerodynamic characteristics of several twisted wire ropes*, David Taylor Model Basin Aerodynamics Laboratory Report 1645, Aero Report 1028, 1962 ;
- essais en soufflerie de câbles de drague de mines, David Taylor Model Basin Report R-312, Aero Report 705, 1949.

Ce sont les tables qu'il faudrait ouvrir avant un défaut numérique. Elles ne sont pas demandées au mainteneur : elles n'ont pas été trouvées en accès ouvert dans cette passe (OpenAlex, NTRS, Archive.org, page Springer). Une absence dans ces requêtes n'est pas une preuve d'absence mondiale.

### 5.2 Ce que les grands câbles de pont ne transfèrent pas

**[P].** Masaru Matsumoto et al., *Dry galloping characteristics and its mechanism of inclined/yawed cables*, manuscrit d'auteur, Kyoto University Research Information Repository, handle `2433/123452`, PDF [bitstreams/9fb533e7-393e-464e-92ba-68a199ce9f9b](https://repository.kulib.kyoto-u.ac.jp/server/api/core/bitstreams/9fb533e7-393e-464e-92ba-68a199ce9f9b/content), lu le 10 novembre 2026. Publié Journal of Wind Engineering and Industrial Aerodynamics, 2010, DOI [10.1016/j.jweia.2009.12.001](https://doi.org/10.1016/j.jweia.2009.12.001). Le manuscrit se dit non la version éditeur.

Ce papier traite le gallop sec de câbles de hauban, donc `#124` pour le mécanisme dynamique. Deux faits statiques y sont quand même lisibles, et ils ne calibrent pas un câble de 12 mm :

- L'« écoulement axial » dont parlent les auteurs est une vitesse dans le sillage, le long du câble, mesurée au fil chaud ou visualisée. Ce n'est pas une force de traînée tangentielle sur le brin.
- Figure 9, **lecture graphique, pas une numérisation de courbe** : modèle à rugosité de surface, `β = 0°` (non lacet dans leur convention de cette figure), `D = 158 mm`, écoulement lisse. En dessous d'environ `Re = 1,0×10⁵`, `C_L` moyen est voisin de zéro et `C_D` voisin de 1,0–1,2. Vers `1,2×10⁵–1,5×10⁵`, `C_L` moyen devient négatif, de l'ordre de −0,3 à −0,4, et `C_D` tombe vers 0,5. Les axes seuls ne sont pas des mesures ; les ordres viennent des nuages de points de la figure rendue.

**Transfert refusé.** Diamètre dix fois plus grand, Reynolds de crise, surface rugueuse non décrite comme un 6×19, incidence perpendiculaire sur cette figure. Le `C_L ≈ 0` subcritique de **cette** figure ne contredit pas Nebres : autre géométrie, autre angle. Il montre seulement que la portance de crise des haubans n'est pas le régime d'un câble de tyrolienne de 6–26 mm aux vents d'illustration.

**[P].** A. Raeesi, S. Cheng et D. S-K. Ting, *Some Insight into the Wind-Induced Vibration of Stay Cables in the Context of Rigid Static Inclined Circular Cylinder*, Journal of Applied Fluid Mechanics 5(2), 99–112 (2012). DOI [10.36884/jafm.5.02.12172](https://doi.org/10.36884/jafm.5.02.12172), PDF ouvert. Tableau 1, essais NRC repris de Cheng et al. : cylindre d'acier **lisse**, diamètre 160 mm (dynamique) et 88,9 mm (pressions statiques), vitesses 10–36 m/s et 10–95 m/s, `Re` de `0,8×10⁵` à `6×10⁵`. Le texte relie une portance moyenne à une bulle de séparation d'un seul côté dans le régime critique, dans une discussion de gallop. Aucun `C_L` moyen n'est recopié d'une figure. Domaine au-dessus du Reynolds d'un 12 mm à 20 m/s (`1,6×10⁴`). Pas un toron.

**[A].** Yuan et al. 2025, cylindre lisse `D = 180 mm`, portance moyenne de section pouvant atteindre environ −1,5 à `β = 30°` dans `1,2×10⁵ < Re < 2,2×10⁵`. Déjà lu dans la revue aérodynamique §3.2. Asymétrie de crise, pas un `C_L` de toron, pas le Reynolds de l'application.

**[P], simulation, pas une mesure.** Lizhong Qi, Meng Wang, Gang Xu et Zhangqi Wang, *Numerical Simulation of Aerodynamic Forces of ACSR Conductor*, ASEI 2015, Atlantis Press, DOI [10.2991/asei-15.2015.375](https://doi.org/10.2991/asei-15.2015.375), PDF ouvert. Conducteur JL1/G3A-1250/70, diamètre extérieur 47,35 mm, 28 fils extérieurs de 4,58 mm. CFD, modèle de turbulence Spalart–Allmaras. Les auteurs écrivent qu'une structure symétrique a une portance moyenne de détachement tourbillonnaire concédée nulle, et que la portance moyenne apparaît s'il y a givre asymétrique. Leur rugosité est un paramètre scalaire, pas un pas d'hélice qui casse la symétrie. Ce calcul ne mesure pas, et ne modélise pas, la portance stationnaire de Nebres. Aucun de leurs `C_D` n'est repris.

**[A].** Liu et al. 2017, conducteurs ACSR, tables de `Cd` seulement, formule (1) illisible. Déjà écarté comme transfert vers un 12 mm. Pas de portance extraite.

### 5.3 Eau, pas air

**[P], résumé OpenAlex, corps non ouvert.** K. J. Horton, C. M. Ferrer et K. P. Watson, *Measurements of the Hydrodynamic Characteristics of Stranded Cables*, OTC 5521, 1987. DOI [10.4043/5521-MS](https://doi.org/10.4043/5521-MS). OpenAlex ne liste pas D. Charvoz parmi les trois premiers auteurs ; la bibliographie de Nebres 1993 cite un mémo NCSC des mêmes essais avec ce quatrième nom. Ce mémo n'a pas été ouvert. PDF non obtenu. OpenAlex indique `is_oa = false` ; la requête Unpaywall de cette passe a répondu 422, sans copie. OnePetro non lu. Le résumé dit : bassin de traction, cinq câbles toronnés, échantillons de 14 pieds, 2 à 10 nœuds, lacet 20° à 90°, fonctions de charge de portance et de traînée tirées des forces moyennes. Les nombres de ces fonctions ne sont pas dans le résumé ouvert. C'est de l'eau, avec strumming possible. Pas un coefficient d'air.

## 6. Textile sec — lacune, pas un proxy

**[P] requête, pas une preuve d'absence mondiale.** Aucun PDF d'une corde kernmantel sèche, isolée, en air, n'a été ouvert. La requête OpenAlex « kernmantel rope aerodynamic drag » était déjà vide le 10 novembre 2026 **[A]**. Cette passe n'a pas trouvé davantage de campagne en air sur une EN 1891 ou une tresse HMPE de tyrolienne.

**[A].** Tang et al. 2019, filets en eau, déjà refusés comme transfert par la revue ligne §4.4. Panneau, pas un brin isolé ; eau, pas air.

**[P], résumé seulement.** Gebremeskel Eshetu Kebede et al., *Flume tank evaluation of the hydrodynamic lift and drag of helix ropes compared to conventional ropes used in midwater trawls*, Ocean Engineering 2019, DOI [10.1016/j.oceaneng.2019.106674](https://doi.org/10.1016/j.oceaneng.2019.106674). Résumé OpenAlex lu ; le PDF ScienceDirect a répondu 403. Canal, cordes tressées et torsadées de 6, 8, 9 et 14 mm. La série principale est à 0,5, 0,7 et 0,9 m/s ; le résumé ajoute 0,3–0,9 m/s pour les 14 mm. Angles d'attaque 0°, 12°, 20°, 45°, 61° et 90°. Portance et traînée mesurées, y compris sur des cordes PE et PA « conventionnelles » et sur des cordes hélicoïdales faites pour s'écarter. Aucun coefficient n'est dans le résumé. Même si le PDF s'ouvrait, ce serait de l'eau, des cordes de chalut, pas une corde de tyrolienne sèche. Le Reynolds d'eau à 0,5 m/s sur 10 mm est de l'ordre de celui de l'air à quelques mètres par seconde, et cela ne suffit pas : mouillage, porosité, rigidité et état de surface ne sont pas semblables. Revue ligne §4.4, même réserve.

**[D].** Le préréglage Bandit donne un diamètre et une masse, pas une polaire. Inventer `C_L = 0` parce que la gaine est « équilibrée » est l'hypothèse déjà refusée par la revue ligne §4.4. Une tresse peut encore porter une force latérale si le pas n'est pas neutre vis-à-vis de l'écoulement, et surtout une traînée axiale. Rien d'ouvert ne le quantifie.

## 7. Traînée axiale — relative et absolue

### 7.1 Ce qui a été ouvert

**[N].** Hoerner, *Fluid-Dynamic Drag*, et les feuilles ESDU sur le cylindre incliné : non ouverts. Aucun `C_f` n'en est recopié de mémoire. Bursnall et Loftin, NACA TN 2463, déjà lus **[A]**, intègrent des pressions, pas un frottement axial.

**[P], résumé NTRS seulement.** T. C. Cannon et J. Genin, *Equilibrium configuration and tensions of a flexible cable in a uniform flowfield*, Journal of Aircraft, 1967. Notice [NTRS 19670048858](https://ntrs.nasa.gov/api/citations/19670048858) : le résumé dit que l'équilibre tient compte de la traînée tangentielle et du poids. `downloadsAvailable` est faux. DOI [10.2514/3.43820](https://doi.org/10.2514/3.43820), corps non ouvert. Preuve qu'un modèle de câble remorqué incluait le terme, pas un coefficient.

**[P].** S-W. Kang et V. R. Latorre, *Aerodynamics Modeling of Towed-Cable Dynamics*, UCRL-ID-106509, 17 janvier 1991. PDF [OSTI 5993644](https://www.osti.gov/servlets/purl/5993644), 46 pages, lu. Tableau A.II, page scannée vérifiée à l'image, entrée du code TOWDYN pour un câble nu d'acier de 4 mm :

```text
DRAG=1.07
NORMAL=[SIN(T)**2]
TANGENTIAL=.001
```

Le lest, sur la même page, a `TANGENTIAL=.02`. Le tableau récapitulatif OCR mélange les deux ; l'image de la liste d'entrée ne le fait pas. **Ce 0,001 n'est pas une mesure.** Le rapport ne cite pas, sur cette page, l'essai dont il viendrait, et il ne définit pas si `TANGENTIAL` multiplie `DRAG`, s'il est un `C_t` sur `d`, ou un `C_f` sur `π d`. Le §2.4 dit au contraire que les expressions de traînée publiées varient beaucoup et qu'il faudrait un coefficient plus sûr. On ne transporte pas 0,001, ni 1,07, vers une tyrolienne.

### 7.2 Algèbre, sans coefficient produit

**[D].** Deux définitions possibles, à ne pas mélanger. Les deux utilisent la pression dynamique de la composante qui les porte. `f` en N par mètre étiré.

```text
f_n = ½ ρ C_D⊥ d U² sin²θ          direction de u_n
f_a = ½ ρ C_t  d U² cos²θ          définition sur le diamètre, direction −signe(u·t) t
f_a = ½ ρ C_f (π d) U² cos²θ       définition sur le périmètre mouillé
```

Rapport des modules, si les deux coefficients sont ceux de ces lignes :

```text
|f_a| / |f_n| = (C_t / C_D⊥) cot²θ
|f_a| / |f_n| = (π C_f / C_D⊥) cot²θ
```

À `θ = 90°`, `f_a = 0` dans cette fermeture. Le frottement de peau du travers est déjà dans `C_D⊥`, pas un terme axial en plus. À `θ → 0`, `f_n → 0` et `f_a` tend vers `½ ρ C_t d U²` ou `½ ρ C_f π d U²`, qui ne s'annule pas avec `θ`. **L'erreur relative de l'omission n'a pas de borne quand on s'approche du vent axial.** L'erreur absolue, elle, suit `C_t` ou `C_f`, inconnus.

`cot²θ` vaut 1 à 45°, 3 à 30°, 14 à 15°, 32 à 10°, 66 à 7°, 131 à 5°. Un coefficient axial petit devant `C_D⊥` peut donc dépasser la traînée normale restante sans être grand devant le poids.

**[D], géométrie du premier lancement, pas une incidence locale résolue.** Corde A–B : `√(150² + 18²) = 151,08 m`, pente `arctan(18/150) = 6,84°`. Un vent horizontal le long de A–B fait donc 6,84° avec la **corde**, pas avec la tangente. La flèche affichée est 6,00 m (`first-run.test.ts`). L'écart tangente–corde est de cet ordre, pas calculé ici sous vent. On n'appelle pas 6,84° l'incidence du brin. On retient seulement que le vent de face sur cette ligne tendue est un petit `θ`, le cas où la distinction relative / absolue compte, pas un travers.

## 8. Charges d'illustration devant le poids propre

**[D] pour la colonne « par unité de coefficient » ; [H] si l'on multiplie par un coefficient choisi.** `ρ = 1,225 kg/m³`, la valeur mer que le moteur prend sans profil (`src/lib/rail/help.ts`, entrée `rho`). Ce n'est pas une atmosphère de site. Force par mètre étiré, vent de module `U`, coefficient défini sur `d` et sur `U²` :

```text
q_d = ½ ρ d U²          N/m par unité de coefficient
```

| Cas | `q_d` | Poids `w` | `q_d / w` |
| --- | --- | --- | --- |
| Acier 12 mm, 10 m/s | 0,735 N/m | 5,361 N/m | 0,137 |
| Acier 12 mm, 20 m/s | 2,940 N/m | 5,361 N/m | 0,548 |
| Acier 6 mm, 10 m/s | 0,368 N/m | 1,340 N/m | 0,274 |
| Acier 26 mm, 20 m/s | 6,370 N/m | 25,167 N/m | 0,253 |
| Bandit 11 mm, 10 m/s | 0,674 N/m | 0,716 N/m | 0,941 |
| Bandit 11 mm, 20 m/s | 2,695 N/m | 0,716 N/m | 3,76 |

Lecture : à coefficient 1 et au travers, la force normale illustrée est 14 % du poids d'un 12 mm à 10 m/s, et de l'ordre du poids propre de la corde Bandit. Ce coefficient 1 n'est pas un `C_D⊥` produit. C'est le même ordre que l'exemple déjà écrit dans la revue aérodynamique §3.4 (`0,735 N/m`, environ 110 N sur 150 m droits). **150 m droits ne sont pas la chaînette chargée.** `110 N` n'est pas une variation de tension d'ancrage.

**[H].** Portance, même normalisation, au travers (`sin θ = 1`) : `|f_L| = |C_L| q_d`. Sans mesure de `C_L`, la seule phrase défendable est : chaque dixième de `C_L` vaut 0,0735 N/m sur le 12 mm à 10 m/s, soit 1,4 % de son poids, et 0,0674 N/m sur le Bandit, soit 9,4 % du poids de la corde. Un `C_L` d'ordre 1, non exclu par les sources ouvertes, serait du même ordre que la traînée normale illustrée, donc petit devant la rupture du câble du premier lancement (`MBF` dérivé 90 740 N, soit 9 074 daN affichés) et pas forcément petit devant la forme. Sur la corde, il serait du même ordre que le poids propre. **Ce n'est pas une prédiction. C'est l'échelle qu'un coefficient non lu aurait.**

**[H].** Traînée axiale sur `d`, vent parallèle : `|f_a| = |C_t| q_d`. Même échelle. À `θ = 7°`, `sin²θ = 0,0149` et `cos²θ = 0,985`. La traînée normale illustrée à `C_D⊥ = 1` tombe à `0,0109 N/m` sur le 12 mm à 10 m/s, soit 0,20 % du poids. La traînée axiale reste `0,985 C_t q_d`. Elle égale cette traînée normale restante si `C_t / C_D⊥ ≈ 0,015`. Ce seuil est de l'algèbre, pas un `C_t` mesuré. Il dit : un coefficient axial que l'on jugerait « petit » au travers peut dominer la charge aérodynamique résiduelle par vent de face, tout en restant, sur l'acier à 10 m/s, une petite fraction du poids **si** `C_t` est lui-même de l'ordre de quelques centièmes. Les sources ouvertes ne disent pas s'il l'est.

Sur le Bandit à 20 m/s, `q_d` vaut déjà 3,8 fois le poids. L'inconnu y est plus lourd, au sens du rapport à `w`, que sur le 12 mm.

## 9. Ce que l'évidence ne borne pas

- `C_L` et `C_D⊥` d'un 6×19 ou d'un 6×36, à 6–26 mm, dans `Re = 2×10³–5×10⁴`, à un angle donné. Nebres établit le mécanisme et le domaine, pas le nombre.
- Le sens de cette portance dans l'application : il suit le commettage, absent du Scénario.
- `C_t` ou `C_f` d'un câble toronné et d'une corde sèche. Le 0,001 de Kang et Latorre n'est pas cette mesure, et son aire de référence n'est pas écrite.
- Le déplacement de la crise par la rugosité d'un toron de 12 mm. Non démontré, non exclu.
- Toute erreur de tension, de flèche, d'écart à A–B ou de garde. La charge illustrée est une densité de force, pas le résultat d'un équilibre. Une force petite devant `MBF` peut encore déplacer le point bas hors du plan. « Petite devant la rupture » n'est pas « petite devant la garde ».
- Un signe uniforme de l'erreur. Selon le sens du toron et l'azimut du vent, la portance peut augmenter ou réduire la flèche, ou déporter la ligne. Omettre n'est pas conservatif au sens du Verdict.

## 10. Recommandation

**Ne pas traiter l'omission comme justifiée par la petitesse de l'effet.** Les deux termes méritaient cette recherche. Elle montre un mécanisme mesuré dans le Reynolds de l'application, une singularité relative au vent presque axial, et une corde trop légère et trop peu documentée pour que l'inconnu soit déclaré sans suite.

### Ce qui peut se coder sans nouveau coefficient, si le mainteneur l'accepte comme trou et non comme négligence

1. Garder `f_n` comme seule force de ligne par défaut, et écrire dans l'hypothèse que `f_L` et `f_a` sont omis, non nuls mesurés. Le test `f_n,z = 0` au travers sur une ligne dans le plan vertical reste un test de cette fermeture, pas un test de portance nulle.
2. Ne pas en déduire une erreur de garde ou de tension. Ne pas toucher au Verdict, aux facteurs, ni au `C_dA` de descente (Q12).
3. Ne pas importer un `C_L` de hauban, de CFD symétrique, ou de bassin.

### Option statique abordable, sans défaut produit

Un terme de sensibilité, pas une valeur expédiée :

```text
f_L = ½ ρ C_L d |u_n|² b                 b = t × u_n / |t × u_n|,   0 si u_n = 0
f_a = −½ ρ C_t d |u·t| (u·t) t         0 si u·t = 0
```

`f_a` est quadratique : son module est `½ ρ C_t d |u·t|²`, et le signe s'oppose à la composante axiale de `u`. Ce n'est pas un frottement linéaire en vitesse. Si l'aire de référence était `π d`, le même `½ ρ` serait multiplié par `C_f π d`, pas par `C_t d`.

`C_L` et `C_t` seraient des sondes, nulles seulement comme cas de référence nommé « omission », pas comme physique. Le signe de `C_L` ne se déduit pas de `construction`. Tant que le sens de toronnage n'est pas une entrée, une portance signée ne peut pas être orientée ; une sonde en valeur absolue, ou deux signes, est le maximum honnête. `C_t` doit déclarer son aire (`d` ou `π d`). Aucun des deux nombres ne vient de cette note.

Cela reste une charge statique moyenne. Ce n'est pas un modèle de gallop, pas une loi `C_D⊥(Re)`, pas un couplage à la descente.

### Données encore nécessaires avant un nombre par défaut

Dans l'ordre utile : le corps de Nebres, Batill et Nelson 1993, ou la thèse Notre Dame 1989 ; Schultz 1962 (Aero Report 1028) ; Counihan 1963. Pour la corde, une mesure en air sur kernmantel sec ou tresse HMPE, diamètre voisin de 10–13 mm, `Re` de quelques milliers à quelques dizaines de milliers, forces normale, binormale et axiale, angle défini comme ici. Hoerner et ESDU restent à ouvrir avant d'en citer une formule de frottement. Horton 1987, s'il s'ouvre, reste un essai en eau.

Tant que ces tables ne sont pas lues, **aucune borne numérique de l'erreur d'omission n'est défendable.** La seule borne acquise est qualitative : l'omission est petite devant le poids d'acier, aux vents modérés, **seulement si** les coefficients inconnus sont eux-mêmes petits devant 1. Cette condition n'est pas démontrée pour la portance de toron. Elle est plausible pour un frottement axial de peau, et non établie.

## 11. Sources ouvertes dans cette passe

| Source | Accès le 10 novembre 2026 | Usage |
| --- | --- | --- |
| Nebres, Batill et Nelson 1993, DOI [10.1007/BF00196987](https://doi.org/10.1007/BF00196987) | **[P]** résumé et nomenclature Springer ; PDF d'abonnement non obtenu. Unpaywall plus tôt le même jour : non OA | Mécanisme et domaine Reynolds. Pas de coefficient |
| Nebres, Batill et Nelson 1989, DOI [10.1007/978-3-642-84010-4_32](https://doi.org/10.1007/978-3-642-84010-4_32) | **[P]** résumé Springer ; aperçu PDF indisponible | `Re = 6 000`, effet de toron sur le sillage. Pas de force |
| Matsumoto et al. 2010, handle Kyoto `2433/123452`, DOI [10.1016/j.jweia.2009.12.001](https://doi.org/10.1016/j.jweia.2009.12.001) | **[P]** manuscrit PDF, figure 9 lue graphiquement | Contraste hauban / crise. Pas un 12 mm. Gallop hors Q11 |
| Raeesi, Cheng et Ting 2012, DOI [10.36884/jafm.5.02.12172](https://doi.org/10.36884/jafm.5.02.12172) | **[P]** PDF, tableau 1 | Cylindre lisse 89–160 mm, `Re ≥ 0,8×10⁵`. Pas transféré |
| Qi et al. 2015, DOI [10.2991/asei-15.2015.375](https://doi.org/10.2991/asei-15.2015.375) | **[P]** PDF | CFD symétrique, portance moyenne de détachement concédée nulle. Pas une mesure de toron |
| Kang et Latorre 1991, [OSTI 5993644](https://www.osti.gov/servlets/purl/5993644) | **[P]** PDF, tableau A.II vérifié sur image | Entrée de code `TANGENTIAL=.001`, non une mesure, aire non définie |
| Cannon et Genin 1967, [NTRS 19670048858](https://ntrs.nasa.gov/api/citations/19670048858) | **[P]** notice ; PDF non distribué | Le modèle inclut la traînée tangentielle. Pas de coefficient |
| Horton et al. 1987, DOI [10.4043/5521-MS](https://doi.org/10.4043/5521-MS) | **[P]** résumé OpenAlex ; corps **[N]** | Eau, fonctions de portance et traînée annoncées, nombres non lus |
| Kebede et al. 2019, DOI [10.1016/j.oceaneng.2019.106674](https://doi.org/10.1016/j.oceaneng.2019.106674) | **[P]** résumé ; PDF 403 | Eau, cordes de chalut. Non transféré |
| Code moteur | **[P]** fichiers cités au §4 | Diamètres, poids, vent sans plafond |
| Yuan 2025, Liu 2017, Bursnall et Loftin 1951, Tang et al. 2019, Achenbach 1971 | **[A]** dossier déjà archivé | Réemployés avec leurs limites. Pas de coefficient nouveau |
| Nebres 1989 thèse, Counihan 1963, Schultz 1962, DTMB R-312, Hoerner, ESDU, corps de Genin et Cannon | **[N]** | Aucun tableau recopié |

Une passe automatique large de littérature a échoué (erreur du service, pas un corpus vide). Les absences ci-dessus sont celles des consultations directes, pas celles de cette passe ratée.

Les calculs du §8 sont de l'arithmétique sur `ρ`, `d`, `U` et les formules de `steel.ts` / `presets.ts`. Ils ne sont pas une exécution du solveur, ni une mesure de tyrolienne.
