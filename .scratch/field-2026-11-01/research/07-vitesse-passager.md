# Vitesse du passager — modèles publiés, acier et textile

Ticket : [Modèles de vitesse du passager](../issues/07-vitesse-passager.md).
Recherche lue le 2026-11-02. Aucune formule nouvelle. Aucune fiche Courant Bandit.

## Décision

Spécifier **un point matériel sur la trajectoire statique déjà gelée** par le balayage, pour l'acier comme pour le textile. L'équation est la même. Les coefficients de frottement de poulie **ne se partagent pas**. Le `C_d A` du passager peut être partagé, comme entrée configurable, pas comme constante silencieuse.

Ne pas shipper un rendement EN 12278 (95 %) comme perte de vitesse. Ne pas shipper les tables de `C_w` et de `μ` des rapports locaux non sourcées. Ne pas caler quoi que ce soit sur l'essai du 1er novembre.

## Ce que le dépôt affirme déjà

`docs/simulation-theory.md` §12.2 écrit déjà l'équation retenue par la théorie consolidée, le long de la trajectoire gelée `z_D(x_D)` :

```
m·dv/dt = m·g·sinθ − F_friction − F_drag ∓ F_brake
F_drag = ½·ρ·C_dA·(v ± v_wind)²
F_friction = F₀ + k_v·v
```

avec `C_dA = 0,45 m²` et `F ≈ 15 N + 1,5·v` marqués `[FIELD:SSF]`. Le moteur actuel ne l'intègre pas : le balayage est statique, le `DAF` est un scalaire.

Cette recherche **confirme la forme de l'équation et la provenance du calage SSF**, et **retire deux attributions** que la théorie tient de `research-two.md` sans que la page primaire les porte : le nom de la poulie, et l'idée que le calage vaut pour l'acier.

## Modèle à spécifier

### Trajectoire gelée, puis équation du mouvement

Deux publications ouvertes décrivent le même découpage, indépendamment du SSF :

