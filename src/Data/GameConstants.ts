import { Color } from "cc";
// import * as exp from "constants";

export { GameEvents } from "../utils/StateMachine/GameEvents";

export { Instance as Events } from "../utils/StateMachine/EventEmitter";

export { Instance as API, APIs, AccessToken } from "../utils/API";

export {
  Instance as QUEUE,
  QUEUEACTIONEND,
  QUEUE_PRIORITY,
  TASK_TYPE,
} from "../utils/Queue";

export { Instance as Sounds, SFX } from "../utils/SoundManager";

export { Instance as PopUps, PopUpType } from "../utils/PopUps/PopUpManager";

export {
  Instance as Screens,
  ScreenEnum,
  ScreenState,
} from "../utils/Screens/ScreenManager";

export { Instance as GAME } from "../Data/GameState";

export { Instance as GameView } from "../Screens/GameScreen";

export { Instance as REELM } from "../utils/ReelManager";

export { Instance as BaseSpinLevelUIInstance } from "../UI/BaseSpinLevelUI";

export { Instance as FreeSpinLevelUIInstance } from "../UI/FreeSpinLevelsUI";

export { Instance as RandomFsGameInstance } from "../UI/RandomFreespinGame";

export { instance as BottomUI } from "../UI/BottomUI";

export { Instance as SLOTVFX } from "../utils/SlotfxParticlePlayer";

// export { Instance as ScreenOrientation } from "../Screens/OnScreenChange";

export const SymbolCodes = {
  "S": 0, //SCATTER
  "H1": 1, // H1
  "H2": 2, // H2
  "H3": 3, // H3
  "H4": 4, // H4
  "L1": 5, // L1
  "L2": 6, // L2
  "L3": 7, // L3
  "L4": 8, // L4
  "L5": 9, // L5
  "M": 10, //MULTIPLIER
};

export const anteBetAmount: number = 2.5;

export const buyFreeSpinAmount: number = 200;

export const clientVersion = "1.0.1";

export const hookPositions =
  [-382.2, -126, 130, 385, 641]

export const BuyFeatureId = {
  anteBet: "vault_rush",
  GooeyGuns: "briefcase_wild_strike",
  WareHouse: "heist",
  Stakeout: "briefcase_takeover",
  SuperStakeout: "mega_briefcase_takeover",
  SuperWarehouse: "mega_heist",
  none: "",
}

export const BuyFeaturePrice: { [id: string]: number } = {
  "vault_rush": 3,
  "briefcase_wild_strike": 50,
  "heist": 100,
  "briefcase_takeover": 100,
  "mega_briefcase_takeover": 200,
  "mega_heist": 200
}

export const BaseSpinScatterLevel: { [id: number]: number } = {
  0: 6,
  1: 6,
  2: 8,
  3: 8,
  4: 8,
  5: 10,
  6: 10,
  7: 10,
  8: 10,
  9: 12,
  10: 12,
  11: 12,
  12: 12,
  13: 12,
  14: 15,
  15: 15,
  16: 15,
  17: 15,
  18: 15,
  19: 20,
  20: 20,
}

export const FreeSpinScatterLevel: { [id: number]: number } = {
  0: 1,
  1: 1,
  2: 2,
  3: 2,
  4: 2,
  5: 3,
  6: 3,
  7: 3,
  8: 3,
  9: 4,
  10: 4,
  11: 4,
  12: 4,
  13: 4,
  14: 5,
}

export const GAMENAME = "crimechronicles"

export function save(key: string, value: any) {
  let finalKey = GAMENAME + key;
  localStorage.setItem(finalKey, JSON.stringify(value));
}

export function get(key: string) {
  let finalKey = GAMENAME + key;
  let value = localStorage.getItem(finalKey);
  return value ? JSON.parse(value) : null;
}

export const WarehouseOrientationEnable = [11, 12]; //LIGHTS PARENT && REELPARENT

export const GameVideoClips = {
  JhonFirstSpin: 0,
  RomanFirstSpin: 1,
  JhonEndSpin: 2,
  RomanEndSpin: 3,
};


export function getRandomIndexOfValue(array, value) {
  const indices = array.map((element, index) => element == value ? index : -1).filter(index => index !== -1);
  if (indices.length === 0) {
    return -1;
  }
  const randomIndex = indices[Math.floor(Math.random() * indices.length)];
  return randomIndex;
}


export const enum WinAnims {
  NICE,
  OMG,
  SUPER,
  FANTASTIC,
  MAX,
  NONE = 100,
}

export const enum MiniGameState {
  MINIGAME_START = 0,
  DROP_CAGE = 1,
  PICKUP_CAGE = 2,
  END = 3,
  NONE = 100
}

export const GameFeatureDescription = {
  0: "More Sickle",
  1: "+2 Free Spins",
  2: "Start From Level 2",
  3: "More Eggs",
  4: "More Wilds",
  5: "Let's Go"
}

