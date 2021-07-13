// @flow

import { pick, isEmpty } from 'lodash';
import queryString from 'query-string';
import { useState, useEffect, useRef } from 'react';
import { List } from 'immutable';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../index';

const parameterNames = [
  'limit',
  'offset',
  'filterNamed',
  'query',
];

const parse = (v:any) => {
  if (List.isList(v)) {
    return v.toJS();
  }
  return undefined;
};

const getName = (teamId:string, ids:string | Array<string>, parameters?:Object = {}) => {
  const nodeIds = Array.isArray(ids) ? ids.join('/') : ids;
  const options = pick(parameters, parameterNames);
  return isEmpty(options) ? `notifications/${teamId}/${nodeIds}` : `notifications/${teamId}/${nodeIds}?${queryString.stringify(options)}`;
};

export default (teamId:string, ids:string | Array<string>, parameters?:Object) => {
  const [value, setValue] = useState(typeof ids === 'string' || (Array.isArray(ids) && ids.length > 0) ? parse(cachedValue(getName(teamId, ids, parameters))) : undefined);
  const initialCallbackRef = useRef(typeof value !== 'undefined' || !(typeof ids === 'string' || (Array.isArray(ids) && ids.length > 0)));

  useEffect(() => {
    const skipInitialCallback = initialCallbackRef.current;
    initialCallbackRef.current = false;
    if (!(typeof ids === 'string' || (Array.isArray(ids) && ids.length > 0))) {
      if (!skipInitialCallback) {
        setValue(undefined);
      }
      return;
    }
    const name = getName(teamId, ids, parameters);
    const handleValue = (v:any) => {
      setValue(parse(v));
    };
    cachedSubscribe(name, handleValue, undefined, skipInitialCallback);
    return () => { // eslint-disable-line consistent-return
      cachedUnsubscribe(name, handleValue);
    };
  }, [teamId, JSON.stringify(ids), JSON.stringify(parameters)]);

  return value;
};
