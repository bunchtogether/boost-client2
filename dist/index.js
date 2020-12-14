//      

                                               
import { fromJS } from 'immutable';
import { eventChannel, buffers } from 'redux-saga';
import Client from '@bunchtogether/braid-client';
import AsyncStorage from '@callstack/async-storage';
import EventEmitter from 'events';

const callbackMap                                 = new Map();
const errbackMap                                   = new Map();
const cache = {};
const affirmed = {};

export const metricsEmitter = new EventEmitter();

export class BoostCatastrophicError extends Error {
  constructor(message       ) {
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
  braidClient.data.on('affirm', (key       ) => {
    affirmed[key] = true;
  });
  braidClient.data.on('set', (key       ) => {
    affirmed[key] = true;
    cacheMap.set(`@b${key}`, JSON.stringify(braidClient.data.pairs.get(key)));
    flush();
  });
  braidClient.data.on('delete', (key       ) => {
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
    braidClient.data.on('affirm', (key       ) => {
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

braidClient.data.on('set', (key       , value    ) => {
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

braidClient.data.on('delete', (key       ) => {
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
  const start = Date.now();
  loadSync();
  metricsEmitter.emit('load', Date.now() - start, { hasError: false });
} else {
  const start = Date.now();
  loadAsync().then(() => {
    metricsEmitter.emit('load', Date.now() - start, { hasError: false });
  }).catch((error      ) => {
    metricsEmitter.emit('load', Date.now() - start, { hasError: true, error: error.message });
  });
}

const subscribeWithErrorHandler = (key       ) => {
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

export const cachedValue = (key         ) => { // eslint-disable-line consistent-return
  if (key) {
    return cache[key];
  }
};

const wrappedCallbacks = new Map();
const wrappedErrbacks = new Map();

export const cachedSubscribe = (key        , callback               , errback                  , skipInitialCallback           = false) => {
  let callbackSet = callbackMap.get(key);
  const errbackSet = errbackMap.get(key);
  const start = Date.now();
  let receivedInitialValue = false;
  const wrappedCallback = (value    ) => {
    if (!receivedInitialValue && (typeof value !== 'undefined' || affirmed[key] === true)) {
      receivedInitialValue = true;
      metricsEmitter.emit('subscribe', key, Date.now() - start, { hasError: false, cached: false, skipInitialCallback });
    }
    return callback(value);
  };
  wrappedCallbacks.set(callback, wrappedCallback);
  const wrappedErrback = typeof errback === 'function' ? ((error      ) => {
    if (!receivedInitialValue) {
      receivedInitialValue = true;
      metricsEmitter.emit('subscribe', key, Date.now() - start, { hasError: true, cached: false, skipInitialCallback, error: error.message });
    }
    return errback(error);
  }) : ((error      ) => {
    if (!receivedInitialValue) {
      receivedInitialValue = true;
      metricsEmitter.emit('subscribe', key, Date.now() - start, { hasError: true, cached: false, skipInitialCallback, error: error.message });
    }
  });
  wrappedErrbacks.set(errback || callback, wrappedErrback);
  if (errbackSet) {
    errbackSet.add(wrappedErrback);
  } else {
    errbackMap.set(key, new Set([wrappedErrback]));
  }
  if (callbackSet) {
    callbackSet.add(wrappedCallback);
  } else {
    callbackSet = new Set([wrappedCallback]);
    callbackMap.set(key, callbackSet);
    subscribeWithErrorHandler(key);
  }
  const cached = cache[key];
  if (typeof cached !== 'undefined' || affirmed[key] === true) {
    receivedInitialValue = true;
    metricsEmitter.emit('subscribe', key, Date.now() - start, { hasError: false, cached: true, skipInitialCallback });
  }
  if (!skipInitialCallback) {
    callback(cached);
  }
};

export const cachedUnsubscribe = (key       , callback              , errback                  ) => {
  const errbackSet = errbackMap.get(key);
  if (errbackSet) {
    const wrappedErrback = wrappedErrbacks.get(errback || callback);
    if (typeof wrappedErrback !== 'function') {
      throw new Error(`Wrapped errback does not exist for ${key}`);
    }
    errbackSet.delete(wrappedErrback);
    if (errbackSet.size === 0) {
      errbackMap.delete(key);
    }
  }
  const callbackSet = callbackMap.get(key);
  if (!callbackSet) {
    braidClient.unsubscribe(key);
    return;
  }
  const wrappedCallback = wrappedCallbacks.get(callback);
  if (typeof wrappedCallback !== 'function') {
    throw new Error(`Wrapped callback does not exist for ${key}`);
  }
  callbackSet.delete(wrappedCallback);
  if (callbackSet.size === 0) {
    delete affirmed[key];
    callbackMap.delete(key);
    braidClient.unsubscribe(key);
  }
};

export const getReduxChannel = (key        , defaultValue      )                   => eventChannel((emit          ) => {
  const handleValue = (value     ) => {
    if (typeof value !== 'undefined') {
      emit(value);
    } else if (typeof defaultValue !== 'undefined') {
      emit(defaultValue);
    }
  };
  const handleError = (error       ) => {
    emit(error);
  };
  cachedSubscribe(key, handleValue, handleError);
  return () => {
    cachedUnsubscribe(key, handleValue, handleError);
  };
}, buffers.expanding(2));

export const cachedSnapshot = async (key       , defaultValue      )              => {
  const cached = cache[key];
  if (typeof cached !== 'undefined' || affirmed[key] === true) {
    metricsEmitter.emit('snapshot', key, 0, { hasError: false, cached: true });
    if (typeof cached !== 'undefined') {
      return defaultValue;
    }
    return cached;
  }
  return snapshot(key, defaultValue);
};

export const snapshot = async (key       , defaultValue      )              => {
  const start = Date.now();
  let receivedInitialValue = false;
  if (affirmed[key]) {
    metricsEmitter.emit('snapshot', key, Date.now() - start, { hasError: false, cached: true });
    if (typeof cache[key] === 'undefined') {
      return defaultValue;
    }
    return cache[key];
  }
  return new Promise((resolve, reject) => {
    const handleValue = (value    ) => {
      braidClient.data.removeListener('affirm', handleAffirm);
      cachedUnsubscribe(key, handleValue, handleError);
      if (typeof value === 'undefined') {
        resolve(defaultValue);
      } else {
        resolve(value);
      }
    };
    const handleError = (error       ) => {
      braidClient.data.removeListener('affirm', handleAffirm);
      cachedUnsubscribe(key, handleValue, handleError);
      reject(error);
    };
    const handleAffirm = (k       , v    ) => {
      if (k !== key) {
        return;
      }
      braidClient.data.removeListener('affirm', handleAffirm);
      if (!receivedInitialValue) {
        receivedInitialValue = true;
        metricsEmitter.emit('snapshot', key, Date.now() - start, { hasError: false, cached: false });
      }
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
    const wrappedErrback = (error      ) => {
      if (!receivedInitialValue) {
        receivedInitialValue = true;
        metricsEmitter.emit('snapshot', key, Date.now() - start, { hasError: true, cached: false, error: error.message });
      }
      return handleError(error);
    };
    wrappedErrbacks.set(handleError, wrappedErrback);
    let errbackSet = errbackMap.get(key);
    if (!errbackSet) {
      errbackSet = new Set();
      errbackMap.set(key, errbackSet);
    }
    errbackSet.add(wrappedErrback);
    const wrappedCallback = (value    ) => {
      if (!receivedInitialValue && (typeof value !== 'undefined' || affirmed[key] === true)) {
        receivedInitialValue = true;
        metricsEmitter.emit('snapshot', key, Date.now() - start, { hasError: false, cached: false });
      }
      return handleValue(value);
    };
    wrappedCallbacks.set(handleValue, wrappedCallback);
    let callbackSet = callbackMap.get(key);
    if (callbackSet) {
      callbackSet.add(wrappedCallback);
      return;
    }
    callbackSet = new Set([wrappedCallback]);
    callbackMap.set(key, callbackSet);
    subscribeWithErrorHandler(key);
  });
};

export const triggerDelete = (key       ) => {
  braidClient.data.delete(key);
};

