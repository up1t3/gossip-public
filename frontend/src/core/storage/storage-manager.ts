// frontend/src/core/storage/storage-manager.ts
import { DatabaseDriver, DBTopic, DBMessage } from './types';
import { ElectronDriver } from './drivers/electron-driver';
import { WasmDriver } from './drivers/wasm-driver';
import { migrations } from './migrations';

function bufToHex(buffer: Uint8Array): string {
  return Array.prototype.map.call(buffer, (x: number) => ('00' + x.toString(16)).slice(-2)).join('');
}

function hexToBuf(hex: string): Uint8Array {
  const len = hex.length / 2;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Хранилище ключа шифрования PIN в памяти модуля (fallback для сред без IndexedDB)
let memoryPinEncryptionKey: CryptoKey | null = null;

async function getPinEncryptionKey(): Promise<CryptoKey> {
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
  try {
    if (typeof indexedDB !== 'undefined') {
      const key = await new Promise<CryptoKey | null>((resolve) => {
        const request = indexedDB.open('gossip_secure_storage', 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('keys')) {
            db.createObjectStore('keys');
          }
        };
        request.onsuccess = () => {
          const db = request.result;
          try {
            const tx = db.transaction('keys', 'readonly');
            const store = tx.objectStore('keys');
            const getReq = store.get('pin_encryption_key');
            getReq.onsuccess = () => {
              resolve(getReq.result || null);
            };
            getReq.onerror = () => {
              resolve(null);
            };
          } catch (err) {
            resolve(null);
          }
        };
        request.onerror = () => {
          resolve(null);
        };
      });
      if (key) {
        return key;
      }
    }
  } catch (err) {
    // Игнорируем и идем дальше
  }

  if (memoryPinEncryptionKey) {
    return memoryPinEncryptionKey;
  }

  const newKey = await cryptoObj.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // extractable: false
    ['encrypt', 'decrypt']
  );

  try {
    if (typeof indexedDB !== 'undefined') {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('gossip_secure_storage', 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('keys')) {
            db.createObjectStore('keys');
          }
        };
        request.onsuccess = () => {
          const db = request.result;
          try {
            const tx = db.transaction('keys', 'readwrite');
            const store = tx.objectStore('keys');
            const putReq = store.put(newKey, 'pin_encryption_key');
            putReq.onsuccess = () => resolve();
            putReq.onerror = () => reject(putReq.error);
          } catch (err) {
            reject(err);
          }
        };
        request.onerror = () => reject(request.error);
      });
    }
  } catch (err) {
    // Игнорируем, используем memory fallback
  }

  memoryPinEncryptionKey = newKey;
  return newKey;
}

async function encryptPin(pin: string, key: CryptoKey): Promise<{ encryptedHex: string; ivHex: string }> {
  const encoder = new TextEncoder();
  const pinBytes = encoder.encode(pin);
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await cryptoObj.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv.buffer as ArrayBuffer,
    },
    key,
    pinBytes.buffer as ArrayBuffer
  );
  return {
    encryptedHex: bufToHex(new Uint8Array(encryptedBuffer)),
    ivHex: bufToHex(iv),
  };
}

async function decryptPin(encryptedHex: string, ivHex: string, key: CryptoKey): Promise<string> {
  const encrypted = hexToBuf(encryptedHex);
  const iv = hexToBuf(ivHex);
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
  const decryptedBuffer = await cryptoObj.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv.buffer as ArrayBuffer,
    },
    key,
    encrypted.buffer as ArrayBuffer
  );
  const decoder = new TextDecoder();
  return decoder.decode(new Uint8Array(decryptedBuffer));
}

export class StorageManager {
  private static instance: StorageManager;
  private driver: DatabaseDriver | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  public getIsInitialized(): boolean {
    return this.isInitialized;
  }

  private isElectron(): boolean {
    return (
      typeof window !== 'undefined' &&
      (window.navigator.userAgent.toLowerCase().includes('electron') ||
        (window as any).electronAPI !== undefined)
    );
  }

