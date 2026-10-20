import { motion } from 'framer-motion';
import { Globe, Smartphone, Laptop, Lock, Check, ShieldCheck, Fingerprint, RefreshCw, Download, ArrowLeft, Chrome, Share2, Copy, FileText, Sparkles, ArrowRight, Key, AlertTriangle } from 'lucide-react';
import { GlassButton, GlassInput, GlassCard, GlassModal } from '../../ui';
import { LandingPage } from '../../components/LandingPage';
import { normalizeLanguage } from '../../i18n';
import 'katex/dist/katex.min.css';
import { isAndroidApp } from './appHelpers';

export interface AppSubComponentProps { ctx: Record<string, any>; }

export function AppAuthFlow({ ctx }: AppSubComponentProps) {
  const {
    authMode,
    authState,
    authStatus,
    authStep,
    currentAppVersion,
    customServerUrl,
    errorMsg,
    generatedMnemonic,
    handleAuth,
    handleConfirmMnemonicAndRegister,
    handleLandingEnterpriseDemo,
    handleLandingInstall,
    handleLandingLogin,
    handleRecoverySubmit,
    i18n,
    isAuthLoading,
    isRecoverySubmitting,
    mnemonicConfirmed,
    mnemonicCopied,
    newPasswordConfirmInput,
    newPasswordInput,
    password,
    pendingRegisterPayload,
    recoveryError,
    recoveryPhraseInput,
    setAuthMode,
    setAuthState,
    setCustomServerUrl,
    setErrorMsg,
    setIsLanguageModalOpen,
    setMnemonicConfirmed,
    setMnemonicCopied,
    setNewPasswordConfirmInput,
    setNewPasswordInput,
    setPassword,
    setRecoveryError,
    setRecoveryPhraseInput,
    setShowAdvancedServer,
    setShowMnemonicModal,
    setUsername,
    showAdvancedServer,
    showMnemonicModal,
    showToast,
    t,
    theme,
    username
  } = ctx;
  return (
          authState === 'welcome' ? (
            <motion.div
              key="welcome-pane"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full z-20 relative"
            >
              <LandingPage
                onLoginClick={handleLandingLogin}
                onInstallClick={handleLandingInstall}
                onEnterpriseDemoClick={handleLandingEnterpriseDemo}
                theme={theme}
              />
            </motion.div>
          ) : authState === 'install' ? (
            <motion.div
              key="install-pane"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="w-full h-full overflow-y-auto z-20 relative flex flex-col items-center p-4 sm:p-6 md:p-8 overscroll-contain"
            >
              <GlassCard
                glow
                glowColor={theme === 'light' ? 'rgba(37,99,235,0.15)' : (theme === 'coffee' ? 'rgba(213,206,163,0.15)' : 'rgba(16,185,129,0.15)')}
                className={`w-full max-w-xl p-6 sm:p-8 flex flex-col gap-6 backdrop-blur-2xl relative my-auto shrink-0 rounded-3xl border shadow-2xl transition-colors duration-200 ${
                  theme === 'light'
                    ? 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-200/50'
                    : (theme === 'coffee'
                        ? 'bg-[#1A120B]/95 border-[#D5CEA3]/20 text-[#E5E5CB] shadow-black/60'
                        : 'bg-[#0D0E15]/95 border-white/10 text-slate-100 shadow-black/80')
                }`}
              >
                {/* Верхняя декоративная полоса */}
                <div className={`absolute top-0 left-0 w-full h-[3px] rounded-t-3xl ${
                  theme === 'light'
                    ? 'bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-500'
                    : (theme === 'coffee'
                        ? 'bg-gradient-to-r from-[#D5CEA3] via-[#E5E0C2] to-[#8C6239]'
                        : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500')
                }`} />
                
                <div className={`flex items-center justify-between border-b pb-4 ${
                  theme === 'light' ? 'border-slate-200' : 'border-white/10'
                }`}>
                  <button
                    type="button"
                    onClick={() => setAuthState('welcome')}
                    className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border transition-all active:scale-95 ${
                      theme === 'light'
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                        : (theme === 'coffee'
                            ? 'bg-[#D5CEA3]/10 hover:bg-[#D5CEA3]/20 text-[#D5CEA3] border-[#D5CEA3]/20'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10')
                    }`}
                  >
                    <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                    {t('auth:pin.exitToLanding', 'Назад на главную')}
                  </button>
                  <div className="text-right">
                    <h2 className={`text-lg font-bold tracking-tight ${
                      theme === 'light'
                        ? 'text-slate-900'
                        : (theme === 'coffee' ? 'text-[#E5E5CB]' : 'text-slate-100')
                    }`}>
                      {t('auth:install.title', 'Установка Gossip')}
                    </h2>
                    <p className={`text-[11px] ${
                      theme === 'light' ? 'text-slate-500' : (theme === 'coffee' ? 'text-[#9C927A]' : 'text-slate-400')
                    }`}>
                      {t('auth:install.subtitle', 'Прямая загрузка и PWA-клиенты')}
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Вариант 1: Нативный APK */}
                  <div className={`p-5 rounded-2xl border flex flex-col gap-3.5 relative overflow-hidden transition-all ${
                    theme === 'light'
                      ? 'bg-blue-50/60 border-blue-200 shadow-sm'
                      : (theme === 'coffee'
                          ? 'bg-[#D5CEA3]/[0.05] border-[#D5CEA3]/25'
                          : 'bg-emerald-950/20 border-emerald-500/30')
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full ${
                          theme === 'light'
                            ? 'bg-blue-100 text-blue-700'
                            : (theme === 'coffee'
                                ? 'bg-[#D5CEA3]/20 text-[#D5CEA3]'
                                : 'bg-emerald-500/20 text-emerald-300')
                        }`}>
                          <Sparkles className="w-3 h-3" />
                          {t('auth:install.apkBadge', 'Рекомендуется для Android')}
                        </span>
                        <h3 className={`text-base font-bold mt-1.5 ${
                          theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                        }`}>
                          {t('auth:install.apkTitle', 'Нативное Android-приложение (APK)')}
                        </h3>
                        <p className={`text-xs mt-1 leading-relaxed ${
                          theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                        }`}>
                          {t('auth:install.apkDesc', 'Максимальная производительность, стабильные фоновые VoIP-звонки, Push-уведомления и аппаратное хранилище E2EE ключей.')}
                        </p>
                      </div>
                      <Smartphone className={`w-8 h-8 shrink-0 ${
                        theme === 'light' ? 'text-blue-600' : (theme === 'coffee' ? 'text-[#D5CEA3]' : 'text-emerald-400')
                      }`} />
                    </div>

                    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium pt-1 border-t ${
                      theme === 'light' ? 'border-blue-200/60 text-slate-500' : 'border-white/5 text-slate-400'
                    }`}>
                      <span>v<strong className="text-current font-bold">{currentAppVersion}</strong></span>
                      <span>•</span>
                      <span><strong className="text-current font-bold">~48 MB</strong></span>
                      <span>•</span>
                      <span><strong className="text-current font-bold">SHA-256: EC:3E:02:AF...</strong></span>
                      <span>•</span>
                      <span className="text-emerald-500 font-semibold">{t('auth:install.directLink', 'Прямая ссылка')}</span>
                    </div>

                    <a
                      href="/gossip.apk"
                      download="gossip.apk"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer ${
                        theme === 'light'
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                          : (theme === 'coffee'
                              ? 'bg-[#D5CEA3] hover:bg-[#E5E0C2] text-[#1A120B] shadow-black/40'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50')
                      }`}
                    >
                      <Download className="w-4 h-4 animate-bounce" />
                      {t('auth:install.apkDownloadBtn', 'Скачать Android APK (~48 МБ)')}
                    </a>
                  </div>

                  {/* Вариант 2: Для настольного ПК (PWA и Web) */}
                  <div className={`p-5 rounded-2xl border flex flex-col gap-3.5 relative overflow-hidden transition-all ${
                    theme === 'light'
                      ? 'bg-slate-50 border-slate-200 shadow-sm'
                      : (theme === 'coffee'
                          ? 'bg-[#150E09]/60 border-[#D5CEA3]/15'
                          : 'bg-white/[0.02] border-white/10')
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full ${
                          theme === 'light'
                            ? 'bg-slate-200 text-slate-700'
                            : (theme === 'coffee'
                                ? 'bg-[#D5CEA3]/10 text-[#D5CEA3]'
                                : 'bg-white/10 text-slate-300')
                        }`}>
                          <Laptop className="w-3 h-3" />
                          {t('auth:install.desktopBadge', 'Для настольного ПК (Windows / macOS / Linux)')}
                        </span>
                        <h3 className={`text-base font-bold mt-1.5 ${
                          theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                        }`}>
                          {t('auth:install.desktopTitle', 'Web App / PWA для ПК')}
                        </h3>
                        <p className={`text-xs mt-1 leading-relaxed ${
                          theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                        }`}>
                          {t('auth:install.desktopDesc', 'Мгновенный запуск в отдельном окне браузера с аппаратным ускорением GPU, локальным SQLite шифрованием и системными уведомлениями.')}
                        </p>
                      </div>
                      <Laptop className={`w-8 h-8 shrink-0 ${
                        theme === 'light' ? 'text-slate-600' : (theme === 'coffee' ? 'text-[#9C927A]' : 'text-slate-400')
                      }`} />
                    </div>

                    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium pt-1 border-t ${
                      theme === 'light' ? 'border-slate-200 text-slate-500' : 'border-white/5 text-slate-400'
                    }`}>
                      <span>v<strong className="text-current font-bold">{currentAppVersion}</strong></span>
                      <span>•</span>
                      <span>{t('auth:install.instantStart', 'Мгновенный старт без загрузки')}</span>
                      <span>•</span>
                      <span>OPFS SQLite</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAuthState('auth')}
                      className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all active:scale-[0.98] cursor-pointer ${
                        theme === 'light'
                          ? 'bg-white hover:bg-slate-100 text-slate-900 border-slate-300 shadow-sm'
                          : (theme === 'coffee'
                              ? 'bg-[#D5CEA3]/10 hover:bg-[#D5CEA3]/20 text-[#D5CEA3] border-[#D5CEA3]/30'
                              : 'bg-white/5 hover:bg-white/10 text-slate-100 border-white/10')
                      }`}
                    >
                      <ArrowRight className="w-4 h-4" />
                      {t('auth:install.desktopLaunchBtn', 'Запустить Web-клиент для ПК')}
                    </button>
                  </div>

                  {/* Вариант 3: PWA для мобильных */}
                  <div className="space-y-3 pt-1">
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${
                      theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      {t('auth:install.pwaTitle', 'Установка как PWA (iOS и Android)')}
                    </h3>
                    <p className={`text-xs leading-relaxed ${
                      theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      {t('auth:install.pwaDesc', 'Работает автономно без сторонних магазинов приложений. Добавьте ярлык Gossip на домашний экран вашего смартфона:')}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {/* iOS Safari */}
                      <div className={`p-4 rounded-xl border flex flex-col gap-2.5 ${
                        theme === 'light'
                          ? 'bg-slate-50 border-slate-200'
                          : (theme === 'coffee'
                              ? 'bg-[#150E09]/60 border-[#D5CEA3]/15'
                              : 'bg-white/[0.02] border-white/10')
                      }`}>
                        <div className="flex items-center gap-2">
                          <Share2 className={`w-4 h-4 ${theme === 'light' ? 'text-blue-600' : 'text-pink-400'}`} />
                          <span className={`text-xs font-bold ${
                            theme === 'light' ? 'text-slate-900' : 'text-slate-200'
                          }`}>iOS (Safari)</span>
                        </div>
                        <ul className={`text-[11px] space-y-1.5 list-decimal list-inside ${
                          theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                        }`}>
                          <li>{t('auth:install.iosStep1', 'Откройте skuf-net.ru в браузере Safari')}</li>
                          <li>{t('auth:install.iosStep2', 'Нажмите кнопку «Поделиться»')}</li>
                          <li>{t('auth:install.iosStep3', 'Выберите пункт «На экран Домой»')}</li>
                          <li>{t('auth:install.iosStep4', 'Нажмите «Добавить»')}</li>
                        </ul>
                      </div>

                      {/* Android Chrome */}
                      <div className={`p-4 rounded-xl border flex flex-col gap-2.5 ${
                        theme === 'light'
                          ? 'bg-slate-50 border-slate-200'
                          : (theme === 'coffee'
                              ? 'bg-[#150E09]/60 border-[#D5CEA3]/15'
                              : 'bg-white/[0.02] border-white/10')
                      }`}>
                        <div className="flex items-center gap-2">
                          <Chrome className={`w-4 h-4 ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`} />
                          <span className={`text-xs font-bold ${
                            theme === 'light' ? 'text-slate-900' : 'text-slate-200'
                          }`}>Android (Chrome)</span>
                        </div>
                        <ul className={`text-[11px] space-y-1.5 list-decimal list-inside ${
                          theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                        }`}>
                          <li>{t('auth:install.androidStep1', 'Откройте skuf-net.ru в браузере Chrome')}</li>
                          <li>{t('auth:install.androidStep2', 'Нажмите меню «⋮» (три точки в углу)')}</li>
                          <li>{t('auth:install.androidStep3', 'Выберите пункт «Установить приложение»')}</li>
                          <li>{t('auth:install.androidStep4', 'Подтвердите добавление на главный экран')}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`text-center pt-3 border-t text-[10px] ${
                  theme === 'light' ? 'border-slate-200 text-slate-500' : 'border-white/5 text-slate-500'
                }`}>
                  Gossip Core • E2EE Double Ratchet + X3DH • Zero-Knowledge
                </div>
              </GlassCard>
            </motion.div>
          ) : (
            <motion.div
              key="auth-pane"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="w-full h-full overflow-y-auto z-20 relative flex flex-col items-center p-4 sm:p-6 md:p-8 overscroll-contain"
            >
              <GlassCard
                glow
                className={`w-full max-w-md p-6 sm:p-8 flex flex-col gap-6 backdrop-blur-2xl relative my-auto shrink-0 rounded-3xl border shadow-2xl transition-colors duration-200 ${
                  theme === 'light'
                    ? 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-200/50'
                    : (theme === 'coffee'
                        ? 'bg-[#1A120B]/95 border-[#D5CEA3]/20 text-[#E5E5CB] shadow-black/60'
                        : 'bg-[#0D0E15]/95 border-white/10 text-slate-100 shadow-black/80')
                }`}
              >
                {/* Верхняя декоративная полоса */}
                <div className={`absolute top-0 left-0 w-full h-[3px] rounded-t-3xl ${
                  theme === 'light'
                    ? 'bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-500'
                    : (theme === 'coffee'
                        ? 'bg-gradient-to-r from-[#D5CEA3] via-[#E5E0C2] to-[#8C6239]'
                        : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500')
                }`} />
              
              <div className={`flex items-center justify-between border-b pb-4 ${
                theme === 'light' ? 'border-slate-200' : 'border-white/10'
              }`}>
                <div className="flex items-center gap-2">
                  {!isAndroidApp && (
                    <button
                      type="button"
                      onClick={() => { setAuthState('welcome'); setErrorMsg(''); }}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-all active:scale-95 ${
                        theme === 'light'
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                          : (theme === 'coffee'
                              ? 'bg-[#D5CEA3]/10 hover:bg-[#D5CEA3]/20 text-[#D5CEA3] border-[#D5CEA3]/20'
                              : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10')
                      }`}
                    >
                      <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                      {t('common:actions.back', 'Назад')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsLanguageModalOpen(true)}
                    className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-xl border transition-all active:scale-95 cursor-pointer ${
                      theme === 'light'
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                        : (theme === 'coffee'
                            ? 'bg-[#D5CEA3]/10 hover:bg-[#D5CEA3]/20 text-[#D5CEA3] border-[#D5CEA3]/20'
                            : 'bg-white/5 hover:bg-white/10 text-purple-300 border-white/10')
                    }`}
                    title={t('settings:system.language', 'Выбор языка')}
                  >
                    <Globe className="w-3.5 h-3.5 opacity-80" />
                    <span className="font-mono uppercase font-bold text-[11px]">{normalizeLanguage(i18n.language).toUpperCase()}</span>
                  </button>
                </div>
                <div className="text-right">
                  <h2 className={`text-lg font-bold tracking-tight ${
                    theme === 'light' ? 'text-slate-900' : (theme === 'coffee' ? 'text-[#E5E5CB]' : 'text-slate-100')
                  }`}>
                    {authMode === 'login' ? t('auth:login.title', 'Вход в Gossip') : (authMode === 'register' ? t('auth:register.title', 'Регистрация аккаунта') : t('auth:recovery.title', 'Восстановление доступа'))}
                  </h2>
                  <p className={`text-[10px] ${
                    theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    {authMode === 'login' ? t('auth:steps.srpHuman', 'Безопасный вход без передачи пароля') : (authMode === 'register' ? t('auth:register.subtitleHuman', 'Приватный профиль со сквозным шифрованием') : t('auth:mnemonic.modalTitle', 'Секретная фраза восстановления (12 слов)'))}
                  </p>
                </div>
              </div>

              {/* Переключатель режимов */}
              <div className={`flex p-1 rounded-xl border ${
                theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'
              }`}>
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setErrorMsg(''); setRecoveryError(''); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    authMode === 'login'
                      ? (theme === 'light'
                          ? 'bg-white text-blue-700 shadow-sm border border-slate-200 font-bold'
                          : (theme === 'coffee'
                              ? 'bg-[#D5CEA3]/20 text-[#D5CEA3] border border-[#D5CEA3]/30 shadow-glass-sm'
                              : 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/30 shadow-glass-sm'))
                      : (theme === 'light' ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200')
                  }`}
                >
                  {t('auth:login.link', 'Вход')}
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setErrorMsg(''); setRecoveryError(''); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    authMode === 'register'
                      ? (theme === 'light'
                          ? 'bg-white text-blue-700 shadow-sm border border-slate-200 font-bold'
                          : (theme === 'coffee'
                              ? 'bg-[#D5CEA3]/20 text-[#D5CEA3] border border-[#D5CEA3]/30 shadow-glass-sm'
                              : 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/30 shadow-glass-sm'))
                      : (theme === 'light' ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200')
                  }`}
                >
                  {t('auth:register.link', 'Регистрация')}
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('recovery'); setErrorMsg(''); setRecoveryError(''); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    authMode === 'recovery'
                      ? (theme === 'light'
                          ? 'bg-white text-blue-700 shadow-sm border border-slate-200 font-bold'
                          : (theme === 'coffee'
                              ? 'bg-[#D5CEA3]/20 text-[#D5CEA3] border border-[#D5CEA3]/30 shadow-glass-sm'
                              : 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/30 shadow-glass-sm'))
                      : (theme === 'light' ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200')
                  }`}
                >
                  {t('auth:recovery.link', '12 слов')}
                </button>
              </div>

              {errorMsg && (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/20 text-red-400 text-xs text-center">
                    {errorMsg}
                  </div>
                  {customServerUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem("gossip_custom_backend_url");
                        setCustomServerUrl("");
                        setErrorMsg("");
                        showToast(t('auth:server.resetUrl', 'Адрес сервера сброшен на стандартный'), "success");
                      }}
                      className="w-full text-center text-[11px] text-purple-300 hover:text-purple-200 bg-purple-500/10 py-1.5 px-3 rounded-lg border border-purple-500/20 hover:bg-purple-500/20 transition-all"
                    >
                      {t('auth:server.resetUrl', 'Сбросить адрес сервера на стандартный')}
                    </button>
                  )}
                </div>
              )}

              {isAuthLoading ? (
                // Анимация шагов загрузки
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-center gap-3">
                    <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
                    <span className="text-sm font-medium text-slate-300">{authStatus}</span>
                  </div>
                  
                  {/* Прогресс-бар шагов */}
                  <div className="w-full bg-white/5 h-[4px] rounded-full overflow-hidden">
                    <motion.div
                      className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full"
                      initial={{ width: "0%" }}
                      animate={{ width: `${(authStep / 5) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  
                  {/* Детализированные шаги */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-2">
                        {authStep >= 1 ? <ShieldCheck className="w-3.5 h-3.5 text-green-400" /> : <div className="w-3.5 h-3.5 rounded-full border border-white/10" />}
                        {t('auth:steps.mtproto', 'Защищённый канал связи')}
                      </span>
                      <span className={authStep >= 1 ? "text-green-400 font-semibold" : "text-slate-500"}>
                        {authStep >= 1 ? "OK" : "..."}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-2">
                        {authStep >= 2 ? <ShieldCheck className="w-3.5 h-3.5 text-green-400" /> : <div className="w-3.5 h-3.5 rounded-full border border-white/10" />}
                        {t('auth:steps.pow', 'Проверка безопасности устройства')}
                      </span>
                      <span className={authStep >= 2 ? "text-green-400 font-semibold" : "text-slate-500"}>
                        {authStep >= 2 ? "OK" : "..."}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-2">
                        {authStep >= 3 ? <ShieldCheck className="w-3.5 h-3.5 text-green-400" /> : <div className="w-3.5 h-3.5 rounded-full border border-white/10" />}
                        {t('auth:steps.srp', 'Проверка пароля без отправки на сервер')}
                      </span>
                      <span className={authStep >= 3 ? "text-green-400 font-semibold" : "text-slate-500"}>
                        {authStep >= 3 ? "OK" : "..."}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-2">
                        {authStep >= 4 ? <ShieldCheck className="w-3.5 h-3.5 text-green-400" /> : <div className="w-3.5 h-3.5 rounded-full border border-white/10" />}
                        {t('auth:steps.sqlcipher', 'Открытие зашифрованного хранилища чатов')}
                      </span>
                      <span className={authStep >= 4 ? "text-green-400 font-semibold" : "text-slate-500"}>
                        {authStep >= 4 ? "OK" : "..."}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-2">
                        {authStep >= 5 ? <ShieldCheck className="w-3.5 h-3.5 text-green-400" /> : <div className="w-3.5 h-3.5 rounded-full border border-white/10" />}
                        {t('auth:steps.sync', 'Синхронизация сообщений')}
                      </span>
                      <span className={authStep >= 5 ? "text-green-400 font-semibold" : "text-slate-500"}>
                        {authStep >= 5 ? "OK" : "..."}
                      </span>
                    </div>
                  </div>
                </div>
              ) : authMode === 'recovery' ? (
                /* Форма восстановления пароля по 12 словам */
                <form onSubmit={handleRecoverySubmit} className="space-y-4">
                  {recoveryError && (
                    <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/20 text-red-400 text-xs text-center">
                      {recoveryError}
                    </div>
                  )}

                  <GlassInput
                    placeholder={t('auth:login.usernamePlaceholder', 'Имя пользователя')}
                    label={t('auth:login.usernamePlaceholder', 'Имя пользователя')}
                    value={username}
                    onChange={(e: any) => setUsername(e.target.value)}
                    icon={<Fingerprint className="w-4 h-4 text-purple-400" />}
                  />

                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${
                      theme === 'light' ? 'text-slate-700' : 'text-slate-300'
                    }`}>
                      {t('auth:mnemonic.modalTitle', 'Секретная Seed-фраза (12 слов)')}
                    </label>
                    <textarea
                      rows={3}
                      value={recoveryPhraseInput}
                      onChange={(e: any) => setRecoveryPhraseInput(e.target.value)}
                      placeholder="orbit quantum cipher falcon matrix velvet beacon puzzle dynamic timber crystal shield"
                      className={`w-full p-3 rounded-xl text-xs font-mono border transition-all resize-none outline-none focus:ring-2 ${
                        theme === 'light'
                          ? 'bg-slate-50 border-slate-300 text-slate-900 focus:ring-blue-500/30'
                          : 'bg-black/40 border-white/10 text-slate-100 focus:ring-purple-500/30'
                      }`}
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {t('auth:recovery.desc', '12 мнемонических слов через пробел')}
                    </span>
                  </div>

                  <GlassInput
                    type="password"
                    placeholder={t('auth:recovery.newPasswordPlaceholder', 'Новый мастер-пароль')}
                    label={t('auth:recovery.newPasswordPlaceholder', 'Новый мастер-пароль')}
                    value={newPasswordInput}
                    onChange={(e: any) => setNewPasswordInput(e.target.value)}
                    icon={<Lock className="w-4 h-4 text-purple-400" />}
                  />

                  <GlassInput
                    type="password"
                    placeholder={t('auth:recovery.newPasswordConfirm', 'Повторите новый пароль')}
                    label={t('auth:recovery.newPasswordConfirm', 'Подтверждение пароля')}
                    value={newPasswordConfirmInput}
                    onChange={(e: any) => setNewPasswordConfirmInput(e.target.value)}
                    icon={<Lock className="w-4 h-4 text-purple-400" />}
                  />

                  <div className="pt-2">
                    <GlassButton
                      type="submit"
                      variant="accent"
                      disabled={isRecoverySubmitting}
                      className="w-full py-3 rounded-xl flex items-center justify-center gap-2 shadow-glass-md border border-purple-500/30 hover:shadow-purple-500/10 transition-all font-semibold"
                    >
                      {isRecoverySubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 text-purple-200 animate-spin" />
                          {t('common:status.loading', 'Загрузка...')}
                        </>
                      ) : (
                        <>
                          <Key className="w-4 h-4 text-purple-200" />
                          {t('auth:recovery.submitButton', 'Восстановить аккаунт')}
                        </>
                      )}
                    </GlassButton>
                  </div>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      ← {t('auth:register.loginLink', 'Вернуться к авторизации')}
                    </button>
                  </div>
                </form>
              ) : (
                /* Форма входа / регистрации */
                <form onSubmit={handleAuth} className="space-y-4">
                  <GlassInput
                    placeholder={t('auth:login.usernamePlaceholder', 'Имя пользователя')}
                    label={t('auth:login.usernamePlaceholder', 'Имя пользователя')}
                    value={username}
                    onChange={(e: any) => setUsername(e.target.value)}
                    icon={<Fingerprint className="w-4 h-4 text-purple-400" />}
                  />
                  
                  <GlassInput
                    type="password"
                    placeholder={t('auth:login.passwordPlaceholder', 'Введите ваш пароль...')}
                    label={t('auth:login.passwordPlaceholder', 'Пароль')}
                    value={password}
                    onChange={(e: any) => setPassword(e.target.value)}
                    icon={<Lock className="w-4 h-4 text-purple-400" />}
                  />

                  {authMode === 'login' && (
                    <div className="flex items-center justify-between text-[11px]">
                      <button
                        type="button"
                        onClick={() => { setAuthMode('recovery'); setErrorMsg(''); }}
                        className={`font-medium transition-colors ${
                          theme === 'light' ? 'text-blue-600 hover:text-blue-700' : 'text-purple-400 hover:text-purple-300'
                        }`}
                      >
                        {t('auth:login.forgotPassword', 'Забыли пароль? Восстановить по 12 словам')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAdvancedServer(!showAdvancedServer)}
                        className="text-slate-500 hover:text-purple-400 transition-colors"
                      >
                        {showAdvancedServer ? t('auth:server.hideSettings', "Скрыть сервер") : t('auth:server.showSettings', "Сервер")}
                      </button>
                    </div>
                  )}

                  {authMode === 'register' && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => setShowAdvancedServer(!showAdvancedServer)}
                        className="text-[11px] text-slate-500 hover:text-purple-400 transition-colors"
                      >
                        {showAdvancedServer ? t('auth:server.hideSettings', "Скрыть настройки сервера") : t('auth:server.showSettings', "Настройки сервера (Advanced)")}
                      </button>
                    </div>
                  )}

                  {showAdvancedServer && (
                    <div className="space-y-2">
                      <GlassInput
                        placeholder="Например, http://192.168.1.15:8082 или https://ngrok.app"
                        label={t('auth:server.urlLabel', 'Адрес сервера (MessageApi / Gateway)')}
                        value={customServerUrl}
                        onChange={(e: any) => {
                          const val = e.target.value;
                          setCustomServerUrl(val);
                          if (val.trim()) {
                            localStorage.setItem("gossip_custom_backend_url", val.trim());
                          } else {
                            localStorage.removeItem("gossip_custom_backend_url");
                          }
                        }}
                        icon={<Globe className="w-4 h-4 text-purple-400" />}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const logs = (window as any).gossip_logs || [];
                          if (logs.length === 0) {
                            alert("Логи пусты.");
                            return;
                          }
                          navigator.clipboard.writeText(logs.join("\n"))
                            .then(() => alert("Логи скопированы в буфер обмена!"))
                            .catch(() => alert("Не удалось скопировать логи."));
                        }}
                        className="w-full text-center text-[11px] text-purple-300 hover:text-purple-200 bg-white/5 py-2 px-3 rounded-lg border border-white/10 hover:bg-white/10 transition-all"
                      >
                        {t('auth:server.copyLogs', { count: (window as any).gossip_logs?.length || 0, defaultValue: `Скопировать логи отладки (${(window as any).gossip_logs?.length || 0} строк)` })}
                      </button>
                    </div>
                  )}
                  
                  <div className="pt-2">
                    <GlassButton
                      type="submit"
                      variant="accent"
                      className="w-full py-3 rounded-xl flex items-center justify-center gap-2 shadow-glass-md border border-purple-500/30 hover:shadow-purple-500/10 transition-all font-semibold"
                    >
                      <ShieldCheck className="w-4 h-4 text-purple-200" />
                      {authMode === 'login' ? t('auth:login.submitButton', 'Войти в аккаунт') : t('auth:register.submitButton', 'Создать защищённый аккаунт')}
                    </GlassButton>
                  </div>
                  <div className="text-center pt-2 border-t border-white/5 mt-4">
                    <button
                      type="button"
                      onClick={() => setAuthState('install')}
                      className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center justify-center gap-1.5 mx-auto font-medium"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      {t('auth:install.mobileLink', 'Установить на телефон (PWA / APK)')}
                    </button>
                  </div>
                </form>
              )}
            </GlassCard>

            {/* Модальное окно подтверждения 12 мнемонических слов при регистрации */}
            {showMnemonicModal && (
              <GlassModal
                isOpen={showMnemonicModal}
                onClose={() => setShowMnemonicModal(false)}
                title={`🔑 ${t('auth:mnemonic.modalTitle', 'Секретная Seed-фраза восстановления')}`}
              >
                <div className="space-y-4 p-1">
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-amber-200 text-xs leading-relaxed">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold text-amber-300 block mb-1">
                        {t('auth:mnemonic.warningTitle', 'Сохраните эту фразу в надежном месте!')}
                      </strong>
                      {t('auth:mnemonic.warningDesc', 'Сервер не имеет копии этих слов. В случае утери пароля восстановить доступ к аккаунту и переписке можно будет только с помощью этой фразы.')}
                    </div>
                  </div>

                  {/* Сетка 12 слов */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-black/40 rounded-2xl border border-white/10">
                    {generatedMnemonic.words.map((w: any, idx: any) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/5 text-xs font-mono"
                      >
                        <span className="text-purple-400 font-bold text-[11px] w-5">{idx + 1}.</span>
                        <span className="text-slate-100 font-semibold select-all truncate">{w}</span>
                      </div>
                    ))}
                  </div>

                  {/* Кнопки копирования и скачивания */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedMnemonic.phrase);
                        setMnemonicCopied(true);
                        showToast(t('auth:mnemonic.copiedToast', 'Мнемоническая фраза скопирована в буфер обмена'), "success");
                        setTimeout(() => setMnemonicCopied(false), 3000);
                      }}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      {mnemonicCopied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">{t('common:actions.copied', 'Скопировано!')}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-slate-300" />
                          <span>{t('auth:mnemonic.copyButton', 'Скопировать фразу')}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([
                          `GOSSIP ZERO-KNOWLEDGE RECOVERY SEED\n`,
                          `User: ${pendingRegisterPayload?.username || 'user'}\n`,
                          `Generated: ${new Date().toISOString()}\n\n`,
                          `12 RECOVERY WORDS:\n`,
                          `${generatedMnemonic.phrase}\n\n`,
                          `WARNING: Keep this file encrypted or on an isolated offline medium.`
                        ], { type: 'text/plain;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `gossip-recovery-${pendingRegisterPayload?.username || 'seed'}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                        showToast(t('common:status.success', 'Успешно'), "info");
                      }}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <FileText className="w-4 h-4 text-slate-300" />
                      <span>{t('auth:mnemonic.downloadTxt', 'Скачать .txt файл')}</span>
                    </button>
                  </div>

                  {/* Чекбокс подтверждения */}
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/[0.04] transition-colors">
                    <input
                      type="checkbox"
                      checked={mnemonicConfirmed}
                      onChange={(e: any) => setMnemonicConfirmed(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-white/20 text-purple-600 focus:ring-purple-500 bg-black/40 cursor-pointer"
                    />
                    <span className="text-xs text-slate-300 leading-snug select-none">
                      {t('auth:mnemonic.confirmCheckbox', 'Я надежно сохранил эти 12 слов и понимаю, что без них восстановление аккаунта при утере пароля невозможно.')}
                    </span>
                  </label>

                  {/* Кнопка продолжения */}
                  <div className="flex gap-3 pt-2">
                    <GlassButton
                      variant="secondary"
                      onClick={() => setShowMnemonicModal(false)}
                      className="flex-1 py-3 text-xs"
                    >
                      {t('common:actions.cancel', 'Отмена')}
                    </GlassButton>
                    <GlassButton
                      variant="accent"
                      disabled={!mnemonicConfirmed}
                      onClick={handleConfirmMnemonicAndRegister}
                      className="flex-1 py-3 text-xs font-bold"
                    >
                      {t('auth:mnemonic.continueButton', 'Завершить регистрацию')}
                    </GlassButton>
                  </div>
                </div>
              </GlassModal>
            )}
          </motion.div>
        )
  );
}
