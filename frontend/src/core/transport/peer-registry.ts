// frontend/src/core/transport/peer-registry.ts
/**
 * Единый реестр пиров мультитранспортного меша (PeerRegistry)
 * 
 * Ключевые инварианты:
 * 1. Dual Identity (AGENTS §13.6): ключ пира — per-device хэш SHA-256(deviceId)[0..8).
 * 2. Multi-Address: одно устройство может быть одновременно доступно по нескольким
 *    транспортам (LAN, BLE, LoRa, Bridge, Mock).
 * 3. Automatic Decay: TTL 40 секунд. Неактивные интерфейсы протухают и удаляются.
 *    При потере всех интерфейсов генерируется событие onPeerLost.
 * 4. Zero-Phantom-Mesh (AGENTS §14): список активных пиров содержит только физически живые узлы.
 */

import {
  DiscoveredPeer,
  TransportPeer,
  TransportType,
  deriveDeviceIdHashSync,
} from './transport';
import { PrekeyBundle } from '../crypto/e2ee';

/** Запись о транспорте в реестре пира */
export interface PeerTransportInfo {
  transportType: TransportType;
  address: string;
  host?: string;
  port?: number;
  rssi?: number;
  snr?: number;
  lastActive: number;
}

/** Агрегированная запись об узле сети */
export interface PeerRecord {
  /** Первичный ключ записи: SHA-256(deviceId)[0..8) */
  deviceIdHash: string;
  /** Составной идентификатор узла (mesh-<hash> или id) */
  id: string;
  /** UUID аккаунта пользователя для E2EE адресации */
  nodeId?: string;
  /** Отображаемое имя или псевдоним пира */
  name?: string;
  /** Время последней активности любого интерфейса */
  lastSeen: number;
  /** Флаг доступности узла в качестве ретранслятора */
  isRelay?: boolean;
  /** E2EE открытые ключи для X3DH инициализации */
  prekeyBundle?: PrekeyBundle;
  /** Активные сетевые интерфейсы узла */
  transports: {
    lan?: PeerTransportInfo;
    ble?: PeerTransportInfo;
    lora?: PeerTransportInfo;
    bridge?: PeerTransportInfo;
    custom_mock?: PeerTransportInfo;
    [key: string]: PeerTransportInfo | undefined;
  };
}

export type PeerListener = (peer: PeerRecord) => void;
export type PeerLostListener = (peerId: string) => void;

export class PeerRegistry {
  public static readonly DEFAULT_TTL_MS = 40000; // 40 секунд TTL

  private readonly ttlMs: number;
  private readonly peers = new Map<string, PeerRecord>();
  private readonly idToHashIndex = new Map<string, string>();

  private readonly discoveredListeners = new Set<PeerListener>();
  private readonly lostListeners = new Set<PeerLostListener>();
  private readonly updatedListeners = new Set<PeerListener>();

  private sweepTimer: any = null;

  constructor(ttlMs: number = PeerRegistry.DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
    this.startSweepTimer();
  }

