import { describe, expect, test } from "vitest";

import type { FieldId } from "@/lib/rail/fields.ts";

import { FIRST_RUN_SCENARIO } from "@/lib/scenario/first-run.ts";
import { DEFAULT_LAYERS, SESSION_KEY, writeSession } from "@/lib/session/session.ts";
import { CANONICAL_KEYS, scenarioToSearch } from "@/lib/url/schema.ts";

import type { CollapseFocus, CollapseInputs, CollapseState, ViewportFit } from "./collapse.ts";

import {
  availableHeight,
  CENTRE_IN_RAIL,
  centresOnFocus,
  collapseState,
  compactRequired,
  fitsWholeBlock,
  heightConstrained,
  pinnedHeaderHeight,
  PROFILE_BAND_ID,
  railFocus,
  revealGrantable,
  RIDER_POSITION_ID,
  revealSurvives,
  revealSurvivesScroll,
} from "./collapse.ts";
import {
  BANNER,
  chartBlockHeight,
  COMPACT_HEIGHT_PX,
  MIN_RAIL,
  PINNED_CELL,
  RAIL_REFLOW_PX,
  VIEW_STRIP,
} from "./contract.ts";

/**
 * The Chart Block's collapse policy — « v1 build spec » § 5 (*The Chart Block collapses to a Pinned
 * Safety Header*), ticket 27.
 *
 * What is asserted here is the **whole** of what a `node` suite can see of A12.1: which state the
 * three inputs produce, what the reveal latch survives, and the two heights of § 5's own state
 * table. **What the states look like is not here** — every band that appears or disappears is a
 * layout fact, and [amendment A](../../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md) sends
 * those to `agent-browser` (tickets 29, 31, 33 and 35).
 */

/** § 5's default posture: the Rail at top, nothing focused, the block fits, nothing revealed. */
const RESTING: CollapseInputs = {
  railAtTop: true,
  focus: "none",
  revealed: false,
  fits: true,
  compact: false,
};

