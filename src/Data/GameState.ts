import { SplitSpinResponse } from "../utils/FreespinResponseSplitter";
import Observable from "../SlotFSM/StateMachine/Observable";
import { GameFeatures, get2DPosition } from "./GameConfig";

import {
  StakeJurisdiction,
  StakePlayResponse,
  StakeReplayResponse,
  StakeReplayUrlParams,
  StakeRoundStateItem,
  StakeRoundStateType,
  StakeWarehouseSpinState,
  StakeWinInfo,
} from "./StakePlayResponse";

let Instance: GameState = null;

/**
 * Observable game model (port of Royal Tower GameState). The constructor returns a Proxy so that
 * every assignment to an existing field notifies observers — FSM transitions watch these fields.
 * NOTE: every observed field must have an initializer so `property in target` holds.
 */
export default class GameState extends Observable {
  /**
   * Observed Properties
   */
  autoToggle: boolean = false;
  quickToggle: boolean = false;
  turboToggle: boolean = false;
  isStopRequested: boolean = false;
  musicToggle: boolean = false;
  currentView: number = -1;
  currentCharacter: number = -1;
  currentCredit: number = -1;
  featureBought: boolean = false;
  autoSpinCount: number = -1;
  prevPayline: any = null;
  respinOnInit: boolean = false;
  freeSpinPopUP: boolean = false;
  respinCounter: number = 0;
  totalScreen: number = 0;
  CurrentScreen: number = 0;
  gid: string = "";
  isSpaceHold: boolean = false;
  Bonus: any = null;
  ActivatedBonusList: any = null;
  CurrentLevel: number = -1;
  moneyOnSymbols: any = null;
  totalFreeSpins: number = 0;
  currentFreeSpins: number = 0;
  totalAutoSpins: number = -1;
  WildCounter: number = 0;
  bonusesToRedeem: any = null;
  featureId: string = "";
  isBonusRedeemed: boolean = false;
  bonusFeatureAmount: number = 0;
  bonusFeatureSpins: number = 0;
  Currency: string = "$";
  baseSpinLevelCounter = 0;
  freeSpinLevelCounter = 0;
  featureBuyId: string = "";
  BonusBoostFeatureBought: boolean = false;
  wildId: number = -1;
  freespinCounter: number = 0;
  isWarehouseEnabled: boolean = false;
  isSuperFeatureBought: boolean = false;
  bonusSpinCount: number = 0;
  isBonusUsed: boolean = false;
  isUILocked = false;
  turboByHold: boolean = false;
  infinitySpinsEnabled: boolean = false;
  currentWarehouseSpinState: StakeWarehouseSpinState = null;
  isIdleInitState: boolean = false;

  isPersistentPopupsOpen: boolean = false;
  pendingBalance: number = 0;
  defaultBet: number = 0;

  /**
   * Adding extra propeties for easier UI management
   * Free spin mode is enabled only after spin end.
   */
  freeSpinsEnabled: boolean = false;
  bet: number = 0;

  Status: number = 0;
  Ts: number = 0;

  IsMaxWin: boolean = false;

  /**
   * Server Data
   */
  Player: {
    Balance: number;
    Rate: number;
    Currency: string;
    CoinRate: number;
  } = null;

  Next: {
    Type: number;
    FreeSpin: {
      Next: number;
      Total: number;
    };
  } = null;

  Current: any = null;

  GameInfo: {
    Line: number;
    BetValue: number[];
    LineBet: number[];
    BuyFeature: any[];
  } = null;

  currentStakeWinInfo: StakeWinInfo[] = [];
  gameType: string = "basegame";
  isReplay: boolean = false;
  shouldReplay: boolean = false;

  splitSpinResponses: SplitSpinResponse[] = [];
  currentSplitSpinIndex: number = 0;

  replayParams: StakeReplayUrlParams = null;

  Jurisdiction: StakeJurisdiction = null;

  //Stake Response Interface
  stakeResponse: StakePlayResponse | null = null;
  replayResponse: StakeReplayResponse | null = null;

  hasPreRefreshData = false;

  roundWin: number = 0;

  constructor(userData: any) {
    super();
    this.setIUSERData(userData);
    this.setFreeSpinsMode();
    if (!this.Current) this.Current = this.getDefaulCurrent();
    this.currentCredit = this.GameInfo.LineBet.indexOf(this.bet);
    this.addObserver(this.onPropertyChanged.bind(this));
    Instance = new Proxy(this, {
      set: (target, property, value) => {
        if (property in target) {
          target[property] = value;
          this.notifyObservers({ property: property as string, value });
          return true;
        }
        target[property] = value;
        return true;
      },
    });
    return Instance;
  }

  protected onPropertyChanged(change: { property: string; value: any }) {
    switch (change.property) {
      case "bonusSpinCount":
        if (this.bonusSpinCount <= 0) {
          this.bonusSpinCount = -1;
        } else {
          this.isBonusRedeemed = true;
        }
        break;
    }
  }

  //Update Observable properties on server data update
  setIUSERData(userData: any) {
    if (userData.GameInfo) this.GameInfo = userData.GameInfo;
    if (userData.Player) this.Player = userData.Player;
    if (userData.Current) this.Current = userData.Current;
    if (userData.Bonus != null) this.Bonus = userData.Bonus;
    if (userData.WildCounter != null) this.WildCounter = userData.WildCounter;

    this.Next = userData.Next;
    this.Status = userData.Status;
    this.Ts = userData.Ts;
    this.respinCounter = 0;
    this.setBonuses();
    if (userData.Balance != null && userData.Balance != undefined) {
      this.Player.Balance = userData.Balance;
    }
    if (userData.Level) {
      if (this.CurrentLevel != userData.Level) {
        this.freeSpinPopUP = false;
      }
      this.CurrentLevel = userData.Level;
    }

    if (userData.Current != null && userData.Current.WildId != null) {
      this.wildId = userData.Current.WildId;
    }
  }

