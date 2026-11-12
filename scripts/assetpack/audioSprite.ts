// The audiosprite pipe: a `{as}`-tagged folder becomes one encoded file per format plus a cue map,
// all emitted through the manifest so the runtime addresses both halves by alias.
//
//   raw-assets/soundSprite{as}/sfx-ui-click.ogg, bgm-base{loop}.wav, …
//   → public/assets/soundSprite.mp3 + soundSprite.ogg  (alias "soundSprite")
//   → public/assets/soundSprite.json                   (alias "soundSprite.json")
//
// The clips are claimed EXCLUSIVELY with `skipChildren()` — a clip that also went through the
// per-file `audio()` transcode would ship twice. That claim is not a matter of pipe order (a skipped
// task never enters the pipe list); order decides the fate of the sprite's OWN outputs — see the
// placement comment in `.assetpack.js`.
//
// ffmpeg is `@ffmpeg-installer/ffmpeg`, the prebuilt binary AssetPack's own `audio()` pipe uses, so
// nothing has to be installed on the machine.

import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createNewAssetAt, path, stripTags } from "@assetpack/core";
import type { Asset, AssetPipe } from "@assetpack/core";
import ffmpeg from "@ffmpeg-installer/ffmpeg";
import { buildAudioSpriteLayout } from "./audioSpriteLayout.ts";
import type { AudioSpriteLayout } from "./audioSpriteLayout.ts";
import { assertFoldersAreUnclaimed } from "./folderClaims.ts";
import { liveChildren } from "./liveChildren.ts";

export interface AudioSpriteOutput {
  extension: string;
  codec: string;
  bitrate: string;
  muxer: string;
  args: string[];
}

export interface AudioSpriteOptions {
  /** Clip extensions accepted inside a sprite folder. */
  inputs?: string[];
  /** One encoded sprite per entry; the runtime tries them in manifest order. */
  outputs?: AudioSpriteOutput[];
  /** Hz. */
  sampleRate?: number;
  channels?: number;
  /** Silence before every cue and after the last, in ms. */
  silenceMs?: number;
}

type AudioSpriteTags = "as" | "loop";

/** Clip formats the per-file `audio()` pipe reads. */
const DEFAULT_INPUTS = [".wav", ".mp3", ".ogg"];

/**
 * `+bitexact` is load-bearing: without it ffmpeg stamps a random Ogg serial and an encoder string
 * into every build, so an unchanged sprite would get new bytes (and a new hash) on every run.
 */
const DEFAULT_OUTPUTS: AudioSpriteOutput[] = [
  {
    extension: ".mp3",
    codec: "libmp3lame",
    bitrate: "96k",
    muxer: "mp3",
    args: [],
  },
  {
    extension: ".ogg",
    codec: "libvorbis",
    bitrate: "96k",
    muxer: "ogg",
    args: ["-serial_offset", "0"],
  },
];

const BYTES_PER_SAMPLE = 2; // s16le

interface ClipAsset {
  name: string;
  path: string;
  loop: boolean;
}

interface DecodedPcm {
  name: string;
  loop: boolean;
  sampleCount: number;
  pcm: Buffer;
}

