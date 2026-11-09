/**
 * The Rail's field state, **at the app root** — « v1 build spec » § 7 (*Le bandeau : un occupant,
 * quatre rangs*, *« Saisie en cours »*) under
 * [amendment D](../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md).
 *
 * A9 built the form inside `RailInputs`, which was right while the Rail was its only reader. A11
 * gives it three more: the **banner** ranks tier one above everything else, the **Chart Block**
 * goes inert and freezes under « Saisie en cours », and the **write side** suspends both writes on
 * the same condition. All four have to agree — « the banner slot holds exactly one occupant » is
 * not a property a second copy of the form's issues can have — so the state is lifted here and
 * handed down, exactly as `useScene` and `useDeduced` already are.
 *
 * What is lifted is **only** what more than one consumer reads: the form itself, the text it holds,
 * the focused field and the gate report over both. Every affordance — the rows, the Fix Actions,
 * the file control — stays in `RailInputs`.
 *
 * Two rules that come with it:
 *
 * - **Focus, never `isTouched`.** TanStack Form marks every field touched on submit and this app
 *   has no submit — it is live and continuous — so nothing here may depend on that transition.
 *   « Saisie en cours » is keyed on the caret, which is the property § 7 actually names.
 * - **The synchronisation runs one way — store → form — and skips the field under the caret**, so
 *   nothing rewrites text mid-word and a committed-invalid « −5 » keeps its evidence on screen.
 */

import { useForm, useStore } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Deduced } from "@/lib/rail/deduced.ts";
import type { FieldId, FieldIssue } from "@/lib/rail/fields.ts";
import type { GateReport } from "@/lib/rail/gates.ts";
import type { RailValues } from "@/lib/rail/values.ts";
import type { TraverseScenario } from "@/lib/scenario/traverse.ts";
import type { Register } from "@/lib/vocabulary/labels.ts";

import { checkField } from "@/lib/rail/fields.ts";
import { evaluateGates, isFieldActive } from "@/lib/rail/gates.ts";
import {
  fieldContext,
  GATED_FIELDS,
  isPositionTwin,
  NUMERIC_FIELDS,
  railValues,
  sameGatedText,
} from "@/lib/rail/values.ts";

import { useAppState } from "./store.tsx";

/** The form API `RailInputs` renders its rows against. Its shape is TanStack Form's, not ours. */
export type RailFormApi = ReturnType<typeof useRailFormApi>;

function useRailFormApi(values: RailValues) {
  return useForm({ defaultValues: values });
}

/** What the four consumers share. Everything else about the form stays inside `RailInputs`. */
export type RailFormState = {
  readonly form: RailFormApi;
  /** The text the form currently holds — tier one runs over this, never over the Scenario. */
  readonly text: RailValues;
  /** Which field holds the caret, or `null`. **Focus, never `isTouched`.** */
  readonly focused: FieldId | null;
  readonly setFocused: (id: FieldId | null) => void;
  /** Tier one's standing failures in the gated fields: text a Scenario of numbers cannot hold. */
  readonly issues: readonly FieldIssue[];
  /** The five gates over the Scenario **and** that text — the one report every surface reads. */
  readonly report: GateReport;
};

/**
 * @param traverse `useTraverse`'s Scenario without `x_D`: the gates read nothing else, so a scrub
 *   leaves the report identical.
 * @param register the Page's vocabulary, which names the fields in every message the report holds.
 */
export function useRailForm(
  deduced: Deduced,
  traverse: TraverseScenario,
  register: Register = "exact",
): RailFormState {
  const { scenario } = useAppState();

  const [focused, setFocused] = useState<FieldId | null>(null);
  const values = useMemo(() => railValues(scenario, deduced), [scenario, deduced]);

  const form = useRailFormApi(values);
  const text = useStore(form.store, (store) => store.values);
  // Current in every gated field only: a scrub rewrites `x_D`'s text and must not move tier one.
  const gatedText = useStore(form.store, (store) => store.values, sameGatedText);

  // Store → form, one way, and **only where the store's own value moved**. Comparing against the
  // previous *state* rendering rather than against the field's text is what lets a committed-invalid
  // « −5 » stay on screen with its ⛔: the Scenario cannot hold it, so `values.L` never changes, so
  // nothing here overwrites it. Comparing against the text would erase the evidence on blur, which
  // is the one thing § 7's committed-invalid state may not do. The field under the caret is skipped
  // regardless — a prefill has no business landing mid-word — and so is its Position twin: emptying
  // one coordinate unsets the Position, which reads both as blank, and the other's digits stay.
  const synced = useRef(values);
  useEffect(() => {
    for (const id of NUMERIC_FIELDS) {
      if (values[id] === synced.current[id] || id === focused || isPositionTwin(id, focused))
        continue;
      form.setFieldValue(id, values[id]);
    }
    synced.current = values;
  }, [values, focused, form]);

  // Tier one, over the text the form currently holds. The gates take it beside the Scenario,
  // because an emptied field and « 12,3,4 » are states a Scenario of numbers cannot represent.
  const issues = useMemo(() => {
    const context = fieldContext(traverse, register);
    return GATED_FIELDS.filter((id) => isFieldActive(id, traverse)).flatMap(
      (id) => checkField(id, gatedText[id] ?? "", context) ?? [],
    );
  }, [gatedText, traverse, register]);

  // Memoised because A11 made the report a **memo key**: the results, the scene's suppression and
  // the banner all hang off it, and a fresh object per render would re-run `evaluateVerdict` over
  // 260 steps on every keystroke and every scrub frame — the one measured cost in the app.
  const report = useMemo(
    () => evaluateGates({ scenario: traverse, issues, register }),
    [traverse, issues, register],
  );

  return { form, text, focused, setFocused, issues, report };
}
