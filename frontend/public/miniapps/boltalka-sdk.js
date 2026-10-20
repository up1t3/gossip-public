/**
 * Boltalka Mini Apps SDK v1.0.0
 * Позволяет Mini Apps безопасно взаимодействовать с основным клиентом Boltalka.
 */
(function() {
  const pendingRequests = new Map();

  // Слушаем ответы от родительского приложения Boltalka
  window.addEventListener('message', (event) => {
    // В sandbox-режиме window.parent может быть недоступен напрямую,
    // но ответы приходят в виде событий message на window.
    const data = event.data;
    if (!data || typeof data !== 'object' || !data.id) {
      return;
    }

    const { id, result, error } = data;
    if (pendingRequests.has(id)) {
      const { resolve, reject } = pendingRequests.get(id);
      pendingRequests.delete(id);

      if (error) {
        reject(new Error(error));
      } else {
        resolve(result);
      }
    }
  });

  // Вспомогательная функция отправки запроса в родительское окно
  function sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = 'req_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      pendingRequests.set(id, { resolve, reject });

      // Отправляем сообщение родителю
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ id, method, params }, '*');
      } else {
        // Если запущено вне фрейма (для отладки)
        setTimeout(() => {
          pendingRequests.delete(id);
          reject(new Error('SDK must be run inside Boltalka sandbox iframe'));
        }, 100);
      }
    });
  }

  // Экспортируем API
  const BoltalkaSDK = {
    /**
     * Получить информацию о текущем авторизованном пользователе.
     * @returns {Promise<{id: string, username: string, name: string}>}
     */
    getUserInfo: function() {
      return sendRequest('get_user_info');
    },

    /**
     * Поделиться текстовым сообщением в текущем чате.
     * @param {string} text Текст сообщения.
     * @returns {Promise<{success: boolean}>}
     */
    shareMessage: function(text) {
      if (typeof text !== 'string' || !text.trim()) {
        return Promise.reject(new Error('Parameter "text" must be a non-empty string'));
      }
      return sendRequest('share_message', { text });
    },

    /**
     * Закрыть мини-приложение и вернуться в чат.
     * @returns {Promise<{success: boolean}>}
     */
    closeApp: function() {
      return sendRequest('close_app');
    }
  };

  // Делаем SDK доступным глобально
  window.BoltalkaSDK = BoltalkaSDK;
})();
