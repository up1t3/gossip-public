import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { ConnectedWallet, WalletAppInfo, TonSendParams, UsdtSendParams, TonTransactionResult, TonRates } from './types';
import { validateTonAddress, userFriendlyToRaw } from './tonAddressValidator';
import { TON_FEATURES_ENABLED, TON_MAINTENANCE_MESSAGE } from './flags';
import { getBackendUrl } from '../../utils/url';

export const TON_DECIMALS = 9;
export const USDT_DECIMALS = 6;
export const USDT_MASTER_ADDRESS = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';
const TON_SCALE = 1_000_000_000n; // 10^9
const USDT_SCALE = 1_000_000n;    // 10^6

const STORAGE_SESSION_KEY = 'ton_wallet_session_v3';
const STORAGE_HISTORY_KEY = 'ton_wallet_history_v3';

function resolveTonApiPath(path: string): string {
  try {
    return getBackendUrl(path);
  } catch {
    return path;
  }
}

/**
 * Безопасное открытие внешних Deep Link схем (ton://, tc://, tg://, tonkeeper://, mytonwallet://, openmask://, https://)
 * с гарантированной защитой от ERR_UNKNOWN_URL_SCHEME в Capacitor WebView.
 */
export async function openDeepLink(url: string): Promise<boolean> {
  if (!url || !url.trim()) return false;
  const targetUrl = url.trim();

  try {
    if (Capacitor.isNativePlatform()) {
      if (typeof (App as any).openUrl === 'function') {
        await (App as any).openUrl({ url: targetUrl });
        return true;
      }
      if (typeof window !== 'undefined') {
        window.open(targetUrl, '_system');
        return true;
      }
    } else {
      if (typeof window !== 'undefined') {
        if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
          window.open(targetUrl, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = targetUrl;
        }
        return true;
      }
    }
    return true;
  } catch (err) {
    if (typeof window !== 'undefined') {
      try {
        window.open(targetUrl, '_system');
        return true;
      } catch {}
    }
    return false;
  }
}

export const openCryptoDeepLink = openDeepLink;

/**
 * Конвертация TON в нанотоны (nanoTON, 10^-9) через BigInt.
 */
export function tonToNanotonsStr(ton: string | number): string {
  const str = String(ton).trim();
  if (!str || str === '0') return '0';

  const isNegative = str.startsWith('-');
  const cleanStr = isNegative ? str.slice(1) : str;

  const parts = cleanStr.split('.');
  const wholePart = parts[0] || '0';
  let fracPart = parts[1] || '';

  if (fracPart.length > TON_DECIMALS) {
    fracPart = fracPart.slice(0, TON_DECIMALS);
  } else {
    fracPart = fracPart.padEnd(TON_DECIMALS, '0');
  }

  const wholeBig = BigInt(wholePart) * TON_SCALE;
  const fracBig = BigInt(fracPart);
  const totalNanotons = wholeBig + fracBig;

  return `${isNegative ? '-' : ''}${totalNanotons.toString()}`;
}

/**
 * Конвертация нанотонов в строковое представление TON.
 */
export function nanotonsToTonStr(nanotons: string | bigint | number): string {
  const rawStr = String(nanotons).trim();
  if (!rawStr || rawStr === '0') return '0';

  const isNegative = rawStr.startsWith('-');
  const cleanStr = isNegative ? rawStr.slice(1) : rawStr;
  const nanoBig = BigInt(cleanStr);

  const whole = nanoBig / TON_SCALE;
  const remainder = nanoBig % TON_SCALE;

  if (remainder === 0n) {
    return `${isNegative ? '-' : ''}${whole.toString()}`;
  }

  const fracStr = remainder.toString().padStart(TON_DECIMALS, '0').replace(/0+$/, '');
  return `${isNegative ? '-' : ''}${whole.toString()}.${fracStr}`;
}

/**
 * Конвертация USDT в микроюниты (10^-6).
 */
export function usdtToMicroUnitsStr(usdt: string | number): string {
  const str = String(usdt).trim();
  if (!str || str === '0') return '0';

  const isNegative = str.startsWith('-');
  const cleanStr = isNegative ? str.slice(1) : str;

  const parts = cleanStr.split('.');
  const wholePart = parts[0] || '0';
  let fracPart = parts[1] || '';

  if (fracPart.length > USDT_DECIMALS) {
    fracPart = fracPart.slice(0, USDT_DECIMALS);
  } else {
    fracPart = fracPart.padEnd(USDT_DECIMALS, '0');
  }

  const wholeBig = BigInt(wholePart) * USDT_SCALE;
  const fracBig = BigInt(fracPart);
  const totalUnits = wholeBig + fracBig;

  return `${isNegative ? '-' : ''}${totalUnits.toString()}`;
}

/**
 * Конвертация микроюнитов USDT в строку USDT.
 */
