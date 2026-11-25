import { Container, Graphics, Sprite, Text, Ticker } from "pixi.js";
import AbstractScreen from "../utils/Screens/AbstractScreen";
import StateMachine from "../SlotFSM/StateMachine/StateMachine";
import SMState from "../SlotFSM/StateMachine/SMState";
import { createSlotMachine } from "../SlotFSM/SlotMachine";
import { FreespinResponseSplitter } from "../utils/FreespinResponseSplitter";
import BottomUIView from "../UI/BottomUI";
import { GameApp } from "../core/GameApp";
import { tex, hasTex } from "../UI/Textures";
import { Button, COLORS, makeText } from "../UI/Widgets";
import { money } from "../UI/Format";
import {
  Events,
  GameEvents,
  PopUpType,
  PopUps,
  SFX,
  Sounds,
  GAME,
  WinAnims,
  QUEUE,
  REELM,
  get,
  save,
  BottomUI,
  anteBetAmount,
  buyFreeSpinAmount,
} from "../Data/GameConstants";

let Instance: GameScreen = null;

/** Buy-feature button (Royal Tower FeatureBuyNode). */
class FeatureBuyNode extends Container {
  readonly button: Button;
  private amount: Text;

  constructor(onClick: () => void) {
    super();
    const art = hasTex("plate-buy.png") ? tex("plate-buy.png") : undefined;
    this.button = new Button("", {
      width: 230,
      height: 150,
      color: COLORS.goldDark,
      texture: art,
    });
    this.button.onClick(onClick);
    const title = makeText("BUY\nFREE SPINS", {
      fontSize: 26,
      fill: COLORS.white,
      lineHeight: 30,
    });
    title.y = -18;
    this.amount = makeText("", { fontSize: 26, fill: COLORS.gold });
    this.amount.y = 42;
    this.button.addChild(title, this.amount);
    this.addChild(this.button);
  }

  updateAmount() {
    this.amount.text = money(GAME.bet * buyFreeSpinAmount);
  }

  toggleFeatureBuyFreeSpin(flag: boolean) {
    if (
      GAME.freeSpinsEnabled ||
      GAME.autoToggle ||
      GAME.isReplay ||
      GAME.BonusBoostFeatureBought ||
      GAME.bet * buyFreeSpinAmount > GAME.Player.Balance
    ) {
      flag = false;
    }
    this.button.interactable = flag;
  }
}

/** Ante bet switch (Royal Tower AnteBetNode). */
class AnteBetNode extends Container {
  readonly button: Button;
  private state: Text;
  private amount: Text;
  private knob = new Graphics();

  constructor() {
    super();
    this.button = new Button("", {
      width: 230,
      height: 130,
      color: COLORS.panelLight,
    });
    this.button.onClick(() => this.activeBonusBoost());
    const title = makeText("ANTE BET", { fontSize: 24, fill: COLORS.gold });
    title.y = -40;
    const track = new Graphics()
      .roundRect(-50, -16, 100, 32, 16)
      .fill(0x000000);
    this.knob.circle(0, 0, 14).fill(COLORS.green);
    const toggle = new Container();
    toggle.addChild(track, this.knob);
    toggle.y = -2;
    this.state = makeText("OFF", { fontSize: 18 });
    this.state.position.set(0, -2);
    this.amount = makeText("", { fontSize: 22, fill: COLORS.white });
    this.amount.y = 38;
    this.button.addChild(title, toggle, this.amount);
    this.addChild(this.button);
  }

  activeBonusBoost() {
    if (GAME.BonusBoostFeatureBought) {
      GAME.BonusBoostFeatureBought = false;
      this.updateUI();
      GameView().toggleBuyFreeSpin(true);
    } else {
      Sounds.playSoundAsync(SFX.BUY_BONUS_BUTTON);
      PopUps.show(PopUpType.AnteBetConfirmationPopup, () => {
        GAME.BonusBoostFeatureBought = true;
        this.updateUI();
        GameView().toggleBuyFreeSpin(false);
      });
    }
  }

  updateUI() {
    const on = GAME.BonusBoostFeatureBought;
    this.knob.x = on ? 34 : -34;
    this.knob.tint = on ? 0xffffff : 0x777777;
    this.amount.text = money(GAME.bet * anteBetAmount);
  }

  toggleFeatureAnteBet(flag: boolean) {
    if (
      GAME.freeSpinsEnabled ||
      GAME.autoToggle ||
      GAME.isReplay ||
      GAME.bet * anteBetAmount > GAME.Player.Balance
    ) {
      flag = false;
    }
    this.button.interactable = flag;
  }
}

const GameView = () => Instance;

/**
 * Port of Royal Tower GameScreen: owns the slot FSM, reels, bottom bar, buy / ante buttons and the
 * win presentation hooks the states call through `GameView`.
 */
export default class GameScreen extends AbstractScreen {
  sm: StateMachine;
  intialStates: SMState[] = [];

  private bgLayer = new Container();
  private bgs: Sprite[] = [];
  private buyFeatureNode: FeatureBuyNode;
  private anteBetNode: AnteBetNode;
  private bottomUI: BottomUIView;
  private smStarted = false;