  /**
   * Регистрация или обновление пира из любого транспорта.
   * Выполняет автоматическое слияние интерфейсов одного и того же физического устройства.
   */
  public register(peerInput: DiscoveredPeer | TransportPeer | any): PeerRecord {
    const now = peerInput.lastSeen || Date.now();
    const transportType: TransportType = peerInput.transportType || peerInput.type || 'ble';
    
    // Определяем стабильный deviceIdHash
    let deviceIdHash = peerInput.deviceIdHash;
    if (!deviceIdHash) {
      if (peerInput.id && peerInput.id.startsWith('mesh-')) {
        deviceIdHash = peerInput.id.replace('mesh-', '').slice(0, 8);
      } else if (peerInput.id && peerInput.id.length === 8 && /^[0-9a-fA-F]+$/.test(peerInput.id)) {
        deviceIdHash = peerInput.id.toLowerCase();
      } else if (peerInput.deviceId) {
        deviceIdHash = deriveDeviceIdHashSync(peerInput.deviceId);
      } else {
        deviceIdHash = peerInput.id || deriveDeviceIdHashSync(peerInput.address || String(now));
      }
    }
    deviceIdHash = deviceIdHash.toLowerCase();

    const id = peerInput.id || `mesh-${deviceIdHash}`;
    const address = peerInput.address || `${transportType}://${deviceIdHash}`;

    let isNewPeer = false;
    let peer = this.peers.get(deviceIdHash);

    if (!peer) {
      isNewPeer = true;
      peer = {
        deviceIdHash,
        id,
        nodeId: peerInput.nodeId,
        name: peerInput.name,
        lastSeen: now,
        isRelay: Boolean(peerInput.isRelay),
        prekeyBundle: peerInput.prekeyBundle,
        transports: {},
      };
      this.peers.set(deviceIdHash, peer);
      this.idToHashIndex.set(id, deviceIdHash);
      if (peerInput.nodeId) {
        this.idToHashIndex.set(peerInput.nodeId, deviceIdHash);
      }
    } else {
      if (peerInput.nodeId) {
        peer.nodeId = peerInput.nodeId;
        this.idToHashIndex.set(peerInput.nodeId, deviceIdHash);
      }
      if (peerInput.name) peer.name = peerInput.name;
      if (peerInput.isRelay !== undefined) peer.isRelay = Boolean(peerInput.isRelay);
      if (peerInput.prekeyBundle) peer.prekeyBundle = peerInput.prekeyBundle;
      peer.lastSeen = Math.max(peer.lastSeen, now);
    }

    const transportInfo: PeerTransportInfo = {
      transportType,
      address,
      host: peerInput.host,
      port: peerInput.port,
      rssi: peerInput.rssi,
      snr: peerInput.snr,
      lastActive: now,
    };

    const isNewTransport = !peer.transports[transportType];
    peer.transports[transportType] = transportInfo;

    if (isNewPeer) {
      this.notifyDiscovered(peer);
    } else if (isNewTransport) {
      this.notifyUpdated(peer);
    }

    return peer;
  }

  /**
   * Удаление транспорта или всей записи пира
   */
  public unregister(deviceIdHashOrId: string, transportType?: TransportType): void {
    const hash = this.resolveHash(deviceIdHashOrId);
    if (!hash) return;

    const peer = this.peers.get(hash);
    if (!peer) return;

    if (transportType && peer.transports[transportType]) {
      delete peer.transports[transportType];
      const remaining = Object.keys(peer.transports);
      if (remaining.length > 0) {
        this.notifyUpdated(peer);
        return;
      }
    }

    this.peers.delete(hash);
    this.idToHashIndex.delete(peer.id);
    if (peer.nodeId) {
      this.idToHashIndex.delete(peer.nodeId);
    }
    this.notifyLost(peer.id);
    if (peer.deviceIdHash !== peer.id) {
      this.notifyLost(peer.deviceIdHash);
    }
  }

  public getPeer(deviceIdHashOrId: string): PeerRecord | undefined {
    const hash = this.resolveHash(deviceIdHashOrId);
    if (!hash) return undefined;
    return this.peers.get(hash);
  }

  public getAll(): PeerRecord[] {
    return Array.from(this.peers.values());
  }

  public getActivePeers(now: number = Date.now()): PeerRecord[] {
    const active: PeerRecord[] = [];
    for (const peer of this.peers.values()) {
      const isAlive = Object.values(peer.transports).some(
        (t) => t && t.lastActive >= now - this.ttlMs
      );
      if (isAlive) {
        active.push(peer);
      }
    }
    return active;
  }

