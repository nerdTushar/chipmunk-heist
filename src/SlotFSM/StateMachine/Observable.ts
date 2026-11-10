export default class Observable {

  
  // constructor() {
  //   return new Proxy(this, {
  //     set: (target, property, value) => {
  //       if (property in target) {
  //         target[property] = value;
  //         this.notifyObservers({ property, value });
  //         return true;
  //       }
  //       return false;
  //     },
  //   });
  // }

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

  notifyObservers(data: any) {
    this.observers.forEach((observer) => observer(data));
  }
}