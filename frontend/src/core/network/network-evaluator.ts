// frontend/src/core/network/network-evaluator.ts
/**
 * RFC-2026-004 § 4.5 & AGENTS.md § 14: Zero-Phantom-Mesh Rule & 4-Color Status Evaluator.
 * 
 * Предоставляет строгую оценку физического и композитного состояния сети:
 * 🟢 cloud_online   — WSS / Cloud шлюз подключен и отвечает (приоритет облака).
 * 🔵 mesh_active    — Нет облака, но Bluetooth/Mesh включен и найдено >= 1 пиров в эфире.
 * 🟡 mesh_searching — Нет облака, Bluetooth/Mesh включен, идет поиск/сканирование (0 пиров).
 * 🔴 offline        — Нет облака и Bluetooth/Mesh выключен или недоступен.
 */

export type NetworkStatus = 'cloud_online' | 'mesh_active' | 'mesh_searching' | 'offline';

export interface NetworkStatusDetails {
  status: NetworkStatus;
  colorClass: string; // Tailwind text color
  dotClass: string;   // Tailwind background & animation for status dot
  text: string;       // Short badge text (e.g. "42ms", "Online", "Mesh (3)", "Поиск пиров...", "Офлайн")
  label: string;      // Full descriptive label
  pingMs?: number;
  peerCount: number;
  isAntiDpiActive?: boolean;
}

/**
 * Чистая функция оценки композитного статуса сети (Zero-Phantom-Mesh Rule)
 * 
 * @param wsConnected - признак активного подключения к WebSocket/Cloud шлюзу
 * @param btEnabled   - признак аппаратной готовности и включения Bluetooth/Mesh
 * @param peerCount   - количество активных обнаруженных пиров в радиоэфире
 */
export function evaluateNetworkStatus(
  wsConnected: boolean,
  btEnabled: boolean,
  peerCount: number
): NetworkStatus {
  // 1. Приоритет облака (Cloud Online)
  if (wsConnected) {
    return 'cloud_online';
  }

  // 2. Mesh активен и есть физические соседи
  if (btEnabled && peerCount > 0) {
    return 'mesh_active';
  }

  // 3. Mesh включен, но в эфире 0 соседей (поиск)
  if (btEnabled && peerCount === 0) {
    return 'mesh_searching';
  }

  // 4. Полный оффлайн (Bluetooth выключен или недоступен)
  return 'offline';
}

/**
 * Получение UI-деталей для вычисленного сетевого статуса
 */
export function getNetworkStatusDetails(
  status: NetworkStatus,
  options?: {
    pingMs?: number;
    peerCount?: number;
    isAntiDpiActive?: boolean;
    currentProtocol?: string;
  }
): NetworkStatusDetails {
  const pingMs = options?.pingMs ?? 0;
  const peerCount = options?.peerCount ?? 0;
  const isAntiDpi = !!options?.isAntiDpiActive;
  const protocol = (options?.currentProtocol || 'WSS').toUpperCase();

  switch (status) {
    case 'cloud_online':
      return {
        status,
        colorClass: isAntiDpi ? 'text-purple-400' : 'text-emerald-400',
        dotClass: isAntiDpi ? 'bg-purple-400 animate-pulse' : 'bg-emerald-400',
        text: pingMs > 0 && pingMs < 9999 ? `${pingMs}ms` : 'Online',
        label: isAntiDpi ? `${protocol} • Anti-DPI (${pingMs < 9999 ? `${pingMs} ms` : 'ОК'})` : `${protocol} • ${pingMs < 9999 ? `${pingMs} ms` : 'ОК'}`,
        pingMs,
        peerCount,
        isAntiDpiActive: isAntiDpi,
      };

    case 'mesh_active':
      return {
        status,
        colorClass: 'text-cyan-400',
        dotClass: 'bg-cyan-400 animate-pulse',
        text: `Mesh (${peerCount})`,
        label: `BLE Mesh Активен (${peerCount} ${peerCount === 1 ? 'узел' : peerCount < 5 ? 'узла' : 'узлов'})`,
        pingMs: undefined,
        peerCount,
        isAntiDpiActive: false,
      };

    case 'mesh_searching':
      return {
        status,
        colorClass: 'text-amber-400',
        dotClass: 'bg-amber-400 animate-pulse',
        text: 'Поиск пиров...',
        label: 'Поиск пиров Mesh...',
        pingMs: undefined,
        peerCount: 0,
        isAntiDpiActive: false,
      };

    case 'offline':
    default:
      return {
        status: 'offline',
        colorClass: 'text-red-400',
        dotClass: 'bg-red-400',
        text: 'Офлайн',
        label: 'Офлайн (нет сети)',
        pingMs: undefined,
        peerCount: 0,
        isAntiDpiActive: false,
      };
  }
}

/**
 * Композитная оценка на основе снепшотов ConnectionManager и OfflineMeshManager
 *
 * §14 (Zero-Phantom-Mesh Rule) работает в обе стороны: Cloud Online определяется
 * именно живым WebSocket к шлюзу. Если известен wsConnected, он — первичная истина;
 * HTTP-проба шлюза (netState.isOnline) — фоллбек, её одиночные сбои не должны
 * топить статус при живом сокете (дефект F-15: сообщение доставлялось с ✓,
 * а шапка показывала жёлтый «Поиск пиров...»).
 */
export function evaluateNetworkComposite(
  netState: {
    isOnline: boolean;
    /** Фактическое состояние WebSocket к облачному шлюзу (tdlib connection_state) */
    wsConnected?: boolean;
    pingMs?: number;
    isAntiDpiActive?: boolean;
    currentProtocol?: string;
  },
  meshState: {
    isMeshEnabled: boolean;
    isNativeBleSupported?: boolean;
    isBluetoothEnabled?: boolean;
    peers: Array<any>;
    isScanning?: boolean;
  }
): NetworkStatusDetails {
  const isBtActive = meshState.isMeshEnabled && (
    meshState.isNativeBleSupported
      ? (meshState.isBluetoothEnabled ?? true)
      : true
  );

  const isCloudOnline = netState.wsConnected !== undefined
    ? netState.wsConnected
    : netState.isOnline;

  const status = evaluateNetworkStatus(
    isCloudOnline,
    isBtActive,
    meshState.peers ? meshState.peers.length : 0
  );

  return getNetworkStatusDetails(status, {
    pingMs: netState.pingMs,
    peerCount: meshState.peers ? meshState.peers.length : 0,
    isAntiDpiActive: netState.isAntiDpiActive,
    currentProtocol: netState.currentProtocol,
  });
}
