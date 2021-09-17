import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';
import queryString from 'query-string';
import { List } from 'immutable';
import useParseBraidValue from './parse-braid-value';
import { braidClient } from '../index';
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

  if (parameters && parameters.types) {
    if (!options.typesInTreeWithDepth) {
      options.typesInTreeWithDepth = JSON.parse(parameters.types);
    }

    braidClient.logger.warn('Deprecated in hooks/tree: "types" is deprecated please use "typesInTreeWithDepth"');
  }

  return isEmpty(options) ? `n/${id}/tree` : `n/${id}/tree?${queryString.stringify(options)}`;
};

export default function useTree(id, parameters) {
  const name = getName(id, parameters);
  return useParseBraidValue(name, parse);
}
//# sourceMappingURL=tree.js.map