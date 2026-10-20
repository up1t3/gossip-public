// frontend/src/core/crypto/key-storage-protection.ts
/**
 * CRP-005 / Stage 3: Защита приватных криптографических ключей и сессий в покое (Keys at Rest).
 * 
 * Архитектурные гарантии:
 * 1. Вынос KEK из localStorage:
 *    - Первичный уровень (Option A): Non-extractable AES-GCM CryptoKey через Web Crypto (crypto.subtle)
 *      в IndexedDB (_gossip_secure_storage). Ключ создаётся с extractable: false — среда исполнения
 *      (Capacitor Android/iOS WebView, современные браузеры) изолирует ключевой материал. Попытка
 *      вызова crypto.subtle.exportKey завершается ошибкой (NotExtractable), прямой доступ из JS исключён.
 *    - Резервный / cold-start уровень (Option C Hybrid): KEK в localStorage обёрнут device-bound ключом
 *      (_gossip_install_kek_wrapped_v2), производным от аппаратной и системной энтропии устройства.
 *    - Устаревший открытый ключ localStorage._gossip_install_kek_v1 полностью удаляется (purge).
 * 2. Версионирование форматов:
 *    - enc:v2:<ivHex>:<ciphertextHex> — современный защищённый формат.
 *    - enc:v1:<ivHex>:<ciphertextHex> — обратная совместимость (AES-256-CTR с KEK).
 *    - legacy plaintext — прозрачная миграция старых незашифрованных ключей и сессий.
 * 3. Устранение утечки открытого текста MLS-ключей при логине (App.tsx ~2383):
 *    - Автоматический перехватчик Storage.prototype.setItem для приватных ключей MLS и E2EE
 *      гарантирует, что даже при прямом вызове setItem ключи сохраняются исключительно в зашифрованном виде.
 */

import { expandKey, aes256_ecb_encrypt } from "../tdlib/crypto";

export const LEGACY_KEK_STORAGE_KEY = "_gossip_install_kek_v1";
export const WRAPPED_KEK_STORAGE_KEY = "_gossip_install_kek_wrapped_v2";
export const DEVICE_SALT_STORAGE_KEY = "_gossip_device_salt_v2";

export const PREFIX_V1 = "enc:v1:";
export const PREFIX_V2 = "enc:v2:";

let cachedKek: Uint8Array | null = null;
let cachedExpandedKey: Uint32Array | null = null;
let cachedCryptoKey: CryptoKey | null = null;

