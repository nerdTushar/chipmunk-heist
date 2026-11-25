import { Container, Graphics, Sprite, Text } from "pixi.js";
import { Button, COLORS, makeText, makeTitle, ValueAnimator } from "./Widgets";
import { money } from "./Format";
import { tex } from "./Textures";
import { anteBetAmount, save, MESSAGES } from "../Data/GameConfig";
import { Instance as GAME } from "../Data/GameState";
import { Instance as Events } from "../SlotFSM/StateMachine/EventEmitter";
import { GameEvents } from "../SlotFSM/StateMachine/GameEvents";
import { Instance as QUEUE } from "../utils/Queue";
import { Instance as Sounds, SFX } from "../utils/SoundManager";
import { Instance as PopUps, PopUpType } from "../utils/PopUps/PopUpManager";
import { GameView } from "../Data/GameConstants";

let instance: BottomUI = null;

/**
 * Port of Royal Tower's BottomUI: balance / bet / win labels, spin-stop, auto, turbo, bet change,
 * menu (info + settings), free-spin counter and the space-bar controls.
 */
export default class BottomUI extends Container {
  private bar = new Graphics();
  private balanceTitle: Text;
  private balanceLabel: Text;
  private betTitle: Text;
  private betLabel: Text;
  private winTitle: Text;
  private winLabel: Text;
  private winAnimator: ValueAnimator;
  private balanceAnimator: ValueAnimator;
  private messageLabel: Text;

  private spinButton: Button;
  private stopButton: Button;
  private autoButton: Button;
  private autoCountLabel: Text;
  private turboButton: Button;
  private betDecreaseButton: Button;
  private betIncreaseButton: Button;
  private menuButton: Button;
  private menuCloseButton: Button;
  private menuPanel = new Container();
  private infoButton: Button;
  private settingsButton: Button;
  private freeSpinUI = new Container();
  private freeSpinCount: Text;

  spinActive = true;
  stopActive = false;
  private initialised = false;

  constructor() {
    super();
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- module-level singleton
    instance = this;
    this.build();
  }

