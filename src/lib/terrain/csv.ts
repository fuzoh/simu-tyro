/**
 * The profile-CSV parser — « v1 build spec » § 4 (*Le contrat de fichier*, *Rectitude*, *Échecs de
 * parsing*) and § 7 (*Les sept échecs d'import*, whose table is the French copy below). The only
 * terrain file format v1 reads is the Swiss geoportal profile export; **GPX is out of scope** and
 * ticket 01's taxonomy is superseded whole.
 *
 * Rules this module exists to keep:
 *
 * - **Columns by name, case-insensitively, with no positional fallback.** `Distance` and
 *   `Altitude` are required; everything else is ignored except the coordinates the straightness
 *   check consumes. Positional reading would parse an `Altitude;Distance` file « successfully »
 *   into ground that is wrong in a way **no downstream check can catch** — matching by name makes
 *   that class unrepresentable. The price is a headerless file rejected as `colonnes-manquantes`,
 *   which names the columns it *did* read.
 * - **Delimiter (`;` / `,`) and decimal mark (`.` / `,`) are detected from the file.** `;` is the
 *   European-Excel convention, so an Excel round-trip on a fr-CH machine rewrites `540.4` as
 *   `540,4` and a legitimate export must survive it. The same permissiveness makes a
 *   hand-authored two-column CSV a **first-class input** — the only escape hatch that exists for
 *   terrain finer than the geoportal's 200-point cap.
 * - **Any bad row rejects the whole file, with its line number.** A skipped row is a lost terrain
 *   bump, so importing-what-parses manufactures a smoother profile than the data supports — the
 *   same non-conservative move as resampling. The line number is the **physical** file line, so
 *   « ligne 47 » is the line an editor jumps to.
 * - **A rejected file leaves the current terrain untouched.** This module is pure: it takes text
 *   and returns a result, and it can reach no terrain at all. Destroying the loaded trace on a
 *   rejected import would turn a mis-picked file into data loss.
 * - **Valibot validates the row shape; the parser owns the file-level rules.** The row schema's
 *   issue path carries the **row index**, which is what lets « reject the whole file with a line
 *   number » stay the parser's rule. **Valibot's messages never reach the UI** — the seven strings
 *   below are the spec's French copy, keyed off the issue kind and never rendered from it.
 * - **This boundary may coerce.** A CSV cell *is* text and must become a number; the
 *   no-`transform` rule belongs to `validateSearch`, where coercion provoked a 307.
 * - **No resampling, no smoothing, no 3-D correction.** `Distance` is horizontal (183,4 m reported
 *   against a 183,42 m chord and a 263,9 m surface length); the file's own samples are kept and
 *   the measured spacing is disclosed instead (`provenance.ts`).
 */

import * as v from "valibot";

import type { Trace } from "./trace.ts";

/** § 4's seven blocking kinds. There is no eighth, and no non-blocking parse outcome. */
export type ParseFailureKind =
  | "colonnes-manquantes"
  | "aucune-donnée"
  | "trop-peu-de-points"
  | "valeur-non-numérique"
  | "distance-non-croissante"
  | "distance-dupliquée"
  | "lecture-impossible";

/** The two columns a message can name — the two this parser requires. */
export type RequiredColumn = "Distance" | "Altitude";

/**
 * A blocking import failure. Every kind carries the file name because the operator may have
 * picked the wrong file of several, and the row-level kinds carry the physical line number.
 */
export type ParseFailure =
  | {
      readonly kind: "colonnes-manquantes";
      readonly fileName: string;
      readonly columnsRead: readonly string[];
    }
  | { readonly kind: "aucune-donnée"; readonly fileName: string }
  | { readonly kind: "trop-peu-de-points"; readonly fileName: string }
  | {
      readonly kind: "valeur-non-numérique";
      readonly fileName: string;
      readonly line: number;
      readonly column: RequiredColumn;
    }
  | { readonly kind: "distance-non-croissante"; readonly fileName: string; readonly line: number }
  | { readonly kind: "distance-dupliquée"; readonly fileName: string; readonly line: number }
  | { readonly kind: "lecture-impossible"; readonly fileName: string };

