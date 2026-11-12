// The bitmap-font pipes. Two authoring paths, one output contract:
//
//   Path A  `font-win{msdf}.ttf` / `font-win{sdf}.ttf` — generated from a typeface, wrapping
//           AssetPack's own `msdfFont()` / `sdfFont()`.
//   Path B  `font-jackpot{bmf}/` — a hand-painted glyph sheet (one .png) plus a `font.json` grid
//           descriptor (see `GlyphSheetDescriptor`).
//
// Both emit a `.fnt` that Pixi 8's `loadBitmapFont` parses, plus the page textures it names. Only the
// `.fnt` takes a manifest alias; the pages are loaded and unloaded by the font loader with its bundle.
// The font pipes must be registered before `texture-packer` (see `.assetpack.js`).

import { rmSync, writeFileSync } from "node:fs";
import {
  checkExt,
  createNewAssetAt,
  findAssets,
  path,
  stripTags,
} from "@assetpack/core";
import type { Asset, AssetPipe } from "@assetpack/core";
import { msdfFont, sdfFont } from "@assetpack/core/webfont";
import type { SDFFontOptions } from "@assetpack/core/webfont";
import {
  buildGlyphSheetFnt,
  quote,
  readPngSize,
  rewriteFntPageFiles,
  setFntFace,
} from "./bitmapFontData.ts";
import { assertFoldersAreUnclaimed } from "./folderClaims.ts";
import { liveChildren } from "./liveChildren.ts";
import { findUncoveredCharacters } from "./ttfCoverage.ts";

/** Western printable ASCII — explicit rather than implied, because coverage is checked against it. */
export const DEFAULT_CHARSET =
  " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";

type SignedFontPipe = ReturnType<typeof msdfFont>;

/** MSDF bitmap font from a `{msdf}`-tagged `.ttf`. Best for large display text that scales. */
export function msdfBitmapFont(
  options: Partial<SDFFontOptions> = {},
): SignedFontPipe {
  return wrapSignedFont(msdfFont(options));
}

/** Single-channel SDF bitmap font from an `{sdf}`-tagged `.ttf`. */
export function sdfBitmapFont(
  options: Partial<SDFFontOptions> = {},
): SignedFontPipe {
  return wrapSignedFont(sdfFont(options));
}

function wrapSignedFont(inner: SignedFontPipe): SignedFontPipe {
  return {
    ...inner,
    defaultOptions: {
      ...inner.defaultOptions,
      font: { charset: DEFAULT_CHARSET, ...inner.defaultOptions.font },
    },

    test(asset) {
      // Wider than upstream's `.ttf`-only test: a tagged `.otf` should fail loudly rather than ship as
      // a plain font file nothing loads.
      return (
        Boolean(asset.allMetaData[inner.tags!.font]) &&
        checkExt(asset.path, ".ttf", ".otf")
      );
    },

    async transform(asset, options, pipeSystem) {
      const family = stripTags(path.trimExt(asset.filename));

      if (checkExt(asset.path, ".otf")) {
        throw new Error(
          `[assetpack] bitmap font "${family}": the SDF generator reads .ttf only. Convert the face ` +
            "first (`@assetpack/core/webfont` exports `otfToTtf`).",
        );
      }

      const charset = options.font?.charset ?? DEFAULT_CHARSET;
      const missing = findUncoveredCharacters(asset.buffer, charset);
      if (missing.length > 0) {
        throw new Error(
          `[assetpack] bitmap font "${family}": the typeface cannot render ` +
            `${missing.map(quote).join(", ")}. The generator would emit .notdef for each, which ` +
            "renders as a plausible wrong glyph — narrow `charset` or pick a face that covers it.",
        );
      }

      // Upstream sets `family` from the tagged filename; set the clean one first so the manifest
      // data and the `.fnt` agree.
      asset.metaData.family = family;

      const produced = await inner.transform!.call(
        inner,
        asset,
        options,
        pipeSystem,
      );

      for (const child of produced) {
        if (child.extension !== ".fnt") continue;
        child.buffer = Buffer.from(
          setFntFace(child.buffer.toString("utf8"), family),
          "utf8",
        );
      }
      return produced;
    },
  };
}

/**
 * Path B — a `{bmf}`-tagged folder holding one glyph sheet and a grid descriptor. The sheet is claimed
 * exclusively: left to the image path it ships twice, and left to `texture-packer` it is trimmed and
 * rotated, after which every glyph rectangle in the `.fnt` describes nothing.
 */
