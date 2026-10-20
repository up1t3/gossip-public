import React from 'react';
import {
  Wallet,
  Zap,
  ArrowRightLeft,
  FileText,
  Lock
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../../ui';
import { LandingTheme } from './LandingTypes';

interface LandingTonSectionProps {
  theme: LandingTheme;
}

export const LandingTonSection: React.FC<LandingTonSectionProps> = ({ theme }) => {
  const { t } = useTranslation(['landing', 'common']);

  return (
    <section id="ton-ecosystem" className="space-y-8 pt-4">
      <div className="border-b border-white/5 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-300 border border-sky-500/30 mb-3">
          <Wallet className="w-3.5 h-3.5 animate-pulse text-sky-400" />
          <span>{t('landing:tonSection.badge', 'ЭКОСИСТЕМА TON CONNECT 2.0 • ВСТРОЕННЫЙ КРИПТОКОШЕЛЕК')}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
          {t('landing:tonSection.title', 'TON Wallet & In-Chat Payments: Финансы прямо в диалогах')}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-3xl leading-relaxed">
          {t('landing:tonSection.subtitle', 'Мгновенное подключение некастодиальных кошельков через TON Connect 2.0, отправка криптовалюты собеседнику прямо в чате, выставление смарт-счетов для ботов и магазинов с валидацией в блокчейне The Open Network.')}
        </p>
      </div>

      {/* 4 Карточки возможностей TON */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Карточка 1 */}
        <GlassCard glow className="p-5 space-y-3 bg-sky-950/20 border-sky-500/20 rounded-2xl flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-100">{t('landing:tonSection.cardConnectTitle', 'TON Connect 2.0')}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('landing:tonSection.cardConnectDesc', 'Поддержка всех ведущих кошельков: Tonkeeper, MyTonWallet, OpenMask, Telegram Wallet. Авторизация по криптографической подписи.')}
            </p>
          </div>
          <div className="pt-3 border-t border-white/5 text-[10px] text-sky-400 font-mono font-semibold">
            {t('landing:tonSection.cardConnectFooter', 'Некастодиальное подключение')}
          </div>
        </GlassCard>

        {/* Карточка 2 */}
        <GlassCard glow className="p-5 space-y-3 bg-emerald-950/20 border-emerald-500/20 rounded-2xl flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-100">{t('landing:tonSection.cardP2pTitle', 'P2P-переводы в чатах')}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('landing:tonSection.cardP2pDesc', 'Отправляйте TON и USDT (Jetton) собеседнику в один клик. Генерация транзакции с адресом и защищенным Memo прямо в переписке.')}
            </p>
          </div>
          <div className="pt-3 border-t border-white/5 text-[10px] text-emerald-400 font-mono font-semibold">
            {t('landing:tonSection.cardP2pFooter', 'Мгновенные переводы без комиссий сервиса')}
          </div>
        </GlassCard>

        {/* Карточка 3 */}
        <GlassCard glow className="p-5 space-y-3 bg-amber-950/20 border-amber-500/20 rounded-2xl flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-100">{t('landing:tonSection.cardInvoiceTitle', 'Смарт-инвойсы & Боты')}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('landing:tonSection.cardInvoiceDesc', 'Выставляйте счета на оплату услуг, цифровых товаров и подписок. Автоматическое подтверждение транзакции через WebSocket.')}
            </p>
          </div>
          <div className="pt-3 border-t border-white/5 text-[10px] text-amber-400 font-mono font-semibold">
            {t('landing:tonSection.cardInvoiceFooter', 'Готовый API для e-commerce')}
          </div>
        </GlassCard>

        {/* Карточка 4 */}
        <GlassCard glow className="p-5 space-y-3 bg-purple-950/20 border-purple-500/20 rounded-2xl flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-100">{t('landing:tonSection.cardEscrowTitle', 'Защищенный Эскроу')}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('landing:tonSection.cardEscrowDesc', 'Безопасные расчеты для фрилансеров и интернет-магазинов с заморозкой средств до подтверждения получения товара.')}
            </p>
          </div>
          <div className="pt-3 border-t border-white/5 text-[10px] text-purple-400 font-mono font-semibold">
            {t('landing:tonSection.cardEscrowFooter', 'Zero-Knowledge безопасность')}
          </div>
        </GlassCard>
      </div>

      {/* Информационный баннер архитектуры кошелька */}
      <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        theme === 'light'
          ? 'bg-sky-50/70 border-sky-200 text-slate-700'
          : 'bg-sky-950/15 border-sky-500/20 text-slate-300'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-sky-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100">
              {t('landing:tonSection.cardConnectTitle', 'TON Connect 2.0')}: {t('landing:tonSection.cardConnectFooter', 'Некастодиальное подключение')}
            </h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('landing:tonSection.cardConnectDesc', 'Поддержка всех ведущих кошельков: Tonkeeper, MyTonWallet, OpenMask, Telegram Wallet. Авторизация по криптографической подписи.')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
            TON Connect 2.0 Ready
          </span>
        </div>
      </div>
    </section>
  );
};
