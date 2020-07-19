//      

import { pick, isEmpty } from 'lodash';
import queryString from 'query-string';
import { useState, useEffect } from 'react';
import { List } from 'immutable';
import { cachedSubscribe, cachedUnsubscribe } from '../..';

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

export default (id         , parameters        ) => {
  const [value, setValue] = useState();
  useEffect(() => {
    if (!id) {
      return;
    }
    const options = pick(parameters, parameterNames);
    if (options.type && typeof options.type === 'string') {
      options.type = options.type.split(',');
    }
    const name = isEmpty(options) ? `n/${id}/descendents` : `n/${id}/descendents?${queryString.stringify(options)}`;
    const handleValue = (v    ) => {
      if (!List.isList(v)) {
        setValue(undefined);
      } else {
        setValue(v.toJS());
      }
    };
    cachedSubscribe(name, handleValue);
    return () => { // eslint-disable-line consistent-return
      cachedUnsubscribe(name, handleValue);
    };
  }, [id, JSON.stringify(parameters)]);

  return value;
};
