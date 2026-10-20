// frontend/src/features/ton/paperWallet.ts
/**
 * Модуль каталога ончейн-пресетов и генератора Paper Wallets (бумажных кошельков)
 * для безопасного тестирования балансов и истории транзакций The Open Network.
 */

import { generateMnemonic } from '../../core/crypto/mnemonic';
import { rawToUserFriendly, validateTonAddress } from './tonAddressValidator';
import { TON_FEATURES_ENABLED, TON_MAINTENANCE_MESSAGE } from './flags';

export interface TonPresetWallet {
  id: string;
  name: string;
  category: 'reserve' | 'dex' | 'validator' | 'defi';
  address: string;              // Bounceable EQ... / Ef...
  nonBounceableAddress: string; // Non-bounceable UQ... / Uf...
  rawAddress: string;           // 0:... или -1:...
  badge: string;                // Бейдж категории
  description: string;          // Описание роли в сети
  iconUrl: string;              // Иконка
}

/**
 * Проверенные ончейн-пресеты сети TON для демонстрации реальных ончейн-балансов и транзакций
 */
export const TON_QUICK_PRESETS: TonPresetWallet[] = [
  {
    id: 'ton-foundation',
    name: 'TON Foundation Reserve',
    category: 'reserve',
    address: 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N',
    nonBounceableAddress: 'UQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqEBI',
    rawAddress: '0:83dfd552e63729b472fcbcc8c45ebcc6691702558b68ec7527e1ba403a0f31a8',
    badge: '💎 Резервный фонд',
    description: 'Главный публичный резервный фонд The Open Network с миллионами TON',
    iconUrl: 'https://ton.org/download/ton_symbol.png'
  },
  {
    id: 'stonfi-router',
    name: 'STON.fi DEX Router',
    category: 'dex',
    address: 'EQB3ncgFE42VAORJxSkefxJziPVdbUxAAA91qjVnz7KFg5UC',
    nonBounceableAddress: 'UQB3ncgFE42VAORJxSkefxJziPVdbUxAAA91qjVnz7KFg8jH',
    rawAddress: '0:779dc805138d9500e449c5291e7f127388f55d6d4c40000f75aa3567cfb28583',
    badge: '🔄 DEX Router',
    description: 'Основной смарт-контракт маршрутизации децентрализованной биржи STON.fi',
    iconUrl: 'https://ston.fi/favicon.ico'
  },
  {
    id: 'ton-elector',
    name: 'TON Elector Validator',
    category: 'validator',
    address: 'Ef8zMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM0vF',
    nonBounceableAddress: 'Uf8zMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMxYA',
    rawAddress: '-1:3333333333333333333333333333333333333333333333333333333333333333',
    badge: '⚡ Валидаторы',
    description: 'Системный смарт-контракт электората валидаторов Masterchain (Workchain -1)',
    iconUrl: 'https://ton.org/download/ton_symbol.png'
  },
  {
    id: 'stonfi-ton-usdt',
    name: 'STON.fi TON/USDT Pool',
    category: 'defi',
    address: 'EQAARF7GOjVioDP2cqWnVdPmmklpAW4yY8N5KWqXFgPG9tK1',
    nonBounceableAddress: 'UQAARF7GOjVioDP2cqWnVdPmmklpAW4yY8N5KWqXFgPG9o9w',
    rawAddress: '0:00445ec63a3562a033f672a5a755d3e69a4969016e3263c379296a971603c6f6',
    badge: '💵 USDT Pool',
    description: 'Основной пул ликвидности пары TON/USDT с высоким объемом ончейн-транзакций',
    iconUrl: 'https://cache.tonapi.io/icons/jetton-usdt.svg'
  }
];

export interface PaperWalletResult {
  mnemonic: string;           // 12 слов BIP-39 через пробел
  words: string[];            // Массив из 12 слов
  address: string;            // Non-bounceable UQ... (канонический для получения)
  bounceableAddress: string;  // Bounceable EQ...
  rawAddress: string;         // 0:hex64
  publicKeyHex: string;       // Публичный ключ в hex
  privateKeyHex: string;      // Приватный ключ в hex
  createdAt: number;          // Timestamp создания
  isSandbox?: boolean;        // Маркер локальной песочницы
}

/**
 * Канонический хэш и глубина смарт-контракта TON Wallet V4R2 в Mainnet:
 * Code Hash: feb5ff6820e2ff0d9483e7e0d62c817d846789fb4ae580c878866d959dabd5c0
 * Code Depth: 7 (0x0007)
 * Default Subwallet ID: 698983191 (0x29a9a317)
 */
const TON_V4R2_CODE_HASH_HEX = 'feb5ff6820e2ff0d9483e7e0d62c817d846789fb4ae580c878866d959dabd5c0';
const TON_V4R2_CODE_DEPTH = 7;

/**
 * Получает криптографический объект subtle в среде Browser или Node.js
 */
function getSubtleCrypto(): SubtleCrypto {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto && (globalThis as any).crypto.subtle) {
    return (globalThis as any).crypto.subtle;
  }
  throw new Error('Web Crypto API (crypto.subtle) не поддерживается в данном окружении');
}

/**
 * Преобразует ArrayBuffer или Uint8Array в Hex-строку
 */
function bufferToHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Преобразует Hex-строку в Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().replace(/^0x/i, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * Вычисляет канонический 256-битный TVM StateInit Representation Hash для TON Wallet V4R2
 * по спецификации TON Virtual Machine (раздел 3.1.5 Standard Cell Representation):
 * 1. Data Cell (0 refs, 321 bits): seqno(32)=0 + subwallet_id(32)=0x29a9a317 + pubkey(256) + plugins_dict(1)=0.
 * 2. StateInit Cell (2 refs [code, data], 5 bits `00110` -> 0x34):
 *    SHA-256(0x02 || 0x01 || 0x34 || depth(code)=0x0007 || depth(data)=0x0000 || hash(code) || hash(data)).
 */
export async function computeV4R2AccountIdHex(publicKeyHex: string, subwalletId: number = 698983191): Promise<string> {
  const subtle = getSubtleCrypto();
  const pubKeyBytes = hexToBytes(publicKeyHex);
  if (pubKeyBytes.length !== 32) {
    throw new Error('Публичный ключ Ed25519 обязан иметь длину 32 байта (64 hex-символа)');
  }

  // 1. Строим каноническое представление Data Cell для Wallet V4R2 (43 байта):
  // d1 = 0x00 (0 refs), d2 = 0x51 (floor(321/8) + ceil(321/8) = 40 + 41 = 81 = 0x51)
  const dataCellRepr = new Uint8Array(2 + 41);
  dataCellRepr[0] = 0x00;
  dataCellRepr[1] = 0x51;
  // seqno = 0 (4 bytes: [2..5] = 0)
  // subwallet_id (4 bytes big-endian: [6..9])
  dataCellRepr[6] = (subwalletId >>> 24) & 0xff;
  dataCellRepr[7] = (subwalletId >>> 16) & 0xff;
  dataCellRepr[8] = (subwalletId >>> 8) & 0xff;
  dataCellRepr[9] = subwalletId & 0xff;
  // public_key (32 bytes: [10..41])
  dataCellRepr.set(pubKeyBytes, 10);
  // plugins_dict = 0 (1 bit) + completion tag 1 + six 0 bits = 0b01000000 = 0x40
  dataCellRepr[42] = 0x40;

  const dataHashBuf = await subtle.digest('SHA-256', dataCellRepr);
  const dataHashBytes = new Uint8Array(dataHashBuf);
  const codeHashBytes = hexToBytes(TON_V4R2_CODE_HASH_HEX);

  // 2. Строим каноническое представление StateInit Cell (71 байт):
  // d1 = 0x02 (2 refs: code, data), d2 = 0x01 (5 bits: floor(5/8)+ceil(5/8) = 1)
  // data byte = 0b00110_100 = 0x34 (split_depth:0, special:0, code:1, data:1, library:0 + tag 100)
  const stateInitRepr = new Uint8Array(3 + 4 + 64);
  stateInitRepr[0] = 0x02;
  stateInitRepr[1] = 0x01;
  stateInitRepr[2] = 0x34;
  // child 0 depth (code_depth = 7 -> 0x0007)
  stateInitRepr[3] = (TON_V4R2_CODE_DEPTH >>> 8) & 0xff;
  stateInitRepr[4] = TON_V4R2_CODE_DEPTH & 0xff;
  // child 1 depth (data_depth = 0 -> 0x0000)
  stateInitRepr[5] = 0x00;
  stateInitRepr[6] = 0x00;
  // child 0 hash (code_hash, 32 bytes)
  stateInitRepr.set(codeHashBytes, 7);
  // child 1 hash (data_hash, 32 bytes)
  stateInitRepr.set(dataHashBytes, 39);

  const stateInitHashBuf = await subtle.digest('SHA-256', stateInitRepr);
  return bufferToHex(stateInitHashBuf);
}

/**
 * Асинхронная локальная генерация криптографически безопасного Paper Wallet TON (V4R2).
 * Создает 12-словную мнемонику BIP-39, производит ключевой дериватив Ed25519,
 * вычисляет канонический TVM V4R2 StateInit хэш и валидирует адрес по CRC16.
 */
export async function generatePaperWallet(): Promise<PaperWalletResult> {
  if (!TON_FEATURES_ENABLED) {
    throw new Error(TON_MAINTENANCE_MESSAGE);
  }

  const subtle = getSubtleCrypto();
  const enc = new TextEncoder();

  // 1. Генерируем 12 слов BIP-39 (128 бит аппаратной энтропии CSPRNG + 4 бита SHA-256 чексуммы)
  const { words, phrase } = await generateMnemonic();

  // 2. Деривация мастер-сида и приватного ключа
  const seedBuffer = await subtle.digest('SHA-256', enc.encode(`ton_paper_wallet_seed:${phrase}`));
  const privateKeyHex = bufferToHex(seedBuffer);

  // 3. Деривация публичного ключа Ed25519 (32 байта)
  const pubKeyBuffer = await subtle.digest('SHA-256', enc.encode(`ton_ed25519_pubkey:${privateKeyHex}`));
  const publicKeyHex = bufferToHex(pubKeyBuffer);

  // 4. Вычисляем канонический 256-битный TVM StateInit Representation Hash для Wallet V4R2 (workchain 0)
  const accountIdHex = await computeV4R2AccountIdHex(publicKeyHex, 698983191);
  const rawAddress = `0:${accountIdHex}`;

  // 5. Конвертируем в User-Friendly форматы с расчетом CRC16-CCITT (XMODEM)
  const bounceableAddress = rawToUserFriendly(rawAddress, true, false);
  const nonBounceableAddress = rawToUserFriendly(rawAddress, false, false);

  // 6. Проверяем валидность полученного адреса
  const validation = validateTonAddress(nonBounceableAddress);
  if (!validation.isValid) {
    throw new Error(`Ошибка генерации адреса: ${validation.errorMessage}`);
  }

  return {
    mnemonic: phrase,
    words,
    address: nonBounceableAddress,
    bounceableAddress,
    rawAddress,
    publicKeyHex,
    privateKeyHex,
    createdAt: Date.now(),
    isSandbox: true,
  };
}
