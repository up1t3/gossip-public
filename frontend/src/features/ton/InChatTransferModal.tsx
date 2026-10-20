import React, { useState, useEffect } from 'react';
import {
  Send,
  AlertCircle,
  Loader2,
  Sparkles,
  Wallet,
  ExternalLink,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { GlassModal } from '../../ui/GlassModal';
import { GlassButton } from '../../ui/GlassButton';
import { GlassInput } from '../../ui/GlassInput';
import {
  tonConnectManager,
  tonToNanotonsStr,
  usdtToMicroUnitsStr,
  openDeepLink,
  formatFiatEquivalent
} from './tonConnectManager';
import { ConnectedWallet, TonTransferReceipt } from './types';
import { validateTonAddress } from './tonAddressValidator';
import { TON_FEATURES_ENABLED } from './flags';
import { getBackendUrl } from '../../utils/url';


export interface InChatTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  recipientId: string;
  recipientName: string;
  recipientWalletAddress?: string;
  senderId?: string;
  theme?: 'dark' | 'light' | 'coffee';
  onSuccessTransfer?: (receipt: TonTransferReceipt) => void;
}

export const InChatTransferModal: React.FC<InChatTransferModalProps> = ({
  isOpen,
  onClose,
  chatId,
  recipientId,
  recipientName,
  recipientWalletAddress,
  senderId = 'me',
  theme = 'dark',
  onSuccessTransfer,
}) => {
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);
  const [asset, setAsset] = useState<'TON' | 'USDT'>('TON');
  const [amount, setAmount] = useState<string>('1.0');
  const [customAddress, setCustomAddress] = useState<string>(recipientWalletAddress || '');
  const [memo, setMemo] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Синхронизация состояния кошелька
  useEffect(() => {
    const unsub = tonConnectManager.onStatusChange((w) => {
      setWallet(w);
    });
    return () => unsub();
  }, []);

  // Генерация детерминированного уникального Memo при открытии
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (!memo) {
        const shortChat = chatId ? chatId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6) : 'p2p';
        const saltBytes = new Uint8Array(4);
        crypto.getRandomValues(saltBytes);
        const salt = Array.from(saltBytes).map(b => b.toString(36)).join('').slice(0, 5);
        setMemo(`gossip_p2p_${shortChat}_${salt}`);
      }
      if (recipientWalletAddress) {
        setCustomAddress(recipientWalletAddress);
      } else if (!customAddress) {
        setCustomAddress('');
      }
    }
  }, [isOpen, chatId, recipientId, recipientWalletAddress]);

  const handleConnectWallet = async () => {
    try {
      setIsConnecting(true);
      const connected = await tonConnectManager.connectWallet('tonkeeper');
      setWallet(connected);
    } catch (err: any) {
      setErrorMessage(err.message || 'Ошибка подключения кошелька');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleOpenDeepLinkWallet = async () => {
    try {
      const targetAddr = (customAddress || recipientWalletAddress || '').trim();
      if (!targetAddr) {
        setErrorMessage('Укажите адрес кошелька получателя');
        return;
      }
      const val = validateTonAddress(targetAddr);
      if (!val.isValid) {
        setErrorMessage(val.errorMessage || 'Некорректный адрес кошелька получателя');
        return;
      }
      const nanotons = asset === 'TON' ? tonToNanotonsStr(amount || '1.0') : usdtToMicroUnitsStr(amount || '1.0');
      const encodedMemo = encodeURIComponent(memo || '');
      const deepLink = `ton://transfer/${targetAddr}?amount=${nanotons}&text=${encodedMemo}`;
      const opened = await openDeepLink(deepLink);
      if (!opened) {
        const universalLink = `https://app.tonkeeper.com/transfer/${targetAddr}?amount=${nanotons}&text=${encodedMemo}`;
        await openDeepLink(universalLink);
      }
    } catch (err: any) {
      console.warn('[InChatTransfer] Ошибка открытия Deep Link:', err);
      setErrorMessage(err.message || 'Ошибка открытия Deep Link');
    }
  };

  const handleSendTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!wallet) {
      setErrorMessage('Сначала подключите кошелек TON Connect');
      return;
    }

    const targetAddr = (customAddress || recipientWalletAddress || '').trim();
    if (!targetAddr) {
      setErrorMessage('Укажите адрес кошелька получателя');
      return;
    }
    const val = validateTonAddress(targetAddr);
    if (!val.isValid) {
      setErrorMessage(val.errorMessage || 'Некорректный адрес кошелька получателя');
      return;
    }

    const numAmount = Number(amount);
    if (!amount.trim() || isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Введите корректную сумму перевода (больше 0)');
      return;
    }

    setIsSending(true);
    try {
      let txHash = '';
      if (asset === 'TON') {
        const result = await tonConnectManager.sendTonTransaction({
          recipientAddress: targetAddr,
          amountTon: amount.trim(),
          memo: memo.trim(),
        });
        txHash = result.txHash;
      } else {
        const result = await tonConnectManager.sendUsdtJettonTransaction({
          recipientAddress: targetAddr,
          amountUsdt: amount.trim(),
          memo: memo.trim(),
        });
        txHash = result.txHash;
      }

      // Формируем квитанцию перевода
      const amountNanotons = asset === 'TON' ? tonToNanotonsStr(amount) : usdtToMicroUnitsStr(amount);
      const randBytes = new Uint8Array(4);
      crypto.getRandomValues(randBytes);
      const randHex = Array.from(randBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      const receipt: TonTransferReceipt = {
        receiptId: `rcpt_${Date.now()}_${randHex}`,
        txHash,
        senderId,
        recipientId,
        chatId,
        amountTon: amount.trim(),
        amountNanotons,
        currency: asset,
        memo: memo.trim(),
        senderAddress: wallet.address,
        recipientAddress: targetAddr,
        status: 'completed',
        createdAt: new Date().toISOString(),
      };

      // Отправляем квитанцию на бэкенд (POST /api/v1/payments/ton/p2p/receipt)
      try {
        await fetch(getBackendUrl('/api/v1/payments/ton/p2p/receipt'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender_id: senderId,
            recipient_id: recipientId,
            chat_id: chatId,
            tx_hash: txHash,
            amount_ton: amount.trim(),
            currency: asset,
            memo: memo.trim(),
            sender_address: wallet.address,
            recipient_address: targetAddr,
          }),
        }).catch(() => {
          // Игнорируем сетевые ошибки, так как транзакция уже подписана в блокчейне
        });
      } catch (beErr) {
        console.warn('[InChatTransfer] Предупреждение бэкенда при регистрации квитанции:', beErr);
      }

      if (onSuccessTransfer) {
        onSuccessTransfer(receipt);
      }

      onClose();
    } catch (err: any) {
      console.error('[InChatTransfer] Ошибка отправки перевода:', err);
      setErrorMessage(err.message || 'Ошибка выполнения транзакции');
    } finally {
      setIsSending(false);
    }
  };

  const rates = tonConnectManager.getRates();
  const rateVal = asset === 'TON' ? rates.tonUsd : rates.usdtUsd;
  const rubRateVal = asset === 'TON' ? rates.tonRub : rates.usdtRub;
  const usdEstimate = formatFiatEquivalent(amount || '0', rateVal, 2);
  const rubEstimate = formatFiatEquivalent(amount || '0', rubRateVal, 0);

  if (!TON_FEATURES_ENABLED) {
    if (!isOpen) return null;
    return (
      <GlassModal isOpen={isOpen} onClose={onClose} title="💎 Перевод криптовалюты" size="md">
        <div className="flex flex-col items-center text-center gap-4 py-6 text-slate-200">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-slate-300 shadow-glass-md">
            <Wallet className="w-7 h-7" />
          </div>
          <div className="flex flex-col gap-1 max-w-sm">
            <h4 className="text-base font-bold text-white">Раздел на техобслуживании</h4>
            <p className="text-xs text-slate-300">
              Крипто-переводы временно отключены для технических работ. Следите за обновлениями.
            </p>
          </div>
          <GlassButton type="button" variant="secondary" onClick={onClose} className="px-6 py-2.5">
            Закрыть
          </GlassButton>
        </div>
      </GlassModal>
    );
  }

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title={`💎 Перевод криптовалюты: ${recipientName}`}
      size="md"
    >
      <div className="flex flex-col gap-4 text-slate-200">
        {!wallet ? (
          /* Окно подключения кошелька перед переводом */
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-glass-md">
              <Wallet className="w-7 h-7" />
            </div>
            <div className="flex flex-col gap-1 max-w-sm">
              <h4 className="text-base font-bold text-white">Подключите кошелек TON Connect</h4>
              <p className="text-xs text-slate-300">
                Для отправки прямого перевода собеседнику необходимо авторизовать некастодиальный кошелек.
              </p>
            </div>
            <GlassButton
              type="button"
              variant="accent"
              disabled={isConnecting}
              onClick={handleConnectWallet}
              className="w-full py-3 font-semibold flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Подключение...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Подключить Tonkeeper / Wallet</span>
                </>
              )}
            </GlassButton>
            <GlassButton
              type="button"
              variant="secondary"
              onClick={handleOpenDeepLinkWallet}
              className="w-full py-2.5 text-xs font-medium flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Оплатить напрямую через Deep Link (ton://)</span>
            </GlassButton>
          </div>
        ) : (
          /* Форма перевода */
          <form onSubmit={handleSendTransfer} className="flex flex-col gap-3">
            {/* Карточка получателя и подключенного кошелька */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-black/30 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 font-bold text-sm">
                  {recipientName.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-white">Получатель: {recipientName}</span>
                  <span className="text-[10px] text-slate-400 font-mono line-clamp-1">
                    {customAddress ? `${customAddress.slice(0, 10)}...${customAddress.slice(-6)}` : 'Адрес не указан'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-400">С кошелька:</span>
                <span className="text-xs font-mono text-blue-300 font-medium">{wallet.name}</span>
              </div>
            </div>

            {/* Ввод адреса получателя, если он не передан автоматически */}
            {!recipientWalletAddress && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300 font-medium">
                  Адрес кошелька получателя (UQ... / EQ... / 0:...):
                </label>
                <GlassInput
                  placeholder="UQ... или EQ..."
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                />
                {customAddress.trim() && (() => {
                  const val = validateTonAddress(customAddress.trim());
                  if (!val.isValid) {
                    return (
                      <span className="text-[10px] text-rose-400 flex items-center gap-1 mt-0.5">
                        <XCircle className="w-3 h-3 flex-shrink-0" />
                        <span>{val.errorMessage}</span>
                      </span>
                    );
                  }
                  return (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                      <span>✓ Валидный адрес TON ({val.type === 'raw' ? 'Raw Hex' : val.isBounceable ? 'Bounceable / EQ...' : 'Non-bounceable / UQ...'})</span>
                    </span>
                  );
                })()}
              </div>
            )}

            {/* Выбор валюты: TON / USDT */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAsset('TON')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  asset === 'TON'
                    ? 'bg-blue-600/30 border-blue-400/50 text-blue-200 shadow-sm'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <span>💎 TON Coin</span>
                <span className="text-[10px] opacity-70">({wallet.balanceTon} доступно)</span>
              </button>
              <button
                type="button"
                onClick={() => setAsset('USDT')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  asset === 'USDT'
                    ? 'bg-emerald-600/30 border-emerald-400/50 text-emerald-200 shadow-sm'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <span>💵 USDT Jetton</span>
                <span className="text-[10px] opacity-70">({wallet.balanceUsdt} доступно)</span>
              </button>
            </div>

            {/* Ввод суммы */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs text-slate-300 font-medium">
                <span>Сумма к отправке:</span>
                <span className="text-slate-400">
                  ≈ ${usdEstimate} USD ({rubEstimate} ₽)
                </span>
              </div>
              <GlassInput
                type="number"
                step="any"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {/* Пресеты быстрых сумм */}
              <div className="flex gap-1.5 pt-1">
                {['0.5', '1.0', '5.0', '10.0'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className={`flex-1 py-1 px-2 rounded-lg text-xs font-medium border transition-all ${
                      amount === val
                        ? 'bg-blue-500/30 border-blue-400/50 text-blue-200'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {val} {asset}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAmount(asset === 'TON' ? wallet.balanceTon : wallet.balanceUsdt)}
                  className="py-1 px-2.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-xs text-blue-300 font-semibold"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Комментарий (Memo) */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
                <span>Комментарий (Memo транзакции):</span>
                <span className="text-[10px] text-slate-500">Автосгенерирован</span>
              </label>
              <GlassInput
                placeholder="Комментарий"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </div>

            {/* Ошибки */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Кнопка отправки через TON Connect */}
            <GlassButton
              type="submit"
              variant="accent"
              disabled={isSending}
              className="w-full py-3 mt-1 font-semibold flex items-center justify-center gap-2"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Подписание транзакции в {wallet.name}...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Отправить {amount} {asset} через TON Connect</span>
                </>
              )}
            </GlassButton>

            {/* Запасной вариант: открытие через нативный Deep Link */}
            <button
              type="button"
              onClick={handleOpenDeepLinkWallet}
              className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 active:scale-98 text-slate-300 text-xs font-medium border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Открыть в приложении кошелька (Deep Link)</span>
            </button>
          </form>
        )}
      </div>
    </GlassModal>
  );
};

export default InChatTransferModal;
