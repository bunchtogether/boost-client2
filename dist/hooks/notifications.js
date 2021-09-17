import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';
import queryString from 'query-string';
import { List } from 'immutable';
import useParseBraidValue from './parse-braid-value';
const parameterNames = ['limit', 'offset', 'filterNamed', 'query'];

const parse = v => {
  if (List.isList(v)) {
    return v.toJS();
  }

  return undefined;
};

const getName = (teamId, ids, parameters = {}) => {
  const nodeIds = Array.isArray(ids) ? ids.join('/') : ids;
  const options = pick(parameters, parameterNames);
  return isEmpty(options) ? `notifications/${teamId}/${nodeIds}` : `notifications/${teamId}/${nodeIds}?${queryString.stringify(options)}`;
};

export default function useNotifications(teamId, ids, parameters) {
  const name = getName(teamId, ids, parameters);
  return useParseBraidValue(name, parse);
}
//# sourceMappingURL=notifications.js.map