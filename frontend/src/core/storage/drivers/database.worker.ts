// frontend/src/core/storage/drivers/database.worker.ts
import initSqlcipher from '@7mind.io/sqlcipher-wasm/dist/sqlcipher.mjs';
import { SQLiteAPI } from '@7mind.io/sqlcipher-wasm';

let db: any = null;
let sqlite3: any = null;
let initPromise: Promise<void> | null = null;
let wasm: any = null;
let isMounted = false;
const SQLITE_OK = 0;
const SQLITE_ROW = 100;
const SQLITE_DONE = 101;

function initSqlite(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = initSqlcipher({
    print: console.log,
    printErr: console.error,
  }).then((wasmModule: any) => {
    wasm = wasmModule;
    sqlite3 = new SQLiteAPI(wasmModule);
    console.log('[SQLite WASM] SQLCipher модуль успешно инициализирован');
  }).catch((err: any) => {
    console.error('[SQLite WASM] Не удалось инициализировать SQLCipher модуль:', err);
    throw err;
  });

  return initPromise!;
}

let currentDbPath = '';
let currentDbName = '';

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const idb = self.indexedDB || (self as any).webkitIndexedDB || (self as any).mozIndexedDB || (self as any).OIndexedDB || (self as any).msIndexedDB;
    if (!idb) {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }
    const request = idb.open("gossip_raw_files", 1);
    request.onupgradeneeded = () => {
      const dbObj = request.result;
      if (!dbObj.objectStoreNames.contains("files")) {
        dbObj.createObjectStore("files");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readFromIndexedDB(fileName: string): Promise<Uint8Array | null> {
  try {
    const dbObj = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = dbObj.transaction("files", "readonly");
      const store = transaction.objectStore("files");
      const request = store.get(fileName);
      request.onsuccess = () => {
        const val = request.result;
        if (val instanceof Uint8Array) {
          resolve(val);
        } else if (val && (val instanceof Blob || typeof val.arrayBuffer === 'function')) {
          const reader = new FileReader();
          reader.onload = () => {
            resolve(new Uint8Array(reader.result as ArrayBuffer));
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsArrayBuffer(val);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("[SQLite Worker IDB Backup] Error reading from IndexedDB:", e);
    return null;
  }
}

async function writeToIndexedDB(fileName: string, data: Uint8Array): Promise<void> {
  try {
    const dbObj = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = dbObj.transaction("files", "readwrite");
      const store = transaction.objectStore("files");
      const request = store.put(data, fileName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("[SQLite Worker IDB Backup] Error writing to IndexedDB:", e);
  }
}

async function mountIDBFS(): Promise<void> {
  const dbNameClean = currentDbName;
  const path = currentDbPath;
  
  if (!dbNameClean) {
    console.warn('[SQLite Worker] Нет активного имени БД для восстановления');
    return;
  }

  try {
    const fileData = await readFromIndexedDB(dbNameClean);
    if (fileData && fileData.byteLength > 0) {
      console.log(`[SQLite Worker IDB Backup] Восстановление базы данных ${dbNameClean} из IndexedDB (${fileData.byteLength} байт)`);
      try {
        try {
          wasm.FS.unlink(path);
        } catch (e) {}
        wasm.FS.writeFile(path, fileData);
        isMounted = true;
      } catch (writeErr) {
        console.error(`[SQLite Worker IDB Backup] Ошибка записи восстановленного файла в MEMFS:`, writeErr);
      }
    } else {
      console.log(`[SQLite Worker IDB Backup] База данных ${dbNameClean} не найдена в IndexedDB (будет создана новая)`);
      isMounted = true;
    }
  } catch (err) {
    console.error('[SQLite Worker IDB Backup] Ошибка при инициализации IndexedDB:', err);
    isMounted = true;
  }
}

let syncTimeout: any = null;
let isSyncing = false;
let pendingSync = false;

async function syncDatabaseManual(): Promise<void> {
  if (isSyncing) {
    pendingSync = true;
    return;
  }
  isSyncing = true;
  try {
    if (!wasm || !wasm.FS || !currentDbPath || !currentDbName) return;

    // Проверка целостности SQLite перед записью в IndexedDB
    if (db && !db.closed) {
      try {
        const checkResult = customQuery(db, "PRAGMA integrity_check;");
        const ok = checkResult && checkResult[0] && Object.values(checkResult[0])[0] === "ok";
        if (!ok) {
          console.error("[SQLite Worker IDB Backup] PRAGMA integrity_check вернул ошибку:", checkResult);
          return; // Прерываем запись, чтобы не затереть IndexedDB поврежденными данными
        }
      } catch (checkErr) {
        console.error("[SQLite Worker IDB Backup] Исключение во время PRAGMA integrity_check:", checkErr);
        return; // Прерываем запись, чтобы не затереть IndexedDB поврежденными данными
      }
    }

    let data;
    try {
      data = wasm.FS.readFile(currentDbPath);
    } catch (readErr) {
      console.warn("[SQLite Worker IDB Backup] Файл базы данных не найден в MEMFS при сохранении:", readErr);
      return;
    }
    if (data && data.byteLength > 0) {
      console.log(`[SQLite Worker IDB Backup] Запись базы данных ${currentDbName} в IndexedDB (${data.byteLength} байт)...`);
      await writeToIndexedDB(currentDbName, data);
      console.log(`[SQLite Worker IDB Backup] База данных успешно сохранена в IndexedDB`);
    }
  } catch (err) {
    console.error("[SQLite Worker IDB Backup] Ошибка при сохранении базы данных:", err);
  } finally {
    isSyncing = false;
    if (pendingSync) {
      pendingSync = false;
      setTimeout(syncDatabaseManual, 50);
    }
  }
}

function queueSync() {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  syncTimeout = setTimeout(() => {
    syncTimeout = null;
    syncDatabaseManual();
  }, 5000);
}

async function syncDatabase(): Promise<void> {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
  await syncDatabaseManual();
}

function getSqliteErrorMessage(dbObj: any): string {
  const module = sqlite3.module;
  const errPtr = module._sqlite3_errmsg(dbObj.dbPtr);
  return errPtr ? module.UTF8ToString(errPtr) : 'Unknown error';
}

function customQuery(dbObj: any, sql: string, params: any[] = []): any[] {
  if (!dbObj || dbObj.closed) throw new Error('Database is closed or not initialized');
  const module = sqlite3.module;
  const sqlPtr = module.allocateUTF8(sql);
  const stmtPtr = module._malloc(4);
  const allocatedStrings: number[] = [];

  try {
    const result = module._sqlite3_prepare_v2(
      dbObj.dbPtr,
      sqlPtr,
      -1,
      stmtPtr,
      0
    );

    if (result !== SQLITE_OK) {
      const errMsg = getSqliteErrorMessage(dbObj);
      throw new Error(`Failed to prepare statement: ${errMsg}`);
    }

    const stmt = module.getValue(stmtPtr, 'i32');
    if (!stmt) {
      throw new Error('Failed to prepare statement: null statement');
    }

    try {
      // Биндим параметры
      for (let i = 0; i < params.length; i++) {
        const param = params[i];
        const index = i + 1;
        if (param === null || param === undefined) {
          module._sqlite3_bind_null(stmt, index);
        } else if (typeof param === 'number') {
          if (Number.isInteger(param)) {
            if (param > 2147483647 || param < -2147483648) {
              module._sqlite3_bind_double(stmt, index, param);
            } else {
              module._sqlite3_bind_int(stmt, index, param);
            }
          } else {
            module._sqlite3_bind_double(stmt, index, param);
          }
        } else if (typeof param === 'string') {
          const strPtr = module.allocateUTF8(param);
          allocatedStrings.push(strPtr);
          module._sqlite3_bind_text(stmt, index, strPtr, -1, 0);
        } else {
          throw new Error(`Unsupported parameter type: ${typeof param}`);
        }
      }

      const columnCount = module._sqlite3_column_count(stmt);
      const columns: string[] = [];
      for (let i = 0; i < columnCount; i++) {
        const namePtr = module._sqlite3_column_name(stmt, i);
        columns.push(module.UTF8ToString(namePtr));
      }

      const rows: any[] = [];
      while (true) {
        const stepResult = module._sqlite3_step(stmt);
        if (stepResult === SQLITE_DONE) {
          break;
        }
        if (stepResult !== SQLITE_ROW) {
          const errMsg = getSqliteErrorMessage(dbObj);
          throw new Error(`Step failed: ${errMsg}`);
        }

        const row: any = {};
        for (let i = 0; i < columnCount; i++) {
          const type = module._sqlite3_column_type(stmt, i);
          if (type === 5) { // SQLITE_NULL
            row[columns[i]] = null;
          } else if (type === 1 || type === 2) { // SQLITE_INTEGER, SQLITE_FLOAT
            row[columns[i]] = module._sqlite3_column_double(stmt, i);
          } else { // SQLITE_TEXT, SQLITE_BLOB и др.
            const valPtr = module._sqlite3_column_text(stmt, i);
            row[columns[i]] = valPtr ? module.UTF8ToString(valPtr) : null;
          }
        }
        rows.push(row);
      }

      return rows;
    } finally {
      module._sqlite3_finalize(stmt);
      for (const strPtr of allocatedStrings) {
        module._free(strPtr);
      }
    }
  } finally {
    module._free(stmtPtr);
    module._free(sqlPtr);
  }
}

function customExecute(dbObj: any, sql: string, params: any[] = []): void {
  if (!dbObj || dbObj.closed) throw new Error('Database is closed or not initialized');
  const module = sqlite3.module;
  const sqlPtr = module.allocateUTF8(sql);
  const stmtPtr = module._malloc(4);
  const allocatedStrings: number[] = [];

  try {
    const result = module._sqlite3_prepare_v2(
      dbObj.dbPtr,
      sqlPtr,
      -1,
      stmtPtr,
      0
    );

    if (result !== SQLITE_OK) {
      const errMsg = getSqliteErrorMessage(dbObj);
      throw new Error(`Failed to prepare statement: ${errMsg}`);
    }

    const stmt = module.getValue(stmtPtr, 'i32');
    if (!stmt) {
      throw new Error('Failed to prepare statement: null statement');
    }

    try {
      // Биндим параметры
      for (let i = 0; i < params.length; i++) {
        const param = params[i];
        const index = i + 1;
        if (param === null || param === undefined) {
          module._sqlite3_bind_null(stmt, index);
        } else if (typeof param === 'number') {
          if (Number.isInteger(param)) {
            if (param > 2147483647 || param < -2147483648) {
              module._sqlite3_bind_double(stmt, index, param);
            } else {
              module._sqlite3_bind_int(stmt, index, param);
            }
          } else {
            module._sqlite3_bind_double(stmt, index, param);
          }
        } else if (typeof param === 'string') {
          const strPtr = module.allocateUTF8(param);
          allocatedStrings.push(strPtr);
          module._sqlite3_bind_text(stmt, index, strPtr, -1, 0);
        } else {
          throw new Error(`Unsupported parameter type: ${typeof param}`);
        }
      }

      const stepResult = module._sqlite3_step(stmt);
      if (stepResult !== SQLITE_DONE && stepResult !== SQLITE_ROW) {
        const errMsg = getSqliteErrorMessage(dbObj);
        throw new Error(`Execute step failed: ${errMsg}`);
      }
    } finally {
      module._sqlite3_finalize(stmt);
      for (const strPtr of allocatedStrings) {
        module._free(strPtr);
      }
    }
  } finally {
    module._free(stmtPtr);
    module._free(sqlPtr);
  }
}

function customTransaction(dbObj: any, statements: { sql: string; params?: any[] }[]): void {
  try {
    customExecute(dbObj, "BEGIN TRANSACTION;");
    for (const stmt of statements) {
      customExecute(dbObj, stmt.sql, stmt.params || []);
    }
    customExecute(dbObj, "COMMIT TRANSACTION;");
  } catch (err) {
    try {
      customExecute(dbObj, "ROLLBACK TRANSACTION;");
    } catch (e) {
      // Игнорируем ошибку отката транзакции
    }
    throw err;
  }
}

self.onmessage = async (e: MessageEvent) => {
  const { id, type, payload } = e.data;

  try {
    await initSqlite();

    if (type === 'open') {
      const { dbName, key } = payload;

      if (db) {
        try {
          db.close();
        } catch (e) {}
        db = null;
      }

      currentDbName = dbName.startsWith('/') ? dbName.substring(1) : dbName;
      currentDbPath = `/${currentDbName}`;

      await mountIDBFS();

      console.log(`[SQLite Worker] Открытие базы данных по пути: ${currentDbPath}`);
      db = sqlite3.open(currentDbPath, null);

      if (key) {
        const safeKey = key.replace(/'/g, "''");
        try {
          db.exec(`PRAGMA key = "x'${safeKey}'";`);
        } catch (err: any) {
          throw new Error("Incorrect password");
        }

        // Выполняем проверочный запрос сразу после PRAGMA key
        try {
          customQuery(db, "SELECT count(*) FROM sqlite_schema;");
        } catch (err: any) {
          throw new Error("Incorrect password");
        }
      }

      // Проверка целостности базы данных при открытии
      try {
        const integrity = customQuery(db, "PRAGMA integrity_check;");
        const ok = integrity && integrity[0] && Object.values(integrity[0])[0] === "ok";
        if (!ok) {
          throw new Error("Database integrity check failed");
        }
      } catch (integrityErr: any) {
        console.error("[SQLite Worker] PRAGMA integrity_check при открытии провалился:", integrityErr);
        try {
          db.close();
        } catch (e) {}
        db = null;
        try {
          wasm.FS.unlink(currentDbPath);
        } catch (e) {}
        await writeToIndexedDB(currentDbName, new Uint8Array(0)); // Очищаем IndexedDB от битого файла
        throw new Error("Database integrity check failed: " + (integrityErr.message || integrityErr));
      }

      customExecute(db, "PRAGMA foreign_keys = ON;");

      if (isMounted) {
        await syncDatabase();
      }

      self.postMessage({ id, success: true });
    } else if (type === 'query') {
      const { sql, params } = payload;
      const result = customQuery(db, sql, params || []);
      self.postMessage({ id, success: true, result });
    } else if (type === 'execute') {
      const { sql, params } = payload;
      customExecute(db, sql, params || []);
      if (isMounted) {
        queueSync();
      }
      self.postMessage({ id, success: true });
    } else if (type === 'transaction') {
      const { statements } = payload;
      customTransaction(db, statements);
      if (isMounted) {
        queueSync();
      }
      self.postMessage({ id, success: true });
    } else if (type === 'close') {
      if (db) {
        db.close();
        db = null;
      }
      if (isMounted) {
        await syncDatabase();
      }
      self.postMessage({ id, success: true });
    } else if (type === 'sync') {
      if (isMounted) {
        await syncDatabase();
      }
      self.postMessage({ id, success: true });
    }
  } catch (err: any) {
    console.error(`[SQLite Worker] Ошибка при обработке ${type}:`, err);
    self.postMessage({ id, success: false, error: err.message || String(err) });
  }
};
