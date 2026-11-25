import { Container } from "pixi.js";
import { Instance as Sounds, SFX } from "../SoundManager";
import { Tweens, Ease } from "../../core/Tween";
import { fullScreenDim } from "../../UI/Widgets";
import { GameApp, RESIZE_EVENT } from "../../core/GameApp";
import { Instance as Events } from "../../SlotFSM/StateMachine/EventEmitter";

/**
 * Port of the Cocos PopUpBase component. Popups are built once (lazily) by the PopUpManager and
 * re-shown with fresh `data`. Subclasses build their UI in `build()` and refresh it in `onShow`.
 */
export default abstract class PopUpBase extends Container {
  protected dim = fullScreenDim(0.7);
  /** Centered content root; subclasses add their panel here. */
  protected content = new Container();
  protected data: any = null;
  isShowing = false;
  private built = false;

  constructor() {
    super();
    this.addChild(this.dim, this.content);
    this.visible = false;
    Events.on(RESIZE_EVENT, () => this.layout(GameApp.isPortrait), this);
  }

  /** Called once before the first show. */
  protected abstract build(): void;

  /** Re-position for orientation changes. Default: center in design space. */
  layout(_isPortrait: boolean) {
    const d = GameApp.design;
    this.content.position.set(d.width / 2, d.height / 2);
  }

  show(data: any = null) {
    if (!this.built) {
      this.build();
      this.built = true;
    }
    this.data = data;
    this.visible = true;
    this.isShowing = true;
    this.layout(GameApp.isPortrait);
    this.onShow();
    this.content.scale.set(0.6);
    this.content.alpha = 0;
    this.dim.alpha = 0;
    Tweens.killTweensOf(this.content.scale);
    Tweens.killTweensOf(this.content);
    Tweens.killTweensOf(this.dim);
    Tweens.to(this.dim, { alpha: 1 }, { duration: 0.2 });
    Tweens.to(this.content, { alpha: 1 }, { duration: 0.2 });
    Tweens.to(
      this.content.scale,
      { x: 1, y: 1 },
      { duration: 0.35, ease: Ease.backOut },
    );
  }

  hide(callback?: () => void) {
    if (!this.isShowing) {
      callback?.();
      return;
    }
    this.isShowing = false;
    this.onHide();
    Tweens.killTweensOf(this.content.scale);
    Tweens.killTweensOf(this.content);
    Tweens.to(this.dim, { alpha: 0 }, { duration: 0.15 });
    Tweens.to(this.content.scale, { x: 0.8, y: 0.8 }, { duration: 0.15 });
    Tweens.to(
      this.content,
      { alpha: 0 },
      {
        duration: 0.15,
        onComplete: () => {
          if (!this.isShowing) this.visible = false;
          this.onHidden();
          callback?.();
        },
      },
    );
  }

  /** Ducks the music while a popup is open (same as the Cocos PopUpBase). */
  protected onShow() {
    Sounds.setToMusicVolume(0.2);
    Sounds.playSoundAsync(SFX.POPUP_OPEN);
  }

  protected onHide() {
    Sounds.setMusicVolume();
  }

  /** After the hide animation. */
  protected onHidden() {}
}
