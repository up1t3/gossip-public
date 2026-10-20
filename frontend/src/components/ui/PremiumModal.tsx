// frontend/src/components/ui/PremiumModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Crown, 
  Sparkles, 
  Pin, 
  Mic, 
  FolderPlus, 
  Zap, 
  Flame,
  CreditCard,
  ShieldCheck,
  Loader2,
  Copy,
  CheckCheck,
  ExternalLink,
  Coins,
  QrCode,
  KeyRound,
  AudioWaveform,
  Timer
} from 'lucide-react';
import QRCode from 'qrcode';
import { getBackendUrl } from '../../utils/url';

export interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPremium: boolean;
  onPaymentSuccess?: () => void;
  onOpenSecurityArsenal?: () => void;
  theme?: 'dark' | 'light' | 'coffee';
}

const PREMIUM_PERKS = [
  {
    icon: KeyRound,
    title: 'Ложный PIN («Двойное дно»)',
    desc: 'При принудительной разблокировке открывает безобидные чаты-приманки или мгновенно стирает локальные ключи.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/20'
  },
  {
    icon: AudioWaveform,
    title: 'DSP-модулятор голоса (Web Audio API)',
    desc: 'Изменение тембра голоса в реальном времени до шифрования: Аноним, Киберпанк, Радиостудия, Гелий.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20'
  },
  {
    icon: Timer,
    title: 'Автосброс при неактивности («Периметр»)',
    desc: 'Автоматическое уничтожение облачного сейфа ключей и переписки, если вы не выходите на связь 7–180 дней.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/20'
  },
  {
    icon: Flame,
    title: 'Одноразовые Burner-ссылки (Web-to-App)',
    desc: 'Самоуничтожающиеся E2EE-комнаты по ссылке для гостей без регистрации с кнопкой мгновенного сжигания.',
    color: 'text-orange-400',
    bg: 'bg-orange-500/20'
  },
  {
    icon: Pin,
    title: 'Неограниченные закрепления',
    desc: 'Закрепляйте сколько угодно важных сообщений и циклически переключайтесь между ними.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/20'
  },
  {
    icon: Mic,
    title: 'Безлимитная расшифровка AI Whisper',
    desc: 'Мгновенное распознавание любых голосовых и видео-сообщений без ограничений длины.',
    color: 'text-teal-400',
    bg: 'bg-teal-500/20'
  },
  {
    icon: FolderPlus,
    title: 'Расширенные папки чатов',
    desc: 'Создавайте до 20 кастомных папок с умной фильтрацией и закреплением до 100 чатов.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/20'
  },
  {
    icon: Zap,
    title: 'Турбо-загрузка файлов до 4 ГБ',
    desc: 'Максимальная скорость отдачи и скачивания зашифрованных медиа и документов.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/20'
  },
  {
    icon: Crown,
    title: 'Золотая звезда Premium ⭐',
    desc: 'Статусный значок рядом с вашим именем в списке чатов, профиле и сообщениях.',
    color: 'text-amber-300',
    bg: 'bg-amber-500/30'
  }
];

const PLANS = [
  {
    id: '1_month',
    title: '1 месяц',
    rubPrice: '490 ₽',
    tonPrice: '1.0 TON',
    usdtPrice: '$4.99 USDT',
    badge: null,
    period: '/ мес'
  },
  {
    id: '3_months',
    title: '3 месяца',
    rubPrice: '1 290 ₽',
    tonPrice: '2.6 TON',
    usdtPrice: '$12.90 USDT',
    badge: '-15%',
    period: '430 ₽ / мес'
  },
  {
    id: '1_year',
    title: '1 год',
    rubPrice: '3 990 ₽',
    tonPrice: '8.0 TON',
    usdtPrice: '$39.90 USDT',
    badge: 'Выгодно -35%',
    period: '332 ₽ / мес'
  }
];

