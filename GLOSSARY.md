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
supports and no multi-span lines. French, unqualified: **ligne**. **Ligne A–B** is that
span drawn straight between the anchors, not the sagging member and not a corde.
_Avoid_: line, cable run, section, corde (for the chord), droite A–B

**Brins porteurs**:
How many load-bearing members one Span carries: one or two. Two means both carry the
rider and the trolley splits the load; on textile that is the usual redundant rig, both
tensioned similarly. Not a second Span, and not an unloaded spare. Daily speech does not
say brin for a member: one member is a ligne, two are **ligne du haut** and **ligne du bas**. A **brin** is a metallic strand inside a câble.
_Avoid_: montage, brin (for a member), double tyrolienne, redondance (when that means a slack backup), twin span

**Mise en tension**:
The device that tensions the line and holds it. A Maestro is a progress-capture pulley
used in place of a mouflage. Distinct from a termination: it does not set termination
efficiency.
Montage is the act of installing the line (« on va monter »), not this device and not a catalogue of rigs. The point and its height are an ancrage. The manufactured end of the corde or câble is a terminaison, and it is not this device.
_Avoid_: montage, terminaison, ancrage

**Tension de pose**:
The tension wanted on the unloaded line. The same quantity as prétension. Simplified Pages
say tension de pose; Avancé says prétension.
_Avoid_: tension cible, tension permanente, pretension setting

**Majoration au départ**:
The multiplier on the passager's extra tension because a controlled step-off sets the passager in motion. Not the static supplement the weight already produces, and not a limit. Default 1,2. Simplified Pages assume it and do not ask. Avancé names the field majoration au départ.
_Avoid_: coefficient dynamique, DAF, limite, marge

**Rapport V**:
A way to ask for the unloaded tension: passenger weight divided by horizontal tension de pose. Not the measured depth of the V. A larger rapport V asks for a slacker line, and the deep V under the passager is the consequence. Named only on Avancé.
_Avoid_: poids / tension, creux, flèche

**Tightness Spec**:
The user's chosen way of saying how tight the line is: unstretched length directly, a
target installed tension, a target unloaded sag, or a target V ratio. Whichever is chosen,
it resolves to an unstretched length before anything is computed.
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
textile are separate specs, never variants of one. French, on every Page: a textile member is a **corde**, a metallic member is a **câble**. On a corde, gaine and âme are both fibre, and neither is a field. On a câble, the two constructions are **6×19** and **6×19 métallique** — no âme, no gaine.
_Avoid_: cable spec, rope config, product, textile, acier, âme, gaine

**Terrain**:
The ground beneath the line. One concept with two sources: a straight ground line joining the
two anchor bases, or a profile read from an imported Trace. The simulation never distinguishes
them — the straight line is just the two-point case.
_Avoid_: ground profile, elevation data, topography

**Trace**:
A ground profile the app *received* rather than computed: distance and altitude samples
along a line drawn on a map. French: **profil** — the cut of the ground under the line,
altitudes side by side. The cut view uses the same word. It always runs from Anchor A to
Anchor B: its first sample is under A, its last under B. It enters three ways — an
imported CSV, which keeps its filename and its own coordinates; a **profil geo.admin**,
fetched between the two Positions; or « profil reçu par lien », which arrives with **no
file and no filename**. Either way it is held exactly as received and never resampled or
smoothed, so point count and sample spacing are disclosed properties and Terrain is
derived from it. A Trace can sit cached in the Session while not being the active terrain
source.
_Avoid_: tracé, track, GPX, path, uploaded file

**Station**:
A distance along the profil, measured from the profil's own start. French: **distance**.
Read out on hover only: the anchors are never placed at a Station, they are the profil's
two ends. Distinct from `x`, which is horizontal distance from Anchor A.
_Avoid_: station (as the spoken word), offset, position, distance along track, anchor placement

**Anchor Height**:
How far an anchor stands above the ground beneath it. Feeds the Terrain only, never the
statics — the solve takes span and elevation difference, which are measured anchor to anchor.
French: ancrage. An amarrage would be heard as the termination. In the Vue 3D it is read on
the Fil à plomb: the anchor sits that high above the ground mark.
_Avoid_: pole height, tower height, offset, amarrage

**Position**:
Where an anchor stands on the earth: its geographic coordinates (WGS84 or LV95). Set by a
click or a drag on the Fond de carte, or typed. Two Positions fix a Trace end to end; moving
one means a new line between two points, not an anchor slid along the old profil.
_Avoid_: marqueur, marker, pin, point GPS, waypoint, anchor placement

### What is saved and shared

**Scenario**:
The line as a shareable thing: every input needed to reproduce one Verdict, and nothing
else. A Scenario holds only the *active* configuration — the active Material Spec, the
active terrain source, the two Positions when they are known — never a retained alternate.
This is what a link carries; the Fond de carte is not part of it.
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
_Avoid_: descente, envelope vs instant, global vs local, min vs current, worst case

### Safety

**Verdict**:
The app's answer to "is this line safe?" — the worst tension over the whole traverse and
the minimum clearance over the whole traverse, judged against a chosen safety regime.
Never judged from the rider's current position.
_Avoid_: check, validation, safety result

**Verdict State**:
Which of five the Verdict is in: « Dans les limites », « Marge faible »,
« Hors limites », « Interdit », « Indéterminé ». Five because each maps to
a *different user action*, not because severity has five levels — a prohibition survives an
ample margin, and an incomplete traverse suppresses the judgement rather than qualifying it.
The banner names why it is Interdit. Never « conforme », never « hors norme ».
« — » belongs to « Indéterminé » alone.
_Avoid_: usage interdit, hors norme, status, severity, pass/fail, rating, compliance

