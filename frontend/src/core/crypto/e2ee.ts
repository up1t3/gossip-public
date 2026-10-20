// frontend/src/core/crypto/e2ee.ts
import { hexToBytes, bytesToHex } from "../tdlib/crypto";
import { getBackendUrl } from "../../utils/url";
import {
  generateX25519KeyPair,
  calculateX25519SharedSecret,
  hkdfDeriveKey
} from "./mls";
import { storageManager } from "../storage/storage-manager";
import {
  protectKeyAtRest,
  unprotectKeyAtRest,
  isProtectedKey
} from "./key-storage-protection";

// --- Double Ratchet & X3DH ---

export interface PrekeyBundle {
  userId: string;
  identityKey: string;
  signedPrekey: {
    key: string;
    signature: string;
  };
  oneTimePrekey?: {
    id: number;
    key: string;
  } | null;
  _source?: 'server' | 'ble';
  _receivedAt?: number;
  _expiresAt?: number;
}

async function kdfRK(rk: Uint8Array, dhShared: Uint8Array): Promise<[Uint8Array, Uint8Array]> {
  const combined = new Uint8Array(rk.length + dhShared.length);
  combined.set(rk, 0);
  combined.set(dhShared, rk.length);
  const derived = await hkdfDeriveKey(combined, "DoubleRatchet-RK", 64);
  return [derived.subarray(0, 32), derived.subarray(32, 64)];
}

async function kdfCK(ck: Uint8Array): Promise<[Uint8Array, Uint8Array]> {
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    ck as any,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const ckNewBuffer = await crypto.subtle.sign("HMAC", hmacKey, new Uint8Array([1]));
  const msgKeyBuffer = await crypto.subtle.sign("HMAC", hmacKey, new Uint8Array([2]));
  
  return [new Uint8Array(ckNewBuffer), new Uint8Array(msgKeyBuffer)];
}

function isSensitiveKey(name: string): boolean {
  return name.endsWith("_priv") || name.endsWith("_priv_ecdsa") || name === "e2ee_opks" || name.includes("private");
}

export async function getKey(name: string): Promise<string | null> {
  let dbValue: string | null = null;
  let rawDbValue: string | null = null;
  try {
    const rows = await storageManager.query<{ key_value: string }>(
      "SELECT key_value FROM e2ee_keys WHERE key_name = ?;",
      [name]
    );
    if (rows.length > 0) {
      rawDbValue = rows[0].key_value;
      dbValue = unprotectKeyAtRest(rawDbValue);
    }
  } catch (e) {
    console.warn("[E2EE getKey] SQLite query failed, trying localStorage:", e);
  }

  if (typeof localStorage !== 'undefined') {
    const currentUserId = localStorage.getItem("current_user_id") || "global";
    const localRaw = localStorage.getItem(`e2ee_key_${currentUserId}_${name}`);
    if (localRaw) {
      const localValue = unprotectKeyAtRest(localRaw);
      if (!dbValue && localValue) {
        try {
          const valueToStore = isSensitiveKey(name) ? protectKeyAtRest(localValue) : localValue;
          await storageManager.execute(
            "INSERT OR REPLACE INTO e2ee_keys (key_name, key_value) VALUES (?, ?);",
            [name, valueToStore]
          );
        } catch (e) {}
      }
      // Прозрачная миграция открытого legacy ключа
      if (isSensitiveKey(name) && !isProtectedKey(localRaw) && localValue) {
        setKey(name, localValue).catch(() => {});
      }
      return localValue;
    }
  }

  // Прозрачная миграция открытого legacy ключа из SQLite
  if (rawDbValue && isSensitiveKey(name) && !isProtectedKey(rawDbValue) && dbValue) {
    setKey(name, dbValue).catch(() => {});
  }

  return dbValue;
}

export async function setKey(name: string, value: string): Promise<void> {
  const valueToStore = isSensitiveKey(name) ? protectKeyAtRest(value) : value;
  try {
    await storageManager.execute(
      "INSERT OR REPLACE INTO e2ee_keys (key_name, key_value) VALUES (?, ?);",
      [name, valueToStore]
    );
  } catch (e) {
    console.warn("[E2EE setKey] SQLite execute failed:", e);
  }

  if (typeof localStorage !== 'undefined') {
    const currentUserId = localStorage.getItem("current_user_id") || "global";
    localStorage.setItem(`e2ee_key_${currentUserId}_${name}`, valueToStore);
  }
}

const peerOperationQueues = new Map<string, Promise<any>>();

// RK-2: пул OPK хранится в enc:v2; при утерянном KEK расшифровка молча даёт мусор —
// JSON.parse падал SyntaxError'ом и блокировал публикацию пре-ключей навсегда.
// Мусорный пул приравнивается к пустому и перегенерируется.
export function parseOpkPoolSafe(json: string | null | undefined): Record<string, { priv: string; pub: string }> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, { priv: string; pub: string }>;
    }
    console.error("[E2EE] Пул OPK повреждён (невалидная структура) — перегенерируем пул.");
    return {};
  } catch {
    console.error("[E2EE] Пул OPK повреждён (невалидный JSON после расшифровки enc:v2 — вероятен утерянный KEK) — перегенерируем пул.");
    return {};
  }
}

export function withPeerLock<T>(peerId: string, fn: () => Promise<T>): Promise<T> {
  const pId = String(peerId);
  let currentUserId = "global";
  if (typeof localStorage !== 'undefined') {
    currentUserId = localStorage.getItem("current_user_id") || localStorage.getItem("my_user_id") || "global";
  }
  const lockKey = `${currentUserId}:${pId}`;
  
  const current = peerOperationQueues.get(lockKey) || Promise.resolve();
  const next = current
    .catch(() => {})
    .then(() => fn());
    
  peerOperationQueues.set(lockKey, next);
  
  next.finally(() => {
    if (peerOperationQueues.get(lockKey) === next) {
      peerOperationQueues.delete(lockKey);
    }
  }).catch(() => {});
  
  return next;
}

export async function getSession(userId: string): Promise<any | null> {
  let dbValue: string | null = null;
  let rawDbValue: string | null = null;
  let querySuccess = false;
  try {
    const rows = await storageManager.query<{ session_data: string }>(
      "SELECT session_data FROM e2ee_sessions WHERE user_id = ?;",
      [userId]
    );
    if (rows.length > 0) {
      rawDbValue = rows[0].session_data;
      dbValue = unprotectKeyAtRest(rawDbValue);
    }
    querySuccess = true;
  } catch (e) {
    console.warn("[E2EE getSession] SQLite query failed, trying localStorage:", e);
  }

  // Если запрос к SQLite был успешным и вернул сессию, используем её как наиболее актуальную и приоритетную
  if (querySuccess && dbValue) {
    try {
      const parsed = JSON.parse(dbValue);
      // Прозрачная миграция открытой legacy-сессии в зашифрованный формат
      if (rawDbValue && !isProtectedKey(rawDbValue)) {
        saveSession(userId, parsed).catch(() => {});
      }
      return parsed;
    } catch (err) {
      console.error("[E2EE getSession] Ошибка парсинга сессии из SQLite:", err);
    }
  }

  // Fallback на localStorage, если в БД пусто или запрос завершился ошибкой
  if (typeof localStorage !== 'undefined') {
    const currentUserId = localStorage.getItem("current_user_id") || "global";
    const rawLocalValue = localStorage.getItem(`e2ee_session_${currentUserId}_${userId}`);
    if (rawLocalValue) {
      const localValue = unprotectKeyAtRest(rawLocalValue);
      if (!dbValue && querySuccess && localValue) {
        // Синхронизируем обратно в SQLite, если в базе пусто, но в localStorage есть
        try {
          await storageManager.execute(
            "INSERT OR REPLACE INTO e2ee_sessions (user_id, session_data) VALUES (?, ?);",
            [userId, protectKeyAtRest(localValue)]
          );
        } catch (e) {}
      }
      try {
        const parsed = JSON.parse(localValue || rawLocalValue);
        // Прозрачная миграция открытой legacy-сессии в localStorage
        if (!isProtectedKey(rawLocalValue)) {
          saveSession(userId, parsed).catch(() => {});
        }
        return parsed;
      } catch (err) {
        return null;
      }
    }
  }
  return null;
}

export async function saveSession(userId: string, session: any): Promise<void> {
  const sessionStr = JSON.stringify(session);
  const protectedSessionStr = protectKeyAtRest(sessionStr);
  try {
    await storageManager.execute(
      "INSERT OR REPLACE INTO e2ee_sessions (user_id, session_data) VALUES (?, ?);",
      [userId, protectedSessionStr]
    );
  } catch (e) {
    console.warn("[E2EE saveSession] SQLite execute failed:", e);
  }

  if (typeof localStorage !== 'undefined') {
    const currentUserId = localStorage.getItem("current_user_id") || "global";
    localStorage.setItem(`e2ee_session_${currentUserId}_${userId}`, protectedSessionStr);
  }
}

const inMemoryPreservedSkippedKeys = new Map<string, Record<string, string>>();

export async function preserveSkippedKeysForPeer(peerId: string, keys: Record<string, string>): Promise<void> {
  const pId = String(peerId);
  const existing = inMemoryPreservedSkippedKeys.get(pId) || {};
  const merged = { ...existing, ...keys };
  const mergedKeyNames = Object.keys(merged);
  if (mergedKeyNames.length > 1000) {
    for (let i = 0; i < mergedKeyNames.length - 1000; i++) {
      delete merged[mergedKeyNames[i]];
    }
  }
  if (inMemoryPreservedSkippedKeys.size > 200 && !inMemoryPreservedSkippedKeys.has(pId)) {
    const oldest = inMemoryPreservedSkippedKeys.keys().next().value;
    if (oldest) inMemoryPreservedSkippedKeys.delete(oldest);
  }
  inMemoryPreservedSkippedKeys.set(pId, merged);
  try {
    await setKey(`preserved_skipped_keys_${pId}`, JSON.stringify(merged));
  } catch (e) {
    console.warn(`[E2EE] Не удалось персистировать сохраненные skippedKeys для ${pId}:`, e);
  }
}

export async function consumePreservedSkippedKeysForPeer(peerId: string): Promise<Record<string, string>> {
  const pId = String(peerId);
  let keys: Record<string, string> = inMemoryPreservedSkippedKeys.get(pId) || {};
  inMemoryPreservedSkippedKeys.delete(pId);
  try {
    const persisted = await getKey(`preserved_skipped_keys_${pId}`);
    if (persisted) {
      const parsed = JSON.parse(persisted);
      keys = { ...parsed, ...keys };
      await setKey(`preserved_skipped_keys_${pId}`, "");
    }
  } catch (e) {
    console.warn(`[E2EE] Не удалось загрузить персистированные skippedKeys для ${pId}:`, e);
  }
  return keys;
}

