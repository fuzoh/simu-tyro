# Results panel — safety verdict and provenance warnings

Type: grilling
Status: open
Blocked by: — (04, 05 resolved)
Map: [Zip-line simulator v1](../map.md)
Reads: [ticket 04](./04-span-and-rigging-parameter-model.md) — Régime de sécurité is a *panel*
field with no default (this ticket owns the regimes' contents: `k`, `η_t`, provenance); the
aggregate Unconfirmed-Defaults disclosure lives here; and the solve-dependent warnings
(> 30 % MBL, flèche < 3 % de la portée) are this ticket's, not the form's.

## Question

What numbers does the app report, and how does it tell the user that half its safety
constants come from standards nobody has bought?

Settle:

1. **The output list.** Enumerate every reported value with its French label and unit.
   Candidates from the theory: unloaded sag `D` and loaded sag; `H`; `T_max` over the whole
   traverse (§6.2 gives the anchor-tension envelope, and §2 notes `T` is maximal at the
   higher anchor); anchor loads `T_A` and `T_B` as magnitudes; minimum ground clearance
   `h_min` and the `x` where it occurs (§11); `L₀`; and the sag-to-span ratio, which gates
   the §3.1 parabola rule and the §8.2 stiffening warning. Decide which are headline and
   which are detail.
2. **Envelope versus instant.** The rider slider shows one position, but the safety verdict
   must be judged against the **worst** case over the whole traverse. Decide how both are
   present without confusing them — the number under the slider and the number the verdict
   uses are different numbers, and conflating them is a safety bug, not a UI wrinkle.
3. **Safety-factor regime.** §10.1 offers four regimes with sharply different answers:
   EN 15567-1 `k = 3.0`; WorkSafe QLD `FS ≥ 5` on suspended load **and** `FS ≥ 3` on total
   tension plus a 2× proof test; ACCT challenge-course, where the two research runs
   irreconcilably claim 10:1 and 5:1 and both sources are paywalled (§14 row 10); and
   rescue textile 10:1. §10.1 says **no blending** — the user picks a regime and it is
   labelled with its provenance. Decide the picker, the default, and how the unresolved
   ACCT conflict is presented rather than papered over.
4. **The verdict itself.** `T_allow = η_t·MBF/k` (§10.1) — termination efficiency multiplies
   MBF *before* the factor. Decide what pass/fail looks like, what the margin read-out is,
   and whether a near-miss gets its own state. Decide whether the WorkSafe two-criteria
   regime shows two verdicts or one combined.
5. **Provenance UI.** The map's binding rule: `[PAYWALLED]`, `[CONVENTION]` and
   `[UNVERIFIED:R1]` values are labelled, configurable defaults carrying a warning — never
   silent, never normative-looking. Design the mechanism once, here, and reuse it
   everywhere: a badge, an info popover, a footnote, a coloured field border? It has to
   scale — most of the safety framework is tagged. Decide the vocabulary the user sees for
   each trust tag, in French.
6. **Non-safety warnings.** Where these surface, and how loud: textile above 30 % MBL
   standing tension (§9.2); sag below 3 % of span (§8.2); span outside 50–2000 m; U-bolt
   grips on a person-bearing line (§10.2, regulatory); knots on HMPE (§10.3, prohibited);
   solver failure modes (§5.4).
7. **What the tool refuses to say.** §8.3 is explicit that the normative EN 15567 load
   combination is paywalled and that [R1]'s Eurocode-shaped formula is unverified — so the
   engine reports the physical envelope times the selected regime, with the combination
   exposed and labelled. Make sure the panel does not imply a compliance certificate.

## Context

Read `docs/simulation-theory.md` §10 in full, plus §8.1–§8.3, §11, §6.2, §14 rows 10, 11
and 19, and §16.

Depends on [Span and rigging parameter model](./04-span-and-rigging-parameter-model.md) and
[Material spec model](./05-material-spec-model.md) — the verdict consumes `MBF`/`MBL`, `η_t`
and the installation type those two define.
