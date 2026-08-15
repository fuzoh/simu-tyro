# 35 — Verify narrow-screen keyboard interaction in browser

**What to build:** Observe narrow layout with numeric field focused and virtual-keyboard viewport reduction active. Pinned Safety Header must compact, focused control remain reachable, rider-position editing remain visible, and dismiss path restore usable Rail without layout jump.

**Blocked by:** 28 — Keep safety controls usable under constrained height.

**Status:** claimed

- [x] Browser run records whether interactive-widget viewport policy is honored and fallback keyboard inset value when it is not.
- [ ] Opening keyboard produces compact one-row safety header and leaves usable Rail space rather than covering focused field. — **partiel** : the row and the space hold; the **focused field lands behind the keyboard** in three of four postures under the `--kb` fallback. Voir defect 1. **Half repaired on 2026-08-14** (`scroll-pb-[var(--kb,0px)]` on the Rail — voir the fix note below): a focus *under* an inset that is already up now lands inside the visible part, in portrait and in landscape. The **focus-then-keyboard ordering is still unfixed** and is the open § 5 call. **Re-verified 2026-08-14** (voir the re-verification below): the repaired leg holds and one **residual** was measured beside it — `#rail-xD`'s `scroll-margin-top` reserve (`--pinned-clearance`, **164 px** in `pinned-x`) is larger than the Rail's remaining viewing region at 390 × 664 and in landscape, so that one field still lands **13,5 px** / **20,5 px** past the visible bottom. Improved, not closed.
- [x] Focusing Rail field centers it inside Rail scroller without smooth-scroll race.
- [x] Focusing rider-position field retains View Strip and live « Garde min » while keyboard is open.
- [x] Enter commits and blurs decimal field; keyboard dismissal restores correct pinned/whole state from current constraints.
- [x] Portrait and landscape outcomes are recorded without orientation prompt or special-case branch.
- [x] Browser/device limitations are stated explicitly; no unsupported mobile claim is recorded as measured fact.

## Comments

## Browser pass — 2026-08-14, `agent-browser`, read-only on `src/**`

**This host has no soft keyboard, and that is the first thing to say.** It is Linux desktop
**headless Chrome** — `HeadlessChrome/151.0.0.0` (`Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36
… Safari/537.36`), `agent-browser 0.34.0`, session `scoutech-t35`, `devicePixelRatio 1`, dev server
already up at `http://localhost:3000/` (`curl -s -o /dev/null -w '%{http_code}'` → **200**). No
virtual keyboard exists, so **every keyboard number below carries its method**, one of three:

| tag | method | what it stands in for |
| --- | --- | --- |
| **[OVERRIDE]** | JS getter override of `visualViewport.height` (and `offsetTop`) + a synthetic `resize`/`scroll` on `visualViewport` | the platform that **ignores** `interactive-widget` — the layout viewport keeps its height and the app's own `--kb` fallback fires. This is the exact seam `use-viewport.ts` listens to. |
| **[RESIZE]** | `agent-browser set viewport <w> <h>`, read back from `innerWidth`/`innerHeight` | the platform that **honours** `resizes-content` — the layout viewport shrinks and `--kb` stays `0px` |
| **[CDP]** | raw CDP on the page target: `Emulation.setTouchEmulationEnabled`, `Input.dispatchTouchEvent` / `dispatchMouseEvent` | a coarse pointer and real touch sequences |

Nothing here is a device measurement. **No real keyboard, no real finger, no iOS.** Viewports were
set explicitly and read back from `innerWidth`/`innerHeight` before any number was recorded; all
geometry is `getBoundingClientRect()` / `getComputedStyle()`; event orderings are a **capture-phase
log on `document`** over `pointerdown`/`touchstart`/`pointerup`/`touchend`/`mousedown`/`mouseup`/
`click`/`focusin`/`focusout`. The inset used is **336 px portrait / 240 px landscape**, § 5's own
platform-typical figures, and it is a *chosen* number, not a measured one.

### Item 1 — the policy, and the fallback inset

- **The meta is present and correct**, measured out of the DOM:
  `width=device-width, initial-scale=1, interactive-widget=resizes-content`.
- **Whether it is honoured is NOT OBSERVABLE here.** With no keyboard there is no widget to resize;
  `visualViewport` never shrinks on its own and `--kb` reads **`0px`** throughout at rest, at every
  viewport driven. Only Safari honours the tag, and no iOS device was available. Recorded as markup,
  never as behaviour.
- **The fallback is live and measured.** § 5's formula — `layoutHeight − visualViewport.height −
  offsetTop`, no threshold — reaches the layout as `--kb`, and **both terms contribute** [OVERRIDE]:

  | drive | `--kb` | state | Rail `padding-bottom` |
  | --- | --- | --- | --- |
  | at rest, no override | **`0px`** | `whole` | `0px` |
  | `vv.height` 844 → 508 | **`336px`** | `compact` | `336px` |
  | `vv.height` 508 **and** `offsetTop` 100 | **`236px`** (844 − 508 − 100) | `compact` | `236px` |
  | `offsetTop` 150 alone, height unchanged | **`0px`** | `whole` | `0px` |

  The last row is the formula being right rather than wrong: a pan with no height change means
  nothing is covering the content, and `Math.max(0, …)` says so.
- On the **[RESIZE]** path (`390 × 508`, i.e. what a honoured `resizes-content` produces) `--kb` stays
  **`0px`** and the state derives from the reduced `innerHeight` instead — the two halves of § 5's
  keyboard design, each exercised on its own.

### Item 2 — the compact row holds; the focused field does not stay on screen

**What holds.** At **390 × 844**, `#rail-mp` focused, then [OVERRIDE] 336: state **`compact` ·
`tight`**, `--kb 336px`, and the block is **one 44 px `flex-row`** — banner slot **245,2 × 44** beside
the live cell « Garde min 3,28 m » **88,8 × 44**, chevron **44 × 44** at x 334 (`aria-disabled="true"`,
`cursor: not-allowed` — ticket 28's fix, correct because no press can grant `whole` under a height
constraint), with `#profil`, the clearance band and the View Strip all `display: none`. Usable Rail
above the simulated keyboard: **464 px**. At **390 × 664** (§ 5's budget A) the same drive gives
**284 px** of usable Rail — `664 − 336 − 44`, § 5's own arithmetic to the pixel — and the Rail's
`padding-bottom` follows the inset on the same element with nothing above it moving.

**What does not, and it is one root cause.** The centring is **inset-blind**: the Rail's box is
*padded* by `--kb`, not shrunk by it, so `scrollIntoView({ block: 'center' })` targets the box's
geometric centre — which is behind the keyboard — and **nothing re-runs when the inset appears**
(`scrollTop` is bit-identical before and after the inset arrives). The focused field therefore ends up
below the fold in three of the four postures driven:

| posture (focus first, keyboard second — the device order) | state | field rect | visible bottom | verdict |
| --- | --- | --- | --- | --- |
| 390 × 844, `#rail-mp` [OVERRIDE 336] | `compact` | y 467,5 – **495,5** | 508 | on screen, **12,5 px** to spare |
| 390 × **664**, `#rail-mp` [OVERRIDE 336] | `compact` | y 377,5 – **405,5** | 328 | **77,5 px below the fold** |
| 390 × 844, `#rail-xD` [OVERRIDE 336] | `pinned-x` | y 555,5 – **583,5** | 508 | **75,5 px below the fold** |
| 844 × 390 paysage, `#rail-L` [OVERRIDE 240] | `compact` | y 203 – **231** | 150 | **81 px below the fold** |

It is not an artefact of the override. Driven **[RESIZE]** instead — focus at 390 × 664, then shrink
the real viewport to 390 × 328 — `scrollTop` stays **593** and `#rail-mp` still sits at y 377,5–405,5
against a 328 px viewport, Rail box 390 × **284**. Same for `#rail-xD` at 390 × 508: field y 555,5,
**47,5 px** past the bottom edge.

And it is not only the focus-then-open ordering. In **landscape**, focusing a field while the
keyboard is *already* open still lands it off screen [OVERRIDE 240]: `#rail-h` → y 203, `#rail-DAF` →
y 202,5, both against a visible bottom of **150**, because the Rail box centre there is 195. Portrait
escapes that leg (`#rail-L` y 279, `#rail-DAF` y 451,5, `#rail-muOverride` y 451,5 — all above 508)
only because the compact header shrank the box enough that its centre, 444, happens to clear the
inset.

**Recoverable, not a dead end**: scrolling the Rail 120 px brings `#rail-xD` from y 555,5 to
**435,5** with the state still `pinned-x` and the strip retained — the `padding-bottom` does give the
scroller the room. What is lost is § 5's own showcase: the user cannot see the field they are typing
into at the moment the keyboard opens.

**The box is left unticked.** Voir defect 1 below for the seam and the options.

### Item 3 — the centring, and the absence of a race

Measured at 390 × 844 from `whole`, `focus #rail-DAF`, sampled on the *same tick* and then over 800 ms:

```
sync after focus()  scrollTop 575
+2 frames           575        +50ms  575        +300ms  575        +800ms  575
```

No animation, and no scroll to race the keyboard: `scroll-behavior` computes **`auto`** on the Rail,
on `documentElement` and on `body`. The target is genuinely the Rail's centre — Rail box y 88 h **756**
⇒ centre **466**, field centre **525,5**, i.e. `+59,5` = half of the measured `scroll-margin-top:
120px`, § 7's reserve composing with the centring. The scroll is computed against the **post**-collapse
756 px Rail, not the 336 px resting one, so ticket 28's `flushSync` ordering holds. Under the
simulated inset the same relation holds with the compact header's own reserve (`scroll-margin-top`
**`44px`**, field centre = Rail centre + 22).