/** `soundSprite{as}/` → `soundSprite.mp3` + `soundSprite.ogg` + `soundSprite.json`. */
export function audioSprite(
  options: AudioSpriteOptions = {},
): AssetPipe<Required<AudioSpriteOptions>, AudioSpriteTags> {
  return {
    folder: true,
    name: "audio-sprite",
    defaultOptions: {
      inputs: DEFAULT_INPUTS,
      outputs: DEFAULT_OUTPUTS,
      sampleRate: 44100,
      channels: 1,
      silenceMs: 250,
      ...options,
    },
    tags: { as: "as", loop: "loop" },

    async start(root) {
      assertFoldersAreUnclaimed(root, this.tags!.as, "audiosprite");
    },

    test(asset) {
      return asset.isFolder && Boolean(asset.metaData[this.tags!.as]);
    },

    async transform(asset, transformOptions) {
      // Before the first `await`: AssetPack starts several asset tasks in one synchronous pass, so the
      // children must be marked skipped in this tick or `audio()` reaches them and every clip ships twice.
      asset.skipChildren();

      const spriteName = stripTags(asset.filename);
      const { sampleRate, channels, silenceMs, inputs, outputs } =
        transformOptions;
      const silenceSamples = Math.round((silenceMs / 1000) * sampleRate);

      const clipAssets = collectClipAssets(asset, inputs, this.tags!.loop);
      if (clipAssets.length === 0) {
        throw new Error(
          `[assetpack] audiosprite "${spriteName}" holds no clips (looked for ${inputs.join(", ")}).`,
        );
      }

      const decoded: DecodedPcm[] = [];
      for (const clip of clipAssets) {
        // Sequential: keeps peak memory at one clip and the log readable.
        const pcm = await decodeToPcm(clip.path, { sampleRate, channels });
        decoded.push({
          name: clip.name,
          loop: clip.loop,
          sampleCount: pcm.length / (BYTES_PER_SAMPLE * channels),
          pcm,
        });
      }

      const layout = buildAudioSpriteLayout(decoded, {
        sampleRate,
        silenceSamples,
      });
      const pcm = concatenatePcm(decoded, layout, channels);

      const assets: Asset[] = [];
      for (const output of outputs) {
        const encoded = createNewAssetAt(
          asset,
          `${spriteName}${output.extension}`,
        );
        mkdirSync(encoded.directory, { recursive: true });
        await encodePcm(pcm, encoded.path, { sampleRate, channels, output });
        encoded.buffer = readFileSync(encoded.path);
        assets.push(encoded);
      }

      // The cue map has its own alias, so it must not join the audio sources the player walks for
      // format fallback: `mIgnore` keeps it out of the folder's manifest entry, and
      // `audioSpriteManifest()` gives it one of its own.
      const cues = createNewAssetAt(asset, `${spriteName}.json`);
      cues.metaData.mIgnore = true;
      cues.buffer = Buffer.from(
        `${JSON.stringify({ sprite: layout.sprite }, null, 2)}\n`,
        "utf8",
      );
      assets.push(cues);

      return assets;
    },
  };
}

/**
 * Give each audiosprite's cue map a manifest alias of its own — `<audio alias>.json`.
 *
 * `pixiManifest` emits one entry per source asset and a `{as}` folder is one source asset, so the cue
 * map and the audio would otherwise share an alias and the player would try to decode JSON as audio.
 * Runs after `pixi-manifest` and patches what it wrote.
 */
export function audioSpriteManifest(
  options: { output?: string } = {},
): AssetPipe<{ output: string }, "as"> {
  return {
    folder: false,
    name: "audio-sprite-manifest",
    defaultOptions: { output: "manifest.json", ...options },
    tags: { as: "as" },

    async finish(root, finishOptions, pipeSystem) {
      const sprites = findSpriteFolders(root, this.tags!.as);
      if (sprites.length === 0) return;

      const manifestPath =
        path.dirname(finishOptions.output) === "."
          ? path.joinSafe(pipeSystem.outputPath, finishOptions.output)
          : finishOptions.output;
      const manifest = JSON.parse(
        readFileSync(manifestPath, "utf8"),
      ) as Manifest;

      for (const sprite of sprites) {
        const cueSource = finalSourceOf(sprite, pipeSystem.outputPath, {
          extension: ".json",
        });
        const audioSource = finalSourceOf(sprite, pipeSystem.outputPath, {
          exclude: ".json",
        });
        if (cueSource === undefined || audioSource === undefined) continue;

        const found = findManifestEntry(manifest, audioSource);
        if (found === undefined) continue;

        const aliases = aliasesOf(found.entry).map((alias) => `${alias}.json`);
        found.assets.splice(found.index + 1, 0, {
          alias: aliases,
          src: [cueSource],
        });
      }

      // Same layout fs-extra's writeJSON(..., { spaces: 2 }) used for the original manifest.
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    },
  };
}

/** Depth-first; each cue is named by its path inside the folder, tags and extension stripped. */
function collectClipAssets(
  folder: Asset,
  inputs: readonly string[],
  loopTag: string,
): ClipAsset[] {
  const clips: ClipAsset[] = [];
  const walk = (asset: Asset): void => {
    for (const child of liveChildren(asset)) {
      if (child.isFolder) {
        walk(child);
        continue;
      }
      if (!inputs.includes(child.extension.toLowerCase())) continue;
      const relative = path.relative(folder.path, child.path);
      clips.push({
        name: stripTags(relative).replace(/\.[^./]+$/, ""),
        path: child.path,
        loop: Boolean(child.allMetaData[loopTag]),
      });
    }
  };
  walk(folder);
  return clips;
}

