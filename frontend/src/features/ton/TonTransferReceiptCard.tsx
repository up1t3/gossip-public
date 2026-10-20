import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Clock
} from 'lucide-react';
import { TonTransferReceipt } from './types';
import { tonConnectManager, formatFiatEquivalent } from './tonConnectManager';

export interface TonTransferReceiptCardProps {
  receipt: Partial<TonTransferReceipt> & {
    amount_ton?: string;
    tx_hash?: string;
    sender_id?: string;
    recipient_id?: string;
    sender_address?: string;
    recipient_address?: string;
    created_at?: string;
  };
  isMyMessage?: boolean;
  theme?: 'dark' | 'light' | 'coffee';
}

export const TonTransferReceiptCard: React.FC<TonTransferReceiptCardProps> = ({
  receipt,
  isMyMessage = false,
}) => {
  const amount = receipt.amountTon || receipt.amount_ton || '0.0';
  const currency = (receipt.currency || 'TON') as 'TON' | 'USDT';
  const initialTxHash = receipt.txHash || receipt.tx_hash || '';
  const memo = receipt.memo || '';
  const recipientAddress = receipt.recipientAddress || receipt.recipient_address || '';
  const senderAddress = receipt.senderAddress || receipt.sender_address || '';

  const [txHash, setTxHash] = useState(initialTxHash);
  const [isVerifying, setIsVerifying] = useState(false);
  const [onChainVerified, setOnChainVerified] = useState<boolean>(
    Boolean(initialTxHash && !initialTxHash.startsWith('ton_tx_') && !initialTxHash.startsWith('usdt_tx_'))
  );
  const [verifyNote, setVerifyNote] = useState<string | null>(null);

  const rates = tonConnectManager.getRates();
  const rateVal = currency === 'TON' ? rates.tonUsd : rates.usdtUsd;
  const rubRateVal = currency === 'TON' ? rates.tonRub : rates.usdtRub;
  const usdEquiv = formatFiatEquivalent(amount || '0', rateVal, 2);
  const rubEquiv = formatFiatEquivalent(amount || '0', rubRateVal, 0);

  const isSyntheticTxHash = txHash.startsWith('ton_tx_') || txHash.startsWith('usdt_tx_');
  const explorerUrl = !isSyntheticTxHash && txHash
    ? `https://tonviewer.com/transaction/${encodeURIComponent(txHash)}`
    : recipientAddress
    ? `https://tonviewer.com/${encodeURIComponent(recipientAddress)}`
    : senderAddress
    ? `https://tonviewer.com/${encodeURIComponent(senderAddress)}`
    : `https://tonviewer.com`;

  const handleVerifyOnChain = async () => {
    if (isVerifying) return;
    setIsVerifying(true);
    setVerifyNote(null);
    try {
      const res = await tonConnectManager.verifyP2PTransferOnChain({
        recipientAddress,
        amountTon: amount,
        currency,
        memo,
        txHash,
      });
      if (res.verified) {
        setOnChainVerified(true);
        if (res.txHash) setTxHash(res.txHash);
        setVerifyNote('Транзакция подтверждена в блокчейне TON ✓');
      } else {
        setVerifyNote('Ожидает подтверждения в блокчейне (проверьте подписание в кошельке)');
      }
    } catch {
      setVerifyNote('Не удалось связаться с узлом TON');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      data-testid="ton-transfer-receipt-card"
      className="flex flex-col gap-2 p-3 my-1 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-neutral-900/80 to-black/90 border border-emerald-500/30 shadow-glass-md backdrop-blur-xl w-full max-w-sm select-none"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
            isMyMessage ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
          }`}>
            {isMyMessage ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
          </div>
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
            {isMyMessage ? 'Исходящий криптоперевод' : 'Входящий криптоперевод'}
          </span>
        </div>

        <div className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full text-[10px] font-semibold">
          {onChainVerified ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Подтверждено</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Переведено</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-baseline justify-between p-2 rounded-xl bg-black/40 border border-white/5">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400">Сумма:</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-base font-bold text-white font-mono">{amount}</span>
            <span className="text-xs font-semibold text-emerald-300">{currency}</span>
          </div>
        </div>
        <span className="text-[10px] text-slate-400">
          ≈ ${usdEquiv} USD ({rubEquiv} ₽)
        </span>
      </div>

      {memo && (
        <p className="text-xs text-slate-300 italic px-1">
          «{memo}»
        </p>
      )}

      {verifyNote && (
        <div className="text-[10px] px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 flex items-center gap-1.5">
          {onChainVerified ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
          ) : (
            <Clock className="w-3 h-3 text-amber-400 shrink-0" />
          )}
          <span>{verifyNote}</span>
        </div>
      )}

      {txHash && (
        <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] gap-2">
          <span className="text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            Блокчейн The Open Network
          </span>
          <div className="flex items-center gap-2">
            {recipientAddress && !onChainVerified && (
              <button
                type="button"
                onClick={handleVerifyOnChain}
                disabled={isVerifying}
                className="text-emerald-300 hover:text-emerald-200 flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer"
                title="Проверить транзакцию в блокчейне TON"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${isVerifying ? 'animate-spin' : ''}`} />
                <span>Проверить</span>
              </button>
            )}
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline font-mono flex items-center gap-0.5"
            >
              <span>{txHash.slice(0, 8)}...</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default TonTransferReceiptCard;
