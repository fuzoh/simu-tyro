# 33 — Verify Trace lifecycle in browser

**What to build:** Take imported CSV from file picker through Trace-backed Terrain, Anchor Placement, removal, and Session reuse. Verify derived geometry and provenance remain understandable at desktop and 390 px, including file-identity line’s fourth state.

**Blocked by:** 28 — Keep safety controls usable under constrained height.

**Status:** done

- [x] « Importer un profil… » opens file workflow; no drop-zone-only path is required.
- [x] Valid CSV produces Trace-backed Terrain, interactive Anchor Placements, and derived span/elevation read-outs. — was **partiel** on **D2** (the two Station handles inert, `pointer-events: none`) and on **D3** (« Alt. base » computed, never rendered); both **fixed and re-measured** in the correction pass below.
- [x] Sampling spacing, point count, filename, and provenance disclosure match imported data.
- [x] Moving Anchor Placement updates derived geometry without mutating received Trace. — typed **and** pointer path, the second one since D2's fix.
- [x] « Retirer le tracé » restores retained manual span and elevation values.
- [x] Cached inactive Trace exposes « Réutiliser ce tracé » and its four-state identity line fits at 390 px. — three states were measured in the first pass; the two link states, **unreachable on D1**, are measured in the correction pass below.
- [x] Parse failure leaves current Terrain untouched and names filename plus failing line.
- [x] Browser procedure uses stable fixture and records desktop plus 390 px outcomes.

All eight items were **re-walked and re-measured independently** on 2026-08-14 by a second,
`src/**`-read-only agent — voir « Re-verification pass » at the end of this file. D1, D2 and D3 are
confirmed gone; **D4 stays open as a spec call** and no acceptance item depends on it.

## Comments

Read-only browser pass — **no `src/**` file was modified**. Two acceptance items are outstanding on
two build defects (D1, D2) that a later fix phase owns; the rest is measured below.

### Environment

`HeadlessChrome/151.0.0.0` (X11; Linux x86_64), `agent-browser 0.34.0`, session `scoutech-t33`,
dpr 1. Viewports set with `set viewport` and **confirmed by `innerWidth`/`innerHeight` before any
number was recorded**: `{vw:1440, vh:900}` and `{vw:390, vh:844}`. Every box is
`getBoundingClientRect()` / `Range.getClientRects()`, every style `getComputedStyle()`. HTTP codes
from `curl -s -o /dev/null -w '%{http_code}'`.

**Coarse pointer is not observable on this host** (ticket 27's finding re-confirmed:
`navigator.maxTouchPoints 0`, `matchMedia('(pointer: coarse)').matches false`), so the button
geometry below is a **CSS/computed-style fact, not a touch interaction**.

### The fixture — stable, outside `src/`, regenerable

| Path | Rows | Extent | Step | `Easting`/`Northing` | md5 |
| --- | --- | --- | --- | --- | --- |
| `.scratch/zipline-simulator-v1-build/fixtures/t33-profil-valide.csv` | **121** (+ header) | 0,0 → **180,0 m** | **exactly 1,5 m** | collinear ⇒ deviation **0** | `c342bd994d4c7b7a791963b85365c6b0` |
| `.scratch/zipline-simulator-v1-build/fixtures/t33-profil-invalide.csv` | same, one cell broken | — | — | — | `1bc70e5c63df15ea68aaebf0f9af85ec` |

Header, verbatim: `Distance;Altitude;Easting;Northing`. Row `i` (0…120) is
`d = 1,5·i`, `z = 540,0 − 0,15·d − 40·sin(π·d/180)` rounded to 0,1 m, `E = 2547000,00 + 1,5·i`,
`N = 1192000,00` constant. First row `0.0;540.0;2547000.00;1192000.00`, last
`180.0;513.0;2547180.00;1192000.00`. ASCII, LF, no BOM. Generator (repeatable):

```python
import math
rows = [f"{1.5*i:.1f};{540.0 - 0.15*(1.5*i) - 40.0*math.sin(math.pi*(1.5*i)/180.0):.1f};"
        f"{2547000.00 + 1.5*i:.2f};{1192000.00:.2f}" for i in range(121)]
open("t33-profil-valide.csv","w").write("Distance;Altitude;Easting;Northing\n" + "\n".join(rows) + "\n")
```

`t33-profil-invalide.csv` is that file with **physical line 47**'s `Altitude` cell replaced by
`n/a` (`67.5;n/a;2547067.50;1192000.00`). Line 47 = header + 45 data rows + 1, so the expected
message names *47*.

**Every expected number below is arithmetic over the fixture, not a value read back from the app**:
`L = 180,0`, `h = 513,0 − 540,0 = −27,0`, point count 121, max spacing 1,5 m, deviation 0,00 m.
Manual geometry behind the import is `FIRST_RUN_SCENARIO`'s `L 150,0` / `h −18,0` / `z_A = z_B = 12,0`.

### Item 1 — the file workflow opens, and it is a button

A capture-phase listener on the hidden `input[type="file"]` (`e.preventDefault()` so no native
dialog blocks the session) counted the forwarded click:

