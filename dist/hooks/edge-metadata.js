import { useCallback } from 'react';
import { Map } from 'immutable';
import useParseBraidValue from './parse-braid-value';

const getName = (parentId, childId) => {
  if (typeof parentId !== 'string') {
    return undefined;
  }

  if (typeof childId !== 'string') {
    return undefined;
  }

  return `e/${parentId}/${childId}`;
};

export default function useEdgeMetadata(parentId, childId, path) {
  const name = getName(parentId, childId);
  const parse = useCallback(v => {
    if (Map.isMap(v)) {
      return v.getIn(path);
    }

    return undefined;
  }, path);
  return useParseBraidValue(name, parse);
}
//# sourceMappingURL=edge-metadata.js.map