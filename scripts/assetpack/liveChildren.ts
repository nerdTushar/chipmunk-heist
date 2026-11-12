import type { Asset } from "@assetpack/core";

/**
 * An asset's children that still exist on disk.
 *
 * On a cached run AssetPack re-adds every file it remembers but cannot find as a child with
 * `state: 'deleted'`, so a folder pipe reading `children` raw hands a vanished path to its tool.
 */
export function liveChildren(asset: Asset): Asset[] {
  return asset.children.filter((child) => child.state !== "deleted");
}
