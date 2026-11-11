// The build-time half of the texture budget gate (NFR-PERF-5, 05 §3 + §10.5).
//
// Two jobs, one pass over the textures the finished manifest references:
//
//   1. ENFORCE dimension caps. A generated spritesheet page over `maxPageSize`, or a standalone image
//      over `maxSingleTexture`, fails the pack and names the file. A source image over
//      `warnSourceOver` only warns — art that packs down legitimately is not a defect.
//   2. RECORD each manifest entry's pixel dimensions into the manifest, under `data.veyraTexture`.
//      That is what the mount-time half reads: `@veyra/devkit`'s `textureBudget` estimates GPU bytes
//      as `w x h x 4` from this metadata rather than querying WebGL, which is the only way the browser
//      Testing Ground and the headless Node runner can report the identical number (05 §10.5).
//
// It runs `after: 'pixi-manifest'` for the same reason `audioSpriteManifest` does — it patches what
// that pipe wrote — and it resolves its files through the MANIFEST rather than through the asset tree
// or a directory walk. Two reasons, and they pull the same way. A cap is about the *generated page*,
// which exists only on disk and is named from inside a spritesheet's `.json`, so the asset tree cannot
// see it. And a bare directory walk would also see the previous run's cache-busted orphans, so a
// rebuild could fail over a file nothing can load — a false red only a clean build clears.
//
// The `warnSourceOver` advisory is the one thing that does read the input tree, which is right: "the
// artist exported at 4x" is a statement about the file they committed.

import { readFileSync, writeFileSync } from 'node:fs';
import { path } from '@assetpack/core';
import { MEASURABLE_EXTENSIONS, readImageSize } from './imageSize.js';

/**
 * Shipped defaults. 2048 is the conservative floor across the mobile GPUs a slot has to run on; a
 * game raises it in its own `pixi.texturePolicy` with a comment saying why.
 *
 * @type {Required<import('./index.js').VeyraTexturePolicyOptions>}
 */
export const DEFAULT_TEXTURE_POLICY = {
  maxPageSize: 2048,
  maxSingleTexture: 2048,
  warnSourceOver: 1024,
  manifest: 'manifest.json',
};

/** Bytes one RGBA8 texel costs on the GPU. The estimate is `w x h x 4` — never a driver query. */
export const BYTES_PER_TEXEL = 4;

/** `symbols@2x.png` -> 2. An unsuffixed name is the `@1x` variant. */
export function resolutionOf(file) {
  const match = /@([0-9]+(?:\.[0-9]+)?)x\.[^.]+$/.exec(file);
  return match === null ? 1 : Number.parseFloat(match[1] ?? '1');
}

/**
 * The pure half: decide what a set of measured images does to a policy.
 *
 * Split out from the pipe so it is unit-testable without a filesystem or an AssetPack run, and so the
 * failure text has exactly one source.
 *
 * @param {readonly { file: string, width: number, height: number, kind: 'page' | 'single' | 'source' }[]} images
 * @param {import('./index.js').VeyraTexturePolicyOptions} [policy]
 * @returns {{ failures: string[], warnings: string[] }}
 */
export function checkTexturePolicy(images, policy = {}) {
  const { maxPageSize, maxSingleTexture, warnSourceOver } = {
    ...DEFAULT_TEXTURE_POLICY,
    ...policy,
  };
  const failures = [];
  const warnings = [];

  for (const image of images) {
    const largest = Math.max(image.width, image.height);
    const size = `${image.width}x${image.height}`;
    if (image.kind === 'source') {
      if (warnSourceOver > 0 && largest > warnSourceOver) {
        warnings.push(
          `${image.file} is ${size}; sources over ${warnSourceOver}px are usually exported too ` +
            'large. This is advice, not a failure — it packs down legitimately or it does not.',
        );
      }
      continue;
    }
    const cap = image.kind === 'page' ? maxPageSize : maxSingleTexture;
    const setting = image.kind === 'page' ? 'maxPageSize' : 'maxSingleTexture';
    if (largest > cap) {
      failures.push(
        `${image.file} is ${size}, over the ${setting} cap of ${cap}px. Re-export the art smaller, ` +
          `or raise ${setting} in this game's texturePolicy with a comment saying why.`,
      );
    }
  }

  return { failures, warnings };
}

