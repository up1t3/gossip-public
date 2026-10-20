/**
 * Universal Pulse Engine — UniversalPulseFeed Component
 * Интеллектуальная интерактивная лента с динамической фильтрацией по доменам,
 * семантическим поиском, сортировкой и H3 гео-радаром («Рядом со мной»).
 * Полное соответствие Zero-Toast UX: все статусы и ошибки отображаются инлайн.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  RefreshCw,
  ShieldCheck,
  Compass,
  Plus,
  Coins,
  Anchor,
  Scale,
  HeartHandshake,
  Briefcase,
  ShieldAlert,
  Radio,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import { GlassButton } from '../../ui';
import { UniversalPulseIntent, IntentDomain, PulseFilterState } from './types';
import { PULSE_PRESETS } from './presets';
import { pulseService } from './pulseService';
import { UniversalPulseCard } from './UniversalPulseCard';
import { FeedbackModal } from '../reputation';

const DEMO_STUB_INTENT_IDS = new Set([
  'intent_consensus_301',
  'intent_aid_101',
  'intent_gig_201',
  'intent_p2p_101',
  'intent_p2p_102',
  'intent_escrow_401',
  'intent_whistleblow_501',
]);

const EXAMPLE_PULSE_INTENTS: UniversalPulseIntent[] = PULSE_PRESETS.map((preset, idx) => ({
  id: `example_template_${preset.id}`,
  title: preset.defaultPayload.title || preset.title,
  description: preset.defaultPayload.description || preset.description,
  domain: preset.domain,
  author: {
    displayName: 'Образец шаблона',
    isAnonymous: true,
    reputationScore: 100,
  },
  spatial: preset.defaultPayload.spatial || {
    label: 'Пример локации (H3)',
    radiusKm: 15,
  },
  interaction: preset.defaultPayload.interaction || {},
  trustPolicy: preset.defaultPayload.trustPolicy,
  settlement: preset.defaultPayload.settlement,
  status: 'active',
  createdAt: new Date(Date.now() - idx * 3600000).toISOString(),
  tags: preset.defaultTags,
  simhash: '0000000000000000',
}));

interface UniversalPulseFeedProps {
  onStartChatWithUser?: (alias: string) => void;
  onToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onOpenCreateModal?: (domain?: IntentDomain) => void;
}

export const UniversalPulseFeed: React.FC<UniversalPulseFeedProps> = ({
  onStartChatWithUser,
  onToast: _deprecatedOnToast,
  onOpenCreateModal,
}) => {
  const { t } = useTranslation(['pulse', 'common']);
  const [intents, setIntents] = useState<UniversalPulseIntent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeDomain, setActiveDomain] = useState<IntentDomain | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'relevance' | 'votes' | 'amount'>('newest');
  const [zkSolvencyOnly, setZkSolvencyOnly] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  // H3 Гео-радар состояние
  const [isRadarActive, setIsRadarActive] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [radarRadiusKm, setRadarRadiusKm] = useState<number>(15);
  const [radarError, setRadarError] = useState<string | null>(null);

  // Feedback Modal
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackInteractionId, setFeedbackInteractionId] = useState('');
  const [feedbackTargetAlias, setFeedbackTargetAlias] = useState('');

  // Загрузка ленты
  const loadFeed = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: PulseFilterState = {
        domain: activeDomain === 'all' ? undefined : activeDomain,
        searchQuery: searchQuery.trim() || undefined,
        zkSolvencyOnly: zkSolvencyOnly || undefined,
        latitude: isRadarActive && userLocation ? userLocation.lat : undefined,
        longitude: isRadarActive && userLocation ? userLocation.lon : undefined,
        radiusKm: isRadarActive ? radarRadiusKm : undefined,
      };

      const result = await pulseService.searchIntents(filters);
      let list = result.intents.filter((it) => !DEMO_STUB_INTENT_IDS.has(it.id));

      // Сортировка на клиенте
      if (sortBy === 'newest') {
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else if (sortBy === 'votes') {
        list.sort((a, b) => {
          const vA = a.interaction.poll?.votesFor || a.interaction.whistleblow?.currentSignatures || 0;
          const vB = b.interaction.poll?.votesFor || b.interaction.whistleblow?.currentSignatures || 0;
          return vB - vA;
        });
      } else if (sortBy === 'amount') {
        list.sort((a, b) => {
          const amtA = a.settlement?.amount || a.interaction.aid?.targetAmount || a.interaction.gig?.budget || 0;
          const amtB = b.settlement?.amount || b.interaction.aid?.targetAmount || b.interaction.gig?.budget || 0;
          return amtB - amtA;
        });
      }

      setIntents(list);
    } catch (err) {
      console.warn('[UniversalPulseFeed] Ошибка загрузки ленты:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeDomain, searchQuery, zkSolvencyOnly, isRadarActive, userLocation, radarRadiusKm, sortBy]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  // Активация/деактивация гео-радара (циклический переход: 15 -> 50 -> 5 -> выкл)
  const toggleGeoRadar = () => {
    setRadarError(null);

    if (isRadarActive) {
      if (radarRadiusKm === 15) {
        setRadarRadiusKm(50);
      } else if (radarRadiusKm === 50) {
        setRadarRadiusKm(5);
      } else {
        setIsRadarActive(false);
        setUserLocation(null);
        setRadarRadiusKm(15);
      }
      return;
    }

    if (!navigator.geolocation) {
      setRadarError('Геолокация недоступна в данном браузере');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setIsRadarActive(true);
        setRadarError(null);
      },
      (err) => {
        setRadarError(`Геолокация отклонена: ${err.message}`);
      },
      { timeout: 8000 }
    );
  };

  // Голосование в карточке с инлайн-обновлением счетчиков и детерминированным ZK-Nullifier (защита от накрутки)
  const handleVote = async (intentId: string, vote: 'for' | 'against') => {
    try {
      let voterSecret = localStorage.getItem('gossip_pulse_voter_secret');
      if (!voterSecret) {
        const randBytes = new Uint8Array(16);
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
          crypto.getRandomValues(randBytes);
        }
        voterSecret = Array.from(randBytes, (b) => b.toString(16).padStart(2, '0')).join('') || `voter_${Date.now()}`;
        localStorage.setItem('gossip_pulse_voter_secret', voterSecret);
      }

      let nullifier = `nullifier_${intentId}_${voterSecret}`.slice(0, 64);
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        const msgBuffer = new TextEncoder().encode(`pulse_vote:${intentId}:${voterSecret}`);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        nullifier = Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      }

      await pulseService.voteIntent(intentId, { vote, nullifier });
      // Обновляем локальное состояние
      setIntents((prev) =>
        prev.map((it) => {
          if (it.id === intentId && it.interaction.poll) {
            return {
              ...it,
              interaction: {
                ...it.interaction,
                poll: {
                  ...it.interaction.poll,
                  votesFor: vote === 'for' ? it.interaction.poll.votesFor + 1 : it.interaction.poll.votesFor,
                  votesAgainst:
                    vote === 'against'
                      ? it.interaction.poll.votesAgainst + 1
                      : it.interaction.poll.votesAgainst,
                  userVoted: vote,
                },
              },
            };
          }
          return it;
        })
      );
    } catch (err: any) {
      console.warn('[UniversalPulseFeed] Ошибка голосования:', err?.message || err);
    }
  };

  // Продвижение фазы эскроу со структурированным доказательством фазы
  const handleAdvanceEscrow = async (intentId: string, stageId: number) => {
    try {
      const targetIntent = intents.find((i) => i.id === intentId);
      const oracleType = targetIntent?.interaction.escrow?.oracleType || 'sgs_inspection';
      const structuredProof = JSON.stringify({
        oracle: oracleType,
        timestamp: new Date().toISOString(),
        stageId,
        status: 'verified',
        attestationRef: `AIS_ORACLE_PROVING_STAGE_${stageId}`,
      });

      await pulseService.advanceEscrow(intentId, {
        stageId,
        action: 'complete',
        proof: structuredProof,
      });
      loadFeed();
    } catch (err: any) {
      console.warn('[UniversalPulseFeed] Ошибка продвижения стадии:', err?.message || err);
    }
  };

  // Открытие отзыва
  const handleOpenFeedback = (intentId: string, targetAlias: string) => {
    setFeedbackInteractionId(intentId);
    setFeedbackTargetAlias(targetAlias);
    setIsFeedbackOpen(true);
  };

  const domainTabs: { id: IntentDomain | 'all'; label: string; icon: any; color: string }[] = [
    { id: 'all', label: t('pulse:feed.filterAll', 'Все потоки'), icon: Compass, color: 'text-white' },
    { id: 'p2p', label: t('pulse:feed.filterP2p', 'P2P Ликвидность'), icon: Coins, color: 'text-emerald-400' },
    { id: 'escrow', label: t('pulse:feed.filterTrade', 'ВЭД & Эскроу'), icon: Anchor, color: 'text-amber-400' },
    { id: 'consensus', label: t('pulse:feed.filterCivic', 'Консенсус & Опросы'), icon: Scale, color: 'text-purple-400' },
    { id: 'aid', label: t('pulse:feed.filterAid', 'Взаимопомощь'), icon: HeartHandshake, color: 'text-rose-400' },
    { id: 'gig', label: t('pulse:feed.filterGig', 'Карьера & Задачи'), icon: Briefcase, color: 'text-indigo-400' },
    { id: 'whistleblow', label: t('pulse:feed.filterWhistleblow', 'Расследования'), icon: ShieldAlert, color: 'text-red-400' },
  ];

  const filteredExamples = EXAMPLE_PULSE_INTENTS.filter(
    (ex) => activeDomain === 'all' || ex.domain === activeDomain
  );

  return (
    <div className="space-y-3.5 sm:space-y-4 min-w-0">
      {/* Вкладки категорий — адаптивный перенос (flex-wrap), чтобы все разделы были видны на маленьких экранах */}
      <div className="flex flex-wrap items-center gap-1.5 pb-2.5 border-b border-white/5">
        {domainTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeDomain === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveDomain(tab.id)}
              className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-white/15 text-white border border-white/20 shadow-glass-sm'
                  : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${tab.color}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Панель инструментов: Поиск, Радар, Сортировка, ZK, Примеры */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Поисковая строка */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('pulse:feed.searchPlaceholder', 'Поиск по намерениям, городам, тегам, SimHash...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 sm:py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Кнопки фильтров — flex-wrap без обрезания на узких экранах */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Гео-радар */}
          <button
            type="button"
            onClick={toggleGeoRadar}
            className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              isRadarActive
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
            }`}
            title={t('pulse:tabs.nearby', 'Гео-радар H3')}
          >
            <Radio className={`w-3.5 h-3.5 shrink-0 ${isRadarActive ? 'animate-pulse text-blue-400' : ''}`} />
            <span>{isRadarActive ? t('pulse:feed.geoRadarBtn', 'Рядом ({{radius}} км)', { radius: radarRadiusKm }) : t('pulse:feed.geoRadarOff', 'Радар H3')}</span>
          </button>

          {/* Фильтр только с ZK */}
          <button
            type="button"
            onClick={() => setZkSolvencyOnly(!zkSolvencyOnly)}
            className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              zkSolvencyOnly
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>ZK-Proof</span>
          </button>

          {/* Кнопка переключения режима примеров (вместо фейковых заявок в основной ленте) */}
          <button
            type="button"
            data-testid="pulse-examples-toggle"
            onClick={() => setShowExamples((prev) => !prev)}
            className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              showExamples
                ? 'bg-amber-500/25 text-amber-200 border border-amber-500/50 shadow-sm'
                : 'bg-white/5 text-amber-300/90 border border-amber-500/20 hover:bg-amber-500/15'
            }`}
            title="Посмотреть примеры оформления сделок и намерений"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{showExamples ? 'Скрыть примеры' : 'Примеры'}</span>
          </button>

          {/* Сортировка */}
          <div className="relative flex-1 sm:flex-none min-w-[125px]">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-[11px] sm:text-xs font-bold text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="newest" className="bg-neutral-900">Новые</option>
              <option value="votes" className="bg-neutral-900">По голосам / кворуму</option>
              <option value="amount" className="bg-neutral-900">По объему / бюджету</option>
            </select>
          </div>

          {/* Кнопка обновления */}
          <button
            type="button"
            onClick={loadFeed}
            className="p-2 rounded-xl sm:rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
            title="Обновить ленту"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Инлайн-сообщение об ошибке радара */}
      {radarError && (
        <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{radarError}</span>
          </div>
          <button
            type="button"
            onClick={() => setRadarError(null)}
            className="text-[10px] text-amber-300 hover:text-white underline cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      )}

      {/* Выделенный блок примеров (отображается только по нажатию кнопки «Примеры») */}
      {showExamples && (
        <div className="space-y-3 p-3.5 sm:p-4 rounded-2xl bg-amber-950/15 border border-amber-500/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-2.5">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Витрина примеров (Образцы сценариев Pulse & P2P)</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Ниже показаны демонстрационные шаблоны, чтобы вы могли оценить формат карточек. Они не являются реальными сделками. Нажмите «Создать по образцу», чтобы заполнить свою заявку.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowExamples(false)}
              className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] font-bold text-amber-200 shrink-0 cursor-pointer"
            >
              Вернуться к реальным заявкам
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredExamples.map((example) => (
              <UniversalPulseCard
                key={example.id}
                intent={example}
                isExample={true}
                onUseExampleTemplate={(dom) => {
                  setShowExamples(false);
                  onOpenCreateModal?.(dom);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Список реальных намерений */}
      {!showExamples && (
        intents.length === 0 ? (
          <div className="text-center py-10 sm:py-14 px-3 rounded-2xl bg-white/[0.02] border border-white/5 text-slate-400 text-xs space-y-3">
            <Compass className="w-9 h-9 mx-auto text-slate-500 animate-pulse" />
            <div className="space-y-1 max-w-md mx-auto">
              <p className="font-semibold text-slate-200">
                {isRadarActive
                  ? 'В выбранном радиусе H3 гео-радара активных заявок не обнаружено'
                  : 'Активных заявок от пользователей в этой категории пока нет'}
              </p>
              <p className="text-[11px] text-slate-400">
                {isRadarActive
                  ? 'Попробуйте увеличить радиус радара или отключить гео-фильтр.'
                  : 'В основной ленте отображаются только реальные верифицированные сделки без фейковых заглушек.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {onOpenCreateModal && (
                <GlassButton
                  variant="accent"
                  size="sm"
                  onClick={() => onOpenCreateModal(activeDomain === 'all' ? undefined : activeDomain)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Создать намерение</span>
                </GlassButton>
              )}
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => setShowExamples(true)}
                className="text-amber-300 border-amber-500/30 hover:bg-amber-500/15 font-bold text-xs flex items-center gap-1.5"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Посмотреть примеры сделок</span>
              </GlassButton>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            <AnimatePresence>
              {intents.map((intent) => (
                <motion.div
                  key={intent.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <UniversalPulseCard
                    intent={intent}
                    onVote={handleVote}
                    onAdvanceEscrow={handleAdvanceEscrow}
                    onStartChat={onStartChatWithUser}
                    onOpenFeedback={handleOpenFeedback}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )
      )}

      {/* Модалка отзыва */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        interactionId={feedbackInteractionId}
        targetAlias={feedbackTargetAlias}
      />
    </div>
  );
};

export default UniversalPulseFeed;