export async function deleteSession(userId: string): Promise<void> {
  return withPeerLock(userId, async () => {
    try {
      // R3: Сохраняем skippedMessageKeys в буфер перед удалением, чтобы не потерять ключи
      // для задержавшихся out-of-order пакетов при ре-инициализации сессии
      const session = await getSession(userId);
      if (session?.skippedMessageKeys && Object.keys(session.skippedMessageKeys).length > 0) {
        await preserveSkippedKeysForPeer(userId, session.skippedMessageKeys);
      }
    } catch (e) {
      console.warn("[E2EE deleteSession] Ошибка сохранения skippedMessageKeys перед удалением:", e);
    }

    try {
      await storageManager.execute(
        "DELETE FROM e2ee_sessions WHERE user_id = ?;",
        [userId]
      );
    } catch (e) {
      console.warn("[E2EE deleteSession] SQLite execute failed:", e);
    }

    if (typeof localStorage !== 'undefined') {
      const currentUserId = localStorage.getItem("current_user_id") || "global";
      localStorage.removeItem(`e2ee_session_${currentUserId}_${userId}`);
    }
  });
}

// --- Offline Prekey Store (Zero-Internet Key Agreement) ---

const inMemoryOfflinePrekeys = new Map<string, PrekeyBundle>();

export interface ConsumedLocalOpkEntry {
  priv: string;
  pub: string;
  senderId: string;
  ekAPubHex: string;
  consumedAt: number;
}

export const recentlyConsumedLocalOpks = new Map<string, ConsumedLocalOpkEntry>();

if (typeof localStorage !== 'undefined') {
  try {
    const rawRecent = localStorage.getItem("e2ee_recent_consumed_local_opks");
    if (rawRecent) {
      const parsed = JSON.parse(rawRecent);
      if (parsed && typeof parsed === 'object') {
        for (const [k, v] of Object.entries(parsed)) {
          if (v && typeof v === 'object' && (v as any).priv) {
            recentlyConsumedLocalOpks.set(String(k), v as ConsumedLocalOpkEntry);
          }
        }
      }
    }
  } catch (e) {}
}

export function recordConsumedLocalOpk(
  opkId: number | string,
  entry: { priv: string; pub: string },
  senderId: string,
  ekAPubHex: string
): void {
  const key = String(opkId);
  recentlyConsumedLocalOpks.set(key, {
    priv: entry.priv,
    pub: entry.pub,
    senderId: String(senderId),
    ekAPubHex: String(ekAPubHex || "").toLowerCase(),
    consumedAt: Date.now()
  });
  if (recentlyConsumedLocalOpks.size > 100) {
    const oldestKey = recentlyConsumedLocalOpks.keys().next().value;
    if (oldestKey !== undefined) recentlyConsumedLocalOpks.delete(oldestKey);
  }
  if (typeof localStorage !== 'undefined') {
    try {
      const obj: Record<string, ConsumedLocalOpkEntry> = {};
      for (const [k, v] of recentlyConsumedLocalOpks.entries()) {
        obj[k] = v;
      }
      localStorage.setItem("e2ee_recent_consumed_local_opks", JSON.stringify(obj));
    } catch (e) {}
  }
}

export function generateOpkBatch(
  localOpks: Record<string, { priv: string; pub: string }>,
  count: number,
  minStartId = 0
): void {
  let maxId = minStartId;
  for (const idStr of Object.keys(localOpks)) {
    const num = parseInt(idStr, 10);
    if (!isNaN(num) && num > maxId) maxId = num;
  }
  for (const idStr of recentlyConsumedLocalOpks.keys()) {
    const num = parseInt(idStr, 10);
    if (!isNaN(num) && num > maxId) maxId = num;
  }

  for (let i = 0; i < count; i++) {
    const opkId = maxId + 1 + i;
    const opk = generateX25519KeyPair();
    localOpks[opkId] = {
      priv: bytesToHex(opk.privateKey),
      pub: bytesToHex(opk.publicKey)
    };
  }
}

export const consumedServerOpkIds = new Set<string>();

if (typeof localStorage !== 'undefined') {
  try {
    const raw = localStorage.getItem("e2ee_consumed_server_opks");
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach((item: string) => consumedServerOpkIds.add(String(item)));
      }
    }
  } catch (e) {}
}

export function recordConsumedServerOpk(peerId: string, opkId: number | string): void {
  const key = `${peerId}:${opkId}`;
  consumedServerOpkIds.add(key);
  if (typeof localStorage !== 'undefined') {
    try {
      const items = Array.from(consumedServerOpkIds).slice(-1000);
      localStorage.setItem("e2ee_consumed_server_opks", JSON.stringify(items));
    } catch (e) {}
  }
}

export async function getLocalPrekeyBundle(): Promise<PrekeyBundle> {
  const keys = await ensureLocalIdentityKeys();
  const ikPub = keys.ikPub;
  const spkPub = keys.spkPub;
  let spkSig = await getKey("e2ee_spk_sig");

  if (!spkSig) {
    const ecdsaPrivHex = await getKey("e2ee_ik_priv_ecdsa");
    if (ecdsaPrivHex) {
      spkSig = await signWithEcdsa(ecdsaPrivHex, spkPub);
      await setKey("e2ee_spk_sig", spkSig);
    }
  }

  let currentUserId = "local_node";
  if (typeof localStorage !== 'undefined') {
    currentUserId =
      localStorage.getItem("my_user_id") ||
      localStorage.getItem("current_user_id") ||
      localStorage.getItem("gossip_local_mesh_id") ||
      "local_node";
  }

  // Извлекаем или гарантируем пул OPK
  const localOpksJson = await getKey("e2ee_opks");
  const localOpks: Record<string, { priv: string; pub: string }> = parseOpkPoolSafe(localOpksJson);

  const opkCount = Object.keys(localOpks).length;
  if (opkCount < 1) {
    generateOpkBatch(localOpks, 10);
    await setKey("e2ee_opks", JSON.stringify(localOpks));
  }

  const opkIds = Object.keys(localOpks);
  let selectedOpk: { id: number; key: string } | null = null;
  if (opkIds.length > 0) {
    const opkIdStr = opkIds[0];
    selectedOpk = {
      id: parseInt(opkIdStr, 10),
      key: localOpks[opkIdStr].pub
    };
  }

  return {
    userId: currentUserId,
    identityKey: ikPub,
    signedPrekey: {
      key: spkPub,
      signature: spkSig || ""
    },
    oneTimePrekey: selectedOpk
  };
}

function isBundleValid(b: PrekeyBundle, candId: string): boolean {
  if (b._expiresAt && Date.now() > b._expiresAt) {
    console.log(`[E2EE Prekeys] Бандл (${b._source || 'offline'}) для ${candId} истек по TTL — инвалидирован (MSH-1 / CR-2).`);
    inMemoryOfflinePrekeys.delete(candId);
    if (typeof localStorage !== 'undefined') {
      const currentUserId = localStorage.getItem("current_user_id") || "global";
      localStorage.removeItem(`e2ee_offline_prekey_${currentUserId}_${candId}`);
      localStorage.removeItem(`e2ee_offline_prekey_${candId}`);
    }
    return false;
  }
  return true;
}

export async function saveOfflinePrekeyBundle(
  peerId: string,
  bundle: PrekeyBundle,
  source: 'server' | 'ble' = 'server'
): Promise<void> {
  if (!peerId || !bundle) {
    return;
  }

  // MSH-1: Проверяем приоритет. Если уже сохранён серверный бандл, BLE-бандл не перезаписывает его!
  const existing = await getOfflinePrekeyBundle(peerId);
  if (existing && existing._source === 'server' && source === 'ble') {
    console.log(`[E2EE Prekeys] BLE-бандл для ${peerId} отклонен: серверный бандл имеет наивысший приоритет (MSH-1).`);
    return;
  }

  // Нормализуем поля бандла (поддержка как полного, так и компактного формата)
  let normalizedBundle: PrekeyBundle = { ...bundle };
  const bAny = bundle as any;
  if (!bundle.identityKey && bAny.ik) {
    normalizedBundle = {
      userId: bundle.userId || peerId,
      identityKey: bAny.ik,
      signedPrekey: {
        key: bAny.spk || bAny.signedPrekey?.key || "",
        signature: bAny.sig || bAny.signedPrekey?.signature || ""
      },
      oneTimePrekey: bAny.opk ? {
        id: bAny.opkId ?? bAny.oi ?? 0,
        key: bAny.opk
      } : (bundle.oneTimePrekey || null)
    };
  }

  if (!normalizedBundle.identityKey || !normalizedBundle.signedPrekey || !normalizedBundle.signedPrekey.key) {
    return;
  }

  // MSH-1 / CR-2: Устанавливаем метаданные источника и TTL:
  // - 24 часа для BLE-радара
  // - 7 суток для серверного Shutdown-Safe 3-DH бандла (без одноразового OPK)
  // - 60 секунд для серверного бандла с одноразовым OPK (защита CR-2 от повторного использования OPK)
  normalizedBundle._source = source;
  normalizedBundle._receivedAt = Date.now();
  if (source === 'ble') {
    normalizedBundle._expiresAt = bundle._expiresAt || (Date.now() + 24 * 60 * 60 * 1000);
  } else if (!normalizedBundle.oneTimePrekey) {
    normalizedBundle._expiresAt = bundle._expiresAt || (Date.now() + 7 * 24 * 60 * 60 * 1000);
  } else {
    normalizedBundle._expiresAt = bundle._expiresAt || (Date.now() + 60 * 1000);
  }

  const idsToSave = new Set<string>([peerId]);
  if (normalizedBundle.userId && typeof normalizedBundle.userId === 'string' && normalizedBundle.userId.trim()) {
    idsToSave.add(normalizedBundle.userId.trim());
  }

  // Сохраняем под всеми вариациями префиксов
  if (peerId.startsWith("web-")) {
    idsToSave.add(peerId.replace("web-", ""));
  } else if (peerId.startsWith("peer-")) {
    idsToSave.add(peerId.replace("peer-", ""));
  } else if (peerId.startsWith("mesh-")) {
    idsToSave.add(peerId.replace("mesh-", ""));
  }

  const bundleStr = JSON.stringify(normalizedBundle);

  for (const id of idsToSave) {
    inMemoryOfflinePrekeys.set(id, normalizedBundle);
    if (typeof localStorage !== 'undefined') {
      const currentUserId = localStorage.getItem("current_user_id") || "global";
      localStorage.setItem(`e2ee_offline_prekey_${currentUserId}_${id}`, bundleStr);
      localStorage.setItem(`e2ee_offline_prekey_${id}`, bundleStr);
    }
  }

  try {
    await storageManager.execute(
      "CREATE TABLE IF NOT EXISTS offline_prekeys (peer_id TEXT PRIMARY KEY, bundle_json TEXT, updated_at INTEGER);"
    );
    for (const id of idsToSave) {
      await storageManager.execute(
        "INSERT OR REPLACE INTO offline_prekeys (peer_id, bundle_json, updated_at) VALUES (?, ?, ?);",
        [id, bundleStr, Date.now()]
      );
    }
  } catch (e) {
    // В тестовых средах без открытого SQLite игнорируем ошибку
  }
}

