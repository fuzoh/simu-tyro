/**
 * The Rail's **input half** — « v1 build spec » § 3 (the whole field table, the Tightness Spec, the
 * §10.4 use-class gate, Override, `Valeurs déduites`), § 4 (*Placement des ancrages*, *Deux
 * sources, un concept*, *Échecs de parsing*), § 7 (*Deux états par champ*, *Fix Actions*) and § 9's
 * opening screen, region by region — under
 * [amendment D](../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md).
 *
 * **Field state is `@tanstack/react-form`; per-field validators are valibot Standard Schemas.**
 * Everything either of them decides is a pure function in `@/lib/rail/`, which is where the `node`
 * suite reaches it — this file is the wiring and the affordances.
 *
 * Rules this file exists to keep:
 *
 * - **The gates go in with the fields, not as a later pass.** Every control below renders its own
 *   breach from the same {@link evaluateGates} report that decides what the output half may show —
 *   a field built without its gate is a field written twice.
 * - **The form holds text; the store holds numbers.** A keystroke that parses commits a *canonical*
 *   value through `applyField`; one that does not leaves the Scenario alone, which is exactly the
 *   « Saisie en cours » contract: the last valid Sweep stays on screen. The synchronisation runs one
 *   way — store → form — and **skips the field that holds focus**, so nothing rewrites text under a
 *   caret.
 * - **TanStack Form marks every field touched on submit, and this app has no submit.** Nothing here
 *   reads `isTouched`: « Saisie en cours » is keyed on **focus**, which is the property § 7 names,
 *   and it works without that transition ever firing.
 * - **Every row component is declared at module scope**, and what it needs of the screen arrives
 *   through {@link RailRowContext}. A component declared inside `RailInputs` is a *new component
 *   type* on every render, and this component re-renders on every keystroke (`useStore` on the
 *   form's values): React would unmount the old subtree and mount a new `<input>`, so the caret
 *   would be lost after each character and the focus « Saisie en cours » rides on would never
 *   survive one. The context is deliberately unmemoised — it changes on every render anyway, and
 *   its consumers are children of this component, so they re-render either way.
 * - **A unit switch never writes state.** The selector changes `scenario.unit` and nothing else;
 *   every field's text is re-derived from canonical newtons, so daN→X→daN is the identity.
 * - **Parse failures render inline beneath the file control**, never in the banner slot — nothing
 *   about the current line changed — and **a rejected file leaves the current terrain untouched**.
 */

import type { ReactNode } from "react";

import { Link, useNavigate } from "@tanstack/react-router";
import { createContext, use, useEffect, useRef, useState } from "react";

import type { RailFormApi, RailFormState } from "@/components/app/use-rail-form.ts";
import type { Deduced, DeducedSolve } from "@/lib/rail/deduced.ts";
import type { FieldContext, FieldId } from "@/lib/rail/fields.ts";
import type { BlockingError, FixActionId } from "@/lib/rail/gates.ts";
import type { LadderRow } from "@/lib/rail/provenance.ts";
import type { NumericFieldId, RailValues } from "@/lib/rail/values.ts";
import type { ForceUnit, UseClass } from "@/lib/scenario/types.ts";
import type { RegimeId, TerminationId } from "@/lib/sim";
import type { ParseFailure } from "@/lib/terrain/csv.ts";

import { RailSection } from "@/components/app/shell.tsx";
import { useAppDispatch, useAppState } from "@/components/app/store.tsx";
import { browserStorage } from "@/components/app/use-persist.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button, buttonVariants } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { COPY_INCOMPLETE, copyLink } from "@/lib/app/persist.ts";
import { siteOrigin } from "@/lib/app/site.ts";
import { DOC_PAGES } from "@/lib/docs/pages.ts";
import { formatQuantity, formatValue } from "@/lib/format/quantity.ts";
import {
  checkField,
  commitField,
  displayField,
  FIELDS,
  fieldSchema,
  warningFor,
} from "@/lib/rail/fields.ts";
import { regimeUnavailableNote } from "@/lib/rail/gates.ts";
import { DEDUCED_HELP, FIELD_HELP, TIGHTNESS_HELP } from "@/lib/rail/help.ts";
import { PROVENANCE_COPY, warningLadder } from "@/lib/rail/provenance.ts";
import {
  applyField,
  applyGeometry,
  clearOverride,
  drivingField,
  fieldContext,
  spanLength,
  switchTightness,
} from "@/lib/rail/values.ts";
import { clearSession } from "@/lib/session/session.ts";
import { isFamilyAllowed, isRegimeAvailable, REGIMES, TERMINATIONS } from "@/lib/sim";
import { parseFailureMessage, parseProfileCsv, readFailure } from "@/lib/terrain/csv.ts";
import { encodeP1 } from "@/lib/url/p1.ts";
import { cn } from "@/lib/utils.ts";

import {
  Chip,
  Choice,
  DisabledReason,
  FixButton,
  InfoTip,
  NumericInput,
  Picker,
  ReadOut,
  Row,
  Segmented,
} from "./controls.tsx";

/**
 * § 3's two Unconfirmed Defaults and the derived values that carry the same chip — **the same copy
 * the aggregate prints**, from `@/lib/rail/provenance.ts`. A field's chip and that value's
 * aggregate entry may not be able to disagree about what backs the number.
 */
const PROVENANCE = PROVENANCE_COPY;

/** §10.4, stated where the option is disabled — the rule is a fact worth teaching. */
const TEXTILE_DISABLED_REASON =
  "§10.4 : fluage, UV/abrasion et fusion par friction (HMPE ~144–152 °C) ⇒ acier seul en installation permanente.";

/** §10.3, likewise: not forbidden — there is simply no efficiency to multiply by. */
const KNOT_ON_HMPE_REASON =
  "§10.3 : sur HMPE le nœud glisse (0,25–0,50). Aucun rendement défendable ⇒ épissure obligatoire.";

/** The three numeric fields that change the span, and therefore what `x_D` is clamped against. */
const SPAN_FIELDS = new Set<NumericFieldId>(["L", "sa", "sb"]);

