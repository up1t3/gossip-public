import { useTranslation } from 'react-i18next';
import { RTL_LANGUAGES, normalizeLanguage } from '../config';
import { SupportedLanguage } from '../types';

export interface UseRtlResult {
  isRtl: boolean;
  dir: 'rtl' | 'ltr';
  language: SupportedLanguage;
}

export const useRtl = (): UseRtlResult => {
  const { i18n } = useTranslation();
  const language = normalizeLanguage(i18n.language);
  const isRtl = RTL_LANGUAGES.includes(language);
  const dir = isRtl ? 'rtl' : 'ltr';

  return {
    isRtl,
    dir,
    language,
  };
};

export default useRtl;
