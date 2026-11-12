export type SpriteCueTuple = [number, number] | [number, number, boolean];

export interface SpriteDefinition {
  sprite: Record<string, SpriteCueTuple>;
}

export class MissingSpriteCuesError extends Error {
  readonly missing: readonly string[];

  constructor(spriteId: string, missing: readonly string[], available: readonly string[]) {
    const lines = missing.map((cue) => {
      const near = nearest(cue, available);
      return near === undefined ? `  "${cue}"` : `  "${cue}" (did you mean "${near}"?)`;
    });
    super(
      `audio sprite "${spriteId}" is missing ${missing.length} cue(s) the game plays:\n` +
        `${lines.join("\n")}\n` +
        "Rename the clip in raw-assets/soundSprite{as}/ or the row in src/audio/cues.ts, then re-run " +
        "`npm run assets` — public/assets/ may simply be stale.",
    );
    this.name = "MissingSpriteCuesError";
    this.missing = missing;
  }
}

export function parseSpriteDefinition(spriteId: string, raw: unknown): SpriteDefinition {
  const sprite = (raw as { sprite?: unknown } | null)?.sprite;
  if (typeof sprite !== "object" || sprite === null) {
    throw new Error(`audio sprite "${spriteId}": the cue map has no "sprite" object.`);
  }
  for (const [cue, tuple] of Object.entries(sprite)) {
    const valid =
      Array.isArray(tuple) &&
      (tuple.length === 2 || tuple.length === 3) &&
      Number.isFinite(tuple[0]) &&
      Number.isFinite(tuple[1]) &&
      tuple[0] >= 0 &&
      tuple[1] > 0;
    if (!valid) {
      throw new Error(`audio sprite "${spriteId}": cue "${cue}" is not [startMs, durationMs, loop?].`);
    }
  }
  return { sprite: sprite as Record<string, SpriteCueTuple> };
}

/**
 * Fail the load when the sprite the browser actually fetched lacks a cue the code names. Without it a
 * renamed clip ships silently: the play call finds nothing and the game is quietly mute there.
 */
export function assertSpriteCues(
  spriteId: string,
  definition: SpriteDefinition,
  expectedCues: readonly string[],
): void {
  const available = Object.keys(definition.sprite);
  const missing = expectedCues.filter((cue) => !(cue in definition.sprite));
  if (missing.length > 0) throw new MissingSpriteCuesError(spriteId, missing, available);
}

function nearest(cue: string, available: readonly string[]): string | undefined {
  let best: string | undefined;
  let bestDistance = Math.max(3, Math.floor(cue.length / 3)) + 1;
  for (const candidate of available) {
    const distance = editDistance(cue, candidate);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, substitution);
    }
    previous = current;
  }
  return previous[b.length];
}
