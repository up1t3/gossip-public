import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Avatar } from './Avatar';

export interface InAppNotification {
  id: string;
  chatId: string;
  senderName: string;
  avatarUrl?: string | null;
  text: string;
  time?: string;
  isGroup?: boolean;
}

interface InAppNotificationBannerProps {
  notification: InAppNotification | null;
  onClose: () => void;
  onOpenChat: (chatId: string) => void;
}

export const InAppNotificationBanner: React.FC<InAppNotificationBannerProps> = ({
  notification,
  onClose,
  onOpenChat,
}) => {
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [notification, onClose]);

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          drag="y"
          dragConstraints={{ top: -100, bottom: 0 }}
          onDragEnd={(_, info) => {
            if (info.offset.y < -20) {
              onClose();
            }
          }}
          className="fixed top-2 left-3 right-3 md:left-auto md:right-4 md:w-96 z-[110] pointer-events-auto cursor-pointer"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          onClick={() => {
            onOpenChat(notification.chatId);
            onClose();
          }}
        >
          <div className="bg-neutral-900/90 hover:bg-neutral-900/95 border border-white/10 backdrop-blur-2xl rounded-2xl p-3.5 shadow-2xl flex items-center gap-3 transition-colors group">
            {/* Аватар отправителя */}
            <Avatar
              name={notification.senderName}
              avatarUrl={notification.avatarUrl}
              isGroup={notification.isGroup}
              size="md"
              className="flex-shrink-0 border border-white/10 shadow-md"
            />

            {/* Контент уведомления */}
            <div className="flex-grow min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-xs font-bold text-slate-100 truncate">
                  {notification.senderName}
                </span>
                <span className="text-[10px] text-slate-400 flex-shrink-0">
                  {notification.time || 'сейчас'}
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate leading-snug">
                {notification.text || 'Новое сообщение'}
              </p>
            </div>

            {/* Кнопка быстрого закрытия */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-xl transition-colors flex-shrink-0"
              title="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InAppNotificationBanner;
