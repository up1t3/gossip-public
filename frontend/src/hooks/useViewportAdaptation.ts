import { useEffect, useState } from 'react';

export interface ViewportAdaptation {
  keyboardHeight: number;
  isKeyboardOpen: boolean;
}

/**
 * Единый источник правды о высоте виртуальной клавиатуры.
 *
 * Основан на visualViewport API — работает в Android WebView (Capacitor),
 * iOS WKWebView (Capacitor), PWA и Electron. Вычисляет высоту клавиатуры как
 * разницу между полной высотой окна (window.innerHeight) и видимой областью
 * (visualViewport.height) с учётом смещения.
 *
 * Побочный эффект: пишет CSS-переменную --app-keyboard-height на :root, чтобы
 * CSS-утилиты (.pb-kb, .mb-kb) и компоненты могли адаптироваться декларативно.
 *
 * Безопасен для сред без visualViewport (очень старые WebView): возвращает
 * { keyboardHeight: 0, isKeyboardOpen: false } и не падает.
 */
export function useViewportAdaptation(): ViewportAdaptation {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let rafId = 0;
    const update = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const next = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        setKeyboardHeight((prev) => (prev === next ? prev : next));
        document.documentElement.style.setProperty('--app-keyboard-height', `${next}px`);

        // На iOS Safari при закрытии клавиатуры восстанавливаем скролл документа
        if (next === 0 && window.scrollY !== 0) {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
      });
    };

    const handleFocusOut = () => {
      // Отложенный сброс скролла после закрытия инпута на iOS Safari
      setTimeout(() => {
        if (window.scrollY !== 0) {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
        update();
      }, 100);
    };

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('orientationchange', update);
    window.addEventListener('focusout', handleFocusOut);
    update();

    return () => {
      cancelAnimationFrame(rafId);
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return { keyboardHeight, isKeyboardOpen: keyboardHeight > 0 };
}