  private build() {
    this.balanceTitle = makeText("BALANCE", {
      fontSize: 24,
      fill: COLORS.gold,
    });
    this.balanceLabel = makeText(money(0), { fontSize: 34 });
    this.betTitle = makeText("BET", { fontSize: 24, fill: COLORS.gold });
    this.betLabel = makeText(money(0), { fontSize: 34 });
    this.winTitle = makeText("WIN", { fontSize: 24, fill: COLORS.gold });
    this.winLabel = makeTitle(money(0), 44, COLORS.white);
    this.messageLabel = makeText(MESSAGES.HOLD_SPACE, {
      fontSize: 22,
      fill: COLORS.grey,
    });
    this.winAnimator = new ValueAnimator(this.winLabel, (v) => money(v));
    this.balanceAnimator = new ValueAnimator(this.balanceLabel, (v) =>
      money(v),
    );

    this.spinButton = new Button("SPIN", {
      circle: true,
      width: 170,
      color: COLORS.green,
      textColor: COLORS.white,
      fontSize: 40,
    });
    this.stopButton = new Button("STOP", {
      circle: true,
      width: 170,
      color: COLORS.red,
      textColor: COLORS.white,
      fontSize: 40,
    });
    this.stopButton.visible = false;
    this.spinButton.onClick(() => this.onClickSpin());
    this.stopButton.onClick(() => this.onClickStop());

    this.autoButton = new Button("AUTO", {
      circle: true,
      width: 100,
      color: COLORS.panelLight,
      textColor: COLORS.white,
      fontSize: 24,
    });
    this.autoButton.onClick(() => this.onClickAutoPlayBtn());
    this.autoCountLabel = makeText("", { fontSize: 22, fill: COLORS.gold });
    this.autoCountLabel.y = 34;
    this.autoButton.addChild(this.autoCountLabel);

    this.turboButton = new Button("TURBO", {
      circle: true,
      width: 100,
      color: COLORS.panelLight,
      textColor: COLORS.white,
      fontSize: 20,
    });
    this.turboButton.onClick(() => this.onTurboBtn());

    this.betDecreaseButton = new Button("−", {
      circle: true,
      width: 64,
      color: COLORS.panelLight,
      textColor: COLORS.white,
      fontSize: 44,
    });
    this.betIncreaseButton = new Button("+", {
      circle: true,
      width: 64,
      color: COLORS.panelLight,
      textColor: COLORS.white,
      fontSize: 40,
    });
    this.betDecreaseButton.onClick(() => this.onBetDecrease());
    this.betIncreaseButton.onClick(() => this.onBetIncrease());

    this.menuButton = new Button("☰", {
      circle: true,
      width: 84,
      color: COLORS.panelLight,
      textColor: COLORS.white,
      fontSize: 36,
    });
    this.menuCloseButton = new Button("✕", {
      circle: true,
      width: 84,
      color: COLORS.panelLight,
      textColor: COLORS.white,
      fontSize: 32,
    });
    this.menuCloseButton.visible = false;
    this.menuButton.onClick(() => this.onClickMenu());
    this.menuCloseButton.onClick(() => this.onCloseMenu());
    this.infoButton = new Button("i", {
      circle: true,
      width: 84,
      color: COLORS.panel,
      textColor: COLORS.gold,
      fontSize: 40,
    });
    this.settingsButton = new Button("⚙", {
      circle: true,
      width: 84,
      color: COLORS.panel,
      textColor: COLORS.gold,
      fontSize: 40,
    });
    this.infoButton.onClick(() => {
      this.onCloseMenu();
      this.onOpenPayTable();
    });
    this.settingsButton.onClick(() => {
      this.onCloseMenu();
      this.openSettingsPopup();
    });
    this.infoButton.y = -110;
    this.settingsButton.y = -210;
    this.menuPanel.addChild(this.infoButton, this.settingsButton);
    this.menuPanel.visible = false;

    const fsFrame = new Sprite(tex("spins_frame.png"));
    fsFrame.anchor.set(0.5);
    const fsTitle = makeText("FREE SPINS", { fontSize: 24, fill: COLORS.gold });
    fsTitle.y = -26;
    this.freeSpinCount = makeTitle("0", 52, COLORS.white);
    this.freeSpinCount.y = 14;
    this.freeSpinUI.addChild(fsFrame, fsTitle, this.freeSpinCount);
    this.freeSpinUI.visible = false;

    this.addChild(
      this.bar,
      this.balanceTitle,
      this.balanceLabel,
      this.betTitle,
      this.betLabel,
      this.winTitle,
      this.winLabel,
      this.messageLabel,
      this.betDecreaseButton,
      this.betIncreaseButton,
      this.turboButton,
      this.autoButton,
      this.spinButton,
      this.stopButton,
      this.menuPanel,
      this.menuButton,
      this.menuCloseButton,
      this.freeSpinUI,
    );
  }

  /** Positions everything for the given design size; the container sits at (0, 0) of the screen. */
  layout(isPortrait: boolean, width: number, height: number) {
    this.bar.clear();
    if (!isPortrait) {
      const y = height - 75;
      this.bar
        .rect(-400, height - 150, width + 800, 400)
        .fill({ color: 0x0b0a14, alpha: 0.82 });
      this.bar
        .rect(-400, height - 150, width + 800, 3)
        .fill({ color: COLORS.gold, alpha: 0.6 });
      this.menuButton.position.set(80, y);
      this.menuCloseButton.position.set(80, y);
      this.menuPanel.position.set(80, y);
      this.balanceTitle.position.set(300, y - 24);
      this.balanceLabel.position.set(300, y + 16);
      this.betTitle.position.set(620, y - 24);
      this.betLabel.position.set(620, y + 16);
      this.betDecreaseButton.position.set(490, y);
      this.betIncreaseButton.position.set(750, y);
      this.winTitle.position.set(width / 2 + 40, y - 28);
      this.winLabel.position.set(width / 2 + 40, y + 14);
      this.messageLabel.position.set(width / 2 + 40, height - 165 - 20);
      this.turboButton.position.set(width - 420, y);
      this.autoButton.position.set(width - 300, y);
      this.spinButton.position.set(width - 140, y - 30);
      this.stopButton.position.set(width - 140, y - 30);
      this.freeSpinUI.position.set(width - 140, height - 290);
    } else {
      this.bar
        .rect(-400, height - 420, width + 800, 800)
        .fill({ color: 0x0b0a14, alpha: 0.82 });
      this.bar
        .rect(-400, height - 420, width + 800, 3)
        .fill({ color: COLORS.gold, alpha: 0.6 });
      const top = height - 360;
      this.winTitle.position.set(width / 2, top - 20);
      this.winLabel.position.set(width / 2, top + 24);
      this.messageLabel.position.set(width / 2, height - 440 - 26);
      this.spinButton.position.set(width / 2, height - 180);
      this.stopButton.position.set(width / 2, height - 180);
      this.turboButton.position.set(width / 2 - 200, height - 180);
      this.autoButton.position.set(width / 2 + 200, height - 180);
      this.menuButton.position.set(80, height - 180);
      this.menuCloseButton.position.set(80, height - 180);
      this.menuPanel.position.set(80, height - 180);
      this.balanceTitle.position.set(width * 0.25, height - 60);
      this.balanceLabel.position.set(width * 0.25, height - 26);
      this.betTitle.position.set(width * 0.75, height - 60);
      this.betLabel.position.set(width * 0.75, height - 26);
      this.betDecreaseButton.position.set(width * 0.75 - 150, height - 40);
      this.betIncreaseButton.position.set(width * 0.75 + 150, height - 40);
      this.freeSpinUI.position.set(width / 2, height - 520);
    }
  }