describe("collapseState — § 5's three triggers", () => {
  /**
   * The policy, as a table. Each row names the trigger it exercises, because a bare tuple of four
   * booleans is unreadable the moment one of them moves.
   */
  const CASES: readonly {
    readonly name: string;
    readonly inputs: Partial<CollapseInputs>;
    readonly expected: CollapseState;
  }[] = [
    { name: "au repos : rail en haut, aucun focus", inputs: {}, expected: "whole" },
    {
      name: "(a) le rail défile",
      inputs: { railAtTop: false },
      expected: "pinned",
    },
    {
      name: "(b) un champ du rail prend le focus",
      inputs: { focus: "rail-field" },
      expected: "pinned",
    },
    {
      // The one that keeps the View Strip: the position field may not collapse away the strip it
      // lives in, and the user types a position while watching « Garde min » move.
      name: "(b) le champ position du rail garde la View Strip",
      inputs: { focus: "rail-rider-position" },
      expected: "pinned-x",
    },
    {
      name: "(a) + (b) le rail défile et le champ position a le focus",
      inputs: { railAtTop: false, focus: "rail-rider-position" },
      expected: "pinned-x",
    },
    {
      // The View Strip's own `x` is **not** a Rail field, so focusing it collapses nothing.
      name: "le champ x de la View Strip ne déclenche aucun repli",
      inputs: { focus: "view-strip-position" },
      expected: "whole",
    },
    {
      // …and it does not let the strip vanish from under the caret either, which is the whole
      // reason `pinned + x` exists: focus moving from the Rail's position field to the strip's own
      // must not drop the strip back to `pinned`.
      name: "le champ x de la View Strip garde la View Strip pendant un repli",
      inputs: { railAtTop: false, focus: "view-strip-position" },
      expected: "pinned-x",
    },
    {
      name: "« Afficher le profil » l'emporte sur (a)",
      inputs: { railAtTop: false, revealed: true },
      expected: "whole",
    },
    {
      name: "« Afficher le profil » l'emporte sur (b)",
      inputs: { focus: "rail-field", revealed: true },
      expected: "whole",
    },
    {
      // (c) is ticket 28's to *measure*; the policy already answers it, which is what « restores the
      // whole block **when constraints allow** » means.
      name: "(c) le bloc ne tient pas",
      inputs: { fits: false },
      expected: "pinned",
    },
    {
      // Ticket 28's row: the keyboard is up, so the block is one 44 px line even with the Rail at
      // top and nothing focused — the caret may be in the View Strip's field, which is not a trigger.
      name: "le clavier logiciel réduit le bloc à la rangée compacte",
      inputs: { compact: true },
      expected: "compact",
    },
    {
      name: "la rangée compacte survit à un rail défilé et à un champ focalisé",
      inputs: { compact: true, fits: false, railAtTop: false, focus: "rail-field" },
      expected: "compact",
    },
    {
      name: "« Afficher le profil » ne l'emporte jamais sur la rangée compacte",
      inputs: { compact: true, revealed: true },
      expected: "compact",
    },
    {
      // The row that would eat the field being typed into. § 5 argues `pinned + x` *from* the
      // keyboard being open — « the user types a position and watches « Garde min » move » — so the
      // single row yields to it, and only to it.
      name: "clavier ouvert sur le champ position : la View Strip reste, la rangée compacte cède",
      inputs: { compact: true, fits: false, focus: "rail-rider-position" },
      expected: "pinned-x",
    },
    {
      name: "clavier ouvert sur le champ x de la View Strip : idem",
      inputs: { compact: true, fits: false, focus: "view-strip-position" },
      expected: "pinned-x",
    },
    {
      name: "« Afficher le profil » ne l'emporte jamais sur (c)",
      inputs: { fits: false, revealed: true },
      expected: "pinned",
    },
    {
      name: "(c) garde la View Strip tant que le champ x a le focus",
      inputs: { fits: false, revealed: true, focus: "view-strip-position" },
      expected: "pinned-x",
    },
  ];

  test.each(CASES)("$name → $expected", ({ inputs, expected }) => {
    expect(collapseState({ ...RESTING, ...inputs })).toBe(expected);
  });

  test("le repli ne dépend que du défilement, du focus et des deux contraintes de hauteur", () => {
    // Five inputs and nothing else: no width, no orientation, no stored preference. Both height
    // constraints arrive **already decided**, as booleans. The rest of the guard is the persistence
    // test at the bottom of this file.
    expect(Object.keys(RESTING).sort()).toStrictEqual([
      "compact",
      "fits",
      "focus",
      "railAtTop",
      "revealed",
    ]);
  });

  test("les deux contraintes de hauteur sont les seules à forcer le repli", () => {
    // What `data-fit` publishes, and therefore what makes the collapse cost something **above** B2
    // — the landscape case, which gets no rule of its own.
    expect(heightConstrained({ fits: true, compact: false })).toBe(false);
    expect(heightConstrained({ fits: false, compact: false })).toBe(true);
    expect(heightConstrained({ fits: true, compact: true })).toBe(true);
    expect(heightConstrained({ fits: false, compact: true })).toBe(true);
    // A constrained block is never whole, whatever the caret and the scroller are doing: that is
    // what makes `data-fit` enough on its own to gate the bands above B2.
    for (const focus of [
      "none",
      "rail-field",
      "rail-rider-position",
      "view-strip-position",
    ] as const) {
      expect(
        collapseState({ railAtTop: true, focus, revealed: true, fits: false, compact: false }),
      ).not.toBe("whole");
    }
  });

  test("la révélation n'est accordable que hors contrainte de hauteur, et le chevron le publie", () => {
    // What the chevron renders as `aria-disabled`. It is the negation of `heightConstrained` and it
    // is asserted **against `collapseState`** rather than against that negation, because what it
    // promises is a property of the policy: where it says `false`, no reveal can produce `whole`.
    for (const fits of [true, false]) {
      for (const compact of [true, false]) {
        const grantable = revealGrantable({ fits, compact });
        expect(grantable).toBe(!heightConstrained({ fits, compact }));
        expect(
          collapseState({
            railAtTop: false,
            focus: "none",
            revealed: true,
            fits,
            compact,
          }) === "whole",
        ).toBe(grantable);
      }
    }
  });
});

