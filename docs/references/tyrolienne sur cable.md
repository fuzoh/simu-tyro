# État de l'Art et Ingénierie des Tyroliennes sur Câble Acier de Longue Portée (>50 m) : Normes, Matériaux, Dimensionnement et Montages

L'ingénierie des tyroliennes à grande portée (supérieure à 50 mètres) repose sur une convergence d'exigences normatives, de mécanique des structures, de science des matériaux et de gestion opérationnelle des risques. La conception de ces systèmes – qu'ils soient fixes en Parc Acrobatique en Hauteur (PAH) ou temporaires/mobiles – exige un niveau de précision rigoureux afin de concilier la vitesse des usagers, la maîtrise des forces dynamiques et la pérennité des ancrages.

## 1. Cadre Réglementaire, Normes et Coefficients de Sécurité

La réalisation et l'exploitation d'une tyrolienne sur câble métallique s'inscrivent dans un cadre normatif harmonisé à l'échelle européenne, principalement régi par la norme NF EN 15567 (déclinée en parties 1 et 2) et complété par des normes spécifiques relatives aux câbles d'acier et aux composants d'assurage.

#### Architecture Normative

- **NF EN 15567-1 (Conception et Construction)** : Rédigée à l'intention des concepteurs et constructeurs, cette norme fixe les exigences de sécurité relatives à la conception structurelle, aux calculs de charge, au choix des matériaux, aux ancrages et aux systèmes de sécurité. Elle impose la constitution d'un dossier technique complet incluant plans d'exécution, notes de calcul et certificats de conformité.
- **NF EN 15567-2 (Exigences d'Exploitation)** : S'adresse aux exploitants et régit le fonctionnement quotidien des installations. Elle encadre les contrôles périodiques, le suivi de la documentation, la qualification du personnel, l'utilisation des Équipements de Protection Individuelle (EPI) et les niveaux de surveillance requis.
- **NF EN 12927-6 et ISO 4309** : Régissent les critères d'examen, de maintenance et de dépose (rebut) des câbles métalliques destinés au transport de personnes et aux parcours acrobatiques.
- **Série EN 13411 (Parties 1 à 6)** : Spécifie les exigences relatives aux terminaisons de câbles en acier, couvrant notamment les cosses, manchons sertis, culots et serre-câbles à étrier.

Du point de vue réglementaire, la norme EN 15567-1 établit une séparation stricte entre les exigences destinées au bâtisseur (calculs d'ancrage, stabilité de la structure support) et celles applicables à l'exploitant par l'EN 15567-2 (gestion de la sécurité, contrôles quotidiens, plan de secours). Les composants matériels sont quant à eux régis par la norme ISO 4309 pour les critères de dépose des câbles et la série EN 13411 pour le dimensionnement des terminaisons.

#### Coefficients de Sécurité et Charges Admissibles

Le dimensionnement mécanique applique des coefficients de sécurité (Factor of Safety - $FS$) distincts selon que l'on évalue la charge utile suspendue ou la tension globale générée dans la ligne. La tension de travail admissible (Safe Working Tension - $SWT$) est calculée à partir de la charge de rupture minimale du câble (Aggregate Breaking Load - $ABL$ ou $MBL$) selon l'équation :

$$
SWT = \frac{ABL}{FS}
$$
| Paramètre de Structure | Coefficient de Sécurité (FS) | Références et Exigences Normatives |
| --- | --- | --- |
| Charge Suspendue (EPI / Usager) | $FS \ge 5,0$ | S'applique à la masse maximale autorisée du pratiquant et à son équipement mobile. |
| Tension Totale du Câble (Câble principal) | $FS \ge 3,0 \text{ à } 5,0$ | S'applique à la tension maximale combinée (pré-tension + charge statique + surcharge dynamique). |
| Épreuve de Charge Initiale (Proof Test) | $2,0 \times \text{Charge Nominale}$ | Essai statique/dynamique obligatoire avant mise en service et lors des inspections périodiques (périodicité max. 12 mois). |

Les préconisations institutionnelles, telles que celles édictées par le Bureau de Prévention des Accidents (BPA) en Suisse, mettent l'accent sur la primauté de la prévention structurelle et l'intégration obligatoire d'un concept de sécurité comprenant un plan de sauvetage structuré, adapté à l'évacuation des personnes bloquées sur les grandes portées.

## 2. Physique, Dimensionnement Mécanique et Calcul de Flèche

Sur une tyrolienne dépassant 50 mètres de longueur, le câble ne peut être assimilé à un segment droit sous tension infinie. La géométrie réelle de la ligne suit la courbe de la caténaire, modifiée par l'élasticité propre de l'acier et la présence d'une charge ponctuelle mobile.

#### Équations Fondamentales de la Caténaire et Forces Dynamiques

Pour une portée $l$ entre points d'ancrage présentant une différence d'altitude $h$, soumise à une charge linéique de câble $q_p$, la tension horizontale $H$ et la flèche à mi-portée $f_0$ du câble à vide sont liées par la formulation parabole-caténaire :

$$
f_0 \approx \frac{q_p \cdot l^2}{8 H}
$$
Lorsqu'un usager de masse $P$ s'engage sur la ligne, la flèche maximale $f_{max}$ atteinte au milieu de la travée sous la charge combinée du câble et du pratiquant s'exprime par :

$$
f_{max} \approx \frac{q_p \cdot l^2 + 2 P \cdot l}{8 H}
$$
La tension maximale perçue par l'ancrage amont $T_{max}$ intègre l'angle de déflexion formé par le câble au niveau de la poulie. Sous l'effet de l'accélération et des oscillations verticales du pratiquant, la tension dynamique s'accroît considérablement :

$$
T_{max} = \sqrt{H^2 + \left( \frac{q_p \cdot l + 2 P}{2} \right)^2}
$$
Une charge utile de 100 kg peut ainsi engendrer une tension instantanée sur les ancrages supérieure de plus de cinq fois à sa valeur statique pure (dépassant fréquemment 5 kN de surcroît) si le câble est excessivement pré-tendu lors du montage.

Du point de vue géométrique, la trajectoire idéale d'une tyrolienne s'amorce à l'ancrage amont pour descendre le long d'une pente généralement comprise entre 2 % et 6 %. À mesure que l'usager progresse, le poids combiné du câble et du corps engendre une flèche mobile ($f_{max}$) qui atteint son point le plus bas près du milieu de la portée. Ce creux de vague amortit naturellement l'accélération avant que le câble ne remonte légèrement vers l'ancrage aval, favorisant ainsi la dissipation de l'énergie cinétique avant l'arrivée sur la plate-forme.

#### Paramètres Géométriques Recommandés

- **Pente nominale entre ancrages** : Recommandée entre 2 % et 6 % (soit une inclinaison d'environ $1,5^\circ$ à $3,5^\circ$) selon la vitesse recherchée et le profil d'arrivée souhaité.
- **Flèche sous charge** : Une flèche d'environ 8 % de la portée sous charge maximale appliquée est généralement ciblée pour éviter les sur-tensions catastrophiques au niveau des ancrages.
- **Prise en compte du vent** : Les vents transversaux et les rafales de face modifient la trajectoire et peuvent provoquer le déraillement de la poulie ou le balancement dangereux de l'usager, imposant un tirant d'air latéral rigoureusement dégagé de tout obstacle.

Le contrôle précis de la tension s'effectue obligatoirement à l'aide d'un tensiomètre de câble à affichage numérique ou d'un dynamomètre inséré sur la ligne lors des phases de réglage à vide et sous charge étalonnée.

## 3. Matériaux et Composants Techniques

Le choix des matériaux d'une tyrolienne à longue portée conditionne directement sa durabilité et son niveau de sécurité opérationnelle.

#### Spécifications des Câbles en Acier

L'utilisation de cordes textiles (statiques ou semi-statiques) est strictement proscrite pour les tyroliennes permanentes de plus de 50 m en raison de leur sensibilité au fluage, de leur coefficient d'allongement élevé sous charge et du risque de fusion par échauffement lors du passage répétitif des poulies. Le câble en acier galvanisé ou inoxydable constitue l'unique standard reconnu.

| Caractéristique | Câble 7x19 Galvanisé (Ø 12 mm) | Câble 6x19 / 6x36 Âme Métallique (Ø 14-16 mm) |
| --- | --- | --- |
| Domaine d'application | Portées de 50 m à 120 m | Portées très longues (>150 m à 500 m+) ou à forte fréquentation |
| Charge de Rupture Minimale ($MBL$) | $\approx 85 \text{ kN}$ (8,5 tonnes) | $\approx 120 \text{ à } 190 \text{ kN}$ (12 à 19 tonnes) |
| Souplesse et Maniabilité | Excellente (constitution de 19 fils fins par toron) | Moyenne, conçue pour résister à la fatigue en flexion sous forte tension |
| Résistance à l'Usure | Haute (épaisse couche de galvanisation à chaud) | Très haute (adaptée aux galets de poulies à grande vitesse) |

#### Terminaisons de Câbles

Les terminaisons constituent les maillons critiques du système et doivent être exécutées conformément aux spécifications de la norme EN 13411.

- **Manchons sertis à la presse (EN 13411-3)** : Offrent le rendement mécanique le plus élevé (jusqu'à 95 % de la résistance nominale du câble). Ils nécessitent un étalonnage précis des matrices de sertissage et un certificat d'essai de traction.
- **Serre-câbles à étrier (EN 13411-5 / Bulldog Grips)** : Tolérés sous réserve d'un respect strict des règles de pose : mise en place systématique d'une cosse-cœur (thimble) dans la boucle, orientation identique de tous les étriers sur le brin mort, écartement minimal de 6 fois le diamètre du câble ($6 \cdot d$) entre chaque serre-câble, et serrage au couple préconisé à l'aide d'une clé dynamométrique étalonnée. Un témoin de peinture durable doit être appliqué sur l'écrou et la bride pour visualiser immédiatement tout glissement du brin mort.

Dans le cas d'un montage par serre-câbles, la boucle de terminaison entoure la cosse-cœur pour répartir l'effort de courbure. Les étriers métalliques sont positionnés exclusivement sur le brin mort sortant, espacés d'une distance minimale équivalente à six fois le diamètre du câble. Ce positionnement rigoureux empêche le pincement ou l'écrasement de la section portante sous tension.

#### Chariots et Poulies

Les poulies doivent être rigoureusement adaptées au diamètre du câble utilisé afin d'éviter la déformation de la gorge et l'usure prématurée des torons.

| Poulie / Chariot | Matériaux & Construction | Vitesse Max. Admissible | Compatibilité Câble | Certifications |
| --- | --- | --- | --- | --- |
| Petzl Trac / Trac Guide | Flasques aluminium, galets acier inox, roulements à billes étanches, mousqueton captif | $25 \text{ m/s}$ ($90 \text{ km/h}$) | Ø 9 mm à 13 mm | CE EN 17109, CE EN 12278 |
| Petzl Tandem Speed | Galets acier inoxydable montés sur roulements à billes étanches | $20 \text{ m/s}$ ($72 \text{ km/h}$) | Ø 9 mm à 12 mm | CE EN 12278, UIAA |
| CMI Rapid Transit / Robertson SR-71 | Flasques acier, galets 2" acier trempé (56-58 Rockwell), double roulements | $40 \text{ m/s}$ ($145 \text{ à } 190 \text{ km/h}$) | Ø 9,5 mm à 19 mm (3/8" à 3/4") | NFPA 1983 Class G, ANSI |

#### Équipements de Protection Individuelle (EPI)

Le Pratiquant doit être équipé d'un harnais d'escalade ou d'acrobranche certifié (EN 12277 / EN 813 / EN 361) relié au chariot par deux longes distinctes. L'exploitation professionnelle préconise l'utilisation de systèmes de Ligne de Vie Continue (LVC) ou de mousquetons intelligents interverrouillés afin d'empêcher tout détachement involontaire du câble principal lors du départ et de l'arrivée.

## 4. Typologies de Montages et Ancrages

La reprise des efforts de tension axiale ($T_{max}$) exige une évaluation précise de la capacité portante des structures d'accueil, qu'elles soient naturelles ou artificielles.

#### Ancrages sur Arbres Vivants

Les arbres fournissent des points d'ancrage dynamiques mais nécessitent des précautions particulières pour préserver la santé du végétal et garantir la sécurité structurelle à long terme.

- **Dimensionnement des troncs** : Le diamètre minimal du tronc support doit être d'au moins 30 cm (12 pouces) au point d'attache du câble. Pour un arbre de haubanage secondaire, un diamètre minimal de 23 cm (9 pouces) est toléré.
- **Diagnostic arboricole (Annexe A de la NF EN 15567-1)** : Une évaluation phytosanitaire et mécanique réalisée par un expert certifié est obligatoire. Des mesures appareillées par résistographie (ex. PD400) permettent de déceler l'incipient de pourriture interne ou la présence de cavités.
- **Protection de l'arbre** : Il est interdit d'enrouler un câble à nu directement autour du tronc. L'installation doit utiliser des cales en bois dur intercalées verticalement pour répartir la pression, laisser circuler la sève au niveau du cambium et empêcher l'étranglement du tronc.

Un ancrage sur arbre efficace repose ainsi sur la disposition périphérique de tasseaux de bois dur espacés autour du tronc. Le câble de ceinturage vient envelopper ces cales sans toucher directement l'écorce, garantissant la préservation des canaux d'alimentation de l'arbre tout en assurant un maintien mécanique optimal par frottement.

#### Ancrages sur Structures Artificielles

Lorsque le site ne dispose pas d'arbres adaptés, l'installation repose sur des poteaux en bois, des pylônes métalliques ou des fondations en béton armé.

- **Poteaux autoportants** : Doivent présenter un diamètre minimal de 30 cm en tête et être enfouis d'au moins 1,50 m ou selon la règle des $10\% \text{ de la longueur} + 0,60 \text{ m}$. Un massif en béton d'au moins 15 à 20 cm d'épaisseur doit ceinturer la base sous le niveau du sol.
- **Lests et massifs béton** : Pour les installations mobiles ou autoportantes, la reprise de la traction s'effectue par des blocks de béton armé. Par exemple, une tyrolienne mobile de 70 m à 120 m requiert des lests béton d'au moins 2 tonnes à chaque extrémité pour équilibrer la ligne.
- **Haubanage** : Tout poteau soumis à une traction unilatérale doit être consolidé par un contre-câble relié à un ancrage au sol situé à une distance au moins égale à la hauteur du point d'accroche de la tyrolienne ($D_{hauban} \ge H_{ancrage}$).

## 5. Systèmes de Freinage et Fin de Course

Sur des portées supérieures à 50 mètres, les usagers franchissent fréquemment la zone d'arrivée à des vitesses comprises entre 30 et 60 km/h. La dissipation contrôlée de l'énergie cinétique constitue l'élément le plus critique pour prévenir tout impact mortel ou traumatique. La norme NF EN 15567 classifie les freins en deux catégories : les freins actifs (manipulés par le pratiquant) et les freins passifs (fonctionnant automatiquement sans intervention humaine).

L'architecture globale de freinage s'organise autour de deux barrières successives : le frein primaire passif qui assure l'arrêt régulier de l'usager, et le frein secondaire d'urgence destiné à absorber l'énergie résiduelle en cas de défaillance du système principal.

#### Dispositifs de Freinage Primaire (Passifs)

- **Frein à élastique (Bungee Brake System)** : Un bloc d'impact coulissant (chariot de freinage) installé sur le câble intercepte la poulie de l'usager. Ce bloc est relié à un ou plusieurs cordons élastiques ancrés en amont. L'étirement progressif de l'élastique offre une décélération douce et autorégulée.
- **Frein magnétique (type ZipStop)** : Fonctionne via l'auto-induction de courants de Foucault. Une ligne de rappel reliée au chariot de freinage entre en résistance proportionnellement à la vitesse d'entrée du pratiquant, garantissant un arrêt constant quelle que soit la masse du joueur.
- **Profil gravitaire** : Ajustement de la tension pour former une remontée naturelle du câble avant la plate-forme d'arrivée, convertissant l'énergie cinétique en énergie potentielle gravitationnelle.

#### Dispositifs de Freinage Secondaire et Sécurités (Fail-Safe)

Conformément aux directives de sécurité, une sécurité passive secondaire est obligatoire dès lors que les vitesses d'arrivée présentent un risque pour l'intégrité physique.

- **Poulies d'impact amorties (ex. SafeStop / Impact Trolley)** : Intègrent un tampon élastomère d'absorption et un mécanisme d'auto-réinitialisation empêchant le coincement des mains.
- **Systèmes de freinage de secours à ressort et absorbeur** : Dispositif de dernier recours monté en fin de course, composé d'un ressort en acier haute résistance d'au moins 1 à 1,5 mètre de longueur, associé à une chaîne de rétention, un brin de corde semi-statique de 10,5 mm et un absorbeur d'énergie à déchirement textile (type ASAP'SORBER) ancré à la structure. Ce montage absorbe le choc en cas d'arrivée à vitesse excessive ou de rupture du frein principal.

## 6. Maintenance, Inspection et Critères de Rebut des Câbles

L'exploitation d'une tyrolienne de plus de 50 m exige un plan de contrôle préventif structuré en trois niveaux d'inspection :

- **Inspection visuelle de routine** : Réalisée au quotidien avant l'ouverture au public afin de détecter les dégradations évidentes, l'état des connecteurs et le parfait état visuel de la ligne.
- **Inspection opérationnelle** : Réalisée tous les 1 à 3 mois pour contrôler l'usure détaillée, le couple de serrage des serre-câbles à la clé dynamométrique et le fonctionnement des freins.
- **Inspection périodique annuelle** : Versement d'un rapport complet par un organisme de contrôle indépendant agréé, incluant l'essai de charge preuve ($2 \times \text{charge utile}$) et l'évaluation arboricole.

#### Critères de Dépose des Câbles Acier (selon ISO 4309 et NF EN 12927-6)

Le câble d'acier principal doit être immédiatement mis au rebut et remplacé si la moindre des conditions seuils suivantes est constatée lors des contrôles :

| Motif de Dépose / Défaut Constaté | Critère de Rebut Strict | Implication Mécanique / Origine |
| --- | --- | --- |
| Réduction du Diamètre Nominal | Diminution de $\ge 5\%$ du diamètre par rapport au diamètre initial mesuré sous tension lors de la mise en service. | Surcharge de la structure, allongement plastique ou écrasement de l'âme interne. |
| Fils Cassés Répartis | $\ge 6$ fils cassés sur une longueur égale à 1 pas de câblage. | Fatigue critique par flexion sous le passage répété des poulies. |
| Fils Cassés Concentrés | $\ge 3$ fils cassés localisés sur un seul toron sur la longueur d'un pas. | Dommage localisé ou concentration anormale de contraintes. |
| Ruptures aux Terminaisons | $\ge 1$ fil cassé situé à une distance inférieure au diamètre du câble par rapport à la jonction d'un manchon ou d'une cosse. | Fatigue extrême par micro-flexions au point d'encastrement. |
| Usure d'Abrasive en Surface | Métal usé sur les fils extérieurs atteignant $\ge 1/3$ de leur diamètre d'origine. | Frottement excessif contre les gorges de galets ou les blocs de freinage. |

## 7. Synthèse de l'État de l'Art

L'état de l'art en matière de tyroliennes sur câble acier de plus de 50 mètres repose sur la maîtrise des interactions entre la tension statique/dynamique de la ligne et la sécurité passive des pratiquants. La conception moderne exige le passage d'une logique empirique à une approche d'ingénierie rigoureuse. Les règles fondamentales synthétisant les connaissances actuelles s'articulent ainsi :

- **Calculs d'ingénierie préalable** : Dimensionner la ligne avec un coefficient de sécurité $FS \ge 5$ sur la charge utile suspendue et $FS \ge 3$ sur la tension totale du câble, en intégrant la flèche sous charge ($\approx 8\%$) pour éviter toute surcharge sur les ancrages.
- **Sélection rigoureuse des matériaux** : Privilégier les câbles en acier galvanisé de structure 7x19 ou 6x36 (Ø 12 mm minimum), associés à des terminaisons serties sous presse ou par serre-câbles contrôlés à la clé dynamométrique.
- **Protection et dimensionnement des supports** : Ancrer sur des arbres sains de diamètre $\ge 30\text{ cm}$ équipés de cales en bois de protection du cambium, ou sur des poteaux/massifs béton calibrés avec contre-haubanage.
- **Sécurité passive et double freinage** : Éliminer le freinage manuel de l'usager au profit de freins passifs automatiques (élastiques, magnétiques ou gravitaires), obligatoirement doublés d'une ligne d'arrêt d'urgence amortie (ressort + absorbeur de choc).
- **Traçabilité et dépose préventive** : Mettre en œuvre un registre d'inspection à trois niveaux et procéder à la dépose immédiate du câble dès l'atteinte des seuils d'usure réglementaires prévus par la norme ISO 4309 (réduction du diamètre de 5 %, fils cassés ou usure abrasive).
