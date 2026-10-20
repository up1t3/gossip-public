// frontend/src/features/ton/tonAddressValidator.ts
/**
 * Модуль строгой криптографической валидации и конвертации адресов сети The Open Network (TON).
 * Поддерживает форматы:
 *  - User-Friendly (Base64 / Base64URL, 48 символов): EQ, UQ, kQ, 0Q, Ef, Uf
 *  - Raw Hex: 0:<64hex>, -1:<64hex>
 *  - Расчет и сверка контрольной суммы CRC16-CCITT (XMODEM, полином 0x1021)
 */

export interface TonAddressValidationResult {
  isValid: boolean;
  type?: 'user-friendly' | 'raw';
  workchain?: number;              // 0 (Basechain) или -1 (Masterchain)
  hexHash?: string;                // 64-символьный hex в нижнем регистре
  rawAddress?: string;             // 0:... или -1:...
  bounceableAddress?: string;      // 48-символьный Base64URL EQ... / Ef...
  nonBounceableAddress?: string;   // 48-символьный Base64URL UQ... / Uf...
  displayAddress?: string;         // Канонический нормализованный адрес
  isBounceable?: boolean;          // Флаг bounceable
  isTestnet?: boolean;             // Флаг testnet
  errorMessage?: string;           // Текст ошибки при isValid = false
}

// Таблица соответствия для Base64
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP = new Uint8Array(256);
for (let i = 0; i < 256; i++) B64_LOOKUP[i] = 255;
for (let i = 0; i < B64_CHARS.length; i++) {
  B64_LOOKUP[B64_CHARS.charCodeAt(i)] = i;
}
// URL-safe замены
B64_LOOKUP['-'.charCodeAt(0)] = 62; // '+'
B64_LOOKUP['_'.charCodeAt(0)] = 63; // '/'

/**
 * Вычисляет контрольную сумму CRC16-CCITT (XMODEM / CCITT-FALSE).
 * Полином 0x1021, начальное значение 0x0000, без реверса битов.
 */
export function crc16(data: Uint8Array): number {
  let crc = 0;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc;
}

/**
 * Декодирует Base64 / Base64URL строку в Uint8Array
 */
export function decodeBase64OrUrl(input: string): Uint8Array | null {
  const clean = input.trim();
  if (clean.length === 0) return null;

  // Проверяем допустимость символов
  let paddingCount = 0;
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    if (code === 61) { // '='
      paddingCount++;
      continue;
    }
    if (paddingCount > 0) {
      // Символы после '=' недопустимы
      return null;
    }
    if (code > 127 || B64_LOOKUP[code] === 255) {
      return null;
    }
  }

  // Восстанавливаем паддинг до кратности 4, если необходимо
  let padded = clean;
  while (padded.length % 4 !== 0) {
    padded += '=';
  }

  const outLen = Math.floor((padded.length * 3) / 4) - (padded.endsWith('==') ? 2 : padded.endsWith('=') ? 1 : 0);
  if (outLen <= 0) return null;

  const result = new Uint8Array(outLen);
  let outIdx = 0;

  for (let i = 0; i < padded.length; i += 4) {
    const c0 = padded.charCodeAt(i);
    const c1 = padded.charCodeAt(i + 1);
    const c2 = padded.charCodeAt(i + 2);
    const c3 = padded.charCodeAt(i + 3);

    if (
      c0 > 127 || c1 > 127 || c2 > 127 || c3 > 127 ||
      B64_LOOKUP[c0] === 255 ||
      B64_LOOKUP[c1] === 255 ||
      (c2 !== 61 && B64_LOOKUP[c2] === 255) ||
      (c3 !== 61 && B64_LOOKUP[c3] === 255)
    ) {
      return null;
    }

    const v0 = B64_LOOKUP[c0];
    const v1 = B64_LOOKUP[c1];
    const v2 = c2 === 61 ? 0 : B64_LOOKUP[c2];
    const v3 = c3 === 61 ? 0 : B64_LOOKUP[c3];

    const triple = (v0 << 18) | (v1 << 12) | (v2 << 6) | v3;

    if (outIdx < outLen) result[outIdx++] = (triple >> 16) & 0xff;
    if (outIdx < outLen && c2 !== 61) result[outIdx++] = (triple >> 8) & 0xff;
    if (outIdx < outLen && c3 !== 61) result[outIdx++] = triple & 0xff;
  }

  return result;
}

