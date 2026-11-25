import SMState from "../StateMachine/SMState";
import {
  GameEvents,
  PopUps,
  Sounds,
  GAME,
  GameView,
  PopUpType,
  REELM,
  Events,
  QUEUE,
  QUEUE_PRIORITY,
  QUEUEACTIONEND,
  BottomUI,
  ScreenSwitchTransition,
} from "../../Data/GameConstants";
import {
  StakeBoardSymbol,
  StakeFinalWinState,
  StakeRoundStateType,
  StakeSetTotalWinState,
  StakeUpdateFreeSpinState,
  StakeWinInfo,
  StakeWinInfoState,
} from "../../Data/StakePlayResponse";
import { endRound } from "../../StakeClient/client";
import {
  API_AMOUNT_MULTIPLIER,
  BOOK_AMOUNT_MULTIPLIER,
} from "../../StakeClient/constants";

/**
 * Port of Royal Tower SpinEndState. Lands the reels column by column (instantly on stop / turbo),
 * then walks the current stake state and queues its presentation: paylines, tumble wins,
 * multiplier total, big wins, scatter + free spin popup + transition, endRound and the
 * STATECHANGE tasks that drive Respin / Idle / FreeSpinIdle.
 */
export default class SpinEndState extends SMState {
  currentColumn: number = -1;
  mat1: StakeBoardSymbol[][] = null;
  matrix: StakeBoardSymbol[][] = [];
  paylineData: StakeWinInfo[] = [];
  lastReel: number = 0;
  respin: boolean = false;

  constructor(name = "SpinEndState") {
    super(name);
  }

  protected get columnCount() {
    return this.mat1?.length ?? 6;
  }

  enterState() {
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

    if (GAME.CurrentScreen > 0 || !this.mat1) {
      this.respin = true;
      this.setWinnings();
    } else {
      this.generateInstant(0);
      if (GAME.respinOnInit == true) GAME.respinOnInit = false;
    }
  }

  protected onGameEvent(gameEvent: string, data: any): void {
    switch (gameEvent) {
      case GameEvents.ON_REEL_STOP:
        this.generateReelStop(data);
        break;
      case GameEvents.ON_SPIN_STOP:
        if (this.lastReel == this.columnCount - 1 || this.respin == true)
          return;
        GAME.isStopRequested = true;
        this.unscheduleAllCallbacks();
        this.generateInstant(this.lastReel + 1);
        break;
    }
  }

  setReelMatrix() {
    const reveal =
      GAME.getCurrentStakeState() == StakeRoundStateType.REVEAL
        ? GAME.getCurrentStakeResponseByType("reveal")
        : GAME.getStakeResponseByType("reveal");
    this.mat1 = reveal?.board ?? null;
  }

  generateInstant(initialReel: number) {
    for (let i = initialReel; i < this.columnCount; i++) {
      if (GAME.turboToggle == true || GAME.isStopRequested == true) {
        this.generateReelStop(i);
      } else {
        this.scheduleOnce(
          () => this.generateReelStop(i),
          0.1 * (i - initialReel + 1),
        );
      }
    }
  }

  generateReelStop(column: number) {
    if (!this.mat1) return;
    this.currentColumn = column;
    this.matrix[column] = this.mat1[column];
    REELM.generateReel(this.matrix[column], column);
    this.lastReel = column;
    if (this.currentColumn == this.columnCount - 1) {
      const delay = GAME.turboToggle ? 0 : 500;
      this.scheduleOnce(() => {
        if (GAME.CurrentScreen <= 0) this.setWinnings();
      }, delay / 1000);
    }
  }

  setPaylineData() {
    const state = GAME.getStakeStateByIndex(
      GAME.CurrentScreen,
    ) as StakeWinInfoState;
    this.paylineData = state?.wins ?? [];
  }

