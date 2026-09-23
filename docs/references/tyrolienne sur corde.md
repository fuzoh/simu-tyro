# État de l'Art et Ingénierie des Tyroliennes sur Corde de Grande Portée (+50m)

Les tyroliennes sur corde de grande portée — définies par des longueurs franchissant 50 mètres et pouvant atteindre plusieurs centaines de mètres, voire plusieurs kilomètres dans le cadre de secours complexes ou d'essais d'ingénierie — représentent l'une des applications les plus exigeantes de la mécanique des cordes et du rigging technique. L'établissement de ces structures temporaires exige une maîtrise rigoureuse de la statique vectorielle, de la résistance des matériaux textiles et métalliques, ainsi que des cadres réglementaires encadrant le travail en hauteur et le secours technique.

## 1. Cadre Normatif, Directives et Ressources Technologiques

L'ingénierie des tyroliennes repose sur un corpus normatif strict et des travaux de recherche conduits par des organismes spécialisés et des équipementiers de référence.

#### Normes Européennes Applicables

Le choix des composants doit répondre aux exigences des standards industriels et de secours :

- **Cordes semi-statiques (EN 1891)** : Les cordes tressées gainées à faible coefficient d'allongement de Type A (diamètre de 10 à 11 mm) constituent la référence requise pour assurer la fonction de ligne porteuse 1 .
- **Poulies (EN 12278)** : Réglemente la conception, la profondeur de gorge du réa, le diamètre du point d'attache (minimum 12 mm) et les essais de charge mécanique.
- **Dispositifs d'ancrage (EN 795)** : Définition des exigences pour les points d'ancrage fixes et temporaires (notamment les lignes de vie de Type C et répartiteurs) devant offrir des résistances statiques élevées (minimum 15 kN par système).
- **Descendeurs et appareils autobloquants (EN 12841 / EN 341)** : Encadre les équipements utilisés pour la mise en tension, le réglage et le débrayage sous charge.

#### Ressources et Organismes de Référence

La littérature technique et l'expérimentation pratique s'appuient principalement sur deux piliers institutionnels :

- **La Cellule de Veille Technologique (CVT) du Spéléo Secours Français (SSF)** : Organisme pionnier dans l'expérimentation des tyroliennes textiles sur corde unique de très longue portée, ayant développé des méthodes d'instrumentation et des modèles prédictifs spécifiques.
- **Les Référentiels Techniques Petzl (Tech Tips)** : Documentation d'ingénierie traitant des efforts aux ancrages, de la flèche résiduelle, du comportement des descendeurs (RIG, I'D, MAESTRO) sous tension et des limites opérationnelles des mouflages.
- **Logiciels de Modélisation (ex. GHTyro)** : Outils informatiques développés pour calculer numériquement le profil caténaire, la flèche sous charge et les efforts résiduels aux ancrages en fonction des dénivelés et des spécifications physiques des cordes.

## 2. Spécifications Matérielles et Compatibilité des Équipements

La sélection des matériaux pour une tyrolienne de plus de 50 mètres exige une analyse stricte du rapport entre élasticité, résistance à la rupture, comportement thermique et masse linéique.

#### Cordes Porteuses

Les cordes semi-statiques de Type A en polyamide ou polyester sont privilégiées. Une corde standard de 10,5 mm présente une résistance à la rupture avec nœud d'environ 31 kN, un allongement statique faible (environ 3 % entre 50 et 150 kg) et une masse linéique d'environ 74 g/m. Pour les installations d'urgence spéléologique ou d'accès léger, des cordes de 9 mm à 10 mm sont parfois employées pour réduire le volume du sac d'équipement, sous réserve d'un contrôle strict des tensions initiales et d'une analyse des facteurs de sécurité.

#### Poulies de Roulage et de Mouflage

Pour le déplacement de la charge sur le brin porteur, le rendement des poulies est critique pour éviter le blocage à mi-parcours. Les poulies doubles à haut rendement intégrées sur roulements à billes étanches (ex. Petzl TANDEM SPEED, REEVE) garantissent un déroulement fluide et évitent l'échauffement thermique des réas sous grande vitesse. Pour les systèmes de mouflage et d'ancrage débrayable, l'usage de poulies-bloqueurs doubles (ex. TWIN RELEASE) ou de répartiteurs mobiles est préconisé.