| Viewport | Action | Observed |
| --- | --- | --- |
| 1440 × 900 | press « Importer un profil… » | `{clicks: 1}` on the file input |
| 390 × 844 | same, Rail scrolled so the button hit-tests to itself | `{clicks: 1}` |

`accept=".csv,text/csv"`, the control's `tagName` is **BUTTON**, and the DOM carries **no** drop
handler (`document.querySelector('[ondrop],[data-dropzone]')` → null) — § 4's « bouton, pas une
zone de dépôt » holds and no drop-zone-only path exists.

**Tooling note, method disclosed:** `agent-browser 0.34.0`'s `upload` refuses a `display:none`
input (`✗ Element not found: input[type=file]`), so each upload removed the input's `hidden`
class **at runtime** and re-added it immediately after. Nothing in `src/` changed and the React
`onChange` → `importProfile(file)` path exercised is the one a native picker drives.

### Items 2 + 3 — what a valid CSV produces

Right after `upload … t33-profil-valide.csv`, at **1440 × 900** and again at **390 × 844**:

| Read-out | Observed | Expected from the fixture |
| --- | --- | --- |
| file-identity line | `t33-profil-valide.csv` | filename |
| Géométrie fields | `Station A` / `Station B` replace `Portée` / `Dénivelé` | mode importé |
| `#rail-sa` / `#rail-sb` | `0,0` / `180,0` | A at first station, B at last |
| `#rail-zA` / `#rail-zB` | `12,0` / `12,0` | untouched by the import |
| Valeurs déduites | **Portée 180,0 m · Dénivelé -27,0 m** | 180,0 / −27,0 |
| Provenance | **`Profil importé · 121 points · pas max 1,5 m`** | 121 · 1,5 |
| Provenance | **`✓ Tracé rectiligne (écart max 0,00 m)`** | collinear ⇒ 0 |
| coarse-terrain ⚠ | absent | 1,5 m < 5 m ⇒ must not fire |
| URL | `…&sa=0&sb=180&…&tr=p1.…` (579 chars of `tr`) | trace travels |
| buttons | « Importer un profil… » + « Retirer le tracé » | trace active |

So the Terrain is Trace-backed, the disclosure matches the imported data exactly, and the derived
span/elevation read-outs are present. **What fails item 2 is the pointer half** — see D2.

### Item 4 — moving a Placement re-derives; the Trace is untouched

| Viewport | Move | Portée | Dénivelé | Provenance after |
| --- | --- | --- | --- | --- |
| 1440 × 900 | `Station A` 0,0 → **30,0** | **150,0 m** | **-2,5 m** | `121 points · pas max 1,5 m` · `écart max 0,00 m` |
| 1440 × 900 | `Station A` → **200,0** (refused) | 150,0 m (last valid) | -2,5 m | unchanged |
| 1440 × 900 | `Station A` back to **0,0** | **180,0 m** | **-27,0 m** | unchanged |
| 390 × 844 | `Station A` → **60,0** | **120,0 m** | **16,6 m** | unchanged |

Hand-checked against the file: `z(30) = 515,5` ⇒ `h = 513,0 − 515,5 = −2,5`; `z(60) = 496,4` ⇒
`h = +16,6`; station 60,0 is sample 40 exactly. The **point count, max spacing and deviation never
move**, and returning A to 0,0 reproduces 180,0 / −27,0 to the decimal — the received Trace is
re-derived, never mutated.

The out-of-trace typed station blocks rather than clamps, as § 4 requires: inline
`⛔ Station hors du tracé (0,0 – 180,0 m). Valeur : 200,0 m.` plus
`⛔ 1 erreur bloquante — aucun résultat` in the banner slot. The bound reads « 0,0 » where § 4's and
§ 7's copy tables print « 0 » — recorded as **D4**.

### Item 5 — « Retirer le tracé » restores the retained manual geometry

| Viewport | After the removal |
| --- | --- |
| 1440 × 900 | `#rail-L` **150,0** · `#rail-h` **-18,0** · `zA/zB` 12,0 · Station fields gone |
| 390 × 844 | `#rail-L` **150,0** · `#rail-h` **-18,0** |

Provenance flips to `ℹ Terrain — ligne droite entre les pieds d'ancrage (aucun profil importé)`,
the URL rewrites to `?v=1&u=daN&use=perm&L=150&h=-18&…` with **no `sa`, `sb` or `tr`**, and the
Trace stays cached (fourth state below). A subsequent reload with the Session in place restores the
imported trace — `t33-profil-valide.csv`, `Profil importé · 121 points`, Portée 180,0 — so removal
discards the stations, not the Trace.

### Item 6 — the fourth state, and the identity line at 390 px

Measured at **390 × 844** (Rail column, `font-size 11px`, `line-height 16.5px`, box **358 px**),
text width from `Range.getClientRects()`:

| État | Copie rendue | textW | lines | box | overflow |
| --- | --- | --- | --- | --- | --- |
| aucun tracé | `(aucun tracé)` | 69,6 | 1 | 358 × 16,5 | 0 |
| actif, importé | `t33-profil-valide.csv` | 106,2 | 1 | 358 × 16,5 | 0 |
| actif, reçu par lien | **unreachable — D1** | — | — | — | — |
| en mémoire, inactif | `Tracé en mémoire : t33-profil-valide.csv (non utilisé)` | **273,5** | **1** | 358 × 16,5 | 0 |
| en mémoire, reçu par lien | **unreachable — D1** | — | — | — | — |

