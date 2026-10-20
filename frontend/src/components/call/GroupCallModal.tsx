import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  ScreenShare,
  ScreenShareOff,
  LayoutGrid,
  Maximize2,
  Users,
  ShieldAlert,
  Volume2
} from 'lucide-react';

export interface GroupCallParticipant {
  feedId: number;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  stream?: MediaStream;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
}

export interface GroupCallModalProps {
  isOpen: boolean;
  chatId: string;
  callTitle: string;
  participants?: GroupCallParticipant[];
  localStream?: MediaStream | null;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isScreenSharing?: boolean;
  onToggleMute?: () => void;
  onToggleCamera?: () => void;
  onToggleScreenShare?: () => void;
  onEndCall?: () => void;
  onClose: () => void;
}

export const GroupCallModal: React.FC<GroupCallModalProps> = ({
  isOpen,
  chatId,
  callTitle,
  participants: externalParticipants,
  localStream: externalLocalStream,
  isMuted: externalIsMuted,
  isCameraOff: externalIsCameraOff,
  isScreenSharing: externalIsScreenSharing,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onEndCall,
  onClose,
}) => {
  // Внутренние состояния (fallback для автономной работы и тестирования)
  const [layoutMode, setLayoutMode] = useState<'grid' | 'speaker'>('grid');
  const [internalIsMuted, setInternalIsMuted] = useState(false);
  const [internalIsCameraOff, setInternalIsCameraOff] = useState(false);
  const [internalIsScreenSharing, setInternalIsScreenSharing] = useState(false);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);

  const screenTrackRef = useRef<MediaStreamTrack | null>(null);

  const isMuted = externalIsMuted !== undefined ? externalIsMuted : internalIsMuted;
  const isCameraOff = externalIsCameraOff !== undefined ? externalIsCameraOff : internalIsCameraOff;
  const isScreenSharing = externalIsScreenSharing !== undefined ? externalIsScreenSharing : internalIsScreenSharing;

  // Если внешние участники не переданы, формируем дефолтного локального участника
  const participants = useMemo<GroupCallParticipant[]>(() => {
    if (externalParticipants && externalParticipants.length > 0) {
      return externalParticipants;
    }
    return [
      {
        feedId: 1,
        userId: 'me',
        displayName: 'Вы (Организатор)',
        isMuted: isMuted,
        isVideoOff: isCameraOff,
        isSpeaking: false,
        isScreenSharing: isScreenSharing,
        stream: localScreenStream || externalLocalStream || undefined,
      },
    ];
  }, [externalParticipants, isMuted, isCameraOff, isScreenSharing, localScreenStream, externalLocalStream]);

  // Очистка потоков экрана при размонтировании
  useEffect(() => {
    return () => {
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  // Определение активного спикера или того, кто демонстрирует экран (для режима Докладчика)
  const activePresenter = useMemo(() => {
    const sharer = participants.find((p) => p.isScreenSharing);
    if (sharer) return sharer;
    const speaker = participants.find((p) => p.isSpeaking);
    if (speaker) return speaker;
    return participants[0];
  }, [participants]);

  // Обработчик микрофона
  const handleToggleMute = () => {
    if (onToggleMute) {
      onToggleMute();
    } else {
      setInternalIsMuted((prev) => !prev);
    }
  };

  // Обработчик камеры
  const handleToggleCamera = () => {
    if (onToggleCamera) {
      onToggleCamera();
    } else {
      setInternalIsCameraOff((prev) => !prev);
    }
  };

  // Обработчик демонстрации экрана
  const handleToggleScreenShare = async () => {
    if (onToggleScreenShare) {
      onToggleScreenShare();
      return;
    }

    if (internalIsScreenSharing) {
      // Остановка экрана
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }
      setLocalScreenStream(null);
      setInternalIsScreenSharing(false);
    } else {
      // Запуск демонстрации экрана
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: 15 },
            audio: false,
          });

          const track = stream.getVideoTracks()[0];
          if (track) {
            screenTrackRef.current = track;
            // Автоматическое завершение шаринга при остановке через браузерный UI
            track.onended = () => {
              screenTrackRef.current = null;
              setLocalScreenStream(null);
              setInternalIsScreenSharing(false);
            };
          }

          setLocalScreenStream(stream);
          setInternalIsScreenSharing(true);
        } else {
          setInternalIsScreenSharing(true);
        }
      } catch (err) {
        // Zero-Toast Rule: ошибки обрабатываются молча или во внутреннем статусе
        console.warn('[GroupCallModal] Ошибка запуска Screen Share:', err);
      }
    }
  };

  // Завершение звонка
  const handleEndCall = () => {
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
    if (onEndCall) {
      onEndCall();
    }
    onClose();
  };

  // Вычисление адаптивной CSS-сетки для 1..16 участников
  const getGridClasses = (count: number) => {
    if (count <= 1) return 'grid-cols-1 max-w-2xl';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2 max-w-4xl';
    if (count <= 4) return 'grid-cols-2 max-w-4xl';
    if (count <= 6) return 'grid-cols-2 md:grid-cols-3 max-w-5xl';
    if (count <= 9) return 'grid-cols-3 max-w-6xl';
    return 'grid-cols-3 md:grid-cols-4 max-w-7xl';
  };

  return (
    <div
      data-testid="group-call-modal"
      className="fixed inset-0 z-[9999] flex flex-col justify-between p-4 md:p-6 bg-neutral-950/95 backdrop-blur-2xl text-white select-none overflow-hidden animate-in fade-in duration-200"
    >
      {/* Фоновый градиент Obsidian Glassmorphism */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/30 via-neutral-950 to-black pointer-events-none -z-10" />

      {/* Верхняя панель */}
      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-3 bg-neutral-900/60 border border-white/10 rounded-2xl backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold truncate leading-tight">{callTitle}</h2>
            <span className="text-xs text-neutral-400">
              Участников: {participants.length} / 16
            </span>
          </div>
        </div>

        {/* Обязательный бейдж безопасности SFU (Non-E2EE Invariant §15.1, §20 Q6) */}
        <div
          data-testid="group-call-security-badge"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium"
        >
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>🛡️ Групповой звонок SFU (сквозное шифрование не применяется)</span>
        </div>

        {/* Переключатель режимов Grid / Speaker */}
        <div className="flex items-center gap-1.5">
          <button
            data-testid="group-call-layout-btn"
            onClick={() => setLayoutMode(layoutMode === 'grid' ? 'speaker' : 'grid')}
            title={layoutMode === 'grid' ? 'Режим докладчика' : 'Режим сетки'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-neutral-300 transition"
          >
            {layoutMode === 'grid' ? (
              <>
                <Maximize2 className="w-4 h-4" />
                <span className="hidden sm:inline">Докладчик</span>
              </>
            ) : (
              <>
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Сетка</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Основная рабочая область: Видеопотоки участников */}
      <div className="flex-1 flex items-center justify-center w-full my-4 overflow-y-auto custom-scrollbar">
        {layoutMode === 'grid' ? (
          /* Grid Mode (Сетка) */
          <div
            data-testid="group-call-grid"
            className={`grid gap-3 md:gap-4 w-full h-full max-h-[75vh] items-center justify-center ${getGridClasses(
              participants.length
            )}`}
          >
            {participants.map((p) => {
              const hasVideo = p.stream && !p.isVideoOff;
              return (
                <div
                  key={p.feedId || p.userId}
                  data-testid={`group-call-participant-${p.userId}`}
                  className={`relative aspect-video w-full rounded-2xl md:rounded-3xl overflow-hidden bg-neutral-900/80 border transition-all duration-300 flex items-center justify-center ${
                    p.isSpeaking
                      ? 'ring-2 ring-emerald-400 border-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.35)]'
                      : 'border-white/10 shadow-lg'
                  }`}
                >
                  {/* Видеопоток */}
                  {hasVideo ? (
                    <video
                      autoPlay
                      playsInline
                      muted={p.userId === 'me'}
                      ref={(el) => {
                        if (el && p.stream && el.srcObject !== p.stream) {
                          try {
                            el.srcObject = p.stream;
                          } catch (_err) {
                            // Игнорируем исключения установки srcObject в DOM-моках / нестандартных средах
                          }
                        }
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    /* Аватар-заглушка */
                    <div className="flex flex-col items-center justify-center p-4 text-center">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-2xl font-bold border-2 border-white/15 shadow-inner">
                        {p.avatarUrl ? (
                          <img
                            src={p.avatarUrl}
                            alt={p.displayName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          p.displayName.charAt(0).toUpperCase()
                        )}
                      </div>
                    </div>
                  )}

                  {/* Плашка с именем и статусом говорящего */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      {p.isSpeaking && (
                        <span
                          data-testid={`group-call-active-speaker-${p.userId}`}
                          className="flex items-center gap-0.5 text-emerald-400"
                        >
                          <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                        </span>
                      )}
                      <span className="truncate font-medium text-white">
                        {p.displayName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {p.isScreenSharing && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-medium border border-blue-500/30">
                          Экран
                        </span>
                      )}
                      {p.isMuted && (
                        <span className="p-1 rounded-md bg-red-500/20 text-red-400">
                          <MicOff className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Speaker Mode (Режим Докладчика) */
          <div className="flex flex-col w-full h-full max-w-5xl gap-3">
            {/* Фокус на спикере / демонстрации экрана */}
            <div
              data-testid={`group-call-speaker-focus-${activePresenter?.userId}`}
              className={`relative flex-1 w-full rounded-3xl overflow-hidden bg-neutral-900/90 border flex items-center justify-center ${
                activePresenter?.isSpeaking
                  ? 'ring-2 ring-emerald-400 border-emerald-400/80 shadow-[0_0_25px_rgba(52,211,153,0.4)]'
                  : 'border-white/10'
              }`}
            >
              {activePresenter?.stream && !activePresenter.isVideoOff ? (
                <video
                  autoPlay
                  playsInline
                  muted={activePresenter.userId === 'me'}
                  ref={(el) => {
                    if (el && activePresenter.stream && el.srcObject !== activePresenter.stream) {
                      try {
                        el.srcObject = activePresenter.stream;
                      } catch (_err) {
                        // Игнорируем исключения установки srcObject в DOM-моках / нестандартных средах
                      }
                    }
                  }}
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-3xl font-bold border-2 border-white/20 shadow-2xl mb-3">
                    {activePresenter?.displayName.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <h3 className="text-lg font-semibold">{activePresenter?.displayName}</h3>
                </div>
              )}

              {/* Бейдж докладчика */}
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-xs font-medium">
                {activePresenter?.isScreenSharing ? (
                  <span className="text-blue-400 flex items-center gap-1.5">
                    <ScreenShare className="w-4 h-4" />
                    Демонстрация экрана: {activePresenter.displayName}
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 animate-pulse" />
                    Говорит: {activePresenter?.displayName}
                  </span>
                )}
              </div>
            </div>

            {/* Горизонтальная лента остальных участников */}
            <div className="flex items-center gap-2.5 overflow-x-auto py-2 custom-scrollbar">
              {participants.map((p) => (
                <div
                  key={p.feedId || p.userId}
                  data-testid={`group-call-participant-${p.userId}`}
                  className={`relative w-36 h-24 rounded-2xl flex-shrink-0 bg-neutral-900 border overflow-hidden flex items-center justify-center ${
                    p.isSpeaking
                      ? 'ring-2 ring-emerald-400 border-emerald-400/80'
                      : 'border-white/10'
                  }`}
                >
                  <div className="text-sm font-semibold truncate px-2 text-center text-neutral-300">
                    {p.displayName}
                  </div>
                  <div className="absolute bottom-1 right-1 flex items-center gap-1">
                    {p.isMuted && <MicOff className="w-3 h-3 text-red-400" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Нижняя панель управления вызовом: Obsidian Glassmorphism */}
      <div className="w-full max-w-md mx-auto flex items-center justify-evenly p-3.5 rounded-3xl bg-neutral-900/80 border border-white/10 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] z-20">
        {/* Микрофон */}
        <button
          data-testid="group-call-mute-btn"
          onClick={handleToggleMute}
          aria-label={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
          className={`p-3.5 rounded-2xl transition-all duration-200 active:scale-95 ${
            isMuted
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-white/5 hover:bg-white/10 text-white border border-white/5'
          }`}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Камера */}
        <button
          data-testid="group-call-camera-btn"
          onClick={handleToggleCamera}
          aria-label={isCameraOff ? 'Включить камеру' : 'Выключить камеру'}
          className={`p-3.5 rounded-2xl transition-all duration-200 active:scale-95 ${
            isCameraOff
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-white/5 hover:bg-white/10 text-white border border-white/5'
          }`}
        >
          {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        {/* Демонстрация экрана */}
        <button
          data-testid="group-call-screenshare-btn"
          onClick={handleToggleScreenShare}
          aria-label={isScreenSharing ? 'Остановить показ экрана' : 'Поделиться экраном'}
          className={`p-3.5 rounded-2xl transition-all duration-200 active:scale-95 ${
            isScreenSharing
              ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50 shadow-md shadow-blue-500/20'
              : 'bg-white/5 hover:bg-white/10 text-white border border-white/5'
          }`}
        >
          {isScreenSharing ? (
            <ScreenShareOff className="w-5 h-5" />
          ) : (
            <ScreenShare className="w-5 h-5" />
          )}
        </button>

        {/* Завершить вызов */}
        <button
          data-testid="group-call-hangup-btn"
          onClick={handleEndCall}
          aria-label="Завершить вызов"
          className="p-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white border border-red-500/30 transition-all duration-200 shadow-lg shadow-red-600/40 hover:scale-105 active:scale-95"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