export async function getOfflinePrekeyBundle(peerId: string): Promise<PrekeyBundle | null> {
  if (!peerId) return null;

  const rawId = peerId.replace(/^(web-|peer-|mesh-)/, "");
  const candidates = [
    peerId,
    rawId,
    `web-${rawId}`,
    `peer-${rawId}`,
    `mesh-${rawId}`
  ];

  // 1. Поиск в оперативной памяти
  for (const cand of candidates) {
    if (inMemoryOfflinePrekeys.has(cand)) {
      const b = inMemoryOfflinePrekeys.get(cand)!;
      if (isBundleValid(b, cand)) {
        return b;
      }
    }
  }

  // 2. Поиск в SQLite
  let dbValue: string | null = null;
  let querySuccess = false;
  try {
    for (const cand of candidates) {
      const rows = await storageManager.query<{ bundle_json: string }>(
        "SELECT bundle_json FROM offline_prekeys WHERE peer_id = ?;",
        [cand]
      );
      if (rows.length > 0 && rows[0].bundle_json) {
        dbValue = rows[0].bundle_json;
        break;
      }
    }
    querySuccess = true;
  } catch (e) {
    // SQLite может быть не открыт в изолированных тестах
  }

  if (querySuccess && dbValue) {
    try {
      const parsed = JSON.parse(dbValue) as PrekeyBundle;
      if (parsed && parsed.identityKey && parsed.signedPrekey) {
        if (isBundleValid(parsed, peerId)) {
          for (const cand of candidates) {
            inMemoryOfflinePrekeys.set(cand, parsed);
          }
          return parsed;
        }
      }
    } catch (err) {
      console.error("[E2EE OfflinePrekeyStore] Ошибка парсинга бандла из SQLite:", err);
    }
  }

  // 3. Fallback на localStorage
  if (typeof localStorage !== 'undefined') {
    const currentUserId = localStorage.getItem("current_user_id") || "global";
    for (const cand of candidates) {
      const localValue = localStorage.getItem(`e2ee_offline_prekey_${currentUserId}_${cand}`) ||
                         localStorage.getItem(`e2ee_offline_prekey_${cand}`);
      if (localValue) {
        try {
          const parsed = JSON.parse(localValue) as PrekeyBundle;
          if (parsed && parsed.identityKey && parsed.signedPrekey) {
            if (isBundleValid(parsed, cand)) {
              for (const c of candidates) {
                inMemoryOfflinePrekeys.set(c, parsed);
              }
              return parsed;
            }
          }
        } catch (err) {
          return null;
        }
      }
    }
  }

  return null;
}

/**
 * Проактивный предзапас Shutdown-Safe PreKey бандлов контактов (3-DH + ML-KEM-768 без сжигания OPK).
 * Позволяет при внезапном шатдауне интернета инициировать или восстановить E2EE сессию
 * с любым контактом из списка чатов через мультихоп BLE Mesh / LAN / Store-and-Forward.
 */
export async function prewarmContactPrekeyBundles(peerIds: string[]): Promise<number> {
  if (!Array.isArray(peerIds) || peerIds.length === 0) return 0;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 0;
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem("session_token") : null;
  if (!token) return 0;

  const currentUserId = typeof localStorage !== 'undefined'
    ? (localStorage.getItem("current_user_id") || localStorage.getItem("my_user_id") || "")
    : "";

  let warmed = 0;
  const now = Date.now();
  const minRemainingTtlMs = 12 * 60 * 60 * 1000; // Обновляем, если осталось менее 12 часов

  for (const rawId of peerIds) {
    const peerId = String(rawId || "").trim();
    if (!peerId || peerId === "me" || peerId === currentUserId || peerId.startsWith("group-") || peerId.startsWith("channel-")) {
      continue;
    }
    try {
      const existing = await getOfflinePrekeyBundle(peerId);
      if (existing && existing._source === 'server' && !existing.oneTimePrekey && (existing._expiresAt || 0) - now > minRemainingTtlMs) {
        continue;
      }
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 4000) : null;
      try {
        const res = await fetch(getBackendUrl(`/api/v1/crypto/prekey/bundle/${encodeURIComponent(peerId)}?consume_opk=false`), {
          headers: { "Authorization": `Bearer ${token}` },
          ...(controller ? { signal: controller.signal } : {})
        });
        if (res.ok) {
          const fetched = await res.json();
          if (fetched && fetched.identityKey && fetched.signedPrekey) {
            await saveOfflinePrekeyBundle(peerId, { ...fetched, oneTimePrekey: undefined }, 'server');
            warmed++;
          }
        }
      } finally {
        if (timer) clearTimeout(timer);
      }
    } catch {
      // Тихий пропуск при сетевом сбое или 404 (группа/бот без E2EE ключей)
    }
  }
  if (warmed > 0) {
    console.log(`[E2EE Prekeys] Предзапас ключей на случай шатдауна обновлен для ${warmed} контактов (TTL 7 суток).`);
  }
  return warmed;
}

export class OfflinePrekeyStore {
  public static getLocalPrekeyBundle = getLocalPrekeyBundle;
  public static saveOfflinePrekeyBundle = saveOfflinePrekeyBundle;
  public static getOfflinePrekeyBundle = getOfflinePrekeyBundle;
  public static prewarmContactPrekeyBundles = prewarmContactPrekeyBundles;
}



async function signWithEcdsa(ecdsaPrivHex: string, dataStr: string): Promise<string> {
  const privKeyBuffer = hexToBytes(ecdsaPrivHex);
  const ecdsaPrivateKey = await crypto.subtle.importKey(
    "pkcs8",
    privKeyBuffer as any,
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    false,
    ["sign"]
  );
  
  const dataBytes = new TextEncoder().encode(dataStr);
  const signatureBuffer = await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    },
    ecdsaPrivateKey,
    dataBytes as any
  );
  return bytesToHex(new Uint8Array(signatureBuffer));
}

async function verifyWithEcdsa(ecdsaPubHex: string, dataStr: string, signatureHex: string): Promise<boolean> {
  try {
    const pubKeyBuffer = hexToBytes(ecdsaPubHex);
    const ecdsaPublicKey = await crypto.subtle.importKey(
      "raw",
      pubKeyBuffer as any,
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      false,
      ["verify"]
    );
    
    const dataBytes = new TextEncoder().encode(dataStr);
    const sigBytes = hexToBytes(signatureHex);
    return await crypto.subtle.verify(
      {
        name: "ECDSA",
        hash: { name: "SHA-256" },
      },
      ecdsaPublicKey,
      sigBytes as any,
      dataBytes as any
    );
  } catch (err) {
    console.error("[E2EE ECDSA] Verification error:", err);
    return false;
  }
}

export async function ensureLocalIdentityKeys(): Promise<{ ikPriv: string; ikPub: string; spkPriv: string; spkPub: string }> {
  let ikPriv = await getKey("e2ee_ik_priv");
  let ikPub = await getKey("e2ee_ik_pub");
  const ikPrivEcdsa = await getKey("e2ee_ik_priv_ecdsa");
  let identityRegenerated = false;

  // RK-2: расшифровка enc:v2 при утерянном KEK молча возвращает мусор (AES-CTR не падает,
  // TextDecoder декодирует что угодно) — раньше hexToBytes(мусор) давал <32 байт и X25519
  // крэшился на BigInt(undefined). Повреждённая связка приравнивается к отсутствующей.
  const isValidPriv = (v: string | null | undefined) => typeof v === "string" && /^[0-9a-fA-F]{64}$/.test(v);
  const isValidPub = (v: string | null | undefined) => typeof v === "string" && /^[0-9a-fA-F]+$/.test(v) && (v.length === 64 || v.length === 194);
  const isValidPkcs8 = (v: string | null | undefined) => typeof v === "string" && /^[0-9a-fA-F]+$/.test(v) && v.length >= 100 && v.length % 2 === 0;
  if ((ikPriv && !isValidPriv(ikPriv)) || (ikPub && !isValidPub(ikPub)) || (ikPrivEcdsa && !isValidPkcs8(ikPrivEcdsa))) {
    console.error("[E2EE] Связка Identity-ключей повреждена (невалидный hex после расшифровки enc:v2 — вероятен утерянный KEK). Регенерируем identity.");
    ikPriv = null;
    ikPub = null;
  }

  if (!ikPriv || !ikPub) {
    const ik = generateX25519KeyPair();
    const ecdsaKeyPair = await crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true,
      ["sign", "verify"]
    );
    const rawPub = await crypto.subtle.exportKey("raw", ecdsaKeyPair.publicKey);
    const pkcs8Priv = await crypto.subtle.exportKey("pkcs8", ecdsaKeyPair.privateKey);
    
    const ikPubX25519 = bytesToHex(ik.publicKey);
    const ikPubEcdsa = bytesToHex(new Uint8Array(rawPub));
    
    ikPriv = bytesToHex(ik.privateKey);
    ikPub = ikPubX25519 + ikPubEcdsa; // слияние: ikPub_X25519 (hex) + ikPub_ECDSA (hex)
    
    await setKey("e2ee_ik_priv", ikPriv);
    await setKey("e2ee_ik_pub", ikPub);
    await setKey("e2ee_ik_priv_ecdsa", bytesToHex(new Uint8Array(pkcs8Priv)));
    await setKey("e2ee_ik_pub_ecdsa", ikPubEcdsa);
    identityRegenerated = true;
  }
  
  let spkPriv = await getKey("e2ee_spk_priv");
  let spkPub = await getKey("e2ee_spk_pub");

  // RK-2: тот же запрет мусора для Signed Prekey (крэшлит initializeSessionB при приёме)
  if ((spkPriv && !isValidPriv(spkPriv)) || (spkPub && !isValidPriv(spkPub))) {
    console.error("[E2EE] Signed Prekey повреждён (невалидный hex) — регенерируем.");
    spkPriv = null;
    spkPub = null;
  }
  
  if (!spkPriv || !spkPub) {
    const spk = generateX25519KeyPair();
    spkPriv = bytesToHex(spk.privateKey);
    spkPub = bytesToHex(spk.publicKey);
    
    await setKey("e2ee_spk_priv", spkPriv);
    await setKey("e2ee_spk_pub", spkPub);
    
    const ecdsaPrivHex = await getKey("e2ee_ik_priv_ecdsa");
    if (!ecdsaPrivHex) throw new Error("ECDSA private key not found");
    const sig = await signWithEcdsa(ecdsaPrivHex, spkPub);
    await setKey("e2ee_spk_sig", sig);
  }

  // RK-2: после регенерации identity сервер обязан получить свежий бандл, иначе пиры
  // продолжат рукопожатия со старым identity. При сбое публикации сессии восстановятся
  // через reset-цикл при следующем старте приложения.
  if (identityRegenerated) {
    try {
      await ensureAndPublishPrekeys();
    } catch (e) {
      console.warn("[E2EE] Публикация prekeys после регенерации identity не удалась (будет повторена при старте):", e);
    }
  }

  // Автосохранение сейфа
  const username = typeof localStorage !== 'undefined'
    ? (localStorage.getItem("username") || localStorage.getItem("current_user_id"))
    : null;
  if (username && typeof sessionStorage !== 'undefined') {
    const pin = sessionStorage.getItem(`db_local_pin_${username}`);
    if (pin) {
      await uploadVault(pin, username).catch(err => {
        console.error("[E2EE Vault Auto-Save] Auto-save during ensureLocalIdentityKeys failed:", err);
      });
    }
  }
  
  return { ikPriv, ikPub, spkPriv, spkPub };
}

