// @flow

import { useState, useEffect } from 'react';
import { List } from 'immutable';
import SourcePermissionEmitter from './emitters/source-permission';

export default (ids?:string | Array<string>, permission?: string, parameters?: Object) => {
  const [value, setValue] = useState();

  useEffect(() => {
    const emitter = new SourcePermissionEmitter(ids, permission, parameters);

    const parseValue = (v:any) => {
      if (!List.isList(v)) {
        return undefined;
      }
      return v.toJS();
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
  }, [JSON.stringify(ids), permission, JSON.stringify(parameters)]);

  return value;
};
