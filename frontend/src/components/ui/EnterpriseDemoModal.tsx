import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Send, CheckCircle2, X, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassButton, GlassCard, GlassInput } from '../../ui';

interface EnterpriseDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light' | 'coffee';
}

export const EnterpriseDemoModal: React.FC<EnterpriseDemoModalProps> = ({
  isOpen,
  onClose,
  theme
}) => {
  const { t } = useTranslation(['landing', 'common']);
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [teamSize, setTeamSize] = useState('50-200');
  const [deploymentType, setDeploymentType] = useState('on-premise');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !contactName.trim() || !contactInfo.trim()) {
      setErrorMsg(t('landing:enterpriseModal.errorFillRequired', 'Пожалуйста, заполните название компании, контактное лицо и способ связи'));
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/v1/leads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName.trim(),
          contact_name: contactName.trim(),
          contact_info: contactInfo.trim(),
          team_size: teamSize,
          deployment_type: deploymentType,
          notes: notes.trim()
        })
      });

      if (res.ok) {
        setIsSuccess(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.detail || t('landing:enterpriseModal.errorSubmit', 'Ошибка отправки заявки. Попробуйте снова.'));
      }
    } catch (err) {
      setErrorMsg(t('common:errors.networkError', 'Не удалось связаться с сервером. Проверьте интернет-соединение.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    setErrorMsg('');
    setCompanyName('');
    setContactName('');
    setContactInfo('');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-lg"
      >
        <GlassCard
          glow
          glowColor={theme === 'light' ? 'rgba(37,99,235,0.15)' : 'rgba(16,185,129,0.15)'}
          className={`p-6 sm:p-8 rounded-3xl border shadow-2xl relative transition-colors ${
            theme === 'light'
              ? 'bg-white/95 border-slate-200 text-slate-900'
              : (theme === 'coffee'
                  ? 'bg-[#1A120B]/95 border-[#D5CEA3]/20 text-[#E5E5CB]'
                  : 'bg-[#0D0E15]/95 border-white/10 text-slate-100')
          }`}
        >
          {/* Кнопка закрытия */}
          <button
            type="button"
            onClick={handleResetAndClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl ${
                      theme === 'light' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Gossip Enterprise</h3>
                      <p className="text-xs text-slate-400">{t('landing:enterpriseModal.subtitle', 'Запрос пилота в закрытом контуре компании')}</p>
                    </div>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">{t('landing:enterpriseModal.companyLabel', 'Организация / Компания *')}</label>
                    <GlassInput
                      placeholder={t('landing:enterpriseModal.companyPlaceholder', 'ООО «Корпорация», Адвокатское бюро и др.')}
                      value={companyName}
                      onChange={(e: any) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">{t('landing:enterpriseModal.contactNameLabel', 'Контактное лицо *')}</label>
                      <GlassInput
                        placeholder={t('landing:enterpriseModal.contactNamePlaceholder', 'Имя, должность')}
                        value={contactName}
                        onChange={(e: any) => setContactName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">{t('landing:enterpriseModal.contactInfoLabel', 'Способ связи (Telegram / Email) *')}</label>
                      <GlassInput
                        placeholder="@telegram_handle / email"
                        value={contactInfo}
                        onChange={(e: any) => setContactInfo(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">{t('landing:enterpriseModal.teamSizeLabel', 'Размер команды')}</label>
                      <select
                        value={teamSize}
                        onChange={(e) => setTeamSize(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${
                          theme === 'light'
                            ? 'bg-slate-100 border-slate-200 text-slate-800'
                            : 'bg-white/5 border-white/10 text-slate-200'
                        }`}
                      >
                        <option value="10-50">{t('landing:enterpriseModal.size10_50', '10 – 50 сотрудников')}</option>
                        <option value="50-200">{t('landing:enterpriseModal.size50_200', '50 – 200 сотрудников')}</option>
                        <option value="200-1000">{t('landing:enterpriseModal.size200_1000', '200 – 1 000 сотрудников')}</option>
                        <option value="1000+">{t('landing:enterpriseModal.size1000plus', '1 000+ (Корпорация)')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">{t('landing:enterpriseModal.deploymentLabel', 'Формат развертывания')}</label>
                      <select
                        value={deploymentType}
                        onChange={(e) => setDeploymentType(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${
                          theme === 'light'
                            ? 'bg-slate-100 border-slate-200 text-slate-800'
                            : 'bg-white/5 border-white/10 text-slate-200'
                        }`}
                      >
                        <option value="on-premise">{t('landing:enterpriseModal.deployOnPremise', 'On-Premise (Сервер заказчика)')}</option>
                        <option value="private-cloud">{t('landing:enterpriseModal.deployPrivateCloud', 'Выделенное защищенное облако')}</option>
                        <option value="hybrid">{t('landing:enterpriseModal.deployHybrid', 'Гибридный защищенный контур')}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">{t('landing:enterpriseModal.notesLabel', 'Пожелания / Специфика задач')}</label>
                    <textarea
                      rows={2}
                      placeholder={t('landing:enterpriseModal.notesPlaceholder', 'Интеграция с Active Directory, особые требования безопасности...')}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none resize-none transition-colors ${
                        theme === 'light'
                          ? 'bg-slate-100 border-slate-200 text-slate-800'
                          : 'bg-white/5 border-white/10 text-slate-200'
                      }`}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <GlassButton
                    variant="primary"
                    type="submit"
                    fullWidth
                    disabled={isLoading}
                    className={`py-3.5 text-sm font-bold flex items-center justify-center gap-2 ${
                      theme === 'light'
                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {isLoading ? t('common:status.loading', 'Загрузка...') : (
                      <>
                        <Send className="w-4 h-4" />
                        {t('landing:enterpriseModal.submitBtn', 'Запросить коммерческое предложение')}
                      </>
                    )}
                  </GlassButton>
                </div>

                <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('landing:enterpriseModal.privacyGuarantee', 'Гарантия конфиденциальности. Zero-Knowledge архитектура.')}</span>
                </div>
              </form>
            ) : (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-100">{t('landing:enterpriseModal.successTitle', 'Заявка успешно принята!')}</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    {t('landing:enterpriseModal.successDesc', 'Наш технический архитектор свяжется с вами по указанным контактам для согласования демонстрационного стенда и архитектуры On-Premise.')}
                  </p>
                </div>
                <div className="pt-4">
                  <GlassButton variant="secondary" onClick={handleResetAndClose}>
                    {t('common:actions.close', 'Закрыть')}
                  </GlassButton>
                </div>
              </div>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>
    </div>
  );
};
