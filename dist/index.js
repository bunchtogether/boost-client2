import { fromJS } from 'immutable';
import { eventChannel, buffers } from 'redux-saga';
import Client, { SubscribeError } from '@bunchtogether/braid-client';
import EventEmitter from 'events';
export { SubscribeError } from '@bunchtogether/braid-client';
const unsubscribeMap = new Map();
const callbackMap = new Map();
const errbackMap = new Map();
const cache = {};
const affirmed = {};
export const metricsEmitter = new EventEmitter();
export class BoostCatastrophicError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BoostCatastrophicError';
  }

}
export const flushIgnorePrefixes = new Set();
export const braidClient = new Client();
let braidClientOpen = Date.now();
braidClient.on('open', () => {
  braidClientOpen = Date.now();
});
braidClient.data.on('affirm', key => {
  affirmed[key] = true;
});
braidClient.data.on('set', (key, value) => {
  let cached;

  if (typeof value !== 'undefined') {
    cached = fromJS(value);
  }

  cache[key] = cached;
  const callbackSet = callbackMap.get(key);

  if (!callbackSet) {
    return;
  }

  for (const callback of callbackSet) {
    // eslint-disable-line no-restricted-syntax
    callback(cached);
  }
});
braidClient.data.on('delete', key => {
  delete cache[key];
  const callbackSet = callbackMap.get(key);

  if (!callbackSet) {
    return;
  }

  for (const callback of callbackSet) {
    callback();
  }
});

const subscribeWithErrorHandler = key => {
  braidClient.subscribe(key).catch(error => {
    const errbackSet = errbackMap.get(key);

    if (errbackSet) {
      for (const eb of errbackSet) {
        eb(error);
      }
    }

    if (error instanceof SubscribeError) {
      if (error.code === 403) {
        braidClient.logger.warn(`User is not authorized to subscribe to ${key}`); // eslint-disable-line no-console
      } else {
        braidClient.logger.error(`Server error when subscribing to ${key}`); // eslint-disable-line no-console
      }
    } else {
      braidClient.logger.error(`Error subscribing to ${key}: ${error.message}`); // eslint-disable-line no-console
    }

    braidClient.emit('error', error);
  });
};

export const cachedValue = key => {
  // eslint-disable-line consistent-return
  if (key) {
    return cache[key];
  }
};
const wrappedCallbacks = new Map();
const wrappedErrbacks = new Map();
export const cachedSubscribe = (key, callback, errback, skipInitialCallback = false) => {
  unsubscribeMap.delete(key);
  let callbackSet = callbackMap.get(key);
  const errbackSet = errbackMap.get(key);
  const start = Date.now();
  let receivedInitialValue = false;
  const webSocket = !!braidClient.ws;

  const wrappedCallback = value => {
    if (!receivedInitialValue && (typeof value !== 'undefined' || affirmed[key] === true)) {
      receivedInitialValue = true;
      metricsEmitter.emit('subscribe', key, Date.now() - start, {
        hasError: false,
        cached: false,
        skipInitialCallback,
        webSocketWait: webSocket ? 0 : braidClientOpen - start
      });
    }

    return callback(value);
  };

  wrappedCallbacks.set(callback, wrappedCallback);
  const wrappedErrback = typeof errback === 'function' ? error => {
    if (!receivedInitialValue) {
      receivedInitialValue = true;
      metricsEmitter.emit('subscribe', key, Date.now() - start, {
        hasError: true,
        cached: false,
        skipInitialCallback,
        error: error.message,
        webSocketWait: webSocket ? 0 : braidClientOpen - start
      });
    }

    return errback(error);
  } : error => {
    if (!receivedInitialValue) {
      receivedInitialValue = true;
      metricsEmitter.emit('subscribe', key, Date.now() - start, {
        hasError: true,
        cached: false,
        skipInitialCallback,
        error: error.message,
        webSocketWait: webSocket ? 0 : braidClientOpen - start
      });
    }
  };
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
    metricsEmitter.emit('subscribe', key, Date.now() - start, {
      hasError: false,
      cached: true,
      skipInitialCallback,
      webSocketWait: 0
    });
  }

  if (!skipInitialCallback) {
    callback(cached);
  }
};
let unsubscribeInterval;

const unsubscribeCheck = () => {
  const now = Date.now();

  for (const [key, time] of unsubscribeMap) {
    if (now - time < 10000) {
      continue;
    }

    unsubscribeMap.delete(key);
    delete affirmed[key];
    callbackMap.delete(key);
    braidClient.unsubscribe(key);
  }

  if (unsubscribeMap.size === 0) {
    clearInterval(unsubscribeInterval);
    unsubscribeInterval = undefined;
  }
};

