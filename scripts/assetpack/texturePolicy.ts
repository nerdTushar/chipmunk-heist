// AssetPack pipe that enforces texture size caps and records each texture's size in the manifest.
//
// - Fails the pack on a spritesheet page over `maxPageSize` or a standalone image over
//   `maxSingleTexture`; only warns on a source image over `warnSourceOver`.
// - Stamps `data.textureBudget` (file sizes + estimated GPU bytes) onto each manifest entry.
//
// It must run after `pixi-manifest`: it reads the finished manifest, because a packed page only
// exists in the output (named inside its sheet .json), and a directory walk would also see stale files.

import { readFileSync, writeFileSync } from "node:fs";
import { path } from "@assetpack/core";
import type { Asset, AssetPipe } from "@assetpack/core";
import { MEASURABLE_EXTENSIONS, readImageSize } from "./imageSize.ts";
import type { ImageSize } from "./imageSize.ts";

export interface TexturePolicyOptions {
  /** Largest side, in px, of a packed spritesheet page. */
  maxPageSize?: number;
  /** Largest side, in px, of an image shipped on its own. */
  maxSingleTexture?: number;
  /** Warn (not fail) on a source image whose largest side exceeds this, in px. 0 disables it. */
  warnSourceOver?: number;
  /** Manifest file name inside the output folder, or an explicit path. */
  manifest?: string;
}

export type TextureKind = "page" | "single" | "source";

export interface MeasuredImage extends ImageSize {
  file: string;
  kind: TextureKind;
}

export interface TextureRecord extends ImageSize {
  file: string;
}

interface ManifestEntry {
  alias?: unknown;
  src?: unknown;
  data?: Record<string, unknown>;
}

interface ManifestBundle {
  name?: string;
  assets?: ManifestEntry[];
}

interface Measured {
  images: MeasuredImage[];
  perEntry: Map<ManifestEntry, TextureRecord[]>;
}

/** 2048 is the safe ceiling on mid-tier mobile GPUs. */
export const DEFAULT_TEXTURE_POLICY: Required<TexturePolicyOptions> = {
  maxPageSize: 2048,
  maxSingleTexture: 2048,
  warnSourceOver: 1024,
  manifest: "manifest.json",
};

/** RGBA8: the estimate is `w x h x 4`, never a driver query. */
export const BYTES_PER_TEXEL = 4;

/** `symbols@0.5x.png` -> 0.5. An unsuffixed name is the `@1x` variant. */
export function resolutionOf(file: string): number {
  const match = /@([0-9]+(?:\.[0-9]+)?)x\.[^.]+$/.exec(file);
  return match === null ? 1 : Number.parseFloat(match[1] ?? "1");
}

/** Pure decision over measured images; the pipe below only gathers inputs and reports. */
export function checkTexturePolicy(
  images: readonly MeasuredImage[],
  policy: TexturePolicyOptions = {},
): { failures: string[]; warnings: string[] } {
  const { maxPageSize, maxSingleTexture, warnSourceOver } = {
    ...DEFAULT_TEXTURE_POLICY,
    ...policy,
  };
  const failures: string[] = [];
  const warnings: string[] = [];

  for (const image of images) {
    const largest = Math.max(image.width, image.height);
    const size = `${image.width}x${image.height}`;
    if (image.kind === "source") {
      if (warnSourceOver > 0 && largest > warnSourceOver) {
        warnings.push(
          `${image.file} is ${size}; sources over ${warnSourceOver}px are usually exported too ` +
            "large. This is advice, not a failure.",
        );
      }
      continue;
    }
    const cap = image.kind === "page" ? maxPageSize : maxSingleTexture;
    const setting = image.kind === "page" ? "maxPageSize" : "maxSingleTexture";
    if (largest > cap) {
      failures.push(
        `${image.file} is ${size}, over the ${setting} cap of ${cap}px. Re-export the art smaller, ` +
          `or raise ${setting} in .assetpack.js with a comment saying why.`,
      );
    }
  }

  return { failures, warnings };
}

/**
 * Estimated GPU bytes per resolution. Resolution variants (`@0.5x`) are alternatives, so each gets
 * its own total; format variants (`.webp` beside `.png`) at one resolution count once, at the largest.
 */
export function bytesByResolution(
  textures: readonly TextureRecord[],
): Record<string, number> {
  const perResolution = new Map<number, Map<string, number>>();
  for (const texture of textures) {
    const resolution = resolutionOf(texture.file);
    const stem = path
      .basename(texture.file)
      .replace(/@[0-9]+(?:\.[0-9]+)?x(?=\.[^.]+$)/, "");
    const key = `${path.dirname(texture.file)}/${stem.replace(/\.[^.]+$/, "")}`;
    const bucket = perResolution.get(resolution) ?? new Map<string, number>();
    const bytes = texture.width * texture.height * BYTES_PER_TEXEL;
    bucket.set(key, Math.max(bucket.get(key) ?? 0, bytes));
    perResolution.set(resolution, bucket);
  }

  const out: Record<string, number> = {};
  for (const [resolution, bucket] of [...perResolution].sort(
    (a, b) => a[0] - b[0],
  )) {
    let total = 0;
    for (const bytes of bucket.values()) total += bytes;
    out[String(resolution)] = total;
  }
  return out;
}

