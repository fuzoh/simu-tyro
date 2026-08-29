# 31 — Verify shell and suppressed-output states in browser

**What to build:** Exercise four screen states unit suite intentionally cannot see: server Skeleton, whole-link refusal, mid-edit stale Sweep, and committed-invalid suppression. Each walkthrough ends in visible state and transport behavior matching product contract.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Server frame shows five Rail headings, both chart frames, five labelled read-out cells, and reserved banner space, with no control, value, or « — ».
- [x] Skeleton transitions to live app without hydration warning or desktop-to-narrow tree jump.
- [x] Refused link resolves after Skeleton on index route at HTTP 200 and keeps route-level recovery action.
- [x] Unknown path returns 404 instead of silently redirecting to First-Run Scenario.
- [x] « Saisie en cours » keeps last valid Sweep visibly marked, freezes chart, disables scrubbing and link copy, and suspends URL/Session writes.
- [x] Blurring an empty required field changes to « Aucun résultat », removes stale output values, and leaves scrub track with axes **and live**. — **item reworded and closed 2026-08-15** by [amendment J](../AMENDMENTS.md): the owner read § 7 as keeping the track live in this state, because the geometry is still valid and `x` selects a *view*. Inertness is scoped to **L'exception géométrique** (structural) and « Saisie en cours » (transient), both of which the app already implements. **No code changed — the spec's two headings did.** Voir **D1** and **F1** under ## Comments.
- [x] Browser procedure records assertions and can be repeated without component-test infrastructure.
- [x] Any defect fixed during walkthrough receives regression coverage at pure seam where expressible. — the fix phase below: **D3** is fixed at `fitsWholeBlock`'s own seam with two `node` cases in `src/lib/layout/collapse.test.ts`; **D2** is a layout fact and carries a browser procedure instead (amendment B); **D1** was escalated rather than legislated and the owner **ruled it not a defect** ([amendment J](../AMENDMENTS.md)) — the live track is the specified behaviour, so there is nothing to regress against. The **second** § 7 reading this ticket left open — a scrub writing an unrounded float into the URL — *was* a defect, and it is fixed at the display-precision seam (`roundToDisplay("x_D", …)` in `scrub()`). Voir **## Comments → Phase correctifs** and **F1**.

## Comments

**Environment.** `agent-browser` session `scoutech-t31`, HeadlessChrome **151.0.0.0** (`navigator.userAgentData.brands` → Chromium 151), Linux x86_64. Viewports **measured** after `set viewport`, never assumed: `innerWidth`/`innerHeight` read **1440 × 900** and **390 × 844**. `navigator.maxTouchPoints` 0 and `matchMedia('(pointer: coarse)')` false throughout — no coarse pointer on this host (ticket 27's finding, re-read, not re-litigated). Dev server at `http://localhost:3000`. **HTTP statuses come from `curl -s -o /dev/null -w '%{http_code}'`, never from the rendered page.**

**One host event worth recording:** the orchestrator's dev server **died mid-run** (`ERR_CONNECTION_REFUSED`, no `vite` process, preceded by `[vite] server connection lost` in the page console). Every measurement below was taken against a live server, and the load-bearing ones (the six status codes, the mid-edit suspension table, the three gates) were **re-taken after** a fresh `bun run dev` was started in the background. That server is **left running** — other browser agents are pointed at the same port, and stopping it would break them.

### Item 1 — the server frame, read from the wire

`curl -s http://localhost:3000/ > index.html`, then the `<body>`'s pre-hydration frame (up to the first `<script>`, comments stripped) parsed and enumerated:

| Asserted | Observed |
| --- | --- |
| which tags exist at all | `aside`, `div`, `h2`×5, `header`, `noscript`, `section`×5, `span`×6 — **and nothing else** |
| every text node, in document order | `Scoutech` · `Paramètres` · `Valeurs déduites` · `Résultats` · `Provenance` · `Ce que cet outil ne calcule pas` · `Ce simulateur nécessite JavaScript pour fonctionner.` · `Garde min` · `T anc. A` · `T anc. B` · `Pente` · `Flèche` — **12 nodes: the app's name, the five headings in § 7's order, the five cell labels** |
| no control | `<button>` 0, `<input>` 0, `<select>` 0, `<textarea>` 0, `<a ` 0, `<svg>` 0, `role="button"` 0, `contenteditable` 0, `tabindex="0"` 0 (the only `tabindex` is `-1`, on the profile group) |
| no value, no « — » | **zero digits** anywhere in the frame's text; `—` and `–` absent from it entirely (the one `—` in the response is the `<title>`'s) |
| banner space reserved, nothing drawn | the `min-h-[var(--banner)]` div at 390 px: `44 × 390`, `children 0`, `textContent ""`, `background-color rgba(0, 0, 0, 0)`, `border-top`/`border-bottom` `0px`, `box-shadow none` |
| both chart frames at the spine's proportions | served `style` carries `--profile-plot: calc(0.42 * var(--w-inner))` and `--strip: clamp(96px, calc(0.16 * var(--w-inner)), 200px)`; **measured** in a browser with hydration blocked (below): plot aspect **0.420** at both widths, strip **96 px** at 390 and **177 px** at 1440 |
| `aria-busy`, no live region, no spinner | `aria-busy="true"` once, `aria-live` 0, no sentence and no spinner element |
| the `<noscript>` line | « Ce simulateur nécessite JavaScript pour fonctionner. » |

`curl -s "http://localhost:3000/?v=3"` ships a **byte-identical** frame — `diff` of the two `<body>`-to-first-`<script>` slices is empty. The refusal is a client render, exactly as amendment E leaves it.

### Item 2 — Skeleton → live, no warning and no tree jump

