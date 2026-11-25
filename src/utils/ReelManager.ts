import { Container, Graphics, Sprite, Text } from "pixi.js";
import Reel from "../UI/Reel";
import SymbolView from "../UI/Symbol";
import {
  StakeBoardPosition,
  StakeBoardSymbol,
  StakeRoundStateType,
  StakeWinInfo,
} from "../Data/StakePlayResponse";
import { randomSymbolFrame } from "../Data/GameConfig";
import { Tweens, Ease } from "../core/Tween";
import { tex, hasTex } from "../UI/Textures";
import { makeText, makeTitle, COLORS } from "../UI/Widgets";
import { money } from "../UI/Format";
import { Instance as Events } from "../SlotFSM/StateMachine/EventEmitter";
import { Instance as GAME } from "../Data/GameState";
import { Instance as QUEUE, QUEUEACTIONEND, QUEUE_PRIORITY } from "./Queue";
import { Instance as Sounds, SFX } from "./SoundManager";
import { BottomUI, GameView } from "../Data/GameConstants";

const DEFAULT_COLUMNS = 6;
const DEFAULT_ROWS = 5;

/**
 * Port of Royal Tower's ReelManager for Pixi. The grid size follows the server board
 * (columns = board.length, rows = column.length − 2 padding cells). All presentation steps that the
 * states hand to the QUEUE (reset, paylines, scatters, cascades, multiplier totals) live here and
 * finish by emitting QUEUEACTIONEND exactly like the Cocos version.
 */
export class ReelManager extends Container {
  reels: Reel[] = [];
  columns = DEFAULT_COLUMNS;
  rows = DEFAULT_ROWS;
  cell = 150;

  private areaWidth = 1140;
  private areaHeight = 800;
  private background = new Container();
  private reelBase: Sprite;
  private frame: Sprite;
  private reelLayer = new Container();
  private dividers = new Graphics();
  private tintOverlay = new Graphics();
  private highlightLayer = new Container();
  private floatingLayer = new Container();

  /** Tumble win counter (free spins). */
  tumbleWinNode = new Container();
  private tumbleWinLabel: Text;
  tumbleWinValue = 0;

  private timers = new Set<ReturnType<typeof setTimeout>>();
  private built = false;
  private animatedSymbols: SymbolView[] = [];

  /** Builds the static visuals; call after assets are loaded. */
  init() {
    if (this.built) return;
    this.built = true;
    this.reelBase = new Sprite(
      hasTex("Reel Base") ? tex("Reel Base") : tex("Reel"),
    );
    this.reelBase.anchor.set(0.5);
    this.frame = new Sprite(tex("Frame"));
    this.frame.anchor.set(0.5);
    this.background.addChild(this.reelBase);

    const frameBg = new Sprite(tex("total_frame.png"));
    frameBg.anchor.set(0.5);
    frameBg.scale.set(0.9);
    const title = makeText("TUMBLE WIN", { fontSize: 26, fill: COLORS.gold });
    title.y = -22;
    this.tumbleWinLabel = makeTitle(money(0), 40, COLORS.white);
    this.tumbleWinLabel.y = 16;
    this.tumbleWinNode.addChild(frameBg, title, this.tumbleWinLabel);
    this.tumbleWinNode.visible = false;

    this.addChild(
      this.background,
      this.reelLayer,
      this.dividers,
      this.tintOverlay,
      this.highlightLayer,
      this.frame,
      this.tumbleWinNode,
      this.floatingLayer,
    );
    this.tintOverlay.visible = false;
    this.generateReelOnStart();
  }

  /** Reel area in design pixels; the grid is centred on (0, 0) of this container. */
  setArea(width: number, height: number) {
    this.areaWidth = width;
    this.areaHeight = height;
    this.layoutGrid(this.columns, this.rows, true);
  }

