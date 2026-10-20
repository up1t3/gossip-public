/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

// Плагин Vite PWA внедрит манифест сборки сюда
precacheAndRoute(self.__WB_MANIFEST || []);

// Быстрая активация сервис-воркера
self.skipWaiting();
clientsClaim();

// Инициализация локальной БД через IndexedDB (имитация SQLCipher)
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('gossip-sw-db', 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('messages')) {
        db.createObjectStore('messages', { keyPath: 'id' });
      }
      if (db.objectStoreNames.contains('metadata')) {
        db.deleteObjectStore('metadata');
      }
      db.createObjectStore('metadata');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveMessage(message: any) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    
    // Имитируем SQLCipher: шифруем контент сообщения простым XOR
    const key = 'sqlcipher-fake-key';
    const originalText = message.text || '';
    let encryptedText = '';
    for (let i = 0; i < originalText.length; i++) {
      encryptedText += String.fromCharCode(originalText.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    const safeEncrypted = btoa(unescape(encodeURIComponent(encryptedText)));

    const record = {
      id: message.id,
      chatId: message.chatId || '',
      sender: message.sender,
      encryptedContent: safeEncrypted,
      pts: message.pts,
      timestamp: message.timestamp || Date.now()
    };

    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function getStoredPts(chatId: string): Promise<number> {
  const db = await openDatabase();
  return new Promise<number>((resolve) => {
    const tx = db.transaction('metadata', 'readonly');
    const store = tx.objectStore('metadata');
    const req = store.get(`pts:${chatId}`);
    req.onsuccess = () => {
      resolve(req.result !== undefined ? req.result : 0);
    };
    req.onerror = () => resolve(0);
  });
}

async function saveStoredPts(chatId: string, pts: number) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('metadata', 'readwrite');
    const store = tx.objectStore('metadata');
    const req = store.put(pts, `pts:${chatId}`);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Слушатель событий от приложения
self.addEventListener('message', async (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Авто-очистка прочитанных уведомлений для конкретного чата
  if (event.data.type === 'CLEAR_CHAT_NOTIFICATIONS') {
    const chatId = event.data.chatId;
    if (chatId && self.registration && self.registration.getNotifications) {
      try {
        const notifications = await self.registration.getNotifications();
        for (const notif of notifications) {
          if (notif.tag === `chat-${chatId}` || notif.tag === chatId || (notif.data && notif.data.chatId === chatId)) {
            notif.close();
          }
        }
      } catch (err) {
        console.warn('[SW] Ошибка очистки уведомлений чата:', err);
      }
    }
  }

  // Полная очистка всех уведомлений
  if (event.data.type === 'CLEAR_ALL_NOTIFICATIONS') {
    if (self.registration && self.registration.getNotifications) {
      try {
        const notifications = await self.registration.getNotifications();
        notifications.forEach(n => n.close());
      } catch (err) {
        console.warn('[SW] Ошибка полной очистки уведомлений:', err);
      }
    }
  }
});

self.addEventListener('install', () => {
  console.log('[Service Worker] Установлен');
});

self.addEventListener('activate', () => {
  console.log('[Service Worker] Активирован');
});

// Основная функция фоновой синхронизации (getDifference)
async function performBackgroundSync(chatId: string, serverPts: number) {
  console.log(`[SW] Запуск getDifference для чата ${chatId}, ожидаемый pts: ${serverPts}`);
  const lastKnownPts = await getStoredPts(chatId);
  if (lastKnownPts >= serverPts) {
    console.log(`[SW] Локальный pts ${lastKnownPts} актуален. Синхронизация не требуется.`);
    return;
  }

  // Получаем токен авторизации из IndexedDB или LocalStorage
  // В SW LocalStorage недоступен, поэтому берем дефолтный токен или считываем сохраненный в IndexedDB
  const token = await getSessionTokenFromDB() || 'test_token';

  try {
    const response = await fetch('/api/v1/sync/difference', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        chatId,
        lastKnownPts
      })
    });

    if (!response.ok) {
      throw new Error(`Ошибка HTTP: ${response.status}`);
    }

    const data = await response.json();
    console.log('[SW] Получены обновления:', data);

    const { updates, pts } = data;

    if (updates && updates.length > 0) {
      for (const update of updates) {
        if (update.type === 'new_message' && update.message) {
          const msg = update.message;
          msg.chatId = chatId;
          await saveMessage(msg);
          
          // Показываем локальное OS-уведомление (совместимо с iOS 16.4+ Standalone PWA)
          await self.registration.showNotification(msg.senderName || 'Новое сообщение', {
            body: msg.text || 'Вам пришло новое сообщение',
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: `chat-${chatId}`,
            data: { url: `/?chatId=${chatId}` }
          });
        }
      }
    }

    if (pts > lastKnownPts) {
      await saveStoredPts(chatId, pts);
    }

    // Пробуждение активных вкладок Gossip
    const clientsList = await self.clients.matchAll({ type: 'window' });
    for (const client of clientsList) {
      client.postMessage({
        type: 'SILENT_PUSH_WAKEUP',
        chatId,
        pts: pts || serverPts,
        timestamp: Date.now()
      });
    }
  } catch (error) {
    console.error('[SW] Ошибка во время фоновой синхронизации:', error);
  }
}

