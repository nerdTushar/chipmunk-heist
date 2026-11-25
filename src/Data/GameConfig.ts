/**
 * Pure game constants and helpers (no runtime dependencies), re-exported by GameConstants.
 * Kept separate so low-level modules (GameState, Queue, ReelManager) can import them without
 * pulling the whole GameConstants re-export graph into an import cycle.
 */
export { GAMENAME, save, get } from "./Storage";

export const SymbolCodes = {
  S: 0, //SCATTER
  H1: 1,
  H2: 2,
  H3: 3,
  H4: 4,
  L1: 5,
  L2: 6,
  L3: 7,
  L4: 8,
  L5: 9,
  M: 10, //MULTIPLIER
  W: 11, //WILD
};

export const anteBetAmount: number = 2.5;

export const buyFreeSpinAmount: number = 200;

export const clientVersion = "1.0.1";

export const BuyFeatureId = {
  anteBet: "vault_rush",
  GooeyGuns: "briefcase_wild_strike",
  WareHouse: "heist",
  Stakeout: "briefcase_takeover",
  SuperStakeout: "mega_briefcase_takeover",
  SuperWarehouse: "mega_heist",
  none: "",
};

export const BuyFeaturePrice: { [id: string]: number } = {
  vault_rush: 3,
  briefcase_wild_strike: 50,
  heist: 100,
  briefcase_takeover: 100,
  mega_briefcase_takeover: 200,
  mega_heist: 200,
};

/** Buy-feature cards shown in the FeatureBuy popup (art frame from the `buy` sheet). */
export const BuyFeatureCards = [
  {
    id: BuyFeatureId.WareHouse,
    title: "FREE SPINS",
    art: "art-free-spins.png",
    mode: "bonus",
  },
  {
    id: BuyFeatureId.GooeyGuns,
    title: "WILD HEIST",
    art: "art-wild-heist.png",
    mode: "bonus",
  },
  {
    id: BuyFeatureId.Stakeout,
    title: "VAULT RAID",
    art: "art-vault-raid.png",
    mode: "bonus",
  },
  {
    id: BuyFeatureId.SuperWarehouse,
    title: "GRAND HEIST",
    art: "art-grand-heist.png",
    mode: "bonus",
  },
];

export function getRandomIndexOfValue(array: any[], value: any) {
  const indices = array
    .map((element, index) => (element == value ? index : -1))
    .filter((index) => index !== -1);
  if (indices.length === 0) {
    return -1;
  }
  return indices[Math.floor(Math.random() * indices.length)];
}

export enum WinAnims {
  NICE,
  OMG,
  SUPER,
  FANTASTIC,
  MAX,
  NONE = 100,
}

export const WinAnimTitles: Record<number, string> = {
  [WinAnims.NICE]: "BIG WIN",
  [WinAnims.OMG]: "MEGA WIN",
  [WinAnims.SUPER]: "SUPER WIN",
  [WinAnims.FANTASTIC]: "EPIC WIN",
  [WinAnims.MAX]: "MAX WIN",
};

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
  const params = new URL(url).searchParams;
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
};

export const FeaturesHeadingAndDesc = {
  vault_rush: {
    heading: "ANTE BET",
    desc: "Doubles the chance to trigger Free Spins.",
    info: "Costs 2.5× bet per spin.",
  },
  briefcase_wild_strike: {
    heading: "WILD HEIST",
    desc: "Briefcase wilds strike the reels.",
    info: "50× bet.",
  },
  heist: {
    heading: "FREE SPINS",
    desc: "Instantly trigger the Free Spins heist.",
    info: "100× bet.",
  },
  briefcase_takeover: {
    heading: "VAULT RAID",
    desc: "Stacked wilds take over the reels.",
    info: "100× bet.",
  },
  mega_heist: {
    heading: "GRAND HEIST",
    desc: "Super Free Spins with boosted multipliers.",
    info: "200× bet.",
  },
};

export const MESSAGES = {
  HOLD_SPACE_PORTRAIT: "HOLD SPIN FOR TURBO",
  HOLD_SPACE: "HOLD SPACE FOR TURBO SPIN",
  GOOD_LUCK: "GOOD LUCK!",
  SPIN: "SPIN TO WIN",
};

