/**
 * The Rail's **input half** — « v1 build spec » § 3 (the whole field table, the Tightness Spec, the
 * §10.4 use-class gate, Override, `Valeurs déduites`), § 4 (*Deux sources, un concept*, *Échecs de
 * parsing*), § 7 (*Deux états par champ*, *Fix Actions*) and § 9's opening screen, region by region
 * — under [amendment D](../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md).
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

import type { ReactNode, RefObject } from "react";

import { Link, useNavigate } from "@tanstack/react-router";
import { createContext, Fragment, use, useEffect, useRef, useState } from "react";

import type { RailFormApi, RailFormState } from "@/components/app/use-rail-form.ts";
import type { Deduced, DeducedSolve, ReadOutRow } from "@/lib/rail/deduced.ts";
import type { FieldContext, FieldId } from "@/lib/rail/fields.ts";
import type { BlockingError, FixActionId } from "@/lib/rail/gates.ts";
import type { PresetProvenance } from "@/lib/rail/presets.ts";
import type { LadderRow } from "@/lib/rail/provenance.ts";
import type { Results } from "@/lib/rail/results.ts";
import type { DriverTakeOver, NumericFieldId, RailValues } from "@/lib/rail/values.ts";
import type { DynamicsReading } from "@/lib/scenario/dynamics.ts";
import type { ForceUnit, ScenarioDraft, UseClass } from "@/lib/scenario/types.ts";
import type { TerminationId, TextileSpec } from "@/lib/sim";
import type { ParseFailure } from "@/lib/terrain/csv.ts";
import type { Trace, TraceEnds } from "@/lib/terrain/trace.ts";
import type { Register } from "@/lib/vocabulary/labels.ts";

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
import { formatQuantity } from "@/lib/format/quantity.ts";
import { deducedRows } from "@/lib/rail/deduced.ts";
import {
  airDensityShown,
  DYNAMICS_HEADING,
  QUASI_STATIC_LABEL,
  quasiStaticRow,
  STEEL_TROLLEY_NOTE,
  trolleyMuChip,
} from "@/lib/rail/dynamics.ts";
import {
  CARRYING_LINES_OPTIONS,
  checkField,
  CONSTRUCTION_OPTIONS,
  displayField,
  FAMILY_LABEL,
  FIELDS,
  fieldLabel,
  fieldSchema,
  OVERRIDE_COPY,
  parseDecimal,
  PICKER_COPY,
  regimeChoice,
  ROPE_CLASS_OPTIONS,
  TENSIONING_DEVICE_OPTIONS,
  TENSIONING_SIDE_OPTIONS,
  usageOptions,
  warningFor,
} from "@/lib/rail/fields.ts";
import {
  regimeUnavailableNote,
  TEXTILE_UNAVAILABLE_REASON,
  terminationOptions,
} from "@/lib/rail/gates.ts";
import {
  DEDUCED_HELP,
  FIELD_HELP,
  GEOADMIN_HELP,
  LV95_HELP,
  PRESET_HELP,
  QUASI_STATIC_HELP,
  TENSION_LIMIT_HELP,
  TIGHTNESS_HELP,
} from "@/lib/rail/help.ts";
import {
  MATERIAL_PRESETS,
  PRESET_LABEL,
  applyMaterialPreset,
  presetProvenance,
} from "@/lib/rail/presets.ts";
import { PROVENANCE_COPY, warningLadder } from "@/lib/rail/provenance.ts";
import { RETENSION } from "@/lib/rail/retension.ts";
import { limitReading, MAESTRO_ROPE_ONLY, PASS_TO_PULLEY } from "@/lib/rail/tensioning.ts";
import {
  applyRopeClass,
  applyShippedTerminations,
  clearOverride,
  commitPageText,
  drivingField,
  fieldContext,
  idleShown,
  isGatedField,
  POSITION_FIELDS,
  positionPairNote,
  spanLength,
  switchTightness,
  TERMINATION_FIELD,
} from "@/lib/rail/values.ts";
import { airDensityOf } from "@/lib/scenario/dynamics.ts";
import { clearSession } from "@/lib/session/session.ts";
import { isFamilyAllowed, isRegimeAvailable, REGIMES, TERMINATIONS } from "@/lib/sim";
import { parseFailureMessage, parseProfileCsv, readFailure } from "@/lib/terrain/csv.ts";
import { geoadminNotice, loadGeoadminProfile } from "@/lib/terrain/geoadmin.ts";
import { formatLv95, inLv95Domain, lv95FromWgs84 } from "@/lib/terrain/lv95.ts";
import { PROFILE_IMPORT_COPY, traceName } from "@/lib/terrain/provenance.ts";
import { encodeP1 } from "@/lib/url/p1.ts";
import { cn } from "@/lib/utils.ts";
import { heading, label } from "@/lib/vocabulary/labels.ts";

import type { ClampEvent } from "./controls.tsx";

import {
  Chip,
  Choice,
  ClampNote,
  DisabledReason,
  FixButton,
  GroupHeading,
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

/** What a row needs of the screen around it. **The reason every row is a module-scope component.** */
export type RailRowContext = {
  readonly form: RailFormApi;
  /** The text the form currently holds — tier one runs over this, never over the Scenario. */
  readonly text: RailValues;
  readonly context: FieldContext;
  readonly unit: ForceUnit;
  /** The Page's vocabulary (#61): it labels the rows, and only Avancé's carry help. */
  readonly register: Register;
  /** One standing breach per culprit field, from the same report the output half reads. */
  readonly breaches: ReadonlyMap<FieldId, BlockingError>;
  /** A second culprit of the same check: **outline only**, never a second copy of the message. */
  readonly outlined: ReadonlySet<FieldId>;
  /** @returns the canonical value that **entered state**, or `null` when tier one refused. */
  readonly commit: (id: NumericFieldId, raw: string, settled: boolean) => number | null;
  /** A choice's write — a whole Scenario, through the store's one patch action. */
  readonly patch: (next: ScenarioDraft) => void;
  readonly runFix: (id: FixActionId, breach: BlockingError) => void;
  readonly setFocused: (id: FieldId | null) => void;
  /** The régime picker, which « Choisir un autre régime » focuses. */
  readonly regimePicker: RefObject<HTMLSelectElement | null>;
};

