/**
 * Построение безопасного регэкспа для подсветки поискового термина.
 *
 *  - термин-пустышка (или только пробелы) → null (вызывающий код пропускает подсветку);
 *  - регэксп-метасимволы в термине экранируются (точка — литеральная точка, не «любой символ»);
 *  - флаги: global (несколько вхождений), ignoreCase (поиск без учёта регистра).
 *
 * Без side-effect-импортов — Playwright-импортируемо напрямую.
 */
export function buildHighlightRegex(term: string): RegExp | null {
  const trimmed = term.trim();
  if (trimmed === '') return null;

  // Экранируем все регэксп-метасимволы. Источник паттерна: MDN.
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'gi');
}
