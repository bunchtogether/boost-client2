// @flow

import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';
import queryString from 'query-string';
import EventEmitter from 'events';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../../';

const parameterNames = [
  'sort',
  'order',
  'limit',
  'offset',
  'filter',
  'type',
  'query',
  'readPermission',
  'hasChild',
  'hasParent',
  'parentEdgeContains',
  'typesInTree',
];

export default class SourcePermissionEmitter extends EventEmitter {
  name: string | void;

  constructor(ids?:string | Array<string>, permission?: string, parameters?: Object = {}) {
    super();
    this.setParameters(ids, permission, parameters);
  }

  setParameters(ids?:string | Array<string>, permission?: string, parameters?: Object = {}) {
    if (!ids || !permission) {
      this.cleanup();
      return;
    }
    const parts = ['p'];
    if (typeof ids === 'string') {
      parts.push(ids);
    } else if (Array.isArray(ids)) {
      for (const id of ids) {
        parts.push(id);
      }
    }
    parts.push(permission);
    const options = pick(parameters, [...parameterNames]);
    const name = isEmpty(options) ? parts.join('/') : `${parts.join('/')}?${queryString.stringify(options)}`;
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
