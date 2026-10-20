// frontend/src/core/transport/lan/lan-transport.test.ts
/**
 * Unit-тесты для LAN Transport & Direct Peer Socket (Вектор 2: Phase T1).
 */

import assert from 'node:assert';
import {
  MeshEnvelope,
  SeenPacketCache,
  deriveDeviceIdHash,
  deriveDeviceIdHashSync,
  getPeerAlias,
  isEchoEnvelope,
} from '../transport';
import { LANTransport } from './lan-transport';

export async function runLanTransportTests(): Promise<void> {
  console.log('--- Запуск тестов LAN Transport & Direct Peer Socket (Phase T1) ---');

  // 1. Dual Identity
  const hash1 = await deriveDeviceIdHash('device-iphone-15');
  assert.match(hash1, /^[0-9a-f]{8}$/, 'Хэш устройства должен быть 8 hex-символов');

  const syncHash = deriveDeviceIdHashSync('sync-device');
  assert.match(syncHash, /^[0-9a-f]{8}$/, 'Синхронный хэш должен быть 8 hex-символов');

  const alias = getPeerAlias('1234abcd');
  assert.strictEqual(alias, 'gossip-1234abcd', 'Алиас должен соответствовать gossip-<hash>');

  // 2. Echo Filter
  const echoEnv: MeshEnvelope = {
    id: 'env-echo',
    recipientTag: 'tag',
    encryptedPayload: 'payload',
    ttl: 3,
    hopCount: 0,
    timestamp: Date.now(),
    senderDeviceId: 'local-did',
  };
  assert.strictEqual(isEchoEnvelope(echoEnv, 'local-did'), true, 'Собственный пакет должен быть эхом');
  assert.strictEqual(isEchoEnvelope(echoEnv, 'other-did'), false, 'Чужой пакет не должен быть эхом');

  // 3. SeenPacketCache
  const cache = new SeenPacketCache(5);
  assert.strictEqual(cache.add('p1', false), true);
  assert.strictEqual(cache.add('p1', false), false);
  assert.strictEqual(cache.has('p1'), true);

  // 4. LANTransport
  const transport = new LANTransport({
    deviceId: 'test-lan-device',
    portRangeStart: 46090,
    portRangeEnd: 46099,
  });

  assert.strictEqual(transport.id, 'lan');
  assert.strictEqual(transport.priority, 2);
  assert.strictEqual(transport.mtu, 1048576);

  await transport.start();
  assert.strictEqual(transport.getStatus().isRunning, true);

  await transport.stop();
  assert.strictEqual(transport.getStatus().isRunning, false);

  console.log('--- Все тесты LAN Transport успешно пройдены! ---');
}