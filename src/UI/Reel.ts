import { Container, Graphics, Ticker } from "pixi.js";
import SymbolView from "./Symbol";
import { StakeBoardSymbol } from "../Data/StakePlayResponse";
import { randomSymbolFrame } from "../Data/GameConfig";
import { Tweens, Ease } from "../core/Tween";
import { Instance as Sounds, SFX } from "../utils/SoundManager";

const SPIN_SPEED = 3800; // design px / second

/**
 * One reel column (port of the Cocos Reel prefab). While spinning, `rows + 1` blurred symbols scroll
 * downward with random frames; `stopWith` lands the result symbols with a bounce. Cascades explode
 * cells and drop the survivors plus new symbols from above.
 */
export default class Reel extends Container {
  readonly column: number;
  rows: number;
  cell: number;
  symbols: SymbolView[] = [];
  private spinStrip: SymbolView[] = [];
  private spinLayer = new Container();
  private symbolLayer = new Container();
  private maskShape = new Graphics();
  private spinning = false;
  private offset = 0;
  private tick = (ticker: Ticker) => this.updateSpin(ticker.deltaMS / 1000);

  constructor(column: number, rows: number, cell: number) {
    super();
    this.column = column;
    this.rows = rows;
    this.cell = cell;
    this.addChild(this.spinLayer, this.symbolLayer, this.maskShape);
    this.mask = this.maskShape;
    this.build();
  }

  /** (Re)creates the symbol views for `rows` × `cell`. */
  build(rows = this.rows, cell = this.cell) {
    this.rows = rows;
    this.cell = cell;
    this.symbols.forEach((s) => s.destroy({ children: true }));
    this.spinStrip.forEach((s) => s.destroy({ children: true }));
    this.symbols = [];
    this.spinStrip = [];
    for (let r = 0; r < rows; r++) {
      const s = new SymbolView(cell);
      s.setFrame(randomSymbolFrame());
      s.position.set(cell / 2, this.rowY(r));
      this.symbols.push(s);
      this.symbolLayer.addChild(s);
    }
    for (let r = 0; r <= rows; r++) {
      const s = new SymbolView(cell);
      s.setFrame(randomSymbolFrame());
      this.spinStrip.push(s);
      this.spinLayer.addChild(s);
    }
    this.spinLayer.visible = false;
    this.maskShape.clear();
    this.maskShape.rect(0, 0, cell, cell * rows).fill(0xffffff);
  }

  rowY(row: number) {
    return this.cell * row + this.cell / 2;
  }

  get isSpinning() {
    return this.spinning;
  }

  startSpin(delaySeconds = 0) {
    Tweens.killTweensOf(this);
    this.symbols.forEach((s) => Tweens.killTweensOf(s));
    Tweens.to(
      this.symbolLayer,
      { y: -this.cell * 0.25 },
      {
        duration: 0.12,
        delay: delaySeconds,
        ease: Ease.quadOut,
        tag: this,
        onComplete: () => {
          this.symbolLayer.visible = false;
          this.symbolLayer.y = 0;
          this.spinLayer.visible = true;
          this.spinning = true;
          this.offset = 0;
          Ticker.shared.remove(this.tick);
          Ticker.shared.add(this.tick);
        },
      },
    );
  }

  private updateSpin(dt: number) {
    if (!this.spinning) return;
    this.offset += SPIN_SPEED * dt;
    while (this.offset >= this.cell) {
      this.offset -= this.cell;
      const last = this.spinStrip.pop();
      last.setFrame(randomSymbolFrame());
      this.spinStrip.unshift(last);
    }
    this.spinStrip.forEach((s, i) => {
      s.position.set(this.cell / 2, this.rowY(i - 1) + this.offset);
      s.alpha = 0.85;
    });
  }

  /** Lands `result` (top → bottom, visible rows only). */
  stopWith(result: StakeBoardSymbol[], turbo = false, onLanded?: () => void) {
    Tweens.killTweensOf(this, false);
    Ticker.shared.remove(this.tick);
    this.spinning = false;
    this.spinLayer.visible = false;
    this.symbolLayer.visible = true;
    this.symbolLayer.y = 0;
    this.symbolLayer.alpha = 1;
    this.ensureRows(result.length);
    result.forEach((data, r) => {
      const s = this.symbols[r];
      s.setSymbol(data);
      s.position.set(this.cell / 2, this.rowY(r));
    });
    Sounds.playSoundAsync(SFX.REEL_STOP);
    if (turbo) {
      onLanded?.();
      return;
    }
    this.symbolLayer.y = -this.cell * 0.6;
    Tweens.to(
      this.symbolLayer,
      { y: 0 },
      { duration: 0.22, ease: Ease.backOut, tag: this, onComplete: onLanded },
    );
  }

  /** Instant result without animation (initial board / destroyInstantly). */
  setInstant(result: StakeBoardSymbol[]) {
    Tweens.killTweensOf(this, false);
    Ticker.shared.remove(this.tick);
    this.spinning = false;
    this.spinLayer.visible = false;
    this.symbolLayer.visible = true;
    this.symbolLayer.y = 0;
    this.ensureRows(result.length);
    result.forEach((data, r) => {
      this.symbols[r].setSymbol(data);
      this.symbols[r].position.set(this.cell / 2, this.rowY(r));
    });
  }

  private ensureRows(rows: number) {
    if (rows !== this.rows) this.build(rows, this.cell);
  }

  getSymbol(row: number): SymbolView {
    return this.symbols[row];
  }

  /**
   * Cascade: removes `rows` (visible indices, sorted ascending), drops the survivors down and the
   * `newSymbols` (top → bottom) in from above. Resolves once everything has landed.
   */
  async deleteCascadeStyle(
    rows: number[],
    newSymbols: StakeBoardSymbol[] = [],
  ): Promise<void> {
    if (!rows || rows.length === 0) return;
    const removed = new Set(rows);
    await Promise.all(rows.map((r) => this.symbols[r]?.explode()));

    const survivors = this.symbols.filter((_, r) => !removed.has(r));
    const exploded = this.symbols.filter((_, r) => removed.has(r));
    const incoming = newSymbols.slice(-exploded.length);
    while (incoming.length < exploded.length) incoming.unshift({ name: "" });

    exploded.forEach((s, i) => {
      s.setSymbol(incoming[i]);
      s.alpha = 1;
      s.y = this.rowY(i - exploded.length);
    });
    this.symbols = [...exploded, ...survivors];
    const drops = this.symbols.map((s, r) =>
      Tweens.toAsync(
        s,
        { y: this.rowY(r) },
        { duration: 0.32, delay: 0.03 * (this.rows - r), ease: Ease.quadIn },
      ),
    );
    await Promise.all(drops);
    Sounds.playSoundAsync(SFX.REEL_STOP);
  }

  setDimmed(flag: boolean) {
    this.symbols.forEach((s) => s.setDimmed(flag));
  }

  resetSymbols() {
    this.symbols.forEach((s) => s.reset());
  }

  stopAllTweens() {
    Tweens.killTweensOf(this, false);
    Tweens.killTweensOf(this.symbolLayer, false);
    this.symbols.forEach((s) => {
      Tweens.killTweensOf(s, false);
      s.reset();
      s.y = this.rowY(this.symbols.indexOf(s));
    });
    this.symbolLayer.y = 0;
  }

  destroy(options?: Parameters<Container["destroy"]>[0]) {
    Ticker.shared.remove(this.tick);
    super.destroy(options);
  }
}
