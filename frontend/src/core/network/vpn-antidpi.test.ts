// frontend/src/core/network/vpn-antidpi.test.ts
import assert from 'node:assert';

const store = new Map<string, string>();
const mockLocalStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => store.set(k, String(v)),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
};

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = globalThis;
}
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = mockLocalStorage;
}

import { connectionManager } from './connection-manager';
import { tdlib } from '../tdlib/tdlib-adapter';

export async function runVpnAntiDpiTests() {
  console.log('--- Запуск тестов VPN & Anti-DPI (ТСПУ) Resilience Suite ---');

  globalThis.localStorage.clear();
  (connectionManager as any).initFromStorage();

  // 1. Все 3 шлюза настроены по HTTPS на валидных TLS-портах (443, 8443, 9443)
  const snapshot = connectionManager.getSnapshot();
  const urls = snapshot.gateways.map((g) => g.url);
  assert.ok(urls.includes('https://skuf-net.ru'), 'Официальный шлюз https://skuf-net.ru присутствует');
  assert.ok(urls.includes('https://skuf-net.ru:8443'), 'Анти-ТСПУ шлюз https://skuf-net.ru:8443 присутствует');
  assert.ok(urls.includes('https://skuf-net.ru:9443'), 'Резервный Envoy TLS шлюз https://skuf-net.ru:9443 присутствует');
  assert.ok(!urls.some((u) => u.startsWith('http://') && u.endsWith(':8080')), 'Старый нерабочий http://*:8080 удален');

  // 2. Авто-лечение залипшего старого кастомного plaintext шлюза :8080
  globalThis.localStorage.setItem('gossip_custom_backend_url', 'http://203.0.113.10:8080');
  globalThis.localStorage.setItem('gossip_active_gateway_id', 'custom');
  (connectionManager as any).initFromStorage();
  assert.strictEqual(connectionManager.getSnapshot().activeGatewayId, 'official');
  assert.strictEqual(globalThis.localStorage.getItem('gossip_custom_backend_url'), null);

  // 3. Реактивное переподключение TDLibAdapter при смене шлюза в ConnectionManager
  (tdlib as any).initNetworkListeners();
  let reconnectCount = 0;
  const origReconnect = tdlib.forceReconnect.bind(tdlib);
  tdlib.forceReconnect = () => {
    reconnectCount += 1;
  };

  connectionManager.setGateway('fake_tls');
  assert.ok(reconnectCount >= 1, 'forceReconnect вызван при переключении на fake_tls');
  assert.strictEqual(connectionManager.getSnapshot().isAntiDpiActive, true);
  assert.strictEqual(connectionManager.getActiveBackendUrl(), 'https://skuf-net.ru:8443');

  connectionManager.setGateway('gateway_1');
  assert.strictEqual(connectionManager.getActiveBackendUrl(), 'https://skuf-net.ru:9443');

  connectionManager.setGateway('official');
  assert.strictEqual(connectionManager.getActiveBackendUrl(), 'https://skuf-net.ru');
  tdlib.forceReconnect = origReconnect;

  // 4. Генерация криптографического шума переменной длины (_pad) против DPI-классификаторов
  const pad1: string = (tdlib as any).generateAntiDpiNoise();
  const pad2: string = (tdlib as any).generateAntiDpiNoise();
  assert.strictEqual(typeof pad1, 'string');
  assert.ok(pad1.length >= 32 && pad1.length <= 128, 'Длина _pad в диапазоне 32..128 hex-символов');
  assert.notStrictEqual(pad1, pad2, 'Каждый пакет получает уникальный рандомизированный _pad');

  console.log('✅ Все тесты VPN & Anti-DPI (ТСПУ) Resilience Suite успешно пройдены!');
}

if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('vpn-antidpi.test')) {
  runVpnAntiDpiTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Ошибка тестирования vpn-antidpi:', err);
      process.exit(1);
    });
}