**Terminaison**:
The manufactured end of a corde or a câble — sewn eye, splice, knot, clamps. It sets termination efficiency. Not an ancrage, which is the point and its height. Named only on Avancé.
_Avoid_: ancrage, amarrage, montage

**Longueur à vide**:
The unstretched length. Simplified Pages say longueur à vide; Avancé says longueur non tendue.
_Avoid_: longueur de corde, longueur de corde à vide

**Flèche**:
The sag. Unqualified, the unloaded sag wanted on the line. **Flèche chargée** is the sag with the passager on the line. Avancé says flèche à vide for the unloaded one.
_Avoid_: cible, flèche cible

**Installation**:
Whether the line is built to stay: **installation permanente** or **installation temporaire**. A corde in a permanent installation is refused. Not a usage.
_Avoid_: usage, type d'usage

**Facteur de sécurité**:
The ratio of available strength to the judged tension, compared with the marge exigée. Simplified Pages spell it out. Avancé may write FS. Not a percentage.
_Avoid_: coeff, coefficient, pourcentage

**Ligne à vide**:
The unloaded line, drawn. Not the longueur à vide, which is a length.
_Avoid_: câble à vide, corde à vide

**Banane**:
The lateral bow of the unloaded line in a cross-wind, seen from above. Qualitative. Not a distance the app states in metres.
_Avoid_: déport, drift, flèche latérale

**Marge exigée**:
The margin the chosen Safety Regime demands. Not the margin the line actually has — that
result is Marge faible, or a number.
_Avoid_: marge de sécurité, norme, régime (as the simplified label)

**Safety Regime**:
A named, provenance-labelled set of safety rules the user selects between (EN 15567,
WorkSafe QLD, challenge-course practice, rescue on a corde). Regimes are never
blended and never silently defaulted. Avancé calls the selector régime de sécurité;
simplified Pages call it marge exigée.
_Avoid_: safety factor, coefficient, standard, marge de sécurité

**Résultats sans régime**:
The shape `Résultats` takes while no Safety Regime is chosen — the app's own opening
state. The two regime-free headline values stay complete, the four `k`-dependent rows
are **absent, not dashed, not blank, not zero**, and the banner slot carries a neutral
prompt with no colour and no icon. Colouring the absence of a judgement would be a
judgement, and a screenshot of it must not read as a pass.
_Avoid_: no verdict, pending verdict, unrated, empty results

**Passager**:
The person travelling on the line. A load magnitude on a line or a fitting is a charge, not a passager.
_Avoid_: personne, charge

**Point d'arrêt**:
Where the passager comes to rest on the line short of the arrival. Without wind it is the
low point of the loaded line plus friction; wind only shifts it. Computed first without wind,
then with the wind entered.
_Avoid_: blocage, point mort, position finale, arrêt par le vent (as the only cause)

**Rider Envelope**:
The vertical space the rider occupies below the cable — pulley, lanyard and body. Subtracted in
full when clearance is measured. French, on every Page: **gabarit du passager**.
_Avoid_: empreinte, hauteur du passager, enveloppe, maître-couple, rider height, lanyard length, offset

**Garde au sol**:
The distance from the passager to the ground. The minimum is where, over the traverse, the
passager comes closest to the ground. At the passager's position it is the same quantity,
not a second name. The maximum is the inverse and is not a shown value.
_Avoid_: garde sous le passager, garde passager

**Garde exigée**:
The garde au sol the user refuses to go under. Not the computed garde.
_Avoid_: garde min. admise, garde minimale

**Garde min. ligne**:
The closest the loaded line comes to the ground along the span at one passager position.
It may sit away from the passager. Not a garde au sol.
_Avoid_: garde au sol, garde passager

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

### The map

**Fond de carte**:
The swisstopo rendering under the vue de dessus: carte claire (default), orthophoto
swissimage or carte nationale. A display choice, never part of the Scenario; without
network or outside swisstopo coverage the vue de dessus keeps its drawing on a plain
background.
_Avoid_: basemap, map layer, tiles, carte (for the rendering itself)

**Couche pentes**:
The swisstopo « pentes supérieures à 30° » overlay, switched on over any Fond de carte, in
2D and draped in the Vue 3D. An overlay, not a fourth Fond de carte.
_Avoid_: slope layer, hillshade, relief

**Vue 3D**:
The relief view of the line: swisstopo terrain and imagery, both anchors on their Fils à
plomb, Ligne à vide and loaded line from the engine, and the Banane. Context, not
measurement: it states nothing the coupe does not. Anchors drag there as on the carte: the
line follows the pointer, the recalculation waits for the release. Loaded only when chosen.
_Avoid_: 3D map, globe, scene, viewer

**Fil à plomb**:
The vertical under each anchor in the Vue 3D: a mark on the ground at the anchor's foot
and a dashed line rising from it until it leaves the view, so it reads at any zoom. The
anchor is the point on that line at its Anchor Height. Always shown, never a measurement.
_Avoid_: pole, mast, drop line

**Mesure**:
The one-line ruler on the vue de dessus: two clicked points, a third click starts over.
Reports the horizontal distance, the straight distance between the two points and the
distance along the ground. Never saved.
_Avoid_: measure tool, ruler, polyline, outil de distance

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
banner, state « Interdit »). The tier follows from what the reader must
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