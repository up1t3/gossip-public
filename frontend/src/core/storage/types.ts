// frontend/src/core/storage/types.ts

export interface DBMessage {
  id: string;
  chatId: string;
  sender: 'me' | 'other' | string;
  senderName: string;
  text: string;
  time: string;
  pts?: number;
  timestamp: number;
  replyToMessageId?: string;
  forwardFromUser?: string;
  reply_markup?: string;
  invoice_id?: string;
  transfer_receipt?: string;
  topic_id?: number | null;
}

export interface DBTopic {
  topic_id: number;
  chat_id: string;
  title: string;
  icon_emoji?: string;
  icon_color?: string;
  is_closed?: number;
  pinned_message_id?: string;
  last_message_id?: string;
  unread_count?: number;
  created_at?: number;
}

export interface DBChat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  isGroup: boolean;
  online: boolean;
  pts?: number;
}

export interface DBUser {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
}

export interface DBSetting {
  key: string;
  value: string;
}

export interface DatabaseDriver {
  open(dbName: string, key: string): Promise<void>;
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<void>;
  transaction(statements: { sql: string; params?: any[] }[]): Promise<void>;
  close(): Promise<void>;
  sync?(): Promise<void>;
}