  setWinnings() {
    const current = GAME.getCurrentStakeState();

    if (current == StakeRoundStateType.WIN_INFO) {
      this.setPaylineData();
      GAME.currentStakeWinInfo = this.paylineData;
      GAME.prevPayline = this.paylineData;
      REELM.showPaylines(this.paylineData);
    }

    if (current == StakeRoundStateType.UPDATE_TUMBLE_WIN) {
      GAME.Current.RoundWin =
        (GAME.getCurrentStakeResponseByType("updateTumbleWin").amount /
          BOOK_AMOUNT_MULTIPLIER) *
        GAME.bet;
    }

    this.calculateAllWins();

    if (current == StakeRoundStateType.SET_TOTAL_WIN) {
      const totalWinState = GAME.getStakeStateByIndex(
        GAME.CurrentScreen,
      ) as StakeSetTotalWinState;
      GAME.Current.TotalWin =
        (totalWinState.amount / BOOK_AMOUNT_MULTIPLIER) * GAME.bet;
      if (totalWinState.amount > 0) {
        if (
          GAME.hasStakeState(StakeRoundStateType.WIN_INFO) &&
          GAME.isLastStakeStateInSpin(StakeRoundStateType.SET_TOTAL_WIN)
        ) {
          this.startShowingWins(GAME.Current.RoundWin);
        }
      }
    }

    if (current == StakeRoundStateType.UPDATE_FREE_SPIN) {
      const state = GAME.getStakeStateByIndex(
        GAME.CurrentScreen,
      ) as StakeUpdateFreeSpinState;
      GAME.totalFreeSpins = state.total;
      GameView.updateFreeSpinsCount();
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
    if (GAME.getCurrentStakeState() != StakeRoundStateType.SET_TOTAL_WIN)
      return;
    if (GAME.Current.RoundWin === 0) {
      QUEUE.enQueue({
        execute: () => REELM.getMultiplierSymbols(),
        priority: QUEUE_PRIORITY.TOTAL_WIN_CALCULATION,
      });
    } else {
      QUEUE.enQueue({
        execute: () => REELM.startMultiplierCalculation(),
        skip: () => {
          REELM.skipToEndCalculation();
          Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.TOTAL_WIN_CALCULATION);
        },
        priority: QUEUE_PRIORITY.TOTAL_WIN_CALCULATION,
      });
    }
  }

  startShowingWins(winnings: number) {
    if (
      winnings >= 15 * GAME.bet &&
      !this.machine.isFirstState(this) &&
      !GAME.IsMaxWin
    ) {
      QUEUE.enQueue({
        execute: () => {
          setTimeout(() => {
            Sounds.stopSound();
            GameView.setWinAnimation(winnings);
          }, 200);
        },
        priority: QUEUE_PRIORITY.BIGWIN,
      });
    }
  }

  startTransition() {
    if (GAME.getCurrentStakeState() == StakeRoundStateType.FREE_SPIN_TRIGGER) {
      QUEUE.enQueue({
        execute: () => {
          ScreenSwitchTransition.switchToScreen(() =>
            GameView.toggleFreeSpinsUI(true),
          );
          setTimeout(
            () => Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.TRANSITION),
            3500,
          );
        },
        priority: QUEUE_PRIORITY.TRANSITION,
      });
    }
  }

  openFreeSpinPopup() {
    const isRetrigger =
      GAME.getCurrentStakeState() == StakeRoundStateType.FREE_SPIN_RETRIGGER;
    if (
      GAME.getCurrentStakeState() == StakeRoundStateType.FREE_SPIN_TRIGGER ||
      isRetrigger
    ) {
      QUEUE.enQueue({
        execute: () => {
          GAME.setFreeSpinsMode();
          if (isRetrigger) {
            const retrigger =
              GAME.getCurrentStakeResponseByType("freeSpinRetrigger");
            if (retrigger) GAME.totalFreeSpins = retrigger.totalFs;
            GameView.updateFreeSpinsCount();
          }
          if (GAME.isWarehouseEnabled) {
            Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.FREESPINSTART);
          } else {
            setTimeout(() => PopUps.show(PopUpType.FreeGame, isRetrigger), 500);
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
    const finalWin = GAME.getStakeStateByIndex(
      GAME.CurrentScreen,
    ) as StakeFinalWinState;
    if (
      GAME.getCurrentStakeState() == StakeRoundStateType.FINAL_WIN &&
      finalWin.amount > 0 &&
      !GAME.isReplay
    ) {
      QUEUE.enQueue({
        execute: () => {
          if (GAME.hasPreRefreshData) {
            GAME.Player.Balance = GAME.pendingBalance;
            BottomUI.setBalance(GAME.Player.Balance);
            GAME.hasPreRefreshData = false;
            Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.SPIN_END_API);
            return;
          }
          endRound()
            .then((response) => {
              GAME.Player.Balance =
                response.balance.amount / API_AMOUNT_MULTIPLIER;
              BottomUI.setBalance(GAME.Player.Balance);
              Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.SPIN_END_API);
            })
            .catch((error) => {
              console.error("[SpinEnd] endRound failed", error);
              Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.SPIN_END_API);
            });
        },
        priority: QUEUE_PRIORITY.SPIN_END_API,
      });
    }
  }
}
