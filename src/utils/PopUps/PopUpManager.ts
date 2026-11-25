import PopUpBase from "./PopUpBase";
import { GameApp } from "../../core/GameApp";

export enum PopUpType {
  FreeGame = 0,
  FreeGameWin = 1,
  NetworkErrorPopUp = 2,
  PaytablePopup = 3,
  AutoSpinPopUp = 4,
  FeatureBuyPopUp = 5,
  WinsPopUp = 6,
  Settings = 7,
  BetChoicePopUp = 8,
  InsufficientBalance = 9,
  ReplayPopup = 10,
  ShouldContinuePopup = 11,
  AnteBetConfirmationPopup = 12,
  None = 100,
  Loading = 1000,
}

/**
 * Popups `hideAllPopUps` leaves alone: errors, and the popups that own a queue task (closing them
 * early would emit QUEUEACTIONEND out of order).
 */
const PERSISTENT = new Set<PopUpType>([
  PopUpType.NetworkErrorPopUp,
  PopUpType.InsufficientBalance,
  PopUpType.WinsPopUp,
  PopUpType.FreeGame,
  PopUpType.FreeGameWin,
  PopUpType.ReplayPopup,
  PopUpType.ShouldContinuePopup,
]);

/**
 * Port of the Cocos PopUpManager. Popup classes register a factory (main.ts) instead of being
 * scene nodes, so this module never imports concrete popups (avoids import cycles).
 */
export default class PopUpManager {
  private factories = new Map<PopUpType, () => PopUpBase>();
  private popups = new Map<PopUpType, PopUpBase>();
  currentOverLayedPopUps: PopUpType[] = [];

  register(type: PopUpType, factory: () => PopUpBase) {
    this.factories.set(type, factory);
  }

  getPopUp<T extends PopUpBase = PopUpBase>(type: PopUpType): T {
    let popup = this.popups.get(type);
    if (!popup) {
      const factory = this.factories.get(type);
      if (!factory) {
        console.warn("[PopUpManager] popup not registered", PopUpType[type]);
        return null;
      }
      popup = factory();
      popup.label = PopUpType[type];
      this.popups.set(type, popup);
      GameApp.popupLayer.addChild(popup);
    }
    return popup as T;
  }

  show(type: PopUpType, data: any = null, callback?: () => void) {
    const popup = this.getPopUp(type);
    if (!popup) return;
    GameApp.popupLayer.addChild(popup); // newest popup on top
    popup.show(data);
    this.currentOverLayedPopUps = this.currentOverLayedPopUps.filter(
      (p) => p !== type,
    );
    this.currentOverLayedPopUps.push(type);
    callback?.();
  }

  hide(type: PopUpType, callback?: () => void) {
    const popup = this.popups.get(type);
    this.currentOverLayedPopUps = this.currentOverLayedPopUps.filter(
      (p) => p !== type,
    );
    if (!popup) {
      callback?.();
      return;
    }
    popup.hide(callback);
  }

  isShowing(type: PopUpType) {
    return this.popups.get(type)?.isShowing ?? false;
  }

  hideCurrentPopUp(callback?: () => void) {
    const top =
      this.currentOverLayedPopUps[this.currentOverLayedPopUps.length - 1];
    if (top === undefined) {
      callback?.();
      return;
    }
    this.hide(top, callback);
  }

  hideAllPopUps() {
    [...this.currentOverLayedPopUps].forEach((type) => {
      if (PERSISTENT.has(type)) return;
      this.hide(type);
    });
  }
}

const Instance = new PopUpManager();
export { Instance };
