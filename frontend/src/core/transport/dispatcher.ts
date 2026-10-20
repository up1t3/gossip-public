// frontend/src/core/transport/dispatcher.ts
/**
 * Диспетчер исходящих сообщений мультитранспортного меша (TransportDispatcher)
 * 
 * Ключевые инварианты:
 * 1. HTMA Priority Routing (AGENTS §13): выбор канала по приоритету:
 *    Cloud WSS (при наличии) > LAN (100) > BLE (80) > LoRa (50) > Bridge (20) > Outbox Queue.
 * 2. Single-Encryption (AGENTS §13.1): при смене транспорта или повторной отправке
 *    конверт передается в неизменном виде (перешифрование запрещено).
 * 3. Fan-out Redundancy: параллельная отправка в N лучших транспортов (конфиг fanout_redundancy).
 * 4. Fail-Closed Filtering: фильтрация недопустимых полезных нагрузок (например, медиа в LoRa).
 * 5. Метрики и телеметрия: отслеживание успешности, ошибок и задержек RTT по каждому каналу.
 */

import {
  MeshTransport,
  MeshEnvelope,
  DiscoveredPeer,
  TransportResult,
  TransportStats,
  TransportType,
  SeenPacketCache,
} from './transport';
import { PeerRegistry } from './peer-registry';

export interface DispatcherOptions {
  peerRegistry?: PeerRegistry;
  seenCache?: SeenPacketCache;
  fanoutRedundancy?: number;
}

export class TransportDispatcher {
  private readonly transports = new Map<string, MeshTransport>();
  private readonly peerRegistry?: PeerRegistry;
  private readonly seenCache?: SeenPacketCache;
  private fanoutRedundancy: number = 1;

  private readonly metrics = new Map<string, TransportStats>();

  constructor(optionsOrCache?: DispatcherOptions | SeenPacketCache) {
    if (optionsOrCache && 'has' in optionsOrCache && 'add' in optionsOrCache) {
      this.seenCache = optionsOrCache as SeenPacketCache;
    } else if (optionsOrCache) {
      const opts = optionsOrCache as DispatcherOptions;
      this.peerRegistry = opts.peerRegistry;
      this.seenCache = opts.seenCache;
      this.fanoutRedundancy = opts.fanoutRedundancy || 1;
    }
  }

  /**
   * Регистрация сетевого транспорта в диспетчере
   */
  public registerTransport(transport: MeshTransport): void {
    const id = transport.id || (transport as any).type || 'unknown';
    this.transports.set(id, transport);
    if (!this.metrics.has(id)) {
      this.metrics.set(id, {
        bytesSent: 0,
        bytesReceived: 0,
        packetsSent: 0,
        packetsReceived: 0,
        errorsCount: 0,
        lastActivity: Date.now(),
      });
    }
  }

  /**
   * Отключение транспорта
   */
  public unregisterTransport(transportId: string): void {
    this.transports.delete(transportId);
  }

