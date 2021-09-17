import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';
import queryString from 'query-string';
import useParseBraidValue from './parse-braid-value';
const parameterNames = ['type', 'name', 'hasParent'];

const parse = v => v;

const getName = (id, parameters) => {
  if (typeof id !== 'string') {
    return undefined;
  }

  const options = pick(parameters, parameterNames);

  if (options.type && typeof options.type === 'string') {
    options.type = options.type.split(',');
  }

  return isEmpty(options) ? `tags/${id}/count` : `tags/${id}/count?${queryString.stringify(options)}`;
};

export default function useTagCount(id, parameters) {
  const name = getName(id, parameters);
  return useParseBraidValue(name, parse);
}
//# sourceMappingURL=tag-count.js.map