export function MockLogin() {
  return defaultLoginResponse();
}


///////////////SPIN RESPONSES/////////////////////////////////////////////
function defaultLoginResponse() {
  return {
    Player: {
      Balance: 10000.00,
      Rate: 1,
      Currency: "MYR",
      CoinRate: 100,
    },
    Current: {
      Type: 1,
      RoundWin: 0.0,
      TotalWin: 0.0,
      AccWin: 0,
      Multiplier: 0,
      ScreenTransition: {},
      Counter: 0,
      Screen: [[4, 4, 9, 9, 7], [12, 5, 5, 9, 9], [8, 8, 3, 3, 6], [9, 9, 3, 3, 7], [7, 7, 8, 1, 12], [7, 7, 8, 8, 5]],
      Result: {
        // T: 1,
        R: "3,7,1,4,3,9,5|8,4,9,3,6,6,4|8,9,5,3,8,5,6|4,1,4,6,5,9,3|9,6,8,9,3,4,1|5,3,6,9,8,1,8|6,4,7,3,5,5,9",
        LR: "",
        WR: {
          0: {
            AWP: [],
            MS: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            RES: "",
          },
        },
      },
      Round: {
        RoundType: 1,
        Bet: 0.10,
        ActualBet: 0.25,
        BetValue: 1,
        Line: 25,
        LineBet: 0.01,
        Payout: 0.0,
        Items: ["1|0|1"],
      },
    },
    Next: {
      Type: 1,
      FreeSpin: {
        "Next": -1,
        "Total": -1
      }
    },
    GameInfo: {
      Line: 25,
      BetValue: [1],
      LineBet: [
        0.10, 0.20, 0.40, 0.60, 0.80, 1, 1.20, 1.40, 1.60, 1.80, 2.00, 3.00, 4.00, 5.00, 6.00, 7.00, 8.00, 9.00, 10.00, 12.00, 14.00, 16.00, 18.00, 20.00
      ],
      BuyFeature: [
        {
          RoundType: 2,
          Rate: 100,
          Total: 8,
        },
      ],
    },
    Status: 200,
    Ts: 1691757080,
  };
}

//Stake response 
export const authenticateRes = {
  "config": {
    "gameID": "",
    "minBet": 100000,
    "maxBet": 1000000000,
    "stepBet": 10000,
    "defaultBetLevel": 1000000,
    "betLevels": [
      100000,
      200000,
      400000,
      600000,
      800000,
      1000000,
      1200000,
      1400000,
      1600000,
      1800000,
      2000000,
      3000000,
      4000000,
      5000000,
      6000000,
      7000000,
      8000000,
      9000000,
      10000000,
      12000000,
      14000000,
      16000000,
      18000000,
      20000000,
      30000000,
      40000000,
      50000000,
      75000000,
      100000000,
      150000000,
      200000000,
      250000000,
      300000000,
      350000000,
      400000000,
      450000000,
      500000000,
      750000000,
      1000000000
    ],
    "betModes": {},
    "user": {
      "id": "318b9e49386db69f06aa20e44094c4e57ee99383fe18b49c596ab8e19a9c3429"
    },
    "jurisdiction": {
      "socialCasino": false,
      "disabledFullscreen": false,
      "disabledTurbo": false,
      "disabledSuperTurbo": false,
      "disabledAutoplay": false,
      "disabledSlamstop": false,
      "disabledSpacebar": false,
      "disabledBuyFeature": false,
      "displayNetPosition": false,
      "displayRTP": false,
      "displaySessionTimer": false,
      "minimumRoundDuration": 0
    }
  },
  "round": null,
  "balance": {
    "amount": 1000000000,
    "currency": "USD"
  }
};

