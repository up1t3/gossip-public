/**
 * Universal Pulse Engine — Quick Presets Configuration (30-Second Flow)
 * Конфигурация готовых пресетов для мгновенного создания намерений в 1 клик.
 * Включает умные дефолты для всех 6 доменов взаимодействия.
 */

import { PulsePreset, IntentDomain, UniversalPulseIntent } from './types';

export const PULSE_PRESETS: PulsePreset[] = [
  {
    id: 'quick_poll',
    domain: 'consensus',
    title: 'Опрос / Гражданская инициатива',
    description: 'Локальное или глобальное пороговое голосование с ZK-подтверждением голосов.',
    iconName: 'Scale',
    categoryLabel: 'Консенсус & Опросы',
    defaultTags: ['опрос', 'голосование', 'кворум', 'zk-vote'],
    defaultPayload: {
      domain: 'consensus',
      title: 'Инициатива благоустройства района / Опрос сообщества',
      description: 'Собираем мнения жителей и формируем коллективное решение с пороговым консенсусом.',
      interaction: {
        poll: {
          quorum: 50,
          votesFor: 0,
          votesAgainst: 0,
          options: [
            { id: 'opt_1', title: 'Поддержать инициативу (ЗА)', voteCount: 0 },
            { id: 'opt_2', title: 'Отклонить инициативу (ПРОТИВ)', voteCount: 0 },
          ],
        },
      },
      trustPolicy: {
        minReputation: 10,
        requireH3Match: false,
      },
    },
  },
  {
    id: 'mutual_aid',
    domain: 'aid',
    title: 'Сбор средств / Взаимопомощь',
    description: 'Прозрачный краудфандинг и адресная помощь на базе блокчейна TON с прозрачной отчетностью.',
    iconName: 'HeartHandshake',
    categoryLabel: 'Взаимопомощь & Сборы',
    defaultTags: ['помощь', 'краудфандинг', 'ton', 'донаты'],
    defaultPayload: {
      domain: 'aid',
      title: 'Сбор средств на гуманитарную помощь / общественный проект',
      description: 'Адресный сбор средств с автоматическим учетом всех донатов и ончейн-прозрачностью.',
      interaction: {
        aid: {
          targetAmount: 500,
          collectedAmount: 0,
          currency: 'TON',
          recipient: '',
          urgencyLevel: 'medium',
          donorsCount: 0,
        },
      },
      settlement: {
        currency: 'TON',
        amount: 500,
      },
    },
  },
  {
    id: 'gig_task',
    domain: 'gig',
    title: 'Поиск исполнителя / Гиг-задача',
    description: 'Заказ на разработку, аудит или услуги с фиксацией вознаграждения в смарт-контракте.',
    iconName: 'Briefcase',
    categoryLabel: 'Карьера & Задачи',
    defaultTags: ['работа', 'гиг', 'разработка', 'freelance', 'escrow'],
    defaultPayload: {
      domain: 'gig',
      title: 'Разработка смарт-контракта / Frontend-компонента',
      description: 'Требуется опытный специалист. Оплата защищена смарт-эскроу после успешной приемки.',
      interaction: {
        gig: {
          budget: 1500,
          currency: 'USDT',
          applicantCount: 0,
          requiredSkills: ['TypeScript', 'React', 'TON / Tact'],
          escrowProtected: true,
        },
      },
      settlement: {
        currency: 'USDT',
        amount: 1500,
        collateralRequired: true,
        collateralAmount: 150,
      },
    },
  },
  {
    id: 'p2p_deal',
    domain: 'p2p',
    title: 'P2P Обмен / Наличные & Ликвидность',
    description: 'Безопасный слепой обмен валют, наличных или криптоактивов без посредников.',
    iconName: 'Coins',
    categoryLabel: 'P2P Ликвидность',
    defaultTags: ['p2p', 'обмен', 'usdt', 'наличные', 'ликвидность'],
    defaultPayload: {
      domain: 'p2p',
      title: 'Обмен USDT на наличные RUB (Личная встреча / Курьер)',
      description: 'Быстрый расчет в безопасном месте. Подтверждение платежеспособности через ZK-Proof.',
      interaction: {
        p2p: {
          offerCurrency: 'USDT',
          offerAmount: 2000,
          receiveCurrency: 'RUB_CASH',
          receiveAmount: 185000,
          rate: 92.5,
          paymentMethod: 'Наличные в офисе / Банк',
          minLimit: 500,
          maxLimit: 2000,
        },
      },
      trustPolicy: {
        zkSolvencyRequired: true,
        minBalance: 50,
      },
      settlement: {
        currency: 'USDT',
        amount: 2000,
      },
    },
  },
  {
    id: 'whistleblow',
    domain: 'whistleblow',
    title: 'Анонимное расследование (Whistleblow)',
    description: 'Публикация зашифрованных доказательств с пороговым авто-раскрытием (t-of-n подписей).',
    iconName: 'ShieldAlert',
    categoryLabel: 'Анонимные Расследования',
    defaultTags: ['whistleblow', 'расследование', 'анонимность', 'zk-proof', 't-of-n'],
    defaultPayload: {
      domain: 'whistleblow',
      title: 'Анонимные материалы расследования (Зашифровано t-of-n)',
      description: 'Доказательства коррупции / нарушений. Будут автоматически расшифрованы после сбора порогового числа независимых подписей.',
      interaction: {
        whistleblow: {
          thresholdSignatures: 10,
          currentSignatures: 0,
          isEncrypted: true,
        },
      },
      author: {
        isAnonymous: true,
        displayName: 'Anonymous Whistleblower',
      },
      trustPolicy: {
        minReputation: 0,
      },
    },
  },
  {
    id: 'smart_escrow',
    domain: 'escrow',
    title: '4-фазный DvP Смарт-Эскроу (ВЭД & Поставки)',
    description: 'Поэтапное финансирование сделок и международных поставок с подтверждением через оракулов SGS/AIS.',
    iconName: 'Anchor',
    categoryLabel: 'ВЭД & Смарт-Эскроу',
    defaultTags: ['escrow', 'вэд', 'dvp', 'смарт-контракт', 'sgs-oracle'],
    defaultPayload: {
      domain: 'escrow',
      title: 'Поставка партии товара (FOB Порт Новороссийск -> Порт назначения)',
      description: 'Четырехфазный контракт Delivery vs Payment с оракульной верификацией судовых накладных.',
      interaction: {
        escrow: {
          stage: 0,
          totalStages: 4,
          collateralPercent: 10,
          oracleType: 'sgs_inspection',
          stages: [
            { id: 1, title: 'Фаза 1: Депонирование залогов и средств', amount: 25000, status: 'active', description: 'Покупатель депонирует 100% суммы, продавец 10% залога' },
            { id: 2, title: 'Фаза 2: Таможенная декларация & Инспекция SGS', amount: 25000, status: 'pending', description: 'Оракул SGS подтверждает сертификат качества' },
            { id: 3, title: 'Фаза 3: Погрузка на судно (AIS SOLAS трекинг)', amount: 25000, status: 'pending', description: 'Спутниковый трекер фиксирует выход в рейс' },
            { id: 4, title: 'Фаза 4: Приемка груза в порту назначения & Финальный расчет', amount: 25000, status: 'pending', description: 'Разблокировка средств и возвращение залогов' },
          ],
        },
      },
      settlement: {
        currency: 'USDT',
        amount: 100000,
        collateralRequired: true,
        collateralAmount: 10000,
      },
    },
  },
];

