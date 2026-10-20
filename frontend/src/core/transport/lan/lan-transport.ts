// frontend/src/core/transport/lan/lan-transport.ts
/**
 * Реализация LAN-транспорта (Wi-Fi / Direct WSS) в рамках контракта MeshTransport.
 * Приоритет HTMA: 2 (LAN > BLE > LoRa).
 * MTU: 1048576 байт (1 МБ).
 * Фаза T1: Изолированный обмен сообщениями в локальной сети без интернета.
 */

import {
  MeshTransport,
  TransportType,
  MeshEnvelope,
  DiscoveredPeer,
  TransportResult,
  TransportStats,
  TransportStatus,
  SeenPacketCache,
  deriveDeviceIdHashSync,
  deriveDeviceIdHash,
  isEchoEnvelope,
} from '../transport';
import { LanDiscovery } from './lan-discovery';
import { LanServer } from './lan-server';
import { LanClient } from './lan-client';
import { LanMediaManager } from './lan-media';

export interface LANTransportOptions {
  deviceId: string;
  nodeId?: string;
  alias?: string;
  portRangeStart?: number;
  portRangeEnd?: number;
}

export class LANTransport implements MeshTransport {
  public readonly id: TransportType = 'lan';
  public readonly mtu: number = 1048576; // 1 MB для LAN
  public readonly priority: number = 2; // LAN > BLE (1) > LoRa (0)

  private readonly deviceId: string;
  private deviceIdHash: string;
  private readonly nodeId: string;
  private readonly alias?: string;

  private readonly discovery: LanDiscovery;
  private readonly server: LanServer;
  private readonly client: LanClient;
  public readonly media: LanMediaManager;
  private readonly seenPacketCache: SeenPacketCache;

  private isRunning = false;
  private receiveHandler: ((envelope: MeshEnvelope, senderInfo?: DiscoveredPeer) => void) | null = null;
  private peerDiscoveredHandler: ((peer: DiscoveredPeer) => void) | null = null;
  private peerLostHandler: ((peerId: string) => void) | null = null;

  private readonly statsData: TransportStats = {
    bytesSent: 0,
    bytesReceived: 0,
    packetsSent: 0,
    packetsReceived: 0,
    errorsCount: 0,
    lastActivity: Date.now(),
    signalMetric: -40, // LAN по умолчанию -40 dBm (отличный линк)
  };

  constructor(options: LANTransportOptions) {
    this.deviceId = options.deviceId;
    this.deviceIdHash = deriveDeviceIdHashSync(options.deviceId);
    this.nodeId = options.nodeId || '';
    this.alias = options.alias;

    this.seenPacketCache = new SeenPacketCache();

    this.discovery = new LanDiscovery({
      deviceId: this.deviceId,
      deviceIdHash: this.deviceIdHash,
      port: options.portRangeStart || LanServer.DEFAULT_PORT_START,
    });

    this.server = new LanServer(
      {
        localDeviceId: this.deviceId,
        localDeviceIdHash: this.deviceIdHash,
        localNodeId: this.nodeId,
        localAlias: this.alias,
        portRangeStart: options.portRangeStart,
        portRangeEnd: options.portRangeEnd,
      },
      this.seenPacketCache
    );

    this.client = new LanClient({
      localDeviceId: this.deviceId,
      localDeviceIdHash: this.deviceIdHash,
      localNodeId: this.nodeId,
      localAlias: this.alias,
    });

    this.media = new LanMediaManager();

    this.bindEvents();
  }

