import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import type { Trace } from "@/lib/terrain/trace.ts";

import { parseProfileCsv } from "@/lib/terrain/csv.ts";

import type { P1FailureKind } from "./p1.ts";

import {
  decodeP1,
  encodeP1,
  fitsLinkBudget,
  P1_PREFIX,
  P1Error,
  URL_BUDGET_CHARS,
  validateP1,
  validateP1Structure,
} from "./p1.ts";

/**
 * The `p1.` trace codec — « v1 build spec » § 8 (*The trace rides in the URL*) and § 11 (*The `p1`
 * codec — round-trip against the three real traces*).
 *
 * The gate is the spec's own **measured** character costs — 910 / 859 / 897 on the three real
 * traces, 1065–1071 on synthetic 200-point spans at 1000 / 1500 / 2000 m. Those numbers are the
 * decision to embed the trace rather than drop it; a change here means the codec changed, and the
 * budget argument has to be re-made rather than re-asserted.
 *
 * Two assertions carry more than a round-trip:
 *
 * - **`z_decoded ≥ z_original`, every row.** The ceiling rule is what makes the one lossy step
 *   provably safe-side. This case is what catches someone « fixing » ceiling to nearest.
 * - **`dev` survives, sentinel included.** Without it every shared trace degrades to « rectitude
 *   non vérifiable » and the recipient loses a disclosure the sender had.
 *
 * **Decode timing (2,3–2,5 µs) is deliberately absent** — a microsecond assertion in CI is a flake
 * generator; it belongs to `p1.bench.ts`, which a human reads.
 */

function readReference(n: 1 | 2 | 3): Trace {
  const text = readFileSync(
    new URL(`../../../docs/references/example-profile-trace${n}.csv`, import.meta.url),
    "utf8",
  );
  const result = parseProfileCsv(text, `example-profile-trace${n}.csv`);
  if (!result.ok) throw new Error(`fixture ${n} failed to parse: ${result.failure.kind}`);
  return result.trace;
}

/**
 * The readable half of an imported-mode link, in § 8's canonical key order — the first-run URL
 * (141 characters, measured) with `L`/`h` replaced by the stations an import carries. `tr` is the
 * key table's last row, so the payload closes the query.
 */
const READABLE_KEYS =
  "/?v=1&u=daN&use=perm&sa=62.0&sb=245.0&za=12&zb=12&fl=6.0&fam=ac&d=12&r0=1770" +
  "&cst=iwrc&ta=cosse&tb=cosse&na=0.9&nb=0.9&mp=120&hr=2.1&daf=1.2&x=91.5&tr=";

/** A deterministic LCG — the synthetic spans must cost the same characters on every machine. */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * A synthetic 200-point trace over `span` metres: **non-uniform** `d` (±35 % of the mean pitch,
 * which is the general case the real geoportal exports do not exercise) over relief rugged enough
 * that nearly every `Δz` needs its second varint byte. That is the codec's **worst** shape, which
 * is the only shape a budget assertion is worth taking on — and it is where § 8's 1065–1071 sits.
 * Both columns are laid on the centimetre grid, so the trace round-trips exactly.
 */
function syntheticTrace(span: number): Trace {
  const points = 200;
  const random = lcg(20260812);
  const pitches = Array.from({ length: points - 1 }, () => 1 + 0.35 * (random() * 2 - 1));
  const total = pitches.reduce((sum, pitch) => sum + pitch, 0);

  const d = new Float64Array(points);
  let travelled = 0;
  for (let i = 1; i < points; i++) {
    travelled += (pitches[i - 1] / total) * span;
    d[i] = Math.round(travelled * 100) / 100;
  }

  const z = new Float64Array(points);
  for (let i = 0; i < points; i++) {
    const relief =
      800 + 100 * Math.sin((2 * Math.PI * d[i]) / 317) + 35 * Math.sin((2 * Math.PI * d[i]) / 71);
    z[i] = Math.round(relief * 100) / 100;
  }

  return { d, z, dev: 0.42, fileName: null };
}

/** A hand-authored trace at an arbitrary pitch — the only way to exceed the budget. */
function denseTrace(points: number): Trace {
  const d = new Float64Array(points);
  const z = new Float64Array(points);
  for (let i = 0; i < points; i++) {
    d[i] = Math.round(i * 24.7) / 100;
    z[i] = Math.round(54000 + 300 * Math.sin(i / 40)) / 100;
  }
  return { d, z, dev: null, fileName: "profil-dense.csv" };
}

