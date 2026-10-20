import React, { useState, useRef, useEffect, useMemo } from 'react';
import katex from 'katex';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Check, ChevronRight, ChevronLeft, ExternalLink } from 'lucide-react';
import { buildHighlightRegex } from '../../core/search/highlightRegex';

interface RichTextProps {
  text: string;
  onMentionClick?: (username: string) => void;
  onHashtagClick?: (tag: string) => void;
  /** Термин для подсветки (поиск M1.3). Подсвечивается только в plain-text сегментах. */
  highlightTerm?: string;
  /** Рамка-вспышка вокруг всего сообщения (активное совпадение поиска). */
  isHighlighted?: boolean;
}

// Allowlist схем для ссылок из пользовательского текста: всё, что не входит
// в список (javascript:, data:, vbscript: и др.), рендерится как обычный текст.
const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tg:']);

export const isSafeUrl = (url: string): boolean => {
  try {
    return SAFE_URL_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
};

// Вспомогательная функция для генерации безопасного id из текста заголовка (для якорей)
const generateAnchorId = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
};

// --- Компонент для инлайн формул LaTeX ---
const InlineMath: React.FC<{ formula: string }> = ({ formula }) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(formula, containerRef.current, {
          displayMode: false,
          throwOnError: false,
        });
      } catch (err) {
        console.warn('KaTeX inline render error:', err);
        containerRef.current.textContent = `$${formula}$`;
      }
    }
  }, [formula]);

  return <span ref={containerRef} className="inline-math px-1" />;
};

// --- Компонент для блочных формул LaTeX ---
const BlockMath: React.FC<{ formula: string }> = ({ formula }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(formula, containerRef.current, {
          displayMode: true,
          throwOnError: false,
        });
      } catch (err) {
        console.warn('KaTeX block render error:', err);
        containerRef.current.textContent = `$$${formula}$$`;
      }
    }
  }, [formula]);

  return <div ref={containerRef} className="block-math my-3 overflow-x-auto py-2 text-center" />;
};