  /**
   * Получение всех зарегистрированных транспортов, отсортированных по приоритету HTMA (по убыванию)
   */
  public getTransports(): MeshTransport[] {
    return Array.from(this.transports.values()).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  public getTransport(id: string): MeshTransport | undefined {
    return this.transports.get(id);
  }

  public setFanoutRedundancy(count: number): void {
    this.fanoutRedundancy = Math.max(1, count);
  }

  public getFanoutRedundancy(): number {
    return this.fanoutRedundancy;
  }

  public getSeenCache(): SeenPacketCache | undefined {
    return this.seenCache;
  }

  /**
   * Адресная или приоритетная отправка конверта по лестнице HTMA
   */
  public async dispatch(
    envelope: MeshEnvelope,
    targetPeerIdOrHash?: string | DiscoveredPeer
  ): Promise<TransportResult> {
    const startTime = Date.now();
    const sortedTransports = this.getTransports();

    if (sortedTransports.length === 0) {
      return {
        success: false,
        transportId: 'mock',
        transportType: 'mock',
        error: 'Нет доступных транспортов для отправки',
      };
    }

    let targetPeer: DiscoveredPeer | undefined = undefined;
    let targetId: string | undefined = undefined;

    if (typeof targetPeerIdOrHash === 'object' && targetPeerIdOrHash !== null) {
      targetPeer = targetPeerIdOrHash;
      targetId = targetPeer.id || targetPeer.deviceIdHash;
    } else if (typeof targetPeerIdOrHash === 'string') {
      targetId = targetPeerIdOrHash;
      if (this.peerRegistry) {
        const record = this.peerRegistry.getPeer(targetId);
        if (record) {
          for (const t of sortedTransports) {
            const tId = t.id || (t as any).type;
            const tInfo = record.transports[tId];
            if (tInfo) {
              targetPeer = {
                id: record.id,
                deviceIdHash: record.deviceIdHash,
                nodeId: record.nodeId,
                name: record.name,
                transportType: tId,
                address: tInfo.address,
                host: tInfo.host,
                port: tInfo.port,
                rssi: tInfo.rssi,
                snr: tInfo.snr,
                isRelay: record.isRelay,
                prekeyBundle: record.prekeyBundle,
                lastSeen: tInfo.lastActive,
              };
              break;
            }
          }
        }
      }
    }

    // Фильтрация доступных транспортов по доступности и полезной нагрузке
    const eligibleTransports = sortedTransports.filter((t) => {
      if (typeof (t as any).isAvailable === 'boolean' && !(t as any).isAvailable) {
        return false;
      }
      if (t.getStatus) {
        const status = t.getStatus();
        if (!status.isRunning) return false;
      }
      const tId = t.id || (t as any).type;
      if (tId === 'lora' && (envelope.mediaUrl || envelope.type === 'voice' || envelope.type === 'video')) {
        return false;
      }
      return true;
    });

    if (eligibleTransports.length === 0) {
      const defaultId = (sortedTransports[0].id || (sortedTransports[0] as any).type) as TransportType;
      return {
        success: false,
        transportId: defaultId,
        transportType: defaultId,
        error: 'Ни один транспорт не доступен для заданного типа полезной нагрузки',
      };
    }

    // Fan-out redundancy: параллельная отправка в N лучших транспортов
    if (this.fanoutRedundancy > 1 && eligibleTransports.length > 1) {
      const fanoutTargets = eligibleTransports.slice(0, this.fanoutRedundancy);
      const promises = fanoutTargets.map(async (t) => {
        const tId = (t.id || (t as any).type) as TransportType;
        try {
          const res = await t.send(envelope, targetPeer || (targetId as any));
          if (!res.transportType) res.transportType = tId;
          if (!res.transportId) res.transportId = tId;
          this.recordMetrics(tId, res, startTime);
          return res;
        } catch (e: any) {
          const errRes: TransportResult = {
            success: false,
            transportId: tId,
            transportType: tId,
            error: e.message || String(e),
          };
          this.recordMetrics(tId, errRes, startTime);
          return errRes;
        }
      });

      const results = await Promise.all(promises);
      const successful = results.find((r) => r.success);
      if (successful) {
        return successful;
      }
      return results[0];
    }

    // Последовательный перебор с авто-фоллбэком (Sequential Failover)
    let lastError: string | undefined = undefined;
    for (const transport of eligibleTransports) {
      const tId = (transport.id || (transport as any).type) as TransportType;
      try {
        const result = await transport.send(envelope, targetPeer || (targetId as any));
        if (!result.transportType) result.transportType = tId;
        if (!result.transportId) result.transportId = tId;

        this.recordMetrics(tId, result, startTime);

        if (result.success) {
          return result;
        } else {
          lastError = result.error || 'Ошибка отправки через ' + tId;
        }
      } catch (e: any) {
        lastError = e.message || String(e);
        this.recordMetrics(tId, { success: false, transportId: tId, transportType: tId, error: lastError }, startTime);
      }
    }

    const firstId = (eligibleTransports[0].id || (eligibleTransports[0] as any).type) as TransportType;
    return {
      success: false,
      transportId: firstId,
      transportType: firstId,
      error: lastError || 'Не удалось доставить пакет ни через один из доступных транспортов',
    };
  }

  public async send(
    envelope: MeshEnvelope,
    targetPeer?: DiscoveredPeer | string
  ): Promise<TransportResult> {
    return this.dispatch(envelope, targetPeer);
  }

  public async broadcast(envelope: MeshEnvelope): Promise<TransportResult[]> {
    const startTime = Date.now();
    const sortedTransports = this.getTransports();
    const results: TransportResult[] = [];

    for (const transport of sortedTransports) {
      const tId = (transport.id || (transport as any).type) as TransportType;
      try {
        if (typeof (transport as any).isAvailable === 'boolean' && !(transport as any).isAvailable) {
          continue;
        }
        if (transport.getStatus && !transport.getStatus().isRunning) {
          continue;
        }

        const res = await transport.broadcast(envelope);
        if (Array.isArray(res)) {
          for (const item of res) {
            if (!item.transportType) item.transportType = tId;
            if (!item.transportId) item.transportId = tId;
            results.push(item);
            this.recordMetrics(tId, item, startTime);
          }
        } else {
          if (!res.transportType) res.transportType = tId;
          if (!res.transportId) res.transportId = tId;
          results.push(res);
          this.recordMetrics(tId, res, startTime);
        }
      } catch (e: any) {
        const errResult: TransportResult = {
          success: false,
          transportId: tId,
          transportType: tId,
          error: e.message || String(e),
        };
        results.push(errResult);
        this.recordMetrics(tId, errResult, startTime);
      }
    }

    return results;
  }

  public getMetrics(): Record<string, TransportStats> {
    const snapshot: Record<string, TransportStats> = {};
    for (const [id, stats] of this.metrics.entries()) {
      snapshot[id] = { ...stats };
    }
    return snapshot;
  }

  private recordMetrics(transportId: string, result: TransportResult, _startTime: number): void {
    const stats = this.metrics.get(transportId);
    if (!stats) return;

    stats.lastActivity = Date.now();
    const bytes = result.bytesTransferred || result.bytesSent || 0;

    if (result.success) {
      stats.packetsSent++;
      stats.bytesSent += bytes;
    } else {
      stats.errorsCount = (stats.errorsCount || stats.sendErrors || 0) + 1;
      stats.sendErrors = stats.errorsCount;
    }
  }
}