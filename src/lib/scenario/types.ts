/**
 * The **Scenario** — « v1 build spec » § 7 (*Scenario vs Session*: « **Scenario** is what a link
 * transports — the active configuration and nothing else. **Session** is what the browser
 * remembers — strictly larger ») and § 7's key table, which fixes every field below and its URL
 * key. § 9's `FIRST_RUN_SCENARIO` is the one value of this type the app ships.
 *
 * Rules this module exists to keep:
 *
 * - **The Scenario is the *active* configuration, never a retained alternate.** One material
 *   spec, one terrain source. The retained inactive Material Spec, the retained manual `L`/`h`
 *   behind an import, the cached Trace and the display preferences are the **Session's** — § 7,
 *   *The Session*. That asymmetry is what makes « Réinitialiser le scénario » implementable: it
 *   returns *this* object to `firstRunDefaults()` and leaves the Session's extras standing.
 * - **Absence carries meaning and is modelled as such.** `regime: null` **is** « — choisir — »,
 *   a legitimate shared state and never a value waiting to be defaulted; a steel spec with no
 *   `overrides` is « non surchargée », which differs from « equal to the formula value ». § 7's
 *   three meanings of absence survive into the state object rather than living only in the URL.
 * - **The engine's types are reused, never re-declared.** `TightnessSpec`, `MaterialSpec`,
 *   `TerminationId` and `RegimeId` come from `@/lib/sim` — the app's state and the engine's input
 *   are the same shapes, and a second copy of the tightness union is a second place § 7's
 *   presence-encoded driver can drift.
 * - **Valibot lives at the boundaries** — URL, CSV, forms, Session — so these are plain
 *   TypeScript declarations. This module holds no schema, no formula and no number.
 * - **Display units never cross into state.** `unit` selects how forces *read*, nothing more:
 *   § 3's « SI internally, always — canonical storage is **newtons** » governs here too, so every
 *   force in this type is the engine's newtons and every length is metres, and `daN → kN → daN`
 *   is the identity. Only the URL serialises daN, and `src/lib/url/scenario.ts` is where the ÷10
 *   happens.
 */

import type {
  AnchorSide,
  MaterialSpec,
  RegimeId,
  SteelSpec,
  TerminationId,
  TextileSpec,
  TightnessSpec,
} from "@/lib/sim";

/** § 7's `u` — **display only**: it changes no number's meaning anywhere. */
export type ForceUnit = "daN" | "kN" | "kgf";

/** § 7's `use` — §10.4's use class. `PERMANENTE` is the restrictive branch. */
export type UseClass = "PERMANENTE" | "TEMPORAIRE";

/**
 * § 7's one governing rule made a union: « the URL carries the active configuration and never a
 * retained alternate », so an imported line has `tr`/`sa`/`sb` and **no** `L`/`h`, and a manual
 * line has `L`/`h` and **no** `tr`. In imported mode `L` and `h` are *derived read-outs*, which
 * is why they are absent from that arm rather than optional in one flat shape.
 *
 * **`source` is read across the app — around 28 sites in eleven modules, not the four ticket 38
 * item 4 counted — and that census is the reason it stays inline.** The sites fall in two kinds
 * and neither wants a shared discriminant:
 *
 * - Those that **read an arm's fields** (`scenario/geometry.ts`, `rail/values.ts`,
 *   `url/scenario.ts`, `app/state.ts` …) depend on the **narrowing** `source` gives: it is this
 *   union's discriminant, so `source === "manual"` is what makes `geometry.L` exist at all. A
 *   helper returning a string takes that away and buys nothing.
 * - Those that only ask **which mode is active** are already served — `rail/gates.ts`'s
 *   `geometryMode` is that helper, module-private because a function whose body is one property
 *   read earns nothing by travelling.
 *
 * What *was* owed is the third kind: a **derivation** the discriminant drives, stated twice. That
 * one is now {@link spanOfGeometry} in `./geometry.ts`, and it is where a third geometry mode has
 * to be taught the span. A branch that is neither a narrowing nor a mode label belongs beside it.
 */
export type Geometry =
  /** Manual geometry: the ground is the straight line between the two anchor bases. */
  | { source: "manual"; L: number; h: number }
  /**
   * An imported profile. `trace` is § 7's `tr` value **verbatim** (`p1.<base64url>`) — decoding
   * is a memoised client derivation, never part of the state object; `sa` / `sb` are the anchor
   * stations in file coordinates, and `L = sb − sa`.
   */
  | { source: "trace"; trace: string; sa: number; sb: number };

/** § 7's `za` / `zb` — each anchor's height above its own base, m. */
export type AnchorHeights = { zA: number; zB: number };

/**
 * One end's hardware. `eta` is a **field**, not a table lookup: every §10.2/§10.3 efficiency is a
 * `[CONVENTION]` or a range, so the picker prefills `TERMINATIONS[id].eta` and the verdict reads
 * what the user holds — § 7's `ta`/`na` pair, one per end.
 */
export type EndTermination = { id: TerminationId; eta: number };

/**
 * § 7's `mp` / `hr` / `daf` / `x`. `mp` and `hRider` are **Unconfirmed Defaults** — pre-filled so
 * they are labelled-and-configurable rather than blank — and `xD` selects a *view*, which is why
 * it is the one key that clamps to `[0, L]` on arrival instead of blocking the span.
 */