**No hydration warning.** `console --clear`, `open /`, `wait --text "Copier le lien"`, then `console` and `errors`, at **1440 × 900** and at **390 × 844**. Both times the page's own log is three lines — `[vite] connecting…`, `[vite] connected.`, the React DevTools `[info]` — and `errors` is empty.

> **Read this before trusting a console in this repo.** The vite dev client **echoes the dev server's log back into every page**, so a hydration failure raised in *another* agent's tab arrives in mine prefixed `[Server] … [vite] (client) [console.error]`. One such entry is real and is **not this app's**: React's « Hydration failed because the server rendered text didn't match the client » on `/prototype/profile-view` (`<PrototypePage>` → `<VariantD>`, `src/routes/-prototype-07/variant-d.tsx`), diverging on SVG float coordinates. Out of scope here — prototype, ticket 36 — left untouched, and flagged only because tickets 29–30 drive that route. The assertion above is over console entries **without** the `[Server]` prefix.

**No desktop-to-narrow tree jump, measured rather than argued.** `network route "**tanstack-start-dev-client-entry**" --abort` freezes the served frame in a real browser (confirmed: `aria-busy="true"` still on the root, 0 controls), so the **pre-hydration** layout can be measured and compared against the hydrated one:

| | Skeleton, hydration aborted | Live app |
| --- | --- | --- |
| 390 × 844 | chart column `y 0, h 508` · Rail **below it**, `y 508, h 336` | chart column `y 0, h 508` · Rail `y 508, h 336` |
| 1440 × 900 | Rail **beside**, `x 0, w 288` · chart `x 288, w 1152` · plot `1104 × 464` (aspect 0.420) · strip `h 177` | Rail `x 0, w 288` · chart `x 288, w 1152` · plot `1104 × 464` (0.420) · strip `h 177` |

The server frame is already narrow at 390 and already desktop at 1440, and hydration moves nothing — the reflow is CSS-only, as ticket 27's « one tree » note claims. `.grid-cols-5` keeps its own height across the transition too: 52 px at 1440, 104 px at 390.

*One honest caveat, and it is not a jump of this kind:* on a **partial link** the hydrated tree adds § 8's absent-keys strip (85 px) above the shell, which the Skeleton does not reserve. That is state-derived, not width-derived, and nothing in § 7 asks the Skeleton to reserve it — but it has a consequence, **D3**.

### Items 3 and 4 — the refusal at 200, and the 404

`curl` statuses, all six re-taken on the restarted server:

```
/                 200        /unknown-path   404
/?v=3             200        /nouveau        404
/?fl=6&te=1200    200        /?L=250         200
/?tr=zzz          200
```

Rendered refusal at 1440 × 900, `document.body.innerText`, and § 8's four reason lines each from its own URL:

| URL | Body |
| --- | --- |
| `/?v=3` | `Scoutech` / « Ce lien ne peut pas être ouvert. » / « Version de schéma inconnue (v = 3). » / « Ouvrir l'application sans ce lien » |
| `/?fl=6&te=1200` | … / « Flèche, prétension et longueur non tendue : deux valeurs de tension dans le même lien. » |
| `/?tr=zzz` | … / « Tracé illisible. » |
| `/?tr=p1.` + 3000 chars | … / « Tracé trop volumineux pour cette adresse. » |

It is the **index** route's surface inside the shell, not the root's: `aside h2` count **0** — the five sections are suppressed — while the Rail Header's « Scoutech » stands, `role="alert"` on the copy block, and the address bar still reads `?v=3`, i.e. **no `refused` key leaked into the URL** (probe 6's middleware doing its job). The recovery action is route-level and behaves as `<Link to="/" search={{}} replace>`: pressing it left `history.length` at **3** (unchanged ⇒ `replace`), rewrote the URL to `http://localhost:3000/`, brought the five Rail sections back, and painted the First-Run Scenario — `Portée 150,0`, `Garde min 2,48 m`, `T anc. A 817,1 daN`, `T anc. B 793,5 daN`, `Pente -19,4 %`, `Flèche 7,48 m`.

The 404 is a real 404 and lands on **nothing**: `/unknown-path` → status **404**, `innerText` « Page introuvable. | Ouvrir le simulateur », `[data-collapse]` **absent**, `aside h2` **0**, URL still `/unknown-path`. No shell, no Skeleton, no First-Run Scenario, no redirect.

### Item 5 — « Saisie en cours », five claims and five measurements

Procedure at 1440 × 900, Session cleared first so the run starts from the First-Run Scenario:

```
agent-browser --session scoutech-t31 eval "localStorage.removeItem('scoutech:session:v1')"
agent-browser --session scoutech-t31 open http://localhost:3000/
agent-browser --session scoutech-t31 fill "#rail-L" "160,0"      # A — a valid commit
agent-browser --session scoutech-t31 press Control+a
agent-browser --session scoutech-t31 press Delete                # B — empty, caret still in the field
```

`fill` leaves the caret in the field (`document.activeElement.id === "rail-L"` asserted at A, at B and 4 s later), which is what makes the state reachable at all — `saisieEnCours` keys on the caret.

| | A: `L = 160,0` committed | B: mid-edit, +1 s | C: mid-edit, **+4 s** |
| --- | --- | --- | --- |
| banner | « Choisissez un régime de sécurité… » | « **Saisie en cours — ces valeurs correspondent à Portée 160,0 m.** » | idem |
| five cells | 2,42 m · 871,2 daN · 847,6 daN · -18,9 % · 7,57 m | **identical** | **identical** |
| chart geometry, hash of every `path[d]` | `-1956691961`, length 11558 | `-1956691961`, 11558 | `-1956691961`, 11558 |
| every SVG's computed `opacity` | min 1 | **min 1** — frozen, *not* dimmed | min 1 |
| « Copier le lien » | enabled, no title | **`disabled`**, `title` « Complétez les champs vides pour partager ce lien. » | idem |
| URL | `?v=1&…&L=160&…&x=75` | **unchanged** | **unchanged** |
| Session, hash of the stored JSON | `77564682`, `geometry.L 160` | **`77564682`** | **`77564682`** |

