// @flow

import useParseBraidValue from './parse-braid-value';

const getName = (permission:string, sourceId?: string, targetId?: string) => {
  if (typeof permission !== 'string') {
    return undefined;
  }
  if (typeof sourceId !== 'string') {
    return undefined;
  }
  if (typeof targetId !== 'string') {
    return undefined;
  }
  return `p/${permission}/${sourceId}/${targetId}`;
};

const parse = (v:any) => {
  if (typeof v === 'boolean') {
    return v;
  }
  return undefined;
};

export default function useHasPermission(sourceId?: string, targetId?: string, permission: string) {
  const name = getName(permission, sourceId, targetId);
  return useParseBraidValue(name, parse);
}
