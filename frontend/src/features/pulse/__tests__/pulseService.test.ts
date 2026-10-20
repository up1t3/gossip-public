// frontend/src/features/pulse/__tests__/pulseService.test.ts
import assert from 'node:assert';
import { pulseService } from '../pulseService';
import { CreatePulseIntentRequest, VotePulseIntentRequest, AdvanceEscrowRequest } from '../types';

export async function runPulseServiceTests() {
  console.log('=== UNIVERSAL PULSE ENGINE: PULSE SERVICE UNIT TESTS ===\n');

  // Сохраняем исходный fetch для восстановления
  const originalFetch = globalThis.fetch;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: searchIntents — сборка query-параметров и обработка ответа
    // -------------------------------------------------------------------------
    console.log('[TEST 1] Тестирование searchIntents (фильтры, гео-радар, пагинация)...');
    let lastUrl = '';
    globalThis.fetch = (async (url: string | URL | Request) => {
      lastUrl = url.toString();
      return {
        ok: true,
        json: async () => ({
          ok: true,
          total: 2,
          intents: [
            {
              id: 'intent_p2p_01',
              title: 'Обмен USDT на RUB',
              domain: 'p2p',
              createdAt: '2026-08-23T10:00:00Z',
              author: { displayName: 'Trader_01' },
              interaction: { p2p: { offerAmount: 1000, receiveAmount: 92000 } },
            },
            {
              id: 'intent_aid_01',
              title: 'Сбор на приют',
              domain: 'aid',
              createdAt: '2026-08-23T11:00:00Z',
              author: { displayName: 'Charity_Admin' },
              interaction: { aid: { targetAmount: 500, collectedAmount: 150 } },
            },
          ],
        }),
      } as any;
    }) as any;

    const result = await pulseService.searchIntents({
      domain: 'p2p',
      searchQuery: 'обмен',
      h3Index: '888cf4340e5fffff',
      latitude: 55.75,
      longitude: 37.61,
      radiusKm: 15,
      minReputation: 20,
      zkSolvencyOnly: true,
    });

    assert.strictEqual(result.total, 2, 'Общее количество интентов должно быть 2');
    assert.strictEqual(result.intents.length, 2, 'Должно вернуться 2 карточки');
    assert.ok(lastUrl.includes('domain=p2p'), 'Query должен содержать domain=p2p');
    assert.ok(lastUrl.includes('query=%D0%BE%D0%B1%D0%BC%D0%B5%D0%BD') || lastUrl.includes('query='), 'Query должен содержать поисковый запрос');
    assert.ok(lastUrl.includes('h3Index=888cf4340e5fffff'), 'Query должен содержать h3Index');
    assert.ok(lastUrl.includes('lat=55.75'), 'Query должен содержать lat');
    assert.ok(lastUrl.includes('lon=37.61'), 'Query должен содержать lon');
    assert.ok(lastUrl.includes('radiusKm=15'), 'Query должен содержать radiusKm');
    assert.ok(lastUrl.includes('minReputation=20'), 'Query должен содержать minReputation');
    assert.ok(lastUrl.includes('zkSolvencyOnly=true'), 'Query должен содержать zkSolvencyOnly');
    console.log('  -> PASS: searchIntents формирует валидный HTTP URL и парсит DTO.\n');

    // -------------------------------------------------------------------------
    // TEST 2: getIntentById — успешное получение и обработка 404
    // -------------------------------------------------------------------------
    console.log('[TEST 2] Тестирование getIntentById...');
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('intent_not_found')) {
        return { ok: false, status: 404, json: async () => ({ detail: 'Not Found' }) } as any;
      }
      return {
        ok: true,
        json: async () => ({
          ok: true,
          intent: {
            id: 'intent_found_123',
            title: 'Найденный интент',
            domain: 'consensus',
            interaction: { poll: { quorum: 100, votesFor: 45 } },
          },
        }),
      } as any;
    }) as any;

    const found = await pulseService.getIntentById('intent_found_123');
    assert.ok(found, 'Интент должен быть получен');
    assert.strictEqual(found?.id, 'intent_found_123');
    assert.strictEqual(found?.domain, 'consensus');

    const notFound = await pulseService.getIntentById('intent_not_found');
    assert.strictEqual(notFound, null, 'Несуществующий интент должен возвращать null');
    console.log('  -> PASS: getIntentById корректно обрабатывает 200 OK и 404 Not Found.\n');

    // -------------------------------------------------------------------------
    // TEST 3: publishIntent — создание намерения и обработка ошибок валидации
    // -------------------------------------------------------------------------
    console.log('[TEST 3] Тестирование publishIntent...');
    let lastPostedBody: any = null;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      lastPostedBody = JSON.parse(init?.body as string);
      return {
        ok: true,
        json: async () => ({
          ok: true,
          intent_id: 'intent_created_999',
          simhash: 'a1b2c3d4e5f60718',
          intent: { id: 'intent_created_999', ...lastPostedBody },
        }),
      } as any;
    }) as any;

    const createReq: CreatePulseIntentRequest = {
      title: 'P2P Оффер USDT за наличные',
      description: 'Безопасный обмен в офисе Москва-Сити',
      domain: 'p2p',
      author: { displayName: 'SafeTrader', isAnonymous: false, reputationScore: 88 },
      interaction: {
        p2p: {
          offerAmount: 5000,
          offerCurrency: 'USDT',
          receiveAmount: 462500,
          receiveCurrency: 'RUB_CASH',
          rate: 92.5,
          paymentMethod: 'Офис',
        },
      },
    };

    const pubRes = await pulseService.publishIntent(createReq);
    assert.strictEqual(pubRes.ok, true);
    assert.strictEqual(pubRes.intent_id, 'intent_created_999');
    assert.strictEqual(pubRes.simhash, 'a1b2c3d4e5f60718');
    assert.strictEqual(lastPostedBody.title, 'P2P Оффер USDT за наличные');

    // Тест ошибки создания
    globalThis.fetch = (async () => {
      return {
        ok: false,
        json: async () => ({ detail: 'Заголовок не может быть пустым' }),
      } as any;
    }) as any;

    await assert.rejects(
      async () => {
        await pulseService.publishIntent({ ...createReq, title: '' });
      },
      /Заголовок не может быть пустым/,
      'Должно выбросить ошибку валидации с сервера'
    );
    console.log('  -> PASS: publishIntent корректно публикует намерение и выбрасывает ошибки.\n');

    // -------------------------------------------------------------------------
    // TEST 4: voteIntent — фиксация голосов и динамических донатов
    // -------------------------------------------------------------------------
    console.log('[TEST 4] Тестирование voteIntent (кворум, динамический донат, подпись)...');
    let voteRequestBody: any = null;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      voteRequestBody = JSON.parse(init?.body as string);
      return {
        ok: true,
        json: async () => ({
          ok: true,
          quorum_reached: false,
          message: 'Пожертвование на сумму 75.5 учтено',
        }),
      } as any;
    }) as any;

    const voteReq: VotePulseIntentRequest = {
      vote: 'for',
      amount: 75.5,
      donationAmount: 75.5,
      voterAddress: 'EQ_Test_Voter_01',
    };

    const voteRes = await pulseService.voteIntent('intent_aid_100', voteReq);
    assert.strictEqual(voteRes.ok, true);
    assert.strictEqual(voteRequestBody.amount, 75.5);
    assert.strictEqual(voteRequestBody.donationAmount, 75.5);
    assert.strictEqual(voteRequestBody.voterAddress, 'EQ_Test_Voter_01');
    console.log('  -> PASS: voteIntent передает динамические суммы пожертвований и адреса.\n');

    // -------------------------------------------------------------------------
    // TEST 5: advanceEscrow — продвижение multi-stage фаз со структурированным пруфом
    // -------------------------------------------------------------------------
    console.log('[TEST 5] Тестирование advanceEscrow...');
    let advanceBody: any = null;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      advanceBody = JSON.parse(init?.body as string);
      return {
        ok: true,
        json: async () => ({
          ok: true,
          stage_id: 2,
          current_stage: 2,
          message: 'Фаза 2 активирована',
        }),
      } as any;
    }) as any;

    const advanceReq: AdvanceEscrowRequest = {
      stageId: 2,
      action: 'complete',
      proof: JSON.stringify({ oracle: 'sgs_inspection', verified: true }),
    };

    const advRes = await pulseService.advanceEscrow('intent_escrow_555', advanceReq);
    assert.strictEqual(advRes.ok, true);
    assert.strictEqual(advRes.current_stage, 2);
    assert.ok(advanceBody.proof.includes('sgs_inspection'), 'Пруф должен содержать структуру оракула');
    console.log('  -> PASS: advanceEscrow успешно отправляет доказательство и обновляет фазу.\n');

    // -------------------------------------------------------------------------
    // TEST 6: cancelIntent — отмена намерения
    // -------------------------------------------------------------------------
    console.log('[TEST 6] Тестирование cancelIntent...');
    let cancelBody: any = null;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      cancelBody = JSON.parse(init?.body as string);
      return {
        ok: true,
        json: async () => ({
          ok: true,
          message: 'Интент отменен создателем',
        }),
      } as any;
    }) as any;

    const cancelRes = await pulseService.cancelIntent('intent_cancel_1', 'Сделка заключена в офисе', 'EQ_Creator_01');
    assert.strictEqual(cancelRes.ok, true);
    assert.strictEqual(cancelBody.reason, 'Сделка заключена в офисе');
    assert.strictEqual(cancelBody.authorAddress, 'EQ_Creator_01');
    console.log('  -> PASS: cancelIntent корректно аннулирует интент.\n');

    // -------------------------------------------------------------------------
    // TEST 7: findMatches — алгоритмический подбор SimHash + H3
    // -------------------------------------------------------------------------
    console.log('[TEST 7] Тестирование findMatches...');
    globalThis.fetch = (async () => {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          count: 1,
          matches: [
            {
              intent: { id: 'match_01', title: 'Встречный оффер RUB/USDT', domain: 'p2p' },
              score: 0.89,
              hammingDistance: 3,
              distanceKm: 2.4,
            },
          ],
        }),
      } as any;
    }) as any;

    const matches = await pulseService.findMatches('intent_target_01', 10, 5.0);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].score, 0.89);
    assert.strictEqual(matches[0].hammingDistance, 3);
    assert.strictEqual(matches[0].distanceKm, 2.4);
    console.log('  -> PASS: findMatches возвращает сопоставленные карточки и метрики.\n');

    // -------------------------------------------------------------------------
    // TEST 8: verifyZkSolvency — верификация Halo2 ZK-Proof
    // -------------------------------------------------------------------------
    console.log('[TEST 8] Тестирование verifyZkSolvency...');
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string);
      return {
        ok: true,
        json: async () => ({
          ok: true,
          verified: true,
          attestation_id: 'zk_att_2026_test',
          nullifier_hash: body.nullifierHash,
          min_amount_ton: body.minAmountTon,
          expires_in_hours: 24,
        }),
      } as any;
    }) as any;

    const zkRes = await pulseService.verifyZkSolvency({
      min_amount_ton: 100,
      min_deposit_age_days: 7,
    });
    assert.strictEqual(zkRes.verified, true);
    assert.strictEqual(zkRes.attestationId, 'zk_att_2026_test');
    assert.strictEqual(zkRes.minAmountTon, 100);
    assert.ok(zkRes.nullifierHash.startsWith('nullifier_'));
    console.log('  -> PASS: verifyZkSolvency генерирует и верифицирует аттестат.\n');

    console.log('=== ВСЕ 8 ТЕСТОВ PULSE SERVICE УСПЕШНО ПРОЙДЕНЫ (EXIT CODE 0) ===\n');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// Запуск тестов при прямом вызове
runPulseServiceTests().catch((err) => {
  console.error('ТЕСТ УПАЛ С ОШИБКОЙ:', err);
  process.exit(1);
});