#### Appareils Anti-Retour et de Tension

L'usage de bloqueurs mécaniques à dents (type ascendeurs de poignée ou poulies autobloquantes rigides) est proscrit en tête de tension en raison du risque de sectionnement de la gaine en cas de surtension dynamique. Les descendeurs auto-freinants à came progressive (Petzl RIG, I'D, MAESTRO) sont retenus car ils agissent comme des fusibles mécaniques, autorisant un glissement contrôlé de la corde lors de pics de charge exceptionnels.

| Équipement | Norme / Certification | Spécifications Techniques Minimales | Rôle Opérationnel dans la Tyrolienne |
| --- | --- | --- | --- |
| Corde Porteuse | EN 1891 Type A | Semi-statique, Ø 10,5 à 11 mm, Rupture > 30 kN, Allongement < 3,5% | Support structural du déplacement de la charge |
| Poulie de Chariot | EN 12278 | Double réa en acier/aluminium, roulements à billes, rendement > 90% | Coulissement fluide de la charge le me long de la ligne |
| Appareil Anti-Retour | EN 12841 Type C / EN 341 | Descendeur à came auto-freinante (ex. MAESTRO, I'D, RIG) | Tension initiale, blocage et débrayage sous charge |
| Ancrages Structuraux | EN 795 Type B/C | Résistance statique minimale de 15 kN par point (ou 3 points répartis) | Reprise des efforts vectoriels aux extrémités |
| Kit de Mouflage | EN 358 / EN 12278 | Démultiplication 4:1 ou 3:1 (ex. JAG SYSTEM), cordelette 8 mm | Application dosée de la pré-tension manuelle |

## 3. Physique du Système, Biomécanique et Tension Vectorielle

La physique d'une tyrolienne sur corde est régie par les équations de la caténaire modifiée sous charge ponctuelle. L'analyse des interactions entre la tension initiale, la flèche sous charge et les contraintes vectorielles transmises aux ancrages démontre la nécessité d'un dosage précis de la pré-tension.

#### Formulations Mathématiques et Vectorielles

La tension horizontale $T_h$ générée aux ancrages par une corde sous pré-tension, sollicitée par une charge suspendue $P$ au milieu d'une portée de longueur $L$, subissant une flèche $f$, s'exprime par la relation vectorielle :

$$
T_h \approx \frac{P \cdot L}{4 \cdot f} + \frac{q \cdot L^2}{8 \cdot f}
$$
Où :

- $P$ est la charge suspendue exprimée en Newtons (N).
- $L$ est la portée horizontale entre les amarrages en mètres (m).
- $f$ est la flèche totale sous charge au centre de la portée en mètres (m).
- $q$ est le poids linéique de la corde en Newtons par mètre (N/m).

Cette formulation confirme la non-linéarité des efforts : lorsque la flèche $f$ tend vers zéro (ligne tendue à l'extrême), la tension $T_h$ tend théoriquement vers l'infini. Vouloir supprimer la flèche d'une tyrolienne de grande portée entraîne une augmentation exponentielle des forces appliquées sur les amarrages, les connecteurs et la structure de la corde.

#### Effet des Charges Statiques et Dynamiques

Les essais mécaniques en laboratoire et sur le terrain démontrent que la charge totale appliquée sur les ancrages lors du passage d'un utilisateur ou d'une civière correspond à la somme de la tension initiale et de $100\,\%$ à $130\,\%$ de la masse suspendue.

Une pré-tension manuelle appliquée par une personne tirant sur un mouflage de rapport 3:1 génère un effort initial de l'ordre de 1,5 kN à 2 kN. Sur un mouflage 5:1 ou lors d'une traction directe par deux personnes, cet effort atteint 3,5 kN. Une tension initiale inférieure à 2 kN est officiellement recommandée pour maintenir la débrayabilité du système et préserver les ancrages. Un sur-tendeur réglé à des valeurs élevées (supérieures à 5 kN) ne réduit la flèche que de 60 à 80 cm sur de longues portées, tout en multipliant dangereusement les contraintes structurales.

La mise en tension d'une tyrolienne textile à l'aide d'un treuil mécanique, d'un tire-fort ou d'un véhicule motorisé est strictement proscrite. Ces dispositifs anéantissent le dynamisme naturel du support et mènent directement à la rupture de la corde ou à l'arrachement des ancrages.

#### Le Glissement de Corde comme Fusible Mécanique

Lorsque le descendeur autobloquant (RIG, I'D ou MAESTRO) est utilisé comme tête de tension, la came mécanique de l'appareil est conçue pour laisser glisser la corde sous un seuil de charge critique situé entre 4 kN et 6 kN selon le modèle et le diamètre du support. Ce glissement dynamique amortit le choc direct subi par l'ancrage lors d'une surcharge ponctuelle.

| Dispositif d'Ancrage / Descendeur | Seuil de Glissement de Corde | Effort Max de Débrayage Aisé | Capacité de Charge Utile Max | Diamètres de Corde Compatibles |
| --- | --- | --- | --- | --- |
| Petzl RIG | 4,0 – 5,0 kN | $< 5,0\text{ kN}$ (Au-delà, poignée très dure) | Charge légère (1 à 2 personnes) | 10,0 – 11,5 mm |
| Petzl I'D S / I'D EVAC | 5,0 – 6,0 kN | $< 5,0\text{ kN}$ | 250 kg | 10,0 – 11,5 mm |
| Petzl MAESTRO S | Intégré progressif | Débrayage sous charge optimisé | 250 kg | 10,5 – 11,5 mm |
| Petzl MAESTRO L | Intégré progressif | Débrayage sous charge optimisé | 280 kg | 12,5 – 13,0 mm |

## 4. Architectures de Montage et Protocole de Rigging (+50m)

L'installation d'une tyrolienne sur corde de plus de 50 mètres répond à une séquence de montage rigoureuse comprenant la construction des ancrages, la configuration du brin porteur et la mise en place de la tête de tension débrayable.

#### Ancrages Structuraux et Répartiteurs de Charge

À chaque extrémité de la tyrolienne, les ancrages doivent présenter une résistance statique irréprochable pour supporter la combinaison des forces vectorielles et des surtensions dynamiques. La pratique du secours et du rigging impose la réalisation d'un amarrage maître reposant sur au moins trois points d'ancrage distincts et indépendants, reliés par un répartiteur de charge en anneau de corde EN 1891 ou en sangle haute résistance.

L'angle formé au sommet du répartiteur doit être le plus fermé possible (idéalement inférieur à $30^\circ$) pour éviter de multiplier la charge appliquée sur chaque point individuel. Les connecteurs insérés dans le répartiteur doivent être des mousquetons de Type B à verrouillage automatique à trois actions (ex. TRIACT-LOCK) ou des maillons rapides en acier.

#### La Révolution de la Corde Unique

Historiquement, les protocoles imposaient l'utilisation de deux cordes parallèles (une corde porteuse et une corde de contre-assurage). Les campagnes d'essais mécaniques conduites par le Spéléo Secours Français ont démontré qu'une tyrolienne installée sur une corde porteuse unique de haute qualité offre une marge de sécurité absolue, à condition d'utiliser un appareil autobloquant régulateur en tête de tension et de respecter une tension résiduelle modérée. L'abandon de la seconde corde réduit le poids du matériel transporté et accélère le déploiement en milieu difficile. En contexte industriel ou de travaux acrobatiques hors secours, la redondance par ligne de sécurité secondaire reste encadrée par le code du travail et les réglementations sectorielles applicables.

#### Configuration de la Tête de Tension Débrayable

Pour autoriser le réglage de la tension et permettre le débrayage sous charge (pour faire descendre la victime ou détendre le système), la tête de tension s'articule autour d'une chaîne fonctionnelle spécifique.

Le descendeur auto-freinant (MAESTRO, I'D ou RIG) est raccordé directement au connecteur central du répartiteur d'ancrage. Un système démultiplicateur mobile (un mouflage 3:1 Z-Rig ou un kit pré-assemblé 4:1 type JAG SYSTEM) est ensuite verrouillé temporairement sur la corde active au moyen d'un bloqueur à came lisse ou d'un nœud auto-bloquant textile.

La pré-tension est exercée exclusivement à la force des bras par un ou deux opérateurs jusqu'à l'obtention d'une tension initiale comprise entre 1,5 kN et 3,5 kN, le descendeur avalant le mou au fur et à mesure de la traction. Une fois cette tension atteinte, la poignée de l'appareil est verrouillée en position d'arrêt (système AUTO-LOCK).

Un nœud de mule de sécurité doit impérativement être confectionné sur le brin libre, positionné à une distance minimale de 1 mètre du descendeur. Cet espace de 1 mètre préserve la capacité de la corde à glisser dans l'appareil en cas de choc dynamique brutal pour absorber l'énergie, tout en stoppant mécaniquement un glissement prolongé.

## 5. Spécificités des Tyroliennes Ultra-Longues (+50m à +2000m+)

Le franchissement de portées exceptionnelles — telles que les réalisations expérimentales et de secours du SSF à l'exemple du record du Vercors (1 122 m de portée et 240 m de dénivelé en 2008), de Millau (2 205 m en 2013) et de Saint-Martory (800 m en 2024) — introduit des contraintes physiques, aérodynamiques et logistiques spécifiques.

#### Logistique de Déploiement et Profil Topographique

La masse totale d'une corde semi-statique de 10,5 mm d'un seul tenant dépassant 75 kg pour 1 000 mètres de portée, l'acheminement manuel à travers des zones escarpées devient complexe. L'usage de l'hélicoptère ou de drones pour le déroulement des lignes pilotes textiles est privilégié afin d'éviter les ragages et les détériorations de la gaine contre le rocher ou les arbres.

Le profil topographique doit présenter un dénivelé suffisant pour compenser le poids propre du brin textile et la résistance de l'air. L'altitude des points de départ et d'arrivée doit garantir un tirant d'air suffisant au point le plus bas de la flèche caténaire. Le survol d'infrastructures électriques, routières ou habitées nécessite des dispositions de protection et des autorisations réglementaires préalables.

#### Dynamique et Dissipation Thermique

Sur des tyroliennes obliques de grande portée, la vitesse atteinte par le chariot mobile peut varier entre 70 et 120 km/h.

La friction générée par la rotation des réas à très haute vitesse provoque un échauffement thermique susceptible d'altérer la structure polymère des fibres de la corde. L'emploi de poulies de chariot spécialement instrumentées, équipées de roulements à billes de haute précision et de corps en aluminium à haute dissipation, est indispensable.

L'énergie cinétique accumulée exige l'installation d'un dispositif de freinage progressif au point bas. Des systèmes de contre-assurage dynamique régulés depuis l'amarrage d'arrivée ou des cibles d'impact absorbantes permettent de stopper la charge en sécurité sans induire d'arrêt instantané traumatisant pour les équipements.

## 6. Conclusions et Recommandations Opérationnelles

L'analyse de l'état de l'art des tyroliennes sur corde de portée supérieure à 50 mètres permet de dégager les recommandations fondamentales suivantes pour la conception et l'exécution des montages :

- **Strict Contrôle de la Tension Initiale** : Conserver une pré-tension manuelle modérée (idéalement inférieure à 2 kN et ne dépassant pas 3,5 kN), obtenue par la traction d'une ou deux personnes sur un mouflage 3:1 ou 4:1. Proscrire définitivement tout moyen de tension mécanique externe (treuils, véhicules).
- **Garantie de Débrayabilité** : Utiliser exclusivement des descendeurs auto-freinants certifiés (MAESTRO, I'D, RIG) comme organes d'ancrage et de tension, permettant d'abaisser ou d'évacuer la charge sous tension à tout moment.
- **Placement du Nœud d'Arrêt** : Réaliser systématiquement un nœud de mule sur le brin libre du descendeur en respectant une distance d'au moins 1 mètre par rapport à l'appareil pour préserver la fonction de fusible dynamique en cas de choc.
- **Ancrages Tri-Points Équilibrés** : Implanter des amarrages structuraux tri-points à chaque extrémité, reliés par des répartiteurs dont l'angle au sommet est inférieur à $30^\circ$, garantissant une résistance statique minimale de 15 kN par système.
- **Sélection Matérielle Certifiée** : Employer des cordes semi-statiques EN 1891 Type A de 10,5 mm à 11 mm et des poulies à haut rendement EN 12278 adaptées à la vitesse et à la charge prévues.
- **Gestion du Tirant d'Air et Démontage Immédiat** : Modéliser et vérifier la flèche sous charge pour éviter toute collision. Ne jamais laisser une installation textile sous tension prolongée hors surveillance, et procéder à son démontage dès la fin des opérations.
