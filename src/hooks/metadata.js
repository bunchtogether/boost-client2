// @flow

import parseBraidValueHook from './parse-braid-value';

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

export default (id?: string, path:Array<string>) => {
  const name = getName(id, path);
  return parseBraidValueHook(name, parse);
};
