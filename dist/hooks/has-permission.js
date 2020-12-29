//      

import { useState, useEffect, useRef } from 'react';
import { List } from 'immutable';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../..';

const parse = (v    , permission       ) => {
  if (List.isList(v)) {
    return v.includes(permission);
  }
  return undefined;
};

const getName = (sourceId       , targetId       ) => `p/${sourceId}/${targetId}`;

export default (sourceId         , targetId         , permission        ) => {
  const [value, setValue] = useState(typeof sourceId === 'string' && typeof targetId === 'string' ? parse(cachedValue(getName(sourceId, targetId)), permission) : undefined);
  const initialCallbackRef = useRef(typeof value !== 'undefined' || typeof sourceId !== 'string' || typeof targetId !== 'string');

  useEffect(() => {
    const skipInitialCallback = initialCallbackRef.current;
    initialCallbackRef.current = false;
    if (typeof sourceId !== 'string' || typeof targetId !== 'string') {
      if (!skipInitialCallback) {
        setValue(undefined);
      }
      return;
    }
    const name = getName(sourceId, targetId);

    const handleValue = (v    ) => {
      setValue(parse(v, permission));
    };

    cachedSubscribe(name, handleValue, undefined, skipInitialCallback);
    return () => { // eslint-disable-line consistent-return
      cachedUnsubscribe(name, handleValue);
    };
  }, [sourceId, targetId, permission]);

  return value;
};