  // ---------------------------------------------------------------------------------------------

  Init() {
    if (!this.initialised) {
      GAME.addObserver(this.onPropertyChanged.bind(this));
      if (!GAME.Jurisdiction?.disabledSpacebar) {
        window.addEventListener("keydown", this.onKeyDownEvent);
        window.addEventListener("keyup", this.onKeyUpEvent);
      }
      Events.on(GameEvents.AutopopupActive, () => {}, this);
      this.initialised = true;
    }
    this.setTotalWin(GAME.Current?.TotalWin ?? 0);
    this.setBalance(GAME.Player.Balance);
    this.initializeBetButtons();
    this.setBet();
    this.toggleTurboUI();
    this.disableBalanceOnReplay();
    this.juridisdictionCheck();
    this.disableMenuButtonsOnReplay();
  }

  setTotalWin(amount: number) {
    const animate = !(GAME.turboToggle || GAME.autoToggle);
    const from = this.currentWin;
    this.currentWin = amount ?? 0;
    if (animate && this.currentWin > from)
      this.winAnimator.animateTo(from, this.currentWin, 0.8);
    else this.winAnimator.set(this.currentWin);
  }
  private currentWin = 0;
  private currentBalance = 0;

  setBet() {
    const bet = GAME.BonusBoostFeatureBought
      ? GAME.bet * anteBetAmount
      : GAME.bet;
    this.betLabel.text = money(bet);
    this.betLabel.style.fill = GAME.BonusBoostFeatureBought
      ? 0xffe066
      : COLORS.white;
  }

  setBalance(amount: number) {
    const from = this.currentBalance;
    this.currentBalance = amount ?? 0;
    if (!GAME.turboToggle && from !== this.currentBalance && from !== 0)
      this.balanceAnimator.animateTo(from, this.currentBalance, 0.5);
    else this.balanceAnimator.set(this.currentBalance);
  }

  protected onPropertyChanged(change: { property: string; value: any }) {
    switch (change.property) {
      case "autoToggle":
        this.toggleAutoUI(GAME.autoToggle);
        break;
      case "turboToggle":
        this.toggleTurboUI();
        break;
      case "BonusBoostFeatureBought":
      case "bet":
        this.setBet();
        break;
    }
  }

  toggleAutoUI(flag: boolean) {
    if (GAME.isReplay) return;
    this.autoButton.setColor(flag ? COLORS.gold : COLORS.panelLight);
    this.autoCountLabel.visible = flag;
    if (!GAME.autoToggle) this.autoCountLabel.text = "";
  }

  enableReplayButton(_enable: boolean) {
    // Royal Tower forces the replay button off; kept for API parity.
  }

  toggleTurboUI() {
    this.turboButton.setColor(
      GAME.turboToggle ? COLORS.gold : COLORS.panelLight,
    );
  }

  changeBet(increase: boolean) {
    const levels = GAME.GameInfo.LineBet;
    if (!increase && GAME.currentCredit <= 0) return this.onBetChange();
    if (increase && GAME.currentCredit >= levels.length - 1)
      return this.onBetChange();
    if (increase && levels[GAME.currentCredit + 1] > GAME.Player.Balance)
      return;
    GAME.currentCredit += increase ? 1 : -1;
    GAME.bet = +levels[GAME.currentCredit].toFixed(3);
    Sounds.playSoundAsync(increase ? SFX.BET_UP : SFX.BET_DOWN);
    this.onBetChange();
  }

