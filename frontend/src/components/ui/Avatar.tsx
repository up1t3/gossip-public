import React, { useState, useMemo } from 'react';
import { Users } from 'lucide-react';
import { getBackendUrl } from '../../utils/url';

export interface AvatarProps {
  name?: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isGroup?: boolean;
  online?: boolean;
  isLoading?: boolean;
  className?: string;
  onClick?: () => void;
  badge?: React.ReactNode;
}

// 8 гармоничных премиальных градиентов для аватарок (Telegram/Signal style)
const GRADIENT_PALETTES = [
  'from-emerald-500 to-teal-700 text-white',
  'from-purple-600 to-indigo-800 text-white',
  'from-blue-500 to-cyan-700 text-white',
  'from-rose-500 to-pink-700 text-white',
  'from-amber-500 to-orange-700 text-white',
  'from-violet-600 to-fuchsia-800 text-white',
  'from-cyan-500 to-blue-800 text-white',
  'from-emerald-600 to-emerald-900 text-white',
];

/**
 * Вычисляет стабильный хэш строки для детерминированного выбора градиента
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Извлекает 1-2 инициала из имени пользователя или названия группы
 */
function extractInitials(name?: string): string {
  if (!name || typeof name !== 'string') return '';
  const clean = name.trim().replace(/^[@#]/, '');
  if (!clean) return '';
  
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    // Если одно слово — берем 1-ю букву (или первые две, если длина позволяет)
    return words[0].slice(0, words[0].length >= 2 && words[0].length <= 3 ? 2 : 1).toUpperCase();
  }
  // Если 2 и более слов — берем первые буквы первых двух слов
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Проверяет, является ли строка реальным URL изображения
 */
function isValidImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  // Отсекаем эмодзи-заглушки
  if (trimmed === '👤' || trimmed === '👥' || trimmed === 'null' || trimmed === 'undefined') return false;
  return trimmed.startsWith('/') || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/') || trimmed.startsWith('blob:');
}

const SIZE_CLASSES = {
  xs: {
    container: 'w-6 h-6 rounded-full text-[10px]',
    icon: 'w-3.5 h-3.5',
    online: 'w-2 h-2 border',
  },
  sm: {
    container: 'w-8 h-8 rounded-full text-xs font-semibold',
    icon: 'w-4 h-4',
    online: 'w-2.5 h-2.5 border-[1.5px]',
  },
  md: {
    container: 'w-11 h-11 rounded-full text-sm font-bold',
    icon: 'w-5 h-5',
    online: 'w-3 h-3 border-2',
  },
  lg: {
    container: 'w-14 h-14 rounded-full text-base font-bold',
    icon: 'w-6 h-6',
    online: 'w-3.5 h-3.5 border-2',
  },
  xl: {
    container: 'w-20 h-20 rounded-full text-xl font-bold',
    icon: 'w-8 h-8',
    online: 'w-4 h-4 border-2',
  },
  '2xl': {
    container: 'w-24 h-24 rounded-full text-2xl font-bold',
    icon: 'w-10 h-10',
    online: 'w-5 h-5 border-[3px]',
  },
};

export const Avatar: React.FC<AvatarProps> = ({
  name = '',
  avatarUrl,
  size = 'md',
  isGroup = false,
  online = false,
  isLoading = false,
  className = '',
  onClick,
  badge,
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Сбрасываем ошибку и статус загрузки при изменении URL аватара
  React.useEffect(() => {
    setImageError(false);
    setIsLoaded(false);
  }, [avatarUrl]);

  const resolvedUrl = useMemo(() => {
    if (!avatarUrl || !isValidImageUrl(avatarUrl)) return null;
    return getBackendUrl(avatarUrl);
  }, [avatarUrl]);

  const hasValidImage = Boolean(resolvedUrl) && !imageError;
  const initials = useMemo(() => extractInitials(name), [name]);
  const gradientClass = useMemo(() => {
    const seed = name || avatarUrl || (isGroup ? 'group' : 'user');
    const index = hashString(seed) % GRADIENT_PALETTES.length;
    return GRADIENT_PALETTES[index];
  }, [name, avatarUrl, isGroup]);

  const sizeConfig = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center flex-shrink-0 select-none ${sizeConfig.container} ${className} ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center relative shadow-glass-sm">
        {hasValidImage && resolvedUrl ? (
          <>
            {/* Скелетон предзагрузки */}
            {!isLoaded && (
              <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} flex items-center justify-center animate-pulse`}>
                {initials ? <span>{initials}</span> : isGroup ? <Users className={sizeConfig.icon} /> : <span>{name ? name[0]?.toUpperCase() : ''}</span>}
              </div>
            )}
            <img
              key={resolvedUrl}
              src={resolvedUrl}
              alt={name || 'Avatar'}
              onLoad={() => {
                setIsLoaded(true);
                setImageError(false);
              }}
              onError={() => {
                console.warn(`[Avatar] Ошибка загрузки изображения ${resolvedUrl}, переключаемся на инициалы.`);
                setImageError(true);
              }}
              className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </>
        ) : (
          /* Инициалы на градиентном фоне */
          <div className={`w-full h-full bg-gradient-to-br ${gradientClass} flex items-center justify-center shadow-inner`}>
            {initials ? (
              <span className="tracking-wider">{initials}</span>
            ) : isGroup ? (
              <Users className={sizeConfig.icon} />
            ) : (
              <span className="tracking-wider">{name ? name[0]?.toUpperCase() : '?'}</span>
            )}
          </div>
        )}

        {/* Индикатор загрузки / сжатия аватара */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10 animate-fade-in">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Индикатор Онлайн */}
      {online && (
        <span
          className={`absolute bottom-0 right-0 bg-emerald-500 rounded-full border-neutral-900 shadow-sm z-10 ${sizeConfig.online}`}
          title="В сети"
        />
      )}

      {/* Кастомный бейдж */}
      {badge && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
          {badge}
        </div>
      )}
    </div>
  );
};

export default Avatar;
