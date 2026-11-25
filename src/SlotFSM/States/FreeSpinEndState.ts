import SpinEndState from "./SpinEndState";
import {
  GameEvents,
  PopUps,
  GAME,
  GameView,
  PopUpType,
  Events,
  QUEUE,
  QUEUE_PRIORITY,
  QUEUEACTIONEND,
  ScreenSwitchTransition,
} from "../../Data/GameConstants";

/** Port of Royal Tower FreeSpinEndState: SpinEnd plus the free spin end flow (FreeGameWin + transition). */
export default class FreeSpinEndState extends SpinEndState {
  constructor(name = "FreeSpinEndState") {
    super(name);
  }

  checkFreeSpinEnd() {
    GAME.setFreeSpinsMode(); // startExiting relies on the value, not on the property change event.
    if (!GAME.freeSpinsEnabled) {
      setTimeout(() => {
        GAME.freeSpinLevelCounter = 0;
        GAME.baseSpinLevelCounter = 0;
        PopUps.show(PopUpType.FreeGameWin);
        this.startFreespinEndTransition();
      }, 1000);
    } else {
      Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.FREESPINEND);
    }
  }

  setWinnings(): void {
    super.setWinnings();
    if (GAME.CurrentScreen >= GAME.totalScreen - 1) {
      QUEUE.enQueue({
        execute: () => this.checkFreeSpinEnd(),
        priority: QUEUE_PRIORITY.FREESPINEND,
      });
    }
  }

  startFreespinEndTransition() {
    QUEUE.enQueue({
      execute: () => {
        GAME.freespinCounter = 0;
        ScreenSwitchTransition.switchToScreen(() => {
          GameView.toggleFreeSpinsUI(false);
          GAME.isWarehouseEnabled = false;
        });
        setTimeout(
          () => Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.TRANSITION),
          3500,
        );
      },
      priority: QUEUE_PRIORITY.TRANSITION,
    });
  }

  checkNextSpin() {
    if (GAME.CurrentScreen < GAME.totalScreen - 1) {
      QUEUE.enQueue({
        execute: () => {
          this.enableTransitions(true);
          Events.emit(GameEvents.ON_RESPIN_FREESPIN_START, true);
          Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.STATECHANGE);
        },
        priority: QUEUE_PRIORITY.STATECHANGE,
      });
    } else {
      this.startExiting();
    }
  }
}