// --- Компонент для блоков кода с кнопкой копирования ---
const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="relative my-3 overflow-hidden rounded-xl border border-white/10 bg-slate-950/70 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/5 bg-slate-900/50 px-4 py-1.5 text-xs text-slate-400">
        <span className="font-mono text-xs uppercase">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded bg-white/5 px-2 py-1 transition hover:bg-white/10 active:scale-95"
        >
          {copied ? (
            <>
              <Check size={12} className="text-green-400" />
              <span className="text-green-400">Скопировано!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Копировать</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
};

// --- Компонент аккордеона (details/summary) с анимацией ---
const Accordion: React.FC<{ title: React.ReactNode; children: React.ReactNode }> = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-2.5 overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left font-medium text-slate-200 transition hover:bg-white/5"
      >
        <span className="flex-1 pr-4">{title}</span>
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          <ChevronRight size={18} className="text-purple-400" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div className="border-t border-white/5 bg-black/10 px-4 py-3 text-slate-300 leading-relaxed">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Компонент для изображений (коллажи и карусели) ---
interface MediaItem {
  alt: string;
  url: string;
}

const MediaGallery: React.FC<{ items: MediaItem[] }> = ({ items }) => {
  const [activeIdx, setActiveIdx] = useState(0);

  if (items.length === 0) return null;

  // Одиночное изображение
  if (items.length === 1) {
    return (
      <div className="group relative my-3 overflow-hidden rounded-xl border border-white/10 bg-slate-900/50">
        <img
          src={items[0].url}
          alt={items[0].alt}
          className="max-h-96 w-full object-contain transition duration-300 group-hover:scale-[1.01]"
          loading="lazy"
        />
        {items[0].alt && (
          <div className="bg-black/60 px-3 py-1 text-center text-xs text-slate-300 backdrop-blur-sm">
            {items[0].alt}
          </div>
        )}
      </div>
    );
  }

  // Коллаж для 2-3 изображений
  if (items.length <= 3) {
    return (
      <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-slate-900/30">
        <div className={`grid gap-1.5 ${items.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {items.map((item, idx) => (
            <div key={idx} className="group relative aspect-video overflow-hidden bg-slate-950">
              <img
                src={item.url}
                alt={item.alt}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                loading="lazy"
              />
              {item.alt && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/75 px-2 py-0.5 text-center text-[10px] text-slate-300 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.alt}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Карусель (слайдер) для 4+ изображений
  const nextSlide = () => {
    setActiveIdx((prev) => (prev + 1) % items.length);
  };

  const prevSlide = () => {
    setActiveIdx((prev) => (prev - 1 + items.length) % items.length);
  };

  return (
    <div className="relative my-3 overflow-hidden rounded-xl border border-white/10 bg-slate-950/80 backdrop-blur-md">
      {/* Слайды */}
      <div className="relative flex aspect-video items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.img
            key={activeIdx}
            src={items[activeIdx].url}
            alt={items[activeIdx].alt}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.25 }}
            className="h-full w-full object-contain"
          />
        </AnimatePresence>

        {/* Кнопка Влево */}
        <button
          onClick={prevSlide}
          className="absolute left-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80 hover:scale-105 active:scale-95"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Кнопка Вправо */}
        <button
          onClick={nextSlide}
          className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80 hover:scale-105 active:scale-95"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Пагинация и подпись */}
      <div className="flex items-center justify-between border-t border-white/5 bg-slate-900/50 px-4 py-2 text-xs">
        <span className="text-slate-400 font-medium">
          {items[activeIdx].alt || `Изображение ${activeIdx + 1}`}
        </span>
        <span className="font-mono text-purple-400">
          {activeIdx + 1} / {items.length}
        </span>
      </div>
    </div>
  );
};

// --- Вспомогательная функция для автоматического преобразования текстовых URL в ссылки ---
const linkify = (inputText: string, baseKey: number): React.ReactNode[] => {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = inputText.split(urlRegex);
  if (parts.length === 1) {
    return [inputText];
  }
  
  return parts.map((part, i) => {
    const isUrl = part.match(urlRegex);
    if (isUrl) {
      let href = part;
      if (part.toLowerCase().startsWith('www.')) {
        href = 'http://' + part;
      }
      return (
        <a
          key={`${baseKey}-link-${i}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-400 hover:text-purple-300 underline break-all inline-flex items-center gap-0.5"
        >
          {part}
          <ExternalLink size={10} className="inline opacity-70" />
        </a>
      );
    }
    return part;
  });
};

// --- Подсветка поискового термина в plain-text сегменте (M1.3) ---
/**
 * Подсветка термина в plain-text строке. Возвращает массив узлов: обычный текст
 * чередуется с <mark>-обёртками совпадений. Без dangerouslySetInnerHTML — чистый JSX.
 * Применяется к text-сегментам в финальном этапе parseInline (mention/hashtag/LaTeX/URL не трогаются).
 */
