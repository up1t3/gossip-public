// frontend/src/components/video/VideoNote.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RefreshCw, Square, Video, Volume2, VolumeX, Play } from 'lucide-react';
import { globalMediaManager } from '../../core/media/globalMediaManager';

export interface VideoNoteProps {
  src?: string; // URL готового видео для воспроизведения в ленте
  onSave?: (blob: Blob) => void; // Коллбек при сохранении записанного кружка
  isRecordingMode?: boolean; // Режим записи жестами
  triggerStop?: number | boolean; // Сигнал на остановку и сохранение
  onCancel?: () => void; // Коллбек при отмене
  triggerStart?: number | boolean; // Сигнал на старт записи
  hideControls?: boolean; // Скрыть внутренние кнопки
  onRecordingStateChange?: (isRecording: boolean) => void; // Изменение состояния записи
  triggerSwitchCamera?: number | boolean; // Сигнал переключения камеры
  onStartHandled?: () => void; // Коллбек при обработке сигнала старта
}

/**
 * Компонент VideoNotePlayer — предназначен ИСКЛЮЧИТЕЛЬНО для воспроизведения готовых видео-кружков в ленте сообщений.
 * КАТЕГОРИЧЕСКИ НЕ обращается к камере (getUserMedia) и не запрашивает аппаратных разрешений.
 */
