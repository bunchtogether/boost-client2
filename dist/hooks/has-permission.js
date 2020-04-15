//      

import { useState, useEffect } from 'react';
import { List } from 'immutable';
import PermissionsEmitter from './emitters/permissions';

export default (sourceId         , targetId         , permission        ) => {
  const [value, setValue] = useState();

  useEffect(() => {
    const emitter = new PermissionsEmitter(sourceId, targetId);

    const parseValue = (v    ) => {
      if (!List.isList(v)) {
        return undefined;
      }
      return v.includes(permission);
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
  }, [sourceId, targetId, permission]);

  return value;
};