const highlightInText = (
  text: string,
  highlightRe: RegExp | null,
  baseKey: string
): React.ReactNode[] => {
  if (!highlightRe || text === '') return [text];

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  // Сброс lastIndex: регэксп может переиспользоваться (global-флаг хранит позицию).
  highlightRe.lastIndex = 0;
  let match: RegExpExecArray | null;
  let partIdx = 0;
  while ((match = highlightRe.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    if (before) nodes.push(before);
    nodes.push(
      <mark
        key={`${baseKey}-hl-${partIdx++}`}
        className="bg-yellow-400/40 rounded-sm text-inherit"
      >
        {match[0]}
      </mark>
    );
    lastIndex = match.index + match[0].length;
    // Защита от zero-length match
    if (match.index === highlightRe.lastIndex) highlightRe.lastIndex++;
  }
  const tail = text.slice(lastIndex);
  if (tail) nodes.push(tail);
  return nodes;
};

// --- Парсер инлайн-форматирования ---
// Regex-константы для определения токенов mention/hashtag.
// Экспортируются для unit/E2E-тестирования парсинга без монтирования компонента.
// Anchored (^) — в parseInline применяются к срезу text.slice(index).
// Форматы:
//   mention: @username, [a-zA-Z0-9_], 3-32 символа (CS-M1)
//   hashtag: #tag, [a-zA-Z0-9а-яА-ЯёЁ], 2-64 символа (CS-H1, с кириллицей)
export const MENTION_REGEX = /^@([a-zA-Z0-9_]{3,32})(?![a-zA-Z0-9_])/;
export const HASHTAG_REGEX = /^#([a-zA-Z0-9_а-яА-ЯёЁ]{2,64})(?![a-zA-Z0-9_а-яА-ЯёЁ])/;
export const SPOILER_REGEX = /^\|\|([^|]+)\|\|/;

export interface SpoilerSpanProps {
  children: React.ReactNode;
}

export const SpoilerSpan: React.FC<SpoilerSpanProps> = ({ children }) => {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label="Спойлер — нажмите, чтобы раскрыть"
      onClick={() => setRevealed((prev) => !prev)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setRevealed((prev) => !prev);
        }
      }}
      className={`inline-block cursor-pointer select-none rounded px-1 transition duration-200 ${
        revealed ? 'filter-none' : 'blur-[6px] bg-white/10'
      }`}
    >
      {children}
    </span>
  );
};

// Обработчики клика для mention/hashtag (опциональны — если не переданы,
// токены рендерятся кликабельными визуально, но onClick no-op).
export interface InlineHandlers {
  onMentionClick?: (username: string) => void;
  onHashtagClick?: (tag: string) => void;
}