  private async deriveKEK(pin: string, userId: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const pinBytes = encoder.encode(pin);
    const saltBytes = encoder.encode(`gossip-salt-v1-${userId}`);

    const baseKey = await window.crypto.subtle.importKey(
      'raw',
      pinBytes,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: 600000,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private async encryptMasterKey(masterKey: Uint8Array, kek: CryptoKey): Promise<{ encryptedHex: string; ivHex: string }> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer as ArrayBuffer,
      },
      kek,
      masterKey.buffer as ArrayBuffer
    );
    return {
      encryptedHex: bufToHex(new Uint8Array(encryptedBuffer)),
      ivHex: bufToHex(iv),
    };
  }

  private async decryptMasterKey(encryptedHex: string, ivHex: string, kek: CryptoKey): Promise<Uint8Array> {
    const encrypted = hexToBuf(encryptedHex);
    const iv = hexToBuf(ivHex);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer as ArrayBuffer,
      },
      kek,
      encrypted.buffer as ArrayBuffer
    );
    return new Uint8Array(decryptedBuffer);
  }

  private async deleteDatabaseFile(userId: string): Promise<void> {
    const dbName = `gossip_${userId}.db`;
    // 1. Удаление из OPFS (для браузера)
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.getDirectory) {
        const root = await navigator.storage.getDirectory();
        await root.removeEntry(dbName);
        console.log(`[StorageManager] Файл базы данных ${dbName} успешно удален из OPFS`);
      }
    } catch (err) {
      // Файл мог не существовать, это нормально
    }

    // 2. Удаление из IndexedDB gossip_raw_files (основной бэкап WASM драйвера)
    try {
      if (typeof indexedDB !== 'undefined') {
        await new Promise<void>((resolve, reject) => {
          const request = indexedDB.open("gossip_raw_files", 1);
          request.onupgradeneeded = () => {
            const dbObj = request.result;
            if (!dbObj.objectStoreNames.contains("files")) {
              dbObj.createObjectStore("files");
            }
          };
          request.onsuccess = () => {
            const dbObj = request.result;
            try {
              const tx = dbObj.transaction("files", "readwrite");
              const store = tx.objectStore("files");
              const delReq = store.delete(dbName);
              delReq.onsuccess = () => {
                console.log(`[StorageManager] Файл базы данных ${dbName} успешно удален из IndexedDB gossip_raw_files`);
                resolve();
              };
              delReq.onerror = () => reject(delReq.error);
            } catch (e) {
              reject(e);
            }
          };
          request.onerror = () => reject(request.error);
        });
      }
    } catch (err) {
      console.warn(`[StorageManager] Не удалось удалить базу данных ${dbName} из IndexedDB gossip_raw_files:`, err);
    }

    // 3. Удаление из Electron (через IPC, если доступно)
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI && (window as any).electronAPI.deleteDatabase) {
        await (window as any).electronAPI.deleteDatabase(dbName);
        console.log(`[StorageManager] Файл базы данных ${dbName} успешно удален через Electron API`);
      }
    } catch (err) {
      // Игнорируем
    }

    // 4. Удаление из Node.js (для тестов)
    try {
      if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        const fs = await import(/* @vite-ignore */ 'fs');
        if (fs.existsSync(dbName)) {
          fs.unlinkSync(dbName);
          console.log(`[StorageManager] Файл базы данных ${dbName} успешно удален с диска в Node-окружении`);
        }
      }
    } catch (err) {
      // Игнорируем
    }
  }

  public async databaseExists(userId: string): Promise<boolean> {
    const cleanUserId = userId.toLowerCase().trim();
    const dbName = `gossip_${cleanUserId}.db`;

    // 1. Для Electron (через IPC, если доступно)
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI && (window as any).electronAPI.databaseExists) {
        return await (window as any).electronAPI.databaseExists(dbName);
      }
    } catch (err) {
      // Игнорируем
    }

    // 2. Для Node.js (тесты)
    try {
      if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        const fs = await import(/* @vite-ignore */ 'fs');
        return fs.existsSync(dbName);
      }
    } catch (err) {
      // Игнорируем
    }

    // 3. Для браузера / Android (IndexedDB)
    try {
      if (typeof indexedDB !== 'undefined') {
        return await new Promise<boolean>((resolve) => {
          const request = indexedDB.open("gossip_raw_files", 1);
          request.onupgradeneeded = () => {
            const dbObj = request.result;
            if (!dbObj.objectStoreNames.contains("files")) {
              dbObj.createObjectStore("files");
            }
          };
          request.onsuccess = () => {
            const dbObj = request.result;
            try {
              const tx = dbObj.transaction("files", "readonly");
              const store = tx.objectStore("files");
              const getReq = store.get(dbName);
              getReq.onsuccess = () => {
                resolve(!!getReq.result);
              };
              getReq.onerror = () => {
                resolve(false);
              };
            } catch (e) {
              resolve(false);
            }
          };
          request.onerror = () => {
            resolve(false);
          };
        });
      }
    } catch (err) {
      // Игнорируем
    }

    return false;
  }

  public async open(userId: string, pin: string, isCreateMode: boolean = false): Promise<void> {
    if (this.isInitialized) return;

    const cleanUserId = userId.toLowerCase().trim();

    if (isCreateMode) {
      console.log(`[StorageManager] Режим создания PIN-кода для ${cleanUserId}. Сбрасываем старые мастер-ключи.`);
      localStorage.removeItem(`db_master_key_enc_${cleanUserId}`);
      localStorage.removeItem(`db_master_key_iv_${cleanUserId}`);
      localStorage.removeItem(`db_local_pin_enc_${cleanUserId}`);
      localStorage.removeItem(`db_local_pin_iv_${cleanUserId}`);
      await this.deleteDatabaseFile(cleanUserId);
    }

    const hadMasterKey = !isCreateMode && !!localStorage.getItem(`db_master_key_enc_${cleanUserId}`);
    let localPin: string | null = null;

    if (!isCreateMode) {
      const localPinEnc = localStorage.getItem(`db_local_pin_enc_${cleanUserId}`);
      const localPinIv = localStorage.getItem(`db_local_pin_iv_${cleanUserId}`);

      if (localPinEnc && localPinIv) {
        try {
          const key = await getPinEncryptionKey();
          localPin = await decryptPin(localPinEnc, localPinIv, key);
        } catch (err) {
          console.error('[StorageManager] Не удалось расшифровать local PIN:', err);
        }
      }

      if (localPin && localPin !== pin) {
        if (typeof DOMException !== 'undefined') {
          throw new DOMException('The operation failed for an operation-specific reason', 'OperationError');
        } else {
          throw new Error('DOMException: The operation failed for an operation-specific reason');
        }
      }
    }

    const shouldSavePin = !localPin;

    try {
      await this.openInternal(cleanUserId, localPin || pin);

      if (shouldSavePin) {
        try {
          const key = await getPinEncryptionKey();
          const { encryptedHex, ivHex } = await encryptPin(pin, key);
          localStorage.setItem(`db_local_pin_enc_${cleanUserId}`, encryptedHex);
          localStorage.setItem(`db_local_pin_iv_${cleanUserId}`, ivHex);
        } catch (err) {
          console.error('[StorageManager] Не удалось зашифровать/сохранить local PIN:', err);
        }
      }
    } catch (err: any) {
      const errMessage = err?.message || String(err);
      const isDecryptionError = 
        errMessage.includes("DECRYPTION_FAILED") || 
        errMessage.includes("Incorrect password") || 
        errMessage.includes("operation-specific reason") ||
        errMessage.includes("decryption failed") ||
        errMessage.includes("OperationError") ||
        err.name === "OperationError";

      if (hadMasterKey && isDecryptionError) {
        if (this.driver) {
          try {
            await this.driver.close();
          } catch (e) {}
          this.driver = null;
        }
        throw err;
      }

      console.warn('[StorageManager] Ошибка при открытии хранилища. Сбрасываем ключи и локальную БД...', err);
      
      if (this.driver) {
        try {
          await this.driver.close();
        } catch (e) {}
        this.driver = null;
      }

      // Стираем поврежденные/устаревшие ключи шифрования
      localStorage.removeItem(`db_master_key_enc_${cleanUserId}`);
      localStorage.removeItem(`db_master_key_iv_${cleanUserId}`);
      localStorage.removeItem(`db_local_pin_${cleanUserId}`);
      localStorage.removeItem(`db_local_pin_enc_${cleanUserId}`);
      localStorage.removeItem(`db_local_pin_iv_${cleanUserId}`);

      // Удаляем файл базы данных, чтобы начать с чистого листа
      await this.deleteDatabaseFile(cleanUserId);

      // Пробуем заново инициализировать чистое хранилище
      console.log('[StorageManager] Повторная попытка инициализации чистого хранилища...');
      try {
        const key = await getPinEncryptionKey();
        const { encryptedHex, ivHex } = await encryptPin(pin, key);
        localStorage.setItem(`db_local_pin_enc_${cleanUserId}`, encryptedHex);
        localStorage.setItem(`db_local_pin_iv_${cleanUserId}`, ivHex);
      } catch (e) {
        console.error('[StorageManager] Не удалось зашифровать/сохранить local PIN:', e);
      }

      await this.openInternal(cleanUserId, pin);
    }
  }

  private async openInternal(userId: string, pin: string): Promise<void> {
    console.log('[StorageManager] Инициализация шифрованного хранилища...');
    const kek = await this.deriveKEK(pin, userId);

    const storageKeyEncrypted = localStorage.getItem(`db_master_key_enc_${userId}`);
    const storageKeyIv = localStorage.getItem(`db_master_key_iv_${userId}`);

    let masterKey: Uint8Array;

    if (!storageKeyEncrypted || !storageKeyIv) {
      console.log('[StorageManager] Генерация нового DB Master Key...');
      masterKey = window.crypto.getRandomValues(new Uint8Array(32));
      const { encryptedHex, ivHex } = await this.encryptMasterKey(masterKey, kek);
      localStorage.setItem(`db_master_key_enc_${userId}`, encryptedHex);
      localStorage.setItem(`db_master_key_iv_${userId}`, ivHex);
    } else {
      console.log('[StorageManager] Расшифровка существующего DB Master Key...');
      masterKey = await this.decryptMasterKey(storageKeyEncrypted, storageKeyIv, kek);
    }

    const hexKey = bufToHex(masterKey);

    // Инициализация правильного драйвера
    if (this.isElectron()) {
      console.log('[StorageManager] Выбран Electron-драйвер');
      this.driver = new ElectronDriver();
    } else {
      console.log('[StorageManager] Выбран WASM-драйвер (OPFS)');
      this.driver = new WasmDriver();
    }

    const dbName = `gossip_${userId}.db`;
    await this.driver.open(dbName, hexKey);

    // Запуск миграций
    await this.runMigrations();

    // Запрос постоянного хранения данных (защита от вытеснения браузером/WebView при обновлениях)
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        console.log(`[StorageManager] Persistent Storage статус: ${isPersisted ? 'Зафиксировано (Persisted)' : 'Стандартный'}`);
      }
    } catch (e) {
      console.warn('[StorageManager] Ошибка при запросе persistent storage:', e);
    }

    this.isInitialized = true;
    console.log('[StorageManager] Хранилище успешно открыто и готово к работе');
  }

  private async runMigrations(): Promise<void> {
    if (!this.driver) throw new Error('Драйвер не инициализирован');

    await this.driver.execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY
      );
    `);

    const rows = await this.driver.query<{ version: number }>(
      'SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;'
    );
    const currentVersion = rows.length > 0 ? rows[0].version : 0;

    console.log(`[StorageManager] Текущая версия БД: ${currentVersion}`);

    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        console.log(`[StorageManager] Применение миграции версии ${migration.version}...`);
        for (const sql of migration.up) {
          try {
            await this.driver.execute(sql);
          } catch (stmtErr: any) {
            const msg = (stmtErr?.message || String(stmtErr)).toLowerCase();
            if (
              msg.includes('duplicate column name') ||
              msg.includes('already exists')
            ) {
              console.warn(`[StorageManager] Пропуск уже существующей колонки/объекта в миграции ${migration.version}:`, sql);
            } else {
              console.error(`[StorageManager] Критическая ошибка миграции ${migration.version}:`, sql, stmtErr);
              throw stmtErr;
            }
          }
        }

        await this.driver.execute(
          'INSERT OR REPLACE INTO schema_migrations (version) VALUES (?);',
          [migration.version]
        );
      }
    }
  }

  public async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    if (!this.driver || !this.isInitialized) throw new Error('Хранилище не открыто');
    return await this.driver.query<T>(sql, params);
  }

  public async execute(sql: string, params?: any[]): Promise<void> {
    if (!this.driver || !this.isInitialized) throw new Error('Хранилище не открыто');
    await this.driver.execute(sql, params);
  }

  public async transaction(statements: { sql: string; params?: any[] }[]): Promise<void> {
    if (!this.driver || !this.isInitialized) throw new Error('Хранилище не открыто');
    await this.driver.transaction(statements);
  }

  public async close(): Promise<void> {
    if (this.driver && this.isInitialized) {
      await this.driver.close();
      this.driver = null;
      this.isInitialized = false;
      console.log('[StorageManager] Хранилище закрыто');
    }
  }

  public async tryAutoOpen(userId: string): Promise<boolean> {
    if (this.isInitialized) return true;

    const cleanUserId = userId.toLowerCase().trim();
    const isAutoUnlockEnabled = localStorage.getItem(`db_pin_auto_unlock_${cleanUserId}`) === 'true';
    if (!isAutoUnlockEnabled) return false;

    const localPinEnc = localStorage.getItem(`db_local_pin_enc_${cleanUserId}`);
    const localPinIv = localStorage.getItem(`db_local_pin_iv_${cleanUserId}`);
    if (!localPinEnc || !localPinIv) return false;

    try {
      const key = await getPinEncryptionKey();
      const decryptedPin = await decryptPin(localPinEnc, localPinIv, key);
      await this.openInternal(cleanUserId, decryptedPin);
      sessionStorage.setItem(`db_local_pin_${cleanUserId}`, decryptedPin);
      return true;
    } catch (err) {
      console.error('[StorageManager] Автоматическая разблокировка не удалась:', err);
      return false;
    }
  }

  public async updateChatReadState(chatId: string, userId: string, lastReadPts: number): Promise<void> {
    const now = Date.now();
    await this.execute(
      `INSERT INTO chat_read_state (chat_id, user_id, last_read_pts, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(chat_id, user_id) DO UPDATE SET
         last_read_pts = MAX(chat_read_state.last_read_pts, excluded.last_read_pts),
         updated_at = excluded.updated_at;`,
      [chatId, userId, lastReadPts, now]
    );
  }

  public async getChatReadStates(chatId: string): Promise<Record<string, { last_read_pts: number; updated_at: number }>> {
    const rows = await this.query<{ chat_id: string; user_id: string; last_read_pts: number; updated_at: number }>(
      "SELECT chat_id, user_id, last_read_pts, updated_at FROM chat_read_state WHERE chat_id = ?;",
      [chatId]
    );
    const result: Record<string, { last_read_pts: number; updated_at: number }> = {};
    for (const row of rows) {
      result[row.user_id] = { last_read_pts: row.last_read_pts, updated_at: row.updated_at };
    }
    return result;
  }

  public async getChatReadStatesList(chatId: string): Promise<{ chat_id: string; user_id: string; last_read_pts: number; updated_at: number }[]> {
    return await this.query<{ chat_id: string; user_id: string; last_read_pts: number; updated_at: number }>(
      "SELECT chat_id, user_id, last_read_pts, updated_at FROM chat_read_state WHERE chat_id = ?;",
      [chatId]
    );
  }

  public async setChatSettings(chatId: string, settings: { archived?: boolean; muted?: boolean }): Promise<void> {
    const archivedVal = settings.archived ? 1 : 0;
    const mutedVal = settings.muted ? 1 : 0;
    await this.execute(
      "UPDATE chats SET archived = ?, muted = ? WHERE id = ?;",
      [archivedVal, mutedVal, chatId]
    );
  }

  public async setChatPinnedMessageIds(chatId: string, pinnedIds: string[]): Promise<void> {
    await this.execute(
      "UPDATE chats SET pinned_message_ids = ? WHERE id = ?;",
      [JSON.stringify(pinnedIds), chatId]
    );
  }

  public async getTopics(chatId: string): Promise<DBTopic[]> {
    if (!this.driver || !this.isInitialized) throw new Error('Хранилище не открыто');
    return await this.driver.query<DBTopic>(
      'SELECT * FROM topics WHERE chat_id = ? ORDER BY topic_id ASC;',
      [chatId]
    );
  }

  public async saveTopic(topic: DBTopic): Promise<void> {
    if (!this.driver || !this.isInitialized) throw new Error('Хранилище не открыто');
    const iconEmoji = topic.icon_emoji ?? '💬';
    const iconColor = topic.icon_color ?? '#3b82f6';
    const isClosed = topic.is_closed ? 1 : 0;
    const pinnedMessageId = topic.pinned_message_id ?? null;
    const lastMessageId = topic.last_message_id ?? null;
    const unreadCount = topic.unread_count ?? 0;
    const createdAt = topic.created_at ?? Date.now();

    await this.driver.execute(
      `INSERT OR REPLACE INTO topics (
        topic_id, chat_id, title, icon_emoji, icon_color, is_closed,
        pinned_message_id, last_message_id, unread_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        topic.topic_id,
        topic.chat_id,
        topic.title,
        iconEmoji,
        iconColor,
        isClosed,
        pinnedMessageId,
        lastMessageId,
        unreadCount,
        createdAt
      ]
    );
  }

  public async deleteTopic(chatId: string, topicId: number): Promise<void> {
    if (!this.driver || !this.isInitialized) throw new Error('Хранилище не открыто');
    await this.driver.execute(
      'DELETE FROM topics WHERE chat_id = ? AND topic_id = ?;',
      [chatId, topicId]
    );
  }

  public async getMessagesByTopic(
    chatId: string,
    topicId?: number | null,
    limit: number = 50,
    beforePts?: number
  ): Promise<DBMessage[]> {
    if (!this.driver || !this.isInitialized) throw new Error('Хранилище не открыто');

    if (topicId !== null && topicId !== undefined && topicId > 0) {
      if (beforePts !== undefined && beforePts !== null) {
        return await this.driver.query<DBMessage>(
          'SELECT * FROM messages WHERE chatId = ? AND topic_id = ? AND pts < ? ORDER BY timestamp DESC LIMIT ?;',
          [chatId, topicId, beforePts, limit]
        );
      }
      return await this.driver.query<DBMessage>(
        'SELECT * FROM messages WHERE chatId = ? AND topic_id = ? ORDER BY timestamp DESC LIMIT ?;',
        [chatId, topicId, limit]
      );
    } else {
      if (beforePts !== undefined && beforePts !== null) {
        return await this.driver.query<DBMessage>(
          'SELECT * FROM messages WHERE chatId = ? AND (topic_id = 0 OR topic_id IS NULL) AND pts < ? ORDER BY timestamp DESC LIMIT ?;',
          [chatId, beforePts, limit]
        );
      }
      return await this.driver.query<DBMessage>(
        'SELECT * FROM messages WHERE chatId = ? AND (topic_id = 0 OR topic_id IS NULL) ORDER BY timestamp DESC LIMIT ?;',
        [chatId, limit]
      );
    }
  }

  public async updateTopicLastMessage(
    chatId: string,
    topicId: number,
    lastMessageId: string
  ): Promise<void> {
    if (!this.driver || !this.isInitialized) throw new Error('Хранилище не открыто');
    await this.driver.execute(
      'UPDATE topics SET last_message_id = ? WHERE chat_id = ? AND topic_id = ?;',
      [lastMessageId, chatId, topicId]
    );
  }

  public async incrementTopicUnread(
    chatId: string,
    topicId: number,
    delta: number = 1
  ): Promise<void> {
    if (!this.driver || !this.isInitialized) throw new Error('Хранилище не открыто');
    await this.driver.execute(
      'UPDATE topics SET unread_count = MAX(0, COALESCE(unread_count, 0) + ?) WHERE chat_id = ? AND topic_id = ?;',
      [delta, chatId, topicId]
    );
  }

  public async sync(): Promise<void> {
    if (this.driver && this.isInitialized && this.driver.sync) {
      await this.driver.sync();
    }
  }

  // =========================================================================
  // R3 (v2.0.0): Safety Numbers, TTL, отложенные сообщения, черновики
  // =========================================================================

  public async setChatDraft(chatId: string, draft: string): Promise<void> {
    await this.execute(
      "UPDATE chats SET draft = ?, draft_updated_at = ? WHERE id = ?;",
      [draft, Date.now(), chatId]
    );
  }

  public async getChatDraft(chatId: string): Promise<string | null> {
    const rows = await this.query<{ draft: string | null }>(
      "SELECT draft FROM chats WHERE id = ? LIMIT 1;",
      [chatId]
    );
    return rows.length > 0 ? (rows[0].draft ?? null) : null;
  }

  public async getAllChatDrafts(): Promise<Record<string, string>> {
    const rows = await this.query<{ id: string; draft: string | null }>(
      "SELECT id, draft FROM chats WHERE draft IS NOT NULL AND draft != '';"
    );
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.id] = row.draft as string;
    }
    return result;
  }

  public async setChatVerified(chatId: string, verified: boolean, fingerprint?: string | null): Promise<void> {
    await this.execute(
      "UPDATE chats SET is_verified = ?, verified_fingerprint = ? WHERE id = ?;",
      [verified ? 1 : 0, fingerprint ?? null, chatId]
    );
  }

  public async saveVerifiedPeer(peerId: string, safetyNumber: string, method: string): Promise<void> {
    await this.execute(
      `INSERT INTO verified_peers (peer_id, safety_number, verified_at, method)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(peer_id) DO UPDATE SET safety_number = excluded.safety_number, verified_at = excluded.verified_at, method = excluded.method;`,
      [peerId, safetyNumber, Date.now(), method]
    );
  }

  public async getVerifiedPeer(peerId: string): Promise<{ safety_number: string; verified_at: number; method: string } | null> {
    const rows = await this.query<{ safety_number: string; verified_at: number; method: string }>(
      "SELECT safety_number, verified_at, method FROM verified_peers WHERE peer_id = ? LIMIT 1;",
      [peerId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  public async deleteVerifiedPeer(peerId: string): Promise<void> {
    await this.execute("DELETE FROM verified_peers WHERE peer_id = ?;", [peerId]);
  }

  public async getAllVerifiedPeers(): Promise<{ peer_id: string; safety_number: string; verified_at: number; method: string }[]> {
    return await this.query<{ peer_id: string; safety_number: string; verified_at: number; method: string }>(
      "SELECT peer_id, safety_number, verified_at, method FROM verified_peers;"
    );
  }

  public async saveScheduledMessage(item: { id: string; chat_id: string; text: string | null; type: string; media_url?: string | null; deliver_at: number; status?: string }): Promise<void> {
    await this.execute(
      `INSERT OR REPLACE INTO scheduled_messages (id, chat_id, text, type, media_url, deliver_at, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [item.id, item.chat_id, item.text, item.type, item.media_url ?? null, item.deliver_at, item.status ?? 'pending', Date.now()]
    );
  }

  public async getScheduledMessages(chatId?: string): Promise<{ id: string; chat_id: string; text: string | null; deliver_at: number; status: string }[]> {
    if (chatId) {
      return await this.query<{ id: string; chat_id: string; text: string | null; deliver_at: number; status: string }>(
        "SELECT id, chat_id, text, deliver_at, status FROM scheduled_messages WHERE chat_id = ? AND status = 'pending' ORDER BY deliver_at ASC;",
        [chatId]
      );
    }
    return await this.query<{ id: string; chat_id: string; text: string | null; deliver_at: number; status: string }>(
      "SELECT id, chat_id, text, deliver_at, status FROM scheduled_messages WHERE status = 'pending' ORDER BY deliver_at ASC;"
    );
  }

  public async deleteScheduledMessage(id: string): Promise<void> {
    await this.execute("DELETE FROM scheduled_messages WHERE id = ?;", [id]);
  }

  public async updateScheduledMessageStatus(id: string, status: string): Promise<void> {
    await this.execute("UPDATE scheduled_messages SET status = ? WHERE id = ?;", [status, id]);
  }

  public async setChatDefaultTTL(chatId: string, ttlSeconds: number): Promise<void> {
    await this.execute("UPDATE chats SET default_ttl = ? WHERE id = ?;", [ttlSeconds, chatId]);
  }

  public async getChatDefaultTTL(chatId: string): Promise<number> {
    const rows = await this.query<{ default_ttl: number }>(
      "SELECT default_ttl FROM chats WHERE id = ? LIMIT 1;",
      [chatId]
    );
    return rows.length > 0 ? (rows[0].default_ttl ?? 0) : 0;
  }

  public async getExpiredMessages(now = Date.now()): Promise<{ id: string; chatId: string }[]> {
    return await this.query<{ id: string; chatId: string }>(
      "SELECT id, chatId FROM messages WHERE expires_at IS NOT NULL AND expires_at > 0 AND expires_at <= ?;",
      [now]
    );
  }

  public async deleteExpiredMessages(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    await this.execute(`DELETE FROM messages WHERE id IN (${placeholders});`, ids);
  }

  // ===== R4 (v2.1.0): кэш документов + FTS rebuild =====

  public async rebuildFTSIndex(): Promise<void> {
    await this.execute("INSERT INTO messages_fts(messages_fts) VALUES('rebuild');");
  }

  public async saveCachedFile(file: { file_id: string; local_path?: string | null; size?: number; mime_type?: string | null }): Promise<void> {
    await this.execute(
      `INSERT OR REPLACE INTO file_cache (file_id, local_path, size, mime_type, downloaded_at)
       VALUES (?, ?, ?, ?, ?);`,
      [file.file_id, file.local_path ?? null, file.size ?? 0, file.mime_type ?? null, Date.now()]
    );
  }

  public async getCachedFile(fileId: string): Promise<{ local_path: string | null; size: number; mime_type: string | null; downloaded_at: number } | null> {
    const rows = await this.query<{ local_path: string | null; size: number; mime_type: string | null; downloaded_at: number }>(
      "SELECT local_path, size, mime_type, downloaded_at FROM file_cache WHERE file_id = ? LIMIT 1;",
      [fileId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  public async deleteCachedFile(fileId: string): Promise<void> {
    await this.execute("DELETE FROM file_cache WHERE file_id = ?;", [fileId]);
  }

  public async clearOldFileCache(maxAgeMs = 7 * 24 * 3600 * 1000): Promise<void> {
    await this.execute("DELETE FROM file_cache WHERE downloaded_at < ?;", [Date.now() - maxAgeMs]);
  }
}

export const storageManager = StorageManager.getInstance();
