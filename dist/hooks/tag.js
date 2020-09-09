//      

import { useState, useEffect } from 'react';
import { Map } from 'immutable';
import { cachedSubscribe, cachedUnsubscribe } from '../..';

export default (source        , target        ) => {
  const [value, setValue] = useState();
  useEffect(() => {
    if (!source || !target) {
      return;
    }
    const name = `tags/${source}/${target}`;
    const handleValue = (v) => {
      if (!Map.isMap(v)) {
        setValue(undefined);
      } else {
        setValue(v.toJS());
      }
    };
    cachedSubscribe(name, handleValue);
    return () => { // eslint-disable-line consistent-return
      cachedUnsubscribe(name, handleValue);
    };
  }, [source, target]);

  return value;
};
