export interface StakePlayResponse {
  balance: StakeBalance;
  round: StakeRound;
  config: StakeConfig;
  meta: unknown | null;
}

export interface StakeBalance {
  amount: number;
  currency: string;
}

export interface StakeRound {
  betID: number;
  amount: number;
  payout: number;
  payoutMultiplier: number;
  active: boolean;
  state: StakeRoundStateItem[];
  mode: string;
  event: unknown | null;
}

export type StakeRoundStateItem =
  | StakeRevealState
  | StakeWinInfoState
  | StakeSetWinState
  | StakeSetTotalWinState
  | StakeFinalWinState
  | StakeEnterBonusState
  | StakeUpdateTumbleWinState
  | StakeFireGooeyGunsState
  | StakeUpdateGlobalMultState
  | StakeFreeSpinTriggerState
  | StakeFreeSpinRetriggerState
  | StakeUpdateFreeSpinState
  | StakeFreeSpinEndState
  | StakeWarehouseSpinState
  | StakeTumbleBoardState;

export enum StakeRoundStateType {
  REVEAL = "reveal",
  WIN_INFO = "winInfo",
  SET_WIN = "setWin",
  SET_TOTAL_WIN = "setTotalWin",
  FINAL_WIN = "finalWin",
  ENTER_BONUS = "enterBonus",
  FIRE_GOOEY_GUNS = "fireGooeyGuns",
  UPDATE_GLOBAL_MULT = "updateGlobalMult",
  FREE_SPIN_TRIGGER = "freeSpinTrigger",
  FREE_SPIN_RETRIGGER = "freeSpinRetrigger",
  UPDATE_FREE_SPIN = "updateFreeSpin",
  FREE_SPIN_END = "freeSpinEnd",
  WAREHOUSE_SPIN = "warehouseSpin",
  TUMBLE_BOARD = "tumbleBoard",
  UPDATE_TUMBLE_WIN = "updateTumbleWin",
}

export interface StakeRoundStateBase {
  index: number;
  type: string;
  featureId: number;
}

export interface StakeRevealState extends StakeRoundStateBase {
  type: "reveal";
  board: StakeBoardSymbol[][];
  paddingPositions: number[];
  gameType: string;
  anticipation: number[];
}

export interface StakeWinInfoState extends StakeRoundStateBase {
  type: "winInfo";
  totalWin: number;
  wins: StakeWinInfo[];
}

export interface StakeSetWinState extends StakeRoundStateBase {
  type: "setWin";
  amount: number;
  winLevel: number;
}

export interface StakeSetTotalWinState extends StakeRoundStateBase {
  type: "setTotalWin";
  amount: number;
}

export interface StakeFinalWinState extends StakeRoundStateBase {
  type: "finalWin";
  amount: number;
}

export interface StakeEnterBonusState extends StakeRoundStateBase {
  type: "enterBonus";
  reason: string;
}

export interface StakeFireGooeyGunsState extends StakeRoundStateBase {
  type: "fireGooeyGuns";
  gameType: string;
  guns: StakeGunPosition[];
  multipliers: StakeGunPosition[];
  globalMult: number;
  currentMult: number;
}

export interface StakeUpdateGlobalMultState extends StakeRoundStateBase {
  type: "updateGlobalMult";
  globalMult: number;
}

export interface StakeUpdateTumbleWinState extends StakeRoundStateBase {
  type: "updateTumbleWin";
  amount: number;
}

export interface StakeFreeSpinTriggerState extends StakeRoundStateBase {
  type: "freeSpinTrigger";
  totalFs: number;
  positions: StakeBoardPosition[];
}

export interface StakeFreeSpinRetriggerState extends StakeRoundStateBase {
  type: "freeSpinRetrigger";
  totalFs: number;
  positions: StakeBoardPosition[];
}

export interface StakeUpdateFreeSpinState extends StakeRoundStateBase {
  type: "updateFreeSpin";
  amount: number;
  total: number;
}

