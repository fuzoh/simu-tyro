import { describe, expect, test } from "vitest";

import type { FieldId } from "@/lib/rail/fields.ts";

import { DEFAULT_MAP_DISPLAY } from "@/lib/map/display.ts";
import { FIRST_RUN_SCENARIO } from "@/lib/scenario/first-run.ts";
import { DEFAULT_LAYERS, SESSION_KEY, writeSession } from "@/lib/session/session.ts";
import { scenarioToSearch } from "@/lib/url/scenario.ts";
import { CANONICAL_KEYS } from "@/lib/url/schema.ts";

import type { CollapseFocus, CollapseInputs, CollapseState, ViewportFit } from "./collapse.ts";

import {
  availableHeight,
  CENTRE_IN_RAIL,
  centresOnFocus,
  collapseState,
  compactRequired,
  fitsWholeBlock,
  heightBindsBlock,
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
  avanceBlockWidth,
  BANNER,
  chartBlockHeight,
  chartColumnWidth,
  COMPACT_HEIGHT_PX,
  MIN_RAIL,
  NAV_BAR,
  PINNED_CELL,
  RAIL_HEADER,
  THREE_COLUMN_PX,
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
   * viewport and above it is `viewport − 576`. Above B2 every case fits since #110: the window's
   * height binds the block only where the Rail stands under it.
   */
  const CASES: readonly {
    readonly name: string;
    readonly fit: ViewportFit;
    readonly fits: boolean;
  }[] = [
    {
      // Budget A: the block was 540 and the rail's 124 px cleared `MIN_RAIL` by 4 px. Seven read-out
      // cells wrap to three lines at 390 px (2026-09-23) and the gutter is 12 px (#115), so the
      // block is 601,72 and the rail 62,28: (c) pins it at rest, and 390 × 844 below is the phone
      // that still opens whole.
      name: "A · 390×664 au repos",
      fit: {
        viewportWidth: 390,
        viewportHeight: 664,
        keyboardInset: 0,
        columnWidth: chartColumnWidth(390),
      },
      fits: false,
    },
    {
      name: "390×844 — un téléphone courant, le bloc entier",
      fit: {
        viewportWidth: 390,
        viewportHeight: 844,
        keyboardInset: 0,
        columnWidth: chartColumnWidth(390),
      },
      fits: true,
    },
    {
      // 664 − 336 = 328 of viewport, 208 once the rail's floor is paid: « a 540 px block cannot
      // coexist with a focused field », which is the arithmetic that forces triggers (a) and (b).
      name: "390×664, clavier logiciel de 336 px",
      fit: {
        viewportWidth: 390,
        viewportHeight: 664,
        keyboardInset: 336,
        columnWidth: chartColumnWidth(390),
      },
      fits: false,
    },
    {
      // § 5's landscape measurement, and the reason the app needs no rotate prompt: the fit rule
      // fires on its own, below B2, with no orientation anywhere in it.
      name: "paysage · 844×390",
      fit: {
        viewportWidth: 844,
        viewportHeight: 390,
        keyboardInset: 0,
        columnWidth: chartColumnWidth(844),
      },
      fits: false,
    },
    {
      name: "768×1024 empilé",
      fit: {
        viewportWidth: 768,
        viewportHeight: 1024,
        keyboardInset: 0,
        columnWidth: chartColumnWidth(768),
      },
      fits: true,
    },
    {
      // Avancé's chart column at 1440 is the middle one, 864 px: a 755,2 px block at the one-line
      // banner, and the rule reserves the three-line one and still fits.
      name: "1440×900 trois colonnes",
      fit: {
        viewportWidth: 1440,
        viewportHeight: 900,
        keyboardInset: 0,
        columnWidth: chartColumnWidth(1440),
      },
      fits: true,
    },
    {
      // Pinned before #110. The 755,2 px block does not fit in 500 px, but from three columns the
      // middle column scrolls under the vue de dessus, so the block stays whole and the column
      // scrolls to « Garde min » — the coupe's height no longer moves with the window's.
      name: "une fenêtre de bureau écrasée · 1440×500 — entière, la colonne défile",
      fit: {
        viewportWidth: 1440,
        viewportHeight: 500,
        keyboardInset: 0,
        columnWidth: chartColumnWidth(1440),
      },
      fits: true,
    },
    // ─── The landscape tablets and the switch width (B2 = 1024) ──────────────────────────────────
    // Stacked, these three owed a 796–877 px block plus MIN_RAIL under it and opened on the Pinned
    // Safety Header alone. In three columns the block is 624–629 px and owes the Rail nothing.
    {
      name: "1024×768 paysage — entier, trois colonnes",
      fit: {
        viewportWidth: 1024,
        viewportHeight: 768,
        keyboardInset: 0,
        navigationHeight: NAV_BAR,
        columnWidth: chartColumnWidth(1024),
      },
      fits: true,
    },
    {
      name: "1180×820 paysage — entier",
      fit: {
        viewportWidth: 1180,
        viewportHeight: 820,
        keyboardInset: 0,
        navigationHeight: NAV_BAR,
        columnWidth: chartColumnWidth(1180),
      },
      fits: true,
    },
    {
      name: "1194×834 paysage — entier",
      fit: {
        viewportWidth: 1194,
        viewportHeight: 834,
        keyboardInset: 0,
        navigationHeight: NAV_BAR,
        columnWidth: chartColumnWidth(1194),
      },
      fits: true,
    },
    {
      // Stacked, the block (782,08 px at a 1000 px column) owes MIN_RAIL and the bar: this is the
      // narrow desktop window that opens on the Pinned Safety Header, accepted in `ui.md`.
      name: "1000×900 empilé — épinglé, le bloc et MIN_RAIL ne tiennent pas",
      fit: {
        viewportWidth: 1000,
        viewportHeight: 900,
        keyboardInset: 0,
        navigationHeight: NAV_BAR,
        columnWidth: chartColumnWidth(1000),
      },
      fits: false,
    },
    {
      name: "820×1180 portrait empilé — entier",
      fit: {
        viewportWidth: 820,
        viewportHeight: 1180,
        keyboardInset: 0,
        navigationHeight: NAV_BAR,
        columnWidth: chartColumnWidth(820),
      },
      fits: true,
    },
    {
      name: "rien de mesuré encore — le Skeleton s'ouvre entier",
      fit: { viewportWidth: 390, viewportHeight: 664, keyboardInset: 0, columnWidth: null },
      fits: true,
    },
    // ─── Amendment F, the wide arm, in Avancé's three columns ─────────────────────────────────────
    // The desktops ticket 28 measured with **no chart at all** beside one Rail. Every one of them
    // opens whole in Avancé's three columns, where no height binds the block (#110); the notes give
    // the block each one would owe if it did.
    {
      // Block 662,4 at a 704 px column — 57,6 px of height to spare, where beside one Rail the
      // same window would be 57,44 px short.
      name: "1280×720 — entier, la colonne du milieu est plus basse que celle d'un seul rail",
      fit: {
        viewportWidth: 1280,
        viewportHeight: 720,
        keyboardInset: 0,
        columnWidth: chartColumnWidth(1280),
      },
      fits: true,
    },
    {
      name: "1280×800 — entier, avec de la marge",
      fit: {
        viewportWidth: 1280,
        viewportHeight: 800,
        keyboardInset: 0,
        columnWidth: chartColumnWidth(1280),
      },
      fits: true,
    },
    {
      // Block 712,28 at a 790 px column, 55,72 px under its viewport.
      name: "1366×768 — entier",
      fit: {
        viewportWidth: 1366,
        viewportHeight: 768,
        keyboardInset: 0,
        columnWidth: chartColumnWidth(1366),
      },
      fits: true,
    },
    {
      // Block 796,96 at a 936 px column, uncapped: the plot's ceiling is not reached below 1152 px.
      name: "1512×850 — entier, sous le plafond",
      fit: {
        viewportWidth: 1512,
        viewportHeight: 850,
        keyboardInset: 0,
        columnWidth: chartColumnWidth(1512),
      },
      fits: true,
    },
    {
      // Block 796 at a 1024 px column.
      name: "1600×900 — entier",
      fit: {
        viewportWidth: 1600,
        viewportHeight: 900,
        keyboardInset: 0,
        columnWidth: chartColumnWidth(1600),
      },
      fits: true,
    },
    {
      // A 1056 px block since #112 (the left column doubles from 1920, `1920 − 576 − 288`). The
      // block Avancé draws there, `chartBlockHeight(1056, undefined, AVANCE_PLOT_MAX)`, is
      // `44 + 76 + 0,42 × 1032 + 0,16 × 1032 + 44 + 52 = 814,56` px — `contract.test.ts` holds it
      // under the 1044 px left — but this fit does not read it: from B2 it returns before any
      // block height.
      name: "1920×1080 — entier, la colonne s'élargit",
      fit: {
        viewportWidth: 1920,
        viewportHeight: 1080,
        keyboardInset: 0,
        columnWidth: avanceBlockWidth(1920),
      },
      fits: true,
    },
    {
      // A 1696 px block, the column at 2560 since #112: `416 + 0,42 × 1672 = 1118,24` px, under 1404.
      name: "2560×1440 — entier",
      fit: {
        viewportWidth: 2560,
        viewportHeight: 1440,
        keyboardInset: 0,
        columnWidth: avanceBlockWidth(2560),
      },
      fits: true,
    },
    {
      // The ultrawide the unbounded rule lost outright beside one Rail. Avancé's block letterboxes
      // at 1984 px in the 2576 px column, so it is 1239,2 px, its plateau, under 1404 — and the fit
      // answers « whole » without reading it, as at every width from B2.
      name: "3440×1440 ultra-large — entier, le bloc en letterbox",
      fit: {
        viewportWidth: 3440,
        viewportHeight: 1440,
        keyboardInset: 0,
        columnWidth: avanceBlockWidth(3440),
      },
      fits: true,
    },
  ];

  test.each(CASES)("$name → fits=$fits", ({ fit, fits }) => {
    expect(fitsWholeBlock(fit)).toBe(fits);
  });

  test("le rail sous le bloc coûte MIN_RAIL, le rail à côté ne coûte rien", () => {
    // The same column, the same height, on either side of B2 — the one comparison in the module,
    // and it changes no band: it names which of § 5's two budget shapes is in force. Above B2 the
    // window's height binds nothing at all (#110), so the same viewport fits there however short.
    const height = chartBlockHeight(700) + MIN_RAIL - 1;
    const below: ViewportFit = {
      viewportWidth: THREE_COLUMN_PX - 1,
      viewportHeight: height,
      keyboardInset: 0,
      columnWidth: 700,
    };
    expect(fitsWholeBlock(below)).toBe(false);
    expect(fitsWholeBlock({ ...below, viewportWidth: THREE_COLUMN_PX })).toBe(true);
    expect(fitsWholeBlock({ ...below, viewportWidth: THREE_COLUMN_PX, viewportHeight: 1 })).toBe(
      true,
    );
  });

  test("amendment F ne retire pas MIN_RAIL sous B2 — le seul arc où la hauteur lie encore", () => {
    // **The cap is a width rule; `MIN_RAIL` is about who the Rail sits under.** Below B2 the widest
    // column that arm can reach is 1023 px, so the ceiling never applies there at all — every narrow
    // viewport is decided by exactly the term it was before, and dropping it would claim a fit with
    // a 38 px Rail: at 390 × 640 the block is 601,72 and the residual 38,28 against a floor of 120.
    const narrow: ViewportFit = {
      viewportWidth: 390,
      viewportHeight: 640,
      keyboardInset: 0,
      columnWidth: 390,
    };
    expect(chartBlockHeight(390)).toBeLessThan(640);
    expect(fitsWholeBlock(narrow)).toBe(false);
    expect(640 - chartBlockHeight(390)).toBeLessThan(MIN_RAIL);
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
   * #110's « la hauteur de la coupe ne change pas quand seule la hauteur de la fenêtre change »,
   * at the policy's seam: from three columns neither height constraint fires, at any height and
   * under any keyboard, so the state — and with it every band of the block — reads the width alone.
   * Below B2 the same heights still pin, which is the stacked shape the brief keeps.
   */
  test("#110 — au-dessus de B2, la hauteur de la fenêtre ne replie jamais le bloc", () => {
    for (const viewportWidth of [1024, 1440, 1920, 2560, 3440]) {
      for (const viewportHeight of [200, 419, 500, 768, 900, 1080, 1440, 2160]) {
        for (const keyboardInset of [0, 336]) {
          const fit: ViewportFit = {
            viewportWidth,
            viewportHeight,
            keyboardInset,
            navigationHeight: NAV_BAR,
            columnWidth: chartColumnWidth(viewportWidth),
          };
          const fits = fitsWholeBlock(fit);
          const compact = compactRequired(fit);
          expect({ viewportWidth, viewportHeight, keyboardInset, fits, compact }).toStrictEqual({
            viewportWidth,
            viewportHeight,
            keyboardInset,
            fits: true,
            compact: false,
          });
          expect(collapseState({ ...RESTING, fits, compact })).toBe("whole");
        }
      }
    }
  });

  test("#110 — la bascule est B2 : 1023 px replie encore, 1024 non", () => {
    expect(heightBindsBlock(THREE_COLUMN_PX - 1)).toBe(true);
    expect(heightBindsBlock(THREE_COLUMN_PX)).toBe(false);
    // 1023 × 500: a 1023 px column owes `44 + 76 + 0,42 × 999 + 0,16 × 999 + 44 + 52 = 795,42`
    // plus MIN_RAIL and the bar — far more than 500. One pixel wider is three columns.
    const short: ViewportFit = {
      viewportWidth: THREE_COLUMN_PX - 1,
      viewportHeight: 500,
      keyboardInset: 0,
      navigationHeight: NAV_BAR,
      columnWidth: chartColumnWidth(THREE_COLUMN_PX - 1),
    };
    expect(chartBlockHeight(THREE_COLUMN_PX - 1)).toBeCloseTo(795.42, 9);
    expect(fitsWholeBlock(short)).toBe(false);
    const wide = {
      ...short,
      viewportWidth: THREE_COLUMN_PX,
      columnWidth: chartColumnWidth(THREE_COLUMN_PX),
    };
    expect(fitsWholeBlock(wide)).toBe(true);
    expect(compactRequired({ ...short, keyboardInset: 336 })).toBe(true);
    expect(compactRequired({ ...wide, keyboardInset: 336 })).toBe(false);
  });
});

/**
 * ADR-0002's navigation bar stands above every app Page's shell, so the shell never has the whole
 * viewport. Unlike § 8's strip it is never dismissed, so it is owed wherever the window's height
 * binds the block — **below B2 only** since #110 (`heightBindsBlock`), where `MIN_RAIL` is owed
 * under it too.
 */
describe("la barre de navigation se paie sous B2", () => {
  const desktop: ViewportFit = {
    viewportWidth: 1440,
    viewportHeight: 900,
    keyboardInset: 0,
    columnWidth: chartColumnWidth(1440),
  };

  test("elle retire sa hauteur de ce qui reste, clavier compris", () => {
    expect(availableHeight({ viewportHeight: 664, keyboardInset: 0, navigationHeight: 36 })).toBe(
      628,
    );
    expect(availableHeight({ viewportHeight: 664, keyboardInset: 336, navigationHeight: 36 })).toBe(
      292,
    );
  });

  test("au-dessus de B2 elle ne coûte rien au bloc : rien n'y est ajusté à la fenêtre (#110)", () => {
    // Budget C's 870,24 px block under the bar needed 907 px of height before #110. From three
    // columns it fits at any height, bar or no bar.
    expect(fitsWholeBlock({ ...desktop, navigationHeight: NAV_BAR })).toBe(true);
    expect(fitsWholeBlock({ ...desktop, viewportHeight: 600, navigationHeight: RAIL_HEADER })).toBe(
      true,
    );
  });

  test("sous B2 elle coûte aussi MIN_RAIL, car elle n'est pas rejetable", () => {
    const column = 390;
    const exact = chartBlockHeight(column) + MIN_RAIL + NAV_BAR;
    const phone: ViewportFit = {
      viewportWidth: column,
      viewportHeight: exact,
      keyboardInset: 0,
      columnWidth: column,
      navigationHeight: NAV_BAR,
    };
    expect(fitsWholeBlock(phone)).toBe(true);
    expect(fitsWholeBlock({ ...phone, viewportHeight: exact - 1 })).toBe(false);
  });

  test("la rangée compacte se déclenche 36 px plus tôt", () => {
    const at = (viewportHeight: number) =>
      compactRequired({
        viewportWidth: 390,
        viewportHeight,
        keyboardInset: 0,
        navigationHeight: NAV_BAR,
      });
    expect(at(456)).toBe(false);
    expect(at(455)).toBe(true);
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
    // A phone's width: the rule binds below B2 only (#110).
    expect(compactRequired({ viewportWidth: 390, ...fit })).toBe(expected);
  });

  test("le seuil `--kb` n'en est pas un : le moindre encart suffit", () => {
    // § 5 states it without a threshold on purpose — the ~336 px the budgets assume is a
    // platform-typical figure, and any inset at all means a keyboard is over the Rail.
    expect(compactRequired({ viewportWidth: 390, viewportHeight: 2000, keyboardInset: 1 })).toBe(
      true,
    );
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
      retainedCsv: null,
      layers: DEFAULT_LAYERS,
      map: DEFAULT_MAP_DISPLAY,
    });
    const written = map.get(SESSION_KEY) ?? "";
    expect(written.length).toBeGreaterThan(0);
    for (const word of COLLAPSE_WORDS) {
      expect(written.toLowerCase()).not.toContain(word.toLowerCase());
    }
  });
});