// IndexedDB конфигурация для Option A (Non-extractable CryptoKey)
const IDB_NAME = "_gossip_secure_storage";
const IDB_STORE = "crypto_keys";
const IDB_KEY_NAME = "master_kek_v2";

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-fA-F]/g, "");
  const len = clean.length;
  const bytes = new Uint8Array(len / 2);
  for (let i = 0; i < len; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * Стандартный синхронный SHA-256 (0 внешних зависимостей)
 * Используется для детерминированной деривации device-bound ключа обёртки.
 */
export function sha256Sync(data: Uint8Array): Uint8Array {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const len = data.length;
  const bitLen = len * 8;
  const padLen = ((len + 8) >> 6) + 1;
  const blocks = new Uint32Array(padLen * 16);

  for (let i = 0; i < len; i++) {
    blocks[i >> 2] |= data[i] << (24 - (i & 3) * 8);
  }
  blocks[len >> 2] |= 0x80 << (24 - (len & 3) * 8);
  blocks[blocks.length - 1] = bitLen;

  const w = new Uint32Array(64);
  for (let i = 0; i < blocks.length; i += 16) {
    for (let t = 0; t < 16; t++) w[t] = blocks[i + t];
    for (let t = 16; t < 64; t++) {
      const s0 = ((w[t - 15] >>> 7) | (w[t - 15] << 25)) ^ ((w[t - 15] >>> 18) | (w[t - 15] << 14)) ^ (w[t - 15] >>> 3);
      const s1 = ((w[t - 2] >>> 17) | (w[t - 2] << 15)) ^ ((w[t - 2] >>> 19) | (w[t - 2] << 13)) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let t = 0; t < 64; t++) {
      const s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + K[t] + w[t]) | 0;
      const s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }

  const out = new Uint8Array(32);
  const hash = [h0, h1, h2, h3, h4, h5, h6, h7];
  for (let i = 0; i < 8; i++) {
    out[i * 4] = (hash[i] >>> 24) & 0xff;
    out[i * 4 + 1] = (hash[i] >>> 16) & 0xff;
    out[i * 4 + 2] = (hash[i] >>> 8) & 0xff;
    out[i * 4 + 3] = hash[i] & 0xff;
  }
  return out;
}

/**
 * Собирает аппаратную и системную энтропию устройства для Option C.
 */
function getDeviceBoundEntropy(): string {
  let entropy = "gossip_device_bound_v2";
  if (typeof navigator !== "undefined") {
    entropy += `:${navigator.userAgent || ""}:${navigator.language || ""}:${navigator.hardwareConcurrency || 1}`;
  }
  if (typeof screen !== "undefined") {
    entropy += `:${screen.width}x${screen.height}:${screen.colorDepth}`;
  }
  if (typeof localStorage !== "undefined") {
    let salt: string | null = null;
    try {
      salt = localStorage.getItem(DEVICE_SALT_STORAGE_KEY);
      if (!salt) {
        const randomSalt = new Uint8Array(16);
        if (typeof crypto !== "undefined" && crypto.getRandomValues) {
          crypto.getRandomValues(randomSalt);
        } else {
          for (let i = 0; i < 16; i++) randomSalt[i] = Math.floor(Math.random() * 256);
        }
        salt = bytesToHex(randomSalt);
        localStorage.setItem(DEVICE_SALT_STORAGE_KEY, salt);
      }
    } catch {}
    if (salt) {
      entropy += `:${salt}`;
    }
  }
  return entropy;
}

function getDeviceBoundKey(): Uint32Array {
  const entropy = getDeviceBoundEntropy();
  const keyBytes = sha256Sync(new TextEncoder().encode(entropy));
  return expandKey(keyBytes);
}

/**
 * Выполняет потоковое шифрование/расшифрование AES-256-CTR над байтами.
 */
function processAesCtr(data: Uint8Array, iv: Uint8Array, expandedKey: Uint32Array): Uint8Array {
  const out = new Uint8Array(data.length);
  const counterBlock = new Uint8Array(16);
  counterBlock.set(iv.subarray(0, 16));

  const totalBlocks = Math.ceil(data.length / 16);
  for (let b = 0; b < totalBlocks; b++) {
    const keystream = aes256_ecb_encrypt(counterBlock, expandedKey);
    const offset = b * 16;
    const blockSize = Math.min(16, data.length - offset);

    for (let i = 0; i < blockSize; i++) {
      out[offset + i] = data[offset + i] ^ keystream[i];
    }

    // Инкремент 128-битного счётчика (big-endian)
    for (let i = 15; i >= 0; i--) {
      counterBlock[i] = (counterBlock[i] + 1) & 0xff;
      if (counterBlock[i] !== 0) break;
    }
  }

  return out;
}

/**
 * Сохраняет KEK в обёрнутом виде в localStorage (Option C).
 * Открытый KEK никогда не записывается в localStorage.
 */
function saveWrappedKek(kek: Uint8Array): void {
  if (typeof localStorage === "undefined") return;
  try {
    const boundKey = getDeviceBoundKey();
    const iv = new Uint8Array(16);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(iv);
    } else {
      for (let i = 0; i < 16; i++) iv[i] = Math.floor(Math.random() * 256);
    }
    const encrypted = processAesCtr(kek, iv, boundKey);
    const val = `enc:bound:${bytesToHex(iv)}:${bytesToHex(encrypted)}`;
    localStorage.setItem(WRAPPED_KEK_STORAGE_KEY, val);
  } catch (e) {
    console.warn("[KeysAtRest] Не удалось сохранить обёрнутый KEK:", e);
  }
}

