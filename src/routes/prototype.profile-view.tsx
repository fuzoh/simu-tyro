/**
 * THROWAWAY ROUTE — /prototype/profile-view?variant=A&scenario=z1
 *
 * Three variants of the zip-line profile view, for wayfinder ticket 07
 * (.scratch/zipline-simulator-v1/issues/07-profile-visualisation-prototype.md).
 * Delete this route and the `-prototype-07/` folder once the ticket is resolved — the
 * v1 implementation is specified elsewhere, this is only here to be reacted to.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { scenarioByKey } from "./-prototype-07/scenarios.ts";
import { PrototypeSwitcher } from "./-prototype-07/switcher.tsx";
import { useModel } from "./-prototype-07/use-model.ts";
import { NAME as NAME_A, VariantA } from "./-prototype-07/variant-a.tsx";
import { NAME as NAME_B, VariantB } from "./-prototype-07/variant-b.tsx";
import { NAME as NAME_C, VariantC } from "./-prototype-07/variant-c.tsx";
import { NAME as NAME_D, VariantD } from "./-prototype-07/variant-d.tsx";

type Search = { variant: string; scenario: string };

export const Route = createFileRoute("/prototype/profile-view")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    variant: (["A", "B", "C", "D"] as string[]).includes(String(search.variant))
      ? String(search.variant)
      : "D",
    scenario: typeof search.scenario === "string" ? search.scenario : "z1",
  }),
  component: PrototypePage,
});

const NAMES: Record<string, string> = { A: NAME_A, B: NAME_B, C: NAME_C, D: NAME_D };

function PrototypePage() {
  const { variant, scenario } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const model = useModel(scenarioByKey(scenario));

  return (
    <>
      {variant === "A" && <VariantA key={`A${scenario}`} model={model} />}
      {variant === "B" && <VariantB key={`B${scenario}`} model={model} />}
      {variant === "C" && <VariantC key={`C${scenario}`} model={model} />}
      {variant === "D" && <VariantD key={`D${scenario}`} model={model} />}
      <PrototypeSwitcher
        variants={["A", "B", "C", "D"]}
        current={variant}
        currentName={NAMES[variant] ?? ""}
        onVariant={(v) => navigate({ search: (p) => ({ ...p, variant: v }), replace: true })}
        scenario={scenario}
        onScenario={(s) => navigate({ search: (p) => ({ ...p, scenario: s }), replace: true })}
      />
    </>
  );
}
