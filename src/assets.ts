import { Assets, type AssetsManifest } from "pixi.js";

// The only module that talks to Pixi's Assets. Everything else loads bundles by name and reads
// textures by alias (e.g. "bunny" or "preload/bunny") — never by file path.

const BASE_PATH = "assets/";

export async function initAssets(): Promise<AssetsManifest> {
  const response = await fetch(`${BASE_PATH}manifest.json`);
  if (!response.ok) {
    throw new Error(
      `assets/manifest.json not found (${response.status}). Run \`npm run assets\` first.`,
    );
  }
  const manifest = (await response.json()) as AssetsManifest;
  await Assets.init({ manifest, basePath: BASE_PATH });
  loadedManifest = manifest;
  return manifest;
}

let loadedManifest: AssetsManifest | undefined;

/**
 * Every URL the manifest lists for an alias, in manifest order (for audio: the format fallback
 * order). For assets Pixi's `Assets` cannot load itself, such as the audiosprite.
 */
export function resolveSources(alias: string): string[] {
  if (loadedManifest === undefined) {
    throw new Error(`resolveSources("${alias}") called before initAssets().`);
  }
  for (const bundle of loadedManifest.bundles) {
    const assets = Array.isArray(bundle.assets) ? bundle.assets : [];
    for (const asset of assets) {
      const aliases = ([] as string[]).concat(asset.alias ?? []);
      if (!aliases.includes(alias)) continue;
      const sources = ([] as unknown[]).concat(asset.src ?? []);
      return sources
        .map((source) =>
          typeof source === "string"
            ? source
            : (source as { src?: string }).src,
        )
        .filter((source): source is string => typeof source === "string")
        .map((source) => `${BASE_PATH}${source}`);
    }
  }
  throw new Error(
    `no asset aliased "${alias}" in assets/manifest.json. Run \`npm run assets\` and check the alias.`,
  );
}

export function loadBundle(name: string | string[]): Promise<unknown> {
  return Assets.loadBundle(name);
}

export function preloadBundle(name: string | string[]): Promise<void> {
  return Assets.backgroundLoadBundle(name);
}

export function unloadBundle(name: string | string[]): Promise<void> {
  return Assets.unloadBundle(name);
}