Item ticked for what it says. That the centre of the Rail's *box* is not the centre of the Rail's
*visible* area under the fallback inset is item 2's finding, not this one's.

### Item 4 — rider position, with the keyboard open

`#rail-xD` focused, then [OVERRIDE 336], at 390 × 844:

| | measured |
| --- | --- |
| state | **`pinned-x` · `tight`**, `--kb 336px` — `compact` does **not** win, which is § 5's ordering |
| block | **132** (44 banner + 44 View Strip + 44 live cell), `--pinned-clearance` **`164px`** |
| View Strip | `display: flex`, **390 × 44 at y 44**, i.e. `bottom 88` — far above the 508 px fold |
| live cell | « Garde min 2,48 m » → typing **120** into the Rail field moved it **live** to « Garde min (à x 117,2 m) 4,20 m » while `--kb` stayed `336px`, with the strip's own `x` following to **120,0** and the `%` secondary to **· 80 %** |
| Rail | `padding-bottom` **336px**, box y 132 h 712 |

Typed with **real key events** (`press Control+a`, `keyboard type "120"`). The same holds for the View
Strip's own `x`: focusing it at rest keeps `whole` (it is not a trigger), and when the keyboard then
opens the state goes to **`pinned-x`**, not `compact` — the field being typed into is not unmounted,
which is exactly what that ordering exists for.

### Item 5 — Enter, and the dismissal

**Enter commits and blurs**, both decimal fields, real `press Enter`:

- **Rail `#rail-xD`** under [OVERRIDE 336]: value committed and normalised to **`120,0`**,
  `document.activeElement` → **`BODY`**, live cell keeps « Garde min (à x 117,2 m) 4,20 m », and the
  state falls `pinned-x` → **`compact`** because the inset is still up and no position field holds the
  caret. Correct by § 5's table.
- **View Strip `x`** under [OVERRIDE 336]: typed `42,5` stayed a **draft** (live cell unchanged — a
  typed position is exact and commits on Enter/blur, not per keystroke); `Enter` committed it
  (`#rail-xD` → `42,5`, live cell « Garde min 3,28 m »), blurred to `BODY`, state → `compact`.

**Dismissal restores the state from the current constraints**, four legs, all at 390 × 844 unless said:

| leg | after `--kb` → `0px` |
| --- | --- |
| Rail scrolled to 611, nothing focused | **`pinned` · `roomy`**, block 88, clearance `120px`, Rail box 756 with `padding-bottom` back to **`0px`** |
| `#rail-L` still holding the caret | **`pinned` · `roomy`**, block 88, `active INPUT#rail-L` — trigger (b) alone |
| then blur + Rail to top | **`whole` · `roomy`**, block **507,6**, `#profil` `display: block`, Rail back to y 507,6 h 336,4 |
| 844 × 390 paysage | **`compact` · `tight`**, block 44 — the height constraint outlives the keyboard, correctly |

No layout jump beyond the state change itself: the Rail's top equals the block's bottom at every step
(44/44, 88/88, 507,6/507,6) and the only property that moves on the Rail is `padding-bottom`.

### Item 6 — portrait and landscape, no prompt and no branch

| viewport | at rest | field focused + keyboard | rider position + keyboard |
| --- | --- | --- | --- |
| 390 × 844 portrait | `whole` · `roomy`, block 507,6 | `compact` · `tight`, block 44, 464 px usable Rail | `pinned-x`, block 132, strip 390 × 44 at y 44 |
| 390 × 664 portrait | `whole` · `roomy`, block 507,6 | `compact`, block 44, **284 px** usable Rail | idem |
| 844 × 390 paysage | **`compact` · `tight`**, block 44, Rail **beside** at 288 × 390 | `compact`, block 44, **106 px** usable Rail | `pinned-x`, block 132, strip 556 × 44 at x 288 |

A **rotation round-trip with the keyboard up** (390 × 844 → 844 × 390 → 390 × 844, inset re-applied at
each posture) returns **`pinned-x` both ways**, keeps `INPUT#rail-xD` focused, keeps the strip, and the
Rail's `padding-bottom` follows the posture's inset (336 / 240 / 336). Landscape reaches its state
through the same fit rule as every short viewport.

**No orientation rule and no orientation copy exist**: over **99 718 characters** of loaded CSS read
out of `document.styleSheets`, **zero `(orientation…)` rules**, and no rotate-prompt string
(`/pivot|rotat|tourner|paysage/i`) anywhere in `document.body.innerText`. Limitation:
`screen.orientation.type` reads `landscape-primary` on this headless host at **every** viewport,
including 390 × 844, so it is not usable as evidence either way — what carries the item is the absence
of any such rule in the shipped sheet.

