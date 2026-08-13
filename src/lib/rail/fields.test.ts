import { describe, expect, test } from "vitest";

import { formatQuantity } from "@/lib/format/quantity.ts";

import type { FieldId } from "./fields.ts";

import {
  checkField,
  commitField,
  displayField,
  emptyMessage,
  FIELD_ORDER,
  FIELDS,
  fieldSchema,
  gateOf,
  parseDecimal,
  REQUIRED_MESSAGE,
  warningFor,
} from "./fields.ts";

/**
 * Tier one — « v1 build spec » § 3 (*The field table*, *Numeric input*) and § 7 (*Deux états par
 * champ*). **The whole of what a form validator may decide**, and nothing else: no range that
 * needs a solve, no §5.4 chord bound, no verdict.
 *
 * The seventeen ⛔ strings below are § 7's own message table, transcribed row by row. They are
 * asserted as **string equalities**, like the first-run lock: a message is a contract, not a
 * detail, and paraphrasing one is a silent change to what the app tells a rigger.
 */

describe("parseDecimal — § 3's elected widget, `,` and `.` both accepted", () => {
  test("both decimal marks read, because a keypad may offer either", () => {
    expect(parseDecimal("6,5")).toBe(6.5);
    expect(parseDecimal("6.5")).toBe(6.5);
    expect(parseDecimal(" -18,0 ")).toBe(-18);
    expect(parseDecimal("+6,5")).toBe(6.5);
    expect(parseDecimal(",5")).toBe(0.5);
    expect(parseDecimal("6,")).toBe(6);
  });

  test("stricter than `Number()`, which reads three of these as silent wrong answers", () => {
    // `Number("")` is 0, `Number(" ")` is 0 and `Number("0x10")` is 16 — three wrong margins.
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("   ")).toBeNull();
    expect(parseDecimal("0x10")).toBeNull();
    expect(parseDecimal("12,3,4")).toBeNull();
    expect(parseDecimal("6,5 m")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
  });

  test("an infinity is unreadable: nothing here has a value the field cannot show back", () => {
    expect(parseDecimal("1e999")).toBeNull();
    expect(parseDecimal("Infinity")).toBeNull();
  });
});

describe("§ 7's message table — the empty state, neutral and lowercase", () => {
  test("« valeur requise », unpunctuated — ticket 11's rendering governs", () => {
    expect(emptyMessage("L")).toBe("valeur requise");
    expect(REQUIRED_MESSAGE).toBe("valeur requise");
    expect(checkField("L", "")).toEqual({ field: "L", kind: "empty", message: "valeur requise" });
    expect(checkField("mp", "   ")?.kind).toBe("empty");
  });

  test("`k`'s blank carries its reason for polyester: nobody published the number", () => {
    expect(emptyMessage("k", { ropeClass: "polyester" })).toBe(
      "valeur requise — aucune valeur publiée pour le polyester",
    );
    // The other two classes have a `[DATASHEET]` figure, so their blank is an ordinary omission.
    expect(emptyMessage("k", { ropeClass: "hmpe" })).toBe("valeur requise");
    expect(emptyMessage("k", { ropeClass: "pa-en1891a" })).toBe("valeur requise");
  });
});

