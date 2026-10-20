import { SupportedLanguage, LanguageMeta } from './types';

export type { SupportedLanguage, LanguageMeta };

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['ru', 'en', 'es', 'zh', 'ar', 'fa', 'fr', 'de'];

export const RTL_LANGUAGES: SupportedLanguage[] = ['ar', 'fa'];

export const LANGUAGES_META: Record<SupportedLanguage, LanguageMeta> = {
  ru: { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  en: { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', dir: 'ltr' },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr' },
  zh: { code: 'zh', name: 'Chinese', nativeName: '中文 (简体)', flag: '🇨🇳', dir: 'ltr' },
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  fa: { code: 'fa', name: 'Persian', nativeName: 'فارسی', flag: '🇮🇷', dir: 'rtl' },
  fr: { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr' },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
};

export const isRtlLanguage = (lang: string): boolean => {
  return RTL_LANGUAGES.includes(lang as SupportedLanguage);
};

export const getLanguageMeta = (lang: string): LanguageMeta => {
  const normalized = (SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage) ? lang : 'ru') as SupportedLanguage;
  return LANGUAGES_META[normalized] || LANGUAGES_META.ru;
};
