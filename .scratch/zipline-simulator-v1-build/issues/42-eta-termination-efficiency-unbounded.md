# 42 — `η_t` n'a pas de plafond : une terminaison « à 90 » retourne le verdict

**What to build:** borner le rendement de terminaison à `η_t ≤ 1`. Aujourd'hui `na` / `nb`
n'acceptent qu'une règle `positive`, donc **une valeur supérieure à 1 traverse tout l'app** et
multiplie directement la charge de rupture dans `T_adm = η_t · MBF / k`. Une ligne « hors limites »
devient « dans les limites » sans un seul avertissement.

**Blocked by:** —

**Status:** ready-for-agent

Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 3, § 6 ·
[docs/simulation-theory.md](../../../docs/simulation-theory.md) § 10.1, § 10.2, § 10.3 · amende la
livraison des tickets [11](./11-materials-steel-and-textile.md) et
[12](./12-verdict-regimes.md) — voir `src/lib/rail/fields.ts:359-375` et
`src/lib/sim/verdict.ts:evaluateVerdict`.

**Source:** revue algorithmique du 2026-08-29 (point fixe = racine). Mesuré sur la
`FIRST_RUN_SCENARIO` (150 m, −18 m, flèche cible 6 m, acier 12 mm IWRC 1770, `m_p` 120 kg,
`DAF` 1,2), régime **ACCT 10:1**.

## Le défaut

§ 10.2 et § 10.3 publient `η_t` comme un **rendement** : le rapport entre ce que tient la
terminaison et le `MBF` du câble. Le maximum physique de la table entière est **1,00** (manchon
métal/résine, EN 13411-4) — une terminaison ne peut pas être plus solide que la corde qu'elle
termine. § 10.1 en fait un multiplicateur : `T_allow = η_t · MBF / k`.

Le champ ne porte pourtant qu'une règle de signe :

```ts
// src/lib/rail/fields.ts:359
etaA: { id: "etaA", quantity: "eta", rule: { kind: "positive", … }, gate: "verdict" },
```

et l'URL n'en tient pas davantage :

```ts
// src/lib/url/schema.ts:353
na: FINITE,
nb: FINITE,
```

`evaluateVerdict` ne vérifie que `requirePositive("eta.A", v.eta.A)`
(`src/lib/sim/verdict.ts`). Il n'existe **aucun plafond** sur le chemin URL → schéma → gate →
moteur.

### Le piège d'unité, et il est naturel

Le champ s'affiche à 2 décimales, sans unité, avec 0,90 pré-rempli. § 10.2 écrit ses valeurs en
pourcentage dans sa prose (« ≥ 90 % MBF »). **Taper « 90 » au lieu de « 0,90 » est la faute
d'un utilisateur qui lit la norme**, pas une valeur inventée par un attaquant.

## Mesure

`checkField("etaA", "90,00", { unit: "daN" })` retourne **`null`** — aucune erreur. Puis :

| `η_A = η_B` | `T adm` (k = 10) | `FS effectif` A | Verdict |
| --- | --- | --- | --- |
| 0,90 *(correct)* | 8 166 N | 8,80 | **Hors limites** |
| 2,50 | 22 684 N | 24,45 | Dans les limites |
| 90,00 | **816 636 N** | **880,11** | **Dans les limites** |

`MBF` du câble = **90 737 N**. À `η = 90` l'app affiche donc une tension admissible **neuf fois
supérieure à la charge de rupture de la corde**, et un verdict vert, sur une ligne que le même
régime refuse à la valeur correcte.

Reproduction :

```ts
import { deriveSteel, resolveL0, solveSpan, sweep, evaluateVerdict } from "@/lib/sim";
const mat = deriveSteel({ family: "steel", d: 12, R0: 1770, construction: "iwrc" });
const l0 = resolveL0({ mode: "sag", D_target: 6 }, { L: 150, h: -18, ...mat });
const input = { L: 150, h: -18, L0: l0.value, w: mat.w, EA: mat.EA, loads: [], strength: mat.strength };
const un = solveSpan(input), sw = sweep(input, 120 * 9.81);
evaluateVerdict({ steps: sw.steps, coverage: 1, Tvide: { TA: un.state.TA, TB: un.state.TB },
  DAF: 1.2, regime: "acct10", eta: { A: 90, B: 90 }, strength: mat.strength,
  usage: "PERMANENTE", terminations: { A: "cosse-oeil-flamand", B: "cosse-oeil-flamand" },
  family: "steel" });
// → state "dans-les-limites", ends.A.FS 880,11, cells[0].Tadm 816 636 N
```

## Ce qu'il faut

1. **Une règle de champ à plafond.** `fields.ts` n'a aujourd'hui que `positive`, `finite` et la
   borne de station : il faut une troisième forme (`{ kind: "range", min, max, sentence }`) ou une
   règle `efficiency` dédiée, sur `etaA` / `etaB`, `gate: "verdict"` comme aujourd'hui — de sorte
   qu'un `η > 1` soit une **Blocking Error** avec son Champ responsable et sa Fix Action
   (« Ramener à 1,00 »), pas un silence. La borne basse reste `> 0`.
2. **Le schéma URL le refuse aussi**, comme `na=abc` : un lien porteur de `na=90` doit tomber dans
   la même salvage que les autres valeurs hors plage, sinon la Blocking Error arrive après coup.
3. **Une garde côté moteur.** `evaluateVerdict` valide déjà `DAF`, `strength` et `η > 0` par
   `RangeError` (bugs d'appelant, § 2). `η ≤ 1` appartient à la même famille : le moteur ne doit
   pas pouvoir produire un `T_adm > MBF`. Ajouter la borne haute à `requirePositive` /
   à un `requireEfficiency`.
4. **Test.** Le fait mesuré ci-dessus est le test : `η = 90` sur la ligne livrée passe
   « hors limites » → « dans les limites ». Aucun test actuel ne fait franchir 1 à `η`
   (`verdict.test.ts` n'utilise que 0,55–1,00).

## Ce que ce ticket ne demande pas

Ne pas retirer l'éditabilité de `η_t` : § 10.2 est une table de `[CONVENTION]` et de plages, et la
règle contraignante de `docs/conventions/simulation.md` veut le champ éditable et étiqueté. Le
plafond est 1,00, pas la table.
