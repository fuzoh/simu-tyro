# 34 — Verify Material Spec and Safety Regime lifecycle in browser

**What to build:** Exercise retained steel/textile Material Specs and transition from regime-free results to judged Verdict. Incompatible choices remain visible and disabled with reasons instead of silently mutating Scenario.

**Blocked by:** None — can start immediately.

**Status:** claimed

- [x] Switching steel to textile and back restores each family’s retained Material Spec values.
- [x] `PERMANENTE` with textile is disabled and explains why; app never auto-switches family or use class.
- [x] Opening state shows complete regime-free headline values while regime-dependent rows and criteria grid are absent, not dashed.
- [x] Choosing Safety Regime adds judged rows and criteria × ends grid with correct traverse scope.
- [x] Shipped first-run line reads « Hors limites » under ACCT 10:1 without corrupting chart, inputs, or provenance.
- [x] Removing regime returns exactly to « Résultats sans régime » state.
- [x] Browser procedure is repeatable; pure state defects gain unit regressions where possible.

## Comments

**2026-08-14 — browser run (agent, read-only on `src/**`).** Six of the seven acceptance items
observed green; the seventh is half-outstanding (see *Outstanding*). Two defects found in the
adjacent availability rules, both left to the serialized fix phase.

### Environment

- `agent-browser` 0.34.0, session `scoutech-t34`, headless Chromium **HeadlessChrome/151.0.0.0**
  (`Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36`).
- Viewport **set** with `agent-browser set viewport 1440 900`, then **measured**:
  `window.innerWidth × innerHeight = 1440 × 900`, `devicePixelRatio 1`.
  `navigator.maxTouchPoints 0`, `matchMedia('(pointer: coarse)') false` — ticket 27's known host
  limit, unchanged. No coarse-pointer and no soft-keyboard claim is made here; this is a desktop
  run.
- Dev server reused, not started: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/`
  → **200**. Other browser agents were driving the same server throughout.

### Procedure (repeatable)

State is read by one scripted probe rather than by eye, so every claim below is a string compare.
Probe and runner live outside the repo, in the run's scratch dir (`probe.js`, `snap.fish`); the
probe is a single `eval --stdin` IIFE returning JSON: `location.href`, the `Résultats` section's
`innerText` plus its row-label list, `hasGrid` (« Critères × extrémités » present), the count of
`—` inside `Résultats`, the `usage` / `family` radio states (`value:checked:disabled`),
`#rail-regime` value and its disabled options, every `#rail-<field>` value, `#rail-r0` /
`#rail-cst` / `#rail-cls` / `#rail-ta` / `#rail-tb`, the `[data-field]` override rows, the
`PARAMÈTRES` / `VALEURS DÉDUITES` / `PROVENANCE` sections, and `document.body.innerText` verbatim.

Two mechanical notes for whoever replays this:

1. **The URL is debounced.** A state change lands in the address bar a few hundred ms later — wait
   ~800 ms before reading `location.search` or it lags one edit behind. First paint on a cleared
   Session is bare `/` with no keys; the first edit writes them all.
2. **Drive the family radio by `@ref` (`snapshot -i` first) or `find text`, not by CSS selector.**
   One `click "input[name=family][value=textile]"` reported `✓ Done` and left the radio unchanged;
   the same click by `@e56` flipped it. Tooling flake, not an app defect — a hit test at that moment
   returned the radio itself with `disabled: false` — but a CSS-selector script will silently no-op.

### 1 · Retention across a family flip — green

