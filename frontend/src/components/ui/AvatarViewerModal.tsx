// frontend/src/components/ui/AvatarViewerModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit3, User, Users } from 'lucide-react';
import { getBackendUrl } from '../../utils/url';

export interface AvatarViewerModalProps {
  isOpen: boolean;
  avatarUrl?: string | null;
  name: string;
  subtitle?: string;
  isGroup?: boolean;
  isEditable?: boolean;
  onClose: () => void;
  onEdit?: () => void;
}

/**
 * Telegram-Style Fullscreen Avatar Viewer
 * - Полноэкранный просмотр аватара собеседника, группы или собственного профиля
 * - Плавное открытие с эффектом масштабирования и backdrop blur
 * - Жесты масштабирования (Pinch-to-zoom 1x-4x, двойной клик)
 * - Свайп вниз для быстрого закрытия
 * - Кнопка редактирования текущего аватара (если доступно редактирование)
 */
export const AvatarViewerModal: React.FC<AvatarViewerModalProps> = ({
  isOpen,
  avatarUrl,
  name,
  subtitle,
  isGroup = false,
  isEditable = false,
  onClose,
  onEdit,
}) => {
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const initialPinchDistRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);

  // Сброс масштаба при открытии
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [isOpen]);

  const fullAvatarSrc = avatarUrl ? getBackendUrl(avatarUrl) : null;

  // Расчет расстояния для Pinch-zoom
  const getDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Сенсорные жесты
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };

      if (scale > 1) {
        setIsDragging(true);
        dragStartRef.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
      }
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      initialPinchDistRef.current = getDistance(e.touches);
      initialScaleRef.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (scale > 1 && isDragging) {
        const newX = touch.clientX - dragStartRef.current.x;
        const newY = touch.clientY - dragStartRef.current.y;
        const maxDrag = (scale - 1) * 250;
        setPosition({
          x: Math.max(-maxDrag, Math.min(maxDrag, newX)),
          y: Math.max(-maxDrag, Math.min(maxDrag, newY)),
        });
      } else if (scale === 1 && touchStartRef.current) {
        // Свайп вниз для закрытия
        const dy = touch.clientY - touchStartRef.current.y;
        if (dy > 0) {
          setPosition({ x: 0, y: dy });
        }
      }
    } else if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      const dist = getDistance(e.touches);
      const factor = dist / initialPinchDistRef.current;
      const newScale = Math.max(1, Math.min(4, initialScaleRef.current * factor));
      setScale(newScale);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsDragging(false);
    initialPinchDistRef.current = null;

    if (e.touches.length === 0 && touchStartRef.current) {
      if (scale === 1) {
        // Если был свайп вниз более 120px — закрываем
        if (position.y > 120) {
          onClose();
        } else {
          setPosition({ x: 0, y: 0 });
        }
      }
    }
  };

  // Двойной клик для зума
  const handleDoubleClick = () => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xl select-none animate-fade-in">
        {/* Верхняя панель управления с учетом Dynamic Island / Notch */}
        <div className="w-full flex items-center justify-between px-4 sm:px-6 py-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] z-20 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex flex-col min-w-0 flex-1 pr-4">
            <h2 className="text-white text-base sm:text-lg font-semibold truncate leading-tight">
              {name}
            </h2>
            {subtitle && (
              <p className="text-xs text-slate-400 truncate mt-0.5">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isEditable && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 flex items-center gap-1.5 px-3.5 text-xs font-medium border border-white/10"
                title="Редактировать аватар"
              >
                <Edit3 className="w-4 h-4" />
                <span className="hidden sm:inline">Изменить</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all active:scale-95"
              title="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Центральная интерактивная область просмотра */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleClick}
          className="flex-grow flex items-center justify-center p-4 relative overflow-hidden touch-none"
        >
          {fullAvatarSrc ? (
            <motion.div
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              }}
              className="max-w-[90vw] max-h-[75vh] flex items-center justify-center"
            >
              <img
                src={fullAvatarSrc}
                alt={name}
                draggable={false}
                className="rounded-3xl shadow-2xl object-contain max-h-[75vh] max-w-[90vw] border border-white/10 select-none"
              />
            </motion.div>
          ) : (
            <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-gradient-to-tr from-purple-600/30 to-blue-600/30 border border-white/10 flex flex-col items-center justify-center shadow-2xl text-slate-300">
              {isGroup ? (
                <Users className="w-24 h-24 text-purple-400 mb-2" />
              ) : (
                <User className="w-24 h-24 text-blue-400 mb-2" />
              )}
              <span className="text-xl font-bold tracking-wider">{name.slice(0, 2).toUpperCase()}</span>
            </div>
          )}
        </div>

        {/* Подвал с подсказкой и учетом Home Indicator */}
        <div className="w-full py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] text-center text-[11px] text-slate-500 z-10">
          Свайп вниз для закрытия • Двойной тап для приближения
        </div>
      </div>
    </AnimatePresence>
  );
};
