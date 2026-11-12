import { resolveSources } from "../assets";
import { assertSpriteCues, parseSpriteDefinition } from "./assertSpriteCues";
import type { SpriteDefinition } from "./assertSpriteCues";

export type AudioBus = "music" | "sfx" | "ui";

export const AUDIO_BUSES: readonly AudioBus[] = ["music", "sfx", "ui"];

export interface LoadSpriteOptions {
  id: string;
  /** Manifest alias of the cue map, e.g. "soundSprite.json". */
  definitionAlias: string;
  /** Manifest alias of the encoded audio, e.g. "soundSprite"; its sources are tried in order. */
  audioAlias: string;
  /** Cue ids the game plays; the load fails if the fetched cue map lacks any. */
  expectedCues?: readonly string[];
}

export interface PlayOptions {
  sprite: string;
  cue: string;
  bus: AudioBus;
  /** Linear, 0–1. */
  gain?: number;
  /** Playback-rate multiplier; also shifts pitch. */
  rate?: number;
  /** Overrides the cue map's loop flag. */
  loop?: boolean;
  /** Fade-in, ms. */
  fadeInMs?: number;
}

/** 0 is never issued, so it can mean "nothing is playing". */
export type PlaybackToken = number;

interface LoadedSprite {
  buffer: AudioBuffer;
  definition: SpriteDefinition;
}

interface Voice {
  token: PlaybackToken;
  bus: AudioBus;
  source: AudioBufferSourceNode;
  gain: GainNode;
}

/** Ramp time constant for gain changes, s. Short enough to feel instant, long enough not to click. */
const GAIN_SMOOTHING_S = 0.015;

/**
 * One WebAudio graph: voices → bus gain (music/sfx/ui) → master gain → destination. A missing cue or
 * an unloaded sprite plays silence and warns once; only `loadSprite` throws. Owns its AudioContext —
 * call `dispose()` when the game tears down.
 */
export class AudioSpritePlayer {
  private readonly context: AudioContext;
  private readonly master: GainNode;
  private readonly buses = new Map<AudioBus, GainNode>();
  private readonly busLevels = new Map<AudioBus, number>();
  private readonly sprites = new Map<string, LoadedSprite>();
  private readonly voices = new Map<PlaybackToken, Voice>();
  /** Gain nodes outlive their one-shot source nodes; recycled to keep play() allocation-light. */
  private readonly idleGains: GainNode[] = [];
  private readonly warned = new Set<string>();
  private nextToken: PlaybackToken = 1;
  private muted = false;
  private disposed = false;

  constructor(context: AudioContext = new AudioContext()) {
    this.context = context;
    this.master = context.createGain();
    this.master.connect(context.destination);
    for (const bus of AUDIO_BUSES) {
      const node = context.createGain();
      node.connect(this.master);
      this.buses.set(bus, node);
      this.busLevels.set(bus, 1);
    }
  }

  /** Browsers start the context suspended; call from the first pointer or key handler. */
  async unlock(): Promise<void> {
    if (this.context.state === "suspended") await this.context.resume();
  }

  get unlocked(): boolean {
    return this.context.state === "running";
  }

  async loadSprite(options: LoadSpriteOptions): Promise<void> {
    const [definitionUrl] = resolveSources(options.definitionAlias);
    const response = await fetch(definitionUrl);
    if (!response.ok) {
      throw new Error(`audio sprite "${options.id}": ${definitionUrl} returned ${response.status}.`);
    }
    const definition = parseSpriteDefinition(options.id, await response.json());
    if (options.expectedCues !== undefined) {
      assertSpriteCues(options.id, definition, options.expectedCues);
    }
    const buffer = await this.decodeFirstPlayable(options.id, resolveSources(options.audioAlias));
    this.sprites.set(options.id, { buffer, definition });
  }

  hasCue(sprite: string, cue: string): boolean {
    return this.sprites.get(sprite)?.definition.sprite[cue] !== undefined;
  }

