/**
 * **The three refusal surfaces, and the diagnostic** — « v1 build spec » § 7 (*Les trois refus*,
 * *« Tension impossible » — la borne §5.4 est la charge de rupture*, *« Calcul impossible » —
 * aucun résidu à l'écran, aucun `SolveNote`, aucun panneau dev*).
 *
 * The engine refuses in **three kinds** and the app shows **three surfaces**, and the two sets do
 * not line up one for one — `no-convergence` has two origins needing two surfaces because
 * `resolveL0` shares the engine's error union. That mapping *is* what users see, so it lives here,
 * as a pure function of the failure, and never as a `switch` inside a component:
 *
 * | Engine | Surface |
 * | --- | --- |
 * | `invalid-input{field: "L0" \| "D_target" \| "H_target" \| "T_target"}` | **Tension impossible**, with the attainable bound and **no Fix Action** |
 * | `resolveL0`'s bracket failure — `no-convergence` at stage `L0` | **Cible inatteignable**, naming the *target* |
 * | `solveSpan`'s `no-convergence` **or** `slack-limit` | **Calcul impossible**, with `[ Copier le diagnostic ]` |
 *
 * Rules this module exists to keep:
 *
 * - **« Tension impossible » carries no Fix Action, and the reason is not restraint**: §5.4's chord
 *   bound *is* the breaking load, so no unambiguous repair exists. You cannot tension a rope past
 *   its breaking load, and a rupture verdict would report a line that cannot exist.
 * - **The bound is quoted in the driving field's own quantity and unit, and never twice.** In
 *   a tension mode the copy states that tension and *not* « soit L₀ ≥ 197,40 m »: a second
 *   equivalent invites the user to type a length into a tension field. That is why the two
 *   mode-specific messages depend on `resolveL0` re-emitting the floor in the driving quantity —
 *   without it the state degrades to quoting an `L₀` floor at a user editing a tension.
 * - **Two kinds share one surface because they map to the same non-action.** `no-convergence` and
 *   `slack-limit` are both « Calcul impossible »; a state earns its own presentation when it maps
 *   to a *different* user action, and these two do not.
 * - **No residual on screen, no `SolveNote`, no dev panel.** Measured across 349 440 instrumented
 *   solves: `reseeded` 0, §4.3's near-taut condition 0. The evidence goes to the **clipboard**
 *   instead — plain text, English keys, full float precision, decimal point — because rounding it
 *   to the display grain would destroy the thing it exists to carry.
 * - **Two things that look like refusals and are not.** Deep slack *converges* and is the « Câble
 *   au sol » verdict; and `Indéterminé` is a complete solve of an incomplete traverse, hence a
 *   verdict state. Neither reaches this module.
 */

import type { TightnessFieldId } from "@/lib/rail/fields.ts";
import type { ForceUnit, ScenarioDraft, TightnessDraft } from "@/lib/scenario/types.ts";
import type { EngineFailure } from "@/lib/scenario/unloaded.ts";
import type { SolveError, SolveNote } from "@/lib/sim";
import type { Register } from "@/lib/vocabulary/labels.ts";

import { formatQuantity } from "@/lib/format/quantity.ts";
import { FIELDS, lowerFirst } from "@/lib/rail/fields.ts";
import { tightnessDriver } from "@/lib/rail/values.ts";
import { SOLVER } from "@/lib/sim";
import { CONSTRUCTION_TOKEN_BY_ID } from "@/lib/url/scenario.ts";
import { heading, label } from "@/lib/vocabulary/labels.ts";

/** The three surfaces § 7 names. Three, not two: `no-convergence` has two origins. */
export type RefusalId = "tension-impossible" | "cible-inatteignable" | "calcul-impossible";

/**
 * One rendered refusal. **There is no `fixes` field**, and its absence is the decision: the only
 * action any of the three offers is `[ Copier le diagnostic ]`, and only « Calcul impossible »
 * offers it.
 */
export type EngineRefusal = {
  readonly id: RefusalId;
  /** § 7's copy, verbatim, with the bound or the target filled in. */
  readonly message: string;
  /** Does this surface carry `[ Copier le diagnostic ]`? True for « Calcul impossible » alone. */
  readonly diagnostic: boolean;
};

