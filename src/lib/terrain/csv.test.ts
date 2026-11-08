import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import type { ParseFailure, ParseResult } from "./csv.ts";
import type { Trace } from "./trace.ts";

import { maxLateralDeviation, parseFailureMessage, parseProfileCsv, readFailure } from "./csv.ts";
import { maxSpacing, traceExtent } from "./trace.ts";

/**
 * The profile-CSV parser — « v1 build spec » § 4 (*Le contrat de fichier*, *Rectitude*, *Échecs de
 * parsing*) and § 7 (*Les sept échecs d'import*, the message table).
 *
 * The gate is the three **real** traces in `docs/references/`: 183,4 / 224,0 / 188,4 m, 200 rows
 * each. Their figures are the spec's own measured table (§ 4, *Ce que le format est*), not values
 * transcribed from a reference report — and every one of them closed a question: `Distance` is
 * horizontal, the export caps at 200 points whatever the length, and the traces are straight to
 * 7–9 mm because they are *drawn* lines DEM-sampled.
 *
 * The seven failures are table-driven, each asserting its verbatim French copy **and** that a
 * trace already loaded survives untouched — a rejected import that destroyed the current terrain
 * would be data loss.
 */

function readReference(n: 1 | 2 | 3): string {
  return readFileSync(
    new URL(`../../../docs/references/example-profile-trace${n}.csv`, import.meta.url),
    "utf8",
  );
}

function expectOk(result: ParseResult): Trace {
  if (!result.ok) throw new Error(`expected a Trace, got ${parseFailureMessage(result.failure)}`);
  return result.trace;
}

function expectFailure(result: ParseResult): ParseFailure {
  if (result.ok) throw new Error("expected a parse failure, got a Trace");
  return result.failure;
}

/** Build a `;`-delimited file from row strings, header included. */
function file(header: string, rows: readonly string[]): string {
  return `${header}\n${rows.join("\n")}\n`;
}

