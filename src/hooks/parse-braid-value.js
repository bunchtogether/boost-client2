// @flow

import { useState, useEffect, useRef, useMemo } from 'react';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../index';


export default (name?: string, parse:(any) => any) => {
  const [value, setValue] = useState(typeof name === 'string' ? cachedValue(name) : undefined);
  const initialCallbackRef = useRef(typeof value !== 'undefined' || typeof name !== 'string');
  useEffect(() => {
    const skipInitialCallback = initialCallbackRef.current;
    initialCallbackRef.current = false;
    if (typeof name !== 'string') {
      if (!skipInitialCallback) {
        setValue(undefined);
      }
      return;
    }
    cachedSubscribe(name, setValue, undefined, skipInitialCallback);
    return () => { // eslint-disable-line consistent-return
      cachedUnsubscribe(name, setValue);
    };
  }, [name]);
  return useMemo(() => parse(value), [parse, value]);
};
