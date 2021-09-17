// @flow

import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';
import queryString from 'query-string';
import useParseBraidValue from './parse-braid-value';

const parameterNames = [
  'type',
  'name',
  'hasParent',
];

const parse = (v:any) => v;

const getName = (id?: string, parameters?: Object) => {
  if (typeof id !== 'string') {
    return undefined;
  }
  const options = pick(parameters, parameterNames);
  if (options.type && typeof options.type === 'string') {
    options.type = options.type.split(',');
  }
  return isEmpty(options) ? `tags/${id}/count` : `tags/${id}/count?${queryString.stringify(options)}`;
};

export default function useTagCount(id?: string, parameters?: Object) {
  const name = getName(id, parameters);
  return useParseBraidValue(name, parse);
}
