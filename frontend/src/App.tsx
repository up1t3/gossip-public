import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { App as CapApp } from '@capacitor/app';
import packageJson from '../package.json';
import { InteractiveBackground } from './components/InteractiveBackground';
import { useTranslation } from 'react-i18next';
import { useRtl, translateUiText } from './i18n';
import { type VirtualMessageListHandle } from './components/chat/VirtualMessageList';
import { type TopicItem, type GroupCallSession } from './types';
import { tdlib } from './core/tdlib/tdlib-adapter';
import { syncManager, decryptMessageIfNeeded, isPlaceholderChatName, healFailClosedPlaceholderRows } from './core/sync-manager';
import { storageManager } from './core/storage/storage-manager';
import { srpGenerateEphemeral, srpCalculateX, srpCalculateClientS, srpCalculateM1, srpCalculateM2, srpGenerateVerifier, srpCalculateU } from './core/crypto/srp';
import { solvePoW } from './core/crypto/pow';
import { getDeviceAttestationToken } from './core/crypto/attestation';
import { generateMlsKeyPair } from './core/crypto/mls';
import { bytesToHex } from './core/tdlib/crypto';
import { ensureAndPublishPrekeys } from './core/crypto/double-ratchet';
import { downloadAndRestoreVault, isE2EEMessage } from './core/crypto/e2ee';
import { generateMnemonic, validateMnemonic, deriveRecoveryHash } from './core/crypto/mnemonic';
import { getBackendUrl } from './utils/url';
import { formatLastMessagePreview } from './utils/message-preview';
import { Capacitor } from '@capacitor/core';
import { VoIPClient } from './core/voip/voipClient';
import { voipAudio } from './core/voip/voipAudio';
import { VoIPNotificationPlugin } from './core/voip/voipNotificationPlugin';
import { globalMediaManager } from './core/media/globalMediaManager';
import { useViewportAdaptation } from './hooks/useViewportAdaptation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { GossipBackgroundPlugin } from './core/GossipBackgroundPlugin';
import 'katex/dist/katex.min.css';
import { InAppNotification } from './components/ui/InAppNotificationBanner';
import { haptics } from './utils/haptics';
import { transportManager } from './core/transport';
import { connectionManager, NetworkStateSnapshot } from './core/network/connection-manager';
import { evaluateNetworkComposite } from './core/network/network-evaluator';
import { MediaGalleryItem } from './components/chat/MediaGalleryViewerModal';
import { offlineMeshManager, MeshStateSnapshot } from './core/mesh/offline-mesh-manager';
import { NotificationSyncService } from './core/network/notificationSync';
import { isAndroidApp, _isNewerVersion, isTestEnv, safeParsePeaks, saveSessionToIndexedDB, restoreSessionFromIndexedDB, clearSessionFromIndexedDB, type Message, type Chat } from './components/app/appHelpers';
export { isAndroidApp, _isNewerVersion, isTestEnv, safeParsePeaks, DecryptedAudioWaveform, DecryptedImage, DecryptedVideo, DecryptedVideoNote, SwipeableMessageRow, EMOJI_DATA, EmojiPickerPanel, TTL_PRESETS, formatTtlLabel, renderMessageStatus, getSenderColorClass, saveSessionToIndexedDB, restoreSessionFromIndexedDB, clearSessionFromIndexedDB, SettingsErrorBoundary } from './components/app/appHelpers';
export type { Message, DecryptedMediaProps, EmojiPickerPanelProps, Chat } from './components/app/appHelpers';
import { useAppChatActions } from './components/app/useAppChatActions';
import { AppAuthFlow } from './components/app/AppAuthFlow';
import { AppMainWorkspace } from './components/app/AppMainWorkspace';
import { AppGlobalOverlays } from './components/app/AppGlobalOverlays';
import {
  verifyDecoyPin,
  getDecoyPinAction,
  isDecoyModeActive,
  setDecoyModeActive,
  buildDecoyChats,
  sendActivityHeartbeat,
  joinBurnerLink,
  burnRoomImmediately,
  type BurnerLinkItem,
} from './utils/premiumSecurity';
import { type VoiceChangerPreset } from './utils/voiceChanger';

