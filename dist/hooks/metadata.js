//      

import { useState, useEffect, useRef } from 'react';
import { Map } from 'immutable';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../..';

const parse = (v    , path              ) => {
  if (Map.isMap(v)) {
    return v.getIn(path);
  }
  return undefined;
};

const getName = (id       ) => `n/${id}`;

export default (id         , metadataPath              ) => {
  const path = ['metadata'].concat(metadataPath);

  const [value, setValue] = useState(typeof id === 'string' ? parse(cachedValue(getName(id)), path) : undefined);
  const initialCallbackRef = useRef(!!value);

  useEffect(() => {
    const skipInitialCallback = initialCallbackRef.current;
    initialCallbackRef.current = false;
    if (typeof id !== 'string') {
      setValue(undefined);
      return;
    }
    const name = getName(id);

    const handleValue = (v    ) => {
      setValue(parse(v, path));
    };

    cachedSubscribe(name, handleValue, undefined, skipInitialCallback);
    return () => { // eslint-disable-line consistent-return
      cachedUnsubscribe(name, handleValue);
    };
  }, [id, JSON.stringify(metadataPath)]);

  return value;
};
