import { pixiPipes } from "@assetpack/core/pixi";
// A .ts import: Node runs it via type stripping (.npmrc enables it on Node < 22.18).
import { texturePolicy } from "./scripts/assetpack/texturePolicy.ts";

// raw-assets/ is the source; public/assets/ is generated output (gitignored) — run `npm run assets`.
// Folder tags: {m} = manifest bundle, {tps} = packed spritesheet, {fix} = no @0.5x variant.
export default {
  entry: "./raw-assets",
  output: "./public/assets",
  cache: true,
  // Without this, a failed transform logs and still exits 0.
  strict: true,
  // minimatch skips dotfiles in "dir/**", so "**/.*" is listed separately (.gitkeep, .DS_Store).
  ignore: ["_ignored/**", "mockups/**", "i18n/**", "**/.*"],
  pipes: [
    ...pixiPipes({
      cacheBust: false,
      resolutions: { default: 1, low: 0.5 },
      // compression: { png: { quality: 90 }, jpg: true, webp: { quality: 80, alphaQuality: 80 } },
      manifest: { createShortcuts: true, trimExtensions: true },
    }),
    // Must stay after pixi-manifest: it measures what the finished manifest references.
    // 2048 px is the safe ceiling on mid-tier mobile GPUs; re-export art rather than raise it.
    texturePolicy({ maxPageSize: 3072, maxSingleTexture: 3072, warnSourceOver: 3072 }),
  ],
};