// frontend/src/components/network/TransportBadge.tsx
/**
 * RFC-2026-004 & Superpowers Resilience Spec:
 * Zero-Phantom 4-Color Multi-Transport Badge & Tooltip
 * 
 * Индикатор состояния сети:
 * 🟢 cloud_online   — Прямое подключение к WSS шлюзу облака (emerald)
 * 🔵 mesh_active    — Автономный P2P/Mesh обмен через LAN / BLE / LoRa (blue/cyan)
 * 🟡 mesh_searching — Поиск соседей в эфире (amber, pulse)
 * ⚪ offline        — Нет подключения и радио выключено (zinc/slate)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Wifi,
  Radio,
  RadioTower,
  Layers,
  Shield,
} from 'lucide-react';
import {
  transportManager,
  CompositeTransportState,
} from '../../core/transport';
import {
  connectionManager,
  NetworkStateSnapshot,
} from '../../core/network/connection-manager';
import {
  offlineMeshManager,
  MeshStateSnapshot,
} from '../../core/mesh/offline-mesh-manager';
import { NetworkStatus, evaluateNetworkComposite } from '../../core/network/network-evaluator';

export interface TransportBadgeProps {
  onClick?: () => void;
  className?: string;
  theme?: 'dark' | 'light' | 'coffee';
  showTooltip?: boolean;
  compact?: boolean;
}

export const TransportBadge: React.FC<TransportBadgeProps> = ({
  onClick,
  className = '',
  theme = 'dark',
  showTooltip = true,
  compact = false,
}) => {
  const { t } = useTranslation(['transports', 'settings', 'common']);
  const [compositeState, setCompositeState] = useState<CompositeTransportState>(() =>
    transportManager.getCompositeState()
  );
  const [netSnapshot, setNetSnapshot] = useState<NetworkStateSnapshot>(() =>
    connectionManager.getSnapshot()
  );
  const [meshSnapshot, setMeshSnapshot] = useState<MeshStateSnapshot>(() =>
    offlineMeshManager.getSnapshot()
  );
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const tooltipTimeoutRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;
    // Подписка на TransportManager
    const unsubTransport = transportManager.on('stateChanged', (state: CompositeTransportState) => {
      if (isMounted) setCompositeState(state);
    });

    // Подписка на ConnectionManager
    const unsubNet = connectionManager.subscribe((snap) => {
      if (isMounted) setNetSnapshot(snap);
    });

    // Подписка на OfflineMeshManager
    const unsubMesh = offlineMeshManager.subscribe((snap) => {
      if (isMounted) setMeshSnapshot(snap);
    });

    return () => {
      isMounted = false;
      unsubTransport();
      unsubNet();
      unsubMesh();
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  // Zero-Phantom-Mesh вычисление статуса через эталонный evaluateNetworkComposite (§14)
  const lanPeers = compositeState.peersByTransport?.lan ?? 0;
  const blePeers = compositeState.peersByTransport?.ble ?? meshSnapshot.peers?.length ?? 0;
  const loraPeers = compositeState.peersByTransport?.lora ?? 0;
  const totalPeers = Math.max(
    compositeState.totalPeersCount || 0,
    typeof transportManager.getAllPeers === 'function' ? transportManager.getAllPeers().length : 0,
    meshSnapshot.peers?.length || 0
  );

  const effectivePeers = (meshSnapshot.peers && meshSnapshot.peers.length >= totalPeers)
    ? meshSnapshot.peers
    : new Array(totalPeers).fill({ id: 'active_peer' });

  const networkDetails = evaluateNetworkComposite(
    {
      isOnline: netSnapshot.isOnline,
      wsConnected: (netSnapshot as any).wsConnected,
      pingMs: netSnapshot.pingMs,
      isAntiDpiActive: netSnapshot.isAntiDpiActive,
      currentProtocol: netSnapshot.currentProtocol,
    },
    {
      isMeshEnabled: meshSnapshot.isMeshEnabled && meshSnapshot.isBluetoothEnabled !== false,
      isNativeBleSupported: meshSnapshot.isNativeBleSupported ?? true,
      isBluetoothEnabled: meshSnapshot.isBluetoothEnabled,
      peers: meshSnapshot.isBluetoothEnabled === false ? [] : effectivePeers,
      isScanning: meshSnapshot.isBluetoothEnabled === false ? false : meshSnapshot.isScanning,
    }
  );

  const status: NetworkStatus = networkDetails.status;

  const getBadgeText = (): string => {
    if (status === 'cloud_online') {
      if (netSnapshot.pingMs && netSnapshot.pingMs > 0 && netSnapshot.pingMs < 9999) {
        return `${netSnapshot.pingMs}ms`;
      }
      return 'Online';
    }

    if (status === 'mesh_active') {
      const activeTypes = compositeState.activeTransports || [];
      if (activeTypes.includes('lora') && !activeTypes.includes('lan') && !activeTypes.includes('ble')) {
        return 'LoRa (Ext)';
      }
      if (activeTypes.includes('lan') && activeTypes.includes('ble')) {
        return `Mesh (${totalPeers}) · LAN+BLE`;
      }
      if (activeTypes.includes('lan')) {
        return `Mesh (${totalPeers}) · LAN`;
      }
      if (activeTypes.includes('ble')) {
        return `Mesh (${totalPeers}) · BLE`;
      }
      return `Mesh (${totalPeers})`;
    }

    if (status === 'mesh_searching') {
      return compact
        ? t('transports.searching_short', 'Поиск...')
        : t('status_mesh_searching', t('transports.status_mesh_searching', 'Поиск пиров...'));
    }

    return t('status_offline', t('transports.status_offline', 'Офлайн'));
  };

  // 4-цветная схема индикатора (Zero-Phantom §14)
  const getDotStyle = () => {
    switch (status) {
      case 'cloud_online':
        return {
          dotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]',
          badgeBorder: 'border-emerald-500/30 hover:border-emerald-500/50 bg-emerald-500/10',
          textColor: 'text-emerald-300',
        };
      case 'mesh_active':
        return {
          dotClass: 'bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.7)]',
          badgeBorder: 'border-blue-500/30 hover:border-blue-500/50 bg-blue-500/10',
          textColor: 'text-blue-300',
        };
      case 'mesh_searching':
        return {
          dotClass: 'bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.7)]',
          badgeBorder: 'border-amber-500/30 hover:border-amber-500/50 bg-amber-500/10',
          textColor: 'text-amber-300',
        };
      case 'offline':
      default:
        return {
          dotClass: 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.7)]',
          badgeBorder: 'border-red-500/30 hover:border-red-500/50 bg-red-500/10',
          textColor: 'text-red-400',
        };
    }
  };

  const { dotClass, badgeBorder, textColor } = getDotStyle();

  const handleMouseEnter = () => {
    if (!showTooltip) return;
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    setIsTooltipOpen(true);
  };

  const handleMouseLeave = () => {
    if (!showTooltip) return;
    tooltipTimeoutRef.current = setTimeout(() => {
      setIsTooltipOpen(false);
    }, 250);
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        data-testid="transport-badge"
        onClick={onClick}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all active:scale-95 cursor-pointer backdrop-blur-md ${badgeBorder} ${className}`}
        title={t('transports.badge_title', 'Сетевой щит и мультитранспортный статус')}
      >
        <span
          data-testid="transport-badge-dot"
          className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${dotClass}`}
        />
        <span className={`font-mono ${textColor}`}>
          {getBadgeText()}
        </span>
      </button>

      {/* ВСПЛЫВАЮЩИЙ ТУЛТИП С АКТИВНЫМИ ТРАНСПОРТАМИ */}
      {showTooltip && isTooltipOpen && (
        <div
          data-testid="transport-tooltip"
          className={`absolute top-full mt-2 left-0 sm:left-auto sm:right-0 z-[99999] w-64 p-3 rounded-2xl border shadow-glass-lg backdrop-blur-xl animate-fade-in ${
            theme === 'coffee'
              ? 'bg-[#1A120B]/95 border-[#D5CEA3]/30 text-[#E5E5CB]'
              : theme === 'light'
              ? 'bg-white/95 border-slate-200 text-slate-800 shadow-xl'
              : 'bg-neutral-900/95 border-purple-500/30 text-slate-200'
          }`}
        >
          {/* Заголовок статуса */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${dotClass}`} />
              <span className="text-xs font-bold font-mono">
                {status === 'cloud_online'
                  ? t('transports.cloud_gateway', 'Облачный шлюз (WSS)')
                  : status === 'mesh_active'
                  ? t('transports.multi_mesh', 'Мультитранспортный Mesh')
                  : status === 'mesh_searching'
                  ? t('transports.searching_nodes', 'Поиск узлов')
                  : t('transports.offline_no_links', 'Офлайн (нет линков)')}
              </span>
            </div>
            <Shield className="w-3.5 h-3.5 text-purple-400" />
          </div>

          {/* Список транспортов и найденных пиров */}
          <div className="space-y-1.5 text-[11px]">
            {/* LAN */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>LAN / Wi-Fi:</span>
              </div>
              <span className="font-mono text-emerald-300 font-semibold">
                {compositeState.activeTransports?.includes('lan')
                  ? t('transports.lan_peers_count', '{{count}} пиров', { count: lanPeers })
                  : t('transports.disabled', 'выключен')}
              </span>
            </div>

            {/* BLE */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-blue-400" />
                <span>BLE Mesh:</span>
              </div>
              <span className="font-mono text-blue-300 font-semibold">
                {compositeState.activeTransports?.includes('ble')
                  ? t('transports.ble_peers_count', '{{count}} узлов', { count: blePeers })
                  : t('transports.disabled', 'выключен')}
              </span>
            </div>

            {/* LoRa */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <RadioTower className="w-3.5 h-3.5 text-purple-400" />
                <span>{t('transports.lora_radio_label', 'LoRa Радио:')}</span>
              </div>
              <span className="font-mono text-purple-300 font-semibold">
                {compositeState.activeTransports?.includes('lora')
                  ? t('transports.lora_peers_count', '{{count}} узлов (Ext)', { count: loraPeers })
                  : t('transports.not_connected', 'не подключен')}
              </span>
            </div>

            {/* Bridge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('transports.bridge_label', 'Мост (Bridge):')}</span>
              </div>
              <span className="font-mono text-amber-300 font-semibold">
                {compositeState.activeTransports?.includes('bridge')
                  ? t('transports.active', 'активен')
                  : t('transports.disabled', 'выключен')}
              </span>
            </div>
          </div>

          {/* Подсказка */}
          <div className="mt-2.5 pt-2 border-t border-white/10 text-[10px] text-slate-400 text-center">
            {t('transports.hint_open_shield', 'Нажмите для открытия Сетевого Щита')}
          </div>
        </div>
      )}
    </div>
  );
};

