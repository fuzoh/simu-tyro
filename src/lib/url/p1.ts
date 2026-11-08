/**
 * The `p1.` trace payload codec — « v1 build spec » § 8 (*The trace rides in the URL — format
 * `p1.`*, *Oversize refuses at « Copier le lien »*, *Metadata that does not travel*). One format,
 * hand-rolled, **synchronous**, isomorphic, and dependency-free.
 *
 * ```
 * p1.<varint n><zigzag d[0]><zigzag Δd ×(n−1)><zigzag z[0]><zigzag Δz ×(n−1)><varint dev>
 * ```
 *
 * Rules this module exists to keep:
 *
 * - **Synchronous, because `validateSearch` is.** It runs inside `buildLocation`, which rules
 *   `DecompressionStream` out outright — and the alternative, keeping the payload opaque and
 *   decoding it asynchronously downstream, would put terrain behind a boundary the whole app then
 *   has to model, when the engine is synchronous by contract. Deflate also buys little on 200
 *   monotone integers: that shape is what delta coding is *for*.
 * - **The trace is embedded, never omitted.** `L` and `h` are **derived** from the Trace, whose
 *   ends are the two anchors, so a link without terrain does not describe a coarser span — it
 *   describes **no span at all**, and falling back to the straight anchor-base ground line would
 *   fabricate a manual scenario the sender never entered.
 * - **Altitude is quantised by ceiling, never nearest.** That is the assertion that matters most
 *   here: it makes the one lossy step provably **safe-side** — shared terrain is never *lower*
 *   than the original — at a magnitude (≤ 0,010 m) already ruled beneath notice by the ≈5 mm
 *   convexity finding. {@link toCentimetresCeiling} checks the *decoded* value, so the guarantee
 *   is about what the recipient sees rather than about a product of floats.
 * - **No resampling, ever.** Resampling was killed in § 4 for making a coarse import
 *   indistinguishable from a fine one; shrinking the payload by resampling would smuggle it back
 *   in through the side door. `n` points in, `n` points out.
 * - **`dev` travels, sentinel included.** `Easting`/`Northing` would roughly double the payload
 *   and were only ever consumed by a check already performed at send time — but without the
 *   scalar every shared trace would degrade to « rectitude non vérifiable » and the recipient
 *   would lose a disclosure the sender had. Varint `0` **is** that unverifiable state; a measured
 *   deviation rides as `cm + 1`, so a perfectly straight trace is not the sentinel.
 * - **`L` rides on `d`.** The span is the profil's own extent, which is why `d` goes onto the
 *   centimetre grid to the nearest centimetre — a re-read of what the geoportal writes — and only
 *   `z` takes the lossy ceiling.
 * - **{@link validateP1} is structural only, allocates no arrays, and returns the string
 *   verbatim.** Arrays in the validated search would be stringified back into the address bar —
 *   200 points of JSON against a 2000-character budget. It also runs 3× per document request, on
 *   the server, where module state is shared across requests: nothing here is stateful, and
 *   nothing here coerces (returning anything but the incoming string provokes a 307).
 * - **Oversize refuses rather than degrades — at the address, and only there.** A terrain-less
 *   link of an imported scenario is not a weaker link, it is a *different* scenario: the
 *   whole-or-nothing rule applied on the write side ({@link fitsLinkBudget}) and on the read side
 *   (the `hors-budget` refusal). § 8 checks it at « Copier le lien », so an oversize import stays a
 *   legitimate app state everywhere else — which is what {@link validateP1Structure} is for.
 * - **The `p1.` sentinel is not cosmetic.** `defaultParseSearch` JSON-parses every value, so an
 *   all-digit base64url payload would arrive as a **number with its precision destroyed** —
 *   improbable at 900 characters, entirely plausible for a three-point hand-authored CSV. One
 *   character `JSON.parse` throws on, forever.
 * - **The filename does not travel** and neither does the import date: the filename is the only
 *   weakly identifying string in the payload and it reproduces nothing. The receiving side reads
 *   « tracé reçu par lien » — hence {@link TracePayload}, which is a Trace *minus* `fileName`.
 */

/** The sentinel. One character `JSON.parse` throws on, and the format's version marker. */
export const P1_PREFIX = "p1.";

/**
 * The whole-URL budget, characters — what chat clients, mail and QR codes actually impose. The
 * three real traces cost 910 / 859 / 897 and the readable keys ≈150, so the embed decision stands
 * on measurement rather than on hope.
 */
export const URL_BUDGET_CHARS = 2000;

/** Centimetres per metre — the quantisation grid, and the only unit conversion in this file. */
const CM_PER_M = 100;

/** A profile needs two points to be a profile; `csv.ts` refuses one as `trop-peu-de-points`. */
const MIN_POINTS = 2;