/**
 * Получение пресета по его идентификатору
 */
export function getPresetById(id: string): PulsePreset | undefined {
  return PULSE_PRESETS.find((p) => p.id === id);
}

/**
 * Получение пресетов для определенного домена
 */
export function getPresetsByDomain(domain: IntentDomain): PulsePreset[] {
  return PULSE_PRESETS.filter((p) => p.domain === domain);
}

/**
 * Создание начального шаблона намерения из пресета
 */
export function buildInitialIntentFromPreset(preset: PulsePreset): Partial<UniversalPulseIntent> {
  return {
    title: preset.defaultPayload.title || preset.title,
    description: preset.defaultPayload.description || preset.description,
    domain: preset.domain,
    author: {
      displayName: 'Суверенный участник',
      isAnonymous: true,
      ...preset.defaultPayload.author,
    },
    spatial: {
      label: 'Москва, РФ',
      radiusKm: 15,
      ...preset.defaultPayload.spatial,
    },
    interaction: {
      ...preset.defaultPayload.interaction,
    },
    trustPolicy: {
      minReputation: 10,
      zkSolvencyRequired: false,
      minDepositAgeDays: 3,
      ...preset.defaultPayload.trustPolicy,
    },
    settlement: {
      currency: 'TON',
      amount: 0,
      ...preset.defaultPayload.settlement,
    },
    tags: [...preset.defaultTags],
    status: 'active',
  };
}
