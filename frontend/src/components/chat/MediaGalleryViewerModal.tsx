// frontend/src/components/chat/MediaGalleryViewerModal.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  ZoomIn, 
  RotateCw, 
  Film
} from 'lucide-react';
import { useDecryptedMedia } from '../../hooks/useDecryptedMedia';
import { DecryptedImage } from '../app/appHelpers';

export interface MediaGalleryItem {
  id: string;
  type: 'photo' | 'video' | 'video_note';
  url: string;
  senderName: string;
  time: string;
  text?: string;
  mediaKey?: string;
  mediaIv?: string;
}

export interface MediaGalleryViewerModalProps {
  isOpen: boolean;
  items: MediaGalleryItem[];
  initialIndex?: number;
  onClose: () => void;
  theme?: 'dark' | 'light' | 'coffee';
}

/**
 * Telegram-Style Media Gallery Viewer Modal
 * - Полноэкранный просмотр медиафайлов чата (Фото, Видео, Видео-кружки)
 * - Навигация стрелками на десктопе и свайпами влево/вправо на мобильных
 * - Счетчик позиции ("3 из 14"), дата отправки и имя автора
 * - Pinch-to-zoom и панорамирование
 * - Кнопка сохранения/скачивания файла на устройство
 * - Лента миниатюр (Thumbnails) внизу для быстрого перехода
 */
