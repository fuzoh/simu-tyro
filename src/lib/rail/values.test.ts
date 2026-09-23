import { describe, expect, test } from "vitest";

import type { ScenarioDraft } from "@/lib/scenario/types.ts";

import { firstRunDefaults } from "@/lib/scenario/first-run.ts";

import { deduceValues } from "./deduced.ts";
import { commitField } from "./fields.ts";
import {
  applyField,
  clearOverride,
  drivingField,
  NUMERIC_FIELDS,
  railValues,
  switchTightness,
  withOverride,
} from "./values.ts";

/**
 * Form text ⇄ canonical state — « v1 build spec » § 3 (*Units, the force selector*, *Tightness
 * Spec*, *Display precision per quantity*).
 *
 * The two invariants this file exists to hold are both stated as identities, because both are
 * violated by the obvious implementation: **a unit switch never writes state**, and **a prefill
 * writes the displayed value into state, never the underlying float**.
 */

function scenario(patch: (draft: ScenarioDraft) => void = () => {}): ScenarioDraft {
  const draft = firstRunDefaults() as ScenarioDraft;
  patch(draft);
  return draft;
}

describe("railValues — the read direction of the force selector", () => {
  test("§ 9's opening screen, field by field", () => {
    const values = railValues(scenario());
    expect(values).toMatchObject({
      L: "150,0",
      h: "-18,0",
      zA: "12,0",
      zB: "12,0",
      D_target: "6,00",
      d: "12,0",
      etaA: "0,90",
      etaB: "0,90",
      mp: "120",
      hRider: "2,1",
      DAF: "1,2",
      xD: "75,0",
    });
  });

  test("a field the current mode, family or driver does not render is blank", () => {
    const values = railValues(scenario());
    // Manual geometry has no stations; steel has no rope class; `Flèche` is the driver.
    expect(values.sa).toBe("");
    expect(values.MBL).toBe("");
    expect(values.L0).toBe("");
    expect(values.H_target).toBe("");
  });

  test("the three steel derived rows are editable fields showing the formula value", () => {
    // No override ships on first run — absence **is** « non surchargée » — but the row is still an
    // input, because typing into it is what creates the override.
    const first = scenario();
    expect(first.material).not.toHaveProperty("overrides");
    const values = railValues(first, deduceValues(first, null));
    expect(values.mbfOverride).toBe("9074");
    expect(values.eaOverride).toBe("6,90");
    expect(values.muOverride).toBe("0,5465");
  });

  test("« blank and required » is a blank field, never a zero", () => {
    const rope = scenario((draft) => {
      draft.usage = "TEMPORAIRE";
      draft.material = { family: "textile", ropeClass: "hmpe", MBL: null, mu: null, k: 22 };
    });
    const values = railValues(rope);
    expect(values.MBL).toBe("");
    expect(values.muTextile).toBe("");
    expect(values.k).toBe("22,0");
  });

  test("imported mode shows `L` and `h` as read-outs of the derived span", () => {
    const imported = scenario((draft) => {
      draft.geometry = { source: "trace", trace: "p1.x", sa: 0, sb: 200 };
    });
    const trace = {
      d: Float64Array.from([0, 200]),
      z: Float64Array.from([100, 80]),
      dev: null,
      fileName: "t.csv",
    };
    const values = railValues(imported, deduceValues(imported, trace));
    expect(values.sa).toBe("0,0");
    expect(values.sb).toBe("200,0");
    expect(values.L).toBe("");
    expect(values.h).toBe("");
  });
});

describe("the unit invariant — daN → X → daN is the identity", () => {
  test("a selector change writes nothing into state", () => {
    const daN = scenario((draft) => {
      draft.tightness = { mode: "tension", H_target: 2535 };
    });
    const kN: ScenarioDraft = { ...daN, unit: "kN" };
    const back: ScenarioDraft = { ...kN, unit: "daN" };
    // Only the *rendering* moved. State stayed canonical newtons throughout, which is what makes
    // the claim that a display control is provably physics-neutral hold.
    expect(railValues(daN).H_target).toBe("253,5");
    expect(railValues(kN).H_target).toBe("2,535");
    expect(railValues(back).H_target).toBe("253,5");
    expect(back.tightness).toEqual(daN.tightness);
  });

  test("re-typing the shown value under daN or kN lands on the same newtons", () => {
    // The *typed* path, which is the one path that does write. `kN` = daN decimals + 2, so the
    // resolution never coarsens on a switch and the round trip is exact.
    for (const unit of ["daN", "kN"] as const) {
      const draft: ScenarioDraft = {
        ...scenario(),
        unit,
        tightness: { mode: "tension", H_target: 2535 },
      };
      expect(commitField("H_target", railValues(draft).H_target, { unit })).toBe(2535);
    }
  });

  test("`kgf` re-types at its own grain, and the 0,03 % is disclosed rather than papered over", () => {
    // `KGF = 9,80665` against `G = 9,81`: two constants, each correct in its role. 253,5 daN reads
    // 258,5 kgf, and **re-typing** that lands on 2535,02 N — which is what the kgf note says.
    const draft: ScenarioDraft = {
      ...scenario(),
      unit: "kgf",
      tightness: { mode: "tension", H_target: 2535 },
    };
    expect(railValues(draft).H_target).toBe("258,5");
    expect(commitField("H_target", "258,5", { unit: "kgf" })).toBeCloseTo(2535, 1);
  });
});

