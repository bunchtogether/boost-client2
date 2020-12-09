//      

import { useState, useEffect } from 'react';
import { pick, isEmpty } from 'lodash';
import queryString from 'query-string';
import { List } from 'immutable';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../..';

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

const parse = (v    ) => {
  if (List.isList(v)) {
    return v.toJS();
  }
  return undefined;
};

const getName = (ids                       , permission        , parameters          = {}) => {
  const parts = ['p'];
  if (typeof ids === 'string') {
    parts.push(ids);
  } else if (Array.isArray(ids)) {
    for (const id of ids) {
      parts.push(id);
    }
  }
  parts.push(permission);
  const options = pick(parameters, parameterNames);
  return isEmpty(options) ? parts.join('/') : `${parts.join('/')}?${queryString.stringify(options)}`;
};

export default (ids                        , permission         , parameters         ) => {
  const [value, setValue] = useState(typeof permission === 'string' && (typeof ids === 'string' || (Array.isArray(ids) && ids.length > 0)) ? parse(cachedValue(getName(ids, permission, parameters))) : undefined);

  useEffect(() => {
    if (!(typeof ids === 'string' || Array.isArray(ids)) || (Array.isArray(ids) && ids.length === 0) || typeof permission !== 'string') {
      setValue(undefined);
      return;
    }

    const name = getName(ids, permission, parameters);

    const handleValue = (v    ) => {
      setValue(parse(v));
    };

    cachedSubscribe(name, handleValue);
    return () => { // eslint-disable-line consistent-return
      cachedUnsubscribe(name, handleValue);
    };
  }, [JSON.stringify(ids), permission, JSON.stringify(parameters)]);

  return value;
};
