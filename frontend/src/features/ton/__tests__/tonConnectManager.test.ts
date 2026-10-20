// frontend/src/features/ton/__tests__/tonConnectManager.test.ts
import assert from 'node:assert';
import {
  tonToNanotonsStr,
  nanotonsToTonStr,
  usdtToMicroUnitsStr,
  microUnitsToUsdtStr,
  createCommentPayloadBoc,
  tonConnectManager,
  SUPPORTED_WALLETS,
  openDeepLink,
  openCryptoDeepLink,
  isOpenMaskInstalled,
  isWalletExtensionInstalled,
} from '../tonConnectManager';

// Мок localStorage для герметичных тестов
const testStorage: Record<string, string> = {};
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (key: string) => testStorage[key] || null,
    setItem: (key: string, value: string) => { testStorage[key] = value; },
    removeItem: (key: string) => { delete testStorage[key]; },
    clear: () => { for (const k in testStorage) delete testStorage[k]; },
  };
}

export async function runTonManagerTests() {
  console.log('=== ТЕСТИРОВАНИЕ TON CONNECT 2.0 И ВЫЧИСЛЕНИЙ ВЫСОКОЙ ТОЧНОСТИ ===\n');

  // 1. tonToNanotonsStr (10^9 scale)
  console.log('1. Проверка tonToNanotonsStr (целые и дробные суммы)...');
  assert.strictEqual(tonToNanotonsStr('1'), '1000000000', '1 TON должен быть 10^9 nanoTON');
  assert.strictEqual(tonToNanotonsStr('5'), '5000000000', '5 TON должен быть 5*10^9 nanoTON');
  assert.strictEqual(tonToNanotonsStr('100'), '100000000000');
  assert.strictEqual(tonToNanotonsStr('0'), '0');
  assert.strictEqual(tonToNanotonsStr('1.5'), '1500000000');
  assert.strictEqual(tonToNanotonsStr('0.1'), '100000000');
  assert.strictEqual(tonToNanotonsStr('0.000000001'), '1', '1 nanoTON должен быть 1');
  assert.strictEqual(tonToNanotonsStr('0.123456789'), '123456789');
  assert.strictEqual(tonToNanotonsStr('12.345678901'), '12345678901');
  assert.strictEqual(tonToNanotonsStr('  2.5  '), '2500000000');
  assert.strictEqual(tonToNanotonsStr(''), '0');
  console.log('-> tonToNanotonsStr: УСПЕШНО\n');

  // 2. nanotonsToTonStr
  console.log('2. Проверка nanotonsToTonStr...');
  assert.strictEqual(nanotonsToTonStr('1000000000'), '1');
  assert.strictEqual(nanotonsToTonStr('1500000000'), '1.5');
  assert.strictEqual(nanotonsToTonStr('1'), '0.000000001');
  assert.strictEqual(nanotonsToTonStr('123456789'), '0.123456789');
  assert.strictEqual(nanotonsToTonStr('0'), '0');
  assert.strictEqual(nanotonsToTonStr(5000000000n), '5');
  console.log('-> nanotonsToTonStr: УСПЕШНО\n');

  // 3. USDT Fixed-Point Math (10^6 scale)
  console.log('3. Проверка USDT микроюнитов (10^6 scale)...');
  assert.strictEqual(usdtToMicroUnitsStr('1'), '1000000');
  assert.strictEqual(usdtToMicroUnitsStr('10.5'), '10500000');
  assert.strictEqual(usdtToMicroUnitsStr('0.000001'), '1');
  assert.strictEqual(microUnitsToUsdtStr('1000000'), '1');
  assert.strictEqual(microUnitsToUsdtStr('10500000'), '10.5');
  assert.strictEqual(microUnitsToUsdtStr('1'), '0.000001');
  assert.strictEqual(microUnitsToUsdtStr('0'), '0');
  console.log('-> USDT Fixed-Point Math: УСПЕШНО\n');

  // 4. createCommentPayloadBoc
  console.log('4. Проверка кодирования комментария в Base64 BOC...');
  const comment = 'test_memo_123';
  const bocBase64 = createCommentPayloadBoc(comment);
  assert.strictEqual(typeof bocBase64, 'string');
  assert.ok(bocBase64.length > 0);
  assert.strictEqual(createCommentPayloadBoc(''), '');
  console.log('-> createCommentPayloadBoc: УСПЕШНО\n');

  // 5. Проверка SUPPORTED_WALLETS (R1, R2, R3)
  console.log('5. Проверка конфигурации SUPPORTED_WALLETS (R1, R2, R3)...');
  assert.ok(SUPPORTED_WALLETS.length >= 4, 'Должно быть минимум 4 кошелька');
  
  const mtw = SUPPORTED_WALLETS.find(w => w.id === 'mytonwallet');
  assert.ok(mtw, 'MyTonWallet должен присутствовать в списке');
  assert.strictEqual(mtw.universalLink, 'https://mytonwallet.app/connect', 'R1: MyTonWallet universal link должен быть на .app');
  assert.strictEqual(mtw.aboutUrl, 'https://mytonwallet.app', 'R1: MyTonWallet aboutUrl должен быть на .app');
  assert.strictEqual(mtw.iconUrl, 'https://mytonwallet.app/icon-256.png', 'R1: MyTonWallet иконка должна быть на .app');
  assert.strictEqual(mtw.deepLinkPrefix, 'mytonwallet://', 'R1: MyTonWallet схема должна быть mytonwallet://');

  const openmask = SUPPORTED_WALLETS.find(w => w.id === 'openmask');
  assert.ok(openmask, 'OpenMask должен присутствовать в списке');
  assert.strictEqual(
    openmask.chromeWebStoreUrl,
    'https://chromewebstore.google.com/detail/openmask/pinfdafnadjiekknmfdamnanacklnclb',
    'R2: OpenMask должен иметь ссылку на Chrome Web Store'
  );

  const tgWallet = SUPPORTED_WALLETS.find(w => w.id === 'telegram-wallet');
  assert.ok(tgWallet, 'Telegram Wallet должен присутствовать в списке');
  assert.strictEqual(
    tgWallet.universalLink,
    'https://t.me/wallet/start?startapp=tonconnect',
    'R3: Telegram Wallet universal link должен использовать формат TMA startapp=tonconnect'
  );
  assert.strictEqual(
    tgWallet.deepLinkPrefix,
    'tg://resolve?domain=wallet&startapp=tonconnect',
    'R3: Telegram Wallet deep link должен использовать формат tg://resolve?domain=wallet&startapp=tonconnect'
  );
  console.log('-> SUPPORTED_WALLETS (R1, R2, R3): УСПЕШНО\n');

  // 6. Проверка детектирования расширений (R2)
  console.log('6. Проверка функций детектирования расширений...');
  assert.strictEqual(typeof isOpenMaskInstalled, 'function');
  assert.strictEqual(typeof isWalletExtensionInstalled, 'function');
  assert.strictEqual(isOpenMaskInstalled(), false, 'В среде Node без window.openmask должно возвращаться false');
  assert.strictEqual(isWalletExtensionInstalled('openmask'), false);
  assert.strictEqual(isWalletExtensionInstalled('tonkeeper'), false);
  assert.strictEqual(isWalletExtensionInstalled('mytonwallet'), false);

  // Тест с моком window.openmask
  (globalThis as any).window = {
    openmask: { tonconnect: { isTonConnect: true } },
    location: { origin: 'http://localhost:3000', href: '' },
    open: () => ({}),
  };
  assert.strictEqual(isOpenMaskInstalled(), true, 'При наличии window.openmask должно возвращаться true');
  assert.strictEqual(isWalletExtensionInstalled('openmask'), true);

  // Сброс мока window
  delete (globalThis as any).window;
  console.log('-> Детектирование расширений (R2): УСПЕШНО\n');

  // 7. Проверка connectWallet и устранения фиктивных адресов (R4.1)
  console.log('7. Проверка tonConnectManager и устранения генерации фиктивных адресов (R4.1)...');
  
  // А. Попытка подключения без адреса и без расширения должна выбросить ошибку
  let connectErrorThrown = false;
  try {
    await tonConnectManager.connectWallet('openmask');
  } catch (err: any) {
    connectErrorThrown = true;
    assert.strictEqual(err.message, 'OPENMASK_NOT_INSTALLED');
  }
  assert.strictEqual(connectErrorThrown, true, 'R4.1: connectWallet без расширения и адреса должен выбрасывать ошибку вместо UQBGfZZ');

  // Б. Подключение с передачей явного адреса (Watch-Only / Ручной ввод / Пресет)
  const testAddress = 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N';
  const connected = await tonConnectManager.connectWallet('tonkeeper', testAddress);
  assert.ok(connected !== null);
  assert.strictEqual(connected.address, testAddress);
  assert.strictEqual(connected.appName, 'tonkeeper');
  assert.ok(!connected.address.includes('UQBGfZZ'), 'Адрес не должен содержать фиктивную строку UQBGfZZ');

  // Проверка успешной отправки транзакции
  const txResult = await tonConnectManager.sendTonTransaction({
    recipientAddress: 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N',
    amountTon: '1.0',
    memo: 'test_p2p_order',
  });
  assert.strictEqual(txResult.success, true);
  assert.ok(txResult.txHash.startsWith('ton_tx_'));

  await tonConnectManager.disconnectWallet();
  assert.strictEqual(tonConnectManager.getConnectedWallet(), null);
  console.log('-> tonConnectManager lifecycle & No-Fake-Address (R4.1): УСПЕШНО\n');

  // 8. openDeepLink & openCryptoDeepLink
  console.log('8. Проверка openDeepLink и обработки схем ton://, tc://...');
  assert.strictEqual(typeof openDeepLink, 'function');
  assert.strictEqual(typeof openCryptoDeepLink, 'function');

  assert.strictEqual(await openDeepLink(''), false);
  assert.strictEqual(await openDeepLink('   '), false);

  (globalThis as any).window = {
    location: { href: '' },
    open: (_url: string, _target?: string, _features?: string) => ({}),
  };

  const tonLinkRes = await openDeepLink('ton://transfer/EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N?amount=1000000000');
  assert.strictEqual(tonLinkRes, true);

  const tcLinkRes = await openCryptoDeepLink('tc://?v=2&id=tonconnect_session_123');
  assert.strictEqual(tcLinkRes, true);

  const httpLinkRes = await openDeepLink('https://app.tonkeeper.com/transfer/EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N');
  assert.strictEqual(httpLinkRes, true);

  const managerLinkRes = await tonConnectManager.openDeepLink('tonkeeper://transfer/123');
  assert.strictEqual(managerLinkRes, true);
  console.log('-> openDeepLink: УСПЕШНО\n');

  console.log('=== ВСЕ ТЕСТЫ TON CONNECT 2.0 (M1: R1, R2, R3, R4.1) ПРОЙДЕНЫ УСПЕШНО! ===');
}

// Запуск тестов при прямом выполнении
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('tonConnectManager.test')) {
  runTonManagerTests().catch((err) => {
    console.error('❌ ОШИБКА В ТЕСТАХ:', err);
    process.exit(1);
  });
}