export const RailRow = createContext<RailRowContext | null>(null);

function useRailRowContext(): RailRowContext {
  const row = use(RailRow);
  if (row === null) throw new Error("a Rail row rendered outside RailInputs");
  return row;
}

/**
 * The context a Page's field rows render against, and the writer behind it — **one for every
 * Page**, so a field on Statique and the same field on Avancé commit through `commitPageText`,
 * raise the same breach and repair with the same Fix Action.
 *
 * @param onCommitted after a write lands, with the value the text asked for — the Rail's clamp
 *   note listens here.
 * @param takeOver the one driver a Page offers alone, which a keystroke takes the line over with —
 *   Statique's tension de pose. `lastGood` is read when the keystroke lands.
 */
export function useFieldRows({
  rail,
  register,
  onCommitted,
  takeOver,
}: {
  rail: RailFormState;
  register: Register;
  onCommitted?: (committed: {
    readonly id: NumericFieldId;
    readonly next: ScenarioDraft;
    readonly asked: number | null;
  }) => void;
  takeOver?: Omit<DriverTakeOver, "lastGood"> & {
    readonly lastGood: RefObject<DeducedSolve | null>;
  };
}): RailRowContext {
  const { scenario, trace } = useAppState();
  const dispatch = useAppDispatch();
  const regimePicker = useRef<HTMLSelectElement | null>(null);
  const { form, text, setFocused, report } = rail;
  const context = fieldContext(scenario, register);

  const breaches = new Map<FieldId, BlockingError>();
  const outlined = new Set<FieldId>();
  for (const error of report.errors) {
    breaches.set(error.field, error);
    for (const id of error.alsoOutlined) outlined.add(id);
  }

  function patch(next: ScenarioDraft) {
    dispatch({ type: "scénario/modifié", patch: next });
  }

  function commit(id: NumericFieldId, raw: string, settled: boolean): number | null {
    const { next, value, asked, write } = commitPageText({
      scenario,
      trace,
      id,
      raw,
      settled,
      text,
      context,
      takeOver:
        takeOver === undefined ? undefined : { ...takeOver, lastGood: takeOver.lastGood.current },
    });
    if (next !== null) onCommitted?.({ id, next, asked });
    if (write !== null) patch(write);
    return value;
  }

  function runFix(id: FixActionId, breach: BlockingError) {
    switch (id) {
      case "passer-au-cable":
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
      case "passer-a-la-terminaison-de-depart":
        patch(applyShippedTerminations(scenario, breach));
    }
  }

  // Unmemoised on purpose: every field of it is rebuilt each render anyway, and every consumer is
  // a child of the Page's fields. What matters is that the consumers are **stable component
  // types**, which they are only because they are declared at module scope.
  return {
    form,
    text,
    context,
    unit: scenario.unit,
    register,
    breaches,
    outlined,
    commit,
    patch,
    runFix,
    setFocused,
    regimePicker,
  };
}

/**
 * The last solve the line had — what a driver switch or a take-over prefills from under « Aucun
 * résultat », where there is no read-out. Read when the write lands, never during render.
 */