`localStorage.clear()` then reload, for the shipped first run. Steel spec given three markers plus a
termination: `d` **14,0** mm, `Grade` **1960**, `Construction` **6×19 âme textile**
(`cst=fibre-core`), `Terminaison A` **Épissure** (`η_A` **0,80**). Then `TEMPORAIRE`, then textile:
the flip lands on § 9's shipped retained textile — `Classe` **HMPE**, `k` **22,0**, `Charge de
rupture` and `Masse linéique` **blank** with « valeur requise » on each, textile terminations (`œil
cousu / épissuré`, `η` 0,90), **no** steel override rows — and `Résultats` renders nothing
(« Aucun résultat — famille de ligne invalide », `⛔ 1 erreur bloquante`), which is § 3's *never
« Saisie en cours »* branch. Textile then built out: `MBL` **10000** daN, `μ` **0,1050** kg/m,
`k` **20,0**, `Terminaison B` **Épissure longue HMPE**.

- textile → steel: `d` **14,0** · `r0` **1960** · `cst` **fibre-core** · `ta` **epissure** /
  `η_A` **0,80** · `tb` **cosse** / `η_B` **0,90** · override rows back to
  `mbfOverride=12677, eaOverride=9,39, muOverride=0,7438`. URL:
  `…&fam=ac&d=14&r0=1960&cst=tc&ta=epissure&tb=cosse&na=0.8&nb=0.9`.
- steel → textile again: `cls` **hmpe** · `MBL` **10000** · `μ` **0,1050** · `k` **20,0** ·
  `tb` **epissure-longue-hmpe**. URL: `…&fam=tx&cls=hmpe&mbl=10000&mu=0.105&k=20&tb=epissure`.
  No `d`/`r0`/`cst` key and no override row leaks into the textile URL — « the URL carries the
  active configuration and never a retained alternate » holds.

Terminations travel with the family in both directions, which is the part § 3 calls out and the part
a shared-base refactor would quietly break.

### 2 · `PERMANENTE` + textile — green

Opening state (`use=perm`): `family = ['steel:checked', 'textile:disabled']`, label rendered
**« Corde textile — indisponible »**, and the reason is a real visible node — measured
`getBoundingClientRect() = x 16, y 516, w 255, h 45`, `visibility: visible`, `display: block`,
`font-size: 10px`:

> ℹ §10.4 : fluage, UV/abrasion et fusion par friction (HMPE ~144–152 °C) ⇒ acier seul en
> installation permanente.

`click @e56` on that disabled radio: **nothing moves** — `usage` still `PERMANENTE:checked`, `family`
still `steel:checked`, `Résultats` text unchanged. No auto-switch of use class.

The transition path (textile already configured, then `Permanente (public)`): the use class **does**
change because the user asked for it, the family **stays** `textile:checked:disabled`, the textile
spec is untouched (`MBL` 10000 / `μ` 0,1050 / `k` 20,0 all still there), and the family row carries

> ⛔ Corde textile impossible en installation permanente (§10.4).

with **two** Fix Actions in § 3's order: `Passer à l'acier`, then `Passer en usage temporaire`.
Banner reads `⛔ 1 erreur bloquante — aucun résultat` + « voir la première ». Both repairs were
pressed and each does exactly what its label says:

- `Passer à l'acier` → steel active **with the prior spec restored**: `d` 14,0 · `r0` 1960 ·
  `cst` fibre-core · `ta` epissure / 0,80.
- `Passer en usage temporaire` → `use=tempo`, family still textile, textile spec intact.

Regime availability moves with the pair and is never re-selected behind the user: `Secours textile —
10:1` is the only disabled entry, disabled under steel *or* under `PERMANENTE`, and it becomes
selectable under textile + `TEMPORAIRE`. Holding `regime=secours10` and then breaking its
precondition keeps the chosen value and files a blocking error with `Choisir un autre régime` — no
silent re-selection (steel + `TEMPORAIRE` → `⛔ Régime « Secours textile — 10:1 » indisponible avec
un câble acier.`; textile + `PERMANENTE` → `⛔ 2 erreurs bloquantes`, and see defect **D1**).

### 3 · The opening state is regime-free and complete — green

Cleared Session, bare `/`, `regime = ''` (« — choisir — »):

- Block header: **« RÉSULTATS · sur toute la traversée · aucun régime choisi »**.
- Headline complete: `T max (traversée)` **927,9 daN** « ancrage A, passager à x 74,4 m » — the
  DAF-amplified envelope, not 817,1 — and `Garde min (traversée)` **2,44 m** « passager à x
  73,8 m ». Detail rows all present: `T max ancrage A` 927,9 · `T max ancrage B` 901,5 · `T max
  statique` 817,1 « ancrage A » · `↳ majoration dynamique` +110,8 « (DAF 1,2) » · `Flèche chargée
  max` 7,48 m · `Couverture` **260 / 260 pas**.
- Row-label list, verbatim from the probe: `['T max (traversée)', 'Garde min (traversée)', <the
  prompt sentence>, 'T max ancrage A', 'T max ancrage B', 'T max statique', '↳ majoration
  dynamique', 'Flèche chargée max', 'Couverture']` — **`FS effectif`, `Réserve de tension`, `T adm
  ancrage A` and `T adm ancrage B` are not rows at all**, and `hasGrid = false`.
- **Absent, not dashed:** exactly **one** `—` occurs anywhere in the block, and it is the prose dash
  inside « dépendent du régime — choisissez un régime de sécurité ». Zero dashed cells.
- Banner slot: « Choisissez un régime de sécurité pour obtenir un verdict. » + `Choisir un régime`.
- `Provenance` complete (terrain disclosure + `⚠ 4 valeurs sans référence normative confirmée`),
  `Ce que cet outil ne calcule pas` complete.

### 4 · Choosing a regime — green

`select #rail-regime en15567` → `reg=en15567` in the URL, and the block gains the judged rows and
the grid while the scope label stays traverse-scoped (the header drops « aucun régime choisi » and
keeps **« sur toute la traversée »**; the strip under the chart keeps its own « à la position du
passager », so the two scopes never merge):

