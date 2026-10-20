import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;
let ffmpegQueue: Promise<any> = Promise.resolve();

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (ffmpegLoadPromise) return ffmpegLoadPromise;

  ffmpegLoadPromise = (async () => {
    try {
      const instance = new FFmpeg();
      const baseURL = (typeof window !== 'undefined' && window.location)
        ? `${window.location.origin}/assets/ffmpeg`
        : '/assets/ffmpeg';

      await instance.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      ffmpegInstance = instance;
      return instance;
    } catch (err) {
      ffmpegInstance = null;
      ffmpegLoadPromise = null;
      throw err;
    }
  })();

  return ffmpegLoadPromise;
}

function runWithFFmpegLock<T>(task: (ffmpeg: FFmpeg) => Promise<T>): Promise<T> {
  const next = ffmpegQueue.then(async () => {
    const ffmpeg = await getFFmpeg();
    return task(ffmpeg);
  });
  ffmpegQueue = next.catch(() => {});
  return next;
}

function asciiSlice(bytes: Uint8Array, start: number, end: number): string {
  const limit = Math.min(bytes.length, end);
  let out = '';
  for (let i = start; i < limit; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

/**
 * Проверяет по бинарным сигнатурам, является ли видео уже универсальным MP4 (H.264 avc1 + AAC mp4a, без HEVC/WebM/Opus/QuickTime)
 */
export function isBufferUniversalMp4Video(bytes: Uint8Array): boolean {
  if (bytes.length < 32) return false;
  // WebM / MKV
  if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) {
    return false;
  }
  const head = asciiSlice(bytes, 0, 64);
  if (!head.includes('ftyp')) return false;
  // QuickTime .mov (ftypqt  ) часто содержит HEVC или специфичные атомы Apple
  if (head.includes('ftypqt')) return false;

  // Сканируем первые 256 КБ и последние 256 КБ (где может лежать moov/stsd)
  const scanHead = asciiSlice(bytes, 0, Math.min(bytes.length, 262144));
  const tailStart = Math.max(0, bytes.length - 262144);
  const scanTail = tailStart > 0 ? asciiSlice(bytes, tailStart, bytes.length) : '';
  const combined = scanHead + scanTail;

  // Запрещенные для кросс-платформы видео/аудио кодеки в MP4 (HEVC, VP8/VP9, AV1, Opus)
  if (
    combined.includes('hvc1') ||
    combined.includes('hev1') ||
    combined.includes('vp08') ||
    combined.includes('vp09') ||
    combined.includes('av01') ||
    combined.includes('Opus')
  ) {
    return false;
  }

  // Должен присутствовать видеокодек H.264 (avc1)
  return combined.includes('avc1');
}

/**
 * Проверяет, является ли аудио уже универсальным форматом, поддерживаемым и на iOS Safari, и на Android WebView (MP4/M4A с AAC, MP3, WAV)
 */
export function isBufferUniversalAudio(bytes: Uint8Array): boolean {
  if (bytes.length < 16) return false;
  // WebM (1A 45 DF A3) и Ogg (OggS) НЕ воспроизводятся на iOS Safari в <audio>
  if (
    (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) ||
    (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53)
  ) {
    return false;
  }
  // MP3 (ID3 или sync word)
  if (
    (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
    (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0)
  ) {
    return true;
  }
  const head = asciiSlice(bytes, 0, 64);
  // WAV (RIFF....WAVE)
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && head.includes('WAVE')) {
    return true;
  }
  // ISO BMFF (M4A / MP4 с AAC, без Opus)
  if (head.includes('ftyp') || head.includes('moov') || head.includes('mdat')) {
    const scan = asciiSlice(bytes, 0, Math.min(bytes.length, 131072));
    if (scan.includes('Opus')) return false;
    if (scan.includes('mp4a') || head.includes('M4A ') || head.includes('mp42') || head.includes('isom')) {
      return true;
    }
  }
  return false;
}

function detectInputExtension(bytes: Uint8Array, fallbackName?: string, fallbackMime?: string): string {
  if (bytes.length >= 12) {
    if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) {
      return 'webm';
    }
    if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
      return 'ogg';
    }
    const head = asciiSlice(bytes, 0, 32);
    if (head.includes('ftypqt')) return 'mov';
    if (head.includes('ftyp')) return 'mp4';
  }
  const extFromName = fallbackName?.split('.').pop()?.toLowerCase();
  if (extFromName && ['mp4', 'mov', 'webm', 'mkv', 'avi', '3gp', 'ogg', 'm4a', 'aac', 'mp3', 'wav'].includes(extFromName)) {
    return extFromName;
  }
  if (fallbackMime?.includes('webm')) return 'webm';
  if (fallbackMime?.includes('ogg')) return 'ogg';
  if (fallbackMime?.includes('quicktime')) return 'mov';
  return 'mp4';
}

