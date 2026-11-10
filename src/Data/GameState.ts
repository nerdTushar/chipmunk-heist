import { SplitSpinResponse } from "../utils/FreespinResponseSplitter";
import Observable from "../utils/StateMachine/Observable";
import { BuyFeatureId, BuyFeaturePrice, GAME, GameFeatures, get2DPosition, getMatrixTranspose } from "./GameConstants";
import IUSER from "./IUSER";
import { StakeJurisdiction, StakePlayResponse, StakeReplayResponse, StakeReplayUrlParams, StakeRoundStateItem, StakeRoundStateType, StakeWarehouseSpinState, StakeWinInfo } from "../Data/StakePlayResponse";
// Per-spin validation is now coordinated by SlotValidation/SpinValidation.ts,
// called from SpinningState.afterSpin() once the response has been split into
// per-freespin chunks. GameState no longer kicks off validators directly.

var Instance: GameState = null;

export default class GameState extends Observable implements IUSER {
  /**
   * Observed Properties
   */
  autoToggle: boolean = false;
  quickToggle: boolean = false;
  turboToggle: boolean = false;
  isStopRequested: boolean = false;
  musicToggle: boolean = false;
  currentView: number = -1;
  currentCharacter: number = -1; // can be 0 or 1 in free spin mode
  currentCredit: number = -1;
  featureBought: boolean = false;
  autoSpinCount: number = -1;
  prevPayline: any;
  respinOnInit: boolean = false;
  freeSpinPopUP: boolean = false;
  respinCounter: number = 0;
  totalScreen: number = 0;
  CurrentScreen: number = 0;
  gid: string;
  isSpaceHold: boolean = false;
  Bonus: any = null;
  ActivatedBonusList: any = null;
  CurrentLevel: number = -1;
  moneyOnSymbols: any;
  totalFreeSpins: number = 0;
  currentFreeSpins: number = 0;
  totalAutoSpins: number = -1;
  WildCounter: number = 0;
  bonusesToRedeem: any = null
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
  isGunsGlazingActivated: boolean = false;
  isWarehouseEnabled: boolean = false;
  private currentLifes: number = 3;
  isFlashTeamATurn: boolean = true;
  flashBeamIndex: number = 0;
  isSuperFeatureBought: boolean = false;
  bonusSpinCount: number = 0;
  isBonusUsed: boolean = false;
  isUILocked = false;
  turboByHold: boolean = false;
  isBonusChoiceSelected: boolean = true;
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

  Status: number;
  Ts: number;

  IsMaxWin: boolean = false;

  /**
   * Server Data
   */
  Player: {
    Balance: number;

    Rate: number;
    Currency: string;
    CoinRate: number;
  };

  Next: {
    Type: number;
    FreeSpin: {
      Next: number;
      Total: number;
    };
  };

  Current: any;

  GameInfo: {
    Line: number;
    BetValue: number[];
    LineBet: number[];
    BuyFeature: [
      {
        RoundType: number;
        Rate: number;
        Total: number;
      }
    ];
  };


  currentStakeWinInfo: StakeWinInfo[] = [];
  gameType: string = "basegame"
  isReplay: boolean = false;
  shouldReplay: boolean = false;

  splitSpinResponses: SplitSpinResponse[] = [];
  currentSplitSpinIndex: number = 0;

  replayParams: StakeReplayUrlParams = null;

  Jurisdiction: StakeJurisdiction;

  //Stake Response Interface
  stakeResponse: StakePlayResponse | null = null;
  replayResponse: StakeReplayResponse | null = null;

  hasPreRefreshData = false;

  roundWin: number = 0;

  constructor(userData) {
    super();
    this.setIUSERData(userData);
    this.setFreeSpinsMode();
    if (!this.Current) this.Current = this.getDefaulCurrent();
    // this.bet = this.Current.Round.Bet;
    this.currentCredit = this.GameInfo.LineBet.indexOf(
      this.bet
    );
    this.addObserver(this.onPropertyChanged.bind(this));
    Instance = new Proxy(this, {
      set: (target, property, value) => {
        if (property in target) {
          target[property] = value;
          this.notifyObservers({ property, value });
          return true;
        }
        return false;
      },
    });
    return Instance;
  }

