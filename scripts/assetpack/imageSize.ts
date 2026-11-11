// Pixel dimensions read from an encoded image's header — no image library, no decode.
// Returns `undefined` for bytes it does not recognise, so an unknown format never stops a pack.

export interface ImageSize {
  width: number;
  height: number;
}

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/** Extensions this module can measure. Anything else is skipped by the policy pipe. */
export const MEASURABLE_EXTENSIONS: readonly string[] = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
];

/** `undefined` when the format is unknown or the buffer is truncated before its size field. */
export function readImageSize(buffer: Buffer): ImageSize | undefined {
  if (!Buffer.isBuffer(buffer) || buffer.length < 16) return undefined;
  return (
    readPng(buffer) ?? readGif(buffer) ?? readWebp(buffer) ?? readJpeg(buffer)
  );
}

function readPng(buffer: Buffer): ImageSize | undefined {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE))
    return undefined;
  if (buffer.subarray(12, 16).toString("latin1") !== "IHDR") return undefined;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readGif(buffer: Buffer): ImageSize | undefined {
  const magic = buffer.subarray(0, 6).toString("latin1");
  if (magic !== "GIF87a" && magic !== "GIF89a") return undefined;
  return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
}

// Lossy (`VP8 `), lossless (`VP8L`) and extended (`VP8X`) WebP each store the size differently.
function readWebp(buffer: Buffer): ImageSize | undefined {
  if (
    buffer.length < 30 ||
    buffer.subarray(0, 4).toString("latin1") !== "RIFF" ||
    buffer.subarray(8, 12).toString("latin1") !== "WEBP"
  ) {
    return undefined;
  }
  const chunk = buffer.subarray(12, 16).toString("latin1");
  if (chunk === "VP8X") {
    // 24-bit little-endian, stored as (size - 1).
    const width = 1 + (buffer.readUIntLE(24, 3) & 0xffffff);
    const height = 1 + (buffer.readUIntLE(27, 3) & 0xffffff);
    return { width, height };
  }
  if (chunk === "VP8 ") {
    // 14 bits each, after the 3-byte start code that follows the frame tag.
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8L") {
    // 14 bits each, bit-packed little-endian after the 1-byte signature.
    const bits = buffer.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }
  return undefined;
}

// JPEG keeps its size in whichever SOFn marker the encoder wrote, so walk the marker chain.
function readJpeg(buffer: Buffer): ImageSize | undefined {
  if (buffer.readUInt16BE(0) !== 0xffd8) return undefined;

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1; // fill byte; resynchronise on the next marker prefix
      continue;
    }
    const marker = buffer[offset + 1] ?? 0;
    // Standalone markers (no payload): padding, RSTn, SOI, EOI, TEM.
    if (
      marker === 0xff ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd9)
    ) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    // SOF0..SOF15, minus the DHT/JPG/DAC markers that share the range.
    const isStartOfFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isStartOfFrame) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    if (length < 2) return undefined;
    offset += 2 + length;
  }
  return undefined;
}
