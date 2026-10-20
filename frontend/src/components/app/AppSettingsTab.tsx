import { useState } from 'react';
import {
  Globe,
  Bell,
  Lock,
  ShieldCheck,
  LogOut,
  Palette,
  Folder,
  Radio,
  Bot,
  Coins,
  Wallet,
  LayoutDashboard,
  Type,
  ChevronRight,
  Copy,
  Check,
  KeyRound,
  Camera,
  Sparkles,
  Moon,
  Sun,
  Coffee,
  Info,
} from 'lucide-react';
import { GlassButton, GlassCard } from '../../ui';
import { normalizeLanguage, LANGUAGES_META, SupportedLanguage } from '../../i18n';
import 'katex/dist/katex.min.css';
import { Avatar } from '../../components/ui/Avatar';
import { SettingsErrorBoundary } from './appHelpers';

export interface AppSubComponentProps {
  ctx: Record<string, any>;
}

function IosToggle({
  checked,
  onChange,
  activeColor = 'purple',
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  activeColor?: 'purple' | 'emerald' | 'sky' | 'amber';
}) {
  const activeBg =
    activeColor === 'emerald'
      ? 'bg-emerald-500 border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
      : activeColor === 'sky'
      ? 'bg-sky-500 border-sky-400/60 shadow-[0_0_12px_rgba(14,165,233,0.35)]'
      : activeColor === 'amber'
      ? 'bg-amber-500 border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
      : 'bg-purple-600 border-purple-400/60 shadow-[0_0_12px_rgba(147,51,234,0.35)]';

  return (
    <label
      onClick={(e) => e.stopPropagation()}
      className="relative inline-flex items-center cursor-pointer shrink-0 select-none"
    >
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <div
        className={`w-12 h-7 rounded-full p-0.5 flex items-center border transition-all duration-200 ${
          checked
            ? activeBg
            : 'bg-slate-700/70 border-white/15 shadow-inner'
        }`}
      >
        <span
          className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </div>
    </label>
  );
}

