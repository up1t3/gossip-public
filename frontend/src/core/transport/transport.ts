// frontend/src/core/transport/transport.ts
/**
 * Базовый контракт мультитранспортного меша (Вектор 2: Resilience)
 * Определяет унифицированные интерфейсы для всех видов сетевых транспортов:
 * LAN (Wi-Fi / Direct WSS), BLE Mesh, LoRa (RNode), Community Bridges.
 */

import { PrekeyBundle } from '../crypto/e2ee';

/** Типы поддерживаемых транспортов (включая custom_mock для расширяемости) */
export type TransportType = 'lan' | 'ble' | 'lora' | 'bridge' | 'mock' | 'custom_mock' | string;

/** Формат сетевого конверта сообщений меша (dumb pipe) */
export interface MeshEnvelope {
  /** Уникальный идентификатор конверта */
  id: string;
  /** Тег адресата или идентификатор чата */
  recipientTag: string;
  /** Зашифрованная полезная нагрузка E2EE / Double Ratchet */
  encryptedPayload: string;
  /** Время жизни пакета в хопах (Time To Live) */
  ttl: number;
  /** Количество пройденных промежуточных узлов (0 для автора) */
  hopCount: number;
  /** Unix-время создания конверта в миллисекундах */
  timestamp: number;
  /** Запрос подтверждения доставки на уровне радиоканала (Radio-ACK) */
  ack?: boolean;
  /** Идентификатор физического устройства-отправителя для эхо-фильтра */
  senderDeviceId?: string;
  /** Идентификатор автора (аккаунта) для маршрутизации */
  senderNodeId?: string;
  /** URL медиафайла для LAN передачи */
  mediaUrl?: string;
  /** Тип сообщения (text, voice, video, media) */
  type?: string;
}

/** Метрики и статистика работы сетевого транспорта */
export interface TransportStats {
  bytesSent: number;
  bytesReceived: number;
  packetsSent: number;
  packetsReceived: number;
  errorsCount: number;
  sendErrors?: number;
  activePeers?: number;
  crcErrors?: number;
  packetsDropped?: number;
  lastActivity: number;
  signalMetric?: number; // RSSI (dBm) или SNR (dB)
}

export type TransportMetrics = TransportStats;

/** Результат выполнения операции отправки */
export interface TransportResult {
  success: boolean;
  transportId: TransportType;
  transportType?: TransportType;
  error?: string;
  bytesTransferred?: number;
  bytesSent?: number;
  peerId?: string;
  roundTripTimeMs?: number;
}

/** Информация об обнаруженном пире в рамках конкретного транспорта */
export interface DiscoveredPeer {
  /** Уникальный составной ключ пира (например, lan://192.168.1.5:46001 или mesh-didHash) */
  id: string;
  /** Физический хэш идентификатора устройства: SHA-256(deviceId)[0..8) */
  deviceIdHash: string;
  /** Идентификатор аккаунта пользователя (UUID), передаётся только в защищённом handshake */
  nodeId?: string;
  /** Отображаемое имя или псевдоним пира */
  name?: string;
  /** Тип транспорта, через который обнаружен пир */
  transportType: TransportType;
  /** Сетевой адрес пира (например, lan://192.168.1.5:46001 или ble://AA:BB:CC:DD:EE:FF) */
  address: string;
  /** Хост (IP-адрес или домен) для сетевых транспортов */
  host?: string;
  /** Порт подключения для LAN/TCP/WS транспортов */
  port?: number;
  /** Уровень сигнала RSSI в dBm */
  rssi?: number;
  /** Отношение сигнал/шум SNR в dB (для LoRa) */
  snr?: number;
  /** Флаг доступности пира в роли ретранслятора (моста) */
  isRelay?: boolean;
  /** Офлайн-набор открытых ключей E2EE для X3DH инициализации сессии */
  prekeyBundle?: PrekeyBundle;
  /** Время последней активности (Unix ms) для алгоритма decay/старения */
  lastSeen: number;
}

export type TransportPeer = DiscoveredPeer;

/** Статус состояния транспорта */
export interface TransportStatus {
  isRunning: boolean;
  isAvailable: boolean;
  error?: string;
  boundPort?: number;
  activeConnectionsCount?: number;
  peersCount?: number;
}

/** Сводное состояние мультитранспортной сети */
export interface CompositeTransportState {
  isMeshActive: boolean;
  activeTransports: TransportType[];
  totalPeersCount: number;
  peersByTransport: Record<string, number>;
  metrics: Record<string, TransportStats>;
}

