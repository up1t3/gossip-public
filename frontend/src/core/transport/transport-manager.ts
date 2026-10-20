// frontend/src/core/transport/transport-manager.ts
/**
 * Главный фасад мультитранспортного меша (TransportManager)
 * 
 * Отвечает за:
 * 1. Управление коллекцией подключенных транспортов (MeshTransport).
 * 2. Единый реестр пиров (PeerRegistry) с decay TTL 40s.
 * 3. HTMA-диспетчер маршрутизации (TransportDispatcher) с fan-out redundancy.
 * 4. Единый двухуровневый кэш дедупликации (SeenPacketCache на 4096 записей).
 * 5. Строгое соблюдение экосистемных инвариантов:
 *    - Echo-Filter: отбрасывание собственных пакетов по localDeviceId.
 *    - Single-Encryption: сохранение шифротекста байт-в-байт.
 *    - Zero-Phantom-Mesh: корректная индикация активных интерфейсов.
 * 6. Трансляция сетевых событий в глобальную шину приложения.
 */

import {
  MeshTransport,
  TransportType,
  MeshEnvelope,
  DiscoveredPeer,
  TransportResult,
  SeenPacketCache,
  deriveDeviceIdHashSync,
  deriveDeviceIdHash,
  isEchoEnvelope,
  CompositeTransportState,
} from './transport';
import { PeerRegistry, PeerRecord } from './peer-registry';
import { TransportDispatcher } from './dispatcher';
import { LANTransport } from './lan/lan-transport';
import { BleTransport } from './ble/ble-transport';
import { LoRaTransport } from './lora/lora-transport';
import { CommunityBridge } from './bridge/community-bridge';

export interface TransportManagerOptions {
  localDeviceId?: string;
  localNodeId?: string;
  alias?: string;
  isRelay?: boolean;
  fanoutRedundancy?: number;
}

export type TransportEventHandler = (...args: any[]) => void;

export class TransportManager {
  private static instance: TransportManager | null = null;

  public static getInstance(options?: TransportManagerOptions): TransportManager {
    if (!TransportManager.instance) {
      TransportManager.instance = new TransportManager(options);
    }
    return TransportManager.instance;
  }

  private localDeviceId: string;
  private localDeviceIdHash: string;
  private localNodeId: string;
  private alias?: string;
  private isRelay: boolean = false;

  private isRunning: boolean = false;

  private readonly transports = new Map<string, MeshTransport>();
  private readonly peerRegistry: PeerRegistry;
  private readonly seenPacketCache: SeenPacketCache;
  private readonly dispatcher: TransportDispatcher;

  private readonly eventListeners = new Map<string, Set<TransportEventHandler>>();

  constructor(options?: TransportManagerOptions) {
    this.localDeviceId = options?.localDeviceId || this.initLocalDeviceId();
    this.localDeviceIdHash = deriveDeviceIdHashSync(this.localDeviceId);
    this.localNodeId = options?.localNodeId || this.initLocalNodeId();
    this.alias = options?.alias;
    this.isRelay = Boolean(options?.isRelay);

    this.peerRegistry = new PeerRegistry(40000);
    this.seenPacketCache = new SeenPacketCache(4096);
    this.dispatcher = new TransportDispatcher({
      peerRegistry: this.peerRegistry,
      seenCache: this.seenPacketCache,
      fanoutRedundancy: options?.fanoutRedundancy || 1,
    });

    this.setupRegistryEvents();
  }

