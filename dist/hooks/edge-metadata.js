import { useState, useEffect, useRef } from 'react';
import { Map } from 'immutable';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '..';

const parse = (v, path) => {
  if (Map.isMap(v)) {
    return v.getIn(path);
  }

  return undefined;
};

const getName = (parent, child) => `e/${parent}/${child}`;

export default ((parent, child, metadataPath) => {
  const path = ['metadata'].concat(metadataPath);
  const [value, setValue] = useState(typeof parent === 'string' && typeof child === 'string' ? parse(cachedValue(getName(parent, child)), path) : undefined);
  const initialCallbackRef = useRef(typeof value !== 'undefined' || typeof parent !== 'string' || typeof child !== 'string');
  useEffect(() => {
    const skipInitialCallback = initialCallbackRef.current;
    initialCallbackRef.current = false;

    if (typeof parent !== 'string' || typeof child !== 'string') {
      if (!skipInitialCallback) {
        setValue(undefined);
      }

      return;
    }

    const name = getName(parent, child);

    const handleValue = v => {
      setValue(parse(v, path));
    };

    cachedSubscribe(name, handleValue, undefined, skipInitialCallback);
    return () => {
      // eslint-disable-line consistent-return
      cachedUnsubscribe(name, handleValue);
    };
  }, [parent, child, JSON.stringify(metadataPath)]);
  return value;
});
//# sourceMappingURL=edge-metadata.js.map