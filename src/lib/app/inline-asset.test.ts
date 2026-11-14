import { describe, expect, it } from "vitest";

import { inlineAsset } from "./inline-asset.ts";

describe("inlineAsset", () => {
  it("never inlines a font, whatever its size", () => {
    for (const file of [
      "/node_modules/@fontsource/iosevka-charon/files/iosevka-charon-braille-400-normal.woff2",
      "/node_modules/@fontsource/iosevka-charon/files/iosevka-charon-braille-400-normal.woff",
      "/node_modules/katex/dist/fonts/KaTeX_Size4-Regular.ttf",
      "/fonts/Some.OTF",
    ]) {
      expect({ file, inline: inlineAsset(file) }).toStrictEqual({ file, inline: false });
    }
  });

  it("leaves every other asset to Vite's own rule", () => {
    for (const file of ["/src/logo.svg", "/public/favicon.png", "/src/styles.css", "/a.woff2.js"]) {
      expect({ file, inline: inlineAsset(file) }).toStrictEqual({ file, inline: undefined });
    }
  });
});
