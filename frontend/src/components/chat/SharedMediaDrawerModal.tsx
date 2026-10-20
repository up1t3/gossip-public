// frontend/src/components/chat/SharedMediaDrawerModal.tsx
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Image as ImageIcon, 
  FileText, 
  Mic, 
  Link as LinkIcon, 
  Bell, 
  BellOff, 
  Download, 
  Play, 
  ExternalLink,
  Users
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { DecryptedImage, DecryptedVideo } from '../app/appHelpers';

export interface SharedMessageItem {
  id: string;
  sender: string;
  senderName: string;
  text: string;
  time: string;
  timestamp?: number;
  type?: 'text' | 'sticker' | 'voice' | 'video_note' | 'photo' | 'video' | 'call' | 'poll' | 'ton_transfer' | string;
  mediaUrl?: string;
  mediaKey?: string;
  mediaIv?: string;
}

export interface SharedMediaDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatName: string;
  chatAvatar?: string;
  isGroup?: boolean;
  online?: boolean;
  messages: SharedMessageItem[];
  onOpenMedia: (item: SharedMessageItem) => void;
  onJumpToMessage: (id: string) => void;
  onToggleMute?: () => void;
  isMuted?: boolean;
  theme?: 'dark' | 'light' | 'coffee';
}

type TabType = 'media' | 'files' | 'voice' | 'links';

/**
 * Shared Media & Chat Info Drawer (Telegram-Style)
 * - Профиль чата / группы: Аватар, Название, Статус, Быстрые действия (Поиск, Звук, Очистка)
 * - 4 Вкладки общих материалов:
 *   1. Медиа: Сетка фотографий и видеозаписей
 *   2. Файлы: Список прикрепленных документов
 *   3. Голосовые: Список аудиозаписей и войсов
 *   4. Ссылки: Извлеченные URL-адреса из сообщений
 */
