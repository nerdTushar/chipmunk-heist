import SMState from "./SMState";
import Observable from "./Observable";
import EventEmitter from "./EventEmitter";
import { GameEvents } from "./GameEvents";

export default abstract class Transition {
  currentState: SMState;

  nextState: SMState;

  nextStateNode: Node;

  timeToChange: number = -1;

  watchProperties: string[] = [];

  watchValues: string[] = [];

  events: string[] = [];
 
  eventsValues: string[] = [];

  public gameState: Observable;
  public emitter: EventEmitter;

  init(s1) {
    this.enabled = false; //All Transitions are disabled by default
    this.currentState = s1;
    this.nextState = this.nextStateNode.getComponent("SMState") as SMState;

    //Observing all gamestate properties (UI and GameData related)
    if (this.currentState.gameState) {
      this.gameState = this.currentState.gameState;
      this.gameState.addObserver(this.onPropertyChanged.bind(this));
    }

    this.emitter = this.currentState.emitter;
    //EXP: EXPERIMENTAL
  }

  public handleEvents(flag: boolean) {
    Object.keys(GameEvents).forEach((key, i) => {
      if (flag) {
        this.emitter.on(key, this.onGameEvent, this);
      } else {
        this.emitter.removeListener(key, this.onGameEvent, this);
      }
    });
  }

  public setEnabled(flag: boolean): void {
    this.enabled = flag;
    this.handleEvents(flag);
    if (flag)
      this.watchProperties.forEach((element, i) => {
        this.enableWatchProperties(element, i);
      });
  }

  protected onGameEvent(eventName: string, data: any) {
    // debugger;
    if (!this.enabled) return;
    let idx = this.events.indexOf(eventName);
    if (idx != -1 && data?.toString() == this.eventsValues[idx]) {
      this.triggerTransition();
    }
  }

  protected onPropertyChanged(change: { property: string; value: any }) {
    if (!this.enabled) return;
    let idx = this.watchProperties.indexOf(change.property);
    this.enableWatchProperties(change.property, idx);
  }

  protected enableWatchProperties(property: string, idx: number) {
    if(this.gameState[property]==undefined)return
    if (this.gameState[property].toString() == this.watchValues[idx]) {
      this.triggerTransition();
    }
  }

  triggerTransition() {
    if (!this.enabled) return;
    this.currentState.triggerTransition(this.nextState);
  }

  update(dt) {
    //In builds it is undefined
    if (!this.currentState) return;
    if (!this.enabled) return;
    if (
      this.timeToChange > 0 &&
      this.currentState.stateTime >= this.timeToChange
    ) {
      this.triggerTransition();
    }
  }
}