# A13 · The `agent-browser` point-to-point pass

Stage: A13
Status: open
Blocked by: 27
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 5, § 8, § 9, § 11 ·
[Amendments](../AMENDMENTS.md) **A**, **B**

## Delivers

Scripted `agent-browser` runs against the real app: the **four states amendment A left without an
automated check**, the **five measurements** § 10 A12 called manual, and the end-to-end walkthroughs no
unit test spans.

## The four inherited states

Specified behaviour unchanged — only the owner changed.

1. **The Skeleton** renders the Rail's five headings, both chart frames at `0,42 × W_inner`, the five
   read-out cells labelled, the banner band's height reserved — and **no control, no value, no « — »**.
2. **The refusal page** is the *index* route's `errorComponent`, served at **200** after a Skeleton
   frame — never the root's, which would replace the shell and leave no way back.
3. **« Saisie en cours »** keeps the last valid Sweep *marked as such* while suppressing the verdict
   and the URL write; the chart **freezes rather than dims**, and scrubbing goes **inert**.
4. **« Aucun résultat »** blanks the output half and leaves the strip a scrub track with its axes.

State 3's *rule* is unit-tested via form state (amendment D) — what is checked here is that the screen
actually behaves that way.

## The five measurements — now scripted, not hand-taken

`agent-browser` has a real layout engine, which is the only reason these can be automated at all.
They are also ticket 28's deletion gate, so **take them while the prototype still stands**.

1. The **three pixel budgets**, each summing to the viewport: **390×664 · 768×1024 · 1440×900**.
2. The **banner heights 44 / 60 / 76 px** — computed from Tailwind classes, never rendered. If the
   verdict wraps to four lines at 390 px, the resting rail loses its headroom over `MIN_RAIL`.
3. The **View Strip's label widths** — 93 + 76 + 111 + 128 px against 342 px available, 303 px
   abbreviated. The abbreviation threshold survives a 10 % error; **the fit at 342 px is tight**.
4. The **first-run auto-fit VE at ≈ ×1,5** on a 1080×420 plot, inside the Plot Aspect Band
   **[0,35 ; 0,50]** and clear of the **×1 floor**.
5. The **drag frame time** — p50 was 16,70 ms against a 16,7 ms vsync interval. Not portable to the
   Node bench, and it is one of the two independent reasons there is no Web Worker.

Also re-confirm **B2's 768 px threshold** on the real layout — its stated mechanism was measured under
the *rejected* flex sizing, and under the elected width-derived rule what breaks is the plot's
**width**. This is the one number the spec asks back.

## The walkthroughs

Point to point, each ending in a screen state a unit test cannot assemble:

- **A link arrives** — a full URL restores faithfully *including invalid state* (`L = −5` lights up
  form validation, it is not repaired); a partial one is **completed literally**; an unknown key is
  **ignored and named** in the strip and gone from the address bar after the rewrite; a refused link
  (two tightness drivers) shows the refusal page at 200.
- **An import** — « Importer un profil… » (a button, not a drop zone) through to anchors placed on the
  profile, `L`/`h` as read-outs, the spacing disclosure, and « Retirer le tracé » restoring the
  retained manual `L`/`h`. Then the **file-identity line's fourth state**, « Réutiliser ce tracé »,
  **at 390 px** — nobody has ever laid that line out with four states.
- **A family flip** — steel ⇄ textile with both Material Specs retained, and `PERMANENTE` + textile
  **disabled with its reason** rather than auto-switched.
- **A régime chosen** — « Résultats sans régime » (rows and grid **absent, not dashed**) becoming a real
  verdict, and the shipped line reading « Hors limites » under ACCT 10:1 without anything else breaking.
- **The narrow-screen keyboard** — the one part of the layout nobody has seen. The
  `interactive-widget` / `visualViewport` pair is untested, and the ~336 px keyboard height is a
  platform-typical figure, not a measurement.

## Notes

- **This is not a replacement for the unit suite** and must not duplicate it. Anything expressible as a
  pure function belongs in Vitest — the layout arithmetic, the gates, the banner reducer, the message
  and culprit tables, the codecs. This ticket owns what needs a real browser.
- **A state nobody scripts here is a state nobody checks.** That is the accepted cost of amendment A,
  and this ticket is where it is paid — so the four inherited states are obligations, not suggestions.
- **Ticket 28 is blocked on this ticket**, because the five measurements are its deletion gate. If you
  want the prototype gone sooner, split this ticket at the measurements — the walkthroughs do not gate
  deletion.
- Do not assert microsecond timings here. Frame time is the only timing worth taking in a browser.
