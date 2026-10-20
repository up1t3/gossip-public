import 'i18next';
import common from './locales/ru/common.json';
import auth from './locales/ru/auth.json';
import chat from './locales/ru/chat.json';
import wallet from './locales/ru/wallet.json';
import pulse from './locales/ru/pulse.json';
import settings from './locales/ru/settings.json';
import landing from './locales/ru/landing.json';
import calls from './locales/ru/calls.json';
import quest from './locales/ru/quest.json';
import transports from './locales/ru.json';

export type SupportedLanguage = 'ru' | 'en' | 'es' | 'zh' | 'ar' | 'fa' | 'fr' | 'de';

export interface LanguageMeta {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}

export type I18nResources = {
  common: typeof common;
  auth: typeof auth;
  chat: typeof chat;
  wallet: typeof wallet;
  pulse: typeof pulse;
  settings: typeof settings;
  landing: typeof landing;
  calls: typeof calls;
  quest: typeof quest;
  transports: typeof transports;
};

export type DefaultResources = I18nResources;

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: I18nResources;
  }
}
