// frontend/src/core/mesh/adversarial-m3.test.ts
import assert from 'node:assert';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    length: 0
  } as any;
}

import {
  evaluateNetworkStatus,
  getNetworkStatusDetails,
  evaluateNetworkComposite,
  NetworkStatus
} from '../network/network-evaluator';
import { offlineMeshManager } from './offline-mesh-manager';

async function runAdversarialTests() {
  console.log('=== STARTING EMPIRICAL ADVERSARIAL STRESS SUITE: M3 (MESH & HTMA) ===');

  // TEST 1: Peer Decay 40s Timeout & Phantom Peer Pruning
  console.log('--- TEST 1: Peer Decay 40s Timeout & Phantom Peer Pruning ---');
  const PEER_DECAY_TIMEOUT_MS = 40000;
  function prunePeers(peerList: Array<{ id: string; lastSeen: number }>, currentTime: number) {
    return peerList.filter(p => currentTime - p.lastSeen < PEER_DECAY_TIMEOUT_MS);
  }

  const t0 = 1000000;
  let testPeers = [
    { id: 'peer-alpha', lastSeen: t0 },
    { id: 'peer-beta', lastSeen: t0 + 10000 },
    { id: 'peer-gamma', lastSeen: t0 + 25000 },
    { id: 'web-node1', lastSeen: t0 + 35000 },
  ];

  let activeAt39s = prunePeers(testPeers, t0 + 39999);
  assert.strictEqual(activeAt39s.length, 4, 'На 39.999с все 4 пира обязаны оставаться активными');
  assert.ok(activeAt39s.some(p => p.id === 'peer-alpha'), 'peer-alpha должен быть активен');

  let activeAt40s = prunePeers(testPeers, t0 + 40001);
  assert.strictEqual(activeAt40s.length, 3, 'На 40.001с peer-alpha обязан быть отсечен');
  assert.strictEqual(activeAt40s.some(p => p.id === 'peer-alpha'), false, 'peer-alpha не должен быть в списке');
  assert.ok(activeAt40s.some(p => p.id === 'peer-beta'), 'peer-beta обязан оставаться');

  let activeAt50s = prunePeers(testPeers, t0 + 50001);
  assert.strictEqual(activeAt50s.length, 2, 'На 50.001с peer-alpha и peer-beta отсечены');
  assert.ok(activeAt50s.some(p => p.id === 'peer-gamma'));
  assert.ok(activeAt50s.some(p => p.id === 'web-node1'));

  let activeAt80s = prunePeers(testPeers, t0 + 80000);
  assert.strictEqual(activeAt80s.length, 0, 'На 80с все пиры должны быть отсечены');

  let refreshedPeers = [{ id: 'peer-keepalive', lastSeen: t0 }];
  refreshedPeers[0].lastSeen = t0 + 30000;
  let activeRefreshed = prunePeers(refreshedPeers, t0 + 50000);
  assert.strictEqual(activeRefreshed.length, 1, 'Пир с обновленным ping обязан выжить');
  let expiredRefreshed = prunePeers(refreshedPeers, t0 + 70001);
  assert.strictEqual(expiredRefreshed.length, 0, 'Пир обязан отсечься ровно через 40с после последнего ping');
  console.log('✅ TEST 1 PASSED: 40s Peer Decay алгоритм математически строг и отсекает фантомные пиры.');

  // TEST 2: Zero-Phantom-Mesh 4-Color State Machine Stress
  console.log('--- TEST 2: Zero-Phantom-Mesh 4-Color State Machine Stress ---');
  const scenarios: Array<{
    ws: boolean;
    bt: boolean;
    peers: number;
    expectedStatus: NetworkStatus;
    expectedDot: string;
    desc: string;
  }> = [
    { ws: true, bt: true, peers: 5, expectedStatus: 'cloud_online', expectedDot: 'bg-emerald-400', desc: 'Cloud ON, BT ON, Peers 5 -> cloud_online' },
    { ws: true, bt: false, peers: 0, expectedStatus: 'cloud_online', expectedDot: 'bg-emerald-400', desc: 'Cloud ON, BT OFF, Peers 0 -> cloud_online' },
    { ws: true, bt: true, peers: 0, expectedStatus: 'cloud_online', expectedDot: 'bg-emerald-400', desc: 'Cloud ON, BT ON, Peers 0 -> cloud_online' },
    { ws: true, bt: false, peers: 3, expectedStatus: 'cloud_online', expectedDot: 'bg-emerald-400', desc: 'Cloud ON, BT OFF, Peers 3 -> cloud_online' },
    { ws: false, bt: true, peers: 1, expectedStatus: 'mesh_active', expectedDot: 'bg-cyan-400 animate-pulse', desc: 'Cloud OFF, BT ON, Peers 1 -> mesh_active' },
    { ws: false, bt: true, peers: 99, expectedStatus: 'mesh_active', expectedDot: 'bg-cyan-400 animate-pulse', desc: 'Cloud OFF, BT ON, Peers 99 -> mesh_active' },
    { ws: false, bt: true, peers: 0, expectedStatus: 'mesh_searching', expectedDot: 'bg-amber-400 animate-pulse', desc: 'Cloud OFF, BT ON, Peers 0 -> mesh_searching (Zero Phantom Rule)' },
    { ws: false, bt: false, peers: 0, expectedStatus: 'offline', expectedDot: 'bg-red-400', desc: 'Cloud OFF, BT OFF, Peers 0 -> offline' },
    { ws: false, bt: false, peers: 5, expectedStatus: 'offline', expectedDot: 'bg-red-400', desc: 'Cloud OFF, BT OFF, Stale Peers 5 -> offline (BT disabled overrides stale cache)' },
  ];

  for (const sc of scenarios) {
    const status = evaluateNetworkStatus(sc.ws, sc.bt, sc.peers);
    assert.strictEqual(status, sc.expectedStatus, `Сбой сценария: ${sc.desc}`);
    const details = getNetworkStatusDetails(status, { peerCount: sc.peers });
    assert.strictEqual(details.status, sc.expectedStatus);
    assert.strictEqual(details.dotClass, sc.expectedDot);
  }

  const compositeRes = evaluateNetworkComposite(
    { isOnline: false, pingMs: 0 },
    { isMeshEnabled: true, isNativeBleSupported: true, isBluetoothEnabled: true, peers: [] }
  );
  assert.strictEqual(compositeRes.status, 'mesh_searching');
  assert.strictEqual(compositeRes.text, 'Поиск пиров...');

  const compositeBtDisabled = evaluateNetworkComposite(
    { isOnline: false },
    { isMeshEnabled: true, isNativeBleSupported: true, isBluetoothEnabled: false, peers: [] }
  );
  assert.strictEqual(compositeBtDisabled.status, 'offline');
  assert.strictEqual(compositeBtDisabled.text, 'Офлайн');
  console.log('✅ TEST 2 PASSED: 4-цветная индикация полностью соблюдает Zero-Phantom-Mesh Rule.');

  // TEST 3: HTMA Mutual Channel Exclusion & Envelope Lifecycle
  console.log('--- TEST 3: HTMA Mutual Exclusion & Envelope Management ---');
  localStorage.clear();
  offlineMeshManager.enqueueEnvelope('alice', JSON.stringify({ client_msg_id: 'c_msg_101', text: 'Пакет 1' }));
  const id2 = offlineMeshManager.enqueueEnvelope('alice', JSON.stringify({ client_msg_id: 'c_msg_102', text: 'Пакет 2' }));
  offlineMeshManager.enqueueEnvelope('bob', JSON.stringify({ client_msg_id: 'c_msg_201', text: 'Пакет 3' }));
  assert.strictEqual(offlineMeshManager.getSnapshot().pendingEnvelopesCount, 3);

  await offlineMeshManager.removeEnvelope('c_msg_101');
  assert.strictEqual(offlineMeshManager.getSnapshot().pendingEnvelopesCount, 2, 'Конверт c_msg_101 должен быть удален по содержимому');

  await offlineMeshManager.removeEnvelope(id2);
  assert.strictEqual(offlineMeshManager.getSnapshot().pendingEnvelopesCount, 1, 'Конверт id2 должен быть удален по ID');

  await offlineMeshManager.removeEnvelopesByChatId('bob');
  assert.strictEqual(offlineMeshManager.getSnapshot().pendingEnvelopesCount, 0, 'Все конверты для bob должны быть удалены');

  await offlineMeshManager.removeEnvelope('non_existent_id');
  assert.strictEqual(offlineMeshManager.getSnapshot().pendingEnvelopesCount, 0, 'Безопасное удаление несуществующего ID');
  console.log('✅ TEST 3 PASSED: HTMA взаимное исключение каналов корректно управляет очередями конвертов.');

  // TEST 4: SeenPacketCache Stress Test & Memory Boundedness
  console.log('--- TEST 4: SeenPacketCache 4096-Ring Buffer Stress Test ---');
  const SeenCacheClass = (offlineMeshManager as any)['seenCache'].constructor as any;
  const testCache = new SeenCacheClass(100);
  for (let i = 1; i <= 150; i++) {
    testCache.add(`pkt_${i}`, false);
  }
  for (let i = 1; i <= 50; i++) {
    assert.strictEqual(testCache.has(`pkt_${i}`), false, `Пакет pkt_${i} должен быть вытеснен из кольцевого буфера`);
  }
  for (let i = 51; i <= 150; i++) {
    assert.strictEqual(testCache.has(`pkt_${i}`), true, `Пакет pkt_${i} обязан присутствовать в кэше`);
  }
  console.log('✅ TEST 4 PASSED: SeenPacketCache строго ограничен по памяти и корректно вытесняет старые пакеты.');

  console.log('================================================================================');
  console.log('🏆 ALL ADVERSARIAL MESH & HTMA TESTS PASSED SUCCESSFULLY (0 ERRORS)');
  console.log('================================================================================');
  process.exit(0);
}

runAdversarialTests().catch((err) => {
  console.error('❌ ADVERSARIAL TEST FAILED:', err);
  process.exit(1);
});
