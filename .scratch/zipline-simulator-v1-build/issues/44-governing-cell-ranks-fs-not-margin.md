# 44 — `governingCell` classe sur `FS` brut, pas sur la marge `FS / k` — le bandeau nomme le mauvais critère

**What to build:** décider sur quelle grandeur `governingCell` départage deux cellules **de même
état**. Elle compare aujourd'hui des `FS effectif` calculés contre des diviseurs différents, ce qui
n'est pas une comparaison ; le critère nommé par le bandeau n'est donc pas le critère le plus proche
de mordre. **Le cas se produit sur la ligne livrée**, sous WorkSafe QLD.

**Blocked by:** —

**Status:** ready-for-human *(un test livré fixe le comportement actuel comme attendu)*

Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 6 (*La grille critères × extrémités*,
*Cinq états de verdict*) · [docs/simulation-theory.md](../../../docs/simulation-theory.md) § 10.1 ·
amende la livraison du ticket [12](./12-verdict-regimes.md) — voir `governingCell` dans
`src/lib/sim/verdict.ts`.

**Source:** revue algorithmique du 2026-08-29 (point fixe = racine). Mesuré sur la
`FIRST_RUN_SCENARIO` (150 m, −18 m, flèche cible 6 m, acier 12 mm IWRC 1770, `η` 0,90 / 0,90,
`m_p` 120 kg, `DAF` 1,2, couverture 260/260), régime **WorkSafe QLD 2019**.

## Le défaut

```ts
// src/lib/sim/verdict.ts — governingCell
const bySeverity = SEVERITY[cell.state] - SEVERITY[best.state];
if (bySeverity > 0 || (bySeverity === 0 && cell.FS < best.FS)) best = cell;
```

Le premier critère — la sévérité — est juste, et c'est lui qui fixe `VerdictResult.state`. **Le
départage est faux.** WorkSafe QLD est le seul régime à deux critères, et § 10.1 lui donne **deux
diviseurs différents** : `k = 3` sur la tension totale, `k = 5` sur la charge suspendue. Un `FS` de
8,80 contre 3 et un `FS` de 12,29 contre 5 ne sont pas comparables : ce qui se compare est la marge
`FS / k`, c'est-à-dire de combien on peut serrer avant que la cellule tombe.

Le docblock du module écrit que « *lequel est contraignant est une information* que l'utilisateur
veut (une ligne molle est gouvernée par la charge suspendue, une ligne tendue par la tension
totale) ». C'est précisément l'information que le classement actuel produit à l'envers.

## Mesure — sur la ligne livrée, pas sur un cas construit

| Cellule | `k` | `FS effectif` | **marge `FS / k`** | État |
| --- | --- | --- | --- | --- |
| Tension totale, ancrage A | 3 | 8,801 | **2,934** | Dans les limites |
| Tension totale, ancrage B | 3 | 9,059 | 3,020 | Dans les limites |
| Charge suspendue | 5 | 12,289 | **2,458** | Dans les limites |

`governing` → **tension totale, ancrage A**. La cellule la plus proche de mordre est la **charge
suspendue** : elle a 2,46 fois son diviseur contre 2,93 pour celle que le bandeau nomme, soit **19 %
de marge en moins**. Le bandeau imprime « Dans les limites — WorkSafe QLD 2019 (k = 3,0) », en
nommant le diviseur du critère qui n'est pas le plus contraignant.

Le docblock du module cite ce même couple 8,80 / 12,29 comme la **justification** du classement
actuel. C'est le contre-exemple.

Reproduction : la première exécution telle quelle avec `regime: "wsqld"` ; lire
`v.cells.map(c => [c.criterion, c.k, c.FS, c.FS / c.k])`.

## Portée exacte du défaut

- **`VerdictResult.state` est correct** et le reste : la sévérité l'emporte avant le `FS`, donc la
  cellule qui échoue est bien celle qui décide de l'état. Le défaut ne peut pas transformer un
  « hors limites » en « dans les limites ».
- **Ce qui est faux, c'est la désignation** : `governing.criterion`, `governing.end`, `governing.k`,
  et donc la phrase de `verdictSentence` (« critère charge suspendue » / « (k = 3,0) ») et la cellule
  marquée dans la grille.
- **Le cas ne se produit qu'à sévérité égale**, donc surtout à l'intérieur d'une même bande — mais
  c'est là que la question « lequel est contraignant ? » se pose, puisque rien n'échoue encore.

## Ce qu'il faut décider

`cell.FS / cell.k < best.FS / best.k` est le départage qui répond à la question que le docblock pose.
Il est monotone, sans unité, et redonne le même résultat que l'actuel dès que les `k` sont égaux —
c'est-à-dire pour les quatre régimes à critère unique, dont aucune sortie ne change.

À trancher, parce que le choix est éditorial autant que numérique :

1. Le seuil « marge faible » est déjà `FS < 1,1·k`, donc `FS / k` est **la grandeur que
   `cellState` utilise déjà**. Passer `governingCell` à la même grandeur rend les deux cohérents.
2. § 6 pourrait vouloir que le bandeau nomme la cellule au plus petit `FS` parce que c'est le
   chiffre imprimé en tête. Alors le classement reste, et c'est le docblock qui doit cesser de
   promettre « lequel est contraignant ».

## Couverture de test

`verdict.test.ts:295` — « *it scores 12,29 on the shipped line, and total tension governs at 8,80* »
— **fixe le comportement défectueux comme attendu**. Le test voisin (« *the banner names the failing
cell even when another cell reads a lower FS* », ligne 316) est correct et n'est pas en cause : il
exerce la sévérité, pas le départage. Toute correction commence par re-écrire le premier.
