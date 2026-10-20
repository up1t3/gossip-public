// frontend/src/core/transport/lan/lan-client.ts
/**
 * WSS-клиент для подключения к обнаруженным LAN-пирам и отправки конвертов (Фаза T1).
 * Обеспечивает:
 * - Пул постоянных WebSocket-соединений к соседям в подсети.
 * - Выполнение Handshake PEER_INFO.
 * - Надежную доставку конвертов MeshEnvelope с ожиданием ACK.
 * - Сбор метрик RTT и объема переданных байт.
 * - Поддержку динамического разрешения сокетов (Node ws / WHATWG WebSocket) и синхронизированного реестра virtualServerRegistry.
 */

import {
  MeshEnvelope,
  DiscoveredPeer,
  TransportResult,
  getPeerAlias,
} from '../transport';
import {
  LanServer,
  virtualServerRegistry,
  resolveWsModule,
} from './lan-server';

export interface LanClientConfig {
  localDeviceId: string;
  localDeviceIdHash: string;
  localNodeId?: string;
  localAlias?: string;
  connectTimeoutMs?: number;
  sendTimeoutMs?: number;
}

interface PeerConnection {
  peer: DiscoveredPeer;
  socket: any;
  isConnected: boolean;
  pendingAcks: Map<string, { resolve: (res: TransportResult) => void; timer: any; startMs: number; bytes: number }>;
}

export class LanClient {
  public static readonly CONNECT_TIMEOUT_MS = 5000;
  public static readonly SEND_TIMEOUT_MS = 8000;

  private readonly config: Required<LanClientConfig>;
  private readonly connections = new Map<string, PeerConnection>();
  private isRunning = false;

  constructor(config: LanClientConfig) {
    this.config = {
      localDeviceId: config.localDeviceId,
      localDeviceIdHash: config.localDeviceIdHash,
      localNodeId: config.localNodeId || '',
      localAlias: config.localAlias || getPeerAlias(config.localDeviceIdHash),
      connectTimeoutMs: config.connectTimeoutMs ?? LanClient.CONNECT_TIMEOUT_MS,
      sendTimeoutMs: config.sendTimeoutMs ?? LanClient.SEND_TIMEOUT_MS,
    };
  }

  public async start(): Promise<void> {
    this.isRunning = true;
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    this.disconnectAll();
  }

  public disconnectAll(): void {
    for (const conn of this.connections.values()) {
      try {
        if (conn.socket && typeof conn.socket.close === 'function') {
          conn.socket.close();
        }
      } catch {}
      for (const pending of conn.pendingAcks.values()) {
        clearTimeout(pending.timer);
        pending.resolve({
          success: false,
          transportId: 'lan',
          error: 'Клиент остановлен',
        });
      }
      conn.pendingAcks.clear();
    }
    this.connections.clear();
  }

  public disconnect(peerId: string): void {
    const conn = this.connections.get(peerId);
    if (conn) {
      try {
        if (conn.socket && typeof conn.socket.close === 'function') {
          conn.socket.close();
        }
      } catch {}
      for (const pending of conn.pendingAcks.values()) {
        clearTimeout(pending.timer);
        pending.resolve({
          success: false,
          transportId: 'lan',
          error: 'Соединение закрыто',
        });
      }
      conn.pendingAcks.clear();
      this.connections.delete(peerId);
    }
  }

  public async sendEnvelope(peer: DiscoveredPeer, envelope: MeshEnvelope): Promise<TransportResult> {
    if (!this.isRunning) {
      return { success: false, transportId: 'lan', error: 'LAN клиент остановлен' };
    }

    try {
      const conn = await this.getOrConnect(peer);
      const payloadStr = JSON.stringify({
        type: 'ENVELOPE',
        envelope,
      });
      const bytesTransferred = payloadStr.length;
      const startMs = Date.now();

      return new Promise<TransportResult>((resolve) => {
        const timer = setTimeout(() => {
          conn.pendingAcks.delete(envelope.id);
          resolve({
            success: false,
            transportId: 'lan',
            error: 'Таймаут ожидания ACK от пира',
            bytesTransferred,
          });
        }, this.config.sendTimeoutMs);

        conn.pendingAcks.set(envelope.id, {
          resolve,
          timer,
          startMs,
          bytes: bytesTransferred,
        });

        try {
          conn.socket.send(payloadStr);
        } catch (err: any) {
          clearTimeout(timer);
          conn.pendingAcks.delete(envelope.id);
          resolve({
            success: false,
            transportId: 'lan',
            error: err?.message || 'Ошибка отправки в сокет',
          });
        }
      });
    } catch (err: any) {
      return {
        success: false,
        transportId: 'lan',
        error: err?.message || 'Не удалось подключиться к пиру',
      };
    }
  }