/** § 3's `Classe de corde` entries. It drives exactly two things: `k`'s default and this list. */
const ROPE_CLASSES = [
  { value: "hmpe", label: "HMPE 12 torons" },
  { value: "pa-en1891a", label: "Polyamide EN 1891 type A" },
  { value: "polyester", label: "Polyester semi-statique" },
] as const;

/** What a row needs of the screen around it. **The reason every row is a module-scope component.** */
type RailRowContext = {
  readonly form: RailFormApi;
  /** The text the form currently holds — tier one runs over this, never over the Scenario. */
  readonly text: RailValues;
  readonly context: FieldContext;
  readonly unit: ForceUnit;
  /** One standing breach per culprit field, from the same report the output half reads. */
  readonly breaches: ReadonlyMap<FieldId, BlockingError>;
  /** A second culprit of the same check: **outline only**, never a second copy of the message. */
  readonly outlined: ReadonlySet<FieldId>;
  /** @returns the canonical value that **entered state**, or `null` when tier one refused. */
  readonly commit: (id: NumericFieldId, raw: string, settled: boolean) => number | null;
  readonly runFix: (id: FixActionId) => void;
  readonly setFocused: (id: FieldId | null) => void;
};

const RailRow = createContext<RailRowContext | null>(null);

function useRailRowContext(): RailRowContext {
  const row = use(RailRow);
  if (row === null) throw new Error("a Rail row rendered outside RailInputs");
  return row;
}

/**
 * `deduced` is the rider-free chain and `rail` the field state, **both from the app root** — one
 * `useUnloaded` line formatted once by `deducedFrom` for the Rail's two halves, and one form for
 * the Rail, the banner, the chart and the write side, which is what makes « Saisie en cours » one
 * fact rather than four opinions.
 */
