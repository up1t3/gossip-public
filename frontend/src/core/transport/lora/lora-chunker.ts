// frontend/src/core/transport/lora/lora-chunker.ts
/**
 * L2 Чанкинг и фрагментация сетевых пакетов LoRa (Фаза T3: LoRa Transport).
 * 
 * Структура 12-байтного бинарного L2 заголовка:
 * - MAGIC (2 байта, uint16 BE): 0xFA22
 * - ENV_ID_CRC32 (4 байта, uint32 BE): CRC32 идентификатора конверта
 * - SEQ (2 байта, uint16 BE): порядковый номер чанка (0-indexed)
 * - TOTAL (2 байта, uint16 BE): общее количество чанков
 * - CRC16_PAYLOAD (2 байта, uint16 BE): контрольная сумма полезной нагрузки чанка
 * 
 * MTU: 200 байт (12 байт L2 заголовок + до 188 байт полезная нагрузка).
 * Гарантируется побайтовая проверка целостности CRC16 и выборочный NACK.
 */

import { MeshEnvelope } from '../transport';

export const LORA_MAGIC = 0xfa22;
export const LORA_HEADER_SIZE = 12;
export const LORA_MAX_CHUNK_PAYLOAD = 188;
export const LORA_MTU = 200;

/** Структура разобранного LoRa чанка */
export interface LoRaChunk {
  magic: number; // 0xFA22
  envelopeCrc32: number;
  seq: number;
  total: number;
  payloadCrc16: number;
  payload: Uint8Array;
}

/** Таблица для быстрого расчета CRC32 (IEEE 802.3) */
const crc32Table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crc32Table[i] = c;
}

/**
 * Расчет CRC32 строки или бинарных данных
 */
export function calculateCRC32(data: string | Uint8Array): number {
  let crc = 0 ^ -1;
  if (typeof data === 'string') {
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ crc32Table[(crc ^ data.charCodeAt(i)) & 0xff];
    }
  } else {
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ crc32Table[(crc ^ data[i]) & 0xff];
    }
  }
  return (crc ^ -1) >>> 0;
}

/**
 * Расчет CRC16 (CRC-16-CCITT poly 0x1021, init 0xFFFF)
 */
export function calculateCRC16(data: Uint8Array): number {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc & 0xffff;
}

/**
 * Разбиение полезной нагрузки на LoRa чанки с L2 заголовками
 */
export function chunkPayload(
  envelopeId: string,
  payload: Uint8Array | string,
  maxChunkPayload: number = LORA_MAX_CHUNK_PAYLOAD
): LoRaChunk[] {
  const bytes = typeof payload === 'string'
    ? new TextEncoder().encode(payload)
    : payload;

  const envCrc32 = calculateCRC32(envelopeId);
  const totalChunks = Math.max(1, Math.ceil(bytes.length / maxChunkPayload));
  const chunks: LoRaChunk[] = [];

  for (let seq = 0; seq < totalChunks; seq++) {
    const start = seq * maxChunkPayload;
    const end = Math.min(bytes.length, start + maxChunkPayload);
    const chunkData = bytes.slice(start, end);
    const payloadCrc16 = calculateCRC16(chunkData);

    chunks.push({
      magic: LORA_MAGIC,
      envelopeCrc32: envCrc32,
      seq,
      total: totalChunks,
      payloadCrc16,
      payload: chunkData,
    });
  }

  return chunks;
}

/**
 * Упаковка чанка в 12-байтный бинарный L2 фрейм
 */
export function frameLoRaChunk(chunk: LoRaChunk): Uint8Array {
  const buffer = new Uint8Array(LORA_HEADER_SIZE + chunk.payload.length);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  view.setUint16(0, chunk.magic || LORA_MAGIC, false); // Big-Endian
  view.setUint32(2, chunk.envelopeCrc32, false);
  view.setUint16(6, chunk.seq, false);
  view.setUint16(8, chunk.total, false);
  view.setUint16(10, chunk.payloadCrc16, false);
  buffer.set(chunk.payload, LORA_HEADER_SIZE);

  return buffer;
}

/** Синоним для обратной совместимости */
export const frameChunk = frameLoRaChunk;

/**
 * Распаковка и побайтовая проверка целостности LoRa фрейма
 * При несовпадении CRC16 или повреждении заголовка возвращает null
 */
