import React from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Check, CheckCheck, Clock, Reply, AlertCircle } from 'lucide-react';
import { AudioWaveform } from '../../components/audio/AudioWaveform';
import { VideoNote } from '../../components/video/VideoNote';
import { useDecryptedMedia } from '../../hooks/useDecryptedMedia';
import 'katex/dist/katex.min.css';
import { PollData } from '../../components/chat/PollMessage';
import { InlineKeyboardMarkup } from '../../features/bots/types';


export const isAndroidApp = typeof window !== 'undefined' && (window as any).Capacitor !== undefined && (window as any).Capacitor.getPlatform() === 'android';

/**
 * Семантическое сравнение версий: true если `server` строго новее `installed`.
 * Корректно для многозначных сегментов ("1.3.10" > "1.3.9", в отличие от
 * строкового сравнения). Используется для решения, показывать ли диалог
 * обновления APK.
 */
export function _isNewerVersion(server: string, installed: string): boolean {
  if (!server || !installed) return false;
  const clean = (v: string) => v.trim().replace(/^v/i, '').split('-')[0].split('+')[0];
  const s = clean(server).split('.').map((n) => parseInt(n, 10) || 0);
  const i = clean(installed).split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(s.length, i.length);
  for (let k = 0; k < len; k++) {
    const sv = s[k] || 0;
    const iv = i[k] || 0;
    if (sv > iv) return true;
    if (sv < iv) return false;
  }
  return false; // равны или новее
}

export const isTestEnv = (): boolean => {
  if (typeof window === 'undefined') return true;
  if ((window as any).VITEST_WORKER_ID !== undefined) return true;
  if (typeof (globalThis as any).vi !== 'undefined' || typeof (globalThis as any).vitest !== 'undefined') return true;
  if (/node|jsdom|happy-dom/i.test(window.navigator?.userAgent || '')) return true;
  const proc = (window as any).process || (globalThis as any).process;
  if (proc?.env?.NODE_ENV === 'test') return true;
  return false;
};

// Интерфейсы данных
export interface Message {
  id: string;
  sender: 'me' | 'other' | string;
  senderName: string;
  text: string;
  time: string;
  pts?: number;
  type?: 'text' | 'sticker' | 'voice' | 'video_note' | 'photo' | 'video' | 'call' | 'poll' | 'ton_transfer' | 'location' | 'contact' | 'document' | string;
  poll?: PollData;
  poll_data?: string | PollData;
  mediaUrl?: string;
  peaks?: number[];
  timestamp?: number;
  reaction?: string;
  replyToMessageId?: string;
  forwardFromUser?: string;
  // R3 (M3.1): TTL
  ttl_seconds?: number;
  expires_at?: number;
  // R4 (M4.1/M4.2): геолокация, контакты, документы
  lat?: number;
  lng?: number;
  liveUntil?: number;
  heading?: number | null;
  contact?: {
    displayName: string;
    phoneNumbers: string[];
    emails?: string[];
    organization?: string;
  };
  filename?: string;
  fileSize?: number;
  mimeType?: string;
  status?: 'sent' | 'pending' | 'read' | 'failed';
  isService?: boolean;
  isE2EEDecryptFailed?: boolean;
  isE2EESendFailed?: boolean;
  isUnencryptedIncoming?: boolean;
  mediaKey?: string;
  mediaIv?: string;
  callStatus?: string;
  duration?: number;
  mediaType?: string;
  replyMarkup?: InlineKeyboardMarkup;
  reply_markup?: InlineKeyboardMarkup;
  isBot?: boolean;
  invoiceId?: string;
  invoice_id?: string;
  invoice?: any;
  transferReceipt?: any;
  transfer_receipt?: any;
  topic_id?: number | null;
}

export interface DecryptedMediaProps {
  mediaUrl: string;
  mediaKey?: string | null;
  mediaIv?: string | null;
}

export function safeParsePeaks(peaks: any): number[] | undefined {
  if (!peaks) return undefined;
  if (Array.isArray(peaks)) return peaks;
  if (typeof peaks === 'string') {
    try {
      const parsed = JSON.parse(peaks);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.warn("[App] Ошибка парсинга peaks:", e);
    }
  }
  return undefined;
}

