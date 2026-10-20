// frontend/src/core/network/connection-manager.ts

export type TransportProtocol = 'https' | 'fake_tls' | 'gateway_node' | 'custom' | 'mesh';

export interface GatewayNode {
  id: string;
  name: string;
  url: string;
  protocol: TransportProtocol;
  description: string;
  pingMs?: number;
  status: 'online' | 'slow' | 'offline' | 'probing' | 'untested';
  isOfficial?: boolean;
}

export interface NetworkStateSnapshot {
  mode: 'auto' | 'manual' | 'mesh_only';
  activeGatewayId: string;
  activeGatewayUrl: string;
  currentProtocol: TransportProtocol;
  isOnline: boolean;
  isAntiDpiActive: boolean;
  pingMs: number;
  lastProbeTime: number;
  failedConsecutivePings: number;
  gateways: GatewayNode[];
}

type NetworkListener = (snapshot: NetworkStateSnapshot) => void;

class ConnectionManager {
  private static instance: ConnectionManager;

  private mode: 'auto' | 'manual' | 'mesh_only' = 'auto';
  private activeGatewayId: string = 'official';
  private customGatewayUrl: string = '';
  private customGatewayName: string = 'Мой кастомный шлюз';
  private pingMs: number = 0;
  private isOnline: boolean = true;
  private lastProbeTime: number = 0;
  private failedConsecutivePings: number = 0;
  private probeIntervalTimer: any = null;
  private listeners: Set<NetworkListener> = new Set();

  private defaultGateways: GatewayNode[] = [
    {
      id: 'official',
      name: 'Официальный узел (skuf-net.ru)',
      url: 'https://skuf-net.ru',
      protocol: 'https',
      description: 'Основной высокоскоростной сервер с TLS 1.3 и E2EE',
      status: 'untested',
      isOfficial: true,
    },
    {
      id: 'fake_tls',
      name: 'Fake-TLS Щит (Анти-ТСПУ)',
      url: 'https://skuf-net.ru:8443',
      protocol: 'fake_tls',
      description: 'Маскировка трафика под шум 0xee для обхода блокировок DPI',
      status: 'untested',
      isOfficial: true,
    },
    {
      id: 'gateway_1',
      name: 'Резервный шлюз №1 (Envoy Direct TLS)',
      url: 'https://skuf-net.ru:9443',
      protocol: 'gateway_node',
      description: 'Прямой защищенный TLS-шлюз в обход основного балансировщика',
      status: 'untested',
      isOfficial: true,
    },
  ];

  private gateways: GatewayNode[] = [];
  private networkChangeDebounceTimer: any = null;

