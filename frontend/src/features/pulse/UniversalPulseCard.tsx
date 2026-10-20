/**
 * Universal Pulse Engine — UniversalPulseCard Component
 * Адаптивная интерактивная карточка намерения, поддерживающая все 6 доменов взаимодействия:
 * - Consensus (Опросы, кворумы, пороговые решения)
 * - Aid (Краудфандинг, взаимопомощь, прозрачные сборы)
 * - Gig (Задачи, поиск исполнителей, баунти)
 * - P2P (Обмен валют, наличные, ликвидность)
 * - Escrow (Многостадийный 4-фазный DvP смарт-контракт)
 * - Whistleblow (Анонимные расследования с t-of-n дешифрованием)
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Scale,
  HeartHandshake,
  Briefcase,
  Coins,
  Anchor,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Lock,
  MessageSquare,
  Star,
  MapPin,
  Clock,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  User,
} from 'lucide-react';
import { GlassCard, GlassButton } from '../../ui';
import { UniversalPulseIntent, IntentDomain } from './types';
import { ReputationBadgeView } from '../reputation';

interface UniversalPulseCardProps {
  intent: UniversalPulseIntent;
  onVote?: (intentId: string, vote: 'for' | 'against') => Promise<void> | void;
  onAdvanceEscrow?: (intentId: string, stageId: number) => Promise<void> | void;
  onStartChat?: (alias: string) => void;
  onOpenFeedback?: (intentId: string, targetAlias: string) => void;
  onShare?: (intent: UniversalPulseIntent) => void;
  compact?: boolean;
  isExample?: boolean;
  onUseExampleTemplate?: (domain: IntentDomain) => void;
}

export const UniversalPulseCard: React.FC<UniversalPulseCardProps> = ({
  intent,
  onVote,
  onAdvanceEscrow,
  onStartChat,
  onOpenFeedback,
  onShare,
  compact = false,
  isExample = false,
  onUseExampleTemplate,
}) => {
  const { t, i18n } = useTranslation(['pulse', 'common']);
  const [isVoting, setIsVoting] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [localVote, setLocalVote] = useState<'for' | 'against' | null>(
    intent.interaction.poll?.userVoted || null
  );

  const authorAlias = intent.author.displayName || intent.author.address || t('pulse:card.anonymousAuthor', 'Anonymous');
  const isAnonymous = intent.author.isAnonymous ?? true;

  // Форматирование даты
  const formattedDate = new Date(intent.createdAt).toLocaleDateString(i18n.language || 'ru-RU', {
    day: 'numeric',
    month: 'short',
  });

  // Получение визуальных параметров домена
  const getDomainConfig = (domain: IntentDomain) => {
    switch (domain) {
      case 'consensus':
        return {
          label: t('pulse:createModal.domains.consensus', 'Опрос & Кворум'),
          icon: Scale,
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          accentColor: 'from-purple-500 to-indigo-500',
        };
      case 'aid':
        return {
          label: t('pulse:createModal.domains.aid', 'Взаимопомощь'),
          icon: HeartHandshake,
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          accentColor: 'from-rose-500 to-pink-500',
        };
      case 'gig':
        return {
          label: t('pulse:createModal.domains.gig', 'Заказ / Гиг'),
          icon: Briefcase,
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
          accentColor: 'from-indigo-500 to-cyan-500',
        };
      case 'p2p':
        return {
          label: t('pulse:createModal.domains.p2p', 'P2P Ликвидность'),
          icon: Coins,
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          accentColor: 'from-emerald-500 to-teal-500',
        };
      case 'escrow':
        return {
          label: t('pulse:createModal.domains.trade', 'DvP Смарт-Эскроу'),
          icon: Anchor,
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          accentColor: 'from-amber-500 to-orange-500',
        };
      case 'whistleblow':
        return {
          label: t('pulse:createModal.domains.whistleblow', 'Расследование'),
          icon: ShieldAlert,
          badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30',
          accentColor: 'from-red-500 to-rose-600',
        };
    }
  };

  const domainConfig = getDomainConfig(intent.domain);
  const DomainIcon = domainConfig.icon;

  // Обработчик голосования
  const handleVoteClick = async (vote: 'for' | 'against') => {
    if (!onVote || isVoting) return;
    setIsVoting(true);
    try {
      await onVote(intent.id, vote);
      setLocalVote(vote);
    } catch (err) {
      console.error('Vote failed', err);
    } finally {
      setIsVoting(false);
    }
  };

  // Обработчик продвижения стадии эскроу
  const handleAdvanceClick = async (stageId: number) => {
    if (!onAdvanceEscrow || isAdvancing) return;
    setIsAdvancing(true);
    try {
      await onAdvanceEscrow(intent.id, stageId);
    } catch (err) {
      console.error('Advance failed', err);
    } finally {
      setIsAdvancing(false);
    }
  };

  return (
    <GlassCard
      glow
      glowColor={
        intent.domain === 'consensus'
          ? 'rgba(168, 85, 247, 0.08)'
          : intent.domain === 'escrow'
          ? 'rgba(245, 158, 11, 0.08)'
          : 'rgba(16, 185, 129, 0.08)'
      }
      className={`rounded-2xl sm:rounded-3xl border-white/10 transition-all flex flex-col justify-between overflow-hidden hover:border-emerald-500/30 ${
        compact ? 'p-3.5 space-y-2.5 text-xs' : 'p-3.5 sm:p-5 space-y-3.5 sm:space-y-4'
      } ${isExample ? 'ring-1 ring-amber-500/30 bg-amber-950/5' : ''}`}
    >
      <div className="space-y-3 min-w-0">
        {/* Верхняя строка: Домен + Локация + Время */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {isExample && (
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                📖 ПРИМЕР
              </span>
            )}
            <span
              className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl text-[10px] font-mono font-bold uppercase border flex items-center gap-1 sm:gap-1.5 shadow-sm ${domainConfig.badgeColor}`}
            >
              <DomainIcon className="w-3 h-3 shrink-0" />
              <span className="truncate">{domainConfig.label}</span>
            </span>

            {intent.spatial?.label && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 border border-white/5 text-[10px] text-slate-300 font-mono max-w-[140px] truncate">
                <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                <span className="truncate">{intent.spatial.label}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono shrink-0">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Заголовок и Описание */}
        <div className="space-y-1">
          <h3 className={`font-bold text-white tracking-tight ${compact ? 'text-xs' : 'text-sm'}`}>
            {intent.title}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 font-medium">
            {intent.description}
          </p>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* Доменная интерактивная секция (1 из 6 вариантов)                     */}
        {/* ------------------------------------------------------------------- */}

        {/* 1. Consensus (Опрос / Голосование) */}
        {intent.domain === 'consensus' && intent.interaction.poll && (
          <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/20 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-purple-200">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                Кворум подписей:
              </span>
              <span className="font-mono">
                {intent.interaction.poll.votesFor} / {intent.interaction.poll.quorum}
              </span>
            </div>

            {/* Прогресс-бар */}
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    (intent.interaction.poll.votesFor / (intent.interaction.poll.quorum || 1)) * 100
                  )}%`,
                }}
              />
            </div>

            {/* Кнопки голосования */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={isVoting}
                onClick={() => handleVoteClick('for')}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  localVote === 'for'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Поддержать (ЗА)</span>
              </button>

              <button
                type="button"
                disabled={isVoting}
                onClick={() => handleVoteClick('against')}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  localVote === 'against'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5'
                }`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                <span>Против</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. Aid (Взаимопомощь / Сбор средств) */}
        {intent.domain === 'aid' && intent.interaction.aid && (
          <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-500/20 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-rose-200">Собрано:</span>
              <span className="font-mono text-emerald-400">
                {intent.interaction.aid.collectedAmount} / {intent.interaction.aid.targetAmount}{' '}
                {intent.interaction.aid.currency}
              </span>
            </div>

            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-rose-500 to-emerald-400 h-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    (intent.interaction.aid.collectedAmount /
                      (intent.interaction.aid.targetAmount || 1)) *
                      100
                  )}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Доноров: {intent.interaction.aid.donorsCount || 0}</span>
              {intent.interaction.aid.urgencyLevel && (
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                  Срочность: {intent.interaction.aid.urgencyLevel}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 3. Gig (Заказ / Задача) */}
        {intent.domain === 'gig' && intent.interaction.gig && (
          <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono">
                <span className="text-slate-400 block text-[9px] uppercase">Бюджет задачи</span>
                <span className="text-emerald-400 font-black text-sm">
                  {intent.interaction.gig.budget} {intent.interaction.gig.currency}
                </span>
              </div>
              {intent.interaction.gig.escrowProtected && (
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                  🛡️ TON Escrow
                </span>
              )}
            </div>

            {intent.interaction.gig.requiredSkills && intent.interaction.gig.requiredSkills.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {intent.interaction.gig.requiredSkills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-indigo-300 font-mono"
                  >
                    #{skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. P2P (Обмен валют / Наличные) */}
        {intent.domain === 'p2p' && intent.interaction.p2p && (
          <div className="p-3.5 rounded-2xl bg-black/30 border border-emerald-500/20 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[9px] text-slate-400 block uppercase">Отдают</span>
                <span className="text-emerald-400 font-bold">
                  {intent.interaction.p2p.offerAmount} {intent.interaction.p2p.offerCurrency}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[9px] text-slate-400 block uppercase">Хотят получить</span>
                <span className="text-amber-300 font-bold">
                  {intent.interaction.p2p.receiveAmount} {intent.interaction.p2p.receiveCurrency}
                </span>
              </div>
            </div>

            {intent.interaction.p2p.rate && (
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-1">
                <span>Курс: <b className="text-white">{intent.interaction.p2p.rate}</b></span>
                {intent.interaction.p2p.paymentMethod && (
                  <span>Метод: <b className="text-slate-300">{intent.interaction.p2p.paymentMethod}</b></span>
                )}
              </div>
            )}
          </div>
        )}

        {/* 5. Escrow (Многостадийный смарт-контракт) */}
        {intent.domain === 'escrow' && intent.interaction.escrow && (
          <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/20 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-amber-300 font-bold">
                Стадия {intent.interaction.escrow.stage + 1} из {intent.interaction.escrow.totalStages}
              </span>
              <span className="text-[10px] text-slate-400">
                Оракул: {intent.interaction.escrow.oracleType || 'SGS Inspection'}
              </span>
            </div>

            {/* Шаги контракта */}
            <div className="space-y-1.5">
              {intent.interaction.escrow.stages?.map((st) => (
                <div
                  key={st.id}
                  className={`p-2 rounded-xl border text-[11px] flex items-center justify-between gap-2 ${
                    st.status === 'completed'
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                      : st.status === 'active'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-200 ring-1 ring-amber-500/20'
                      : 'bg-white/2 border-white/5 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium">
                    {st.status === 'completed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-current text-[9px] flex items-center justify-center font-mono shrink-0">
                        {st.id}
                      </span>
                    )}
                    <span className="line-clamp-1">{st.title}</span>
                  </div>

                  {st.status === 'active' && onAdvanceEscrow && (
                    <button
                      type="button"
                      disabled={isAdvancing}
                      onClick={() => handleAdvanceClick(st.id)}
                      className="py-0.5 px-2 rounded bg-amber-500/30 hover:bg-amber-500/40 text-[9px] font-bold text-amber-200 shrink-0 cursor-pointer"
                    >
                      {isAdvancing ? 'Проверка...' : 'Продвинуть ➔'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. Whistleblow (Анонимное расследование) */}
        {intent.domain === 'whistleblow' && intent.interaction.whistleblow && (
          <div className="p-3.5 rounded-2xl bg-red-950/20 border border-red-500/20 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-red-200">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-red-400" />
                Порог раскрытия (t-of-n):
              </span>
              <span className="font-mono">
                {intent.interaction.whistleblow.currentSignatures} /{' '}
                {intent.interaction.whistleblow.thresholdSignatures} подписей
              </span>
            </div>

            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-red-500 to-rose-400 h-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    (intent.interaction.whistleblow.currentSignatures /
                      (intent.interaction.whistleblow.thresholdSignatures || 1)) *
                      100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Дополнительные бейджи доверия (Trust & ZK Policy) */}
        {intent.trustPolicy?.zkSolvencyRequired && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[10px] font-mono text-purple-300">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>Требуется Halo2 Proof of Solvency (≥ {intent.trustPolicy.minBalance || 10} TON)</span>
          </div>
        )}
      </div>

      {/* Нижняя строка: Автор + Действия */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
        {/* Автор / Репутация */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-slate-400 min-w-0">
          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-slate-300 shrink-0">
            {isAnonymous ? <Lock className="w-3 h-3 text-emerald-400" /> : <User className="w-3 h-3" />}
          </div>
          <span className="font-mono text-[11px] text-slate-200 truncate max-w-[130px] sm:max-w-[180px]">{authorAlias}</span>
          {!isExample && <ReputationBadgeView userAlias={authorAlias} size="sm" />}
        </div>

        {/* Кнопки действий */}
        <div className="flex items-center gap-2 shrink-0">
          {!isExample && onOpenFeedback && (
            <button
              type="button"
              onClick={() => onOpenFeedback(intent.id, authorAlias)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-amber-400 transition-all cursor-pointer"
              title="Оценить репутацию участника"
            >
              <Star className="w-3.5 h-3.5" />
            </button>
          )}

          {isExample ? (
            <GlassButton
              variant="accent"
              size="sm"
              onClick={() => onUseExampleTemplate?.(intent.domain)}
              className={`font-bold flex items-center gap-1.5 text-amber-100 bg-amber-600/80 hover:bg-amber-500 ${
                compact ? 'py-1 px-2.5 text-[10px]' : 'text-xs'
              }`}
            >
              <span>✨ Создать по образцу</span>
            </GlassButton>
          ) : (
            <GlassButton
              variant="accent"
              size="sm"
              onClick={() => {
                if (onStartChat) {
                  onStartChat(authorAlias);
                }
              }}
              className={`font-bold flex items-center gap-1.5 text-white bg-emerald-600 hover:bg-emerald-500 ${
                compact ? 'py-1 px-2.5 text-[10px]' : 'text-xs'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{t('pulse:card.respondButton', 'E2EE Диалог')}</span>
            </GlassButton>
          )}
        </div>
      </div>
    </GlassCard>
  );
};

export default UniversalPulseCard;
