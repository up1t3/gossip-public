// frontend/src/core/storage/drivers/wasm-driver.ts
import { DatabaseDriver } from '../types';
let DbWorkerClass: any = null;

export class WasmDriver implements DatabaseDriver {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, { resolve: (val: any) => void; reject: (err: any) => void }> = new Map();
  private idCounter = 0;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initWorker();
  }

  private async initWorker() {
    if (!DbWorkerClass && (typeof window !== 'undefined' || typeof Worker !== 'undefined')) {
      try {
        // @ts-ignore
        const mod = await import('./database.worker?worker');
        DbWorkerClass = mod.default;
      } catch (err) {
        console.warn('[WasmDriver] Dynamic worker import unavailable:', err);
      }
    }
    if (DbWorkerClass) {
      const worker = new DbWorkerClass();
      this.worker = worker;
      worker.onmessage = (e: MessageEvent) => {
        const { id, success, result, error } = e.data;
        const pending = this.pendingRequests.get(id);
        if (pending) {
          this.pendingRequests.delete(id);
          if (success) {
            pending.resolve(result);
          } else {
            pending.reject(new Error(error));
          }
        }
      };
    }
  }

  private async sendToWorker<T = any>(type: string, payload: any): Promise<T> {
    if (this.initPromise) {
      await this.initPromise;
    }
    if (!this.worker) {
      throw new Error('Worker не инициализирован');
    }
    const id = `${type}-${++this.idCounter}-${Math.random().toString(36).substr(2, 9)}`;
    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.worker!.postMessage({ id, type, payload });
    });
  }

  async open(dbName: string, key: string): Promise<void> {
    await this.sendToWorker('open', { dbName, key });
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    return await this.sendToWorker<T[]>('query', { sql, params });
  }

  async execute(sql: string, params?: any[]): Promise<void> {
    await this.sendToWorker('execute', { sql, params });
  }

  async transaction(statements: { sql: string; params?: any[] }[]): Promise<void> {
    await this.sendToWorker('transaction', { statements });
  }

  async close(): Promise<void> {
    await this.sendToWorker('close', {});
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  async sync(): Promise<void> {
    await this.sendToWorker('sync', {});
  }
}
