import { IDB_NAME, IDB_STORE_PHOTOS } from "../config.js";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE_PHOTOS)) {
        db.createObjectStore(IDB_STORE_PHOTOS, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbPutPhoto(blob) {
  const db = await openDB();
  const key = `photo_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_PHOTOS, "readwrite");
    tx.objectStore(IDB_STORE_PHOTOS).put({ key, blob, createdAt: Date.now() });
    tx.oncomplete = () => resolve(key);
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGetPhoto(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_PHOTOS, "readonly");
    const req = tx.objectStore(IDB_STORE_PHOTOS).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function idbDeletePhoto(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_PHOTOS, "readwrite");
    tx.objectStore(IDB_STORE_PHOTOS).delete(key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}