# 45 — Le repli « quasi-tendu » ignore les charges ponctuelles et rend `ok: true` sur un résidu de 76 mm

**What to build:** faire que § 4.3's straight-bar fallback refuse — ou traite — un `SpanInput` porteur
de charges. Il construit aujourd'hui sa barre élastique **à partir du seul poids propre**, jette le
passager, et retourne un `SpanState` marqué `ok: true` avec la note `near-taut-fallback` alors que la
condition aux limites `z(L₀) = h` est violée de **7,6 cm**.

**Blocked by:** —

**Status:** ready-for-agent

Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 2 (*le contrat du moteur*) ·
[docs/simulation-theory.md](../../../docs/simulation-theory.md) § 4.3 (*Near-taut / low-weight*),
§ 5.3 (la tolérance), § 6.1 (les charges ponctuelles) · amende la livraison des tickets
[06](./06-solve-damped-newton.md) et [07](./07-point-load.md) — voir `solveSpan` et
`straightBarIterate` dans `src/lib/sim/solve.ts`.

**Source:** revue algorithmique du 2026-08-29 (point fixe = racine).

## Le défaut

```ts
// src/lib/sim/solve.ts — solveSpan
const bar = straightBarIterate(input);
if (bar && isNearTaut(input.w, input.L0, bar.H)) {
  notes.push("near-taut-fallback");
  return { ok: true, state: toState(input, bar, 0), notes };
}
```

`straightBarIterate` ne lit que `L`, `h`, `L0`, `EA` et `w` :

```ts
const T = (chord / input.L0 - 1) * input.EA;
return { H: (T * input.L) / chord, V0: (T * input.h) / chord - (input.w * input.L0) / 2 };
```

**`input.loads` n'apparaît nulle part** — ni dans la barre, ni dans le test `isNearTaut(w, L0, H)`,
qui pèse `w·L₀` contre `H` alors que la charge pertinente est `w·L₀ + ΣP`. `toState` ajoute ensuite
`ΣP` à `VB` sans que `V₀` en ait rien vu, si bien que l'état retourné ne satisfait ni la statique
(§ 6.1) ni les conditions aux limites (§ 4.1) — et le sort par le chemin « succès », avec zéro
itération et un `SolveNote` que **rien dans l'UI ne lit** (§ 2 : « no `SolveNote` ever reaches the
UI »).

Le repli est correct sur la ligne à vide, où la barre *est* la réponse. Il n'a jamais été dérivé
pour une ligne chargée.

## Mesure

Corde textile, `MBL` 2 000 kN, `k` 22 ⇒ `EA` 44 MN, `μ` 0,075 kg/m ⇒ `w` 0,736 N/m ; portée 200 m
de niveau ; plancher § 5.4 = 191,304 m. À `L₀ = 193,2174 m` (au-dessus du plancher, donc admissible),
passager `P = 1 177 N` à mi-longueur :

| | à vide | chargée |
| --- | --- | --- |
| `H` | 1 544 555 N | **1 544 555 N** *(identique — le passager n'a rien fait)* |
| `V₀` | −71,1 N | **−71,1 N** |
| `V_B` | +71,1 N | +1 248,1 N |
| `z` à mi-longueur | — | **−0,0023 m** *(la ligne ne s'affaisse pas sous le passager)* |
| résidu `z(L₀) − h` | 0,000e+0 | **+7,620e−2 m** |
| résidu `x(L₀) − L` | −6,8e−8 | −2,98e−5 |
| `iterations` | 0 | **0** |
| `ok` | true | **true** |

Sur une portée de niveau avec un passager centré, la symétrie impose `V₀ = −(w·L₀ + P)/2 = −658,9 N`
et `V_B = +658,9 N`. L'état rendu donne **−71,1 / +1 248,1** : les deux ancrages sont désaccordés de
1 177 N, soit exactement le passager, entièrement rejeté sur B. Le résidu de 7,6 cm est **76 000 fois**
la tolérance § 5.3 de `1×10⁻⁶ m`.

Reproduction :

```ts
const w = 0.075 * 9.81, EA = 22e6 * 2, strength = 2e6, L = 200, h = 0, L0 = 193.2174;
solveSpan({ L, h, L0, w, EA, loads: [{ P: 1177, s: L0 / 2 }], strength });
// → ok: true, notes ["near-taut-fallback"], V0 −71,1 N, VB 1248,1 N, iterations 0
```

## Atteignabilité

`isNearTaut` demande `w·L₀ / H < 10⁻⁴` avec `H ≤ strength`, donc `MBL > 10⁴·w·L₀`. Deux portes,
toutes deux ouvertes par des champs sans borne haute :

- **Textile** — `MBL` et `k` ne portent qu'une règle `positive` (`fields.ts`). Le cas mesuré
  ci-dessus est une saisie, pas une injection : une confusion daN/N sur `MBL` suffit.
- **Acier** — l'`Override` de `MBF` est un champ numérique libre ; un `MBF` surchargé très au-dessus
  de l'`EA` dérivé abaisse le plancher § 5.4 et ouvre la même bande.

Sur les matériaux plausibles la branche reste inatteignable — c'est ce que mesure le docblock
d'`isNearTaut` et le test « the branch is reachable on the stretched side only ». **Ce ticket ne
conteste pas cette mesure** : il constate qu'elle a été faite à vide, et que le repli est traversé par
le balayage § 6.2, où chacun des 260 pas porte une charge.

## Ce qu'il faut

La correction minimale et sûre : **ne prendre le repli que si `input.loads.length === 0`**. Là où il
n'est pas pris, Newton fait le travail — c'est déjà ce que le test livré mesure sur le versant mou
(« where the band *is* reached Newton simply converges »), et la même remarque vaut ici, la barre
n'étant qu'un point de départ que `seedIterates` fournit de toute façon.

Si l'on veut garder le repli sous charge, il faut une barre à deux segments (§ 6.1 sur une corde
tendue : `V₀ = T·h/d − (w·L₀ + ΣP)/2`, avec le nœud au bon endroit) — mais rien ne le demande, et
« la barre est la réponse » n'est vrai qu'à vide.

## Couverture de test

`solve.test.ts:527-590` couvre la branche quatre fois, **toujours avec `loads: []`**. Aucun test du
dépôt n'appelle `solveSpan` avec à la fois une charge et une ligne quasi-tendue. Le test à écrire est
la mesure ci-dessus : un état retourné avec `ok: true` doit satisfaire son propre résidu
`‖(x(L₀) − L, z(L₀) − h)‖ ≤ residualTolerance(L)` — une invariante que **tout** chemin de succès du
solveur devrait porter, et que celui-ci est le seul à ne pas tenir.