const parseInline = (
  text: string,
  handlers: InlineHandlers = {},
  highlightRe: RegExp | null = null
): React.ReactNode[] => {
  const nodes: React.ReactNode[] = [];
  let index = 0;

  // Регулярные выражения для инлайн токенов
  // Порядок важен: более специфичные шаблоны идут первыми.
  // mention/hashtag — перед link/footnote, чтобы @/# не перехватывались ими.
  const patterns = [
    { type: 'code', regex: /^`([^`]+)`/ },
    { type: 'math', regex: /^\$([^\$]+)\$/ },
    { type: 'spoiler', regex: SPOILER_REGEX },
    { type: 'bold', regex: /^\*\*([^*]+)\*\*/ },
    { type: 'italic', regex: /^\*([^*]+)\*/ },
    { type: 'italic_under', regex: /^_([^_]+)_/ },
    { type: 'strike', regex: /^~~([^~]+)~~/ },
    { type: 'sup', regex: /^<sup>([^<]+)<\/sup>/ },
    { type: 'sub', regex: /^<sub>([^<]+)<\/sub>/ },
    { type: 'mention', regex: MENTION_REGEX },
    { type: 'hashtag', regex: HASHTAG_REGEX },
    { type: 'link', regex: /^\[([^\]]+)\]\(([^)]+)\)/ },
    { type: 'footnote', regex: /^\[\^([^\]]+)\]/ },
  ];

  while (index < text.length) {
    let matched = false;

    for (const pattern of patterns) {
      const match = text.slice(index).match(pattern.regex);
      if (match) {
        const fullMatchStr = match[0];
        
        // Рендерим подходящий инлайн элемент
        if (pattern.type === 'code') {
          nodes.push(
            <code key={index} className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-purple-300">
              {match[1]}
            </code>
          );
        } else if (pattern.type === 'math') {
          nodes.push(<InlineMath key={index} formula={match[1]} />);
        } else if (pattern.type === 'spoiler') {
          nodes.push(
            <SpoilerSpan key={index}>
              {parseInline(match[1], handlers, highlightRe)}
            </SpoilerSpan>
          );
        } else if (pattern.type === 'bold') {
          nodes.push(<strong key={index} className="font-bold text-white">{match[1]}</strong>);
        } else if (pattern.type === 'italic' || pattern.type === 'italic_under') {
          nodes.push(<em key={index} className="italic text-slate-200">{match[1]}</em>);
        } else if (pattern.type === 'strike') {
          nodes.push(<span key={index} className="line-through text-slate-400">{match[1]}</span>);
        } else if (pattern.type === 'sup') {
          nodes.push(<sup key={index} className="text-[10px] align-super text-purple-300">{match[1]}</sup>);
        } else if (pattern.type === 'sub') {
          nodes.push(<sub key={index} className="text-[10px] align-sub text-slate-400">{match[1]}</sub>);
        } else if (pattern.type === 'mention') {
          // CS-N2 email-защита: если символ перед '@' — буква/цифра, то это
          // часть email/идентификатора, не mention. Рендерим '@' как обычный
          // текст и сдвигаем на 1 (fullMatch не используем).
          const prevChar = index > 0 ? text[index - 1] : '';
          if (/[a-zA-Z0-9]/.test(prevChar)) {
            nodes.push('@');
            index++;
            matched = true;
            break;
          }
          const username = match[1];
          nodes.push(
            <span
              key={`mention-${index}`}
              onClick={() => handlers.onMentionClick?.(username)}
              className="text-purple-400 hover:text-purple-300 hover:underline cursor-pointer font-medium"
            >
              @{username}
            </span>
          );
        } else if (pattern.type === 'hashtag') {
          const tag = match[1];
          nodes.push(
            <span
              key={`hashtag-${index}`}
              onClick={() => handlers.onHashtagClick?.(tag)}
              className="text-sky-400 hover:text-sky-300 hover:underline cursor-pointer font-medium"
            >
              #{tag}
            </span>
          );
        } else if (pattern.type === 'link') {
          const url = match[2];
          if (!isSafeUrl(url)) {
            nodes.push(<span key={index}>{match[1]}</span>);
          } else {
            const isExternal = url.startsWith('http://') || url.startsWith('https://');
            nodes.push(
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-purple-400 hover:text-purple-300 underline break-all"
              >
                {match[1]}
                {isExternal && <ExternalLink size={10} className="inline opacity-70" />}
              </a>
            );
          }
        } else if (pattern.type === 'footnote') {
          const fnId = match[1];
          nodes.push(
            <a
              key={index}
              href={`#footnote-def-${fnId}`}
              id={`footnote-ref-${fnId}`}
              className="text-xs align-super text-purple-400 font-bold hover:text-purple-300 px-0.5"
            >
              [{fnId}]
            </a>
          );
        }

        index += fullMatchStr.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Если ни один токен не совпал, добавляем текущий символ как текст
      const lastNode = nodes[nodes.length - 1];
      if (typeof lastNode === 'string') {
        nodes[nodes.length - 1] = lastNode + text[index];
      } else {
        nodes.push(text[index]);
      }
      index++;
    }
  }

  const finalNodes: React.ReactNode[] = [];
  nodes.forEach((node, i) => {
    if (typeof node === 'string') {
      // Сначала linkify (находит URL), затем подсветка термина в не-URL строковых частях.
      const linkified = linkify(node, i);
      const keyBase = `node-${i}`;
      linkified.forEach((part, pIdx) => {
        if (typeof part === 'string') {
          finalNodes.push(...highlightInText(part, highlightRe, `${keyBase}-${pIdx}`));
        } else {
          finalNodes.push(part);
        }
      });
    } else {
      finalNodes.push(node);
    }
  });

  return finalNodes;
};

// --- Основной парсер блоков ---
interface RichBlock {
  type: 'paragraph' | 'heading' | 'list' | 'quote' | 'table' | 'code' | 'details' | 'math' | 'media' | 'footnote-def';
  level?: number; // для заголовков
  ordered?: boolean; // для списков
  items?: string[]; // для списков
  headers?: string[]; // для таблиц
  rows?: string[][]; // для таблиц
  code?: string; // для блоков кода
  language?: string; // для блоков кода
  formula?: string; // для блочного LaTeX
  mediaItems?: MediaItem[]; // для медиа галерей
  detailsTitle?: string; // для details
  detailsContent?: string; // для details
  footnoteId?: string; // для сносок
  content: string; // для сырого текста
}