/** Унифицированный контракт сетевого транспорта */
export interface MeshTransport {
  /** Идентификатор типа транспорта */
  readonly id: TransportType;
  /** Максимальный размер передаваемого блока полезных данных (MTU в байтах) */
  readonly mtu: number;
  /**
   * Приоритет транспорта по лестнице HTMA (большее число = выше приоритет).
   * LAN: 100 (или 2), BLE: 50 (или 1), LoRa: 10 (или 0).
   */
  readonly priority: number;

  /** Запуск транспорта, открытие сокетов и начало прослушивания */
  start(): Promise<void>;
  /** Остановка транспорта, освобождение портов и закрытие соединений */
  stop(): Promise<void>;

  /** Запуск обнаружения соседей и подписка на события появления пиров */
  discover(onPeer: (peer: DiscoveredPeer) => void): void;

  /** Адресная отправка конверта конкретному пиру */
  send(envelope: MeshEnvelope, targetPeer?: DiscoveredPeer): Promise<TransportResult>;

  /** Широковещательная рассылка конверта всем доступным соседям */
  broadcast(envelope: MeshEnvelope): Promise<TransportResult>;

  /** Подписка на входящие сетевые конверты */
  onReceive(handler: (envelope: MeshEnvelope, senderInfo?: DiscoveredPeer) => void): void;

  /** Получение текущего состояния транспорта */
  getStatus(): TransportStatus;

  /** Получение списка активных обнаруженных пиров */
  getPeers(): DiscoveredPeer[];

  /** Получение статистики и метрик */
  stats(): TransportStats;
  getMetrics?(): TransportMetrics;

  /** События жизненного цикла пиров */
  onPeerDiscovered?(handler: (peer: DiscoveredPeer) => void): void;
  onPeerLost?(handler: (peerId: string) => void): void;
}

/** Настройки и Feature Flags мультитранспортной сети */
export interface TransportSettings {
  /** Включение LAN/Wi-Fi транспорта (WebSocket-сервер + mDNS discovery) */
  transport_lan_enabled: boolean;
  /** Разрешение прямой передачи медиафайлов (фото/файлы) по LAN */
  transport_lan_media: boolean;
  /** Включение LoRa / RNode драйвера экстремального радиоканала */
  transport_lora_enabled: boolean;
  /** Включение функционала комьюнити-моста (ретрансляция в облако) */
  transport_bridge_enabled: boolean;
  /** Политика энергосбережения моста: 'always' | 'charging_only' | 'unmetered_charging' */
  transport_bridge_battery_policy: 'always' | 'charging_only' | 'unmetered_charging';
  /** Степень резервирования (fan-out redundancy): 1 — одиночный, 2 — дублирование */
  fanout_redundancy: number;
}

/** Значения по умолчанию для настроек транспортов (Default OFF) */
export const DEFAULT_TRANSPORT_SETTINGS: TransportSettings = {
  transport_lan_enabled: false,
  transport_lan_media: false,
  transport_lora_enabled: false,
  transport_bridge_enabled: false,
  transport_bridge_battery_policy: 'charging_only',
  fanout_redundancy: 1,
};

let inMemorySettings: TransportSettings = { ...DEFAULT_TRANSPORT_SETTINGS };

/** Чтение настроек транспортов из локального хранилища */
export function getTransportSettings(): TransportSettings {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('gossip_transport_settings');
      if (raw) {
        inMemorySettings = { ...DEFAULT_TRANSPORT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {}
  }
  return { ...inMemorySettings };
}

/** Сохранение параметра настройки транспорта */
export function setTransportSetting<K extends keyof TransportSettings>(key: K, value: TransportSettings[K]): void {
  inMemorySettings[key] = value;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('gossip_transport_settings', JSON.stringify(inMemorySettings));
    } catch (e) {
      console.warn('[TransportSettings] Ошибка сохранения настройки:', e);
    }
  }
}

// ---------------------------------------------------------------------------
// Утилиты Dual Identity (Стандарт разделения идентичностей)
// ---------------------------------------------------------------------------

/**
 * Вычисляет криптографический SHA-256 хэш идентификатора устройства
 * и возвращает первые 8 hex-символов (32 бита энтропии).
 *
 * @param deviceId Идентификатор физического устройства
 * @returns 8 hex-символов, например "a1b2c3d4"
 */