/**
 * Кодирует AudioBuffer в компактный моно 16-бит PCM WAV (100% нативная поддержка на iOS Safari, Android и Desktop без WASM)
 */
function encodeAudioBufferToWav(audioBuffer: AudioBuffer, targetSampleRate = 24000): ArrayBuffer {
  const numChannels = 1;
  const srcRate = audioBuffer.sampleRate;
  const srcData = audioBuffer.getChannelData(0);
  const ratio = srcRate / targetSampleRate;
  const outLength = Math.max(1, Math.floor(srcData.length / ratio));
  const buffer = new ArrayBuffer(44 + outLength * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + outLength * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true);  // PCM format = 1
  view.setUint16(22, numChannels, true);
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, targetSampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true); // 16-bit
  writeStr(36, 'data');
  view.setUint32(40, outLength * 2, true);

  let offset = 44;
  for (let i = 0; i < outLength; i++) {
    const srcIdx = Math.min(srcData.length - 1, Math.floor(i * ratio));
    const sample = Math.max(-1, Math.min(1, srcData[srcIdx]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }

  return buffer;
}

/**
 * Гарантирует, что записанное голосовое сообщение находится в универсальном формате (AAC в MP4/M4A или WAV),
 * который воспроизводится и на iPhone (iOS Safari), и на Android (WebView/Chrome), и на Desktop.
 */
export async function ensureUniversalAudioBlob(blob: Blob): Promise<Blob> {
  try {
    const ab = await blob.arrayBuffer();
    const bytes = new Uint8Array(ab);
    if (isBufferUniversalAudio(bytes)) {
      return new Blob([ab], { type: blob.type && blob.type.includes('mp4') ? 'audio/mp4' : (blob.type || 'audio/mp4') });
    }

    // 1. Конвертация через FFmpeg WASM в AAC-LC (audio/mp4, .m4a)
    try {
      const ext = detectInputExtension(bytes, undefined, blob.type);
      const mp4Blob = await runWithFFmpegLock(async (ffmpeg) => {
        const id = Math.random().toString(36).slice(2, 8);
        const inputName = `in_voice_${id}.${ext}`;
        const outputName = `out_voice_${id}.m4a`;
        await ffmpeg.writeFile(inputName, bytes);
        try {
          await ffmpeg.exec([
            '-y',
            '-i', inputName,
            '-vn',
            '-c:a', 'aac',
            '-b:a', '64k',
            '-ac', '1',
            '-ar', '44100',
            '-movflags', '+faststart',
            outputName,
          ]);
          const data = await ffmpeg.readFile(outputName);
          if (typeof data !== 'string' && data.byteLength > 128) {
            const outBuf = new ArrayBuffer(data.byteLength);
            new Uint8Array(outBuf).set(data);
            return new Blob([outBuf], { type: 'audio/mp4' });
          }
          throw new Error('FFmpeg audio output is empty');
        } finally {
          await ffmpeg.deleteFile(inputName).catch(() => {});
          await ffmpeg.deleteFile(outputName).catch(() => {});
        }
      });
      return mp4Blob;
    } catch (wasmErr) {
      console.warn('[VideoCompressor] FFmpeg WASM аудио-конвертация не удалась, используем WebAudio WAV фоллбек:', wasmErr);
    }

    // 2. Мгновенный нативный фоллбек через Web Audio API -> PCM WAV
    const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : null;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      try {
        const decoded = await ctx.decodeAudioData(ab.slice(0));
        const wavBuffer = encodeAudioBufferToWav(decoded, 24000);
        return new Blob([wavBuffer], { type: 'audio/wav' });
      } finally {
        ctx.close().catch(() => {});
      }
    }
  } catch (err) {
    console.warn('[VideoCompressor] Ошибка нормализации аудио, возвращаем исходный Blob:', err);
  }
  return blob;
}

