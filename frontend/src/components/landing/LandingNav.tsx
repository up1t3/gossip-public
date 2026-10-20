import React from 'react';
import {
  Shield,
  Radio,
  Coins,
  Wallet,
  Terminal,
  Building2,
  Sparkles,
  Key,
  HelpCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LandingTheme } from './LandingTypes';

interface LandingNavProps {
  theme: LandingTheme;
  activeSection: string;
  scrollToSection: (id: string) => void;
}

export const LandingNav: React.FC<LandingNavProps> = ({
  theme,
  activeSection,
  scrollToSection,
}) => {
  const { t } = useTranslation(['landing', 'common']);

  const navItems = [
    { id: 'features', label: t('landing:nav.features', 'Архитектура'), icon: Shield },
    { id: 'mesh-radar', label: t('landing:nav.mesh', 'BLE Mesh'), icon: Radio },
    { id: 'sovereign-economic-layer', label: t('landing:nav.sel', 'Суверенный Слой (SEL)'), icon: Coins },
    { id: 'ton-ecosystem', label: t('landing:nav.ton', 'TON Кошелек'), icon: Wallet },
    { id: 'playground', label: t('landing:nav.playground', 'Песочница'), icon: Terminal },
    { id: 'enterprise', label: t('landing:nav.enterprise', 'Enterprise'), icon: Building2 },
    { id: 'pricing', label: t('landing:nav.pricing', 'Тарифы'), icon: Sparkles },
    { id: 'recovery', label: t('landing:nav.recovery', 'Восстановление'), icon: Key },
    { id: 'faq', label: t('landing:nav.faq', 'FAQ'), icon: HelpCircle },
  ];

  return (
    <nav className="sticky top-2 z-30 w-full overflow-x-auto no-scrollbar py-1">
      <div className={`flex items-center gap-1 p-1.5 rounded-2xl border backdrop-blur-xl max-w-fit mx-auto shadow-lg transition-all ${
        theme === 'light'
          ? 'bg-white/90 border-slate-200 shadow-slate-200/50'
          : theme === 'coffee'
          ? 'bg-amber-950/70 border-amber-900/40 shadow-black/40'
          : 'bg-neutral-950/85 border-white/10 shadow-black/50'
      }`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? theme === 'light'
                    ? 'bg-blue-600 text-white shadow-sm font-bold'
                    : theme === 'coffee'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                  : theme === 'light'
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
