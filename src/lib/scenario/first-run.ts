/**
 * `FIRST_RUN_SCENARIO` — « v1 build spec » § 9, *Le premier lancement*, whose field table this
 * module transcribes and nothing else. **One constant object serving three consumers**: the
 * opening state, « Réinitialiser le scénario »'s target, and the completion values a recognised
 * link that omits keys is filled from. *Not three copies* — a reset and a partial link must land
 * on exactly the values a fresh visit does (§ 10, P2).
 *
 * Shipped line: **150,0 m · −18,0 m · hauteurs 12,0 / 12,0 m · tension de pose 263,4 daN** on
 * 12 mm 1770 6×19 âme métallique, cosse à sertir at both ends, a 120 kg rider at `x` 75,0 m.
 *
 * Rules this module exists to keep:
 *
 * - **No number here is a taste question, and three of them are forced by arithmetic.** § 9's
 *   *Finding 1* measured that on a straight ground line dénivelé buys **no** clearance (2,46 m at
 *   `h` 0 against 2,25 m at `h` −60), so garde is set by the anchor heights and the loaded sag
 *   alone — and **every intuitively realistic anchor pair opens the app in « Câble au sol »**
 *   (12/6 m measures −1,04 m). Hence 12,0 / 12,0 m, read as « 12 m of clear air beneath each
 *   anchor » rather than « build two towers », which is a claim § 6's terrain-provenance copy has
 *   to keep making.
 * - **Tension de pose is the active Tightness segment because the simplified Pages drive it, and
 *   its value is exact at display precision.** A first-run line driven by the flèche held 6 m of
 *   sag through a span change and moved the tension de pose silently. § 9's *Finding 2*: a prefill
 *   writes the *displayed* value into state, so a direct-`L₀` default would ship 151,64 m and cost
 *   0,21 m of flèche and 0,20 m of garde — **8 % of the shipped margin**. 263,4 daN costs
 *   nothing (the flèche reads 6,00 m).
 * - **The absences are meaning, not omissions.** `regime: null` is « — choisir — » (struck from
 *   the solve tier, so the app opens **verdict-less** and still computes); no `overrides` key on
 *   the steel spec is « non surchargée », because an override on first run would ship the one
 *   `[STD-ATTESTED]` derived value pre-downgraded into the provenance aggregate.
 * - **The shipped line is allowed to read « Hors limites » under ACCT 10:1** — FS effectif 8,80
 *   against `k` = 10. Do **not** up-size the cable to buy a green: 14 mm reads 10,79, still
 *   « Marge faible », and choosing hardware so a `[CONVENTION]` passes turns the shipped Material
 *   Spec into an implicit safety recommendation.
 * - **No worked example ships** — no named scenario, no bundled trace, no « charger un exemple ».
 *   The first-run scenario *is* the worked example, and the three CSVs stay fixtures.
 * - **This module holds inputs only.** The opening state § 9 records — `L₀` 151,644 m, `H`
 *   253,6 daN, garde 2,42 m, FS 8,80 / 9,06 — is *computed* from these by the engine, never
 *   stored beside them: a second copy is a copy that can disagree with the solver. `first-run.test.ts`
 *   is where those figures are locked.
 */

import { DYNAMICS, TEXTILE } from "@/lib/sim";

import type { EndTermination, Scenario, TextileDraft } from "./types.ts";

/**
 * § 9's shipped inputs, one property per row of its field table.
 *
 * Deeply readonly on purpose: three consumers share this object, and a reset that mutated the
 * completion values would be a bug nobody could see. Callers that need a mutable copy take
 * {@link firstRunDefaults}.
 */
