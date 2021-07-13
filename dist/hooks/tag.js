import { useState, useEffect, useRef } from 'react';
import { Map } from 'immutable';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../index';

const parse = v => {
  if (Map.isMap(v)) {
    return v.toJS();
  }

  return undefined;
};

const getName = (source, target) => `tags/${source}/${target}`;

export default ((source, target) => {
  const [value, setValue] = useState(typeof source === 'string' && typeof target === 'string' ? parse(cachedValue(getName(source, target))) : undefined);
  const initialCallbackRef = useRef(typeof value !== 'undefined' || typeof source !== 'string' || typeof target !== 'string');
  useEffect(() => {
    const skipInitialCallback = initialCallbackRef.current;
    initialCallbackRef.current = false;

    if (typeof source !== 'string' || typeof target !== 'string') {
      if (!skipInitialCallback) {
        setValue(undefined);
      }

      return;
    }

    const name = getName(source, target);

    const handleValue = v => {
      setValue(parse(v));
    };

    cachedSubscribe(name, handleValue, undefined, skipInitialCallback);
    return () => {
      // eslint-disable-line consistent-return
      cachedUnsubscribe(name, handleValue);
    };
  }, [source, target]);
  return value;
});
//# sourceMappingURL=tag.js.map