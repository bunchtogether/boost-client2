// @flow

import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';
import queryString from 'query-string';
import { List } from 'immutable';
import useParseBraidValue from './parse-braid-value';

const parameterNames = [
  'limit',
  'offset',
  'filterNamed',
  'query',
];

const parse = (v:any) => {
  if (List.isList(v)) {
    return v.toJS();
  }
  return undefined;
};

const getName = (teamId:string, ids:string | Array<string>, parameters?:Object = {}) => {
  const nodeIds = Array.isArray(ids) ? ids.join('/') : ids;
  const options = pick(parameters, parameterNames);
  return isEmpty(options) ? `notifications/${teamId}/${nodeIds}` : `notifications/${teamId}/${nodeIds}?${queryString.stringify(options)}`;
};

export default function useNotifications(teamId:string, ids:string | Array<string>, parameters?:Object) {
  const name = getName(teamId, ids, parameters);
  return useParseBraidValue(name, parse);
}