export const FIRST_RUN_SCENARIO = {
  /**
   * § 7's `u=daN` — **display only**: forces in state are newtons, the engine's unit (§ 3, « SI
   * internally, always »), and only the URL serialises daN, whatever this key says.
   */
  unit: "daN",
  /** `use=perm` — §10.4's restrictive branch, and the one that disqualifies textile. */
  usage: "PERMANENTE",
  /** `reg` **absent**: « — choisir — ». Never defaulted — three of five régimes are unattested. */
  regime: null,
  /** `L=150` · `h=-18`, and no `tr`: manual geometry, i.e. the plane the defaults must suit. */
  geometry: { source: "manual", L: 150, h: -18 },
  /** `za=12` · `zb=12` — equal, which also puts the garde minimum mid-span where flèche explains it. */
  anchors: { zA: 12, zB: 12 },
  /** One member, which is `bp` **absent**: the shipped link did not change when the key arrived. */
  carryingLines: 1,
  /** The Mise en tension at A, which is `cp` **absent**: the shipped link did not change either. */
  tensioningSide: "A",
  /** The mouflage, which is `mt` **absent**: the shipped link did not change either. */
  tensioningDevice: "pulley",
  /**
   * `tp=263.4` — the tension de pose, per member, at the anchor of the Mise en tension (A), 2634 N.
   * The simplified Pages drive only that field, so a first-run line driven by the flèche would hold
   * 6 m of sag through a span change and let the tension de pose jump (263,4 → 2119 daN on the 435 m
   * trial trace). 263,4 daN is the figure the 6 m line shows at A, at display precision — and exact
   * there, which is the same reason `fl=6` was once chosen. The flèche is now the read-out: 6,00 m
   * on the shipped line, to display precision. Links that carry `fl`/`te`/`lo`/`vr` open as given.
   */
  tightness: { mode: "anchor", T_target: 2634 },
  /**
   * `fam=ac&d=12&r0=1770&cst=iwrc`, **no `mbf`/`ea`/`mu`**. §13.1 then gives MBF 9074 daN, `EA`
   * 6,90 MN and `μ` 0,5465 kg/m from `K` 0,356 and the pinned midpoints the provenance popover
   * quotes — which is what makes the popover's numbers reproducible from the first screen.
   */
  material: { family: "steel", d: 12, R0: 1770, construction: "iwrc" },
  /**
   * `ta=cosse&tb=cosse&na=0.9&nb=0.9` — « Cosse à sertir / œil Flamand », `[STD-ATTESTED]`, the
   * commonest real termination and the conservative choice against the 1,00 socket. Identical at
   * both ends **deliberately**: `T_A > T_B` here, so FS_A 8,80 governs and the shipped line
   * demonstrates the higher-anchor rule without asymmetric hardware.
   */
  terminations: {
    A: { id: "cosse-oeil-flamand", eta: 0.9 },
    B: { id: "cosse-oeil-flamand", eta: 0.9 },
  },
  /**
   * `mp=120&hr=2.1&daf=1.2&x=75.0`. `m_p` and `h_rider` are **Unconfirmed Defaults** — pre-filled
   * so they are labelled-and-configurable rather than blank, and `m_p` is additionally a Solve
   * Gate input, so 120 kg is what keeps the opening screen solvable. `DAF` 1,2 is §8.2's
   * `[FIELD:SSF]` measured ceiling: a popover, **no « non confirmé » chip**. `x_D` = `L/2`, the
   * only neutral choice — and since ticket 37 the inner minimum at that position **is** the rider's
   * own node, 0,000 m away and so well inside the `max(1 m, 1 % de la portée)` rule (0,9 m before),
   * so the clearance cell reads plainly « Garde min. ligne » on first paint instead of relabelling
   * itself — **and** the profile draws one clearance dimension
   * rather than two, since ticket 41 gates its second one on the same bit. `h_clear,min` 1,0 m is a
   * `[CONVENTION]` of 2026-09-23 — no reference publishes a minimum garde — and the shipped line's
   * 2,42 m clears it, so the first screen carries no clearance breach.
   */
  rider: { mp: 120, hRider: 2.1, hClearMin: 1, DAF: 1.2, xD: 75 },
  /** No wind, which is `ws` and `wd` **absent**: the shipped link did not change either. */
  wind: { speedKmh: 0, directionDeg: 0 },
  /**
   * §12.2's defaults, which is the ride's keys **absent**: `C_dA` 0,45 m² `[FIELD:SSF]`, the
   * corde's SSF fit `F₀` 15 N and `k_v` 1,5 kg/s `[FIELD:SSF]`, the câble's constant `μ` 0,015 — an
   * Unconfirmed Default — and `ρ` derived, 1,225 on this manual line, which has no profil to read an
   * altitude from.
   */
  dynamics: {
    CdA: DYNAMICS.CdA,
    rho: null,
    F0: DYNAMICS.textile.F0,
    kv: DYNAMICS.textile.kv,
    mu: DYNAMICS.steel.mu,
  },
  /** Unknown, which is the four coordinate keys **absent**: the first-run line has no map. */
  positions: { A: null, B: null },
} as const satisfies Scenario;

