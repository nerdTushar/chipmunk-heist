import SMState from "../../utils/StateMachine/SMState";
import {
  Events,
  GAME,
  GameEvents,
  GameView,
  PopUps,
  PopUpType,
  REELM,
  QUEUE,
  QUEUE_PRIORITY,
  QUEUEACTIONEND,
  SFX,
  Sounds,
  BottomUI,
} from "../../Data/GameConstants";

export class IdleState extends SMState {
  enterState() {
    super.enterState();

    PopUps.hideAllPopUps();
    if (GAME.Player.Balance < GAME.bet) {
      if (GAME.autoToggle) {
        PopUps.show(PopUpType.InsufficientBalance);
      }
      GAME.autoToggle = false;
      GAME.isSpaceHold = false;
    }
    GAME.isUILocked = false;

    BottomUI.checkForAutoSpins();
    BottomUI.toggleCreditBtnUI(true);
    BottomUI.autoUiFunctionality(true);
    BottomUI.toggleMenuButtons(true);
    BottomUI.setBalance(GAME.Player.Balance);
    if (GAME.isReplay) {
      BottomUI.enableReplayButton(true);
    }
    if (GAME.isReplay && !GAME.isIdleInitState) {
      PopUps.show(PopUpType.ReplayPopup, { calledFromLoginScreen: false });
    }

    GAME.isStopRequested = false
    // Sounds.stopSound();
    GameView.checkForAutoSpins();
    GameView.toggleBuyFreeSpin(true);
    GameView.toggleAnteBet(true);
    GameView.toggleFreeSpinsUI(false);
    Sounds.playMusicAudio(SFX.BGM);
    GAME.isSuperFeatureBought = false;
    let delay = 0;
    // if(GAME.autoToggle){
    //   300;
    // }
    setTimeout(() => {
      this.changeState();
    }, delay);
  }

  update(dt: number): void {
    super.update(dt);
    if (!GAME.autoToggle) {
      BottomUI.toggleSpinUI(true);
    }
  }

  onKeyDown(event: EventKeyboard) {
    if (event.keyCode == KeyCode.SPACE) {
      Events.emit(GameEvents.ON_SPIN_START, true);
    }
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
        Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.STATECHANGE)
      },
      priority: QUEUE_PRIORITY.STATECHANGE,
    });
  }
}