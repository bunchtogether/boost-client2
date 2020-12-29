// @flow

import { useState, useEffect, useRef } from 'react';
import { Map } from 'immutable';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../..';

const parse = (v:any, path:Array<string>) => {
  if (Map.isMap(v)) {
    return v.getIn(path);
  }
  return undefined;
};

const getName = (id:string) => `n/${id}`;

export default (id?: string, metadataPath:Array<string>) => {
  const path = ['metadata'].concat(metadataPath);

  const [value, setValue] = useState(typeof id === 'string' ? parse(cachedValue(getName(id)), path) : undefined);
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
    const name = getName(id);

    const handleValue = (v:any) => {
      setValue(parse(v, path));
    };

    cachedSubscribe(name, handleValue, undefined, skipInitialCallback);
    return () => { // eslint-disable-line consistent-return
      cachedUnsubscribe(name, handleValue);
    };
  }, [id, JSON.stringify(metadataPath)]);

  return value;
};
