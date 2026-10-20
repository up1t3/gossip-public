// frontend/src/components/chat/PinnedMessageBanner.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, X, Crown, ChevronRight } from 'lucide-react';

export interface PinnedMessageData {
  id: string;
  senderName: string;
  text: string;
  type?: 'text' | 'sticker' | 'voice' | 'video_note' | 'photo' | 'video' | 'call' | 'poll' | 'ton_transfer' | string;
}

export interface PinnedMessageBannerProps {
  pinnedMessage: PinnedMessageData | null;
  totalPinnedCount?: number;
  currentIndex?: number;
  onJumpToMessage: (id: string) => void;
  onUnpinMessage?: (id: string) => void;
  onNextPinned?: () => void;
  isPremium?: boolean;
  theme?: 'dark' | 'light' | 'coffee';
}

/**
 * Pinned Message Banner (Telegram-Style)
 * - Закрепленное сообщение под шапкой чата
 * - Клик переносит к сообщению в виртуализированной ленте
 * - Поддержка переключения между несколькими закрепленными сообщениями (Gossip Premium)
 * - Кнопка быстрого открепления
 */
export const PinnedMessageBanner: React.FC<PinnedMessageBannerProps> = ({
  pinnedMessage,
  totalPinnedCount = 1,
  currentIndex = 0,
  onJumpToMessage,
  onUnpinMessage,
  onNextPinned,
  isPremium = false,
  theme = 'dark',
}) => {
  if (!pinnedMessage) return null;

  const getPreviewText = () => {
    if (pinnedMessage.type === 'photo') return '📷 Фотография';
    if (pinnedMessage.type === 'video') return '🎥 Видеозапись';
    if (pinnedMessage.type === 'voice') return '🎤 Голосовое сообщение';
    if (pinnedMessage.type === 'video_note') return '⭕ Видео-сообщение';
    if (pinnedMessage.type === 'sticker') return '🎨 Стикер';
    return pinnedMessage.text;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="w-full flex-shrink-0 z-10 overflow-hidden border-b border-white/5 bg-purple-950/20 backdrop-blur-xl"
      >
        <div className="px-4 py-2 flex items-center justify-between gap-3">
          {/* Кликабельная область для перехода к сообщению */}
          <div
            onClick={() => onJumpToMessage(pinnedMessage.id)}
            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
          >
            <div className="w-1.5 h-8 bg-purple-500 rounded-full flex-shrink-0 group-hover:bg-purple-400 transition-colors" />
            
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-1.5">
                <Pin className="w-3 h-3 text-purple-400 fill-purple-400" />
                <span className="text-[11px] font-bold text-purple-300 truncate">
                  Закрепленное сообщение {totalPinnedCount > 1 ? `#${currentIndex + 1}` : ''}
                </span>
                {isPremium && totalPinnedCount > 1 && (
                  <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded font-semibold">
                    <Crown className="w-2.5 h-2.5" /> PRO ({totalPinnedCount})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-200 truncate leading-snug font-sans group-hover:text-white transition-colors">
                <span className="font-medium text-slate-400">{pinnedMessage.senderName}: </span>
                {getPreviewText()}
              </p>
            </div>
          </div>

          {/* Кнопка следующего закрепа (если их несколько) и кнопка открепления */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {totalPinnedCount > 1 && onNextPinned && (
              <button
                onClick={onNextPinned}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Следующее закрепленное сообщение"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {onUnpinMessage && (
              <button
                onClick={() => onUnpinMessage(pinnedMessage.id)}
                className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                title="Открепить сообщение"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
