# Scoutech

Zip-line (tyrolienne) simulator for spans over 50 m. This glossary covers the
**application** vocabulary only — the terms the app invents to talk about the physics.

The **physics** vocabulary (span, sag, chord, pretension, unstretched length, material
coordinate, `MBF`/`MBL`, termination efficiency…) is fixed in
[docs/simulation-theory.md §1](docs/simulation-theory.md) and is not repeated here. That
table is FR↔EN and binding: French for the UI, English identifiers for code.

## Language

### The line and how it is specified

**Span**:
One zip line, anchor to anchor. Always exactly one span — there are no intermediate
supports and no multi-span lines.
_Avoid_: line, cable run, section

**Brins porteurs**:
How many load-bearing members one Span carries: one or two. Two means both carry the
rider and the trolley splits the load; on textile that is the usual redundant rig, both
tensioned similarly. Not a second Span, and not an unloaded spare.
_Avoid_: montage, double tyrolienne, redondance (when that means a slack backup), twin span

**Mise en tension**:
The device that tensions the line and holds it. A Maestro is a progress-capture pulley
used in place of a mouflage. Distinct from a termination: it does not set termination
efficiency.
_Avoid_: montage, terminaison, ancrage

**Tightness Spec**:
The user's chosen way of saying how tight the line is: unstretched length directly, a
target installed tension, or a target unloaded sag. Whichever is chosen, it resolves to an
unstretched length before anything is computed.
_Avoid_: tension mode, pretension setting, parameterisation mode

**Tightness Driver**:
Which one of the four tightness quantities — target sag, tension, unstressed length and
V ratio — is the editable one. Exactly one is the driver and the other three are
read-outs derived from it, so the driver is state: it is encoded by *which key is
present* (`fl` / `te` / `lo` / `vr`), never by a mode key beside a
value. Two drivers arriving at once is a contradiction, not a preference, and the link
is refused whole.
_Avoid_: tightness mode, active field, `tm`, parameterisation mode

**Material Spec**:
The description of what the line is made of — steel wire rope or textile rope — from which
weight per unit length, axial stiffness and breaking strength are derived. Steel and
textile are separate specs, never variants of one.
_Avoid_: cable spec, rope config, product

**Terrain**:
The ground beneath the line. One concept with two sources: a straight ground line joining the
two anchor bases, or a profile read from an imported Trace. The simulation never distinguishes
them — the straight line is just the two-point case.
_Avoid_: ground profile, elevation data, topography

**Trace**:
A ground profile the app *received* rather than computed: distance and altitude samples
along a line drawn on a map. It enters two ways — an imported CSV, which keeps its
filename and its own coordinates, or « tracé reçu par lien », which arrives with **no
file and no filename** and carries straightness as one scalar `dev` instead of
coordinates. Either way it is held exactly as received and never resampled or smoothed,
so point count and sample spacing are disclosed properties and Terrain is derived from
it. A Trace can sit cached in the Session while not being the active terrain source.
_Avoid_: track, GPX, elevation profile, path, uploaded file

**Station**:
A distance along the Trace, measured from the Trace's own start. Distinct from `x`, which is
horizontal distance from Anchor A — converting between them is the one translation the import
performs.
_Avoid_: offset, position, distance along track

**Anchor Placement**:
Where an anchor sits on a Trace: a Station plus an Anchor Height above the profile at that
Station. The two Placements are what the user edits once a Trace is loaded; Span and Elevation
Difference are then derived, not entered.
_Avoid_: anchor position, pin, marker

**Anchor Height**:
How far an anchor stands above the ground beneath it. Feeds the Terrain only, never the
statics — the solve takes span and elevation difference, which are measured anchor to anchor.
_Avoid_: pole height, tower height, offset

### What is saved and shared

**Scenario**:
The line as a shareable thing: every input needed to reproduce one Verdict, and nothing
else. A Scenario holds only the *active* configuration — the active Material Spec, the
active terrain source — never a retained alternate. This is what a link carries.
_Avoid_: state, config, params, model

