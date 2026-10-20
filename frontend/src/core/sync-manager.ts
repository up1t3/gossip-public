// E:\Boltalka\frontend\src\core\sync-manager.ts
import { tdlib } from "./tdlib/tdlib-adapter";
import { storageManager } from "./storage/storage-manager";
import { outboxMediaStore } from "./storage/outbox-media-store";
import { offlineMeshManager } from "./mesh/offline-mesh-manager";
import { transportManager, MeshEnvelope } from "./transport";
import { getBackendUrl } from "../utils/url";
import { decryptMessage, encryptMessage, isE2EEMessage, deleteSession, decryptSelfMessage, getSession, markPeerNeedsRehandshake } from "./crypto/double-ratchet";
import { markLocallyDecrypted, isLocallyDecrypted, encryptMediaBlob, prewarmContactPrekeyBundles } from "./crypto/e2ee";
import {
  MlsSession,
  Kyber1024,
  getLocalMlsKeyPair,
  calculateX25519SharedSecret,
  hkdfDeriveKey
} from "./crypto/mls";
import { bytesToHex, hexToBytes } from "./tdlib/crypto";
import { compressVideoNote, ensureUniversalAudioBlob } from "../features/ffmpeg/videoCompressor";

export interface SyncConfig {
  gapThreshold: number; // Максимальная разница pts для обычной синхронизации
  coldStartThreshold: number; // Разница pts, определяющая GAP_TOO_LARGE (холодный старт)
}

export interface CipherEnvelope {
  senderId: string;
  recipientId: string;
  ciphertext: string;
  x3dh?: any;
  messageId: string;
  timestamp: number;
  type?: string;
  mediaKey?: string;
  mediaIv?: string;
}

export const KNOWN_PAYLOAD_TYPES = new Set([
  "text", "photo", "video", "voice", "video_note",
  "sticker", "document", "location", "contact", "poll", "service"
]);

function safeParsePeaks(peaks: any): number[] | undefined {
  if (!peaks) return undefined;
  if (Array.isArray(peaks)) return peaks;
  if (typeof peaks === 'string') {
    try {
      const parsed = JSON.parse(peaks);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.warn("[SyncManager] Ошибка парсинга peaks:", e);
    }
  }
  return undefined;
}

function saveMlsSession(session: MlsSession) {
  try {
    const sessionStr = session.serialize();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`mls_session_v2_${session.chatId}`, sessionStr);
    }
    storageManager.execute(
      "INSERT OR REPLACE INTO e2ee_sessions (user_id, session_data) VALUES (?, ?);",
      [session.chatId, sessionStr]
    ).catch(err => {
      console.error(`[SyncManager saveMlsSession] Ошибка записи в SQLite для ${session.chatId}:`, err);
    });
  } catch (err) {
    console.error(`Ошибка сериализации MLS сессии для ${session.chatId}:`, err);
  }
}

function loadMlsSession(chatId: string): MlsSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(`mls_session_v2_${chatId}`);
  if (!raw) return null;
  try {
    return MlsSession.deserialize(raw);
  } catch (err) {
    console.error(`Ошибка загрузки MLS сессии для ${chatId}:`, err);
    return null;
  }
}

// FA-10: TTL-негативный кэш неизвестных/фантомных userId (TTL 10 минут)
const userNegativeCache = new Map<string, number>();
const USER_NEGATIVE_CACHE_TTL_MS = 10 * 60 * 1000;

export function recordNegativeUserCache(userId: string): void {
  if (!userId) return;
  const cleanId = String(userId).trim();
  userNegativeCache.set(cleanId, Date.now());
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`gossip_neg_user_${cleanId}`, String(Date.now()));
    }
  } catch {}
}

export function isUserNegativelyCached(userId: string): boolean {
  if (!userId) return false;
  const cleanId = String(userId).trim();
  const memTime = userNegativeCache.get(cleanId);
  const now = Date.now();
  if (memTime && (now - memTime < USER_NEGATIVE_CACHE_TTL_MS)) {
    return true;
  }
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(`gossip_neg_user_${cleanId}`);
      if (stored) {
        const ts = Number(stored);
        if (now - ts < USER_NEGATIVE_CACHE_TTL_MS) {
          userNegativeCache.set(cleanId, ts);
          return true;
        } else {
          localStorage.removeItem(`gossip_neg_user_${cleanId}`);
        }
      }
    }
  } catch {}
  return false;
}

export function shouldQueryUserInfo(userId: string): boolean {
  return !isUserNegativelyCached(userId);
}

export function resolveSenderDisplayName(sender: string, senderName?: string): string {
  const cleanSender = String(sender || '').trim();
  const cleanSenderName = String(senderName || '').trim();

  if (cleanSender && isUserNegativelyCached(cleanSender)) {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanSender)) {
      return `Пользователь #${cleanSender.slice(-4).toUpperCase()}`;
    }
    return 'Пользователь';
  }

  if (
    cleanSenderName &&
    cleanSenderName !== 'Собеседник' &&
    cleanSenderName !== 'Я' &&
    cleanSenderName !== 'other' &&
    cleanSenderName !== 'others' &&
    cleanSenderName !== 'undefined' &&
    cleanSenderName !== 'null' &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanSenderName)
  ) {
    return cleanSenderName;
  }
  if (cleanSender === 'me' || cleanSenderName === 'Я') {
    return 'Я';
  }
  if (typeof localStorage !== 'undefined' && cleanSender) {
    const cached = localStorage.getItem(`${cleanSender}_name`) || localStorage.getItem(`username_${cleanSender}`);
    if (cached && cached !== 'Собеседник' && cached !== 'other' && cached !== 'others' && cached !== 'undefined' && cached !== 'null') {
      return cached;
    }
  }
  if (
    cleanSender &&
    cleanSender !== 'other' &&
    cleanSender !== 'others' &&
    cleanSender !== 'undefined' &&
    cleanSender !== 'null' &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanSender)
  ) {
    return cleanSender;
  }
  if (cleanSender && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanSender)) {
    return `Пользователь #${cleanSender.slice(-4).toUpperCase()}`;
  }
  return 'Пользователь';
}

export function isPlaceholderChatName(name?: string | null): boolean {
  if (!name) return true;
  const clean = String(name).trim();
  if (!clean) return true;
  if (
    clean === 'Собеседник' ||
    clean === 'Собеседник (Mesh)' ||
    clean === 'Чат' ||
    clean === 'other' ||
    clean === 'others' ||
    clean === 'undefined' ||
    clean === 'null' ||
    clean === 'Пользователь' ||
    clean.startsWith('Пользователь #')
  ) {
    return true;
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
    return true;
  }
  return false;
}

export const DECRYPT_ATTEMPTED: unique symbol = Symbol("gossip.decryptAttempted");

export function markDecryptAttempted(m: any): any {
  try {
    if (m && typeof m === "object") {
      (m as any)[DECRYPT_ATTEMPTED] = true;
      (m as any)._decryptAttempted = true;
    }
  } catch {}
  return m;
}

export function isDecryptAttempted(m: any): boolean {
  try {
    return Boolean(m && typeof m === "object" && ((m as any)[DECRYPT_ATTEMPTED] || (m as any)._decryptAttempted));
  } catch {
    return false;
  }
}

export function unpackDecryptedPayload(chatId: string, m: any, decrypted: string): any {
  if (!decrypted) return m;
  // R-HOTFIX-227: единая точка всех успешных локальных расшифровок — помечаем объект,
  // чтобы повторный прогон через decryptMessageIfNeeded (двойная обработка
  // saveMessageToDb) не применял Fail-Closed к уже расшифрованному тексту.
  markLocallyDecrypted(m);

  try {
    const parsed = JSON.parse(decrypted);
    if (parsed && typeof parsed === "object") {
      // 1. Опросы (M2.3 Polls)
      if (parsed.type === "poll" || parsed.poll) {
        m.type = "poll";
        m.poll = parsed.poll || parsed;
        m.text = parsed.text || parsed.poll?.question || "📊 Опрос";
        if (parsed.poll?.tally) {
          SyncManager.getInstance().setPollTally(chatId, m.id, parsed.poll.tally, parsed.poll.totalVoters);
        }
        return m;
      }

      // 2. Служебные сообщения голосования в MLS группе (§6.2)
      if (parsed.type === "service" && parsed.action === "poll_vote") {
        m.isService = true;
        m.serviceAction = "poll_vote";
        m.pollId = parsed.pollId;
        m.optionIds = parsed.optionIds;
        m.text = "Системное сообщение: голос в опросе учтен";
        SyncManager.getInstance().registerPollVote(
          chatId,
          parsed.pollId,
          parsed.targetMessageId || parsed.pollId,
          m.sender,
          parsed.optionIds
        );
        return m;
      }

      // 3. Медиа-сообщения или стандартный открытый текст
      if ("text" in parsed) {
        m.text = parsed.text;
        m.type = parsed.type || "text";
        m.mediaUrl = parsed.mediaUrl || null;
        m.peaks = safeParsePeaks(parsed.peaks) || null;
        m.mediaKey = parsed.key || parsed.mediaKey || null;
        m.mediaIv = parsed.iv || parsed.mediaIv || null;
        m.isE2EEDecryptFailed = false;
        m.isPendingKey = false;
        if (parsed.topic_id !== undefined) {
          m.topic_id = parsed.topic_id;
        }
        // R3 (M3.1 TTL): ttlSeconds живёт внутри шифротекста; локальный дедлайн
        // считается от серверного timestamp сообщения (клиентское время — fallback)
        if (parsed.ttlSeconds && parsed.ttlSeconds > 0) {
          m.ttl_seconds = parsed.ttlSeconds;
          const base = m.timestamp || Date.now();
          m.expires_at = base + parsed.ttlSeconds * 1000;
        }
        // R4 (M4.1/M4.2): геолокация, контакты, документы — строго внутри шифротекста
        if (parsed.lat !== undefined && parsed.lng !== undefined) {
          m.lat = parsed.lat;
          m.lng = parsed.lng;
          if (parsed.liveUntil) m.liveUntil = parsed.liveUntil;
          if (parsed.heading !== undefined) m.heading = parsed.heading;
        }
        if (parsed.contact) {
          m.contact = parsed.contact;
        }
        if (parsed.filename) {
          m.filename = parsed.filename;
          m.fileSize = parsed.size;
          m.mimeType = parsed.mimeType;
        }
        return m;
      }
    }
  } catch {
    // Не JSON, используем текст как есть
  }

  m.text = decrypted;
  return m;
}

// R-HOTFIX-227 (v2.2.7): одноразовое лечение строк, отравленных в v2.2.5–v2.2.6
// двойной обработкой (decrypt → saveMessageToDb → повторный Fail-Closed гейт):
// text восстанавливается из raw_encrypted. Если там шифротекст — строка
// перерасшифруется на лету при открытии чата (App.tsx); если plaintext — это наш
// собственный локальный текст. Исторический [service_session_reset] остаётся
// заглушкой (§12.3). Идемпотентно: после лечения совпадений больше нет.
export async function healFailClosedPlaceholderRows(): Promise<void> {
  try {
    // R1: Исцеляем ранее испорченные служебные сбросы [service_session_reset],
    // возвращая исходный служебный текст и признак isService
    try {
      await storageManager.execute(
        `UPDATE messages SET text = raw_encrypted, isService = 1
         WHERE (text = '🔒 Сообщение отклонено: не зашифровано (Fail-Closed)' OR text LIKE '🔒 Синхронизация%')
           AND raw_encrypted = '[service_session_reset]'`
      );
    } catch (colErr) {
      await storageManager.execute(
        `UPDATE messages SET text = raw_encrypted
         WHERE (text = '🔒 Сообщение отклонено: не зашифровано (Fail-Closed)' OR text LIKE '🔒 Синхронизация%')
           AND raw_encrypted = '[service_session_reset]'`
      );
    }
    await storageManager.execute(
      `UPDATE messages SET text = raw_encrypted
       WHERE text = '🔒 Сообщение отклонено: не зашифровано (Fail-Closed)'
         AND raw_encrypted IS NOT NULL
         AND raw_encrypted <> '[service_session_reset]'`
    );

    // SM-7: Расширение лечения отравленных строк:
    // 1. Строки «🔒 Синхронизация...» или «🔒 Сообщение отклонено...», где raw_encrypted затёрт заглушкой
    //    или пуст/NULL — помечаем как честную ошибку с raw_encrypted = NULL, чтобы остановить вечный ретрай.
    await storageManager.execute(
      `UPDATE messages SET text = '🔒 Не удалось расшифровать сообщение', raw_encrypted = NULL
       WHERE (text LIKE '🔒 Синхронизация%' OR text = '🔒 Сообщение отклонено: не зашифровано (Fail-Closed)')
         AND (raw_encrypted LIKE '🔒%' OR raw_encrypted IS NULL OR raw_encrypted = '')`
    );

    // 2. Строки с невалидным (не-E2EE JSON) raw_encrypted — помечаем ошибкой и очищаем raw_encrypted.
    // Строки с валидным E2EE-JSON в raw_encrypted оставляем нетронутыми для ретрая SM-3.
    const pendingRows = await storageManager.query<{ id: string; raw_encrypted: string | null }>(
      `SELECT id, raw_encrypted FROM messages 
       WHERE (text LIKE '🔒 Синхронизация%' OR text = '🔒 Сообщение отклонено: не зашифровано (Fail-Closed)')
         AND raw_encrypted IS NOT NULL 
         AND raw_encrypted <> '[service_session_reset]'`
    );
    for (const r of pendingRows) {
      if (r.raw_encrypted && !isE2EEMessage(r.raw_encrypted)) {
        await storageManager.execute(
          `UPDATE messages SET text = '🔒 Не удалось расшифровать сообщение', raw_encrypted = NULL WHERE id = ?`,
          [r.id]
        );
      }
    }
  } catch (e) {
    console.error("[SyncManager] healFailClosedPlaceholderRows: ошибка миграции-лечения:", e);
  }
}