export async function ensureAndPublishPrekeys() {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem("session_token") : null;
  if (!token) return;
  
  const keys = await ensureLocalIdentityKeys();
  const ikPub = keys.ikPub;
  const spkPub = keys.spkPub;
  const spkSig = await getKey("e2ee_spk_sig");
  
  const localOpksJson = await getKey("e2ee_opks");
  const localOpks: Record<string, { priv: string; pub: string }> = parseOpkPoolSafe(localOpksJson);
  const opkList = [];
  
  // CRP-006: Ротация OPK. Использованные OPK удаляются сразу в initializeSessionB.
  // При публикации генерируем ТОЛЬКО новые ключи и шлем на сервер активный пул свежих неиспользованных ключей,
  // чтобы серверный wipe+reinsert в e2ee_one_time_prekeys не воскрешал ранее использованные.
  let opkPoolChanged = false;
  for (const idStr of Object.keys(localOpks)) {
    const numId = parseInt(idStr, 10);
    if (recentlyConsumedLocalOpks.has(idStr) || (!isNaN(numId) && numId <= 20)) {
      delete localOpks[idStr];
      opkPoolChanged = true;
    }
  }

  let seqFloor = parseInt((await getKey("e2ee_opk_seq_floor")) || "0", 10);
  if (isNaN(seqFloor) || seqFloor < 1000) {
    seqFloor = 1000 + (Math.floor(Date.now() / 1000) % 10000000);
  }

  const opkCount = Object.keys(localOpks).length;
  if (opkCount < 10) {
    const needed = 20 - opkCount;
    generateOpkBatch(localOpks, needed, seqFloor);
    opkPoolChanged = true;
  }

  let highestId = seqFloor;
  for (const idStr of Object.keys(localOpks)) {
    const num = parseInt(idStr, 10);
    if (!isNaN(num) && num > highestId) highestId = num;
  }
  if (highestId > seqFloor) {
    await setKey("e2ee_opk_seq_floor", String(highestId));
  }
  if (opkPoolChanged) {
    await setKey("e2ee_opks", JSON.stringify(localOpks));
  }

  // В payload на сервер отправляем ТОЛЬКО свежие неиспользованные OPK
  for (const id in localOpks) {
    opkList.push({
      id: parseInt(id, 10),
      key: localOpks[id].pub
    });
  }
  
  const mlsKyberPub = typeof localStorage !== 'undefined' ? (localStorage.getItem("mls_kyber_pub") || undefined) : undefined;

  try {
    const response = await fetch(getBackendUrl("/api/v1/crypto/prekey/publish"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        identityKey: ikPub,
        signedPrekey: {
          key: spkPub,
          signature: spkSig
        },
        oneTimePrekeys: opkList,
        deviceKeyKyber: mlsKyberPub
      })
    });
    if (!response.ok) {
      console.error("[E2EE Manager] Failed to publish prekeys to server");
    } else {
      console.log("[E2EE Manager] Prekeys published successfully to server");
    }
  } catch (err) {
    console.error("[E2EE Manager] Error publishing prekeys:", err);
  }

  // Автосохранение сейфа
  const username = typeof localStorage !== 'undefined'
    ? (localStorage.getItem("username") || localStorage.getItem("current_user_id"))
    : null;
  if (username && typeof sessionStorage !== 'undefined') {
    const pin = sessionStorage.getItem(`db_local_pin_${username}`);
    if (pin) {
      await uploadVault(pin, username).catch(err => {
        console.error("[E2EE Vault Auto-Save] Auto-save during ensureAndPublishPrekeys failed:", err);
      });
    }
  }
}


export async function initializeSessionA(recipientId: string, bundle: PrekeyBundle): Promise<any> {
  if (!bundle || !bundle.identityKey || !bundle.signedPrekey || !bundle.signedPrekey.key) {
    throw new Error(`Invalid prekey bundle for ${recipientId}`);
  }
  const keys = await ensureLocalIdentityKeys();
  const ikAPrivHex = keys.ikPriv;
  
  const ikAPriv = hexToBytes(ikAPrivHex);
  
  // Разделяем комбинированный identityKey Боба
  const ikBPubHex = bundle.identityKey;
  const ikBPubX25519Hex = ikBPubHex.substring(0, 64);
  const ikBPubEcdsaHex = ikBPubHex.substring(64);
  
  // Проверяем подпись signedPrekey
  const isSigValid = await verifyWithEcdsa(ikBPubEcdsaHex, bundle.signedPrekey.key, bundle.signedPrekey.signature);
  if (!isSigValid) {
    throw new Error("Invalid signed prekey signature");
  }
  
  const ikBPub = hexToBytes(ikBPubX25519Hex);
  const spkBPub = hexToBytes(bundle.signedPrekey.key);
  
  const ekA = generateX25519KeyPair();
  
  const dh1 = calculateX25519SharedSecret(ikAPriv, spkBPub);
  const dh2 = calculateX25519SharedSecret(ekA.privateKey, ikBPub);
  const dh3 = calculateX25519SharedSecret(ekA.privateKey, spkBPub);
  
  let combinedDH;
  if (bundle.oneTimePrekey) {
    const opkBPub = hexToBytes(bundle.oneTimePrekey.key);
    const dh4 = calculateX25519SharedSecret(ekA.privateKey, opkBPub);
    combinedDH = new Uint8Array([...dh1, ...dh2, ...dh3, ...dh4]);
  } else {
    combinedDH = new Uint8Array([...dh1, ...dh2, ...dh3]);
  }
  
  const sk = await hkdfDeriveKey(combinedDH, "X3DH-SharedKey", 32);
  
  const rk = sk;
  const dhLocal = generateX25519KeyPair();
  const dhRemote = spkBPub;
  
  const dhShared = calculateX25519SharedSecret(dhLocal.privateKey, dhRemote);
  const [rkNew, ckSend] = await kdfRK(rk, dhShared);
  
  const existingSession = await getSession(recipientId);
  const preservedFromSession = existingSession?.skippedMessageKeys ? { ...existingSession.skippedMessageKeys } : {};
  const preservedFromBuffer = await consumePreservedSkippedKeysForPeer(recipientId);
  const preservedSkippedKeys = { ...preservedFromSession, ...preservedFromBuffer };

  const session = {
    peerIdentityKey: bundle.identityKey,
    peerIdentityKeyHex: bundle.identityKey,
    rk: bytesToHex(rkNew),
    ckSend: bytesToHex(ckSend),
    ckRecv: "",
    dhLocalPriv: bytesToHex(dhLocal.privateKey),
    dhLocalPub: bytesToHex(dhLocal.publicKey),
    dhRemotePub: bytesToHex(dhRemote),
    ns: 0,
    nr: 0,
    pn: 0,
    createdAt: Date.now(),
    skippedMessageKeys: preservedSkippedKeys,
    x3dhInfo: {
      ekAPub: bytesToHex(ekA.publicKey),
      ekAPubHex: bytesToHex(ekA.publicKey),
      ikAPub: keys.ikPub,
      ikAPubHex: keys.ikPub,
      opkId: bundle.oneTimePrekey ? bundle.oneTimePrekey.id : null,
      isInitiator: true
    }
  };
  
  await saveSession(recipientId, session);
  return session;
}

