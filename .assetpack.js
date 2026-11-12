import { pixiPipes } from "@assetpack/core/pixi";
// .ts imports: Node runs them via type stripping (.npmrc enables it on Node < 22.18).
import { audioSprite, audioSpriteManifest } from "./scripts/assetpack/audioSprite.ts";
import {
  bitmapFontCacheBuster,
  glyphSheetFont,
  msdfBitmapFont,
  sdfBitmapFont,
} from "./scripts/assetpack/bitmapFont.ts";
import { insertPipes } from "./scripts/assetpack/insertPipes.ts";
import { texturePolicy } from "./scripts/assetpack/texturePolicy.ts";

// raw-assets/ is the source; public/assets/ is generated output (gitignored) — run `npm run assets`.
// Folder tags: {m} = manifest bundle, {tps} = packed spritesheet, {fix} = no @0.5x variant,
// {as} = audiosprite folder, {loop} = looping cue, {msdf}/{sdf} = bitmap font from a .ttf,
// {bmf} = hand-painted glyph-sheet font folder.
export default {
  entry: "./raw-assets",
  output: "./public/assets",
  cache: true,
  // Without this, a failed transform logs and still exits 0.
  strict: true,
  // minimatch skips dotfiles in "dir/**", so "**/.*" is listed separately (.gitkeep, .DS_Store).
  ignore: ["_ignored/**", "mockups/**", "i18n/**", "**/.*"],
  // Each placement names an anchor; a missing anchor throws instead of appending silently.
  pipes: insertPipes(
    pixiPipes({
      cacheBust: false,
      resolutions: { default: 1, low: 0.5 },
      // compression: { png: { quality: 90 }, jpg: true, webp: { quality: 80, alphaQuality: 80 } },
      manifest: { createShortcuts: true, trimExtensions: true },
    }),
    [
      // After `audio`, so the sprite's own encoded .mp3/.ogg are not transcoded a second time.
      { pipe: audioSprite(), after: "audio" },
      // Before `texture-packer`, so glyph pages are never trimmed or rotated out from under the .fnt.
      { pipe: [msdfBitmapFont(), sdfBitmapFont(), glyphSheetFont()], before: "texture-packer" },
      // Before `pixi-manifest`, so the manifest records the .fnt after its page names are rewritten.
      { pipe: bitmapFontCacheBuster(), before: "pixi-manifest" },
      // These two patch or measure the finished manifest, so they run after it is written.
      { pipe: audioSpriteManifest({ output: "manifest.json" }), after: "pixi-manifest" },
      // 2048 px is the safe ceiling on mid-tier mobile GPUs; re-export art rather than raise it.
      {
        pipe: texturePolicy({ maxPageSize: 4096, maxSingleTexture: 4096, warnSourceOver: 4096 }),
        after: "pixi-manifest",
      },
    ],
  ),
};