export const MediaGalleryViewerModal: React.FC<MediaGalleryViewerModalProps> = ({
  isOpen,
  items,
  initialIndex = 0,
  onClose,
  theme: _theme = 'dark',
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Touch gesture refs
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(items.length - 1, initialIndex)));
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
    }
  }, [isOpen, initialIndex, items.length]);

  const currentItem = items[currentIndex];
  const { url: decryptedCurrentUrl, loading: isDecryptingCurrent } = useDecryptedMedia(
    isOpen && currentItem ? currentItem.url : null,
    currentItem?.mediaKey,
    currentItem?.mediaIv,
    currentItem?.type || 'photo'
  );

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
    }
  }, [currentIndex, items.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

  // Download media
  const handleDownload = async () => {
    if (!currentItem) return;
    const downloadUrl = decryptedCurrentUrl || currentItem.url;
    if (!downloadUrl) return;
    try {
      const a = document.createElement('a');
      a.href = downloadUrl;
      const ext = currentItem.type === 'video' || currentItem.type === 'video_note' ? 'mp4' : 'jpg';
      a.download = `gossip_${currentItem.id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('[MediaGallery] Ошибка скачивания файла:', err);
    }
  };

  // Touch swipe handling
  const getDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
      if (scale > 1) {
        setIsDragging(true);
        setDragStart({
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y,
        });
      }
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      pinchStartDistanceRef.current = getDistance(e.touches);
      pinchStartScaleRef.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging && scale > 1) {
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      const maxDrag = (scale - 1) * 250;
      setPosition({
        x: Math.max(-maxDrag, Math.min(maxDrag, newX)),
        y: Math.max(-maxDrag, Math.min(maxDrag, newY)),
      });
    } else if (e.touches.length === 2 && pinchStartDistanceRef.current !== null) {
      const dist = getDistance(e.touches);
      const factor = dist / pinchStartDistanceRef.current;
      const newScale = Math.max(1, Math.min(4, pinchStartScaleRef.current * factor));
      setScale(newScale);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsDragging(false);
    pinchStartDistanceRef.current = null;

    if (e.touches.length === 0 && touchStartRef.current) {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const dt = Date.now() - touchStartRef.current.time;

      if (scale === 1 && dt < 400) {
        // Горизонтальный свайп для перехода между медиа
        if (dx < -60 && Math.abs(dy) < 70) {
          handleNext();
        } else if (dx > 60 && Math.abs(dy) < 70) {
          handlePrev();
        } 
        // Вертикальный свайп вниз для закрытия
        else if (dy > 100 && Math.abs(dx) < 60) {
          onClose();
        }
      }
      touchStartRef.current = null;
    }
  };

  if (!isOpen || items.length === 0 || !currentItem) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-2xl text-white select-none overflow-hidden"
      >
        {/* Верхняя панель управления с учетом Dynamic Island / Notch */}
        <div className="w-full flex items-center justify-between px-4 sm:px-6 py-3.5 pt-[calc(0.875rem+env(safe-area-inset-top,0px))] bg-gradient-to-b from-black/80 to-transparent z-20">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">{currentItem.senderName}</span>
              <span className="text-xs text-slate-400 font-mono">
                {currentIndex + 1} из {items.length}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">{currentItem.time}</span>
          </div>

          {/* Кнопки действий */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScale((s) => (s >= 3 ? 1 : s + 0.5))}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 hover:text-white transition-all"
              title="Масштаб"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 hover:text-white transition-all"
              title="Повернуть"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 hover:text-white transition-all"
              title="Скачать файл"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-red-500/30 text-slate-300 hover:text-red-400 active:scale-95 transition-all ml-1"
              title="Закрыть (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Главная область просмотра */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex-1 relative flex items-center justify-center overflow-hidden p-2 sm:p-6"
        >
          {/* Стрелка "Назад" */}
          {currentIndex > 0 && (
            <button
              onClick={handlePrev}
              className="hidden sm:flex absolute left-4 z-20 p-3 rounded-2xl bg-black/60 hover:bg-purple-600/40 border border-white/10 text-white backdrop-blur-md transition-all active:scale-90 hover:scale-105"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Отображение медиаконтента */}
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transition: isDragging ? 'none' : 'transform 0.12s ease-out',
            }}
            className="max-w-full max-h-full flex items-center justify-center"
          >
            {isDecryptingCurrent && !decryptedCurrentUrl ? (
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 text-sm text-slate-300 flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <span>Расшифровка медиафайла...</span>
              </div>
            ) : currentItem.type === 'photo' ? (
              <img
                src={decryptedCurrentUrl || currentItem.url}
                alt="Просмотр фото"
                className="max-h-[75vh] sm:max-h-[82vh] max-w-full object-contain rounded-xl shadow-2xl pointer-events-auto"
                draggable={false}
              />
            ) : currentItem.type === 'video' ? (
              <video
                src={decryptedCurrentUrl || currentItem.url}
                controls
                autoPlay
                playsInline
                webkit-playsinline="true"
                className="max-h-[75vh] sm:max-h-[82vh] max-w-full rounded-xl shadow-2xl"
              />
            ) : (
              <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full overflow-hidden border-4 border-purple-500/40 shadow-2xl">
                <video
                  src={decryptedCurrentUrl || currentItem.url}
                  controls
                  autoPlay
                  loop
                  playsInline
                  webkit-playsinline="true"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Стрелка "Вперед" */}
          {currentIndex < items.length - 1 && (
            <button
              onClick={handleNext}
              className="hidden sm:flex absolute right-4 z-20 p-3 rounded-2xl bg-black/60 hover:bg-purple-600/40 border border-white/10 text-white backdrop-blur-md transition-all active:scale-90 hover:scale-105"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Описание сообщения (если есть) */}
        {currentItem.text && currentItem.text !== '📷 Фотография' && currentItem.text !== '🎥 Видеозапись' && (
          <div className="px-6 py-2 bg-black/40 text-center text-sm text-slate-200 backdrop-blur-md truncate max-w-2xl mx-auto rounded-xl mb-2">
            {currentItem.text}
          </div>
        )}

        {/* Нижняя полоса миниатюр с учетом Home Indicator */}
        {items.length > 1 && (
          <div className="w-full px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] bg-gradient-to-t from-black/90 to-transparent flex items-center justify-center gap-2 overflow-x-auto z-20">
            {items.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentIndex(idx);
                  setScale(1);
                  setPosition({ x: 0, y: 0 });
                  setRotation(0);
                }}
                className={`relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all cursor-pointer ${
                  idx === currentIndex
                    ? 'border-purple-500 scale-110 shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                    : 'border-white/10 opacity-50 hover:opacity-100'
                }`}
              >
                {item.type === 'photo' ? (
                  <DecryptedImage
                    mediaUrl={item.url}
                    mediaKey={item.mediaKey}
                    mediaIv={item.mediaIv}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                    <Film className="w-5 h-5 text-purple-400" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
