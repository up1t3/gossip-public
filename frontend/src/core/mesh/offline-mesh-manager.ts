// frontend/src/core/mesh/offline-mesh-manager.ts

import { registerPlugin, Capacitor } from '@capacitor/core';
import {
  getLocalPrekeyBundle,
  saveOfflinePrekeyBundle,
  getOfflinePrekeyBundle,
  PrekeyBundle,
} from '../crypto/e2ee';

export interface MeshPeer {
  id: string;
  nodeId?: string;
  address?: string;
  name: string;
  deviceType: 'ios' | 'android' | 'desktop' | 'embedded';
  rssi: number; // dBm (-30 dBm = very close, -90 dBm = edge of range)
  distanceMeters: number;
  isRelay: boolean;
  angleDeg: number; // for circular radar display (0..360)
  lastSeen: number;
  prekeyBundle?: PrekeyBundle;
}

export interface MeshEnvelope {
  id: string;
  recipientTag: string;
  encryptedPayload: string;
  ttl: number;
  hopCount: number;
  timestamp: number;
  /** Запрос Radio-ACK: отправитель хочет получить подтверждение доставки (собственные конверты) */
  ack?: boolean;
}

export interface MeshStateSnapshot {
  isMeshEnabled: boolean;
  isRelayMode: boolean;
  peers: MeshPeer[];
  pendingEnvelopesCount: number;
  totalRelayedCount: number;
  isScanning: boolean;
  isNativeBleSupported: boolean;
  isBluetoothEnabled?: boolean;
  hasPermissions?: boolean;
  locationServicesEnabled?: boolean;
  lastSyncTime: number;
  localNodeId: string;
  /** Per-device радио-идентичность (Dual Identity Standard): реклама/self-фильтр/ключ пира */
  localDeviceId: string;
  powerProfile: 'high' | 'balanced' | 'low_power';
  /** Диагностика нативного радио-слоя: причина слепоты сканера (Zero-Phantom-Mesh) */
  lastNativeError?: string | null;
  scanFailureStreak?: number;
}

export type MeshListener = (snapshot: MeshStateSnapshot) => void;

interface GossipBlePluginInterface {
  checkMeshPermissions(): Promise<{ granted: boolean; bluetoothEnabled: boolean; locationServicesEnabled?: boolean }>;
  requestMeshPermissions(): Promise<{ granted: boolean; bluetoothEnabled: boolean; locationServicesEnabled?: boolean }>;
  startMesh(options?: { nodeId?: string; deviceId?: string; alias?: string; isRelay?: boolean; prekeyBundle?: string }): Promise<{ success: boolean; isMeshActive: boolean; locationServicesEnabled?: boolean }>;
  stopMesh(): Promise<{ success: boolean; isMeshActive: boolean }>;
  startScanning(): Promise<{ success: boolean; isScanning: boolean }>;
  stopScanning(): Promise<{ success: boolean; isScanning: boolean }>;
  getDiscoveredPeers(): Promise<{ peers: MeshPeer[]; count: number; isScanning: boolean; isAdvertising: boolean; powerProfile?: string }>;
  setRelayMode(options: { isRelay: boolean }): Promise<{ isRelayMode: boolean }>;
  getMeshState(): Promise<{ isMeshActive: boolean; isAdvertising: boolean; isScanning: boolean; isRelayMode: boolean; bluetoothEnabled?: boolean; localNodeId: string; localDeviceId?: string; peersCount: number; powerProfile?: string; locationServicesEnabled?: boolean; scanFailureStreak?: number; scanBackoffMs?: number; lastScanError?: string }>;
  setPowerProfile(options: { profile: 'high' | 'balanced' | 'low_power' }): Promise<{ success: boolean; powerProfile: string }>;
  sendEnvelope(options: { targetAddress: string; envelopeJson: string }): Promise<{ success: boolean; error?: string }>;
  openLocationSettings(): Promise<{ success: boolean }>;
  openBluetoothSettings(): Promise<{ success: boolean }>;
  drainPendingEnvelopes(): Promise<{ envelopes: Array<{ senderAddress: string; envelopeJson: string; receivedAt: number }>; count: number }>;
  addListener(eventName: 'onPeersUpdated', listenerFunc: (data: { peers: MeshPeer[]; count: number }) => void): Promise<any>;
  addListener(eventName: 'onEnvelopeReceived', listenerFunc: (data: { senderAddress: string; envelopeJson: string; receivedAt: number }) => void): Promise<any>;
  addListener(eventName: 'onMeshDiagnostics', listenerFunc: (data: { isScanning: boolean; isAdvertising: boolean; bluetoothEnabled?: boolean; scanFailureStreak: number; scanBackoffMs: number; lastScanError: string }) => void): Promise<any>;
}

const GossipBle = registerPlugin<GossipBlePluginInterface>('GossipBle');

class SeenPacketCache {
  private readonly maxSize: number;
  private readonly idSet: Set<string>;
  private readonly ringBuffer: (string | null)[];
  private pointer: number = 0;

  constructor(maxSize = 4096) {
    this.maxSize = maxSize;
    this.idSet = new Set<string>();
    this.ringBuffer = new Array(maxSize).fill(null);
    this.loadFromStorage();
    this.loadFromSqlite().catch(() => {});
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
    } catch (e) {
      console.warn('[SeenPacketCache] Ошибка загрузки кэша:', e);
    }
  }

  private async loadFromSqlite(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        const { StorageManager } = await import('../storage/storage-manager');
        const storage = StorageManager.getInstance();
        if (storage && storage.getIsInitialized()) {
          const rows = await storage.query<{ packet_id: string }>(
            `SELECT packet_id FROM mesh_processed_packets ORDER BY received_at DESC LIMIT ?;`,
            [this.maxSize]
          );
          if (rows && Array.isArray(rows)) {
            for (const row of rows.reverse()) {
              if (row && row.packet_id) {
                this.add(row.packet_id, false);
              }
            }
          }
        }
      }
    } catch (e) {}
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined' && typeof localStorage === 'undefined') return;
    try {
      const activeIds = this.ringBuffer.filter((id): id is string => id !== null);
      localStorage.setItem('gossip_mesh_seen_ids', JSON.stringify(activeIds));
    } catch (e) {}
  }

  private persistToSqlite(packetId: string): void {
    if (!packetId) return;
    try {
      if (typeof window !== 'undefined') {
        import('../storage/storage-manager').then(({ StorageManager }) => {
          const storage = StorageManager.getInstance();
          if (storage && storage.getIsInitialized()) {
            const driver = (storage as any).driver;
            if (driver) {
              driver.execute(
                `INSERT OR IGNORE INTO mesh_processed_packets (packet_id, received_at) VALUES (?, ?);`,
                [packetId, Date.now()]
              ).catch(() => {});
            }
          }
        }).catch(() => {});
      }
    } catch (e) {}
  }

  public has(packetId: string): boolean {
    return this.idSet.has(packetId);
  }

  public add(packetId: string, save = true): void {
    if (!packetId || this.idSet.has(packetId)) return;
    const oldId = this.ringBuffer[this.pointer];
    if (oldId !== null) {
      this.idSet.delete(oldId);
    }
    this.ringBuffer[this.pointer] = packetId;
    this.idSet.add(packetId);
    this.pointer = (this.pointer + 1) % this.maxSize;
    if (save) {
      this.saveToStorage();
      this.persistToSqlite(packetId);
    }
  }
}

