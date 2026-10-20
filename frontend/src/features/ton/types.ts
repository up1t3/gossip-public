// frontend/src/features/ton/types.ts

/**
 * Типы и интерфейсы для экосистемы The Open Network (TON Connect 2.0, Wallet Hub, In-Chat Transfers, Invoices)
 */

export interface ConnectedWallet {
  address: string;            // User-friendly адрес (UQ... / EQ...)
  rawAddress?: string;        // Raw адрес (0:...)
  name: string;               // Название кошелька (Tonkeeper, MyTonWallet, OpenMask, Telegram Wallet)
  appName: string;            // Системный идентификатор (tonkeeper, mytonwallet, openmask, telegram-wallet)
  iconUrl: string;            // Иконка кошелька
  network: string;            // -239 (Mainnet), -3 (Testnet)
  publicKey?: string;         // Публичный ключ кошелька
  balanceTon: string;         // Текущий баланс TON (строка с десятичной точкой)
  balanceUsdt: string;        // Текущий баланс USDT Jetton (строка)
  connectedAt: number;        // Timestamp подключения (мс)
}

export interface WalletAppInfo {
  id: string;
  name: string;
  appName: string;
  iconUrl: string;
  universalLink: string;
  deepLinkPrefix: string;
  aboutUrl?: string;
  chromeWebStoreUrl?: string;
  description: string;
  isPopular?: boolean;
}

export interface TonSendParams {
  recipientAddress: string;
  amountTon: string;
  memo?: string;
}

export interface UsdtSendParams {
  recipientAddress: string;
  amountUsdt: string;
  memo?: string;
}

export interface TonTransactionResult {
  txHash: string;
  success: boolean;
  boc?: string;
  errorMessage?: string;
}

export interface TonInvoice {
  invoiceId: string;
  title: string;
  description?: string;
  amountTon: string;
  amountNanotons: string;
  currency: 'TON' | 'USDT';
  recipientAddress: string;
  memo: string;
  status: 'pending' | 'completed' | 'expired' | 'canceled';
  chatId?: string;
  botId?: number;
  txHash?: string;
  createdAt: string;
  expiresAt?: string;
  deepLink?: string;
  tonkeeperLink?: string;
  paidAt?: string;
}

export interface TonTransferReceipt {
  receiptId: string;
  txHash: string;
  senderId: string;
  recipientId: string;
  chatId: string;
  amountTon: string;
  amountNanotons: string;
  currency: 'TON' | 'USDT';
  memo?: string;
  senderAddress?: string;
  recipientAddress?: string;
  status: 'completed' | 'pending';
  createdAt: string;
}

export interface TonRates {
  tonUsd: number;
  tonRub: number;
  usdtUsd: number;
  usdtRub: number;
  lastUpdated: number;
}
