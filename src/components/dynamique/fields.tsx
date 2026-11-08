/**
 * The Page Dynamique's fields (#92): the passager's mass, and the Vent — its speed and its
 * direction. **No second writer**: every row is the Rail's own `NumericRow`, through the same
 * `useFieldRows` context, the same commit and the same three gates as on Avancé and Statique, so a
 * value typed here lands in the Scenario, the address bar and the Session exactly as on those Pages.
 *
 * The ride's constants — `C_dA`, the trolley's friction, `ρ` — are not asked for here: they are
 * Avancé's, and their provenance is one line under the results.
 */

import type { RailFormState } from "@/components/app/use-rail-form.ts";
import type { FieldId } from "@/lib/rail/fields.ts";

import { AvanceNotice } from "@/components/app/avance-notice.tsx";
import { Group, NumericRow, RailRow, useFieldRows } from "@/components/rail/inputs.tsx";
import { ASSUMED_NOTE } from "@/lib/app/avance-copy.ts";
import { solveGateReport } from "@/lib/app/banner.ts";
import { DYNAMIQUE_FIELDS, DYNAMIQUE_GROUPS } from "@/lib/dynamique/copy.ts";

const SHOWN: ReadonlySet<FieldId> = new Set(DYNAMIQUE_FIELDS);

/** Does this Page show the field? The notice, the banner's jump and the rows read the one list. */
export function shownOnDynamique(id: FieldId): boolean {
  return SHOWN.has(id);
}

export function DynamiqueFields({ rail }: { rail: RailFormState }) {
  const row = useFieldRows({ rail, register: "terrain" });
  // A value this Page does not show can stop the computation too — a link, or an edit on Avancé.
  // Only the Solve Gate's breaches do: the others remove a Verdict and a garde this Page has none of.
  const elsewhere = solveGateReport(rail.report).errors.some(
    (error) => !shownOnDynamique(error.field),
  );

  return (
    <RailRow.Provider value={row}>
      <div className="flex flex-col gap-3 px-3 py-3">
        {elsewhere && <AvanceNotice />}

        <Group title={DYNAMIQUE_GROUPS.passenger}>
          <NumericRow hint="kg" id="mp" />
        </Group>

        <Group title={DYNAMIQUE_GROUPS.wind}>
          <NumericRow hint="km/h" id="windSpeed" />
          <NumericRow hint="°" id="windDirection" />
        </Group>

        <p className="text-muted-foreground text-xs">{ASSUMED_NOTE}</p>
      </div>
    </RailRow.Provider>
  );
}