/** Cocos `hexToColor` equivalent: returns a Pixi colour number. */
export function hexToColor(hex: string): number {
  return parseInt(hex.replace(/^#/, "").slice(0, 6), 16);
}

export function usdFormat(val: number, flag?: boolean) {
  const appendString = flag ? " USD" : "";
  return (
    (val ?? 0).toLocaleString("en-us", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + appendString
  );
}

/** Currency-prefixed amount using GAME.Currency (set from the Stake balance currency). */
export function formatMoney(val: number, currency: string) {
  const symbol = currencyToSymbol[currency] ?? currency ?? "$";
  return `${symbol}${usdFormat(val)}`;
}

export const totalRows = 3;
export const totalCoumns = 5;

export function get2DPosition(
  index: number,
  columns: number = totalCoumns,
): { row: number; column: number } {
  return { row: Math.floor(index / columns), column: index % columns };
}

export function getMatrixTranspose<T>(matrix: T[][]): T[][] {
  if (!matrix.length) return [];
  return matrix[0].map((_, col) => matrix.map((row) => row[col]));
}

/** 25 paylines from the GDD, rows 1 = top (converted to 0-based rows). */
export const Paylines: number[][] = [
  [2, 2, 2, 2, 2],
  [1, 1, 1, 1, 1],
  [3, 3, 3, 3, 3],
  [1, 2, 3, 2, 1],
  [3, 2, 1, 2, 3],
  [1, 1, 2, 3, 3],
  [3, 3, 2, 1, 1],
  [2, 1, 1, 1, 2],
  [2, 3, 3, 3, 2],
  [1, 2, 2, 2, 1],
  [3, 2, 2, 2, 3],
  [2, 1, 2, 3, 2],
  [2, 3, 2, 1, 2],
  [1, 2, 1, 2, 1],
  [3, 2, 3, 2, 3],
  [2, 2, 1, 2, 2],
  [2, 2, 3, 2, 2],
  [1, 1, 2, 1, 1],
  [3, 3, 2, 3, 3],
  [1, 3, 1, 3, 1],
  [3, 1, 3, 1, 3],
  [2, 1, 3, 1, 2],
  [2, 3, 1, 3, 2],
  [1, 3, 3, 3, 1],
  [3, 1, 1, 1, 3],
].map((line) => line.map((row) => row - 1));

/** GDD paytable: multiplier × total bet for 3/4/5 of a kind. */
export const PAYTABLE: {
  name: string;
  frame: string;
  pays: [number, number, number];
}[] = [
  { name: "Leader", frame: "sym_hp1.png", pays: [1, 3, 10] },
  { name: "Techie", frame: "sym_hp2.png", pays: [0.8, 2, 6] },
  { name: "Muscle", frame: "sym_hp3.png", pays: [0.6, 1.6, 5] },
  { name: "Gold Bars", frame: "sym_mp1.png", pays: [0.4, 1, 3] },
  { name: "Blueprint", frame: "sym_mp2.png", pays: [0.3, 0.8, 2.4] },
  { name: "Lock & Picks", frame: "sym_mp3.png", pays: [0.3, 0.8, 2] },
  { name: "Camera", frame: "sym_lp1.png", pays: [0.2, 0.6, 1.6] },
  { name: "Flashlight", frame: "sym_lp2.png", pays: [0.2, 0.5, 1.4] },
  { name: "A", frame: "sym_royal-a.png", pays: [0.1, 0.3, 1] },
  { name: "K", frame: "sym_royal-k.png", pays: [0.1, 0.3, 1] },
  { name: "Q", frame: "sym_royal-q.png", pays: [0.1, 0.25, 0.8] },
  { name: "J", frame: "sym_royal-j.png", pays: [0.1, 0.25, 0.8] },
  { name: "10", frame: "sym_royal-10.png", pays: [0.08, 0.2, 0.6] },
  {
    name: "Security Guard (Scatter)",
    frame: "sym_scatter.png",
    pays: [2, 10, 50],
  },
];

export const MAX_WIN_MULTIPLIER = 5000;

/**
 * Server symbol name → frame in the `symbols` sheet. Covers the chipmunk-heist math names as well as
 * the Royal Tower-style mock names (H1..H4 / L1..L5 / S / M) so both books render.
 */
export const SYMBOL_FRAMES: Record<string, string> = {
  HP1: "sym_hp1.png",
  HP2: "sym_hp2.png",
  HP3: "sym_hp3.png",
  MP1: "sym_mp1.png",
  MP2: "sym_mp2.png",
  MP3: "sym_mp3.png",
  LP1: "sym_lp1.png",
  LP2: "sym_lp2.png",
  A: "sym_royal-a.png",
  K: "sym_royal-k.png",
  Q: "sym_royal-q.png",
  J: "sym_royal-j.png",
  T: "sym_royal-10.png",
  "10": "sym_royal-10.png",
  W: "sym_wild.png",
  WILD: "sym_wild.png",
  S: "sym_scatter.png",
  SC: "sym_scatter.png",
  SCATTER: "sym_scatter.png",
  V: "sym_vent.png",
  VENT: "sym_vent.png",
  MS: "sym_mystery-safe.png",
  M: "sym_wild.png",
  H1: "sym_hp1.png",
  H2: "sym_hp2.png",
  H3: "sym_hp3.png",
  H4: "sym_mp1.png",
  L1: "sym_mp2.png",
  L2: "sym_mp3.png",
  L3: "sym_lp1.png",
  L4: "sym_lp2.png",
  L5: "sym_royal-a.png",
};

const ALL_FRAMES = [...new Set(Object.values(SYMBOL_FRAMES))];

export function symbolFrame(name: string): string {
  const key = (name ?? "").toUpperCase();
  if (SYMBOL_FRAMES[key]) return SYMBOL_FRAMES[key];
  let hash = 0;
  for (let i = 0; i < key.length; i++)
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return ALL_FRAMES[hash % ALL_FRAMES.length];
}

/** Random filler frame used while reels blur-spin. */
export function randomSymbolFrame(): string {
  return ALL_FRAMES[Math.floor(Math.random() * ALL_FRAMES.length)];
}
