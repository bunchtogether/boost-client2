//      

import EventEmitter from 'events';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../..';

export default class NodeEmitter extends EventEmitter {
                      

  constructor(id        ) {
    super();
    this.setParameters(id);
  }

  setParameters(id        ) {
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

  handleUpdate = (value    ) => {
    this.emit('value', value);
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
