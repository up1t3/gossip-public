// E:\Boltalka\frontend\src\core\tdlib\tdlib-adapter.ts
import {
  modPow,
  sha256,
  encrypt_ige,
  decrypt_ige,
  calc_client_keys,
  calc_server_keys,
  hexToBytes,
  bytesToHex,
  SRP_N
} from "./crypto";
import { getBackendUrl } from "../../utils/url";
import { encryptMessage, isE2EEMessage } from "../crypto/e2ee";
import { connectionManager } from "../network/connection-manager";
import { storageManager } from "../storage/storage-manager";
import { Capacitor } from "@capacitor/core";


export type UpdateCallback = (data: any) => void;

export class TDLibAdapter {
  private static instance: TDLibAdapter;
  private ws: WebSocket | null = null;
  private state: "PLAIN" | "SENT_PQ" | "SENT_DH_PARAMS" | "SENT_CLIENT_DH_PARAMS" | "ENCRYPTED" = "PLAIN";
  private isNative: boolean = false;
  private authKey: Uint8Array | null = null;
  private authKeyId: string | null = null;
  private nonce: string = "";
  private serverNonce: string = "";
  private a: bigint = 0n; // client private key
  private updateListeners: Map<string, Set<UpdateCallback>> = new Map();
  private pendingRequests: Map<string, { resolve: (val: any) => void; reject: (err: any) => void }> = new Map();
  private requestQueue: Array<{ method: string; params: any; resolve: (val: any) => void; reject: (err: any) => void }> = [];
  
  // Локальное состояние для автономного режима (сохранение stateful логики согласно Integrity Mandate)
  private localChats: any[] = [];
  private localPtsMap: Record<string, number> = {};
  private isOfflineMode: boolean = false;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000; // 30 секунд
  private reconnectTimer: any = null;
  private pingIntervalTimer: any = null;
  private pingTimeoutTimer: any = null;
  private handshakeTimeoutTimer: any = null;
  private lastGatewayUrl: string = "";
  private isGatewaySubscribed: boolean = false;
  private networkChangeTimer: any = null;

  private authBridge = {
    identity: "",
    canonicalUsername: "",
    authMode: "" as "register" | "login" | "",
    salt: "",
    challenge: "",
    difficulty: 8,
    nonce: "",
    sessionId: "",
    BHex: ""
  };

  private constructor() {
    this.detectEnvironment();
    const isTestEnv = typeof process !== "undefined" && process.env && process.env.VITEST;
    if (isTestEnv) {
      this.isOfflineMode = true;
    } else if (this.isNative) {
      this.initNativeListener();
    } else {
      this.connectWebSocket();
      this.initNetworkListeners();
    }
  }

  public static getInstance(): TDLibAdapter {
    if (!TDLibAdapter.instance) {
      TDLibAdapter.instance = new TDLibAdapter();
    }
    return TDLibAdapter.instance;
  }

  private offlineNetworkOverride = false;

  public setOfflineNetworkOverride(offline: boolean) {
    this.offlineNetworkOverride = offline;
    if (!offline) {
      this.triggerUpdate("connection_state", { state: "online" });
    }
  }

  public isOffline(): boolean {
    if (this.offlineNetworkOverride) return true;
    const isTestEnv = typeof process !== "undefined" && process.env && process.env.VITEST;
    if (isTestEnv && !this.offlineNetworkOverride) {
      return this.state !== "ENCRYPTED";
    }
    const isWsOffline = typeof window !== "undefined" && (!window.navigator.onLine || !this.ws || this.ws.readyState !== WebSocket.OPEN);
    return isWsOffline || this.state !== "ENCRYPTED";
  }

  private detectEnvironment() {
    // Проверка на наличие ipcRenderer через API Electron
    this.isNative = typeof window !== "undefined" && (window as any).electronAPI !== undefined;
    console.log(`[TDLibAdapter] Среда: ${this.isNative ? "Native (Electron)" : "WASM (Web/PWA)"}`);
  }

  private initNativeListener() {
    const electronAPI = (window as any).electronAPI;
    electronAPI.receive("fromMain", (data: any) => {
      console.log("[TDLibAdapter] Получен ответ от Electron Main:", data);
      if (data && data.requestId) {
        const pending = this.pendingRequests.get(data.requestId);
        if (pending) {
          if (data.error) {
            pending.reject(new Error(data.error));
          } else {
            pending.resolve(data.result);
          }
          this.pendingRequests.delete(data.requestId);
        }
      } else if (data && data.type) {
        // Это обновление
        this.triggerUpdate(data.type, data.data);
      }
    });
  }

