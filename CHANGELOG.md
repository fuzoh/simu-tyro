# Changelog

## [2.0.0](https://github.com/fuzoh/simu-tyro/compare/v1.0.1...v2.0.0) (2026-11-09)


### ⚠ BREAKING CHANGES

* **terrain:** les clés d'URL `sa` et `sb` ne sont plus connues. Un ancien lien qui les porte s'ouvre sur le profil entier et la bande signale « clé inconnue ». Les positions des ancrages le long du profil sont perdues, ainsi que la règle « Distance hors du profil » et la correction « Inverser A et B ».

### Features

* **chart:** griser les zones d'ancrage sur la coupe et la bande de garde ([01ec534](https://github.com/fuzoh/simu-tyro/commit/01ec5343e1b9573c122779dacceebf69ca53f877)), closes [#106](https://github.com/fuzoh/simu-tyro/issues/106)
* **chart:** lire le point sous le pointeur sur la coupe et la vue de dessus ([#99](https://github.com/fuzoh/simu-tyro/issues/99)) ([58c279d](https://github.com/fuzoh/simu-tyro/commit/58c279d4be99167c035c5c4d230074421eff69e9))
* **map:** afficher la croix de la Mesure sous le pointeur et tracer les repères d'ancrage ([e2e03b0](https://github.com/fuzoh/simu-tyro/commit/e2e03b028e88a6402754b5250b81bdf1b7be1a72)), closes [#107](https://github.com/fuzoh/simu-tyro/issues/107)
* **map:** afficher la vue de dessus sur une carte MapLibre ([#93](https://github.com/fuzoh/simu-tyro/issues/93)) ([5c6c70a](https://github.com/fuzoh/simu-tyro/commit/5c6c70aa0305f481351412a27b5741a954d1298e))
* **map:** ajouter l'outil Mesure sur la vue de dessus ([#98](https://github.com/fuzoh/simu-tyro/issues/98)) ([b2e75f2](https://github.com/fuzoh/simu-tyro/commit/b2e75f2db2ab492be8f8ef0500f2ea53cfcb6f51))
* **map:** ajouter la rose des vents sur la vue de dessus ([#94](https://github.com/fuzoh/simu-tyro/issues/94)) ([b9294b6](https://github.com/fuzoh/simu-tyro/commit/b9294b64488959c7cee2d6f0d06db6d9e277b71f))
* **map:** ajouter la vue 3D CesiumJS sur la page statique ([#95](https://github.com/fuzoh/simu-tyro/issues/95)) ([38bef06](https://github.com/fuzoh/simu-tyro/commit/38bef0695899e848834aa96d95fa3b7e9c7941c5))
* **map:** ajouter le gimbal, le clavier et les calques de la coupe à la Vue 3D ([30df0c5](https://github.com/fuzoh/simu-tyro/commit/30df0c54f7fc9af78a28923a4c57378f7e2b82f9)), closes [#111](https://github.com/fuzoh/simu-tyro/issues/111)
* **map:** calculer la Vue du départ, la Vue latérale et les touches de la Vue 3D ([3a73750](https://github.com/fuzoh/simu-tyro/commit/3a737507fc5353b975dba8a7fc37d1fb22c44f4d)), closes [#111](https://github.com/fuzoh/simu-tyro/issues/111)
* **map:** déplacer une ancre dans la vue 3D avec le geste partagé ([#97](https://github.com/fuzoh/simu-tyro/issues/97)) ([e4efafb](https://github.com/fuzoh/simu-tyro/commit/e4efafb6a314a371f0f1180677cbc0aa96df2fec))
* **map:** dessiner la Banane sur la vue de dessus et la vue 3D ([#96](https://github.com/fuzoh/simu-tyro/issues/96)) ([d8c3c59](https://github.com/fuzoh/simu-tyro/commit/d8c3c591e4c5418aae4a0c2f2cdb557cdb94117e))
* **rail:** régler la zone d'ancrage sur Avancé, dans le lien et la Session ([ec393a3](https://github.com/fuzoh/simu-tyro/commit/ec393a3e253501d2602861af012a1b8df26a83a4)), closes [#106](https://github.com/fuzoh/simu-tyro/issues/106)
* **routing:** donner à Avancé sa propre route derrière une barre de navigation commune ([#81](https://github.com/fuzoh/simu-tyro/issues/81)) ([6138240](https://github.com/fuzoh/simu-tyro/commit/6138240a6e73c87085a4770979859b0d2611a121))
* **sim:** choisir l'ancrage de tension et piloter par la prétension ([#85](https://github.com/fuzoh/simu-tyro/issues/85)) ([6e67a18](https://github.com/fuzoh/simu-tyro/commit/6e67a181a96ddef226c3f109b38bd0a97d959fca))
* **sim:** choisir le dispositif de mise en tension et alerter sur sa limite ([#86](https://github.com/fuzoh/simu-tyro/issues/86)) ([5797574](https://github.com/fuzoh/simu-tyro/commit/57975741cefba71accb429b0ba7eca95bf993e9a))
* **sim:** modéliser un ou deux brins porteurs ([#84](https://github.com/fuzoh/simu-tyro/issues/84)) ([37c4187](https://github.com/fuzoh/simu-tyro/commit/37c41876166aa35b58a9490f60cb5bbbe3b537de))
* **sim:** ne plus juger la garde au sol dans les zones d'ancrage ([29e3b41](https://github.com/fuzoh/simu-tyro/commit/29e3b41ace7913ebabc675b9ec95462b26c1f63a)), closes [#106](https://github.com/fuzoh/simu-tyro/issues/106)
* **sim:** proposer le préréglage Courant Bandit 11 mm sur corde textile ([#83](https://github.com/fuzoh/simu-tyro/issues/83)) ([7b682f9](https://github.com/fuzoh/simu-tyro/commit/7b682f9f6e6929c8b10265bc851d92d93b194025))
* **sim:** saisir le vent et calculer ses composantes le long et en travers ([#87](https://github.com/fuzoh/simu-tyro/issues/87)) ([00923a5](https://github.com/fuzoh/simu-tyro/commit/00923a59967e062f857b39deefec78448afdfc62))
* **sim:** simuler la descente du passager avec frottement et vent ([#89](https://github.com/fuzoh/simu-tyro/issues/89)) ([f1ccb46](https://github.com/fuzoh/simu-tyro/commit/f1ccb465c016a742193191938b6f6e3390186771))
* **terrain:** charger le profil geo.admin comme troisième origine du tracé ([#103](https://github.com/fuzoh/simu-tyro/issues/103)) ([1d148c8](https://github.com/fuzoh/simu-tyro/commit/1d148c8618a1c5a41112249dd284c0bde8fe3823))
* **terrain:** utiliser le profil importé en entier, sans placer les ancrages ([#88](https://github.com/fuzoh/simu-tyro/issues/88)) ([579398f](https://github.com/fuzoh/simu-tyro/commit/579398fdbf821d4e2ea9a111447a3115e0a2a49c))
* **ui:** afficher Avancé sur trois colonnes dès 1024 px ([#100](https://github.com/fuzoh/simu-tyro/issues/100)) ([0db4a84](https://github.com/fuzoh/simu-tyro/commit/0db4a84b3c4353474bba49efaf6ed3aa9ed30de3))
* **ui:** afficher la vue de dessus et la dynamique du passager dans Avancé ([#104](https://github.com/fuzoh/simu-tyro/issues/104)) ([bc34f8c](https://github.com/fuzoh/simu-tyro/commit/bc34f8cb61a5431bce181dea225e030196736048))
* **ui:** ajouter la page dynamique avec coupe et courbe de vitesse ([#92](https://github.com/fuzoh/simu-tyro/issues/92)) ([35bcb88](https://github.com/fuzoh/simu-tyro/commit/35bcb884b175061a2fa666cbe8a1d7de855523ee))
* **ui:** ajouter la page Terrain en lecture seule ([#101](https://github.com/fuzoh/simu-tyro/issues/101)) ([0c708a7](https://github.com/fuzoh/simu-tyro/commit/0c708a7b5e9b8232657575eebba53637cf5cd971))
* **ui:** aligner le vocabulaire du Rail sur la table à deux registres ([#82](https://github.com/fuzoh/simu-tyro/issues/82)) ([ece12f8](https://github.com/fuzoh/simu-tyro/commit/ece12f8be9543078e0f2746d787b76c0f95deed5))
* **ui:** élargir la colonne de gauche d'Avancé à 576 px et poser Paramètres sur deux colonnes dès 1920 px ([8ecae02](https://github.com/fuzoh/simu-tyro/commit/8ecae02257ff9a2f768ed603d6a4f630abc642c8))
* **ui:** étendre Avancé sur toute la largeur, la vue de dessus au-dessus du Chart Block ([afe9376](https://github.com/fuzoh/simu-tyro/commit/afe93760d804f4b89cae508d651b87960e11f2f5))
* **ui:** poser la vue de dessus et les tuiles 2 × 3 en rangée 1 de Statique dès 1024 px ([036bd59](https://github.com/fuzoh/simu-tyro/commit/036bd5901d4dec9c8548bb7ed03f45383eb7de2e))
* **ui:** replace Inter and Manrope with Iosevka Charon, bundle Iosevka Charon Mono ([a3a2011](https://github.com/fuzoh/simu-tyro/commit/a3a201195866df1ef6e7ef75aef4288df0a9b1e8))
* **ui:** réserver la hauteur des tuiles du squelette et unifier les surfaces d'erreur ([#91](https://github.com/fuzoh/simu-tyro/issues/91)) ([fb304ad](https://github.com/fuzoh/simu-tyro/commit/fb304adde0bf7d330b9396b8fb181feeb8af62ca))
* **url:** porter une position WGS84 optionnelle par ancrage ([#90](https://github.com/fuzoh/simu-tyro/issues/90)) ([c90dbf0](https://github.com/fuzoh/simu-tyro/commit/c90dbf0fd58a30df0d1999b1ddf41f87559a623a))


### Bug Fixes

* **chart:** dire « garde non jugée » au survol de la coupe Dynamique dans une Zone d'ancrage ([d6ba34a](https://github.com/fuzoh/simu-tyro/commit/d6ba34a6eedb51604f1490c6d0c482fb9170edc2))
* **chart:** laisser la cote de « Garde min. ligne » grise pour un passager dans une Zone d'ancrage ([23a9dab](https://github.com/fuzoh/simu-tyro/commit/23a9dab960c0fc5ae4c458fbc8a4502b3cc54581))
* **chart:** peindre les étiquettes des axes par-dessus les courbes et le « 0 » de la vitesse au-dessus du zéro ([420b019](https://github.com/fuzoh/simu-tyro/commit/420b01984448277b35c5c4ccbdeba46bdef03517))
* **chart:** placer l'annotation du passager dans le quadrant que la ligne ne traverse pas ([a82e7b9](https://github.com/fuzoh/simu-tyro/commit/a82e7b96ddd5ad186701e83b767766c44ff9f651))
* **chart:** raccorder la courbe de garde au bord des zones d'ancrage ([badb99f](https://github.com/fuzoh/simu-tyro/commit/badb99fcb18bc8ae7199841590cd61bfcd36140e)), closes [#106](https://github.com/fuzoh/simu-tyro/issues/106)
* **chart:** ramener la gouttière des graphiques à 12 px, la marge des conteneurs ([81287f3](https://github.com/fuzoh/simu-tyro/commit/81287f317e8a9db3b74ba536281dba8db2b0e578))
* **chart:** tracer la courbe de vitesse sur le premier passage et nommer la durée jusqu'à l'arrêt ([4b9d842](https://github.com/fuzoh/simu-tyro/commit/4b9d84270599a706eff227b0c24c78ead8180ac5))
* **layout:** borner le Chart Block d'Avancé à 1984 px et le mettre en letterbox au-delà ([00e3bfe](https://github.com/fuzoh/simu-tyro/commit/00e3bfe612ae564ae752db0a9c00477e6f2218d2))
* **layout:** ne replier le Chart Block sur la hauteur de la fenêtre que sous 1024 px ([ff44e81](https://github.com/fuzoh/simu-tyro/commit/ff44e818176bc83506498a4a0e22703781208a5c))
* **layout:** porter le plafond des tuiles de Statique par --tile-max et retirer les recherches de classes ([1905faf](https://github.com/fuzoh/simu-tyro/commit/1905faff6a652feacbe4ceaee2df0681cf2fff22))
* **layout:** réserver sept lignes de légende à la vue de dessus d'Avancé pour ne plus pousser le Chart Block ([0e04c3a](https://github.com/fuzoh/simu-tyro/commit/0e04c3a0c968bf14ffb166264c62184647fa6a0f))
* **map:** effacer l'aperçu de la Mesure sur les boutons de zoom et sous un doigt ([c456cab](https://github.com/fuzoh/simu-tyro/commit/c456caba64b6bef1a0f3a509509edb3bf8f6515b))
* **map:** éteindre « Repères » dans la Vue 3D, qui ne trace aucune croix ([f97aad3](https://github.com/fuzoh/simu-tyro/commit/f97aad3f2f2e5f3c9f7f2a7ab4e3c9f19d834292))
* **map:** étendre la vue de dessus sur la largeur de sa région ([2ab78ef](https://github.com/fuzoh/simu-tyro/commit/2ab78ef1b7b047897fd244417c11654ec14a8f51))
* **map:** garder à chaque bouton du Gimbal sa propre face sous la zone tactile de 44 px ([a981b15](https://github.com/fuzoh/simu-tyro/commit/a981b15d1209d145126635b68841f86f93c1f4fa))
* **map:** garder l'aperçu de la Mesure sous le pointeur pendant un déplacement de la carte ([b5a0a5f](https://github.com/fuzoh/simu-tyro/commit/b5a0a5f8620fb64f1c4fdce6df4bd5d1bf9b1527))
* **map:** garder l'œil de la Vue du départ au-dessus du relief sur un dévers ([e92b86d](https://github.com/fuzoh/simu-tyro/commit/e92b86d5272cdc738d67ff09722845f2a67c5234))
* **map:** garder le Fond de carte lisible à côté de « Repères » sur la carte de 287 px ([ac03166](https://github.com/fuzoh/simu-tyro/commit/ac03166d1f948a3a09c799998acae0162fa3ee4d))
* **map:** laisser la Trajectoire transparaître derrière le relief en Vue 3D ([0cbabde](https://github.com/fuzoh/simu-tyro/commit/0cbabdecbecc35497cd2037c80afc866cdbc38cf))
* **map:** ne dessiner la Ligne à vide et la Trajectoire en 3D qu'avec le passager placé ([77efa36](https://github.com/fuzoh/simu-tyro/commit/77efa363bd574d791c8800c3502864a83360d78f))
* **map:** ne terminer l'appui sur un ancrage qu'au relâchement de son propre pointeur ([b42e35f](https://github.com/fuzoh/simu-tyro/commit/b42e35f05e98c60dd86247503e248bd7c0d092b9))
* **map:** passer les calques à la Vue 3D à côté de la scène ([c6a9722](https://github.com/fuzoh/simu-tyro/commit/c6a9722347d3441b6d99b3d4162da7f5eeea6205))
* **map:** régler le pas du zoom et de la marche de la Vue 3D sur la ligne, pas sur le relief lointain ([843b8e0](https://github.com/fuzoh/simu-tyro/commit/843b8e01e4bd0760316bf6f94bf853f1a9667b8b))
* **map:** replier « Placer A / Placer B / Mesure » à l'écart des boutons de zoom ([1de4b44](https://github.com/fuzoh/simu-tyro/commit/1de4b44935ea19d656f2d3b01d00984c6b2e0ac4))
* **rail:** afficher le préréglage actif dans le sélecteur de la corde ([456afa5](https://github.com/fuzoh/simu-tyro/commit/456afa56689aca39fbe78d00e6079c0ed5b0393c))
* **rail:** bloquer la garde quand les zones d'ancrage ne laissent aucune position du passager ([f4c10e3](https://github.com/fuzoh/simu-tyro/commit/f4c10e31da944dada61da9fd342d873b861a3b81)), closes [#106](https://github.com/fuzoh/simu-tyro/issues/106)
* **rail:** comparer la limite de tension au T max de l'ancrage du dispositif ([6b2fbf8](https://github.com/fuzoh/simu-tyro/commit/6b2fbf8b82782f38630021953de6c0999e104259))
* **rail:** dire l'exclusion des zones d'ancrage sur la garde d'Avancé et sous le passager ([835f145](https://github.com/fuzoh/simu-tyro/commit/835f1451d83fbb60b01e61859bcb04c3bd8a2932)), closes [#106](https://github.com/fuzoh/simu-tyro/issues/106)
* **rail:** passer la valeur sous le libellé d'une ligne de détail des Résultats trop longue ([ec5c34e](https://github.com/fuzoh/simu-tyro/commit/ec5c34e5afb1c2511f6e14156cc7175613fccd72))
* **scenario:** piloter le scénario de premier lancement par la tension de pose ([e922cff](https://github.com/fuzoh/simu-tyro/commit/e922cff6da0aa8c00a66bc0837310645f82ceb31))
* **sim:** bloquer les vitesses de passage et le vent sur entrées invalides ([e7fc40c](https://github.com/fuzoh/simu-tyro/commit/e7fc40cba3ae5dc15f8605291da6b2c0fb76fa91))
* **sim:** lire la direction du vent depuis le nord et la projeter sur l'orientation des Positions ([945e9df](https://github.com/fuzoh/simu-tyro/commit/945e9df59012dcef43ff5dd3eb62608104b26a76))
* **sim:** lire la garde jugée au bord d'une Zone d'ancrage, pas un pas plus loin ([cff7f5c](https://github.com/fuzoh/simu-tyro/commit/cff7f5cd648c4437b36b46cb0ae30fe50d2c1ac0))
* **terrain:** garder le profil et les Positions cohérents entre lien et Session ([fb7e2df](https://github.com/fuzoh/simu-tyro/commit/fb7e2df666f7997860da4ec5275e35f433b47502))
* **terrain:** réserver la même gouttière de défilement sous la visualisation et les tuiles ([e9a8665](https://github.com/fuzoh/simu-tyro/commit/e9a86653fe3d1b67d3a5e7ba7f05ac43a1c43dd8))
* **ui:** ancrer les radios de Base UI dans leur groupe pour que le document ne dépasse plus la fenêtre ([a39d319](https://github.com/fuzoh/simu-tyro/commit/a39d31926feb9b0331b90ef6528246c0e38ebf8f))
* **ui:** conserver le format 3 : 2 de la vue de dessus en rangée 1 de Statique ([df4d81f](https://github.com/fuzoh/simu-tyro/commit/df4d81fafc90fbf2fe28f01bc5218fb7e4e21277))
* **ui:** harmoniser refus, avis Avancé et navigation entre pages ([cd73707](https://github.com/fuzoh/simu-tyro/commit/cd73707a363113284e49eb7cc8864e04dacf3cf3))
* **ui:** ouvrir chaque Page en haut en coupant la restauration de défilement du routeur ([c71ef05](https://github.com/fuzoh/simu-tyro/commit/c71ef053b0244072ff6d5d291cc8028c5aa065e4))
* **ui:** ramener les tuiles de Terrain et les lignes de Résultats au rythme ([3e036af](https://github.com/fuzoh/simu-tyro/commit/3e036afbd36b88943e4599c9813237fcc8a7be6f))


### Tests

* **chart:** exercer les gardes de zone d'ancrage sur une ligne qui échoue juste après la zone ([06dc444](https://github.com/fuzoh/simu-tyro/commit/06dc444e712b01cbd07287416f25749213452a0d)), closes [#106](https://github.com/fuzoh/simu-tyro/issues/106)
* **chart:** vérifier que « Garde min. ligne » laisse les Zones d'ancrage de côté à mi-portée ([f855fe3](https://github.com/fuzoh/simu-tyro/commit/f855fe318385c69a5456e9789190d08b5daa0b50))
* **layout:** dire la barre de navigation payée sous B2 seulement et chiffrer le bloc letterboxé ([d047950](https://github.com/fuzoh/simu-tyro/commit/d04795043ee1a89cb4d267fcb9a6cb835b9f4766))
* **layout:** épingler le plafond levé d'Avancé et la vue de dessus au-dessus du Chart Block ([5a2c946](https://github.com/fuzoh/simu-tyro/commit/5a2c9461291fdbdb503c5e5467f9cf1384767213))
* **layout:** nommer le test [#109](https://github.com/fuzoh/simu-tyro/issues/109) d'après ce qu'il vérifie ([b35bcc2](https://github.com/fuzoh/simu-tyro/commit/b35bcc2602be1e07b05f53979df812456cc63c68))
* **layout:** retirer les recherches de classes de la suite [#115](https://github.com/fuzoh/simu-tyro/issues/115) ([17b1558](https://github.com/fuzoh/simu-tyro/commit/17b1558afd01175539fc89c1f477e43f052f5385))
* **layout:** tenir Paramètres sur deux colonnes dès B3, sans groupe coupé ni ordre réécrit ([e478b8c](https://github.com/fuzoh/simu-tyro/commit/e478b8c57f600a1c1f79ad561532e71e80b6c66d))
* **map:** nommer le test des repères d'ancrage selon ce qu'il vérifie ([9b1b07e](https://github.com/fuzoh/simu-tyro/commit/9b1b07e1dfd3736a3ed041ea0cd60bd00cd165bc))
* **map:** vérifier l'identité du Scénario plutôt qu'un lien qui ne lit pas les Repères ([31be62f](https://github.com/fuzoh/simu-tyro/commit/31be62fb99db73b9c2e29626575879802e26dabf))
* **terrain:** importer NO_ARRIVAL plutôt que coder « pas d'arrivée » en dur ([44ee302](https://github.com/fuzoh/simu-tyro/commit/44ee30217bb5174ef31e8e8c05638999fa6dfb0f))
* **url:** couvrir la clé `zan` dans le bandeau de lien ([b9fb8ea](https://github.com/fuzoh/simu-tyro/commit/b9fb8eabc80940f4f24cbf646973a48644703f66)), closes [#106](https://github.com/fuzoh/simu-tyro/issues/106)


### Documentation

* **adr:** dater de [#112](https://github.com/fuzoh/simu-tyro/issues/112) la colonne du milieu d'Avancé à viewport − 864 dès 1920 px ([97ec794](https://github.com/fuzoh/simu-tyro/commit/97ec794ea9c7820bf845767001d7949173d5afae))
* **conventions:** aligner docs et commentaires sur les cinq grilles et le code actuel ([3f15372](https://github.com/fuzoh/simu-tyro/commit/3f15372a8e4fab1cd7d139ad60f8ff46bf381d14))
* **conventions:** compter le saut d'un groupe d'une colonne à l'autre de Paramètres parmi les coûts ([6edde65](https://github.com/fuzoh/simu-tyro/commit/6edde65a01b9cc1c8986ed1377953ea7502f2fe0))
* **conventions:** consigner le format conservé de la rangée 1 de Statique et ses mesures à 1024 ([9d1f1f0](https://github.com/fuzoh/simu-tyro/commit/9d1f1f017616498f6c883ef774779a1d02c6388f))
* **conventions:** consigner le letterbox du Chart Block d'Avancé à 1984 px et ses mesures ([3602533](https://github.com/fuzoh/simu-tyro/commit/3602533e65b7374a6fd09ef74859f8f0d85027c3))
* **conventions:** consigner le saut du focus de la coupe à la vue de dessus et la carte de 989 px ([4dbb775](https://github.com/fuzoh/simu-tyro/commit/4dbb775a61d5a24c76d239b25a39cc4a0de48ecc))
* **conventions:** consigner les mesures agent-browser de [#115](https://github.com/fuzoh/simu-tyro/issues/115), [#106](https://github.com/fuzoh/simu-tyro/issues/106) et de la revue globale ([aacd40a](https://github.com/fuzoh/simu-tyro/commit/aacd40a57f48f28bca04eb2126a0cb61364f604a))
* **conventions:** consigner Paramètres sur deux colonnes dès 1920 px et ses mesures ([0bea40e](https://github.com/fuzoh/simu-tyro/commit/0bea40ed65f9c6f5e094efd9b16327d4fc3a1872))
* **conventions:** décrire Avancé sur toute la largeur et la vue de dessus au-dessus du Chart Block ([5426201](https://github.com/fuzoh/simu-tyro/commit/5426201504c27fae35cb387c01576ac45ebdca6d))
* **conventions:** décrire la rangée 1 de Statique et consigner ses mesures ([eac620d](https://github.com/fuzoh/simu-tyro/commit/eac620de95e0d3bf084e9811d07b6179dd299451))
* **conventions:** décrire le gimbal, le clavier et les calques de la Vue 3D ([4028b58](https://github.com/fuzoh/simu-tyro/commit/4028b5812b65e6c3ab6645d5c6ca7f7a9c86ddd4)), closes [#111](https://github.com/fuzoh/simu-tyro/issues/111)
* **conventions:** dire que la Ligne A–B de la Vue 3D prend l'encre à 60 %, plus foncée que la coupe ([4962fba](https://github.com/fuzoh/simu-tyro/commit/4962fbaa7a2d1c4ceebb978c3fbf83be30cf9bd1))
* **conventions:** inscrire la gouttière des graphiques dans la règle « Rhythm » ([573015b](https://github.com/fuzoh/simu-tyro/commit/573015b83e64b7a6eef36416a6e3b7194ccd1425))
* **conventions:** justifier NAV_BAR par la gouttière de 12 px dans routing.md ([16fc75a](https://github.com/fuzoh/simu-tyro/commit/16fc75a1cc3fc80e4244757259c549abd59621a5))
* **conventions:** rendre à la ligne de src/lib/map/ l'aperçu et les Repères d'ancrage ([010ba56](https://github.com/fuzoh/simu-tyro/commit/010ba560645ae57a7cfc8928558e407bb4906871))
* **conventions:** situer le haut du Chart Block sous la carte et redire pourquoi 1024 ([c0abcc2](https://github.com/fuzoh/simu-tyro/commit/c0abcc209a819f3f3157aacbdd2c2ba865a8d384))
* **glossary:** aligner le vocabulaire de l'interface sur le glossaire ([#102](https://github.com/fuzoh/simu-tyro/issues/102)) ([e4ed605](https://github.com/fuzoh/simu-tyro/commit/e4ed605f6f300fb5433f88e5ae425ca897b7dd9c))
* **glossary:** définir la Vue prédéfinie et ne plus attribuer « boussole » à la Rose des vents ([bfe3f3b](https://github.com/fuzoh/simu-tyro/commit/bfe3f3b226e2154dcf94ae9616dd569f8d8a41c7))
* **glossary:** définir la Zone d'ancrage et amender Garde au sol et Verdict ([65b640f](https://github.com/fuzoh/simu-tyro/commit/65b640f5ac52733c5331021bb7e4537d268719a9))
* **glossary:** définir le Gimbal, la Vue du départ et la Vue latérale ([1c2a41b](https://github.com/fuzoh/simu-tyro/commit/1c2a41bc5d2d68df978747d8e88405b7def4beea)), closes [#111](https://github.com/fuzoh/simu-tyro/issues/111)
* **glossary:** définir les Repères et l'aperçu de la Mesure ([a6ee4bf](https://github.com/fuzoh/simu-tyro/commit/a6ee4bfa08b205caba3ef9bfede9c4eb9acd1795))
* **glossary:** dire la colonne de gauche d'Avancé à 576 px et Paramètres sur deux colonnes dès 1920 px ([d1a9777](https://github.com/fuzoh/simu-tyro/commit/d1a9777165ae19b8a619064aa46d9f8baf319467))
* **glossary:** dire que la Vue 3D n'a ni Repères ni Mesure ([5872b3f](https://github.com/fuzoh/simu-tyro/commit/5872b3f167dd14d859eba4b1496611db1293e0a6))
* **glossary:** fil à plomb as ground mark and rising vertical; anchors drag in the Vue 3D ([#74](https://github.com/fuzoh/simu-tyro/issues/74)) ([#76](https://github.com/fuzoh/simu-tyro/issues/76)) ([767af49](https://github.com/fuzoh/simu-tyro/commit/767af494212ae414c679879fdb32eed16118f5c7))
* **glossary:** map vocabulary and anchors as profile ends ([#12](https://github.com/fuzoh/simu-tyro/issues/12)) ([#73](https://github.com/fuzoh/simu-tyro/issues/73)) ([c61d668](https://github.com/fuzoh/simu-tyro/commit/c61d668eddd5ebceb25a7baa4c49abee9b70038d))
* **glossary:** noter que la Vue latérale regarde depuis la droite de A → B ([36a1ed4](https://github.com/fuzoh/simu-tyro/commit/36a1ed462c5e84d7b2264b6ef8913f06cb6a9abf))
* **glossary:** point d'arrêt as the no-wind rest point first ([#69](https://github.com/fuzoh/simu-tyro/issues/69)) ([#75](https://github.com/fuzoh/simu-tyro/issues/75)) ([cbd892e](https://github.com/fuzoh/simu-tyro/commit/cbd892e551bfd841f8a8dad0d3e21f208cc6e90b))
* **glossary:** préciser que le Chart Block ne se replie pas en trois colonnes et ce que co-visible garantit ([06a6768](https://github.com/fuzoh/simu-tyro/commit/06a6768454672dc880e708bab343fdfde19686cc))
* **glossary:** record the simplified-page French vocabulary ([#72](https://github.com/fuzoh/simu-tyro/issues/72)) ([c709612](https://github.com/fuzoh/simu-tyro/commit/c7096120072eedfd64e95f7e0c187ddc9a670db6))
* **glossary:** rendre à co-visible son sens et dire le Chart Block en letterbox au-delà de 2560 px ([ac7489e](https://github.com/fuzoh/simu-tyro/commit/ac7489e22b10ed6b55be9dd27c2099f9e88591e0))
* **glossary:** tension de pose read at the tensioning anchor, not H ([#62](https://github.com/fuzoh/simu-tyro/issues/62)) ([#79](https://github.com/fuzoh/simu-tyro/issues/79)) ([8ea1793](https://github.com/fuzoh/simu-tyro/commit/8ea1793ac930639b923690c6e8c8f8eb34147591))
* **terrain:** corriger le README du dynamomètre et ajouter la note de lecture ([#69](https://github.com/fuzoh/simu-tyro/issues/69)) ([#77](https://github.com/fuzoh/simu-tyro/issues/77)) ([abfd7f6](https://github.com/fuzoh/simu-tyro/commit/abfd7f66a4bdd738b448224e75e29f85e20794da))
* **terrain:** ranger le tracé geo.admin vérifié du 2026-11-08 avec les relevés ([#80](https://github.com/fuzoh/simu-tyro/issues/80)) ([f289530](https://github.com/fuzoh/simu-tyro/commit/f2895303c33ce600cb74c6178469899cfb7b7aa0))
* **terrain:** relevés du dynamomètre du 2026-11-01 et notebook d'analyse ([81a7719](https://github.com/fuzoh/simu-tyro/commit/81a77196830917259a30dbd4ff2fea454de990fd))
* **terrain:** relevés du dynamomètre du 2026-11-01 et notebook d'analyse ([b989a40](https://github.com/fuzoh/simu-tyro/commit/b989a402eb9a4670469067f38e0ff05076f1525a))


### Refactors

* **layout:** déclarer B2 une fois, en variante three-columns tenue à THREE_COLUMN_PX ([e92b4b8](https://github.com/fuzoh/simu-tyro/commit/e92b4b8d7ef08fdf8d09cce56c3f11465836c4a4))
* **map:** choisir les calques de la Vue 3D sans View Strip dans vue3dLayers ([8980072](https://github.com/fuzoh/simu-tyro/commit/89800722bd3e9ef06b4f1b68c6cb9eb9e2ff917b))
* **map:** partager le plan local de la Mesure avec les Vues prédéfinies ([09beb9b](https://github.com/fuzoh/simu-tyro/commit/09beb9b67c4baacbfc2c6625fb99ef1e76e66285))

## [1.0.1](https://github.com/fuzoh/simu-tyro/compare/v1.0.0...v1.0.1) (2026-11-08)


### Bug Fixes

* **app:** store the session before the address bar reads bare / ([d5f575b](https://github.com/fuzoh/simu-tyro/commit/d5f575b34beced2f0ca8e1b9999ed63bd7fd9359)), closes [#57](https://github.com/fuzoh/simu-tyro/issues/57)
* **persist:** gate the address bar on `publishable` and write a bare / on oversize ([9ed97e4](https://github.com/fuzoh/simu-tyro/commit/9ed97e4896b979f5b9c742edcd9a13cec8302285))
* **persist:** publish a bare / when the trace exceeds the link budget ([930398c](https://github.com/fuzoh/simu-tyro/commit/930398c94933c5d8abd00b3f7910da29680f6e68))
* **rail:** clamp x_D through clampX alone on geometry and typed paths ([20a58be](https://github.com/fuzoh/simu-tyro/commit/20a58be03b4c560612f8359ef4f21560ccd24504)), closes [#58](https://github.com/fuzoh/simu-tyro/issues/58)
* **rail:** gate a knot on HMPE with the passer-a-la-terminaison-de-depart Fix Action ([62d08b0](https://github.com/fuzoh/simu-tyro/commit/62d08b005e7c81f311dd9416a971f3fe8f16a5d0))
* **rail:** keep an emptied View Strip x field from sending the rider to 0 m ([87480f3](https://github.com/fuzoh/simu-tyro/commit/87480f3c2ae09d15313a1d14fd2d05150a2251da))
* **rail:** keep the gate report and results through an x_D scrub ([893bdea](https://github.com/fuzoh/simu-tyro/commit/893bdea1e4abce13fe16b4d8dd274c821c8420d9))
* **rail:** key the report and results memos on traverseInputs ([8b83d4f](https://github.com/fuzoh/simu-tyro/commit/8b83d4f30f4bc7176f1a5ed1e1b7474160225b3f))
* **rail:** key useDeduced on rider.mp and unit, useResults on hClearMin ([0884f66](https://github.com/fuzoh/simu-tyro/commit/0884f661cf6cc1bd2fd6ffbd3302c5557762b312))
* **rail:** list every read field in the deduced and results memos ([e16a7e9](https://github.com/fuzoh/simu-tyro/commit/e16a7e9e0f4a220b80d5c76ca458292d29a023d5))
* **rail:** name every missed clause in the régime-unavailable error ([aeb8b06](https://github.com/fuzoh/simu-tyro/commit/aeb8b06b991e3d720725f1498e134149f9f51328))
* **rail:** raise an end the line cannot use as a Verdict-gate blocking error ([c4a3331](https://github.com/fuzoh/simu-tyro/commit/c4a3331c82cc59745a7b21125a3cb35aa3427ada))
* **rail:** read and write every numeric field through FIELD_ACCESS ([8ac09c4](https://github.com/fuzoh/simu-tyro/commit/8ac09c4ea903563045375515c2eb1c77eb0bc914))
* **rail:** read and write every numeric field through one lens ([7f4133d](https://github.com/fuzoh/simu-tyro/commit/7f4133d9b9cf800448a11ce5a79f97e78cba714e)), closes [#25](https://github.com/fuzoh/simu-tyro/issues/25)
* **rail:** stop an emptied View Strip x field from sending the rider to 0 m ([acb8ea0](https://github.com/fuzoh/simu-tyro/commit/acb8ea035c2ddf8bdb7de6f6277c128596cbcba1))
* **scenario:** merge clampToSpan into clampX with one non-finite rule ([9247133](https://github.com/fuzoh/simu-tyro/commit/92471330f03858a6151bd17a0f6a522a3a182fc4)), closes [#58](https://github.com/fuzoh/simu-tyro/issues/58)
* **url:** apply the review round to the codec move ([53bd7e5](https://github.com/fuzoh/simu-tyro/commit/53bd7e57b6ea3ae156def06e6e0da910326007b9))
* **url:** complete a missing η from the decoded end and a missing k from its class ([401a110](https://github.com/fuzoh/simu-tyro/commit/401a1101da72272d5eba5df5061a8d6d3a3ea137))
* **url:** complete a trace link's absent stations to the trace's ends ([de72b9c](https://github.com/fuzoh/simu-tyro/commit/de72b9ce4d5dfb5870b9c9ef02832333282c8219)), closes [#55](https://github.com/fuzoh/simu-tyro/issues/55)
* **url:** complete from the active family and drop the decoder's fallbacks ([de426a0](https://github.com/fuzoh/simu-tyro/commit/de426a0181f841269e102916c2d267e1a535075d))
* **url:** complete links into a CompletedSearch from the active family ([a6d7d8a](https://github.com/fuzoh/simu-tyro/commit/a6d7d8aed7131894fa1d61fa34a7ee737d096ed2))
* **url:** derive cls and cst tokens from ROPE_CLASS_TOKEN_BY_ID and CONSTRUCTION_TOKEN_BY_ID ([57cfbf6](https://github.com/fuzoh/simu-tyro/commit/57cfbf6fe157859346b9982889be35e75eeb3936))
* **url:** derive cls and cst tokens from total tables and name a completed rope class ([009605e](https://github.com/fuzoh/simu-tyro/commit/009605efd2b3d8c2566d5904c00a7f22830aab6c))
* **url:** make the link strip's key table total and derive ValidatedSearch ([7cf3c83](https://github.com/fuzoh/simu-tyro/commit/7cf3c83c96a163dc85d65776d23ffa8ef0e1536a))
* **url:** make the link strip's KEYS total and derive ValidatedSearch ([95d21c5](https://github.com/fuzoh/simu-tyro/commit/95d21c58e07bf1e07b25a1ab5af245e71136fa8d))


### Tests

* **url:** pin golden canonical links for every encoding branch ([b6befe1](https://github.com/fuzoh/simu-tyro/commit/b6befe1de128001db9096a14128dcf12342248ad))
* **url:** pin golden canonical links for every encoding branch ([d43182c](https://github.com/fuzoh/simu-tyro/commit/d43182c403316e0ddc56857813052e65cf8cfcec))


### Documentation

* add ADR-0001 on faithful invalid state and blocking gates ([e74d4e9](https://github.com/fuzoh/simu-tyro/commit/e74d4e923abfc93295305e5b1271b2176dcdf978))
* add ADR-0001 on faithful invalid state and blocking gates ([0c50f5f](https://github.com/fuzoh/simu-tyro/commit/0c50f5f4905ee82c73aac87b22133c588ec661a1))
* **glossary:** list vr among the Tightness Driver keys ([417a91f](https://github.com/fuzoh/simu-tyro/commit/417a91fc7b0f667906f3c1e66e2be8d1305f50df)), closes [#56](https://github.com/fuzoh/simu-tyro/issues/56)
* **glossary:** list vr among the Tightness Driver keys ([#59](https://github.com/fuzoh/simu-tyro/issues/59)) ([3954cc9](https://github.com/fuzoh/simu-tyro/commit/3954cc906d7be98211ead647327fe50ac1a2f562)), closes [#56](https://github.com/fuzoh/simu-tyro/issues/56)
* **url:** count vr among the tightness drivers in the spec and schema notes ([4ff99db](https://github.com/fuzoh/simu-tyro/commit/4ff99dbdd3102992bb6e5ec55eb70528664d1818)), closes [#56](https://github.com/fuzoh/simu-tyro/issues/56)


### Refactors

* **app:** place an import's stations through one traceEnds ([d32a910](https://github.com/fuzoh/simu-tyro/commit/d32a910ff01af54a4bd4a589d81f634c17a76f3a)), closes [#55](https://github.com/fuzoh/simu-tyro/issues/55)
* **rail:** move deduced rows, read-out cells and option labels out of JSX ([5ef8782](https://github.com/fuzoh/simu-tyro/commit/5ef87822fb99d77f83e221aa476637571e4a0dfd))
* **rail:** move deducedRows, readOutCells and option labels out of JSX ([a8467f8](https://github.com/fuzoh/simu-tyro/commit/a8467f89b4060bd066125e7842afa64bade58428))
* **rail:** type the read-out cells' rider without lib/chart ([53f8529](https://github.com/fuzoh/simu-tyro/commit/53f8529fa9330689c0437b64a0b460493b4f5797)), closes [#58](https://github.com/fuzoh/simu-tyro/issues/58)
* **scenario:** derive the unloaded line once for deduced values and scene ([7f7afd8](https://github.com/fuzoh/simu-tyro/commit/7f7afd8fd22c04f9dca3c2cf3a206e5602c6a102))
* **scenario:** derive the unloaded line once with deriveUnloaded ([4cc11c5](https://github.com/fuzoh/simu-tyro/commit/4cc11c52ffdc7ac8ba1172b3feea1509cf6e4d03))
* **sim:** own the warning thresholds in lineWarnings, the copy in the app ([fdcfc4f](https://github.com/fuzoh/simu-tyro/commit/fdcfc4ff97dd1b6e7fe256cd8f68cbcb5c1c432f))
* **sim:** own the warning thresholds in the engine, the copy in the app ([02b450a](https://github.com/fuzoh/simu-tyro/commit/02b450a32cbf252e814eb1fb1e07de092424aea5))
* **url:** move the search decoder next to the encoder ([a4cee05](https://github.com/fuzoh/simu-tyro/commit/a4cee05d0ce608158a863e7470756e12b6414ad6))

## 1.0.0 (2026-11-06)


### Features

* build profile view prototype to settle v1 chart design ([2612898](https://github.com/fuzoh/simu-tyro/commit/2612898ba00c0ebb48074bd04aee74cd89ffbf85))
* **build:** ship the app as static files under a configurable base path ([427caa3](https://github.com/fuzoh/simu-tyro/commit/427caa30dd001899e716207b3ad83bbaa5ce6d6c))
* **chart:** add trajectory and rider distance layers ([ef8618d](https://github.com/fuzoh/simu-tyro/commit/ef8618deb7177191f104c7679d9e51e6c330d81b))
* **docs:** serve theory pages and link help copy ([3bd91bd](https://github.com/fuzoh/simu-tyro/commit/3bd91bd00834d370d39080a894e4cfa23e8f111e))
* initial commit ([f4f3c32](https://github.com/fuzoh/simu-tyro/commit/f4f3c32e033be9085829f40c653f44a213a3ebf0))
* **layout:** collapse chart block into pinned safety header ([af38e00](https://github.com/fuzoh/simu-tyro/commit/af38e004378287b09c2ba0b20f2eb3f061f1cfb3))
* **rail:** add help tooltips and clearance check ([d7d374c](https://github.com/fuzoh/simu-tyro/commit/d7d374cfdba9e75bd9758acf8f0616af4be601f9))
* **rail:** add P/H ratio tightness driver ([3a5d74b](https://github.com/fuzoh/simu-tyro/commit/3a5d74b2239c29bcd1011741b4f2a5b35e4f6f90))
* **rail:** allow tightness mode switch during no-result states ([7529659](https://github.com/fuzoh/simu-tyro/commit/752965907296c75b09a86ae6215fb22d64b0cf38))
* **shell:** cap and centre the app past 1728 px instead of stretching edge-to-edge ([5b1a8ba](https://github.com/fuzoh/simu-tyro/commit/5b1a8ba37b5293e5284203eb6170f45c049f5159))


### Bug Fixes

* **chart:** correct three claims the review measured wrong ([5f19718](https://github.com/fuzoh/simu-tyro/commit/5f197189f276323f137247093e5d288a3d1bfd44))
* **chart:** distinguish line clearance from rider clearance ([613b849](https://github.com/fuzoh/simu-tyro/commit/613b849da819bd70b5092fd6020bd55401c4e990))
* **chart:** scope label switches on what clears « Flèche », not on B1 ([dd118d7](https://github.com/fuzoh/simu-tyro/commit/dd118d706536b600092a0fed0c248dfcee9e432b))
* **docs,test:** retake two figures ticket 37 superseded ([352e9ed](https://github.com/fuzoh/simu-tyro/commit/352e9edd8c3ba4fbd9b880b17198d3634456f2a0))
* **rail:** avoid cascading renders in ClampNote ([241b56e](https://github.com/fuzoh/simu-tyro/commit/241b56e9ec1adcbb099bc3b44795c721e14fdcf9))
* **rail:** give the provenance chip its own line so it stops painting over the field label ([d352aac](https://github.com/fuzoh/simu-tyro/commit/d352aac6523a7a146894d621733eb886905f91b4))
* **sim:** evaluate the rider node in §11's clearance scan ([e4238c7](https://github.com/fuzoh/simu-tyro/commit/e4238c765401fc1058a5ee3ee29ef8b140ea1243))
* **sim:** make §11's merged sample order true, and restore the tripwire figure ([a75c753](https://github.com/fuzoh/simu-tyro/commit/a75c7532242f52e00e0d589fc3caf9203944c12a))
* **sim:** re-take defect 1's deltas against the old scan, not its record ([d1fbd29](https://github.com/fuzoh/simu-tyro/commit/d1fbd29d7dfef0160438c4dcf86c2b44323298c1))
* **sim:** read §6.1 one way in §5.2's Peyrot–Goulois seed ([aed1f7e](https://github.com/fuzoh/simu-tyro/commit/aed1f7ef93c30bd8e7450367cee81a9bfdf2b396))
* **terrain:** re-record the garde figures the app discloses to the user ([937bc1d](https://github.com/fuzoh/simu-tyro/commit/937bc1dabfe499331e00af45998754a2736a5d22))


### Performance Improvements

* **ui:** preload fonts and restrict tailwind source ([d206215](https://github.com/fuzoh/simu-tyro/commit/d206215d94de4b96ab02cf3953923995877b5506))


### Tests

* assert §13.1's own digits, and stop claiming regimeK is a §3 row ([630a490](https://github.com/fuzoh/simu-tyro/commit/630a49051007d1b7a97d922dbd4c34639f4db55d))
* **bench:** port benches to the vitest 5 bench fixture ([36dd154](https://github.com/fuzoh/simu-tyro/commit/36dd154e825237d1bf5098232993c9008e636c44))
* **chart:** judge the strip's curve against a ten-times-finer scan ([e9cc267](https://github.com/fuzoh/simu-tyro/commit/e9cc267b586118a5817f306e03588301d3015c64))
* **sim:** check the tension scan against a second way of taking it ([3b34aa7](https://github.com/fuzoh/simu-tyro/commit/3b34aa7df1f2d8005239ecd80be07198a83f84cf))
* **sim:** decide §4.3's near-taut guard — stretched side, no slack twin ([ce8b8f7](https://github.com/fuzoh/simu-tyro/commit/ce8b8f7f7f7c41944f4ebd15787c0fd0b623a65d))
* **sim:** pin the shared tension scan on its own terms ([e78dd11](https://github.com/fuzoh/simu-tyro/commit/e78dd11be9a0286d9793ba483b5dde3710a8dbf6))


### Documentation

* add agent skill documentation for domain docs and triage labels ([65a3f2f](https://github.com/fuzoh/simu-tyro/commit/65a3f2ffaf0021035a2ae6fa33fd79d8385a226d))
* app features spec ([5c09235](https://github.com/fuzoh/simu-tyro/commit/5c09235a59035737e4d09c1b24196125bb7a10b3))
* **chart:** retire the scan-error claims ticket 37 closed ([0161992](https://github.com/fuzoh/simu-tyro/commit/016199242d553ddc539b5c2ae1019a7e6e763d6d))
* **contributing:** describe post-1.0 version bumps and Release-As ([0f31ab4](https://github.com/fuzoh/simu-tyro/commit/0f31ab48ed4f8ebff38b77e474e232713234b7d5))
* correct the Pages base path to /simu-tyro/ ([e40003c](https://github.com/fuzoh/simu-tyro/commit/e40003c0e702c1d257efcd2bccd47a95ad2dfc33))
* drop CLAUDE.md, split AGENTS.md and CONTRIBUTING.md, ban tautological tests ([b94396d](https://github.com/fuzoh/simu-tyro/commit/b94396d1b09ad1c48cf44c4eede60651478a4aa3))
* feature spec ([bdf7515](https://github.com/fuzoh/simu-tyro/commit/bdf7515d706b95399d05c6d0e4fb82cdc363d2c0))
* new tickets refinements ([5905dd8](https://github.com/fuzoh/simu-tyro/commit/5905dd83ba6fa8f05080e68124c2a004aefca4a3))
* refine agents.md ([1683c9b](https://github.com/fuzoh/simu-tyro/commit/1683c9b9793e0296074381ea250223ff1ca930da))
* rewrite README, add CONTRIBUTING and update AGENTS.md ([4c6b2c0](https://github.com/fuzoh/simu-tyro/commit/4c6b2c02608d3a874882a0075a549d9b1967b75b))
* **scenario:** name the geometry-mode branch and its fifth-branch trigger ([c9de4e3](https://github.com/fuzoh/simu-tyro/commit/c9de4e3195d7fc21f2a1e52a84de649a30b06e84))
* setup matt skills ([16daf6f](https://github.com/fuzoh/simu-tyro/commit/16daf6f78317d24b57d6629b417a03ba5aff59c8))
* **sim:** say that §11's atX is a scanned vertex, not an argmin ([b7bc771](https://github.com/fuzoh/simu-tyro/commit/b7bc7715fa5e1c3d08d9abab353536d0f5503431))
* spec finalization ([e8a01ad](https://github.com/fuzoh/simu-tyro/commit/e8a01adf279cd35bb70146e12d85aa8aab3b2b5c))
* **theory:** demote §13.1's 6 mm 6×19 triple to [UNVERIFIED:R2] ([3b23cbe](https://github.com/fuzoh/simu-tyro/commit/3b23cbe1eec0bf4853cfef92f1ada6868a3cc761))
* **tickets:** add amendment N and resolve ticket 31 review question ([f9bbb8b](https://github.com/fuzoh/simu-tyro/commit/f9bbb8b3143389b7953ff70fdfc264a789aa4876))
* **tickets:** close 37 with the measured re-takes ([0194631](https://github.com/fuzoh/simu-tyro/commit/01946313d34f44679808edae3df13d1fa04df465))
* **tickets:** close 38 — two done, one declined, one deferred, one verified ([87e78b5](https://github.com/fuzoh/simu-tyro/commit/87e78b57ab30c28e59478b073d323607a9ab9477))
* **tickets:** close 39 item 5 — the noise is gone, the position is documented ([189a37d](https://github.com/fuzoh/simu-tyro/commit/189a37dbdb6c9221fd5b693cb9cbdd79324482f1))
* **tickets:** document amendments H through N in build README ([5d6c4fb](https://github.com/fuzoh/simu-tyro/commit/5d6c4fb8dfa4a7d1c1a0b2f80eeff029c062357a))
* **tickets:** open 42–46 from the second algorithmic review ([41dec5b](https://github.com/fuzoh/simu-tyro/commit/41dec5b3b6e56b38321363c6d8e8e0731acf4c91))
* **tickets:** record the review on 37, and untick the toFixed box ([560f890](https://github.com/fuzoh/simu-tyro/commit/560f890767d3532b38d03a403bd8c49231cca94d))
* wayfinder grill ([696df0b](https://github.com/fuzoh/simu-tyro/commit/696df0b93e8bd24ab634a98e962e2e46e836d331))


### Refactors

* **chart:** quantise clearance strip y domain and interpolate holes ([56049ab](https://github.com/fuzoh/simu-tyro/commit/56049ab19f9de69404211b1fd3c61165c7b82076))
* **format:** give the régime divisor its own QuantityId ([459f490](https://github.com/fuzoh/simu-tyro/commit/459f49020d9cbe9f954d5b3aa92e77a1223da3bb))
* **scenario:** give the span a geometry describes one owner ([65ff1f6](https://github.com/fuzoh/simu-tyro/commit/65ff1f684f4d46993fb5f35470eca4485a660da3))
* **sim:** give the worst-tension-per-end scan one owner ([2dd0c77](https://github.com/fuzoh/simu-tyro/commit/2dd0c77294128ec8b888afc8a3e99caf1767842f))
* **strip:** revert ClearanceStrip curve to passenger clearance ([9909766](https://github.com/fuzoh/simu-tyro/commit/9909766f5f3aca0cee103aa0adedb1917699dc86))
* **ui:** unify control density, typography, and tokens ([815d2d8](https://github.com/fuzoh/simu-tyro/commit/815d2d8aa6bdb9d0ca44c122de747dd53f01ec62))


### Miscellaneous Chores

* **agents:** move issue tracker to GitHub, rename glossary ([46e93db](https://github.com/fuzoh/simu-tyro/commit/46e93db9a135b01b58d684a2d82186bf6d70dbba))
* app v1 ([6dfdd5d](https://github.com/fuzoh/simu-tyro/commit/6dfdd5d34fb8651169192d0d5d5f35d8194f112a))
* **build:** remove unused eslint and prettier ([22c2000](https://github.com/fuzoh/simu-tyro/commit/22c2000965ca8d731b2e4f088427e74e92ec4ede))
* **build:** update project dependencies and tooling ([939b2eb](https://github.com/fuzoh/simu-tyro/commit/939b2ebb14cd47a988745edcb84c69c6303ae1ce))
* finalize spec ([9434f86](https://github.com/fuzoh/simu-tyro/commit/9434f8643f3c4829cc66c1012eae92c20fe3bc6c))
* oxlint and oxfmt ([728d76a](https://github.com/fuzoh/simu-tyro/commit/728d76af990c1549107725dd407eaeed98298d88))
* research references for zipline simulation ([f0004f2](https://github.com/fuzoh/simu-tyro/commit/f0004f2fa9285e086aab0df40a8e60fa23ee868e))
* resources for simulator ([56439cd](https://github.com/fuzoh/simu-tyro/commit/56439cd8d7971db14093063f27b004ac65cdfc9b))
* retire profile prototype and settle v1 amendments ([385ff02](https://github.com/fuzoh/simu-tyro/commit/385ff027207735af7a091ddcb50ba55e3356e97d))


### Build System

* **deps:** apply dependabot updates [#18](https://github.com/fuzoh/simu-tyro/issues/18)–[#21](https://github.com/fuzoh/simu-tyro/issues/21) and pin bun 1.4.4 ([59803f7](https://github.com/fuzoh/simu-tyro/commit/59803f7d46c048cd6859d45999eb6644a05a7969))


### Continuous Integration

* add CI checks, release-please and deploy Pages on release ([c30e1db](https://github.com/fuzoh/simu-tyro/commit/c30e1dbdb36585f68203baace73644337146c708))
* keep the p95 tripwire out of the deploy gate ([d0da74d](https://github.com/fuzoh/simu-tyro/commit/d0da74dcffcbad989c89e3d798e262c3d0625826))
* leave the release-please manifest out of oxfmt ([a17631d](https://github.com/fuzoh/simu-tyro/commit/a17631db4cf36f6336efd2bdf49921d80b02ecdd))
* publish to GitHub Pages on every push to main ([316f325](https://github.com/fuzoh/simu-tyro/commit/316f325f4e79eca31b1f8b0ec2d95b740490163b))
* upgrade deploy workflow actions ([6bc81e0](https://github.com/fuzoh/simu-tyro/commit/6bc81e084baa7cecec2aeb0475443b31ce4bb872))


### Reverts

* **sim:** ticket 37 defect 2 is a misdiagnosis — restore §5.2's seed ([7c99510](https://github.com/fuzoh/simu-tyro/commit/7c9951057000a81224d8dc4386caad37b7a173b0))
