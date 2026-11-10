import {
  Events,
  PopUpType,
  QUEUE,
  QUEUE_PRIORITY,
  QUEUEACTIONEND,
  GameEvents,
  PopUps,
  GAME,
  GameView,
  REELM,
  convertTo2DArray,
  Sounds,
  SFX,
  parseUrlParams,
  API,
  APIs,
  Paylines,
  getMatrixTranspose,
  BuyFeaturePrice,
  BottomUI,
  BuyFeatureId,
} from "../../Data/GameConstants";

import SMState from "../../utils/StateMachine/SMState";
import { ScreenSwitchTransition } from "../../utils/ScreenSwitchTransition";
import { BOOK_AMOUNT_MULTIPLIER } from "db://assets/StakeClient/constants";
import { expectBalance as uiValidatorExpectBalance, endRound as uiValidatorEndRound } from "../../SlotValidation/UIValidatorRuntime";
import { recordRoundSettled as spinValidatorRecordRoundSettled } from "../../SlotValidation/SpinValidation";
import { API_AMOUNT_MULTIPLIER, endRound, RGSError } from "../../../StakeClient/client";
import { StakeEnterBonusState, StakeFinalWinState, StakeRevealState, StakeRoundStateType, StakeSetTotalWinState, StakeSetWinState, StakeUpdateFreeSpinState, StakeUpdateTumbleWinState, StakeWarehouseSpinState, StakeWinInfo, StakeWinInfoState } from "../../Data/StakePlayResponse";

export default class SpinEndState extends SMState {
  currentColumn: number = -1;
  mat1: any = null;
  matrix: string[][] = [];
  paylineData: StakeWinInfo[];
  firstReelIndex = 100;
  lastReel: number = 0;
  respin: boolean = false;

  enterState() {
    // debugger;
    super.enterState();
    this.respin = false;
    this.mat1 = null;
    this.matrix = [];
    this.lastReel = 0;
    this.currentColumn = -1;
    this.paylineData = [];
    this.setReelMatrix();
    PopUps.hideAllPopUps();
    BottomUI.autoUiFunctionality(GAME.autoToggle);

    if (GAME.CurrentScreen > 0) {
      this.respin = true;
      this.setWinnings();
    } else {
      this.generateInstant(0);
      if (GAME.respinOnInit == true) {
        GAME.respinOnInit = false;
      }
    }

  }

  onKeyDown(event: EventKeyboard) {
    if (event.keyCode == KeyCode.SPACE) {
      if (GAME.isStopRequested == true) return;
      GAME.isStopRequested = true;
      Events.emit(GameEvents.ON_SPIN_STOP, true);
    }
  }

  protected onGameEvent(gameEvent: string, data: any): void {
    switch (gameEvent) {
      case GameEvents.ON_REEL_STOP:
        this.generateReelStop(data);
        break;
      case GameEvents.ON_SPIN_STOP:
        if (this.lastReel == 5 || this.respin == true) return;
        GAME.isStopRequested = true;
        this.unscheduleAllCallbacks();
        this.generateInstant(this.lastReel + 1);
        break;
    }
  }

  setReelMatrix() {
    if (GAME.getCurrentStakeState() == StakeRoundStateType.REVEAL) {
      let stakeRevealState: StakeRevealState = GAME.getStakeStateByIndex(GAME.CurrentScreen) as StakeRevealState;
      this.mat1 = stakeRevealState.board;
    }
  }

  generateInstant(initialReel: number) {
    for (let i = initialReel; i < 6; i++) {
      if (
        (GAME.turboToggle == true) ||
        (GAME.isStopRequested == true)
      ) {
        this.generateReelStop(i);
      } else {
        this.scheduleOnce(() => {
          this.generateReelStop(i);
        }, 0.1 * i);
      }
    }
  }

  generateReelStop(column) {
    this.currentColumn = column;
    let tempColumn = column;
    this.matrix[tempColumn] = this.mat1[tempColumn];

    REELM.generateReel(this.matrix[tempColumn], tempColumn);
    this.lastReel = column;
    if (this.currentColumn == 5) {
      let delay: number = GAME.turboToggle ? 0 : 500;
      setTimeout(() => {
        if (GAME.CurrentScreen <= 0) {
          this.setWinnings();
        }
      }, delay);
    }
  }


  checkForAnticipation() {
    if (GAME.Next.Type != 10 || GAME.Current.Type == 10) return;

    let ignoreReelAnticipation = true;
    for (var i = 0; i < 6; i++) {
      let reelMatrix: boolean = false;
      if (this.checkAnticipationForReel(this.mat1[i])) {
        if (!ignoreReelAnticipation) {
          reelMatrix = true;
        }

        ignoreReelAnticipation = false;
      }
      if (reelMatrix) {
        this.firstReelIndex = i;
        break;
      }
    }
  }

