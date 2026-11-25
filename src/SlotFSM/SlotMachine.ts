import StateMachine from "./StateMachine/StateMachine";
import Transition from "./StateMachine/Transition";
import { GameEvents } from "./StateMachine/GameEvents";
import IdleState from "./States/IdleState";
import SpinningState from "./States/SpinningState";
import SpinEndState from "./States/SpinEndState";
import RespinSpinningState from "./States/RespinSpinningState";
import FreeSpinIdleState from "./States/FreeSpinIdleState";
import FreeSpinSpinningState from "./States/FreeSpinSpinningState";
import FreeSpinEndState from "./States/FreeSpinEndState";

/**
 * Builds the slot FSM. In Royal Tower the states/transitions were nodes in the GameScreen scene;
 * this is the same graph with the inspector values written out.
 *
 *   Idle ──spin──▶ Spinning ──ON_SPIN_STOP──▶ SpinEnd ──▶ Idle | FreeSpinIdle | Respin
 *   Respin ──▶ SpinEnd | FreeSpinEnd
 *   FreeSpinIdle ──0.5s──▶ FreeSpinSpinning ──ON_SPIN_STOP──▶ FreeSpinEnd ──▶ FreeSpinIdle | Idle | Respin
 */
export function createSlotMachine() {
  const idle = new IdleState();
  const spinning = new SpinningState();
  const spinEnd = new SpinEndState();
  const respin = new RespinSpinningState();
  const freeSpinIdle = new FreeSpinIdleState();
  const freeSpinSpinning = new FreeSpinSpinningState();
  const freeSpinEnd = new FreeSpinEndState();

  idle.addTransition(
    new Transition({
      name: "Idle2Spin",
      next: spinning,
      timeToChange: -1,
      watchProperties: ["autoToggle", "isSpaceHold", "shouldReplay"],
      watchValues: ["true", "true", "true"],
      events: [GameEvents.ON_SPIN_START],
      eventsValues: ["true"],
    }),
  );

  spinning.addTransition(
    new Transition({
      name: "Spin2SpinEnd",
      next: spinEnd,
      timeToChange: 0.5,
      events: [GameEvents.ON_SPIN_STOP],
      eventsValues: ["true"],
    }),
  );

  spinEnd
    .addTransition(
      new Transition({
        name: "SpinEnd2FIdle",
        next: freeSpinIdle,
        watchProperties: ["freeSpinsEnabled"],
        watchValues: ["true"],
      }),
    )
    .addTransition(
      new Transition({ name: "SpinEnd2Idle", next: idle, timeToChange: 0.5 }),
    )
    .addTransition(
      new Transition({
        name: "SpinEnd2Respin",
        next: respin,
        events: [GameEvents.ON_RESPIN_START],
        eventsValues: ["true"],
      }),
    );

  freeSpinIdle.addTransition(
    new Transition({
      name: "FIdle2FSpin",
      next: freeSpinSpinning,
      timeToChange: 0.5,
    }),
  );

  freeSpinSpinning.addTransition(
    new Transition({
      name: "FSpin2FSpinEnd",
      next: freeSpinEnd,
      timeToChange: 1,
      events: [GameEvents.ON_SPIN_STOP],
      eventsValues: ["true"],
    }),
  );

  freeSpinEnd
    .addTransition(
      new Transition({
        name: "FSpinEnd2Idle",
        next: idle,
        watchProperties: ["freeSpinsEnabled"],
        watchValues: ["false"],
      }),
    )
    .addTransition(
      new Transition({
        name: "FSpinEnd2FIdle",
        next: freeSpinIdle,
        timeToChange: 0.5,
      }),
    )
    .addTransition(
      new Transition({
        name: "FreeSpinEnd2Respin",
        next: respin,
        events: [GameEvents.ON_RESPIN_FREESPIN_START],
        eventsValues: ["true"],
      }),
    );

  respin
    .addTransition(
      new Transition({
        name: "Respin2SpinEnd",
        next: spinEnd,
        events: [GameEvents.ON_RESPIN_END],
        eventsValues: ["true"],
      }),
    )
    .addTransition(
      new Transition({
        name: "Respin2FreeSpinEnd",
        next: freeSpinEnd,
        events: [GameEvents.ON_RESPIN_FREESPIN_END],
        eventsValues: ["true"],
      }),
    );

  const machine = new StateMachine();
  [
    idle,
    spinning,
    spinEnd,
    respin,
    freeSpinIdle,
    freeSpinSpinning,
    freeSpinEnd,
  ].forEach((s) => machine.addState(s));

  return {
    machine,
    states: {
      idle,
      spinning,
      spinEnd,
      respin,
      freeSpinIdle,
      freeSpinSpinning,
      freeSpinEnd,
    },
    /** Same order as Royal Tower `initialStates`: [Idle, SpinEnd] picked by getInitialState(). */
    initialStates: [idle, spinEnd],
  };
}
