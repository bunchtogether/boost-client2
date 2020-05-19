// @flow

import type { EventChannel } from 'redux-saga';
import { fromJS } from 'immutable';
import { eventChannel } from 'redux-saga';
import Client from '@bunchtogether/braid-client';
import AsyncStorage from '@callstack/async-storage';


const callbackMap:Map<string, Set<(any) => void>> = new Map();
const cache = {};
const affirmed = {};

export class BoostCatastrophicError extends Error {
  constructor(message:string) {
    super(message);
    this.name = 'BoostCatastrophicError';
  }
}

export const braidClient = new Client();

let cacheMap = new Map();
let flushPromise = null;
const flush = () => {
  if (flushPromise) {
    return flushPromise;
  }
  flushPromise = _flush();
  flushPromise.then(() => {
    flushPromise = null;
  });
  flushPromise.catch((error) => {
    console.error(error);
    flushPromise = null;
  });
  return flushPromise;
};

const _flush = async () => { // eslint-disable-line no-underscore-dangle
  await new Promise((resolve) => setTimeout(resolve, 5000));
  const oldCacheMap = cacheMap;
  cacheMap = new Map();
  const setQueue = [];
  const removeQueue = [];
  for (const [key, value] of oldCacheMap) {
    if (typeof value === 'undefined') {
      removeQueue.push(key);
    } else {
      setQueue.push([key, value]);
    }
  }
  await AsyncStorage.multiRemove(removeQueue);
  await AsyncStorage.multiSet(setQueue);
};

const loadAsync = async () => {
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
  await new Promise((resolve) => setImmediate(resolve));
  braidClient.data.on('affirm', (key:string) => {
    affirmed[key] = true;
  });
  braidClient.data.on('set', (key:string) => {
    affirmed[key] = true;
    cacheMap.set(`@b${key}`, JSON.stringify(braidClient.data.pairs.get(key)));
    flush();
  });
  braidClient.data.on('delete', (key:string) => {
    affirmed[key] = true;
    cacheMap.set(`@b${key}`, undefined);
    flush();
  });
};

const loadSync = () => {
  const insertions = [];
  for (const keyString of Object.keys(localStorage)) {
    if (keyString.slice(0, 2) !== '@b') {
      continue;
    }
    const key = keyString.slice(2);
    if (cache[key]) {
      continue;
    }
    try {
      const valueString = localStorage.getItem(keyString);
      if (!valueString) {
        continue;
      }
      insertions.push([key, JSON.parse(valueString)]);
    } catch (error) {
      console.log(`Unable to parse localStorage value for ${key}`);
      console.error(error);
    }
  }
  braidClient.data.process([insertions, []]);
  setImmediate(() => {
    braidClient.data.on('affirm', (key:string) => {
      affirmed[key] = true;
    });
    braidClient.data.on('set', (key) => {
      affirmed[key] = true;
      cacheMap.set(`@b${key}`, JSON.stringify(braidClient.data.pairs.get(key)));
      flush();
    });
    braidClient.data.on('delete', (key) => {
      affirmed[key] = true;
      cacheMap.set(`@b${key}`, undefined);
      flush();
    });
  });
};

braidClient.data.on('set', (key:string, value:any) => {
  let cached;
  if (typeof value !== 'undefined') {
    cached = fromJS(value);
  }
  cache[key] = cached;
  const callbackSet = callbackMap.get(key);
  if (!callbackSet) {
    return;
  }
  for (const callback of callbackSet) { // eslint-disable-line no-restricted-syntax
    callback(cached);
  }
});

braidClient.data.on('delete', (key:string) => {
  delete cache[key];
  const callbackSet = callbackMap.get(key);
  if (!callbackSet) {
    return;
  }
  for (const callback of callbackSet) {
    callback();
  }
});

if (window && window.localStorage) {
  loadSync();
} else {
  loadAsync();
}

export const cachedValue = (key?: string) => { // eslint-disable-line consistent-return
  if (key) {
    return cache[key];
  }
};

