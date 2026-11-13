# Dossier de vérification — moteur spatial sous vent

Recherche du 2026-11-09, préparation de #127, #120, #118 et #124. Point d'entrée :
[Équilibre spatial sous gravité et vent](../equilibre%20spatial%20vent.md).

## Rapports conservés

| Rapport | Objet | Statut |
| --- | --- | --- |
| [Ligne](line-aerodynamics-review.md) | Incidence, Reynolds, construction, diamètre sous tension, sillage | Revue OpenAI Codex `gpt-6.1-sol`, raisonnement élevé ; aucun coefficient produit validé |
| [Passager](rider-aerodynamics-review.md) | Cube/ellipsoïde, conventions d'aire, vent relatif et réaction sur la ligne | Revue OpenAI Codex `gpt-6.1-sol`, raisonnement élevé ; aucune calibration humaine acquise |
| [Énergie](quasi-static-energy-review.md) | Énergie matérielle, lieu du passager, portée de `v/c` | Revue indépendante ; aucun défaut démontré sur les points contrôlés, limites explicites |
| [Vallée](valley-wind-review.md) | Campagnes Perdigão, représentativité, charge quadratique | Sources primaires consultées ; aucun profil universel de vallée établi |

## Expérience numérique

| Rapport | Objet | Statut |
| --- | --- | --- |
| [Portance et traînée axiale](lift-axial-drag-experiment.md) | #134 : traînée normale seule contre l'ajout d'une portance et d'une traînée axiale, sur une matrice statique acier et textile | **Généré** par `bun experiments/spatial-aero-134/matrix.ts` ; contrat `docs/simulation-theory.md` §18 ; sondes de sensibilité, aucun coefficient adopté, décision de production ouverte |

Ce rapport-là se rejoue : son code, ses tests et ses tableaux sont dans
`experiments/spatial-aero-134/`. Les chiffres et les fichiers attribués à #134 dans les notes
antérieures du dossier (`production-aerodynamics-followup.md` §4.5, `inversion-followup.md`,
`triage-decisions-consolidated.md`, `descent-views-contract-followup.md`) décrivent un arbre de
travail de recherche qui n'a pas été livré avec elles : **ils ne se rejouent pas et sont
remplacés par ce rapport**, dont la matrice, les lignes et les conventions diffèrent. Deux écarts
à connaître : la traînée axiale y suit l'air, à l'inverse du signe écrit dans
`line-lift-axial-drag-significance.md` §3 et `production-aerodynamics-followup.md` §4.1 (§18.3
l'explique, à confirmer par le mainteneur) ; et une seconde loi d'orientation de la portance,
impaire en lacet, y est jouée à côté de la loi binormale.

Ces rapports documentent observations, dérivations et accès partiels séparément. Ils examinent la
note au commit `6bada50`, avant intégration de leurs compléments. Les recommandations ne sont pas
une spécification d'implémentation ni un dimensionnement de sécurité.

## Lecture et provenance

Les liens DOI, URL, pages et équations effectivement consultés sont conservés dans chaque rapport.
Un résumé d'éditeur n'est pas présenté comme un texte intégral. Les données numériques citées sont
propres aux dispositifs expérimentaux décrits, pas des défauts du simulateur. Les calculs
illustratifs ne sont pas des mesures de tyrolienne.

Les chemins `/tmp/...` sont les traces historiques de la session, **pas des fichiers disponibles
dans ce dépôt**. Les PDF tiers, captures et extractions ne sont pas distribués ici ; retrouver les
originaux par les liens des rapports. Les métadonnées et limites d'accès restent archivées pour
éviter de transformer une tentative de téléchargement en preuve de lecture.

Les rapports automatiques bruts contenant erreurs de géométrie, fausses attributions ou paramètres
non étayés ne sont pas intégrés. Leurs identifiants de recherche figurent dans la synthèse ; leurs
erreurs pertinentes sont expliquées dans les revues. Aucun PDF ou coefficient non vérifié n'est
nécessaire à la compilation de l'application.

## Décisions encore ouvertes

- Loi et coefficients aérodynamiques propres aux produits, états et domaines d'incidence.
- Polaires cube/ellipsoïde et éventuelle validation comme substitut humain.
- Couplage réaction de ligne / inertie du passager / EDO sur lieu statique.
- Données terrain hors axe, validation expérimentale et critères d'acceptation.

Les issues restent `ready-for-human`. Aucun changement du moteur, des facteurs de sécurité ou des
valeurs réglementaires n'est apporté par ce dossier.