export const DecryptedAudioWaveform: React.FC<DecryptedMediaProps & { peaks?: any; theme?: 'dark' | 'light' | 'coffee' }> = ({ mediaUrl, mediaKey, mediaIv, peaks, theme }) => {
  const { url, loading, error } = useDecryptedMedia(mediaUrl, mediaKey, mediaIv, 'voice');
  if (loading) return <div className="p-4 text-xs text-slate-400">Расшифровка аудио...</div>;
  if (error || !url) {
    return (
      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
        <span>⚠️</span>
        <span>{error || 'Не удалось расшифровать аудиосообщение'}</span>
      </div>
    );
  }
  return <AudioWaveform audioUrl={url} peaks={safeParsePeaks(peaks)} theme={theme} />;
};

export const DecryptedImage: React.FC<DecryptedMediaProps & { onClick?: (url: string) => void; className?: string; alt?: string }> = ({ mediaUrl, mediaKey, mediaIv, onClick, className, alt }) => {
  const { url, loading, error } = useDecryptedMedia(mediaUrl, mediaKey, mediaIv, 'photo');
  if (loading) return <div className="p-4 text-xs text-slate-400">Расшифровка фото...</div>;
  if (error || !url) {
    return (
      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
        <span>⚠️</span>
        <span>{error || 'Не удалось расшифровать фото'}</span>
      </div>
    );
  }
  return <img src={url} alt={alt} className={className} onClick={() => onClick && onClick(url)} />;
};

export const DecryptedVideo: React.FC<DecryptedMediaProps & { className?: string }> = ({ mediaUrl, mediaKey, mediaIv, className }) => {
  const { url, loading, error } = useDecryptedMedia(mediaUrl, mediaKey, mediaIv, 'video');
  if (loading) return <div className="p-4 text-xs text-slate-400">Расшифровка видео...</div>;
  if (error || !url) {
    return (
      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
        <span>⚠️</span>
        <span>{error || 'Не удалось расшифровать видео'}</span>
      </div>
    );
  }
  return <video src={url} controls playsInline webkit-playsinline="true" className={className} />;
};

export const DecryptedVideoNote: React.FC<DecryptedMediaProps> = ({ mediaUrl, mediaKey, mediaIv }) => {
  const { url, loading, error } = useDecryptedMedia(mediaUrl, mediaKey, mediaIv, 'video_note');
  if (loading || !url) {
    if (error) {
      return (
        <div className="w-48 h-48 sm:w-60 sm:h-60 rounded-full flex flex-col items-center justify-center bg-slate-900/80 border border-rose-500/30 backdrop-blur-md text-slate-300 p-4 text-center">
          <span className="text-2xl mb-1">⚠️</span>
          <span className="text-xs text-rose-300 font-medium">Не удалось загрузить кружок</span>
          <span className="text-[10px] text-slate-400 mt-1">{error}</span>
        </div>
      );
    }
    return (
      <div className="w-48 h-48 sm:w-60 sm:h-60 rounded-full flex flex-col items-center justify-center bg-slate-900/60 border border-white/10 backdrop-blur-md text-slate-400">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mb-2" />
        <span className="text-xs">Расшифровка кружка...</span>
      </div>
    );
  }
  return <VideoNote src={url} />;
};

