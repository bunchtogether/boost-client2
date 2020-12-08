//      

import { useState, useEffect } from 'react';
import { Map } from 'immutable';
import { cachedSubscribe, cachedUnsubscribe } from '../..';

export default (id         , metadataPath              ) => {
  const [value, setValue] = useState();

  const path = ['metadata'].concat(metadataPath);

  useEffect(() => {
    if (!id) {
      return;
    }
    const name = `n/${id}`;
    const parseNodeValue = (v    ) => {
      if (!Map.isMap(v)) {
        return undefined;
      }
      return v.getIn(path);
    };

    const handleNodeValue = (v    ) => {
      setValue(parseNodeValue(v));
    };

    cachedSubscribe(name, handleNodeValue);
    return () => { // eslint-disable-line consistent-return
      cachedUnsubscribe(name, handleNodeValue);
    };
  }, [id, JSON.stringify(metadataPath)]);

  return value;
};
