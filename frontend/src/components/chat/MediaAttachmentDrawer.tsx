// frontend/src/components/chat/MediaAttachmentDrawer.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Image as ImageIcon, 
  FileText, 
  MapPin, 
  X, 
  RefreshCw, 
  Sparkles, 
  Zap, 
  ZapOff, 
  Maximize2, 
  ArrowLeft,
  Loader2,
  Coins,
  BarChart2
} from 'lucide-react';

export interface MediaAttachmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (file: File) => void;
  onSelectMultipleFiles?: (files: File[]) => void;
  onSendLocation?: (lat: number, lng: number, title?: string) => void;
  onOpenTonTransfer?: () => void;
  onOpenPollModal?: () => void;
  theme?: 'dark' | 'light' | 'coffee';
}

/**
 * Telegram-Style Media Attachment Drawer
 * - Первая плитка: Живая камера в реальном времени (Live WebRTC stream) без блокировки
 * - Полноэкранный видоискатель камеры с реальным физическим переключением камер (front/back), вспышкой и моментальным снимком
 * - Кнопки "Назад" (в меню) и "Закрыть" (крестик) в любом режиме, перехват аппаратной кнопки Назад на Android
 * - Быстрые плитки: Галерея (Фото/Видео), Файл/Документ, Геолокация (GPS с fallback)
 * - Полная адаптация под выбранную тему оформления (Obsidian Dark / Light / Luxury Coffee)
 */
