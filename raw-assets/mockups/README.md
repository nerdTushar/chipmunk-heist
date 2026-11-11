# mockups — Layout-tool reference images

Drop **1920×1080** (landscape) and **1080×1920** (portrait) mockup PNGs here. The editor's Layout tool
(FR-EDIT-24) lists them in its mockup picker and mounts the chosen one behind the editable boxes at the
design-space origin, 1:1, so you can drag a box onto the mark it belongs on instead of onto an empty
outline.

- **Not a runtime asset.** `assetpack.config.js` ignores this folder, so nothing here enters a bundle
  or the manifest, and no gate reads it. The dev server serves the file by URL for the editor alone.
- **Authored in design space** (invariant 7). A 1920×1080 image lines up with a landscape layout
  without any resize math; a portrait layout wants a 1080×1920 image.
- **Committed source.** Unlike `public/assets/`, this folder is versioned — a mockup is a design input,
  the same as the composites under `_ignored/`.

The picker hides itself when this folder is empty, so an editor with no mockups shows no dead control.