  play(options: PlayOptions): PlaybackToken {
    if (this.disposed) return 0;
    const loaded = this.sprites.get(options.sprite);
    if (loaded === undefined) {
      this.warnOnce(`sprite:${options.sprite}`, `audio sprite "${options.sprite}" is not loaded.`);
      return 0;
    }
    const tuple = loaded.definition.sprite[options.cue];
    if (tuple === undefined) {
      this.warnOnce(
        `cue:${options.sprite}/${options.cue}`,
        `audio sprite "${options.sprite}" has no cue "${options.cue}".`,
      );
      return 0;
    }

    const [startMs, durationMs, mapLoop] = tuple;
    const loop = options.loop ?? mapLoop === true;
    const start = startMs / 1000;
    const duration = durationMs / 1000;

    const source = this.context.createBufferSource();
    source.buffer = loaded.buffer;
    source.playbackRate.value = options.rate ?? 1;
    source.loop = loop;
    if (loop) {
      source.loopStart = start;
      source.loopEnd = start + duration;
    }

    const gain = this.idleGains.pop() ?? this.context.createGain();
    const target = options.gain ?? 1;
    const now = this.context.currentTime;
    gain.gain.cancelScheduledValues(now);
    if (options.fadeInMs !== undefined && options.fadeInMs > 0) {
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(target, now + options.fadeInMs / 1000);
    } else {
      gain.gain.setValueAtTime(target, now);
    }
    source.connect(gain);
    gain.connect(this.buses.get(options.bus)!);

    const token = this.nextToken;
    this.nextToken += 1;
    const voice: Voice = { token, bus: options.bus, source, gain };
    this.voices.set(token, voice);
    // `onended` fires for a natural end and for stop(); either way the voice is finished.
    source.onended = () => this.release(voice);

    if (loop) source.start(now, start);
    else source.start(now, start, duration);
    return token;
  }

  isPlaying(token: PlaybackToken): boolean {
    return this.voices.has(token);
  }

  /** Stop one voice, optionally fading out over `fadeOutMs`. A stale token is a no-op. */
  stop(token: PlaybackToken, fadeOutMs = 0): void {
    const voice = this.voices.get(token);
    if (voice === undefined) return;
    const now = this.context.currentTime;
    if (fadeOutMs > 0) {
      const param = voice.gain.gain;
      param.cancelScheduledValues(now);
      param.setValueAtTime(param.value, now);
      param.linearRampToValueAtTime(0, now + fadeOutMs / 1000);
      voice.source.stop(now + fadeOutMs / 1000);
    } else {
      voice.source.stop(now);
    }
  }

  stopBus(bus: AudioBus, fadeOutMs = 0): void {
    for (const voice of [...this.voices.values()]) {
      if (voice.bus === bus) this.stop(voice.token, fadeOutMs);
    }
  }

  stopAll(fadeOutMs = 0): void {
    for (const token of [...this.voices.keys()]) this.stop(token, fadeOutMs);
  }

  /** Linear 0–1, eased over `fadeMs` (or the click-free default). */
  setBusGain(bus: AudioBus, level: number, fadeMs?: number): void {
    this.busLevels.set(bus, level);
    this.ramp(this.buses.get(bus)!.gain, level, fadeMs);
  }

  getBusGain(bus: AudioBus): number {
    return this.busLevels.get(bus)!;
  }

  setMasterMuted(muted: boolean): void {
    this.muted = muted;
    this.ramp(this.master.gain, muted ? 0 : 1);
  }

  get masterMuted(): boolean {
    return this.muted;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const voice of [...this.voices.values()]) {
      voice.source.onended = null;
      voice.source.stop();
      this.release(voice);
    }
    for (const gain of this.idleGains) gain.disconnect();
    this.idleGains.length = 0;
    this.sprites.clear();
    void this.context.close();
  }

  private release(voice: Voice): void {
    if (this.voices.get(voice.token) !== voice) return;
    this.voices.delete(voice.token);
    voice.source.onended = null;
    voice.source.disconnect();
    voice.gain.disconnect();
    if (!this.disposed) this.idleGains.push(voice.gain);
  }

  private ramp(param: AudioParam, level: number, fadeMs?: number): void {
    const now = this.context.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    if (fadeMs !== undefined && fadeMs > 0) {
      param.linearRampToValueAtTime(level, now + fadeMs / 1000);
    } else {
      param.setTargetAtTime(level, now, GAIN_SMOOTHING_S);
    }
  }

  /** Safari before 17 cannot decode Ogg Vorbis, hence the walk over the manifest's formats. */
  private async decodeFirstPlayable(id: string, urls: readonly string[]): Promise<AudioBuffer> {
    const failures: string[] = [];
    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          failures.push(`${url}: HTTP ${response.status}`);
          continue;
        }
        return await this.context.decodeAudioData(await response.arrayBuffer());
      } catch (error) {
        failures.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    throw new Error(`audio sprite "${id}": no source could be decoded.\n  ${failures.join("\n  ")}`);
  }

  private warnOnce(key: string, message: string): void {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    console.warn(`[audio] ${message} Playing silence.`);
  }
}
