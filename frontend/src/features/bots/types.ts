// frontend/src/features/bots/types.ts
// TypeScript интерфейсы для подсистемы ботов, интеграций, инлайн-клавиатур и вебхуков

export type BotScope =
  | 'messages:send'
  | 'messages:write'
  | 'chats:read'
  | 'messages:read'
  | 'webhooks:manage'
  | 'invoices:create'
  | 'payments:create';

export interface InlineKeyboardButton {
  id?: string;
  text: string;
  callback_data?: string;
  url?: string;
  pay?: boolean;
  invoice_id?: string;
  web_app?: { url: string };
  style?: 'primary' | 'secondary' | 'danger' | 'success';
  icon?: string;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface WebhookInfo {
  url?: string;
  has_custom_certificate?: boolean;
  pending_update_count?: number;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  is_active?: boolean;
  failure_count?: number;
  last_error?: string;
}

export interface BotCustomCommandButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface BotCustomCommand {
  command: string;
  description?: string;
  response_text: string;
  buttons?: BotCustomCommandButton[];
}

export interface Bot {
  id: number;
  user_id: number;
  user_uuid?: string;
  owner_id: number;
  name: string;
  username: string;
  description?: string;
  avatar_url?: string;
  is_active: boolean;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  welcome_text?: string;
  feedback_mode_enabled?: boolean;
  custom_commands?: BotCustomCommand[];
  created_at?: string;
  token_prefix?: string;
  webhook?: WebhookInfo | null;
  scopes?: string[];
}

export interface BotToken {
  id: number;
  bot_id: number;
  token_prefix: string;
  token?: string;
  scopes: string[];
  is_active: boolean;
  created_at?: string;
  last_used_at?: string;
}

export interface UserShort {
  id: string;
  username?: string;
  name?: string;
}

export interface CallbackQueryPayload {
  id: string;
  from_user: UserShort;
  chat_id: string;
  message_id: string;
  data?: string;
}

export interface PingWebhookResponse {
  ok: boolean;
  status_code?: number;
  response_time_ms?: number;
  error?: string;
}

export interface BotCreateRequest {
  name: string;
  username: string;
  description?: string;
  avatar_url?: string;
}

export interface BotCreateResponse {
  ok: boolean;
  bot: Bot;
  token: string;
  token_id?: number;
  token_prefix?: string;
  scopes?: string[];
  instruction?: string;
}

export interface TokenRegenerateResponse {
  token: string;
  token_prefix: string;
  scopes: string[];
}

export interface SetWebhookRequest {
  url: string;
  secret_token?: string;
  allowed_updates?: string[];
}

export interface AnswerCallbackQueryResponse {
  ok: boolean;
  callback_query_id?: string;
  update_id?: number;
}