  public async broadcastEnvelope(peers: DiscoveredPeer[], envelope: MeshEnvelope): Promise<TransportResult> {
    if (!peers.length) {
      return { success: false, transportId: 'lan', error: 'Нет доступных LAN пиров' };
    }

    const promises = peers.map((peer) => this.sendEnvelope(peer, envelope));
    const results = await Promise.allSettled(promises);

    let successfulCount = 0;
    let totalBytes = 0;

    for (const res of results) {
      if (res.status === 'fulfilled' && res.value.success) {
        successfulCount++;
        totalBytes += res.value.bytesTransferred || 0;
      }
    }

    if (successfulCount > 0) {
      return {
        success: true,
        transportId: 'lan',
        bytesTransferred: totalBytes,
      };
    }

    return {
      success: false,
      transportId: 'lan',
      error: 'Не удалось доставить ни одному пиру',
    };
  }

  private async getOrConnect(peer: DiscoveredPeer): Promise<PeerConnection> {
    const existing = this.connections.get(peer.id);
    if (existing && existing.isConnected) {
      return existing;
    }

    const host = peer.host || '127.0.0.1';
    const port = peer.port || 46000;
    const url = `ws://${host}:${port}`;

    const socket = await this.createSocket(url);
    const conn: PeerConnection = {
      peer,
      socket,
      isConnected: true,
      pendingAcks: new Map(),
    };

    this.connections.set(peer.id, conn);

    this.setupSocketHandlers(conn);

    const handshakeMsg = JSON.stringify({
      type: 'PEER_INFO',
      id: this.config.localNodeId,
      did: this.config.localDeviceId,
      didHash: this.config.localDeviceIdHash,
      alias: this.config.localAlias,
    });
    try {
      socket.send(handshakeMsg);
    } catch {}

    return conn;
  }

  private async createSocket(url: string): Promise<any> {
    const wsMod = await resolveWsModule();
    let SocketClass: any = null;

    if (wsMod) {
      SocketClass = wsMod.WebSocket || wsMod.default?.WebSocket || wsMod.default || wsMod;
    }

    if (!SocketClass && typeof WebSocket !== 'undefined') {
      SocketClass = WebSocket;
    }

    const match = url.match(/^wss?:\/\/([^:]+):(\d+)/);
    const targetHost = match ? match[1] : '127.0.0.1';
    const targetPort = match ? parseInt(match[2], 10) : 0;
    const isLocalhost = targetHost === '127.0.0.1' || targetHost === 'localhost' || targetHost === '::1';

    // 1. Попытка реального подключения через SocketClass (если доступен)
    if (SocketClass) {
      try {
        const realSocket = await new Promise<any>((resolve, reject) => {
          try {
            const ws = new SocketClass(url);
            let settled = false;

            const timer = setTimeout(() => {
              if (settled) return;
              settled = true;
              try {
                ws.close();
              } catch {}
              reject(new Error(`Таймаут подключения к ${url}`));
            }, this.config.connectTimeoutMs);

            const onOpen = () => {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              resolve(ws);
            };

            const onError = (err: any) => {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              reject(err);
            };

            if (typeof ws.on === 'function') {
              ws.on('open', onOpen);
              ws.on('error', onError);
            } else if (typeof ws.addEventListener === 'function') {
              ws.addEventListener('open', onOpen);
              ws.addEventListener('error', onError);
            } else {
              ws.onopen = onOpen;
              ws.onerror = onError;
            }
          } catch (e) {
            reject(e);
          }
        });

        return realSocket;
      } catch (err) {
        // Если реальное подключение отклонено, но есть виртуальный сервер на локалхосте
        if (isLocalhost && targetPort && virtualServerRegistry.has(targetPort)) {
          const virtualServer = virtualServerRegistry.get(targetPort);
          if (virtualServer) {
            return this.createVirtualSocket(virtualServer);
          }
        }
        throw err;
      }
    }

    // 2. Если SocketClass отсутствует, но есть виртуальный сервер в реестре
    if (isLocalhost && targetPort && virtualServerRegistry.has(targetPort)) {
      const virtualServer = virtualServerRegistry.get(targetPort);
      if (virtualServer) {
        return this.createVirtualSocket(virtualServer);
      }
    }

    throw new Error(`Не удалось создать WebSocket соединение к ${url}: нет доступного WebSocket провайдера`);
  }

