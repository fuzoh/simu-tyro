import { describe, expect, it } from "vitest";

import type { FieldId, GateId } from "@/lib/rail/fields.ts";
import type { BlockingError, GateReport } from "@/lib/rail/gates.ts";

import { passedGates } from "@/lib/rail/gates.ts";

import { AVANCE_NOTICE, avanceNoticeText, breachedElsewhere } from "./avance-copy.ts";

const error = (gate: GateId, field: FieldId): BlockingError => ({
  gate,
  kind: "invalid",
  field,
  alsoOutlined: [],
  message: "peu importe",
  fixes: [],
});

const report = (...errors: BlockingError[]): GateReport => ({
  errors,
  passed: passedGates(errors, false),
  worst: errors[0]?.gate ?? null,
  noRegime: false,
  windNeedsPositions: false,
});

const GATES: readonly GateId[] = ["solve", "clearance", "verdict", "wind", "ride"];

describe("the notice's sentence", () => {
  it("claims the calculation is blocked only for a breach that stops one", () => {
    for (const gate of ["solve", "wind", "ride"] as const) {
      expect(avanceNoticeText(gate)).toBe(AVANCE_NOTICE.text);
    }
    for (const gate of ["clearance", "verdict"] as const) {
      expect(avanceNoticeText(gate)).not.toMatch(/bloque/);
    }
  });

  it("says what a Clearance or Verdict breach removes instead", () => {
    expect(avanceNoticeText("verdict")).toMatch(/aucun verdict/);
    expect(avanceNoticeText("clearance")).toMatch(/garde au sol indisponible/);
  });
});

describe("a breach on a value the Page does not show", () => {
  it("is none while every refused value is shown", () => {
    expect(breachedElsewhere(report(error("solve", "L")), GATES, () => true)).toBeNull();
    expect(breachedElsewhere(report(), GATES, () => false)).toBeNull();
  });

  it("is the worst gate among the hidden ones", () => {
    const refused = report(error("solve", "DAF"), error("verdict", "DAF"));
    expect(breachedElsewhere(refused, GATES, (field) => field !== "DAF")).toBe("solve");
    const verdictOnly = report(error("solve", "L"), error("verdict", "DAF"));
    expect(breachedElsewhere(verdictOnly, GATES, (field) => field !== "DAF")).toBe("verdict");
  });

  it("ignores a gate the Page prints nothing of", () => {
    const ride = report(error("ride", "CdA"));
    expect(
      breachedElsewhere(ride, ["solve", "clearance", "verdict", "wind"], () => false),
    ).toBeNull();
  });
});