export async function decryptMessageIfNeeded(chatId: string, m: any, isHistory = false): Promise<any> {
  if (!m || !m.text) return m;
  if (isDecryptAttempted(m)) return m;

  // Защита Forward Secrecy (Double Ratchet): если сообщение с этим ID уже было успешно
  // расшифровано ранее и сохранено в SQLite, категорически не пытаемся повторно прогнать
  // его через decryptMessage (так как одноразовый ключ цепочки уже уничтожен после первой расшифровки).
  if (m.id && isE2EEMessage(m.text)) {
    try {
      const existingRows = await storageManager.query<{
        sender: string;
        text: string;
        type: string | null;
        mediaUrl: string | null;
        peaks: string | null;
        mediaKey: string | null;
        mediaIv: string | null;
      }>(
        "SELECT sender, text, type, mediaUrl, peaks, mediaKey, mediaIv FROM messages WHERE id = ? LIMIT 1;",
        [m.id]
      );
      if (existingRows.length > 0) {
        const ex = existingRows[0];
        const isAlreadyDecryptedText =
          ex.text &&
          !ex.text.startsWith("🔒") &&
          !ex.text.startsWith("[Ошибка") &&
          !ex.text.startsWith("[Ключ") &&
          !isE2EEMessage(ex.text) &&
          ex.text !== "[encrypted_pending]";
        const hasValidMediaKeys =
          !ex.mediaUrl ||
          !ex.mediaUrl.includes(".enc") ||
          Boolean(ex.mediaKey && ex.mediaIv);
        if (isAlreadyDecryptedText && hasValidMediaKeys) {
          m.text = ex.text;
          m.type = ex.type || m.type || "text";
          m.mediaUrl = ex.mediaUrl || m.mediaUrl || null;
          m.peaks = safeParsePeaks(ex.peaks) || m.peaks || null;
          m.mediaKey = ex.mediaKey || m.mediaKey || null;
          m.mediaIv = ex.mediaIv || m.mediaIv || null;
          if (ex.sender === "me") {
            m.sender = "me";
          }
          m.isE2EEDecryptFailed = false;
          m.isPendingKey = false;
          markLocallyDecrypted(m);
          markDecryptAttempted(m);
          return m;
        }
      }
    } catch {
      // Игнорируем ошибку чтения из БД и продолжаем штатную расшифровку
    }
  }
  
  console.log("[SyncManager DEBUG] decryptMessageIfNeeded вызван: chatId=" + chatId + ", msgId=" + m.id + ", sender=" + m.sender + ", textSample=" + (typeof m.text === "string" ? m.text.substring(0, 50) : "not_string"));
  
  try {
    const chat = await storageManager.query<{ isGroup: number; type?: string; name?: string }>("SELECT isGroup, type, name FROM chats WHERE id = ? LIMIT 1;", [chatId]);
    const isChannel = chat.length > 0 && chat[0].type === 'channel';
    const isBot = (chat.length > 0 && (chat[0].type === 'bot' || /bot$/i.test(String(chat[0].name || '').trim()))) ||
                  Boolean(m.isBot || m.is_bot || m.replyMarkup || m.reply_markup) ||
                  /bot$/i.test(String(m.senderName || m.sender_name || '').trim()) ||
                  (typeof localStorage !== 'undefined' && localStorage.getItem('bot_chat_' + chatId) === '1');

    if (isChannel || isBot) {
      if (isBot && typeof localStorage !== 'undefined') {
        try { localStorage.setItem('bot_chat_' + chatId, '1'); } catch {}
      }
      // Публичный канал или бот: открытый JSON / текст без E2EE
      markLocallyDecrypted(m);
      markDecryptAttempted(m);
      return unpackDecryptedPayload(chatId, m, m.text);
    }

    let isGroup = chat.length > 0 ? (chat[0].isGroup === 1 || chat[0].type === 'group') : false;
    const isKnownNonGroup = chat.length > 0 && chat[0].isGroup === 0 && chat[0].type !== 'group';
    
    if (!isGroup && !isKnownNonGroup) {
      // Проверяем, есть ли MLS сессия или приветственный пакет
      const syncManager = SyncManager.getInstance();
      const session = syncManager.getMlsSession(chatId);
      if (session) {
        isGroup = true;
      } else {
        const wpSession = await syncManager.initMlsSessionFromWelcomePackage(chatId);
        if (wpSession) {
          isGroup = true;
        }
      }
      
      // Если обнаружили, что это группа, обновим статус в SQLite
      if (isGroup) {
        if (chat.length > 0) {
          await storageManager.execute("UPDATE chats SET isGroup = 1, avatar = '👥' WHERE id = ?;", [chatId]);
        } else {
          await storageManager.execute(
            "INSERT INTO chats (id, name, avatar, lastMessage, time, unread, isGroup, online, pts) VALUES (?, 'Группа', '👥', '', '', 0, 1, 0, 0);",
            [chatId]
          );
        }
      }
    }
    
    if (isGroup) {
      // 1. Проверяем, не является ли открытый текст коммитом MLS
      if (typeof m.text === "string" && m.text.startsWith("mls_commit:")) {
        const commitMsg = m.text.substring("mls_commit:".length);
        
        try {
          const commitData = JSON.parse(commitMsg);
          if (commitData && commitData.reset === true) {
            const myUsername = localStorage.getItem("username") || "";
            const isMe = m.sender === 'me' || 
                         (m.sender && myUsername && m.sender.toString().toLowerCase() === myUsername.toLowerCase());
            
            // Если отправитель не мы, принудительно инициализируем сессию из Welcome Package
            if (!isMe) {
              await SyncManager.getInstance().initMlsSessionFromWelcomePackage(chatId, true);
            }
            
            m.text = "Системное сообщение: группа обновлена (сессия сброшена)";
            m.isService = true;
            markDecryptAttempted(m);
            return m;
          }
        } catch (e) {
          // Игнорируем ошибку парсинга, пробуем обработать как стандартный коммит
        }

        let session = SyncManager.getInstance().getMlsSession(chatId);
        if (!session) {
          session = await SyncManager.getInstance().initMlsSessionFromWelcomePackage(chatId);
        }
        if (session) {
          try {
            await session.processCommit(commitMsg);
            SyncManager.getInstance().setMlsSession(chatId, session);
            m.text = `Системное сообщение: эпоха обновлена до ${session.currentEpoch.epochNumber}`;
            m.isService = true;
          } catch (err) {
            console.error("[SyncManager] Ошибка processCommit для открытого коммита, пробуем переинициализацию:", err);
            const newSession = await SyncManager.getInstance().initMlsSessionFromWelcomePackage(chatId, true);
            if (newSession) {
              m.text = `Системное сообщение: эпоха обновлена до ${newSession.currentEpoch.epochNumber}`;
              m.isService = true;
            }
          }
        }
        markDecryptAttempted(m);
        return m;
      }

      // 2. Если это E2EE сообщение
      const isE2EE = isE2EEMessage(m.text);
      if (isE2EE) {
        let session = SyncManager.getInstance().getMlsSession(chatId);
        if (!session) {
          session = await SyncManager.getInstance().initMlsSessionFromWelcomePackage(chatId);
        }
        
        if (session) {
          try {
            const parsedPayload = JSON.parse(m.text);
            const decrypted = await session.decryptMessage(
              parsedPayload.mlsCiphertextHex || parsedPayload.ciphertextHex,
              parsedPayload.ivHex,
              parsedPayload.epochNumber
            );
            
            // Проверяем, не является ли расшифрованный текст коммитом
            if (decrypted.startsWith("mls_commit:")) {
              const commitMsg = decrypted.substring("mls_commit:".length);
              try {
                await session.processCommit(commitMsg);
                SyncManager.getInstance().setMlsSession(chatId, session);
                m.text = `Системное сообщение: эпоха обновлена до ${session.currentEpoch.epochNumber}`;
                m.isService = true;
              } catch (err) {
                console.error("[SyncManager] Ошибка processCommit для зашифрованного коммита, пробуем переинициализацию:", err);
                const newSession = await SyncManager.getInstance().initMlsSessionFromWelcomePackage(chatId, true);
                if (newSession) {
                  m.text = `Системное сообщение: эпоха обновлена до ${newSession.currentEpoch.epochNumber}`;
                  m.isService = true;
                }
              }
              markDecryptAttempted(m);
              return m;
            }

            // Обычное текстовое, медиа, опрос или сервисное сообщение
            unpackDecryptedPayload(chatId, m, decrypted);
            SyncManager.getInstance().resetMlsRetryTracker(chatId);

            const currentUserId = typeof window !== "undefined" ? localStorage.getItem("current_user_id") : null;
            const myUsername = typeof window !== "undefined" ? localStorage.getItem("username") : null;
            const isMe = (m.sender === "me" || m.senderName === "Я" || 
                          (currentUserId && m.sender === currentUserId) ||
                          (myUsername && m.sender && m.sender.toString().toLowerCase() === myUsername.toLowerCase()));
            if (!isMe && !m.isService) {
              const senderName = m.senderName || m.sender;
              if (senderName && senderName !== "me" && senderName !== "Я") {
                m.text = `${senderName}: ${m.text}`;
              }
            }
          } catch (decryptErr) {
            console.error(`[SyncManager] Ошибка расшифрования MLS сообщения в группе ${chatId}:`, decryptErr);
            const syncMgr = SyncManager.getInstance();
            if (syncMgr.shouldRetryMls(chatId)) {
              m.isPendingKey = true;
              m.isE2EEDecryptFailed = true;
              m.rawEncryptedPayload = m.text;
              m.text = "🔒 Синхронизация защищенного сообщения...";
              syncMgr.initMlsSessionFromWelcomePackage(chatId).then(sess => {
                if (sess) {
                  syncMgr.retryDecryptPendingMessages(chatId);
                }
              }).catch(err => {
                console.warn(`[SyncManager] Фоновое обновление Welcome Package для группы ${chatId}:`, err);
              });
            } else {
              m.isTerminalFail = true;
              m.isE2EEDecryptFailed = true;
              m.isPendingKey = false;
              m.rawEncryptedPayload = null;
              m.raw_encrypted = null;
              m.text = "🔒 Не удалось расшифровать сообщение";
              if (m.id) {
                storageManager.execute(
                  `UPDATE messages SET text = '🔒 Не удалось расшифровать сообщение', raw_encrypted = NULL WHERE id = ? AND (text LIKE '🔒%' OR text LIKE '{"%' OR text = '[encrypted_pending]');`,
                  [m.id]
                ).catch(() => {});
              }
              syncMgr.terminateExhaustedMlsMessages(chatId).catch(() => {});
            }
          }
        } else {
          const syncMgr = SyncManager.getInstance();
          if (syncMgr.shouldRetryMls(chatId)) {
            m.isPendingKey = true;
            m.isE2EEDecryptFailed = true;
            m.rawEncryptedPayload = m.text;
            m.text = "🔒 Синхронизация защищенного сообщения...";
            syncMgr.initMlsSessionFromWelcomePackage(chatId).then(sess => {
              if (sess) {
                syncMgr.retryDecryptPendingMessages(chatId);
              }
            }).catch(err => {
              console.warn(`[SyncManager] Фоновое получение Welcome Package для группы ${chatId}:`, err);
            });
          } else {
            m.isTerminalFail = true;
            m.isE2EEDecryptFailed = true;
            m.isPendingKey = false;
            m.rawEncryptedPayload = null;
            m.raw_encrypted = null;
            m.text = "🔒 Не удалось расшифровать сообщение";
            if (m.id) {
              storageManager.execute(
                `UPDATE messages SET text = '🔒 Не удалось расшифровать сообщение', raw_encrypted = NULL WHERE id = ? AND (text LIKE '🔒%' OR text LIKE '{"%' OR text = '[encrypted_pending]');`,
                [m.id]
              ).catch(() => {});
            }
            syncMgr.terminateExhaustedMlsMessages(chatId).catch(() => {});
          }
        }
      }
    } else {
      // Обычный чат один на один (Double Ratchet)
      const isE2EE = isE2EEMessage(m.text);
      
      console.log("[SyncManager DEBUG] Проверка E2EE (DR): isE2EE=" + isE2EE);
      
      if (isE2EE) {
        const currentUserId = typeof window !== "undefined" ? (localStorage.getItem("current_user_id") || localStorage.getItem("my_user_id")) : null;
        const myUsername = typeof window !== "undefined" ? localStorage.getItem("username") : null;
        let isMe = (m.sender === "me" || 
                    m.senderName === "Я" ||
                    (currentUserId && (String(m.sender) === String(currentUserId))) ||
                    (myUsername && m.sender && m.sender.toString().toLowerCase() === myUsername.toLowerCase()));
        
        console.log("[SyncManager DEBUG] Проверка авторства (DR): isMe=" + isMe + ", currentUserId=" + currentUserId + ", sender=" + m.sender);
        
        if (!isMe && m.id) {
          try {
            const localCheck = await storageManager.query<{ sender: string }>(
              "SELECT sender FROM messages WHERE id = ? LIMIT 1;",
              [m.id]
            );
            if (localCheck.length > 0 && localCheck[0].sender === "me") {
              isMe = true;
              console.log("[SyncManager DEBUG] Переопределено isMe = true по локальной БД");
            }
          } catch (e) {
            // Игнорируем ошибки отсутствия таблиц
          }
        }
        
        if (!isMe) {
          // Определяем реальный ID удаленного собеседника (автора сообщения)
          // В 1-to-1 чатах Double Ratchet сессия привязана к User ID собеседника!
          let peerUserId = String(chatId);
          if (m.sender && m.sender !== 'other' && m.sender !== 'me' && (!currentUserId || String(m.sender) !== String(currentUserId))) {
            peerUserId = String(m.sender);
          } else if (m.sender_id && (!currentUserId || String(m.sender_id) !== String(currentUserId))) {
            peerUserId = String(m.sender_id);
          }

          console.log(`[SyncManager DEBUG] Попытка расшифрования сообщения (DR) для peerUserId=${peerUserId} (chatId=${chatId}, sender=${m.sender})...`);
          try {
            const rawMsgTs = m.timestamp || (m.created_at ? Date.parse(m.created_at) : 0) || (m.date ? Date.parse(m.date) : 0) || (m.time ? Date.parse(m.time) : 0);
            let msgTimestamp = (typeof rawMsgTs === 'number' && !isNaN(rawMsgTs)) ? rawMsgTs : (typeof rawMsgTs === 'string' && !isNaN(Number(rawMsgTs)) ? Number(rawMsgTs) : 0);
            if (msgTimestamp > 0 && msgTimestamp < 10000000000) {
              msgTimestamp *= 1000;
            }
            const decrypted = await decryptMessage(peerUserId, m.text, { isHistory, msgTimestamp });
            console.log("[SyncManager DEBUG] Успешно расшифровано (DR):", decrypted.substring(0, 100));
            if (decrypted === "[service_session_reset]") {
              m.text = decrypted;
              m.isService = true;
              console.log(`[SyncManager] Получен зашифрованный служебный сброс сессии для пира ${peerUserId}.`);
              if (!isHistory) {
                console.log(`[SyncManager] Получен живой зашифрованный сброс сессии для пира ${peerUserId} (!isHistory). Ре-синхронизируем сессию.`);
                const currentSession = await getSession(peerUserId);
                const rawTs = m.timestamp || (m.created_at ? Date.parse(m.created_at) : 0) || (m.date ? Date.parse(m.date) : 0) || (m.time ? Date.parse(m.time) : 0);
                let resetTs = (typeof rawTs === 'number' && !isNaN(rawTs)) ? rawTs : (typeof rawTs === 'string' && !isNaN(Number(rawTs)) ? Number(rawTs) : 0);
                if (resetTs > 0 && resetTs < 10000000000) {
                  resetTs *= 1000;
                }
                if (currentSession && currentSession.createdAt && resetTs > 0 && currentSession.createdAt > resetTs) {
                  console.log(`[SyncManager] Живой зашифрованный сброс для ${peerUserId} старше текущей сессии — текущая сессия сохранена (§12.3).`);
                } else {
                  try {
                    await deleteSession(peerUserId);
                  } catch (err) {
                    console.error(`[SyncManager] Ошибка удаления E2EE сессии для ${peerUserId}:`, err);
                  }
                  markPeerNeedsRehandshake(peerUserId, true);
                }
              } else {
                console.log(`[SyncManager] Получен зашифрованный служебный сброс сессии для чата ${chatId} из истории.`);
                const currentSession = await getSession(peerUserId);
                if (currentSession && currentSession.createdAt && msgTimestamp > 0 && currentSession.createdAt <= msgTimestamp) {
                  console.log(`[SyncManager] Исторический зашифрованный сброс актуален для пира ${peerUserId}. Выполняем сброс устаревшей сессии.`);
                  markPeerNeedsRehandshake(peerUserId, true);
                  try {
                    await deleteSession(peerUserId);
                  } catch (err) {
                    console.error(`[SyncManager] Ошибка сброса устаревшей E2EE сессии для ${peerUserId}:`, err);
                  }
                } else {
                  console.log(`[SyncManager] Исторический зашифрованный сброс для ${peerUserId} старше текущей сессии — текущая сессия сохранена (§12.3).`);
                }
              }
              markDecryptAttempted(m);
              return m;
            }
            unpackDecryptedPayload(chatId, m, decrypted);
            if (!isHistory || msgTimestamp > 0) {
              SyncManager.getInstance().retryDecryptPendingMessages(chatId).catch(err => {
                console.warn(`[SyncManager] Ошибка retryDecryptPendingMessages после успешной расшифровки 1:1 для ${chatId}:`, err);
              });
            }
          } catch (decryptErr: any) {
            const errMsg = String(decryptErr?.message || decryptErr || "");
            const lastReadPts = typeof localStorage !== 'undefined'
              ? parseInt(localStorage.getItem(`last_read_pts_${chatId}`) || '0', 10)
              : 0;
            const msgPts = Number(m.pts || 0);
            const isAlreadyReadOnOtherDevice = lastReadPts > 0 && msgPts > 0 && msgPts <= lastReadPts;
            const isPermanentHistoricalFailure =
              isAlreadyReadOnOtherDevice ||
              isHistory ||
              errMsg.includes("уже использован") ||
              errMsg.includes("OPK consumed") ||
              errMsg.includes("HistoricalOlder") ||
              errMsg.includes("отсутствует или уже использован") ||
              errMsg.includes("No E2EE session exists and no X3DH handshake header present") ||
              errMsg.includes("Превышен лимит пропуска ключей");

            if (isPermanentHistoricalFailure) {
              const terminalText = isAlreadyReadOnOtherDevice
                ? "🔒 Сообщение прочитано на другом устройстве"
                : "🔒 Не удалось расшифровать сообщение";
              console.log(`[SyncManager] Историческое/кросс-девайс сообщение (pts=${msgPts}, lastReadPts=${lastReadPts}, isHistory=${isHistory}) для пира ${peerUserId}: переводим в терминальный статус.`);
              m.isTerminalFail = true;
              m.isE2EEDecryptFailed = true;
              m.isPendingKey = false;
              m.rawEncryptedPayload = null;
              m.raw_encrypted = null;
              m.text = terminalText;
              // Если у собеседника нет с нами сессии или пакет ушел без X3DH (например, после сброса другим устройством),
              // принудительно помечаем ре-хендшейк и отправляем сброс с активного устройства, чтобы восстановить канал
              if (!isHistory && !isAlreadyReadOnOtherDevice) {
                const isTabVisible = typeof document === "undefined" || document.visibilityState !== "hidden";
                markPeerNeedsRehandshake(peerUserId, true);
                if (isTabVisible && errMsg.includes("No E2EE session exists")) {
                  SyncManager.getInstance().sendServiceResetMessage(peerUserId).catch(() => {});
                }
              }
              if (m.id) {
                storageManager.execute(
                  `UPDATE messages SET text = ?, raw_encrypted = NULL WHERE id = ? AND (text LIKE '🔒%' OR text LIKE '{"%' OR text = '[encrypted_pending]');`,
                  [terminalText, m.id]
                ).catch(() => {});
              }
            } else {
              console.error(`[SyncManager] Ошибка E2EE дешифрования сообщения от пира ${peerUserId} (chatId=${chatId}):`, decryptErr);
              m.isE2EEDecryptFailed = true;
              m.isPendingKey = true;
              m.rawEncryptedPayload = m.text;
              m.text = "🔒 Синхронизация защищенного канала...";
              // R2/R3: Помечаем необходимость ре-рукопожатия при следующей отправке ответа,
              // но НЕ удаляем сессию немедленно (сохраняем skippedMessageKeys и сессионные ключи).
              // SM-1: Флаг ставится ТОЛЬКО для живых входящих (!isHistory), чтение истории не имеет права менять состояние сессий (§12.3).
              if (!isHistory) {
                const isTabVisible = typeof document === "undefined" || document.visibilityState !== "hidden";
                markPeerNeedsRehandshake(peerUserId, true);
                if (isTabVisible) {
                  console.log(`[SyncManager] Обнаружена рассинхронизация сессий при получении реального сообщения. Инициируем автоматический сброс.`);
                  SyncManager.getInstance().sendServiceResetMessage(peerUserId).catch(e => {
                    console.error("[SyncManager] Не удалось инициировать отправку служебного сообщения сброса:", e);
                  });
                } else {
                  console.log(`[SyncManager] Вкладка/окно в фоне (hidden): пропущена отправка [service_session_reset], чтобы не сбросить активную сессию основного устройства.`);
                }
              } else {
                console.log(`[SyncManager] Пропущена инициация сброса сессии и markPeerNeedsRehandshake, так как сообщение из истории (§12.3).`);
              }
            }
          }
        } else {
          console.log("[SyncManager DEBUG] Попытка расшифрования собственного сообщения (DR)...");
          try {
            const decrypted = await decryptSelfMessage(m.text);
            console.log("[SyncManager DEBUG] Успешно расшифровано собственное сообщение (DR):", decrypted.substring(0, 100));
            unpackDecryptedPayload(chatId, m, decrypted);
          } catch (decryptErr) {
            console.error("[SyncManager] Ошибка расшифрования собственного сообщения (DR):", decryptErr);
            m.isE2EEDecryptFailed = true;
            m.isTerminalFail = true;
            m.isPendingKey = false;
            m.rawEncryptedPayload = null;
            m.raw_encrypted = null;
            m.text = "🔒 Собственное сообщение не удалось расшифровать (сессия сброшена)";
            if (m.id) {
              storageManager.execute(
                `UPDATE messages SET text = '🔒 Не удалось расшифровать сообщение', raw_encrypted = NULL WHERE id = ? AND (text LIKE '🔒%' OR text LIKE '{"%' OR text = '[encrypted_pending]');`,
                [m.id]
              ).catch(() => {});
            }
          }
        }
      } else if (m.text === "[service_session_reset]") {
        // CRP-009: инъекционность сброса — осознанный остаточный риск, закрывается в Stage 2b (per-device сессии + аутентифицированный сброс).
        m.isService = true;
        const currentUserId = typeof window !== "undefined" ? (localStorage.getItem("current_user_id") || localStorage.getItem("my_user_id")) : null;
        const myUsername = typeof window !== "undefined" ? localStorage.getItem("username") : null;
        let isMe = (m.sender === "me" || 
                    m.senderName === "Я" ||
                    (currentUserId && (String(m.sender) === String(currentUserId))) ||
                    (myUsername && m.sender && m.sender.toString().toLowerCase() === myUsername.toLowerCase()));
        
        let peerUserId = String(chatId);
        if (m.sender && m.sender !== 'other' && m.sender !== 'me' && (!currentUserId || String(m.sender) !== String(currentUserId))) {
          peerUserId = String(m.sender);
        } else if (m.sender_id && (!currentUserId || String(m.sender_id) !== String(currentUserId))) {
          peerUserId = String(m.sender_id);
        }

        if (!isMe) {
          if (!isHistory) {
            console.log(`[SyncManager] Получен открытый служебный сброс сессии для пира ${peerUserId} от собеседника (!isHistory). Ре-синхронизируем сессию.`);
            const currentSession = await getSession(peerUserId);
            let rawTs = m.timestamp || (m.date ? Date.parse(m.date) : 0) || (m.time ? Date.parse(m.time) : 0);
            let resetTs = (typeof rawTs === 'number' && !isNaN(rawTs)) ? rawTs : (typeof rawTs === 'string' && !isNaN(Number(rawTs)) ? Number(rawTs) : 0);
            if (resetTs > 0 && resetTs < 10000000000) {
              resetTs *= 1000;
            }
            if (currentSession && currentSession.createdAt && resetTs > 0 && currentSession.createdAt > resetTs) {
              console.log(`[SyncManager] Открытый служебный сброс для ${peerUserId} старше текущей сессии — текущая сессия сохранена (§12.3).`);
            } else {
              try {
                await deleteSession(peerUserId);
              } catch (err) {
                console.error(`[SyncManager] Ошибка удаления E2EE сессии для ${peerUserId}:`, err);
              }
              markPeerNeedsRehandshake(peerUserId, true);
            }
          } else {
            // R1: Безопасная обработка истории (§12.3/§12.5):
            // Служебное сообщение сохраняет свой статус и текст (НЕ подменяется заглушкой Fail-Closed).
            // Сброс сессии из истории выполняется только если текущая сессия не была создана позже этого сброса.
            console.log(`[SyncManager] Получен служебный сброс сессии для чата ${chatId} из истории.`);
            const currentSession = await getSession(peerUserId);
            let msgTimestamp = m.timestamp || (m.time ? Date.parse(m.time) : 0);
            if (msgTimestamp > 0 && msgTimestamp < 10000000000) {
              msgTimestamp *= 1000;
            }
            if (currentSession && currentSession.createdAt && msgTimestamp > 0 && currentSession.createdAt <= msgTimestamp) {
              console.log(`[SyncManager] Исторический сброс сессии актуален для пира ${peerUserId}. Выполняем сброс устаревшей сессии.`);
              markPeerNeedsRehandshake(peerUserId, true);
              try {
                await deleteSession(peerUserId);
              } catch (err) {
                console.error(`[SyncManager] Ошибка сброса устаревшей E2EE сессии для ${peerUserId}:`, err);
              }
            } else {
              console.log(`[SyncManager] Исторический сброс для ${peerUserId} старше текущей сессии — текущая сессия сохранена (§12.3).`);
            }
          }
        } else {
          // Если это сообщение [service_session_reset] от нашего собственного аккаунта (isMe === true),
          // но ЭТО устройство НЕ отправляло его в последние 25 секунд — значит, сброс инициировало
          // НАШЕ ВТОРОЕ УСТРОЙСТВО (например, веб-клиент или телефон), и собеседник уже удалил свою сессию с нами!
          // Обязательно помечаем ре-хендшейк и сбрасываем сессию здесь, иначе следующие медиа/текст уйдут без X3DH.
          const lastLocalResetSent = SyncManager.getInstance().getLastResetSentTime(peerUserId);
          if (!isHistory && Date.now() - lastLocalResetSent > 25000) {
            console.log(`[SyncManager] Получен [service_session_reset] от другого нашего устройства для пира ${peerUserId}. Принудительно помечаем ре-хендшейк X3DH.`);
            try {
              await deleteSession(peerUserId);
            } catch {}
            markPeerNeedsRehandshake(peerUserId, true);
          } else {
            console.log(`[SyncManager] Получено эхо собственного сообщения сброса сессии для пира ${peerUserId}. Помечаем ре-хендшейк.`);
            markPeerNeedsRehandshake(peerUserId, true);
          }
        }
        markDecryptAttempted(m);
        return m;
      } else {
        // R-HOTFIX-227: сообщение уже расшифровано или создано этим клиентом
        // (двойная обработка saveMessageToDb / собственная отправка после ACK).
        // Symbol не сериализуется в JSON и не может прийти из сети — пропускаем
        // без заглушки; Fail-Closed §12.5 для сетевого plaintext не ослабляется.
        if (isLocallyDecrypted(m)) {
          markDecryptAttempted(m);
          return m;
        }
        // SM-2(в)/RK-1: локальная заглушка/статус обязана нести ЛОКАЛЬНЫЙ маркер — флаг
        // isE2EEDecryptFailed (ставится нашим catch/heal) или rawEncryptedPayload. Голого
        // префикса «🔒» недостаточно: сетевой plaintext с таким префиксом спуфил бы
        // системную заглушку и обходил Fail-Closed §12.5.
        if (m.isE2EEDecryptFailed || (typeof m.text === "string" && m.text.startsWith("🔒") && m.rawEncryptedPayload)) {
          markDecryptAttempted(m);
          return m;
        }
        const currentUserId = typeof window !== "undefined" ? (localStorage.getItem("current_user_id") || localStorage.getItem("my_user_id")) : null;
        const myUsername = typeof window !== "undefined" ? localStorage.getItem("username") : null;
        const isMe = (m.sender === "me" || 
                     m.senderName === "Я" ||
                     (currentUserId && (String(m.sender) === String(currentUserId))) ||
                     (myUsername && m.sender && m.sender.toString().toLowerCase() === myUsername.toLowerCase()));

        if (isMe && (m.status === 'pending' || (typeof m.id === 'string' && m.id.startsWith('temp-')))) {
          // Собственный локальный черновик / исходящее сообщение — сохраняем текст
          markDecryptAttempted(m);
          return m;
        }

        // Fail-Closed (§12.5): приём открытого текста в защищённом чате отклоняется.
        console.warn(`[SyncManager] Получено открытое (не-E2EE) сообщение в защищенном чате ${chatId} — отклонено (Fail-Closed).`);
        m.isUnencryptedIncoming = true;
        m.isE2EEDecryptFailed = true;
        // SM-2(б): не затираем rawEncryptedPayload, если он уже установлен
        if (!m.rawEncryptedPayload) {
          m.rawEncryptedPayload = m.text;
        }
        m.text = "🔒 Сообщение отклонено: не зашифровано (Fail-Closed)";
      }
    }
  } catch (err: any) {
    console.error("[SyncManager] Внутренняя ошибка в decryptMessageIfNeeded:", err);
    if (m && isE2EEMessage(m.text)) {
      m.isE2EEDecryptFailed = true;
      m.text = "🔒 Сообщение зашифровано новым ключом. Отправьте ответ собеседнику для восстановления защищенного канала.";
    }
  }
  markDecryptAttempted(m);
  return m;
}

