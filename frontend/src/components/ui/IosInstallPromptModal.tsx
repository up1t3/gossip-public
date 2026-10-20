// frontend/src/components/ui/IosInstallPromptModal.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, PlusSquare, X, Smartphone, Bell, Shield, Zap } from 'lucide-react';
import { haptics } from '../../utils/haptics';

export interface IosInstallPromptModalProps {
  theme?: 'dark' | 'light' | 'coffee';
}

/**
 * Telegram/iOS-Style Action Sheet Onboarding для установки PWA на iPhone:
 * - Детектирует браузер Safari на iOS (iPhone/iPad)
 * - Показывается ТОЛЬКО если приложение открыто во вкладке браузера Safari (не в Standalone режиме)
 * - Сохраняет состояние закрытия в localStorage (чтобы не надоедать при каждом клике)
 * - Предоставляет наглядную анимацию и понятную инструкцию в 2 шага (Share -> Add to Home Screen)
 */
export const IosInstallPromptModal: React.FC<IosInstallPromptModalProps> = ({
  theme = 'dark'
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let timer: any = null;

    // Проверка: запущено ли на iOS устройстве
    const isIOS = typeof navigator !== 'undefined' && (
      /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );

    // Проверка: находится ли уже в режиме Standalone PWA
    const isStandalone = typeof window !== 'undefined' && (
      (window.navigator as any).standalone === true || 
      window.matchMedia('(display-mode: standalone)').matches
    );

    // Проверка: нативное ли приложение (Capacitor/Electron)
    const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor !== undefined && (window as any).Capacitor.isNativePlatform();
    const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;

    if (isIOS && !isStandalone && !isCapacitor && !isElectron) {
      const dismissedAt = localStorage.getItem('gossip_ios_install_dismissed');
      const now = Date.now();
      // Показываем, если не скрывали последние 24 часа
      if (!dismissedAt || (now - parseInt(dismissedAt, 10)) > 24 * 60 * 60 * 1000) {
        timer = setTimeout(() => {
          setIsOpen(true);
        }, 2000);
      }
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  const handleDismiss = () => {
    haptics.trigger('light');
    localStorage.setItem('gossip_ios_install_dismissed', Date.now().toString());
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex flex-col justify-end p-0 select-none animate-fade-in"
        onClick={handleDismiss}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full rounded-t-[32px] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] border-t shadow-2xl flex flex-col gap-4 max-w-lg mx-auto ${
            theme === 'light'
              ? 'bg-white/95 border-black/10 text-slate-900'
              : theme === 'coffee'
                ? 'bg-[#1F1610]/95 border-[#D5CEA3]/20 text-[#E5E5CB]'
                : 'bg-neutral-900/95 border-white/10 text-white'
          }`}
        >
          {/* Верхняя плашка закрытия */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-md">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h3 className="font-bold text-base tracking-tight leading-tight">
                  Установите Gossip на iPhone
                </h3>
                <span className="text-xs text-slate-400">
                  Полноценное приложение с Push-уведомлениями
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Преимущества установки */}
          <div className="grid grid-cols-3 gap-2 my-1">
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center text-center gap-1">
              <Bell className="w-4 h-4 text-purple-400" />
              <span className="text-[11px] font-semibold">WebPush</span>
              <span className="text-[9px] text-slate-400">Мгновенные звонки</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center text-center gap-1">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-semibold">100% E2EE</span>
              <span className="text-[9px] text-slate-400">Вечное хранение</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center text-center gap-1">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] font-semibold">Быстродействие</span>
              <span className="text-[9px] text-slate-400">Без рамок Safari</span>
            </div>
          </div>

          {/* Инструкция в 2 шага */}
          <div className="flex flex-col gap-2.5 bg-white/[0.03] border border-white/10 rounded-2xl p-3.5">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-xs flex-shrink-0">
                1
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span>Нажмите кнопку</span>
                <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md bg-white/10 text-blue-400 border border-white/10">
                  <Share className="w-3.5 h-3.5" /> Поделиться
                </span>
                <span>в меню Safari</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center text-xs flex-shrink-0">
                2
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span>Выберите пункт</span>
                <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md bg-white/10 text-purple-400 border border-white/10">
                  <PlusSquare className="w-3.5 h-3.5" /> На экран «Домой»
                </span>
              </div>
            </div>
          </div>

          {/* Кнопка "Понятно" */}
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/25 active:scale-98 transition-all"
          >
            Понятно, добавлю
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default IosInstallPromptModal;