export const SwipeableMessageRow: React.FC<{
  msg: Message;
  idx: number;
  isMyMsg: boolean;
  isHighlighted?: boolean;
  onReply: (msg: Message) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}> = ({ msg, idx, isMyMsg, isHighlighted, onReply, onContextMenu, onClick, onDoubleClick, children }) => {
  const x = useMotionValue(0);
  const replyOpacity = useTransform(x, [0, -12, -45], [0, 0.4, 1]);
  const replyScale = useTransform(x, [0, -12, -45], [0.5, 0.8, 1.05]);
  const replyRotate = useTransform(x, [0, -45], [15, 0]);

  return (
    <div className="relative overflow-hidden w-full group py-0.5 px-1 sm:px-1.5">
      {/* Иконка ответа — появляется СТРОГО во время физического свайпа влево (Telegram-style Swipe to Reply) */}
      <motion.div
        style={{
          opacity: replyOpacity,
          scale: replyScale,
          rotate: replyRotate,
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-0"
      >
        <div className="w-7 h-7 rounded-full bg-purple-500/25 border border-purple-400/40 backdrop-blur-md flex items-center justify-center shadow-sm">
          <Reply className="w-3.5 h-3.5 text-purple-300" />
        </div>
      </motion.div>

      <motion.div
        key={msg.id || idx}
        style={{ x }}
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className={`relative z-10 flex flex-col w-full ${isMyMsg ? 'items-end' : 'items-start'}`}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -75, right: 0 }}
        dragElastic={{ left: 0.12, right: 0 }}
        dragSnapToOrigin={true}
        dragPropagation={false}
        onDragEnd={(event, info) => {
          if (info.offset.x < -45) {
            onReply(msg);
          }
        }}
      >
        <div className={`relative flex items-center gap-1.5 max-w-[85%] md:max-w-[70%] ${isMyMsg ? 'justify-end' : 'justify-start'}`}>
          {/* Легкая воздушная кнопка быстрого ответа при наведении мыши (Hover / Desktop) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReply(msg);
            }}
            className={`opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 rounded-full bg-slate-900/80 hover:bg-purple-600/70 text-slate-400 hover:text-white border border-white/10 shadow-sm backdrop-blur-md active:scale-90 cursor-pointer hidden md:flex items-center justify-center shrink-0 ${
              isMyMsg ? 'order-first mr-1' : 'order-last ml-1'
            }`}
            title="Ответить"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>

          <div
            className={`w-full min-w-0 cursor-pointer select-none ${isHighlighted ? 'ring-2 ring-yellow-400/60 rounded-2xl animate-pulse' : ''}`}
            style={{ touchAction: 'pan-y' }}
            onContextMenu={onContextMenu}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            data-testid={`message-${msg.id}`}
          >
            {children}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export const EMOJI_DATA = [
  { category: 'smiles', icon: '😃', list: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😍', '😘', '😜', '😎', '😴', '👍', '❤️', '🔥', '😂', '😮', '👏'] },
  { category: 'animals', icon: '🐱', list: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐸', '🐷', '🐵'] },
  { category: 'food', icon: '🍏', list: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🍕', '🍔'] },
  { category: 'activities', icon: '⚽', list: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸'] },
  { category: 'travel', icon: '🚗', list: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚜'] },
  { category: 'objects', icon: '💡', list: ['💡', '🔦', '🎈', '🎉', '🎊', '🧸', '📧', '📥', '📤', '📦', '🔔', '🔕', '🔑'] },
  { category: 'symbols', icon: '❤️', list: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞'] },
  { category: 'flags', icon: '🚩', list: ['🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️'] }
];

export interface EmojiPickerPanelProps {
  onEmojiSelect: (emoji: string) => void;
  theme: 'dark' | 'light' | 'coffee';
}

export const EmojiPickerPanel = React.memo(({ onEmojiSelect, theme: _theme }: EmojiPickerPanelProps) => {
  const [activeCategory, setActiveCategory] = React.useState('smiles');
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredEmojis = React.useMemo(() => {
    if (!searchQuery) {
      return EMOJI_DATA.find(c => c.category === activeCategory)?.list || [];
    }
    return EMOJI_DATA.flatMap(c => c.list).filter(e => e.includes(searchQuery));
  }, [activeCategory, searchQuery]);

  return (
    <div 
      className="w-full h-72 flex-shrink-0 flex flex-col bg-neutral-950/90 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative" 
      data-testid="emoji-picker"
    >
      {/* Вкладки категорий */}
      <div className="flex justify-around bg-white/5 border-b border-white/10 p-2">
        {EMOJI_DATA.map(cat => (
          <button
            key={cat.category}
            type="button"
            onClick={() => { setActiveCategory(cat.category); setSearchQuery(''); }}
            className={`p-1.5 rounded-lg text-lg transition-all ${activeCategory === cat.category ? 'bg-purple-500/20 scale-110' : 'opacity-60 hover:opacity-100'}`}
            data-testid={`emoji-category-${cat.category}`}
          >
            {cat.icon}
          </button>
        ))}
      </div>
      
      {/* Поиск */}
      <div className="p-2 border-b border-white/5">
        <input
          type="text"
          placeholder="Поиск эмодзи..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
          data-testid="emoji-search-input"
        />
      </div>

      {/* Сетка эмодзи */}
      <div className="flex-grow overflow-y-auto p-2 grid grid-cols-9 gap-1 justify-items-center auto-rows-max">
        {filteredEmojis.map((emoji, idx) => (
          <button
            key={`${emoji}-${idx}`}
            type="button"
            onClick={() => onEmojiSelect(emoji)}
            className="text-lg hover:scale-125 transition-transform duration-100 p-1 active:scale-95"
            data-testid={`emoji-item-${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
});


export interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  isGroup: boolean;
  isBot?: boolean;
  online: boolean;
  messages: Message[];
  is152FzContour?: boolean;
  type?: 'dialog' | 'group' | 'channel' | 'bot' | string;
  username?: string;
  description?: string;
  owner_user_id?: string;
  role?: 'owner' | 'admin' | 'poster' | 'subscriber' | string;
  members_count?: number;
  subscribers_count?: number;
  muted?: number | boolean;
  pinned_message_ids?: string[];
  draft?: string;
  is_forum?: boolean;
  topics_count?: number;
  short_id?: number | null;
  collision?: boolean;
}

// R3 (M3.1): пресеты таймера самоуничтожения (спека §9.3)
export const TTL_PRESETS = [
  { seconds: 0, label: 'Выключен' },
  { seconds: 30, label: '30 секунд' },
  { seconds: 300, label: '5 минут' },
  { seconds: 3600, label: '1 час' },
  { seconds: 86400, label: '1 день' },
  { seconds: 604800, label: '7 дней' },
];

export function formatTtlLabel(seconds: number): string {
  const preset = TTL_PRESETS.find((p) => p.seconds === seconds);
  return preset ? preset.label : `${seconds} c`;
}

export const renderMessageStatus = (
  status: 'pending' | 'sent' | 'read' | 'failed' | 'error' | undefined,
  isSticker = false,
  isE2EESendFailed = false
) => {
  const sizeClass = isSticker ? "w-3 h-3" : "w-3.5 h-3.5";
  const colorClass = isSticker ? "text-slate-500" : "text-slate-400";
  
  if (status === 'failed' || status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-rose-500 font-medium" title="Не отправлено">
        <AlertCircle className={`${sizeClass} text-rose-500 flex-shrink-0`} />
        {!isSticker && <span className="text-[9px] text-rose-400">Не отправлено</span>}
      </span>
    );
  }
  if (status === 'pending') {
    if (isE2EESendFailed) {
      return (
        <span className="inline-flex items-center gap-1 text-amber-400 font-medium" title="Повторим автоматически">
          <Clock className={`${sizeClass} text-amber-400 animate-pulse flex-shrink-0`} />
          {!isSticker && <span className="text-[9px] text-amber-400">Повторим автоматически</span>}
        </span>
      );
    }
    return <Clock className={`${sizeClass} ${colorClass} animate-pulse`} />;
  }
  if (status === 'read') {
    return <CheckCheck className={`${sizeClass} text-purple-400`} />;
  }
  return <Check className={`${sizeClass} text-purple-400/80`} />;
};

export const getSenderColorClass = (identifier: string): string => {
  if (!identifier) return 'text-purple-400';
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = (hash << 5) - hash + identifier.charCodeAt(i);
    hash |= 0;
  }
  const colors = [
    'text-red-400 dark:text-red-400',
    'text-orange-400 dark:text-orange-400',
    'text-amber-400 dark:text-amber-400',
    'text-emerald-400 dark:text-emerald-400',
    'text-teal-400 dark:text-teal-400',
    'text-cyan-400 dark:text-cyan-400',
    'text-sky-400 dark:text-sky-400',
    'text-blue-400 dark:text-blue-400',
    'text-indigo-400 dark:text-indigo-400',
    'text-violet-400 dark:text-violet-400',
    'text-fuchsia-400 dark:text-fuchsia-400',
    'text-pink-400 dark:text-pink-400',
    'text-rose-400 dark:text-rose-400',
  ];
  return colors[Math.abs(hash) % colors.length];
};

export const saveSessionToIndexedDB = (userId: string, token: string, avatarUrl?: string | null, username?: string | null) => {
  return new Promise<void>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      resolve();
      return;
    }
    const request = indexedDB.open("gossip-sw-db", 2);
    
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("metadata")) {
        db.createObjectStore("metadata");
      }
    };

    request.onsuccess = (event: any) => {
      const db = event.target.result;
      try {
        if (!db.objectStoreNames.contains("metadata")) {
          db.close();
          resolve();
          return;
        }
        const transaction = db.transaction("metadata", "readwrite");
        const store = transaction.objectStore("metadata");
        store.put(userId, "current_user_id");
        store.put(token, "session_token");
        if (avatarUrl) {
          store.put(avatarUrl, "profile_avatar_url");
        }
        if (username) {
          store.put(username, "username");
        }
        
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = (err: any) => {
          db.close();
          reject(err);
        };
      } catch (e) {
        db.close();
        reject(e);
      }
    };

    request.onerror = (event: any) => {
      reject(event.target.error);
    };
  });
};

export const restoreSessionFromIndexedDB = (): Promise<{ userId?: string; token?: string; avatarUrl?: string; username?: string }> => {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve({});
      return;
    }
    const request = indexedDB.open("gossip-sw-db", 2);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("metadata")) {
        db.createObjectStore("metadata");
      }
    };
    request.onsuccess = (event: any) => {
      const db = event.target.result;
      try {
        if (!db.objectStoreNames.contains("metadata")) {
          db.close();
          resolve({});
          return;
        }
        const transaction = db.transaction("metadata", "readonly");
        const store = transaction.objectStore("metadata");
        const reqUserId = store.get("current_user_id");
        const reqToken = store.get("session_token");
        const reqAvatar = store.get("profile_avatar_url");
        const reqUsername = store.get("username");

        transaction.oncomplete = () => {
          db.close();
          resolve({
            userId: reqUserId.result,
            token: reqToken.result,
            avatarUrl: reqAvatar.result,
            username: reqUsername.result
          });
        };
        transaction.onerror = () => {
          db.close();
          resolve({});
        };
      } catch (e) {
        db.close();
        resolve({});
      }
    };
    request.onerror = () => {
      resolve({});
    };
  });
};

export const clearSessionFromIndexedDB = () => {
  return new Promise<void>((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve();
      return;
    }
    const request = indexedDB.open("gossip-sw-db", 2);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("metadata")) {
        db.createObjectStore("metadata");
      }
    };
    request.onsuccess = (event: any) => {
      const db = event.target.result;
      try {
        if (db.objectStoreNames.contains("metadata")) {
          const transaction = db.transaction("metadata", "readwrite");
          const store = transaction.objectStore("metadata");
          store.clear();
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => {
            db.close();
            resolve();
          };
        } else {
          db.close();
          resolve();
        }
      } catch (e) {
        db.close();
        resolve();
      }
    };
    request.onerror = () => {
      resolve();
    };
  });
};


export class SettingsErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("[SettingsErrorBoundary] Перехвачена ошибка настроек:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-grow p-6 flex flex-col items-center justify-center text-center gap-4 text-slate-200 h-full min-h-[400px]">
          <span className="text-4xl">⚠️</span>
          <h2 className="text-lg font-bold text-red-400">Ошибка при отображении настроек</h2>
          <p className="text-xs text-slate-400 max-w-md">
            Произошел технический сбой в интерфейсе настроек. Вы можете выйти из профиля и войти заново для сброса состояния:
          </p>
          <pre className="text-[10px] font-mono bg-black/30 p-3 rounded-xl max-w-md overflow-x-auto text-red-300/80 border border-red-500/10">
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/20 rounded-xl transition text-xs font-semibold"
          >
            Сбросить данные и выйти
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}


