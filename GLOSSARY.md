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
used in place of a mouflage (the default); the Maestro S and L exist on a corde only. Distinct from
a termination: it does not set termination efficiency. It is descriptive: it changes no result, and
only selects the **limite de tension**, the working load Petzl publishes for that Maestro at the rope
diameter typed — never the slip threshold, and slipping is not a fuse. The limit is read against the
greatest tension one line carries at the côté de la Mise en tension over the whole traverse (« T max
ancrage A/B »: normal split between the Brins porteurs, majoration au départ included), not against
the tension de pose, since the device holds the line while the rider is on it; with no result there is
nothing to compare. Exceeding it is an Avertissement only: it changes no result.
The **côté de la Mise en tension** is the anchor, A or B, that carries it.
Montage is the act of installing the line (« on va monter »), not this device and not a catalogue of rigs. The point and its height are an ancrage. The manufactured end of the corde or câble is a terminaison, and it is not this device.
_Avoid_: montage, terminaison, ancrage

**Tension de pose**:
The tension wanted on the unloaded line, read **at the anchor that carries the Mise en
tension**, per member: what a dynamometer rigged between that ancrage and the Maestro
shows. That anchor is A or B, held by the Scenario (`cp`; absent is A). It is a Tightness
Driver of its own (`tp`), not the horizontal component `H`; Avancé shows that one beside it
as tension horizontale. Simplified Pages say tension de pose; Avancé says prétension.
_Avoid_: tension cible, tension permanente, pretension setting, tension horizontale (as the
simplified label)

**Tension à vide**:
The largest anchor tension of the unloaded line, as a share of the breaking load. A
reading of the line as installed, not a wanted value and not the tension de pose. Named only
on Avancé.
_Avoid_: tension permanente, tension de pose

**Majoration au départ**:
The multiplier on the passager's extra tension because a controlled step-off sets the passager in motion. Not the static supplement the weight already produces, and not a limit. Default 1,2. Simplified Pages assume it and do not ask. Avancé names the field majoration au départ.
_Avoid_: coefficient dynamique, DAF, limite, marge

**Rapport V**:
A way to ask for the unloaded tension: passenger weight divided by the tension horizontale `H`. Not the measured depth of the V. A larger rapport V asks for a slacker line, and the deep V under the passager is the consequence. Named only on Avancé.
_Avoid_: poids / tension, creux, flèche

**Tightness Spec**:
The user's chosen way of saying how tight the line is: unstretched length directly, a
target tension de pose, a target horizontal tension, a target unloaded sag, or a target V
ratio. Whichever is chosen, it resolves to an unstretched length before anything is computed.
_Avoid_: tension mode, pretension setting, parameterisation mode

**Tightness Driver**:
Which one of the five tightness quantities — target sag, tension de pose, horizontal
tension `H`, unstressed length and V ratio — is the editable one. Exactly one is the driver
and the other four are read-outs derived from it, so the driver is state: it is encoded by
*which key is present* (`fl` / `tp` / `te` / `lo` / `vr`), never by a mode key beside a
value. `tp` is the tension de pose, the one the simplified Pages drive; `te` is `H`, still
valid for the links that carry it. Two drivers arriving at once — any two of the five — is a
contradiction, not a preference, and the link is refused whole.
French, on Avancé: the **pilote de tension** — the segmented control that says which of the five is typed. Simplified Pages have no such control.
_Avoid_: tightness mode, active field, `tm`, parameterisation mode

**Material Spec**:
The description of what the line is made of — steel wire rope or textile rope — from which
weight per unit length, axial stiffness and breaking strength are derived. Steel and
textile are separate specs, never variants of one. French, on every Page: a textile member is a **corde**, a metallic member is a **câble**. On a corde, gaine and âme are both fibre, and neither is a field. On a câble, the two constructions are **6×19** and **6×19 métallique** — no âme, no gaine. Choosing one of the two is the **famille de ligne**. The fields both carry are the **diamètre** (**diamètre nominal** on Avancé) and the charge de rupture; Avancé adds the **classe de corde**, the grade, the raideur and the **raideur relative EA/MBL**, which is the raideur over the charge de rupture.
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
French: **hauteur d'ancrage**, and the pair are the **ancrages**. An amarrage would be heard as the termination. In the Vue 3D it is read on
the Fil à plomb: the anchor sits that high above the ground mark.
_Avoid_: pole height, tower height, offset, amarrage

