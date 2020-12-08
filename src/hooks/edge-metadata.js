// @flow

import { useState, useEffect } from 'react';
import { Map } from 'immutable';
import { cachedSubscribe, cachedUnsubscribe } from '../..';

export default (parent?: string, child?: string, metadataPath:Array<string>) => {
  const [value, setValue] = useState();

  const path = ['metadata'].concat(metadataPath);

  useEffect(() => {
    if (!parent || !child) {
      return;
    }
    const name = `e/${parent}/${child}`;
    const parseEdgeValue = (v:any) => {
      if (!Map.isMap(v)) {
        return undefined;
      }
      return v.getIn(path);
    };

    const handleEdgeValue = (v:any) => {
      setValue(parseEdgeValue(v));
    };

    cachedSubscribe(name, handleEdgeValue);
    return () => { // eslint-disable-line consistent-return
      cachedUnsubscribe(name, handleEdgeValue);
    };
  }, [parent, child, JSON.stringify(metadataPath)]);

  return value;
};
