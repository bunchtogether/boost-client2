// @flow

import { useState, useEffect } from 'react';
import { List } from 'immutable';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../..';

const parse = (v:any, permission:string) => {
  if (List.isList(v)) {
    return v.includes(permission);
  }
  return undefined;
};

const getName = (sourceId:string, targetId:string) => `p/${sourceId}/${targetId}`;

export default (sourceId?: string, targetId?: string, permission: string) => {
  const [value, setValue] = useState(typeof sourceId === 'string' && typeof targetId === 'string' ? parse(cachedValue(getName(sourceId, targetId)), permission) : undefined);

  useEffect(() => {
    if (typeof sourceId !== 'string' || typeof targetId !== 'string') {
      setValue(undefined);
      return;
    }
    const name = getName(sourceId, targetId);

    const handleValue = (v:any) => {
      setValue(parse(v, permission));
    };

    cachedSubscribe(name, handleValue);
    return () => { // eslint-disable-line consistent-return
      cachedUnsubscribe(name, handleValue);
    };
  }, [sourceId, targetId, permission]);

  return value;
};