**Position**:
Where an anchor stands on the earth: its geographic coordinates (WGS84 or LV95). Set by a
click or a drag on the Fond de carte, or typed, as **latitude** and **longitude**; a Position read off the map is **approchée** until it is typed. Two Positions fix a Trace end to end; moving
one means a new line between two points, not an anchor slid along the old profil. The two
Positions also give the line its bearing A → B, on which the Vent is projected: moving one turns
the line under the Vent and leaves the Vent as it is.
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
traversée ») or at the rider's current position (« à la position du passager »). The Rail's **garde min (traversée)** is the first of them: the closest the passager comes to the ground over the traverse. **The
Verdict only ever judges Traverse scope.** Every number states its scope three times
over — section header, row label and a parenthetical — because a reader who takes a
Position number for the traverse worst case signs off a line that fails 20 m further
along.
_Avoid_: descente, envelope vs instant, global vs local, min vs current, worst case

### Safety

**Verdict**:
The app's answer to "is this line safe?" — the worst tension over the whole traverse and
the minimum clearance over the traverse outside the Zones d'ancrage, judged against a chosen
safety regime.
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
The sag. Unqualified, the unloaded sag wanted on the line; Avancé also reads it as a share of the span, **flèche / portée**. **Flèche chargée** is the sag with the passager on the line. Avancé says flèche à vide for the unloaded one.
_Avoid_: cible, flèche cible

**Écart à vide**:
How far the passager hangs below the ligne à vide at the passager's own position, in metres — the loaded line's drop, read like a flèche. A read-out cell on every Page that has the coupe, and also in the coupe's tip beside the passager. Not a garde au sol, which is measured to the ground.
_Avoid_: flèche locale, écart ligne, descente

**Installation**:
Whether the line is built to stay: **installation permanente** or **installation temporaire**. A corde in a permanent installation is refused. Not a usage.
_Avoid_: usage, type d'usage

**Cas défavorable**:
The row Résultats adds with two Brins porteurs: **une seule ligne porte tout**, one member under the whole passager mass. The essai did not confirm the 50/50 share between the two lignes, so the row gives its tensions alone. It judges nothing: it states what the row is, not a Verdict.
_Avoid_: pire cas, scénario catastrophe, hypothèse pessimiste

**Réserve de tension**:
How much the tension can still grow before the facteur de sécurité falls to the marge exigée, in force: the admissible tension minus the maximum, at the end that governs. Positive, it is room left; negative, it is the excess to take off. Absent with no regime chosen.
_Avoid_: marge de tension, marge de sécurité, tension restante

**Facteur de sécurité**:
The ratio of available strength to the judged tension, compared with the marge exigée. Simplified Pages spell it out. Avancé may write FS. Not a percentage.
_Avoid_: coeff, coefficient, pourcentage

**Ligne à vide**:
The unloaded line, drawn. Not the longueur à vide, which is a length.
_Avoid_: câble à vide, corde à vide

**Banane**:
The lateral bow of the unloaded line in a cross-wind, seen from above. Qualitative. Not a distance the app states in metres.
_Avoid_: déport, drift, flèche latérale