class OfflineMeshManager {
  private static instance: OfflineMeshManager;

  private isMeshEnabled: boolean = true;
  private isRelayMode: boolean = true;
  private isScanning: boolean = false;
  private isNativeBleSupported: boolean = false;
  private isBluetoothEnabled: boolean = true;
  private hasPermissions: boolean = true;
  private locationServicesEnabled: boolean = true;
  private isRadarOpen: boolean = false;
  private currentPowerProfile: 'high' | 'balanced' | 'low_power' = 'balanced';
  private totalRelayedCount: number = 0;
  private lastSyncTime: number = 0;
  private localNodeId: string = 'node-' + Math.random().toString(36).substring(2, 8);
  // Dual Identity Standard: localNodeId — аккаунт (UUID), localDeviceId — установка устройства.
  private localDeviceId: string = '';
  private localAlias: string = 'Gossip Client';
  // Диагностика нативного радио-слоя (см. onMeshDiagnostics)
  private lastNativeError: string | null = null;
  private scanFailureStreak: number = 0;
  // HTMA §13.2: конверты, ушедшие в BLE-эфир, не дублируются POST'ом в облако
  private dispatchedViaMesh: Set<string> = new Set();
  private dispatchedViaMeshAt: Map<string, number> = new Map();

  private listeners: Set<MeshListener> = new Set();
  private scanTimer: any = null;
  private peerDecayTimer: any = null;

  private peers: MeshPeer[] = [];
  private envelopes: MeshEnvelope[] = [];
  private seenCache: SeenPacketCache = new SeenPacketCache(4096);

  // Повторная прокачка собственной очереди в BLE-эфир (гарантированная докачка при позднем обнаружении пиров)
  // 20 с (было 10 с): каждая прокачка = GATT-дозвоны; частый молот исчерпывает клиентские слоты
  // OEM-стеков, после чего отказывает и регистрация сканера (гигиена BLE-стека).
  private static readonly OUTBOX_PUMP_INTERVAL_MS = 20000;
  private static readonly MAX_OUTBOX_BROADCAST_ATTEMPTS = 40;
  /** Сколько конверт ждет Radio-ACK/relay-bridge, прежде чем метка radio-доставки снимается (мс) */
  private static readonly DISPATCHED_RELEASE_AFTER_MS = 90000;
  private static readonly PEER_COOLDOWN_MS = 30000;
  private outboxPumpTimer: any = null;
  private isPumpActive: boolean = false;
  private knownPeerIds: Set<string> = new Set();
  private broadcastAttempts: Map<string, number> = new Map();
  private peerAddressCooldowns: Map<string, number> = new Map();

  private broadcastChannel: BroadcastChannel | null = null;
  private backendUrl: string = '';

  private constructor() {
    this.initFromStorage();
    this.initNodeIdentity();
    this.initBleEngine();
    this.initWebBroadcastFallback();
    this.startPeerDecayMonitor();
    this.startAutoCloudSync();
    this.startOutboxPump();
  }

  public static getInstance(): OfflineMeshManager {
    if (!OfflineMeshManager.instance) {
      OfflineMeshManager.instance = new OfflineMeshManager();
    }
    return OfflineMeshManager.instance;
  }

  public setBackendUrl(url: string): void {
    if (url) {
      this.backendUrl = url;
      if (this.envelopes.length > 0 && typeof navigator !== 'undefined' && navigator.onLine) {
        this.flushQueueToCloud();
      }
    }
  }

  private startAutoCloudSync(): void {
    if (typeof window === 'undefined') return;

    // Реакция на появление интернет-соединения
    window.addEventListener('online', () => {
      console.log('[OfflineMeshManager] Интернет восстановлен: автоматический сброс очереди оффлайн-меша в облако...');
      this.flushQueueToCloud();
    });

    // Фоновый периодический сброс каждые 15 секунд при наличии соединения
    setInterval(() => {
      if (this.envelopes.length > 0 && typeof navigator !== 'undefined' && navigator.onLine) {
        this.flushQueueToCloud();
      }
    }, 15000);
  }

  private initFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const savedMesh = localStorage.getItem('gossip_mesh_enabled');
      if (savedMesh !== null) this.isMeshEnabled = savedMesh === 'true';

      const savedRelay = localStorage.getItem('gossip_mesh_relay');
      if (savedRelay !== null) this.isRelayMode = savedRelay === 'true';

      const savedRelayedCount = localStorage.getItem('gossip_mesh_relayed_count');
      if (savedRelayedCount) this.totalRelayedCount = parseInt(savedRelayedCount, 10) || 0;