**Session**:
What the browser remembers between visits: the Scenario plus everything retained around
it — both Material Specs, the manual geometry kept behind an import, the imported Trace,
display preferences. Strictly larger than a Scenario. A link always wins over a Session;
the two are never merged.
_Avoid_: local state, storage, cache, draft

**First-Run Scenario**:
The one named constant the app opens with when there is neither a link nor a Session. It
has three jobs, which is why it is a term and not a pile of defaults: the opening
screen, the target of « Réinitialiser le scénario », and the source every value a
partial link omitted is completed from. Its measured outputs are frozen by a regression
test, so the opening screen cannot move silently.
_Avoid_: default scenario, demo, example, seed values

### What the simulation produces

**Span State**:
The resolved statics of the line at one instant — the tension components that satisfy both
anchors, plus what follows from them. Everything drawn or reported derives from a Span
State.
_Avoid_: solution, result, snapshot

**Solve**:
One resolution of a Span State from a set of inputs. Either succeeds, possibly with notes
worth showing the user, or fails with a named reason.
_Avoid_: computation, run, simulation step

**Sweep**:
The rider's whole traverse, precomputed: the Span State at every position along the line.
Recomputed whenever a parameter changes, never while the rider moves.
_Avoid_: trajectory, animation, scan

**Sweep Step**:
One rider position within a Sweep, with the statics that hold there. The rider slider
selects a Sweep Step; it does not trigger a Solve.
_Avoid_: frame, sample, position

**Coverage**:
The fraction of a Sweep whose steps actually solved. Anything derived from an incomplete
Sweep — worst tension, minimum clearance, the Verdict — is unreliable and must say so.
_Avoid_: completeness, success rate

**Traverse scope vs Position scope**:
The two scopes a reported number can have: over the whole traverse (« sur toute la
traversée ») or at the rider's current position (« à la position du passager »). **The
Verdict only ever judges Traverse scope.** Every number states its scope three times
over — section header, row label and a parenthetical — because a reader who takes a
Position number for the traverse worst case signs off a line that fails 20 m further
along.
_Avoid_: envelope vs instant, global vs local, min vs current, worst case

### Safety

**Verdict**:
The app's answer to "is this line safe?" — the worst tension over the whole traverse and
the minimum clearance over the whole traverse, judged against a chosen safety regime.
Never judged from the rider's current position.
_Avoid_: check, validation, safety result

**Verdict State**:
Which of five the Verdict is in: « Dans les limites », « Marge faible »,
« Hors limites », « Refusé — usage interdit », « Indéterminé ». Five because each maps to
a *different user action*, not because severity has five levels — a regulator's
prohibition survives an ample margin, and an incomplete traverse suppresses the
judgement rather than qualifying it. The banner is one sentence naming the governing
criterion and the chosen regime, never « conforme ». « — » belongs to « Indéterminé »
alone.
_Avoid_: status, severity, pass/fail, rating, compliance

**Safety Regime**:
A named, provenance-labelled set of safety rules the user selects between (EN 15567,
WorkSafe QLD, challenge-course practice, rescue-textile practice). Regimes are never
blended and never silently defaulted.
_Avoid_: safety factor, coefficient, standard

**Résultats sans régime**:
The shape `Résultats` takes while no Safety Regime is chosen — the app's own opening
state. The two regime-free headline values stay complete, the four `k`-dependent rows
are **absent, not dashed, not blank, not zero**, and the banner slot carries a neutral
prompt with no colour and no icon. Colouring the absence of a judgement would be a
judgement, and a screenshot of it must not read as a pass.
_Avoid_: no verdict, pending verdict, unrated, empty results

**Rider Envelope**:
The vertical space the rider occupies below the cable — lanyard plus body. Subtracted in
full when clearance is measured.
_Avoid_: rider height, lanyard length, offset