export function glyphSheetFont(
  options: { descriptor?: string } = {},
): AssetPipe<{ descriptor: string }, "bmf" | "nc" | "nomip"> {
  return {
    folder: true,
    name: "glyph-sheet-font",
    defaultOptions: { descriptor: "font.json", ...options },
    tags: { bmf: "bmf", nc: "nc", nomip: "nomip" },

    async start(root) {
      assertFoldersAreUnclaimed(root, this.tags!.bmf, "glyph sheet");
    },

    test(asset) {
      return asset.isFolder && Boolean(asset.metaData[this.tags!.bmf]);
    },

    async transform(asset, transformOptions) {
      // Same reason as the audiosprite pipe: claim the children before the first `await`.
      asset.skipChildren();

      const family = stripTags(asset.filename);
      const files = liveChildren(asset).filter((child) => !child.isFolder);

      const descriptorAsset = files.find(
        (child) => stripTags(child.filename) === transformOptions.descriptor,
      );
      if (descriptorAsset === undefined) {
        throw new Error(
          `[assetpack] glyph sheet "${family}": no "${transformOptions.descriptor}" in the folder. ` +
            "A {bmf} font needs a descriptor giving the charset and the cell grid.",
        );
      }

      const sheets = files.filter((child) => checkExt(child.path, ".png"));
      if (sheets.length !== 1) {
        throw new Error(
          `[assetpack] glyph sheet "${family}": expected exactly one .png page, found ` +
            `${sheets.length}. One folder is one font, and its .fnt names one page.`,
        );
      }
      const [sheet] = sheets;

      const { width, height } = readPngSize(sheet.buffer);
      const pageFile = `${family}.png`;
      const fnt = buildGlyphSheetFnt({
        face: family,
        page: pageFile,
        descriptor: JSON.parse(descriptorAsset.buffer.toString("utf8")),
        sheetWidth: width,
        sheetHeight: height,
      });

      // No alias and no variants: compression would rename the page the `.fnt` names, and Pixi pins
      // glyph pages to resolution 1 so a mipmap would never be picked.
      const page = createNewAssetAt(asset, pageFile);
      page.buffer = sheet.buffer;
      page.metaData[this.tags!.nc] = true;
      page.metaData[this.tags!.nomip] = true;
      page.metaData.mIgnore = true;

      const data = createNewAssetAt(asset, `${family}.fnt`);
      data.buffer = Buffer.from(fnt, "utf8");
      asset.metaData.family = family;

      return [page, data];
    },
  };
}

/**
 * Rewrite the page references inside every generated `.fnt` after `cacheBuster()` renamed the pages.
 * A no-op while `cacheBust` is false; it is what keeps fonts loading the day it is turned on.
 */
export function bitmapFontCacheBuster(): AssetPipe<
  null,
  "msdf" | "sdf" | "bmf"
> {
  const fonts: Asset[] = [];
  return {
    folder: false,
    name: "bitmap-font-cache-buster",
    defaultOptions: null,
    tags: { msdf: "msdf", sdf: "sdf", bmf: "bmf" },

    test(asset) {
      if (!checkExt(asset.path, ".fnt")) return false;
      const meta = asset.allMetaData;
      const tags = this.tags!;
      return Boolean(meta[tags.msdf] || meta[tags.sdf] || meta[tags.bmf]);
    },

    async transform(asset) {
      fonts.push(asset);
      return [asset];
    },

    async finish(root) {
      // Back to front, because rewriting a `.fnt` changes its own hash and therefore its filename.
      for (let index = fonts.length - 1; index >= 0; index -= 1) {
        const data = fonts[index].getFinalTransformedChildren()[0];
        if (data === undefined) continue;

        const originalHash = data.hash;
        const originalPath = data.path;
        const source = data.buffer.toString("utf8");
        const rewritten = rewriteFntPageFiles(source, (file) =>
          resolvePageFilename(root, data, file),
        );
        if (rewritten === source) continue;

        data.buffer = Buffer.from(rewritten, "utf8");
        data.path = data.path.replace(originalHash, data.hash);
        rmSync(originalPath, { force: true });
        writeFileSync(data.path, data.buffer);
      }
      fonts.length = 0;
    },
  };
}

function resolvePageFilename(root: Asset, data: Asset, file: string): string {
  const matches = findAssets(
    (candidate) =>
      candidate.filename === file &&
      candidate.rootTransformAsset.directory ===
        data.rootTransformAsset.directory,
    root,
    true,
  );
  if (matches.length === 0) {
    throw new Error(
      `[assetpack] bitmap font page "${file}" is named by ${data.filename} but no such asset was ` +
        "produced.",
    );
  }
  return matches[0].getFinalTransformedChildren()[0].filename;
}