describe("§ 7's message table — committed invalid, ⛔ and blocking", () => {
  /** `⛔ <Champ> — <la règle, énoncée>. Valeur : <v>.` — the template is fixed. */
  const ROWS: readonly [FieldId, string, string][] = [
    ["L", "-5", "⛔ Portée — une longueur strictement positive est requise. Valeur : −5,0 m."],
    ["zA", "-2", "⛔ Hauteur d'ancrage A — une hauteur négative n'existe pas. Valeur : −2,0 m."],
    ["zB", "-2", "⛔ Hauteur d'ancrage B — une hauteur négative n'existe pas. Valeur : −2,0 m."],
    [
      "D_target",
      "0",
      "⛔ Flèche à vide cible — une flèche strictement positive est requise. Valeur : 0,00 m.",
    ],
    [
      "H_target",
      "0",
      "⛔ Prétension cible — une tension strictement positive est requise. Valeur : 0,0 daN.",
    ],
    [
      "L0",
      "0",
      "⛔ Longueur non tendue — une longueur strictement positive est requise. Valeur : 0,00 m.",
    ],
    [
      "mp",
      "0",
      "⛔ Masse du passager — une masse strictement positive est requise. Valeur : 0 kg.",
    ],
    [
      "hRider",
      "0",
      "⛔ Enveloppe passager — une hauteur strictement positive est requise. Valeur : 0,0 m.",
    ],
    [
      "DAF",
      "0",
      "⛔ Coefficient dynamique — une valeur strictement positive est requise. Valeur : 0,0.",
    ],
    [
      "d",
      "0",
      "⛔ Diamètre nominal — un diamètre strictement positif est requis. Valeur : 0,0 mm.",
    ],
    [
      "MBL",
      "0",
      "⛔ Charge de rupture — une charge strictement positive est requise. Valeur : 0 daN.",
    ],
    [
      "muTextile",
      "0",
      "⛔ Masse linéique — une valeur strictement positive est requise. Valeur : 0,0000 kg/m.",
    ],
    [
      "k",
      "0",
      "⛔ Raideur relative k — une valeur strictement positive est requise. Valeur : 0,0.",
    ],
  ];

  test.each(ROWS)("%s at « %s »", (field, raw, message) => {
    expect(checkField(field, raw)).toEqual({ field, kind: "invalid", message });
  });

  test("the rule is stated as a property of the world, never as a reproach", () => {
    // Invariant 2: every one of these states is reachable on the **first frame of a link**, where
    // « vous avez saisi » and « maintenant » are lies.
    for (const [, , message] of ROWS) {
      expect(message).not.toMatch(/vous|maintenant|veuillez/i);
    }
  });

  test("the offending value is always echoed — an arrived link has not been seen yet", () => {
    for (const [, , message] of ROWS) expect(message).toContain("Valeur : ");
  });

  test("« nombre illisible » quotes the raw text back, because that is the evidence", () => {
    expect(checkField("h", "12,3,4")).toEqual({
      field: "h",
      kind: "unreadable",
      message: "⛔ Dénivelé — nombre illisible. Saisie : « 12,3,4 ».",
    });
  });

  test("`h < 0` is legitimate — a downhill line has a negative dénivelé", () => {
    expect(checkField("h", "-18,0")).toBeNull();
    expect(checkField("h", "0")).toBeNull();
  });

  test("a station names the file's bound rather than the field, because two stations share it", () => {
    const extent = { min: 0, max: 224 };
    expect(checkField("sa", "260", { extent })).toEqual({
      field: "sa",
      kind: "invalid",
      message: "⛔ Station hors du tracé (0,0 – 224,0 m). Valeur : 260,0 m.",
    });
    expect(checkField("sb", "224", { extent })).toBeNull();
  });

  test("an out-of-range but representable value is **valid** here", () => {
    // The URL is a typing boundary and so is the form's tier one: `L = 3000` lights up a warning
    // and solves, and `L₀` below §5.4's floor is the **engine's** refusal, never a field error.
    expect(checkField("L", "3000")).toBeNull();
    expect(checkField("L0", "1")).toBeNull();
    expect(checkField("d", "60")).toBeNull();
  });
});

describe("§ 3's warning column — non-blocking, and it never withholds a number", () => {
  test("`L ∉ [50, 2000]`", () => {
    expect(warningFor("L", 150)).toBeNull();
    expect(warningFor("L", 40)).toBe("hors du domaine de validité (50 – 2000 m)");
    expect(warningFor("L", 2400)).toBe("hors du domaine de validité (50 – 2000 m)");
  });

  test("`|h| > L` — the > 45° line, the one warning that reads a second field", () => {
    expect(warningFor("h", -18, { L: 150 })).toBeNull();
    expect(warningFor("h", -180, { L: 150 })).toBe("pente supérieure à 45° (|dénivelé| > portée)");
    // With no span to compare against there is no claim to make.
    expect(warningFor("h", -180)).toBeNull();
  });

  test("`hauteur > 30` and `d ∉ [6, 26]`, the `[CONVENTION]` band", () => {
    expect(warningFor("zA", 12)).toBeNull();
    expect(warningFor("zA", 31)).toBe("hauteur d'ancrage supérieure à 30 m");
    expect(warningFor("d", 12)).toBeNull();
    expect(warningFor("d", 4)).toContain("[CONVENTION]");
  });

  test("no field carries a warning that needs a solve", () => {
    // § 3's ladder splits in two idioms with two owners: `> 30 % MBL`, `flèche < 3 %`, `k` hors
    // bande and the verdict all need a Sweep, and they are § 6's — never a form warning.
    for (const id of FIELD_ORDER) {
      const { warning } = FIELDS[id];
      if (warning === null) continue;
      expect(["band", "above", "steeper-than-45"]).toContain(warning.kind);
    }
  });
});

