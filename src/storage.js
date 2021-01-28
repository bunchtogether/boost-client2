// @flow

import AsyncStorage from '@callstack/async-storage';

const cacheAvailable = self.caches && self.location && self.location.origin;
const cachePrefix = cacheAvailable ? `${self.location.origin}/` : '';
const cacheKeyRegExp = new RegExp(`${cachePrefix}(.*)`);

const cachePromise = (async () => {
  if (!cacheAvailable) {
    return undefined;
  }
  let cache;
  try {
    cache = await caches.open('boost-client-cache');
  } catch (error) {
    return undefined;
  }
  return cache;
})();

export async function getAllKeys(): Promise<Array<string>> {
  const cache = await cachePromise;
  if (cache) {
    return (await cache.keys()).reduce((keys, req) => {
      const match = req.url.match(cacheKeyRegExp);
      const boostKey = match ? match[1] : undefined;
      if (boostKey) {
        keys.push(boostKey);
      }
      return keys;
    }, []);
  }
  return AsyncStorage.getAllKeys();
}

export async function multiGet(keys: Array<string>) {
  const cache = await cachePromise;
  if (cache) {
    return Promise.all(keys.map(async (key) => {
      const resp = await cache.match(`${cachePrefix}${key}`);
      if (resp.body) {
        return resp.text();
      }
      return JSON.stringify(null);
    }));
  }
  return AsyncStorage.multiGet(keys);
}

export async function multiRemove(keys: Array<string>) {
  const cache = await cachePromise;
  if (cache) {
    return Promise.all(keys.map((key: string) => cache.delete(`${cachePrefix}${key}`)));
  }
  return AsyncStorage.multiRemove(keys);
}

export async function multiSet(pairs: Array<[string, string]>) {
  const cache = await cachePromise;
  if (cache) {
    return Promise.all(pairs.map((pair) => cache.put(`${cachePrefix}${pair[0]}`, new Response(pair[1]))));
  }
  return AsyncStorage.multiSet(pairs);
}