export const NormalSpinResponse = {
  "round": {
    "betID": 393563947,
    "amount": 1000000,
    "payout": 1100000,
    "payoutMultiplier": 1.1,
    "active": true,
    "mode": "base",
    "state": [
      {
        "index": 0,
        "type": "reveal",
        "board": [
          [
            { "name": "L5" },
            { "name": "L5" },
            { "name": "H4" },
            { "name": "S", "scatter": true },
            { "name": "L4" },
            { "name": "L3" },
            { "name": "H3" }
          ],
          [
            { "name": "H1" },
            { "name": "H2" },
            { "name": "L4" },
            { "name": "H4" },
            { "name": "L5" },
            { "name": "H1" },
            { "name": "H3" }
          ],
          [
            { "name": "H1" },
            { "name": "L5" },
            { "name": "L5" },
            { "name": "L4" },
            { "name": "L3" },
            { "name": "H3" },
            { "name": "H3" }
          ],
          [
            { "name": "L5" },
            { "name": "L4" },
            { "name": "L2" },
            { "name": "L5" },
            { "name": "L4" },
            { "name": "H4" },
            { "name": "H4" }
          ],
          [
            { "name": "L3" },
            { "name": "L5" },
            { "name": "H1" },
            { "name": "H1" },
            { "name": "L2" },
            { "name": "L4" },
            { "name": "L5" }
          ],
          [
            { "name": "L5" },
            { "name": "L4" },
            { "name": "L2" },
            { "name": "L5" },
            { "name": "L4" },
            { "name": "L3" },
            { "name": "H2" }
          ]
        ],
        "paddingPositions": [99, 81, 92, 205, 166, 52],
        "gameType": "basegame",
        "anticipation": [0, 0, 0, 0, 0, 0]
      },
      {
        "index": 1,
        "type": "winInfo",
        "totalWin": 40,
        "wins": [
          {
            "symbol": "L4",
            "win": 40,
            "positions": [
              { "reel": 0, "row": 4 },
              { "reel": 1, "row": 2 },
              { "reel": 2, "row": 3 },
              { "reel": 3, "row": 1 },
              { "reel": 3, "row": 4 },
              { "reel": 4, "row": 5 },
              { "reel": 5, "row": 1 },
              { "reel": 5, "row": 4 }
            ],
            "meta": {
              "globalMult": 1,
              "clusterMult": 1,
              "winWithoutMult": 40,
              "overlay": { "reel": 3, "row": 4 }
            }
          }
        ]
      },
      { "index": 2, "type": "updateTumbleWin", "amount": 40 },
      {
        "index": 3,
        "type": "tumbleBoard",
        "newSymbols": [
          [{ "name": "L4" }],
          [{ "name": "H1" }],
          [{ "name": "H1" }],
          [{ "name": "H4" }, { "name": "L3" }],
          [{ "name": "L4" }],
          [{ "name": "L5" }, { "name": "L3" }]
        ],
        "explodingSymbols": [
          { "reel": 0, "row": 4 },
          { "reel": 1, "row": 2 },
          { "reel": 2, "row": 3 },
          { "reel": 3, "row": 1 },
          { "reel": 3, "row": 4 },
          { "reel": 4, "row": 5 },
          { "reel": 5, "row": 1 },
          { "reel": 5, "row": 4 }
        ]
      },
      {
        "index": 4,
        "type": "winInfo",
        "totalWin": 70,
        "wins": [
          {
            "symbol": "L5",
            "win": 70,
            "positions": [
              { "reel": 0, "row": 1 },
              { "reel": 0, "row": 2 },
              { "reel": 1, "row": 4 },
              { "reel": 2, "row": 2 },
              { "reel": 2, "row": 3 },
              { "reel": 3, "row": 2 },
              { "reel": 3, "row": 4 },
              { "reel": 4, "row": 2 },
              { "reel": 5, "row": 2 },
              { "reel": 5, "row": 4 }
            ],
            "meta": {
              "globalMult": 1,
              "clusterMult": 1,
              "winWithoutMult": 70,
              "overlay": { "reel": 3, "row": 4 }
            }
          }
        ]
      },
      { "index": 5, "type": "updateTumbleWin", "amount": 110 },
      {
        "index": 6,
        "type": "tumbleBoard",
        "newSymbols": [
          [{ "name": "H1" }, { "name": "H2" }],
          [{ "name": "L2" }],
          [{ "name": "H2" }, { "name": "L4" }],
          [{ "name": "H2" }, { "name": "H4" }],
          [{ "name": "H3" }],
          [{ "name": "H3" }, { "name": "L4" }]
        ],
        "explodingSymbols": [
          { "reel": 0, "row": 1 },
          { "reel": 0, "row": 2 },
          { "reel": 1, "row": 4 },
          { "reel": 2, "row": 2 },
          { "reel": 2, "row": 3 },
          { "reel": 3, "row": 2 },
          { "reel": 3, "row": 4 },
          { "reel": 4, "row": 2 },
          { "reel": 5, "row": 2 },
          { "reel": 5, "row": 4 }
        ]
      },
      { "index": 7, "type": "setWin", "amount": 110, "winLevel": 3 },
      { "index": 8, "type": "setTotalWin", "amount": 110 },
      { "index": 9, "type": "finalWin", "amount": 110 }
    ]
  },
  "balance": { "amount": 999000000, "currency": "USD" }
}

