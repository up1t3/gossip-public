import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';
import { registerSW } from 'virtual:pwa-register';

// Принудительное удаление старых Service Worker-ов в Capacitor и Electron (выход из Service Worker Trap)
const checkCapacitor = typeof window !== 'undefined' && (window as any).Capacitor !== undefined;
const checkElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;

if ((checkCapacitor || checkElectron) && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  const alreadyCleaned = typeof localStorage !== 'undefined' && localStorage.getItem('pwa_trap_cleaned_v2') === 'true';
  if (!alreadyCleaned) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().catch(() => {});
        console.log('[PWA-Trap] Удален нежелательный Service Worker в нативном приложении:', registration);
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('pwa_trap_cleaned_v2', 'true');
      }
      if (typeof caches !== 'undefined') {
        caches.keys().then((keys) => {
          Promise.all(keys.map(key => caches.delete(key))).catch(() => {});
        });
      }
    }).catch(err => {
      console.error('[PWA-Trap] Ошибка при очистке Service Worker:', err);
    });
  }
}

// Перехват логов console для отладки на реальных устройствах
if (typeof window !== 'undefined') {
  (window as any).gossip_logs = [];
  const logTypes = ['log', 'info', 'warn', 'error'] as const;
  logTypes.forEach(type => {
    const original = console[type];
    console[type] = function (...args: any[]) {
      try {
        const time = new Date().toISOString();
        const msg = args.map(arg => {
          if (arg instanceof Error) return arg.stack || arg.message;
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg);
            } catch (e) {
              return String(arg);
            }
          }
          return String(arg);
        }).join(' ');
        (window as any).gossip_logs.push(`[${time}] [${type.toUpperCase()}] ${msg}`);
        if ((window as any).gossip_logs.length > 1000) {
          (window as any).gossip_logs.shift();
        }
      } catch (e) {}
      original.apply(console, args);
    };
  });
}

// Автоматическая разблокировка WebAudio на iOS Safari и мобильных браузерах при первом взаимодействии
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = (window as any).__gossipGlobalAudioCtx || new AudioCtx();
        (window as any).__gossipGlobalAudioCtx = ctx;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        // Воспроизводим 1ms бесшумный буфер для полного пробуждения WebKit Audio Engine
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      }
    } catch (e) {}
    window.removeEventListener('touchstart', unlockAudio, true);
    window.removeEventListener('touchend', unlockAudio, true);
    window.removeEventListener('pointerdown', unlockAudio, true);
    window.removeEventListener('click', unlockAudio, true);
    window.removeEventListener('keydown', unlockAudio, true);
  };
  window.addEventListener('touchstart', unlockAudio, { passive: true, capture: true });
  window.addEventListener('touchend', unlockAudio, { passive: true, capture: true });
  window.addEventListener('pointerdown', unlockAudio, { passive: true, capture: true });
  window.addEventListener('click', unlockAudio, { passive: true, capture: true });
  window.addEventListener('keydown', unlockAudio, { passive: true, capture: true });
}

// Переопределение глобального fetch для среды Capacitor и Electron
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    const capacitor = (window as any).Capacitor;
    const isCapacitorNative = capacitor !== undefined && typeof capacitor.isNativePlatform === 'function' && capacitor.isNativePlatform();
    const isElectron = (window as any).electronAPI !== undefined;
    const isLocalDevWeb = !isCapacitorNative && !isElectron && 
                          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const isProdWeb = window.location.hostname === 'skuf-net.ru';

    const isNative = isCapacitorNative || isElectron || (!isLocalDevWeb && !isProdWeb);

    if (isNative) {
      const customUrl = localStorage.getItem("gossip_custom_backend_url");
      let domain = "https://skuf-net.ru";
      if (customUrl) {
        domain = customUrl.endsWith('/') ? customUrl.slice(0, -1) : customUrl;
      } else if (isCapacitorNative && import.meta.env.DEV) {
        const platform = (window as any).Capacitor?.getPlatform();
        const host = platform === 'android' ? '10.0.2.2:8082' : 'localhost:8082';
        domain = `http://${host}`;
      }

      if (typeof input === 'string') {
        if (input.startsWith('/')) {
          input = `${domain}${input}`;
        }
      } else if (input instanceof URL) {
        if (input.href.startsWith(window.location.origin)) {
          input = new URL(input.pathname + input.search + input.hash, domain);
        }
      } else if (input && typeof input === 'object' && 'url' in input) {
        const reqUrl = (input as any).url;
        if (typeof reqUrl === 'string' && reqUrl.startsWith('/')) {
          Object.defineProperty(input, 'url', {
            value: `${domain}${reqUrl}`,
            writable: true
          });
        }
      }
    }

    const promise = originalFetch(input, init);
    const customUrl = localStorage.getItem("gossip_custom_backend_url");

    if (customUrl) {
      return promise.catch(async (err) => {
        console.warn(`[Fetch Interceptor] Ошибка запроса к кастомному бэкенду ${customUrl}:`, err);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        try {
          const testRes = await originalFetch("https://skuf-net.ru/api/v1/system/version", {
            method: 'GET',
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (testRes.ok) {
            console.warn(`[Fetch Interceptor] Продакшн https://skuf-net.ru доступен, сбрасываем нерабочий кастомный URL.`);
            localStorage.removeItem("gossip_custom_backend_url");
            
            let newInput = input;
            const domain = "https://skuf-net.ru";
            const customUrlTrim = customUrl.endsWith('/') ? customUrl.slice(0, -1) : customUrl;
            
            if (typeof newInput === 'string') {
              if (newInput.startsWith(customUrlTrim)) {
                newInput = newInput.replace(customUrlTrim, domain);
              } else if (newInput.startsWith('/')) {
                newInput = `${domain}${newInput}`;
              }
            } else if (newInput instanceof URL) {
              if (newInput.href.startsWith(customUrlTrim)) {
                newInput = new URL(newInput.href.replace(customUrlTrim, domain));
              } else if (newInput.href.startsWith(window.location.origin)) {
                newInput = new URL(newInput.pathname + newInput.search + newInput.hash, domain);
              }
            } else if (newInput && typeof newInput === 'object' && 'url' in newInput) {
              const reqUrl = (newInput as any).url;
              if (typeof reqUrl === 'string') {
                if (reqUrl.startsWith(customUrlTrim)) {
                  Object.defineProperty(newInput, 'url', {
                    value: reqUrl.replace(customUrlTrim, domain),
                    writable: true
                  });
                } else if (reqUrl.startsWith('/')) {
                  Object.defineProperty(newInput, 'url', {
                    value: `${domain}${reqUrl}`,
                    writable: true
                  });
                }
              }
            }
            return originalFetch(newInput, init);
          }
        } catch (testErr) {
          clearTimeout(timeoutId);
          console.warn("[Fetch Interceptor] Продакшн также недоступен. Вероятно, отсутствует интернет-соединение.", testErr);
        }
        throw err;
      });
    }

    return promise;
  };
}

const capacitorObj = typeof window !== 'undefined' ? (window as any).Capacitor : undefined;
const isCapacitorNative = capacitorObj !== undefined && typeof capacitorObj.isNativePlatform === 'function' && capacitorObj.isNativePlatform();
const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;

// Регистрация PWA Service Worker (только для Web/PWA)
if (!isCapacitorNative && !isElectron && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  registerSW({
    onNeedRefresh() {
      console.log('[PWA] Доступно обновление сервис-воркера. Обновление будет применено при следующем открытии вкладки.');
    },
    onOfflineReady() {
      console.log('[PWA] Приложение готово к работе в офлайн-режиме.');
    },
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
