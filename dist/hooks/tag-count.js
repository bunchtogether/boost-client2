//      

import { pick, isEmpty } from 'lodash';
import queryString from 'query-string';
import { useState, useEffect } from 'react';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../..';

const parameterNames = [
  'type',
  'name',
  'hasParent',
];

const getName = (id       , parameters          = {}) => {
  const options = pick(parameters, parameterNames);
  if (options.type && typeof options.type === 'string') {
    options.type = options.type.split(',');
  }
  return isEmpty(options) ? `tags/${id}/count` : `tags/${id}/count?${queryString.stringify(options)}`;
};

export default (id         , parameters         ) => {
  const [value, setValue] = useState(typeof id === 'string' ? cachedValue(getName(id, parameters)) : undefined);
  useEffect(() => {
    if (typeof id !== 'string') {
      setValue(undefined);
      return;
    }
    const name = getName(id, parameters);
    const handleValue = (v) => {
      setValue(v);
    };
    cachedSubscribe(name, handleValue);
    return () => { // eslint-disable-line consistent-return
      cachedUnsubscribe(name, handleValue);
    };
  }, [id, JSON.stringify(parameters)]);

  return value;
};