export async function initializeSessionB(senderId: string, x3dhPayload: any, persist = true): Promise<any> {
  const keys = await ensureLocalIdentityKeys();
  const ikBPrivHex = keys.ikPriv;
  const spkBPrivHex = keys.spkPriv;
  
  const ikBPriv = hexToBytes(ikBPrivHex);
  const spkBPriv = hexToBytes(spkBPrivHex);
  
  // Разделяем комбинированный identityKey Алисы с полной поддержкой Dual-Casing
  const ikAPubHex = x3dhPayload.ikAPubHex || 
                    (x3dhPayload as any).ikaPubHex || 
                    (x3dhPayload as any).ikAPub || 
                    (x3dhPayload as any).ik_a_pub_hex;
  if (!ikAPubHex) {
    throw new Error("[E2EE] Missing ikAPub in X3DH payload");
  }
  const ikAPubX25519Hex = ikAPubHex.substring(0, 64);
  const ikAPub = hexToBytes(ikAPubX25519Hex);

  const ekAPubHex = x3dhPayload.ekAPubHex || 
                    (x3dhPayload as any).ekapubHex || 
                    (x3dhPayload as any).ekAPub || 
                    (x3dhPayload as any).ek_a_pub_hex;
  if (!ekAPubHex) {
    throw new Error("[E2EE] Missing ekAPub in X3DH payload");
  }
  const ekAPub = hexToBytes(ekAPubHex);
  
  const dh1 = calculateX25519SharedSecret(spkBPriv, ikAPub);
  const dh2 = calculateX25519SharedSecret(ikBPriv, ekAPub);
  const dh3 = calculateX25519SharedSecret(spkBPriv, ekAPub);
  
  let combinedDH;
  const targetOpkId = x3dhPayload.opkId !== undefined ? x3dhPayload.opkId : (x3dhPayload as any).opkid;
  if (targetOpkId !== null && targetOpkId !== undefined) {
    const localOpksJson = await getKey("e2ee_opks");
    const localOpks = parseOpkPoolSafe(localOpksJson);
    const opk = localOpks[targetOpkId];
    const recentSameFlightOpk = recentlyConsumedLocalOpks.get(String(targetOpkId));
    if (opk && opk.priv) {
      const opkBPriv = hexToBytes(opk.priv);
      const dh4 = calculateX25519SharedSecret(opkBPriv, ekAPub);
      combinedDH = new Uint8Array([...dh1, ...dh2, ...dh3, ...dh4]);
      // CRP-006 / CR-1: Использованный OPK удаляется локально ТОЛЬКО при persist=true
      if (persist) {
        recordConsumedLocalOpk(targetOpkId, opk, senderId, ekAPubHex);
        delete localOpks[targetOpkId];
        await setKey("e2ee_opks", JSON.stringify(localOpks));
      }
    } else if (
      recentSameFlightOpk &&
      recentSameFlightOpk.priv &&
      recentSameFlightOpk.senderId === String(senderId) &&
      recentSameFlightOpk.ekAPubHex === String(ekAPubHex).toLowerCase()
    ) {
      // Повторное обращение к тому же OPK в рамках того же самого X3DH-рукопожатия (тот же senderId и ekAPubHex, например ns > 0 или recovery)
      const opkBPriv = hexToBytes(recentSameFlightOpk.priv);
      const dh4 = calculateX25519SharedSecret(opkBPriv, ekAPub);
      combinedDH = new Uint8Array([...dh1, ...dh2, ...dh3, ...dh4]);
    } else {
      // CR-1: Отправитель выполнил 4-DH с целевым OPK, но ключ локально отсутствует или уже сожжён.
      // Запрещаем тихий 3-DH fallback (приводящий к гарантированному MAC-fail и расхождению ключей).
      throw new Error(`[E2EE initializeSessionB] OPK с id ${targetOpkId} отсутствует или уже использован локально (OPK consumed). 3-DH fallback запрещен.`);
    }
  } else {
    // Легитимный 3-DH (сервер выдал бандл без OPK)
    combinedDH = new Uint8Array([...dh1, ...dh2, ...dh3]);
  }
  
  const sk = await hkdfDeriveKey(combinedDH, "X3DH-SharedKey", 32);
  
  const rk = sk;
  
  // R3: Сохраняем неиспользованные skippedMessageKeys от предыдущей сессии при ре-инициализации
  const existingSession = await getSession(senderId);
  const preservedFromSession = existingSession?.skippedMessageKeys ? { ...existingSession.skippedMessageKeys } : {};
  const preservedFromBuffer = persist ? await consumePreservedSkippedKeysForPeer(senderId) : {};
  const preservedSkippedKeys = { ...preservedFromSession, ...preservedFromBuffer };

  const session = {
    peerIdentityKey: ikAPubHex,
    peerIdentityKeyHex: ikAPubHex,
    rk: bytesToHex(rk),
    ckSend: "",
    ckRecv: "",
    dhLocalPriv: spkBPrivHex,
    dhLocalPub: (await getKey("e2ee_spk_pub")) || "",
    dhRemotePub: bytesToHex(ekAPub),
    ns: 0,
    nr: 0,
    pn: 0,
    createdAt: Date.now(),
    skippedMessageKeys: preservedSkippedKeys,
    x3dhInfo: {
      ekAPub: ekAPubHex,
      ekAPubHex: ekAPubHex,
      ikAPub: ikAPubHex,
      ikAPubHex: ikAPubHex,
      opkId: targetOpkId ?? null,
      isInitiator: false
    }
  };
  
  if (persist) {
    await saveSession(senderId, session);
  }
  return session;
}

export async function getSelfHistoryKey(): Promise<CryptoKey> {
  const keys = await ensureLocalIdentityKeys();
  const ikPrivHex = keys.ikPriv;
  const ikPubX25519Hex = keys.ikPub.substring(0, 64);
  
  const ikPriv = hexToBytes(ikPrivHex);
  const ikPub = hexToBytes(ikPubX25519Hex);
  
  const sharedSecret = calculateX25519SharedSecret(ikPriv, ikPub);
  const keyBytes = await hkdfDeriveKey(sharedSecret, "GossipSelfHistory-SharedKey", 32);
  
  return await crypto.subtle.importKey(
    "raw",
    keyBytes as any,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function decryptSelfMessage(encryptedPayloadStr: string): Promise<string> {
  const payload = JSON.parse(encryptedPayloadStr);
  const { selfCiphertextHex, selfIvHex } = payload;
  if (!selfCiphertextHex || !selfIvHex) {
    throw new Error("No self-encryption fields found in payload");
  }
  
  const selfAesKey = await getSelfHistoryKey();
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: hexToBytes(selfIvHex) as any },
    selfAesKey,
    hexToBytes(selfCiphertextHex) as any
  );
  
  return new TextDecoder().decode(decryptedBuffer);
}

export interface EncryptMessageOptions {
  offlineBundle?: PrekeyBundle | null;
  forceX3DH?: boolean;
  preferOffline?: boolean;
}

const peersNeedingRehandshake = new Set<string>();

// v2.2.14 (анти-пинг-понг ре-рукопожатий): время последней успешной сходимости сессии с пиром.
// Метки ре-рукопожатия, приходящие сразу после сходимости (след crossed-handshake tie-break'а),
// подавляются кулдауном: casualties проигравшей ветки иначе запускали новый цикл
// одновременной пере-инициализации у обеих сторон бесконечно.
const sessionConvergedAt = new Map<string, number>();
export const REHANDSHAKE_MARK_COOLDOWN_MS = 45000;

export function recordSessionConverged(peerId: string): void {
  const pId = String(peerId);
  if (!pId) return;
  sessionConvergedAt.set(pId, Date.now());
}

/** Только для тестов: сброс состояния дебаунса сходимости. */
export function __resetRehandshakeDebounceForTests(): void {
  sessionConvergedAt.clear();
}

export function markPeerNeedsRehandshake(peerId: string, force = false): void {
  const pId = String(peerId);
  if (force) {
    sessionConvergedAt.delete(pId);
  }
  const convergedAt = sessionConvergedAt.get(pId) || 0;
  if (!force && convergedAt > 0 && Date.now() - convergedAt < REHANDSHAKE_MARK_COOLDOWN_MS) {
    console.log(`[E2EE Crypto] Метка ре-рукопожатия для ${pId} подавлена кулдауном анти-пинг-понга (сессия сведена ${Date.now() - convergedAt}мс назад).`);
    return;
  }
  peersNeedingRehandshake.add(pId);
  console.log(`[E2EE Crypto] Пир ${pId} помечен как требующий X3DH ре-рукопожатия (Self-Healing).`);
  setKey(`needs_rehandshake_${pId}`, "1").catch(err => {
    console.warn(`[E2EE Crypto] Ошибка сохранения ключа needs_rehandshake_${pId}:`, err);
  });
  // Персистируем флаг в сессию через мьютекс (CR-4)
  withPeerLock(pId, async () => {
    const session = await getSession(pId);
    if (session) {
      session.needsRehandshake = true;
      await saveSession(pId, session);
    }
  }).catch(err => {
    console.warn(`[E2EE Crypto] Ошибка персистирования needsRehandshake в сессию для ${pId}:`, err);
  });
}

export function isPeerNeedsRehandshake(peerId: string): boolean {
  return peersNeedingRehandshake.has(String(peerId));
}

export async function checkPeerNeedsRehandshakeAsync(peerId: string): Promise<boolean> {
  const pId = String(peerId);
  if (peersNeedingRehandshake.has(pId)) return true;
  try {
    const flag = await getKey(`needs_rehandshake_${pId}`);
    if (flag === "1") {
      peersNeedingRehandshake.add(pId);
      return true;
    }
    const session = await getSession(pId);
    if (session?.needsRehandshake) {
      peersNeedingRehandshake.add(pId);
      return true;
    }
  } catch (e) {
    // fallback to in-memory set
  }
  return false;
}

export function clearPeerNeedsRehandshake(peerId: string): void {
  const pId = String(peerId);
  peersNeedingRehandshake.delete(pId);
  setKey(`needs_rehandshake_${pId}`, "").catch(() => {});
}

