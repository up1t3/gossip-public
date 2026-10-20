import { getBackendUrl } from '../../utils/url';

/**
 * Вычисляет SHA-256 хэш файла/блоба
 */
async function computeSHA256(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Вспомогательная функция для паузы (задержки)
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Загрузка файлов > 50 МБ на сервер методом Tus
 */
export async function uploadMediaTus(
  file: File | Blob,
  filename: string,
  onProgress?: (p: number) => void
): Promise<string> {
  console.log(`[TusClient] Запуск Tus-загрузки файла "${filename}" (${file.size} байт)...`);
  
  // 1. Вычисляем SHA-256 хэш файла
  const fileHash = await computeSHA256(file);
  console.log(`[TusClient] Хэш файла вычислен: ${fileHash}`);

  const token = localStorage.getItem("session_token") || "";

  // 2. Инициализируем Tus-загрузку на сервере
  const initRes = await fetch(getBackendUrl("/api/v1/media/upload/tus/init"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      filename,
      file_size: file.size,
      file_hash: fileHash
    })
  });

  if (!initRes.ok) {
    throw new Error(`Не удалось инициализировать Tus-загрузку: ${initRes.statusText}`);
  }

  const initData = await initRes.json();
  const uploadId = initData.upload_id;
  let offset = initData.offset || 0;

  console.log(`[TusClient] Загрузка инициализирована. Upload ID: ${uploadId}, Начальный смещение: ${offset}`);

  const CHUNK_SIZE = 5 * 1024 * 1024; // 5 МБ

  // 3. Загружаем чанки по 5 МБ
  while (offset < file.size) {
    const end = Math.min(offset + CHUNK_SIZE, file.size);
    const chunkBlob = file.slice(offset, end);

    let success = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (!success && attempts < maxAttempts) {
      try {
        console.log(`[TusClient] Отправка чанка ${offset}-${end} (попытка ${attempts + 1}/${maxAttempts})...`);
        
        const response = await fetch(getBackendUrl(`/api/v1/media/upload/tus/${uploadId}`), {
          method: "PATCH",
          headers: {
            "Upload-Offset": String(offset),
            "Authorization": `Bearer ${token}`
          },
          body: chunkBlob
        });

        if (response.status === 204) {
          // Чанк успешно загружен, но загрузка файла еще не завершена
          const serverOffsetHeader = response.headers.get("Upload-Offset");
          offset = serverOffsetHeader ? parseInt(serverOffsetHeader, 10) : end;
          success = true;
          console.log(`[TusClient] Чанк успешно принят сервером. Текущее смещение: ${offset}`);
          
          if (onProgress) {
            onProgress(Math.min(100, Math.round((offset / file.size) * 100)));
          }
        } else if (response.status === 200) {
          // Последний чанк загружен, загрузка завершена успешно
          const result = await response.json();
          console.log(`[TusClient] Загрузка завершена! URL файла: ${result.url}`);
          if (onProgress) {
            onProgress(100);
          }
          return result.url;
        } else if (response.status === 409) {
          // Ошибка смещения (mismatch), обновляем offset с сервера
          const result = await response.json();
          console.warn(`[TusClient] Несовпадение смещения. Ожидалось сервером: ${result.expected_offset}`);
          offset = result.expected_offset;
          // Нет необходимости увеличивать attempts, так как это не сетевая ошибка, а коррекция состояния
          break; 
        } else {
          throw new Error(`Ошибка сервера при PATCH: ${response.status} ${response.statusText}`);
        }
      } catch (err) {
        attempts++;
        console.error(`[TusClient] Ошибка при отправке чанка на попытке ${attempts}:`, err);
        if (attempts >= maxAttempts) {
          throw err;
        }
        // Экспоненциальная задержка: 1c, 2c, 4c...
        const backoffMs = Math.pow(2, attempts - 1) * 1000;
        console.log(`[TusClient] Ожидание ${backoffMs}мс перед повторной попыткой...`);
        await delay(backoffMs);
      }
    }
  }

  throw new Error("Загрузка Tus завершилась без возврата URL");
}
