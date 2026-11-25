import { Application, Container } from "pixi.js";
import { Instance as Events } from "../SlotFSM/StateMachine/EventEmitter";

export const DESIGN_LANDSCAPE = { width: 1920, height: 1080 };
export const DESIGN_PORTRAIT = { width: 1080, height: 1920 };

/** Emitted on `Events` with `(isPortrait: boolean)` whenever the viewport changes. */
export const RESIZE_EVENT = "APP_RESIZE";

/**
 * Owns the Pixi Application and the layer stack (the Cocos scene root equivalent):
 * screens → popups → transition overlay. Everything is authored in design space
 * (1920×1080 landscape / 1080×1920 portrait) and the root is scaled to fit.
 */
class GameAppClass {
  app: Application;
  /** Scaled design-space root. */
  root = new Container();
  screenLayer = new Container();
  popupLayer = new Container();
  overlayLayer = new Container();
  isPortrait = false;
  scale = 1;

  async init(parent: HTMLElement) {
    this.app = new Application();
    await this.app.init({
      background: "#0b0a14",
      resizeTo: window,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    parent.appendChild(this.app.canvas);
    this.root.label = "root";
    this.screenLayer.label = "screens";
    this.popupLayer.label = "popups";
    this.overlayLayer.label = "overlay";
    this.root.addChild(this.screenLayer, this.popupLayer, this.overlayLayer);
    this.app.stage.addChild(this.root);
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("orientationchange", () =>
      setTimeout(() => this.resize(), 100),
    );
    this.resize();
  }

  get design() {
    return this.isPortrait ? DESIGN_PORTRAIT : DESIGN_LANDSCAPE;
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const portrait = h > w;
    const design = portrait ? DESIGN_PORTRAIT : DESIGN_LANDSCAPE;
    this.scale = Math.min(w / design.width, h / design.height);
    this.root.scale.set(this.scale);
    this.root.position.set(
      (w - design.width * this.scale) / 2,
      (h - design.height * this.scale) / 2,
    );
    const changed = portrait !== this.isPortrait;
    this.isPortrait = portrait;
    Events.emit(RESIZE_EVENT, portrait, changed);
  }

  /** Visible area in design space, including letterbox margins (used by full-bleed backgrounds). */
  get visibleBounds() {
    const design = this.design;
    const w = window.innerWidth / this.scale;
    const h = window.innerHeight / this.scale;
    return {
      x: (design.width - w) / 2,
      y: (design.height - h) / 2,
      width: w,
      height: h,
    };
  }
}

export const GameApp = new GameAppClass();