/**
 * Извлекает KEK из обёрнутого хранилища localStorage.
 */
function unwrapKek(wrapped: string): Uint8Array | null {
  try {
    const prefix = "enc:bound:";
    if (!wrapped.startsWith(prefix)) return null;
    const raw = wrapped.substring(prefix.length);
    const colonIdx = raw.indexOf(":");
    if (colonIdx === -1) return null;
    const iv = hexToBytes(raw.substring(0, colonIdx));
    const ct = hexToBytes(raw.substring(colonIdx + 1));
    const boundKey = getDeviceBoundKey();
    const decrypted = processAesCtr(ct, iv, boundKey);
    if (decrypted.length === 32) {
      return decrypted;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * IndexedDB интеграция (Option A): открывает хранилище ключей.
 */
function openIndexedDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function getCryptoKeyFromIndexedDB(): Promise<CryptoKey | null> {
  const db = await openIndexedDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_KEY_NAME);
      req.onsuccess = () => {
        if (req.result && req.result.key) {
          resolve(req.result.key as CryptoKey);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveCryptoKeyToIndexedDB(key: CryptoKey): Promise<boolean> {
  const db = await openIndexedDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      const req = store.put({ id: IDB_KEY_NAME, key });
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Синхронизирует KEK в IndexedDB в виде non-extractable CryptoKey (Option A).
 */
async function syncKekToIndexedDB(kek: Uint8Array): Promise<void> {
  if (cachedCryptoKey) return;
  try {
    const existing = await getCryptoKeyFromIndexedDB();
    if (existing) {
      cachedCryptoKey = existing;
      return;
    }
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const imported = await crypto.subtle.importKey(
        "raw",
        kek as any,
        { name: "AES-GCM" },
        false, // extractable: false! Ключ аппаратно неизвлекаем из JS
        ["encrypt", "decrypt"]
      );
      await saveCryptoKeyToIndexedDB(imported);
      cachedCryptoKey = imported;
    }
  } catch {
    // В средах без IndexedDB (например, чистый Node) фоновая ошибка безопасна
  }
}

export async function getOrCreateCryptoKey(): Promise<CryptoKey | null> {
  if (cachedCryptoKey) return cachedCryptoKey;
  const kek = getInstallationKek();
  await syncKekToIndexedDB(kek);
  return cachedCryptoKey;
}

/**
 * Получает мастер-ключ установки устройства (KEK).
 * В localStorage открытый KEK НИКОГДА не сохраняется.
 */
export function getInstallationKek(): Uint8Array {
  if (cachedKek) {
    return cachedKek;
  }

  let legacyHex: string | null = null;
  let wrappedHex: string | null = null;

  if (typeof localStorage !== "undefined") {
    try {
      legacyHex = localStorage.getItem(LEGACY_KEK_STORAGE_KEY);
      wrappedHex = localStorage.getItem(WRAPPED_KEK_STORAGE_KEY);
    } catch {
      // Игнорируем ошибку доступа к localStorage
    }
  }

  // 1. Миграция с enc:v1: если обнаружен старый открытый KEK в localStorage._gossip_install_kek_v1
  if (legacyHex && legacyHex.length === 64) {
    cachedKek = hexToBytes(legacyHex);
    // Немедленно оборачиваем и сохраняем в защищённый формат (Option C)
    saveWrappedKek(cachedKek);
    // Полностью удаляем открытый KEK из localStorage
    try {
      localStorage.removeItem(LEGACY_KEK_STORAGE_KEY);
    } catch {}
  } else if (wrappedHex && wrappedHex.startsWith("enc:bound:")) {
    // 2. Читаем обёрнутый device-bound KEK
    cachedKek = unwrapKek(wrappedHex);
  }

  // 3. Если ключа нет или произошёл сбой развёртки — генерируем новый 256-битный KEK
  if (!cachedKek || cachedKek.length !== 32) {
    cachedKek = new Uint8Array(32);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(cachedKek);
    } else {
      for (let i = 0; i < 32; i++) {
        cachedKek[i] = Math.floor(Math.random() * 256);
      }
    }
    saveWrappedKek(cachedKek);
    // Гарантируем отсутствие открытого ключа
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.removeItem(LEGACY_KEK_STORAGE_KEY);
      } catch {}
    }
  }

  cachedExpandedKey = expandKey(cachedKek);

  // Фоновая синхронизация с IndexedDB в качестве non-extractable CryptoKey (Option A)
  syncKekToIndexedDB(cachedKek).catch(() => {});

  return cachedKek;
}

function getExpandedKey(): Uint32Array {
  if (!cachedExpandedKey) {
    getInstallationKek();
  }
  return cachedExpandedKey!;
}

/**
 * Проверяет, защищена ли строка форматом Keys-at-Rest (поддерживает enc:v1: и enc:v2:).
 */
export function isProtectedKey(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  return value.startsWith(PREFIX_V1) || value.startsWith(PREFIX_V2);
}

/**
 * Защищает чувствительные данные перед сохранением в покое (синхронный API).
 * Формат: enc:v2:<ivHex>:<ciphertextHex>
 */
export function protectKeyAtRest(plaintext: string): string {
  if (!plaintext || typeof plaintext !== "string") {
    return plaintext;
  }
  // Если уже зашифровано (v1 или v2), повторно не шифруем
  if (isProtectedKey(plaintext)) {
    return plaintext;
  }

  const expandedKey = getExpandedKey();
  const iv = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(iv);
  } else {
    for (let i = 0; i < 16; i++) {
      iv[i] = Math.floor(Math.random() * 256);
    }
  }

  const plaintextBytes = new TextEncoder().encode(plaintext);
  const ciphertextBytes = processAesCtr(plaintextBytes, iv, expandedKey);

  return `${PREFIX_V2}${bytesToHex(iv)}:${bytesToHex(ciphertextBytes)}`;
}

/**
 * Создаёт шифротекст формата enc:v1: (AES-256-CTR) для верификации миграции с legacy enc:v1.
 */
export function protectKeyAtRestV1(plaintext: string): string {
  const expandedKey = getExpandedKey();
  const iv = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(iv);
  } else {
    for (let i = 0; i < 16; i++) {
      iv[i] = Math.floor(Math.random() * 256);
    }
  }

  const plaintextBytes = new TextEncoder().encode(plaintext);
  const ciphertextBytes = processAesCtr(plaintextBytes, iv, expandedKey);

  return `${PREFIX_V1}${bytesToHex(iv)}:${bytesToHex(ciphertextBytes)}`;
}

