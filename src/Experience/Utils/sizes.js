import { EventEmitter } from './eventemitter.js';

class Sizes extends EventEmitter {
  constructor() {
    super();
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    window.addEventListener('resize', () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.emit('resize');
    });
  }
}

export default Sizes;
console.log('sizes');