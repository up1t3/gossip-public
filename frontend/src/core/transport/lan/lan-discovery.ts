// frontend/src/core/transport/lan/lan-discovery.ts
/**
 * Модуль обнаружения соседей в локальной сети (mDNS / ZeroConf Discovery).
 * Протокол: Network Service Discovery (NSD) / mDNS по RFC 6762 / RFC 6763.
 * Имя сервиса: _gossip-mesh._tcp.local
 * Имя инстанса: gossip-<SHA-256(deviceId)[0..8)> (Dual Identity Standard)
 * TXT-запись: { v: '1', proto: '2', port: '46001', did: '<SHA-256(deviceId)[0..8)>' }
 */

import { DiscoveredPeer, deriveDeviceIdHash, deriveDeviceIdHashSync, getPeerAlias } from '../transport';

export interface LanDiscoveryConfig {
  /** Физический идентификатор локального устройства */
  deviceId: string;
  /** Хэш физического идентификатора (8 hex символов) */
  deviceIdHash?: string;
  /** Выделенный локальный порт WebSocket сервера */
  port: number;
  /** Время жизни записи пира до устаревания (в мс), по умолчанию 30000 (30 сек) */
  peerTtlMs?: number;
  /** Интервал периодической проверки протухших пиров (в мс), по умолчанию 5000 (5 сек) */
  sweepIntervalMs?: number;
  /** Интервал широковещательного анонса (в мс), по умолчанию 10000 (10 сек) */
  announceIntervalMs?: number;
}

export type PeerDiscoveryListener = (peer: DiscoveredPeer) => void;
export type PeerLostListener = (peerId: string) => void;

export class LanDiscovery {
  public static readonly SERVICE_TYPE = '_gossip-mesh._tcp.local';
  public static readonly PROTOCOL_VERSION = '2';

  private readonly config: Required<LanDiscoveryConfig>;
  private isRunning = false;
  private readonly discoveredPeers = new Map<string, DiscoveredPeer>();
  private readonly discoveryListeners = new Set<PeerDiscoveryListener>();
  private readonly lostListeners = new Set<PeerLostListener>();

  private sweepTimer: any = null;
  private announceTimer: any = null;
  private broadcastChannel: any = null;

  constructor(config: LanDiscoveryConfig) {
    const didHash = config.deviceIdHash || deriveDeviceIdHashSync(config.deviceId);
    this.config = {
      deviceId: config.deviceId,
      deviceIdHash: didHash,
      port: config.port,
      peerTtlMs: config.peerTtlMs ?? 30000,
      sweepIntervalMs: config.sweepIntervalMs ?? 5000,
      announceIntervalMs: config.announceIntervalMs ?? 10000,
    };
  }

  /** Запуск процесса обнаружения и анонсирования сервиса */
  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // Уточняем хэш асинхронно при необходимости
    if (!this.config.deviceIdHash || this.config.deviceIdHash === '00000000') {
      this.config.deviceIdHash = await deriveDeviceIdHash(this.config.deviceId);
    }

    // Инициализация межвкладочного / браузерного канала симуляции LAN mDNS
    this.initBroadcastChannel();

    // Запуск цикла анонсов
    this.announce();
    this.announceTimer = setInterval(() => {
      if (this.isRunning) {
        this.announce();
      }
    }, this.config.announceIntervalMs);

