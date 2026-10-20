/**
 * Universal Pulse Engine — Core Type Definitions (Frontend)
 * Полная типизация для универсального конструктора инициатив, консенсуса, взаимопомощи и сделок.
 * Соответствует RFC-001, Protobuf v3 и W3C JSON-LD 1.1 схемам.
 */

export type IntentDomain =
  | 'consensus'
  | 'aid'
  | 'gig'
  | 'p2p'
  | 'escrow'
  | 'whistleblow';

export type IntentStatus =
  | 'active'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired';

export type CurrencyType = 'TON' | 'USDT' | string;

// -----------------------------------------------------------------------------
// Автор и идентификация (Intent Author)
// -----------------------------------------------------------------------------

export interface IntentAuthor {
  address?: string;             // TON-адрес или публичный идентификатор кошелька
  ephemeralPubkey?: string;      // Одноразовый публичный ключ Curve25519 для ZK / blind rendezvous
  displayName?: string;          // Отображаемое имя или псевдоним
  reputationScore?: number;      // Оценка репутации (0..100)
  isAnonymous?: boolean;         // Флаг полной анонимности
  avatarUrl?: string;            // Опциональный URL аватара
}

// -----------------------------------------------------------------------------
// Пространственная фильтрация (Spatial Location / H3)
// -----------------------------------------------------------------------------

export interface SpatialFilter {
  h3Index?: string;              // Uber H3 индекс (Res 7-9, базовый Res 8)
  latitude?: number;             // Широта (-90.0 .. +90.0)
  longitude?: number;            // Долгота (-180.0 .. +180.0)
  radiusKm?: number;             // Радиус окрестного поиска в километрах
  label?: string;                // Текстовая метка (город, район, ориентир)
  resolution?: number;           // Разрешение H3 (по умолчанию 8)
}

export type SpatialLocation = SpatialFilter;

// -----------------------------------------------------------------------------
// Доменные полезные нагрузки (Interaction Payloads)
// -----------------------------------------------------------------------------

export interface PollOption {
  id: string;
  title: string;
  voteCount: number;
}

export interface PollInteraction {
  quorum: number;                // Минимальный кворум для принятия решения
  votesFor: number;              // Количество голосов 'ЗА'
  votesAgainst: number;          // Количество голосов 'ПРОТИВ'
  userVoted?: 'for' | 'against' | null; // Голос текущего пользователя
  options?: PollOption[];        // Для мультивариантного голосования
  allowMultipleOptions?: boolean;
}

export interface AidInteraction {
  targetAmount: number;          // Целевая сумма сбора
  collectedAmount: number;       // Фактически собранная сумма
  currency: 'TON' | 'USDT' | string; // Валюта сбора
  recipient: string;             // Адрес получателя или мультисиг
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  donorsCount?: number;          // Количество доноров
}

export interface GigInteraction {
  budget: number;                // Бюджет вознаграждения
  currency: 'TON' | 'USDT' | string; // Валюта вознаграждения
  deadline?: string;             // ISO-8601 дата дедлайна
  applicantCount: number;        // Количество откликов исполнителей
  requiredSkills?: string[];     // Требуемые навыки и специализация
  escrowProtected?: boolean;     // Защита через смарт-контракт эскроу
}

export interface P2PInteraction {
  offerCurrency: string;         // Отдаваемая валюта (TON, USDT, RUB_CASH, USD_CASH)
  offerAmount: number;           // Отдаваемая сумма
  receiveCurrency: string;       // Получаемая валюта
  receiveAmount: number;         // Получаемая сумма
  rate?: number;                 // Обменный курс
  paymentMethod?: string;        // Способ расчета (Наличные, СБП, SEPA, Банковский перевод)
  minLimit?: number;             // Минимальный лимит частичной сделки
  maxLimit?: number;             // Максимальный лимит частичной сделки
}

export interface EscrowStage {
  id: number;                    // Порядковый номер транша (1, 2, 3...)
  title: string;                 // Название этапа
  amount: number;                // Сумма транша
  status: 'completed' | 'active' | 'pending'; // Статус выполнения
  description?: string;          // Описание критериев приемки
  completedAt?: string;          // ISO-8601 дата закрытия транша
  oracleProof?: string;          // Доказательство выполнения от оракула
}

export interface EscrowInteraction {
  stage: number;                 // Текущий активный этап (0-based индекс)
  totalStages: number;           // Всего этапов в контракте
  stages: EscrowStage[];         // Список этапов/траншей
  collateralPercent?: number;    // Процент залога сторон (например, 10%)
  oracleType?: string;           // Тип оракула (SGS, Bureau Veritas, TLSNotary, Arbiter)
  buyerAddress?: string;         // Адрес покупателя/заказчика
  sellerAddress?: string;        // Адрес продавца/исполнителя
  arbiterAddress?: string;       // Адрес независимого арбитра
}

export interface WhistleblowInteraction {
  thresholdSignatures: number;   // Порог подписей для авто-раскрытия (t-of-n)
  currentSignatures: number;     // Текущее количество криптографических подписей
  decryptedPayload?: string;     // Расшифрованный текст/доказательство (после порога)
  isEncrypted: boolean;          // Флаг шифрования данных
  encryptedBlob?: string;        // Зашифрованный шифротекст (Base64)
  ipfsCid?: string;              // IPFS CID архив доказательств
  signersList?: string[];        // Хэши публичных ключей подписавших
}