**Vent**:
The wind the Scénario carries: the **vitesse du vent** in km/h (zero or more) and the **direction du vent**. The direction is
geographic: the azimuth the wind comes **from**, in degrees clockwise from north — 0° du nord,
90° d'est, 180° du sud, 270° d'ouest — the direction a forecast gives (MeteoSwiss reads
« d'où vient »). Every field that types it says « d'où vient le vent, en degrés depuis le nord ».
The engine projects it onto the line through the bearing A → B the two Positions give, as a
component along it (positive toward B, so a tail wind) and one across it (positive from the right);
it is a vector, never a whole `±` along the line. Moving an anchor therefore changes those
components and never the Vent. **The Vent needs Positions**: without A and B on the map the line
has no bearing, so the wind fields and the Rose des vents' handle are disabled with that reason,
and the passager's ride and the Banane run without wind. A Vent a link or a Session carries without
Positions is kept as given, never dropped, and the results read with it say it is not applied and
why; it is not a Blocking Error and hides no result. No wind is speed 0 and direction 0, and it is
what a link without `ws` and `wd` reads.
_Avoid_: rafale, souffle, orientation du vent, direction relative à la ligne (as what is typed)

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
The person travelling on the line; the **masse du passager** is what the statics and the ride are given. A load magnitude on a line or a fitting is a charge, not a passager.
_Avoid_: personne, charge

**Point d'arrêt**:
Where the passager comes to rest on the line short of the arrival. Without wind it is the
low point of the loaded line plus friction; wind only shifts it. Computed first without wind,
then with the wind entered: Dynamique heads the two tiles « Sans vent » and « Avec le vent saisi », marks them on the coupe and in the hover as « sans vent » and « avec vent », and says « arrive au bout » where there is none.
_Avoid_: blocage, point mort, position finale, arrêt par le vent (as the only cause)

**Vitesse d'arrivée**:
The passager's speed at B on a ride that reaches it, in km/h and m/s. Terrain reads it with the Vent entered and Dynamique for both rides; a ride that stops short, or never settles, has none and says why instead. Always an estimation.
_Avoid_: vitesse finale, vitesse maximale

**Estimation**:
The word every dynamic value carries — Point d'arrêt, vitesse d'arrivée, durée, the speed and acceleration curves, the dynamic marks on the coupe. The passager's ride is a point mass on a frozen line with a fitted drag, not a measurement, and it never judges the Verdict. Never said of the statics, which Statique computes. The essai finds the engine *cohérent avec un essai* at the order of magnitude and shows nothing of the wind; the interface does not say *validé*, and what the essai does not show — the 50/50 share between two lignes — is *pas confirmé*.
_Avoid_: prédiction, validé, précis, exact

**Trajectoire**:
The path of the passager's load over the whole traverse — where the trolley hangs at every Sweep Step — drawn dotted on the coupe as the **trajectoire** (**trajet** on the toggle where the row is narrow), against the ligne à vide; the line it hangs from is the **ligne chargée**. The ride follows it as a point mass, frozen: solved once from the statics and never again as the passager moves (§12.1), which is why a swift ride on a slack line warns that it describes the traverse badly. Not the Sweep, which is the set of Span States it is read from.
_Avoid_: parcours, chemin, animation

**Dynamique du passager**:
The Avancé group of what the ride is given beside the statics (§12.2): the **surface de traînée C_dA**, the **frottement constant de la poulie F₀** and the **frottement de la poulie proportionnel à la vitesse k_v** on a corde, the **frottement de la poulie μ** on a câble, and the **masse volumique de l'air ρ**. Set on Avancé only, each with its source; Dynamique says where they are set, not what they are. None is fitted on the essai.
_Avoid_: paramètres de la poulie

**Rider Envelope**:
The vertical space the rider occupies below the cable — pulley, lanyard and body. Subtracted in
full when clearance is measured. French, on every Page: **gabarit du passager**.
_Avoid_: empreinte, hauteur du passager, enveloppe, maître-couple, rider height, lanyard length, offset

**Garde au sol**:
The distance from the passager to the ground. The minimum is where, over the traverse outside
the two Zones d'ancrage, the passager comes closest to the ground. At the passager's position it
is the same quantity, not a second name. The maximum is the inverse and is not a shown value.
_Avoid_: garde sous le passager, garde passager

**Zone d'ancrage**:
The stretch at each end of the span, measured horizontally from the anchor, where the passager is
still or already on the platform and comes close to the ground by construction. Clearance there
— garde, Garde min. ligne, Rider Contact, Cable Contact — is not judged; the coupe greys it. Its
length is set on Avancé, 10 m by default, a convention without a normative source.
_Avoid_: zone de départ, zone d'arrivée, plateforme, zone exclue, zone morte

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

**Navigation Bar**:
The row above every app Page that lists the Pages, then the documentation. Each link keeps
the current Scenario in the URL, so changing Page never changes the line. It belongs to the
Pages' shared layout, never to the document, so the documentation and the not-found page do
not carry it. French: **barre de navigation**.
_Avoid_: app bar, header, menu, tabs, Rail Header

**Rail**:
A layout a Page may use, historical now that Avancé is its only user: Rail Header, then
`Paramètres → Valeurs déduites → Résultats → Provenance → Ce que cet outil ne calcule pas`.
Five sections, fixed order. Its upper sections take input and its lower sections report, but
there is no results panel. From the three-column width (1024 px) Avancé stands the sections
in two columns either side of the Chart Block — `Paramètres` on the left, the four that
report on the right; below it they stack into one scroll, Chart Block first, the Rail's
sections after it in their own order. A right-hand column was once rejected because it steals
the width a 1500 m span needs; 1024 px is the narrowest landscape tablet, where stacking would
cost the chart its whole profile; the middle column is then 448 px, and it takes every pixel of
the window past the two 288 px columns beyond — Avancé has no width cap.
_Avoid_: results panel, output half as a place, sidebar, form

**Rail Header**:
The single action row at the top of the Rail — the left column's top from the three-column
width — above `Paramètres` and scrolling with it:
the app's name, the force-unit selector, « Copier le lien », and an overflow menu
holding « Réinitialiser le scénario » and « Effacer la session ». Not a sixth section —
it holds no parameter, no read-out and no disclosure — and not the Navigation Bar: it
belongs to the Rail, scrolls with it and names no Page, while the Navigation Bar stands
above the whole Page and is paid out of every Page's height.
_Avoid_: app bar, toolbar, navbar, page header, chrome

**Chart Block**:
The banner slot, profile chart, clearance strip, View Strip and five read-out cells as
one co-visible unit sharing a single x scale and a single gutter constant. On Avancé it stands
in the middle column between the Rail's two, under Statique's vue de dessus, which heads that
column from the three-column width — never a view of Avancé's own — and it widens with the
window up to the column at 2560 px, past which it letterboxes, centred in the column, so the
whole block stays short enough for a 1440 px window. It reflows and collapses as a whole; no
member is ever hidden or occluded on its own.
_Avoid_: chart area, main pane, canvas

**View Strip**:
The one control row inside the Chart Block, below the clearance strip and above the
read-out cells: the two layer toggles, the « ×1 vraie échelle » control — which becomes
« voir toute la ligne » where the frame has cut the line out of ×1, the badge then adding **ligne hors cadre**, and **ligne entière** while the whole line is held in view — and the numeric
rider-position field. It lives here rather than in the Rail because at narrow widths the
Rail is not co-visible with the chart, so a chart control in the Rail would answer a
question whose answer is off screen.
_Avoid_: toolbar, chart controls, options bar, legend

**Handle Lane**:
The 24 px band between the bottom of the profile's plot area and its x-axis labels,
holding the non-interactive span bracket from A to B — outside the plot area, so it can
never be confused with the rider. Reserved at every width and in both terrain modes, so the
profile's height never changes on import. It holds no anchor handle: the anchors are the
profil's two ends, and moving one is a new Position, not a drag along the profil.
_Avoid_: handle row, anchor bar, gutter, axis area

**Pinned Safety Header**:
What the Chart Block collapses to when the Rail scrolls, a field takes focus, or the
block cannot fit: the banner slot plus one live « Garde min » cell, down to a single row
while the soft keyboard is open. Only where the Rail stands under the block — below the
three-column width; in Avancé's three columns the Chart Block never collapses to it. The banner
slot carries whichever occupant precedence gives it, never only a Verdict. Derived from scroll,
focus and available height — never persisted, and never a toggle.
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
Navigation Bar's reserved height with the Page names as plain text, then the Page's own
frame. On Avancé that frame is the Rail's five section headings in order (`Paramètres` in
the left column, the other four in the right), the app's name,
two empty chart frames at final proportions, and the read-out cells' labels; on Statique it
is the field groups' headings, the output tiles' labels, the coupe's empty bands and the vue
de dessus's frame, on Dynamique the field groups' headings, both rides' tile labels and the coupe's and the curve's empty bands, and on Terrain the vue de dessus's frame over the coupe's empty bands and the five tiles' labels. Each app Page ships its own. It carries no number, no Verdict, no spinner, no « — » and no live control
(not even a link in the Navigation Bar), only reserved height where one will be. Same CSS
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