- `Verdict` **Dans les limites — EN 15567-1 (k = 3,0)** · `FS effectif` **8,80** « exigé 3,0 » ·
  `Réserve de tension` **+1794 daN** « avant T adm (ancrage A) » · `T adm ancrage A` / `B`
  **2722 daN** « (η 0,90 · MBF / k) ». § 9's numbers exactly (2722 daN, FS 8,80).
- Grid: « Critères × extrémités » → *Tension totale — k = 3,0*, formula `T adm = η · MBF / k — FS =
  η · MBF / T max majoré`, cells `ancrage A 2722 daN FS 8,80 ← gouvernante` / `ancrage B 2722 daN
  FS 9,06`.

`select wsqld` exercises the two-criteria shape and the per-end / not-per-end split § 6 spent a
section on: *Tension totale — k = 3,0* per end, then *Charge suspendue — FS ≥ 5,0* rendered
`min(η_A, η_B) · MBF / max[ DAF · (T chargé − T à vide) ]`, `8166 daN / 665 daN — une seule cellule,
pas par extrémité`, **FS 12,29** (§ 9's 12,29), then *Essai de charge 2×* → « non évalué » with
empty cells. The governing cell carries `aria-current="true"` and the `← gouvernante` marker, not
weight and colour alone.

### 5 · The shipped line reads « Hors limites » under ACCT 10:1 — green

`select acct10` on the untouched first-run scenario:

> Hors limites — ACCT / parcours acrobatique — 10:1, critère tension totale (ancrage A)

`FS effectif` **8,80** « exigé 10,0 » · `Réserve de tension` **-111 daN** « avant T adm (ancrage
A) » · `T adm ancrage A` / `B` **817 daN** · grid cells `ancrage A 817 daN FS 8,80 ← gouvernante`
(computed colour `oklch(0.577 0.245 27.325)`, the destructive token) / `ancrage B 817 daN FS 9,06`.
Every figure is § 9's: 817 daN, réserve −111 daN, FS 8,80 against k 10.

Nothing else moved, and that was checked by comparison rather than by looking:

- `PARAMÈTRES` `innerText` **identical** to the no-regime snapshot; every `#rail-*` value identical
  (`L` 150,0 · `h` -18,0 · `d` 12,0 · `r0` 1770 · `cst` iwrc · `ta`/`tb` cosse · `η` 0,90 / 0,90).
- `VALEURS DÉDUITES` `innerText` **identical**.
- Chart Block **identical**: read-out cells `Garde min 2,48 m · T anc. A 817,1 daN · T anc. B
  793,5 daN · Pente -19,4 % · Flèche 7,48 m`, and an SVG-level diff (each `<svg>`'s bounding box,
  every `<path d>` prefix, node count) comes back **identical** across the regime toggle — `Éch.
  verticale ×1,9` unchanged.
- `PROVENANCE`: the only change is the specified one — the aggregate goes **4 → 5** and gains, as its
  **pinned first** entry, `Régime de sécurité · ACCT / parcours acrobatique — 10:1 · ⚠ non
  confirmé` with the §10.1 popover. Terrain disclosure unchanged.
- Traverse headline values are untouched by the judgement: `T max` 927,9 daN, `Garde min` 2,44 m,
  `Couverture` 260 / 260 in both states.

### 6 · Removing the regime — green

`select #rail-regime ""` from ACCT, on a clean run that never mutated the DOM (a first attempt was
discarded because opening every `<details>` to inspect the provenance popovers had polluted the
comparison): **`document.body.innerText` after removal is identical, character for character, to the
opening state captured before a regime was ever chosen.** `hasGrid` back to `false`, the four rows
gone, one prose `—`, the neutral prompt back, the `reg` key gone from the URL while every other key
stays.

Repeatability was checked the same way: a second cleared-Session first run produced a
`document.body.innerText` **identical** to the first run's.

### Gates

```
bun run typecheck        # tsc --noEmit — clean, no output
bun run lint-type-aware  # oxlint --type-aware --type-check — clean, no output
bun run test             # 38 passed | 1 failed (39 files) · 1265 passed | 3 failed (1268)
```

The three failures are all in `src/lib/sim/bench-harness.test.ts` — § 10 E7b's p95 ≤ 8 ms gate,
measured 15,31 / 10,93 / 10,08 ms — and they are **host load, not a regression**: the machine sat at
`load average 17,03` on 32 cores with several browser agents and a dev server running, and the same
file re-run moments later reported **10 passed (10)**. Nothing in this run touched `src/**`.

### Defects for the fix phase (this run is read-only on `src/**`)

**D1 · The unavailable-regime message names the wrong cause under textile + `PERMANENTE`.**
`src/lib/rail/gates.ts:312-314` builds the cause clause from the family alone:

```ts
message: `⛔ Régime « ${REGIMES[scenario.regime].label} » indisponible avec ${
  scenario.material.family === "steel" ? "un câble acier" : "une corde textile"
}.`,
```

With `regime=secours10`, `family=textile`, `usage=PERMANENTE` the app prints « … indisponible avec
une corde textile », blaming the rope that is the regime's own precondition. § 10.1 makes `Secours
textile — 10:1` unavailable « sous acier, **ou sous `PERMANENTE`** », so under `PERMANENTE` the use
class is the blocking condition and the sentence should name it. The steel branch is correct.
Expressible at a pure seam: `gateReport` is a pure function of the Scenario, so the regression is a
`node` unit case with no DOM in the room (`src/lib/rail/gates.test.ts` already asserts the steel
wording). The exact French wording is copy and belongs to the repo owner, not to a build ticket.

Repro: cleared Session → `Temporaire` → `Corde textile` → `MBL` 10000, `μ` 0,105 → regime `Secours
textile — 10:1` (verdict « Dans les limites … (k = 10,0) », FS 13,58) → `Permanente (public)` → read
the message under `Régime de sécurité`.

**D2 · The disabled regime entry shows no reason.** § 10.1: « une entrée indisponible **montre sa
raison** au lieu de disparaître, sinon la liste enseigne un choix plus court que le vrai ». The entry
does stay in the list, but on the shipped first run it carries **no reason anywhere**:
`Array.from(document.querySelector('#rail-regime').options)` gives `secours10` with
`disabled: true`, `title: null`, `aria-description: null`; its label is the bare « Secours textile —
10:1 » (no « — indisponible » suffix); and no note is rendered beside the row — while the family
selector two rows below does exactly what the spec asks. A reader of the picker learns that the
entry is unavailable and never learns why, and the sentence that carries the reason (D1's) is only
reachable by *selecting* the entry, which is impossible while it is disabled. Only partly a pure
seam: the reason **string** can be (a `regimeUnavailableReason(id, family, usage)`-shaped selector is
unit-testable), but its presence in the DOM is browser evidence. **Whether the reason belongs inline
like the family's `ℹ` line, in the option label, or in a popover is a presentation decision the spec
does not settle — it is named here, not decided.**

### One spec reading left open, deliberately

With a regime chosen but unavailable (steel + `TEMPORAIRE` + `secours10`), the app suppresses the
banner verdict, the grid **and** the four `k`-dependent rows, showing the reduced row set with no
neutral prompt and `⛔ 1 erreur bloquante — aucun verdict`. That reads right, but § 7's gate table
says the Verdict Gate suppresses « le bandeau et la grille critères × extrémités **seuls** », which
taken literally would leave `FS effectif` / `Réserve` / `T adm` standing on a regime the app has just
declared unusable. Ticket 34's acceptance list does not cover this state (it is ticket 26's error
surface), so nothing was changed and nothing is claimed: **the reading of « seuls » against the
`k`-dependent rows is a spec question, not a build decision.**

### Outstanding

Acceptance item 7 is **half-done**. The procedure is scripted and demonstrated repeatable (two
cleared-Session runs produced identical `document.body.innerText`), but the unit regression D1 calls
for cannot be written from here: this run is read-only on `src/**` and Vitest cases are colocated
there. It belongs to the serialized fix phase, and D1 sits at a pure seam (`gateReport`), so nothing
structural blocks it. Status therefore stays **claimed**, not done.

**2026-08-14 — fix phase (agent, writes on `src/**`).** D1 **fixed** with its unit regression, so
acceptance item 7 is now ticked. D2 **skipped on purpose** — it needs a decision this run has no
authority to take. Status stays **claimed**: see *Still outstanding* at the bottom.

### Environment for this pass

- `agent-browser` 0.34.0, session `scoutech-fix34`, headless Chromium
  **HeadlessChrome/151.0.0.0**, default viewport (no `set viewport` — this defect is copy, not
  layout). Dev server reused, not started:
  `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` → **200**.
- The radio-click flake ticket 34 documented is real and cost three attempts here too: `click @e53`
  answered `✓ Done` and left `family` unchanged, and one attempt died on
  `✗ CDP error (DOM.getBoxModel): Could not compute box model`. **Re-`snapshot -i` and click the
  fresh ref** — refs shift as the Rail's rows change — then verify by reading
  `[...document.querySelectorAll('input[name=family]')].map(i => i.value + ':' + i.checked)`. Never
  trust `✓ Done` for a radio. Also: `document.body.innerText` right after `reload` reads **before
  hydration** and returns no `⛔` at all; read it twice.

### D1 — fixed

Reproduced first, on the ticket's own path (cleared `localStorage` → `Temporaire` → `Corde textile`
→ `MBL` 10000, `μ` 0,105 → `Secours textile — 10:1`, verdict « Dans les limites — Secours textile —
10:1 (k = 10,0) » → `Permanente (public)`), and the probe returned the wrong sentence verbatim:

```
⛔ Régime « Secours textile — 10:1 » indisponible avec une corde textile.
⛔ Corde textile impossible en installation permanente (§10.4).
⛔ 2 erreurs bloquantes — aucun résultat
```

The seam was where the browser run put it. `src/lib/rail/gates.ts` now derives the cause clause from
the **mismatch against `REGIMES[regime].requires`** instead of from `scenario.material.family`, in
one new private helper `unavailabilityCause(regime, family)` — no exported signature widened, the
message stays testable through `evaluateGates` as it already was. Family first when both conditions
miss, which keeps § 8's shipped steel string byte-identical; a use-class miss can only ever be
`PERMANENTE`, because `requires.usage` is `TEMPORAIRE` for every régime that constrains it.

Measured after the change, same session, all three states:

| State | Message under `Régime de sécurité` |
| --- | --- |
| `textile` + `PERMANENTE` + `secours10` | `⛔ Régime « Secours textile — 10:1 » indisponible en installation permanente.` |
| `textile` + `TEMPORAIRE` + `secours10` | *none* — `body.innerText.match(/⛔[^\n]*/g)` → `null` |
| `steel` + `TEMPORAIRE` + `secours10` | `⛔ Régime « Secours textile — 10:1 » indisponible avec un câble acier.` — unchanged |

The steel row was re-measured a second time **after a full `reload`** on the arriving link
`?…&use=tempo&reg=secours10&fam=ac&…`, i.e. against the rebuilt bundle rather than an HMR patch, and
it still reads « avec un câble acier » alongside `⛔ 1 erreur bloquante — aucun verdict` — § 8's
« arrives already invalid » path is intact.

**On the copy.** « en installation permanente » is not invented phrasing: it is the wording § 10.4's
own breach already ships two rows below (« ⛔ Corde textile impossible **en installation
permanente** (§10.4). ») and the wording of the family's `ℹ` line. § 8's message table gives only the
steel example for this row, so if the owner wants a different sentence for the use-class branch, the
string lives in exactly one place — `unavailabilityCause`.

Regression: two cases in `src/lib/rail/gates.test.ts`, in the existing
`describe("the Verdict Gate's régime × famille rule")` — the `PERMANENTE` clause asserted as a whole
string plus `.not.toContain("corde textile")`, and the available pair asserted to raise **no** régime
error at all, so the sentence and the predicate cannot drift apart. Pure `node`, no DOM in the room.

### D2 — skipped, and what the decision is

Reproduced exactly as reported, on the shipped first run:
`Array.from(document.querySelector('#rail-regime').options).map(…)` → `secours10` with
`disabled: true`, `title: null`, `aria-description: null`, label the bare « Secours textile —
10:1 », and no note in the row. The § 10.1 breach is real: the entry stays but teaches nothing.

Not fixed, because closing it takes **two** decisions this run is not entitled to make, and one of
them is less settled than it looks:

1. **Where the reason lands.** `src/components/rail/controls.tsx` does hold a documented pattern —
   `Picker` suffixes a disabled option with « — indisponible » and its docblock argues the *reason*
   belongs in `Row`'s full-width `note` slot via `DisabledReason`, « one reason per row, not one per
   disabled option », with the 288 px rail measurement behind it. But the régime `<select>` in
   `src/components/rail/inputs.tsx` is **hand-rolled**, not a `Picker`, and its `note` slot is
   already occupied by the `[ Choisir un autre régime ]` Fix Action. So the choice is: route the
   régime row through `Picker` + `DisabledReason` and decide how a reason and a Fix Action share one
   slot; or suffix the option label only (which says *that* it is unavailable, never *why* — it does
   not close § 10.1); or a `title` / popover, which no other row in the Rail uses.
2. **The sentence itself.** § 10.3 and § 10.4 ship their `ℹ` lines verbatim in the spec's mockups.
   § 10.1 ships **no string** — only the rationale (« celui-là présuppose la famille B et est une
   erreur de catégorie ailleurs »), and the line would need **two** variants, one per blocking
   condition, since the reason under steel is not the reason under `PERMANENTE`. That is shipped
   French copy with no spec source: the owner's, not a build ticket's.

There is a third cost worth stating: the § 10.1 mockup of the Rail (spec line 4941) shows the régime
row with **no** reason line, and a new prose line in `PARAMÈTRES` moves the rail heights tickets 27,
28 and 29 measured days ago. Adding it silently would invalidate evidence already taken.

So: no code touched for D2, `regimeUnavailableReason(…)` deliberately **not** added as an unwired
pure selector — dead code is worse than the gap it documents. The unit-testable half lands for free
once the presentation is chosen, and D1's helper is where the two condition branches already live.

### Gates for this pass

```
bunx oxfmt --write src/lib/rail/gates.ts src/lib/rail/gates.test.ts
                         # Finished in 79ms on 2 files
