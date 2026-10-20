// frontend/src/components/network/NetworkShieldModal.tsx

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import {
  Shield,
  Radio,
  QrCode,
  Zap,
  CheckCircle2,
  RefreshCw,
  Copy,
  Server,
  Share2,
  ArrowRight,
  RadioTower,
  Smartphone,
  Laptop,
  Check,
  Send,
  CloudUpload,
  Layers,
  MessageSquare,
} from 'lucide-react';
import { GlassModal, GlassButton, GlassInput, GlassCard } from '../../ui';
import { RadarCanvas } from './RadarCanvas';
import { TransportShieldSection } from './TransportShieldSection';
import {
  connectionManager,
  NetworkStateSnapshot,
  GatewayNode,
} from '../../core/network/connection-manager';
import {
  offlineMeshManager,
  MeshStateSnapshot,
  MeshPeer,
} from '../../core/mesh/offline-mesh-manager';
import { evaluateNetworkComposite } from '../../core/network/network-evaluator';

interface NetworkShieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (msg: string, type: 'info' | 'success' | 'error') => void;
  onOpenChatWithPeer?: (peer: MeshPeer) => void;
  theme?: 'dark' | 'light' | 'coffee';
}

export const NetworkShieldModal: React.FC<NetworkShieldModalProps> = ({
  isOpen,
  onClose,
  onShowToast = () => {},
  onOpenChatWithPeer,
  theme = 'dark',
}) => {
  const { t } = useTranslation(['transports', 'common']);
  const [activeTab, setActiveTab] = useState<'shield' | 'radar' | 'qr'>('shield');
  const [netState, setNetState] = useState<NetworkStateSnapshot>(() => connectionManager.getSnapshot());
  const [meshState, setMeshState] = useState<MeshStateSnapshot>(() => offlineMeshManager.getSnapshot());

  const [customInputUrl, setCustomInputUrl] = useState('');
  const [customInputName, setCustomInputName] = useState('');
  const [importUriInput, setImportUriInput] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [selectedPeer, setSelectedPeer] = useState<MeshPeer | null>(null);
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [isFlushingCloud, setIsFlushingCloud] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showAdvancedGateways, setShowAdvancedGateways] = useState(false);

  const getGatewayName = (gw: GatewayNode): string => {
    if (gw.id === 'official') return t('shield.gw_official_name', gw.name);
    if (gw.id === 'fake_tls') return t('shield.gw_fake_tls_name', gw.name);
    if (gw.id === 'gateway_1') return t('shield.gw_gateway_1_name', gw.name);
    if (gw.id === 'custom' && (gw.name === 'Кастомный шлюз' || gw.name === 'Мой кастомный шлюз' || gw.name === 'Пользовательский узел')) {
      return t('shield.gw_custom_name', gw.name);
    }
    return gw.name;
  };

  const getGatewayDesc = (gw: GatewayNode): string => {
    if (gw.id === 'official') return t('shield.gw_official_desc', gw.description);
    if (gw.id === 'fake_tls') return t('shield.gw_fake_tls_desc', gw.description);
    if (gw.id === 'gateway_1') return t('shield.gw_gateway_1_desc', gw.description);
    if (gw.id === 'custom') return t('shield.gw_custom_desc', gw.description);
    return gw.description;
  };

  useEffect(() => {
    const unsubNet = connectionManager.subscribe(setNetState);
    const unsubMesh = offlineMeshManager.subscribe((snapshot) => {
      setMeshState(snapshot);
      // Если выбранный узел обновился в списке — синхронизируем данные
      if (selectedPeer) {
        const updated = snapshot.peers.find((p) => p.id === selectedPeer.id);
        if (updated) setSelectedPeer(updated);
      }
    });

    return () => {
      unsubNet();
      unsubMesh();
    };
  }, [selectedPeer]);

  // Активация высокоскоростного режима BLE сканирования при открытии экрана радара
  useEffect(() => {
    if (isOpen && activeTab === 'radar') {
      offlineMeshManager.setRadarActive(true);
    } else {
      offlineMeshManager.setRadarActive(false);
    }
    return () => {
      offlineMeshManager.setRadarActive(false);
    };
  }, [isOpen, activeTab]);

  // Генерация QR-кода при открытии вкладки QR или смене шлюза с учетом темы
  useEffect(() => {
    if (activeTab === 'qr') {
      const uri = connectionManager.exportConfigUri();
      const isCoffee = theme === 'coffee';
      const isLight = theme === 'light';
      const darkColor = isCoffee ? '#D5CEA3' : (isLight ? '#0f172a' : '#c084fc');
      const lightColor = isCoffee ? '#1A120B' : (isLight ? '#ffffff' : '#0a0a14');
      QRCode.toDataURL(uri, {
        width: 320,
        margin: 2,
        color: {
          dark: darkColor,
          light: lightColor,
        },
      })
        .then(setQrDataUrl)
        .catch((e: any) => console.error('[NetworkShieldModal] Ошибка генерации QR:', e));
    }
  }, [activeTab, netState.activeGatewayId, theme]);

  const handleToggleSmartShield = (enabled: boolean) => {
    connectionManager.setMode(enabled ? 'auto' : 'manual');
    onShowToast(
      enabled
        ? t('shield.toast_smart_shield_on', 'Умный авто-щит включен: шлюзы переключаются автоматически при блокировках')
        : t('shield.toast_smart_shield_off', 'Ручной режим выбора шлюзов активирован'),
      'info'
    );
  };

  const handleSelectGateway = (gw: GatewayNode) => {
    connectionManager.setGateway(gw.id);
    onShowToast(t('shield.toast_gateway_selected', 'Выбран узел связи: {{name}}', { name: getGatewayName(gw) }), 'success');
  };

  const handleTestAll = async () => {
    setIsTestingAll(true);
    await connectionManager.probeAllGateways();
    setIsTestingAll(false);
    onShowToast(t('shield.toast_probe_done', 'Диагностика задержки всех сетевых узлов завершена'), 'success');
  };

  const handleSaveCustomGateway = () => {
    if (!customInputUrl.trim()) {
      onShowToast(t('shield.toast_enter_valid_url', 'Введите корректный адрес шлюза (URL или IP)'), 'error');
      return;
    }
    connectionManager.setCustomGateway(
      customInputUrl.trim(),
      customInputName.trim() || t('shield.gw_custom_name', 'Пользовательский узел')
    );
    setCustomInputUrl('');
    setCustomInputName('');
    onShowToast(t('shield.toast_custom_saved', 'Кастомный шлюз успешно сохранен и активирован'), 'success');
  };

  const handleImportUri = () => {
    if (!importUriInput.trim()) {
      onShowToast(t('shield.toast_paste_uri', 'Вставьте ссылку конфигурации формата gossip://gateway?...'), 'error');
      return;
    }
    const success = connectionManager.importConfigFromUri(importUriInput.trim());
    if (success) {
      setImportUriInput('');
      onShowToast(t('shield.toast_uri_imported', 'Конфигурация шлюза успешно импортирована!'), 'success');
    } else {
      onShowToast(t('shield.toast_uri_invalid', 'Неверный формат ссылки конфигурации шлюза'), 'error');
    }
  };

  const handleCopyInviteUri = () => {
    const uri = connectionManager.exportConfigUri();
    navigator.clipboard
      .writeText(uri)
      .then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
        onShowToast(t('shield.toast_uri_copied', 'Ссылка конфигурации шлюза скопирована в буфер!'), 'success');
      })
      .catch(() => onShowToast(t('shield.toast_uri_copy_failed', 'Не удалось скопировать ссылку'), 'error'));
  };

  const handleFlushQueue = async () => {
    if (!netState.isOnline) {
      onShowToast(t('shield.toast_flush_offline', 'Сброс в облако невозможен: нет активного подключения к интернету'), 'error');
      return;
    }
    setIsFlushingCloud(true);
    const count = await offlineMeshManager.flushQueueToCloud(netState.activeGatewayUrl);
    setIsFlushingCloud(false);
    if (count > 0) {
      onShowToast(t('shield.toast_flush_success', 'Успешно передано в облако {{count}} офлайн-конвертов', { count }), 'success');
    } else {
      onShowToast(t('shield.toast_flush_empty', 'Очередь конвертов пуста или сервер недоступен'), 'info');
    }
  };

  const handleSendTestPing = (peer: MeshPeer) => {
    offlineMeshManager.enqueueEnvelope(
      peer.id,
      JSON.stringify({ type: 'PING', text: 'BLE Mesh Ping', time: Date.now() })
    );
    onShowToast(t('shield.toast_ping_sent', 'Тестовый пакет отправлен узлу {{name}}', { name: peer.name }), 'success');
  };

  const netStatusDetails = evaluateNetworkComposite(netState, meshState);

  const getLocalizedFooterLabel = (): string => {
    if (netStatusDetails.status === 'mesh_active') {
      return t('shield.status_mesh_active_label', netStatusDetails.label, { count: netStatusDetails.peerCount });
    }
    if (netStatusDetails.status === 'mesh_searching') {
      return t('shield.status_mesh_searching_label', netStatusDetails.label);
    }
    if (netStatusDetails.status === 'offline') {
      return t('shield.status_offline_label', netStatusDetails.label);
    }
    return netStatusDetails.label.replace('ОК', 'OK');
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('shield.modal_title', 'Сетевой Центр и Защита связи')}
      size="lg"
      fullScreenMobile={true}
      footer={
        <div className="flex justify-between items-center gap-2 w-full min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-300 min-w-0 flex-1">
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${netStatusDetails.dotClass}`}
            />
            <span className="font-mono font-medium truncate">
              {getLocalizedFooterLabel()}
            </span>
          </div>
          <GlassButton variant="secondary" size="sm" onClick={onClose} className="flex-shrink-0">
            {t('shield.close', 'Закрыть')}
          </GlassButton>
        </div>
      }
    >
      {/* Навигационные табы - адаптивная сетка без переполнения */}
      <div className={`grid grid-cols-3 mb-4 gap-1 p-1 rounded-2xl border ${
        theme === 'coffee'
          ? 'bg-[#1A120B]/60 border-[#D5CEA3]/20'
          : theme === 'light'
          ? 'bg-slate-100 border-slate-200'
          : 'bg-white/5 border-white/10'
      }`}>
        <button
          onClick={() => setActiveTab('shield')}
          className={`w-full min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-xl text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'shield'
              ? (theme === 'coffee'
                  ? 'bg-[#D5CEA3]/25 text-[#E5E0C2] border border-[#D5CEA3]/40 shadow-sm'
                  : theme === 'light'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-purple-600/35 text-purple-200 border border-purple-500/40 shadow-glass-sm')
              : (theme === 'coffee'
                  ? 'text-[#D5CEA3]/60 hover:text-[#E5E0C2]'
                  : theme === 'light'
                  ? 'text-slate-500 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200')
          }`}
        >
          <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
          <span className="truncate">
            <span className="sm:inline hidden">{t('shield.tab_shield_prefix', 'Щит и ')}</span>
            {t('shield.tab_shield_main', 'Шлюзы')}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('radar')}
          className={`w-full min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-xl text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'radar'
              ? (theme === 'coffee'
                  ? 'bg-[#D5CEA3]/25 text-[#E5E0C2] border border-[#D5CEA3]/40 shadow-sm'
                  : theme === 'light'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-purple-600/35 text-purple-200 border border-purple-500/40 shadow-glass-sm')
              : (theme === 'coffee'
                  ? 'text-[#D5CEA3]/60 hover:text-[#E5E0C2]'
                  : theme === 'light'
                  ? 'text-slate-500 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200')
          }`}
        >
          <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
          <span className="truncate">
            <span className="sm:inline hidden">{t('shield.tab_radar_prefix', 'Офлайн-')}</span>
            {t('shield.tab_radar_main', 'Радар')}
          </span>
          {meshState.peers.length > 0 && (
            <span className={`text-[9px] px-1 py-0.2 rounded-full font-mono flex-shrink-0 border ${
              theme === 'coffee'
                ? 'bg-[#D5CEA3]/20 text-[#E5E0C2] border-[#D5CEA3]/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            }`}>
              {meshState.peers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('qr')}
          className={`w-full min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-xl text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'qr'
              ? (theme === 'coffee'
                  ? 'bg-[#D5CEA3]/25 text-[#E5E0C2] border border-[#D5CEA3]/40 shadow-sm'
                  : theme === 'light'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-purple-600/35 text-purple-200 border border-purple-500/40 shadow-glass-sm')
              : (theme === 'coffee'
                  ? 'text-[#D5CEA3]/60 hover:text-[#E5E0C2]'
                  : theme === 'light'
                  ? 'text-slate-500 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200')
          }`}
        >
          <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
          <span className="truncate">
            <span className="sm:inline hidden">{t('shield.tab_qr_prefix', 'QR и ')}</span>
            {t('shield.tab_qr_main', 'Обмен')}
          </span>
        </button>
      </div>

      {/* ВКЛАДКА 1: АНТИБЛОКИРОВКА И ШЛЮЗЫ */}
      {activeTab === 'shield' && (
        <div className="space-y-4 animate-fade-in">
          {/* Главный статус-карточка */}
          <GlassCard glow className="p-3.5 sm:p-4 flex flex-col gap-3 relative overflow-hidden">
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
                  theme === 'coffee'
                    ? 'bg-[#D5CEA3]/15 border-[#D5CEA3]/30 text-[#D5CEA3]'
                    : theme === 'light'
                    ? 'bg-blue-50 border-blue-200 text-blue-600'
                    : 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                }`}>
                  <Zap className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-100 flex flex-wrap items-center gap-1.5">
                    <span className="truncate">{t('shield.smart_shield_title', 'Умный сетевой щит (Smart Shield)')}</span>
                    {netState.mode === 'auto' && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 border ${
                        theme === 'coffee'
                          ? 'bg-[#D5CEA3]/25 text-[#E5E0C2] border-[#D5CEA3]/40'
                          : theme === 'light'
                          ? 'bg-blue-100 text-blue-700 border-blue-300'
                          : 'bg-purple-500/25 text-purple-300 border-purple-500/30'
                      }`}>
                        {t('shield.auto_badge', 'АВТО')}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 leading-snug">
                    {t('shield.smart_shield_desc', 'Авто-обход ТСПУ/DPI и бесшовное переключение на резервные узлы')}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={netState.mode === 'auto'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleToggleSmartShield(e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 bg-slate-800/90 ring-1 ring-inset ring-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow-md after:transition-all ${
                  theme === 'coffee'
                    ? 'peer-checked:bg-[#D5CEA3] peer-checked:ring-[#D5CEA3]/60'
                    : theme === 'light'
                    ? 'peer-checked:bg-blue-600 peer-checked:ring-blue-400/50'
                    : 'peer-checked:bg-purple-500 peer-checked:ring-purple-400/50'
                }`}></div>
              </label>
            </div>

            {/* Метрика задержки и активного протокола */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center">
              <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">{t('shield.ping_label', 'Задержка (Ping)')}</span>
                <span
                  className={`text-xs font-bold font-mono ${
                    netState.pingMs < 120
                      ? 'text-emerald-400'
                      : netState.pingMs < 350
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}
                >
                  {netState.pingMs < 9999 ? `${netState.pingMs} ms` : t('shield.offline', 'Офлайн')}
                </span>
              </div>
              <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">{t('shield.protocol_label', 'Протокол')}</span>
                <span className={`text-xs font-bold uppercase font-mono ${
                  theme === 'coffee' ? 'text-[#D5CEA3]' : (theme === 'light' ? 'text-blue-600' : 'text-purple-300')
                }`}>
                  {netState.currentProtocol}
                </span>
              </div>
              <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">{t('shield.dpi_masking_label', 'DPI Маскировка')}</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  {netState.isAntiDpiActive ? t('shield.noise_0xee', '0xEE ШУМ') : 'TLS 1.3'}
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Кнопка раскрытия расширенных сетевых настроек (Progressive Disclosure) */}
          <button
            type="button"
            onClick={() => setShowAdvancedGateways((prev) => !prev)}
            className={`w-full py-2.5 px-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
              theme === 'coffee'
                ? 'bg-[#1A120B]/60 border-[#D5CEA3]/20 text-[#E5E5CB] hover:bg-[#D5CEA3]/10'
                : theme === 'light'
                ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200/70'
                : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-400" />
              <span>
                {t('shield.advanced_gateways_toggle', 'Расширенные настройки узлов и протоколов')}
              </span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {showAdvancedGateways ? 'Скрыть ▲' : 'Открыть ▼'}
            </span>
          </button>

          {showAdvancedGateways && (
            <div className="space-y-4 pt-1 animate-fade-in">
              {/* Список доступных узлов */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    {t('shield.available_gateways', 'Доступные узлы и шлюзы')}
                  </h4>
                  <button
                    onClick={handleTestAll}
                    disabled={isTestingAll}
                    className={`text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                      theme === 'coffee'
                        ? 'text-[#D5CEA3] hover:text-[#E5E0C2]'
                        : theme === 'light'
                        ? 'text-blue-600 hover:text-blue-700'
                        : 'text-purple-400 hover:text-purple-300'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingAll ? 'animate-spin' : ''}`} />
                    <span>{t('shield.probe_all_pings', 'Проверить все пинги')}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {netState.gateways.map((gw) => {
                    const isSelected = netState.activeGatewayId === gw.id;
                    return (
                      <div
                        key={gw.id}
                        onClick={() => handleSelectGateway(gw)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? (theme === 'coffee'
                                ? 'bg-[#D5CEA3]/20 border-[#D5CEA3]/50 shadow-sm'
                                : theme === 'light'
                                ? 'bg-blue-50 border-blue-300 shadow-sm'
                                : 'bg-purple-600/20 border-purple-500/50 shadow-glass-sm')
                            : 'bg-white/3 border-white/5 hover:bg-white/6 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              isSelected
                                ? (theme === 'coffee'
                                    ? 'bg-[#D5CEA3]/20 text-[#D5CEA3]'
                                    : theme === 'light'
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-purple-500/20 text-purple-300')
                                : 'bg-white/5 text-slate-400'
                            }`}
                          >
                            <Server className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold text-slate-100 truncate">
                                {getGatewayName(gw)}
                              </span>
                              {gw.isOfficial && (
                                <span className="text-[9px] bg-blue-500/15 text-blue-300 px-1.5 py-0.2 rounded border border-blue-500/20 font-medium flex-shrink-0">
                                  Official
                                </span>
                              )}
                              {gw.protocol === 'fake_tls' && (
                                <span className={`text-[9px] px-1.5 py-0.2 rounded border font-medium flex-shrink-0 ${
                                  theme === 'coffee'
                                    ? 'bg-[#D5CEA3]/15 text-[#D5CEA3] border-[#D5CEA3]/30'
                                    : theme === 'light'
                                    ? 'bg-blue-100 text-blue-700 border-blue-200'
                                    : 'bg-purple-500/15 text-purple-300 border-purple-500/20'
                                }`}>
                                  Anti-DPI
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block truncate">
                              {getGatewayDesc(gw)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                          {gw.status === 'probing' ? (
                            <RefreshCw className={`w-3.5 h-3.5 animate-spin ${
                              theme === 'coffee' ? 'text-[#D5CEA3]' : (theme === 'light' ? 'text-blue-600' : 'text-purple-400')
                            }`} />
                          ) : gw.pingMs !== undefined && gw.pingMs < 9999 ? (
                            <span
                              className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-md border ${
                                gw.pingMs < 120
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}
                            >
                              {gw.pingMs} ms
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">{t('shield.not_tested', 'Не проверен')}</span>
                          )}

                          {isSelected && (
                            <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${
                              theme === 'coffee' ? 'text-[#D5CEA3]' : (theme === 'light' ? 'text-blue-600' : 'text-purple-400')
                            }`} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* СЕКЦИЯ МУЛЬТИТРАНСПОРТНОЙ СЕТИ (ВЕКТОР 2) */}
              <TransportShieldSection
                onShowToast={onShowToast}
                onOpenChatWithPeer={onOpenChatWithPeer}
                theme={theme}
              />
            </div>
          )}
        </div>
      )}

      {/* ВКЛАДКА 2: ОФЛАЙН-РАДАР И BLE MESH */}
      {activeTab === 'radar' && (
        <div className="space-y-4 animate-fade-in">
          {/* Предупреждение о выключенном Bluetooth адаптере */}
          {meshState.isNativeBleSupported && meshState.isBluetoothEnabled === false && (
            <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/40 flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base flex-shrink-0">📡</span>
                <div>
                  <h4 className="text-xs font-bold text-red-300">
                    {t('shield.bt_disabled_title', 'Bluetooth адаптер выключен')}
                  </h4>
                  <p className="text-[10px] text-red-200/80">
                    {t('shield.bt_disabled_desc', 'Включите Bluetooth на смартфоне, чтобы видеть соседние узлы на радаре и передавать сообщения без интернета.')}
                  </p>
                </div>
              </div>
              <GlassButton
                variant="primary"
                size="sm"
                onClick={() => offlineMeshManager.openBluetoothSettings()}
                className="text-xs flex-shrink-0 whitespace-nowrap bg-red-500/25 hover:bg-red-500/35 text-red-100 border-red-500/50"
              >
                {t('shield.bt_enable_btn', 'Включить Bluetooth')}
              </GlassButton>
            </div>
          )}

          {/* Предупреждение об отключенной геолокации для Android < 12 */}
          {meshState.locationServicesEnabled === false && (
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base flex-shrink-0">⚠️</span>
                <div>
                  <h4 className="text-xs font-bold text-amber-300">
                    {t('shield.gps_disabled_title', 'Служба геолокации (GPS) отключена')}
                  </h4>
                  <p className="text-[10px] text-amber-200/80">
                    {t('shield.gps_disabled_desc', 'На Android 6–11 BLE-сканирование заблокировано системой без включенного GPS.')}
                  </p>
                </div>
              </div>
              <GlassButton
                variant="primary"
                size="sm"
                onClick={() => offlineMeshManager.openLocationSettings()}
                className="text-xs flex-shrink-0 whitespace-nowrap bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-500/40"
              >
                {t('shield.gps_enable_btn', 'Включить GPS')}
              </GlassButton>
            </div>
          )}

          {/* Диагностика радио-слоя: реальная причина слепоты сканера вместо фантомного «Поиск пиров...» */}
          {(meshState.lastNativeError || (meshState.scanFailureStreak ?? 0) > 0) && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
              <span className="flex items-center gap-2">
                <RadioTower className="w-3.5 h-3.5 flex-shrink-0" />
                {meshState.lastNativeError || t('shield.ble_recovering', 'BLE-сканер восстанавливается после сбоев стека')}
              </span>
              {(meshState.scanFailureStreak ?? 0) > 0 && (
                <span className="font-mono text-red-300/80 flex-shrink-0">
                  {t('shield.streak_label', 'серия: {{count}}', { count: meshState.scanFailureStreak })}
                </span>
              )}
            </div>
          )}

          {/* Интерактивный радарный экран */}
          <div className="flex flex-col items-center gap-2">
            <RadarCanvas
              peers={meshState.peers}
              isScanning={meshState.isScanning}
              selectedPeerId={selectedPeer?.id}
              localNodeId={meshState.localNodeId}
              theme={theme}
              onSelectPeer={(peer) => {
                setSelectedPeer(peer);
                onShowToast(
                  t('shield.toast_peer_selected', 'Выбран узел: {{name}} (~{{dist}} м, {{rssi}} dBm)', {
                    name: peer.name,
                    dist: peer.distanceMeters.toFixed(1),
                    rssi: peer.rssi,
                  }),
                  'info'
                );
              }}
            />

            <div className="flex items-center justify-between w-full text-[11px] text-slate-400 px-1">
              <span className="flex items-center gap-1">
                <RadioTower className={`w-3.5 h-3.5 ${
                  theme === 'coffee' ? 'text-[#D5CEA3]' : (theme === 'light' ? 'text-blue-600' : 'text-purple-400')
                }`} />
                {meshState.isNativeBleSupported
                  ? 'BLE GATT 0xFA21 (2.4 GHz)'
                  : 'Web Broadcast / Local LAN'}
              </span>
              <span className="text-emerald-400 font-mono">
                {meshState.peers.length > 0
                  ? t('shield.air_peers_count', 'В эфире: {{count}} узлов', { count: meshState.peers.length })
                  : t('shield.air_clear', 'Эфир свободен')}
              </span>
            </div>
          </div>

          {/* Карточка выбранного узла на радаре */}
          {selectedPeer && (
            <GlassCard className={`p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in border ${
              theme === 'coffee'
                ? 'bg-[#1A120B]/80 border-[#D5CEA3]/40'
                : theme === 'light'
                ? 'bg-blue-50 border-blue-200'
                : 'bg-purple-950/20 border-purple-500/30'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                  theme === 'coffee'
                    ? 'bg-[#D5CEA3]/20 border-[#D5CEA3]/30 text-[#D5CEA3]'
                    : theme === 'light'
                    ? 'bg-blue-100 border-blue-200 text-blue-600'
                    : 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                }`}>
                  {selectedPeer.deviceType === 'android' ? (
                    <Smartphone className="w-4 h-4" />
                  ) : (
                    <Laptop className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                    {selectedPeer.name}
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30 font-mono">
                      ~{selectedPeer.distanceMeters.toFixed(1)}{t('shield.unit_m', 'м')}
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {t('shield.signal_label', 'Сигнал: {{rssi}} dBm • {{role}}', {
                      rssi: selectedPeer.rssi,
                      role: selectedPeer.isRelay
                        ? t('shield.role_relay_on', 'Ретранслятор ВКЛ')
                        : t('shield.role_client', 'Клиент'),
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {onOpenChatWithPeer && (
                  <GlassButton
                    variant="accent"
                    size="sm"
                    onClick={() => onOpenChatWithPeer(selectedPeer)}
                    className="flex-1 sm:flex-none text-xs flex items-center justify-center gap-1"
                  >
                    <MessageSquare className="w-3 h-3" />
                    {t('shield.write_btn', 'Написать')}
                  </GlassButton>
                )}
                <GlassButton
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSendTestPing(selectedPeer)}
                  className="flex-1 sm:flex-none text-xs flex items-center justify-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  {t('shield.test_ping_btn', 'Тест-пинг')}
                </GlassButton>
                <button
                  onClick={() => setSelectedPeer(null)}
                  className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1"
                >
                  {t('shield.hide_btn', 'Скрыть')}
                </button>
              </div>
            </GlassCard>
          )}

          {/* Управление радиомодулем и ретрансляцией */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <GlassCard className="p-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  {t('shield.ble_mesh_radio_title', 'BLE Mesh Радио')}
                </span>
                <span className="text-[10px] text-slate-400">
                  {t('shield.ble_mesh_radio_desc', 'Автономная связь без интернета')}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={meshState.isMeshEnabled}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    offlineMeshManager.toggleMesh(e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-emerald-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500/30 border border-white/5"></div>
              </label>
            </GlassCard>

            <GlassCard className="p-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  {t('shield.relay_title', 'Ретранслятор (Relay)')}
                </span>
                <span className="text-[10px] text-slate-400">
                  {t('shield.relay_desc', 'Передавать пакеты соседей')}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={meshState.isRelayMode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    offlineMeshManager.toggleRelay(e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className={`w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all border border-white/5 ${
                  theme === 'coffee'
                    ? 'peer-checked:bg-[#D5CEA3]/30 peer-checked:after:bg-[#D5CEA3]'
                    : theme === 'light'
                    ? 'peer-checked:bg-blue-600/30 peer-checked:after:bg-blue-600'
                    : 'peer-checked:bg-purple-500/30 peer-checked:after:bg-purple-400'
                }`}></div>
              </label>
            </GlassCard>
          </div>

          {/* Список соседей в эфире */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {t('shield.devices_on_air', 'Устройства в радиоэфире ({{count}})', { count: meshState.peers.length })}
              </h4>
              <button
                onClick={() => offlineMeshManager.scanPeers()}
                disabled={meshState.isScanning}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${meshState.isScanning ? 'animate-spin' : ''}`} />
                <span>{t('shield.scan_air_btn', 'Сканировать эфир')}</span>
              </button>
            </div>

            {meshState.peers.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white/2 border border-white/5 text-center flex flex-col items-center justify-center gap-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center animate-pulse border ${
                  theme === 'coffee'
                    ? 'bg-[#D5CEA3]/10 border-[#D5CEA3]/20 text-[#D5CEA3]'
                    : theme === 'light'
                    ? 'bg-blue-50 border-blue-200 text-blue-600'
                    : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                }`}>
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-300 block">
                    {t('shield.no_devices_nearby', 'Устройства поблизости не обнаружены')}
                  </span>
                  <span className="text-[10px] text-slate-400 block max-w-[280px] mx-auto mt-0.5">
                    {t('shield.no_devices_nearby_hint', 'Убедитесь, что на втором смартфоне запущен Gossip, включен Bluetooth и активен экран «Офлайн-радар».')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {meshState.peers.map((p) => {
                  const isSelected = selectedPeer?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPeer(p)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? (theme === 'coffee'
                              ? 'bg-[#D5CEA3]/20 border-[#D5CEA3]/40 shadow-sm'
                              : theme === 'light'
                              ? 'bg-blue-50 border-blue-200 shadow-sm'
                              : 'bg-purple-600/20 border-purple-500/40 shadow-glass-sm')
                          : 'bg-white/3 border-white/5 hover:border-emerald-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs">
                          {p.deviceType === 'android' ? '📱' : '💻'}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-slate-200 block">{p.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {t('shield.distance_rssi', 'Дистанция ~{{dist}} м • {{rssi}} dBm', {
                              dist: p.distanceMeters.toFixed(1),
                              rssi: p.rssi,
                            })}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-mono">
                        {t('shield.in_range_badge', 'В ЗОНЕ СВЯЗИ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Блок статистики ретрансляции и буфера */}
          <GlassCard className="p-3 bg-white/2 border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                theme === 'coffee'
                  ? 'bg-[#D5CEA3]/10 border-[#D5CEA3]/20 text-[#D5CEA3]'
                  : theme === 'light'
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-purple-500/10 border-purple-500/20 text-purple-300'
              }`}>
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-200 block">
                  {t('shield.queue_relayed_stats', 'Очередь: {{pending}} пак. • Ретранслировано: {{relayed}}', {
                    pending: meshState.pendingEnvelopesCount,
                    relayed: meshState.totalRelayedCount,
                  })}
                </span>
                <span className="text-[10px] text-slate-400">
                  {netState.isOnline
                    ? t('shield.cloud_link_active', 'Связь с облаком активна')
                    : t('shield.waiting_for_internet', 'Ожидание появления интернета')}
                </span>
              </div>
            </div>
            {meshState.pendingEnvelopesCount > 0 && (
              <GlassButton
                variant="primary"
                size="sm"
                disabled={!netState.isOnline || isFlushingCloud}
                onClick={handleFlushQueue}
                className="text-xs flex items-center gap-1"
              >
                <CloudUpload className={`w-3.5 h-3.5 ${isFlushingCloud ? 'animate-spin' : ''}`} />
                {t('shield.flush_btn', 'Сбросить')}
              </GlassButton>
            )}
          </GlassCard>
        </div>
      )}

      {/* ВКЛАДКА 3: QR-КОД И ПОДКЛЮЧЕНИЕ ШЛЮЗОВ */}
      {activeTab === 'qr' && (
        <div className="space-y-4 animate-fade-in">
          {/* Генератор QR-кода */}
          <GlassCard glow className="p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className={`p-2.5 rounded-2xl border shadow-glass-md flex-shrink-0 ${
              theme === 'coffee'
                ? 'bg-[#1A120B] border-[#D5CEA3]/30'
                : theme === 'light'
                ? 'bg-white border-slate-200'
                : 'bg-neutral-950 border-purple-500/30'
            }`}>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Gateway QR Code" className="w-36 h-36 rounded-xl block" />
              ) : (
                <div className={`w-36 h-36 flex items-center justify-center ${
                  theme === 'coffee' ? 'text-[#D5CEA3]' : (theme === 'light' ? 'text-blue-600' : 'text-purple-400')
                }`}>
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
              )}
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <h3 className="text-sm font-bold text-slate-100 flex items-center justify-center sm:justify-start gap-2">
                <Share2 className={`w-4 h-4 ${
                  theme === 'coffee' ? 'text-[#D5CEA3]' : (theme === 'light' ? 'text-blue-600' : 'text-purple-400')
                }`} />
                {t('shield.share_gateway_title', 'Поделиться шлюзом с другом')}
              </h3>
              <p className="text-xs text-slate-400">
                {t('shield.share_gateway_desc', 'Друг может навести камеру на этот QR-код, и приложение мгновенно подключится к вашему шлюзу без ручного ввода настроек.')}
              </p>
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={handleCopyInviteUri}
                className={`w-full sm:w-auto flex items-center justify-center gap-1.5 text-xs ${
                  theme === 'coffee' ? 'text-[#D5CEA3]' : (theme === 'light' ? 'text-blue-600' : 'text-purple-300')
                }`}
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? t('shield.copied', 'Скопировано!') : t('shield.copy_gateway_link', 'Скопировать ссылку-шлюз')}
              </GlassButton>
            </div>
          </GlassCard>

          {/* Быстрый импорт по ссылке */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {t('shield.import_uri_title', 'Импорт шлюза из ссылки (gossip://)')}
            </h4>
            <div className="flex gap-2">
              <div className="flex-1">
                <GlassInput
                  placeholder="gossip://gateway?url=https://..."
                  value={importUriInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setImportUriInput(e.target.value)}
                />
              </div>
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={handleImportUri}
                className="flex items-center gap-1 text-xs self-center"
              >
                {t('shield.import_btn', 'Импорт')}
              </GlassButton>
            </div>
          </div>

          {/* Форма добавления кастомного шлюза */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {t('shield.manual_custom_title', 'Ручное подключение кастомного узла')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <GlassInput
                placeholder="https://192.168.1.10:8080"
                label={t('shield.custom_url_label', 'URL / IP адрес сервера')}
                value={customInputUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomInputUrl(e.target.value)}
              />
              <GlassInput
                placeholder={t('shield.custom_name_placeholder', 'Домашний шлюз')}
                label={t('shield.custom_name_label', 'Название узла')}
                value={customInputName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomInputName(e.target.value)}
              />
            </div>
            <GlassButton
              variant="primary"
              onClick={handleSaveCustomGateway}
              className="w-full flex items-center justify-center gap-2 text-xs"
            >
              <ArrowRight className="w-4 h-4" />
              {t('shield.connect_custom_btn', 'Подключить кастомный узел')}
            </GlassButton>
          </div>
        </div>
      )}
    </GlassModal>
  );
};
