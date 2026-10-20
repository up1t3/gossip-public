// frontend/src/core/transport/bridge/community-bridge.ts
/**
 * Реализация Community Bridge (Ретранслятор «эфир -> облако»)
 * в рамках контракта MeshTransport (Вектор 2, Фаза T4, спецификация §6).
 * 
 * Ключевые архитектурные свойства:
 * 1. Однонаправленный аплинк (Uplink-Only): ретрансляция исключительно транзитных конвертов
 *    (`hopCount > 0`) и чужих пакетов (`senderDeviceId !== localDeviceId`).
 * 2. Opt-in по умолчанию: флаг `settings.transport_bridge_enabled` по умолчанию `false`.
 * 3. Строгая FIFO-очередь <= 100 конвертов с вытеснением старейших при переполнении.
 * 4. Политики энергосбережения (Battery & Network Policies):
 *    - `always`: релей всегда при наличии интернета.
 *    - `charging_only`: релей только при подключении к зарядному устройству.
 *    - `unmetered_charging`: релей только при зарядке и нелимитированном Wi-Fi/Ethernet.
 * 5. Серверный вызов существующего эндпоинта POST /api/v1/mesh/relay (бэкенд main.py:3445)
 *    с гарантией дедупликации через SeenPacketCache и Redis mesh:seen:{id}.
 */

import {
  MeshTransport,
  TransportType,
  MeshEnvelope,
  DiscoveredPeer,
  TransportResult,
  TransportStats,
  TransportMetrics,
  TransportStatus,
  SeenPacketCache,
  deriveDeviceIdHashSync,
} from '../transport';
import { RelayClient, MAX_PAYLOAD_SIZE_BYTES } from './relay-client';
import { BridgeQueue, MAX_BRIDGE_QUEUE_SIZE } from './bridge-queue';

export type BatteryPolicy = 'always' | 'charging_only' | 'unmetered_charging';

export interface CommunityBridgeOptions {
  deviceId?: string;
  nodeId?: string;
  relayClient?: RelayClient;
  maxQueueSize?: number;
  seenCache?: SeenPacketCache;
  isEnabled?: boolean;
  batteryPolicy?: BatteryPolicy;
  isCharging?: boolean;
  isUnmeteredWifi?: boolean;
}

export class CommunityBridge implements MeshTransport {
  public readonly id: TransportType = 'bridge';
  public readonly type: TransportType = 'bridge';
  public readonly priority: number = 20; // HTMA: LAN (100) > BLE (80/50) > LoRa (50/10) > Bridge (20)
  public readonly mtu: number = 1048576; // 1 MB полезной нагрузки

  public isAvailable: boolean = false;
  public isEnabled: boolean = false;
  public batteryPolicy: BatteryPolicy = 'charging_only';

  public isCharging: boolean = true;
  public isUnmeteredWifi: boolean = true;

  public readonly localDeviceId: string;
  public readonly localDeviceIdHash: string;
  public readonly localNodeId?: string;

  public readonly relayClient: RelayClient;
  public readonly bridgeQueue: BridgeQueue;
  public readonly seenCache: SeenPacketCache;

  public relayedEnvelopes: MeshEnvelope[] = [];

  private receiveHandlers: ((envelope: MeshEnvelope, senderInfo?: DiscoveredPeer) => void)[] = [];
  private peerDiscoveredHandlers: ((peer: DiscoveredPeer) => void)[] = [];
  private peerLostHandlers: ((peerId: string) => void)[] = [];

  private isFlushing: boolean = false;
  private batteryListenerCleanup?: () => void;

  public metrics: TransportMetrics = {
    bytesSent: 0,
    bytesReceived: 0,
    packetsSent: 0,
    packetsReceived: 0,
    errorsCount: 0,
    sendErrors: 0,
    activePeers: 0,
    packetsDropped: 0,
    lastActivity: 0,
  };

  /** Прямой доступ к массиву очереди для совместимости с тестами */
  public get queue(): MeshEnvelope[] {
    return this.bridgeQueue.getEnvelopes();
  }

  /** Максимальный размер очереди моста */
  public get maxQueueSize(): number {
    return this.bridgeQueue.getMetrics().maxSize;
  }

