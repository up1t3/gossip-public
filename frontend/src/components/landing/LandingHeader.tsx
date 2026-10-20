import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Globe, ChevronDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import packageJson from '../../../package.json';
import { GlassButton, GliderIcon } from '../../ui';
import { LandingTheme } from './LandingTypes';
import {
  SUPPORTED_LANGUAGES,
  LANGUAGES_META,
  normalizeLanguage,
  applyLanguage,
  SupportedLanguage
} from '../../i18n';

interface LandingHeaderProps {
  theme: LandingTheme;
  liveVersion?: string;
  onLoginClick: () => void;
  onInstallClick: () => void;
  onQuestClick: () => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  theme,
  liveVersion = packageJson.version,
  onLoginClick,
  onInstallClick,
  onQuestClick,
}) => {
  const { t, i18n } = useTranslation(['landing', 'common', 'settings']);
  const currentLang = normalizeLanguage(i18n.language);
  const currentMeta = LANGUAGES_META[currentLang] || LANGUAGES_META.ru;
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    if (isLangDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLangDropdownOpen]);

  const handleSelectLanguage = (code: SupportedLanguage) => {
    i18n.changeLanguage(code);
    applyLanguage(code);
    setIsLangDropdownOpen(false);
  };

  return (
    <header className={`flex items-center justify-between border-b pb-4 ${theme === 'light' ? 'border-slate-200' : 'border-white/5'}`}>
      <div className="flex items-center gap-3">
        <div
          className="cursor-pointer group relative flex items-center justify-center p-1 rounded-xl"
          onClick={onQuestClick}
          title={t('landing:header.freedomChronicles', 'Хроники свободы')}
        >
          <motion.div
            className={`absolute inset-0 rounded-xl border ${
              theme === 'light' ? 'border-indigo-500/40' : theme === 'coffee' ? 'border-amber-500/40' : 'border-emerald-400/50'
            } pointer-events-none`}
            animate={{ scale: [1, 1.4, 1.7], opacity: [0.7, 0.2, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          />
          <motion.div
            className={`absolute inset-0 rounded-xl border ${
              theme === 'light' ? 'border-indigo-500/30' : theme === 'coffee' ? 'border-amber-500/30' : 'border-emerald-400/40'
            } pointer-events-none`}
            animate={{ scale: [1, 1.4, 1.7], opacity: [0.7, 0.2, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut", delay: 1.5 }}
          />

          <div className="relative z-10">
            <GliderIcon theme={theme} pulsing={false} />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
          <div className="flex items-center">
            <span className={`text-lg font-bold tracking-wide ${
              theme === 'light' ? 'text-slate-900' : 'text-slate-100'
            }`}>
              Gossip
            </span>
            <span className={`ml-2 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full tracking-wider ${
              theme === 'light'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-[#10E7B2]/10 text-[#10E7B2] border border-[#10E7B2]/25'
            }`}>
              {t('landing:header.versionBadge', { version: liveVersion, defaultValue: `v${liveVersion} • MLS E2EE` })}
            </span>
          </div>

          <motion.button
            onClick={onQuestClick}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full border transition-all shadow-sm cursor-pointer ${
              theme === 'light'
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                : theme === 'coffee'
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                : 'bg-[#10E7B2]/15 border-[#10E7B2]/30 text-[#10E7B2] hover:bg-[#10E7B2]/25 shadow-[0_0_12px_rgba(16,231,178,0.2)]'
            }`}
            title={t('landing:header.freedomChronicles', 'Хроники свободы')}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              theme === 'light' ? 'bg-indigo-500' : theme === 'coffee' ? 'bg-amber-400' : 'bg-[#10E7B2]'
            }`} />
            <span>{t('landing:header.freedomChronicles', 'Хроники свободы')}</span>
          </motion.button>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative notranslate" ref={dropdownRef} translate="no">
          <button
            type="button"
            onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
            data-testid="landing-lang-selector"
            translate="no"
            className={`notranslate flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-sm ${
              theme === 'light'
                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                : theme === 'coffee'
                ? 'bg-[#1A120B] border-[#D5CEA3]/20 text-[#E5E5CB] hover:bg-[#D5CEA3]/10'
                : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
            }`}
            title={t('landing:header.selectLanguage', 'Выбор языка')}
          >
            <Globe className="w-3.5 h-3.5 opacity-80 shrink-0" />
            <span className="font-mono uppercase font-bold text-xs tracking-wider">{currentMeta.code.toUpperCase()}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isLangDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                transition={{ duration: 0.15 }}
                className={`absolute right-0 mt-2 w-48 rounded-2xl border shadow-2xl z-50 p-1.5 backdrop-blur-xl ${
                  theme === 'light'
                    ? 'bg-white/95 border-slate-200 text-slate-900'
                    : theme === 'coffee'
                    ? 'bg-[#1A120B]/95 border-[#D5CEA3]/30 text-[#E5E5CB]'
                    : 'bg-[#0D0E15]/95 border-white/15 text-slate-100 shadow-purple-950/40'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 text-slate-400 border-b border-white/5 mb-1 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  <span>{t('settings:languageModal.title', 'Выбор языка')}</span>
                </div>
                <div className="space-y-0.5 max-h-60 overflow-y-auto">
                  {SUPPORTED_LANGUAGES.map((code) => {
                    const meta = LANGUAGES_META[code];
                    const isSelected = currentLang === code;
                    const isRtl = meta.dir === 'rtl';

                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => handleSelectLanguage(code)}
                        data-testid={`landing-lang-option-${code}`}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                          isSelected
                            ? theme === 'light'
                              ? 'bg-blue-100 text-blue-700 font-bold'
                              : theme === 'coffee'
                              ? 'bg-amber-500/20 text-amber-300 font-bold'
                              : 'bg-purple-500/20 text-purple-300 font-bold'
                            : theme === 'light'
                            ? 'hover:bg-slate-100 text-slate-700'
                            : 'hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[11px] uppercase font-mono w-6 text-center opacity-70">
                            {meta.code.toUpperCase()}
                          </span>
                          <span className="font-medium text-xs">
                            {meta.nativeName}
                          </span>
                          {isRtl && (
                            <span className="text-[8px] font-bold px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              RTL
                            </span>
                          )}
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <GlassButton
          variant="secondary"
          size="sm"
          onClick={onInstallClick}
          className="hidden sm:flex items-center gap-1.5"
        >
          <Smartphone className="w-3.5 h-3.5" />
          {t('landing:header.downloadApk', { version: liveVersion, defaultValue: `Скачать APK (v${liveVersion})` })}
        </GlassButton>
        <GlassButton
          variant="primary"
          size="sm"
          onClick={onLoginClick}
          className={theme === 'light'
            ? "border-blue-200 text-blue-700 bg-blue-100 hover:bg-blue-200"
            : "border-[#10E7B2]/30 text-[#10E7B2] bg-[#10E7B2]/10 hover:bg-[#10E7B2]/20"}
        >
          {t('landing:header.loginWeb', 'Войти в Web')}
        </GlassButton>
      </div>
    </header>
  );
};