### The carry-over defect from ticket 27 — re-measured, and it is worse than recorded

Driven at **390 × 844** from `pinned-x` (`focus #rail-xD`), on a **fine** pointer
(`Input.dispatchMouseEvent`) and then under a **matched coarse pointer** (`[CDP]`
`Emulation.setTouchEmulationEnabled { maxTouchPoints: 5 }` — `matchMedia('(pointer: coarse)')`
**true**, `navigator.maxTouchPoints` **5**, the rider's `stroke-width` reading **22px** against
`14px` fine — driven with `Input.dispatchTouchEvent`). `(hover: hover)` stays false: this is
coarse-pointer emulation, not a device.

| # | control (centre) | fine pointer | coarse pointer |
| --- | --- | --- | --- |
| i-a | « ×1 vraie échelle » (201,8 ; 66) | strip unmounts on `mousedown`, state `pinned-x` → `pinned` — but `pointerup`/`mouseup`/**`click` all reach the BUTTON** and the peek releases: the action **lands** | `touchstart` toggles peek on (`aria-pressed true`), then the compat `mousedown` blurs `#rail-xD`, the strip goes, `mouseup` lands on the live cell « 3,28 m » and **`click: DIV`** — the button's handler never runs and the peek is dropped by `lostpointercapture`: the action is **lost** |
| i-b | « ligne à vide » (48,6 ; 66) | `pointerdown: SPAN "à vide"` · `mousedown` · `focusout INPUT#rail-xD` · `mouseup: SPAN "3,28 m"` · **`click: DIV`** — `aria-pressed` stays **`false`**: the action is **lost** | identical outcome, `aria-pressed` **`false`**: **lost** |
| ii | chevron « Afficher le profil » (356 ; 110) | `pointerdown: SPAN "⌄"` · `focusout INPUT#rail-xD` · `focusin BUTTON` · `mouseup: SELECT#rail-cst` · **`click: DIV`** — state stays `pinned`, `#profil` `display: none`: **lost** | identical, `click: DIV`, `#profil` `display: none`: **lost** |
| control | chevron from a **settled** `pinned` (rail `scrollTop 200`, centre 356 ; 66) | `click: SPAN "⌄"` → **`whole`**, block 507,6, focus `DIV#profil «Profil»` | identical: **works** |
| control | the strip's **own** `x` (282,7 ; 66) from `pinned-x` | stays `pinned-x`, strip `flex`, focus lands in the strip input | identical: the § 5 latch **holds on touch too** |

Three things this settles, all of them corrections to what ticket 27 recorded:

1. **It is not a fine-pointer artefact.** Symptom (ii) is identical on a matched coarse pointer, and
   symptom (i) is **worse** there: on fine, `setPointerCapture` inside « ×1 »'s own `onPointerDown`
   is what rescues the click; the two layer toggles take no capture, so **they lose the action on
   *both* pointer types** — which ticket 27's « on this pointer type the action lands » did not cover.
2. **The keyboard makes the reflow bigger.** With the inset up [OVERRIDE 336], a coarse tap on « ×1 »
   from `pinned-x` collapses to **`compact`** rather than `pinned` — block **132 → 44**, an **88 px**
   jump under the finger instead of 44 — and the click still ends on `click: DIV`.
3. **The latch that exists works everywhere it is scoped to.** The strip's `x` survives on touch. The
   defect is exactly the *absence* of that latch on the row's other three controls and on the
   chevron.

**OPEN SPEC DECISION — named, not taken.** § 5's fourth state reads « **pinned + x** : idem, plus la
View Strip, **tant que le champ `x` a le focus** ». The `pointerdown` latch in
`src/components/chart/view-strip.tsx` (the `<label>`'s `onPointerDown` → `onPositionFocus(true)`)
covers only that one field, and the chevron victim lives in `src/components/app/shell.tsx`. Widening
the latch **extends that sentence's scope to controls § 5 never put inside it**, so it is the user's
call. Four ways out, with their costs:

- **(i) Change nothing.** Three of the View Strip's four controls and the reveal chevron are dead on
  the first press whenever the rider-position field holds the caret — the very state § 5 minted
  `pinned + x` for. Cost: measured above; a second press always works, so the user's model becomes
  « press twice ».
- **(ii) Widen the `pointerdown` latch to the whole View Strip row and to the chevron.** Every press
  from `pinned + x` keeps its footing for the gesture. Cost: it re-reads « tant que le champ `x` a le
  focus » as « tant qu'un contrôle de la rangée est pressé », and it needs a release rule
  (`pointerup` + `pointercancel` + `lostpointercapture`) — a latch that never clears is stuck-open on
  a platform where buttons take no focus, which is why ticket 27 refused to invent it.
- **(iii) Keep the View Strip in `pinned` unconditionally** (drop the `x`-focus condition). Cost:
  `pinned` becomes 132 px instead of 88 at narrow, spending 44 px out of `MIN_RAIL` — it contradicts
  § 5's own height table, where 120/164 are two different states.
- **(iv) Commit those controls on `pointerdown` instead of `click`.** Cost: ordinary button semantics
  go (no cancelling by dragging off), and hold-to-peek already owns `pointerdown` on fine pointers.

### Also measured, and also a § 5 question: the View Strip's controls are 32 px under a coarse pointer

Ticket 28 parked this here with numbers; **re-measured under a matched `(pointer: coarse)`**, inside
the 44 px row (`h 44` at `y 44`):

| control | box |
| --- | --- |
| « à vide » | 49,3 × **32** |
| « corde » | 48 × **32** |
| « ×1 » | **29,8 × 32** — under the minimum in *both* dimensions |
| the `x` input | 64 × **32** |

§ 5 states « The row is 44 px tall, **so every control in it is a legal touch target** ». That
inference does not hold for the shipped controls. Either the sentence is restated or the four controls
are sized to 44 px — **a § 5 decision, not this pass's**, and not this ticket's acceptance either.

### Not observable on this host — stated, never converted into a measurement

- **A real soft keyboard.** None exists; `--kb` reads `0px` unless overridden. Every keyboard number
  above is tagged [OVERRIDE] or [RESIZE]. The 336/240 px insets are § 5's platform-typical figures.
- **Whether `interactive-widget=resizes-content` is honoured.** Markup verified; behaviour is
  Safari's, and no iOS device was available.
- **Whether a real mobile browser's own « scroll the focused editable into view on resize » would
  mask defect 1.** Chrome and Safari do that on a device; **it did not happen here** on either the
  [OVERRIDE] or the [RESIZE] path, and I cannot tell you what a phone would do. The defect is
  reported as what the *app* does, which is nothing.
- **A real finger.** `[CDP]` touch emulation flips `(pointer: coarse)` and `maxTouchPoints`, and
  `Input.dispatchTouchEvent` delivers real touch sequences — but `(hover: hover)` stays false, the
  override dies with the websocket, and there is no gesture recogniser, no scroll-vs-tap heuristic
  and no keyboard behind it.
- **`screen.orientation`** reads `landscape-primary` at every viewport here, so orientation was
  argued from the absence of rules in the sheet, not from the API.

### Gates — run on the current tree, nothing under `src/` touched

```
$ bun run typecheck          # tsc --noEmit
exit=0   (no output)

$ bun run lint-type-aware    # oxlint --type-aware --type-check
exit=0   (no output)

$ bun run test               # vitest run
 Test Files  39 passed (39)
      Tests  1268 passed (1268)
 Duration  1.37s
```

No `oxfmt` run: this pass is **read-only on `src/**`** and this ticket file is in `ignorePatterns`.
`git status` shows only tickets 27/28's pre-existing working-tree changes plus this file.

### Status stays `claimed`

Item 2 is not satisfied: the compact row and the keyboard-safe space are measured and correct, and the
focused field is **not** kept on screen under the `--kb` fallback. Defect 1 below owns it, and the two
spec decisions above (the `pinned + x` latch scope, the View Strip's 32 px controls) are left open for
the user by design — a build ticket does not get to take them.

**Defect 1 — the keyboard inset never reaches the centring.** Repro:
`agent-browser --session S set viewport 390 664` → `focus #rail-mp` → override
`visualViewport.height` to 328 and dispatch `resize` (or simply `set viewport 390 328`) → the field
sits at y 377,5–405,5 against a 328 px viewport, `aside.scrollTop` unchanged at 593. Seam: the
`focusin` handler in `src/components/app/shell.tsx` and `CENTRE_IN_RAIL` in
`src/lib/layout/collapse.ts` — the Rail is *padded* by `var(--kb)`, so `block: 'center'` centres in a
box whose lower `--kb` pixels are covered, and nothing re-runs when the inset changes. The arithmetic
(« given the Rail box, the inset, the field's offset and its `scroll-margin-top`, what `scrollTop`
puts the field inside the *visible* part? ») is expressible as a pure predicate and belongs in
`collapse.ts`'s node tests; the resulting pixels stay browser evidence. **Which mechanism to use is a
§ 5 call** — re-run the centring on an inset change (extends piece 3's trigger), subtract `--kb` in
the centring target (replaces `scrollIntoView`'s own centre), or shrink the Rail's box by `--kb`
instead of padding it (changes piece 2's « Rail's bottom padding ») — so it is named here rather than
patched.

## Fix note — 2026-08-14, defect agent, all four defects re-driven first

Same host as the pass above: Linux desktop **headless Chrome `HeadlessChrome/151.0.0.0`**
(`Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 … Safari/537.36`), `agent-browser 0.34.0`,
session `scoutech-fix35`, dev server already up at `http://localhost:3000/` (**200**). Still no soft
keyboard, no real finger and no iOS: the inset is the same **[OVERRIDE]** — a getter override of
`visualViewport.height` / `offsetTop` plus a synthetic `resize` — and the presses are CDP mouse
events (`agent-browser mouse move/down/up`), i.e. a **fine** pointer. Nothing below is a device
measurement.

**All four reproduced before anything was touched.** Coordinates in this session run 32 px lower than
the pass above (a devtools row in the shell), so every press used a freshly measured centre:

| defect | driven | observed, on this tree |
| --- | --- | --- |
| 1 | 390 × 664, `focus #rail-mp`, then [OVERRIDE] `vv.height 328` | `compact` · `tight`, `--kb 336px`, `aside.scrollTop` **609 before and after**, field **y 361,5 – 389,5** against a visible bottom of **328** |
| 2 | 390 × 844, `focus #rail-xD` (`pinned-x`), press « ligne à vide » (48 ; 98) | `pointerdown SPAN "à vide"` · `mousedown` · `focusout INPUT#rail-xD` · `mouseup SPAN "2,48 m"` · **`click: DIV`**, `aria-pressed` **`false`**, state `pinned-x` → `pinned` |
| 3 | idem, press the chevron (356 ; 142) | `pointerdown SPAN "⌄"` · `focusout INPUT#rail-xD` · `focusin BUTTON` · `mouseup SELECT#rail-cst` · **`click: DIV`**, `#profil` `display: none`, state `pinned` |
| 4 | idem, read the row and its controls | row **390 × 44 at y 76**; « à vide » **49,3 × 32**, « corde » **48 × 32**, « ×1 » **29,8 × 32**, the `x` input **64 × 32** (`getComputedStyle().height` **32px**) |

### Fixed — defect 1, the half of it that needs no § 5 decision

**One property, at the seam the defect names.** The Rail scroller now spends `--kb` **twice**:
`pb-[var(--kb,0px)]` as before (§ 5's piece 2, untouched) **and `scroll-pb-[var(--kb,0px)]`**, which
is the scroller's *optimal viewing region* — the box `scrollIntoView({ block: 'center' })` centres
in. Piece 3 keeps its one call, its `{ block: 'center' }` and its absent `behavior`; no trigger was
added, no `scrollTop` is assigned anywhere, `CENTRE_IN_RAIL` is unchanged, and § 7's jump primitive
inherits the correction because it is the same object. **It is self-neutralising like the padding it
sits beside**: `0px` at rest and wherever `interactive-widget=resizes-content` is honoured.

Measured on the fixed tree, `aside.scrollTop` reset to 0 before each focus:

| posture | inset | field rect | visible bottom | before → after |
| --- | --- | --- | --- | --- |
| 390 × 664, `#rail-mp` focused **under** the inset | [OVERRIDE] 336 | **y 193,5 – 221,5** | 328 | y 361,5–389,5 → **inside**, 106,5 px to spare |
| 844 × 390 paysage, `#rail-h` | [OVERRIDE] 240 | **y 83 – 111** | 150 | pass recorded y 203 → **inside** |
| 844 × 390 paysage, `#rail-DAF` | [OVERRIDE] 240 | **y 82,5 – 110,5** | 150 | pass recorded y 202,5 → **inside** |
| 390 × 844, `#rail-DAF`, **no keyboard** | — | y 527,5 – 555,5, `scroll-padding-bottom` **`0px`** | 844 | unchanged: field centre 541,5 = Rail centre 482 + 59,5, i.e. half of `scroll-margin-top: 120px`, exactly item 3's relation |

`getComputedStyle(aside)` reads `padding-bottom 336px` **and** `scroll-padding-bottom 336px` under the
inset, `0px` / `0px` at rest.

**What is still broken, and why it was left alone.** The **device ordering** — focus first, keyboard
second — is unchanged: with `#rail-mp` focused *before* the override, `scrollTop` stays **609** and
the field stays at y 361,5–389,5 behind the 328 px fold. Nothing re-runs the centring when the inset
appears, and making something re-run it **adds a trigger § 5's piece 3 does not have** (« on field
focus »). That is the open § 5 call, now narrowed to one option rather than three:

- **(a) re-run the centring on an inset change** — a new trigger for piece 3; it also has to decide
  whether it may move the Rail under a finger that is mid-gesture.
- **(b) leave it to the platform** — Chrome and Safari scroll the focused editable into view when the
  visual viewport shrinks; that behaviour **did not fire on this host** on either the [OVERRIDE] or
  the [RESIZE] path, so on a device this leg may already be masked and **nobody here can measure
  whether it is**.

The two mechanisms the pass listed as alternatives are **off the table now** and it costs nothing to
say why: subtracting `--kb` inside a hand-rolled target would replace `scrollIntoView` (piece 3), and
shrinking the Rail's box would replace the padding (piece 2) — the scroll padding gets the same
geometry while leaving both sentences literally as written.

**A second open § 5 call now sits beside the ordering one, and it is about the same tap — added
2026-08-14.** The zoom gate that ticket 28 landed (`keyboardInsetOf` returns 0 whenever
`visualViewport.scale !== 1`) accepts one cost: a keyboard opened on an **already zoomed** page reads a
0 inset. In this app that is not a rare combination but **the ordinary iOS focus path**, because two
in-repo facts collide — every Rail field computes to **12 px** (`text-xs`, `src/components/rail/controls.tsx`;
measured here, **26 of 27** `input`/`select` under 16 px at 390 × 844) and the viewport meta is
**zoomable** (`src/routes/__root.tsx`, no `maximum-scale`, no `user-scalable=no`). WebKit zooms a
user-scalable page in on focus of a sub-16 px field and does not zoom back out on blur, so on the older
iOS Safari the `--kb` fallback exists for, **the first tap into a Rail field** sets `scale ≠ 1` and § 5's
keyboard piece 2 is absent for the rest of the session — no `pb-[var(--kb,0px)]`, no `scroll-pb`, no
`compact` row, i.e. the whole feature the four pieces are for. Named, not measured: still no device.
Three candidate answers, none of them taken here because the gate itself is settled and this is a new
§ 5 question:

- **(α) 16 px (`text-base`) on the numeric fields** — removes the trigger at the source; costs the Rail's
  density, and § 5 sized that column against 12 px text.
- **(β) `maximum-scale=1`** — also removes the pinch defect the gate answers, and would let the gate go;
  costs page zoom outright, which is an accessibility loss § 5 never priced.
- **(γ) accept it explicitly** — the fallback covers rotation and desktop resizes but not the iOS
  keyboard it was written for; the cost record in `use-viewport.ts` and ticket 28 then stands as the
  whole answer.

Voir [ticket 28](./28-constrained-height-and-keyboard-modes.md)'s « le coût accepté » for the
measurements and `src/components/app/use-viewport.ts`'s `keyboardInsetOf` docstring, which carries the
same paragraph beside the gate.

#### Mise à jour — décision 5 du propriétaire, 2026-08-14

**Cette question est tranchée : c'est (α), et elle est livrée.** Les champs numériques du Rail portent
`text-base` — **16 px** calculés — dans `NumericInput` (`src/components/rail/controls.tsx`), ce qui
retire le déclencheur *à la source* en laissant le zoom à la pince disponible. (β)
`maximum-scale=1` a été **rejeté** (il retire le zoom de page à qui en a besoin pour lire un graphe,
une perte d'accessibilité) et (γ) l'acceptation explicite aussi. **La porte elle-même ne bouge pas** :
elle répond au défaut de pince, qui est un geste réel sur toute plateforme.

**Les chiffres du paragraphe ci-dessus sont *d'avant* le changement.** « Every Rail field computes to
12 px » et « 26 of 27 `input`/`select` under 16 px at 390 × 844 » décrivent l'arbre pré-décision. Mesuré
après, sur cet hôte (`HeadlessChrome/151.0.0.0`, 390 × 844 et 1440 × 900 concordent — la taille de
police calculée ne lit pas le viewport) :

- **15 / 15 champs numériques du Rail à 16 px**, boîte inchangée **80 × 28**.
- **10 des 26 contrôles de formulaire du Rail** restent à 12 px : **six `select`** (`rail-regime`,
  `rail-r0`, `rail-cst`, `rail-ta`, `rail-tb` et le sélecteur de classe de matériau) et **quatre
  `radio`** (`usage` ×2, `family` ×2).
- **Aucun budget de mise en page ne bouge** : `h-7` est une hauteur de boîte de bordure, le texte
  grandit *dedans* — voir la table « avant / après » de [ticket 28](./28-constrained-height-and-keyboard-modes.md).

**Le résidu, et il est de deux sortes.** (i) Le « x » de la View Strip reste à **11 px**
(`src/components/chart/view-strip.tsx`) : ce n'est pas un champ du Rail, la décision 5 ne le couvre pas,
donc une frappe directement dedans peut encore mettre `scale ≠ 1`. (ii) **Que les six `select` déclenchent
ou non le zoom est *nommé, pas mesuré*** — comme la règle WebKit elle-même, faute d'appareil iOS : la
mitigation contre laquelle ce comportement est universellement documenté porte sur
**`input, select, textarea`**, donc un `select` à 12 px peut zoomer au focus. Si c'est le cas, le
déclencheur est **réduit, pas supprimé**, et le premier contrôle vers lequel la bannière § 7 pousse un
utilisateur au premier lancement (« Choisissez un régime de sécurité pour obtenir un verdict ») est
`rail-regime`, un `select` à 12 px. **Étendre les 16 px à `Picker`/`Choice` n'est pas fait ici** : la
décision 5 nomme « Rail numeric fields », la boîte d'un `select` est `max-w-40`/`max-w-44` et non
`w-20` — elle bougerait donc des largeurs du Rail — et l'élire serait une politique que personne n'a
tranchée.

**La question d'ordonnancement ci-dessus (a) / (b) reste ouverte** : elle porte sur un autre mécanisme
(le re-centrage de la pièce 3) et rien ici ne la touche.

**Guarded in `node`**, `src/lib/layout/contract.test.ts` (« the Rail spends `--kb` twice … »), beside
the banner-budget assertion that already reads `shell.tsx`: both tokens on the Rail's own class list,
`scrollIntoView(CENTRE_IN_RAIL)` still the only centring, no `scrollTop` **assignment**, no
`behavior: "smooth"`. The pixels stay browser evidence (amendment B) — a `node` suite has no layout —
so what the test locks is *that the same inset reaches the scroller's viewing region and not only its
content*, which is the thing that regressed. `CENTRE_IN_RAIL`'s own doc in `collapse.ts` now carries
the pair and the open ordering question.

### Skipped — defects 2 and 3, one OPEN SPEC DECISION with two victims

Both reproduced exactly as recorded, and both are the **absence of the `pointerdown` latch** on
controls § 5 never put inside « **pinned + x** : … tant que le champ `x` a le focus » — the strip's
two layer toggles, « ×1 » and the pinned header's chevron. Widening the latch re-reads that sentence
as « tant qu'un contrôle de la rangée est pressé » **and** obliges inventing a release rule
(`pointerup` + `pointercancel` + `lostpointercapture`), since a latch that never clears is stuck-open
on a platform where buttons take no focus. Options **(i)–(iv)** and their costs are in the pass above;
nothing was changed in `view-strip.tsx`, `shell.tsx` or `collapse.ts` for either.

### Skipped — defect 4, the 32 px controls

Reproduced (table above), and it needs **no pointer emulation to be true**: the only
`@media (pointer: coarse)` rule in the app is the rider's `stroke-width` in `src/styles.css`, so the
strip's `h-8` controls are 32 px on **every** pointer type. It stays § 5's call, and the reason is
that the repair is a *design* choice with at least three shapes — grow the controls to `h-11` and the
44 px row has no padding left; keep the 32 px visual and expand only the hit box, the way § 5's own
touch section does it for the rider's transparent stroke; or restate the sentence « The row is 44 px
tall, so every control in it is a legal touch target ». Worth recording for whoever takes it: § 5's
abbreviation arithmetic budgets **44 px of width for « ×1 »** (`59 + 48 + 44 + 128 + 24 = 303`), and
the shipped control is **29,8** — so the width is a spec number missed, while the height is a spec
*inference* that the shipped tree does not support. Fixing one without the other buys nothing: a
44 × 32 control is still not a legal touch target.

### Gates — on the tree as fixed

```
$ bunx oxfmt --write src/components/app/shell.tsx src/lib/layout/collapse.ts src/lib/layout/contract.test.ts
Finished in 136ms on 3 files using 32 threads.     # class list re-sorted by the formatter, hence the
                                                   # two-token form of the new assertion

$ bun run typecheck          # tsc --noEmit
exit=0   (no output)

$ bun run lint-type-aware    # oxlint --type-aware --type-check
exit=0   (no output)

$ bun run test               # vitest run
 Test Files  39 passed (39)
      Tests  1288 passed (1288)     # 1268 + the new guard's suite
 Duration  1.12s
```

Three files touched: `src/components/app/shell.tsx` (the property plus its comment),
`src/lib/layout/collapse.ts` (doc only, on `CENTRE_IN_RAIL`), `src/lib/layout/contract.test.ts` (the
guard). `src/routes/-prototype-07/**` untouched, no commit made.

### Status stays `claimed`

Item 2 is still not satisfied as written: under the `--kb` fallback the **focus-then-keyboard**
ordering still leaves the field behind the keyboard, and closing it is the § 5 decision above.
Everything else in the pass stands, and defects 2, 3 and 4 remain open spec questions, unpatched.

## Re-verification — 2026-08-14, independent re-verifier, read-only on `src/**`

Same host, fresh session: Linux desktop **headless Chrome `HeadlessChrome/151.0.0.0`**
(`Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.0.0
Safari/537.36`), `agent-browser 0.34.0`, session `scoutech-t35-re`, `devicePixelRatio 1`, dev server
already up (`curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` → **200**). Every
viewport was set with `set viewport` and **read back** from `innerWidth`/`innerHeight` before any
number below. Still no soft keyboard, no real finger, no iOS: the method tags are unchanged —
**[OVERRIDE]** (getter override of `visualViewport.height`/`offsetTop` + synthetic `resize`+`scroll`),
**[RESIZE]** (`set viewport`), **[CDP]** (`Emulation.setTouchEmulationEnabled { maxTouchPoints: 5 }`
plus `Input.dispatchTouchEvent`, driven over the browser websocket from `get cdp-url`). Fine-pointer
presses are `agent-browser mouse move/down/up`.

**Layout moved under this ticket since the browser run above, and it is not this fix's doing.**
Another fix in the same run landed § 5's banner budget as a function of the chart column's width, so
at a 390 px column the banner slot is now **76 px** (`BANNER.threeLines`) instead of 44. Every band
below it therefore reads **+32 px** against the earlier numbers: `whole` block **539,6** (was 507,6),
`pinned` **120** (was 88), `pinned-x` **164** (was 132), `compact` unchanged at **44**. Verified
coherent rather than merely different: `--pinned-clearance` equals the rendered block at every state
(`whole` `0px`/539,6 with the Rail at 539,6 · `pinned` **120px**/120 · `pinned-x` **164px**/164) and
the Rail's top equals the block's bottom at each, so § 7's reserve did not fall out of step and there
is no jump. All numbers below are this session's own.

