import { Map } from 'immutable';
import parseBraidValueHook from './parse-braid-value';

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

export default (id => {
  const name = getName(id);
  return parseBraidValueHook(name, parse);
});
//# sourceMappingURL=node.js.map