bun run typecheck        # tsc --noEmit — clean, no output
bun run lint-type-aware  # oxlint --type-aware --type-check — clean, no output
bun run test             # 39 passed (39) · 1287 passed (1287) — 1,16 s
```

`src/lib/sim/bench-harness.test.ts` is **green** this time (the earlier run's three failures were
host load, as that run said), and the suite gained the two D1 cases: 1265 → 1287 counts the other
fix agents' regressions as well as these.

### Still outstanding

**D2**, unchanged and unstarted by design — it is an owner decision (presentation slot + two French
strings), not a build step. Every acceptance checkbox above is now observed green, but the ticket's
own opening sentence — « Incompatible choices remain visible and disabled **with reasons** » — is
true of the family radio and still **not** of the régime entry. Status therefore stays **claimed**.
The « seuls » reading flagged in the previous comment is also still open, and was again left alone.

**2026-08-14 — re-verification (agent, read-only on `src/**`).** Both defects re-driven from their
own repro steps in a fresh browser session, then the **whole** acceptance list re-walked from a
cleared Session because other fix agents moved layout code in this run. **D1 is gone. D2 stands,
re-measured.** No adjacent regression found in the same journey. Status stays **claimed** on D2's
account; nothing else is outstanding.

### Environment for this pass

- `agent-browser` **0.34.0**, session `scoutech-t34-re`, headless Chromium
  **HeadlessChrome/151.0.0.0** (`Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36`).
- Viewport **set** `1440 900`, then **measured**: `innerWidth × innerHeight = 1440 × 900`,
  `devicePixelRatio 1`. `navigator.maxTouchPoints 0`, `matchMedia('(pointer: coarse)') false` —
  ticket 27's host limit, unchanged. Desktop run; no coarse-pointer and no soft-keyboard claim.
- Dev server **reused, not started**: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/`
  → **200**. Two arriving links re-measured the same way, both **200** (below).
- Same two mechanical gotchas as the earlier passes, both hit again: the URL write is debounced
  (~400 ms, `URL_WRITE_DEBOUNCE_MS`) so `location.search` is read after ≥900 ms, and
  `document.body.innerText` straight after `open` reads **pre-hydration** (130 chars, `RÉSULTATS`
  alone) — every probe here waits on `!!document.querySelector('#rail-regime')` first. The family
  radio again refused one `click @e56` (`✓ Done`, `steel:true textile:false`); re-`snapshot -i` then
  `find text "Corde textile" click` flipped it, verified by reading `input[name=family]`.

### D1 — confirmed fixed

Re-driven exactly as filed (cleared `localStorage` → `Temporaire` → `Corde textile` by `find text`
→ `MBL` 10000 / `μ` 0,105 → `#rail-regime` `secours10` → `Permanente (public)`). The intermediate
state reproduces the report's own numbers first — verdict « Dans les limites — Secours textile —
10:1 (k = 10,0) », `FS effectif` **13,58**, `T adm` **900 daN**, no `⛔` at all — so the flip is being
made from the same place as before.

`document.body.innerText.match(/⛔[^\n]*/g)` after the flip:

```
⛔ Régime « Secours textile — 10:1 » indisponible en installation permanente.
⛔ Corde textile impossible en installation permanente (§10.4).
⛔ 2 erreurs bloquantes — aucun résultat
```

The régime clause no longer contains « corde textile ». Two blocking errors is right and unchanged:
these are two independent breaches (§ 10.4's family rule and § 10.1's régime rule), each with its own
row and its own Fix Action.

Adjacent states in the same journey, all re-measured, none moved:

| State | `⛔` under `Régime de sécurité` | Reached by |
| --- | --- | --- |
| `textile` + `TEMPORAIRE` + `secours10` | *none* (`match` → `null`) | UI flip |
| `textile` + `PERMANENTE` + `secours10` | `… indisponible en installation permanente.` | UI flip **and** full page load |
| `steel` + `TEMPORAIRE` + `secours10` | `… indisponible avec un câble acier.` — byte-identical to § 8's shipped string | UI flip **and** full page load |

Both « arrives already invalid » links were opened cold, against the served bundle rather than an HMR
patch, and both answer **HTTP 200** (`curl -s -o /dev/null -w '%{http_code}'`):
`?…&use=tempo&reg=secours10&fam=ac&…` → `⛔ … avec un câble acier.` + `⛔ 1 erreur bloquante — aucun
verdict`; `?…&use=perm&reg=secours10&fam=tx&…` → the fixed sentence + § 10.4's + `⛔ 2 erreurs
bloquantes — aucun résultat`.

Unit regression verified by running it, not by reading it: `bunx vitest run
src/lib/rail/gates.test.ts` → **46 passed (46)** in 207 ms, and the two named cases are present at
`src/lib/rail/gates.test.ts:158` and `:177`.

### D2 — confirmed **still present**

Re-measured on the shipped first run (`use=perm`, cleared Session), by DOM read rather than by eye:

- `#rail-regime` option `secours10` → attributes are **exactly** `disabled`, `value="secours10"`
  (plus the dev-only `data-tsd-source`). `title` **null**, `aria-description` **null**,
  `aria-describedby` on the `<select>` **null**.
