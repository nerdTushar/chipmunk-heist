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
  return manifest;
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
