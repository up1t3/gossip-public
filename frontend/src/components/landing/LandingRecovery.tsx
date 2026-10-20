import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Key,
  FileKey,
  QrCode,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Terminal,
  Lock,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassButton, GlassCard } from '../../ui';
import { LandingTheme } from './LandingTypes';

interface LandingRecoveryProps {
  theme: LandingTheme;
}

export const LandingRecovery: React.FC<LandingRecoveryProps> = ({ theme }) => {
  const { t } = useTranslation(['landing', 'common']);
  const [recoveryTab, setRecoveryTab] = useState<'seed' | 'devices' | 'sim_swap'>('seed');
  const [generatedSeed, setGeneratedSeed] = useState<string[]>([
    'orbit', 'quantum', 'cipher', 'falcon', 'matrix', 'velvet',
    'beacon', 'puzzle', 'dynamic', 'timber', 'crystal', 'shield'
  ]);
  const [isRegeneratingSeed, setIsRegeneratingSeed] = useState<boolean>(false);

  const regenerateSeedWords = () => {
    setIsRegeneratingSeed(true);
    const wordPool = [
      'orbit', 'quantum', 'cipher', 'falcon', 'matrix', 'velvet',
      'beacon', 'puzzle', 'dynamic', 'timber', 'crystal', 'shield',
      'aurora', 'shadow', 'vector', 'planet', 'cosmic', 'anchor',
      'galaxy', 'silent', 'winter', 'silver', 'tunnel', 'spirit'
    ];
    const shuffled = [...wordPool].sort(() => 0.5 - Math.random()).slice(0, 12);
    setTimeout(() => {
      setGeneratedSeed(shuffled);
      setIsRegeneratingSeed(false);
    }, 250);
  };

  return (
    <section id="recovery" className="space-y-6 pt-6">
      <div className="text-center space-y-3">
        <div className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
          theme === 'light'
            ? 'bg-blue-100 text-blue-700 border border-blue-200'
            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
        }`}>
          <Key className="w-4 h-4" />
          {t('landing:recovery.badge', 'Zero-Knowledge Восстановление')}
        </div>

        <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
          theme === 'light' ? 'text-slate-900' : 'text-slate-100'
        }`}>
          {t('landing:recovery.title', 'Что если забыл пароль? Защита от перехвата и SIM-Swap')}
        </h2>

        <p className="text-slate-400 text-xs sm:text-sm max-w-2xl mx-auto font-medium">
          {t('landing:recovery.subtitle', 'В обычных мессенджерах сброс по SMS позволяет злоумышленникам или оператору связи прочитать всю вашу историю. В Gossip сервер физически не имеет ваших ключей, поэтому восстановление защищено математически.')}
        </p>
      </div>

      {/* Переключатель вкладок */}
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl mx-auto">
        <button
          type="button"
          onClick={() => setRecoveryTab('seed')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${
            recoveryTab === 'seed'
              ? (theme === 'light'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10')
              : (theme === 'light'
                  ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10')
          }`}
        >
          <FileKey className="w-3.5 h-3.5" />
          {t('landing:recovery.tabSeed', '1. Мнемоника BIP-39 (12 слов)')}
        </button>

        <button
          type="button"
          onClick={() => setRecoveryTab('devices')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${
            recoveryTab === 'devices'
              ? (theme === 'light'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10')
              : (theme === 'light'
                  ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10')
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          {t('landing:recovery.tabDevices', '2. Привязка доверенных устройств')}
        </button>

        <button
          type="button"
          onClick={() => setRecoveryTab('sim_swap')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${
            recoveryTab === 'sim_swap'
              ? (theme === 'light'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-rose-500/10')
              : (theme === 'light'
                  ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10')
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          {t('landing:recovery.tabSim', '3. Защита от SIM-Swap атак')}
        </button>
      </div>

      {/* Контент активной вкладки */}
      <GlassCard
        glow
        glowColor="rgba(16, 185, 129, 0.1)"
        className={`p-6 sm:p-8 border relative overflow-hidden ${
          theme === 'light' ? 'bg-white/90 border-slate-200' : 'bg-slate-900/40 border-white/10'
        }`}
      >
        {recoveryTab === 'seed' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className={`text-base font-bold flex items-center gap-2 ${
                  theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                }`}>
                  <FileKey className="w-4 h-4 text-emerald-400" />
                  {t('landing:recovery.seedTitle', 'Мастер-энтропия: 12 слов BIP-39')}
                </h3>
                <p className="text-xs text-slate-400">
                  {t('landing:recovery.seedDesc', 'Генерируются аппаратно на вашем устройстве при создании профиля. Сервер никогда не видит эти слова.')}
                </p>
              </div>

              <GlassButton
                variant="secondary"
                size="sm"
                onClick={regenerateSeedWords}
                disabled={isRegeneratingSeed}
                className="text-xs flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingSeed ? 'animate-spin' : ''}`} />
                {t('landing:recovery.seedBtn', 'Сгенерировать пример')}
              </GlassButton>
            </div>

            {/* Интерактивная сетка */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {generatedSeed.map((word, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-center justify-between font-mono text-xs ${
                    theme === 'light'
                      ? 'bg-slate-50 border-slate-200 text-slate-800'
                      : 'bg-black/30 border-white/5 text-slate-200'
                  }`}
                >
                  <span className="text-[10px] text-slate-400 font-sans">{idx + 1}.</span>
                  <span className="font-bold tracking-wider">{word}</span>
                </div>
              ))}
            </div>

            <div className={`p-4 rounded-xl border text-xs space-y-1.5 ${
              theme === 'light'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            }`}>
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {t('landing:recovery.seedProcessTitle', 'Как происходит восстановление:')}
              </div>
              <p className="leading-relaxed opacity-90">
                {t('landing:recovery.seedProcessDesc', 'Если вы забыли пароль или потеряли телефон: введите эти 12 слов на новом устройстве. Из них локально пересчитаются приватные ключи ML-KEM-768 и Curve25519, расшифруется локальная база сообщений и сгенерируется новый SRP-верификатор для сервера.')}
              </p>
            </div>
          </motion.div>
        )}

        {recoveryTab === 'devices' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="space-y-1">
              <h3 className={`text-base font-bold flex items-center gap-2 ${
                theme === 'light' ? 'text-slate-900' : 'text-slate-100'
              }`}>
                <QrCode className="w-4 h-4 text-indigo-400" />
                {t('landing:recovery.devicesTitle', 'Кросс-подтверждение через доверенный клиент (Multi-Device)')}
              </h3>
              <p className="text-xs text-slate-400">
                {t('landing:recovery.devicesDesc', 'Если у вас открыта сессия на компьютере или планшете, пароль на телефоне можно обновить мгновенно без обращения к серверу.')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-5 rounded-2xl border space-y-3 ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-black/30 border-white/5'
              }`}>
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                  <Terminal className="w-4 h-4" />
                  {t('landing:recovery.deviceStep1Title', '1. Эфемерное QR-рукопожатие')}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  {t('landing:recovery.deviceStep1Desc', 'Десктоп-клиент генерирует динамический QR-код с одноразовым публичным ключом X25519. Телефон сканирует код и устанавливает шифрованный P2P-туннель.')}
                </p>
              </div>

              <div className={`p-5 rounded-2xl border space-y-3 ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-black/30 border-white/5'
              }`}>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <Lock className="w-4 h-4" />
                  {t('landing:recovery.deviceStep2Title', '2. Безопасная синхронизация ключей')}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  {t('landing:recovery.deviceStep2Desc', 'Ключи шифрования чатов переносятся напрямую между вашими устройствами в зашифрованном виде. Сервер выступает только незрячим релеем.')}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {recoveryTab === 'sim_swap' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="space-y-1">
              <h3 className={`text-base font-bold flex items-center gap-2 ${
                theme === 'light' ? 'text-slate-900' : 'text-slate-100'
              }`}>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                {t('landing:recovery.simTitle', 'Защита от перехвата SMS, SIM-Swap и утери ключей')}
              </h3>
              <p className="text-xs text-slate-400">
                {t('landing:recovery.simDesc', 'Что происходит, если злоумышленник перевыпустил вашу SIM-карту или взломал почту?')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
              <div className={`p-5 rounded-2xl border space-y-3 ${
                theme === 'light' ? 'bg-rose-50/70 border-rose-200' : 'bg-rose-950/20 border-rose-500/20'
              }`}>
                <div className="font-bold text-rose-400 flex items-center gap-1.5">
                  <X className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{t('landing:recovery.simTradTitle', 'Обычный мессенджер (Telegram / WhatsApp)')}</span>
                </div>
                <ul className="space-y-2 text-slate-400 leading-relaxed">
                  <li>• {t('landing:recovery.simTrad1', 'Злоумышленник перехватывает SMS-код через оператора связи.')}</li>
                  <li>• {t('landing:recovery.simTrad2', 'Сервер выгружает злоумышленнику всю вашу переписку, контакты и медиа.')}</li>
                  <li>• {t('landing:recovery.simTrad3', 'Полная компрометация конфиденциальности.')}</li>
                </ul>
              </div>

              <div className={`p-5 rounded-2xl border space-y-3 ${
                theme === 'light' ? 'bg-emerald-50/70 border-emerald-200' : 'bg-emerald-950/20 border-emerald-500/20'
              }`}>
                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{t('landing:recovery.simGossipTitle', 'Gossip Zero-Knowledge Protocol')}</span>
                </div>
                <ul className="space-y-2 text-slate-400 leading-relaxed">
                  <li>• {t('landing:recovery.simGossip1', 'Злоумышленник перехватил SMS или пытается сбросить аккаунт.')}</li>
                  <li>• {t('landing:recovery.simGossip2', 'Криптографическая самоликвидация: без пароля или 12 слов старые ключи дешифрования невозможно вычислить.')}</li>
                  <li>• {t('landing:recovery.simGossip3', 'Злоумышленник получает пустой профиль. Утечка данных: 0%.')}</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </GlassCard>
    </section>
  );
};
