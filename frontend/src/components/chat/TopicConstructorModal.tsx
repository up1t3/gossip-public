import React, { useState, useEffect } from 'react';
import { X, Lock, Check, Loader2 } from 'lucide-react';
import { TopicItem } from './TopicList';

export interface TopicConstructorModalProps {
  isOpen: boolean;
  chatId: string;
  initialTopic?: TopicItem | null;
  onClose: () => void;
  onSave: (topicData: {
    title: string;
    icon_emoji: string;
    icon_color: string;
    is_closed: boolean;
  }) => Promise<void>;
}

const EMOJI_PALETTE = ['💬', '📢', '🚀', '💡', '🛡️', '🎧', '🎮', '📝', '⚙️', '💎'];

const COLOR_PALETTE = [
  { hex: '#3b82f6', name: 'Синий' },
  { hex: '#10b981', name: 'Изумруд' },
  { hex: '#8b5cf6', name: 'Фиолетовый' },
  { hex: '#f43f5e', name: 'Розовый' },
  { hex: '#f59e0b', name: 'Янтарный' },
  { hex: '#06b6d4', name: 'Бирюзовый' },
  { hex: '#ec4899', name: 'Малиновый' },
  { hex: '#64748b', name: 'Сланцевый' },
];

export const TopicConstructorModal: React.FC<TopicConstructorModalProps> = ({
  isOpen,
  chatId,
  initialTopic,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [iconEmoji, setIconEmoji] = useState('💬');
  const [iconColor, setIconColor] = useState('#3b82f6');
  const [isClosed, setIsClosed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialTopic) {
        setTitle(initialTopic.title || '');
        setIconEmoji(initialTopic.icon_emoji || '💬');
        setIconColor(initialTopic.icon_color || '#3b82f6');
        setIsClosed(!!initialTopic.is_closed);
      } else {
        setTitle('');
        setIconEmoji('💬');
        setIconColor('#3b82f6');
        setIsClosed(false);
      }
      setErrorMessage(null);
      setIsLoading(false);
    }
  }, [isOpen, initialTopic]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();

    // Валидация названия: 1..128 символов
    if (!trimmedTitle) {
      setErrorMessage('Введите название топика (от 1 до 128 символов)');
      return;
    }

    if (trimmedTitle.length > 128) {
      setErrorMessage('Название топика не может превышать 128 символов');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      await onSave({
        title: trimmedTitle,
        icon_emoji: iconEmoji,
        icon_color: iconColor,
        is_closed: isClosed,
      });
      setIsLoading(false);
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      // Zero-Toast Rule: ошибка отображается строго внутри окна
      setErrorMessage(
        err?.message || 'Не удалось сохранить топик. Попробуйте еще раз.'
      );
    }
  };

  return (
    <div
      data-testid="topic-constructor-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-neutral-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-2xl text-white">
        {/* Шапка модального окна */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-base border border-white/15 shadow-inner"
              style={{
                backgroundColor: `${iconColor}33`,
                borderColor: `${iconColor}55`,
              }}
            >
              {iconEmoji}
            </div>
            <h3 className="font-semibold text-lg">
              {initialTopic ? 'Редактировать топик' : 'Новый топик'}
            </h3>
          </div>

          <button
            data-testid="topic-close-btn"
            onClick={onClose}
            aria-label="Закрыть окно"
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Инлайн-сообщение об ошибке (Zero-Toast Rule) */}
          {errorMessage && (
            <div
              data-testid="topic-error-msg"
              className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium"
            >
              {errorMessage}
            </div>
          )}

          {/* Поле названия */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Название топика
            </label>
            <div className="relative">
              <input
                data-testid="topic-title-input"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Например: Обсуждение релизов, Игры, Вопросы..."
                className="w-full px-4 py-3 bg-neutral-950/60 border border-white/10 rounded-2xl text-sm text-white placeholder-neutral-500 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition"
                autoFocus
              />
              <span
                className={`absolute right-3.5 top-3.5 text-xs transition-colors ${
                  title.length > 128 ? 'text-red-400 font-semibold' : 'text-neutral-500'
                }`}
              >
                {title.length}/128
              </span>
            </div>
          </div>

          {/* Выбор Emoji */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Иконка
            </label>
            <div className="grid grid-cols-5 gap-2">
              {EMOJI_PALETTE.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  data-testid={`topic-emoji-${emoji}`}
                  onClick={() => setIconEmoji(emoji)}
                  className={`h-11 rounded-2xl flex items-center justify-center text-xl transition-all border ${
                    iconEmoji === emoji
                      ? 'bg-blue-600/30 border-blue-400 scale-105 shadow-md shadow-blue-500/20'
                      : 'bg-neutral-950/40 border-white/5 hover:bg-white/5 hover:border-white/15'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Выбор цвета */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Цветовой акцент
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {COLOR_PALETTE.map((col) => {
                const isSelected = iconColor === col.hex;
                return (
                  <button
                    type="button"
                    key={col.hex}
                    data-testid={`topic-color-${col.hex}`}
                    onClick={() => setIconColor(col.hex)}
                    className={`h-9 rounded-xl flex items-center justify-center transition-all border ${
                      isSelected
                        ? 'border-white scale-105 shadow-lg'
                        : 'border-white/10 hover:scale-102 hover:border-white/30'
                    }`}
                    style={{ backgroundColor: col.hex }}
                    title={col.name}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white drop-shadow" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Переключатель is_closed */}
          <div className="pt-1">
            <label
              data-testid="topic-closed-toggle"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-950/40 border border-white/5 hover:border-white/10 cursor-pointer transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Только для чтения</div>
                  <div className="text-xs text-neutral-400">
                    Обычные участники не смогут отправлять сообщения
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isClosed}
                onChange={(e) => setIsClosed(e.target.checked)}
                className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
              />
            </label>
          </div>

          {/* Кнопки действий */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-300 hover:text-white hover:bg-white/5 transition disabled:opacity-50"
            >
              Отмена
            </button>

            <button
              data-testid="topic-save-btn"
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{initialTopic ? 'Сохранить' : 'Создать топик'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
