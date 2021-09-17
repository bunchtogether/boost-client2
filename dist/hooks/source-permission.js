import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';
import queryString from 'query-string';
import { List } from 'immutable';
import useParseBraidValue from './parse-braid-value';
const parameterNames = ['sort', 'order', 'limit', 'offset', 'filter', 'type', 'query', 'readPermission', 'hasChild', 'hasParent', 'onlineInTeam', 'parentEdgeContains', 'typesInTree'];

const parse = v => {
  if (List.isList(v)) {
    return v.toJS();
  }

  return undefined;
};

const getName = (ids, permission, parameters = {}) => {
  if (typeof ids !== 'string' && !Array.isArray(ids)) {
    return undefined;
  }

  if (Array.isArray(ids) && ids.length === 0) {
    return undefined;
  }

  if (typeof permission !== 'string') {
    return undefined;
  }

  const parts = ['p'];

  if (typeof ids === 'string') {
    parts.push(ids);
  } else if (Array.isArray(ids)) {
    for (const id of ids) {
      parts.push(id);
    }
  }

  parts.push(permission);
  const options = pick(parameters, parameterNames);
  return isEmpty(options) ? parts.join('/') : `${parts.join('/')}?${queryString.stringify(options)}`;
};

export default function useSourcePermission(ids, permission, parameters) {
  const name = getName(ids, permission, parameters);
  return useParseBraidValue(name, parse);
}
//# sourceMappingURL=source-permission.js.map