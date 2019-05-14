//      

import { fromJS } from 'immutable';
import { eventChannel } from 'redux-saga';
import Client from '@bunchtogether/braid-client';
import AsyncStorage from '@callstack/async-storage';

const callbackMap                                 = new Map();
const cache = {};

export const braidClient = new Client();

(async () => {
  const keys = await AsyncStorage.getAllKeys();
  const pairs = await AsyncStorage.multiGet(keys);
  const insertions = [];
  for (const [keyString, value] of pairs) {
    if (keyString.slice(0, 2) !== '@b') {
      continue;
    }
    const key = keyString.slice(2);
    if (cache[key]) {
      continue;
    }
    insertions.push([key, JSON.parse(value)]);
  }
  braidClient.data.process([insertions, []]);
})();

braidClient.data.on('set', (key       , value    ) => {
  let cached;
  if (typeof value !== 'undefined') {
    cached = fromJS(value);
  }
  cache[key] = cached;
  setImmediate(() => {
    AsyncStorage.setItem(`@b${key}`, JSON.stringify(braidClient.data.pairs.get(key)));
  });
  const callbackSet = callbackMap.get(key);
  if (!callbackSet) {
    braidClient.unsubscribe(key);
    return;
  }
  for (const callback of callbackSet) { // eslint-disable-line no-restricted-syntax
    callback(cached);
  }
});

braidClient.data.on('delete', (key       ) => {
  delete cache[key];
  const callbackSet = callbackMap.get(key);
  setImmediate(() => {
    AsyncStorage.removeItem(`@b${key}`);
  });
  if (!callbackSet) {
    braidClient.unsubscribe(key);
    return;
  }
  for (const callback of callbackSet) {
    callback();
  }
});

export const cachedValue = (key         ) => { // eslint-disable-line consistent-return
  if (key) {
    return cache[key];
  }
};

export const cachedSubscribe = (key        , callback               ) => {
  let callbackSet = callbackMap.get(key);
  if (callbackSet) {
    callbackSet.add(callback);
  } else {
    callbackSet = new Set([callback]);
    callbackMap.set(key, callbackSet);
    braidClient.subscribe(key);
  }
  callback(cache[key]);
};

export const cachedUnsubscribe = (key       , callback              ) => {
  const callbackSet = callbackMap.get(key);
  if (!callbackSet) {
    braidClient.unsubscribe(key);
    return;
  }
  callbackSet.delete(callback);
  if (callbackSet.size === 0) {
    callbackMap.delete(key);
    braidClient.unsubscribe(key);
  }
};

export const getReduxChannel = (key        , defaultValue      ) => eventChannel((emit          ) => {
  const handle = (value     ) => {
    if (typeof value !== 'undefined') {
      emit(value);
    } else if (typeof defaultValue !== 'undefined') {
      emit(defaultValue);
    }
  };
  setImmediate(() => {
    cachedSubscribe(key, handle);
  });
  return () => {
    cachedUnsubscribe(key, handle);
  };
});

export const cachedSnapshot = (key       , defaultValue      )              => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    cachedUnsubscribe(key, handleValue);
    if (typeof defaultValue !== 'undefined') {
      resolve(defaultValue);
    } else {
      reject(new Error(`Snapshot timeout for ${key}`));
    }
  }, 2000);
  const handleValue = (value) => {
    if (typeof value !== 'undefined') {
      clearTimeout(timeout);
      cachedUnsubscribe(key, handleValue);
      resolve(value);
    }
  };
  cachedSubscribe(key, handleValue);
});

export const triggerDelete = (key       ) => {
  braidClient.data.delete(key);
};