  isWildAppear() {
    var wildSymbolId = 1;
    for (var i = 0; i < this.mat1.length; i++) {
      for (var j = 0; j < this.mat1[i].length; j++) {
        if (this.mat1[i][j] == wildSymbolId) {
          return true;
        }
      }
    }

    return false;
  }

  setPaylineData() {
    let stakeWinInfoState: StakeWinInfoState = GAME.getStakeStateByIndex(GAME.CurrentScreen) as StakeWinInfoState;
    this.paylineData = stakeWinInfoState.wins;
  }

  checkAnticipationForReel(matrix) {
    let scatterSymbolId = 10;
    for (let i = 0; i < matrix.length; i++) {
      if (matrix[i] == scatterSymbolId) return true;
    }

    return false;
  }

  setWinnings() {
    this.firstReelIndex = 100;

    if (GAME.getCurrentStakeState() == StakeRoundStateType.WIN_INFO) {
      let stakeWinInfoState: StakeWinInfoState = GAME.getStakeStateByIndex(GAME.CurrentScreen) as StakeWinInfoState;
      this.setPaylineData();
      GAME.currentStakeWinInfo = GAME.getCurrentStakeResponseByType("winInfo").wins;
      GAME.prevPayline = this.paylineData;
      REELM.showPaylines(this.paylineData);
    }

    if (GAME.getCurrentStakeState() == StakeRoundStateType.UPDATE_TUMBLE_WIN) {
      let bet = GAME.bet;
      GAME.Current.RoundWin = GAME.getCurrentStakeResponseByType("updateTumbleWin").amount / BOOK_AMOUNT_MULTIPLIER * bet;
    }

    this.calculateAllWins();

    if (GAME.getCurrentStakeState() == StakeRoundStateType.SET_TOTAL_WIN) {
      let totalWinState: StakeSetTotalWinState = GAME.getStakeStateByIndex(GAME.CurrentScreen) as StakeSetTotalWinState;
      let bet: number = GAME.bet;
      GAME.Current.TotalWin = (totalWinState.amount / BOOK_AMOUNT_MULTIPLIER) * bet;
      if (totalWinState.amount > 0) {
        if (GAME.hasStakeState(StakeRoundStateType.WIN_INFO) && GAME.isLastStakeStateInSpin(StakeRoundStateType.SET_TOTAL_WIN)) {
          this.startShowingWins(GAME.Current.RoundWin);
        }
      }
    }

    if (GAME.getCurrentStakeState() == StakeRoundStateType.UPDATE_FREE_SPIN) {
      let stakeUpdateFreespinState: StakeUpdateFreeSpinState = GAME.getStakeStateByIndex(GAME.CurrentScreen) as StakeUpdateFreeSpinState;
      GAME.totalFreeSpins = stakeUpdateFreespinState.total;
    }
    REELM.animateScatter();
    this.openFreeSpinPopup();
    this.startTransition();
    this.spinEndApi();
    this.checkNextSpin();
    this.startExiting();
  }

  checkNextSpin() {
    if (GAME.CurrentScreen < GAME.totalScreen - 1) {
      QUEUE.enQueue({
        execute: () => {
          this.enableTransitions(true);
          Events.emit(GameEvents.ON_RESPIN_START, true);
          Events.emit(QUEUEACTIONEND);
        },
        priority: QUEUE_PRIORITY.STATECHANGE,
      });
    }
  }

  calculateAllWins() {
    if (GAME.getCurrentStakeState() == StakeRoundStateType.SET_TOTAL_WIN && GAME.Current.RoundWin === 0) {
      QUEUE.enQueue({
        execute: () => {
          REELM.getMultiplierSymbols();
        },
        priority: QUEUE_PRIORITY.TOTAL_WIN_CALCULATION,
        // skip: () => {
        //   REELM.skipToEndCalculation();
        // }
      })
    }
    if (GAME.getCurrentStakeState() == StakeRoundStateType.SET_TOTAL_WIN && GAME.Current.RoundWin > 0) {
      QUEUE.enQueue({
        execute: () => {
          REELM.startMultiplierCalculation();
        },
        priority: QUEUE_PRIORITY.TOTAL_WIN_CALCULATION,
        // skip: () => {
        //   REELM.skipToEndCalculation();
        // }
      })

    }
  }

  startShowingWins(winnings: number) {
    if (winnings >= 15 * GAME.bet && !this.machine.isFirstState(this) && !GAME.IsMaxWin) {
      QUEUE.enQueue({
        execute: () => {
          setTimeout(() => {
            Sounds.stopSound();
            GameView.setWinAnimation(winnings);
          }, 200)
        },
        priority: QUEUE_PRIORITY.BIGWIN,
      });
    }
  }