C is **4 s** after the field emptied — 10× `URL_WRITE_DEBOUNCE_MS` (400) and 4× `SESSION_WRITE_DEBOUNCE_MS` (1000) — so « suspended » is measured rather than inferred from a race. The same edit *committed* does write both: A moved the URL to `L=160` and `geometry.L` to 160 within 2 s. Screenshot `saisie-en-cours.png` (1440 × 900) shows the empty `Portée` under its « valeur requise », a full-strength chart, five live cells, and the greyed copy button.

**Scrubbing inert — pointer path measured, typed path structurally unreachable.**

*Control, same coordinates, valid field:* `mouse move 533 672` (inside the clearance strip, box `x 288 y 584 1152 × 177`) then `down`, `up` moved the rider **75,0 → 27,6 m** and wrote `x=27.560010932823186`. The coordinates do scrub.

*Mid-edit:* rider reset to 75,0, `L` emptied with the caret inside, then `move 533 672 · down · move 700 672 · up`. After it: `#rail-xD` **75,0**, URL **`x=75`**, `scenario.rider.xD` in the Session **75**. The pointer press is dispatched before the blur takes effect, so the guard is genuinely exercised and it holds.

*The typed `x` cannot be reached through the app's own focus rules,* and that is a property of the rule rather than a hole in the test: « Saisie en cours » fires only while the caret is **in the empty field**, so focusing the View Strip's `x` — or the Rail's « Position du passager » — ends the state before a keystroke can land. Both paths funnel through the one `moveRider` guard in `chart-block.tsx`, which the pointer case above exercises. Recorded as **not observable**, not as a measured pass.

### Item 6 — « Aucun résultat »: the state holds, the track does not

Two entries walked: **blurring an empty required field** (`focus #rail-mp` → `Control+a` → `Delete` → `Tab`) and **committing an invalid value** (`fill #rail-L "-5"` → `Tab`). Plus the link form of the same state, `/?mp=-5`, which needs no keystroke and is the shortest repro.

| Asserted | Observed |
| --- | --- |
| banner | « ⛔ 1 erreur bloquante — aucun résultat » + « voir la première » |
| § 7's **three echoes** | the cell row, `RÉSULTATS` and `VALEURS DÉDUITES` all read « Aucun résultat — masse du passager : valeur requise. » (resp. « … — portée : valeur requise. » and « … — portée invalide. ») |
| stale values gone | none of `2,42` / `871,2` / `847,6` / `7,57` / `-18,9` survives anywhere in `document.body.innerText`; `RÉSULTATS` is the cause sentence and nothing else |
| the row keeps its height | `.grid-cols-5` **52 px** at 1440 and **104 px** at 390 — the same as before the breach, so nothing jumps |
| the invalid field | `aria-invalid="true"` on `#rail-L` for the committed `-5`; URL and Session keep the **last valid** `L=160`, so an invalid value is never published |
| inputs still draw | the profile keeps 1 `path` (terrain), 6 `line`s (anchors + span markers) and 8 `text`s; cable, clearance curve and rider marker are gone |
| axes stay | the strip keeps its baseline `line`, its `0` tick and its label; the profile keeps `0 / 40 / 80 / 120 / 160 m` and `A` / `B` |
| geometric exception, correctly scoped | with **`L`** invalid both plots collapse to an empty frame with **zero `text` nodes** and carry « Portée invalide — aucun tracé possible. » (twice, one per plot) — and only for `L`: the `mp` breach keeps both sets of axes |
| **the track is inert** | ✗ **no** — voir **D1** |

### D1 — the « Aucun résultat » scrub track is live, and it rewrites the URL

`inert` reaches the Chart Block as `saisie !== null` (`src/components/app/app.tsx:169`), so it is **off** in every committed-invalid state. Measured at 1440 × 900 on `/?mp=-5`, with « Aucun résultat — masse du passager invalide. » on screen: `mouse move 533 672 · down · move 640 672 · up` moved the rider **75,0 → 44,3 m**, the View Strip's `x` followed, and the URL was rewritten to `…&x=44.28985507246377`. The strip even keeps inviting it — its axis label still reads « glisser pour déplacer ».

§ 7 titles the state « … et **la seule piste de scrub inerte** », and « Saisie en cours » calls itself « the app's **second** inert scrub track », so the first one is this. **Expressible at a pure seam:** `inert` is a predicate over the standing `GateReport` and `saisie`, so it belongs beside `suppression()` in `src/lib/app/suppression.ts` — a `scrub` flag on `Suppression`, or a `scrubInert(report, saisie)` — with `app.tsx` reading it instead of computing it. Node-unit-testable, no router and no DOM in the room.

### D2 — the cause line is painted **over** the five cell labels, not in place of them

§ 7: the five cells « sont **remplacées par une seule ligne** qui occupe la rangée ». `src/components/chart/chart-block.tsx` — both the main path (`values === null && solved === null`) and `EmptyBands` — renders `READ_OUT_CELLS`' five labels **and** an `absolute inset-0` `<p>` with **no background** over them. Where the chart column is ≥ 600 px the row is one 52 px line, so label and sentence are centred in the same place: measured on `/?mp=-5` at 1440 × 900, « Garde min » occupies `x 300, y 907, 206 × 17` and the cause sentence's text box `x 300, y 907, 262 × 15` — **206 × 15 px of overlap**, and the screenshot reads « Àucdemrésultat — masse du passager invalide. ». The other four labels stand beside the sentence. Below 600 px the row is 104 px and the sentence lands in the gap between the two label rows, so there the labels merely fail to be *replaced*. Not a Vitest case — it is a layout fact — and the fix is at the render seam.