/**
 * Сжимает и нормализует обычное видео в универсальный MP4 (H.264 yuv420p + AAC, faststart),
 * совместимый с iPhone (iOS Safari) и Android (WebView).
 */
export async function compressVideo(file: File, onProgress?: (p: number) => void): Promise<Blob> {
  try {
    const ab = await file.arrayBuffer();
    const bytes = new Uint8Array(ab);

    // Если видео уже в универсальном H.264 + AAC MP4 и небольшого размера (< 18 МБ), не тратим время на перекодирование
    if (isBufferUniversalMp4Video(bytes) && file.size <= 18 * 1024 * 1024) {
      console.log('[VideoCompressor] Видео уже в универсальном формате H.264/AAC MP4, пропускаем перекодирование.');
      onProgress?.(100);
      return new Blob([ab], { type: 'video/mp4' });
    }

    // Ограничение для WASM в мобильном WebView во избежание OOM на гигантских файлах (> 85 МБ)
    if (file.size > 85 * 1024 * 1024) {
      console.warn('[VideoCompressor] Файл > 85 МБ, пропускаем WASM-перекодирование во избежание нехватки памяти.');
      return fallbackCompress(file);
    }

    console.log('[VideoCompressor] Запуск кросс-платформенного транскодирования видео в H.264/AAC MP4 (таймаут 60с)...');
    const compressPromise = compressVideoWasm(file, onProgress, bytes);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Превышен таймаут сжатия видео FFmpeg WASM (60 секунд)')), 60000)
    );
    return await Promise.race([compressPromise, timeoutPromise]);
  } catch (e) {
    console.warn('[VideoCompressor] Ошибка или таймаут при сжатии через FFmpeg WASM, используем фоллбек:', e);
    return fallbackCompress(file);
  }
}

export async function compressVideoWasm(file: File, onProgress?: (p: number) => void, preloadedBytes?: Uint8Array): Promise<Blob> {
  const fileData = preloadedBytes || new Uint8Array(await file.arrayBuffer());
  const ext = detectInputExtension(fileData, file.name, file.type);

  return runWithFFmpegLock(async (ffmpeg) => {
    const progressHandler = ({ progress }: { progress: number }) => {
      if (onProgress) onProgress(Math.min(99, Math.max(1, Math.round(progress * 100))));
    };
    ffmpeg.on('progress', progressHandler);

    const id = Math.random().toString(36).slice(2, 8);
    const inputName = `input_${id}.${ext}`;
    const outputName = `output_${id}.mp4`;

    await ffmpeg.writeFile(inputName, fileData);
    try {
      await ffmpeg.exec([
        '-y',
        '-i', inputName,
        '-vf', "scale='trunc(min(1280,iw)/2)*2':'trunc(ow/a/2)*2',format=yuv420p",
        '-c:v', 'libx264',
        '-profile:v', 'main',
        '-level', '4.0',
        '-pix_fmt', 'yuv420p',
        '-crf', '28',
        '-preset', 'ultrafast',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ac', '2',
        '-ar', '44100',
        '-movflags', '+faststart',
        outputName,
      ]);

      const data = await ffmpeg.readFile(outputName);
      if (typeof data === 'string' || data.byteLength < 256) {
        throw new Error('FFmpeg вернул пустой видеофайл');
      }
      const dataBuffer = new ArrayBuffer(data.byteLength);
      new Uint8Array(dataBuffer).set(data);
      return new Blob([dataBuffer], { type: 'video/mp4' });
    } finally {
      ffmpeg.off('progress', progressHandler);
      await ffmpeg.deleteFile(inputName).catch(() => {});
      await ffmpeg.deleteFile(outputName).catch(() => {});
    }
  });
}

