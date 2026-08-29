# 46 — Le docblock de `STEEL.K` cite comme attestation le triplet 6 mm que § 14 #21 réfute

**What to build:** corriger le commentaire de provenance de `STEEL.K` dans
`src/lib/sim/materials/steel.ts`. Il présente comme attestation les trois valeurs que
`docs/simulation-theory.md` § 13.1 et le § 14 #21 **réfutent explicitement** — dans le fichier même
dont l'en-tête promet que « no value is transcribed from it ».

**Blocked by:** —

**Status:** ready-for-agent

Spec: [docs/conventions/simulation.md](../../../docs/conventions/simulation.md) (« When you implement
a formula, cite its source in a comment ») ·
[docs/simulation-theory.md](../../../docs/simulation-theory.md) § 13.1, § 14 #21 · amende la
livraison du ticket [11](./11-materials-steel-and-textile.md).

**Source:** revue algorithmique du 2026-08-29 (point fixe = racine). Aucun nombre calculé ne bouge :
c'est un défaut de provenance, et la convention en fait un défaut à part entière.

## Le défaut

```ts
// src/lib/sim/materials/steel.ts — STEEL.K
/**
 * EN 12385-4 6×19 class factors, `[STD-ATTESTED]` [R2 B15] — `MBF [kN] = K·d²·R₀/1000`.
 * Attested against 6 mm 6×19: 12,9 kN (1770 FC), 14,4 kN (1770 IWRC), 21,0 kN (1960 FC). The
 * full 10–20 mm tables are `[PAYWALLED]`, so every larger diameter is computed from `K`.
 */
```

§ 13.1 dit l'inverse, mot pour mot :

> The transcribed 6 mm 6×19 triple — 12.9 kN (1770 FC), 14.4 kN (1770 IWRC), 21.0 kN (1960 FC) —
> does **not** reproduce from these K-factors and is demoted to `[UNVERIFIED:R2]` (§14 #21) […]
> The quoted "21.0 (1960 FC)" is in fact the 1770 FC computation, mislabelled; 12.9/14.4 kN match
> no `(K, R₀)` pairing tried. **`MBF` is what the verdict divides by, so the computed triple is what
> ships, not the transcription.**

`K·d²·R₀/1000` à 6 mm donne **21,03 / 22,68 / 23,28 kN**. Le commentaire affirme donc que les
`K`-facteurs sont attestés *contre* trois nombres dont § 14 #21 établit qu'ils ne s'en déduisent pas —
et il les étiquette `[STD-ATTESTED]`, le tag le plus fort de § 0.2, sur une valeur que le même
document classe `[UNVERIFIED:R2]`.

`docs/conventions/simulation.md` fait de la citation de source une obligation de même rang que la
formule elle-même (« Termination efficiency, MBR and safety coefficients are regulatory values, not
tunables »). Un commentaire de provenance faux est ce que la convention interdit, d'autant que ce
docblock est ce que le popover de provenance paraphrase à l'écran.

## Ce qui est déjà juste

- **Le code.** `steelFormula` calcule `K·d²·R₀` en newtons, sans transcription — rien à changer.
- **Le test.** `materials/steel.test.ts:72-86` porte déjà le bon récit (« *§13.1's 6 mm 6×19 triple,
  recomputed from K — §14 #21* ») et fixe **21,03 kN**. Le fichier de test et le fichier de source
  se contredisent aujourd'hui.

## Ce qu'il faut

Remplacer la deuxième phrase du docblock par la vérification que § 13.1 dit reproduire — le
recoupement à 10 mm, qui, lui, tombe juste — et nommer le triplet 6 mm pour ce qu'il est : la
transcription réfutée par § 14 #21, avec le triplet recalculé 21,03 / 22,68 / 23,28 kN à côté.
Garder `[STD-ATTESTED]` sur les `K` eux-mêmes, qui le sont.
