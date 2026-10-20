/**
 * Утилиты для форматирования дат в чате (Telegram-style)
 */
import i18n from '../i18n/config';

const MONTHS_RU = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря'
];

const SHORT_WEEKDAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

const SHORT_MONTHS_RU = [
  'янв',
  'фев',
  'мар',
  'апр',
  'мая',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек'
];

function getActiveLang(): string {
  const lang = (i18n?.language || localStorage.getItem('gossip_lang') || 'ru').toLowerCase();
  return lang.split('-')[0] || 'ru';
}

/**
 * Преобразует timestamp или строку даты в объект Date.
 */
export function parseTimestamp(ts: number | string | undefined | null): Date | null {
  if (!ts) return null;
  if (typeof ts === 'number') {
    if (ts <= 0 || isNaN(ts)) return null;
    return ts < 10000000000 ? new Date(ts * 1000) : new Date(ts);
  }
  const str = String(ts).trim();
  if (!str) return null;
  
  // Если это числовая строка (timestamp)
  const num = Number(str);
  if (!isNaN(num) && num > 0) {
    return num < 10000000000 ? new Date(num * 1000) : new Date(num);
  }

  // Пробуем распарсить как ISO / Date строку
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Проверяет, относятся ли два timestamp к одному календарному дню.
 */
export function isSameDay(ts1: number | string | undefined, ts2: number | string | undefined): boolean {
  const d1 = parseTimestamp(ts1);
  const d2 = parseTimestamp(ts2);
  if (!d1 || !d2) return false;

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Форматирует дату для разделителя в чате или плавающего стикера:
 * - "Сегодня"
 * - "Вчера"
 * - "15 августа" (для текущего года)
 * - "12 мая 2024 г." (для прошлых/будущих лет)
 */
export function formatDateDivider(timestamp: number | string | undefined): string {
  const lang = getActiveLang();
  const todayLabel = lang === 'ru' ? 'Сегодня' : i18n.t('common:time.today', 'Today');
  const yesterdayLabel = lang === 'ru' ? 'Вчера' : i18n.t('common:time.yesterday', 'Yesterday');

  const date = parseTimestamp(timestamp);
  if (!date) return todayLabel;

  const now = new Date();
  
  // Проверка на "Сегодня"
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (isToday) return todayLabel;

  // Проверка на "Вчера"
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (isYesterday) return yesterdayLabel;

  const isCurrentYear = date.getFullYear() === now.getFullYear();

  if (lang !== 'ru') {
    try {
      return new Intl.DateTimeFormat(lang, isCurrentYear
        ? { day: 'numeric', month: 'long' }
        : { day: 'numeric', month: 'long', year: 'numeric' }
      ).format(date);
    } catch {
      // Fallback below
    }
  }

  const day = date.getDate();
  const month = MONTHS_RU[date.getMonth()] || '';

  if (isCurrentYear) {
    return `${day} ${month}`;
  }

  return `${day} ${month} ${date.getFullYear()} г.`;
}

/**
 * Форматирует время последнего сообщения/активности для списка чатов (Telegram-style):
 * - Сегодня: "14:25" (HH:mm)
 * - Вчера и последние 6 дней: "Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"
 * - Ранее в этом году: "17 авг" (D MMM)
 * - Прошлые годы: "17.08.24" (DD.MM.YY)
 */
export function formatChatTimestamp(ts: number | string | undefined | null): string {
  if (!ts) return '';

  // Если передано простое готовое время "14:25" без даты
  if (typeof ts === 'string') {
    const trimmed = ts.trim();
    if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
      return trimmed;
    }
  }

  const date = parseTimestamp(ts);
  if (!date) {
    return typeof ts === 'string' && ts.length <= 10 ? ts : '';
  }

  const now = new Date();
  
  // Проверка на "Сегодня" (тот же календарный день)
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // Начало сегодняшнего дня (00:00:00.000)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMsgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysDiff = Math.round((startOfToday - startOfMsgDay) / msPerDay);

  // Последние 6 дней (вчера и ранее на этой неделе) -> "Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"
  const lang = getActiveLang();
  if (daysDiff >= 1 && daysDiff <= 6) {
    if (lang !== 'ru') {
      try {
        return new Intl.DateTimeFormat(lang, { weekday: 'short' }).format(date);
      } catch {
        // fallback
      }
    }
    return SHORT_WEEKDAYS_RU[date.getDay()] || '';
  }

  // Текущий календарный год (более 6 дней назад) -> "17 авг"
  if (date.getFullYear() === now.getFullYear()) {
    if (lang !== 'ru') {
      try {
        return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }).format(date);
      } catch {
        // fallback
      }
    }
    const day = date.getDate();
    const month = SHORT_MONTHS_RU[date.getMonth()] || '';
    return `${day} ${month}`;
  }

  // Прошлые годы -> "17.08.25"
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
}