  maxBet() {
    GAME.currentCredit = GAME.GameInfo.LineBet.length - 1;
    GAME.bet = +GAME.GameInfo.LineBet[GAME.currentCredit].toFixed(3);
    this.onBetChange();
  }

  onBetIncrease() {
    if (GAME.isUILocked) return;
    GAME.isUILocked = true;
    PopUps.show(PopUpType.BetChoicePopUp);
  }

  onBetDecrease() {
    if (GAME.isUILocked) return;
    GAME.isUILocked = true;
    PopUps.show(PopUpType.BetChoicePopUp);
  }

  onClickAutoPlayBtn() {
    Sounds.playSoundAsync(SFX.AUTO_TOGGLE);
    if (!GAME.autoToggle) {
      if (GAME.isUILocked) return;
      GAME.isUILocked = true;
      PopUps.show(PopUpType.AutoSpinPopUp);
      return;
    }
    GAME.autoToggle = false;
    GAME.autoSpinCount = 0;
    GAME.infinitySpinsEnabled = false;
  }

  initializeBetButtons() {
    if (GAME.BonusBoostFeatureBought) return;
    const index = GAME.GameInfo.LineBet.indexOf(GAME.bet);
    GAME.currentCredit = index === -1 ? 0 : index;
    this.onBetChange();
  }

  openSettingsPopup() {
    if (GAME.isUILocked) return;
    GAME.isUILocked = true;
    PopUps.show(PopUpType.Settings);
  }

  onOpenPayTable() {
    if (GAME.isUILocked) return;
    GAME.isUILocked = true;
    PopUps.show(PopUpType.PaytablePopup);
  }

  // ---------------------------------------------------------------------------------------------
  // Keyboard (Cocos KEY_DOWN / KEY_PRESSING / KEY_UP)
  // ---------------------------------------------------------------------------------------------

  private onKeyDownEvent = (e: KeyboardEvent) => {
    if (e.code !== "Space") return;
    e.preventDefault();
    if (e.repeat) this.onKeyPressing();
    else this.onKeyDown();
  };

  private onKeyUpEvent = (e: KeyboardEvent) => {
    if (e.code !== "Space") return;
    e.preventDefault();
    this.onKeyUp();
  };

  private insufficientForSpace() {
    return (
      !GAME.freeSpinsEnabled &&
      GAME.Player.Balance < GAME.bet &&
      !GAME.featureBought &&
      this.spinActive
    );
  }

  onKeyDown() {
    if (!this.isWorldVisible()) return;
    if (GAME.isPersistentPopupsOpen) return;
    if (this.insufficientForSpace()) {
      PopUps.show(PopUpType.InsufficientBalance);
      return;
    }
    if (this.spinActive) {
      if (PopUps.currentOverLayedPopUps.length > 0) return;
      GameView.onSpinBtn();
    } else if (this.stopActive) {
      this.onStopBtnSpace();
      Events.emit("SpaceButtonPressed");
    }
  }

  onStopBtnSpace() {
    Sounds.playSoundAsync(SFX.COMMON_BUTTON);
    Events.emit(GameEvents.ON_SPIN_STOP, true);
    QUEUE.SkipTask();
  }

  onKeyPressing() {
    if (!this.isWorldVisible()) return;
    if (this.insufficientForSpace()) {
      PopUps.show(PopUpType.InsufficientBalance);
      return;
    }
    GAME.isSpaceHold = true;
    if (!GAME.turboToggle) {
      GAME.turboToggle = true;
      GAME.turboByHold = true;
      save("turbo", GAME.turboToggle);
    }
  }

  onBetChange() {
    const levels = GAME.GameInfo.LineBet;
    this.betDecreaseButton.interactable = GAME.currentCredit > 0;
    this.betIncreaseButton.interactable =
      GAME.currentCredit < levels.length - 1;
  }

  onKeyUp() {
    GAME.isSpaceHold = false;
    if (GAME.turboByHold) {
      GAME.turboToggle = false;
      save("turbo", GAME.turboToggle);
      GAME.turboByHold = false;
    }
  }