describe("applyField — one committed field, written back", () => {
  test("it never mutates the draft it was handed", () => {
    const before = scenario();
    const after = applyField(before, "mp", 100);
    expect(before.rider.mp).toBe(120);
    expect(after.rider.mp).toBe(100);
    expect(after).not.toBe(before);
  });

  test("shortening the span moves the viewpoint rather than refusing the span", () => {
    // `x_D` clamps on **every** path, this one included: a geometry change under a stale viewpoint.
    const short = applyField(scenario(), "L", 50);
    expect(short.rider.xD).toBe(50);
    if (short.geometry.source !== "manual") throw new Error("expected manual geometry");
    expect(short.geometry.L).toBe(50);
  });

  test("a typed `x_D` outside the span clamps too, and blocks nothing", () => {
    expect(applyField(scenario(), "xD", 400).rider.xD).toBe(150);
    expect(applyField(scenario(), "xD", -20).rider.xD).toBe(0);
  });

  test("the clamp runs in imported mode as well, against `s_B − s_A`", () => {
    // The span is the stations there, so a viewpoint past station B is exactly as stale as one
    // past `Portée` in manual mode. Left unclamped, state publishes an `x_D` the span does not
    // contain while the scene silently draws the rider somewhere else.
    const imported = scenario((draft) => {
      draft.geometry = { source: "trace", trace: "p1.x", sa: 20, sb: 120 };
    });
    expect(applyField(imported, "xD", 500).rider.xD).toBe(100);
    expect(applyField(imported, "xD", -3).rider.xD).toBe(0);
  });

  test("moving a station moves the viewpoint with it", () => {
    const imported = scenario((draft) => {
      draft.geometry = { source: "trace", trace: "p1.x", sa: 0, sb: 200 };
      draft.rider.xD = 180;
    });
    expect(applyField(imported, "sb", 100).rider.xD).toBe(100);
    // `s_A` shortens the span from the other end, and it is the same span.
    expect(applyField(imported, "sa", 120).rider.xD).toBe(80);
  });

  test("a placement that is no span at all clamps against nothing", () => {
    // `station B ≤ station A` is a blocking error, not a licence to move the viewpoint to a
    // negative span — and a negative `L` never reaches `applyField`, because tier one refuses it.
    const inverted = scenario((draft) => {
      draft.geometry = { source: "trace", trace: "p1.x", sa: 100, sb: 100 };
      draft.rider.xD = 75;
    });
    expect(applyField(inverted, "xD", 400).rider.xD).toBe(400);
    expect(applyField(inverted, "sb", 100).rider.xD).toBe(75);
  });

  test("writing the driving tightness field keeps the driver it belongs to", () => {
    const tighter = applyField(scenario(), "D_target", 4);
    expect(tighter.tightness).toEqual({ mode: "sag", D_target: 4 });
  });

  test("every numeric field has a write path", () => {
    // A field the form renders and `applyField` silently drops would be a control that does
    // nothing — the failure mode a `default:` branch hides.
    const complete = scenario((draft) => {
      draft.usage = "TEMPORAIRE";
      draft.geometry = { source: "trace", trace: "p1.x", sa: 0, sb: 200 };
      draft.material = { family: "textile", ropeClass: "hmpe", MBL: 1e5, mu: 0.1, k: 22 };
    });
    const steel = scenario((draft) => {
      draft.material = {
        family: "steel",
        d: 12,
        R0: 1770,
        construction: "iwrc",
        overrides: { MBF: 90740, EA: 6.9e6, mu: 0.5465 },
      };
    });
    for (const id of NUMERIC_FIELDS) {
      const base = id === "L" || id === "h" ? steel : complete;
      const host = id.endsWith("Override") || id === "d" ? steel : base;
      const after = applyField(host, id, 7);
      const before = railValues(host, deduceValues(host, null))[id];
      expect(railValues(after, deduceValues(after, null))[id]).not.toBe(before);
    }
  });
});

