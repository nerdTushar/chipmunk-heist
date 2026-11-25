import SMState from "../StateMachine/SMState";
import {
  GameEvents,
  PopUps,
  GAME,
  GameView,
  PopUpType,
  REELM,
  Events,
  BuyFeaturePrice,
  QUEUE,
  QUEUE_PRIORITY,
  QUEUEACTIONEND,
  BottomUI,
  anteBetAmount,
} from "../../Data/GameConstants";
import { play, replay, RGSError } from "../../StakeClient/client";
import { API_AMOUNT_MULTIPLIER } from "../../StakeClient/constants";
import { FreespinResponseSplitter } from "../../utils/FreespinResponseSplitter";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getResponse } from "../../MockServerScript";

/**
 * Port of Royal Tower SpinningState: starts the reel spin, queues the RESET task, calls the RGS
 * (`play` / `replay`, or advances to the next pre-split free spin) and finally queues the
 * STATECHANGE task that enables Spin2SpinEnd (ON_SPIN_STOP).
 */
export default class SpinningState extends SMState {
  constructor(name = "SpinningState") {
    super(name);
  }

  enterState() {
    super.enterState();
    void this.run();
  }

  private async run() {
    GAME.isStopRequested = GAME.isSpaceHold;

    let bet = GAME.bet;
    if (GAME.featureBought) {
      bet = GAME.bet * (BuyFeaturePrice[GAME.featureId] ?? 200);
    } else if (GAME.BonusBoostFeatureBought) {
      bet = GAME.bet * anteBetAmount;
    }

    if (
      !GAME.freeSpinsEnabled &&
      !GAME.isReplay &&
      GAME.Player.Balance < bet &&
      !GAME.featureBought
    ) {
      PopUps.show(PopUpType.InsufficientBalance);
      return;
    }

    BottomUI.toggleCreditBtnUI(false);
    BottomUI.autoUiFunctionality(GAME.autoToggle);
    BottomUI.enableReplayButton(false);
    BottomUI.onCloseMenu();
    BottomUI.toggleMenuButtons(false);
    REELM.resetTumbleWin();
    GameView.spinReels();
    this.destroyPreviousReel();
    await this.callSpinAPI();
  }

  destroyPreviousReel() {
    QUEUE.enQueue({
      execute: () => {
        REELM.resetReels();
      },
      priority: QUEUE_PRIORITY.RESET,
      skip: () => {
        REELM.stopAllTweens();
        REELM.unshceduleAllReelManagerCallbacks();
        REELM.destroyInstantly();
        Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.RESET);
      },
    });
  }

  changeState() {
    QUEUE.enQueue({
      execute: () => {
        this.enableTransitions(true);
        Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.STATECHANGE);
        if (GAME.turboToggle || GAME.isStopRequested) {
          // Fired again: a stop requested before the response arrived transitions now.
          this.emitter.emit(GameEvents.ON_SPIN_STOP, true);
        }
      },
      priority: QUEUE_PRIORITY.STATECHANGE,
    });
  }

  protected onGameEvent(gameEvent: string, _data: any) {
    if (gameEvent == GameEvents.ON_SPIN_STOP) {
      GAME.isStopRequested = true;
    }
  }

  afterSpin() {
    GAME.Current.RoundWin = 0;
    if (!GAME.isReplay && GAME.stakeResponse?.balance) {
      GAME.Player.Balance =
        GAME.stakeResponse.balance.amount / API_AMOUNT_MULTIPLIER;
    }

    if (!GAME.freeSpinsEnabled) {
      GAME.autoSpinCount -= 1;
      BottomUI.updateAutoSpinCount();
    } else {
      GAME.freespinCounter += 1;
    }

    GAME.totalScreen =
      GAME.getCurrentSplitResponse()?.round.state.length ??
      GAME.stakeResponse.round.state.length;
    GAME.CurrentScreen = 0;
    GAME.featureBought = false;
    GAME.shouldReplay = false;
    GAME.featureId = "";
    GAME.currentWarehouseSpinState = null;
    this.changeState();
  }

  async callSpinAPI() {
    try {
      if (GAME.freeSpinsEnabled) {
        GAME.currentSplitSpinIndex++;
        GAME.currentFreeSpins++;
        GameView.updateFreeSpinsCount();
      } else {
        if (GAME.isReplay) {
          const response = await replay(GAME.replayParams);
          GAME.setReplayData(response);
          if (GAME.replayParams?.amount)
            GAME.stakeResponse.round.amount = GAME.replayParams.amount;
        } else {
          let mode = "base";
          if (GAME.BonusBoostFeatureBought) mode = "ante";
          else if (GAME.featureBought) mode = "bonus";
          let response: any = null;
          // response = await play({
          //   amount: GAME.bet, // e.g., 1.00 currency unit
          //   mode, // Must match modes defined in your Python Config
          // });
          response = getResponse();
          GAME.setISPINData(response);
        }
        GAME.currentSplitSpinIndex = 0;
        GAME.splitSpinResponses = FreespinResponseSplitter.splitResponse(
          GAME.stakeResponse,
        );
      }
      console.log(
        "[SPINNING STATE] split response:",
        GAME.getCurrentSplitResponse(),
      );
      this.afterSpin();
    } catch (err) {
      console.error("[SPINNING STATE] spin failed", err);
      const errorCode = err instanceof RGSError ? err.message : null;
      PopUps.show(PopUpType.NetworkErrorPopUp, errorCode);
    }
  }
}
