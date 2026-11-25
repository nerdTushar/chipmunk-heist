import { Container } from "pixi.js";
import { GameApp, RESIZE_EVENT } from "../../core/GameApp";
import { Instance as Events } from "../../SlotFSM/StateMachine/EventEmitter";

/** Port of the Cocos AbstractScreen: a full-screen view shown/hidden by the ScreenManager. */
export default abstract class AbstractScreen extends Container {
  protected data: any = null;
  private built = false;

  constructor() {
    super();
    this.visible = false;
    Events.on(
      RESIZE_EVENT,
      (_event: string, isPortrait: boolean) => {
        if (this.visible) this.layout(isPortrait);
      },
      this,
    );
  }

  protected abstract build(): void;

  /** Lay out for the given orientation (design space). */
  abstract layout(isPortrait: boolean): void;

  show(data: any = null) {
    if (!this.built) {
      this.build();
      this.built = true;
    }
    this.data = data;
    this.visible = true;
    this.layout(GameApp.isPortrait);
    this.onShow(data);
  }

  hide() {
    this.visible = false;
    this.onHide();
  }

  protected onShow(_data: any) {}

  protected onHide() {}
}
