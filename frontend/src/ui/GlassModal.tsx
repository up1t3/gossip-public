import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { GlassCard } from './GlassCard';

export interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  zIndexClass?: string;
  fullScreenMobile?: boolean;
}

export const GlassModal: React.FC<GlassModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  zIndexClass = 'z-50',
  fullScreenMobile,
}) => {
  const isFullMobile = fullScreenMobile ?? size === 'lg';
  // Закрытие при нажатии Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={`fixed inset-0 ${zIndexClass} flex ${
            isFullMobile
              ? 'items-stretch sm:items-center justify-center p-0 sm:p-4 overflow-hidden sm:overflow-y-auto'
              : 'items-center justify-center p-2.5 sm:p-4 pt-safe pb-kb overflow-y-auto'
          }`}
        >
          {/* Бэкдроп оверлей с эффектом размытия */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Модальное окно */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ type: 'spring', duration: 0.35 }}
            className={`relative w-full z-10 ${
              isFullMobile
                ? `h-full sm:h-auto flex flex-col max-w-none sm:${sizeClasses[size]}`
                : sizeClasses[size]
            }`}
          >
            <GlassCard
              glow
              className={`w-full flex flex-col overflow-hidden ${
                isFullMobile
                  ? 'h-full sm:h-auto rounded-none sm:rounded-2xl border-0 sm:border'
                  : 'max-h-[90dvh] rounded-2xl'
              }`}
            >
              {/* Заголовок */}
              <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-glass-border pt-safe shrink-0">
                <h3 className="text-base sm:text-lg font-semibold text-slate-100 truncate min-w-0">
                  {title || 'Диалоговое окно'}
                </h3>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-glass-bg-hover transition-colors flex-shrink-0 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Содержимое */}
              <div
                className={`px-3.5 sm:px-6 py-3.5 sm:py-4 overflow-y-auto overflow-x-hidden text-slate-300 ${
                  isFullMobile ? 'flex-1 min-h-0 sm:max-h-[75dvh]' : 'max-h-[74dvh] sm:max-h-[70dvh]'
                }`}
              >
                {children}
              </div>

              {/* Футер */}
              {footer ? (
                <div className="flex justify-end gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-glass-border bg-glass-bg pb-safe shrink-0">
                  {footer}
                </div>
              ) : (
                <div className="pb-safe shrink-0" />
              )}
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
