import { describe, expect, test } from "vitest";

import { engineTightness } from "./tightness.ts";

describe("engineTightness — « Rapport V » is a parameterisation of the tension mode", () => {
  test("the engine's own modes pass through untouched", () => {
    const sag = { mode: "sag", D_target: 6 } as const;
    expect(engineTightness(sag, 120)).toBe(sag);
  });

  test("`P / H = r` resolves to `H_target = m_p·g / r`", () => {
    // 100 kg at a ratio of 0,8175 is the 1200 N line of the report that asked for this mode.
    expect(engineTightness({ mode: "ratio", ratio: 0.8175 }, 100)).toEqual({
      mode: "tension",
      H_target: (100 * 9.81) / 0.8175,
    });
  });

  test("a higher ratio is a slacker line — less `H` for the same passenger", () => {
    const slack = engineTightness({ mode: "ratio", ratio: 1.5 }, 100);
    const taut = engineTightness({ mode: "ratio", ratio: 0.5 }, 100);
    if (slack.mode !== "tension" || taut.mode !== "tension") throw new Error("expected tension");
    expect(slack.H_target).toBeLessThan(taut.H_target);
  });
});
