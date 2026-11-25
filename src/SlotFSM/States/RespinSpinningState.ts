import SMState from "../StateMachine/SMState";
import {
  GameEvents,
  GAME,
  REELM,
  Events,
  QUEUE,
  QUEUE_PRIORITY,
  QUEUEACTIONEND,
} from "../../Data/GameConstants";
import { StakeRoundStateType } from "../../Data/StakePlayResponse";

/**
 * Port of Royal Tower RespinSpinningState: advances to the next stake state of the current spin,
 * plays the cascade for a `tumbleBoard`, then hands back to SpinEnd / FreeSpinEnd.
 */
export default class RespinSpinningState extends SMState {
  constructor(name = "RespinSpinningState") {
    super(name);
  }

  enterState(): void {
    super.enterState();
    this.respin();
  }

  createNewReel() {
    if (GAME.getCurrentStakeState() == StakeRoundStateType.TUMBLE_BOARD) {
      const tumble = GAME.getCurrentStakeResponseByType("tumbleBoard");
      REELM.deleteCascade(tumble.explodingSymbols, tumble.newSymbols);
    }
    this.startExiting();
  }

  respin() {
    try {
      GAME.CurrentScreen++;
      if (GAME.getCurrentStakeState() == StakeRoundStateType.TUMBLE_BOARD) {
        REELM.showFloatingTumbleWinnings();
      }
      this.createNewReel();
      GAME.respinCounter++;
    } catch (err) {
      console.error("Error during respin:", err);
    }
  }

  startExiting() {
    QUEUE.enQueue({
      execute: () => {
        this.enableTransitions(true);
        if (GAME.freeSpinsEnabled) {
          Events.emit(GameEvents.ON_RESPIN_FREESPIN_END, true);
        } else {
          Events.emit(GameEvents.ON_RESPIN_END, true);
        }
        Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.STATECHANGE);
      },
      priority: QUEUE_PRIORITY.STATECHANGE,
    });
  }
}
