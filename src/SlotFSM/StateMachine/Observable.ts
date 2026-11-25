export type PropertyChange = { property: string; value: any };

export default class Observable {
  private observers: Function[] = [];

  addObserver(observer: Function) {
    this.observers.push(observer);
  }

  removeObserver(observer: Function) {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  notifyObservers(data: PropertyChange) {
    this.observers.slice().forEach((observer) => observer(data));
  }
}