describe("railFocus — what the caret is sitting in", () => {
  /** `[tagName, id]` of the focused element, as the Rail's own `focusin` reports it. */
  const CASES: readonly [{ tagName: string; id: string } | null, CollapseFocus][] = [
    [null, "none"],
    [{ tagName: "INPUT", id: RIDER_POSITION_ID }, "rail-rider-position"],
    [{ tagName: "INPUT", id: `rail-${"L" satisfies FieldId}` }, "rail-field"],
    // The pickers and the radios are Rail fields too — every one is a jump target of § 7's culprit
    // table — and they are exactly what `useRailForm`'s numeric-only `focused` cannot see.
    [{ tagName: "SELECT", id: `rail-${"regime" satisfies FieldId}` }, "rail-field"],
    [{ tagName: "INPUT", id: "" }, "rail-field"],
    // A button is an action, not a field: « Copier le lien » and the Fix Actions collapse nothing.
    [{ tagName: "BUTTON", id: "" }, "none"],
    [{ tagName: "SUMMARY", id: "" }, "none"],
  ];

  test.each(CASES)("%o → %s", (target, expected) => {
    expect(railFocus(target)).toBe(expected);
  });
});

describe("le verrou d'« Afficher le profil »", () => {
  // A reveal is a request about the picture. Going back to editing revokes it — otherwise the next
  // field focus would leave the profile standing over a Rail that has nowhere to go.
  test.each([
    ["none", true],
    ["view-strip-position", true],
    ["rail-field", false],
    ["rail-rider-position", false],
  ] as const)("revealSurvives(%s) === %s", (focus, expected) => {
    expect(revealSurvives(focus)).toBe(expected);
  });

  // At the top of the Rail the block is whole anyway, so the latch is moot there — and clearing it
  // is what makes the **next** scroll away pin again rather than stay open forever.
  test.each([
    [true, false],
    [false, true],
  ])("revealSurvivesScroll(atTop=%s) === %s", (atTop, expected) => {
    expect(revealSurvivesScroll(atTop)).toBe(expected);
  });
});

/**
 * The chevron only exists *inside* the pinned header, so granting its request removes the element
 * the caret stands on — measured in the browser: `document.activeElement` fell to `<body>` and the
 * next `Tab` restarted at the top of the document. `RevealProfile` hands focus to
 * {@link PROFILE_BAND_ID} instead.
 *
 * **Where the caret lands is a layout fact** and belongs to `agent-browser` (amendment B); what is
 * pure here is the one thing that would make the handoff eat its own reveal — a landing place that
 * is itself a collapse trigger.
 */
describe("le point d'atterrissage d'« Afficher le profil »", () => {
  test("la bande n'est pas dans l'espace de noms du Rail", () => {
    // § 7's `scroll-margin-top` rule is `[id^="rail-"]`, and `rail-<champ>` is how every Rail field
    // is addressed — including by the jump primitive. The landing place is neither.
    expect(PROFILE_BAND_ID.startsWith("rail-")).toBe(false);
    expect(PROFILE_BAND_ID).not.toBe(RIDER_POSITION_ID);
  });

  test("y poser le curseur ne redéclenche pas le repli qu'on vient de lever", () => {
    const band = { tagName: "DIV", id: PROFILE_BAND_ID };
    expect(railFocus(band)).toBe("none");
    // The Rail is still scrolled away — trigger (a) is still true — and the reveal is what holds
    // the block open. Focusing the band must not be trigger (b) as well, or the handoff would pin
    // the block again in the same frame and take the profile back.
    expect(
      collapseState({
        railAtTop: false,
        focus: railFocus(band),
        revealed: true,
        fits: true,
        compact: false,
      }),
    ).toBe("whole");
  });
});

