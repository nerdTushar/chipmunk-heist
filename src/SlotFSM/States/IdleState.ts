import SMState from "../StateMachine/SMState";
import {
  PopUps,
  SFX,
  Sounds,
  GAME,
  GameView,
  PopUpType,
  Events,
  QUEUE,
  QUEUE_PRIORITY,
  QUEUEACTIONEND,
  BottomUI,
} from "../../Data/GameConstants";

/** Port of Royal Tower IdleState: waits for ON_SPIN_START / autoToggle / isSpaceHold / shouldReplay. */
export default class IdleState extends SMState {
  constructor(name = "IdleState") {
    super(name);
  }

  enterState() {
    super.enterState();
    PopUps.hideAllPopUps();
    if (GAME.Player.Balance < GAME.bet && !GAME.isReplay) {
      if (GAME.autoToggle) PopUps.show(PopUpType.InsufficientBalance);
      GAME.autoToggle = false;
      GAME.isSpaceHold = false;
    }
    GAME.isUILocked = false;
    BottomUI.checkForAutoSpins();
    BottomUI.toggleCreditBtnUI(true);
    BottomUI.autoUiFunctionality(true);
    BottomUI.toggleMenuButtons(true);
    BottomUI.setBalance(GAME.Player.Balance);
    if (GAME.isReplay) BottomUI.enableReplayButton(true);
    if (GAME.isReplay && !GAME.isIdleInitState) {
      PopUps.show(PopUpType.ReplayPopup, { calledFromLoginScreen: false });
    }
    GAME.isStopRequested = false;
    GameView.checkForAutoSpins();
    GameView.toggleBuyFreeSpin(true);
    GameView.toggleAnteBet(true);
    GameView.toggleFreeSpinsUI(false);
    Sounds.playMusicAudio(SFX.BGM);
    GAME.isSuperFeatureBought = false;
    setTimeout(() => this.changeState(), 0);
  }

  update(dt: number): void {
    super.update(dt);
    if (!GAME.autoToggle) BottomUI.toggleSpinUI(true);
  }

  exitState(): void {
    super.exitState();
    GAME.isIdleInitState = false;
  }

  changeState() {
    QUEUE.enQueue({
      execute: () => {
        GAME.isUILocked = false;
        this.enableTransitions(true);
        Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.STATECHANGE);
      },
      priority: QUEUE_PRIORITY.STATECHANGE,
    });
  }
}