export interface StakeFreeSpinEndState extends StakeRoundStateBase {
  type: "freeSpinEnd";
  amount: number;
  winLevel: number;
}

export interface StakeWarehouseSpinState extends StakeRoundStateBase {
  type: "warehouseSpin";
  gameType: string;
  multipliers: StakeWarehouseMultiplierPosition[];
  flashBeamA: StakeBoardPosition[];
  flashBeamB: StakeBoardPosition[];
  lightSwitch: boolean;
  battery: boolean;
  globalMult: number;
  livesRemaining: number;
  livesRestored: boolean;
  maxLives: number;
}

export interface StakeTumbleBoardState extends StakeRoundStateBase {
  type: "tumbleBoard";
  newSymbols: StakeBoardSymbol[][];
  explodingSymbols: StakeBoardPosition[];
}

export interface StakeBoardSymbol {
  name: string;
  multiplier?: number;
  scatter?: boolean;
  mystery?: boolean;
  filler?: boolean;
}

export interface StakeBoardPosition {
  reel: number;
  row: number;
}

export interface StakeGunPosition extends StakeBoardPosition {
  multiplier: number;
}

export interface StakeWarehouseMultiplierPosition extends StakeBoardPosition {
  multiplier: number;
  kind: string;
}

export interface StakeWinInfo {
  symbol: string;
  kind: number;
  win: number;
  positions: StakeBoardPosition[];
  meta: StakeWinMeta | StakeWarehouseWinMeta;
}

export interface StakeWinMeta {
  lineIndex: number;
  multiplier: number;
  winWithoutMult: number;
  globalMult: number;
  lineMultiplier: number;
}

export interface StakeWarehouseWinMeta {
  globalMult: number;
  winWithoutMult: number;
  lightSwitch: boolean;
  battery: boolean;
}

export interface StakeConfig {
  gameID: string;
  minBet: number;
  maxBet: number;
  stepBet: number;
  defaultBetLevel: number;
  betLevels: number[];
  betModes: Record<string, unknown>;
  jurisdiction: StakeJurisdiction;
}

export interface StakeJurisdiction {
  socialCasino: boolean;
  disabledFullscreen: boolean;
  disabledTurbo: boolean;
  disabledSuperTurbo: boolean;
  disabledAutoplay: boolean;
  disabledSlamstop: boolean;
  disabledSpacebar: boolean;
  disabledBuyFeature: boolean;
  displayNetPosition: boolean;
  displayRTP: boolean;
  displaySessionTimer: boolean;
  minimumRoundDuration: number;
}

// ---------------------------------------------------------------------------
// Replay
// ---------------------------------------------------------------------------

/** Parsed URL parameters that identify a historical round to replay */
export interface StakeReplayUrlParams {
  /** Whether replay mode is active (`?replay=true`) */
  replay: boolean;
  /** Original bet amount in base units (e.g. 1000000 = $1.00) */
  amount: number;
  /** Game identifier, e.g. `hero-academy` */
  game: string;
  /** Game version, e.g. `1.0.0` */
  version: string;
  /** Round mode, e.g. `base` or `freespin` */
  mode: string;
  /** Event / round identifier used to fetch the historical state */
  event: string;

  costMultiplier?: number; // Optional cost multiplier (e.g. ante/bonus buy) for the replayed round

  payoutMultiplier?: number; // Optional payout multiplier for the replayed round, used to calculate wins in the replay

  totalwin?: number; // Optional total win amount for the replayed round, used to display the correct total win during the replay
}

/** Response returned by the RGS `/bet/replay/{game}/{version}/{mode}/{event}` endpoint */
export interface StakeReplayResponse {
  /** Overall payout multiplier for the replayed round */
  payoutMultiplier: number;
  /** Cost multiplier (e.g. ante/bonus buy) */
  costMultiplier: number;
  /** Ordered list of game-state events that describe the round */
  state: StakeRoundStateItem[];
  /** Original bet amount in API units */
  amount?: number;
  /** Round mode that was replayed */
  mode?: string;
  /** Event identifier that was replayed */
  event?: string;
}