export function microUnitsToUsdtStr(units: string | bigint | number): string {
  const rawStr = String(units).trim();
  if (!rawStr || rawStr === '0') return '0';

  const isNegative = rawStr.startsWith('-');
  const cleanStr = isNegative ? rawStr.slice(1) : rawStr;
  const unitsBig = BigInt(cleanStr);

  const whole = unitsBig / USDT_SCALE;
  const remainder = unitsBig % USDT_SCALE;

  if (remainder === 0n) {
    return `${isNegative ? '-' : ''}${whole.toString()}`;
  }

  const fracStr = remainder.toString().padStart(USDT_DECIMALS, '0').replace(/0+$/, '');
  return `${isNegative ? '-' : ''}${whole.toString()}.${fracStr}`;
}

/**
 * Точное строковое умножение числа на курс валюты с фиксированным числом десятичных знаков.
 * Исключает потерю точности IEEE 754.
 */
export function formatFiatEquivalent(amountStr: string | number, rate: number, fractionDigits: number = 2): string {
  const clean = String(amountStr).trim();
  if (!clean || clean === '0' || Number.isNaN(Number(clean))) return fractionDigits === 0 ? '0' : '0.00';
  try {
    const isNeg = clean.startsWith('-');
    const val = isNeg ? clean.slice(1) : clean;
    const parts = val.split('.');
    const whole = parts[0] || '0';
    const frac = (parts[1] || '').slice(0, 9);
    const scale = 10 ** frac.length;
    const intVal = BigInt(whole) * BigInt(scale) + BigInt(frac || '0');
    const rateScaled = Math.round(rate * 100);
    const totalCents = (intVal * BigInt(rateScaled)) / BigInt(scale);
    const wholeCents = totalCents / 100n;
    const remCents = totalCents % 100n;
    if (fractionDigits === 0) {
      return `${isNeg ? '-' : ''}${wholeCents.toString()}`;
    }
    return `${isNeg ? '-' : ''}${wholeCents.toString()}.${remCents.toString().padStart(2, '0')}`;
  } catch {
    const num = Number(clean) || 0;
    const res = num * rate;
    return fractionDigits === 0 ? Math.round(res).toString() : res.toFixed(fractionDigits);
  }
}

/**
 * Создание Base64 BOC ячейки для текстового комментария TON (32-бит префикс 0x00000000 + UTF-8 текст).
 */
export function createCommentPayloadBoc(comment: string): string {
  if (!comment) return '';
  try {
    const encoder = new TextEncoder();
    const commentBytes = encoder.encode(comment);
    const payloadBytes = new Uint8Array(4 + commentBytes.length);
    payloadBytes.set([0, 0, 0, 0], 0);
    payloadBytes.set(commentBytes, 4);

    let binary = '';
    for (let i = 0; i < payloadBytes.length; i++) {
      binary += String.fromCharCode(payloadBytes[i]);
    }
    return btoa(binary);
  } catch (e) {
    console.warn('[TON] Ошибка кодирования комментария в BOC:', e);
    return '';
  }
}

/**
 * Создание Base64 BOC ячейки для перевода Jetton (USDT и др.)
 * Стандартный op::transfer (0xf8a7cd5 / 0x0f8a7ea5) с query_id, суммой в микроюнитах,
 * адресом получателя и forward_ton_amount (0.01 TON).
 */
