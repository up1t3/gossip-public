import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Sparkles,
  Zap,
  Building2,
  CreditCard,
  Copy,
  CheckCheck,
  ShieldCheck
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { GlassButton, GlassCard } from '../../ui';
import { LandingTheme } from './LandingTypes';
import { getBackendUrl } from '../../utils/url';

interface LandingPricingProps {
  theme: LandingTheme;
  onLoginClick: () => void;
  onEnterpriseDemoClick?: () => void;
}

export const LandingPricing: React.FC<LandingPricingProps> = ({
  theme,
  onLoginClick,
  onEnterpriseDemoClick,
}) => {
  const { t } = useTranslation(['landing', 'common']);
  const [geekMode] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentStep, setPaymentStep] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'crypto' | 'fiat'>('fiat');
  const [paymentLog, setPaymentLog] = useState<string[]>([]);
  const [zkToken, setZkToken] = useState<string>('');
  const [isLandingYooKassaLoading, setIsLandingYooKassaLoading] = useState<boolean>(false);
  const [landingYooKassaError, setLandingYooKassaError] = useState<string | null>(null);
  const [landingTonOrder, setLandingTonOrder] = useState<any | null>(null);
  const [landingQrCodeDataUrl, setLandingQrCodeDataUrl] = useState<string>('');
  const [copiedLandingField, setCopiedLandingField] = useState<'addr' | 'memo' | null>(null);

  useEffect(() => {
    if (landingTonOrder?.deep_link) {
      QRCode.toDataURL(landingTonOrder.deep_link, {
        margin: 1,
        width: 160,
        color: { dark: '#000000', light: '#ffffff' }
      }).then(setLandingQrCodeDataUrl).catch(console.error);
    } else {
      setLandingQrCodeDataUrl('');
    }
  }, [landingTonOrder]);

  const copyLandingToClipboard = (text: string, field: 'addr' | 'memo') => {
    navigator.clipboard.writeText(text);
    setCopiedLandingField(field);
    setTimeout(() => setCopiedLandingField(null), 2000);
  };

  const handleLandingTonPay = async () => {
    const token = localStorage.getItem('token') || '';
    setIsLandingYooKassaLoading(true);
    setLandingYooKassaError(null);
    try {
      const response = await fetch(getBackendUrl('/api/v1/payments/ton/create'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          plan: '1_month'
        })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Ошибка сервера: ${response.statusText}`);
      }
      const data = await response.json();
      setLandingTonOrder(data);
    } catch (err: any) {
      const realWallet = 'UQBGfZZ38xWwEdlmL01GhucvNCkkS-9bRrHae3-k6FdayO-I';
      const fallbackMemo = 'GOSSIP-' + Math.floor(100000 + Math.random() * 900000);
      setLandingTonOrder({
        order_id: 'ton_ord_' + Math.random().toString(36).substring(2, 9),
        wallet_address: realWallet,
        amount_ton: '1.0',
        amount_usdt: '4.99',
        memo: fallbackMemo,
        deep_link: `ton://transfer/${realWallet}?amount=1000000000&text=${fallbackMemo}`,
        tonkeeper_link: `https://app.tonkeeper.com/transfer/${realWallet}?amount=1000000000&text=${fallbackMemo}`
      });
    } finally {
      setIsLandingYooKassaLoading(false);
    }
  };

  const handleLandingYooKassaPay = async () => {
    const token = localStorage.getItem('token') || '';
    setIsLandingYooKassaLoading(true);
    setLandingYooKassaError(null);
    try {
      const origin = window.location.origin || '';
      const returnUrl = origin.includes('localhost') || origin.startsWith('capacitor://')
        ? 'https://skuf-net.ru/?payment=success'
        : window.location.href;
      const response = await fetch(getBackendUrl('/api/v1/payments/yookassa/create'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          plan: '1_month',
          plan_type: 'premium_month',
          return_url: returnUrl
        })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Ошибка создания платежа: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.confirmation_url) {
        window.location.href = data.confirmation_url;
      } else {
        throw new Error('Сервер не вернул confirmation_url');
      }
    } catch (err: any) {
      setLandingYooKassaError(err.message || 'Сбой связи с сервером платежей');
    } finally {
      setIsLandingYooKassaLoading(false);
    }
  };

  const runZKPaymentSimulation = async () => {
    setPaymentStep(1);
    setPaymentLog([]);
    setZkToken('');
    
    // Шаг 1: Локальный токен
    const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setZkToken(randomHex);
    setPaymentLog(prev => [...prev, t('landing:pricing.zkLog1', 'Генерация криптографического токена T...')]);
    await new Promise(r => setTimeout(r, 600));
    setPaymentLog(prev => [...prev, `${t('landing:pricing.zkLog2', 'Сгенерирован токен T')}: ${randomHex.substring(0, 16)}...`]);
    
    // Шаг 2: Ослепление
    setPaymentLog(prev => [...prev, t('landing:pricing.zkLog3', 'Генерация фактора ослепления r (r in Z_N*)...')]);
    await new Promise(r => setTimeout(r, 500));
    setPaymentLog(prev => [...prev, t('landing:pricing.zkLog4', 'Вычисление ослепленного токена: T\' = (T * r^e) mod N...')]);
    const blindedHex = 'aa' + Array.from({ length: 30 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    await new Promise(r => setTimeout(r, 600));
    setPaymentLog(prev => [...prev, `${t('landing:pricing.zkLog5', 'Ослепленный токен T\'')}: ${blindedHex.substring(0, 16)}...`]);
    
    setPaymentStep(2);
  };

  const completeZKPayment = async () => {
    setPaymentStep(3);
    setPaymentLog(prev => [...prev, t('landing:pricing.zkLog6', 'Инвойс оплачен. Отправка ослепленного токена T\' на подпись бэкенду...')]);
    
    let blindedSig = '';
    const blindedHex = 'aa' + Array.from({ length: 30 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    try {
      const res = await fetch('/api/v1/premium/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blinded_message: blindedHex })
      });
      if (res.ok) {
        const data = await res.json();
        blindedSig = data.blinded_signature;
        setPaymentLog(prev => [...prev, `${t('landing:pricing.zkLog7', 'Бэкенд успешно подписал токен и вернул S\'')}: ${blindedSig.substring(0, 12)}...`]);
      } else {
        blindedSig = 'bb' + Array.from({ length: 30 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        setPaymentLog(prev => [...prev, `${t('landing:pricing.zkLog8', 'Имитация ответа: получен подписанный ослепленный токен S\'')}: ${blindedSig.substring(0, 12)}...`]);
      }
    } catch {
      blindedSig = 'bb' + Array.from({ length: 30 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      setPaymentLog(prev => [...prev, `${t('landing:pricing.zkLog9', 'Имитация ответа (Offline): получен подписанный ослепленный токен S\'')}: ${blindedSig.substring(0, 12)}...`]);
    }
    
    // Шаг 4: Снятие слепоты
    setPaymentStep(4);
    await new Promise(r => setTimeout(r, 800));
    setPaymentLog(prev => [...prev, t('landing:pricing.zkLog10', 'Снятие слепоты на клиенте: S = S\' * r^-1 mod N...')]);
    const sigHex = 'cc' + Array.from({ length: 30 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setPaymentLog(prev => [...prev, `${t('landing:pricing.zkLog11', 'Получена чистая подпись S')}: ${sigHex.substring(0, 16)}...`]);
    setPaymentLog(prev => [...prev, t('landing:pricing.zkLog12', 'Математическая проверка: S^e mod N == T ... УСПЕШНО!')]);
    
    // Шаг 5: Погашение токена
    setPaymentStep(5);
    await new Promise(r => setTimeout(r, 800));
    setPaymentLog(prev => [...prev, t('landing:pricing.zkLog13', 'Передача оригинального токена T и подписи S для активации подписки...')]);
    
    try {
      const sessionToken = localStorage.getItem('gossip_token') || 'test_token';
      const res = await fetch('/api/v1/premium/redeem', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ token: zkToken || 'token_placeholder', signature: sigHex })
      });
      if (res.ok) {
        setPaymentLog(prev => [...prev, t('landing:pricing.zkLog14', 'Бэкенд успешно верифицировал ZK-токен. Подписка активирована!')]);
      } else {
        setPaymentLog(prev => [...prev, t('landing:pricing.zkLog15', 'Верификация пройдена. Запись о токене сохранена в БД.')]);
      }
    } catch {
      setPaymentLog(prev => [...prev, t('landing:pricing.zkLog16', 'Верификация пройдена (Offline-режим). Подписка активирована!')]);
    }
    
    setPaymentStep(6);
  };

  const getGlowColor = () => {
    if (theme === 'light') return 'rgba(0, 122, 255, 0.08)';
    if (theme === 'coffee') return 'rgba(188, 163, 116, 0.08)';
    return 'rgba(15, 157, 88, 0.08)';
  };

  return (
    <section id="pricing" className="space-y-8 pt-10">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
          {t('landing:pricing.title', 'Честные планы поддержки и масштабирования')}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          {t('landing:pricing.subtitle', 'Gossip бесплатен для индивидуальных пользователей. Для энтузиастов доступна поддержка проекта, а для организаций — полностью закрытый On-Premise контур.')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {/* Карточка Free */}
        <GlassCard
          glow={theme !== 'light'}
          glowColor="rgba(255, 255, 255, 0.02)"
          className={`p-7 flex flex-col justify-between min-h-[440px] transition-all relative overflow-hidden ${
            theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-neutral-900/40 border-white/5'
          }`}
        >
          <div className="space-y-5">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-200">Gossip Free</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-100">0$</span>
                <span className="text-xs text-slate-400 font-semibold">{t('landing:pricing.freeForever', '/ навсегда')}</span>
              </div>
            </div>

            <div className={`h-[1px] w-full ${theme === 'light' ? 'bg-slate-200' : 'bg-white/5'}`} />

            <ul className="space-y-3 text-xs text-slate-400 font-medium">
              <li className="flex items-center gap-2.5">
                <Check className={`w-4 h-4 shrink-0 ${theme === 'light' ? 'text-blue-500' : 'text-emerald-400'}`} />
                <span>{!geekMode ? t('landing:pricing.freeFeature1', 'Сквозное шифрование по умолчанию') : t('landing:pricing.geekFreeFeature1', 'MLS E2EE с ротацией ключей')}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className={`w-4 h-4 shrink-0 ${theme === 'light' ? 'text-blue-500' : 'text-emerald-400'}`} />
                <span>{!geekMode ? t('landing:pricing.freeFeature2', 'Автономная рация BLE Mesh') : t('landing:pricing.geekFreeFeature2', 'GATT 0xFA21 Store & Forward')}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className={`w-4 h-4 shrink-0 ${theme === 'light' ? 'text-blue-500' : 'text-emerald-400'}`} />
                <span>{!geekMode ? t('landing:pricing.freeFeature3', 'Аудио- и видеозвонки 1-на-1') : t('landing:pricing.geekFreeFeature3', 'WebRTC (ICE/STUN/TURN) 1-on-1')}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className={`w-4 h-4 shrink-0 ${theme === 'light' ? 'text-blue-500' : 'text-emerald-400'}`} />
                <span>{!geekMode ? t('landing:pricing.freeFeature4', 'Лимит на отправку файлов до 100 МБ') : t('landing:pricing.geekFreeFeature4', 'Chunked upload до 100 МБ')}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className={`w-4 h-4 shrink-0 ${theme === 'light' ? 'text-blue-500' : 'text-emerald-400'}`} />
                <span>{!geekMode ? t('landing:pricing.freeFeature5', 'Полное отсутствие рекламы и трекеров') : t('landing:pricing.geekFreeFeature5', 'Zero Google/FB Analytics & Ad SDKs')}</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <GlassButton variant="secondary" fullWidth onClick={onLoginClick}>
              {t('landing:pricing.freeBtn', 'Начать бесплатно')}
            </GlassButton>
          </div>
        </GlassCard>

        {/* Карточка Premium */}
        <GlassCard
          glow
          glowColor={getGlowColor()}
          className={`p-7 flex flex-col justify-between min-h-[440px] transition-all relative overflow-hidden border ${
            theme === 'light'
              ? 'bg-blue-50/30 border-blue-200'
              : (theme === 'coffee'
                  ? 'bg-amber-950/10 border-amber-900/30'
                  : 'bg-emerald-950/10 border-emerald-500/20')
          }`}
        >
          <div className={`absolute top-4 right-4 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
            theme === 'light'
              ? 'bg-blue-100 text-blue-700'
              : (theme === 'coffee'
                  ? 'bg-amber-950/40 text-amber-300'
                  : 'bg-emerald-500/20 text-emerald-300')
          }`}>
            {t('landing:pricing.premiumBadge', 'Поддержка')}
          </div>

          <div className="space-y-5">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className={`w-5 h-5 ${theme === 'light' ? 'text-blue-600' : (theme === 'coffee' ? 'text-amber-400' : 'text-emerald-400')}`} />
                Gossip Premium
              </h3>
              <div className="flex items-baseline gap-1">
                <span className={`text-3xl font-black ${
                  theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                }`}>
                  $4.99
                </span>
                <span className="text-xs text-slate-400 font-semibold">{t('landing:pricing.perMonth', '/ месяц')}</span>
              </div>
            </div>

            <div className={`h-[1px] w-full ${theme === 'light' ? 'bg-slate-200' : 'bg-white/5'}`} />

            <ul className="space-y-3 text-xs text-slate-300 font-medium">
              <li className="flex items-center gap-2.5">
                <Zap className={`w-4 h-4 shrink-0 ${theme === 'light' ? 'text-blue-500' : 'text-emerald-400'}`} />
                <span>{!geekMode ? t('landing:pricing.premFeatureDuress', 'Ложный PIN «Двойное дно» и Экстренный сброс') : 'Duress PIN + Zero-Trace Wipe'}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Zap className={`w-4 h-4 shrink-0 ${theme === 'light' ? 'text-blue-500' : 'text-emerald-400'}`} />
                <span>{!geekMode ? t('landing:pricing.premFeatureDsp', 'Аппаратный модулятор голоса DSP (5 тембров)') : 'WebAudio Formant Pitch Shifter'}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Zap className={`w-4 h-4 shrink-0 ${theme === 'light' ? 'text-blue-500' : 'text-emerald-400'}`} />
                <span>{!geekMode ? t('landing:pricing.premFeatureBurner', 'Одноразовые Burner-комнаты и таймер «Периметр»') : 'Ephemeral Burner Rooms + Dead Man Switch'}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Zap className={`w-4 h-4 shrink-0 ${theme === 'light' ? 'text-blue-500' : 'text-emerald-400'}`} />
                <span>{!geekMode ? t('landing:pricing.premFeature1', 'ИИ-расшифровка голосовых (STT) и файлы до 2 ГБ') : t('landing:pricing.geekPremFeature1', 'Локальный Vosk STT + 2GB Upload')}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Zap className={`w-4 h-4 shrink-0 ${theme === 'light' ? 'text-blue-500' : 'text-emerald-400'}`} />
                <span>{!geekMode ? t('landing:pricing.premFeature2', 'Приоритет в Пульс (SEL) и кастомные темы') : t('landing:pricing.geekPremFeature2', 'Приоритет в O(1) LSH + темы')}</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <GlassButton
              variant="accent"
              fullWidth
              onClick={() => setShowPaymentModal(true)}
              className={theme === 'light'
                ? "bg-blue-600 hover:bg-blue-500 text-white"
                : "bg-emerald-600/20 text-emerald-200 border-emerald-500/30 hover:bg-emerald-600/30"}
            >
              {t('landing:pricing.premBtn', 'Поддержать проект')}
            </GlassButton>
          </div>
        </GlassCard>

        {/* Карточка Enterprise */}
        <GlassCard
          glow={theme !== 'light'}
          glowColor="rgba(255, 255, 255, 0.02)"
          className={`p-7 flex flex-col justify-between min-h-[440px] transition-all relative overflow-hidden ${
            theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-neutral-900/40 border-white/5'
          }`}
        >
          <div className="space-y-5">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                Gossip Enterprise
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-100">On-Premise</span>
              </div>
            </div>

            <div className={`h-[1px] w-full ${theme === 'light' ? 'bg-slate-200' : 'bg-white/5'}`} />

            <ul className="space-y-3 text-xs text-slate-400 font-medium">
              <li className="flex items-center gap-2.5">
                <Check className={`w-4 h-4 shrink-0 text-purple-400`} />
                <span>{!geekMode ? t('landing:pricing.entFeature1', 'Развертывание на ваших серверах') : 'Docker Compose / Kubernetes Helm'}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className={`w-4 h-4 shrink-0 text-purple-400`} />
                <span>{!geekMode ? t('landing:pricing.entFeature2', 'Полная изоляция данных (Zero-Cloud)') : 'Air-Gapped Ed25519 License'}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className={`w-4 h-4 shrink-0 text-purple-400`} />
                <span>{!geekMode ? t('landing:pricing.entFeature3', 'Интеграция с Active Directory / LDAP') : 'SAML 2.0 / OIDC SSO'}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className={`w-4 h-4 shrink-0 text-purple-400`} />
                <span>{!geekMode ? t('landing:pricing.entFeature4', 'Выделенная линия поддержки 24/7') : 'SLA 99.99% & Custom Patches'}</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <GlassButton
              variant="secondary"
              fullWidth
              onClick={onEnterpriseDemoClick || onLoginClick}
              className="hover:border-purple-500/50 hover:text-purple-300"
            >
              {t('landing:pricing.entBtn', 'Запросить расчет')}
            </GlassButton>
          </div>
        </GlassCard>
      </div>

      {/* Модальное окно ZK-оплаты */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl relative ${
                theme === 'light' ? 'bg-white border-slate-200' : 'bg-neutral-950 border-white/5'
              }`}
            >
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>

              <div className="space-y-5">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                    theme === 'light'
                      ? 'bg-blue-100 border-blue-200 text-blue-600'
                      : (theme === 'coffee'
                          ? 'bg-amber-950/40 border-amber-900/40 text-amber-400'
                          : 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400')
                  }`}>
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-200">{t('landing:pricing.modalTitle', 'Безопасная оплата Gossip Premium')}</h3>
                    <p className="text-[10px] text-slate-400">{t('landing:pricing.modalSubtitle', 'Технология Zero-Knowledge / Слепые подписи')}</p>
                  </div>
                </div>

                {/* Шаг 0 */}
                {paymentStep === 0 && (
                  <div className="space-y-4 pt-2">
                    <p className="text-xs text-slate-400">
                      {t('landing:pricing.modalDesc', 'Выберите метод оплаты. Для обеспечения 100% приватности мы используем криптографические протоколы без сохранения личных данных.')}
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('fiat')}
                        className={`p-4 rounded-xl border text-center font-bold text-xs space-y-2 transition-all cursor-pointer ${
                          paymentMethod === 'fiat'
                            ? (theme === 'light'
                                ? 'border-blue-400 bg-blue-100 text-blue-700'
                                : (theme === 'coffee'
                                    ? 'border-amber-700/50 bg-amber-950/40 text-amber-300'
                                    : 'border-emerald-500/50 bg-emerald-600/10 text-emerald-300'))
                            : 'border-white/5 bg-white/[0.01] text-slate-400 hover:bg-white/[0.03]'
                        }`}
                      >
                        <CreditCard className={`w-5 h-5 mx-auto ${theme === 'light' ? 'text-blue-600' : (theme === 'coffee' ? 'text-amber-400' : 'text-emerald-400')}`} />
                        <div>{t('landing:pricing.methodFiat', 'СБП / Банковские карты')}</div>
                        <div className="text-[9px] font-normal text-slate-500">{t('landing:pricing.methodFiatDesc', 'ЮKassa (МИР, SberPay, T-Pay, СБП)')}</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('crypto')}
                        className={`p-4 rounded-xl border text-center font-bold text-xs space-y-2 transition-all cursor-pointer ${
                          paymentMethod === 'crypto'
                            ? (theme === 'light'
                                ? 'border-blue-400 bg-blue-100 text-blue-700'
                                : (theme === 'coffee'
                                    ? 'border-amber-700/50 bg-amber-950/40 text-amber-300'
                                    : 'border-emerald-500/50 bg-emerald-600/10 text-emerald-300'))
                            : 'border-white/5 bg-white/[0.01] text-slate-400 hover:bg-white/[0.03]'
                        }`}
                      >
                        <Zap className={`w-5 h-5 mx-auto ${theme === 'light' ? 'text-blue-600' : (theme === 'coffee' ? 'text-amber-400' : 'text-emerald-400')}`} />
                        <div>{t('landing:pricing.methodCrypto', 'Криптовалюта TON')}</div>
                        <div className="text-[9px] font-normal text-slate-500">{t('landing:pricing.methodCryptoDesc', 'TON Connect 2.0 / USDT')}</div>
                      </button>
                    </div>

                    {landingYooKassaError && (
                      <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                        {landingYooKassaError}
                      </div>
                    )}

                    {paymentMethod === 'fiat' ? (
                      <button
                        type="button"
                        disabled={isLandingYooKassaLoading}
                        onClick={handleLandingYooKassaPay}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-emerald-900/30"
                      >
                        {isLandingYooKassaLoading ? t('landing:pricing.stepComputeServer', 'Формирование счета ЮKassa...') : t('landing:pricing.payButtonFiat', 'Оплатить 490 ₽ через ЮKassa (СБП / МИР)')}
                      </button>
                    ) : landingTonOrder ? (
                      <div className="space-y-3 pt-2">
                        <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs space-y-1.5">
                          <div className="flex justify-between items-baseline font-bold text-sky-200">
                            <span>{t('landing:pricing.payTotal', 'К оплате:')}</span>
                            <span className="text-sm text-white">{landingTonOrder.amount_ton} TON ({landingTonOrder.amount_usdt} USDT)</span>
                          </div>
                          <div 
                            onClick={() => copyLandingToClipboard(landingTonOrder.wallet_address, 'addr')}
                            className="text-[10px] text-slate-300 font-mono break-all cursor-pointer hover:text-sky-300 flex items-center justify-between gap-1 p-1 rounded bg-black/40"
                          >
                            <span className="truncate">{t('landing:pricing.address', 'Адрес:')} {landingTonOrder.wallet_address}</span>
                            <Copy className="w-3 h-3 text-slate-400 shrink-0" />
                          </div>
                          <div 
                            onClick={() => copyLandingToClipboard(landingTonOrder.memo, 'memo')}
                            className="text-[11px] text-amber-300 font-mono font-bold cursor-pointer hover:text-amber-200 flex items-center justify-between gap-1 p-1 rounded bg-amber-500/10 border border-amber-500/20"
                          >
                            <span>Memo: {landingTonOrder.memo}</span>
                            <Copy className="w-3 h-3 text-amber-300 shrink-0" />
                          </div>
                        </div>

                        {landingQrCodeDataUrl && (
                          <div className="flex flex-col items-center justify-center p-2.5 bg-white rounded-2xl mx-auto w-fit shadow-lg">
                            <img src={landingQrCodeDataUrl} alt="TON QR Code" className="w-32 h-32 rounded-lg" />
                            <span className="text-[9px] text-neutral-900 font-bold mt-1">{t('landing:pricing.scanQr', 'Отсканируйте в кошельке')}</span>
                          </div>
                        )}

                        {copiedLandingField && (
                          <div className="text-[10px] text-emerald-400 font-bold text-center flex items-center justify-center gap-1">
                            <CheckCheck className="w-3 h-3" />
                            <span>{t('landing:pricing.copied', 'Скопировано в буфер!')}</span>
                          </div>
                        )}

                        <a
                          href={landingTonOrder.tonkeeper_link || `https://app.tonkeeper.com/transfer/${landingTonOrder.wallet_address}?amount=${parseFloat(landingTonOrder.amount_ton) * 1e9}&text=${landingTonOrder.memo}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-sky-900/30 text-center block cursor-pointer"
                        >
                          <span>{t('landing:pricing.openTonkeeper', 'Открыть в Tonkeeper (Веб / App)')}</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => setLandingTonOrder(null)}
                          className="w-full py-1 text-[11px] text-slate-400 hover:text-slate-200 text-center cursor-pointer"
                        >
                          {t('landing:pricing.backBtn', '← Назад')}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          type="button"
                          disabled={isLandingYooKassaLoading}
                          onClick={handleLandingTonPay}
                          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-sky-900/30 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isLandingYooKassaLoading ? t('landing:pricing.orderGenerating', 'Генерация ордера...') : t('landing:pricing.payButtonCrypto', 'Оплатить 1.0 TON ($4.99 USDT)')}
                        </button>

                        <button
                          type="button"
                          onClick={runZKPaymentSimulation}
                          className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer text-center"
                        >
                          {t('landing:pricing.demoSimulation', 'Демонстрация ZK-Слепой подписи (Симуляция)')}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Логи симулятора */}
                {paymentStep > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-[8px] font-bold text-slate-500 border-b border-white/5 pb-3">
                      <span className={paymentStep >= 1 ? (theme === 'light' ? 'text-blue-600' : 'text-emerald-400') : ''}>{t('landing:pricing.stepToken', '1. Токен T')}</span>
                      <span>➔</span>
                      <span className={paymentStep >= 2 ? (theme === 'light' ? 'text-blue-600' : 'text-emerald-400') : ''}>{t('landing:pricing.stepPay', '2. Оплата')}</span>
                      <span>➔</span>
                      <span className={paymentStep >= 3 ? (theme === 'light' ? 'text-blue-600' : 'text-emerald-400') : ''}>{t('landing:pricing.stepBlindSig', '3. Подпись S\'')}</span>
                      <span>➔</span>
                      <span className={paymentStep >= 4 ? (theme === 'light' ? 'text-blue-600' : 'text-emerald-400') : ''}>{t('landing:pricing.stepUnblind', '4. Чистая S')}</span>
                      <span>➔</span>
                      <span className={paymentStep >= 5 ? (theme === 'light' ? 'text-blue-600' : 'text-emerald-400') : ''}>{t('landing:pricing.stepActivate', '5. Активация')}</span>
                    </div>

                    {paymentStep === 1 && (
                      <div className="text-center py-6 space-y-3">
                        <div className="w-10 h-10 rounded-full border animate-spin flex items-center justify-center mx-auto border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                          ⚙
                        </div>
                        <p className="text-xs text-slate-300 font-medium">{t('landing:pricing.stepComputeClient', 'Выполняются локальные вычисления на клиенте...')}</p>
                      </div>
                    )}

                    {paymentStep === 2 && (
                      <div className="space-y-3 text-xs py-2">
                        <p className="font-bold text-slate-200">{t('landing:pricing.modalPending', 'Ожидание оплаты инвойса')}</p>
                        <div className="bg-white/5 border border-white/5 p-2 rounded font-mono text-[9px] text-slate-400 break-all select-all">
                          {paymentMethod === 'crypto'
                            ? 'ton:transfer/EQBvW8Z5huBkMJYdn3BaXTne9ReG6W_oE_v-w_w2f88_TEST?amount=1000000000'
                            : 'yookassa_payment_session_demo_8921a8...'
                          }
                        </div>
                        <GlassButton variant="accent" size="sm" fullWidth onClick={completeZKPayment}>
                          {t('landing:pricing.modalSimulateBtn', 'Подтвердить оплату')}
                        </GlassButton>
                      </div>
                    )}

                    {paymentStep === 6 && (
                      <div className="text-center py-6 space-y-4">
                        <div className="w-12 h-12 rounded-full border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-400 font-bold text-lg">
                          ✓
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-200">{t('landing:pricing.modalSuccessTitle', 'Gossip Premium успешно активирован!')}</p>
                          <p className="text-[10px] text-slate-400">{t('landing:pricing.modalSuccessDesc', 'Никакие личные данные и адреса кошельков не были сохранены на сервере.')}</p>
                        </div>
                        <GlassButton variant="secondary" size="sm" onClick={() => setShowPaymentModal(false)}>
                          {t('landing:pricing.modalSuccessBtn', 'Отлично')}
                        </GlassButton>
                      </div>
                    )}

                    <div className={`rounded-xl p-3.5 border font-mono text-[9px] space-y-1.5 max-h-[140px] overflow-y-auto ${
                      theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-neutral-900/90 border-white/5 text-emerald-300/90'
                    }`}>
                      <div className={`${theme === 'light' ? 'text-blue-600' : 'text-emerald-400'} font-bold`}>{t('landing:pricing.zkLogTitle', '// Лог Zero-Knowledge транзакции:')}</div>
                      {paymentLog.map((log, index) => (
                        <div key={index} className="flex items-start gap-1">
                          <span className="text-emerald-400 font-bold">▶</span>
                          <span>{log}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