`document.documentElement.scrollWidth − clientWidth = 0` throughout: nothing overflows the 390 px
viewport, and the longest reachable state still sits on **one** line with 84 px to spare. At
1440 × 900 the same state wraps to **2** lines in the 255 px Rail (`textW 270,4`, box 255 × 33,
element overflow 0) — wrapping, not clipping.

« Réutiliser ce tracé » is exposed exactly in the cached-inactive state (`111,3 × 22,5` at 390 px)
and re-places the anchors as an import does — pressed at both viewports: `sa 0,0`, `sb 180,0`,
Portée 180,0 m, Dénivelé -27,0 m, provenance back to `121 points · pas max 1,5 m`, identity line
back to the filename, button back to « Retirer le tracé ».

The file-control buttons are **22,5 px tall** at 390 px (`padding 2px 8px`, `font-size 11px`,
`min-height auto`). § 5's 44 px coarse-pointer rule is written for the rider's grab circle and the
anchor targets, not for Rail buttons, so this is recorded as a fact and **not** filed as a defect.

### Item 7 — a rejected file changes nothing but says what it rejected

`upload … t33-profil-invalide.csv` **while the valid trace was active**:

| Viewport | Message | Placement | Terrain after |
| --- | --- | --- | --- |
| 390 × 844 | `⛔ t33-profil-invalide.csv — valeur illisible ligne 47, colonne Altitude.` | inside the `Géométrie` section, `textW 356,4` in a 358 px box, **1 line** | identity `t33-profil-valide.csv`, `sa 0,0`, `sb 180,0`, Portée 180,0 m, Dénivelé -27,0 m, `121 points · pas max 1,5 m` |
| 1440 × 900 | same string | inside `Géométrie`, box 255 × 33 (**2 lines**) | identical, unchanged |

`[ Choisir un autre fichier ]` is present, and the **banner slot stays empty** — no
`erreur bloquante` line at either width, matching « never in the banner slot ». The message names
the file and the failing physical line, as the fixture was built to require.

### Defects found — reported, not fixed (this pass is read-only on `src/`)

**D1 · blocking — a link's `tr` payload is never decoded, so an arriving Trace does not exist.**
`decodeP1` (`src/lib/url/p1.ts:243`) has **no consumer outside its own test and bench**
(`rg -n 'decodeP1' src` → `p1.ts`, `p1.test.ts`, `p1.bench.ts` only). Repro: `localStorage.clear()`,
then open a URL carrying `tr=p1.…` (HTTP **200**). Observed at 390 × 844: `#rail-sa 0,0` /
`#rail-sb 180,0` — i.e. `geometry.source === "trace"` — while `state.trace` is null, so the identity
line reads « **(aucun tracé)** », Provenance renders the **manual** straight-line block
(`ℹ Terrain — ligne droite … (aucun profil importé)`), **Valeurs déduites has no Portée/Dénivelé
rows at all**, and `RÉSULTATS` is empty with **no** « Aucun résultat » cause line and **no** banner.
Expected: « tracé reçu par lien », `Profil importé · 121 points · pas max 1,5 m`, Portée 180,0 m,
Dénivelé -27,0 m. **Masked by the Session**: the same URL reloaded in the browser that did the
import renders correctly, which is why it survived. This is what makes identity states 3 and 4b
unreachable. Pure-seam testable: yes — the search bag → `AppState` assembly is pure.
Files: `src/components/app/app.tsx`, `src/lib/app/state.ts`, `src/lib/scenario/from-search.ts`,
`src/lib/url/p1.ts`.

**D2 · blocking — § 4's two draggable Station handles never became draggable.**
`src/components/chart/profile.tsx:299-306` renders both anchor targets with
`className="pointer-events-none fill-transparent"`, and the pointer surface excludes the Handle
Lane. Measured at 1440 × 900 with the fixture loaded: target A `44 × 48` at `(342,57 · 535,68)`,
computed `pointer-events: none`, `elementFromPoint` at its centre resolves to the profile `<svg>`.
A real pointer drag (`mouse move 364 559` → `down` → `move 500 559` → `move 600 559` → `up`) left
`#rail-sa` at `30,0` and `#rail-xD` at `75,0` — nothing moved. § 4 requires « quatre champs **et
deux poignées** », with pointer input snapping to a terrain sample, and it explicitly
*rejects fields-only*. Ownership is the gap: ticket 23 left the handles « standing » for A9, and
ticket 24 (done) never picked them up — no ticket in `issues/` owns them now. Pure-seam testable:
only in part (a « snap station to nearest sample » function would be a unit test; the affordance
itself is browser evidence).

**D3 · minor — « Alt. base A » / « Alt. base B » are computed and never rendered.**
`src/lib/terrain/trace.ts:63-65` computes `zBaseA`/`zBaseB` and names them « the rail's
« Alt. base A » », but `DeducedSpan` (`src/lib/rail/deduced.ts:78-83`) carries only `L`, `h`,
`chord`, and `document.body.innerText.match(/base/i)` is **null** on an imported screen at both
viewports. § 4's anchor-placement block lists `Alt. base A 540,4 m · Alt. base B 501,8 m` beside
Portée and Dénivelé. Expected here: `540,0` and `513,0`. Pure-seam testable: yes (`deduceValues`).

