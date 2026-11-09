import { describe, expect, test } from "vitest";

import { compactRequired } from "@/lib/layout/collapse.ts";

import type { VisualViewportReading } from "./use-viewport.ts";

import { keyboardInsetOf } from "./use-viewport.ts";

/**
 * § 5's keyboard piece 2 — `--kb` = `layoutHeight − visualViewport.height − offsetTop` — and the one
 * gate on it, ticket 28's zoom defect (**decision of 2026-08-14**, voir that ticket's comments).
 *
 * The hook itself is not testable here and must not become so: it reads `window` in render, which is
 * amendment A's whole boundary. What *is* testable is the arithmetic and its gate, which is why they
 * are a pure function over four numbers rather than three property reads inside `measure()`.
 */

/** No keyboard, no pinch — the state every desktop and every honoured meta tag sits in. */
const REST: VisualViewportReading = {
  layoutHeight: 900,
  visualHeight: 900,
  offsetTop: 0,
  scale: 1,
};

describe("§ 5's `--kb`, at scale 1 — the formula, unchanged", () => {
  test.each([
    ["aucun clavier, aucun zoom", REST, 0],
    // § 5's own portrait case: the ~336 px platform-typical keyboard over a 664 px viewport.
    [
      "clavier de 336 px · 390×664",
      { layoutHeight: 664, visualHeight: 328, offsetTop: 0, scale: 1 },
      336,
    ],
    // Older iOS *pans* the visual viewport instead of resizing the layout one, and `offsetTop` is
    // what carries the pan — the term that exists so the inset does not overstate during it.
    [
      "l'ancien Safari qui panoramique · offsetTop porte le décalage",
      { layoutHeight: 664, visualHeight: 328, offsetTop: 100, scale: 1 },
      236,
    ],
    // A visual viewport taller than the layout one is not a negative keyboard.
    [
      "borné à 0 — jamais d'encart négatif",
      { layoutHeight: 664, visualHeight: 700, offsetTop: 0, scale: 1 },
      0,
    ],
    // No threshold: § 5 states the rule without one, and the ~336 px the budgets assume is a
    // platform-typical figure rather than a device measurement.
    [
      "le moindre encart compte",
      { layoutHeight: 2000, visualHeight: 1999, offsetTop: 0, scale: 1 },
      1,
    ],
  ] as const)("%s → %s px", (_name, reading, expected) => {
    expect(keyboardInsetOf(reading)).toBe(expected);
  });

  test("à l'échelle 1 la porte est transparente : la soustraction de § 5, verbatim", () => {
    for (const layoutHeight of [390, 664, 900, 1080]) {
      for (const visualHeight of [150, 328, 664, 900]) {
        for (const offsetTop of [0, 17, 336]) {
          expect(keyboardInsetOf({ layoutHeight, visualHeight, offsetTop, scale: 1 })).toBe(
            Math.max(0, layoutHeight - visualHeight - offsetTop),
          );
        }
      }
    }
  });
});

describe("la porte d'échelle — un pincement n'est pas un clavier", () => {
  /**
   * The two readings measured at 1440 × 900 via CDP `Emulation.setPageScaleFactor`, whose *ungated*
   * formula produced the defect: `--kb` 300 px and 17,6 px, both collapsing the shell to `compact` /
   * `tight` with `#profil` at `display: none`.
   */
  const ZOOMED = {
    "×1,5 — 300 px d'encart fantôme": {
      layoutHeight: 900,
      visualHeight: 600,
      offsetTop: 0,
      scale: 1.5,
      ungated: 300,
    },
    "×1,02 — 17,6 px suffisaient": {
      layoutHeight: 900,
      visualHeight: 882.4,
      offsetTop: 0,
      scale: 1.02,
      ungated: 17.6,
    },
  } as const;

  test.each(Object.entries(ZOOMED))("%s → 0 px", (_name, { ungated, ...reading }) => {
    // The defect is real in these numbers: ungated, § 5's subtraction reports a keyboard.
    expect(reading.layoutHeight - reading.visualHeight - reading.offsetTop).toBeCloseTo(ungated, 6);
    expect(keyboardInsetOf(reading)).toBe(0);
  });

  test("dézoomer non plus : toute échelle autre que 1 rend 0", () => {
    expect(
      keyboardInsetOf({ layoutHeight: 900, visualHeight: 1100, offsetTop: 0, scale: 0.8 }),
    ).toBe(0);
    expect(
      keyboardInsetOf({ layoutHeight: 900, visualHeight: 880, offsetTop: 0, scale: 0.98 }),
    ).toBe(0);
    // The gate is on the scale alone: it never looks at how big the difference is.
    expect(
      keyboardInsetOf({ layoutHeight: 900, visualHeight: 100, offsetTop: 0, scale: 1.5 }),
    ).toBe(0);
  });

  test("le coût accepté, consigné : un vrai clavier ouvert sur une page déjà zoomée lit 0", () => {
    // A 336 px keyboard *and* a ×1,5 pinch. The inset is given up, deliberately: nothing in these
    // four numbers distinguishes this reading from the pinch alone, and the alternative — scale-
    // correcting § 5's formula, or giving `compactRequired` a floor — was rejected on 2026-08-14.
    expect(
      keyboardInsetOf({ layoutHeight: 900, visualHeight: 264, offsetTop: 0, scale: 1.5 }),
    ).toBe(0);
  });
});

describe("ce que la porte change en aval, dans `compactRequired`", () => {
  test("le cas asserté de § 5 tient : encart 1 px à 2000 px de hauteur ⇒ compact", () => {
    const keyboardInset = keyboardInsetOf({
      layoutHeight: 2000,
      visualHeight: 1999,
      offsetTop: 0,
      scale: 1,
    });
    expect(keyboardInset).toBe(1);
    expect(compactRequired({ viewportWidth: 390, viewportHeight: 2000, keyboardInset })).toBe(true);
  });

  test("et le zoom ne l'atteint plus : ×1,5 laisse la rangée compacte au repos", () => {
    // The same 2000 px viewport, pinched rather than typed into. Before the gate this read 500 px of
    // inset and `compactRequired` answered `true` — the chart deleted by a zoom.
    const reading = { layoutHeight: 2000, visualHeight: 1500, offsetTop: 0, scale: 1.5 } as const;
    expect(reading.layoutHeight - reading.visualHeight - reading.offsetTop).toBe(500);
    expect(
      compactRequired({
        viewportWidth: 390,
        viewportHeight: 2000,
        keyboardInset: keyboardInsetOf(reading),
      }),
    ).toBe(false);
  });
});