/** A stopped chain that carries an engine error — stage `L0` or `span`, never a gate's stage. */
type EngineError = Extract<EngineFailure, { readonly error: SolveError }>;

/** The one action a refusal offers, on the one surface that offers it. */
export const DIAGNOSTIC_ACTION = "Copier le diagnostic";

/** Both mode-specific messages open on this sentence — the physics, stated once. */
const TENSION_LEAD = `⛔ ${label("tension-impossible", "exact")} — la ligne casserait avant d'atteindre cette tension.`;

/** One surface, two kinds, same user action. It is thin on purpose: no residual, no note. */
const CALCUL_IMPOSSIBLE: EngineRefusal = {
  id: "calcul-impossible",
  message: `⛔ ${label("calcul-impossible", "exact")} pour cette configuration. Le solveur n'a pas convergé — ce cas n'est pas censé se produire. Modifiez légèrement la tension ou la géométrie.`,
  diagnostic: true,
};

/** The short clause « Aucun résultat » echoes — voir `./banner.ts`, which writes that sentence. */
export const REFUSAL_CAUSE: Record<RefusalId, string> = {
  "tension-impossible": lowerFirst(label("tension-impossible", "exact")),
  "cible-inatteignable": lowerFirst(label("cible-inatteignable", "exact")),
  "calcul-impossible": lowerFirst(label("calcul-impossible", "exact")),
};

/**
 * The surface one engine refusal renders as.
 *
 * @param unit the global force selector — a bound in tension mode is quoted in the unit the field
 *   the user is editing reads in, which is the whole of « in the driving field's own quantity ».
 * @returns `null` when the failure is **not** one of the three refusals: stages `geometry` and
 *   `material` are « nothing to solve yet », and `invalid-input` on `L`, `h`, `w`, `EA` or
 *   `strength` is a statement about the span — the three gates own both as a blocking error on an
 *   editable field. A refusal never doubles a field message.
 */
export function engineRefusal(
  failure: EngineFailure,
  {
    tightness,
    unit = "daN",
    register = "exact",
  }: { tightness: TightnessDraft; unit?: ForceUnit; register?: Register },
): EngineRefusal | null {
  if (failure.error === null) return null;
  const { stage, error } = failure;
  if (error.kind === "invalid-input") {
    // §5.4's floor, in whichever quantity `resolveL0` re-emitted it. Every other field is tier
    // one's or a gate's, and this module says nothing about it.
    switch (error.field) {
      case "L0":
        return {
          id: "tension-impossible",
          // The one row that echoes the offending value: `L₀` is a field the user typed, and what
          // was typed is the evidence. The two inverted modes quote the bound **alone** — a second
          // number beside an attainable maximum reads as a second target.
          message: `${TENSION_LEAD} ${heading("unstretchedLength", register)} minimale pour ${
            register === "exact" ? "ce câble" : "cette ligne"
          } : ${formatQuantity("L0", error.bound)} · valeur : ${formatQuantity("L0", error.value)}.`,
          diagnostic: false,
        };
      case "T_target":
        return {
          id: "tension-impossible",
          message: `${TENSION_LEAD} ${heading("pretension", register)} maximale atteignable : ${formatQuantity(
            "T_target",
            error.bound,
            unit,
          )}.`,
          diagnostic: false,
        };
      case "H_target":
        // A simplified Page shows no tension horizontale, so it quotes no bound in one: the
        // physics sentence stands alone there, and the bound is Avancé's to state.
        if (register === "terrain") {
          return { id: "tension-impossible", message: TENSION_LEAD, diagnostic: false };
        }
        return {
          id: "tension-impossible",
          // In « Rapport V » the engine still speaks of `H_target` — the ratio resolved to one —
          // so the bound is named in the quantity the user can act on.
          message: `${TENSION_LEAD} ${heading("horizontalTension", "exact")} maximale atteignable : ${formatQuantity(
            "H_target",
            error.bound,
            unit,
          )}${tightness.mode === "ratio" ? " — augmenter le rapport V" : ""}.`,
          diagnostic: false,
        };
      case "D_target":
        return {
          id: "tension-impossible",
          message: `${TENSION_LEAD} Flèche minimale atteignable : ${formatQuantity(
            "D_target",
            error.bound,
          )}.`,
          diagnostic: false,
        };
      default:
        return null;
    }
  }

  // A bracket failure for any reason **other** than rupture, and only `resolveL0` can produce one:
  // the same kind out of `solveSpan` is the solver failing on a target it was handed, which is a
  // different sentence and a different (non-)action.
  if (error.kind === "no-convergence" && stage === "L0" && tightness.mode !== "length") {
    return {
      id: "cible-inatteignable",
      message: `⛔ ${label("cible-inatteignable", register)} — aucune ${label(
        "unstretchedLength",
        register,
      )} ne donne ${target(tightness, unit, register)}.`,
      diagnostic: false,
    };
  }

  return CALCUL_IMPOSSIBLE;
}