/** Parse outcome. A failure carries **no** trace, so the caller has nothing to write. */
export type ParseResult =
  | { readonly ok: true; readonly trace: Trace }
  | { readonly ok: false; readonly failure: ParseFailure };

/** The two decimal marks § 4 contracts for. */
type DecimalMark = "." | ",";

/** The two delimiters § 4 contracts for. `;` is the European-Excel convention. */
type Delimiter = ";" | ",";

/**
 * A numeric cell, per decimal mark. Deliberately strict — a cell that is empty, padded with a
 * stray letter or absent from a short row is `valeur-non-numérique`, never a silent `NaN` in the
 * ground. The exponent form is accepted because a hand-authored file may carry it.
 */
const NUMERIC_CELL: Record<DecimalMark, RegExp> = {
  ".": /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/,
  ",": /^[+-]?(\d+(,\d*)?|,\d+)([eE][+-]?\d+)?$/,
};

/** The message every valibot issue in this module carries. It is a **key**, never UI copy. */
const CELL_ISSUE = "cellule non numérique";

function cellSchema(mark: DecimalMark) {
  return v.pipe(
    v.string(),
    v.check((s: string) => NUMERIC_CELL[mark].test(s), CELL_ISSUE),
    v.transform((s: string) => Number(mark === "," ? s.replace(",", ".") : s)),
    v.check((n: number) => Number.isFinite(n), CELL_ISSUE),
  );
}

/**
 * The row shape, one schema per decimal mark. `v.array` is what puts the **row index** in the
 * issue path — `path[0].key` — and the object key names the culprit column.
 */
const ROWS_SCHEMA: Record<DecimalMark, ReturnType<typeof rowsSchema>> = {
  ".": rowsSchema("."),
  ",": rowsSchema(","),
};

function rowsSchema(mark: DecimalMark) {
  return v.array(v.object({ distance: cellSchema(mark), altitude: cellSchema(mark) }));
}

/**
 * The `lecture-impossible` failure, for the one kind this parser cannot observe: the caller's own
 * file read failed, so there is no text to hand over.
 */
export function readFailure(fileName: string): ParseFailure {
  return { kind: "lecture-impossible", fileName };
}

/**
 * § 7's seven strings, **verbatim**, file-name prefix included. They render inline under the file
 * control in `Paramètres › Géométrie` with `[ Choisir un autre fichier ]`, and **never in the
 * banner slot** — nothing about the current line changed.
 */
export function parseFailureMessage(failure: ParseFailure): string {
  const prefix = `${failure.fileName} — `;
  switch (failure.kind) {
    case "colonnes-manquantes":
      return `${prefix}colonnes Distance et Altitude introuvables (colonnes lues : ${failure.columnsRead.join(
        ", ",
      )}).`;
    case "aucune-donnée":
      return `${prefix}le fichier ne contient aucune ligne de données.`;
    case "trop-peu-de-points":
      return `${prefix}au moins 2 points sont nécessaires.`;
    case "valeur-non-numérique":
      return `${prefix}valeur illisible ligne ${failure.line}, colonne ${failure.column}.`;
    case "distance-non-croissante":
      return `${prefix}la distance décroît à la ligne ${failure.line}.`;
    case "distance-dupliquée":
      return `${prefix}deux altitudes à la même distance, ligne ${failure.line}.`;
    case "lecture-impossible":
      return `${prefix}impossible de lire le fichier.`;
  }
}

/**
 * Max lateral deviation of a polyline from the chord joining its first and last point, m — § 4's
 * straightness metric, **one pass**. It catches the single modelling error the format permits: a
 * **bent polyline**, where `Distance` follows the bend while the zip line is the chord, so `L`
 * comes out too long and the terrain is stretched.
 *
 * @param xs planar easting-like coordinates, m.
 * @param ys planar northing-like coordinates, m, same length as `xs`.
 * @returns the deviation, m. A degenerate chord (first point equal to last) falls back to the
 *   distance from that single point, which is the only meaningful reading left.
 */