export const VideoNotePlayer: React.FC<{
  src?: string;
  className?: string;
}> = React.memo(({ src, className }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);

  const muteAndResetAudio = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.loop = true;
    }
    setIsMuted(true);
    if (src) {
      globalMediaManager.releasePlay(src);
    }
  }, [src]);

  // Подписка на глобальный менеджер медиа (если другой кружок или войс перехватил звук)
  useEffect(() => {
    if (!src) return;
    const unsubscribe = globalMediaManager.subscribe((activeId) => {
      if (activeId !== src && !isMuted) {
        // Другой медиа-элемент запросил звук — мгновенно глушим наш кружок
        muteAndResetAudio();
      }
    });
    return () => {
      unsubscribe();
    };
  }, [src, isMuted, muteAndResetAudio]);

  // Автовоспроизведение при попадании в видимую область экрана (Telegram UX)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.4) {
            video.play().then(() => {
              setIsPlaying(true);
            }).catch(() => {});
          } else {
            video.pause();
            setIsPlaying(false);
            // При уходе с экрана глушим звук
            if (!video.muted) {
              muteAndResetAudio();
            }
          }
        });
      },
      { threshold: [0, 0.4, 0.8] }
    );

    observer.observe(video);

    return () => {
      observer.unobserve(video);
    };
  }, [src, muteAndResetAudio]);

  // Обновление кругового прогресс-бара во время воспроизведения
  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      setProgress(total > 0 ? (current / total) * 100 : 0);
    }
  };

  // Окончание видео со звуком: глушим звук и возвращаем в фоновый тихий луп
  const handleEnded = () => {
    const video = videoRef.current;
    if (!video) return;
    console.log('[VideoNote] Кружок доиграл до конца, глушим звук');
    video.muted = true;
    video.loop = true;
    setIsMuted(true);
    setProgress(0);
    if (src) {
      globalMediaManager.releasePlay(src);
    }
    // Перезапускаем в режиме тихого превью
    video.currentTime = 0;
    video.play().then(() => setIsPlaying(true)).catch(() => {});
  };

  const startPlayingWithSoundFromStart = () => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Запрашиваем монопольный звук в GlobalMediaManager
    globalMediaManager.requestPlay(src, 'video_note', {
      pause: () => {
        const v = videoRef.current;
        if (v) {
          v.pause();
          setIsPlaying(false);
        }
      },
      mute: () => {
        muteAndResetAudio();
      }
    });

    try {
      video.pause();
    } catch (e) {}

    video.muted = false;
    video.loop = false; // Отключаем loop, чтобы звук не повторялся бесконечно!
    video.currentTime = 0; // Начинаем воспроизведение со звуком С САМОГО НАЧАЛА (Telegram UX)
    setProgress(0);
    setIsMuted(false);
    setIsPlaying(true);

    // Дополнительный rAF для гарантии сброса буфера на 0:00 в Chromium/Android WebView
    requestAnimationFrame(() => {
      const v = videoRef.current;
      if (v) {
        v.currentTime = 0;
        v.play().then(() => setIsPlaying(true)).catch((err) => {
          console.warn('[VideoNote] Play error:', err);
        });
      }
    });
  };

  // Переключение воспроизведения/паузы и звука по клику на кружок
  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || !src) return;

    if (isMuted) {
      startPlayingWithSoundFromStart();
    } else {
      // Если звук уже включен: пауза / возобновление
      if (video.paused) {
        globalMediaManager.requestPlay(src, 'video_note', {
          pause: () => {
            const v = videoRef.current;
            if (v) {
              v.pause();
              setIsPlaying(false);
            }
          },
          mute: () => {
            muteAndResetAudio();
          }
        });
        video.play().then(() => setIsPlaying(true)).catch(() => {});
      } else {
        video.pause();
        setIsPlaying(false);
        globalMediaManager.releasePlay(src);
      }
    }
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || !src) return;

    if (isMuted) {
      startPlayingWithSoundFromStart();
    } else {
      muteAndResetAudio();
    }
  };

  // Очистка при размонтировании
  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (src) {
        globalMediaManager.releasePlay(src);
      }
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [src]);

  if (!src) {
    return (
      <div className="w-48 h-48 sm:w-60 sm:h-60 rounded-full flex flex-col items-center justify-center bg-slate-900/60 border border-white/10 backdrop-blur-md text-slate-400">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mb-2" />
        <span className="text-xs">Загрузка кружка...</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      className={`relative p-1.5 flex flex-col items-center justify-center select-none overflow-visible ${className || ''}`}
    >
      {/* Круговой индикатор прогресса вокруг кружка (Telegram-style Ring) */}
      <svg
        className="absolute w-[202px] h-[202px] sm:w-[250px] sm:h-[250px] pointer-events-none z-10 -rotate-90"
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)' }}
      >
        <circle
          cx="101"
          cy="101"
          r="98"
          className="sm:hidden"
          stroke="rgba(168, 85, 247, 0.85)"
          strokeWidth="3"
          fill="transparent"
          strokeDasharray={2 * Math.PI * 98}
          strokeDashoffset={2 * Math.PI * 98 * (1 - progress / 100)}
          strokeLinecap="round"
        />
        <circle
          cx="125"
          cy="125"
          r="122"
          className="hidden sm:block"
          stroke="rgba(168, 85, 247, 0.85)"
          strokeWidth="3.5"
          fill="transparent"
          strokeDasharray={2 * Math.PI * 122}
          strokeDashoffset={2 * Math.PI * 122 * (1 - progress / 100)}
          strokeLinecap="round"
        />
      </svg>

      {/* Круглая маска видео */}
      <div 
        onClick={handleVideoClick}
        className="relative w-48 h-48 sm:w-60 sm:h-60 rounded-full overflow-hidden shadow-2xl aspect-square border-2 border-purple-500/30 bg-neutral-950 cursor-pointer group"
      >
        <video
          ref={videoRef}
          src={src}
          loop={isMuted}
          muted={isMuted}
          playsInline
          autoPlay
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onError={(e) => {
            console.warn('[VideoNotePlayer] Ошибка воспроизведения видео:', e);
          }}
          className="w-full h-full object-cover"
        />

        {/* Иконка паузы при остановке */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all">
            <div className="w-12 h-12 rounded-full bg-black/60 border border-white/20 flex items-center justify-center shadow-lg text-white">
              <Play className="w-6 h-6 ml-0.5 fill-white" />
            </div>
          </div>
        )}

        {/* Кнопка включения/выключения звука */}
        <button
          type="button"
          onClick={handleToggleMute}
          className="absolute bottom-3 right-3 p-1.5 rounded-full bg-black/65 hover:bg-black/85 text-white backdrop-blur-md transition-all active:scale-90 border border-white/15 shadow-md z-20"
          title={isMuted ? "Включить звук" : "Выключить звук"}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
        </button>
      </div>
    </div>
  );
});