export async function encryptMessage(
  recipientId: string,
  plaintext: string,
  options?: EncryptMessageOptions
): Promise<string> {
  return withPeerLock(recipientId, async () => {
    if (isE2EEMessage(plaintext)) {
      console.log(`[E2EE Crypto] Message for ${recipientId} is already E2EE encrypted, returning as is`);
      return plaintext;
    }
    let session = await getSession(recipientId);
    let isFirstMessage = false;
    
    const needsRehandshakeFlag = await checkPeerNeedsRehandshakeAsync(recipientId);
    // R2 Self-Healing: если сессии нет, либо запрошено принудительное X3DH, либо пир помечен как рассинхронизированный
    const needsFreshHandshake = !session || Boolean(options?.forceX3DH) || isPeerNeedsRehandshake(recipientId) || Boolean(session?.needsRehandshake) || needsRehandshakeFlag;

    if (needsFreshHandshake) {
      // CR-3: Не очищаем flag и буфер ДО успешного fetch и initializeSessionA!
      const preservedFromSession = session?.skippedMessageKeys ? { ...session.skippedMessageKeys } : {};
      let bundle: PrekeyBundle | null = options?.offlineBundle || null;
      let fetchedFromServer = false;
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem("session_token") : null;
      const isKnownOffline = Boolean(options?.preferOffline) || (typeof navigator !== 'undefined' && navigator.onLine === false);
      
      // MSH-1: Серверный бандл имеет наивысший приоритет. При наличии сетевого доступа сначала запрашиваем сервер (10s таймаут + ретрай для VPN)
      if (!bundle && token && !isKnownOffline) {
        for (let attempt = 0; attempt < 2 && !bundle; attempt++) {
          const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
          const timer = controller ? setTimeout(() => controller.abort(), 10000) : null;
          try {
            const res = await fetch(getBackendUrl(`/api/v1/crypto/prekey/bundle/${recipientId}`), {
              headers: { "Authorization": `Bearer ${token}` },
              ...(controller ? { signal: controller.signal } : {})
            });
            if (res.ok) {
              const fetched = await res.json();
              if (fetched && fetched.identityKey) {
                bundle = fetched;
                fetchedFromServer = true;
                // Кэшируем Shutdown-Safe 3-DH бандл БЕЗ одноразового OPK (TTL 7 суток),
                // чтобы при будущем шатдауне интернета оффлайн-кэш не содержал уже сожженный OPK (CR-2)
                await saveOfflinePrekeyBundle(recipientId, { ...fetched, oneTimePrekey: undefined }, 'server');
              }
              break;
            } else if (res.status === 404) {
              break;
            }
          } catch (fetchErr) {
            console.warn(`[E2EE Crypto] Попытка ${attempt + 1}/2 скачивания серверного бандла для ${recipientId} не удалась (VPN / таймаут):`, fetchErr);
            if (attempt === 0) {
              await new Promise(r => setTimeout(r, 400));
            }
          } finally {
            if (timer) clearTimeout(timer);
          }
        }
      }

      // Если сервер недоступен или оффлайн, используем локальный оффлайн-бандл (с проверкой TTL для BLE / 7d для Server 3-DH)
      if (!bundle) {
        bundle = await getOfflinePrekeyBundle(recipientId);
      }

      if (bundle) {
        // CR-2: Проверка на повторное использование сожженного OPK
        if (bundle.oneTimePrekey && bundle.oneTimePrekey.id !== undefined && bundle.oneTimePrekey.id !== null) {
          const opkKey = `${recipientId}:${bundle.oneTimePrekey.id}`;
          if (consumedServerOpkIds.has(opkKey)) {
            if (fetchedFromServer) {
              console.warn(`[E2EE Crypto] Сервер вернул уже использованный OPK id=${bundle.oneTimePrekey.id} для ${recipientId} (коллизия ID / 5s кэш). Переходим на чистый 3-DH без OPK.`);
              bundle = { ...bundle, oneTimePrekey: undefined };
              await saveOfflinePrekeyBundle(recipientId, bundle, 'server');
            } else {
              throw new Error(`[E2EE Fail-Closed] OPK с id ${bundle.oneTimePrekey.id} для пира ${recipientId} уже был использован ранее (CR-2). Повторная инициализация с сожженным OPK запрещена до успешного fresh-fetch.`);
            }
          }
        }

        console.log(`[E2EE Crypto] Инициализация сессии с ${recipientId} по прекей-бандлу (источник: ${bundle._source || 'offline'})`);
        const offlineBundle: PrekeyBundle = bundle._source === 'ble' 
          ? { ...bundle, oneTimePrekey: undefined } 
          : bundle;
        session = await initializeSessionA(recipientId, offlineBundle);
        const preservedFromBuffer = await consumePreservedSkippedKeysForPeer(recipientId);
        const preservedSkippedKeys = { ...preservedFromSession, ...preservedFromBuffer };
        if (Object.keys(preservedSkippedKeys).length > 0) {
          session.skippedMessageKeys = { ...preservedSkippedKeys, ...(session.skippedMessageKeys || {}) };
          await saveSession(recipientId, session);
        }

        // CR-2: Помечаем OPK как использованный
        if (bundle.oneTimePrekey && bundle.oneTimePrekey.id !== undefined && bundle.oneTimePrekey.id !== null) {
          recordConsumedServerOpk(recipientId, bundle.oneTimePrekey.id);
        }

        // CR-3: Очищаем флаг rehandshake ТОЛЬКО после успешного initializeSessionA и сохранения
        clearPeerNeedsRehandshake(recipientId);

        isFirstMessage = true;
      } else {
        throw new Error(`[E2EE Fail-Closed] Не удалось получить Prekey Bundle для ${recipientId}: отсутствует сетевой доступ и нет валидного оффлайн-бандла.`);
      }
    } else if (!session.ckRecv || session.nr === 0) {
      // Прикрепляем X3DH заголовок до тех пор, пока получатель не ответит первым сообщением в обратную сторону
      // (только если данная сессия является инициатором рукопожатия Session A)
      if (session.x3dhInfo && session.x3dhInfo.isInitiator !== false) {
        isFirstMessage = true;
      }
    }
    
    let ckSend = hexToBytes(session.ckSend);
    let dhLocalPub = hexToBytes(session.dhLocalPub);
    
    const [ckSendNew, messageKey] = await kdfCK(ckSend);
    session.ckSend = bytesToHex(ckSendNew);
    session.ns++;
    
    const aesKey = await crypto.subtle.importKey(
      "raw",
      messageKey as any,
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );
    
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);
    
    const encoder = new TextEncoder();
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as any },
      aesKey,
      encoder.encode(plaintext)
    );
    
    const ciphertextHex = bytesToHex(new Uint8Array(encryptedBuffer));
    const ivHex = bytesToHex(iv);
    
    // Шифрование "для себя" (Self-Encryption)
    let selfCiphertextHex = "";
    let selfIvHex = "";
    try {
      const selfAesKey = await getSelfHistoryKey();
      const selfIv = new Uint8Array(12);
      crypto.getRandomValues(selfIv);
      const selfEncryptedBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: selfIv as any },
        selfAesKey,
        encoder.encode(plaintext)
      );
      selfCiphertextHex = bytesToHex(new Uint8Array(selfEncryptedBuffer));
      selfIvHex = bytesToHex(selfIv);
    } catch (selfEncErr) {
      console.error("[E2EE Crypto] Ошибка шифрования для себя:", selfEncErr);
    }
    
    await saveSession(recipientId, session);
    
    const payload: any = {
      v: 2,
      ciphertextHex,
      ivHex,
      selfCiphertextHex,
      selfIvHex,
      dhLocalPubHex: bytesToHex(dhLocalPub),
      ns: session.ns - 1,
      pn: session.pn
    };
    
    if (isFirstMessage && session.x3dhInfo) {
      const ekHex = session.x3dhInfo.ekAPubHex || 
                    session.x3dhInfo.ekAPub || 
                    (session.x3dhInfo as any).ekapubHex || 
                    (session.x3dhInfo as any).ek_a_pub_hex;
      const ikHex = session.x3dhInfo.ikAPubHex || 
                    session.x3dhInfo.ikAPub || 
                    (await getKey("e2ee_ik_pub")) || "";
      payload.x3dh = {
        ikAPubHex: ikHex,
        ikaPubHex: ikHex,
        ikAPub: ikHex,
        ekAPubHex: ekHex,
        ekAPub: ekHex,
        opkId: session.x3dhInfo.opkId !== undefined ? session.x3dhInfo.opkId : null
      };
    }
    
    return JSON.stringify(payload);
  });
}

async function decryptWithSession(senderId: string, session: any, payload: any, shouldPersist = true): Promise<string> {
  const { ciphertextHex, ivHex, ns, pn } = payload;
  const rawDhLocalPubHex = String(payload.dhLocalPubHex || "");
  const dhLocalPubHex = rawDhLocalPubHex.toLowerCase();

  // 1. Проверка сохраненных пропущенных ключей (с Dual-Casing поддержкой)
  const skippedKey = `${dhLocalPubHex}:${ns}`;
  const altSkippedKey = `${rawDhLocalPubHex}:${ns}`;
  if (session.skippedMessageKeys && (session.skippedMessageKeys[skippedKey] || session.skippedMessageKeys[altSkippedKey])) {
    const messageKeyHex = session.skippedMessageKeys[skippedKey] || session.skippedMessageKeys[altSkippedKey];
    const messageKey = hexToBytes(messageKeyHex);
    delete session.skippedMessageKeys[skippedKey];
    delete session.skippedMessageKeys[altSkippedKey];
    
    const aesKey = await crypto.subtle.importKey(
      "raw",
      messageKey as any,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: hexToBytes(ivHex) as any },
      aesKey,
      hexToBytes(ciphertextHex) as any
    );
    
    if (shouldPersist) {
      await saveSession(senderId, session);
    }
    return new TextDecoder().decode(decryptedBuffer);
  }

  let rk = hexToBytes(session.rk);
  let ckRecv = session.ckRecv ? hexToBytes(session.ckRecv) : null;
  let dhLocalPriv = hexToBytes(session.dhLocalPriv);
  let dhLocalPub = hexToBytes(session.dhLocalPub);
  let dhRemotePub = hexToBytes(session.dhRemotePub);

  const MAX_SKIP = 1000;
  const incomingDhRemotePubHex = dhLocalPubHex;
  if (incomingDhRemotePubHex !== bytesToHex(dhRemotePub).toLowerCase() || !ckRecv) {
    // 1. Прокрутка старой цепочки
    if (ckRecv) {
      if (!session.skippedMessageKeys) {
        session.skippedMessageKeys = {};
      }
      if (pn - session.nr > MAX_SKIP) {
        throw new Error(`[E2EE DoubleRatchet] Превышен лимит пропуска ключей pn (${pn - session.nr} > ${MAX_SKIP})`);
      }
      const oldDhRemotePubHex = String(session.dhRemotePub || "").toLowerCase();
      while (session.nr < pn) {
        const [ckRecvNew, messageKey] = await kdfCK(ckRecv);
        const skippedKey = `${oldDhRemotePubHex}:${session.nr}`;
        session.skippedMessageKeys[skippedKey] = bytesToHex(messageKey);
        ckRecv = ckRecvNew;
        session.nr++;
      }
    }

    // 2. Поворот ратчета
    session.pn = session.ns;
    session.ns = 0;
    session.nr = 0;

    dhRemotePub = hexToBytes(incomingDhRemotePubHex);
    session.dhRemotePub = incomingDhRemotePubHex;

    const dhShared = calculateX25519SharedSecret(dhLocalPriv, dhRemotePub);
    const [rkNew, ckRecvNew] = await kdfRK(rk, dhShared);
    rk = rkNew;
    ckRecv = ckRecvNew;

    const dhLocalNew = generateX25519KeyPair();
    dhLocalPriv = dhLocalNew.privateKey;
    dhLocalPub = dhLocalNew.publicKey;
    session.dhLocalPriv = bytesToHex(dhLocalPriv);
    session.dhLocalPub = bytesToHex(dhLocalPub);

    const dhSharedNew = calculateX25519SharedSecret(dhLocalPriv, dhRemotePub);
    const [rkNew2, ckSendNew] = await kdfRK(rk, dhSharedNew);
    rk = rkNew2;
    session.rk = bytesToHex(rk);
    session.ckSend = bytesToHex(ckSendNew);

    if (ns > session.nr) {
      if (!session.skippedMessageKeys) {
        session.skippedMessageKeys = {};
      }
      if (ns - session.nr > MAX_SKIP) {
        throw new Error(`[E2EE DoubleRatchet] Превышен лимит пропуска ключей ns (${ns - session.nr} > ${MAX_SKIP})`);
      }
      const curDhRemotePubHex = bytesToHex(dhRemotePub).toLowerCase();
      while (session.nr < ns) {
        const [ckRecvNew, messageKey] = await kdfCK(ckRecv!);
        const skippedKey = `${curDhRemotePubHex}:${session.nr}`;
        session.skippedMessageKeys[skippedKey] = bytesToHex(messageKey);
        ckRecv = ckRecvNew;
        session.nr++;
      }
    }
  } else {
    if (typeof ns === "number" && ns < session.nr) {
      throw new Error(`[E2EE DoubleRatchet] Ключ сообщения ns=${ns} уже использован локально (текущий nr=${session.nr}, HistoricalOlder)`);
    }
    // 3. Прокрутка текущей цепочки (если ns > nr)
    if (ns > session.nr) {
      if (!session.skippedMessageKeys) {
        session.skippedMessageKeys = {};
      }
      if (ns - session.nr > MAX_SKIP) {
        throw new Error(`[E2EE DoubleRatchet] Превышен лимит пропуска ключей ns (${ns - session.nr} > ${MAX_SKIP})`);
      }
      const curDhRemotePubHex = bytesToHex(dhRemotePub).toLowerCase();
      while (session.nr < ns) {
        const [ckRecvNew, messageKey] = await kdfCK(ckRecv!);
        const skippedKey = `${curDhRemotePubHex}:${session.nr}`;
        session.skippedMessageKeys[skippedKey] = bytesToHex(messageKey);
        ckRecv = ckRecvNew;
        session.nr++;
      }
    }
  }

  // Ограничиваем размер кэша пропущенных ключей
  if (session.skippedMessageKeys) {
    const keys = Object.keys(session.skippedMessageKeys);
    if (keys.length > MAX_SKIP) {
      for (let i = 0; i < keys.length - MAX_SKIP; i++) {
        delete session.skippedMessageKeys[keys[i]];
      }
    }
  }

  const [ckRecvNew, messageKey] = await kdfCK(ckRecv!);
  session.ckRecv = bytesToHex(ckRecvNew);
  session.nr++;

  const aesKey = await crypto.subtle.importKey(
    "raw",
    messageKey as any,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: hexToBytes(ivHex) as any },
    aesKey,
    hexToBytes(ciphertextHex) as any
  );

  session.rk = bytesToHex(rk);
  if (shouldPersist) {
    await saveSession(senderId, session);
  }

  return new TextDecoder().decode(decryptedBuffer);
}

