//      

import { useState, useEffect } from 'react';
import { Map } from 'immutable';
import EdgeEmitter from './emitters/edge';

export default (parent         , child         , metadataPath              ) => {
  const [value, setValue] = useState();

  const path = ['metadata'].concat(metadataPath);

  useEffect(() => {
    const edgeEmitter = new EdgeEmitter(parent, child);

    const parseEdgeValue = (v    ) => {
      if (!Map.isMap(v)) {
        return undefined;
      }
      return v.getIn(path);
    };

    const handleEdgeValue = (v    ) => {
      setValue(parseEdgeValue(v));
    };

    edgeEmitter.on('value', handleEdgeValue);

    setValue(parseEdgeValue(edgeEmitter.value));

    return function cleanup() {
      edgeEmitter.removeListener('value', handleEdgeValue);
      edgeEmitter.cleanup();
    };
  }, [parent, child, JSON.stringify(metadataPath)]);

  return value;
};