/**
 * The widest varint this codec accepts, bytes. Seven groups of seven bits is 49 bits — far past
 * anything a centimetre grid can produce (a 2000 m span is 200 000 cm) and comfortably inside
 * `Number.MAX_SAFE_INTEGER`, so the walk never has to reason about precision loss.
 */
const MAX_VARINT_BYTES = 7;

/** base64url, unpadded — `=` would have to be percent-encoded and buys nothing. */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Reverse alphabet, `-1` for « not base64url ». Frozen at module load, read-only thereafter. */
const SEXTET = buildSextetTable();

function buildSextetTable(): Int8Array {
  const table = new Int8Array(128).fill(-1);
  for (let i = 0; i < ALPHABET.length; i++) table[ALPHABET.charCodeAt(i)] = i;
  return table;
}

/**
 * The two refusal causes § 7's reason-line table distinguishes. They are **two** lines, not one:
 * « tracé illisible » says the string is not a trace, « tracé trop volumineux pour cette adresse »
 * says it is one and cannot be shared — different senders, different fixes.
 */
export type P1FailureKind = "illisible" | "hors-budget";

/** A structural refusal. `kind` selects § 7's reason line; `message` is a developer string. */
export class P1Error extends Error {
  readonly kind: P1FailureKind;

  constructor(kind: P1FailureKind, message: string) {
    super(message);
    this.name = "P1Error";
    this.kind = kind;
  }
}

/**
 * What a link carries of a Trace. Structurally a `Trace` minus `fileName` — a `Trace` is
 * assignable to it, and what comes back out becomes « tracé reçu par lien ».
 */
export type TracePayload = {
  /** `Distance`, m, horizontal, strictly increasing — the file's own samples. */
  readonly d: Float64Array;
  /** `Altitude`, m, one per `d`. */
  readonly z: Float64Array;
  /** Max lateral deviation from the A→B chord, m; `null` = « rectitude non vérifiable ». */
  readonly dev: number | null;
};

/**
 * Does a finished link fit the address budget? Checked at « Copier le lien », which then
 * **refuses rather than degrades** — dropping the trace would share a different scenario.
 *
 * @param href the complete URL as the copy button would put it on the clipboard.
 */
export function fitsLinkBudget(href: string): boolean {
  return href.length <= URL_BUDGET_CHARS;
}

/**
 * Encode a Trace as `p1.<base64url>`.
 *
 * `d` is read onto the centimetre grid to the **nearest** centimetre — the geoportal writes one
 * decimal, so this is a re-read rather than a rounding, and `d` round-trips bit-for-bit. `z` is
 * quantised by **ceiling**, the one lossy step, and it is lossy only upward.
 *
 * Two samples less than a centimetre apart would land on the same grid point, which is why the
 * grid is not also validated as strictly increasing on the way back in: a sub-centimetre pitch is
 * thousands of points over any shareable span, so the budget refuses such a file at « Copier le
 * lien » long before the grid could collapse it. § 8's structural check list is the whole list.
 *
 * @param trace the imported profile, in file coordinates. `fileName` is ignored — it does not
 *   travel.
 * @returns the `tr` value, ready to be written into the query string unescaped.
 * @throws RangeError when the columns disagree, a sample is not finite, there are fewer than two
 *   points, or `dev` is negative. Every one of those is a caller bug: `csv.ts` cannot produce
 *   them, and encoding them would put a corrupt trace in someone's clipboard.
 */
export function encodeP1(trace: TracePayload): string {
  const { d, z, dev } = trace;
  const n = d.length;
  if (z.length !== n) {
    throw new RangeError(`encodeP1: d and z disagree — ${n} against ${z.length}`);
  }
  if (n < MIN_POINTS) throw new RangeError(`encodeP1: a profile needs ≥ ${MIN_POINTS} points`);
  if (dev !== null && !(dev >= 0)) throw new RangeError(`encodeP1: dev must be ≥ 0, got ${dev}`);

  const bytes: number[] = [];
  writeVarint(bytes, n);

  let previous = 0;
  for (let i = 0; i < n; i++) {
    const cm = toCentimetresNearest(d[i], "d", i);
    writeVarint(bytes, zigzag(cm - previous));
    previous = cm;
  }

  previous = 0;
  for (let i = 0; i < n; i++) {
    const cm = toCentimetresCeiling(z[i], "z", i);
    writeVarint(bytes, zigzag(cm - previous));
    previous = cm;
  }

  // `0` is « rectitude non vérifiable »; a measured deviation is `cm + 1`, so 0 cm is not the
  // sentinel. Ceiling here too — an over-reported deviation warns, an under-reported one hides.
  writeVarint(bytes, dev === null ? 0 : toCentimetresCeiling(dev, "dev", 0) + 1);

  return P1_PREFIX + toBase64Url(bytes);
}