export const tieBreakLoserEks = new Set<string>();

if (typeof localStorage !== 'undefined') {
  try {
    const raw = localStorage.getItem("e2ee_tie_break_loser_eks");
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach((item: string) => tieBreakLoserEks.add(String(item)));
      }
    }
  } catch (e) {}
}

export function recordTieBreakLoserEk(senderId: string, ek: string): void {
  const key = `${senderId}:${ek.toLowerCase()}`;
  tieBreakLoserEks.add(key);
  if (typeof localStorage !== 'undefined') {
    try {
      const items = Array.from(tieBreakLoserEks).slice(-1000);
      localStorage.setItem("e2ee_tie_break_loser_eks", JSON.stringify(items));
    } catch (e) {}
  }
}

export async function decryptMessage(
  senderId: string,
  encryptedPayloadStr: string,
  options?: { isHistory?: boolean; msgTimestamp?: number }
): Promise<string> {
  return withPeerLock(senderId, async () => {
    let session = null;
    try {
      const payload = typeof encryptedPayloadStr === 'string' ? JSON.parse(encryptedPayloadStr) : encryptedPayloadStr;
      session = await getSession(senderId);

      const hasValidMsgTs = Boolean(options?.msgTimestamp && !isNaN(options.msgTimestamp) && options.msgTimestamp > 0);
      const isHistoricalOlderMessage = Boolean(
        session && (
          (session.createdAt && hasValidMsgTs)
            ? (session.createdAt > (options!.msgTimestamp as number))
            : Boolean(options?.isHistory)
        )
      );

      let sessionToUse = session;
      let shouldPersist = !isHistoricalOlderMessage;

      if (payload.x3dh) {
        const incomingEk = payload.x3dh.ekAPubHex || 
                           (payload.x3dh as any).ekapubHex || 
                           (payload.x3dh as any).ekAPub || 
                           (payload.x3dh as any).ek_a_pub_hex;

        const existingEk = session?.x3dhInfo?.ekAPubHex || 
                           (session?.x3dhInfo as any)?.ekapubHex || 
                           (session?.x3dhInfo as any)?.ekAPub || 
                           (session?.x3dhInfo as any)?.ek_a_pub_hex;

        const incomingEkStr = String(incomingEk || "").toLowerCase();
        const isLoserAbandonedHandshake = Boolean(
          incomingEkStr && tieBreakLoserEks.has(`${senderId}:${incomingEkStr}`)
        );

        // R2: Обнаружение встречной одновременной инициализации (Crossed Handshake Collision).
        // Если локальный клиент уже инициировал Session A (isInitiator === true) и еще не получил
        // ответа (!session.ckRecv || session.nr === 0), а входящее сообщение также несет новый X3DH:
        const isUnconfirmedInitiator = Boolean(
          session &&
          session.x3dhInfo &&
          session.x3dhInfo.isInitiator === true &&
          (!session.ckRecv || session.nr === 0)
        );
        const isCrossedCollision = Boolean(
          isUnconfirmedInitiator &&
          incomingEk &&
          existingEk &&
          incomingEk !== existingEk
        );

        const isNewHandshake = !session || !session.ckRecv || (
          Boolean(incomingEk) &&
          (!existingEk || String(existingEk).toLowerCase() !== incomingEkStr)
        );

        // CR-5: Если сессия уже установлена и активна (session.nr > 0, сессия жива)
        // и пришло сообщение с X3DH: проверяем, может ли существующая активная сессия расшифровать это сообщение.
        let decryptedByExistingSession: string | null = null;
        if (session && session.ckRecv && session.nr > 0 && !isHistoricalOlderMessage) {
          try {
            const sessionClone = JSON.parse(JSON.stringify(session));
            decryptedByExistingSession = await decryptWithSession(senderId, sessionClone, payload, false);
          } catch (_) {
            decryptedByExistingSession = null;
          }
        }

        if (isHistoricalOlderMessage) {
          // Историческое старое сообщение с X3DH: расшифровываем временной сессией,
          // НЕ затирая текущую более свежую сессию в БД
          sessionToUse = await initializeSessionB(senderId, payload.x3dh, false);
          shouldPersist = false;
        } else if (isCrossedCollision) {
          // Детерминированное разрешение встречной коллизии (Tie-Breaker).
          // Сравниваем локальный identity key и входящий ikAPub (с fallback на user ID).
          const localKeys = await ensureLocalIdentityKeys();
          const myIkPub = (localKeys.ikPub || "").toLowerCase();
          const incomingIk = String(
            payload.x3dh.ikAPubHex || 
            (payload.x3dh as any).ikaPubHex || 
            (payload.x3dh as any).ikAPub || 
            (payload.x3dh as any).ik_a_pub_hex || 
            ""
          ).toLowerCase();
          
          let isLocalWinner = false;
          if (myIkPub && incomingIk && myIkPub !== incomingIk) {
            isLocalWinner = myIkPub > incomingIk;
          } else {
            const myUserId = typeof localStorage !== 'undefined'
              ? (localStorage.getItem("current_user_id") || localStorage.getItem("my_user_id") || "me")
              : "me";
            isLocalWinner = String(myUserId).toLowerCase() > String(senderId).toLowerCase();
          }

          if (isLocalWinner) {
            // Локальный клиент побеждает: сохраняет свою Session A как активную,
            // а встречное сообщение расшифровывает временной Session B без перезаписи Session A в БД.
            console.log(`[E2EE Crypto] Встречная инициализация X3DH для ${senderId}: локальная сессия побеждает tie-break. Сохраняем Session A.`);
            sessionToUse = await initializeSessionB(senderId, payload.x3dh, false);
            shouldPersist = false;
            if (incomingEkStr) {
              recordTieBreakLoserEk(senderId, incomingEkStr);
            }
            recordSessionConverged(senderId);
          } else {
            // Локальный клиент уступает: переключается на Session B победителя.
            console.log(`[E2EE Crypto] Встречная инициализация X3DH для ${senderId}: удаленная сессия побеждает tie-break. Переключаемся на Session B.`);
            sessionToUse = await initializeSessionB(senderId, payload.x3dh, true);
            shouldPersist = true;
            recordSessionConverged(senderId);
          }
        } else if (isLoserAbandonedHandshake) {
          // CR-5: Второе сообщение проигравшего crossed-handshake (брошенная Session A с тем же ek) не перезаписывает живую сессию
          console.log(`[E2EE Crypto] Входящее сообщение от ${senderId} принадлежит проигравшему crossed-handshake (${incomingEk}). Расшифровка временной сессией без замены активной (CR-5).`);
          sessionToUse = await initializeSessionB(senderId, payload.x3dh, false);
          shouldPersist = false;
        } else if (decryptedByExistingSession !== null) {
          // Сообщение расшифровано текущей активной сессией: продвигаем ратчет реальной сессии
          console.log(`[E2EE Crypto] Сообщение от ${senderId} с X3DH успешно расшифровано активной сессией (nr=${session.nr}). Продвигаем ратчет активной сессии.`);
          return await decryptWithSession(senderId, session, payload, true);
        } else if (isNewHandshake) {
          console.log(`[E2EE Crypto] Обнаружено новое рукопожатие X3DH от ${senderId}. Инициализация Session B.`);
          sessionToUse = await initializeSessionB(senderId, payload.x3dh, true);
          shouldPersist = true;
        }
      } else if (!sessionToUse) {
        throw new Error("No E2EE session exists and no X3DH handshake header present");
      }

      try {
        return await decryptWithSession(senderId, sessionToUse, payload, shouldPersist);
      } catch (firstErr: any) {
        if (firstErr?.message?.includes("Превышен лимит пропуска ключей")) {
          throw firstErr;
        }
        if (payload.x3dh && !isHistoricalOlderMessage && shouldPersist) {
          console.warn(`[E2EE Crypto] Первая попытка расшифрования для ${senderId} завершилась сбоем (${firstErr}). Выполняем экстренное восстановление Session B из X3DH заголовка...`);
          try {
            // CR-6: Временная инициализация (persist=false). Проверяем успешность расшифровки ДО сохранения сессии в хранилище!
            const recoveredSession = await initializeSessionB(senderId, payload.x3dh, false);
            const decrypted = await decryptWithSession(senderId, recoveredSession, payload, false);
            // Расшифровка прошла успешно — теперь безопасно сохранить восстановленную сессию
            await saveSession(senderId, recoveredSession);
            // CR-1 / CR-6: Потребляем OPK после успешного персистирования восстановленной сессии
            const targetOpkId = payload.x3dh.opkId !== undefined ? payload.x3dh.opkId : payload.x3dh.opkid;
            if (targetOpkId !== null && targetOpkId !== undefined) {
              try {
                const localOpksJson = await getKey("e2ee_opks");
                if (localOpksJson) {
                  const localOpks = parseOpkPoolSafe(localOpksJson);
                  if (localOpks[targetOpkId]) {
                    const ekHex = payload.x3dh.ekAPubHex || payload.x3dh.ekAPub || "";
                    recordConsumedLocalOpk(targetOpkId, localOpks[targetOpkId], senderId, ekHex);
                    delete localOpks[targetOpkId];
                    await setKey("e2ee_opks", JSON.stringify(localOpks));
                  }
                }
              } catch (opkErr) {
                console.warn(`[E2EE Crypto] Ошибка удаления OPK ${targetOpkId} при восстановлении:`, opkErr);
              }
            }
            return decrypted;
          } catch (recoveryErr) {
            console.error(`[E2EE Crypto] Экстренное восстановление Session B для ${senderId} не помогло:`, recoveryErr);
            throw firstErr;
          }
        }
        throw firstErr;
      }
    } catch (err) {
      console.error(`[E2EE Crypto] Ошибка расшифрования сообщения от ${senderId}:`, err);
      throw err;
    }
  });
}

