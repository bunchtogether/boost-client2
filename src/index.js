// @flow

import { fromJS } from 'immutable';
import { eventChannel } from 'redux-saga';
import Client from '@bunchtogether/braid-client';
import AsyncStorage from '@callstack/async-storage';

const callbackMap:Map<string, Set<(any) => void>> = new Map();
const cache = {};

export const braidClient = new Client();

setImmediate(async () => {
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
});

braidClient.data.on('set', (key:string, value:any) => {
  console.log(key, braidClient.data.pairs.get(key));
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

braidClient.data.on('delete', (key:string) => {
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

export const cachedValue = (key?: string) => { // eslint-disable-line consistent-return
  if (key) {
    return cache[key];
  }
};

export const cachedSubscribe = (key: string, callback: (any) => void) => {
  let callbackSet = callbackMap.get(key);
  if (callbackSet) {
    callbackSet.add(callback);
    callback(cache[key]);
  } else {
    callbackSet = new Set([callback]);
    callbackMap.set(key, callbackSet);
    if (cache[key]) {
      callback(cache[key]);
    }
    braidClient.subscribe(key);
  }
};

export const cachedUnsubscribe = (key:string, callback:(any) => void) => {
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

export const getReduxChannel = (key: string, defaultValue?: any) => eventChannel((emit: Function) => {
  const handle = (value: any) => {
    if (typeof value !== 'undefined') {
      emit(value);
    } else if (typeof defaultValue !== 'undefined') {
      emit(defaultValue);
    }
  };
  cachedSubscribe(key, handle);
  return () => {
    cachedUnsubscribe(key, handle);
  };
});

export const cachedSnapshot = (key:string):Promise<any> => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    reject(new Error(`Snapshot timeout for ${key}`));
  }, 5000);
  const handleValue = (value) => {
    if (typeof value !== 'undefined') {
      clearTimeout(timeout);
      cachedUnsubscribe(key, handleValue);
      resolve(value);
    }
  };
  cachedSubscribe(key, handleValue);
});

export const triggerDelete = (key:string) => {
  braidClient.data.delete(key);
};