**Rider Contact**:
Clearance has gone negative: the rider would strike the ground, though the cable itself is
still clear.
_Avoid_: collision, ground hit

**Cable Contact**:
The cable itself reaches the ground. Strictly worse than Rider Contact, and an error state
— never something the simulation iterates into.
_Avoid_: touchdown, grounding

### The screen

**Page**:
A routed screen with its own layout and its own information set. The app is several
Pages. The Rail is a layout a Page may use, not the navigation model.
_Avoid_: espace, mode, panel, view

**Rail**:
The app's one scrolling column: Rail Header, then `Paramètres → Valeurs déduites →
Résultats → Provenance → Ce que cet outil ne calcule pas`. Its upper sections take input
and its lower sections report, but **there is no results panel and no second column** —
a right-hand column was rejected because it steals the width a 1500 m span needs, and a
region under the read-out cells was rejected for pushing them below the fold. Five
sections, fixed order, one scroll.
_Avoid_: results panel, output half as a place, sidebar, right column, form

**Rail Header**:
The single action row at the top of the Rail, above `Paramètres` and scrolling with it:
the app's name, the force-unit selector, « Copier le lien », and an overflow menu
holding « Réinitialiser le scénario » and « Effacer la session ». Not a sixth section —
it holds no parameter, no read-out and no disclosure — and not an app bar: the document
root carries no visible chrome, and at 390 px a title bar is paid for out of the form's
own height.
_Avoid_: app bar, toolbar, navbar, page header, chrome

**Chart Block**:
The banner slot, profile chart, clearance strip, View Strip and five read-out cells as
one co-visible unit sharing a single x scale and a single gutter constant. It reflows
and collapses as a whole; no member is ever hidden or occluded on its own.
_Avoid_: chart area, main pane, right column, canvas

**View Strip**:
The one control row inside the Chart Block, below the clearance strip and above the
read-out cells: the two layer toggles, the « ×1 vraie échelle » control, and the numeric
rider-position field. It lives here rather than in the Rail because at narrow widths the
Rail is not co-visible with the chart, so a chart control in the Rail would answer a
question whose answer is off screen.
_Avoid_: toolbar, chart controls, options bar, legend

**Handle Lane**:
The 24 px band between the bottom of the profile's plot area and its x-axis labels,
holding the two draggable anchor handles — outside the plot area, so they can never be
confused with the rider. Reserved at every width and in both terrain modes: in manual
mode it draws the non-interactive span bracket, so the profile's height never changes on
import.
_Avoid_: handle row, anchor bar, gutter, axis area

**Pinned Safety Header**:
What the Chart Block collapses to when the Rail scrolls, a field takes focus, or the
block cannot fit: the banner slot plus one live « Garde min » cell, down to a single row
while the soft keyboard is open. The banner slot carries whichever occupant precedence
gives it, never only a Verdict. Derived from scroll, focus and available height — never
persisted, and never a toggle.
_Avoid_: sticky header, mini banner, collapsed chart, HUD

**Plot Aspect Band**:
The range of profile-plot inner height over inner width — **0.35 to 0.50** — inside
which auto-fit vertical exaggeration stays within its verified window. The plot
letterboxes rather than leave the band, and its height is derived from its own width,
never from the window's height: a flex ratio makes exaggeration a function of window
height, which is how the desktop was already out of band.
_Avoid_: chart ratio, plot proportions, flex ratio, aspect ratio

**Skeleton**:
The frame the server renders below the document, and the only thing it renders: the
Rail's five section headings in order, the app's name, two empty chart frames at final
proportions, and the read-out cells' labels. It carries no number, no Verdict, no
spinner, no « — » and no live control — only reserved height where one will be. Same CSS
layout as the app, so it is correct at every width for free, and replaced wholesale at
hydration.
_Avoid_: loader, loading state, placeholder, spinner, shell (the shell is the document)

### When something is wrong

**Blocking Error**:
A validation failure that suppresses output until it is repaired, always rendered twice:
the Champ responsable carries the message and its Fix Action, while the banner slot
carries only the count and a jump link. Each names the gate it breached — Solve,
Clearance or Verdict — because the gates suppress different things, and Blocking Errors
are a **list**, never a singleton: repairing one leaves the others standing rather than
cascading a silent second fix.
_Avoid_: validation error, fatal error, invalid state, form error

**Fix Action**:
A button offered beside a Blocking Error that performs the repair in one press — a
general affordance of the error surface, not a per-error extra. Its label describes the
**effect of pressing it** (« Passer à l'acier »), never the act that produced the state,
because the state may have arrived in a link rather than been typed.
_Avoid_: quick fix, auto-correct, suggestion, undo

**Champ responsable** (Culpable Field):
The editable field a hard check on a derived read-out is attributed to, fixed by a
static (quantity × mode) table rather than inferred at runtime. **No hard check ever
renders only on a read-out.** Where several fields could repair one violation, the
message and its Fix Action anchor to the first in table order and the others carry the
error outline only.
_Avoid_: source field, origin, blamed input, root cause

**Tension impossible**:
No Span State exists because the requested tightness would exceed the line's breaking
load — the chord bound, which measurement shows *is* the breaking load. Distinct from a
Verdict of « Hors limites », which judges a line that does exist. The copy carries the
attainable bound in the driving field's own quantity and offers **no Fix Action**,
because no unambiguous repair exists.
_Avoid_: overtension, rupture, invalid length, solver error

**Saisie en cours**:
A required field is empty and being edited. Not an error: the last complete Sweep stays
on screen under an explicit mark, the Verdict is suppressed, and the URL and Session
writes are **suspended** so the address bar keeps the last complete Scenario. Leaving
the field still empty ends it — the state becomes « Aucun résultat », where a
*committed* invalid value blanks every solve-dependent read-out rather than keeping a
superseded number.
_Avoid_: dirty state, pending, incomplete form, stale

### Provenance

**Unconfirmed Default**:
A shipped value whose source is paywalled, conventional or unverified. Always labelled,
always user-editable, always carrying a warning, and never presented as normative.
_Avoid_: default, assumption, constant

**Provenance Chip**:
The single « non confirmé » pastille worn by any value standing on a `[PAYWALLED]`,
`[CONVENTION]` or `[UNVERIFIED:R1]` source. One level, not a seven-tag taxonomy on
screen — the finer tags live in the popover — because the only decision it supports is
« accept this number or type my own ». A chip can ride on a Verdict, not just a field;
editing a value flips it to « valeur utilisateur » but never drops it from the aggregate
count.
_Avoid_: badge, tag, trust level, tooltip, asterisk

**Warning Tier**:
Which of three registers a warning speaks in: *ambiant* (plain state text beside the
value, no ⚠), *avertissement* (⚠ inline on the row it qualifies), or *verdict* (the
banner, state « Refusé — usage interdit »). The tier follows from what the reader must
do about it, never from how bad it sounds — a condition that fires always is ambient,
because an alarm that fires always means nothing.
_Avoid_: severity, warning level, alert, notice, info

**Override**:
A steel derived value (`MBF`, `EA`, `μ`) typed over its formula — a datasheet beating
our own correlation. Per value, persistent, and steel-only: textile's `MBL` and `μ` are
already direct inputs. An overridden read-out becomes its own Champ responsable, and
overriding `MBF` downgrades the one `[STD-ATTESTED]` derived value the app has, so it
joins the aggregate count.
_Avoid_: manual value, custom value, patch, edit

**Stale Badge**:
What an Override gains when `d`, grade or construction moves under it: the entered value
stays, and beside it the formula's new value with a one-click « Recalculer ».
Non-blocking. **Derived, never carried** — recomputed on every load and every link
arrival by comparing each Override against the formula *at the field's display
precision*, because a link from a sender whose override was stale would otherwise arrive
looking fresh.
_Avoid_: dirty flag, outdated, mismatch warning, invalid