export function AppSettingsTab({ ctx }: AppSubComponentProps) {
  const {
    avatarInputRef,
    bgServiceEnabled,
    currentAppVersion,
    fetchMyBotsCount,
    folders,
    getNetworkStatusUI,
    handleAvatarChange,
    handleLogout,
    handleToggleBgService,
    handleTogglePinAutoUnlock,
    i18n,
    isAvatarUploading,
    isLargeFont,
    myBotsCount,
    netSnapshot,
    pinAutoUnlock,
    profileAvatarUrl,
    setFolderEditMode,
    setIsAdminModalOpen,
    setIsBotManagementOpen,
    setIsFoldersModalOpen,
    setIsInfoModalOpen,
    setIsLanguageModalOpen,
    setIsLargeFont,
    setIsMyAvatarActionSheetOpen,
    setIsNetworkModalOpen,
    setIsPremiumSecurityModalOpen,
    setIsTonWalletModalOpen,
    setTheme,
    showPulseTab,
    showToast,
    showWalletTab,
    t,
    theme,
    togglePulseTab,
    toggleWalletTab,
    username,
  } = ctx;

  const [copiedKey, setCopiedKey] = useState(false);
  const [showKeyDetails, setShowKeyDetails] = useState(false);

  const displayUsername = username || localStorage.getItem('username') || t('settings:profile.ownerTitle', 'Пользователь Gossip');
  const mlsPublicKey = localStorage.getItem('mls_x25519_pub') || '';
  const dlpFoldersCount = Array.isArray(folders)
    ? folders.filter((f: any) => f.is_152fz_contour === 1 || f.is152FzContour).length
    : 0;
  const totalFoldersCount = Array.isArray(folders) ? folders.length : 0;

  const currentLangCode = normalizeLanguage(i18n.language) as SupportedLanguage;
  const currentLangMeta = LANGUAGES_META[currentLangCode] || LANGUAGES_META.ru;

  const handleCopyPublicKey = () => {
    if (!mlsPublicKey) return;
    navigator.clipboard.writeText(mlsPublicKey).then(() => {
      setCopiedKey(true);
      showToast?.(t('common:actions.copied', 'Ключ безопасности скопирован'), 'success');
      setTimeout(() => setCopiedKey(false), 2500);
    }).catch(() => {});
  };

  const activeUser = (username || localStorage.getItem('username') || localStorage.getItem('gossip_username') || '').trim().toLowerCase();
  const hasAdminAccess =
    activeUser === 'up1t3r' ||
    activeUser === 'up1t3' ||
    activeUser === 'merlin' ||
    Boolean(localStorage.getItem('gossip_admin_token'));

  const netUI = getNetworkStatusUI();

  return (
    <div
      key="settings-tab"
      className="flex-grow p-4 sm:p-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:p-8 max-w-3xl mx-auto overflow-y-auto h-full overscroll-contain animate-fade-in"
    >
      <SettingsErrorBoundary>
        {/* Заголовок экрана */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            {t('settings:title', 'Настройки')}
          </h1>
          <button
            type="button"
            onClick={() => setIsInfoModalOpen?.(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 transition-all active:scale-95 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-purple-400" />
            <span>{t('settings:aboutAppBtn', 'О приложении')}</span>
          </button>
        </div>

        <div className="space-y-5">
          {/* ================================================================= */}
          {/* 1. КАРТОЧКА ПРОФИЛЯ (В СТИЛЕ APPLE ID)                            */}
          {/* ================================================================= */}
          <GlassCard glow className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
              <div
                onClick={() => {
                  if (profileAvatarUrl) {
                    setIsMyAvatarActionSheetOpen(true);
                  } else {
                    avatarInputRef.current?.click();
                  }
                }}
                className="group relative w-20 h-20 rounded-full overflow-hidden cursor-pointer shadow-glass-md border border-white/15 shrink-0"
              >
                <Avatar
                  avatarUrl={profileAvatarUrl}
                  name={displayUsername}
                  size="xl"
                  isLoading={isAvatarUploading}
                  className="w-full h-full"
                />
                <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-200">
                  <Camera className="w-4 h-4 text-white mb-0.5" />
                  <span className="text-[9px] text-white font-bold uppercase tracking-wider">
                    {t('settings:profile.editAvatar', 'Изменить')}
                  </span>
                </div>
              </div>
              <input
                type="file"
                ref={avatarInputRef}
                onChange={handleAvatarChange}
                accept="image/*,image/heic,image/heif"
                className="hidden"
              />

              <div className="flex-1 min-w-0 text-center sm:text-left space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-100 truncate">
                    {displayUsername}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    {t('settings:profile.e2eeProtected', 'E2EE Защищён')}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {t('settings:profile.subtitle', 'Личный профиль • Ключи шифрования хранятся только на этом устройстве')}
                </p>

                {/* Компактные кнопки управления профилем */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (profileAvatarUrl) {
                        setIsMyAvatarActionSheetOpen(true);
                      } else {
                        avatarInputRef.current?.click();
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-purple-400" />
                    <span>{t('settings:profile.changeAvatar', 'Фото профиля')}</span>
                  </button>

                  {mlsPublicKey && (
                    <button
                      type="button"
                      onClick={() => setShowKeyDetails((v) => !v)}
                      className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-xs font-medium text-purple-300 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                      <span>
                        {showKeyDetails
                          ? t('settings:profile.hideKey', 'Скрыть ключ')
                          : t('settings:profile.showKey', 'Мой ключ безопасности')}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Раскрывающийся блок с публичным ключом (не пугает новичка по умолчанию) */}
            {showKeyDetails && mlsPublicKey && (
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2 bg-black/25 p-3 rounded-2xl border border-white/5 animate-fade-in">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-0.5">
                    {t('settings:profile.mlsPublicKey', 'Публичный отпечаток ключа (X25519):')}
                  </p>
                  <p dir="ltr" className="text-xs font-mono text-slate-300 truncate select-all">
                    {mlsPublicKey}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPublicKey}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-xs font-bold text-purple-200 flex items-center gap-1.5 shrink-0 cursor-pointer transition-all active:scale-95"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>
                    {copiedKey
                      ? t('common:actions.copied', 'Скопировано')
                      : t('common:actions.copy', 'Копировать')}
                  </span>
                </button>
              </div>
            )}
          </GlassCard>

          {/* ================================================================= */}
          {/* 2. ГРУППА «ЗАЩИТА И СВЯЗЬ»                                        */}
          {/* ================================================================= */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2">
              {t('settings:groups.securityAndNet', 'Защита и Связь')}
            </h3>
            <GlassCard className="divide-y divide-white/5 overflow-hidden p-0">
              {/* Сетевой центр и Офлайн-рация */}
              <div
                onClick={() => setIsNetworkModalOpen(true)}
                className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
                    <Radio className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-100">
                      {t('settings:system.networkShield', 'Связь, обход блокировок и Рация')}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {t('settings:system.networkShieldDesc', 'Автоматическая защита при VPN, ТСПУ и работа без интернета (BLE Mesh)')}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsNetworkModalOpen(true);
                  }}
                  className="text-xs text-purple-200 bg-purple-500/15 hover:bg-purple-500/25 px-3 py-1.5 rounded-xl border border-purple-500/30 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer font-semibold"
                >
                  <span className={`w-2 h-2 rounded-full ${netUI.colorClass}`} />
                  <span>{netUI.text}</span>
                  <span className="text-[10px] text-purple-300/80 uppercase hidden sm:inline">
                    ({netSnapshot.currentProtocol})
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              {/* Спец-арсенал PRO */}
              <div
                onClick={() => setIsPremiumSecurityModalOpen(true)}
                className="p-4 flex items-center justify-between gap-3 bg-gradient-to-r from-rose-500/[0.06] via-purple-500/[0.06] to-amber-500/[0.06] hover:from-rose-500/[0.12] hover:to-amber-500/[0.12] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-amber-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-100">
                        {t('settings:system.proSecurityTitle', 'Особая защита (Спец-арсенал PRO)')}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        PRO
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {t('settings:system.proSecurityDesc', 'Двойное дно (Ложный PIN), изменение голоса, автосброс, одноразовые чаты')}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPremiumSecurityModalOpen(true);
                  }}
                  data-testid="open-premium-security-btn"
                  className="text-xs text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1.5 rounded-xl border border-amber-400/40 transition-all active:scale-95 font-bold cursor-pointer shrink-0 flex items-center gap-1"
                >
                  <span>{t('common:actions.open', 'Открыть')}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Быстрый вход без PIN */}
              <div
                onClick={() => handleTogglePinAutoUnlock(!pinAutoUnlock)}
                className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-100">
                      {t('settings:system.pinAutoUnlock', 'Вход без ввода PIN-кода')}
                    </div>
                    <div className="text-xs text-slate-400">
                      {t('settings:system.pinAutoUnlockDesc', 'Автоматически разблокировать приложение при открытии на этом телефоне')}
                    </div>
                  </div>
                </div>
                <IosToggle
                  checked={Boolean(pinAutoUnlock)}
                  onChange={(val) => handleTogglePinAutoUnlock(val)}
                  activeColor="purple"
                />
              </div>

              {/* Уведомления и работа в фоне */}
              <div
                onClick={() => handleToggleBgService(!bgServiceEnabled)}
                className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-100">
                      {t('settings:system.backgroundConnection', 'Мгновенная связь в фоне (24/7)')}
                    </div>
                    <div className="text-xs text-slate-400">
                      {t('settings:system.backgroundConnectionDesc', 'Принимать звонки и сообщения мгновенно даже при выключенном экране')}
                    </div>
                  </div>
                </div>
                <IosToggle
                  checked={Boolean(bgServiceEnabled)}
                  onChange={(val) => handleToggleBgService(val)}
                  activeColor="emerald"
                />
              </div>
            </GlassCard>
          </div>

          {/* ================================================================= */}
          {/* 3. ГРУППА «ВНЕШНИЙ ВИД И УДОБСТВО»                                */}
          {/* ================================================================= */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2">
              {t('settings:groups.appearance', 'Внешний вид и Удобство')}
            </h3>
            <GlassCard className="divide-y divide-white/5 overflow-hidden p-0">
              {/* Тема оформления — тактильный переключатель в 1 касание + скрытый select для совместимости */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
                    <Palette className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-100">
                      {t('settings:system.theme', 'Тема оформления')}
                    </div>
                    <div className="text-xs text-slate-400">
                      {t('settings:system.themeDesc', 'Выберите комфортную цветовую палитру интерфейса')}
                    </div>
                  </div>
                </div>

                {/* Наглядные кнопки выбора темы */}
                <div className="grid grid-cols-3 gap-1.5 bg-black/25 p-1 rounded-xl border border-white/10 shrink-0">
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>{t('settings:system.themeDarkShort', 'Тёмная')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      theme === 'light'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>{t('settings:system.themeLightShort', 'Светлая')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('coffee')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      theme === 'coffee'
                        ? 'bg-amber-700 text-amber-100 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Coffee className="w-3.5 h-3.5" />
                    <span>{t('settings:system.themeCoffeeShort', 'Кофе')}</span>
                  </button>
                </div>
              </div>

              {/* Язык интерфейса */}
              <div
                onClick={() => setIsLanguageModalOpen(true)}
                className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-100">
                      {t('settings:system.language', 'Язык интерфейса')}
                    </div>
                    <div className="text-xs text-slate-400">
                      {t('settings:system.languageDesc', 'Язык меню, подсказок и форматирования дат')}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLanguageModalOpen(true);
                  }}
                  className="text-xs text-purple-200 bg-purple-500/15 hover:bg-purple-500/25 px-3 py-1.5 rounded-xl border border-purple-500/30 transition-all active:scale-95 font-semibold flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <span>{currentLangMeta.nativeName}</span>
                  <span className="font-mono uppercase font-bold text-[10px] px-1.5 py-0.5 rounded bg-white/10">
                    {currentLangCode.toUpperCase()}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              {/* Крупный шрифт */}
              <div
                onClick={() => setIsLargeFont(!isLargeFont)}
                className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center shrink-0">
                    <Type className="w-4 h-4 text-teal-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-100">
                      {t('settings:system.largeFont', 'Увеличенный размер текста')}
                    </div>
                    <div className="text-xs text-slate-400">
                      {t('settings:system.largeFontDesc', 'Более крупные сообщения и заголовки для комфортного чтения')}
                    </div>
                  </div>
                </div>
                <IosToggle
                  checked={Boolean(isLargeFont)}
                  onChange={(val) => setIsLargeFont(val)}
                  activeColor="purple"
                />
              </div>
            </GlassCard>
          </div>

          {/* ================================================================= */}
          {/* 4. ГРУППА «ЧАТЫ, ПАПКИ И СЕЙФ-КОНТУР»                             */}
          {/* ================================================================= */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2">
              {t('settings:groups.chatsAndNav', 'Чаты и Навигация')}
            </h3>
            <GlassCard className="divide-y divide-white/5 overflow-hidden p-0">
              {/* Объединённый пункт: Папки чатов и Сейф-контур (DLP) */}
              <div
                onClick={() => {
                  setFolderEditMode('list');
                  setIsFoldersModalOpen(true);
                }}
                className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <Folder className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-100">
                        {t('settings:system.chatFolders', 'Папки чатов и Сейф-Контур')}
                      </span>
                      {dlpFoldersCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          🔒 {t('settings:system.safeCountBadge', { count: dlpFoldersCount, defaultValue: `${dlpFoldersCount} Сейф` })}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {t('settings:system.chatFoldersDesc', 'Группировка диалогов по вкладкам и защита рабочих папок от пересылки наружу')}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFolderEditMode('list');
                    setIsFoldersModalOpen(true);
                  }}
                  className="text-xs text-purple-200 bg-purple-500/15 hover:bg-purple-500/25 px-3 py-1.5 rounded-xl border border-purple-500/30 transition-all active:scale-95 font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span>{t('settings:system.foldersCount', { count: totalFoldersCount, defaultValue: `Настроить (${totalFoldersCount})` })}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              {/* Отображение вкладки Pulse */}
              <div
                onClick={() => togglePulseTab(!showPulseTab)}
                className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Coins className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-100">
                      {t('settings:system.showPulseTab', 'Раздел «Пульс» в нижнем меню')}
                    </div>
                    <div className="text-xs text-slate-400">
                      {t('settings:system.showPulseTabDesc', 'Безопасные P2P-сделки, объявления и смарт-эскроу')}
                    </div>
                  </div>
                </div>
                <IosToggle
                  checked={Boolean(showPulseTab)}
                  onChange={(val) => togglePulseTab(val)}
                  activeColor="emerald"
                />
              </div>

              {/* Отображение вкладки Кошелек */}
              <div
                onClick={() => toggleWalletTab(!showWalletTab)}
                className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
                    <LayoutDashboard className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-100">
                      {t('settings:system.showWalletTab', 'Раздел «Кошелёк» в нижнем меню')}
                    </div>
                    <div className="text-xs text-slate-400">
                      {t('settings:system.showWalletTabDesc', 'Быстрый доступ к балансу TON / USDT и переводам')}
                    </div>
                  </div>
                </div>
                <IosToggle
                  checked={Boolean(showWalletTab)}
                  onChange={(val) => toggleWalletTab(val)}
                  activeColor="sky"
                />
              </div>
            </GlassCard>
          </div>

          {/* ================================================================= */}
          {/* 5. ГРУППА «ФИНАНСЫ И ИНСТРУМЕНТЫ»                                 */}
          {/* ================================================================= */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2">
              {t('settings:groups.financeAndTools', 'Финансы и Инструменты')}
            </h3>
            <GlassCard className="divide-y divide-white/5 overflow-hidden p-0">
              {/* Криптокошелек TON */}
              <div
                onClick={() => setIsTonWalletModalOpen(true)}
                className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <Wallet className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-100">
                      {t('settings:system.tonWallet', 'Криптокошелёк TON')}
                    </div>
                    <div className="text-xs text-slate-400">
                      {t('settings:system.tonDesc', 'Подключение Tonkeeper, баланс и мгновенные переводы в чатах')}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsTonWalletModalOpen(true);
                  }}
                  className="text-xs text-blue-200 bg-blue-500/15 hover:bg-blue-500/25 px-3 py-1.5 rounded-xl border border-blue-500/30 transition-all active:scale-95 font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <span>{t('common:actions.open', 'Открыть')}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              {/* Боты и Интеграции */}
              <div
                onClick={() => {
                  fetchMyBotsCount();
                  setIsBotManagementOpen(true);
                }}
                className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-100">
                      {t('settings:system.botsAndIntegrations', 'Боты и Мини-приложения')}
                    </div>
                    <div className="text-xs text-slate-400">
                      {t('settings:system.botsDesc', 'Создание собственных ботов, токены и автоматизация')}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchMyBotsCount();
                    setIsBotManagementOpen(true);
                  }}
                  className="text-xs text-purple-200 bg-purple-500/15 hover:bg-purple-500/25 px-3 py-1.5 rounded-xl border border-purple-500/30 transition-all active:scale-95 font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <span>{t('settings:system.botsButtonCount', { count: myBotsCount, defaultValue: `Боты (${myBotsCount})` })}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              {/* Консоль администратора (только для владельца) */}
              {hasAdminAccess && (
                <div
                  onClick={() => setIsAdminModalOpen(true)}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-100">
                        {t('settings:system.adminConsole', 'Консоль управления кластером')}
                      </div>
                      <div className="text-xs text-slate-400">
                        {t('settings:system.adminConsoleDesc', 'Системный мониторинг узлов, рассылка оповещений и управление')}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAdminModalOpen(true);
                    }}
                    className="text-xs text-emerald-200 bg-emerald-500/15 hover:bg-emerald-500/25 px-3 py-1.5 rounded-xl border border-emerald-500/30 transition-all active:scale-95 font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <span>{t('settings:system.adminConsoleShort', 'Консоль')}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              )}
            </GlassCard>
          </div>

          {/* ================================================================= */}
          {/* 6. ВЫХОД ИЗ СЕССИИ И ВЕРСИЯ                                       */}
          {/* ================================================================= */}
          <div className="pt-2">
            <GlassButton
              variant="secondary"
              className="w-full py-3 flex items-center justify-center gap-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-red-500/20 rounded-2xl transition-all font-semibold"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              {t('settings:system.logout', 'Выйти из аккаунта')}
            </GlassButton>
          </div>
        </div>

        <p
          className="text-center text-xs text-slate-500 mt-6 pb-4 select-none cursor-pointer"
          onClick={(e) => {
            const el = e.currentTarget as any;
            const now = Date.now();
            if (!el._lastTap || now - el._lastTap > 1500) {
              el._tapCount = 1;
            } else {
              el._tapCount = (el._tapCount || 0) + 1;
            }
            el._lastTap = now;
            if (el._tapCount >= 5) {
              el._tapCount = 0;
              setIsAdminModalOpen(true);
            }
          }}
        >
          Gossip v{currentAppVersion} • Zero-Knowledge E2EE
        </p>
      </SettingsErrorBoundary>
    </div>
  );
}
