// @flow

import { SubscribeError } from '@bunchtogether/braid-client';
import { braidClient, cachedValue, flushIgnorePrefixes } from './index';

let db;

(() => {
  const request = self.indexedDB.open('boost-02', 1);

  request.onupgradeneeded = function (e) {
    try {
      const insertionsObjectStore = e.target.result.createObjectStore('insertions', { keyPath: 'key' });
      insertionsObjectStore.createIndex('updated', 'updated', { unique: false });
    } catch (error) {
      if (!(error.name === 'ConstraintError')) {
        throw error;
      }
    }
    try {
      const deletionsObjectStore = e.target.result.createObjectStore('deletions', { keyPath: 'key' });
      deletionsObjectStore.createIndex('updated', 'updated', { unique: false });
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
  const transaction = db.transaction(['insertions'], 'readonly');
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

const getReadOnlyDeletionsObjectStore = () => {
  if (typeof db === 'undefined') {
    return null;
  }
  const transaction = db.transaction(['deletions'], 'readonly');
  const objectStore = transaction.objectStore('deletions');
  transaction.onabort = (event) => {
    braidClient.logger.error('Read only deletions transaction was aborted');
    console.error(event); // eslint-disable-line no-console
  };
  transaction.onerror = (event) => {
    braidClient.logger.error('Error in read only deletions transaction');
    console.error(event); // eslint-disable-line no-console
  };
  return objectStore;
};

const getReadWriteInsertionsObjectStore = () => {
  if (typeof db === 'undefined') {
    return null;
  }
  const transaction = db.transaction(['insertions'], 'readwrite');
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

const getReadWriteDeletionsObjectStore = () => {
  if (typeof db === 'undefined') {
    return null;
  }
  const transaction = db.transaction(['deletions'], 'readwrite');
  const objectStore = transaction.objectStore('deletions');
  transaction.onabort = (event) => {
    braidClient.logger.error('Read only deletions transaction was aborted');
    console.error(event); // eslint-disable-line no-console
  };
  transaction.onerror = (event) => {
    braidClient.logger.error('Error in read only deletions transaction');
    console.error(event); // eslint-disable-line no-console
  };
  return objectStore;
};

const queuedInsertions = [];
const queuedDeletions = [];


let pendingStorageFlush = false;
const dequeueStorageOperations = () => {
  if (pendingStorageFlush) {
    return;
  }
  pendingStorageFlush = true;
  requestAnimationFrame(() => {
    pendingStorageFlush = false;
    _dequeueStorageOperations();
  });
};

const _dequeueStorageOperations = () => { // eslint-disable-line no-underscore-dangle
  if (queuedDeletions.length > 0) {
    const deletionsObjectStore = getReadWriteDeletionsObjectStore();
    if (deletionsObjectStore !== null) {
      while (queuedDeletions.length > 0) {
        const [id, key] = queuedDeletions.shift();
        if (queuedDeletions.length > 0) {
          deletionsObjectStore.put({ key, id, updated: Date.now() });
          continue;
        }
        // Only add a handler to the last item to accelerate the transaction
        const request = deletionsObjectStore.put({ key, id, updated: Date.now() });
        request.onerror = (event) => {
          braidClient.logger.error(`Unable to put deletion ${key} into indexedDB`);
          console.error(event); // eslint-disable-line no-console
        };
      }
    }
  }
  if (queuedInsertions.length > 0) {
    const insertionsObjectStore = getReadWriteInsertionsObjectStore();
    if (insertionsObjectStore !== null) {
      while (queuedInsertions.length > 0) {
        const [key, pair] = queuedInsertions.shift();
        if (queuedInsertions.length > 0) {
          insertionsObjectStore.put({ key, pair, updated: Date.now() });
          continue;
        }
        // Only add a handler to the last item to accelerate the transaction
        const request = insertionsObjectStore.put({ key, pair, updated: Date.now() });
        request.onerror = (event) => {
          braidClient.logger.error(`Unable to put insertion ${key} into indexedDB`);
          console.error(event); // eslint-disable-line no-console
        };
      }
    }
  }
};

braidClient.on('process', ([insertions, deletions]) => {
  insertionLoop: // eslint-disable-line no-restricted-syntax,no-labels
  for (const item of insertions) {
    for (const prefix of flushIgnorePrefixes) {
      if (item[0].startsWith(prefix)) {
        continue insertionLoop; // eslint-disable-line no-labels
      }
    }
    queuedInsertions.push(item);
  }

  deletionLoop: // eslint-disable-line no-restricted-syntax,no-labels
  for (const item of deletions) {
    for (const prefix of flushIgnorePrefixes) {
      if (item[1].startsWith(prefix)) {
        continue deletionLoop; // eslint-disable-line no-labels
      }
    }
    queuedDeletions.push(item);
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
  const insertionTransaction = db.transaction(['insertions'], 'readwrite');
  const insertionsObjectStore = insertionTransaction.objectStore('insertions');
  const insertionRequest = insertionsObjectStore.delete(itemKey);
  insertionRequest.onerror = function (event) {
    braidClient.logger.error(`Unable to remove insertion ${itemKey} from indexedDB`);
    console.error(event); // eslint-disable-line no-console
  };
  const deletionTransaction = db.transaction(['deletions'], 'readwrite');
  const deletionsObjectStore = deletionTransaction.objectStore('deletions');
  const deletionRequest = deletionsObjectStore.delete(itemKey);
  deletionRequest.onerror = function (event) {
    braidClient.logger.error(`Unable to remove deletion ${itemKey} from indexedDB`);
    console.error(event); // eslint-disable-line no-console
  };
});

const queuedSubscriptions = [];

let pendingSubscriptionsFlush = false;
const dequeueSubscriptions = () => {
  if (pendingSubscriptionsFlush) {
    return;
  }
  pendingSubscriptionsFlush = true;
  // $FlowFixMe
  queueMicrotask(() => {
    pendingSubscriptionsFlush = false;
    _dequeueSubscriptions();
  });
};

const _dequeueSubscriptions = () => { // eslint-disable-line no-underscore-dangle
  const insertionsObjectStore = getReadOnlyInsertionsObjectStore();
  const deletionsObjectStore = getReadOnlyDeletionsObjectStore();
  if (insertionsObjectStore === null) {
    return null;
  }
  if (deletionsObjectStore === null) {
    return null;
  }
  while (queuedSubscriptions.length > 0) {
    const key = queuedSubscriptions.shift();
    const insertionRequest = insertionsObjectStore.get(key);
    const insertionPromise = new Promise((resolve) => {
      insertionRequest.onsuccess = function () {
        const item = insertionRequest.result;
        if (typeof item !== 'undefined') {
          resolve([[item.key, item.pair]]);
        } else {
          resolve([]);
        }
      };
      insertionRequest.onerror = function (event) {
        braidClient.logger.error(`Unable to get insertion ${key} from indexedDB`);
        console.error(event); // eslint-disable-line no-console
        resolve([]);
      };
    });
    const deletionRequest = deletionsObjectStore.get(key);
    const deletionPromise = new Promise((resolve) => {
      deletionRequest.onsuccess = function () {
        const item = deletionRequest.result;
        if (typeof item !== 'undefined') {
          resolve([[item.id, item.key]]);
        } else {
          resolve([]);
        }
      };
      deletionRequest.onerror = function (event) {
        braidClient.logger.error(`Unable to get deletion ${key} from indexedDB`);
        console.error(event); // eslint-disable-line no-console
        resolve([]);
      };
    });
    Promise.all([insertionPromise, deletionPromise]).then(processBraidData);
  }
  return null;
};

braidClient.on('subscribe', (key) => {
  if (typeof cachedValue(key) !== 'undefined') {
    return;
  }
  queuedSubscriptions.push(key);
  dequeueSubscriptions();
});

const getRecentlyUpdatedItems = () => { // eslint-disable-line no-underscore-dangle
  const insertionsObjectStore = getReadOnlyInsertionsObjectStore();
  const deletionsObjectStore = getReadOnlyDeletionsObjectStore();
  // $FlowFixMe
  const updatedKeyRange = IDBKeyRange.lowerBound(Date.now() - 1000 * 60 * 60 * 24);
  if (insertionsObjectStore === null) {
    return null;
  }
  if (deletionsObjectStore === null) {
    return null;
  }
  const insertionsUpdatedIndex = insertionsObjectStore.index('updated');
  const insertionsPromise = new Promise((resolve) => {
    const insertions = [];
    const request = insertionsUpdatedIndex.openCursor(updatedKeyRange);
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        insertions.push([cursor.value.key, cursor.value.pair]);
        cursor.continue();
      } else {
        resolve(insertions);
      }
    };
    request.onerror = function (event) {
      braidClient.logger.error('Unable to get insertions within the last day from indexedDB');
      console.error(event); // eslint-disable-line no-console
      resolve(insertions);
    };
  });
  const deletionsUpdatedIndex = deletionsObjectStore.index('updated');
  const deletionsPromise = new Promise((resolve) => {
    const deletions = [];
    const request = deletionsUpdatedIndex.openCursor(updatedKeyRange);
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        deletions.push([cursor.value.id, cursor.value.key]);
        cursor.continue();
      } else {
        resolve(deletions);
      }
    };
    request.onerror = function (event) {
      braidClient.logger.error('Unable to get deletions within the last day from indexedDB');
      console.error(event); // eslint-disable-line no-console
      resolve(deletions);
    };
  });
  Promise.all([insertionsPromise, deletionsPromise]).then(processBraidData);
  return null;
};

