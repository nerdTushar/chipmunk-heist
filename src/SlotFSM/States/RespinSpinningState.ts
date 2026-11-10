import {
  API,
  APIs,
  Events,
  GAME,
  GameEvents,
  GameView,
  PopUps,
  PopUpType,
  QUEUE,
  QUEUE_PRIORITY,
  QUEUEACTIONEND,
  REELM,
  Sounds,
} from "../../Data/GameConstants";
import SMState from "../../utils/StateMachine/SMState";
import { StakeRoundStateType } from "../../Data/StakePlayResponse";

export class RespinSpinningState extends SMState {
  newReel: any = null;
  enterState(): void {
    super.enterState();
    this.newReel = null;
    this.respin();
  }



  createNewReel() {
    console.log("creating new reel for respin ", GAME.getCurrentStakeState());
    if (GAME.getCurrentStakeState() == StakeRoundStateType.TUMBLE_BOARD) {
      const explodingSymbols = GAME.getCurrentStakeResponseByType("tumbleBoard").explodingSymbols;
      const newSymbols = GAME.getCurrentStakeResponseByType("tumbleBoard").newSymbols;
      console.log("explodingSymbols ", explodingSymbols, " newSymbols ", newSymbols);
      REELM.deleteCascade(explodingSymbols, newSymbols)
    }
    this.startExiting();
  }

  async respin() {
    try {
      GAME.CurrentScreen++;
      if (GAME.getCurrentStakeState() == StakeRoundStateType.TUMBLE_BOARD) {
        console.log("Requesting respin API with current screen ", GAME.getCurrentStakeState());
        REELM.showFloatingTumbleWinnings();
      }
      this.createNewReel();
      GAME.respinCounter++;
      // GameView.setIndicatorBalls();
    } catch (err) {
      console.error("Error during respin:", err);
      // PopUps.show(PopUpType.NetworkErrorPopUp, GAME);
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
        Events.emit(QUEUEACTIONEND);
      },
      priority: QUEUE_PRIORITY.STATECHANGE,
    });
  }
}