  private totalTimeUiCanBeLocked = 2;
  private elapsedTimeUiIsLocked = 0;
  private tick = (ticker: Ticker) => this.update(ticker.deltaMS / 1000);

  constructor() {
    super();
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- module-level singleton, as in the reference
    Instance = this;
  }

  protected build(): void {
    const bgNames = ["bg-base", "bg-free"];
    this.bgs = bgNames.map((n) => {
      const s = new Sprite(tex(`${n}-landscape`));
      s.anchor.set(0.5);
      return s;
    });
    this.bgs[1].visible = false;
    this.bgLayer.addChild(...this.bgs);

    REELM.init();

    this.bottomUI = new BottomUIView();
    this.buyFeatureNode = new FeatureBuyNode(() =>
      this.toggleFeatureBuyPopUp(),
    );
    this.anteBetNode = new AnteBetNode();

    this.addChild(
      this.bgLayer,
      REELM,
      this.buyFeatureNode,
      this.anteBetNode,
      this.bottomUI,
    );

    const { machine, initialStates } = createSlotMachine();
    this.sm = machine;
    this.intialStates = initialStates;
  }

  layout(isPortrait: boolean): void {
    const d = GameApp.design;
    const vb = GameApp.visibleBounds;
    const orientation = isPortrait ? "portrait" : "landscape";
    ["bg-base", "bg-free"].forEach((n, i) => {
      const bg = this.bgs[i];
      bg.texture = tex(`${n}-${orientation}`);
      const scale =
        Math.max(vb.width / bg.texture.width, vb.height / bg.texture.height) ||
        1;
      bg.scale.set(scale);
      bg.position.set(d.width / 2, d.height / 2);
    });

    if (!isPortrait) {
      REELM.setArea(1080, 760);
      REELM.position.set(d.width / 2 + 60, 470);
      this.buyFeatureNode.position.set(220, 340);
      this.anteBetNode.position.set(220, 560);
    } else {
      REELM.setArea(980, 900);
      REELM.position.set(d.width / 2, 860);
      this.buyFeatureNode.position.set(d.width * 0.3, 300);
      this.anteBetNode.position.set(d.width * 0.7, 300);
    }
    this.bottomUI.layout(isPortrait, d.width, d.height);
  }

  getInitialState() {
    let initState = 0;
    if (GAME.stakeResponse?.round == null || GAME.isReplay) {
      initState = 0;
      GAME.isIdleInitState = true;
    } else {
      GAME.splitSpinResponses = FreespinResponseSplitter.splitResponse(
        GAME.stakeResponse,
      );
      GAME.currentSplitSpinIndex = 0;
      BottomUI.toggleSpinUI(false);
      BottomUI.toggleCreditBtnUI(false);
      BottomUI.toggleMenuButtons(false);
      this.toggleBuyFreeSpin();
      this.toggleAnteBet();
      GAME.totalScreen = GAME.getCurrentSplitResponse().round.state.length;
      GAME.CurrentScreen = 0;
      initState = 1;
    }
    return initState;
  }

  protected onShow(_data: any): void {
    GAME.turboToggle = get("turbo") || false;
    GAME.quickToggle = get("quick") || false;
    if (!this.smStarted) {
      this.smStarted = true;
      GAME.addObserver(this.onPropertyChanged.bind(this));
      Ticker.shared.add(this.tick);
    }
    BottomUI.Init();
    this.buyFeatureNode.updateAmount();
    this.anteBetNode.updateUI();
    this.sm.initSM(GAME, Events, this.intialStates[this.getInitialState()]);
    this.updateFreeSpinsCount();
    BottomUI.toggleTurboUI();
  }

  protected onHide(): void {}

  protected onPropertyChanged(change: { property: string; value: any }) {
    switch (change.property) {
      case "bet":
      case "BonusBoostFeatureBought":
        this.buyFeatureNode.updateAmount();
        this.anteBetNode.updateUI();
        if (!GAME.freeSpinsEnabled && !GAME.isUILocked) {
          this.toggleBuyFreeSpin(
            GAME.bet * buyFreeSpinAmount <= GAME.Player.Balance,
          );
          this.toggleAnteBet(GAME.bet * anteBetAmount <= GAME.Player.Balance);
        }
        break;
      case "Next":
        this.updateFreeSpinsCount();
        break;
    }
  }

  update(dt: number) {
    this.sm?.update(dt);
    if (GAME.isUILocked) {
      if (this.elapsedTimeUiIsLocked < this.totalTimeUiCanBeLocked) {
        this.elapsedTimeUiIsLocked += dt;
        if (this.elapsedTimeUiIsLocked >= this.totalTimeUiCanBeLocked)
          GAME.isUILocked = false;
      }
    } else {
      this.elapsedTimeUiIsLocked = 0;
    }
  }

  openBetChoice() {
    if (GAME.autoToggle || GAME.freeSpinsEnabled) return;
    PopUps.show(PopUpType.BetChoicePopUp);
  }

  updateFreeSpinsCount() {
    BottomUI.updateFreeSpinsCount(GAME.totalFreeSpins - GAME.currentFreeSpins);
  }

