import { useState, useEffect } from 'react';
import { decryptMediaBuffer } from '../core/crypto/e2ee';
import { getBackendUrl } from '../utils/url';
import { outboxMediaStore } from '../core/storage/outbox-media-store';
import { transcodeMediaBufferForPlayback } from '../features/ffmpeg/videoCompressor';

// Кэш расшифрованных blob-URL на время сессии (предотвращает повторное скачивание/расшифровку
// при скролле чата, открытии галереи и панели общих медиа, а также преждевременный revokeObjectURL)
const MAX_DECRYPTED_MEDIA_CACHE = 150;
const decryptedMediaBlobCache = new Map<string, string>();

function setCachedBlobUrl(cacheKey: string, blobUrl: string) {
  if (decryptedMediaBlobCache.has(cacheKey)) {
    decryptedMediaBlobCache.delete(cacheKey);
  } else if (decryptedMediaBlobCache.size >= MAX_DECRYPTED_MEDIA_CACHE) {
    const oldestKey = decryptedMediaBlobCache.keys().next().value;
    if (oldestKey) {
      const oldestUrl = decryptedMediaBlobCache.get(oldestKey);
      decryptedMediaBlobCache.delete(oldestKey);
      if (oldestUrl && oldestUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(oldestUrl);
        } catch {}
      }
    }
  }
  decryptedMediaBlobCache.set(cacheKey, blobUrl);
}

