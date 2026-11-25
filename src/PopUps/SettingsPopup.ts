import { Container, Text } from "pixi.js";
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
import { money } from "../UI/Format";
import {
  BottomUI,
  GAME,
  PopUps,
  PopUpType,
  save,
  SFX,
  Sounds,
} from "../Data/GameConstants";

/** Port of Royal Tower SettingsPopup: quick / turbo spin, music & sfx toggles + volume, total bet. */
export default class SettingsPopup extends PopUpBase {
  private quickSpinToggle: Toggle;
  private turboToggle: Toggle;
  private musicToggle: Toggle;
  private sfxToggle: Toggle;
  private musicSlider: Slider;
  private sfxSlider: Slider;
  private totalBetLabel: Text;
  private increaseButton: Button;
  private decreaseButton: Button;
  currentLineBetIndex = 0;

  private body = new Container();

  protected build(): void {
    this.content.addChild(this.body);
    const panel = roundedPanel(900, 860);
    const title = makeTitle("SETTINGS", 72);
    title.y = -360;
    const close = new Button("✕", {
      circle: true,
      width: 70,
      color: COLORS.panelLight,
      textColor: COLORS.white,
      fontSize: 30,
    });
    close.position.set(400, -380);
    close.onClick(() => this.closeClick());
    this.body.addChild(panel, title, close);

    const row = (label: string, y: number) => {
      const t = makeText(label, { fontSize: 32 });
      t.anchor.set(0, 0.5);
      t.position.set(-360, y);
      this.body.addChild(t);
    };

    row("QUICK SPIN", -250);
    this.quickSpinToggle = new Toggle();
    this.quickSpinToggle.position.set(320, -250);
    this.quickSpinToggle.onChange(() => this.toggleQuickSpin());

    row("TURBO SPIN", -160);
    this.turboToggle = new Toggle();
    this.turboToggle.position.set(320, -160);
    this.turboToggle.onChange(() => this.toggleTurbo());

    row("MUSIC", -70);
    this.musicToggle = new Toggle();
    this.musicToggle.position.set(320, -70);
    this.musicToggle.onChange(() => this.toggleAmbientMusic());
    this.musicSlider = new Slider(560);
    this.musicSlider.position.set(-40, -10);
    this.musicSlider.onChange((p) => Sounds.SetMusicVolume(p));

    row("SOUND FX", 70);
    this.sfxToggle = new Toggle();
    this.sfxToggle.position.set(320, 70);
    this.sfxToggle.onChange(() => this.toggleSoundFx());
    this.sfxSlider = new Slider(560);
    this.sfxSlider.position.set(-40, 130);
    this.sfxSlider.onChange((p) => Sounds.SetSFXVolume(p));

    const betTitle = makeText("TOTAL BET", { fontSize: 30, fill: COLORS.gold });
    betTitle.y = 220;
    this.totalBetLabel = makeTitle(money(0), 56, COLORS.white);
    this.totalBetLabel.y = 290;
    this.decreaseButton = new Button("−", {
      circle: true,
      width: 84,
      fontSize: 52,
    });
    this.decreaseButton.position.set(-250, 290);
    this.decreaseButton.onClick(() => this.decreaseTotalBet());
    this.increaseButton = new Button("+", {
      circle: true,
      width: 84,
      fontSize: 48,
    });
    this.increaseButton.position.set(250, 290);
    this.increaseButton.onClick(() => this.increaseTotalBet());

    this.body.addChild(
      this.quickSpinToggle,
      this.turboToggle,
      this.musicToggle,
      this.musicSlider,
      this.sfxToggle,
      this.sfxSlider,
      betTitle,
      this.totalBetLabel,
      this.decreaseButton,
      this.increaseButton,
    );
  }

  layout(isPortrait: boolean): void {
    super.layout(isPortrait);
    this.body.scale.set(isPortrait ? 1 : 0.95);
  }

  protected onShow(): void {
    super.onShow();
    GAME.isUILocked = false;
    this.quickSpinToggle.setChecked(GAME.quickToggle);
    this.turboToggle.setChecked(GAME.turboToggle);
    this.musicToggle.setChecked(!Sounds.muteMusic);
    this.sfxToggle.setChecked(!Sounds.muteSound);
    this.musicSlider.progress = Sounds.GetMusicVolume();
    this.sfxSlider.progress = Sounds.GetSFXVolume();
    const betLocked = GAME.freeSpinsEnabled || GAME.autoToggle || GAME.isReplay;
    this.increaseButton.visible = this.decreaseButton.visible = !betLocked;
    if (GAME.Jurisdiction?.disabledTurbo) this.turboToggle.visible = false;
    this.initialSetup();
  }

  initialSetup() {
    this.currentLineBetIndex = GAME.currentCredit;
    this.setLabels();
    this.handleIncreaseAndDecreaseButtonNodes();
  }

  setLabels() {
    this.totalBetLabel.text = money(GAME.bet);
  }

  toggleQuickSpin() {
    Sounds.playSoundAsync(SFX.COMMON_BUTTON);
    GAME.quickToggle = this.quickSpinToggle.isChecked;
    if (GAME.quickToggle && GAME.turboToggle) {
      GAME.turboToggle = false;
      this.turboToggle.setChecked(false);
    }
    this.persistSpeed();
  }

  toggleTurbo() {
    Sounds.playSoundAsync(SFX.COMMON_BUTTON);
    GAME.turboToggle = this.turboToggle.isChecked;
    if (GAME.turboToggle && GAME.quickToggle) {
      GAME.quickToggle = false;
      this.quickSpinToggle.setChecked(false);
    }
    this.persistSpeed();
  }

  private persistSpeed() {
    save("quick", GAME.quickToggle);
    save("turbo", GAME.turboToggle);
    BottomUI.toggleTurboUI();
  }

  toggleAmbientMusic() {
    Sounds.playSoundAsync(SFX.COMMON_BUTTON);
    Sounds.toggleMuteMusic();
  }

  toggleSoundFx() {
    Sounds.toggleMuteSound();
    Sounds.playSoundAsync(SFX.COMMON_BUTTON);
  }

  handleIncreaseAndDecreaseButtonNodes() {
    const last = GAME.GameInfo.LineBet.length - 1;
    this.increaseButton.interactable = this.currentLineBetIndex < last;
    this.decreaseButton.interactable = this.currentLineBetIndex > 0;
  }

  increaseTotalBet() {
    BottomUI.changeBet(true);
    this.initialSetup();
  }

  decreaseTotalBet() {
    BottomUI.changeBet(false);
    this.initialSetup();
  }

  closeClick() {
    Sounds.playSoundAsync(SFX.COMMON_BUTTON);
    PopUps.hide(PopUpType.Settings);
  }

  protected onHide(): void {
    super.onHide();
    GAME.isUILocked = false;
  }
}
