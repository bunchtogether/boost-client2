function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';
import queryString from 'query-string';
import EventEmitter from 'events';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../../index';
const parameterNames = ['depth', 'sort', 'order', 'limit', 'offset', 'edgeContains', 'filter', 'type', 'typesInTree', 'query', 'includeInactive'];
export default class TreeEmitter extends EventEmitter {
  constructor(id, parameters = {}) {
    super();

    _defineProperty(this, "name", void 0);

    _defineProperty(this, "handleUpdate", value => {
      this.emit('value', value);
    });

    this.setParameters(id, parameters);
  }

  setParameters(id, parameters = {}) {
    if (!id) {
      this.cleanup();
      return;
    }

    const options = pick(parameters, parameterNames);

    if (options.type && typeof options.type === 'string') {
      options.type = options.type.split(',');
    }

    const name = isEmpty(options) ? `n/${id}/tree` : `n/${id}/tree?${queryString.stringify(options)}`;

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
//# sourceMappingURL=tree.js.map