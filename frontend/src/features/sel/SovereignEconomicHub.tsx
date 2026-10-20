/**
 * Sovereign Economic Layer (SEL) & Universal Pulse Engine — SovereignEconomicHub
 * Главный суверенный экономический хаб Gossip:
 * - Бесшовная трансформация в Universal Pulse Engine с поддержкой 6 доменов взаимодействия
 * - Интеллектуальный Pulse Feed, H3 гео-радар и SimHash blind matching
 * - Двухуровневый конструктор создания намерений (30-секундные пресеты + Lego-модули)
 * - Halo2 ZK Proof of Solvency генератор и верификатор
 * - 4-фазный DvP Смарт-Эскроу трекер с оракулами SGS / AIS / TLSNotary
 * - Zero-Toast UX: Инлайн индикация всех процессов, ошибок и успехов
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Coins,
  Anchor,
  ShieldCheck,
  Plus,
  Lock,
  Cpu,
  CheckCircle2,
  FileCheck2,
  Radio,
  Layers,
  Star,
  AlertCircle,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { GlassButton, GlassCard, GlassInput, GlassModal } from '../../ui';
import { DvPEscrowContract, ZkSolvencyAttestation } from './types';
import { selService } from './selService';
import { ReputationBadgeView, FeedbackModal } from '../reputation';
import {
  UniversalPulseFeed,
  PulseCreateModal,
  IntentDomain,
} from '../pulse';

const EXAMPLE_ESCROW_CONTRACT: DvPEscrowContract = {
  id: 'example_escrow_dvp',
  title: 'Поставка зерна: Новороссийск -> Бандар-Аббас (Образец)',
  buyer: 'Caspian_Trading_FZE',
  seller: 'AgroExport_Corp',
  amount_usdt: '450000.00',
  amount_ton: '65000.00',
  commodity: 'Ячмень фуражный (2000 тонн)',
  current_phase: 'inspection_loading',
  phases: [
    { id: 'depo_funded', name: '1. Депозит заблокирован в TON DvP', description: 'Средства покупателя и залоги сторон депонированы в смарт-контракте.', amount_percent: 20, status: 'completed' },
    { id: 'inspection_loading', name: '2. Инспекция SGS и погрузка на судно', description: 'Оракул проверяет сертификат качества SGS #RU-9821-SGS.', amount_percent: 30, status: 'active' },
    { id: 'transit_customs', name: '3. Транзит через море (AIS SOLAS)', description: 'Спутниковый трекинг судна до порта назначения.', amount_percent: 30, status: 'pending' },
    { id: 'settlement_delivered', name: '4. Финальный релиз средств продавцу', description: 'Приемка груза и автоматическая выплата.', amount_percent: 20, status: 'pending' },
  ],
  collateral_seller_ton: '1500.0',
  collateral_buyer_ton: '1500.0',
  created_at: Date.now() - 86400000,
};

interface SovereignEconomicHubProps {
  theme?: 'dark' | 'light' | 'coffee';
  onStartChatWithUser?: (alias: string) => void;
  onToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const SovereignEconomicHub: React.FC<SovereignEconomicHubProps> = ({
  theme: _theme = 'dark',
  onStartChatWithUser,
  onToast: _deprecatedOnToast,
}) => {
  const { t } = useTranslation(['pulse', 'common']);
  // Навигация верхнего уровня
  const [hubTab, setHubTab] = useState<'feed' | 'zk_attest' | 'escrow'>('feed');

  // Модалка создания Universal Pulse намерения (30 сек + Lego)
  const [isPulseCreateModalOpen, setIsPulseCreateModalOpen] = useState(false);
  const [modalInitialDomain, setModalInitialDomain] = useState<IntentDomain>('p2p');

  // Активные DvP Эскроу контракты
  const [escrows, setEscrows] = useState<DvPEscrowContract[]>([]);
  const [showEscrowExample, setShowEscrowExample] = useState(false);
  const [isEscrowModalOpen, setIsEscrowModalOpen] = useState(false);
  const [escrowTitle, setEscrowTitle] = useState('');
  const [escrowBuyer, setEscrowBuyer] = useState('');
  const [escrowSeller, setEscrowSeller] = useState('');
  const [escrowAmountUsdt, setEscrowAmountUsdt] = useState('');
  const [escrowAmountTon, setEscrowAmountTon] = useState('');
  const [escrowCommodity, setEscrowCommodity] = useState('');
  const [escrowOracle, setEscrowOracle] = useState('sgs_inspection');
  const [isCreatingEscrow, setIsCreatingEscrow] = useState(false);
  const [escrowCreateError, setEscrowCreateError] = useState<string | null>(null);
  const [escrowAdvanceError, setEscrowAdvanceError] = useState<string | null>(null);

  // ZK-Аттестат состоятельности
  const [zkAmountTon, setZkAmountTon] = useState('100');
  const [zkDepositAge, setZkDepositAge] = useState(7);
  const [activeAttestation, setActiveAttestation] = useState<ZkSolvencyAttestation | null>(null);
  const [isVerifyingZk, setIsVerifyingZk] = useState(false);
  const [zkError, setZkError] = useState<string | null>(null);

  // Состояние модалки отзыва
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackInteractionId, setFeedbackInteractionId] = useState('');
  const [feedbackTargetAlias, setFeedbackTargetAlias] = useState('');

  // Загрузка активных эскроу контрактов (без демонстрационных заглушек)
  const loadEscrows = useCallback(async () => {
    try {
      const data = await selService.getEscrows();
      setEscrows(data.filter((e) => e.id !== 'escrow_dvp_8801'));
    } catch (e) {
      console.warn('[SEL] Ошибка загрузки эскроу:', e);
    }
  }, []);

  useEffect(() => {
    loadEscrows();
  }, [loadEscrows]);

  // Создание DvP Эскроу контракта с инлайн-валидацией
  const handleCreateEscrow = async (e: React.FormEvent) => {
    e.preventDefault();
    setEscrowCreateError(null);

    if (!escrowTitle.trim() || !escrowCommodity.trim() || !escrowBuyer.trim() || !escrowSeller.trim()) {
      setEscrowCreateError('Заполните все обязательные поля контракта');
      return;
    }

    setIsCreatingEscrow(true);
    try {
      await selService.createEscrow({
        title: escrowTitle.trim(),
        buyer_alias: escrowBuyer.trim(),
        seller_alias: escrowSeller.trim(),
        amount_usdt: escrowAmountUsdt.trim() || '100000.00',
        amount_ton: escrowAmountTon.trim() || '15000.00',
        commodity: escrowCommodity.trim(),
        oracle_type: escrowOracle,
      });

      setIsEscrowModalOpen(false);
      setEscrowTitle('');
      setEscrowBuyer('');
      setEscrowSeller('');
      setEscrowCommodity('');
      setEscrowCreateError(null);
      loadEscrows();
    } catch (err: any) {
      setEscrowCreateError(err.message || 'Ошибка создания эскроу контракта');
    } finally {
      setIsCreatingEscrow(false);
    }
  };

  // Продвижение фазы эскроу
  const handleAdvanceEscrow = async (escrowId: string) => {
    setEscrowAdvanceError(null);
    try {
      const updated = await selService.advanceEscrowStage(escrowId);
      setEscrows((prev) => prev.map((e) => (e.id === escrowId ? updated : e)));
    } catch (err: any) {
      setEscrowAdvanceError(err.message || 'Ошибка обновления фазы контракта');
    }
  };

  // Генерация ZK-Аттестата состоятельности
  const handleGenerateZkProof = async () => {
    setZkError(null);
    setIsVerifyingZk(true);
    try {
      const attest = await selService.verifyZkSolvency({
        min_amount_ton: zkAmountTon,
        min_deposit_age_days: zkDepositAge,
      });
      setActiveAttestation(attest);
    } catch (err: any) {
      setZkError(err.message || 'Ошибка генерации Halo2 ZK-Proof');
    } finally {
      setIsVerifyingZk(false);
    }
  };

  // Открытие модалки создания с пресетом
  const handleOpenCreateWithDomain = (domain?: IntentDomain) => {
    setModalInitialDomain(domain || 'p2p');
    setIsPulseCreateModalOpen(true);
  };

  return (
    <div className="w-full h-full overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 pb-24 md:pb-8 space-y-4 z-10">
      {/* Верхний баннер Пульс: понятный человеку заголовок + технический бейдж */}
      <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-950/40 via-purple-950/30 to-blue-950/40 border border-emerald-500/30 shadow-glass-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-1.5 max-w-2xl min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Coins className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-lg font-black text-white tracking-tight leading-snug">
              {t('pulse:hub.titleHuman', 'Пульс — Безопасные сделки и P2P-объявления')}
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
            {t('pulse:hub.subtitleHuman', 'Находите проверенных контрагентов, подтверждайте баланс без раскрытия кошелька (ZK-Proof) и проводите защищённые сделки через смарт-эскроу TON.')}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-0.5">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
              Подтверждение баланса (ZKP)
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
              <Anchor className="w-3 h-3 text-purple-400 shrink-0" />
              Смарт-Эскроу TON
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1">
              <Radio className="w-3 h-3 text-blue-400 shrink-0" />
              Гео-поиск рядом
            </span>
          </div>
        </div>

        {/* Кнопки быстрых действий */}
        <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
          <GlassButton
            variant="accent"
            size="sm"
            onClick={() => handleOpenCreateWithDomain('p2p')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('pulse:createModal.titleHuman', 'Разместить объявление')}</span>
          </GlassButton>
        </div>
      </div>

      {/* Навигационные табы: адаптивная 3-колоночная сетка на мобильных, все 3 раздела видны сразу без обрезки */}
      <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 sm:gap-2 border-b border-white/10 pb-3 select-none">
        <button
          type="button"
          onClick={() => setHubTab('feed')}
          className={`px-2 sm:px-4 py-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-w-0 cursor-pointer ${
            hubTab === 'feed'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
          <span className="truncate">{t('pulse:hub.tabsFeedHuman', 'Объявления')}</span>
        </button>

        <button
          type="button"
          onClick={() => setHubTab('zk_attest')}
          className={`px-2 sm:px-4 py-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-w-0 cursor-pointer ${
            hubTab === 'zk_attest'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 shrink-0" />
          <span className="truncate sm:hidden">Аттестат</span>
          <span className="hidden sm:inline">{t('pulse:hub.tabsZkAttestHuman', 'Подтвердить баланс')}</span>
        </button>

        <button
          type="button"
          onClick={() => setHubTab('escrow')}
          className={`px-2 sm:px-4 py-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-w-0 cursor-pointer ${
            hubTab === 'escrow'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 hover:text-slate-200'
          }`}
        >
          <Anchor className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
          <span className="truncate sm:hidden">Сделки ({escrows.length})</span>
          <span className="hidden sm:inline">{t('pulse:hub.tabsEscrowHuman', 'Безопасные сделки')} ({escrows.length})</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* РАЗДЕЛ 1: UNIVERSAL PULSE FEED (Интерактивная лента)               */}
      {/* =================================================================== */}
      {hubTab === 'feed' && (
        <UniversalPulseFeed
          onStartChatWithUser={onStartChatWithUser}
          onOpenCreateModal={handleOpenCreateWithDomain}
        />
      )}

      {/* =================================================================== */}
      {/* РАЗДЕЛ 2: HALO2 ZK-SOLVENCY ATTESTATION (Генератор и Верификатор)   */}
      {/* =================================================================== */}
      {hubTab === 'zk_attest' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 space-y-4">
            <GlassCard className="p-5 space-y-4 rounded-2xl border-white/10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Параметры ZK-Доказательства</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Сформируйте математический аттестат платежеспособности без раскрытия реального адреса кошелька и баланса.
              </p>

              <div className="space-y-3 pt-2">
                <GlassInput
                  label="Минимально доказываемый баланс (TON)"
                  type="number"
                  value={zkAmountTon}
                  onChange={(e) => setZkAmountTon(e.target.value)}
                />

                <GlassInput
                  label="Возраст депозита в сети (дней)"
                  type="number"
                  value={String(zkDepositAge)}
                  onChange={(e) => setZkDepositAge(Number(e.target.value))}
                />

                {zkError && (
                  <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{zkError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setZkError(null)}
                      className="text-[10px] text-red-300 underline cursor-pointer"
                    >
                      Закрыть
                    </button>
                  </div>
                )}

                <GlassButton
                  variant="accent"
                  fullWidth
                  disabled={isVerifyingZk}
                  onClick={handleGenerateZkProof}
                  className="py-3 font-bold text-xs flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
                >
                  <Cpu className={`w-4 h-4 ${isVerifyingZk ? 'animate-spin' : ''}`} />
                  <span>{isVerifyingZk ? 'Вычисление Halo2 zk-SNARK...' : 'Сгенерировать ZK-Аттестат'}</span>
                </GlassButton>
              </div>
            </GlassCard>

            <GlassCard className="p-5 text-xs text-slate-400 space-y-2 border-dashed">
              <h4 className="font-bold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-400" />
                Как защищена анонимность?
              </h4>
              <p className="leading-relaxed">
                Доказательство строится на схеме обязательств Pedersen Commitment. Сервер и контрагент видят только публичный ZK-пропуск, подтверждающий истинность утверждения «Баланс $\ge X$ TON» за $O(1)$.
              </p>
            </GlassCard>
          </div>

          <div className="lg:col-span-7">
            <GlassCard glow className="p-6 min-h-[360px] flex flex-col justify-between rounded-2xl bg-neutral-950/70 border-white/10">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-xs font-bold uppercase text-slate-300">Статус ZK-Верификации</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Halo2-IPA PastaCycle
                  </span>
                </div>

                {!activeAttestation ? (
                  <div className="text-center py-16 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mx-auto">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Укажите критерии слева и нажмите «Сгенерировать ZK-Аттестат» для формирования криптографического пропуска.
                    </p>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                      <div>
                        <h4 className="text-sm font-bold text-white">ZK-Аттестат состоятельности подтвержден!</h4>
                        <p className="text-xs text-emerald-300">Математическое доказательство сгенерировано и валидно 24 часа.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                        <span className="text-[10px] text-slate-400 block">Мин. Баланс</span>
                        <span className="text-white font-bold">{activeAttestation.min_amount_ton} TON</span>
                      </div>
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                        <span className="text-[10px] text-slate-400 block">Возраст депозита</span>
                        <span className="text-white font-bold">≥ {activeAttestation.min_deposit_age_days} дней</span>
                      </div>
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5 col-span-2">
                        <span className="text-[10px] text-slate-400 block">Nullifier Hash (Sybil-Proof)</span>
                        <span className="text-purple-300 text-[10px] break-all">{activeAttestation.nullifier_hash}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5 col-span-2">
                        <span className="text-[10px] text-slate-400 block">ID Аттестата</span>
                        <span className="text-emerald-400 text-[10px] break-all">{activeAttestation.attestation_id}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="text-[10px] text-slate-500 pt-3 border-t border-white/5 flex justify-between">
                <span>Криптографический контур Zero-Knowledge</span>
                <span>TON Mainnet (-239)</span>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* РАЗДЕЛ 3: АКТИВНЫЕ DvP ЭСКРОУ СДЕЛКИ                                */}
      {/* =================================================================== */}
      {hubTab === 'escrow' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
            <h3 className="text-xs sm:text-sm font-bold text-white">
              Активные DvP Смарт-Эскроу контракты ({escrows.length})
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEscrowExample((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  showEscrowExample
                    ? 'bg-amber-500/25 text-amber-200 border border-amber-500/50'
                    : 'bg-white/5 text-amber-300 border border-amber-500/20 hover:bg-amber-500/15'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>{showEscrowExample ? 'Скрыть пример' : 'Пример контракта'}</span>
              </button>
              <GlassButton variant="accent" size="sm" onClick={() => setIsEscrowModalOpen(true)}>
                <Plus className="w-4 h-4" />
                <span>Создать контракт</span>
              </GlassButton>
            </div>
          </div>

          {escrowAdvanceError && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{escrowAdvanceError}</span>
              </div>
              <button
                type="button"
                onClick={() => setEscrowAdvanceError(null)}
                className="text-[10px] text-red-300 underline cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          )}

          {showEscrowExample && (
            <GlassCard glow className="p-4 sm:p-6 rounded-2xl border-amber-500/40 bg-amber-950/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-500/25 text-amber-200 border border-amber-500/40">
                      📖 ПРИМЕР / ОБРАЗЕЦ
                    </span>
                    <h4 className="text-sm font-bold text-white">{EXAMPLE_ESCROW_CONTRACT.title}</h4>
                  </div>
                  <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2">
                    <span>Товар: <b className="text-white">{EXAMPLE_ESCROW_CONTRACT.commodity}</b></span>
                    <span>•</span>
                    <span>Покупатель: <b className="text-emerald-400">{EXAMPLE_ESCROW_CONTRACT.buyer}</b></span>
                    <span>•</span>
                    <span>Продавец: <b className="text-blue-400">{EXAMPLE_ESCROW_CONTRACT.seller}</b></span>
                  </div>
                </div>
                <div className="flex flex-col sm:items-end gap-1.5 font-mono">
                  <div className="text-sm font-black text-emerald-400">{EXAMPLE_ESCROW_CONTRACT.amount_usdt} USDT</div>
                  <GlassButton
                    variant="accent"
                    size="sm"
                    onClick={() => {
                      setEscrowTitle('Поставка зерна (FOB Новороссийск -> Бандар-Аббас)');
                      setEscrowBuyer('Caspian_Trading_FZE');
                      setEscrowSeller('AgroExport_Corp');
                      setEscrowCommodity('Ячмень фуражный, 2000 тонн');
                      setEscrowAmountUsdt('450000.00');
                      setEscrowAmountTon('65000.00');
                      setShowEscrowExample(false);
                      setIsEscrowModalOpen(true);
                    }}
                    className="text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white"
                  >
                    ✨ Заполнить по этому образцу
                  </GlassButton>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {EXAMPLE_ESCROW_CONTRACT.phases.map((phase, idx) => {
                  const isDone = phase.status === 'completed';
                  const isActive = phase.status === 'active';
                  return (
                    <div
                      key={phase.id}
                      className={`p-3 rounded-xl border flex flex-col justify-between gap-2 text-xs ${
                        isDone
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                          : isActive
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                          : 'bg-white/2 border-white/5 text-slate-400'
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono opacity-70">Фаза {idx + 1}</span>
                        <h5 className="font-bold">{phase.name}</h5>
                        <p className="text-[10px] opacity-80 leading-tight">{phase.description}</p>
                      </div>
                      <div className="pt-2 border-t border-current/10 text-[10px] font-mono">
                        {phase.amount_percent}% средств
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}

          <div className="grid grid-cols-1 gap-4">
            {escrows.length === 0 ? (
              <div className="text-center py-10 px-3 rounded-2xl bg-white/[0.02] border border-white/5 text-slate-400 text-xs space-y-3">
                <FileCheck2 className="w-8 h-8 mx-auto text-slate-500 animate-pulse" />
                <p>Активных DvP смарт-контрактов пока нет.</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <GlassButton variant="accent" size="sm" onClick={() => setIsEscrowModalOpen(true)}>
                    Развернуть первый DvP контракт
                  </GlassButton>
                  <GlassButton variant="secondary" size="sm" onClick={() => setShowEscrowExample(true)}>
                    <BookOpen className="w-3.5 h-3.5 mr-1 text-amber-400" />
                    Посмотреть пример контракта
                  </GlassButton>
                </div>
              </div>
            ) : (
              escrows.map((esc) => (
                <GlassCard key={esc.id} glow className="p-4 sm:p-6 rounded-2xl border-white/10 space-y-4 sm:space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          DvP Smart-Contract #{esc.id.slice(-6)}
                        </span>
                        <h4 className="text-sm font-bold text-white">{esc.title}</h4>
                      </div>
                      <div className="text-xs text-slate-400 mt-1.5 flex flex-wrap items-center gap-2">
                        <span>Товар: <b className="text-slate-200">{esc.commodity}</b></span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <span>Покупатель: <b className="text-emerald-400">{esc.buyer}</b></span>
                          <ReputationBadgeView userAlias={esc.buyer} size="sm" />
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <span>Продавец: <b className="text-blue-400">{esc.seller}</b></span>
                          <ReputationBadgeView userAlias={esc.seller} size="sm" />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:items-end items-start gap-1.5 font-mono">
                      <div className="text-sm font-black text-emerald-400">{esc.amount_usdt} USDT</div>
                      <div className="text-[10px] text-slate-400">({esc.amount_ton} TON)</div>
                      <button
                        type="button"
                        onClick={() => {
                          setFeedbackInteractionId(esc.id);
                          setFeedbackTargetAlias(esc.seller);
                          setIsFeedbackModalOpen(true);
                        }}
                        className="mt-1 py-1 px-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-400/30 text-[10px] font-bold text-purple-300 flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Star className="w-3 h-3 fill-purple-300" />
                        <span>Оценить сделку</span>
                      </button>
                    </div>
                  </div>

                  {/* 4 Фазы эскроу контракта */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {esc.phases.map((phase, idx) => {
                      const isDone = phase.status === 'completed';
                      const isActive = phase.status === 'active';
                      return (
                        <div
                          key={phase.id}
                          className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 text-xs transition-all ${
                            isDone
                              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                              : isActive
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-200 ring-1 ring-amber-500/20 shadow-md'
                              : 'bg-white/2 border-white/5 text-slate-500'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="opacity-60">Фаза {idx + 1}</span>
                              {isDone ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : isActive ? (
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                              ) : null}
                            </div>
                            <h5 className="font-bold">{phase.name}</h5>
                            <p className="text-[10px] opacity-80 leading-tight">{phase.description}</p>
                          </div>

                          <div className="pt-2 border-t border-current/10 flex items-center justify-between text-[10px] font-mono">
                            <span>{phase.amount_percent}% средств</span>
                            {isActive && (
                              <button
                                type="button"
                                onClick={() => handleAdvanceEscrow(esc.id)}
                                className="py-1 px-2.5 rounded-lg bg-amber-500/30 hover:bg-amber-500/40 text-amber-200 font-bold transition-all cursor-pointer"
                              >
                                Подтвердить ➔
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        </div>
      )}

      {/* Модальное окно создания Pulse намерения */}
      <PulseCreateModal
        isOpen={isPulseCreateModalOpen}
        onClose={() => setIsPulseCreateModalOpen(false)}
        initialDomain={modalInitialDomain}
        onSuccess={() => {
          setHubTab('feed');
        }}
      />

      {/* Модальное окно создания DvP Эскроу */}
      <GlassModal
        isOpen={isEscrowModalOpen}
        onClose={() => setIsEscrowModalOpen(false)}
        title="🌾 Развертывание DvP Смарт-Эскроу контракта"
        size="md"
      >
        <form onSubmit={handleCreateEscrow} className="space-y-4 text-xs text-slate-200 py-2">
          <GlassInput
            label="Название сделки"
            placeholder="Поставка зерна (FOB Новороссийск -> Бандар-Аббас)"
            value={escrowTitle}
            onChange={(e) => setEscrowTitle(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GlassInput
              label="Псевдоним покупателя"
              placeholder="Buyer_Trading_Corp"
              value={escrowBuyer}
              onChange={(e) => setEscrowBuyer(e.target.value)}
            />
            <GlassInput
              label="Псевдоним продавца"
              placeholder="AgroExport_LLC"
              value={escrowSeller}
              onChange={(e) => setEscrowSeller(e.target.value)}
            />
          </div>

          <GlassInput
            label="Товар и спецификация"
            placeholder="Пшеница 4 класс, 3000 тонн"
            value={escrowCommodity}
            onChange={(e) => setEscrowCommodity(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GlassInput
              label="Сумма в USDT"
              placeholder="750000.00"
              value={escrowAmountUsdt}
              onChange={(e) => setEscrowAmountUsdt(e.target.value)}
            />
            <GlassInput
              label="Сумма в TON"
              placeholder="110000.00"
              value={escrowAmountTon}
              onChange={(e) => setEscrowAmountTon(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Тип оракула подтверждения:</label>
            <select
              value={escrowOracle}
              onChange={(e) => setEscrowOracle(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none"
            >
              <option value="sgs_inspection" className="bg-neutral-900">SGS / Bureau Veritas Инспекционный Сертификат</option>
              <option value="ais_solas" className="bg-neutral-900">AIS Спутниковый Трекер Морских Судов (SOLAS)</option>
              <option value="tlsnotary" className="bg-neutral-900">TLSNotary 2PC-TLS Web-Proof (Гос. Реестры)</option>
            </select>
          </div>

          {escrowCreateError && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{escrowCreateError}</span>
              </div>
              <button
                type="button"
                onClick={() => setEscrowCreateError(null)}
                className="text-[10px] text-red-300 underline cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          )}

          <GlassButton
            type="submit"
            variant="accent"
            fullWidth
            disabled={isCreatingEscrow}
            className="py-3 font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white cursor-pointer flex items-center justify-center gap-2"
          >
            {isCreatingEscrow ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Развертывание в TON...</span>
              </>
            ) : (
              <span>Развернуть DvP Смарт-Контракт</span>
            )}
          </GlassButton>
        </form>
      </GlassModal>

      {/* Модальное окно ZK-оценки сделки */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        interactionId={feedbackInteractionId}
        targetAlias={feedbackTargetAlias}
      />
    </div>
  );
};

export default SovereignEconomicHub;
