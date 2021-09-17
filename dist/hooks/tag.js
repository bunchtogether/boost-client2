import { Map } from 'immutable';
import useParseBraidValue from './parse-braid-value';

const parse = v => {
  if (Map.isMap(v)) {
    return v;
  }

  return undefined;
};

const getName = (source, target) => {
  if (typeof source !== 'string') {
    return undefined;
  }

  if (typeof target !== 'string') {
    return undefined;
  }

  return `tags/${source}/${target}`;
};

export default ((source, target) => {
  const name = getName(source, target);
  return useParseBraidValue(name, parse);
});
//# sourceMappingURL=tag.js.map