describe("pinnedHeaderHeight — § 5's state table", () => {
  // 76 + 44 = 120 and 120 + 44 = 164, at the 390 px banner the table is written for.
  test("pinned = bandeau trois lignes + cellule vive = 120 px", () => {
    expect(pinnedHeaderHeight("pinned")).toBe(120);
  });

  test("pinned + x = 120 + la View Strip = 164 px", () => {
    expect(pinnedHeaderHeight("pinned-x")).toBe(164);
  });

  test("whole ne réserve rien : il n'y a pas d'en-tête épinglé", () => {
    expect(pinnedHeaderHeight("whole")).toBe(0);
  });

  test("un bandeau d'une ligne rétrécit l'en-tête d'autant", () => {
    expect(pinnedHeaderHeight("pinned", BANNER.oneLine)).toBe(BANNER.oneLine + PINNED_CELL);
    expect(pinnedHeaderHeight("pinned-x", BANNER.oneLine)).toBe(
      BANNER.oneLine + PINNED_CELL + VIEW_STRIP,
    );
  });

  test("compact = une seule rangée de 44 px, bandeau compris", () => {
    // § 5's fourth row. The banner is **in** the row rather than above it, so the header is one
    // touch height whatever the occupant's line count — 44 px, not 44 + a banner.
    expect(pinnedHeaderHeight("compact")).toBe(PINNED_CELL);
    expect(pinnedHeaderHeight("compact", BANNER.oneLine)).toBe(PINNED_CELL);
    expect(pinnedHeaderHeight("compact")).toBeLessThan(
      pinnedHeaderHeight("pinned", BANNER.oneLine),
    );
  });

  test("le créneau bandeau est dans les deux états épinglés — c'est ce qui rend un blocage lisible", () => {
    // § 7's second narrow-screen rule: the pinned header **carries the banner slot** under the
    // four-rank precedence, so a blocking summary and its jump link survive the collapse.
    for (const state of ["pinned", "pinned-x"] as const) {
      expect(pinnedHeaderHeight(state) - pinnedHeaderHeight(state, 0)).toBe(BANNER.threeLines);
      expect(pinnedHeaderHeight(state, 0)).toBeGreaterThanOrEqual(PINNED_CELL);
    }
  });
});

/**
 * Ticket 28's half of § 5: the two height constraints, as arithmetic. **What a viewport looks like
 * is not here** — these are the numbers § 5's own budget table states, and whether a real browser
 * reproduces them belongs to `agent-browser` (tickets 29 and 35).
 */