export function RailInputs({
  cause,
  deduced,
  rail,
}: {
  /**
   * « Aucun résultat — portée invalide. », echoed into `Valeurs déduites`'s solve-dependent rows.
   * `null` when nothing is suppressed. The sentence is written once, in `@/lib/app/banner.ts`.
   */
  cause: string | null;
  deduced: Deduced;
  rail: RailFormState;
}) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { scenario, trace } = state;
  const { form, text, setFocused, report } = rail;

  /**
   * The last `x_D` clamp, as an **event**: a nonce so a second clamp restarts the note's timer.
   *
   * **Seeded from the link**, because § 3's clamp fires on *every* path — « typed input, a geometry
   * change, **a link arrival** » — and § 7 makes `x_D`'s note « the one place a clamp speaks ». A
   * recipient of `?L=150&x=999` reads 150,0 m in a field the sender never typed, and the rewrite
   * has already put that number in the address bar; without the note the discarded sender state
   * leaves no trace at all, which is precisely what the clamp was elected *against*.
   */
  const [clamped, setClamped] = useState<ClampEvent>(() =>
    state.link.xClamped ? { L: spanLength(scenario) ?? 0, nonce: 1 } : { L: 0, nonce: 0 },
  );
  const [importFailure, setImportFailure] = useState<ParseFailure | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const regimePicker = useRef<HTMLSelectElement | null>(null);
  // What a tightness switch prefills from under « Aucun résultat », where there is no read-out.
  const lastGoodSolve = useRef<DeducedSolve | null>(null);
  useEffect(() => {
    if (deduced.solve !== null) lastGoodSolve.current = deduced.solve;
  }, [deduced.solve]);

  // § 6's warning ladder, on the rows it qualifies. The terrain rung renders inside the terrain
  // disclosure block and the verdict rung is a banner state — neither is here, so nothing is said
  // twice.
  const ladder = warningLadder(scenario, deduced);
  const rung = (row: LadderRow): string | null =>
    ladder.find((warning) => warning.row === row)?.text ?? null;
  const context = fieldContext(scenario, trace);

  const breaches = new Map<FieldId, BlockingError>();
  const outlined = new Set<FieldId>();
  for (const error of report.errors) {
    breaches.set(error.field, error);
    for (const id of error.alsoOutlined) outlined.add(id);
  }

  function patch(next: typeof scenario) {
    dispatch({ type: "scénario/modifié", patch: next });
  }

  /**
   * @param settled `true` when the edit has landed — a blur — and `false` for a keystroke that is
   *   still mid-word. It changes nothing about the value; it decides only whether the span change
   *   may drag `x_D` with it.
   * @returns the canonical value that **entered state**, or `null` when tier one refused the text.
   *   Not the value that was asked for: `x_D` clamps, and the field has to snap to what the
   *   Scenario now holds rather than to what was typed.
   */
  function commit(id: NumericFieldId, raw: string, settled: boolean): number | null {
    if (checkField(id, raw, context) !== null) return null;
    const value = commitField(id, raw, context);
    if (value === null) return null;
    const applied = applyField(scenario, id, value);
    // **A span still being typed does not drag the viewpoint.** « 100 » into Station B passes
    // through « 1 », and clamping against a 1 m span would leave `x_D` at 1,0 m on the 100 m span
    // the user actually typed — a viewpoint destroyed by a keystroke nobody meant as a value. The
    // clamp lands when the edit lands; until then the scene clamps the *drawing* and state keeps
    // the position. `x_D` itself is exempt: it is the direct path and clamps as it is typed.
    const next = settled || !SPAN_FIELDS.has(id) ? applied : { ...applied, rider: scenario.rider };
    // **The note is driven by the clamp**, never by an out-of-range value surviving in state:
    // state is clamped on the way in, so a note conditioned on `0 ≤ x_D ≤ L` could only ever fire
    // where nothing moved. What is compared is the value asked for against the one that landed —
    // for `x_D` the typed one, for a span field the viewpoint it dragged along.
    announceClamp(next, id === "xD" ? value : scenario.rider.xD);
    patch(next);
    return id === "xD" ? next.rider.xD : value;
  }

  function runFix(id: FixActionId) {
    switch (id) {
      case "passer-a-l-acier":
        dispatch({ type: "matériau/famille", family: "steel" });
        return;
      case "passer-en-usage-temporaire":
        patch({ ...scenario, usage: "TEMPORAIRE" });
        return;
      case "choisir-un-autre-regime":
        // A **focus** action, and it does not open the picker: opening a popup from a remote
        // button covers the context the user has just travelled to.
        regimePicker.current?.focus();
        return;
      case "inverser-a-b": {
        if (scenario.geometry.source !== "trace") return;
        const { sa, sb } = scenario.geometry;
        // Through `applyGeometry` like every other span change: the swap is what *creates* the
        // span, so it is also the moment a viewpoint from the inverted state can be out of it.
        const next = applyGeometry(scenario, { ...scenario.geometry, sa: sb, sb: sa });
        announceClamp(next, scenario.rider.xD);
        patch(next);
      }
    }
  }

  /** The clamp note's one trigger: the value that landed is not the one that was asked for. */
  function announceClamp(next: typeof scenario, asked: number) {
    const L = spanLength(next);
    if (next.rider.xD !== asked && L !== null) {
      setClamped((previous) => ({ L, nonce: previous.nonce + 1 }));
    }
  }

  async function importProfile(file: File) {
    let text: string;
    try {
      text = await file.text();
    } catch {
      setImportFailure(readFailure(file.name));
      return;
    }
    const parsed = parseProfileCsv(text, file.name);
    if (!parsed.ok) {
      // A rejected file leaves the current terrain untouched: destroying it would turn a rejected
      // import into data loss.
      setImportFailure(parsed.failure);
      return;
    }
    setImportFailure(null);
    dispatch({ type: "tracé/importé", trace: parsed.trace, tr: encodeP1(parsed.trace) });
  }

  const unit = scenario.unit;
  // Narrowed once, here: TypeScript drops a property narrowing at every callback boundary, and the
  // Rail is nothing but callbacks.
  const steelSpec = scenario.material.family === "steel" ? scenario.material : null;
  const textileSpec = scenario.material.family === "textile" ? scenario.material : null;
  const driver = drivingField(scenario);
  const familyBreach = breaches.get("family");
  const regimeBreach = breaches.get("regime");
  /**
   * § 10.1's « une entrée indisponible montre sa raison », for the régime row. **One reason per
   * row, not one per disabled option** — `Picker`'s docblock argues that at 288 px, and the rule
   * applies here too — this select is spelled out rather than going through `Picker` only because
   * it carries a ref for the « choisir un autre régime » Fix Action. Today at most one régime is ever
   * unavailable, so the first is the reason; if a second ever were, they would share a cause and
   * the sentence would be the same twice.
   */
  const regimeReason =
    Object.values(REGIMES)
      .map((regime) => regimeUnavailableNote(regime.id, scenario.material.family, scenario.usage))
      .find((reason) => reason !== null) ?? null;

  // Unmemoised on purpose: every field of it is rebuilt each render anyway, and every consumer is
  // a child of this component. What matters is that the consumers are **stable component types**,
  // which they are only because they are declared at module scope.
  const row: RailRowContext = {
    form,
    text,
    context,
    unit,
    breaches,
    outlined,
    commit,
    runFix,
    setFocused,
  };

  return (
    <RailRow.Provider value={row}>
      <RailSection title="Paramètres">
        <div className="mt-2 flex flex-col gap-3">
          <Group title="Usage">
            <Row
              control={
                <Choice
                  name="usage"
                  onChange={(value: UseClass) => patch({ ...scenario, usage: value })}
                  options={[
                    { value: "PERMANENTE", label: "Permanente (public)" },
                    { value: "TEMPORAIRE", label: "Temporaire — secours & expédition" },
                  ]}
                  value={scenario.usage}
                />
              }
              help={FIELD_HELP.usage}
              label={FIELDS.usage.label}
              stacked
            />
            <Row
              control={
                <NativeSelect
                  className="max-w-44"
                  id="rail-regime"
                  onChange={(event) =>
                    patch({
                      ...scenario,
                      regime: event.target.value === "" ? null : (event.target.value as RegimeId),
                    })
                  }
                  ref={regimePicker}
                  size="sm"
                  value={scenario.regime ?? ""}
                >
                  {/* No default, and its absence is legitimate state — never a hole to fill. */}
                  <NativeSelectOption value="">— choisir —</NativeSelectOption>
                  {Object.values(REGIMES).map((regime) => {
                    const unavailable = !isRegimeAvailable(
                      regime.id,
                      scenario.material.family,
                      scenario.usage,
                    );
                    return (
                      <NativeSelectOption disabled={unavailable} key={regime.id} value={regime.id}>
                        {/* `— indisponible` is `Picker`'s and `Choice`'s own convention, and it
                            says *that*; § 10.1's *why* is the row's note below. */}
                        {unavailable ? `${regime.label} — indisponible` : regime.label}
                      </NativeSelectOption>
                    );
                  })}
                </NativeSelect>
              }
              help={FIELD_HELP.regime}
              htmlFor="rail-regime"
              label={FIELDS.regime.label}
              message={
                regimeBreach === undefined
                  ? undefined
                  : { text: regimeBreach.message, blocking: regimeBreach.kind !== "empty" }
              }
              // § 10.1's reason and § 7's Fix Action share the one full-width slot, reason first:
              // it explains the state the Fix Action offers to leave, so reading it in the other
              // order asks the user to act before they are told why.
              note={
                regimeReason === null &&
                (regimeBreach === undefined || regimeBreach.fixes.length === 0) ? null : (
                  <>
                    {regimeReason !== null && <DisabledReason reason={regimeReason} />}
                    {regimeBreach !== undefined && regimeBreach.fixes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {regimeBreach.fixes.map((fix) => (
                          <FixButton
                            key={fix.id}
                            label={fix.label}
                            onClick={() => runFix(fix.id)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )
              }
            />
          </Group>

          <Group title="Géométrie">
            {scenario.geometry.source === "manual" ? (
              <>
                <NumericRow hint="m" id="L" />
                <NumericRow hint="m" id="h" />
              </>
            ) : (
              <>
                <NumericRow hint="m" id="sa" />
                <NumericRow hint="m" id="sb" />
              </>
            )}
            <NumericRow hint="m" id="zA" />
            <NumericRow hint="m" id="zB" />
            <FileControls
              failure={importFailure}
              geometrySource={scenario.geometry.source}
              onChoose={() => fileInput.current?.click()}
              onRemove={() => dispatch({ type: "tracé/retiré" })}
              onReuse={() => {
                if (state.trace !== null) {
                  dispatch({ type: "tracé/réutilisé", tr: encodeP1(state.trace) });
                }
              }}
              trace={trace}
            />
            {/* A **button, not a drop zone**: the chart already carries three drag targets. The
                file element itself is never seen — it is the mechanism `Importer un profil…`
                clicks — but it goes through the registry all the same, so « no `<input>` outside
                `ui/` » stays one grep with no exception to remember. */}
            <Input
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file !== undefined) void importProfile(file);
              }}
              ref={fileInput}
              type="file"
            />
          </Group>

          <Group title="Ligne">
            <Row
              control={
                <Choice
                  name="family"
                  onChange={(family: "steel" | "textile") =>
                    dispatch({ type: "matériau/famille", family })
                  }
                  options={[
                    { value: "steel", label: "Câble acier" },
                    {
                      value: "textile",
                      label: "Corde textile",
                      // **Visible but disabled, with the reason inline** — hiding it leaves a user
                      // who came to compare families with no explanation.
                      disabled: !isFamilyAllowed("textile", scenario.usage),
                      reason: TEXTILE_DISABLED_REASON,
                    },
                  ]}
                  value={scenario.material.family}
                />
              }
              help={FIELD_HELP.family}
              label={FIELDS.family.label}
              message={
                familyBreach === undefined
                  ? undefined
                  : { text: familyBreach.message, blocking: true }
              }
              note={
                familyBreach !== undefined ? (
                  <div className="flex flex-wrap gap-1">
                    {familyBreach.fixes.map((fix) => (
                      <FixButton key={fix.id} label={fix.label} onClick={() => runFix(fix.id)} />
                    ))}
                  </div>
                ) : null
              }
              stacked
            />

            {steelSpec !== null ? (
              <>
                <NumericRow hint="mm" id="d" />
                <Row
                  control={
                    <Picker
                      id="rail-r0"
                      onChange={(value) =>
                        patch({
                          ...scenario,
                          material: { ...steelSpec, R0: Number(value) as 1770 | 1960 },
                        })
                      }
                      options={[
                        { value: "1770", label: "1770" },
                        { value: "1960", label: "1960" },
                      ]}
                      value={String(steelSpec.R0)}
                    />
                  }
                  help={FIELD_HELP.R0}
                  hint="N/mm²"
                  htmlFor="rail-r0"
                  label={FIELDS.R0.label}
                />
                <Row
                  control={
                    <Picker
                      id="rail-cst"
                      onChange={(value) =>
                        patch({
                          ...scenario,
                          material: { ...steelSpec, construction: value as "fibre-core" | "iwrc" },
                        })
                      }
                      options={[
                        { value: "fibre-core", label: "6×19 âme textile" },
                        { value: "iwrc", label: "6×19 âme métallique" },
                      ]}
                      value={steelSpec.construction}
                    />
                  }
                  help={FIELD_HELP.cst}
                  htmlFor="rail-cst"
                  label={FIELDS.cst.label}
                />
              </>
            ) : (
              <>
                <Row
                  control={
                    <Picker
                      id="rail-cls"
                      onChange={(value) => {
                        if (textileSpec === null) return;
                        const ropeClass = value as (typeof ROPE_CLASSES)[number]["value"];
                        patch({
                          ...scenario,
                          // `Classe de corde` drives exactly two things: the `k` default and the
                          // termination whitelist. Polyester's default is **`null`, not a number**.
                          material: {
                            ...textileSpec,
                            ropeClass,
                            k: ropeClass === "polyester" ? null : ropeClass === "hmpe" ? 22 : 1.5,
                          },
                        });
                      }}
                      options={ROPE_CLASSES}
                      value={textileSpec?.ropeClass ?? "hmpe"}
                    />
                  }
                  help={FIELD_HELP.cls}
                  htmlFor="rail-cls"
                  label={FIELDS.cls.label}
                />
                <NumericRow hint={unit} id="MBL" />
                <NumericRow hint="kg/m" id="muTextile" />
                <NumericRow
                  id="k"
                  // The **ambient** tier: plain status text, **no ⚠**. It fires on every textile
                  // line — a tyrolienne never enters §13.2's 10–30 % MBL band — so an alarm here
                  // would be permanent and therefore mute.
                  note={<AmbientNote text={rung("k")} />}
                />
              </>
            )}

            <TerminationRow
              end="A"
              family={scenario.material.family}
              onPick={(id) =>
                patch({
                  ...scenario,
                  terminations: {
                    ...scenario.terminations,
                    A: { id, eta: TERMINATIONS[id].eta },
                  },
                })
              }
              ropeClass={textileSpec?.ropeClass}
              selected={scenario.terminations.A.id}
            />
            <NumericRow id="etaA" label="Rendement η_A" />
            <TerminationRow
              end="B"
              family={scenario.material.family}
              onPick={(id) =>
                patch({
                  ...scenario,
                  terminations: {
                    ...scenario.terminations,
                    B: { id, eta: TERMINATIONS[id].eta },
                  },
                })
              }
              ropeClass={textileSpec?.ropeClass}
              selected={scenario.terminations.B.id}
            />
            <NumericRow id="etaB" label="Rendement η_B" />
          </Group>

          <Group title="Tension de la ligne">
            {/* Exactly one field is editable; the other two appear under `Valeurs déduites`.
                Switching mode **pre-fills the new field from its read-out**. */}
            <div className="flex items-center gap-1 py-1">
              <span className="text-muted-foreground text-xs">Pilote</span>
              <InfoTip label="Pilote de tension" text={TIGHTNESS_HELP} />
            </div>
            <Segmented
              onChange={(mode) =>
                patch(switchTightness(scenario, mode, deduced, lastGoodSolve.current))
              }
              options={[
                { value: "sag", label: "Flèche" },
                { value: "tension", label: "Tension" },
                { value: "length", label: "Longueur" },
                { value: "ratio", label: "Rapport V" },
              ]}
              value={scenario.tightness.mode}
            />
            {driver === "D_target" && <NumericRow hint="m" id="D_target" />}
            {driver === "H_target" && <NumericRow hint={unit} id="H_target" />}
            {driver === "L0" && <NumericRow hint="m" id="L0" />}
            {/* `P / H` — the passenger's design load over the horizontal pretension. It resolves to
                a `H_target` from `m_p`, so the resulting `Prétension` shows under `Valeurs
                déduites` like any other mode's. */}
            {driver === "vRatio" && (
              <NumericRow
                hint="P/H"
                id="vRatio"
                note={
                  <AmbientNote text="P / H : poids du passager sur la prétension horizontale — plus il est grand, plus la ligne forme un V sous le passager." />
                }
              />
            )}
          </Group>

          <Group title="Passager">
            <NumericRow hint="kg" id="mp" />
            <NumericRow hint="m" id="hRider" />
            {/* The threshold the clearance read-outs are judged against (2026-09-23). Beside the
                envelope because both are clearance inputs; a Clearance Gate field like it. */}
            <NumericRow hint="m" id="hClearMin" />
            <NumericRow
              chip={<Chip detail={PROVENANCE.DAF} label="§8.2" tone="neutral" />}
              id="DAF"
              // The second half of one condition: below 3 % of flèche / portée the line is outside
              // the regime the 1,2 ceiling was measured in. It is **not** a duplicate of the row on
              // `Flèche / portée`, and deleting either half hides half the finding.
              warning={rung("DAF")}
            />
            <NumericRow hint="m" id="xD" note={<ClampNote event={clamped} />} />
          </Group>
        </div>
      </RailSection>

      <RailSection title="Valeurs déduites">
        <div className="mt-2">
          {deduced.span !== null && scenario.geometry.source === "trace" && (
            <>
              <ReadOut
                help={DEDUCED_HELP.L}
                label="Portée"
                value={formatQuantity("L", deduced.span.L)}
              />
              <ReadOut
                help={DEDUCED_HELP.h}
                label="Dénivelé"
                value={formatQuantity("h", deduced.span.h)}
              />
              {/* § 4's anchor-placement block prints the two base altitudes **beside** `Portée` and
                  `Dénivelé`: they are what says *where on the hill* the placement sits, and without
                  them a station read-out is a number with no altitude behind it. One row each rather
                  than the block's single « · »-joined line — the Rail is a 255 px column, and `·` is
                  the sketch's layout, not its copy. */}
              {deduced.span.bases !== null && (
                <>
                  <ReadOut
                    help={DEDUCED_HELP.zBaseA}
                    label="Alt. base A"
                    value={formatQuantity("zBase", deduced.span.bases.zBaseA)}
                  />
                  <ReadOut
                    help={DEDUCED_HELP.zBaseB}
                    label="Alt. base B"
                    value={formatQuantity("zBase", deduced.span.bases.zBaseB)}
                  />
                </>
              )}
            </>
          )}

          {steelSpec !== null ? (
            <>
              <DerivedRow
                chip={
                  deduced.material.overridden.MBF ? (
                    <Chip
                      detail="Valeur saisie : elle entre dans la liste des valeurs sans référence normative confirmée."
                      label="valeur saisie"
                      tone="neutral"
                    />
                  ) : (
                    <Chip detail={PROVENANCE.MBF} label="[STD-ATTESTED]" tone="neutral" />
                  )
                }
                formula={deduced.material.formula?.MBF ?? null}
                id="mbfOverride"
                label="Charge de rupture"
                onRecalculate={() => patch(clearOverride(scenario, "MBF"))}
                quantity="MBF"
                stale={deduced.material.stale.MBF}
                unit={unit}
              >
                <NumericRow hint={unit} id="mbfOverride" label="Charge de rupture" />
              </DerivedRow>
              <DerivedRow
                formula={deduced.material.formula?.EA ?? null}
                id="eaOverride"
                label="Raideur axiale"
                onRecalculate={() => patch(clearOverride(scenario, "EA"))}
                quantity="EA"
                stale={deduced.material.stale.EA}
                unit={unit}
              >
                <NumericRow hint="MN" id="eaOverride" label="Raideur axiale" />
              </DerivedRow>
              <DerivedRow
                formula={deduced.material.formula?.mu ?? null}
                id="muOverride"
                label="Masse linéique"
                onRecalculate={() => patch(clearOverride(scenario, "mu"))}
                quantity="mu"
                stale={deduced.material.stale.mu}
                unit={unit}
              >
                <NumericRow hint="kg/m" id="muOverride" label="Masse linéique" />
              </DerivedRow>
            </>
          ) : (
            deduced.material.strength !== null && (
              <>
                <ReadOut
                  help={DEDUCED_HELP.MBL}
                  label="Charge de rupture"
                  value={formatQuantity("MBL", deduced.material.strength, unit)}
                />
                {deduced.material.EA !== null && (
                  <ReadOut
                    help={DEDUCED_HELP.EAtextile}
                    label="Raideur axiale"
                    value={formatQuantity("EA", deduced.material.EA)}
                  />
                )}
              </>
            )
          )}

          {/* `corde` and `w` are the only two rows independent of a solve. */}
          {deduced.material.w !== null && (
            <ReadOut
              help={DEDUCED_HELP.w}
              label="Poids linéique"
              value={formatQuantity("w", deduced.material.w, unit)}
            />
          )}
          {deduced.span !== null && (
            <ReadOut
              help={DEDUCED_HELP.chord}
              label="Corde"
              value={formatQuantity("chord", deduced.span.chord)}
            />
          )}

          {/* **The cause governs, not `deduced.solve`.** The rider-free chain is derived from the
              Scenario, which cannot hold a committed-invalid « −5 » or an emptied `m_p` — so under
              a Solve Gate breach it still resolves, and printing `L₀ 151,64 m` beside « aucun
              résultat » is the stale number invariant 3 forbids. A refusal and a gate breach both
              arrive here as the one sentence § 7 writes once. */}
          {deduced.solve !== null && cause === null && (
            <>
              {driver !== "L0" && (
                <ReadOut
                  help={DEDUCED_HELP.L0}
                  label="Longueur non tendue"
                  value={formatQuantity("L0", deduced.solve.L0)}
                />
              )}
              {driver !== "H_target" && (
                <ReadOut
                  help={DEDUCED_HELP.H}
                  label="Prétension"
                  value={formatQuantity("H_target", deduced.solve.H, unit)}
                />
              )}
              {driver !== "D_target" && (
                <ReadOut
                  help={DEDUCED_HELP.sag}
                  label="Flèche à vide"
                  value={`${formatQuantity("sag", deduced.solve.sag)} (à x ${formatValue(
                    "extremumX",
                    deduced.solve.sagAtX,
                  )} m)`}
                />
              )}
              <ReadOut
                help={DEDUCED_HELP.sagRatio}
                label="Flèche / portée"
                value={formatQuantity("sagRatio", deduced.solve.sagRatio)}
                warning={rung("sagRatio")}
              />
              <ReadOut
                help={DEDUCED_HELP.standingTension}
                label="Tension permanente"
                value={`${formatQuantity("standingTension", deduced.solve.standingTension)} ${
                  scenario.material.family === "steel" ? "MBF" : "MBL"
                }`}
                warning={rung("standingTension")}
              />
            </>
          )}

          {/* § 7's third echo. The cause sentence is written **once** and repeated in each
              suppressed region, because the Rail is one scrolling column and a rail reader may
              never have the banner in view. It replaces the five solve-dependent rows — `L₀`,
              `H à vide`, la flèche à vide, `flèche / portée`, la tension permanente — and never
              `corde` or `w`, which are independent of a solve and stay above it. */}
          {cause !== null && <p className="text-muted-foreground mt-1 text-xs">{cause}</p>}
        </div>
      </RailSection>
    </RailRow.Provider>
  );
}

/**
 * One numeric field, with its gate's message, its warning and its Fix Actions.
 *
 * **Module scope, and it may never move back inside `RailInputs`.** Declared there it would be a
 * fresh component type on every keystroke, and React would remount the `<input>` under the caret.
 */
function NumericRow({
  id,
  label = FIELDS[id].label,
  hint,
  chip,
  note,
  warning,
}: {
  id: NumericFieldId;
  label?: string;
  hint?: string;
  chip?: ReactNode;
  note?: ReactNode;
  /** § 6's Avertissement tier, beside § 3's own band warning — the row can carry either. */
  warning?: string | null;
}) {
  const { form, text, context, unit, breaches, outlined, commit, runFix, setFocused } =
    useRailRowContext();
  const breach = breaches.get(id);
  const value = text[id] ?? "";
  const parsed = checkField(id, value, context) === null ? Number(value.replace(",", ".")) : NaN;
  return (
    <form.Field
      name={id}
      validators={{ onBlur: fieldSchema(id, context), onChange: fieldSchema(id, context) }}
    >
      {(field) => (
        <Row
          chip={chip}
          help={FIELD_HELP[id]}
          control={
            <NumericInput
              id={`rail-${id}`}
              invalid={breach !== undefined && breach.kind !== "empty"}
              onBlur={(raw) => {
                field.handleBlur();
                setFocused(null);
                // « Rounding is always visible »: on commit the field snaps to exactly what state
                // now holds — 82,5 kg reads back « 83 kg », a clamped `x_D` reads back the span's
                // own end — and a refused text stays as typed, because what the user typed is the
                // evidence the ⛔ message quotes.
                const committed = commit(id, raw, true);
                if (committed !== null) field.handleChange(displayField(id, committed, unit));
              }}
              onChange={(raw) => {
                field.handleChange(raw);
                commit(id, raw, false);
              }}
              onFocus={() => setFocused(id)}
              value={field.state.value}
            />
          }
          hint={hint}
          htmlFor={`rail-${id}`}
          label={label}
          message={
            breach === undefined
              ? undefined
              : { text: breach.message, blocking: breach.kind !== "empty" }
          }
          note={
            <>
              {note}
              {breach !== undefined && breach.fixes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {breach.fixes.map((fix) => (
                    <FixButton key={fix.id} label={fix.label} onClick={() => runFix(fix.id)} />
                  ))}
                </div>
              )}
            </>
          }
          outlined={outlined.has(id)}
          warning={
            breach === undefined ? (warningFor(id, parsed, context) ?? warning ?? null) : null
          }
        />
      )}
    </form.Field>
  );
}