  /**
   * Инициализация и авто-регистрация стандартных транспортов (LAN, BLE)
   */
  public async initialize(): Promise<void> {
    if (!this.localDeviceIdHash || this.localDeviceIdHash === '00000000') {
      this.localDeviceIdHash = await deriveDeviceIdHash(this.localDeviceId);
    }

    if (!this.transports.has('lan')) {
      const lan = new LANTransport({
        deviceId: this.localDeviceId,
        nodeId: this.localNodeId,
        alias: this.alias,
      });
      this.registerTransport(lan);
    }

    if (!this.transports.has('ble')) {
      const ble = new BleTransport({
        deviceId: this.localDeviceId,
        nodeId: this.localNodeId,
        alias: this.alias,
        isRelay: this.isRelay,
      });
      this.registerTransport(ble);
    }

    if (!this.transports.has('lora')) {
      const lora = new LoRaTransport({
        deviceId: this.localDeviceId,
        nodeId: this.localNodeId,
        alias: this.alias,
      });
      this.registerTransport(lora);
    }

    if (!this.transports.has('bridge')) {
      const bridge = new CommunityBridge({
        deviceId: this.localDeviceId,
        nodeId: this.localNodeId,
        seenCache: this.seenPacketCache,
      });
      this.registerTransport(bridge);
    }
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    if (!this.localDeviceIdHash || this.localDeviceIdHash === '00000000') {
      this.localDeviceIdHash = await deriveDeviceIdHash(this.localDeviceId);
    }

    for (const transport of this.transports.values()) {
      try {
        await transport.start();
        this.hookTransportListeners(transport);
      } catch (e) {
        console.warn(`[TransportManager] Ошибка запуска транспорта ${transport.id}:`, e);
      }
    }

    this.isRunning = true;
    this.emit('stateChanged', this.getCompositeState());
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;

    for (const transport of this.transports.values()) {
      try {
        await transport.stop();
      } catch (e) {
        console.warn(`[TransportManager] Ошибка остановки транспорта ${transport.id}:`, e);
      }
    }

    this.peerRegistry.clear();
    this.emit('stateChanged', this.getCompositeState());
  }

  public registerTransport(transport: MeshTransport): void {
    const id = transport.id || (transport as any).type || 'custom_mock';
    this.transports.set(id, transport);
    this.dispatcher.registerTransport(transport);
    this.hookTransportListeners(transport);

    if (this.isRunning) {
      transport.start().catch((e) => {
        console.warn(`[TransportManager] Ошибка запуска зарегистрированного транспорта ${id}:`, e);
      });
    }

    this.emit('stateChanged', this.getCompositeState());
  }

  public unregisterTransport(id: string): void {
    const transport = this.transports.get(id);
    if (transport) {
      transport.stop().catch(() => {});
      this.transports.delete(id);
      this.dispatcher.unregisterTransport(id);
      this.emit('stateChanged', this.getCompositeState());
    }
  }

  public async sendEnvelope(
    envelope: MeshEnvelope,
    targetPeerId?: string
  ): Promise<TransportResult> {
    if (!envelope.senderDeviceId) {
      envelope.senderDeviceId = this.localDeviceId;
    }
    if (!envelope.senderNodeId && this.localNodeId) {
      envelope.senderNodeId = this.localNodeId;
    }
    if (!envelope.timestamp) {
      envelope.timestamp = Date.now();
    }

    this.seenPacketCache.add(envelope.id);

    return this.dispatcher.dispatch(envelope, targetPeerId);
  }

  public async send(
    envelope: MeshEnvelope,
    targetPeerId?: string
  ): Promise<TransportResult> {
    return this.sendEnvelope(envelope, targetPeerId);
  }

  public async broadcastEnvelope(envelope: MeshEnvelope): Promise<TransportResult[]> {
    if (!envelope.senderDeviceId) {
      envelope.senderDeviceId = this.localDeviceId;
    }
    if (!envelope.senderNodeId && this.localNodeId) {
      envelope.senderNodeId = this.localNodeId;
    }
    if (!envelope.timestamp) {
      envelope.timestamp = Date.now();
    }

    this.seenPacketCache.add(envelope.id);

    return this.dispatcher.broadcast(envelope);
  }

