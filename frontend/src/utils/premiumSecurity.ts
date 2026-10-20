// frontend/src/utils/premiumSecurity.ts
import { getBackendUrl } from './url';

export type DecoyPinAction = 'decoy_chats' | 'wipe_local';

export interface DeadMansSwitchConfig {
  enabled: boolean;
  inactivity_days: number;
  action: 'wipe_all' | 'wipe_messages';
  farewell_note: string;
  last_active_at: string;
  expires_at: string | null;
}

export interface BurnerLinkItem {
  token: string;
  chat_id: string;
  title: string;
  ttl_minutes: number;
  single_use: boolean;
  max_participants: number;
  participants_count: number;
  is_burned: boolean;
  created_at: string | null;
  expires_at: string | null;
}

export interface PremiumSecurityStatusResponse {
  is_premium: boolean;
  user_id: string;
  dead_mans_switch: DeadMansSwitchConfig;
  burner_links: BurnerLinkItem[];
}

function normalizeUserKey(username: string): string {
  return (username || 'default').toLowerCase().trim();
}

async function computeSaltedPinHash(cleanUser: string, pin: string): Promise<string> {
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
  const payload = `gossip_decoy_v1:${cleanUser}:${pin.trim()}`;
  const encoded = new TextEncoder().encode(payload);
  const digest = await cryptoObj.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function setDecoyPin(
  username: string,
  decoyPin: string,
  action: DecoyPinAction = 'decoy_chats'
): Promise<void> {
  const cleanUser = normalizeUserKey(username);
  if (!decoyPin || decoyPin.trim().length < 4) {
    throw new Error('Ложный PIN-код должен содержать минимум 4 цифры');
  }
  const hashHex = await computeSaltedPinHash(cleanUser, decoyPin);
  localStorage.setItem(`gossip_decoy_pin_hash_${cleanUser}`, hashHex);
  localStorage.setItem(`gossip_decoy_pin_action_${cleanUser}`, action);
}

export function hasDecoyPin(username: string): boolean {
  const cleanUser = normalizeUserKey(username);
  return Boolean(localStorage.getItem(`gossip_decoy_pin_hash_${cleanUser}`));
}

export function getDecoyPinAction(username: string): DecoyPinAction {
  const cleanUser = normalizeUserKey(username);
  const act = localStorage.getItem(`gossip_decoy_pin_action_${cleanUser}`);
  return act === 'wipe_local' ? 'wipe_local' : 'decoy_chats';
}

export function clearDecoyPin(username: string): void {
  const cleanUser = normalizeUserKey(username);
  localStorage.removeItem(`gossip_decoy_pin_hash_${cleanUser}`);
  localStorage.removeItem(`gossip_decoy_pin_action_${cleanUser}`);
}

export async function verifyDecoyPin(username: string, candidatePin: string): Promise<boolean> {
  const cleanUser = normalizeUserKey(username);
  const storedHash = localStorage.getItem(`gossip_decoy_pin_hash_${cleanUser}`);
  if (!storedHash || !candidatePin) return false;
  const candidateHash = await computeSaltedPinHash(cleanUser, candidatePin);
  return storedHash === candidateHash;
}

export function isDecoyModeActive(): boolean {
  try {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem('gossip_decoy_mode_active') === 'true';
  } catch {
    return false;
  }
}

export function setDecoyModeActive(active: boolean): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      if (active) {
        sessionStorage.setItem('gossip_decoy_mode_active', 'true');
      } else {
        sessionStorage.removeItem('gossip_decoy_mode_active');
      }
    }
  } catch {}
}

/**
 * Generates realistic, completely harmless decoy chats when the user unlocks with the Decoy PIN.
 */
