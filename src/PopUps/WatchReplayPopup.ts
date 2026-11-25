import { Text } from "pixi.js";
import PopUpBase from "../utils/PopUps/PopUpBase";
import {
  Button,
  COLORS,
  makeText,
  makeTitle,
  roundedPanel,
} from "../UI/Widgets";
import { money } from "../UI/Format";
import { BOOK_AMOUNT_MULTIPLIER } from "../StakeClient/constants";
import {
  Events,
  GAME,
  GameView,
  PopUps,
  PopUpType,
  SFX,
  Sounds,
} from "../Data/GameConstants";

/** Port of Royal Tower WatchReplayPopup: replay summary; continue starts (or restarts) the replay. */
export default class WatchReplayPopup extends PopUpBase {
  private rows: Record<string, Text> = {};
  private isCalledFromLoginScreen = false;

  protected build(): void {
    const panel = roundedPanel(820, 640);
    const title = makeTitle("REPLAY", 72);
    title.y = -250;
    this.content.addChild(panel, title);
    [
      "MODE",
      "BET",
      "TOTAL BET",
      "COST MULTIPLIER",
      "PAYOUT MULTIPLIER",
      "TOTAL WIN",
    ].forEach((key, i) => {
      const y = -160 + i * 56;
      const k = makeText(key, { fontSize: 30, fill: COLORS.gold });
      k.anchor.set(0, 0.5);
      k.position.set(-340, y);
      const v = makeText("", { fontSize: 30 });
      v.anchor.set(1, 0.5);
      v.position.set(340, y);
      this.rows[key] = v;
      this.content.addChild(k, v);
    });
    const play = new Button("WATCH REPLAY", { width: 380, height: 90 });
    play.y = 230;
    play.onClick(() => this.onContinue());
    this.content.addChild(play);
  }

  protected onShow(): void {
    super.onShow();
    if (this.data != null)
      this.isCalledFromLoginScreen = !!this.data.calledFromLoginScreen;
    const p = GAME.replayParams as any;
    if (!p) return;
    const cost = Number(p.costMultiplier ?? 1);
    this.rows["MODE"].text = String(p.mode ?? "base").toUpperCase();
    this.rows["BET"].text = money(GAME.bet);
    this.rows["TOTAL BET"].text = money(cost * GAME.bet);
    this.rows["COST MULTIPLIER"].text = `${cost}x`;
    this.rows["PAYOUT MULTIPLIER"].text = `${p.payoutMultiplier ?? 0}x`;
    this.rows["TOTAL WIN"].text = money(
      ((p.totalwin ?? 0) / BOOK_AMOUNT_MULTIPLIER) * GAME.bet,
    );
  }

  onContinue(): void {
    Sounds.playSoundAsync(SFX.COMMON_BUTTON);
    PopUps.hide(PopUpType.ReplayPopup);
  }

  protected onHide(): void {
    super.onHide();
    if (this.isCalledFromLoginScreen) {
      this.isCalledFromLoginScreen = false;
      Events.emit("watchReplay");
    } else {
      GameView.onSpinBtn();
    }
  }
}
