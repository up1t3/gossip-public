// frontend/src/core/transport/ble/ble-transport.ts
/**
 * Реализация BLE Mesh транспорта (GossipBle Plugin / Web Radio Fallback)
 * в рамках унифицированного контракта MeshTransport.
 * 
 * Приоритет HTMA: 80 (LAN: 100 > BLE: 80 > LoRa: 50 > Bridge: 20).
 * MTU: 512 байт (L2 пакетная фрагментация нативного стека).
 * 
 * Ключевые инварианты BLE:
 * 1. Senior / Junior Tie-Breaking (AGENTS §13.7): Старший узел подключается сразу (0 мс),
 *    младший узел выдерживает паузу уступки Grace Period 1500..1800 мс.
 * 2. Peer Address Cooldowns: 30 с задержка на повторное подключение к сбойным MAC-адресам.
 * 3. Scan Failure Streaks & Backoff Ladder: 15с -> 45с -> 120с -> 300с.
 * 4. Dual Identity: реклама per-device хэша SHA-256(deviceId)[0..8).
 */

import { registerPlugin, Capacitor } from '@capacitor/core';
import {
  MeshTransport,
  TransportType,
  MeshEnvelope,
  DiscoveredPeer,
  TransportResult,
  TransportStats,
  TransportMetrics,
  TransportStatus,
  deriveDeviceIdHashSync,
  deriveDeviceIdHash,
  isEchoEnvelope,
} from '../transport';

export interface GossipBlePluginInterface {
  checkMeshPermissions(): Promise<{ granted: boolean; bluetoothEnabled: boolean; locationServicesEnabled?: boolean }>;
  requestMeshPermissions(): Promise<{ granted: boolean; bluetoothEnabled: boolean; locationServicesEnabled?: boolean }>;
  startMesh(options?: { nodeId?: string; deviceId?: string; alias?: string; isRelay?: boolean; prekeyBundle?: string }): Promise<{ success: boolean; isMeshActive: boolean; locationServicesEnabled?: boolean }>;
  stopMesh(): Promise<{ success: boolean; isMeshActive: boolean }>;
  startScanning(): Promise<{ success: boolean; isScanning: boolean }>;
  stopScanning(): Promise<{ success: boolean; isScanning: boolean }>;
  getDiscoveredPeers(): Promise<{ peers: any[]; count: number; isScanning: boolean; isAdvertising: boolean; powerProfile?: string }>;
  setRelayMode(options: { isRelay: boolean }): Promise<{ isRelayMode: boolean }>;
  getMeshState(): Promise<any>;
  setPowerProfile(options: { profile: 'high' | 'balanced' | 'low_power' }): Promise<{ success: boolean; powerProfile: string }>;
  sendEnvelope(options: { targetAddress: string; envelopeJson: string }): Promise<{ success: boolean; error?: string }>;
  addListener(eventName: string, listenerFunc: (data: any) => void): Promise<any>;
}

const GossipBle = registerPlugin<GossipBlePluginInterface>('GossipBle');

export interface BleTransportOptions {
  deviceId: string;
  nodeId?: string;
  alias?: string;
  isRelay?: boolean;
}

export class BleTransport implements MeshTransport {
  public readonly id: TransportType = 'ble';
  public readonly type: TransportType = 'ble';
  public readonly mtu: number = 512;
  public readonly priority: number = 80;

  public isAvailable: boolean = true;

  public static readonly PEER_COOLDOWN_MS = 30000;
  public static readonly GRACE_PERIOD_BASE_MS = 1500;
  public static readonly GRACE_PERIOD_JITTER_MS = 300;

  private readonly deviceId: string;
  private deviceIdHash: string;
  private readonly nodeId: string;
  private readonly alias?: string;
  private readonly isRelay: boolean;

  private isRunning = false;
  private peers: DiscoveredPeer[] = [];
  private readonly peerAddressCooldowns = new Map<string, number>();

