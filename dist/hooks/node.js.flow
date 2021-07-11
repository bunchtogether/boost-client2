// @flow

import { Map } from 'immutable';
import parseBraidValueHook from './parse-braid-value';

const parse = (v:any) => {
  if (Map.isMap(v)) {
    return v;
  }
  return undefined;
};

const getName = (id?:string) => {
  if (typeof id !== 'string') {
    return undefined;
  }
  return `n/${id}`;
};

export default (id?: string) => {
  const name = getName(id);
  return parseBraidValueHook(name, parse);
};