export interface InteractionPayloads {
  poll?: PollInteraction;
  aid?: AidInteraction;
  gig?: GigInteraction;
  p2p?: P2PInteraction;
  escrow?: EscrowInteraction;
  whistleblow?: WhistleblowInteraction;
}

// -----------------------------------------------------------------------------
// Политики доверия и безопасность (Trust & ZK Policy)
// -----------------------------------------------------------------------------

export interface TrustPolicy {
  minReputation?: number;        // Минимальный репутационный скор (0..100)
  requireH3Match?: boolean;      // Требовать строгого совпадения гео-ячейки
  zkSolvencyRequired?: boolean;  // Требовать ZK-доказательство платежеспособности
  minBalance?: number;           // Минимальный подтвержденный баланс в TON
  minDepositAgeDays?: number;    // Минимальный возраст депозита
  nullifierHash?: string;        // Хэш нуллификатора ZK
}

// -----------------------------------------------------------------------------
// Конфигурация расчетов (Settlement Layer)
// -----------------------------------------------------------------------------

export interface SettlementConfig {
  currency: 'TON' | 'USDT' | string;
  amount: number;
  collateralRequired?: boolean;
  collateralAmount?: number;
  escrowContractAddress?: string;
  slashingRule?: string;         // Правило списания залога (S1-S5)
}

// -----------------------------------------------------------------------------
// Главная полиморфная сущность UniversalPulseIntent
// -----------------------------------------------------------------------------

export interface UniversalPulseIntent {
  id: string;                    // UUIDv7 или BLAKE3 хэш
  title: string;                 // Заголовок намерения
  description: string;           // Детальное описание
  domain: IntentDomain;          // Домен взаимодействия
  author: IntentAuthor;          // Автор / создатель
  spatial?: SpatialFilter;       // Гео-локация и H3
  interaction: InteractionPayloads; // Доменная полезная нагрузка
  trustPolicy?: TrustPolicy;     // Требования доверия
  settlement?: SettlementConfig; // Финансовые расчеты
  status: IntentStatus;          // Жизненный цикл
  createdAt: string;             // ISO-8601 дата создания
  expiresAt?: string;            // ISO-8601 дата экспирации
  tags: string[];                // Семантические теги
  simhash?: string;              // 64-bit SimHash (16 hex символов)
}

// -----------------------------------------------------------------------------
// Состояния фильтрации ленты и поиска
// -----------------------------------------------------------------------------

export interface PulseFilterState {
  domain?: IntentDomain | 'all';
  searchQuery?: string;
  h3Index?: string;
  radiusKm?: number;
  latitude?: number;
  longitude?: number;
  status?: IntentStatus | 'all';
  minReputation?: number;
  zkSolvencyOnly?: boolean;
  sortBy?: 'newest' | 'relevance' | 'distance' | 'votes' | 'amount';
  tags?: string[];
}

// -----------------------------------------------------------------------------
// Пресеты для быстрого создания (30-sec Quick Presets)
// -----------------------------------------------------------------------------

export interface PulsePreset {
  id: string;
  domain: IntentDomain;
  title: string;
  description: string;
  iconName: string;
  categoryLabel: string;
  defaultTags: string[];
  defaultPayload: Partial<UniversalPulseIntent>;
}

// -----------------------------------------------------------------------------
// API Request & Response DTOs
// -----------------------------------------------------------------------------

export interface CreatePulseIntentRequest {
  title: string;
  description: string;
  domain: IntentDomain;
  author?: IntentAuthor;
  spatial?: SpatialFilter;
  interaction: InteractionPayloads;
  trustPolicy?: TrustPolicy;
  settlement?: SettlementConfig;
  tags?: string[];
  expiresAt?: string;
}

export interface UpdatePulseIntentRequest {
  title?: string;
  description?: string;
  status?: IntentStatus;
  interaction?: Partial<InteractionPayloads>;
  tags?: string[];
}

export interface VotePulseIntentRequest {
  vote: 'for' | 'against' | string;
  voterAddress?: string;
  signature?: string;
  zkProof?: string;
  nullifier?: string;
  amount?: number | string;
  donationAmount?: number | string;
}

export interface AdvanceEscrowRequest {
  stageId: number;
  action: 'complete' | 'dispute' | 'release';
  proof?: string;
  callerAddress?: string;
}

export interface PulseMatchResult {
  intent: UniversalPulseIntent;
  simhashSimilarity: number;     // 0.0 .. 1.0
  hammingDistance: number;       // 0 .. 64
  distanceKm?: number;           // Расстояние по сферической геометрии
  matchScore: number;            // Общий взвешенный скор
  score?: number;                // Alias для matchScore
}

export interface PulseMatchResponse {
  queryIntentId?: string;
  matches: PulseMatchResult[];
  totalMatches: number;
}

export interface ZkSolvencyRequest {
  userAddress: string;
  minAmountTon: number;
  proof: string;
  publicInputs: string[];
}

export interface ZkSolvencyResponse {
  verified: boolean;
  attestationId: string;
  minAmountTon: number;
  verifiedAt: string;
  nullifierHash: string;
  expiresInHours: number;
}
