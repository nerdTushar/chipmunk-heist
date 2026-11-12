// Pure cue layout for the audiosprite pipe.
//
// Cue offsets are computed from decoded SAMPLE COUNTS, not container timestamps, so the map is exact
// and a pure function of (clip PCM lengths, silence padding, sample rate) — no probe, no encoder
// metadata, no filesystem order. The emitted shape is the howler2 one the runtime player parses:
// `{ sprite: { <cue>: [startMs, durationMs, loop?] } }`.

export interface DecodedClip {
  name: string;
  sampleCount: number;
  loop?: boolean;
}

export interface AudioSpriteSegment {
  name: string;
  offsetSamples: number;
  sampleCount: number;
  loop: boolean;
}

export type SpriteCueTuple = [number, number] | [number, number, true];

export interface AudioSpriteLayout {
  segments: AudioSpriteSegment[];
  totalSamples: number;
  sprite: Record<string, SpriteCueTuple>;
}

/** Kebab-case, optionally path-segmented for a nested clip folder. */
const CUE_NAME =
  /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

/** Milliseconds for a sample count, rounded to microseconds so the JSON is short and stable. */
export function millisecondsFromSamples(
  samples: number,
  sampleRate: number,
): number {
  return Math.round((samples / sampleRate) * 1e6) / 1e3;
}

/** By UTF-16 code unit — never by locale or by filesystem enumeration order. */
export function compareCueNames(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * Lay decoded clips out into one sprite. Padding goes before every cue and after the last, so the
 * first cue is protected from a codec's encoder delay by the same gap that keeps neighbours apart.
 */
export function buildAudioSpriteLayout(
  clips: readonly DecodedClip[],
  options: { sampleRate: number; silenceSamples: number },
): AudioSpriteLayout {
  const { sampleRate, silenceSamples } = options;

  if (!Number.isInteger(sampleRate) || sampleRate <= 0) {
    throw new Error(
      "[assetpack] audiosprite sampleRate must be a positive integer.",
    );
  }
  if (!Number.isInteger(silenceSamples) || silenceSamples < 0) {
    throw new Error(
      "[assetpack] audiosprite silence padding must be a whole sample count.",
    );
  }
  if (clips.length === 0) {
    throw new Error("[assetpack] audiosprite contains no clips.");
  }

  const ordered = [...clips].sort((a, b) => compareCueNames(a.name, b.name));

  const seen = new Set<string>();
  for (const clip of ordered) {
    if (!CUE_NAME.test(clip.name)) {
      throw new Error(
        `[assetpack] audiosprite cue "${clip.name}" is not kebab-case. A cue name is the clip ` +
          "filename without its extension and tags, so rename the file.",
      );
    }
    if (seen.has(clip.name)) {
      throw new Error(
        `[assetpack] audiosprite cue "${clip.name}" is declared twice; two clips in one sprite ` +
          "folder cannot share a name (bgm-base.wav and bgm-base.ogg collide).",
      );
    }
    seen.add(clip.name);
    if (!Number.isInteger(clip.sampleCount) || clip.sampleCount <= 0) {
      throw new Error(
        `[assetpack] audiosprite cue "${clip.name}" decoded to no audio; an empty clip has no ` +
          "playable duration.",
      );
    }
  }

  const segments: AudioSpriteSegment[] = [];
  const sprite: Record<string, SpriteCueTuple> = {};
  let cursor = silenceSamples;

  for (const clip of ordered) {
    const loop = clip.loop === true;
    segments.push({
      name: clip.name,
      offsetSamples: cursor,
      sampleCount: clip.sampleCount,
      loop,
    });
    const start = millisecondsFromSamples(cursor, sampleRate);
    const duration = millisecondsFromSamples(clip.sampleCount, sampleRate);
    sprite[clip.name] = loop ? [start, duration, true] : [start, duration];
    cursor += clip.sampleCount + silenceSamples;
  }

  return { segments, totalSamples: cursor, sprite };
}
