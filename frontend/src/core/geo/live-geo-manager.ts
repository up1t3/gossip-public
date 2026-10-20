/**
 * R4 (M4.1, решение Q5): LiveGeoManager — трансляция живой геолокации.
 * Регламент строго по спеке §12.1:
 *  - порог смещения > 25 м (Haversine) И интервал ≥ 15 с;
 *  - heartbeat-обновление раз в 5 минут даже без движения;
 *  - enableHighAccuracy: false (батарея: GPS-чип даёт 5–10%/час);
 *  - только на переднем плане (visibilitychange → пауза/возобновление);
 *  - фоновый трекинг запрещён политикой.
 * Координаты в чат уходят E2EE-правками сообщения (edit_message);
 * REST-эндпоинт live-location — только для серверной онлайн-карты.
 */

export interface LiveGeoPoint {
  latitude: number;
  longitude: number;
  heading?: number | null;
  timestamp: number;
}

export interface LiveGeoOptions {
  chatId: string;
  durationMs: number;
  onPoint: (point: LiveGeoPoint) => void;
  onExpired: () => void;
}

const MIN_INTERVAL_MS = 15000;
const HEARTBEAT_INTERVAL_MS = 300000;
const MIN_DISTANCE_M = 25;

export function calculateHaversineDistanceM(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export class LiveGeoManager {
  private static instance: LiveGeoManager;
  static getInstance(): LiveGeoManager {
    if (!LiveGeoManager.instance) LiveGeoManager.instance = new LiveGeoManager();
    return LiveGeoManager.instance;
  }

  private watchId: number | null = null;
  private lastSent: LiveGeoPoint | null = null;
  private lastSentAt = 0;
  private expiresAt = 0;
  private opts: LiveGeoOptions | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private expiryTimer: ReturnType<typeof setInterval> | null = null;
  private onVisibilityChange: (() => void) | null = null;
  isLivePaused = false;

  get isActive(): boolean {
    return this.watchId !== null;
  }

  get activeChatId(): string | null {
    return this.opts?.chatId ?? null;
  }

  start(opts: LiveGeoOptions): void {
    this.stop();
    this.opts = opts;
    this.expiresAt = Date.now() + opts.durationMs;
    this.lastSent = null;
    this.lastSentAt = 0;

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => this.handlePosition(pos.coords.latitude, pos.coords.longitude, pos.coords.heading ?? null),
        (err) => console.warn("[LiveGeo] watchPosition error:", err.message),
        { enableHighAccuracy: false, maximumAge: 30000, timeout: 20000 }
      );
    }

    // Foreground-only (Q5): пауза при уходе в фон
    this.onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        this.isLivePaused = true;
      } else {
        this.isLivePaused = false;
      }
    };
    document.addEventListener("visibilitychange", this.onVisibilityChange);

    this.heartbeatTimer = setInterval(() => {
      if (this.lastSent && !this.isLivePaused) {
        this.emit(this.lastSent.latitude, this.lastSent.longitude, this.lastSent.heading ?? null, true);
      }
    }, HEARTBEAT_INTERVAL_MS);

    this.expiryTimer = setInterval(() => {
      if (Date.now() >= this.expiresAt) {
        this.opts?.onExpired();
        this.stop();
      }
    }, 15000);
  }

  stop(): void {
    if (this.watchId !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    this.watchId = null;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.expiryTimer) clearInterval(this.expiryTimer);
    this.heartbeatTimer = null;
    this.expiryTimer = null;
    if (this.onVisibilityChange) {
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
      this.onVisibilityChange = null;
    }
    this.opts = null;
    this.lastSent = null;
    this.isLivePaused = false;
  }

  private handlePosition(lat: number, lon: number, heading: number | null): void {
    if (this.isLivePaused || !this.opts) return;
    const now = Date.now();
    const distance = this.lastSent
      ? calculateHaversineDistanceM(this.lastSent.latitude, this.lastSent.longitude, lat, lon)
      : Infinity;
    if (distance >= MIN_DISTANCE_M && now - this.lastSentAt >= MIN_INTERVAL_MS) {
      this.emit(lat, lon, heading);
    }
  }

  private emit(lat: number, lon: number, heading: number | null, isHeartbeat = false): void {
    if (!this.opts) return;
    this.lastSent = { latitude: lat, longitude: lon, heading, timestamp: Date.now() };
    this.lastSentAt = Date.now();
    if (!isHeartbeat) console.debug("[LiveGeo] emit", lat.toFixed(5), lon.toFixed(5));
    this.opts.onPoint(this.lastSent);
  }
}

export const liveGeoManager = LiveGeoManager.getInstance();