### D3 — with a link that omits keys, the read-out cells are clipped out of the viewport

`/?L=250` at 1440 × 900, nothing focused, `data-collapse="whole"` and **`data-fit="roomy"`**: § 8's absent-keys strip (« Champs absents du lien, complétés depuis le scénario par défaut : … ») takes **85 px** at the top of the shell, the Chart Block gets 815 px instead of 900, and `.grid-cols-5` lands at `y 889` with `bottom 941` — **21 % of it inside the viewport**, the rest cut by the shell's `overflow-hidden`. The clipped cell is « Garde min 1,31 m », the one § 5 calls non-negotiable. Same at `/?mp=-5` (`y 889`, 21 %); a bare `/` has no strip and the row sits at `y 804`, fully visible. Ticket 28's `availableHeight` / `fitsWholeBlock` are computed from the viewport and `--kb` alone, so a shell band **above** the two columns is unmodelled — **pure-seam expressible** once that height is an input (`fitsWholeBlock({ height, kb, chrome })`), in `src/lib/layout/collapse.ts` rather than on any surface this ticket names.

### Left open for the user — a § 7 reading, not a build decision

**`x_D` reaches the URL as an unrounded float.** A pointer scrub writes `x=27.560010932823186` / `x=44.28985507246377` while the field displays `27,6` / `44,3`. § 7's *Precision — refuse the trade, and round earlier* says « **a prefill writes the *displayed* value into state, never the underlying float** … serialisation is then verbatim », and it names the tightness switch and « Recalculer » as the only inputs that are not typed. A scrub is a third one, and the rule does not say which side of the line it falls on. Options: (a) treat a scrub as a prefill, so display precision (`x_D`, one decimal) enters state — cheap, and keeps sender and recipient identical; (b) leave it verbatim and accept 17-digit addresses — costs URL length, and two links to the same visible position differ; (c) round at serialisation for `x` alone — contradicts « round earlier » in as many words. **Not decided here**, and it belongs on a map rather than in a build ticket.

**And one thing the spec already answers, recorded so nobody re-opens it as a bug:** under « Aucun résultat » `VALEURS DÉDUITES` still shows `Corde 161,01 m`, computed from the last committed `L`. § 7's own echo sketch lists « corde · w (**présents** — indépendants de la résolution) », so that is the specified rendering, not a stale number that escaped.

### Repeatability — item 7

Every assertion above is a `curl` line, an `agent-browser` command, or an `eval` over the live DOM. No jsdom, no Testing Library, no component-test infrastructure, and nothing that needs a build. The four probes used are plain `eval --stdin` heredocs — the frame's boxes, the mid-edit table, the suppression echoes, the scrub coordinates — each reconstructible from the tables above. Order matters in exactly two places: `network route … --abort` **before** `open` for the pre-hydration measurements, and `fill` **before** `press Control+a`/`Delete` so the caret never leaves the field.

### Gates — run, and green

```
$ bun run typecheck          # tsc --noEmit
exit=0                       (no output)

$ bun run lint-type-aware    # oxlint --type-aware --type-check
exit=0                       (no output)

$ bun run test               # vitest run
 Test Files  39 passed (39)
      Tests  1268 passed (1268)
```

No `src/**` file was touched — this was a read-only walkthrough — so no `oxfmt` run was owed; this ticket file is markdown, which `.oxfmtrc.json` ignores.

### Status — au terme de la marche (lecture seule)

**Left `claimed`.** Outstanding: **item 6**'s inertness (**D1**) and, with it, **item 8** — a fix and its pure-seam regression case belong to the serialized phase that follows, not to this walkthrough. **D2** and **D3** are reported for the same phase; D3's seam is ticket 28's module rather than anything item 6 names.

### Phase correctifs — D2 et D3 corrigés, D1 remonté comme lecture de § 7

**Environment.** `agent-browser` session `scoutech-fix31`, HeadlessChrome **151.0.0.0** (`navigator.userAgent`), Linux x86_64, same dev server on `:3000` (left running). Viewports **measured** after `set viewport`: `innerWidth`/`innerHeight` read **1440 × 900**, **390 × 844** and **390 × 400**. `localStorage.clear()` between runs where a previous scenario would have been restored — one measurement was taken on a polluted Session before that and is not reported.

**All three defects were reproduced first, on the tree as it stood** (tickets 27 and 28 already landed):

| | Reproduced | Verdict |
| --- | --- | --- |
| **D1** | `/?mp=-5`, `mouse move 533 672 · down · move 640 672 · up` → `#rail-xD` **75,0 → 41,5**, then `?…&x=41.52173913043479` after the 400 ms debounce | **skipped** — a § 7 reading, voir **F1** |
| **D2** | `.grid-cols-5` at 1440: « Garde min » `x 300 y 907 206 × 17` against the cause box `x 300 y 907 262 × 15` | **fixed** |
| **D3** | `/?L=250` at 1440 × 900: strip **85 px**, chart column **815**, cells row `y 889 / bottom 941` against `innerHeight 900`, `data-fit="roomy"` | **fixed** |

#### D2 — la ligne de cause occupe la rangée au lieu d'être peinte par-dessus