  private receiveHandler: ((envelope: MeshEnvelope, senderInfo?: DiscoveredPeer) => void) | null = null;
  private peerDiscoveredHandler: ((peer: DiscoveredPeer) => void) | null = null;
  private peerLostHandler: ((peerId: string) => void) | null = null;

  private webBroadcastChannel: any = null;

  private readonly statsData: TransportStats = {
    bytesSent: 0,
    bytesReceived: 0,
    packetsSent: 0,
    packetsReceived: 0,
    errorsCount: 0,
    lastActivity: Date.now(),
    signalMetric: -65,
  };

  constructor(options: BleTransportOptions) {
    this.deviceId = options.deviceId;
    this.deviceIdHash = deriveDeviceIdHashSync(options.deviceId);
    this.nodeId = options.nodeId || '';
    this.alias = options.alias;
    this.isRelay = Boolean(options.isRelay);
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    if (!this.deviceIdHash || this.deviceIdHash === '00000000') {
      this.deviceIdHash = await deriveDeviceIdHash(this.deviceId);
    }

    const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform();

    if (isNative) {
      try {
        await GossipBle.startMesh({
          nodeId: this.nodeId,
          deviceId: this.deviceId,
          alias: this.alias,
          isRelay: this.isRelay,
        });

        GossipBle.addListener('onPeersUpdated', (data: { peers: any[] }) => {
          this.handleNativePeersUpdated(data.peers || []);
        });

        GossipBle.addListener('onEnvelopeReceived', (data: { senderAddress: string; envelopeJson: string }) => {
          this.handleNativeEnvelopeReceived(data.senderAddress, data.envelopeJson);
        });
      } catch (e) {
        console.warn('[BleTransport] Ошибка запуска нативного BLE плагина:', e);
      }
    } else {
      this.initWebRadioFallback();
    }

    this.isRunning = true;
    this.isAvailable = true;
    this.statsData.lastActivity = Date.now();
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.isAvailable = false;

    const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform();
    if (isNative) {
      try {
        await GossipBle.stopMesh();
      } catch {}
    }

    if (this.webBroadcastChannel) {
      try {
        this.webBroadcastChannel.close();
      } catch {}
      this.webBroadcastChannel = null;
    }

    this.peers = [];
    this.statsData.lastActivity = Date.now();
  }

  public discover(onPeer: (peer: DiscoveredPeer) => void): void {
    this.onPeerDiscovered(onPeer);
  }

