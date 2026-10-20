import React from 'react';

export interface TypingUser {
  id: string;
  name: string;
}

export interface TypingIndicatorProps {
  typingUsers: TypingUser[];
}

/**
 * Форматирование текста индикатора для списка имён.
 * До 3 имён — перечисление, дальше «и другие». Вынесено в чистую функцию
 * для возможности unit/E2E-тестирования без монтирования компонента.
 *
 * 1 пользователь:  «Иван печатает…»
 * 2 пользователя:  «Иван, Мария печатают…»
 * 3 пользователя:  «Иван, Мария, Петр печатают…»
 * 4+:              «Иван, Мария и другие печатают…»
 */
export function formatTypingText(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) {
    return `${names[0]} печатает…`;
  }
  if (names.length === 2) {
    return `${names[0]}, ${names[1]} печатают…`;
  }
  if (names.length === 3) {
    return `${names[0]}, ${names[1]}, ${names[2]} печатают…`;
  }
  return `${names[0]}, ${names[1]} и другие печатают…`;
}

/**
 * Индикатор «печатает…» для шапки чата.
 * Показывает анимированные точки + текст. Возвращает null, если никто не печатает.
 */
export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
  if (typingUsers.length === 0) return null;
  const text = formatTypingText(typingUsers.map((u) => u.name));

  return (
    <div className="text-[11px] text-slate-400 italic flex items-center gap-1.5 truncate min-w-0">
      <span className="inline-flex gap-0.5 items-end h-3 flex-shrink-0">
        <span
          className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </span>
      <span className="truncate">{text}</span>
    </div>
  );
};
