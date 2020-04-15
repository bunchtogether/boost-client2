//      

import { useState, useEffect } from 'react';
import { List } from 'immutable';
import SourcePermissionEmitter from './emitters/source-permission';

export default (ids                        , permission         , parameters         ) => {
  const [value, setValue] = useState();

  useEffect(() => {
    const emitter = new SourcePermissionEmitter(ids, permission, parameters);

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
  }, [JSON.stringify(ids), permission, JSON.stringify(parameters)]);

  return value;
};
