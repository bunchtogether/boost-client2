// @flow

import { pick, isEmpty } from 'lodash';
import queryString from 'query-string';
import { List } from 'immutable';
import parseBraidValueHook from './parse-braid-value';

const parameterNames = [
  'depth',
  'sort',
  'order',
  'limit',
  'offset',
  'filter',
  'edgeContains',
  'hasChild',
  'hasParent',
  'type',
  'typesInTree',
  'query',
  'includeInactive',
];

const parse = (v:any) => {
  if (List.isList(v)) {
    return v.toJS();
  }
  return undefined;
};

const getName = (id?:string, parameters?:Object = {}) => {
  if (typeof id !== 'string') {
    return undefined;
  }
  const options = pick(parameters, parameterNames);
  if (options.type && typeof options.type === 'string') {
    options.type = options.type.split(',');
  }
  return isEmpty(options) ? `n/${id}/ancestors` : `n/${id}/ancestors?${queryString.stringify(options)}`;
};

export default (id?: string, parameters?:Object) => {
  const name = getName(id, parameters);
  return parseBraidValueHook(name, parse);
};
