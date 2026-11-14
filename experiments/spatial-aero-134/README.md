# Expérience #134 — portance et traînée axiale de la ligne

Banc numérique **isolé** : il compare, sur les mêmes cas statiques, la traînée normale seule à
l'ajout d'une portance et d'une traînée axiale sur la ligne. Contrat : `docs/simulation-theory.md`
§18, écrit avant ce code. Rapport généré :
`docs/references/spatial-wind/lift-axial-drag-experiment.md`.

**Ce n'est pas le moteur.** Rien sous `src/` n'importe ce dossier ; il ne remplace aucun solveur
et ne modifie ni la traînée de descente, ni le Verdict, ni un facteur de sécurité. Les
coefficients de portance et de traînée axiale sont des **sondes de sensibilité** : aucun n'est une
mesure de produit, un intervalle réaliste, une borne prudente ou une valeur par défaut. Ne pas
les transposer en coefficients de production ; ne pas intégrer ce prototype sans décision du
mainteneur (#134, #127).

## Rejouer

```bash
bun experiments/spatial-aero-134/matrix.ts            # résout, contrôle, écrit tableaux et rapport
bun experiments/spatial-aero-134/matrix.ts --check    # compare aux fichiers présents, n'écrit rien
bun experiments/spatial-aero-134/matrix.ts --out /tmp/essai --report /tmp/essai/rapport.md
```

Une dizaine de secondes. Code de sortie : `0` si tous les contrôles passent et toutes les lignes
ont un équilibre vérifié ; `1` si `--check` trouve une différence ; `2` si un contrôle ou une
ligne échoue — les fichiers sont écrits quand même, comme diagnostic, et le rapport s'arrête
alors avant toute comparaison.

La sortie ne dépend que des entrées : ni date, ni durée, ni machine n'y figurent. Après avoir
changé une entrée, relancer la commande et relire le rapport en entier — sa prose décrit ce que
l'expérience est, ses chiffres viennent tous des lignes résolues.

**Les entrées comprennent le moteur.** Le prototype lit `src/lib/sim/` — matériaux dérivés,
`solveSpan`, `resolveL0`, constantes — et ni la CI ni `bun run test` ne rejouent la matrice.
Après un changement sous `src/lib/sim/`, lancer `--check` : s'il trouve une différence, le rapport
et les tableaux archivés ne sont plus ce que le code produit. Les régénérer, puis mettre à jour
la date et le commit du moteur dans la ligne de l'index du dossier
(`docs/references/spatial-wind/README.md`) : le rapport lui-même n'en porte pas, pour que
`--check` reste une comparaison exacte.

## Ajuster la matrice

Tout est dans `cases.ts`, avec la provenance de chaque valeur : lignes, géométries, sol et
gabarit, passager, vents (`WIND_SPEEDS`, `WIND_DIRECTIONS`), coefficients (`COEFFICIENTS`) et
variantes. La première variante est la référence — traînée normale seule — à laquelle toutes les
autres sont comparées.

Rien d'autre n'est à modifier. Les deux comparaisons, les contrôles, le rapport et les tableaux
lisent la matrice sur les lignes résolues — jamais sur une liste, un identifiant ou un compte
répété ailleurs :

- les sondes sont imprimées telles qu'écrites, et « la plus grande » est la plus grande valeur,
  où qu'elle soit dans la liste ;
- chaque vent de `WINDS` a sa ligne dans les tableaux, et un groupe sans aucun cas affiche « — »,
  pas « échec » ;
- un contrôle auquel la matrice ne donne plus de cas — plus de vent nul, plus de vent traversier —
  **échoue** au lieu de disparaître, et le rapport s'arrête alors au diagnostic ;
- si le gabarit atteint le sol prescrit, le rapport le dit et compte les lignes concernées ;
- une liste de sondes vide, une sonde nulle ou négative, ou une sonde donnée deux fois est
  refusée au chargement : zéro est la référence, et les deux signes de portance sont ceux de la
  matrice.

La source imprimée à côté d'une valeur est du texte : en changeant la valeur, changer sa source.

## Fichiers

| Fichier | Rôle | § |
| --- | --- | --- |
| `aero.ts` | Fermeture : traînée normale, portance (deux lois d'orientation), traînée axiale | 18.3 |
| `solve.ts` | Équilibre spatial par tir depuis A : RK4, Newton amorti sur la fermeture en B | 18.2, 18.5 |
| `measures.ts` | Réactions, tensions, flèche, déport latéral, écart maximal à A–B, garde, charges, résidus | 18.5, 18.6 |
| `pose.ts` | Longueur qui lit une tension de pose donnée sous un vent et un modèle | 18.7 |
| `cases.ts` | La matrice : entrées, provenance, variantes | 18.4 |
| `run.ts` | Les deux comparaisons, ligne par ligne, tolérances et écarts | 18.6, 18.7 |
| `controls.ts` | Contrôles du prototype et état des matrices | 18.6 |
| `report.ts` | Rapport et CSV | — |
| `matrix.ts` | La commande | — |

## Tableaux produits

Sous `results/`, séparateur virgule, point décimal, SI :

- `fixed-l0.csv` — comparaison principale, à longueur non tendue identique : une ligne par cas et
  par variante, avec ses sorties, ses résidus, son écart de raffinement et ses écarts à la
  référence.
- `pose-tension.csv` — comparaison séparée, à tension de pose identique : mêmes colonnes, `L0_m`
  étant la longueur recalculée pour chaque modèle. À ne pas mélanger avec la précédente.
- `controls.csv` — chaque grandeur de chaque contrôle : attendu, obtenu, tolérance.
- `inputs.csv` — chaque entrée avec sa provenance et sa source.
- `shapes.csv` — coordonnées et tension le long d'une sélection de lignes (vent le plus fort,
  référence et plus grandes sondes), un nœud sur quarante.

Une ligne dont le statut n'est pas `ok` est un **échec numérique** : elle reste dans le tableau,
n'a pas d'écart, et n'est pas une impossibilité physique.

Dans `fixed-l0.csv` et `pose-tension.csv`, chaque écart à la référence tient en trois colonnes :
`ecart_<grandeur>` (absolu), `ecart_relatif_<grandeur>` (vide si la référence est trop proche de
zéro pour un pourcentage) et `ecart_resolu_<grandeur>` :

| `ecart_resolu_*` | Sens | `ecart_*`, `ecart_relatif_*` |
| --- | --- | --- |
| `oui` | écart au-dessus du plancher numérique de §18.6 | renseignés |
| `non` | écart sous le plancher : du bruit numérique, pas une différence entre deux modèles | **vides** |
| vide | pas d'écart à prendre : ligne de référence, ou ligne ou référence en échec | vides |

`ecart_max_AB_m` est l'écart maximal à A–B. Sur le sol prescrit, parallèle à A–B, la garde vaut
partout la même constante moins la flèche : `ecart_garde_m` est l'opposé de `ecart_fleche_m`, et
`ecart_relatif_garde` est la part d'une garde que fixe la hauteur d'ancrage du scénario — le
rapport ne l'imprime pas.

## Tests

`*.test.ts` à côté de chaque module, lancés par `bun run test` (`vite.config.ts` inclut
`experiments/**/*.test.ts`). Les valeurs attendues viennent de §15, de formes closes ou de calculs
à la main — jamais de la sortie du prototype.

La suite ne rejoue pas la matrice : chaque test résout la part dont il a besoin, et une matrice
ajustée s'y construit avec `variantsOf`, `windCase` et `baseCase`, sans toucher à `cases.ts`. Les
échecs d'une ligne — pas d'équilibre, bilan ou raffinement hors tolérance, pose non résolue — sont
injectés sur les collaborateurs (`vi.mock`), jamais cherchés : la matrice livrée n'en contient
aucun.