/**
 * Сжимает и нормализует видео-кружок в универсальный H.264 Baseline + AAC MP4 (480x480, yuv420p, faststart)
 * на ВСЕХ платформах (Android Capacitor, iOS Safari, Desktop), чтобы кружки с Android открывались на iPhone и наоборот.
 */
export async function compressVideoNote(file: File | Blob, onProgress?: (p: number) => void): Promise<Blob> {
  try {
    const ab = await file.arrayBuffer();
    const bytes = new Uint8Array(ab);

    console.log('[VideoCompressor] Нормализация видео-кружка в универсальный H.264/AAC MP4 (таймаут 45с)...');
    const fileObj = file instanceof File ? file : new File([file], 'video_note.mp4', { type: file.type || 'video/mp4' });
    const compressPromise = compressVideoNoteWasm(fileObj, onProgress, bytes);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Превышен таймаут сжатия видео-кружка FFmpeg WASM (45 секунд)')), 45000)
    );
    return await Promise.race([compressPromise, timeoutPromise]);
  } catch (e) {
    console.warn('[VideoCompressor] Ошибка или таймаут при сжатии видео-кружка через FFmpeg WASM, используем фоллбек:', e);
    return file;
  }
}

/**
 * Сжимает видео-кружок (aspect ratio 1:1, crop, scale 480x480, H.264 baseline yuv420p, crf 28, aac, faststart)
 */
export async function compressVideoNoteWasm(file: File, onProgress?: (p: number) => void, preloadedBytes?: Uint8Array): Promise<Blob> {
  const fileData = preloadedBytes || new Uint8Array(await file.arrayBuffer());
  const ext = detectInputExtension(fileData, file.name, file.type);

  return runWithFFmpegLock(async (ffmpeg) => {
    const progressHandler = ({ progress }: { progress: number }) => {
      if (onProgress) onProgress(Math.min(99, Math.max(1, Math.round(progress * 100))));
    };
    ffmpeg.on('progress', progressHandler);

    const id = Math.random().toString(36).slice(2, 8);
    const inputName = `input_note_${id}.${ext}`;
    const outputName = `output_note_${id}.mp4`;

    await ffmpeg.writeFile(inputName, fileData);
    try {
      await ffmpeg.exec([
        '-y',
        '-i', inputName,
        '-vf', "crop='min(in_w,in_h):min(in_w,in_h)',scale=480:480,format=yuv420p",
        '-c:v', 'libx264',
        '-profile:v', 'baseline',
        '-level', '3.1',
        '-pix_fmt', 'yuv420p',
        '-crf', '28',
        '-preset', 'ultrafast',
        '-r', '30',
        '-c:a', 'aac',
        '-b:a', '64k',
        '-ac', '1',
        '-ar', '44100',
        '-movflags', '+faststart',
        outputName,
      ]);

      const data = await ffmpeg.readFile(outputName);
      if (typeof data === 'string' || data.byteLength < 256) {
        throw new Error('FFmpeg вернул пустой файл кружка');
      }
      const dataBuffer = new ArrayBuffer(data.byteLength);
      new Uint8Array(dataBuffer).set(data);
      return new Blob([dataBuffer], { type: 'video/mp4' });
    } finally {
      ffmpeg.off('progress', progressHandler);
      await ffmpeg.deleteFile(inputName).catch(() => {});
      await ffmpeg.deleteFile(outputName).catch(() => {});
    }
  });
}

