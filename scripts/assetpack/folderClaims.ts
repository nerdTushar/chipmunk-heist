// Guard against one folder pipe swallowing another's folder.
//
// AssetPack's folder pipes claim their contents with `skipChildren()`, and a skipped asset never runs
// at all — so a `{as}` or `{bmf}` folder nested inside a `{tps}` folder is silently never built, and
// its glyph sheet is quietly packed into the spritesheet instead. The build stays green; the manifest
// just lacks the font. Pipe order cannot fix that, so the tree is refused in `start()`.

import type { Asset } from "@assetpack/core";

/** Folder tags that claim everything beneath them. */
const CLAIMING_TAGS = ["tps", "as", "bmf"];

/** Throw if any folder carrying `tag` sits inside a folder that claims its contents. */
export function assertFoldersAreUnclaimed(
  root: Asset,
  tag: string,
  label: string,
): void {
  for (const folder of findTaggedFolders(root, tag)) {
    for (
      let parent = folder.parent;
      parent !== null && parent !== undefined;
      parent = parent.parent
    ) {
      const owner = parent;
      const claim = CLAIMING_TAGS.find((candidate) => owner.metaData[candidate]);
      if (claim === undefined) continue;
      throw new Error(
        `[assetpack] ${label} "${folder.filename}" is inside "${owner.filename}", which claims ` +
          `everything beneath it with {${claim}}. The inner folder would never be built and its ` +
          "contents would be absorbed by the outer one — move it out.",
      );
    }
  }
}

function findTaggedFolders(
  asset: Asset,
  tag: string,
  out: Asset[] = [],
): Asset[] {
  if (asset.isFolder && asset.metaData[tag]) out.push(asset);
  for (const child of asset.children) findTaggedFolders(child, tag, out);
  return out;
}
