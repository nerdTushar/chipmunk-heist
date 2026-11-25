/**
 * Minimal host-aware event emitter (same contract as the Royal Tower one):
 * listeners receive `(eventName, ...args)` and run with `this` bound to the host they registered with.
 */
export default class EventEmitter {
  events: Record<string, Function[]> = {};
  hosts: Record<string, any[]> = {};

  on(event: string, listener: Function, host?: any) {
    if (typeof this.events[event] !== "object") {
      this.events[event] = [];
      this.hosts[event] = [];
    }
    this.events[event].push(listener);
    this.hosts[event].push(host);
  }

  removeListener(event: string, listener: Function, host?: any) {
    const listeners = this.events[event];
    const hosts = this.hosts[event];
    if (!listeners || !hosts) return;
    for (let i = listeners.length - 1; i >= 0; i--) {
      if (
        listeners[i] === listener &&
        (host === undefined || hosts[i] === host)
      ) {
        listeners.splice(i, 1);
        hosts.splice(i, 1);
        return;
      }
    }
  }

  /** Removes every listener registered by `host` (used when a view is destroyed). */
  removeHost(host: any) {
    Object.keys(this.events).forEach((event) => {
      for (let i = this.events[event].length - 1; i >= 0; i--) {
        if (this.hosts[event][i] === host) {
          this.events[event].splice(i, 1);
          this.hosts[event].splice(i, 1);
        }
      }
    });
  }

  emit(event: string, ...args: any[]) {
    const listeners = this.events[event];
    if (!listeners) return;
    const snapshot = listeners.slice();
    const hosts = this.hosts[event].slice();
    const callArgs = [event, ...args];
    for (let i = 0; i < snapshot.length; i++) {
      snapshot[i].apply(hosts[i] ?? this, callArgs);
    }
  }

  once(event: string, listener: Function, host?: any) {
    const wrapper = (...args: any[]) => {
      this.removeListener(event, wrapper, host);
      listener.apply(host ?? this, args);
    };
    this.on(event, wrapper, host);
  }
}

const Instance = new EventEmitter();

export { Instance };
