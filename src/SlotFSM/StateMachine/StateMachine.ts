/**
 * Manages all states of the machine
 * - Initializing of state machine
 * - provides methods to add and remove states and transitions
 * - Handles state changes
 *
 * Unlike the Cocos component, nothing ticks this automatically: the owner calls `update(dt)` from the
 * Pixi ticker (GameScreen does).
 */
import SMState from "./SMState";
import Observable from "./Observable";
import EventEmitter from "./EventEmitter";
import { GameEvents } from "./GameEvents";

export default class StateMachine {
  public states: SMState[] = [];
  public initialState: SMState;
  public currentState: SMState;
  public gameState: Observable;
  public emitter: EventEmitter;
  public counter: number = 0;
  private initialised = false;

  addState(state: SMState): this {
    if (this.states.indexOf(state) == -1) this.states.push(state);
    return this;
  }

  initSM(gameState: Observable, emitter: EventEmitter, state: SMState = null) {
    this.gameState = gameState;
    this.emitter = emitter;
    this.counter = 0;
    if (state) this.initialState = state;

    if (this.states.indexOf(this.initialState) == -1) {
      console.warn(
        "[StateMachine] initial state is not registered",
        this.initialState,
      );
      return;
    }

    if (!this.initialised) {
      this.states.forEach((element) => element.init(this));
      this.initialised = true;
    }
    this.changeState(this.initialState);
  }

  public isFirstState(state: SMState): boolean {
    return state == this.initialState && this.counter == 0;
  }

  changeState(state: SMState) {
    if (this.states.indexOf(state) == -1) {
      console.warn("[StateMachine] unknown state", state);
      return;
    }

    if (this.currentState) {
      this.currentState.exitState();
      this.counter++;
      this.emitter.emit(GameEvents.STATE_EXIT, this.currentState.name);
    }

    this.currentState = state;
    this.currentState.enterState();
    this.emitter.emit(GameEvents.STATE_ENTER, this.currentState.name);
  }

  addGameEventListener(callBack: Function, host: any) {
    Object.keys(GameEvents).forEach((key) =>
      this.emitter.on(key, callBack, host),
    );
  }

  removeGameEventListener(callBack: Function, host: any) {
    Object.keys(GameEvents).forEach((key) =>
      this.emitter.removeListener(key, callBack, host),
    );
  }

  /** dt in seconds. */
  update(dt: number) {
    if (this.currentState?.enabled) this.currentState.update(dt);
  }
}