### Defect 1 — the fix is real, and one residual is left

**Repaired leg (focus *under* an inset that is already up).** `aside.scrollTop` reset to 0 before
each focus; `getComputedStyle(aside)` reads `padding-bottom` **and** `scroll-padding-bottom` equal to
`--kb` under the inset, and `0px` / `0px` at rest.

| posture | inset | field | rect | visible bottom | verdict |
| --- | --- | --- | --- | --- | --- |
| 390 × 664 | [OVERRIDE] 336 | `#rail-mp` | y **193,5 – 221,5** | 328 | inside, 106,5 px to spare |
| 390 × 664 | [OVERRIDE] 336 | `#rail-regime`, `#rail-L`, `#rail-DAF`, `#rail-eaOverride`, `#rail-muOverride` | y 193,5 – 222 (all five) | 328 | inside |
| 390 × 844 | [OVERRIDE] 336 | `#rail-mp` · `#rail-L` | y 283,5 – 311,5 · y 279 – 307 | 508 | inside |
| 390 × 844 | [OVERRIDE] 336 | `#rail-xD` (`pinned-x`) | y **403,5 – 431,5** | 508 | inside, 76,5 px to spare |
| 844 × 390 paysage | [OVERRIDE] 240 | `#rail-h` · `#rail-DAF` · `#rail-mp` · `#rail-L` | y **83 – 111** · y 82,5 – 110,5 · idem · idem | 150 | inside |
| 390 × 328 | [RESIZE] | `#rail-mp` | y 193,5 – 221,5, `scroll-padding-bottom` **`0px`** | 328 | inside — the honoured-`resizes-content` half needs no inset |
| 390 × 844, **no keyboard** | — | `#rail-DAF` | y 527,5 – 555,5, field centre **541,5** = Rail centre 482 + 59,5, i.e. half of `scroll-margin-top: 120px` | 844 | unchanged, item 3's relation intact |
| 1440 × 900 desktop | — | `#rail-DAF` | y 435,5 – 463,5, `padding-bottom` / `scroll-padding-bottom` **`0px` / `0px`** | 900 | unchanged |

