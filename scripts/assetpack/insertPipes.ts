// Ordered pipe insertion for `.assetpack.js`.
//
// `pixiPipes()` returns one flat, order-sensitive array, and where a pipe sits in it decides what it
// can still see. A pipe that claims a folder exclusively must run BEFORE the per-file pipes that would
// also claim its contents; a pipe that patches a generated file must run AFTER the pipe that wrote it.
// So placement is expressed against a named anchor, and a missing anchor is an error rather than a
// silent append: if upstream renames `audio` or `pixi-manifest`, the build stops instead of quietly
// emitting assets twice.

import type { AssetPipe } from "@assetpack/core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPipe = AssetPipe<any, any, any>;
type PipeEntry = AnyPipe | AnyPipe[];

export type PipePlacement =
  | PipeEntry
  | { pipe: PipeEntry; before: string; after?: never }
  | { pipe: PipeEntry; after: string; before?: never };

/**
 * Insert placements into a base pipe list. Placements apply in declaration order, and two placed
 * against the same anchor keep that order, so the result is a pure function of its inputs.
 */
export function insertPipes(
  basePipes: readonly PipeEntry[],
  placements: readonly PipePlacement[] = [],
): PipeEntry[] {
  const pipes = [...basePipes];
  const afterCounts = new Map<string, number>();

  for (const placement of placements) {
    const { pipe, before, after } = normalizePlacement(placement);

    if (before === undefined && after === undefined) {
      pipes.push(pipe);
      continue;
    }

    const anchor = (before ?? after) as string;
    const index = pipes.findIndex(
      (entry) => !Array.isArray(entry) && entry.name === anchor,
    );
    if (index === -1) {
      throw new Error(
        `[assetpack] cannot place pipe "${nameOf(pipe)}": no pipe named "${anchor}" in the pipe ` +
          `list (${pipes.map(nameOf).join(", ")}).`,
      );
    }

    if (before !== undefined) {
      // Splicing at the anchor pushes it right, so successive `before`s stay in declaration order.
      pipes.splice(index, 0, pipe);
    } else {
      const offset = afterCounts.get(anchor) ?? 0;
      pipes.splice(index + 1 + offset, 0, pipe);
      afterCounts.set(anchor, offset + 1);
    }
  }

  return pipes;
}

function normalizePlacement(placement: PipePlacement): {
  pipe: PipeEntry;
  before?: string;
  after?: string;
} {
  if (Array.isArray(placement) || !("pipe" in placement)) {
    return { pipe: placement };
  }
  const { pipe, before, after } = placement;
  if (before !== undefined && after !== undefined) {
    throw new Error(
      `[assetpack] pipe placement for "${nameOf(pipe)}" sets both "before" and "after"; pick one.`,
    );
  }
  return { pipe, before, after };
}

function nameOf(pipe: PipeEntry): string {
  if (Array.isArray(pipe)) return `[${pipe.map(nameOf).join(", ")}]`;
  return typeof pipe.name === "string" ? pipe.name : "<unnamed>";
}