  /**
   * Запуск LAN транспорта: сервер слушает порт 46000-46100, discovery объявляет сервис
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;

    if (!this.deviceIdHash || this.deviceIdHash === '00000000') {
      this.deviceIdHash = await deriveDeviceIdHash(this.deviceId);
    }

    // 1. Запуск WebSocket сервера
    const boundPort = await this.server.start();

    // 2. Запуск discovery с реальным портом
    this.discovery.updatePort(boundPort);
    await this.discovery.start();

    // 3. Запуск клиента
    await this.client.start();

    this.isRunning = true;
    this.statsData.lastActivity = Date.now();
  }

  /**
   * Остановка LAN транспорта и соблюдение Zero-Phantom инварианта
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;

    await this.discovery.stop();
    await this.client.stop();
    await this.server.stop();

    this.statsData.lastActivity = Date.now();
  }

  public discover(onPeer: (peer: DiscoveredPeer) => void): void {
    this.discovery.onPeerDiscovered(onPeer);
  }

  /**
   * Адресная отправка конверта
   */
  public async send(envelope: MeshEnvelope, targetPeer?: DiscoveredPeer): Promise<TransportResult> {
    if (!this.isRunning) {
      return { success: false, transportId: 'lan', error: 'LAN транспорт выключен' };
    }

    // Инвариант Echo-Filter
    if (isEchoEnvelope(envelope, this.deviceId)) {
      return { success: false, transportId: 'lan', error: 'Попытка отправки собственного эхо-пакета' };
    }

    let peer = targetPeer;
    if (!peer) {
      const peers = this.discovery.getPeers();
      peer = peers.find((p) => p.nodeId === envelope.recipientTag || p.deviceIdHash === envelope.recipientTag) || peers[0];
    }

    if (!peer) {
      return { success: false, transportId: 'lan', error: 'Пир не найден в локальной сети' };
    }

    const result = await this.client.sendEnvelope(peer, envelope);

    if (result.success) {
      this.statsData.packetsSent++;
      this.statsData.bytesSent += result.bytesTransferred || 0;
      this.statsData.lastActivity = Date.now();
    } else {
      this.statsData.errorsCount++;
    }

    return result;
  }

  /**
   * Широковещательная отправка конверта всем соседям в LAN
   */
  public async broadcast(envelope: MeshEnvelope): Promise<TransportResult> {
    if (!this.isRunning) {
      return { success: false, transportId: 'lan', error: 'LAN транспорт выключен' };
    }

    if (isEchoEnvelope(envelope, this.deviceId)) {
      return { success: false, transportId: 'lan', error: 'Попытка отправки собственного эхо-пакета' };
    }

    const peers = this.discovery.getPeers();
    if (!peers.length) {
      return { success: false, transportId: 'lan', error: 'Нет активных LAN соседей' };
    }

    const result = await this.client.broadcastEnvelope(peers, envelope);

    if (result.success) {
      this.statsData.packetsSent += peers.length;
      this.statsData.bytesSent += result.bytesTransferred || 0;
      this.statsData.lastActivity = Date.now();
    } else {
      this.statsData.errorsCount++;
    }

    return result;
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
    const peers = this.discovery.getPeers();
    return {
      isRunning: this.isRunning,
      isAvailable: this.isRunning && peers.length > 0,
      boundPort: this.server.getPort(),
      activeConnectionsCount: this.server.getActiveConnectionsCount(),
      peersCount: peers.length,
    };
  }

  public getPeers(): DiscoveredPeer[] {
    return this.discovery.getPeers();
  }

  public stats(): TransportStats {
    return { ...this.statsData };
  }

  public getMetrics(): TransportStats {
    return this.stats();
  }

  private bindEvents(): void {
    this.server.onReceive((envelope, peer) => {
      this.statsData.packetsReceived++;
      this.statsData.bytesReceived += JSON.stringify(envelope).length;
      this.statsData.lastActivity = Date.now();

      if (this.receiveHandler) {
        this.receiveHandler(envelope, peer);
      }
    });

    this.discovery.onPeerDiscovered((peer) => {
      if (this.peerDiscoveredHandler) {
        this.peerDiscoveredHandler(peer);
      }
    });

    this.discovery.onPeerLost((peerId) => {
      this.client.disconnect(peerId);
      if (this.peerLostHandler) {
        this.peerLostHandler(peerId);
      }
    });
  }
}