**Rose des vents**:
The compass rose drawn on the vue de dessus, with a handle that sets the Vent's direction and force by dragging. It edits the azimuth directly: on the north-up map the handle stands where the wind comes from. Its reading gives that azimuth and, from the line's bearing, where the wind comes from relative to the line A → B (« Vent d'ouest (264°), 30 km/h : par la gauche à l'avant, 312° par rapport à la ligne A → B »). Without A and B on the map it has no handle and says why. On Terrain it is read-only. It sets the wind that draws the Banane.
_Avoid_: boussole, anémomètre

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
Clearance, Verdict, Wind or Ride — because the gates suppress different things, and Blocking Errors
are a **list**, never a singleton: repairing one leaves the others standing rather than
cascading a silent second fix.
_Avoid_: validation error, fatal error, invalid state, form error

**Fix Action**:
A button offered beside a Blocking Error that performs the repair in one press — a
general affordance of the error surface, not a per-error extra. Its label describes the
**effect of pressing it** (« Passer au câble »), never the act that produced the state,
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

**Cible inatteignable**:
The requested tightness has no solution: no longueur à vide gives the target the driving field names. Not a rupture, which is Tension impossible, and not a failure of the solver. The copy names the target in its own quantity and offers no Fix Action.
_Avoid_: target unreachable, valeur impossible

**Calcul impossible**:
The solver did not converge on a configuration the other gates let through: a case that is not supposed to happen. The one refusal that offers « Copier le diagnostic », so the payload can reach whoever maintains the engine.
_Avoid_: erreur interne, plantage, bug

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