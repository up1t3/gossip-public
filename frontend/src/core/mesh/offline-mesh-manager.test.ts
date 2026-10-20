// frontend/src/core/mesh/offline-mesh-manager.test.ts
import assert from 'node:assert';

// Полифилл localStorage для среды Node.js
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

import { offlineMeshManager } from './offline-mesh-manager';
import { migrations } from '../storage/migrations';

export async function runOfflineMeshManagerTests() {
  console.log('--- Запуск тестов OfflineMeshManager & HTMA (RFC-2026-004 § 4.4 / F9) ---');
  localStorage.clear();

  // 1. Тест enqueueEnvelope и removeEnvelope
  const recipientTag = 'user_alice_123';
  const payload = JSON.stringify({
    messageId: 'msg_test_abc',
    senderId: 'me',
    ciphertext: 'enc_data_12345'
  });

  const envId = offlineMeshManager.enqueueEnvelope(recipientTag, payload);
  assert.ok(envId, 'Конверт должен быть создан');

  const snapshotBefore = offlineMeshManager.getSnapshot();
  assert.ok(snapshotBefore.pendingEnvelopesCount > 0, 'В очереди должен быть хотя бы 1 конверт');

  // Удаление конверта по messageId (HTMA)
  await offlineMeshManager.removeEnvelope('msg_test_abc');

  // Удаление по envelope ID
  await offlineMeshManager.removeEnvelope(envId);
  const snapshotAfterEnv = offlineMeshManager.getSnapshot();
  assert.strictEqual(snapshotAfterEnv.pendingEnvelopesCount, 0, 'Очередь должна быть очищена');

  // 2. Тест removeEnvelopesByChatId
  const chatId = 'chat_999';
  offlineMeshManager.enqueueEnvelope(chatId, JSON.stringify({ messageId: 'm1', chatId }));
  offlineMeshManager.enqueueEnvelope(chatId, JSON.stringify({ messageId: 'm2', chatId }));
  offlineMeshManager.enqueueEnvelope('chat_other', JSON.stringify({ messageId: 'm3', chatId: 'chat_other' }));

  assert.strictEqual(offlineMeshManager.getSnapshot().pendingEnvelopesCount, 3);

  await offlineMeshManager.removeEnvelopesByChatId(chatId);
  assert.strictEqual(offlineMeshManager.getSnapshot().pendingEnvelopesCount, 1);

  await offlineMeshManager.removeEnvelopesByChatId('chat_other');
  assert.strictEqual(offlineMeshManager.getSnapshot().pendingEnvelopesCount, 0);

  // 3. Тест структуры MeshStateSnapshot
  const snapshot = offlineMeshManager.getSnapshot();
  assert.ok('isMeshEnabled' in snapshot, 'isMeshEnabled присутствует');
  assert.ok('isRelayMode' in snapshot, 'isRelayMode присутствует');
  assert.ok('peers' in snapshot, 'peers присутствует');
  assert.ok('isBluetoothEnabled' in snapshot, 'isBluetoothEnabled присутствует');
  assert.ok('hasPermissions' in snapshot, 'hasPermissions присутствует');

  // 4. Тест миграции SQLite v13
  const migration13 = migrations.find((m) => m.version === 13);
  assert.ok(migration13, 'Миграция v13 должна быть определена');
  assert.ok(migration13?.up, 'Миграция v13 содержит массив up');

  const allSql = migration13!.up.join('\n');
  assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS mesh_envelopes'), 'Таблица mesh_envelopes создается');
  assert.ok(allSql.includes('envelope_id TEXT PRIMARY KEY'), 'Поле envelope_id PRIMARY KEY');
  assert.ok(allSql.includes('chat_id TEXT NOT NULL'), 'Поле chat_id');
  assert.ok(allSql.includes('cipher_payload TEXT NOT NULL'), 'Поле cipher_payload');
  assert.ok(allSql.includes('idx_mesh_envelopes_created'), 'Индекс idx_mesh_envelopes_created');
  assert.ok(allSql.includes('ALTER TABLE outbox_queue ADD COLUMN dispatched_via_mesh INTEGER DEFAULT 0'), 'Колонка dispatched_via_mesh добавлена');

  // 5. Dual Identity Standard (v1.7.10): аккаунт- и радио-идентичности разделены.
  // Радио-хеш аккаунта коллидировал у устройств одного аккаунта — нативный self-фильтр
  // сканера взаимно отбрасывал их как «самих себя» (0 пиров, вечный «Поиск пиров...»).
  localStorage.clear();
  localStorage.setItem('current_user_id', 'user-dual-identity-account');
  const mgr = offlineMeshManager as any;
  mgr.initNodeIdentity();

  assert.strictEqual(mgr.localNodeId, 'user-dual-identity-account', 'localNodeId = UUID аккаунта');
  assert.ok(typeof mgr.localDeviceId === 'string' && mgr.localDeviceId.startsWith('dev-'), 'localDeviceId = per-device (dev-*)');
  assert.strictEqual(localStorage.getItem('gossip_mesh_device_id'), mgr.localDeviceId, 'радио-идентичность персистентна');

  // Устройство B того же аккаунта: аккаунт совпадает, радио — разное
  const radioDeviceA = mgr.localDeviceId;
  localStorage.removeItem('gossip_mesh_device_id');
  localStorage.removeItem('device_id');
  mgr.initNodeIdentity();
  assert.strictEqual(mgr.localNodeId, 'user-dual-identity-account', 'аккаунт второго устройства совпадает');
  assert.notStrictEqual(mgr.localDeviceId, radioDeviceA, 'радио-идентичности устройств обязаны различаться');

  const identitySnapshot = offlineMeshManager.getSnapshot();
  assert.strictEqual(identitySnapshot.localDeviceId, mgr.localDeviceId, 'snapshot.localDeviceId доступен для echo-фильтра и senderDeviceId');

  // 6. Тест hasEnvelope и Radio-ACK (mesh_ack) с извлечением messageId
  const ackTargetEnvId = offlineMeshManager.enqueueEnvelope(
    'peer_bob_777',
    JSON.stringify({ id: 'temp-radio-ack-900', chatId: 'peer_bob_777', text: '{"ciphertextHex":"00"}' })
  );
  assert.strictEqual(offlineMeshManager.hasEnvelope('temp-radio-ack-900'), true, 'hasEnvelope обязан находить конверт по внутреннему msgId');
  assert.strictEqual(offlineMeshManager.hasEnvelope(ackTargetEnvId), true, 'hasEnvelope обязан находить конверт по envelopeId');

  await mgr.handleIncomingEnvelopeDirect({
    id: `ack_${ackTargetEnvId}`,
    recipientTag: 'mesh_ack',
    encryptedPayload: JSON.stringify({ type: 'mesh_ack', ackFor: ackTargetEnvId }),
    ttl: 1,
    hopCount: 0,
    timestamp: Date.now()
  });
  assert.strictEqual(offlineMeshManager.hasEnvelope('temp-radio-ack-900'), false, 'После получения Radio-ACK конверт обязан быть удален из очереди');

  console.log('✅ Все тесты OfflineMeshManager & HTMA успешно пройдены!');
}

if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('offline-mesh-manager.test')) {
  runOfflineMeshManagerTests().then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error('❌ Ошибка тестирования offline-mesh-manager:', err);
    process.exit(1);
  });
}
