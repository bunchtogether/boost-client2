// @flow

import AsyncStorage from '@callstack/async-storage';

const key = 'boost-client-cache-dump';

const cacheAvailable = self.caches && self.location && self.location.origin;
const cachePrefix = cacheAvailable ? `${self.location.origin}/` : '';

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

export async function set(dump: string) {
  console.log('Cache size:', new Blob([dump]).size / (1024 * 1024));
  const cache = await cachePromise;
  if (cache) {
    return cache.put(`${cachePrefix}${key}`, new Response(dump));
  }
  return AsyncStorage.setItem(key, dump);
}

export async function get() {
  const cache = await cachePromise;
  if (cache) {
    const resp = await cache.match(`${cachePrefix}${key}`);
    if (resp && resp.body) {
      return resp.text();
    }
    return JSON.stringify([[], []]);
  }
  const dump = await AsyncStorage.getItem(key);
  return dump || JSON.stringify([[], []]);
}

export async function clear() {
  const cache = await cachePromise;
  if (cache) {
    return cache.delete(`${cachePrefix}${key}`);
  }
  return AsyncStorage.removeItem(key);
}