  public getPeersByTransport(transportType: TransportType, now: number = Date.now()): DiscoveredPeer[] {
    const result: DiscoveredPeer[] = [];
    for (const peer of this.peers.values()) {
      const t = peer.transports[transportType];
      if (t && t.lastActive >= now - this.ttlMs) {
        result.push({
          id: peer.id,
          deviceIdHash: peer.deviceIdHash,
          nodeId: peer.nodeId,
          name: peer.name,
          transportType,
          address: t.address,
          host: t.host,
          port: t.port,
          rssi: t.rssi,
          snr: t.snr,
          isRelay: peer.isRelay,
          prekeyBundle: peer.prekeyBundle,
          lastSeen: t.lastActive,
        });
      }
    }
    return result;
  }

  public cleanExpired(now: number = Date.now()): string[] {
    const removedPeerIds: string[] = [];

    for (const [hash, peer] of Array.from(this.peers.entries())) {
      let activeTransportsCount = 0;

      for (const [tType, tInfo] of Object.entries(peer.transports)) {
        if (!tInfo) continue;
        if (tInfo.lastActive < now - this.ttlMs) {
          delete peer.transports[tType];
        } else {
          activeTransportsCount++;
        }
      }

      if (activeTransportsCount === 0) {
        this.peers.delete(hash);
        this.idToHashIndex.delete(peer.id);
        if (peer.nodeId) {
          this.idToHashIndex.delete(peer.nodeId);
        }
        removedPeerIds.push(peer.id);
        this.notifyLost(peer.id);
      }
    }

    return removedPeerIds;
  }

  public size(): number {
    return this.peers.size;
  }

  public clear(): void {
    const allIds = Array.from(this.peers.values()).map((p) => p.id);
    this.peers.clear();
    this.idToHashIndex.clear();
    for (const id of allIds) {
      this.notifyLost(id);
    }
  }

  public destroy(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
    this.clear();
    this.discoveredListeners.clear();
    this.lostListeners.clear();
    this.updatedListeners.clear();
  }

  public onPeerDiscovered(handler: PeerListener): () => void {
    this.discoveredListeners.add(handler);
    return () => this.discoveredListeners.delete(handler);
  }

  public onPeerLost(handler: PeerLostListener): () => void {
    this.lostListeners.add(handler);
    return () => this.lostListeners.delete(handler);
  }

  public onPeerUpdated(handler: PeerListener): () => void {
    this.updatedListeners.add(handler);
    return () => this.updatedListeners.delete(handler);
  }

  private resolveHash(idOrHash: string): string | undefined {
    if (!idOrHash) return undefined;
    const lower = idOrHash.toLowerCase();
    if (this.peers.has(lower)) return lower;
    if (this.idToHashIndex.has(idOrHash)) return this.idToHashIndex.get(idOrHash);
    if (this.idToHashIndex.has(lower)) return this.idToHashIndex.get(lower);
    return undefined;
  }

  private notifyDiscovered(peer: PeerRecord): void {
    for (const listener of this.discoveredListeners) {
      try {
        listener(peer);
      } catch (e) {
        console.warn('[PeerRegistry] Ошибка в onPeerDiscovered:', e);
      }
    }
  }

  private notifyLost(peerId: string): void {
    for (const listener of this.lostListeners) {
      try {
        listener(peerId);
      } catch (e) {
        console.warn('[PeerRegistry] Ошибка в onPeerLost:', e);
      }
    }
  }

  private notifyUpdated(peer: PeerRecord): void {
    for (const listener of this.updatedListeners) {
      try {
        listener(peer);
      } catch (e) {
        console.warn('[PeerRegistry] Ошибка в onPeerUpdated:', e);
      }
    }
  }

  private startSweepTimer(): void {
    if (typeof window === 'undefined' && typeof setInterval === 'undefined') return;
    this.sweepTimer = setInterval(() => {
      this.cleanExpired();
    }, 10000);
    if (this.sweepTimer && typeof this.sweepTimer.unref === 'function') {
      this.sweepTimer.unref();
    }
  }
}