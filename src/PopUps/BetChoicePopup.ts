import { Container, Text } from "pixi.js";
import PopUpBase from "../utils/PopUps/PopUpBase";
import { Button, COLORS, makeTitle, roundedPanel } from "../UI/Widgets";
import { money } from "../UI/Format";
import {
  anteBetAmount,
  BottomUI,
  GAME,
  PopUps,
  PopUpType,
  SFX,
  Sounds,
} from "../Data/GameConstants";

/** Port of Royal Tower BetChoicePopup: +/−, max bet and a grid of bet levels. */
export default class BetChoicePopup extends PopUpBase {
  private totalBetLabel: Text;
  private increaseButton: Button;
  private decreaseButton: Button;
  private maxButton: Button;
  private grid = new Container();
  private levelButtons: Button[] = [];
  currentLineBetIndex = 0;

  protected build(): void {
    const panel = roundedPanel(900, 760);
    const title = makeTitle("TOTAL BET", 68);
    title.y = -310;
    const close = new Button("✕", {
      circle: true,
      width: 70,
      color: COLORS.panelLight,
      textColor: COLORS.white,
      fontSize: 30,
    });
    close.position.set(400, -330);
    close.onClick(() => this.closeClick());

    this.totalBetLabel = makeTitle(money(0), 80, COLORS.white);
    this.totalBetLabel.y = -200;
    this.decreaseButton = new Button("−", {
      circle: true,
      width: 100,
      fontSize: 60,
    });
    this.decreaseButton.position.set(-300, -200);
    this.decreaseButton.onClick(() => this.onDecreaseBetButtonClick());
    this.increaseButton = new Button("+", {
      circle: true,
      width: 100,
      fontSize: 56,
    });
    this.increaseButton.position.set(300, -200);
    this.increaseButton.onClick(() => this.onIncreaseBetButtonClick());

    this.grid.y = 30;
    this.maxButton = new Button("MAX BET", {
      width: 320,
      height: 90,
      color: COLORS.red,
      textColor: COLORS.white,
    });
    this.maxButton.y = 300;
    this.maxButton.onClick(() => this.onMaxBetButtonClick());

    this.content.addChild(
      panel,
      title,
      close,
      this.totalBetLabel,
      this.decreaseButton,
      this.increaseButton,
      this.grid,
      this.maxButton,
    );
  }

  private buildGrid() {
    const levels = GAME.GameInfo?.LineBet ?? [];
    if (this.levelButtons.length === levels.length) return;
    this.grid.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.levelButtons = [];
    const cols = 5;
    const rowsCount = Math.ceil(levels.length / cols);
    const bw = 150;
    const bh = 64;
    levels.forEach((level, i) => {
      const b = new Button(money(level), {
        width: bw,
        height: bh,
        fontSize: 24,
        color: COLORS.panelLight,
        textColor: COLORS.white,
      });
      const c = i % cols;
      const r = Math.floor(i / cols);
      b.position.set(
        (c - (cols - 1) / 2) * (bw + 14),
        (r - (rowsCount - 1) / 2) * (bh + 14),
      );
      b.onClick(() => {
        Sounds.playSoundAsync(SFX.COMMON_BUTTON);
        this.changeBet(i);
      });
      this.levelButtons.push(b);
      this.grid.addChild(b);
    });
    const maxH = 300;
    const gridH = rowsCount * (bh + 14);
    this.grid.scale.set(gridH > maxH ? maxH / gridH : 1);
  }

  protected onShow(): void {
    super.onShow();
    GAME.isUILocked = false;
    this.buildGrid();
    this.initialSetup();
  }

  initialSetup() {
    this.currentLineBetIndex = GAME.currentCredit;
    this.refresh();
  }

  setData(index: number) {
    GAME.currentCredit = index;
    GAME.bet = +GAME.GameInfo.LineBet[index].toFixed(3);
    if (GAME.Current?.Round)
      GAME.Current.Round.LineBet = GAME.GameInfo.LineBet[index];
  }

  changeBet(index: number) {
    if (
      GAME.GameInfo.LineBet[index] > GAME.Player.Balance &&
      index > GAME.currentCredit
    )
      return;
    this.currentLineBetIndex = index;
    this.setData(index);
    BottomUI.setBet();
    this.refresh();
  }

  closeClick() {
    Sounds.playSoundAsync(SFX.COMMON_BUTTON);
    PopUps.hide(PopUpType.BetChoicePopUp);
  }

  onIncreaseBetButtonClick() {
    BottomUI.changeBet(true);
    this.currentLineBetIndex = GAME.currentCredit;
    this.refresh();
  }

  onDecreaseBetButtonClick() {
    BottomUI.changeBet(false);
    this.currentLineBetIndex = GAME.currentCredit;
    this.refresh();
  }

  onMaxBetButtonClick() {
    Sounds.playSoundAsync(SFX.COMMON_BUTTON);
    BottomUI.maxBet();
    this.currentLineBetIndex = GAME.GameInfo.LineBet.length - 1;
    this.refresh();
  }

  private refresh() {
    const bet = GAME.BonusBoostFeatureBought
      ? GAME.bet * anteBetAmount
      : GAME.bet;
    this.totalBetLabel.text = money(bet);
    const last = GAME.GameInfo.LineBet.length - 1;
    this.increaseButton.interactable = this.currentLineBetIndex < last;
    this.decreaseButton.interactable = this.currentLineBetIndex > 0;
    this.maxButton.interactable = this.currentLineBetIndex !== last;
    this.levelButtons.forEach((b, i) =>
      b.setColor(
        i === this.currentLineBetIndex ? COLORS.goldDark : COLORS.panelLight,
      ),
    );
  }

  protected onHide(): void {
    super.onHide();
    GAME.isUILocked = false;
  }
}
