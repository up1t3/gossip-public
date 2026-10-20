import React, { useState, useRef, TouchEvent } from 'react';
import { X } from 'lucide-react';

interface SwipeablePhotoViewerProps {
  src: string;
  onClose: () => void;
}

/**
 * Компонент полноэкранного просмотра фотографий с поддержкой жестов:
 * 1. Pinch-to-zoom (масштабирование двумя пальцами от 1x до 4x).
 * 2. Панорамирование (перетаскивание) картинки при приближении.
 * 3. Swipe-to-close влево (закрытие свайпом влево, работает только при масштабе 1x).
 * 4. Двойной тап для быстрого переключения масштаба (1x <-> 2x).
 */
export const SwipeablePhotoViewer: React.FC<SwipeablePhotoViewerProps> = ({ src, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  // Ссылки для панорамирования и жеста закрытия
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Ссылки для Pinch-to-zoom
  const initialDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);

  // Вычисление расстояния между двумя точками касания
  const getDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      // Одиночное касание - для панорамирования или свайпа закрытия
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      
      if (scale > 1) {
        isDraggingRef.current = true;
        dragStartRef.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
      }
    } else if (e.touches.length === 2) {
      // Мультитач - запуск Pinch-to-zoom
      isDraggingRef.current = false;
      const dist = getDistance(e.touches);
      initialDistanceRef.current = dist;
      initialScaleRef.current = scale;
    }
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1 && isDraggingRef.current && scale > 1) {
      // Перетаскивание приближенной картинки
      const touch = e.touches[0];
      const newX = touch.clientX - dragStartRef.current.x;
      const newY = touch.clientY - dragStartRef.current.y;
      
      // Динамическое ограничение перетаскивания в зависимости от масштаба
      const maxDragX = (scale - 1) * 200;
      const maxDragY = (scale - 1) * 200;
      
      setPosition({
        x: Math.max(-maxDragX, Math.min(maxDragX, newX)),
        y: Math.max(-maxDragY, Math.min(maxDragY, newY))
      });
    } else if (e.touches.length === 2 && initialDistanceRef.current !== null) {
      // Масштабирование двумя пальцами (Pinch)
      const dist = getDistance(e.touches);
      const factor = dist / initialDistanceRef.current;
      const newScale = Math.max(1, Math.min(4, initialScaleRef.current * factor));
      setScale(newScale);
      
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
    }
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    initialDistanceRef.current = null;

    if (e.touches.length === 0 && touchStartRef.current) {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const dt = Date.now() - touchStartRef.current.time;

      // Жест закрытия свайпом влево (только при масштабе 1x)
      if (scale === 1) {
        // Свайп влево: смещение влево более 80px, вертикальный сдвиг незначительный, время < 300мс
        if (dx < -80 && Math.abs(dy) < 60 && dt < 300) {
          onClose();
        }
      }
      touchStartRef.current = null;
    }
  };

  // Двойной клик/тап для быстрого зума
  const handleDoubleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 touch-none select-none"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="relative max-w-4xl max-h-[85vh] flex items-center justify-center transition-transform duration-100 ease-out"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
        }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={handleDoubleTap}
      >
        <img 
          ref={imgRef}
          src={src} 
          alt="Просмотр фотографии" 
          className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/10" 
          draggable="false"
        />
      </div>
      
      {/* Кнопка закрытия */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full text-slate-300 transition-colors shadow-md cursor-pointer z-50"
      >
        <X className="w-5 h-5" />
      </button>
      
      {/* Панель подсказок по жестам */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 bg-white/5 border border-white/5 px-4 py-1.5 rounded-full backdrop-blur-md pointer-events-none tracking-wide shadow-glass-sm">
        👈 Свайп влево — закрыть • 🔍 Зум пальцами • ⚡ Двойной тап — 2x
      </div>
    </div>
  );
};
