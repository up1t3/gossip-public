import React, { useState, useEffect, useRef } from 'react';
import {
  Coins,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Wallet,
  AlertCircle
} from 'lucide-react';
import { tonConnectManager, formatFiatEquivalent } from './tonConnectManager';
import { TonInvoice } from './types';
import { getBackendUrl } from '../../utils/url';

export interface TonInvoiceCardProps {
  invoice: Partial<TonInvoice> & {
    invoice_id?: string;
    amount_ton?: string;
    amount_nanotons?: number | string;
    recipient_address?: string;
    expires_at?: string;
    tx_hash?: string;
    paid_at?: string;
  };
  theme?: 'dark' | 'light' | 'coffee';
  onPaidSuccess?: (invoice: TonInvoice) => void;
}

export const TonInvoiceCard: React.FC<TonInvoiceCardProps> = ({
  invoice: rawInvoice,
  theme = 'dark',
  onPaidSuccess,
}) => {
  // Нормализуем данные инвойса
  const invoiceId = rawInvoice.invoiceId || rawInvoice.invoice_id || 'inv_unknown';
  const title = rawInvoice.title || 'Счет на оплату';
  const description = rawInvoice.description || '';
  const amountTon = rawInvoice.amountTon || rawInvoice.amount_ton || '1.0';
  const currency = (rawInvoice.currency || 'TON') as 'TON' | 'USDT';
  const recipientAddress = rawInvoice.recipientAddress || rawInvoice.recipient_address || '';
  const memo = rawInvoice.memo || '';
  const statusStr = String(rawInvoice.status || 'pending');
  const initialStatus = statusStr === 'completed' || statusStr === 'paid' ? 'completed' : (rawInvoice.status || 'pending');

  const [status, setStatus] = useState<'pending' | 'completed' | 'expired' | 'canceled'>(initialStatus as any);
  const [txHash, setTxHash] = useState<string | undefined>(rawInvoice.txHash || rawInvoice.tx_hash);
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');
  const pollIntervalRef = useRef<any>(null);

  // Расчет оставшегося времени действия счета
  useEffect(() => {
    const expiresAtRaw = rawInvoice.expiresAt || rawInvoice.expires_at;
    if (!expiresAtRaw || status !== 'pending') return;

    const expiresTime = new Date(expiresAtRaw).getTime();

    const updateTimer = () => {
      const diff = expiresTime - Date.now();
      if (diff <= 0) {
        setStatus('expired');
        setTimeLeftStr('Срок действия истек');
        return;
      }
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeftStr(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [rawInvoice.expiresAt, rawInvoice.expires_at, status]);

  // Периодический опрос статуса инвойса через бэкенд API (/api/v1/payments/ton/invoice/{id}/status)
  useEffect(() => {
    if (status !== 'pending' || !invoiceId || invoiceId === 'inv_unknown') return;

    const checkStatus = async () => {
      try {
        const res = await fetch(getBackendUrl(`/api/v1/payments/ton/invoice/${encodeURIComponent(invoiceId)}/status`), {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'completed' || data.status === 'paid') {
            setStatus('completed');
            if (data.tx_hash) setTxHash(data.tx_hash);
            if (onPaidSuccess) {
              onPaidSuccess({
                invoiceId,
                title,
                description,
                amountTon,
                amountNanotons: data.amount_nanotons || '0',
                currency,
                recipientAddress,
                memo,
                status: 'completed',
                txHash: data.tx_hash,
                createdAt: data.created_at || new Date().toISOString(),
                paidAt: data.paid_at || new Date().toISOString(),
              });
            }
          } else if (data.status === 'expired' || data.status === 'canceled') {
            setStatus(data.status);
          }
        }
      } catch (e) {
        // Игнорируем временные сетевые ошибки
      }
    };

    pollIntervalRef.current = setInterval(checkStatus, 4000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [status, invoiceId, title, description, amountTon, currency, recipientAddress, memo, onPaidSuccess]);

  // Оплата инвойса в 1 клик через TON Connect
  const handlePayInvoice = async () => {
    setIsPaying(true);
    setPayError(null);
    try {
      // 1. Проверяем или подключаем кошелек
      let currentWallet = tonConnectManager.getConnectedWallet();
      if (!currentWallet) {
        currentWallet = await tonConnectManager.connectWallet('tonkeeper');
      }

      if (!recipientAddress) {
        throw new Error('Адрес кошелька получателя не указан в инвойсе');
      }

      // 2. Отправляем транзакцию через кошелек
      let paidTxHash = '';
      if (currency === 'TON') {
        const res = await tonConnectManager.sendTonTransaction({
          recipientAddress,
          amountTon,
          memo,
        });
        paidTxHash = res.txHash;
      } else {
        const res = await tonConnectManager.sendUsdtJettonTransaction({
          recipientAddress,
          amountUsdt: amountTon,
          memo,
        });
        paidTxHash = res.txHash;
      }

      setTxHash(paidTxHash);

      // 3. Отправляем запрос верификации на бэкенд (POST /api/v1/payments/ton/invoice/{id}/verify)
      try {
        await fetch(getBackendUrl(`/api/v1/payments/ton/invoice/${encodeURIComponent(invoiceId)}/verify`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tx_hash: paidTxHash }),
        }).catch(() => {});
      } catch (beErr) {
        console.warn('[TonInvoiceCard] Верификация бэкенда:', beErr);
      }

      setStatus('completed');

      if (onPaidSuccess) {
        onPaidSuccess({
          invoiceId,
          title,
          description,
          amountTon,
          amountNanotons: '0',
          currency,
          recipientAddress,
          memo,
          status: 'completed',
          txHash: paidTxHash,
          createdAt: new Date().toISOString(),
          paidAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      console.error('[TonInvoiceCard] Ошибка оплаты счета:', err);
      setPayError(err.message || 'Ошибка оплаты инвойса');
    } finally {
      setIsPaying(false);
    }
  };

  const rates = tonConnectManager.getRates();
  const rateVal = currency === 'TON' ? rates.tonUsd : rates.usdtUsd;
  const rubRateVal = currency === 'TON' ? rates.tonRub : rates.usdtRub;
  const usdEquiv = formatFiatEquivalent(amountTon || '0', rateVal, 2);
  const rubEquiv = formatFiatEquivalent(amountTon || '0', rubRateVal, 0);

  return (
    <div
      data-testid="ton-invoice-card"
      className="flex flex-col gap-2.5 p-3.5 my-1 rounded-2xl bg-gradient-to-br from-slate-900/90 via-purple-950/30 to-black/90 border border-purple-500/25 shadow-glass-md backdrop-blur-xl w-full max-w-sm select-none"
    >
      {/* Шапка инвойса с иконкой и статусом */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
            Счет на оплату TON
          </span>
        </div>

        {/* Статус-бейдж */}
        {status === 'completed' ? (
          <div className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full text-[10px] font-semibold">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Оплачен</span>
          </div>
        ) : status === 'expired' ? (
          <div className="flex items-center gap-1 bg-slate-500/20 text-slate-400 border border-slate-400/30 px-2 py-0.5 rounded-full text-[10px] font-semibold">
            <Clock className="w-3 h-3" />
            <span>Истек</span>
          </div>
        ) : status === 'canceled' ? (
          <div className="flex items-center gap-1 bg-rose-500/20 text-rose-300 border border-rose-400/30 px-2 py-0.5 rounded-full text-[10px] font-semibold">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>Отменен</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full text-[10px] font-semibold animate-pulse">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>{timeLeftStr ? `Истекает: ${timeLeftStr}` : 'Ожидает оплаты'}</span>
          </div>
        )}
      </div>

      {/* Название и описание */}
      <div className="flex flex-col">
        <h4 className="text-sm font-bold text-white leading-snug">{title}</h4>
        {description && (
          <p className="text-xs text-slate-400 line-clamp-2 mt-0.5 leading-normal">{description}</p>
        )}
      </div>

      {/* Сумма к оплате */}
      <div className="flex items-baseline justify-between p-2.5 rounded-xl bg-black/40 border border-white/5">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400">К оплате:</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg font-bold text-white font-mono">{amountTon}</span>
            <span className="text-xs font-semibold text-purple-300">{currency}</span>
          </div>
        </div>
        <span className="text-[11px] text-slate-400">
          ≈ ${usdEquiv} USD ({rubEquiv} ₽)
        </span>
      </div>

      {/* Блок подтверждения при оплате */}
      {status === 'completed' && txHash && (
        <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-[11px]">
          <span className="text-emerald-300 font-medium">Подтверждено в сети TON:</span>
          <a
            href={`https://tonviewer.com/transaction/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-400 hover:underline font-mono flex items-center gap-1"
          >
            <span>{txHash.slice(0, 8)}...</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Сообщение об ошибке оплаты */}
      {payError && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{payError}</span>
        </div>
      )}

      {/* Кнопка оплаты */}
      {status === 'pending' && (
        <button
          type="button"
          disabled={isPaying}
          onClick={handlePayInvoice}
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:scale-98 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-purple-900/30 cursor-pointer border border-purple-400/30"
        >
          {isPaying ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Подтверждение в кошельке...</span>
            </>
          ) : (
            <>
              <Wallet className="w-3.5 h-3.5" />
              <span>Оплатить через TON Connect ({amountTon} {currency})</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default TonInvoiceCard;
