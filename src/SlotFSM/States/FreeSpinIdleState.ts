import SMState from "../StateMachine/SMState";
import {
  PopUps,
  SFX,
  Sounds,
  GAME,
  GameView,
  BottomUI,
} from "../../Data/GameConstants";

/** Port of Royal Tower FreeSpinIdleState: between free spins (FIdle2FSpin fires after 0.5 s). */
export default class FreeSpinIdleState extends SMState {
  constructor(name = "FreeSpinIdleState") {
    super(name);
  }

  enterState(): void {
    super.enterState();
    PopUps.hideAllPopUps();
    GAME.isStopRequested = false;
    GameView.toggleFreeSpinsUI(true);
    BottomUI.autoUiFunctionality(true);
    BottomUI.toggleMenuButtons(false);
    Sounds.playMusicAudio(SFX.FREESPIN_BGM);
    const delay = GAME.Current?.Type == 1 ? 0.5 : 0;
    this.scheduleOnce(() => this.enableTransitions(true), delay);
  }

  exitState(): void {
    this.unscheduleAllCallbacks();
    super.exitState();
  }
}