/**
 * Конвертирует изображение (включая HEIC/HEIF с iPhone, AVIF, BMP, TIFF) в универсальный JPEG.
 * Сначала использует аппаратный декодер браузера (createImageBitmap / Image + Canvas),
 * а если браузер не поддерживает HEIC нативно (Android / Windows) — вызывает heic2any.
 */
export async function normalizeImageToJpeg(fileOrBlob: Blob, originalName = 'photo.jpg'): Promise<File> {
  const ab = await fileOrBlob.arrayBuffer();
  const bytes = new Uint8Array(ab);
  const head = asciiSlice(bytes, 0, 32);
  const ext = originalName.split('.').pop()?.toLowerCase() || '';

  const isJpeg = bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
  const isPng = bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
  const isGif = bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38;
  const isWebp =
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;

  const isHeicMagic = /(ftyp)(heic|heix|hevc|heim|heis|hevm|hevs|mif1|msf1)/i.test(head);
  const isHeic = isHeicMagic || ['heic', 'heif'].includes(ext) || fileOrBlob.type === 'image/heic' || fileOrBlob.type === 'image/heif';

  // Если это уже стандартный JPEG/PNG/GIF/WebP (и не скрытый HEIC) — возвращаем как есть с правильным MIME
  if (!isHeic && (isJpeg || isPng || isGif || isWebp)) {
    const mime = isJpeg ? 'image/jpeg' : isPng ? 'image/png' : isGif ? 'image/gif' : 'image/webp';
    const realExt = isJpeg ? 'jpg' : isPng ? 'png' : isGif ? 'gif' : 'webp';
    const base = originalName.replace(/\.[^/.]+$/, '') || 'photo';
    return new File([ab], `${base}.${realExt}`, { type: mime });
  }

  const baseName = (originalName.replace(/\.[^/.]+$/, '') || 'photo') + '.jpg';

  // 1. Пробуем нативный декодер ОС/браузера (на iOS Safari декодирует HEIC аппаратно за ~25 мс)
  if (typeof document !== 'undefined' && typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(new Blob([ab], { type: isHeic ? 'image/heic' : (fileOrBlob.type || 'image/jpeg') }));
      const maxDim = 2560;
      let w = bitmap.width;
      let h = bitmap.height;
      if (w > maxDim || h > maxDim) {
        const scale = maxDim / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, w, h);
        bitmap.close?.();
        const jpegBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
        if (jpegBlob && jpegBlob.size > 0) {
          return new File([jpegBlob], baseName, { type: 'image/jpeg' });
        }
      } else {
        bitmap.close?.();
      }
    } catch {
      // Нативный декодер не поддерживает HEIC на данной платформе (например, Android/Windows) — переходим к heic2any
    }
  }

  // 2. Фоллбек на heic2any (для Android WebView / Windows / Linux)
  try {
    const heic2any = (await import('heic2any')).default;
    const converted = await heic2any({
      blob: new Blob([ab], { type: 'image/heic' }),
      toType: 'image/jpeg',
      quality: 0.88,
    });
    const resultBlob = Array.isArray(converted) ? converted[0] : converted;
    if (resultBlob && resultBlob.size > 0) {
      return new File([resultBlob], baseName, { type: 'image/jpeg' });
    }
  } catch (heicErr) {
    console.warn('[VideoCompressor] Ошибка конвертации HEIC через heic2any:', heicErr);
  }

  return new File([ab], originalName, { type: fileOrBlob.type || 'image/jpeg' });
}

/**
 * Самовосстановление медиа на стороне получателя (после AES-GCM расшифровки в useDecryptedMedia):
 * если устройство получателя не поддерживает кодек входящего файла (например, старый WebM/Ogg на iPhone
 * или HEIC/MOV HEVC на Android), прозрачно перекодирует буфер в совместимый формат.
 */
