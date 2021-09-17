import { useCallback } from 'react';
import { List } from 'immutable';
import useParseBraidValue from './parse-braid-value';

const getName = (sourceId, targetId) => {
  if (typeof sourceId !== 'string') {
    return undefined;
  }

  if (typeof targetId !== 'string') {
    return undefined;
  }

  return `p/${sourceId}/${targetId}`;
};

export default function useHasPermission(sourceId, targetId, permission) {
  const name = getName(sourceId, targetId);
  const parse = useCallback(v => {
    if (List.isList(v)) {
      return v.includes(permission);
    }

    return undefined;
  }, [permission]);
  return useParseBraidValue(name, parse);
}
//# sourceMappingURL=has-permission.js.map