export const RichText: React.FC<RichTextProps> = ({
  text,
  onMentionClick,
  onHashtagClick,
  highlightTerm,
  isHighlighted,
}) => {
  const [blocks, setBlocks] = useState<RichBlock[]>([]);

  // Регэксп подсветки поискового термина (M1.3). null — подсветка не применяется.
  const highlightRe = useMemo(
    () => buildHighlightRegex(highlightTerm || ''),
    [highlightTerm]
  );

  useEffect(() => {
    if (!text) {
      setBlocks([]);
      return;
    }

    const parsedBlocks: RichBlock[] = [];
    const lines = text.split(/\r?\n/);
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // 1. Блок LaTeX формул ($$ ... $$)
      if (line.trim().startsWith('$$')) {
        let formula = line.trim().substring(2);
        if (formula.endsWith('$$')) {
          formula = formula.substring(0, formula.length - 2);
          parsedBlocks.push({ type: 'math', formula: formula.trim(), content: line });
          i++;
          continue;
        } else {
          // Многострочная формула
          let multilineFormula = formula + '\n';
          i++;
          while (i < lines.length) {
            const currentLine = lines[i];
            if (currentLine.trim().endsWith('$$')) {
              multilineFormula += currentLine.trim().slice(0, -2);
              i++;
              break;
            }
            multilineFormula += currentLine + '\n';
            i++;
          }
          parsedBlocks.push({ type: 'math', formula: multilineFormula.trim(), content: multilineFormula });
          continue;
        }
      }

      // 2. Блоки кода (```)
      if (line.trim().startsWith('```')) {
        const lang = line.trim().substring(3).trim();
        let code = '';
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          code += lines[i] + '\n';
          i++;
        }
        i++; // Пропускаем закрывающие ```
        parsedBlocks.push({ type: 'code', code: code.trim(), language: lang, content: code });
        continue;
      }

      // 3. Details / Summary (:::details заголовок)
      if (line.trim().startsWith(':::details')) {
        const title = line.trim().substring(10).trim();
        let content = '';
        i++;
        while (i < lines.length && !lines[i].trim().startsWith(':::')) {
          content += lines[i] + '\n';
          i++;
        }
        i++; // Пропускаем :::
        parsedBlocks.push({
          type: 'details',
          detailsTitle: title || 'Подробнее',
          detailsContent: content.trim(),
          content: content,
        });
        continue;
      }

      // Поддержка HTML <details><summary>
      if (line.trim().startsWith('<details>')) {
        let title = 'Подробнее';
        let content = '';
        
        // Проверяем наличие summary в текущей или следующей строке
        let currentLine = line.replace('<details>', '').trim();
        if (currentLine.includes('<summary>')) {
          const match = currentLine.match(/<summary>(.*?)<\/summary>/);
          if (match) {
            title = match[1];
            currentLine = currentLine.replace(/<summary>.*?<\/summary>/, '').trim();
          }
        }
        
        content += currentLine + '\n';
        i++;

        while (i < lines.length && !lines[i].trim().includes('</details>')) {
          const l = lines[i];
          if (l.includes('<summary>')) {
            const match = l.match(/<summary>(.*?)<\/summary>/);
            if (match) {
              title = match[1];
              content += l.replace(/<summary>.*?<\/summary>/, '') + '\n';
            }
          } else {
            content += l + '\n';
          }
          i++;
        }
        if (i < lines.length) {
          content += lines[i].replace('</details>', '') + '\n';
          i++;
        }
        
        parsedBlocks.push({
          type: 'details',
          detailsTitle: title,
          detailsContent: content.trim(),
          content: content,
        });
        continue;
      }

      // 4. Заголовки (#)
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        parsedBlocks.push({
          type: 'heading',
          level: headingMatch[1].length,
          content: headingMatch[2].trim(),
        });
        i++;
        continue;
      }

      // 5. Блок цитат (>)
      if (line.trim().startsWith('>')) {
        let quoteContent = '';
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          quoteContent += lines[i].replace(/^>\s?/, '') + '\n';
          i++;
        }
        parsedBlocks.push({
          type: 'quote',
          content: quoteContent.trim(),
        });
        continue;
      }

      // 6. Списки (*, -, +, 1.)
      const listMatch = line.match(/^(\s*)([*+-]|\d+\.)\s+(.+)$/);
      if (listMatch) {
        const ordered = /^\d+/.test(listMatch[2]);
        const items: string[] = [];
        
        while (i < lines.length) {
          const currentLine = lines[i];
          const itemMatch = currentLine.match(/^(\s*)([*+-]|\d+\.)\s+(.+)$/);
          if (!itemMatch) break;
          items.push(itemMatch[3]);
          i++;
        }
        
        parsedBlocks.push({
          type: 'list',
          ordered: ordered,
          items: items,
          content: items.join('\n'),
        });
        continue;
      }

      // 7. Таблицы (|)
      if (line.trim().startsWith('|') && !line.trim().startsWith('||')) {
        const parseRow = (rowStr: string): string[] => {
          return rowStr
            .split('|')
            .slice(1, -1)
            .map((cell) => cell.trim());
        };

        const headers = parseRow(line);
        const rows: string[][] = [];
        i++;

        // Проверяем разделительную строку (например, |---|---|)
        if (i < lines.length && lines[i].trim().startsWith('|')) {
          const separatorRow = parseRow(lines[i]);
          const isSeparator = separatorRow.every((cell) => /^:?-+:?$/.test(cell));
          if (isSeparator) {
            i++; // Пропускаем разделитель
          } else {
            // Если разделителя нет, считаем вторую строку обычной строкой
            rows.push(headers);
            // сбрасываем заголовки, делаем таблицу без заголовков
            parsedBlocks.push({
              type: 'table',
              headers: [],
              rows: rows,
              content: line,
            });
            continue;
          }
        }

        while (i < lines.length && lines[i].trim().startsWith('|')) {
          rows.push(parseRow(lines[i]));
          i++;
        }

        parsedBlocks.push({
          type: 'table',
          headers: headers,
          rows: rows,
          content: line,
        });
        continue;
      }

      // 8. Определение сносок ([^1]: описание)
      const footnoteDefMatch = line.match(/^\[\^([^\]]+)\]:\s+(.+)$/);
      if (footnoteDefMatch) {
        parsedBlocks.push({
          type: 'footnote-def',
          footnoteId: footnoteDefMatch[1],
          content: footnoteDefMatch[2].trim(),
        });
        i++;
        continue;
      }

      // 9. Блок изображений / медиагалерей
      // Если строка состоит ИСКЛЮЧИТЕЛЬНО из изображений (одного или нескольких)
      const mediaRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
      const cleanLine = line.trim();
      const mediaMatches = [...cleanLine.matchAll(mediaRegex)];
      
      // Проверяем, заполнена ли вся строка только картинками
      const isOnlyMedia = mediaMatches.length > 0 && 
        cleanLine.replace(mediaRegex, '').replace(/\s+/g, '') === '';

      if (isOnlyMedia) {
        const mediaItems = mediaMatches.map((m) => ({
          alt: m[1] || '',
          url: m[2],
        }));
        parsedBlocks.push({
          type: 'media',
          mediaItems: mediaItems,
          content: line,
        });
        i++;
        continue;
      }

      // 10. Обычный параграф текста
      if (line.trim() !== '') {
        parsedBlocks.push({
          type: 'paragraph',
          content: line,
        });
      }
      i++;
    }

    setBlocks(parsedBlocks);
  }, [text]);

  // Сбор всех определений сносок в конце для вывода внизу сообщения
  const footnoteDefs = blocks.filter((b) => b.type === 'footnote-def');
  const contentBlocks = blocks.filter((b) => b.type !== 'footnote-def');

  return (
    <div className="rich-text-message space-y-2 text-slate-100">
      {contentBlocks.map((block, idx) => {
        switch (block.type) {
          case 'heading': {
            const level = block.level || 1;
            const Tag = `h${Math.min(level, 6)}` as React.ElementType;
            const anchorId = generateAnchorId(block.content);
            const classes = [
              'font-semibold tracking-tight text-white mt-4 mb-2 group flex items-center gap-1.5 transition-colors',
              level === 1 && 'text-2xl border-b border-white/10 pb-1',
              level === 2 && 'text-xl border-b border-white/5 pb-0.5',
              level === 3 && 'text-lg',
              level === 4 && 'text-base',
              level >= 5 && 'text-sm text-slate-300',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <Tag key={idx} id={anchorId} className={classes}>
                {parseInline(block.content, {}, highlightRe)}
                <a
                  href={`#${anchorId}`}
                  className="opacity-0 group-hover:opacity-60 transition text-purple-400 text-xs font-normal"
                >
                  #
                </a>
              </Tag>
            );
          }

          case 'quote':
            return (
              <blockquote
                key={idx}
                className="my-3 border-l-4 border-purple-500/80 bg-white/5 px-4 py-2.5 rounded-r-xl italic text-slate-300 backdrop-blur-sm"
              >
                {block.content.split('\n').map((line, qidx) => (
                  <p key={qidx} className={qidx > 0 ? 'mt-1' : ''}>
                    {parseInline(line, {}, highlightRe)}
                  </p>
                ))}
              </blockquote>
            );

          case 'list': {
            const ListTag = block.ordered ? 'ol' : 'ul';
            const listClasses = block.ordered
              ? 'list-decimal list-inside space-y-1 my-2 pl-4 text-slate-300'
              : 'list-disc list-inside space-y-1 my-2 pl-4 text-slate-300';

            return (
              <ListTag key={idx} className={listClasses}>
                {block.items?.map((item, itemIdx) => (
                  <li key={itemIdx} className="leading-relaxed">
                    <span className="text-slate-200">{parseInline(item, {}, highlightRe)}</span>
                  </li>
                ))}
              </ListTag>
            );
          }

          case 'table':
            return (
              <div key={idx} className="my-4 overflow-x-auto rounded-xl border border-white/10 bg-slate-900/20 backdrop-blur-md">
                <table className="min-w-full divide-y divide-white/10 text-sm">
                  {block.headers && block.headers.length > 0 && (
                    <thead className="bg-slate-900/60 text-slate-200 font-semibold">
                      <tr>
                        {block.headers.map((header, hIdx) => (
                          <th key={hIdx} className="px-4 py-2.5 text-left font-semibold">
                            {parseInline(header, {}, highlightRe)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {block.rows?.map((row, rIdx) => (
                      <tr key={rIdx} className="transition hover:bg-white/5">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-4 py-2">
                            {parseInline(cell, {}, highlightRe)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case 'code':
            return <CodeBlock key={idx} code={block.code || ''} language={block.language} />;

          case 'math':
            return <BlockMath key={idx} formula={block.formula || ''} />;

          case 'media':
            return <MediaGallery key={idx} items={block.mediaItems || []} />;

          case 'details':
            return (
              <Accordion key={idx} title={parseInline(block.detailsTitle || 'Подробнее', {}, highlightRe)}>
                <RichText text={block.detailsContent || ''} />
              </Accordion>
            );

          case 'paragraph':
          default:
            return (
              <p key={idx} className="leading-relaxed whitespace-pre-wrap text-slate-200">
                {parseInline(block.content, { onMentionClick, onHashtagClick }, highlightRe)}
              </p>
            );
        }
      })}

      {/* Вывод сносок внизу сообщения */}
      {footnoteDefs.length > 0 && (
        <div className="mt-4 border-t border-white/10 pt-2.5 text-xs text-slate-400 space-y-1">
          {footnoteDefs.map((def, fidx) => (
            <div key={fidx} id={`footnote-def-${def.footnoteId}`} className="flex items-start gap-1">
              <span className="font-semibold text-purple-400">[{def.footnoteId}]</span>
              <span className="flex-1 leading-relaxed">
                {parseInline(def.content, {}, highlightRe)}
                <a
                  href={`#footnote-ref-${def.footnoteId}`}
                  className="text-purple-400 hover:text-purple-300 ml-1 font-bold no-underline"
                >
                  ↩
                </a>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
