import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Copy,
  Check,
  QrCode,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Power,
  ExternalLink,
  Coins,
  Send,
  Sparkles,
  ShieldCheck,
  Loader2,
  ChevronRight,
  AlertCircle,
  Eye,
  EyeOff,
  Dices,
  Layers,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import QRCode from 'qrcode';
import { GlassModal } from '../../ui/GlassModal';
import { GlassButton } from '../../ui/GlassButton';
import { GlassInput } from '../../ui/GlassInput';
import { GlassCard } from '../../ui/GlassCard';
import {
  tonConnectManager,
  SUPPORTED_WALLETS,
  TransactionHistoryItem,
  isOpenMaskInstalled,
  formatFiatEquivalent
} from './tonConnectManager';
import { ConnectedWallet, WalletAppInfo } from './types';
import { validateTonAddress } from './tonAddressValidator';
import { TON_QUICK_PRESETS, TonPresetWallet, generatePaperWallet, PaperWalletResult } from './paperWallet';
import { WalletBrandedIcon } from './WalletBrandedIcon';
import { TON_FEATURES_ENABLED } from './flags';

export interface TonWalletHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  inline?: boolean;
  theme?: 'dark' | 'light' | 'coffee';
}

export const TonWalletHubModal: React.FC<TonWalletHubModalProps> = ({
  isOpen,
  onClose,
  inline = false,
  theme = 'dark',
}) => {
  const { t } = useTranslation(['wallet', 'common']);
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'send' | 'deposit' | 'history'>('overview');
  const [customAddressInput, setCustomAddressInput] = useState('');
  const [showCustomAddressInput, setShowCustomAddressInput] = useState(false);
  const [history, setHistory] = useState<TransactionHistoryItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Модальное окно установки OpenMask
  const [isOpenMaskModalOpen, setIsOpenMaskModalOpen] = useState(false);
  const [openMaskError, setOpenMaskError] = useState<string | null>(null);

  // Состояние Paper Wallet
  const [paperWalletResult, setPaperWalletResult] = useState<PaperWalletResult | null>(null);
  const [isGeneratingPaperWallet, setIsGeneratingPaperWallet] = useState(false);
  const [showPaperMnemonic, setShowPaperMnemonic] = useState(false);
  const [copiedPaperMnemonic, setCopiedPaperMnemonic] = useState(false);
  const [copiedPaperAddress, setCopiedPaperAddress] = useState(false);
  const [showSecondaryWalletTools, setShowSecondaryWalletTools] = useState(false);

  // Форма отправки перевода
  const [sendAsset, setSendAsset] = useState<'TON' | 'USDT'>('TON');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendMemo, setSendMemo] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  // Подписка на изменение состояния кошелька
  useEffect(() => {
    const unsubscribe = tonConnectManager.onStatusChange((newWallet) => {
      setWallet(newWallet);
    });
    setHistory(tonConnectManager.getTransactionHistory());
    return () => unsubscribe();
  }, []);

  // Генерация QR-кода при подключенном кошельке или вкладке депозита
  useEffect(() => {
    if (wallet?.address) {
      const tonTransferUrl = `ton://transfer/${wallet.address}`;
      QRCode.toDataURL(tonTransferUrl, {
        width: 256,
        margin: 1.5,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.warn('[TonWalletHub] Ошибка генерации QR:', err));
    }
  }, [wallet?.address]);

  // Копирование адреса в буфер обмена
  const handleCopyAddress = useCallback(() => {
    if (!wallet?.address) return;
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [wallet?.address]);

  // Подключение кошелька
  const handleConnectWallet = async (walletApp: WalletAppInfo, directAddress?: string) => {
    try {
      // 1. Для OpenMask без установленного расширения открываем модалку установки в Chrome Web Store
      if (walletApp.id === 'openmask' && !directAddress && !isOpenMaskInstalled()) {
        setIsOpenMaskModalOpen(true);
        return;
      }

      if (walletApp.id === 'custom-address' && !directAddress && !customAddressInput.trim()) {
        setShowCustomAddressInput(true);
        return;
      }
      setIsConnecting(true);
      const addrToUse = directAddress || (walletApp.id === 'custom-address' ? customAddressInput.trim() : undefined);

      if (addrToUse) {
        const val = validateTonAddress(addrToUse);
        if (!val.isValid) {
          throw new Error(val.errorMessage || 'Некорректный адрес кошелька TON');
        }
      }

      const connected = await tonConnectManager.connectWallet(walletApp.id, addrToUse);
      setWallet(connected);
      setShowCustomAddressInput(false);
      setCustomAddressInput('');
      const realTxs = await tonConnectManager.fetchRealTransactionHistory();
      setHistory(realTxs);
    } catch (err: any) {
      console.error('[TonWalletHub] Ошибка подключения кошелька:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  // Выбор быстрого ончейн-пресета
  const handleSelectPreset = async (preset: TonPresetWallet) => {
    const presetWalletInfo: WalletAppInfo = {
      id: 'custom-address',
      name: preset.name,
      appName: preset.name,
      iconUrl: preset.iconUrl,
      description: preset.description,
      universalLink: '',
      deepLinkPrefix: '',
    };
    await handleConnectWallet(presetWalletInfo, preset.address);
  };

  // Генерация Paper Wallet
  const handleGenerateNewPaperWallet = async () => {
    try {
      setIsGeneratingPaperWallet(true);
      const result = await generatePaperWallet();
      setPaperWalletResult(result);
      setShowPaperMnemonic(false);
    } catch (err: any) {
      console.error('[TonWalletHub] Ошибка генерации Paper Wallet:', err);
    } finally {
      setIsGeneratingPaperWallet(false);
    }
  };

  // Отключение кошелька
  const handleDisconnectWallet = async () => {
    try {
      await tonConnectManager.disconnectWallet();
      setWallet(null);
      setActiveTab('overview');
    } catch (err) {
      console.error('[TonWalletHub] Ошибка отключения:', err);
    }
  };

  // Ручное обновление балансов
  const handleRefreshBalances = async () => {
    if (!wallet) return;
    setIsRefreshing(true);
    try {
      await tonConnectManager.refreshBalances();
      const realTxs = await tonConnectManager.fetchRealTransactionHistory();
      setHistory(realTxs);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Отправка перевода из модалки
  const handleSendTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendError(null);
    setSendSuccess(null);

    if (!recipientAddress.trim()) {
      setSendError('Укажите адрес кошелька получателя');
      return;
    }
    if (!sendAmount.trim() || Number(sendAmount) <= 0) {
      setSendError('Укажите корректную сумму для отправки');
      return;
    }

    setIsSending(true);
    try {
      if (sendAsset === 'TON') {
        const res = await tonConnectManager.sendTonTransaction({
          recipientAddress: recipientAddress.trim(),
          amountTon: sendAmount.trim(),
          memo: sendMemo.trim(),
        });
        setSendSuccess(`Успешно отправлено ${sendAmount} TON! Tx: ${res.txHash.slice(0, 12)}...`);
      } else {
        const res = await tonConnectManager.sendUsdtJettonTransaction({
          recipientAddress: recipientAddress.trim(),
          amountUsdt: sendAmount.trim(),
          memo: sendMemo.trim(),
        });
        setSendSuccess(`Успешно отправлено ${sendAmount} USDT! Tx: ${res.txHash.slice(0, 12)}...`);
      }

      setRecipientAddress('');
      setSendAmount('');
      setSendMemo('');
      setHistory(tonConnectManager.getTransactionHistory());
      setActiveTab('overview');
    } catch (err: any) {
      console.error('[TonWalletHub] Ошибка отправки транзакции:', err);
      setSendError(err.message || 'Ошибка выполнения перевода');
    } finally {
      setIsSending(false);
    }
  };

  const rates = tonConnectManager.getRates();
  const tonUsdEquiv = formatFiatEquivalent(wallet?.balanceTon || '0', rates.tonUsd, 2);
  const tonRubEquiv = formatFiatEquivalent(wallet?.balanceTon || '0', rates.tonRub, 0);
  const usdtUsdEquiv = formatFiatEquivalent(wallet?.balanceUsdt || '0', rates.usdtUsd, 2);
  const usdtRubEquiv = formatFiatEquivalent(wallet?.balanceUsdt || '0', rates.usdtRub, 0);

  // Сокращение адреса
  const formatShortAddress = (addr: string) => {
    if (!addr || addr.length < 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const contentBody = (
    <div className="flex flex-col gap-4 text-slate-200">
      {!wallet ? (
        /* Экран выбора и подключения кошелька (TON Connect 2.0) */
        <div className="flex flex-col gap-4 py-2">
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-indigo-600/20 border border-blue-500/30">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300 flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">{t('wallet:hub.connectBannerTitle', 'Подключение по протоколу TON Connect 2.0')}</h4>
              <p className="text-xs text-slate-300 leading-snug mt-0.5">
                {t('wallet:hub.connectBannerDesc', 'Подключите ваш некастодиальный кошелек для безопасных мгновенных P2P-переводов и оплаты инвойсов без комиссий сервиса.')}
              </p>
            </div>
          </div>

          {showCustomAddressInput ? (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-blue-400" />
                {t('wallet:hub.customAddressTitle', 'Ввод адреса кошелька (Watch-Only / Ручное подключение)')}
              </h4>
              <p className="text-[11px] text-slate-300">
                {t('wallet:hub.customAddressDesc', 'Введите ваш публичный TON-адрес (начинается на UQ..., EQ... или 0:...) для проверки ончейн-баланса и формирования переводов:')}
              </p>
              <GlassInput
                placeholder={t('wallet:send.recipientPlaceholder', 'UQ... или EQ...')}
                value={customAddressInput}
                onChange={(e) => setCustomAddressInput(e.target.value)}
              />

              {customAddressInput.trim() && (() => {
                const val = validateTonAddress(customAddressInput.trim());
                if (!val.isValid) {
                  return (
                    <div className="flex items-center gap-1.5 p-2 rounded-xl bg-rose-500/15 border border-rose-500/25 text-[11px] text-rose-300">
                      <XCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                      <span>{val.errorMessage}</span>
                    </div>
                  );
                }
                return (
                  <div className="flex items-center gap-1.5 p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-[11px] text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                    <span>
                      ✓ TON ({val.type === 'raw' ? 'Raw Hex' : val.isBounceable ? 'Bounceable EQ...' : 'Non-bounceable UQ...'})
                    </span>
                  </div>
                );
              })()}

              <div className="flex items-center gap-2 pt-1">
                <GlassButton
                  variant="accent"
                  size="sm"
                  disabled={!customAddressInput.trim() || !validateTonAddress(customAddressInput.trim()).isValid || isConnecting}
                  onClick={() => handleConnectWallet(SUPPORTED_WALLETS.find(w => w.id === 'custom-address') || SUPPORTED_WALLETS[0], customAddressInput)}
                  className="flex-1 text-xs font-bold"
                >
                  {isConnecting ? t('wallet:hub.checkingAddress', 'Проверка адреса...') : t('wallet:hub.connectAddressButton', 'Подключить адрес')}
                </GlassButton>
                <GlassButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowCustomAddressInput(false)}
                  className="text-xs"
                >
                  {t('common:actions.cancel', 'Отмена')}
                </GlassButton>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                  {t('wallet:hub.selectWallet', 'Выберите кошелек для подключения:')}
                </span>
                {SUPPORTED_WALLETS.map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    disabled={isConnecting}
                    onClick={() => handleConnectWallet(app)}
                    className="w-full p-3 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-98 border border-white/10 flex items-center justify-between transition-all group cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-3.5">
                      <WalletBrandedIcon
                        id={app.id}
                        name={app.name}
                        iconUrl={app.iconUrl}
                        size="md"
                        className="group-hover:scale-105 transition-transform"
                      />
                      <div className="flex flex-col text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                            {app.name}
                          </span>
                          {app.isPopular && (
                            <span className="text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-1.5 py-0.2 rounded-md">
                              {t('wallet:hub.popularBadge', 'Популярный')}
                            </span>
                          )}
                          {app.id === 'openmask' && !isOpenMaskInstalled() && (
                            <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.2 rounded-md">
                              Chrome Web Store
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 line-clamp-1">{app.description}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>

              {/* Кнопка раскрытия дополнительных инструментов (Watch-Only пресеты и Paper Wallet) */}
              <button
                type="button"
                onClick={() => setShowSecondaryWalletTools((prev) => !prev)}
                className="w-full py-2.5 px-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-xs font-semibold text-slate-300 flex items-center justify-between transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Dices className="w-4 h-4 text-purple-400" />
                  <span>{t('wallet:hub.moreOptionsToggle', 'Дополнительные способы (Бумажный кошелёк / Примеры адресов)')}</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {showSecondaryWalletTools ? 'Скрыть ▲' : 'Открыть ▼'}
                </span>
              </button>

              {showSecondaryWalletTools && (
                <div className="flex flex-col gap-3 pt-1 animate-fade-in">
                  {/* Секция 1: Быстрые ончейн-пресеты */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                        <Layers className="w-4 h-4 text-blue-400" />
                        <span>{t('wallet:hub.watchOnlyPresets', 'Быстрые ончейн-пресеты (Watch-Only):')}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{t('wallet:hub.watchOnlyMonitoring', 'Ончейн-мониторинг')}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {TON_QUICK_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          disabled={isConnecting}
                          onClick={() => handleSelectPreset(preset)}
                          className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-98 border border-white/10 flex flex-col text-left gap-1.5 transition-all group cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <WalletBrandedIcon
                                id={preset.id}
                                name={preset.name}
                                iconUrl={preset.iconUrl}
                                size="xs"
                              />
                              <span className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                                {preset.name}
                              </span>
                            </div>
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30">
                              {preset.badge}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                            {preset.description}
                          </span>
                          <span className="text-[9px] font-mono text-slate-500 truncate">
                            {preset.address}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Секция 2: Генератор Paper Wallets */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                        <Dices className="w-4 h-4 text-purple-400" />
                        <span>{t('wallet:paperWallet.title', 'Генератор Paper Wallet (12 слов):')}</span>
                      </div>
                      <GlassButton
                        variant="secondary"
                        size="sm"
                        disabled={isGeneratingPaperWallet}
                        onClick={handleGenerateNewPaperWallet}
                        className="text-[11px] py-1 px-2.5 h-auto font-medium"
                      >
                        {isGeneratingPaperWallet ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-purple-300 mr-1" />
                        )}
                        <span>🎲 {t('wallet:paperWallet.generateButton', 'Создать новый адрес')}</span>
                      </GlassButton>
                    </div>

                    {paperWalletResult && (
                      <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/30 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-purple-200">💎 {t('wallet:paperWallet.mnemonicTitle', 'Сгенерированный Paper Wallet (V4R2)')}</span>
                            <span className="text-[9px] font-mono bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30">
                              BIP-39 • TVM V4R2
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowPaperMnemonic(!showPaperMnemonic)}
                            className="text-[11px] text-purple-300 hover:text-purple-200 flex items-center gap-1 cursor-pointer"
                          >
                            {showPaperMnemonic ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            <span>{showPaperMnemonic ? t('common:actions.close', 'Скрыть слова') : t('common:actions.open', 'Показать мнемонику')}</span>
                          </button>
                        </div>

                        {showPaperMnemonic ? (
                          <div dir="ltr" className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 p-2 rounded-xl bg-black/40 border border-purple-500/20 font-mono text-[11px] text-left">
                            {paperWalletResult.words.map((w, idx) => (
                              <div key={idx} className="p-1 rounded bg-white/5 flex items-center gap-1 text-slate-300">
                                <span className="text-purple-400 text-[9px] font-semibold">{idx + 1}.</span>
                                <span className="truncate">{w}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-2 rounded-xl bg-black/30 border border-purple-500/20 text-center text-xs text-slate-400 italic">
                            ••••••••••••••••••••••••••••••••••••••••••••••••
                          </div>
                        )}

                        <div className="flex flex-col gap-1 text-[11px]">
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Non-bounceable UQ:</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(paperWalletResult.address);
                                setCopiedPaperAddress(true);
                                setTimeout(() => setCopiedPaperAddress(false), 2000);
                              }}
                              className="text-purple-300 hover:underline flex items-center gap-1"
                            >
                              {copiedPaperAddress ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedPaperAddress ? t('common:status.copied', 'Скопировано') : t('common:actions.copy', 'Копировать')}</span>
                            </button>
                          </div>
                          <span dir="ltr" className="font-mono text-purple-200 break-all bg-black/30 p-1.5 rounded-lg border border-white/5 select-all text-left">
                            {paperWalletResult.address}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <GlassButton
                            variant="accent"
                            size="sm"
                            onClick={() => handleConnectWallet({
                              id: 'custom-address',
                              name: 'Paper Wallet',
                              appName: 'Paper Wallet',
                              iconUrl: 'https://ton.org/download/ton_symbol.png',
                              description: 'Paper Wallet',
                              universalLink: '',
                              deepLinkPrefix: '',
                            }, paperWalletResult.address)}
                            className="flex-1 text-xs font-bold"
                          >
                            👀 {t('wallet:hub.watchOnlyMonitoring', 'Проверить баланс ончейн (Watch-Only)')}
                          </GlassButton>
                          <GlassButton
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(paperWalletResult.mnemonic);
                              setCopiedPaperMnemonic(true);
                              setTimeout(() => setCopiedPaperMnemonic(false), 2000);
                            }}
                            className="text-xs"
                          >
                            {copiedPaperMnemonic ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span className="ml-1">{copiedPaperMnemonic ? t('common:status.copied', 'Скопировано') : t('common:actions.copy', 'Копия фразы')}</span>
                          </GlassButton>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

            <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{t('wallet:paperWallet.desc', 'Приватные ключи остаются только на вашем устройстве в приложении кошелька')}</span>
              </div>
              <a
                href="https://ton.org/wallets"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline flex items-center gap-1 font-medium flex-shrink-0"
              >
                <span>{t('common:actions.open', 'Подробнее')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ) : (
          /* Главный экран подключенного кошелька */
          <div className="flex flex-col gap-4">
            {/* Карточка статуса кошелька и балансов */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-900/30 via-purple-900/20 to-neutral-900/40 border border-blue-500/25 shadow-glass-md flex flex-col gap-4">
              {/* Верхняя строка: Кошелек + Адрес + Кнопка отключения */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <WalletBrandedIcon
                    id={wallet.appName || wallet.name}
                    name={wallet.name}
                    iconUrl={wallet.iconUrl}
                    size="sm"
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{wallet.name}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Подключен" />
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      className="text-[11px] text-blue-300 hover:text-blue-200 flex items-center gap-1 font-mono transition-colors"
                      title="Нажмите, чтобы скопировать адрес"
                    >
                      <span>{formatShortAddress(wallet.address)}</span>
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleRefreshBalances}
                    disabled={isRefreshing}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-slate-300 hover:text-white transition-all cursor-pointer"
                    title={t('wallet:overview.refreshBalances', 'Обновить баланс')}
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnectWallet}
                    className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 active:scale-95 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
                    title={t('wallet:overview.disconnect', 'Отключить кошелек')}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Балансы TON и USDT */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex flex-col">
                  <span className="text-[11px] text-slate-400 font-medium">{t('wallet:overview.totalBalance', 'Баланс')} TON</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-bold text-white font-mono">{wallet.balanceTon}</span>
                    <span className="text-xs text-blue-400 font-semibold">TON</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">
                    ≈ ${tonUsdEquiv} USD ({tonRubEquiv} ₽)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex flex-col">
                  <span className="text-[11px] text-slate-400 font-medium">{t('wallet:overview.totalBalance', 'Баланс')} Tether USDT</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-bold text-white font-mono">{wallet.balanceUsdt}</span>
                    <span className="text-xs text-emerald-400 font-semibold">USDT</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">
                    ≈ ${usdtUsdEquiv} USD ({usdtRubEquiv} ₽)
                  </span>
                </div>
              </div>

              {/* Навигационные вкладки действий */}
              <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'overview'
                      ? 'bg-blue-600/30 text-blue-200 border border-blue-400/40 shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>{t('wallet:tabs.overview', 'Обзор')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('send')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'send'
                      ? 'bg-blue-600/30 text-blue-200 border border-blue-400/40 shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{t('wallet:tabs.send', 'Отправить')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('deposit')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'deposit'
                      ? 'bg-blue-600/30 text-blue-200 border border-blue-400/40 shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>{t('wallet:tabs.deposit', 'Пополнить')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'history'
                      ? 'bg-blue-600/30 text-blue-200 border border-blue-400/40 shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t('wallet:tabs.history', 'История')} ({history.length})</span>
                </button>
              </div>
            </div>

            {/* Контент активной вкладки */}
            {activeTab === 'overview' && (
              <div className="flex flex-col gap-3">
                {sendSuccess && (
                  <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                      <span>{sendSuccess}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSendSuccess(null)}
                      className="text-slate-400 hover:text-white text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-white">Сеть TON Mainnet</span>
                      <span className="text-[11px] text-slate-400">Шардинг активен, задержка транзакций ~4.2 сек</span>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 font-mono font-medium">Chain -239</span>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {t('wallet:history.title', 'Последние операции')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('history')}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      {t('wallet:tabs.history', 'Смотреть все')}
                    </button>
                  </div>

                  {history.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          item.type === 'transfer_in' || item.type === 'deposit'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }`}>
                          {item.type === 'transfer_in' || item.type === 'deposit' ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-white">
                            {item.type === 'transfer_in' ? t('wallet:history.incoming', 'Входящий перевод') : item.type === 'invoice_payment' ? t('wallet:inChat.invoiceTitle', 'Оплата счета') : t('wallet:history.outgoing', 'Перевод средств')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {item.memo || 'TON'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`text-xs font-bold font-mono ${
                          item.type === 'transfer_in' || item.type === 'deposit' ? 'text-emerald-400' : 'text-slate-200'
                        }`}>
                          {item.type === 'transfer_in' || item.type === 'deposit' ? '+' : '-'}{item.amountTon} {item.currency}
                        </span>
                        <a
                          href={item.txHash.startsWith('ton_tx_') || item.txHash.startsWith('usdt_tx_') ? `https://tonviewer.com/${item.recipientAddress || wallet.address}` : `https://tonviewer.com/transaction/${item.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5"
                        >
                          <span>Tx</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'send' && (
              <form onSubmit={handleSendTransaction} className="flex flex-col gap-3 py-1">
                {/* Выбор валюты */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSendAsset('TON')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      sendAsset === 'TON'
                        ? 'bg-blue-600/30 border-blue-400/50 text-blue-200'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span>💎 TON (Native)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendAsset('USDT')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      sendAsset === 'USDT'
                        ? 'bg-emerald-600/30 border-emerald-400/50 text-emerald-200'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span>💵 USDT (Jetton)</span>
                  </button>
                </div>

                {/* Адрес получателя */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-300 font-medium">{t('wallet:send.recipientLabel', 'Адрес кошелька получателя (UQ... / EQ... / 0:...):')}</label>
                  <GlassInput
                    placeholder={t('wallet:send.recipientPlaceholder', 'UQ... или EQ...')}
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                  />
                  {recipientAddress.trim() && (() => {
                    const val = validateTonAddress(recipientAddress.trim());
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
                        <span>✓ TON ({val.type === 'raw' ? 'Raw Hex' : val.isBounceable ? 'Bounceable / EQ...' : 'Non-bounceable / UQ...'})</span>
                      </span>
                    );
                  })()}
                </div>

                {/* Сумма перевода */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs text-slate-300 font-medium">
                    <span>{t('wallet:send.amountLabel', 'Сумма перевода')} ({sendAsset}):</span>
                    <span className="text-slate-400">
                      {t('wallet:send.available', 'Доступно: {{amount}} {{symbol}}', { amount: sendAsset === 'TON' ? wallet.balanceTon : wallet.balanceUsdt, symbol: sendAsset })}
                    </span>
                  </div>
                  <GlassInput
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                  />
                  {/* Быстрые пресеты сумм */}
                  <div className="flex gap-1.5 pt-1">
                    {['0.5', '1.0', '5.0'].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setSendAmount(amt)}
                        className="py-1 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300"
                      >
                        +{amt} {sendAsset}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSendAmount(sendAsset === 'TON' ? wallet.balanceTon : wallet.balanceUsdt)}
                      className="py-1 px-2.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-[11px] text-blue-300 font-semibold"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Комментарий (Memo) */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-300 font-medium">{t('wallet:send.memoLabel', 'Комментарий к переводу (Memo):')}</label>
                  <GlassInput
                    placeholder={t('wallet:send.memoPlaceholder', 'Например, Оплата заказа или P2P перевод')}
                    value={sendMemo}
                    onChange={(e) => setSendMemo(e.target.value)}
                  />
                </div>

                {sendError && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-xs text-rose-300">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{sendError}</span>
                  </div>
                )}

                <GlassButton
                  type="submit"
                  variant="accent"
                  disabled={isSending}
                  className="w-full py-3 mt-1 font-semibold flex items-center justify-center gap-2"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('wallet:send.confirming', 'Подписание транзакции в кошельке...')}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{t('wallet:send.sendButton', 'Отправить {{amount}} {{symbol}}', { amount: sendAmount || '', symbol: sendAsset })}</span>
                    </>
                  )}
                </GlassButton>
              </form>
            )}

            {activeTab === 'deposit' && (
              <div className="flex flex-col items-center gap-4 py-2 text-center">
                <span className="text-xs text-slate-300 max-w-xs">
                  {t('wallet:deposit.desc', 'Для пополнения баланса переведите TON или USDT Jetton на ваш уникальный адрес в сети The Open Network:')}
                </span>

                {/* Контейнер QR-кода */}
                <div className="p-4 rounded-3xl bg-white shadow-2xl flex items-center justify-center border border-white/20">
                  {qrCodeDataUrl ? (
                    <img src={qrCodeDataUrl} alt="TON Wallet QR Code" className="w-48 h-48 rounded-xl object-contain" />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-slate-600">
                      <QrCode className="w-12 h-12" />
                    </div>
                  )}
                </div>

                <div className="w-full max-w-sm flex flex-col gap-2">
                  <div dir="ltr" className="p-2.5 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-blue-300 break-all select-all text-center">
                    {wallet.address}
                  </div>
                  <GlassButton
                    type="button"
                    variant="secondary"
                    onClick={handleCopyAddress}
                    className="w-full py-2 flex items-center justify-center gap-2 text-xs"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? t('common:status.copied', 'Скопировано в буфер обмена') : t('wallet:deposit.copyAddress', 'Скопировать полный адрес')}</span>
                  </GlassButton>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    {t('wallet:history.empty', 'История транзакций пуста')}
                  </div>
                ) : (
                  history.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          tx.type === 'transfer_in' || tx.type === 'deposit'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }`}>
                          {tx.type === 'transfer_in' || tx.type === 'deposit' ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-white">
                            {tx.type === 'transfer_in' ? t('wallet:history.incoming', 'Входящий перевод') : tx.type === 'invoice_payment' ? t('wallet:inChat.invoiceTitle', 'Оплата инвойса') : t('wallet:history.outgoing', 'Исходящий перевод')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(tx.timestamp).toLocaleString('ru-RU')}
                          </span>
                          {tx.memo && <span className="text-[10px] text-slate-300 italic line-clamp-1">«{tx.memo}»</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`text-xs font-bold font-mono ${
                          tx.type === 'transfer_in' || tx.type === 'deposit' ? 'text-emerald-400' : 'text-slate-200'
                        }`}>
                          {tx.type === 'transfer_in' || tx.type === 'deposit' ? '+' : '-'}{tx.amountTon} {tx.currency}
                        </span>
                        <a
                          href={tx.txHash.startsWith('ton_tx_') || tx.txHash.startsWith('usdt_tx_') ? `https://tonviewer.com/${tx.recipientAddress || wallet.address}` : `https://tonviewer.com/transaction/${tx.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5 mt-0.5"
                        >
                          <span className="font-mono">{tx.txHash.slice(0, 8)}...</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );

  const openMaskInstallDialog = (
    <GlassModal
      isOpen={isOpenMaskModalOpen}
      onClose={() => setIsOpenMaskModalOpen(false)}
      title="🦊 Установка расширения OpenMask"
      size="md"
    >
      <div className="flex flex-col gap-4 text-slate-200 py-1">
        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25">
          <WalletBrandedIcon id="openmask" name="OpenMask" size="lg" />
          <div className="flex flex-col">
            <h4 className="text-sm font-bold text-white">Расширение OpenMask не обнаружено</h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-snug">
              Для прямого подключения Web3 и подписания транзакций в браузере требуется установленное расширение OpenMask.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs text-slate-300">
          <div className="flex items-start gap-2">
            <span className="font-bold text-amber-400">1.</span>
            <span>Перейдите в официальный интернет-магазин Chrome Web Store по кнопке ниже.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-amber-400">2.</span>
            <span>Нажмите <strong>«Установить»</strong> и создайте или импортируйте ваш TON-кошелек.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-amber-400">3.</span>
            <span>Вернитесь в мессенджер Gossip и нажмите <strong>«Я установил (Проверить)»</strong>.</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <a
            href="https://chromewebstore.google.com/detail/openmask/pinfdafnadjiekknmfdamnanacklnclb"
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Установить из Chrome Web Store</span>
          </a>

          {openMaskError && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>{openMaskError}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <GlassButton
              variant="accent"
              size="sm"
              onClick={async () => {
                if (isOpenMaskInstalled()) {
                  setOpenMaskError(null);
                  setIsOpenMaskModalOpen(false);
                  const openmaskApp = SUPPORTED_WALLETS.find(w => w.id === 'openmask') || SUPPORTED_WALLETS[0];
                  await handleConnectWallet(openmaskApp);
                } else {
                  setOpenMaskError('Расширение OpenMask пока не обнаружено. Перезагрузите страницу браузера после установки.');
                }
              }}
              className="flex-1 text-xs font-semibold py-2.5"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              <span>Я установил (Проверить)</span>
            </GlassButton>
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() => {
                setOpenMaskError(null);
                setIsOpenMaskModalOpen(false);
              }}
              className="text-xs py-2.5 px-4"
            >
              Закрыть
            </GlassButton>
          </div>
        </div>
      </div>
    </GlassModal>
  );

  if (!TON_FEATURES_ENABLED) {
    return null;
  }

  if (inline) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 md:p-6 overflow-y-auto">
        <GlassCard glow className="p-5 sm:p-7 rounded-3xl border-white/10 shadow-2xl">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-xl">💎</span>
              <span>{t('wallet:hub.title', 'Криптокошелек The Open Network (TON Connect 2.0)')}</span>
            </h2>
            {wallet && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                TON ✓
              </span>
            )}
          </div>
          {contentBody}
        </GlassCard>
        {openMaskInstallDialog}
      </div>
    );
  }

  return (
    <>
      <GlassModal
        isOpen={isOpen}
        onClose={onClose}
        title={`💎 ${t('wallet:hub.title', 'Криптокошелек The Open Network (TON)')}`}
        size="lg"
      >
        {contentBody}
      </GlassModal>
      {openMaskInstallDialog}
    </>
  );
};

export default TonWalletHubModal;