/**
 * Компонент VideoNoteRecorder — предназначен ИСКЛЮЧИТЕЛЬНО для записи новых видео-кружков в модальном окне студии.
 * Запускает камеру ТОЛЬКО внутри окна записи и гарантированно освобождает все треки при выходе.
 */
export const VideoNoteRecorder: React.FC<Omit<VideoNoteProps, 'src'>> = React.memo(({
  onSave,
  isRecordingMode,
  triggerStop,
  onCancel,
  triggerStart,
  hideControls,
  onRecordingStateChange,
  triggerSwitchCamera,
  onStartHandled,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const videoDevicesRef = useRef<MediaDeviceInfo[]>([]);
  const currentDeviceIdRef = useRef<string | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isInitializingRef = useRef(false);
  const isSwitchingRef = useRef(false);
  const isUnmountingRef = useRef(false);

  const [isRecording, setIsRecording] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const facingModeRef = useRef<'user' | 'environment'>('user');
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Рефы для стабильных коллбеков без ретриггера useEffect
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  const onRecordingStateChangeRef = useRef(onRecordingStateChange);
  onRecordingStateChangeRef.current = onRecordingStateChange;

  const onStartHandledRef = useRef(onStartHandled);
  onStartHandledRef.current = onStartHandled;

  // Перечисление физических видеокамер устройства
  const refreshVideoDevices = useCallback(async (): Promise<MediaDeviceInfo[]> => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return [];
      const all = await navigator.mediaDevices.enumerateDevices();
      const vDevices = all.filter((d) => d.kind === 'videoinput');
      videoDevicesRef.current = vDevices;
      return vDevices;
    } catch {
      return [];
    }
  }, []);

  // Точный захват физического видеосенсора (deviceId -> exact facingMode -> ideal facingMode)
  const acquireVideoStream = useCallback(async (
    targetFacing: 'user' | 'environment',
    withAudio: boolean,
    excludeDeviceId?: string | null
  ): Promise<MediaStream> => {
    const devices = videoDevicesRef.current.length > 1
      ? videoDevicesRef.current
      : await refreshVideoDevices();

    let candidateDeviceId: string | null = null;
    if (devices.length > 0) {
      const matchedByLabel = devices.find((d) => {
        if (excludeDeviceId && d.deviceId === excludeDeviceId) return false;
        const lbl = (d.label || '').toLowerCase();
        if (targetFacing === 'user') {
          return lbl.includes('front') || lbl.includes('user') || lbl.includes('передн') || lbl.includes('селфи') || lbl.includes('facing front');
        }
        return lbl.includes('back') || lbl.includes('rear') || lbl.includes('environment') || lbl.includes('задн') || lbl.includes('основн') || lbl.includes('facing back');
      });

      if (matchedByLabel?.deviceId) {
        candidateDeviceId = matchedByLabel.deviceId;
      } else if (excludeDeviceId && devices.length > 1) {
        const alternate = devices.find((d) => d.deviceId && d.deviceId !== excludeDeviceId);
        if (alternate?.deviceId) {
          candidateDeviceId = alternate.deviceId;
        }
      } else if (devices.length > 1) {
        candidateDeviceId = targetFacing === 'user' ? devices[devices.length - 1].deviceId : devices[0].deviceId;
      }
    }

    // 1. Попытка по точному deviceId (гарантирует физическое переключение сенсора на Android Camera2 HAL)
    if (candidateDeviceId) {
      try {
        return await navigator.mediaDevices.getUserMedia({
          audio: withAudio,
          video: {
            deviceId: { exact: candidateDeviceId },
            width: { ideal: 480 },
            height: { ideal: 480 },
          },
        });
      } catch (eExactDev) {
        console.warn('[VideoNoteRecorder] Ошибка exact deviceId, пробуем мягкий deviceId:', eExactDev);
        try {
          return await navigator.mediaDevices.getUserMedia({
            audio: withAudio,
            video: {
              deviceId: candidateDeviceId,
              width: { ideal: 480 },
              height: { ideal: 480 },
            },
          });
        } catch (eSoftDev) {
          console.warn('[VideoNoteRecorder] Ошибка мягкого deviceId:', eSoftDev);
        }
      }
    }

    // 2. Попытка по exact facingMode
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: withAudio,
        video: {
          facingMode: { exact: targetFacing },
          width: { ideal: 480 },
          height: { ideal: 480 },
        },
      });
    } catch (eExactFacing) {
      console.warn('[VideoNoteRecorder] Ошибка exact facingMode, пробуем ideal facingMode:', eExactFacing);
    }

    // 3. Фоллбек на ideal facingMode
    return await navigator.mediaDevices.getUserMedia({
      audio: withAudio,
      video: {
        facingMode: { ideal: targetFacing },
        width: { ideal: 480 },
        height: { ideal: 480 },
      },
    });
  }, [refreshVideoDevices]);

  // Цикл отрисовки живого видеопотока на квадратный Canvas 480x480
  // Обеспечивает: (1) бесшовное переключение передней/задней камеры ПРЯМО ВО ВРЕМЯ ЗАПИСИ без обрыва MediaRecorder,
  // (2) зеркалирование только фронтальной камеры (user) и прямую ориентацию задней камеры (environment).
  const ensureCanvasLoop = useCallback(() => {
    if (!canvasRef.current && typeof document !== 'undefined') {
      const c = document.createElement('canvas');
      c.width = 480;
      c.height = 480;
      const initCtx = c.getContext('2d');
      if (initCtx) {
        initCtx.fillStyle = '#09090b';
        initCtx.fillRect(0, 0, 480, 480);
      }
      canvasRef.current = c;
    }
    if (rafRef.current !== null) return;

    const renderFrame = () => {
      if (isUnmountingRef.current) {
        rafRef.current = null;
        return;
      }
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          const side = Math.min(vw, vh);
          const sx = Math.floor((vw - side) / 2);
          const sy = Math.floor((vh - side) / 2);

          ctx.save();
          if (facingModeRef.current === 'user') {
            ctx.translate(480, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(video, sx, sy, side, side, 0, 0, 480, 480);
          ctx.restore();
        }
      }
      rafRef.current = requestAnimationFrame(renderFrame);
    };

    rafRef.current = requestAnimationFrame(renderFrame);
  }, []);

  // Инициализация камеры (вызывается при монтировании)
  const initCamera = useCallback(async (customFacingMode?: 'user' | 'environment'): Promise<MediaStream | null> => {
    if (isInitializingRef.current) return streamRef.current;
    isInitializingRef.current = true;
    const targetFacing = customFacingMode || facingModeRef.current;
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
            track.enabled = false;
          } catch {}
        });
        streamRef.current = null;
      }

      const stream = await acquireVideoStream(targetFacing, true, null);
      if (isUnmountingRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return null;
      }

      streamRef.current = stream;
      const vTrack = stream.getVideoTracks()[0];
      if (vTrack) {
        const settings = vTrack.getSettings ? vTrack.getSettings() : {};
        if (settings.deviceId) {
          currentDeviceIdRef.current = settings.deviceId;
        }
      }
      await refreshVideoDevices();
      ensureCanvasLoop();

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
        } catch (e) {
          console.warn('[VideoNoteRecorder] Предупреждение play():', e);
        }
      }
      return stream;
    } catch (err) {
      console.error('[VideoNoteRecorder] Ошибка getUserMedia:', err);
      if (onCancelRef.current) {
        onCancelRef.current();
      }
      return null;
    } finally {
      isInitializingRef.current = false;
    }
  }, [acquireVideoStream, ensureCanvasLoop, refreshVideoDevices]);

  // Очистка камеры и рекордера при размонтировании
  useEffect(() => {
    initCamera();
    return () => {
      isUnmountingRef.current = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getVideoTracks().forEach((t) => {
          try {
            t.stop();
          } catch {}
        });
        recordingStreamRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
            track.enabled = false;
          } catch (e) {}
        });
        streamRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }
    };
  }, [initCamera]);

  // Запуск записи
  const startRecording = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      return;
    }
    chunksRef.current = [];
    try {
      if (!streamRef.current || !streamRef.current.active) {
        await initCamera();
      }

      if (!streamRef.current) {
        console.error('[VideoNoteRecorder] Камера не готова к записи');
        return;
      }

      ensureCanvasLoop();

      const isIOS = typeof navigator !== 'undefined' && (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      );

      let mimeType = 'video/mp4';
      if (isIOS) {
        mimeType = (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E,mp4a.40.2'))
          ? 'video/mp4;codecs=avc1.42E01E,mp4a.40.2'
          : 'video/mp4';
      } else if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
        const preferredVideoTypes = [
          'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
          'video/mp4;codecs=avc1.4D401E,mp4a.40.2',
          'video/mp4;codecs=avc1,mp4a.40.2',
          'video/mp4;codecs=h264,aac',
          'video/mp4',
          'video/webm;codecs=h264,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm;codecs=vp9,opus',
          'video/webm',
        ];
        mimeType = preferredVideoTypes.find((t) => MediaRecorder.isTypeSupported(t)) || '';
      }

      // Формируем единый поток записи из Canvas (480x480) + микрофона,
      // чтобы физическое переключение камер во время записи не прерывало видеотрек рекордера
      let targetStream: MediaStream = streamRef.current;
      const canvas = canvasRef.current;
      if (canvas && typeof (canvas as any).captureStream === 'function') {
        try {
          const canvasStream: MediaStream = (canvas as any).captureStream(30);
          const canvasVideoTrack = canvasStream.getVideoTracks()[0];
          const audioTracks = streamRef.current.getAudioTracks();
          if (canvasVideoTrack) {
            targetStream = new MediaStream([canvasVideoTrack, ...audioTracks]);
            recordingStreamRef.current = targetStream;
          }
        } catch (capErr) {
          console.warn('[VideoNoteRecorder] Не удалось создать captureStream из canvas, пишем напрямую:', capErr);
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(targetStream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'video/mp4' });
        console.log('[VideoNoteRecorder] Запись завершена, размер блоба:', blob.size, 'mime:', blob.type);
        if (onSaveRef.current) {
          onSaveRef.current(blob);
        }
      };

      // ВНИМАНИЕ: На iOS/Safari и для MP4 контейнеров запись с timeslice ломает заголовок moov!
      if (isIOS || (mimeType && mimeType.includes('mp4'))) {
        recorder.start();
      } else {
        recorder.start(100);
      }
      setIsRecording(true);
      if (onRecordingStateChangeRef.current) {
        onRecordingStateChangeRef.current(true);
      }
    } catch (err) {
      console.error('[VideoNoteRecorder] Ошибка старта записи:', err);
      setIsRecording(false);
      if (onRecordingStateChangeRef.current) {
        onRecordingStateChangeRef.current(false);
      }
    }
  }, [ensureCanvasLoop, initCamera]);

  // Остановка записи
  const stopRecording = useCallback(() => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    } catch (err) {
      console.error('[VideoNoteRecorder] Ошибка остановки записи:', err);
    } finally {
      setIsRecording(false);
      if (onRecordingStateChangeRef.current) {
        onRecordingStateChangeRef.current(false);
      }
    }
  }, []);

  // Физическое переключение передней/задней камеры
  // КРИТИЧНО для Android Camera2 HAL: старый видеотрек ОБЯЗАН быть остановлен ДО вызова getUserMedia,
  // иначе WebView не может открыть второй физический сенсор и оставляет старую камеру!
  const switchCamera = useCallback(async () => {
    if (isSwitchingRef.current || isInitializingRef.current) return;
    isSwitchingRef.current = true;
    const prevFacing = facingModeRef.current;
    const nextFacing = prevFacing === 'user' ? 'environment' : 'user';
    const prevDeviceId = currentDeviceIdRef.current;

    try {
      // 1. Освобождаем текущий физический видеосенсор (оставляя микрофонный аудиотрек живым!)
      if (streamRef.current) {
        const oldVideoTracks = streamRef.current.getVideoTracks();
        oldVideoTracks.forEach((track) => {
          try {
            streamRef.current?.removeTrack(track);
            track.stop();
            track.enabled = false;
          } catch {}
        });
      }

      // Даем аппаратному драйверу камеры Android 40 мс на освобождение сенсора
      await new Promise((resolve) => setTimeout(resolve, 40));

      // 2. Запрашиваем противоположный физический сенсор по deviceId / facingMode
      const newVideoStream = await acquireVideoStream(nextFacing, false, prevDeviceId);
      const newVideoTrack = newVideoStream.getVideoTracks()[0];
      if (!newVideoTrack) {
        throw new Error('Не удалось получить новый видеотрек при переключении камеры');
      }

      const newSettings = newVideoTrack.getSettings ? newVideoTrack.getSettings() : {};
      if (newSettings.deviceId) {
        currentDeviceIdRef.current = newSettings.deviceId;
      }

      // 3. Обновляем режим зеркалирования синхронно с подключением новой физической камеры
      facingModeRef.current = nextFacing;
      setFacingMode(nextFacing);

      if (streamRef.current) {
        streamRef.current.addTrack(newVideoTrack);
      } else {
        streamRef.current = newVideoStream;
      }

      // Если запись шла напрямую из streamRef (без canvas captureStream) — обновляем трек
      if (!recordingStreamRef.current && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          const recStream = mediaRecorderRef.current.stream;
          if (recStream && recStream !== streamRef.current) {
            recStream.getVideoTracks().forEach((t) => recStream.removeTrack(t));
            recStream.addTrack(newVideoTrack);
          }
        } catch {}
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error('[VideoNoteRecorder] Ошибка переключения камеры, восстанавливаем предыдущий сенсор:', err);
      // Восстанавливаем предыдущую камеру при сбое, не меняя зеркалирование
      try {
        const recoveryStream = await acquireVideoStream(prevFacing, false, null);
        const recTrack = recoveryStream.getVideoTracks()[0];
        if (recTrack && streamRef.current) {
          streamRef.current.addTrack(recTrack);
          if (videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(() => {});
          }
        }
      } catch {}
    } finally {
      isSwitchingRef.current = false;
    }
  }, [acquireVideoStream]);

  // Автозапуск записи в режиме записи жестами
  useEffect(() => {
    if (isRecordingMode && !isRecording) {
      startRecording();
    }
  }, [isRecordingMode, isRecording, startRecording]);

  // Обработка внешнего триггера запуска записи
  const prevStartRef = useRef<number | boolean>(false);
  useEffect(() => {
    if (triggerStart && triggerStart !== prevStartRef.current) {
      prevStartRef.current = triggerStart;
      if (!isRecording) {
        startRecording();
      }
      if (onStartHandledRef.current) {
        onStartHandledRef.current();
      }
    }
  }, [triggerStart, isRecording, startRecording]);

  // Обработка внешнего триггера остановки записи
  const prevStopRef = useRef<number | boolean>(false);
  useEffect(() => {
    if (triggerStop && triggerStop !== prevStopRef.current) {
      prevStopRef.current = triggerStop;
      if (isRecording) {
        stopRecording();
      }
    }
  }, [triggerStop, isRecording, stopRecording]);

  // Обработка внешнего триггера смены камеры
  const prevSwitchRef = useRef<number | boolean>(false);
  useEffect(() => {
    if (triggerSwitchCamera && triggerSwitchCamera !== prevSwitchRef.current) {
      prevSwitchRef.current = triggerSwitchCamera;
      switchCamera();
    }
  }, [triggerSwitchCamera, switchCamera]);

  // Таймер длительности записи
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      setRecordingDuration(0);
      interval = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 60) {
            clearInterval(interval!);
            stopRecording();
            return 60;
          }
          return prev + 0.1;
        });
      }, 100);
    } else {
      setRecordingDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, stopRecording]);

  return (
    <div
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      className="relative flex flex-col items-center justify-center select-none"
    >
      {/* Круговой таймер записи снаружи маски */}
      {isRecording && (
        <svg className="absolute w-[216px] h-[216px] sm:w-[256px] sm:h-[256px] pointer-events-none z-10 -rotate-90" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)' }}>
          <circle
            cx="108"
            cy="108"
            r="104"
            className="sm:hidden"
            stroke="#10b981"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={2 * Math.PI * 104}
            strokeDashoffset={2 * Math.PI * 104 * (1 - recordingDuration / 60)}
            strokeLinecap="round"
          />
          <circle
            cx="128"
            cy="128"
            r="124"
            className="hidden sm:block"
            stroke="#10b981"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={2 * Math.PI * 124}
            strokeDashoffset={2 * Math.PI * 124 * (1 - recordingDuration / 60)}
            strokeLinecap="round"
          />
        </svg>
      )}

      {/* Круглая маска видоискателя камеры */}
      <div 
        onClick={() => {
          if (!isRecording) {
            startRecording();
          } else {
            stopRecording();
          }
        }}
        className="relative w-48 h-48 sm:w-60 sm:h-60 rounded-full overflow-hidden shadow-2xl aspect-square border-2 border-emerald-500/80 bg-neutral-950 cursor-pointer"
      >
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className={`w-full h-full object-cover pointer-events-none ${facingMode === 'user' ? 'transform -scale-x-100' : ''}`}
        />

        {/* Индикатор времени записи */}
        {isRecording && (
          <div className="absolute top-3 left-1/2 transform -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/90 text-white text-[11px] font-bold tracking-wider animate-pulse shadow-md z-20">
            <span className="w-2 h-2 bg-white rounded-full" />
            {Math.floor(recordingDuration)} сек
          </div>
        )}
      </div>

      {/* Внутренняя панель кнопок (если не скрыта) */}
      {!hideControls && (
        <div className="flex items-center gap-4 mt-5 w-full justify-center">
          {isRecording ? (
            <>
              <button
                type="button"
                onClick={switchCamera}
                className="p-3.5 rounded-full bg-neutral-800/90 hover:bg-neutral-700 text-white transition-all active:scale-95 border border-neutral-700/50 shadow-lg cursor-pointer"
                title="Переключить камеру"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={stopRecording}
                className="p-4 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all active:scale-95 shadow-lg shadow-red-600/30 cursor-pointer"
                title="Остановить запись"
              >
                <Square className="w-5 h-5 fill-current" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={switchCamera}
                className="p-3.5 rounded-full bg-neutral-800/90 hover:bg-neutral-700 text-white transition-all active:scale-95 border border-neutral-700/50 shadow-lg cursor-pointer"
                title="Переключить камеру"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={startRecording}
                className="p-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-all active:scale-95 shadow-lg shadow-emerald-500/30 cursor-pointer"
                title="Начать запись"
              >
                <Video className="w-6 h-6 fill-current" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
});

/**
 * Единый компонент VideoNote:
 * - Если передан src или отсутствует onSave -> рендерит VideoNotePlayer (воспроизведение кружка без вызова камеры).
 * - Если передан onSave -> рендерит VideoNoteRecorder (студию записи с живой камерой).
 */
export const VideoNote: React.FC<VideoNoteProps> = React.memo((props) => {
  if (props.onSave || props.isRecordingMode) {
    return <VideoNoteRecorder {...props} />;
  }
  return <VideoNotePlayer src={props.src} />;
});

export default VideoNote;