/**
 * **Structural** validation, for `validateSearch`: sentinel · base64url alphabet · canonical
 * varint walk · declared `n` against bytes consumed · character budget. **No arrays are
 * allocated** and no trace is materialised — the real decode is a memoised derivation inside the
 * client-only subtree and never enters the validated search object.
 *
 * @param raw the incoming `tr` value.
 * @returns `raw` itself, **verbatim**. Returning anything else — a coerced or normalised string —
 *   makes the server 307-redirect, which is measured, not theoretical.
 * @throws P1Error `hors-budget` when the payload alone exceeds the whole-URL budget,
 *   `illisible` for every other structural failure. Both are full-page refusals: without a trace
 *   there is no span.
 */
export function validateP1(raw: string): string {
  return walkWhole(raw, true);
}

/**
 * The same structural walk **without the address budget** — sentinel · base64url alphabet ·
 * canonical varint walk · declared `n` against bytes consumed, and nothing about length.
 *
 * For the boundaries that are not an address. The 2000 characters are a property of *the URL*, not
 * of the payload: § 8 refuses an oversize trace at « Copier le lien » and nowhere else, so a
 * hand-authored 4 812-point import is a legitimate app state whose `p1.` payload `localStorage`
 * must still be able to store and re-read. Applying the budget there would make an oversize import
 * unreadable on refresh — losing the user their terrain over a rule about sharing.
 *
 * @param raw the payload to check.
 * @returns `raw` itself, verbatim, exactly as {@link validateP1} does.
 * @throws P1Error always `illisible`, **never** `hors-budget`.
 */
export function validateP1Structure(raw: string): string {
  return walkWhole(raw, false);
}

/** The one structural implementation, budget optional — voir {@link validateP1Structure}. */
function walkWhole(raw: string, enforceBudget: boolean): string {
  const walk = openPayload(raw, enforceBudget);
  const n = walk.varint();
  if (n < MIN_POINTS) throw illisible(`declared ${n} points, a profile needs ≥ ${MIN_POINTS}`);
  // Two varints per point, one byte minimum each: a bogus `n` is caught before it is walked.
  if (n * 2 > walk.remaining()) throw illisible(`declared ${n} points, payload too short`);

  for (let i = 0; i < n; i++) walk.varint();
  for (let i = 0; i < n; i++) walk.varint();
  walk.varint();
  walk.end();

  return raw;
}

/**
 * Decode a validated `p1.` payload back to a trace. Validates first — one structural
 * implementation, so nothing can decode that `validateSearch` would have refused.
 *
 * @param raw the `tr` value.
 * @returns the profile in file coordinates. **No `fileName`**: the receiving side reads « tracé
 *   reçu par lien ».
 * @throws P1Error exactly as {@link validateP1} does.
 */
export function decodeP1(raw: string): TracePayload {
  const walk = openPayload(validateP1(raw), true);
  const n = walk.varint();

  const d = new Float64Array(n);
  let cm = 0;
  for (let i = 0; i < n; i++) {
    cm += unzigzag(walk.varint());
    d[i] = cm / CM_PER_M;
  }

  const z = new Float64Array(n);
  cm = 0;
  for (let i = 0; i < n; i++) {
    cm += unzigzag(walk.varint());
    z[i] = cm / CM_PER_M;
  }

  const dev = walk.varint();
  return { d, z, dev: dev === 0 ? null : (dev - 1) / CM_PER_M };
}

/** Zigzag: signed → unsigned, small magnitudes staying small. Plain arithmetic, not `<<`, so a
 * value above 2³¹ cannot wrap silently. */
function zigzag(value: number): number {
  return value < 0 ? -2 * value - 1 : 2 * value;
}

function unzigzag(value: number): number {
  return value % 2 === 0 ? value / 2 : -(value + 1) / 2;
}

/** The centimetre grid, nearest — for `d`, whose file values already sit on it. */
function toCentimetresNearest(value: number, column: string, index: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`encodeP1: ${column}[${index}] is not finite (${value})`);
  }
  return Math.round(value * CM_PER_M);
}

/**
 * The centimetre grid, **ceiling** — the smallest `k` whose *decoded* value `k / 100` is at or
 * above `value`. The two correction loops are what make that a statement about the decoded number
 * rather than about `Math.ceil(value * 100)`, whose product is not exact: `540.4 * 100` is
 * `54040.000000000007`, and a naïve ceiling would lift a value that was already on the grid.
 */
