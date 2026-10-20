// frontend/src/components/audio/AudioWaveform.tsx
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, FastForward } from 'lucide-react';
import { globalMediaManager } from '../../core/media/globalMediaManager';

interface AudioWaveformProps {
  audioUrl: string;
  peaks?: number[]; // Предопределенная огибающая (массив амплитуд от 0 до 1)
  barGap?: number;
  color?: string;
  progressColor?: string;
  theme?: 'dark' | 'light' | 'coffee';
}

/**
 * Высокопроизводительный компонент AudioWaveform:
 * - Отрисовка реальной амплитудной огибающей на HTML5 <canvas>
 * - 60 FPS плавный цикл анимации (requestAnimationFrame) без дерганий и зависаний
 * - Моментальная интерактивная перемотка (Scrubbing / Seeking) по клику и тачу
 * - Сохранение тональности голоса при ускорении (1.0x / 1.5x / 2.0x Pitch Correction)
 * - Полная адаптация под темы (Obsidian Dark / Light / Coffee)
 */
export const AudioWaveform: React.FC<AudioWaveformProps> = React.memo(({
  audioUrl,
  peaks,
  barGap = 2.5,
  color,
  progressColor,
  theme = 'dark',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dimensionsRef = useRef<{ width: number; height: number; left: number; dpr: number }>({
    width: 0,
    height: 0,
    left: 0,
    dpr: 1
  });
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Подписка на глобальный менеджер медиа
  useEffect(() => {
    if (!audioUrl) return;
    const unsubscribe = globalMediaManager.subscribe((activeId) => {
      if (activeId !== audioUrl && isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [audioUrl, isPlaying]);

  // Тематические цвета
  const themeColors = useMemo(() => {
    if (theme === 'light') {
      return {
        container: 'bg-white/95 border-black/10 text-slate-900 shadow-sm',
        playBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25',
        speedBtn: 'bg-black/5 text-blue-600 border border-black/10 hover:bg-black/10',
        timerText: 'text-slate-500',
        inactiveBar: color || 'rgba(0, 0, 0, 0.18)',
        activeBar: progressColor || '#2563eb', // blue-600
      };
    } else if (theme === 'coffee') {
      return {
        container: 'bg-[#1A120B]/95 border-[#D5CEA3]/25 text-[#E5E5CB] shadow-glass-md',
        playBtn: 'bg-[#D5CEA3] hover:bg-[#E5E5CB] text-[#1A120B] shadow-md shadow-[#D5CEA3]/20',
        speedBtn: 'bg-[#D5CEA3]/15 text-[#D5CEA3] border border-[#D5CEA3]/30 hover:bg-[#D5CEA3]/25',
        timerText: 'text-[#9C927A]',
        inactiveBar: color || 'rgba(213, 206, 163, 0.22)',
        activeBar: progressColor || '#D5CEA3', // luxury gold
      };
    } else {
      // Obsidian Dark (по умолчанию)
      return {
        container: 'bg-[#0F1017]/95 border-white/10 text-slate-100 shadow-glass-md',
        playBtn: 'bg-gradient-to-tr from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white shadow-md shadow-purple-500/25',
        speedBtn: 'bg-white/10 text-purple-300 border border-purple-500/20 hover:bg-white/15',
        timerText: 'text-slate-400',
        inactiveBar: color || 'rgba(255, 255, 255, 0.22)',
        activeBar: progressColor || '#c084fc', // purple-400
      };
    }
  }, [theme, color, progressColor]);

  // Генерация детерминированной огибающей, если peaks не переданы
  useEffect(() => {
    if (peaks && peaks.length > 0) {
      // Нормализуем пики от 0.08 до 1.0
      const normalized = peaks.map((p) => Math.max(0.08, Math.min(1.0, p)));
      setWaveformPeaks(normalized);
    } else {
      // Fallback: детерминированная гармоническая огибающая
      const generated = [];
      const len = 42;
      for (let i = 0; i < len; i++) {
        const factor = Math.sin((i / len) * Math.PI);
        const noise = (Math.sin(i * 1.7) + 1) * 0.2;
        generated.push(Math.max(0.1, Math.min(1.0, factor * 0.7 + noise)));
      }
      setWaveformPeaks(generated);
    }
  }, [peaks]);

  // 60 FPS плавный цикл обновления воспроизведения
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying && !isScrubbing) {
      const tick = () => {
        if (audio && !audio.paused && !audio.ended) {
          setCurrentTime(audio.currentTime);
          animationFrameRef.current = requestAnimationFrame(tick);
        }
      };
      animationFrameRef.current = requestAnimationFrame(tick);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, isScrubbing]);

  // Синхронизация состояния аудио элемента
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => {
      setIsPlaying(false);
      globalMediaManager.releasePlay(audioUrl);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (audio) audio.currentTime = 0;
      globalMediaManager.releasePlay(audioUrl);
    };
    const onDurationChange = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
      globalMediaManager.releasePlay(audioUrl);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [audioUrl]);

  // ResizeObserver для точных размеров Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateDimensions = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const left = rect.left;
      const dpr = window.devicePixelRatio || 1;
      
      dimensionsRef.current = { width, height, left, dpr };
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(canvas);
    updateDimensions();

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Отрисовка огибающей на canvas с ультраплавным прогрессом
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformPeaks.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensionsRef.current;
    if (width === 0 || height === 0) return;

    ctx.clearRect(0, 0, width, height);

    const totalBars = waveformPeaks.length;
    const totalGaps = (totalBars - 1) * barGap;
    const calculatedBarWidth = Math.max(1.5, (width - totalGaps) / totalBars);
    
    // Текущий прогресс от 0 до 1
    const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
    const currentProgressX = progress * width;

    waveformPeaks.forEach((peak, i) => {
      const x = i * (calculatedBarWidth + barGap);
      const barHeight = Math.max(4, peak * height * 0.85);
      const y = (height - barHeight) / 2;

      const barCenterX = x + calculatedBarWidth / 2;
      const isPlayed = barCenterX <= currentProgressX;

      ctx.fillStyle = isPlayed ? themeColors.activeBar : themeColors.inactiveBar;

      ctx.beginPath();
      const radius = Math.min(barHeight / 2, calculatedBarWidth / 2);
      if (ctx.roundRect) {
        ctx.roundRect(x, y, calculatedBarWidth, barHeight, radius);
      } else {
        ctx.rect(x, y, calculatedBarWidth, barHeight);
      }
      ctx.fill();
    });
  }, [waveformPeaks, currentTime, duration, barGap, themeColors]);

  // Управление воспроизведением
  const togglePlay = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    // Разблокировка AudioContext и отмена беззвучного режима на iOS при клике
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = (window as any).__gossipGlobalAudioCtx || new AudioContextClass();
        (window as any).__gossipGlobalAudioCtx = ctx;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      }
    } catch {}

    if (isPlaying) {
      audio.pause();
      globalMediaManager.releasePlay(audioUrl);
    } else {
      globalMediaManager.requestPlay(audioUrl, 'voice', {
        pause: () => {
          const a = audioRef.current;
          if (a) {
            a.pause();
            setIsPlaying(false);
          }
        }
      });
      audio.play().catch((err) => console.error('[AudioWaveform] Play error:', err));
    }
  }, [isPlaying, audioUrl]);

  // Переключение скорости воспроизведения (Pitch Correction)
  const changeSpeed = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    let nextRate = 1.0;
    if (playbackRate === 1.0) nextRate = 1.5;
    else if (playbackRate === 1.5) nextRate = 2.0;
    else nextRate = 1.0;

    audio.preservesPitch = true;
    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  }, [playbackRate]);

  // Обработка клика и тача для перемотки (Scrubbing / Seeking)
  const performScrub = useCallback((clientX: number) => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio || duration === 0) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    if (width === 0) return;

    const clickX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / width));
    const targetTime = percentage * duration;

    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  }, [duration]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    setIsScrubbing(true);
    performScrub(e.clientX);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isScrubbing) {
      e.stopPropagation();
      performScrub(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isScrubbing) {
      e.stopPropagation();
      setIsScrubbing(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Форматирование времени в формат MM:SS
  const formatTime = (time: number) => {
    if (isNaN(time) || time < 0) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl max-w-sm sm:max-w-md backdrop-blur-xl border transition-all ${themeColors.container}`}
    >
      {/* Скрытый аудио тег */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" playsInline />

      {/* Кнопка воспроизведения/паузы */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 flex items-center justify-center rounded-full active:scale-95 transition-transform cursor-pointer ${themeColors.playBtn}`}
        title={isPlaying ? 'Пауза' : 'Воспроизвести'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
        ) : (
          <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
        )}
      </button>

      {/* Canvas для интерактивной огибающей */}
      <div className="flex-1 h-10 sm:h-11 relative cursor-pointer select-none flex items-center">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-full block touch-none"
        />
      </div>

      {/* Контрол скорости и таймер */}
      <div className="flex flex-col items-end gap-0.5 min-w-[44px] flex-shrink-0 select-none">
        <button
          type="button"
          onClick={changeSpeed}
          className={`flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-md active:scale-95 transition-transform cursor-pointer ${themeColors.speedBtn}`}
          title="Скорость воспроизведения"
        >
          <FastForward className="w-2.5 h-2.5" />
          <span>{playbackRate.toFixed(1)}x</span>
        </button>
        <span className={`text-[10px] sm:text-xs font-mono ${themeColors.timerText}`}>
          {isPlaying || currentTime > 0 ? formatTime(currentTime) : (duration > 0 ? formatTime(duration) : '0:00')}
        </span>
      </div>
    </div>
  );
});

export default AudioWaveform;
