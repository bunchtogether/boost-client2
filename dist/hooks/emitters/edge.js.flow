// @flow

import EventEmitter from 'events';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../..';

export default class EdgeEmitter extends EventEmitter {
  name: string | void;

  constructor(parent?:string, child?:string) {
    super();
    this.setParameters(parent, child);
  }

  setParameters(parent?:string, child?:string) {
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

  handleUpdate = (value:any) => {
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
