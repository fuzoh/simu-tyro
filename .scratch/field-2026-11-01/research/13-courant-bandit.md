# Courant Bandit 11 mm : source primaire et vérification des valeurs

Accès : 2026-11-08. Question ([#78](https://github.com/fuzoh/simu-tyro/issues/78)) : retrouver la source primaire chez Courant (fabricant, Corderie Courant) de la corde « Bandit 11 mm » et confirmer ou corriger chaque valeur de la fiche terrain ([#68](https://github.com/fuzoh/simu-tyro/issues/68), point 4). Dire si Courant publie une raideur ou un module utilisable pour `EA` ([#69](https://github.com/fuzoh/simu-tyro/issues/69)).

## Synthèse

- Courant publie le Bandit 11 mm dans deux fiches techniques de sa propre main, de dates différentes. **Elles ne donnent pas les mêmes chiffres.** Aucune ne donne 3000 daN, 41 %/59 %, glissement de gaine 0,1 % ni nouabilité 0,6.
- **Allongement et rétraction sont inversés dans la fiche terrain** : Courant publie allongement 50/150 kg = **2,5 %** et rétraction à l'eau = **3,5 %**. La fiche terrain porte 3,5 % en allongement et 2,5 % en rétraction.
- Les valeurs 0,1 % et 0,6 se trouvent dans le catalogue 2026 de Courant, mais pour la corde **KALIMBA** (11,9 mm, élagage). Les 41 %/59 % s'y trouvent pour la corde **REBEL** 11 mm, et sont une **composition** (41 % polyester, 59 % multi-tresses polyamide), pas un rapport gaine/âme. Ce sont probablement des mélanges de lignes d'autres cordes ; la source du mélange n'est pas établie.
- **Aucun module, raideur ni courbe force-allongement pour le Bandit** chez Courant. L'`EA` de 28 kN reste une déduction (et elle repose sur la valeur inversée, voir plus bas).

## Sources lues

Le site `courant.fr` est celui d'un autre Courant (conduits et réseaux), sans corde. La corderie publie sous `mycourant.com` (« Courant Vertical Living »). Ce domaine était injoignable ici (« unable to verify the first certificate », échec de WebFetch ; pas de contournement du contrôle TLS). Les documents ci-dessous sont des **fiches Courant, lues sur des copies hébergées par des revendeurs**, donc primaires pour le contenu, secondaires pour l'hébergement.

| Id | Document | URL | Origine | Date du document | Lu le |
| --- | --- | --- | --- | --- | --- |
| A | Fiche « BANDIT O10.5 O11 TDS », 1 page, réf. ML400+++ (11 mm), mentionne `vertical-living.mycourant.com` | https://shopmtn.de/cdn/shop/files/BANDIT_O10.5_O11_-_TDS.pdf | fiche Courant, copie hébergée par le revendeur MTN | PDF créé le 2024-11-21 (métadonnées InDesign) | 2026-11-08 |
| B | Fiche « BANDIT access rope EN1891-A », 1 page, Ø 11 mm, réf. ML400B+++++, mentionne `mycourant.com` / Courant Vertical Living | https://www.windowcleaningworld.com/assets/brochures/RACRopeBANDITred.pdf | fiche Courant, copie hébergée par le revendeur Window Cleaning World | PDF créé le 2020-12-09 (métadonnées InDesign) | 2026-11-08 |
| C | Catalogue Courant Vertical Living 2026 (« 62 pages » au folio, bilingue), lu avec `pdftotext`. **Le Bandit n'y figure pas** (aucune occurrence). | https://qr.scanned.page/uploads/pdf/InIF3b_a607ff6be9075603.pdf | catalogue Courant, copie hébergée par un service de QR code | PDF créé le 2026-04-07 | 2026-11-08 |

Les fiches A et B ont été lues avec `pdftotext -layout`.

## Valeurs : fiche terrain contre Courant

Conversion : 1 daN = 0,01 kN (3000 daN = 30 kN).

| Valeur de la fiche terrain | Fiche A (2024) | Fiche B (2020) | Verdict |
| --- | --- | --- | --- |
| EN 1891 type A, polyamide | « EN1891-A », « 32 strand Polyamide » | « EN1891-A », gaine « 32-strand Polyamide » avec âme polyamide torsadée parallèle | **Confirmé** |
| Rupture 3000 daN (30 kN) | 31 kN | 31 kN | **Corrigé : 31 kN (3100 daN)**. 30 kN n'apparaît pas pour le Bandit 11 mm (30 kN est la valeur du Bandit 10,5 mm dans les fiches des revendeurs, hors Courant, et d'une corde du catalogue C, hors Bandit) |
| Avec couture 2600 daN (26 kN) | **23 kN** | **26 kN** | **Divergence entre fiches Courant** : 26 kN (2020), 23 kN (2024). La plus récente, A, dit 23 kN ; rien dans les documents ne dit pourquoi la valeur a changé |
| Avec nœud de 8 2300 daN (23 kN) | non publiée | 23 kN (« figure of 8 knot ») | **Confirmé par B (2020) seulement** ; A ne publie plus cette ligne. Ne pas confondre avec la valeur « couture » 23 kN de A |
| 73 g/m | 73 g/m | 73 g | **Confirmé** |
| Gaine 41 % / âme 59 % | gaine 34 %, âme **76 %** (la somme fait 110 %, coquille manifeste ; la valeur 66 % n'est pas écrite) | gaine 34 % (âme non donnée) | **Corrigé : gaine 34 %.** L'âme n'est pas fiable : 76 % imprimé en A, rien en B. 41/59 vient de la REBEL (catalogue C), en tant que composition |
| Glissement de gaine 0,1 % | non publié | **0 %** | **Corrigé : 0 % (B, 2020)**. Non publié en A. 0,1 % est la valeur de la KALIMBA (catalogue C) |
| Allongement 50/150 kg 3,5 % | **2,5 %** | **2,5 %** | **Corrigé : 2,5 %.** 3,5 % est la rétraction à l'eau |
| Nouabilité 0,6 | 1 | 1,0 | **Corrigé : 1 (1,0).** 0,6 est la valeur de la KALIMBA (catalogue C) |
| Rétraction à l'eau 2,5 % | **3,5 %** | **3,5 %** | **Corrigé : 3,5 %.** 2,5 % est l'allongement |

Autres lignes publiées, non demandées : Courant indique une durée de vie maximale de 10 ans en conditions normales (B seulement) ; longueurs 20, 40, 60, 100, 200 et 900 m ; 1 ou 2 yeux cousus ; « fabriqué en France ». La fiche A donne en plus le Bandit 10,5 mm (29 kN, 22 kN avec couture, 68 g/m, gaine 37 %, âme 63 %, allongement 2,3 %, nouabilité 1, rétraction 3,6 %), à ne pas mélanger avec le 11 mm.

Conditions d'essai : ni A ni B ne précisent la méthode (tension de départ, vitesse, état de la corde, neuve ou conditionnée, mouillée ou sèche). Elles ne disent pas non plus si la rupture est celle de la corde seule ou du nœud/couture le plus faible. Rien n'est affirmé ici sur ces points.

## Raideur et module pour `EA`

**Non publiés pour le Bandit.** Ni A, ni B, ni le catalogue C ne donnent de module, de raideur (kN) ni de courbe force-allongement du Bandit. La seule donnée de rigidité est l'allongement 50/150 kg : **2,5 %** (A et B). Les revendeurs lus (hors Courant) répètent le même 2,5 %.

Arithmétique, **non publiée par Courant** : une variation de charge de 100 kgf (environ 0,98 kN) pour 2,5 % d'allongement donne `EA` d'environ 39 kN ; avec 3,5 % elle donne environ 28 kN. Le 28 kN de [#69](https://github.com/fuzoh/simu-tyro/issues/69) vient donc de la valeur inversée et **doit être refait ou étiqueté « déduction »** si on le garde. Cette déduction suppose que 2,5 % se rapporte à la longueur de départ à 50 kg et qu'on peut l'étendre linéairement à la plage de tension d'une tyrolienne ; Courant ne le dit pas, et ce n'est pas établi. Pour comparaison, le catalogue C publie pour la REBEL (autre corde) des allongements à 1,35, 2,7 et 4,4 kN, mais rien de tel pour le Bandit.

## Non retrouvé

- 3000 daN en rupture : aucune source Courant (31 kN).
- 41 %/59 % pour le Bandit : aucune source Courant (34 % de gaine).
- Glissement de gaine 0,1 % et nouabilité 0,6 pour le Bandit : aucune source Courant.
- Page produit Courant du Bandit sur `mycourant.com` : non lue (certificat TLS non vérifiable depuis cet environnement). Si cette page existe, elle peut contenir une fiche plus récente que A ; à vérifier depuis un navigateur.