/**
 * The Rail Header's own controls — § 9's sketch, « Scoutech [daN ▾] [ Copier le lien ] [⋯] »:
 * § 3's **global** force selector, § 7's copy button and the overflow menu's two Session controls.
 *
 * **The two menu items are deliberately not interchangeable.** « Réinitialiser le scénario » is
 * non-destructive — the Trace stays cached, the retained spec and the display preferences survive —
 * and carries **no confirmation**, because a dialog on a harmless action trains the user to click
 * through the one that guards real data loss. « Effacer la session » *is* that one.
 */
export function RailHeaderControls({
  /**
   * « Saisie en cours ». The same condition suspends both writes, so the button and the address bar
   * agree about what the app is currently able to publish — and the button says so rather than
   * copying the last complete Scenario under a screen that no longer shows it.
   */
  incomplete = false,
}: {
  incomplete?: boolean;
}) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [copied, setCopied] = useState<string | null>(null);

  /**
   * **The link is built from state, not from the address bar**, which is what « flushes pending
   * state synchronously » means with a debounced writer: the ≈400 ms timer may still be pending and
   * the copied link already carries the last keystroke.
   */
  async function copy() {
    const result = copyLink({
      scenario: state.scenario,
      trace: state.trace,
      origin: siteOrigin(),
    });
    if (!result.ok) {
      // **Refuse rather than degrade**: a terrain-less link of an imported scenario is not a weaker
      // link, it is a different scenario.
      setCopied(result.message);
      return;
    }
    try {
      await navigator.clipboard.writeText(result.href);
      setCopied("Lien copié.");
    } catch {
      // A refused clipboard is not a refused link: the href is valid and the user can still read
      // it off the address bar, which holds the same state.
      setCopied("Copie refusée par le navigateur — le lien est dans la barre d'adresse.");
    }
  }

  return (
    <div className="ml-auto flex items-center gap-2">
      <NativeSelect
        aria-label="Unité de force"
        onChange={(event) =>
          // **A unit switch never writes state.** `u` selects how forces *read*, nothing more.
          dispatch({
            type: "scénario/modifié",
            patch: { ...state.scenario, unit: event.target.value as ForceUnit },
          })
        }
        size="sm"
        value={state.scenario.unit}
      >
        <NativeSelectOption value="daN">daN</NativeSelectOption>
        <NativeSelectOption value="kN">kN</NativeSelectOption>
        <NativeSelectOption value="kgf">kgf</NativeSelectOption>
      </NativeSelect>
      <Button
        disabled={incomplete}
        onClick={() => void copy()}
        size="sm"
        title={incomplete ? COPY_INCOMPLETE : undefined}
        type="button"
        variant="outline"
      >
        Copier le lien
      </Button>
      <details className="relative">
        {/* `buttonVariants` as a class string, not `<Button render={<summary />}>`: Base UI's
            `Button` **enforces button semantics** and would stamp `role="button"` on the summary,
            which is the one element in this menu whose own semantics open the disclosure. Same
            pattern as `__root.tsx` and `refusal.tsx`. */}
        <summary
          className={cn(
            buttonVariants({ variant: "outline", size: "icon-sm" }),
            "cursor-pointer list-none",
          )}
        >
          ⋯
        </summary>
        <div className="bg-popover border-border absolute right-0 z-10 mt-1 flex w-64 flex-col gap-1 border px-3 py-2 shadow-md">
          <Button
            className="h-auto w-full flex-col items-start gap-1 py-1 text-left whitespace-normal"
            onClick={() => {
              dispatch({ type: "scénario/réinitialisé" });
              // Back to a **bare** `/`, with `replace` — never `push`: a pushed entry would make
              // Back a near-undo of the reset, and « near » is exactly the problem, since writes
              // are debounced and suspended under « Saisie en cours ».
              void navigate({ replace: true, search: {}, to: "/" });
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            <span className="font-medium">Réinitialiser le scénario</span>
            {/* The menu item states its own consequence — there is no confirmation, and that is a
                decision: a dialog on a non-destructive action trains the user to click through the
                one that guards real data loss. */}
            <span className="text-muted-foreground block text-xs font-normal">
              Revient aux valeurs de départ. Le tracé importé est retiré du terrain mais reste en
              mémoire.
            </span>
          </Button>
          <Button
            className="text-destructive h-auto w-full flex-col items-start gap-1 py-1 text-left whitespace-normal"
            onClick={() => {
              const storage = browserStorage();
              if (storage === null) return;
              // The **only destructive control**, so the only confirmation — and it warns harder
              // when the cached Trace arrived by link, because that one cannot be re-imported from
              // a file: `fileName === null` **is** « tracé reçu par lien ».
              const extra =
                state.trace !== null && state.trace.fileName === null
                  ? "\n\nCe tracé est arrivé par lien : il ne pourra pas être réimporté depuis un fichier."
                  : "";
              if (!window.confirm(`${CLEAR_SESSION_CONFIRM}${extra}`)) return;
              clearSession(storage);
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            <span className="font-medium">Effacer la session</span>
            <span className="text-muted-foreground block text-xs font-normal">
              Supprime le tracé en mémoire, la spec conservée et les préférences d'affichage.
            </span>
          </Button>
          <Separator className="my-1" />
          {/* The documentation — the theory the engine is built against and the reports behind
              it, rendered at `/docs`. Links wearing `buttonVariants`, never `<Button render>`:
              they navigate, and Base UI's button would take the anchor's semantics away. */}
          <p className="text-muted-foreground px-2.5 text-xs">Documentation</p>
          {DOC_PAGES.map((page) => (
            <Link
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "h-auto w-full justify-start py-1 text-left font-normal whitespace-normal",
              )}
              key={page.slug}
              params={{ slug: page.slug }}
              to="/docs/$slug"
            >
              {page.title}
            </Link>
          ))}
        </div>
      </details>
      {copied !== null && (
        // The outcome stands until the next copy, and is never dismissed on a timer: a refusal
        // that vanishes on its own is a refusal the reader may never have seen.
        <span aria-live="polite" className="text-muted-foreground max-w-64 text-xs">
          {copied}
        </span>
      )}
    </div>
  );
}

/** § 9's confirmation for the one control that destroys data. */
const CLEAR_SESSION_CONFIRM =
  "Effacer la session supprime le tracé en mémoire, la Material Spec conservée et les préférences d'affichage. Continuer ?";

/**
 * One of § 3's five `Paramètres` groups.
 *
 * A `<section>` with an `<h3>`, **not `ui/field.tsx`'s `FieldSet` / `FieldLegend`**: those render a
 * `<fieldset>`, whose UA `min-inline-size: min-content` cannot shrink — the exact hazard
 * {@link Row}'s `stacked` docblock records at the Rail's 288 px. The rows inside carry their own
 * `py-1`, so the group adds no gap of its own.
 */
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-foreground/70 text-xs font-semibold">{title}</h3>
      <div className="mt-1">{children}</div>
    </section>
  );
}

