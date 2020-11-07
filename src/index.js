// @flow

import type { EventChannel } from 'redux-saga';
import { fromJS } from 'immutable';
import { eventChannel } from 'redux-saga';
import Client from '@bunchtogether/braid-client';
import AsyncStorage from '@callstack/async-storage';


const callbackMap:Map<string, Set<(any) => void>> = new Map();
const errbackMap:Map<string, Set<(Error) => void>> = new Map();
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

const subscribeWithErrorHandler = (key:string) => {
  braidClient.subscribe(key).catch((error) => {
    const errbackSet = errbackMap.get(key);
    if (errbackSet) {
      for (const eb of errbackSet) {
        eb(error);
      }
    }
    if (error.name === 'SubscribeError') {
      if (error.code === 403) {
        console.log(`User is not authorized to subscribe to ${key}`);
      }
      console.error(`Server error when subscribing to ${key}`);
    } else {
      console.log(`Error subscribing to ${key}: ${error.message}`);
    }
    braidClient.emit('error', error);
  });
};

export const cachedValue = (key?: string) => { // eslint-disable-line consistent-return
  if (key) {
    return cache[key];
  }
};

export const cachedSubscribe = (key: string, callback: (any) => void, errback?: (Error) => void) => {
  let callbackSet = callbackMap.get(key);
  const errbackSet = errbackMap.get(key);
  if (callbackSet) {
    callbackSet.add(callback);
    if (typeof errback === 'function') {
      if (errbackSet) {
        errbackSet.add(errback);
      } else {
        errbackMap.set(key, new Set([errback]));
      }
    }
  } else {
    callbackSet = new Set([callback]);
    callbackMap.set(key, callbackSet);
    if (typeof errback === 'function') {
      if (errbackSet) {
        errbackSet.add(errback);
      } else {
        errbackMap.set(key, new Set([errback]));
      }
    }
    subscribeWithErrorHandler(key);
  }
  callback(cache[key]);
};

export const cachedUnsubscribe = (key:string, callback:(any) => void, errback?: (Error) => void) => {
  const errbackSet = errbackMap.get(key);
  if (typeof errback === 'function' && errbackSet) {
    errbackSet.delete(errback);
    if (errbackSet.size === 0) {
      errbackMap.delete(key);
    }
  }
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
  const handleValue = (value: any) => {
    if (typeof value !== 'undefined') {
      emit(value);
    } else if (typeof defaultValue !== 'undefined') {
      emit(defaultValue);
    }
  };
  const handleError = (error: Error) => {
    emit(error);
  };
  setImmediate(() => {
    cachedSubscribe(key, handleValue, handleError);
  });
  return () => {
    cachedUnsubscribe(key, handleValue, handleError);
  };
});

export const cachedSnapshot = async (key:string, defaultValue?: any):Promise<any> => {
  if (typeof cache[key] !== 'undefined') {
    return cache[key];
  }
  return snapshot(key, defaultValue);
};

export const snapshot = async (key:string, defaultValue?: any):Promise<any> => {
  if (affirmed[key]) {
    if (typeof cache[key] === 'undefined') {
      return defaultValue;
    }
    return cache[key];
  }
  return new Promise((resolve, reject) => {
    const handleValue = (value:any) => {
      braidClient.data.removeListener('affirm', handleAffirm);
      cachedUnsubscribe(key, handleValue, handleError);
      if (typeof value === 'undefined') {
        resolve(defaultValue);
      } else {
        resolve(value);
      }
    };
    const handleError = (error: Error) => {
      braidClient.data.removeListener('affirm', handleAffirm);
      cachedUnsubscribe(key, handleValue, handleError);
      reject(error);
    };
    const handleAffirm = (k:string, v:any) => {
      if (k !== key) {
        return;
      }
      braidClient.data.removeListener('affirm', handleAffirm);
      cachedUnsubscribe(key, handleValue, handleError);
      const cached = cache[key];
      if (typeof cached !== 'undefined') {
        resolve(cached);
        return;
      }
      if (typeof v !== 'undefined') {
        const immutableValue = fromJS(v);
        cache[key] = immutableValue;
        resolve(immutableValue);
        return;
      }
      resolve(defaultValue);
    };
    braidClient.data.on('affirm', handleAffirm);
    let errbackSet = errbackMap.get(key);
    if (!errbackSet) {
      errbackSet = new Set();
      errbackMap.set(key, errbackSet);
    }
    errbackSet.add(handleError);
    let callbackSet = callbackMap.get(key);
    if (callbackSet) {
      callbackSet.add(handleValue);
      return;
    }
    callbackSet = new Set([handleValue]);
    callbackMap.set(key, callbackSet);
    subscribeWithErrorHandler(key);
  });
};

export const triggerDelete = (key:string) => {
  braidClient.data.delete(key);
};

