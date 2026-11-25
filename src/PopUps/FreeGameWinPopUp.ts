import { Text } from "pixi.js";
import PopUpBase from "../utils/PopUps/PopUpBase";
import {
  Button,
  COLORS,
  makeText,
  makeTitle,
  roundedPanel,
  ValueAnimator,
} from "../UI/Widgets";
import { money } from "../UI/Format";
import {
  Events,
  GAME,
  PopUps,
  PopUpType,
  QUEUEACTIONEND,
  QUEUE_PRIORITY,
  SFX,
  Sounds,
} from "../Data/GameConstants";

/** Port of Royal Tower FreeGameWinPopUp: total won at the end of free spins. */
export default class FreeGameWinPopUp extends PopUpBase {
  private winLabel: Text;
  private winCount: ValueAnimator;
  private totalFreeSpinsLabel: Text;
  private continueButton: Button;
  private onSpace = () => this.onContinueClick();

  protected build(): void {
    const panel = roundedPanel(940, 620);
    const title = makeTitle("CONGRATULATIONS", 76);
    title.y = -210;
    const won = makeText("YOU HAVE WON", { fontSize: 40 });
    won.y = -110;
    this.winLabel = makeTitle(money(0), 120, COLORS.white);
    this.winLabel.y = 10;
    this.winCount = new ValueAnimator(this.winLabel, (v) => money(v));
    this.totalFreeSpinsLabel = makeText("", {
      fontSize: 40,
      fill: COLORS.gold,
    });
    this.totalFreeSpinsLabel.y = 130;
    this.continueButton = new Button("CONTINUE", {
      width: 320,
      height: 90,
      fontSize: 38,
    });
    this.continueButton.y = 240;
    this.continueButton.onClick(() => this.onContinueClick());
    this.content.addChild(
      panel,
      title,
      won,
      this.winLabel,
      this.totalFreeSpinsLabel,
      this.continueButton,
    );
  }

  protected onShow(): void {
    super.onShow();
    Sounds.playSoundAsync(SFX.FREESPIN_TOTAL);
    Events.on("SpaceButtonPressed", this.onSpace, this);
    const total = GAME.Current?.TotalWin ?? GAME.roundWin ?? 0;
    this.winCount.animateTo(0, total, 2.5);
    this.totalFreeSpinsLabel.text = `IN ${GAME.freespinCounter || GAME.totalFreeSpins} FREE SPINS`;
    this.continueButton.interactable = true;
    if (GAME.autoToggle)
      setTimeout(() => this.isShowing && this.onContinueClick(), 5000);
  }

  protected onHide(): void {
    super.onHide();
    Events.removeListener("SpaceButtonPressed", this.onSpace, this);
    Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.FREESPINEND);
  }

  onContinueClick() {
    if (!this.continueButton.interactable || !this.isShowing) return;
    this.continueButton.interactable = false;
    this.winCount.finish();
    Sounds.playSoundAsync(SFX.COMMON_BUTTON);
    setTimeout(() => PopUps.hide(PopUpType.FreeGameWin), 500);
  }
}
