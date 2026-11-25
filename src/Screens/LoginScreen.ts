import { Container, Graphics, Sprite } from "pixi.js";
import AbstractScreen from "../utils/Screens/AbstractScreen";
import GameState from "../Data/GameState";
import { GameApp } from "../core/GameApp";
import { Tweens, Ease } from "../core/Tween";
import { tex, hasTex } from "../UI/Textures";
import { Button, COLORS, makeText, makeTitle } from "../UI/Widgets";
import { ProgressBarManager } from "../Data/ProgressBarManager";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { MockLogin, authenticateRes } from "../MockServerScript";
import {
  authenticate,
  AuthenticateResponse,
  endRound,
  isReplayMode,
  getReplayUrlParams,
  replay,
  RGSError,
} from "../StakeClient/client";
import { API_AMOUNT_MULTIPLIER } from "../StakeClient/constants";
import {
  PopUps,
  Screens,
  ScreenEnum,
  GAME,
  PopUpType,
  parseUrlParams,
  Sounds,
  SFX,
  currencyToSymbol,
  Events,
  get,
} from "../Data/GameConstants";

/**
 * Port of Royal Tower LoginScreen: authenticates with the RGS (or loads a replay), shows the
 * loading bar while main.ts loads the game bundles, then fills GameState and opens the game.
 */
export default class LoginScreen extends AbstractScreen {
  private doNotShowAgainKey = "doNotShowAgain";
  private isContinueClicked = false;
  private currencyParams: string = null;
  private authdata: AuthenticateResponse = null;
  private replayParams: any = null;

  private bg = new Graphics();
  private splash: Sprite = null;
  private logo = makeTitle("CHIPMUNK HEIST", 120, COLORS.gold);
  private barRoot = new Container();
  private barBase: Sprite;
  private barFill: Sprite;
  private barMask = new Graphics();
  private progressLabel = makeText("0%", { fontSize: 30 });
  private startButton: Button;

  private progress = 0;
  private assetsLoaded = false;
  private authDone = false;
  private autoLogin = false;

  constructor() {
    super();
    const stored = localStorage.getItem(this.doNotShowAgainKey);
    if (stored == null) localStorage.setItem(this.doNotShowAgainKey, "false");
    else this.autoLogin = stored === "true";

    Events.on(
      "watchReplay",
      () => Screens.showScreen(ScreenEnum.GameScreen),
      this,
    );
  }

  protected build(): void {
    this.barBase = new Sprite(tex("Loading-Bar-Base"));
    this.barBase.anchor.set(0.5);
    this.barFill = new Sprite(tex("Loading-Fill"));
    this.barFill.anchor.set(0.5);
    this.barFill.mask = this.barMask;
    this.progressLabel.y = 70;
    this.barRoot.addChild(
      this.barBase,
      this.barFill,
      this.barMask,
      this.progressLabel,
    );

    this.startButton = new Button("START", {
      width: 340,
      height: 110,
      fontSize: 48,
    });
    this.startButton.onClick(() => this.onStartButtonClick());
    this.startButton.visible = false;

    this.addChild(this.bg, this.logo, this.barRoot, this.startButton);
    this.setProgress(this.progress);
  }

  layout(isPortrait: boolean): void {
    const d = GameApp.design;
    const vb = GameApp.visibleBounds;
    this.bg.clear().rect(vb.x, vb.y, vb.width, vb.height).fill(0x0b0a14);
    if (this.splash) {
      const s = Math.max(
        vb.width / this.splash.texture.width,
        vb.height / this.splash.texture.height,
      );
      this.splash.scale.set(s);
      this.splash.position.set(d.width / 2, d.height / 2);
    }
    this.logo.position.set(d.width / 2, d.height * (isPortrait ? 0.3 : 0.28));
    this.barRoot.position.set(d.width / 2, d.height * 0.78);
    const maxBar = d.width * 0.8;
    const scale =
      this.barBase.texture.width > maxBar
        ? maxBar / this.barBase.texture.width
        : 1;
    this.barRoot.scale.set(scale);
    this.startButton.position.set(d.width / 2, d.height * 0.78);
  }

  protected onShow(_data: any): void {
    ProgressBarManager.hide();
    this.start();
  }

  protected onHide(): void {}

  /** 0..1, driven by main.ts while the game bundles load. */
  setProgress(p: number) {
    this.progress = Math.max(this.progress, Math.min(1, p));
    if (!this.barFill) return;
    const w = this.barFill.texture.width || 600;
    const h = this.barFill.texture.height || 40;
    this.barMask
      .clear()
      .rect(-w / 2, -h / 2, w * this.progress, h)
      .fill(0xffffff);
    this.progressLabel.text = `${Math.round(this.progress * 100)}%`;
  }

  /** Called by main.ts once every bundle is loaded. */
  finishedLoading() {
    this.assetsLoaded = true;
    this.setProgress(1);
    if (hasTex("splash/art") || hasTex("art")) {
      this.splash = new Sprite(
        tex(hasTex("splash/art") ? "splash/art" : "art"),
      );
      this.splash.anchor.set(0.5);
      this.addChildAt(this.splash, 1);
      this.layout(GameApp.isPortrait);
    }
    Sounds.playMusicAudio(SFX.BGM);
    this.tryShowStart();
  }

  private tryShowStart() {
    if (!this.assetsLoaded || !this.authDone) return;
    if (this.autoLogin) {
      this.login();
      return;
    }
    this.barRoot.visible = false;
    this.startButton.visible = true;
    this.startButton.scale.set(0);
    Tweens.to(
      this.startButton.scale,
      { x: 1, y: 1 },
      { duration: 0.4, ease: Ease.backOut },
    );
  }

  private started = false;