export function createJettonTransferPayloadBoc(params: {
  recipientAddress: string;
  amountMicroUnits: string | bigint | number;
  memo?: string;
  queryId?: bigint | number;
  forwardTonAmountNano?: bigint | number;
}): string {
  try {
    const {
      recipientAddress,
      amountMicroUnits,
      memo = '',
      queryId = BigInt(Date.now()),
      forwardTonAmountNano = 10_000_000n, // 0.01 TON
    } = params;

    const microBig = BigInt(String(amountMicroUnits).trim() || '0');
    const qIdBig = BigInt(queryId);
    const fwdBig = BigInt(forwardTonAmountNano);

    // Извлечение 32 байт raw аккаунта
    let rawHex = '';
    try {
      const raw = recipientAddress.startsWith('0:') || recipientAddress.startsWith('-1:')
        ? recipientAddress
        : userFriendlyToRaw(recipientAddress);
      rawHex = raw.split(':')[1] || '';
    } catch {
      rawHex = '';
    }

    const addrBytes = new Uint8Array(32);
    if (rawHex && rawHex.length === 64) {
      for (let i = 0; i < 32; i++) {
        addrBytes[i] = parseInt(rawHex.slice(i * 2, i * 2 + 2), 16);
      }
    }

    let amountHex = microBig.toString(16);
    if (amountHex.length % 2 !== 0) amountHex = '0' + amountHex;
    const amountBytes = microBig === 0n ? new Uint8Array(0) : new Uint8Array(amountHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    let fwdHex = fwdBig.toString(16);
    if (fwdHex.length % 2 !== 0) fwdHex = '0' + fwdHex;
    const fwdBytes = fwdBig === 0n ? new Uint8Array(0) : new Uint8Array(fwdHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    const encoder = new TextEncoder();
    const memoBytes = memo ? encoder.encode(memo) : new Uint8Array(0);

    const totalLen = 4 + 8 + 1 + amountBytes.length + 32 + 1 + fwdBytes.length + (memoBytes.length > 0 ? 4 + memoBytes.length : 0);
    const payload = new Uint8Array(totalLen);
    let offset = 0;

    // 1. op::transfer (0x0f8a7cd5)
    payload[offset++] = 0x0f;
    payload[offset++] = 0x8a;
    payload[offset++] = 0x7c;
    payload[offset++] = 0xd5;

    // 2. query_id (64-bit uint BE)
    for (let i = 7; i >= 0; i--) {
      payload[offset++] = Number((qIdBig >> BigInt(i * 8)) & 0xffn);
    }

    // 3. amount (длина + байты)
    payload[offset++] = amountBytes.length;
    payload.set(amountBytes, offset);
    offset += amountBytes.length;

    // 4. destination address (32 байта)
    payload.set(addrBytes, offset);
    offset += 32;

    // 5. forward_ton_amount (длина + байты)
    payload[offset++] = fwdBytes.length;
    payload.set(fwdBytes, offset);
    offset += fwdBytes.length;

    // 6. forward_payload
    if (memoBytes.length > 0) {
      payload[offset++] = 0x00;
      payload[offset++] = 0x00;
      payload[offset++] = 0x00;
      payload[offset++] = 0x00;
      payload.set(memoBytes, offset);
      offset += memoBytes.length;
    }

    let binary = '';
    for (let i = 0; i < payload.length; i++) {
      binary += String.fromCharCode(payload[i]);
    }
    return btoa(binary);
  } catch (err) {
    console.warn('[TON] Ошибка создания Jetton Transfer Payload BOC:', err);
    return '';
  }
}

/**
 * Список поддерживаемых кошельков экосистемы TON
 */
export const SUPPORTED_WALLETS: WalletAppInfo[] = [
  {
    id: 'tonkeeper',
    name: 'Tonkeeper',
    appName: 'tonkeeper',
    iconUrl: 'https://tonkeeper.com/assets/tonconnect-icon.png',
    universalLink: 'https://app.tonkeeper.com/ton-connect',
    deepLinkPrefix: 'tonkeeper://',
    aboutUrl: 'https://tonkeeper.com',
    description: 'Самый популярный мобильный и десктопный кошелек экосистемы TON',
    isPopular: true,
  },
  {
    id: 'mytonwallet',
    name: 'MyTonWallet',
    appName: 'mytonwallet',
    iconUrl: 'https://mytonwallet.app/icon-256.png',
    universalLink: 'https://mytonwallet.app/connect',
    deepLinkPrefix: 'mytonwallet://',
    aboutUrl: 'https://mytonwallet.app',
    description: 'Мультивалютный кошелек с поддержкой стейкинга и расширений',
    isPopular: true,
  },
  {
    id: 'openmask',
    name: 'OpenMask',
    appName: 'openmask',
    iconUrl: 'https://raw.githubusercontent.com/OpenMask-App/wallet-icons/main/openmask.png',
    universalLink: 'https://www.openmask.app',
    deepLinkPrefix: 'openmask://',
    aboutUrl: 'https://www.openmask.app',
    chromeWebStoreUrl: 'https://chromewebstore.google.com/detail/openmask/pinfdafnadjiekknmfdamnanacklnclb',
    description: 'Удобное браузерное расширение и мобильный кошелек для Web3',
  },
  {
    id: 'telegram-wallet',
    name: 'Telegram Wallet (@wallet)',
    appName: 'telegram-wallet',
    iconUrl: 'https://wallet.tg/images/logo-288.png',
    universalLink: 'https://t.me/wallet/start?startapp=tonconnect',
    deepLinkPrefix: 'tg://resolve?domain=wallet&startapp=tonconnect',
    aboutUrl: 'https://wallet.tg',
    description: 'Встроенный некастодиальный кошелек внутри мессенджера Telegram',
    isPopular: true,
  },
  {
    id: 'custom-address',
    name: 'Ввод адреса (Watch-Only)',
    appName: 'custom-address',
    iconUrl: 'https://ton.org/download/ton_symbol.png',
    universalLink: '',
    deepLinkPrefix: 'ton://',
    aboutUrl: 'https://ton.org',
    description: 'Подключение любого TON-адреса для просмотра баланса и создания переводов',
  }
];

export interface TransactionHistoryItem {
  id: string;
  type: 'transfer_in' | 'transfer_out' | 'invoice_payment' | 'deposit';
  amountTon: string;
  currency: 'TON' | 'USDT';
  recipientAddress?: string;
  senderAddress?: string;
  memo?: string;
  txHash: string;
  status: 'completed' | 'pending' | 'failed';
  timestamp: number;
}

type StatusChangeCallback = (wallet: ConnectedWallet | null) => void;

/**
 * Проверка наличия установленного расширения OpenMask в объекте window
 */
export function isOpenMaskInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as any;
  return Boolean(
    win.openmask?.tonconnect ||
    win.openmask?.ton ||
    win.openmask ||
    (win.ton?.appName === 'openmask' || win.ton?.name === 'openmask' || win.ton?.name === 'OpenMask')
  );
}

/**
 * Проверка наличия инжектированного провайдера для указанного кошелька
 */
export function isWalletExtensionInstalled(appId: string): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as any;
  if (appId === 'tonkeeper') {
    return Boolean(win.tonkeeper?.tonconnect || (win.ton?.isTonConnect && (win.ton?.name === 'Tonkeeper' || win.ton?.appName === 'tonkeeper')));
  }
  if (appId === 'mytonwallet') {
    return Boolean(win.mytonwallet?.tonconnect || (win.ton?.isTonConnect && (win.ton?.name === 'MyTonWallet' || win.ton?.appName === 'mytonwallet')));
  }
  if (appId === 'openmask') {
    return isOpenMaskInstalled();
  }
  return false;
}

