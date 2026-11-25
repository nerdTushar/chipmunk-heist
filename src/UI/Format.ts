import { Instance as GAME } from "../Data/GameState";
import { usdFormat } from "../Data/GameConfig";

/** Formats an amount with the session currency symbol (GAME.Currency), e.g. "$1,234.50". */
export function money(value: number): string {
  const symbol = GAME?.Currency ?? "$";
  return `${symbol}${usdFormat(value ?? 0)}`;
}
