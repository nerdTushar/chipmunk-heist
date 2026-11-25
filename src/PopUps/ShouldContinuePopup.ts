import PopUpBase from "../utils/PopUps/PopUpBase";
import {
  Button,
  COLORS,
  makeText,
  makeTitle,
  roundedPanel,
} from "../UI/Widgets";
import {
  GAME,
  PopUps,
  PopUpType,
  Screens,
  ScreenEnum,
  SFX,
  Sounds,
} from "../Data/GameConstants";

/** Port of Royal Tower ShouldContinuePopup: resume an unfinished round after a refresh. */
export default class ShouldContinuePopup extends PopUpBase {
  protected build(): void {
    const panel = roundedPanel(860, 480);
    const title = makeTitle("UNFINISHED ROUND", 64);
    title.y = -160;
    const msg = makeText(
      "You have an unfinished round.\nDo you want to see how it ended?",
      { fontSize: 34, lineHeight: 46 },
    );
    msg.y = -30;
    const yes = new Button("CONTINUE", { width: 300, height: 90 });
    yes.position.set(-170, 140);
    yes.onClick(() => this.onContinueClick());
    const no = new Button("SKIP", {
      width: 300,
      height: 90,
      color: COLORS.panelLight,
      textColor: COLORS.white,
    });
    no.position.set(170, 140);
    no.onClick(() => this.onCancelClick());
    this.content.addChild(panel, title, msg, yes, no);
  }

  onContinueClick() {
    Sounds.playSoundAsync(SFX.COMMON_BUTTON);
    PopUps.hide(PopUpType.ShouldContinuePopup, () =>
      Screens.showScreen(ScreenEnum.GameScreen),
    );
  }

  onCancelClick() {
    Sounds.playSoundAsync(SFX.COMMON_BUTTON);
    PopUps.hide(PopUpType.ShouldContinuePopup, () => {
      GAME.stakeResponse = null;
      GAME.hasPreRefreshData = false;
      GAME.Player.Balance = GAME.pendingBalance;
      Screens.showScreen(ScreenEnum.GameScreen);
    });
  }
}
