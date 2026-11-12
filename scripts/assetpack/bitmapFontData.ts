// Pure BMFont data helpers for the bitmap-font pipes.
//
// The `.fnt` contract is Pixi 8's: `loadBitmapFont` parses BMFont XML, takes the family from
// `<info face>`, resolves each page from `<page file>` RELATIVE TO THE `.fnt` URL, and reads
// `<distanceField>` for MSDF/SDF. Output is deterministic: glyphs in charset order, kernings in
// (first, second) order, no timestamp, generator version or random id.

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

function escapeXml(value: string): string {
  return value.replace(/[&<>"]/g, (character) => XML_ESCAPES[character]);
}

/** A PNG's pixel dimensions from its IHDR chunk. */
export function readPngSize(buffer: Buffer): { width: number; height: number } {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) {
    throw new Error("[assetpack] glyph sheet is not a PNG.");
  }
  if (buffer.subarray(12, 16).toString("latin1") !== "IHDR") {
    throw new Error("[assetpack] PNG does not start with an IHDR chunk.");
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/**
 * Replace the `face` recorded in a `.fnt`. `@pixi/msdf-bmfont-xml` takes the face from the SOURCE
 * FILE PATH, so `font-win{msdf}.ttf` produces `face="font-win{msdf}"` and Pixi registers that verbatim
 * as the family — the tag would become part of the name the game has to type.
 */
export function setFntFace(fnt: string, face: string): string {
  const pattern = /(<info\b[^>]*\bface=")([^"]*)(")/;
  if (!pattern.test(fnt)) {
    throw new Error(
      '[assetpack] bitmap font data has no <info face="…"> to rename.',
    );
  }
  return fnt.replace(
    pattern,
    (_match, before: string, _face: string, after: string) =>
      before + escapeXml(face) + after,
  );
}

export function readFntPageFiles(fnt: string): string[] {
  return [...fnt.matchAll(/<page\b[^>]*\bfile="([^"]*)"/g)].map(
    (match) => match[1],
  );
}

/**
 * Rewrite every page reference in a `.fnt`. `cacheBuster()` hashes the page PNG names but Pixi reads
 * the page from the `file` attribute INSIDE the `.fnt`, so with `cacheBust: true` the stock output
 * 404s. AssetPack ships a fixer for spritesheets and Spine atlases, none for fonts.
 */
export function rewriteFntPageFiles(
  fnt: string,
  resolve: (file: string) => string,
): string {
  if (readFntPageFiles(fnt).length === 0) {
    throw new Error("[assetpack] bitmap font data references no pages.");
  }
  return fnt.replace(
    /(<page\b[^>]*\bfile=")([^"]*)(")/g,
    (_match, before: string, file: string, after: string) =>
      before + escapeXml(resolve(file)) + after,
  );
}

/**
 * `font.json` beside a hand-painted glyph sheet: a uniform grid, one cell per charset character, read
 * left-to-right, top-to-bottom.
 */
export interface GlyphSheetDescriptor {
  charset: string;
  columns: number;
  rows: number;
  cell: { width: number; height: number };
  /** Top-left of the grid in the sheet, px. Default 0,0. */
  origin?: { x?: number; y?: number };
  /** Default: cell height. */
  size?: number;
  lineHeight?: number;
  base?: number;
  xOffset?: number;
  yOffset?: number;
  /** Per-character advance, px; default cell width. Narrow "1" or "." go here. */
  advances?: Record<string, number>;
  kernings?: { first: string; second: string; amount: number }[];
}

interface NormalizedDescriptor {
  charset: string;
  columns: number;
  rows: number;
  cell: { width: number; height: number };
  origin: { x: number; y: number };
  size: number;
  lineHeight: number;
  base: number;
  xOffset: number;
  yOffset: number;
  advances: Map<string, number>;
  kernings: { first: number; second: number; amount: number }[];
}

/** Validate a glyph-sheet descriptor and turn it into BMFont XML. */
export function buildGlyphSheetFnt(input: {
  face: string;
  page: string;
  descriptor: unknown;
  sheetWidth: number;
  sheetHeight: number;
}): string {
  const { face, page, sheetWidth, sheetHeight } = input;
  const descriptor = normalizeGlyphSheetDescriptor(input.descriptor, face);
  const { charset, columns, rows, cell, origin, size, lineHeight, base } =
    descriptor;

  const characters = [...charset];
  if (characters.length > columns * rows) {
    throw new Error(
      `[assetpack] glyph sheet "${face}": charset has ${characters.length} characters but the ` +
        `grid holds ${columns * rows} (${columns}×${rows}). A shorter charset is fine; a longer ` +
        "one has nowhere to read from.",
    );
  }
  const needWidth = origin.x + columns * cell.width;
  const needHeight = origin.y + rows * cell.height;
  if (needWidth > sheetWidth || needHeight > sheetHeight) {
    throw new Error(
      `[assetpack] glyph sheet "${face}": the grid needs ${needWidth}×${needHeight} px but the ` +
        `sheet is ${sheetWidth}×${sheetHeight}.`,
    );
  }

  const chars = characters.map((character, index) => ({
    id: character.charCodeAt(0),
    char: character,
    x: origin.x + (index % columns) * cell.width,
    y: origin.y + Math.floor(index / columns) * cell.height,
    width: cell.width,
    height: cell.height,
    xoffset: descriptor.xOffset,
    yoffset: descriptor.yOffset,
    xadvance: descriptor.advances.get(character) ?? cell.width,
  }));

  const lines = [
    '<?xml version="1.0"?>',
    "<font>",
    `    <info face="${escapeXml(face)}" size="${size}" bold="0" italic="0" charset="" ` +
      'unicode="1" stretchH="100" smooth="1" aa="1" padding="0,0,0,0" spacing="0,0" outline="0"/>',
    `    <common lineHeight="${lineHeight}" base="${base}" scaleW="${sheetWidth}" ` +
      `scaleH="${sheetHeight}" pages="1" packed="0" alphaChnl="0" redChnl="0" greenChnl="0" ` +
      'blueChnl="0"/>',
    "    <pages>",
    `        <page id="0" file="${escapeXml(page)}"/>`,
    "    </pages>",
    `    <chars count="${chars.length}">`,
    ...chars.map(
      (glyph) =>
        `        <char id="${glyph.id}" char="${escapeXml(glyph.char)}" x="${glyph.x}" ` +
        `y="${glyph.y}" width="${glyph.width}" height="${glyph.height}" ` +
        `xoffset="${glyph.xoffset}" yoffset="${glyph.yoffset}" xadvance="${glyph.xadvance}" ` +
        'page="0" chnl="15"/>',
    ),
    "    </chars>",
    `    <kernings count="${descriptor.kernings.length}">`,
    ...descriptor.kernings.map(
      (kerning) =>
        `        <kerning first="${kerning.first}" second="${kerning.second}" ` +
        `amount="${kerning.amount}"/>`,
    ),
    "    </kernings>",
    "</font>",
    "",
  ];
  return lines.join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeGlyphSheetDescriptor(
  raw: unknown,
  face: string,
): NormalizedDescriptor {
  const fail = (message: string): never => {
    throw new Error(`[assetpack] glyph sheet "${face}": ${message}`);
  };
  if (!isRecord(raw)) return fail("the descriptor must be a JSON object.");

  const charset = raw.charset;
  if (typeof charset !== "string" || charset.length === 0) {
    return fail('"charset" must be a non-empty string.');
  }
  const characters = [...charset];
  const astral = characters.filter((character) => character.length > 1);
  if (astral.length > 0) {
    fail(
      "BMFont ids are UTF-16 code units, so a character outside the basic plane cannot be " +
        `addressed — remove ${astral.map(quote).join(", ")}.`,
    );
  }
  const duplicates = characters.filter(
    (character, index) => characters.indexOf(character) !== index,
  );
  if (duplicates.length > 0) {
    fail(
      `"charset" repeats ${[...new Set(duplicates)].map(quote).join(", ")}; every cell maps to ` +
        "exactly one character.",
    );
  }

  const positive = (value: unknown, field: string): number => {
    if (!Number.isInteger(value) || (value as number) <= 0) {
      fail(`"${field}" must be a positive whole number.`);
    }
    return value as number;
  };
  const whole = (value: unknown, field: string): number => {
    if (!Number.isInteger(value)) fail(`"${field}" must be a whole number.`);
    return value as number;
  };
  const single = (value: unknown, field: string): string => {
    if (
      typeof value !== "string" ||
      [...value].length !== 1 ||
      !characters.includes(value)
    ) {
      fail(`"${field}" must be one character from the charset.`);
    }
    return value as string;
  };

  const columns = positive(raw.columns, "columns");
  const rows = positive(raw.rows, "rows");
  const cellSource = isRecord(raw.cell) ? raw.cell : {};
  const cell = {
    width: positive(cellSource.width, "cell.width"),
    height: positive(cellSource.height, "cell.height"),
  };
  const originSource = isRecord(raw.origin) ? raw.origin : {};
  const origin = {
    x: whole(originSource.x ?? 0, "origin.x"),
    y: whole(originSource.y ?? 0, "origin.y"),
  };

  const advancesSource = raw.advances ?? {};
  if (!isRecord(advancesSource)) fail('"advances" must be an object.');
  const advances = new Map<string, number>();
  for (const [character, advance] of Object.entries(
    advancesSource as Record<string, unknown>,
  )) {
    if (!characters.includes(character)) {
      fail(`"advances" names ${quote(character)}, which is not in the charset.`);
    }
    advances.set(character, whole(advance, `advances[${quote(character)}]`));
  }

  const kerningsSource = raw.kernings ?? [];
  if (!Array.isArray(kerningsSource)) fail('"kernings" must be an array.');
  const kernings = (kerningsSource as unknown[]).map((entry) => {
    const pair = isRecord(entry) ? entry : {};
    return {
      first: single(pair.first, "kernings[].first").charCodeAt(0),
      second: single(pair.second, "kernings[].second").charCodeAt(0),
      amount: whole(pair.amount, "kernings[].amount"),
    };
  });
  // Ordered so the file is a pure function of its inputs, whatever order the pairs were listed in.
  kernings.sort((a, b) => a.first - b.first || a.second - b.second);

  return {
    charset,
    columns,
    rows,
    cell,
    origin,
    size: positive(raw.size ?? cell.height, "size"),
    lineHeight: positive(raw.lineHeight ?? cell.height, "lineHeight"),
    base: positive(raw.base ?? cell.height, "base"),
    xOffset: whole(raw.xOffset ?? 0, "xOffset"),
    yOffset: whole(raw.yOffset ?? 0, "yOffset"),
    advances,
    kernings,
  };
}

export function quote(character: string): string {
  const code = character.codePointAt(0)!.toString(16).toUpperCase();
  return `"${character}" (U+${code.padStart(4, "0")})`;
}