- `textContent` of the option is the bare **« Secours textile — 10:1 »** — no « — indisponible »
  suffix, unlike the family radio's label (« Corde textile — indisponible ») and unlike the textile
  termination picker, whose own unavailable entries do read « Nœud de huit (PA) — indisponible ».
- The régime row's `innerText` is `Régime de sécurité` + the six option labels and nothing else:
  `/indisponible/.test(rowText)` → **false**. No note, no `ℹ` line.
- The family's reason line two rows below is still a real visible node, and its box has **not**
  moved under the other fix agents' layout work: `getBoundingClientRect()` = `x 16, y 516, w 255,
  h 45`, `visibility: visible`, `display: block`, `font-size: 10px`.

The fix agent's reasons for leaving it are on the record above and are not re-litigated here: the
reason's **slot** and its **two French sentences** are decisions, and § 10.1 ships no string. Nothing
in this pass changes that. **It is a live § 10.1 gap, owned by the repo owner, not by a build ticket.**

### The full acceptance list, re-walked

1. **Retention across a family flip — green.** Fresh cleared Session; steel marked `d` **14,0** ·
   `Grade` **1960** · `Construction` **6×19 âme textile** · `Terminaison A` **Épissure** (`η_A`
   **0,80**), then `Temporaire`, then textile — which lands on § 9's shipped blank rope (`MBL` and
   `Masse linéique` empty, **5** × « valeur requise », `⛔ 2 erreurs bloquantes — aucun résultat`,
   never « Saisie en cours ») — then built out `MBL` **10000** · `μ` **0,1050** · `k` **20,0** ·
   `Terminaison B` **Épissure longue HMPE**.
   textile → steel restores `d` 14,0 · `r0` 1960 · `cst` fibre-core · `ta` epissure / 0,80 ·
   `tb` cosse / 0,90 and the three override rows `12677 / 9,39 / 0,7438`; URL
   `…&fam=ac&d=14&r0=1960&cst=tc&ta=epissure&tb=cosse&na=0.8&nb=0.9`. steel → textile restores
   `cls` hmpe · `MBL` 10000 · `μ` 0,1050 · `k` 20,0 · `tb` epissure-longue-hmpe; URL
   `…&fam=tx&mu=0.105&cls=hmpe&mbl=10000&k=20&ta=oeil&tb=epissure`. No `d`/`r0`/`cst` and no override
   key leaks either way. Terminations travel with the family in both directions.
   *One thing worth writing down for the next replay, and it is by design, not a defect:* while a
   required textile field is blank the address bar **freezes** — it kept the pre-flip
   `use=perm&fam=ac…` for >4 s across `TEMPORAIRE` + textile, and caught up on the keystroke that
   filled `μ`. That is `completeScenario` gating both writes on purpose
   (`src/lib/app/persist.ts:52-70` — « `scenarioToSearch` would emit `mbl=0` for an absent rope, a
   fabricated datasheet in somebody's clipboard »), the same condition behind `COPY_INCOMPLETE`.
   Read the DOM, not the URL, while a blank stands.
2. **`PERMANENTE` + textile — green.** Opening state: `family = ['steel:checked',
   'textile:disabled']`, label « Corde textile — indisponible », reason node measured above.
   `find text "Corde textile — indisponible" click` on the disabled radio moves **nothing**
   (`PERMANENTE:true steel:true textile:false:disabled` before and after). Transition path with
   textile configured: use class changes because the user asked, family stays
   `textile:checked:disabled`, spec intact (`MBL` 10000 · `μ` 0,1050 · `k` 20,0), row carries
   `⛔ Corde textile impossible en installation permanente (§10.4).` with both Fix Actions in § 3's
   order (`Passer à l'acier`, `Passer en usage temporaire`) plus « voir la première ».
   `Passer à l'acier` pressed → steel active, prior steel spec **and** its overrides restored, `⛔`
   list back to `null`. No auto-switch anywhere.