    // Запуск таймера очистки протухших пиров (decay)
    this.sweepTimer = setInterval(() => {
      if (this.isRunning) {
        this.pruneStalePeers();
      }
    }, this.config.sweepIntervalMs);
  }

  /** Остановка процесса обнаружения и очистка ресурсов */
  public async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.announceTimer) {
      clearInterval(this.announceTimer);
      this.announceTimer = null;
    }

    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }

    // Отправка goodbye сообщения
    this.broadcastGoodbye();

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {}
      this.broadcastChannel = null;
    }

    // Оповещаем о потере всех известных пиров для соблюдения Zero-Phantom инварианта
    const peerIds = Array.from(this.discoveredPeers.keys());
    this.discoveredPeers.clear();
    for (const peerId of peerIds) {
      this.notifyPeerLost(peerId);
    }
  }

  /** Обновление локального порта при динамической смене */
  public updatePort(port: number): void {
    this.config.port = port;
    if (this.isRunning) {
      this.announce();
    }
  }

  /** Получение списка текущих активных пиров */
  public getPeers(): DiscoveredPeer[] {
    return Array.from(this.discoveredPeers.values());
  }

  /** Регистрация слушателя обнаружения нового или обновленного пира */
  public onPeerDiscovered(listener: PeerDiscoveryListener): () => void {
    this.discoveryListeners.add(listener);
    return () => this.discoveryListeners.delete(listener);
  }

  /** Регистрация слушателя потери / устаревания пира */
  public onPeerLost(listener: PeerLostListener): () => void {
    this.lostListeners.add(listener);
    return () => this.lostListeners.delete(listener);
  }

  /** Ручная регистрация обнаруженного пира из нативного NSD / mDNS плагина */
  public registerDiscoveredPeer(info: {
    host: string;
    port: number;
    deviceIdHash: string;
    nodeId?: string;
    name?: string;
    isRelay?: boolean;
    rssi?: number;
  }): void {
    if (!this.isRunning) return;

    // Echo-фильтр: игнорируем собственное физическое устройство
    if (info.deviceIdHash === this.config.deviceIdHash) {
      return;
    }

    const peerId = `lan://${info.host}:${info.port}`;
    const now = Date.now();
    const existing = this.discoveredPeers.get(peerId);

    const peer: DiscoveredPeer = {
      id: peerId,
      deviceIdHash: info.deviceIdHash,
      nodeId: info.nodeId || existing?.nodeId,
      name: info.name || existing?.name || getPeerAlias(info.deviceIdHash),
      transportType: 'lan',
      address: peerId,
      host: info.host,
      port: info.port,
      rssi: info.rssi ?? -40, // LAN качественный линк по умолчанию
      isRelay: info.isRelay ?? false,
      lastSeen: now,
    };

    this.discoveredPeers.set(peerId, peer);

    if (!existing) {
      this.notifyPeerDiscovered(peer);
    }
  }

  // -------------------------------------------------------------------------
  // Внутренние методы анонсирования и симуляции mDNS
  // -------------------------------------------------------------------------

  private announce(): void {
    const alias = getPeerAlias(this.config.deviceIdHash);
    const packet = {
      type: 'MDNS_ANNOUNCE',
      service: LanDiscovery.SERVICE_TYPE,
      instanceName: alias,
      txt: {
        v: '1',
        proto: LanDiscovery.PROTOCOL_VERSION,
        port: String(this.config.port),
        did: this.config.deviceIdHash,
      },
      host: '127.0.0.1', // Для локальной симуляции
      port: this.config.port,
      timestamp: Date.now(),
    };

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(packet);
      } catch {}
    }
  }

  private broadcastGoodbye(): void {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'MDNS_GOODBYE',
          deviceIdHash: this.config.deviceIdHash,
          port: this.config.port,
        });
      } catch {}
    }
  }

  private initBroadcastChannel(): void {
    if (typeof window !== 'undefined' && typeof (window as any).BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new (window as any).BroadcastChannel('gossip_lan_mdns_discovery');
        this.broadcastChannel.onmessage = (event: MessageEvent) => {
          this.handleBroadcastMessage(event.data);
        };
      } catch {}
    }
  }

  private handleBroadcastMessage(data: any): void {
    if (!this.isRunning || !data || typeof data !== 'object') return;

    if (data.type === 'MDNS_ANNOUNCE' && data.txt) {
      const did = data.txt.did || data.deviceIdHash;
      const port = Number(data.txt.port || data.port);
      if (!did || !port || isNaN(port)) return;

      // Echo-Filter: отбрасываем собственные пакеты
      if (did === this.config.deviceIdHash) return;

      this.registerDiscoveredPeer({
        host: data.host || '127.0.0.1',
        port: port,
        deviceIdHash: did,
      });
    } else if (data.type === 'MDNS_GOODBYE') {
      const did = data.deviceIdHash;
      if (!did || did === this.config.deviceIdHash) return;

      // Находим пиры с данным did и удаляем
      for (const [peerId, peer] of this.discoveredPeers.entries()) {
        if (peer.deviceIdHash === did) {
          this.discoveredPeers.delete(peerId);
          this.notifyPeerLost(peerId);
        }
      }
    }
  }

  private pruneStalePeers(): void {
    const now = Date.now();
    const stalePeerIds: string[] = [];

    for (const [peerId, peer] of this.discoveredPeers.entries()) {
      if (now - peer.lastSeen > this.config.peerTtlMs) {
        stalePeerIds.push(peerId);
      }
    }

    for (const peerId of stalePeerIds) {
      this.discoveredPeers.delete(peerId);
      this.notifyPeerLost(peerId);
    }
  }

  private notifyPeerDiscovered(peer: DiscoveredPeer): void {
    for (const listener of this.discoveryListeners) {
      try {
        listener(peer);
      } catch (e) {
        console.error('[LanDiscovery] Ошибка в listener onPeerDiscovered:', e);
      }
    }
  }

  private notifyPeerLost(peerId: string): void {
    for (const listener of this.lostListeners) {
      try {
        listener(peerId);
      } catch (e) {
        console.error('[LanDiscovery] Ошибка в listener onPeerLost:', e);
      }
    }
  }
}