/**
 * Group an entry's measured files into bytes per resolution variant.
 *
 * Two axes travel in one `src` list and they are not the same thing. **Resolution** variants
 * (`@1x`/`@2x`) are alternatives of which exactly one is ever loaded, so each gets its own total.
 * **Format** variants (`.webp` beside `.png`) are alternatives at the SAME resolution, so the total
 * for that resolution is the largest of them — the worst case a device could pick.
 *
 * @param {readonly { file: string, width: number, height: number }[]} textures
 * @returns {Record<string, number>} resolution (as a string key) -> estimated GPU bytes
 */
export function bytesByResolution(textures) {
  /** @type {Map<number, Map<string, number>>} */
  const perResolution = new Map();
  for (const texture of textures) {
    const resolution = resolutionOf(texture.file);
    const stem = path.basename(texture.file).replace(/@[0-9]+(?:\.[0-9]+)?x(?=\.[^.]+$)/, '');
    const key = `${path.dirname(texture.file)}/${stem.replace(/\.[^.]+$/, '')}`;
    const bucket = perResolution.get(resolution) ?? new Map();
    const bytes = texture.width * texture.height * BYTES_PER_TEXEL;
    bucket.set(key, Math.max(bucket.get(key) ?? 0, bytes));
    perResolution.set(resolution, bucket);
  }

  /** @type {Record<string, number>} */
  const out = {};
  for (const [resolution, bucket] of [...perResolution].sort((a, b) => a[0] - b[0])) {
    let total = 0;
    for (const bytes of bucket.values()) total += bytes;
    out[String(resolution)] = total;
  }
  return out;
}

/**
 * The `texturePolicy` pipe (05 §3). Registered by `defineAssetpackConfig` unless
 * `pixi.texturePolicy: false`.
 *
 * @param {import('./index.js').VeyraTexturePolicyOptions} [options]
 * @returns {import('@assetpack/core').AssetPipe}
 */
export function texturePolicy(options = {}) {
  return {
    folder: false,
    name: 'texture-policy',
    defaultOptions: { ...DEFAULT_TEXTURE_POLICY, ...options },

    async finish(root, finishOptions, pipeSystem) {
      const outputPath = pipeSystem.outputPath;
      const manifestPath = resolveManifestPath(outputPath, finishOptions.manifest);
      const manifest = readJson(manifestPath);

      // Measure what the MANIFEST references, not everything on disk. A cache-busted rebuild leaves
      // the previous run's renamed files in the output folder, and failing a pack over an orphan
      // nothing can load would be a false red that only a clean build clears.
      const measured = measureManifestTextures(outputPath, manifest);
      const sources = measureSourceImages(root, finishOptions.warnSourceOver);

      const { failures, warnings } = checkTexturePolicy([...measured.images, ...sources], {
        maxPageSize: finishOptions.maxPageSize,
        maxSingleTexture: finishOptions.maxSingleTexture,
        warnSourceOver: finishOptions.warnSourceOver,
      });

      for (const warning of warnings) {
        console.warn(`[assetpack] texture policy: ${warning}`);
      }
      if (failures.length > 0) {
        throw new Error(
          `[assetpack] texture policy failed (NFR-PERF-5):\n  ${failures.join('\n  ')}`,
        );
      }

      stampManifest(manifestPath, manifest, measured);
    },
  };
}

/**
 * Every texture the manifest ships, measured — with each entry's own file list, so the stamp needs no
 * second pass.
 *
 * A spritesheet entry's `src` is the sheet `.json`; the pages it is made of are named inside it under
 * `meta.image` and never get a manifest entry of their own, so this is also the only place a
 * generated page is visible at all.
 *
 * @param {string} outputPath
 * @param {unknown} manifest
 * @returns {{ images: { file: string, width: number, height: number, kind: 'page' | 'single' }[],
 *            perEntry: Map<unknown, import('./index.js').VeyraTextureRecord[]> }}
 */
function measureManifestTextures(outputPath, manifest) {
  /** @type {Map<string, { width: number, height: number } | undefined>} */
  const sizes = new Map();
  /** @type {Map<string, 'page' | 'single'>} */
  const kinds = new Map();
  /** @type {Map<unknown, import('./index.js').VeyraTextureRecord[]> } */
  const perEntry = new Map();

  const measure = (file) => {
    if (!sizes.has(file)) {
      let size;
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
      /** @type {import('./index.js').VeyraTextureRecord[]} */
      const records = [];
      for (const src of srcsOf(entry)) {
        for (const { file, kind } of texturesOf(outputPath, src)) {
          const size = measure(file);
          if (size === undefined) continue;
          // A file reachable both as a page and standalone is judged by the stricter reading: page.
          if (kind === 'page' || !kinds.has(file)) kinds.set(file, kind);
          records.push({ file, width: size.width, height: size.height });
        }
      }
      if (records.length > 0) perEntry.set(entry, records);
    }
  }

  const images = [];
  for (const [file, size] of sizes) {
    if (size === undefined) continue;
    images.push({ file, ...size, kind: kinds.get(file) ?? 'single' });
  }
  images.sort((a, b) => a.file.localeCompare(b.file));
  return { images, perEntry };
}