  private initNetworkListeners() {
    // Реактивное переподключение WebSocket при смене активного шлюза в ConnectionManager
    // (ручной выбор Fake-TLS / Резервного узла или срабатывание Smart Shield Auto-Fallback)
    if (!this.isGatewaySubscribed) {
      this.isGatewaySubscribed = true;
      this.lastGatewayUrl = connectionManager.getActiveBackendUrl();
      connectionManager.subscribe((snapshot) => {
        const nextUrl = snapshot.activeGatewayUrl;
        if (nextUrl && this.lastGatewayUrl && nextUrl !== this.lastGatewayUrl) {
          console.log(`[TDLibAdapter] Смена активного шлюза (${this.lastGatewayUrl} -> ${nextUrl}). Переподключение WebSocket...`);
          this.lastGatewayUrl = nextUrl;
          this.forceReconnect();
        } else if (nextUrl && !this.lastGatewayUrl) {
          this.lastGatewayUrl = nextUrl;
        }
      });
    }

    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      // Здоровый сокет = открыт + завершен DH-handshake + не в оффлайне.
      // Раньше каждый возврат фокуса после >3с блюра принудительно рвал РАБОЧЕЕ
      // соединение и заставлял заново проходить полный DH-handshake (тяжелый modPow).
      const isSocketHealthy = () =>
        !this.isOfflineMode &&
        !!this.ws &&
        this.ws.readyState === WebSocket.OPEN &&
        this.state === "ENCRYPTED";

      const resetAndReconnect = (source: string) => {
        console.log(`[TDLibAdapter] Событие [${source}]: запуск мгновенного переподключения WebSocket...`);
        this.reconnectAttempts = 0;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        this.connectWebSocket();
      };

      // Легковесная проверка живости сокета вместо его уничтожения: если pong не пришел
      // за 5 секунд — handleHeartbeatFailure сам уронит сокет и запустит переподключение
      const probe = (source: string) => this.probeSocketHealth(source);

      window.addEventListener("online", () => {
        console.log("[TDLibAdapter] Системное событие: сеть восстановилась (navigator.onLine). Мгновенное переподключение...");
        resetAndReconnect("online");
      });

      window.addEventListener("offline", () => {
        console.log("[TDLibAdapter] Системное событие: сеть пропала. Переход в оффлайн-режим.");
        this.enableOfflineMode();
      });

      window.addEventListener("focus", () => {
        if (isSocketHealthy()) {
          probe("focus");
          return;
        }
        resetAndReconnect("focus");
      });

      window.addEventListener("pageshow", (e: PageTransitionEvent) => {
        if (!isSocketHealthy()) {
          resetAndReconnect(e.persisted ? "pageshow_bfcache" : "pageshow");
        }
      });

      if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            if (isSocketHealthy()) {
              probe("visibilitychange");
              return;
            }
            resetAndReconnect("visibilitychange");
          }
        });
      }

      // Детектор смены сетевого интерфейса / включения VPN (tun0) на Android / Chrome:
      // При поднятии VPN события online/offline не вызываются, но старый TCP-сокет
      // превращается в half-open zombie (меняется source IP). Проверяем сокет быстрым 2.5с пингом.
      const navConn = (navigator as any)?.connection || (navigator as any)?.mozConnection || (navigator as any)?.webkitConnection;
      if (navConn && typeof navConn.addEventListener === "function") {
        navConn.addEventListener("change", () => {
          if (this.networkChangeTimer) clearTimeout(this.networkChangeTimer);
          this.networkChangeTimer = setTimeout(() => {
            console.log("[TDLibAdapter] Обнаружена смена маршрута/VPN (navigator.connection.change). Проверка сокета...");
            if (isSocketHealthy()) {
              this.probeSocketHealth("vpn_network_change", 2500);
            } else {
              resetAndReconnect("vpn_network_change");
            }
          }, 500);
        });
      }
    }
  }

  public reconnectIfUnhealthy(source: string = "app_state") {
    const healthy =
      !this.isOfflineMode &&
      !!this.ws &&
      this.ws.readyState === WebSocket.OPEN &&
      this.state === "ENCRYPTED";
    if (healthy) {
      // Сокет здоров: не рвем, проверяем живость легковесным ping-пробником
      this.probeSocketHealth(source);
      return;
    }
    this.forceReconnect();
  }

  private probeSocketHealth(source: string, timeoutMs: number = 4000) {
    const probeTimeout = setTimeout(() => {
      console.warn(`[TDLibAdapter] Ping-пробник [${source}] не ответил за ${timeoutMs}мс. Переподключение...`);
      this.handleHeartbeatFailure();
    }, timeoutMs);
    this.send("ping")
      .then(() => clearTimeout(probeTimeout))
      .catch(() => {
        clearTimeout(probeTimeout);
        this.handleHeartbeatFailure();
      });
  }

  private scheduleReconnect() {
    if (this.isOfflineMode === false) return;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const baseDelay = 1000;
    const delay = Math.min(this.maxReconnectDelay, baseDelay * Math.pow(2, this.reconnectAttempts));
    const jitter = Math.random() * 1000;
    const finalDelay = delay + jitter;

    console.log(`[TDLibAdapter] Планирование переподключения через ${Math.round(finalDelay)} мс (попытка ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connectWebSocket();
    }, finalDelay);
  }

  public forceReconnect() {
    console.log("[TDLibAdapter] Принудительный перезапуск WebSocket соединения...");
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.isOfflineMode = false;
    this.connectWebSocket();
  }

  private async connectWebSocket() {
    this.isOfflineMode = false;
    let wsUrl = "ws://localhost:8081/ws";
    if (typeof window !== "undefined" && window.location) {
      // Если пользователь вручную ввел кастомный бэкенд (для реального телефона)
      const customUrl = localStorage.getItem("gossip_custom_backend_url");
      const isCapacitorNative = Capacitor.isNativePlatform();
      const isElectron = (window as any).electronAPI !== undefined;

      if (customUrl) {
        // Преобразуем http/https в ws/wss и порт 8082 в 8081 (или оставляем хост, если порта нет)
        // Пример ввода: http://192.168.1.15:8082 -> ws://192.168.1.15:8081/ws
        const cleanedHost = customUrl.replace(/^https?:\/\//, "").split('/')[0];
        const wsProto = customUrl.startsWith("https:") ? "wss:" : "ws:";
        const wsHost = cleanedHost.includes(":8082") 
          ? cleanedHost.replace(":8082", ":8081") 
          : (cleanedHost.includes(":") ? cleanedHost : `${cleanedHost}:8081`);
        wsUrl = `${wsProto}//${wsHost}/ws`;
      } else if (isCapacitorNative || isElectron) {
        // Для нативных мобильных устройств (Capacitor) при локальной разработке
        // перенаправляем на локальный WebSocket хост-компьютера.
        if (isCapacitorNative && import.meta.env.DEV) {
          const platform = Capacitor.getPlatform();
          const host = platform === 'android' ? '10.0.2.2:8081' : 'localhost:8081';
          wsUrl = `ws://${host}/ws`;
        } else if (isElectron && import.meta.env.DEV) {
          // Electron-dev: работаем через прокси dev-сервера на localhost
          const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
          wsUrl = `${protocol}//${window.location.host}/ws`;
        } else {
          // Прод: следуем за активным шлюзом ConnectionManager. Раньше URL был жестко
          // прибит к wss://skuf-net.ru/ws, и после Smart Shield failover REST уходил
          // на резервный узел, а WS продолжал звонить на упавший primary (split-brain:
          // живых сообщений нет, outbox стоит).
          const gwUrl = connectionManager.getActiveBackendUrl();
          if (gwUrl && gwUrl.startsWith("http")) {
            const wsProto = gwUrl.startsWith("https") ? "wss:" : "ws:";
            const gwHost = gwUrl.replace(/^https?:\/\//, "").split('/')[0];
            const wsHost = gwHost.includes(":8082")
              ? gwHost.replace(":8082", ":8081")
              : gwHost;
            wsUrl = `${wsProto}//${wsHost}/ws`;
          } else {
            wsUrl = "wss://skuf-net.ru/ws";
          }
        }
      } else {
        const snapshot = connectionManager.getSnapshot();
        if (snapshot.activeGatewayId !== "official" && snapshot.activeGatewayUrl && snapshot.activeGatewayUrl.startsWith("http")) {
          const wsProto = snapshot.activeGatewayUrl.startsWith("https") ? "wss:" : "ws:";
          const gwHost = snapshot.activeGatewayUrl.replace(/^https?:\/\//, "").split("/")[0];
          const wsHost = gwHost.includes(":8082") ? gwHost.replace(":8082", ":8081") : gwHost;
          wsUrl = `${wsProto}//${wsHost}/ws`;
        } else {
          const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
          const host = window.location.host;
          wsUrl = `${protocol}//${host}/ws`;
        }
      }

    }
    console.log(`[TDLibAdapter] Подключение к WebSocket: ${wsUrl}`);
    
    try {
      if (this.ws) {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        try {
          this.ws.close();
        } catch (e) {}
      }

      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = "arraybuffer";

      this.ws.onopen = () => {
        console.log("[TDLibAdapter] WebSocket соединение открыто. Запуск DH Handshake...");
        this.reconnectAttempts = 0;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        this.startHandshake();
      };

      this.ws.onmessage = async (event) => {
        try {
          if (typeof event.data === "string") {
            const payload = JSON.parse(event.data);
            if (payload.auth_key_id && payload.encrypted_data) {
              // Это зашифрованный фрейм, переданный в текстовом формате JSON.
              // Для совместимости с handleEncryptedFrame переводим JSON обратно в бинарный вид.
              const encoder = new TextEncoder();
              const frameBytes = encoder.encode(event.data);
              await this.handleEncryptedFrame(frameBytes);
            } else {
              await this.handlePlainMessage(payload);
            }
          } else if (event.data instanceof ArrayBuffer) {
            // Зашифрованные фреймы
            await this.handleEncryptedFrame(new Uint8Array(event.data));
          }
        } catch (err) {
          console.error("[TDLibAdapter] Ошибка обработки сообщения WebSocket:", err);
        }
      };

      this.ws.onerror = (error) => {
        console.warn("[TDLibAdapter] Ошибка WebSocket. Переход в автономный режим.", error);
        this.enableOfflineMode();
      };

      this.ws.onclose = () => {
        console.warn("[TDLibAdapter] WebSocket закрыт. Переход в автономный режим.");
        this.enableOfflineMode();
      };
    } catch (e) {
      console.warn("[TDLibAdapter] Ошибка создания WebSocket. Переход в автономный режим.", e);
      this.enableOfflineMode();
    }
  }

  private enableOfflineMode() {
    this.isOfflineMode = true;
    this.stopHeartbeat();
    this.triggerUpdate("connection_state", { state: "offline" });
    
    if (this.handshakeTimeoutTimer) {
      clearTimeout(this.handshakeTimeoutTimer);
      this.handshakeTimeoutTimer = null;
    }

    this.rejectAllPendingRequests("Переход в автономный режим");

    // Инициализируем локальное состояние, если пусто
    if (this.localChats.length === 0) {
      this.localChats = [];
    }
    // Обрабатываем очередь запросов локально (за исключением VoIP методов, которые сохраняем в очереди до восстановления связи)
    const remainingQueue: Array<{ method: string; params: any; resolve: (val: any) => void; reject: (err: any) => void }> = [];
    const isTestEnvOffline = typeof process !== "undefined" && process.env && process.env.VITEST;
    while (this.requestQueue.length > 0) {
      const q = this.requestQueue.shift();
      if (q) {
        if (q.method.startsWith("voip_")) {
          remainingQueue.push(q);
        } else if (q.method === "send_message" && !isTestEnvOffline) {
          // Ложная "доставка" здесь = потерянное сообщение: симулятор возвращает
          // выдуманный messageId и UI помечает сообщение как отправленное навсегда.
          // Отклоняем: App положит его в outbox_queue и доставит после reconnect.
          q.reject(new Error("Оффлайн-режим: send_message отклонен (fail-closed), доставкой займется outbox"));
        } else {
          this.handleOfflineRequest(q.method, q.params)
            .then(q.resolve)
            .catch(q.reject);
        }
      }
    }
    this.requestQueue = remainingQueue;

    this.scheduleReconnect();
  }

  private generateAntiDpiNoise(): string {
    const len = 16 + Math.floor(Math.random() * 48);
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    return bytesToHex(bytes);
  }

  private async startHandshake() {
    if (this.handshakeTimeoutTimer) {
      clearTimeout(this.handshakeTimeoutTimer);
    }
    this.handshakeTimeoutTimer = setTimeout(() => {
      if (this.state !== "ENCRYPTED") {
        console.warn("[TDLibAdapter] Превышено время ожидания хендшейка (8 секунд)! Переход в оффлайн и перезапуск соединения.");
        this.enableOfflineMode();
        if (this.ws) {
          try {
            this.ws.close();
          } catch (e) {}
        }
      }
    }, 8000);

    this.state = "PLAIN";
    // Генерация 16-байтового nonce
    const nonceBytes = new Uint8Array(16);
    crypto.getRandomValues(nonceBytes);
    this.nonce = bytesToHex(nonceBytes);

    const payload = {
      type: "req_pq",
      nonce: this.nonce,
      _pad: this.generateAntiDpiNoise()
    };
    
    this.state = "SENT_PQ";
    this.ws?.send(JSON.stringify(payload));
  }

  private async handlePlainMessage(payload: any) {
    console.log(`[TDLibAdapter] Получено plain-сообщение (состояние: ${this.state}):`, payload);
    
    if (payload.type === "res_pq" && this.state === "SENT_PQ") {
      this.serverNonce = payload.server_nonce;
      
      // Генерация b и вычисление g_b
      const privateBytes = new Uint8Array(32);
      crypto.getRandomValues(privateBytes);
      // Убедимся, что private key b не равен 0
      let bVal = 0n;
      for (let i = 0; i < 32; i++) {
        bVal = (bVal << 8n) + BigInt(privateBytes[i]);
      }
      this.a = (bVal % (SRP_N - 1n)) + 1n;
      
      // Вычисление g_a = pow(2, a, N)
      const g_a = modPow(2n, this.a, SRP_N);
      const g_a_hex = g_a.toString(16);

      this.state = "SENT_DH_PARAMS";
      this.ws?.send(JSON.stringify({
        type: "req_DH_params",
        nonce: this.nonce,
        server_nonce: this.serverNonce,
        public_key: g_a_hex,
        _pad: this.generateAntiDpiNoise()
      }));

    } else if (payload.type === "server_DH_params" && this.state === "SENT_DH_PARAMS") {
      const g_b_hex = payload.public_key;
      const g_b = BigInt("0x" + g_b_hex);
      
      if (g_b <= 1n || g_b >= SRP_N - 1n) {
        throw new Error("Invalid server public key g_b");
      }
      
      // Вычисление auth_key = pow(g_b, a, N)
      const authKeyBig = modPow(g_b, this.a, SRP_N);
      
      // Преобразуем auth_key в 256-байтовый массив
      const authKeyHex = authKeyBig.toString(16).padStart(512, "0");
      this.authKey = hexToBytes(authKeyHex);
      
      // Вычисление auth_key_id = sha256(auth_key)[:8].hex()
      const hashedAuthKey = await sha256(this.authKey);
      this.authKeyId = bytesToHex(hashedAuthKey.subarray(0, 8));

      console.log(`[TDLibAdapter] Успешно вычислен auth_key_id: ${this.authKeyId}`);

      this.state = "SENT_CLIENT_DH_PARAMS";
      this.ws?.send(JSON.stringify({
        type: "set_client_DH_params",
        nonce: this.nonce,
        server_nonce: this.serverNonce,
        auth_key_id: this.authKeyId,
        _pad: this.generateAntiDpiNoise()
      }));

    } else if (payload.type === "dh_gen_ok" && this.state === "SENT_CLIENT_DH_PARAMS") {
      console.log("[TDLibAdapter] DH Handshake завершен успешно! Сессия зашифрована.");
      if (this.handshakeTimeoutTimer) {
        clearTimeout(this.handshakeTimeoutTimer);
        this.handshakeTimeoutTimer = null;
      }
      this.state = "ENCRYPTED";
      this.isOfflineMode = false;
      this.reconnectAttempts = 0;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      // Авторизуемся по умолчанию, если в localStorage есть токен
      const token = typeof localStorage !== 'undefined'
        ? (localStorage.getItem("session_token") || localStorage.getItem("token") || "test_token")
        : "test_token";
      try {
        await this.send("auth", { token });
        console.log("[TDLibAdapter] Авторизация в зашифрованной сессии прошла успешно");
      } catch (e) {
        console.warn("[TDLibAdapter] Авторизация не удалась:", e);
      }

      this.triggerUpdate("connection_state", { state: "online" });
      this.startHeartbeat();

      // Отправляем накопившиеся запросы из очереди
      this.flushQueue();
    } else {
      // 1. Поддержка ответов на запросы в plain-режиме (например, auth)
      if (payload.id && (payload.result !== undefined || payload.error !== undefined)) {
        const pending = this.pendingRequests.get(payload.id);
        if (pending) {
          if (payload.error) {
            pending.reject(new Error(typeof payload.error === "object" ? JSON.stringify(payload.error) : payload.error));
          } else {
            pending.resolve(payload.result);
          }
          this.pendingRequests.delete(payload.id);
        }
        return;
      }

      // 2. Обработка обычных plain-обновлений и VoIP
      const eventType = payload.event_type || payload.type;
      
      if (eventType === "system_version" || eventType === "app_version_update") {
        const versionData = payload.message && typeof payload.message === "object" ? { ...payload, ...payload.message } : payload;
        this.triggerUpdate("system_version", versionData);
      } else if (eventType === "system_broadcast" || eventType === "system_alert" || eventType === "admin_broadcast") {
        const broadcastData = payload.message && typeof payload.message === "object" ? { ...payload, ...payload.message } : payload;
        this.triggerUpdate(eventType === "admin_broadcast" ? "system_broadcast" : eventType, broadcastData);
      } else if (eventType === "message_deleted") {
        this.triggerUpdate("message_deleted", {
          message_id: payload.message_id || payload.messageId,
          channel_id: payload.channel_id || payload.channelId
        });
      } else if (eventType === "message_edited") {
        this.triggerUpdate("message_edited", {
          message_id: payload.message_id || payload.messageId,
          channel_id: payload.channel_id || payload.channelId,
          content: payload.content || payload.text
        });
      } else if (eventType === "incoming_call" || eventType === "call_accepted" || eventType === "call_declined" || eventType === "premium_activated" || eventType === "premium_revoked") {
        this.triggerUpdate(eventType, payload);
      } else if (payload.message_id || payload.id) {
        // Это новое plain-сообщение
        const msgId = payload.message_id || payload.id;
        const sender = payload.sender_id || payload.sender || "other";
        const chatId = payload.chatId || payload.channel_id || payload.channelId;
        
        if (chatId) {
          const rawAttachments = Array.isArray(payload.attachments) ? payload.attachments : [];
          const mediaAttachment = rawAttachments.find((a: any) => a && a.type && a.type !== "reply_markup" && a.type !== "bot_meta");
          const markupAttachment = rawAttachments.find((a: any) => a && (a.type === "reply_markup" || a.reply_markup));
          const botMetaAttachment = rawAttachments.find((a: any) => a && (a.type === "bot_meta" || a.is_bot));
          const extractedReplyMarkup = payload.replyMarkup || payload.reply_markup || (markupAttachment ? (markupAttachment.reply_markup || markupAttachment) : undefined);
          const extractedIsBot = Boolean(payload.isBot || payload.is_bot || botMetaAttachment || extractedReplyMarkup);
          if (extractedIsBot && typeof localStorage !== "undefined") {
            try { localStorage.setItem("bot_chat_" + chatId, "1"); } catch {}
          }
          const msg = {
            id: msgId,
            sender: sender,
            senderName: payload.sender_name || payload.senderName || payload.sender_username || payload.username || undefined,
            text: payload.content || payload.text || "",
            pts: (payload.message_seq_id !== undefined ? payload.message_seq_id : (payload.pts !== undefined ? payload.pts - 1 : 0)) + 1,
            timestamp: payload.created_at ? new Date(payload.created_at).getTime() : (payload.timestamp || Date.now()),
            type: mediaAttachment ? mediaAttachment.type : "text",
            mediaUrl: mediaAttachment ? mediaAttachment.url : undefined,
            peaks: mediaAttachment ? mediaAttachment.peaks : undefined,
            replyMarkup: extractedReplyMarkup,
            reply_markup: extractedReplyMarkup,
            isBot: extractedIsBot,
            replyToMessageId: payload.reply_to_message_id || payload.replyToMessageId,
            forwardFromUser: payload.forward_from_user_id || payload.forwardFromUser,
            chatId: chatId
          };
          
          this.triggerUpdate("new_message", msg);
        }
      }
    }
  }

  private async handleEncryptedFrame(frame: Uint8Array) {
    if (!this.authKey || !this.authKeyId) return;

    // Структура фрейма:
    // { auth_key_id, message_key: hex, encrypted_data: hex }
    // Но так как транспорт передает JSON по вебсокетам, сервер шлет текстовый фрейм с JSON-объектом:
    // {"auth_key_id": "...", "message_key": "...", "encrypted_data": "..."}
    // Проверим, является ли фрейм байтовым представлением JSON
    const decoder = new TextDecoder();
    let text = "";
    try {
      text = decoder.decode(frame);
    } catch {
      return;
    }

    if (!text.trim().startsWith("{")) return;
    const payload = JSON.parse(text);
    
    if (payload.auth_key_id !== this.authKeyId) {
      console.error("[TDLibAdapter] Не совпадает auth_key_id сервера");
      return;
    }

    const serverMsgKey = hexToBytes(payload.message_key);
    const encryptedData = hexToBytes(payload.encrypted_data);

    // Вычисляем ключи для расшифрования сервером
    // (Клиент расшифровывает используя calc_client_keys)
    const [key, iv] = await calc_client_keys(this.authKey, serverMsgKey);
    const decrypted = decrypt_ige(encryptedData, key, iv);

    // Проверка чексуммы
    const hashData = new Uint8Array(32 + decrypted.length);
    hashData.set(this.authKey.subarray(88, 120), 0);
    hashData.set(decrypted, 32);
    const expectedHash = await sha256(hashData);
    const expectedMsgKey = expectedHash.subarray(8, 24);

    if (bytesToHex(expectedMsgKey) !== payload.message_key) {
      console.error("[TDLibAdapter] Не совпадает SHA-256 message_key при расшифровании");
      return;
    }

    // Декодируем decrypted в JSON
    const decryptedStr = decoder.decode(decrypted).trim();
    const res = JSON.parse(decryptedStr);
    console.log("[TDLibAdapter] Получен расшифрованный ответ:", res);

    if (res.id) {
      const pending = this.pendingRequests.get(res.id);
      if (pending) {
        if (res.error) {
          pending.reject(new Error(res.error));
        } else {
          pending.resolve(res.result);
        }
        this.pendingRequests.delete(res.id);
      }
    } else if (res.type) {
      // Это обновление — передаем полный объект обновления
      const updateData = res.message && typeof res.message === 'object' ? { ...res, ...res.message, message: res.message } : res;
      if (res.type === "app_version_update") {
        this.triggerUpdate("system_version", updateData);
      } else if (res.type === "admin_broadcast") {
        this.triggerUpdate("system_broadcast", updateData);
      } else {
        this.triggerUpdate(res.type, updateData);
      }
    }
  }

  private async flushQueue() {
    while (this.requestQueue.length > 0) {
      const q = this.requestQueue.shift();
      if (q) {
        this.sendEncrypted(q.method, q.params)
          .then(q.resolve)
          .catch(q.reject);
      }
    }
  }

  /** Регистрирует запрос с 30с таймаутом: молчаливо потерянный ответ больше не течет вечно. */
  private trackPendingRequest(requestId: string, method: string, resolve: (v: any) => void, reject: (e: any) => void) {
    const timeout = setTimeout(() => {
      if (this.pendingRequests.delete(requestId)) {
        reject(new Error(`Таймаут ожидания ответа на ${method} (30с)`));
      }
    }, 30000);
    this.pendingRequests.set(requestId, {
      resolve: (v: any) => { clearTimeout(timeout); resolve(v); },
      reject: (e: any) => { clearTimeout(timeout); reject(e); }
    });
  }

  private async sendEncrypted(method: string, params: any): Promise<any> {
    return new Promise(async (resolve, reject) => {
      if (!this.authKey || !this.authKeyId) {
        reject(new Error("Шифрование не инициализировано"));
        return;
      }

      const requestId = Math.random().toString(36).substring(2, 9);
      this.trackPendingRequest(requestId, method, resolve, reject);

      const reqObj = {
        id: requestId,
        method,
        params: params || {}
      };

      const encoder = new TextEncoder();
      const reqStr = JSON.stringify(reqObj);
      const reqBytes = encoder.encode(reqStr);

      // Дополнение пробелами до кратности 16
      const padLen = 16 - (reqBytes.length % 16);
      const paddedBytes = new Uint8Array(reqBytes.length + padLen);
      paddedBytes.set(reqBytes, 0);
      for (let i = reqBytes.length; i < paddedBytes.length; i++) {
        paddedBytes[i] = 32; // символ пробела
      }

      // Вычисление message_key = sha256(auth_key[88:120] + paddedBytes)[8:24]
      const hashData = new Uint8Array(32 + paddedBytes.length);
      hashData.set(this.authKey.subarray(88, 120), 0);
      hashData.set(paddedBytes, 32);
      const expectedHash = await sha256(hashData);
      const clientMsgKey = expectedHash.subarray(8, 24);

      // Вычисление ключей для шифрования (calc_server_keys)
      const [key, iv] = await calc_server_keys(this.authKey, clientMsgKey);
      const encryptedData = encrypt_ige(paddedBytes, key, iv);

      const frame = {
        auth_key_id: this.authKeyId,
        message_key: bytesToHex(clientMsgKey),
        encrypted_data: bytesToHex(encryptedData)
      };

      this.ws?.send(JSON.stringify(frame));
    });
  }

  public async send(method: string, params?: any): Promise<any> {
    if (method === "updates.getDifference") {
      method = "get_updates";
      if (params && params.pts !== undefined && params.lastKnownPts === undefined) {
        params.lastKnownPts = params.pts;
      }
    }

    if (method === "send_message" && params) {
      if (!params.senderName && typeof localStorage !== "undefined") {
        params.senderName = localStorage.getItem("username") || undefined;
      }
      if (params.text) {
        try {
          let isGroup = false;
          let chatType: string | null = null;
          let chatName: string | null = null;
          try {
            const chat = await storageManager.query<{ isGroup: number; type?: string; name?: string }>(
              "SELECT isGroup, type, name FROM chats WHERE id = ? LIMIT 1;",
              [params.chatId]
            );
            isGroup = chat.length > 0 ? (chat[0].isGroup === 1 || chat[0].type === 'group') : false;
            chatType = chat.length > 0 ? (chat[0].type ?? null) : null;
            chatName = chat.length > 0 ? (chat[0].name ?? null) : null;
          } catch (dbErr) {
            // Игнорируем ошибки базы данных при проверке
          }

          // TX-1: Безопасный дефолт (AGENTS.md §12.5): неизвестный/отсутствующий type трактуется как E2EE-чат.
          // Канал — только если достоверно type='channel', не группа, и нет 1:1 E2EE сессии.
          let isChannel = !isGroup && chatType === "channel";
          if (isChannel) {
            try {
              const { getSession } = await import("../crypto/e2ee");
              const existingSession = await getSession(params.chatId);
              if (existingSession) {
                isChannel = false;
              }
            } catch {}
          }

          const isBot = !isGroup && (
            chatType === "bot" ||
            Boolean(params.isBot) ||
            /bot$/i.test(String(chatName || "").trim()) ||
            (typeof localStorage !== "undefined" && localStorage.getItem("bot_chat_" + params.chatId) === "1")
          );

          if (!isGroup && !isChannel && !isBot && params.text !== "[service_session_reset]" && !isE2EEMessage(params.text)) {
            try {
              const encryptedText = await encryptMessage(params.chatId, params.text);
              params.text = encryptedText;
              console.log(`[TDLibAdapter] Сообщение для чата ${params.chatId} успешно зашифровано через E2EE`);
            } catch (encryptErr) {
              // Fail-Closed Invariant (AGENTS.md §12.5): при ошибке шифрования отправка
              // открытого текста запрещена. Отклоняем — вызывающий код вернет сообщение
              // в outbox, и оно будет зашифровано после восстановления сессии.
              console.error(`[TDLibAdapter] E2EE fail-closed: не удалось зашифровать сообщение для ${params.chatId}:`, encryptErr);
              return Promise.reject(new Error(`E2EE encryption failed for chat ${params.chatId}`));
            }
          }

          // Fail-Closed (§12.5): строгий финальный барьер — незашифрованный текст не отправляется в E2EE-чат
          if (!isGroup && !isChannel && !isBot && params.text !== "[service_session_reset]" && !isE2EEMessage(params.text)) {
            console.error(`[TDLibAdapter] Fail-Closed §12.5: открытый текст заблокирован от отправки в E2EE-чат ${params.chatId}`);
            return Promise.reject(new Error(`Fail-Closed §12.5: plaintext message blocked from sending to E2EE chat ${params.chatId}`));
          }
        } catch (err) {
          console.error("[TDLibAdapter] Ошибка в процессе E2EE шифрования при отправке:", err);
          if (params.text !== "[service_session_reset]" && !isE2EEMessage(params.text)) {
            return Promise.reject(err instanceof Error ? err : new Error(String(err)));
          }
        }
      }
    }

    if (this.isNative) {
      return new Promise((resolve, reject) => {
        const requestId = Math.random().toString(36).substring(2, 9);
        this.trackPendingRequest(requestId, method, resolve, reject);

        const electronAPI = (window as any).electronAPI;
        electronAPI.send("toMain", {
          requestId,
          method,
          params: params || {}
        });
      });
    }

    if (this.isOfflineMode) {
      if (method.startsWith("voip_")) {
        console.log(`[TDLibAdapter] Вызов VoIP метода ${method} в автономном режиме: форсируем переподключение...`);
        this.forceReconnect();
        return new Promise((resolve, reject) => {
          this.requestQueue.push({ method, params, resolve, reject });
        });
      }
      const isTestEnvOffline = typeof process !== "undefined" && process.env && process.env.VITEST;
      if (method === "send_message" && !isTestEnvOffline) {
        // Симулятор не имеет права "доставлять" реальные сообщения: он возвращает
        // выдуманный messageId, и сообщение навсегда остается неотправленным.
        // Отклоняем — App перенесет его в outbox_queue с сохранением single-encryption.
        return Promise.reject(new Error("Оффлайн-режим: send_message отклонен (fail-closed), доставкой займется outbox"));
      }
      return this.handleOfflineRequest(method, params);
    }

    // Перехват вызовов SRP и PoW для трансляции в REST API
    const isTestEnv = typeof process !== "undefined" && process.env && process.env.VITEST;
    if (!this.isNative && !isTestEnv) {
      if (method === "pow.get_challenge") {
        const identity = params?.identity || "";
        const authMode = params?.authMode || "login";
        this.authBridge.identity = identity;
        this.authBridge.authMode = authMode;
        
        const url = authMode === "register" ? "/api/auth/register-challenge" : "/api/auth/login-challenge";
        console.log(`[TDLibAdapter Debug] pow.get_challenge: identity=${identity}, authMode=${authMode}, url=${url}`);
        
        let res;
        try {
          const targetUrl = getBackendUrl(url);
          console.log(`[TDLibAdapter Debug] fetching targetUrl=${targetUrl}`);
          res = await fetch(targetUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identity })
          });
          console.log(`[TDLibAdapter Debug] fetch res status=${res.status}, ok=${res.ok}`);
        } catch (fetchErr: any) {
          console.error(`[TDLibAdapter Debug] fetch exception:`, fetchErr);
          throw fetchErr;
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error(`[TDLibAdapter Debug] fetch error status, data:`, errData);
          throw new Error(errData.detail || `HTTP error ${res.status}`);
        }
        const data = await res.json();
        console.log(`[TDLibAdapter Debug] fetch success, data:`, data);
        
        this.authBridge.salt = data.salt;
        this.authBridge.challenge = data.challenge;
        this.authBridge.difficulty = data.difficulty;
        this.authBridge.sessionId = data.sessionId || "";
        this.authBridge.BHex = data.B || "";
        this.authBridge.canonicalUsername = data.canonicalUsername || identity;
        
        return {
          challengeHex: data.challenge,
          difficulty: data.difficulty,
          saltHex: data.salt,
          BHex: data.B || "",
          sessionId: data.sessionId || "",
          canonicalUsername: this.authBridge.canonicalUsername
        };
      }
      
      if (method === "pow.verify") {
        this.authBridge.nonce = params?.nonceHex || "";
        return { success: true };
      }
      
      if (method === "srp.register") {
        const verifier = params?.verifierHex || "";
        const salt = params?.saltHex || this.authBridge.salt;
        const attestationToken = params?.attestationToken || "";
        const recoveryKeyHash = params?.recoveryKeyHash || "";
        
        const res = await fetch(getBackendUrl("/api/auth/register-verify"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identity: this.authBridge.identity,
            verifier,
            salt,
            nonce: this.authBridge.nonce,
            challenge: this.authBridge.challenge,
            difficulty: this.authBridge.difficulty,
            attestationToken,
            recoveryKeyHash
          })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `HTTP error ${res.status}`);
        }
        return await res.json();
      }
      
      if (method === "srp.get_params") {
        return {
          saltHex: this.authBridge.salt,
          BHex: this.authBridge.BHex,
          serverNonce: this.authBridge.sessionId,
          canonicalUsername: this.authBridge.canonicalUsername
        };
      }
      
      if (method === "srp.login") {
        const A = params?.AHex || "";
        const M1 = params?.M1Hex || "";
        const attestationToken = params?.attestationToken || "";
        
        const res = await fetch(getBackendUrl("/api/auth/login-verify"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: this.authBridge.sessionId,
            A,
            M1,
            nonce: this.authBridge.nonce,
            attestationToken
          })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `HTTP error ${res.status}`);
        }
        const data = await res.json();
        
        // Сохраняем токен
        if (data.token && typeof localStorage !== 'undefined') {
          localStorage.setItem("session_token", data.token);
          try {
            // Инициируем аутентификацию внутри WSS сессии
            await this.sendEncrypted("auth", { token: data.token });
          } catch (e) {
            console.error("[TDLibAdapter] Ошибка авто-авторизации WebSocket:", e);
          }
        }
        
        return {
          success: true,
          token: data.token,
          M2Hex: data.M2,
          sessionKeyHex: data.token
        };
      }
    }

    if (this.state !== "ENCRYPTED") {
      return new Promise((resolve, reject) => {
        this.requestQueue.push({ method, params, resolve, reject });
      });
    }

    return this.sendEncrypted(method, params);
  }

  public onUpdate(type: string, callback: UpdateCallback) {
    if (!this.updateListeners.has(type)) {
      this.updateListeners.set(type, new Set());
    }
    this.updateListeners.get(type)!.add(callback);
  }

  public offUpdate(type: string, callback: UpdateCallback) {
    const listeners = this.updateListeners.get(type);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private triggerUpdate(type: string, data: any) {
    const listeners = this.updateListeners.get(type);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (e) {
          console.error(`[TDLibAdapter] Ошибка в коллбеке обновления ${type}:`, e);
        }
      });
    }
  }

  // Локальный симулятор бэкенда для автономного режима (Stateful simulation)
  private async handleOfflineRequest(method: string, params: any): Promise<any> {
    console.log(`[TDLibAdapter Offline] Вызов метода ${method}:`, params);
    
    // Имитация задержки сети
    await new Promise((r) => setTimeout(r, 100));

    if (method === "ping") {
      return "pong";
    }

    if (method === "auth") {
      return { success: true, userId: "owner_m5_step2" };
    }

    // Симуляция методов SRP 6a и PoW для оффлайн-режима
    if (method === "srp.get_params") {
      // Генерируем соль и верификатор на бэкенде (симулируем сохраненные)
      const saltHex = "abcd1234ef9876543210fedcba987654";
      // Сервер генерирует случайный эфемерный ключ b, B = (k*v + g^b) mod N
      const bBytes = new Uint8Array(32);
      crypto.getRandomValues(bBytes);
      let b = 0n;
      for (let i = 0; i < 32; i++) b = (b << 8n) + BigInt(bBytes[i]);
      b = (b % (SRP_N - 1n)) + 1n;

      // Имитируем верификатор v
      const v = 987654321n; // Упрощенный верификатор
      const g = 2n;
      const k = 3n; // Упрощенный коэффициент k
      const BBig = (k * v + modPow(g, b, SRP_N)) % SRP_N;
      
      return {
        saltHex,
        BHex: BBig.toString(16),
        serverNonce: "server_nonce_srp_12345"
      };
    }

    if (method === "srp.login") {
      // Проверяем подтверждение клиента M1. В оффлайн режиме всегда одобряем вход
      // и возвращаем подтверждение M2 и JWT
      const mockSessionKey = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
      const mockM2 = "9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef";
      
      return {
        success: true,
        token: "jwt_token_srp_mock_12345",
        M2Hex: mockM2,
        sessionKeyHex: mockSessionKey,
        userId: "owner_m5_step2"
      };
    }

    if (method === "srp.register") {
      return { success: true };
    }

    if (method === "pow.get_challenge") {
      // Имитируем выдачу задачи Proof-of-Work
      // challengeHex (соль) и сложность (количество лидирующих нулевых бит)
      return {
        challengeHex: "1234567890abcdef1234567890abcdef",
        difficulty: 12 // Умеренная сложность для оффлайн тестов
      };
    }

    if (method === "pow.verify") {
      return { success: true };
    }


    if (method === "read_history") {
      return { success: true };
    }

    if (method === "send_message") {
      const chatId = params.chatId;
      const currentPts = (this.localPtsMap[chatId] || 0) + 1;
      this.localPtsMap[chatId] = currentPts;
      const chat = this.localChats.find((c) => c.id === chatId);
      const newMsg = {
        id: `${chatId}-${Date.now()}`,
        sender: "me",
        senderName: "Я",
        text: params.text,
        pts: currentPts,
        timestamp: Date.now(),
        type: params.type || "text",
        mediaUrl: params.mediaUrl,
        peaks: params.peaks
      };
      if (chat) {
        let lastMsgText = params.text;
        if (params.type === 'sticker') lastMsgText = '🎨 Стикер';
        else if (params.type === 'voice') lastMsgText = '🎤 Голосовое сообщение';
        else if (params.type === 'video_note') lastMsgText = '🎬 Видео-кружок';

        chat.lastMessage = lastMsgText;
        chat.messages.push(newMsg);
      }
      
      // Симулируем ответ от собеседника через 1.5 секунды
      setTimeout(() => {
        const nextPts = (this.localPtsMap[chatId] || 0) + 1;
        this.localPtsMap[chatId] = nextPts;
        
        let replyText = `Эхо-ответ на: "${params.text}"`;
        let replyType = "text";
        let replyMediaUrl = undefined;
        let replyPeaks = undefined;

        if (params.type === "sticker") {
          replyText = "Очень классный стикер!";
        } else if (params.type === "voice") {
          replyText = "Послушал твое сообщение, круто!";
        } else if (params.type === "video_note") {
          replyText = "Отличный кружок!";
        }

        const replyMsg = {
          id: `${chatId}-${Date.now()}`,
          sender: "other",
          senderName: chat ? chat.name : "Собеседник",
          text: replyText,
          pts: nextPts,
          timestamp: Date.now(),
          type: replyType,
          mediaUrl: replyMediaUrl,
          peaks: replyPeaks
        };
        if (chat) {
          chat.lastMessage = replyText;
          chat.messages.push(replyMsg);
        }
        this.triggerUpdate("new_message", {
          chatId: chatId,
          message: replyMsg
        });
      }, 1500);

      return {
        messageId: newMsg.id,
        pts: currentPts
      };
    }

    if (method === "get_history") {
      const chatId = params.chatId;
      const chat = this.localChats.find((c) => c.id === chatId);
      return {
        messages: chat ? chat.messages : [],
        pts: this.localPtsMap[chatId] || 0
      };
    }

    if (method === "get_updates" || method === "updates.getDifference") {
      const lastKnownPts = params.lastKnownPts ?? params.pts ?? 0;
      const chatId = params.chatId;
      const chat = this.localChats.find((c) => c.id === chatId);
      const allUpdates: any[] = [];
      
      if (chat && chat.messages) {
        for (const m of chat.messages) {
          if (m.pts > lastKnownPts) {
            allUpdates.push({
              type: "new_message",
              chatId,
              message: m
            });
          }
        }
      }
      
      const currentPts = this.localPtsMap[chatId] || 0;
      const gapTooLarge = (currentPts - lastKnownPts) > 5000 || lastKnownPts < 0;

      if (gapTooLarge) {
        return {
          updates: [],
          pts: currentPts,
          gapTooLarge: true,
          hasMore: false
        };
      }

      // Сортируем updates по pts по возрастанию
      allUpdates.sort((a, b) => {
        const ptsA = a.pts || a.message?.pts || 0;
        const ptsB = b.pts || b.message?.pts || 0;
        return ptsA - ptsB;
      });

      const limit = 20;
      const hasMore = allUpdates.length > limit;
      const portion = allUpdates.slice(0, limit);
      const nextPts = portion.length > 0 ? (portion[portion.length - 1].message?.pts || portion[portion.length - 1].pts || lastKnownPts) : lastKnownPts;

      return {
        updates: portion,
        pts: hasMore ? nextPts : currentPts,
        gapTooLarge: false,
        hasMore
      };
    }

    throw new Error(`Метод ${method} не поддерживается в автономном режиме`);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    console.log("[TDLibAdapter Heartbeat] Запуск периодического пинга...");
    this.pingIntervalTimer = setInterval(() => {
      console.log("[TDLibAdapter Heartbeat] Отправка пинга...");
      
      if (this.pingTimeoutTimer) {
        clearTimeout(this.pingTimeoutTimer);
      }

      this.pingTimeoutTimer = setTimeout(() => {
        console.warn("[TDLibAdapter Heartbeat] Таймаут получения понга! Превышено время ожидания 5 секунд.");
        this.handleHeartbeatFailure();
      }, 5000);

      this.send("ping")
        .then((res) => {
          console.log("[TDLibAdapter Heartbeat] Получен понг от сервера:", res);
          if (this.pingTimeoutTimer) {
            clearTimeout(this.pingTimeoutTimer);
            this.pingTimeoutTimer = null;
          }
        })
        .catch((err) => {
          console.error("[TDLibAdapter Heartbeat] Ошибка при отправке пинга:", err);
          this.handleHeartbeatFailure();
        });
    }, 15000);
  }

  private handleHeartbeatFailure() {
    if (this.isOfflineMode) return; // уже обработано (например, пробником из focus)
    console.error("[TDLibAdapter Heartbeat] Сбой Heartbeat. Переход в оффлайн-режим и закрытие WebSocket.");
    this.stopHeartbeat();
    // Сразу отклоняем ожидающие запросы и планируем reconnect: на half-open TCP
    // событие onclose от браузера может прийти еще много секунд спустя
    this.enableOfflineMode();
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        console.error("[TDLibAdapter Heartbeat] Ошибка при закрытии WebSocket:", e);
      }
    }
  }

  private stopHeartbeat() {
    console.log("[TDLibAdapter Heartbeat] Остановка пинга и очистка таймеров.");
    if (this.pingIntervalTimer) {
      clearInterval(this.pingIntervalTimer);
      this.pingIntervalTimer = null;
    }
    if (this.pingTimeoutTimer) {
      clearTimeout(this.pingTimeoutTimer);
      this.pingTimeoutTimer = null;
    }
  }

  private rejectAllPendingRequests(reason: string) {
    if (this.pendingRequests.size > 0) {
      console.warn(`[TDLibAdapter] Отклонение всех ожидающих запросов (${this.pendingRequests.size}): ${reason}`);
      this.pendingRequests.forEach((request) => {
        try {
          request.reject(new Error(reason));
        } catch (e) {
          console.error("[TDLibAdapter] Ошибка при отклонении запроса:", e);
        }
      });
      this.pendingRequests.clear();
    }
  }

  public destroy() {
    this.stopHeartbeat();
    if (this.handshakeTimeoutTimer) {
      clearTimeout(this.handshakeTimeoutTimer);
      this.handshakeTimeoutTimer = null;
    }
    this.rejectAllPendingRequests("Адаптер уничтожен");
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
  }
}

export const tdlib = TDLibAdapter.getInstance();
