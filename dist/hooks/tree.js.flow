// @flow

import { pick, isEmpty } from 'lodash';
import queryString from 'query-string';
import { useState, useEffect, useRef } from 'react';
import { List } from 'immutable';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../..';

const parameterNames = [
  'depth',
  'sort',
  'order',
  'limit',
  'offset',
  'edgeContains',
  'filter',
  'type',
  'typesInTree',
  'typesInTreeWithDepth',
  'query',
  'includeInactive',
];

const parse = (v:any) => {
  if (List.isList(v)) {
    return v.toJS();
  }
  return undefined;
};

const getName = (id:string, parameters?:Object = {}) => {
  const options = pick(parameters, parameterNames);
  if (options.type && typeof options.type === 'string') {
    options.type = options.type.split(',');
  }
  if (parameters && parameters.types) {
    if (!options.typesInTreeWithDepth) {
      options.typesInTreeWithDepth = JSON.parse(parameters.types);
    }
    console.warn('Deprecated in hooks/tree: "types" is deprecated please use "typesInTreeWithDepth"');
  }
  return isEmpty(options) ? `n/${id}/tree` : `n/${id}/tree?${queryString.stringify(options)}`;
};

export default (id?: string, parameters?:Object) => {
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
    const handleValue = (v:any) => {
      setValue(parse(v));
    };
    cachedSubscribe(name, handleValue, undefined, skipInitialCallback);
    return () => { // eslint-disable-line consistent-return
      cachedUnsubscribe(name, handleValue);
    };
  }, [id, JSON.stringify(parameters)]);

  return value;
};
