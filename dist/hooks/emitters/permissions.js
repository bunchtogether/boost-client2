function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import EventEmitter from 'events';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../..';
export default class PermissionsEmitter extends EventEmitter {
  constructor(sourceId, targetId) {
    super();

    _defineProperty(this, "name", void 0);

    _defineProperty(this, "handleUpdate", value => {
      this.emit('value', value);
    });

    this.setParameters(sourceId, targetId);
  }

  setParameters(sourceId, targetId) {
    if (!sourceId || !targetId) {
      this.cleanup();
      return;
    }

    const name = `p/${sourceId}/${targetId}`;

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
//# sourceMappingURL=permissions.js.map