  onClickSpin() {
    Sounds.playSoundAsync(SFX.SPIN_BUTTON);
    GameView.onSpinBtn();
  }

  onClickStop() {
    Sounds.playSoundAsync(SFX.COMMON_BUTTON);
    GameView.onStopBtn();
  }

  toggleSpinUI(flag: boolean) {
    if (GAME.autoToggle) flag = false;
    this.spinActive = flag;
    this.stopActive = !flag;
    this.spinButton.visible = flag;
    this.stopButton.visible = !flag;
    this.stopButton.interactable = !flag;
  }

  updateAutoSpinCount() {
    this.autoCountLabel.text = GAME.infinitySpinsEnabled
      ? "∞"
      : `${Math.max(GAME.autoSpinCount, 0)}`;
  }

  checkForAutoSpins() {
    if (GAME.autoSpinCount <= 0 && !GAME.infinitySpinsEnabled)
      GAME.autoToggle = false;
    else this.updateAutoSpinCount();
  }

  resetLabels() {
    this.currentWin = 0;
    this.winAnimator.set(0);
  }

  updateFreeSpinsCount(freespin: number) {
    this.freeSpinCount.text = `${Math.max(freespin, 0)}`;
  }

  onTurboBtn() {
    Sounds.playSoundAsync(SFX.COMMON_BUTTON);
    GAME.turboToggle = !GAME.turboToggle;
    save("turbo", GAME.turboToggle);
    if (GAME.turboToggle && GAME.quickToggle) {
      GAME.quickToggle = false;
      save("quick", GAME.quickToggle);
    }
  }

  toggleCreditBtnUI(flag: boolean) {
    if (GAME.autoToggle || GAME.isReplay) flag = false;
    this.betIncreaseButton.interactable = flag;
    this.betDecreaseButton.interactable = flag;
    if (flag) this.initializeBetButtons();
  }

  onClickMenu() {
    Sounds.playSoundAsync(SFX.COMMON_BUTTON);
    this.menuPanel.visible = true;
    this.menuButton.visible = false;
    this.menuCloseButton.visible = true;
  }

  onCloseMenu() {
    this.menuPanel.visible = false;
    this.menuButton.visible = true;
    this.menuCloseButton.visible = false;
  }

  toggleMenuButtons(flag: boolean) {
    if (GAME.isReplay || GAME.autoToggle || GAME.freeSpinsEnabled) flag = false;
    this.menuButton.interactable = flag;
    this.infoButton.interactable = flag;
    this.settingsButton.interactable = flag;
    if (!flag) this.onCloseMenu();
  }

  autoUiFunctionality(flag: boolean) {
    if (GAME.isReplay) flag = false;
    if (GAME.freeSpinsEnabled) {
      this.toggleAutoUI(false);
      this.autoButton.interactable = false;
      return;
    }
    if (GAME.autoToggle) flag = true;
    this.toggleAutoUI(GAME.autoToggle);
    this.autoButton.interactable = flag;
  }

  toggleBaseAndFreeSpinUI(flag: boolean) {
    this.freeSpinUI.visible = flag;
  }

  openBetChoicePopUp() {
    if (GAME.isUILocked) return;
    GAME.isUILocked = true;
    PopUps.show(PopUpType.BetChoicePopUp);
  }

  disableBalanceOnReplay() {
    if (!GAME.isReplay) return;
    this.balanceTitle.visible = false;
    this.balanceLabel.visible = false;
  }

  juridisdictionCheck() {
    this.autoButton.visible = !GAME.Jurisdiction?.disabledAutoplay;
    this.turboButton.visible = !GAME.Jurisdiction?.disabledTurbo;
  }

  disableMenuButtonsOnReplay() {
    if (GAME.isReplay) this.toggleMenuButtons(false);
  }

  forceVolumeToZero() {
    Sounds.SetSFXVolume(0);
    Sounds.SetMusicVolume(0);
  }

  forceVolumeToFull() {
    Sounds.SetSFXVolume(1);
    Sounds.SetMusicVolume(1);
  }

  private isWorldVisible(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let node: Container = this;
    while (node) {
      if (!node.visible) return false;
      node = node.parent;
    }
    return true;
  }

  setMessage(text: string) {
    this.messageLabel.text = text;
  }
}

export { instance };