export function isE2EEMessage(text: any): boolean {
  if (!text) return false;
  
  if (typeof text === "object") {
    return text !== null && ("ciphertextHex" in text || "mlsCiphertextHex" in text) && "ivHex" in text;
  }
  
  if (typeof text !== "string") {
    return false;
  }

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null) {
      return ("ciphertextHex" in parsed || "mlsCiphertextHex" in parsed) && "ivHex" in parsed;
    }
    if (typeof parsed === "string") {
      try {
        const parsed2 = JSON.parse(parsed);
        return typeof parsed2 === "object" && parsed2 !== null && "ciphertextHex" in parsed2 && "ivHex" in parsed2;
      } catch {
        return false;
      }
    }
  } catch {
    try {
      const trimmed = text.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        const parsed = JSON.parse(trimmed);
        return isE2EEMessage(parsed);
      }
    } catch {}
  }
  return false;
}

// R-HOTFIX-227: маркер «расшифровано или создано локально этим клиентом».
// Symbol принципиально не переживает JSON-сериализацию: сетевой фрейм (злой сервер /
// MITM) физически не может его доставить, поэтому пропуск Fail-Closed по этому
// маркеру не открывает вектор инъекции открытого текста — §12.5 для сетевого
// plaintext остаётся в силе без изменений.
export const LOCALLY_DECRYPTED: unique symbol = Symbol("gossip.locallyDecrypted");

export function markLocallyDecrypted(m: any): any {
  try {
    if (m && typeof m === "object") (m as any)[LOCALLY_DECRYPTED] = true;
  } catch { /* объект заморожен — пропускаем молча */ }
  return m;
}

export function isLocallyDecrypted(m: any): boolean {
  try {
    return Boolean(m && typeof m === "object" && (m as any)[LOCALLY_DECRYPTED]);
  } catch {
    return false;
  }
}

export interface EncryptedMediaResult {
  encryptedBlob: Blob;
  keyHex: string;
  ivHex: string;
}

export async function encryptMediaBlob(blob: Blob): Promise<EncryptedMediaResult> {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  
  const exportedKey = await crypto.subtle.exportKey("raw", key);
  const keyHex = bytesToHex(new Uint8Array(exportedKey));
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ivHex = bytesToHex(iv);
  
  const arrayBuffer = await blob.arrayBuffer();
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    arrayBuffer
  );
  
  const encryptedBlob = new Blob([encryptedBuffer], { type: "application/octet-stream" });
  return { encryptedBlob, keyHex, ivHex };
}

export async function decryptMediaBuffer(
  arrayBuffer: ArrayBuffer,
  keyHex: string,
  ivHex: string
): Promise<ArrayBuffer> {
  const keyBytes = hexToBytes(keyHex);
  const ivBytes = hexToBytes(ivHex);
  
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes as any,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes as any },
    key,
    arrayBuffer
  );
  
  return decryptedBuffer;
}

export async function uploadVault(pin: string, userId: string): Promise<void> {
  const keysToRead = [
    "e2ee_ik_priv",
    "e2ee_ik_pub",
    "e2ee_ik_priv_ecdsa",
    "e2ee_ik_pub_ecdsa",
    "e2ee_spk_priv",
    "e2ee_spk_pub",
    "e2ee_spk_sig",
    "e2ee_opks"
  ];
  const keysObj: Record<string, string | null> = {};
  for (const name of keysToRead) {
    keysObj[name] = await getKey(name);
  }

  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const ivBytes = new Uint8Array(12);
  crypto.getRandomValues(ivBytes);

  const saltHex = bytesToHex(saltBytes);
  const ivHex = bytesToHex(ivBytes);

  const saltString = `gossip-vault-salt-v1-${userId}-${saltHex}`;
  const pbkdf2SaltBytes = new TextEncoder().encode(saltString);
  const pinBytes = new TextEncoder().encode(pin);

  const pbkdf2Key = await crypto.subtle.importKey(
    "raw",
    pinBytes,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const kek = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: pbkdf2SaltBytes,
      iterations: 600000,
      hash: "SHA-256"
    },
    pbkdf2Key,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  const jsonString = JSON.stringify(keysObj);
  const jsonBytes = new TextEncoder().encode(jsonString);
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBytes as any },
    kek,
    jsonBytes as any
  );

  const ciphertextHex = bytesToHex(new Uint8Array(encryptedBuffer));

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem("session_token") : null;
  if (!token) {
    throw new Error("No session token found in localStorage");
  }

  const response = await fetch(getBackendUrl("/api/v1/crypto/vault/upload"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      ciphertext: ciphertextHex,
      iv: ivHex,
      salt: saltHex
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to upload vault: ${response.statusText}`);
  }
}

export async function downloadAndRestoreVault(pin: string, userId: string): Promise<boolean> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem("session_token") : null;
  if (!token) {
    throw new Error("No session token found in localStorage");
  }

  const response = await fetch(getBackendUrl("/api/v1/crypto/vault/download"), {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (response.status === 404) {
    return false;
  }

  if (!response.ok) {
    throw new Error(`Failed to download vault: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const { ciphertext, iv, salt } = data;

  const ivBytes = hexToBytes(iv);
  const ciphertextBytes = hexToBytes(ciphertext);

  const saltString = `gossip-vault-salt-v1-${userId}-${salt}`;
  const pbkdf2SaltBytes = new TextEncoder().encode(saltString);
  const pinBytes = new TextEncoder().encode(pin);

  const pbkdf2Key = await crypto.subtle.importKey(
    "raw",
    pinBytes,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const kek = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: pbkdf2SaltBytes,
      iterations: 600000,
      hash: "SHA-256"
    },
    pbkdf2Key,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  let decryptedBuffer: ArrayBuffer;
  try {
    decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBytes as any },
      kek,
      ciphertextBytes as any
    );
  } catch (err) {
    throw new Error("Failed to decrypt vault. Incorrect PIN or corrupted data.");
  }

  const jsonString = new TextDecoder().decode(decryptedBuffer);
  const keysObj = JSON.parse(jsonString);

  const existingIkPriv = await getKey("e2ee_ik_priv");
  const existingIkPub = await getKey("e2ee_ik_pub");
  const hasActiveLocalIdentity = Boolean(existingIkPriv && existingIkPub);

  for (const [keyName, keyValue] of Object.entries(keysObj)) {
    if (keyValue === null || keyValue === undefined) continue;
    if (keyName === "e2ee_opks") {
      const vaultOpks = parseOpkPoolSafe(keyValue as string);
      const currentOpks = parseOpkPoolSafe(await getKey("e2ee_opks"));
      const mergedOpks: Record<string, { priv: string; pub: string }> = { ...vaultOpks, ...currentOpks };
      for (const idStr of Object.keys(mergedOpks)) {
        if (recentlyConsumedLocalOpks.has(idStr)) {
          delete mergedOpks[idStr];
        }
      }
      await setKey("e2ee_opks", JSON.stringify(mergedOpks));
    } else if (hasActiveLocalIdentity && keyName.startsWith("e2ee_") && existingIkPriv !== keysObj.e2ee_ik_priv) {
      // Не затираем активные локальные ключи более старым снимком сейфа с другой identity
      continue;
    } else {
      await setKey(keyName, keyValue as string);
    }
  }

  return true;
}

/**
 * CRP-011: Возвращает реальный identityKeyHex собеседника из E2EE сессии или кэшированного прекей-бандла.
 * Используется в SafetyNumberModal для исключения фоллбэка на UUID.
 */
export async function getPeerIdentityKey(peerId: string): Promise<string | null> {
  if (!peerId) return null;

  // 1. Проверяем существующую E2EE-сессию (Session A или B)
  try {
    const session = await getSession(peerId);
    if (session) {
      if (session.peerIdentityKeyHex) return session.peerIdentityKeyHex;
      if (session.peerIdentityKey) return session.peerIdentityKey;
      if (session.x3dhInfo && session.x3dhInfo.ikAPubHex) return session.x3dhInfo.ikAPubHex;
      if (session.x3dhInfo && session.x3dhInfo.ikAPub) return session.x3dhInfo.ikAPub;
    }
  } catch {}

  // 2. Проверяем сохранённый доверенный прекей-бандл
  try {
    const bundle = await getOfflinePrekeyBundle(peerId);
    if (bundle && bundle.identityKey) {
      return bundle.identityKey;
    }
  } catch {}

  return null;
}


