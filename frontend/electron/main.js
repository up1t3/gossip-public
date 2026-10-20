import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3-multiple-ciphers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let activeDb = null;

function registerStorageIpcHandlers() {
  ipcMain.handle('storage:open', async (event, dbName, key) => {
    try {
      const userDataPath = app.getPath('userData');
      const dbPath = path.join(userDataPath, dbName);
      console.log(`[Electron Main] Открытие БД по пути: ${dbPath}`);
      
      if (activeDb) {
        activeDb.close();
        activeDb = null;
      }
      
      activeDb = new Database(dbPath);
      // Устанавливаем ключ шифрования
      activeDb.pragma(`key = "x'${key}'"`);
      activeDb.pragma('foreign_keys = ON');
      
      return { success: true };
    } catch (err) {
      console.error('[Electron Main] Ошибка при открытии БД:', err);
      throw err;
    }
  });

  ipcMain.handle('storage:query', async (event, sql, params) => {
    if (!activeDb) throw new Error('База данных не открыта');
    try {
      const stmt = activeDb.prepare(sql);
      return stmt.all(params || []);
    } catch (err) {
      console.error(`[Electron Main] Ошибка при запросе: ${sql}`, err);
      throw err;
    }
  });

  ipcMain.handle('storage:execute', async (event, sql, params) => {
    if (!activeDb) throw new Error('База данных не открыта');
    try {
      const stmt = activeDb.prepare(sql);
      stmt.run(params || []);
      return { success: true };
    } catch (err) {
      console.error(`[Electron Main] Ошибка при выполнении: ${sql}`, err);
      throw err;
    }
  });

  ipcMain.handle('storage:transaction', async (event, statements) => {
    if (!activeDb) throw new Error('База данных не открыта');
    try {
      const runTx = activeDb.transaction((stmts) => {
        for (const s of stmts) {
          const stmt = activeDb.prepare(s.sql);
          stmt.run(s.params || []);
        }
      });
      runTx(statements);
      return { success: true };
    } catch (err) {
      console.error('[Electron Main] Ошибка в транзакции:', err);
      throw err;
    }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    title: 'Boltalka',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // В зависимости от режима окружения загружаем локальный хост или dist
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    win.loadURL('http://127.0.0.1:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  registerStorageIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (activeDb) {
    activeDb.close();
    activeDb = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
