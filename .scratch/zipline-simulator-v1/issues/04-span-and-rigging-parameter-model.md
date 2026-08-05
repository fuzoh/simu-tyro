# Span and rigging parameter model, and the three parameterisation modes

Type: grilling
Status: resolved
Blocked by: —
Map: [Zip-line simulator v1](../map.md)

## Question

Exactly which parameters appear in the left-hand panel, in what groups, in what units, with
what validation — and how does the user choose between the three ways of specifying how
tight the line is?

Settle:

1. **The parameter list.** Enumerate every field, with its French label, its unit, its
   range and its default. Expected groups, to confirm or restructure: installation type
   (`PERMANENT` / `TEMPORARY_RESCUE`, the §10.4 gate), span geometry (`L`, `h`, or anchor
   heights above their terrain), the line itself (deferred to
   [Material spec model](./05-material-spec-model.md)), and the rider (mass — §8.1 default
   120 kg labelled *unconfirmed EN 15567 design mass*; `h_rider` — §6.3 default 2.1 m,
   `[CONVENTION]`, must carry its warning).
2. **Parameterisation mode.** §7 gives three ways in, all converting to `L₀`: direct `L₀`,
   target installed tension `H_target`, or target unloaded sag `D_target`. Decide whether
   the UI exposes all three, and how — a segmented control that swaps one field, or three
   always-visible fields with one "driving" and the others shown as computed read-outs. The
   second is more informative and much harder to make coherent. Pick one and say why.
   Practitioners think in pretension (a dynamometer reading) or in sag (a tape measure);
   almost nobody thinks in unstretched length.
3. **Geometry framing.** Does the user enter `L` and `h` directly, or anchor heights above
   the ground at each end with the span read off the terrain? These differ once GPX terrain
   exists — and the map's scope decision says anchors are placed on the profile by
   *distance from start* and *height above profile*. Make the manual and GPX modes use the
   **same** framing, or state plainly why they cannot.
4. **Validation.** Which constraints are hard (block the solve) and which are warnings.
   Known hard ones: `L₀ ≥ chord` and more precisely `L₀ > chord/(1 + T_break/EA)` (§5.4);
   the §10.4 use-class gate rejecting textile on a permanent installation. Known warnings:
   textile above 30 % MBL standing tension (§9.2), sag under 3 % of span stiffening the
   dynamic response (§8.2), a span outside the 50–2000 m validity range.
5. **Units and input affordances.** SI internally, always (§2). But does the UI show
   newtons or decanewtons or kilograms-force for tension? French rigging practice quotes
   **daN** and the SSF field data in `docs/simulation-theory.md` §10.1 is quoted in daN.
   Decide, and decide whether the user can type in the other unit.
6. **Deriving `w`.** Weight per unit unstretched length `w = μ·g` is a material output, but
   confirm here whether the panel shows it, and whether `g` is fixed at 9.81 or exposed.

## Context

Read `docs/simulation-theory.md` §1 (vocabulary — French labels should match the FR column),
§2 (frames and sign conventions — `h < 0` means B lower than A, and the UI must not muddle
that), §7 (parameterisation modes, and the monotonicity of `H` in `L₀` that makes mode 2
safely bisectable), §8.1 (rider load), §6.3 (`h_rider`), §10.4 (use-class gate).

Honour the map's binding provenance rule: `[CONVENTION]`, `[PAYWALLED]` and
`[UNVERIFIED:R1]` defaults are labelled, configurable and carry a warning. That applies to
the 120 kg rider mass and the 2.1 m `h_rider` in particular.

This ticket stops at the *inputs*. Outputs and the safety verdict belong to
[Results panel](./08-results-panel-and-provenance-warnings.md).

## Answer

Resolved by grilling, 2026-08-05. The field table below is the contract; tickets 05, 06,
08, 09, 11 and 13 read their inputs from it.

### 1. Geometry framing — two framings, and why they cannot be one

Manual mode types **`L` and `h` directly**. GPX mode places anchors as
(station along the track, height above the profile there) and shows `L` and `h` as computed
read-outs.

They differ deliberately. `solveSpan` takes exactly `(L, h)`; typing those two numbers is
strictly better than backing them out of a terrain that does not exist yet. Forcing the
GPX framing onto manual mode would mean every metre of `h` comes from tower height — a
200 m line dropping 30 m would need a 30 m tower at A. Numerically identical, but a lie
about the installation.

