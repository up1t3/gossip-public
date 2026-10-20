// frontend/src/core/transport/lan/lan-server.ts
/**
 * Встроенный WebSocket-сервер для прямого приёма mesh-конвертов в LAN (Фаза T1).
 * Поддерживает:
 * - Выбор свободного порта из диапазона 46000–46100 (автоматический retry при коллизиях).
 * - Лимит до 8 одновременных сокетов.
 * - Handshake PEER_INFO с обменом prekey bundle.
 * - Приём сообщений MeshEnvelope с проверкой Echo-Filter и SeenPacketCache.
 * - Отправку подтверждений ACK.
 * - Надежное динамическое разрешение модуля ws (Node ESM / Vitest / Electron / Browser).
 * - Синхронизированный реестр virtualServerRegistry для fallback и сред без нативных сокетов.
 */

import {
  MeshEnvelope,
  DiscoveredPeer,
  SeenPacketCache,
  isEchoEnvelope,
  getPeerAlias,
} from '../transport';

export interface LanServerConfig {
  localDeviceId: string;
  localDeviceIdHash: string;
  localNodeId?: string;
  localAlias?: string;
  portRangeStart?: number;
  portRangeEnd?: number;
  maxConcurrentSockets?: number;
  inactiveTimeoutMs?: number;
}

export type EnvelopeReceiveHandler = (envelope: MeshEnvelope, senderInfo?: DiscoveredPeer) => void;
export type PeerConnectHandler = (peer: DiscoveredPeer) => void;
export type PeerDisconnectHandler = (peerId: string) => void;

interface PeerSession {
  socketId: string;
  peer?: DiscoveredPeer;
  lastActivity: number;
  close: () => void;
  send: (data: string) => void;
}

/**
 * Глобальный реестр активных виртуальных/локальных серверов для бесшовной связи
 * в средах без прямого TCP-биндинга или при loopback-соединениях.
 */
export const virtualServerRegistry = new Map<number, LanServer>();

let cachedWsModule: any = undefined;

/**
 * Надежное динамическое разрешение модуля 'ws' в различных средах (Node ESM, Vitest, Electron, Browser).
 */
export async function resolveWsModule(): Promise<any> {
  if (cachedWsModule !== undefined) {
    return cachedWsModule;
  }

  // 1. Попытка нативного динамического импорта
  try {
    const specifier = 'ws';
    const mod = await import(/* @vite-ignore */ specifier);
    if (mod && (mod.WebSocketServer || mod.Server || mod.default)) {
      cachedWsModule = mod;
      return mod;
    }
  } catch {}

  // 2. Попытка через стандартный require (CJS / Electron)
  try {
    if (typeof require !== 'undefined') {
      const mod = require('ws');
      if (mod) {
        cachedWsModule = mod;
        return mod;
      }
    }
  } catch {}

  // 3. Динамический createRequire для Node ESM / Vitest
  try {
    const moduleSpecifier = 'module';
    const modModule = await import(/* @vite-ignore */ moduleSpecifier);
    const createRequireFn =
      modModule?.createRequire ||
      (typeof require !== 'undefined' ? require('module')?.createRequire : null);

    if (typeof createRequireFn === 'function') {
      const candidatePaths = [
        typeof process !== 'undefined' && process.cwd ? `${process.cwd()}/package.json` : '',
        typeof process !== 'undefined' && process.cwd ? `${process.cwd()}/tests/e2e/package.json` : '',
        typeof process !== 'undefined' && process.cwd ? `${process.cwd()}/frontend/package.json` : '',
      ].filter(Boolean);

      for (const p of candidatePaths) {
        try {
          const req = createRequireFn(p);
          const mod = req('ws');
          if (mod) {
            cachedWsModule = mod;
            return mod;
          }
        } catch {}
      }
    }
  } catch {}

  cachedWsModule = null;
  return null;
}

export class LanServer {
  public static readonly DEFAULT_PORT_START = 46000;
  public static readonly DEFAULT_PORT_END = 46100;
  public static readonly MAX_SOCKETS = 8;
  public static readonly INACTIVE_TIMEOUT_MS = 60000;

  private readonly config: Required<LanServerConfig>;
  private isRunning = false;
  private boundPort: number = 0;
  private readonly activeSessions = new Map<string, PeerSession>();
  private readonly seenPacketCache: SeenPacketCache;

  private receiveHandler: EnvelopeReceiveHandler | null = null;
  private connectHandler: PeerConnectHandler | null = null;
  private disconnectHandler: PeerDisconnectHandler | null = null;