**D4 · minor — the out-of-trace bound prints « 0,0 » where the copy tables print « 0 ».**
Observed `⛔ Station hors du tracé (0,0 – 180,0 m). Valeur : 200,0 m.`; § 4's degenerate-placement
table and § 7's 17-row message table both print « Station hors du tracé (0 – 224,0 m). ». Either
the copy is verbatim (bound formatted as an integer) or station display precision governs
(0,0) — **that reading is a spec call and is left open, not decided here.** Pure-seam testable: yes
(`src/lib/rail/fields.ts`'s message builder).

### Left open because it needs a decision, not a fix

**When does the inline import failure clear?** After `⛔ … valeur illisible ligne 47 …` was shown,
pressing « Retirer le tracé » left the message on screen (`/valeur illisible/` still matched), so a
user who removed the trace still reads a ⛔ about a file. § 4 and § 7 say where the failure renders
and that it never enters the banner, but **not when it goes away**. Options: (a) clear on any
successful terrain change; (b) clear only when another file is chosen; (c) leave it until it is
replaced, as now. (c) is defensible on the same « a refusal that vanishes on its own may never be
seen » logic the copy-link outcome uses. Not decided in a build ticket.

### Gates — real output

```
$ bun run typecheck        # tsc --noEmit
exit=0                     (no output)

$ bun run lint-type-aware  # oxlint --type-aware --type-check
exit=0                     (no output)

$ bun run test             # vitest run
 Test Files  39 passed (39)
      Tests  1268 passed (1268)
   Duration  1.53s
```

`bunx oxfmt --write` was **not** run: this pass touched no `.ts`/`.tsx`, and markdown plus the
`.csv` fixtures are outside the formatter's remit.

### Host and run limitations

- **Coarse pointer / real touch unobservable** (`maxTouchPoints 0`, `(pointer: coarse)` false), so
  every 390 px number here is a layout/computed-style fact taken with a fine pointer.
- **Rail sub-scroller**: a click on an off-screen Rail control does nothing in headless Chrome
  (the first « Réutiliser ce tracé » press at 390 px, taken at `y 886` in an 844 px viewport, was a
  no-op and **not** an app defect — it worked immediately once in view). Every subsequent Rail
  press set `aside.scrollTop` **directly**, hit-tested the target with `elementFromPoint`, then
  pressed it with `mouse move/down/up`.
- **The dev server at :3000 stopped answering twice mid-run** — first `net::ERR_CONNECTION_RESET`
  (it came back on its own), then no listener at all. Neither outage was caused by a command from
  this session. After the second one I started my own `bun run dev` in the background to finish the
  pass; anything the orchestrator relied on at :3000 is that instance, not the original.
- No soft keyboard exists on this host (irrelevant to this ticket's items, recorded for
  consistency with tickets 27/28), and `interactive-widget=resizes-content` remains unverifiable
  outside Safari.

---

## Correction pass — 2026-08-14

**D1, D2 and D3 are fixed; D4 is skipped as the spec call the first pass said it was.** Every defect
was reproduced first, in the same browser, before anything was edited. `HeadlessChrome/151.0.0.0`
(X11; Linux x86_64), `agent-browser 0.34.0`, session `scoutech-fix33`, dpr 1, viewports
`{vw:1440, vh:900}` and `{vw:390, vh:844}` read back from `innerWidth`/`innerHeight`. Same fixture,
same md5. The dev server at `:3000` was the running instance, reused.

### Reproduced before the fix

| Défaut | Repro | Observé |
| --- | --- | --- |
| D1 | `localStorage.clear()`, then the `tr` link (579 chars of `tr`, HTTP **200**) | `#rail-sa 0,0` / `#rail-sb 180,0`, identity « (aucun tracé) », provenance the manual straight-line block, **no** Portée/Dénivelé rows, `RÉSULTATS` empty |
| D2 | targets' boxes + `elementFromPoint` + a real drag `364 → 500 → 600` at y 560 | `pointer-events: none` on both, centre hit-tests to the `<svg>`, `#rail-sa` still `30,0` |
| D3 | `/Alt\. base/.test(document.body.innerText)` on an imported screen | `false` at both viewports |
| D4 | `#rail-sa` ← « 200,0 » on the valid fixture | `⛔ Station hors du tracé (0,0 – 180,0 m). Valeur : 200,0 m.` |

### D1 — the link's `tr` is decoded at the mount seam

`src/lib/app/state.ts`: `initialAppState` now decodes an arriving `tr` into the state's `Trace`
(`linkTrace`), so `geometry.source === "trace"` can no longer stand beside `trace: null`.
`decodeP1` cannot fail there — `salvageSearch` has already walked the payload structurally and an
undecodable or oversize one is amendment E's refusal, which returns above. **The Session's own copy
wins when it is the same profile**, tested on the payload the Session stores beside its active
imported geometry: § 8's « The Session keeps the filename, since that is the user's own session »
would otherwise be broken by the fix, renaming your own import « tracé reçu par lien » on refresh.

Unit cases in `src/lib/app/state.test.ts` (4, `node`, no DOM): the decoded profile and its `null`
`fileName`; the Session's file kept for its own payload; a cached Trace the link does not name **not**
adopted; a `tr`-less link leaving the cache alone.

Measured after, at **1440 × 900**, `localStorage` cleared, same `tr` URL:

| Read-out | Observed |
| --- | --- |
| identity line | **`tracé reçu par lien`** — § 4's third state, reachable for the first time |
| provenance | `Profil importé · 121 points · pas max 1,5 m` · `✓ Tracé rectiligne (écart max 0,00 m)` |
| Valeurs déduites | **Portée 180,0 m** · **Dénivelé -27,0 m** |
| `RÉSULTATS` | populated — `Garde min (traversée) 9,90 m`, `passager à x 11,2 m` |
| HTTP | `200` for the `tr` link, and `200` with the refusal surface for `tr=p1.@@@` (no crash in the lazy initialiser) |

At **390 × 844**, identical read-outs, and the two states the first pass could not reach:

| État | Copie rendue | textW | lines | box | overflow |
| --- | --- | --- | --- | --- | --- |
| actif, reçu par lien | `tracé reçu par lien` | **94,5** | 1 | 358 × 16,5 | 0 |
| en mémoire, reçu par lien | `tracé reçu par lien (non utilisé)` | **158,5** | 1 | 358 × 16,5 | 0 |

`document.documentElement.scrollWidth − clientWidth = 0`. Regression check on the masked path: a
fresh import shows `t33-profil-valide.csv`, and **reloading that same URL keeps the filename** —
`t33-profil-valide.csv`, `121 points`, Portée 180,0 m.

### D2 — the two Station handles drag, and the snap is a unit test

`snapStation` (`src/lib/terrain/trace.ts`, pure, 4 new cases in `trace.test.ts`) takes the file's own
nearest sample and clamps to the trace extent — § 4's « pointer input snaps to a terrain sample » and
its « bornée à l'extrémité du tracé — l'état d'erreur est inatteignable ». The affordance is browser
evidence (amendment B): `profile.tsx` gives the two 44 × 48 targets a capture-and-move drag **only
when a station callback is passed**, which is imported mode, so § 5's manual-mode bracket stays
non-interactive; `chart-block.tsx` converts span-frame metres to a station with `s_A`, snaps, and
writes through `applyField` so `x_D`'s clamp travels with the new span. The x-tick label group is
`pointer-events-none`: two of its labels sit inside the targets' 48 px and were punching holes in
them.

**The press only takes the pointer** — it does not move the station, unlike the rider's grab, because
a 44 px target is up to 22 px wide of the anchor it holds (26 m at a 1500 m span).

| Viewport | Drag | Observed |
| --- | --- | --- |
| 1440 × 900 | targets before | `pointer-events: auto`, `cursor: grab`, `elementFromPoint` at centre **and** at both diagonal corners resolves to `[data-anchor]` itself |
| 1440 × 900 | A: `364 → 400 → 500` at y 560 | `sa` **36,0** (= 1,5 × 24), Portée **144,0 m**, `Alt. base A` **511,1 m**; URL rewrites to `sa=36&sb=180` |
| 1440 × 900 | B: `1416 → 1430 → 1439` (past the end) | `sb` stays **180,0**, **no** inline ⛔ and **no** banner — the clamp, not an error |
| 1440 × 900 | B: `1416 → 1300` | `sb` **163,5**, Portée **127,5 m**, `Alt. base B` **504,1 m** |
| 390 × 844 | A: `24 → 90 → 140` at y 271 | `sa` **79,5**, Portée **100,5 m**, no error state |
| both | provenance after every drag | `121 points · pas max 1,5 m` · `écart max 0,00 m` — the received Trace is re-derived, never mutated |

Typed input stays exact beside it: `#rail-sa` ← « 40,3 » (off the 1,5 m grid) holds **40,3** and
interpolates — Portée 139,7 m, `Alt. base A` 508,0 m. The rider's own drag still works
(`700 → 800` at y 480 ⇒ `x_D` 55,6 m), and after « Retirer le tracé » both targets are
`pointer-events: none` again.

**One reading left literal, on purpose.** § 4 clamps a dragged handle « à l'extrémité du tracé » and
says nothing about the *other* station, so dragging A onto B still reaches § 4's own degenerate row —
measured: `sa 180,0`, `sb 180,0`, inline `⛔ Portée nulle ou négative — l'ancrage B est avant
l'ancrage A.`, `[ Inverser A et B ]`, banner `⛔ 1 erreur bloquante — aucun résultat`. The wider
reading — « dragged handles clamp » means a drag may never reach *any* error state, so A clamps at B —
is a rule the spec does not write, and it was not invented here.

### D3 — « Alt. base A / B » are rendered

`DeducedSpan` now carries `bases` (`null` in manual mode, which has no profile to read an altitude
off), `deduceValues` fills it from `deriveSpan`'s own `zBaseA`/`zBaseB`, and the Rail prints two
`ReadOut` rows beside Portée and Dénivelé. Display precision comes from § 3's table, with a new
`zBase` row at **1 decimal** — the grain § 4's own block prints (« Alt. base A 540,4 m ») and the
file's `Altitude` column, exactly as `station` reads `Distance`; `quantity.test.ts`'s one-case-per-row
gate covers it.

Measured on the fixture at both viewports: **`Alt. base A 540,0 m`** · **`Alt. base B 513,0 m`**,
i.e. `z(0)` and `z(180)` from the file — the ticket's expected pair. After a drag to `sa 36,0`:
`511,1 m`, which is the file's own sample at 36 m and not a formula re-derived in the UI. Manual mode
prints neither row (`/Alt\. base/` ⇒ `false`), and two unit cases in `deduced.test.ts` hold both
sides.

### D4 — skipped, and why

The lower bound still reads « 0,0 ». § 4's degenerate table and § 7's message table print
« Station hors du tracé (0 – 224,0 m). » while § 3's display-precision table gives `Station` one
decimal, and **which of the two governs is a spec call**: (a) the copy tables are verbatim, so the
bound formats as an integer and `fields.ts` special-cases it; (b) station display precision governs
and the two spec tables carry a typo. The first pass left that open deliberately; a fix agent may not
close it. Nothing else hangs on it — item 4's requirement (a moved placement re-derives without
mutating the Trace) passes either way, and the message is otherwise the spec's string, bound values
and echoed value included.