export default function App() {
  const { t, i18n } = useTranslation(['settings', 'common', 'chat', 'auth', 'wallet', 'pulse', 'calls', 'landing']);
  useRtl();
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Тема оформления (Темная, Светлая, Кофейная)
  const [theme, setTheme] = useState<'dark' | 'light' | 'coffee'>(() => {
    return (localStorage.getItem("theme") as any) || "dark";
  });

  useEffect(() => {
    document.documentElement.classList.remove('theme-dark', 'theme-light', 'theme-coffee');
    document.documentElement.classList.add(`theme-${theme}`);
    localStorage.setItem("theme", theme);

    // Динамически меняем theme-color статус-бара в PWA
    let themeColor = '#0A0A0C';
    if (theme === 'light') themeColor = '#F5F5F7';
    else if (theme === 'coffee') themeColor = '#1A120B';

    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.getElementsByTagName('head')[0].appendChild(meta);
    }
    meta.setAttribute('content', themeColor);
  }, [theme]);

  // Режим крупного шрифта для слабовидящих (Accessibility Mode)
  const [isLargeFont, setIsLargeFont] = useState<boolean>(() => {
    return typeof localStorage !== 'undefined' && localStorage.getItem('gossip_large_font') === 'true';
  });

  useEffect(() => {
    if (isLargeFont) {
      document.documentElement.classList.add('large-font');
      if (typeof localStorage !== 'undefined') localStorage.setItem('gossip_large_font', 'true');
    } else {
      document.documentElement.classList.remove('large-font');
      if (typeof localStorage !== 'undefined') localStorage.setItem('gossip_large_font', 'false');
    }
  }, [isLargeFont]);


  // Состояния для автообновления Android и приложения
  const [androidUpdateData, setAndroidUpdateData] = useState<{
    version: string;
    url: string;
    releaseNotes: string;
  } | null>(null);
  const currentAppVersion = packageJson.version;

  // Состояние ненавязчивого плавающего баннера обновления (Zero-Spam Floating Update Banner)
  const [updateBannerData, setUpdateBannerData] = useState<{
    version: string;
    url: string;
    releaseNotes: string;
    isDismissed?: boolean;
  } | null>(null);
  const lastVersionCheckRef = useRef<number>(0);

  // Состояния для скачивания APK на Android
  const [apkDownloading, setApkDownloading] = useState(false);
  const [apkDownloadProgress, setApkDownloadProgress] = useState(0);
  const [apkDownloadedBytes, setApkDownloadedBytes] = useState(0);
  const [apkTotalBytes, setApkTotalBytes] = useState(0);
  const [apkReadyToInstall, setApkReadyToInstall] = useState(false);
  const [apkLocalPath, setApkLocalPath] = useState<string | null>(null);
  const [apkDownloadError, setApkDownloadError] = useState<string | null>(null);
  const [apkPermissionRequested, setApkPermissionRequested] = useState(false);
  const [isInstallingApk, setIsInstallingApk] = useState(false);
  const [isForceUpdateRequired, setIsForceUpdateRequired] = useState(false);
  const [realInstalledVersion, setRealInstalledVersion] = useState<string>(currentAppVersion);

  // Рефы для синхронизации в обработчиках фонового режима (appStateChange)
  const isAppActiveRef = useRef(true);
  const isForceUpdateRequiredRef = useRef(false);
  isForceUpdateRequiredRef.current = isForceUpdateRequired;
  const apkReadyToInstallRef = useRef(false);
  apkReadyToInstallRef.current = apkReadyToInstall;
  const apkDownloadingRef = useRef(false);
  apkDownloadingRef.current = apkDownloading;
  const androidUpdateDataRef = useRef(androidUpdateData);
  androidUpdateDataRef.current = androidUpdateData;
  const isCheckingUpdateRef = useRef(false);

  // 1. Платформенный класс для Android
  useEffect(() => {
    const isAndroidApp = typeof window !== 'undefined' && (window as any).Capacitor !== undefined && (window as any).Capacitor.getPlatform() === 'android';
    if (isAndroidApp) {
      document.documentElement.classList.add('platform-android');
    }
  }, []);

  // 2. Запрос разрешений на веб-уведомления
  useEffect(() => {
    const isAndroid = typeof window !== 'undefined' && (window as any).Capacitor !== undefined && (window as any).Capacitor.getPlatform() === 'android';
    if (!isAndroid && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission().catch(err => console.error('[App] Ошибка запроса разрешений на уведомления:', err));
      }
    }
  }, []);

  // 3. Загрузка APK в фоновом режиме
  const startBackgroundApkDownload = async (updateData: { version: string; url: string; releaseNotes: string }) => {
    if (apkDownloadingRef.current) return;

    const apkFilename = `gossip-update-${updateData.version}.apk`;

    // Санитизация URL для нативного загрузчика: формирование абсолютного URL
    const resolveApkDownloadUrl = (rawUrl?: string): string => {
      const fallbackUrl = 'https://skuf-net.ru/static/media/gossip.apk';
      const urlCandidate = (rawUrl && rawUrl.trim()) ? rawUrl.trim() : '/static/media/gossip.apk';
      let resolved = getBackendUrl(urlCandidate);
      if (!resolved.startsWith('http://') && !resolved.startsWith('https://')) {
        if (resolved.startsWith('/')) {
          if (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.startsWith('file:') && !window.location.origin.startsWith('capacitor:')) {
            resolved = `${window.location.origin}${resolved}`;
          } else {
            resolved = `https://skuf-net.ru${resolved}`;
          }
        } else {
          resolved = fallbackUrl;
        }
      }
      const separator = resolved.includes('?') ? '&' : '?';
      return `${resolved}${separator}t=${Date.now()}`;
    };

    const downloadUrl = resolveApkDownloadUrl(updateData.url);

    // Динамическое определение Content-Length через предварительный HEAD-запрос
    let expectedContentLength = 0;
    try {
      const isAndroid = typeof window !== 'undefined' && (window as any).Capacitor !== undefined && (window as any).Capacitor.getPlatform() === 'android';
      if (isAndroid && (window as any).Capacitor?.Plugins?.CapacitorHttp) {
        const headRes = await (window as any).Capacitor.Plugins.CapacitorHttp.request({
          method: 'HEAD',
          url: downloadUrl,
        });
        const clHeader = headRes.headers?.['content-length'] || headRes.headers?.['Content-Length'];
        if (clHeader) {
          expectedContentLength = parseInt(clHeader, 10) || 0;
        }
      }
    } catch (e) {
      console.warn('[APK Update] CapacitorHttp HEAD failed, trying fetch fallback:', e);
    }

    if (!expectedContentLength && typeof fetch !== 'undefined') {
      try {
        const headRes = await fetch(downloadUrl, { method: 'HEAD' });
        const clHeader = headRes.headers?.get('content-length');
        if (clHeader) {
          expectedContentLength = parseInt(clHeader, 10) || 0;
        }
      } catch (e) {
        console.warn('[APK Update] Fetch HEAD failed:', e);
      }
    }

    const minSanitarySize = 15 * 1024 * 1024; // 15 МБ санитарный минимум для APK
    const isSizeValid = (size: number) => {
      if (expectedContentLength > 0) {
        return size === expectedContentLength;
      }
      return size >= minSanitarySize;
    };

    // 1. Проверяем, может быть файл уже полностью скачан в кэш ранее
    try {
      const existingStat = await Filesystem.stat({
        path: apkFilename,
        directory: Directory.Cache
      });
      if (existingStat && existingStat.size && isSizeValid(existingStat.size)) {
        console.log(`[APK Update] Файл обновления v${updateData.version} уже присутствует в кэше (${existingStat.size} байт). Скачивание пропущено.`);
        const uriResult = await Filesystem.getUri({
          path: apkFilename,
          directory: Directory.Cache
        });
        const finalPath = uriResult?.uri || existingStat?.uri || apkFilename;
        setApkLocalPath(finalPath);
        setApkDownloadedBytes(existingStat.size);
        setApkTotalBytes(existingStat.size);
        setApkReadyToInstall(true);
        setApkDownloadProgress(100);
        return;
      }
    } catch (e) {
      // Файл еще не скачан в кэш
    }

    setApkDownloading(true);
    setApkDownloadProgress(0);
    setApkDownloadedBytes(0);
    setApkTotalBytes(expectedContentLength || 0);
    setApkReadyToInstall(false);
    setApkDownloadError(null);

    let progressListener: any = null;
    try {
      try {
        await Filesystem.deleteFile({
          path: apkFilename,
          directory: Directory.Cache,
        });
        console.log("[APK Update] Старый неполный файл обновления удален из кэша.");
      } catch (e) {
        // Игнорируем ошибку, если файла не было
      }

      // Подписываемся на прогресс скачивания
      progressListener = await Filesystem.addListener('progress', (progress: any) => {
        if (progress.bytes) {
          setApkDownloadedBytes(progress.bytes);
        }
        const total = progress.contentLength > 0 ? progress.contentLength : expectedContentLength;
        if (total > 0) {
          setApkTotalBytes(total);
          const percent = Math.min(100, Math.max(0, Math.round((progress.bytes / total) * 100)));
          setApkDownloadProgress(percent);
        } else if (progress.bytes > 0) {
          const estimatedTotal = 50 * 1024 * 1024;
          const percent = Math.min(95, Math.round((progress.bytes / estimatedTotal) * 100));
          setApkDownloadProgress(percent);
        }
      });

      console.log("[APK Update] Начинаем скачивание APK:", downloadUrl);

      const downloadResult = await Filesystem.downloadFile({
        url: downloadUrl,
        path: apkFilename,
        directory: Directory.Cache,
        progress: true
      });

      console.log("[APK Update] Скачивание завершено, локальный путь:", downloadResult.path);
      if (!downloadResult.path) {
        throw new Error("Не удалось получить путь к скачанному файлу обновления");
      }

      // Проверяем размер скачанного файла
      const statResult = await Filesystem.stat({
        path: apkFilename,
        directory: Directory.Cache
      });
      const actualSize = statResult?.size || 0;
      if (!statResult || !actualSize || !isSizeValid(actualSize)) {
        throw new Error(`Файл обновления скачан не полностью (${actualSize} байт${expectedContentLength > 0 ? ` из ${expectedContentLength}` : ''}). Нажмите «Повторить».`);
      }
      
      setApkLocalPath(downloadResult.path);
      setApkDownloadedBytes(actualSize);
      setApkTotalBytes(actualSize);
      setApkReadyToInstall(true);
      setApkDownloadProgress(100);
    } catch (err: any) {
      console.error("[APK Update] Ошибка при скачивании APK:", err);
      setApkDownloadError(err.message || 'Сбой сетевого подключения при скачивании обновления. Нажмите кнопку «Повторить загрузку».');
    } finally {
      setApkDownloading(false);
      if (progressListener) {
        try { await progressListener.remove(); } catch (e) {}
      }
    }
  };

  const installApk = async () => {
    if (!apkLocalPath) {
      if (androidUpdateData) {
        startBackgroundApkDownload(androidUpdateData);
      }
      return;
    }
    setIsInstallingApk(true);
    try {
      // 1. Пробуем нативный плагин GossipBackground
      const isNativeAndroid = typeof window !== 'undefined' && (window as any).Capacitor !== undefined && (window as any).Capacitor.getPlatform() === 'android';
      if (isNativeAndroid && (window as any).Capacitor.Plugins?.GossipBackground?.installApk) {
        try {
          const res = await (window as any).Capacitor.Plugins.GossipBackground.installApk({ filePath: apkLocalPath });
          if (res?.status === 'permission_requested') {
            setApkPermissionRequested(true);
            return;
          }
          if (res?.status === 'installer_opened') {
            console.log("[APK Update] Системный установщик успешно запущен через нативный плагин GossipBackground");
            return;
          }
        } catch (nativeErr) {
          console.warn("[APK Update] Ошибка вызова GossipBackground.installApk, пробуем fallback FileOpener:", nativeErr);
        }
      }

      // 2. Fallback на FileOpener
      await FileOpener.open({
        filePath: apkLocalPath,
        contentType: 'application/vnd.android.package-archive',
        openWithDefault: true
      });
    } catch (err: any) {
      console.error("[APK Update] Ошибка при вызове установщика:", err);
      setApkDownloadError(`Не удалось открыть установщик: ${err.message || err}`);
      try {
        window.open('https://skuf-net.ru/static/media/gossip.apk', '_system');
      } catch (e) {
        window.location.href = 'https://skuf-net.ru/static/media/gossip.apk';
      }
    } finally {
      setTimeout(() => setIsInstallingApk(false), 2000);
    }
  };

  // 4. Унифицированный обработчик проверки и доставки обновлений
  const checkAppUpdate = useCallback(async (incomingData?: { version: string; url: string; releaseNotes: string }, isManual: boolean = false) => {
    if (isCheckingUpdateRef.current && !incomingData) return;
    lastVersionCheckRef.current = Date.now();
    isCheckingUpdateRef.current = true;
    try {
      const isAndroid = typeof window !== 'undefined' && (window as any).Capacitor !== undefined && (window as any).Capacitor.getPlatform() === 'android';
      let installedVersion = currentAppVersion;
      if (isAndroid) {
        try {
          const info = await CapApp.getInfo();
          installedVersion = info.version || installedVersion;
        } catch (e) {
          console.warn("[App] CapApp.getInfo недоступен, fallback на package.json version", e);
        }
        setRealInstalledVersion(installedVersion);
      }

      let data = incomingData;
      if (!data) {
        try {
          if (isAndroid && (window as any).Capacitor?.Plugins?.CapacitorHttp) {
            const capRes = await (window as any).Capacitor.Plugins.CapacitorHttp.get({
              url: getBackendUrl(`/api/v1/system/version?_t=${Date.now()}`)
            });
            if (capRes && capRes.status === 200 && capRes.data) {
              data = capRes.data;
            }
          }
        } catch (capErr) {
          console.warn("[App] CapacitorHttp.get недоступен, fallback на fetch:", capErr);
        }

        if (!data) {
          const res = await fetch(getBackendUrl(`/api/v1/system/version?_t=${Date.now()}`));
          if (res.ok) {
            data = await res.json();
          }
        }
      }

      if (data && data.version) {
        if (_isNewerVersion(data.version, installedVersion)) {
          console.log(`[App] Обнаружено обновление Gossip: v${data.version} (установлена v${installedVersion})`);

          // Проверяем 4-часовой таймаут откладывания (gossip_dismiss_update_{version})
          const dismissedKey = `gossip_dismiss_update_${data.version}`;
          const dismissedAt = typeof localStorage !== 'undefined' ? localStorage.getItem(dismissedKey) : null;
          const isDismissed = !isManual && dismissedAt ? (Date.now() - Number(dismissedAt) < 4 * 60 * 60 * 1000) : false;

          if (isAndroid) {
            setAndroidUpdateData(data);
            if (!isDismissed) {
              setIsForceUpdateRequired(true);

              // В фоне сразу запускаем скачивание APK для мгновенной готовности к установке
              if (!apkDownloadingRef.current && !apkReadyToInstallRef.current) {
                startBackgroundApkDownload(data);
              }
            } else {
              console.log(`[App] Обновление v${data.version} отложено пользователем (таймаут 4ч активен)`);
              setIsForceUpdateRequired(false);
            }
          } else {
            // Для Web / PWA показываем компактный веб-баннер
            setUpdateBannerData(prev => {
              if (prev && prev.version === data!.version && (prev.isDismissed || isDismissed)) {
                return prev;
              }
              return { ...data!, isDismissed: isDismissed };
            });
            if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(regs => {
                regs.forEach(r => r.update().catch(() => {}));
              }).catch(() => {});
            }
          }
        } else {
          // Установленная версия равна или новее серверной — сбрасываем модальные окна только если нет активного процесса скачивания/установки
          console.log(`[App] Установленная версия актуальна: v${installedVersion} >= v${data.version}`);
          if (!apkDownloadingRef.current && !apkReadyToInstallRef.current) {
            setIsForceUpdateRequired(false);
            setAndroidUpdateData(null);
            setUpdateBannerData(null);
          }
        }
      }
    } catch (err) {
      console.warn("[App] Ошибка проверки обновлений Gossip:", err);
    } finally {
      isCheckingUpdateRef.current = false;
    }
  }, [currentAppVersion]);

  // 5. Мгновенное получение пуш-события system_version по WebSocket
  useEffect(() => {
    const handleSystemVersion = (data: any) => {
      console.log("[App] WebSocket Push: Получено системное уведомление об обновлении версии:", data);
      if (data && data.version) {
        checkAppUpdate(data);
      }
    };

    tdlib.onUpdate("system_version", handleSystemVersion);

    const markBroadcastSeen = (id: string) => {
      if (!id) return;
      try {
        const raw = localStorage.getItem('gossip_seen_broadcasts');
        const list: string[] = raw ? JSON.parse(raw) : [];
        if (!list.includes(id)) {
          list.unshift(id);
          localStorage.setItem('gossip_seen_broadcasts', JSON.stringify(list.slice(0, 100)));
        }
      } catch (e) {}
    };

    const handleSystemBroadcast = (data: any) => {
      if (!data || !data.title || !data.message) return;
      console.log("[App] Получено системное оповещение от Администратора:", data);
      
      const alertItem = {
        id: data.id || String(Date.now()),
        title: data.title,
        message: data.message,
        severity: (data.severity || 'info') as 'info' | 'warning' | 'critical' | 'success',
        timestamp: data.timestamp || Date.now()
      };

      markBroadcastSeen(alertItem.id);
      haptics.trigger(alertItem.severity === 'critical' ? 'heavy' : 'warning');

      if (alertItem.severity === 'critical') {
        setSystemAlertModal(alertItem);
      } else {
        setInAppNotification({
          id: alertItem.id,
          chatId: '',
          senderName: `📢 ${alertItem.title}`,
          avatarUrl: alertItem.severity === 'warning' ? '⚠️' : (alertItem.severity === 'success' ? '🎉' : '🛡️'),
          text: alertItem.message,
          time: 'сейчас',
          isGroup: false
        });
      }
    };

    const handlePremiumActivated = () => {
      setIsPremium(true);
      localStorage.setItem('gossip_is_premium', 'true');
      showToast('⭐ Gossip Premium активирован!', 'success');
    };

    const handlePremiumRevoked = () => {
      setIsPremium(false);
      localStorage.setItem('gossip_is_premium', 'false');
      showToast('Подписка Gossip Premium завершена', 'info');
    };

    const checkActiveBroadcasts = async () => {
      try {
        if (localStorage.getItem('is_logged_in') !== 'true') return;
        const res = await fetch(getBackendUrl('/api/v1/system/broadcasts/active'));
        if (!res.ok) return;
        const json = await res.json();
        const items: any[] = Array.isArray(json?.broadcasts) ? json.broadcasts : [];
        if (items.length === 0) return;

        let seen: string[] = [];
        try {
          const raw = localStorage.getItem('gossip_seen_broadcasts');
          seen = raw ? JSON.parse(raw) : [];
        } catch (e) {}

        const myUsername = (localStorage.getItem('username') || '').trim().toLowerCase().replace(/^@/, '');
        const myUserId = (localStorage.getItem('current_user_id') || '').trim().toLowerCase();
        const myIsPremium = localStorage.getItem('gossip_is_premium') === 'true';

        for (const b of items) {
          if (!b || !b.id || seen.includes(String(b.id))) continue;
          // Не показываем оповещения старше 7 дней
          if (b.timestamp && Date.now() - Number(b.timestamp) > 7 * 24 * 3600 * 1000) continue;

          const target = b.target || 'all';
          let matches = false;
          if (target === 'all') {
            matches = true;
          } else if (target === 'premium' && myIsPremium) {
            matches = true;
          } else if (target === 'free' && !myIsPremium) {
            matches = true;
          } else if (target === 'user' && b.target_username) {
            const cleanTarget = String(b.target_username).trim().toLowerCase().replace(/^@/, '');
            if (cleanTarget && (cleanTarget === myUsername || cleanTarget === myUserId)) {
              matches = true;
            }
          }

          if (matches) {
            handleSystemBroadcast(b);
            break;
          }
        }
      } catch (e) {}
    };

    tdlib.onUpdate("system_broadcast", handleSystemBroadcast);
    tdlib.onUpdate("system_alert", handleSystemBroadcast);
    tdlib.onUpdate("premium_activated" as any, handlePremiumActivated);
    tdlib.onUpdate("premium_revoked" as any, handlePremiumRevoked);

    // Проверяем активные системные оповещения при запуске
    const bcastTimer = setTimeout(checkActiveBroadcasts, 2500);

    return () => {
      clearTimeout(bcastTimer);
      tdlib.offUpdate("system_version", handleSystemVersion);
      tdlib.offUpdate("system_broadcast", handleSystemBroadcast);
      tdlib.offUpdate("system_alert", handleSystemBroadcast);
      tdlib.offUpdate("premium_activated" as any, handlePremiumActivated);
      tdlib.offUpdate("premium_revoked" as any, handlePremiumRevoked);
    };
  }, [checkAppUpdate]);

  // 6. Умный контроль жизненного цикла (Smart Lifecycle & Heartbeat)
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastVersionCheckRef.current > 30 * 1000) {
          lastVersionCheckRef.current = now;
          checkAppUpdate();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // Фоновый heartbeat каждые 15 минут при постоянной активности
    const timer = setInterval(() => {
      checkAppUpdate();
    }, 15 * 60 * 1000);

    // Первичная проверка при старте
    checkAppUpdate();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      clearInterval(timer);
    };
  }, [checkAppUpdate]);

  // 7. Слушатель нативного состояния приложения (appStateChange)
  useEffect(() => {
    const isNative = typeof window !== 'undefined' && (window as any).Capacitor !== undefined && (window as any).Capacitor.isNativePlatform();
    if (!isNative) return;

    console.log("[App] Инициализация слушателя appStateChange для автосохранения БД и контроля обновлений");
    const handlerPromise = CapApp.addListener('appStateChange', async (state) => {
      isAppActiveRef.current = state.isActive;
      if (!state.isActive) {
        console.log('[App] Приложение свернуто (background), запускаем принудительный сброс БД...');
        try {
          await storageManager.sync();
          console.log('[App] Принудительный сброс БД завершен успешно.');
        } catch (err) {
          console.error('[App] Ошибка автосохранения БД при сворачивании:', err);
        }
      } else {
        console.log('[App] Приложение развернуто (active), форсируем сверку звонков, восстановление сети и актуализацию чата...');
        try {
          // 1. Приоритетно сверяем входящие/отложенные звонки
          reconcilePendingCall();

          // 2. Восстанавливаем транспорт TDLib (здоровый сокет не рвем — только ping-пробник)
          tdlib.reconnectIfUnhealthy("app_state_active");

          // 3. Если идет звонок — откладываем тяжелую фоновую синхронизацию, освобождая CPU и сеть для WebRTC
          if (isCallOpenRef.current || incomingCallIdRef.current) {
            console.log('[App] Активен звонок — откладываем фоновую синхронизацию всех чатов на 3.5с...');
            setTimeout(() => {
              if (selectedChatIdRef.current) {
                syncManager.syncDifference(selectedChatIdRef.current);
              }
              syncManager.syncAllChats();
            }, 3500);
          } else {
            if (selectedChatIdRef.current) {
              syncManager.syncDifference(selectedChatIdRef.current);
            }
            syncManager.syncAllChats();
          }

          // 4. Проверка обновлений при разворачивании (с дебаунсом 30 секунд)
          const now = Date.now();
          if (now - lastVersionCheckRef.current > 30 * 1000) {
            lastVersionCheckRef.current = now;
            checkAppUpdate();
          }
        } catch (e) {
          console.warn('[App] Ошибка при фоновой актуализации сокета:', e);
        }
      }
    });

    return () => {
      handlerPromise.then(h => h.remove()).catch(() => {});
    };
  }, [checkAppUpdate]);



  // Фото профиля
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(() => {
    return localStorage.getItem("profile_avatar_url");
  });
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isGroupAvatarUploading, setIsGroupAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement | null>(null);

  // Состояния для интерактивного кадрирования аватарок (Telegram-style)
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<'profile' | 'group'>('profile');

  // Меню действий с аватаркой (Просмотр / Редактировать текущую / Загрузить новую)
  const [isMyAvatarActionSheetOpen, setIsMyAvatarActionSheetOpen] = useState(false);
  const [isGroupAvatarActionSheetOpen, setIsGroupAvatarActionSheetOpen] = useState(false);

  // Полноэкранный Telegram-style просмотр аватарок
  const [avatarViewerState, setAvatarViewerState] = useState<{
    isOpen: boolean;
    avatarUrl?: string | null;
    name: string;
    subtitle?: string;
    isGroup?: boolean;
    isEditable?: boolean;
    onEdit?: () => void;
  }>({
    isOpen: false,
    avatarUrl: null,
    name: '',
  });

  // Состояния для прикрепления фото и видео в чаты
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [isMediaDrawerOpen, setIsMediaDrawerOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<{
    file: File;
    previewUrl: string;
    type: 'photo' | 'video' | 'document';
    progress: number;
    uploadedUrl?: string;
    keyHex?: string;
    ivHex?: string;
    caption?: string;
    filename?: string;
    size?: number;
    mimeType?: string;
  } | null>(null);

  // Состояние для красивых Glassmorphism Toast уведомлений
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
    setToast({ message: translateUiText(message, i18n.language), type });
  };
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Состояния авторизации и безопасности
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("is_logged_in") === "true";
  });
  const [currentUserId, setCurrentUserId] = useState<string>(() => localStorage.getItem("current_user_id") || "");
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'recovery'>('login');
  const [username, setUsername] = useState('');
  const [customServerUrl, setCustomServerUrl] = useState(() => localStorage.getItem("gossip_custom_backend_url") || "");
  const [showAdvancedServer, setShowAdvancedServer] = useState(false);
  const [password, setPassword] = useState('');
  const [authStatus, setAuthStatus] = useState('');
  const [authStep, setAuthStep] = useState<number>(0);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [authState, setAuthState] = useState<'welcome' | 'auth' | 'install'>(() => {
    return isAndroidApp ? 'auth' : 'welcome';
  });

  // Стейты генерации и подтверждения мнемонической фразы (12 слов BIP-39)
  const [showMnemonicModal, setShowMnemonicModal] = useState<boolean>(false);
  const [generatedMnemonic, setGeneratedMnemonic] = useState<{ words: string[]; phrase: string }>({ words: [], phrase: '' });
  const [mnemonicConfirmed, setMnemonicConfirmed] = useState<boolean>(false);
  const [mnemonicCopied, setMnemonicCopied] = useState<boolean>(false);
  const [pendingRegisterPayload, setPendingRegisterPayload] = useState<any>(null);

  // Стейты восстановления доступа по мнемонической фразе
  const [recoveryPhraseInput, setRecoveryPhraseInput] = useState<string>('');
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [newPasswordConfirmInput, setNewPasswordConfirmInput] = useState<string>('');
  const [recoveryError, setRecoveryError] = useState<string>('');
  const [isRecoverySubmitting, setIsRecoverySubmitting] = useState<boolean>(false);

  const handleLandingLogin = useCallback(() => setAuthState('auth'), []);
  const handleLandingInstall = useCallback(() => setAuthState('install'), []);
  const handleLandingEnterpriseDemo = useCallback(() => setIsEnterpriseDemoModalOpen(true), []);

  // Адаптация UI под виртуальную клавиатуру и safe-area (iOS/Android/PWA/Electron).
  // Пишет CSS-переменную --app-keyboard-height на :root и даёт isKeyboardOpen
  // для скрытия bottom nav при открытом вводе.
  const { isKeyboardOpen } = useViewportAdaptation();

  // Состояния для PIN-кода и разблокировки БД (R1 / UX-5)
  const [pinInput, setPinInput] = useState('');
  const [showPinOverlay, setShowPinOverlay] = useState(false);
  const [pinOverlayMode, setPinOverlayMode] = useState<'create' | 'unlock'>('unlock');
  const [pinError, setPinError] = useState('');
  const [pinAttempts, setPinAttempts] = useState<number>(0);
  const [showPinResetConfirm, setShowPinResetConfirm] = useState<boolean>(false);
  const [pinCallback, setPinCallback] = useState<((pin: string) => Promise<void>) | null>(null);
  const [pinOverlayUsername, setPinOverlayUsername] = useState('');
  const [pinAutoUnlock, setPinAutoUnlock] = useState(false);

  // UX-4: Состояние публикации пре-ключей на сервере (системная карточка и дедуп)
  const [prekeyPublishStatus, setPrekeyPublishStatus] = useState<'idle' | 'publishing' | 'success' | 'error'>('idle');
  const [prekeyPublishError, setPrekeyPublishError] = useState<string | null>(null);
  const lastPrekeyPublishAttemptRef = useRef<number>(0);
  const [bgServiceEnabled, setBgServiceEnabled] = useState<boolean>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('gossip_bg_service') : null;
    return saved !== null ? saved === 'true' : true;
  });
  const [showTranscriptions, setShowTranscriptions] = useState<Record<string, boolean>>({});
  // On-demand транскрипция голосовых (вариант 1): текст живёт только на устройстве —
  // клиент расшифровывает E2EE-блоб локально и отправляет его на /asr/transcribe
  // исключительно по явному нажатию кнопки-листика (приватность-контракт)
  const [voiceTranscriptions, setVoiceTranscriptions] = useState<Record<string, string>>({});
  const [voiceTranscribing, setVoiceTranscribing] = useState<Record<string, boolean>>({});

  const toggleTranscription = (msgId: string) => {
    setShowTranscriptions(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const requestVoiceTranscription = async (msg: any) => {
    const msgId: string = msg.id;
    if (voiceTranscriptions[msgId] !== undefined || voiceTranscribing[msgId]) {
      toggleTranscription(msgId);
      return;
    }
    try {
      setVoiceTranscribing(prev => ({ ...prev, [msgId]: true }));
      if (!msg.mediaKey || !msg.mediaIv || !msg.mediaUrl) {
        throw new Error('Ключи расшифровки недоступны');
      }
      const encRes = await fetch(getBackendUrl(msg.mediaUrl));
      if (!encRes.ok) throw new Error(`Не удалось скачать аудио (${encRes.status})`);
      const encBuf = await encRes.arrayBuffer();
      const { decryptMediaBuffer } = await import('./core/crypto/e2ee');
      const decBuf = await decryptMediaBuffer(encBuf, msg.mediaKey, msg.mediaIv);
      const audioBlob = new Blob([decBuf], { type: 'audio/ogg' });

      const form = new FormData();
      form.append('file', audioBlob, `voice_${msgId}.ogg`);
      const asrRes = await fetch(getBackendUrl('/api/v1/asr/transcribe'), { method: 'POST', body: form });
      if (!asrRes.ok) {
        const errText = (await asrRes.json().catch(() => ({}) as any))?.detail || asrRes.status;
        throw new Error(`Сервис распознавания: ${errText}`);
      }
      const { text } = await asrRes.json();
      const finalText = (text && String(text).trim()) ? String(text).trim() : 'Речь не распознана (тишина или шум)';
      setVoiceTranscriptions(prev => ({ ...prev, [msgId]: finalText }));
      setShowTranscriptions(prev => ({ ...prev, [msgId]: true }));
    } catch (e: any) {
      console.warn('[VoiceTranscription] Ошибка on-demand транскрипции:', e?.message || e);
      showToast?.('Не удалось расшифровать аудио', 'error');
    } finally {
      setVoiceTranscribing(prev => { const next = { ...prev }; delete next[msgId]; return next; });
    }
  };

  useEffect(() => {
    const savedUsername = localStorage.getItem("username") || "";
    if (savedUsername) {
      const cleanUsername = savedUsername.toLowerCase().trim();
      setPinAutoUnlock(localStorage.getItem(`db_pin_auto_unlock_${cleanUsername}`) === 'true');
    }
  }, [isAuthenticated]);

  const handleTogglePinAutoUnlock = (val: boolean) => {
    const savedUsername = localStorage.getItem("username") || "";
    if (savedUsername) {
      const cleanUsername = savedUsername.toLowerCase().trim();
      localStorage.setItem(`db_pin_auto_unlock_${cleanUsername}`, val ? 'true' : 'false');
      setPinAutoUnlock(val);
      showToast(val ? "Вход без PIN-кода включен" : "PIN-код будет запрашиваться при входе", "success");
    }
  };

  const handleToggleBgService = async (val: boolean) => {
    setBgServiceEnabled(val);
    localStorage.setItem('gossip_bg_service', val ? 'true' : 'false');
    const isAndroid = typeof window !== 'undefined' && (window as any).Capacitor !== undefined && (window as any).Capacitor.getPlatform() === 'android';
    if (isAndroid) {
      try {
        if (val) {
          await GossipBackgroundPlugin.startService();
          showToast("Фоновая служба активна в бесшумном режиме", "success");
        } else {
          await GossipBackgroundPlugin.stopService();
          showToast("Фоновая служба остановлена, системная плашка убрана", "info");
        }
      } catch (err) {
        console.error("[BgService] Ошибка изменения состояния фоновой службы:", err);
      }
    }
  };

  const requestPin = (user: string, mode: 'create' | 'unlock'): Promise<string> => {
    const cleanUser = user.toLowerCase().trim();
    return new Promise((resolve, reject) => {
      setPinOverlayUsername(user);
      setPinOverlayMode(mode);
      setPinInput('');
      setPinError('');
      setPinAttempts(0);
      setShowPinResetConfirm(false);
      setShowPinOverlay(true);
      
      setPinCallback(() => async (pin: string) => {
        if (mode === 'unlock') {
          const isDecoy = await verifyDecoyPin(cleanUser, pin);
          if (isDecoy) {
            setDecoyModeActive(true);
            const decoyAct = getDecoyPinAction(cleanUser);
            if (decoyAct === 'wipe_local') {
              try {
                await storageManager.open(cleanUser, pin, true);
              } catch {}
            }
            const decoys = buildDecoyChats();
            setChats(decoys);
            if (decoys.length > 0) {
              setSelectedChatId(decoys[0].id);
            }
            resolve(pin);
            return;
          }
        }
        setDecoyModeActive(false);
        try {
          await storageManager.open(cleanUser, pin, mode === 'create');
        } catch (openErr: any) {
          console.warn('[PIN] Ошибка открытия локальной БД:', openErr);
          if (mode === 'unlock') {
            const errMessage = openErr?.message || String(openErr);
            const isDecryptionOrPinError = 
              openErr?.name === 'OperationError' ||
              errMessage.includes("DECRYPTION_FAILED") || 
              errMessage.includes("Incorrect password") || 
              errMessage.includes("operation-specific reason") ||
              errMessage.includes("decryption failed") ||
              errMessage.includes("OperationError");

            const dbExists = await storageManager.databaseExists(cleanUser);

            // UX-5: Различаем «неверный PIN» от «база отсутствует/повреждена»
            if (isDecryptionOrPinError && dbExists) {
              console.warn('[PIN] Неверный PIN-код для существующей базы, отклоняем без сброса');
              throw new Error('INVALID_PIN');
            }

            if (!dbExists) {
              console.warn('[PIN] Локальная база отсутствует, создаем хранилище...');
              await storageManager.open(cleanUser, pin, true);
            } else {
              throw openErr;
            }
          } else {
            throw openErr;
          }
        }
        try {
          await downloadAndRestoreVault(pin, cleanUser);
        } catch (vaultErr) {
          console.warn("[PIN] Не удалось синхронизировать сейф из облака, продолжаем локальную работу:", vaultErr);
        }
        sessionStorage.setItem(`db_local_pin_${cleanUser}`, pin);
        // R-HOTFIX-227 / SM-7: лечение строк, отравленных Fail-Closed двойной обработкой
        await healFailClosedPlaceholderRows().catch(() => {});
        resolve(pin);
      });
    });
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length < 4) {
      setPinError('PIN-код должен состоять минимум из 4 символов');
      return;
    }
    setPinError('');
    setIsAuthLoading(true);
    try {
      if (pinCallback) {
        await pinCallback(pinInput);
      }
      setShowPinOverlay(false);
      setPinInput('');
      setPinAttempts(0);
      setShowPinResetConfirm(false);
    } catch (err: any) {
      console.error("[PIN] Ошибка при проверке PIN-кода:", err);
      const errMsg = err?.message || '';
      if (pinOverlayMode === 'create') {
        setPinError(`Ошибка инициализации хранилища (${errMsg || 'сбой шифрования'}). Нажмите "Сбросить данные" ниже.`);
      } else {
        const nextAttempts = pinAttempts + 1;
        setPinAttempts(nextAttempts);
        setPinInput('');
        if (nextAttempts >= 5) {
          setShowPinResetConfirm(true);
          setPinError(`Неверный PIN-код (${nextAttempts}-я неудачная попытка). Если вы забыли PIN, подтвердите явный сброс кэша ниже.`);
        } else {
          setPinError(`Неверный PIN-код (попытка ${nextAttempts} из 5)`);
        }
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    if (!showPinOverlay) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancelPinAndExitToLanding();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPinOverlay]);

  // Фоновая бесшумная ротация публичных одноразовых X3DH пре-ключей (Signal-style)
  const publishPrekeysWithStatus = useCallback(async () => {
    const now = Date.now();
    if (now - lastPrekeyPublishAttemptRef.current < 10000 && prekeyPublishStatus === 'publishing') {
      return;
    }
    lastPrekeyPublishAttemptRef.current = now;
    setPrekeyPublishStatus('idle');
    setPrekeyPublishError(null);

    try {
      await ensureAndPublishPrekeys();
      setPrekeyPublishStatus('idle');
    } catch (err: any) {
      console.warn("[App] Фоновая синхронизация публичных X3DH пре-ключей отложена:", err);
      setPrekeyPublishStatus('idle');
    }
  }, [prekeyPublishStatus]);

  // Базовые состояния UI
  const [activeTab, setActiveTab] = useState<'chats' | 'pulse' | 'wallet' | 'settings'>('chats');
  
  // Настройки отображения вкладок главной панели (Pulse и Кошелек)
  const [showPulseTab, setShowPulseTab] = useState<boolean>(() => {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem('ui_nav_show_pulse');
      return val !== null ? val === 'true' : true;
    }
    return true;
  });
  const [showWalletTab, setShowWalletTab] = useState<boolean>(() => {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem('ui_nav_show_wallet');
      return val !== null ? val === 'true' : true;
    }
    return true;
  });

  const togglePulseTab = useCallback((enabled: boolean) => {
    setShowPulseTab(enabled);
    localStorage.setItem('ui_nav_show_pulse', String(enabled));
    if (!enabled && activeTab === 'pulse') {
      setActiveTab('chats');
    }
  }, [activeTab]);

  const toggleWalletTab = useCallback((enabled: boolean) => {
    setShowWalletTab(enabled);
    localStorage.setItem('ui_nav_show_wallet', String(enabled));
    if (!enabled && activeTab === 'wallet') {
      setActiveTab('chats');
    }
  }, [activeTab]);

  const [selectedChatId, setSelectedChatId] = useState<string>('');
  const [activeTopicId, setActiveTopicId] = useState<number | null>(null);
  const [isTopicConstructorOpen, setIsTopicConstructorOpen] = useState<boolean>(false);
  const [editingTopic, setEditingTopic] = useState<TopicItem | null>(null);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [isGroupCallOpen, setIsGroupCallOpen] = useState<boolean>(false);
  const [activeGroupCallSession, _setActiveGroupCallSession] = useState<GroupCallSession | null>(null);
  const [isGroupCallActive, setIsGroupCallActive] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessageText, setNewMessageText] = useState('');

  // Typing indicator: userIds, печатающие в активном чате (для шапки).
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isEnterpriseDemoModalOpen, setIsEnterpriseDemoModalOpen] = useState(false);
  const [netSnapshot, setNetSnapshot] = useState<NetworkStateSnapshot>(() => connectionManager.getSnapshot());
  const [meshSnapshot, setMeshSnapshot] = useState<MeshStateSnapshot>(() => offlineMeshManager.getSnapshot());
  // §14/F-15: фактическое состояние WebSocket — первичная истина для cloud_online
  const [wsConnected, setWsConnected] = useState<boolean>(true);

  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#admin') {
        const currentU = (localStorage.getItem('username') || username || '').trim().toLowerCase();
        if (currentU === 'up1t3r' || currentU === 'up1t3' || !currentU) {
          setIsAdminModalOpen(true);
        } else {
          showToast('Доступ разрешён только создателю', 'error');
        }
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, [username, showToast]);

  useEffect(() => {
    void transportManager.start().catch(() => {});
    const unsubNet = connectionManager.subscribe(setNetSnapshot);
    const unsubMesh = offlineMeshManager.subscribe(setMeshSnapshot);
    const onWsState = (data: any) => {
      setWsConnected(data?.state === 'online');
    };
    tdlib.onUpdate('connection_state' as any, onWsState);
    return () => {
      unsubNet();
      unsubMesh();
      tdlib.offUpdate('connection_state' as any, onWsState);
    };
  }, []);

  // 4-цветный композитный статус сетевого подключения согласно RFC-2026-004 и AGENTS.md §14 (Zero-Phantom-Mesh Rule)
  const getNetworkStatusUI = () => {
    const details = evaluateNetworkComposite({ ...netSnapshot, wsConnected }, meshSnapshot);
    return {
      colorClass: details.dotClass,
      text: details.text,
      label: details.label,
      status: details.status,
    };
  };

  // Автоматическая очистка системных уведомлений в трее при открытии чата
  useEffect(() => {
    if (selectedChatId) {
      NotificationSyncService.clearChatNotifications(selectedChatId);
      setActiveTopicId(null);
    }
  }, [selectedChatId]);



  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [newChatIsGroup, setNewChatIsGroup] = useState(false);
  const [newChatType, setNewChatType] = useState<'dialog' | 'group' | 'channel'>('dialog');
  const [newChannelUsername, setNewChannelUsername] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [isChannelInfoOpen, setIsChannelInfoOpen] = useState(false);

  // ===== R3 (v2.0.0): Safety Numbers, отложенные, TTL =====
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [safetyPeerIdentityKey, setSafetyPeerIdentityKey] = useState<string | null>(null);
  const [isScheduledModalOpen, setIsScheduledModalOpen] = useState(false);
  const [sendTtlSeconds, setSendTtlSeconds] = useState(0);
  const [chatTtlMenuOpen, setChatTtlMenuOpen] = useState(false);
  const [chatVerified, setChatVerified] = useState(false);
  const [scheduleMenuOpen, setScheduleMenuOpen] = useState(false);

  // R4 (M4.5): режим множественного выбора (isForwardModalOpen из базового состояния)
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<{ username: string; userId: string; }[]>([]);
  const [groupMemberInput, setGroupMemberInput] = useState('');
  const [groupMemberSearchResults, setGroupMemberSearchResults] = useState<any[]>([]);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);
  const memberSearchTimeoutRef = useRef<any>(null);

  // Typing indicator: debounce отправки "печатает" (не чаще 2с при вводе).
  const lastTypingSentRef = useRef<number>(0);
  const typingTextRef = useRef<string>('');
  const TYPING_DEBOUNCE_MS = 2000;

  const [isGroupManageModalOpen, setIsGroupManageModalOpen] = useState(false);
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupInfoMembers, setGroupInfoMembers] = useState<string[]>([]);
  const [groupInfoEpoch, setGroupInfoEpoch] = useState<number>(0);
  const [addMemberInput, setAddMemberInput] = useState('');
  const [addMemberSearchResults, setAddMemberSearchResults] = useState<any[]>([]);
  const [isSearchingAddMember, setIsSearchingAddMember] = useState(false);
  const addMemberSearchTimeoutRef = useRef<any>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  // Состояния VoIP звонков
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [activeCallId, setActiveCallId] = useState('');
  const [activeCallName, setActiveCallName] = useState('');
  const [isOutgoingCall, setIsOutgoingCall] = useState(false);
  const [isIncomingCallOpen, setIsIncomingCallOpen] = useState(false);
  const [incomingCallId, setIncomingCallId] = useState('');
  const [incomingCallName, setIncomingCallName] = useState('');
  const [incomingCallAvatar, setIncomingCallAvatar] = useState('');
  const [incomingCallMediaType, setIncomingCallMediaType] = useState<'audio' | 'video'>('video');
  const [activeCallChatId, setActiveCallChatId] = useState('');
  const [incomingCallChatId, setIncomingCallChatId] = useState('');

  const activeCallIdRef = useRef(activeCallId);
  activeCallIdRef.current = activeCallId;
  const incomingCallIdRef = useRef(incomingCallId);
  incomingCallIdRef.current = incomingCallId;
  const isCallOpenRef = useRef(isCallOpen);
  isCallOpenRef.current = isCallOpen;

  // Константа единого таймаута дозвона (45 секунд) согласно спецификации VoIP
  const CALL_RING_TIMEOUT_MS = 45000;
  const incomingCallTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Состояния действий над звонками для защиты от гонок и повторных вызовов (идемпотентность)
  const callActionStateRef = useRef<Map<string, 'accepting' | 'accepted' | 'declining' | 'declined'>>(new Map());

  const clearIncomingCallTimeout = useCallback(() => {
    if (incomingCallTimeoutRef.current) {
      clearTimeout(incomingCallTimeoutRef.current);
      incomingCallTimeoutRef.current = null;
    }
  }, []);

  const stopRingtoneAndIncomingCall = useCallback((callIdToClear?: string) => {
    clearIncomingCallTimeout();
    try {
      voipAudio.stopRingtone();
      voipAudio.stopRingback();
    } catch (e) {}
    setIsIncomingCallOpen(false);
    setIncomingCallId('');
    setIncomingCallName('');
    setIncomingCallAvatar('');
    setIncomingCallChatId('');
    setInAppNotification(null);
    if (Capacitor.isNativePlatform() && callIdToClear) {
      VoIPNotificationPlugin.cancelIncomingCall({ callId: callIdToClear }).catch(() => {});
      VoIPNotificationPlugin.dismissNotification({ callId: callIdToClear }).catch(() => {});
    }
  }, [clearIncomingCallTimeout]);

  const handleDeclineCall = useCallback(async (callIdToDecline: string, reason: string = 'declined') => {
    if (!callIdToDecline) return;
    const currentState = callActionStateRef.current.get(callIdToDecline);
    if (currentState === 'declining' || currentState === 'declined') {
      console.log(`[UI App] Звонок ${callIdToDecline} уже отклоняется/отклонен, повтор пропущен`);
      return;
    }
    if (currentState === 'accepted' && isCallOpenRef.current && activeCallIdRef.current === callIdToDecline) {
      console.log(`[UI App] Звонок ${callIdToDecline} уже активен, отклонение входящего заблокировано`);
      return;
    }

    callActionStateRef.current.set(callIdToDecline, 'declining');
    stopRingtoneAndIncomingCall(callIdToDecline);

    try {
      await VoIPClient.declineCall(callIdToDecline, reason);
    } catch (err) {
      console.warn('[UI App] Ошибка declineCall:', err);
    } finally {
      callActionStateRef.current.set(callIdToDecline, 'declined');
    }
  }, [stopRingtoneAndIncomingCall]);

  const handleAcceptCall = useCallback(async (
    callIdToAccept: string,
    nameToAccept: string,
    chatToAccept: string,
    mediaToAccept: 'audio' | 'video' = 'video'
  ) => {
    if (!callIdToAccept) return;
    const currentState = callActionStateRef.current.get(callIdToAccept);
    if (currentState === 'declined' || currentState === 'declining') {
      console.warn(`[UI App] Попытка принять уже отклоненный звонок ${callIdToAccept} заблокирована`);
      return;
    }
    if (currentState === 'accepted' || currentState === 'accepting') {
      console.log(`[UI App] Звонок ${callIdToAccept} уже принят/в процессе принятия, повтор пропущен`);
      return;
    }

    callActionStateRef.current.set(callIdToAccept, 'accepting');
    clearIncomingCallTimeout();
    try {
      voipAudio.stopRingtone();
      voipAudio.stopRingback();
    } catch (e) {}

    setIsIncomingCallOpen(false);
    setInAppNotification(null);

    if (Capacitor.isNativePlatform()) {
      VoIPNotificationPlugin.cancelIncomingCall({ callId: callIdToAccept }).catch(() => {});
      VoIPNotificationPlugin.dismissNotification({ callId: callIdToAccept }).catch(() => {});
    }

    setActiveCallId(callIdToAccept);
    setActiveCallName(nameToAccept || 'Собеседник');
    setActiveCallChatId(chatToAccept || '');
    setIncomingCallMediaType(mediaToAccept);
    setIsOutgoingCall(false);
    setIsCallOpen(true);

    callActionStateRef.current.set(callIdToAccept, 'accepted');

    const acceptWithRetry = async () => {
      for (let i = 0; i < 15; i++) {
        try {
          await VoIPClient.acceptCall(callIdToAccept);
          console.log('[UI App] VoIPClient.acceptCall успешно отправлен');
          break;
        } catch (e) {
          console.warn(`[UI App] VoIPClient.acceptCall попытка ${i + 1} ожидает сокет...`);
          await new Promise(r => setTimeout(r, 600));
        }
      }
    };
    acceptWithRetry();
  }, [clearIncomingCallTimeout]);

  const reconcilePendingCall = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const res = await VoIPNotificationPlugin.getPendingCall();
      if (res && res.pendingCall) {
        const pending = res.pendingCall;
        console.log('[UI App] Обнаружен отложенный вызов при сверке (Reconciliation):', pending);
        const resolvedCallId = pending.callId || (pending as any).call_id;
        const resolvedChatId = pending.chatId || (pending as any).chat_id;
        const resolvedCallerName = pending.callerName || (pending as any).caller_name || "Собеседник";
        const resolvedAvatar = pending.callerAvatar || (pending as any).caller_avatar || '';
        const resolvedMediaType = ((pending.mediaType || (pending as any).media_type || 'video') as 'audio' | 'video');

        if (!resolvedCallId) {
          console.warn('[UI App] Отложенный вызов без callId, пропускаем');
          return;
        }

        const currentState = callActionStateRef.current.get(resolvedCallId);
        if (currentState === 'declined' || currentState === 'declining' || currentState === 'accepted') {
          console.log(`[UI App] Отложенный вызов ${resolvedCallId} уже в состоянии ${currentState}, пропускаем`);
          return;
        }

        setIncomingCallAvatar(resolvedAvatar);

        if (pending.wasAnswered) {
          console.log('[UI App] Отложенный вызов уже принят нативно, сразу открываем оверлей разговора...');
          handleAcceptCall(resolvedCallId, resolvedCallerName, resolvedChatId, resolvedMediaType);
        } else {
          console.log('[UI App] Отложенный вызов ожидает ответа пользователя (разблокирован экран)...');
          clearIncomingCallTimeout();
          setIncomingCallId(resolvedCallId);
          setIncomingCallName(resolvedCallerName);
          setIncomingCallAvatar(resolvedAvatar);
          setIncomingCallChatId(resolvedChatId);
          setIncomingCallMediaType(resolvedMediaType);
          setIsIncomingCallOpen(true);
          try {
            voipAudio.startRingtone();
          } catch (e) {}

          incomingCallTimeoutRef.current = setTimeout(() => {
            console.warn(`[UI App] Таймаут отложенного входящего вызова ${resolvedCallId} (45с). Авто-отклонение (missed) и остановка рингтона.`);
            handleDeclineCall(resolvedCallId, 'missed');
          }, CALL_RING_TIMEOUT_MS);

          VoIPNotificationPlugin.dismissNotification({ callId: resolvedCallId }).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[UI App] Ошибка reconcilePendingCall:', err);
    }
  }, [handleAcceptCall, handleDeclineCall, clearIncomingCallTimeout]);

  // Остановка воспроизведения всех кружков и голосовых сообщений при смене чата, вкладки или звонке
  useEffect(() => {
    globalMediaManager.stopAll();
  }, [selectedChatId, activeTab, isCallOpen]);

  console.log("[App LOG] Rendered: isCallOpen=" + isCallOpen + ", activeCallId=" + activeCallId + ", isAuthenticated=" + isAuthenticated + ", authStep=" + authStep);

  // Состояния панели стикеров
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);

  // Состояния записи голосовых Opus сообщений
  const [isAudioRecording, setIsAudioRecording] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const isAudioRecordingRef = useRef<boolean>(false);
  const [audioRecordDuration, setAudioRecordDuration] = useState(0);
  const audioTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Новые состояния для Telegram UX
  const [inputMode, setInputMode] = useState<'mic' | 'video'>('mic');
  const inputModeRef = useRef<'mic' | 'video'>(inputMode);
  inputModeRef.current = inputMode;
  const [audioLockMode, setAudioLockMode] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [audioPlayState, setAudioPlayState] = useState<'paused' | 'playing'>('paused');
  const [audioPeaks, setAudioPeaks] = useState<number[]>([]);

  // Новые состояния для Lock Mode видеокружков
  const [videoLockMode, setVideoLockMode] = useState(false);

  const audioLockModeRef = useRef(audioLockMode);
  useEffect(() => {
    audioLockModeRef.current = audioLockMode;
  }, [audioLockMode]);

  const videoLockModeRef = useRef(videoLockMode);
  useEffect(() => {
    videoLockModeRef.current = videoLockMode;
  }, [videoLockMode]);

  // Состояние всплывающего In-App уведомления
  const [inAppNotification, setInAppNotification] = useState<InAppNotification | null>(null);

  // Состояние критического системного оповещения администратора
  const [systemAlertModal, setSystemAlertModal] = useState<{
    id: string;
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'critical' | 'success';
    timestamp: number;
  } | null>(null);

  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [videoPlayState, setVideoPlayState] = useState<'paused' | 'playing'>('paused');
  const [videoPreviewMuted] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Автоматическая отложенная очистка Object URL (через 120с), чтобы фоновое сжатие,
  // E2EE-шифрование и загрузка кружков/войсов не падали на преждевременно отозванном blob: URL
  useEffect(() => {
    const currentUrl = uploadingFile?.previewUrl;
    return () => {
      if (currentUrl) {
        setTimeout(() => {
          try {
            URL.revokeObjectURL(currentUrl);
          } catch {}
        }, 120000);
      }
    };
  }, [uploadingFile?.previewUrl]);

  useEffect(() => {
    const currentUrl = recordedVideoUrl;
    return () => {
      if (currentUrl) {
        setTimeout(() => {
          try {
            URL.revokeObjectURL(currentUrl);
          } catch {}
        }, 120000);
      }
    };
  }, [recordedVideoUrl]);

  useEffect(() => {
    const currentUrl = recordedAudioUrl;
    return () => {
      if (currentUrl) {
        setTimeout(() => {
          try {
            URL.revokeObjectURL(currentUrl);
          } catch {}
        }, 120000);
      }
    };
  }, [recordedAudioUrl]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.group-member-search-container')) {
        setGroupMemberSearchResults([]);
      }
      if (!target.closest('.add-member-search-container')) {
        setAddMemberSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  // Ссылки для жестов и элементов
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isHoldingRecordRef = useRef(false);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastModeToggleTimeRef = useRef<number>(0);
  const lastTouchTimeRef = useRef<number>(0);

  // Состояния записи круглых видео-кружков
  const [isRecordingVideoNote, setIsRecordingVideoNote] = useState(false);
  const [videoRecordingActive, setVideoRecordingActive] = useState(false);
  const [videoNoteTriggerStart, setVideoNoteTriggerStart] = useState<number>(0);
  const [videoNoteTriggerSwitch, setVideoNoteTriggerSwitch] = useState<number>(0);
  const [videoNoteTriggerStop, setVideoNoteTriggerStop] = useState<number>(0);

   // Новые состояния для Emoji Picker, Реакций и Действий над сообщениями
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const [reactionMenuCoords, setReactionMenuCoords] = useState<{ x: number; y: number } | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [forwardingMessageId, setForwardingMessageId] = useState<string | null>(null);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleteChatModalOpen, setIsDeleteChatModalOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<any>(null);
  const longPressTimeoutRef = useRef<any>(null);
  const isLongPressActive = useRef<boolean>(false);

  // Начальные данные чатов
  const [chats, setChats] = useState<Chat[]>([]);

  // Загрузка топиков форума при выборе активного чата
  useEffect(() => {
    if (!selectedChatId) {
      setTopics([]);
      return;
    }
    const currentChat = chats.find(c => c.id === selectedChatId);
    if (currentChat?.is_forum) {
      storageManager.getTopics(selectedChatId).then((dbTopics) => {
        if (dbTopics && dbTopics.length > 0) {
          const formatted: TopicItem[] = dbTopics.map(t => ({
            topic_id: t.topic_id,
            chat_id: t.chat_id,
            title: t.title,
            icon_emoji: t.icon_emoji || '💬',
            icon_color: t.icon_color || '#3b82f6',
            is_closed: Boolean(t.is_closed),
            unread_count: t.unread_count || 0,
            pinned_message_id: t.pinned_message_id,
            last_message: t.last_message_id ? 'Новые сообщения' : undefined
          }));
          setTopics(formatted);
        } else {
          setTopics([]);
        }
      }).catch(() => {
        setTopics([]);
      });
    } else {
      setTopics([]);
    }
  }, [selectedChatId, chats]);

  // Кэш имен пользователей для отображения реальных имен в групповых чатах
  const [userNamesCache, setUserNamesCache] = useState<Record<string, string>>(() => {
    const cache: Record<string, string> = {};
    try {
      if (typeof window !== 'undefined' && localStorage) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.endsWith('_name')) {
            const userId = key.replace('_name', '');
            const val = localStorage.getItem(key);
            if (val) {
              cache[userId] = val;
            }
          }
        }
      }
    } catch (e) {
      console.error("Error loading userNamesCache from localStorage", e);
    }
    return cache;
  });

  const pendingUserQueries = useRef<Set<string>>(new Set());

  const isUuid = useCallback((str: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  }, []);

  const resolveSenderName = useCallback((userId: string) => {
    if (!userId || userId === 'me' || userId === 'Я' || userId === 'other' || userId === 'others' || userId === 'undefined' || userId === 'null') return;
    if (userNamesCache[userId] && !isPlaceholderChatName(userNamesCache[userId])) return;
    const cachedLocal = typeof localStorage !== 'undefined' ? (localStorage.getItem(`${userId}_name`) || localStorage.getItem(`username_${userId}`)) : null;
    if (cachedLocal && !isPlaceholderChatName(cachedLocal)) {
      setUserNamesCache(prev => ({ ...prev, [userId]: cachedLocal }));
      setChats(prev => prev.map(c => (c.id === userId && !c.isGroup && isPlaceholderChatName(c.name)) ? { ...c, name: cachedLocal } : c));
      storageManager.execute(
        `UPDATE chats 
         SET name = ? 
         WHERE id = ? 
           AND (isGroup = 0 OR isGroup IS NULL)
           AND (name IS NULL OR name IN ('', 'Собеседник', 'Собеседник (Mesh)', 'Чат', 'other', 'others', 'undefined', 'null', 'Пользователь') OR name LIKE '%-%-%-%-%' OR name LIKE 'Пользователь #%');`,
        [cachedLocal, userId]
      ).catch(() => {});
      return;
    }
    if (pendingUserQueries.current.has(userId)) return;

    pendingUserQueries.current.add(userId);

    fetch(getBackendUrl(`/api/v1/users/${userId}`), {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`
      }
    })
    .then(res => {
      if (!res.ok) throw new Error('User not found');
      return res.json();
    })
    .then(userData => {
      if (userData) {
        const name = userData.display_name || userData.username || userData.name;
        if (name && !isPlaceholderChatName(name)) {
          localStorage.setItem(`${userId}_name`, name);
          setUserNamesCache(prev => ({ ...prev, [userId]: name }));
          setChats(prev => prev.map(c => (c.id === userId && !c.isGroup && isPlaceholderChatName(c.name)) ? { ...c, name } : c));
          storageManager.execute(
            `UPDATE chats 
             SET name = ? 
             WHERE id = ? 
               AND (isGroup = 0 OR isGroup IS NULL)
               AND (name IS NULL OR name IN ('', 'Собеседник', 'Собеседник (Mesh)', 'Чат', 'other', 'others', 'undefined', 'null', 'Пользователь') OR name LIKE '%-%-%-%-%' OR name LIKE 'Пользователь #%');`,
            [name, userId]
          ).catch(err => console.warn(`[App] Failed to update chat name in db for ${userId}:`, err));
        }
      }
    })
    .catch(err => {
      console.warn(`Could not resolve sender name for ${userId}:`, err);
    })
    .finally(() => {
      pendingUserQueries.current.delete(userId);
    });
  }, [userNamesCache]);

  const formatUserDisplayName = useCallback((
    rawId?: string | null,
    rawName?: string | null,
    fallbackContext?: string | null
  ): string => {
    const idStr = String(rawId || '').trim();
    const nameStr = String(rawName || '').trim();

    // 1. Если передано валидное имя
    if (
      nameStr &&
      nameStr !== 'Собеседник' &&
      nameStr !== 'Я' &&
      nameStr !== 'Вы' &&
      nameStr !== 'other' &&
      nameStr !== 'others' &&
      nameStr !== 'undefined' &&
      nameStr !== 'null' &&
      !isUuid(nameStr)
    ) {
      return nameStr;
    }

    // 2. Если это сам пользователь
    if (idStr === 'me' || nameStr === 'Я' || nameStr === 'Вы') {
      return nameStr === 'Вы' ? 'Вы' : 'Я';
    }

    // 3. Проверяем кэш в памяти
    if (idStr && userNamesCache[idStr]) {
      const cached = userNamesCache[idStr];
      if (cached && cached !== 'Собеседник' && cached !== 'other' && cached !== 'others' && cached !== 'undefined' && cached !== 'null') {
        return cached;
      }
    }

    // 4. Проверяем localStorage
    if (typeof localStorage !== 'undefined' && idStr) {
      const cached = localStorage.getItem(`${idStr}_name`) || localStorage.getItem(`username_${idStr}`);
      if (cached && cached !== 'Собеседник' && cached !== 'other' && cached !== 'others' && cached !== 'undefined' && cached !== 'null') {
        return cached;
      }
    }

    // 5. Контекстное имя чата (для 1-to-1)
    if (
      fallbackContext &&
      fallbackContext !== 'Чат' &&
      fallbackContext !== 'Группа' &&
      fallbackContext !== 'Собеседник' &&
      fallbackContext !== 'other' &&
      fallbackContext !== 'others' &&
      !isUuid(fallbackContext)
    ) {
      return fallbackContext;
    }

    // 6. Если idStr это человекочитаемый ник
    if (
      idStr &&
      idStr !== 'other' &&
      idStr !== 'others' &&
      idStr !== 'undefined' &&
      idStr !== 'null' &&
      !isUuid(idStr)
    ) {
      return idStr;
    }

    // 7. Детерминированный fallback
    if (idStr && isUuid(idStr)) {
      return `Пользователь #${idStr.slice(-4).toUpperCase()}`;
    }

    return 'Пользователь';
  }, [isUuid, userNamesCache]);

  // Состояния для кастомных папок чатов и Сейф-Контура 152-ФЗ
  const [folders, setFolders] = useState<any[]>([]);
  const [folderMembers, setFolderMembers] = useState<Record<string, string[]>>({});
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isFoldersModalOpen, setIsFoldersModalOpen] = useState(false);
  const [folderEditMode, setFolderEditMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingFolder, setEditingFolder] = useState<any | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState('📁');
  const [newFolderChats, setNewFolderChats] = useState<string[]>([]);
  const [newFolderIs152Fz, setNewFolderIs152Fz] = useState(false);
  const [isChatPrivacyModalOpen, setIsChatPrivacyModalOpen] = useState(false);
  const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
  const chatMenuRef = useRef<HTMLDivElement>(null);

  // Состояния для управления ботами, токенами и инлайн-клавиатурами
  const [isBotManagementOpen, setIsBotManagementOpen] = useState(false);
  const [myBotsCount, setMyBotsCount] = useState(0);

  // Состояния для экосистемы TON (Кошелек и P2P переводы)
  const [isTonWalletModalOpen, setIsTonWalletModalOpen] = useState(false);
  const [isInChatTransferOpen, setIsInChatTransferOpen] = useState(false);

  const fetchMyBotsCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('session_token') || '';
      if (!token) return;
      const res = await fetch(getBackendUrl('/api/v1/bots/my'), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.bots)) {
          setMyBotsCount(data.bots.length);
        }
      }
    } catch (e) {
      // Игнорируем фоновые ошибки
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyBotsCount();
    }
  }, [isAuthenticated, activeTab, fetchMyBotsCount]);

  // Закрытие меню чата при клике снаружи
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) {
        setIsChatMenuOpen(false);
      }
    };
    if (isChatMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isChatMenuOpen]);

  // Проверка принадлежности чата к Сейф-Контуру 152-ФЗ (индивидуально или через папки)
  const isChatIn152FzContour = useCallback((chatId: string) => {
    const directChat = chats.find(c => c.id === chatId);
    if (directChat && (directChat.is152FzContour || (directChat as any).is_152fz_contour === 1)) {
      return true;
    }
    for (const [folderId, memberChatIds] of Object.entries(folderMembers)) {
      if (memberChatIds.includes(chatId)) {
        const folder = folders.find(f => f.id === folderId);
        if (folder && (folder.is_152fz_contour === 1 || folder.is152FzContour)) {
          return true;
        }
      }
    }
    return false;
  }, [chats, folderMembers, folders]);

  // Прямое переключение режима 152-ФЗ для конкретного чата/группы
  const handleToggleChat152Fz = async (chatId: string, enabled: boolean) => {
    try {
      await storageManager.execute(`
        UPDATE chats SET is_152fz_contour = ? WHERE id = ?;
      `, [enabled ? 1 : 0, chatId]);

      setChats(prev => prev.map(c => c.id === chatId ? { ...c, is152FzContour: enabled } : c));
      showToast(enabled ? "🛡️ Режим «Сейф-Контур» включен" : "Режим «Сейф-Контур» отключен", "success");
    } catch (err) {
      console.error("[Safe-Contour] Failed to toggle chat contour:", err);
      showToast("Ошибка при сохранении настроек Сейф-Контура", "error");
    }
  };

  // Инициализация статус-бара на нативных платформах (edge-to-edge, прозрачный
  // статус-бар поверх WKWebView/WebView). Безопасно для PWA/Electron — no-op.
  useEffect(() => {
    const isNative = typeof window !== 'undefined' && (window as any).Capacitor !== undefined && (window as any).Capacitor.isNativePlatform();
    if (!isNative) return;
    (async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Default });
        await StatusBar.setBackgroundColor({ color: '#0A0A0C' });
      } catch (e) {
        console.warn('[StatusBar] init skipped', e);
      }
    })();
  }, []);



  // Прямой вход пользователя по протоколу SRP-6a с Proof-of-Work и аттестацией
  const executeDirectLogin = async (targetUsername: string, targetPassword: string) => {
    setIsAuthLoading(true);
    setErrorMsg('');
    setAuthStep(1);
    setAuthStatus('Инициализация защищенной сессии MTProto...');

    try {
      await new Promise(r => setTimeout(r, 400));

      // 1. Proof-of-Work (защита от DDoS)
      setAuthStep(2);
      setAuthStatus('Получение PoW задачи от сервера...');
      const powChallenge = await tdlib.send("pow.get_challenge", { identity: targetUsername, authMode: 'login' });
      
      setAuthStatus(`Вычисление Proof-of-Work (сложность: ${powChallenge.difficulty} бит)...`);
      const powNonce = await solvePoW(powChallenge.challengeHex, powChallenge.difficulty);
      
      setAuthStatus('Проверка Proof-of-Work токена...');
      await tdlib.send("pow.verify", { nonceHex: powNonce });

      // 2. Выполнение Device Attestation
      setAuthStatus('Проверка подлинности среды (Device Attestation)...');
      const attestationToken = await getDeviceAttestationToken("nonce_check_auth_" + targetUsername);

      // 3. Выполнение SRP 6a login
      setAuthStep(3);
      setAuthStatus('Запрос параметров SRP 6a (соль, B)...');
      const srpParams = await tdlib.send("srp.get_params", { username: targetUsername });

      if (!srpParams?.BHex) {
        throw new Error('Сервер авторизации недоступен. Проверьте подключение к сети и адрес бэкенда.');
      }

      setAuthStatus('Вычисление эфемерного ключа клиента...');
      const { a, A } = srpGenerateEphemeral();
      
      setAuthStatus('Расчет общего сессионного секрета S...');
      const canonicalUser = srpParams.canonicalUsername || targetUsername;
      const x = await srpCalculateX(srpParams.saltHex, canonicalUser, targetPassword);
      const B = BigInt("0x" + srpParams.BHex);
      const u = await srpCalculateU(A, B);
      const S = await srpCalculateClientS(a, A, B, x, u);
      
      setAuthStatus('Генерация подтверждения M1...');
      const M1 = await srpCalculateM1(A, B, S);
      
      setAuthStatus('Аутентификация SRP 6a на сервере...');
      const loginRes = await tdlib.send("srp.login", {
        username: canonicalUser,
        AHex: A.toString(16),
        M1Hex: M1,
        attestationToken
      });
      
      const expectedM2 = await srpCalculateM2(A, M1, S);
      if (loginRes.M2Hex !== expectedM2) {
        console.warn("[SRP] M2 от сервера не совпадает с локальным расчетом!");
      }

      setAuthStep(4);
      setAuthStatus('Расшифровка базы данных SQLCipher...');
      const srpSessionKey = loginRes.sessionKeyHex || "default_auth_srp_session_key_123456";
      
      localStorage.setItem("srp_session_key", srpSessionKey);
      localStorage.setItem("session_token", loginRes.token);
      localStorage.setItem("username", canonicalUser);
      
      let userId = "";
      try {
        const meRes = await fetch(getBackendUrl("/api/v1/users/me"), {
          headers: {
            "Authorization": `Bearer ${loginRes.token}`
          }
        });
        if (!meRes.ok) {
          throw new Error(`Сервер вернул статус ${meRes.status} при получении профиля`);
        }
        const meData = await meRes.json();
        if (!meData || !meData.userId) {
          throw new Error("В ответе профиля отсутствует userId");
        }
        userId = meData.userId;
        localStorage.setItem("current_user_id", userId);
        try { void offlineMeshManager.refreshNodeIdentity(); } catch (e) {}
        setCurrentUserId(userId);
        const premiumStatus = Boolean(meData.is_premium);
        setIsPremium(premiumStatus);
        localStorage.setItem("gossip_is_premium", String(premiumStatus));
        let effectiveAvatar = meData.avatar;
        const localSavedAvatar = localStorage.getItem("profile_avatar_url");
        if (effectiveAvatar && effectiveAvatar !== '👤') {
          localStorage.setItem("profile_avatar_url", effectiveAvatar);
          setProfileAvatarUrl(effectiveAvatar);
        } else if (localSavedAvatar && localSavedAvatar !== '👤') {
          effectiveAvatar = localSavedAvatar;
          fetch(getBackendUrl("/api/v1/users/me/avatar"), {
            method: "PATCH",
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${loginRes.token}`
            },
            body: JSON.stringify({ avatar: localSavedAvatar })
          }).catch(err => console.warn("[Auth] Авто-восстановление аватара на сервер:", err));
        }

        try {
          await saveSessionToIndexedDB(userId, loginRes.token, effectiveAvatar, meData.username || targetUsername);
        } catch (dbErr) {
          console.error("[Auth] Ошибка сохранения сессии в IndexedDB:", dbErr);
        }
        if (meData.username) {
          localStorage.setItem("username", meData.username);
        }
        console.log(`[Auth] Получен динамический userId при авторизации: ${userId}`);
      } catch (meErr: any) {
        console.error("[Auth] Ошибка получения профиля после входа:", meErr);
        throw new Error(`Не удалось загрузить профиль пользователя: ${meErr.message || meErr}`);
      }
      
      syncManager.resetState();
      
      const mlsKeyPair = generateMlsKeyPair();
      localStorage.setItem("mls_x25519_pub", bytesToHex(mlsKeyPair.x25519.publicKey));
      localStorage.setItem("mls_x25519_priv", bytesToHex(mlsKeyPair.x25519.privateKey));
      localStorage.setItem("mls_kyber_pub", bytesToHex(mlsKeyPair.kyber.publicKey));
      localStorage.setItem("mls_kyber_priv", bytesToHex(mlsKeyPair.kyber.privateKey));

      setAuthStep(5);
      setAuthStatus('Авторизация успешна!');
      
      const cleanUsername = targetUsername.toLowerCase().trim();
      if (isTestEnv()) {
        let localPin = sessionStorage.getItem(`db_local_pin_${cleanUsername}`);
        if (!localPin) {
          localPin = window.crypto.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2);
          sessionStorage.setItem(`db_local_pin_${cleanUsername}`, localPin);
        }
        await storageManager.open(cleanUsername, localPin);
        try {
          await downloadAndRestoreVault(localPin, cleanUsername);
        } catch (vaultErr) {
          console.warn("[Test] Не удалось восстановить сейф в тестовом режиме:", vaultErr);
        }
      } else {
        setIsAuthLoading(false);

        const dbExists = await storageManager.databaseExists(cleanUsername);
        const hasMasterKey = !!localStorage.getItem(`db_master_key_enc_${cleanUsername}`);

        if (!dbExists || !hasMasterKey) {
          await requestPin(cleanUsername, 'create');
        } else {
          const autoOpened = await storageManager.tryAutoOpen(cleanUsername);
          if (!autoOpened) {
            await requestPin(cleanUsername, 'unlock');
          }
        }
      }

      await syncManager.initialize();
      
      localStorage.setItem("is_logged_in", "true");
      setIsAuthenticated(true);
      setIsAuthLoading(false);
      setAuthStep(0);
    } catch (err: any) {
      console.error("[Auth] Ошибка авторизации:", err);
      setErrorMsg(err.message || 'Ошибка авторизации');
      setIsAuthLoading(false);
      setAuthStep(0);
    }
  };

  // Обработчик формы авторизации (Login / Register)
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    if (authMode === 'login') {
      await executeDirectLogin(username.trim(), password);
      return;
    }

    if (authMode === 'register') {
      setIsAuthLoading(true);
      setErrorMsg('');
      setAuthStep(1);
      setAuthStatus('Инициализация криптографической мастер-энтропии (BIP-39)...');

      try {
        await new Promise(r => setTimeout(r, 400));

        // 1. Proof-of-Work (защита от DDoS)
        setAuthStep(2);
        setAuthStatus('Получение PoW задачи от сервера...');
        const powChallenge = await tdlib.send("pow.get_challenge", { identity: username.trim(), authMode: 'register' });
        
        setAuthStatus(`Вычисление Proof-of-Work (сложность: ${powChallenge.difficulty} бит)...`);
        const powNonce = await solvePoW(powChallenge.challengeHex, powChallenge.difficulty);
        
        setAuthStatus('Проверка Proof-of-Work токена...');
        await tdlib.send("pow.verify", { nonceHex: powNonce });

        // 2. Device Attestation
        setAuthStatus('Проверка подлинности среды (Device Attestation)...');
        const attestationToken = await getDeviceAttestationToken("nonce_check_auth_" + username.trim());

        // 3. Генерация 12 мнемонических слов (BIP-39)
        setAuthStep(3);
        setAuthStatus('Генерация криптографической Seed-фразы (12 слов)...');
        const mnemonic = await generateMnemonic();
        const recoveryHash = await deriveRecoveryHash(mnemonic.phrase);
        const saltHex = powChallenge.saltHex || "abcd1234ef9876543210fedcba987654";
        const verifier = await srpGenerateVerifier(saltHex, username.trim(), password);

        setPendingRegisterPayload({
          username: username.trim(),
          password,
          saltHex,
          verifierHex: verifier,
          attestationToken,
          recoveryKeyHash: recoveryHash,
          phrase: mnemonic.phrase
        });
        setGeneratedMnemonic(mnemonic);
        setMnemonicConfirmed(false);
        setMnemonicCopied(false);
        setIsAuthLoading(false);
        setAuthStep(0);
        setShowMnemonicModal(true);
      } catch (err: any) {
        console.error("[Auth] Ошибка при подготовке регистрации:", err);
        setErrorMsg(err.message || 'Ошибка регистрации');
        setIsAuthLoading(false);
        setAuthStep(0);
      }
    }
  };

  // Завершение регистрации после подтверждения сохранения 12 слов
  const handleConfirmMnemonicAndRegister = async () => {
    if (!pendingRegisterPayload) return;
    setIsAuthLoading(true);
    setShowMnemonicModal(false);
    setAuthStep(3);
    setAuthStatus('Регистрация пользователя с защитой BIP-39...');

    try {
      await tdlib.send("srp.register", {
        username: pendingRegisterPayload.username,
        saltHex: pendingRegisterPayload.saltHex,
        verifierHex: pendingRegisterPayload.verifierHex,
        attestationToken: pendingRegisterPayload.attestationToken,
        recoveryKeyHash: pendingRegisterPayload.recoveryKeyHash
      });

      // Сохраняем локальный бэкап на устройстве
      try {
        localStorage.setItem(`gossip_mnemonic_${pendingRegisterPayload.username}`, pendingRegisterPayload.phrase);
      } catch (e) {
        console.warn("[Mnemonic] Не удалось записать в localStorage:", e);
      }

      showToast("Аккаунт успешно создан! Выполняем защищенный вход...", "success");
      setAuthMode('login');
      // Автоматический вход
      await executeDirectLogin(pendingRegisterPayload.username, pendingRegisterPayload.password);
    } catch (err: any) {
      console.error("[Auth] Ошибка подтверждения регистрации:", err);
      setErrorMsg(err.message || 'Ошибка регистрации');
      setIsAuthLoading(false);
      setAuthStep(0);
    }
  };

  // Обработчик сброса пароля по мнемонической фразе (12 слов)
  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');

    if (!username.trim()) {
      setRecoveryError('Введите имя пользователя');
      return;
    }
    if (!validateMnemonic(recoveryPhraseInput)) {
      setRecoveryError('Введите ровно 12 корректных слов мнемонической фразы через пробел (стандарт BIP-39)');
      return;
    }
    if (!newPasswordInput || newPasswordInput.length < 6) {
      setRecoveryError('Новый пароль должен содержать минимум 6 символов');
      return;
    }
    if (newPasswordInput !== newPasswordConfirmInput) {
      setRecoveryError('Пароли не совпадают');
      return;
    }

    setIsRecoverySubmitting(true);
    try {
      // 1. Запрос челленджа восстановления
      const chalRes = await fetch(getBackendUrl("/api/v1/auth/recovery/challenge"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() })
      });
      if (!chalRes.ok) {
        const data = await chalRes.json().catch(() => ({}));
        throw new Error(data.detail || 'Пользователь не найден');
      }
      const chalData = await chalRes.json();

      // 2. Вычисление доказательства владения мнемоникой
      const proofHex = await deriveRecoveryHash(recoveryPhraseInput);

      // 3. Вычисление нового SRP верификатора и соли
      const newSaltBytes = new Uint8Array(16);
      window.crypto.getRandomValues(newSaltBytes);
      const newSaltHex = Array.from(newSaltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      const newVerifierHex = await srpGenerateVerifier(newSaltHex, username.trim(), newPasswordInput);

      // 4. Отправка запроса сброса на бэкенд
      const resetRes = await fetch(getBackendUrl("/api/v1/auth/recovery/reset"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          challenge: chalData.challenge,
          proofHex,
          newSaltHex,
          newVerifierHex
        })
      });

      if (!resetRes.ok) {
        const data = await resetRes.json().catch(() => ({}));
        throw new Error(data.detail || 'Неверная мнемоническая фраза');
      }

      showToast("Пароль успешно восстановлен! Выполняем вход...", "success");
      try {
        localStorage.setItem(`gossip_mnemonic_${username.trim()}`, recoveryPhraseInput.trim());
      } catch (e) {}

      setPassword(newPasswordInput);
      setAuthMode('login');
      setRecoveryPhraseInput('');
      setNewPasswordInput('');
      setNewPasswordConfirmInput('');

      // Выполняем вход с новым паролем
      await executeDirectLogin(username.trim(), newPasswordInput);
    } catch (err: any) {
      console.error("[Recovery] Ошибка восстановления:", err);
      setRecoveryError(err.message || 'Ошибка восстановления доступа');
    } finally {
      setIsRecoverySubmitting(false);
    }
  };

  // Открытие DM-чата с упомянутым пользователем (M1.2 mention-click, CS-M2).
  // username -> userId через /api/v1/users/search, затем открыть/создать чат.
  const handleMentionClick = async (username: string) => {
    try {
      const res = await fetch(getBackendUrl(`/api/v1/users/search?username=${encodeURIComponent(username)}&exact=true`));
      if (!res.ok) {
        showToast(`Пользователь @${username} не найден`, "error");
        return;
      }
      const data = await res.json();
      const userId: string | null = data.userId || (Array.isArray(data) ? data[0]?.userId : null);
      if (!userId) {
        showToast(`Пользователь @${username} не найден`, "error");
        return;
      }
      const existing = chats.find(c => c.id === userId);
      if (existing) {
        setSelectedChatId(userId);
        return;
      }
      // Создаём DM-чат, если ещё нет (peer == userId)
      const createRes = await fetch(getBackendUrl("/api/v1/chats"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("session_token")}`
        },
        body: JSON.stringify({ chat_id: userId })
      });
      if (createRes.ok) {
        setSelectedChatId(userId);
        showToast(`Открыт чат с @${username}`, "info");
      } else {
        showToast(`Не удалось открыть чат с @${username}`, "error");
      }
    } catch (e) {
      showToast(`Не удалось открыть профиль @${username}`, "error");
    }
  };

  // Hashtag: toast-заглушка до M1.3 (CS-H2). Реальный поиск невозможен на
  // сервере из-за E2EE; клиентский FTS (M1.3) закроет и сообщения, и теги.
  const handleHashtagClick = (tag: string) => {
    showToast(`Поиск по тегу «#${tag}» появится в следующем обновлении`, "info");
  };

  const handleLogout = async () => {
    const keysToKeep = ["theme", "gossip_custom_backend_url"];
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
      if (!k.startsWith("db_") && !k.startsWith("e2ee_") && !keysToKeep.includes(k)) {
        localStorage.removeItem(k);
      }
    });
    setIsAuthenticated(false);
    try {
      await clearSessionFromIndexedDB();
    } catch (e) {}
    try {
      await storageManager.close();
    } catch (e) {
      console.error("[Auth] Ошибка закрытия БД при выходе:", e);
    }
    window.location.reload();
  };

  const handleCancelPinAndExitToLanding = async () => {
    setShowPinOverlay(false);
    setPinInput('');
    setPinError('');
    await handleLogout();
  };

  const handleClearLocalStorageAndExit = async () => {
    try {
      await storageManager.close();
    } catch (e) {}

    const theme = localStorage.getItem("theme");
    const customBackend = localStorage.getItem("gossip_custom_backend_url");

    localStorage.clear();

    if (theme) localStorage.setItem("theme", theme);
    if (customBackend) localStorage.setItem("gossip_custom_backend_url", customBackend);

    try {
      if (typeof indexedDB !== 'undefined') {
        indexedDB.deleteDatabase('gossip_secure_storage');
        indexedDB.deleteDatabase('gossip_raw_files');
        indexedDB.deleteDatabase('gossip-sw-db');
        console.log('[Clear Storage] Базы IndexedDB успешно удалены');
      }
    } catch (e) {
      console.warn('[Clear Storage] Ошибка удаления IndexedDB:', e);
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.getDirectory) {
        const root = await navigator.storage.getDirectory();
        const entries = (root as any).entries ? (root as any).entries() : null;
        if (entries) {
          // Безопасный обход асинхронного итератора без использования синтаксиса "for await"
          // Это предотвращает SyntaxError в более старых Android WebView при загрузке скрипта
          const iterator = entries[Symbol.asyncIterator] ? entries[Symbol.asyncIterator]() : entries;
          if (iterator && typeof iterator.next === 'function') {
            while (true) {
              const res = await iterator.next();
              if (res.done) break;
              if (res.value && Array.isArray(res.value)) {
                const [name] = res.value;
                if (name) {
                  await root.removeEntry(name, { recursive: true }).catch(() => {});
                }
              }
            }
          }
        } else {
          // Фолбек: удаляем типичный файл БД
          const keys = Object.keys(localStorage);
          for (const k of keys) {
            if (k.startsWith('db_master_key_enc_')) {
              const u = k.replace('db_master_key_enc_', '');
              if (u) {
                await root.removeEntry(`gossip_${u}.db`).catch(() => {});
              }
            }
          }
        }
        console.log('[Clear Storage] OPFS успешно очищена');
      }
    } catch (e) {
      console.warn('[Clear Storage] Ошибка очистки OPFS:', e);
    }

    window.location.reload();
  };

  // Ссылки для доступа к актуальному значению в коллбеках
  const selectedChatIdRef = useRef(selectedChatId);
  selectedChatIdRef.current = selectedChatId;

  const chatsRef = useRef(chats);
  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  // Состояния для FTS5 поиска
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const [globalSearchUser, setGlobalSearchUser] = useState<{ userId: string, username: string, avatar?: string } | null>(null);
  const [globalSearchResults, setGlobalSearchResults] = useState<Array<{ userId: string; username: string; avatar?: string; displayName?: string; display_name?: string; short_id?: number | null; collision?: boolean }>>([]);
  // M1.3: in-chat search state
  const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  const virtualMessageListRef = useRef<VirtualMessageListHandle>(null);

  // Черновики сообщений (Drafts) — R3: зашифрованная SQLite как первичное
  // хранилище; localStorage используется только для разовой миграции.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const legacy = localStorage.getItem('gossip_drafts');
        if (legacy) {
          // Разовая миграция: localStorage → SQLite, ключ удаляем
          const parsed = JSON.parse(legacy) as Record<string, string>;
          for (const [chatId, text] of Object.entries(parsed)) {
            if (text) await storageManager.setChatDraft(chatId, text);
          }
          localStorage.removeItem('gossip_drafts');
          if (!cancelled) setDrafts(parsed);
          return;
        }
        const fromDb = await storageManager.getAllChatDrafts();
        if (!cancelled && Object.keys(fromDb).length > 0) setDrafts(fromDb);
      } catch (e) {
        console.warn('[App] Ошибка загрузки черновиков из SQLite:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    // Write-through: каждое изменение черновиков дублируем в SQLite
    for (const [chatId, text] of Object.entries(drafts)) {
      storageManager.setChatDraft(chatId, text).catch(() => undefined);
    }
  }, [drafts]);

  // Закрепленные сообщения (Pinned Messages)
  const [pinnedMessageMap, setPinnedMessageMap] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('gossip_pinned_messages');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [pinnedIndexMap, setPinnedIndexMap] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      localStorage.setItem('gossip_pinned_messages', JSON.stringify(pinnedMessageMap));
    } catch (e) {}
  }, [pinnedMessageMap]);

  // Галерея медиа в чате (Media Gallery)
  const [mediaGalleryState, setMediaGalleryState] = useState<{
    isOpen: boolean;
    items: MediaGalleryItem[];
    initialIndex: number;
  }>({
    isOpen: false,
    items: [],
    initialIndex: 0,
  });

  // Шторка профиля и общих материалов (Shared Media Drawer)
  const [isSharedMediaDrawerOpen, setIsSharedMediaDrawerOpen] = useState(false);

  // Gossip Premium
  const [isPremium, setIsPremium] = useState<boolean>(() => {
    return localStorage.getItem('gossip_is_premium') === 'true';
  });
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isPremiumSecurityModalOpen, setIsPremiumSecurityModalOpen] = useState(false);
  const [voiceChangerPreset, setVoiceChangerPreset] = useState<VoiceChangerPreset>(() => {
    return (localStorage.getItem('gossip_voice_preset') as VoiceChangerPreset) || 'original';
  });

  const handleSelectVoicePreset = useCallback((preset: VoiceChangerPreset) => {
    setVoiceChangerPreset(preset);
    localStorage.setItem('gossip_voice_preset', preset);
  }, []);

  const handleOpenBurnerChat = useCallback((burner: BurnerLinkItem) => {
    const chatId = burner.chat_id;
    const chatTitle = burner.title.startsWith('🔥') ? burner.title : `🔥 ${burner.title}`;
    const newBurnerChat: Chat = {
      id: chatId,
      name: chatTitle,
      avatar: '🔥',
      lastMessage: 'Одноразовая Burner-комната активна',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      unread: 0,
      isGroup: true,
      online: true,
      messages: [],
    };
    setChats((prev) => {
      if (prev.some((c) => c.id === chatId)) return prev;
      return [newBurnerChat, ...prev];
    });
    setSelectedChatId(chatId);
    setActiveTab('chats');
    setMobileView('chat');
  }, []);

  const handleBurnActiveRoom = useCallback(async (chatId: string) => {
    try {
      await burnRoomImmediately(chatId);
    } catch {}
    try {
      await storageManager.execute('DELETE FROM messages WHERE chatId = ?;', [chatId]);
      await storageManager.execute('DELETE FROM chats WHERE id = ?;', [chatId]);
    } catch {}
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    setSelectedChatId((prev) => (prev === chatId ? '' : prev));
    showToast('🔥 Одноразовая Burner-комната и все сообщения уничтожены', 'info');
  }, []);

  // Авто-вход по одноразовой ссылке ?burner=<token> (работает даже для гостей без регистрации)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const burnerToken = params.get('burner');
    if (!burnerToken) return;

    window.history.replaceState({}, document.title, window.location.pathname);
    (async () => {
      try {
        const joined = await joinBurnerLink(burnerToken);
        if (joined.ephemeral_session_token && !localStorage.getItem('session_token')) {
          localStorage.setItem('session_token', joined.ephemeral_session_token);
          localStorage.setItem('token', joined.ephemeral_session_token);
          if (joined.ephemeral_username) {
            localStorage.setItem('username', joined.ephemeral_username);
            setUsername(joined.ephemeral_username);
          }
          if (joined.user_id) {
            localStorage.setItem('current_user_id', joined.user_id);
            setCurrentUserId(joined.user_id);
          }
          setIsAuthenticated(true);
        }
        handleOpenBurnerChat({
          token: joined.token,
          chat_id: joined.chat_id,
          title: joined.title,
          ttl_minutes: 60,
          single_use: true,
          max_participants: joined.max_participants,
          participants_count: joined.participants_count,
          is_burned: false,
          created_at: new Date().toISOString(),
          expires_at: joined.expires_at,
        });
        showToast(`🔥 Вы вошли в одноразовую комнату: ${joined.title}`, 'success');
      } catch (err: any) {
        showToast(err.message || 'Одноразовая Burner-ссылка недействительна или уже уничтожена', 'error');
      }
    })();
  }, [handleOpenBurnerChat]);

  const handleRefreshPremium = useCallback(async () => {
    const token = localStorage.getItem("session_token") || localStorage.getItem("token") || "";
    if (!token) return;
    try {
      const meRes = await fetch(getBackendUrl("/api/v1/users/me"), {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        const premiumStatus = Boolean(meData.is_premium);
        setIsPremium(premiumStatus);
        localStorage.setItem('gossip_is_premium', String(premiumStatus));
        if (premiumStatus) {
          showToast('⭐ Gossip Premium активен!', 'success');
        }
      }
    } catch (e) {
      console.warn('[Premium] Ошибка обновления статуса:', e);
    }
  }, []);

  // Проверка статуса при возврате с оплаты ЮKassa через сервер
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('payment=success')) {
      handleRefreshPremium();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [handleRefreshPremium]);

  // Беззвучный режим для чатов (Mute)
  const [mutedChatIds, setMutedChatIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('gossip_muted_chats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleToggleMuteChat = (chatId: string) => {
    setMutedChatIds(prev => {
      const next = prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId];
      try {
        localStorage.setItem('gossip_muted_chats', JSON.stringify(next));
      } catch (e) {}
      showToast(prev.includes(chatId) ? "Звук уведомлений включен" : "Чат переведен в беззвучный режим", "info");
      return next;
    });
  };

  // Полноценный многоуровневый обработчик аппаратной кнопки "Назад" на Android (Telegram-like UX)
  useEffect(() => {
    const isNative = typeof window !== 'undefined' && (window as any).Capacitor !== undefined && (window as any).Capacitor.isNativePlatform();
    if (!isNative) return;

    console.log("[App] Инициализация расширенного слушателя backButton для Capacitor");
    const handlerPromise = CapApp.addListener('backButton', () => {
      console.log("[App backButton] Нажата аппаратная кнопка Назад");

      // 1. Полноэкранный просмотрщик фото/видео / Галерея
      if (mediaGalleryState.isOpen) {
        setMediaGalleryState(prev => ({ ...prev, isOpen: false }));
      } else if (selectedPhotoUrl) {
        setSelectedPhotoUrl(null);
      }
      // 1.5. Шторка прикрепления медиа (MediaAttachmentDrawer) и видоискатель камеры
      else if (isMediaDrawerOpen) {
        window.dispatchEvent(new CustomEvent('gossip_drawer_back'));
      }
      // 2. Шторка профиля / Премиум
      else if (isSharedMediaDrawerOpen) {
        setIsSharedMediaDrawerOpen(false);
      } else if (isPremiumModalOpen) {
        setIsPremiumModalOpen(false);
      }
      // 3. Контекстное меню реакций / действий / меню чата
      else if (isChatMenuOpen) {
        setIsChatMenuOpen(false);
      } else if (reactionMenuCoords) {
        setReactionMenuCoords(null);
      }
      // 3. Панели эмодзи и стикеров
      else if (isEmojiPickerOpen) {
        setIsEmojiPickerOpen(false);
      } else if (isStickerPickerOpen) {
        setIsStickerPickerOpen(false);
      }
      // 4. Поиск внутри открытого чата
      else if (isChatSearchOpen) {
        setIsChatSearchOpen(false);
      }
      // 5. Вложения и превью отправки
      else if (uploadingFile) {
        setUploadingFile(null);
      }
      // 6. Баннеры ответа и редактирования
      else if (replyingToMessage) {
        setReplyingToMessage(null);
      } else if (editingMessage) {
        setEditingMessage(null);
      }
      // 7. Модальные окна приложения
      else if (isForwardModalOpen) {
        setIsForwardModalOpen(false);
      } else if (isDeleteChatModalOpen) {
        setIsDeleteChatModalOpen(false);
      } else if (isFoldersModalOpen) {
        setIsFoldersModalOpen(false);
      } else if (isNetworkModalOpen) {
        setIsNetworkModalOpen(false);
      } else if (isInfoModalOpen) {
        setIsInfoModalOpen(false);
      } else if (isNewChatModalOpen) {
        setIsNewChatModalOpen(false);
      } else if (isGroupManageModalOpen) {
        setIsGroupManageModalOpen(false);
      } else if (isChatPrivacyModalOpen) {
        setIsChatPrivacyModalOpen(false);
      } else if (isLanguageModalOpen) {
        setIsLanguageModalOpen(false);
      }
      // 8. Глобальный поиск пользователей
      else if (globalSearchResults.length > 0 || globalSearchUser) {
        setGlobalSearchResults([]);
        setGlobalSearchUser(null);
      } else if (searchQuery) {
        setSearchQuery('');
      }
      // 9. Вкладки Pulse, Wallet или Настройки
      else if (activeTab !== 'chats') {
        setActiveTab('chats');
      }
      // 10. Возврат из активного чата в список диалогов на мобильном
      else if (mobileView === 'chat') {
        setMobileView('list');
        setSelectedChatId('');
      }
      // 11. Если открыт корень списка чатов и ничего не активно — закрываем/сворачиваем приложение
      else {
        CapApp.exitApp();
      }
    });

    return () => {
      handlerPromise.then(h => h.remove()).catch(() => {});
    };
  }, [
    isMediaDrawerOpen,
    isSharedMediaDrawerOpen,
    isPremiumModalOpen,
    isNetworkModalOpen,
    isChatPrivacyModalOpen,
    isLanguageModalOpen,
    selectedPhotoUrl,
    reactionMenuCoords,
    isEmojiPickerOpen,
    isStickerPickerOpen,
    isChatSearchOpen,
    uploadingFile,
    replyingToMessage,
    editingMessage,
    isForwardModalOpen,
    isDeleteChatModalOpen,
    isFoldersModalOpen,
    isInfoModalOpen,
    isNewChatModalOpen,
    isGroupManageModalOpen,
    globalSearchUser,
    globalSearchResults,
    searchQuery,
    activeTab,
    mobileView,
    selectedChatId
  ]);

  // Инициализация БД и подписки на SyncManager
  useEffect(() => {
    if (!isAuthenticated) return;

    let isSubscribed = true;
    let handleSyncChats: (() => void) | null = null;
    let cloudSyncInterval: any = null;

    const initAndSubscribe = async () => {
      try {
        // Пытаемся восстановить сессию и аватар из IndexedDB, если localStorage был очищен при обновлении приложения
        let token = localStorage.getItem("session_token") || "";
        let savedAvatar = localStorage.getItem("profile_avatar_url");
        let initialSavedUsername = localStorage.getItem("username");
        let currentUid = localStorage.getItem("current_user_id");

        try {
          const restored = await restoreSessionFromIndexedDB();
          if (!token && restored.token) {
            token = restored.token;
            localStorage.setItem("session_token", token);
          }
          if (!savedAvatar && restored.avatarUrl) {
            savedAvatar = restored.avatarUrl;
            localStorage.setItem("profile_avatar_url", savedAvatar);
            setProfileAvatarUrl(savedAvatar);
          }
          if (!initialSavedUsername && restored.username) {
            initialSavedUsername = restored.username;
            localStorage.setItem("username", initialSavedUsername);
          }
          if (!currentUid && restored.userId) {
            currentUid = restored.userId;
            localStorage.setItem("current_user_id", currentUid);
        try { void offlineMeshManager.refreshNodeIdentity(); } catch (e) {}
            setCurrentUserId(currentUid);
          }
        } catch (dbRestoreErr) {
          console.warn("[App] Ошибка восстановления сессии из IndexedDB:", dbRestoreErr);
        }

        // Пытаемся актуализировать профиль и получить userId при старте
        if (token) {
          try {
            const meRes = await fetch(getBackendUrl("/api/v1/users/me"), {
              headers: {
                "Authorization": `Bearer ${token}`
              }
            });
            if (!isSubscribed) return;
            if (meRes.ok) {
              const meData = await meRes.json();
              if (meData && meData.userId) {
                localStorage.setItem("current_user_id", meData.userId);
        try { void offlineMeshManager.refreshNodeIdentity(); } catch (e) {}
                setCurrentUserId(meData.userId);
                const premiumStatus = Boolean(meData.is_premium);
                setIsPremium(premiumStatus);
                localStorage.setItem("gossip_is_premium", String(premiumStatus));

                let effectiveAvatar = meData.avatar;
                if (effectiveAvatar && effectiveAvatar !== '👤') {
                  localStorage.setItem("profile_avatar_url", effectiveAvatar);
                  setProfileAvatarUrl(effectiveAvatar);
                  console.log(`[App] Аватар загружен с сервера: avatar=${meData.avatar}`);
                } else if (savedAvatar && savedAvatar !== '👤') {
                  // На сервере дефолтный аватар '👤', но локально у пользователя сохранен кастомный аватар -> восстанавливаем его на сервере
                  effectiveAvatar = savedAvatar;
                  fetch(getBackendUrl("/api/v1/users/me/avatar"), {
                    method: "PATCH",
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ avatar: savedAvatar })
                  }).catch(err => console.warn("[App] Авто-восстановление аватара на сервер:", err));
                }

                try {
                  await saveSessionToIndexedDB(meData.userId, token, effectiveAvatar, meData.username || initialSavedUsername);
                } catch (dbErr) {
                  console.error("[App] Ошибка сохранения сессии в IndexedDB при старте:", dbErr);
                }
                if (meData.username) {
                  localStorage.setItem("username", meData.username);
                }
                console.log(`[App] Профиль загружен при старте: userId=${meData.userId}`);
              }
            } else if (meRes.status === 401) {
              console.warn("[App] Сессия недействительна (401), выполняем выход...");
              showToast("Сессия истекла, войдите снова", "info");
              await handleLogout();
              return;
            }
          } catch (meErr) {
            console.warn("[App] Не удалось загрузить профиль при старте:", meErr);
          }
        }

        if (!isSubscribed) return;

        const activeUsername = localStorage.getItem("username") || currentUserId || "default";
        const cleanSavedUsername = activeUsername.toLowerCase().trim();

        const dbExists = await storageManager.databaseExists(cleanSavedUsername);
        if (!dbExists && localStorage.getItem(`db_master_key_enc_${cleanSavedUsername}`)) {
          console.warn(`[App] База данных gossip_${cleanSavedUsername}.db не найдена в IndexedDB, но в localStorage есть ключи шифрования. Сбрасываем ключи для пересоздания.`);
          localStorage.removeItem(`db_master_key_enc_${cleanSavedUsername}`);
          localStorage.removeItem(`db_master_key_iv_${cleanSavedUsername}`);
          localStorage.removeItem(`db_local_pin_enc_${cleanSavedUsername}`);
          localStorage.removeItem(`db_local_pin_iv_${cleanSavedUsername}`);
        }

        if (storageManager.getIsInitialized()) {
          // Хранилище уже открыто, повторный ввод PIN не требуется
          console.log('[App] Хранилище уже открыто, повторный ввод PIN-кода пропущен.');
        } else if (isTestEnv()) {
          let localPin = sessionStorage.getItem(`db_local_pin_${cleanSavedUsername}`);
          if (!localPin) {
            localPin = window.crypto.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2);
            sessionStorage.setItem(`db_local_pin_${cleanSavedUsername}`, localPin);
          }
          await storageManager.open(cleanSavedUsername, localPin);
          try {
            await downloadAndRestoreVault(localPin, cleanSavedUsername);
          } catch (vaultErr) {
            console.warn("[Test] Не удалось восстановить сейф в тестовом режиме (2):", vaultErr);
          }
        } else {
          // Пытаемся автоматически разблокировать базу данных, если включен вход без PIN-кода
          const autoOpened = await storageManager.tryAutoOpen(cleanSavedUsername);
          if (!autoOpened) {
            const dbExists = await storageManager.databaseExists(cleanSavedUsername);
            const hasMasterKey = !!localStorage.getItem(`db_master_key_enc_${cleanSavedUsername}`);
            if (dbExists && hasMasterKey) {
              await requestPin(cleanSavedUsername, 'unlock');
            } else {
              await requestPin(cleanSavedUsername, 'create');
            }
          }
        }
        
        if (!isSubscribed) return;

        if (isDecoyModeActive()) {
          const decoys = buildDecoyChats();
          setChats(decoys);
          if (decoys.length > 0 && !selectedChatIdRef.current) {
            setSelectedChatId(decoys[0].id);
          }
          setIsDbLoaded(true);
          return;
        }

        // Отправляем фоновый сигнал активности для таймера «Периметр» (Dead Man's Switch)
        sendActivityHeartbeat();

        // 2. Инициализируем SyncManager
        await syncManager.initialize();
        if (!isSubscribed) return;
        // SM-7: запуск миграции-лечения при старте приложения перед загрузкой чатов
        await healFailClosedPlaceholderRows().catch(() => {});

        // 3. Загружаем чаты из локальной БД
        const myId = localStorage.getItem("current_user_id") || "";
        const cachedChats = await storageManager.query<any>(`
          SELECT id, name, avatar, lastMessage, time, unread, isGroup, online, pts, is_152fz_contour 
          FROM chats
          WHERE id != ?;
        `, [myId]);
        
        // Загружаем папки чатов из локальной БД
        const cachedFolders = await storageManager.query<any>(`
          SELECT id, name, icon, is_152fz_contour FROM chat_folders;
        `);
        const cachedMembers = await storageManager.query<any>(`
          SELECT folderId, chatId FROM chat_folder_members;
        `);
        const membersMap: Record<string, string[]> = {};
        cachedMembers.forEach((m: any) => {
          if (!membersMap[m.folderId]) {
            membersMap[m.folderId] = [];
          }
          membersMap[m.folderId].push(m.chatId);
        });

        if (isSubscribed) {
          setFolders(cachedFolders);
          setFolderMembers(membersMap);
        }
        if (!isSubscribed) return;

        let initialChats: Chat[] = [];
        if (cachedChats.length > 0) {
          console.log(`[App] Загружено ${cachedChats.length} чатов из БД.`);
          try {
            await storageManager.execute(
              `DELETE FROM messages WHERE (text IS NULL OR TRIM(text) = '' OR text = '[service_session_reset]') AND (mediaUrl IS NULL OR TRIM(mediaUrl) = '') AND (invoice_id IS NULL OR TRIM(invoice_id) = '') AND (transfer_receipt IS NULL OR TRIM(transfer_receipt) = '');`
            );
          } catch (_) {}
          initialChats = await Promise.all(cachedChats.map(async (chat: any) => {
            const rawMessages = await storageManager.query<any>(`
              SELECT * FROM (
                SELECT id, sender, senderName, text, time, pts, timestamp, type, mediaUrl, peaks, mediaKey, mediaIv, reply_markup, invoice_id, transfer_receipt, raw_encrypted, status 
                FROM messages 
                WHERE chatId = ? 
                ORDER BY timestamp DESC 
                LIMIT 50
              ) ORDER BY timestamp ASC;
            `, [chat.id]);

            const rawDecryptedMessages = await Promise.all(rawMessages.map(async (m: any) => {
              let msgText = m.text;
              let msgType = m.type || 'text';
              let msgMediaUrl = m.mediaUrl || null;
              let msgMediaKey = m.mediaKey || null;
              let msgMediaIv = m.mediaIv || null;
              let msgPeaks = m.peaks || null;
              let msgReplyMarkup = m.reply_markup || m.replyMarkup;
              if (typeof msgReplyMarkup === 'string') {
                try {
                  msgReplyMarkup = JSON.parse(msgReplyMarkup);
                } catch (e) {}
              }

              // SM-3: ретраим только действительно нерасшифрованные строки (или .enc медиа без ключей),
              // чтобы не прогонять повторно уже расшифрованные сообщения Double Ratchet (Forward Secrecy).
              const isTextAlreadyDecrypted =
                Boolean(msgText) &&
                !msgText.startsWith("🔒") &&
                !msgText.startsWith("[Ошибка") &&
                !msgText.startsWith("[Ключ") &&
                !isE2EEMessage(msgText) &&
                msgText !== "[encrypted_pending]";
              const isEncMediaMissingKeys =
                Boolean(msgMediaUrl && msgMediaUrl.includes(".enc") && (!msgMediaKey || !msgMediaIv));
              const rawToDecrypt =
                (!isTextAlreadyDecrypted || isEncMediaMissingKeys)
                  ? ((m.raw_encrypted && isE2EEMessage(m.raw_encrypted))
                      ? m.raw_encrypted
                      : (m.text && isE2EEMessage(m.text) ? m.text : null))
                  : null;
              if (rawToDecrypt) {
                try {
                  const decMsg = await decryptMessageIfNeeded(chat.id, { ...m, text: rawToDecrypt }, true);
                  if (decMsg && decMsg.text && decMsg.text !== rawToDecrypt && !decMsg.text.startsWith("🔒") && !decMsg.text.startsWith("[Ошибка") && !decMsg.text.startsWith("[Ключ") && !isE2EEMessage(decMsg.text)) {
                    const nextType = decMsg.type || msgType || 'text';
                    const nextMediaUrl = decMsg.mediaUrl || msgMediaUrl || null;
                    const nextMediaKey = decMsg.mediaKey || msgMediaKey || null;
                    const nextMediaIv = decMsg.mediaIv || msgMediaIv || null;
                    const nextPeaks = decMsg.peaks ? (typeof decMsg.peaks === 'string' ? decMsg.peaks : JSON.stringify(decMsg.peaks)) : msgPeaks;
                    await storageManager.execute(
                      "UPDATE messages SET text = ?, type = ?, mediaUrl = ?, mediaKey = ?, mediaIv = ?, peaks = ? WHERE id = ?;",
                      [
                        decMsg.text, 
                        nextType, 
                        nextMediaUrl, 
                        nextMediaKey, 
                        nextMediaIv, 
                        nextPeaks,
                        m.id
                      ]
                    );
                    msgText = decMsg.text;
                    msgType = nextType;
                    msgMediaUrl = nextMediaUrl;
                    msgMediaKey = nextMediaKey;
                    msgMediaIv = nextMediaIv;
                    msgPeaks = nextPeaks;
                  } else if (!isTextAlreadyDecrypted && decMsg && decMsg.text && decMsg.text.startsWith("🔒")) {
                    msgText = decMsg.text;
                  }
                } catch (err) {
                  console.error(`[App] Не удалось расшифровать сообщение ${m.id} на лету:`, err);
                }
              }

              const isMeshDirectChat = String(chat.id || '').startsWith('mesh-') && !chat.isGroup;
              const normalizedSender = isMeshDirectChat
                ? (m.sender === 'me' || m.senderName === 'Я' ? 'me' : 'other')
                : (m.sender === 'me' || (myId && m.sender === myId && (m.senderName === 'Я' || !String(m.id || '').startsWith('mesh-'))) ? 'me' : m.sender);

              return {
                id: m.id,
                sender: normalizedSender,
                senderName: m.senderName,
                text: msgText,
                time: m.time,
                pts: m.pts,
                timestamp: m.timestamp,
                status: (m.status || 'sent') as any,
                isUnencryptedIncoming: m.isUnencryptedIncoming || (typeof msgText === 'string' && msgText.includes('не зашифровано')),
                type: msgType as 'text' | 'sticker' | 'voice' | 'video_note' | 'photo' | 'video',
                mediaUrl: msgMediaUrl || undefined,
                mediaKey: msgMediaKey || undefined,
                mediaIv: msgMediaIv || undefined,
                peaks: msgPeaks ? JSON.parse(msgPeaks) : undefined,
                replyMarkup: msgReplyMarkup || undefined,
                reply_markup: msgReplyMarkup || undefined,
                invoiceId: m.invoice_id || m.invoiceId || undefined,
                invoice_id: m.invoice_id || m.invoiceId || undefined,
                transferReceipt: m.transfer_receipt || m.transferReceipt || undefined,
                transfer_receipt: m.transfer_receipt || m.transferReceipt || undefined,
              };
            }));
            const decryptedMessages = rawDecryptedMessages.filter((m: any) =>
              m && m.text !== '[service_session_reset]' && (
                (typeof m.text === 'string' && m.text.trim().length > 0) ||
                Boolean(m.mediaUrl) ||
                Boolean(m.invoiceId) ||
                Boolean(m.transferReceipt) ||
                m.type === 'voice' ||
                m.type === 'video_note' ||
                m.type === 'sticker'
              )
            );

            let lastMessage = chat.lastMessage;
            if (decryptedMessages.length > 0) {
              const lastMsg = decryptedMessages[decryptedMessages.length - 1];
              lastMessage = lastMsg.text;
              if (lastMessage !== chat.lastMessage) {
                await storageManager.execute("UPDATE chats SET lastMessage = ? WHERE id = ?;", [lastMessage, chat.id]);
              }
            } else if (lastMessage && isE2EEMessage(lastMessage)) {
              try {
                const decMsg = await decryptMessageIfNeeded(chat.id, { text: lastMessage, id: 'temp' } as any, true);
                if (decMsg && decMsg.text && decMsg.text !== lastMessage && !decMsg.text.startsWith("🔒") && !isE2EEMessage(decMsg.text)) {
                  lastMessage = decMsg.text;
                  await storageManager.execute("UPDATE chats SET lastMessage = ? WHERE id = ?;", [lastMessage, chat.id]);
                }
              } catch (err) {
                console.error(`[App] Не удалось расшифровать зашифрованный lastMessage для чата ${chat.id}:`, err);
              }
            }

            let chatName = chat.name;
            const isGroupChat = chat.isGroup === 1 || chat.isGroup === true;
            if (!isGroupChat && isPlaceholderChatName(chatName)) {
              let healedFromMsgs = false;
              if (decryptedMessages.length > 0) {
                for (let i = decryptedMessages.length - 1; i >= 0; i--) {
                  const m = decryptedMessages[i];
                  if (m.sender !== 'me' && m.senderName && !isPlaceholderChatName(m.senderName)) {
                    chatName = m.senderName;
                    healedFromMsgs = true;
                    storageManager.execute(
                      "UPDATE chats SET name = ? WHERE id = ?;",
                      [chatName, chat.id]
                    ).catch(() => {});
                    break;
                  }
                }
              }
              if (!healedFromMsgs) {
                const cachedLocal = typeof localStorage !== 'undefined' ? (localStorage.getItem(`${chat.id}_name`) || localStorage.getItem(`username_${chat.id}`)) : null;
                if (cachedLocal && !isPlaceholderChatName(cachedLocal)) {
                  chatName = cachedLocal;
                  storageManager.execute(
                    "UPDATE chats SET name = ? WHERE id = ?;",
                    [chatName, chat.id]
                  ).catch(() => {});
                } else {
                  resolveSenderName(chat.id);
                }
              }
            }

            const isBotChatInitial = Boolean(
              chat.type === 'bot' ||
              chat.isBot ||
              /bot$/i.test(String(chatName || '').trim()) ||
              (typeof localStorage !== 'undefined' && localStorage.getItem('bot_chat_' + chat.id) === '1')
            );
            if (isBotChatInitial && typeof localStorage !== 'undefined') {
              try { localStorage.setItem('bot_chat_' + chat.id, '1'); } catch {}
            }

            return {
              id: chat.id,
              name: chatName,
              avatar: chat.avatar || (isBotChatInitial ? '🤖' : '👤'),
              lastMessage: lastMessage,
              time: chat.time,
              unread: chat.unread,
              isGroup: isGroupChat,
              isBot: isBotChatInitial,
              type: isBotChatInitial ? 'bot' : chat.type,
              online: isBotChatInitial ? true : (chat.online === 1 || chat.online === true),
              is152FzContour: chat.is_152fz_contour === 1,
              messages: decryptedMessages
            };
          }));
          
          if (isSubscribed) {
            setChats(initialChats);
            if (initialChats.length > 0 && !selectedChatIdRef.current) {
              setSelectedChatId(initialChats[0].id);
            }
            initialChats.forEach(chat => {
              if (isSubscribed) {
                syncManager.syncDifference(chat.id);
              }
            });
          }
        }

        // 4. Запускаем фоновую синхронизацию чатов из облака
        const syncCloudChats = async () => {
          try {
            const token = localStorage.getItem("session_token") || "";
            if (!token) return;
            const response = await fetch(getBackendUrl("/api/v1/chats"), {
              headers: {
                "Authorization": `Bearer ${token}`
              }
            });
            if (response.ok) {
              const cloudChats = await response.json();
              if (!isSubscribed) return;
              
              const newChatsToSync: string[] = [];
              const chatsToInsertOrUpdate: { chat: any; isNew: boolean }[] = [];
              
              // Получаем текущие чаты из рефа, чтобы избежать рассинхронизации стейта
              const currentChats = chatsRef.current || [];
              
              for (const chat of cloudChats) {
                if (chat.id === myId) continue;
                const isCloudBot = Boolean(chat.isBot || chat.is_bot || chat.type === 'bot' || /bot$/i.test(String(chat.username || chat.name || '').trim()));
                if (isCloudBot && typeof localStorage !== 'undefined') {
                  try { localStorage.setItem('bot_chat_' + chat.id, '1'); } catch {}
                }
                const existingIdx = currentChats.findIndex(c => c.id === chat.id);
                const isGroupNum = chat.isGroup ? 1 : 0;
                const onlineNum = (chat.online || isCloudBot) ? 1 : 0;
                const cloudLastMsg = (chat.lastMessage === '[service_session_reset]') ? '' : (chat.lastMessage || '');
                const cloudReadPts = Number(chat.readInboxPts || (chat.unread === 0 && chat.pts ? chat.pts : 0));
                if (cloudReadPts > 0 && typeof localStorage !== 'undefined') {
                  const localReadPts = parseInt(localStorage.getItem(`last_read_pts_${chat.id}`) || '0', 10);
                  if (cloudReadPts > localReadPts) {
                    localStorage.setItem(`last_read_pts_${chat.id}`, String(cloudReadPts));
                  }
                }
                const effectiveCloudUnread = (chat.id === selectedChatIdRef.current) ? 0 : (typeof chat.unread === 'number' ? chat.unread : 0);
                if (effectiveCloudUnread === 0) {
                  NotificationSyncService.clearChatNotifications(chat.id).catch(() => {});
                }
                
                if (existingIdx === -1) {
                  // Нового чата нет локально
                  let chatName = chat.name || "Чат";
                  if (!chat.isGroup && isPlaceholderChatName(chatName)) {
                    const cachedLocal = typeof localStorage !== 'undefined' ? (localStorage.getItem(`${chat.id}_name`) || localStorage.getItem(`username_${chat.id}`)) : null;
                    if (cachedLocal && !isPlaceholderChatName(cachedLocal)) {
                      chatName = cachedLocal;
                    } else {
                      resolveSenderName(chat.id);
                    }
                  }
                  console.log(`[App Sync] Добавление нового чата из облака: ${chat.id}`);
                  await storageManager.execute(`
                    INSERT INTO chats (id, name, avatar, lastMessage, time, unread, isGroup, online, pts)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
                  `, [
                    chat.id, 
                    chatName, 
                    chat.avatar || "👤", 
                    cloudLastMsg, 
                    chat.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
                    effectiveCloudUnread, 
                    isGroupNum, 
                    onlineNum, 
                    chat.pts || 0
                  ]);
                  
                  newChatsToSync.push(chat.id);
                  chatsToInsertOrUpdate.push({ chat: { ...chat, name: chatName, lastMessage: cloudLastMsg, unread: effectiveCloudUnread }, isNew: true });
                } else {
                  // Чат уже есть локально, обновляем метаданные, если они изменились
                  const localChat = currentChats[existingIdx];
                  let effectiveName = localChat.name;
                  if (!chat.isGroup) {
                    if (!isPlaceholderChatName(chat.name)) {
                      effectiveName = chat.name;
                    } else if (isPlaceholderChatName(localChat.name)) {
                      const cachedLocal = typeof localStorage !== 'undefined' ? (localStorage.getItem(`${chat.id}_name`) || localStorage.getItem(`username_${chat.id}`)) : null;
                      if (cachedLocal && !isPlaceholderChatName(cachedLocal)) {
                        effectiveName = cachedLocal;
                      } else {
                        resolveSenderName(chat.id);
                      }
                    }
                  } else {
                    effectiveName = chat.name || localChat.name;
                  }

                  const isOnlineChanged = localChat.online !== (chat.online === 1 || chat.online === true);
                  const isUnreadChanged = typeof chat.unread === 'number' && localChat.unread !== effectiveCloudUnread;
                  const nextLastMessage = (cloudLastMsg && !isE2EEMessage(cloudLastMsg)) ? cloudLastMsg : (localChat.lastMessage || cloudLastMsg);
                  if (
                    localChat.name !== effectiveName || 
                    localChat.avatar !== chat.avatar ||
                    localChat.lastMessage !== nextLastMessage ||
                    localChat.time !== chat.time ||
                    isOnlineChanged ||
                    isUnreadChanged
                  ) {
                    await storageManager.execute(`
                      UPDATE chats 
                      SET name = ?, avatar = ?, lastMessage = ?, time = ?, unread = ?, pts = ?, online = ?
                      WHERE id = ?;
                    `, [
                      effectiveName,
                      chat.avatar || localChat.avatar,
                      nextLastMessage,
                      chat.time || localChat.time,
                      effectiveCloudUnread,
                      chat.pts || 0,
                      onlineNum,
                      chat.id
                    ]);
                    
                    chatsToInsertOrUpdate.push({ chat: { ...chat, name: effectiveName, lastMessage: nextLastMessage, unread: effectiveCloudUnread }, isNew: false });
                  }
                }
                
                if (chat.readOutboxId) {
                  try {
                    const msgRow = await storageManager.query<{ timestamp: number, pts: number }>(
                      "SELECT timestamp, pts FROM messages WHERE id = ? LIMIT 1;",
                      [chat.readOutboxId]
                    );
                    if (msgRow.length > 0) {
                      const { timestamp, pts } = msgRow[0];
                      await storageManager.execute(
                        `UPDATE messages 
                         SET status = 'read' 
                         WHERE chatId = ? 
                           AND sender = 'me' 
                           AND (pts <= ? OR timestamp <= ?) 
                           AND status != 'read';`,
                        [chat.id, pts || 0, timestamp]
                      );
                      
                      setChats(prevChats => prevChats.map(c => {
                        if (c.id !== chat.id) return c;
                        return {
                          ...c,
                          messages: c.messages.map(m => {
                            if (m.sender === 'me' && m.status !== 'read') {
                              const isBefore = (pts > 0 && m.pts !== undefined && m.pts > 0 && m.pts <= pts) ||
                                               (timestamp > 0 && m.timestamp !== undefined && m.timestamp > 0 && m.timestamp <= timestamp) ||
                                               (m.id === chat.readOutboxId);
                              if (isBefore) return { ...m, status: 'read' as const };
                            }
                            return m;
                          })
                        };
                      }));
                    }
                  } catch (dbErr) {
                    console.error("[App Sync] Ошибка обновления статуса read из облака:", dbErr);
                  }
                }
              }
              
              if (!isSubscribed) return;
              
              // Обновляем состояние React один раз для всех чатов
              if (chatsToInsertOrUpdate.length > 0) {
                setChats(prevChats => {
                  let updatedChats = [...prevChats];
                  for (const { chat, isNew } of chatsToInsertOrUpdate) {
                    const existingIdx = updatedChats.findIndex(c => c.id === chat.id);
                    const isBotEntry = Boolean(
                      chat.isBot ||
                      chat.is_bot ||
                      chat.type === 'bot' ||
                      /bot$/i.test(String(chat.username || chat.name || '').trim()) ||
                      (typeof localStorage !== 'undefined' && localStorage.getItem('bot_chat_' + chat.id) === '1')
                    );
                    if (isNew && existingIdx === -1) {
                      updatedChats.push({
                        id: chat.id,
                        name: chat.name || "Чат",
                        username: chat.username,
                        avatar: chat.avatar || (isBotEntry ? "🤖" : "👤"),
                        lastMessage: chat.lastMessage || "",
                        time: chat.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        unread: chat.unread || 0,
                        isGroup: chat.isGroup || false,
                        isBot: isBotEntry,
                        type: isBotEntry ? 'bot' : chat.type,
                        online: isBotEntry ? true : (chat.online || false),
                        messages: []
                      });
                    } else if (!isNew && existingIdx !== -1) {
                      updatedChats[existingIdx] = {
                        ...updatedChats[existingIdx],
                        name: chat.name || updatedChats[existingIdx].name,
                        username: chat.username || updatedChats[existingIdx].username,
                        avatar: chat.avatar || updatedChats[existingIdx].avatar,
                        lastMessage: chat.lastMessage || updatedChats[existingIdx].lastMessage,
                        time: chat.time || updatedChats[existingIdx].time,
                        unread: typeof chat.unread === 'number' ? chat.unread : updatedChats[existingIdx].unread,
                        isBot: isBotEntry || updatedChats[existingIdx].isBot,
                        type: (isBotEntry || updatedChats[existingIdx].isBot) ? 'bot' : (chat.type || updatedChats[existingIdx].type),
                        online: isBotEntry ? true : (chat.online === 1 || chat.online === true)
                      };
                    }
                  }
                  
                  if (prevChats.length === 0 && updatedChats.length > 0 && !selectedChatIdRef.current) {
                    setSelectedChatId(updatedChats[0].id);
                  }
                  
                  return updatedChats;
                });
              }
              
              // Запускаем синхронизацию сообщений только ПОСЛЕ того, как все новые чаты вставлены в БД
              for (const chatId of newChatsToSync) {
                if (isSubscribed) {
                  syncManager.syncDifference(chatId);
                }
              }
            }
          } catch (cloudErr) {
            console.error("[App Sync] Исключение при фоновой синхронизации чатов:", cloudErr);
          }
        };

        // Запуск фоновой синхронизации облачных чатов
        syncCloudChats();

        // Каждые 45 секунд опрашиваем облако для обновления статусов присутствия (online) и метаданных
        cloudSyncInterval = setInterval(() => {
          if (isSubscribed) {
            syncCloudChats();
          }
        }, 45000);

        // UX-4: Публикация/обновление пре-ключей на сервере для E2EE с индикацией статуса
        publishPrekeysWithStatus();

        handleSyncChats = () => {
          if (isSubscribed) {
            syncCloudChats();
          }
        };
        syncManager.on("sync_chats", handleSyncChats);

        if (!isSubscribed) return;
        setIsDbLoaded(true);

      } catch (err) {
        console.error("[App] Ошибка инициализации БД:", err);
      }
    };

    const handleNewMessage = (update: any) => {
      if (!isSubscribed) return;
      console.log("[UI App] Получено обновление сообщения:", update);
      let msg = update.message || update;
      let chatId = update.chatId || (update.message && update.message.chatId) || (update.message && update.message.channel_id) || update.channel_id;
      
      const myId = localStorage.getItem("current_user_id") || currentUserId;
      if (chatId && myId && (String(chatId) === String(myId) || chatId === 'me')) {
        if (msg.sender_id && String(msg.sender_id) !== String(myId)) {
          chatId = String(msg.sender_id);
        } else if (msg.sender && msg.sender !== 'me' && msg.sender !== 'other' && String(msg.sender) !== String(myId)) {
          chatId = String(msg.sender);
        }
      }

      if (!chatId) {
        console.warn("[UI App] Получено обновление сообщения без chatId, игнорируем:", update);
        return;
      }

      const hasValidContent =
        (typeof msg.text === 'string' && msg.text.trim().length > 0) ||
        Boolean(msg.mediaUrl) ||
        Boolean(msg.poll) ||
        Boolean(msg.invoiceId || msg.invoice_id) ||
        Boolean(msg.transferReceipt || msg.transfer_receipt) ||
        msg.type === 'voice' ||
        msg.type === 'video_note' ||
        msg.type === 'sticker' ||
        msg.type === 'location' ||
        msg.type === 'contact' ||
        msg.type === 'document';

      if (!msg || msg.text === "[service_session_reset]" || msg.isService || !hasValidContent) {
        console.log("[UI App] Пропущено служебное или пустое обновление сообщения:", update);
        return;
      }

      const myUsername = localStorage.getItem("username");
      const isMe = msg.sender === 'me' || msg.senderName === 'Я' || 
                   (myId && String(msg.sender) === String(myId)) || 
                   (currentUserId && String(msg.sender) === String(currentUserId)) ||
                   (myUsername && msg.sender && msg.sender.toString().toLowerCase() === myUsername.toLowerCase());

      const incomingReplyMarkup = msg.replyMarkup || msg.reply_markup || undefined;
      const incomingIsBot = Boolean(msg.isBot || msg.is_bot || incomingReplyMarkup || /bot$/i.test(String(msg.senderName || '').trim()));
      if (incomingIsBot && typeof localStorage !== 'undefined' && !msg.isGroup) {
        try { localStorage.setItem('bot_chat_' + chatId, '1'); } catch {}
      }

      const newMsg: Message = {
        id: msg.id,
        sender: isMe ? 'me' : 'other',
        senderName: isMe ? 'Я' : formatUserDisplayName(msg.sender, msg.senderName, null),
        text: msg.text,
        time: new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pts: msg.pts,
        timestamp: msg.timestamp || Date.now(),
        type: msg.type || 'text',
        mediaUrl: msg.mediaUrl,
        mediaKey: msg.mediaKey,
        mediaIv: msg.mediaIv,
        peaks: safeParsePeaks(msg.peaks),
        replyMarkup: incomingReplyMarkup,
        reply_markup: incomingReplyMarkup,
        replyToMessageId: msg.replyToMessageId || msg.reply_to_message_id,
        status: msg.status || (msg.id.toString().startsWith('temp-') ? 'pending' : 'sent'),
        isService: msg.isService || msg.text === "[service_session_reset]"
      };

      const lastReadPts = parseInt(localStorage.getItem(`last_read_pts_${chatId}`) || '0', 10);
      const isAlreadyRead = Boolean(newMsg.pts && lastReadPts > 0 && newMsg.pts <= lastReadPts);
      const isHistoryUpdate = Boolean(update.isHistory) || Boolean(update.is_history);
      const isDecryptFailedMsg = Boolean(msg.isE2EEDecryptFailed) || (typeof newMsg.text === 'string' && newMsg.text.startsWith("🔒"));
      const shouldIncrementUnread =
        chatId !== selectedChatIdRef.current &&
        newMsg.sender !== 'me' &&
        !isAlreadyRead &&
        !isHistoryUpdate &&
        !newMsg.isService &&
        !isDecryptFailedMsg;

      let lastMsgText = newMsg.text;
      if (newMsg.type === 'sticker') lastMsgText = '🎨 Стикер';
      else if (newMsg.type === 'voice') lastMsgText = '🎤 Голосовое сообщение';
      else if (newMsg.type === 'video_note') lastMsgText = '🎬 Видео-кружок';

      setChats(prevChats => {
        const existingIdx = prevChats.findIndex(c => c.id === chatId);
        // v2.2.1 Инвариант изоляции каналов: 1:1-кадр (chatId === sender) НИКОГДА
        // не рендерится/не сохраняется в чате с групповой разметкой. Лечит
        // инцидент «сообщения Данечки в общей группе»: локальная строка чата,
        // ошибочно помеченная группой по uuid собеседника, авто-чинится.
        const isOneToOneFramed = String(chatId) === String(msg.sender_id ?? msg.sender ?? '');
        if (existingIdx !== -1 && isOneToOneFramed && prevChats[existingIdx].isGroup) {
          console.warn('[Isolation] 1:1-сообщение попало в чат с групповой разметкой — авто-починка:', chatId);
          storageManager.execute('UPDATE chats SET isGroup = 0 WHERE id = ?;', [chatId]).catch(() => undefined);
          prevChats = prevChats.map((c, i) => i === existingIdx ? { ...c, isGroup: false } : c);
        }
        if (existingIdx === -1) {
          // Чата еще нет в списке — создаем оптимистично
          const isGroupChat = Boolean(
            msg.isGroup || 
            (msg.sender_id && String(chatId) !== String(msg.sender_id) && String(msg.sender_id) !== String(myId)) ||
            (msg.sender && String(chatId) !== String(msg.sender) && String(msg.sender) !== 'me' && String(msg.sender) !== 'other' && String(msg.sender) !== String(myId))
          );
          const initialUnread = shouldIncrementUnread ? 1 : 0;
          const newChat: Chat = {
            id: chatId,
            name: isGroupChat ? (msg.chatName || msg.channel_name || 'Групповой чат') : formatUserDisplayName(msg.sender || chatId, msg.senderName, null),
            avatar: isGroupChat ? '👥' : '👤',
            lastMessage: lastMsgText,
            time: newMsg.time,
            unread: initialUnread,
            isGroup: isGroupChat,
            online: true,
            messages: [newMsg]
          };

          storageManager.execute(
            `INSERT INTO chats (id, name, avatar, lastMessage, time, unread, isGroup, online, pts) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
             ON CONFLICT(id) DO UPDATE SET 
               name = CASE 
                 WHEN (chats.name IS NULL OR chats.name IN ('', 'Собеседник', 'Собеседник (Mesh)', 'Чат', 'other', 'others', 'undefined', 'null', 'Пользователь') OR chats.name LIKE '%-%-%-%-%' OR chats.name LIKE 'Пользователь #%')
                      AND (excluded.name NOT IN ('', 'Собеседник', 'Собеседник (Mesh)', 'Чат', 'other', 'others', 'undefined', 'null', 'Пользователь') AND excluded.name NOT LIKE '%-%-%-%-%' AND excluded.name NOT LIKE 'Пользователь #%')
                 THEN excluded.name 
                 ELSE chats.name 
               END,
               lastMessage = excluded.lastMessage, 
               time = excluded.time;`,
            [chatId, newChat.name, newChat.avatar, lastMsgText, newMsg.time, initialUnread, isGroupChat ? 1 : 0, newMsg.pts || 0]
          ).catch(dbErr => console.error('[App] Ошибка сохранения нового чата в БД:', dbErr));

          return [newChat, ...prevChats];
        }

        // Чат уже существует — обновляем сообщения
        const targetChat = prevChats[existingIdx];

        // Поиск существующего (например, при досылке mediaKey/mediaIv из Outbox) или временного сообщения для замены/обновления
        const matchIndex = targetChat.messages.findIndex(m => 
          (String(m.id) === String(newMsg.id)) ||
          ((m.id.toString().startsWith('temp-') || m.id.toString().startsWith('mesh-')) && 
           ((m.type || 'text') === (newMsg.type || 'text') || (isMe && m.sender === 'me')) &&
           (newMsg.type === 'text' && !isMe ? m.text === newMsg.text : true)) ||
          (m.text === newMsg.text && (m.type || 'text') === (newMsg.type || 'text') && 
           newMsg.timestamp && m.timestamp && Math.abs(m.timestamp - newMsg.timestamp) < 120000)
        );

        let updatedMessages: Message[];
        if (matchIndex !== -1) {
          const existingMsg = targetChat.messages[matchIndex];
          const keepExistingText =
            existingMsg.text &&
            !existingMsg.text.startsWith('🔒') &&
            (!newMsg.text || newMsg.text.startsWith('🔒'));
          const nextType =
            (existingMsg.type && existingMsg.type !== 'text' && (!newMsg.type || newMsg.type === 'text'))
              ? existingMsg.type
              : (newMsg.type || existingMsg.type || 'text');
          updatedMessages = [...targetChat.messages];
          updatedMessages[matchIndex] = {
            ...existingMsg,
            id: newMsg.id,
            pts: newMsg.pts || existingMsg.pts,
            text: keepExistingText ? existingMsg.text : (newMsg.text || existingMsg.text),
            type: nextType,
            time: newMsg.time || existingMsg.time,
            timestamp: newMsg.timestamp || existingMsg.timestamp,
            mediaUrl: newMsg.mediaUrl || existingMsg.mediaUrl,
            mediaKey: newMsg.mediaKey || existingMsg.mediaKey,
            mediaIv: newMsg.mediaIv || existingMsg.mediaIv,
            peaks: newMsg.peaks || existingMsg.peaks,
            replyMarkup: newMsg.replyMarkup || existingMsg.replyMarkup,
            reply_markup: newMsg.reply_markup || existingMsg.reply_markup,
            replyToMessageId: newMsg.replyToMessageId || existingMsg.replyToMessageId,
            status: existingMsg.status === 'read' ? 'read' : (newMsg.id.toString().startsWith('temp-') ? 'pending' : 'sent')
          };
          // Гарантированная дедупликация по id (если параллельно зарезолвился send_message)
          const seenIds = new Set<string>();
          updatedMessages = updatedMessages.filter(m => {
            const key = String(m.id);
            if (seenIds.has(key)) return false;
            seenIds.add(key);
            return true;
          });
        } else {
          updatedMessages = [...targetChat.messages, newMsg];
        }

        let healedName = targetChat.name;
        if (!targetChat.isGroup && isPlaceholderChatName(targetChat.name)) {
          const incomingName = formatUserDisplayName(msg.sender || chatId, msg.senderName, null);
          if (!isPlaceholderChatName(incomingName)) {
            healedName = incomingName;
            storageManager.execute(
              "UPDATE chats SET name = ? WHERE id = ?;",
              [healedName, chatId]
            ).catch(err => console.warn("[App] Failed to self-heal chat name in DB:", err));
          } else {
            resolveSenderName(chatId);
          }
        }

        const nextUnread = chatId === selectedChatIdRef.current
          ? 0
          : (shouldIncrementUnread ? targetChat.unread + 1 : targetChat.unread);

        const updatedChat: Chat = {
          ...targetChat,
          name: healedName,
          lastMessage: lastMsgText,
          time: newMsg.time,
          unread: nextUnread,
          messages: updatedMessages
        };

        const newChats = [...prevChats];
        newChats[existingIdx] = updatedChat;
        return newChats;
      });

      // Отправляем уведомления (In-App всплывающий баннер, если приложение активно, или системное пуш-уведомление)
      const isAndroid = typeof window !== 'undefined' && (window as any).Capacitor !== undefined && (window as any).Capacitor.getPlatform() === 'android';
      const isServiceMsg = newMsg.isService || 
                           newMsg.text === "[service_session_reset]" || 
                           isDecryptFailedMsg ||
                           (newMsg.text && (newMsg.text.startsWith("System message:") || newMsg.text.startsWith("Системное сообщение:")));

      const now = Date.now();
      const msgTimestamp = Number(newMsg.timestamp) || now;
      const isFreshRealtime = (now - msgTimestamp) < 45000; // строго реальное время (< 45 сек)
      const isHistoryOrSync = Boolean(update.isHistory) || Boolean(update.is_history) || !isFreshRealtime;

      if (newMsg.sender === 'other' && !isHistoryOrSync && !isServiceMsg) {
        const isAppHidden = (typeof document !== 'undefined' && document.visibilityState === 'hidden') || !isAppActiveRef.current;
        const isDifferentChat = String(chatId) !== String(selectedChatIdRef.current);
        const isNewMessage = update.isNew !== false;

        if (isNewMessage && !isAlreadyRead && isDifferentChat) {
          const targetChat = chatsRef.current.find(c => c.id === chatId);

          // Интеллектуальное разрешение имени отправителя (Sender Name Resolution)
          const senderIdStr = String(newMsg.sender || '');
          const resolvedSenderName = formatUserDisplayName(senderIdStr, newMsg.senderName, targetChat?.isGroup ? null : targetChat?.name);

          if (senderIdStr && senderIdStr !== 'me' && senderIdStr !== 'other' && senderIdStr !== 'others') {
            resolveSenderName(senderIdStr);
          }

          // 1. Если приложение открыто, но пользователь в другом чате/настройках -> Показываем элегантный In-App баннер (только если нет активного или входящего звонка)
          if (!isAppHidden && isDifferentChat && !isCallOpenRef.current && !incomingCallIdRef.current) {
            setInAppNotification({
              id: String(Date.now()),
              chatId,
              senderName: resolvedSenderName,
              avatarUrl: targetChat?.avatar,
              text: lastMsgText || 'Новое сообщение',
              time: newMsg.time || 'сейчас',
              isGroup: targetChat?.isGroup || false
            });

            // Тактильный отклик (Haptic Feedback) на мобильных устройствах
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              try {
                navigator.vibrate([15, 30, 15]);
              } catch (e) {}
            }
          }

          // 2. Если приложение свернуто в фон -> Системные push/local notifications с именем отправителя
          if (isAppHidden) {
            const notificationTitle = targetChat?.isGroup && targetChat?.name 
              ? `${resolvedSenderName} (${targetChat.name})`
              : (resolvedSenderName !== 'Собеседник' ? resolvedSenderName : (targetChat?.name || 'Gossip'));

            if (isAndroid) {
              LocalNotifications.schedule({
                notifications: [
                  {
                    title: notificationTitle,
                    body: lastMsgText || 'Новое сообщение',
                    id: Math.floor(Math.random() * 100000),
                    channelId: 'gossip_messages',
                    extra: { chatId }
                  }
                ]
              }).catch(err => console.error('[BgService] Ошибка отправки локального уведомления:', err));
            } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(notificationTitle, {
                body: lastMsgText || 'Новое сообщение',
                icon: '/logo.png',
                tag: `chat-${chatId}`
              });
            }
          }
        }
      }
    };

    const handleColdStart = (data: any) => {
      if (!isSubscribed) return;
      console.log(`[UI App] Событие Cold Start для чата ${data.chatId}! Перегружаем историю...`);
      const chatId = data.chatId;
      syncManager.loadHistoryLazy(chatId, Math.max(0, data.pts - 20)).then((res) => {
        if (!isSubscribed) return;
        if (res && res.messages) {
          setChats(prevChats => prevChats.map(c => {
            if (c.id === chatId) {
              const existingIds = new Set(c.messages.map(m => m.id));
              const historicalMessages = res.messages
                .map((m: any) => ({
                  id: m.id,
                  sender: (m.sender === 'me' || m.sender === currentUserId) ? 'me' : m.sender,
                  senderName: m.senderName || 'Собеседник',
                  text: m.text,
                  time: new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  pts: m.pts,
                  type: m.type || 'text',
                  mediaUrl: m.mediaUrl || undefined,
                  mediaKey: m.mediaKey || undefined,
                  mediaIv: m.mediaIv || undefined,
                  peaks: m.peaks ? (typeof m.peaks === 'string' ? JSON.parse(m.peaks) : m.peaks) : undefined
                }))
                .filter((m: any) => !existingIds.has(m.id))
                .reverse();
              return {
                ...c,
                unread: 0,
                messages: [...historicalMessages, ...c.messages]
              };
            }
            return c;
          }));
        }
      });
    };

    // Typing indicator: обновляем список печатающих, только если событие
    // относится к текущему открытому чату (иначе шапка не покажет).
    const handleTypingStateChanged = (changedChatId: string) => {
      if (!isSubscribed) return;
      if (changedChatId === selectedChatIdRef.current) {
        setTypingUserIds(syncManager.getTypingUsers(changedChatId));
      }
    };

    const handleReadOutbox = (data: any) => {
      if (!isSubscribed) return;
      console.log("[UI App] Сообщение Outbox прочитано:", data);
      
      const chatId = data.chatId || data.chat_id;
      const maxMessageId = data.maxMessageId || data.max_message_id;
      const pts = data.pts;
      
      if (!chatId || !maxMessageId) return;
      
      setChats(prevChats => prevChats.map(chat => {
        if (chat.id !== chatId) return chat;
        
        const boundaryMsg = chat.messages.find(m => m.id === maxMessageId);
        const boundaryPts = boundaryMsg?.pts || pts || 0;
        const boundaryTimestamp = boundaryMsg?.timestamp || 0;
        
        const updatedMessages = chat.messages.map(m => {
          if (m.sender === 'me' && m.status !== 'read') {
            const isBefore = (boundaryPts > 0 && m.pts !== undefined && m.pts > 0 && m.pts <= boundaryPts) ||
                             (boundaryTimestamp > 0 && m.timestamp !== undefined && m.timestamp > 0 && m.timestamp <= boundaryTimestamp) ||
                             (m.id === maxMessageId);
            if (isBefore) {
              return { ...m, status: 'read' as const };
            }
          }
          return m;
        });
        
        return {
          ...chat,
          messages: updatedMessages
        };
      }));
    };

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (!isSubscribed) return;
      if (event.data) {
        if (event.data.type === 'SILENT_PUSH_WAKEUP') {
          console.log("[UI App] Получен сигнал SILENT_PUSH_WAKEUP от Service Worker. Запуск синхронизации...");
          chatsRef.current.forEach(chat => {
            if (isSubscribed) {
              syncManager.syncDifference(chat.id);
            }
          });
        } else if (event.data.type === 'OTPK_DEPLETED_WAKEUP') {
          console.log("[UI App] Получен сигнал OTPK_DEPLETED_WAKEUP от Service Worker. Пополнение преключей...");
          ensureAndPublishPrekeys().catch(err => {
            console.error("[UI App] Ошибка пополнения преключей:", err);
          });
        }
      }
    };

    const handleMessageDeleted = (data: any) => {
      if (!isSubscribed) return;
      const messageId = data.message_id || data.messageId;
      console.log("[UI App] Получено удаление сообщения:", messageId);
      if (messageId) {
        setChats(prevChats => prevChats.map(chat => ({
          ...chat,
          messages: chat.messages.filter(m => m.id !== messageId)
        })));
      }
    };

    const handleMessageEdited = (data: any) => {
      if (!isSubscribed) return;
      const messageId = data.message_id || data.messageId || data.message?.id;
      const text = data.content ?? data.text ?? data.message?.text;
      const updatedMsgObj = data.message;
      console.log("[UI App] Получено редактирование/дорасшифровка сообщения:", messageId, text);
      if (messageId && text !== undefined) {
        setChats(prevChats => prevChats.map(chat => ({
          ...chat,
          messages: chat.messages.map(m => {
            if (m.id !== messageId) return m;
            return {
              ...m,
              text,
              type: (updatedMsgObj?.type && updatedMsgObj.type !== 'text') ? updatedMsgObj.type : (m.type || 'text'),
              mediaUrl: updatedMsgObj?.mediaUrl || m.mediaUrl,
              mediaKey: updatedMsgObj?.mediaKey || m.mediaKey,
              mediaIv: updatedMsgObj?.mediaIv || m.mediaIv,
              peaks: updatedMsgObj?.peaks
                ? (typeof updatedMsgObj.peaks === 'string' ? JSON.parse(updatedMsgObj.peaks) : updatedMsgObj.peaks)
                : m.peaks
            };
          })
        })));
      }
    };

    const handleIncomingCall = (data: any) => {
      if (!isSubscribed) return;
      console.log("[UI App] Получен входящий звонок:", data);
      const callId = data.callId || data.call_id;
      const callerName = data.callerName || data.caller_name || "Собеседник";
      const chatId = data.chatId || data.chat_id;
      const mediaType = (data.media || data.mediaType || data.media_type || "video") as 'audio' | 'video';
      const callerAvatar = data.callerAvatar || data.caller_avatar || data.avatar || chats.find(c => c.id === chatId || c.name === callerName)?.avatar || '';

      if (!callId) {
        console.warn("[UI App] Входящий звонок без callId, пропускаем");
        return;
      }

      // Защита от гонок и повторных событий: если звонок уже в процессе или завершен
      const currentState = callActionStateRef.current.get(callId);
      if (currentState === 'declined' || currentState === 'declining' || currentState === 'accepted') {
        console.log(`[UI App] Входящий звонок ${callId} уже обработан (${currentState}), пропускаем`);
        return;
      }

      // Если этот звонок уже открыт/активен в оверлее, пропускаем повторный показ плашки входящего вызова
      if (activeCallIdRef.current === callId || isCallOpenRef.current) {
        console.log("[UI App] Звонок уже открыт в оверлее, пропускаем плашку входящего вызова");
        return;
      }

      clearIncomingCallTimeout();

      setIncomingCallId(callId);
      setIncomingCallName(callerName);
      setIncomingCallAvatar(callerAvatar);
      setIncomingCallChatId(chatId);
      setIncomingCallMediaType(mediaType);
      setIsIncomingCallOpen(true);
      try {
        voipAudio.startRingtone();
      } catch (e) {}

      // Унифицированный авто-таймаут дозвона 45 секунд (остановка рингтона и авто-отклонение)
      incomingCallTimeoutRef.current = setTimeout(() => {
        console.warn(`[UI App] Таймаут входящего звонка ${callId} (45с). Авто-отклонение (missed) и остановка рингтона.`);
        handleDeclineCall(callId, 'missed');
      }, CALL_RING_TIMEOUT_MS);

      if (Capacitor.isNativePlatform()) {
        // Показываем нативное системное уведомление только если приложение свернуто в фон/экран заблокирован.
        // Если пользователь уже в приложении на переднем плане, системную плашку не дублируем
        if (!isAppActiveRef.current) {
          VoIPNotificationPlugin.showIncomingCall({
            callId,
            chatId,
            callerName,
            callerAvatar,
            mediaType
          }).catch(err => {
            console.warn("[UI App] Ошибка показа нативного уведомления вызова:", err);
          });
        }
      }
    };

    const handleCallDeclined = (data: any) => {
      if (!isSubscribed) return;
      console.log("[UI App] Звонок отклонен или завершен. Данные:", JSON.stringify(data), "activeCallIdRef.current:", activeCallIdRef.current, "incomingCallIdRef.current:", incomingCallIdRef.current);
      clearIncomingCallTimeout();
      try {
        voipAudio.stopRingback();
        voipAudio.stopRingtone();
      } catch (e) {}

      const declinedCallId = data.callId || data.call_id;
      // Защита от сброса активного звонка при пустом callId
      if (!declinedCallId) {
        console.warn("[UI App] handleCallDeclined без callId пропущен");
        return;
      }

      if (activeCallIdRef.current === declinedCallId || incomingCallIdRef.current === declinedCallId) {
        callActionStateRef.current.set(declinedCallId, 'declined');
        setIsCallOpen(false);
        setIsIncomingCallOpen(false);
        setActiveCallId('');
        setIncomingCallId('');
        setIncomingCallAvatar('');
        setActiveCallChatId('');
        setIncomingCallChatId('');
        showToast("Звонок завершен", "info");

        if (Capacitor.isNativePlatform() && declinedCallId) {
          VoIPNotificationPlugin.cancelIncomingCall({ callId: declinedCallId }).catch(() => {});
        }
      }
    };

    const handleCallAccepted = (data: any) => {
      if (!isSubscribed) return;
      console.log("[UI App] Звонок принят собеседником:", data);
      clearIncomingCallTimeout();
      try {
        voipAudio.stopRingback();
        voipAudio.stopRingtone();
      } catch (e) {}
      const acceptedCallId = data.callId || data.call_id;
      if (acceptedCallId) {
        callActionStateRef.current.set(acceptedCallId, 'accepted');
      }
      if (activeCallIdRef.current === acceptedCallId) {
        showToast("Собеседник принял вызов", "success");
      }
      if (Capacitor.isNativePlatform() && acceptedCallId) {
        VoIPNotificationPlugin.cancelIncomingCall({ callId: acceptedCallId }).catch(() => {});
      }
    };

    const handleMessageSent = (data: any) => {
      if (!isSubscribed) return;
      console.log("[UI App] Сообщение из Outbox успешно отправлено:", data);
      setChats(prevChats => prevChats.map(chat => {
        if (chat.id === data.chatId) {
          const hasServerMsg = chat.messages.some(m => m.id === data.messageId);
          if (hasServerMsg) {
            const tempMsg = chat.messages.find(m => m.id === data.tempId);
            const updatedMessages = chat.messages
              .filter(m => m.id !== data.tempId)
              .map(m => {
                if (m.id === data.messageId && tempMsg) {
                  return {
                    ...m,
                    text: tempMsg.text,
                    type: tempMsg.type,
                    mediaUrl: data.mediaUrl || tempMsg.mediaUrl || m.mediaUrl,
                    mediaKey: data.mediaKey || tempMsg.mediaKey || m.mediaKey,
                    mediaIv: data.mediaIv || tempMsg.mediaIv || m.mediaIv,
                    peaks: tempMsg.peaks || m.peaks,
                    status: 'sent' as const
                  };
                } else if (m.id === data.messageId) {
                  return {
                    ...m,
                    mediaUrl: data.mediaUrl || m.mediaUrl,
                    mediaKey: data.mediaKey || m.mediaKey,
                    mediaIv: data.mediaIv || m.mediaIv,
                    status: 'sent' as const
                  };
                }
                return m;
              });
            return {
              ...chat,
              messages: updatedMessages
            };
          } else {
            return {
              ...chat,
              messages: chat.messages.map(m => m.id === data.tempId ? {
                ...m,
                id: data.messageId,
                pts: data.pts,
                mediaUrl: data.mediaUrl || m.mediaUrl,
                mediaKey: data.mediaKey || m.mediaKey,
                mediaIv: data.mediaIv || m.mediaIv,
                status: 'sent'
              } : m)
            };
          }
        }
        return chat;
      }));
    };

    const handlePollVotesUpdated = (data: any) => {
      if (!data) return;
      setChats(prevChats => prevChats.map(chat => {
        if (!data.chatId || chat.id === data.chatId) {
          return {
            ...chat,
            messages: chat.messages.map(m => {
              const targetPollId = data.pollId || data.messageId;
              if (m.poll && (m.poll.pollId === targetPollId || m.id === targetPollId)) {
                return {
                  ...m,
                  poll: {
                    ...m.poll,
                    tally: data.tally || m.poll.tally,
                    totalVoters: data.totalVoters !== undefined ? data.totalVoters : m.poll.totalVoters
                  }
                };
              }
              return m;
            })
          };
        }
        return chat;
      }));
    };

    const handleMessageSendFailed = (data: any) => {
      if (!isSubscribed) return;
      console.warn("[UI App] Сообщение из Outbox переведено в статус failed:", data);
      const targetId = data.tempId || data.id;
      if (targetId) {
        storageManager.execute(
          "UPDATE messages SET status = 'failed' WHERE id = ?;",
          [targetId]
        ).catch(e => console.warn("[UI App] Ошибка обновления статуса failed в messages:", e));
      }
      setChats(prevChats => prevChats.map(chat => {
        if (!data.chatId || chat.id === data.chatId) {
          return {
            ...chat,
            messages: chat.messages.map(m =>
              (m.id === data.tempId || m.id === data.id)
                ? { ...m, status: 'failed' as const, isE2EESendFailed: false }
                : m
            )
          };
        }
        return chat;
      }));
    };

    const handleReadInbox = (data: any) => {
      if (!isSubscribed || !data) return;
      const targetChatId = String(data.chatId || data.chat_id || '');
      const readPts = Number(data.pts || 0);
      if (!targetChatId) return;

      if (readPts > 0 && typeof localStorage !== 'undefined') {
        const prevPts = parseInt(localStorage.getItem(`last_read_pts_${targetChatId}`) || '0', 10);
        if (readPts > prevPts) {
          localStorage.setItem(`last_read_pts_${targetChatId}`, String(readPts));
        }
      }

      NotificationSyncService.clearChatNotifications(targetChatId).catch(() => {});
      setInAppNotification((prev: any) => (prev && String(prev.chatId) === targetChatId ? null : prev));

      setChats(prevChats => prevChats.map(chat =>
        chat.id === targetChatId ? { ...chat, unread: 0 } : chat
      ));
    };

    initAndSubscribe();

    syncManager.on("message", handleNewMessage);
    syncManager.on("cold_start", handleColdStart);
    syncManager.on("read_outbox", handleReadOutbox);
    syncManager.on("read_inbox", handleReadInbox);
    syncManager.on("message_deleted", handleMessageDeleted);
    syncManager.on("message_edited", handleMessageEdited);
    syncManager.on("message_sent", handleMessageSent);
    syncManager.on("message_send_failed", handleMessageSendFailed);
    syncManager.on("typing_state_changed", handleTypingStateChanged);
    syncManager.on("poll_votes_updated", handlePollVotesUpdated);

    tdlib.onUpdate("incoming_call", handleIncomingCall);
    tdlib.onUpdate("call_declined", handleCallDeclined);
    tdlib.onUpdate("call_accepted", handleCallAccepted);

    let answerSub: any = null;
    let endSub: any = null;

    if (Capacitor.isNativePlatform()) {
      VoIPNotificationPlugin.addListener('answerCall', (callData: any) => {
        console.log('[UI App] Нажата кнопка Принять в системном уведомлении/экране:', callData);
        const resolvedCallId = callData.callId || callData.call_id;
        const resolvedChatId = callData.chatId || callData.chat_id;
        const resolvedCallerName = callData.callerName || callData.caller_name || "Собеседник";
        const resolvedAvatar = callData.callerAvatar || callData.caller_avatar || chats.find(c => c.id === resolvedChatId || c.name === resolvedCallerName)?.avatar || '';
        const resolvedMediaType = (callData.mediaType || callData.media_type || 'video') as 'audio' | 'video';

        if (!resolvedCallId) return;
        setIncomingCallAvatar(resolvedAvatar);
        handleAcceptCall(resolvedCallId, resolvedCallerName, resolvedChatId, resolvedMediaType);
      }).then(sub => { answerSub = sub; }).catch(() => {});

      VoIPNotificationPlugin.addListener('endCall', (callData: any) => {
        console.log('[UI App] Нажата кнопка Отклонить в системном уведомлении/экране:', callData);
        const resolvedCallId = callData.callId || callData.call_id;
        if (!resolvedCallId) return;

        // Если звонок уже открыт и активен в оверлее, не прерываем его ложным endCall
        if (isCallOpenRef.current && activeCallIdRef.current === resolvedCallId) {
          console.log('[UI App] Игнорируем endCall для уже открытого активного разговора');
          return;
        }

        handleDeclineCall(resolvedCallId, 'declined');
      }).then(sub => { endSub = sub; }).catch(() => {});

      // Сверка отложенного звонка (Pending Call Reconciliation) при старте/разблокировке
      reconcilePendingCall();
    }

    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    }

    return () => {
      clearIncomingCallTimeout();
      try {
        voipAudio.stopRingback();
        voipAudio.stopRingtone();
      } catch (e) {}
      isSubscribed = false;
      if (cloudSyncInterval) {
        clearInterval(cloudSyncInterval);
      }
      syncManager.off("message", handleNewMessage);
      syncManager.off("cold_start", handleColdStart);
      syncManager.off("read_outbox", handleReadOutbox);
      syncManager.off("read_inbox", handleReadInbox);
      syncManager.off("message_deleted", handleMessageDeleted);
      syncManager.off("message_edited", handleMessageEdited);
      syncManager.off("message_sent", handleMessageSent);
      syncManager.off("message_send_failed", handleMessageSendFailed);
      syncManager.off("typing_state_changed", handleTypingStateChanged);
      syncManager.off("poll_votes_updated", handlePollVotesUpdated);
      if (handleSyncChats) {
        syncManager.off("sync_chats", handleSyncChats);
      }

      tdlib.offUpdate("incoming_call", handleIncomingCall);
      tdlib.offUpdate("call_declined", handleCallDeclined);
      tdlib.offUpdate("call_accepted", handleCallAccepted);

      if (answerSub && typeof answerSub.remove === 'function') answerSub.remove();
      if (endSub && typeof endSub.remove === 'function') endSub.remove();

      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
      }
    };
  }, [isAuthenticated, handleAcceptCall, handleDeclineCall, reconcilePendingCall, clearIncomingCallTimeout]);

  // Надежный переход в чат при клике на Push / LocalNotification / Intent
  const handleOpenChatFromPush = useCallback(async (
    targetChatId?: string | null,
    senderId?: string | null,
    senderName?: string | null,
    messageText?: string | null
  ) => {
    if (!targetChatId && !senderId) return;

    const myId = currentUserId || localStorage.getItem('current_user_id') || localStorage.getItem('my_user_id') || '';
    
    // Если targetChatId совпадает с нашим собственным ID или 'me', реальным собеседником является senderId
    let effectiveChatId = targetChatId || '';
    if ((!effectiveChatId || effectiveChatId === myId || effectiveChatId === 'me') && senderId && senderId !== myId) {
      effectiveChatId = senderId;
    }

    if (!effectiveChatId) return;

    console.log(`[Push Navigation] Мгновенный переход в чат ${effectiveChatId} (senderId: ${senderId}, senderName: ${senderName})`);

    // 1. Мгновенно переключаем стейт выбора чата и мобильный экран на чат
    setSelectedChatId(effectiveChatId);
    setMobileView('chat');
    NotificationSyncService.clearChatNotifications(effectiveChatId);

    // 2. Если чата еще нет в списке chats, создаем его карточку оптимистично
    const chatExists = chatsRef.current.some(c => c.id === effectiveChatId);
    if (!chatExists) {
      const initialChatName = formatUserDisplayName(effectiveChatId, senderName, null);
      const cleanPreview = formatLastMessagePreview(messageText || 'Новое сообщение');
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const newOptimisticChat: Chat = {
        id: effectiveChatId,
        name: initialChatName,
        avatar: '👤',
        lastMessage: cleanPreview,
        time: nowTime,
        unread: 0,
        isGroup: false,
        online: true,
        messages: messageText ? [{
          id: `push-${Date.now()}`,
          sender: 'other',
          senderName: initialChatName,
          text: cleanPreview,
          time: nowTime,
          type: 'text',
          status: 'sent'
        }] : []
      };

      setChats(prev => {
        if (prev.some(c => c.id === effectiveChatId)) return prev;
        return [newOptimisticChat, ...prev];
      });

      storageManager.execute(
        `INSERT INTO chats (id, name, avatar, lastMessage, time, unread, isGroup, online, pts)
         VALUES (?, ?, '👤', ?, ?, 0, 0, 1, 0)
         ON CONFLICT(id) DO UPDATE SET lastMessage = excluded.lastMessage, time = excluded.time;`,
        [effectiveChatId, initialChatName, cleanPreview, nowTime]
      ).catch(e => console.warn('[Push Navigation] Ошибка вставки чата в SQLite:', e));
    }

    // 3. Форсируем синхронизацию сообщений и переподключение сокета
    try {
      tdlib.forceReconnect();
      await syncManager.syncDifference(effectiveChatId);
    } catch (syncErr) {
      console.warn('[Push Navigation] Ошибка принудительной синхронизации чата:', syncErr);
    }
  }, [currentUserId]);

  // Эффект для инициализации нативных Push-уведомлений на iOS и Android (Capacitor APNs / FCM)
  useEffect(() => {
    if (!isAuthenticated) return;

    const initPushNotifications = async () => {
      const isNative = typeof window !== 'undefined' && (window as any).Capacitor !== undefined && (window as any).Capacitor.isNativePlatform();
      if (!isNative) return;

      const platform = (window as any).Capacitor.getPlatform(); // 'android' | 'ios'

      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.warn('[Push] Разрешение на получение пуш-уведомлений отклонено.');
          return;
        }

        // Регистрируем устройство в APNs (iOS) / FCM (Android)
        await PushNotifications.register();

        // Слушаем получение токена
        await PushNotifications.addListener('registration', async (token) => {
          console.log(`[Push ${platform.toUpperCase()}] Успешная регистрация, токен:`, token.value);
          const sessionToken = localStorage.getItem("session_token") || "";
          if (sessionToken) {
            try {
              const res = await fetch(getBackendUrl("/api/v1/devices/register-push"), {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${sessionToken}`
                },
                body: JSON.stringify({
                  token: token.value,
                  type: platform === 'ios' ? 'apns' : 'android'
                })
              });
              if (res.ok) {
                console.log('[Push] Токен успешно отправлен на сервер.');
              } else {
                console.error('[Push] Не удалось отправить токен на сервер, статус:', res.status);
              }
            } catch (err) {
              console.error('[Push] Ошибка при отправке токена:', err);
            }
          }
        });

        // Слушаем ошибки регистрации
        await PushNotifications.addListener('registrationError', (error) => {
          console.error('[Push] Ошибка регистрации пушей:', error);
        });

        // Слушаем входящие уведомления в foreground
        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('[Push] Получено уведомление в активном режиме:', notification);
        });

        // Слушаем клик по нативному Push-уведомлению (Capacitor FCM / APNs)
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('[Push] Клик по системному push-уведомлению:', action);
          const data = action.notification.data || {};
          const chatId = data.chatId || data.chat_id;
          const senderId = data.senderId || data.sender_id;
          const senderName = data.senderName || data.title || action.notification.title;
          const text = data.text || data.body || action.notification.body;
          handleOpenChatFromPush(chatId, senderId, senderName, text);
        });

      } catch (err) {
        console.error('[Push] Ошибка инициализации нативных push-уведомлений:', err);
      }
    };

    initPushNotifications();
  }, [isAuthenticated, handleOpenChatFromPush]);

  // Эффект для инициализации фонового соединения и локальных уведомлений на iOS и Android
  useEffect(() => {
    if (!isAuthenticated) return;

    const initBackgroundAndNotifications = async () => {
      const isNative = typeof window !== 'undefined' && (window as any).Capacitor !== undefined && (window as any).Capacitor.isNativePlatform();
      if (!isNative) return;
      const platform = (window as any).Capacitor.getPlatform();

      try {
        console.log('[BgService] Запрос разрешений для локальных уведомлений...');
        let permStatus = await LocalNotifications.checkPermissions();
        if (permStatus.display === 'prompt') {
          permStatus = await LocalNotifications.requestPermissions();
        }
        console.log('[BgService] Разрешение на локальные уведомления:', permStatus.display);

        // Регистрация системного канала уведомлений с высоким приоритетом (Android)
        if (platform === 'android') {
          try {
            await LocalNotifications.createChannel({
              id: 'gossip_messages',
              name: 'Сообщения Gossip',
              description: 'Уведомления о входящих личных и групповых сообщениях',
              importance: 5, // IMPORTANCE_HIGH
              visibility: 1, // VISIBILITY_PUBLIC
              vibration: true,
              lights: true,
              lightColor: '#10B981',
            });
            console.log('[BgService] NotificationChannel gossip_messages успешно зарегистрирован.');
          } catch (chanErr) {
            console.warn('[BgService] Ошибка регистрации NotificationChannel:', chanErr);
          }

          // Настраиваем учетные данные в GossipBackgroundPlugin для автономного фонового демона
          try {
            const uid = currentUserId || localStorage.getItem('current_user_id') || localStorage.getItem('my_user_id') || '';
            const sessToken = localStorage.getItem('session_token') || '';
            const bUrl = getBackendUrl('');
            if (uid) {
              await GossipBackgroundPlugin.configure({
                userId: uid,
                sessionToken: sessToken,
                backendUrl: bUrl
              });
              console.log('[BgService] GossipBackgroundPlugin успешно сконфигурирован для user:', uid);
            }
            // Проверяем, было ли приложение запущено из системного уведомления
            const initial = await GossipBackgroundPlugin.getInitialChatId();
            if (initial && (initial.chatId || initial.senderId)) {
              console.log('[BgService] Приложение запущено по клику на уведомление:', initial);
              handleOpenChatFromPush(initial.chatId, initial.senderId, initial.senderName, initial.messageText);
            }
          } catch (cfgErr) {
            console.warn('[BgService] Ошибка настройки GossipBackgroundPlugin:', cfgErr);
          }
        }

        // Фоновый сервис GossipBackgroundService запускается по умолчанию на Android для удержания сети при сворачивании
        const savedBg = localStorage.getItem('gossip_bg_service');
        const isBgEnabled = savedBg !== null ? savedBg === 'true' : true;
        if (isBgEnabled) {
          console.log('[BgService] Запуск фонового сервиса GossipBackgroundService по умолчанию на Android...');
          try {
            await GossipBackgroundPlugin.startService();
            console.log('[BgService] Фоновый сервис успешно запущен.');
          } catch (e) {
            console.warn('[BgService] Предупреждение при старте службы:', e);
          }
        } else {
          // Если служба была отключена пользователем в настройках, останавливаем ее
          try {
            await GossipBackgroundPlugin.stopService();
          } catch (e) {}
        }

        // Слушатель клика на локальные уведомления
        await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
          console.log('[BgService] Клик по локальному уведомлению:', action);
          const extra = action.notification.extra || {};
          const chatId = extra.chatId || extra.chat_id;
          const senderId = extra.senderId || extra.sender_id;
          const senderName = extra.senderName || action.notification.title;
          const text = extra.text || action.notification.body;
          handleOpenChatFromPush(chatId, senderId, senderName, text);
        });
      } catch (err) {
        console.error('[BgService] Ошибка при инициализации фонового режима:', err);
      }
    };

    initBackgroundAndNotifications();
  }, [isAuthenticated, currentUserId, handleOpenChatFromPush]);

  // Функция деривации 16-hex (8-byte) Short ID для BLE Mesh адресации
  const deriveMeshShortHex = async (nodeId: string): Promise<string> => {
    if (!nodeId) return '';
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(nodeId);
      let hashBytes: Uint8Array;
      if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
        const buf = await crypto.subtle.digest('SHA-256', data);
        hashBytes = new Uint8Array(buf);
      } else {
        hashBytes = data;
      }
      let hex = '';
      const len = Math.min(8, hashBytes.length);
      for (let i = 0; i < len; i++) {
        hex += hashBytes[i].toString(16).padStart(2, '0');
      }
      return hex.toLowerCase();
    } catch (e) {
      return '';
    }
  };

  // Глобальный слушатель прямых входящих P2P конвертов BLE Mesh
  useEffect(() => {
    const handleMeshEnvelope = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const envelope = customEvent.detail;
      if (!envelope || !envelope.encryptedPayload) return;

      try {
        const payload = JSON.parse(envelope.encryptedPayload);
        if (!payload || (!payload.text && !payload.type)) return;

        const currentUserId = localStorage.getItem('current_user_id') || localStorage.getItem('my_user_id') || '';
        const currentUsername = localStorage.getItem('username') || localStorage.getItem('nickname') || '';
        const meshSnapshot = offlineMeshManager.getSnapshot();
        const localNodeId = meshSnapshot.localNodeId || '';

        // Вычисляем производный 8-байтовый (16 hex) Short ID для сопоставления с рекламным пакетом BLE
        const ownMeshShortId = localNodeId ? await deriveMeshShortHex(localNodeId) : '';
        const rawShortId = (localNodeId && localNodeId.startsWith('mesh-')) ? await deriveMeshShortHex(localNodeId.slice(5)) : '';

        // 1. Формируем исчерпывающий набор локальных идентификаторов узла (myMatchingSet)
        const myMatchingSet = new Set([
          currentUserId,
          currentUsername,
          localNodeId,
          ownMeshShortId,
          ownMeshShortId ? `mesh-${ownMeshShortId}` : '',
          rawShortId,
          rawShortId ? `mesh-${rawShortId}` : '',
          localNodeId.startsWith('mesh-') ? localNodeId.slice(5) : (localNodeId ? `mesh-${localNodeId}` : ''),
          localStorage.getItem('nickname') || '',
          localStorage.getItem('username') || '',
          localStorage.getItem('gossip_local_mesh_id') || '',
          localStorage.getItem('node_id') || '',
          localStorage.getItem('device_id') || ''
        ].filter(Boolean).map(s => String(s).trim().toLowerCase()));

        // 2. Игнорируем собственное эхо — ТОЛЬКО сообщения этого физического устройства.
        // Dual Identity (v1.7.10): senderDeviceId идентифицирует установку; аккаунт-фильтр
        // (sender == my_user_id) отбрасывал сообщения второго устройства того же аккаунта.
        // Старые клиенты без senderDeviceId — прежний аккаунт-фоллбэк.
        const senderStr = String(payload.sender || '').trim().toLowerCase();
        const senderNodeIdStr = String(payload.senderNodeId || '').trim().toLowerCase();
        const senderDeviceIdStr = String(payload.senderDeviceId || '').trim().toLowerCase();
        const ownDeviceId = String(meshSnapshot.localDeviceId || localStorage.getItem('device_id') || localStorage.getItem('gossip_mesh_device_id') || '').trim().toLowerCase();
        if (senderDeviceIdStr) {
          if (ownDeviceId && senderDeviceIdStr === ownDeviceId) {
            return;
          }
        } else if ((senderStr && myMatchingSet.has(senderStr)) || (senderNodeIdStr && myMatchingSet.has(senderNodeIdStr))) {
          return;
        }

        // Вычисляем BLE Radar Short ID отправителя (mesh-<16hex>) для склейки чата с Радаром
        const senderDeviceShortHex = senderDeviceIdStr ? await deriveMeshShortHex(senderDeviceIdStr.replace(/^mesh-/, '')) : '';
        const senderDeviceShortId = senderDeviceShortHex ? `mesh-${senderDeviceShortHex}`.toLowerCase() : '';
        const rawSenderNodeSource = (senderNodeIdStr || senderStr).replace(/^mesh-/, '');
        const senderNodeShortHex = rawSenderNodeSource ? await deriveMeshShortHex(rawSenderNodeSource) : '';
        const senderNodeShortId = senderNodeShortHex ? `mesh-${senderNodeShortHex}`.toLowerCase() : '';
        const isSenderSelfAccount = Boolean(senderStr && myMatchingSet.has(senderStr));

        // 3. Проверяем, адресован ли пакет текущему узлу (личное сообщение или группа)
        const isGroup = Boolean(payload.isGroup);
        const recipientCandidate = String(envelope.recipientTag || payload.recipientId || payload.chatId || '').trim().toLowerCase();
        const targetChatIdField = String(payload.chatId || '').trim().toLowerCase();
        const targetNodeIdField = String(payload.targetNodeId || payload.recipientNodeId || '').trim().toLowerCase();
        const cleanPeerAddr = String(envelope.senderAddress || envelope.peerAddress || payload.senderAddress || '').trim().toLowerCase();

        // 1-to-1 Direct P2P: прямое сопоставление получателя
        const isDirectRecipient = Boolean(
          (recipientCandidate && myMatchingSet.has(recipientCandidate)) ||
          (targetChatIdField && myMatchingSet.has(targetChatIdField)) ||
          (targetNodeIdField && myMatchingSet.has(targetNodeIdField)) ||
          (!isGroup && recipientCandidate.startsWith('peer-'))
        );

        const matchesPeerChatId = (rawChatId: string): boolean => {
          const cId = String(rawChatId || '').trim().toLowerCase();
          if (!cId) return false;
          if (isGroup) {
            return Boolean(targetChatIdField && cId === targetChatIdField);
          }
          return Boolean(
            (senderDeviceShortId && cId === senderDeviceShortId) ||
            (senderNodeShortId && (!isSenderSelfAccount || senderNodeShortId === senderDeviceShortId) && cId === senderNodeShortId) ||
            (!isSenderSelfAccount && senderStr && cId === senderStr) ||
            (senderNodeIdStr && !myMatchingSet.has(senderNodeIdStr) && cId === senderNodeIdStr) ||
            (recipientCandidate && !myMatchingSet.has(recipientCandidate) && cId === recipientCandidate) ||
            (targetChatIdField && !myMatchingSet.has(targetChatIdField) && cId === targetChatIdField) ||
            (cleanPeerAddr && (cId === cleanPeerAddr || cId === `peer-${cleanPeerAddr}`))
          );
        };

        // Проверяем наличие сопоставимого локального чата (1-to-1 или группы)
        const existingLocalChat = (chatsRef.current || []).find(c =>
          isGroup
            ? (c.isGroup && targetChatIdField && String(c.id).trim().toLowerCase() === targetChatIdField)
            : (!c.isGroup && matchesPeerChatId(String(c.id)))
        );
        const hasLocalMatchingChat = Boolean(existingLocalChat);

        const isForThisNode = isDirectRecipient || hasLocalMatchingChat;

        if (!isForThisNode) {
          // Узел является промежуточным ретранслятором (Relay Node) — пакет уже пересылается далее в радиоэфир через BLE, но НЕ выводится в локальный UI
          console.log(`[OfflineMesh] Пакет ${envelope.id} транзитный (адресован ${recipientCandidate || targetChatIdField}). Локальный узел (${currentUserId || localNodeId}) выступает ретранслятором.`);
          return;
        }

        console.log("[UI App] Получен прямой P2P конверт по BLE Mesh без интернета для данного узла:", payload);

        // Интеллектуальное сопоставление целевого чата для 1-to-1 и групповых чатов:
        const targetChatId = isGroup 
          ? String(payload.chatId || envelope.recipientTag || 'mesh-group') 
          : existingLocalChat
            ? String(existingLocalChat.id)
            : isSenderSelfAccount
              ? String(
                  senderDeviceShortId ||
                  (senderNodeIdStr && !myMatchingSet.has(senderNodeIdStr) ? payload.senderNodeId : '') ||
                  (cleanPeerAddr ? `peer-${cleanPeerAddr}` : 'mesh-direct')
                )
              : String(
                  payload.sender ||
                  payload.senderNodeId ||
                  senderDeviceShortId ||
                  senderNodeShortId ||
                  envelope.recipientTag ||
                  payload.chatId ||
                  (cleanPeerAddr ? `peer-${cleanPeerAddr}` : 'mesh-direct')
                );
        const targetChatName = payload.senderName || existingLocalChat?.name || (isGroup ? 'Mesh Группа' : 'Собеседник (Mesh)');

        const rawEncryptedPayload = typeof payload.text === 'string' && isE2EEMessage(payload.text) ? payload.text : null;
        // Пакет уже прошел эхо-фильтр (senderDeviceId !== ownDeviceId), поэтому это гарантированно входящее сообщение от другого устройства.
        // При Dual Identity (оба телефона под одним аккаунтом) нельзя передавать currentUserId в sender при дешифровке, иначе decryptMessageIfNeeded посчитает isMe = true.
        const decryptSenderId = isSenderSelfAccount
          ? String(senderDeviceShortId || senderDeviceIdStr || 'other')
          : String(payload.sender || payload.senderNodeId || senderDeviceShortId || 'other');
        const persistedSenderId = isGroup ? decryptSenderId : 'other';

        const buildCandidateMsg = (): Message => ({
          id: payload.id || `mesh-${Date.now()}`,
          sender: decryptSenderId,
          senderName: targetChatName,
          text: payload.text || '',
          time: payload.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: payload.timestamp || Date.now(),
          type: payload.type || 'text',
          replyToMessageId: payload.replyToMessageId,
          status: 'sent'
        });

        let incomingMsg: Message = buildCandidateMsg();

        const isDecryptionFailure = (msg: any): boolean => {
          if (!msg) return true;
          if (msg.isE2EEDecryptFailed) return true;
          if (typeof msg.text === 'string' && (msg.text.startsWith('🔒') || isE2EEMessage(msg.text))) {
            return true;
          }
          return false;
        };

        // 🔐 ДЕШИФРОВАНИЕ ВХОДЯЩЕГО СООБЩЕНИЯ (E2EE Double Ratchet или MLS)
        try {
          incomingMsg = await decryptMessageIfNeeded(targetChatId, incomingMsg);
        } catch (decryptErr) {
          console.warn("[UI App] Первичная попытка дешифрования Mesh-конверта завершилась исключением:", decryptErr);
        }

        if (rawEncryptedPayload && isDecryptionFailure(incomingMsg)) {
          const altIds = [
            payload.sender, 
            payload.senderNodeId, 
            senderDeviceShortId,
            senderNodeShortId,
            envelope.recipientTag, 
            payload.chatId,
            cleanPeerAddr ? `peer-${cleanPeerAddr}` : null,
            cleanPeerAddr
          ].filter(Boolean);
          for (const altId of altIds) {
            if (altId && String(altId) !== targetChatId) {
              try {
                const retryCandidate = buildCandidateMsg();
                const retried = await decryptMessageIfNeeded(String(altId), retryCandidate);
                if (!isDecryptionFailure(retried)) {
                  incomingMsg = retried;
                  break;
                }
              } catch (ignored) {}
            }
          }
        }

        // Гарантируем, что входящее P2P-сообщение никогда не помечается как 'me' (всегда выравнивается слева в окне чата)
        incomingMsg = {
          ...incomingMsg,
          sender: persistedSenderId,
          senderName: targetChatName
        };

        // 🔍 Проверка наличия сообщения в локальной SQLite БД до записи
        let alreadyExistsInDb = false;
        try {
          if (storageManager && storageManager.getIsInitialized()) {
            const existing = await storageManager.query<{ id: string }>(
              'SELECT id FROM messages WHERE id = ? LIMIT 1;',
              [incomingMsg.id]
            );
            if (existing && existing.length > 0) {
              alreadyExistsInDb = true;
            }
          }
        } catch (dbCheckErr) {
          // ignore
        }

        // 💾 АТОМАРНАЯ ВСТАВКА В SQLite (таблицы chats и messages для сохранения истории при холодном старте)
        try {
          const isSelected = targetChatId === selectedChatIdRef.current;
          await storageManager.transaction([
            {
              sql: `INSERT INTO chats (id, name, avatar, lastMessage, time, unread, isGroup, online, pts, is_152fz_contour)
                    VALUES (?, ?, '👤', ?, ?, ?, ?, 1, 0, 0)
                    ON CONFLICT(id) DO UPDATE SET
                      lastMessage = excluded.lastMessage,
                      time = excluded.time,
                      unread = chats.unread + excluded.unread;`,
              params: [
                targetChatId,
                targetChatName,
                incomingMsg.text,
                incomingMsg.time,
                isSelected ? 0 : 1,
                isGroup ? 1 : 0
              ]
            },
            {
              sql: `INSERT OR REPLACE INTO messages (id, chatId, sender, senderName, text, time, pts, timestamp, type, mediaUrl, peaks, replyToMessageId, status, mediaKey, mediaIv, topic_id, raw_encrypted)
                    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 'sent', ?, ?, ?, ?);`,
              params: [
                incomingMsg.id,
                targetChatId,
                persistedSenderId,
                incomingMsg.senderName,
                incomingMsg.text,
                incomingMsg.time,
                incomingMsg.timestamp,
                incomingMsg.type,
                incomingMsg.mediaUrl || null,
                incomingMsg.peaks ? JSON.stringify(incomingMsg.peaks) : null,
                incomingMsg.replyToMessageId || null,
                incomingMsg.mediaKey || null,
                incomingMsg.mediaIv || null,
                (incomingMsg as any).topic_id ?? payload.topic_id ?? null,
                rawEncryptedPayload
              ]
            }
          ]);
        } catch (dbErr) {
          console.warn("[UI App] Предупреждение записи BLE Mesh диалога/сообщения в БД:", dbErr);
        }

        // Дедупликация ДО конвейера уведомлений: повторные радио-копии одного сообщения
        // (прокачка очереди отправителя до получения ACK) не должны дергать баннер и пуш
        const isDuplicateIncoming = (chatsRef.current || []).some(c => {
          const cId = String(c.id).trim().toLowerCase();
          const chatMatches = cId === String(targetChatId).trim().toLowerCase() || matchesPeerChatId(cId);
          if (!chatMatches) return false;
          return (c.messages || []).some(m =>
            m.id === incomingMsg.id ||
            (m.text === incomingMsg.text && (m.type || 'text') === (incomingMsg.type || 'text') &&
             Math.abs((m.timestamp || 0) - (incomingMsg.timestamp || 0)) < 120000)
          );
        });

        // Обновляем чат в React состоянии (строго по идентификаторам — без name-фолбэка)
        setChats(prevChats => {
          const chatIndex = prevChats.findIndex(c => 
            String(c.id) === targetChatId || matchesPeerChatId(String(c.id))
          );

          if (chatIndex !== -1) {
            const chat = prevChats[chatIndex];
            const exists = chat.messages.some(m => 
              m.id === incomingMsg.id || 
              (m.text === incomingMsg.text && (m.type || 'text') === (incomingMsg.type || 'text') &&
               Math.abs((m.timestamp || 0) - (incomingMsg.timestamp || 0)) < 120000)
            );
            if (exists) return prevChats;

            const isSelected = chat.id === selectedChatIdRef.current;
            const updatedChat = {
              ...chat,
              lastMessage: incomingMsg.text,
              time: incomingMsg.time,
              unread: isSelected ? 0 : (chat.unread || 0) + 1,
              messages: [...chat.messages, incomingMsg]
            };
            const nextChats = [...prevChats];
            nextChats[chatIndex] = updatedChat;
            return nextChats;
          } else {
            // Если чата с этим пользователем еще не было в списке, создаем его
            const newChat: Chat = {
              id: targetChatId,
              name: targetChatName,
              avatar: '👤',
              lastMessage: incomingMsg.text,
              time: incomingMsg.time,
              unread: (targetChatId === selectedChatIdRef.current) ? 0 : 1,
              isGroup,
              online: true,
              messages: [incomingMsg]
            };
            return [newChat, ...prevChats];
          }
        });

        // 🔔 КОНВЕЙЕР УВЕДОМЛЕНИЙ: In-App баннер + тактильный отклик + LocalNotifications
        // Проверка свежести сообщения (не старше 60 секунд) для исключения ложных повторных оповещений от старых mesh-сообщений
        const msgTimestamp = Number(incomingMsg.timestamp) || 0;
        const now = Date.now();
        const isFreshRealtime = (now - msgTimestamp) < 60000 && (msgTimestamp - now) < 10000;
        const shouldNotify = isFreshRealtime && !isDuplicateIncoming && !alreadyExistsInDb;

        const isAppHidden = typeof document !== 'undefined' && document.hidden;
        const isDifferentChat = targetChatId !== selectedChatIdRef.current;
        const isAndroid = typeof window !== 'undefined' && (window as any).Capacitor !== undefined && (window as any).Capacitor.getPlatform() === 'android';

        // 1. Если приложение открыто, но пользователь в другом чате/экране -> Показываем элегантный In-App баннер + тактильный отклик
        if (!isAppHidden && shouldNotify && isDifferentChat && !isCallOpenRef.current && !incomingCallIdRef.current) {
          setInAppNotification({
            id: String(Date.now()),
            chatId: targetChatId,
            senderName: targetChatName,
            avatarUrl: '👤',
            text: incomingMsg.text || 'Новое сообщение (Mesh)',
            time: incomingMsg.time || 'сейчас',
            isGroup
          });

          // Тактильный отклик (Haptic Feedback) на мобильных устройствах
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try {
              navigator.vibrate([15, 30, 15]);
            } catch (e) {}
          }
        }

        // 2. Если приложение свернуто в фон -> Системные push/local notifications с именем отправителя
        if (isAppHidden && shouldNotify) {
          const notificationTitle = isGroup 
            ? `${targetChatName} (Mesh Группа)`
            : `${targetChatName} (Mesh)`;

          if (isAndroid) {
            // Стабильный id по chatId: повторные перекачки того же конверта заменяют
            // уведомление чата вместо штока одинаковых карточек в трее (F-1a)
            const chatHash = (targetChatId || 'mesh').split('').reduce((acc, ch) => (((acc << 5) - acc + ch.charCodeAt(0)) | 0), 0);
            const notificationId = Math.abs(chatHash) % 2147483647;
            LocalNotifications.schedule({
              notifications: [
                {
                  title: notificationTitle,
                  body: incomingMsg.text || 'Новое сообщение',
                  id: notificationId,
                  channelId: 'gossip_messages',
                  extra: { chatId: targetChatId }
                }
              ]
            }).catch(err => console.error('[BgService] Ошибка отправки локального Mesh уведомления:', err));
          } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(notificationTitle, {
              body: incomingMsg.text || 'Новое сообщение',
              icon: '/logo.png',
              tag: `mesh-${targetChatId}`
            });
          }
        }
      } catch (err) {
        console.error("[UI App] Ошибка обработки входящего BLE Mesh конверта:", err);
      }
    };

    // Подтверждение радио-доставки (Radio-ACK mesh_ack): переводим сообщение из 'pending' (часики) в 'sent' (галочка)
    // и очищаем дублирующую запись из outbox_queue, так как получатель подтвердил доставку напрямую по BLE
    const handleMeshDeliveryAck = async (event: Event) => {
      try {
        const customEvent = event as CustomEvent;
        const { messageId, chatId } = customEvent.detail || {};
        if (!messageId) return;

        try {
          if (storageManager && storageManager.getIsInitialized()) {
            await storageManager.transaction([
              {
                sql: `UPDATE messages SET status = CASE WHEN status = 'read' THEN 'read' ELSE 'sent' END WHERE id = ?;`,
                params: [messageId]
              },
              {
                sql: `DELETE FROM outbox_queue WHERE id = ?;`,
                params: [messageId]
              }
            ]);
          }
        } catch (dbAckErr) {
          console.warn('[UI App] Ошибка обновления статуса Radio-ACK в SQLite:', dbAckErr);
        }

        setChats(prevChats => prevChats.map(c => {
          if (chatId && String(c.id) !== String(chatId) && !c.messages.some(m => m.id === messageId)) {
            return c;
          }
          if (!c.messages.some(m => m.id === messageId)) return c;
          return {
            ...c,
            messages: c.messages.map(m =>
              m.id === messageId && m.status !== 'read'
                ? { ...m, status: 'sent' as const, isE2EESendFailed: false }
                : m
            )
          };
        }));
      } catch (ackErr) {
        console.warn('[UI App] Ошибка обработки gossip_mesh_delivery_ack:', ackErr);
      }
    };

    try {
      offlineMeshManager.setBackendUrl(getBackendUrl(''));
    } catch (e) {}

    window.addEventListener('gossip_mesh_envelope_received', handleMeshEnvelope);
    window.addEventListener('gossip_mesh_delivery_ack', handleMeshDeliveryAck);
    return () => {
      window.removeEventListener('gossip_mesh_envelope_received', handleMeshEnvelope);
      window.removeEventListener('gossip_mesh_delivery_ack', handleMeshDeliveryAck);
    };
  }, []);

  // Эффект для выполнения FTS5 поиска сообщений и глобального поиска пользователей
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setGlobalSearchResults([]);
      setGlobalSearchUser(null);
      setIsSearching(false);
      return;
    }

    const performSearch = async () => {
      setIsSearching(true);
      const query = searchQuery.trim();

      // 1. Локальный поиск по сообщениям через FTS5 (если БД загружена)
      if (isDbLoaded) {
        try {
          const queryText = query.replace(/['"^*]/g, '') + '*';
          console.log(`[App] Выполнение FTS5 поиска для запроса: ${queryText}`);
          
          const results = await storageManager.query<any>(`
            SELECT m.id, m.chatId, m.sender, m.senderName, m.text, m.time, m.pts, m.timestamp, c.name as chatName, c.avatar as chatAvatar
            FROM messages_fts f
            JOIN messages m ON f.rowid = m.rowid
            JOIN chats c ON m.chatId = c.id
            WHERE messages_fts MATCH ?
            ORDER BY m.timestamp DESC;
          `, [queryText]);

          setSearchResults(results);
        } catch (err) {
          console.error('[Search] Ошибка FTS5 поиска:', err);
          setSearchResults([]);
        }
      } else {
        setSearchResults([]);
      }

      // 2. Глобальный поиск пользователя на сервере (работает всегда независимо от локальной БД)
      try {
        const cleanQuery = query.trim().startsWith('@') ? query.trim().substring(1) : query.trim();
        const res = await fetch(getBackendUrl(`/api/v1/users/search?username=${encodeURIComponent(cleanQuery)}&exact=false`), {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          const resultsArray: Array<{ userId: string; username: string; avatar?: string; displayName?: string; display_name?: string; short_id?: number | null; collision?: boolean }> =
            Array.isArray(data) ? data : (data && data.userId ? [data] : []);

          setGlobalSearchResults(resultsArray);
          setGlobalSearchUser(resultsArray.length > 0 ? resultsArray[0] : null);
        } else {
          setGlobalSearchResults([]);
          setGlobalSearchUser(null);
        }
      } catch (err) {
        console.error('[Search] Ошибка глобального поиска пользователей:', err);
        setGlobalSearchResults([]);
        setGlobalSearchUser(null);
      } finally {
        setIsSearching(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, isDbLoaded]);

  // Синхронизация прочтения и мгновенная очистка уведомлений при смене чата
  useEffect(() => {
    if (selectedChatId) {
      // 1. Сбрасываем плавающий In-App баннер уведомлений для открытого чата
      setInAppNotification(prev => (prev && String(prev.chatId) === String(selectedChatId)) ? null : prev);

      // 2. Очищаем все системные уведомления в трее Android / iOS / Web
      NotificationSyncService.clearChatNotifications(selectedChatId);

      const chat = chatsRef.current.find(c => c.id === selectedChatId);
      if (chat) {
        const lastMsg = chat.messages[chat.messages.length - 1];
        if (lastMsg) {
          syncManager.readHistory(chat.id, lastMsg.id);
          if (lastMsg.pts) {
            localStorage.setItem(`last_read_pts_${chat.id}`, String(lastMsg.pts));
          }
        }
        if (chat.unread > 0) {
          setChats(prevChats => prevChats.map(c => 
            c.id === selectedChatId ? { ...c, unread: 0 } : c
          ));
          storageManager.execute(`UPDATE chats SET unread = 0 WHERE id = ?;`, [selectedChatId]).catch(() => {});
        }
      }
    }
  }, [selectedChatId]);

  // Нахождение активного чата
  const activeChat = chats.find(c => c.id === selectedChatId) || chats[0];

  // R3 (M3.2): статус верификации активного чата (зелёный щит)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeChat || activeChat.isGroup || activeChat.type === 'channel') {
        if (!cancelled) setChatVerified(false);
        return;
      }
      try {
        const rows = await storageManager.query<{ is_verified: number }>(
          "SELECT is_verified FROM chats WHERE id = ? LIMIT 1;",
          [activeChat.id]
        );
        if (!cancelled) setChatVerified(rows.length > 0 && rows[0].is_verified === 1);
      } catch {
        if (!cancelled) setChatVerified(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeChat?.id, chats]);

  const appBaseCtx = {
    TYPING_DEBOUNCE_MS, activeCallChatId, activeCallId, activeCallName, activeChat, activeGroupCallSession,
    activeReactionMessageId, activeTab, activeTopicId, addMemberInput, addMemberSearchResults, addMemberSearchTimeoutRef,
    androidUpdateData, apkDownloadError, apkDownloadProgress, apkDownloadedBytes, apkDownloading, apkDownloadingRef,
    apkPermissionRequested, apkReadyToInstall, apkReadyToInstallRef, apkTotalBytes, audioLockMode, audioLockModeRef,
    audioPeaks, audioPlayState, audioPreviewRef, audioRecordDuration, audioRecorder, audioRecorderRef,
    audioTimerRef, authMode, authState, authStatus, authStep, avatarInputRef,
    avatarViewerState, bgServiceEnabled, callActionStateRef, chatMenuRef, chatToDelete, chatTtlMenuOpen,
    chatVerified, chats, chatsRef, clearIncomingCallTimeout, cropImageSrc, cropModalOpen,
    cropTarget, currentAppVersion, currentUserId, customServerUrl, drafts, editingFolder,
    editingMessage, editingTopic, errorMsg, fetchMyBotsCount, folderEditMode, folderMembers,
    folders, formatUserDisplayName, forwardingMessageId, generatedMnemonic, getNetworkStatusUI, globalSearchResults,
    globalSearchUser, groupAvatarInputRef, groupInfoEpoch, groupInfoMembers, groupMemberInput, groupMemberSearchResults,
    handleAcceptCall, handleAuth, handleCancelPinAndExitToLanding, handleClearLocalStorageAndExit, handleConfirmMnemonicAndRegister, handleDeclineCall,
    handleHashtagClick, handleLandingEnterpriseDemo, handleLandingInstall, handleLandingLogin, handleLogout, handleMentionClick,
    handlePinSubmit, handleRecoverySubmit, handleRefreshPremium, handleToggleBgService, handleToggleChat152Fz, handleToggleMuteChat,
    handleTogglePinAutoUnlock, highlightMessageId, holdTimeoutRef, i18n, inAppNotification, incomingCallAvatar,
    incomingCallChatId, incomingCallId, incomingCallMediaType, incomingCallName, inputMode, inputModeRef,
    installApk, isAdminModalOpen, isAudioRecording, isAudioRecordingRef, isAuthLoading, isAuthenticated,
    isAvatarUploading, isBotManagementOpen, isCallOpen, isChannelInfoOpen, isChatIn152FzContour, isChatMenuOpen,
    isChatPrivacyModalOpen, isChatSearchOpen, isDbLoaded, isDeleteChatModalOpen, isEditingGroupName, isEmojiPickerOpen,
    isEnterpriseDemoModalOpen, isFoldersModalOpen, isForceUpdateRequired, isForwardModalOpen, isGroupAvatarActionSheetOpen, isGroupAvatarUploading,
    isGroupCallActive, isGroupCallOpen, isGroupManageModalOpen, isHoldingRecordRef, isInChatTransferOpen, isIncomingCallOpen,
    isInfoModalOpen, isInstallingApk, isKeyboardOpen, isLanguageModalOpen, isLargeFont, isLongPressActive,
    isMediaDrawerOpen, isMyAvatarActionSheetOpen, isNetworkModalOpen, isNewChatModalOpen, isOutgoingCall, isPollModalOpen,
    isPremium, isPremiumModalOpen, isRecordingVideoNote, isRecoverySubmitting, isSafetyModalOpen, isScheduledModalOpen,
    isSearching, isSearchingAddMember, isSearchingMembers, isSharedMediaDrawerOpen, isStickerPickerOpen, isTonWalletModalOpen,
    isTopicConstructorOpen, isUuid, lastModeToggleTimeRef, lastTouchTimeRef, lastTypingSentRef, longPressTimeoutRef,
    mediaGalleryState, memberSearchTimeoutRef, meshSnapshot, mnemonicConfirmed, mnemonicCopied, mobileView,
    mutedChatIds, myBotsCount, netSnapshot, newChannelDescription, newChannelUsername, newChatIsGroup,
    newChatName, newChatType, newFolderChats, newFolderIcon, newFolderIs152Fz, newFolderName,
    newGroupName, newMessageText, newPasswordConfirmInput, newPasswordInput, password, pendingRegisterPayload,
    pinAutoUnlock, pinError, pinInput, pinOverlayMode, pinOverlayUsername, pinnedIndexMap,
    pinnedMessageMap, prekeyPublishError, prekeyPublishStatus, profileAvatarUrl, publishPrekeysWithStatus, reactionMenuCoords,
    realInstalledVersion, recordedAudioUrl, recordedVideoUrl, recoveryError, recoveryPhraseInput, replyingToMessage,
    requestVoiceTranscription, resolveSenderName, safetyPeerIdentityKey, scheduleMenuOpen, searchQuery, searchResults,
    selectedChatId, selectedFolderId, selectedGroupMembers, selectedMessageIds, selectedPhotoUrl, sendTtlSeconds,
    setActiveCallChatId, setActiveCallId, setActiveCallName, setActiveReactionMessageId, setActiveTab, setActiveTopicId,
    setAddMemberInput, setAddMemberSearchResults, setAudioLockMode, setAudioPeaks, setAudioPlayState, setAudioRecordDuration,
    setAudioRecorder, setAuthMode, setAuthState, setAvatarViewerState, setChatToDelete, setChatTtlMenuOpen,
    setChatVerified, setChats, setCropImageSrc, setCropModalOpen, setCropTarget, setCustomServerUrl,
    setDrafts, setEditingFolder, setEditingMessage, setEditingTopic, setErrorMsg, setFolderEditMode,
    setFolderMembers, setFolders, setForwardingMessageId, setGroupInfoEpoch, setGroupInfoMembers, setGroupMemberInput,
    setGroupMemberSearchResults, setHighlightMessageId, setInAppNotification, setInputMode, setIsAdminModalOpen, setIsAudioRecording,
    setIsAvatarUploading, setIsBotManagementOpen, setIsCallOpen, setIsChannelInfoOpen, setIsChatMenuOpen, setIsChatPrivacyModalOpen,
    setIsChatSearchOpen, setIsDeleteChatModalOpen, setIsEditingGroupName, setIsEmojiPickerOpen, setIsEnterpriseDemoModalOpen, setIsFoldersModalOpen,
    setIsForceUpdateRequired, setIsForwardModalOpen, setIsGroupAvatarActionSheetOpen, setIsGroupAvatarUploading, setIsGroupCallActive, setIsGroupCallOpen,
    setIsGroupManageModalOpen, setIsInChatTransferOpen, setIsInfoModalOpen, setIsLanguageModalOpen, setIsLargeFont, setIsMediaDrawerOpen,
    setIsMyAvatarActionSheetOpen, setIsNetworkModalOpen, setIsNewChatModalOpen, setIsOutgoingCall, setIsPollModalOpen, setIsPremiumModalOpen,
    setIsRecordingVideoNote, setIsSafetyModalOpen, setIsScheduledModalOpen, setIsSearchingAddMember, setIsSearchingMembers, setIsSharedMediaDrawerOpen,
    setIsStickerPickerOpen, setIsTonWalletModalOpen, setIsTopicConstructorOpen, setMediaGalleryState, setMnemonicConfirmed, setMnemonicCopied,
    setMobileView, setNewChannelDescription, setNewChannelUsername, setNewChatIsGroup, setNewChatName, setNewChatType,
    setNewFolderChats, setNewFolderIcon, setNewFolderIs152Fz, setNewFolderName, setNewGroupName, setNewMessageText,
    setNewPasswordConfirmInput, setNewPasswordInput, setPassword, setPinInput, setPinnedIndexMap, setPinnedMessageMap,
    setProfileAvatarUrl, setReactionMenuCoords, setRecordedAudioUrl, setRecordedVideoUrl, setRecoveryError, setRecoveryPhraseInput,
    setReplyingToMessage, setSafetyPeerIdentityKey, setScheduleMenuOpen, setSearchQuery, setSelectedChatId, setSelectedFolderId,
    setSelectedGroupMembers, setSelectedMessageIds, setSelectedPhotoUrl, setSendTtlSeconds, setShowAdvancedServer, setShowDeleteConfirm,
    setShowMnemonicModal, setShowPinResetConfirm, setSystemAlertModal, setTheme, setToast, setTopics,
    setTypingUserIds, setUpdateBannerData, setUploadingFile, setUsername, setVideoLockMode, setVideoNoteTriggerStart,
    setVideoNoteTriggerStop, setVideoNoteTriggerSwitch, setVideoPlayState, setVideoRecordingActive, showAdvancedServer, showDeleteConfirm,
    showMnemonicModal, showPinOverlay, showPinResetConfirm, showPulseTab, showToast, showTranscriptions,
    showWalletTab, startBackgroundApkDownload, systemAlertModal, t, textareaRef, theme,
    toast, togglePulseTab, toggleWalletTab, topics, touchStartRef, typingTextRef,
    typingUserIds, updateBannerData, uploadingFile, username, videoLockModeRef, videoNoteTriggerStart,
    videoNoteTriggerStop, videoNoteTriggerSwitch, videoPlayState, videoPreviewMuted, videoPreviewRef, videoRecordingActive,
    virtualMessageListRef, voiceTranscribing, voiceTranscriptions,
    isPremiumSecurityModalOpen, setIsPremiumSecurityModalOpen, voiceChangerPreset, handleSelectVoicePreset,
    handleOpenBurnerChat, handleBurnActiveRoom
  };
  const chatActions = useAppChatActions(appBaseCtx);
  const appSubComponentCtx = { ...appBaseCtx, ...chatActions };
  return (
    <div className="relative h-full w-full bg-obsidian text-slate-100 flex overflow-hidden select-none">
      {/* Декоративные фоновые неоновые свечения с использованием blur (аппаратно ускоренные) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Интерактивный фон с частицами */}
      <InteractiveBackground theme={theme} />

      <AnimatePresence mode="wait" initial={false}>
        {!isAuthenticated ? (
          <AppAuthFlow ctx={appSubComponentCtx} />
        ) : (
          <AppMainWorkspace ctx={appSubComponentCtx} />
        )}
      </AnimatePresence>

      <AppGlobalOverlays ctx={appSubComponentCtx} />
    </div>
  );
}
