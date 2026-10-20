import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Locales imports - all 8 languages x 9 namespaces
import ruCommon from './locales/ru/common.json';
import ruAuth from './locales/ru/auth.json';
import ruChat from './locales/ru/chat.json';
import ruWallet from './locales/ru/wallet.json';
import ruPulse from './locales/ru/pulse.json';
import ruSettings from './locales/ru/settings.json';
import ruLanding from './locales/ru/landing.json';
import ruCalls from './locales/ru/calls.json';
import ruQuest from './locales/ru/quest.json';

import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enChat from './locales/en/chat.json';
import enWallet from './locales/en/wallet.json';
import enPulse from './locales/en/pulse.json';
import enSettings from './locales/en/settings.json';
import enLanding from './locales/en/landing.json';
import enCalls from './locales/en/calls.json';
import enQuest from './locales/en/quest.json';

import esCommon from './locales/es/common.json';
import esAuth from './locales/es/auth.json';
import esChat from './locales/es/chat.json';
import esWallet from './locales/es/wallet.json';
import esPulse from './locales/es/pulse.json';
import esSettings from './locales/es/settings.json';
import esLanding from './locales/es/landing.json';
import esCalls from './locales/es/calls.json';
import esQuest from './locales/es/quest.json';

import zhCommon from './locales/zh/common.json';
import zhAuth from './locales/zh/auth.json';
import zhChat from './locales/zh/chat.json';
import zhWallet from './locales/zh/wallet.json';
import zhPulse from './locales/zh/pulse.json';
import zhSettings from './locales/zh/settings.json';
import zhLanding from './locales/zh/landing.json';
import zhCalls from './locales/zh/calls.json';
import zhQuest from './locales/zh/quest.json';

import arCommon from './locales/ar/common.json';
import arAuth from './locales/ar/auth.json';
import arChat from './locales/ar/chat.json';
import arWallet from './locales/ar/wallet.json';
import arPulse from './locales/ar/pulse.json';
import arSettings from './locales/ar/settings.json';
import arLanding from './locales/ar/landing.json';
import arCalls from './locales/ar/calls.json';
import arQuest from './locales/ar/quest.json';

import faCommon from './locales/fa/common.json';
import faAuth from './locales/fa/auth.json';
import faChat from './locales/fa/chat.json';
import faWallet from './locales/fa/wallet.json';
import faPulse from './locales/fa/pulse.json';
import faSettings from './locales/fa/settings.json';
import faLanding from './locales/fa/landing.json';
import faCalls from './locales/fa/calls.json';
import faQuest from './locales/fa/quest.json';

import frCommon from './locales/fr/common.json';
import frAuth from './locales/fr/auth.json';
import frChat from './locales/fr/chat.json';
import frWallet from './locales/fr/wallet.json';
import frPulse from './locales/fr/pulse.json';
import frSettings from './locales/fr/settings.json';
import frLanding from './locales/fr/landing.json';
import frCalls from './locales/fr/calls.json';
import frQuest from './locales/fr/quest.json';

import deCommon from './locales/de/common.json';
import deAuth from './locales/de/auth.json';
import deChat from './locales/de/chat.json';
import deWallet from './locales/de/wallet.json';
import dePulse from './locales/de/pulse.json';
import deSettings from './locales/de/settings.json';
import deLanding from './locales/de/landing.json';
import deCalls from './locales/de/calls.json';
import deQuest from './locales/de/quest.json';

import ruTransports from './locales/ru.json';
import enTransports from './locales/en.json';
import esTransports from './locales/es.json';
import zhTransports from './locales/zh.json';
import arTransports from './locales/ar.json';
import faTransports from './locales/fa.json';
import frTransports from './locales/fr.json';
import deTransports from './locales/de.json';

import { SupportedLanguage, LanguageMeta } from './types';
import { SUPPORTED_LANGUAGES, RTL_LANGUAGES, LANGUAGES_META } from './languages';

export type { SupportedLanguage, LanguageMeta };
export { SUPPORTED_LANGUAGES, RTL_LANGUAGES, LANGUAGES_META };