describe("commit — § 3's prefill rule, applied at the one place a user writes", () => {
  test("the value that enters state is the value the field shows", () => {
    // A user who types 82,5 kg sees « 83 kg » commit: rounding is always visible.
    expect(commitField("mp", "82,5")).toBe(83);
    expect(commitField("L", "150,04")).toBe(150);
    expect(commitField("L0", "151,6440231")).toBe(151.64);
  });

  test("forces come back canonical — newtons — whatever the selector says", () => {
    // § 3: « SI internally, always. » 253,5 daN is 2535 N, and 2,535 kN is the same line.
    expect(commitField("H_target", "253,5", { unit: "daN" })).toBe(2535);
    expect(commitField("H_target", "2,535", { unit: "kN" })).toBe(2535);
    // `EA` is the declared carve-out: it reads MN under every setting of the selector.
    expect(commitField("eaOverride", "6,90")).toBe(6.9e6);
  });

  test("display → commit → display is the identity at the row's own grain", () => {
    for (const [id, value] of [
      ["L", 150],
      ["h", -18],
      ["D_target", 6],
      ["mp", 120],
      ["mbfOverride", 90740],
      ["eaOverride", 6.897e6],
    ] as const) {
      const shown = displayField(id, value);
      const committed = commitField(id, shown);
      expect(committed).not.toBeNull();
      expect(displayField(id, committed as number)).toBe(shown);
    }
  });

  test("unreadable text commits nothing", () => {
    expect(commitField("L", "12,3,4")).toBeNull();
  });
});

describe("the gate each field belongs to — wired with the field, not as a later pass", () => {
  test("the three Passager fields land in three **different** gates", () => {
    // That is itself the evidence the split was right, and § 7 says so.
    expect(gateOf("mp", "manual")).toBe("solve");
    expect(gateOf("hRider", "manual")).toBe("clearance");
    expect(gateOf("DAF", "manual")).toBe("verdict");
  });

  test("`x_D` sits in no gate — it clamps, and a clamp produces no error state", () => {
    expect(gateOf("xD", "manual")).toBeNull();
    expect(FIELDS.xD.rule).toBeNull();
  });

  test("the anchor heights move to the Solve Gate in imported mode, because `h` derives there", () => {
    // § 7's culprit table: « `h` importé → Station A, Station B, Hauteur A, Hauteur B ».
    expect(gateOf("zA", "manual")).toBe("clearance");
    expect(gateOf("zA", "trace")).toBe("solve");
    expect(gateOf("zB", "trace")).toBe("solve");
  });

  test("« régime choisi » is in the Verdict Gate and nowhere else", () => {
    expect(gateOf("regime", "manual")).toBe("verdict");
  });

  test("every field is declared, once, in rail order", () => {
    expect(new Set(FIELD_ORDER).size).toBe(FIELD_ORDER.length);
    for (const id of FIELD_ORDER) expect(FIELDS[id].id).toBe(id);
  });
});

describe("fieldSchema — the Standard Schema TanStack Form validates with", () => {
  test("it carries the spec's French string, never valibot's own message", () => {
    const schema = fieldSchema("L");
    const result = schema["~standard"].validate("-5");
    expect(result).not.toBeInstanceOf(Promise);
    const issues = (result as { issues?: readonly { message: string }[] }).issues;
    expect(issues?.map((issue) => issue.message)).toEqual([
      "⛔ Portée — une longueur strictement positive est requise. Valeur : −5,0 m.",
    ]);
  });

  test("a valid value passes with the string **untouched** — no transform anywhere", () => {
    const result = fieldSchema("L")["~standard"].validate("150,0") as {
      value?: unknown;
      issues?: unknown;
    };
    expect(result.issues).toBeUndefined();
    expect(result.value).toBe("150,0");
  });

  test("it is synchronous, which is what makes it usable on every keystroke", () => {
    expect(fieldSchema("mp")["~standard"].validate("")).not.toBeInstanceOf(Promise);
  });
});

describe("the echo reads in the field's own quantity and unit", () => {
  test("a force echoes in the selected unit, never in newtons", () => {
    const issue = checkField("H_target", "-10", { unit: "kN" });
    // `kN` = daN decimals **+ 2**, so the resolution never coarsens on a switch.
    expect(issue?.message).toContain("Valeur : −10,000 kN.");
    // …and the same canonical value reads differently under the selector, which is the point.
    expect(formatQuantity("H_target", -1e4, "daN")).toBe("-1000,0 daN");
  });
});