export type Rider = {
  /** Passenger mass, kg. The load the engine takes is `m_p·g`. */
  mp: number;
  /** §11's passenger envelope, m — subtracted straight from the clearance. */
  hRider: number;
  /**
   * « Garde min. admise », m — the least ground clearance the user accepts over the traverse
   * (decision of 2026-09-23). A **threshold on the read-out**, never an engine input: §11's
   * clearance is computed exactly as before, and the Rail marks it « hors limites » when the
   * traverse minimum falls under this value. `0` disables the check.
   */
  hClearMin: number;
  /** §8.2's dynamic amplification factor. */
  DAF: number;
  /** Rider position, m in the span frame `[0, L]`. */
  xD: number;
};

/**
 * The Tightness Driver **as the app holds it** — five drivers: the engine's four modes plus
 * « Rapport V », the ratio `P / H` of the passenger's design load to the tension horizontale
 * (decision of 2026-09-23). A higher ratio is a deeper V under the rider. It is a parameterisation
 * of the tension mode, not another inversion: `engineTightness` in `./tightness.ts` maps it to
 * `{ mode: "tension", H_target: m_p·g / ratio }` before anything reaches `resolveL0`, which is why
 * `src/lib/sim/**` does not know it exists.
 *
 * The prétension (`anchor`, #85) holds its target only: the anchor it is read at is the Scenario's
 * {@link Scenario.tensioningSide}, which a read-out needs whatever drives, so it is not repeated
 * here.
 */
export type TightnessDraft =
  | Exclude<TightnessSpec, { mode: "anchor" }>
  | { mode: "anchor"; T_target: number }
  | { mode: "ratio"; ratio: number };

/**
 * **Brins porteurs** — how many load-bearing members the Span carries (decision of #4). Two are
 * strictly identical: same unloaded tension, the passager shared 50/50, each member carrying its
 * own weight. The gap between them is constant and enters no computation.
 */
export type CarryingLines = 1 | 2;

/**
 * The anchor that carries the **Mise en tension** (#85) — where the prétension is read, per
 * member: what a dynamometer between that anchor and the Maestro shows.
 */
export type TensioningSide = AnchorSide;

/**
 * The **Mise en tension** device (#86): the mouflage, or one of the two Maestro. Descriptive only —
 * no solve, sweep or verdict reads it; it selects the tension limit the prétension is judged
 * against. A Maestro is a rope device, so on a câble it is kept as given (ADR-0001) and warned.
 */
export type TensioningDevice = "pulley" | "maestro-s" | "maestro-l";

/** § 7's Scenario: everything a link transports, and nothing the Session keeps on the side. */
export type Scenario = {
  unit: ForceUnit;
  usage: UseClass;
  /** `null` **is** « — choisir — »: the app opens verdict-less and that is legitimate state. */
  regime: RegimeId | null;
  geometry: Geometry;
  anchors: AnchorHeights;
  /** `bp` in a link, and **absent there for one member** — so links older than the key read 1. */
  carryingLines: CarryingLines;
  /** `cp` in a link, and **absent there for A** — so links older than the key read A. */
  tensioningSide: TensioningSide;
  /** `mt` in a link, and **absent there for the mouflage** — so links older than the key read it. */
  tensioningDevice: TensioningDevice;
  /**
   * §7's presence-encoded Tightness Driver — exactly one of flèche / prétension / tension
   * horizontale / `L₀` / rapport V. The last is the app's, not the engine's: {@link TightnessDraft}.
   */
  tightness: TightnessDraft;
  /** The **active** family's spec. The retained one is the Session's — see {@link TextileDraft}. */
  material: MaterialSpec;
  terminations: { A: EndTermination; B: EndTermination };
  rider: Rider;
};

/**
 * A textile spec **as the form holds it**, which is not yet a `TextileSpec`: § 9 ships classe
 * HMPE with `k` 22 and « `Charge de rupture` (`MBL`) et `Masse linéique` (`μ`) **vides et
 * requis** » — no rope ships, because one invented `MBL` decides the verdict (100 kN ⇒ FS 11,94
 * « dans les limites »; 60 kN ⇒ 7,63 « hors limites » on the same line).
 *
 * `null` is « blank and required », never zero: a field the user never filled is not a value.
 * The engine's `TextileSpec` takes numbers, so a draft becomes an engine input only once every
 * blank is filled — which is exactly the two blocking errors § 9 specifies for a family flip.
 */
export type TextileDraft = {
  family: "textile";
  ropeClass: TextileSpec["ropeClass"];
  /** Minimum breaking load, N — **blank and required**, so `null` until a datasheet fills it. */
  MBL: number | null;
  /** Linear mass, kg/m — blank and required. */
  mu: number | null;
  /** `EA = k·MBL`. Shipped for HMPE (`[DATASHEET]` 22); **absent, not zero**, for polyester. */
  k: number | null;
  /** Nominal diameter, mm — optional, so **absent** rather than blank-and-required. */
  d?: number;
};

/**
 * The Scenario **as the app holds it**, which is a superset of what the engine can consume: the
 * active material may still be a {@link TextileDraft}.
 *
 * It exists because § 9's family flip and § 7's `?fam=tx` link both land on « `MBL` et `μ` vides
 * et requis » — a state the app must **hold and render** (two blocking errors, attributed through
 * the culprit table) and the engine must never be handed. A {@link Scenario} is assignable to it,
 * so the Session's stored scenario, `firstRunDefaults()` and a completed link all flow in without
 * a conversion; the reverse needs the blanks filled, which is exactly the gate the Solve Gate is.
 */
export type ScenarioDraft = Omit<Scenario, "material"> & {
  /** The **active** family's spec, possibly still incomplete. */
  material: SteelSpec | TextileDraft;
};