export function buildDecoyChats(): any[] {
  const now = Date.now();
  return [
    {
      id: 'decoy_notes_shopping',
      name: 'Список покупок и быт',
      avatar: '🛒',
      lastMessage: 'Молоко, кофе в зернах, батарейки АА, забрать посылку из ПВЗ',
      time: '14:20',
      unread: 0,
      isGroup: false,
      online: true,
      messages: [
        {
          id: 'decoy_m1',
          sender: 'me',
          senderName: 'Я',
          text: 'Купить на неделю: овсянка, молоко, сыр, помидоры, фильтр для воды',
          time: 'Вчера',
          pts: 1,
          timestamp: now - 86400000,
          status: 'read',
          type: 'text',
        },
        {
          id: 'decoy_m2',
          sender: 'me',
          senderName: 'Я',
          text: 'Молоко, кофе в зернах, батарейки АА, забрать посылку из ПВЗ',
          time: '14:20',
          pts: 2,
          timestamp: now - 7200000,
          status: 'read',
          type: 'text',
        },
      ],
    },
    {
      id: 'decoy_support_bot',
      name: 'Справочник Gossip',
      avatar: '🤖',
      lastMessage: 'Добро пожаловать! Здесь вы можете хранить личные заметки.',
      time: 'Вчера',
      unread: 0,
      isGroup: false,
      online: true,
      messages: [
        {
          id: 'decoy_m3',
          sender: 'decoy_support_bot',
          senderName: 'Справочник Gossip',
          text: 'Добро пожаловать! Здесь вы можете хранить личные заметки и напоминания.',
          time: 'Вчера',
          pts: 1,
          timestamp: now - 120000000,
          status: 'read',
          type: 'text',
        },
      ],
    },
    {
      id: 'decoy_fitness',
      name: 'Тренировки и бег',
      avatar: '🏃',
      lastMessage: 'Четверг: пробежка 5 км в парке, пульс 142',
      time: 'Пн',
      unread: 0,
      isGroup: false,
      online: false,
      messages: [
        {
          id: 'decoy_m4',
          sender: 'me',
          senderName: 'Я',
          text: 'Вторник: жим лежа 3х10, подтягивания 4х12',
          time: 'Пн',
          pts: 1,
          timestamp: now - 250000000,
          status: 'read',
          type: 'text',
        },
        {
          id: 'decoy_m5',
          sender: 'me',
          senderName: 'Я',
          text: 'Четверг: пробежка 5 км в парке, пульс 142',
          time: 'Пн',
          pts: 2,
          timestamp: now - 210000000,
          status: 'read',
          type: 'text',
        },
      ],
    },
  ];
}

function getAuthHeaders(): Record<string, string> {
  const token =
    localStorage.getItem('session_token') ||
    localStorage.getItem('token') ||
    '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchPremiumSecurityStatus(): Promise<PremiumSecurityStatusResponse> {
  const res = await fetch(getBackendUrl('/api/v1/premium/security'), {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Не удалось загрузить статус спец-защиты');
  }
  return await res.json();
}

export async function updateDeadMansSwitch(params: {
  inactivity_days: number;
  action: 'wipe_all' | 'wipe_messages';
  farewell_note?: string;
}): Promise<DeadMansSwitchConfig> {
  const res = await fetch(getBackendUrl('/api/v1/premium/dead-mans-switch'), {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Ошибка сохранения настроек автосброса');
  }
  const data = await res.json();
  return data.dead_mans_switch;
}

export async function sendActivityHeartbeat(): Promise<void> {
  const token = localStorage.getItem('session_token') || localStorage.getItem('token');
  if (!token) return;
  try {
    await fetch(getBackendUrl('/api/v1/premium/heartbeat'), {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch {
    // Non-blocking background heartbeat
  }
}

export async function createBurnerLink(params: {
  title: string;
  ttl_minutes: number;
  single_use: boolean;
  max_participants?: number;
}): Promise<BurnerLinkItem> {
  const res = await fetch(getBackendUrl('/api/v1/premium/burner/create'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      title: params.title,
      ttl_minutes: params.ttl_minutes,
      single_use: params.single_use,
      max_participants: params.max_participants ?? 2,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Не удалось создать одноразовую Burner-ссылку');
  }
  return await res.json();
}

export async function joinBurnerLink(token: string, guestName?: string): Promise<{
  status: string;
  token: string;
  chat_id: string;
  title: string;
  expires_at: string | null;
  participants_count: number;
  max_participants: number;
  user_id: string;
  ephemeral_session_token?: string | null;
  ephemeral_username?: string | null;
}> {
  const res = await fetch(getBackendUrl(`/api/v1/premium/burner/${encodeURIComponent(token)}/join`), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ guest_display_name: guestName || 'Гость (Burner)' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Ссылка недействительна или уже уничтожена');
  }
  return await res.json();
}

export async function burnRoomImmediately(tokenOrChatId: string): Promise<{ status: string; chat_id: string }> {
  const cleanToken = tokenOrChatId.startsWith('burner_')
    ? tokenOrChatId
    : tokenOrChatId;
  const res = await fetch(getBackendUrl(`/api/v1/premium/burner/${encodeURIComponent(cleanToken)}`), {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Не удалось уничтожить комнату');
  }
  return await res.json();
}
