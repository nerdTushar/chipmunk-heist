import EventEmitter from "./EventEmitter";
import Observable from "./Observable";
import StateMachine from "./StateMachine";
import Transition from "./Transition";

export default class SMState {
    protected machine: StateMachine;
    public stateTime: number = 0;
    public gameState: Observable;
    public emitter: EventEmitter;

    transtions: Transition[] = [];

    init(machine: StateMachine) {
        this.machine = machine;
        this.emitter = this.machine.emitter;
        this.enabled = false; //All States are disabled by default

        //Observing all gamestate properties (UI and GameData related)
        if (this.machine.gameState) {
            this.gameState = this.machine.gameState;
            this.gameState.addObserver(this.onPropertyChanged.bind(this));
        }

        //Doing it here instead of onLoad
        this.transtions.forEach((element) => {
            element.init(this);
        });
    }



    protected onGameEvent(gameEvent: string, data: any) {
        if (!this.enabled) return;
        switch (gameEvent) {
            default:
                // Handle change to property
                // console.warn("You need to handle game events!!", this);
                break;
        }
    }

    protected onPropertyChanged(change: { property: string; value: any }) {
        if (!this.enabled) return;
        switch (change.property) {
            default:
                // Handle change to property
                // console.warn("You need to handle property change events!!", this);
                break;
        }
    }

    enterState() {
        this.stateTime = 0;
        this.enabled = true;
        this.machine.addGameEventListener(this.onGameEvent, this);
        this.enableTransitions();
        console.log('%c enter ' + this.name, 'color: green; font-weight: bold;');
    }

    enableTransitions(flag: boolean = false) {
        this.transtions.forEach((element) => {
            element.setEnabled(flag);
        });
    }

    exitState() {
        this.stateTime = 0;
        this.enabled = false;
        this.machine.removeGameEventListener(this.onGameEvent, this);
        this.enableTransitions();
        console.log('%c exit ' + this.name, 'color: red; font-weight: bold;');
    }

    triggerTransition(s: SMState) {
        if (!this.enabled) return;
        this.machine.changeState(s);
    }

    update(dt: number) {
        this.stateTime += dt;
    }
}