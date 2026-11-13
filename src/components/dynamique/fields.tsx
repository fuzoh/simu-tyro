/**
 * The Page Dynamique's fields (#92): the passager's mass, and the Vent — its speed, its direction
 * and, where they stand, its profile's two percents (#120). **No second writer**: every row is the
 * Rail's own `NumericRow`, through the same `useFieldRows` context, the same commit and the same
 * five gates as on Avancé and Statique, so a value typed here lands in the Scenario, the address
 * bar and the Session exactly as on those Pages.
 *
 * The ride's constants — `C_dA`, the trolley's friction, `ρ` — are not asked for here: they are
 * Avancé's, and their provenance is one line under the results. One that blocks the rides raises
 * the notice to Avancé, as any value this Page does not show.
 */

import type { RailFormState } from "@/components/app/use-rail-form.ts";
import type { FieldId } from "@/lib/rail/fields.ts";

import { AvanceNotice } from "@/components/app/avance-notice.tsx";
import {
  Group,
  NumericRow,
  RailRow,
  useFieldRows,
  WindProfileRows,
} from "@/components/rail/inputs.tsx";
import { ASSUMED_NOTE, breachedElsewhere } from "@/lib/app/avance-copy.ts";
import { DYNAMIQUE_FIELDS, DYNAMIQUE_GATES, DYNAMIQUE_GROUPS } from "@/lib/dynamique/copy.ts";

const SHOWN: ReadonlySet<FieldId> = new Set(DYNAMIQUE_FIELDS);

/** Does this Page show the field? The notice, the banner's jump and the rows read the one list. */
export function shownOnDynamique(id: FieldId): boolean {
  return SHOWN.has(id);
}

export function DynamiqueFields({ rail }: { rail: RailFormState }) {
  const row = useFieldRows({ rail, register: "terrain" });
  // A value this Page does not show can stop the computation or the rides too — a link, or an edit
  // on Avancé: a ride constant is set there alone. A Verdict or a garde breach removes nothing here.
  const elsewhere = breachedElsewhere(rail.report, DYNAMIQUE_GATES, shownOnDynamique);

  return (
    <RailRow.Provider value={row}>
      <div className="flex flex-col gap-3 px-3 py-3">
        {elsewhere !== null && <AvanceNotice gate={elsewhere} />}

        {/* That the other values are Avancé's is said on the column's first heading (#122). */}
        <Group tip={ASSUMED_NOTE} title={DYNAMIQUE_GROUPS.passenger}>
          <NumericRow hint="kg" id="mp" />
        </Group>

        <Group title={DYNAMIQUE_GROUPS.wind}>
          <NumericRow hint="km/h" id="windSpeed" />
          <NumericRow hint="°" id="windDirection" />
          <WindProfileRows />
        </Group>
      </div>
    </RailRow.Provider>
  );
}
