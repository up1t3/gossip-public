// E:\Boltalka\frontend\src\components\voip\LiveCaptions.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { tdlib } from '../../core/tdlib/tdlib-adapter';

interface CaptionItem {
  id: string;
  speakerId: string;
  speakerName: string;
  text: string;
  timestamp: number;
}

interface LiveCaptionsProps {
  callId: string;
  isActive: boolean;
}

// Предопределенные цвета для разных спикеров
const SPEAKER_COLORS: { [key: string]: string } = {
  'speaker_1': 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  'speaker_2': 'text-sky-400 border-sky-500/30 bg-sky-500/10',
  'speaker_3': 'text-violet-400 border-violet-500/30 bg-violet-500/10',
  'speaker_4': 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  'default': 'text-neutral-300 border-neutral-700/30 bg-neutral-800/20'
};

/**
 * Компонент LiveCaptions для отображения транскрипции Whisper STT в реальном времени.
 */
export const LiveCaptions: React.FC<LiveCaptionsProps> = ({ callId, isActive }) => {
  const [captions, setCaptions] = useState<CaptionItem[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const processedTextsRef = useRef<string[]>([]);

  // Сброс и перезапуск таймера скрытия субтитров после 4-5 секунд тишины
  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = setTimeout(() => {
      // Очищаем субтитры на экране при тишине (историю в processedTextsRef сохраняем)
      setCaptions([]);
    }, 4500);
  };

  // Дедупликация и добавление новых текстов
  const addTexts = (incoming: string[]) => {
    const processed = processedTextsRef.current;
    let newItems: string[] = [];
    let foundOverlapping = false;

    // Находим максимальное перекрытие (суффикс обработанных строк совпадает с префиксом входящих)
    for (let i = 0; i < incoming.length; i++) {
      const candidatePrefix = incoming.slice(0, incoming.length - i);
      
      if (candidatePrefix.length <= processed.length) {
        let match = true;
        const startIdx = processed.length - candidatePrefix.length;
        for (let j = 0; j < candidatePrefix.length; j++) {
          if (processed[startIdx + j] !== candidatePrefix[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          newItems = incoming.slice(incoming.length - i);
          foundOverlapping = true;
          break;
        }
      }
    }

    if (!foundOverlapping) {
      // Если перекрытия не найдено, отфильтровываем те, что уже есть в processed
      newItems = incoming.filter(text => !processed.includes(text));
    }

    if (newItems.length === 0) return;

    // Добавляем новые фразы в историю
    processedTextsRef.current = [...processed, ...newItems];

    // Добавляем новые элементы на экран
    newItems.forEach((text) => {
      const textClean = text.trim();
      if (!textClean) return;

      const newItem: CaptionItem = {
        id: Math.random().toString(36).substring(2, 9),
        speakerId: 'speaker_1',
        speakerName: 'Спикер 1',
        text: textClean,
        timestamp: Date.now()
      };

      setCaptions((prev) => {
        const updated = [...prev, newItem];
        if (updated.length > 4) {
          updated.shift();
        }
        return updated;
      });
    });

    resetSilenceTimer();
  };

  useEffect(() => {
    if (!isActive || !callId) {
      setCaptions([]);
      processedTextsRef.current = [];
      return;
    }

    // 1. Подписываемся на пуш-обновления субтитров по WebSocket
    const onLiveCaptionsUpdate = (update: any) => {
      console.log('[LiveCaptions] Получено обновление:', update);
      if (update && typeof update.text === 'string') {
        addTexts([update.text]);
      }
    };
    
    tdlib.onUpdate('live_captions', onLiveCaptionsUpdate);
    tdlib.onUpdate('voip_live_caption', onLiveCaptionsUpdate);

    // 2. Дополнительный периодический опрос (long-polling) для надежности
    const pollInterval = setInterval(async () => {
      try {
        const res = await tdlib.send('voip_get_live_captions', { callId });
        if (res && Array.isArray(res.captions)) {
          addTexts(res.captions);
        }
      } catch (err) {
        // Игнорируем ошибки опроса в автономном режиме
      }
    }, 2000);

    return () => {
      tdlib.offUpdate('live_captions', onLiveCaptionsUpdate);
      tdlib.offUpdate('voip_live_caption', onLiveCaptionsUpdate);
      clearInterval(pollInterval);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [callId, isActive]);

  // Возвращает стиль рамки и текста в зависимости от speakerId
  const getSpeakerStyle = (speakerId: string) => {
    return SPEAKER_COLORS[speakerId] || SPEAKER_COLORS['default'];
  };

  if (!isActive || captions.length === 0) return null;

  return (
    <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4 z-40 pointer-events-none">
      <div className="flex flex-col gap-2">
        <AnimatePresence>
          {captions.map((caption) => (
            <motion.div
              key={caption.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={`flex items-start gap-2.5 p-3 rounded-2xl border backdrop-blur-md shadow-lg pointer-events-auto ${getSpeakerStyle(caption.speakerId)}`}
            >
              <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-70" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                  {caption.speakerName}
                </span>
                <p className="text-sm font-medium leading-relaxed mt-0.5">
                  {caption.text}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
export default LiveCaptions;