  private layoutGrid(columns: number, rows: number, force = false) {
    if (
      !force &&
      columns === this.columns &&
      rows === this.rows &&
      this.reels.length === columns
    )
      return;
    this.columns = columns;
    this.rows = rows;
    this.cell = Math.floor(
      Math.min(this.areaWidth / columns, this.areaHeight / rows),
    );
    const gridW = this.cell * columns;
    const gridH = this.cell * rows;

    if (this.reels.length !== columns) {
      this.reels.forEach((r) => r.destroy({ children: true }));
      this.reels = [];
      for (let c = 0; c < columns; c++) {
        const reel = new Reel(c, rows, this.cell);
        this.reels.push(reel);
        this.reelLayer.addChild(reel);
      }
    } else {
      this.reels.forEach((r) => {
        const previous = r.symbols.map((s) => s.data);
        r.build(rows, this.cell);
        if (previous.length === rows && previous.every((d) => d?.name))
          r.setInstant(previous);
      });
    }
    this.reels.forEach((reel, c) =>
      reel.position.set(-gridW / 2 + c * this.cell, -gridH / 2),
    );

    this.dividers.clear();
    for (let c = 1; c < columns; c++) {
      const x = -gridW / 2 + c * this.cell;
      this.dividers
        .rect(x - 1.5, -gridH / 2 + 8, 3, gridH - 16)
        .fill({ color: 0xf6d77a, alpha: 0.25 });
    }
    this.tintOverlay.clear();
    this.tintOverlay
      .rect(-gridW / 2, -gridH / 2, gridW, gridH)
      .fill({ color: 0x000000, alpha: 0.45 });

    if (this.reelBase) {
      this.reelBase.width = gridW + 40;
      this.reelBase.height = gridH + 40;
      this.frame.width = gridW + 110;
      this.frame.height = gridH + 110;
    }
    this.tumbleWinNode.position.set(0, -gridH / 2 - 70);
  }

  get gridHeight() {
    return this.cell * this.rows;
  }

  get gridWidth() {
    return this.cell * this.columns;
  }

  // ---------------------------------------------------------------------------------------------
  // Scheduling helpers (Cocos scheduleOnce / unscheduleAllCallbacks)
  // ---------------------------------------------------------------------------------------------

  private schedule(callback: () => void, seconds: number) {
    const handle = setTimeout(() => {
      this.timers.delete(handle);
      callback();
    }, seconds * 1000);
    this.timers.add(handle);
  }

  unshceduleAllReelManagerCallbacks() {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
  }

  // ---------------------------------------------------------------------------------------------
  // Reel generation
  // ---------------------------------------------------------------------------------------------

  /** Board shown before the first spin: the current reveal board if any, else random symbols. */
  generateReelOnStart() {
    const reveal = GAME?.getStakeResponseByType?.("reveal");
    if (reveal?.board?.length) {
      this.layoutGrid(reveal.board.length, reveal.board[0].length - 2, true);
      reveal.board.forEach((col, c) =>
        this.reels[c]?.setInstant(col.slice(1, -1)),
      );
      return;
    }
    this.layoutGrid(this.columns, this.rows, true);
    this.reels.forEach((reel) =>
      reel.setInstant(
        Array.from({ length: this.rows }, () => ({
          name: randomSymbolFrame(),
        })),
      ),
    );
  }

  spinReels() {
    this.stopAllPaylines();
    Sounds.playSoundAsync(SFX.REEL_SPIN);
    const turbo = GAME.turboToggle;
    this.reels.forEach((reel, i) => reel.startSpin(turbo ? 0 : i * 0.06));
  }

  /** Lands column `column` with a padded server column (`symbolData` includes both padding cells). */
  generateReel(symbolData: StakeBoardSymbol[], column: number) {
    if (!symbolData) return;
    const rows = symbolData.length - 2;
    const reveal = GAME.getStakeResponseByType("reveal");
    const columns = reveal?.board?.length ?? this.columns;
    if (columns !== this.columns || rows !== this.rows)
      this.layoutGrid(columns, rows);
    const reel = this.reels[column];
    if (!reel) return;
    reel.stopWith(
      symbolData.slice(1, -1),
      GAME.turboToggle || GAME.isStopRequested,
    );
    const anticipation = reveal?.anticipation?.[column + 1] ?? 0;
    if (anticipation > 0 && !GAME.turboToggle && !GAME.isStopRequested)
      this.setAnticipation(column + 1);
  }

  stopReels() {
    const reveal = GAME.getStakeResponseByType("reveal");
    this.reels.forEach((reel, c) => {
      if (!reel.isSpinning) return;
      const column = reveal?.board?.[c];
      reel.stopWith(
        column ? column.slice(1, -1) : reel.symbols.map((s) => s.data),
        true,
      );
    });
  }

  /** Glow pulse on the column that is about to land (anticipation). */
  setAnticipation(column: number) {
    const reel = this.reels[column];
    if (!reel) return;
    Sounds.playSoundAsync(SFX.ANTICIPATION);
    const glow = new Graphics();
    glow
      .roundRect(0, 0, this.cell, this.gridHeight, 16)
      .stroke({ color: 0xffc83d, width: 8 });
    glow.position.copyFrom(reel.position);
    this.highlightLayer.addChild(glow);
    glow.alpha = 0;
    Tweens.to(
      glow,
      { alpha: 1 },
      {
        duration: 0.25,
        onComplete: () =>
          Tweens.to(
            glow,
            { alpha: 0 },
            { duration: 0.6, delay: 0.5, onComplete: () => glow.destroy() },
          ),
      },
    );
  }

