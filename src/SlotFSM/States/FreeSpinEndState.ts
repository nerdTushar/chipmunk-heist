import {
  QUEUE_PRIORITY,
  QUEUE,
  PopUps,
  PopUpType,
  Events,
  QUEUEACTIONEND,
  GAME,
  GameEvents,
  REELM,
  BottomUI,
  BuyFeatureId,
  GameView,
  BuyFeaturePrice,
} from "../../Data/GameConstants";
import SpinEndState from "./SpinEndState";
import { ScreenSwitchTransition } from "../../utils/ScreenSwitchTransition";

export class FreeSpinEndState extends SpinEndState {
  checkFreeSpinEnd() {
    GAME.setFreeSpinsMode(); //StartExiting will also call it again, so don't rely on property change event.
    if (!GAME.freeSpinsEnabled) {
      setTimeout(() => {
        GAME.freeSpinLevelCounter = 0;
        GAME.baseSpinLevelCounter = 0;
        PopUps.show(PopUpType.FreeGameWin);
        this.startFreespinEndTransition();
      }, 1000)
    } else {
      Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.FREESPINEND);
    }
  }

  setWinnings(): void {
    super.setWinnings();
    if (GAME.CurrentScreen >= GAME.totalScreen - 1) {
      QUEUE.enQueue({
        execute: () => {
          this.checkFreeSpinEnd();
        },
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
        })

        setTimeout(() => {
          Events.emit(QUEUEACTIONEND);
        }, 3500);
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
          Events.emit(QUEUEACTIONEND);
        },
        priority: QUEUE_PRIORITY.STATECHANGE,
      });
    } else {
      this.startExiting();
    }
  }
}