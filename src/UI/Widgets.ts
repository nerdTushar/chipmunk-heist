import {
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyleOptions,
  Texture,
} from "pixi.js";
import { Tweens, Ease } from "../core/Tween";

export const FONT_TITLE = [
  "RifficFree-Bold",
  "RifficFree Bold",
  "Arial Black",
  "sans-serif",
];
export const FONT_BODY = ["RobotoBlack", "Roboto Black", "Arial", "sans-serif"];
export const FONT_REGULAR = [
  "RobotoMedium",
  "Roboto Medium",
  "Arial",
  "sans-serif",
];

export const COLORS = {
  gold: 0xffc93c,
  goldDark: 0xb7791f,
  panel: 0x1b1530,
  panelLight: 0x2c2350,
  stroke: 0xf6d77a,
  green: 0x2fbf71,
  red: 0xe5484d,
  white: 0xffffff,
  grey: 0x8a8aa0,
  dim: 0x000000,
};

export function makeText(text: string, style: TextStyleOptions = {}): Text {
  const t = new Text({
    text,
    style: {
      fontFamily: FONT_BODY,
      fontSize: 36,
      fill: COLORS.white,
      align: "center",
      ...style,
    },
  });
  t.anchor.set(0.5);
  return t;
}

export function makeTitle(
  text: string,
  size = 72,
  fill: number = COLORS.gold,
): Text {
  return makeText(text, {
    fontFamily: FONT_TITLE,
    fontSize: size,
    fill,
    stroke: { color: 0x3a1d05, width: Math.max(4, size / 10) },
    dropShadow: {
      color: 0x000000,
      alpha: 0.6,
      blur: 4,
      distance: 4,
      angle: Math.PI / 2,
    },
  });
}

export function roundedPanel(
  width: number,
  height: number,
  color = COLORS.panel,
  stroke = COLORS.stroke,
  radius = 28,
) {
  const g = new Graphics();
  g.roundRect(-width / 2, -height / 2, width, height, radius).fill({
    color,
    alpha: 0.96,
  });
  g.roundRect(-width / 2, -height / 2, width, height, radius).stroke({
    color: stroke,
    width: 4,
  });
  return g;
}

export function fullScreenDim(alpha = 0.7): Graphics {
  const g = new Graphics();
  g.rect(-2000, -2000, 6000, 6000).fill({ color: COLORS.dim, alpha });
  g.eventMode = "static"; // swallow clicks behind popups
  return g;
}

export interface ButtonOptions {
  width?: number;
  height?: number;
  color?: number;
  textColor?: number;
  fontSize?: number;
  radius?: number;
  texture?: Texture;
  circle?: boolean;
}

/** Graphics (or sprite) button with label, press feedback and an `interactable` flag (Cocos Button). */
export class Button extends Container {
  readonly caption: Text;
  private bg: Graphics | Sprite;
  private _interactable = true;
  private handlers: (() => void)[] = [];
  private opts: ButtonOptions;

  constructor(text: string, opts: ButtonOptions = {}) {
    super();
    this.opts = {
      width: 220,
      height: 80,
      color: COLORS.gold,
      textColor: 0x2a1600,
      fontSize: 32,
      radius: 20,
      ...opts,
    };
    if (opts.texture) {
      const s = new Sprite(opts.texture);
      s.anchor.set(0.5);
      if (opts.width) s.width = opts.width;
      if (opts.height) s.height = opts.height;
      this.bg = s;
    } else {
      this.bg = new Graphics();
      this.redraw();
    }
    this.addChild(this.bg);
    this.caption = makeText(text, {
      fontSize: this.opts.fontSize,
      fill: this.opts.textColor,
    });
    this.addChild(this.caption);
    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointerdown", () => {
      if (!this._interactable) return;
      Tweens.to(this.scale, { x: 0.92, y: 0.92 }, { duration: 0.06 });
    });
    const release = () =>
      Tweens.to(
        this.scale,
        { x: 1, y: 1 },
        { duration: 0.12, ease: Ease.backOut },
      );
    this.on("pointerupoutside", release);
    this.on("pointertap", () => {
      release();
      if (!this._interactable || !this.visible) return;
      this.handlers.forEach((h) => h());
    });
  }

  setColor(color: number) {
    this.opts.color = color;
    this.redraw();
  }

  private redraw() {
    if (!(this.bg instanceof Graphics)) return;
    const { width, height, color, radius, circle } = this.opts;
    this.bg.clear();
    if (circle) {
      this.bg.circle(0, 0, width / 2).fill(color);
      this.bg
        .circle(0, 0, width / 2)
        .stroke({ color: 0x000000, width: 4, alpha: 0.35 });
    } else {
      this.bg
        .roundRect(-width / 2, -height / 2, width, height, radius)
        .fill(color);
      this.bg
        .roundRect(-width / 2, -height / 2, width, height, radius)
        .stroke({ color: 0x000000, width: 4, alpha: 0.35 });
    }
  }

  onClick(handler: () => void): this {
    this.handlers.push(handler);
    return this;
  }

  get interactable() {
    return this._interactable;
  }

  set interactable(flag: boolean) {
    this._interactable = flag;
    this.alpha = flag ? 1 : 0.45;
    this.cursor = flag ? "pointer" : "default";
  }

  setText(text: string) {
    this.caption.text = text;
  }
}

