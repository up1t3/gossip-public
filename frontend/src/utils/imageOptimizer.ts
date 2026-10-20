import { getBackendUrl } from './url';

/**
 * Загружает существующий URL аватара и преобразует его в Data URL для повторного кадрирования
 */
export async function loadUrlForCropping(url: string): Promise<string> {
  if (!url || url === '👤' || url === '👥' || url === 'null' || url === 'undefined') {
    throw new Error('Нет изображения для редактирования');
  }

  // Если это уже Data URL или Blob URL — сразу возвращаем
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  const fullUrl = getBackendUrl(url);
  try {
    const res = await fetch(fullUrl, { mode: 'cors' });
    if (!res.ok) {
      console.warn(`[imageOptimizer] Ошибка HTTP ${res.status} при загрузке ${fullUrl}, используем прямой URL`);
      return fullUrl;
    }
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          resolve(fullUrl);
        }
      };
      reader.onerror = () => resolve(fullUrl);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('[imageOptimizer] Не удалось загрузить через fetch (CORS/сеть), используем прямой URL:', err);
    return fullUrl;
  }
}

/**
 * Загружает изображение и конвертирует HEIC/HEIF в Data URL для интерактивного кадрирования
 */
export async function loadImageForCropping(file: File): Promise<string> {
  let sourceFile = file;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isHEIC = ['heic', 'heif'].includes(ext);

  if (isHEIC) {
    try {
      const heic2any = (await import('heic2any')).default;
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.95,
      });
      const blobResult = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      sourceFile = new File([blobResult], 'avatar.jpg', { type: 'image/jpeg' });
    } catch (err) {
      console.warn('[imageOptimizer] Не удалось преобразовать HEIC для кадрирования:', err);
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Не удалось прочитать файл'));
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(sourceFile);
  });
}

/**
 * Оптимизирует и сжимает изображение аватара перед отправкой на сервер:
 * 1. Квадратная центрованная обрезка (center crop / cover) до 512x512 px.
 * 2. Сжатие в JPEG с качеством 0.85.
 * 3. Поддержка HEIC/HEIF для iOS/Android устройств.
 */
export async function prepareAvatarImage(file: File): Promise<{ optimizedFile: File; previewUrl: string }> {
  let sourceFile = file;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isHEIC = ['heic', 'heif'].includes(ext);

  if (isHEIC) {
    try {
      const heic2any = (await import('heic2any')).default;
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.9,
      });
      const blobResult = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      sourceFile = new File([blobResult], 'avatar.jpg', { type: 'image/jpeg' });
    } catch (err) {
      console.warn('[imageOptimizer] Не удалось преобразовать HEIC, используем исходный файл:', err);
    }
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const targetSize = 512;
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          const previewUrl = URL.createObjectURL(sourceFile);
          return resolve({ optimizedFile: sourceFile, previewUrl });
        }

        // Вычисляем квадратный crop по центру
        const minDim = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
        const sx = ((img.naturalWidth || img.width) - minDim) / 2;
        const sy = ((img.naturalHeight || img.height) - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const optimizedFile = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
              const previewUrl = URL.createObjectURL(blob);
              resolve({ optimizedFile, previewUrl });
            } else {
              const previewUrl = URL.createObjectURL(sourceFile);
              resolve({ optimizedFile: sourceFile, previewUrl });
            }
          },
          'image/jpeg',
          0.85
        );
      };

      img.onerror = () => {
        const previewUrl = URL.createObjectURL(sourceFile);
        resolve({ optimizedFile: sourceFile, previewUrl });
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      const previewUrl = URL.createObjectURL(sourceFile);
      resolve({ optimizedFile: sourceFile, previewUrl });
    };

    reader.readAsDataURL(sourceFile);
  });
}
