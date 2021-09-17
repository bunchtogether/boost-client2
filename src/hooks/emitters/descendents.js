// @flow

import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';
import queryString from 'query-string';
import EventEmitter from 'events';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../../index';

const parameterNames = [
  'depth',
  'sort',
  'order',
  'limit',
  'offset',
  'filter',
  'edgeContains',
  'hasChild',
  'hasParent',
  'type',
  'typesInTree',
  'query',
  'includeInactive',
];

export default class DescendentEmitter extends EventEmitter {
  name: string | void;

  constructor(id?:string, parameters?: Object = {}) {
    super();
    this.setParameters(id, parameters);
  }

  setParameters(id?:string, parameters?: Object = {}) {
    if (!id) {
      this.cleanup();
      return;
    }
    const options = pick(parameters, [...parameterNames]);
    if (options.type && typeof options.type === 'string') {
      options.type = options.type.split(',');
    }
    const name = isEmpty(options) ? `n/${id}/descendents` : `n/${id}/descendents?${queryString.stringify(options)}`;
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