export async function transcodeMediaBufferForPlayback(
  buffer: ArrayBuffer,
  detectedMime: string,
  expectedType?: 'video_note' | 'voice' | 'video' | 'photo' | 'sticker' | 'file'
): Promise<{ buffer: ArrayBuffer; mime: string }> {
  const bytes = new Uint8Array(buffer);
  const head = asciiSlice(bytes, 0, 48);

  // 1. Фотографии HEIC/HEIF -> конвертируем в image/jpeg
  const isHeic = detectedMime === 'image/heic' || detectedMime === 'image/heif' || /(ftyp)(heic|heix|hevc|heim|heis|hevm|hevs|mif1|msf1)/i.test(head);
  if (isHeic) {
    try {
      const jpegFile = await normalizeImageToJpeg(new Blob([buffer], { type: 'image/heic' }), 'decrypted.heic');
      return { buffer: await jpegFile.arrayBuffer(), mime: 'image/jpeg' };
    } catch (e) {
      console.warn('[VideoCompressor] Не удалось сконвертировать расшифрованный HEIC в JPEG:', e);
      return { buffer, mime: 'image/jpeg' };
    }
  }

  const isIOS = typeof navigator !== 'undefined' && (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );

  // 2. Голосовые и аудиосообщения (если формат не поддерживается на текущем устройстве, например WebM/Ogg на iOS)
  if (expectedType === 'voice' || detectedMime.startsWith('audio/')) {
    const audioEl = typeof document !== 'undefined' ? document.createElement('audio') : null;
    const canPlay = audioEl ? audioEl.canPlayType(detectedMime) : 'maybe';
    if ((isIOS && (detectedMime === 'audio/webm' || detectedMime === 'audio/ogg')) || !canPlay || !isBufferUniversalAudio(bytes)) {
      try {
        const universalAudio = await ensureUniversalAudioBlob(new Blob([buffer], { type: detectedMime || 'audio/webm' }));
        return { buffer: await universalAudio.arrayBuffer(), mime: universalAudio.type || 'audio/mp4' };
      } catch (e) {
        console.warn('[VideoCompressor] Не удалось транскодировать аудио для воспроизведения:', e);
      }
    }
    return { buffer, mime: detectedMime };
  }

  // 3. Видео и видео-кружки (если WebM открыт на iOS или MOV/HEVC не поддерживается на Android/Web)
  if (expectedType === 'video_note' || expectedType === 'video' || detectedMime.startsWith('video/')) {
    const videoEl = typeof document !== 'undefined' ? document.createElement('video') : null;
    const isWebm = detectedMime === 'video/webm' || (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3);
    const canPlayWebm = videoEl ? Boolean(videoEl.canPlayType('video/webm; codecs="vp8, opus"') || videoEl.canPlayType('video/webm')) : true;
    const needsTranscode =
      (isWebm && (isIOS || !canPlayWebm)) ||
      (!isWebm && !isBufferUniversalMp4Video(bytes) && buffer.byteLength <= 65 * 1024 * 1024);

    if (needsTranscode) {
      try {
        const srcFile = new File([buffer], isWebm ? 'input.webm' : 'input.mov', { type: detectedMime || 'video/mp4' });
        const mp4Blob = expectedType === 'video_note'
          ? await compressVideoNote(srcFile)
          : await compressVideo(srcFile);
        return { buffer: await mp4Blob.arrayBuffer(), mime: 'video/mp4' };
      } catch (e) {
        console.warn('[VideoCompressor] Не удалось транскодировать видео для воспроизведения:', e);
      }
    }
  }

  return { buffer, mime: detectedMime };
}

async function fallbackCompress(file: File): Promise<Blob> {
  console.log('[VideoCompressor] Возвращаем оригинальный файл без сжатия:', file.name);
  return file;
}