**Manual-mode ground** is the straight line joining the two **anchor bases**, from two extra
fields (hauteur d'ancrage A / B). Consequence: garde au sol (§11) is live from first launch,
not only after a GPX import, and it reads the way a practitioner judges a line — pole height
against sag. Anchor heights feed **terrain only**; they never reach `solveSpan`.

```
h_clear(x) = z_cable(x) − z_sol(x) − h_rider

  A ─────────────────
  │▲       cable      ╲
  │4m       ╲──────── ╲ B
  base╲                 │▲2.5m
       ╲── sol ──────────base
```

**This refines ticket 03's terrain seam.** Manual terrain emits
`{ kind: "profile", xs: [0, L], zs: [zBaseA, zBaseB] }` — the 2-point case of the union that
already exists, resolved by the same linear interpolation. No engine change. `{ kind: "flat" }`
stays in the union but v1's UI never emits it (it remains useful for fixtures). CONTEXT.md's
**Terrain** entry was amended accordingly: not "a flat baseline at anchor-base level" but
"a straight ground line between the two anchor bases".

### 2. The field table

Hard = blocks before the engine. Warning = non-blocking, needs no solve.

| Groupe | Champ (FR) | Symbole | Unité | Dur | Avertissement | Initial |
| --- | --- | --- | --- | --- | --- | --- |
| Usage | Type d'installation | — | — | §10.4 gate | — | `PERMANENTE` |
| | Régime de sécurité | — | — | requis | — | *aucun* |
| Géométrie | Portée | `L` | m | `> 0`, fini | ∉ [50, 2000] (§3) | → premier lancement |
| | Dénivelé | `h` | m | fini | `\|h\| > L` (>45°) | → premier lancement |
| | Hauteur d'ancrage A | — | m | `≥ 0` | `> 30` | → premier lancement |
| | Hauteur d'ancrage B | — | m | `≥ 0` | `> 30` | → premier lancement |
| Ligne | famille + spec | — | — | gated | — | → [ticket 05](./05-material-spec-model.md) |
| Tension de la ligne | Flèche à vide cible | `D_target` | m | `> 0` | — | → premier lancement |
| | Prétension cible | `H_target` | daN | `> 0` | — | → premier lancement |
| | Longueur non tendue | `L₀` | m | `> 0` | — | → premier lancement |
| Passager | Masse | `m_p` | kg | `> 0` | ⚠ non confirmé | **120** |
| | Enveloppe passager | `h_rider` | m | `> 0` | ⚠ non confirmé | **2.1** |

`h < 0` means B below A (§2). The label and its helper text must not muddle that — a
downhill line has a **negative** dénivelé.

**Valeurs déduites** (read-outs, never editable): the two non-driving tightness quantities,
poids linéique `w`, corde `√(L²+h²)`, and — in GPX mode only — `L` and `h`.

Ranges and thresholds are fixed here; the **scenario numbers** graduate (see §7 below).

### 3. Tightness Spec — segmented control, one editable field

A segmented control (`Flèche` / `Tension` / `Longueur`) picks the driving quantity. Exactly
one field is editable; the other two appear under **Valeurs déduites** as unambiguous
outputs. Switching mode pre-fills the new field from its read-out — ticket 03's carry-over,
which is why "target 250 daN" → "longueur directe" lands on the length just achieved.

```
Tension de la ligne
┌────────┬──────────┬──────────┐
│ Flèche │ Tension  │ Longueur │
└────────┴──────────┴──────────┘
Flèche à vide cible   [ 6.0 ] m

── Valeurs déduites ─────────────
Prétension           312 daN
Longueur non tendue  201.84 m
```

Rejected: three always-visible editable fields with a radio marking the driver. Every
keystroke can flip which quantity is the model's meaning, and the two passive fields need
stale-then-fresh states during recompute. Also rejected: hiding direct `L₀` — practitioners
rarely think in unstretched length, but it is the internal state variable and §9's `ΔL₀`
story needs it typeable.

Default mode is settled with the first-run scenario, not here.

### 4. Use-class gate (§10.4) — disabled with the reason shown

Textile stays **visible but disabled** under `PERMANENTE`, with §10.4's reason inline. The
rule is a fact worth teaching; hiding the option leaves a user who came to compare families
with no explanation.

```
Type d'installation
 (●) Permanente (public)
 ( ) Temporaire — secours & expédition

Famille de ligne
 (●) Câble acier
 ( ) Corde textile  — indisponible
     ℹ §10.4 : fluage, UV/abrasion et fusion par friction
       (HMPE ~144–152 °C) ⇒ acier seul en installation permanente
```

The transition path — switching to `PERMANENTE` while textile is already configured — is a
**blocking error with a one-click fix** (`Passer à l'acier`), never a silent auto-switch: an
auto-switch would discard the Material Spec the user just built.

### 5. Units and constants

- **SI internally, always** (§2). Canonical storage is newtons, so unit round-trips are
  lossless.
- A **global force-unit selector** — `daN` (default) / `kN` / `kgf` — applies to every force
  in the app; not per-field. Persisted in URL search params and localStorage as a display
  preference (ticket 09 places it in the schema).
- Switching the unit **converts the quantity and reformats the field**: 312 daN becomes
  3.12 kN and the line stays exactly as tight. No re-solve, no verdict change. This is the
  property that kills the 10× input-error class the toggle would otherwise introduce — a
  display control must be provably physics-neutral.
- `w` follows the force unit: daN/m, kN/m, kgf/m.
- **`g` is fixed at 9.81 and not exposed.** It varies ≤ 0.3 % over the Earth, immaterial
  beside the ±15 % spread in `EA` and `MBF`, and exposing it would add a fourth way to get a
  wrong answer plus URL state and fixture surface. 9.81 is what §8.1 (`120 kg → 1.177 kN`)
  and fixture Z8 use. Nothing in §15's statics fixtures constrains it — they pin `w`
  directly (`w = 5 N/m`).
- **`kgf` uses 9.80665**, its strict definition. Two constants, each correct in its role:
  `G = 9.81` for physics, `KGF = 9.80665` for the unit. A 120 kg mass therefore reads as
  120.04 kgf; the 0.03 % discrepancy is disclosed in the kgf note rather than papered over.

### 6. Unconfirmed Defaults — chip labels, popover warns

A «non confirmé» chip labels the field; clicking it discloses the provenance and the §
reference. The aggregate disclosure lives in the results panel (ticket 08).

```
Passager
Masse              [ 120 ] kg  ⚠ non confirmé
Enveloppe passager [ 2.1 ] m   ⚠ non confirmé

⚠ Masse de calcul non confirmée
  120 kg attribué à EN 15567-1 §4.1.2 mais introuvable dans
  le texte primaire [UNVERIFIED:R1]. Acheter la norme.
  §8.1 · docs/simulation-theory.md
```

Rejected: always-visible warning paragraphs under each field. With the rider group, the
safety regime and several material coefficients all unconfirmed, the panel becomes mostly
warning text and users learn to scroll past it — which defeats the rule it implements.

Editing an Unconfirmed Default flips its chip to *valeur utilisateur* but does **not** remove
it from the aggregate list. "No normative value exists" stays true whatever the user types;
a user-supplied 100 kg is no more standards-backed than the shipped 120 kg.

### 7. Validation — two tiers, one source of truth each

```
FORM  (no physics — §simulation.md forbids re-deriving)
  masse > 0 · portée > 0 et finie · dénivelé fini
  hauteurs ≥ 0 · régime choisi · famille × usage (§10.4)
      ↓ passes
ENGINE  (owns every physical rule)
  invalid-input{field:"L0"}   ← §5.4 chord bound
  no-convergence              ← bracket failed (modes 2 & 3)
  slack-limit                 ← line lying down
      ↓
RESULT-LEVEL WARNINGS  (need a solve → ticket 08)
  > 30 % MBL (§9.2) · flèche < 3 % de la portée (§8.2) · verdict (§10)
```

The hard bound `L₀ > chord/(1 + T_break/EA)` needs `EA` and `MBF`, so evaluating it in the
form would re-derive physics in the UI — forbidden by `docs/conventions/simulation.md`. It
therefore stays in the engine, which **requires confirming that `solveSpan`'s pre-check
carries the §5.4 chord bound and reports it as `invalid-input{field:"L0"}`**. Ticket 03's
error union already has the right shape; this pins what populates it.

Two consequences worth stating:

- The chord bound is only **user-violable in direct-`L₀` mode**. In sag and tension modes
  `L₀` is an output of `resolveL0`, so an infeasible target surfaces as a failed bracket
  (`no-convergence`) rather than a bad length.
- `H_target ≥ MBF` is **not** an input error. It solves perfectly and the verdict says
  rupture — consistent with ticket 03's split between physics succeeding and safety failing.

Presentation of each error state belongs to
[Validation and error-state UX](./11-validation-and-error-state-ux.md).

### 8. Safety Regime placement, and what graduates

**Régime de sécurité is a panel field**, under Usage next to Type d'installation, with **no
default** (`— choisir —`) per CONTEXT.md's "never silently defaulted". This ticket fixes its
position, label and no-default behaviour; ticket 08 fixes the regimes themselves (`k`, `η_t`,
provenance) and how the verdict reads. Splitting the user's controls across two panels for a
value they must actively choose was rejected.

**Graduated:** the map's fog patch *First-run experience and default scenario* becomes
[First-run scenario and default values](./14-first-run-scenario-and-defaults.md), blocked by
tickets 05 and 07. Three initial values are already forced and are **not** its to decide:
the two Unconfirmed Defaults must be pre-filled (that is what makes them
labelled-and-configurable rather than blank), and Type d'installation defaults to
`PERMANENTE` — the restrictive branch, so the app never opens in the permissive state by
accident.
