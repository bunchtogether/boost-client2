function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import EventEmitter from 'events';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../../index';
export default class EdgeEmitter extends EventEmitter {
  constructor(parent, child) {
    super();

    _defineProperty(this, "name", void 0);

    _defineProperty(this, "handleUpdate", value => {
      this.emit('value', value);
    });

    this.setParameters(parent, child);
  }

  setParameters(parent, child) {
    if (!parent || !child) {
      this.cleanup();
      return;
    }

    const name = `e/${parent}/${child}`;

    if (this.name !== name) {
      this.cleanup();
    }

    cachedSubscribe(name, this.handleUpdate);
    this.name = name;
  }

  get value() {
    if (!this.name) {
      return undefined;
    }

    return cachedValue(this.name);
  }

  cleanup() {
    this.emit('cleanup');

    if (!this.name) {
      return;
    }

    cachedUnsubscribe(this.name, this.handleUpdate);
    delete this.name;
  }

}
//# sourceMappingURL=edge.js.map