let plaintextPendingColEnsured = false;
export async function ensurePlaintextPendingColumn(): Promise<void> {
  if (plaintextPendingColEnsured) return;
  try {
    await storageManager.execute("ALTER TABLE outbox_queue ADD COLUMN plaintext_pending TEXT;");
  } catch {}
  plaintextPendingColEnsured = true;
}

export class SyncManager {
  private static instance: SyncManager;
  
  private localPtsMap: Record<string, number> = {};
  private localQts: number = 0;
  private localSeq: number = 0;
  
  private config: SyncConfig = {
    gapThreshold: 5,
    coldStartThreshold: 5000
  };

  private syncingChats: Set<string> = new Set();
  private syncListeners: Set<() => void> = new Set();
  private updateListeners: Map<string, Set<(data: any) => void>> = new Map();
  private pendingUpdatesQueue: Map<string, any[]> = new Map();
  private isInitialized = false;

  private syncRetryAttempts: Record<string, number> = {};
  private syncNextRetryTime: Record<string, number> = {};
  private MAX_SYNC_RETRIES = 3;

  private outboxTimer: any = null;
  private isProcessingOutbox = false;
  private mlsSessions: Map<string, MlsSession> = new Map();
  private earlyUpdatesQueue: { type: string; update: any; executionFn: () => Promise<void> | void }[] = [];

  // Typing indicator state: кто печатает в каком чате.
  private typingByChat = new Map<string, Map<string, ReturnType<typeof setTimeout>>>();
  private lastResetSentMap = new Map<string, number>();

  // Кэш результатов голосования для опросов (M2.3 Polls): pollId -> { tally: Record<number, number>, totalVoters: number, userVotes: Map<string, number[]> }
  private pollVotesState: Map<string, { tally: Record<number, number>; totalVoters: number; userVotes: Map<string, number[]> }> = new Map();
  // LRU-кап кэша опросов: без него Map растет безгранично за время жизни приложения
  private static readonly POLL_STATE_CACHE_MAX = 500;

  private evictPollStateCacheIfBloated() {
    while (this.pollVotesState.size > SyncManager.POLL_STATE_CACHE_MAX) {
      const oldestKey = this.pollVotesState.keys().next().value;
      if (oldestKey === undefined) break;
      this.pollVotesState.delete(oldestKey);
    }
  }

  public registerPollVote(chatId: string, pollId: string, targetMessageId: string, userId: string, optionIds: number[]) {
    let state = this.pollVotesState.get(pollId);
    if (!state) {
      state = { tally: {}, totalVoters: 0, userVotes: new Map() };
      this.pollVotesState.set(pollId, state);
      this.evictPollStateCacheIfBloated();
    }

    const prevVotes = state.userVotes.get(userId);
    if (prevVotes) {
      for (const optId of prevVotes) {
        state.tally[optId] = Math.max(0, (state.tally[optId] || 0) - 1);
      }
    } else {
      state.totalVoters += 1;
    }

    state.userVotes.set(userId, optionIds);
    for (const optId of optionIds) {
      state.tally[optId] = (state.tally[optId] || 0) + 1;
    }

    this.triggerUpdate("poll_votes_updated", {
      chatId,
      messageId: targetMessageId || pollId,
      pollId,
      tally: state.tally,
      totalVoters: state.totalVoters
    });
  }

  public setPollTally(chatId: string, messageId: string, tally: Record<number, number>, totalVoters?: number) {
    if (!messageId) return;
    let state = this.pollVotesState.get(messageId);
    if (!state) {
      state = { tally: tally || {}, totalVoters: totalVoters || 0, userVotes: new Map() };
      this.pollVotesState.set(messageId, state);
      this.evictPollStateCacheIfBloated();
    } else {
      if (tally) state.tally = { ...tally };
      if (totalVoters !== undefined) state.totalVoters = totalVoters;
    }
    this.triggerUpdate("poll_votes_updated", {
      chatId,
      messageId,
      pollId: messageId,
      tally: state.tally,
      totalVoters: state.totalVoters
    });
  }

  public getPollState(pollId: string) {
    return this.pollVotesState.get(pollId) || null;
  }

  private lastReadHistorySentTime = new Map<string, number>();
  private pendingReadHistoryTimer = new Map<string, any>();
  private pendingReadHistoryMaxMsgId = new Map<string, string>();

  public async readHistory(chatId: string, maxMessageId: string): Promise<void> {
    const now = Date.now();
    const hasSent = this.lastReadHistorySentTime.has(chatId);
    const lastSent = this.lastReadHistorySentTime.get(chatId) || 0;
    const THROTTLE_MS = 3000;

    if (!hasSent || (now - lastSent >= THROTTLE_MS)) {
      if (this.pendingReadHistoryTimer.has(chatId)) {
        clearTimeout(this.pendingReadHistoryTimer.get(chatId));
        this.pendingReadHistoryTimer.delete(chatId);
      }
      this.lastReadHistorySentTime.set(chatId, now);
      this.pendingReadHistoryMaxMsgId.delete(chatId);
      await tdlib.send("read_history", { chatId, maxMessageId });
    } else {
      this.pendingReadHistoryMaxMsgId.set(chatId, maxMessageId);
      if (!this.pendingReadHistoryTimer.has(chatId)) {
        const delay = THROTTLE_MS - (now - lastSent);
        const timer = setTimeout(async () => {
          this.pendingReadHistoryTimer.delete(chatId);
          const latestMaxId = this.pendingReadHistoryMaxMsgId.get(chatId);
          this.pendingReadHistoryMaxMsgId.delete(chatId);
          if (latestMaxId) {
            this.lastReadHistorySentTime.set(chatId, Date.now());
            try {
              await tdlib.send("read_history", { chatId, maxMessageId: latestMaxId });
            } catch (err) {
              console.warn("[SyncManager] Ошибка отложенной отправки read_history:", err);
            }
          }
        }, delay);
        this.pendingReadHistoryTimer.set(chatId, timer);
      }
    }
  }

  public async handlePinServiceAction(chatId: string, action: 'pin' | 'unpin', targetMessageId: string): Promise<void> {
    try {
      const rows = await storageManager.query<{ pinned_message_ids: string | null }>(
        "SELECT pinned_message_ids FROM chats WHERE id = ? LIMIT 1;",
        [chatId]
      );
      let pins: string[] = [];
      if (rows.length > 0 && rows[0].pinned_message_ids) {
        try {
          pins = JSON.parse(rows[0].pinned_message_ids);
        } catch {
          pins = [];
        }
      }
      if (action === 'pin') {
        if (!pins.includes(targetMessageId)) {
          pins.push(targetMessageId);
        }
      } else if (action === 'unpin') {
        pins = pins.filter(id => id !== targetMessageId);
      }
      await storageManager.setChatPinnedMessageIds(chatId, pins);
      this.triggerUpdate("chat_pins_updated", { chatId, pins });
    } catch (err) {
      console.error("[SyncManager] Ошибка handlePinServiceAction:", err);
    }
  }

  // Пер-чатовая сериализация выполнения апдейтов: без нее два fast-идущих
  // сообщения одного чата могут примениться не в порядке pts (race на decrypt/DB await)
  private chatUpdateChains = new Map<string, Promise<void>>();

  private queueOrExecuteUpdate(type: string, update: any, executionFn: () => Promise<void> | void) {
    if (!this.isInitialized) {
      console.log(`[SyncManager] Соединение активно, но БД заблокирована. Буферизуем апдейт ${type}:`, update);
      this.earlyUpdatesQueue.push({ type, update, executionFn });
      return;
    }
    // Апдейты одного чата выполняем строго последовательно; разные чаты — параллельно
    const chatKey = type === "new_message" ? String(update?.chatId || update?.message?.chatId || "global") : "global";
    const prev = this.chatUpdateChains.get(chatKey) || Promise.resolve();
    const next = prev.then(() => executionFn()).catch(err => {
      console.error(`[SyncManager] Ошибка при выполнении апдейта ${type}:`, err);
    }).finally(() => {
      // Чистим хвост цепочки, чтобы Map не рос бесконечно
      if (this.chatUpdateChains.get(chatKey) === next) {
        this.chatUpdateChains.delete(chatKey);
      }
    });
    this.chatUpdateChains.set(chatKey, next);
  }

  private constructor() {
    this.initUpdateSubscriptions();
    this.startOutboxWorker();
  }

  public static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  public getMlsSession(chatId: string): MlsSession | null {
    if (this.mlsSessions.has(chatId)) {
      return this.mlsSessions.get(chatId)!;
    }
    const session = loadMlsSession(chatId);
    if (session) {
      this.mlsSessions.set(chatId, session);
      return session;
    }
    return null;
  }

  // FA-3: Дебаунс и лимит попыток MLS-ретрая на chatId для защиты от CPU-цикла
  private mlsRetryTrackers = new Map<string, { count: number; lastAttemptAt: number }>();
  private static readonly MAX_MLS_RETRIES_PER_SESSION = 3;
  private static readonly MLS_RETRY_DEBOUNCE_MS = 30_000;

  public shouldRetryMls(chatId: string): boolean {
    const now = Date.now();
    const tracker = this.mlsRetryTrackers.get(chatId);
    if (!tracker) {
      this.mlsRetryTrackers.set(chatId, { count: 1, lastAttemptAt: now });
      return true;
    }
    if (now - tracker.lastAttemptAt < SyncManager.MLS_RETRY_DEBOUNCE_MS) {
      console.log(`[SyncManager] MLS-ретрай для группы ${chatId} отклонен: дебаунс ${SyncManager.MLS_RETRY_DEBOUNCE_MS / 1000}с`);
      return false;
    }
    if (tracker.count >= SyncManager.MAX_MLS_RETRIES_PER_SESSION) {
      console.warn(`[SyncManager] Исчерпан лимит попыток MLS-ретрая (${SyncManager.MAX_MLS_RETRIES_PER_SESSION}) для группы ${chatId}`);
      return false;
    }
    tracker.count += 1;
    tracker.lastAttemptAt = now;
    return true;
  }

  public async terminateExhaustedMlsMessages(chatId: string): Promise<void> {
    try {
      await storageManager.execute(
        `UPDATE messages 
         SET text = '🔒 Не удалось расшифровать сообщение', raw_encrypted = NULL 
         WHERE chatId = ? 
           AND (
             text LIKE '🔒 Синхронизация%' 
             OR text LIKE '{"mlsCiphertextHex"%' 
             OR text LIKE '{"ciphertextHex"%'
             OR raw_encrypted LIKE '%mlsCiphertextHex%'
             OR raw_encrypted LIKE '%epochNumber%'
           );`,
        [chatId]
      );
      this.triggerUpdate("sync_chats", {});
    } catch (e) {
      console.warn(`[SyncManager] Ошибка терминализации сообщений для группы ${chatId}:`, e);
    }
  }

  public resetMlsRetryTracker(chatId: string): void {
    this.mlsRetryTrackers.delete(chatId);
  }

  public setMlsSession(chatId: string, session: MlsSession) {
    this.mlsSessions.set(chatId, session);
    saveMlsSession(session);
    this.retryDecryptPendingMessages(chatId).catch(err => {
      console.warn(`[SyncManager] Ошибка retryDecryptPendingMessages в setMlsSession для ${chatId}:`, err);
    });
  }

  public async retryDecryptPendingMessages(chatId: string) {
    try {
      // Повторная расшифровка возможна по СОХРАНЕННОМУ шифротексту (raw_encrypted)
      // или по валидному E2EE JSON в text (исцеленные строки после healFailClosedPlaceholderRows)
      const pendingRows = await storageManager.query<{
        id: string;
        sender: string;
        senderName?: string | null;
        text: string;
        time: string;
        pts?: number;
        timestamp?: number;
        raw_encrypted?: string | null;
        type?: string;
        mediaUrl?: string | null;
        peaks?: string | null;
        mediaKey?: string | null;
        mediaIv?: string | null;
        replyToMessageId?: string | null;
        forwardFromUser?: string | null;
        topic_id?: string | number | null;
      }>(
        `SELECT id, sender, senderName, text, time, pts, timestamp, raw_encrypted, type, mediaUrl, peaks, mediaKey, mediaIv, replyToMessageId, forwardFromUser, topic_id 
         FROM messages 
         WHERE chatId = ? 
           AND (
             (raw_encrypted IS NOT NULL AND (text LIKE '🔒%' OR text LIKE '[Ошибка%' OR text LIKE '[Ключ%'))
             OR (text LIKE '{"v":%' OR text LIKE '{"ciphertextHex"%' OR text LIKE '{"mlsCiphertextHex"%')
           ) 
         ORDER BY timestamp ASC 
         LIMIT 50;`,
        [chatId]
      );
      if (!pendingRows || pendingRows.length === 0) return;

      console.log(`[SyncManager] Попытка повторной расшифровки ${pendingRows.length} отложенных сообщений в чате ${chatId}...`);
      for (const row of pendingRows) {
        const cipherPayload = (row.raw_encrypted && isE2EEMessage(row.raw_encrypted))
          ? row.raw_encrypted
          : (row.text && isE2EEMessage(row.text) ? row.text : null);
        if (!cipherPayload) continue;

        // FA-4 / FA-8: Проверка на первое X3DH-сообщение уже сожжённой сессии перед decrypt
        let isBurnedX3dhSession = false;
        try {
          const parsed = typeof cipherPayload === 'string' ? JSON.parse(cipherPayload) : cipherPayload;
          if (parsed && parsed.x3dh) {
            const currentUserId = typeof window !== "undefined" ? (localStorage.getItem("current_user_id") || localStorage.getItem("my_user_id")) : null;
            const isMe = row.sender === 'me' || row.senderName === 'Я' || (currentUserId && String(row.sender) === String(currentUserId));
            const peerUserId = (!isMe && row.sender && row.sender !== 'other') ? String(row.sender) : String(chatId);
            const sess = await getSession(peerUserId);
            if (sess && sess.x3dhInfo) {
              const incomingEk = parsed.x3dh.ekAPubHex || parsed.x3dh.ekapubHex || parsed.x3dh.ekAPub || parsed.x3dh.ek_a_pub_hex;
              const existingEk = sess.x3dhInfo.ekAPubHex || sess.x3dhInfo.ekapubHex || sess.x3dhInfo.ekAPub || sess.x3dhInfo.ek_a_pub_hex;
              if (incomingEk && existingEk && String(incomingEk).toLowerCase() !== String(existingEk).toLowerCase()) {
                isBurnedX3dhSession = true;
              }
            }
          }
        } catch {}

        if (isBurnedX3dhSession) {
          console.log(`[SyncManager] retryDecryptPendingMessages: обнаружено первое X3DH-сообщение сожжённой сессии ${row.id}, переводим в терминальный статус.`);
          await storageManager.execute(
            `UPDATE messages SET text = '🔒 Не удалось расшифровать сообщение', raw_encrypted = NULL WHERE id = ?;`,
            [row.id]
          );
          this.triggerUpdate("message_edited", {
            chatId,
            messageId: row.id,
            message_id: row.id,
            content: "🔒 Не удалось расшифровать сообщение",
            text: "🔒 Не удалось расшифровать сообщение",
            message: { ...row, text: "🔒 Не удалось расшифровать сообщение", raw_encrypted: null, isE2EEDecryptFailed: true }
          });
          continue;
        }

        const msgObj: any = {
          ...row,
          text: cipherPayload,
          rawEncryptedPayload: cipherPayload
        };
        const decrypted = await decryptMessageIfNeeded(chatId, msgObj, true);
        if (
          decrypted &&
          decrypted.text &&
          !decrypted.text.startsWith("🔒") &&
          !decrypted.text.startsWith("[Ошибка") &&
          !decrypted.text.startsWith("[Ключ") &&
          !isE2EEMessage(decrypted.text)
        ) {
          await this.saveMessageToDb(chatId, decrypted);
          this.triggerUpdate("message_edited", {
            chatId,
            messageId: decrypted.id,
            message_id: decrypted.id,
            content: decrypted.text,
            text: decrypted.text,
            message: decrypted
          });
        } else if (
          decrypted?.isTerminalFail || 
          decrypted?.text === "🔒 Не удалось расшифровать сообщение" ||
          (typeof decrypted?.text === 'string' && decrypted.text.startsWith("🔒 Собственное сообщение не удалось расшифровать"))
        ) {
          await storageManager.execute(
            `UPDATE messages SET text = '🔒 Не удалось расшифровать сообщение', raw_encrypted = NULL WHERE id = ?;`,
            [row.id]
          );
          this.triggerUpdate("message_edited", {
            chatId,
            messageId: row.id,
            message_id: row.id,
            content: "🔒 Не удалось расшифровать сообщение",
            text: "🔒 Не удалось расшифровать сообщение",
            message: { ...row, text: "🔒 Не удалось расшифровать сообщение", raw_encrypted: null, isE2EEDecryptFailed: true }
          });
        }
      }
    } catch (err) {
      console.warn(`[SyncManager] Ошибка в retryDecryptPendingMessages для чата ${chatId}:`, err);
    }
  }

  /**
   * Негативный кэш welcome-package: чаты Double Ratchet (не MLS) не имеют
   * welcome-package на сервере. Кэшируем с TTL 60 с (SM-5),
   * не кэшируем 404 для заведомо не-групповых чатов.
   */
  private mlsWelcomeNegativeCache = new Map<string, number>();
  private static readonly MLS_NEGATIVE_CACHE_TTL_MS = 60_000;

  public async initMlsSessionFromWelcomePackage(chatId: string, allowEpochDowngrade: boolean = false): Promise<MlsSession | null> {
    try {
      // Защита от регрессии сессии: если сессия уже есть и запрет на даунгрейд не снят,
      // не сносим её (возможно более высокую эпоху) заведомо устаревшим пакетом
      if (!allowEpochDowngrade) {
        const existing = this.getMlsSession(chatId);
        if (existing) {
          return existing;
        }
      }
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("session_token") : null;
      if (!token) return null;

      const cachedAt = this.mlsWelcomeNegativeCache.get(chatId);
      if (cachedAt && (Date.now() - cachedAt) < SyncManager.MLS_NEGATIVE_CACHE_TTL_MS) {
        return null;
      }

      // SM-5: Проверяем, является ли чат заведомо не-групповым (1:1 Double Ratchet)
      let isKnownNonGroup = false;
      try {
        const chatRows = await storageManager.query<{ isGroup: number; type?: string }>(
          "SELECT isGroup, type FROM chats WHERE id = ? LIMIT 1;",
          [chatId]
        );
        if (chatRows.length > 0 && chatRows[0].isGroup === 0 && chatRows[0].type !== 'group') {
          isKnownNonGroup = true;
        }
      } catch {}

      if (isKnownNonGroup) {
        return null;
      }

      const abortController = new AbortController();
      const abortTimer = setTimeout(() => abortController.abort(), 15000);
      let response: Response;
      try {
        response = await fetch(getBackendUrl("/api/v1/mls/get-welcome-package"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ groupId: chatId }),
          signal: abortController.signal
        });
      } finally {
        clearTimeout(abortTimer);
      }

      if (!response.ok) {
        console.warn(`[SyncManager] Не удалось получить welcomePackage для группы ${chatId}: ${response.statusText}`);
        // SM-5: Кэшируем неудачу получения welcome-package с TTL 60с для групп
        this.mlsWelcomeNegativeCache.set(chatId, Date.now());
        return null;
      }

      const resData = await response.json();
      const welcomePackage = resData.welcomePackage;
      if (!welcomePackage || !welcomePackage.creatorPubX) {
        console.warn(`[SyncManager] Пустой welcomePackage для группы ${chatId}`);
        this.mlsWelcomeNegativeCache.set(chatId, Date.now());
        return null;
      }

      // 1. Декапсуляция
      const myKeyPair = getLocalMlsKeyPair();
      if (!myKeyPair) return null;
      
      const xShared = calculateX25519SharedSecret(
        myKeyPair.x25519.privateKey,
        hexToBytes(welcomePackage.creatorPubX)
      );

      const kyberCt = new Uint8Array(welcomePackage.kyberCt);
      const kyberShared = Kyber1024.decapsulate(kyberCt, myKeyPair.kyber.privateKey);

      // 2. Смешивание
      const hybridSecret = await hkdfDeriveKey(
        new Uint8Array([...xShared, ...kyberShared]),
        "MLS_HYBRID_KEM_INFO"
      );

      // 3. Расшифровывание
      const ciphertextBytes = hexToBytes(welcomePackage.ciphertext);
      const tagBytes = hexToBytes(welcomePackage.tag);
      const encData = new Uint8Array([...ciphertextBytes, ...tagBytes]);

