import {
  StakePlayResponse,
  StakeRoundStateItem,
  StakeRevealState,
} from "../Data/StakePlayResponse";
import { BOOK_AMOUNT_MULTIPLIER } from "../StakeClient/constants";

export interface SplitSpinResponse {
  spinNumber: number;
  spinType: "basegame" | "freegame";
  balance: StakePlayResponse["balance"];
  round: {
    betID: number;
    amount: number;
    payout: number;
    payoutMultiplier: number;
    active: boolean;
    state: StakeRoundStateItem[];
    mode: string;
    event: unknown | null;
  };
}

export class FreespinResponseSplitter {
  /**
   * Splits a freespin response into individual spin responses
   * @param response The complete freespin response
   * @returns Array of individual spin responses
   */
  static splitResponse(response: StakePlayResponse): SplitSpinResponse[] {
    const results: SplitSpinResponse[] = [];
    const states = response.round.state;

    // Find all reveal states which mark the start of each spin
    const revealIndices: number[] = [];
    states.forEach((state, index) => {
      if (state.type === "reveal") {
        revealIndices.push(index);
      }
    });

    // If no reveals found, return empty array
    if (revealIndices.length === 0) {
      return results;
    }

    // Collect any states that appear before the first reveal (e.g. enterBonus)
    const preRevealStates = states.slice(0, revealIndices[0]);

    // Process each spin
    revealIndices.forEach((revealIndex, spinIndex) => {
      const nextRevealIndex = revealIndices[spinIndex + 1];
      const isLastSpin = spinIndex === revealIndices.length - 1;

      // Determine the end index for this spin's states
      let endIndex: number;
      if (isLastSpin) {
        // For the last spin, include all remaining states
        endIndex = states.length;
      } else {
        // For other spins, stop before the next reveal
        endIndex = nextRevealIndex;
      }

      // Extract states for this spin; prepend pre-reveal states to the first spin
      const coreStates = states.slice(revealIndex, endIndex);
      const spinStates =
        spinIndex === 0 ? [...preRevealStates, ...coreStates] : coreStates;

      // Re-index the states to start from 0
      const reindexedStates = spinStates.map((state, index) => ({
        ...state,
        index: index,
      }));

      // Determine spin type from the reveal state
      const revealState = states[revealIndex] as StakeRevealState;
      const spinType = revealState.gameType as "basegame" | "freegame";

      // Calculate payout for this specific spin
      // `calculateSpinPayout` reads setWin / setTotalWin which are in
      // BOOK units (100 = 1× bet). `round.payout` is in API units
      // (1_000_000 = 1.00). Convert: API_payout = book/100 × API_amount.
      // `payoutMultiplier` is the bet-multiple, which is just book/100.
      const spinPayoutBook = this.calculateSpinPayout(reindexedStates);
      const spinPayoutMultiplier = spinPayoutBook / BOOK_AMOUNT_MULTIPLIER;
      const spinPayoutApi = spinPayoutMultiplier * response.round.amount;

      results.push({
        spinNumber: spinIndex + 1,
        spinType: spinType,
        balance: {
          ...response.balance,
        },
        round: {
          betID: response.round.betID,
          amount: response.round.amount,
          payout: spinPayoutApi,
          payoutMultiplier: spinPayoutMultiplier,
          active: isLastSpin ? response.round.active : true,
          state: reindexedStates,
          mode: response.round.mode,
          event: response.round.event,
        },
      });
    });

    return results;
  }

  /**
   * Calculate the payout for a specific spin from its states
   * @param states The states for this spin
   * @returns The payout amount
   */
  private static calculateSpinPayout(states: StakeRoundStateItem[]): number {
    let payout = 0;

    // Look for setWin or setTotalWin states to get the payout
    for (const state of states) {
      if (state.type === "setWin") {
        payout = state.amount;
      } else if (state.type === "setTotalWin" && payout === 0) {
        // Use setTotalWin only if we haven't found a setWin
        payout = state.amount;
      }
    }

    return payout;
  }

  /**
   * Get a summary of all spins
   * @param response The complete freespin response
   * @returns Summary information
   */
  static getSummary(response: StakePlayResponse): {
    totalSpins: number;
    baseGameSpins: number;
    freeGameSpins: number;
    totalPayout: number;
    totalBet: number;
  } {
    const splits = this.splitResponse(response);

    return {
      totalSpins: splits.length,
      baseGameSpins: splits.filter((s) => s.spinType === "basegame").length,
      freeGameSpins: splits.filter((s) => s.spinType === "freegame").length,
      totalPayout: response.round.payout,
      totalBet: response.round.amount,
    };
  }

  /**
   * Export individual spins as separate JSON files (for debugging)
   * @param response The complete freespin response
   * @returns Array of JSON strings
   */
  static exportAsJsonStrings(response: StakePlayResponse): string[] {
    const splits = this.splitResponse(response);
    return splits.map((split) => JSON.stringify(split, null, 2));
  }
}
