// Charset coverage for the `{msdf}` / `{sdf}` bitmap-font pipes.
//
// `@pixi/msdf-bmfont-xml` does NOT drop a character the face cannot cover: it falls back to glyph 0
// and emits `.notdef` — a box that renders as a plausible glyph and only shows up as a wrong digit in
// a win rollup at review time. So the pack refuses before generating anything. The check reads the
// font's own `cmap` table rather than taking a dependency.

/** Preference order: full-repertoire Unicode subtables first, then BMP-only ones. */
const UNICODE_ENCODINGS = [
  { platform: 3, encoding: 10 },
  { platform: 0, encoding: 6 },
  { platform: 0, encoding: 4 },
  { platform: 3, encoding: 1 },
  { platform: 0, encoding: 3 },
  { platform: 0, encoding: 2 },
  { platform: 0, encoding: 1 },
  { platform: 0, encoding: 0 },
];

type CoverageLookup = (codePoint: number) => boolean;

/**
 * Every character in `charset` the typeface cannot render, in charset order. A character outside the
 * basic plane is always reported: BMFont ids are UTF-16 code units, so it could never be looked up.
 */
export function findUncoveredCharacters(
  ttf: Buffer,
  charset: string,
): string[] {
  const covers = createCoverageLookup(ttf);
  const missing: string[] = [];
  for (const character of charset) {
    if (character.length > 1) {
      missing.push(character);
      continue;
    }
    const codePoint = character.codePointAt(0)!;
    // Control characters are dropped by the generator by design.
    if (codePoint < 0x20) continue;
    if (!covers(codePoint)) missing.push(character);
  }
  return missing;
}

export function createCoverageLookup(ttf: Buffer): CoverageLookup {
  const cmap = findTable(ttf, "cmap");
  if (cmap === undefined) {
    throw new Error(
      '[assetpack] the typeface has no "cmap" table; it cannot map characters.',
    );
  }

  const subtableCount = ttf.readUInt16BE(cmap + 2);
  const offsets = new Map<string, number>();
  for (let index = 0; index < subtableCount; index += 1) {
    const record = cmap + 4 + index * 8;
    const platform = ttf.readUInt16BE(record);
    const encoding = ttf.readUInt16BE(record + 2);
    offsets.set(`${platform}/${encoding}`, cmap + ttf.readUInt32BE(record + 4));
  }

  const chosen = UNICODE_ENCODINGS.map(({ platform, encoding }) =>
    offsets.get(`${platform}/${encoding}`),
  ).find((offset) => offset !== undefined);
  if (chosen === undefined) {
    throw new Error('[assetpack] the typeface has no Unicode "cmap" subtable.');
  }

  const format = ttf.readUInt16BE(chosen);
  switch (format) {
    case 0:
      return (codePoint) =>
        codePoint < 256 && ttf.readUInt8(chosen + 6 + codePoint) !== 0;
    case 4:
      return createFormat4Lookup(ttf, chosen);
    case 6:
      return createFormat6Lookup(ttf, chosen);
    case 12:
      return createFormat12Lookup(ttf, chosen);
    default:
      throw new Error(
        `[assetpack] unsupported "cmap" subtable format ${format}.`,
      );
  }
}

function findTable(ttf: Buffer, tag: string): number | undefined {
  if (ttf.length < 12) {
    throw new Error("[assetpack] the typeface file is truncated.");
  }
  let base = 0;
  if (ttf.subarray(0, 4).toString("latin1") === "ttcf") {
    // A collection: the first font in it is the one the generator would load.
    base = ttf.readUInt32BE(12);
  }
  const numTables = ttf.readUInt16BE(base + 4);
  for (let index = 0; index < numTables; index += 1) {
    const record = base + 12 + index * 16;
    if (ttf.subarray(record, record + 4).toString("latin1") === tag) {
      return ttf.readUInt32BE(record + 8);
    }
  }
  return undefined;
}

function createFormat4Lookup(ttf: Buffer, offset: number): CoverageLookup {
  const segCount = ttf.readUInt16BE(offset + 6) / 2;
  const endCodes = offset + 14;
  const startCodes = endCodes + segCount * 2 + 2;
  const idDeltas = startCodes + segCount * 2;
  const idRangeOffsets = idDeltas + segCount * 2;

  return (codePoint) => {
    if (codePoint > 0xffff) return false;
    for (let segment = 0; segment < segCount; segment += 1) {
      if (ttf.readUInt16BE(endCodes + segment * 2) < codePoint) continue;
      if (ttf.readUInt16BE(startCodes + segment * 2) > codePoint) return false;
      const rangeOffset = ttf.readUInt16BE(idRangeOffsets + segment * 2);
      if (rangeOffset === 0) {
        const delta = ttf.readInt16BE(idDeltas + segment * 2);
        return ((codePoint + delta) & 0xffff) !== 0;
      }
      const start = ttf.readUInt16BE(startCodes + segment * 2);
      const glyphAddress =
        idRangeOffsets + segment * 2 + rangeOffset + (codePoint - start) * 2;
      if (glyphAddress + 2 > ttf.length) return false;
      return ttf.readUInt16BE(glyphAddress) !== 0;
    }
    return false;
  };
}

function createFormat6Lookup(ttf: Buffer, offset: number): CoverageLookup {
  const first = ttf.readUInt16BE(offset + 6);
  const count = ttf.readUInt16BE(offset + 8);
  return (codePoint) => {
    if (codePoint < first || codePoint >= first + count) return false;
    return ttf.readUInt16BE(offset + 10 + (codePoint - first) * 2) !== 0;
  };
}

function createFormat12Lookup(ttf: Buffer, offset: number): CoverageLookup {
  const groupCount = ttf.readUInt32BE(offset + 12);
  return (codePoint) => {
    for (let index = 0; index < groupCount; index += 1) {
      const group = offset + 16 + index * 12;
      const start = ttf.readUInt32BE(group);
      if (codePoint < start) return false;
      if (codePoint > ttf.readUInt32BE(group + 4)) continue;
      return ttf.readUInt32BE(group + 8) + (codePoint - start) !== 0;
    }
    return false;
  };
}