/** On/off toggle (Cocos Toggle). */
export class Toggle extends Container {
  private track = new Graphics();
  private knob = new Graphics();
  private _checked = false;
  private handlers: ((checked: boolean) => void)[] = [];

  constructor(checked = false) {
    super();
    this.addChild(this.track, this.knob);
    this.knob.circle(0, 0, 22).fill(COLORS.white);
    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointertap", () => {
      this.setChecked(!this._checked, true);
    });
    this.setChecked(checked, false);
  }

  get isChecked() {
    return this._checked;
  }

  setChecked(flag: boolean, notify = false) {
    this._checked = flag;
    this.track.clear();
    this.track
      .roundRect(-45, -25, 90, 50, 25)
      .fill(flag ? COLORS.green : 0x4a4a5a);
    this.knob.x = flag ? 20 : -20;
    if (notify) this.handlers.forEach((h) => h(flag));
  }

  onChange(handler: (checked: boolean) => void): this {
    this.handlers.push(handler);
    return this;
  }
}

/** Horizontal 0–1 slider (Cocos Slider). */
export class Slider extends Container {
  private bar = new Graphics();
  private fill = new Graphics();
  private handle = new Graphics();
  private _progress = 0;
  private dragging = false;
  private handlers: ((progress: number) => void)[] = [];

  constructor(private readonly barWidth = 600) {
    super();
    this.bar.roundRect(-barWidth / 2, -10, barWidth, 20, 10).fill(0x3c3c50);
    this.handle.circle(0, 0, 28).fill(COLORS.gold);
    this.handle.circle(0, 0, 28).stroke({ color: 0x3a1d05, width: 4 });
    this.addChild(this.bar, this.fill, this.handle);
    this.eventMode = "static";
    this.hitArea = {
      contains: (x: number, y: number) =>
        Math.abs(x) <= barWidth / 2 + 30 && Math.abs(y) <= 40,
    };
    this.cursor = "pointer";
    this.on("pointerdown", (e) => {
      this.dragging = true;
      this.updateFromGlobal(e.global);
    });
    this.on("globalpointermove", (e) => {
      if (this.dragging) this.updateFromGlobal(e.global);
    });
    this.on("pointerup", () => (this.dragging = false));
    this.on("pointerupoutside", () => (this.dragging = false));
    this.progress = 0;
  }

  private updateFromGlobal(global: { x: number; y: number }) {
    const local = this.toLocal(global);
    this.progress = (local.x + this.barWidth / 2) / this.barWidth;
    this.handlers.forEach((h) => h(this._progress));
  }

  get progress() {
    return this._progress;
  }

  set progress(value: number) {
    this._progress = Math.max(0, Math.min(1, value));
    const x = -this.barWidth / 2 + this.barWidth * this._progress;
    this.handle.x = x;
    this.fill.clear();
    this.fill
      .roundRect(
        -this.barWidth / 2,
        -10,
        Math.max(20, this.barWidth * this._progress),
        20,
        10,
      )
      .fill(COLORS.gold);
  }

  onChange(handler: (progress: number) => void): this {
    this.handlers.push(handler);
    return this;
  }
}

/** Counts a Text up to a value over time (Cocos ValueAnimator). */
export class ValueAnimator {
  private state = { value: 0 };

  constructor(
    private readonly label: Text,
    private readonly format: (v: number) => string,
  ) {}

  animateTo(
    from: number,
    to: number,
    seconds: number,
    onComplete?: () => void,
  ) {
    Tweens.killTweensOf(this.state);
    this.state.value = from;
    this.label.text = this.format(from);
    Tweens.to(
      this.state,
      { value: to },
      {
        duration: seconds,
        ease: Ease.quadOut,
        onUpdate: () => (this.label.text = this.format(this.state.value)),
        onComplete,
      },
    );
  }

  finish() {
    Tweens.killTweensOf(this.state, true);
  }

  set(value: number) {
    Tweens.killTweensOf(this.state);
    this.state.value = value;
    this.label.text = this.format(value);
  }
}