export const SharedMediaDrawerModal: React.FC<SharedMediaDrawerModalProps> = ({
  isOpen,
  onClose,
  chatName,
  chatAvatar,
  isGroup = false,
  online = false,
  messages,
  onOpenMedia,
  onJumpToMessage,
  onToggleMute,
  isMuted = false,
  theme = 'dark',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('media');

  // Извлечение медиа (фото / видео / кружки)
  const mediaItems = useMemo(() => {
    return messages.filter(
      (m) => m.type === 'photo' || m.type === 'video' || m.type === 'video_note'
    );
  }, [messages]);

  // Извлечение документов и файлов
  const fileItems = useMemo(() => {
    return messages.filter(
      (m) => (m.mediaUrl && !m.type) || (m.text && (m.text.includes('.pdf') || m.text.includes('.zip') || m.text.includes('.doc') || m.text.includes('.apk')))
    );
  }, [messages]);

  // Извлечение голосовых сообщений
  const voiceItems = useMemo(() => {
    return messages.filter((m) => m.type === 'voice');
  }, [messages]);

  // Извлечение ссылок (URL regex)
  const linkItems = useMemo(() => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const links: { id: string; url: string; time: string; senderName: string; text: string }[] = [];
    messages.forEach((m) => {
      if (m.text) {
        const matches = m.text.match(urlRegex);
        if (matches) {
          matches.forEach((url) => {
            links.push({
              id: m.id,
              url,
              time: m.time,
              senderName: m.senderName,
              text: m.text,
            });
          });
        }
      }
    });
    return links;
  }, [messages]);

  if (!isOpen) return null;

  const isLight = theme === 'light';
  const isCoffee = theme === 'coffee';

  const bgClass = isLight
    ? 'bg-white/95 text-slate-900 border-slate-200'
    : isCoffee
      ? 'bg-[#1C140E]/95 text-[#EFE7D8] border-[#3E2723]'
      : 'bg-neutral-950/95 text-white border-white/10';

  const tabActiveBg = isLight
    ? 'bg-blue-600 text-white'
    : isCoffee
      ? 'bg-[#D5CEA3] text-[#1C140E]'
      : 'bg-purple-600 text-white';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm select-none">
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className={`w-full max-w-md h-full flex flex-col border-l shadow-2xl overflow-hidden ${bgClass}`}
        >
          {/* Шапка шторки */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h3 className="text-sm font-bold tracking-wide">Информация о чате</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Инфо профиля */}
          <div className="p-6 flex flex-col items-center border-b border-white/5 bg-white/2">
            <div className="relative mb-3">
              <Avatar
                avatarUrl={chatAvatar}
                name={chatName}
                isGroup={isGroup}
                online={online}
                size="lg"
              />
            </div>
            <h2 className="text-lg font-bold text-center leading-tight truncate max-w-[280px]">
              {chatName}
            </h2>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              {isGroup ? (
                <>
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span>Групповой чат (MLS E2EE)</span>
                </>
              ) : online ? (
                <>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-emerald-400 font-medium">в сети</span>
                </>
              ) : (
                <span>был(а) недавно</span>
              )}
            </p>

            {/* Панель быстрых действий */}
            <div className="flex items-center gap-4 mt-5">
              {onToggleMute && (
                <button
                  onClick={onToggleMute}
                  className="flex flex-col items-center gap-1 text-slate-300 hover:text-purple-400 transition-colors"
                >
                  <div className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center">
                    {isMuted ? <BellOff className="w-4 h-4 text-red-400" /> : <Bell className="w-4 h-4" />}
                  </div>
                  <span className="text-[10px] font-medium">{isMuted ? 'Вкл. звук' : 'Без звука'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Переключатель вкладок общих материалов */}
          <div className="flex items-center border-b border-white/5 px-4 py-2 bg-black/20 gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('media')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'media' ? tabActiveBg : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Медиа ({mediaItems.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('files')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'files' ? tabActiveBg : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Файлы ({fileItems.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('voice')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'voice' ? tabActiveBg : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Голос ({voiceItems.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('links')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'links' ? tabActiveBg : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Ссылки ({linkItems.length})</span>
            </button>
          </div>

          {/* Содержимое активной вкладки */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'media' && (
              mediaItems.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {mediaItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onOpenMedia(item)}
                      className="relative aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/5 cursor-pointer group hover:scale-[1.03] transition-all shadow-md"
                    >
                      {item.type === 'photo' ? (
                        <DecryptedImage
                          mediaUrl={item.mediaUrl || ''}
                          mediaKey={item.mediaKey}
                          mediaIv={item.mediaIv}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <DecryptedVideo
                          mediaUrl={item.mediaUrl || ''}
                          mediaKey={item.mediaKey}
                          mediaIv={item.mediaIv}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5 text-[9px] text-white">
                        <span>{item.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-40 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                  <ImageIcon className="w-8 h-8 opacity-40" />
                  <span>Нет общих фото и видео</span>
                </div>
              )
            )}

            {activeTab === 'files' && (
              fileItems.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {fileItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onJumpToMessage(item.id)}
                      className="p-3 rounded-2xl bg-white/2 hover:bg-white/5 border border-white/5 flex items-center justify-between gap-3 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate text-slate-200">{item.text || 'Документ'}</p>
                          <span className="text-[10px] text-slate-400">{item.time} • {item.senderName}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.mediaUrl) {
                            window.open(item.mediaUrl, '_blank');
                          }
                        }}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-40 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                  <FileText className="w-8 h-8 opacity-40" />
                  <span>Нет прикрепленных файлов</span>
                </div>
              )
            )}

            {activeTab === 'voice' && (
              voiceItems.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {voiceItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onJumpToMessage(item.id)}
                      className="p-3 rounded-2xl bg-white/2 hover:bg-white/5 border border-white/5 flex items-center justify-between gap-3 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                          <Mic className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate text-slate-200">
                            {item.text && item.text !== '🎤 Голосовое сообщение' ? item.text : 'Голосовое сообщение'}
                          </p>
                          <span className="text-[10px] text-slate-400">{item.time} • {item.senderName}</span>
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-white/5 text-purple-400">
                        <Play className="w-4 h-4 fill-current" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-40 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                  <Mic className="w-8 h-8 opacity-40" />
                  <span>Нет голосовых сообщений</span>
                </div>
              )
            )}

            {activeTab === 'links' && (
              linkItems.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {linkItems.map((item, idx) => (
                    <div
                      key={`${item.id}-${idx}`}
                      onClick={() => onJumpToMessage(item.id)}
                      className="p-3 rounded-2xl bg-white/2 hover:bg-white/5 border border-white/5 flex items-center justify-between gap-3 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
                          <LinkIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-semibold text-blue-400 hover:underline truncate block"
                          >
                            {item.url}
                          </a>
                          <span className="text-[10px] text-slate-400">{item.time} • {item.senderName}</span>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-40 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                  <LinkIcon className="w-8 h-8 opacity-40" />
                  <span>Нет ссылок в сообщениях</span>
                </div>
              )
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