  public handleIncomingEnvelope(envelope: MeshEnvelope, senderInfo?: DiscoveredPeer): boolean {
    if (!envelope || !envelope.id) return false;

    if (isEchoEnvelope(envelope, this.localDeviceId)) {
      return false;
    }

    if (this.seenPacketCache.has(envelope.id)) {
      return false;
    }

    // Ретрансляция транзитного конверта в облако через CommunityBridge (при включенном мосте)
    const bridge = this.transports.get('bridge') as CommunityBridge | undefined;
    if (bridge && typeof bridge.handleTransitEnvelope === 'function') {
      bridge.handleTransitEnvelope(envelope, senderInfo);
    }

    this.seenPacketCache.add(envelope.id);

    if (senderInfo) {
      this.peerRegistry.register(senderInfo);
    }

    this.emit('received', envelope, senderInfo);

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        window.dispatchEvent(
          new CustomEvent('gossip_mesh_envelope_received', {
            detail: {
              envelope,
              senderInfo,
            },
          })
        );
      } catch {}
    }

    return true;
  }

  public getPeerRegistry(): PeerRegistry {
    return this.peerRegistry;
  }

  public getAllPeers(): PeerRecord[] {
    return this.peerRegistry.getActivePeers();
  }

  public getDispatcher(): TransportDispatcher {
    return this.dispatcher;
  }

  public getSeenCache(): SeenPacketCache {
    return this.seenPacketCache;
  }

  public getTransports(): MeshTransport[] {
    return Array.from(this.transports.values());
  }

  public getTransport(id: string): MeshTransport | undefined {
    return this.transports.get(id);
  }

  public getLocalDeviceId(): string {
    return this.localDeviceId;
  }

  public getLocalDeviceIdHash(): string {
    return this.localDeviceIdHash;
  }

  public getLocalNodeId(): string {
    return this.localNodeId;
  }

  public getCompositeState(): CompositeTransportState {
    const activeTransports: TransportType[] = [];
    const peersByTransport: Record<string, number> = {};

    for (const [id, t] of this.transports.entries()) {
      const isAlive = typeof (t as any).isAvailable === 'boolean'
        ? (t as any).isAvailable
        : Boolean(t.getStatus?.().isRunning);
      if (isAlive) {
        activeTransports.push(id as TransportType);
      }
      peersByTransport[id] = t.getPeers ? t.getPeers().length : 0;
    }

    const allPeers = this.peerRegistry.getActivePeers();

    return {
      isMeshActive: activeTransports.length > 0 && this.isRunning,
      activeTransports,
      totalPeersCount: allPeers.length,
      peersByTransport,
      metrics: this.dispatcher.getMetrics(),
    };
  }

  public on(event: string, handler: TransportEventHandler): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);
    return () => {
      this.eventListeners.get(event)?.delete(handler);
    };
  }

  public emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(...args);
        } catch (e) {
          console.warn(`[TransportManager] Ошибка обработчика события ${event}:`, e);
        }
      }
    }
  }

  private hookTransportListeners(transport: MeshTransport): void {
    transport.onReceive((envelope, senderInfo) => {
      this.handleIncomingEnvelope(envelope, senderInfo);
    });

    if (transport.onPeerDiscovered) {
      transport.onPeerDiscovered((peer) => {
        this.peerRegistry.register(peer);
      });
    }

    if (transport.onPeerLost) {
      transport.onPeerLost((peerId) => {
        this.peerRegistry.unregister(peerId, transport.id || (transport as any).type);
      });
    }
  }

  private setupRegistryEvents(): void {
    this.peerRegistry.onPeerDiscovered((peer) => {
      this.emit('peerDiscovered', peer);
      this.emit('stateChanged', this.getCompositeState());

      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        try {
          window.dispatchEvent(
            new CustomEvent('gossip_transport_peer_discovered', {
              detail: peer,
            })
          );
        } catch {}
      }
    });

    this.peerRegistry.onPeerLost((peerId) => {
      this.emit('peerLost', peerId);
      this.emit('stateChanged', this.getCompositeState());

      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        try {
          window.dispatchEvent(
            new CustomEvent('gossip_transport_peer_lost', {
              detail: { peerId },
            })
          );
        } catch {}
      }
    });

    this.peerRegistry.onPeerUpdated((peer) => {
      this.emit('peerUpdated', peer);
      this.emit('stateChanged', this.getCompositeState());
    });
  }

  private initLocalDeviceId(): string {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('gossip_mesh_device_id') || localStorage.getItem('device_id');
        if (saved) return saved;
        const newId = `dev-${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem('gossip_mesh_device_id', newId);
        return newId;
      } catch {}
    }
    return `dev-${Math.random().toString(36).slice(2, 10)}`;
  }

  private initLocalNodeId(): string {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('current_user_id') || localStorage.getItem('local_node_id');
        if (saved) return saved;
      } catch {}
    }
    return 'user-local-anonymous';
  }
}

export const transportManager = TransportManager.getInstance();
export function getTransportManager(): TransportManager {
  return TransportManager.getInstance();
}