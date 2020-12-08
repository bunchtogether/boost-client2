//      

import { useState, useEffect } from 'react';
import { pick, isEmpty } from 'lodash';
import queryString from 'query-string';
import { List } from 'immutable';
import { cachedSubscribe, cachedUnsubscribe } from '../..';

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

export default (ids                        , permission         , parameters         ) => {
  const [value, setValue] = useState();

  useEffect(() => {
    if (!ids) {
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
    const parseValue = (v    ) => {
      if (!List.isList(v)) {
        return undefined;
      }
      return v.toJS();
    };

    const handleValue = (v    ) => {
      setValue(parseValue(v));
    };

    cachedSubscribe(name, handleValue);
    return () => { // eslint-disable-line consistent-return
      cachedUnsubscribe(name, handleValue);
    };
  }, [JSON.stringify(ids), permission, JSON.stringify(parameters)]);

  return value;
};