  public async send(envelope: MeshEnvelope, targetPeer?: DiscoveredPeer | string): Promise<TransportResult> {
    if (!this.isRunning) {
      return { success: false, transportId: 'ble', transportType: 'ble', error: 'BLE транспорт выключен' };
    }

    if (isEchoEnvelope(envelope, this.deviceId)) {
      return { success: false, transportId: 'ble', transportType: 'ble', error: 'Попытка отправки собственного эхо-пакета' };
    }

    let peer: DiscoveredPeer | undefined = undefined;
    if (typeof targetPeer === 'object' && targetPeer !== null) {
      peer = targetPeer;
    } else if (typeof targetPeer === 'string') {
      peer = this.peers.find((p) => p.id === targetPeer || p.deviceIdHash === targetPeer || p.address === targetPeer || p.nodeId === targetPeer);
    } else if (this.peers.length > 0) {
      peer = this.peers[0];
    }

    const payloadJson = JSON.stringify(envelope);
    const byteSize = payloadJson.length;
    const targetAddress = peer ? (peer.address || peer.deviceIdHash) : 'broadcast';

    const now = Date.now();
    if (peer && peer.address && (this.peerAddressCooldowns.get(peer.address) || 0) > now) {
      return { success: false, transportId: 'ble', transportType: 'ble', error: 'Пир находится на cooldown паузе' };
    }

    // Детерминированный арбитраж ролей Central/Server (Junior/Senior tie-breaking)
    if (peer) {
      const isSenior = this.isSeniorNode(peer.deviceIdHash || peer.address || peer.id);
      if (!isSenior) {
        const yieldDelayMs = BleTransport.GRACE_PERIOD_BASE_MS + Math.floor(Math.random() * BleTransport.GRACE_PERIOD_JITTER_MS);
        await new Promise((resolve) => setTimeout(resolve, yieldDelayMs));
      }
    }

    const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform();

    if (isNative) {
      try {
        const res = await GossipBle.sendEnvelope({
          targetAddress: peer?.address || targetAddress,
          envelopeJson: payloadJson,
        });

        if (res && res.success === false) {
          if (peer?.address) {
            this.peerAddressCooldowns.set(peer.address, Date.now() + BleTransport.PEER_COOLDOWN_MS);
          }
          this.statsData.errorsCount++;
          return { success: false, transportId: 'ble', transportType: 'ble', peerId: peer?.id, error: res.error || 'GATT error' };
        }

        this.statsData.packetsSent++;
        this.statsData.bytesSent += byteSize;
        this.statsData.lastActivity = Date.now();

        return {
          success: true,
          transportId: 'ble',
          transportType: 'ble',
          peerId: peer?.id,
          bytesTransferred: byteSize,
          bytesSent: byteSize,
        };
      } catch (e: any) {
        if (peer?.address) {
          this.peerAddressCooldowns.set(peer.address, Date.now() + BleTransport.PEER_COOLDOWN_MS);
        }
        this.statsData.errorsCount++;
        return { success: false, transportId: 'ble', transportType: 'ble', peerId: peer?.id, error: e.message || String(e) };
      }
    } else {
      if (this.webBroadcastChannel) {
        try {
          this.webBroadcastChannel.postMessage({
            type: 'GOSSIP_BLE_ENVELOPE',
            senderDeviceId: this.deviceId,
            senderDeviceIdHash: this.deviceIdHash,
            envelope,
          });
        } catch {}
      }

      this.statsData.packetsSent++;
      this.statsData.bytesSent += byteSize;
      this.statsData.lastActivity = Date.now();

      return {
        success: true,
        transportId: 'ble',
        transportType: 'ble',
        peerId: peer?.id,
        bytesTransferred: byteSize,
        bytesSent: byteSize,
      };
    }
  }

  public async broadcast(envelope: MeshEnvelope): Promise<TransportResult> {
    if (!this.isRunning) {
      return { success: false, transportId: 'ble', transportType: 'ble', error: 'BLE транспорт выключен' };
    }

    if (isEchoEnvelope(envelope, this.deviceId)) {
      return { success: false, transportId: 'ble', transportType: 'ble', error: 'Попытка отправки собственного эхо-пакета' };
    }

    if (this.peers.length === 0) {
      return this.send(envelope);
    }

    let successCount = 0;
    let totalBytes = 0;

    for (const peer of this.peers) {
      const res = await this.send(envelope, peer);
      if (res.success) {
        successCount++;
        totalBytes += res.bytesTransferred || 0;
      }
    }

    return {
      success: successCount > 0 || this.peers.length === 0,
      transportId: 'ble',
      transportType: 'ble',
      bytesTransferred: totalBytes,
      bytesSent: totalBytes,
    };
  }

  public onReceive(handler: (envelope: MeshEnvelope, senderInfo?: DiscoveredPeer) => void): void {
    this.receiveHandler = handler;
  }

  public onPeerDiscovered(handler: (peer: DiscoveredPeer) => void): void {
    this.peerDiscoveredHandler = handler;
  }

  public onPeerLost(handler: (peerId: string) => void): void {
    this.peerLostHandler = handler;
  }

  public getStatus(): TransportStatus {
    return {
      isRunning: this.isRunning,
      isAvailable: this.isRunning && (this.peers.length > 0 || !Capacitor?.isNativePlatform?.()),
      peersCount: this.peers.length,
    };
  }

