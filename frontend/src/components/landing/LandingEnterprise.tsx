import React from 'react';
import {
  Building2,
  Scale,
  Briefcase,
  ShieldCheck,
  Cpu,
  ArrowRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassButton, GlassCard } from '../../ui';
import { LandingTheme } from './LandingTypes';

interface LandingEnterpriseProps {
  theme: LandingTheme;
  onEnterpriseDemoClick?: () => void;
}

export const LandingEnterprise: React.FC<LandingEnterpriseProps> = ({
  onEnterpriseDemoClick,
}) => {
  const { t } = useTranslation(['landing', 'common']);

  return (
    <section id="enterprise" className="space-y-8 pt-10">
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Building2 className="w-3.5 h-3.5" />
          <span>{t('landing:enterprise.badge', 'Gossip Enterprise & On-Premise')}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
          {t('landing:enterprise.title', 'Изолированный контур для бизнеса и команд')}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          {t('landing:enterprise.subtitle', 'Разверните независимый кластер коммуникаций в закрытой инфраструктуре вашей компании. 100% владение данными, отсутствие внешних зависимостей и сквозное шифрование по умолчанию.')}
        </p>
      </div>

      {/* Отраслевые сценарии */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard glow className="p-6 space-y-3 bg-white/[0.02] border-white/10 rounded-2xl">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 w-fit">
            <Scale className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-100">
            {t('landing:enterprise.cardLegalTitle', 'Адвокатские бюро и Юристы')}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('landing:enterprise.cardLegalDesc', 'Гарантия адвокатской тайны и защита материалов дел. Исключена возможность изъятия переписок из зарубежных публичных облаков.')}
          </p>
        </GlassCard>

        <GlassCard glow className="p-6 space-y-3 bg-white/[0.02] border-white/10 rounded-2xl">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 w-fit">
            <Briefcase className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-100">
            {t('landing:enterprise.cardFintechTitle', 'Финтех, Инвестбанки & M&A')}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('landing:enterprise.cardFintechDesc', 'Защита стратегических переговоров и инсайдерской финансовой информации. Нулевой след благодаря DLP-политикам автоудаления.')}
          </p>
        </GlassCard>

        <GlassCard glow className="p-6 space-y-3 bg-white/[0.02] border-white/10 rounded-2xl">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-100">
            {t('landing:enterprise.cardMedTitle', 'Медицина & Телемедицина')}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('landing:enterprise.cardMedDesc', 'Врачебная тайна и защита чувствительных данных пациентов в строгом соответствии с мировыми стандартами Privacy by Design.')}
          </p>
        </GlassCard>

        <GlassCard glow className="p-6 space-y-3 bg-white/[0.02] border-white/10 rounded-2xl">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 w-fit">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-100">
            {t('landing:enterprise.cardItTitle', 'IT, R&D & Производство')}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('landing:enterprise.cardItDesc', 'Сохранение коммерческой тайны, чертежей и исходного кода. Интеграция с внутренними CI/CD и корпоративным стеком.')}
          </p>
        </GlassCard>
      </div>

      {onEnterpriseDemoClick && (
        <div className="flex justify-center pt-2">
          <GlassButton
            variant="accent"
            size="md"
            onClick={onEnterpriseDemoClick}
            className="flex items-center gap-2 font-bold text-xs"
          >
            <span>{t('landing:enterprise.requestDemoButton', 'Запросить Enterprise демонстрацию')}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </GlassButton>
        </div>
      )}
    </section>
  );
};
