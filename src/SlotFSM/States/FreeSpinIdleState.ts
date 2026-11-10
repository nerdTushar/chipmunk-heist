import { BottomUI, BuyFeatureId, BuyFeaturePrice, GAME, GameView, PopUps, REELM, SFX, Sounds } from "../../Data/GameConstants";
import SMState from "../../utils/StateMachine/SMState";

export class FreeSpinIdleState extends SMState {
  enterState(): void {
    super.enterState();
    PopUps.hideAllPopUps();
    GAME.isStopRequested = false;
    GameView.toggleFreeSpinsUI(true);
    // GameView.updateFreeSpinsCount();
    BottomUI.autoUiFunctionality(true);
    BottomUI.toggleMenuButtons(false);
    Sounds.playMusicAudio(SFX.FREESPIN_BGM);

    let delay = 0
    if (GAME.Current.Type == 1) {
      delay = 500
    }
    setTimeout(() => {
      this.enableTransitions(true);
    }, delay);
  }
}