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

## Ajuster la matrice

Tout est dans `cases.ts`, avec la provenance de chaque valeur : lignes, géométries, sol et
gabarit, passager, vents, coefficients (`COEFFICIENTS`) et variantes. La première variante est la
référence — traînée normale seule — à laquelle toutes les autres sont comparées.

## Fichiers

| Fichier | Rôle | § |
| --- | --- | --- |
| `aero.ts` | Fermeture : traînée normale, portance (deux lois d'orientation), traînée axiale | 18.3 |
| `solve.ts` | Équilibre spatial par tir depuis A : RK4, Newton amorti sur la fermeture en B | 18.2, 18.5 |
| `measures.ts` | Réactions, tensions, flèche, déport, écart combiné, garde, charges, résidus | 18.5, 18.6 |
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

## Tests

`*.test.ts` à côté de chaque module, lancés par `bun run test` (`vite.config.ts` inclut
`experiments/**/*.test.ts`). Les valeurs attendues viennent de §15, de formes closes ou de calculs
à la main — jamais de la sortie du prototype.
