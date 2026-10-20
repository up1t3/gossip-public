// frontend/src/core/network/network-evaluator.test.ts
import assert from 'node:assert';
import {
  evaluateNetworkStatus,
  getNetworkStatusDetails,
  evaluateNetworkComposite,
} from './network-evaluator';

export async function runNetworkEvaluatorTests() {
  console.log('--- Запуск тестов Zero-Phantom-Mesh Network Evaluator (RFC-2026-004 § 4.5 / F8) ---');

  // 1. Приоритет облака (cloud_online)
  assert.strictEqual(evaluateNetworkStatus(true, false, 0), 'cloud_online', 'Облако должно иметь наивысший приоритет');
  assert.strictEqual(evaluateNetworkStatus(true, true, 5), 'cloud_online', 'Облако должно иметь приоритет над активным Mesh');
  assert.strictEqual(evaluateNetworkStatus(true, true, 0), 'cloud_online', 'Облако должно иметь приоритет при 0 пиров');

  // 2. Mesh активен (mesh_active)
  assert.strictEqual(evaluateNetworkStatus(false, true, 1), 'mesh_active', '1 пир при включенном BT -> mesh_active');
  assert.strictEqual(evaluateNetworkStatus(false, true, 12), 'mesh_active', '12 пиров при включенном BT -> mesh_active');

  // 3. Mesh поиск (mesh_searching)
  assert.strictEqual(evaluateNetworkStatus(false, true, 0), 'mesh_searching', '0 пиров при включенном BT -> mesh_searching');

  // 4. Офлайн (offline)
  assert.strictEqual(evaluateNetworkStatus(false, false, 0), 'offline', 'Выключенный BT -> offline');
  assert.strictEqual(evaluateNetworkStatus(false, false, 5), 'offline', 'Выключенный BT даже с кэшем -> offline');

  // 5. getNetworkStatusDetails для всех 4 состояний
  const cloudDetails = getNetworkStatusDetails('cloud_online', {
    pingMs: 45,
    isAntiDpiActive: false,
    currentProtocol: 'https'
  });
  assert.strictEqual(cloudDetails.status, 'cloud_online');
  assert.strictEqual(cloudDetails.dotClass, 'bg-emerald-400');
  assert.strictEqual(cloudDetails.text, '45ms');
  assert.ok(cloudDetails.label.includes('HTTPS'));

  const antiDpiDetails = getNetworkStatusDetails('cloud_online', {
    pingMs: 120,
    isAntiDpiActive: true,
    currentProtocol: 'fake_tls'
  });
  assert.strictEqual(antiDpiDetails.dotClass, 'bg-purple-400 animate-pulse');
  assert.ok(antiDpiDetails.label.includes('Anti-DPI'));

  const meshActiveDetails = getNetworkStatusDetails('mesh_active', { peerCount: 3 });
  assert.strictEqual(meshActiveDetails.status, 'mesh_active');
  assert.strictEqual(meshActiveDetails.dotClass, 'bg-cyan-400 animate-pulse');
  assert.strictEqual(meshActiveDetails.text, 'Mesh (3)');
  assert.ok(meshActiveDetails.label.includes('BLE Mesh Активен'));

  const meshSearchDetails = getNetworkStatusDetails('mesh_searching', { peerCount: 0 });
  assert.strictEqual(meshSearchDetails.status, 'mesh_searching');
  assert.strictEqual(meshSearchDetails.dotClass, 'bg-amber-400 animate-pulse');
  assert.strictEqual(meshSearchDetails.text, 'Поиск пиров...');

  const offlineDetails = getNetworkStatusDetails('offline');
  assert.strictEqual(offlineDetails.status, 'offline');
  assert.strictEqual(offlineDetails.dotClass, 'bg-red-400');
  assert.strictEqual(offlineDetails.text, 'Офлайн');

  // 6. evaluateNetworkComposite
  const res1 = evaluateNetworkComposite(
    { isOnline: true, pingMs: 32, isAntiDpiActive: false, currentProtocol: 'https' },
    { isMeshEnabled: true, isNativeBleSupported: true, isBluetoothEnabled: true, peers: [] }
  );
  assert.strictEqual(res1.status, 'cloud_online');

  const res2 = evaluateNetworkComposite(
    { isOnline: false, pingMs: 0, isAntiDpiActive: false },
    { isMeshEnabled: true, isNativeBleSupported: true, isBluetoothEnabled: true, peers: [{ id: 'p1' }, { id: 'p2' }] }
  );
  assert.strictEqual(res2.status, 'mesh_active');
  assert.strictEqual(res2.text, 'Mesh (2)');

  const res3 = evaluateNetworkComposite(
    { isOnline: false, pingMs: 0, isAntiDpiActive: false },
    { isMeshEnabled: true, isNativeBleSupported: true, isBluetoothEnabled: true, peers: [] }
  );
  assert.strictEqual(res3.status, 'mesh_searching');

  const res4 = evaluateNetworkComposite(
    { isOnline: false, pingMs: 0, isAntiDpiActive: false },
    { isMeshEnabled: true, isNativeBleSupported: true, isBluetoothEnabled: false, peers: [] }
  );
  assert.strictEqual(res4.status, 'offline');

  // 7. F-15: wsConnected — первичная истина для cloud_online (§14 в обе стороны)
  // Живой WS + неудачная HTTP-проба (isOnline=false) => честный зелёный Online
  const resF15a = evaluateNetworkComposite(
    { isOnline: false, wsConnected: true, pingMs: 87 },
    { isMeshEnabled: true, isNativeBleSupported: true, isBluetoothEnabled: true, peers: [] }
  );
  assert.strictEqual(resF15a.status, 'cloud_online');

  // Мёртвый WS + успешная HTTP-проба => НЕ cloud_online (сокет — истина, не проба)
  const resF15b = evaluateNetworkComposite(
    { isOnline: true, wsConnected: false },
    { isMeshEnabled: true, isNativeBleSupported: true, isBluetoothEnabled: true, peers: [{ id: 'p1' }] }
  );
  assert.strictEqual(resF15b.status, 'mesh_active');

  // wsConnected неизвестен (легаси-вызов) => прежнее поведение по isOnline
  const resF15c = evaluateNetworkComposite(
    { isOnline: false },
    { isMeshEnabled: true, isNativeBleSupported: true, isBluetoothEnabled: true, peers: [] }
  );
  assert.strictEqual(resF15c.status, 'mesh_searching');

  console.log('✅ Все тесты Zero-Phantom-Mesh Network Evaluator успешно пройдены!');
}

if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('network-evaluator.test')) {
  runNetworkEvaluatorTests().catch((err) => {
    console.error('❌ Ошибка тестирования network-evaluator:', err);
    process.exit(1);
  });
}