// Map of currency codes to their symbols
export const currencyToSymbol: Record<string, string> = {
  USD: "$",
  CAD: "CA$",
  JPY: "¥",
  EUR: "€",
  RUB: "₽",
  CNY: "CN¥",
  PHP: "₱",
  INR: "₹",
  IDR: "Rp",
  KRW: "₩",
  BRL: "R$",
  MXN: "MX$",
  DKK: "KR",
  PLN: "zł",
  VND: "₫",
  TRY: "₺",
  CLP: "CLP",
  ARS: "ARS",
  PEN: "S/",
  NGN: "₦",
  SAR: "SAR",
  ILS: "ILS",
  AED: "AED",
  TWD: "NT$",
  NOK: "kr",
  KWD: "KD",
  JOD: "JD",
  CRC: "₡",
  TND: "TND",
  SGD: "SG$",
  MYR: "RM",
  OMR: "OMR",
  QAR: "QAR",
  BHD: "BD",
  GBP: "£",
  AUD: "A$",
  CHF: "CHF",
  HKD: "HK$",
  NZD: "NZ$",
  SEK: "kr",
  ZAR: "R",
  KGS: "COM",
  XGC: "GC",
  XSC: "SC",
};

type UrlParams = {
  token?: string;
  currency?: string;
  game_id?: string;
  game_type?: string;
  amount_type?: string;
  account_id?: string;
  session_id?: string;
  reality_check?: string;
  channel?: string;
  full_site_code?: string;
  username?: string;
  category?: string;
  language?: string;
  game_name?: string;
  env?: string;
};


export function parseUrlParams(url: string): UrlParams {
  const urlObj = new URL(url);
  const params = urlObj.searchParams;
  // console.log("params ",params)
  return {
    token: params.get("token"),
    currency: params.get("currency"),
    game_id: params.get("game_id"),
    game_type: params.get("game_type"),
    amount_type: params.get("amount_type"),
    account_id: params.get("account_id"),
    session_id: params.get("session_id"),
    reality_check: params.get("reality_check"),
    channel: params.get("channel"),
    full_site_code: params.get("full_site_code"),
    username: params.get("username"),
    category: params.get("category"),
    language: params.get("lang"),
    game_name: params.get("game_name"),
    env: params.get("env"),
  };
}

export const GameFeatures = {
  "md~1": 0,
  "fs~1": 1,
  "l2~1": 2,
  "mf~1": 3,
  "mm~1": 4,
}

export const FeaturesHeadingAndDesc = {
  "vault_rush": {
    heading: "feature1Heading",
    desc: "feature1Desc",
    info: "feature1Info"
  },
  "gooey_guns": {
    heading: "feature2Heading",
    desc: "feature2Desc",
    info: "feature2Info"
  },
  "warehouse": {
    heading: "feature3Heading",
    desc: "feature3Desc",
    info: "feature3Info"
  },
  "stakeout": {
    heading: "feature4Heading",
    desc: "feature4Desc",
    info: "feature4Info"
  },
}

export const MESSAGES = {
  HOLD_SPACE_PORTRAIT: "holdspacePortrait",
  HOLD_SPACE: "holdspace",
  GOOD_LUCK: "goodLuck",
  SPIN: "spinToWin"
}