      const aesKey = await crypto.subtle.importKey(
        "raw",
        hybridSecret as any,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: hexToBytes(welcomePackage.iv) as any },
        aesKey,
        encData as any
      );

      const initialSecret = new Uint8Array(decryptedBuffer);

      // 4. Определение состава группы
      // Бэкенд возвращает только криптографические данные. Мы можем временно проинициализировать сессию
      // с текущим пользователем и создателем, а реальный список обновится при первом коммите (mls_commit)
      // или мы можем запросить список участников у бэкенда.
      // Подождите! Бэкенд возвращает список участников при запросе информации о группе?
      // Давайте проверим, есть ли эндпоинты в backend/message-api/main.py, возвращающие список участников.
      // Да, в main.py таблица mls_groups хранит список участников!
      // Но у нас также есть в welcomePackage список участников? Нет.
      // Давайте сделаем GET запрос на /api/v1/mls/group/{groupId} или аналогичный, если он есть?
      // Давайте поищем "/api/v1/mls/" в main.py.
      // Если такого эндпоинта нет, мы можем проинициализировать сессию с [myUsername, "creator"],
      // так как список участников newMembers прилетит в первом же mls_commit сообщении!
      const myUserId = localStorage.getItem("current_user_id") || localStorage.getItem("my_user_id") || localStorage.getItem("username") || "";
      const initialMembers = [myUserId];

      const session = new MlsSession(
        chatId,
        myUserId,
        myKeyPair,
        initialMembers,
        bytesToHex(initialSecret)
      );

      // Защита от регрессии эпохи: не заменяем сессию с более высокой эпохой
      // на свежесозданную эпоху 0 (источник каскадных сбросов сессий), кроме
      // явно разрешенного пути (открытый mls_commit reset:true)
      const existingSession = this.getMlsSession(chatId);
      if (!allowEpochDowngrade &&
          existingSession &&
          (existingSession as any).currentEpoch?.epochNumber > (session as any).currentEpoch?.epochNumber) {
        console.warn(`[SyncManager] Welcome-package для ${chatId} содержит эпоху ${(session as any).currentEpoch?.epochNumber} ниже текущей ${(existingSession as any).currentEpoch?.epochNumber} — сессию не регрессируем`);
        return existingSession;
      }

      this.mlsWelcomeNegativeCache.delete(chatId);
      this.setMlsSession(chatId, session);
      return session;
    } catch (err) {
      console.error(`[SyncManager] Ошибка инициализации MLS сессии из приветственного пакета для ${chatId}:`, err);
      return null;
    }
  }

  /**
   * Получение метаданных группы (участники, epoch, имя, аватар) с бэкенда (M1.x recovery).
   *
   * Read-only источник истины о составе группы. Используется, когда локальная
   * MLS-сессия потеряна (например, после переустановки APK), а welcome-package
   * недоступен (для создателя группы). НЕ восстанавливает криптографию —
   * только UI-состав для управления (просмотр/добавление/удаление участников).
   *
   * @returns {members, epoch, name, myUsername, myUserId} или null при ошибке/нет доступа.
   */
  public async getGroupInfo(chatId: string): Promise<{ members: string[]; epoch: number; name: string; avatar?: string; myUsername: string; myUserId?: string } | null> {
    try {
      const token = localStorage.getItem("session_token");
      if (!token) return null;

      const response = await fetch(getBackendUrl("/api/v1/mls/get-group"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ groupId: chatId }),
      });

      if (!response.ok) {
        console.warn(`[SyncManager] getGroupInfo: бэкенд вернул ${response.status} для группы ${chatId}`);
        return null;
      }

      const data = await response.json();
      return {
        members: Array.isArray(data.members) ? data.members : [],
        epoch: typeof data.epoch === "number" ? data.epoch : 0,
        name: data.name || "",
        avatar: data.avatar || "",
        myUsername: data.myUsername || "",
        myUserId: data.myUserId || "",
      };
    } catch (err) {
      console.error(`[SyncManager] getGroupInfo error для ${chatId}:`, err);
      return null;
    }
  }

  public getLastResetSentTime(chatId: string): number {
    return this.lastResetSentMap.get(chatId) || 0;
  }

  public async sendServiceResetMessage(chatId: string) {
    console.log(`[SyncManager] Запуск отправки служебного сообщения сброса сессии для чата ${chatId}`);
    try {
      // R2/R3: Помечаем необходимость ре-рукопожатия для пира, но НЕ удаляем сессию немедленно
      // (сохраняем skippedMessageKeys для задержавшихся out-of-order пакетов).
      // v2.2.14: метка ставится ТОЛЬКО когда сброс реально уходит в очередь — дебаунс/дедуп
      // выше по потоку не должны оставлять висячий флаг, провоцирующий лишнюю пере-инициализацию.
      const now = Date.now();
      const lastSent = this.lastResetSentMap.get(chatId) || 0;
      if (now - lastSent < 15000) {
        console.log(`[SyncManager] Служебный сброс для чата ${chatId} уже отправлялся ${now - lastSent}мс назад, пропускаем (дебаунс).`);
        return;
      }

      const check = await storageManager.query(
        "SELECT id FROM outbox_queue WHERE chatId = ? AND text = '[service_session_reset]' AND status IN ('pending', 'sending') LIMIT 1;",
        [chatId]
      );
      if (check.length > 0) {
        console.log("[SyncManager] Сообщение сброса сессии уже находится в очереди отправки, пропускаем.");
        return;
      }

      markPeerNeedsRehandshake(chatId, true);

      const tempId = `temp-service-reset-${Math.random().toString(36).substring(2, 9)}`;
      await storageManager.execute(
        `INSERT INTO outbox_queue (id, chatId, text, type, mediaUrl, peaks, replyToMessageId, timestamp, status, retryCount, nextRetryTime, mediaKey, mediaIv) 
         VALUES (?, ?, ?, 'text', NULL, NULL, NULL, ?, 'pending', 0, 0, NULL, NULL);`,
        [tempId, chatId, '[service_session_reset]', now]
      );

      this.lastResetSentMap.set(chatId, now);

      this.processOutboxQueue().catch(err => {
        console.error("[SyncManager] Ошибка при запуске processOutboxQueue для служебного сообщения:", err);
      });
    } catch (e) {
      console.error("[SyncManager] Ошибка при создании служебного сообщения сброса сессии:", e);
    }
  }

  public resetState() {
    this.isInitialized = false;
    this.localPtsMap = {};
    this.localQts = 0;
    this.localSeq = 0;
    this.syncingChats.clear();
    this.pendingUpdatesQueue.clear();
    this.mlsSessions.clear();
    this.earlyUpdatesQueue = [];
    console.log("[SyncManager] Состояние сброшено.");
  }

  public async initialize() {
    if (this.isInitialized) return;
    try {
      // R3 (M3.1): фоновый sweeper истёкших TTL-сообщений (детерминированное
      // локальное удаление — главное звено двуслойной модели; сервер — гигиена)
      this.startTtlSweeper();

      // Загружаем qts и seq из таблицы settings
      const settings = await storageManager.query<{ key: string; value: string }>(
        "SELECT key, value FROM settings WHERE key IN ('sync_qts', 'sync_seq');"
      );
      for (const row of settings) {
        if (row.key === 'sync_qts') this.localQts = parseInt(row.value, 10) || 0;
        if (row.key === 'sync_seq') this.localSeq = parseInt(row.value, 10) || 0;
      }

      // Загружаем pts чатов из таблицы chats
      const chats = await storageManager.query<{ id: string; pts: number }>(
        "SELECT id, pts FROM chats;"
      );
      for (const chat of chats) {
        this.localPtsMap[chat.id] = chat.pts || 0;
      }
      // Загружаем сохраненные MLS сессии
      try {
        const mlsRows = await storageManager.query<{ user_id: string; session_data: string }>(
          "SELECT user_id, session_data FROM e2ee_sessions WHERE session_data LIKE '%currentEpoch%' OR session_data LIKE '%localKeyPair%';"
        );
        for (const row of mlsRows) {
          try {
            const session = MlsSession.deserialize(row.session_data);
            this.mlsSessions.set(row.user_id, session);
            console.log(`[SyncManager] Загружена сохраненная MLS сессия для чата ${row.user_id}, эпоха ${session.currentEpoch.epochNumber}`);
          } catch (deserErr) {
            console.error(`[SyncManager] Не удалось десериализовать MLS сессию для чата ${row.user_id}:`, deserErr);
          }
        }
      } catch (mlsErr) {
        console.error('[SyncManager] Ошибка при загрузке MLS сессий из SQLite:', mlsErr);
      }
      
      this.isInitialized = true;
      console.log(`[SyncManager] Успешно инициализировано состояние из БД: qts=${this.localQts}, seq=${this.localSeq}`, this.localPtsMap);

      // Очистка сиротских медиафайлов Outbox (Milestone M2, R3.2)
      try {
        const outboxRows = await storageManager.query<{ id: string }>("SELECT id FROM outbox_queue;");
        const activeIds = outboxRows.map(r => r.id);
        await outboxMediaStore.pruneOrphanMedia(activeIds);
      } catch (pruneErr) {
        console.warn('[SyncManager] Ошибка при очистке сиротских медиафайлов Outbox:', pruneErr);
      }

      // Обрабатываем накопившиеся во время запуска обновления
      if (this.earlyUpdatesQueue.length > 0) {
        console.log(`[SyncManager] Обработка ${this.earlyUpdatesQueue.length} буферизованных обновлений после инициализации...`);
        const queue = [...this.earlyUpdatesQueue];
        this.earlyUpdatesQueue = [];
        for (const item of queue) {
          try {
            const res = item.executionFn();
            if (res instanceof Promise) {
              await res;
            }
          } catch (err) {
            console.error(`[SyncManager] Ошибка при обработке отложенного апдейта ${item.type}:`, err);
          }
        }
      }
    } catch (err) {
      console.error('[SyncManager] Ошибка при инициализации состояния из БД:', err);
    }
  }

  private async saveState() {
    try {
      await storageManager.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('sync_qts', ?);",
        [this.localQts.toString()]
      );
      await storageManager.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('sync_seq', ?);",
        [this.localSeq.toString()]
      );
    } catch (err) {
      console.error('[SyncManager] Ошибка при сохранении qts/seq:', err);
    }
  }

  public getPts(chatId: string): number {
    return this.localPtsMap[chatId] || 0;
  }

  public setPts(chatId: string, pts: number) {
    this.localPtsMap[chatId] = pts;
    
    storageManager.execute(
      `INSERT INTO chats (id, name, avatar, lastMessage, time, unread, isGroup, online, pts) 
       VALUES (?, '', '👤', '', '', 0, 0, 0, ?)
       ON CONFLICT(id) DO UPDATE SET pts = excluded.pts;`,
      [chatId, pts]
    ).catch(err => {
      console.error(`[SyncManager] Ошибка при сохранении pts для чата ${chatId}:`, err);
    });

    this.saveState();
  }

  public async saveMessageToDb(chatId: string, msg: any, status: 'sent' | 'pending' = 'sent'): Promise<boolean> {
    try {
      if (!isDecryptAttempted(msg)) {
        msg = await decryptMessageIfNeeded(chatId, msg);
      }
      const pts = msg.pts || 0;
      let text = msg.text || '';
      const time = msg.time || new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const rawSender = msg.sender || 'other';
      const myUsername = localStorage.getItem("username");
      const currentUserId = typeof window !== "undefined" ? localStorage.getItem("current_user_id") : null;
      const isMe = rawSender === 'me' || msg.senderName === 'Я' || 
                   (currentUserId && rawSender === currentUserId) ||
                   (myUsername && rawSender && rawSender.toString().toLowerCase() === myUsername.toLowerCase());
      const sender = isMe ? 'me' : rawSender;
      const senderName = resolveSenderDisplayName(sender, msg.senderName);
      const timestamp = msg.timestamp || Date.now();
      let type = msg.type || 'text';
      let mediaUrl = msg.mediaUrl || null;
      let peaks = msg.peaks ? (typeof msg.peaks === 'string' ? msg.peaks : JSON.stringify(msg.peaks)) : null;
      const replyToMessageId = msg.replyToMessageId || null;
      const forwardFromUser = msg.forwardFromUser || null;
      let mediaKey = msg.mediaKey || null;
      let mediaIv = msg.mediaIv || null;
      // Исходный шифротекст: нужен для повторной расшифровки, когда ключи пришли позже
      const rawEncrypted = msg.rawEncryptedPayload || null;
      const expiresAt = msg.expires_at || 0;

      let isNew = true;

      // Проверяем, существует ли сообщение локально и расшифровано ли оно
      if (msg.id) {
        try {
          let localCheck = await storageManager.query<{
            id: string;
            text: string;
            type: string | null;
            mediaUrl: string | null;
            peaks: string | null;
            mediaKey: string | null;
            mediaIv: string | null;
          }>(
            "SELECT id, text, type, mediaUrl, peaks, mediaKey, mediaIv FROM messages WHERE id = ? LIMIT 1;",
            [msg.id]
          );
          if (localCheck.length === 0 && text) {
            // Проверяем временные или BLE Mesh сообщения с тем же текстом в этом чате
            localCheck = await storageManager.query<{
              id: string;
              text: string;
              type: string | null;
              mediaUrl: string | null;
              peaks: string | null;
              mediaKey: string | null;
              mediaIv: string | null;
            }>(
              "SELECT id, text, type, mediaUrl, peaks, mediaKey, mediaIv FROM messages WHERE chatId = ? AND text = ? AND (id LIKE 'temp-%' OR id LIKE 'mesh-%') LIMIT 1;",
              [chatId, text]
            );
          }

          if (localCheck.length > 0) {
            isNew = false;
            const existingId = localCheck[0].id;
            const oldText = localCheck[0].text;
            const oldType = localCheck[0].type;
            const oldMediaUrl = localCheck[0].mediaUrl;
            const oldPeaks = localCheck[0].peaks;
            const oldKey = localCheck[0].mediaKey;
            const oldIv = localCheck[0].mediaIv;

            // Если старый текст уже расшифрован (не шифротекст и не ошибка 🔒), а новый — шифротекст или ошибка 🔒, сохраняем расшифрованный
            if (oldText && !isE2EEMessage(oldText) && !oldText.startsWith('🔒') && (isE2EEMessage(text) || text.startsWith('🔒'))) {
              console.log(`[SyncManager] Защита E2EE открытого текста для сообщения ${msg.id} (исходный ID ${existingId})`);
              text = oldText;
              msg.text = oldText;
            }
            if (oldType && oldType !== 'text' && (!type || type === 'text')) {
              type = oldType;
              msg.type = oldType;
            }
            if (oldMediaUrl && !mediaUrl) {
              mediaUrl = oldMediaUrl;
              msg.mediaUrl = oldMediaUrl;
            }
            if (oldPeaks && !peaks) {
              peaks = oldPeaks;
              msg.peaks = safeParsePeaks(oldPeaks);
            }

            // Защита ключей шифрования медиафайлов от затирания при синхронизации с сервером
            if (oldKey && !mediaKey) {
              console.log(`[SyncManager] Восстановление mediaKey из локальной БД для сообщения ${msg.id}`);
              mediaKey = oldKey;
              msg.mediaKey = oldKey;
            }
            if (oldIv && !mediaIv) {
              console.log(`[SyncManager] Восстановление mediaIv из локальной БД для сообщения ${msg.id}`);
              mediaIv = oldIv;
              msg.mediaIv = oldIv;
            }

            // Если исходный ID был временным/меш (например temp- или mesh-), удаляем временную запись из SQLite, чтобы заменить постоянной
            if (existingId !== msg.id && (existingId.startsWith('temp-') || existingId.startsWith('mesh-'))) {
              await storageManager.execute("DELETE FROM messages WHERE id = ?;", [existingId]);
            }
          }
        } catch (dbErr) {
          console.warn("[SyncManager] Ошибка проверки существования сообщения в БД:", dbErr);
        }
      }

      // Проверяем, является ли чат группой
      const chatQuery = await storageManager.query<{ isGroup: number; type?: string }>("SELECT isGroup, type FROM chats WHERE id = ? LIMIT 1;", [chatId]);
      let isGroup = chatQuery.length > 0 ? (chatQuery[0].isGroup === 1 || chatQuery[0].type === 'group') : false;
      const isKnownNonGroup = chatQuery.length > 0 && chatQuery[0].isGroup === 0 && chatQuery[0].type !== 'group';
      if (!isGroup && !isKnownNonGroup) {
        const session = this.getMlsSession(chatId);
        if (session) {
          isGroup = true;
        } else {
          const wpSession = await this.initMlsSessionFromWelcomePackage(chatId);
          if (wpSession) {
            isGroup = true;
          }
        }
      }
      const defaultName = isGroup ? 'Группа' : senderName;
      const defaultAvatar = isGroup ? '👥' : '👤';
      const isGroupNum = isGroup ? 1 : 0;

      // Объединяем вставку чата и сообщения в единую транзакцию для исключения гонки данных и нарушения FOREIGN KEY
      await storageManager.transaction([
        {
          sql: `INSERT INTO chats (id, name, avatar, lastMessage, time, unread, isGroup, online, pts) 
                VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?)
                ON CONFLICT(id) DO UPDATE SET 
                  name = CASE 
                    WHEN (chats.name IS NULL OR chats.name IN ('', 'Собеседник', 'Собеседник (Mesh)', 'Чат', 'other', 'others', 'undefined', 'null', 'Пользователь') OR chats.name LIKE '%-%-%-%-%' OR chats.name LIKE 'Пользователь #%')
                         AND (excluded.name NOT IN ('', 'Собеседник', 'Собеседник (Mesh)', 'Чат', 'other', 'others', 'undefined', 'null', 'Пользователь') AND excluded.name NOT LIKE '%-%-%-%-%' AND excluded.name NOT LIKE 'Пользователь #%')
                    THEN excluded.name 
                    ELSE chats.name 
                  END,
                  lastMessage = excluded.lastMessage,
                  time = excluded.time,
                  pts = excluded.pts,
                  isGroup = CASE WHEN chats.isGroup = 1 THEN 1 ELSE excluded.isGroup END,
                  avatar = CASE WHEN chats.avatar = '👥' THEN '👥' ELSE excluded.avatar END;`,
          params: [chatId, defaultName, defaultAvatar, text, time, isGroupNum, pts]
        },
        {
          sql: `INSERT INTO messages (id, chatId, sender, senderName, text, time, pts, timestamp, type, mediaUrl, peaks, replyToMessageId, forwardFromUser, status, mediaKey, mediaIv, topic_id, raw_encrypted, expires_at, reply_markup)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  pts = excluded.pts,
                  status = CASE WHEN messages.status = 'read' THEN 'read' ELSE excluded.status END,
                  mediaKey = COALESCE(excluded.mediaKey, messages.mediaKey),
                  mediaIv = COALESCE(excluded.mediaIv, messages.mediaIv),
                  text = CASE WHEN (messages.text NOT LIKE '🔒%' AND excluded.text LIKE '🔒%') THEN messages.text ELSE excluded.text END,
                  type = CASE WHEN (messages.type IS NOT NULL AND messages.type <> 'text' AND (excluded.type IS NULL OR excluded.type = 'text')) THEN messages.type ELSE excluded.type END,
                  mediaUrl = COALESCE(excluded.mediaUrl, messages.mediaUrl),
                  peaks = COALESCE(excluded.peaks, messages.peaks),
                  topic_id = COALESCE(excluded.topic_id, messages.topic_id),
                  raw_encrypted = COALESCE(excluded.raw_encrypted, messages.raw_encrypted),
                  expires_at = CASE WHEN messages.expires_at > 0 THEN messages.expires_at ELSE excluded.expires_at END,
                  reply_markup = COALESCE(excluded.reply_markup, messages.reply_markup);`,
          params: [msg.id, chatId, sender, senderName, text, time, pts, timestamp, type, mediaUrl, peaks, replyToMessageId, forwardFromUser, status, mediaKey, mediaIv, msg.topic_id ?? null, rawEncrypted, expiresAt, (msg.replyMarkup || msg.reply_markup) ? (typeof (msg.replyMarkup || msg.reply_markup) === 'string' ? (msg.replyMarkup || msg.reply_markup) : JSON.stringify(msg.replyMarkup || msg.reply_markup)) : null]
        }
      ]);
      return isNew;
    } catch (err) {
      console.error('[SyncManager] Ошибка при сохранении сообщения в БД:', err);
      return false;
    }
  }

  private initUpdateSubscriptions() {
    // Подписка на все входящие новые сообщения
    tdlib.onUpdate("new_message", (update: any) => {
      console.log("[SyncManager] Получено новое сообщение:", update);
      this.queueOrExecuteUpdate("new_message", update, async () => {
        await this.handleIncomingUpdate(update);
      });
    });

    // Подписка на изменение статуса прочтения
    tdlib.onUpdate("updateReadHistoryOutbox", (update: any) => {
      console.log("[SyncManager] Обновлен статус прочтения исходящих:", update);
      this.queueOrExecuteUpdate("updateReadHistoryOutbox", update, async () => {
        const chatId = update.chatId || update.chat_id;
        const maxMessageId = update.maxMessageId || update.max_message_id;
        
        if (chatId && maxMessageId) {
          try {
            const msgRows = await storageManager.query<{ pts: number, timestamp: number }>(
              "SELECT pts, timestamp FROM messages WHERE id = ? LIMIT 1;",
              [maxMessageId]
            );
            
            let pts = update.pts || 0;
            let timestamp = 0;
            
            if (msgRows.length > 0) {
              pts = msgRows[0].pts || pts;
              timestamp = msgRows[0].timestamp || 0;
            }
            
            if (pts > 0 || timestamp > 0) {
              await storageManager.execute(
                `UPDATE messages 
                 SET status = 'read' 
                 WHERE chatId = ? 
                   AND sender = 'me' 
                   AND (pts <= ? OR timestamp <= ?) 
                   AND status != 'read';`,
                [chatId, pts, timestamp]
              );
              console.log(`[SyncManager] Успешно обновлен статус 'read' в SQLite для чата ${chatId} до pts=${pts}, timestamp=${timestamp}`);
            } else {
              if (update.pts) {
                await storageManager.execute(
                  `UPDATE messages 
                   SET status = 'read' 
                   WHERE chatId = ? 
                     AND sender = 'me' 
                     AND pts <= ? 
                     AND status != 'read';`,
                  [chatId, update.pts]
                );
              }
            }
          } catch (dbErr) {
            console.error("[SyncManager] Ошибка обновления статуса прочтения в SQLite:", dbErr);
          }
        }
        this.triggerUpdate("read_outbox", update);
      });
    });

    // Подписка на индикатор набора текста (typing indicator).
    // Событие приходит от сервера (метод 'typing' в gateway-node, fan-out онлайн-участникам).
    tdlib.onUpdate("updateTypingState", (update: any) => {
      const chatId = update.chatId || update.chat_id;
      const userId = update.userId || update.user_id;
      const isTyping = update.isTyping ?? true;
      if (!chatId || !userId) return;
      if (isTyping) {
        this._addTypingUser(chatId, userId);
      } else {
        this._removeTypingUser(chatId, userId);
      }
      this.triggerUpdate("typing_state_changed", chatId);
    });

    tdlib.onUpdate("updateReadHistoryInbox", (update: any) => {
      console.log("[SyncManager] Обновлен статус прочтения входящих:", update);
      this.queueOrExecuteUpdate("updateReadHistoryInbox", update, async () => {
        const chatId = update.chatId || update.chat_id;
        const pts = Number(update.pts || 0);
        if (chatId) {
          try {
            await storageManager.execute("UPDATE chats SET unread = 0 WHERE id = ?;", [String(chatId)]);
          } catch (e) {
            console.warn("[SyncManager] Ошибка сброса unread при updateReadHistoryInbox:", e);
          }
          if (pts > 0 && typeof localStorage !== 'undefined') {
            const currentPts = parseInt(localStorage.getItem(`last_read_pts_${chatId}`) || '0', 10);
            if (pts > currentPts) {
              localStorage.setItem(`last_read_pts_${chatId}`, String(pts));
            }
          }
        }
        this.triggerUpdate("read_inbox", update);
      });
    });

    // Подписка на удаление сообщений
    tdlib.onUpdate("message_deleted", (update: any) => {
      console.log("[SyncManager] Получено событие удаления сообщения:", update);
      this.queueOrExecuteUpdate("message_deleted", update, async () => {
        const messageId = update.message_id || update.messageId;
        if (messageId) {
          try {
            await storageManager.execute("DELETE FROM messages WHERE id = ?;", [messageId]);
            this.triggerUpdate("message_deleted", update);
          } catch (err) {
            console.error("[SyncManager] Ошибка удаления сообщения из локальной БД:", err);
          }
        }
      });
    });

    // Подписка на редактирование сообщений
    tdlib.onUpdate("message_edited", (update: any) => {
      console.log("[SyncManager] Получено событие редактирования сообщения:", update);
      this.queueOrExecuteUpdate("message_edited", update, async () => {
        const messageId = update.message_id || update.messageId;
        const text = update.content || update.text;
        if (messageId && text !== undefined) {
          try {
            await storageManager.execute("UPDATE messages SET text = ? WHERE id = ?;", [text, messageId]);
            this.triggerUpdate("message_edited", update);
          } catch (err) {
            console.error("[SyncManager] Ошибка обновления сообщения в локальной БД:", err);
          }
        }
      });
    });

    // Подписка на обновление результатов голосования в опросах (M2.3 Polls WS frame)
    tdlib.onUpdate("updatePollVotes", (update: any) => {
      console.log("[SyncManager] Получен апдейт голосов в опросе:", update);
      this.queueOrExecuteUpdate("updatePollVotes", update, () => {
        const chatId = update.chatId || update.chat_id;
        const messageId = update.messageId || update.message_id;
        const tally = update.tally || {};
        const totalVoters = update.total_voters !== undefined ? update.total_voters : update.totalVoters;
        this.setPollTally(chatId, messageId, tally, totalVoters);
      });
    });

    // Подписка на восстановление соединения
    tdlib.onUpdate("connection_state", (update: any) => {
      this.queueOrExecuteUpdate("connection_state", update, async () => {
        if (update && update.state === "online") {
          console.log("[SyncManager] Сеть восстановлена, запускаем синхронизацию...");
          this.triggerUpdate("sync_chats", {}); // Сигнализируем UI App обновить чаты из облака
          // Сбрасываем 5-минутную парковку чатов: иначе чат, чья синхронизация упала
          // во время обрыва, останется устаревшим до 5 минут ПОСЛЕ возврата сети
          this.syncNextRetryTime = {};
          // Дренируем outbox сразу и до опустошения: раньше тик по 5 элементов
          // раз в 5 секунд дренил backlog из 100 сообщений около 100 секунд
          this.drainOutboxUntilEmpty().catch(err => {
            console.error("[SyncManager] Ошибка при обработке очереди Outbox после восстановления сети:", err);
          });
          await this.syncAllChats();
        }
      });
    });
  }

  private async handleIncomingUpdate(update: any) {
    let chatId = update.chatId || (update.message && update.message.chatId) || (update.message && update.message.channel_id) || update.channel_id;
    let msg = update.message || update;
    const pts = update.pts || (msg && msg.pts) || 0;
    const seq = update.seq || (msg && msg.seq) || 0;
    const currentUserId = typeof window !== "undefined" ? (localStorage.getItem("current_user_id") || localStorage.getItem("my_user_id")) : null;

    // Корректная маршрутизация 1-to-1 и групповых чатов:
    // Подмена chatId на sender_id допустима ТОЛЬКО если сервер прислал пакет,
    // адресованный нам лично (chatId равен нашему ID или 'me').
    if (msg) {
      if (chatId && currentUserId && (String(chatId) === String(currentUserId) || chatId === 'me')) {
        const sender = msg.sender_id || (msg.sender && msg.sender !== 'me' && msg.sender !== 'other' ? msg.sender : null);
        if (sender && String(sender) !== String(currentUserId)) {
          chatId = String(sender);
        }
      }
    }
    
    if (!chatId) {
      console.warn("[SyncManager] handleIncomingUpdate без chatId:", update);
      this.triggerUpdate("message", update);
      return;
    }

    if (this.syncingChats.has(chatId)) {
      console.log(`[SyncManager] Синхронизация чата ${chatId} активна. Добавляем обновление pts=${pts} в очередь.`);
      if (!this.pendingUpdatesQueue.has(chatId)) {
        this.pendingUpdatesQueue.set(chatId, []);
      }
      this.pendingUpdatesQueue.get(chatId)!.push({ ...update, chatId, message: msg });
      return;
    }

    const localPts = this.getPts(chatId);

    // Проверка дубликатов: проверяем наличие точного ID сообщения в SQLite БД
    if (msg && msg.id && pts > 0 && pts <= localPts) {
      try {
        const rows = await storageManager.query<{ id: string }>(
          "SELECT id FROM messages WHERE id = ? LIMIT 1;",
          [msg.id]
        );
        if (rows.length > 0) {
          console.log(`[SyncManager] Пропущено уже сохраненное сообщение ${msg.id} для чата ${chatId} (pts=${pts}, localPts=${localPts})`);
          return;
        }
      } catch (err) {
        // При ошибке запроса продолжаем обработку для надежности
      }
    }

    // Дешифруем и сохраняем в БД
    let isNew = true;
    if (msg) {
      msg = await decryptMessageIfNeeded(chatId, msg);
      if (msg && msg.isService) {
        console.log(`[SyncManager] Получено служебное сообщение для чата ${chatId}, игнорируем.`);
        return;
      }
      if (msg.id) {
        isNew = await this.saveMessageToDb(chatId, msg);
      }
    }

    const hasGap = pts > localPts + 1 && localPts > 0;

    // Проверка наличия пропусков (Gap Detection) — если есть разрыв, синхронизируем разницу
    if (hasGap) {
      console.warn(`[SyncManager] Обнаружен разрыв в pts для чата ${chatId}! Ожидалось: ${localPts + 1}, Получено: ${pts}. Запуск синхронизации...`);
      await this.syncDifference(chatId).catch(syncErr => {
        console.error(`[SyncManager] Ошибка синхронизации gap для ${chatId}:`, syncErr);
      });
      return;
    }

    // Обновляем локальный PTS чата
    if (pts > localPts) {
      this.setPts(chatId, pts);
    }
    if (seq) this.localSeq = seq;

    // МГНОВЕННО ОТПРАВЛЯЕМ СООБЩЕНИЕ В UI РЕАКТИВНО
    console.log(`[SyncManager] Мгновенная доставка сообщения в UI для чата ${chatId}:`, { msgId: msg?.id, pts, isNew });
    this.triggerUpdate("message", {
      ...update,
      chatId,
      message: msg,
      pts,
      isNew
    });
  }

  public async syncAllChats() {
    console.log("[SyncManager] Запуск синхронизации для всех известных чатов...");
    try {
      const dbChats = await storageManager.query<{ id: string; isGroup?: number }>("SELECT id, isGroup FROM chats;");
      const chatIds = new Set<string>([
        ...Object.keys(this.localPtsMap),
        ...dbChats.map(c => c.id)
      ]);
      for (const chatId of chatIds) {
        await this.syncDifference(chatId);
      }
      // Фоновое прогревание оффлайн-бандлов (Shutdown-Safe Pre-Warming, 7 суток TTL) для всех 1-to-1 чатов
      const directPeerIds = dbChats.filter(c => !c.isGroup).map(c => c.id);
      if (directPeerIds.length > 0 && !tdlib.isOffline()) {
        void prewarmContactPrekeyBundles(directPeerIds).catch(() => {});
      }
    } catch (err) {
      console.error("[SyncManager] Ошибка чтения чатов для syncAllChats:", err);
      const chats = Object.keys(this.localPtsMap);
      for (const chatId of chats) {
        await this.syncDifference(chatId);
      }
    }
  }

  public async syncDifference(chatId: string) {
    if (this.syncingChats.has(chatId)) return;
    
    // Проверка backoff-таймаута для чата
    const now = Date.now();
    const nextRetry = this.syncNextRetryTime[chatId] || 0;
    if (now < nextRetry) {
      console.log(`[SyncManager] Синхронизация чата ${chatId} отложена (backoff) до ${new Date(nextRetry).toLocaleTimeString()}`);
      return;
    }

    this.syncingChats.add(chatId);
    
    const localPts = this.getPts(chatId);
    
    let currentLocalPts = localPts;
    let hasMore = true;
    let accumulatedUpdates: any[] = [];
    let finalServerPts = currentLocalPts;
    let isColdStart = false;
    let iterations = 0;

    try {
      while (hasMore) {
        iterations++;
        console.log(`[SyncManager] Запрос порции обновлений для чата ${chatId} с pts=${currentLocalPts}...`);
        const result = await tdlib.send("updates.getDifference", { chatId, pts: currentLocalPts });
        
        if (!result) {
          throw new Error(`Пустой ответ от сервера при запросе обновлений для чата ${chatId}`);
        }

        const { updates, pts: serverPts, gapTooLarge, hasMore: serverHasMore } = result;

        if (gapTooLarge) {
          console.log(`[SyncManager] Сервер сообщил gapTooLarge для чата ${chatId} (localPts=${currentLocalPts}, serverPts=${serverPts}). Попытка пакетной докачки runBatchSync (SYN-005)...`);
          try {
            await this.runBatchSync(chatId, currentLocalPts, serverPts);
            this.syncRetryAttempts[chatId] = 0;
            this.syncNextRetryTime[chatId] = 0;
            return;
          } catch (batchErr) {
            console.error(`[SyncManager] Ошибка runBatchSync при gapTooLarge для ${chatId}, аварийный fallback в handleColdStart:`, batchErr);
            await this.handleColdStart(chatId, serverPts);
            this.syncRetryAttempts[chatId] = 0;
            this.syncNextRetryTime[chatId] = 0;
            return;
          }
        }

        if ((serverPts - localPts > this.config.coldStartThreshold) || (serverPts - localPts > 100)) {
          console.log(`[SyncManager] Обнаружен разрыв PTS для чата ${chatId} (localPts=${localPts}, serverPts=${serverPts}). Запуск постраничной докачки runBatchSync...`);
          try {
            await this.runBatchSync(chatId, localPts, serverPts);
            this.syncRetryAttempts[chatId] = 0;
            this.syncNextRetryTime[chatId] = 0;
            return;
          } catch (batchErr) {
            console.error(`[SyncManager] Ошибка runBatchSync для ${chatId}, аварийный fallback в handleColdStart:`, batchErr);
            await this.handleColdStart(chatId, serverPts);
            return;
          }
        }

        if (updates && updates.length > 0) {
          accumulatedUpdates.push(...updates);
        }

        finalServerPts = serverPts;
        currentLocalPts = serverPts;
        hasMore = !!serverHasMore;

        // Предохранитель от бесконечного цикла
        if (iterations > 30 || accumulatedUpdates.length > 600) {
          console.warn("[SyncManager] Достигнут лимит итераций/обновлений в пакетной синхронизации. Прерываем цикл.");
          hasMore = false;
        }
      }

      if (isColdStart) {
        console.warn(`[SyncManager] GAP_TOO_LARGE для чата ${chatId}! Разница слишком велика. Запуск холодного старта.`);
        await this.handleColdStart(chatId, finalServerPts);
      } else {
        console.log(`[SyncManager] Успешно получено в сумме ${accumulatedUpdates.length} обновлений для чата ${chatId}.`);
        
        if (accumulatedUpdates.length > 0) {
          const sortedUpdates = [...accumulatedUpdates].sort((a: any, b: any) => {
            const ptsA = a.pts || (a.message && a.message.pts) || 0;
            const ptsB = b.pts || (b.message && b.message.pts) || 0;
            return ptsA - ptsB;
          });

          const initialPts = this.getPts(chatId);
          let latestPts = initialPts;

          const decryptedMessages: any[] = [];

          for (const u of sortedUpdates) {
            const uPts = u.pts || (u.message && u.message.pts);
            if (uPts && uPts <= initialPts) {
              console.log(`[SyncManager] Пропущено дублирующееся сообщение из разницы для чата ${chatId}: uPts=${uPts}, initialPts=${initialPts}`);
              continue;
            }
            if (uPts && uPts > latestPts) {
              latestPts = uPts;
            }
            if (!u.chatId) {
              u.chatId = chatId;
            }
            let msg = u.message || u;
            if (msg) {
              msg = await decryptMessageIfNeeded(chatId, msg, true);
              if (msg && msg.isService) {
                continue;
              }
              if (u.message) {
                u.message = msg;
              }
              decryptedMessages.push(msg);
            }
          }

          if (decryptedMessages.length > 0) {
            // Проверяем, является ли чат группой
            const chatInfo = await storageManager.query<{ isGroup: number }>("SELECT isGroup FROM chats WHERE id = ? LIMIT 1;", [chatId]);
            let isGroup = chatInfo.length > 0 ? (chatInfo[0].isGroup === 1) : false;
            if (!isGroup) {
              const session = this.getMlsSession(chatId);
              if (session) {
                isGroup = true;
              } else {
                const wpSession = await this.initMlsSessionFromWelcomePackage(chatId);
                if (wpSession) {
                  isGroup = true;
                }
              }
            }
            const defaultName = isGroup ? 'Группа' : 'Чат';
            const defaultAvatar = isGroup ? '👥' : '👤';
            const isGroupNum = isGroup ? 1 : 0;

            const myUsername = typeof window !== "undefined" ? localStorage.getItem("username") : null;
            const currentUserId = typeof window !== "undefined" ? (localStorage.getItem("current_user_id") || localStorage.getItem("my_user_id")) : null;
            const sqlStatements = decryptedMessages.map((m: any) => {
              const pts = m.pts || 0;
              const text = m.text || '';
              const time = m.time || new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const rawSender = m.sender || 'other';
              const isMe = rawSender === 'me' || m.senderName === 'Я' ||
                           (currentUserId && String(rawSender) === String(currentUserId)) ||
                           (myUsername && rawSender && rawSender.toString().toLowerCase() === myUsername.toLowerCase());
              const sender = isMe ? 'me' : rawSender;
              const senderName = isMe ? 'Я' : resolveSenderDisplayName(sender, m.senderName);
              const timestamp = m.timestamp || Date.now();
              const type = m.type || 'text';
              const mediaUrl = m.mediaUrl || null;
              const peaks = m.peaks ? JSON.stringify(m.peaks) : null;
              const replyToMessageId = m.replyToMessageId || null;
              const forwardFromUser = m.forwardFromUser || null;
              const mediaKey = m.mediaKey || null;
              const mediaIv = m.mediaIv || null;
              const replyMarkupStr = (m.replyMarkup || m.reply_markup)
                ? (typeof (m.replyMarkup || m.reply_markup) === 'string' ? (m.replyMarkup || m.reply_markup) : JSON.stringify(m.replyMarkup || m.reply_markup))
                : null;

              return {
                sql: `INSERT INTO messages (id, chatId, sender, senderName, text, time, pts, timestamp, type, mediaUrl, peaks, replyToMessageId, forwardFromUser, status, mediaKey, mediaIv, topic_id, raw_encrypted, reply_markup) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET pts = excluded.pts, status = CASE WHEN messages.status = 'read' THEN 'read' ELSE excluded.status END, text = CASE WHEN (messages.text NOT LIKE '🔒%' AND excluded.text LIKE '🔒%') THEN messages.text ELSE excluded.text END, type = CASE WHEN (messages.type IS NOT NULL AND messages.type <> 'text' AND (excluded.type IS NULL OR excluded.type = 'text')) THEN messages.type ELSE excluded.type END, mediaUrl = COALESCE(excluded.mediaUrl, messages.mediaUrl), peaks = COALESCE(excluded.peaks, messages.peaks), mediaKey = COALESCE(excluded.mediaKey, messages.mediaKey), mediaIv = COALESCE(excluded.mediaIv, messages.mediaIv), topic_id = COALESCE(excluded.topic_id, messages.topic_id), raw_encrypted = COALESCE(excluded.raw_encrypted, messages.raw_encrypted), reply_markup = COALESCE(excluded.reply_markup, messages.reply_markup)`,
                params: [m.id, chatId, sender, senderName, text, time, pts, timestamp, type, mediaUrl, peaks, replyToMessageId, forwardFromUser, 'sent', mediaKey, mediaIv, m.topic_id ?? null, m.rawEncryptedPayload || null, replyMarkupStr]
              };
            });

            sqlStatements.unshift({
              sql: "INSERT OR IGNORE INTO chats (id, name, avatar, lastMessage, time, unread, isGroup, online, pts) VALUES (?, ?, ?, '', '', 0, ?, 0, 0)",
              params: [chatId, defaultName, defaultAvatar, isGroupNum]
            });

            await storageManager.transaction(sqlStatements);

            // Обновляем последнее сообщение в чате
            const lastMsg = decryptedMessages[decryptedMessages.length - 1];
            const lastSender = lastMsg.sender || 'other';
            const lastSenderName = resolveSenderDisplayName(lastSender, lastMsg.senderName);
            const lastText = lastMsg.text || '';
            const lastTime = lastMsg.time || new Date(lastMsg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            await storageManager.execute(
              `INSERT INTO chats (id, name, avatar, lastMessage, time, unread, isGroup, online, pts) 
               VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?)
               ON CONFLICT(id) DO UPDATE SET 
                 name = CASE 
                   WHEN (chats.name IS NULL OR chats.name IN ('', 'Собеседник', 'Собеседник (Mesh)', 'Чат', 'other', 'others', 'undefined', 'null', 'Пользователь') OR chats.name LIKE '%-%-%-%-%' OR chats.name LIKE 'Пользователь #%')
                        AND (excluded.name NOT IN ('', 'Собеседник', 'Собеседник (Mesh)', 'Чат', 'other', 'others', 'undefined', 'null', 'Пользователь') AND excluded.name NOT LIKE '%-%-%-%-%' AND excluded.name NOT LIKE 'Пользователь #%')
                   THEN excluded.name 
                   ELSE chats.name 
                 END,
                 lastMessage = excluded.lastMessage,
                 time = excluded.time,
                 pts = excluded.pts,
                 isGroup = CASE WHEN chats.isGroup = 1 THEN 1 ELSE excluded.isGroup END,
                 avatar = CASE WHEN chats.avatar = '👥' THEN '👥' ELSE excluded.avatar END;`,
              [chatId, isGroup ? 'Группа' : lastSenderName, isGroup ? '👥' : '👤', lastText, lastTime, isGroupNum, latestPts]
            );
          }

          // Триггерим события в UI
          for (const u of sortedUpdates) {
            const uPts = u.pts || (u.message && u.message.pts);
            if (uPts && uPts <= initialPts) {
              continue;
            }
            const msg = u.message || u;
            if (msg && msg.isService) {
              continue;
            }
            this.triggerUpdate("message", { ...u, isHistory: true });
          }

          if (latestPts > this.getPts(chatId)) {
            this.setPts(chatId, latestPts);
          }
        }
        
        if (finalServerPts > this.getPts(chatId)) {
          this.setPts(chatId, finalServerPts);
        }
      }

      // Успешно: сбрасываем ретраи
      this.syncRetryAttempts[chatId] = 0;
      this.syncNextRetryTime[chatId] = 0;

    } catch (error) {
      console.error(`[SyncManager] Ошибка во время синхронизации разницы для чата ${chatId}:`, error);
      
      const attempts = (this.syncRetryAttempts[chatId] || 0) + 1;
      this.syncRetryAttempts[chatId] = attempts;
      
      if (attempts >= this.MAX_SYNC_RETRIES) {
        console.warn(`[SyncManager] Достигнут лимит ретраев (${this.MAX_SYNC_RETRIES}) для чата ${chatId}. Синхронизация приостановлена.`);
        this.syncNextRetryTime[chatId] = Date.now() + 5 * 60 * 1000; // Пауза 5 минут
        this.syncRetryAttempts[chatId] = 0;
      } else {
        const delay = Math.pow(2, attempts) * 2000 + Math.random() * 1000; // 4c, 8c, 16c...
        this.syncNextRetryTime[chatId] = Date.now() + delay;
        console.log(`[SyncManager] Следующая попытка синхронизации чата ${chatId} запланирована через ${delay}мс.`);
      }
    } finally {
      const queue = this.pendingUpdatesQueue.get(chatId) || [];
      this.pendingUpdatesQueue.delete(chatId);

      this.syncingChats.delete(chatId);
      
      if (queue.length > 0) {
        console.log(`[SyncManager] Синхронизация для чата ${chatId} завершена. Обработка ${queue.length} отложенных обновлений.`);
        const sortedQueue = [...queue].sort((a: any, b: any) => {
          const ptsA = a.pts || (a.message && a.message.pts) || 0;
          const ptsB = b.pts || (b.message && b.message.pts) || 0;
          return ptsA - ptsB;
        });

        for (const u of sortedQueue) {
          await this.handleIncomingUpdate(u);
        }
      }

      this.notifySyncFinished();
    }
  }

  private async handleColdStart(chatId: string, serverPts: number) {
    console.log(`[SyncManager] Запуск холодного старта для чата ${chatId}...`);
    
    this.setPts(chatId, serverPts);

      // SYN-005: Устранено деструктивное удаление групповой истории при cold start.
      // Локальные расшифрованные сообщения групп сохраняются так же, как и для приватных чатов.
      console.log(`[SyncManager] Холодный старт для чата ${chatId}: локальная история сохранена без удаления.`);

    this.triggerUpdate("cold_start", { chatId, pts: serverPts });
  }

  public async runBatchSync(chatId: string, ptsStart: number, ptsEnd: number): Promise<void> {
    console.log(`[SyncManager] Запуск пакетной синхронизации чата ${chatId} с ptsStart=${ptsStart} до ptsEnd=${ptsEnd}...`);
    try {
      const token = localStorage.getItem("session_token");
      const CHUNK_SIZE = 500;
      let currentStart = ptsStart;

      while (currentStart < ptsEnd) {
        const currentEnd = Math.min(currentStart + CHUNK_SIZE, ptsEnd);
        console.log(`[SyncManager] Докачка порции сообщений для ${chatId} (${currentStart} -> ${currentEnd})...`);
        // F-10: без таймаута зависшее соединение (типично на мобильных сетях)
        // вешает batch-докачку и весь gap-recovery до системного TCP-таймаута
        const batchAbort = new AbortController();
        const batchTimeout = setTimeout(() => batchAbort.abort(), 15000);
        let response: Response;
        try {
          response = await fetch(getBackendUrl('/api/v1/sync/difference/batch'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token || ''}`,
              'Accept-Encoding': 'gzip'
            },
            body: JSON.stringify({ chatId, ptsStart: currentStart, ptsEnd: currentEnd, limit: CHUNK_SIZE }),
            signal: batchAbort.signal
          });
        } finally {
          clearTimeout(batchTimeout);
        }

        if (!response.ok) {
          if (response.status === 404 || response.status === 410 || response.status === 503) {
            console.warn(`[SyncManager] Batch sync недоступен на сервере (HTTP ${response.status}), аварийный переход в handleColdStart`);
            await this.handleColdStart(chatId, ptsEnd);
            return;
          }
          throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();
        const messages = data.messages || [];

        if (messages.length > 0) {
          // Проверяем, является ли чат группой
          const chatInfo = await storageManager.query<{ isGroup: number }>("SELECT isGroup FROM chats WHERE id = ? LIMIT 1;", [chatId]);
          let isGroup = chatInfo.length > 0 ? (chatInfo[0].isGroup === 1) : false;
          if (!isGroup) {
            const session = this.getMlsSession(chatId);
            if (session) {
              isGroup = true;
            } else {
              const wpSession = await this.initMlsSessionFromWelcomePackage(chatId);
              if (wpSession) {
                isGroup = true;
              }
            }
          }
          const defaultName = isGroup ? 'Группа' : 'Чат';
          const defaultAvatar = isGroup ? '👥' : '👤';
          const isGroupNum = isGroup ? 1 : 0;

          for (let i = 0; i < messages.length; i++) {
            messages[i] = await decryptMessageIfNeeded(chatId, messages[i], true);
          }
          const filteredMessages = messages.filter((m: any) => !m.isService);
          const myUsername = typeof window !== "undefined" ? localStorage.getItem("username") : null;
          const currentUserId = typeof window !== "undefined" ? (localStorage.getItem("current_user_id") || localStorage.getItem("my_user_id")) : null;
          const statements = filteredMessages.map((m: any) => {
            const rawSender = m.sender || 'other';
            const isMe = rawSender === 'me' || m.senderName === 'Я' ||
                         (currentUserId && String(rawSender) === String(currentUserId)) ||
                         (myUsername && rawSender && rawSender.toString().toLowerCase() === myUsername.toLowerCase());
            const sender = isMe ? 'me' : rawSender;
            const senderName = isMe ? 'Я' : resolveSenderDisplayName(sender, m.senderName);
            const time = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const mediaKey = m.mediaKey || null;
            const mediaIv = m.mediaIv || null;
            
            return {
              sql: `INSERT INTO messages (id, chatId, sender, senderName, text, time, pts, timestamp, type, mediaUrl, peaks, replyToMessageId, forwardFromUser, status, mediaKey, mediaIv, topic_id, raw_encrypted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET pts = excluded.pts, status = CASE WHEN messages.status = 'read' THEN 'read' ELSE excluded.status END, text = CASE WHEN (messages.text NOT LIKE '🔒%' AND excluded.text LIKE '🔒%') THEN messages.text ELSE excluded.text END, type = CASE WHEN (messages.type IS NOT NULL AND messages.type <> 'text' AND (excluded.type IS NULL OR excluded.type = 'text')) THEN messages.type ELSE excluded.type END, mediaUrl = COALESCE(excluded.mediaUrl, messages.mediaUrl), peaks = COALESCE(excluded.peaks, messages.peaks), mediaKey = COALESCE(excluded.mediaKey, messages.mediaKey), mediaIv = COALESCE(excluded.mediaIv, messages.mediaIv), topic_id = COALESCE(excluded.topic_id, messages.topic_id), raw_encrypted = COALESCE(excluded.raw_encrypted, messages.raw_encrypted)`,
              params: [
                m.id, chatId, sender, senderName, m.text,
                time, m.pts, m.timestamp, m.type || 'text',
                m.mediaUrl || null, m.peaks ? JSON.stringify(m.peaks) : null,
                m.replyToMessageId || null, m.forwardFromUser || null, 'sent',
                mediaKey, mediaIv, m.topic_id ?? null,
                m.rawEncryptedPayload || null
              ]
            };
          });

          statements.unshift({
            sql: "INSERT OR IGNORE INTO chats (id, name, avatar, lastMessage, time, unread, isGroup, online, pts) VALUES (?, ?, ?, '', '', 0, ?, 0, 0)",
            params: [chatId, defaultName, defaultAvatar, isGroupNum]
          });

          await storageManager.transaction(statements);
          
          const lastMsg = messages[messages.length - 1];
          const lastSender = lastMsg.sender || 'other';
          const lastSenderName = resolveSenderDisplayName(lastSender, lastMsg.senderName);
          const lastTime = new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          await storageManager.execute(
            `INSERT INTO chats (id, name, avatar, lastMessage, time, unread, isGroup, online, pts) 
             VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?)
             ON CONFLICT(id) DO UPDATE SET 
               name = CASE 
                 WHEN (chats.name IS NULL OR chats.name IN ('', 'Собеседник', 'Собеседник (Mesh)', 'Чат', 'other', 'others', 'undefined', 'null', 'Пользователь') OR chats.name LIKE '%-%-%-%-%' OR chats.name LIKE 'Пользователь #%')
                      AND (excluded.name NOT IN ('', 'Собеседник', 'Собеседник (Mesh)', 'Чат', 'other', 'others', 'undefined', 'null', 'Пользователь') AND excluded.name NOT LIKE '%-%-%-%-%' AND excluded.name NOT LIKE 'Пользователь #%')
                 THEN excluded.name 
                 ELSE chats.name 
               END,
               lastMessage = excluded.lastMessage,
               time = excluded.time,
               pts = excluded.pts,
               isGroup = CASE WHEN chats.isGroup = 1 THEN 1 ELSE excluded.isGroup END,
               avatar = CASE WHEN chats.avatar = '👥' THEN '👥' ELSE excluded.avatar END;`,
            [chatId, isGroup ? 'Группа' : lastSenderName, isGroup ? '👥' : '👤', lastMsg.text, lastTime, isGroupNum, currentEnd]
          );
        }

        this.setPts(chatId, currentEnd);
        currentStart = currentEnd;
      }

      this.setPts(chatId, ptsEnd);
      this.triggerUpdate("batch_sync_complete", { chatId, pts: ptsEnd });
      this.triggerUpdate("message", { chatId, pts: ptsEnd, batch: true });

      // Успешно: сбрасываем ретраи
      this.syncRetryAttempts[chatId] = 0;
      this.syncNextRetryTime[chatId] = 0;

    } catch (err) {
      console.error(`[SyncManager] Ошибка пакетной синхронизации чата ${chatId}:`, err);
      throw err;
    }
  }

  private startOutboxWorker() {
    if (this.outboxTimer) return;
    this.outboxTimer = setInterval(() => {
      this.processOutboxQueue().catch(err => {
        console.error("[SyncManager] Ошибка воркера Outbox:", err);
      });
    }, 5000);
  }

  private async uploadMediaIfNeeded(
    itemId: string,
    type: string,
    mediaUrl: string,
    shouldEncrypt: boolean
  ): Promise<{ url: string; key?: string; iv?: string }> {
    let blob: Blob | null = null;

    // 1. Проверяем наличие персистентного блоба в OutboxMediaStore
    if (mediaUrl.startsWith('local-media://')) {
      const mediaId = mediaUrl.replace('local-media://', '');
      blob = await outboxMediaStore.getMedia(mediaId);
      if (!blob) {
        blob = await outboxMediaStore.getMedia(itemId);
      }
    } else if (await outboxMediaStore.hasMedia(itemId)) {
      blob = await outboxMediaStore.getMedia(itemId);
    }

    // 2. Если блоб не найден в IndexedDB, пробуем fetch для blob: ссылок
    if (!blob) {
      if (mediaUrl.startsWith('blob:')) {
        try {
          const response = await fetch(mediaUrl);
          blob = await response.blob();
        } catch (fetchErr) {
          console.error(`[SyncManager] Ошибка чтения blob URL для ${itemId}:`, fetchErr);
          throw fetchErr;
        }
      } else {
        // Уже удаленный URL
        return { url: mediaUrl };
      }
    }

    if (type === 'voice') {
      try {
        blob = await ensureUniversalAudioBlob(blob);
      } catch (voiceErr) {
        console.warn("[SyncManager] Ошибка нормализации голосового сообщения в Outbox:", voiceErr);
      }
    } else if (type === 'video_note') {
      try {
        blob = await compressVideoNote(blob);
      } catch (noteErr) {
        console.warn("[SyncManager] Ошибка нормализации видео-кружка в Outbox:", noteErr);
      }
    }

    const isMp4Audio = blob.type.includes('mp4') || blob.type.includes('aac');
    const isWavAudio = blob.type.includes('wav');
    let filename = type === 'voice'
      ? (isWavAudio ? 'voice.wav' : (isMp4Audio ? 'voice.m4a' : 'voice.ogg'))
      : type === 'video_note'
      ? 'video_note.mp4'
      : 'file';
    let keyHex: string | undefined;
    let ivHex: string | undefined;

    if (shouldEncrypt) {
      try {
        const encryptResult = await encryptMediaBlob(blob);
        blob = encryptResult.encryptedBlob;
        keyHex = encryptResult.keyHex;
        ivHex = encryptResult.ivHex;
        const baseName = filename.replace(/\.[^/.]+$/, "");
        filename = `${baseName}.enc`;
      } catch (encErr) {
        // Fail-Closed (§12.4/§12.5): незашифрованный blob не загружается на сервер;
        // элемент остаётся в очереди, повторная попытка по бэкоффу
        console.error("[SyncManager] E2EE: Ошибка шифрования blob-медиа в Outbox — загрузка заблокирована (Fail-Closed):", encErr);
        throw encErr;
      }
    }

    const fileToUpload = new File([blob], filename, { type: blob.type || (type === 'voice' ? (isMp4Audio ? 'audio/mp4' : 'audio/ogg') : 'video/mp4') });
    const formData = new FormData();
    formData.append("file", fileToUpload, filename);

    const token = localStorage.getItem("session_token");
    const res = await fetch(getBackendUrl("/api/v1/media/upload"), {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${token || ''}`
      },
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Ошибка загрузки медиа при отправке из Outbox: ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.url) {
      throw new Error("Не удалось получить URL загруженного медиафайла");
    }

    // Удаляем сохраненный Blob из локального хранилища после успешной выгрузки
    await outboxMediaStore.deleteMedia(itemId);
    if (mediaUrl.startsWith('local-media://')) {
      await outboxMediaStore.deleteMedia(mediaUrl.replace('local-media://', ''));
    }

    return { url: data.url, key: keyHex, iv: ivHex };
  }

  private async processOutboxQueue(): Promise<number> {
    if (!storageManager.getIsInitialized()) {
      return 0;
    }
    if (this.isProcessingOutbox || tdlib.isOffline()) {
      return 0;
    }
    this.isProcessingOutbox = true;

    try {
      await ensurePlaintextPendingColumn();
      const now = Date.now();
      const pending = await storageManager.query<{
        id: string;
        chatId: string;
        text: string;
        type: string | null;
        mediaUrl: string | null;
        peaks: string | null;
        replyToMessageId: string | null;
        retryCount: number;
        nextRetryTime: number;
        mediaKey: string | null;
        mediaIv: string | null;
        plaintext_pending?: string | null;
      }>(
        "SELECT id, chatId, text, type, mediaUrl, peaks, replyToMessageId, retryCount, nextRetryTime, mediaKey, mediaIv, plaintext_pending FROM outbox_queue WHERE nextRetryTime <= ? AND status IN ('pending', 'sending') ORDER BY timestamp ASC LIMIT 5;",
        [now]
      );

      const failedChatIds = new Set<string>();

      for (const item of pending) {
        if (failedChatIds.has(item.chatId)) {
          // TX-3: Сохраняем строгую последовательность отправки для одного chatId (не переставляем сообщения)
          continue;
        }
        console.log(`[SyncManager] Попытка отправки сообщения из Outbox: id=${item.id}, retryCount=${item.retryCount}`);
        try {
          let textToSend = item.text;
          let typeToSend = item.type || 'text';
          let mediaUrlToSend = item.mediaUrl || undefined;
          let peaksToSend = safeParsePeaks(item.peaks);

          // TX-1: Безопасный дефолт — шифруем всегда, кроме подтверждённых серверных каналов без 1:1 сессии
          const chat = await storageManager.query<{ isGroup: number; type?: string }>("SELECT isGroup, type FROM chats WHERE id = ? LIMIT 1;", [item.chatId]);
          const isGroup = chat.length > 0 ? (chat[0].isGroup === 1 || chat[0].type === 'group') : false;
          let isChannel = !isGroup && chat.length > 0 && chat[0].type === 'channel';
          if (isChannel) {
            try {
              const existingSession = await getSession(item.chatId);
              if (existingSession) {
                isChannel = false;
              }
            } catch {}
          }
          
          // TX-2: Извлекаем исходный текст (из plaintext_pending, если предварительное шифрование было отложено)
          let rawText = (item.plaintext_pending && item.plaintext_pending.length > 0) ? item.plaintext_pending : item.text;
          const isAlreadyEncrypted = isE2EEMessage(rawText);
          // §12.4 Uniform Media Encryption: voice шифруется как любое другое медиа;
          // незашифрованный blob (вкл. голосовой) не должен покидать устройство
          const shouldEncrypt = !isChannel && typeToSend !== 'text' && !isAlreadyEncrypted;

          // F-7: ключи, сохранённые в outbox при постановке в очередь (блоб уже
          // зашифрован и загружен) — переживают ретраи и попадают в mediaPayload
          let encryptionKeys: { key?: string; iv?: string } = {
            key: item.mediaKey || undefined,
            iv: item.mediaIv || undefined
          };

          // 1. Загрузка медиафайла, если это локальный blob-URL или local-media://
          if (mediaUrlToSend && (mediaUrlToSend.startsWith('blob:') || mediaUrlToSend.startsWith('local-media://') || await outboxMediaStore.hasMedia(item.id))) {
            try {
              const uploadResult = await this.uploadMediaIfNeeded(item.id, typeToSend, mediaUrlToSend, shouldEncrypt);
              mediaUrlToSend = uploadResult.url;
              // Ключи из строки outbox не затираем undefined: блоб мог быть уже
              // зашифрован и загружен до постановки в очередь (F-7)
              if (uploadResult.key) encryptionKeys.key = uploadResult.key;
              if (uploadResult.iv) encryptionKeys.iv = uploadResult.iv;
              await storageManager.execute(
                "UPDATE messages SET mediaUrl = ?, mediaKey = COALESCE(?, mediaKey), mediaIv = COALESCE(?, mediaIv) WHERE id = ?;",
                [uploadResult.url, encryptionKeys.key || null, encryptionKeys.iv || null, item.id]
              );
              await storageManager.execute(
                "UPDATE outbox_queue SET mediaUrl = ?, mediaKey = COALESCE(?, mediaKey), mediaIv = COALESCE(?, mediaIv) WHERE id = ?;",
                [uploadResult.url, encryptionKeys.key || null, encryptionKeys.iv || null, item.id]
              );
            } catch (uploadErr) {
              console.error(`[SyncManager] Ошибка автозагрузки медиа для сообщения ${item.id} из Outbox:`, uploadErr);
              throw uploadErr;
            }
          }

          // Сохраняем реальный URL загруженного медиафайла до того, как mediaUrlToSend будет сброшен в undefined для внешнего конверта E2EE
          const uploadedMediaUrl = mediaUrlToSend || item.mediaUrl || null;

          if (isChannel) {
            // Публичный канал (Single-Encryption & Public Channel Invariant):
            // Сообщения отправляются открытым текстом / JSON v3 без E2EE
            textToSend = rawText;
          } else if (isAlreadyEncrypted) {
            // Инвариант однократного шифрования: отправляем готовый шифротекст БЕЗ повторного вызова encryptMessage
            textToSend = rawText;
            typeToSend = 'text';
            mediaUrlToSend = undefined;
            peaksToSend = undefined;
          } else if (!isGroup) {
            try {
              if (typeToSend !== 'text') {
                const mediaPayload = JSON.stringify({
                  text: rawText,
                  type: typeToSend,
                  mediaUrl: mediaUrlToSend,
                  peaks: peaksToSend,
                  key: encryptionKeys.key,
                  iv: encryptionKeys.iv
                });
                textToSend = await encryptMessage(item.chatId, mediaPayload);
                typeToSend = 'text';
                mediaUrlToSend = undefined;
                peaksToSend = undefined;
              } else if (typeToSend === 'text' && rawText !== "[service_session_reset]") {
                textToSend = await encryptMessage(item.chatId, rawText);
              } else {
                textToSend = rawText;
              }
            } catch (cryptErr) {
              // Fail-Closed (§12.5): открытый текст не отправляется в облако.
              // Элемент остаётся в очереди — повторная попытка шифрования по бэкоффу.
              console.warn(`[SyncManager] Не удалось зашифровать сообщение для чата ${item.chatId} — отправка заблокирована (Fail-Closed):`, cryptErr);
              throw cryptErr;
            }
          } else {
            // Групповой чат (MLS E2EE)
            try {
              // Если сообщение начинается с mls_commit:, мы не шифруем его, а отправляем как есть (управляющее сообщение)
              if (typeToSend === 'text' && rawText.startsWith("mls_commit:")) {
                textToSend = rawText;
              } else {
                let session = SyncManager.getInstance().getMlsSession(item.chatId);
                if (!session) {
                  session = await SyncManager.getInstance().initMlsSessionFromWelcomePackage(item.chatId);
                }
                
                if (session) {
                  if (typeToSend !== 'text') {
                    const mediaPayload = JSON.stringify({
                      text: rawText,
                      type: typeToSend,
                      mediaUrl: mediaUrlToSend,
                      peaks: peaksToSend,
                      key: encryptionKeys.key,
                      iv: encryptionKeys.iv
                    });
                    const encResult = await session.encryptMessage(mediaPayload);
                    textToSend = JSON.stringify({
                      ciphertextHex: encResult.ciphertextHex,
                      mlsCiphertextHex: encResult.ciphertextHex,
                      ivHex: encResult.ivHex,
                      epochNumber: encResult.epochNumber
                    });
                    typeToSend = 'text';
                    mediaUrlToSend = undefined;
                    peaksToSend = undefined;
                  } else if (typeToSend === 'text') {
                    const encResult = await session.encryptMessage(rawText);
                    textToSend = JSON.stringify({
                      ciphertextHex: encResult.ciphertextHex,
                      mlsCiphertextHex: encResult.ciphertextHex,
                      ivHex: encResult.ivHex,
                      epochNumber: encResult.epochNumber
                    });
                  }
                } else {
                  // CRP-001/SYN-004: Fail-Closed (§12.5): при отсутствии MLS-сессии открытый текст не отправляется
                  console.warn(`[SyncManager] Нет MLS сессии для группы ${item.chatId} — отправка заблокирована (Fail-Closed).`);
                  throw new Error(`Нет MLS сессии для группы ${item.chatId} (Fail-Closed §12.5)`);
                }
              }
            } catch (cryptErr) {
              // Fail-Closed (§12.5): при сбое MLS-шифрования открытый текст не отправляется.
              console.warn(`[SyncManager] Ошибка MLS шифрования для группы ${item.chatId} — отправка заблокирована (Fail-Closed):`, cryptErr);
              throw cryptErr;
            }
          }

          // §13.1 Single-Encryption (SYN-001): персистируем шифротекст в outbox_queue,
          // чтобы ретраи отправляли сохраненный cipher без повторного сдвига Double Ratchet/MLS.
          // client_message_id (item.id) остается неизменным. Очищаем plaintext_pending после успешного шифрования.
          if (!isAlreadyEncrypted && !isChannel && isE2EEMessage(textToSend)) {
            item.text = textToSend;
            item.type = typeToSend;
            item.plaintext_pending = null;
            try {
              await storageManager.execute(
                "UPDATE outbox_queue SET text = ?, type = ?, plaintext_pending = NULL WHERE id = ?;",
                [textToSend, typeToSend, item.id]
              );
            } catch (persistErr) {
              console.warn(`[SyncManager] Не удалось персистировать шифротекст в outbox_queue для ${item.id}:`, persistErr);
            }
          }

          // Fail-Closed (§12.5): строгий финальный барьер — незашифрованный текст никогда не покидает клиент в E2EE-чате
          if (!isChannel && rawText !== "[service_session_reset]" && !isE2EEMessage(textToSend)) {
            console.error(`[SyncManager] Fail-Closed §12.5: открытый текст заблокирован от отправки в E2EE-чат ${item.chatId}`);
            throw new Error(`Fail-Closed §12.5: plaintext message blocked from sending to E2EE chat ${item.chatId}`);
          }

          // 3. Отправка на сервер
          const result = await tdlib.send("send_message", {
            chatId: item.chatId,
            text: textToSend,
            type: typeToSend,
            mediaUrl: mediaUrlToSend,
            peaks: peaksToSend,
            replyToMessageId: item.replyToMessageId || undefined,
            idempotencyKey: item.id
          });

          if (result && (result.messageId || result.message_id)) {
            const serverMsgId = result.messageId || result.message_id;
            const pts = result.pts || (result.message_seq_id !== undefined ? result.message_seq_id + 1 : 0);
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // Предотвращение UNIQUE constraint failed: проверяем, существует ли уже сообщение с serverMsgId в БД
            const existing = await storageManager.query("SELECT id FROM messages WHERE id = ? LIMIT 1;", [serverMsgId]);
            if (existing.length > 0) {
              console.warn(`[SyncManager] Сообщение с serverMsgId=${serverMsgId} уже существует в БД (получено по WebSocket). Переносим открытый текст из временного сообщения.`);
              const tempMsgRows = await storageManager.query<{
                text: string;
                type: string;
                mediaUrl: string | null;
                peaks: string | null;
                mediaKey: string | null;
                mediaIv: string | null;
              }>(
                "SELECT text, type, mediaUrl, peaks, mediaKey, mediaIv FROM messages WHERE id = ? LIMIT 1;",
                [item.id]
              );

              if (tempMsgRows.length > 0) {
                const tempMsg = tempMsgRows[0];
                const finalMediaUrl = uploadedMediaUrl || tempMsg.mediaUrl || null;
                const finalMediaKey = encryptionKeys.key || tempMsg.mediaKey || null;
                const finalMediaIv = encryptionKeys.iv || tempMsg.mediaIv || null;
                await storageManager.transaction([
                  {
                    sql: `UPDATE messages SET text = ?, type = ?, mediaUrl = COALESCE(?, mediaUrl), peaks = COALESCE(?, peaks), mediaKey = COALESCE(?, mediaKey), mediaIv = COALESCE(?, mediaIv), status = CASE WHEN status = 'read' THEN 'read' ELSE 'sent' END, pts = ? WHERE id = ?;`,
                    params: [tempMsg.text, tempMsg.type, finalMediaUrl, tempMsg.peaks, finalMediaKey, finalMediaIv, pts, serverMsgId]
                  },
                  {
                    sql: `DELETE FROM messages WHERE id = ?;`,
                    params: [item.id]
                  },
                  {
                    sql: `DELETE FROM outbox_queue WHERE id = ?;`,
                    params: [item.id]
                  }
                ]);

                // Триггерим апдейт с открытым текстом для мгновенного обновления в UI
                this.triggerUpdate("message", {
                  chatId: item.chatId,
                  message: {
                    id: serverMsgId,
                    sender: 'me',
                    senderName: 'Я',
                    text: tempMsg.text,
                    time: time,
                    pts: pts,
                    timestamp: Date.now(),
                    type: tempMsg.type,
                    mediaUrl: finalMediaUrl || undefined,
                    mediaKey: finalMediaKey || undefined,
                    mediaIv: finalMediaIv || undefined,
                    peaks: safeParsePeaks(tempMsg.peaks),
                    status: 'sent'
                  }
                });
              } else {
                await storageManager.transaction([
                  {
                    sql: `DELETE FROM outbox_queue WHERE id = ?;`,
                    params: [item.id]
                  }
                ]);
              }
            } else {
              // Сообщения с serverMsgId еще нет в БД, обновляем временное, сохраняя реальный uploadedMediaUrl и ключи шифрования
              await storageManager.transaction([
                {
                  sql: `UPDATE messages SET id = ?, pts = ?, time = ?, status = CASE WHEN status = 'read' THEN 'read' ELSE 'sent' END, mediaUrl = COALESCE(?, mediaUrl), mediaKey = COALESCE(?, mediaKey), mediaIv = COALESCE(?, mediaIv) WHERE id = ?;`,
                  params: [serverMsgId, pts, time, uploadedMediaUrl, encryptionKeys.key || null, encryptionKeys.iv || null, item.id]
                },
                {
                  sql: `DELETE FROM outbox_queue WHERE id = ?;`,
                  params: [item.id]
                }
              ]);
            }

            await outboxMediaStore.deleteMedia(item.id);

            // Взаимное исключение каналов (HTMA / RFC-2026-004 § 4.4 / F9):
            // Удаляем доставленное через облако сообщение из очереди Mesh, чтобы исключить повторный сброс в /api/v1/mesh/relay
            try {
              await offlineMeshManager.removeEnvelope(item.id);
              if (serverMsgId && serverMsgId !== item.id) {
                await offlineMeshManager.removeEnvelope(serverMsgId);
              }
            } catch (meshErr) {
              console.warn(`[SyncManager] Ошибка удаления конверта ${item.id} из Mesh:`, meshErr);
            }

            if (pts > 0) {
              this.setPts(item.chatId, pts);
            }

            if (rawText === '[service_session_reset]' || item.text === '[service_session_reset]') {
              this.lastResetSentMap.set(item.chatId, Date.now());
              try {
                await storageManager.execute("DELETE FROM messages WHERE id = ? OR id = ?;", [item.id, serverMsgId]);
              } catch (_) {}
              console.log(`[SyncManager] Служебное сообщение сброса сессии отправлено (server_id=${serverMsgId}, chatId=${item.chatId})`);
            } else {
              console.log(`[SyncManager] Сообщение из Outbox отправлено: temp_id=${item.id} -> server_id=${serverMsgId}`);
              this.triggerUpdate("message_sent", {
                tempId: item.id,
                messageId: serverMsgId,
                chatId: item.chatId,
                pts,
                mediaUrl: uploadedMediaUrl || undefined,
                mediaKey: encryptionKeys.key || undefined,
                mediaIv: encryptionKeys.iv || undefined
              });
            }
          } else {
            throw new Error("Не удалось получить message_id от сервера");
          }
        } catch (err: any) {
          console.error(`[SyncManager] Ошибка отправки сообщения ${item.id} из Outbox:`, err);
          failedChatIds.add(item.chatId);

          const isRateLimitOrConflict = err?.status === 429 || err?.status === 409 ||
            (typeof err?.message === 'string' && (err.message.includes('429') || err.message.includes('409')));
          const nextRetryCount = isRateLimitOrConflict ? item.retryCount : (item.retryCount + 1);

          // Dead-letter: после 8 неудач перестаем вечно ретраить сломанное сообщение
          // (несуществующий чат / битая сессия) — раньше оно крутилось в очереди вечно
          if (!isRateLimitOrConflict && nextRetryCount > 8) {
            console.error(`[SyncManager] Сообщение ${item.id} переведено в статус failed после ${item.retryCount} неудачных попыток.`);
            await storageManager.execute(
              "UPDATE outbox_queue SET retryCount = ?, status = 'failed', nextRetryTime = ? WHERE id = ?;",
              [nextRetryCount, Date.now() + 24 * 60 * 60 * 1000, item.id]
            );
            this.triggerUpdate("message_send_failed", { tempId: item.id, chatId: item.chatId });
            continue;
          }

          const delay = isRateLimitOrConflict
            ? (5000 + Math.random() * 2000)
            : (Math.min(Math.pow(2, nextRetryCount) * 2000, 60000) + Math.random() * 1000);
          const nextRetryTime = Date.now() + delay;

          // Phase T5: Fallback отправка в мультитранспортный меш (LAN/BLE/LoRa) при сетевом сбое.
          // Однократно на элемент: при каждой ошибке ретрая дублировать конверт в радио-очередь нельзя.
          // CRP-004/SYN-003 (§12.5 Fail-Closed): если шифрование не удалось или полезная нагрузка
          // не зашифрована, открытый текст категорически блокируется от отправки в BLE/радиоэфир.
          if (item.retryCount === 0 && !offlineMeshManager.hasEnvelope(item.id)) {
            const isEncrypted = isE2EEMessage(item.text);
            if (isEncrypted) {
              const meshEnv: MeshEnvelope = {
                id: `env_${item.id}`,
                senderDeviceId: transportManager.getLocalDeviceId(),
                recipientTag: item.chatId,
                encryptedPayload: item.text || '',
                ttl: 7,
                hopCount: 0,
                timestamp: Date.now(),
                mediaUrl: item.mediaUrl || undefined,
                type: item.type || undefined,
              };
              void transportManager.send(meshEnv).catch(() => {});
            } else {
              console.warn(`[SyncManager] Mesh-fallback отменен для сообщения ${item.id}: полезная нагрузка не зашифрована (Fail-Closed §12.5).`);
            }
          }

          await storageManager.execute(
            "UPDATE outbox_queue SET retryCount = ?, nextRetryTime = ? WHERE id = ?;",
            [nextRetryCount, nextRetryTime, item.id]
          );

          // TX-3: Синхронизируем задержку для всех последующих ожидающих сообщений этого же чата,
          // чтобы они не обогнали текущее сбойное сообщение на следующем цикле очереди (сохранение порядка ns)
          await storageManager.execute(
            "UPDATE outbox_queue SET nextRetryTime = ? WHERE chatId = ? AND status IN ('pending', 'sending') AND nextRetryTime < ?;",
            [nextRetryTime, item.chatId, nextRetryTime]
          );
        }
      }
      return pending.length;
    } finally {
      this.isProcessingOutbox = false;
    }
  }

  /**
   * Дренирует outbox до опустошения (или защитного лимита 40 пачек),
   * вместо 5 элементов раз в 5 секунд: backlog из 100+ сообщений больше
   * не растягивается на минуты после возврата сети.
   */
  private async drainOutboxUntilEmpty() {
    for (let i = 0; i < 40; i++) {
      const processed = await this.processOutboxQueue();
      if (!processed || processed <= 0) break;
      // Микро-пауза между пачками: не душим сеть и даем UI дышать
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  public async enqueueOfflineMessage(
    chatId: string,
    text: string,
    type?: string,
    mediaUrl?: string | null,
    peaks?: number[] | null,
    replyToMessageId?: string,
    explicitTempId?: string,
    mediaKeys?: { key: string; iv: string } | null,
    displayPlaintext?: string,
    extraLocalFields?: Record<string, any>
  ): Promise<string>;
  public async enqueueOfflineMessage(
    chatId: string,
    text: string,
    typeOrReplyToId?: string,
    mediaUrlOrType?: string | null,
    peaksOrMediaUrl?: number[] | string | null,
    replyToIdOrPeaks?: string | number[] | null,
    explicitTempId?: string,
    mediaKeys?: { key: string; iv: string } | null,
    displayPlaintext?: string,
    extraLocalFields?: Record<string, any>
  ): Promise<string>;
  public async enqueueOfflineMessage(
    chatId: string,
    text: string,
    arg3?: any,
    arg4?: any,
    arg5?: any,
    arg6?: any,
    explicitTempId?: string,
    mediaKeys?: { key: string; iv: string } | null,
    displayPlaintext?: string,
    extraLocalFields?: Record<string, any>
  ): Promise<string> {
    let actualType: string = 'text';
    let actualMediaUrl: string | null = null;
    let actualPeaks: number[] | null = null;
    let actualReplyToMessageId: string | null = null;

    if (arg5 && Array.isArray(arg5)) {
      actualPeaks = arg5;
    } else if (arg6 && Array.isArray(arg6)) {
      actualPeaks = arg6;
    }

    const knownTypes = ['text', 'voice', 'video_note', 'file', 'photo', 'video', 'sticker', 'poll', 'service'];

    if (arg3 && knownTypes.includes(arg3)) {
      actualType = arg3;
      actualMediaUrl = arg4 || null;
      actualReplyToMessageId = arg6 || null;
    } else if (arg4 && knownTypes.includes(arg4)) {
      actualType = arg4;
      actualReplyToMessageId = arg3 || null;
      actualMediaUrl = arg5 && !Array.isArray(arg5) ? arg5 : null;
    } else if (arg3 && (arg3.startsWith('temp-') || /^[0-9a-f-]{36}$/i.test(arg3))) {
      actualReplyToMessageId = arg3;
      actualType = arg4 || 'text';
      actualMediaUrl = arg5 && !Array.isArray(arg5) ? arg5 : null;
    } else {
      actualType = arg3 || 'text';
      actualMediaUrl = arg4 || null;
      actualReplyToMessageId = arg6 || null;
    }

    const tempId = explicitTempId || (arg3 && typeof arg3 === 'string' && arg3.startsWith('temp-') ? arg3 : `temp-${Date.now()}`);
    const timestamp = Date.now();
    const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Персистентность бинарных данных (Milestone M2, R3.2)
    if (actualMediaUrl && actualMediaUrl.startsWith('blob:')) {
      try {
        const resp = await fetch(actualMediaUrl);
        if (resp.ok) {
          const blob = await resp.blob();
          const fileName = actualType === 'voice' ? 'voice.ogg' : actualType === 'video_note' ? 'video_note.webm' : 'media_file';
          await outboxMediaStore.saveMedia(tempId, blob, fileName, blob.type);
          actualMediaUrl = `local-media://${tempId}`;
        }
      } catch (blobErr) {
        console.warn(`[SyncManager] Не удалось сохранить blob в OutboxMediaStore для ${tempId}:`, blobErr);
      }
    }

    await ensurePlaintextPendingColumn();

    // Проверяем, является ли чат групповым или каналом (TX-1: безопасный дефолт)
    const chat = await storageManager.query<{ isGroup: number; type?: string }>("SELECT isGroup, type FROM chats WHERE id = ? LIMIT 1;", [chatId]);
    const isGroup = chat.length > 0 ? (chat[0].isGroup === 1 || chat[0].type === 'group') : false;
    let isChannel = !isGroup && chat.length > 0 && chat[0].type === 'channel';
    if (isChannel) {
      try {
        const existingSession = await getSession(chatId);
        if (existingSession) {
          isChannel = false;
        }
      } catch {}
    }

    // Подготовка CipherEnvelope для outbox_queue (Инвариант однократного шифрования F5)
    let encryptedTextForOutbox = text;
    let plaintextPending: string | null = null;
    const isLocalDeferredMedia = actualType !== 'text' && actualMediaUrl && (actualMediaUrl.startsWith('local-media://') || actualMediaUrl.startsWith('blob:'));

    if (isChannel) {
      // Публичный канал: открытый текст разрешен по дизайну
      encryptedTextForOutbox = text;
      plaintextPending = null;
    } else if (!isGroup) {
      if (text !== "[service_session_reset]") {
        if (isE2EEMessage(text)) {
          encryptedTextForOutbox = text;
          plaintextPending = null;
        } else if (isLocalDeferredMedia) {
          // Если медиафайл еще не выгружен на сервер (local-media://), откладываем шифрование
          // до момента uploadMediaIfNeeded в processOutboxQueue, чтобы внутри шифротекста был реальный серверный URL и ключи
          encryptedTextForOutbox = "[encrypted_pending]";
          plaintextPending = text;
        } else {
          try {
            const peerObj = offlineMeshManager.getPeer(chatId);
            const offlineBundle = peerObj?.prekeyBundle || null;
            const preferOffline = tdlib.isOffline();
            if (actualType !== 'text') {
              const mediaPayload = JSON.stringify({
                text,
                type: actualType,
                mediaUrl: actualMediaUrl,
                peaks: actualPeaks,
                key: mediaKeys?.key,
                iv: mediaKeys?.iv
              });
              encryptedTextForOutbox = await encryptMessage(chatId, mediaPayload, { offlineBundle, preferOffline });
            } else {
              encryptedTextForOutbox = await encryptMessage(chatId, text, { offlineBundle, preferOffline });
            }
            plaintextPending = null;
          } catch (cryptErr) {
            console.warn(`[SyncManager] Предварительное E2EE шифрование для outbox (${chatId}) отложено до выхода в онлайн:`, cryptErr);
            // TX-2: Для E2EE-чатов сохраняем исходный текст в plaintext_pending, предотвращая утечку открытого текста в outbox.text
            encryptedTextForOutbox = "[encrypted_pending]";
            plaintextPending = text;
          }
        }
      }
    } else {
      // Групповой чат (MLS E2EE)
      if (!text.startsWith("mls_commit:")) {
        if (isE2EEMessage(text)) {
          encryptedTextForOutbox = text;
          plaintextPending = null;
        } else if (isLocalDeferredMedia) {
          encryptedTextForOutbox = "[encrypted_pending]";
          plaintextPending = text;
        } else {
          try {
            let session = this.getMlsSession(chatId);
            if (!session) {
              session = await this.initMlsSessionFromWelcomePackage(chatId);
            }
            if (session) {
              if (actualType !== 'text') {
                const mediaPayload = JSON.stringify({
                  text,
                  type: actualType,
                  mediaUrl: actualMediaUrl,
                  peaks: actualPeaks,
                  key: mediaKeys?.key,
                  iv: mediaKeys?.iv
                });
                const encResult = await session.encryptMessage(mediaPayload);
                encryptedTextForOutbox = JSON.stringify({
                  ciphertextHex: encResult.ciphertextHex,
                  mlsCiphertextHex: encResult.ciphertextHex,
                  ivHex: encResult.ivHex,
                  epochNumber: encResult.epochNumber
                });
              } else {
                const encResult = await session.encryptMessage(text);
                encryptedTextForOutbox = JSON.stringify({
                  ciphertextHex: encResult.ciphertextHex,
                  mlsCiphertextHex: encResult.ciphertextHex,
                  ivHex: encResult.ivHex,
                  epochNumber: encResult.epochNumber
                });
              }
              plaintextPending = null;
            } else {
              encryptedTextForOutbox = "[encrypted_pending]";
              plaintextPending = text;
            }
          } catch (mlsErr) {
            console.warn(`[SyncManager] Предварительное MLS шифрование для outbox (${chatId}) отложено:`, mlsErr);
            encryptedTextForOutbox = "[encrypted_pending]";
            plaintextPending = text;
          }
        }
      }
    }

    const localMsgText = displayPlaintext !== undefined ? displayPlaintext : text;
    const localMsg = markLocallyDecrypted({
      id: tempId,
      sender: 'me',
      senderName: 'Я',
      text: localMsgText,
      time,
      pts: 0,
      timestamp,
      type: actualType,
      mediaUrl: actualMediaUrl,
      peaks: actualPeaks,
      replyToMessageId: actualReplyToMessageId,
      forwardFromUser: null,
      ...(extraLocalFields || {})
    });

    await this.saveMessageToDb(chatId, localMsg, 'pending');

    let initialRetryTime = Date.now();
    try {
      const existingRetry = await storageManager.query<{ maxRetryTime: number }>(
        "SELECT MAX(nextRetryTime) as maxRetryTime FROM outbox_queue WHERE chatId = ? AND status IN ('pending', 'sending');",
        [chatId]
      );
      if (existingRetry.length > 0 && existingRetry[0].maxRetryTime && existingRetry[0].maxRetryTime > initialRetryTime) {
        initialRetryTime = existingRetry[0].maxRetryTime;
      }
    } catch {}

    await storageManager.execute(
      `INSERT INTO outbox_queue (id, chatId, text, type, mediaUrl, peaks, replyToMessageId, timestamp, status, retryCount, nextRetryTime, mediaKey, mediaIv, plaintext_pending)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?, ?);`,
      [
        tempId,
        chatId,
        encryptedTextForOutbox,
        actualType,
        actualMediaUrl,
        actualPeaks ? JSON.stringify(actualPeaks) : null,
        actualReplyToMessageId,
        timestamp,
        initialRetryTime,
        mediaKeys?.key || null,
        mediaKeys?.iv || null,
        plaintextPending
      ]
    );

    this.triggerUpdate("message", {
      chatId,
      message: localMsg,
      temp: true
    });

    console.log(`[SyncManager] Добавлено в оффлайн-очередь: ${tempId}`);

    setTimeout(() => {
      this.processOutboxQueue().catch(err => {
        console.error("[SyncManager] Ошибка при автоматическом запуске processOutboxQueue:", err);
      });
    }, 0);

    return tempId;
  }

  // Метод ленивой загрузки старых сообщений (Lazy loading) с логикой DB-first
  public async loadHistoryLazy(chatId: string, offsetPts: number, limit: number = 20): Promise<any> {
    console.log(`[SyncManager] Ленивая загрузка истории для чата ${chatId} с offsetPts=${offsetPts}, limit=${limit}`);
    try {
      // 1. Пытаемся прочитать сообщения из локальной БД (включая mediaKey и mediaIv для расшифровки фото/видео/аудио)
      const localMessages = await storageManager.query(
        `SELECT id, chatId, sender, senderName, text, time, pts, timestamp, type, mediaUrl, peaks, replyToMessageId, forwardFromUser, mediaKey, mediaIv, raw_encrypted 
         FROM messages 
         WHERE chatId = ? AND pts < ? 
         ORDER BY pts DESC 
         LIMIT ?;`,
        [chatId, offsetPts, limit]
      );
      console.log(`[SyncManager] Из БД прочитано ${localMessages.length} сообщений.`);

      const myUserId = localStorage.getItem('current_user_id') || localStorage.getItem('my_user_id');
      const myUsername = localStorage.getItem('username');

      // Проверяем, нет ли среди локальных сообщений зашифрованных, и пробуем расшифровать их на лету
      for (let i = 0; i < localMessages.length; i++) {
        let m = localMessages[i];
        if (m) {
          const rawLocalSender = m.sender || 'other';
          if (rawLocalSender === 'me' || (myUserId && rawLocalSender === myUserId) || (myUsername && rawLocalSender === myUsername)) {
            m.sender = 'me';
          }
        }
        if (m && m.text && isE2EEMessage(m.text)) {
          console.log(`[SyncManager] Обнаружено зашифрованное сообщение в локальной истории: id=${m.id}. Пробуем расшифровать...`);
          const originalText = m.text;
          try {
            m = await decryptMessageIfNeeded(chatId, m, true);
            if (m.text !== originalText && !isE2EEMessage(m.text)) {
              console.log(`[SyncManager] Успешно расшифровано сообщение id=${m.id} из локальной истории!`);
              
              // Обновляем элемент в массиве
              localMessages[i] = m;
              
              // Сохраняем расшифрованный текст в БД
              await storageManager.execute(
                `UPDATE messages SET text = ?, type = ?, mediaUrl = ?, peaks = ?, mediaKey = ?, mediaIv = ? WHERE id = ?;`,
                [
                  m.text, 
                  m.type || 'text', 
                  m.mediaUrl || null, 
                  m.peaks ? (typeof m.peaks === 'string' ? m.peaks : JSON.stringify(m.peaks)) : null,
                  m.mediaKey || null,
                  m.mediaIv || null,
                  m.id
                ]
              );
            }
          } catch (decErr) {
            console.warn(`[SyncManager] Не удалось расшифровать сообщение id=${m.id} из локальной истории:`, decErr);
          }
        }
      }

      // Если в БД достаточно сообщений, возвращаем их
      if (localMessages.length >= limit) {
        return {
          messages: localMessages,
          pts: offsetPts
        };
      }

      // 2. Иначе запрашиваем недостающие сообщения из TDLib
      const response = await tdlib.send("get_history", {
        chatId,
        offsetPts,
        limit
      });

      if (response && response.pts) {
        this.setPts(chatId, response.pts);
      }

      if (response && response.messages && response.messages.length > 0) {
        console.log(`[SyncManager] Получено ${response.messages.length} сообщений от TDLib. Кэшируем в БД.`);
        
        for (let i = 0; i < response.messages.length; i++) {
           response.messages[i] = await decryptMessageIfNeeded(chatId, response.messages[i], true);
        }
        const filteredNetworkMessages = response.messages.filter((m: any) => !m.isService);
        
        // Кэшируем полученные сообщения в БД (FA-5: защищенный UPSERT с сохранением raw_encrypted/mediaKey/mediaIv/status/expires_at)
        const statements = filteredNetworkMessages.map((m: any) => {
          const pts = m.pts || 0;
          const text = m.text || '';
          const time = m.time || new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const rawSender = m.sender || 'other';
          const isMe = rawSender === 'me' || (myUserId && rawSender === myUserId) || (myUsername && rawSender === myUsername);
          const sender = isMe ? 'me' : rawSender;
          m.sender = sender;
          const senderName = resolveSenderDisplayName(sender, m.senderName);
          const timestamp = m.timestamp || Date.now();
          const type = m.type || 'text';
          const mediaUrl = m.mediaUrl || null;
          const peaks = m.peaks ? (typeof m.peaks === 'string' ? m.peaks : JSON.stringify(m.peaks)) : null;
          const replyToMessageId = m.replyToMessageId || null;
          const forwardFromUser = m.forwardFromUser || null;
          const status = m.status || 'sent';
          const mediaKey = m.mediaKey || null;
          const mediaIv = m.mediaIv || null;
          const topicId = m.topic_id ?? null;
          const rawEncrypted = m.raw_encrypted || m.rawEncryptedPayload || null;
          const expiresAt = m.expires_at || 0;

          return {
            sql: `INSERT INTO messages (id, chatId, sender, senderName, text, time, pts, timestamp, type, mediaUrl, peaks, replyToMessageId, forwardFromUser, status, mediaKey, mediaIv, topic_id, raw_encrypted, expires_at) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT(id) DO UPDATE SET 
                    sender = excluded.sender,
                    senderName = excluded.senderName,
                    text = CASE WHEN (messages.text NOT LIKE '🔒%' AND excluded.text LIKE '🔒%') THEN messages.text ELSE excluded.text END,
                    time = excluded.time,
                    pts = excluded.pts,
                    timestamp = excluded.timestamp,
                    type = CASE WHEN (messages.type IS NOT NULL AND messages.type <> 'text' AND (excluded.type IS NULL OR excluded.type = 'text')) THEN messages.type ELSE excluded.type END,
                    mediaUrl = COALESCE(excluded.mediaUrl, messages.mediaUrl),
                    peaks = COALESCE(excluded.peaks, messages.peaks),
                    replyToMessageId = COALESCE(excluded.replyToMessageId, messages.replyToMessageId),
                    forwardFromUser = COALESCE(excluded.forwardFromUser, messages.forwardFromUser),
                    status = CASE WHEN messages.status = 'read' THEN 'read' ELSE COALESCE(messages.status, excluded.status) END,
                    mediaKey = COALESCE(messages.mediaKey, excluded.mediaKey),
                    mediaIv = COALESCE(messages.mediaIv, excluded.mediaIv),
                    topic_id = COALESCE(excluded.topic_id, messages.topic_id),
                    raw_encrypted = COALESCE(messages.raw_encrypted, excluded.raw_encrypted),
                    expires_at = CASE WHEN messages.expires_at > 0 THEN messages.expires_at ELSE excluded.expires_at END;`,
            params: [m.id, chatId, sender, senderName, text, time, pts, timestamp, type, mediaUrl, peaks, replyToMessageId, forwardFromUser, status, mediaKey, mediaIv, topicId, rawEncrypted, expiresAt]
          };
        });

        statements.unshift({
          sql: "INSERT OR IGNORE INTO chats (id, name, avatar, lastMessage, time, unread, isGroup, online, pts) VALUES (?, ?, '👤', '', '', 0, 0, 0, 0)",
          params: [chatId, 'Чат']
        });

        await storageManager.transaction(statements);

        // Объединяем локальные и сетевые сообщения (приоритет у уже расшифрованных локальных данных и ключей медиа)
        const allMessagesMap = new Map<string, any>();
        localMessages.forEach(m => {
          allMessagesMap.set(m.id, {
            ...m,
            type: m.type || 'text',
            mediaUrl: m.mediaUrl || undefined,
            mediaKey: m.mediaKey || undefined,
            mediaIv: m.mediaIv || undefined,
            peaks: safeParsePeaks(m.peaks)
          });
        });
        filteredNetworkMessages.forEach((m: any) => {
          const existingLocal = allMessagesMap.get(m.id);
          const sender = m.sender || existingLocal?.sender || 'other';
          const senderName = resolveSenderDisplayName(sender, m.senderName || existingLocal?.senderName);
          const keepLocalText =
            existingLocal &&
            existingLocal.text &&
            !existingLocal.text.startsWith('🔒') &&
            (!m.text || m.text.startsWith('🔒') || isE2EEMessage(m.text));
          allMessagesMap.set(m.id, {
            id: m.id,
            chatId,
            sender,
            senderName,
            text: keepLocalText ? existingLocal.text : m.text,
            time: m.time || existingLocal?.time || new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            pts: m.pts || existingLocal?.pts,
            timestamp: m.timestamp || existingLocal?.timestamp || Date.now(),
            type: (existingLocal?.type && existingLocal.type !== 'text' && (!m.type || m.type === 'text')) ? existingLocal.type : (m.type || existingLocal?.type || 'text'),
            mediaUrl: m.mediaUrl || existingLocal?.mediaUrl || undefined,
            mediaKey: m.mediaKey || existingLocal?.mediaKey || undefined,
            mediaIv: m.mediaIv || existingLocal?.mediaIv || undefined,
            peaks: safeParsePeaks(m.peaks) || existingLocal?.peaks || undefined,
            replyToMessageId: m.replyToMessageId || existingLocal?.replyToMessageId || undefined,
            forwardFromUser: m.forwardFromUser || existingLocal?.forwardFromUser || undefined
          });
        });

        const combinedMessages = Array.from(allMessagesMap.values())
          .sort((a, b) => b.pts - a.pts) // От новых к старым (как в API)
          .slice(0, limit);

        return {
          messages: combinedMessages,
          pts: offsetPts
        };
      }

      return {
        messages: localMessages,
        pts: offsetPts
      };
    } catch (e) {
      console.error(`[SyncManager] Ошибка ленивой загрузки истории:`, e);
      return { messages: [], pts: offsetPts };
    }
  }

  /**
   * Загрузка ОКНА сообщений вокруг заданного pts — для прыжка к совпадению поиска (M1.3).
   *
   * В отличие от loadHistoryLazy (грузит только старше offsetPts), этот метод грузит
   * pts BETWEEN targetPts-window/2 AND targetPts+window/2 — контекст с обеих сторон.
   * Только локальное чтение (без TDLib): прыжок работает по уже сохранённой истории.
   * Переиспользует E2EE-расшифровку on-demand (как loadHistoryLazy:1788-1819).
   *
   * @returns массив сообщений (не отсортирован — сортирует вызывающий)
   */
  public async loadHistoryAround(
    chatId: string,
    targetPts: number,
    windowSize: number = 20
  ): Promise<any[]> {
    const half = Math.floor(windowSize / 2);
    console.log(`[SyncManager] loadHistoryAround: chatId=${chatId}, targetPts=${targetPts}, window=${windowSize}`);
    try {
      const localMessages = await storageManager.query(
        `SELECT id, chatId, sender, senderName, text, time, pts, timestamp, type, mediaUrl, peaks, replyToMessageId, forwardFromUser, mediaKey, mediaIv, raw_encrypted
         FROM messages
         WHERE chatId = ? AND pts BETWEEN ? AND ?
         ORDER BY pts ASC;`,
        [chatId, targetPts - half, targetPts + half]
      );
      console.log(`[SyncManager] loadHistoryAround: из БД прочитано ${localMessages.length} сообщений.`);

      // E2EE-расшифровка on-demand (переиспользуем ту же логику, что loadHistoryLazy)
      for (let i = 0; i < localMessages.length; i++) {
        let m = localMessages[i];
        if (m && m.text && isE2EEMessage(m.text)) {
          const originalText = m.text;
          try {
            m = await decryptMessageIfNeeded(chatId, m, true);
            if (m.text !== originalText && !isE2EEMessage(m.text)) {
              localMessages[i] = m;
              await storageManager.execute(
                `UPDATE messages SET text = ?, type = ?, mediaUrl = ?, peaks = ?, mediaKey = ?, mediaIv = ? WHERE id = ?;`,
                [
                  m.text,
                  m.type || 'text',
                  m.mediaUrl || null,
                  m.peaks ? (typeof m.peaks === 'string' ? m.peaks : JSON.stringify(m.peaks)) : null,
                  m.mediaKey || null,
                  m.mediaIv || null,
                  m.id,
                ]
              );
            }
          } catch (decErr) {
            console.warn(`[SyncManager] loadHistoryAround: не удалось расшифровать id=${m.id}:`, decErr);
          }
        }
      }

      return localMessages;
    } catch (e) {
      console.error(`[SyncManager] loadHistoryAround error:`, e);
      return [];
    }
  }



  // Отправка индикатора набора текста ("печатает...") в чат.
  // Best-effort: ошибки глотаются (typing — некритичная фича).
  // Вызывающий должен обеспечивать debounce (см. App.tsx textarea onChange).
  public async sendTyping(chatId: string): Promise<void> {
    try {
      await tdlib.send("typing", { chatId });
    } catch (e) {
      // Silent fail: typing — best-effort, не ломаем UX при сбое.
    }
  }

  // ===== R3 (M3.1): TTL sweeper — детерминированное локальное удаление =====

  private ttlSweeperTimer: ReturnType<typeof setInterval> | null = null;

  public startTtlSweeper(): void {
    if (this.ttlSweeperTimer) return;
    this.ttlSweeperTimer = setInterval(() => {
      this.sweepExpiredMessages().catch((e) => {
        console.warn("[SyncManager] TTL sweeper error:", e);
      });
      // Гигиена таблицы дедупликации mesh-пакетов: без очистки она растет бесконечно
      storageManager.execute(
        "DELETE FROM mesh_processed_packets WHERE received_at < ?;",
        [Date.now() - 7 * 24 * 60 * 60 * 1000]
      ).catch((e) => {
        console.warn("[SyncManager] mesh_processed_packets purge error (таблица может отсутствовать):", e);
      });
    }, 30000);
    if (typeof this.ttlSweeperTimer.unref === 'function') {
      this.ttlSweeperTimer.unref();
    }
  }

  public stopTtlSweeper(): void {
    if (this.ttlSweeperTimer) {
      clearInterval(this.ttlSweeperTimer);
      this.ttlSweeperTimer = null;
    }
  }

  /**
   * Удаляет истёкшие TTL-сообщения локально (без сети — приватность не зависит
   * от сервера). Инвариант No-Self-Destruct (§12.3): удаление строго по
   * expires_at <= now; ошибки расшифровки тут ни при чём.
   */
  public async sweepExpiredMessages(): Promise<number> {
    const expired = await storageManager.getExpiredMessages(Date.now());
    if (expired.length === 0) return 0;
    const byChat = new Map<string, string[]>();
    for (const row of expired) {
      const list = byChat.get(row.chatId) || [];
      list.push(row.id);
      byChat.set(row.chatId, list);
    }
    await storageManager.deleteExpiredMessages(expired.map((r) => r.id));
    for (const [chatId, ids] of byChat) {
      this.triggerUpdate("message_ttl_expired", { chatId, messageIds: ids });
    }
    return expired.length;
  }

  // ===== R3 (M2.5): отложенные сообщения (Single-Encryption) =====

  /**
   * Планирует отложенное сообщение: шифрует РОВНО ОДИН РАЗ текущей сессией
   * (инвариант §13.1) и отправляет готовый CipherEnvelope на POST /messages/schedule.
   * Сервер хранит шифротекст и доставляет по расписанию без перешифрования.
   */
  public async scheduleMessage(
    chatId: string,
    text: string,
    deliverAtMs: number,
    opts: { isGroup?: boolean; isChannel?: boolean; topicId?: number | null; ttlSeconds?: number } = {}
  ): Promise<{ message_id: string }> {
    let cipherPayload = text;

    if (opts.isChannel) {
      // Публичный канал: открытый JSON payload v3
      cipherPayload = JSON.stringify({
        text,
        type: 'text',
        ...(opts.topicId ? { topic_id: opts.topicId } : {}),
        ...(opts.ttlSeconds ? { ttlSeconds: opts.ttlSeconds } : {}),
      });
    } else if (opts.isGroup) {
      let session = this.getMlsSession(chatId);
      if (!session) {
        session = await this.initMlsSessionFromWelcomePackage(chatId);
      }
      if (!session) {
        throw new Error("MLS-сессия недоступна: невозможно зашифровать отложенное сообщение (Fail-Closed)");
      }
      const payloadToEncrypt = JSON.stringify({
        text,
        ...(opts.topicId ? { topic_id: opts.topicId } : {}),
        ...(opts.ttlSeconds ? { ttlSeconds: opts.ttlSeconds } : {}),
      });
      const enc = await session.encryptMessage(payloadToEncrypt);
      cipherPayload = JSON.stringify({
        ciphertextHex: enc.ciphertextHex,
        mlsCiphertextHex: enc.ciphertextHex,
        ivHex: enc.ivHex,
        epochNumber: enc.epochNumber,
      });
    } else {
      const { encryptMessage } = await import('./crypto/e2ee');
      const payloadToEncrypt = opts.ttlSeconds
        ? JSON.stringify({ text, ttlSeconds: opts.ttlSeconds })
        : text;
      cipherPayload = await encryptMessage(chatId, payloadToEncrypt);
    }

    const senderId = localStorage.getItem('current_user_id') || localStorage.getItem('my_user_id') || '';
    const resp = await fetch(`${this.getRestBase()}/api/v1/messages/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        sender_id: senderId,
        sender_name: localStorage.getItem('username') || undefined,
        content: cipherPayload,
        deliver_at: new Date(deliverAtMs).toISOString(),
        ...(opts.topicId ? { topic_id: opts.topicId } : {}),
      }),
    });
    if (!resp.ok) {
      const detail = await resp.json().catch(() => ({}));
      throw new Error(detail.detail || `Schedule failed: HTTP ${resp.status}`);
    }
    const data = await resp.json();

    // Локальное зеркало для списка «Отложенные» (мультидевайс правду тянет REST-ом)
    await storageManager.saveScheduledMessage({
      id: data.message_id,
      chat_id: chatId,
      text,
      type: 'text',
      deliver_at: deliverAtMs,
      status: 'pending',
    });
    return data;
  }

  public async cancelScheduledMessage(messageId: string): Promise<void> {
    const resp = await fetch(`${this.getRestBase()}/api/v1/messages/scheduled/${messageId}`, {
      method: 'DELETE',
    });
    if (!resp.ok && resp.status !== 404) {
      throw new Error(`Cancel scheduled failed: HTTP ${resp.status}`);
    }
    await storageManager.updateScheduledMessageStatus(messageId, 'cancelled');
  }

  /** Базовый URL REST API (тот же origin, что и веб-приложение). */
  private getRestBase(): string {
    if (typeof window !== 'undefined' && window.location && window.location.origin && !window.location.origin.startsWith('file:') && !window.location.origin.startsWith('capacitor')) {
      return window.location.origin;
    }
    return 'https://skuf-net.ru';
  }

  // Подписка на события синхронизации
  public onSyncFinished(callback: () => void) {
    this.syncListeners.add(callback);
  }

  public offSyncFinished(callback: () => void) {
    this.syncListeners.delete(callback);
  }

  private notifySyncFinished() {
    this.syncListeners.forEach((cb) => cb());
  }

  // ===== Typing indicator =====

  /** Список userId, печатающих сейчас в данном чате. */
  public getTypingUsers(chatId: string): string[] {
    const users = this.typingByChat.get(chatId);
    return users ? Array.from(users.keys()) : [];
  }

  /** Добавить печатающего пользователя в чат (с запуском/сбросом 5с таймера). */
  private _addTypingUser(chatId: string, userId: string) {
    let users = this.typingByChat.get(chatId);
    if (!users) {
      users = new Map();
      this.typingByChat.set(chatId, users);
    }
    // Сбросить предыдущий таймер, если был (продление активности).
    const prevTimer = users.get(userId);
    if (prevTimer) clearTimeout(prevTimer);
    const timer = setTimeout(() => {
      // Клиентский таймер безопасности: убрать пользователя, если за 5с
      // не пришло новое событие typing (страховка от потерянных isTyping:false).
      const cur = this.typingByChat.get(chatId);
      if (cur) {
        cur.delete(userId);
        if (cur.size === 0) this.typingByChat.delete(chatId);
        this.triggerUpdate("typing_state_changed", chatId);
      }
    }, 5000);
    users.set(userId, timer);
  }

  /** Убрать печатающего пользователя из чата (с очисткой таймера). */
  private _removeTypingUser(chatId: string, userId: string) {
    const users = this.typingByChat.get(chatId);
    if (!users) return;
    const timer = users.get(userId);
    if (timer) clearTimeout(timer);
    users.delete(userId);
    if (users.size === 0) this.typingByChat.delete(chatId);
  }

  // Подписка на обновления SyncManager
  public on(event: string, callback: (data: any) => void) {
    if (!this.updateListeners.has(event)) {
      this.updateListeners.set(event, new Set());
    }
    this.updateListeners.get(event)!.add(callback);
  }

  public off(event: string, callback: (data: any) => void) {
    const listeners = this.updateListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private triggerUpdate(event: string, data: any) {
    const listeners = this.updateListeners.get(event);
    if (listeners) {
      listeners.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`[SyncManager] Ошибка обработчика события ${event}:`, e);
        }
      });
    }
  }

  /**
   * TW3 / UX-1: Сброс счетчиков ретрая и немедленный повтор отправки сообщения из outbox_queue
   */
  public async retryOutboxMessage(id: string): Promise<boolean> {
    try {
      const rows = await storageManager.query<{ id: string }>(
        "SELECT id FROM outbox_queue WHERE id = ? LIMIT 1;",
        [id]
      );
      if (rows && rows.length > 0) {
        await storageManager.execute(
          "UPDATE outbox_queue SET status = 'pending', retryCount = 0, nextRetryTime = ? WHERE id = ?;",
          [0, id]
        );
        this.processOutboxQueue().catch(err => {
          console.warn('[SyncManager] Ошибка немедленного ретрая очереди outbox:', err);
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error(`[SyncManager] Ошибка retryOutboxMessage для ${id}:`, e);
      return false;
    }
  }
}

export const syncManager = SyncManager.getInstance();