export function useLastGoodSolve(deduced: Deduced): RefObject<DeducedSolve | null> {
  const lastGood = useRef<DeducedSolve | null>(null);
  useEffect(() => {
    if (deduced.solve !== null) lastGood.current = deduced.solve;
  }, [deduced.solve]);
  return lastGood;
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
  dynamics,
  rail,
  results,
  rideCause,
  children,
}: {
  /**
   * « Aucun résultat — portée invalide. », echoed into `Valeurs déduites`'s solve-dependent rows.
   * `null` when nothing is suppressed. The sentence is written once, in `@/lib/app/banner.ts`.
   */
  cause: string | null;
  deduced: Deduced;
  /**
   * The passager's two rides, read off the same solved traverse the charts draw — `null` without
   * one. The Rail reads §12.1's check off it, beside the constants the rides ran on.
   */
  dynamics: DynamicsReading | null;
  rail: RailFormState;
  /** The traverse aggregate; the limite de tension's warning reads « T max » off it. */
  results: Results | null;
  /** Why the gates withhold the rides from a line that stands — said on §12.1's row — or `null`. */
  rideCause: string | null;
  /**
   * Where the two sections go. `Paramètres` and `Valeurs déduites` share one field-row context —
   * `Valeurs déduites` holds the three override fields — but stand in different columns of the
   * page, so the context's owner cannot also be their parent. It hands them over instead, and
   * renders what the caller builds from them **inside** the provider.
   */
  children: (sections: { parameters: ReactNode; deduced: ReactNode }) => ReactNode;
}) {
  const state = useAppState();
  const { scenario, trace } = state;
  const { text } = rail;

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
    state.link.xClamped ? { L: spanLength(scenario, trace) ?? 0, nonce: 1 } : { L: 0, nonce: 0 },
  );
  const lastGoodSolve = useLastGoodSolve(deduced);

  // § 6's warning ladder, on the rows it qualifies. The terrain rung renders inside the terrain
  // disclosure block and the verdict rung is a banner state — neither is here, so nothing is said
  // twice.
  const ladder = warningLadder(scenario, deduced, results);
  const rung = (row: LadderRow): string | null =>
    ladder.find((warning) => warning.row === row)?.text ?? null;
  const readOuts = deducedRows(scenario, deduced, cause, results);
  const row = useFieldRows({
    rail,
    register: "exact",
    // **The note is driven by the clamp**, never by an out-of-range value surviving in state:
    // state is clamped on the way in, so a note conditioned on `0 ≤ x_D ≤ L` could only ever fire
    // where nothing moved. What is compared is the value asked for against the one that landed —
    // for `x_D` the typed one, for a span field the viewpoint it dragged along.
    onCommitted: ({ id, next, asked }) => {
      if (asked !== null) announceClamp(next, id === "xD" ? asked : scenario.rider.xD);
    },
  });
  const { patch } = row;

  /** The clamp note's one trigger: the value that landed is not the one that was asked for. */
  function announceClamp(next: typeof scenario, asked: number) {
    const L = spanLength(next, trace);
    if (next.rider.xD !== asked && L !== null) {
      setClamped((previous) => ({ L, nonce: previous.nonce + 1 }));
    }
  }

  const unit = scenario.unit;
  // Narrowed once, here: TypeScript drops a property narrowing at every callback boundary, and the
  // Rail is nothing but callbacks.
  const steelSpec = scenario.material.family === "steel" ? scenario.material : null;
  const textileSpec = scenario.material.family === "textile" ? scenario.material : null;
  const provenance = textileSpec === null ? {} : presetProvenance(textileSpec);
  const driver = drivingField(scenario);
  const limit = limitReading(scenario, unit);
  // The imported profil sets `ρ` only while it is the line's ground, as on Dynamique.
  const rho = airDensityShown(
    airDensityOf(scenario.dynamics.rho, scenario.geometry.source === "trace" ? trace : null),
  );
  const quasiStatic = quasiStaticRow(dynamics, rideCause);
  const muChip = trolleyMuChip(scenario.dynamics.mu);

  const parameters = (
    <RailSection title="Paramètres">
      <div className="mt-2 flex flex-col gap-3">
        <Group title="Installation et régime">
          <UsageRow />
          <RegimeRow />
        </Group>

        <Group title="Géométrie">
          {/* An imported profil is taken whole, so its `Portée` and `Dénivelé` are read-outs. */}
          {scenario.geometry.source === "manual" && (
            <>
              <NumericRow hint="m" id="L" />
              <NumericRow hint="m" id="h" />
            </>
          )}
          <NumericRow hint="m" id="zA" />
          <NumericRow hint="m" id="zB" />
          <ProfileImport />
        </Group>

        <Group title="Ligne">
          <FamilyRow />
          <CarryingLinesRow />

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
                    onChange={(construction) =>
                      patch({ ...scenario, material: { ...steelSpec, construction } })
                    }
                    options={CONSTRUCTION_OPTIONS}
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
              <PresetRow />
              <Row
                chip={presetChip(provenance.cls)}
                control={
                  <Picker
                    id="rail-cls"
                    onChange={(ropeClass) => patch(applyRopeClass(scenario, ropeClass))}
                    options={ROPE_CLASS_OPTIONS}
                    value={textileSpec?.ropeClass ?? "hmpe"}
                  />
                }
                help={FIELD_HELP.cls}
                htmlFor="rail-cls"
                label={FIELDS.cls.label}
              />
              <NumericRow chip={presetChip(provenance.MBL)} hint={unit} id="MBL" />
              <NumericRow chip={presetChip(provenance.muTextile)} hint="kg/m" id="muTextile" />
              <NumericRow chip={presetChip(provenance.dTextile)} hint="mm" id="dTextile" />
              <NumericRow
                chip={presetChip(provenance.k)}
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
            ropeClass={textileSpec?.ropeClass ?? null}
            selected={scenario.terminations.A.id}
          />
          <NumericRow id="etaA" label={`${FIELDS.etaA.label}_A`} />
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
            ropeClass={textileSpec?.ropeClass ?? null}
            selected={scenario.terminations.B.id}
          />
          <NumericRow id="etaB" label={`${FIELDS.etaB.label}_B`} />
        </Group>

        <Group title="Tension de la ligne">
          <TensioningDeviceRow warning={rung("tensioningDevice")} />
          {/* What the prétension is read against. Its ⚠ is the prétension's own row's. */}
          {limit !== null && (
            <ReadOut
              chip={<Chip detail={limit.provenance} label="Petzl" tone="neutral" />}
              help={TENSION_LIMIT_HELP}
              label={heading("tensionLimit", "exact")}
              value={limit.value}
            />
          )}
          {/* Where the prétension is read — whatever drives, since its read-out reads there too. */}
          <TensioningSideRow />
          {/* Exactly one field is editable; the other four appear under `Valeurs déduites`.
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
              { value: "anchor", label: "Prétension" },
              { value: "tension", label: "H" },
              { value: "length", label: "Longueur" },
              { value: "ratio", label: "Rapport V" },
            ]}
            value={scenario.tightness.mode}
          />
          {driver === "D_target" && <NumericRow hint="m" id="D_target" />}
          {driver === "T_target" && (
            <NumericRow hint={unit} id="T_target" warning={rung("pretension")} />
          )}
          {driver === "H_target" && <NumericRow hint={unit} id="H_target" />}
          {driver === "L0" && <NumericRow hint="m" id="L0" />}
          {/* `P / H` — the passenger's design load over the tension horizontale. It resolves to
                a `H_target` from `m_p`, so the resulting `Tension horizontale` shows under
                `Valeurs déduites` like any other mode's. */}
          {driver === "vRatio" && (
            <NumericRow
              hint="P/H"
              id="vRatio"
              note={
                <AmbientNote text="P / H : poids du passager sur la tension horizontale — plus il est grand, plus la ligne forme un V sous le passager." />
              }
            />
          )}
          <RetensionNote />
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
          <NumericRow
            hint="m"
            id="xD"
            note={<ClampNote className="text-muted-foreground block text-xs" event={clamped} />}
          />
        </Group>

        {/* The Vent (#87): no statics, clearance or Verdict reads it — the ride (#89) and the
              Banane do. The rose writes the same two fields from the vue de dessus. */}
        <Group title={heading("wind", "exact")}>
          <NumericRow hint="km/h" id="windSpeed" />
          <NumericRow hint="°" id="windDirection" />
        </Group>

        {/* §12.2's constants, each editable and labelled, none silent (#89, #104). Only the
              passager's ride reads them; the trolley's law is the line's family's. */}
        <Group title={DYNAMICS_HEADING}>
          <NumericRow
            chip={<Chip detail={PROVENANCE.CdA} label="§12.2" tone="neutral" />}
            hint="m²"
            id="CdA"
          />
          {textileSpec !== null ? (
            <>
              <NumericRow
                chip={<Chip detail={PROVENANCE.trolleyFriction} label="§12.2" tone="neutral" />}
                hint={unit}
                id="F0"
              />
              <NumericRow
                chip={<Chip detail={PROVENANCE.trolleyFriction} label="§12.2" tone="neutral" />}
                hint="kg/s"
                id="kv"
              />
            </>
          ) : (
            <NumericRow
              chip={
                <Chip
                  detail={PROVENANCE.trolleyMu}
                  label={muChip}
                  tone={muChip === "non confirmé" ? "warning" : "neutral"}
                />
              }
              id="trolleyMu"
              // The **ambient** tier, like `k`: it is said on every câble, so it carries no ⚠.
              note={<AmbientNote text={STEEL_TROLLEY_NOTE} />}
            />
          )}
          <NumericRow
            chip={<Chip detail={PROVENANCE.rho} label="§12.2" tone="neutral" />}
            hint="kg/m³"
            id="rho"
            idle={rho.idle}
            note={<AmbientNote text={rho.note} />}
          />
          {quasiStatic !== null && (
            <ReadOut
              help={QUASI_STATIC_HELP}
              label={QUASI_STATIC_LABEL}
              value={quasiStatic.value}
              warning={quasiStatic.warning}
            />
          )}
          {quasiStatic?.cause != null && (
            <p className="text-muted-foreground text-xs">{quasiStatic.cause}</p>
          )}
        </Group>

        {/* The Positions (#90): typed in WGS84, read in LV95. The statics never read them; the
              profil geo.admin is loaded between them (#103). */}
        <Group title={heading("position", "exact")}>
          {(["A", "B"] as const).map((end) => {
            const note = positionPairNote(text, end);
            const position = scenario.positions[end];
            return (
              <Fragment key={end}>
                <NumericRow
                  hint="°"
                  id={POSITION_FIELDS[end][0]}
                  warning={text[POSITION_FIELDS[end][0]].trim() === "" ? note : null}
                />
                <NumericRow
                  hint="°"
                  id={POSITION_FIELDS[end][1]}
                  warning={text[POSITION_FIELDS[end][1]].trim() === "" ? note : null}
                />
                {position !== null && (
                  <ReadOut
                    help={LV95_HELP}
                    label={`${label("lv95", "exact")} ${end} (${label("approximate", "exact")})`}
                    value={
                      inLv95Domain(position)
                        ? formatLv95(lv95FromWgs84(position))
                        : "hors du domaine suisse"
                    }
                  />
                )}
              </Fragment>
            );
          })}
          <GeoadminControls />
        </Group>
      </div>
    </RailSection>
  );

  const deducedSection = (
    <RailSection title="Valeurs déduites">
      <div className="mt-2">
        {readOuts
          .filter((row) => row.group === "placement")
          .map((row) => (
            <DeducedReadOut key={row.id} row={row} />
          ))}

        {steelSpec !== null && (
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
              label={FIELDS.mbfOverride.label}
              onRecalculate={() => patch(clearOverride(scenario, "MBF"))}
              quantity="MBF"
              stale={deduced.material.stale.MBF}
              unit={unit}
            >
              <NumericRow hint={unit} id="mbfOverride" />
            </DerivedRow>
            <DerivedRow
              formula={deduced.material.formula?.EA ?? null}
              id="eaOverride"
              label={FIELDS.eaOverride.label}
              onRecalculate={() => patch(clearOverride(scenario, "EA"))}
              quantity="EA"
              stale={deduced.material.stale.EA}
              unit={unit}
            >
              <NumericRow hint="MN" id="eaOverride" />
            </DerivedRow>
            <DerivedRow
              formula={deduced.material.formula?.mu ?? null}
              id="muOverride"
              label={FIELDS.muOverride.label}
              onRecalculate={() => patch(clearOverride(scenario, "mu"))}
              quantity="mu"
              stale={deduced.material.stale.mu}
              unit={unit}
            >
              <NumericRow hint="kg/m" id="muOverride" />
            </DerivedRow>
          </>
        )}

        {readOuts
          .filter((row) => row.group === "line")
          .map((row) => (
            <DeducedReadOut key={row.id} row={row} />
          ))}

        {/* § 7's third echo. The cause sentence is written **once** and repeated in each
              suppressed region, because the Rail is one scrolling column and a rail reader may
              never have the banner in view. It replaces the five solve-dependent rows — `L₀`,
              `H à vide`, la flèche à vide, `flèche / portée`, la tension à vide — and never
              `ligne A–B` or `w`, which are independent of a solve and stay above it. */}
        {cause !== null && <p className="text-muted-foreground mt-1 text-xs">{cause}</p>}
      </div>
    </RailSection>
  );

  return (
    <RailRow.Provider value={row}>
      {children({ parameters, deduced: deducedSection })}
    </RailRow.Provider>
  );
}