      const savedEnvelopes = localStorage.getItem('gossip_mesh_envelopes');
      if (savedEnvelopes) {
        const parsed: MeshEnvelope[] = JSON.parse(savedEnvelopes) || [];
        const now = Date.now();
        const maxAge = 7 * 24 * 3600 * 1000;
        // Очищаем просроченные конверты (> 7 суток)
        this.envelopes = parsed.filter((env) => env && env.id && (now - (env.timestamp || 0) < maxAge));
        for (const env of this.envelopes) {
          if (env && env.id) {
            this.seenCache.add(env.id, false);
          }
        }
      }
    } catch (e) {
      console.warn('[OfflineMeshManager] Ошибка загрузки состояния из localStorage:', e);
    }
  }

  private initNodeIdentity(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      // Приоритет: UUID пользователя (current_user_id) — mesh-идентичность должна совпадать
      // с идентичностью чатов, иначе офлайн-бандлы сохраняются под mesh-ключами, а шифрование
      // ищет их под UUID собеседника (fail-closed «открытый текст заблокирован»).
      const savedId = localStorage.getItem('current_user_id') ||
                      localStorage.getItem('my_user_id') ||
                      localStorage.getItem('gossip_local_mesh_id');
      if (savedId) {
        this.localNodeId = savedId;
      } else {
        this.localNodeId = 'node-' + Math.random().toString(36).substring(2, 8);
        localStorage.setItem('gossip_local_mesh_id', this.localNodeId);
      }

      // Радио-идентичность per-device: НЕ зависит от аккаунта, стабильна между перезапусками.
      // Рекламный хеш аккаунта коллидировал у устройств одного аккаунта — нативный сканер
      // взаимно отбрасывал их как «самих себя» (0 пиров). Аккаунт остаётся в PEER_INFO id.
      let devId = localStorage.getItem('device_id') || localStorage.getItem('gossip_mesh_device_id');
      if (!devId) {
        devId = 'dev-' + ((typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
          ? crypto.randomUUID()
          : (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)));
        localStorage.setItem('gossip_mesh_device_id', devId);
      }
      this.localDeviceId = devId;

      const savedAlias = localStorage.getItem('username') || localStorage.getItem('nickname');
      if (savedAlias) {
        this.localAlias = savedAlias;
      }
    } catch (e) {
      console.warn('[OfflineMeshManager] Ошибка инициализации идентификатора узла:', e);
    }
  }

  /**
   * Обновление mesh-идентичности после логина: localNodeId приводится к UUID пользователя,
   * нативный меш перезапускается с новым ID (реклама и PEER_INFO начинают нести настоящий UUID).
   */
  public async refreshNodeIdentity(): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    const userId = localStorage.getItem('current_user_id') || localStorage.getItem('my_user_id');
    if (!userId || userId === this.localNodeId) return;
    console.log(`[OfflineMeshManager] Обновление mesh-идентичности после логина: ${this.localNodeId} -> ${userId}`);
    this.localNodeId = userId;
    const savedAlias = localStorage.getItem('username') || localStorage.getItem('nickname');
    if (savedAlias) this.localAlias = savedAlias;
    if (this.isMeshEnabled && this.isNativeBleSupported) {
      await this.stopNativeMesh().catch(() => {});
      await this.startNativeMesh().catch(() => {});
    }
    this.notify();
  }

  private async initBleEngine(): Promise<void> {
    const isNative = Capacitor.isNativePlatform();
    this.isNativeBleSupported = isNative;

    if (!isNative) {
      console.log('[OfflineMeshManager] Работа в Web/PWA среде. Активирован веб-модуль эфира (Web BroadcastChannel / LAN).');
      return;
    }

    try {
      console.log('[OfflineMeshManager] Инициализация нативного BLE Mesh плагина GossipBle...');
      
      try {
        const perms = await GossipBle.checkMeshPermissions();
        this.hasPermissions = perms.granted;
        this.isBluetoothEnabled = perms.bluetoothEnabled;
        if (perms.locationServicesEnabled !== undefined) {
          this.locationServicesEnabled = perms.locationServicesEnabled;
        }
      } catch (pErr) {
        console.warn('[OfflineMeshManager] Ошибка проверки разрешений BLE:', pErr);
      }

      // Подписываемся на события обновления найденных устройств по эфиру
      await GossipBle.addListener('onPeersUpdated', (data) => {
        if (data && Array.isArray(data.peers)) {
          this.mergeNativePeers(data.peers);
        }
      });

      // Подписываемся на входящие офлайн-конверты от соседей
      await GossipBle.addListener('onEnvelopeReceived', (data) => {
        this.handleIncomingEnvelopeFromPeer(data.senderAddress, data.envelopeJson);
      });

      // Телеметрия радио-слоя: реальные причины слепоты сканера вместо фантомного «Поиск пиров...»
      await GossipBle.addListener('onMeshDiagnostics', (data) => {
        const prevStreak = this.scanFailureStreak;
        const prevBt = this.isBluetoothEnabled;
        this.scanFailureStreak = data?.scanFailureStreak ?? 0;
        if (typeof data?.bluetoothEnabled === 'boolean') {
          this.isBluetoothEnabled = data.bluetoothEnabled;
        } else if (data?.lastScanError === 'Bluetooth disabled') {
          this.isBluetoothEnabled = false;
        }

        if (!this.isBluetoothEnabled) {
          this.peers = [];
          this.isScanning = false;
          this.lastNativeError = null;
        } else if (this.scanFailureStreak > 0) {
          this.lastNativeError = `BLE-скан недоступен (${data?.lastScanError || 'сбой стека'}), авто-восстановление через ${Math.ceil((data?.scanBackoffMs || 0) / 1000)} с`;
        } else {
          this.lastNativeError = null;
        }

        if (!prevBt && this.isBluetoothEnabled && this.isMeshEnabled) {
          console.log('[OfflineMeshManager] Bluetooth включен пользователем: автоматический запуск BLE-радара и синхронизации...');
          setTimeout(() => {
            void this.scanPeers();
          }, 400);
        }

        if (prevStreak !== this.scanFailureStreak || prevBt !== this.isBluetoothEnabled) {
          this.notify();
        }
      });

      // Если Mesh включен в настройках — запускаем радиопередатчик и сканирование
      if (this.isMeshEnabled) {
        await this.startNativeMesh();
      }

      // Адаптивное управление энергопотреблением в зависимости от видимости приложения
      try {
        const { App } = await import('@capacitor/app');
        App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            console.log('[OfflineMeshManager] Приложение вышло на передний план: профиль', this.isRadarOpen ? 'high' : 'balanced');
            this.setPowerProfile(this.isRadarOpen ? 'high' : 'balanced');
          } else {
            console.log('[OfflineMeshManager] Приложение свернуто: переключение BLE в экономичный режим (low_power)');
            this.setPowerProfile('low_power');
          }
        });
      } catch (e) {
        console.warn('[OfflineMeshManager] Модуль @capacitor/app недоступен для трекинга состояния:', e);
      }
    } catch (err) {
      console.error('[OfflineMeshManager] Ошибка привязки к GossipBle плагину:', err);
    }
  }

  private initWebBroadcastFallback(): void {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;

    try {
      this.broadcastChannel = new BroadcastChannel('gossip_mesh_local_radio');
      this.broadcastChannel.onmessage = (event) => {
        const msg = event.data;
        if (!msg || !msg.type) return;

        if (msg.type === 'PEER_PING' && msg.nodeId !== this.localNodeId) {
          this.handleWebPeerPing(msg);
        } else if (msg.type === 'ENVELOPE_RELAY' && msg.envelope) {
          this.handleIncomingEnvelopeDirect(msg.envelope);
        }
      };

      // Периодический пинг локального эфира для веб-клиентов во вкладках/окнах
      if (this.isMeshEnabled) {
        this.sendWebPeerPing();
      }
    } catch (e) {
      console.warn('[OfflineMeshManager] Ошибка инициализации BroadcastChannel:', e);
    }
  }

  private async sendWebPeerPing(): Promise<void> {
    if (!this.broadcastChannel || !this.isMeshEnabled) return;
    try {
      const prekeyBundle = await getLocalPrekeyBundle().catch(() => null);
      this.broadcastChannel.postMessage({
        type: 'PEER_PING',
        nodeId: this.localNodeId,
        alias: this.localAlias,
        isRelay: this.isRelayMode,
        prekeyBundle,
        timestamp: Date.now(),
      });
    } catch (e) {
      console.warn('[OfflineMeshManager] Ошибка отправки веб-пинга:', e);
    }
  }

  private handleWebPeerPing(msg: any): void {
    const peerId = `web-${msg.nodeId}`;
    const angleDeg = Math.abs(this.hashString(peerId)) % 360;

    // Автоматическое сохранение полученного оффлайн Prekey Bundle (MSH-1: source = 'ble')
    if (msg.prekeyBundle) {
      saveOfflinePrekeyBundle(peerId, msg.prekeyBundle, 'ble').catch((err) => {
        console.warn(`[OfflineMeshManager] Ошибка сохранения оффлайн-бандла для ${peerId}:`, err);
      });
      if (msg.nodeId) {
        saveOfflinePrekeyBundle(msg.nodeId, msg.prekeyBundle, 'ble').catch(() => {});
      }
    }

    const existingIdx = this.peers.findIndex((p) => p.id === peerId);
    const peerObj: MeshPeer = {
      id: peerId,
      name: `${msg.alias || 'Gossip Web Node'} (Локальный)`,
      deviceType: 'desktop',
      rssi: -45,
      distanceMeters: 0.8,
      isRelay: !!msg.isRelay,
      angleDeg,
      lastSeen: Date.now(),
      prekeyBundle: msg.prekeyBundle,
    };

    if (existingIdx >= 0) {
      this.peers[existingIdx] = peerObj;
    } else {
      this.peers.push(peerObj);
    }
    this.notify();
  }

  private mergeNativePeers(nativePeers: MeshPeer[]): void {
    const now = Date.now();
    const updatedMap = new Map<string, MeshPeer>();

    // Сохраняем актуальные нативные пиры
    let hasNewPeer = false;
    for (const np of nativePeers) {
      const angle = np.angleDeg !== undefined ? np.angleDeg : Math.abs(this.hashString(np.id || np.address || '')) % 360;
      if (!this.knownPeerIds.has(np.id)) {
        this.knownPeerIds.add(np.id);
        hasNewPeer = true;
      }

      // Автоматическое сохранение Prekey Bundle пира, полученного через BLE GATT (MSH-1: source = 'ble').
      // Ключевой вариант — настоящий nodeId (UUID пользователя): чаты адресуются по UUID,
      // и encryptMessage ищет бандл именно под ним.
      if (np.prekeyBundle) {
        if ((np as any).nodeId) {
          saveOfflinePrekeyBundle((np as any).nodeId, np.prekeyBundle, 'ble').catch(() => {});
        }
        saveOfflinePrekeyBundle(np.id, np.prekeyBundle, 'ble').catch((err) => {
          console.warn(`[OfflineMeshManager] Ошибка сохранения оффлайн-бандла для нативного пира ${np.id}:`, err);
        });
        if (np.address) {
          saveOfflinePrekeyBundle(np.address, np.prekeyBundle, 'ble').catch(() => {});
          const cleanAddr = `peer-${np.address.replace(/:/g, '').toLowerCase()}`;
          saveOfflinePrekeyBundle(cleanAddr, np.prekeyBundle, 'ble').catch(() => {});
        }
        if (np.name && !np.name.startsWith('Gossip Node')) {
          saveOfflinePrekeyBundle(np.name, np.prekeyBundle, 'ble').catch(() => {});
        }
      }

      updatedMap.set(np.id, {
        ...np,
        angleDeg: angle,
        lastSeen: now,
      });
    }

    // Сохраняем существующие веб-пиры, если они еще не устарели (40 секунд)
    for (const ep of this.peers) {
      if (ep.id.startsWith('web-') && now - ep.lastSeen < 40000) {
        updatedMap.set(ep.id, ep);
      }
    }

    this.peers = Array.from(updatedMap.values());
    this.notify();

    // Свежеобнаруженный пир мог появиться уже после отправки сообщения — прокачиваем очередь в его сторону
    if (hasNewPeer && this.envelopes.length > 0) {
      setTimeout(() => {
        void this.pumpOutboxToPeers();
      }, 1000);
    }
  }

  private handleIncomingEnvelopeFromPeer(senderAddress: string, envelopeJson: string): void {
    try {
      const envelope: MeshEnvelope = JSON.parse(envelopeJson);
      if (envelope && envelope.id) {
        this.handleIncomingEnvelopeDirect(envelope, senderAddress);
      }
    } catch (e) {
      console.error('[OfflineMeshManager] Ошибка парсинга входящего пакета от ' + senderAddress, e);
    }
  }

  private handleIncomingEnvelopeDirect(envelope: MeshEnvelope, incomingFromAddress?: string): void {
    if (!envelope || !envelope.id) return;

    if (this.seenCache.has(envelope.id)) {
      return;
    }
    this.seenCache.add(envelope.id);

    // Radio-ACK: служебное подтверждение доставки — снимает конверт с очереди отправителя,
    // прекращая периодическую прокачку уже доставленного сообщения, и уведомляет UI/SQLite о доставке по радио
    let ackFor: string | null = null;
    try {
      const probe = JSON.parse(envelope.encryptedPayload);
      if (probe && probe.type === 'mesh_ack' && probe.ackFor) {
        ackFor = String(probe.ackFor);
      }
    } catch (e) {}
    if (ackFor) {
      console.log(`[OfflineMeshManager] Radio-ACK: конверт ${ackFor} доставлен, снимаем с очереди`);
      let ackedMessageId = ackFor.replace(/^env_/, '');
      let ackedChatId = envelope.recipientTag || '';
      const matchedEnv = this.envelopes.find((e) => e && (e.id === ackFor || (typeof e.encryptedPayload === 'string' && e.encryptedPayload.includes(ackFor!))));
      if (matchedEnv) {
        if (!ackedChatId && matchedEnv.recipientTag) {
          ackedChatId = matchedEnv.recipientTag;
        }
        try {
          const parsedInner = JSON.parse(matchedEnv.encryptedPayload);
          if (parsedInner && (parsedInner.id || parsedInner.client_msg_id || parsedInner.messageId)) {
            ackedMessageId = String(parsedInner.id || parsedInner.client_msg_id || parsedInner.messageId);
          }
          if (parsedInner && parsedInner.chatId) {
            ackedChatId = String(parsedInner.chatId);
          }
        } catch {}
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('gossip_mesh_delivery_ack', {
            detail: {
              envelopeId: ackFor,
              messageId: ackedMessageId,
              chatId: ackedChatId,
            },
          })
        );
      }
      void this.removeEnvelope(ackFor);
      this.notify();
      return;
    }

    console.log('[OfflineMeshManager] Получен Mesh конверт ' + envelope.id + ', TTL=' + envelope.ttl + ', Hops=' + (envelope.hopCount || 0));

    // Подтверждаем доставку отправившему узлу (только для нативных входящих и только
    // для конвертов с запросом ack — собственные конверты отправителей; отложенный набор
    // не конкурирует с разбором входящей линии)
    if (incomingFromAddress && (envelope as any).ack) {
      setTimeout(() => {
        void this.sendDeliveryAck(envelope.id, incomingFromAddress);
      }, 400);
    }

    // Доставка в глобальную шину событий приложения
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('gossip_mesh_envelope_received', {
          detail: envelope,
        })
      );
    }

    // Если мы в режиме ретранслятора и пакет еще имеет запас TTL — ретранслируем соседям
    if (this.isRelayMode && envelope.ttl > 1) {
      const relayedEnvelope: MeshEnvelope = {
        ...envelope,
        ttl: envelope.ttl - 1,
        hopCount: (envelope.hopCount || 0) + 1,
      };

      const exists = this.envelopes.some((e) => e.id === relayedEnvelope.id);
      if (!exists) {
        this.envelopes.push(relayedEnvelope);
        this.pruneEnvelopesFifo();
        this.saveEnvelopes();
      }

      this.totalRelayedCount += 1;
      localStorage.setItem('gossip_mesh_relayed_count', String(this.totalRelayedCount));
      this.notify();

      // Рандомизированный Jitter Backoff (150–450 мс) для предотвращения RF-коллизий
      const jitterMs = 150 + Math.floor(Math.random() * 300);
      setTimeout(() => {
        this.broadcastEnvelopeToNearbyPeers(relayedEnvelope, incomingFromAddress);
      }, jitterMs);
    }

    // Если устройство выступает интернет-мостом (Gateway Bridge) — автоматически сбрасываем пакет в облако
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      setTimeout(() => this.flushQueueToCloud(), 300);
    }
  }

  /**
   * Radio-ACK доставки: миниатюрный служебный конверт типа mesh_ack адресом отправителя.
   * Получатель подтверждает каждый новый конверт; ACK не ретранслируется (TTL=1) и не порождает
   * ответных ACK. Отправитель по ackFor атомарно удаляет конверт из очереди (removeEnvelope),
   * останавливая периодическую прокачку уже доставленного сообщения.
   */
  private async sendDeliveryAck(envelopeId: string, senderAddress: string): Promise<void> {
    if (!this.isNativeBleSupported || !senderAddress || !envelopeId) return;
    const ackEnvelope: MeshEnvelope = {
      id: 'ack_' + envelopeId,
      recipientTag: '',
      encryptedPayload: JSON.stringify({ type: 'mesh_ack', ackFor: envelopeId }),
      ttl: 1,
      hopCount: 0,
      timestamp: Date.now(),
    };
    try {
      const res = await GossipBle.sendEnvelope({
        targetAddress: senderAddress,
        envelopeJson: JSON.stringify(ackEnvelope),
      });
      if (res && res.success !== false) {
        console.log(`[OfflineMeshManager] Radio-ACK для ${envelopeId} отправлен узлу ${senderAddress}`);
      }
    } catch (e) {
      // Молча: повторная прокачка очереди доставит конверт снова, ACK уйдет вместе с ним
    }
  }

  private startPeerDecayMonitor(): void {
    if (this.peerDecayTimer) clearInterval(this.peerDecayTimer);
    this.peerDecayTimer = setInterval(() => {
      const now = Date.now();
      const initialLen = this.peers.length;
      // Удаляем пиры, которых не было видно более 40 секунд
      this.peers = this.peers.filter((p) => now - p.lastSeen < 40000);
      if (this.peers.length !== initialLen) {
        this.notify();
      }
    }, 5000);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  /**
   * Сравнение рангов узлов для детерминированного Tie-Breaking арбитража ролей Central/Server (M2 / RFC-2026-004 § 4.2).
   * Старший узел (Senior) инициирует connectGatt как Central.
   * Младший узел (Junior) ожидает входящего соединения как GATT Server с периодом уступки (Grace Period 1500 мс).
   */
  public isSeniorNode(remoteIdOrAddress: string): boolean {
    if (!remoteIdOrAddress) return true;
    const localId = this.localNodeId || '';
    const remoteId = remoteIdOrAddress || '';

    const cleanLocal = localId.replace(/^(mesh-|node-)/, '');
    const cleanRemote = remoteId.replace(/^(mesh-|node-)/, '');

    const localHash = Math.abs(this.hashString(cleanLocal || localId));
    const remoteHash = Math.abs(this.hashString(cleanRemote || remoteId));

    if (localHash !== remoteHash) {
      return localHash > remoteHash;
    }
    return (cleanLocal || localId).localeCompare(cleanRemote || remoteId) > 0;
  }

  private saveEnvelopes(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('gossip_mesh_envelopes', JSON.stringify(this.envelopes));
    } catch (e) {
      console.error('[OfflineMeshManager] Ошибка сохранения очереди пакетов:', e);
    }
  }

  private async startNativeMesh(): Promise<void> {
    if (!this.isNativeBleSupported) return;
    try {
      const perms = await GossipBle.checkMeshPermissions();
      this.hasPermissions = perms.granted;
      this.isBluetoothEnabled = perms.bluetoothEnabled;
      if (!perms.granted) {
        const reqRes = await GossipBle.requestMeshPermissions();
        this.hasPermissions = reqRes.granted;
        this.isBluetoothEnabled = reqRes.bluetoothEnabled;
      }
      if (perms.locationServicesEnabled !== undefined) {
        this.locationServicesEnabled = perms.locationServicesEnabled;
      }
      const localBundle = await getLocalPrekeyBundle().catch(() => null);
      await GossipBle.startMesh({
        nodeId: this.localNodeId,
        deviceId: this.localDeviceId || undefined,
        alias: this.localAlias,
        isRelay: this.isRelayMode,
        prekeyBundle: localBundle ? JSON.stringify(localBundle) : undefined,
      }).then((startRes) => {
        if (startRes && startRes.locationServicesEnabled !== undefined) {
          this.locationServicesEnabled = startRes.locationServicesEnabled;
        }
        if (startRes && startRes.locationServicesEnabled === false) {
          console.warn('[OfflineMeshManager] Системная геолокация выключена: на Android 9–11 это блокирует выдачу результатов BLE-сканирования (типично для Huawei/EMUI).');
        }
        return startRes;
      });
      this.isBluetoothEnabled = true;
      this.lastNativeError = null;
      this.notify();
      console.log('[OfflineMeshManager] Нативный BLE Mesh успешно запущен');

      // Разгрузка нативного буфера конвертов, накопленных пока JS-слой был мёртв
      // (убийство WebView при живом процессе, F-1г). Дедуп SeenPacketCache делает
      // повторную обработку уже доставленных конвертов идемпотентной.
      try {
        const drained = await GossipBle.drainPendingEnvelopes();
        if (drained && Array.isArray(drained.envelopes) && drained.envelopes.length > 0) {
          console.log(`[OfflineMeshManager] Разгружено ${drained.envelopes.length} конвертов из нативного буфера недоставленных`);
          for (const entry of drained.envelopes) {
            this.handleIncomingEnvelopeFromPeer(entry.senderAddress, entry.envelopeJson);
          }
        }
      } catch (e) {
        console.warn('[OfflineMeshManager] Ошибка разгрузки нативного буфера недоставленных конвертов:', e);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      if (errMsg.toLowerCase().includes('bluetooth выключен') || errMsg.toLowerCase().includes('bluetooth disabled')) {
        this.isBluetoothEnabled = false;
        this.lastNativeError = null;
      } else {
        this.lastNativeError = errMsg;
      }
      console.warn('[OfflineMeshManager] Ошибка старта нативного BLE Mesh:', e);
      this.notify();
    }
  }

  private async stopNativeMesh(): Promise<void> {
    if (!this.isNativeBleSupported) return;
    try {
      await GossipBle.stopMesh();
      console.log('[OfflineMeshManager] Нативный BLE Mesh остановлен');
    } catch (e) {
      console.warn('[OfflineMeshManager] Ошибка остановки нативного BLE Mesh:', e);
    }
  }

  public async setPowerProfile(profile: 'high' | 'balanced' | 'low_power'): Promise<void> {
    this.currentPowerProfile = profile;
    if (this.isNativeBleSupported) {
      try {
        await GossipBle.setPowerProfile({ profile });
      } catch (e) {
        console.warn('[OfflineMeshManager] Ошибка установки профиля энергопотребления:', e);
      }
    }
  }

  public setRadarActive(active: boolean): void {
    this.isRadarOpen = active;
    if (this.isNativeBleSupported && this.isMeshEnabled) {
      this.setPowerProfile(active ? 'high' : 'balanced');
      if (active) {
        this.scanPeers();
      }
    }
  }

  public subscribe(listener: MeshListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (e) {
        console.error('[OfflineMeshManager] Ошибка слушателя:', e);
      }
    });
  }

  public getPeer(peerId: string): MeshPeer | undefined {
    if (!peerId) return undefined;
    const cleanId = peerId.trim().toLowerCase();
    return this.peers.find((p) => {
      const pId = String(p.id || '').trim().toLowerCase();
      const pNodeId = String((p as any).nodeId || '').trim().toLowerCase();
      const pAddr = String(p.address || '').trim().toLowerCase();
      const pCleanAddr = `peer-${pAddr.replace(/:/g, '')}`;
      return pId === cleanId || pNodeId === cleanId || pAddr === cleanId || pCleanAddr === cleanId || (p.name && p.name.toLowerCase() === cleanId);
    });
  }

  public getSnapshot(): MeshStateSnapshot {
    return {
      isMeshEnabled: this.isMeshEnabled,
      isRelayMode: this.isRelayMode,
      peers: [...this.peers],
      pendingEnvelopesCount: this.envelopes.length,
      totalRelayedCount: this.totalRelayedCount,
      isScanning: this.isScanning,
      isNativeBleSupported: this.isNativeBleSupported,
      isBluetoothEnabled: this.isBluetoothEnabled,
      hasPermissions: this.hasPermissions,
      locationServicesEnabled: this.locationServicesEnabled,
      lastSyncTime: this.lastSyncTime,
      localNodeId: this.localNodeId,
      localDeviceId: this.localDeviceId,
      powerProfile: this.currentPowerProfile,
      lastNativeError: this.lastNativeError,
      scanFailureStreak: this.scanFailureStreak,
    };
  }

  public async toggleMesh(enabled: boolean): Promise<void> {
    this.isMeshEnabled = enabled;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('gossip_mesh_enabled', String(enabled));
    }

    if (enabled) {
      if (this.isNativeBleSupported) {
        await this.startNativeMesh();
      } else {
        this.sendWebPeerPing();
      }
      this.scanPeers();
    } else {
      this.isScanning = false;
      if (this.scanTimer) clearTimeout(this.scanTimer);
      if (this.isNativeBleSupported) {
        await this.stopNativeMesh();
      }
      this.peers = [];
    }
    this.notify();
  }

  public async toggleRelay(enabled: boolean): Promise<void> {
    this.isRelayMode = enabled;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('gossip_mesh_relay', String(enabled));
    }
    if (this.isNativeBleSupported) {
      try {
        await GossipBle.setRelayMode({ isRelay: enabled });
      } catch (e) {
        console.warn('[OfflineMeshManager] Ошибка установки режима Relay:', e);
      }
    }
    this.notify();
  }

  public async scanPeers(): Promise<void> {
    if (!this.isMeshEnabled) return;

    this.isScanning = true;
    this.notify();

    if (this.isNativeBleSupported) {
      try {
        const perms = await GossipBle.checkMeshPermissions();
        this.hasPermissions = perms.granted;
        this.isBluetoothEnabled = perms.bluetoothEnabled;
        if (perms.locationServicesEnabled !== undefined) {
          this.locationServicesEnabled = perms.locationServicesEnabled;
        }
        await GossipBle.startScanning();
      } catch (e) {
        console.warn('[OfflineMeshManager] Ошибка запуска нативного сканирования:', e);
      }
    } else {
      this.sendWebPeerPing();
    }

    if (this.scanTimer) clearTimeout(this.scanTimer);
    this.scanTimer = setTimeout(async () => {
      if (this.isNativeBleSupported) {
        try {
          const res = await GossipBle.getDiscoveredPeers();
          if (res && res.peers) {
            this.mergeNativePeers(res.peers);
          }
        } catch (e) {
          console.warn('[OfflineMeshManager] Ошибка получения пиров:', e);
        }
      }
      this.isScanning = false;
      this.notify();
    }, 3000);
  }

  /**
   * FIFO-ротация очереди конвертов (§13.5, лимит 1000): защищает память и
   * localStorage от неограниченного роста на relay-узлах и при потере ACK.
   */
  private pruneEnvelopesFifo(): void {
    while (this.envelopes.length > 1000) {
      this.envelopes.shift();
    }
  }

  public enqueueEnvelope(recipientTag: string, encryptedPayload: string): string {
    const envelope: MeshEnvelope = {
      id: 'env_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
      recipientTag,
      encryptedPayload,
      ttl: 7,
      hopCount: 0,
      timestamp: Date.now(),
      ack: true,
    };

    this.seenCache.add(envelope.id);
    this.envelopes.push(envelope);
    this.pruneEnvelopesFifo();
    this.saveEnvelopes();

    // Сохранение в локальную SQLite таблицу mesh_envelopes (F9 / v13)
    try {
      import('../storage/storage-manager').then(({ StorageManager }) => {
        const storage = StorageManager.getInstance();
        if (storage && storage.getIsInitialized()) {
          const driver = (storage as any).driver;
          if (driver) {
            driver.execute(
              `INSERT OR REPLACE INTO mesh_envelopes (envelope_id, chat_id, sender_id, recipient_id, cipher_payload, ttl, created_at, dispatched_via_mesh) VALUES (?, ?, ?, ?, ?, ?, ?, 0);`,
              [envelope.id, recipientTag, this.localNodeId, recipientTag, encryptedPayload, envelope.ttl, envelope.timestamp]
            ).then(() => {
              // §13.5: FIFO-ротация таблицы (≤1000 новых) + TTL-чистка конвертов старше 7 суток
              const maxAge = Date.now() - 7 * 24 * 3600 * 1000;
              return driver.execute(
                `DELETE FROM mesh_envelopes WHERE created_at < ? OR envelope_id NOT IN (SELECT envelope_id FROM mesh_envelopes ORDER BY created_at DESC LIMIT 1000);`,
                [maxAge]
              );
            }).catch(() => {});
          }
        }
      }).catch(() => {});
    } catch (e) {}

    this.notify();

    // Пытаемся сразу передать всем доступным соседям
    this.broadcastEnvelopeToNearbyPeers(envelope);

    // Если устройство в сети интернет — сразу дублируем пакет на сервер шлюза
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      setTimeout(() => this.flushQueueToCloud(), 300);
    }

    return envelope.id;
  }

  public hasEnvelope(msgId: string): boolean {
    if (!msgId) return false;
    return this.envelopes.some((env) => {
      if (!env) return false;
      if (env.id === msgId || env.id === `env_${msgId}`) return true;
      if (env.encryptedPayload && typeof env.encryptedPayload === 'string' && env.encryptedPayload.includes(msgId)) {
        return true;
      }
      return false;
    });
  }

  /**
   * Атомарное удаление конверта из памяти, localStorage и SQLite (HTMA / RFC-2026-004 § 4.4 / F9)
   * Предотвращает повторную отправку уже доставленного через WebSocket сообщения в /api/v1/mesh/relay.
   */
  public async removeEnvelope(msgId: string): Promise<void> {
    if (!msgId) return;

    this.broadcastAttempts.delete(msgId);
    this.dispatchedViaMesh.delete(msgId);
    this.dispatchedViaMeshAt.delete(msgId);
    const initialLen = this.envelopes.length;
    this.envelopes = this.envelopes.filter((env) => {
      if (!env) return false;
      if (env.id === msgId) return false;
      if (env.encryptedPayload && typeof env.encryptedPayload === 'string') {
        if (env.encryptedPayload.includes(msgId)) return false;
      }
      return true;
    });

    if (this.envelopes.length !== initialLen) {
      this.saveEnvelopes();
      this.notify();
      console.log(`[OfflineMeshManager] Конверт ${msgId} успешно удален из очереди Mesh (осталось: ${this.envelopes.length})`);
    }

    // Атомарно удаляем из SQLite таблицы mesh_envelopes (F9 / RFC-2026-004)
    try {
      const { StorageManager } = await import('../storage/storage-manager');
      const storage = StorageManager.getInstance();
      if (storage && storage.getIsInitialized()) {
        const driver = (storage as any).driver;
        if (driver) {
          await driver.execute(
            `DELETE FROM mesh_envelopes WHERE envelope_id = ? OR cipher_payload LIKE ?;`,
            [msgId, `%${msgId}%`]
          );
        }
      }
    } catch (e) {
      // Игнорируем ошибки при закрытой БД
    }
  }

  /**
   * Удаление всех конвертов для указанного чата
   */
  public async removeEnvelopesByChatId(chatId: string): Promise<void> {
    if (!chatId) return;
    const initialLen = this.envelopes.length;
    this.envelopes = this.envelopes.filter((env) => {
      if (!env) return false;
      if (env.recipientTag === chatId) return false;
      if (env.encryptedPayload && typeof env.encryptedPayload === 'string' && env.encryptedPayload.includes(chatId)) {
        return false;
      }
      return true;
    });
    if (this.envelopes.length !== initialLen) {
      this.saveEnvelopes();
      this.notify();
    }
  }

  /**
   * HTMA / RFC-2026-004 § 4.2 (Mutual Exclusion Delivery): конверт передан в BLE-эфир —
   * фиксируем dispatched_via_mesh=1 в SQLite; flushQueueToCloud не дублирует POST
   * собственных конвертов в облако (транзитные bridge-конверты флаг не блокирует).
   */
  private markDispatchedViaMesh(envelopeId: string): void {
    if (!envelopeId || this.dispatchedViaMesh.has(envelopeId)) return;
    this.dispatchedViaMesh.add(envelopeId);
    this.dispatchedViaMeshAt.set(envelopeId, Date.now());
    try {
      if (typeof window !== 'undefined') {
        import('../storage/storage-manager').then(({ StorageManager }) => {
          const storage = StorageManager.getInstance();
          if (storage && storage.getIsInitialized()) {
            const driver = (storage as any).driver;
            if (driver) {
              driver.execute(
                `UPDATE mesh_envelopes SET dispatched_via_mesh = 1 WHERE envelope_id = ?;`,
                [envelopeId]
              ).catch(() => {});
            }
          }
        }).catch(() => {});
      }
    } catch (e) {}
  }

  private async broadcastEnvelopeToNearbyPeers(envelope: MeshEnvelope, excludeAddress?: string, isConcurrent?: boolean): Promise<void> {
    const payloadStr = JSON.stringify(envelope);

    // Веб-радиовещание
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'ENVELOPE_RELAY',
          envelope,
        });
      } catch (e) {
        console.warn('[OfflineMeshManager] Ошибка веб-вещания пакета:', e);
      }
    }

    // Нативная передача по всем найденным BLE пирам (исключая узел-источник и охлажденные адреса)
    if (this.isNativeBleSupported && this.peers.length > 0) {
      const now = Date.now();
      const targetPeers = this.peers.filter((p) =>
        p.address && p.address !== excludeAddress && (this.peerAddressCooldowns.get(p.address) || 0) < now
      );
      for (const peer of targetPeers) {
        if (peer.address) {
          try {
            // Детерминированный арбитраж ролей Central/Server (M2 / RFC-2026-004 § 4.2):
            // Если локальный узел Junior (младший), он делает паузу уступки (Grace Period 1500 мс + jitter 0..300 мс),
            // позволяя старшему узлу инициировать connectGatt без встречных коллизий GATT 133 и inbound_busy.
            const isSenior = this.isSeniorNode(peer.id || peer.address);
            if (!isSenior) {
              const yieldDelayMs = 1500 + Math.floor(Math.random() * 300);
              await new Promise((resolve) => setTimeout(resolve, yieldDelayMs));
            }

            const res = await GossipBle.sendEnvelope({
              targetAddress: peer.address,
              envelopeJson: payloadStr,
            });
            if (res && res.success === false) {
              if ((res as any).error === 'connect_failed') {
                // Пир не принимает соединения (усыплен/мертвый MAC) — пауза 30 с,
                // чтобы не жечь watchdog-циклы каждые 10 секунд
                this.peerAddressCooldowns.set(peer.address, Date.now() + OfflineMeshManager.PEER_COOLDOWN_MS);
              }
              console.warn(`[OfflineMeshManager] Пир ${peer.address} не принял пакет ${envelope.id} (GATT: ${(res as any).error || 'error'})`);
            } else {
              // HTMA §13.2 (Mutual Exclusion Delivery): конверт ушел в радиоэфир —
              // блокируем дубль POST в облако; доставку в облако возьмут на себя
              // пиры-мосты (relay bridge) либо Radio-ACK снимет конверт с очереди
              this.markDispatchedViaMesh(envelope.id);
              console.log(`[OfflineMeshManager] Пакет ${envelope.id} отправлен пиру ${peer.address} (${peer.name || 'Peer'})`);
            }
          } catch (e) {
            console.warn(`[OfflineMeshManager] Не удалось отправить пакет пиру ${peer.address}:`, e);
          }
        }
      }
    }
  }

  /**
   * Периодическая прокачка собственной очереди конвертов в BLE-эфир.
   * Мгновенная отправка при создании конверта выполняется один раз текущим пирам; если в этот
   * момент соседей ещё нет (сканирование не завершилось, пиры протухли) или GATT-канал
   * не установился, конверт ранее оставался в очереди до появления интернета.
   * Pump повторяет передачу только собственных конвертов (hopCount === 0): дедупликация
   * на приёмниках обеспечивается SeenPacketCache по id конверта, повторного шифрования
   * не выполняется (Single-Encryption Invariant, RFC-2026-004 § 4.1).
   */
  private startOutboxPump(): void {
    if (typeof window === 'undefined') return;
    if (this.outboxPumpTimer) return;
    this.outboxPumpTimer = setInterval(() => {
      // Джиттер 0–2.5 с: у всех узлов таймеры запускаются почти синхронно со старта приложения,
      // и синхронные встречные GATT-подключения друг к другу зависают на стеках Android.
      const jitterMs = Math.floor(Math.random() * 2500);
      setTimeout(() => {
        void this.pumpOutboxToPeers();
      }, jitterMs);
    }, OfflineMeshManager.OUTBOX_PUMP_INTERVAL_MS);
  }

  private async pumpOutboxToPeers(): Promise<void> {
    if (this.isPumpActive) return;
    if (!this.isMeshEnabled || this.envelopes.length === 0) return;
    const reachablePeers = this.peers.filter((p) => p.address);
    if (reachablePeers.length === 0) return;

    this.isPumpActive = true;
    try {
      this.releaseStaleDispatchedMarkers();
      for (const env of this.envelopes) {
        // Транзитные конверты (hopCount > 0) ретранслируются только в момент приёма —
        // их периодический повтор создал бы RF-шторм в меш-сети.
        if (!env || (env.hopCount || 0) !== 0) continue;
        const attempts = this.broadcastAttempts.get(env.id) || 0;
        if (attempts >= OfflineMeshManager.MAX_OUTBOX_BROADCAST_ATTEMPTS) continue;
        // Счетчик тикает и для radio-отправленных: по его достижению
        // releaseStaleDispatchedMarkers снимет метку (страховка от потерянного ACK)
        this.broadcastAttempts.set(env.id, attempts + 1);
        // Уже ушедший в эфир конверт ждет Radio-ACK / relay-bridge — радио не дергаем
        if (this.dispatchedViaMesh.has(env.id)) continue;
        await this.broadcastEnvelopeToNearbyPeers(env, undefined, true);
      }
    } finally {
      this.isPumpActive = false;
    }
  }

  /**
   * Страховка от потерянного Radio-ACK: конверт помечен dispatched_via_mesh, но за
   * DISPATCHED_RELEASE_AFTER_MS не подтвержден и не bridged — снимаем метку, разрешая
   * облачную отгрузку и повторную радио-передачу (иначе конверт завис бы до истечения TTL).
   */
  public releaseStaleDispatchedMarkers(): void {
    const now = Date.now();
    for (const envId of Array.from(this.dispatchedViaMesh)) {
      const dispatchedAt = this.dispatchedViaMeshAt.get(envId) || now;
      if (now - dispatchedAt >= OfflineMeshManager.DISPATCHED_RELEASE_AFTER_MS) {
        this.dispatchedViaMesh.delete(envId);
        this.dispatchedViaMeshAt.delete(envId);
        console.log(`[OfflineMeshManager] Снята метка dispatched_via_mesh с конверта ${envId} (ACK не получен за ${Math.round(OfflineMeshManager.DISPATCHED_RELEASE_AFTER_MS / 1000)} с)`);
      }
    }
  }

  public async flushQueueToCloud(backendUrl?: string): Promise<number> {
    // Состав облачной отгрузки (HTMA):
    //  1) собственные (hopCount===0) конверты, еще не ушедшие в BLE-эфир (dispatched_via_mesh);
    //  2) транзитные (hopCount>0) конверты, принятые по радио, — узел выступает Gateway Bridge:
    //     отправитель может быть без интернета, и только ретранслятор доставляет пакет в облако.
    //    (фильтр «только hopCount===0», добавленный ранее, молча убивал мост relay→cloud)
    const ownEnvelopes = this.envelopes.filter((env) => env && (env.hopCount || 0) === 0 && !this.dispatchedViaMesh.has(env.id));
    const transitEnvelopes = this.envelopes.filter((env) => env && (env.hopCount || 0) > 0);
    const flushEnvelopes = [...ownEnvelopes, ...transitEnvelopes];
    if (flushEnvelopes.length === 0) return 0;

    const host = (backendUrl || this.backendUrl || (typeof window !== 'undefined' && window.location.origin) || 'https://skuf-net.ru').trim();
    if (!host) return 0;

    try {
      const endpoint = `${host.endsWith('/') ? host.slice(0, -1) : host}/api/v1/mesh/relay`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          envelopes: flushEnvelopes,
          nodeId: this.localNodeId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const count = data.relayed || flushEnvelopes.length;
        this.totalRelayedCount += count;
        localStorage.setItem('gossip_mesh_relayed_count', String(this.totalRelayedCount));
        const flushedIds = new Set(flushEnvelopes.map(e => e.id));
        this.envelopes = this.envelopes.filter(e => !flushedIds.has(e.id));
        flushedIds.forEach(id => {
          this.dispatchedViaMesh.delete(id);
          this.dispatchedViaMeshAt.delete(id);
        });
        this.saveEnvelopes();
        this.lastSyncTime = Date.now();
        this.notify();
        console.log(`[OfflineMeshManager] Успешно сброшено ${count} конвертов на сервер шлюза (своих: ${ownEnvelopes.length}, транзитных: ${transitEnvelopes.length}).`);
        return count;
      }
    } catch (e) {
      console.warn('[OfflineMeshManager] Не удалось сбросить очередь в облако (нет сети):', e);
    }
    return 0;
  }

  public async getLocalPrekeyBundle(): Promise<PrekeyBundle> {
    return getLocalPrekeyBundle();
  }

  public async saveOfflinePrekeyBundle(peerId: string, bundle: PrekeyBundle, source: 'server' | 'ble' = 'ble'): Promise<void> {
    return saveOfflinePrekeyBundle(peerId, bundle, source);
  }

  public async getOfflinePrekeyBundle(peerId: string): Promise<PrekeyBundle | null> {
    return getOfflinePrekeyBundle(peerId);
  }

  public async openLocationSettings(): Promise<boolean> {
    if (!this.isNativeBleSupported) return false;
    try {
      await GossipBle.openLocationSettings();
      return true;
    } catch (e) {
      console.warn('[OfflineMeshManager] Ошибка открытия настроек геолокации:', e);
      return false;
    }
  }

  public async openBluetoothSettings(): Promise<boolean> {
    if (!this.isNativeBleSupported) return false;
    try {
      await GossipBle.openBluetoothSettings();
      return true;
    } catch (e) {
      console.warn('[OfflineMeshManager] Ошибка открытия настроек Bluetooth:', e);
      return false;
    }
  }
}

export const offlineMeshManager = OfflineMeshManager.getInstance();

export const openLocationSettings = (): Promise<boolean> => {
  return offlineMeshManager.openLocationSettings();
};

export const openBluetoothSettings = (): Promise<boolean> => {
  return offlineMeshManager.openBluetoothSettings();
};
