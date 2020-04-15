// @flow

import { useState, useEffect } from 'react';
import { Map } from 'immutable';
import NodeEmitter from './emitters/node';

export default (id?: string, metadataPath:Array<string>) => {
  const [value, setValue] = useState();

  const path = ['metadata'].concat(metadataPath);

  useEffect(() => {
    const nodeEmitter = new NodeEmitter(id);

    const parseNodeValue = (v:any) => {
      if (!Map.isMap(v)) {
        return undefined;
      }
      return v.getIn(path);
    };

    const handleNodeValue = (v:any) => {
      setValue(parseNodeValue(v));
    };

    nodeEmitter.on('value', handleNodeValue);

    setValue(parseNodeValue(nodeEmitter.value));

    return function cleanup() {
      nodeEmitter.removeListener('value', handleNodeValue);
      nodeEmitter.cleanup();
    };
  }, [id, JSON.stringify(metadataPath)]);

  return value;
};
