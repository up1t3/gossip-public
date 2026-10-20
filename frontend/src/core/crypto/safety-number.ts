// frontend/src/core/crypto/safety-number.ts
/**
 * Safety Numbers (60 десятичных цифр) & QR-верификация ключей E2EE (M3.2 / RFC-2026-004)
 * Стандарт: 5200 раундов SHA-512 над отсортированными Identity Keys участников.
 */

import QRCode from "qrcode";

export interface SafetyNumberUser {
  id: string;
  identityKeyHex: string;
  identityKeyECDSAHex?: string;
}

export interface QRPayload {
  v: number;
  app: string;
  uid: string;
  ikX25519: string;
  ikECDSA?: string;
  sn: string;
}

export interface QRVerificationResult {
  valid: boolean;
  peerId: string;
  safetyNumber: string;
  error?: string;
}

/**
 * Очистка и нормализация hex-строки
 */
export function cleanHex(hex?: string | null): string {
  if (!hex) return "";
  return hex.replace(/[^0-9a-fA-F]/g, "").toLowerCase();
}

/**
 * Конвертация Hex -> Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const clean = cleanHex(hex);
  const len = Math.floor(clean.length / 2);
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Конвертация Uint8Array -> Hex
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Кросс-платформенный SHA-512 (быстрый в Node/vitest, нативный в браузере через WebCrypto)
 */
export async function sha512(data: Uint8Array): Promise<Uint8Array> {
  if (typeof process !== "undefined" && process.versions && process.versions.node) {
    try {
      const nodeCrypto = await import("crypto");
      const hash = nodeCrypto.createHash("sha512").update(Buffer.from(data)).digest();
      return new Uint8Array(hash.buffer, hash.byteOffset, hash.byteLength);
    } catch {
      // Fallback к subtle
    }
  }

  if (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.subtle) {
    const hashBuffer = await globalThis.crypto.subtle.digest("SHA-512", data as any);
    return new Uint8Array(hashBuffer);
  }

  throw new Error("[SafetyNumber] Криптографическое окружение недоступно (нет WebCrypto / Node Crypto)");
}

/**
 * Удаление пробелов и форматирования, оставляет только 60 цифр
 */
export function unformatSafetyNumber(formatted: string): string {
  if (!formatted) return "";
  return formatted.replace(/\D/g, "");
}

/**
 * Форматирование 60 цифр в 12 блоков по 5 цифр через пробел
 */
export function formatSafetyNumber(raw: string): string {
  const digits = unformatSafetyNumber(raw);
  if (!digits) return "";
  const blocks: string[] = [];
  for (let i = 0; i < digits.length; i += 5) {
    blocks.push(digits.substring(i, Math.min(i + 5, digits.length)));
  }
  return blocks.join(" ");
}

/**
 * Сравнение двух Safety Numbers с игнорированием пробелов и разделителей
 */
export function verifySafetyNumber(sn1: string, sn2: string): boolean {
  const d1 = unformatSafetyNumber(sn1);
  const d2 = unformatSafetyNumber(sn2);
  return d1.length === 60 && d2.length === 60 && d1 === d2;
}

/**
 * Вычисление Safety Number (60 цифр) для двух участников:
 * 1. Симметричная сортировка участников по identityKeyHex (или id при совпадении).
 * 2. Конкатенация байтов публичных ключей (X25519 + опциональный ECDSA).
 * 3. 5200 раундов SHA-512 (SHA-512(H_{i-1})).
 * 4. Модульная редукция 60 байт дайджеста в 12 блоков по 5 цифр (Big-endian uint40 % 100000).
 */