export const NormalSpinResponse1 = {
  "round": {
    "betID": 427912224,
    "amount": 1000000,
    "payout": 600000,
    "payoutMultiplier": 0.6,
    "active": true,
    "mode": "base",
    "state": [
      {
        "index": 0,
        "type": "reveal",
        "board": [
          [
            { "name": "L5" },
            { "name": "L5" },
            { "name": "L4" },
            { "name": "H3" },
            { "name": "L3" },
            { "name": "L5" },
            { "name": "L2" }
          ],
          [
            { "name": "L3" },
            { "name": "L4" },
            { "name": "L5" },
            { "name": "L4" },
            { "name": "L3" },
            { "name": "L5" },
            { "name": "L2" }
          ],
          [
            { "name": "L5" },
            { "name": "L3" },
            { "name": "L5" },
            { "name": "L4" },
            { "name": "H3" },
            { "name": "H3" },
            { "name": "H3" }
          ],
          [
            { "name": "H3" },
            { "name": "H4" },
            { "name": "H4" },
            { "name": "L5" },
            { "name": "L4" },
            { "name": "L3" },
            { "name": "H4" }
          ],
          [
            { "name": "L5" },
            { "name": "L2" },
            { "name": "H4" },
            { "name": "L4" },
            { "name": "L5" },
            { "name": "L3" },
            { "name": "H3" }
          ],
          [
            { "name": "H3" },
            { "name": "L4" },
            { "name": "L3" },
            { "name": "L5" },
            { "name": "L2" },
            { "name": "L4" },
            { "name": "H4" }
          ]
        ],
        "paddingPositions": [209, 202, 156, 41, 86, 204],
        "gameType": "basegame",
        "anticipation": [0, 0, 0, 0, 0, 0]
      },
      {
        "index": 1,
        "type": "winInfo",
        "totalWin": 60,
        "wins": [
          {
            "symbol": "L5",
            "win": 20,
            "positions": [
              { "reel": 0, "row": 1 },
              { "reel": 0, "row": 5 },
              { "reel": 1, "row": 2 },
              { "reel": 1, "row": 5 },
              { "reel": 2, "row": 2 },
              { "reel": 3, "row": 3 },
              { "reel": 4, "row": 4 },
              { "reel": 5, "row": 3 }
            ],
            "meta": {
              "globalMult": 1,
              "clusterMult": 1,
              "winWithoutMult": 20,
              "overlay": { "reel": 3, "row": 3 }
            }
          },
          {
            "symbol": "L4",
            "win": 40,
            "positions": [
              { "reel": 0, "row": 2 },
              { "reel": 1, "row": 1 },
              { "reel": 1, "row": 3 },
              { "reel": 2, "row": 3 },
              { "reel": 3, "row": 4 },
              { "reel": 4, "row": 3 },
              { "reel": 5, "row": 1 },
              { "reel": 5, "row": 5 }
            ],
            "meta": {
              "globalMult": 1,
              "clusterMult": 1,
              "winWithoutMult": 40,
              "overlay": { "reel": 3, "row": 4 }
            }
          }
        ]
      },
      { "index": 2, "type": "updateTumbleWin", "amount": 60 },
      {
        "index": 3,
        "type": "tumbleBoard",
        "newSymbols": [
          [{ "name": "H1" }, { "name": "H2" }, { "name": "S", "scatter": true }],
          [{ "name": "H3" }, { "name": "H3" }, { "name": "L5" }, { "name": "H2" }],
          [{ "name": "L1" }, { "name": "L4" }],
          [{ "name": "H2" }, { "name": "H2" }],
          [{ "name": "L4" }, { "name": "H4" }],
          [{ "name": "H1" }, { "name": "H1" }, { "name": "L5" }]
        ],
        "explodingSymbols": [
          { "reel": 0, "row": 1 },
          { "reel": 0, "row": 5 },
          { "reel": 0, "row": 2 },
          { "reel": 1, "row": 2 },
          { "reel": 1, "row": 5 },
          { "reel": 1, "row": 1 },
          { "reel": 1, "row": 3 },
          { "reel": 2, "row": 2 },
          { "reel": 2, "row": 3 },
          { "reel": 3, "row": 3 },
          { "reel": 3, "row": 4 },
          { "reel": 4, "row": 4 },
          { "reel": 4, "row": 3 },
          { "reel": 5, "row": 3 },
          { "reel": 5, "row": 1 },
          { "reel": 5, "row": 5 }
        ]
      },
      { "index": 4, "type": "setWin", "amount": 60, "winLevel": 2 },
      { "index": 5, "type": "setTotalWin", "amount": 60 },
      { "index": 6, "type": "finalWin", "amount": 60 }
    ]
  },
  "balance": { "amount": 945301000, "currency": "USD" }
}


