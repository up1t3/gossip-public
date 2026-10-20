import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Search, X, Globe, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  SUPPORTED_LANGUAGES,
  LANGUAGES_META,
  normalizeLanguage,
  applyLanguage,
  SupportedLanguage
} from '../../i18n';
import { GlassCard } from '../../ui';

export interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light' | 'coffee';
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  isOpen,
  onClose,
  theme = 'dark'
}) => {
  const { t, i18n } = useTranslation(['settings', 'common', 'chat']);
  const currentLang = normalizeLanguage(i18n.language);
  const [searchQuery, setSearchQuery] = useState('');

  // Закрытие по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Сброс строки поиска при открытии
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredLanguages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SUPPORTED_LANGUAGES.map((code) => LANGUAGES_META[code]).filter((meta) => {
      if (!q) return true;
      return (
        meta.code.toLowerCase().includes(q) ||
        meta.name.toLowerCase().includes(q) ||
        meta.nativeName.toLowerCase().includes(q)
      );
    });
  }, [searchQuery]);

  const handleSelect = (code: SupportedLanguage) => {
    i18n.changeLanguage(code);
    applyLanguage(code);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-modal-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', duration: 0.35 }}
        className="w-full max-w-lg"
      >
        <GlassCard
          glow
          glowColor={
            theme === 'light'
              ? 'rgba(37,99,235,0.18)'
              : theme === 'coffee'
              ? 'rgba(217,119,6,0.18)'
              : 'rgba(168,85,247,0.18)'
          }
          className={`p-6 sm:p-7 rounded-3xl border shadow-2xl relative transition-colors ${
            theme === 'light'
              ? 'bg-white/95 border-slate-200 text-slate-900'
              : theme === 'coffee'
              ? 'bg-[#1A120B]/95 border-[#D5CEA3]/20 text-[#E5E5CB]'
              : 'bg-[#0D0E15]/95 border-white/10 text-slate-100'
          }`}
        >
          {/* Кнопка закрытия */}
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common:actions.close', 'Закрыть')}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Заголовок */}
          <div className="flex items-center gap-3 mb-5">
            <div
              className={`p-2.5 rounded-2xl ${
                theme === 'light'
                  ? 'bg-blue-100 text-blue-700'
                  : theme === 'coffee'
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-purple-500/15 text-purple-400'
              }`}
            >
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h2
                id="language-modal-title"
                className="text-lg font-bold tracking-wide"
              >
                {t('settings:languageModal.title', 'Выбор языка')}
              </h2>
              <p
                className="text-xs text-slate-400"
              >
                {t('settings:system.languageDesc', 'Выбор языка приложения и форматирования')}
              </p>
            </div>
          </div>

          {/* Поиск */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('settings:languageModal.searchPlaceholder', 'Поиск языка...')}
              className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm focus:outline-none transition-all ${
                theme === 'light'
                  ? 'bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400'
                  : theme === 'coffee'
                  ? 'bg-white/5 border-white/10 text-stone-100 placeholder:text-stone-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-400'
                  : 'bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-purple-400 focus:ring-1 focus:ring-purple-400'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Список языков */}
          <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1 overscroll-contain">
            {filteredLanguages.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                {t('chat:list.noSearchResults', 'Ничего не найдено')}
              </div>
            ) : (
              filteredLanguages.map((meta) => {
                const isSelected = currentLang === meta.code;
                const isRtl = meta.dir === 'rtl';

                return (
                  <button
                    key={meta.code}
                    type="button"
                    onClick={() => handleSelect(meta.code)}
                    data-testid={`lang-option-${meta.code}`}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer group text-left ${
                      isSelected
                        ? theme === 'light'
                          ? 'bg-blue-50 border-blue-300 shadow-sm'
                          : theme === 'coffee'
                          ? 'bg-amber-500/15 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                          : 'bg-purple-500/15 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                        : theme === 'light'
                        ? 'bg-slate-50/50 border-slate-200/80 hover:bg-slate-100/80 hover:border-slate-300'
                        : 'bg-white/2 border-white/5 hover:bg-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs font-mono uppercase shrink-0 ${
                        isSelected
                          ? theme === 'light'
                            ? 'bg-blue-200 text-blue-800'
                            : theme === 'coffee'
                            ? 'bg-amber-500/30 text-amber-200'
                            : 'bg-purple-500/30 text-purple-200'
                          : theme === 'light'
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-white/10 text-slate-300'
                      }`}>
                        {meta.code.toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-semibold ${
                              isSelected
                                ? theme === 'light'
                                  ? 'text-blue-700'
                                  : theme === 'coffee'
                                  ? 'text-amber-300'
                                  : 'text-purple-300'
                                : theme === 'light'
                                ? 'text-slate-800'
                                : 'text-slate-200'
                            }`}
                          >
                            {meta.nativeName}
                          </span>
                          {isRtl && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {t('settings:languageModal.rtlBadge', 'RTL')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <div
                          className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-xl ${
                            theme === 'light'
                              ? 'bg-blue-100 text-blue-700'
                              : theme === 'coffee'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-purple-500/20 text-purple-300'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">
                            {t('settings:languageModal.currentLanguage', 'Активен')}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Подвал модалки */}
          <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Gossip Sovereign i18n • 8 Locales</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold hover:text-slate-200 transition-colors cursor-pointer"
            >
              {t('common:actions.done', 'Готово')}
            </button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default LanguageSelectorModal;