- Vladić, Jojić, Đokić, « Condition analysis and basis for selection of zipline arresting devices », *IMK-14*, 2020. DOI [10.5937/imk2004089v](https://doi.org/10.5937/imk2004089v), PDF lu : [scindeks](https://scindeks-clanci.ceon.rs/data/pdf/0354-6829/2020/0354-68292004089V.pdf). La trajectoire est calculée au statique (parabole corrigée, équations 3–7). Le passager est ensuite une masse concentrée sur cette trajectoire. La force centrifuge est négligée si les longes sont courtes et le rayon grand (§4.2).
- Jojić, Vladić, Đokić, « Forming of zipline mathematical model », 2025. DOI [10.46793/til2025.193j](https://doi.org/10.46793/til2025.193j), PDF lu : [til.masfak.ni.ac.rs](https://til.masfak.ni.ac.rs/images/10/4.3.pdf). Équation (18) :

```
m·a = Q·sinγ − sign(v)·( f·(Q·cosγ + m·v²/R) + ½·ρ·c_d·A·(v ± v_w)² )
```

`Q` est le poids, `γ` la pente locale de la tangente, `f` un coefficient de résistance au roulement, `R` le rayon de courbure. Ils intègrent numériquement une EDO non linéaire du second ordre. Ils ne publient pas de valeur de `f` ni de `c_d A` dans ce PDF.

C'est la même famille que §12.2. La différence utile : Jojić met le frottement en `f·N` (donc proportionnel au poids, et au terme centrifuge), le SSF le met en `F₀ + k_v·v` (pas proportionnel au poids dans la forme publiée).

**Grandeurs que cette intégration produit**, une fois la trajectoire et les coefficients donnés : vitesse le long de la portée, accélération, position d'arrêt (vitesse revenue à zéro et pente restante insuffisante pour repartir), vitesse d'arrivée si l'ancrage aval est atteint, durée. Elle ne produit pas le déport latéral, ni une tension dynamique de câble. Le SSF mesurait la tension à part (dynamomètres), pas comme sortie de la courbe de vitesse.

**À rejeter comme modèle de vitesse v1 :** le câble masses-ressorts. `docs/references/algo simulation tyrolienne.md` §10 le réserve à une phase ultérieure (oscillations). Le SSF a comparé vitesse théorique et mesurée sans publier ce couplage. GHTyro 2.00, décrit par le SSF, est un calcul **semi-statique** (chaîne d'arpenteur de B. Lismonde, tir sur l'ancrage), pas un intégrateur de vitesse. Page lue : [archive GHTyro](https://web.archive.org/web/20250217071158/https://www.speleo-secours.fr/ghtyro/), 2026-11-02. Le site vivant `speleo-secours.fr` refuse la connexion ce jour-là.

Le bilan d'énergie algébrique de `docs/references/simulation tyrolienne.md` §4.1 (`E = Mgh − W_frott = ½Mv²`) n'est pas une formule fermée : avec une traînée en `v²`, `W` n'existe qu'après intégration le long du chemin. Spécifier l'EDO, pas cet équilibre écrit comme s'il se lisait en `x`.

### Traînée

Forme publiée, les deux papiers serbes et §12.2 : `½ ρ C_d A v_rel²`, exposant 2 entre 1 et 300 m/s (Vladić 2020, éq. 8–9). Ils prennent `ρ = 1,225 kg/m³` à 15 °C et 60 % d'humidité, et donnent une correction `ρ = 1,25·(B/1,013)·(293/T)`. Le texte ISO 2533 n'a pas été ouvert (403). Ne pas ajouter de nouvelle formule d'altitude au-delà de ce que §12.2 a déjà figé.

Le `±` des papiers et de §12.2 est un **vent colinéaire** à la trajectoire. Un vent de côté / avant à 45° n'est pas ce cas. La composante utile pour la vitesse est la projection du vecteur `(v_passager − v_vent)` sur la tangente. La composante latérale change la géométrie de la ligne : autre physique, autre ticket. Mettre les 50 km/h entiers dans le `±` surestime la traînée longitudinale.

### Le seul `C_d A` mesuré sur une tyrolienne

Page SSF « Instrumentation », archive lue le 2026-11-02 : [instrumentation-de-la-tgt](https://web.archive.org/web/20250120115827/https://www.speleo-secours.fr/instrumentation-de-la-tgt/).

Le SSF écrit, après ajustement de la courbe de vitesse théorique sur la courbe mesurée (figure 5) :

- « Coefficient de trainée multiplié par la surface de référence du spéléo : 0,45 m² »
- « Coefficient de frottement (proportionnel à la vitesse) de la poulie : 1,5 kg/s »
- « Coefficient de frottement (constant) de la poulie : k1 = 15 kg m /s² »

Donc `F = 15 N + 1,5·v` avec `v` en m/s. C'est un **calage**, pas une mesure de soufflerie. La même page dit que la courbe mesurée s'écarte de la théorique parce que la position du passager change en cours de descente, donc le `C_x` change, et que les frottements poulie-corde, « mal connus », peuvent influencer le profil. Des essais sur tyrolienne miniature avaient donné un ordre de grandeur ; seul l'essai réel a fixé ces trois nombres.

Ce que la page mesure d'autre, et qui n'est pas un coefficient de vitesse : tension à vide 260 daN, pic 375 daN à 18 s le 4 juillet, rupture annoncée 3100 daN, poulie ~14 000 tr/min en moyenne et plus de 22 000 au maximum, échauffement d'un peu plus de 20 °C en fond de gorge après un refroidissement initial. Deux dynamomètres, Algosys et Petzl. **La page ne nomme pas le modèle de poulie.** L'attribution « Petzl Tandem Speed » de `research-two.md` et de §12.2 n'est pas dans ce texte. Ne pas la reconduire.

La page vidéo Vercors ([archive 2008-08-22](https://web.archive.org/web/20240418011518/https://www.speleo-secours.fr/2008-08-22-tyrolienne-vercors-2008/)) dit « 1.100 m », corde 10,5 mm, « 120 km en pointe ». La page doctrine ([archive tyrolienne-1](https://web.archive.org/web/20250210164542/https://www.speleo-secours.fr/tyrolienne-1/)) dit 1109 m. On ne réconcilie pas. 120 km/h ≈ 33 m/s est une pointe annoncée, pas le `C_d A`.

**Domaine du 0,45 m² :** un spéléologue harnaché, posture variable, une campagne, corde textile, une poulie non nommée. Ce n'est pas un passager assis de parc, ni un câble acier. §12.2 a raison de rejeter la table de postures de research-one (0,08–0,12 m² allongé) : elle contredit le 0,45 m² SSF. La fourchette 0,30–0,60 m² de §12.2 n'est pas sur la page SSF. La garder seulement comme bornes d'un champ éditable, marquées convention, pas comme mesures.

`docs/references/algo simulation tyrolienne.md` donne `C_w ≈ 0,6 / 0,4 / 0,2` et `A ≈ 0,25–0,5 m²`, et prévient que plusieurs chiffres viennent de forums. Pas de source primaire ouverte ici. Ne pas shipper.

### Frottement de poulie — deux lois, pas un rendement

| Loi | Source ouverte | Ce qu'elle suppose | Acier | Textile | Deux brins |
| --- | --- | --- | --- | --- | --- |
| `F = 15 N + 1,5·v` | Page instrumentation SSF, calage d'une campagne | Force indépendante du poids dans la forme publiée. Poulie non nommée. | Non établi | Un cas, une corde | Non établi. Deux poulies peuvent additionner deux `F₀`, ou non. |
| `F = f·(Q cosγ + m v²/R)` | Jojić et al. 2025, éq. 15–18 | Proportionnel à l'effort normal. `f` non publié dans le PDF. | Forme utilisable, `f` inconnu | Idem | Le partage de charge change `N` sur chaque réa. Il faut une règle explicite. |
| Rendement 95 % | Page produit Petzl TANDEM SPEED, lue le 2026-11-02 | Rendement EN 12278 / UIAA, essai de poulie de mouflage, pas une force opposée à un chariot à 20 m/s | Ne s'applique pas tel quel | Ne convertit pas la vitesse | — |

Page produit Petzl, lue le 2026-11-02 : [TANDEM SPEED](https://www.petzl.com/fr/fr/sport/produits/poulies-tyrolienne-sur-corde/tandem-speed/TANDEM-SPEED_SPO_a2mw0000000HeaoAAC.html). Chiffres dans le tableau : rendement 95 %, charge de travail 10 kN, charge de rupture 24 kN, réa 27,5 mm, corde max 13 mm, « Vitesse maximale autorisée : 20 m/s », certifications CE EN 12278, UKCA, UIAA. Texte : roulements étanches « pour la vitesse et le maintien d'un rendement constant, indépendant du poids de la personne, de la température ou de l'humidité » ; « spécifiquement conçue pour les tyroliennes avec faible pente ».

La notice (PDF Petzl `technical-notice-TANDEM-TANDEM-SPEED-after EN 17109`, P0005800E) ne répète pas ces chiffres en texte extractible. Elle dit : humidité ou gel peuvent modifier le rendement ; les roulements de la SPEED permettent une vitesse plus élevée que la TANDEM à paliers autolubrifiants ; ne pas mélanger les deux sur une même installation ; chaque corde doit être ancrée séparément ; l'installation exige un spécialiste et une analyse propre (obstacles, tirant d'air, vitesse, freinage, zone d'arrivée) ; essais préliminaires avec des poids différents. Ce sont des limites d'usage, pas un modèle.

Le « rendement indépendant du poids » contredit un `f·N` si on le prend au pied de la lettre pour cette poulie. Il est compatible, en forme, avec le terme constant SSF. Les deux phrases viennent de contextes différents (fiche marketing / calage de campagne). Les laisser toutes deux configurables. Ne pas en déduire un `μ`.

La formule `μ = μ₀·d/D + 2f/D ≈ 0,015–0,02` de l'algo local n'a pas de source primaire ouverte dans cette passe. `research-one` et ses `μ` par produit sont déjà `[UNVERIFIED:R1]` dans la théorie. Ne pas les promouvoir.

Aucun chiffre ouvert, dans les sources lues, ne sépare acier et textile pour le frottement de chariot. §12.2 le notait déjà comme trou. Il reste ouvert. Un câble acier et une corde textile ne partagent pas la loi SSF par défaut.

### Vent de l'essai

Đokić, Vladić, Jojić, « Analysis of zipline systems with large spans and low inclination angles », 2026. DOI [10.46793/et26.a11dj](https://doi.org/10.46793/et26.a11dj), PDF lu. Ils traitent la **charge de vent sur le câble** via EN 1991-1-4 (force par mètre, déviation latérale, garde). Ce n'est pas l'équation de vitesse du passager. Ne pas l'importer dans ce ticket.

## Acier et textile : ce qui est commun

Commun, et spécifiable :

- la trajectoire vient du solveur statique déjà là (chaînette, un ou deux brins — le deuxième change le poids par brin et donc la géométrie) ;
- l'EDO du point matériel sur cette trajectoire ;
- la traînée quadratique du **passager**, avec `C_d A` éditable, défaut 0,45 m² étiqueté calage SSF, pas norme ;
- le vent en vecteur, projection sur la tangente ;
- `ρ` comme dans §12.2, ou saisi.

Pas commun, et à ne pas prétendre :

- `15 N + 1,5·v` sur un câble acier, ou sur deux poulies, ou sur une poulie inconnue du 1er novembre ;
- un rendement 95 % transformé en force ;
- une fiche Bandit (non ouverte, non inventée) ;
- le freinage d'arrivée. Vladić 2020 cite ASTM F2291 à 6 g en +X assis, et une limite empirique 2,5 g à cause du ballant vers le câble. Le texte ASTM n'a pas été ouvert. §12.3 a déjà classé le 6 g en `[UNVERIFIED:R1]` et le 2,5 g en pratique. Rien de neuf à figer.

## Ce que l'essai du 1er novembre peut falsifier

Données utilisées, toutes non calées : portée 415,9 m, bouts 1415,7 m et 1442,6 m, fond 1360,9 m vers 182 m depuis le bout bas du CSV, vent ~50 km/h de côté/avant à 45°, arrêt vers 60 % depuis l'ancre haute probable, deux brins, poulie non identifiée, hauteurs d'ancrage inconnues, masse inconnue.

Ça peut contredire, qualitativement :

- un modèle **sans vent** qui arrive au bout, si l'on admet que le vent est la cause de l'arrêt — les notes le disent, il n'y a pas d'essai témoin sans vent ;
- un modèle **avec les 50 km/h mis en entier dans l'axe** qui arrive quand même au bout, ou qui s'arrête beaucoup trop tôt : les deux écarts sont informatifs, aucun des deux ne donne un `C_d A`.

Ça ne peut pas :

- distinguer traînée, frottement de poulie et partage sur deux brins ;
- choisir entre `F₀ + k_v v` et `f·N` ;
- valider le 0,45 m² SSF (autre posture, autre corde, autre poulie, autre vent, une seule corde porteuse dans la doctrine SSF récente : la page tyrolienne-1 décrit le passage de deux cordes à une corde porteuse unique, pas le montage du 1er novembre).

Le profil en vallon est utile comme **cas de non-régression** une fois les entrées saisies (ancrages, masse, vent vecteur). Pas comme jeu de calibration.

## À ne pas shipper

- Tables `C_w` / `A` de l'algo local, table de postures de research-one, table de `μ` par produit.
- 95 % Petzl comme coefficient de l'EDO.
- `15 + 1,5·v` et 0,45 m² en constantes silencieuses, ou comme valant pour l'acier.
- Le `± v_vent` colinéaire présenté comme un vent de 45°.
- Une vitesse d'arrivée ou un point d'arrêt calculés sur le week-end tant que poulie, masse, sens de départ et hauteurs d'ancrage manquent.
- Toute fiche Bandit.

## Coefficients ouverts

- `C_d A` assis, allongé, et sous vent de travers (le SSF dit déjà qu'il varie en cours de descente).
- Frottement acier contre textile, diamètre de réa, une poulie contre deux.
- Identité de la poulie du 1er novembre.
- Si le terme 15 N se double avec deux poulies.
- Seuil `v/c` de §12.1 : non revérifié sur une source primaire dans cette passe.
- Courbes force-vitesse des freins magnétiques : toujours propriétaires, comme en §12.3.