  private underlyingServer: any = null;
  private cleanupTimer: any = null;

  constructor(config: LanServerConfig, seenPacketCache?: SeenPacketCache) {
    this.config = {
      localDeviceId: config.localDeviceId,
      localDeviceIdHash: config.localDeviceIdHash,
      localNodeId: config.localNodeId || '',
      localAlias: config.localAlias || getPeerAlias(config.localDeviceIdHash),
      portRangeStart: config.portRangeStart ?? LanServer.DEFAULT_PORT_START,
      portRangeEnd: config.portRangeEnd ?? LanServer.DEFAULT_PORT_END,
      maxConcurrentSockets: config.maxConcurrentSockets ?? LanServer.MAX_SOCKETS,
      inactiveTimeoutMs: config.inactiveTimeoutMs ?? LanServer.INACTIVE_TIMEOUT_MS,
    };
    this.seenPacketCache = seenPacketCache || new SeenPacketCache();
  }

  /**
   * Запуск сервера с подбором свободного порта из диапазона 46000–46100.
   */
  public async start(): Promise<number> {
    if (this.isRunning) return this.boundPort;

    const startPort = this.config.portRangeStart;
    const endPort = this.config.portRangeEnd;
    const totalPorts = endPort - startPort + 1;
    const randomOffset = Math.floor(Math.random() * totalPorts);

    let selectedPort = 0;
    let bound = false;

    for (let i = 0; i < totalPorts; i++) {
      const candidatePort = startPort + ((randomOffset + i) % totalPorts);
      try {
        await this.bindPort(candidatePort);
        selectedPort = candidatePort;
        bound = true;
        break;
      } catch (err) {
        // Порт занят или не удалось привязать, пробуем следующий
      }
    }

    if (!bound) {
      selectedPort = startPort + randomOffset;
      this.bindVirtualServer(selectedPort);
    }

    this.boundPort = selectedPort;
    this.isRunning = true;

    this.cleanupTimer = setInterval(() => {
      this.pruneInactiveSessions();
    }, 15000);

    return this.boundPort;
  }

  /** Остановка сервера и закрытие всех сокетов */
  public async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    for (const session of this.activeSessions.values()) {
      try {
        session.close();
      } catch {}
    }
    this.activeSessions.clear();

    if (this.boundPort && virtualServerRegistry.get(this.boundPort) === this) {
      virtualServerRegistry.delete(this.boundPort);
    }

    if (this.underlyingServer) {
      try {
        if (typeof this.underlyingServer.close === 'function') {
          await new Promise<void>((resolve) => {
            try {
              this.underlyingServer.close(() => resolve());
              setTimeout(resolve, 50);
            } catch {
              resolve();
            }
          });
        }
      } catch {}
      this.underlyingServer = null;
    }

