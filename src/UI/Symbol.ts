import { Container, Graphics, Sprite, Text } from "pixi.js";
import { StakeBoardSymbol } from "../Data/StakePlayResponse";
import { symbolFrame } from "../Data/GameConfig";
import { tex } from "./Textures";
import { Tweens, Ease } from "../core/Tween";
import { makeTitle } from "./Widgets";

/** One reel cell (port of the Cocos Symbol prefab: sprite + win frame + multiplier label). */
export default class SymbolView extends Container {
  readonly sprite = new Sprite();
  private winFrame = new Graphics();
  private multiplierLabel: Text;
  data: StakeBoardSymbol = { name: "" };
  private cellSize = 200;

  constructor(cellSize: number) {
    super();
    this.sprite.anchor.set(0.5);
    this.multiplierLabel = makeTitle("", 56, 0xffe066);
    this.multiplierLabel.visible = false;
    this.addChild(this.winFrame, this.sprite, this.multiplierLabel);
    this.resize(cellSize);
  }

  resize(cellSize: number) {
    this.cellSize = cellSize;
    this.fitSprite();
    this.winFrame.clear();
    const s = cellSize * 0.94;
    this.winFrame
      .roundRect(-s / 2, -s / 2, s, s, 18)
      .fill({ color: 0xffd54a, alpha: 0.16 });
    this.winFrame
      .roundRect(-s / 2, -s / 2, s, s, 18)
      .stroke({ color: 0xffd54a, width: 6 });
    this.winFrame.visible = false;
    this.multiplierLabel.position.set(cellSize * 0.22, cellSize * 0.28);
  }

  private fitSprite() {
    const t = this.sprite.texture;
    if (!t || t.width <= 1) return;
    const scale = (this.cellSize * 0.92) / Math.max(t.width, t.height);
    this.sprite.scale.set(scale);
  }

  setSymbol(data: StakeBoardSymbol) {
    this.data = data ?? { name: "" };
    this.setFrame(symbolFrame(this.data.name));
    const mult = this.getMultiplierValue();
    this.multiplierLabel.text = mult > 1 ? `x${mult}` : "";
    this.multiplierLabel.visible = mult > 1;
    this.reset();
  }

  setFrame(frame: string) {
    this.sprite.texture = tex(frame);
    this.fitSprite();
  }

  get isScatter() {
    const name = (this.data?.name ?? "").toUpperCase();
    return (
      !!this.data?.scatter ||
      name === "S" ||
      name === "SC" ||
      name === "SCATTER"
    );
  }

  getMultiplierValue(): number {
    return this.data?.multiplier ?? 0;
  }

  /** Clears win/tint/animation state. */
  reset() {
    Tweens.killTweensOf(this.sprite.scale);
    Tweens.killTweensOf(this);
    this.winFrame.visible = false;
    this.sprite.tint = 0xffffff;
    this.alpha = 1;
    this.fitSprite();
  }

  setDimmed(flag: boolean) {
    this.sprite.tint = flag ? 0x555566 : 0xffffff;
  }

  /** Payline highlight: frame + pulse (loops while `loop`). */
  showWin(loop = true) {
    this.setDimmed(false);
    this.winFrame.visible = true;
    this.pulse(loop ? 3 : 1, 1.12);
  }

  hideWin() {
    this.winFrame.visible = false;
    Tweens.killTweensOf(this.sprite.scale);
    this.fitSprite();
  }

  /** Scatter celebration. */
  animateScatter() {
    this.setDimmed(false);
    this.winFrame.visible = true;
    this.pulse(4, 1.25);
  }

  private pulse(times: number, amount: number) {
    Tweens.killTweensOf(this.sprite.scale);
    this.fitSprite();
    const base = this.sprite.scale.x;
    const step = (n: number) => {
      if (n <= 0 || this.destroyed) return;
      Tweens.to(
        this.sprite.scale,
        { x: base * amount, y: base * amount },
        {
          duration: 0.25,
          ease: Ease.quadOut,
          onComplete: () =>
            Tweens.to(
              this.sprite.scale,
              { x: base, y: base },
              {
                duration: 0.25,
                ease: Ease.quadIn,
                onComplete: () => step(n - 1),
              },
            ),
        },
      );
    };
    step(times);
  }

  /** Multiplier symbol reveal (free spins). */
  playMultiplierRevealAnimation(onComplete?: () => void) {
    this.multiplierLabel.visible = true;
    this.multiplierLabel.scale.set(0);
    Tweens.to(
      this.multiplierLabel.scale,
      { x: 1.4, y: 1.4 },
      {
        duration: 0.3,
        ease: Ease.backOut,
        onComplete: () =>
          Tweens.to(
            this.multiplierLabel.scale,
            { x: 1, y: 1 },
            { duration: 0.2, onComplete },
          ),
      },
    );
  }

  /** Explosion used by tumbles. */
  explode(): Promise<void> {
    this.winFrame.visible = false;
    Tweens.to(
      this.sprite.scale,
      { x: this.sprite.scale.x * 1.3, y: this.sprite.scale.y * 1.3 },
      { duration: 0.18 },
    );
    return Tweens.toAsync(this, { alpha: 0 }, { duration: 0.25, delay: 0.1 });
  }

  get multiplierText() {
    return this.multiplierLabel;
  }
}
