/**
 * frontend/src/utils/message-preview.ts
 * Интеллектуальный санитайзер превью сообщений для списка чатов, диалогов и уведомлений.
 * Превращает любые технические хекс-ключи, JSON шифротекстов, X3DH заголовки и команды
 * в чистый, элегантный и человекочитаемый текст.
 */

export function formatLastMessagePreview(
  text?: string | null,
  type?: string | null,
  draftText?: string | null
): string {
  if (draftText && draftText.trim()) {
    return draftText;
  }

  if (type === 'voice') return '🎤 Голосовое сообщение';
  if (type === 'video_note') return '📹 Видеосообщение';
  if (type === 'photo' || type === 'image') return '📷 Фотография';
  if (type === 'video') return '🎥 Видеозапись';
  if (type === 'sticker') return '🎨 Стикер';
  if (type === 'document' || type === 'file') return '📎 Документ';

  if (!text || !text.trim()) {
    return 'Нет сообщений';
  }

  const trimmed = text.trim();

  // 1. Проверка на служебные команды
  if (
    trimmed === '[service_session_reset]' ||
    trimmed.includes('init_session:') ||
    trimmed.includes('mls_commit:')
  ) {
    return '🔒 Защищенное соединение установлено';
  }
  if (trimmed === 'Чат создан' || trimmed === 'Диалог начат') {
    return trimmed;
  }

  // 2. Проверка на зашифрованные JSON пакеты (Double Ratchet / MLS / AES / X3DH)
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        if (
          'ciphertextHex' in parsed ||
          'ciphertext' in parsed ||
          'mlsCiphertextHex' in parsed ||
          'header' in parsed ||
          'x3dh' in parsed ||
          'iv' in parsed ||
          'ivHex' in parsed ||
          'ephemeralKey' in parsed
        ) {
          return '🔒 Зашифрованное сообщение';
        }
      }
    } catch {}
  }

  // 3. Проверка на сырой хекс шифротекста или ключа (длинная непрерывная hex-строка от 24 символов)
  if (/^[a-fA-F0-9]{24,}$/.test(trimmed)) {
    return '🔒 Зашифрованное сообщение';
  }

  // 4. Проверка на префиксные служебные токены
  if (trimmed.startsWith('pow_challenge:') || trimmed.startsWith('srp_verifier:') || trimmed.startsWith('enc:')) {
    return '🔒 Защищенное сообщение';
  }

  return trimmed;
}

/**
 * Превью последнего сообщения чата «как в Telegram»: если локальная история
 * (уже расшифрованная на устройстве) доступна — превью строится из её
 * последнего сообщения (с учётом типа: голосовое/фото/...), иначе фоллбек
 * на сохранённый lastMessage (может быть ещё не расшифрованным шифртекстом —
 * тогда санитайзер честно покажет 🔒).
 */
export function formatChatPreview(
  lastMessage?: string | null,
  messages?: Array<{ text?: string | null; type?: string | null }> | null
): string {
  if (messages && messages.length > 0) {
    const last = messages[messages.length - 1];
    if (last) {
      // Медиа-сообщения превьюируются по типу (voice/photo/...), независимо от текста
      if (last.type && last.type !== 'text') {
        return formatLastMessagePreview(last.text ?? null, last.type);
      }
      const text = typeof last.text === 'string' ? last.text.trim() : '';
      const isEncrypted =
        !text ||
        (text.startsWith('{') && text.endsWith('}')) ||
        /^[a-fA-F0-9]{24,}$/.test(text);
      if (!isEncrypted) {
        return formatLastMessagePreview(text, null);
      }
      // Последнее сообщение — зашифрованный шифртекст: попробуем предыдущее
      for (let i = messages.length - 2; i >= 0 && i >= messages.length - 5; i--) {
        const m = messages[i];
        const t = typeof m?.text === 'string' ? m.text.trim() : '';
        if (t && !(t.startsWith('{') && t.endsWith('}')) && !/^[a-fA-F0-9]{24,}$/.test(t)) {
          return formatLastMessagePreview(t, m.type ?? null);
        }
      }
    }
  }
  return formatLastMessagePreview(lastMessage);
}