export function maxLateralDeviation(xs: readonly number[], ys: readonly number[]): number {
  const last = xs.length - 1;
  if (last < 1) return 0;
  const ax = xs[0];
  const ay = ys[0];
  const bx = xs[last] - ax;
  const by = ys[last] - ay;
  const chord = Math.hypot(bx, by);

  let max = 0;
  for (let i = 1; i < last; i++) {
    const px = xs[i] - ax;
    const py = ys[i] - ay;
    const dev = chord > 0 ? Math.abs(px * by - py * bx) / chord : Math.hypot(px, py);
    if (dev > max) max = dev;
  }
  return max;
}

/** Mean Earth radius, m — only ever used to turn a degree difference into metres. */
const EARTH_RADIUS_M = 6_371_008.8;

/**
 * Parse a profile CSV into an immutable {@link Trace} in **file coordinates**.
 *
 * The checks run in the order a reader would: the header, then the presence of data, then the
 * cells, then `Distance`'s monotonicity. Straightness runs last and never blocks — a slight bend
 * to route around an obstacle is real surveying practice, and it is disclosed rather than
 * refused.
 *
 * @param text the file's decoded text. A UTF-8 BOM, CRLF endings and blank lines are tolerated.
 * @param fileName the name to prefix every failure message with.
 * @returns the Trace, or the first failure encountered. **Never** a partial import.
 */
export function parseProfileCsv(text: string, fileName: string): ParseResult {
  const fail = (failure: ParseFailure): ParseResult => ({ ok: false, failure });

  const lines = text.replace(/^﻿/, "").split(/\r\n|\n|\r/);

  // The header is the first non-blank line; its physical line number anchors every other one.
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== "") {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex === -1) return fail({ kind: "aucune-donnée", fileName });

  const delimiter = detectDelimiter(lines[headerIndex]);
  const header = splitRow(lines[headerIndex], delimiter);
  const columns = indexColumns(header);
  if (columns.distance === -1 || columns.altitude === -1) {
    return fail({ kind: "colonnes-manquantes", fileName, columnsRead: header });
  }

  // Data rows, each with the physical line number a message will name (1-based, header included).
  const cells: string[][] = [];
  const lineNumbers: number[] = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;
    cells.push(splitRow(lines[i], delimiter));
    lineNumbers.push(i + 1);
  }
  if (cells.length === 0) return fail({ kind: "aucune-donnée", fileName });
  if (cells.length === 1) return fail({ kind: "trop-peu-de-points", fileName });

  const mark = detectDecimalMark(cells, columns, delimiter);
  const rows = cells.map((row) => ({
    distance: row[columns.distance] ?? "",
    altitude: row[columns.altitude] ?? "",
  }));

  // `abortEarly` because the file is rejected whole: the *first* bad cell is the whole report, and
  // a 200-row file has no reason to build 200 issues to name one line.
  const parsed = v.safeParse(ROWS_SCHEMA[mark], rows, { abortEarly: true });
  if (!parsed.success) {
    const [issue] = parsed.issues;
    const path = issue.path ?? [];
    const rowIndex = typeof path[0]?.key === "number" ? path[0].key : 0;
    const column: RequiredColumn = path[1]?.key === "altitude" ? "Altitude" : "Distance";
    return fail({
      kind: "valeur-non-numérique",
      fileName,
      line: lineNumbers[rowIndex],
      column,
    });
  }

  const count = parsed.output.length;
  const d = new Float64Array(count);
  const z = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    d[i] = parsed.output[i].distance;
    z[i] = parsed.output[i].altitude;
  }
  for (let i = 1; i < count; i++) {
    if (d[i] === d[i - 1])
      return fail({ kind: "distance-dupliquée", fileName, line: lineNumbers[i] });
    if (d[i] < d[i - 1]) {
      return fail({ kind: "distance-non-croissante", fileName, line: lineNumbers[i] });
    }
  }

  return { ok: true, trace: { d, z, dev: straightness(cells, columns, mark), fileName } };
}

/** The four columns this parser reads. `-1` is « absent ». */
type ColumnIndex = {
  distance: number;
  altitude: number;
  easting: number;
  northing: number;
  longitude: number;
  latitude: number;
};

/**
 * `;` wins on a tie, and on a header carrying neither: it is the geoportal's own delimiter, and a
 * single-column read then lands on `colonnes-manquantes`, which says what it read.
 */
