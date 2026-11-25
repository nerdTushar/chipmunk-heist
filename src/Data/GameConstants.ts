/**
 * Central re-export hub (same role as Royal Tower's GameConstants).
 *
 * Gameplay modules import singletons from here (`GAME`, `REELM`, `GameView`, `BottomUI`, `QUEUE`...)
 * exactly like the Cocos project. ES module re-exports are live bindings, so the late-created
 * singletons (GameState / GameScreen / BottomUI) resolve once they exist.
 *
 * Rules that keep the import graph cycle-safe:
 *  - only use these bindings at runtime (inside functions), never at module top level;
 *  - import base classes you `extends` directly from their own module, not from here;
 *  - main.ts imports this module first.
 */
export { GameEvents } from "../SlotFSM/StateMachine/GameEvents";

export { Instance as Events } from "../SlotFSM/StateMachine/EventEmitter";

export {
  Instance as QUEUE,
  QUEUEACTIONEND,
  QUEUE_PRIORITY,
  TASK_TYPE,
} from "../utils/Queue";

export { Instance as Sounds, SFX } from "../utils/SoundManager";

export { Instance as PopUps, PopUpType } from "../utils/PopUps/PopUpManager";

export {
  Instance as Screens,
  ScreenEnum,
  ScreenState,
} from "../utils/Screens/ScreenManager";

export { Instance as GAME } from "./GameState";

export { Instance as GameView } from "../Screens/GameScreen";

export { Instance as REELM } from "../utils/ReelManager";

export { instance as BottomUI } from "../UI/BottomUI";

export { ScreenSwitchTransition } from "../utils/ScreenSwitchTransition";

export * from "./GameConfig";
