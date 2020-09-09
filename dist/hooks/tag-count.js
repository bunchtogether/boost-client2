//      

import { pick, isEmpty } from 'lodash';
import queryString from 'query-string';
import { useState, useEffect } from 'react';
import { cachedSubscribe, cachedUnsubscribe } from '../..';

const parameterNames = [
  'type',
  'name',
  'hasParent',
];

export default (id        , parameters         ) => {
  const [value, setValue] = useState();
  useEffect(() => {
    if (!id) {
      return;
    }
    const options = pick(parameters, parameterNames);
    if (options.type && typeof options.type === 'string') {
      options.type = options.type.split(',');
    }
    const name = isEmpty(options) ? `tags/${id}/count` : `tags/${id}/count?${queryString.stringify(options)}`;
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
