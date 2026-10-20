import React, { useEffect, useRef } from 'react';
import { Search, X, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import type { ChatSearchResult } from '../../hooks/useChatSearch';

export interface ChatSearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  results: ChatSearchResult[];
  currentIndex: number;
  totalCount: number;
  isSearching: boolean;
  isNavigating: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  /** Показывать ли панель (для анимации/монтирования). */
  isOpen: boolean;
}

/**
 * Панель поиска внутри чата (M1.3).
 * Telegram-style: поле + счётчик «N/M» + стрелки ↑↓ + ✕.
 * Превью-сниппет с подсветкой термина (маркеры ⟦⟧ из FTS5 snippet()).
 *
 * Презентация только: вся логика/состояние — в хуке useChatSearch (через props).
 */
export const ChatSearchBar: React.FC<ChatSearchBarProps> = ({
  query,
  onQueryChange,
  results,
  currentIndex,
  totalCount,
  isSearching,
  isNavigating,
  onPrev,
  onNext,
  onClose,
  isOpen,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Автофокус при открытии
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Esc — закрыть; Enter — циклический переход ↓ (как Telegram)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onNext();
    }
  };

  if (!isOpen) return null;

  const hasResults = totalCount > 0;
  const atTop = currentIndex <= 0;
  const atBottom = currentIndex >= totalCount - 1;
  const current = results[currentIndex];

  // Рендер сниппета с подсветкой маркеров ⟦термин⟧ (через JSX, без innerHTML — безопасно от XSS)
  const renderSnippet = (snippet: string): React.ReactNode => {
    if (!snippet) return null;
    const parts = snippet.split(/(⟦|⟧)/);
    let inside = false;
    return parts.map((part, i) => {
      if (part === '⟦') { inside = true; return null; }
      if (part === '⟧') { inside = false; return null; }
      if (inside) {
        return (
          <mark key={i} className="bg-yellow-400/40 rounded-sm text-inherit">
            {part}
          </mark>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col border-b border-white/5 bg-slate-900/60 backdrop-blur-md px-3 py-2 gap-2">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Поиск в чате…"
          className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none min-w-0"
        />

        {/* Счётчик / статус */}
        <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0 min-w-[80px] justify-end">
          {isSearching ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : query.trim() === '' ? null : hasResults ? (
            <span className="font-mono">
              {currentIndex + 1}/{totalCount}
            </span>
          ) : (
            <span className="text-slate-500">Ничего не найдено</span>
          )}
        </div>

        {/* Стрелки навигации */}
        {hasResults && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={onPrev}
              disabled={atTop || isNavigating}
              aria-label="Предыдущее совпадение"
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-white/5 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={onNext}
              disabled={atBottom || isNavigating}
              aria-label="Следующее совпадение"
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-white/5 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Закрыть */}
        <button
          onClick={onClose}
          aria-label="Закрыть поиск"
          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-white/5 transition flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Превью-сниппет текущего совпадения */}
      {hasResults && current && (
        <div className="text-xs text-slate-400 line-clamp-1 pl-6">
          {renderSnippet(current.snippet)}
        </div>
      )}
    </div>
  );
};
