import { Text } from "pixi.js";
import PopUpBase from "../utils/PopUps/PopUpBase";
import {
  Button,
  COLORS,
  makeText,
  makeTitle,
  roundedPanel,
} from "../UI/Widgets";
import { SFX, Sounds } from "../Data/GameConstants";

const ERROR_MESSAGES: Record<string, string> = {
  ERR_IPB: "Insufficient balance.",
  ERR_IS: "Your session has expired. Please reload the game.",
  ERR_ATE: "Authentication failed. Please reload the game.",
  ERR_GLE: "Gambling limits exceeded.",
  ERR_LOC: "The game is not available in your location.",
  ERR_VAL: "Invalid request.",
  ERR_UE: "Unexpected error.",
};

/** Port of Royal Tower NetworkErrorPopUp: shows the RGS error and reloads on continue. */
export default class NetworkErrorPopUp extends PopUpBase {
  private messLabel: Text;

  protected build(): void {
    const panel = roundedPanel(820, 460, undefined, COLORS.red);
    const title = makeTitle("CONNECTION ERROR", 64, COLORS.red);
    title.y = -150;
    this.messLabel = makeText("", {
      fontSize: 34,
      wordWrap: true,
      wordWrapWidth: 700,
    });
    this.messLabel.y = -20;
    const button = new Button("RELOAD", { width: 300, height: 90 });
    button.y = 130;
    button.onClick(() => this.onClickContinue());
    this.content.addChild(panel, title, this.messLabel, button);
  }

  protected onShow(): void {
    super.onShow();
    const code = typeof this.data === "string" ? this.data : null;
    this.messLabel.text =
      (code && (ERROR_MESSAGES[code] ?? code)) ||
      "Something went wrong. Please check your connection and try again.";
  }

  onClickContinue() {
    Sounds.playSoundAsync(SFX.COMMON_BUTTON);
    location.reload();
  }
}
