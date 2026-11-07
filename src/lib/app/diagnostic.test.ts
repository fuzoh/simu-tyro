import { describe, expect, test } from "vitest";

import type { ScenarioDraft } from "@/lib/scenario/types.ts";

import { deduceValues } from "@/lib/rail/deduced.ts";
import { FIRST_RUN_RETAINED_TEXTILE, firstRunDefaults } from "@/lib/scenario/first-run.ts";

import { buildDiagnostic } from "./diagnostic.ts";

/** `[ Copier le diagnostic ]` exists only where the engine refused, never for a gate's stage. */

function payloadFor(scenario: ScenarioDraft): string | null {
  return buildDiagnostic({
    scenario,
    trace: null,
    deduced: deduceValues(scenario, null),
    at: "2026-11-07T00:00:00.000Z",
    build: "test",
    origin: "https://example.test",
  });
}

describe("what a stopped chain puts on the clipboard", () => {
  test("stage `material` has nothing to copy", () => {
    const blank: ScenarioDraft = {
      ...firstRunDefaults(),
      material: FIRST_RUN_RETAINED_TEXTILE.spec,
    };
    expect(deduceValues(blank, null).failure?.stage).toBe("material");
    expect(payloadFor(blank)).toBeNull();
  });

  test("stage `L0` copies the engine's error", () => {
    const tooShort: ScenarioDraft = {
      ...firstRunDefaults(),
      geometry: { source: "manual", L: 200, h: 0 },
      tightness: { mode: "length", L0: 190 },
    };
    expect(payloadFor(tooShort)).toContain("field       L0");
  });
});
