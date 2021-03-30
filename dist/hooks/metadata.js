//      

import { useState, useEffect, useRef } from 'react';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../..';

const getName = (id       , path              ) => `n/${id}/metadata/${path.map((x) => encodeURIComponent(x)).join('/')}`;

export default (id         , path              ) => {
  const [value, setValue] = useState(typeof id === 'string' && Array.isArray(path) ? cachedValue(getName(id, path)) : undefined);

  const initialCallbackRef = useRef(typeof value !== 'undefined' || typeof id !== 'string' || !Array.isArray(path));

  useEffect(() => {
    const skipInitialCallback = initialCallbackRef.current;
    initialCallbackRef.current = false;
    if (typeof id !== 'string' || !Array.isArray(path)) {
      if (!skipInitialCallback) {
        setValue(undefined);
      }
      return;
    }

    const name = getName(id, path);

    const handleValue = (v    ) => {
      setValue(v);
    };

    cachedSubscribe(name, handleValue, undefined, skipInitialCallback);
    return () => { // eslint-disable-line consistent-return
      cachedUnsubscribe(name, handleValue);
    };
  }, [id, JSON.stringify(path)]);

  return value;
};
