// @flow

import useParseBraidValue from './parse-braid-value';

const parse = (v:any) => v;

const getName = (id?:string, path:Array<string>) => {
  if (typeof id !== 'string') {
    return undefined;
  }
  if (!Array.isArray(path)) {
    return undefined;
  }
  return `n/${id}/metadata/${path.map((x) => encodeURIComponent(x)).join('/')}`;
};

export default function useMetadata(id?: string, path:Array<string>) {
  const name = getName(id, path);
  return useParseBraidValue(name, parse);
}