**Residual, measured here and not in the fix note: `#rail-xD` is the one field the scroll padding
cannot save.** Its `scroll-margin-top` *is* `--pinned-clearance`, **164 px** in `pinned-x`, so its
scroll-margin box is **192 px** — larger than what the inset leaves of the Rail's viewing region, and
`block: 'center'` then centres an oversized box and pushes the field past the fold:

| posture | inset | viewing region | margin box | field rect | visible bottom | past the fold |
| --- | --- | --- | --- | --- | --- | --- |
| 390 × 664, `#rail-xD` | [OVERRIDE] 336 | 164 → 328, **164 px** | 192 | y **313,5 – 341,5** | 328 | **13,5 px** |
| 844 × 390 paysage, `#rail-xD` | [OVERRIDE] 240 | 0 → 150, **150 px** | 192 | y **142,5 – 170,5** | 150 | **20,5 px** |

It is a residual and **not a regression**: forcing `scroll-padding-bottom: 0px` inline on the Rail
(an in-browser experiment, nothing under `src/**` touched) reproduces the pre-fix geometry in the same
two postures — y **481,5 – 509,5** at 390 × 664 (**181,5 px** past 328) and y **262,5 – 290,5** in
landscape (**140,5 px** past 150). So the scroll padding takes 181,5 px of clipping down to 13,5 and
140,5 down to 20,5. Where the region is wider than the margin box the field lands cleanly (390 × 844,
region 344 vs 192 → 76,5 px to spare), which is why the posture and not the field is what decides it.

