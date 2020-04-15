// @flow

import { useState, useEffect } from 'react';
import { List } from 'immutable';
import PermissionsEmitter from './emitters/permissions';

export default (sourceId?: string, targetId?: string, permission: string) => {
  const [value, setValue] = useState();

  useEffect(() => {
    const emitter = new PermissionsEmitter(sourceId, targetId);

    const parseValue = (v:any) => {
      if (!List.isList(v)) {
        return undefined;
      }
      return v.includes(permission);
    };

    const handleValue = (v:any) => {
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