  setReplayData(data: StakeReplayResponse) {
    this.replayResponse = data;
    // Map replay state into stakeResponse so existing game logic works unchanged
    this.stakeResponse = {
      balance: null,
      config: null,
      meta: null,
      round: {
        betID: 0,
        amount: data.amount ?? 0,
        payout: 0,
        payoutMultiplier: data.payoutMultiplier,
        active: false,
        state: data.state,
        mode: data.mode ?? "",
        event: data.event ?? null,
      },
    } as unknown as StakePlayResponse;
  }

  setISPINData(userData: any) {
    this.stakeResponse = userData as StakePlayResponse;
  }

  setBonuses() {
    if (this.Bonus && this.Current?.Type == 1) {
      this.setBonusFromResponse();
    }
  }

  setBonusFromResponse() {
    if (this.Bonus) {
      if (this.Bonus.length <= 0) {
        this.ActivatedBonusList = [];
      } else {
        this.ActivatedBonusList = this.findMatchingFeatures(
          this.Bonus,
          GameFeatures,
        );
      }
    }
  }

  findMatchingFeatures(
    bonusArray: string[],
    featuresObject: Record<string, number>,
  ) {
    const resultArray = [];
    bonusArray.forEach((bonusElement) => {
      if (Object.prototype.hasOwnProperty.call(featuresObject, bonusElement)) {
        resultArray.push(featuresObject[bonusElement]);
      }
    });
    return resultArray;
  }

  /**
   * Enables free spin mode on a freeSpinTrigger state, disables it on freeSpinEnd.
   */
  setFreeSpinsMode() {
    const freeSpinTrigger = this.getStakeResponseByType("freeSpinTrigger");
    if (freeSpinTrigger && !this.freeSpinsEnabled) {
      this.freeSpinsEnabled = true;
      this.totalFreeSpins = freeSpinTrigger.totalFs;
      this.currentFreeSpins = 0;
      this.freeSpinPopUP = true;
      return;
    }

    const freeSpinEnd = this.getStakeResponseByType("freeSpinEnd");
    if (freeSpinEnd && this.freeSpinsEnabled) {
      this.freeSpinsEnabled = false;
      this.freeSpinPopUP = false;
      return;
    }
  }

  getMoneySymbolMatrix(
    values: number[],
    positions: number[],
    rows: number = 5,
    cols: number = 3,
  ): number[][] {
    const matrix: number[][] = Array.from({ length: rows }, () =>
      Array(cols).fill(0),
    );
    for (let i = 0; i < values.length; i++) {
      const cells = get2DPosition(positions[i], 5);
      matrix[cells.column][cells.row] = values[i];
    }
    return matrix;
  }

  getCurrentSplitResponse(): SplitSpinResponse | null {
    if (
      this.splitSpinResponses.length > 0 &&
      this.currentSplitSpinIndex < this.splitSpinResponses.length
    ) {
      return this.splitSpinResponses[this.currentSplitSpinIndex];
    }
    return null;
  }

  private getStateList(): StakeRoundStateItem[] | undefined {
    const splitResponse = this.getCurrentSplitResponse();
    return splitResponse
      ? splitResponse.round.state
      : this.stakeResponse?.round?.state;
  }

  getStakeStateByIndex(index: number): StakeRoundStateItem | null {
    const stateList = this.getStateList();
    if (!stateList || index < 0 || index >= stateList.length) {
      return null;
    }
    return stateList[index];
  }

  getCurrentStakeState(): string | null {
    return this.getStakeStateByIndex(this.CurrentScreen)?.type || null;
  }

  getStakeResponseByType<TType extends StakeRoundStateItem["type"]>(
    type: TType,
    index?: number,
  ): Extract<StakeRoundStateItem, { type: TType }> | null {
    const stateList = this.getStateList();
    if (!stateList || stateList.length === 0) {
      return null;
    }

    if (typeof index === "number") {
      const stateItem = stateList[index];
      if (!stateItem || stateItem.type !== type) {
        return null;
      }
      return stateItem as Extract<StakeRoundStateItem, { type: TType }>;
    }

    const stateItem = stateList.find((state) => state.type === type);
    return (stateItem as Extract<StakeRoundStateItem, { type: TType }>) || null;
  }

  hasStakeState(type: StakeRoundStateItem["type"]): boolean {
    const stateList = this.getStateList();
    if (!stateList || stateList.length === 0) {
      return false;
    }
    return stateList.some((state) => state.type === type);
  }

  getCurrentStakeResponseByType<TType extends StakeRoundStateItem["type"]>(
    type: TType,
  ): Extract<StakeRoundStateItem, { type: TType }> | null {
    const stateItem = this.getStakeStateByIndex(this.CurrentScreen);
    if (!stateItem || stateItem.type !== type) {
      return null;
    }
    return stateItem as Extract<StakeRoundStateItem, { type: TType }>;
  }

  isLastStakeStateInSpin(stakeStateType: StakeRoundStateType): boolean {
    for (let i = this.CurrentScreen + 1; i < this.totalScreen; i++) {
      if (this.getStakeStateByIndex(i)?.type === stakeStateType) {
        return false;
      }
    }
    return true;
  }

  getDefaulCurrent() {
    return {
      Type: 1,
      TotalWin: 0,
      RoundWin: 0,
      Round: {
        RoundType: 1,
        Bet: this.GameInfo.LineBet[6] * this.GameInfo.Line,
        ActualBet: 1,
        BetValue: 1,
        Line: 25,
        LineBet: this.GameInfo.LineBet[6],
        Payout: 0,
      },
    };
  }
}

export { Instance };
