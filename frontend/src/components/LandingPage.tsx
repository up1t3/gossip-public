import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { GliderQuest } from './GliderQuest';
import gutenbergImg from '../assets/chronicles/gutenberg.jpg';
import zengerImg from '../assets/chronicles/zenger.jpg';
import samizdatImg from '../assets/chronicles/samizdat.jpg';
import cryptoWarsImg from '../assets/chronicles/crypto_wars.jpg';
import digitalMeshImg from '../assets/chronicles/digital_mesh.jpg';
import futureImg from '../assets/chronicles/future_knowledge.jpg';
import { useTranslation } from 'react-i18next';
import packageJson from '../../package.json';
import {
  LandingTheme,
  LandingHeader,
  LandingNav,
  LandingHero,
  LandingPillars,
  LandingMeshSection,
  LandingSELSection,
  LandingTonSection,
  LandingPlayground,
  LandingEnterprise,
  LandingPricing,
  LandingRecovery,
  LandingFAQ,
  LandingFooter
} from './landing';

interface LandingPageProps {
  onLoginClick: () => void;
  onInstallClick: () => void;
  onEnterpriseDemoClick?: () => void;
  theme: LandingTheme;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLoginClick,
  onInstallClick,
  onEnterpriseDemoClick,
  theme
}) => {
  useTranslation(['landing', 'common']);
  const [showQuest, setShowQuest] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>('features');
  const [liveVersion, setLiveVersion] = useState<string>(packageJson.version);
  const [liveBuild, setLiveBuild] = useState<number>(392);
  const [liveReleaseNotes, setLiveReleaseNotes] = useState<string>(
    'Gossip v2.2.32: Полная локализация всех разделов приложения, настроек, сетевого центра, кошелька, Pulse и лендинга на 8 языков (RU, EN, ES, ZH, AR, FA, FR, DE).'
  );

  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/system/version', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (typeof data.version === 'string' && data.version.trim()) {
          setLiveVersion(data.version.trim());
        }
        if (typeof data.versionCode === 'number') {
          setLiveBuild(data.versionCode);
        }
        if (typeof data.releaseNotes === 'string' && data.releaseNotes.trim()) {
          setLiveReleaseNotes(data.releaseNotes.trim());
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Фоновый предзагрузчик фотохроник для мгновенного открытия без задержек
  useEffect(() => {
    const chronicleImages = [gutenbergImg, zengerImg, samizdatImg, cryptoWarsImg, digitalMeshImg, futureImg];
    chronicleImages.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // IntersectionObserver для автоматической подсветки активного раздела в навигации
  useEffect(() => {
    const sectionIds = [
      'features',
      'mesh-radar',
      'sovereign-economic-layer',
      'ton-ecosystem',
      'playground',
      'enterprise',
      'pricing',
      'recovery',
      'faq'
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
      }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full h-full overflow-y-auto overflow-x-hidden px-4 py-6 md:py-10 z-20 relative overscroll-y-contain [webkit-overflow-scrolling:touch]">
      <div className="max-w-6xl mx-auto w-full space-y-16 pb-20">
        
        {/* Шапка */}
        <LandingHeader
          theme={theme}
          liveVersion={liveVersion}
          onLoginClick={onLoginClick}
          onInstallClick={onInstallClick}
          onQuestClick={() => setShowQuest(true)}
        />

        {/* Плавающая липкая навигационная панель */}
        <LandingNav
          theme={theme}
          activeSection={activeSection}
          scrollToSection={scrollToSection}
        />

        {/* Герой Секция */}
        <LandingHero
          theme={theme}
          liveVersion={liveVersion}
          liveBuild={liveBuild}
          liveReleaseNotes={liveReleaseNotes}
          onLoginClick={onLoginClick}
          onInstallClick={onInstallClick}
        />

        {/* Архитектурные столпы и категории прозрачности */}
        <LandingPillars
          theme={theme}
          scrollToSection={scrollToSection}
        />

        {/* BLE Mesh и Автономная рация */}
        <LandingMeshSection
          theme={theme}
          liveVersion={liveVersion}
        />

        {/* Gossip Sovereign Economic Layer (SEL) & ZK-Trust Engine */}
        <LandingSELSection
          theme={theme}
        />

        {/* Экосистема TON & Встроенный криптокошелек */}
        <LandingTonSection
          theme={theme}
        />

        {/* Криптографическая интерактивная песочница */}
        <LandingPlayground
          theme={theme}
        />

        {/* B2B Корпоративная секция (Enterprise & On-Premise) */}
        <LandingEnterprise
          theme={theme}
          onEnterpriseDemoClick={onEnterpriseDemoClick}
        />

        {/* Тарифы и поддержка */}
        <LandingPricing
          theme={theme}
          onLoginClick={onLoginClick}
          onEnterpriseDemoClick={onEnterpriseDemoClick}
        />

        {/* Zero-Knowledge Восстановление доступа */}
        <LandingRecovery
          theme={theme}
        />

        {/* Честные ответы на вопросы (FAQ) */}
        <LandingFAQ
          theme={theme}
        />

        {/* Футер */}
        <LandingFooter
          theme={theme}
          scrollToSection={scrollToSection}
        />

      </div>

      {/* Модальное окно Хроник Свободы */}
      <AnimatePresence>
        {showQuest && (
          <GliderQuest onClose={() => setShowQuest(false)} theme={theme} />
        )}
      </AnimatePresence>
    </div>
  );
};