function toCentimetresCeiling(value: number, column: string, index: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`encodeP1: ${column}[${index}] is not finite (${value})`);
  }
  let cm = Math.ceil(value * CM_PER_M);
  while ((cm - 1) / CM_PER_M >= value) cm--;
  while (cm / CM_PER_M < value) cm++;
  return cm;
}

/** Canonical base-128 varint, little-endian groups. Arithmetic, never `&`/`>>`. */
function writeVarint(out: number[], value: number): void {
  let rest = value;
  while (rest > 0x7f) {
    out.push((rest % 128) + 128);
    rest = Math.floor(rest / 128);
  }
  out.push(rest);
}

/** Unpadded base64url. Hand-rolled: `btoa` needs a binary string and `Buffer` is not isomorphic. */
function toBase64Url(bytes: readonly number[]): string {
  let out = "";
  let i = 0;
  for (; i + 3 <= bytes.length; i += 3) {
    const group = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out +=
      ALPHABET[(group >> 18) & 63] +
      ALPHABET[(group >> 12) & 63] +
      ALPHABET[(group >> 6) & 63] +
      ALPHABET[group & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const group = bytes[i] << 4;
    out += ALPHABET[(group >> 6) & 63] + ALPHABET[group & 63];
  } else if (rest === 2) {
    const group = (bytes[i] << 10) | (bytes[i + 1] << 2);
    out += ALPHABET[(group >> 12) & 63] + ALPHABET[(group >> 6) & 63] + ALPHABET[group & 63];
  }
  return out;
}

/** A cursor over a payload's bytes. Every field is a closure over locals — **no module state**,
 * because `validateSearch` runs on the server where module state is shared across requests. */
type PayloadWalk = {
  /** The next canonical varint. */
  readonly varint: () => number;
  /** Bytes not yet consumed. */
  readonly remaining: () => number;
  /** Assert the payload ended exactly here, padding bits included. */
  readonly end: () => void;
};

/**
 * Open a `p1.` payload: sentinel, budget, base64url length and alphabet. The bytes are produced
 * lazily from the string — nothing is allocated but numbers.
 *
 * `enforceBudget` is false for the boundaries that are not an address — voir
 * {@link validateP1Structure}. The sentinel is checked first either way, so a long string that is
 * not a trace reads as « illisible » rather than as « trop volumineux ».
 */
function openPayload(raw: string, enforceBudget: boolean): PayloadWalk {
  if (!raw.startsWith(P1_PREFIX)) throw illisible("missing the `p1.` sentinel");
  if (enforceBudget && raw.length > URL_BUDGET_CHARS) {
    throw new P1Error(
      "hors-budget",
      `p1 payload is ${raw.length} characters, over the ${URL_BUDGET_CHARS} budget`,
    );
  }

  const start = P1_PREFIX.length;
  const chars = raw.length - start;
  // 4k+1 base64 characters decode to no whole extra byte — that length cannot be produced.
  if (chars === 0 || chars % 4 === 1) throw illisible(`${chars} base64url characters`);

  const totalBytes = Math.floor((chars * 3) / 4);
  let cursor = start;
  let accumulator = 0;
  let bits = 0;
  let consumed = 0;

  const nextByte = (): number => {
    if (consumed >= totalBytes) throw illisible("payload ended mid-value");
    while (bits < 8) {
      const code = raw.charCodeAt(cursor++);
      const sextet = code < 128 ? SEXTET[code] : -1;
      if (sextet < 0) throw illisible(`character outside base64url at ${cursor - 1}`);
      accumulator = (accumulator << 6) | sextet;
      bits += 6;
    }
    bits -= 8;
    const byte = (accumulator >> bits) & 0xff;
    accumulator &= (1 << bits) - 1;
    consumed++;
    return byte;
  };

  return {
    varint: () => {
      let value = 0;
      let shift = 1;
      for (let i = 0; i < MAX_VARINT_BYTES; i++) {
        const byte = nextByte();
        value += (byte & 0x7f) * shift;
        if (byte < 0x80) {
          // Canonical only: a trailing zero group is a second spelling of the same number, and two
          // byte strings for one trace would break « two links to the same Scenario are identical ».
          if (i > 0 && byte === 0) throw illisible("non-canonical varint");
          return value;
        }
        shift *= 128;
      }
      throw illisible(`varint longer than ${MAX_VARINT_BYTES} bytes`);
    },
    remaining: () => totalBytes - consumed,
    end: () => {
      if (consumed !== totalBytes) {
        throw illisible(`${totalBytes - consumed} trailing bytes after the declared points`);
      }
      // The 2 or 4 bits base64url leaves over must be zero, or two strings decode alike.
      if (accumulator !== 0) throw illisible("non-zero padding bits");
    },
  };
}

function illisible(reason: string): P1Error {
  return new P1Error("illisible", `p1: ${reason}`);
}