  toggleReelTint(flag: boolean) {
    this.tintOverlay.visible = false;
    this.reels.forEach((r) => r.setDimmed(flag));
  }

  // ---------------------------------------------------------------------------------------------
  // Reset (RESET queue task)
  // ---------------------------------------------------------------------------------------------

  resetReels() {
    this.stopAllPaylines();
    this.resetTumbleWin();
    this.clearFloatingLabels();
    this.schedule(
      () => Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.RESET),
      0.55,
    );
  }

  /** Skip path of the RESET task: kill everything and land the reels immediately. */
  destroyInstantly() {
    this.stopAllPaylines();
    this.clearFloatingLabels();
  }

  resetTumbleWin() {
    this.tumbleWinValue = 0;
    if (this.tumbleWinLabel) this.tumbleWinLabel.text = money(0);
  }

  stopAllTweens() {
    this.reels.forEach((r) => r.stopAllTweens());
    Tweens.killTweensOf(this);
  }

  stopAllPaylines() {
    this.animatedSymbols.forEach((s) => s.hideWin());
    this.animatedSymbols = [];
    this.toggleReelTint(false);
    this.reels.forEach((r) => r.resetSymbols());
  }

  toggleFreeSpin(flag: boolean) {
    this.tumbleWinNode.visible = flag;
    if (!flag) this.resetTumbleWin();
  }

  private clearFloatingLabels() {
    this.floatingLayer.removeChildren().forEach((c) => {
      Tweens.killTweensOf(c);
      c.destroy();
    });
  }

  // ---------------------------------------------------------------------------------------------
  // Wins
  // ---------------------------------------------------------------------------------------------

  private symbolAt(pos: StakeBoardPosition): SymbolView {
    return this.reels[pos.reel]?.getSymbol(pos.row - 1);
  }

  showPaylines(wins: StakeWinInfo[]) {
    QUEUE.enQueue({
      execute: () => {
        if (!wins || wins.length === 0) {
          Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.PAYLINES);
          return;
        }
        this.toggleReelTint(true);
        const seen = new Set<SymbolView>();
        wins.forEach((win) =>
          win.positions.forEach((pos) => {
            const symbol = this.symbolAt(pos);
            if (symbol && !seen.has(symbol)) {
              seen.add(symbol);
              symbol.showWin();
            }
          }),
        );
        this.animatedSymbols = [...seen];
        GameView?.playCharacterAnimation(true);
        Sounds.playSoundAsync(SFX.PAYWIN);
        this.schedule(
          () => Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.PAYLINES),
          1,
        );
      },
      skip: () => {
        this.unshceduleAllReelManagerCallbacks();
        GameView?.playCharacterAnimation(false);
        Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.PAYLINES);
      },
      priority: QUEUE_PRIORITY.PAYLINES,
    });
  }

  animateScatter() {
    if (GAME.getCurrentStakeState() !== StakeRoundStateType.FREE_SPIN_TRIGGER)
      return;
    const trigger = GAME.getCurrentStakeResponseByType("freeSpinTrigger");
    QUEUE.enQueue({
      execute: () => {
        this.schedule(() => {
          this.toggleReelTint(true);
          Sounds.playSoundAsync(SFX.BONUS_ALERT);
          const scatters: SymbolView[] = [];
          if (trigger?.positions?.length) {
            trigger.positions.forEach((p) => {
              const s = this.symbolAt(p);
              if (s) scatters.push(s);
            });
          } else {
            this.reels.forEach((r) =>
              r.symbols.forEach((s) => s.isScatter && scatters.push(s)),
            );
          }
          scatters.forEach((s) => s.animateScatter());
          this.animatedSymbols = scatters;
        }, 0.6);
        this.schedule(() => {
          this.stopAllPaylines();
          Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.ANIMATE_SCATTER_SYMBOLS);
        }, 3.3);
      },
      priority: QUEUE_PRIORITY.ANIMATE_SCATTER_SYMBOLS,
    });
  }

  /** Cascade (tumbleBoard). Ends the RESPIN task once every reel has refilled. */
  deleteCascade(
    explodingSymbols: StakeBoardPosition[],
    newSymbols: StakeBoardSymbol[][],
  ) {
    QUEUE.enQueue({
      execute: () => {
        this.schedule(
          async () => {
            Sounds.stopSound();
            this.stopAllPaylines();
            this.shake();
            const jobs = this.reels.map((reel, i) => {
              const rows = explodingSymbols
                .filter((p) => p.reel === i)
                .map((p) => p.row - 1)
                .sort((a, b) => a - b);
              return reel.deleteCascadeStyle(rows, newSymbols?.[i] ?? []);
            });
            if (GAME.freeSpinsEnabled) this.setTumbleWins();
            await Promise.all(jobs);
            Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.RESPIN);
          },
          GAME.turboToggle ? 0.05 : 0.3,
        );
      },
      priority: QUEUE_PRIORITY.RESPIN,
    });
  }

  private shake() {
    const x = this.x;
    Tweens.killTweensOf(this);
    let n = 0;
    const step = () => {
      if (n++ >= 6) {
        this.x = x;
        return;
      }
      Tweens.to(
        this,
        { x: x + (n % 2 ? 8 : -8) },
        { duration: 0.04, onComplete: step },
      );
    };
    step();
  }

  private currentWinSum() {
    return (GAME.currentStakeWinInfo ?? []).reduce(
      (sum, w) => sum + (w.win / 100) * GAME.bet,
      0,
    );
  }

  setTumbleWins() {
    this.tumbleWinValue += this.currentWinSum();
    this.tumbleWinLabel.text = money(this.tumbleWinValue);
    Tweens.to(
      this.tumbleWinLabel.scale,
      { x: 1.25, y: 1.25 },
      {
        duration: 0.15,
        onComplete: () =>
          Tweens.to(
            this.tumbleWinLabel.scale,
            { x: 1, y: 1 },
            { duration: 0.15 },
          ),
      },
    );
  }

  showFloatingTumbleWinnings() {
    const amount = this.currentWinSum();
    if (amount <= 0) return;
    const label = makeTitle(money(amount), 64, COLORS.gold);
    label.position.set(0, 0);
    this.floatingLayer.addChild(label);
    label.scale.set(0.3);
    Tweens.to(
      label.scale,
      { x: 1, y: 1 },
      { duration: 0.3, ease: Ease.backOut },
    );
    Tweens.to(
      label,
      { y: -120, alpha: 0 },
      {
        duration: 0.8,
        delay: 0.9,
        ease: Ease.quadIn,
        onComplete: () => label.destroy(),
      },
    );
  }

  // ---------------------------------------------------------------------------------------------
  // Multipliers (TOTAL_WIN_CALCULATION queue task)
  // ---------------------------------------------------------------------------------------------

  private multiplierSymbols(): SymbolView[] {
    const out: SymbolView[] = [];
    this.reels.forEach((r) =>
      r.symbols.forEach((s) => s.getMultiplierValue() > 1 && out.push(s)),
    );
    return out;
  }

  getMultiplierSymbols() {
    const symbols = this.multiplierSymbols();
    if (!GAME.freeSpinsEnabled || symbols.length === 0) {
      Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.TOTAL_WIN_CALCULATION);
      return;
    }
    Sounds.playSoundAsync(SFX.MULTIPLIER_REVEAL);
    symbols.forEach((s) => s.playMultiplierRevealAnimation());
    this.schedule(
      () => Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.TOTAL_WIN_CALCULATION),
      0.8,
    );
  }

  startMultiplierCalculation() {
    const symbols = this.multiplierSymbols();
    if (!GAME.freeSpinsEnabled || symbols.length === 0) {
      BottomUI?.setTotalWin(GAME.Current.TotalWin);
      Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.TOTAL_WIN_CALCULATION);
      return;
    }
    Sounds.playSoundAsync(SFX.MULTIPLIER_REVEAL);
    const target = this.tumbleWinNode.position;
    const flights = symbols.map((s, i) => {
      const label = makeTitle(`x${s.getMultiplierValue()}`, 56, 0xffe066);
      const p = this.toLocal(s.getGlobalPosition());
      label.position.copyFrom(p);
      this.floatingLayer.addChild(label);
      return Tweens.toAsync(
        label,
        { x: target.x, y: target.y },
        { duration: 0.5, delay: 0.15 * i, ease: Ease.quadIn },
      ).then(() => label.destroy());
    });
    Promise.all(flights).then(() => {
      this.tumbleWinValue = GAME.Current.TotalWin ?? this.tumbleWinValue;
      this.tumbleWinLabel.text = money(this.tumbleWinValue);
      BottomUI?.setTotalWin(GAME.Current.TotalWin);
      Events.emit(QUEUEACTIONEND, QUEUE_PRIORITY.TOTAL_WIN_CALCULATION);
    });
  }

  skipToEndCalculation() {
    this.unshceduleAllReelManagerCallbacks();
    this.clearFloatingLabels();
    BottomUI?.setTotalWin(GAME.Current.TotalWin);
  }
}

const Instance = new ReelManager();
export { Instance };