describe("(c) — le bloc tient-il avec un rail utilisable ?", () => {
  /**
   * § 5's own postures. `column` is the chart column's inline size, which below B2 **is** the
   * viewport and above it is `viewport − 288`.
   */
  const CASES: readonly {
    readonly name: string;
    readonly fit: ViewportFit;
    readonly fits: boolean;
  }[] = [
    {
      // Budget A: the block was 540 and the rail's 124 px cleared `MIN_RAIL` by 4 px. Seven read-out
      // cells wrap to three lines at 390 px (2026-09-23), the block is 592 and the rail 72: (c)
      // pins it at rest, and 390 × 844 below is the phone that still opens whole.
      name: "A · 390×664 au repos",
      fit: { viewportWidth: 390, viewportHeight: 664, keyboardInset: 0, columnWidth: 390 },
      fits: false,
    },
    {
      name: "390×844 — un téléphone courant, le bloc entier",
      fit: { viewportWidth: 390, viewportHeight: 844, keyboardInset: 0, columnWidth: 390 },
      fits: true,
    },
    {
      // 664 − 336 = 328 of viewport, 208 once the rail's floor is paid: « a 540 px block cannot
      // coexist with a focused field », which is the arithmetic that forces triggers (a) and (b).
      name: "390×664, clavier logiciel de 336 px",
      fit: { viewportWidth: 390, viewportHeight: 664, keyboardInset: 336, columnWidth: 390 },
      fits: false,
    },
    {
      // § 5's landscape measurement, and the reason the app needs no rotate prompt: the fit rule
      // fires on its own, above B2, with no orientation anywhere in it.
      name: "paysage · 844×390",
      fit: { viewportWidth: 844, viewportHeight: 390, keyboardInset: 0, columnWidth: 844 - 288 },
      fits: false,
    },
    {
      name: "B · 768×1024",
      fit: { viewportWidth: 768, viewportHeight: 1024, keyboardInset: 0, columnWidth: 480 },
      fits: true,
    },
    {
      // Budget C sums to the viewport with 43 px of letterbox at the one-line banner; the rule
      // reserves the three-line one and still fits.
      name: "C · 1440×900",
      fit: { viewportWidth: 1440, viewportHeight: 900, keyboardInset: 0, columnWidth: 1152 },
      fits: true,
    },
    {
      // Above B2 the Rail is a column beside the block and owes it no height — but a short desktop
      // window is the same failure as landscape, and (c) catches it through the same rule.
      name: "une fenêtre de bureau écrasée · 1440×500",
      fit: { viewportWidth: 1440, viewportHeight: 500, keyboardInset: 0, columnWidth: 1152 },
      fits: false,
    },
    {
      name: "rien de mesuré encore — le Skeleton s'ouvre entier",
      fit: { viewportWidth: 390, viewportHeight: 664, keyboardInset: 0, columnWidth: null },
      fits: true,
    },
    // ─── Amendment F, the wide arm ────────────────────────────────────────────────────────────────
    // The six desktops ticket 28 measured with **no chart at all**, re-asked of the capped rule. The
    // block heights are `./contract.test.ts`'s (« amendment F »); what is asserted here is the
    // *state* each one now opens in.
    {
      // Block 763,52 at a 992 px column, **unchanged by the cap** — the plot is 396,48 there, well
      // under the 463,68 ceiling. 720 px of height is 43,52 px short, and no cap can close that: a
      // ceiling low enough to reach a 944 px inner width also lowers budget C's 1104.
      name: "1280×720 — toujours épinglé, et aucun plafond ne peut le sauver",
      fit: { viewportWidth: 1280, viewportHeight: 720, keyboardInset: 0, columnWidth: 1280 - 288 },
      fits: false,
    },
    {
      name: "1280×800 — déjà entier avant l'amendement, inchangé",
      fit: { viewportWidth: 1280, viewportHeight: 800, keyboardInset: 0, columnWidth: 1280 - 288 },
      fits: true,
    },
    {
      // Same shape: block 813,40 at a 1078 px column, 45,40 px over its own viewport.
      name: "1366×768 — toujours épinglé, sous la colonne de référence",
      fit: { viewportWidth: 1366, viewportHeight: 768, keyboardInset: 0, columnWidth: 1366 - 288 },
      fits: false,
    },
    {
      // The cap *does* bite here — 898,08 → 867,84 — and it is still 17,84 px too tall, because
      // 850 px of viewport is 6,32 px shorter than **budget C's own block**. Preserving budget C is
      // exactly what forbids reaching this row.
      name: "1512×850 — le plafond mord, et manque encore : le viewport est plus court que le budget C",
      fit: { viewportWidth: 1512, viewportHeight: 850, keyboardInset: 0, columnWidth: 1512 - 288 },
      fits: false,
    },
    {
      // 946,88 → 879,68. **The cap's own row**: a chart where there was none.
      name: "1600×900 — entier grâce au plafond",
      fit: { viewportWidth: 1600, viewportHeight: 900, keyboardInset: 0, columnWidth: 1600 - 288 },
      fits: true,
    },
    {
      // 1081,28 → 879,68: the 1,3 px miss § 5 never wrote down, on the most ordinary desktop there is.
      name: "1920×1080 — entier grâce au plafond, après un manque de 1,3 px",
      fit: { viewportWidth: 1920, viewportHeight: 1080, keyboardInset: 0, columnWidth: 1920 - 288 },
      fits: true,
    },
    {
      // Already whole before the amendment (1350,08 ≤ 1440); now with 560 px of letterbox instead of 90.
      name: "2560×1440 — entier avant comme après",
      fit: { viewportWidth: 2560, viewportHeight: 1440, keyboardInset: 0, columnWidth: 2560 - 288 },
      fits: true,
    },
    {
      // The ultrawide the unbounded rule lost outright (1719,68 against 1440), and the row a « keep
      // the aspect inside the band » ceiling would still have lost: 0,35 × 3104 + 416 = 1502,4.
      name: "3440×1440 ultra-large — entier grâce au plafond",
      fit: { viewportWidth: 3440, viewportHeight: 1440, keyboardInset: 0, columnWidth: 3440 - 288 },
      fits: true,
    },
  ];

  test.each(CASES)("$name → fits=$fits", ({ fit, fits }) => {
    expect(fitsWholeBlock(fit)).toBe(fits);
  });

  test("le rail sous le bloc coûte MIN_RAIL, le rail à côté ne coûte rien", () => {
    // The same column, the same height, on either side of B2 — the one comparison in the module,
    // and it changes no band: it names which of § 5's two budget shapes is in force.
    const height = chartBlockHeight(700) + MIN_RAIL - 1;
    const below: ViewportFit = {
      viewportWidth: RAIL_REFLOW_PX - 1,
      viewportHeight: height,
      keyboardInset: 0,
      columnWidth: 700,
    };
    expect(fitsWholeBlock(below)).toBe(false);
    expect(fitsWholeBlock({ ...below, viewportWidth: RAIL_REFLOW_PX })).toBe(true);
  });

  test("amendment F ne retire pas l'asymétrie MIN_RAIL — les deux arcs paient encore ce qu'ils doivent", () => {
    // **The cap is a width rule; `MIN_RAIL` is about who the Rail sits under.** Below B2 the widest
    // column that arm can reach is 767 px, so the ceiling never applies there at all — every narrow
    // viewport is decided by exactly the term it was before, and dropping it would claim a fit with
    // a 48 px Rail: at 390 × 640 the block is 591,64 and the residual 48,36 against a floor of 120.
    const narrow: ViewportFit = {
      viewportWidth: 390,
      viewportHeight: 640,
      keyboardInset: 0,
      columnWidth: 390,
    };
    expect(chartBlockHeight(390)).toBeLessThan(640);
    expect(fitsWholeBlock(narrow)).toBe(false);
    expect(640 - chartBlockHeight(390)).toBeLessThan(MIN_RAIL);
    // And the *other* arm may not gain the term either — that is the rejected option (ii). With
    // `MIN_RAIL` spent above B2 as well, budget C's 856,32 against `900 − 120 = 780` collapses the
    // spec's **own reference desktop**, and 1600 × 900 — the row the cap just rescued — goes straight
    // back to pinned.
    for (const [width, height, column] of [
      [1440, 900, 1152],
      [1600, 900, 1312],
    ] as const) {
      const desktop: ViewportFit = {
        viewportWidth: width,
        viewportHeight: height,
        keyboardInset: 0,
        columnWidth: column,
      };
      expect(fitsWholeBlock(desktop)).toBe(true);
      // The literal every-width reading of the acceptance item, as arithmetic rather than as prose.
      expect(chartBlockHeight(column) <= height - MIN_RAIL).toBe(false);
    }
    // What the cap *did* do to the disagreement is shrink it: with the block bounded at 879,68 the
    // two readings now agree on every viewport at least 999,68 px tall, 1920 × 1080 included. They
    // still part company over budget C, which is why the ternary stays.
    expect(chartBlockHeight(1632) <= 1080 - MIN_RAIL).toBe(true);
  });

  test("l'exactitude du seuil : un pixel de part et d'autre", () => {
    const column = 390;
    const exact = chartBlockHeight(column) + MIN_RAIL;
    const fit: ViewportFit = {
      viewportWidth: column,
      viewportHeight: exact,
      keyboardInset: 0,
      columnWidth: column,
    };
    expect(fitsWholeBlock(fit)).toBe(true);
    expect(fitsWholeBlock({ ...fit, viewportHeight: exact - 1 })).toBe(false);
  });

  test("un clavier retire exactement sa hauteur, sur les deux plateformes", () => {
    // Where `interactive-widget=resizes-content` is honoured the inset is 0 and `viewportHeight` is
    // already the answer; where it is ignored the inset carries the whole correction. Same result.
    expect(availableHeight({ viewportHeight: 664, keyboardInset: 0 })).toBe(664);
    expect(availableHeight({ viewportHeight: 664, keyboardInset: 336 })).toBe(328);
    expect(
      fitsWholeBlock({
        viewportWidth: 390,
        viewportHeight: 328,
        keyboardInset: 0,
        columnWidth: 390,
      }),
    ).toBe(
      fitsWholeBlock({
        viewportWidth: 390,
        viewportHeight: 664,
        keyboardInset: 336,
        columnWidth: 390,
      }),
    );
    // A keyboard taller than the viewport is a transient during the animation, not a negative box.
    expect(availableHeight({ viewportHeight: 664, keyboardInset: 900 })).toBe(0);
  });

  /**
   * Ticket 31's **D3**, at the seam that produced it: § 8's « clés ignorées » strip is a shell band
   * *above* the two columns, and above B2 it is spent out of the chart column's own height. Measured
   * at 1440 × 900 on `/?L=250`: strip **85 px**, column **815** against a block of 857, and the
   * read-out cells row at `y 889 / bottom 941` — « Garde min 1,31 m » clipped by the shell's
   * `overflow-hidden`, while `data-fit` still read « roomy ».
   */
  test("D3 — le bandeau des clés ignorées se paie sur la hauteur du bloc, au-dessus de B2", () => {
    const desktop: ViewportFit = {
      viewportWidth: 1440,
      viewportHeight: 900,
      keyboardInset: 0,
      columnWidth: 1152,
    };
    // Budget C's own letterbox is 43 px, so any band above the columns taller than that takes the
    // block below its 857 — and the block is what stops fitting, not the strip.
    expect(fitsWholeBlock({ ...desktop, chromeHeight: 0 })).toBe(true);
    expect(fitsWholeBlock({ ...desktop, chromeHeight: 85 })).toBe(false);
    // The threshold is the letterbox, to the pixel: 900 − 856,3 = 43,7.
    const letterbox = 900 - chartBlockHeight(1152);
    expect(fitsWholeBlock({ ...desktop, chromeHeight: Math.floor(letterbox) })).toBe(true);
    expect(fitsWholeBlock({ ...desktop, chromeHeight: Math.ceil(letterbox) })).toBe(false);
    // An absent strip and a dismissed one are the same viewport, which is what makes § 5's
    // « rejetable » worth something: the whole block comes back on the next frame.
    expect(fitsWholeBlock({ ...desktop, chromeHeight: 0 })).toBe(fitsWholeBlock(desktop));
  });

  test("D3 — sous B2 le bandeau se paie sur le rail, que § 5 tolère explicitement", () => {
    // § 5's spine: « avec le bandeau des clés ignorées le rail descend à 64 px — tolérable seulement
    // parce que ce bandeau est rejetable et que le bloc se replie au premier défilement ». The Rail
    // is the residual scroller there, so nothing is clipped and (c) must not pin the budget the
    // spine prints. `MIN_RAIL` is the term that arm already spends. Asserted on 390 × 844, because
    // budget A itself no longer fits with seven read-out cells (2026-09-23) — the claim is about the
    // chrome term, and it needs a viewport the block fits in to be about anything.
    const phone: ViewportFit = {
      viewportWidth: 390,
      viewportHeight: 844,
      keyboardInset: 0,
      columnWidth: 390,
    };
    expect(fitsWholeBlock(phone)).toBe(true);
    expect(fitsWholeBlock({ ...phone, chromeHeight: 60 })).toBe(true);
    expect(fitsWholeBlock({ ...phone, chromeHeight: 200 })).toBe(true);
  });
});

