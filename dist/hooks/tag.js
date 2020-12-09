//      

import { useState, useEffect } from 'react';
import { Map } from 'immutable';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../..';

const parse = (v    ) => {
  if (Map.isMap(v)) {
    return v.toJS();
  }
  return undefined;
};

const getName = (source       , target       ) => `tags/${source}/${target}`;

export default (source         , target         ) => {
  const [value, setValue] = useState(typeof source === 'string' && typeof target === 'string' ? parse(cachedValue(getName(source, target))) : undefined);
  useEffect(() => {
    if (typeof source !== 'string' || typeof target !== 'string') {
      setValue(undefined);
      return;
    }
    const name = getName(source, target);
    const handleValue = (v    ) => {
      setValue(parse(v));
    };
    cachedSubscribe(name, handleValue, undefined, true);
    return () => { // eslint-disable-line consistent-return
      cachedUnsubscribe(name, handleValue);
    };
  }, [source, target]);

  return value;
};
