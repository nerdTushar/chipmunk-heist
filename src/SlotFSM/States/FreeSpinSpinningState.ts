import SpinningState from "./SpinningState";

/**
 * If no overriding is needed then just use SpinningState class on its node and delete this one.
 */
export class FreeSpinSpinningState extends SpinningState {
 async enterState(): Promise<void> {
    await super.enterState();
 }
}