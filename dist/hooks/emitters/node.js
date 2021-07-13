function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import EventEmitter from 'events';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../../index';
export default class NodeEmitter extends EventEmitter {
  constructor(id) {
    super();

    _defineProperty(this, "name", void 0);

    _defineProperty(this, "handleUpdate", value => {
      this.emit('value', value);
    });

    this.setParameters(id);
  }

  setParameters(id) {
    if (!id) {
      this.cleanup();
      return;
    }

    const name = `n/${id}`;

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
//# sourceMappingURL=node.js.map