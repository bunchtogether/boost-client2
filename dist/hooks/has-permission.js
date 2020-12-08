//      

import { useState, useEffect } from 'react';
import { List } from 'immutable';
import { cachedSubscribe, cachedUnsubscribe } from '../..';

export default (sourceId         , targetId         , permission        ) => {
  const [value, setValue] = useState();

  useEffect(() => {
    if (!sourceId || !targetId) {
      return;
    }
    const name = `p/${sourceId}/${targetId}`;
    const parseValue = (v    ) => {
      if (!List.isList(v)) {
        return undefined;
      }
      return v.includes(permission);
    };

    const handleValue = (v    ) => {
      setValue(parseValue(v));
    };

    cachedSubscribe(name, handleValue);
    return () => { // eslint-disable-line consistent-return
      cachedUnsubscribe(name, handleValue);
    };
  }, [sourceId, targetId, permission]);

  return value;
};
