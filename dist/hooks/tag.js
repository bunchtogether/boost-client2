//      

import { useState, useEffect } from 'react';
import { cachedSubscribe, cachedUnsubscribe } from '../..';

export default (source        , target        ) => {
  const [value, setValue] = useState();
  useEffect(() => {
    if (!source || !target) {
      return;
    }
    const name = `tags/${source}/${target}`;
    const handleValue = (v) => {
      setValue(v);
    };
    cachedSubscribe(name, handleValue);
    return () => { // eslint-disable-line consistent-return
      cachedUnsubscribe(name, handleValue);
    };
  }, [source, target]);

  return value;
};