3. **Opening state regime-free and complete — green.** Header « RÉSULTATS · sur toute la traversée ·
   aucun régime choisi ». `T max (traversée)` **927,9 daN** « ancrage A, passager à x 74,4 m » ·
   `Garde min (traversée)` **2,44 m** · `T max ancrage A` 927,9 · `B` 901,5 · `T max statique` 817,1 ·
   `↳ majoration dynamique` +110,8 (DAF 1,2) · `Flèche chargée max` 7,48 m · `Couverture`
   **260 / 260 pas**. `hasGrid` **false**; `FS effectif`, `Réserve de tension`, `T adm ancrage A`/`B`
   are **not rows**. Exactly **one** `—` in the whole block, the prose dash in « dépendent du régime
   — choisissez un régime de sécurité » → **absent, not dashed**. Banner slot « Choisissez un régime
   de sécurité pour obtenir un verdict. » + `Choisir un régime`. Provenance aggregate
   `⚠ 4 valeurs sans référence normative confirmée`.
4. **Choosing a régime — green.** `en15567` → `reg=en15567`, header drops « aucun régime choisi » and
   keeps « sur toute la traversée » while the strip under the chart keeps « à la position du
   passager » (both scopes measured in the same snapshot, so they demonstrably do not merge).
   `Verdict` « Dans les limites — EN 15567-1 (k = 3,0) » · `FS effectif` **8,80** « exigé 3,0 » ·
   `Réserve` **+1794 daN** · `T adm` **2722 daN** « (η 0,90 · MBF / k) » both ends; grid *Tension
   totale — k = 3,0*, `ancrage A 2722 daN FS 8,80 ← gouvernante` / `ancrage B 2722 daN FS 9,06`.
   `wsqld` → the two-criteria shape: per-end tension, then *Charge suspendue — FS ≥ 5,0* rendered
   `min(η_A, η_B) · MBF / max[ DAF · (T chargé − T à vide) ]`, `8166 daN / 665 daN — une seule
   cellule, pas par extrémité`, **FS 12,29**, then *Essai de charge 2×* « non évalué ».
