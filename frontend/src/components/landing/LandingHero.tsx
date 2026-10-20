import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  ShieldCheck,
  ArrowRight,
  Scale,
  Smartphone,
  QrCode,
  Radio,
  Lock,
  PhoneOff,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AtSign,
  Check,
  Copy
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import packageJson from '../../../package.json';
import { GlassButton } from '../../ui';
import { LandingTheme } from './LandingTypes';

interface LandingHeroProps {
  theme: LandingTheme;
  liveVersion?: string;
  liveBuild?: number;
  liveReleaseNotes?: string;
  onLoginClick: () => void;
  onInstallClick: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  theme,
  liveVersion = packageJson.version,
  liveBuild = 392,
  liveReleaseNotes = 'Gossip v2.2.32: Полная локализация всех разделов приложения, настроек, сетевого центра, кошелька, Pulse и лендинга на 8 языков (RU, EN, ES, ZH, AR, FA, FR, DE).',
  onLoginClick,
  onInstallClick,
}) => {
  const { t, i18n } = useTranslation(['landing', 'common']);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrTarget, setQrTarget] = useState<'apk' | 'pwa'>('apk');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showReleaseNotes, setShowReleaseNotes] = useState<boolean>(false);
  const [copiedCreator, setCopiedCreator] = useState<boolean>(false);

  useEffect(() => {
    if (!showQrModal) return;
    const url = qrTarget === 'apk'
      ? 'https://skuf-net.ru/gossip.apk'
      : 'https://skuf-net.ru';
    QRCode.toDataURL(url, {
      width: 240,
      margin: 2,
      color: {
        dark: '#10E7B2',
        light: '#0a0f18',
      },
    })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [showQrModal, qrTarget]);

  const handleCopyCreator = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('@up1t3r').catch(() => {});
    }
    setCopiedCreator(true);
    setTimeout(() => setCopiedCreator(false), 2200);
  };

  return (
    <section className="text-center space-y-6 pt-6 max-w-3xl mx-auto">
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all ${
          theme === 'light'
            ? 'bg-slate-100 border border-slate-200 text-slate-600'
            : 'bg-white/[0.03] border border-white/10 text-slate-300'
        }`}
      >
        <ShieldCheck className={`w-4 h-4 shrink-0 ${theme === 'light' ? 'text-blue-600' : 'text-[#10E7B2]'}`} />
        <span>{t('landing:hero.badge', 'Суверенный мессенджер без коммерческой слежки, цензуры и бэкдоров')}</span>
      </div>

      <h1
        className={`text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight ${
          theme === 'light' ? 'text-slate-900' : 'text-slate-100'
        }`}
      >
        {t('landing:hero.titleLine1', 'Честный мессенджер')} <br className="hidden sm:inline" />
        <span className={`${
          theme === 'light'
            ? 'text-blue-600'
            : 'text-transparent bg-clip-text bg-gradient-to-r from-[#10E7B2] via-[#00F5A0] to-[#00D9F5]'
        }`}>
          {t('landing:hero.titleLine2', 'без мелкого шрифта')}
        </span>
      </h1>

      <p
        className={`text-sm sm:text-base md:text-lg max-w-2xl mx-auto font-medium ${
          theme === 'light' ? 'text-slate-600' : 'text-slate-400'
        }`}
      >
        {t('landing:hero.subtitle', 'Gossip — это суверенная распределенная платформа: постквантовое сквозное шифрование (PQ-MLS), автономная рация BLE Mesh при блэкаутах, встроенный криптокошелек TON и защищенный слой сделок Sovereign Economic Layer (SEL).')}
      </p>

      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 pt-4">
        <GlassButton
          variant="accent"
          size="lg"
          onClick={onLoginClick}
          className={`w-full sm:w-auto px-8 py-4 text-sm font-bold flex items-center justify-center gap-2 border shadow-lg ${
            theme === 'light'
              ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500/30 shadow-blue-500/10'
              : 'bg-gradient-to-r from-[#10E7B2] to-[#00D9F5] text-slate-950 border-transparent hover:brightness-110 shadow-[0_0_25px_rgba(16,231,178,0.3)]'
          }`}
        >
          {t('landing:hero.openBrowser', 'Открыть в браузере')}
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
        </GlassButton>
        <GlassButton
          variant="secondary"
          size="lg"
          onClick={onInstallClick}
          className="w-full sm:w-auto px-7 py-4 text-sm font-bold flex items-center justify-center gap-2"
        >
          <Smartphone className="w-4 h-4" />
          {t('landing:hero.installApk', { version: liveVersion, defaultValue: `Установить APK (v${liveVersion})` })}
        </GlassButton>
        <GlassButton
          variant="secondary"
          size="lg"
          onClick={() => setShowQrModal((v) => !v)}
          className="w-full sm:w-auto px-5 py-4 text-sm font-bold flex items-center justify-center gap-2"
          title={t('landing:hero.qrBtnTitle', 'Скачать на смартфон по QR-коду')}
        >
          <QrCode className="w-4 h-4 text-[#10E7B2]" />
          <span>{t('landing:hero.qrBtn', 'QR на телефон')}</span>
        </GlassButton>
      </div>

      {/* Быстрые тезисы суверенности + верификация кода + контакт создателя */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] font-medium">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${
          theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-white/[0.03] border-white/10 text-slate-300'
        }`}>
          <PhoneOff className="w-3.5 h-3.5 text-[#10E7B2]" />
          {t('landing:hero.trustNoSim', 'Без SIM-карты и номера телефона')}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${
          theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-white/[0.03] border-white/10 text-slate-300'
        }`}>
          <Radio className="w-3.5 h-3.5 text-purple-400" />
          {t('landing:hero.trustBleMesh', 'Автономный BLE Mesh без интернета')}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${
          theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-white/[0.03] border-white/10 text-slate-300'
        }`}>
          <Lock className="w-3.5 h-3.5 text-cyan-400" />
          {t('landing:hero.trustDeviceKeys', 'Ключи шифрования только на вашем устройстве')}
        </span>
        <a
          href="https://github.com/up1t3/gossip-public"
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-colors ${
            theme === 'light'
              ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Open-Client • SHA-256: EC:3E:02:AF...</span>
        </a>
        <button
          type="button"
          onClick={handleCopyCreator}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-colors cursor-pointer ${
            theme === 'light'
              ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
              : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20'
          }`}
          title={t('landing:footer.creatorHint', 'Нажмите, чтобы скопировать никнейм для связи внутри мессенджера')}
        >
          <AtSign className="w-3.5 h-3.5" />
          <span>
            {copiedCreator
              ? t('landing:hero.creatorCopied', 'Ник @up1t3r скопирован')
              : t('landing:hero.creatorBadge', 'Создатель в Gossip: @up1t3r')}
          </span>
          {copiedCreator ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-70" />}
        </button>
        <button
          type="button"
          onClick={() => setShowReleaseNotes((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-colors cursor-pointer ${
            theme === 'light'
              ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
              : 'bg-purple-500/15 border-purple-500/35 text-purple-300 hover:bg-purple-500/25'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>
            {t('landing:hero.whatsNew', {
              version: liveVersion,
              build: liveBuild,
              defaultValue: `Что нового в v${liveVersion} (Build #${liveBuild})`
            })}
          </span>
          {showReleaseNotes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Живая сводка последнего релиза с сервера */}
      {showReleaseNotes && (
        <div
          className={`p-3.5 rounded-2xl border text-left text-xs leading-relaxed animate-fade-in ${
            theme === 'light'
              ? 'bg-purple-50/80 border-purple-200 text-slate-700'
              : 'bg-purple-500/10 border-purple-500/30 text-slate-200'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={`font-bold flex items-center gap-1.5 ${theme === 'light' ? 'text-purple-700' : 'text-purple-300'}`}>
              <Sparkles className="w-3.5 h-3.5" />
              {t('landing:hero.liveReleaseTitle', {
                version: liveVersion,
                build: liveBuild,
                defaultValue: `Актуальный релиз v${liveVersion} (Сборка #${liveBuild} • Live API)`
              })}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {t('landing:hero.onlineBadge', 'АКТУАЛЬНО')}
            </span>
          </div>
          <p className={theme === 'light' ? 'text-slate-600' : 'text-slate-300'}>
            {i18n.language?.startsWith('ru')
              ? liveReleaseNotes
              : t('landing:hero.WhatsNew', { version: liveVersion, build: liveBuild, defaultValue: liveReleaseNotes })}
          </p>
        </div>
      )}

      {/* Apple-style Bento Витрина 4 ключевых суперсил Gossip (полностью локализованная) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-left">
        <div className={`p-4 rounded-2xl border transition-all ${
          theme === 'light'
            ? 'bg-white/95 border-slate-200 shadow-sm'
            : 'bg-white/[0.02] border-white/10 hover:border-emerald-500/30'
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[11px] font-extrabold uppercase tracking-wider ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}`}>
              {t('landing:hero.bento1Label', '01 • СВЯЗЬ БЕЗ ПРЕГРАД')}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              {t('landing:hero.bento1Tech', 'Anti-DPI + PQ E2EE')}
            </span>
          </div>
          <div className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
            {t('landing:hero.bento1Title', 'Работает с VPN и при блокировках ТСПУ')}
          </div>
          <p className={`text-xs mt-1 leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
            {t('landing:hero.bento1Desc', 'Сетевой щит маскирует трафик под обычный HTTPS и сохраняет сквозное шифрование даже при смене IP-адреса.')}
          </p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          theme === 'light'
            ? 'bg-white/95 border-slate-200 shadow-sm'
            : 'bg-white/[0.02] border-white/10 hover:border-purple-500/30'
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[11px] font-extrabold uppercase tracking-wider ${theme === 'light' ? 'text-purple-700' : 'text-purple-400'}`}>
              {t('landing:hero.bento2Label', '02 • АВТОНОМНЫЙ РАДАР')}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/25">
              {t('landing:hero.bento2Tech', 'BLE Mesh 2.4 GHz')}
            </span>
          </div>
          <div className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
            {t('landing:hero.bento2Title', 'Офлайн-рация без интернета и сотовой сети')}
          </div>
          <p className={`text-xs mt-1 leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
            {t('landing:hero.bento2Desc', 'Находит смартфоны поблизости по радиоканалу Bluetooth и передает зашифрованные сообщения по цепочке через соседей.')}
          </p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          theme === 'light'
            ? 'bg-white/95 border-slate-200 shadow-sm'
            : 'bg-white/[0.02] border-white/10 hover:border-sky-500/30'
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[11px] font-extrabold uppercase tracking-wider ${theme === 'light' ? 'text-sky-700' : 'text-sky-400'}`}>
              {t('landing:hero.bento3Label', '03 • ПУЛЬС & ФИНАНСЫ')}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/25">
              {t('landing:hero.bento3Tech', 'TON Connect + ZKP')}
            </span>
          </div>
          <div className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
            {t('landing:hero.bento3Title', 'Безопасные сделки и переводы TON в чате')}
          </div>
          <p className={`text-xs mt-1 leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
            {t('landing:hero.bento3Desc', 'Подтверждайте баланс без раскрытия кошелька, создавайте смарт-эскроу сделки и отправляйте TON/USDT в 1 касание.')}
          </p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          theme === 'light'
            ? 'bg-white/95 border-slate-200 shadow-sm'
            : 'bg-white/[0.02] border-white/10 hover:border-amber-500/30'
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[11px] font-extrabold uppercase tracking-wider ${theme === 'light' ? 'text-amber-700' : 'text-amber-400'}`}>
              {t('landing:hero.bento4Label', '04 • СПЕЦ-АРСЕНАЛ PRO')}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/25">
              {t('landing:hero.bento4Tech', 'Hardware & Anti-Forensic')}
            </span>
          </div>
          <div className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
            {t('landing:hero.bento4Title', '«Двойное дно», модулятор голоса и Burner-комнаты')}
          </div>
          <p className={`text-xs mt-1 leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
            {t('landing:hero.bento4Desc', 'Ложный PIN-код под принуждением, 5 аппаратных тембров маскировки голоса, автосброс «Периметр» и одноразовые чаты.')}
          </p>
        </div>
      </div>

      {/* Всплывающая карточка с QR-кодом для мгновенной установки со смартфона */}
      {showQrModal && (
        <div className={`p-5 rounded-3xl border max-w-md mx-auto animate-fade-in relative ${
          theme === 'light'
            ? 'bg-white border-slate-200 shadow-xl text-slate-800'
            : 'bg-[#0a0f18]/95 border-[#10E7B2]/30 shadow-[0_0_40px_rgba(16,231,178,0.15)] text-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => setShowQrModal(false)}
            className="absolute top-3.5 right-3.5 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            aria-label={t('common:actions.close', 'Закрыть')}
          >
            <X className="w-4 h-4" />
          </button>
          <div className="space-y-3 text-center">
            <h3 className="text-sm font-bold flex items-center justify-center gap-1.5">
              <Smartphone className="w-4 h-4 text-[#10E7B2]" />
              <span>{t('landing:hero.qrModalTitle', 'Установка на смартфон')}</span>
            </h3>
            <div className="inline-flex p-1 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setQrTarget('apk')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  qrTarget === 'apk'
                    ? 'bg-[#10E7B2]/20 text-[#10E7B2] border border-[#10E7B2]/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Android APK (BLE Mesh)
              </button>
              <button
                type="button"
                onClick={() => setQrTarget('pwa')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  qrTarget === 'pwa'
                    ? 'bg-[#10E7B2]/20 text-[#10E7B2] border border-[#10E7B2]/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                iOS / Web PWA
              </button>
            </div>
            {qrDataUrl && (
              <div className="flex justify-center py-1">
                <img
                  src={qrDataUrl}
                  alt="Gossip QR"
                  className="w-44 h-44 rounded-2xl border border-[#10E7B2]/30 p-2 bg-[#0a0f18]"
                />
              </div>
            )}
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {qrTarget === 'apk'
                ? t('landing:hero.qrModalApkDesc', { version: liveVersion, defaultValue: `Прямая загрузка подписанного Android APK (v${liveVersion}) с нативным радиомодулем Bluetooth LE Mesh.` })
                : t('landing:hero.qrModalPwaDesc', 'Откройте в Safari на iPhone и нажмите «Поделиться → На экран Домой» для установки защищенного PWA.')}
            </p>
          </div>
        </div>
      )}

      {/* Международный манифест защиты прав и приватности */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border text-left flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-6 ${
          theme === 'light'
            ? 'bg-blue-50/70 border-blue-200 text-slate-700'
            : 'bg-[#10E7B2]/5 border-[#10E7B2]/20 text-slate-300'
        }`}
      >
        <div className={`p-2.5 rounded-xl shrink-0 ${
          theme === 'light' ? 'bg-blue-100 text-blue-700' : 'bg-[#10E7B2]/10 text-[#10E7B2]'
        }`}>
          <Scale className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${
              theme === 'light' ? 'text-slate-900' : 'text-slate-100'
            }`}>
              {t('landing:hero.privacyTitle', 'Право на тайну связи и приватность')}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${
              theme === 'light' ? 'bg-blue-200/60 text-blue-800' : 'bg-[#10E7B2]/20 text-[#10E7B2]'
            }`}>
              {t('landing:hero.privacyArticleBadge', 'Ст. 12 ВДПЧ ООН • Privacy by Design')}
            </span>
          </div>
          <p className={`text-xs leading-relaxed font-medium ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
            {t('landing:hero.privacyDesc', 'Приватность и тайна переписки — это фундаментальное неотъемлемое право каждого человека. Мы не нарушаем законы, а гарантируем соблюдение базовых прав. А если кто-то пытается вмешаться в ваше личное пространство — Gossip надежно защищает вас силой открытых криптографических технологий.')}
          </p>
        </div>
      </div>
    </section>
  );
};
