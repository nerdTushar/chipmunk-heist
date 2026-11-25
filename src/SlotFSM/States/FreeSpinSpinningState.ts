import SpinningState from "./SpinningState";

/** Free spins reuse the spinning flow; the API step just advances to the next pre-split spin. */
export default class FreeSpinSpinningState extends SpinningState {
  constructor(name = "FreeSpinSpinningState") {
    super(name);
  }
}
