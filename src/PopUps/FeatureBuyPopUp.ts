import { Container, Sprite, Text } from "pixi.js";
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
  BuyFeatureCards,
  BuyFeatureId,
  BuyFeaturePrice,
  buyFreeSpinAmount,
  Events,
  FeaturesHeadingAndDesc,
  GAME,
  GameEvents,
  GameView,
  PopUps,
  PopUpType,
  SFX,
  Sounds,
} from "../Data/GameConstants";

interface Card {
  id: string;
  root: Container;
  price: Text;
  buy: Button;
}

/**
 * Port of Royal Tower FeatureBuyPopUp. Royal Tower sold a single free-spins feature; Chipmunk Heist
 * lists every BuyFeatureCards entry with its own price (BuyFeaturePrice × bet).
 */
export default class FeatureBuyPopUp extends PopUpBase {
  private cards: Card[] = [];
  private isClicked = false;

  private body = new Container();

  protected build(): void {
    this.content.addChild(this.body);
    const panel = roundedPanel(1500, 760);
    const title = makeTitle("BUY FEATURE", 72);
    title.y = -320;
    const close = new Button("✕", {
      circle: true,
      width: 70,
      color: COLORS.panelLight,
      textColor: COLORS.white,
      fontSize: 30,
    });
    close.position.set(700, -340);
    close.onClick(() => this.onclose());
    this.body.addChild(panel, title, close);

    const n = BuyFeatureCards.length;
    const spacing = 350;
    BuyFeatureCards.forEach((card, i) => {
      const root = new Container();
      root.position.set((i - (n - 1) / 2) * spacing, 30);
      const face = hasTex("card-face.png")
        ? new Sprite(tex("card-face.png"))
        : null;
      if (face) {
        face.anchor.set(0.5);
        face.width = 320;
        face.height = 560;
        root.addChild(face);
      } else {
        root.addChild(roundedPanel(320, 560, COLORS.panelLight));
      }
      if (hasTex(card.art)) {
        const art = new Sprite(tex(card.art));
        art.anchor.set(0.5);
        const s = Math.min(280 / art.texture.width, 260 / art.texture.height);
        art.scale.set(s);
        art.y = -110;
        root.addChild(art);
      }
      const heading = makeText(card.title, { fontSize: 34, fill: COLORS.gold });
      heading.y = 50;
      const info = (FeaturesHeadingAndDesc as any)[card.id];
      const desc = makeText(info?.desc ?? "", {
        fontSize: 20,
        wordWrap: true,
        wordWrapWidth: 270,
        lineHeight: 26,
      });
      desc.y = 115;
      const price = makeText("", { fontSize: 32 });
      price.y = 180;
      const buy = new Button("BUY", {
        width: 220,
        height: 70,
        fontSize: 32,
        color: COLORS.green,
        textColor: COLORS.white,
      });
      buy.y = 245;
      buy.onClick(() => this.onClickStart(card.id));
      root.addChild(heading, desc, price, buy);
      this.body.addChild(root);
      this.cards.push({ id: card.id, root, price, buy });
    });
  }

  layout(isPortrait: boolean): void {
    super.layout(isPortrait);
    this.body.scale.set(isPortrait ? 0.68 : 1);
  }

  private priceOf(id: string) {
    return GAME.bet * (BuyFeaturePrice[id] ?? buyFreeSpinAmount);
  }

  protected onShow(): void {
    super.onShow();
    GAME.featureBuyId = BuyFeatureId.none;
    GAME.isPersistentPopupsOpen = true;
    GAME.isUILocked = false;
    this.isClicked = false;
    const verb = GAME.Jurisdiction?.socialCasino ? "GET" : "BUY";
    this.cards.forEach((c) => {
      const cost = this.priceOf(c.id);
      c.price.text = money(cost);
      c.buy.setText(verb);
      c.buy.interactable =
        cost <= GAME.Player.Balance && !GAME.Jurisdiction?.disabledBuyFeature;
    });
  }

  onclose() {
    if (this.isClicked) return;
    this.isClicked = true;
    Sounds.playSoundAsync(SFX.BUY_CANCEL);
    PopUps.hideAllPopUps();
  }

  protected onHide(): void {
    super.onHide();
    GAME.isPersistentPopupsOpen = false;
    GAME.isUILocked = false;
  }

  onClickStart(id: string) {
    if (GAME.featureBought || this.isClicked) return;
    const cost = this.priceOf(id);
    if (cost > GAME.Player.Balance) {
      PopUps.show(PopUpType.InsufficientBalance);
      return;
    }
    this.isClicked = true;
    Sounds.playSoundAsync(SFX.BUY_CONFIRM);
    GAME.featureBought = true;
    GAME.featureId = id;
    GAME.featureBuyId = id;
    GameView.deductFeatureBuyAmt(cost);
    PopUps.hide(PopUpType.FeatureBuyPopUp, () => {
      PopUps.hideAllPopUps();
      Events.emit(GameEvents.ON_SPIN_START, true);
    });
  }
}