  protected async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    if (!isReplayMode()) {
      // this.authdata = await authenticate().catch((error) => {
      //   console.error("Authentication error:", error);
      //   const errorCode = error instanceof RGSError ? error.message : null;
      //   PopUps.show(PopUpType.NetworkErrorPopUp, errorCode);
      //   throw error;
      // });
      this.authdata = authenticateRes as any;
      // console.log("Authentication successful:", this.authdata);
      this.authDone = true;
      this.tryShowStart();
    } else {
      try {
        this.replayParams = getReplayUrlParams();
        const response: any = await replay(this.replayParams);
        this.replayParams.costMultiplier = response.costMultiplier;
        this.replayParams.payoutMultiplier = response.payoutMultiplier;
        this.replayParams.totalwin =
          response?.state?.[response.state.length - 1]?.amount;
      } catch (error) {
        const errorCode = error instanceof RGSError ? error.message : null;
        PopUps.show(PopUpType.NetworkErrorPopUp, errorCode);
        return;
      }
      const waitForAssets = () =>
        this.assetsLoaded ? this.startReplay() : setTimeout(waitForAssets, 100);
      waitForAssets();
    }
  }

  playClickSound() {
    Sounds.playSoundAsync(SFX.COMMON_BUTTON);
  }

  async login() {
    if (this.isContinueClicked) return;
    this.isContinueClicked = true;
    const params = parseUrlParams(window.location.href);
    this.currencyParams = params?.currency ?? null;
    try {
      await this.setupInitialData(this.authdata);
    } catch (e) {
      const errorCode = e instanceof RGSError ? e.message : null;
      PopUps.show(PopUpType.NetworkErrorPopUp, errorCode);
      throw e;
    }
  }

  async startReplay() {
    try {
      const params = parseUrlParams(window.location.href);
      this.currencyParams = params?.currency ?? null;
      new GameState(MockLogin());
      GAME.replayParams = this.replayParams;
      GAME.isReplay = true;
      GAME.shouldReplay = true;
      if (this.replayParams.mode === "ante")
        GAME.BonusBoostFeatureBought = true;
      this.applyCurrency();
      GAME.Jurisdiction = {
        socialCasino: true,
        disabledFullscreen: false,
        disabledTurbo: false,
        disabledSuperTurbo: false,
        disabledAutoplay: false,
        disabledSlamstop: false,
        disabledSpacebar: false,
        disabledBuyFeature: false,
        displayNetPosition: false,
        displayRTP: false,
        displaySessionTimer: false,
        minimumRoundDuration: 0,
      } as any;
      if (
        this.replayParams.mode !== "base" &&
        !String(this.replayParams.mode).includes("ante")
      ) {
        GAME.featureBought = true;
      }
      if (this.replayParams.amount)
        GAME.bet = this.replayParams.amount / API_AMOUNT_MULTIPLIER;
      PopUps.show(PopUpType.ReplayPopup, { calledFromLoginScreen: true });
    } catch (e) {
      PopUps.show(PopUpType.NetworkErrorPopUp);
      throw e;
    }
  }

  private applyCurrency() {
    if (this.currencyParams != null) {
      this.currencyParams = this.currencyParams.toUpperCase();
      GAME.Currency =
        currencyToSymbol[this.currencyParams.replace(/ /g, "")] ??
        GAME.Currency;
    }
  }

  async setupInitialData(apiData: AuthenticateResponse) {
    new GameState(MockLogin());
    GAME.setISPINData(apiData);
    GAME.Jurisdiction = apiData.config.jurisdiction;
    GAME.Player.Balance = apiData.balance.amount / API_AMOUNT_MULTIPLIER;
    this.fillBet(apiData);
    this.applyCurrency();

    if (apiData.round != null) {
      GAME.hasPreRefreshData = true;
      GAME.bet = apiData.round.amount / API_AMOUNT_MULTIPLIER;
      const win = apiData.round.payout / API_AMOUNT_MULTIPLIER;
      endRound()
        .then((response) => {
          GAME.pendingBalance = response.balance.amount / API_AMOUNT_MULTIPLIER;
          GAME.Player.Balance = GAME.pendingBalance - win;
          PopUps.show(PopUpType.ShouldContinuePopup);
        })
        .catch((error) => {
          console.error("Error ending round:", error);
          const errorCode = error instanceof RGSError ? error.message : null;
          PopUps.show(PopUpType.NetworkErrorPopUp, errorCode);
        });
    } else {
      Screens.showScreen(ScreenEnum.GameScreen);
    }
  }

  fillBet(apiData: AuthenticateResponse) {
    GAME.GameInfo.LineBet = apiData.config.betLevels.map(
      (b: number) => b / API_AMOUNT_MULTIPLIER,
    );
    GAME.defaultBet = apiData.config.defaultBetLevel / API_AMOUNT_MULTIPLIER;
    const canSetLastBet = apiData.round != null;
    const lastBet = get("bet");
    GAME.bet = lastBet && canSetLastBet ? Number(lastBet) : GAME.defaultBet;
    GAME.currentCredit = GAME.GameInfo.LineBet.findIndex(
      (bet) => bet === GAME.bet,
    );
    if (GAME.currentCredit < 0) {
      GAME.currentCredit = 0;
      GAME.bet = GAME.GameInfo.LineBet[0] ?? GAME.bet;
    }
  }

  onStartButtonClick() {
    this.playClickSound();
    this.login();
  }

  callSpinEndRound() {
    endRound()
      .then((response) => {
        if (GAME.stakeResponse) GAME.stakeResponse.round = null;
        GAME.Player.Balance = response.balance.amount / API_AMOUNT_MULTIPLIER;
        Screens.showScreen(ScreenEnum.GameScreen);
      })
      .catch(() => {});
  }
}