describe("Override — steel only, per value, and « Recalculer » drops the key", () => {
  test("typing into a derived field flips it to « valeur saisie »", () => {
    const overridden = withOverride(scenario(), "MBF", 80000);
    if (overridden.material.family !== "steel") throw new Error("expected steel");
    expect(overridden.material.overrides).toEqual({ MBF: 80000 });
    expect(deduceValues(overridden, null).material.overridden.MBF).toBe(true);
  });

  test("overrides are independent: setting `EA` leaves `MBF` on the formula", () => {
    const both = withOverride(withOverride(scenario(), "MBF", 80000), "EA", 5e6);
    if (both.material.family !== "steel") throw new Error("expected steel");
    expect(both.material.overrides).toEqual({ MBF: 80000, EA: 5e6 });
  });

  test("« Recalculer » restores « non surchargée », not « equal to the formula value »", () => {
    // The two states differ: the first tracks `d` from here on, the second is an override that
    // happens to agree today — and would carry the pastille and the aggregate entry with it.
    const cleared = clearOverride(withOverride(scenario(), "MBF", 80000), "MBF");
    if (cleared.material.family !== "steel") throw new Error("expected steel");
    expect(cleared.material.overrides).toBeUndefined();
    expect(deduceValues(cleared, null).material.overridden.MBF).toBe(false);
  });

  test("textile has no override affordance at all", () => {
    const rope = scenario((draft) => {
      draft.usage = "TEMPORAIRE";
      draft.material = { family: "textile", ropeClass: "hmpe", MBL: 1e5, mu: 0.1, k: 22 };
    });
    expect(withOverride(rope, "MBF", 1)).toBe(rope);
    expect(clearOverride(rope, "MBF")).toBe(rope);
  });
});

describe("the Tightness Spec — one editable field, prefilled from its own read-out", () => {
  const first = scenario();
  const deduced = deduceValues(first, null);

  test("« Flèche » → « Longueur » lands on the length just achieved, at 2 decimals", () => {
    const length = switchTightness(first, "length", deduced);
    expect(length.tightness).toEqual({ mode: "length", L0: 151.64 });
    expect(drivingField(length)).toBe("L0");
  });

  test("« Flèche » → « Tension » lands on the prétension just achieved", () => {
    const tension = switchTightness(first, "tension", deduced);
    expect(tension.tightness).toEqual({ mode: "tension", H_target: 2535 });
    expect(railValues(tension).H_target).toBe("253,5");
  });

  test("« Flèche » → « Rapport V » lands on `m_p·g / H` at 2 decimals, and solves to the same line", () => {
    // 120 kg × 9,81 / 2535 N = 0,4644 → 0,46. The ratio is the app's; the engine only ever sees
    // the `H_target` it resolves to, so the deduced `L₀` must land within the field's own grain.
    const ratio = switchTightness(first, "ratio", deduced);
    expect(ratio.tightness).toEqual({ mode: "ratio", ratio: 0.46 });
    expect(drivingField(ratio)).toBe("vRatio");
    expect(railValues(ratio).vRatio).toBe("0,46");
    const solve = deduceValues(ratio, null).solve;
    if (solve === null) throw new Error("expected a solve");
    expect(solve.H).toBeCloseTo((120 * 9.81) / 0.46, 0);
    expect(Math.abs(solve.L0 - 151.64)).toBeLessThan(0.05);
  });

  test("the prefill writes the **displayed** value, never the float behind it", () => {
    // 151,64 enters state; 151,6440231 never does. That is what makes the URL exact and short by
    // construction — and it is 8 % of the shipped clearance margin if the row were 1 decimal.
    const length = switchTightness(first, "length", deduced);
    if (length.tightness.mode !== "length") throw new Error("expected the length driver");
    expect(length.tightness.L0).toBe(151.64);
    expect(deduced.solve?.L0).not.toBe(151.64);
  });

  test("a round trip through a mode costs at most the new field's own grain", () => {
    const there = switchTightness(first, "length", deduced);
    const back = switchTightness(there, "sag", deduceValues(there, null));
    if (back.tightness.mode !== "sag") throw new Error("expected the sag driver");
    // 151,64 m of `L₀` is 5,99 m of flèche, not 6,00 — the 2-decimal row keeps that under 1 cm,
    // where a 1-decimal `L₀` would cost 0,21 m.
    expect(Math.abs(back.tightness.D_target - 6)).toBeLessThan(0.02);
  });

  test("under « Tension impossible » the switch still switches, from the last good read-out", () => {
    // The state a user most needs another driver in: a flèche the cable cannot reach is fixed by
    // typing a tension, so the selector must not go dead there.
    const impossible = scenario((draft) => {
      draft.tightness = { mode: "sag", D_target: 0.01 };
    });
    const refused = deduceValues(impossible, null);
    expect(refused.solve).toBeNull();
    const tension = switchTightness(impossible, "tension", refused, deduced.solve);
    expect(tension.tightness).toEqual({ mode: "tension", H_target: 2535 });
  });

  test("with no read-out ever seen, the prefill is the first-run line's", () => {
    const blank = scenario((draft) => {
      draft.usage = "TEMPORAIRE";
      draft.material = { family: "textile", ropeClass: "hmpe", MBL: null, mu: null, k: 22 };
    });
    const length = switchTightness(blank, "length", deduceValues(blank, null));
    expect(length.tightness).toEqual({ mode: "length", L0: 151.64 });
  });

  test("switching to the mode already active is a no-op", () => {
    expect(switchTightness(first, "sag", deduced)).toBe(first);
  });
});
