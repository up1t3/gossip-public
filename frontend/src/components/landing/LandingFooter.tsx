import React, { useState } from 'react';
import { AtSign, Check, Copy, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LandingTheme } from './LandingTypes';
import {
  SUPPORTED_LANGUAGES,
  LANGUAGES_META,
  normalizeLanguage,
  applyLanguage,
  SupportedLanguage
} from '../../i18n';

interface LandingFooterProps {
  theme: LandingTheme;
  scrollToSection: (id: string) => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({
  theme,
  scrollToSection,
}) => {
  const { t, i18n } = useTranslation(['landing', 'common']);
  const currentLang = normalizeLanguage(i18n.language);
  const currentYear = new Date().getFullYear();
  const [copiedCreator, setCopiedCreator] = useState(false);

  const handleLanguageChange = (code: SupportedLanguage) => {
    i18n.changeLanguage(code);
    applyLanguage(code);
  };

  const handleCopyCreator = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('@up1t3r').catch(() => {});
    }
    setCopiedCreator(true);
    setTimeout(() => setCopiedCreator(false), 2200);
  };

  return (
    <footer className={`border-t pt-8 pb-4 text-center space-y-5 ${theme === 'light' ? 'border-slate-200' : 'border-white/5'}`}>
      {/* Горизонтальный переключатель всех 8 языков */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        {SUPPORTED_LANGUAGES.map((code) => {
          const meta = LANGUAGES_META[code];
          const isSelected = currentLang === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => handleLanguageChange(code)}
              data-testid={`footer-lang-${code}`}
              className={`flex items-center justify-center px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? theme === 'light'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300 shadow-sm'
                    : theme === 'coffee'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : theme === 'light'
                  ? 'bg-slate-100/70 text-slate-600 hover:bg-slate-200/80 border border-slate-200'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 border border-white/5'
              }`}
              title={meta.nativeName}
            >
              <span className="font-mono uppercase font-bold text-[11px]">{meta.code.toUpperCase()}</span>
            </button>
          );
        })}
      </div>

      {/* Контакт создателя в Gossip (@up1t3r) */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={handleCopyCreator}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
            theme === 'light'
              ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
              : 'bg-white/[0.04] border-white/10 text-slate-200 hover:border-emerald-500/40 hover:bg-emerald-500/10'
          }`}
          title={t('landing:footer.creatorHint', 'Нажмите, чтобы скопировать никнейм для связи внутри мессенджера')}
        >
          <AtSign className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-blue-600' : 'text-emerald-400'}`} />
          <span>{t('landing:footer.creatorLabel', 'Создатель проекта в Gossip:')}</span>
          <span className={`font-mono font-bold ${theme === 'light' ? 'text-blue-700' : 'text-emerald-400'}`}>
            @up1t3r
          </span>
          {copiedCreator ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 opacity-60" />
          )}
        </button>

        <a
          href="https://github.com/up1t3/gossip-public"
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
            theme === 'light'
              ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              : 'bg-white/[0.03] border-white/10 text-slate-300 hover:border-white/20'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono text-[11px]">github.com/up1t3/gossip-public</span>
        </a>
      </div>

      {/* Копирайт с обязательной подстановкой текущего года */}
      <p className={`text-xs font-medium ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
        {t('landing:footer.copyright', {
          year: currentYear,
          defaultValue: `© ${currentYear} Gossip Protocol. Свободный исходный код под защитной лицензией BSL 1.1.`
        })}
      </p>

      <div className={`flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[10px] font-bold uppercase tracking-wider ${
        theme === 'light' ? 'text-slate-600' : 'text-slate-300'
      }`}>
        <a
          href="#features"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection('features');
          }}
          className={`transition-colors cursor-pointer ${
            theme === 'light'
              ? 'hover:text-blue-600'
              : (theme === 'coffee' ? 'hover:text-amber-400' : 'hover:text-emerald-400')
          }`}
        >
          {t('landing:footer.architecture', 'Архитектура')}
        </a>
        <span>•</span>
        <a
          href="#mesh-radar"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection('mesh-radar');
          }}
          className={`transition-colors cursor-pointer ${
            theme === 'light'
              ? 'hover:text-blue-600'
              : (theme === 'coffee' ? 'hover:text-amber-400' : 'hover:text-emerald-400')
          }`}
        >
          {t('landing:footer.bleMesh', 'BLE Mesh')}
        </a>
        <span>•</span>
        <a
          href="#sovereign-economic-layer"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection('sovereign-economic-layer');
          }}
          className={`transition-colors cursor-pointer ${
            theme === 'light'
              ? 'hover:text-blue-600'
              : (theme === 'coffee' ? 'hover:text-amber-400' : 'hover:text-emerald-400')
          }`}
        >
          {t('landing:footer.sel', 'Суверенный Слой (SEL)')}
        </a>
        <span>•</span>
        <a
          href="#ton-ecosystem"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection('ton-ecosystem');
          }}
          className={`transition-colors cursor-pointer ${
            theme === 'light'
              ? 'hover:text-blue-600'
              : (theme === 'coffee' ? 'hover:text-amber-400' : 'hover:text-emerald-400')
          }`}
        >
          {t('landing:footer.tonWallet', 'TON Кошелек')}
        </a>
        <span>•</span>
        <a
          href="#recovery"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection('recovery');
          }}
          className={`transition-colors cursor-pointer ${
            theme === 'light'
              ? 'hover:text-blue-600'
              : (theme === 'coffee' ? 'hover:text-amber-400' : 'hover:text-emerald-400')
          }`}
        >
          {t('landing:footer.recovery', 'Восстановление')}
        </a>
        <span>•</span>
        <a
          href="#faq"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection('faq');
          }}
          className={`transition-colors cursor-pointer ${
            theme === 'light'
              ? 'hover:text-blue-600'
              : (theme === 'coffee' ? 'hover:text-amber-400' : 'hover:text-emerald-400')
          }`}
        >
          {t('landing:footer.faq', 'FAQ')}
        </a>
        <span>•</span>
        <a
          href="https://github.com/up1t3/gossip-public"
          target="_blank"
          rel="noopener noreferrer"
          className={`transition-colors ${
            theme === 'light'
              ? 'hover:text-blue-600'
              : (theme === 'coffee' ? 'hover:text-amber-400' : 'hover:text-emerald-400')
          }`}
        >
          GitHub (Open-Client)
        </a>
        <span>•</span>
        <a
          href="https://github.com/up1t3/gossip-public/blob/main/SECURITY.md"
          target="_blank"
          rel="noopener noreferrer"
          className={`transition-colors ${
            theme === 'light'
              ? 'hover:text-blue-600'
              : (theme === 'coffee' ? 'hover:text-amber-400' : 'hover:text-emerald-400')
          }`}
        >
          {t('landing:footer.security', 'SECURITY.md & SHA-256')}
        </a>
      </div>
    </footer>
  );
};