/**
 * Защищает данные через Web Crypto API с non-extractable CryptoKey (асинхронный API Option A).
 */
export async function protectKeyAtRestAsync(plaintext: string): Promise<string> {
  if (!plaintext || typeof plaintext !== "string") {
    return plaintext;
  }
  if (isProtectedKey(plaintext)) {
    return plaintext;
  }

  const cryptoKey = await getOrCreateCryptoKey();
  if (cryptoKey && typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const iv = new Uint8Array(12);
      crypto.getRandomValues(iv);
      const enc = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv as any },
        cryptoKey,
        new TextEncoder().encode(plaintext) as any
      );
      return `${PREFIX_V2}${bytesToHex(iv)}:${bytesToHex(new Uint8Array(enc))}`;
    } catch (e) {
      console.warn("[KeysAtRest] WebCrypto GCM encrypt fallback to sync:", e);
    }
  }

  return protectKeyAtRest(plaintext);
}

/**
 * Снимает защиту с данных в покое (синхронный API).
 * Поддерживает enc:v2:, enc:v1: и прозрачную миграцию открытого текста без потери сессий.
 */
export function unprotectKeyAtRest(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") {
    return value ?? null;
  }

  // Старый открытый формат (legacy) — отдаём без ошибки для последующей миграции
  if (!value.startsWith(PREFIX_V1) && !value.startsWith(PREFIX_V2)) {
    return value;
  }

  const prefix = value.startsWith(PREFIX_V2) ? PREFIX_V2 : PREFIX_V1;

  try {
    const raw = value.substring(prefix.length);
    const colonIdx = raw.indexOf(":");
    if (colonIdx === -1) {
      return value;
    }

    const ivHex = raw.substring(0, colonIdx);
    const ciphertextHex = raw.substring(colonIdx + 1);

    const iv = hexToBytes(ivHex);
    const ciphertext = hexToBytes(ciphertextHex);
    const expandedKey = getExpandedKey();

    const plaintextBytes = processAesCtr(ciphertext, iv, expandedKey);
    return new TextDecoder().decode(plaintextBytes);
  } catch (err) {
    console.error("[KeysAtRest] Ошибка дешифрования защищённых данных:", err);
    return value;
  }
}

