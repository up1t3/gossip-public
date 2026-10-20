import React, { useRef, useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Loader2, ChevronDown } from 'lucide-react';
import { GlassButton } from '../../ui/GlassButton';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Императивный API VirtualMessageList для внешних команд скролла (M1.3 — прыжок к совпадению).
 * scrollToMessage(id): true если сообщение найдено и прокручено, false если id нет в messages.
 */
export interface VirtualMessageListHandle {
  scrollToMessage: (id: string) => boolean;
}

export interface VirtualMessageListProps<T = any> {
  messages: T[];
  renderMessage: (msg: T, idx: number, isHighlighted?: boolean) => React.ReactNode;
  onLoadMoreHistory: () => Promise<void>;
  chatId: string;
  /** id сообщения, которое нужно подсветить (рамка-вспышка) — из поиска (M1.3). */
  highlightMessageId?: string | null;
}

export const VirtualMessageList = forwardRef<VirtualMessageListHandle, VirtualMessageListProps<any>>((
  {
    messages,
    renderMessage,
    onLoadMoreHistory,
    chatId,
    highlightMessageId,
  },
  ref
) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Реф состояния скролла пользователя: true если пользователь прокрутил ленту вверх
  const userScrolledUpRef = useRef(false);

  // Массив сообщений в обратном хронологическом порядке (от новых к старым)
  // В контейнере flex-col-reverse первое сообщение в массиве рендерится в самом низу
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  // Сброс состояния скролла при переключении чата
  useEffect(() => {
    userScrolledUpRef.current = false;
    setShowScrollBottom(false);
    
    const container = containerRef.current;
    if (container) {
      // В column-reverse 0 — это самый низ ленты
      container.scrollTop = 0;
    }
    
    const rAF = requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    });

    return () => cancelAnimationFrame(rAF);
  }, [chatId]);

  // Запуск загрузки истории при приближении к верху
  const triggerLoadMoreHistory = useCallback(async () => {
    if (isLoadingHistory) return;
    setIsLoadingHistory(true);
    try {
      await onLoadMoreHistory();
    } catch (err) {
      console.error("[VirtualMessageList] Ошибка загрузки истории:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [isLoadingHistory, onLoadMoreHistory]);

  // Обработчик скролла
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const currentScrollTop = target.scrollTop;

    // В flex-col-reverse:
    // 0 — это самый низ (самые свежие сообщения)
    // Чем больше scrollTop, тем выше пользователь поднялся в историю
    if (currentScrollTop > 80) {
      userScrolledUpRef.current = true;
      setShowScrollBottom(true);
    } else if (currentScrollTop <= 25) {
      userScrolledUpRef.current = false;
      setShowScrollBottom(false);
    }

    // Ленивая подгрузка истории при приближении к верхней границе ленты
    const distanceFromTop = target.scrollHeight - currentScrollTop - target.clientHeight;
    if (distanceFromTop <= 120 && !isLoadingHistory) {
      triggerLoadMoreHistory();
    }
  }, [isLoadingHistory, triggerLoadMoreHistory]);

  // Автоскролл вниз при отправке нового сообщения или поступлении сообщения
  const lastMessage = messages[messages.length - 1];
  const lastMessageId = lastMessage?.id;
  const prevLastMessageIdRef = useRef<string | undefined>(lastMessageId);

  useEffect(() => {
    if (!lastMessageId) return;

    const isNewMessage = lastMessageId !== prevLastMessageIdRef.current;
    prevLastMessageIdRef.current = lastMessageId;

    if (!isNewMessage) return;

    const isMyMsg = lastMessage?.sender === 'me';

    // Если сообщение отправлено мной ИЛИ пользователь не уходил вверх по истории — плавно скроллим вниз
    if (isMyMsg || !userScrolledUpRef.current) {
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
          userScrolledUpRef.current = false;
          setShowScrollBottom(false);
        }
      });
    }
  }, [lastMessageId, lastMessage?.sender]);

  // Императивный API: прокрутить к сообщению по id (для поиска, ответов, закрепленных сообщений)
  useImperativeHandle(ref, () => ({
    scrollToMessage: (id: string): boolean => {
      const container = containerRef.current;
      if (!container) return false;

      const element = container.querySelector(`[data-msg-id="${id}"]`) as HTMLElement | null;
      if (element) {
        userScrolledUpRef.current = true;
        setShowScrollBottom(true);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      }
      return false;
    },
  }));

  // Автоматическая плавная прокрутка при подсветке сообщения из поиска или клика по ответу
  useEffect(() => {
    if (!highlightMessageId) return;
    const container = containerRef.current;
    if (!container) return;

    const timer = setTimeout(() => {
      const element = container.querySelector(`[data-msg-id="${highlightMessageId}"]`) as HTMLElement | null;
      if (element) {
        userScrolledUpRef.current = true;
        setShowScrollBottom(true);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [highlightMessageId]);

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      userScrolledUpRef.current = false;
      setShowScrollBottom(false);
    }
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col flex-grow overflow-hidden">
      {/* Скроллируемый контейнер сообщений */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-grow w-full h-full overflow-y-auto p-4 sm:p-6 flex flex-col-reverse gap-4 overscroll-contain relative select-text"
        style={{
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {messages.length > 0 ? (
          <>
            {/* Сообщения рендерятся в обратном порядке (flex-col-reverse) */}
            {reversedMessages.map((msg, index) => {
              const globalIndex = reversedMessages.length - 1 - index;
              const isHighlighted = highlightMessageId != null && msg.id === highlightMessageId;
              return (
                <div key={msg.id} data-msg-id={msg.id} className="w-full">
                  {renderMessage(msg, globalIndex, isHighlighted)}
                </div>
              );
            })}

            {/* Кнопка ручной подгрузки истории (отображается в самом верху ленты) */}
            <div className="flex justify-center pb-4 pt-2">
              <GlassButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={triggerLoadMoreHistory}
                disabled={isLoadingHistory}
                className="px-4 py-2 text-xs font-semibold text-purple-400 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                {isLoadingHistory ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Загрузка...</span>
                  </>
                ) : (
                  <span>Загрузить историю</span>
                )}
              </GlassButton>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col justify-center items-center text-slate-500 text-sm gap-2">
            <span>Начните общение, отправив первое сообщение</span>
          </div>
        )}
      </div>

      {/* Кнопка быстрого перехода в самый низ (Floating Action Button) в стиле Telegram */}
      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.15 }}
            onClick={scrollToBottom}
            aria-label="Прокрутить в самый низ"
            className="absolute right-4 bottom-4 sm:right-6 sm:bottom-6 z-30 w-10 h-10 rounded-full bg-slate-900/85 hover:bg-slate-800 text-slate-200 hover:text-white backdrop-blur-xl border border-white/15 shadow-xl flex items-center justify-center transition-all active:scale-90 cursor-pointer group"
          >
            <ChevronDown className="w-5 h-5 transition-transform group-hover:translate-y-0.5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
});

VirtualMessageList.displayName = 'VirtualMessageList';
