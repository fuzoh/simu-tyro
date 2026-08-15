# 27 — Pin safety information while navigating the Rail

**What to build:** Make the Chart Block become a Pinned Safety Header when someone scrolls the Rail or focuses a Rail field. The reduced view keeps current banner occupant and live « Garde min » visible, preserves View Strip while rider-position field has focus, and lets someone restore whole profile without introducing persisted layout state.

**Blocked by:** None — ticket 26 is complete.

**Status:** claimed

- [x] Chart Block stays whole while Rail is at top and no Rail field has focus.
- [x] Scrolling Rail or focusing one of its fields reduces Chart Block to banner slot plus live « Garde min ».
- [x] Focusing rider-position field keeps View Strip present so field never collapses itself away.
- [ ] Pinned header exposes « Afficher le profil » action with correct accessible name and restores whole block when constraints allow. — **partiel** : the keyboard path holds, the **first pointer press taken from `pinned + x`** never reaches the button's handler. Voir « Item 4 is partial » under ## Comments.
- [x] Banner jump action reveals culpable Rail section, reserves pinned-header clearance, and focuses target control.
- [x] Blocking errors keep culpable Rail section reachable and pinned at narrow width.
- [x] Collapse state derives only from scroll and focus; it is absent from Scenario, Session, and URL.
- [x] Pure collapse-policy cases are covered in node-unit tests; typecheck and type-aware lint pass.

## Comments

**Shape of the thing.** The policy is a pure module, `src/lib/layout/collapse.ts` — `collapseState`
over four inputs (`railAtTop`, `focus`, `revealed`, `fits`), `railFocus`, the reveal latch and
`pinnedHeaderHeight`. **The state is derived in TypeScript and applied in CSS**: the shell carries
`data-collapse`, and two `@custom-variant`s in `src/styles.css` (`pinned`, `pinned-without-x`), always
stacked with `max-md:`, drop the profile, the strip, the View Strip and four of the five cells. So
there is **one tree** — the Skeleton renders the same one — no `useMediaQuery`, no second layout, and
above B2 the derived state has no consumer at all. `useCollapse` holds only what nothing else knows:
the Rail's scroll position, the focus category and the reveal latch.

**Two decisions worth flagging, both taken because the alternative was wrong:**