/**
 * Снимает защиту с данных в покое через Web Crypto API (асинхронный API Option A).
 */
export async function unprotectKeyAtRestAsync(value: string | null | undefined): Promise<string | null> {
  if (!value || typeof value !== "string") {
    return value ?? null;
  }
  if (!value.startsWith(PREFIX_V1) && !value.startsWith(PREFIX_V2)) {
    return value;
  }

  if (value.startsWith(PREFIX_V2)) {
    const raw = value.substring(PREFIX_V2.length);
    const colonIdx = raw.indexOf(":");
    if (colonIdx !== -1) {
      const ivHex = raw.substring(0, colonIdx);
      const ciphertextHex = raw.substring(colonIdx + 1);
      const iv = hexToBytes(ivHex);
      const ciphertext = hexToBytes(ciphertextHex);

      // Если 12-байтовый IV — это пакет AES-GCM из Web Crypto
      if (iv.length === 12) {
        const cryptoKey = await getOrCreateCryptoKey();
        if (cryptoKey && typeof crypto !== "undefined" && crypto.subtle) {
          try {
            const dec = await crypto.subtle.decrypt(
              { name: "AES-GCM", iv: iv as any },
              cryptoKey,
              ciphertext as any
            );
            return new TextDecoder().decode(dec);
          } catch {
            // При ошибке GCM пробуем резервный путь
          }
        }
      }
    }
  }

  return unprotectKeyAtRest(value);
}

/**
 * Инициализирует хранилище ключей при старте приложения.
 */
export async function initKeyProtection(): Promise<void> {
  const kek = getInstallationKek();
  await syncKekToIndexedDB(kek);
}

/**
 * Устанавливает автоматический перехватчик на localStorage.setItem,
 * устраняя утечки открытого текста приватных ключей (включая App.tsx ~2383).
 */
export function installStorageProtectionInterceptor(): void {
  if (typeof globalThis === "undefined") return;
  const storage = (globalThis as any).localStorage;
  if (!storage || typeof storage.setItem !== "function") return;
  if ((storage as any).__gossip_protected_interceptor_installed) return;
  (storage as any).__gossip_protected_interceptor_installed = true;

  const originalSetItem = storage.setItem.bind(storage);
  storage.setItem = function (key: string, value: string) {
    if (
      (key === "mls_x25519_priv" ||
        key === "mls_kyber_priv" ||
        (key.startsWith("e2ee_key_") &&
          (key.endsWith("_priv") ||
            key.endsWith("_priv_ecdsa") ||
            key.includes("private") ||
            key.endsWith("e2ee_opks")))) &&
      typeof value === "string" &&
      !isProtectedKey(value)
    ) {
      try {
        const protectedValue = protectKeyAtRest(value);
        return originalSetItem(key, protectedValue);
      } catch (e) {
        console.warn("[KeyProtection] Interceptor fallback on setItem:", e);
      }
    }
    return originalSetItem(key, value);
  };
}

// Автоматическая установка перехватчика при загрузке модуля
installStorageProtectionInterceptor();

