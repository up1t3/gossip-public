// frontend/src/core/transport/bridge/relay-client.ts
/**
 * Клиент ретрансляции конвертов в облако (Relay Client)
 * 
 * Отвечает за:
 * 1. Формирование и отправку запросов на эндпоинт POST /api/v1/mesh/relay (бэкенд main.py:3445).
 * 2. Строгую валидацию полезной нагрузки (размер <= 512 КБ, TTL > 0, срок жизни <= 7 суток).
 * 3. Надежную обработку сетевых ошибок, таймаутов и экспоненциальный бэкофф при HTTP 429 (Rate Limit).
 * 4. Полную прозрачность E2EE (Single-Encryption Invariant): шифротекст передается без изменений.
 */

import { MeshEnvelope } from '../transport';

/** Максимальный допустимый размер полезной нагрузки одного конверта (512 КБ) */
export const MAX_PAYLOAD_SIZE_BYTES = 512 * 1024;

/** Максимальный срок жизни конверта: 7 суток (в миллисекундах) */
export const MAX_ENVELOPE_AGE_MS = 7 * 24 * 3600 * 1000;

/** Стандартный таймаут сетевого запроса к релей-эндпоинту (10 секунд) */
export const DEFAULT_RELAY_TIMEOUT_MS = 10000;

/** Базовая задержка экспоненциального бэкоффа (в миллисекундах) */
export const BASE_BACKOFF_MS = 500;

/** Максимальное количество повторных попыток при 429 / сетевых сбоях */
export const MAX_RETRY_ATTEMPTS = 3;

/** Сериализуемый формат конверта для POST /api/v1/mesh/relay */
export interface RelayEnvelopePayload {
  id: string;
  recipientTag: string;
  encryptedPayload: string;
  ttl: number;
  hopCount: number;
  timestamp: number;
}

/** Тело запроса к эндпоинту POST /api/v1/mesh/relay */
export interface MeshRelayRequest {
  envelopes: RelayEnvelopePayload[];
  nodeId?: string;
}

/** Ответ сервера от эндпоинта POST /api/v1/mesh/relay */
export interface MeshRelayResponse {
  success: boolean;
  received: number;
  relayed: number;
  error?: string;
  rateLimited?: boolean;
  retryAfterMs?: number;
}

/** Опции конфигурации клиента релея */
export interface RelayClientOptions {
  endpointUrl?: string;
  timeoutMs?: number;
  customFetch?: typeof fetch;
  maxRetries?: number;
}

export class RelayClient {
  private readonly endpointUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;
  private readonly maxRetries: number;

