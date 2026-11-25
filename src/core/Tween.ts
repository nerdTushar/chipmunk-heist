import { Ticker } from "pixi.js";

export type Easing = (t: number) => number;

export const Ease = {
  linear: (t: number) => t,
  quadOut: (t: number) => 1 - (1 - t) * (1 - t),
  quadIn: (t: number) => t * t,
  quadInOut: (t: number) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  cubicOut: (t: number) => 1 - Math.pow(1 - t, 3),
  backOut: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  backIn: (t: number) => {
    const c1 = 1.70158;
    return (c1 + 1) * t * t * t - c1 * t * t;
  },
  sineInOut: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
};

interface TweenOptions {
  /** Seconds. */
  duration: number;
  delay?: number;
  ease?: Easing;
  onUpdate?: (progress: number) => void;
  onComplete?: () => void;
  /** Owner tag so every tween of an owner can be killed together (Cocos `Tween.stopAllByTarget`). */
  tag?: unknown;
}

type Props = Record<string, number>;

class TweenItem {
  private elapsed = 0;
  private from: Props = {};
  private started = false;
  dead = false;

  constructor(
    readonly target: any,
    private readonly to: Props,
    private readonly options: TweenOptions,
  ) {}

  /** Returns true when finished. */
  step(dt: number): boolean {
    if (this.dead) return true;
    this.elapsed += dt;
    const delay = this.options.delay ?? 0;
    if (this.elapsed < delay) return false;
    if (!this.started) {
      this.started = true;
      for (const key of Object.keys(this.to))
        this.from[key] = readPath(this.target, key);
    }
    const duration = Math.max(this.options.duration, 0.0001);
    const t = Math.min((this.elapsed - delay) / duration, 1);
    const k = (this.options.ease ?? Ease.linear)(t);
    for (const key of Object.keys(this.to)) {
      writePath(
        this.target,
        key,
        this.from[key] + (this.to[key] - this.from[key]) * k,
      );
    }
    this.options.onUpdate?.(t);
    if (t >= 1) {
      this.dead = true;
      this.options.onComplete?.();
      return true;
    }
    return false;
  }

  /** Jump to the end state and fire completion. */
  finish() {
    if (this.dead) return;
    if (!this.started) {
      for (const key of Object.keys(this.to))
        this.from[key] = readPath(this.target, key);
    }
    for (const key of Object.keys(this.to))
      writePath(this.target, key, this.to[key]);
    this.dead = true;
    this.options.onUpdate?.(1);
    this.options.onComplete?.();
  }

  get tag() {
    return this.options.tag;
  }
}

function readPath(target: any, path: string): number {
  const parts = path.split(".");
  let obj = target;
  for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
  return Number(obj[parts[parts.length - 1]]);
}

function writePath(target: any, path: string, value: number) {
  const parts = path.split(".");
  let obj = target;
  for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
  if (obj && !obj.destroyed) obj[parts[parts.length - 1]] = value;
}

/** Tiny ticker-driven tween engine; property paths like "scale.x" are supported. */
class TweenManager {
  private items: TweenItem[] = [];

  constructor() {
    Ticker.shared.add((ticker) => this.update(ticker.deltaMS / 1000));
  }

  to(target: any, props: Props, options: TweenOptions): TweenItem {
    const item = new TweenItem(target, props, options);
    this.items.push(item);
    return item;
  }

  /** Promise that resolves once the tween completes (or is killed with finish). */
  toAsync(target: any, props: Props, options: TweenOptions): Promise<void> {
    return new Promise((resolve) => {
      const onComplete = options.onComplete;
      this.to(target, props, {
        ...options,
        onComplete: () => {
          onComplete?.();
          resolve();
        },
      });
    });
  }

  killTweensOf(target: any, complete = false) {
    for (const item of this.items) {
      if (item.target === target || item.tag === target) {
        if (complete) item.finish();
        else item.dead = true;
      }
    }
  }

  killAll(complete = false) {
    for (const item of this.items.slice()) {
      if (complete) item.finish();
      else item.dead = true;
    }
  }

  private update(dt: number) {
    if (this.items.length === 0) return;
    const items = this.items.slice();
    for (const item of items) item.step(dt);
    this.items = this.items.filter((item) => !item.dead);
  }
}

export const Tweens = new TweenManager();

/** setTimeout in seconds, mirroring Cocos `scheduleOnce`. */
export function delay(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}