export function useDecryptedMedia(
  mediaUrl: string | null | undefined,
  mediaKey?: string | null,
  mediaIv?: string | null,
  expectedType?: 'video_note' | 'voice' | 'video' | 'photo' | 'sticker' | 'file'
) {
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mediaUrl) {
      setUrl('');
      setLoading(false);
      setError(null);
      return;
    }

    // Если это уже локальный blob: или data: URL (например, переданный в галерею), используем напрямую
    if (mediaUrl.startsWith('blob:') || mediaUrl.startsWith('data:')) {
      setUrl(mediaUrl);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    let localOutboxObjectUrl = '';

    // Поддержка локальных персистентных медиафайлов Outbox (Milestone M2, R3.2)
    if (mediaUrl.startsWith('local-media://')) {
      setLoading(true);
      const mediaId = mediaUrl.replace('local-media://', '');
      outboxMediaStore.getMedia(mediaId).then(blob => {
        if (!active) return;
        if (blob) {
          localOutboxObjectUrl = URL.createObjectURL(blob);
          setUrl(localOutboxObjectUrl);
          setLoading(false);
          setError(null);
        } else {
          setError('Локальный медиафайл не найден в хранилище');
          setLoading(false);
        }
      }).catch(err => {
        if (!active) return;
        setError(err.message || 'Ошибка чтения локального медиафайла');
        setLoading(false);
      });

      return () => {
        active = false;
        if (localOutboxObjectUrl) {
          URL.revokeObjectURL(localOutboxObjectUrl);
        }
      };
    }

    if (!mediaKey || !mediaIv) {
      if (mediaUrl.includes('.enc')) {
        setUrl('');
        setLoading(false);
        setError('Отсутствуют ключи расшифровки медиафайла');
        return;
      }
      setUrl(getBackendUrl(mediaUrl));
      setLoading(false);
      setError(null);
      return;
    }

    const cacheKey = `${mediaUrl}|${mediaKey}|${mediaIv}|${expectedType || ''}`;
    const cachedUrl = decryptedMediaBlobCache.get(cacheKey);
    if (cachedUrl) {
      setUrl(cachedUrl);
      setLoading(false);
      setError(null);
      return;
    }

    const decryptMedia = async () => {
      setLoading(true);
      setError(null);
      try {
        const fullUrl = getBackendUrl(mediaUrl);
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('session_token') : null;
        const response = await fetch(fullUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
        });
        if (!response.ok) {
          throw new Error(`Не удалось загрузить зашифрованный файл: ${response.statusText} (${response.status})`);
        }
        const encryptedBuffer = await response.arrayBuffer();
        const decryptedBuffer = await decryptMediaBuffer(encryptedBuffer, mediaKey, mediaIv);
        
        // Определяем mime-тип по сигнатуре заголовка или ожидаемому типу
        let mime = '';
        const bytes = new Uint8Array(decryptedBuffer.slice(0, 64));
        
        // 1. JPEG: FF D8 FF
        if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
          mime = 'image/jpeg';
        }
        // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
        else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
          mime = 'image/png';
        }
        // 3. GIF: 47 49 46 38
        else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
          mime = 'image/gif';
        }
        // 4. WebP: 52 49 46 46 ... 57 45 42 50
        else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
                 bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
          mime = 'image/webp';
        }
        // 5. WebM/MKV: 1A 45 DF A3
        else if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) {
          mime = (expectedType === 'voice' || mediaUrl.includes('voice')) ? 'audio/webm' : 'video/webm';
        }
        // 6. OGG/Opus: 4F 67 67 53 (OggS)
        else if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
          mime = 'audio/ogg';
        }
        // 7. ISO Base Media File Format (HEIC, AVIF, MP4, QuickTime MOV, M4A)
        else {
          const headerStr = Array.from(bytes.slice(0, 48)).map(b => String.fromCharCode(b)).join('');
          if (/(ftyp)(heic|heix|hevc|heim|heis|hevm|hevs|mif1|msf1)/i.test(headerStr)) {
            mime = 'image/heic';
          } else if (/(ftyp)(avif|avis)/i.test(headerStr)) {
            mime = 'image/avif';
          } else if (headerStr.includes('ftyp') || headerStr.includes('moov') || headerStr.includes('mdat') ||
              headerStr.includes('wide') || headerStr.includes('free') || headerStr.includes('moof') ||
              headerStr.includes('qt  ')) {
            if (expectedType === 'voice' || headerStr.includes('M4A ') || headerStr.includes('M4B ') || headerStr.includes('m4a ')) {
              mime = 'audio/mp4';
            } else if (expectedType === 'photo' || expectedType === 'sticker') {
              mime = 'image/jpeg';
            } else {
              mime = 'video/mp4';
            }
          }
          // 8. MP3 (ID3v2 или MPEG sync frame)
          else if ((bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
                   (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0)) {
            mime = 'audio/mpeg';
          }
          // 9. WAV (RIFF...WAVE)
          else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
                   headerStr.includes('WAVE')) {
            mime = 'audio/wav';
          }
          // 10. FLAC: 66 4C 61 43
          else if (bytes[0] === 0x66 && bytes[1] === 0x4C && bytes[2] === 0x61 && bytes[3] === 0x43) {
            mime = 'audio/flac';
          }
        }

        // Фоллбек по ожидаемому типу или ключевым словам URL
        if (!mime) {
          if (expectedType === 'video_note' || expectedType === 'video' || mediaUrl.includes('video_note') || mediaUrl.includes('.mp4') || mediaUrl.includes('.mov') || mediaUrl.includes('.webm')) {
            mime = 'video/mp4';
          } else if (expectedType === 'voice' || mediaUrl.includes('voice') || mediaUrl.includes('.ogg') || mediaUrl.includes('.m4a') || mediaUrl.includes('.mp3') || mediaUrl.includes('.mp4') || mediaUrl.includes('.aac')) {
            mime = (mediaUrl.includes('.m4a') || mediaUrl.includes('.mp4') || mediaUrl.includes('.aac')) ? 'audio/mp4' : 'audio/ogg';
          } else if (expectedType === 'photo' || expectedType === 'sticker' || mediaUrl.includes('photo') || mediaUrl.includes('.jpg') || mediaUrl.includes('.png') || mediaUrl.includes('.webp')) {
            mime = 'image/jpeg';
          } else {
            mime = 'video/mp4';
          }
        }

        // Автоматическая нормализация кодеков для воспроизведения (например, WebM/Ogg на iPhone или HEIC/MOV HEVC на Android)
        const normalized = await transcodeMediaBufferForPlayback(decryptedBuffer, mime, expectedType);
        const blob = new Blob([normalized.buffer], { type: normalized.mime });
        const objectUrl = URL.createObjectURL(blob);
        setCachedBlobUrl(cacheKey, objectUrl);
        if (active) {
          setUrl(objectUrl);
        }
      } catch (err: any) {
        console.error("[useDecryptedMedia] Ошибка расшифрования медиа:", err);
        if (active) {
          setError(err.message || 'Ошибка расшифрования');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    decryptMedia();

    return () => {
      active = false;
    };
  }, [mediaUrl, mediaKey, mediaIv, expectedType]);

  return { url, loading, error };
}
