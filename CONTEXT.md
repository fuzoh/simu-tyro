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

**Tightness Spec**:
The user's chosen way of saying how tight the line is: unstretched length directly, a
target installed tension, or a target unloaded sag. Whichever is chosen, it resolves to an
unstretched length before anything is computed.
_Avoid_: tension mode, pretension setting, parameterisation mode

**Material Spec**:
The description of what the line is made of — steel wire rope or textile rope — from which
weight per unit length, axial stiffness and breaking strength are derived. Steel and
textile are separate specs, never variants of one.
_Avoid_: cable spec, rope config, product

**Terrain**:
The ground beneath the line. One concept with two sources: a flat baseline at anchor-base
level, or a profile imported from a GPX track. The simulation never distinguishes them.
_Avoid_: ground profile, elevation data, topography

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

### Safety

**Verdict**:
The app's answer to "is this line safe?" — the worst tension over the whole traverse and
the minimum clearance over the whole traverse, judged against a chosen safety regime.
Never judged from the rider's current position.
_Avoid_: check, validation, safety result

**Safety Regime**:
A named, provenance-labelled set of safety rules the user selects between (EN 15567,
WorkSafe QLD, challenge-course practice, rescue-textile practice). Regimes are never
blended and never silently defaulted.
_Avoid_: safety factor, coefficient, standard

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

### Provenance

**Unconfirmed Default**:
A shipped value whose source is paywalled, conventional or unverified. Always labelled,
always user-editable, always carrying a warning, and never presented as normative.
_Avoid_: default, assumption, constant
