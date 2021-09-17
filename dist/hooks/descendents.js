import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';
import queryString from 'query-string';
import { List } from 'immutable';
import useParseBraidValue from './parse-braid-value';
const parameterNames = ['depth', 'sort', 'order', 'limit', 'offset', 'filter', 'edgeContains', 'hasChild', 'hasParent', 'type', 'typesInTree', 'query', 'includeInactive'];

const parse = v => {
  if (List.isList(v)) {
    return v.toJS();
  }

  return undefined;
};

const getName = (id, parameters = {}) => {
  if (typeof id !== 'string') {
    return undefined;
  }

  const options = pick(parameters, parameterNames);

  if (options.type && typeof options.type === 'string') {
    options.type = options.type.split(',');
  }

  return isEmpty(options) ? `n/${id}/descendents` : `n/${id}/descendents?${queryString.stringify(options)}`;
};

export default function useDescendents(id, parameters) {
  const name = getName(id, parameters);
  return useParseBraidValue(name, parse);
}
//# sourceMappingURL=descendents.js.map