Also still open, unchanged and still needing a decision rather than a fix: **when the inline import
failure clears** (voir the first pass's own section).

### Gates — real output, after the fixes

```
$ bunx oxfmt --write <the 11 touched files>
Finished in 138ms on 11 files using 32 threads.

$ bun run typecheck        # tsc --noEmit
exit=0                     (no output)

$ bun run lint-type-aware  # oxlint --type-aware --type-check
exit=0                     (no output)

$ bun run test             # vitest run
 Test Files  39 passed (39)
      Tests  1285 passed (1285)
   Duration  1.25s
```

1268 → **1285** tests: 4 on the decoded link `Trace`, 4 on `snapStation`, 2 on the base altitudes,
1 on the new `zBase` row, and the six the row's own coverage/decimal-mark/selector cases add.

### Files changed by this pass

`src/lib/app/state.ts` · `src/lib/app/state.test.ts` · `src/lib/terrain/trace.ts` ·
`src/lib/terrain/trace.test.ts` · `src/lib/rail/deduced.ts` · `src/lib/rail/deduced.test.ts` ·
`src/lib/format/quantity.ts` · `src/lib/format/quantity.test.ts` · `src/components/chart/profile.tsx` ·
`src/components/chart/chart-block.tsx` · `src/components/rail/inputs.tsx`. The prototype under
`src/routes/-prototype-07/` was not touched.

---

## Re-verification pass — 2026-08-14, independent, read-only on `src/**`

Every defect's own repro was re-driven in a fresh browser session by a second agent that changed
**no** `src/**` file (`git diff src/` byte-identical before and after this pass). **D1, D2 and D3
are gone; D4 is still present and is still the spec call nobody may close in a build ticket.**
All eight acceptance items were re-walked and all eight pass on measurement.

### Environment, measured not assumed

`HeadlessChrome/151.0.0.0` (X11; Linux x86_64), `agent-browser 0.34.0`, session
`scoutech-t33-re`, dpr 1. Viewports set with `set viewport` then read back:
`{vw:1440, vh:900}` and `{vw:390, vh:844}`. `navigator.maxTouchPoints 0`,
`matchMedia('(pointer: coarse)').matches false` — ticket 27's host limit re-confirmed, so every
44 px number below is a **CSS/computed-style fact, not a touch interaction**. Boxes from
`getBoundingClientRect()`, text widths from `Range.getClientRects()` (**the ⛔ glyph yields its own
rect on the same line** — line count is the number of distinct `top` values, not the rect count),
styles from `getComputedStyle()`, HTTP from `curl -s -o /dev/null -w '%{http_code}'`. The
orchestrator's dev server at `:3000` answered `200` and was reused; nothing was started or killed.
Fixtures unchanged: md5 `c342bd994d4c7b7a791963b85365c6b0` / `1bc70e5c63df15ea68aaebf0f9af85ec`.

### D1 — gone

`localStorage.clear()`, then the same 579-char-`tr` link (`curl` ⇒ **200**), waiting on `#rail-sa`
so the Skeleton frame is not mistaken for the app:

| Read-out | 1440 × 900 | 390 × 844 |
| --- | --- | --- |
| identity line | `tracé reçu par lien` | `tracé reçu par lien` |
| provenance | `Profil importé · 121 points · pas max 1,5 m` + `✓ Tracé rectiligne (écart max 0,00 m)` | identical |
| Valeurs déduites | Portée **180,0 m** · Dénivelé **-27,0 m** | identical |
| `sa` / `sb` | `0,0` / `180,0` | `0,0` / `180,0` |
| `RÉSULTATS` | populated — `T max (traversée) 1113,8 daN`, `Garde min (traversée) 9,90 m`, `passager à x 11,2 m` | identical |
| buttons | « Importer un profil… » + « Retirer le tracé » | identical |

Both previously unreachable identity states measured at **390 px** (`font-size 11px`,
`line-height 16.5px`, box **358 × 16,5**, `scrollWidth − clientWidth` 0 on the element and 0 on the
document): `tracé reçu par lien` **textW 94,5**, one line; `tracé reçu par lien (non utilisé)`
**textW 158,5**, one line — the § 4 fourth-state link variant, reached by pressing
« Retirer le tracé » on a link-received trace (`#rail-L` back to `150,0`, `#rail-h` to `-18,0`,
`[ Réutiliser ce tracé ]` `111,3 × 22,5`).

Adjacent, both held: **the Session still keeps its own filename** — a fresh import reads
`t33-profil-valide.csv` and reloading that exact URL still reads `t33-profil-valide.csv` with
`121 points` and Portée 180,0 m (§ 8's rule), and **amendment E still answers 200** —
`?v=1&tr=p1.@@@` gives `curl` **200** and renders « Ce lien ne peut pas être ouvert. / Tracé
illisible. / Ouvrir l'application sans ce lien » with no Rail and no crash in the lazy initialiser.

### D2 — gone

| Viewport | Measurement | Observed |
| --- | --- | --- |
| 1440 × 900 | both `[data-anchor]` targets | `44 × 48` at `(290 · 535,68)` and `(1394 · 535,68)`, `pointer-events: auto`, `cursor: grab`, `elementFromPoint` resolves to `[data-anchor]` itself at the centre **and** at both diagonal corners |
| 1440 × 900 | A dragged `312 → 360 → 450 → 500` at y 560 | `sa` **43,5** (= 1,5 × 29), Portée **136,5 m**, Dénivelé **7,1 m**, `Alt. base A` **505,9 m**; URL rewrote to `sa=43.5` (the rewrite is debounced — read it twice) |
| 1440 × 900 | B dragged `1416 → 1430 → 1439` (past the end) | `sb` stays **180,0**, no inline ⛔, **empty banner** — the clamp, not an error |
| 1440 × 900 | B dragged `1416 → 1380 → 1300` | `sb` **175,5** (= 1,5 × 117), Portée **132,0 m**, `Alt. base B` **510,5 m** |
| 390 × 844 | targets, then A dragged `24 → 60 → 110 → 140` at y 272 | `44 × 48`, `pointer-events: auto`, `cursor: grab`; `sa` **93,0** (= 1,5 × 62), Portée **87,0 m**, `Alt. base A` **486,1 m**, no error, document overflow 0 |
| both | provenance after every drag | `121 points · pas max 1,5 m` · `écart max 0,00 m` — unmoved, so the received Trace is re-derived and never mutated |

Hand-checked against the fixture, not read back from the app: `z(43,5) = 505,9`,
`z(175,5) = 510,5`, `z(93,0) = 486,1`. **Typed still beats the grid**: `#rail-sa` ← « 40,3 » holds
`40,3` and interpolates — Portée **139,7 m**, `Alt. base A` **508,0 m** (between the file's `509,0`
at 39,0 and `507,9` at 40,5). The **rider's own drag still works** — grab circle `22 × 22`,
`pointer-events: all`, dragged `772 → 880` at y 216 ⇒ `x_D` `75,0` → **92,2**, with `sa`/`sb`
untouched. After « Retirer le tracé » both anchor targets read `pointer-events: none` again at
both viewports, so § 5's manual-mode bracket stays non-interactive.

### D3 — gone

`Alt. base A` **540,0 m** · `Alt. base B` **513,0 m** on the fixture, at **1440 × 900 and
390 × 844**, printed beneath Portée and Dénivelé inside `VALEURS DÉDUITES` — the pair the ticket
expected (`z(0)`, `z(180)`). The values track a moved placement (`505,9` at `sa 43,5`, `510,5` at
`sb 175,5`, `486,1` at `sa 93,0`, `508,0` for the interpolated `40,3`) and **manual mode prints
neither row** (`/Alt\. base/` ⇒ `false` after « Retirer le tracé »). One pre-existing behaviour the
new rows inherit rather than break: in the degenerate `sa = sb` state the **whole** deduced block
(Portée, Dénivelé and both base rows) is empty, exactly as Portée/Dénivelé already were.

### D4 — still present, unchanged, and still not ours to decide

`#rail-sa` ← « 200,0 » on the valid fixture still renders
`⛔ Station hors du tracé (0,0 – 180,0 m). Valeur : 200,0 m.` with
`⛔ 1 erreur bloquante — aucun résultat` in the banner and `Aucun résultat` in the results slot.
§ 4's degenerate table and § 7's 17-row table both print an **integer** lower bound; § 3 gives
`Station` one decimal. Re-verifying does not change the reading, so it stays open: (a) the copy
tables are verbatim and `src/lib/rail/fields.ts` special-cases the bound, or (b) display precision
governs and both spec tables carry a typo. No acceptance item of this ticket depends on it.

### Also re-confirmed as open, not fixed

- **A dragged handle can still reach an error state through the *other* station.** Dragging A
  rightwards across B (`312 → 500 → 800 → 1100 → 1350 → 1420 → 1439` at y 560) gives `sa 180,0`,
  `sb 180,0`, inline `⛔ Portée nulle ou négative — l'ancrage B est avant l'ancrage A.`,
  `[ Inverser A et B ]` and the blocking banner — no crash. § 4 writes « bornée à l'extrémité du
  tracé » for the *extent* and « Clamping produces no error state » for the input handler, and says
  nothing about the other anchor: whether that sentence forbids a drag from reaching § 4's own
  `station B ≤ station A` row is a spec reading, and the shipped code takes the literal one. Left
  open. (The rendered string is § 7's line 4037 table, not § 4's line 1771 variant — the spec
  itself carries both, and § 7 is the copy table, so this is not a copy defect.)
- **When the inline import failure clears.** Still (c): after
  `⛔ t33-profil-invalide.csv — valeur illisible ligne 47, colonne Altitude.`, pressing
  « Retirer le tracé » leaves the message on screen (`/valeur illisible/` still matches).

### The eight items, re-walked

| # | Item | Status | Evidence |
| --- | --- | --- | --- |
| 1 | file workflow opens, button not drop zone | **pass** | `tagName BUTTON`, `accept=".csv,text/csv"`, `[ondrop],[data-dropzone]` ⇒ null; a capture listener on the hidden input counted **1** forwarded click at 1440 (button `117,7 × 22,5` at `(16, 381)`) and **1** at 390 |
| 2 | Trace-backed Terrain, **interactive** placements, derived read-outs | **pass** | Station fields replace Portée/Dénivelé; **both handles now drag** (D2 table); Portée 180,0 m · Dénivelé -27,0 m · Alt. base A 540,0 m · Alt. base B 513,0 m |
| 3 | spacing, count, filename, provenance match the file | **pass** | `Profil importé · 121 points · pas max 1,5 m`, `✓ Tracé rectiligne (écart max 0,00 m)`, identity `t33-profil-valide.csv`, **no** coarse-terrain ⚠ (1,5 m < 5 m), at both viewports |
| 4 | moving a placement re-derives without mutating the Trace | **pass** | typed `30,0`/`40,3`/`0,0` and pointer `43,5`/`175,5`/`93,0`; provenance triple never moves; back to `0,0` reproduces 180,0 / -27,0 |
| 5 | « Retirer le tracé » restores retained manual values | **pass** | `#rail-L 150,0`, `#rail-h -18,0`, `zA/zB 12,0`, Station fields gone, provenance `ℹ Terrain — ligne droite …`; URL settles to `L=150&h=-18` with **no** `sa`/`sb`/`tr` (read after the debounce) |
| 6 | cached inactive Trace, « Réutiliser ce tracé », four states fit at 390 px | **pass** | all four states measured at 390 in a 358 × 16,5 box, one line each, element and document overflow 0 — `(aucun tracé)` 69,6 · `t33-profil-valide.csv` 106,2 · `tracé reçu par lien` 94,5 · `Tracé en mémoire : t33-profil-valide.csv (non utilisé)` 273,5 · `tracé reçu par lien (non utilisé)` 158,5. « Réutiliser ce tracé » restores `sa 0,0` / `sb 180,0`, Portée 180,0 m, Dénivelé -27,0 m, the filename and `[ Retirer le tracé ]` |
| 7 | parse failure leaves Terrain untouched, names file + line | **pass** | `⛔ t33-profil-invalide.csv — valeur illisible ligne 47, colonne Altitude.` inside `Géométrie` with `[ Choisir un autre fichier ]`, **banner slot empty**; terrain still `t33-profil-valide.csv`, `sa 0,0`, `sb 180,0`, Portée 180,0 m, `121 points`. At 390 the string is **one** line, `span 356,4` in the 358 px box (2 client rects, 1 distinct top); at 1440 it wraps to 2 lines in the 255 px Rail |
| 8 | stable fixture, desktop **and** 390 px recorded | **pass** | same two fixtures, same md5s; every item above taken at `1440 × 900` and `390 × 844` read back from `innerWidth`/`innerHeight` |

### Gates — run by the re-verifier, real output

```
$ bun run typecheck        # tsc --noEmit
exit=0                     (no output)

$ bun run lint-type-aware  # oxlint --type-aware --type-check
exit=0                     (no output)

$ bun run test             # vitest run
 Test Files  39 passed (39)
      Tests  1288 passed (1288)
   Duration  1.28s
```

**1288, not the 1285 the fix pass reported** — three further cases landed in the shared tree from
other tickets' fixes in the same run; nothing red, and no file of this ticket's own was touched
after its gate. `bunx oxfmt --write` was **not** run by this pass: it edited only this markdown
file, which `.oxfmtrc.json` ignores.

### Host limits that bounded this pass

- **Coarse pointer / real touch unobservable** (`maxTouchPoints 0`, `(pointer: coarse)` false), so
  the `44 × 48` handle targets are a computed-style fact, not a verified touch interaction.
- **Headless Chrome loses a Rail press when the Rail has scrolled under it.** Two presses
  registered as no-ops until the control was re-measured: always re-read
  `getBoundingClientRect()`, hit-test with `elementFromPoint`, then `mouse move/down/up`. A
  listener attached to an element React later re-creates is silently lost too — re-attach it
  immediately before the press.
- **The URL rewrite is debounced**: `location.search` read in the same tick as a change still shows
  the old bag. Every URL claim above was read on a second call.
- No soft keyboard on this host (irrelevant to this ticket's items),
  `interactive-widget=resizes-content` remains unverifiable outside Safari.
