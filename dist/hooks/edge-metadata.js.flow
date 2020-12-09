// @flow

import { useState, useEffect } from 'react';
import { Map } from 'immutable';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../..';

const parse = (v:any, path:Array<string>) => {
  if (Map.isMap(v)) {
    return v.getIn(path);
  }
  return undefined;
};

const getName = (parent:string, child:string) => `e/${parent}/${child}`;

export default (parent?: string, child?: string, metadataPath:Array<string>) => {
  const path = ['metadata'].concat(metadataPath);

  const [value, setValue] = useState(typeof parent === 'string' && typeof child === 'string' ? parse(cachedValue(getName(parent, child)), path) : undefined);

  useEffect(() => {
    if (typeof parent !== 'string' || typeof child !== 'string') {
      setValue(undefined);
      return;
    }
    const name = getName(parent, child);

    const handleValue = (v:any) => {
      setValue(parse(v, path));
    };

    cachedSubscribe(name, handleValue, undefined, true);
    return () => { // eslint-disable-line consistent-return
      cachedUnsubscribe(name, handleValue);
    };
  }, [parent, child, JSON.stringify(metadataPath)]);

  return value;
};
