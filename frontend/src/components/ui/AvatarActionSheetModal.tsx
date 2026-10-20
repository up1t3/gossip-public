// frontend/src/components/ui/AvatarActionSheetModal.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Edit2, ImagePlus, Trash2, X } from 'lucide-react';

export interface AvatarActionSheetModalProps {
  isOpen: boolean;
  avatarUrl?: string | null;
  title?: string;
  onClose: () => void;
  onView: () => void;
  onEditCurrent: () => void;
  onChooseNew: () => void;
  onDelete?: () => void;
  theme?: 'dark' | 'light' | 'coffee';
}

/**
 * Telegram-Style Меню действий с аватаркой
 * Предоставляет выбор:
 * 1. 🔍 Просмотреть фото
 * 2. ✏️ Редактировать текущее (Zoom / Pan / Rotate)
 * 3. 🖼️ Выбрать новое фото из галереи
 * 4. 🗑️ Удалить фото
 */
export const AvatarActionSheetModal: React.FC<AvatarActionSheetModalProps> = ({
  isOpen,
  avatarUrl,
  title = 'Фотография',
  onClose,
  onView,
  onEditCurrent,
  onChooseNew,
  onDelete,
  theme = 'dark',
}) => {
  if (!isOpen) return null;

  const isLight = theme === 'light';
  const isCoffee = theme === 'coffee';

  const modalBgClass = isLight
    ? 'bg-white/95 border-slate-200 text-slate-900'
    : isCoffee
      ? 'bg-[#1C140E]/95 border-[#D5CEA3]/25 text-[#E5E5CB]'
      : 'bg-slate-900/95 border-white/10 text-slate-100';

  const hasAvatar = Boolean(avatarUrl && avatarUrl !== '👥' && avatarUrl !== '');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
        {/* Затемнение для закрытия по клику вне окна */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 border shadow-2xl backdrop-blur-xl z-10 flex flex-col gap-3 ${modalBgClass}`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <h3 className="text-sm font-semibold tracking-wide text-slate-200">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5 pt-1">
            {/* 1. Просмотреть фото */}
            {hasAvatar && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onView();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-left transition-all active:scale-[0.98]"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-200">Просмотреть фото</span>
                  <span className="text-[11px] text-slate-400">Открыть на весь экран</span>
                </div>
              </button>
            )}

            {/* 2. Редактировать текущее фото */}
            {hasAvatar && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setTimeout(() => {
                    onEditCurrent();
                  }, 50);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-left transition-all active:scale-[0.98]"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-200">Редактировать текущее</span>
                  <span className="text-[11px] text-slate-400">Кадрирование, масштаб и поворот</span>
                </div>
              </button>
            )}

            {/* 3. Выбрать новое фото из галереи */}
            <button
              type="button"
              onClick={() => {
                onClose();
                setTimeout(() => {
                  onChooseNew();
                }, 50);
              }}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-left transition-all active:scale-[0.98]"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ImagePlus className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-200">Выбрать из галереи</span>
                <span className="text-[11px] text-slate-400">Загрузить новое изображение</span>
              </div>
            </button>

            {/* 4. Удалить фото */}
            {hasAvatar && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-left transition-all active:scale-[0.98] border border-red-500/20"
              >
                <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-red-300">Удалить фото</span>
                  <span className="text-[11px] text-red-400/80">Вернуть стандартный аватар</span>
                </div>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