1. **Trigger (b) is read from the Rail's own `focusin`, not from `useRailForm`'s `focused`.** The two
   answer different questions: the form tracks *which numeric field is being edited* (« Saisie en
   cours »'s question — it deliberately never sees the pickers or the radios), while the collapse asks
   *is the caret in a Rail field at all*. Measured in the browser: with `rail.focused` the régime
   `<select>` — a jump target of § 7's culprit table — did not collapse the block at 390 px. One
   `focusin`/`focusout` pair on the Rail scroller, with a `relatedTarget` containment check so a move
   between two fields is one continuous focus and never a whole-for-one-frame flash. A `<button>` is
   an action, not a field, so « Copier le lien » collapses nothing.
2. **The View Strip's `x` latches on `pointerdown`, before the Rail field's `blur`.** From `pinned + x`
   (the Rail's « Position du passager » has focus) a tap travelling to the strip's own `x` fires
   `blur` first; without the latch the strip would be unmounted out from under the tap — the same
   failure `pinned + x` exists to prevent, one step removed. A Rail focus outranks the latch, so a
   `pointerdown` whose focus never lands cannot mask trigger (b).

**Not in scope, left to ticket 28 as a seam, not as a stub:** (c)'s arithmetic
(`blockHeight > availableHeight − MIN_RAIL`) and the `compact` row arrive as `CollapseInputs.fits`,
defaulted to `true` in `useCollapse`. The policy already answers (c) — that is what « restores the
whole block **when constraints allow** » means, and it is unit-tested — but nothing here measures a
viewport, and `CollapseState` has no `compact` member yet.

**Files.** New: `src/lib/layout/collapse.ts`, `src/lib/layout/collapse.test.ts`,
`src/components/app/use-collapse.ts`. Changed: `src/lib/layout/contract.ts` (`PINNED_CELL = 44`),
`src/components/app/shell.tsx` (`data-collapse`, `--pinned-clearance`, the Rail's scroll/focus
observers, the band variants, `RevealProfile`), `src/styles.css` (the two variants and § 7's
`scroll-margin-top` rule), `src/components/chart/chart-block.tsx`, `src/components/chart/view-strip.tsx`,
`src/components/app/app.tsx`, `src/components/app/banner.tsx` (the jump primitive's doc comment, which
pointed at « A12 »). `src/components/app/skeleton.tsx` is untouched: it renders `collapse="whole"`, so
the variants can never match.

### Covered by node unit tests — `src/lib/layout/collapse.test.ts`, 33 cases

- `collapseState`, twelve table rows: the resting state, (a), (b), (b) on the rider-position field,
  the View Strip's `x` as a non-trigger *and* as a strip-keeper, the reveal beating (a) and (b), (c)
  beating the reveal, and (c) keeping the strip.
- `railFocus`: `null`, `INPUT#rail-xD`, `INPUT#rail-L`, `SELECT#rail-regime`, an unidentified input,
  `BUTTON` and `SUMMARY`.
- The reveal latch: `revealSurvives` × 4 focuses, `revealSurvivesScroll` × 2.
- `pinnedHeaderHeight`: § 5's table — **120 px** pinned and **164 px** pinned + x at the three-line
  banner, 0 while whole, and the banner term present in both pinned states (§ 7's « the pinned header
  carries the banner slot »).
- Absence from persistence, asserted against the **real codecs** rather than by assertion: no collapse
  word appears in `CANONICAL_KEYS`, in `scenarioToSearch(FIRST_RUN_SCENARIO)`, or in the JSON
  `writeSession` stores.

### Not unit-testable — layout, and therefore the browser tickets' (29, 31, 33, 35)

Which bands actually disappear, the pinned header's rendered height, the 44 px live cell, the
chevron's hit target and every pixel budget. Amendment A sends all of it to `agent-browser`, and none
of it is duplicated in Vitest.

**A smoke check was run anyway while building** (not ticket 29's evidence — no budgets were recorded).
Dev server at 390×844, `agent-browser`:

| Action | Observed |
| --- | --- |
| at rest, `scrollTop 0` | `data-collapse="whole"`, `--pinned-clearance: 0px`, profile visible |
| focus `#rail-L` | `pinned`; the seven `max-md:pinned:hidden` nodes all `display: none`; clearance `120px`; `scroll-margin-top` on the target `120px` |
| pinned content | banner slot at `y 0`, live cell `Garde min 2,48 m` **44 px**, chevron **44 × 44** at the row's end; View Strip `display: none` |
| focus `#rail-xD` | `pinned-x`, View Strip back at 44 px with its `x` field, clearance `164px` |
| focus `#rail-regime` | `pinned` — the case that made trigger (b) a `focusin` rather than `rail.focused` |
| focus « Copier le lien » | `whole` — a button is not a field |
| rail `scrollTop 200`, nothing focused | `pinned` |
| press « Afficher le profil » | `whole` with the rail still at `scrollTop 200`; then focusing `#rail-h` re-pins (latch revoked) |
| tap the View Strip's `x` from `pinned-x` | stays `pinned-x`, `document.activeElement` **is** the strip's input |
| L = −5, rail scrolled | pinned header carries « ⛔ 1 erreur bloquante — aucun résultat » + `[ voir la première ]` |
| press `[ voir la première ]` | `#rail-L` focused, state `pinned`, target at `y 323` clear of the header, `scroll-margin-top 120px` |
| chevron under the « Aucun résultat » cause line | `elementFromPoint` hits the chevron, and pressing it restores `whole` |
| **1440×900**, rail scrolled + field focused | state derives to `pinned` and **costs nothing**: profile `display: block` at 540 px, chevron height 0, `scroll-margin-top 0px` |

### Gates

```
$ bunx oxfmt --write <the nine touched .ts/.tsx paths>
Finished in 151ms on 9 files using 32 threads.

$ bun run typecheck            # tsc --noEmit
exit=0                         (no output)

$ bun run lint-type-aware      # oxlint --type-aware --type-check
exit=0                         (no output)

$ bun run test                 # vitest run
 Test Files  39 passed (39)
      Tests  1217 passed (1217)

$ bunx vitest run src/lib/layout/collapse.test.ts
 Test Files  1 passed (1)
      Tests  33 passed (33)

$ bun run build                # sanity: the two @custom-variants compile
✓ built in 227ms / 145ms
```

One deliberate lint suppression: `jsx-a11y/no-noninteractive-element-interactions` on the Rail
`<aside>`, which now observes `focusin`, `focusout` and `scroll`. None of the three adds an
affordance, a role or a keyboard contract — the alternative is seventeen per-field handlers and a
second copy of the Rail's focus. The reason is written at the call site.

### Left undone, on purpose

- **(c) and `compact`** — ticket 28's, per the seam above.
- Tapping one of the View Strip's *other* controls (a layer toggle, « ×1 ») directly from `pinned + x`
  loses the tap: the Rail field's blur drops the strip before the click lands. § 5's own rule is
  « tant que le champ `x` a le focus », so extending the latch to the whole strip would be inventing
  policy — and every way of clearing such a latch is stuck-open on a platform where buttons take no
  focus. Worth a look in the narrow-keyboard browser pass (ticket 35) before anyone rules on it.
- While pinned at narrow, the hidden profile and strip stay **mounted** and re-render on each
  keystroke. That is the price of « CSS over a finished tree » and of one layout for two occupants;
  unmounting them would need a JS media branch, which § 5 forbids.

---

## Browser verification pass — independent, 2026-08-14

**Verdict: all eight acceptance items hold.** Driven in a real browser against `bun run dev`, not
inferred from the implementation notes. Two follow-ups are recorded at the end; neither is an
acceptance item, and one is the gap this ticket already deferred to 35.

**Environment.** `HeadlessChrome/151.0.0.0` (X11 Linux x86_64), `agent-browser 0.34.0`, session
`scoutech-t27`, dev server `http://localhost:3000/` (probed `HTTP 200` before starting). Viewports set
explicitly with `agent-browser set viewport <w> <h>` and **confirmed by `window.innerWidth/innerHeight`**
at every step: **390 × 844** and **1440 × 900**, plus **768 × 900 / 767 × 900** for the B2 edge.
`devicePixelRatio 1`.

### Procedure — the repeatable sequence

```
S="agent-browser --session scoutech-t27"
$S open http://localhost:3000/ ; $S set viewport 390 844 ; $S wait "#rail-L"
$S eval "document.querySelector('[data-collapse]').dataset.collapse"       # derived state
$S scroll down 200 --selector aside                                        # trigger (a)
$S focus "#rail-L" | "#rail-regime" | "#rail-DAF" | "#rail-xD"             # trigger (b)
$S mouse move <x> <y> ; $S mouse down ; $S mouse up                        # real pointer, live rects
$S press Control+a ; $S keyboard type "…" ; $S press Enter                 # real keys
$S find role button click --name "Afficher le profil"
```

Every geometry number below is `getBoundingClientRect()` read back through `eval --stdin`, never assumed.

### The band stack, measured

| | 390 × 844, `whole` | 390 × 844, `pinned` | 390 × 844, `pinned-x` | 1440 × 900, `whole` |
| --- | --- | --- | --- | --- |
| créneau bandeau | 44 | 44 | 44 | 44 |
| profil | 220 | `display: none` | `display: none` | 540 |
| bande de garde | 96 | `display: none` | `display: none` | 177 |
| View Strip | 44 | `display: none` | **44** | 44 |
| cellules | 104 (grille) | **44** (flex, 1 cellule) | **44** | 52 |
| **colonne graphique** | **508** | **88** | **132** | **857** |
| rail | 336 @ y 508 | 756 @ y 88 | 712 @ y 132 | 900, `md:w-72` = 288 |
| `--pinned-clearance` | `0px` | `120px` | `164px` | `120px`, mais `scroll-margin-top` **`0px`** |

Desktop `857 = 44 + 540 + 177 + 44 + 52` is § 5's budget C to the pixel. The pinned column is
`44 + 44` and `44 + 44 + 44`: § 5's table reads 120 / 164 because it is written for the **three-line**
banner; the occupant here is one line, so 88 / 132 is the same arithmetic.

### Item by item

1. **Whole at rest.** Fresh session, `localStorage.clear()`, first-run URL: `data-collapse="whole"`,
   column 508 px, rail 336 px, `--pinned-clearance: 0px`, chevron `display: none`. Desktop idem at 857.
2. **(a) and (b) both reduce it.** `scroll down 200 --selector aside` with nothing focused →
   `pinned`, `railScrollTop 200`, the profile / strip / View Strip all `display: none`, column 88 px.
   `focus #rail-L` with `railScrollTop 0` → `pinned` too, so neither trigger is standing in for the
   other. The surviving row reads **« Garde min 2,48 m »** and it is **live**: with the block pinned,
   committing `x` in the strip moved it to **« Garde min (à x 117,2 m) 4,20 m »**, and fixing
   `L = −5 → 150` swapped the banner occupant from « ⛔ 1 erreur bloquante » to the régime prompt
   without leaving `pinned`. A `MutationObserver` on `data-collapse` across two `Tab` moves inside the
   Rail logged **one** transition (`whole → pinned`) — no whole-for-one-frame flash. Focus leaving the
   Rail (pointer on the banner) logged `pinned → whole`. `focus #rail-regime` → `pinned` (the `<select>`
   case); clicking « Copier le lien » with the rail at top left it `whole` — a button is not a field.
3. **Rider position keeps the strip.** `focus #rail-xD` → `pinned-x`, View Strip `display: flex`,
   44 px at y 44, column 132 px, clearance `164px`. Then a **real pointer tap** on the strip's own `x`
   (`mouse move 283 66 ; down ; up`): state was `pinned-x` **after the `down`** and stayed `pinned-x`
   after the `up`, with `document.activeElement ===` the strip's input. The latch holds.
4. **« Afficher le profil ».** Accessibility tree: `- button "Afficher le profil" [ref=e2]` (name from
   `aria-label`, `title` identical). Rendered **44 × 44** at x 334, and `document.elementFromPoint` at
   its centre resolves to it **even under « Aucun résultat »**, whose cause line spans the whole 390 px
   row. Pressing it (pointer *and* `Enter`) restores `whole` while `railScrollTop` stays 300 — the
   reveal is not a scroll. The latch is revoked correctly: back to top → `whole`, scroll away again →
   `pinned`. At 1440 the button is `display: none` and **absent from the accessibility tree** (0 hits),
   so it is no phantom tab stop. `axe-core 4.12.1` over the pinned column: **0 violations**, 10 checks
   green, 1 incomplete (colour contrast on the `aria-hidden` chevron glyph).
5. **The jump.** `L = −5` → « ⛔ 1 erreur bloquante — aucun résultat  [ voir la première ] ». Pressed
   with a real pointer while `pinned`: `#rail-L` focused, state `pinned`, `scroll-margin-top: 120px`,
   field top **242** against a header bottom of **88**. Repeated for a *deep* culprit —
   `DAF = −1` → « aucun verdict » — starting from `railScrollTop 0`: the rail scrolled to **844**, the
   « Passager » section landed at y 148, `#rail-DAF` at y **243**, `elementFromPoint` at the field's
   centre returns the field itself. The rank-4 `[ Choisir un régime ]` uses the same primitive:
   `#rail-regime` focused, `scroll-margin-top: 120px`, top 257. At 1440 the same jump focuses
   `#rail-DAF` with `scroll-margin-top: 0px` and the field in viewport — the reserve costs the desktop
   nothing.
6. **Blocking errors at narrow.** Arriving **by link** (`?…&L=-5&…`, `curl` confirms **HTTP 200**), the
   banner carries the summary from the first paint; pressing `[ voir la première ]` gives
   `pinned` + `#rail-L` + section « Géométrie » at y 220 with its inline message « ⛔ Portée — une
   longueur strictement positive est requise. Valeur : −5,0 m. » on screen below the 88 px header.
   Nothing in the Rail is collapsible — `aside details` = 13, **none contains an `input` or `select`**
   (they are the `⋯`, `⚠ non confirmé`, `§8.2` popovers) — so « force-open » has nothing to open, as
   `banner.tsx` says.
7. **Nowhere persisted.** While `pinned-x`, a regex scan for
   `/collapse|pinned|whole|reveal|profil|scroll|focus/i` over `localStorage` keys **and values** (minus
   the devtools key) plus every URL search key returned **`[]`**. `scoutech:session:v1` holds exactly
   `scenario · retainedMaterial · retainedManual · trace · layers`; the 20 URL keys are
   `v u use L h za zb fl fam d r0 cst ta tb na nb mp hr daf x`. Reloading from a clean session opens
   `whole`. Reloading with the rail deep (`scrollTop 880`) opens `pinned` — the router restores the
   **scroll**, and the state derives from it, which is the rule rather than an exception to it.
8. **Gates, re-run here.** `bun run typecheck` exit 0 (no output) · `bun run lint-type-aware` exit 0
   (no output) · `bun run test` → **39 files, 1217 tests green** · `bunx vitest run
   src/lib/layout/collapse.test.ts` → **33 green**.

### B2, measured at the edge

`focus #rail-L` at **768 × 900**: `data-collapse="pinned"`, profile `block`, strip `block`, View Strip
`flex`, column **900**, `scroll-margin-top 0px`. At **767 × 900**: profile / strip / View Strip all
`none`, column **88**, `scroll-margin-top 120px`. The variants switch exactly at § 5's threshold.

### Two follow-ups, neither an acceptance item

- **Activating the chevron drops focus to `<body>`.** `scroll down 300 --selector aside` →
  `focus "button[aria-label='Afficher le profil']"` → `press Enter`: state `whole`, and
  `document.activeElement.tagName` is **`BODY`**. The button is `display: none` in `whole`, so it takes
  its own focus with it and the next `Tab` restarts at the top of the document. Needs a designated
  landing place (the profile band, or the row it left) — `RevealProfile` in `shell.tsx`.
- **The View Strip's *other* controls still vanish under a tap from `pinned + x`**, exactly as « Left
  undone, on purpose » predicted. Measured on a **fine** pointer: `mouse down` on « ×1 vraie échelle »
  flips the state to `pinned` and the strip to `display: none` *before* the `up`, yet Chrome still
  dispatched `click` to the button — so on this pointer type the action lands and only the affordance
  disappears mid-gesture (and hold-to-peek loses its visual). **The coarse-pointer case is not
  observable here** (below), and it is the one that matters: ticket 35's.

### Not observable on this host — stated, not inferred

- **Soft keyboard, `--kb` and `compact`.** No real keyboard exists; `--kb` reads `0px` throughout. That
  is ticket 28's arithmetic anyway, and nothing here claims it.
- **iOS's `interactive-widget` policy.** The meta is present and correct in the DOM —
  `width=device-width, initial-scale=1, interactive-widget=resizes-content` — but only Safari can honour
  it. Recorded as markup, not as behaviour.
- **Coarse pointer / real touch.** `set device "iPhone 12"` changes the UA and the viewport but leaves
  `navigator.maxTouchPoints 0` and `matchMedia('(pointer: coarse)').matches false`, and the CLI has no
  touch primitive — so `@media (pointer: coarse)` paths and tap semantics were **not** exercised.
- **Wheel-driven Rail scroll.** `mouse wheel 300` over the Rail delivers a genuine `wheel` event
  (`deltaY 300`, `defaultPrevented false`, target inside the Rail) but headless Chrome does not scroll
  the sub-scroller from it. `scroll --selector aside` was used instead: it fires the same `scroll` event
  on the same element, which is the only signal the app observes.

---

## Defect fix pass — 2026-08-14

Both defects the independent browser pass recorded as follow-ups were **reproduced first**, in a real
browser, before anything was touched. **One is fixed here**; the other is reproduced, measured and
**left where the ticket already put it** — ticket 35 — because closing it means widening § 5's own
rule, and that is a policy decision rather than a patch.

**Environment.** `HeadlessChrome/151.0.0.0` (X11 Linux x86_64), `agent-browser 0.34.0`, session
`scoutech-t27`, dev server `http://localhost:3000/` started for this pass (`curl` answered nothing
first, `200` after). Viewport set with `agent-browser set viewport 390 844` and **confirmed by
`window.innerWidth/innerHeight` = 390 / 844** on every leg; the desktop leg is **1440 × 900**,
likewise confirmed.

### 1 — « Afficher le profil » dropped focus to `<body>`. Fixed.

**Reproduced, before the fix:**

```
S="agent-browser --session scoutech-t27"
$S open http://localhost:3000/ ; $S set viewport 390 844 ; $S wait "#rail-L"
$S scroll down 300 --selector aside
$S focus "button[aria-label='Afficher le profil']"
$S eval "(() => ({s:document.querySelector('[data-collapse]').dataset.collapse, active:document.activeElement.getAttribute('aria-label')}))()"
   → { s: "pinned", active: "Afficher le profil" }
$S press Enter
$S eval …                     → { s: "whole", active: "BODY/", railScrollTop: 300 }
$S press Tab                  → BUTTON "Open TanStack Devtools" @ y 776 — the document's start, not the block
```

**The seam.** `RevealProfile` is rendered *only* inside the pinned header (`max-md:pinned:flex hidden`),
so granting the request removes the element the caret is standing on. Nothing was named to take it.

**The fix, in two halves and no more.**

- `ProfileBand` (`src/components/app/shell.tsx`) becomes the landing place: `id="profil"`,
  `role="group"`, `aria-label="Profil"`, `tabIndex={-1}` — **both** occupants of the band, since
  `EmptyBands` renders the other one and « Aucun résultat » is reachable while pinned. `tabIndex={-1}`
  is the skip-link pattern: programmatically focusable, **never** a tab stop.
- `RevealProfile`'s `onClick` does `flushSync(onClick)` — a click handler's own state update lands
  *after* it returns, so without the flush the DOM read would still see the pinned tree — then focuses
  the band **only if it is actually visible**. That check is the *grant* test, not a guard: under (c)
  (ticket 28) the request is merely held, the chevron survives, and the focus already on it is right.
- `PROFILE_BAND_ID` / `PROFILE_BAND_LABEL` live in `src/lib/layout/collapse.ts`, beside `REVEAL_LABEL`:
  the reveal and its landing place are one decision.

The band is named because an unnamed focusable generic is **silent** — `role="group"` + `aria-label`
makes the landing announceable.

**Confirmed after the fix** (same sequence, `w 390 h 844`):

| Leg | Observed |
| --- | --- |
| `focus` chevron, `press Enter` | `whole`, active `DIV#profil[role=group, label=Profil, tabindex=-1]`, `railScrollTop` **300** |
| next `Tab` | `BUTTON « ligne à vide »` @ y **366** — the View Strip, i.e. *into* what was just revealed |
| `Shift+Tab` from there | `BUTTON « Choisir un régime »` — the band is **skipped**, so it adds no tab stop |
| real pointer (`mouse move 356 66 ; down ; up`) | `whole`, active `DIV#profil`, `railScrollTop` 300 |
| « Aucun résultat » branch (`L = −5`, `EmptyBands`) | `whole`, active `DIV#profil`, band 220 px, text « Portée invalide — aucun tracé possible. » |
| from `pinned-x` by keyboard (`focus #rail-xD` → chevron → `Enter`) | `whole`, active `DIV#profil` |
| **1440 × 900**, rail scrolled | band `checkVisibility() true` at **540 px**, `tabIndex −1`, chevron `checkVisibility() false` — nothing changes above B2 |
| `axe-core 4.12.1`, chart column, `pinned` | **0 violations** (10 checks green) — unchanged from the previous browser pass |
| `axe-core`, chart column, `whole` | 1 violation, `color-contrast` × 2 — « · 50 % » and « à la position », both `text-muted-foreground/70`, **pre-existing** and not this ticket's |

**Regression legs re-driven, all unchanged:** `focus #rail-xD` → `pinned-x`; a real pointer tap on the
strip's own `x` (`mouse move 283 66 ; down ; up`) stays `pinned-x` after both the `down` and the `up`,
with the strip's input focused; scrolling back to top revokes the latch and the next scroll away re-pins.

**Coverage.** Where the caret lands is a layout fact — [amendment B](../AMENDMENTS.md) owns it, and the
table above is that evidence. What *is* pure is the one thing that would make the handoff eat its own
reveal — a landing place that is itself a collapse trigger — and it is now two cases in
`src/lib/layout/collapse.test.ts` (« le point d'atterrissage d'« Afficher le profil » »): the band sits
outside the `rail-` id space that § 7's `scroll-margin-top` rule and the jump primitive address, and
`collapseState` with `railFocus(band)` under a scrolled Rail still reads `whole`. **35 cases** in that
file now.

### 2 — The View Strip's other controls under a tap from `pinned + x`. Reproduced, still ticket 35's.

Reproduced exactly as reported, `390 × 844`, from `focus "#rail-xD"` (`pinned-x`), « ×1 vraie échelle »
centre measured at **(202, 66)**:

```
$S mouse move 202 66 ; $S mouse down
   → { afterDown: "pinned", stripDisplay: "none", atPoint: "SPAN" }
$S mouse up
   → { after: "pinned", clicks: ["×1 vraie échelle"], peeking: "false" }
```

So on a **fine** pointer the action still lands — Chrome dispatches `click` to the `mousedown` target —
and what is lost is the affordance and hold-to-peek's visual. **Not fixed here, and that is the
ticket's own ruling:** § 5 scopes the latch to « tant que le champ `x` a le focus », so extending it to
the toggles and « ×1 » invents policy, and every way of clearing such a latch is stuck-open where
buttons take no focus. It stays ticket 35's.

**One thing the earlier browser pass had not measured: the chevron is subject to the same reflow.**
Pressing « Afficher le profil » *with a pointer* directly from `pinned-x` (the Rail's `#rail-xD` holds
the caret, chevron centre at **(356, 110)**) loses the press outright — the `pointerdown` blurs the Rail
field, the strip goes, the cells row moves up 44 px, and `mouseup` lands elsewhere, so Chrome dispatches
the `click` to the **common ancestor**: a capture log on `document` recorded `click: DIV`, never the
button, and the state stayed `pinned`. **This predates the fix** — the button's handler never runs at
all — and a second press from the settled `pinned` state works normally (`whole`, focus `DIV#profil`).
The keyboard path from `pinned-x` is unaffected. Same class as the item above, same owner.

**Not observable on this host:** the coarse-pointer / real-touch case of either item —
`navigator.maxTouchPoints` is 0 and `matchMedia('(pointer: coarse)')` is false even under
`set device`, and the CLI has no touch primitive.

### Gates, re-run on the fixed tree

```
$ bunx oxfmt --write src/components/app/shell.tsx src/lib/layout/collapse.ts src/lib/layout/collapse.test.ts
Finished in 137ms / 80ms

$ bun run typecheck            # tsc --noEmit
exit=0                         (no output)

$ bun run lint-type-aware      # oxlint --type-aware --type-check
exit=0                         (no output)

$ bun run test                 # vitest run
 Test Files  39 passed (39)
      Tests  1219 passed (1219)

$ bunx vitest run src/lib/layout/collapse.test.ts
 Test Files  1 passed (1)
      Tests  35 passed (35)

$ bun run build
✓ built in 147ms
```

**Files changed in this pass.** `src/lib/layout/collapse.ts` (`PROFILE_BAND_ID`, `PROFILE_BAND_LABEL`),
`src/components/app/shell.tsx` (`ProfileBand`'s landing attributes, `RevealProfile`'s focus handoff),
`src/lib/layout/collapse.test.ts` (two cases). Nothing else was touched, and no acceptance item changed
its verdict: all eight still hold.

---

## Item 4 is partial — a ticket-honesty repair, 2026-08-14

**Not the implementer, and nothing under `src/` was changed for this note.** The cross-ticket audit
found item 4 ticked while this file's *own* evidence records a pointer press that never runs the
button's handler. The box is now unticked and marked `partiel`.

**`Status:` re-adjudicated to `claimed`, 2026-08-14 (delegator).** The note above originally left the
`Status:` line at `done`, which left the file contradicting itself — the one ticket in the run whose
status outranked its own checkbox list. `docs/agents/issue-tracker.md` admits `done` only when every
acceptance item passes, so `claimed` is what the convention gives. Nothing else about the ticket is
re-opened, and no code changed for this edit. It goes back to `done` when item 4's underlying gap
closes — which needs the § 5 latch-scope decision below, owned by ticket 35 and still with the user.

Environment for everything re-driven below: `HeadlessChrome/151.0.0.0`, `agent-browser 0.34.0`,
session `scoutech-fix28`, dev server at `http://localhost:3000/` (`200`), viewport `390 × 844` set
with `set viewport` and read back from `innerWidth`/`innerHeight`. Event sequences are a
**capture-phase log on `document`** over `pointerdown`/`mousedown`/`mouseup`/`click`/`focusin`/
`focusout`/`keydown`/`keyup`; state is `[data-collapse]`'s own dataset.

**What holds.**

- **The keyboard path, driven from `pinned` by *scroll*.** `aside.scrollTop = 200` → `pinned`;
  `chevron.focus()` → caret on the button, no `aria-disabled`; `key Enter` →
  `keydown: BUTTON « Afficher le profil » · click: BUTTON · focusout: BUTTON · focusin: DIV#profil`,
  ending `whole` at block **507,63** with `keyup` landing on the band. The hand-over this ticket
  built is exactly what the log shows.
- **A second press from a settled `pinned` state**, pointer included — unchanged from this file's
  own table above.

**What does not.**

- **The first pointer press taken directly from `pinned + x`.** Re-measured first-hand, **fine
  pointer**: `focus #rail-xD` → `pinned-x`, chevron centre `(356, 110)`; then
  `mouse move 356 110 ; mouse down ; mouse up` logs
  `pointerdown: SPAN · mousedown: SPAN · focusout: INPUT#rail-xD · focusin: BUTTON « Afficher le
  profil » · mouseup: SELECT#rail-cst · click: DIV`. The `pointerdown` blurs the Rail field, the
  View Strip unmounts, the row shifts up 44 px, and by `mouseup` the cursor is over a **Rail
  control**, so Chrome dispatches the `click` to the common ancestor: `click: DIV`, never the
  button. **The button's handler never runs** — the state goes `pinned-x → pinned` (the strip's own
  release) and stays there. A *fine*-pointer measurement, so this is **not** one of ticket 35's
  coarse-pointer unknowns.
- **One overstatement in the table above, corrected.** The row « from `pinned-x` by keyboard
  (`focus #rail-xD` → chevron → `Enter`) → `whole` » is right in its outcome and wrong in its
  cause. Driven from `pinned` by *focus* (`#rail-L`), the log reads `focusout: INPUT#rail-L ·
  focusin: BUTTON · focusout: BUTTON · keydown: BODY`, ending `whole`: **moving the caret onto the
  chevron already releases trigger (b)**, so the block is `whole` before `Enter` is pressed and the
  key lands on `<body>` with the caret nowhere. The reveal was granted by the *blur*, not by the
  press. Which is why the holding leg above is driven from trigger **(a)** — the only posture in
  which the chevron keeps its footing under the caret.

**The decision this leaves open, and it is the user's.** Making that pointer press survive means
latching on `pointerdown` for the chevron the way the View Strip's `x` already does — which widens
§ 5's « tant que le champ `x` a le focus » to a control § 5 never put inside that scope, and every
way of clearing such a latch is stuck-open where buttons take no focus. **OPEN SPEC DECISION, owned
by [ticket 35](./35-narrow-keyboard-browser-pass.md)**, beside the same class of finding already
parked there for the View Strip's toggles and « ×1 ». Not decided here, and not fixed here.

**What changed next door, for the record.** Ticket 28's fix step made the chevron publish that the
request **cannot be granted** under either height constraint — `aria-disabled="true"`, muted glyph,
`cursor: not-allowed`, still 44 × 44 and still focusable — so « restores whole block *when
constraints allow* » is now honest in the case where it cannot. That touches nothing in this item's
pointer gap.

---

## Re-measurement addendum — the evidence decision 5 disturbed, re-taken — 2026-08-15

**Role: re-measurement agent. Not the implementer, not a reviewer.** **Read-only on `src/**` throughout**
— no source file was touched, `src/routes/-prototype-07/**` and `src/routes/prototype.profile-view.tsx`
were not opened, and ticket 36 is out of scope. The tables above are **left exactly as they were
written** and superseded by pointer below, per amendment B's rule that evidence is dated: they were true
of the tree they were taken on.

**Why this exists.** [Decision 5 of 2026-08-14](./28-constrained-height-and-keyboard-modes.md) grew the
Rail's fifteen numeric fields from `text-xs` (12 px) to `text-base` (16 px) and, in its width
correction, tightened their gutter from `px-2` to `px-1`. The decision's own accepted cost says in as
many words that this **moves rail heights tickets 27, 28 and 29 measured**. This leg re-takes them
rather than leaving them stale.

**Environment.** `HeadlessChrome/151.0.0.0` — UA `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36
(KHTML, like Gecko) HeadlessChrome/151.0.0.0 Safari/537.36`, `devicePixelRatio 1`,
`navigator.maxTouchPoints` **0**, `matchMedia('(pointer: coarse)')` **false** (host limits already on
record). `agent-browser 0.34.0`, session **`remeas5`**, closed at the end with `--session` only — **the
shared dev server was reused, never killed, never `close --all`**; `curl -s -o /dev/null -w
'%{http_code}' http://localhost:3000/` → **200** before and after. Every viewport was set with
`agent-browser set viewport` and then **read back from `innerWidth`/`innerHeight`** before any number
was recorded; all geometry is `getBoundingClientRect()` / `getComputedStyle()`. Links: this ticket's own
first-run `FULL` and `B1` (`L=-5`), both **200**. The Rail was returned to `scrollTop 0` and the caret
blurred before every resting row — trigger (a) and trigger (b) each read `pinned` on an otherwise
resting layout, which is how a re-measure gets fooled.

### The counterfactual, which is what makes the attribution honest

Decision 5's only two edits are a computed font size and a horizontal padding on
`input[inputmode="decimal"]` inside the Rail. Both were **reverted in the page**, in the same frame, by
a throwaway stylesheet (`font-size: 12px; line-height: 16px; padding: 0 8px` — `text-xs`'s own metrics
and `px-2`'s own gutter), measured, then removed and measured again:

| relevé | 16 px · `px-1` (livré) | 12 px · `px-2` (contre-factuel) | après retrait |
| --- | --- | --- | --- |
| **390 × 664** — cinq sections | 1034,5 / 322 / 333 / 222 / 164 | **identique** | identique |
| somme · `aside.scrollHeight` | 2075,5 · 2120 | **2075,5 · 2120** | 2075,5 · 2120 |
| bloc · rail au repos | 539,625 · 124,375 | **539,625 · 124,375** | 539,625 · 124,375 |
| décalage de `#rail-L` / `#rail-mp` dans le contenu défilant | 235 / 926,5 | **235 / 926,5** | 235 / 926,5 |
| boîte du champ | 80,00 × 28,00 | 80,00 × 28,00 | 80,00 × 28,00 |
| **1440 × 900** — cinq sections | 1053,5 / 322 / 402,328 / 288 / 230 | **identique** | identique |
| somme · `scrollHeight` · bloc | 2295,828 · 2340 · 856,297 | **2295,828 · 2340 · 856,297** | idem |
| **768 × 1024** — cinq sections · bloc | 2295,828 · 561,4375 | **2295,828 · 561,4375** | idem |

**Not one number moves.** `h-7` is a 28 px border box — 26 px of content box — and `text-base`'s line
height is 24 px, so the text grows *inside* the box; the row's label stays `text-xs` and it is the label
that decides wrapping. So **every difference between this ticket's recorded tables and the values below
is somebody else's change**, and two are identifiable: ticket 29's **défaut-1 correctif** (the banner
slot became the width's row — 44 → 76 at a 390 px column, 44 → 60 at 480) and the `scroll-padding-bottom`
that landed with the keyboard work.

### Superseded — « The band stack, measured » (390 × 844 and 1440 × 900)

The table under *## Browser verification pass — independent, 2026-08-14* stands as written and is
**superseded here**. Re-taken first-hand, the recorded figure in italics where it differs:

| | 390 × 844 `whole` | 390 × 844 `pinned` | 390 × 844 `pinned-x` | 1440 × 900 `whole` |
| --- | --- | --- | --- | --- |
| créneau bandeau | **76** *(consigné 44)* | **76** *(44)* | **76** *(44)* | 44 |
| profil | **219,625** *(220)* | `0` | `0` | **539,672** *(540)* |
| bande de garde | 96 | `0` | `0` | **176,625** *(177)* |
| View Strip | 44 | `0` | **44** | 44 |
| cellules | 104 | **44** | **44** | 52 |
| **colonne graphique** | **539,625** *(508)* | **120** *(88)* | **164** *(132)* | **856,297** *(857)* |
| rail | **304,375 @ y 539,625** *(336 @ 508)* | **724 @ y 120** *(756 @ 88)* | **680 @ y 164** *(712 @ 132)* | 900, `md:w-72` = **288** |
| `--pinned-clearance` | `0px` | `120px` | `164px` | `120px` sous focus, `scroll-margin-top` **`0px`** |

**`--pinned-clearance` now equals the rendered header exactly** at 390 px — 120 against 120 and 164
against 164, where this ticket measured a 120 px reserve over an 88 px header. That is ticket 29's
défaut-1 correctif closing this ticket's own « 32 px over-reservation » question, **not** decision 5.
Above a 600 px column the safe-direction default still over-reserves by design: **1440 × 700** →
`pinned` · `tight`, rendered header **88**, clearance **120px**.

Desktop `856,297 = 44 + 539,672 + 176,625 + 44 + 52` is § 5's budget C, and the letterbox is the
residual **43,703**.

### The legs that carry numbers, re-driven one by one

| leg | consigné | re-mesuré 2026-08-15 | l'item tient ? |
| --- | --- | --- | --- |
| 390 × 844, cellule vive en `pinned` | « Garde min 2,48 m » **44 px** | « Garde min 2,48 m », **44 px** | oui (item 2) |
| chevron « Afficher le profil » | **44 × 44** | **44,00 × 44,00**, visible, sans `aria-disabled` en `roomy` | oui (item 4, pour cette moitié) |
| 390 × 664, `focus #rail-h` | header 88, clearance `120px`, `scroll-margin-top 120px` | header **120**, clearance **`120px`**, `smt` **`120px`** | oui — la réserve ne sur-tire plus |
| 390 × 664, `focus #rail-xD` | header 132, clearance `164px` | header **164**, clearance **`164px`**, `smt` **`164px`** | oui (item 3) |
| `B1` + `[ voir la première ]` | `#rail-L` ciblé, `smt 120px`, champ à **242** sous un header de **88** | `#rail-L` ciblé, `pinned`, `smt` **`120px`**, champ à **355** sous un header de **120** | oui (items 5 et 6) |
| culprit profond `daf=-1` | rail à **844**, `#rail-DAF` à **243** | rail à **591**, `#rail-DAF` à **527,5** dans un rail 120 → 844 | oui (item 5) |
| 1440 × 900, rail défilé + champ focalisé | `pinned`, profil `block` 540, chevron 0, `smt 0px` | `pinned`, profil `block` **539,672**, chevron hauteur **0** et `checkVisibility() false`, `smt` **`0px`** | oui — ça ne coûte rien au bureau |

The two jump legs land at different scroll offsets than this ticket recorded because the reserve, the
Rail's viewport height and `scroll-padding-bottom` all moved under them — **the field's own offset
inside the Rail's scroll content did not** (`#rail-L` **235**, `#rail-DAF` **998,5**, byte-identical
under the 12 px counterfactual). What items 5 and 6 ask for — the culpable field focused, clear of the
pinned header, with § 7's reserve applied — holds at the new numbers.

### Verdicts

**No acceptance item changes state, and none is unticked by this leg.** Items 1, 2, 3, 5, 6, 7 and 8
hold on the measurements above. **Item 4 stays `partiel` for its own, unrelated reason** — the first
pointer press taken directly from `pinned + x` never reaches the button's handler, an event-ordering
defect with an open § 5 latch-scope decision owned by [ticket 35](./35-narrow-keyboard-browser-pass.md).
Nothing in decision 5 touches it, and it was not re-litigated here. **`Status:` stays `claimed`** —
`docs/agents/issue-tracker.md` admits `done` only when every acceptance item is satisfied, and item 4 is
not.

### Not observable on this host — stated, not inferred

Unchanged from this ticket's own list, re-confirmed rather than assumed: **no real soft keyboard**
(`--kb` read `0px` in every resting row here); `navigator.maxTouchPoints` **0** and
`(pointer: coarse)` **false** without CDP touch emulation, so every 44 px figure above is a CSS/layout
fact under a **fine** pointer, with no tap semantics exercised; `interactive-widget=resizes-content`
present in the markup and honoured only by Safari; headless Chrome will not scroll the Rail's
sub-scroller from a synthesised wheel event, so `aside.scrollTop` was assigned directly, which fires the
same `scroll` event the app observes.

### Gates, as this leg leaves them

```
$ bun run typecheck            # tsc --noEmit
$ tsc --noEmit
exit=0                         (no output)

$ bun run lint-type-aware      # oxlint --type-aware --type-check
$ oxlint --type-aware --type-check
exit=0                         (no output)

$ bun run test                 # vitest run
 RUN  v4.1.10 /home/bastien/lab/perso/scoutech
 Test Files  40 passed (40)
      Tests  1331 passed (1331)
   Duration  1.18s
```

No `oxfmt`: this leg touched no source file, and Markdown is in `.oxfmtrc.json`'s `ignorePatterns`.