  constructor(options?: CommunityBridgeOptions | string) {
    this.syncSettingsWithStorage();

    if (typeof options === 'string') {
      this.localDeviceId = options;
      this.localNodeId = undefined;
    } else {
      this.localDeviceId = options?.deviceId || 'dev-community-bridge';
      this.localNodeId = options?.nodeId;
      if (typeof options?.isEnabled === 'boolean') {
        this.isEnabled = options.isEnabled;
      }
      if (options?.batteryPolicy) {
        this.batteryPolicy = options.batteryPolicy;
      }
      if (typeof options?.isCharging === 'boolean') {
        this.isCharging = options.isCharging;
      }
      if (typeof options?.isUnmeteredWifi === 'boolean') {
        this.isUnmeteredWifi = options.isUnmeteredWifi;
      }
    }

    this.localDeviceIdHash = deriveDeviceIdHashSync(this.localDeviceId);
    const maxQ = typeof options === 'object' && options?.maxQueueSize ? options.maxQueueSize : MAX_BRIDGE_QUEUE_SIZE;
    this.bridgeQueue = new BridgeQueue(maxQ);
    this.seenCache = (typeof options === 'object' && options?.seenCache) || new SeenPacketCache(4096);
    this.relayClient = (typeof options === 'object' && options?.relayClient) || new RelayClient();
  }