/**
 * The **retained inactive** textile spec § 9 ships: classe HMPE, `k` 22 (`[DATASHEET]`, Samson
 * 872), and `MBL` / `μ` **blank and required**. **No rope ships** — every product row in the
 * reference is compromised, and one invented `MBL` decides the verdict (100 kN ⇒ FS 11,94 « dans
 * les limites »; 60 kN ⇒ 7,63 « hors limites » on the same line).
 *
 * Separate from {@link FIRST_RUN_SCENARIO} because the two have **different lifetimes**: § 9's
 * reset table returns the active configuration to the first-run defaults while « la Material Spec
 * inactive conservée » survives intact. Folding it into the Scenario would make
 * {@link firstRunDefaults} overwrite a spec the user typed — and the Scenario is the *active*
 * configuration by § 7's one governing rule, so the retained alternate is the Session's anyway.
 *
 * Flipping to `Corde` under `TEMPORAIRE` therefore lands on two blank required fields.
 * That is **not** « Saisie en cours »: a field the user never filled is not mid-edit, so it raises
 * blocking errors attributed through the culprit table, and no stale picture is kept.
 */
export const FIRST_RUN_RETAINED_TEXTILE = {
  spec: { family: "textile", ropeClass: "hmpe", MBL: null, mu: null, k: TEXTILE.kDefault.hmpe },
  /**
   * **The terminations are retained with the spec** — § 3, « overrides *and* terminations
   * included » — and the whitelist is scoped by family, so the retained textile ships the textile
   * default: « Œil cousu / épissuré », `η_t` 0,90, the conservative end of §10.2's range and the
   * one option every rope class allows (§10.3 disables the two knots on HMPE). Leaving the steel
   * `cosse` behind on a flip would put a value in the picker that its own option list does not
   * contain, and drop the `[CONVENTION]` chip the textile ends all carry.
   */
  terminations: {
    A: { id: "oeil-cousu-epissure", eta: 0.9 },
    B: { id: "oeil-cousu-epissure", eta: 0.9 },
  },
} as const satisfies { spec: TextileDraft; terminations: { A: EndTermination; B: EndTermination } };

/**
 * A fresh, mutable copy of {@link FIRST_RUN_SCENARIO} — « les valeurs de départ », which means
 * **one** thing in all three places the phrase is used: the store's lazy initialiser
 * (`readSession() ?? firstRunDefaults()`), « Réinitialiser le scénario », and the literal
 * completion of a recognised link that omits keys.
 *
 * A copy rather than the constant itself because the store mutates its scenario; handing out the
 * shared object would let one edit rewrite the reset target. Nested objects are copied too — a
 * spread would alias `geometry`, `anchors`, `material`, `terminations` and `rider`.
 *
 * Two completion rules that live at the call site rather than here, both § 9's: keys whose
 * **absence carries meaning** are exempt (`reg`, `mbf`/`ea`/`mu`, the terrain and inactive-family
 * keys), and `x` completes to `L/2` of the *completed* span — 125,0 m for `?L=250&h=-40` — not to
 * the constant 75,0. Everything else completes **literally**: `tp` completes to 263,4 daN and never
 * to a flèche of 4 % of the arriving span, which measured 1,25 m of garde against a « smart » completion's
 * −2,39 m, i.e. a hand-authored link on the ground.
 */
export function firstRunDefaults(): Scenario {
  return structuredClone<Scenario>(FIRST_RUN_SCENARIO);
}
