import { Map } from 'immutable';
import useParseBraidValue from './parse-braid-value';

const parse = v => {
  if (Map.isMap(v)) {
    return v;
  }

  return undefined;
};

const getName = id => {
  if (typeof id !== 'string') {
    return undefined;
  }

  return `n/${id}`;
};

export default function useNode(id) {
  const name = getName(id);
  return useParseBraidValue(name, parse);
}
//# sourceMappingURL=node.js.map