export const PremiumModal: React.FC<PremiumModalProps> = ({
  isOpen,
  onClose,
  isPremium,
  onPaymentSuccess,
  onOpenSecurityArsenal,
  theme = 'dark',
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'1_month' | '3_months' | '1_year'>('1_month');
  const [paymentMethod, setPaymentMethod] = useState<'yookassa' | 'ton'>('yookassa');
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Стейты для TON оплаты
  const [tonOrder, setTonOrder] = useState<any | null>(null);
  const [isCheckingTon, setIsCheckingTon] = useState(false);
  const [copiedField, setCopiedField] = useState<'addr' | 'memo' | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const checkIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (tonOrder?.deep_link) {
      QRCode.toDataURL(tonOrder.deep_link, {
        margin: 1,
        width: 180,
        color: { dark: '#000000', light: '#ffffff' }
      }).then(setQrCodeDataUrl).catch(console.error);
    } else {
      setQrCodeDataUrl('');
    }
  }, [tonOrder]);

  useEffect(() => {
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleYooKassaCheckout = async () => {
    setIsLoadingPayment(true);
    setErrorMessage(null);
    try {
      const token = localStorage.getItem('token') || '';
      const origin = window.location.origin || '';
      const returnBase = origin.includes('localhost') || origin.startsWith('capacitor://')
        ? 'https://skuf-net.ru'
        : origin;
      const res = await fetch(getBackendUrl('/api/v1/payments/yookassa/create'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          plan: selectedPlan,
          return_url: `${returnBase}/?payment=success`
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Не удалось сформировать счет на оплату');
      }

      const data = await res.json();
      if (data.confirmation_url) {
        try {
          window.location.assign(data.confirmation_url);
        } catch {
          window.location.href = data.confirmation_url;
        }
      } else {
        throw new Error('Отсутствует ссылка на подтверждение платежа');
      }
    } catch (err: any) {
      console.error('[YooKassa] Checkout error:', err);
      setErrorMessage(err.message || 'Ошибка подключения к платежному шлюзу');
      setIsLoadingPayment(false);
    }
  };

  const handleTonCheckout = async () => {
    setIsLoadingPayment(true);
    setErrorMessage(null);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(getBackendUrl('/api/v1/payments/ton/create'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          plan: selectedPlan
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Не удалось сгенерировать крипто-заказ');
      }

      const data = await res.json();
      setTonOrder(data);
      setIsLoadingPayment(false);
      startTonPolling(data.order_id);
    } catch (err: any) {
      console.error('[TON] Checkout error:', err);
      setErrorMessage(err.message || 'Ошибка создания TON заказа');
      setIsLoadingPayment(false);
    }
  };

  const startTonPolling = (orderId: string) => {
    if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    setIsCheckingTon(true);
    checkIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(getBackendUrl(`/api/v1/payments/ton/check/${orderId}`));
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'succeeded' || data.paid) {
            clearInterval(checkIntervalRef.current);
            setIsCheckingTon(false);
            if (onPaymentSuccess) {
              onPaymentSuccess();
            }
            setTonOrder(null);
          }
        }
      } catch (e) {
        console.warn('[TON] Polling warning:', e);
      }
    }, 4000);
  };

  const copyToClipboard = (text: string, field: 'addr' | 'memo') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const currentPlan = PLANS.find(p => p.id === selectedPlan)!;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-lg rounded-3xl overflow-hidden flex flex-col bg-neutral-950/95 border border-purple-500/30 text-white shadow-[0_0_50px_rgba(168,85,247,0.25)] relative max-h-[92vh]"
        >
          {/* Фоновый градиент */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-purple-600/20 blur-[80px] pointer-events-none" />

          {/* Шапка модалки */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-wide">Gossip Premium</h3>
                <p className="text-[10px] text-slate-400">СБП, Карты РФ (ЮKassa) и Блокчейн TON</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
                onClose();
              }}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Контент модального окна */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 relative z-10">
            {/* Экран активного счета TON */}
            {tonOrder ? (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-center space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center mx-auto text-sky-300">
                    <Coins className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-sky-200">Оплата через TON / USDT</h3>
                  <div className="text-2xl font-black text-white">
                    {tonOrder.amount_ton} TON <span className="text-xs font-normal text-slate-400">({tonOrder.amount_usdt} USDT)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Отправьте точную сумму на адрес ниже с обязательным указанием комментария (Memo).
                  </p>
                </div>

                {/* QR код для сканирования камерой */}
                {qrCodeDataUrl && (
                  <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl mx-auto w-fit shadow-lg">
                    <img src={qrCodeDataUrl} alt="TON QR Code" className="w-36 h-36 rounded-lg" />
                    <span className="text-[10px] text-neutral-900 font-bold mt-1 flex items-center gap-1">
                      <QrCode className="w-3 h-3 text-sky-600" />
                      Отсканируйте в Tonkeeper или @wallet
                    </span>
                  </div>
                )}

                {/* Адрес кошелька */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium flex justify-between">
                    <span>Адрес получателя (TON):</span>
                    {copiedField === 'addr' && <span className="text-emerald-400 flex items-center gap-1"><CheckCheck className="w-3 h-3"/> Скопировано</span>}
                  </label>
                  <div 
                    onClick={() => copyToClipboard(tonOrder.wallet_address, 'addr')}
                    className="p-3 rounded-xl bg-black/50 border border-white/10 font-mono text-xs text-slate-200 break-all cursor-pointer hover:border-sky-400/50 transition-all flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{tonOrder.wallet_address}</span>
                    <Copy className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </div>
                </div>

                {/* Комментарий Memo */}
                <div className="space-y-1">
                  <label className="text-xs text-amber-300 font-bold flex justify-between">
                    <span>⚠️ Комментарий (Memo) — Обязательно:</span>
                    {copiedField === 'memo' && <span className="text-emerald-400 flex items-center gap-1"><CheckCheck className="w-3 h-3"/> Скопировано</span>}
                  </label>
                  <div 
                    onClick={() => copyToClipboard(tonOrder.memo, 'memo')}
                    className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 font-mono text-xs font-bold text-amber-200 cursor-pointer hover:border-amber-400 transition-all flex items-center justify-between gap-2"
                  >
                    <span>{tonOrder.memo}</span>
                    <Copy className="w-4 h-4 text-amber-300 flex-shrink-0" />
                  </div>
                </div>

                {/* Кнопка быстрого открытия в кошельке */}
                <div className="space-y-2 pt-1">
                  <a
                    href={tonOrder.tonkeeper_link || `https://app.tonkeeper.com/transfer/${tonOrder.wallet_address}?amount=${parseFloat(tonOrder.amount_ton) * 1e9}&text=${tonOrder.memo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-900/30 transition-all text-center block"
                  >
                    <span>🚀 Открыть в Tonkeeper (Веб / App)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href="https://t.me/wallet"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all text-center"
                    >
                      <span>📱 Telegram @wallet</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(tonOrder.deep_link, 'memo')}
                      className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Копировать ссылку</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
                      setTonOrder(null);
                    }}
                    className="w-full py-2 text-xs text-slate-400 hover:text-slate-200"
                  >
                    ← Выбрать другой способ оплаты
                  </button>
                </div>

                {isCheckingTon && (
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-1">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                    <span>Ожидание поступления транзакции в сети TON...</span>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="text-center mb-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-semibold mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Максимальные возможности мессенджера</span>
                  </div>
                  <h2 className="text-xl font-extrabold bg-gradient-to-r from-purple-300 via-pink-300 to-amber-300 bg-clip-text text-transparent">
                    Удвойте свою продуктивность
                  </h2>
                </div>

                {/* Выбор тарифа */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Выберите период подписки:</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {PLANS.map((plan) => {
                      const isSelected = selectedPlan === plan.id;
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setSelectedPlan(plan.id as any)}
                          className={`relative p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between min-h-[90px] ${
                            isSelected
                              ? 'bg-purple-600/20 border-purple-400 shadow-glass-sm text-white ring-1 ring-purple-400/40'
                              : 'bg-white/2 hover:bg-white/5 border-white/10 text-slate-300'
                          }`}
                        >
                          {plan.badge && (
                            <span className="absolute -top-2 px-1.5 py-0.5 rounded-md bg-amber-500 text-black text-[9px] font-extrabold tracking-tight">
                              {plan.badge}
                            </span>
                          )}
                          <span className="text-xs font-bold">{plan.title}</span>
                          <span className="text-sm font-extrabold text-amber-300 my-1">
                            {paymentMethod === 'ton' ? plan.tonPrice : plan.rubPrice}
                          </span>
                          <span className="text-[10px] text-slate-400">{plan.period}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Выбор способа оплаты (Табы) */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Способ оплаты:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('yookassa')}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        paymentMethod === 'yookassa'
                          ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300 ring-1 ring-emerald-400/30'
                          : 'bg-white/2 hover:bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-white">СБП / Карты РФ</div>
                        <div className="text-[9px] text-slate-400">ЮKassa (МИР, SberPay)</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('ton')}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        paymentMethod === 'ton'
                          ? 'bg-sky-500/15 border-sky-400/50 text-sky-300 ring-1 ring-sky-400/30'
                          : 'bg-white/2 hover:bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      <Coins className="w-4 h-4 text-sky-400 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-white">Блокчейн TON</div>
                        <div className="text-[9px] text-slate-400">Tonkeeper / @wallet / USDT</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Список преимуществ */}
                <div className="grid grid-cols-1 gap-2.5 pt-1">
                  {PREMIUM_PERKS.map((perk, i) => {
                    const Icon = perk.icon;
                    return (
                      <div
                        key={i}
                        className="p-3 rounded-2xl bg-white/2 hover:bg-white/5 border border-white/5 flex items-start gap-3 transition-all"
                      >
                        <div className={`w-8 h-8 rounded-xl ${perk.bg} ${perk.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-100">{perk.title}</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">{perk.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {errorMessage && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2.5">
                    <div className="leading-relaxed">⚠️ {errorMessage}</div>
                    {paymentMethod === 'yookassa' && (
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod('ton');
                          setErrorMessage(null);
                          handleTonCheckout();
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Coins className="w-3.5 h-3.5 text-sky-300" />
                        <span>Оплатить мгновенно через TON (Tonkeeper / @wallet)</span>
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Футер с кнопками оплаты */}
          {!tonOrder && (
            <div className="p-5 border-t border-white/5 bg-black/40 flex flex-col gap-3 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Текущий статус:</span>
                  <span className={`text-sm font-bold ${isPremium ? 'text-amber-300' : 'text-slate-300'}`}>
                    {isPremium ? '⭐ Активен (Gossip PRO)' : 'Базовый тариф'}
                  </span>
                </div>
                {isPremium && (
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Подписка активна
                  </span>
                )}
              </div>

              {onOpenSecurityArsenal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSecurityArsenal();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-600/25 hover:bg-purple-600/40 border border-purple-400/40 text-purple-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-amber-300" />
                  <span>Открыть Спец-арсенал (Ложный PIN, Голос DSP, Burner-ссылки, Периметр)</span>
                </button>
              )}

              {/* Главная кнопка оплаты */}
              {paymentMethod === 'yookassa' ? (
                <button
                  type="button"
                  disabled={isLoadingPayment}
                  onClick={handleYooKassaCheckout}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoadingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Формирование счета в ЮKassa...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>Оплатить {currentPlan.rubPrice} (СБП / Карты РФ / SberPay)</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isLoadingPayment}
                  onClick={handleTonCheckout}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 via-blue-600 to-sky-500 hover:from-sky-500 hover:to-blue-500 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-900/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoadingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Генерация ордера в блокчейне TON...</span>
                    </>
                  ) : (
                    <>
                      <Coins className="w-4 h-4" />
                      <span>Оплатить {currentPlan.tonPrice} через TON (Tonkeeper / @wallet)</span>
                    </>
                  )}
                </button>
              )}
              
              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Безопасная оплата без комиссий • Мгновенная активация</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