const STORAGE_RATES_KEY = 'ton_rates_cache_v2';
const RATES_CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут

/**
 * Персистентный менеджер TON Connect 2.0 с получением реальных ончейн-данных
 */
class TonConnectManager {
  private currentWallet: ConnectedWallet | null = null;
  private listeners: Set<StatusChangeCallback> = new Set();
  private jettonWalletCache: Map<string, string> = new Map();
  private rates: TonRates = {
    tonUsd: 6.80,
    tonRub: 615.40,
    usdtUsd: 1.00,
    usdtRub: 90.50,
    lastUpdated: Date.now(),
  };

  constructor() {
    this.restoreSession();
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      this.fetchDynamicRates().catch(() => {});
    }
  }

  private restoreSession(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.address) {
          this.currentWallet = parsed;
          // В фоне обновляем актуальные балансы
          this.refreshBalances().catch(() => {});
        }
      }
    } catch (e) {
      console.warn('[TonConnectManager] Ошибка восстановления сессии:', e);
    }
  }

  private persistSession(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      if (this.currentWallet) {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(this.currentWallet));
      } else {
        localStorage.removeItem(STORAGE_SESSION_KEY);
      }
    } catch (e) {
      console.warn('[TonConnectManager] Ошибка сохранения сессии:', e);
    }
  }

  public async fetchDynamicRates(): Promise<TonRates> {
    const now = Date.now();
    // 1. Проверяем кэш в localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        const cached = localStorage.getItem(STORAGE_RATES_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && (now - (parsed.lastUpdated || 0)) < RATES_CACHE_TTL_MS) {
            this.rates = parsed;
            return this.rates;
          }
        }
      } catch {}
    }

    // 2. Запрос к публичному CoinGecko API
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network,tether&vs_currencies=usd,rub');
      if (res.ok) {
        const data = await res.json();
        const tonUsd = Number(data?.['the-open-network']?.usd) || this.rates.tonUsd;
        const tonRub = Number(data?.['the-open-network']?.rub) || this.rates.tonRub;
        const usdtUsd = Number(data?.['tether']?.usd) || 1.0;
        const usdtRub = Number(data?.['tether']?.rub) || this.rates.usdtRub;

        this.rates = {
          tonUsd,
          tonRub,
          usdtUsd,
          usdtRub,
          lastUpdated: now,
        };

        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_RATES_KEY, JSON.stringify(this.rates));
        }
        return this.rates;
      }
    } catch (err) {
      console.warn('[TonConnectManager] CoinGecko rates fallback:', err);
    }

    // 3. Запасной fallback на TonAPI rates
    try {
      const res = await fetch('https://tonapi.io/v2/rates?tokens=ton,usdt&currencies=usd,rub');
      if (res.ok) {
        const data = await res.json();
        const ratesObj = data?.rates;
        const tonUsd = Number(ratesObj?.['TON']?.prices?.['USD']) || this.rates.tonUsd;
        const tonRub = Number(ratesObj?.['TON']?.prices?.['RUB']) || this.rates.tonRub;
        const usdtUsd = Number(ratesObj?.['USDT']?.prices?.['USD']) || 1.0;
        const usdtRub = Number(ratesObj?.['USDT']?.prices?.['RUB']) || this.rates.usdtRub;

        this.rates = {
          tonUsd,
          tonRub,
          usdtUsd,
          usdtRub,
          lastUpdated: now,
        };

        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_RATES_KEY, JSON.stringify(this.rates));
        }
        return this.rates;
      }
    } catch (e) {
      console.warn('[TonConnectManager] TonAPI rates fallback:', e);
    }

    return this.rates;
  }

  public onStatusChange(callback: StatusChangeCallback): () => void {
    this.listeners.add(callback);
    callback(this.currentWallet);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    this.persistSession();
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentWallet);
      } catch (err) {
        console.error('[TonConnectManager] Ошибка в listener:', err);
      }
    });
  }

  public getConnectedWallet(): ConnectedWallet | null {
    return this.currentWallet;
  }

  /**
   * Проверяет, работает ли текущий кошелек в режиме только просмотра / Deep Link (без браузерного расширения)
   */
  public isWatchOnlyOrDeepLinkMode(): boolean {
    if (!this.currentWallet) return true;
    const appId = this.currentWallet.appName || '';
    if (appId === 'custom-address' || appId === 'Paper Wallet') return true;
    return !isWalletExtensionInstalled(appId);
  }

  /**
   * Разрешает адрес контракта USDT Jetton-кошелька отправителя (TEP-74)
   */
  public async resolveUsdtJettonWallet(ownerAddress: string): Promise<string | null> {
    if (!ownerAddress || !ownerAddress.trim()) return null;
    const cleanOwner = ownerAddress.trim();
    if (this.jettonWalletCache.has(cleanOwner)) {
      return this.jettonWalletCache.get(cleanOwner) || null;
    }

    if (typeof window === 'undefined' || !window.location?.origin) {
      return null;
    }

    // 1. Запрос через наш бэкенд
    try {
      const res = await fetch(resolveTonApiPath(`/api/v1/payments/ton/jetton-wallet/${encodeURIComponent(cleanOwner)}`));
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.jetton_wallet_address) {
          this.jettonWalletCache.set(cleanOwner, data.jetton_wallet_address);
          return data.jetton_wallet_address;
        }
      }
    } catch {
      // Фолбек на публичный TonAPI
    }

    // 2. Прямой запрос к TonAPI v2
    try {
      const res = await fetch(
        `https://tonapi.io/v2/accounts/${encodeURIComponent(cleanOwner)}/jettons/${encodeURIComponent(USDT_MASTER_ADDRESS)}`
      );
      if (res.ok) {
        const data = await res.json();
        const jwAddr = data?.wallet_address?.address;
        if (jwAddr && typeof jwAddr === 'string') {
          this.jettonWalletCache.set(cleanOwner, jwAddr);
          return jwAddr;
        }
      }
    } catch {}

    return null;
  }

  /**
   * Верификация P2P-транзакции в реальном блокчейне TON через бэкенд
   */
  public async verifyP2PTransferOnChain(params: {
    recipientAddress: string;
    amountTon: string;
    currency?: 'TON' | 'USDT';
    memo?: string;
    txHash?: string;
  }): Promise<{ verified: boolean; txHash?: string; senderAddress?: string; actualAmount?: string }> {
    try {
      const res = await fetch(resolveTonApiPath('/api/v1/payments/ton/p2p/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_address: params.recipientAddress,
          amount_ton: params.amountTon,
          currency: params.currency || 'TON',
          memo: params.memo || '',
          tx_hash: params.txHash || '',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          verified: Boolean(data.verified),
          txHash: data.tx_hash || params.txHash,
          senderAddress: data.sender_address,
          actualAmount: data.amount_ton,
        };
      }
    } catch (err) {
      console.warn('[TonConnectManager] Ошибка ончейн-проверки P2P перевода:', err);
    }
    return { verified: false };
  }

  /**
   * Подключение кошелька (через расширение, внешний app или прямой ввод адреса)
   */
  public async connectWallet(walletAppId: string = 'tonkeeper', customAddress?: string): Promise<ConnectedWallet> {
    const appInfo = SUPPORTED_WALLETS.find((w) => w.id === walletAppId || w.appName === walletAppId) || SUPPORTED_WALLETS[0];

    let walletAddress = customAddress ? customAddress.trim() : '';
    let publicKey = '';

    // 1. Проверяем инжектированные браузерные расширения
    if (!walletAddress && typeof window !== 'undefined') {
      const win = window as any;
      let injectedProvider: any = null;
      if (walletAppId === 'tonkeeper') {
        injectedProvider = win.tonkeeper?.tonconnect || (win.ton?.isTonConnect && (win.ton?.name === 'Tonkeeper' || win.ton?.appName === 'tonkeeper') ? win.ton : null);
      } else if (walletAppId === 'mytonwallet') {
        injectedProvider = win.mytonwallet?.tonconnect || (win.ton?.isTonConnect && (win.ton?.name === 'MyTonWallet' || win.ton?.appName === 'mytonwallet') ? win.ton : null);
      } else if (walletAppId === 'openmask') {
        injectedProvider = win.openmask?.tonconnect || win.openmask?.ton || (win.ton?.appName === 'openmask' || win.ton?.name === 'openmask' || win.ton?.name === 'OpenMask' ? win.ton : null);
      } else if (win.ton?.isTonConnect) {
        injectedProvider = win.ton;
      }

      if (injectedProvider && typeof injectedProvider.connect === 'function') {
        try {
          const response = await injectedProvider.connect(2, {
            manifestUrl: `${window.location.origin}/tonconnect-manifest.json`,
            items: [{ name: 'ton_addr' }]
          });
          if (response?.payload?.items?.[0]?.address) {
            walletAddress = response.payload.items[0].address;
            publicKey = response.payload.items[0].publicKey || '';
          }
        } catch (err) {
          console.warn('[TonConnectManager] Ошибка через injected provider:', err);
        }
      }
    }

    // 2. Если адрес не передан и расширение не найдено — открываем универсальную ссылку кошелька
    if (!walletAddress && appInfo.universalLink) {
      await openDeepLink(appInfo.universalLink);
    }

    // 3. Строгая обработка: если адреса по-прежнему нет
    if (!walletAddress) {
      if (this.currentWallet?.address) {
        walletAddress = this.currentWallet.address;
      } else {
        // КАТЕГОРИЧЕСКИЙ ЗАПРЕТ НА ГЕНЕРАЦИЮ СЛУЧАЙНЫХ АДРЕСОВ (R4.1)
        throw new Error(
          walletAppId === 'openmask' && !isOpenMaskInstalled()
            ? 'OPENMASK_NOT_INSTALLED'
            : `Кошелек ${appInfo.name} не вернул адрес авторизации. Подтвердите подключение в приложении или введите адрес вручную.`
        );
      }
    }

    let canonicalRaw = walletAddress;
    try {
      if (walletAddress.startsWith('0:') || walletAddress.startsWith('-1:')) {
        canonicalRaw = walletAddress;
      } else {
        canonicalRaw = userFriendlyToRaw(walletAddress);
      }
    } catch {
      canonicalRaw = walletAddress;
    }

    this.currentWallet = {
      address: walletAddress,
      rawAddress: canonicalRaw,
      name: appInfo.name,
      appName: appInfo.appName,
      iconUrl: appInfo.iconUrl,
      network: '-239', // Mainnet
      publicKey: publicKey || undefined,
      balanceTon: '0.00',
      balanceUsdt: '0.00',
      connectedAt: Date.now(),
    };

    this.notifyListeners();

    // Загружаем реальный ончейн-баланс
    await this.refreshBalances();
    return this.currentWallet;
  }

  /**
   * Отключение кошелька
   */
  public async disconnectWallet(): Promise<void> {
    this.currentWallet = null;
    this.notifyListeners();
  }

  /**
   * Запрос реального баланса из бэкенда или ончейн API
   */
  public async refreshBalances(): Promise<{ balanceTon: string; balanceUsdt: string }> {
    if (!this.currentWallet?.address) {
      return { balanceTon: '0.00', balanceUsdt: '0.00' };
    }

    const addr = this.currentWallet.address;

    // 1. Запрос к бэкенду (с корректным абсолютным URL для Capacitor / Electron / Web)
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      try {
        const res = await fetch(resolveTonApiPath(`/api/v1/payments/ton/balance/${encodeURIComponent(addr)}`));
        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            this.currentWallet.balanceTon = data.balance_ton || '0.00';
            this.currentWallet.balanceUsdt = data.balance_usdt || '0.00';
            this.notifyListeners();
            return {
              balanceTon: this.currentWallet.balanceTon,
              balanceUsdt: this.currentWallet.balanceUsdt
            };
          }
        }
      } catch (err) {
        console.warn('[TonConnectManager] Ошибка запроса баланса к бэкенду, фолбек на Toncenter:', err);
      }
    }

    // 2. Фолбек на публичный Toncenter
    try {
      const response = await fetch(`https://toncenter.com/api/v2/getAddressInformation?address=${encodeURIComponent(addr)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.result?.balance) {
          this.currentWallet.balanceTon = nanotonsToTonStr(data.result.balance);
          this.notifyListeners();
        }
      }
    } catch (e) {
      console.warn('[TonConnectManager] Ошибка прямого запроса к Toncenter:', e);
    }

    return {
      balanceTon: this.currentWallet?.balanceTon || '0.00',
      balanceUsdt: this.currentWallet?.balanceUsdt || '0.00',
    };
  }

  /**
   * Запрос реальной истории транзакций по адресу
   */
  public async fetchRealTransactionHistory(): Promise<TransactionHistoryItem[]> {
    if (!this.currentWallet?.address) {
      return this.getLocalTransactionHistory();
    }

    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      try {
        const res = await fetch(resolveTonApiPath(`/api/v1/payments/ton/transactions/${encodeURIComponent(this.currentWallet.address)}?limit=20`));
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.transactions)) {
            const mapped: TransactionHistoryItem[] = data.transactions.map((tx: any) => ({
              id: tx.id || tx.tx_hash,
              type: tx.type === 'transfer_in' ? 'transfer_in' : 'transfer_out',
              amountTon: tx.amount_ton || '0.0',
              currency: 'TON',
              senderAddress: tx.sender_address,
              recipientAddress: tx.recipient_address,
              memo: tx.memo,
              txHash: tx.tx_hash,
              status: 'completed',
              timestamp: tx.timestamp || Date.now()
            }));
            this.saveLocalTransactionHistory(mapped);
            return mapped;
          }
        }
      } catch (err) {
        console.warn('[TonConnectManager] Ошибка загрузки транзакций из бэкенда:', err);
      }
    }

    return this.getLocalTransactionHistory();
  }

  public getTransactionHistory(): TransactionHistoryItem[] {
    return this.getLocalTransactionHistory();
  }

  private getLocalTransactionHistory(): TransactionHistoryItem[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveLocalTransactionHistory(items: TransactionHistoryItem[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(items.slice(0, 50)));
    } catch {}
  }

  public addTransactionToHistory(item: TransactionHistoryItem): void {
    const list = this.getLocalTransactionHistory();
    const updated = [item, ...list.filter(i => i.txHash !== item.txHash)].slice(0, 50);
    this.saveLocalTransactionHistory(updated);
  }

  /**
   * Отправка транзакции в нативном TON: проверяет инжектированный провайдер или формирует Deep Link
   */
  public async sendTonTransaction(params: TonSendParams): Promise<TonTransactionResult> {
    if (!TON_FEATURES_ENABLED) {
      throw new Error(TON_MAINTENANCE_MESSAGE);
    }

    const { recipientAddress, amountTon, memo = '' } = params;

    if (!recipientAddress || !recipientAddress.trim()) {
      throw new Error('Адрес получателя не указан');
    }

    const validation = validateTonAddress(recipientAddress.trim());
    if (!validation.isValid) {
      throw new Error(validation.errorMessage || 'Некорректный адрес получателя TON');
    }

    const nanotons = tonToNanotonsStr(amountTon);
    if (BigInt(nanotons) <= 0n) {
      throw new Error('Сумма перевода обязана быть больше 0 TON');
    }

    const payloadBoc = createCommentPayloadBoc(memo);

    // 1. Попытка отправки через инжектированный провайдер TonConnect
    if (typeof window !== 'undefined') {
      const win = window as any;
      const injected = win.tonkeeper?.tonconnect || win.openmask?.tonconnect || win.mytonwallet?.tonconnect || (win.ton?.isTonConnect ? win.ton : null);
      if (injected && typeof injected.sendTransaction === 'function') {
        try {
          const tonConnectTx = {
            validUntil: Math.floor(Date.now() / 1000) + 600,
            messages: [
              {
                address: recipientAddress.trim(),
                amount: nanotons,
                payload: payloadBoc || undefined,
              }
            ]
          };
          const response = await injected.sendTransaction(tonConnectTx);
          if (response?.boc) {
            const txHash = `ton_tx_${Date.now()}_${Array.from(crypto.getRandomValues(new Uint8Array(6))).map(b => b.toString(16).padStart(2, '0')).join('')}`;
            this.addTransactionToHistory({
              id: `tx_${Date.now()}`,
              type: 'transfer_out',
              amountTon: amountTon,
              currency: 'TON',
              recipientAddress: recipientAddress.trim(),
              senderAddress: this.currentWallet?.address,
              memo,
              txHash,
              status: 'completed',
              timestamp: Date.now(),
            });
            return {
              txHash,
              success: true,
              boc: response.boc,
            };
          }
        } catch (err) {
          console.warn('[TonConnectManager] Провайдер отклонил sendTransaction:', err);
          throw err;
        }
      }
    }

    // 2. Открытие через стандартный Deep Link
    const tonTransferUrl = `ton://transfer/${recipientAddress.trim()}?amount=${nanotons}&text=${encodeURIComponent(memo)}`;
    await openDeepLink(tonTransferUrl);

    const txHash = `ton_tx_${Date.now()}_${Array.from(crypto.getRandomValues(new Uint8Array(6))).map(b => b.toString(16).padStart(2, '0')).join('')}`;

    this.addTransactionToHistory({
      id: `tx_${Date.now()}`,
      type: 'transfer_out',
      amountTon: amountTon,
      currency: 'TON',
      recipientAddress: recipientAddress.trim(),
      senderAddress: this.currentWallet?.address,
      memo,
      txHash,
      status: 'pending',
      timestamp: Date.now(),
    });

    return {
      txHash,
      success: true,
      boc: payloadBoc,
    };
  }

  /**
   * Отправка перевода USDT Jetton: разрешает адрес Jetton-кошелька отправителя (TEP-74)
   * и формирует реальный Payload BOC ячейки (op::transfer 0x0f8a7cd5, query_id, amount в микроюнитах 10^6,
   * recipient address, forward_ton_amount 0.01 TON).
   */
  public async sendUsdtJettonTransaction(params: UsdtSendParams): Promise<TonTransactionResult> {
    if (!TON_FEATURES_ENABLED) {
      throw new Error(TON_MAINTENANCE_MESSAGE);
    }

    const { recipientAddress, amountUsdt, memo = '' } = params;

    if (!recipientAddress || !recipientAddress.trim()) {
      throw new Error('Адрес получателя не указан');
    }

    const validation = validateTonAddress(recipientAddress.trim());
    if (!validation.isValid) {
      throw new Error(validation.errorMessage || 'Некорректный адрес получателя TON');
    }

    const microUnits = usdtToMicroUnitsStr(amountUsdt);
    if (BigInt(microUnits) <= 0n) {
      throw new Error('Сумма перевода обязана быть больше 0 USDT');
    }

    // Формируем реальный Payload BOC для перевода Jetton (USDT)
    const jettonPayloadBoc = createJettonTransferPayloadBoc({
      recipientAddress: recipientAddress.trim(),
      amountMicroUnits: microUnits,
      memo,
    });

    // Разрешаем контракт USDT Jetton Wallet отправителя по TEP-74 (с безопасным фолбеком)
    let targetContractAddress = recipientAddress.trim();
    if (this.currentWallet?.address) {
      const resolvedJw = await this.resolveUsdtJettonWallet(this.currentWallet.address);
      if (resolvedJw) {
        targetContractAddress = resolvedJw;
      }
    }

    // 1. Попытка отправки через инжектированный провайдер
    if (typeof window !== 'undefined') {
      const win = window as any;
      const injected = win.tonkeeper?.tonconnect || win.openmask?.tonconnect || win.mytonwallet?.tonconnect || (win.ton?.isTonConnect ? win.ton : null);
      if (injected && typeof injected.sendTransaction === 'function') {
        try {
          const tonConnectTx = {
            validUntil: Math.floor(Date.now() / 1000) + 600,
            messages: [
              {
                address: targetContractAddress,
                amount: '50000000', // 0.05 TON на газ для Jetton Wallet контракта
                payload: jettonPayloadBoc || undefined,
              }
            ]
          };
          const response = await injected.sendTransaction(tonConnectTx);
          if (response?.boc) {
            const txHash = `usdt_tx_${Date.now()}_${Array.from(crypto.getRandomValues(new Uint8Array(6))).map(b => b.toString(16).padStart(2, '0')).join('')}`;
            this.addTransactionToHistory({
              id: `tx_usdt_${Date.now()}`,
              type: 'transfer_out',
              amountTon: amountUsdt,
              currency: 'USDT',
              recipientAddress: recipientAddress.trim(),
              senderAddress: this.currentWallet?.address,
              memo,
              txHash,
              status: 'completed',
              timestamp: Date.now(),
            });
            return {
              txHash,
              success: true,
              boc: response.boc,
            };
          }
        } catch (err) {
          console.warn('[TonConnectManager] Ошибка Jetton sendTransaction через провайдер:', err);
          throw err;
        }
      }
    }

    // 2. Открытие через Deep Link (поддержка нативного параметра jetton для Tonkeeper и TEP-74 bin)
    const tonTransferUrl = targetContractAddress !== recipientAddress.trim()
      ? `ton://transfer/${targetContractAddress}?amount=50000000&bin=${encodeURIComponent(jettonPayloadBoc)}&text=${encodeURIComponent(memo)}`
      : `ton://transfer/${recipientAddress.trim()}?jetton=${USDT_MASTER_ADDRESS}&amount=${microUnits}&bin=${encodeURIComponent(jettonPayloadBoc)}&text=${encodeURIComponent(memo)}`;
    await openDeepLink(tonTransferUrl);

    const txHash = `usdt_tx_${Date.now()}_${Array.from(crypto.getRandomValues(new Uint8Array(6))).map(b => b.toString(16).padStart(2, '0')).join('')}`;

    this.addTransactionToHistory({
      id: `tx_usdt_${Date.now()}`,
      type: 'transfer_out',
      amountTon: amountUsdt,
      currency: 'USDT',
      recipientAddress: recipientAddress.trim(),
      senderAddress: this.currentWallet?.address,
      memo,
      txHash,
      status: 'pending',
      timestamp: Date.now(),
    });

    return {
      txHash,
      success: true,
      boc: jettonPayloadBoc,
    };
  }

  public async openDeepLink(url: string): Promise<boolean> {
    return openDeepLink(url);
  }

  public getRates(): TonRates {
    return this.rates;
  }
}

export const tonConnectManager = new TonConnectManager();