  protected onPropertyChanged(change: { property: string; value: any }) {
    switch (change.property) {
      case "bet":
      // this.Current.Round.Bet = this[change.property];
      case "autoToggle":
        // this.totalAutoSpins = this.autoToggle ? this.totalAutoSpins : 0;
        break;
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
  setIUSERData(userData) {
    if (userData.GameInfo) this.GameInfo = userData.GameInfo;
    if (userData.Player) this.Player = userData.Player;
    if (userData.Current) this.Current = userData.Current;
    if (userData.Bonus != null) this.Bonus = userData.Bonus;
    if (userData.WildCounter != null) this.WildCounter = userData.WildCounter;
    //if (userData.Player.Rate) this.Player = userData.Player;

    //TODO:It will also replace other propeties, it should be fixed.
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
      this.CurrentLevel = userData.Level
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


  setISPINData(userData) {
    this.stakeResponse = userData as StakePlayResponse;
    // Validation is intentionally NOT kicked off here. In freespins a single
    // API response is split into multiple per-spin chunks; SpinningState.afterSpin
    // calls SlotValidation/SpinValidation.validateSpin per chunk so each
    // freespin gets its own combined report instead of one huge bundled one.
  }


  setBonuses() {
    if (this.Bonus && GAME.Current.Type == 1) {
      if (this.Bonus.length <= 0) {
        this.ActivatedBonusList = [];
      } else {
        this.ActivatedBonusList = this.findMatchingFeatures(this.Bonus, GameFeatures);
      }
    }
  }

  setBonusFromResponse() {
    if (this.Bonus) {
      if (this.Bonus.length <= 0) {
        this.ActivatedBonusList = [];
      } else {
        this.ActivatedBonusList = this.findMatchingFeatures(this.Bonus, GameFeatures);
      }
    }
  }

  setLevelCounters() {
    if (this.freeSpinsEnabled && this.Current.Type != 1) {
      this.freeSpinLevelCounter = this.Current.Counter;
      if (this.freeSpinLevelCounter > 14) this.freeSpinLevelCounter = 14;
    }
    else {
      this.baseSpinLevelCounter = this.Current.Counter;
      if (this.baseSpinLevelCounter > 19) this.baseSpinLevelCounter = 19;
    }
  }

  findMatchingFeatures(bonusArray, featuresObject) {
    const resultArray = [];

    bonusArray.forEach(bonusElement => {
      // Check if the matching key exists in GameFeatures
      if (featuresObject.hasOwnProperty(bonusElement)) {
        // Push the corresponding value to the result array
        resultArray.push(featuresObject[bonusElement]);
      }
    });

    return resultArray;
  }

  /**
 *
 * @param flag External condition to set UI mode only when needed.
 */
  setFreeSpinsMode() {
    // Check for free spin trigger state
    const freeSpinTrigger = this.getStakeResponseByType("freeSpinTrigger");
    if (freeSpinTrigger && !this.freeSpinsEnabled) {
      this.freeSpinsEnabled = true;
      this.totalFreeSpins = freeSpinTrigger.totalFs;
      this.currentFreeSpins = 0;
      this.freeSpinPopUP = true;
      return;
    }

    // Check for free spin end state
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
    cols: number = 3
  ): number[][] {
    const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (let i = 0; i < values.length; i++) {
      const pos = positions[i];
      const cells = get2DPosition(pos, 5);
      matrix[cells.column][cells.row] = values[i];
    }

    return matrix;
  }


  getCurrentSplitResponse(): SplitSpinResponse | null {
    if (this.splitSpinResponses.length > 0 && this.currentSplitSpinIndex < this.splitSpinResponses.length) {
      return this.splitSpinResponses[this.currentSplitSpinIndex];
    }
    return null;
  }

  getStakeStateByIndex(index: number): StakeRoundStateItem | null {
    const splitResponse = this.getCurrentSplitResponse();
    const stateList = splitResponse ? splitResponse.round.state : this.stakeResponse?.round?.state;
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
    index?: number
  ): Extract<StakeRoundStateItem, { type: TType }> | null {
    const splitResponse = this.getCurrentSplitResponse();
    const stateList = splitResponse ? splitResponse.round.state : this.stakeResponse?.round?.state;
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
    const splitResponse = this.getCurrentSplitResponse();
    const stateList = splitResponse ? splitResponse.round.state : this.stakeResponse?.round?.state;
    if (!stateList || stateList.length === 0) {
      return false;
    }
    return stateList.some((state) => state.type === type);
  }

  getCurrentStakeResponseByType<TType extends StakeRoundStateItem["type"]>(
    type: TType
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
      Result: {
        R: "104,103,203|204,102,204|203,2,102|203,102,104|104,102,202",
      },
      Round: {
        RoundType: 1,
        Bet: this.GameInfo.LineBet[6] * this.GameInfo.Line,
        ActualBet: 1,
        BetValue: 1,
        Line: 60,
        LineBet: this.GameInfo.LineBet[6],
        Payout: 0,
      },
    };
  }

  public addLife(life: number) {
    this.currentLifes += life;
  }

  public deductLife(): boolean {
    if (this.currentLifes > 0) {
      this.currentLifes -= 1;
      return true;
    }

    return false;
  }

  public resetLifes() {
    this.currentLifes = 3;
  }

  public setLifes(lifes: number) {
    if (lifes < 0 || lifes > 3) return;

    this.currentLifes = lifes;
  }

  public getLifes(): number {
    return this.currentLifes;
  }
}

export { Instance };