function concatenatePcm(
  decoded: readonly DecodedPcm[],
  layout: AudioSpriteLayout,
  channels: number,
): Buffer {
  const frame = BYTES_PER_SAMPLE * channels;
  const pcm = Buffer.alloc(layout.totalSamples * frame); // zeroed = silence
  const byName = new Map(decoded.map((clip) => [clip.name, clip.pcm]));
  for (const segment of layout.segments) {
    byName.get(segment.name)!.copy(pcm, segment.offsetSamples * frame);
  }
  return pcm;
}

function decodeToPcm(
  input: string,
  options: { sampleRate: number; channels: number },
): Promise<Buffer> {
  return runFfmpeg([
    "-hide_banner",
    "-nostdin",
    "-loglevel",
    "error",
    "-i",
    input,
    "-vn",
    "-map",
    "0:a:0",
    "-ac",
    String(options.channels),
    "-ar",
    String(options.sampleRate),
    "-f",
    "s16le",
    "-acodec",
    "pcm_s16le",
    "-",
  ]);
}

async function encodePcm(
  pcm: Buffer,
  output: string,
  options: { sampleRate: number; channels: number; output: AudioSpriteOutput },
): Promise<void> {
  const { codec, bitrate, muxer, args = [] } = options.output;
  await runFfmpeg(
    [
      "-hide_banner",
      "-nostdin",
      "-loglevel",
      "error",
      "-f",
      "s16le",
      "-ar",
      String(options.sampleRate),
      "-ac",
      String(options.channels),
      "-i",
      "pipe:0",
      "-vn",
      "-map_metadata",
      "-1",
      "-c:a",
      codec,
      "-b:a",
      bitrate,
      "-fflags",
      "+bitexact",
      "-flags:a",
      "+bitexact",
      ...args,
      "-f",
      muxer,
      "-y",
      output,
    ],
    pcm,
  );
}

function runFfmpeg(args: readonly string[], input?: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg.path, args, { stdio: ["pipe", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout));
        return;
      }
      reject(
        new Error(
          `[assetpack] ffmpeg exited ${code}: ${Buffer.concat(stderr).toString("utf8").trim()}`,
        ),
      );
    });
    // The close handler already reports why ffmpeg stopped reading.
    child.stdin.on("error", () => {});
    child.stdin.end(input);
  });
}

function findSpriteFolders(
  asset: Asset,
  tag: string,
  out: Asset[] = [],
): Asset[] {
  if (
    asset.isFolder &&
    asset.metaData[tag] &&
    asset.transformChildren.length > 0
  )
    out.push(asset);
  for (const child of asset.children) findSpriteFolders(child, tag, out);
  return out;
}

/** Path of one of a sprite folder's outputs, relative to the output folder. */
function finalSourceOf(
  folder: Asset,
  outputPath: string,
  pick: { extension?: string; exclude?: string },
): string | undefined {
  const child = folder.transformChildren.find((candidate) =>
    pick.extension === undefined
      ? candidate.extension !== pick.exclude
      : candidate.extension === pick.extension,
  );
  if (child === undefined) return undefined;
  const final = child.getFinalTransformedChildren()[0];
  return final === undefined ? undefined : path.relative(outputPath, final.path);
}

interface ManifestAsset {
  alias: string | string[];
  src: string | string[] | { src: string }[];
}

interface Manifest {
  bundles: { assets: ManifestAsset[] }[];
}

function findManifestEntry(
  manifest: Manifest,
  source: string,
):
  | { assets: ManifestAsset[]; index: number; entry: ManifestAsset }
  | undefined {
  for (const bundle of manifest.bundles) {
    const index = bundle.assets.findIndex((entry) =>
      (Array.isArray(entry.src) ? entry.src : [entry.src]).some(
        (src) => (typeof src === "string" ? src : src.src) === source,
      ),
    );
    if (index !== -1) {
      return { assets: bundle.assets, index, entry: bundle.assets[index] };
    }
  }
  return undefined;
}

function aliasesOf(entry: ManifestAsset): string[] {
  return Array.isArray(entry.alias) ? entry.alias : [entry.alias];
}