/**
 * « Pourquoi on retend » (#104): the trial's loss of prétension, quoted where the Mise en tension is
 * set — and nothing computed from it.
 */
function RetensionNote() {
  return (
    <div className="border-border mt-2 flex flex-col gap-1 border-t pt-2">
      <h4 className="text-xs font-semibold">{RETENSION.title}</h4>
      <p className="text-muted-foreground text-xs">{RETENSION.text}</p>
      <p className="text-muted-foreground text-xs">{RETENSION.source}</p>
    </div>
  );
}

/** One read-only `Valeurs déduites` row, decided whole by `deducedRows`. */
function DeducedReadOut({ row }: { row: ReadOutRow }) {
  return (
    <ReadOut
      help={DEDUCED_HELP[row.id]}
      label={row.label}
      value={row.value}
      warning={row.warning}
    />
  );
}

/**
 * One numeric field, with its gate's message, its warning and its Fix Actions.
 *
 * **Module scope, and it may never move back inside `RailInputs`.** Declared there it would be a
 * fresh component type on every keystroke, and React would remount the `<input>` under the caret.
 */
export function NumericRow({
  id,
  label,
  hint,
  chip,
  note,
  warning,
  idle,
}: {
  id: NumericFieldId;
  /** The Page's own wording for the field, where it is not `fieldLabel`'s. */
  label?: string;
  hint?: string;
  chip?: ReactNode;
  note?: ReactNode;
  /** § 6's Avertissement tier, beside § 3's own band warning — the row can carry either. */
  warning?: string | null;
  /**
   * What the field shows while the Scenario does not hold it — a read-out the first keystroke takes
   * over. Focusing and leaving it untouched writes nothing, so a shared line is not re-driven by a
   * glance.
   */
  idle?: string;
}) {
  const { form, text, context, unit, register, breaches, outlined, commit, runFix, setFocused } =
    useRailRowContext();
  const breach = breaches.get(id);
  const value = text[id] ?? "";
  const issue = checkField(id, value, context);
  const parsed = issue === null ? (parseDecimal(value) ?? NaN) : NaN;
  // A field in no gate has no breach to show its failure, but its text is still refused.
  const shown = breach ?? (isGatedField(id) ? null : issue);
  return (
    <form.Field
      name={id}
      validators={{ onBlur: fieldSchema(id, context), onChange: fieldSchema(id, context) }}
    >
      {(field) => {
        const idling = idleShown(idle, field.state.value);
        return (
          <Row
            chip={chip}
            // The help is Avancé's: it explains the computation in the exact register.
            help={register === "exact" ? FIELD_HELP[id] : undefined}
            control={
              <NumericInput
                id={`rail-${id}`}
                invalid={shown !== null && shown.kind !== "empty"}
                onBlur={(raw) => {
                  field.handleBlur();
                  setFocused(null);
                  if (idling !== null) return;
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
                value={idling ?? field.state.value}
              />
            }
            hint={hint}
            htmlFor={`rail-${id}`}
            label={label ?? fieldLabel(id, register)}
            message={
              shown === null ? undefined : { text: shown.message, blocking: shown.kind !== "empty" }
            }
            note={
              <>
                {note}
                {breach !== undefined && <FixButtons breach={breach} onFix={runFix} />}
              </>
            }
            outlined={outlined.has(id)}
            warning={shown === null ? (warningFor(id, parsed, context) ?? warning ?? null) : null}
          />
        );
      }}
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
  page,
}: {
  incomplete?: boolean;
  /** The router path of the Page the Rail is on — the copied link opens that Page. */
  page: string;
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
      page,
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
              // Back to this Page **bare**, with `replace` — never `push`: a pushed entry would make
              // Back a near-undo of the reset, and « near » is exactly the problem, since writes
              // are debounced and suspended under « Saisie en cours ».
              void navigate({ replace: true, search: {}, to: "." });
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
              Revient aux valeurs de départ. Le profil importé est retiré du terrain mais reste en
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
              // a file.
              const extra =
                state.trace?.origin.kind === "lien"
                  ? "\n\nCe profil est arrivé par lien : il ne pourra pas être réimporté depuis un fichier."
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
              Supprime le profil en mémoire, la spec conservée et les préférences d'affichage.
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
  "Effacer la session supprime le profil en mémoire, la Material Spec conservée et les préférences d'affichage. Continuer ?";

/**
 * One of § 3's five `Paramètres` groups.
 *
 * A `<section>` with an `<h3>`, **not `ui/field.tsx`'s `FieldSet` / `FieldLegend`**: those render a
 * `<fieldset>`, whose UA `min-inline-size: min-content` cannot shrink — the exact hazard
 * {@link Row}'s `stacked` docblock records at the Rail's 288 px. The rows inside carry their own
 * `py-1`, so the group adds no gap of its own.
 */
export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <GroupHeading title={title} />
      <div className="mt-1">{children}</div>
    </section>
  );
}

/** Help is Avancé's: only the exact register carries it. */
function helpFor(register: Register, help: string): string | undefined {
  return register === "exact" ? help : undefined;
}

// ── The choice rows both Pages show ─────────────────────────────────────────────────────────────
// Each is declared **once**, worded by the context's register (#61), and writes through the
// context's `patch` and repairs through its `runFix` — so a choice made on either Page is the same
// write.

/** The installation, which § 10.4's textile gate and the régimes' availability both read. */
export function UsageRow() {
  const { scenario } = useAppState();
  const { register, patch } = useRailRowContext();
  return (
    <Row
      control={
        <Choice
          name="usage"
          onChange={(usage: UseClass) => patch({ ...scenario, usage })}
          options={usageOptions(register)}
          value={scenario.usage}
        />
      }
      help={helpFor(register, FIELD_HELP.usage)}
      label={fieldLabel("usage", register)}
      stacked
    />
  );
}

/**
 * The régime — the marge exigée on a terrain Page — with § 10.1's reason and § 7's Fix Actions.
 *
 * **One reason per row, not one per disabled option** — `Picker`'s docblock argues that at 288 px.
 * This select is spelled out rather than going through `Picker` only because it carries the ref
 * « Choisir un autre régime » focuses. Today at most one régime is ever unavailable, so the first
 * is the reason; if a second ever were, they would share a cause and the sentence would repeat.
 */
export function RegimeRow() {
  const { scenario } = useAppState();
  const { register, breaches, patch, runFix, regimePicker } = useRailRowContext();
  const breach = breaches.get("regime");
  const { family } = scenario.material;
  const reason =
    Object.values(REGIMES)
      .map((regime) => regimeUnavailableNote(regime.id, family, scenario.usage, register))
      .find((note) => note !== null) ?? null;
  const fixes = breach?.fixes ?? [];
  return (
    <Row
      control={
        <NativeSelect
          className="max-w-44"
          id="rail-regime"
          onChange={(event) => patch({ ...scenario, regime: regimeChoice(event.target.value) })}
          ref={regimePicker}
          size="sm"
          value={scenario.regime ?? ""}
        >
          {/* No default, and its absence is legitimate state — never a hole to fill. */}
          <NativeSelectOption value="">{PICKER_COPY.empty}</NativeSelectOption>
          {Object.values(REGIMES).map((regime) => {
            const unavailable = !isRegimeAvailable(regime.id, family, scenario.usage);
            return (
              <NativeSelectOption disabled={unavailable} key={regime.id} value={regime.id}>
                {/* The suffix says *that*; § 10.1's *why* is the row's note below. */}
                {unavailable ? `${regime.label} — ${PICKER_COPY.unavailable}` : regime.label}
              </NativeSelectOption>
            );
          })}
        </NativeSelect>
      }
      help={helpFor(register, FIELD_HELP.regime)}
      htmlFor="rail-regime"
      label={fieldLabel("regime", register)}
      message={
        breach === undefined
          ? undefined
          : { text: breach.message, blocking: breach.kind !== "empty" }
      }
      // § 10.1's reason and § 7's Fix Action share the one full-width slot, reason first: it
      // explains the state the Fix Action offers to leave.
      note={
        reason === null && fixes.length === 0 ? null : (
          <>
            {reason !== null && <DisabledReason reason={reason} />}
            {breach !== undefined && <FixButtons breach={breach} onFix={runFix} />}
          </>
        )
      }
    />
  );
}

/** The line's family, and § 10.4's textile gate with its Fix Actions. */
export function FamilyRow() {
  const { scenario } = useAppState();
  const dispatch = useAppDispatch();
  const { register, breaches, runFix } = useRailRowContext();
  const breach = breaches.get("family");
  return (
    <Row
      control={
        <Choice
          name="family"
          onChange={(family: "steel" | "textile") => dispatch({ type: "matériau/famille", family })}
          options={[
            { value: "steel", label: FAMILY_LABEL.steel },
            {
              value: "textile",
              label: FAMILY_LABEL.textile,
              // **Visible but disabled, with the reason inline** — hiding it leaves a user who
              // came to compare families with no explanation.
              disabled: !isFamilyAllowed("textile", scenario.usage),
              reason: TEXTILE_UNAVAILABLE_REASON,
            },
          ]}
          value={scenario.material.family}
        />
      }
      help={helpFor(register, FIELD_HELP.family)}
      label={fieldLabel("family", register)}
      message={breach === undefined ? undefined : { text: breach.message, blocking: true }}
      note={breach === undefined ? null : <FixButtons breach={breach} onFix={runFix} />}
      stacked
    />
  );
}

/** One or two carrying members. */
export function CarryingLinesRow() {
  const { scenario } = useAppState();
  const { register, patch } = useRailRowContext();
  return (
    <Row
      control={
        <Choice
          name="carryingLines"
          onChange={(count) => patch({ ...scenario, carryingLines: count === "2" ? 2 : 1 })}
          options={CARRYING_LINES_OPTIONS}
          value={`${scenario.carryingLines}` as const}
        />
      }
      help={helpFor(register, FIELD_HELP.carryingLines)}
      label={fieldLabel("carryingLines", register)}
      stacked
    />
  );
}

/**
 * A rope preset — an **action**, not a selection: the Scenario holds the values, never the
 * preset's name, so the select returns to « — choisir — » after filling.
 */
export function PresetRow() {
  const { scenario } = useAppState();
  const { register, patch } = useRailRowContext();
  return (
    <Row
      control={
        <Picker
          id="rail-preset"
          onChange={(id) => patch(applyMaterialPreset(scenario, id))}
          options={MATERIAL_PRESETS.map(({ id, label }) => ({ value: id, label }))}
          value=""
        />
      }
      help={helpFor(register, PRESET_HELP)}
      htmlFor="rail-preset"
      label={PRESET_LABEL}
    />
  );
}

/**
 * The Mise en tension's device. A Maestro is a rope device: unavailable on a câble, though one that
 * arrived there is still the held value and keeps its entry — and its warning.
 *
 * @param label the Page's own name for the row, where its group already names the Mise en tension.
 * @param warning § 6's Avertissement for this row, off the Page's warning ladder.
 */
export function TensioningDeviceRow({
  label,
  warning,
}: {
  label?: string;
  warning: string | null;
}) {
  const { scenario } = useAppState();
  const { register, patch } = useRailRowContext();
  const steel = scenario.material.family === "steel";
  return (
    <Row
      control={
        <Picker
          id="rail-tensioningDevice"
          onChange={(device) => patch({ ...scenario, tensioningDevice: device })}
          options={TENSIONING_DEVICE_OPTIONS.map((option) => ({
            ...option,
            disabled: option.value !== "pulley" && steel,
          }))}
          value={scenario.tensioningDevice}
        />
      }
      help={helpFor(register, FIELD_HELP.tensioningDevice)}
      htmlFor="rail-tensioningDevice"
      label={label ?? fieldLabel("tensioningDevice", register)}
      note={
        warning !== null ? (
          <div className="flex flex-wrap gap-1">
            <FixButton
              label={PASS_TO_PULLEY}
              onClick={() => patch({ ...scenario, tensioningDevice: "pulley" })}
            />
          </div>
        ) : steel ? (
          <DisabledReason reason={MAESTRO_ROPE_ONLY} />
        ) : undefined
      }
      warning={warning}
    />
  );
}

/** The anchor carrying the Mise en tension — where the prétension is read, whatever drives. */
export function TensioningSideRow() {
  const { scenario } = useAppState();
  const { register, patch } = useRailRowContext();
  return (
    <Row
      control={
        <Segmented
          onChange={(side) => patch({ ...scenario, tensioningSide: side })}
          options={TENSIONING_SIDE_OPTIONS}
          value={scenario.tensioningSide}
        />
      }
      help={helpFor(register, FIELD_HELP.tensioningSide)}
      label={fieldLabel("tensioningSide", register)}
      stacked
    />
  );
}

/** A breach's Fix Actions, one button each. */
function FixButtons({
  breach,
  onFix,
}: {
  breach: BlockingError;
  onFix: (id: FixActionId, breach: BlockingError) => void;
}) {
  if (breach.fixes.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {breach.fixes.map((fix) => (
        <FixButton key={fix.id} label={fix.label} onClick={() => onFix(fix.id, breach)} />
      ))}
    </div>
  );
}

/**
 * The profil's import, on every Page that takes one: § 4's controls, the file element they click,
 * and the parse failure they report. **A rejected file leaves the current terrain untouched**, and
 * its failure renders here, inline, never in the banner slot — nothing about the current line
 * changed.
 */
export function ProfileImport() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [failure, setFailure] = useState<ParseFailure | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  async function importProfile(file: File) {
    let text: string;
    try {
      text = await file.text();
    } catch {
      setFailure(readFailure(file.name));
      return;
    }
    const parsed = parseProfileCsv(text, file.name);
    if (!parsed.ok) {
      // Destroying the current terrain would turn a rejected import into data loss.
      setFailure(parsed.failure);
      return;
    }
    setFailure(null);
    dispatch({ type: "tracé/importé", trace: parsed.trace, tr: encodeP1(parsed.trace) });
  }

  return (
    <>
      <FileControls
        failure={failure}
        geometrySource={state.scenario.geometry.source}
        onChoose={() => fileInput.current?.click()}
        onRemove={() => dispatch({ type: "tracé/retiré" })}
        onReuse={() => {
          if (state.trace !== null) {
            dispatch({ type: "tracé/réutilisé", tr: encodeP1(state.trace) });
          }
        }}
        onReuseCsv={() => {
          if (state.retainedCsv !== null) {
            const csv = state.retainedCsv;
            dispatch({ type: "tracé/importé", trace: csv, tr: encodeP1(csv) });
          }
        }}
        retainedCsv={state.retainedCsv}
        trace={state.trace}
      />
      {/* A **button, not a drop zone**: the chart already carries three drag targets. The file
          element itself is never seen — it is the mechanism `Importer un profil…` clicks — but it
          goes through the registry all the same, so « no `<input>` outside `ui/` » stays one grep
          with no exception to remember. */}
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
    </>
  );
}

/**
 * § 4's three controls plus the file-identity line, which has **four** states — the fourth being
 * what « Réinitialiser le scénario » leaves behind, and the reason the cached Trace is not dead
 * weight. A CSV a profil geo.admin displaced (#103) gets its own line and its own way back.
 */
function FileControls({
  trace,
  retainedCsv,
  geometrySource,
  failure,
  onChoose,
  onRemove,
  onReuse,
  onReuseCsv,
}: {
  trace: Trace | null;
  retainedCsv: Trace | null;
  geometrySource: "manual" | "trace";
  failure: ParseFailure | null;
  onChoose: () => void;
  onRemove: () => void;
  onReuse: () => void;
  onReuseCsv: () => void;
}) {
  const active = geometrySource === "trace" && trace !== null;
  const cached = geometrySource === "manual" && trace !== null;
  const name = trace === null ? null : traceName(trace.origin);
  return (
    <div className="flex flex-col gap-1 py-1">
      <div className="flex flex-wrap items-center gap-1">
        <Button onClick={onChoose} size="sm" type="button" variant="outline">
          {PROFILE_IMPORT_COPY.choose}
        </Button>
        {active && (
          <Button onClick={onRemove} size="sm" type="button" variant="outline">
            {PROFILE_IMPORT_COPY.remove}
          </Button>
        )}
        {cached && (
          <Button onClick={onReuse} size="sm" type="button" variant="outline">
            {PROFILE_IMPORT_COPY.reuse}
          </Button>
        )}
        {retainedCsv !== null && (
          <Button onClick={onReuseCsv} size="sm" type="button" variant="outline">
            {PROFILE_IMPORT_COPY.reuseCsv}
          </Button>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        {active
          ? name
          : cached
            ? trace.origin.kind === "csv"
              ? `${PROFILE_IMPORT_COPY.cachedCsv} ${name} ${PROFILE_IMPORT_COPY.unused}`
              : `${name} ${PROFILE_IMPORT_COPY.unused}`
            : PROFILE_IMPORT_COPY.none}
      </p>
      {retainedCsv !== null && (
        <p className="text-muted-foreground text-xs">
          {PROFILE_IMPORT_COPY.retainedCsv} {traceName(retainedCsv.origin)}{" "}
          {PROFILE_IMPORT_COPY.unused}
        </p>
      )}
      {failure !== null && (
        <div className="flex flex-col gap-1">
          {/* **Inline beneath the control, never in the banner slot** — nothing about the current
              line changed, and a rejected file leaves the current terrain untouched. */}
          <p className="text-destructive text-xs">⛔ {parseFailureMessage(failure)}</p>
          <div className="flex flex-wrap gap-1">
            <FixButton label={PROFILE_IMPORT_COPY.chooseAnother} onClick={onChoose} />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * « Charger le profil geo.admin » (#103) — an explicit action, never a side effect of typing a
 * Position. Every outcome short of a profil is an **ambient** line under the button: the terrain on
 * screen stays as it was, because the profil is a connected extra on top of an app that computes
 * offline.
 */
function GeoadminControls() {
  const { scenario } = useAppState();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { A, B } = scenario.positions;

  async function load(ends: TraceEnds) {
    setLoading(true);
    const outcome = await loadGeoadminProfile(ends, (url) => fetch(url));
    setLoading(false);
    if (!outcome.ok) {
      setNotice(geoadminNotice(outcome.failure));
      return;
    }
    setNotice(null);
    dispatch({ type: "tracé/importé", trace: outcome.trace, tr: encodeP1(outcome.trace) });
  }

  return (
    <div className="flex flex-col gap-1 py-1">
      <div className="flex items-center gap-1">
        <Button
          disabled={A === null || B === null || loading}
          onClick={() => {
            if (A !== null && B !== null) void load({ A, B });
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          Charger le profil geo.admin
        </Button>
        <InfoTip label="Charger le profil geo.admin" text={GEOADMIN_HELP} />
      </div>
      {A === null || B === null ? (
        <AmbientNote text="Les Positions A et B sont nécessaires." />
      ) : (
        <AmbientNote text={loading ? "Chargement du profil geo.admin…" : notice} />
      )}
    </div>
  );
}

/**
 * One termination picker. A prohibition is a disabled option with its reason; an end that arrived
 * anyway — link, Session, class switch — is the Verdict Gate's error, rendered here with its Fix
 * Action.
 */
function TerminationRow({
  end,
  family,
  ropeClass,
  selected,
  onPick,
}: {
  end: "A" | "B";
  family: "steel" | "textile";
  /** `Classe de corde`'s second job: the knot whitelist. `null` on a steel line. */
  ropeClass: TextileSpec["ropeClass"] | null;
  selected: TerminationId;
  onPick: (id: TerminationId) => void;
}) {
  const { breaches, outlined, runFix } = useRailRowContext();
  const id = TERMINATION_FIELD[end];
  const breach = breaches.get(id);
  const { options, reason } = terminationOptions(family, ropeClass, selected);
  return (
    <Row
      control={
        <Picker
          id={`rail-${id}`}
          onChange={(value) => onPick(value)}
          options={options}
          value={selected}
        />
      }
      help={FIELD_HELP[id]}
      htmlFor={`rail-${id}`}
      label={`Terminaison ${end}`}
      message={breach === undefined ? undefined : { text: breach.message, blocking: true }}
      note={
        reason === null && breach === undefined ? null : (
          <>
            {reason !== null && <DisabledReason reason={reason} />}
            {breach !== undefined && <FixButtons breach={breach} onFix={runFix} />}
          </>
        )
      }
      outlined={outlined.has(id)}
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
export function DerivedRow({
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
  /** A preset provenance chip: the sheet's neutral ones, and the preset `k`'s « non confirmé ». */
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
            ⚠ {OVERRIDE_COPY.stale}
            <span className="font-mono">{formatQuantity(quantity, formula, unit)}</span>
          </Badge>
          <FixButton label={OVERRIDE_COPY.recalculate} onClick={onRecalculate} />
        </div>
      )}
    </div>
  );
}

/** A preset's provenance as the chip its row carries; nothing where the row has none. */
export function presetChip(provenance: PresetProvenance | undefined): ReactNode {
  if (provenance === undefined) return undefined;
  return <Chip detail={provenance.detail} label={provenance.label} tone={provenance.tone} />;
}

/**
 * The ladder's **ambient** rung: plain status text beside the value, with **no ⚠**.
 *
 * The tier is defined by a property rather than by taste — it fires *always*, so an alarm would
 * fire always and mean nothing. Textile `k` is its one case: §13.2 publishes the ratio for 10–30 %
 * MBL and a zip line stands at ≈0,6 % and rides at ≈6,3 %, so every rope is out of band.
 */
export function AmbientNote({ text }: { text: string | null }) {
  if (text === null) return null;
  return <p className="text-muted-foreground text-xs">{text}</p>;
}
