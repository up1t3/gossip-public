// frontend/src/components/network/TransportShieldSection.tsx
/**
 * RFC-2026-004 & Superpowers Resilience Spec Phase T5:
 * Секция управления мультитранспортной сетью в Сетевом Щите.
 * 
 * Тумблеры и настройки:
 * 1. LAN Transport (settings.transport_lan_enabled) + под-тумблер LAN Media (settings.transport_lan_media).
 * 2. BLE Mesh (settings.offline_mesh_enabled / offlineMeshManager).
 * 3. LoRa Transport (settings.transport_lora_enabled) + кнопка сопряжения LoraPairingScreen.
 * 4. Community Bridge (settings.transport_bridge_enabled) + политика батареи (always, charging_only, unmetered_charging).
 * 5. Детализированный реестр обнаруженных пиров по интерфейсам (LAN, BLE, LoRa).
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Wifi,
  Radio,
  RadioTower,
  Layers,
  Sliders,
  BatteryCharging,
  Shield,
  Smartphone,
} from 'lucide-react';
import { GlassCard, GlassButton } from '../../ui';
import {
  transportManager,
  PeerRecord,
} from '../../core/transport';
import { LANTransport } from '../../core/transport/lan/lan-transport';
import { LoRaTransport } from '../../core/transport/lora/lora-transport';
import { CommunityBridge, BatteryPolicy } from '../../core/transport/bridge/community-bridge';
import { offlineMeshManager } from '../../core/mesh/offline-mesh-manager';
import { LoraPairingScreen } from './LoraPairingScreen';

export interface TransportShieldSectionProps {
  onShowToast?: (msg: string, type: 'info' | 'success' | 'error') => void;
  onOpenChatWithPeer?: (peer: any) => void;
  theme?: 'dark' | 'light' | 'coffee';
  className?: string;
}

export const TransportShieldSection: React.FC<TransportShieldSectionProps> = ({
  onShowToast = () => {},
  onOpenChatWithPeer,
  theme = 'dark',
  className = '',
}) => {
  const { t } = useTranslation(['transports', 'settings', 'common']);

  // 1. Состояние тумблеров
  const [lanEnabled, setLanEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('settings.transport_lan_enabled');
      return v !== null ? JSON.parse(v) : true;
    } catch {
      return true;
    }
  });

  const [lanMediaEnabled, setLanMediaEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('settings.transport_lan_media');
      return v !== null ? JSON.parse(v) : false;
    } catch {
      return false;
    }
  });

  const [bleEnabled, setBleEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('settings.offline_mesh_enabled');
      if (v !== null) return JSON.parse(v);
    } catch {}
    return offlineMeshManager.getSnapshot().isMeshEnabled;
  });

  const [loraEnabled, setLoraEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('settings.transport_lora_enabled');
      return v !== null ? JSON.parse(v) : false;
    } catch {
      return false;
    }
  });

  const [bridgeEnabled, setBridgeEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('settings.transport_bridge_enabled');
      return v !== null ? JSON.parse(v) : false;
    } catch {
      return false;
    }
  });

  const [batteryPolicy, setBatteryPolicy] = useState<BatteryPolicy>(() => {
    try {
      const v = localStorage.getItem('settings.transport_bridge_battery_policy');
      return (v as BatteryPolicy) || 'charging_only';
    } catch {
      return 'charging_only';
    }
  });

  const [isLoraPairingOpen, setIsLoraPairingOpen] = useState(false);
  const [peersList, setPeersList] = useState<PeerRecord[]>(() =>
    transportManager.getPeerRegistry().getActivePeers()
  );

  useEffect(() => {
    let isMounted = true;
    const unsubTransport = transportManager.on('stateChanged', () => {
      if (isMounted) {
        setPeersList(transportManager.getPeerRegistry().getActivePeers());
      }
    });

    const unsubMesh = offlineMeshManager.subscribe((snap) => {
      if (isMounted) {
        setBleEnabled(snap.isMeshEnabled);
      }
    });

    return () => {
      isMounted = false;
      unsubTransport();
      unsubMesh();
    };
  }, []);

  // Сохранение настроек транспорта в localStorage
  const saveTransportSetting = (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      // Также синхронизируем объект gossip_transport_settings
      const current = JSON.parse(localStorage.getItem('gossip_transport_settings') || '{}');
      current[key.replace('settings.', '')] = value;
      localStorage.setItem('gossip_transport_settings', JSON.stringify(current));
    } catch (e) {
      console.warn('[TransportShieldSection] Ошибка сохранения настройки:', e);
    }
  };

  // Переключение LAN
  const handleToggleLan = async (checked: boolean) => {
    setLanEnabled(checked);
    saveTransportSetting('settings.transport_lan_enabled', checked);

    const lan = transportManager.getTransport('lan') as LANTransport | undefined;
    if (lan) {
      try {
        if (checked) {
          await lan.start();
        } else {
          await lan.stop();
        }
      } catch (e) {
        console.warn('[TransportShieldSection] Ошибка переключения LAN:', e);
      }
    }
    transportManager.emit('stateChanged', transportManager.getCompositeState());
    onShowToast(checked ? t('transports.lan_enabled_toast', 'Локальный LAN-транспорт включен') : t('transports.lan_disabled_toast', 'LAN-транспорт отключен'), 'info');
  };

  // Переключение LAN Media
  const handleToggleLanMedia = (checked: boolean) => {
    setLanMediaEnabled(checked);
    saveTransportSetting('settings.transport_lan_media', checked);
    const lan = transportManager.getTransport('lan') as any;
    if (lan && lan.mediaServer) {
      lan.mediaServer.setEnabled?.(checked);
    }
    onShowToast(
      checked
        ? t('transports.lan_media_enabled_toast', 'Прямая передача медиа по Wi-Fi разрешена')
        : t('transports.lan_media_disabled_toast', 'Прямая передача медиа по Wi-Fi отключена'),
      'info'
    );
  };

  // Переключение BLE
  const handleToggleBle = (checked: boolean) => {
    setBleEnabled(checked);
    saveTransportSetting('settings.offline_mesh_enabled', checked);
    offlineMeshManager.toggleMesh(checked);
    onShowToast(checked ? t('transports.ble_enabled_toast', 'BLE Mesh радио включено') : t('transports.ble_disabled_toast', 'BLE Mesh радио отключено'), 'info');
  };

  // Переключение LoRa
  const handleToggleLora = (checked: boolean) => {
    setLoraEnabled(checked);
    saveTransportSetting('settings.transport_lora_enabled', checked);
    const lora = transportManager.getTransport('lora') as LoRaTransport | undefined;
    if (lora) {
      lora.isAvailable = checked;
      if (checked && !lora.driver.getStatus().isConnected) {
        setIsLoraPairingOpen(true);
      }
    }
    transportManager.emit('stateChanged', transportManager.getCompositeState());
    onShowToast(checked ? t('transports.lora_enabled_toast', 'LoRa транспорт активирован') : t('transports.lora_disabled_toast', 'LoRa транспорт отключен'), 'info');
  };

  // Переключение Community Bridge
  const handleToggleBridge = (checked: boolean) => {
    setBridgeEnabled(checked);
    saveTransportSetting('settings.transport_bridge_enabled', checked);
    const bridge = transportManager.getTransport('bridge') as CommunityBridge | undefined;
    if (bridge) {
      bridge.isEnabled = checked;
    }
    transportManager.emit('stateChanged', transportManager.getCompositeState());
    onShowToast(
      checked
        ? t('transports.bridge_enabled_toast', 'Режим ретранслятора (Мост) включен')
        : t('transports.bridge_disabled_toast', 'Режим ретранслятора (Мост) отключен'),
      'info'
    );
  };

  // Изменение политики батареи моста
  const handleBatteryPolicyChange = (policy: BatteryPolicy) => {
    setBatteryPolicy(policy);
    try {
      localStorage.setItem('settings.transport_bridge_battery_policy', policy);
      const current = JSON.parse(localStorage.getItem('gossip_transport_settings') || '{}');
      current['transport_bridge_battery_policy'] = policy;
      localStorage.setItem('gossip_transport_settings', JSON.stringify(current));
    } catch {}

    const bridge = transportManager.getTransport('bridge') as CommunityBridge | undefined;
    if (bridge) {
      bridge.batteryPolicy = policy;
    }
    onShowToast(`${t('transports.battery_policy_title', 'Политика энергосбережения:')} ${policy}`, 'info');
  };

  return (
    <div data-testid="transport-shield-section" className={`space-y-4 ${className}`}>
      {/* ЗАГОЛОВОК СЕКЦИИ */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Shield className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 truncate">
            {t('transports.title', 'Мультитранспортная сеть (Resilience)')}
          </h3>
        </div>
        <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
          Zero-Phantom-Mesh
        </span>
      </div>

      {/* СЕТКА ТУМБЛЕРОВ ТРАНСПОРТОВ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 1. LAN Transport (Wi-Fi / Локальная сеть) */}
        <GlassCard className="p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <Wifi className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-200 block truncate">
                  {t('transports.lan_title', 'Локальная сеть (LAN)')}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  {t('transports.lan_desc', 'Wi-Fi / WSS Direct Peer')}
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                data-testid="toggle-lan-transport"
                checked={lanEnabled}
                onChange={(e) => handleToggleLan(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800/90 ring-1 ring-inset ring-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow-md after:transition-all peer-checked:bg-emerald-500 peer-checked:ring-emerald-400/50"></div>
            </label>
          </div>

          {/* Под-тумблер: Прямая передача медиа по LAN */}
          {lanEnabled && (
            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-300 block">
                  {t('transports.lan_media_title', 'Передача медиа по LAN')}
                </span>
                <span className="text-[9px] text-slate-400">
                  {t('transports.lan_media_desc', 'Прямой HTTP обмен фото и аудио')}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  data-testid="toggle-lan-media"
                  checked={lanMediaEnabled}
                  onChange={(e) => handleToggleLanMedia(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800/90 ring-1 ring-inset ring-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:shadow-md after:transition-all peer-checked:bg-emerald-500 peer-checked:ring-emerald-400/50"></div>
              </label>
            </div>
          )}
        </GlassCard>

        {/* 2. BLE Mesh (Bluetooth Low Energy) */}
        <GlassCard className="p-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
              <Radio className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-slate-200 block truncate">
                {t('transports.ble_title', 'BLE Mesh Радио')}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                {t('transports.ble_desc', 'Связь с устройствами рядом')}
              </span>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              data-testid="toggle-ble-transport"
              checked={bleEnabled}
              onChange={(e) => handleToggleBle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800/90 ring-1 ring-inset ring-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow-md after:transition-all peer-checked:bg-blue-500 peer-checked:ring-blue-400/50"></div>
          </label>
        </GlassCard>

        {/* 3. LoRa Transport (Экстремальный радиоканал) */}
        <GlassCard className="p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                <RadioTower className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-200 block truncate">
                  {t('transports.lora_title', 'Экстремальный канал (LoRa)')}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  {t('transports.lora_desc', 'Heltec V3 / LilyGO / RNode')}
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                data-testid="toggle-lora-transport"
                checked={loraEnabled}
                onChange={(e) => handleToggleLora(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800/90 ring-1 ring-inset ring-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow-md after:transition-all peer-checked:bg-purple-500 peer-checked:ring-purple-400/50"></div>
            </label>
          </div>

          {loraEnabled && (
            <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
              <span className="text-[10px] text-purple-300 font-mono truncate">
                {transportManager.getTransport('lora')?.getStatus?.().isRunning
                  ? t('transports.node_connected', 'Нода подключена')
                  : t('transports.node_not_configured', 'Нода не настроена')}
              </span>
              <GlassButton
                data-testid="btn-open-lora-pairing"
                variant="secondary"
                size="sm"
                onClick={() => setIsLoraPairingOpen(true)}
                className="text-[11px] py-1 px-2 text-purple-300 border-purple-500/30 flex items-center gap-1 flex-shrink-0"
              >
                <Sliders className="w-3 h-3" />
                {t('transports.btn_pairing', 'Сопряжение')}
              </GlassButton>
            </div>
          )}
        </GlassCard>

        {/* 4. Community Bridge (Ретранслятор в облако) */}
        <GlassCard className="p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-200 block truncate">
                  {t('transports.bridge_title', 'Ретранслятор (Мост)')}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  {t('transports.bridge_desc', 'Передача пакетов эфира в облако')}
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                data-testid="toggle-bridge-transport"
                checked={bridgeEnabled}
                onChange={(e) => handleToggleBridge(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800/90 ring-1 ring-inset ring-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow-md after:transition-all peer-checked:bg-amber-500 peer-checked:ring-amber-400/50"></div>
            </label>
          </div>

          {/* Выбор политики энергосбережения */}
          {bridgeEnabled && (
            <div className="pt-2 border-t border-white/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <BatteryCharging className="w-3 h-3 text-amber-400" />
                  {t('transports.battery_policy_title', 'Политика батареи:')}
                </span>
              </div>
              <select
                data-testid="select-battery-policy"
                value={batteryPolicy}
                onChange={(e) => handleBatteryPolicyChange(e.target.value as BatteryPolicy)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-amber-500/50 cursor-pointer font-mono"
              >
                <option value="charging_only">{t('transports.battery_policy_charging', 'Только при зарядке (Рекомендуется)')}</option>
                <option value="always">{t('transports.battery_policy_always', 'Всегда при наличии сети')}</option>
                <option value="unmetered_charging">{t('transports.battery_policy_unmetered_charging', 'Только при зарядке и в Wi-Fi')}</option>
              </select>
            </div>
          )}
        </GlassCard>
      </div>

      {/* РЕЕСТР ОБНАРУЖЕННЫХ ПИРОВ ПО ТРАНСПОРТАМ */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            {t('transports.active_peers', 'Активные пиры мультитранспорта ({{count}})', { count: peersList.length })}
          </h4>
          <span className="text-[10px] text-slate-400 font-mono">
            {t('transports.auto_clean_ttl', 'Автоочистка TTL 40с')}
          </span>
        </div>

        {peersList.length === 0 ? (
          <div className="p-4 rounded-2xl bg-white/2 border border-white/5 text-center flex flex-col items-center justify-center gap-1.5">
            <span className="text-xs font-medium text-slate-300">
              {t('transports.no_peers', 'В зоне досягаемости нет активных пиров')}
            </span>
            <span className="text-[10px] text-slate-400 max-w-xs">
              {t('transports.no_peers_hint', 'Включите Wi-Fi или Bluetooth для локального обмена пакетами между смартфонами.')}
            </span>
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {peersList.map((peer) => {
              const hasLan = Boolean(peer.transports.lan);
              const hasBle = Boolean(peer.transports.ble);
              const hasLora = Boolean(peer.transports.lora);

              return (
                <div
                  key={peer.deviceIdHash}
                  data-testid="transport-peer-item"
                  onClick={() => onOpenChatWithPeer && onOpenChatWithPeer(peer)}
                  className="p-2.5 rounded-xl border bg-white/3 border-white/5 hover:border-purple-500/30 flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-300">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-200">
                          {peer.nodeId ? t('transports.peer_node_prefix', 'Узел {{id}}', { id: peer.nodeId.slice(0, 8) }) : `dev-${peer.deviceIdHash}`}
                        </span>
                        {peer.isRelay && (
                          <span className="text-[9px] bg-amber-500/15 border border-amber-500/30 text-amber-300 px-1.5 py-0.2 rounded font-mono">
                            RELAY
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {t('transports.hash_label', 'Хэш:')} {peer.deviceIdHash} • {new Date(peer.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Бейджи активных транспортов пира */}
                  <div className="flex items-center gap-1">
                    {hasLan && (
                      <span className="text-[9px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                        {t('transports.badge_lan', 'LAN')}
                      </span>
                    )}
                    {hasBle && (
                      <span className="text-[9px] bg-blue-500/15 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                        {t('transports.badge_ble', 'BLE')}
                      </span>
                    )}
                    {hasLora && (
                      <span className="text-[9px] bg-purple-500/15 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                        {t('transports.badge_lora', 'LoRa')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* МОДАЛЬНОЕ ОКНО СОПРЯЖЕНИЯ LORA */}
      <LoraPairingScreen
        isOpen={isLoraPairingOpen}
        onClose={() => setIsLoraPairingOpen(false)}
        onShowToast={onShowToast}
        theme={theme}
      />
    </div>
  );
};
