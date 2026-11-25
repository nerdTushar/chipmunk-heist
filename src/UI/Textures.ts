import { Assets, Texture } from "pixi.js";

/**
 * Texture lookup by alias or spritesheet frame name ("sym_hp1.png" or "sym_hp1").
 * Returns Texture.WHITE-free EMPTY when missing so a missing frame never throws.
 */
export function tex(name: string): Texture {
  const candidates = name.endsWith(".png")
    ? [name, name.slice(0, -4)]
    : [name, `${name}.png`];
  for (const key of candidates) {
    if (Assets.cache.has(key)) {
      const asset = Assets.cache.get(key);
      if (asset instanceof Texture) return asset;
    }
  }
  console.warn(`[tex] missing texture "${name}"`);
  return Texture.EMPTY;
}

export function hasTex(name: string): boolean {
  const candidates = name.endsWith(".png")
    ? [name, name.slice(0, -4)]
    : [name, `${name}.png`];
  return candidates.some(
    (key) => Assets.cache.has(key) && Assets.cache.get(key) instanceof Texture,
  );
}
