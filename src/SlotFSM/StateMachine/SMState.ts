import EventEmitter from "./EventEmitter";
import Observable, { PropertyChange } from "./Observable";
import StateMachine from "./StateMachine";
import Transition from "./Transition";

/**
 * Base state. Port of the Cocos `SMState` component: a state is disabled until the machine enters it,
 * its transitions stay disabled until the state calls `enableTransitions(true)` (normally from a
 * STATECHANGE queue task), and `update` only runs while the state is current.
 */
export default class SMState {
  public readonly name: string;
  protected machine: StateMachine;
  public stateTime: number = 0;
  public gameState: Observable;
  public emitter: EventEmitter;
  public enabled: boolean = false;

  transitions: Transition[] = [];

  private scheduled = new Set<ReturnType<typeof setTimeout>>();

  constructor(name: string) {
    this.name = name;
  }

  addTransition(transition: Transition): this {
    this.transitions.push(transition);
    return this;
  }

  init(machine: StateMachine) {
    this.machine = machine;
    this.emitter = this.machine.emitter;
    this.enabled = false; // All states are disabled by default

    // Observing all gamestate properties (UI and GameData related)
    if (this.machine.gameState) {
      this.gameState = this.machine.gameState;
      this.gameState.addObserver(this.onPropertyChanged.bind(this));
    }

    this.transitions.forEach((element) => element.init(this));
  }

  protected onGameEvent(_gameEvent: string, _data: any) {
    // Override in concrete states.
  }

  protected onPropertyChanged(_change: PropertyChange) {
    // Override in concrete states.
  }

  enterState() {
    this.stateTime = 0;
    this.enabled = true;
    this.machine.addGameEventListener(this.onGameEvent, this);
    this.enableTransitions();
    console.log("%c enter " + this.name, "color: green; font-weight: bold;");
  }

  enableTransitions(flag: boolean = false) {
    this.transitions.forEach((element) => element.setEnabled(flag));
  }

  exitState() {
    this.stateTime = 0;
    this.enabled = false;
    this.machine.removeGameEventListener(this.onGameEvent, this);
    this.enableTransitions();
    console.log("%c exit " + this.name, "color: red; font-weight: bold;");
  }

  triggerTransition(s: SMState) {
    if (!this.enabled) return;
    this.machine.changeState(s);
  }

  /** Cocos `scheduleOnce` equivalent; seconds. Cancelled by `unscheduleAllCallbacks`. */
  scheduleOnce(callback: () => void, delaySeconds: number = 0) {
    const handle = setTimeout(() => {
      this.scheduled.delete(handle);
      callback();
    }, delaySeconds * 1000);
    this.scheduled.add(handle);
  }

  unscheduleAllCallbacks() {
    this.scheduled.forEach((handle) => clearTimeout(handle));
    this.scheduled.clear();
  }

  /** dt in seconds. Called by the machine for the current state only. */
  update(dt: number) {
    this.stateTime += dt;
    this.transitions.forEach((t) => t.update(dt));
  }
}