    this.boundPort = 0;
  }

  public getPort(): number {
    return this.boundPort;
  }

  public getActiveConnectionsCount(): number {
    return this.activeSessions.size;
  }

  public onReceive(handler: EnvelopeReceiveHandler): void {
    this.receiveHandler = handler;
  }

  public onPeerConnected(handler: PeerConnectHandler): void {
    this.connectHandler = handler;
  }

  public onPeerDisconnected(handler: PeerDisconnectHandler): void {
    this.disconnectHandler = handler;
  }

  // -------------------------------------------------------------------------
  // Обработка сообщений и протокола
  // -------------------------------------------------------------------------

  public handleIncomingMessage(socketId: string, rawData: string): void {
    if (!this.isRunning) return;

    const session = this.activeSessions.get(socketId);
    if (!session) return;
    session.lastActivity = Date.now();

    try {
      const msg = JSON.parse(rawData);
      if (!msg || typeof msg !== 'object') return;

      switch (msg.type) {
        case 'PEER_INFO':
          this.handlePeerInfo(session, msg);
          break;
        case 'ENVELOPE':
          this.handleEnvelope(session, msg.envelope);
          break;
        case 'PING':
          session.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
          break;
        default:
          break;
      }
    } catch (e) {
      console.warn('[LanServer] Ошибка разбора сообщения:', e);
    }
  }

  private handlePeerInfo(session: PeerSession, msg: any): void {
    const didHash = msg.didHash || msg.did;
    if (!didHash) return;

    if (didHash === this.config.localDeviceIdHash) {
      session.close();
      return;
    }

    const peerId = `lan://${msg.host || 'remote'}:${msg.port || 0}`;
    const peer: DiscoveredPeer = {
      id: peerId,
      deviceIdHash: didHash,
      nodeId: msg.id || msg.nodeId,
      name: msg.alias || getPeerAlias(didHash),
      transportType: 'lan',
      address: peerId,
      host: msg.host,
      port: msg.port,
      isRelay: Boolean(msg.isRelay),
      prekeyBundle: msg.prekeyBundle,
      lastSeen: Date.now(),
    };

    session.peer = peer;

    session.send(
      JSON.stringify({
        type: 'PEER_INFO',
        id: this.config.localNodeId,
        did: this.config.localDeviceId,
        didHash: this.config.localDeviceIdHash,
        alias: this.config.localAlias,
        isRelay: false,
      })
    );

    if (this.connectHandler) {
      try {
        this.connectHandler(peer);
      } catch {}
    }
  }

  private handleEnvelope(session: PeerSession, envelope: MeshEnvelope): void {
    if (!envelope || !envelope.id || !envelope.encryptedPayload) return;

    if (isEchoEnvelope(envelope, this.config.localDeviceId)) {
      return;
    }

    if (this.seenPacketCache.has(envelope.id)) {
      session.send(JSON.stringify({ type: 'ACK', envelopeId: envelope.id }));
      return;
    }

    this.seenPacketCache.add(envelope.id);

    session.send(JSON.stringify({ type: 'ACK', envelopeId: envelope.id }));

    if (this.receiveHandler) {
      try {
        this.receiveHandler(envelope, session.peer);
      } catch (e) {
        console.error('[LanServer] Ошибка в receiveHandler:', e);
      }
    }
  }

  public registerConnection(socketId: string, sendFn: (data: string) => void, closeFn: () => void): boolean {
    if (!this.isRunning) return false;

    if (this.activeSessions.size >= this.config.maxConcurrentSockets) {
      closeFn();
      return false;
    }

    const session: PeerSession = {
      socketId,
      lastActivity: Date.now(),
      close: closeFn,
      send: sendFn,
    };

    this.activeSessions.set(socketId, session);
    return true;
  }

  public unregisterConnection(socketId: string): void {
    const session = this.activeSessions.get(socketId);
    if (session) {
      this.activeSessions.delete(socketId);
      if (session.peer && this.disconnectHandler) {
        try {
          this.disconnectHandler(session.peer.id);
        } catch {}
      }
    }
  }

  private pruneInactiveSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.activeSessions.entries()) {
      if (now - session.lastActivity > this.config.inactiveTimeoutMs) {
        try {
          session.close();
        } catch {}
        this.activeSessions.delete(id);
      }
    }
  }

  private async bindPort(port: number): Promise<void> {
    const ws = await resolveWsModule();
    if (ws) {
      const ServerClass =
        ws.WebSocketServer ||
        ws.Server ||
        ws.default?.WebSocketServer ||
        ws.default?.Server;
      if (ServerClass) {
        return new Promise<void>((resolve, reject) => {
          try {
            const server = new ServerClass({ port, host: '127.0.0.1' }, () => {
              this.underlyingServer = server;
              this.setupNodeWsServer(server);
              virtualServerRegistry.set(port, this);
              resolve();
            });
            server.on('error', (err: any) => {
              reject(err);
            });
          } catch (err) {
            reject(err);
          }
        });
      }
    }
    this.bindVirtualServer(port);
  }

  private setupNodeWsServer(server: any): void {
    let socketSeq = 0;
    server.on('connection', (ws: any) => {
      const socketId = `sock_${++socketSeq}`;
      const accepted = this.registerConnection(
        socketId,
        (data) => {
          try {
            if (ws.readyState === 1 || ws.readyState === ws.OPEN || typeof ws.readyState === 'undefined') {
              ws.send(typeof data === 'string' ? data : JSON.stringify(data));
            }
          } catch (e) {
            console.warn('[LanServer] Ошибка отправки в ws сокет:', e);
          }
        },
        () => {
          try {
            ws.close();
          } catch {}
        }
      );

      if (!accepted) return;

      ws.on('message', (data: any) => {
        try {
          const raw = typeof data === 'string' ? data : (data && typeof data.toString === 'function' ? data.toString('utf8') : '');
          this.handleIncomingMessage(socketId, raw);
        } catch (e) {
          console.warn('[LanServer] Ошибка обработки входящего сообщения:', e);
        }
      });

      ws.on('close', () => {
        this.unregisterConnection(socketId);
      });

      ws.on('error', () => {
        this.unregisterConnection(socketId);
      });
    });
  }

  private bindVirtualServer(port: number): void {
    this.underlyingServer = {
      virtual: true,
      port,
      close: () => {},
    };
    virtualServerRegistry.set(port, this);
  }
}