  /**
   * Синхронизация флагов моста с хранилищем настроек
   */
  public syncSettingsWithStorage(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('gossip_transport_settings');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed.transport_bridge_enabled === 'boolean') {
            this.isEnabled = parsed.transport_bridge_enabled;
          }
          if (parsed.transport_bridge_battery_policy) {
            this.batteryPolicy = parsed.transport_bridge_battery_policy;
          }
        }
      } catch {}
    }
  }

  /**
   * Проверка возможности выполнения ретрансляции в текущий момент
   * на основе флага включения, доступности сети и политики энергосбережения.
   */
  public canRelayNow(): boolean {
    if (!this.isEnabled || !this.isAvailable) {
      return false;
    }

    // Политика 'always': разрешено всегда при наличии сети
    if (this.batteryPolicy === 'always') {
      return true;
    }

    // Политика 'charging_only': только при подключении к зарядному устройству
    if (this.batteryPolicy === 'charging_only') {
      return Boolean(this.isCharging);
    }

    // Политика 'unmetered_charging': только при зарядке и безлимитной сети (Wi-Fi/Ethernet)
    if (this.batteryPolicy === 'unmetered_charging') {
      return Boolean(this.isCharging && this.isUnmeteredWifi);
    }

    return false;
  }

  /**
   * Проверка пригодности конверта для ретрансляции мостом:
   * 1. Мост должен быть включен (`isEnabled === true`).
   * 2. Конверт должен быть строго транзитным (`hopCount > 0`). Собственные пакеты (hopCount 0) не ретранслируются.
   * 3. Конверт должен быть от чужого устройства (`senderDeviceId !== localDeviceId`).
   * 4. Размер полезной нагрузки не должен превышать лимит (<= 512 КБ).
   * 5. Конверт не должен быть обработан ранее (SeenPacketCache).
   */
  public isEligibleForRelay(envelope: MeshEnvelope): boolean {
    if (!envelope || !envelope.id) {
      return false;
    }

    if (!this.isEnabled) {
      return false;
    }

    // Транзитный фильтр: только пакеты, прошедшие хотя бы один хоп
    if (typeof envelope.hopCount !== 'number' || envelope.hopCount <= 0) {
      return false;
    }

    // Фильтр собственных пакетов
    if (envelope.senderDeviceId && envelope.senderDeviceId === this.localDeviceId) {
      return false;
    }

    // Проверка размера полезной нагрузки
    if (!envelope.encryptedPayload || envelope.encryptedPayload.length > MAX_PAYLOAD_SIZE_BYTES) {
      return false;
    }

    // Проверка дедупликации
    if (this.seenCache.has(envelope.id)) {
      return false;
    }

    return true;
  }

  /**
   * Добавление транзитного конверта в очередь релея.
   * 
   * @param envelope Конверт для ретрансляции
   * @returns true, если конверт принят в очередь
   */
  public enqueueForRelay(envelope: MeshEnvelope): boolean {
    if (!this.isEnabled) {
      return false;
    }

    if (!this.isEligibleForRelay(envelope)) {
      return false;
    }

    const enqueued = this.bridgeQueue.enqueue(envelope);
    if (enqueued) {
      const qMetrics = this.bridgeQueue.getMetrics();
      this.metrics.packetsDropped = qMetrics.packetsDropped;

      // Если условия позволяют — инициируем сброс очереди
      if (this.canRelayNow()) {
        this.scheduleFlush();
      }
    }
    return enqueued;
  }

  /**
   * Сброс накопившейся очереди транзитных пакетов в облачный бэкенд
   * через эндпоинт POST /api/v1/mesh/relay.
   * 
   * @returns Количество успешно среляенных конвертов
   */
  public async flushRelayQueue(): Promise<number> {
    if (!this.canRelayNow() || this.bridgeQueue.isEmpty() || this.isFlushing) {
      return 0;
    }

    this.isFlushing = true;
    let totalFlushed = 0;

    try {
      while (!this.bridgeQueue.isEmpty() && this.canRelayNow()) {
        // Забираем пачку до 50 конвертов за один HTTP-запрос
        const batch = this.bridgeQueue.drain(50);
        if (batch.length === 0) break;

        const response = await this.relayClient.relayEnvelopes(batch, this.localNodeId || this.localDeviceId);

        if (response.success && response.relayed > 0) {
          totalFlushed += response.relayed;
          for (const env of batch) {
            this.seenCache.add(env.id);
            this.relayedEnvelopes.push(env);
            this.metrics.packetsSent++;
            this.metrics.bytesSent += env.encryptedPayload?.length || 0;
          }
          this.metrics.lastActivity = Date.now();
        } else {
          // При сетевом сбое или rate limit возвращаем неотправленные пакеты в очередь
          console.warn('[CommunityBridge] Сбой релея пакетов в облако:', response.error);
          this.metrics.sendErrors = (this.metrics.sendErrors || 0) + 1;
          this.metrics.errorsCount++;
          this.bridgeQueue.prepend(batch);
          break;
        }
      }
    } catch (e: any) {
      console.warn('[CommunityBridge] Исключение при сбросе очереди:', e);
      this.metrics.sendErrors = (this.metrics.sendErrors || 0) + 1;
      this.metrics.errorsCount++;
    } finally {
      this.isFlushing = false;
      const qMetrics = this.bridgeQueue.getMetrics();
      this.metrics.packetsDropped = qMetrics.packetsDropped;
    }

    return totalFlushed;
  }

  /**
   * Запуск транспорта моста и подключение системных слушателей батареи/сети
   */
  public async start(): Promise<void> {
    this.isAvailable = true;
    this.initPlatformSensors();

    if (this.canRelayNow() && !this.bridgeQueue.isEmpty()) {
      this.scheduleFlush();
    }
  }

  /**
   * Остановка транспорта моста
   */
  public async stop(): Promise<void> {
    this.isAvailable = false;
    this.bridgeQueue.clear();
    if (this.batteryListenerCleanup) {
      this.batteryListenerCleanup();
      this.batteryListenerCleanup = undefined;
    }
  }

  /**
   * Отправка конверта через мост в облако (интерфейс MeshTransport)
   */
  public async send(envelope: MeshEnvelope): Promise<TransportResult> {
    if (!this.canRelayNow()) {
      this.metrics.sendErrors = (this.metrics.sendErrors || 0) + 1;
      return {
        success: false,
        transportId: 'bridge',
        transportType: 'bridge',
        error: 'Relay policy blocked execution',
      };
    }

    // Если конверт не транзитный — мост отклоняет отправку
    if (!this.isEligibleForRelay(envelope)) {
      this.metrics.sendErrors = (this.metrics.sendErrors || 0) + 1;
      return {
        success: false,
        transportId: 'bridge',
        transportType: 'bridge',
        error: 'Envelope is not eligible for community relay (must be transit packet with hopCount > 0)',
      };
    }

    this.enqueueForRelay(envelope);
    const flushed = await this.flushRelayQueue();

    if (flushed > 0) {
      return {
        success: true,
        transportId: 'bridge',
        transportType: 'bridge',
        bytesSent: envelope.encryptedPayload?.length || 0,
        bytesTransferred: envelope.encryptedPayload?.length || 0,
      };
    }

    return {
      success: false,
      transportId: 'bridge',
      transportType: 'bridge',
      error: 'Failed to relay envelope to cloud endpoint',
    };
  }

  /**
   * Широковещательная отправка (в случае моста идентична send)
   */
  public async broadcast(envelope: MeshEnvelope): Promise<TransportResult> {
    return this.send(envelope);
  }

  /**
   * Обнаружение пиров (мост не имеет прямого радиососедства)
   */
  public discover(_onPeer: (peer: DiscoveredPeer) => void): void {
    // Community Bridge является виртуальным аплинк-транспортом
  }

  /**
   * Подписка на входящие пакеты
   */
  public onReceive(handler: (envelope: MeshEnvelope, senderInfo?: DiscoveredPeer) => void): void {
    this.receiveHandlers.push(handler);
  }

  public onPeerDiscovered(handler: (peer: DiscoveredPeer) => void): void {
    this.peerDiscoveredHandlers.push(handler);
  }

  public onPeerLost(handler: (peerId: string) => void): void {
    this.peerLostHandlers.push(handler);
  }

  /**
   * Получение статуса состояния моста
   */
  public getStatus(): TransportStatus {
    return {
      isRunning: this.isAvailable,
      isAvailable: this.isAvailable && this.isEnabled,
      activeConnectionsCount: this.canRelayNow() ? 1 : 0,
      peersCount: 0,
    };
  }

  /**
   * Получение списка пиров (пустой для моста)
   */
  public getPeers(): DiscoveredPeer[] {
    return [];
  }

  /**
   * Статистика работы моста
   */
  public stats(): TransportStats {
    const qMetrics = this.bridgeQueue.getMetrics();
    return {
      ...this.metrics,
      packetsDropped: qMetrics.packetsDropped,
      activePeers: 0,
    };
  }

  public getMetrics(): TransportMetrics {
    return this.stats();
  }

  /**
   * Обработка входящего транзитного конверта от TransportManager / других транспортов
   */
  public handleTransitEnvelope(envelope: MeshEnvelope, _senderInfo?: DiscoveredPeer): boolean {
    if (!this.isEnabled || !this.isAvailable) {
      return false;
    }

    if (this.isEligibleForRelay(envelope)) {
      return this.enqueueForRelay(envelope);
    }

    return false;
  }

  private flushTimeout: any = null;
  private scheduleFlush(): void {
    if (this.flushTimeout) return;
    this.flushTimeout = setTimeout(() => {
      this.flushTimeout = null;
      this.flushRelayQueue().catch((e) => {
        console.warn('[CommunityBridge] Ошибка фонового сброса очереди:', e);
      });
    }, 50);
  }

  /**
   * Инициализация подписок на состояние батареи и сети
   */
  private initPlatformSensors(): void {
    if (typeof navigator === 'undefined') return;

    // 1. Датчик батареи (Battery Status API)
    if ('getBattery' in navigator && typeof (navigator as any).getBattery === 'function') {
      (navigator as any).getBattery().then((battery: any) => {
        if (!battery) return;
        this.isCharging = Boolean(battery.charging);

        const onChargingChange = () => {
          this.isCharging = Boolean(battery.charging);
          if (this.canRelayNow() && !this.bridgeQueue.isEmpty()) {
            this.scheduleFlush();
          }
        };

        battery.addEventListener('chargingchange', onChargingChange);
        this.batteryListenerCleanup = () => {
          battery.removeEventListener('chargingchange', onChargingChange);
        };
      }).catch(() => {});
    }

    // 2. Датчик сетевого подключения (Network Information API)
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn) {
        const updateNetworkInfo = () => {
          const type = conn.type;
          const saveData = Boolean(conn.saveData);
          // Wi-Fi или Ethernet без режима экономии трафика
          this.isUnmeteredWifi = (type === 'wifi' || type === 'ethernet' || !type) && !saveData;
          if (this.canRelayNow() && !this.bridgeQueue.isEmpty()) {
            this.scheduleFlush();
          }
        };

        updateNetworkInfo();
        conn.addEventListener('change', updateNetworkInfo);
      }
    }
  }
}