**Still unfixed, exactly as the fix note says: the device ordering.** Focus first, keyboard second —
`scrollTop` is bit-identical across the inset's arrival, and nothing re-runs the centring:

| posture | field | before the inset | after the inset | visible bottom |
| --- | --- | --- | --- | --- |
| 390 × 664 [OVERRIDE 336] | `#rail-mp` | y 437,5 – 465,5, `scrollTop` **609** | y **361,5 – 389,5**, `scrollTop` **609** | 328 |
| 390 × 844 [OVERRIDE 336] | `#rail-xD` | y 571,5 – 599,5, `scrollTop` **627** | y **571,5 – 599,5**, `scrollTop` **627** | 508 |
| 844 × 390 [OVERRIDE 240] | `#rail-h` | y 203 – 231, `scrollTop` **70** | y **203 – 231**, `scrollTop` **70** | 150 |
| 390 × 664 → **390 × 328** [RESIZE] | `#rail-mp` | y 437,5 – 465,5, `scrollTop` **609** | y **361,5 – 389,5**, `scrollTop` **609**, `--kb` **`0px`**, Rail box 390 × 284 | 328 |

The [RESIZE] row is the useful one: there the box genuinely shrank and `--kb` is `0px`, so the scroll
padding has nothing left to give and only a re-run could move the field. Chrome's own « scroll the
focused editable into view on resize » **did not fire** here on either path. Options (a)/(b) as
recorded — the open § 5 call stands.

