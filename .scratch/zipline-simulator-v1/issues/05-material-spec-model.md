# Material spec model — deriving MBF, EA and mass for steel and textile

Type: grilling
Status: open
Blocked by: —
Map: [Zip-line simulator v1](../map.md)

## Question

What does the user type to describe the cable or the rope, and what does the app compute
from it?

The map's scope decision is **formula-derived with raw override, zero shipped product
presets** — `docs/simulation-theory.md` §13.2 warns that every product row in both research
runs is compromised and must be re-pulled before shipping. So the app derives from attested
formulas and lets the user override any derived value.

Settle:

1. **Family A — steel wire rope (§13.1).** The input fields: nominal diameter `d` (mm),
   grade `R₀` (1770 / 1960 N/mm²), construction class (6×19 fibre core `K = 0.330` versus
   steel core `K = 0.356`). Derived: `MBF [kN] = K·d²·R₀/1000`. Then `EA = E_app·C·d²` with
   `E_app ≈ 100–130 GPa` and metallic-area factor `C = 0.384–0.449`, and mass per metre from
   the nominal-mass factor `W = 0.359–0.400`. Every one of those is a **range**, not a
   number. Decide what the app defaults to inside each range, how the range is surfaced, and
   whether the user picks a point or the app shows a band. Note the §13.1 warning that
   [R1]'s per-diameter table is inconsistent with the K-factors and its EA column implies a
   modulus above solid steel — do not resurrect it.
2. **Family B — textile rope (§13.2).** The stiffness convention is `EA = k·MBL`, never a
   fibre modulus. Input fields: rope class (12-strand HMPE, EN 1891 Type A polyamide,
   polyester semi-static), `MBL`, diameter, mass per metre, and `k`. Decide the defaults per
   class: HMPE `k ≈ 22 at 10 % MBL` rising to `≈ 31 at 30 % MBL` — which means **`k` depends
   on the working load**, so decide whether the app iterates or just asks the user to pick a
   band. Polyamide `k ≈ 1.5` at the CE band, with the §13.2 open gap that this value
   under-stiffens the model at highline working loads well above the CE band. That gap is
   real and unresolved (§16 item 6) — decide how the UI admits it.
3. **Terminations.** §10.2 for steel: socket 1.00, ferrule/Flemish eye 0.90, spliced eye
   0.80, U-bolt grips and wedge socket 0.80 with a **regulatory warning** that grips shall
   not be used where the rope supports persons. §10.3 for textile: sewn/spliced eye
   0.90–0.95, figure-eight 0.60–0.80 defaulting to the conservative 0.60, bowline 0.55–0.70,
   and knots on HMPE **prohibited** (0.25–0.50, it slips). Decide whether termination is a
   picker per end or one for the whole line, and how the prohibition and the grips warning
   are enforced — block, or warn loudly?
4. **The override.** Every derived value (`MBF`/`MBL`, `EA`, `μ`) is overridable per the
   scope decision. Decide the interaction: does overriding a derived field detach it
   permanently, show a "modified" state, and offer a reset? What happens to the override
   when the user then changes `d`?
5. **Family switching.** What happens to the form when the user flips family, and how the
   §10.4 use-class gate (`PERMANENT` ⇒ steel only) presents itself — a disabled option with
   an explanation, or an error after the fact.

## Context

Read `docs/simulation-theory.md` §13 in full, plus §10.2 and §10.3 for terminations, §9.2
for the 30 % MBL creep cap on textile, and §14 rows 8, 14 and 17 for the arbitrations that
killed the product tables.

Honour the binding provenance rule from the map: `[CONVENTION]`, `[PAYWALLED]` and
`[UNVERIFIED:R1]` values are labelled, configurable and warned. In this ticket that covers
most of the sheave and efficiency numbers, and the whole textile `k` story.

Pairs with [Span and rigging parameter model](./04-span-and-rigging-parameter-model.md) —
that one owns geometry and rider, this one owns the line. Keep the boundary clean.