export const resources = {
  ru: { common: ruCommon, auth: ruAuth, chat: ruChat, wallet: ruWallet, pulse: ruPulse, settings: ruSettings, landing: ruLanding, calls: ruCalls, quest: ruQuest, transports: ruTransports },
  en: { common: enCommon, auth: enAuth, chat: enChat, wallet: enWallet, pulse: enPulse, settings: enSettings, landing: enLanding, calls: enCalls, quest: enQuest, transports: enTransports },
  es: { common: esCommon, auth: esAuth, chat: esChat, wallet: esWallet, pulse: esPulse, settings: esSettings, landing: esLanding, calls: esCalls, quest: esQuest, transports: esTransports },
  zh: { common: zhCommon, auth: zhAuth, chat: zhChat, wallet: zhWallet, pulse: zhPulse, settings: zhSettings, landing: zhLanding, calls: zhCalls, quest: zhQuest, transports: zhTransports },
  ar: { common: arCommon, auth: arAuth, chat: arChat, wallet: arWallet, pulse: arPulse, settings: arSettings, landing: arLanding, calls: arCalls, quest: arQuest, transports: arTransports },
  fa: { common: faCommon, auth: faAuth, chat: faChat, wallet: faWallet, pulse: faPulse, settings: faSettings, landing: faLanding, calls: faCalls, quest: faQuest, transports: faTransports },
  fr: { common: frCommon, auth: frAuth, chat: frChat, wallet: frWallet, pulse: frPulse, settings: frSettings, landing: frLanding, calls: frCalls, quest: frQuest, transports: frTransports },
  de: { common: deCommon, auth: deAuth, chat: deChat, wallet: deWallet, pulse: dePulse, settings: deSettings, landing: deLanding, calls: deCalls, quest: deQuest, transports: deTransports },
};

export const normalizeLanguage = (lang?: string | null): SupportedLanguage => {
  if (!lang || typeof lang !== 'string') return 'ru';
  const clean = lang.trim().toLowerCase();
  if (SUPPORTED_LANGUAGES.includes(clean as SupportedLanguage)) {
    return clean as SupportedLanguage;
  }
  const base = clean.split('-')[0].split('_')[0];
  if (SUPPORTED_LANGUAGES.includes(base as SupportedLanguage)) {
    return base as SupportedLanguage;
  }
  if (['uk', 'be', 'kk', 'uz', 'ky', 'tg', 'hy', 'az'].includes(base)) {
    return 'ru';
  }
  return 'en';
};

export const detectBestInitialLanguage = (): SupportedLanguage => {
  if (typeof window === 'undefined') return 'ru';

  // 1. URL query parameter (?lang= or ?hl=)
  try {
    if (window.location && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const urlLang = params.get('lang') || params.get('hl');
      if (urlLang) return normalizeLanguage(urlLang);
    }
  } catch (e) {}

  // 2. Explicit user choice in localStorage
  try {
    const saved =
      localStorage.getItem('gossip_language') ||
      localStorage.getItem('gossip_lang') ||
      localStorage.getItem('i18nextLng');
    if (saved) return normalizeLanguage(saved);
  } catch (e) {}

  // 3. Browser languages (navigator.languages + navigator.language)
  const navLangs: string[] = [];
  if (typeof navigator !== 'undefined') {
    if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
      navLangs.push(...navigator.languages);
    }
    if (navigator.language) {
      navLangs.push(navigator.language);
    }
  }

  for (const raw of navLangs) {
    if (!raw) continue;
    const base = raw.trim().toLowerCase().split('-')[0].split('_')[0];
    if (SUPPORTED_LANGUAGES.includes(base as SupportedLanguage) && base !== 'en') {
      return base as SupportedLanguage;
    }
    if (['uk', 'be', 'kk', 'uz', 'ky', 'tg', 'hy', 'az'].includes(base)) {
      return 'ru';
    }
  }

  if (navLangs.length > 0) {
    return normalizeLanguage(navLangs[0]);
  }
  return 'en';
};

