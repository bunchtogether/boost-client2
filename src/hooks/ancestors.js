// @flow

import { useState, useEffect } from 'react';
import { List } from 'immutable';
import AncestorEmitter from './emitters/ancestors';

export default (id?: string, parameters?:Object) => {
  const [value, setValue] = useState();

  useEffect(() => {
    const emitter = new AncestorEmitter(id, parameters);

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
  }, [id, JSON.stringify(parameters)]);

  return value;
};
