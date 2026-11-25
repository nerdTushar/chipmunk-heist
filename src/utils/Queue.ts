import { Instance as Events } from "../SlotFSM/StateMachine/EventEmitter";
import { Instance as GAME } from "../Data/GameState";

export enum TASK_TYPE {
  IMMEDIATELY,
  ACTION,
}

export interface Task {
  type?: TASK_TYPE;
  execute: () => void;
  skip?: () => void;
  priority: number;
  executionTime?: number;
  close?: () => void;
}

export const QUEUE_PRIORITY = {
  //high value is higher priority
  BONUS_REDEEM_CONTINUE: 105,
  SPIN: 102,
  STOP: 103,
  REEL_STOP: 101,
  ALL_STOP: 100,
  SCATTER_BEHAVIOUR: 65,
  PAYLINES: 56,
  WINNINGS: 55,
  SHOWLINES: 52,
  TOTAL_WIN_CALCULATION: 51,
  BIGWIN: 50,
  ANIMATE_SCATTER_SYMBOLS: 46,
  RANDOM_FREESPIN_GAME: 25,
  MINIGAME: 23,
  BONUS_REDEEM_END: 21,
  PICK_FREE_GAME: 20,
  SPIN_END_API: 19,
  FREESPINSTART: 18,
  TRANSITION: 16,
  MAXWIN: 19,
  FREESPINEND: 17,
  TOIDLE: 10, //keep it at low priority
  NUDGE: 9,
  RESPIN: 8, //respin should be lower than toidle. depends on idle state.
  RESPIN_STOP: 7,
  FREEADSANIMATION: 6,
  RESET: 2,
  STATECHANGE: 1,
};

export const QUEUEACTIONEND = "actioncomplete";

/**
 * Priority task queue that serialises the presentation of a spin result (paylines, big wins,
 * popups, transitions, state changes). A task stays "busy" until someone emits QUEUEACTIONEND.
 */
export default class Queue {
  private _elements: Task[] = [];
  private _busy: boolean = false;
  private _currentTask: Task = null;

  constructor() {
    this.setUpdate();
    Events.on(QUEUEACTIONEND, this.onTaskCompletion, this);
  }

  private setUpdate() {
    setInterval(() => {
      this.processQueueActions();
    }, 16.6); // Approximately 60 FPS
  }

  private peek(): Task {
    return !this.isEmpty() ? this._elements[0] : undefined;
  }

  private deQueue(): Task {
    const ele = this._elements.shift();
    if (ele.type !== TASK_TYPE.IMMEDIATELY) {
      this._busy = true;
      this._currentTask = ele;
      ele.type = TASK_TYPE.ACTION;
    }
    return ele;
  }

  private isEmpty(): boolean {
    return this._elements.length === 0;
  }

  private processQueueActions() {
    if (this.isEmpty()) return;

    // Execute Immediate Tasks
    this.executeImmediateTask();

    if (this.isEmpty() || this._busy) return;

    const task: Task = this.deQueue();
    if (task.execute) task.execute();
    if (GAME?.turboToggle) this.SkipTask();
    if (task.executionTime) this.scheduleActionEnd(task.executionTime);
  }

  private executeImmediateTask() {
    while (!this.isEmpty() && this.peek().type === TASK_TYPE.IMMEDIATELY) {
      const task = this.deQueue();
      if (task.execute) task.execute();
    }
  }

  private scheduleActionEnd(actionTime: number) {
    setTimeout(() => {
      Events.emit(QUEUEACTIONEND, this._currentTask?.priority);
    }, actionTime);
  }

  public clear(): void {
    this._elements = [];
    this._busy = false;
    this._currentTask = null;
  }

  public onTaskCompletion(_actionName?: string, _queuePriority?: number) {
    if (this._currentTask && typeof this._currentTask.close === "function") {
      this._currentTask.close();
    }

    this._busy = false;
    this._currentTask = null;
  }

  getEnumKeyByValue(enumObj: Record<string, number>, value: number) {
    return Object.keys(enumObj).find((key) => enumObj[key] === value);
  }

  public enQueue(item: Task): void {
    if (item.type === TASK_TYPE.IMMEDIATELY) item.priority = Number.MAX_VALUE;
    this._elements.push(item);
    this._elements.sort((a, b) => b.priority - a.priority);
  }

  public getIsEmpty() {
    return this.isEmpty();
  }

  public SkipTask(): void {
    if (this._currentTask && typeof this._currentTask.skip === "function") {
      this._currentTask.skip();
    }
  }
}

const Instance = new Queue();
export { Instance };