export async function calculateSafetyNumber(
  userA: SafetyNumberUser,
  userB: SafetyNumberUser
): Promise<string> {
  if (!userA || !userB) {
    throw new Error("[SafetyNumber] Оба участника (userA, userB) обязаны быть переданы");
  }

  const keyA = cleanHex(userA.identityKeyHex) || (userA.id ? userA.id.toLowerCase() : "");
  const keyB = cleanHex(userB.identityKeyHex) || (userB.id ? userB.id.toLowerCase() : "");

  // Симметричная сортировка участников
  const [first, second] = keyA <= keyB ? [userA, userB] : [userB, userA];

  const firstKeyHex = cleanHex(first.identityKeyHex) + cleanHex(first.identityKeyECDSAHex || "");
  const secondKeyHex = cleanHex(second.identityKeyHex) + cleanHex(second.identityKeyECDSAHex || "");

  let b1 = hexToBytes(firstKeyHex);
  let b2 = hexToBytes(secondKeyHex);

  if (b1.length === 0 && first.id) {
    b1 = new TextEncoder().encode(first.id);
  }
  if (b2.length === 0 && second.id) {
    b2 = new TextEncoder().encode(second.id);
  }

  const combined = new Uint8Array(b1.length + b2.length);
  combined.set(b1, 0);
  combined.set(b2, b1.length);

  if (combined.length === 0) {
    throw new Error("[SafetyNumber] Не удалось извлечь публичные ключи участников");
  }

  // 5200 итераций SHA-512
  let digest: Uint8Array = combined;

  // Оптимизированный путь для Node.js / тестов
  if (typeof process !== "undefined" && process.versions && process.versions.node) {
    try {
      const nodeCrypto = await import("crypto");
      let buf: Buffer = Buffer.from(combined);
      for (let i = 0; i < 5200; i++) {
        buf = nodeCrypto.createHash("sha512").update(buf).digest();
      }
      digest = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    } catch {
      for (let i = 0; i < 5200; i++) {
        digest = new Uint8Array(await sha512(digest));
      }
    }
  } else {
    for (let i = 0; i < 5200; i++) {
      digest = new Uint8Array(await sha512(digest));
    }
  }

  // 12 блоков по 5 цифр (из первых 60 байт дайджеста)
  const blocks: string[] = [];
  for (let j = 0; j < 12; j++) {
    const offset = j * 5;
    const b0 = BigInt(digest[offset]);
    const b1 = BigInt(digest[offset + 1]);
    const b2 = BigInt(digest[offset + 2]);
    const b3 = BigInt(digest[offset + 3]);
    const b4 = BigInt(digest[offset + 4]);
    const num = ((b0 << 32n) | (b1 << 24n) | (b2 << 16n) | (b3 << 8n) | b4) % 100000n;
    blocks.push(num.toString().padStart(5, "0"));
  }

  return blocks.join(" ");
}

/**
 * Генерация QR-пейлоада для экрана верификации
 */
export function generateQRPayload(myUser: SafetyNumberUser, safetyNumber: string): string {
  const payload: QRPayload = {
    v: 1,
    app: "gossip",
    uid: myUser.id,
    ikX25519: cleanHex(myUser.identityKeyHex),
    ikECDSA: cleanHex(myUser.identityKeyECDSAHex || ""),
    sn: unformatSafetyNumber(safetyNumber)
  };
  return JSON.stringify(payload);
}

/**
 * Верификация отсканированного QR-кода собеседника
 */
export async function verifyQRPayload(
  scannedJson: string,
  myUser: SafetyNumberUser
): Promise<QRVerificationResult> {
  try {
    if (!scannedJson || typeof scannedJson !== "string") {
      return { valid: false, peerId: "", safetyNumber: "", error: "Пустой QR payload" };
    }

    const parsed: QRPayload = JSON.parse(scannedJson);

    if (parsed.app !== "gossip" || parsed.v !== 1) {
      return { valid: false, peerId: parsed.uid || "", safetyNumber: "", error: "Неверный формат или неподдерживаемое приложение" };
    }

    if (!parsed.uid || !parsed.ikX25519 || !parsed.sn) {
      return { valid: false, peerId: parsed.uid || "", safetyNumber: "", error: "Неполные данные в QR payload" };
    }

    const peerUser: SafetyNumberUser = {
      id: parsed.uid,
      identityKeyHex: parsed.ikX25519,
      identityKeyECDSAHex: parsed.ikECDSA
    };

    const calculatedSN = await calculateSafetyNumber(myUser, peerUser);
    const isValid = verifySafetyNumber(calculatedSN, parsed.sn);

    return {
      valid: isValid,
      peerId: parsed.uid,
      safetyNumber: calculatedSN,
      error: isValid ? undefined : "Safety Number не совпадает"
    };
  } catch (err: any) {
    return {
      valid: false,
      peerId: "",
      safetyNumber: "",
      error: `Ошибка разбора QR payload: ${err?.message || String(err)}`
    };
  }
}

/**
 * Генерация Data URL для QR-кода
 */
export async function generateQRDataUrl(text: string): Promise<string> {
  return await QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280,
    color: {
      dark: "#000000",
      light: "#FFFFFF"
    }
  });
}