export const cachedUnsubscribe = (key, callback, errback) => {
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
    unsubscribeMap.set(key, Date.now());

    if (!unsubscribeInterval) {
      unsubscribeInterval = setInterval(unsubscribeCheck, 5000);
    }
  }
};
export const getReduxChannel = (key, defaultValue) => {
  const errorStack = process.env.NODE_ENV !== 'production' ? new Error().stack : undefined;
  return eventChannel(emit => {
    const handleValue = value => {
      if (typeof value !== 'undefined') {
        emit(value);
      } else if (typeof defaultValue !== 'undefined') {
        emit(defaultValue);
      }
    };

    const handleError = error => {
      if (process.env.NODE_ENV !== 'production') {
        if (error instanceof SubscribeError) {
          const originalStack = error.stack;

          if (typeof errorStack === 'string') {
            if (typeof originalStack === 'string') {
              error.stack = [originalStack.split('\n')[0], ...errorStack.split('\n').slice(1)].join('\n'); // eslint-disable-line no-param-reassign
            } else {
              error.stack = [`SubscribeError: Error for ${key}`, ...errorStack.split('\n').slice(1)].join('\n'); // eslint-disable-line no-param-reassign
            }

            braidClient.logger.errorStack(error);
          }
        }
      }

      emit(error);
    };

    cachedSubscribe(key, handleValue, handleError);
    return () => {
      cachedUnsubscribe(key, handleValue, handleError);
    };
  }, buffers.expanding(2));
};
export const cachedSnapshot = async (key, defaultValue) => {
  const cached = cache[key];

  if (typeof cached !== 'undefined' || affirmed[key] === true) {
    metricsEmitter.emit('snapshot', key, 0, {
      hasError: false,
      cached: true,
      webSocketWait: 0
    });

    if (typeof cached === 'undefined') {
      return defaultValue;
    }

    return cached;
  }

  return snapshot(key, defaultValue);
};
export const snapshot = async (key, defaultValue) => {
  const start = Date.now();
  const errorStack = process.env.NODE_ENV !== 'production' ? new Error().stack : undefined;
  let receivedInitialValue = false;
  const webSocket = !!braidClient.ws;
  const initialCached = cache[key];

  if (braidClient.confirmedSubscriptions.has(key) && (typeof initialCached !== 'undefined' || affirmed[key])) {
    metricsEmitter.emit('snapshot', key, Date.now() - start, {
      hasError: false,
      cached: true,
      webSocketWait: 0
    });

    if (typeof initialCached === 'undefined') {
      return defaultValue;
    }

    return initialCached;
  }

  return new Promise((resolve, reject) => {
    const handleValue = value => {
      braidClient.data.removeListener('affirm', handleAffirm);
      cachedUnsubscribe(key, handleValue, handleError);

      if (typeof value === 'undefined') {
        resolve(defaultValue);
      } else {
        resolve(value);
      }
    };

    const handleError = error => {
      if (process.env.NODE_ENV !== 'production') {
        if (error instanceof SubscribeError) {
          const originalStack = error.stack;

          if (typeof errorStack === 'string') {
            if (typeof originalStack === 'string') {
              error.stack = [originalStack.split('\n')[0], ...errorStack.split('\n').slice(1)].join('\n'); // eslint-disable-line no-param-reassign
            } else {
              error.stack = [`SubscribeError: Error for ${key}`, ...errorStack.split('\n').slice(1)].join('\n'); // eslint-disable-line no-param-reassign
            }

            braidClient.logger.errorStack(error);
          }
        }
      }

      braidClient.data.removeListener('affirm', handleAffirm);
      cachedUnsubscribe(key, handleValue, handleError);
      reject(error);
    };

    const handleAffirm = (k, v) => {
      if (k !== key) {
        return;
      }

      braidClient.data.removeListener('affirm', handleAffirm);

      if (!receivedInitialValue) {
        receivedInitialValue = true;
        metricsEmitter.emit('snapshot', key, Date.now() - start, {
          hasError: false,
          cached: false,
          webSocketWait: webSocket ? 0 : braidClientOpen - start
        });
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
    unsubscribeMap.delete(key);

    const wrappedErrback = error => {
      if (!receivedInitialValue) {
        receivedInitialValue = true;
        metricsEmitter.emit('snapshot', key, Date.now() - start, {
          hasError: true,
          cached: false,
          error: error.message,
          webSocketWait: webSocket ? 0 : braidClientOpen - start
        });
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

    const wrappedCallback = value => {
      if (!receivedInitialValue && (typeof value !== 'undefined' || affirmed[key] === true)) {
        receivedInitialValue = true;
        metricsEmitter.emit('snapshot', key, Date.now() - start, {
          hasError: false,
          cached: false,
          webSocketWait: webSocket ? 0 : braidClientOpen - start
        });
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
export const triggerDelete = key => {
  braidClient.data.delete(key);
};
//# sourceMappingURL=index.js.map