  private createVirtualSocket(virtualServer: LanServer): any {
    const socketId = `virt_${Math.random().toString(36).substring(2, 9)}`;
    const virtSocket: any = {
      send: (data: string) => {
        setTimeout(() => {
          try {
            virtualServer.handleIncomingMessage(
              socketId,
              typeof data === 'string' ? data : JSON.stringify(data)
            );
          } catch (e) {
            console.warn('[LanClient] Ошибка передачи в виртуальный сервер:', e);
          }
        }, 0);
      },
      close: () => {
        virtualServer.unregisterConnection(socketId);
        if (typeof virtSocket.onclose === 'function') {
          virtSocket.onclose();
        }
      },
      onmessage: null,
      onclose: null,
      onerror: null,
    };

    const accepted = virtualServer.registerConnection(
      socketId,
      (serverData: string) => {
        if (typeof virtSocket.onmessage === 'function') {
          virtSocket.onmessage({ data: serverData });
        }
      },
      () => {
        if (typeof virtSocket.onclose === 'function') {
          virtSocket.onclose();
        }
      }
    );

    if (!accepted) {
      throw new Error('Виртуальный сервер отклонил подключение (превышен лимит сокетов)');
    }

    return virtSocket;
  }

  private setupSocketHandlers(conn: PeerConnection): void {
    const ws = conn.socket;

    const handleRaw = (data: any) => {
      try {
        let raw: string;
        if (typeof data === 'string') {
          raw = data;
        } else if (data && typeof data.data !== 'undefined') {
          raw = typeof data.data === 'string' ? data.data : data.data.toString();
        } else if (data && typeof data.toString === 'function') {
          raw = data.toString('utf8');
        } else {
          return;
        }

        const msg = JSON.parse(raw);
        if (!msg || typeof msg !== 'object') return;

        if (msg.type === 'ACK' && msg.envelopeId) {
          const pending = conn.pendingAcks.get(msg.envelopeId);
          if (pending) {
            clearTimeout(pending.timer);
            conn.pendingAcks.delete(msg.envelopeId);
            pending.resolve({
              success: true,
              transportId: 'lan',
              bytesTransferred: pending.bytes,
              roundTripTimeMs: Date.now() - pending.startMs,
            });
          }
        }
      } catch (e) {
        console.warn('[LanClient] Ошибка обработки ответа сокета:', e);
      }
    };

    const handleClose = () => {
      conn.isConnected = false;
      for (const [id, pending] of conn.pendingAcks.entries()) {
        clearTimeout(pending.timer);
        conn.pendingAcks.delete(id);
        pending.resolve({
          success: false,
          transportId: 'lan',
          error: 'Соединение с пиром разорвано',
        });
      }
    };

    const handleError = () => {
      conn.isConnected = false;
    };

    if (typeof ws.on === 'function') {
      ws.on('message', handleRaw);
      ws.on('close', handleClose);
      ws.on('error', handleError);
    } else if (typeof ws.addEventListener === 'function') {
      ws.addEventListener('message', handleRaw);
      ws.addEventListener('close', handleClose);
      ws.addEventListener('error', handleError);
    } else {
      ws.onmessage = handleRaw;
      ws.onclose = handleClose;
      ws.onerror = handleError;
    }
  }
}