5. **The shipped line under ACCT 10:1 — green.** « **Hors limites — ACCT / parcours acrobatique —
   10:1, critère tension totale (ancrage A)** » · `FS effectif` 8,80 « exigé 10,0 » · `Réserve`
   **-111 daN** · `T adm` **817 daN** · governing cell `aria-current="true"` with computed colour
   `oklch(0.577 0.245 27.325)`. Nothing else moved, by comparison not by looking: the `PARAMÈTRES`
   slice and the `VALEURS DÉDUITES` slice of `body.innerText` are **identical** to the no-régime
   capture; the chart read-out is identical (`Garde min 2,48 m · T anc. A 817,1 daN · T anc. B
   793,5 daN · Pente -19,4 % · Flèche 7,48 m`, `Éch. verticale ×1,9`); an SVG-level diff over **28**
   `<svg>` elements (bounding box, child-node count, every `<path d>` prefix) is **identical** across
   the toggle. The only provenance change is the specified one — aggregate **4 → 5**, gaining as its
   pinned first entry `Régime de sécurité · ACCT / parcours acrobatique — 10:1 · ⚠ non confirmé` with
   the § 10.1 popover.
6. **Removing the régime — green.** `select #rail-regime ""` from ACCT: `document.body.innerText` is
   **identical, character for character** (3180 = 3180) to the capture taken before any régime was
   chosen. `reg` gone from the URL, every other key unchanged.
