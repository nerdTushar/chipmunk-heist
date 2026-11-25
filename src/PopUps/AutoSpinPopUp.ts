import { Text } from "pixi.js";
import PopUpBase from "../utils/PopUps/PopUpBase";
import {
  Button,
  COLORS,
  makeText,
  makeTitle,
  roundedPanel,
  Slider,
  Toggle,
} from "../UI/Widgets";
import {
  anteBetAmount,
  BottomUI,
  GAME,
  PopUps,
  PopUpType,
  save,
  SFX,
  Sounds,
} from "../Data/GameConstants";

const MIN_SPINS = 10;
const MAX_SPINS = 1000;
const PRESETS = [10, 30, 50, 80, 1000];

/** Port of Royal Tower AutoSpinPopUp: spin count slider (10–1000) plus quick / turbo toggles. */
export default class AutoSpinPopUp extends PopUpBase {
  private slider: Slider;
  private countLabel: Text;
  private startButton: Button;
  private quickSpinToggle: Toggle;
  private turboSpinToggle: Toggle;

  protected build(): void {
    const panel = roundedPanel(900, 720);
    const title = makeTitle("AUTOPLAY", 72);
    title.y = -290;
    const close = new Button("✕", {
      circle: true,
      width: 70,
      color: COLORS.panelLight,
      textColor: COLORS.white,
      fontSize: 30,
    });
    close.position.set(400, -310);
    close.onClick(() => this.closePopUp());

    const spinsTitle = makeText("NUMBER OF SPINS", {
      fontSize: 30,
      fill: COLORS.gold,
    });
    spinsTitle.y = -190;
    this.countLabel = makeTitle(`${MIN_SPINS}`, 70, COLORS.white);
    this.countLabel.y = -120;
    this.slider = new Slider(680);
    this.slider.y = -40;
    this.slider.onChange(() => this.onAutoSpinSliderValueChange());

    PRESETS.forEach((n, i) => {
      const b = new Button(n >= 1000 ? "1000" : `${n}`, {
        width: 130,
        height: 64,
        fontSize: 28,
        color: COLORS.panelLight,
        textColor: COLORS.white,
      });
      b.position.set(-280 + i * 140, 40);
      b.onClick(() => {
        Sounds.playSoundAsync(SFX.COMMON_BUTTON);
        this.slider.progress = (n - MIN_SPINS) / (MAX_SPINS - MIN_SPINS);
        this.onAutoSpinSliderValueChange();
      });
      this.content.addChild(b);
    });

    const quickLabel = makeText("QUICK SPIN", { fontSize: 28 });
    quickLabel.anchor.set(0, 0.5);
    quickLabel.position.set(-340, 130);
    this.quickSpinToggle = new Toggle(false);
    this.quickSpinToggle.position.set(-60, 130);
    this.quickSpinToggle.onChange((v) => this.onQuickSpinCheck(v));
    const turboLabel = makeText("TURBO SPIN", { fontSize: 28 });
    turboLabel.anchor.set(0, 0.5);
    turboLabel.position.set(40, 130);
    this.turboSpinToggle = new Toggle(false);
    this.turboSpinToggle.position.set(310, 130);
    this.turboSpinToggle.onChange((v) => this.onTurboCheck(v));

    this.startButton = new Button("START AUTOPLAY", {
      width: 440,
      height: 96,
      fontSize: 36,
      color: COLORS.green,
      textColor: COLORS.white,
    });
    this.startButton.y = 260;
    this.startButton.onClick(() => this.startAutoSpin());

    this.content.addChild(
      panel,
      title,
      close,
      spinsTitle,
      this.countLabel,
      this.slider,
      quickLabel,
      this.quickSpinToggle,
      turboLabel,
      this.turboSpinToggle,
      this.startButton,
    );
    this.content.setChildIndex(panel, 0);
    this.slider.progress = 0;
    this.onAutoSpinSliderValueChange();
  }

  protected onShow(): void {
    super.onShow();
    GAME.isUILocked = false;
    this.turboSpinToggle.setChecked(GAME.turboToggle);
    this.quickSpinToggle.setChecked(GAME.quickToggle);
  }

  getCurrentAutoSpinSliderProgress() {
    return Math.floor(
      MIN_SPINS + this.slider.progress * (MAX_SPINS - MIN_SPINS),
    );
  }

  onAutoSpinSliderValueChange() {
    const count = this.getCurrentAutoSpinSliderProgress();
    this.countLabel.text = `${count}`;
    this.startButton.setText(`START AUTOPLAY (${count})`);
  }

  onTurboCheck(checked: boolean) {
    Sounds.playSoundAsync(SFX.COMMON_BUTTON);
    if (checked) this.quickSpinToggle.setChecked(false);
  }

  onQuickSpinCheck(checked: boolean) {
    Sounds.playSoundAsync(SFX.COMMON_BUTTON);
    if (checked) this.turboSpinToggle.setChecked(false);
  }

  startAutoSpin() {
    const bet = GAME.BonusBoostFeatureBought
      ? GAME.bet * anteBetAmount
      : GAME.bet;
    if (GAME.Player.Balance < bet) {
      PopUps.hide(PopUpType.AutoSpinPopUp);
      PopUps.show(PopUpType.InsufficientBalance);
      return;
    }
    Sounds.playSoundAsync(SFX.COMMON_BUTTON);
    GAME.turboToggle = this.turboSpinToggle.isChecked;
    GAME.quickToggle = this.quickSpinToggle.isChecked;
    GAME.autoSpinCount = this.getCurrentAutoSpinSliderProgress();
    GAME.totalAutoSpins = GAME.autoSpinCount;
    save("turbo", GAME.turboToggle);
    save("quick", GAME.quickToggle);
    BottomUI.toggleTurboUI();
    PopUps.hide(PopUpType.AutoSpinPopUp, () => {
      GAME.autoToggle = true; // the Idle2Spin watch starts the first spin
    });
  }

  closePopUp() {
    Sounds.playSoundAsync(SFX.COMMON_BUTTON);
    GAME.isUILocked = false;
    PopUps.hide(PopUpType.AutoSpinPopUp);
  }
}
