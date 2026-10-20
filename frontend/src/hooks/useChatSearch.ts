import { useState, useEffect, useRef, useCallback } from 'react';
import { storageManager } from '../core/storage/storage-manager';
import { sanitizeFtsQuery } from '../core/search/ftsQuery';

export interface ChatSearchResult {
  id: string;
  pts: number;
  snippet: string; // FTS snippet с маркерами ⟦⟧
}

export interface UseChatSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: ChatSearchResult[];
  currentIndex: number;
  totalCount: number;
  isSearching: boolean;
  isNavigating: boolean;
  setIsNavigating: (v: boolean) => void;
  /** Перейти к результату по индексу. Возвращает target или null (App выполнит прыжок). */
  goTo: (index: number) => ChatSearchResult | null;
  /** Шаг вверх (более свежее). */
  goPrev: () => ChatSearchResult | null;
  /** Шаг вниз (более старое). */
  goNext: () => ChatSearchResult | null;
  /** Сброс сессии (смена чата / закрытие). */
  reset: () => void;
}

interface FtsRow {
  id: string;
  pts: number;
  snippet: string | null;
}

/**
 * Хук поиска по сообщениям внутри чата.
 *
 * FTS5-запрос по chatId, debounce 300ms. Состояние:
 *  - query: текущий ввод;
 *  - results: [{id, pts, snippet}] отсортированы DESC по timestamp (свежие — первые);
 *  - currentIndex: активное совпадение (0 = самое свежее);
 *  - isSearching: идёт debounce/запрос;
 *  - isNavigating: App выполняет прыжок (стрелки disabled).
 *
 * Stale-closure guard: chatIdRef хранит актуальный chatId; ответ FTS применяется
 * только если чат не сменился (как isSubscribed в App.tsx:1375).
 *
 * Навигация: хук считает индекс, App слушает currentIndex и выполняет прыжок
 * (loadHistoryAround + scrollToMessage), т.к. это зависит от sync-manager и DOM.
 */
export function useChatSearch(
  chatId: string | undefined,
  isDbLoaded: boolean
): UseChatSearchReturn {
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<ChatSearchResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const chatIdRef = useRef(chatId);
  chatIdRef.current = chatId;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Сброс при смене чата
  useEffect(() => {
    setQueryState('');
    setResults([]);
    setCurrentIndex(0);
    setIsSearching(false);
    setIsNavigating(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  // Debounce-поиск
  const setQuery = useCallback(
    (q: string) => {
      setQueryState(q);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      const sanitized = sanitizeFtsQuery(q);
      if (sanitized === '' || !chatId || !isDbLoaded) {
        setResults([]);
        setCurrentIndex(0);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      const activeChatId = chatIdRef.current;
      debounceRef.current = setTimeout(async () => {
        try {
          const rows = await storageManager.query<FtsRow>(
            `SELECT m.id, m.pts, snippet(messages_fts, 2, '⟦', '⟧', '…', 12) AS snippet
             FROM messages_fts f
             JOIN messages m ON f.rowid = m.rowid
             WHERE messages_fts MATCH ? AND m.chatId = ?
             ORDER BY m.timestamp DESC;`,
            [sanitized, activeChatId]
          );
          // Stale guard: применим результат только если чат не сменился
          if (chatIdRef.current !== activeChatId) return;

          setResults(
            rows.map((r) => ({
              id: r.id,
              pts: r.pts,
              snippet: r.snippet || '',
            }))
          );
          setCurrentIndex(0);
        } catch (err) {
          console.error('[ChatSearch] FTS query failed:', err);
          setResults([]);
          setCurrentIndex(0);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    },
    [chatId, isDbLoaded]
  );

  const goTo = useCallback(
    (index: number): ChatSearchResult | null => {
      if (results.length === 0) return null;
      const clamped = Math.max(0, Math.min(index, results.length - 1));
      setCurrentIndex(clamped);
      return results[clamped] || null;
    },
    [results]
  );

  const goPrev = useCallback(
    (): ChatSearchResult | null => goTo(currentIndex - 1),
    [goTo, currentIndex]
  );

  const goNext = useCallback(
    (): ChatSearchResult | null => goTo(currentIndex + 1),
    [goTo, currentIndex]
  );

  const reset = useCallback(() => {
    setQueryState('');
    setResults([]);
    setCurrentIndex(0);
    setIsSearching(false);
    setIsNavigating(false);
  }, []);

  return {
    query,
    setQuery,
    results,
    currentIndex,
    totalCount: results.length,
    isSearching,
    isNavigating,
    setIsNavigating,
    goTo,
    goPrev,
    goNext,
    reset,
  };
}
