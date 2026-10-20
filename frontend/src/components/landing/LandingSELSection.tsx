import React, { useState } from 'react';
import {
  Coins,
  Anchor,
  Scale,
  Briefcase,
  Handshake,
  ScanLine,
  Play,
  Check,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassButton, GlassCard } from '../../ui';
import { LandingTheme } from './LandingTypes';

interface LandingSELSectionProps {
  theme: LandingTheme;
}

export const LandingSELSection: React.FC<LandingSELSectionProps> = () => {
  const { t } = useTranslation(['landing', 'common']);
  const [selActiveTab, setSelActiveTab] = useState<'p2p' | 'trade' | 'civic' | 'hr' | 'aid'>('trade');
  const [selStep, setSelStep] = useState<number>(0);
  const [isSelSimulating, setIsSelSimulating] = useState<boolean>(false);

  const runSelSimulation = async () => {
    if (isSelSimulating) return;
    setIsSelSimulating(true);
    setSelStep(1);
    await new Promise((r) => setTimeout(r, 650));
    setSelStep(2);
    await new Promise((r) => setTimeout(r, 750));
    setSelStep(3);
    await new Promise((r) => setTimeout(r, 800));
    setSelStep(4);
    await new Promise((r) => setTimeout(r, 600));
    setIsSelSimulating(false);
  };

  return (
    <section id="sovereign-economic-layer" className="space-y-8 pt-4">
      <div className="border-b border-white/5 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 mb-3">
          <Coins className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
          <span>{t('landing:selSection.badge', 'GOSSIP SOVEREIGN ECONOMIC LAYER • СУВЕРЕННЫЙ ЭКОНОМИЧЕСКИЙ СЛОЙ')}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
          {t('landing:selSection.title', 'Суверенная Экономика: Безопасные сделки без посредников')}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-3xl leading-relaxed">
          {t('landing:selSection.subtitle', 'Децентрализованный слой коммерческих намерений (SEL) на базе Zero-Knowledge Proofs и блокчейна TON. Доказывайте финансовую состоятельность без раскрытия баланса, находите контрагентов и проводите сделки с автоматической гарантией смарт-эскроу.')}
        </p>
      </div>

      {/* 5 Целевых Направлений */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Таб 1: P2P Валюта и Наличные */}
        <div
          onClick={() => setSelActiveTab('p2p')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            selActiveTab === 'p2p'
              ? 'bg-emerald-950/30 border-emerald-500/50 shadow-glass-sm ring-1 ring-emerald-500/30'
              : 'bg-white/3 border-white/5 hover:border-white/15'
          }`}
        >
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Coins className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-100">{t('landing:selSection.tab1Title', '1. P2P Обмен & Наличные')}</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {t('landing:selSection.tab1Desc', 'USDT ↔ Наличные в радиусе 1 км без банков, KYC и риска блокировок счетов.')}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 text-[9px] text-emerald-400 font-mono font-semibold">
            {t('landing:selSection.tab1Footer', 'Dark Liquidity Pool')}
          </div>
        </div>

        {/* Таб 2: ВЭД и Торговый Смарт-Эскроу */}
        <div
          onClick={() => setSelActiveTab('trade')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            selActiveTab === 'trade'
              ? 'bg-amber-950/30 border-amber-500/50 shadow-glass-sm ring-1 ring-amber-500/30'
              : 'bg-white/3 border-white/5 hover:border-white/15'
          }`}
        >
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Anchor className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-100">{t('landing:selSection.tab2Title', '2. ВЭД & Смарт-Эскроу')}</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {t('landing:selSection.tab2Desc', 'Трансграничные поставки (зерно, сырье). Спутники AIS + SGS-аудит + расчет DvP в TON.')}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 text-[9px] text-amber-400 font-mono font-semibold">
            {t('landing:selSection.tab2Footer', 'Суверенный клиринг')}
          </div>
        </div>

        {/* Таб 3: Гражданский Порог и Петиции */}
        <div
          onClick={() => setSelActiveTab('civic')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            selActiveTab === 'civic'
              ? 'bg-purple-950/30 border-purple-500/50 shadow-glass-sm ring-1 ring-purple-500/30'
              : 'bg-white/3 border-white/5 hover:border-white/15'
          }`}
        >
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Scale className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-100">{t('landing:selSection.tab3Title', '3. Порог согласия')}</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {t('landing:selSection.tab3Desc', 'Слепой кворум: раскрытие манифеста только при наборе N ≥ 1000 участников без риска для одиночек.')}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 text-[9px] text-purple-400 font-mono font-semibold">
            {t('landing:selSection.tab3Footer', 'Threshold Consensus')}
          </div>
        </div>

        {/* Таб 4: Скрытый Хедхантинг */}
        <div
          onClick={() => setSelActiveTab('hr')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            selActiveTab === 'hr'
              ? 'bg-blue-950/30 border-blue-500/50 shadow-glass-sm ring-1 ring-blue-500/30'
              : 'bg-white/3 border-white/5 hover:border-white/15'
          }`}
        >
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Briefcase className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-100">{t('landing:selSection.tab4Title', '4. Приватная карьера')}</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {t('landing:selSection.tab4Desc', 'Мэтчинг топ-инженеров и работодателей по слепым хэшам без публичных резюме.')}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 text-[9px] text-blue-400 font-mono font-semibold">
            {t('landing:selSection.tab4Footer', 'Zero-Leak Recruitment')}
          </div>
        </div>

        {/* Таб 5: Редкие Ресурсы & Взаимопомощь */}
        <div
          onClick={() => setSelActiveTab('aid')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            selActiveTab === 'aid'
              ? 'bg-cyan-950/30 border-cyan-500/50 shadow-glass-sm ring-1 ring-cyan-500/30'
              : 'bg-white/3 border-white/5 hover:border-white/15'
          }`}
        >
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Handshake className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-100">{t('landing:selSection.tab5Title', '5. Взаимопомощь')}</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {t('landing:selSection.tab5Desc', 'Анонимный поиск редких медикаментов и доноров по хэш-маскам с медицинской тайной.')}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 text-[9px] text-cyan-400 font-mono font-semibold">
            {t('landing:selSection.tab5Footer', 'Blind Stigma-Free Aid')}
          </div>
        </div>
      </div>

      {/* Интерактивный симулятор */}
      <GlassCard glow className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-emerald-400" />
              {t('landing:selSection.simBadge', 'ИНТЕРАКТИВНЫЙ СИМУЛЯТОР СДЕЛКИ SEL INTENT')}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {t('landing:selSection.subtitle', 'Децентрализованный слой коммерческих намерений (SEL) на базе Zero-Knowledge Proofs и блокчейна TON.')}
            </p>
          </div>
          <GlassButton
            variant="accent"
            size="sm"
            onClick={runSelSimulation}
            disabled={isSelSimulating}
            className="flex items-center gap-2 shrink-0 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <Play className={`w-3.5 h-3.5 ${isSelSimulating ? 'animate-spin' : ''}`} />
            {isSelSimulating ? t('landing:selSection.simRunning', 'Выполнение криптографического протокола...') : t('landing:selSection.simBtn', 'Смоделировать ZK-сделку')}
          </GlassButton>
        </div>

        {/* Схема 4 этапов */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
          <div className={`p-4 rounded-2xl border transition-all ${
            selStep >= 1
              ? 'bg-emerald-950/30 border-emerald-500/50 shadow-glass-sm'
              : 'bg-white/2 border-white/5'
          }`}>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 mx-auto flex items-center justify-center text-xs font-bold mb-2">
              01
            </div>
            <h4 className="text-xs font-bold text-slate-100">{t('landing:selSection.simStep1', '1. Залог & ZKP')}</h4>
            <p className="text-[10px] text-slate-400 mt-1">{t('landing:selSection.simStep1Desc', '128-bit SimHash (BLAKE3) + Uber H3 Res 8.')}</p>
            {selStep >= 1 && (
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full inline-block mt-2 font-mono">
                OK
              </span>
            )}
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            selStep >= 2
              ? 'bg-emerald-950/30 border-emerald-500/50 shadow-glass-sm'
              : 'bg-white/2 border-white/5'
          }`}>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 mx-auto flex items-center justify-center text-xs font-bold mb-2">
              02
            </div>
            <h4 className="text-xs font-bold text-slate-100">{t('landing:selSection.simStep2', '2. Эскроу TON')}</h4>
            <p className="text-[10px] text-slate-400 mt-1">{t('landing:selSection.simStep2Desc', 'Доказательство баланса и возраста депозита.')}</p>
            {selStep >= 2 && (
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full inline-block mt-2 font-mono">
                ZK-Pass ✓
              </span>
            )}
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            selStep >= 3
              ? 'bg-emerald-950/30 border-emerald-500/50 shadow-glass-sm'
              : 'bg-white/2 border-white/5'
          }`}>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 mx-auto flex items-center justify-center text-xs font-bold mb-2">
              03
            </div>
            <h4 className="text-xs font-bold text-slate-100">{t('landing:selSection.simStep3', '3. Доставка')}</h4>
            <p className="text-[10px] text-slate-400 mt-1">{t('landing:selSection.simStep3Desc', 'Мгновенный поиск O(1) и защита Double Ratchet.')}</p>
            {selStep >= 3 && (
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full inline-block mt-2 font-mono">
                Matched ✓
              </span>
            )}
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            selStep >= 4
              ? 'bg-emerald-950/30 border-emerald-500/50 shadow-glass-sm'
              : 'bg-white/2 border-white/5'
          }`}>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 mx-auto flex items-center justify-center text-xs font-bold mb-2">
              04
            </div>
            <h4 className="text-xs font-bold text-slate-100">{t('landing:selSection.simStep4', '4. Расчет')}</h4>
            <p className="text-[10px] text-slate-400 mt-1">{t('landing:selSection.simStep4Desc', 'Автоматический клиринг TON DvP Smart-Escrow.')}</p>
            {selStep >= 4 && (
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full inline-block mt-2 font-mono">
                Done! ✓
              </span>
            )}
          </div>
        </div>

        {/* Прогресс-бар */}
        <div className="space-y-2 pt-2">
          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 h-full transition-all duration-500"
              style={{ width: `${(selStep / 4) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>{t('landing:selSection.simStatusInit', 'Инициация намерения')}</span>
            <span>
              {selStep === 0 && t('landing:selSection.simStatus0', 'Ожидание запуска симуляции')}
              {selStep === 1 && t('landing:selSection.simStatus1', '1. Вычисление LSH корзины и H3 гексагона')}
              {selStep === 2 && t('landing:selSection.simStatus2', '2. Генерация Halo2 пруфа на Pasta Cycle (IPA)')}
              {selStep === 3 && t('landing:selSection.simStatus3', '3. O(1) Blind Rendezvous в Redis Cluster')}
              {selStep === 4 && t('landing:selSection.simStatus4', '4. Подтверждение оракулов и выплата из DvP эскроу')}
            </span>
            <span>{t('landing:selSection.simStatusDone', 'Завершение 100%')}</span>
          </div>
        </div>
      </GlassCard>

      {/* Сравнительная таблица */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-slate-400 font-semibold">
              <th className="py-3 px-4">{t('landing:selSection.tableColCriteria', 'Параметр / Критерий')}</th>
              <th className="py-3 px-4 text-center">{t('landing:selSection.tableColBank', 'Традиционный Банк / SWIFT')}</th>
              <th className="py-3 px-4 text-center">{t('landing:selSection.tableColP2p', 'P2P-Биржи (Bybit / Binance)')}</th>
              <th className="py-3 px-4 text-center text-emerald-400 font-bold bg-emerald-500/10 rounded-t-xl">
                {t('landing:selSection.tableColGossip', 'Gossip Sovereign Layer (SEL)')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300">
            {([1, 2, 3, 4, 5] as const).map((rowNum) => (
              <tr key={rowNum}>
                <td className="py-3 px-4 font-medium">
                  {t(`landing:selSection.tableRow${rowNum}Name`)}
                </td>
                <td className="py-3 px-4 text-center text-rose-400 font-mono">
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <X className="w-3.5 h-3.5 shrink-0 text-rose-400/80" />
                    <span>{t(`landing:selSection.tableRow${rowNum}Bank`)}</span>
                  </span>
                </td>
                <td className="py-3 px-4 text-center text-amber-400 font-mono">
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <X className="w-3.5 h-3.5 shrink-0 text-amber-400/80" />
                    <span>{t(`landing:selSection.tableRow${rowNum}P2p`)}</span>
                  </span>
                </td>
                <td className="py-3 px-4 text-center text-emerald-400 font-bold font-mono bg-emerald-500/5">
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span>{t(`landing:selSection.tableRow${rowNum}Gossip`)}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
