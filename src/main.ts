// GameConstants first: it wires the live re-export bindings every gameplay module relies on.
import "./Data/GameConstants";
import { Assets } from "pixi.js";
import { initAssets } from "./assets";
import { GameApp } from "./core/GameApp";
import { Instance as Screens, ScreenEnum } from "./utils/Screens/ScreenManager";
import { Instance as PopUps, PopUpType } from "./utils/PopUps/PopUpManager";
import { Instance as Sounds } from "./utils/SoundManager";
import { ProgressBarManager } from "./Data/ProgressBarManager";
import LoginScreen from "./Screens/LoginScreen";
import GameScreen from "./Screens/GameScreen";
import FreeGamePopUp from "./PopUps/FreeGamePopUp";
import FreeGameWinPopUp from "./PopUps/FreeGameWinPopUp";
import NetworkErrorPopUp from "./PopUps/NetworkErrorPopUp";
import PaytablePopup from "./PopUps/PaytablePopup";
import AutoSpinPopUp from "./PopUps/AutoSpinPopUp";
import FeatureBuyPopUp from "./PopUps/FeatureBuyPopUp";
import WinPopup from "./PopUps/WinPopup";
import SettingsPopup from "./PopUps/SettingsPopup";
import BetChoicePopup from "./PopUps/BetChoicePopup";
import InsufficientBalance from "./PopUps/InsufficientBalance";
import WatchReplayPopup from "./PopUps/WatchReplayPopup";
import ShouldContinuePopup from "./PopUps/ShouldContinuePopup";
import AnteBetConfirmationPopup from "./PopUps/AnteBetConfirmationPopup";

/** Bundles needed by the game screen (the `spines` bundle is not used: no spine runtime). */
const GAME_BUNDLES = ["scenery", "sprites", "splash"];

function registerScreensAndPopups() {
  Screens.register(ScreenEnum.LoginScreen, () => new LoginScreen());
  Screens.register(ScreenEnum.GameScreen, () => new GameScreen());

  PopUps.register(PopUpType.FreeGame, () => new FreeGamePopUp());
  PopUps.register(PopUpType.FreeGameWin, () => new FreeGameWinPopUp());
  PopUps.register(PopUpType.NetworkErrorPopUp, () => new NetworkErrorPopUp());
  PopUps.register(PopUpType.PaytablePopup, () => new PaytablePopup());
  PopUps.register(PopUpType.AutoSpinPopUp, () => new AutoSpinPopUp());
  PopUps.register(PopUpType.FeatureBuyPopUp, () => new FeatureBuyPopUp());
  PopUps.register(PopUpType.WinsPopUp, () => new WinPopup());
  PopUps.register(PopUpType.Settings, () => new SettingsPopup());
  PopUps.register(PopUpType.BetChoicePopUp, () => new BetChoicePopup());
  PopUps.register(
    PopUpType.InsufficientBalance,
    () => new InsufficientBalance(),
  );
  PopUps.register(PopUpType.ReplayPopup, () => new WatchReplayPopup());
  PopUps.register(
    PopUpType.ShouldContinuePopup,
    () => new ShouldContinuePopup(),
  );
  PopUps.register(
    PopUpType.AnteBetConfirmationPopup,
    () => new AnteBetConfirmationPopup(),
  );
}

(async () => {
  ProgressBarManager.show();
  await GameApp.init(document.getElementById("pixi-container")!);
  await initAssets();

  // Login screen needs fonts and the loading bar only.
  await Assets.loadBundle("fonts");
  await Assets.load([
    "loading/Loading-Bar-Base.png",
    "loading/Loading-Fill.png",
  ]);

  registerScreensAndPopups();
  Screens.showScreen(ScreenEnum.LoginScreen);
  const login = Screens.getScreen<LoginScreen>(ScreenEnum.LoginScreen);

  await Assets.loadBundle(GAME_BUNDLES, (p) => login.setProgress(p * 0.9));
  try {
    await Sounds.load();
  } catch (e) {
    console.warn("[main] audio failed to load; continuing muted", e);
  }
  login.finishedLoading();
})();
