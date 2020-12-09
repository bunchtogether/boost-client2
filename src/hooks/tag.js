// @flow

import { useState, useEffect } from 'react';
import { Map } from 'immutable';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../..';

const parse = (v:any) => {
  if (Map.isMap(v)) {
    return v.toJS();
  }
  return undefined;
};

const getName = (source:string, target:string) => `tags/${source}/${target}`;

export default (source?: string, target?: string) => {
  const [value, setValue] = useState(typeof source === 'string' && typeof target === 'string' ? parse(cachedValue(getName(source, target))) : undefined);
  useEffect(() => {
    if (typeof source !== 'string' || typeof target !== 'string') {
      setValue(undefined);
      return;
    }
    const name = getName(source, target);
    const handleValue = (v:any) => {
      setValue(parse(v));
    };
    cachedSubscribe(name, handleValue);
    return () => { // eslint-disable-line consistent-return
      cachedUnsubscribe(name, handleValue);
    };
  }, [source, target]);

  return value;
};
