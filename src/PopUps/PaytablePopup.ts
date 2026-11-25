import { Container, Graphics, Sprite, Text } from "pixi.js";
import PopUpBase from "../utils/PopUps/PopUpBase";
import {
  Button,
  COLORS,
  makeText,
  makeTitle,
  roundedPanel,
} from "../UI/Widgets";
import { money } from "../UI/Format";
import { tex, hasTex } from "../UI/Textures";
import {
  anteBetAmount,
  FeaturesHeadingAndDesc,
  GAME,
  MAX_WIN_MULTIPLIER,
  PAYTABLE,
  PopUps,
  PopUpType,
  SFX,
  Sounds,
} from "../Data/GameConstants";

const PANEL_W = 1300;
const PANEL_H = 860;

/** Port of Royal Tower PaytablePopup: paged symbol pays (scaled by the current bet) and rules. */
export default class PaytablePopup extends PopUpBase {
  private pages: Container[] = [];
  private pageIndex = 0;
  private pageLabel: Text;
  private payLabels: { pays: [number, number, number]; text: Text }[] = [];

  private body = new Container();

  protected build(): void {
    this.content.addChild(this.body);
    const panel = roundedPanel(PANEL_W, PANEL_H);
    const title = makeTitle("PAYTABLE", 70);
    title.y = -PANEL_H / 2 + 60;
    const close = new Button("✕", {
      circle: true,
      width: 70,
      color: COLORS.panelLight,
      textColor: COLORS.white,
      fontSize: 30,
    });
    close.position.set(PANEL_W / 2 - 50, -PANEL_H / 2 + 50);
    close.onClick(() => this.closeClick());
    const prev = new Button("◀", { circle: true, width: 80, fontSize: 36 });
    prev.position.set(-160, PANEL_H / 2 - 60);
    prev.onClick(() => this.goTo(this.pageIndex - 1));
    const next = new Button("▶", { circle: true, width: 80, fontSize: 36 });
    next.position.set(160, PANEL_H / 2 - 60);
    next.onClick(() => this.goTo(this.pageIndex + 1));
    this.pageLabel = makeText("", { fontSize: 28 });
    this.pageLabel.y = PANEL_H / 2 - 60;
    this.body.addChild(panel, title, close, prev, next, this.pageLabel);

    this.pages.push(this.buildSymbolsPage(PAYTABLE.slice(0, 8)));
    this.pages.push(this.buildSymbolsPage(PAYTABLE.slice(8)));
    this.pages.push(this.buildRulesPage());
    this.pages.forEach((p) => this.body.addChild(p));
  }

  private buildSymbolsPage(entries: typeof PAYTABLE) {
    const page = new Container();
    const cols = 4;
    const cellW = 290;
    const cellH = 300;
    const rows = Math.ceil(entries.length / cols);
    entries.forEach((entry, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const cell = new Container();
      cell.position.set(
        (c - (cols - 1) / 2) * cellW,
        (r - (rows - 1) / 2) * cellH + 10,
      );
      const bg = new Graphics()
        .roundRect(-130, -135, 260, 270, 18)
        .fill({ color: 0x000000, alpha: 0.3 });
      cell.addChild(bg);
      if (hasTex(entry.frame)) {
        const s = new Sprite(tex(entry.frame));
        s.anchor.set(0.5);
        s.scale.set(Math.min(130 / s.texture.width, 130 / s.texture.height));
        s.y = -55;
        cell.addChild(s);
      }
      const name = makeText(entry.name, {
        fontSize: 20,
        fill: COLORS.gold,
        wordWrap: true,
        wordWrapWidth: 240,
      });
      name.y = 30;
      const pays = makeText("", { fontSize: 22, lineHeight: 28 });
      pays.y = 92;
      this.payLabels.push({ pays: entry.pays, text: pays });
      cell.addChild(name, pays);
      page.addChild(cell);
    });
    return page;
  }

  private buildRulesPage() {
    const page = new Container();
    const features = Object.values(FeaturesHeadingAndDesc)
      .map((f: any) => `${f.heading}: ${f.desc} ${f.info}`)
      .join("\n\n");
    const text = [
      "HOW TO PLAY",
      "",
      "Matching symbols pay left to right on adjacent reels. Winning symbols tumble away and new ones fall in.",
      `Scatters trigger Free Spins. During Free Spins, multipliers add up and apply to the tumble win.`,
      `Ante Bet costs ${anteBetAmount}x the bet per spin.`,
      `Maximum win is ${MAX_WIN_MULTIPLIER}x the bet.`,
      "",
      features,
      "",
      "Malfunction voids all pays and plays.",
    ].join("\n");
    const label = makeText(text, {
      fontSize: 26,
      wordWrap: true,
      wordWrapWidth: PANEL_W - 160,
      lineHeight: 34,
      align: "left",
    });
    label.anchor.set(0.5);
    page.addChild(label);
    return page;
  }

  layout(isPortrait: boolean): void {
    super.layout(isPortrait);
    this.body.scale.set(isPortrait ? 0.8 : 1);
  }

  protected onShow(): void {
    super.onShow();
    GAME.isUILocked = false;
    this.payLabels.forEach(({ pays, text }) => {
      text.text = [5, 4, 3]
        .map((n, i) => `${n}  ${money(pays[2 - i] * GAME.bet)}`)
        .join("\n");
    });
    this.goTo(0);
  }

  private goTo(index: number) {
    const n = this.pages.length;
    this.pageIndex = (index + n) % n;
    this.pages.forEach((p, i) => (p.visible = i === this.pageIndex));
    this.pageLabel.text = `${this.pageIndex + 1} / ${n}`;
    if (index !== 0) Sounds.playSoundAsync(SFX.COMMON_BUTTON);
  }

  closeClick() {
    Sounds.playSoundAsync(SFX.COMMON_BUTTON);
    PopUps.hide(PopUpType.PaytablePopup);
  }

  protected onHide(): void {
    super.onHide();
    GAME.isUILocked = false;
  }
}
