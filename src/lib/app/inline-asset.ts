/**
 * Which assets the build may inline as `data:` URIs — `build.assetsInlineLimit` in `vite.config.ts`
 * (#128).
 *
 * **A font is never inlined.** Vite inlines any file under 4 KiB, and `@fontsource` ships every
 * Iosevka Charon subset behind a `unicode-range`: the Braille and box-drawing faces of all six
 * weights fell under the limit, so 12 faces — woff2 and woff each — rode inside the stylesheet the
 * document waits on, 53,5 kB of its 72 kB gzipped, for glyphs the app never prints. A font in a
 * file of its own is fetched only when a glyph in its range is drawn, which is what `unicode-range`
 * is for. Everything else keeps Vite's default rule.
 */

const FONT = /\.(?:woff2?|ttf|otf|eot)$/i;

/** `false` for a font, `undefined` — Vite's own 4 KiB rule — for anything else. */
export function inlineAsset(file: string): false | undefined {
  return FONT.test(file) ? false : undefined;
}
