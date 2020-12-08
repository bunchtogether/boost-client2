// @flow

import { useState, useEffect } from 'react';
import { List } from 'immutable';
import { cachedSubscribe, cachedUnsubscribe } from '../..';

export default (sourceId?: string, targetId?: string, permission: string) => {
  const [value, setValue] = useState();

  useEffect(() => {
    if (!sourceId || !targetId) {
      return;
    }
    const name = `p/${sourceId}/${targetId}`;
    const parseValue = (v:any) => {
      if (!List.isList(v)) {
        return undefined;
      }
      return v.includes(permission);
    };

    const handleValue = (v:any) => {
      setValue(parseValue(v));
    };

    cachedSubscribe(name, handleValue);
    return () => { // eslint-disable-line consistent-return
      cachedUnsubscribe(name, handleValue);
    };
  }, [sourceId, targetId, permission]);

  return value;
};