/**
 * How « Cible inatteignable » names each driver's target — the refusal's own wording. A simplified
 * Page names the two drivers only Avancé offers as the tension they ask for.
 */
const TARGET_NOUN: Record<Register, Record<TightnessFieldId, string>> = {
  exact: {
    D_target: "cette flèche à vide",
    T_target: "cette prétension",
    H_target: "cette tension horizontale",
    L0: "cette longueur non tendue",
    vRatio: "ce rapport V",
  },
  terrain: {
    D_target: `cette ${label("sag", "terrain")}`,
    T_target: `cette ${label("pretension", "terrain")}`,
    H_target: "cette tension",
    L0: `cette ${label("unstretchedLength", "terrain")}`,
    vRatio: "cette tension",
  },
};

/** « cette flèche à vide (6,00 m) » / « cette prétension (9074,0 daN) » — the target, named. */
function target(tightness: TightnessDraft, unit: ForceUnit, register: Register): string {
  const { field, value } = tightnessDriver({ tightness });
  // A ratio quoted after « cette tension » would read as a tension.
  if (register === "terrain" && field === "vRatio") return TARGET_NOUN.terrain.vRatio;
  return `${TARGET_NOUN[register][field]} (${formatQuantity(FIELDS[field].quantity, value, unit)})`;
}

/**
 * What `[ Copier le diagnostic ]` puts on the clipboard. **Evidence, not UI copy**: English keys,
 * full float precision, a decimal point, and no terrain — `solveSpan` is terrain-free and
 * clearance is a reducer above it, so a solve failure is fully reproducible without the 200-row
 * trace.
 */
export type DiagnosticInput = {
  readonly failure: EngineError;
  /** The instant, ISO-8601. **A parameter**, so the payload is a pure function with no clock. */
  readonly at: string;
  /** The build identifier the header carries. */
  readonly build: string;
  readonly scenario: ScenarioDraft;
  /** The span posed to the solver. `L0` is `null` when the inversion itself is what refused. */
  readonly span: { readonly L: number; readonly h: number; readonly L0: number | null } | null;
  /** What the solver consumed, or `null` while the Material Spec is still incomplete. */
  readonly derived: { readonly w: number; readonly EA: number; readonly strength: number } | null;
  /** The point loads, in engine units — empty on the unloaded solve. */
  readonly loads?: readonly { readonly x: number; readonly P: number }[];
  /**
   * The canonical link, or `null` where it would be refused. `null` prints « (non partageable —
   * tracé hors budget) », so the payload **never silently omits a field**.
   */
  readonly address: string | null;
  /**
   * §5's internal remedies, counted. A failed solve publishes none — the union carries them on
   * success only — so this is normally empty and the line reads three zeroes. It is printed
   * anyway: a reader has to be able to tell « none » from « not recorded ».
   */
  readonly notes?: readonly SolveNote[];
};

/** Every `SolveNote`, in the order the payload counts them. */
const NOTE_ORDER: readonly SolveNote[] = ["damped", "reseeded", "near-taut-fallback"];

