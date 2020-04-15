//      

import EventEmitter from 'events';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../..';

export default class PermissionsEmitter extends EventEmitter {
                      

  constructor(sourceId        , targetId        ) {
    super();
    this.setParameters(sourceId, targetId);
  }

  setParameters(sourceId        , targetId        ) {
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