  onStopBtn() {
    if (GAME.autoToggle) {
      GAME.autoToggle = false;
      return;
    }
    // Only a request to stop: it is emitted again when the request is fulfilled.
    Events.emit(GameEvents.ON_SPIN_STOP, true);
    QUEUE.SkipTask();
  }

  onSpinBtn() {
    let bet = GAME.bet;
    if (GAME.BonusBoostFeatureBought) bet = GAME.bet * anteBetAmount;
    if (!GAME.freeSpinsEnabled && GAME.Player.Balance < bet && !GAME.isReplay) {
      PopUps.show(PopUpType.InsufficientBalance);
      return;
    }
    if (GAME.isUILocked) return;
    GAME.isUILocked = true;
    Events.emit(GameEvents.ON_SPIN_START, true);
  }

  onTurboBtn() {
    GAME.turboToggle = !GAME.turboToggle;
    save("turbo", GAME.turboToggle);
  }

  onAutoBtn() {
    if (!GAME.autoToggle) {
      if (GAME.isUILocked) return;
      GAME.isUILocked = true;
      PopUps.show(PopUpType.AutoSpinPopUp);
      return;
    }
    GAME.autoToggle = false;
    GAME.autoSpinCount = 0;
  }

  toggleFeatureBuyPopUp() {
    if (GAME.isUILocked) return;
    GAME.isUILocked = true;
    Sounds.playSoundAsync(SFX.BUY_BONUS_BUTTON);
    PopUps.show(PopUpType.FeatureBuyPopUp);
  }

  onOpenPayTable() {
    if (GAME.isUILocked) return;
    GAME.isUILocked = true;
    PopUps.show(PopUpType.PaytablePopup);
  }

  showSettingsPopup() {
    if (GAME.isUILocked) return;
    GAME.isUILocked = true;
    PopUps.show(PopUpType.Settings);
  }

  checkForAutoSpins() {
    if (GAME.autoSpinCount <= 0 && !GAME.infinitySpinsEnabled) {
      GAME.autoToggle = false;
      BottomUI.toggleSpinUI(true);
    } else {
      BottomUI.toggleSpinUI(false);
    }
  }

  toggleBgs(flag: boolean) {
    this.bgs[0].visible = !flag;
    this.bgs[1].visible = flag;
  }

  toggleFreeSpinsUI(flag: boolean) {
    this.buyFeatureNode.visible = !flag;
    this.anteBetNode.visible = !flag;
    REELM.toggleFreeSpin(flag);
    BottomUI.toggleBaseAndFreeSpinUI(flag);
    this.toggleBgs(flag);
  }

  deductInstantBet() {
    if (GAME.featureBought) return;
    if (GAME.freeSpinsEnabled || GAME.Next?.Type == 30) return;
    if (GAME.bet > GAME.Player.Balance) return;
    const bet = GAME.BonusBoostFeatureBought
      ? GAME.bet * anteBetAmount
      : GAME.bet;
    BottomUI.setBalance(GAME.Player.Balance - bet);
  }

  deductFeatureBuyAmt(amt: number) {
    BottomUI.setBalance(Math.max(0, GAME.Player.Balance - amt));
  }

  spinReels() {
    return new Promise((resolve) => {
      setTimeout(() => Sounds.playSoundAsync(SFX.REEL_SPIN), 100);
      this.deductInstantBet();
      BottomUI.toggleSpinUI(false);
      if (!GAME.freeSpinsEnabled) BottomUI.resetLabels();
      this.toggleBuyFreeSpin();
      this.toggleAnteBet();
      PopUps.hideAllPopUps();
      BottomUI.toggleMenuButtons(false);
      REELM.spinReels();
      resolve("spinning done");
    });
  }

  toggleBuyFreeSpin(flag = false) {
    this.buyFeatureNode?.toggleFeatureBuyFreeSpin(flag);
  }

  toggleAnteBet(flag = false) {
    this.anteBetNode?.toggleFeatureAnteBet(flag);
  }

  setWinAnimation(win: number) {
    if (win >= 15 * GAME.bet && win < 40 * GAME.bet) {
      Sounds.playSoundAsync(SFX.BIGWIN);
      PopUps.show(PopUpType.WinsPopUp, {
        index: WinAnims.NICE,
        winAmount: win,
      });
    } else if (win >= 40 * GAME.bet && win < 70 * GAME.bet) {
      Sounds.playSoundAsync(SFX.OMG);
      PopUps.show(PopUpType.WinsPopUp, { index: WinAnims.OMG, winAmount: win });
    } else if (win >= 70 * GAME.bet) {
      Sounds.playSoundAsync(SFX.SUPER);
      PopUps.show(PopUpType.WinsPopUp, {
        index: WinAnims.SUPER,
        winAmount: win,
      });
    }
  }

  openMaxWin(win: number) {
    Sounds.playSoundAsync(SFX.MAX);
    PopUps.show(PopUpType.WinsPopUp, { index: WinAnims.MAX, winAmount: win });
  }

  /** No character spine in this project; kept as the hook ReelManager calls. */
  playCharacterAnimation(_isWon: boolean) {}
}

export { Instance };
