//      

import { useState, useEffect } from 'react';
import { List } from 'immutable';
import AncestorEmitter from './emitters/ancestors';

export default (id         , parameters        ) => {
  const [value, setValue] = useState();

  useEffect(() => {
    const emitter = new AncestorEmitter(id, parameters);

    const parseValue = (v    ) => {
      if (!List.isList(v)) {
        return undefined;
      }
      return v.toJS();
    };

    const handleValue = (v    ) => {
      setValue(parseValue(v));
    };

    emitter.on('value', handleValue);

    setValue(parseValue(emitter.value));

    return function cleanup() {
      emitter.removeListener('value', handleValue);
      emitter.cleanup();
    };
  }, [id, JSON.stringify(parameters)]);

  return value;
};
