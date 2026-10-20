const { contextBridge, ipcRenderer } = require('electron');

// Безопасный мост для взаимодействия Electron и React
contextBridge.exposeInMainWorld('electronAPI', {
  // Отправка сообщений в главный процесс
  send: (channel, data) => {
    const validChannels = ['toMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  // Прием сообщений из главного процесса
  receive: (channel, func) => {
    const validChannels = ['fromMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  // Безопасный вызов IPC с возвратом значения
  invoke: async (channel, ...args) => {
    const validChannels = [
      'storage:open',
      'storage:query',
      'storage:execute',
      'storage:transaction'
    ];
    if (validChannels.includes(channel)) {
      return await ipcRenderer.invoke(channel, ...args);
    }
    throw new Error(`Неразрешенный IPC-канал: ${channel}`);
  }
});

console.log('[Preload] Мост API загружен с поддержкой Storage IPC');