/**
 * The texture file(s) one manifest `src` resolves to: a spritesheet `.json` yields its pages, an image
 * yields itself, anything else yields nothing.
 *
 * @param {string} outputPath
 * @param {string} src
 * @returns {{ file: string, kind: 'page' | 'single' }[]}
 */
function texturesOf(outputPath, src) {
  const extension = path.extname(src).toLowerCase();
  if (MEASURABLE_EXTENSIONS.includes(extension)) return [{ file: src, kind: 'single' }];
  if (extension !== '.json') return [];

  const sheet = readJson(path.joinSafe(outputPath, src));
  const image = sheet?.meta?.image;
  if (typeof image !== 'string' || image === '') return [];
  const directory = path.dirname(src);
  return [{ file: directory === '.' ? image : `${directory}/${image}`, kind: 'page' }];
}

/**
 * Source images, measured for the `warnSourceOver` advisory only. Walks the input asset tree rather
 * than the output, because "the artist exported at 4x" is a statement about the file they committed.
 *
 * @param {import('@assetpack/core').Asset} root
 * @param {number} warnSourceOver
 * @returns {{ file: string, width: number, height: number, kind: 'source' }[]}
 */
function measureSourceImages(root, warnSourceOver) {
  if (!(warnSourceOver > 0)) return [];
  const out = [];
  /** @param {import('@assetpack/core').Asset} asset */
  const walk = (asset) => {
    for (const child of asset.children) {
      if (child.isFolder) {
        walk(child);
        continue;
      }
      if (!MEASURABLE_EXTENSIONS.includes(child.extension.toLowerCase())) continue;
      let size;
      try {
        size = readImageSize(readFileSync(child.path));
      } catch {
        continue; // a source that vanished mid-watch is not a policy violation
      }
      if (size !== undefined) out.push({ file: child.path, ...size, kind: 'source' });
    }
  };
  walk(root);
  return out;
}

/**
 * Write `data.veyraTexture` onto every manifest entry that ships pixels, in place.
 *
 * @param {string} manifestPath
 * @param {unknown} manifest the object {@link measureManifestTextures} keyed its entries by
 * @param {{ perEntry: Map<unknown, import('./index.js').VeyraTextureRecord[]> }} measured
 */
function stampManifest(manifestPath, manifest, measured) {
  if (measured.perEntry.size === 0) return;
  for (const bundle of bundlesOf(manifest)) {
    for (const entry of bundle.assets ?? []) {
      const textures = measured.perEntry.get(entry);
      if (textures === undefined) continue;
      entry.data = {
        ...entry.data,
        veyraTexture: { textures, bytes: bytesByResolution(textures) },
      };
    }
  }
  // `fs-extra.writeJSON(..., { spaces: 2 })` is what wrote it; match that byte for byte.
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

/**
 * @param {string} outputPath
 * @param {string} manifestOption
 * @returns {string}
 */
function resolveManifestPath(outputPath, manifestOption) {
  const option = manifestOption ?? DEFAULT_TEXTURE_POLICY.manifest;
  return path.dirname(option) === '.' ? path.joinSafe(outputPath, option) : option;
}

/**
 * @param {string} file
 * @returns {any}
 */
function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return undefined; // absent, or not JSON — either way there is nothing here to measure
  }
}

/**
 * @param {unknown} manifest
 * @returns {{ assets?: { src?: unknown, data?: unknown }[] }[]}
 */
function bundlesOf(manifest) {
  const bundles = /** @type {{ bundles?: unknown }} */ (manifest ?? {}).bundles;
  return Array.isArray(bundles) ? bundles : [];
}

/**
 * @param {{ src?: unknown }} entry
 * @returns {string[]}
 */
function srcsOf(entry) {
  const src = Array.isArray(entry.src) ? entry.src : [entry.src];
  return src
    .map((one) => (typeof one === 'string' ? one : one?.src))
    .filter((one) => typeof one === 'string');
}