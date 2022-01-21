// @flow

import { SubscribeError } from '@bunchtogether/braid-client';
import { braidClient, flushIgnorePrefixes } from './index';

let db;

const insertionIdSet = new Set();

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
    dequeueStorageOperations();
    getRecentlyUpdatedItems();
  };
})();

const getReadOnlyInsertionsObjectStore = () => {
  if (typeof db === 'undefined') {
    return null;
  }
  const transaction = db.transaction(['insertions'], 'readonly', { durability: 'relaxed' });
  const objectStore = transaction.objectStore('insertions');
  transaction.onabort = (event) => {
    braidClient.logger.error('Read only insertions transaction was aborted');
    console.error(event); // eslint-disable-line no-console
  };
  transaction.onerror = (event) => {
    braidClient.logger.error('Error in read only insertions transaction');
    console.error(event); // eslint-disable-line no-console
  };
  return objectStore;
};

const getReadWriteInsertionsObjectStore = () => {
  if (typeof db === 'undefined') {
    return null;
  }
  const transaction = db.transaction(['insertions'], 'readwrite', { durability: 'relaxed' });
  const objectStore = transaction.objectStore('insertions');
  transaction.onabort = (event) => {
    braidClient.logger.error('Read only insertions transaction was aborted');
    console.error(event); // eslint-disable-line no-console
  };
  transaction.onerror = (event) => {
    braidClient.logger.error('Error in read only insertions transaction');
    console.error(event); // eslint-disable-line no-console
  };
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
    if (insertionIdSet.has(item[1][0])) {
      insertionIdSet.delete(item[1][0]);
      return;
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

const queuedSubscriptions = [];

const dequeueSubscriptions = () => { // eslint-disable-line no-underscore-dangle
  const insertionsObjectStore = getReadOnlyInsertionsObjectStore();
  if (insertionsObjectStore === null) {
    return null;
  }
  while (queuedSubscriptions.length > 0) {
    const key = queuedSubscriptions.shift();
    const insertionRequest = insertionsObjectStore.get(key);
    insertionRequest.onsuccess = function () {
      const item = insertionRequest.result;
      if (typeof item !== 'undefined') {
        processBraidData([[[item.key, item.pair]], []]);
        insertionIdSet.add(item.pair[0]);
      }
    };
    insertionRequest.onerror = function (event) {
      braidClient.logger.error(`Unable to get insertion ${key} from indexedDB`);
      console.error(event); // eslint-disable-line no-console
    };
  }
  insertionsObjectStore.transaction.commit();
  return null;
};

braidClient.on('subscribe', (key) => {
  if (braidClient.data.has(key)) {
    return;
  }
  queuedSubscriptions.push(key);
  dequeueSubscriptions();
});

const getRecentlyUpdatedItems = () => { // eslint-disable-line no-underscore-dangle
  const insertionsObjectStore = getReadOnlyInsertionsObjectStore();
  // $FlowFixMe
  const updatedKeyRange = IDBKeyRange.lowerBound(Date.now() - 1000 * 60 * 60 * 24);
  if (insertionsObjectStore === null) {
    return;
  }
  const insertionsUpdatedIndex = insertionsObjectStore.index('updated');
  const insertionsRequest = insertionsUpdatedIndex.getAll(updatedKeyRange);
  insertionsRequest.onsuccess = (event) => {
    const items = event.target.result;
    const insertions = items.map((x) => [x.key, x.pair]);
    processBraidData([insertions, []]);
    // $FlowFixMe
    requestIdleCallback(clearStaleItems);
  };
  insertionsRequest.onerror = function (event) {
    braidClient.logger.error('Unable to get insertions within the last day from indexedDB');
    console.error(event); // eslint-disable-line no-console
  };
  insertionsObjectStore.transaction.commit();
};

const clearStaleItems = () => { // eslint-disable-line no-underscore-dangle
  const insertionsObjectStore = getReadOnlyInsertionsObjectStore();
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
  insertionsObjectStore.transaction.commit();
};