  constructor(options?: RelayClientOptions) {
    this.endpointUrl = options?.endpointUrl || '/api/v1/mesh/relay';
    this.timeoutMs = options?.timeoutMs || DEFAULT_RELAY_TIMEOUT_MS;
    this.fetchFn = options?.customFetch || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : (undefined as any));
    this.maxRetries = options?.maxRetries ?? MAX_RETRY_ATTEMPTS;
  }

  /**
   * Валидация конверта перед отправкой на сервер.
   * Проверяет размер шифротекста (<= 512 КБ), TTL (> 0), возраст (<= 7 суток) и целостность полей.
   */
  public validateEnvelope(envelope: MeshEnvelope): { valid: boolean; reason?: string } {
    if (!envelope || typeof envelope !== 'object') {
      return { valid: false, reason: 'Конверт отсутствует или имеет некорректный тип' };
    }

    if (!envelope.id || typeof envelope.id !== 'string' || envelope.id.trim() === '') {
      return { valid: false, reason: 'Отсутствует или пустой идентификатор конверта (id)' };
    }

    if (!envelope.encryptedPayload || typeof envelope.encryptedPayload !== 'string') {
      return { valid: false, reason: 'Отсутствует полезная зашифрованная нагрузка (encryptedPayload)' };
    }

    // Проверка размера полезной нагрузки (<= 512 КБ)
    if (envelope.encryptedPayload.length > MAX_PAYLOAD_SIZE_BYTES) {
      return {
        valid: false,
        reason: `Превышен максимальный размер полезной нагрузки: ${envelope.encryptedPayload.length} > ${MAX_PAYLOAD_SIZE_BYTES} байт`,
      };
    }

    // Проверка TTL (> 0)
    if (typeof envelope.ttl !== 'number' || envelope.ttl <= 0) {
      return { valid: false, reason: `Недопустимое значение TTL: ${envelope.ttl} (должно быть > 0)` };
    }

    // Проверка возраста конверта (не старше 7 суток)
    const now = Date.now();
    if (envelope.timestamp && typeof envelope.timestamp === 'number') {
      const ageMs = now - envelope.timestamp;
      if (ageMs > MAX_ENVELOPE_AGE_MS) {
        return {
          valid: false,
          reason: `Истек срок жизни конверта: возраст ${Math.round(ageMs / 1000)}с превышает 7 суток`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Отправка пачки конвертов на бэкенд POST /api/v1/mesh/relay с поддержкой бэкоффа и ретраев.
   * 
   * @param envelopes Массив конвертов для ретрансляции
   * @param nodeId Идентификатор узла-моста (для телеметрии сервера)
   * @returns Результат выполнения запроса
   */
  public async relayEnvelopes(
    envelopes: MeshEnvelope[],
    nodeId?: string
  ): Promise<MeshRelayResponse> {
    if (!envelopes || envelopes.length === 0) {
      return { success: true, received: 0, relayed: 0 };
    }

    // 1. Фильтрация и валидация входящих конвертов
    const validEnvelopes: RelayEnvelopePayload[] = [];
    for (const env of envelopes) {
      const validation = this.validateEnvelope(env);
      if (validation.valid) {
        validEnvelopes.push({
          id: env.id,
          recipientTag: env.recipientTag || '',
          encryptedPayload: env.encryptedPayload,
          ttl: env.ttl,
          hopCount: env.hopCount,
          timestamp: env.timestamp || Date.now(),
        });
      } else {
        console.warn(`[RelayClient] Конверт ${env?.id} отклонен валидацией:`, validation.reason);
      }
    }

    if (validEnvelopes.length === 0) {
      return {
        success: false,
        received: envelopes.length,
        relayed: 0,
        error: 'Ни один из переданных конвертов не прошел валидацию',
      };
    }

    const payload: MeshRelayRequest = {
      envelopes: validEnvelopes,
      nodeId: nodeId || 'anonymous-community-bridge',
    };

    // 2. Исполнение запроса с экспоненциальным бэкоффом
    return this.executeWithRetry(payload, 0);
  }

  /**
   * Отправка одиночного конверта
   */
  public async sendEnvelope(envelope: MeshEnvelope, nodeId?: string): Promise<MeshRelayResponse> {
    return this.relayEnvelopes([envelope], nodeId);
  }

  /**
   * Внутренний цикл выполнения HTTP-запроса с обработкой 429 и ретраев
   */
  private async executeWithRetry(
    payload: MeshRelayRequest,
    attempt: number
  ): Promise<MeshRelayResponse> {
    if (!this.fetchFn) {
      return {
        success: false,
        received: payload.envelopes.length,
        relayed: 0,
        error: 'Fetch API недоступен в текущем рантайме',
      };
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), this.timeoutMs) : null;

    try {
      const response = await this.fetchFn(this.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller?.signal,
      });

      if (timeoutId) clearTimeout(timeoutId);

      // Обработка ограничения частоты запросов (HTTP 429 Too Many Requests)
      if (response.status === 429) {
        const retryAfterHeader = response.headers?.get?.('Retry-After');
        let retryAfterMs = BASE_BACKOFF_MS * Math.pow(2, attempt);
        if (retryAfterHeader) {
          const parsedSeconds = parseInt(retryAfterHeader, 10);
          if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
            retryAfterMs = parsedSeconds * 1000;
          }
        }

        if (attempt < this.maxRetries) {
          console.warn(
            `[RelayClient] HTTP 429 Rate Limit. Повторная попытка ${attempt + 1}/${this.maxRetries} через ${retryAfterMs}мс`
          );
          await this.delay(retryAfterMs);
          return this.executeWithRetry(payload, attempt + 1);
        }

        return {
          success: false,
          received: payload.envelopes.length,
          relayed: 0,
          rateLimited: true,
          retryAfterMs,
          error: `Превышен лимит запросов к серверу (HTTP 429). Повтор через ${retryAfterMs}мс`,
        };
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Неизвестная ошибка HTTP');
        return {
          success: false,
          received: payload.envelopes.length,
          relayed: 0,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const data = await response.json();
      return {
        success: Boolean(data.success),
        received: typeof data.received === 'number' ? data.received : payload.envelopes.length,
        relayed: typeof data.relayed === 'number' ? data.relayed : payload.envelopes.length,
        error: data.error,
      };
    } catch (err: any) {
      if (timeoutId) clearTimeout(timeoutId);

      const isAbort = err?.name === 'AbortError' || err?.message?.includes('aborted');
      const errorMessage = isAbort
        ? `Таймаут запроса к релею (${this.timeoutMs}мс)`
        : err?.message || 'Сетевая ошибка при обращении к релею';

      if (attempt < this.maxRetries && !isAbort) {
        const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(`[RelayClient] Сетевой сбой (${errorMessage}). Ретрай через ${backoff}мс`);
        await this.delay(backoff);
        return this.executeWithRetry(payload, attempt + 1);
      }

      return {
        success: false,
        received: payload.envelopes.length,
        relayed: 0,
        error: errorMessage,
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