  public getPeers(): DiscoveredPeer[] {
    return [...this.peers];
  }

  public stats(): TransportStats {
    return { ...this.statsData };
  }

  public getMetrics(): TransportMetrics {
    return {
      ...this.statsData,
      sendErrors: this.statsData.errorsCount,
      activePeers: this.peers.length,
    };
  }

  public async setPowerProfile(profile: 'high' | 'balanced' | 'low_power'): Promise<void> {
    const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform();
    if (isNative) {
      try {
        await GossipBle.setPowerProfile({ profile });
      } catch {}
    }
  }

  public isSeniorNode(remoteIdOrAddress: string): boolean {
    if (!remoteIdOrAddress) return true;
    const localRank = this.deviceIdHash || this.deviceId;
    const remoteRank = remoteIdOrAddress.toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 8);
    return localRank.localeCompare(remoteRank) > 0;
  }

  private handleNativePeersUpdated(rawPeers: any[]): void {
    const updatedPeers: DiscoveredPeer[] = [];
    const currentPeerIds = new Set<string>();

    for (const p of rawPeers) {
      const hash = p.deviceIdHash || deriveDeviceIdHashSync(p.deviceId || p.address || p.id);
      const peerId = p.id || `mesh-${hash}`;
      currentPeerIds.add(peerId);

      const peer: DiscoveredPeer = {
        id: peerId,
        deviceIdHash: hash,
        nodeId: p.nodeId,
        name: p.name,
        transportType: 'ble',
        address: p.address || `ble://${hash}`,
        rssi: p.rssi ?? -70,
        isRelay: Boolean(p.isRelay),
        prekeyBundle: p.prekeyBundle,
        lastSeen: p.lastSeen || Date.now(),
      };

      updatedPeers.push(peer);

      const existingIndex = this.peers.findIndex((ep) => ep.id === peerId);
      if (existingIndex < 0) {
        if (this.peerDiscoveredHandler) {
          this.peerDiscoveredHandler(peer);
        }
      }
    }

    for (const oldPeer of this.peers) {
      if (!currentPeerIds.has(oldPeer.id)) {
        if (this.peerLostHandler) {
          this.peerLostHandler(oldPeer.id);
        }
      }
    }

    this.peers = updatedPeers;
  }

  private handleNativeEnvelopeReceived(senderAddress: string, envelopeJson: string): void {
    try {
      const envelope: MeshEnvelope = JSON.parse(envelopeJson);
      this.statsData.packetsReceived++;
      this.statsData.bytesReceived += envelopeJson.length;
      this.statsData.lastActivity = Date.now();

      if (isEchoEnvelope(envelope, this.deviceId)) {
        return;
      }

      const senderPeer = this.peers.find((p) => p.address === senderAddress);
      if (this.receiveHandler) {
        this.receiveHandler(envelope, senderPeer);
      }
    } catch (e) {
      console.warn('[BleTransport] Ошибка парсинга входящего конверта:', e);
    }
  }

  private initWebRadioFallback(): void {
    if (typeof window === 'undefined' && typeof globalThis.BroadcastChannel === 'undefined') return;
    try {
      this.webBroadcastChannel = new BroadcastChannel('gossip_mesh_local_radio');
      this.webBroadcastChannel.onmessage = (event: any) => {
        const data = event.data;
        if (!data || data.type !== 'GOSSIP_BLE_ENVELOPE') return;
        if (data.senderDeviceId === this.deviceId) return;

        const envelope: MeshEnvelope = data.envelope;
        if (envelope && this.receiveHandler) {
          const mockSender: DiscoveredPeer = {
            id: `mesh-${data.senderDeviceIdHash || 'web'}`,
            deviceIdHash: data.senderDeviceIdHash || 'web',
            transportType: 'ble',
            address: 'web://local_radio',
            lastSeen: Date.now(),
          };
          this.receiveHandler(envelope, mockSender);
        }
      };
    } catch {}
  }
}