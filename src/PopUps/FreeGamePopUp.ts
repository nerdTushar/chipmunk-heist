import { Text } from "pixi.js";
import PopUpBase from "../utils/PopUps/PopUpBase";
import {
  Button,
  COLORS,
  makeText,
  makeTitle,
  roundedPanel,
} from "../UI/Widgets";
import { Tweens, Ease } from "../core/Tween";
import { StakeFreeSpinRetriggerState } from "../Data/StakePlayResponse";
import {
  Events,
  GAME,
  GameView,
  PopUps,
  PopUpType,
  QUEUEACTIONEND,
  QUEUE_PRIORITY,
  SFX,
  Sounds,
} from "../Data/GameConstants";

/** Port of Royal Tower FreeGamePopUp: "YOU WON N FREE SPINS" (or "+N" on retrigger). */
export default class FreeGamePopUp extends PopUpBase {
  private countLabel: Text;
  private subtitle: Text;
  private continueButton: Button;
  private onSpace = () => this.onContinueClick();

  protected build(): void {
    const panel = roundedPanel(900, 620);
    const title = makeTitle("CONGRATULATIONS", 76);
    title.y = -210;
    const won = makeText("YOU HAVE WON", { fontSize: 40 });
    won.y = -110;
    this.countLabel = makeTitle("10", 170, COLORS.white);
    this.countLabel.y = 20;
    this.subtitle = makeText("FREE SPINS", { fontSize: 52, fill: COLORS.gold });
    this.subtitle.y = 140;
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
      this.countLabel,
      this.subtitle,
      this.continueButton,
    );
  }

  protected onShow(): void {
    super.onShow();
    Sounds.playSoundAsync(SFX.FREESPIN_AWARDED);
    Events.on("SpaceButtonPressed", this.onSpace, this);
    this.continueButton.interactable = true;
    if (this.data === true) {
      const retrigger = GAME.getStakeStateByIndex(
        GAME.CurrentScreen,
      ) as StakeFreeSpinRetriggerState;
      const extra =
        (retrigger?.totalFs ?? GAME.totalFreeSpins) - GAME.totalFreeSpins;
      this.countLabel.text = `+${Math.max(extra, 0)}`;
      this.subtitle.text = "EXTRA FREE SPINS";
      Sounds.playSoundAsync(SFX.FREESPIN_RETRIGGER);
    } else {
      this.countLabel.text = `${GAME.totalFreeSpins}`;
      this.subtitle.text = "FREE SPINS";
    }
    this.countLabel.scale.set(0);
    Tweens.to(
      this.countLabel.scale,
      { x: 1, y: 1 },
      { duration: 0.5, delay: 0.25, ease: Ease.backOut },
    );
    // Auto spins should not stall on this popup.
    if (GAME.autoToggle)
      setTimeout(() => this.isShowing && this.onContinueClick(), 3000);
  }

  protected onHide(): void {
    super.onHide();
    Events.removeListener("SpaceButtonPressed", this.onSpace, this);
    GameView.updateFreeSpinsCount();
    Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.FREESPINSTART);
  }

  onContinueClick() {
    if (!this.continueButton.interactable || !this.isShowing) return;
    this.continueButton.interactable = false;
    Sounds.playSoundAsync(SFX.COMMON_BUTTON);
    GAME.freeSpinPopUP = true;
    PopUps.hide(PopUpType.FreeGame);
  }
}