  private constructor() {
    this.initFromStorage();
    this.startPeriodicProbe();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
      const navConn = (navigator as any)?.connection || (navigator as any)?.mozConnection || (navigator as any)?.webkitConnection;
      if (navConn && typeof navConn.addEventListener === 'function') {
        navConn.addEventListener('change', () => {
          if (this.networkChangeDebounceTimer) clearTimeout(this.networkChangeDebounceTimer);
          this.networkChangeDebounceTimer = setTimeout(() => {
            console.log('[ConnectionManager] Обнаружена смена сетевого интерфейса / VPN (navigator.connection.change). Проверка активного узла...');
            this.probeActiveGateway();
          }, 600);
        });
      }
    }
  }

  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  private initFromStorage(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      this.rebuildGatewayList();
      return;
    }

    try {
      const savedMode = localStorage.getItem('gossip_network_mode') as any;
      if (savedMode && ['auto', 'manual', 'mesh_only'].includes(savedMode)) {
        this.mode = savedMode;
      }

      const savedGatewayId = localStorage.getItem('gossip_active_gateway_id');
      if (savedGatewayId) {
        this.activeGatewayId = savedGatewayId;
      }

      const savedCustomUrl = localStorage.getItem('gossip_custom_backend_url');
      if (savedCustomUrl) {
        // Лечение устаревшего нерабочего plaintext URL :8080 из старых версий
        if (savedCustomUrl.startsWith('http://') && savedCustomUrl.endsWith(':8080') && !savedCustomUrl.includes('localhost') && !savedCustomUrl.includes('127.0.0.1')) {
          localStorage.removeItem('gossip_custom_backend_url');
          if (this.activeGatewayId === 'custom') {
            this.activeGatewayId = 'official';
            localStorage.setItem('gossip_active_gateway_id', 'official');
          }
        } else {
          this.customGatewayUrl = savedCustomUrl;
        }
      }

      const savedCustomName = localStorage.getItem('gossip_custom_gateway_name');
      if (savedCustomName) {
        this.customGatewayName = savedCustomName;
      }
    } catch (e) {
      console.warn('[ConnectionManager] Ошибка чтения настроек из localStorage:', e);
    }

    this.rebuildGatewayList();
  }

  private rebuildGatewayList(): void {
    this.gateways = [...this.defaultGateways];
    if (this.customGatewayUrl) {
      this.gateways.push({
        id: 'custom',
        name: this.customGatewayName || 'Кастомный шлюз',
        url: this.customGatewayUrl,
        protocol: 'custom',
        description: 'Пользовательский шлюз или локальный сервер',
        status: 'untested',
        isOfficial: false,
      });
    }
  }

  public subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (e) {
        console.error('[ConnectionManager] Ошибка в слушателе:', e);
      }
    });
  }

  public getSnapshot(): NetworkStateSnapshot {
    const activeGw = this.getActiveGatewayNode();
    return {
      mode: this.mode,
      activeGatewayId: this.activeGatewayId,
      activeGatewayUrl: this.getActiveBackendUrl(),
      currentProtocol: activeGw ? activeGw.protocol : 'https',
      isOnline: this.isOnline,
      isAntiDpiActive: activeGw?.protocol === 'fake_tls',
      pingMs: this.pingMs,
      lastProbeTime: this.lastProbeTime,
      failedConsecutivePings: this.failedConsecutivePings,
      gateways: [...this.gateways],
    };
  }

  public getActiveGatewayNode(): GatewayNode | undefined {
    return this.gateways.find((g) => g.id === this.activeGatewayId) || this.gateways[0];
  }

  public getActiveBackendUrl(path?: string): string {
    let baseUrl = 'https://skuf-net.ru';

    if (this.mode === 'mesh_only') {
      baseUrl = 'http://localhost:mesh';
    } else {
      const gw = this.getActiveGatewayNode();
      if (gw && gw.url) {
        baseUrl = gw.url.endsWith('/') ? gw.url.slice(0, -1) : gw.url;
      }
    }

    if (!path) return baseUrl;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }

  public setMode(mode: 'auto' | 'manual' | 'mesh_only'): void {
    this.mode = mode;
    localStorage.setItem('gossip_network_mode', mode);
    this.notify();
    this.probeActiveGateway();
  }

  public setGateway(id: string): void {
    const target = this.gateways.find((g) => g.id === id);
    if (!target) return;

    this.activeGatewayId = id;
    localStorage.setItem('gossip_active_gateway_id', id);

    if (id === 'custom' && target.url) {
      localStorage.setItem('gossip_custom_backend_url', target.url);
    } else if (id !== 'custom') {
      localStorage.removeItem('gossip_custom_backend_url');
    }

    this.notify();
    this.probeActiveGateway();
  }

  public setCustomGateway(url: string, name: string = 'Мой кастомный шлюз'): void {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      this.customGatewayUrl = '';
      localStorage.removeItem('gossip_custom_backend_url');
      localStorage.removeItem('gossip_custom_gateway_name');
      if (this.activeGatewayId === 'custom') {
        this.activeGatewayId = 'official';
        localStorage.setItem('gossip_active_gateway_id', 'official');
      }
    } else {
      this.customGatewayUrl = cleanUrl;
      this.customGatewayName = name;
      localStorage.setItem('gossip_custom_backend_url', cleanUrl);
      localStorage.setItem('gossip_custom_gateway_name', name);
      this.activeGatewayId = 'custom';
      localStorage.setItem('gossip_active_gateway_id', 'custom');
    }

    this.rebuildGatewayList();
    this.notify();
    this.probeActiveGateway();
  }

  public async probeSingleGateway(gw: GatewayNode): Promise<{ pingMs: number; status: GatewayNode['status'] }> {
    const start = performance.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    try {
      const baseUrl = gw.url.endsWith('/') ? gw.url.slice(0, -1) : gw.url;
      // Без кастомных заголовков Cache-Control, чтобы не вызывать лишний CORS OPTIONS preflight на портах :8443 / :9443
      const probeUrl = `${baseUrl}/api/v1/system/health?t=${Date.now()}`;
      const res = await fetch(probeUrl, {
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeout);
      const elapsed = Math.round(performance.now() - start);

      if (res.ok) {
        const status = elapsed < 250 ? 'online' : 'slow';
        gw.pingMs = elapsed;
        gw.status = status;
        return { pingMs: elapsed, status };
      } else {
        gw.status = 'offline';
        return { pingMs: 9999, status: 'offline' };
      }
    } catch {
      clearTimeout(timeout);
      gw.status = 'offline';
      gw.pingMs = 9999;
      return { pingMs: 9999, status: 'offline' };
    }
  }

  public async probeActiveGateway(): Promise<void> {
    const active = this.getActiveGatewayNode();
    if (!active) return;

    active.status = 'probing';
    this.notify();

    let result = await this.probeSingleGateway(active);
    this.lastProbeTime = Date.now();

    // При включении/выключении VPN на Android маршрут перестраивается 0.5–1.5 сек.
    // Если мы на основном узле и первая проверка сорвалась, делаем быстрый повтор через 1.2 сек,
    // чтобы не переключать шлюз ложно при кратковременном мигании интерфейса tun0.
    if (result.status === 'offline' && active.id === 'official' && this.failedConsecutivePings === 0) {
      await new Promise((r) => setTimeout(r, 1200));
      result = await this.probeSingleGateway(active);
      this.lastProbeTime = Date.now();
    }

    if (result.status === 'offline') {
      this.failedConsecutivePings += 1;
      this.isOnline = false;
      this.pingMs = 9999;

      // Smart Shield Auto-Fallback
      if (this.mode === 'auto') {
        await this.handleAutoFallback();
      }
    } else {
      this.failedConsecutivePings = 0;
      this.isOnline = true;
      this.pingMs = result.pingMs;
    }

    this.notify();
  }

  public async probeAllGateways(): Promise<void> {
    this.gateways.forEach((g) => (g.status = 'probing'));
    this.notify();

    await Promise.allSettled(
      this.gateways.map(async (g) => {
        await this.probeSingleGateway(g);
      })
    );

    const active = this.getActiveGatewayNode();
    if (active && active.status !== 'offline' && active.pingMs !== undefined) {
      this.pingMs = active.pingMs;
      this.isOnline = true;
      this.failedConsecutivePings = 0;
    } else if (this.mode === 'auto') {
      await this.handleAutoFallback();
    }

    this.lastProbeTime = Date.now();
    this.notify();
  }

  private async handleAutoFallback(): Promise<void> {
    console.warn('[ConnectionManager] Smart Shield: Потеря связи с текущим шлюзом, запуск авто-поиска...');

    // Всегда проверяем official первым (если мы были на резервном шлюзе), затем fake_tls -> gateway_1 -> custom
    const candidates = ['official', 'fake_tls', 'gateway_1', 'custom'];
    for (const candId of candidates) {
      if (candId === this.activeGatewayId) continue;
      const target = this.gateways.find((g) => g.id === candId);
      if (!target || !target.url) continue;

      const res = await this.probeSingleGateway(target);
      if (res.status !== 'offline') {
        console.log(`[ConnectionManager] Smart Shield: Успешно переключено на узел: ${target.name} (${res.pingMs}ms)`);
        this.activeGatewayId = target.id;
        localStorage.setItem('gossip_active_gateway_id', target.id);
        this.isOnline = true;
        this.pingMs = res.pingMs;
        this.failedConsecutivePings = 0;
        this.notify();
        return;
      }
    }

    console.warn('[ConnectionManager] Все серверные узлы недоступны. Активирован режим Offline Mesh.');
  }

  private handleNetworkChange(isBrowserOnline: boolean): void {
    if (!isBrowserOnline) {
      this.isOnline = false;
      this.notify();
    } else {
      this.probeActiveGateway();
    }
  }

  private startPeriodicProbe(): void {
    if (this.probeIntervalTimer) clearInterval(this.probeIntervalTimer);
    this.probeIntervalTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      this.probeActiveGateway();
    }, 45000);

    // Первый probe запускаем через 1 секунду после старта
    setTimeout(() => {
      this.probeActiveGateway();
    }, 1200);
  }

  public exportConfigUri(): string {
    const gw = this.getActiveGatewayNode();
    const url = gw ? gw.url : 'https://skuf-net.ru';
    const protocol = gw ? gw.protocol : 'https';
    const name = encodeURIComponent(gw ? gw.name : 'Gossip Node');
    return `gossip://gateway?url=${encodeURIComponent(url)}&mode=${this.mode}&proto=${protocol}&name=${name}`;
  }

  public importConfigFromUri(uri: string): boolean {
    try {
      const clean = uri.trim();
      if (!clean.startsWith('gossip://gateway')) return false;

      const parsed = new URL(clean.replace('gossip://', 'http://'));
      const targetUrl = parsed.searchParams.get('url');
      const name = parsed.searchParams.get('name') || 'Импортированный шлюз';

      if (targetUrl) {
        this.setCustomGateway(decodeURIComponent(targetUrl), decodeURIComponent(name));
        return true;
      }
    } catch (e) {
      console.error('[ConnectionManager] Ошибка разбора QR-шлюза:', e);
    }
    return false;
  }
}

export const connectionManager = ConnectionManager.getInstance();
