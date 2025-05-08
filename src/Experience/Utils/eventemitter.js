export class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
  }

  emit(event, ...args) {
    if (this.events[event]) {
      for (const callback of this.events[event]) {
        callback(...args);
      }
    }
  }
}
