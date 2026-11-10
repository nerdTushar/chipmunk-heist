export default interface IUSER {
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
  Current: {
    Type: number;
    TotalWin: number;
    FreeSpin: {
      Current: number;
      Total: number;
    };
    Result: {
      R: string;
      LR: string;
      WR: {
        0: {
          AWP: [[]];
        };
      };
    };
    Round: {
      RoundType: number;
      Bet: number;
      ActualBet: number;
      BetValue: number;
      Line: number;
      LineBet: number;
      Payout: number;
      Items: string[];
    };
  };
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
    ]
  };

  Status: number;
  Ts: number;
}