function detectDelimiter(header: string): Delimiter {
  const semicolons = countChar(header, ";");
  const commas = countChar(header, ",");
  return commas > semicolons ? "," : ";";
}

function countChar(s: string, ch: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === ch) n++;
  }
  return n;
}

/** Cells are trimmed and unquoted — an Excel round-trip may quote what it rewrote. */
function splitRow(line: string, delimiter: Delimiter): string[] {
  return line.split(delimiter).map((cell) => {
    const trimmed = cell.trim();
    return trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')
      ? trimmed.slice(1, -1).trim()
      : trimmed;
  });
}

/** By name, case-insensitively — the whole point. Order is free; duplicates take the first. */
function indexColumns(header: readonly string[]): ColumnIndex {
  const found: ColumnIndex = {
    distance: -1,
    altitude: -1,
    easting: -1,
    northing: -1,
    longitude: -1,
    latitude: -1,
  };
  for (let i = 0; i < header.length; i++) {
    const name = header[i].toLowerCase();
    if (Object.hasOwn(found, name) && found[name as keyof ColumnIndex] === -1) {
      found[name as keyof ColumnIndex] = i;
    }
  }
  return found;
}

/**
 * A `,` inside a `;`-delimited file can only be a decimal mark — that is the Excel fr-CH
 * round-trip. A `,`-delimited file cannot carry a `,` decimal mark at all, so `.` is forced.
 */
function detectDecimalMark(
  cells: readonly string[][],
  columns: ColumnIndex,
  delimiter: Delimiter,
): DecimalMark {
  if (delimiter === ",") return ".";
  for (const row of cells) {
    for (const index of [columns.distance, columns.altitude]) {
      if (row[index]?.includes(",")) return ",";
    }
  }
  return ".";
}

/**
 * § 4's straightness pass, run over `Easting`/`Northing` when the file has them and over
 * `Longitude`/`Latitude` otherwise, projected locally about the trace's mean latitude — the
 * deviation is metres over a few hundred metres, where a spherical equirectangular projection is
 * exact to far better than the millimetres being reported.
 *
 * @returns the deviation in m, or `null` for « rectitude non vérifiable » — the coordinates are
 *   absent, or one of them is unreadable. That third state is a warning about the **absence of a
 *   check**, never a claim that the trace is bent, so a bad coordinate degrades to it rather than
 *   rejecting a file whose `Distance`/`Altitude` are sound.
 */
function straightness(
  cells: readonly string[][],
  columns: ColumnIndex,
  mark: DecimalMark,
): number | null {
  const projected =
    columns.easting !== -1 && columns.northing !== -1
      ? readPair(cells, columns.easting, columns.northing, mark)
      : columns.longitude !== -1 && columns.latitude !== -1
        ? readPair(cells, columns.longitude, columns.latitude, mark)
        : null;
  if (projected === null) return null;

  const [us, vs] = projected;
  if (columns.easting !== -1 && columns.northing !== -1) return maxLateralDeviation(us, vs);

  // Degrees → metres about the mean latitude.
  const meanLat = (vs.reduce((sum, lat) => sum + lat, 0) / vs.length) * (Math.PI / 180);
  const perDegLat = (EARTH_RADIUS_M * Math.PI) / 180;
  const perDegLon = perDegLat * Math.cos(meanLat);
  return maxLateralDeviation(
    us.map((lon) => lon * perDegLon),
    vs.map((lat) => lat * perDegLat),
  );
}

/** Both coordinate columns of every row, or `null` if a single cell is unreadable. */
function readPair(
  cells: readonly string[][],
  first: number,
  second: number,
  mark: DecimalMark,
): [number[], number[]] | null {
  const us: number[] = [];
  const vs: number[] = [];
  for (const row of cells) {
    const u = numericCell(row[first], mark);
    const w = numericCell(row[second], mark);
    if (u === null || w === null) return null;
    us.push(u);
    vs.push(w);
  }
  return [us, vs];
}

function numericCell(cell: string | undefined, mark: DecimalMark): number | null {
  if (cell === undefined || !NUMERIC_CELL[mark].test(cell)) return null;
  const value = Number(mark === "," ? cell.replace(",", ".") : cell);
  return Number.isFinite(value) ? value : null;
}