export const FreeGameRes = {
  "round": {
    "betID": 448835747,
    "amount": 1000000,
    "payout": 20200000,
    "payoutMultiplier": 20.2,
    "active": true,
    "mode": "bonus",
    "state": [
      {
        "index": 0,
        "type": "reveal",
        "board": [
          [
            { "name": "H4" },
            { "name": "S", "scatter": true },
            { "name": "L4" },
            { "name": "L3" },
            { "name": "H3" },
            { "name": "H3" },
            { "name": "L5" }
          ],
          [
            { "name": "L1" },
            { "name": "S", "scatter": true },
            { "name": "L2" },
            { "name": "H3" },
            { "name": "H3" },
            { "name": "L5" },
            { "name": "H2" }
          ],
          [
            { "name": "H1" },
            { "name": "H3" },
            { "name": "L2" },
            { "name": "L4" },
            { "name": "L5" },
            { "name": "H3" },
            { "name": "H3" }
          ],
          [
            { "name": "L2" },
            { "name": "L1" },
            { "name": "L4" },
            { "name": "H2" },
            { "name": "H2" },
            { "name": "S", "scatter": true },
            { "name": "L5" }
          ],
          [
            { "name": "L4" },
            { "name": "L5" },
            { "name": "L3" },
            { "name": "L5" },
            { "name": "H1" },
            { "name": "S", "scatter": true },
            { "name": "L4" }
          ],
          [
            { "name": "H3" },
            { "name": "L2" },
            { "name": "H4" },
            { "name": "L1" },
            { "name": "H3" },
            { "name": "S", "scatter": true },
            { "name": "H4" }
          ]
        ],
        "paddingPositions": [101, 195, 9, 97, 205, 40],
        "gameType": "basegame",
        "anticipation": [0, 0, 0, 0, 1, 2]
      },
      { "index": 1, "type": "setTotalWin", "amount": 0 },
      {
        "index": 2,
        "type": "freeSpinTrigger",
        "totalFs": 10,
        "positions": [
          { "reel": 0, "row": 1 },
          { "reel": 1, "row": 1 },
          { "reel": 3, "row": 5 },
          { "reel": 4, "row": 5 },
          { "reel": 5, "row": 5 }
        ]
      },
      { "index": 3, "type": "updateFreeSpin", "amount": 1, "total": 10 },
      { "index": 4, "type": "updateGlobalMult", "globalMult": 1 },
      {
        "index": 5,
        "type": "reveal",
        "board": [
          [
            { "name": "L3" },
            { "name": "L5" },
            { "name": "L4" },
            { "name": "L1" },
            { "name": "L2" },
            { "name": "H1" },
            { "name": "H1" }
          ],
          [
            { "name": "H2" },
            { "name": "H2" },
            { "name": "L2" },
            { "name": "H2" },
            { "name": "L1" },
            { "name": "L3" },
            { "name": "L4" }
          ],
          [
            { "name": "L4" },
            { "name": "L2" },
            { "name": "L5" },
            { "name": "H1" },
            { "name": "H1" },
            { "name": "L4" },
            { "name": "L3" }
          ],
          [
            { "name": "H4" },
            { "name": "L4" },
            { "name": "L5" },
            { "name": "L5" },
            { "name": "L4" },
            { "name": "H2" },
            { "name": "H2" }
          ],
          [
            { "name": "L4" },
            { "name": "H3" },
            { "name": "H3" },
            { "name": "H3" },
            { "name": "L5" },
            { "name": "H3" },
            { "name": "H2" }
          ],
          [
            { "name": "L3" },
            { "name": "H2" },
            { "name": "H2" },
            { "name": "L5" },
            { "name": "L4" },
            { "name": "L2" },
            { "name": "H4" }
          ]
        ],
        "paddingPositions": [129, 237, 62, 153, 187, 57],
        "gameType": "freegame",
        "anticipation": [0, 0, 0, 0, 0, 0]
      },
      { "index": 6, "type": "setTotalWin", "amount": 0 },
      { "index": 7, "type": "updateFreeSpin", "amount": 2, "total": 10 },
      { "index": 8, "type": "updateGlobalMult", "globalMult": 1 },
      {
        "index": 9,
        "type": "reveal",
        "board": [
          [
            { "name": "H4" },
            { "name": "H3" },
            { "name": "L5" },
            { "name": "L3" },
            { "name": "S", "scatter": true },
            { "name": "H2" },
            { "name": "L4" }
          ],
          [
            { "name": "L4" },
            { "name": "L5" },
            { "name": "L2" },
            { "name": "L1" },
            { "name": "H1" },
            { "name": "H1" },
            { "name": "H4" }
          ],
          [
            { "name": "H4" },
            { "name": "H1" },
            { "name": "H3" },
            { "name": "H3" },
            { "name": "H2" },
            { "name": "H3" },
            { "name": "H4" }
          ],
          [
            { "name": "L5" },
            { "name": "H4" },
            { "name": "L4" },
            { "name": "L3" },
            { "name": "H3" },
            { "name": "H1" },
            { "name": "H1" }
          ],
          [
            { "name": "L5" },
            { "name": "L2" },
            { "name": "L1" },
            { "name": "L4" },
            { "name": "L5" },
            { "name": "L3" },
            { "name": "L5" }
          ],
          [
            { "name": "L2" },
            { "name": "L1" },
            { "name": "L4" },
            { "name": "L5" },
            { "name": "L3" },
            { "name": "H2" },
            { "name": "H2" }
          ]
        ],
        "paddingPositions": [80, 38, 54, 2, 210, 53],
        "gameType": "freegame",
        "anticipation": [0, 0, 0, 0, 0, 0]
      },
      { "index": 10, "type": "setTotalWin", "amount": 0 },
      { "index": 11, "type": "updateFreeSpin", "amount": 3, "total": 10 },
      { "index": 12, "type": "updateGlobalMult", "globalMult": 1 },
      {
        "index": 13,
        "type": "reveal",
        "board": [
          [
            { "name": "L4" },
            { "name": "H3" },
            { "name": "H3" },
            { "name": "L5" },
            { "name": "L1" },
            { "name": "H3" },
            { "name": "H4" }
          ],
          [
            { "name": "L4" },
            { "name": "L2" },
            { "name": "H2" },
            { "name": "H2" },
            { "name": "H3" },
            { "name": "L5" },
            { "name": "L4" }
          ],
          [
            { "name": "L3" },
            { "name": "H2" },
            { "name": "M", "multiplier": 10 },
            { "name": "L1" },
            { "name": "L5" },
            { "name": "H3" },
            { "name": "L4" }
          ],
          [
            { "name": "H2" },
            { "name": "L5" },
            { "name": "L2" },
            { "name": "H3" },
            { "name": "S", "scatter": true },
            { "name": "H3" },
            { "name": "H3" }
          ],
          [
            { "name": "H1" },
            { "name": "L4" },
            { "name": "H3" },
            { "name": "L3" },
            { "name": "L1" },
            { "name": "L5" },
            { "name": "H3" }
          ],
          [
            { "name": "H2" },
            { "name": "H4" },
            { "name": "H2" },
            { "name": "H4" },
            { "name": "L3" },
            { "name": "L5" },
            { "name": "L4" }
          ]
        ],
        "paddingPositions": [108, 126, 68, 174, 223, 132],
        "gameType": "freegame",
        "anticipation": [0, 0, 0, 0, 0, 0]
      },
      {
        "index": 14,
        "type": "winInfo",
        "totalWin": 200,
        "wins": [
          {
            "symbol": "H3",
            "win": 200,
            "positions": [
              { "reel": 0, "row": 1 },
              { "reel": 0, "row": 2 },
              { "reel": 0, "row": 5 },
              { "reel": 1, "row": 4 },
              { "reel": 2, "row": 5 },
              { "reel": 3, "row": 3 },
              { "reel": 3, "row": 5 },
              { "reel": 4, "row": 2 }
            ],
            "meta": {
              "globalMult": 1,
              "clusterMult": 1,
              "winWithoutMult": 200,
              "overlay": { "reel": 3, "row": 3 }
            }
          }
        ]
      },
      { "index": 15, "type": "updateTumbleWin", "amount": 200 },
      {
        "index": 16,
        "type": "tumbleBoard",
        "newSymbols": [
          [{ "name": "H3" }, { "name": "H3" }, { "name": "L2" }],
          [{ "name": "H4" }],
          [{ "name": "L4" }],
          [{ "name": "L4" }, { "name": "H2" }],
          [{ "name": "H1" }],
          []
        ],
        "explodingSymbols": [
          { "reel": 0, "row": 1 },
          { "reel": 0, "row": 2 },
          { "reel": 0, "row": 5 },
          { "reel": 1, "row": 4 },
          { "reel": 2, "row": 5 },
          { "reel": 3, "row": 3 },
          { "reel": 3, "row": 5 },
          { "reel": 4, "row": 2 }
        ]
      },
      {
        "index": 17,
        "type": "boardMultiplierInfo",
        "multInfo": {
          "positions": [{ "reel": 2, "row": 3, "multiplier": 10 }]
        },
        "winInfo": { "tumbleWin": 200, "boardMult": 10, "totalWin": 2000 }
      },
      { "index": 18, "type": "updateTumbleWin", "amount": 2000 },
      { "index": 19, "type": "setWin", "amount": 2000, "winLevel": 6 },
      { "index": 20, "type": "setTotalWin", "amount": 2000 },
      { "index": 21, "type": "updateFreeSpin", "amount": 4, "total": 10 },
      { "index": 22, "type": "updateGlobalMult", "globalMult": 1 },
      {
        "index": 23,
        "type": "reveal",
        "board": [
          [
            { "name": "H3" },
            { "name": "H3" },
            { "name": "L5" },
            { "name": "H3" },
            { "name": "L2" },
            { "name": "L4" },
            { "name": "H1" }
          ],
          [
            { "name": "L1" },
            { "name": "H1" },
            { "name": "H1" },
            { "name": "H4" },
            { "name": "L3" },
            { "name": "L4" },
            { "name": "H4" }
          ],
          [
            { "name": "L4" },
            { "name": "S", "scatter": true },
            { "name": "L2" },
            { "name": "L5" },
            { "name": "L3" },
            { "name": "H1" },
            { "name": "H1" }
          ],
          [
            { "name": "H1" },
            { "name": "H3" },
            { "name": "L1" },
            { "name": "L5" },
            { "name": "H4" },
            { "name": "L4" },
            { "name": "H1" }
          ],
          [
            { "name": "H1" },
            { "name": "L4" },
            { "name": "L5" },
            { "name": "L5" },
            { "name": "L4" },
            { "name": "L3" },
            { "name": "L5" }
          ],
          [
            { "name": "H3" },
            { "name": "H3" },
            { "name": "L2" },
            { "name": "L4" },
            { "name": "L5" },
            { "name": "H2" },
            { "name": "H2" }
          ]
        ],
        "paddingPositions": [118, 152, 177, 8, 169, 125],
        "gameType": "freegame",
        "anticipation": [0, 0, 0, 0, 0, 0]
      },
      { "index": 24, "type": "setTotalWin", "amount": 2000 },
      { "index": 25, "type": "updateFreeSpin", "amount": 5, "total": 10 },
      { "index": 26, "type": "updateGlobalMult", "globalMult": 1 },
      {
        "index": 27,
        "type": "reveal",
        "board": [
          [
            { "name": "H4" },
            { "name": "L5" },
            { "name": "L2" },
            { "name": "L1" },
            { "name": "L5" },
            { "name": "L4" },
            { "name": "L3" }
          ],
          [
            { "name": "L4" },
            { "name": "H4" },
            { "name": "H2" },
            { "name": "H2" },
            { "name": "L5" },
            { "name": "L3" },
            { "name": "H4" }
          ],
          [
            { "name": "H3" },
            { "name": "L2" },
            { "name": "H1" },
            { "name": "H1" },
            { "name": "L1" },
            { "name": "H4" },
            { "name": "L4" }
          ],
          [
            { "name": "M", "multiplier": 5 },
            { "name": "L3" },
            { "name": "H1" },
            { "name": "H4" },
            { "name": "H4" },
            { "name": "H2" },
            { "name": "L4" }
          ],
          [
            { "name": "L4" },
            { "name": "L2" },
            { "name": "L5" },
            { "name": "H4" },
            { "name": "L3" },
            { "name": "L4" },
            { "name": "H3" }
          ],
          [
            { "name": "L5" },
            { "name": "L4" },
            { "name": "M", "multiplier": 10 },
            { "name": "H2" },
            { "name": "H2" },
            { "name": "L1" },
            { "name": "H4" }
          ]
        ],
        "paddingPositions": [248, 88, 239, 23, 155, 137],
        "gameType": "freegame",
        "anticipation": [0, 0, 0, 0, 0, 0]
      },
      { "index": 28, "type": "setTotalWin", "amount": 2000 },
      { "index": 29, "type": "updateFreeSpin", "amount": 6, "total": 10 },
      { "index": 30, "type": "updateGlobalMult", "globalMult": 1 },
      {
        "index": 31,
        "type": "reveal",
        "board": [
          [
            { "name": "H3" },
            { "name": "L5" },
            { "name": "H3" },
            { "name": "L2" },
            { "name": "L4" },
            { "name": "H1" },
            { "name": "L5" }
          ],
          [
            { "name": "L5" },
            { "name": "L3" },
            { "name": "H2" },
            { "name": "H2" },
            { "name": "L5" },
            { "name": "H2" },
            { "name": "H2" }
          ],
          [
            { "name": "L1" },
            { "name": "L3" },
            { "name": "L4" },
            { "name": "L5" },
            { "name": "H3" },
            { "name": "H3" },
            { "name": "L5" }
          ],
          [
            { "name": "H2" },
            { "name": "H2" },
            { "name": "L3" },
            { "name": "H2" },
            { "name": "H4" },
            { "name": "H4" },
            { "name": "L4" }
          ],
          [
            { "name": "L2" },
            { "name": "L4" },
            { "name": "H3" },
            { "name": "H3" },
            { "name": "H3" },
            { "name": "L5" },
            { "name": "H3" }
          ],
          [
            { "name": "L4" },
            { "name": "L2" },
            { "name": "H4" },
            { "name": "L5" },
            { "name": "H2" },
            { "name": "H3" },
            { "name": "H1" }
          ]
        ],
        "paddingPositions": [119, 211, 189, 148, 186, 61],
        "gameType": "freegame",
        "anticipation": [0, 0, 0, 0, 0, 0]
      },
      { "index": 32, "type": "setTotalWin", "amount": 2000 },
      { "index": 33, "type": "updateFreeSpin", "amount": 7, "total": 10 },
      { "index": 34, "type": "updateGlobalMult", "globalMult": 1 },
      {
        "index": 35,
        "type": "reveal",
        "board": [
          [
            { "name": "L3" },
            { "name": "L4" },
            { "name": "H3" },
            { "name": "H3" },
            { "name": "H3" },
            { "name": "L5" },
            { "name": "H3" }
          ],
          [
            { "name": "H3" },
            { "name": "H4" },
            { "name": "H4" },
            { "name": "L4" },
            { "name": "H3" },
            { "name": "H3" },
            { "name": "L3" }
          ],
          [
            { "name": "L5" },
            { "name": "L3" },
            { "name": "L4" },
            { "name": "H1" },
            { "name": "H2" },
            { "name": "H2" },
            { "name": "H4" }
          ],
          [
            { "name": "L1" },
            { "name": "L2" },
            { "name": "L5" },
            { "name": "L3" },
            { "name": "L4" },
            { "name": "H2" },
            { "name": "H2" }
          ],
          [
            { "name": "L2" },
            { "name": "L1" },
            { "name": "H1" },
            { "name": "L3" },
            { "name": "L4" },
            { "name": "H3" },
            { "name": "L5" }
          ],
          [
            { "name": "H2" },
            { "name": "H4" },
            { "name": "L4" },
            { "name": "H2" },
            { "name": "H1" },
            { "name": "H1" },
            { "name": "L5" }
          ]
        ],
        "paddingPositions": [115, 166, 27, 189, 242, 197],
        "gameType": "freegame",
        "anticipation": [0, 0, 0, 0, 0, 0]
      },
      { "index": 36, "type": "setTotalWin", "amount": 2000 },
      { "index": 37, "type": "updateFreeSpin", "amount": 8, "total": 10 },
      { "index": 38, "type": "updateGlobalMult", "globalMult": 1 },
      {
        "index": 39,
        "type": "reveal",
        "board": [
          [
            { "name": "L2" },
            { "name": "L4" },
            { "name": "H3" },
            { "name": "H3" },
            { "name": "L5" },
            { "name": "L1" },
            { "name": "H3" }
          ],
          [
            { "name": "L5" },
            { "name": "L4" },
            { "name": "L3" },
            { "name": "H1" },
            { "name": "L1" },
            { "name": "L5" },
            { "name": "H4" }
          ],
          [
            { "name": "H4" },
            { "name": "H1" },
            { "name": "H1" },
            { "name": "L4" },
            { "name": "L5" },
            { "name": "L2" },
            { "name": "L4" }
          ],
          [
            { "name": "H1" },
            { "name": "L3" },
            { "name": "L4" },
            { "name": "L5" },
            { "name": "L2" },
            { "name": "H3" },
            { "name": "L1" }
          ],
          [
            { "name": "H1" },
            { "name": "H3" },
            { "name": "L3" },
            { "name": "L4" },
            { "name": "H3" },
            { "name": "L5" },
            { "name": "H3" }
          ],
          [
            { "name": "L4" },
            { "name": "L5" },
            { "name": "L2" },
            { "name": "L4" },
            { "name": "L5" },
            { "name": "L3" },
            { "name": "L5" }
          ]
        ],
        "paddingPositions": [107, 131, 116, 226, 118, 20],
        "gameType": "freegame",
        "anticipation": [0, 0, 0, 0, 0, 0]
      },
      { "index": 40, "type": "setTotalWin", "amount": 2000 },
      { "index": 41, "type": "updateFreeSpin", "amount": 9, "total": 10 },
      { "index": 42, "type": "updateGlobalMult", "globalMult": 1 },
      {
        "index": 43,
        "type": "reveal",
        "board": [
          [
            { "name": "L3" },
            { "name": "H3" },
            { "name": "L5" },
            { "name": "L2" },
            { "name": "L4" },
            { "name": "L5" },
            { "name": "H1" }
          ],
          [
            { "name": "H4" },
            { "name": "L5" },
            { "name": "L5" },
            { "name": "L4" },
            { "name": "L3" },
            { "name": "H2" },
            { "name": "H2" }
          ],
          [
            { "name": "H4" },
            { "name": "L5" },
            { "name": "H4" },
            { "name": "L2" },
            { "name": "H2" },
            { "name": "H4" },
            { "name": "H1" }
          ],
          [
            { "name": "H3" },
            { "name": "H3" },
            { "name": "L4" },
            { "name": "L5" },
            { "name": "L2" },
            { "name": "L1" },
            { "name": "H2" }
          ],
          [
            { "name": "L1" },
            { "name": "L5" },
            { "name": "H3" },
            { "name": "L4" },
            { "name": "H1" },
            { "name": "H1" },
            { "name": "H1" }
          ],
          [
            { "name": "H3" },
            { "name": "H3" },
            { "name": "L2" },
            { "name": "L4" },
            { "name": "L5" },
            { "name": "H2" },
            { "name": "H2" }
          ]
        ],
        "paddingPositions": [211, 49, 199, 142, 49, 125],
        "gameType": "freegame",
        "anticipation": [0, 0, 0, 0, 0, 0]
      },
      {
        "index": 44,
        "type": "winInfo",
        "totalWin": 20,
        "wins": [
          {
            "symbol": "L5",
            "win": 20,
            "positions": [
              { "reel": 0, "row": 2 },
              { "reel": 0, "row": 5 },
              { "reel": 1, "row": 1 },
              { "reel": 1, "row": 2 },
              { "reel": 2, "row": 1 },
              { "reel": 3, "row": 3 },
              { "reel": 4, "row": 1 },
              { "reel": 5, "row": 4 }
            ],
            "meta": {
              "globalMult": 1,
              "clusterMult": 1,
              "winWithoutMult": 20,
              "overlay": { "reel": 3, "row": 3 }
            }
          }
        ]
      },
      { "index": 45, "type": "updateTumbleWin", "amount": 20 },
      {
        "index": 46,
        "type": "tumbleBoard",
        "newSymbols": [
          [{ "name": "L5" }, { "name": "L4" }],
          [{ "name": "H4" }, { "name": "H2" }],
          [{ "name": "L3" }],
          [{ "name": "H2" }],
          [{ "name": "L3" }],
          [{ "name": "L5" }]
        ],
        "explodingSymbols": [
          { "reel": 0, "row": 2 },
          { "reel": 0, "row": 5 },
          { "reel": 1, "row": 1 },
          { "reel": 1, "row": 2 },
          { "reel": 2, "row": 1 },
          { "reel": 3, "row": 3 },
          { "reel": 4, "row": 1 },
          { "reel": 5, "row": 4 }
        ]
      },
      { "index": 47, "type": "setWin", "amount": 20, "winLevel": 2 },
      { "index": 48, "type": "setTotalWin", "amount": 2020 },
      { "index": 49, "type": "updateFreeSpin", "amount": 10, "total": 10 },
      { "index": 50, "type": "updateGlobalMult", "globalMult": 1 },
      {
        "index": 51,
        "type": "reveal",
        "board": [
          [
            { "name": "H3" },
            { "name": "H3" },
            { "name": "L5" },
            { "name": "L4" },
            { "name": "H4" },
            { "name": "L1" },
            { "name": "L2" }
          ],
          [
            { "name": "H2" },
            { "name": "H2" },
            { "name": "H3" },
            { "name": "H4" },
            { "name": "L5" },
            { "name": "H3" },
            { "name": "H4" }
          ],
          [
            { "name": "L4" },
            { "name": "L1" },
            { "name": "L2" },
            { "name": "H4" },
            { "name": "L5" },
            { "name": "L3" },
            { "name": "L4" }
          ],
          [
            { "name": "H4" },
            { "name": "H4" },
            { "name": "H2" },
            { "name": "L4" },
            { "name": "H3" },
            { "name": "H3" },
            { "name": "L5" }
          ],
          [
            { "name": "L5" },
            { "name": "L3" },
            { "name": "L5" },
            { "name": "L4" },
            { "name": "L2" },
            { "name": "H1" },
            { "name": "H1" }
          ],
          [
            { "name": "H2" },
            { "name": "H3" },
            { "name": "H2" },
            { "name": "H4" },
            { "name": "H4" },
            { "name": "L1" },
            { "name": "H1" }
          ]
        ],
        "paddingPositions": [32, 161, 23, 26, 214, 114],
        "gameType": "freegame",
        "anticipation": [0, 0, 0, 0, 0, 0]
      },
      { "index": 52, "type": "setTotalWin", "amount": 2020 },
      { "index": 53, "type": "freeSpinEnd", "amount": 2020, "winLevel": 5 },
      { "index": 54, "type": "finalWin", "amount": 2020 }
    ]
  },
  "balance": { "amount": 800000000, "currency": "USD" }
}

export function getResponse() {
  let val = Math.floor(Math.random() * 3);
  console.log("val : ", val);
  if(val === 0){
    return NormalSpinResponse;
  }else if(val === 1){
    return NormalSpinResponse1;
  }else{
    return FreeGameRes;
  }
}