/**
 * § 4's three controls plus the file-identity line, which has **four** states — the fourth being
 * what « Réinitialiser le scénario » leaves behind, and the reason the cached Trace is not dead
 * weight.
 */
function FileControls({
  trace,
  geometrySource,
  failure,
  onChoose,
  onRemove,
  onReuse,
}: {
  trace: { fileName: string | null } | null;
  geometrySource: "manual" | "trace";
  failure: ParseFailure | null;
  onChoose: () => void;
  onRemove: () => void;
  onReuse: () => void;
}) {
  const active = geometrySource === "trace" && trace !== null;
  const cached = geometrySource === "manual" && trace !== null;
  const name = trace?.fileName;
  return (
    <div className="flex flex-col gap-1 py-1">
      <div className="flex flex-wrap items-center gap-1">
        <Button onClick={onChoose} size="sm" type="button" variant="outline">
          Importer un profil…
        </Button>
        {active && (
          <Button onClick={onRemove} size="sm" type="button" variant="outline">
            Retirer le tracé
          </Button>
        )}
        {cached && (
          <Button onClick={onReuse} size="sm" type="button" variant="outline">
            Réutiliser ce tracé
          </Button>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        {active
          ? // A link carries the payload but not the filename.
            (name ?? "tracé reçu par lien")
          : cached
            ? name === null || name === undefined
              ? "tracé reçu par lien (non utilisé)"
              : `Tracé en mémoire : ${name} (non utilisé)`
            : "(aucun tracé)"}
      </p>
      {failure !== null && (
        <div className="flex flex-col gap-1">
          {/* **Inline beneath the control, never in the banner slot** — nothing about the current
              line changed, and a rejected file leaves the current terrain untouched. */}
          <p className="text-destructive text-xs">⛔ {parseFailureMessage(failure)}</p>
          <div className="flex flex-wrap gap-1">
            <FixButton label="Choisir un autre fichier" onClick={onChoose} />
          </div>
        </div>
      )}
    </div>
  );
}

/** One termination picker. **A prohibition is a disabled option with its reason**, not an error. */
function TerminationRow({
  end,
  family,
  ropeClass,
  selected,
  onPick,
}: {
  end: "A" | "B";
  family: "steel" | "textile";
  /** `Classe de corde`'s second job: the knot whitelist. `undefined` on a steel line. */
  ropeClass: string | undefined;
  selected: TerminationId;
  onPick: (id: TerminationId) => void;
}) {
  const options = Object.values(TERMINATIONS)
    .filter((termination) => termination.family === family || termination.family === "both")
    .map((termination) => ({
      value: termination.id,
      label: termination.label,
      // §10.3's 0,25–0,50 describes a knot that *slips*: there is no efficiency to multiply by,
      // hence no honest number to compute with. Serre-câbles étrier, by contrast, stays
      // **selectable** — a defensible `η_t` exists and the Verdict refuses the rig.
      disabled: termination.knot && ropeClass === "hmpe",
    }));
  // **One reason per row.** Both knots are disabled by the same §10.3 rule, and printing it twice
  // says nothing the first copy did not.
  const knotsDisabled = options.some((option) => option.disabled);
  return (
    <Row
      control={
        <Picker
          id={`rail-t${end.toLowerCase()}`}
          onChange={(value) => onPick(value)}
          options={options}
          value={selected}
        />
      }
      help={end === "A" ? FIELD_HELP.ta : FIELD_HELP.tb}
      htmlFor={`rail-t${end.toLowerCase()}`}
      label={`Terminaison ${end}`}
      note={knotsDisabled ? <DisabledReason reason={KNOT_ON_HMPE_REASON} /> : null}
    />
  );
}

/**
 * A steel derived value: an editable field that flips to « valeur saisie », plus the **stale
 * badge** and its one-click « Recalculer ».
 *
 * The badge copy carries **no « maintenant »** — messages state, buttons act — and the reset is a
 * button rather than a clause in the sentence.
 */
function DerivedRow({
  id,
  stale,
  formula,
  quantity,
  unit,
  chip,
  onRecalculate,
  children,
}: {
  id: NumericFieldId;
  label: string;
  stale: boolean;
  formula: number | null;
  quantity: "MBF" | "EA" | "mu";
  unit: ForceUnit;
  /** A neutral provenance chip. The « non confirmé » ones live in `Provenance` alone. */
  chip?: ReactNode;
  onRecalculate: () => void;
  children: ReactNode;
}) {
  return (
    <div data-field={id}>
      {chip !== undefined && <div className="flex items-start justify-end gap-1">{chip}</div>}
      {children}
      {stale && formula !== null && (
        <div className="flex flex-wrap items-center gap-1">
          {/* The stale marker is a chip, and the quantity inside it is mono like every other
              computed value — the sentence around it is prose and stays sans. */}
          <Badge className="bg-warning/15 text-warning" variant="secondary">
            ⚠ la formule donne
            <span className="font-mono">{formatQuantity(quantity, formula, unit)}</span>
          </Badge>
          <FixButton label="Recalculer" onClick={onRecalculate} />
        </div>
      )}
    </div>
  );
}

/** How long § 3's clamp note stays up, ms — the same budget the View Strip's note uses. */
const CLAMP_NOTE_MS = 4000;

/**
 * One clamp that **happened**: the span it landed on, and a nonce so a second clamp against the
 * same span restarts the timer rather than passing unnoticed. `nonce: 0` is « none yet ».
 */
type ClampEvent = { readonly L: number; readonly nonce: number };

/**
 * `x_D`'s clamp **is not silent**, and this is the one place a clamp speaks.
 *
 * It renders an **event**, never a state: `x_D` is clamped on the way into the Scenario, so a note
 * conditioned on « the Scenario holds a position outside the span » would be a note that can only
 * fire where no clamp happened. The caller compares what was asked for against what landed and
 * raises {@link ClampEvent}; this component only decides how long it stays up.
 */
function ClampNote({ event }: { event: ClampEvent }) {
  // The note is derived: the latest event shows until its nonce is marked expired. The effect
  // only owns the timer — it never sets state synchronously, so no cascading render.
  const [expiredNonce, setExpiredNonce] = useState(0);
  const shown = event.nonce !== 0 && event.nonce !== expiredNonce ? event : null;

  useEffect(() => {
    if (event.nonce === 0) return;
    // Transient — it is a note about a move that just happened, not a state of the field.
    const timer = setTimeout(() => setExpiredNonce(event.nonce), CLAMP_NOTE_MS);
    return () => clearTimeout(timer);
  }, [event]);

  return (
    <span aria-live="polite" className="text-muted-foreground block text-xs" role="status">
      {shown === null ? (
        ""
      ) : (
        <>
          position ramenée à la portée :{" "}
          <span className="font-mono">0 – {formatValue("x_D", shown.L)}</span> m
        </>
      )}
    </span>
  );
}

/**
 * The ladder's **ambient** rung: plain status text beside the value, with **no ⚠**.
 *
 * The tier is defined by a property rather than by taste — it fires *always*, so an alarm would
 * fire always and mean nothing. Textile `k` is its one case: §13.2 publishes the ratio for 10–30 %
 * MBL and a zip line stands at ≈0,6 % and rides at ≈6,3 %, so every rope is out of band.
 */
function AmbientNote({ text }: { text: string | null }) {
  if (text === null) return null;
  return <p className="text-muted-foreground text-xs">{text}</p>;
}