describe("la rangée compacte — « `--kb > 0` ou hauteur disponible < 420 px »", () => {
  test.each([
    ["clavier ouvert, écran haut", { viewportHeight: 900, keyboardInset: 1 }, true],
    ["aucun clavier, écran haut", { viewportHeight: 900, keyboardInset: 0 }, false],
    ["paysage · 330 px de svh", { viewportHeight: 330, keyboardInset: 0 }, true],
    ["exactement 420 px", { viewportHeight: COMPACT_HEIGHT_PX, keyboardInset: 0 }, false],
    ["419 px", { viewportHeight: COMPACT_HEIGHT_PX - 1, keyboardInset: 0 }, true],
    // 664 − 336 = 328 < 420: both halves of the rule fire, which is the portrait keyboard case.
    ["390×664 sous un clavier de 336 px", { viewportHeight: 664, keyboardInset: 336 }, true],
  ] as const)("%s → %s", (_name, fit, expected) => {
    expect(compactRequired(fit)).toBe(expected);
  });

  test("le seuil `--kb` n'en est pas un : le moindre encart suffit", () => {
    // § 5 states it without a threshold on purpose — the ~336 px the budgets assume is a
    // platform-typical figure, and any inset at all means a keyboard is over the Rail.
    expect(compactRequired({ viewportHeight: 2000, keyboardInset: 1 })).toBe(true);
  });
});

