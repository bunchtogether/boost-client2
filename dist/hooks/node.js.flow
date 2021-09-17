// @flow

import { Map } from 'immutable';
import useParseBraidValue from './parse-braid-value';

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

export default function useNode(id?: string) {
  const name = getName(id);
  return useParseBraidValue(name, parse);
}
