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
import {
  anteBetAmount,
  GAME,
  PopUps,
  PopUpType,
  SFX,
  Sounds,
} from "../Data/GameConstants";

/** Port of Royal Tower AnteBetConfirmationPopup; `data` is the callback run on YES. */
export default class AnteBetConfirmationPopup extends PopUpBase {
  private subHeadingLabel: Text;
  private costLabel: Text;
  private isClicked = false;
  private callback: () => void = null;

  protected build(): void {
    const panel = roundedPanel(820, 500);
    const title = makeTitle("ANTE BET", 72);
    title.y = -170;
    this.subHeadingLabel = makeText("", { fontSize: 36, lineHeight: 46 });
    this.subHeadingLabel.y = -50;
    this.costLabel = makeText("", { fontSize: 30, fill: COLORS.gold });
    this.costLabel.y = 40;
    const yes = new Button("YES", {
      width: 260,
      height: 90,
      color: COLORS.green,
      textColor: COLORS.white,
    });
    yes.position.set(-150, 150);
    yes.onClick(() => this.onYes());
    const no = new Button("NO", {
      width: 260,
      height: 90,
      color: COLORS.red,
      textColor: COLORS.white,
    });
    no.position.set(150, 150);
    no.onClick(() => this.onclose());
    this.content.addChild(
      panel,
      title,
      this.subHeadingLabel,
      this.costLabel,
      yes,
      no,
    );
  }

  protected onShow(): void {
    super.onShow();
    this.callback = typeof this.data === "function" ? this.data : null;
    this.isClicked = false;
    GAME.isUILocked = false;
    this.subHeadingLabel.text = GAME.Jurisdiction?.socialCasino
      ? "YOU WANT TO ENABLE\nANTE PLAY ?"
      : "YOU WANT TO ENABLE\nANTE BET ?";
    this.costLabel.text = `Each spin costs ${money(GAME.bet * anteBetAmount)}`;
  }

  onclose() {
    if (this.isClicked) return;
    this.isClicked = true;
    Sounds.playSoundAsync(SFX.BUY_CANCEL);
    PopUps.hide(PopUpType.AnteBetConfirmationPopup);
  }

  onYes() {
    if (this.isClicked) return;
    this.isClicked = true;
    Sounds.playSoundAsync(SFX.BUY_CONFIRM);
    PopUps.hide(PopUpType.AnteBetConfirmationPopup, () => this.callback?.());
  }

  protected onHide(): void {
    super.onHide();
    GAME.isUILocked = false;
  }
}
