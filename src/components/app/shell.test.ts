/**
 * The layout contract as the shell spells it in CSS: the two `--profile-plot` rules. The expected
 * strings are § 5's aspect rule written out by hand — `0,42 × W_inner`, under amendment F's
 * 473,76 px ceiling (`0,42 × 1128`) on every Page but Avancé, and under Avancé's raised 823,2 px
 * (`0,42 × 1960`, its 1984 px letterboxed block's plot) on Avancé (#110).
 */

import { describe, expect, it } from "vitest";

import { AVANCE_LAYOUT_VARS, LAYOUT_VARS } from "./shell.tsx";

const vars = (style: object) => style as Record<string, string>;

describe("--profile-plot, the band the profile's SVG is drawn into", () => {
  it("the other Pages' band stops at amendment F's 473,76 px", () => {
    expect(vars(LAYOUT_VARS)["--profile-plot"]).toBe("min(calc(0.42 * var(--w-inner)), 473.76px)");
  });

  it("Avancé's band stops at its letterboxed block's plot, 823,2 px (#110)", () => {
    // Printed as a plain 823.2, not the float noise of `0,42 × 1960` (823,1999…).
    expect(vars(AVANCE_LAYOUT_VARS)["--profile-plot"]).toBe(
      "min(calc(0.42 * var(--w-inner)), 823.2px)",
    );
  });

  it("Avancé's vars are the same contract in every other band", () => {
    const { "--profile-plot": avance, ...rest } = vars(AVANCE_LAYOUT_VARS);
    const { "--profile-plot": others, ...shared } = vars(LAYOUT_VARS);
    expect(avance).not.toBe(others);
    expect(rest).toStrictEqual(shared);
    // The profile band is built on `--profile-plot`, so it follows each Page's own rule.
    expect(shared["--profile-band"]).toContain("var(--profile-plot)");
  });
});
