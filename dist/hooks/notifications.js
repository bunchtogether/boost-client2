//      

import { pick, isEmpty } from 'lodash';
import queryString from 'query-string';
import { useState, useEffect } from 'react';
import { List } from 'immutable';
import { cachedSubscribe, cachedUnsubscribe } from '../..';

const parameterNames = [
  'limit',
  'offset',
  'filterNamed',
  'query',
];

export default (teamId       , ids                       , parameters        ) => {
  const [value, setValue] = useState();
  useEffect(() => {
    const isArray = Array.isArray(ids);
    if (!ids || (!isArray && typeof ids !== 'string')) {
      return;
    }
    if (isArray && ids.length === 0) {
      return;
    }
    const nodeIds = Array.isArray(ids) ? ids.join('/') : ids;
    const options = pick(parameters, parameterNames);
    const name = isEmpty(options) ? `notifications/${teamId}/${nodeIds}` : `notifications/${teamId}/${nodeIds}?${queryString.stringify(options)}`;
    const handleValue = (v    ) => {
      if (!List.isList(v)) {
        setValue(undefined);
      } else {
        setValue(v.toJS());
      }
    };
    cachedSubscribe(name, handleValue);
    return () => { // eslint-disable-line consistent-return
      cachedUnsubscribe(name, handleValue);
    };
  }, [JSON.stringify(ids), JSON.stringify(parameters)]);

  return value;
};
