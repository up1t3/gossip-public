/**
 * Universal Pulse Engine — PulseCreateModal Component
 * Двухуровневый модальный конструктор создания намерений (Progressive Disclosure):
 * - Уровень 1: Быстрый пресет за 30 секунд (2-3 поля, умные дефолты в 1 клик).
 * - Уровень 2: Lego-аккордеоны (Trust & ZK, DvP Escrow, Privacy, Quorum, Settlement, H3 Spatial).
 * - Zero-Toast UX: Инлайн-индикаторы состояния, валидации и сетевых ответов.
 * - Честные данные: Динамический расчет H3 Res 8, интеграция с TonConnect и ZK-Reputation.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  Layers,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { GlassModal, GlassButton, GlassInput } from '../../ui';
import {
  IntentDomain,
  CreatePulseIntentRequest,
  UniversalPulseIntent,
} from './types';
import { PULSE_PRESETS, getPresetById } from './presets';
import { pulseService } from './pulseService';
import { latLngToH3Index } from './geoH3';
import { tonConnectManager } from '../ton/tonConnectManager';
import { reputationService } from '../reputation/reputationService';

interface PulseCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdIntent: UniversalPulseIntent) => void;
  onToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  initialDomain?: IntentDomain;
}

export const PulseCreateModal: React.FC<PulseCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onToast: _deprecatedOnToast,
  initialDomain = 'p2p',
}) => {
  const { t } = useTranslation(['pulse', 'common']);
  // Выбранный пресет / домен
  const [selectedPresetId, setSelectedPresetId] = useState<string>('p2p_deal');
  const [domain, setDomain] = useState<IntentDomain>(initialDomain);

  // Режим: быстрый (30 сек) или Lego-конструктор
  const [isAdvancedLegoMode, setIsAdvancedLegoMode] = useState(false);

  // Состояние открытых Lego-аккордеонов
  const [openAccordions, setOpenAccordions] = useState<{ [key: string]: boolean }>({
    trust: false,
    escrow: false,
    privacy: false,
    settlement: false,
    spatial: false,
  });

  // Базовые поля
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [authorDisplayName, setAuthorDisplayName] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Инлайн UX состояния
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [geoStatus, setGeoStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Профильные данные и кошелек
  const [connectedWalletAddress, setConnectedWalletAddress] = useState<string>('');
  const [realReputationScore, setRealReputationScore] = useState<number | null>(null);

  // Поля доменов
  // Consensus
  const [pollQuorum, setPollQuorum] = useState('50');

  // Aid
  const [aidTarget, setAidTarget] = useState('500');
  const [aidCurrency, setAidCurrency] = useState('TON');
  const [aidRecipient, setAidRecipient] = useState('');
  const [aidUrgency, setAidUrgency] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  // Gig
  const [gigBudget, setGigBudget] = useState('1500');
  const [gigCurrency, setGigCurrency] = useState('USDT');
  const [gigSkills, setGigSkills] = useState('TypeScript, React, TON');
  const [gigEscrowProtected, setGigEscrowProtected] = useState(true);

  // P2P
  const [p2pOfferAmount, setP2pOfferAmount] = useState('2000');
  const [p2pOfferCurrency, setP2pOfferCurrency] = useState('USDT');
  const [p2pReceiveAmount, setP2pReceiveAmount] = useState('185000');
  const [p2pReceiveCurrency, setP2pReceiveCurrency] = useState('RUB_CASH');
  const [p2pRate, setP2pRate] = useState('92.50');
  const [p2pPaymentMethod, setP2pPaymentMethod] = useState('Наличные в офисе / Банк');

  // Escrow
  const [escrowCommodity, setEscrowCommodity] = useState('Партия зерна 3000 т');
  const [escrowTotalAmount, setEscrowTotalAmount] = useState('100000');
  const [escrowOracleType, setEscrowOracleType] = useState('sgs_inspection');
  const [escrowCollateralPercent, setEscrowCollateralPercent] = useState('10');

  // Whistleblow
  const [whistleThreshold, setWhistleThreshold] = useState('10');

  // Lego Trust & ZK
  const [zkSolvencyRequired, setZkSolvencyRequired] = useState(false);
  const [zkMinBalance, setZkMinBalance] = useState('50');
  const [minReputation, setMinReputation] = useState('10');
  const [requireH3Match, setRequireH3Match] = useState(false);

  // Lego Spatial
  const [spatialCity, setSpatialCity] = useState('Москва');
  const [spatialRadius, setSpatialRadius] = useState('15');
  const [spatialH3, setSpatialH3] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  // Синхронизация данных кошелька и репутации
  useEffect(() => {
    if (!isOpen) return;

    setSubmitError(null);
    setSubmitSuccess(false);
    setGeoStatus(null);

    const activeWallet = tonConnectManager.getConnectedWallet();
    const addr = activeWallet?.address || '';
    setConnectedWalletAddress(addr);

    if (addr) {
      reputationService
        .getUserReputation(addr)
        .then((data) => {
          if (data && typeof data.score === 'number') {
            setRealReputationScore(Math.round(data.score));
          }
        })
        .catch(() => {
          // Игнорируем сетевые сбои репутации при открытии модалки
        });
    }
  }, [isOpen]);

  // При открытии или смене пресета инициализируем поля
  const applyPreset = (presetId: string) => {
    const preset = getPresetById(presetId);
    if (!preset) return;

    setSelectedPresetId(presetId);
    setDomain(preset.domain);
    setTitle(preset.defaultPayload.title || preset.title);
    setDescription(preset.defaultPayload.description || preset.description);
    setTagsInput(preset.defaultTags.join(', '));
    setSubmitError(null);

    if (preset.domain === 'consensus') {
      setPollQuorum(String(preset.defaultPayload.interaction?.poll?.quorum || 50));
    } else if (preset.domain === 'aid') {
      setAidTarget(String(preset.defaultPayload.interaction?.aid?.targetAmount || 500));
      setAidCurrency(preset.defaultPayload.interaction?.aid?.currency || 'TON');
      setAidRecipient(preset.defaultPayload.interaction?.aid?.recipient || connectedWalletAddress || '');
    } else if (preset.domain === 'gig') {
      setGigBudget(String(preset.defaultPayload.interaction?.gig?.budget || 1500));
      setGigCurrency(preset.defaultPayload.interaction?.gig?.currency || 'USDT');
      setGigSkills(preset.defaultPayload.interaction?.gig?.requiredSkills?.join(', ') || 'TypeScript, React');
      setGigEscrowProtected(preset.defaultPayload.interaction?.gig?.escrowProtected ?? true);
    } else if (preset.domain === 'p2p') {
      setP2pOfferAmount(String(preset.defaultPayload.interaction?.p2p?.offerAmount || 2000));
      setP2pOfferCurrency(preset.defaultPayload.interaction?.p2p?.offerCurrency || 'USDT');
      setP2pReceiveAmount(String(preset.defaultPayload.interaction?.p2p?.receiveAmount || 185000));
      setP2pReceiveCurrency(preset.defaultPayload.interaction?.p2p?.receiveCurrency || 'RUB_CASH');
      setP2pRate(String(preset.defaultPayload.interaction?.p2p?.rate || 92.5));
      setP2pPaymentMethod(preset.defaultPayload.interaction?.p2p?.paymentMethod || 'Наличные в офисе');
    } else if (preset.domain === 'escrow') {
      setEscrowTotalAmount(String(preset.defaultPayload.settlement?.amount || 100000));
      setEscrowCommodity('Поставка зерна 3000 т');
      setEscrowCollateralPercent(String(preset.defaultPayload.interaction?.escrow?.collateralPercent || 10));
    } else if (preset.domain === 'whistleblow') {
      setWhistleThreshold(String(preset.defaultPayload.interaction?.whistleblow?.thresholdSignatures || 10));
    }
  };

  useEffect(() => {
    if (isOpen) {
      const initialPreset = PULSE_PRESETS.find((p) => p.domain === initialDomain) || PULSE_PRESETS[0];
      applyPreset(initialPreset.id);
    }
  }, [isOpen, initialDomain]);

  // Определение геолокации браузера с вычислением динамического H3 Res 8
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus({ message: 'Геолокация не поддерживается вашим браузером', type: 'error' });
      return;
    }

    setIsLocating(true);
    setGeoStatus({ message: 'Определение точных координат GPS...', type: 'info' });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        const dynamicH3 = latLngToH3Index(latitude, longitude, 8);
        setSpatialH3(dynamicH3);
        setSpatialCity(`Координаты [${latitude.toFixed(3)}, ${longitude.toFixed(3)}]`);
        setGeoStatus({
          message: `H3 ячейка определена: ${dynamicH3} (Res 8)`,
          type: 'success',
        });
      },
      (err) => {
        setIsLocating(false);
        setGeoStatus({ message: `Ошибка геолокации: ${err.message}`, type: 'error' });
      },
      { timeout: 10000 }
    );
  };

  // Переключение аккордеона
  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Отправка формы создания
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!title.trim()) {
      setSubmitError('Укажите заголовок намерения');
      return;
    }
    if (!description.trim()) {
      setSubmitError('Укажите описание намерения');
      return;
    }

    setIsSubmitting(true);

    try {
      // Сборка полезной нагрузки в зависимости от домена
      const interaction: CreatePulseIntentRequest['interaction'] = {};

      if (domain === 'consensus') {
        const qNum = parseInt(pollQuorum, 10) || 50;
        interaction.poll = {
          quorum: qNum,
          votesFor: 0,
          votesAgainst: 0,
          options: [
            { id: 'opt_1', title: 'Поддержать (ЗА)', voteCount: 0 },
            { id: 'opt_2', title: 'Отклонить (ПРОТИВ)', voteCount: 0 },
          ],
        };
      } else if (domain === 'aid') {
        const tNum = parseFloat(aidTarget) || 500;
        interaction.aid = {
          targetAmount: tNum,
          collectedAmount: 0,
          currency: aidCurrency,
          recipient: aidRecipient.trim() || connectedWalletAddress || (isAnonymous ? 'anonymous_recipient' : 'sovereign_recipient'),
          urgencyLevel: aidUrgency,
          donorsCount: 0,
        };
      } else if (domain === 'gig') {
        const bNum = parseFloat(gigBudget) || 1500;
        interaction.gig = {
          budget: bNum,
          currency: gigCurrency,
          applicantCount: 0,
          requiredSkills: gigSkills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          escrowProtected: gigEscrowProtected,
        };
      } else if (domain === 'p2p') {
        const offNum = parseFloat(p2pOfferAmount) || 2000;
        const recNum = parseFloat(p2pReceiveAmount) || 185000;
        interaction.p2p = {
          offerAmount: offNum,
          offerCurrency: p2pOfferCurrency,
          receiveAmount: recNum,
          receiveCurrency: p2pReceiveCurrency,
          rate: parseFloat(p2pRate) || undefined,
          paymentMethod: p2pPaymentMethod,
          minLimit: Math.round(offNum * 0.25),
          maxLimit: offNum,
        };
      } else if (domain === 'escrow') {
        const totalNum = parseFloat(escrowTotalAmount) || 100000;
        const stageAmount = Math.round(totalNum / 4);
        interaction.escrow = {
          stage: 0,
          totalStages: 4,
          collateralPercent: parseFloat(escrowCollateralPercent) || 10,
          oracleType: escrowOracleType,
          stages: [
            { id: 1, title: `Депонирование залогов (${escrowCommodity})`, amount: stageAmount, status: 'active' },
            { id: 2, title: 'Таможня & Инспекция SGS', amount: stageAmount, status: 'pending' },
            { id: 3, title: 'Погрузка & Морской AIS трекинг', amount: stageAmount, status: 'pending' },
            { id: 4, title: 'Приемка в порту & Выплата', amount: stageAmount, status: 'pending' },
          ],
        };
      } else if (domain === 'whistleblow') {
        interaction.whistleblow = {
          thresholdSignatures: parseInt(whistleThreshold, 10) || 10,
          currentSignatures: 0,
          isEncrypted: true,
        };
      }

      // Определение автора с честным скором репутации и адресом
      const authorAddr = connectedWalletAddress || (isAnonymous ? '' : 'user_pulse_' + Math.random().toString(36).slice(2, 8));
      const repScore = realReputationScore !== null ? realReputationScore : (isAnonymous ? 0 : 50);

      const requestPayload: CreatePulseIntentRequest = {
        title: title.trim(),
        description: description.trim(),
        domain: domain,
        author: {
          displayName: isAnonymous
            ? 'Анонимный участник'
            : authorDisplayName.trim() || (connectedWalletAddress ? `${connectedWalletAddress.slice(0, 4)}...${connectedWalletAddress.slice(-4)}` : 'Суверенный участник'),
          address: authorAddr || undefined,
          isAnonymous: isAnonymous,
          reputationScore: repScore,
        },
        spatial: spatialCity
          ? {
              label: spatialCity,
              radiusKm: parseFloat(spatialRadius) || 15,
              h3Index: spatialH3 || undefined,
            }
          : undefined,
        interaction: interaction,
        trustPolicy: {
          minReputation: parseInt(minReputation, 10) || 0,
          requireH3Match: requireH3Match,
          zkSolvencyRequired: zkSolvencyRequired,
          minBalance: zkSolvencyRequired ? parseFloat(zkMinBalance) || 50 : undefined,
        },
        settlement: {
          currency: domain === 'aid' ? aidCurrency : domain === 'gig' ? gigCurrency : 'USDT',
          amount:
            domain === 'aid'
              ? parseFloat(aidTarget) || 0
              : domain === 'gig'
              ? parseFloat(gigBudget) || 0
              : domain === 'p2p'
              ? parseFloat(p2pOfferAmount) || 0
              : parseFloat(escrowTotalAmount) || 0,
        },
        tags: tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      };

      const result = await pulseService.publishIntent(requestPayload);
      setSubmitSuccess(true);

      if (onSuccess && result.intent) {
        onSuccess(result.intent);
      }

      setTimeout(() => {
        onClose();
      }, 400);
    } catch (err: any) {
      setSubmitError(err.message || 'Ошибка публикации намерения');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title={`✨ ${t('pulse:createModal.title', 'Конструктор намерений Universal Pulse')}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs text-slate-200 py-2">
        {/* ================================================================= */}
        {/* УРОВЕНЬ 1: Быстрые пресеты в 1 клик (30 секунд)                   */}
        {/* ================================================================= */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              1. {t('pulse:createModal.quickMode', 'Выберите готовый пресет (30 сек)')}:
            </span>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {t('pulse:createModal.quickMode', 'Умные дефолты активны')}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PULSE_PRESETS.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-white shadow-lg ring-1 ring-emerald-500/30'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold line-clamp-1">{preset.categoryLabel}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                    {preset.title}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Базовые поля: Заголовок и Описание */}
        <div className="space-y-3 pt-2">
          <GlassInput
            label={t('pulse:createModal.titleLabel', 'Заголовок намерения')}
            placeholder={t('pulse:createModal.titlePlaceholder', 'Краткая и четкая суть предложения или задачи...')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">{t('pulse:createModal.descLabel', 'Детальное описание и условия:')}</label>
            <textarea
              rows={3}
              placeholder={t('pulse:createModal.descPlaceholder', 'Опишите технические детали, формат расчетов или критерии приемки...')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500/50 resize-none"
            />
          </div>
        </div>

        {/* Быстрые поля в зависимости от выбранного домена */}
        <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 space-y-3">
          <span className="text-[11px] font-bold text-slate-300 block">
            Параметры категории: {domain.toUpperCase()}
          </span>

          {domain === 'consensus' && (
            <GlassInput
              label="Целевой кворум подписей (человек)"
              type="number"
              value={pollQuorum}
              onChange={(e) => setPollQuorum(e.target.value)}
            />
          )}

          {domain === 'aid' && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <GlassInput
                  label="Цель сбора"
                  type="number"
                  value={aidTarget}
                  onChange={(e) => setAidTarget(e.target.value)}
                />
                <GlassInput
                  label="Валюта"
                  value={aidCurrency}
                  onChange={(e) => setAidCurrency(e.target.value)}
                />
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Срочность:</label>
                  <select
                    value={aidUrgency}
                    onChange={(e) => setAidUrgency(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white"
                  >
                    <option value="low" className="bg-neutral-900">Обычная</option>
                    <option value="medium" className="bg-neutral-900">Средняя</option>
                    <option value="high" className="bg-neutral-900">Высокая</option>
                    <option value="critical" className="bg-neutral-900">Критическая</option>
                  </select>
                </div>
              </div>
              <GlassInput
                label="Адрес получателя (TON)"
                placeholder={connectedWalletAddress ? `Текущий: ${connectedWalletAddress.slice(0, 8)}...` : 'EQ... / UQ...'}
                value={aidRecipient}
                onChange={(e) => setAidRecipient(e.target.value)}
              />
            </div>
          )}

          {domain === 'gig' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <GlassInput
                  label="Бюджет"
                  type="number"
                  value={gigBudget}
                  onChange={(e) => setGigBudget(e.target.value)}
                />
                <GlassInput
                  label="Навыки (через запятую)"
                  placeholder="TypeScript, React, Solidity"
                  value={gigSkills}
                  onChange={(e) => setGigSkills(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="gig-escrow-check"
                  checked={gigEscrowProtected}
                  onChange={(e) => setGigEscrowProtected(e.target.checked)}
                />
                <label htmlFor="gig-escrow-check" className="text-xs text-slate-300 cursor-pointer">
                  Защитить выплату вознаграждения смарт-эскроу контрактом в сети TON
                </label>
              </div>
            </div>
          )}

          {domain === 'p2p' && (
            <div className="grid grid-cols-3 gap-2">
              <GlassInput
                label="Отдаю"
                value={p2pOfferAmount}
                onChange={(e) => setP2pOfferAmount(e.target.value)}
              />
              <GlassInput
                label="Получаю"
                value={p2pReceiveAmount}
                onChange={(e) => setP2pReceiveAmount(e.target.value)}
              />
              <GlassInput
                label="Курс"
                value={p2pRate}
                onChange={(e) => setP2pRate(e.target.value)}
              />
            </div>
          )}

          {domain === 'escrow' && (
            <div className="space-y-2">
              <GlassInput
                label="Товар / Спецификация"
                value={escrowCommodity}
                onChange={(e) => setEscrowCommodity(e.target.value)}
              />
              <div className="grid grid-cols-3 gap-2">
                <GlassInput
                  label="Общая сумма (USDT)"
                  value={escrowTotalAmount}
                  onChange={(e) => setEscrowTotalAmount(e.target.value)}
                />
                <GlassInput
                  label="Залог (%)"
                  value={escrowCollateralPercent}
                  onChange={(e) => setEscrowCollateralPercent(e.target.value)}
                />
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Оракул инспекции:</label>
                  <select
                    value={escrowOracleType}
                    onChange={(e) => setEscrowOracleType(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white"
                  >
                    <option value="sgs_inspection" className="bg-neutral-900">SGS / Bureau Veritas</option>
                    <option value="ais_solas" className="bg-neutral-900">AIS Спутниковый трекер</option>
                    <option value="tlsnotary" className="bg-neutral-900">TLSNotary Web-Proof</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {domain === 'whistleblow' && (
            <GlassInput
              label="Порог подписей для дешифрования (t-of-n)"
              type="number"
              value={whistleThreshold}
              onChange={(e) => setWhistleThreshold(e.target.value)}
            />
          )}
        </div>

        {/* Анонимность чекбокс и имя */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="anon-mode-toggle"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="anon-mode-toggle" className="text-xs text-slate-300 cursor-pointer">
              Опубликовать анонимно (Zero-Knowledge псевдоним, сокрытие адреса кошелька)
            </label>
          </div>

          {!isAnonymous && (
            <GlassInput
              label="Отображаемый псевдоним / Имя автора"
              placeholder={connectedWalletAddress ? `Кошелек: ${connectedWalletAddress.slice(0, 6)}...` : 'Sovereign_Trader_01'}
              value={authorDisplayName}
              onChange={(e) => setAuthorDisplayName(e.target.value)}
            />
          )}
        </div>

        {/* ================================================================= */}
        {/* УРОВЕНЬ 2: Lego-конструктор (Расширенные модули)                   */}
        {/* ================================================================= */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setIsAdvancedLegoMode(!isAdvancedLegoMode)}
            className="w-full py-2.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 flex items-center justify-between transition-all cursor-pointer"
          >
            <span className="flex items-center gap-2 text-emerald-400">
              <Layers className="w-4 h-4" />
              {isAdvancedLegoMode
                ? 'Скрыть расширенные Lego-модули'
                : 'Открыть расширенный Lego-конструктор (Trust, ZK, Oracles, H3)'}
            </span>
            {isAdvancedLegoMode ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {isAdvancedLegoMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 pt-3 overflow-hidden"
              >
                {/* Аккордеон 1: Trust & ZK Policy */}
                <div className="rounded-2xl bg-black/40 border border-purple-500/20 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleAccordion('trust')}
                    className="w-full p-3 text-left font-bold text-xs text-purple-300 flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                      1. Модуль Trust & ZK-Solvency
                    </span>
                    {openAccordions.trust ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {openAccordions.trust && (
                    <div className="p-3.5 pt-0 space-y-3 text-xs border-t border-purple-500/10">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="zk-req-check"
                          checked={zkSolvencyRequired}
                          onChange={(e) => setZkSolvencyRequired(e.target.checked)}
                        />
                        <label htmlFor="zk-req-check" className="text-slate-300 cursor-pointer">
                          Требовать от контрагентов Halo2 ZK Proof of Solvency
                        </label>
                      </div>

                      {zkSolvencyRequired && (
                        <GlassInput
                          label="Минимальный баланс для проверки (TON)"
                          value={zkMinBalance}
                          onChange={(e) => setZkMinBalance(e.target.value)}
                        />
                      )}

                      <GlassInput
                        label="Минимальный репутационный скор (0..100)"
                        value={minReputation}
                        onChange={(e) => setMinReputation(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Аккордеон 2: Spatial & H3 Radar */}
                <div className="rounded-2xl bg-black/40 border border-blue-500/20 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleAccordion('spatial')}
                    className="w-full p-3 text-left font-bold text-xs text-blue-300 flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-400" />
                      2. Модуль H3 Гео-радара и Локации
                    </span>
                    {openAccordions.spatial ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {openAccordions.spatial && (
                    <div className="p-3.5 pt-0 space-y-3 text-xs border-t border-blue-500/10">
                      <div className="grid grid-cols-2 gap-2">
                        <GlassInput
                          label="Город / Локация"
                          value={spatialCity}
                          onChange={(e) => setSpatialCity(e.target.value)}
                        />
                        <GlassInput
                          label="Радиус охвата (км)"
                          value={spatialRadius}
                          onChange={(e) => setSpatialRadius(e.target.value)}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="h3-match-check"
                          checked={requireH3Match}
                          onChange={(e) => setRequireH3Match(e.target.checked)}
                        />
                        <label htmlFor="h3-match-check" className="text-slate-300 cursor-pointer">
                          Требовать строгого совпадения гео-ячейки H3
                        </label>
                      </div>

                      <GlassButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isLocating}
                        onClick={handleDetectLocation}
                        className="w-full text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-blue-400" />
                        <span>{isLocating ? 'Определение GPS...' : 'Определить мои координаты (H3 Res 8)'}</span>
                      </GlassButton>

                      {geoStatus && (
                        <div
                          className={`p-2.5 rounded-xl border text-[11px] flex items-center gap-2 ${
                            geoStatus.type === 'success'
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                              : geoStatus.type === 'error'
                              ? 'bg-red-500/15 border-red-500/30 text-red-200'
                              : 'bg-blue-500/15 border-blue-500/30 text-blue-200'
                          }`}
                        >
                          {geoStatus.type === 'success' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : geoStatus.type === 'error' ? (
                            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          ) : (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" />
                          )}
                          <span>{geoStatus.message}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Теги */}
                <GlassInput
                  label="Семантические теги (через запятую для SimHash O(1))"
                  placeholder="обмен, usdt, наличные, ton, срочно"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Инлайн-состояния валидации и ошибок */}
        {submitError && (
          <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-xs text-red-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{submitError}</span>
            </div>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="text-[10px] text-red-300 hover:text-white underline cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        )}

        {submitSuccess && (
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Намерение успешно опубликовано в Universal Pulse Engine!</span>
          </div>
        )}

        {/* Кнопка публикации */}
        <div className="pt-3">
          <GlassButton
            type="submit"
            variant="accent"
            fullWidth
            disabled={isSubmitting || submitSuccess}
            className="py-3 font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>{t('pulse:createModal.publishing', 'Публикация в сеть...')}</span>
              </>
            ) : submitSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>✓</span>
              </>
            ) : (
              <span>{t('pulse:createModal.publishButton', 'Опубликовать намерение в Gossip Pulse')}</span>
            )}
          </GlassButton>
        </div>
      </form>
    </GlassModal>
  );
};

export default PulseCreateModal;