### Defects 2, 3 and 4 — all three reproduce unchanged, on **both** pointer types

Driven at **390 × 844** from `pinned-x` (`aside.scrollTop = 0`, `focus #rail-xD`), with a
capture-phase `document` log over `pointerdown`/`touchstart`/`pointerup`/`touchend`/`mousedown`/
`mouseup`/`click`/`focusin`/`focusout`/`lostpointercapture`, every press aimed at a **freshly
measured centre**. Coarse leg [CDP]: `matchMedia('(pointer: coarse)')` **true**,
`navigator.maxTouchPoints` **5**, `.chart-grab` `stroke-width` **22px** (14px fine),
`(hover: hover)` **false** — emulation, not a device.

| # | press | fine pointer (`mouse down`/`up`) | coarse pointer (`Input.dispatchTouchEvent`) |
| --- | --- | --- | --- |
| 2 | « ligne à vide » (48,6 ; 98) | `pointerdown SPAN "à vide"` · `mousedown` · `focusout INPUT#rail-xD` · `pointerup`/`mouseup SPAN "2,48 m"` · **`click: DIV`** — `aria-pressed` stays **`false`**, `pinned-x` → `pinned`: **lost** | `pointerdown`/`touchstart SPAN "à vide"` · `pointerup` · `lostpointercapture` · `touchend` · `mousedown` · `focusout INPUT#rail-xD` · `mouseup SPAN "3,28 m"` · **`click: DIV`** — `aria-pressed` **`false`**: **lost** |
| 2 | « ×1 vraie échelle » (201,8 ; 98) | not re-driven on fine here (the run above records it rescued by the button's own `setPointerCapture`) | `pointerdown`/`touchstart SPAN "×1"` · `pointerup` · `lostpointercapture` · `touchend` · `mousedown` · `focusout INPUT#rail-xD` · `mouseup SPAN "3,28 m"` · **`click: DIV`**, `pinned-x` → `pinned`: **lost** |
| 3 | chevron « Afficher le profil » (356 ; 142) | `pointerdown SPAN "⌄"` · `mousedown` · `focusout INPUT#rail-xD` · `focusin BUTTON "⌄"` · `mouseup SELECT#rail-cst` · **`click: DIV`** — `#profil` `display: none`, state `pinned`: **lost** | identical ordering, **`click: DIV`**, `#profil` `display: none`: **lost** |
| control | the strip's **own** `x` (282,7 ; 98) from `pinned-x` | — | `click: INPUT`, state stays **`pinned-x`**, focus lands in the strip input: the § 5 latch **holds on touch** |
| control | chevron from a **settled** `pinned` (`scrollTop 200`, centre 356 ; 98) | `click: SPAN "⌄"` → **`whole`**, block **539,6**, `#profil` `display: block`, focus `DIV#profil`: **works** | identical: **works** |

**Defect 4, re-measured under the matched coarse pointer** — row `390 × 44` at **y 76**; « à vide »
**49,3 × 32**, « corde » **48 × 32**, « ×1 » **29,8 × 32**, the `x` input **64 × 32**,
`getComputedStyle().height` **`32px`** on all four and `width` **`29,7656px`** on « ×1 ». And the
reason the pointer type is irrelevant, confirmed out of `document.styleSheets` rather than from the
source: over **420 rules / 100 186 characters** of loaded CSS there is **exactly one**
`@media (pointer: coarse)` rule — `.chart-grab { stroke-width: 22px; }` — so `h-8` is 32 px on every
pointer type.

All three remain the two **OPEN SPEC DECISIONS** recorded above (the `pinned + x` latch scope, the
row's control size). Nothing was patched, and nothing should have been.

### Nothing adjacent broke

- **§ 7's jump primitive**, which shares `CENTRE_IN_RAIL`, **inherits the fix**: at 390 × 844 under
  [OVERRIDE] 336, pressing « Choisir un régime » in the compact banner row lands `#rail-regime` at
  y **212,5 – 240,5** against a visible bottom of **508**, focus on `SELECT#rail-regime`.
- **No smooth-scroll race** (item 3 re-run): `focus #rail-DAF` at 390 × 844, `scrollTop` **591** read
  synchronously and again at +2 frames, +50 ms, +300 ms and +800 ms — five identical samples;
  `scroll-behavior` computes **`auto`** on the Rail, on `documentElement` and on `body`.
- **The no-keyboard and desktop legs are untouched** — `scroll-padding-bottom` **`0px`** at rest at
  390 × 844, at 390 × 328 [RESIZE] and at 1440 × 900, and the centring relation is item 3's to the
  pixel.
- **Item 1's formula is still both-termed** [OVERRIDE] at 390 × 844: at rest `--kb` **`0px`** /
  `whole`; `vv.height` 508 → **`336px`** / `compact`; `vv.height` 508 **and** `offsetTop` 100 →
  **`236px`**; `offsetTop` 150 alone → **`0px`** / `whole`. `--kb` now drives **both** the Rail's
  `padding-bottom` and its `scroll-padding-bottom` in every row. On [RESIZE] 390 × 508: `--kb`
  **`0px`**, state `pinned`, `fit` `tight`, block 120.
- **The dismissal legs still restore from the current constraints**, with the Rail's top equal to the
  block's bottom at every step (no jump): Rail scrolled 611 and nothing focused → **`pinned` ·
  `roomy`**, block 120, `padding-bottom` back to **`0px`**; `#rail-L` holding the caret → **`pinned` ·
  `roomy`**, `active INPUT#rail-L` (trigger (b) alone); blur + Rail to top → **`whole` · `roomy`**,
  block 539,6, `#profil` `display: block`; landscape 844 × 390 → **`compact` · `tight`** before *and*
  after the inset drops, i.e. the height constraint outlives the keyboard.
- **Item 4 re-driven**: `#rail-xD` focused, then [OVERRIDE] 336 at 390 × 844 → `pinned-x` · `tight`,
  block **164**, `--pinned-clearance` **`164px`**, View Strip `display: flex` at **390 × 44, y 76**
  (bottom 120, far above the 508 fold), live cell « Garde min 2,48 m » at y 120 – 164; real key events
  (`press Control+a`, `keyboard type "120"`) move it **live** to « Garde min (à x 117,2 m) 4,20 m »
  with the strip's own `x` following to **120,0**, `--kb` still `336px`, state still `pinned-x`.
- **Item 5 re-driven**: `Enter` on `#rail-xD` under the inset commits and normalises to **`120,0`**,
  `activeElement` → **`BODY`**, live cell retained, state `pinned-x` → **`compact`**; on the strip's
  own `x`, `42,5` stayed a **draft** (live cell unchanged) until `Enter` committed it (`#rail-xD` →
  `42,5`, live cell « Garde min 3,28 m »), blurred to `BODY`, state → `compact`.
- **Item 6 re-driven**: 390 × 844 `whole` / block 539,6 at rest → `compact` / block 44 with **464 px**
  of usable Rail; 390 × 664 `whole` / block 539,6 → `compact` / block 44 with **284 px**
  (`664 − 336 − 44`); 844 × 390 **`compact` · `tight`** already at rest, Rail **beside** at 288 × 390
  with **150 px** visible under a 240 px inset. A rotation round-trip with the keyboard up
  (390 × 844 → 844 × 390 → 390 × 844) returns **`pinned-x` both ways**, keeps `INPUT#rail-xD`
  focused, keeps the strip (390 × 44 at y 76 · 556 × 44 at x 288, y 60 — the landscape column's own
  two-line banner) and the Rail's `padding-bottom` follows the posture (336 / 240 / 336). **Zero**
  `(orientation…)` rules over the 420 loaded rules, and `/pivot|rotat|tourner|paysage/i` finds
  nothing in `document.body.innerText`. Limitation unchanged: `screen.orientation.type` reads
  `landscape-primary` at **every** viewport here.

### Not observable on this host — unchanged, and not converted into measurements

A real soft keyboard; whether `interactive-widget=resizes-content` is honoured (markup verified,
behaviour is Safari's); whether a real mobile browser's own focus-into-view-on-resize would mask
defect 1's remaining leg; a real finger (`(hover: hover)` stays false under [CDP] emulation and the
override dies with the websocket); and `screen.orientation`.

### Gates — re-run by the re-verifier, not taken on trust

```
$ bun run typecheck          # tsc --noEmit
exit=0   (no output)

$ bun run lint-type-aware    # oxlint --type-aware --type-check
exit=0   (no output)

$ bun run test               # vitest run
 Test Files  39 passed (39)
      Tests  1288 passed (1288)
 Duration  1.15s

$ bunx vitest run src/lib/layout/contract.test.ts
 Test Files  1 passed (1)
      Tests  87 passed (87)     # includes « the Rail spends `--kb` twice … »
```

No `oxfmt` run: this re-verification is **read-only on `src/**`** and this ticket file is in
`.oxfmtrc.json`'s `ignorePatterns`. `src/routes/-prototype-07/**` untouched. No commit made.

### Status stays `claimed`

Item 2 is the only outstanding one, and it is now outstanding for **two** reasons rather than one:
the **focus-then-keyboard ordering** (unchanged — § 5's open call, options (a)/(b) above) and the
**`#rail-xD` residual** (its `scroll-margin-top` reserve exceeds the Rail's remaining viewing region
at 390 × 664 and in landscape). Both are § 5 questions about how far the centring may reach, not
build work, so they are named and left. The other six items hold on this tree with the measurements
above, and defects 2, 3 and 4 stand as the two spec decisions they always were.

---

## Independent verification — finding 5, decision 5 is recorded as taken — 2026-08-15, session `closeverify`

**Role: verifier, read-only on `src/**`.** No source file written, no `Status:` line moved, no commit;
`src/routes/-prototype-07/**` and `src/routes/prototype.profile-view.tsx` untouched; ticket 36 out of
scope. Host as elsewhere: `HeadlessChrome/151.0.0.0`, `devicePixelRatio 1`, `agent-browser 0.34.0`,
the **shared dev server reused and left running** (`curl` → **200**), viewport **read back** from
`innerWidth`/`innerHeight` before any number.

**What was owed.** The § 5 question above tabled three candidates — (α) 16 px, (β) `maximum-scale=1`,
(γ) accept it explicitly — with « none of them taken here », and stated « every Rail field computes to
12 px » and « **26 of 27** `input`/`select` under 16 px » as present fact. The code had already taken
(α). The gap was the record, not the tree.

**What the ticket now says, checked against the tree.** The « **Mise à jour — décision 5 du
propriétaire, 2026-08-14** » section immediately below the three candidates:

| owed | present | verified against the running app |
| --- | --- | --- |
| (α) marked chosen **and shipped** | yes — « c'est (α), et elle est livrée », `text-base` in `NumericInput` | **15 / 15** Rail numeric fields compute **16 px**, border box **80 × 28** |
| (β) and (γ) marked rejected, with reasons | yes — (β) takes page zoom from whoever needs it to read a chart; (γ) rejected too | — |
| the old figures marked **pre-change** | yes — « Les chiffres du paragraphe ci-dessus sont *d'avant* le changement », naming « 12 px » and « 26 of 27 » explicitly | the tree reads **10 of 26** under 16 px, so the old count is indeed stale and is labelled as such |
| the residual named | yes, in two kinds | **(i)** the View Strip's « x » measured at **11 px** (`type="text"`, value « 75,0 »), the only form control outside the Rail; **(ii)** **six `select` at 12 px** — `rail-regime`, `rail-r0`, `rail-cst`, `rail-ta`, `rail-tb` and the class picker — plus **four `radio`**, with the `select` zoom behaviour marked **named, not measured** |
| the gate itself unmoved | yes — « La porte elle-même ne bouge pas » | `keyboardInsetOf` still returns 0 whenever `scale !== 1`; nothing in `use-viewport.ts` moved except prose |
| no sixth decision taken | yes — « Étendre les 16 px à `Picker`/`Choice` n'est pas fait ici » | no `Picker` / `Choice` font size changed; the six `select` are still 12 px |
| the (a)/(b) ordering question left open | yes — « reste ouverte » | untouched by this leg |

**No claim in the update exceeds what the code delivers**, and the counts it prints are the ones the
live app reports. The residual is honest in the direction that matters: it says the trigger is
**reduced, not eliminated**, and names `rail-regime` — the control § 7's first-run banner pushes a
user toward — as a 12 px `select` that may still zoom.

### Gates, real output

```
$ bun run typecheck            # tsc --noEmit
$ tsc --noEmit
exit=0                         (no other output)

$ bun run lint-type-aware      # oxlint --type-aware --type-check
$ oxlint --type-aware --type-check
exit=0                         (no other output)

$ bun run test                 # vitest run
 RUN  v4.1.10 /home/bastien/lab/perso/scoutech
 Test Files  40 passed (40)
      Tests  1331 passed (1331)
   Duration  1.18s
```

No `oxfmt`: this leg wrote no source file, and Markdown is in `.oxfmtrc.json`'s `ignorePatterns`.