export async function deriveDeviceIdHash(deviceId: string): Promise<string> {
  if (!deviceId || typeof deviceId !== 'string') {
    return '00000000';
  }

  // 1. Попытка использования WebCrypto API
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    try {
      const data = new TextEncoder().encode(deviceId);
      const digest = await crypto.subtle.digest('SHA-256', data);
      const hex = Array.from(new Uint8Array(digest))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return hex.slice(0, 8);
    } catch {
      // fallback ниже
    }
  }

  // 2. Попытка использования Node.js crypto
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require('crypto');
    if (nodeCrypto && typeof nodeCrypto.createHash === 'function') {
      const hash = nodeCrypto.createHash('sha256').update(deviceId).digest('hex');
      return hash.slice(0, 8);
    }
  } catch {
    // fallback
  }

  // 3. Детерминированный fallback (FNV-1a 32-bit)
  return deriveFallbackHash32(deviceId);
}

/**
 * Синхронное получение хэша идентификатора устройства (для быстрых проверок)
 */
export function deriveDeviceIdHashSync(deviceId: string): string {
  if (!deviceId || typeof deviceId !== 'string') {
    return '00000000';
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require('crypto');
    if (nodeCrypto && typeof nodeCrypto.createHash === 'function') {
      const hash = nodeCrypto.createHash('sha256').update(deviceId).digest('hex');
      return hash.slice(0, 8);
    }
  } catch {
    // fallback
  }
  return deriveFallbackHash32(deviceId);
}

function deriveFallbackHash32(str: string): string {
  let h1 = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h1 ^= str.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0').slice(0, 8);
}

/**
 * Формирует сетевой псевдоним сервиса для mDNS / BLE discovery.
 * Имя сервиса строго соответствует шаблону: gossip-<SHA-256(deviceId)[0..8)>
 */
export function getPeerAlias(deviceIdHash: string): string {
  return `gossip-${deviceIdHash.slice(0, 8)}`;
}

/**
 * Проверяет, является ли полученный конверт эхом собственного передатчика.
 * Инвариант Echo-Filter: пакеты с envelope.senderDeviceId === localDeviceId отбрасываются.
 */
export function isEchoEnvelope(envelope: MeshEnvelope, localDeviceId: string): boolean {
  if (!envelope || !localDeviceId) return false;
  return Boolean(envelope.senderDeviceId && envelope.senderDeviceId === localDeviceId);
}

// ---------------------------------------------------------------------------
// SeenPacketCache: Кольцевой буфер дедупликации пакетов на 4096 записей
// ---------------------------------------------------------------------------

export class SeenPacketCache {
  private readonly maxSize: number;
  private readonly idSet: Set<string>;
  private readonly ringBuffer: (string | null)[];
  private pointer: number = 0;

  constructor(maxSize = 4096) {
    this.maxSize = maxSize;
    this.idSet = new Set<string>();
    this.ringBuffer = new Array(maxSize).fill(null);
    this.loadFromStorage();
  }

  public has(packetId: string): boolean {
    if (!packetId) return false;
    return this.idSet.has(packetId);
  }

  public add(packetId: string, persist = true): boolean {
    if (!packetId) return false;
    if (this.idSet.has(packetId)) {
      return false;
    }

    const oldId = this.ringBuffer[this.pointer];
    if (oldId !== null) {
      this.idSet.delete(oldId);
    }

    this.ringBuffer[this.pointer] = packetId;
    this.idSet.add(packetId);
    this.pointer = (this.pointer + 1) % this.maxSize;

    if (persist) {
      this.scheduleSave();
    }
    return true;
  }

  public size(): number {
    return this.idSet.size;
  }

  public clear(): void {
    this.idSet.clear();
    this.ringBuffer.fill(null);
    this.pointer = 0;
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('gossip_mesh_seen_ids');
      } catch {}
    }
  }

  private saveTimeout: any = null;
  private scheduleSave(): void {
    if (typeof window === 'undefined' && typeof localStorage === 'undefined') return;
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      try {
        const ids = Array.from(this.idSet);
        localStorage.setItem('gossip_mesh_seen_ids', JSON.stringify(ids.slice(-1000)));
      } catch {}
    }, 1000);
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined' && typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem('gossip_mesh_seen_ids');
      if (saved) {
        const ids: string[] = JSON.parse(saved);
        if (Array.isArray(ids)) {
          for (const id of ids.slice(-this.maxSize)) {
            if (typeof id === 'string' && id) {
              this.add(id, false);
            }
          }
        }
      }
    } catch {}
  }
}