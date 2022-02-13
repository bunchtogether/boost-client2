// @flow

import { SubscribeError } from '@bunchtogether/braid-client';
import { braidClient, flushIgnorePrefixes } from './index';

let db;

(() => {
  const request = self.indexedDB.open('boost-03', 1);

  request.onupgradeneeded = function (e) {
    try {
      const insertionsObjectStore = e.target.result.createObjectStore('insertions', { keyPath: 'key' });
      insertionsObjectStore.createIndex('updated', 'updated', { unique: false });
    } catch (error) {
      if (!(error.name === 'ConstraintError')) {
        throw error;
      }
    }
  };

  request.onerror = (error) => {
    braidClient.logger.error('Unable to open database');
    braidClient.logger.errorStack(error);
  };

  request.onsuccess = function (event) {
    braidClient.logger.info('Opened cache database');
    db = event.target.result;
    _dequeueSubscriptions(true);
    requestIdleCallback(clearStaleItems);
  };
})();

const getReadOnlyInsertionsObjectStore = () => {
  if (typeof db === 'undefined') {
    return null;
  }
  const transaction = db.transaction(['insertions'], 'readonly', { durability: 'relaxed' });
  const objectStore = transaction.objectStore('insertions');
  return objectStore;
};

const getReadWriteInsertionsObjectStore = () => {
  if (typeof db === 'undefined') {
    return null;
  }
  const transaction = db.transaction(['insertions'], 'readwrite', { durability: 'relaxed' });
  const objectStore = transaction.objectStore('insertions');
  return objectStore;
};

const queuedInsertions = [];

let pendingStorageFlush = false;
const dequeueStorageOperations = () => {
  if (pendingStorageFlush) {
    return;
  }
  pendingStorageFlush = true;
  requestIdleCallback(() => {
    pendingStorageFlush = false;
    _dequeueStorageOperations();
  });
};

const _dequeueStorageOperations = () => { // eslint-disable-line no-underscore-dangle
  if (queuedInsertions.length === 0) {
    return;
  }
  const updated = Date.now();
  const insertionsObjectStore = getReadWriteInsertionsObjectStore();
  if (insertionsObjectStore !== null) {
    while (queuedInsertions.length > 0) {
      const [key, pair] = queuedInsertions.shift();
      if (!braidClient.subscriptions.has(key)) { // Do not update items loaded from cache without a subscription
        continue;
      }
      if (queuedInsertions.length > 0) {
        insertionsObjectStore.put({ key, pair, updated });
        continue;
      }
      // Only add a handler to the last item to accelerate the transaction
      const request = insertionsObjectStore.put({ key, pair, updated });
      request.onerror = (event) => {
        braidClient.logger.error(`Unable to put insertion ${key} into indexedDB`);
        console.error(event); // eslint-disable-line no-console
      };
    }
    insertionsObjectStore.transaction.commit();
  }
};

braidClient.on('process', ([insertions]) => {
  insertionLoop: // eslint-disable-line no-restricted-syntax,no-labels
  for (const item of insertions) {
    for (const prefix of flushIgnorePrefixes) {
      if (item[0].startsWith(prefix)) {
        continue insertionLoop; // eslint-disable-line no-labels
      }
    }
    queuedInsertions.push(item);
  }
  dequeueStorageOperations();
});

const processBraidData = braidClient.data.process.bind(braidClient.data);

braidClient.on('error', (error: Error | SubscribeError) => {
  if (!(error instanceof SubscribeError)) {
    return;
  }
  const { itemKey } = error;
  if (typeof itemKey !== 'string') {
    return;
  }
  if (typeof db === 'undefined') {
    return;
  }
  braidClient.logger.warn(`Removing ${itemKey} from indexedDB after subscribe error`);
  const insertionTransaction = db.transaction(['insertions'], 'readwrite', { durability: 'relaxed' });
  const insertionsObjectStore = insertionTransaction.objectStore('insertions');
  const insertionRequest = insertionsObjectStore.delete(itemKey);
  insertionRequest.onerror = function (event) {
    braidClient.logger.error(`Unable to remove insertion ${itemKey} from indexedDB`);
    console.error(event); // eslint-disable-line no-console
  };
  insertionTransaction.commit();
});

let dequeueRequested = false;
const dequeueSubscriptions = () => {
  if (dequeueRequested) {
    return;
  }
  dequeueRequested = true;
  queueMicrotask(() => {
    dequeueRequested = false;
    _dequeueSubscriptions(false);
  });
};

const queuedSubscriptions = [];

const sessionStart = Date.now();

const _dequeueSubscriptions = (getRecent:boolean) => { // eslint-disable-line no-underscore-dangle
  if (!getRecent && queuedSubscriptions.length === 0) {
    return;
  }

  const insertionsObjectStore = getReadOnlyInsertionsObjectStore();

  if (insertionsObjectStore === null) {
    return;
  }

  if (getRecent) {
    const lastSessionStartString = localStorage.getItem('BOOST_CACHE_TIMESTAMP');
    // $FlowFixMe
    const request = typeof lastSessionStartString === 'string' ? insertionsObjectStore.index('updated').getAll(IDBKeyRange.lowerBound(parseInt(lastSessionStartString, 10) - 1000 * 60 * 60 * 2)) : insertionsObjectStore.getAll();
    request.onsuccess = function () {
      const items = request.result;
      const insertions = [];
      for (const { key, pair } of items) {
        insertions.push([key, pair]);
      }
      processBraidData([insertions, []]);
      localStorage.setItem('BOOST_CACHE_TIMESTAMP', sessionStart.toString());
    };
    request.onerror = function (event) {
      braidClient.logger.error('Unable to get recent insertions from indexedDB');
      console.error(event); // eslint-disable-line no-console
    };
  }

  while (queuedSubscriptions.length > 0) {
    const key = queuedSubscriptions.shift();
    const insertionRequest = insertionsObjectStore.get(key);
    insertionRequest.onsuccess = function () {
      const item = insertionRequest.result;
      if (typeof item !== 'undefined') {
        if (braidClient.data.has(item.key)) {
          return;
        }
        processBraidData([[[item.key, item.pair]], []]);
      }
    };
    insertionRequest.onerror = function (event) {
      braidClient.logger.error(`Unable to get insertion ${key} from indexedDB`);
      console.error(event); // eslint-disable-line no-console
    };
  }
  insertionsObjectStore.transaction.commit();
};

braidClient.on('subscribe', (key) => {
  if (braidClient.data.has(key)) {
    return;
  }
  queuedSubscriptions.push(key);
  dequeueSubscriptions();
});

const clearStaleItems = () => { // eslint-disable-line no-underscore-dangle
  const insertionsObjectStore = getReadWriteInsertionsObjectStore();
  // $FlowFixMe
  const updatedKeyRange = IDBKeyRange.upperBound(Date.now() - 1000 * 60 * 60 * 24 * 7);
  if (insertionsObjectStore === null) {
    return;
  }
  const insertionsUpdatedIndex = insertionsObjectStore.index('updated');
  const insertionsRequest = insertionsUpdatedIndex.getAllKeys(updatedKeyRange);
  insertionsRequest.onsuccess = (event) => {
    for (const id of event.target.result) {
      insertionsObjectStore.delete(id);
    }
  };
  insertionsRequest.onerror = function (event) {
    braidClient.logger.error('Unable to clear stale insertions  from indexedDB');
    console.error(event); // eslint-disable-line no-console
  };
};

