import parseBraidValueHook from './parse-braid-value';

const parse = v => v;

const getName = (id, path) => {
  if (typeof id !== 'string') {
    return undefined;
  }

  if (!Array.isArray(path)) {
    return undefined;
  }

  return `n/${id}/metadata/${path.map(x => encodeURIComponent(x)).join('/')}`;
};

export default ((id, path) => {
  const name = getName(id, path);
  return parseBraidValueHook(name, parse);
});
//# sourceMappingURL=metadata.js.map