**Seam.** `ReadOutCell`'s `label` is now optional (`src/components/app/shell.tsx`), and both of `chart-block.tsx`'s paths — the main one and `EmptyBands`' geometric exception — pass **no label at all** while § 7's cause line stands. **The five boxes stay**, because they are what gives the row its height in each of its four shapes (52 px in one grid row, 104 in two, `PINNED_CELL` pinned, the shared row in `compact`), and « en gardant la hauteur de la rangée » is the other half of the same sentence. The `<p>` keeps its `absolute inset-0`, so § 5's own chevron keeps sitting *above* it — ticket 27 item 4's hit test, re-run below, is exactly what a re-layout of that row would have broken.

Not a Vitest case: which text box lands on which is a layout fact, so the check is this procedure (amendment B).

| Asserted, 1440 × 900 on `/?mp=-5`, strip dismissed | Observed |
| --- | --- |
| the five cells carry **no text** | `[...row.children].filter(DIV).map(textContent)` → `["", "", "", "", ""]` |
| the row keeps its height and its place | `52 px`, `y 804 / bottom 856` — the same row box as the first-run screen |
| the sentence is the row's only copy | `row.textContent` → « Aucun résultat — masse du passager invalide.⌄à la position du passagerà la position » (the chevron glyph and § 5's scope label, both `absolute`) |
| no overlap left | cause text box `x 300 y 822 262 × 15`; scope label above it, nothing at `y 822` but the sentence |
| **390 × 844**: the two-row band does not jump | row **104 px**, `y 636 / bottom 740`, cells `["","","","",""]`, cause box `x 12 y 680 262 × 15` |
| **pinned** (rail scrolled to 200) | row **44 px** at `y 277`, cause line `checkVisibility()` true, chevron **44 × 44** at `x 334 y 277`, and `elementFromPoint` at its centre → the chevron's own glyph, `closest('button') === ` the chevron. Ticket 27's assertion holds. |
| the geometric exception, same treatment | `/?L=-5` at 1440: cells `["","","","",""]`, row **44 px** (pinned by the strip), « Aucun résultat — portée invalide. » alone; both plots still read « Portée invalide — aucun tracé possible. » |
| the pre-measurement frame is **untouched** | `curl -s http://localhost:3000/` → « Garde min », « T anc. A », « T anc. B », « Pente », « Flèche » each **exactly once**, and the only `—` in the response is still the `<title>`'s |

