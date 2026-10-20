// frontend/src/core/storage/migrations/index.ts

export interface Migration {
  version: number;
  up: string[];
}

export const migrations: Migration[] = [
  {
    version: 1,
    up: [
      `CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT,
        lastMessage TEXT,
        time TEXT,
        unread INTEGER DEFAULT 0,
        isGroup INTEGER DEFAULT 0,
        online INTEGER DEFAULT 0,
        pts INTEGER DEFAULT 0
      );`,
      `CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chatId TEXT NOT NULL,
        sender TEXT NOT NULL,
        senderName TEXT,
        text TEXT NOT NULL,
        time TEXT NOT NULL,
        pts INTEGER,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT,
        online INTEGER DEFAULT 0
      );`,
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );`
    ]
  },
  {
    version: 2,
    up: [
      `CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
        id,
        chatId,
        text,
        content='messages',
        content_rowid='rowid'
      );`,
      `CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
        INSERT INTO messages_fts(rowid, id, chatId, text) VALUES (new.rowid, new.id, new.chatId, new.text);
      END;`,
      `CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
        INSERT INTO messages_fts(messages_fts, rowid, id, chatId, text) VALUES('delete', old.rowid, old.id, old.chatId, old.text);
      END;`,
      `CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
        INSERT INTO messages_fts(messages_fts, rowid, id, chatId, text) VALUES('delete', old.rowid, old.id, old.chatId, old.text);
        INSERT INTO messages_fts(rowid, id, chatId, text) VALUES (new.rowid, new.id, new.chatId, new.text);
      END;`
    ]
  },
  {
    version: 3,
    up: [
      `ALTER TABLE messages ADD COLUMN type TEXT DEFAULT 'text';`,
      `ALTER TABLE messages ADD COLUMN mediaUrl TEXT;`,
      `ALTER TABLE messages ADD COLUMN peaks TEXT;`
    ]
  },
  {
    version: 4,
    up: [
      `ALTER TABLE messages ADD COLUMN replyToMessageId TEXT;`,
      `ALTER TABLE messages ADD COLUMN forwardFromUser TEXT;`
    ]
  },
  {
    version: 5,
    up: [
      `CREATE TABLE IF NOT EXISTS outbox_queue (
        id TEXT PRIMARY KEY,
        chatId TEXT NOT NULL,
        text TEXT NOT NULL,
        type TEXT DEFAULT 'text',
        mediaUrl TEXT,
        peaks TEXT,
        replyToMessageId TEXT,
        forwardFromUser TEXT,
        timestamp INTEGER NOT NULL,
        retryCount INTEGER DEFAULT 0,
        nextRetryTime INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending'
      );`
    ]
  },
  {
    version: 6,
    up: [
      `ALTER TABLE messages ADD COLUMN status TEXT DEFAULT 'sent';`
    ]
  },
  {
    version: 7,
    up: [
      `CREATE TABLE IF NOT EXISTS e2ee_sessions (
        user_id TEXT PRIMARY KEY,
        session_data TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS e2ee_keys (
        key_name TEXT PRIMARY KEY,
        key_value TEXT NOT NULL
      );`
    ]
  },
  {
    version: 8,
    up: [
      `ALTER TABLE messages ADD COLUMN mediaKey TEXT;`,
      `ALTER TABLE messages ADD COLUMN mediaIv TEXT;`,
      `ALTER TABLE outbox_queue ADD COLUMN mediaKey TEXT;`,
      `ALTER TABLE outbox_queue ADD COLUMN mediaIv TEXT;`
    ]
  },
  {
    version: 9,
    up: [
      `CREATE TABLE IF NOT EXISTS chat_folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT DEFAULT '📁'
      );`,
      `CREATE TABLE IF NOT EXISTS chat_folder_members (
        folderId TEXT NOT NULL,
        chatId TEXT NOT NULL,
        PRIMARY KEY (folderId, chatId),
        FOREIGN KEY (folderId) REFERENCES chat_folders(id) ON DELETE CASCADE,
        FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE CASCADE
      );`
    ]
  },
  {
    version: 10,
    up: [
      `ALTER TABLE chat_folders ADD COLUMN is_152fz_contour INTEGER DEFAULT 0;`,
      `ALTER TABLE chats ADD COLUMN is_152fz_contour INTEGER DEFAULT 0;`
    ]
  },
  {
    version: 11,
    up: [
      `CREATE INDEX IF NOT EXISTS idx_outbox_queue_retry_ts ON outbox_queue(nextRetryTime, timestamp);`
    ]
  },
  {
    version: 12,
    up: [
      `CREATE TABLE IF NOT EXISTS developer_bots (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        description TEXT,
        aboutText TEXT,
        avatarUrl TEXT,
        tokenMasked TEXT NOT NULL,
        scopes TEXT NOT NULL,
        isActive INTEGER DEFAULT 1,
        webhookUrl TEXT,
        webhookSecret TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );`,
      `ALTER TABLE messages ADD COLUMN reply_markup TEXT;`,
      `ALTER TABLE messages ADD COLUMN invoice_id TEXT;`,
      `ALTER TABLE messages ADD COLUMN transfer_receipt TEXT;`,
      `ALTER TABLE outbox_queue ADD COLUMN reply_markup TEXT;`
    ]
  },
  {
    version: 13,
    up: [
      `CREATE TABLE IF NOT EXISTS mesh_envelopes (
        envelope_id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        recipient_id TEXT NOT NULL,
        cipher_payload TEXT NOT NULL,
        ttl INTEGER NOT NULL DEFAULT 7,
        created_at INTEGER NOT NULL,
        dispatched_via_mesh INTEGER NOT NULL DEFAULT 0
      );`,
      `CREATE INDEX IF NOT EXISTS idx_mesh_envelopes_created ON mesh_envelopes(created_at);`,
      `CREATE TABLE IF NOT EXISTS mesh_processed_packets (
        packet_id TEXT PRIMARY KEY,
        received_at INTEGER NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_mesh_processed_packets_received ON mesh_processed_packets(received_at);`,
      `ALTER TABLE outbox_queue ADD COLUMN dispatched_via_mesh INTEGER DEFAULT 0;`
    ]
  },
  {
    // F-7: медиа-ключи переживают offline-очередь — при сбое отправки после загрузки
    // зашифрованного блоба ключи обязаны попасть в outbox, иначе ретрай зашифрует
    // mediaPayload уже без них и получатель не расшифрует медиа
    version: 14,
    up: [
      `ALTER TABLE outbox_queue ADD COLUMN mediaKey TEXT;`,
      `ALTER TABLE outbox_queue ADD COLUMN mediaIv TEXT;`
    ]
  },
  {
    // R1 & R2 (v1.8.0 - v1.9.0): Хранилище, каналы и опросы
    version: 15,
    up: [
      `CREATE TABLE IF NOT EXISTS chat_read_state (
        chat_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        last_read_pts INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (chat_id, user_id)
      );`,
      `CREATE INDEX IF NOT EXISTS idx_chat_read_state_chat ON chat_read_state(chat_id);`,
      `ALTER TABLE chats ADD COLUMN type TEXT DEFAULT 'dialog';`,
      `ALTER TABLE chats ADD COLUMN username TEXT;`,
      `ALTER TABLE chats ADD COLUMN description TEXT;`,
      `ALTER TABLE chats ADD COLUMN owner_user_id TEXT;`,
      `ALTER TABLE chats ADD COLUMN role TEXT DEFAULT 'member';`,
      `ALTER TABLE chats ADD COLUMN members_count INTEGER DEFAULT 1;`,
      `ALTER TABLE chats ADD COLUMN archived INTEGER DEFAULT 0;`,
      `ALTER TABLE chats ADD COLUMN muted INTEGER DEFAULT 0;`,
      `ALTER TABLE chats ADD COLUMN pinned_message_ids TEXT;`,
      `ALTER TABLE chats ADD COLUMN draft TEXT;`,
      `ALTER TABLE messages ADD COLUMN edited_at INTEGER;`,
      `ALTER TABLE messages ADD COLUMN poll_data TEXT;`
    ]
  },
  {
    // Release Train R5 (v2.2.0, M4.3): Форумы и топики в супергруппах
    version: 19,
    up: [
      `CREATE TABLE IF NOT EXISTS topics (
        topic_id INTEGER PRIMARY KEY,
        chat_id TEXT NOT NULL,
        title TEXT NOT NULL,
        icon_emoji TEXT DEFAULT '💬',
        icon_color TEXT DEFAULT '#3b82f6',
        is_closed INTEGER DEFAULT 0,
        pinned_message_id TEXT,
        last_message_id TEXT,
        unread_count INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT 0
      );`,
      `CREATE INDEX IF NOT EXISTS idx_topics_chat_id ON topics(chat_id);`,
      `ALTER TABLE messages ADD COLUMN topic_id INTEGER DEFAULT NULL;`,
      `ALTER TABLE outbox_queue ADD COLUMN topic_id INTEGER DEFAULT NULL;`
    ]
  },
  {
    // R3 (v2.0.0): Safety Numbers (verified_peers), TTL и отложенные сообщения
    version: 20,
    up: [
      `ALTER TABLE chats ADD COLUMN draft_updated_at INTEGER DEFAULT 0;`,
      `ALTER TABLE chats ADD COLUMN is_verified INTEGER DEFAULT 0;`,
      `ALTER TABLE chats ADD COLUMN verified_fingerprint TEXT;`,
      `ALTER TABLE chats ADD COLUMN default_ttl INTEGER DEFAULT 0;`,
      `ALTER TABLE messages ADD COLUMN ttl_seconds INTEGER DEFAULT 0;`,
      `ALTER TABLE messages ADD COLUMN expires_at INTEGER DEFAULT 0;`,
      `CREATE TABLE IF NOT EXISTS verified_peers (
        peer_id TEXT PRIMARY KEY,
        safety_number TEXT NOT NULL,
        verified_at INTEGER NOT NULL,
        method TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS scheduled_messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        text TEXT,
        type TEXT NOT NULL,
        media_url TEXT,
        deliver_at INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at INTEGER NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON messages(expires_at);`,
      `CREATE INDEX IF NOT EXISTS idx_scheduled_messages_deliver_at ON scheduled_messages(deliver_at);`
    ]
  },
  {
    // R4 (v2.1.0): кэш скачанных документов + FTS filename/caption
    version: 21,
    up: [
      `CREATE TABLE IF NOT EXISTS file_cache (
        file_id TEXT PRIMARY KEY,
        local_path TEXT,
        size INTEGER,
        mime_type TEXT,
        downloaded_at INTEGER
      );`,
      `CREATE INDEX IF NOT EXISTS idx_file_cache_downloaded_at ON file_cache(downloaded_at);`,
      `INSERT INTO messages_fts(messages_fts) VALUES('rebuild');`
    ]
  },
  {
    // Vector 2 (Phase T3): LoRa L2 Fragments storage for chunk reassembly
    version: 30,
    up: [
      `CREATE TABLE IF NOT EXISTS lora_fragments (
        envelope_crc32 INTEGER NOT NULL,
        seq INTEGER NOT NULL,
        total INTEGER NOT NULL,
        chunk_data BLOB NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (envelope_crc32, seq)
      );`,
      `CREATE INDEX IF NOT EXISTS idx_lora_fragments_created_at ON lora_fragments(created_at);`
    ]
  },
  {
    // R7 (stabilization): сохранение исходного шифротекста для повторной расшифровки
    // после позднего прихода ключей (раньше placeholder '🔒...' делал retry невозможным)
    version: 31,
    up: [
      `ALTER TABLE messages ADD COLUMN raw_encrypted TEXT;`
    ]
  },
  {
    // R8 (v2.2.13): Защита данных — колонка isService для исцеления служебных строк (FA-2)
    // и таблица mesh_processed_packets для старых устройств со стажем (FA-1).
    // Идемпотентно и безопасно на любой старой базе v1..v31.
    version: 32,
    up: [
      `CREATE TABLE IF NOT EXISTS mesh_processed_packets (
        packet_id TEXT PRIMARY KEY,
        received_at INTEGER NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_mesh_processed_packets_received ON mesh_processed_packets(received_at);`,
      `ALTER TABLE messages ADD COLUMN isService INTEGER DEFAULT 0;`
    ]
  },
];

