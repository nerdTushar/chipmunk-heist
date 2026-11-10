import {
  API,
  APIs,
  GameEvents,
  PopUps,
  SFX,
  Sounds,
  GAME,
  GameView,
  PopUpType,
  REELM,
  Events,
  MESSAGES,
  parseUrlParams,
  BuyFeaturePrice,
  BuyFeatureId,
  QUEUE,
  QUEUE_PRIORITY,
  QUEUEACTIONEND,
  BottomUI,
  buyFreeSpinAmount,
  anteBetAmount,
} from "../../Data/GameConstants";

import SMState from "../../utils/StateMachine/SMState";
import IUSER from "../../Data/IUSER";
import { play, replay, RGSError } from "db://assets/StakeClient/client";
import { FreespinResponseSplitter } from "../../utils/FreespinResponseSplitter";
import { API_AMOUNT_MULTIPLIER } from "db://assets/StakeClient/constants";
import { DEBUG } from "cc/env";
import { beginRound as uiValidatorBeginRound, expectBalance as uiValidatorExpectBalance } from "../../SlotValidation/UIValidatorRuntime";
import { validateSpin as spinValidatorValidateSpin } from "../../SlotValidation/SpinValidation";
import { FreeGameRes, getResponse, NormalSpinResponse, NormalSpinResponse1 } from "../../MockServer/MockServerScript";

export default class SpinningState extends SMState {
  async enterState() {
    super.enterState();
    // input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    GAME.isStopRequested = GAME.isSpaceHold;
    let bet = GAME.bet;
    if (GAME.featureBought) {
      bet = GAME.bet * buyFreeSpinAmount;
    } else if (GAME.BonusBoostFeatureBought) {
      bet = GAME.bet * anteBetAmount;
    }
    if (!GAME.freeSpinsEnabled && GAME.Player.Balance < bet) {
      PopUps.show(PopUpType.InsufficientBalance)
      return;
    }
    BottomUI.toggleCreditBtnUI(false);
    BottomUI.autoUiFunctionality(GAME.autoToggle);
    BottomUI.enableReplayButton(false);
    BottomUI.onCloseMenu();
    BottomUI.toggleMenuButtons(false);
    REELM.tumbleWinNode.reset();
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
        REELM.destroyInstantly()
        Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.RESET)
      }
    });
  }

  changeState() {
    QUEUE.enQueue({
      execute: () => {
        this.enableTransitions(true);
        Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.STATECHANGE)
        if (GAME.turboToggle || GAME.isStopRequested) {
          this.emitter.emit(GameEvents.ON_SPIN_STOP, true); //Fired Again, if stop was requested before, to transition after response.
        }
      },
      priority: QUEUE_PRIORITY.STATECHANGE,
    });
  }

  protected async onGameEvent(gameEvent: string, data: any) {
    if (gameEvent == GameEvents.ON_SPIN_STOP) {
      GAME.isStopRequested = true;
    }
  }

  afterSpin(userData) {
    GAME.Current.RoundWin = 0;
    console.log("[SPINNING STATE] Spin Response userData: ", userData);
    if (!GAME.isReplay) GAME.Player.Balance = GAME.stakeResponse.balance.amount / API_AMOUNT_MULTIPLIER;
    if (!GAME.freeSpinsEnabled) {
      GAME.autoSpinCount -= 1;
      BottomUI.updateAutoSpinCount();
    }

    if (GAME.freeSpinsEnabled) {
      if (GAME.isWarehouseEnabled && GAME.freespinCounter >= 3) {
        GAME.freespinCounter = 3;
      }
      else {
        GAME.freespinCounter += 1;
      }
    }
    GAME.totalScreen = GAME.getCurrentSplitResponse().round.state.length;
    GAME.CurrentScreen = 0;
    GAME.featureBought = false;
    GAME.shouldReplay = false;
    GAME.featureId = "";
    GAME.currentWarehouseSpinState = null;
    if (GAME.freeSpinsEnabled && GAME.isWarehouseEnabled) {
      GAME.deductLife();
      GAME.isFlashTeamATurn = true;
      GAME.flashBeamIndex = 0;
    }
    this.changeState();
  }

  async callSpinAPI() {
    try {
      if (GAME.freeSpinsEnabled) {
        GAME.currentSplitSpinIndex++;
        GAME.currentFreeSpins++;
        GameView.updateFreeSpinsCount();
      }
      else {
        let response = null;
        if (GAME.isReplay) {
          response = await replay(GAME.replayParams);
          GAME.setReplayData(response);
        } else {
          let _mode = 'bonus';
          let bet: number = GAME.bet;
          if (GAME.BonusBoostFeatureBought) {
            _mode = "ante";
          } else if (GAME.featureBought) {
            _mode = "bonus";
          } else {
            _mode = "base";
          }
          // response = await play({
          //   amount: bet, // e.g., 1000000 for 1.00 currency unit
          //   mode: _mode       // Must match modes defined in your Python Config
          // });
          response = getResponse();
          GAME.setISPINData(response);
        }
        GAME.currentSplitSpinIndex = 0;
        GAME.splitSpinResponses = FreespinResponseSplitter.splitResponse(GAME.stakeResponse);
        // console.log("[SPINNING STATE] - Split Spin Responses: ", GAME.splitSpinResponses);
        // console.log("[SPINNING STATE] - Split Spin Responses: ", JSON.stringify(GAME.splitSpinResponses));
      }
      console.log("[SPINNING STATE] - Current Split Spin Response: ", GAME.getCurrentSplitResponse());
      this.afterSpin(GAME.stakeResponse);
    } catch (err) {
      const errorCode = err instanceof RGSError ? err.message : null;
      PopUps.show(PopUpType.NetworkErrorPopUp, errorCode);
      window.customLogger.error("error " + err.stack);
    }
  }
}