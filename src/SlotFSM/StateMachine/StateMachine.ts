/**
 * 1. Manages all states of the machine
 * - Initializing of state machine
 * - provides methods to add and remove states and transitions
 * - Handles state changes
 */
import SMState from "./SMState";
import Observable from "./Observable";
import EventEmitter from "./EventEmitter";
import { GameEvents } from "./GameEvents";

export default abstract class StateMachine {
  public states: SMState[] = [];

  public initialState: SMState;

  public currentState: SMState;

  public gameState: Observable;

  public emitter: EventEmitter;

  public counter: number = 0;

  initSM(gameState: Observable, emitter: EventEmitter, state: SMState = null) {
    this.gameState = gameState;
    this.emitter = emitter;
    this.counter = 0;
    if (state) {
      this.initialState = state;
    }

    if (this.states.indexOf(this.initialState) == -1) {
      // console.warn("Add the initial state", this.initialState);
      return;
    }

    //Doing it here instead of onLoad
    this.states.forEach((element) => {
      element.init(this);
    });
    this.changeState(this.initialState);
  }

  public isFirstState(state): boolean {
    return state == this.initialState && this.counter == 0;
  }

  changeState(state) {
    if (this.states.indexOf(state) == -1) {
      // console.warn("Add the state", state);
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

  addGameEventListener(callBack: Function, THIS) {
    Object.keys(GameEvents).forEach((key, i) => {
      this.emitter.on(key, callBack, THIS);
    });
  }

  removeGameEventListener(callBack: Function, THIS) {
    Object.keys(GameEvents).forEach((key, i) => {
      this.emitter.removeListener(key, callBack, THIS);
    });
  }
}