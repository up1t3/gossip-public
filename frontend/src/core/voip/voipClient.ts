// E:\Boltalka\frontend\src\core\voip\voipClient.ts
import { tdlib } from "../tdlib/tdlib-adapter";

/**
 * Интерфейс для TURN-учетных данных.
 */
export interface TurnCredentials {
  username: string;
  password?: string;
  credential?: string;
  uris: string[];
}

/**
 * Генерирует криптографически непредсказуемый идентификатор звонка (call-<uuid>).
 */
export function generateCallId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `call-${crypto.randomUUID()}`;
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `call-${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Вычисляет детерминированный 32-битный положительный целочисленный ID комнаты Janus VideoRoom на основе callId (FNV-1a 32-bit).
 */
export function getJanusRoomId(callId: string): number {
  if (!callId) return 1234;
  
  // Если передан чисто числовой ID (например, 1234 из тестов)
  if (/^\d{4,9}$/.test(callId)) {
    const parsed = parseInt(callId, 10);
    if (parsed >= 1000 && parsed <= 2147483647) return parsed;
  }

  let hash = 2166136261;
  const bytes = new TextEncoder().encode(callId);
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 2000000000) + 100000;
}

/**
 * Клиент для взаимодействия с VoIP-сервисами Janus и GatewayNode.
 */
export class VoIPClient {
  /**
   * Отправляет запрос к Janus SFU через GatewayNode.
   * @param request Тип запроса (create, attach, message и т.д.)
   * @param sessionId Идентификатор сессии Janus (необязательно)
   * @param handleId Идентификатор хэндла Janus (необязательно)
   * @param sdp SDP-оффер/ансер или JSON-строка trickle-кандидата (необязательно)
   * @param customBody Дополнительное тело запроса (необязательно)
   * @param callId Идентификатор звонка (необязательно)
   * @param room Идентификатор комнаты Janus (необязательно)
   * @param extraParams Дополнительные параметры протокола (jsepType и т.п.)
   */
  public static async janusRequest(
    request: 'create' | 'attach' | 'message' | string,
    sessionId?: string,
    handleId?: string,
    sdp?: string,
    customBody?: any,
    callId?: string,
    room?: number,
    extraParams?: Record<string, unknown>
  ): Promise<any> {
    return tdlib.send("voip_janus_request", {
      request,
      sessionId,
      handleId,
      sdp,
      body: customBody,
      callId,
      room,
      ...(extraParams || {})
    });
  }

  /** Кэш TURN-креденшелов: сервер выдает их с TTL 2 часа, кэшируем на 1 час. */
  private static turnCache: { creds: TurnCredentials; ts: number } | null = null;

  /**
   * Запрашивает TURN учетные данные для обхода NAT и брандмауэров.
   * Повторные вызовы в пределах часа обслуживаются из кэша без сетевого round-trip.
   */
  public static async getTurnCredentials(): Promise<TurnCredentials> {
    if (this.turnCache && Date.now() - this.turnCache.ts < 60 * 60 * 1000) {
      return this.turnCache.creds;
    }
    const creds = await tdlib.send("voip_get_turn_credentials", {});
    if (creds && (creds.uris || creds.username)) {
      this.turnCache = { creds, ts: Date.now() };
    }
    return creds;
  }

  /**
   * Запрашивает ICE Restart при потере соединения или смене сетевого интерфейса.
   * @param callId Идентификатор активного звонка
   * @param jsep SDP-оффер/состояние сигнализации для перезапуска
   * @param sessionId Идентификатор сессии Janus (необязательно)
   * @param handleId Идентификатор хэндла Janus (необязательно)
   */
  public static async iceRestart(
    callId: string,
    jsep?: any,
    sessionId?: string,
    handleId?: string
  ): Promise<any> {
    return tdlib.send("voip_ice_restart", { callId, jsep, sessionId, handleId });
  }

  /**
   * Отправляет приглашение к звонку собеседнику.
   */
  public static async inviteCall(chatId: string, callId: string, callerName: string, media: 'audio' | 'video' = 'video', callerAvatar?: string): Promise<any> {
    return tdlib.send("voip_call_invite", { chatId, callId, callerName, media, callerAvatar });
  }

  /**
   * Принимает звонок.
   */
  public static async acceptCall(callId: string): Promise<any> {
    return tdlib.send("voip_call_accept", { callId });
  }

  /**
   * Отклоняет звонок.
   */
  public static async declineCall(callId: string, reason: string = 'declined'): Promise<any> {
    return tdlib.send("voip_call_decline", { callId, reason });
  }
}

