// @flow

import { Map } from 'immutable';
import useParseBraidValue from './parse-braid-value';

const parse = (v:any) => {
  if (Map.isMap(v)) {
    return v;
  }
  return undefined;
};

const getName = (source?: string, target?: string) => {
  if (typeof source !== 'string') {
    return undefined;
  }
  if (typeof target !== 'string') {
    return undefined;
  }
  return `tags/${source}/${target}`;
};

export default (source?: string, target?: string) => {
  const name = getName(source, target);
  return useParseBraidValue(name, parse);
};