  showMaxWin() {
    if (GAME.IsMaxWin && GAME.CurrentScreen >= GAME.totalScreen - 1) {
      QUEUE.enQueue({
        execute: () => {
          GameView.openMaxWin(GAME.Current.RoundWin)
        },
        priority: QUEUE_PRIORITY.MAXWIN
      })
    }
  }

  startTransition() {
    if (GAME.getCurrentStakeState() == StakeRoundStateType.FREE_SPIN_TRIGGER) {
      QUEUE.enQueue({
        execute: () => {
          ScreenSwitchTransition.switchToScreen(() => {
            GameView.toggleFreeSpinsUI(true)
            // PopUps.hide(PopUpType.PICKFREEGAME);
          })

          setTimeout(() => {
            Events.emit(QUEUEACTIONEND)
          }, 3500);
        },
        priority: QUEUE_PRIORITY.TRANSITION,
      });
    }
  }

  openPickFreegamePopup() {
    if (GAME.Next.Type == 10 && GAME.freeSpinsEnabled == false && GAME.CurrentScreen >= GAME.totalScreen - 1) {
      QUEUE.enQueue({
        execute: () => {
          ScreenSwitchTransition.switchToScreen(() => {
            // PopUps.show(PopUpType.PICKFREEGAME);
          })
        },
        priority: QUEUE_PRIORITY.PICK_FREE_GAME,
      });
    }
  }

  openFreeSpinPopup() {
    let isRetrigger: boolean = GAME.getCurrentStakeState() == StakeRoundStateType.FREE_SPIN_RETRIGGER;
    if (GAME.getCurrentStakeState() == StakeRoundStateType.FREE_SPIN_TRIGGER || isRetrigger) {
      QUEUE.enQueue({
        execute: () => {
          GAME.setFreeSpinsMode();
          if (GAME.isWarehouseEnabled) {
            Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.FREESPINSTART);
          }
          else {
            setTimeout(() => {
              PopUps.show(PopUpType.FreeGame, isRetrigger);
            }, 500);
          }
        },
        priority: QUEUE_PRIORITY.FREESPINSTART,
      });
    }
  }

  startExiting() {
    QUEUE.enQueue({
      execute: () => {
        GAME.respinCounter = 0;
        this.enableTransitions(true);
        Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.STATECHANGE);
      },
      priority: QUEUE_PRIORITY.STATECHANGE,
    });
  }

  spinEndApi() {
    let stakeFinalWinState: StakeFinalWinState = GAME.getStakeStateByIndex(GAME.CurrentScreen) as StakeFinalWinState;
    if (GAME.getCurrentStakeState() == StakeRoundStateType.FINAL_WIN && stakeFinalWinState.amount > 0 && !GAME.isReplay) {
      QUEUE.enQueue({
        execute: async () => {
          if (GAME.hasPreRefreshData) {
            GAME.Player.Balance = GAME.pendingBalance;
            BottomUI.setBalance(GAME.Player.Balance);
            GAME.hasPreRefreshData = false;
            Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.SPIN_END_API);
            return;
          }
          endRound().then((response) => {
            console.log("Round End Response: ", response);
            if (DEBUG) uiValidatorExpectBalance(response.balance.amount, "endRound");
            GAME.Player.Balance = response.balance.amount / API_AMOUNT_MULTIPLIER;
            BottomUI.setBalance(GAME.Player.Balance);
            // Close the validator round now that the endRound balance has been
            // tapped — otherwise the overlay only renders at the next spin and
            // ends up missing this round's endRound result.
            if (DEBUG) uiValidatorEndRound();
            // Complete the SpinValidation Balance section so the dev panel
            // re-renders with the final bet-debit + payout-credit verdict and
            // any failing round (or free-game round) auto-saves to JSON.
            if (DEBUG) spinValidatorRecordRoundSettled(response);
            Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.SPIN_END_API);
          }).catch((error) => {
            const errorCode = error instanceof RGSError ? error.message : null;
            // PopUps.show(PopUpType.NetworkErrorPopUp, errorCode);
            Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.SPIN_END_API);
          })
        },
        priority: QUEUE_PRIORITY.SPIN_END_API,
      });
    }
  }

  showBonusRedeemEndPopup() {
    if (GAME.CurrentScreen >= GAME.totalScreen - 1 && GAME.isBonusRedeemed && GAME.bonusSpinCount <= 0) {
      QUEUE.enQueue({
        execute: () => {
          GAME.isBonusRedeemed = false;
          // PopUps.show(PopUpType.BonusRedeemEnd);
        },
        priority: QUEUE_PRIORITY.BONUS_REDEEM_END,
      });
    }
  }
}