export function diagnosticPayload(input: DiagnosticInput): string {
  const { failure, at, build, scenario, span, derived, address, loads = [], notes = [] } = input;
  const lines = [`scoutech diagnostic — ${at} — build ${build}`, ...errorLines(failure, span)];

  const counted = NOTE_ORDER.map((note) => `${note}×${notes.filter((n) => n === note).length}`);
  lines.push(key("notes", counted.join("  ")));

  const target = num(tightnessDriver(scenario).value);
  lines.push(tag("resolveL0", `mode=${scenario.tightness.mode}  target=${target}`));

  if (span !== null && derived !== null) {
    lines.push(
      tag(
        "solveSpan",
        `L=${num(span.L)}  h=${num(span.h)}  L0=${span.L0 === null ? "—" : num(span.L0)}  w=${num(
          derived.w,
        )}  EA=${num(derived.EA)}`,
      ),
      // Continuation line, indented under the tag it belongs to.
      `${" ".repeat(12)}loads=[${loads
        .map((load) => `{x:${num(load.x)},P:${num(load.P)}}`)
        .join(",")}]`,
    );
  }

  lines.push(tag("material", materialLine(scenario.material, derived?.strength ?? null)));
  lines.push(tag("address", address ?? "(non partageable — profil hors budget)"));
  return lines.join("\n");
}

/** The kind and the numbers that kind carries. Three shapes, because the union has three arms. */
function errorLines({ error }: EngineError, span: DiagnosticInput["span"]): readonly string[] {
  if (error.kind === "no-convergence") {
    return [
      key("kind", "no-convergence"),
      key("attempts", String(error.attempts)),
      key("residual", error.residual.toExponential(4)),
      // §5.3's tolerance is **L-scaled beyond 1000 m**, so a residual printed without it could not
      // be interpreted — which is exactly why § 7 keeps both off the screen and both in here.
      key("tolerance", toleranceOf(span).toExponential()),
    ];
  }
  if (error.kind === "slack-limit") {
    return [key("kind", "slack-limit"), key("hFloored", num(error.hFloored))];
  }
  return [
    key("kind", "invalid-input"),
    key("field", error.field),
    key("value", num(error.value)),
    key("bound", num(error.bound)),
    key("boundKind", error.boundKind),
  ];
}

/** §5.3's tolerance for this span: `1×10⁻⁶ m` up to the crossover, `1×10⁻⁶·L` beyond it. */
function toleranceOf(span: DiagnosticInput["span"]): number {
  const L = span?.L ?? 0;
  return L <= SOLVER.toleranceScaleSpan ? SOLVER.tolerance : SOLVER.tolerance * L;
}

/**
 * The active spec, as the fields the user could change — overrides named, never summarised. It
 * takes the **draft**, blanks included: a diagnostic copied while a textile field is still empty
 * has to say `MBL=null`, which is the state, rather than a fabricated zero.
 *
 * @param strength the breaking load the solver actually consumed, N, or `null` while the spec is
 *   still incomplete. It is printed because « Tension impossible »'s bound **is** `chord/(1 +
 *   MBF/EA)`: without it the reader of the payload has to re-derive the number that produced the
 *   refusal from `d`, `R0` and the construction.
 */
function materialLine(material: ScenarioDraft["material"], strength: number | null): string {
  if (material.family === "textile") {
    return `family=textile  cls=${material.ropeClass}  MBL=${blank(material.MBL)}  mu=${blank(
      material.mu,
    )}  k=${blank(material.k)}`;
  }
  const overrides = material.overrides ?? {};
  const written = (["MBF", "EA", "mu"] as const)
    .filter((id) => overrides[id] !== undefined)
    .map((id) => `${id}=${num(overrides[id] as number)}`);
  return `family=steel  d=${num(material.d)}  R0=${material.R0}  cst=${
    CONSTRUCTION_TOKEN_BY_ID[material.construction]
  }  MBF=${blank(strength)}  overrides=${written.length === 0 ? "none" : written.join(",")}`;
}

/** `kind        no-convergence` — the key column is 12 characters, like the `[tag]` column. */
function key(name: string, value: string): string {
  return `${name.padEnd(12)}${value}`;
}

/** `[solveSpan] L=150  h=-18` — the same 12-character column, so the two blocks line up. */
function tag(name: string, value: string): string {
  return `${`[${name}]`.padEnd(12)}${value}`;
}

/**
 * **Full float precision, decimal point.** The payload is evidence: rounding a residual or an `L₀`
 * to the display grain would destroy the one thing it exists to carry, and the comma is a UI
 * convention that would make the numbers unpastable into a REPL.
 */
function num(value: number): string {
  return String(value);
}

/** A textile blank prints as `null` — « the user never filled it » is itself evidence. */
function blank(value: number | null): string {
  return value === null ? "null" : num(value);
}