export const SEO_META_BY_LANG: Record<SupportedLanguage, { title: string; description: string; locale: string }> = {
  ru: {
    title: 'Gossip — Суверенный Защищенный Мессенджер | Постквантовое Шифрование, BLE Mesh & Кошелек',
    description: 'Суверенный мессенджер с постквантовым шифрованием ML-KEM-768, автономным радиоконтуром BLE Mesh без интернета, кошельком TON/USDT и ZK-эскроу сделок.',
    locale: 'ru_RU',
  },
  en: {
    title: 'Gossip — Sovereign Post-Quantum Messenger | Offline BLE Mesh & Zero-Knowledge Escrow',
    description: 'Open-core sovereign messenger with NIST FIPS 203 ML-KEM-768 encryption, offline Bluetooth Mesh radio (up to 10km), non-custodial TON/USDT wallet, and Halo2 ZK escrow.',
    locale: 'en_US',
  },
  es: {
    title: 'Gossip — Mensajero Soberano Post-Cuántico | Red BLE Mesh Offline y Billetera ZK',
    description: 'Mensajero soberano con cifrado post-cuántico ML-KEM-768, radio Bluetooth Mesh sin internet, billetera TON/USDT integrada y contratos de depósito en garantía ZK.',
    locale: 'es_ES',
  },
  zh: {
    title: 'Gossip — 主权后量子加密通讯 | 离线蓝牙 Mesh 网络与零知识证明托管钱包',
    description: '采用 NIST FIPS 203 ML-KEM-768 后量子端到端加密、断网 BLE Mesh 无线电中继、内置非托管 TON/USDT 钱包与 Halo2 零知识证明智能托管的主权通讯平台。',
    locale: 'zh_CN',
  },
  ar: {
    title: 'Gossip — تطبيق مراسلة سيادي ما بعد الكم | شبكة بلوتوث Mesh بدون إنترنت ومحفظة معرفة صفرية',
    description: 'منصة تواصل سيادية بتشفير ما بعد الكم ML-KEM-768، واتصال لاسلكي عبر البلوتوث BLE Mesh أثناء انقطاع الإنترنت، ومحفظة TON/USDT مدمجة مع ضمان ذكي ببراهين المعرفة الصفرية.',
    locale: 'ar_SA',
  },
  fa: {
    title: 'Gossip — پیام‌رسان مستقل پسا-کوانتومی | شبکه بلوتوث Mesh آفلاین و کیف پول دانش صفر',
    description: 'پیام‌رسان امن با رمزنگاری پسا-کوانتومی ML-KEM-768، ارتباط رادیویی BLE Mesh بدون اینترنت و فیلترینگ، کیف پول غیرحضانتی TON/USDT و قرارداد امانی دانش صفر Halo2.',
    locale: 'fa_IR',
  },
  fr: {
    title: 'Gossip — Messagerie Souveraine Post-Quantique | Réseau BLE Mesh Hors-Ligne & Portefeuille ZK',
    description: 'Plateforme souveraine avec chiffrement post-quantique ML-KEM-768, radio Bluetooth Mesh sans internet, portefeuille TON/USDT non-custodial et séquestre intelligent Halo2 ZK.',
    locale: 'fr_FR',
  },
  de: {
    title: 'Gossip — Souveräner Post-Quanten-Messenger | Offline BLE-Mesh & Zero-Knowledge-Wallet',
    description: 'Souveräne Kommunikationsplattform mit post-quantensicherer ML-KEM-768-Verschlüsselung, Offline-Bluetooth-Mesh-Funknetz, integriertem TON/USDT-Wallet und Halo2-ZK-Treuhand.',
    locale: 'de_DE',
  },
};

export const applyLanguage = (lang: string) => {
  const normalizedLang = normalizeLanguage(lang);
  const isRtl = RTL_LANGUAGES.includes(normalizedLang);
  const dir = isRtl ? 'rtl' : 'ltr';

  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = normalizedLang;
    document.documentElement.dir = dir;
    if (document.documentElement.classList) {
      if (isRtl) {
        document.documentElement.classList.add('rtl');
      } else {
        document.documentElement.classList.remove('rtl');
      }
    }
    const seo = SEO_META_BY_LANG[normalizedLang] || SEO_META_BY_LANG.en;
    if (typeof document.title === 'string') {
      document.title = seo.title;
    }
    if (typeof document.querySelector === 'function') {
      const setMeta = (selector: string, content: string) => {
        const el = document.querySelector(selector);
        if (el && typeof el.setAttribute === 'function') {
          el.setAttribute('content', content);
        }
      };
      setMeta('meta[name="title"]', seo.title);
      setMeta('meta[name="description"]', seo.description);
      setMeta('meta[property="og:title"]', seo.title);
      setMeta('meta[property="og:description"]', seo.description);
      setMeta('meta[property="og:locale"]', seo.locale);
      setMeta('meta[name="twitter:title"]', seo.title);
      setMeta('meta[name="twitter:description"]', seo.description);
    }
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('i18nextLng', normalizedLang);
    localStorage.setItem('gossip_language', normalizedLang);
    localStorage.setItem('gossip_lang', normalizedLang);
  }
};

const initialDetectedLanguage = detectBestInitialLanguage();

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: initialDetectedLanguage,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    ns: ['common', 'auth', 'chat', 'wallet', 'pulse', 'settings', 'landing', 'calls', 'quest', 'transports'],
    defaultNS: 'common',
    fallbackNS: 'common',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
      lookupQuerystring: 'lang',
      lookupLocalStorage: 'gossip_language',
      caches: ['localStorage'],
    },
    react: {
      useSuspense: false, // Prevents blank screens during SSR or dynamic loads
    },
  });

// Listen to language change to update DOM dir and lang
i18n.on('languageChanged', (lang) => {
  applyLanguage(lang);
});

// Initial apply
if (typeof window !== 'undefined') {
  applyLanguage(initialDetectedLanguage);
}

export default i18n;
