// frontend/src/core/storage/drivers/electron-driver.ts
import { DatabaseDriver } from '../types';

export class ElectronDriver implements DatabaseDriver {
  async open(dbName: string, key: string): Promise<void> {
    if (!(window as any).electronAPI || !(window as any).electronAPI.invoke) {
      throw new Error('electronAPI.invoke не доступен. Убедитесь, что приложение запущено в Electron.');
    }
    await (window as any).electronAPI.invoke('storage:open', dbName, key);
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    return await (window as any).electronAPI.invoke('storage:query', sql, params);
  }

  async execute(sql: string, params?: any[]): Promise<void> {
    await (window as any).electronAPI.invoke('storage:execute', sql, params);
  }

  async transaction(statements: { sql: string; params?: any[] }[]): Promise<void> {
    await (window as any).electronAPI.invoke('storage:transaction', statements);
  }

  async close(): Promise<void> {
    // В Electron-драйвере закрытие происходит на уровне главного процесса при выходе,
    // но можно добавить обработчик, если требуется явное закрытие.
  }
}