export function deframeLoRaChunk(data: Uint8Array): LoRaChunk | null {
  if (!data || data.length < LORA_HEADER_SIZE) {
    return null;
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const magic = view.getUint16(0, false);
  if (magic !== LORA_MAGIC) {
    return null;
  }

  const envelopeCrc32 = view.getUint32(2, false);
  const seq = view.getUint16(6, false);
  const total = view.getUint16(8, false);
  const payloadCrc16 = view.getUint16(10, false);

  if (total === 0 || seq >= total) {
    return null;
  }

  const payload = data.slice(LORA_HEADER_SIZE);
  const actualCrc16 = calculateCRC16(payload);

  if (actualCrc16 !== payloadCrc16) {
    return null; // Поврежденный фрейм отбрасывается
  }

  return {
    magic,
    envelopeCrc32,
    seq,
    total,
    payloadCrc16,
    payload,
  };
}

/** Синоним для обратной совместимости */
export const deframeChunk = deframeLoRaChunk;

/** Структура фрагмента в сессии сборки */
export interface StoredFragment {
  chunk: Uint8Array;
  total: number;
  createdAt: number;
  rawEnvelopeId?: string;
  senderId?: string;
}

/** Результат обработки входящего чанка */
export interface ReassemblyResult {
  complete: boolean;
  envelopeCrc32: number;
  payload?: Uint8Array;
  envelope?: MeshEnvelope;
  missingSeqs?: number[];
}

/**
 * Класс дефрагментации и реассемблирования пакетов LoRa
 */
export class LoRaReassembler {
  public readonly fragmentStore = new Map<number, Map<number, StoredFragment>>();

  /**
   * Добавление входящего валидного чанка в хранилище сборки
   */
  public addChunk(
    chunk: LoRaChunk,
    senderId?: string,
    rawEnvelopeId?: string
  ): ReassemblyResult | null {
    if (!chunk) return null;

    let session = this.fragmentStore.get(chunk.envelopeCrc32);
    if (!session) {
      session = new Map<number, StoredFragment>();
      this.fragmentStore.set(chunk.envelopeCrc32, session);
    }

    session.set(chunk.seq, {
      chunk: chunk.payload,
      total: chunk.total,
      createdAt: Date.now(),
      rawEnvelopeId,
      senderId,
    });

    if (session.size === chunk.total) {
      // Все фрагменты получены — собираем полный пакет
      let totalLength = 0;
      for (let s = 0; s < chunk.total; s++) {
        const frag = session.get(s);
        if (!frag) {
          return {
            complete: false,
            envelopeCrc32: chunk.envelopeCrc32,
            missingSeqs: this.getMissingChunkSeqs(chunk.envelopeCrc32, chunk.total),
          };
        }
        totalLength += frag.chunk.length;
      }

      const fullPayload = new Uint8Array(totalLength);
      let offset = 0;
      for (let s = 0; s < chunk.total; s++) {
        const part = session.get(s)!.chunk;
        fullPayload.set(part, offset);
        offset += part.length;
      }

      this.fragmentStore.delete(chunk.envelopeCrc32);

      let envelope: MeshEnvelope | undefined;
      try {
        const text = new TextDecoder().decode(fullPayload);
        envelope = JSON.parse(text);
      } catch {}

      return {
        complete: true,
        envelopeCrc32: chunk.envelopeCrc32,
        payload: fullPayload,
        envelope,
      };
    }

    return {
      complete: false,
      envelopeCrc32: chunk.envelopeCrc32,
      missingSeqs: this.getMissingChunkSeqs(chunk.envelopeCrc32, chunk.total),
    };
  }

  /**
   * Получение списка отсутствующих SEQ номеров для выборочного запроса (Selective NACK)
   */
  public getMissingChunkSeqs(envelopeCrc32: number, expectedTotal?: number): number[] {
    const session = this.fragmentStore.get(envelopeCrc32);
    if (!session || session.size === 0) {
      if (expectedTotal && expectedTotal > 0) {
        return Array.from({ length: expectedTotal }, (_, i) => i);
      }
      return [];
    }

    const first = Array.from(session.values())[0];
    const total = expectedTotal || first.total;
    const missing: number[] = [];

    for (let s = 0; s < total; s++) {
      if (!session.has(s)) {
        missing.push(s);
      }
    }

    return missing;
  }

  /**
   * Формирование битовой маски недостающих фрагментов (Selective NACK bitmask)
   */
  public getNackBitmask(envelopeCrc32: number, total: number): Uint8Array {
    const missing = new Set(this.getMissingChunkSeqs(envelopeCrc32, total));
    const byteLength = Math.ceil(total / 8);
    const mask = new Uint8Array(byteLength);

    for (let i = 0; i < total; i++) {
      if (missing.has(i)) {
        const byteIndex = Math.floor(i / 8);
        const bitIndex = i % 8;
        mask[byteIndex] |= (1 << bitIndex);
      }
    }

    return mask;
  }

  /**
   * Очистка сессии сборки конкретного конверта
   */
  public clearSession(envelopeCrc32: number): void {
    this.fragmentStore.delete(envelopeCrc32);
  }

  /**
   * Получение списка активных незавершенных сессий
   */
  public getIncompleteSessions(): number[] {
    return Array.from(this.fragmentStore.keys());
  }
}