describe("le centrage au focus — § 5, pièce clavier 3", () => {
  test("`block: center`, et surtout **pas** de défilement animé", () => {
    expect(CENTRE_IN_RAIL.block).toBe("center");
    // The whole point: `behavior` is left at `auto`, because a smooth scroll races the keyboard
    // animation. An explicit `"smooth"` here is the defect, so its absence is asserted.
    expect(CENTRE_IN_RAIL.behavior).toBeUndefined();
    expect(Object.values(CENTRE_IN_RAIL)).not.toContain("smooth");
  });

  test.each([
    ["rail-field", true],
    ["rail-rider-position", true],
    ["view-strip-position", false],
    ["none", false],
  ] as const)("centresOnFocus(%s) === %s", (focus, expected) => {
    // Fields only — the same rule trigger (b) uses. The View Strip's `x` is not in the Rail's
    // scroller at all, and a button is an action.
    expect(centresOnFocus(focus)).toBe(expected);
  });
});

describe("le repli n'est ni dans le Scénario, ni dans la Session, ni dans l'URL", () => {
  /** Everything the policy is made of, as it would look if someone tried to store it. */
  const COLLAPSE_WORDS = ["collapse", "pinned", "railAtTop", "revealed", "fits", "profil"];

  test("aucune clé d'URL ne porte l'état de repli", () => {
    const search = scenarioToSearch(FIRST_RUN_SCENARIO);
    const keys = [...CANONICAL_KEYS, ...Object.keys(search)];
    for (const word of COLLAPSE_WORDS) {
      expect(keys.some((key) => key.toLowerCase().includes(word.toLowerCase()))).toBe(false);
    }
  });

  test("la Session écrite ne porte pas l'état de repli", () => {
    const map = new Map<string, string>();
    const storage = {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
      removeItem: (key: string) => {
        map.delete(key);
      },
    };
    writeSession(storage, {
      scenario: FIRST_RUN_SCENARIO,
      retainedMaterial: null,
      retainedManual: null,
      trace: null,
      layers: DEFAULT_LAYERS,
    });
    const written = map.get(SESSION_KEY) ?? "";
    expect(written.length).toBeGreaterThan(0);
    for (const word of COLLAPSE_WORDS) {
      expect(written.toLowerCase()).not.toContain(word.toLowerCase());
    }
  });
});
