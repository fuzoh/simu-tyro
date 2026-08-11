# Responsive and narrow-screen layout for the profile view

Type: grilling
Status: open
Blocked by: — (07 resolved)
Map: [Zip-line simulator v1](../map.md)

## Question

The spine is now fixed, so the phone question is finally askable. On desktop the app is a
280 px parameter rail beside a vertical stack of **verdict banner · profile chart · clearance
strip · five-cell read-out row** — roughly 1000 px of horizontal furniture and four stacked
horizontal bands. At 390 px wide none of that survives intact.

Settle:

1. **What happens to the rail.** A bottom sheet, a tab beside the chart, a collapsible
   accordion above it, or a separate screen? Note that ticket 04's field table is long — five
   groups plus Valeurs déduites — so it is not a thing that shrinks.
2. **Do both charts survive.** The clearance strip is the reason the failure is unmissable
   (ticket 07 §1), so dropping it on mobile drops the strongest safety signal — but two charts
   in ~400 px of height leaves each of them ~150 px, and the profile is already the squeezed
   one. Options: keep both at reduced height, make them a swipeable pair, collapse the strip to
   a thin sparkline with just the zero crossing marked, or fold the clearance curve *into* the
   profile as a shaded margin.
3. **The five read-out cells.** They are tabular numbers in a single row; at 390 px that is
   ~78 px per cell. Wrap to two rows, scroll horizontally, or reduce to a subset with the rest
   behind a disclosure — and if a subset, which cells are non-negotiable.
4. **The three input paths.** Ticket 07 chose scrub-on-strip + drag-the-marker + typed field.
   On touch: dragging a marker with a finger over a 150 px-tall chart is imprecise, scrub on a
   thin strip is worse, and typing needs a keyboard that covers half the screen. Decide which
   survive and whether touch gets an affordance the mouse does not (a stepper, a larger hit
   area, momentum).
5. **Orientation.** A zip-line profile is intrinsically wide. Is landscape the expected mobile
   posture — and if so, does the app say so, or just work badly in portrait?
6. **Where the breakpoints are**, in terms of what fails at each — not in terms of device
   names.

## Context

Graduated from the map's **Not yet specified** on resolution of
[Profile visualisation prototype](./07-profile-visualisation-prototype.md), which is what made
the question specifiable: before the spine existed there was nothing concrete to reflow.

Ticket 07's prototype is the place to try this — set the viewport narrow on
`/prototype/profile-view?variant=D` and watch what breaks first. Its layout is plain flex, so
reflow experiments are cheap.

Constraints already fixed and not up for re-litigation here: the read-outs stay **outside the
plot area** (ticket 07 §1 — occlusion), vertical exaggeration stays **auto-fit and disclosed**
(ticket 02, ticket 07 §6), and the clearance failure must remain **impossible to miss**
(ticket 07 §7) whatever the screen size. That last one is the hard constraint on any answer
that proposes dropping a chart.

Tailwind v4 conventions: `docs/conventions/ui.md`. No new dependency for layout.

**Inherited from [CSV profile import](./06-csv-profile-import-and-anchor-placement.md)** — the
two charts share **one x domain** (span + 5 % margin, clamped to the trace extent), because
ticket 07's scrub track *is* the clearance curve aligned under the profile. That makes the shared
domain a hard constraint on any reflow proposed here, alongside ticket 07 §7's: a layout that
stacks the two charts must keep their x axes **pixel-aligned**, and one that puts them
side by side breaks the mechanism outright.

Two smaller additions to the reflow surface:

- **Four more fields** in the Géométrie group when a trace is loaded — station A/B alongside the
  existing `hauteur d'ancrage` A/B — plus `L`, `h` and both base altitudes moving into
  **Valeurs déduites**. The panel is denser in imported mode than in manual mode, so whichever
  narrow-screen treatment is chosen has to hold the denser case.
- **Draggable anchor markers on the profile chart**, in addition to ticket 07's rider marker.
  Three drag targets on one chart is a touch-target question at narrow widths, and the anchor
  markers sit at the domain's edges where they are most likely to collide with axis labels or the
  viewport boundary.

**Inherited from [Results panel](./08-results-panel-and-provenance-warnings.md)** — the rail this
ticket has to reflow is materially larger than the input rail it was scoped against.

It is now **one scrolling column with an input half and an output half**, five sections:
`Paramètres → Valeurs déduites → Résultats → Provenance → Ce que cet outil ne calcule pas`. A
right-hand results column was rejected there precisely because the chart needs the width, so the
narrow-screen treatment cannot fall back on "move the results elsewhere" — there is nowhere else.
Two specifics that bite at narrow widths: `Résultats` carries four headline values plus ~nine
detail rows under a scope header (« sur toute la traversée ») whose distinction from the strip's
« à la position du passager » must survive any reflow that brings the two closer together; and
`Provenance` holds an always-visible terrain block plus an expandable aggregate list.