/**
 * Кодирует Uint8Array в Base64URL строку (без паддинга '=')
 */
export function encodeBase64Url(data: Uint8Array): string {
  let b64 = '';
  const len = data.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = data[i];
    const b1 = i + 1 < len ? data[i + 1] : 0;
    const b2 = i + 2 < len ? data[i + 2] : 0;

    const triple = (b0 << 16) | (b1 << 8) | b2;

    b64 += B64_CHARS[(triple >> 18) & 63];
    b64 += B64_CHARS[(triple >> 12) & 63];
    if (i + 1 < len) {
      b64 += B64_CHARS[(triple >> 6) & 63];
    }
    if (i + 2 < len) {
      b64 += B64_CHARS[triple & 63];
    }
  }

  // Заменяем + на - и / на _
  return b64.replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Преобразует Uint8Array в Hex строку
 */
function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Преобразует Hex строку в Uint8Array
 */
function hexToBytes(hex: string): Uint8Array | null {
  const cleanHex = hex.trim();
  if (cleanHex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(cleanHex)) {
    return null;
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Строгая валидация и полный разбор TON адреса
 */
export function validateTonAddress(input: string): TonAddressValidationResult {
  if (!input || typeof input !== 'string') {
    return { isValid: false, errorMessage: 'Адрес кошелька не указан или пуст' };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { isValid: false, errorMessage: 'Адрес кошелька не может состоять только из пробелов' };
  }

  // 1. Проверка формата Raw Hex (например, 0:83dfd55... или -1:333333...)
  const rawMatch = trimmed.match(/^(-?[0-9]+):([0-9a-fA-F]{64})$/);
  if (rawMatch) {
    const workchain = parseInt(rawMatch[1], 10);
    const hexHash = rawMatch[2].toLowerCase();

    if (workchain !== 0 && workchain !== -1) {
      return {
        isValid: false,
        errorMessage: `Недопустимый workchain ID: ${workchain}. Сеть TON поддерживает только workchain 0 (Basechain) и -1 (Masterchain)`
      };
    }

    const canonicalRaw = `${workchain}:${hexHash}`;
    const bounceable = rawToUserFriendly(canonicalRaw, true, false);
    const nonBounceable = rawToUserFriendly(canonicalRaw, false, false);

    return {
      isValid: true,
      type: 'raw',
      workchain,
      hexHash,
      rawAddress: canonicalRaw,
      bounceableAddress: bounceable,
      nonBounceableAddress: nonBounceable,
      displayAddress: nonBounceable,
      isBounceable: false,
      isTestnet: false
    };
  }

  // 2. Проверка User-Friendly формата (Base64 / Base64URL, ровно 48 символов)
  if (trimmed.length === 48) {
    const decoded = decodeBase64OrUrl(trimmed);
    if (!decoded) {
      return {
        isValid: false,
        errorMessage: 'Строка содержит недопустимые символы для Base64/Base64URL адреса'
      };
    }

    if (decoded.length !== 36) {
      return {
        isValid: false,
        errorMessage: `Неверный бинарный размер адреса: декодировано ${decoded.length} байт (требуется ровно 36 байт)`
      };
    }

    // Проверка контрольной суммы CRC16
    const payload = decoded.subarray(0, 34);
    const calculatedCrc = crc16(payload);
    const expectedCrc = (decoded[34] << 8) | decoded[35];

    if (calculatedCrc !== expectedCrc) {
      return {
        isValid: false,
        errorMessage: `Ошибка контрольной суммы CRC16: получено 0x${expectedCrc.toString(16).padStart(4, '0')}, ожидалось 0x${calculatedCrc.toString(16).padStart(4, '0')}. Проверьте правильность адреса.`
      };
    }

    const flags = decoded[0];
    const wcByte = decoded[1];
    // Преобразуем байт воркчейна в знаковое число (0xFF -> -1)
    const workchain = (wcByte === 0xFF || wcByte === 255) ? -1 : (wcByte > 127 ? wcByte - 256 : wcByte);

    if (workchain !== 0 && workchain !== -1) {
      return {
        isValid: false,
        errorMessage: `Недопустимый workchain ID: ${workchain} (байт 0x${wcByte.toString(16)}). Поддерживаются только 0 и -1`
      };
    }

    const isTestnet = (flags & 0x80) !== 0;
    const isBounceable = (flags & 0x40) === 0;

    const accountBytes = decoded.subarray(2, 34);
    const hexHash = bytesToHex(accountBytes);
    const rawAddress = `${workchain}:${hexHash}`;

    const bounceableAddress = rawToUserFriendly(rawAddress, true, isTestnet);
    const nonBounceableAddress = rawToUserFriendly(rawAddress, false, isTestnet);

    return {
      isValid: true,
      type: 'user-friendly',
      workchain,
      hexHash,
      rawAddress,
      bounceableAddress,
      nonBounceableAddress,
      displayAddress: trimmed,
      isBounceable,
      isTestnet
    };
  }

  // Если длина не 48 и не совпал regex Raw
  if (trimmed.includes(':')) {
    return {
      isValid: false,
      errorMessage: 'Неверный формат Raw адреса. Ожидается <workchain>:<64 hex символа>'
    };
  }

  return {
    isValid: false,
    errorMessage: `Неверная длина адреса: ${trimmed.length} символов (требуется 48 символов для User-Friendly или 66-67 для Raw)`
  };
}

/**
 * Быстрая булева проверка валидности адреса
 */
export function isValidTonAddress(address: string): boolean {
  return validateTonAddress(address).isValid;
}

/**
 * Конвертация Raw Hex адреса в User-Friendly (Base64URL)
 */
export function rawToUserFriendly(
  rawAddress: string,
  isBounceable: boolean = true,
  isTestnet: boolean = false
): string {
  const match = rawAddress.trim().match(/^(-?[0-9]+):([0-9a-fA-F]{64})$/);
  if (!match) {
    throw new Error(`Недопустимый формат Raw адреса: "${rawAddress}". Ожидается <workchain>:<64 hex символа>`);
  }

  const workchain = parseInt(match[1], 10);
  const hexHash = match[2];
  const accountBytes = hexToBytes(hexHash);
  if (!accountBytes || accountBytes.length !== 32) {
    throw new Error(`Недопустимый hexHash: "${hexHash}"`);
  }

  // Определение флагов (байт 0)
  // Basechain/Masterchain Bounceable Mainnet: 0x11 (17)
  // Basechain/Masterchain Non-bounceable Mainnet: 0x51 (81)
  // Testnet Bounceable: 0x91 (145)
  // Testnet Non-bounceable: 0xD1 (209)
  let flags = 0x11;
  if (isTestnet) {
    flags = isBounceable ? 0x91 : 0xD1;
  } else {
    flags = isBounceable ? 0x11 : 0x51;
  }

  // Байт воркчейна (байт 1)
  const wcByte = workchain === -1 ? 0xff : (workchain & 0xff);

  // Собираем первые 34 байта
  const data = new Uint8Array(36);
  data[0] = flags;
  data[1] = wcByte;
  data.set(accountBytes, 2);

  // Вычисляем CRC16 от первых 34 байт
  const crc = crc16(data.subarray(0, 34));
  data[34] = (crc >> 8) & 0xff;
  data[35] = crc & 0xff;

  return encodeBase64Url(data);
}

/**
 * Конвертация User-Friendly адреса в Raw Hex (<workchain>:<64hex>)
 */
export function userFriendlyToRaw(userFriendlyAddress: string): string {
  const result = validateTonAddress(userFriendlyAddress);
  if (!result.isValid || !result.rawAddress) {
    throw new Error(result.errorMessage || `Недопустимый адрес TON: "${userFriendlyAddress}"`);
  }
  return result.rawAddress;
}

/**
 * Нормализация адреса TON в целевой формат
 */
export function normalizeTonAddress(
  address: string,
  targetFormat: 'bounceable' | 'nonBounceable' | 'raw' = 'nonBounceable'
): string {
  const result = validateTonAddress(address);
  if (!result.isValid) {
    return address.trim();
  }

  if (targetFormat === 'raw') {
    return result.rawAddress || address.trim();
  }
  if (targetFormat === 'bounceable') {
    return result.bounceableAddress || address.trim();
  }
  return result.nonBounceableAddress || address.trim();
}