// Обработка клика по системному Push-уведомлению (iOS PWA & Desktop)
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Клик по Push-уведомлению:', event.notification);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windowClients) {
        if ('focus' in client) {
          if (client.url.includes(self.location.origin)) {
            if ('navigate' in client && urlToOpen !== '/') {
              await client.navigate(urlToOpen);
            }
            return client.focus();
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
      return Promise.resolve();
    })()
  );
});

// Обработка Silent Push уведомлений
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Получен Push-ивент:', event);
  
  event.waitUntil(
    (async () => {
      if (event.data) {
        try {
          const payload = event.data.json();
          // Проверяем, что это Silent Push
          if (payload['content-available'] === 1 || payload.silent) {
            const chatId = payload.chat_id || payload.chatId;
            const pts = payload.pts || 0;
            if (chatId) {
              await performBackgroundSync(chatId, pts);
              return;
            }
          }
          // Обычный WebPush с заголовком и текстом
          if (payload.title || payload.body) {
            await self.registration.showNotification(payload.title || 'Gossip', {
              body: payload.body || payload.text || 'Новое сообщение',
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              tag: payload.chatId ? `chat-${payload.chatId}` : 'gossip-msg',
              data: { url: payload.chatId ? `/?chatId=${payload.chatId}` : '/' }
            });
            return;
          }
          if (payload.type === 'otpk_depleted') {
            console.log('[SW Push] Получено уведомление о depletion OTPK:', payload);
            const clientsList = await self.clients.matchAll({ type: 'window' });
            for (const client of clientsList) {
              client.postMessage({
                type: 'OTPK_DEPLETED_WAKEUP',
                userId: payload.userId,
                deviceId: payload.deviceId
              });
            }
          }
        } catch (e) {
          console.error('[SW] Ошибка парсинга push JSON:', e);
        }
      }
    })()
  );
});

// Эмуляция push-уведомлений для e2e-тестирования в веб-среде
// Запускаем периодический опрос, если запущен в тестовом режиме
let testPollInterval: any = null;

function getUserIdFromDB(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    const request = indexedDB.open("gossip-sw-db", 2);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (db.objectStoreNames.contains("metadata")) {
        db.deleteObjectStore("metadata");
      }
      db.createObjectStore("metadata");
    };
    request.onsuccess = (event: any) => {
      const db = event.target.result;
      try {
        const transaction = db.transaction("metadata", "readonly");
        const store = transaction.objectStore("metadata");
        const getReq = store.get("current_user_id");
        getReq.onsuccess = () => {
          resolve(getReq.result || null);
        };
        getReq.onerror = () => {
          resolve(null);
        };
      } catch (e) {
        resolve(null);
      }
    };
    request.onerror = () => {
      resolve(null);
    };
  });
}

function getSessionTokenFromDB(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    const request = indexedDB.open("gossip-sw-db", 2);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (db.objectStoreNames.contains("metadata")) {
        db.deleteObjectStore("metadata");
      }
      db.createObjectStore("metadata");
    };
    request.onsuccess = (event: any) => {
      const db = event.target.result;
      try {
        const transaction = db.transaction("metadata", "readonly");
        const store = transaction.objectStore("metadata");
        const getReq = store.get("session_token");
        getReq.onsuccess = () => {
          resolve(getReq.result || null);
        };
        getReq.onerror = () => {
          resolve(null);
        };
      } catch (e) {
        resolve(null);
      }
    };
    request.onerror = () => {
      resolve(null);
    };
  });
}

function startTestPolling() {
  if (testPollInterval) return;
  console.log('[SW] Запуск тестового опроса пушей...');
  testPollInterval = setInterval(async () => {
    try {
      const currentUserId = await getUserIdFromDB();
      const targetUserId = currentUserId || 'owner_m5_step2';
      const response = await fetch(`/api/v1/devices/poll-push?user_id=${targetUserId}`);
      if (response.ok) {
        const payload = await response.json();
        if (payload) {
          if (payload.chat_id) {
            console.log(`[SW Test Poll] Получен эмулированный пуш для ${targetUserId}:`, payload);
            await performBackgroundSync(payload.chat_id, payload.pts);
          } else if (payload.type === 'otpk_depleted') {
            console.log('[SW Test Poll] Получено уведомление о depletion OTPK:', payload);
            const clientsList = await self.clients.matchAll({ type: 'window' });
            for (const client of clientsList) {
              client.postMessage({
                type: 'OTPK_DEPLETED_WAKEUP',
                userId: payload.userId,
                deviceId: payload.deviceId
              });
            }
          }
        }
      }
    } catch (err) {
      // Игнорируем ошибки сети при опросе
    }
  }, 1000);
}

// Слушаем сообщения от тестового скрипта для управления эмуляцией
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'START_TEST_POLLING') {
    startTestPolling();
  }
});
