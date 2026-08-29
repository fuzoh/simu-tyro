# 43 — Le « FS effectif » en tête lit l'ancrage le plus tendu, pas le moins favorable

**What to build:** décider quelle extrémité la ligne de tête « FS effectif » rapporte quand les deux
terminaisons ont des rendements différents. Elle lit aujourd'hui l'ancrage de **plus forte tension**,
qui n'est pas l'ancrage de **plus faible marge** dès que `η_A ≠ η_B` — le chiffre unique en tête est
alors optimiste de 57 % sur une ligne que la grille juge hors limites.

**Blocked by:** —

**Status:** ready-for-human *(le choix touche § 6, qui fixe la ligne explicitement)*

Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 6 (*Les treize valeurs rapportées*,
*La marge est un facteur de sécurité effectif*) ·
[docs/simulation-theory.md](../../../docs/simulation-theory.md) § 10.1, § 10.2 · amende la livraison
du ticket [25](./25-rail-output-half.md) — voir `src/lib/rail/results.ts:249-259` et
`requiredDivisor` au même fichier.

**Source:** revue algorithmique du 2026-08-29 (point fixe = racine), mesurée sur la
`FIRST_RUN_SCENARIO` (150 m, −18 m, flèche cible 6 m, acier 12 mm IWRC 1770, `m_p` 120 kg,
`DAF` 1,2), avec des terminaisons **asymétriques** — ce que deux sélecteurs indépendants et deux
clés d'URL (`na`, `nb`) permettent, et ce que la réalité d'un chantier produit.

## Le défaut

`headline.end` est choisi sur la tension :

```ts
// src/lib/sim/verdict.ts
const headlineEnd: "A" | "B" = empty || ends.A.Tdaf >= ends.B.Tdaf ? "A" : "B";
```

et la ligne de tête lit son `FS` là :

```ts
// src/lib/rail/results.ts:251
formatQuantity("FS", verdict.ends[verdict.headline.end].FS)
```

`EndEnvelope.FS` vaut `η_end · MBF / T_DAF,end`. **Deux termes bougent, pas un.** L'extrémité la plus
tendue est la moins favorable seulement quand `η` est identique aux deux bouts — ce qui est vrai de la
ligne livrée et faux dès qu'un utilisateur pose un manchon d'un côté et une épissure de l'autre.

`governing` (le bandeau) et `reserve` prennent tous deux le **minimum** sur les extrémités et
désignent donc B correctement. La ligne de tête, seule, désigne A.

## Mesure

Ligne livrée, `η_A = 1,00` (manchon métal/résine, § 10.2 `[STD-ATTESTED]`), `η_B = 0,62`
(entre l'épissure 0,80 et le nœud de huit 0,60 — une valeur que la règle contraignante rend
saisissable) :

| | ancrage A | ancrage B |
| --- | --- | --- |
| `T max` majoré | **le plus grand** | plus petit |
| `FS effectif` | **9,78** | **6,24** |

| Régime | Ligne de tête « FS effectif » | Cellule gouvernante | Verdict |
| --- | --- | --- | --- |
| EN 15567 (k = 3) | 9,78 | B, 6,24 | Dans les limites |
| ACCT 10:1 (k = 10) | **9,78 · exigé 10,0** | B, **6,24** | **Hors limites** |

Sous ACCT le lecteur voit en tête « FS effectif 9,78 · exigé 10,0 » — un manque de 2 % — au-dessus
d'un bandeau « Hors limites — critère tension totale (ancrage B) », dont la marge réelle manque de
**38 %**. Le chiffre en tête est optimiste de **57 %** par rapport à celui qui décide.

Reproduction : la première exécution telle quelle, avec `eta: { A: 1, B: 0.62 }` et
`regime: "acct10"` ; `v.ends[v.headline.end].FS` → 9,78, `v.governing.FS` → 6,24.

## Le fond de la question

`requiredDivisor` (même fichier) documente longuement pourquoi le `k` affiché **doit** être celui de
la tension totale et non celui de la cellule gouvernante : « seule cette ligne est un rapport que le
lecteur peut re-dériver », en le divisant par le `T max` imprimé juste à côté. Cet argument tient —
mais il tient pour le **couple** `(T max, FS)`, pas pour le choix de l'extrémité. Trois sorties :

1. **Choisir `headline.end` sur `FS`, pas sur `T_DAF`** (le minimum de `ends.A.FS`, `ends.B.FS`).
   Le `T max` en tête suivrait alors l'ancrage le moins favorable et non le plus tendu — ce qui
   contredit § 6 (« T max ... ancrage A ») et casse la re-dérivation dans l'autre sens.
2. **Découpler les deux lignes** : `T max` reste à l'ancrage le plus tendu, `FS effectif` passe au
   minimum sur les extrémités, et la ligne `FS` porte son propre qualificatif « (ancrage B) ». La
   re-dérivation reste possible parce que la grille critères × extrémités porte les deux ancrages ;
   le prix est un lecteur qui divise deux lignes voisines et n'obtient pas le quotient attendu —
   exactement ce que `requiredDivisor` refuse pour le `k`.
3. **Garder la lecture actuelle et l'annoncer** : ajouter au qualificatif de la ligne `FS` une
   mention de l'ancrage (« ancrage A »), symétrique de celle que porte déjà `T max`, pour que le
   chiffre ne se lise pas comme un maximum sur la traversée. Le moins cher ; il ne supprime pas
   l'optimisme, il le nomme.

**La décision est celle de l'utilisateur**, parce que § 6 dépense une page sur la réconciliation
`T max` / `FS` et que (1) et (2) la remettent en cause dans deux directions opposées. Le défaut
mesuré, lui, n'est pas discutable : le chiffre unique en tête est aujourd'hui le plus favorable des
deux, sur une grandeur dont tout le reste de l'app prend le pire.

## Couverture de test

`verdict.test.ts` n'exerce jamais `η_A ≠ η_B` en même temps qu'une lecture de `headline`. La
`FIRST_RUN_SCENARIO` porte délibérément deux terminaisons identiques (« Identiques aux deux bouts
**délibérément** », `first-run.ts`), donc la régression livrée ne peut pas voir ce cas. Un test doit
fixer, quelle que soit la sortie choisie, la relation entre `headline.end`, `governing.end` et
`reserve.end` sous rendements asymétriques.
