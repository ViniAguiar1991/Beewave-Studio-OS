/**
 * Local IndexedDB cache for high-resolution, uncompressed task media assets.
 * Bypasses the 5MB browser localStorage limit so original quality is preserved locally.
 */

const DB_NAME = 'beewave_media_store_v1';
const STORE_NAME = 'task_files';
const DB_VERSION = 1;

const memoryCache = new Map<string, string>();

let dbPromise: Promise<IDBDatabase | null> | null = null;

function getDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'fileId' });
          }
        };
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = (err) => {
          console.warn('IndexedDB open error, falling back to memory cache:', err);
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB initialization failed:', err);
        resolve(null);
      }
    });
  }
  return dbPromise;
}

export async function saveFileToLocalDb(
  fileId: string,
  dataUrl: string,
  metadata?: { name?: string; type?: string; size?: number; taskId?: string }
): Promise<void> {
  if (!fileId || !dataUrl) return;
  memoryCache.set(fileId, dataUrl);

  const db = await getDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({
        fileId,
        dataUrl,
        name: metadata?.name || '',
        type: metadata?.type || '',
        size: metadata?.size || 0,
        taskId: metadata?.taskId || '',
        updatedAt: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getFileFromLocalDb(fileId: string): Promise<string | null> {
  if (!fileId) return null;
  if (memoryCache.has(fileId)) {
    return memoryCache.get(fileId) || null;
  }

  const db = await getDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(fileId);
      request.onsuccess = () => {
        if (request.result?.dataUrl) {
          memoryCache.set(fileId, request.result.dataUrl);
          resolve(request.result.dataUrl);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function deleteFileFromLocalDb(fileId: string): Promise<void> {
  if (!fileId) return;
  memoryCache.delete(fileId);

  const db = await getDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(fileId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
