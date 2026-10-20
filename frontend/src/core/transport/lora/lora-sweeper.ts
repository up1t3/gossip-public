// frontend/src/core/transport/lora/lora-sweeper.ts
/**
 * Сборщик мусора LoRa фрагментов (LoRa Fragment Sweeper).
 * 
 * Очищает зависшие и несобранные фрагменты пакетов старше 10 минут (600 секунд)
 * из оперативной памяти и из постоянной таблицы SQLite `lora_fragments`.
 * 
 * Защищает узел от утечек памяти и исчерпания дискового пространства
 * при потере части радиопакетов в условиях помех.
 */

import { LoRaReassembler, StoredFragment } from './lora-chunker';

export const LORA_FRAGMENT_TTL_MS = 600000; // 10 минут (600 секунд)
export const LORA_SWEEPER_INTERVAL_MS = 60000; // 1 минута

export interface StorageExecutor {
  execute(sql: string, params?: any[]): Promise<void>;
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
}

/**
 * Очистка устаревших фрагментов из Map хранилища в оперативной памяти
 * @returns Количество удаленных фрагментов
 */
export function sweepLoRaFragmentsInMemory(
  fragmentStore: Map<number, Map<number, StoredFragment | { chunk: Uint8Array; total: number; createdAt: number }>>,
  ttlMs: number = LORA_FRAGMENT_TTL_MS,
  now: number = Date.now()
): number {
  let deletedCount = 0;

  for (const [crc, session] of fragmentStore.entries()) {
    for (const [seq, fragment] of session.entries()) {
      if (now - fragment.createdAt > ttlMs) {
        session.delete(seq);
        deletedCount++;
      }
    }
    if (session.size === 0) {
      fragmentStore.delete(crc);
    }
  }

  return deletedCount;
}

/**
 * Очистка устаревших фрагментов из таблицы SQLite `lora_fragments`
 */
export async function sweepLoRaFragmentsSqlite(
  storage: StorageExecutor,
  ttlMs: number = LORA_FRAGMENT_TTL_MS,
  now: number = Date.now()
): Promise<number> {
  const cutoffTime = now - ttlMs;
  try {
    // Получаем количество записей перед удалением
    let countBefore = 0;
    try {
      const rows = await storage.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM lora_fragments WHERE created_at < ?;',
        [cutoffTime]
      );
      if (rows && rows.length > 0) {
        countBefore = rows[0].count;
      }
    } catch {}

    await storage.execute(
      'DELETE FROM lora_fragments WHERE created_at < ?;',
      [cutoffTime]
    );

    return countBefore;
  } catch (err) {
    console.warn('[LoRaSweeper] Ошибка очистки lora_fragments в SQLite:', err);
    return 0;
  }
}

export interface LoRaSweeperOptions {
  ttlMs?: number;
  intervalMs?: number;
  reassembler?: LoRaReassembler;
  inMemoryStore?: Map<number, Map<number, any>>;
  storage?: StorageExecutor;
  onSweep?: (cleanedCount: number) => void;
}

/**
 * Фоновый сервис сборки мусора и очистки устаревших радио-фрагментов
 */
export class LoRaSweeper {
  private readonly ttlMs: number;
  private readonly intervalMs: number;
  private readonly reassembler?: LoRaReassembler;
  private readonly inMemoryStore?: Map<number, Map<number, any>>;
  private readonly storage?: StorageExecutor;
  private readonly onSweep?: (cleanedCount: number) => void;

  private timer: any = null;
  private isRunning: boolean = false;

  constructor(options?: LoRaSweeperOptions) {
    this.ttlMs = options?.ttlMs ?? LORA_FRAGMENT_TTL_MS;
    this.intervalMs = options?.intervalMs ?? LORA_SWEEPER_INTERVAL_MS;
    this.reassembler = options?.reassembler;
    this.inMemoryStore = options?.inMemoryStore;
    this.storage = options?.storage;
    this.onSweep = options?.onSweep;
  }

  /**
   * Запуск периодической очистки
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.timer = setInterval(() => {
      this.runSweeper().catch((e) => {
        console.warn('[LoRaSweeper] Ошибка периодической очистки:', e);
      });
    }, this.intervalMs);
  }

  /**
   * Остановка периодической очистки
   */
  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Принудительный запуск цикла сборщика мусора
   * @param overrideTtlMs Кастомный TTL в миллисекундах
   * @param now Текущий таймстамп
   * @returns Общее количество удаленных фрагментов
   */
  public async runSweeper(overrideTtlMs?: number, now: number = Date.now()): Promise<number> {
    const effectiveTtl = overrideTtlMs ?? this.ttlMs;
    let totalCleaned = 0;

    // 1. Очистка Reassembler in-memory
    if (this.reassembler) {
      totalCleaned += sweepLoRaFragmentsInMemory(this.reassembler.fragmentStore, effectiveTtl, now);
    }

    // 2. Очистка кастомного in-memory store
    if (this.inMemoryStore && this.inMemoryStore !== this.reassembler?.fragmentStore) {
      totalCleaned += sweepLoRaFragmentsInMemory(this.inMemoryStore, effectiveTtl, now);
    }

    // 3. Очистка SQLite
    if (this.storage) {
      totalCleaned += await sweepLoRaFragmentsSqlite(this.storage, effectiveTtl, now);
    }

    if (totalCleaned > 0 && this.onSweep) {
      this.onSweep(totalCleaned);
    }

    return totalCleaned;
  }

  public getStatus(): { isRunning: boolean; ttlMs: number; intervalMs: number } {
    return {
      isRunning: this.isRunning,
      ttlMs: this.ttlMs,
      intervalMs: this.intervalMs,
    };
  }
}
