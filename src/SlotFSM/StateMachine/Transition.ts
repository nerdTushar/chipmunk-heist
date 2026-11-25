import SMState from "./SMState";
import Observable, { PropertyChange } from "./Observable";
import EventEmitter from "./EventEmitter";
import { GameEvents } from "./GameEvents";

export interface TransitionConfig {
  name: string;
  /** Target state. */
  next: SMState;
  /** Seconds in the current state after which the transition fires; -1 disables it. */
  timeToChange?: number;
  /** GameState properties compared as strings with `watchValues` at the same index. */
  watchProperties?: string[];
  watchValues?: string[];
  /** GameEvents compared as `data?.toString()` with `eventsValues` at the same index. */
  events?: string[];
  eventsValues?: string[];
}

/**
 * Port of the Cocos `Transition` component. In the scene each transition was a node whose inspector
 * fields held these values; here they come from `TransitionConfig` (see SlotFSM/SlotMachine.ts).
 */
export default class Transition {
  readonly name: string;
  currentState: SMState;
  nextState: SMState;
  timeToChange: number = -1;
  watchProperties: string[] = [];
  watchValues: string[] = [];
  events: string[] = [];
  eventsValues: string[] = [];
  enabled = false;

  public gameState: Observable;
  public emitter: EventEmitter;
  private listening = false;

  constructor(config: TransitionConfig) {
    this.name = config.name;
    this.nextState = config.next;
    this.timeToChange = config.timeToChange ?? -1;
    this.watchProperties = config.watchProperties ?? [];
    this.watchValues = config.watchValues ?? [];
    this.events = config.events ?? [];
    this.eventsValues = config.eventsValues ?? [];
  }

  init(s1: SMState) {
    this.enabled = false; // All transitions are disabled by default
    this.currentState = s1;

    if (this.currentState.gameState) {
      this.gameState = this.currentState.gameState;
      this.gameState.addObserver(this.onPropertyChanged.bind(this));
    }
    this.emitter = this.currentState.emitter;
  }

  public handleEvents(flag: boolean) {
    if (flag === this.listening) return;
    this.listening = flag;
    Object.keys(GameEvents).forEach((key) => {
      if (flag) this.emitter.on(key, this.onGameEvent, this);
      else this.emitter.removeListener(key, this.onGameEvent, this);
    });
  }

  public setEnabled(flag: boolean): void {
    this.enabled = flag;
    this.handleEvents(flag);
    if (flag) {
      this.watchProperties.forEach((element, i) =>
        this.enableWatchProperties(element, i),
      );
    }
  }

  protected onGameEvent(eventName: string, data: any) {
    if (!this.enabled) return;
    const idx = this.events.indexOf(eventName);
    if (idx != -1 && data?.toString() == this.eventsValues[idx]) {
      this.triggerTransition();
    }
  }

  protected onPropertyChanged(change: PropertyChange) {
    if (!this.enabled) return;
    const idx = this.watchProperties.indexOf(change.property);
    if (idx == -1) return;
    this.enableWatchProperties(change.property, idx);
  }

  protected enableWatchProperties(property: string, idx: number) {
    if (!this.enabled) return;
    const value = this.gameState?.[property];
    if (value == undefined) return;
    if (value.toString() == this.watchValues[idx]) {
      this.triggerTransition();
    }
  }

  triggerTransition() {
    if (!this.enabled) return;
    this.currentState.triggerTransition(this.nextState);
  }

  update(_dt: number) {
    if (!this.currentState || !this.enabled) return;
    if (
      this.timeToChange > 0 &&
      this.currentState.stateTime >= this.timeToChange
    ) {
      this.triggerTransition();
    }
  }
}