**One consequence a reviewer should look at deliberately.** In `compact` the cause line is `compact:hidden` (ticket 28's own call: at 133 px of cells it wrapped to three lines, and the banner already carries the state) — so with the labels gone the read-out row there is now **the chevron and nothing else**: measured at 390 × 400, banner slot `x 0 y 201 310 × 44` with « ⛔ 1 erreur bloquante — … [ voir la première ] », row `x 310 y 201 80 × 44`. What is lost is a « Garde min » label with no value under it; § 5's `compact` row promises « « Garde min » en ligne », and there is no Garde min in this state. Screenshot in the scratchpad, not committed.

#### D3 — le bandeau des clés ignorées se paie enfin sur la hauteur du bloc

**Seam.** `ViewportFit` gains `chromeHeight` — « les bandes de la coquille **au-dessus** des deux colonnes », i.e. § 8's strip and nothing else — and `fitsWholeBlock` spends it **on the arm that owes it**:

```
chartBlockHeight(columnWidth) <= available − (railBelow ? MIN_RAIL : chromeHeight)
```

The asymmetry is § 5's own, and it is the mirror image of `MIN_RAIL`'s. Above B2 the block sits in a height-bounded `overflow-hidden` column, so every pixel the strip takes above it clips the block's last band. Below B2 the strip is spent out of the **Rail**, which is the residual scroller there, and § 5's spine says so in as many words — « avec le bandeau des clés ignorées le rail descend à 64 px — tolérable seulement parce que ce bandeau est rejetable et que le bloc se replie au premier défilement ». Subtracting it there would pin a budget the spec prints, so the term is **not** in `availableHeight` and `compactRequired` is untouched: § 5's « `--kb > 0` ou hauteur disponible < 420 px » stays worded as § 5 words it.

The number is **measured**, by `useBandHeight` in `src/components/app/use-viewport.ts` (a `ResizeObserver` on the strip's own border box, `bandRef` on `LinkStripNotice`, `0` when the band is absent or dismissed). It is measured rather than budgeted because the strip is not a band of the block at all — § 5's spine lists it *outside* the five, « 0 | 60 » — and its 1–3 wrapped lines have no width-derived row to look up. **§ 5's invariant is intact**: nothing is sized from it, it is one side of a comparison whose output is a state, and `contract.test.ts`'s « one file reads a window height » and « no chart band is sized from a viewport height » both still hold.

**Pure-seam coverage**, `src/lib/layout/collapse.test.ts`, two cases: the desktop one walks `chromeHeight` across budget C's own 43 px letterbox (`0` → fits, `85` → does not, `floor/ceil(900 − chartBlockHeight(1152))` on either side), and the narrow one asserts the spine's tolerance (`390 × 664` fits with a 60 px *and* a 200 px band).

| Asserted in the browser | Observed |
| --- | --- |
| `/?L=250` at 1440 × 900 no longer lies | `data-fit="tight"`, `data-collapse="pinned"`, strip 85 px |
| « Garde min » is on screen, live, and whole | cell `x 288 y 129 1096 × 44`, text « Garde min1,31 m », row `bottom 173` against `innerHeight 900` |
| the profile is what paid for it | `#profil` `checkVisibility()` **false**, chevron visible |
| **dismissing the strip restores the block** — § 5's « rejetable », now worth something | `[ Masquer ce message ]` → `data-fit="roomy"`, `data-collapse="whole"`, `#profil` visible, cells row back at `y 804 / bottom 856` |
| below B2 nothing changed | 390 × 844 on `/?mp=-5` with a **201 px** strip: `whole` / `roomy`, row 104 px at `y 636 / bottom 740` — the Rail absorbs it and scrolls, exactly the shape § 5 tolerates |
| a bare `/` is untouched | `whole` / `roomy`, row `y 804 / bottom 856`, `Garde min 2,48 m · T anc. A 817,1 daN · T anc. B 793,5 daN · Pente -19,4 % · Flèche 7,48 m` — ticket 31's own first-run record |
| the live scrub still scrubs | `move 533 672 · down · up` on `/` → `#rail-xD` **75,0 → 25,7** |

#### F1 — D1 is **not** a defect at this seam; it is a § 7 reading, and it is left to the user

Reproduced, twice, and left standing on purpose. **Three passages of the contract say the track stays live in this state, and two say it goes inert**, so making it inert is a decision about the spec rather than a repair of the code:

- § 7, *Les trois grilles* — « the strip is the app's only pointer input path and **it may never stop being one**. The single exception is written down under « Aucun résultat » below — implement the keep-the-scrub-track rule unconditionally and someone computes a scale over a NaN domain. » **The single exception is the NaN one**, i.e. the geometric sub-case, which the app already implements.
- § 7, *L'exception géométrique* — « This is the **only** state in the app where the strip is not a pointer path. »
- § 11, describing this very walkthrough's four states — « « Aucun résultat » blanks the output half and **leaves the strip a scrub track with its axes**. »
- Against them: § 7's own heading, « … et **la seule piste de scrub inerte** », and « Saisie en cours »'s « the app's **second** inert scrub track ». The heading enumerates the section's three parts — la cause, les trois échos, and the sub-section titled « le seul état où la piste n'est pas un chemin de pointeur » — and read that way **all five sentences are true at once**; read as a property of the whole state, the three above become false. Ticket 26 §5's heading (« the app's only inert scrub track ») carries the same ambiguity, unresolved.

**And the scoping is unwritten, which is the second reason this is not a repair.** A `scrub` flag on `Suppression` would have to say *which* breaches make the track inert: § 7 forbids it for a **Clearance** breach in as many words (« keeps the track live because the Sweep is still valid »), says nothing about a **Verdict** breach, and its stated rationale for inertness — « scrubbing would let the user generate new stale numbers » — does not transfer, because under « Aucun résultat » there are no numbers on screen to generate. Options, none of them taken here:

- **(a)** inert on any standing blocking error — item 6's literal reading; it takes the pointer path off the app's only pointer surface in a state § 11 says keeps it, and it needs a second decision about the strip's axis label (« glisser pour déplacer ») and about the typed `x`, which funnels through the same `moveRider`.
- **(b)** inert only where the Sweep itself is suppressed (Solve breach or refusal), live under a Clearance or Verdict breach — the reading that keeps § 7's clearance sentence intact, and the one a `scrubInert(report, saisie)` beside `suppression()` would express most naturally.
- **(c)** live, as today, and § 7's heading plus item 6 are corrected to § 11's sentence.

It belongs on a map, beside the `x_D` rounding question this ticket already left open — and both are about the same surface, which is worth noticing before either is answered.

#### Files touched

`src/lib/layout/collapse.ts` · `src/lib/layout/collapse.test.ts` (+2 cases) · `src/components/app/use-viewport.ts` · `src/components/app/app.tsx` · `src/components/app/link-strip.tsx` · `src/components/app/shell.tsx` · `src/components/chart/chart-block.tsx`. Formatted with `bunx oxfmt --write` on exactly those seven; `src/routes/-prototype-07/**` untouched, ticket 36 untouched.

#### Gates — run, and green

```
$ bunx oxfmt --write <the seven files above>
Finished in 125ms on 7 files using 32 threads.

$ bun run typecheck          # tsc --noEmit
exit=0                       (no output)

$ bun run lint-type-aware    # oxlint --type-aware --type-check
exit=0                       (no output)

$ bun run test               # vitest run
 Test Files  39 passed (39)
      Tests  1272 passed (1272)
```

#### Status — au terme de la phase correctifs

**Still `claimed`, and for one reason only: item 6.** The state, its three echoes, the removal of stale values and the axes all hold, and the row is now genuinely *replaced* rather than overpainted — but **the track is still live**, because deciding that it must not be is § 7's decision and not this phase's (**F1**). Items 1–5, 7 and 8 stand. `done` is one line of the spec away, and that line is the user's.

### Contre-vérification — troisième passage, lecture seule

**Environment.** `agent-browser` session `scoutech-t31-re`, **HeadlessChrome 151.0.0.0** (`navigator.userAgent` → `Mozilla/5.0 (X11; Linux x86_64) … HeadlessChrome/151.0.0.0 Safari/537.36`), Linux x86_64, `devicePixelRatio` 1. Viewports **measured** after every `set viewport` (`innerWidth`/`innerHeight`): **1440 × 900**, **390 × 844**, **390 × 400**. `navigator.maxTouchPoints` **0** and `matchMedia('(pointer: coarse)')` **false** — no coarse pointer on this host, ticket 27's finding re-read. Dev server already up on `:3000` (`curl` → **200**), reused and left running. `localStorage.clear()` before every journey — one measurement was first taken on a Session polluted by the previous `/?mp=-5` run (a bare `/` opened straight into « ⛔ 1 erreur bloquante ») and was discarded, not reported. Statuses from `curl -s -o /dev/null -w '%{http_code}'`. **No `src/**` file was touched by this pass.**

**The three defects, re-driven on the fixed tree.**

| | Re-driven | Now |
| --- | --- | --- |
| **D1** | `/?mp=-5` at 1440 × 900, strip dismissed so the block is `whole` and the strip box is back at `x 288 y 584 1152 × 177`; `mouse move 533 672 · down · move 640 672 · up` | **still reproduces** — `#rail-xD` **75,0 → 41,5**, URL rewritten to `…&mp=-5&hr=2.1&daf=1.2&x=41.52173913043479`, and the strip's own label still reads « Garde au sol (m) selon la position du passager — glisser pour déplacer ». Left standing on purpose (**F1**): it is a § 7 reading. |
| **D2** | `/?mp=-5` at 1440 × 900 and at 390 × 844 | **gone** — `[...row.children].filter(DIV).map(textContent)` → `["","","","",""]` at both widths, so there is nothing left to paint over. 1440: row `x 288 y 804 1152 × 52`, cause text box `x 300 y 822 262 × 15`, `elementFromPoint` at `(305, 829)` → the `<p>` itself. 390: row `x 0 y 436 390 × 104`, cause box `x 12 y 480 262 × 15`. Screenshot of the row at 1440 reads « Aucun résultat — masse du passager invalide. » once, cleanly, with no label under it. |
| **D3** | `/?L=250` at 1440 × 900 | **gone** — strip **85 px**, `data-fit="tight"`, `data-collapse="pinned"`, « Garde min1,31 m » live at `x 288 y 129 1096 × 44`, row `bottom 173` against `innerHeight 900`, and **zero** Chart Block descendants with `bottom > innerHeight` (the only overflowing boxes are the Rail's own sections, which is the Rail being the scroller). `#profil` `checkVisibility()` **false** — the profile is what paid. Dismissing the strip → `roomy` / `whole`, `#profil` visible, row back at `y 804 / bottom 856`. |

**Adjacent journeys, checked for collateral.**

| Asserted | Observed |
| --- | --- |
| the valid scrub still scrubs | bare `/` at 1440 × 900: `move 533 672 · down · up` → `#rail-xD` **75,0 → 25,7**, `x=25.721641871068563`, cells recompute (« Garde min (à x 36,5 m) 4,45 m ») |
| ticket 27's chevron hit test, through the cause line | `/?mp=-5` at 1440 × 900 with the strip up (`pinned`): chevron « Afficher le profil » **44 × 44** at `x 1384 y 129`, `elementFromPoint` at its centre → `SPAN` whose `closest('button')` **is** the chevron; the cause `<p>` `checkVisibility()` true |
| the labels are only dropped while the cause line stands | 390 × 400 `compact` on a **valid** first run: row `x 245 y 0 145 × 44`, cells « Garde min2,48 m · T anc. A817,1 daN · T anc. B793,5 daN · Pente-19,4 % · Flèche7,48 m » — labels intact |
| below B2 nothing pins | `/?L=250` at 390 × 844 with a **217 px** strip: `roomy` / `whole`, row `y 653 / bottom 757` against 844, « Garde min1,31 m » live — the Rail absorbs it, as § 5 tolerates |
| the strip's `ResizeObserver` is quiet | `console` on that journey: three lines (`[vite] connecting…`, `[vite] connected.`, React DevTools `[info]`); `errors` **empty** |
| D3's pure-seam cases really run | `bunx vitest run src/lib/layout/collapse.test.ts -t "D3"` → **2 passed | 66 skipped** |

**Items 1–5 and 7, re-walked, because other tickets' fixes landed under this one.**

- **Item 1.** `curl -s http://localhost:3000/`, `<body>`-to-first-`<script>` slice: tags `aside 1 · div 18 · h2 5 · header 1 · noscript 1 · section 5 · span 6` and nothing else; visible text nodes `Scoutech · Paramètres · Valeurs déduites · Résultats · Provenance · Ce que cet outil ne calcule pas · Ce simulateur nécessite JavaScript pour fonctionner. · Garde min · T anc. A · T anc. B · Pente · Flèche` — each of the five labels **exactly once**; `<button>/<input>/<select>/<textarea>/<a >/<svg>/role="button"/contenteditable/tabindex="0"` all **0**; no digit and no `—`/`–` in the frame's text (the response's single `—` is the `<title>`'s); `aria-busy="true"` ×1, `aria-live` 0; `--profile-plot:calc(0.42 * var(--w-inner))` and `--strip:clamp(96px, calc(0.16 * var(--w-inner)), 200px)` served. Frames for `/` and `/?v=3` are **byte-identical** (`diff` empty, 6177 B each). Measured with hydration aborted (`network route "**tanstack-start-dev-client-entry**" --abort`): banner slot empty and undrawn — `children 0`, `textContent ""`, `background-color rgba(0,0,0,0)`, `border-top 0px`, `box-shadow none` — plot band `1152 × 540` at 1440 with the inner plot `1104 × 464`, and `342 × 144` (aspect **0,421**) with the strip at its **96 px** clamp floor at 390. **One recorded number has moved since this ticket's first pass, and it is not a regression:** the reserved banner is **76 px at 390** (was 44), because `shell.tsx`'s container query re-points `--banner` to `--banner-three-lines` below 480 px — tickets 28/29's work, deliberate, and the slot is still empty.
- **Item 2.** `console --clear` → `open /` → `wait --text "Copier le lien"` at both viewports: three lines each, `errors` empty, **no `[Server]`-prefixed entry this run** (the cross-tab vite echo the first pass warned about did not appear). Pre-hydration vs live, same session: 1440 → aside `x 0 y 0 288 × 900`, cells row `288 804 1152 × 52`, plot band `288 44 1152 × 540`, strip 177 px **in both**; 390 → aside `0 540 390 × 304`, cells row `0 436 390 × 104`, banner 76 **in both**. Nothing jumps; `aria-busy` flips `true → false` and the control count `0 → 47` buttons / 21 inputs.
- **Items 3 and 4.** `/` 200 · `/?v=3` 200 · `/?fl=6&te=1200` 200 · `/?tr=zzz` 200 · `/?tr=p1.`+3000 chars 200 · `/?L=250` 200 · `/unknown-path` **404** · `/nouveau` **404**. `/?v=3` renders « Scoutech / Ce lien ne peut pas être ouvert. / Version de schéma inconnue (v = 3). / Ouvrir l'application sans ce lien », `aside h2` **0**, `role="alert"` ×1, address bar still `?v=3` (no `refused` key). The two other reason lines re-read verbatim on their own URLs. Recovery action: `history.length` **7 before, 7 after** ⇒ `replace`, URL → `http://localhost:3000/`, `aside h2` back to **5**, First-Run Scenario painted (`Garde min2,48 m · T anc. A817,1 daN · T anc. B793,5 daN · Pente-19,4 % · Flèche7,48 m`). `/unknown-path` → « Page introuvable. | Ouvrir le simulateur », `[data-collapse]` absent, no redirect.
- **Item 5.** Same procedure, same numbers as the first pass, digit for digit: A (`L = 160,0` committed, caret in `#rail-L`) → cells `2,42 m · 871,2 daN · 847,6 daN · -18,9 % · 7,57 m`, `path[d]` hash **-1956691961** / length **11558**, URL `…&L=160&…&x=75`, Session hash **77564682** with `geometry.L 160`. B (`Control+a`, `Delete`, +1 s) and C (**+4 s**, 10× `URL_WRITE_DEBOUNCE_MS`) → banner « Saisie en cours — ces valeurs correspondent à Portée 160,0 m. », cells **identical**, hash **identical**, every SVG's computed `opacity` **min 1** (frozen, not dimmed), « Copier le lien » `disabled` with `title` « Complétez les champs vides pour partager ce lien. », URL and Session **byte-frozen**. Mid-edit pointer press (`move 533 672 · down · move 700 672 · up`): `#rail-xD` **75,0**, `x=75`, Session `rider.xD` **75** — the guard holds; the press blurs the field, so the run lands in « Aucun résultat — portée : valeur requise. » with the three echoes, no stale value anywhere, and both plots on the geometric exception (« aucun tracé possible » ×2). Typed `x` remains **not observable** for the reason the first pass gives.
- **Item 7.** Every line above is `curl`, `agent-browser` or `eval --stdin` from a file; no jsdom, no Testing Library.

**Item 6 — still the one thing outstanding.** On `/?mp=-5`: three echoes (cell row, `RÉSULTATS`, `VALEURS DÉDUITES`), none of `2,42 / 871,2 / 847,6 / 7,57 / -18,9` anywhere in `innerText`, `aria-invalid="true"` on `#rail-mp`, row height unchanged (52 px at 1440, 104 px at 390 — the same as the valid screen), inputs still draw (profile 1 `path`, 6 `line`s, 8 `text`s: `A · B · 0 · 38 · 75 · 113 · 150 m`), axes stay (strip baseline `line`, `0` tick, its label). **The track is still a live scrub track** — measured above. Unchecked, and the ticket stays `claimed`.

**One consequence of D2's fix a reviewer should still rule on, re-measured.** `compact` under « Aucun résultat » (390 × 400, `data-fit="tight"`, `data-collapse="compact"`): banner slot `x 0 y 0 310 × 44` carrying « ⛔ 1 erreur bloquante — aucun résultat  [ voir la première ] », read-out slot `x 310 y 0 80 × 44` whose only visible content is the chevron — the cause line is `compact:hidden` and the five cells are now text-less. § 5's `compact` row promises « « Garde min » en ligne »; in this state there is no Garde min. What changed is that the row no longer shows a **valueless label**. Same family of question as **F1**, and left to the user for the same reason. — **Ruled 2026-08-28 by [amendment N](../../zipline-simulator-v1-build/AMENDMENTS.md#n--en-compact-le-bandeau-est-la-ligne-de-cause): not a gap.** In `compact` the banner slot and the read-out slot are two cells of **one** 44 px row, so « une ligne de cause qui traverse la rangée » is satisfied by the banner, and § 5's « « Garde min » en ligne » is a promise about the state where a Garde min exists. The chevron stays; a valueless « Garde min. ligne » is rejected on amendment M's grounds. **No code changed.**

**A second behaviour change worth naming, sanctioned but visible.** With D3 fixed, **any partial link at 1440 × 900 now opens `pinned`** — the profile is hidden until § 8's strip is dismissed. § 5's collapse condition **(c)** (« it cannot fit ») is exactly what fires, and it is what stops « Garde min » being clipped, so this is the fix working; it is recorded because a shared partial link now lands on a collapsed profile where it used to land on a whole block with a cut-off read-out row.

**Gates — re-run by the verifier, not taken on trust.**

```
$ bun run typecheck          # tsc --noEmit
exit=0                       (no output)

$ bun run lint-type-aware    # oxlint --type-aware --type-check
exit=0                       (no output)

$ bun run test               # vitest run
 Test Files  39 passed (39)
      Tests  1288 passed (1288)
   Duration  1.17s

$ bunx vitest run src/lib/layout/collapse.test.ts -t "D3"
      Tests  2 passed | 66 skipped (68)
```

The suite is **1288** rather than the fix phase's 1272 — other tickets' fix phases landed cases in the same working tree while this pass ran; all 39 files are green either way.

**Status: `claimed`.** Items 1–5, 7 and 8 verified by measurement above; **item 6 fails on inertness only**, and its resolution is § 7's (**F1**), not a build ticket's. Browser session `scoutech-t31-re` closed; the orchestrator's dev server left running.
