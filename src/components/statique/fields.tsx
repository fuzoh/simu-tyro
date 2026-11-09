/**
 * The Page Statique's fields (#91), in the order a rigger sets them on site — profil, ancrages,
 * ligne, Brins porteurs, Mise en tension and its tension de pose, passager, marge exigée, vent, then
 * the installation and the garde it is judged against.
 *
 * **No second writer.** Every row here is the Rail's own — `NumericRow` and the shared choice rows,
 * the same `useFieldRows` context, the same `commitPageText`, the same three gates and Fix Actions
 * — so a value typed on this Page lands in the Scenario, the address bar and the Session exactly as
 * on Avancé, and is refused with the same message on the field responsible. What changes is the
 * vocabulary (`terrain`) and which fields are shown; the rest of the Scenario stays as the link or
 * Avancé left it.
 *
 * **The tension de pose is the only driver offered.** A line arriving on another one shows its
 * read-out in that field, and the first keystroke takes the line over — `commitPageText` and
 * `idleDriverText` in `@/lib/rail/values.ts` decide how.
 */

import type { RailFormState } from "@/components/app/use-rail-form.ts";
import type { Deduced } from "@/lib/rail/deduced.ts";
import type { FieldId } from "@/lib/rail/fields.ts";

import { AvanceNotice } from "@/components/app/avance-notice.tsx";
import { useAppState } from "@/components/app/store.tsx";
import { ReadOut } from "@/components/rail/controls.tsx";
import {
  AmbientNote,
  CarryingLinesRow,
  DerivedRow,
  FamilyRow,
  Group,
  NumericRow,
  PresetRow,
  presetChip,
  ProfileImport,
  RailRow,
  RegimeRow,
  TensioningDeviceRow,
  TensioningSideRow,
  UsageRow,
  useFieldRows,
  useLastGoodSolve,
} from "@/components/rail/inputs.tsx";
import { TerrainDisclosure } from "@/components/rail/outputs.tsx";
import { ASSUMED_NOTE, breachedElsewhere } from "@/lib/app/avance-copy.ts";
import { formatQuantity } from "@/lib/format/quantity.ts";
import { fieldLabel } from "@/lib/rail/fields.ts";
import { presetProvenance } from "@/lib/rail/presets.ts";
import { warningLadder } from "@/lib/rail/provenance.ts";
import { clearOverride, idleDriverText } from "@/lib/rail/values.ts";
import { DEVICE_LABEL, pretensionWhere, STATIQUE_GROUPS } from "@/lib/statique/copy.ts";
import { shownOnStatique, STATIQUE_GATES } from "@/lib/statique/fields.ts";
import { pretensionField } from "@/lib/statique/outputs.ts";
import { heading } from "@/lib/vocabulary/labels.ts";

export function StatiqueFields({
  cause,
  deduced,
  rail,
}: {
  /** « Aucun résultat — … »: no read-out stands in the tension de pose under it. */
  cause: string | null;
  deduced: Deduced;
  rail: RailFormState;
}) {
  const { scenario, trace } = useAppState();
  const lastGoodSolve = useLastGoodSolve(deduced);

  const row = useFieldRows({
    rail,
    register: "terrain",
    takeOver: { mode: "anchor", deduced, lastGood: lastGoodSolve },
  });

  const { unit, material } = scenario;
  // The preset's chips, as on Avancé: a value the sheet backs says so on every Page that shows it.
  const provenance = material.family === "textile" ? presetProvenance(material) : {};
  const deviceWarning =
    warningLadder(scenario, deduced).find((rung) => rung.row === "tensioningDevice")?.text ?? null;
  const pretension = pretensionField({ scenario, deduced, cause });
  const span = deduced.span;
  // Which alternatives show follows the Scenario; the notice and the banner's jump read the same.
  const shows = (id: FieldId) => shownOnStatique(id, scenario);
  // A value this Page does not show can stop the computation too — a link, or an edit on Avancé. A
  // ride constant stops only a ride, which this Page does not print.
  const elsewhere = breachedElsewhere(rail.report, STATIQUE_GATES, shows);

  return (
    <RailRow.Provider value={row}>
      <div className="flex flex-col gap-3 px-3 py-3">
        {elsewhere !== null && <AvanceNotice gate={elsewhere} />}

        <Group title={STATIQUE_GROUPS.profile}>
          {shows("L") ? (
            <>
              <NumericRow hint="m" id="L" />
              <NumericRow hint="m" id="h" />
            </>
          ) : (
            span !== null && (
              // An imported profil is taken whole: its portée and dénivelé are read off it.
              <>
                <ReadOut label={heading("span", "terrain")} value={formatQuantity("L", span.L)} />
                <ReadOut
                  label={heading("elevationDifference", "terrain")}
                  value={formatQuantity("h", span.h)}
                />
              </>
            )
          )}
          <ProfileImport />
          <TerrainDisclosure scenario={scenario} trace={trace} />
        </Group>

        <Group title={STATIQUE_GROUPS.anchors}>
          <NumericRow hint="m" id="zA" />
          <NumericRow hint="m" id="zB" />
        </Group>

        <Group title={STATIQUE_GROUPS.line}>
          <FamilyRow />
          {shows("d") ? (
            <>
              <NumericRow hint="mm" id="d" />
              <DerivedRow
                formula={deduced.material.formula?.MBF ?? null}
                id="mbfOverride"
                label={fieldLabel("mbfOverride", "terrain")}
                onRecalculate={() => row.patch(clearOverride(scenario, "MBF"))}
                quantity="MBF"
                stale={deduced.material.stale.MBF}
                unit={unit}
              >
                <NumericRow hint={unit} id="mbfOverride" />
              </DerivedRow>
            </>
          ) : (
            <>
              <PresetRow />
              <NumericRow chip={presetChip(provenance.dTextile)} hint="mm" id="dTextile" />
              <NumericRow chip={presetChip(provenance.MBL)} hint={unit} id="MBL" />
            </>
          )}
          <CarryingLinesRow />
        </Group>

        <Group title={STATIQUE_GROUPS.tensioning}>
          <TensioningDeviceRow label={DEVICE_LABEL} warning={deviceWarning} />
          <TensioningSideRow />
          <NumericRow
            hint={unit}
            id="T_target"
            idle={idleDriverText(scenario, "anchor", pretension.readOut)}
            // Where the value is read, on the field it is typed into as on the tile it prints in.
            note={<AmbientNote text={pretensionWhere(scenario.tensioningSide)} />}
            warning={pretension.warning}
          />
        </Group>

        <Group title={STATIQUE_GROUPS.passenger}>
          <NumericRow hint="kg" id="mp" />
        </Group>

        <Group title={STATIQUE_GROUPS.regime}>
          <RegimeRow />
        </Group>

        <Group title={STATIQUE_GROUPS.wind}>
          <NumericRow hint="km/h" id="windSpeed" />
          <NumericRow hint="°" id="windDirection" />
        </Group>

        <Group title={STATIQUE_GROUPS.installation}>
          <UsageRow />
          <NumericRow hint="m" id="hClearMin" />
          <NumericRow hint="m" id="hRider" />
        </Group>

        <p className="text-muted-foreground text-xs">{ASSUMED_NOTE}</p>
      </div>
    </RailRow.Provider>
  );
}
