import useParseBraidValue from './parse-braid-value';

const getName = (permission, sourceId, targetId) => {
  if (typeof permission !== 'string') {
    return undefined;
  }

  if (typeof sourceId !== 'string') {
    return undefined;
  }

  if (typeof targetId !== 'string') {
    return undefined;
  }

  return `p/${permission}/${sourceId}/${targetId}`;
};

const parse = v => {
  if (typeof v === 'boolean') {
    return v;
  }

  return undefined;
};

export default function useHasPermission(sourceId, targetId, permission) {
  const name = getName(permission, sourceId, targetId);
  return useParseBraidValue(name, parse);
}
//# sourceMappingURL=has-permission.js.map