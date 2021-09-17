import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';
import queryString from 'query-string';
import { useState, useEffect, useRef } from 'react';
import { List } from 'immutable';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../index';
const parameterNames = ['depth', 'sort', 'order', 'limit', 'offset', 'filter', 'edgeContains', 'hasChild', 'hasParent', 'type', 'typesInTree', 'query', 'includeInactive'];

const parse = v => {
  if (List.isList(v)) {
    return v.toJS();
  }

  return undefined;
};

const getName = (id, parameters = {}) => {
  const options = pick(parameters, parameterNames);

  if (options.type && typeof options.type === 'string') {
    options.type = options.type.split(',');
  }

  return isEmpty(options) ? `n/${id}/descendents` : `n/${id}/descendents?${queryString.stringify(options)}`;
};

export default ((id, parameters) => {
  const [value, setValue] = useState(typeof id === 'string' ? parse(cachedValue(getName(id, parameters))) : undefined);
  const initialCallbackRef = useRef(typeof value !== 'undefined' || typeof id !== 'string');
  useEffect(() => {
    const skipInitialCallback = initialCallbackRef.current;
    initialCallbackRef.current = false;

    if (typeof id !== 'string') {
      if (!skipInitialCallback) {
        setValue(undefined);
      }

      return;
    }

    const name = getName(id, parameters);

    const handleValue = v => {
      setValue(parse(v));
    };

    cachedSubscribe(name, handleValue, undefined, skipInitialCallback);
    return () => {
      // eslint-disable-line consistent-return
      cachedUnsubscribe(name, handleValue);
    };
  }, [id, JSON.stringify(parameters)]);
  return value;
});
//# sourceMappingURL=descendents.old.js.map