export function texturePolicy(
  options: TexturePolicyOptions = {},
): AssetPipe<Required<TexturePolicyOptions>> {
  return {
    folder: false,
    name: "texture-policy",
    defaultOptions: { ...DEFAULT_TEXTURE_POLICY, ...options },

    async finish(root, finishOptions, pipeSystem) {
      const outputPath = pipeSystem.outputPath;
      const manifestPath = resolveManifestPath(
        outputPath,
        finishOptions.manifest,
      );
      const manifest = readJson(manifestPath);

      const measured = measureManifestTextures(outputPath, manifest);
      const sources = measureSourceImages(root, finishOptions.warnSourceOver);

      const { failures, warnings } = checkTexturePolicy(
        [...measured.images, ...sources],
        {
          maxPageSize: finishOptions.maxPageSize,
          maxSingleTexture: finishOptions.maxSingleTexture,
          warnSourceOver: finishOptions.warnSourceOver,
        },
      );

      for (const warning of warnings) {
        console.warn(`[assetpack] texture policy: ${warning}`);
      }
      if (failures.length > 0) {
        throw new Error(
          `[assetpack] texture policy failed:\n  ${failures.join("\n  ")}`,
        );
      }

      stampManifest(manifestPath, manifest, measured);
    },
  };
}

function measureManifestTextures(
  outputPath: string,
  manifest: unknown,
): Measured {
  const sizes = new Map<string, ImageSize | undefined>();
  const kinds = new Map<string, "page" | "single">();
  const perEntry = new Map<ManifestEntry, TextureRecord[]>();

  const measure = (file: string): ImageSize | undefined => {
    if (!sizes.has(file)) {
      let size: ImageSize | undefined;
      try {
        size = readImageSize(readFileSync(path.joinSafe(outputPath, file)));
      } catch {
        size = undefined; // a src the manifest names but the pack did not write
      }
      sizes.set(file, size);
    }
    return sizes.get(file);
  };

  for (const bundle of bundlesOf(manifest)) {
    for (const entry of bundle.assets ?? []) {
      const records: TextureRecord[] = [];
      for (const src of srcsOf(entry)) {
        for (const { file, kind } of texturesOf(outputPath, src)) {
          const size = measure(file);
          if (size === undefined) continue;
          // A file reachable both as a page and standalone is judged by the stricter reading: page.
          if (kind === "page" || !kinds.has(file)) kinds.set(file, kind);
          records.push({ file, width: size.width, height: size.height });
        }
      }
      if (records.length > 0) perEntry.set(entry, records);
    }
  }

  const images: MeasuredImage[] = [];
  for (const [file, size] of sizes) {
    if (size === undefined) continue;
    images.push({ file, ...size, kind: kinds.get(file) ?? "single" });
  }
  images.sort((a, b) => a.file.localeCompare(b.file));
  return { images, perEntry };
}

/** A spritesheet `.json` yields its page, an image yields itself, anything else yields nothing. */
function texturesOf(
  outputPath: string,
  src: string,
): { file: string; kind: "page" | "single" }[] {
  const extension = path.extname(src).toLowerCase();
  if (MEASURABLE_EXTENSIONS.includes(extension))
    return [{ file: src, kind: "single" }];
  if (extension !== ".json") return [];

  const sheet = readJson(path.joinSafe(outputPath, src));
  const image =
    isRecord(sheet) && isRecord(sheet.meta) ? sheet.meta.image : undefined;
  if (typeof image !== "string" || image === "") return [];
  const directory = path.dirname(src);
  return [
    { file: directory === "." ? image : `${directory}/${image}`, kind: "page" },
  ];
}

/** Walks the input tree: an oversized source is a fact about the committed file, not the output. */
function measureSourceImages(
  root: Asset,
  warnSourceOver: number,
): MeasuredImage[] {
  if (!(warnSourceOver > 0)) return [];
  const out: MeasuredImage[] = [];
  const walk = (asset: Asset): void => {
    for (const child of asset.children) {
      if (child.isFolder) {
        walk(child);
        continue;
      }
      if (!MEASURABLE_EXTENSIONS.includes(child.extension.toLowerCase()))
        continue;
      let size: ImageSize | undefined;
      try {
        size = readImageSize(readFileSync(child.path));
      } catch {
        continue; // a source that vanished mid-watch is not a policy violation
      }
      if (size !== undefined)
        out.push({ file: child.path, ...size, kind: "source" });
    }
  };
  walk(root);
  return out;
}

function stampManifest(
  manifestPath: string,
  manifest: unknown,
  measured: Measured,
): void {
  if (measured.perEntry.size === 0) return;
  for (const bundle of bundlesOf(manifest)) {
    for (const entry of bundle.assets ?? []) {
      const textures = measured.perEntry.get(entry);
      if (textures === undefined) continue;
      entry.data = {
        ...entry.data,
        textureBudget: { textures, bytes: bytesByResolution(textures) },
      };
    }
  }
  // Same layout fs-extra's writeJSON(..., { spaces: 2 }) used for the original manifest.
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function resolveManifestPath(
  outputPath: string,
  manifestOption: string | undefined,
): string {
  const option = manifestOption ?? DEFAULT_TEXTURE_POLICY.manifest;
  return path.dirname(option) === "."
    ? path.joinSafe(outputPath, option)
    : option;
}

function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as unknown;
  } catch {
    return undefined; // absent or not JSON: nothing to measure
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function bundlesOf(manifest: unknown): ManifestBundle[] {
  const bundles = isRecord(manifest) ? manifest.bundles : undefined;
  return Array.isArray(bundles) ? (bundles as ManifestBundle[]) : [];
}

function srcsOf(entry: ManifestEntry): string[] {
  const src: unknown[] = Array.isArray(entry.src) ? entry.src : [entry.src];
  return src
    .map((one) => (isRecord(one) ? one.src : one))
    .filter((one): one is string => typeof one === "string");
}