describe("URL cost — the measurement the embed decision rests on", () => {
  const REAL = [
    { n: 1 as const, extent: "183,4 m", chars: 910 },
    { n: 2 as const, extent: "224,0 m", chars: 859 },
    { n: 3 as const, extent: "188,4 m", chars: 897 },
  ];

  test.each(REAL)("trace$n ($extent) encodes to exactly $chars characters", ({ n, chars }) => {
    expect(encodeP1(readReference(n))).toHaveLength(chars);
  });

  test.each([1000, 1500, 2000])(
    "a synthetic 200-point span at %i m stays inside 1065–1071 characters",
    (span) => {
      const cost = encodeP1(syntheticTrace(span)).length;
      expect(cost).toBeGreaterThanOrEqual(1065);
      expect(cost).toBeLessThanOrEqual(1071);
    },
  );

  test("the whole URL, readable keys included, stays under the 2000-character budget", () => {
    for (const trace of [readReference(1), readReference(2), readReference(3)]) {
      const href = READABLE_KEYS + encodeP1(trace);
      expect(fitsLinkBudget(href)).toBe(true);
      expect(href.length).toBeLessThanOrEqual(URL_BUDGET_CHARS);
    }
    for (const span of [1000, 1500, 2000]) {
      const href = READABLE_KEYS + encodeP1(syntheticTrace(span));
      expect(fitsLinkBudget(href)).toBe(true);
      expect(href.length).toBeLessThanOrEqual(URL_BUDGET_CHARS);
    }
  });

  test("the payload needs no percent-encoding — base64url, and the `p1.` sentinel", () => {
    const payload = encodeP1(readReference(1));
    expect(payload.startsWith(P1_PREFIX)).toBe(true);
    expect(encodeURIComponent(payload)).toBe(payload);
    expect(payload.slice(P1_PREFIX.length)).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  test("the sentinel keeps the payload out of `JSON.parse`'s hands", () => {
    // The hazard § 8 names: an all-digit base64url value would arrive as a number with its
    // precision destroyed. `p1.` is one character JSON.parse throws on, forever.
    expect(() => JSON.parse(encodeP1(readReference(1)))).toThrow(SyntaxError);
  });
});

describe("round-trip — the three real traces", () => {
  test.each([1, 2, 3] as const)("trace%i round-trips", (n) => {
    const trace = readReference(n);
    const decoded = decodeP1(encodeP1(trace));

    // Point count: no resampling, in either direction.
    expect(decoded.d).toHaveLength(200);
    expect(decoded.z).toHaveLength(200);
    expect(trace.d).toHaveLength(200);

    // `d` is bit-for-bit — stations ride as full-precision scalars and `L = sb − sa`.
    expect(Array.from(decoded.d)).toEqual(Array.from(trace.d));

    for (let i = 0; i < trace.z.length; i++) {
      // The ceiling rule: shared terrain is never *lower* than the original.
      expect(decoded.z[i]).toBeGreaterThanOrEqual(trace.z[i]);
      expect(decoded.z[i] - trace.z[i]).toBeLessThanOrEqual(0.01);
    }
  });

  test.each([1, 2, 3] as const)("trace%i re-encodes to the identical string", (n) => {
    const encoded = encodeP1(readReference(n));
    expect(encodeP1(decodeP1(encoded))).toBe(encoded);
  });

  test("a synthetic span round-trips exactly on both columns", () => {
    const trace = syntheticTrace(1500);
    const decoded = decodeP1(encodeP1(trace));
    expect(Array.from(decoded.d)).toEqual(Array.from(trace.d));
    expect(Array.from(decoded.z)).toEqual(Array.from(trace.z));
  });
});

describe("the ceiling rule is never nearest", () => {
  test("an altitude below the grid is lifted to the next centimetre, never dropped", () => {
    const trace: Trace = {
      d: Float64Array.from([0, 1, 2, 3]),
      z: Float64Array.from([540.401, 540.409, 540.4, -0.001]),
      dev: 0,
      fileName: null,
    };
    const { z } = decodeP1(encodeP1(trace));
    // 540,401 and 540,409 both land on 540,41 — nearest would have given 540,40 to the first.
    expect(Array.from(z)).toEqual([540.41, 540.41, 540.4, 0]);
    for (let i = 0; i < z.length; i++) expect(z[i]).toBeGreaterThanOrEqual(trace.z[i]);
  });

  test("200 rows of sub-centimetre altitude, every one of them safe-side", () => {
    // The real exports write one decimal, so their rows sit *on* the grid and nearest would pass
    // them unharmed. This is the same trace with sub-centimetre relief added: 200 rows where
    // ceiling and nearest genuinely disagree.
    const base = readReference(1);
    const z = Float64Array.from(base.z, (value, i) => value + 0.0017 * (i % 7) + 0.0003 * i);
    const trace: Trace = { ...base, z };
    const decoded = decodeP1(encodeP1(trace));

    for (let i = 0; i < z.length; i++) {
      expect(decoded.z[i]).toBeGreaterThanOrEqual(z[i]);
      expect(decoded.z[i] - z[i]).toBeLessThanOrEqual(0.01);
    }
  });

  test("a value already on the grid is left alone, sign included", () => {
    const trace: Trace = {
      d: Float64Array.from([0, 1]),
      z: Float64Array.from([-12.34, 0.07]),
      dev: null,
      fileName: null,
    };
    expect(Array.from(decodeP1(encodeP1(trace)).z)).toEqual([-12.34, 0.07]);
  });
});

describe("`dev` travels, sentinel included", () => {
  test("a measured deviation survives the link", () => {
    const trace = { ...readReference(1), dev: 0.42 };
    expect(decodeP1(encodeP1(trace)).dev).toBe(0.42);
  });

  test("« rectitude non vérifiable » survives the link as `null`", () => {
    const trace = { ...readReference(1), dev: null };
    expect(decodeP1(encodeP1(trace)).dev).toBeNull();
  });

  test("a perfectly straight trace is not the sentinel", () => {
    const trace = { ...readReference(1), dev: 0 };
    expect(decodeP1(encodeP1(trace)).dev).toBe(0);
  });

  test("the real traces' 7–9 mm deviation arrives as a centimetre, rounded up", () => {
    const trace = readReference(1);
    expect(trace.dev).not.toBeNull();
    expect(decodeP1(encodeP1(trace)).dev).toBe(0.01);
  });
});

/**
 * A payload written **byte by byte**, independently of `encodeP1` — this is what pins the wire
 * format to § 8's one-line grammar rather than to whatever the encoder happens to emit.
 */
function payloadOf(bytes: readonly number[]): string {
  return P1_PREFIX + Buffer.from(bytes).toString("base64url");
}

/**
 * The refusal `validateP1` raises for `raw` — so a case can assert **which** rule fired rather
 * than that something threw. A refusal that fires for the wrong reason stops testing the rule it
 * was written for.
 */
function refusalOf(raw: string): P1Error {
  let thrown: unknown = null;
  try {
    validateP1(raw);
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(P1Error);
  return thrown as P1Error;
}

/**
 * `n = 2`, `d = [0, 1] m`, `z = [540,40; 540,40] m`, `dev` absent — hand-assembled:
 * `<2><zig 0><zig 100 = 200><zig 54040 = 108080><zig 0><dev sentinel 0>`.
 */
const HAND_BUILT = payloadOf([2, 0, 0xc8, 0x01, 0xb0, 0xcc, 0x06, 0, 0]);

describe("the wire format is § 8's grammar, not the encoder's habits", () => {
  test("a hand-assembled payload validates and decodes", () => {
    expect(validateP1(HAND_BUILT)).toBe(HAND_BUILT);
    const decoded = decodeP1(HAND_BUILT);
    expect(Array.from(decoded.d)).toEqual([0, 1]);
    expect(Array.from(decoded.z)).toEqual([540.4, 540.4]);
    expect(decoded.dev).toBeNull();
  });

  test("the encoder emits exactly those bytes back", () => {
    expect(encodeP1(decodeP1(HAND_BUILT))).toBe(HAND_BUILT);
  });
});

describe("`validateP1` is structural only", () => {
  test("a valid payload is returned verbatim", () => {
    const payload = encodeP1(readReference(2));
    expect(validateP1(payload)).toBe(payload);
  });

  /**
   * Ten payload bytes — `n = 2`, `Δz` on two bytes — which base64url writes as fourteen
   * characters, four of them padding bits the last character must leave at zero.
   */
  const TEN_BYTES = payloadOf([2, 0, 0xc8, 0x01, 0xb0, 0xcc, 0x06, 0x80, 0x01, 0]);

  test("the ten-byte payload the padding case is built from is itself valid", () => {
    expect(validateP1(TEN_BYTES)).toBe(TEN_BYTES);
    expect(TEN_BYTES).toHaveLength(P1_PREFIX.length + 14);
    expect(TEN_BYTES.endsWith("A")).toBe(true);
  });

  /**
   * Every refusal asserts the reason it fires for, not merely that something threw: a case that
   * throws for the wrong reason stops testing the rule it was written for.
   */
  const GARBAGE: readonly (readonly [string, string, P1FailureKind, RegExp])[] = [
    ["the empty string", "", "illisible", /sentinel/],
    ["no sentinel", "AAAA", "illisible", /sentinel/],
    ["the sentinel alone", P1_PREFIX, "illisible", /0 base64url/],
    ["a wrong sentinel", "p2.AAAA", "illisible", /sentinel/],
    ["a character outside base64url", "p1.+AAA", "illisible", /outside base64url/],
    ["a base64 length that cannot exist", "p1.AAAAA", "illisible", /5 base64url/],
    ["non-zero padding bits", `${TEN_BYTES.slice(0, -1)}B`, "illisible", /padding bits/],
    ["a truncated varint", payloadOf([0x80]), "illisible", /ended mid-value/],
    [
      "a declared point count larger than the payload",
      payloadOf([0xff, 0x01]),
      "illisible",
      /payload too short/,
    ],
    ["one point, which is not a profile", payloadOf([1, 0, 0, 0]), "illisible", /≥ 2/],
    [
      "trailing bytes — declared `n` against bytes consumed",
      payloadOf([2, 0, 0xc8, 0x01, 0xb0, 0xcc, 0x06, 0, 0, 0]),
      "illisible",
      /trailing bytes/,
    ],
    [
      "a non-canonical varint — one byte string per trace",
      payloadOf([0xc8, 0x81, 0x00]),
      "illisible",
      /non-canonical/,
    ],
  ];

  test.each(GARBAGE)("%s throws", (_label, raw, kind, reason) => {
    const error = refusalOf(raw);
    expect(error.kind).toBe(kind);
    expect(error.message).toMatch(reason);
  });

  test("a truncated payload is a refusal", () => {
    const payload = encodeP1(readReference(1));
    expect(refusalOf(payload.slice(0, 400)).kind).toBe("illisible");
  });

  test("`decodeP1` refuses whatever `validateP1` refuses", () => {
    expect(() => decodeP1("p1.+AAA")).toThrow(P1Error);
    expect(() => decodeP1("nope")).toThrow(P1Error);
  });
});

describe("oversize refuses at « Copier le lien » rather than degrading", () => {
  const OVERSIZE_POINTS = 4812;

  test("a hand-authored 4 812-point trace does not fit a link", () => {
    const payload = encodeP1(denseTrace(OVERSIZE_POINTS));
    expect(payload.length).toBeGreaterThan(URL_BUDGET_CHARS);
    expect(fitsLinkBudget(READABLE_KEYS + payload)).toBe(false);
  });

  test("an oversize `tr` arriving in a link is refused, not truncated", () => {
    // Its own § 7 reason line — « tracé trop volumineux pour cette adresse », not « illisible ».
    expect(refusalOf(encodeP1(denseTrace(OVERSIZE_POINTS))).kind).toBe("hors-budget");
  });

  test("`validateP1Structure` accepts the oversize payload verbatim — the budget is the URL's", () => {
    // § 8 refuses at « Copier le lien » and nowhere else, so `localStorage` must still hold it.
    const payload = encodeP1(denseTrace(OVERSIZE_POINTS));
    expect(payload.length).toBeGreaterThan(URL_BUDGET_CHARS);
    expect(validateP1Structure(payload)).toBe(payload);
  });

  test("`validateP1Structure` still refuses a corrupt payload, oversize or not", () => {
    const payload = encodeP1(denseTrace(OVERSIZE_POINTS));
    expect(() => validateP1Structure(`${payload}AAAA`)).toThrow(P1Error);
    expect(() => validateP1Structure(payload.slice(0, 2400))).toThrow(P1Error);
    expect(() => validateP1Structure("nope")).toThrow(P1Error);
  });

  test("the three real traces and the widest synthetic span all fit", () => {
    expect(fitsLinkBudget(READABLE_KEYS + encodeP1(readReference(1)))).toBe(true);
    expect(fitsLinkBudget(READABLE_KEYS + encodeP1(syntheticTrace(2000)))).toBe(true);
  });
});

describe("`encodeP1` refuses a malformed Trace — a caller bug, not a physics failure", () => {
  test("mismatched columns", () => {
    const trace = {
      d: Float64Array.from([0, 1, 2]),
      z: Float64Array.from([1, 2]),
      dev: null,
    };
    expect(() => encodeP1(trace)).toThrow(RangeError);
  });

  test("fewer than two points", () => {
    const trace = { d: Float64Array.from([0]), z: Float64Array.from([540]), dev: null };
    expect(() => encodeP1(trace)).toThrow(RangeError);
  });

  test("a non-finite sample", () => {
    const trace = {
      d: Float64Array.from([0, 1]),
      z: Float64Array.from([540, Number.NaN]),
      dev: null,
    };
    expect(() => encodeP1(trace)).toThrow(RangeError);
  });

  test("a negative deviation", () => {
    const trace = { d: Float64Array.from([0, 1]), z: Float64Array.from([540, 541]), dev: -1 };
    expect(() => encodeP1(trace)).toThrow(RangeError);
  });
});