export const MediaAttachmentDrawer: React.FC<MediaAttachmentDrawerProps> = ({
  isOpen,
  onClose,
  onSelectFile,
  onSelectMultipleFiles,
  onSendLocation,
  onOpenTonTransfer,
  onOpenPollModal,
  theme = 'dark',
}) => {
  // Состояния
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isFullscreenCamera, setIsFullscreenCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasFlashSupport, setHasFlashSupport] = useState(false);
  const [isShutterActive, setIsShutterActive] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Список аппаратных видеокамер
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);

  // Скрытые input элементы для выбора файлов
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Ссылки на видео и стрим
  const miniVideoRef = useRef<HTMLVideoElement | null>(null);
  const fullVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Надежное прикрепление медиапотока к видеоэлементу
  const attachStreamToVideo = useCallback((videoElement: HTMLVideoElement | null) => {
    if (!videoElement) return;
    if (streamRef.current) {
      if (videoElement.srcObject !== streamRef.current) {
        videoElement.srcObject = streamRef.current;
      }
      videoElement.play().catch((e) => {
        console.warn('[MediaDrawer] Воспроизведение видеопотока ожидает действия пользователя:', e);
      });
    }
  }, []);

  // Callback refs для мгновенного назначения стрима при монтировании элементов в DOM
  const setMiniVideoRef = useCallback((el: HTMLVideoElement | null) => {
    miniVideoRef.current = el;
    attachStreamToVideo(el);
  }, [attachStreamToVideo]);

  const setFullVideoRef = useCallback((el: HTMLVideoElement | null) => {
    fullVideoRef.current = el;
    attachStreamToVideo(el);
  }, [attachStreamToVideo]);

  // Остановка видеотреков камеры и освобождение аппаратного сенсора
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
          track.enabled = false;
        } catch (e) {
          console.warn('[MediaDrawer] Ошибка при остановке трека:', e);
        }
      });
      streamRef.current = null;
    }
    if (miniVideoRef.current) {
      miniVideoRef.current.srcObject = null;
    }
    if (fullVideoRef.current) {
      fullVideoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsFlashOn(false);
    setHasFlashSupport(false);
  }, []);

  // Получение списка всех доступных видеокамер
  const refreshVideoDevices = useCallback(async (): Promise<MediaDeviceInfo[]> => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return [];
      const devices = await navigator.mediaDevices.enumerateDevices();
      const vDevices = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(vDevices);
      return vDevices;
    } catch (e) {
      console.warn('[MediaDrawer] Ошибка перечисления устройств:', e);
      return [];
    }
  }, []);

  // Инициализация камеры (WebRTC getUserMedia) с точным выбором физического датчика
  const startCameraStream = useCallback(async (targetMode: 'environment' | 'user', specificDeviceId?: string | null) => {
    setCameraError(null);
    try {
      // 1. Полностью освобождаем предыдущий видеосенсор перед открытием нового
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => {
          try {
            t.stop();
            t.enabled = false;
          } catch (e) {}
        });
        streamRef.current = null;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Камера не поддерживается в данной среде');
      }

      let stream: MediaStream | null = null;
      let usedDeviceId = specificDeviceId || null;

      // 2. Если конкретный deviceId не передан — находим его среди доступных камер
      if (!usedDeviceId) {
        const devices = await refreshVideoDevices();
        if (devices.length > 0) {
          // Ищем камеру по метке label
          const matched = devices.find((d) => {
            const lbl = (d.label || '').toLowerCase();
            if (targetMode === 'user') {
              return lbl.includes('front') || lbl.includes('user') || lbl.includes('передн') || lbl.includes('селфи') || lbl.includes('facing front');
            } else {
              return lbl.includes('back') || lbl.includes('rear') || lbl.includes('environment') || lbl.includes('задн') || lbl.includes('основн') || lbl.includes('facing back');
            }
          });

          if (matched && matched.deviceId) {
            usedDeviceId = matched.deviceId;
          } else if (devices.length > 1) {
            // Если меток нет, выбираем по индексу: user -> последняя, environment -> первая
            usedDeviceId = targetMode === 'user' ? devices[devices.length - 1].deviceId : devices[0].deviceId;
          }
        }
      }

      // 3. Стратегия 1: Точный deviceId (гарантирует реальное физическое переключение сенсора на Android)
      if (usedDeviceId) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              deviceId: { exact: usedDeviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
        } catch (e1) {
          console.warn('[MediaDrawer] Ошибка захвата по exact deviceId, пробуем мягкий deviceId:', e1);
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: { deviceId: usedDeviceId },
            });
          } catch (e2) {
            console.warn('[MediaDrawer] Ошибка по deviceId:', e2);
          }
        }
      }

      // 4. Стратегия 2: exact facingMode (если deviceId не сработал или нет устройств)
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: { exact: targetMode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
        } catch (eExactFacing) {
          console.warn('[MediaDrawer] Ошибка exact facingMode, пробуем ideal facingMode:', eExactFacing);
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: { facingMode: targetMode },
            });
          } catch (eIdealFacing) {
            console.warn('[MediaDrawer] Ошибка ideal facingMode, пробуем базовое { video: true }:', eIdealFacing);
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: true,
            });
          }
        }
      }

      if (!stream) {
        throw new Error('Не удалось получить видеопоток с камеры');
      }

      streamRef.current = stream;
      setIsCameraActive(true);
      setCameraError(null);

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const trackSettings = videoTrack.getSettings ? videoTrack.getSettings() : {};
        if (trackSettings.deviceId) {
          setCurrentDeviceId(trackSettings.deviceId);
        }

        // Проверяем поддержку вспышки/фонарика (Torch)
        try {
          const capabilities = (videoTrack.getCapabilities?.() || {}) as any;
          setHasFlashSupport(Boolean(capabilities.torch));
        } catch {
          setHasFlashSupport(false);
        }
      }

      // Обновляем список устройств после получения доступа (теперь доступны метки камер)
      refreshVideoDevices();

      // Привязываем к активным элементам видео
      attachStreamToVideo(miniVideoRef.current);
      attachStreamToVideo(fullVideoRef.current);
    } catch (err: any) {
      console.warn('[MediaDrawer] Ошибка запуска камеры:', err);
      setCameraError(err.message || 'Ошибка доступа к камере');
      setIsCameraActive(false);
    }
  }, [attachStreamToVideo, refreshVideoDevices]);

  // Запуск камеры при открытии шторки
  useEffect(() => {
    if (isOpen) {
      startCameraStream(facingMode);
    } else {
      stopCameraStream();
      setIsFullscreenCamera(false);
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen]);

  // Поддержка аппаратной кнопки "Назад" (Android Back Button)
  useEffect(() => {
    if (!isOpen) return;

    const handleHardwareBack = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      if (isFullscreenCamera) {
        // Если открыт полноэкранный видоискатель — возвращаемся в меню шторки
        setIsFullscreenCamera(false);
      } else {
        // Если открыта шторка — закрываем её и остаемся в активном чате
        onClose();
      }
    };

    window.addEventListener('gossip_drawer_back', handleHardwareBack);

    return () => {
      window.removeEventListener('gossip_drawer_back', handleHardwareBack);
    };
  }, [isOpen, isFullscreenCamera, onClose]);

  // Синхронизация стрима при переключении между полноэкранным режимом и мини-плиткой
  useEffect(() => {
    if (isCameraActive && streamRef.current) {
      if (isFullscreenCamera) {
        attachStreamToVideo(fullVideoRef.current);
      } else {
        attachStreamToVideo(miniVideoRef.current);
      }
    }
  }, [isFullscreenCamera, isCameraActive, attachStreamToVideo]);

  // Переключение между физическими камерами устройства
  const handleSwitchCamera = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);

    // Ищем следующее доступное устройство из списка
    const devices = videoDevices.length > 0 ? videoDevices : await refreshVideoDevices();
    let nextDeviceId: string | null = null;

    if (devices.length > 1) {
      // Ищем устройство с противоположной меткой
      const targetDevice = devices.find((d) => {
        const lbl = (d.label || '').toLowerCase();
        if (nextMode === 'user') {
          return lbl.includes('front') || lbl.includes('user') || lbl.includes('передн') || lbl.includes('селфи') || lbl.includes('facing front');
        } else {
          return lbl.includes('back') || lbl.includes('rear') || lbl.includes('environment') || lbl.includes('задн') || lbl.includes('основн') || lbl.includes('facing back');
        }
      });

      if (targetDevice && targetDevice.deviceId !== currentDeviceId) {
        nextDeviceId = targetDevice.deviceId;
      } else {
        // Если метки не содержат front/back, переключаем на другое устройство
        const otherDevice = devices.find((d) => d.deviceId !== currentDeviceId);
        if (otherDevice) {
          nextDeviceId = otherDevice.deviceId;
        }
      }
    }

    console.log(`[MediaDrawer] Физическое переключение камеры: mode=${nextMode}, nextDeviceId=${nextDeviceId}`);
    await startCameraStream(nextMode, nextDeviceId);
  }, [facingMode, videoDevices, currentDeviceId, refreshVideoDevices, startCameraStream]);

  // Переключение вспышки/фонарика
  const handleToggleFlash = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextFlash = !isFlashOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextFlash }],
      });
      setIsFlashOn(nextFlash);
    } catch (err) {
      console.warn('[MediaDrawer] Ошибка включения фонарика:', err);
    }
  }, [isFlashOn]);

  // Снимок фотографии из живого видеопотока
  const handleCapturePhoto = useCallback(() => {
    const activeVideo = isFullscreenCamera ? fullVideoRef.current : miniVideoRef.current;
    if (!activeVideo || activeVideo.videoWidth === 0) {
      console.warn('[MediaDrawer] Видеопоток еще не готов для снимка');
      return;
    }

    // Виброотклик (haptic feedback)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40);
    }

    // Анимация затвора
    setIsShutterActive(true);
    setTimeout(() => setIsShutterActive(false), 200);

    const canvas = document.createElement('canvas');
    canvas.width = activeVideo.videoWidth;
    canvas.height = activeVideo.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Если фронтальная камера — зеркалим изображение для естественности
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(activeVideo, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `photo_${timestamp}.jpg`;
      const photoFile = new File([blob], filename, { type: 'image/jpeg' });

      // Закрываем камеру и шторку, передаем файл дальше
      stopCameraStream();
      setIsFullscreenCamera(false);
      onClose();
      onSelectFile(photoFile);
    }, 'image/jpeg', 0.92);
  }, [facingMode, isFullscreenCamera, onClose, onSelectFile, stopCameraStream]);

  // Обработка выбора файлов из галереи
  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length === 1) {
      onSelectFile(files[0]);
    } else if (onSelectMultipleFiles) {
      onSelectMultipleFiles(Array.from(files));
    } else {
      onSelectFile(files[0]);
    }

    // Сброс значения инпута для повторного выбора того же файла
    e.target.value = '';
    onClose();
  };

  // Обработка выбора документов
  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    onSelectFile(files[0]);
    e.target.value = '';
    onClose();
  };

  // Запрос и отправка геолокации с Fallback
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Геолокация не поддерживается вашим браузером или устройством');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        if (onSendLocation) {
          onSendLocation(pos.coords.latitude, pos.coords.longitude, 'Мое местоположение');
        }
        onClose();
      },
      (err) => {
        console.warn('[MediaDrawer] Точная геолокация недоступна, пробуем стандартную точность:', err);
        navigator.geolocation.getCurrentPosition(
          (fallbackPos) => {
            setIsLocating(false);
            if (onSendLocation) {
              onSendLocation(fallbackPos.coords.latitude, fallbackPos.coords.longitude, 'Мое местоположение');
            }
            onClose();
          },
          (finalErr) => {
            setIsLocating(false);
            console.error('[MediaDrawer] Ошибка получения геолокации:', finalErr);
            let msg = 'Не удалось получить координаты: ' + finalErr.message;
            if (finalErr.code === 1) {
              msg = 'Доступ к геолокации отклонен. Разрешите доступ к местоположению в настройках телефона/приложения.';
            } else if (finalErr.code === 2) {
              msg = 'Координаты недоступны. Убедитесь, что GPS включен в шторке телефона.';
            } else if (finalErr.code === 3) {
              msg = 'Превышено время ожидания ответа GPS. Попробуйте еще раз.';
            }
            alert(msg);
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 }
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  // Тематические токены оформления (Dark, Light, Coffee)
  const isLight = theme === 'light';
  const isCoffee = theme === 'coffee';

  // Цвета контейнера шторки
  const drawerBgClass = isLight 
    ? 'bg-[#F8F9FA]/98 border-t sm:border border-black/10 shadow-2xl backdrop-blur-2xl text-slate-900' 
    : isCoffee 
      ? 'bg-[#1A120B]/98 border-t sm:border border-[#D5CEA3]/25 shadow-2xl backdrop-blur-2xl text-[#E5E5CB]' 
      : 'bg-[#0D0E15]/98 border-t sm:border border-white/15 shadow-2xl backdrop-blur-2xl text-slate-100';

  const handleBarClass = isLight ? 'bg-black/20' : isCoffee ? 'bg-[#D5CEA3]/30' : 'bg-white/20';
  const borderDividerClass = isLight ? 'border-black/10' : isCoffee ? 'border-[#D5CEA3]/15' : 'border-white/10';

  const headerTextClass = isLight ? 'text-slate-900 font-semibold' : isCoffee ? 'text-[#E5E5CB] font-semibold' : 'text-slate-100 font-semibold';
  const headerIconClass = isLight ? 'text-blue-600' : isCoffee ? 'text-[#D5CEA3]' : 'text-emerald-400';
  const closeBtnClass = isLight 
    ? 'bg-black/5 hover:bg-black/10 text-slate-600 hover:text-black' 
    : isCoffee 
      ? 'bg-[#D5CEA3]/10 hover:bg-[#D5CEA3]/20 text-[#D5CEA3] hover:text-white' 
      : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white';

  // Плитка камеры
  const cameraTileClass = isLight
    ? 'border-black/15 bg-black/[0.03] hover:border-blue-500/40 hover:bg-black/[0.06] shadow-sm'
    : isCoffee
      ? 'border-[#D5CEA3]/25 bg-[#D5CEA3]/[0.05] hover:border-[#D5CEA3]/50 hover:bg-[#D5CEA3]/[0.09] shadow-sm'
      : 'border-white/15 bg-white/[0.04] hover:border-emerald-500/40 hover:bg-white/[0.07] shadow-sm';

  const cameraIconBoxClass = isLight
    ? 'bg-blue-500/15 border border-blue-500/30 text-blue-600'
    : isCoffee
      ? 'bg-[#D5CEA3]/15 border border-[#D5CEA3]/30 text-[#D5CEA3]'
      : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400';

  const shutterBtnClass = isLight
    ? 'bg-blue-600 text-white hover:bg-blue-700'
    : isCoffee
      ? 'bg-[#D5CEA3] text-[#1A120B] hover:bg-[#E5E5CB]'
      : 'bg-white text-black hover:bg-slate-200';

  // Плитки галереи и файлов
  const actionTileClass = isLight
    ? 'border-black/10 bg-black/[0.02] hover:bg-black/[0.05] hover:border-blue-400/40'
    : isCoffee
      ? 'border-[#D5CEA3]/15 bg-[#D5CEA3]/[0.04] hover:bg-[#D5CEA3]/[0.08] hover:border-[#D5CEA3]/40'
      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-emerald-400/30';

  const actionIconBoxClass = isLight
    ? 'bg-black/5 border border-black/10 text-slate-800 group-hover:scale-110'
    : isCoffee
      ? 'bg-[#D5CEA3]/10 border border-[#D5CEA3]/20 text-[#D5CEA3] group-hover:scale-110'
      : 'bg-white/5 border border-white/10 text-slate-200 group-hover:scale-110';

  const tileTitleClass = isLight ? 'text-slate-900' : isCoffee ? 'text-[#E5E5CB]' : 'text-slate-100';
  const tileSubClass = isLight ? 'text-slate-500' : isCoffee ? 'text-[#9C927A]' : 'text-slate-400';

  // Кнопка геолокации
  const locationBtnClass = isLight
    ? 'bg-black/[0.03] border-black/10 hover:bg-black/[0.06] text-slate-800 hover:text-black'
    : isCoffee
      ? 'bg-[#D5CEA3]/[0.05] border-[#D5CEA3]/15 hover:bg-[#D5CEA3]/[0.10] text-[#E5E5CB] hover:text-white'
      : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] text-slate-200 hover:text-white';

  const locationIconClass = isLight ? 'text-blue-600' : isCoffee ? 'text-[#D5CEA3]' : 'text-emerald-400';

  // Кнопка полного экрана
  const fullscreenBtnClass = isLight
    ? 'bg-blue-600/15 border border-blue-500/30 hover:bg-blue-600/25 text-blue-700'
    : isCoffee
      ? 'bg-[#D5CEA3]/20 border border-[#D5CEA3]/35 hover:bg-[#D5CEA3]/30 text-[#D5CEA3]'
      : 'bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600/30 text-emerald-300';

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Затемненный фон */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => {
          if (!isFullscreenCamera) {
            onClose();
          }
        }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4"
      >
        {/* Полноэкранный видоискатель камеры */}
        {isFullscreenCamera ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Анимация белой вспышки затвора */}
            {isShutterActive && (
              <div className="absolute inset-0 z-40 bg-white animate-out fade-out duration-200 pointer-events-none" />
            )}

            {/* Верхняя панель видоискателя */}
            <div className="relative z-30 flex items-center justify-between p-4 pt-[calc(1rem+env(safe-area-inset-top))] bg-gradient-to-b from-black/80 to-transparent">
              {/* Кнопка "Назад" в шторку */}
              <button
                type="button"
                onClick={() => setIsFullscreenCamera(false)}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all"
                title="Назад в меню вложений"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                {hasFlashSupport && (
                  <button
                    type="button"
                    onClick={handleToggleFlash}
                    className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
                      isFlashOn ? 'bg-amber-400 text-black' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    title="Фонарик / Вспышка"
                  >
                    {isFlashOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all"
                  title="Переключить камеру"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>

                {/* Кнопка закрытия камеры и шторки */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all"
                  title="Закрыть"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Область предпросмотра видео */}
            <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-black">
              <video
                ref={setFullVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
              />

              {/* Сетка кадрирования */}
              <div className="absolute inset-0 pointer-events-none opacity-20 grid grid-cols-3 grid-rows-3">
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div />
              </div>
            </div>

            {/* Нижняя панель с большой кнопкой затвора */}
            <div className="relative z-30 flex items-center justify-around p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-black/90 to-transparent">
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all"
                title="Выбрать из галереи"
              >
                <ImageIcon className="w-6 h-6" />
              </button>

              {/* Большая кнопка съемки 📸 */}
              <button
                type="button"
                onClick={handleCapturePhoto}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 group active:scale-90 transition-transform cursor-pointer"
                title="Сделать фото"
              >
                <div className="w-full h-full bg-white rounded-full group-hover:scale-95 transition-transform" />
              </button>

              <button
                type="button"
                onClick={handleSwitchCamera}
                className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all"
                title="Сменить камеру"
              >
                <RefreshCw className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        ) : (
          /* Нижняя шторка прикрепления (Telegram-style Attachment Drawer) */
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full sm:max-w-md rounded-t-[28px] sm:rounded-3xl overflow-hidden pb-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col ${drawerBgClass}`}
          >
            {/* Полоска для перетаскивания шторки */}
            <div className="w-full flex items-center justify-center pt-3 pb-1">
              <div className={`w-12 h-1.5 rounded-full ${handleBarClass}`} />
            </div>

            {/* Заголовок шторки */}
            <div className={`flex items-center justify-between px-5 py-2 border-b ${borderDividerClass}`}>
              <div className="flex items-center gap-2">
                <Sparkles className={`w-4 h-4 ${headerIconClass}`} />
                <span className={`text-sm font-outfit ${headerTextClass}`}>
                  Прикрепить к сообщению
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${closeBtnClass}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Сетка медиа и живой камеры */}
            <div className="p-4 flex flex-col gap-4">
              {/* Верхний ряд: Живая камера (1:1 Tile) + Быстрые действия */}
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {/* 1. ПЛИТКА ЖИВОЙ КАМЕРЫ (Telegram-style Live Preview) */}
                <div
                  onClick={() => setIsFullscreenCamera(true)}
                  className={`relative col-span-1 aspect-square rounded-2xl overflow-hidden cursor-pointer group transition-all active:scale-98 flex items-center justify-center border ${cameraTileClass}`}
                  title="Нажмите, чтобы открыть камеру на весь экран"
                >
                  {isCameraActive ? (
                    <>
                      <video
                        ref={setMiniVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                          facingMode === 'user' ? '-scale-x-100' : ''
                        }`}
                      />
                      {/* Оверлей при наведении с кнопкой затвора */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-1.5 pointer-events-none">
                        <div className="flex justify-end pointer-events-auto">
                          <button
                            type="button"
                            onClick={handleSwitchCamera}
                            className="p-1 rounded-full bg-black/50 backdrop-blur-md text-white/80 hover:text-white hover:bg-black/70 transition-all"
                            title="Сменить камеру"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between pointer-events-auto">
                          <div className="flex items-center gap-0.5 bg-black/60 backdrop-blur-md px-1 py-0.5 rounded">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[8px] text-white font-medium font-outfit">Камера</span>
                          </div>
                          
                          {/* Кнопка быстрого снимка прямо из шторки */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCapturePhoto();
                            }}
                            className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md active:scale-90 transition-all ${shutterBtnClass}`}
                            title="Сделать фото сразу"
                          >
                            <Camera className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-1.5 text-center">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1 ${cameraIconBoxClass}`}>
                        <Camera className="w-4 h-4" />
                      </div>
                      <span className={`text-[10px] font-medium ${tileTitleClass}`}>Камера</span>
                      {cameraError ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startCameraStream(facingMode);
                          }}
                          className="mt-1 px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[9px] hover:bg-emerald-500/30 transition-all font-medium"
                        >
                          Включить
                        </button>
                      ) : (
                        <span className="text-[8px] text-slate-400 mt-0.5">Включить</span>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. ПЛИТКА ГАЛЕРЕИ (Фото и видео) */}
                <div
                  onClick={() => galleryInputRef.current?.click()}
                  className={`col-span-1 aspect-square rounded-2xl border cursor-pointer p-1.5 sm:p-2 flex flex-col items-center justify-center gap-1 group transition-all active:scale-98 ${actionTileClass}`}
                >
                  <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center transition-transform ${actionIconBoxClass}`}>
                    <ImageIcon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <span className={`text-[10px] sm:text-xs font-semibold text-center font-outfit ${tileTitleClass}`}>
                    Галерея
                  </span>
                  <span className={`text-[8px] sm:text-[10px] text-center ${tileSubClass}`}>
                    Медиа
                  </span>
                </div>

                {/* 3. ПЛИТКА ФАЙЛОВ (Документы) */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`col-span-1 aspect-square rounded-2xl border cursor-pointer p-1.5 sm:p-2 flex flex-col items-center justify-center gap-1 group transition-all active:scale-98 ${actionTileClass}`}
                >
                  <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center transition-transform ${actionIconBoxClass}`}>
                    <FileText className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <span className={`text-[10px] sm:text-xs font-semibold text-center font-outfit ${tileTitleClass}`}>
                    Файл
                  </span>
                  <span className={`text-[8px] sm:text-[10px] text-center ${tileSubClass}`}>
                    Документ
                  </span>
                </div>

                {/* 4. ПЛИТКА КРИПТОПЕРЕВОДА TON */}
                <div
                  onClick={() => {
                    onClose();
                    if (onOpenTonTransfer) {
                      onOpenTonTransfer();
                    }
                  }}
                  className="col-span-1 aspect-square rounded-2xl border cursor-pointer p-1.5 sm:p-2 flex flex-col items-center justify-center gap-1 group transition-all active:scale-98 bg-gradient-to-br from-blue-600/15 via-purple-600/15 to-transparent border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-500/20 shadow-sm"
                  title="Отправить криптовалюту TON собеседнику"
                >
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center transition-transform bg-purple-500/20 text-purple-300 border border-purple-400/30 group-hover:scale-110">
                    <Coins className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-amber-400" />
                  </div>
                  <span className={`text-[10px] sm:text-xs font-semibold text-center font-outfit ${tileTitleClass}`}>
                    TON
                  </span>
                  <span className="text-[8px] sm:text-[10px] text-purple-300 font-medium text-center">
                    Перевод
                  </span>
                </div>

                {/* 5. ПЛИТКА ОПРОСА (Poll) */}
                <div
                  onClick={() => {
                    onClose();
                    if (onOpenPollModal) {
                      onOpenPollModal();
                    }
                  }}
                  className="col-span-1 aspect-square rounded-2xl border cursor-pointer p-1.5 sm:p-2 flex flex-col items-center justify-center gap-1 group transition-all active:scale-98 bg-gradient-to-br from-indigo-600/15 via-sky-600/15 to-transparent border-indigo-500/30 hover:border-indigo-400/50 hover:bg-indigo-500/20 shadow-sm"
                  title="Создать опрос в чате или канале"
                >
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center transition-transform bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 group-hover:scale-110">
                    <BarChart2 className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-indigo-400" />
                  </div>
                  <span className={`text-[10px] sm:text-xs font-semibold text-center font-outfit ${tileTitleClass}`}>
                    Опрос
                  </span>
                  <span className="text-[8px] sm:text-[10px] text-indigo-300 font-medium text-center">
                    Голосование
                  </span>
                </div>
              </div>

              {/* Нижний ряд быстрых действий (Геолокация и выбор) */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isLocating}
                  className={`flex-1 py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium transition-all ${locationBtnClass} ${isLocating ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {isLocating ? (
                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                  ) : (
                    <MapPin className={`w-4 h-4 ${locationIconClass}`} />
                  )}
                  <span>{isLocating ? 'Определение GPS...' : 'Отправить геопозицию'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFullscreenCamera(true)}
                  className={`py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-all ${fullscreenBtnClass}`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Полный экран</span>
                </button>
              </div>
            </div>

            {/* Скрытые элементы выбора файлов */}
            <input
              type="file"
              ref={galleryInputRef}
              onChange={handleGalleryChange}
              accept="image/*,video/*"
              multiple
              className="hidden"
            />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleDocChange}
              multiple
              className="hidden"
            />
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default MediaAttachmentDrawer;
