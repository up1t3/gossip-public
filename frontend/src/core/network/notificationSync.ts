// frontend/src/core/network/notificationSync.ts
import { Capacitor } from '@capacitor/core';

/**
 * Единый сервис синхронизации и очистки уведомлений в системном трее.
 * Обеспечивает удаление прочитанных уведомлений для Android (FCM/Local), iOS (APNs) и Web PWA (ServiceWorker).
 */
export class NotificationSyncService {
  private static isClearing = false;

  /**
   * Удаляет все доставленные уведомления для конкретного чата из системного трея.
   * @param chatId Идентификатор открытого чата
   */
  public static async clearChatNotifications(chatId: string): Promise<void> {
    if (!chatId) return;

    // 1. Очистка для нативных мобильных платформ (Capacitor)
    if (Capacitor.isNativePlatform()) {
      try {
        // Очистка Push-уведомлений
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const delivered = await PushNotifications.getDeliveredNotifications().catch(() => ({ notifications: [] }));
        
        if (delivered && delivered.notifications && delivered.notifications.length > 0) {
          const matchingPushes = delivered.notifications.filter((n: any) => {
            const d = n.data || {};
            const itemChatId = d.chatId || d.chat_id || d.chat || n.tag;
            return itemChatId === chatId || itemChatId === `chat-${chatId}`;
          });

          if (matchingPushes.length > 0) {
            await PushNotifications.removeDeliveredNotifications({ notifications: matchingPushes }).catch(() => {});
            console.log(`[NotificationSync] Удалено ${matchingPushes.length} push-уведомлений для чата ${chatId}`);
          }
        }
      } catch (err) {
        console.warn('[NotificationSync] Ошибка очистки PushNotifications:', err);
      }

      try {
        // Очистка локальных уведомлений
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const deliveredLocal = await LocalNotifications.getDeliveredNotifications().catch(() => ({ notifications: [] }));
        
        if (deliveredLocal && deliveredLocal.notifications && deliveredLocal.notifications.length > 0) {
          const matchingLocal = deliveredLocal.notifications.filter((n: any) => {
            const extra = n.extra || {};
            const itemChatId = extra.chatId || extra.chat_id || n.tag;
            return itemChatId === chatId || itemChatId === `chat-${chatId}`;
          });

          if (matchingLocal.length > 0) {
            await LocalNotifications.removeDeliveredNotifications({ notifications: matchingLocal }).catch(() => {});
            console.log(`[NotificationSync] Удалено ${matchingLocal.length} локальных уведомлений для чата ${chatId}`);
          }
        }
      } catch (err) {
        console.warn('[NotificationSync] Ошибка очистки LocalNotifications:', err);
      }
    }

    // 2. Очистка для браузера и PWA через Service Worker
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_CHAT_NOTIFICATIONS',
          chatId: chatId
        });
      } catch (swErr) {
        console.warn('[NotificationSync] Ошибка отправки CLEAR_CHAT_NOTIFICATIONS в SW:', swErr);
      }
    }
  }

  /**
   * Сбрасывает все системные уведомления приложения (например, при общем выходе или прочтении всех чатов).
   */
  public static async clearAllNotifications(): Promise<void> {
    if (this.isClearing) return;
    this.isClearing = true;

    try {
      if (Capacitor.isNativePlatform()) {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        await PushNotifications.removeAllDeliveredNotifications().catch(() => {});

        const { LocalNotifications } = await import('@capacitor/local-notifications');
        await LocalNotifications.removeAllDeliveredNotifications().catch(() => {});
      }

      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_ALL_NOTIFICATIONS'
        });
      }

      if (typeof navigator !== 'undefined' && 'clearAppBadge' in navigator) {
        (navigator as any).clearAppBadge().catch(() => {});
      }
    } catch (e) {
      console.warn('[NotificationSync] Ошибка очистки всех уведомлений:', e);
    } finally {
      this.isClearing = false;
    }
  }

  /**
   * Устанавливает числовой бейдж непрочитанных сообщений на иконке приложения.
   */
  public static updateBadge(count: number): void {
    if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
      if (count > 0) {
        (navigator as any).setAppBadge(count).catch(() => {});
      } else {
        (navigator as any).clearAppBadge().catch(() => {});
      }
    }
  }
}
