import PopUpBase from "../utils/PopUps/PopUpBase";
import {
  Button,
  COLORS,
  makeText,
  makeTitle,
  roundedPanel,
} from "../UI/Widgets";
import { GAME, PopUps, PopUpType, SFX, Sounds } from "../Data/GameConstants";

/** Port of Royal Tower InsufficientBalance popup. */
export default class InsufficientBalance extends PopUpBase {
  protected build(): void {
    const panel = roundedPanel(820, 460, undefined, COLORS.red);
    const title = makeTitle("INSUFFICIENT BALANCE", 60, COLORS.red);
    title.y = -150;
    const msg = makeText(
      "You don't have enough balance for this bet.\nLower your bet or top up your balance.",
      {
        fontSize: 32,
        lineHeight: 44,
      },
    );
    msg.y = -20;
    const ok = new Button("OK", { width: 260, height: 90 });
    ok.position.set(-150, 130);
    ok.onClick(() => this.onClickClose());
    const reload = new Button("RELOAD", {
      width: 260,
      height: 90,
      color: COLORS.panelLight,
      textColor: COLORS.white,
    });
    reload.position.set(150, 130);
    reload.onClick(() => this.onClickContinue());
    this.content.addChild(panel, title, msg, ok, reload);
  }

  protected onShow(): void {
    super.onShow();
    GAME.autoToggle = false;
    GAME.isSpaceHold = false;
  }

  onClickClose() {
    Sounds.playSoundAsync(SFX.COMMON_BUTTON);
    GAME.isUILocked = false;
    PopUps.hide(PopUpType.InsufficientBalance);
  }

  onClickContinue() {
    Sounds.playSoundAsync(SFX.COMMON_BUTTON);
    location.reload();
  }
}
