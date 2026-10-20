// frontend/src/core/transport/bridge/bridge-queue.ts
/**
 * Очередь ретранслятора сообщений (Bridge FIFO Queue)
 * 
 * Отвечает за:
 * 1. Буферизацию транзитных пакетов со строгим ограничением размера <= 100 конвертов (MAX_BRIDGE_QUEUE_SIZE = 100).
 * 2. Реализацию политики вытеснения старых элементов (FIFO Drop Policy): при переполнении
 *    старейший элемент в голове очереди отбрасывается для освобождения места новому пакету.
 * 3. Сбор точных метрик: количество добавленных, извлеченных и вытесненных пакетов.
 * 4. Защиту памяти узла-моста от перегрузки транзитным трафиком.
 */

import { MeshEnvelope } from '../transport';

/** Максимальный размер очереди моста согласно спецификации §6.1 / §6.2 */
export const MAX_BRIDGE_QUEUE_SIZE = 100;

export interface BridgeQueueMetrics {
  packetsEnqueued: number;
  packetsDequeued: number;
  packetsDropped: number;
  currentSize: number;
  maxSize: number;
}

export class BridgeQueue {
  private readonly queue: MeshEnvelope[] = [];
  private readonly maxSize: number;

  private packetsEnqueued: number = 0;
  private packetsDequeued: number = 0;
  private packetsDropped: number = 0;

  constructor(maxSize = MAX_BRIDGE_QUEUE_SIZE) {
    this.maxSize = maxSize > 0 ? maxSize : MAX_BRIDGE_QUEUE_SIZE;
  }

  /**
   * Добавление конверта в конец очереди.
   * Если очередь заполнена, вытесняет старейший элемент (FIFO drop).
   * 
   * @param envelope Конверт для добавления
   * @returns true, если конверт успешно добавлен в очередь
   */
  public enqueue(envelope: MeshEnvelope): boolean {
    if (!envelope || !envelope.id) {
      return false;
    }

    // Если буфер заполнен до лимита — вытесняем старейший пакет
    if (this.queue.length >= this.maxSize) {
      this.queue.shift();
      this.packetsDropped++;
    }

    this.queue.push(envelope);
    this.packetsEnqueued++;
    return true;
  }

  /**
   * Возврат конвертов обратно в начало очереди (например, при сетевой ошибке отправки)
   */
  public prepend(envelopes: MeshEnvelope[]): void {
    if (!envelopes || envelopes.length === 0) return;

    for (let i = envelopes.length - 1; i >= 0; i--) {
      const env = envelopes[i];
      if (this.queue.length >= this.maxSize) {
        // Вытесняем с конца, если превышен лимит
        this.queue.pop();
        this.packetsDropped++;
      }
      this.queue.unshift(env);
    }
  }

  /**
   * Извлечение следующего конверта из головы очереди
   */
  public dequeue(): MeshEnvelope | undefined {
    const item = this.queue.shift();
    if (item) {
      this.packetsDequeued++;
    }
    return item;
  }

  /**
   * Просмотр первого элемента без извлечения
   */
  public peek(): MeshEnvelope | undefined {
    return this.queue[0];
  }

  /**
   * Извлечение пачки элементов из очереди (до maxCount или всех)
   */
  public drain(maxCount?: number): MeshEnvelope[] {
    const limit = typeof maxCount === 'number' && maxCount > 0
      ? Math.min(maxCount, this.queue.length)
      : this.queue.length;

    if (limit === 0) return [];

    const drained = this.queue.splice(0, limit);
    this.packetsDequeued += drained.length;
    return drained;
  }

  /**
   * Текущий размер очереди
   */
  public size(): number {
    return this.queue.length;
  }

  /**
   * Проверка пустоты очереди
   */
  public isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Проверка заполненности очереди до максимума
   */
  public isFull(): boolean {
    return this.queue.length >= this.maxSize;
  }

  /**
   * Очистка очереди
   */
  public clear(): void {
    this.queue.length = 0;
  }

  /**
   * Получение копии всех конвертов в очереди
   */
  public getEnvelopes(): MeshEnvelope[] {
    return [...this.queue];
  }

  /**
   * Получение метрик работы очереди
   */
  public getMetrics(): BridgeQueueMetrics {
    return {
      packetsEnqueued: this.packetsEnqueued,
      packetsDequeued: this.packetsDequeued,
      packetsDropped: this.packetsDropped,
      currentSize: this.queue.length,
      maxSize: this.maxSize,
    };
  }
}