const subscribeWithErrorHandler = async (key) => {
  for (let i = 1; i < 100; i += 1) {
    try {
      await braidClient.subscribe(key);
      return;
    } catch (error) {
      if (error.name === 'SubscribeError') {
        if (error.code === 403) {
          console.log(`User is not authorized to subscribe to ${key}`);
          return;
        }
        console.error(`Server error when subscribing to ${key} on attempt ${i}`);
      } else {
        console.log(`Error subscribing to ${key}: ${error.message}`);
        braidClient.emit('error', error);
        return;
      }
    }
    if (i < 6) {
      await new Promise((resolve) => setTimeout(resolve, i * i * 1000));
    } else {
      await new Promise((resolve) => setTimeout(resolve, 30000));
    }
    if (!callbackMap.has(key)) {
      return;
    }
  }
  braidClient.emit('error', new BoostCatastrophicError(`Unable to request key ${key}`));
};

export const cachedSubscribe = (key: string, callback: (any) => void) => {
  let callbackSet = callbackMap.get(key);
  if (callbackSet) {
    callbackSet.add(callback);
  } else {
    callbackSet = new Set([callback]);
    callbackMap.set(key, callbackSet);
    subscribeWithErrorHandler(key);
  }
  callback(cache[key]);
};

export const cachedUnsubscribe = (key:string, callback:(any) => void) => {
  const callbackSet = callbackMap.get(key);
  if (!callbackSet) {
    braidClient.unsubscribe(key);
    return;
  }
  callbackSet.delete(callback);
  if (callbackSet.size === 0) {
    delete affirmed[key];
    callbackMap.delete(key);
    braidClient.unsubscribe(key);
  }
};

export const getReduxChannel = (key: string, defaultValue?: any):EventChannel<any> => eventChannel((emit: Function) => {
  const handle = (value: any) => {
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

export const cachedSnapshot = (key:string, defaultValue?: any):Promise<any> => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    cachedUnsubscribe(key, handleValue);
    if (typeof defaultValue !== 'undefined') {
      resolve(defaultValue);
    } else {
      reject(new Error(`Snapshot timeout for ${key}`));
    }
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

export const snapshot = (key:string, defaultValue?: any):Promise<any> => {
  let callbackSet = callbackMap.get(key);
  if (callbackSet && affirmed[key]) {
    return cachedSnapshot(key, defaultValue);
  }
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      braidClient.removeListener('error', handleError);
      braidClient.data.removeListener('affirm', handleAffirm);
      cachedUnsubscribe(key, callback);
      reject(new Error(`Snapshot timeout for ${key}`));
    }, 5000);
    const callback = (value:any) => {
      clearTimeout(timeout);
      braidClient.removeListener('error', handleError);
      braidClient.data.removeListener('affirm', handleAffirm);
      cachedUnsubscribe(key, callback);
      resolve(value);
    };
    const handleError = (error:Error) => {
      clearTimeout(timeout);
      braidClient.removeListener('error', handleError);
      braidClient.data.removeListener('affirm', handleAffirm);
      cachedUnsubscribe(key, callback);
      reject(error);
    };
    const handleAffirm = (k:string, v:any) => {
      if (k !== key) {
        return;
      }
      clearTimeout(timeout);
      braidClient.removeListener('error', handleError);
      braidClient.data.removeListener('affirm', handleAffirm);
      cachedUnsubscribe(key, callback);
      const cached = cache[key];
      if (cached) {
        resolve(cached);
        return;
      }
      if (typeof v !== 'undefined') {
        resolve(fromJS(v));
        return;
      }
      resolve(undefined);
    };
    braidClient.on('error', handleError);
    callbackSet = new Set([callback]);
    callbackMap.set(key, callbackSet);
    braidClient.data.on('affirm', handleAffirm);
    subscribeWithErrorHandler(key);
  });
};

export const triggerDelete = (key:string) => {
  braidClient.data.delete(key);
};