/** `count` well-formed rows at a 1 m pitch, starting at `Distance = 0`. */
function goodRows(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${i};${(540 - i * 0.1).toFixed(1)}`);
}

describe("the three real traces — the gate", () => {
  const CASES = [
    { n: 1 as const, extent: 183.4, spacing: 1.0, dev: "0.007" },
    { n: 2 as const, extent: 224.0, spacing: 1.2, dev: "0.009" },
    { n: 3 as const, extent: 188.4, spacing: 1.0, dev: "0.009" },
  ];

  test.each(CASES)("trace$n parses to 200 points spanning $extent m", ({ n, extent, spacing }) => {
    const trace = expectOk(parseProfileCsv(readReference(n), `example-profile-trace${n}.csv`));

    expect(trace.d.length).toBe(200);
    expect(trace.z.length).toBe(200);
    expect(trace.d[0]).toBe(0);
    expect(traceExtent(trace)).toBeCloseTo(extent, 10);
    // A fixed 200 points and not a fixed pitch: spacing is `length/199`.
    expect(maxSpacing(trace)).toBeCloseTo(spacing, 10);
    expect(trace.fileName).toBe(`example-profile-trace${n}.csv`);
  });

  test.each(CASES)("trace$n has strictly increasing Distance and no missing Altitude", ({ n }) => {
    const trace = expectOk(parseProfileCsv(readReference(n), "t.csv"));
    for (let i = 1; i < trace.d.length; i++) {
      expect(trace.d[i]).toBeGreaterThan(trace.d[i - 1]);
    }
    for (const z of trace.z) expect(Number.isFinite(z)).toBe(true);
  });

  test.each(CASES)(
    "trace$n is straight to millimetres — drawn lines, DEM-sampled",
    ({ n, dev }) => {
      const trace = expectOk(parseProfileCsv(readReference(n), "t.csv"));
      expect(trace.dev).not.toBeNull();
      expect(trace.dev as number).toBeGreaterThan(0);
      expect(trace.dev as number).toBeLessThan(0.01);
      expect((trace.dev as number).toFixed(3)).toBe(dev);
    },
  );

  test("Distance is read horizontally — the 3-D surface length is never reconstructed", () => {
    // Trace1's own 3-D length along the ground is 263,9 m against a reported 183,4 m: a parser
    // that "corrected" Distance for slope would inflate L by 44 %.
    const trace = expectOk(parseProfileCsv(readReference(1), "t.csv"));
    let surface = 0;
    for (let i = 1; i < trace.d.length; i++) {
      surface += Math.hypot(trace.d[i] - trace.d[i - 1], trace.z[i] - trace.z[i - 1]);
    }
    expect(surface).toBeGreaterThan(1.4 * traceExtent(trace));
    expect(traceExtent(trace)).toBeCloseTo(183.4, 10);
  });
});

describe("the file contract — columns by name, delimiter and decimal mark detected", () => {
  test("the swisstopo header, verbatim", () => {
    const trace = expectOk(parseProfileCsv(readReference(1), "t.csv"));
    expect(trace.d[1]).toBeCloseTo(0.9, 12);
    expect(trace.z[0]).toBeCloseTo(540.4, 12);
  });

  test("a hand-authored lowercase two-column file is a first-class input", () => {
    const trace = expectOk(
      parseProfileCsv(file("distance;altitude", ["0;100", "12,5;98"]), "h.csv"),
    );
    expect(Array.from(trace.d)).toEqual([0, 12.5]);
    expect(Array.from(trace.z)).toEqual([100, 98]);
    // No coordinates: the straightness check cannot run, and that is its own disclosed state.
    expect(trace.dev).toBeNull();
  });

  test("columns are located by name, so the order is free", () => {
    const trace = expectOk(
      parseProfileCsv(file("Altitude;Distance", ["540.4;0", "540.0;1.8"]), "s.csv"),
    );
    expect(Array.from(trace.d)).toEqual([0, 1.8]);
    expect(Array.from(trace.z)).toEqual([540.4, 540]);
  });

  test("an Excel fr-CH round-trip survives — `;` delimiter with `,` decimals", () => {
    const trace = expectOk(
      parseProfileCsv(file("Distance;Altitude", ["0;540,4", "0,9;540,0"]), "x.csv"),
    );
    expect(Array.from(trace.d)).toEqual([0, 0.9]);
    expect(Array.from(trace.z)).toEqual([540.4, 540]);
  });

  test("a `,`-delimited file reads `.` decimals", () => {
    const trace = expectOk(
      parseProfileCsv(file("Distance,Altitude", ["0,540.4", "1.8,540.0"]), "c.csv"),
    );
    expect(Array.from(trace.d)).toEqual([0, 1.8]);
    expect(Array.from(trace.z)).toEqual([540.4, 540]);
  });

  test("a BOM, CRLF endings, quoted cells and blank lines are tolerated", () => {
    const text = '﻿"Distance";"Altitude"\r\n\r\n"0";"540.4"\r\n"1.8";"540.0"\r\n';
    const trace = expectOk(parseProfileCsv(text, "b.csv"));
    expect(Array.from(trace.d)).toEqual([0, 1.8]);
  });

  test("there is no positional fallback — a headerless file is rejected, not guessed", () => {
    const failure = expectFailure(parseProfileCsv(file("0;540.4", ["0.9;540.4"]), "profil-2.csv"));
    expect(failure.kind).toBe("colonnes-manquantes");
  });

  test("extra columns are ignored", () => {
    const trace = expectOk(
      parseProfileCsv(file("Id;Distance;Comment;Altitude", ["7;0;a;100", "8;1;b;99"]), "e.csv"),
    );
    expect(Array.from(trace.d)).toEqual([0, 1]);
    expect(Array.from(trace.z)).toEqual([100, 99]);
  });
});

describe("straightness — one pass over the coordinates, never a rejection", () => {
  test("a chord has zero deviation and a bend reports its own offset", () => {
    expect(maxLateralDeviation([0, 50, 100], [0, 0, 0])).toBeCloseTo(0, 12);
    expect(maxLateralDeviation([0, 50, 100], [0, 10, 0])).toBeCloseTo(10, 12);
    // A(0,0) → C(40,30) is a 50 m chord; B(30,40) sits 14 m off it.
    expect(maxLateralDeviation([0, 30, 40], [0, 40, 30])).toBeCloseTo(14, 12);
  });

  test("a bent polyline is disclosed, not refused", () => {
    const bent = file("Distance;Altitude;Easting;Northing", [
      "0;100;0;0",
      "110;99;110;34",
      "220;98;220;0",
    ]);
    const trace = expectOk(parseProfileCsv(bent, "bent.csv"));
    expect(trace.dev as number).toBeCloseTo(34, 6);
  });

  test("Longitude/Latitude are projected to metres when Easting/Northing are absent", () => {
    // ~0,001° of latitude off a due-east chord is ~111 m — the check must not read it as 0,001.
    const bent = file("Distance;Altitude;Longitude;Latitude", [
      "0;100;6.75;46.88",
      "100;99;6.7513;46.881",
      "200;98;6.7526;46.88",
    ]);
    const trace = expectOk(parseProfileCsv(bent, "ll.csv"));
    expect(trace.dev as number).toBeGreaterThan(100);
    expect(trace.dev as number).toBeLessThan(120);
  });

  test("an unreadable coordinate degrades to « non vérifiable », it does not reject the file", () => {
    const text = file("Distance;Altitude;Easting;Northing", ["0;100;0;0", "10;99;10;n/a"]);
    const trace = expectOk(parseProfileCsv(text, "coord.csv"));
    expect(trace.dev).toBeNull();
    expect(Array.from(trace.d)).toEqual([0, 10]);
  });
});

describe("the seven parse failures", () => {
  /** A trace already loaded, to prove every refusal leaves the current terrain untouched. */
  const loaded = expectOk(parseProfileCsv(readReference(1), "example-profile-trace1.csv"));
  const untouched = { d: Array.from(loaded.d), z: Array.from(loaded.z), dev: loaded.dev };

  const CASES: ReadonlyArray<{
    kind: ParseFailure["kind"];
    text: string;
    message: string;
  }> = [
    {
      kind: "colonnes-manquantes",
      text: file("D;Z", ["0;540.4", "0.9;540.4"]),
      message: "profil-2.csv — colonnes Distance et Altitude introuvables (colonnes lues : D, Z).",
    },
    {
      kind: "aucune-donnée",
      text: "Distance;Altitude\n",
      message: "profil-2.csv — le fichier ne contient aucune ligne de données.",
    },
    {
      kind: "trop-peu-de-points",
      text: file("Distance;Altitude", ["0;540.4"]),
      message: "profil-2.csv — au moins 2 points sont nécessaires.",
    },
    {
      kind: "valeur-non-numérique",
      // Header on line 1, so the 46th data row is line 47.
      text: file("Distance;Altitude", [...goodRows(45), "45;"]),
      message: "profil-2.csv — valeur illisible ligne 47, colonne Altitude.",
    },
    {
      kind: "distance-non-croissante",
      text: file("Distance;Altitude", [...goodRows(110), "108;500.0"]),
      message: "profil-2.csv — la distance décroît à la ligne 112.",
    },
    {
      kind: "distance-dupliquée",
      text: file("Distance;Altitude", [...goodRows(86), "85;500.0"]),
      message: "profil-2.csv — deux altitudes à la même distance, ligne 88.",
    },
  ];

  test.each(CASES)("$kind rejects the whole file with its message", ({ kind, text, message }) => {
    const failure = expectFailure(parseProfileCsv(text, "profil-2.csv"));
    expect(failure.kind).toBe(kind);
    expect(parseFailureMessage(failure)).toBe(message);
  });

  test("lecture-impossible is the caller's read failure, and it carries the same prefix", () => {
    const failure = readFailure("profil-2.csv");
    expect(failure.kind).toBe("lecture-impossible");
    expect(parseFailureMessage(failure)).toBe("profil-2.csv — impossible de lire le fichier.");
  });

  test.each(CASES)("$kind leaves the current terrain untouched", ({ text }) => {
    expectFailure(parseProfileCsv(text, "profil-2.csv"));
    expect(Array.from(loaded.d)).toEqual(untouched.d);
    expect(Array.from(loaded.z)).toEqual(untouched.z);
    expect(loaded.dev).toBe(untouched.dev);
  });

  test("an empty file has no header to read either", () => {
    expect(expectFailure(parseProfileCsv("", "profil-2.csv")).kind).toBe("aucune-donnée");
    expect(expectFailure(parseProfileCsv("\n\n  \n", "profil-2.csv")).kind).toBe("aucune-donnée");
  });

  test("a non-numeric Distance names its own column", () => {
    const failure = expectFailure(
      parseProfileCsv(file("Distance;Altitude", ["0;540.4", "un;540.0"]), "profil-2.csv"),
    );
    expect(parseFailureMessage(failure)).toBe(
      "profil-2.csv — valeur illisible ligne 3, colonne Distance.",
    );
  });

  test("a short row is an unreadable cell, not a silent NaN in the ground", () => {
    const failure = expectFailure(
      parseProfileCsv(file("Distance;Altitude", ["0;540.4", "1.8"]), "profil-2.csv"),
    );
    expect(failure.kind).toBe("valeur-non-numérique");
  });

  test("blank lines do not shift the reported line number", () => {
    const failure = expectFailure(
      parseProfileCsv("Distance;Altitude\n0;540.4\n\n1.8;x\n", "profil-2.csv"),
    );
    expect(parseFailureMessage(failure)).toBe(
      "profil-2.csv — valeur illisible ligne 4, colonne Altitude.",
    );
  });

  test("a sub-20 m trace duplicates Distance at the file's 0,1 m grain", () => {
    // Spacing is `length/199` and Distance is written to 0,1 m, so any trace under ~20 m writes
    // two altitudes at one x — ambiguous ground, far below the 50 m validity floor.
    const rows = Array.from(
      { length: 200 },
      (_, i) => `${((i * 15) / 199).toFixed(1)};${100 - i * 0.01}`,
    );
    const failure = expectFailure(parseProfileCsv(file("Distance;Altitude", rows), "petit.csv"));
    expect(failure.kind).toBe("distance-dupliquée");
  });
});

describe("the two ends' Positions (#90)", () => {
  const VERIFIED = readFileSync(
    new URL("../../../docs/mesures dynamometre/trace-geoadmin-2026-11-08.csv", import.meta.url),
    "utf8",
  );

  test("the verified trace fills A from its first row and B from its last", () => {
    const trace = expectOk(parseProfileCsv(VERIFIED, "trace-geoadmin-2026-11-08.csv"));
    expect(trace.ends).toEqual({
      A: { lat: 46.843556, lon: 6.525035 },
      B: { lat: 46.846166, lon: 6.520783 },
    });
  });

  test("a file without Longitude and Latitude has no ends, and imports without error", () => {
    const trace = expectOk(parseProfileCsv(file("Distance;Altitude", goodRows(3)), "plain.csv"));
    expect(trace.ends).toBeUndefined();
    const oneColumn = file("Distance;Altitude;Longitude", ["0;100;6.5", "10;99;6.6"]);
    expect(expectOk(parseProfileCsv(oneColumn, "lon-only.csv")).ends).toBeUndefined();
  });

  test("a comma decimal mark reads the coordinates too", () => {
    const text = file("Distance;Altitude;Longitude;Latitude", [
      "0;100,5;6,525035;46,843556",
      "10;99,5;6,520783;46,846166",
    ]);
    expect(expectOk(parseProfileCsv(text, "fr.csv")).ends?.B).toEqual({
      lat: 46.846166,
      lon: 6.520783,
    });
  });

  test.each([
    { name: "a text", cell: "n/a" },
    { name: "an infinite value", cell: "1e999" },
    { name: "an empty cell", cell: "" },
  ])(
    "$name in a coordinate of the last row refuses the file with the existing message",
    ({ cell }) => {
      const text = file("Distance;Altitude;Longitude;Latitude", [
        "0;100;6.5;46.8",
        `10;99;${cell};46.9`,
      ]);
      const failure = expectFailure(parseProfileCsv(text, "profil-2.csv"));
      expect(failure.kind).toBe("valeur-non-numérique");
      expect(parseFailureMessage(failure)).toBe(
        "profil-2.csv — valeur illisible ligne 3, colonne Longitude.",
      );
    },
  );

  test("an unreadable latitude on the first row names Latitude and its line", () => {
    const text = file("Distance;Altitude;Longitude;Latitude", ["0;100;6.5;x", "10;99;6.6;46.9"]);
    expect(parseFailureMessage(expectFailure(parseProfileCsv(text, "profil-2.csv")))).toBe(
      "profil-2.csv — valeur illisible ligne 2, colonne Latitude.",
    );
  });

  test("a bad coordinate in the middle of the file is not an end, and still imports", () => {
    const text = file("Distance;Altitude;Longitude;Latitude", [
      "0;100;6.5;46.8",
      "5;99.5;oops;46.85",
      "10;99;6.6;46.9",
    ]);
    const trace = expectOk(parseProfileCsv(text, "mid.csv"));
    expect(trace.ends?.A).toEqual({ lat: 46.8, lon: 6.5 });
    expect(trace.dev).toBeNull();
  });
});
