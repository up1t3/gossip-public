// frontend/src/core/storage/outbox-media-store.ts

/**
 * OutboxMediaStore (Milestone M2, R3.2)
 * Долговременное персистентное хранилище бинарных медиафайлов (Blob / ArrayBuffer)
 * для очереди отправки Outbox на базе IndexedDB с in-memory fallback для сред без браузера.
 */

export interface StoredMediaRecord {
  id: string;          // tempId сообщения (например, "temp-1718000000000")
  blob: Blob;          // Бинарные данные медиафайла
  mimeType: string;    // MIME-тип (audio/ogg, video/webm, image/jpeg и т.д.)
  fileName: string;    // Имя файла
  createdAt: number;   // Timestamp сохранения
}

const DB_NAME = 'gossip_outbox_media';
const DB_VERSION = 1;
const STORE_NAME = 'blobs';

export class OutboxMediaStore {
  private static instance: OutboxMediaStore;
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private memoryStore: Map<string, StoredMediaRecord> = new Map();

  private constructor() {}

  public static getInstance(): OutboxMediaStore {
    if (!OutboxMediaStore.instance) {
      OutboxMediaStore.instance = new OutboxMediaStore();
    }
    return OutboxMediaStore.instance;
  }

  private async getDB(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') {
      return null;
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
        try {
          const request = indexedDB.open(DB_NAME, DB_VERSION);

          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
          };

          request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
          };

          request.onerror = (err) => {
            console.warn('[OutboxMediaStore] Ошибка открытия IndexedDB, fallback на память:', err);
            resolve(null);
          };
        } catch (e) {
          console.warn('[OutboxMediaStore] Исключение при инициализации IndexedDB:', e);
          resolve(null);
        }
      });
    }

    return this.dbPromise;
  }

  /**
   * Сохраняет бинарный Blob медиафайла по идентификатору сообщения.
   */
  public async saveMedia(
    id: string,
    blob: Blob,
    fileName: string = 'media_blob',
    mimeType?: string
  ): Promise<void> {
    const actualMime = mimeType || blob.type || 'application/octet-stream';
    const record: StoredMediaRecord = {
      id,
      blob,
      mimeType: actualMime,
      fileName,
      createdAt: Date.now()
    };

    const db = await this.getDB();
    if (!db) {
      this.memoryStore.set(id, record);
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(record);

        req.onsuccess = () => resolve();
        req.onerror = () => {
          console.warn(`[OutboxMediaStore] Ошибка записи в IndexedDB для id=${id}, fallback в память`);
          this.memoryStore.set(id, record);
          resolve();
        };
      } catch (err) {
        console.warn(`[OutboxMediaStore] Ошибка транзакции IndexedDB для id=${id}:`, err);
        this.memoryStore.set(id, record);
        resolve();
      }
    });
  }

  /**
   * Извлекает сохраненный Blob по идентификатору сообщения.
   */
  public async getMedia(id: string): Promise<Blob | null> {
    if (this.memoryStore.has(id)) {
      return this.memoryStore.get(id)!.blob;
    }

    const db = await this.getDB();
    if (!db) {
      return null;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);

        req.onsuccess = () => {
          const result = req.result as StoredMediaRecord | undefined;
          if (result && result.blob) {
            resolve(result.blob);
          } else {
            resolve(null);
          }
        };

        req.onerror = () => {
          resolve(null);
        };
      } catch (err) {
        console.warn(`[OutboxMediaStore] Ошибка чтения IndexedDB для id=${id}:`, err);
        resolve(null);
      }
    });
  }

  /**
   * Проверяет наличие сохраненного медиафайла.
   */
  public async hasMedia(id: string): Promise<boolean> {
    if (this.memoryStore.has(id)) {
      return true;
    }

    const db = await this.getDB();
    if (!db) {
      return false;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.count(id);

        req.onsuccess = () => {
          resolve(req.result > 0);
        };

        req.onerror = () => {
          resolve(false);
        };
      } catch (err) {
        resolve(false);
      }
    });
  }

  /**
   * Удаляет сохраненный Blob после успешной загрузки на сервер.
   */
  public async deleteMedia(id: string): Promise<void> {
    this.memoryStore.delete(id);

    const db = await this.getDB();
    if (!db) {
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);

        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch (err) {
        resolve();
      }
    });
  }

  /**
   * Полная очистка хранилища медиафайлов Outbox.
   */
  public async clearAll(): Promise<void> {
    this.memoryStore.clear();

    const db = await this.getDB();
    if (!db) {
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();

        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch (err) {
        resolve();
      }
    });
  }

  /**
   * Очищает "сиротские" блобы, которых больше нет в активной очереди outbox_queue.
   */
  public async pruneOrphanMedia(activeOutboxIds: string[]): Promise<void> {
    const activeSet = new Set(activeOutboxIds);

    // Очистка памяти
    for (const key of this.memoryStore.keys()) {
      if (!activeSet.has(key)) {
        this.memoryStore.delete(key);
      }
    }

    const db = await this.getDB();
    if (!db) {
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAllKeys();

        req.onsuccess = () => {
          const keys = req.result as string[];
          for (const k of keys) {
            if (!activeSet.has(k)) {
              store.delete(k);
            }
          }
          resolve();
        };

        req.onerror = () => resolve();
      } catch (err) {
        resolve();
      }
    });
  }
}

export const outboxMediaStore = OutboxMediaStore.getInstance();
