import { Graphics, Text } from "pixi.js";
import PopUpBase from "../utils/PopUps/PopUpBase";
import { COLORS, makeTitle, ValueAnimator } from "../UI/Widgets";
import { Tweens, Ease } from "../core/Tween";
import { money } from "../UI/Format";
import {
  Events,
  PopUps,
  PopUpType,
  QUEUEACTIONEND,
  QUEUE_PRIORITY,
  SFX,
  Sounds,
  WinAnimTitles,
} from "../Data/GameConstants";

/**
 * Port of Royal Tower WinPopup (big / mega / super / max win). Counts the amount up, auto-closes
 * after ~5.5 s (tap or space skips) and releases the BIGWIN queue task.
 */
export default class WinPopup extends PopUpBase {
  private title: Text;
  private amountLabel: Text;
  private amount: ValueAnimator;
  private rays = new Graphics();
  private timers: ReturnType<typeof setTimeout>[] = [];
  private canSkip = false;
  private closed = false;
  private onSpace = () => this.onContinueClick();

  protected build(): void {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      this.rays
        .moveTo(0, 0)
        .lineTo(Math.cos(a - 0.08) * 700, Math.sin(a - 0.08) * 700);
      this.rays
        .lineTo(Math.cos(a + 0.08) * 700, Math.sin(a + 0.08) * 700)
        .lineTo(0, 0);
    }
    this.rays.fill({ color: COLORS.gold, alpha: 0.12 });
    this.title = makeTitle("BIG WIN", 150);
    this.title.y = -120;
    this.amountLabel = makeTitle(money(0), 110, COLORS.white);
    this.amountLabel.y = 70;
    this.amount = new ValueAnimator(this.amountLabel, (v) => money(v));
    this.content.addChild(this.rays, this.title, this.amountLabel);
    this.dim.on("pointertap", () => this.onContinueClick());
    this.content.eventMode = "static";
    this.content.on("pointertap", () => this.onContinueClick());
  }

  protected onShow(): void {
    super.onShow();
    if (this.data == null) return;
    this.clearTimers();
    this.closed = false;
    this.canSkip = true;
    const { index, winAmount } = this.data as {
      index: number;
      winAmount: number;
    };
    this.title.text = WinAnimTitles[index] ?? "BIG WIN";
    Events.on("SpaceButtonPressed", this.onSpace, this);
    Sounds.playSoundAsync(SFX.BIGWIN_START);
    this.amount.animateTo(0, winAmount, 3.5, () =>
      Sounds.playSoundAsync(SFX.COUNT_END),
    );
    this.title.scale.set(0.2);
    Tweens.to(
      this.title.scale,
      { x: 1, y: 1 },
      { duration: 0.6, ease: Ease.backOut },
    );
    Tweens.killTweensOf(this.rays);
    this.rays.rotation = 0;
    Tweens.to(this.rays, { rotation: Math.PI * 2 }, { duration: 12 });
    this.timers.push(setTimeout(() => (this.canSkip = false), 3800));
    this.timers.push(setTimeout(() => this.closePopup(), 5500));
  }

  onContinueClick() {
    if (!this.canSkip || this.closed) return;
    this.canSkip = false;
    this.clearTimers();
    this.amount.finish();
    this.timers.push(setTimeout(() => this.closePopup(), 500));
  }

  closePopup() {
    if (this.closed) return;
    this.closed = true;
    this.clearTimers();
    PopUps.hide(PopUpType.WinsPopUp);
    Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.BIGWIN);
  }

  protected onHide(): void {
    super.onHide();
    Events.removeListener("SpaceButtonPressed", this.onSpace, this);
    Sounds.stopSound();
  }

  protected onHidden(): void {
    Tweens.killTweensOf(this.rays);
    this.amount.set(0);
  }

  private clearTimers() {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
  }
}
