import AsyncStorage from '@callstack/async-storage';
const key = 'boost-client-cache-dump';
const cacheAvailable = self.caches && self.location && self.location.origin && self.navigator && self.navigator.serviceWorker;
const cachePrefix = cacheAvailable ? `${self.location.origin}/` : '';

const cachePromise = (async () => {
  if (!cacheAvailable) {
    console.log('Using AsyncStorage for Boost client cache');
    return undefined;
  }

  console.log('Using Cache API for Boost client cache');
  let cache;

  try {
    cache = await caches.open('boost-client-cache');
  } catch (error) {
    return undefined;
  }

  return cache;
})();

export async function set(dump) {
  const size = Math.round(dump.length / 1024 / 1024 * 100) / 100;

  if (size > 4) {
    console.log(`Warning ${size} MB Boost client cache might exceed device limits`);
  }

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
      const dumpString = await resp.text();

      if (typeof dumpString === 'string') {
        const size = Math.round(dumpString.length / 1024 / 1024 * 100) / 100;
        console.log(`Loading ${size} MB Boost client cache`);
        return dumpString;
      }

      return null;
    }

    return null;
  }

  const dumpString = await AsyncStorage.getItem(key);

  if (typeof dumpString === 'string') {
    const size = Math.round(dumpString.length / 1024 / 1024 * 100) / 100;
    console.log(`Loading ${size} MB Boost client cache`);
    return dumpString;
  }

  return null;
}
export async function clear() {
  const cache = await cachePromise;

  if (cache) {
    return cache.delete(`${cachePrefix}${key}`);
  }

  return AsyncStorage.removeItem(key);
}
//# sourceMappingURL=storage.js.map