// frontend/src/features/pulse/__tests__/presets.test.ts
import assert from 'node:assert';
import {
  PULSE_PRESETS,
  getPresetById,
  getPresetsByDomain,
  buildInitialIntentFromPreset,
} from '../presets';
import { IntentDomain } from '../types';

export async function runPresetsTests() {
  console.log('=== UNIVERSAL PULSE ENGINE: PRESETS UNIT TESTS ===\n');

  // ---------------------------------------------------------------------------
  // TEST 1: Валидация списка пресетов и всех 6 доменов
  // ---------------------------------------------------------------------------
  console.log('[TEST 1] Проверка целостности каталога пресетов (все 6 доменов)...');
  assert.strictEqual(PULSE_PRESETS.length, 6, 'Должно быть ровно 6 базовых пресетов');

  const expectedDomains: IntentDomain[] = ['consensus', 'aid', 'gig', 'p2p', 'whistleblow', 'escrow'];
  const presentDomains = PULSE_PRESETS.map((p) => p.domain);

  for (const domain of expectedDomains) {
    assert.ok(presentDomains.includes(domain), `Домен ${domain} обязан присутствовать в пресетах`);
  }

  for (const preset of PULSE_PRESETS) {
    assert.ok(preset.id && preset.id.trim().length > 0, 'Каждый пресет должен иметь id');
    assert.ok(preset.title && preset.title.trim().length > 0, 'Каждый пресет должен иметь title');
    assert.ok(preset.description && preset.description.trim().length > 0, 'Каждый пресет должен иметь description');
    assert.ok(preset.categoryLabel && preset.categoryLabel.trim().length > 0, 'Каждый пресет должен иметь categoryLabel');
    assert.ok(preset.iconName && preset.iconName.trim().length > 0, 'Каждый пресет должен иметь iconName');
    assert.ok(Array.isArray(preset.defaultTags) && preset.defaultTags.length > 0, 'Каждый пресет должен иметь defaultTags');
    assert.strictEqual(preset.defaultPayload.domain, preset.domain, 'domain в defaultPayload должен совпадать');
  }
  console.log('  -> PASS: Все 6 доменов и обязательные поля пресетов проверены.\n');

  // ---------------------------------------------------------------------------
  // TEST 2: Специфические проверки полезной нагрузки каждого пресета
  // ---------------------------------------------------------------------------
  console.log('[TEST 2] Проверка доменной структуры каждого пресета...');

  // 1. Consensus
  const pollPreset = getPresetById('quick_poll');
  assert.ok(pollPreset, 'Пресет quick_poll должен существовать');
  assert.strictEqual(pollPreset.domain, 'consensus');
  assert.strictEqual(pollPreset.defaultPayload.interaction?.poll?.quorum, 50);
  assert.strictEqual(pollPreset.defaultPayload.interaction?.poll?.options?.length, 2);

  // 2. Aid
  const aidPreset = getPresetById('mutual_aid');
  assert.ok(aidPreset, 'Пресет mutual_aid должен существовать');
  assert.strictEqual(aidPreset.domain, 'aid');
  assert.strictEqual(aidPreset.defaultPayload.interaction?.aid?.targetAmount, 500);
  assert.strictEqual(aidPreset.defaultPayload.interaction?.aid?.currency, 'TON');
  assert.strictEqual(aidPreset.defaultPayload.interaction?.aid?.collectedAmount, 0);

  // 3. Gig
  const gigPreset = getPresetById('gig_task');
  assert.ok(gigPreset, 'Пресет gig_task должен существовать');
  assert.strictEqual(gigPreset.domain, 'gig');
  assert.strictEqual(gigPreset.defaultPayload.interaction?.gig?.budget, 1500);
  assert.strictEqual(gigPreset.defaultPayload.interaction?.gig?.currency, 'USDT');
  assert.strictEqual(gigPreset.defaultPayload.interaction?.gig?.escrowProtected, true);
  assert.ok(gigPreset.defaultPayload.interaction?.gig?.requiredSkills?.includes('TypeScript'));

  // 4. P2P
  const p2pPreset = getPresetById('p2p_deal');
  assert.ok(p2pPreset, 'Пресет p2p_deal должен существовать');
  assert.strictEqual(p2pPreset.domain, 'p2p');
  assert.strictEqual(p2pPreset.defaultPayload.interaction?.p2p?.offerCurrency, 'USDT');
  assert.strictEqual(p2pPreset.defaultPayload.interaction?.p2p?.receiveCurrency, 'RUB_CASH');
  assert.strictEqual(p2pPreset.defaultPayload.interaction?.p2p?.offerAmount, 2000);
  assert.strictEqual(p2pPreset.defaultPayload.interaction?.p2p?.rate, 92.5);
  assert.strictEqual(p2pPreset.defaultPayload.trustPolicy?.zkSolvencyRequired, true);

  // 5. Whistleblow
  const whistlePreset = getPresetById('whistleblow');
  assert.ok(whistlePreset, 'Пресет whistleblow должен существовать');
  assert.strictEqual(whistlePreset.domain, 'whistleblow');
  assert.strictEqual(whistlePreset.defaultPayload.interaction?.whistleblow?.thresholdSignatures, 10);
  assert.strictEqual(whistlePreset.defaultPayload.interaction?.whistleblow?.isEncrypted, true);
  assert.strictEqual(whistlePreset.defaultPayload.author?.isAnonymous, true);

  // 6. Smart Escrow
  const escrowPreset = getPresetById('smart_escrow');
  assert.ok(escrowPreset, 'Пресет smart_escrow должен существовать');
  assert.strictEqual(escrowPreset.domain, 'escrow');
  assert.strictEqual(escrowPreset.defaultPayload.interaction?.escrow?.totalStages, 4);
  assert.strictEqual(escrowPreset.defaultPayload.interaction?.escrow?.oracleType, 'sgs_inspection');
  assert.strictEqual(escrowPreset.defaultPayload.interaction?.escrow?.stages?.length, 4);
  assert.strictEqual(escrowPreset.defaultPayload.interaction?.escrow?.stages?.[0].status, 'active');
  assert.strictEqual(escrowPreset.defaultPayload.interaction?.escrow?.stages?.[1].status, 'pending');
  console.log('  -> PASS: Доменные модели всех 6 пресетов строго верифицированы.\n');

  // ---------------------------------------------------------------------------
  // TEST 3: Хелперы getPresetsByDomain и buildInitialIntentFromPreset
  // ---------------------------------------------------------------------------
  console.log('[TEST 3] Тестирование утилит getPresetsByDomain и buildInitialIntentFromPreset...');

  for (const domain of expectedDomains) {
    const list = getPresetsByDomain(domain);
    assert.ok(list.length >= 1, `Для домена ${domain} должен находиться минимум 1 пресет`);
    assert.ok(list.every((p) => p.domain === domain), `Все пресеты должны принадлежать домену ${domain}`);
  }

  const notFound = getPresetById('non_existent_id');
  assert.strictEqual(notFound, undefined, 'Несуществующий id должен возвращать undefined');

  const initialIntent = buildInitialIntentFromPreset(p2pPreset);
  assert.strictEqual(initialIntent.domain, 'p2p');
  assert.strictEqual(initialIntent.title, p2pPreset.defaultPayload.title);
  assert.strictEqual(initialIntent.status, 'active');
  assert.ok(Array.isArray(initialIntent.tags));
  assert.strictEqual(initialIntent.tags?.length, p2pPreset.defaultTags.length);
  assert.strictEqual(initialIntent.author?.isAnonymous, true);
  console.log('  -> PASS: Вспомогательные функции пресетов работают корректно.\n');

  console.log('=== ВСЕ ТЕСТЫ ПРЕСЕТОВ УСПЕШНО ПРОЙДЕНЫ (EXIT CODE 0) ===\n');
}

// Запуск тестов при прямом вызове
runPresetsTests().catch((err) => {
  console.error('ТЕСТ ПРЕСЕТОВ УПАЛ С ОШИБКОЙ:', err);
  process.exit(1);
});
