import { Container, Graphics, Sprite } from "pixi.js";
import { GameApp } from "../core/GameApp";
import { Tweens, Ease } from "../core/Tween";
import { Instance as Sounds, SFX } from "./SoundManager";
import { tex } from "../UI/Textures";

/**
 * Port of Royal Tower's ScreenSwitchTransition (a full-screen spine wipe). Without a spine runtime
 * two vault doors close over the screen, the callback runs at the midpoint (1.2 s like the
 * original), then the doors open again.
 */
export class ScreenSwitchTransition {
  private static Instance: ScreenSwitchTransition;
  private root = new Container();
  private left = new Graphics();
  private right = new Graphics();
  private logo: Sprite;
  private timer: ReturnType<typeof setTimeout> = null;

  constructor() {
    ScreenSwitchTransition.Instance = this;
    this.root.visible = false;
    this.root.eventMode = "static";
    this.logo = new Sprite(tex("sym_mystery-safe.png"));
    this.logo.anchor.set(0.5);
    this.logo.scale.set(1.3);
    this.root.addChild(this.left, this.right, this.logo);
    GameApp.overlayLayer.addChild(this.root);
  }

  static switchToScreen(callback: () => void) {
    const instance =
      ScreenSwitchTransition.Instance ?? new ScreenSwitchTransition();
    instance.play(callback);
  }

  private drawDoors() {
    const b = GameApp.visibleBounds;
    const half = b.width / 2 + 4;
    const doors: [Graphics, number][] = [
      [this.left, b.x],
      [this.right, b.x + b.width / 2 - 4],
    ];
    for (const [g, x] of doors) {
      g.clear();
      g.rect(0, 0, half, b.height).fill(0x232031);
      g.rect(0, 0, half, b.height).stroke({ color: 0xf6d77a, width: 8 });
      for (let i = 1; i < 6; i++)
        g.rect(20, (b.height / 6) * i, half - 40, 6).fill({
          color: 0x000000,
          alpha: 0.35,
        });
      g.position.set(x, b.y);
    }
    this.logo.position.set(b.x + b.width / 2, b.y + b.height / 2);
    return b;
  }

  private play(callback: () => void) {
    clearTimeout(this.timer);
    Tweens.killTweensOf(this.left);
    Tweens.killTweensOf(this.right);
    Tweens.killTweensOf(this.logo);
    const b = this.drawDoors();
    const leftClosed = this.left.x;
    const rightClosed = this.right.x;
    this.root.visible = true;
    this.left.x = leftClosed - b.width / 2;
    this.right.x = rightClosed + b.width / 2;
    this.logo.alpha = 0;
    Sounds.playSoundAsync(SFX.TRANSITION);
    Tweens.to(
      this.left,
      { x: leftClosed },
      { duration: 0.5, ease: Ease.quadIn },
    );
    Tweens.to(
      this.right,
      { x: rightClosed },
      { duration: 0.5, ease: Ease.quadIn },
    );
    Tweens.to(this.logo, { alpha: 1 }, { duration: 0.3, delay: 0.4 });

    this.timer = setTimeout(() => {
      callback?.();
      Tweens.to(this.logo, { alpha: 0 }, { duration: 0.25 });
      Tweens.to(
        this.left,
        { x: leftClosed - b.width / 2 },
        { duration: 0.6, delay: 0.2, ease: Ease.quadOut },
      );
      Tweens.to(
        this.right,
        { x: rightClosed + b.width / 2 },
        {
          duration: 0.6,
          delay: 0.2,
          ease: Ease.quadOut,
          onComplete: () => (this.root.visible = false),
        },
      );
    }, 1200);
  }
}