// Convert Hex to cc.Color
export function hexToColor(hex) {
  // Remove the hash at the start if it's there
  hex = hex.replace(/^#/, '');

  // Parse the r, g, b values
  let r = parseInt(hex.slice(0, 2), 16);
  let g = parseInt(hex.slice(2, 4), 16);
  let b = parseInt(hex.slice(4, 6), 16);

  // Return the cc.Color object
  return new Color(r, g, b);
}

export const symbolMultiplier = {
  1: 1,
  2: 2,
  3: 3,
  4: 10
}

export const MoneySymbol = {
  0: 10,
  1: 25,
  2: 50,
  3: 100,
  4: 250,
  5: 500
}

export function parseLocaleStringToNumber(localeString) {
  // Step 1: Remove thousands separators (commas)
  const withoutThousandsSeparators = localeString.replace(/,/g, "");

  // Step 2: Replace decimal separator (comma or period) with a standard decimal point (period)
  const standardizedString = withoutThousandsSeparators.replace(/[,.]/g, ".");

  // Step 3: Parse the string as a floating-point number
  const numberValue = parseFloat(standardizedString);

  return numberValue;
}

export function usdFormat(val: number, flag?: boolean) {
  let appendString = "";
  if (flag) {
    appendString = " USD";
  }
  return (
    val.toLocaleString("en-us", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + appendString
  );
}

export const totalRows = 3;
export const totalCoumns = 5;

export function convertTo2DArray(arr: number[]): number[][] {
  if (arr.length < 15) {
    throw new Error("The input array should have at least 15 elements.");
  }

  const result: number[][] = Array.from({ length: totalCoumns }, () => []);

  for (let col = 0; col < totalRows; col++) {
    for (let row = 0; row < totalCoumns; row++) {
      result[row][col] = arr[col * totalCoumns + row];
    }
  }

  return result;
}


// function must be removed
export function convert1DIndexTo2D(index: number): { row: number, column: number } {
  if (index < 0 || index >= 49) {
    throw new Error("Index must be between 0 and 48");
  }

  const row = Math.floor(index / 7);
  const column = index % 7;

  return { row, column };
}

export function get2DPosition(index, columns) {
  // Calculate the row and column from the index
  const row = Math.floor(index / columns);
  const col = index % columns;

  return { row: row, column: col };
}

export function getMatrixTranspose(matrix: number[][]): number[][] {
  // Check if matrix is empty
  if (matrix.length === 0) return [];

  // Initialize an empty array for the transposed matrix
  const transposed: number[][] = [];

  // Iterate over each column index
  for (let i = 0; i < matrix[0].length; i++) {
    // Initialize a new row for the transposed matrix
    const newRow: number[] = [];

    // Iterate over each row index
    for (let j = 0; j < matrix.length; j++) {
      // Push the element into the new row
      newRow.push(matrix[j][i]);
    }

    // Add the new row to the transposed matrix
    transposed.push(newRow);
  }

  return transposed;
}

export const Paylines: number[][] = [
  [0, 0, 0, 0, 0, 0],  // 0
  [1, 1, 1, 1, 1, 1],  // 1
  [2, 2, 2, 2, 2, 2],  // 2
  [3, 3, 3, 3, 3, 3],  // 3
  [4, 4, 4, 4, 4, 4],  // 4
  [0, 1, 0, 1, 0, 1],  // 5
  [1, 2, 1, 2, 1, 2],  // 6
  [2, 3, 2, 3, 2, 3],  // 7
  [3, 4, 3, 4, 3, 4],  // 8
  [1, 0, 1, 0, 1, 0],  // 9
  [2, 1, 2, 1, 2, 1],  // 10
  [3, 2, 3, 2, 3, 2],  // 11
  [4, 3, 4, 3, 4, 3],  // 12
  [0, 1, 2, 2, 1, 0],  // 13
  [1, 2, 3, 3, 2, 1],  // 14
  [2, 3, 4, 4, 3, 2],  // 15
  [4, 3, 2, 2, 3, 4],  // 16
  [3, 2, 1, 1, 2, 3],  // 17
  [2, 1, 0, 0, 1, 2],  // 18
];


export const PAYTABLE: number[][] = [
  [10.0, 25.0, 50.0], // H1
  [2.5, 10.0, 25.0],  // H2
  [2.0, 5.0, 15.0],   // H3
  [1.5, 2.0, 12.0],   // H4
  [1.0, 1.5, 10.0],   // L1
  [0.8, 1.2, 8.0],    // L2
  [0.5, 1.0, 5.0],    // L3
  [0.4, 0.9, 4.0],    // L4
  [0.2, 0.7, 2.0]     // L5
];

export const joinResponse = {
  "statusCode": 200,
  "message": "Game session created",
  "data": {
    "gid": "1732528538086",
    "balance": 10000,
    "version": "1.0.0"
  }
}

export const colorshade1 = "#363636"
export const colorshade2 = "#2B292A"

const DEFAULT_RESTRICTED_MAP: Array<[string, string]> = [
  // --- multi-word phrases first (longest -> shortest) ---
  ['be awarded to player\u2019s accounts', 'appear in player\u2019s accounts'],
  ['be awarded to player\'s accounts', 'appear in player\'s accounts'],
  ['place your bets', 'come and play / join in the game'],
  ['at the cost of', 'for'],
  ['cost of', 'can be played for'],
  ['win feature', 'play feature'],
  ['total bet', 'total play / play'],
  ['buy bonus', 'get bonus'],
  ['bonus buy', 'bonus / feature'],
  ['pays out', 'wins / won'],
  ['paid out', 'won'],
  ['pay out', 'win / won'],
  ['bet/s', 'play/s'],

  // --- single words ---
  ['betting', 'playing'],
  ['rebet', 'respin'],
  ['wager', 'play'],
  ['gamble', 'play'],
  ['deposit', 'get coins'],
  ['withdraw', 'redeem'],
  ['purchase', 'play'],
  ['bought', 'instantly triggered'],
  ['stake', 'play amount'],
  ['credit', 'balance'],
  ['currency', 'token'],
  ['payer', 'winner'],
  ['money', 'coins'],
  ['cash', 'coins'],
  ['fund', 'balance'],
  ['bets', 'plays'],
  ['bet', 'play'],
  ['buy', 'play'],
  ['paid', 'won'],
  ['pays', 'wins'],
  ['pay', 'win'],
  ['payout', 'win'],
  ['payouts', 'wintable'],
  ['slot', 'machine'],
  ['paying', 'winning'],
];