7. **Repeatable, and D1's regression exists — green.** The probe is a single `eval --stdin` IIFE
   returning JSON (`href`, radio states as `value:checked:disabled`, the régime option table with
   `title`/`aria-description`, the `Résultats` slice, `hasGrid`, the `—` count, every `#rail-*` value,
   the `⛔`/`⚠`/`ℹ` line lists, `body.innerText`), plus a second IIFE fingerprinting every `<svg>`.
   A second cleared-Session first run produced `body.innerText` **identical** to the first
   (3180 chars). D1's unit regression runs green (above); D2's is blocked on a presentation decision,
   which is what « where possible » leaves out.

### Gates for this pass — run here, not taken on report

```
bun run typecheck        # tsc --noEmit — clean, no output
bun run lint-type-aware  # oxlint --type-aware --type-check — clean, no output
bun run test             # Test Files 39 passed (39) · Tests 1288 passed (1288) — 1,23 s
bunx vitest run src/lib/rail/gates.test.ts   # 46 passed (46) — 207 ms
```

`src/lib/sim/bench-harness.test.ts` green. **1288**, not the fix phase's 1287 — one more case landed
from another agent between the two runs; no failures either way. No formatter was run: this pass
touched no `src/**` file and markdown is in `.oxfmtrc.json`'s `ignorePatterns`.

### Still outstanding after re-verification

- **D2** — the disabled « Secours textile — 10:1 » entry still teaches nothing. Owner decision
  (slot + two strings), unchanged.
- The **« seuls »** reading of § 7's gate table, re-observed on the way through: `steel` +
  `TEMPORAIRE` + `secours10` shows the reduced row set with **no** neutral prompt and `⛔ 1 erreur
  bloquante — aucun verdict`, i.e. the four `k`-dependent rows are suppressed along with the banner
  and the grid. Still a spec question, still ticket 26's surface, still untouched.
