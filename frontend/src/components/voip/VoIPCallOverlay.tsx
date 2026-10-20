// E:\Boltalka\frontend\src\components\voip\VoIPCallOverlay.tsx
import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, PhoneOff, User } from 'lucide-react';
import { useWebRTCCall } from '../../core/voip/useWebRTCCall';
import { voipAudio } from '../../core/voip/voipAudio';

interface VoIPCallOverlayProps {
  isOpen: boolean;
  callId: string;
  callerName: string;
  callerAvatar?: string;
  isOutgoing?: boolean;
  chatId?: string;
  mediaType?: 'audio' | 'video';
  onClose: () => void;
}

/**
 * React-компонент VoIPCallOverlay с Obsidian Black Glassmorphism стилизацией
 * и анимациями Framer Motion.
 */
export const VoIPCallOverlay: React.FC<VoIPCallOverlayProps> = ({
  isOpen,
  callId,
  callerName,
  callerAvatar,
  isOutgoing = false,
  chatId,
  mediaType = 'video',
  onClose
}) => {
  const {
    localStream,
    remoteStream,
    callStatus,
    isMuted,
    isCameraOff,
    startCall,
    endCall,
    toggleMute,
    toggleCamera
  } = useWebRTCCall();

  console.log(`[VoIPCallOverlay LOG] Rendered: isOpen=${isOpen}, callStatus=${callStatus}, hasRemoteStream=${!!remoteStream}, callId=${callId}`);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Запуск вызова при монтировании оверлея
  useEffect(() => {
    if (isOpen && callId && callId.trim()) {
      console.log(`[VoIPCallOverlay] Запуск WebRTC звонка: callId=${callId}, isOutgoing=${isOutgoing}, chatId=${chatId}, mediaType=${mediaType}`);
      startCall(callId, isOutgoing, chatId, callerName, mediaType);
    }
    return () => {
      endCall();
      try {
        voipAudio.stopRingback();
        voipAudio.stopRingtone();
      } catch (e) {}
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
    };
  }, [isOpen, callId]);

  // Функция обратного вызова для безопасной привязки удаленного видеопотока
  const remoteVideoCallback = (node: HTMLVideoElement | null) => {
    if (node) {
      remoteVideoRef.current = node;
      if (remoteStream && node.srcObject !== remoteStream) {
        node.srcObject = remoteStream;
      }
    } else {
      remoteVideoRef.current = null;
    }
  };

  // Функция обратного вызова для безопасной привязки удаленного аудиопотока
  const remoteAudioCallback = (node: HTMLAudioElement | null) => {
    if (node) {
      remoteAudioRef.current = node;
      if (remoteStream && node.srcObject !== remoteStream) {
        node.srcObject = remoteStream;
      }
    } else {
      remoteAudioRef.current = null;
    }
  };

  // Синхронизация потоков при обновлении состояния
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream && remoteVideoRef.current.srcObject !== remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream && remoteAudioRef.current.srcObject !== remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Функция обратного вызова для безопасной привязки локального видеопотока
  const localVideoCallback = (node: HTMLVideoElement | null) => {
    if (node) {
      localVideoRef.current = node;
      if (localStream && node.srcObject !== localStream) {
        node.srcObject = localStream;
      }
    } else {
      localVideoRef.current = null;
    }
  };

  useEffect(() => {
    if (localVideoRef.current && localStream && localVideoRef.current.srcObject !== localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Закрытие при завершении вызова
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (callStatus === 'ended') {
      timer = setTimeout(() => {
        onClose();
      }, 1000);
    } else if (callStatus === 'failed') {
      timer = setTimeout(() => {
        onClose();
      }, 4000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [callStatus, onClose]);

  /**
   * Возвращает текстовое описание статуса вызова на русском языке.
   */
  const getStatusText = () => {
    switch (callStatus) {
      case 'idle':
        return 'Инициализация...';
      case 'connecting':
        return 'Подключение к звонку...';
      case 'active':
        return 'В сети';
      case 'disconnected':
        return 'Соединение потеряно, переподключение...';
      case 'failed':
        return 'Ошибка вызова';
      case 'ended':
        return 'Звонок завершен';
      default:
        return '';
    }
  };

  return (
    <motion.div
      key="voip-call-overlay-content"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 bg-black/80 backdrop-blur-2xl text-white select-none"
    >
      {/* Фон: Obsidian Black Glassmorphism Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black opacity-90 -z-10" />

      {/* Верхняя панель со статусом */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-md flex flex-col items-center mt-8 bg-neutral-950/40 border border-white/5 rounded-2xl p-4 backdrop-blur-md shadow-lg"
      >
        <span className="text-xs uppercase tracking-widest text-neutral-400">SFU-звонок</span>
        <h2 className="text-xl font-semibold mt-1">{callerName}</h2>
        <p className="text-sm mt-1 text-emerald-400 font-medium animate-pulse">
          {getStatusText()}
        </p>
      </motion.div>

      {/* Скрытый тег для гарантированного воспроизведения удаленного звука */}
      <audio
        ref={remoteAudioCallback}
        autoPlay
        playsInline
        className="hidden"
      />

      {/* Средняя часть: Видеопотоки или Аватары */}
      <div className="relative w-full max-w-lg aspect-[3/4] md:aspect-video flex items-center justify-center rounded-3xl overflow-hidden bg-neutral-950/60 border border-white/5 shadow-2xl my-6">
        
        {/* Удаленное видео или Аватар */}
        {remoteStream && remoteStream.getVideoTracks().length > 0 && remoteStream.getVideoTracks().some(t => t.enabled) ? (
          <video
            key="remote-video"
            data-testid="remote-video"
            ref={remoteVideoCallback}
            autoPlay
            playsInline
            // Звук воспроизводится через скрытый <audio>: без muted видео дублирует его (эхо)
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          // Заглушка аватара при голосовом звонке или выключенной камере
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center"
          >
            <div className="w-32 h-32 rounded-full bg-neutral-900 border-2 border-neutral-700/50 flex items-center justify-center shadow-inner mb-4 overflow-hidden relative group">
              {callerAvatar ? (
                <img src={callerAvatar} alt={callerName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-16 h-16 text-neutral-500" />
              )}
              {/* Пульсирующие кольца вокруг аватара */}
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping pointer-events-none" />
            </div>
          </motion.div>
        )}

        {/* Локальное видео (Маленькое окно в углу) */}
        {localStream && !isCameraOff && (
          <motion.div
            key="local-video-container"
            data-testid="local-video-container"
            drag
            dragConstraints={{ top: 10, left: 10, right: 300, bottom: 400 }}
            className="absolute bottom-4 right-4 w-28 h-40 md:w-36 md:h-24 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-neutral-900 cursor-grab active:cursor-grabbing"
          >
            <video
              ref={localVideoCallback}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover transform -scale-x-100"
            />
          </motion.div>
        )}
      </div>

      {/* Панель управления звонком: Obsidian Black Glassmorphism */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="w-full max-w-sm mb-8 flex items-center justify-evenly p-4 rounded-3xl bg-neutral-950/70 border border-white/10 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]"
      >
        {/* Кнопка микрофона */}
        <button
          data-testid="call-mute-btn"
          onClick={toggleMute}
          className={`p-4 rounded-2xl transition-all duration-300 ${
            isMuted
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-white/5 hover:bg-white/10 text-white border border-white/5'
          }`}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {/* Кнопка завершения вызова */}
        <button
          data-testid="call-hangup-btn"
          onClick={() => {
            endCall();
            try {
              voipAudio.stopRingback();
              voipAudio.stopRingtone();
            } catch (e) {}
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
            if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
            if (localVideoRef.current) localVideoRef.current.srcObject = null;
            onClose();
          }}
          className="p-5 rounded-full bg-red-600 hover:bg-red-700 text-white border border-red-500/20 transition-all duration-300 shadow-lg shadow-red-600/30 hover:scale-105"
        >
          <PhoneOff className="w-7 h-7" />
        </button>

        {/* Кнопка камеры */}
        <button
          data-testid="call-camera-btn"
          onClick={toggleCamera}
          className={`p-4 rounded-2xl transition-all duration-300 ${
            isCameraOff
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-white/5 hover:bg-white/10 text-white border border-white/5'
          }`}
        >
          {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
        </button>
      </motion.div>
    </motion.div>
  );
};
