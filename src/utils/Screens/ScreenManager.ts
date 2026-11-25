import AbstractScreen from "./AbstractScreen";
import { GameApp } from "../../core/GameApp";

export enum ScreenEnum {
  LoginScreen = 0,
  GameScreen = 1,
  MenuScreen = 2,
}

export enum ScreenState {
  Hidden,
  Visible,
}

/** Port of the Cocos ScreenManager; screens register factories from main.ts. */
export default class ScreenManager {
  private factories = new Map<ScreenEnum, () => AbstractScreen>();
  private screens = new Map<ScreenEnum, AbstractScreen>();
  currentScreen: ScreenEnum = null;

  register(screen: ScreenEnum, factory: () => AbstractScreen) {
    this.factories.set(screen, factory);
  }

  getScreen<T extends AbstractScreen = AbstractScreen>(screen: ScreenEnum): T {
    let view = this.screens.get(screen);
    if (!view) {
      const factory = this.factories.get(screen);
      if (!factory) {
        console.warn(
          "[ScreenManager] screen not registered",
          ScreenEnum[screen],
        );
        return null;
      }
      view = factory();
      view.label = ScreenEnum[screen];
      this.screens.set(screen, view);
      GameApp.screenLayer.addChild(view);
    }
    return view as T;
  }

  showScreen(screen: ScreenEnum, data: any = null, callback?: () => void) {
    const next = this.getScreen(screen);
    if (!next) return;
    if (this.currentScreen !== null && this.currentScreen !== screen) {
      this.screens.get(this.currentScreen)?.hide();
    }
    this.currentScreen = screen;
    next.show(data);
    callback?.();
  }

  getScreenState(screen: ScreenEnum): ScreenState {
    return this.screens.get(screen)?.visible
      ? ScreenState.Visible
      : ScreenState.Hidden;
  }
}

const Instance = new ScreenManager();
export { Instance };
