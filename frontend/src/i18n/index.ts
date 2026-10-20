import i18n from './config';
import { initAutoDomTranslator } from './autoDomTranslator';

if (typeof window !== 'undefined') {
  initAutoDomTranslator();
}

export default i18n;
export * from './config';
export * from './languages';
export * from './types';
export * from './hooks/useRtl';
export * from './autoDomTranslator';

